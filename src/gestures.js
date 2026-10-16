// Gesture engine for in-browser hand tracking. A line-for-line port of GestureEngine in
// jarvis.py, with the same thresholds, so the local Python mode and the Render/browser
// mode behave the same. Input per frame: hands as lists of 21 [x, y] points in 0..1.

const FINGERS = [[5, 6, 8], [9, 10, 12], [13, 14, 16], [17, 18, 20]]; // MCP, PIP, tip
const PALM_POINTS = [0, 5, 9, 13, 17];

const PINCH_ON = 0.32; // thumb-index gap / hand size to start a pinch
const PINCH_OFF = 0.5; // ... and to release it
const PINCH_REACH = 1.1; // index tip must be this far from the wrist, else it is a fist
const CLICK_MAX_S = 0.7; // a pinch shorter than this, without moving, is a click
const DRAG_MIN = 0.025; // how far a pinch must travel to become a drag
const SPREAD_GAIN = 2.4; // two-hand distance change -> explode change
const FLICK_DIST = 0.28; // palm travel (fraction of frame width) inside FLICK_WINDOW_S
const FLICK_WINDOW_S = 0.35;
const COOLDOWN_S = 1.5;

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const r3 = (v) => Math.round(v * 1e3) / 1e3;

class Hand {
  constructor(lm) {
    this.lm = lm;
    this.size = Math.max(dist(lm[0], lm[9]), 1e-4); // wrist to middle knuckle
    this.palm = [
      PALM_POINTS.reduce((s, i) => s + lm[i][0], 0) / PALM_POINTS.length,
      PALM_POINTS.reduce((s, i) => s + lm[i][1], 0) / PALM_POINTS.length,
    ];
    this.point = mid(lm[4], lm[8]); // pinch point, used as the cursor
    this.pinchRatio = dist(lm[4], lm[8]) / this.size;
    this.reach = dist(lm[8], lm[0]) / this.size; // a clenched fist keeps the index tip near the palm
    this.ext = FINGERS.map(([, p, t]) => dist(lm[t], lm[0]) > dist(lm[p], lm[0]) * 1.12);
    this.nExt = this.ext.filter(Boolean).length;
  }
}

export class GestureEngine {
  constructor() {
    this.pinching = false;
    this.pinchT0 = 0;
    this.pinchOrigin = null;
    this.pinchPrev = null;
    this.dragging = false;
    this.cursor = null;
    this.twoFrames = 0;
    this.lastSpread = null;
    this.palmHist = [];
    this.shape = null;
    this.shapeSince = 0;
    this.cand = null;
    this.candN = 0;
    this.cool = {};
    this.lostSince = null;
  }

  _cool(name, t) { return t < (this.cool[name] || 0); }
  _arm(name, t, secs = COOLDOWN_S) { this.cool[name] = t + secs; }

  static _label(hand, pinching) {
    if (pinching) return 'pinch';
    if (hand.nExt === 0) return 'fist';
    if (hand.nExt >= 3) return 'open';
    if (hand.ext[0] && hand.nExt === 1) return 'point';
    return 'other';
  }

  _smooth(p) {
    if (!this.cursor) this.cursor = p;
    else {
      const d = dist(this.cursor, p);
      const a = 0.35 + Math.min(0.55, d * 6); // follow quickly when moving far, steady when still
      this.cursor = [this.cursor[0] + (p[0] - this.cursor[0]) * a, this.cursor[1] + (p[1] - this.cursor[1]) * a];
    }
    return this.cursor;
  }

