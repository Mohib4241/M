// In-browser hand tracking: the webcam stays in this tab. MediaPipe runs as WebAssembly,
// the gesture engine turns landmarks into viewer commands, and nothing is uploaded.
// This is what makes hand control work on a deployed site, where there is no webcam for a
// Python script to read.
import { GestureEngine } from './gestures.js';

// Official Google-hosted model (CORS enabled). The WebAssembly runtime is served next to the page
// from /mediapipe/wasm (copied there by `npm run build`).
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export class TrackerError extends Error {
  constructor(kind, message) { super(message); this.kind = kind; }
}

export class BrowserTracker {
  constructor({ onMessage, onStatus }) {
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.engine = new GestureEngine();
    this.running = false;
    this.stream = null;
    this.video = null;
    this.landmarker = null;
    this.handle = 0;
  }

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new TrackerError('insecure', 'This page cannot reach the camera.');
    }
    this.onStatus('Opening the camera…');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
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

    this.onStatus('Loading the hand model…');
    try {
      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks(new URL('mediapipe/wasm', document.baseURI).href);
      const make = (delegate) => HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      // CPU (WebAssembly) on purpose: the hand model is small, it runs the same everywhere, and it does
      // not compete with the 3D view for the GPU.
      this.landmarker = await make('CPU');
    } catch (e) {
      this.stop();
      throw new TrackerError('load', (e && e.message) || 'The hand model could not load.');
    }

    this.running = true;
    this._lastTime = -1;
    this._lastTs = 0;
    this._fpsT = performance.now();
    this._fpsN = 0;
    this.fps = 0;
    this._tick();
  }

  _tick() {
    if (!this.running) return;
    const v = this.video;
    if (v.readyState >= 2 && v.currentTime !== this._lastTime) {
      this._lastTime = v.currentTime;
      const now = performance.now();
      this._lastTs = Math.max(now, this._lastTs + 1); // the model needs strictly increasing timestamps
      let hands = [];
      try {
        const res = this.landmarker.detectForVideo(v, this._lastTs);
        // mirror horizontally so moving your hand right moves the cursor right
        hands = (res.landmarks || []).map((h) => h.map((p) => [1 - p.x, p.y]));
      } catch { /* skip a bad frame */ }
      const { events, frame } = this.engine.update(hands, now / 1000);
      this._fpsN++;
      if (now - this._fpsT >= 1000) { this.fps = Math.round((this._fpsN * 1000) / (now - this._fpsT)); this._fpsN = 0; this._fpsT = now; }
      frame.fps = this.fps;
      for (const e of events) this.onMessage(e);
      this.onMessage(frame);
    }
    this.handle = v.requestVideoFrameCallback ? v.requestVideoFrameCallback(() => this._tick()) : requestAnimationFrame(() => this._tick());
  }

  stop() {
    this.running = false;
    const v = this.video;
    if (v && v.cancelVideoFrameCallback && this.handle) v.cancelVideoFrameCallback(this.handle);
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop()); // camera light off
    this.stream = null;
    if (v) v.srcObject = null;
    this.video = null;
    if (this.landmarker) { try { this.landmarker.close(); } catch { /* already closed */ } }
    this.landmarker = null;
  }
}
