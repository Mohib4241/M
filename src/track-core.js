// The tracking models, with no page code around them, so the same class runs in a worker (the normal
// case: the 3D view never waits for a model) or on the page (the fallback where workers cannot do it).
// Hands mode finds two hands; body mode finds one body (33 points) and both hands (21 points each, for the
// palms and fingers) for the humanoid mirror.
import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';

const HAND_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const BODY_BUDGET_MS = 48; // body and hands together slower than this: the hands are read every other picture
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
    this._handTurn = 0; this._bodyMs = 0; this._handBusy = null;
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

  /** A second hand reader for close-ups: one hand in a still picture cut out round a wrist. */
  _makeHandStill(delegate) {
    return HandLandmarker.createFromOptions(this.fileset, {
      baseOptions: { modelAssetPath: HAND_MODEL, delegate },
      runningMode: 'IMAGE', numHands: 1, minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5,
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
    if (mode === 'body') this._needHand(); // the fingers load behind the body, which starts at once
    if (mode === 'hands' && !this.hand) this.hand = await this._makeHand(this.delegate);
    this._ms = 0; this._n = 0;
  }

  /** Load the hand model in the background, once. */
  _needHand() {
    if (this.hand || this._handBusy) return;
    this._handBusy = this._makeHand(this.delegate).then((h) => { if (this.hand) h.close(); else this.hand = h; }).catch(() => {}).finally(() => { this._handBusy = null; this._needStill(); });
  }

  _needStill() {
    if (this.handStill || this._stillBusy || typeof OffscreenCanvas === 'undefined') return;
    this._stillBusy = this._makeHandStill(this.delegate).then((h) => { this.handStill = h; }).catch(() => {}).finally(() => { this._stillBusy = null; });
  }

  /**
   * A hand too small for the hand reader in the whole picture (you are standing back so your legs are in
   * view): cut out the square round that wrist, enlarge it, and read the hand there. `lm` are the body's
   * picture points; `side` is 15 or 16, the wrist. Returns { lm, world } in whole-picture terms, or null.
   */
  _closeUp(source, lm, side) {
    const W = source.videoWidth || source.width, H = source.videoHeight || source.height;
    if (!W || !H || !this.handStill) return null;
    const wr = lm[side], el = lm[side - 2];
    const fx = (wr[0] - el[0]) * W, fy = (wr[1] - el[1]) * H, fore = Math.hypot(fx, fy);
    if (fore < 6) return null;
    const size = Math.max(64, Math.min(Math.min(W, H), fore * 2.8));
    const cx = wr[0] * W + fx * 0.35, cy = wr[1] * H + fy * 0.35; // a little past the wrist, where the hand is
    const x0 = Math.max(0, Math.min(W - size, cx - size / 2)), y0 = Math.max(0, Math.min(H - size, cy - size / 2));
    if (!this._crop) { this._crop = new OffscreenCanvas(256, 256); this._cropG = this._crop.getContext('2d', { willReadFrequently: true }); }
    this._cropG.drawImage(source, x0, y0, size, size, 0, 0, 256, 256);
    const hr = this.handStill.detect(this._crop);
    const h = hr.landmarks && hr.landmarks[0], w = hr.worldLandmarks && hr.worldLandmarks[0];
    if (!h || !w || w.length !== 21) return null;
    return { lm: h.map((p) => [(x0 + p.x * size) / W, (y0 + p.y * size) / H, p.z]), world: w.map((p) => [p.x, p.y, p.z]), closeUp: true };
  }

  async _switch(delegate) {
    const make = this.mode === 'body' ? (d) => this._makePose(d) : (d) => this._makeHand(d);
    const next = await make(delegate); // throws if this delegate cannot run here: the old one stays
    const key = this.mode === 'body' ? 'pose' : 'hand';
    try { this[key].close(); } catch { /* already closed */ }
    this[key] = next;
    const other = key === 'pose' ? 'hand' : 'pose';
    if (this[other]) { try { this[other].close(); } catch { /* closed */ } this[other] = null; } // rebuilt on demand
    if (this.handStill) { try { this.handStill.close(); } catch { /* closed */ } this.handStill = null; }
    this.delegate = delegate;
    this._ms = 0; this._n = 0;
    if (this.mode === 'body') this._needHand();
  }

  /**
   * Run the current model on a picture (a video element or an ImageBitmap).
   * Returns { hands: [[x,y,z]×21, …] } or { pose: { lm: [[x,y,z,visibility]×33], world: [[x,y,z]×33] } | null,
   * hands3: [{ lm, world }, …] | undefined }, plus ms. `hands3` is left out on a picture where the hands were not read.
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
      // the hands, on every picture when there is time and on every other one when there is not
      this._handTurn++;
      if (this.hand && out.pose && (this._bodyMs < BODY_BUDGET_MS || this._handTurn % 2 === 0)) {
        this._lastTs += 1;
        const hr = this.hand.detectForVideo(source, this._lastTs);
        out.hands3 = (hr.landmarks || []).map((h, i) => ({ lm: h.map((p) => [p.x, p.y, p.z]), world: ((hr.worldLandmarks || [])[i] || []).map((p) => [p.x, p.y, p.z]) })).filter((h) => h.world.length === 21);
        // a wrist the body reader sees with no hand found at it: look closer, one wrist per picture
        if (this.handStill) {
          const p = out.pose.lm, reach = Math.max(0.06, Math.hypot(p[11][0] - p[12][0], p[11][1] - p[12][1]));
          const bare = [15, 16].filter((i) => p[i][3] >= 0.5 && p[i - 2][3] >= 0.5 && !out.hands3.some((h) => Math.hypot(h.lm[0][0] - p[i][0], h.lm[0][1] - p[i][1]) < reach * 0.6));
          if (bare.length) {
            const side = bare[this._handTurn % bare.length];
            let near = null;
            try { near = this._closeUp(source, p, side); } catch { /* no close-up on this picture */ }
            if (near) out.hands3.push(near);
          }
        }
        const took = performance.now() - t0;
        this._bodyMs = this._bodyMs ? this._bodyMs * 0.8 + took * 0.2 : took;
      } else if (!out.pose) out.hands3 = [];
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
    for (const k of ['hand', 'pose', 'handStill']) { if (this[k]) { try { this[k].close(); } catch { /* closed */ } this[k] = null; } }
  }
}