  /** Returns { events, frame }. t is in seconds. */
  update(handsLm, t) {
    const events = [];
    const hands = handsLm.slice(0, 2).map((lm) => new Hand(lm));

    if (!hands.length) {
      if (this.lostSince === null) this.lostSince = t;
      if (t - this.lostSince > 0.25) this._resetHand();
      return { events, frame: this._frame(hands, [], 'none', null) };
    }
    this.lostSince = null;

    if (hands.length === 2) this.twoFrames++;
    else { this.twoFrames = 0; this.lastSpread = null; }

    if (this.twoFrames >= 3) {
      // Two hands: pull apart to open, push together to close.
      this._resetPinch();
      const spread = dist(hands[0].palm, hands[1].palm);
      if (this.lastSpread !== null) {
        const d = spread - this.lastSpread;
        if (Math.abs(d) > 0.002) events.push({ type: 'explode', delta: r4(d * SPREAD_GAIN) });
      }
      this.lastSpread = spread;
      this.palmHist = [];
      return { events, frame: this._frame(hands, hands.map((h) => GestureEngine._label(h, false)), 'two', null) };
    }

    // One hand (the larger one if two are briefly visible).
    const h = hands.reduce((a, b) => (b.size > a.size ? b : a));
    const cur = this._smooth(h.point);

    // pinch with hysteresis
    if (!this.pinching && h.pinchRatio < PINCH_ON && h.reach > PINCH_REACH) {
      this.pinching = true;
      this.pinchT0 = t;
      this.pinchOrigin = cur;
      this.dragging = false;
    } else if (this.pinching && (h.pinchRatio > PINCH_OFF || h.reach < PINCH_REACH - 0.15)) {
      if (!this.dragging && t - this.pinchT0 < CLICK_MAX_S) {
        events.push({ type: 'click', x: r4(this.pinchOrigin[0]), y: r4(this.pinchOrigin[1]) });
      }
      this._resetPinch();
    }

    if (this.pinching) {
      if (!this.dragging && dist(cur, this.pinchOrigin) > DRAG_MIN) {
        this.dragging = true;
        this.pinchPrev = this.pinchOrigin;
      }
      if (this.dragging) {
        const dx = cur[0] - this.pinchPrev[0], dy = cur[1] - this.pinchPrev[1];
        this.pinchPrev = cur;
        if (dx || dy) events.push({ type: 'orbit', dx: r4(dx), dy: r4(dy) });
      }
    }

    const label = GestureEngine._label(h, this.pinching);
    events.push(...this._shapeEvents(label, t));

    // quick sideways flick of an open palm swaps the robot
    if (label === 'open' && !this.pinching) {
      this.palmHist.push([t, h.palm[0]]);
      while (this.palmHist.length && t - this.palmHist[0][0] > FLICK_WINDOW_S) this.palmHist.shift();
      const xs = this.palmHist.map((p) => p[1]);
      if (xs.length >= 4 && Math.max(...xs) - Math.min(...xs) >= FLICK_DIST && !this._cool('swap', t)) {
        events.push({ type: 'swap' });
        this._arm('swap', t);
        this.palmHist = [];
      }
    } else this.palmHist = [];

    const cursor = { x: r4(cur[0]), y: r4(cur[1]), pinching: this.pinching };
    return { events, frame: this._frame(hands, [label], 'one', cursor) };
  }

  _shapeEvents(label, t) {
    const out = [];
    const cand = label === 'fist' || label === 'open' ? label : null;
    if (cand === this.cand) this.candN++;
    else { this.cand = cand; this.candN = 1; }
    if (this.candN === 3 && cand !== this.shape) {
      const prev = this.shape, since = this.shapeSince;
      if (cand !== null) {
        if (prev === 'fist' && cand === 'open' && t - since >= 0.25 && !this._cool('open', t)) {
          out.push({ type: 'explode_to', value: 1 });
          this._arm('open', t, 1);
        } else if (prev === 'open' && cand === 'fist' && t - since >= 0.25 && !this._cool('close', t)) {
          out.push({ type: 'explode_to', value: 0 });
          this._arm('close', t, 1);
        }
        this.shape = cand;
        this.shapeSince = t;
      }
    }
    return out;
  }

  _resetPinch() { this.pinching = false; this.dragging = false; this.pinchOrigin = null; }

  _resetHand() {
    this._resetPinch();
    this.cursor = null;
    this.palmHist = [];
    this.shape = null;
    this.cand = null;
    this.candN = 0;
    this.twoFrames = 0;
    this.lastSpread = null;
  }

  _frame(hands, labels, mode, cursor) {
    return {
      type: 'frame',
      mode,
      hands: hands.map((h, i) => ({ lm: h.lm.map(([x, y]) => [r3(x), r3(y)]), shape: labels[i] || 'other' })),
      cursor,
    };
  }
}
