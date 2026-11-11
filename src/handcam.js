// In-browser tracking: the webcam stays in this tab and nothing is uploaded. The models run in a worker,
// so the 3D view keeps its frame rate while a picture is being read; where a worker cannot do it, they
// run on the page at a reduced rate. Two modes: 'hands' (gestures for the viewer) and 'body' (33 body
// points for the humanoid mirror).
import { GestureEngine } from './gestures.js';
import workerCode from 'virtual:tracker-worker';

export class TrackerError extends Error {
  constructor(kind, message) { super(message); this.kind = kind; }
}

const MIN_GAP_MS = 30; // at most about 33 pictures a second go to the model

export class BrowserTracker {
  constructor({ onMessage, onStatus, mode = 'hands' }) {
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.engine = new GestureEngine();
    this.mode = mode;
    this.running = false;
    this.stream = null;
    this.video = null;
    this.worker = null;
    this.core = null; // the on-page fallback
    this.handle = 0;
    this.where = ''; // 'worker' or 'page'
    this.ms = 0; // how long the model took on the last picture
    this.delegate = 'CPU';
  }

  // The hidden <video> element, so the page can show it as a camera backdrop.
  get videoElement() { return this.video; }

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new TrackerError('insecure', 'This page cannot reach the camera.');
    }
    this.onStatus('Opening the camera…');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 }, facingMode: 'user' },
        audio: false,
      });
    } catch (e) {
      if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) throw new TrackerError('denied', 'Camera access was refused.');
      if (e && (e.name === 'NotFoundError' || e.name === 'OverconstrainedError')) throw new TrackerError('nocamera', 'No camera was found.');
      throw new TrackerError('error', (e && e.message) || 'The camera could not start.');
    }

    const video = (this.video = document.createElement('video'));
    video.muted = true;
    video.playsInline = true;
    video.srcObject = this.stream;
    await new Promise((resolve, reject) => {
      video.onloadeddata = resolve;
      video.onerror = () => reject(new TrackerError('error', 'The camera stream failed.'));
    });
    await video.play();

    this.onStatus(this.mode === 'body' ? 'Loading the body model…' : 'Loading the hand model…');
    const wasm = new URL('mediapipe/wasm', document.baseURI).href;
    try {
      try { await this._startWorker(wasm); this.where = 'worker'; }
      catch { this._killWorker(); await this._startPage(wasm); this.where = 'page'; }
    } catch (e) {
      this.stop();
      throw new TrackerError('load', (e && e.message) || 'The tracking model could not load.');
    }

    this.running = true;
    this._waiting = false;
    this._sentAt = 0;
    this._lastTime = -1;
    this._lastRun = 0;
    this._fpsT = performance.now();
    this._fpsN = 0;
    this.fps = 0;
    this._tick();
  }

  _startWorker(wasm) {
    return new Promise((resolve, reject) => {
      if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap !== 'function') { reject(new Error('no worker support')); return; }
      let settled = false;
      const url = URL.createObjectURL(new Blob([workerCode], { type: 'text/javascript' }));
      const w = (this.worker = new Worker(url));
      const timer = setTimeout(() => { if (!settled) { settled = true; reject(new Error('The tracking worker did not start.')); } }, 25000);
      w.onmessage = (ev) => {
        const m = ev.data;
        if (m.type === 'ready') { clearTimeout(timer); URL.revokeObjectURL(url); if (!settled) { settled = true; resolve(); } }
        else if (m.type === 'error') { if (!settled) { settled = true; clearTimeout(timer); reject(new Error(m.error)); } else this._modeBusy = false; }
        else if (m.type === 'mode') { this._modeBusy = false; }
        else if (m.type === 'result') { this._waiting = false; this._result(m); }
      };
      w.onerror = (e) => { if (!settled) { settled = true; clearTimeout(timer); reject(new Error(e.message || 'The tracking worker failed.')); } };
      w.postMessage({ type: 'init', wasm, mode: this.mode });
    });
  }

  async _startPage(wasm) {
    const { TrackCore } = await import('./track-core.js');
    this.core = new TrackCore();
    await this.core.init(wasm, this.mode);
  }

  /** Switch between 'hands' and 'body' while running. */
  async setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.engine = new GestureEngine();
    if (!this.running) return;
    this.onStatus(mode === 'body' ? 'Loading the body model…' : 'Loading the hand model…');
    if (this.worker) { this._modeBusy = true; this.worker.postMessage({ type: 'mode', mode }); }
    else if (this.core) { this._modeBusy = true; try { await this.core.setMode(mode); } finally { this._modeBusy = false; } }
  }

  _tick() {
    if (!this.running) return;
    const v = this.video;
    const now = performance.now();
    if (this._waiting && now - this._sentAt > 4000) this._waiting = false; // a lost answer must not stop the camera
    const due = now - this._lastRun >= (this.core ? Math.max(MIN_GAP_MS, this.ms * 2.5) : MIN_GAP_MS); // on the page, leave the view most of the time
    if (v.readyState >= 2 && v.currentTime !== this._lastTime && !this._waiting && !this._modeBusy && due) {
      this._lastTime = v.currentTime;
      this._lastRun = now;
      if (this.worker) {
        this._waiting = true;
        this._sentAt = now;
        createImageBitmap(v).then((bitmap) => {
          this.grabMs = performance.now() - now;
          if (!this.worker) { bitmap.close(); return; }
          this.worker.postMessage({ type: 'frame', bitmap, ts: now }, [bitmap]);
        }).catch(() => { this._waiting = false; });
      } else if (this.core) {
        let out = { mode: this.mode, hands: [], pose: null, ms: 0 };
        try { out = this.core.detect(v, now); } catch { /* skip a bad picture */ }
        this._result(out);
        this.core.tune().catch(() => {});
      }
    }
    this.handle = v.requestVideoFrameCallback ? v.requestVideoFrameCallback(() => this._tick()) : requestAnimationFrame(() => this._tick());
  }

  _result(m) {
    if (!this.running) return;
    const now = performance.now();
    this.ms = m.ms || 0;
    this.roundMs = now - this._sentAt;
    if (typeof window !== 'undefined') window.__trackDbg = { where: this.where, mode: m.mode, delegate: m.delegate, ms: +this.ms.toFixed(1), grabMs: +(this.grabMs || 0).toFixed(1), roundMs: +this.roundMs.toFixed(1), fps: this.fps, error: m.error };
    if (m.delegate) this.delegate = m.delegate;
    this._fpsN++;
    if (now - this._fpsT >= 1000) { this.fps = Math.round((this._fpsN * 1000) / (now - this._fpsT)); this._fpsN = 0; this._fpsT = now; }
    if (m.mode !== this.mode) return; // an answer from before a mode switch
    if (m.mode === 'body') {
      // mirror the picture points so the display reads like a mirror; world points are mirrored by the mirror maths
      const p = m.pose;
      this.onMessage({ type: 'pose', lm: p ? p.lm.map((q) => [1 - q[0], q[1], q[2], q[3]]) : null, world: p ? p.world : null, vis: p ? p.lm.map((q) => q[3]) : null, fps: this.fps, ms: this.ms });
      return;
    }
    // mirror horizontally so moving your hand right moves the cursor right
    const hands = (m.hands || []).map((h) => h.map((q) => [1 - q[0], q[1], q[2]]));
    const { events, frame } = this.engine.update(hands, now / 1000);
    frame.fps = this.fps;
    frame.ms = this.ms;
    for (const e of events) this.onMessage(e);
    this.onMessage(frame);
  }

  _killWorker() {
    if (this.worker) { try { this.worker.terminate(); } catch { /* gone */ } }
    this.worker = null;
  }

  stop() {
    this.running = false;
    const v = this.video;
    if (v && v.cancelVideoFrameCallback && this.handle) v.cancelVideoFrameCallback(this.handle);
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop()); // camera light off
    this.stream = null;
    if (v) v.srcObject = null;
    this.video = null;
    if (this.worker) { try { this.worker.postMessage({ type: 'close' }); } catch { /* gone */ } const w = this.worker; setTimeout(() => { try { w.terminate(); } catch { /* gone */ } }, 300); }
    this.worker = null;
    if (this.core) this.core.close();
    this.core = null;
  }
}
