// The tracking models, with no page code around them, so the same class runs in a worker (the normal
// case: the 3D view never waits for a model) or on the page (the fallback where workers cannot do it).
// Hands mode finds two hands; body mode finds one body (33 points) for the humanoid mirror.
import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';

const HAND_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const SLOW_MS = 55; // slower than this on the CPU: try the graphics chip once

export class TrackCore {
  constructor() {
    this.fileset = null;
    this.hand = null;
    this.pose = null;
    this.mode = 'hands';
    this.delegate = 'CPU';
    this._ms = 0; this._n = 0; this._triedGpu = false; this._cpuMs = 0;
    this._lastTs = 0;
  }

  async init(wasmUrl, mode = 'hands') {
    this.fileset = await FilesetResolver.forVisionTasks(wasmUrl);
    await this.setMode(mode);
  }

  _makeHand(delegate) {
    return HandLandmarker.createFromOptions(this.fileset, {
      baseOptions: { modelAssetPath: HAND_MODEL, delegate },
      runningMode: 'VIDEO', numHands: 2,
      minHandDetectionConfidence: 0.55, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5,
    });
  }

  _makePose(delegate) {
    return PoseLandmarker.createFromOptions(this.fileset, {
      baseOptions: { modelAssetPath: POSE_MODEL, delegate },
      runningMode: 'VIDEO', numPoses: 1,
      minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
    });
  }

  /** 'hands' or 'body'. The model for a mode is loaded the first time the mode is used. */
  async setMode(mode) {
    this.mode = mode;
    if (mode === 'body' && !this.pose) this.pose = await this._makePose(this.delegate);
    if (mode === 'hands' && !this.hand) this.hand = await this._makeHand(this.delegate);
    this._ms = 0; this._n = 0;
  }

  async _switch(delegate) {
    const make = this.mode === 'body' ? (d) => this._makePose(d) : (d) => this._makeHand(d);
    const next = await make(delegate); // throws if this delegate cannot run here: the old one stays
    const key = this.mode === 'body' ? 'pose' : 'hand';
    try { this[key].close(); } catch { /* already closed */ }
    this[key] = next;
    const other = key === 'pose' ? 'hand' : 'pose';
    if (this[other]) { try { this[other].close(); } catch { /* closed */ } this[other] = null; } // rebuilt on demand
    this.delegate = delegate;
    this._ms = 0; this._n = 0;
  }

  /**
   * Run the current model on a picture (a video element or an ImageBitmap).
   * Returns { hands: [[x,y,z]×21, …] } or { pose: { lm: [[x,y,z,visibility]×33], world: [[x,y,z]×33] } | null }, plus ms.
   * Points are in the picture as the camera saw it (not mirrored).
   */
  detect(source, ts) {
    this._lastTs = Math.max(ts, this._lastTs + 1); // the models need strictly increasing timestamps
    const t0 = performance.now();
    const out = { mode: this.mode, delegate: this.delegate };
    if (this.mode === 'body') {
      const res = this.pose.detectForVideo(source, this._lastTs);
      const lm = res.landmarks && res.landmarks[0];
      const w = res.worldLandmarks && res.worldLandmarks[0];
      out.pose = lm && w ? { lm: lm.map((p) => [p.x, p.y, p.z, p.visibility ?? 1]), world: w.map((p) => [p.x, p.y, p.z]) } : null;
    } else {
      const res = this.hand.detectForVideo(source, this._lastTs);
      out.hands = (res.landmarks || []).map((h) => h.map((p) => [p.x, p.y, p.z]));
    }
    out.ms = performance.now() - t0;
    this._ms += out.ms; this._n++;
    return out;
  }

  /** After a detect: if the CPU is slow, try the graphics chip once and keep whichever is faster. */
  async tune() {
    if (this.delegate === 'GPU' && this._cpuMs) {
      // on trial: the first picture warms up; judge on the next few, and give up at once if it is far slower
      if (this._n < 2) return;
      if (this._n === 2) { this._ms = 0; this._warm = true; return; }
      const avg = this._ms / (this._n - 2);
      if (avg > this._cpuMs * 3 || (this._n >= 8 && avg > this._cpuMs * 0.85)) {
        this._cpuMs = 0;
        try { await this._switch('CPU'); } catch { /* keep what works */ }
      } else if (this._n >= 8) { this._cpuMs = 0; this._ms = 0; this._n = 0; } // the graphics chip is faster: keep it
      return;
    }
    if (this._n < 45) return;
    const avg = this._ms / this._n;
    if (!this._triedGpu && this.delegate === 'CPU' && avg > SLOW_MS) {
      this._triedGpu = true; this._cpuMs = avg;
      try { await this._switch('GPU'); } catch { this._cpuMs = 0; /* no GPU delegate here: stay on the CPU */ }
    } else { this._ms = 0; this._n = 0; }
  }

  close() {
    for (const k of ['hand', 'pose']) { if (this[k]) { try { this[k].close(); } catch { /* closed */ } this[k] = null; } }
  }
}
