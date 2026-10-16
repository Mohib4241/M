// Same scenarios as `python3 jarvis.py --selftest`, run against the JavaScript engine.
// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { GestureEngine } from '../src/gestures.js';

// Synthetic hand: wrist at the origin, fingers pointing up the image, one unit = wrist to middle knuckle.
const OPEN = {
  thumb: [[-0.35, -0.25], [-0.6, -0.5], [-0.8, -0.75], [-0.95, -0.95]],
  index: [[-0.35, -1.0], [-0.4, -1.45], [-0.42, -1.7], [-0.43, -1.95]],
  middle: [[0.0, -1.05], [0.0, -1.6], [0.0, -1.9], [0.0, -2.15]],
  ring: [[0.33, -1.0], [0.37, -1.5], [0.39, -1.75], [0.4, -1.98]],
  pinky: [[0.62, -0.9], [0.7, -1.3], [0.74, -1.5], [0.77, -1.7]],
};
const CURL = {
  index: [[-0.35, -1.0], [-0.38, -1.3], [-0.34, -1.1], [-0.3, -0.8]],
  middle: [[0.0, -1.05], [0.0, -1.35], [0.0, -1.15], [0.0, -0.8]],
  ring: [[0.33, -1.0], [0.35, -1.3], [0.34, -1.1], [0.32, -0.8]],
  pinky: [[0.62, -0.9], [0.64, -1.15], [0.62, -1.0], [0.58, -0.75]],
};
const THUMB_IN = [[-0.35, -0.25], [-0.4, -0.5], [-0.3, -0.7], [-0.2, -0.85]];

function hand(shape, cx, cy, scale = 0.11) {
  const f = {};
  for (const n of ['index', 'middle', 'ring', 'pinky']) {
    const ext = shape === 'open' || (shape === 'point' && n === 'index') || (shape === 'pinch' && n !== 'index');
    f[n] = ext ? OPEN[n] : CURL[n];
  }
  let thumb = shape === 'fist' || shape === 'point' ? THUMB_IN : OPEN.thumb;
  if (shape === 'pinch') {
    const tip = [-0.62, -1.4];
    f.index = [[-0.35, -1.0], [-0.45, -1.3], [-0.52, -1.38], tip];
    thumb = [[-0.35, -0.25], [-0.5, -0.7], [-0.58, -1.1], tip];
  }
  return [[0, 0], ...thumb, ...f.index, ...f.middle, ...f.ring, ...f.pinky].map(([x, y]) => [cx + x * scale, cy + y * scale]);
}

function run(frames, engine = new GestureEngine(), t0 = 0, fps = 30) {
  const events = [];
  let t = t0;
  for (const hands of frames) {
    events.push(...engine.update(hands, t).events);
    t += 1 / fps;
  }
  return { engine, events, t };
}
const sum = (evs, type, key) => evs.filter((e) => e.type === type).reduce((s, e) => s + e[key], 0);
const rep = (n, f) => Array.from({ length: n }, f);

test('two hands pulling apart opens the suit, pushing together closes it', () => {
  const apart = rep(25, (_, i) => { const s = 0.08 + i * 0.01; return [hand('open', 0.5 - s, 0.5), hand('open', 0.5 + s, 0.5)]; });
  assert.ok(sum(run(apart).events, 'explode', 'delta') > 0.6);
  assert.ok(sum(run([...apart].reverse()).events, 'explode', 'delta') < -0.6);
});

test('a quick pinch clicks once, near the pinch point', () => {
  const fr = [...rep(6, () => [hand('point', 0.4, 0.5)]), ...rep(8, () => [hand('pinch', 0.4, 0.5)]), ...rep(4, () => [hand('open', 0.4, 0.5)])];
  const clicks = run(fr).events.filter((e) => e.type === 'click');
  assert.equal(clicks.length, 1);
  assert.ok(Math.abs(clicks[0].x - 0.4) < 0.12 && Math.abs(clicks[0].y - 0.4) < 0.2);
});

test('pinch and drag orbits without clicking', () => {
  const fr = [...rep(5, () => [hand('open', 0.3, 0.5)]), ...rep(30, (_, i) => [hand('pinch', 0.3 + i * 0.01, 0.5)])];
  const { events } = run(fr);
  assert.ok(sum(events, 'orbit', 'dx') > 0.15);
  assert.equal(events.filter((e) => e.type === 'click').length, 0);
});

test('an open-palm flick swaps robots; a still palm does not', () => {
  const flick = rep(14, (_, i) => [hand('open', 0.2 + i * 0.04, 0.5)]);
  assert.equal(run(flick).events.filter((e) => e.type === 'swap').length, 1);
  const still = rep(40, (_, i) => [hand('open', 0.5 + (i % 2) * 0.01, 0.5)]);
  assert.equal(run(still).events.length, 0);
});

test('fist then open opens the suit; open then fist closes it', () => {
  const open = run([...rep(12, () => [hand('fist', 0.5, 0.5)]), ...rep(8, () => [hand('open', 0.5, 0.5)])]).events;
  assert.ok(open.some((e) => e.type === 'explode_to' && e.value === 1));
  const close = run([...rep(12, () => [hand('open', 0.5, 0.5)]), ...rep(8, () => [hand('fist', 0.5, 0.5)])]).events;
  assert.ok(close.some((e) => e.type === 'explode_to' && e.value === 0));
});

test('a clenched fist is not mistaken for a pinch', () => {
  const { events, engine } = run(rep(20, () => [hand('fist', 0.5, 0.5)]));
  assert.equal(engine.pinching, false);
  assert.equal(events.filter((e) => e.type === 'click').length, 0);
});

test('pointing only moves the cursor', () => {
  assert.equal(run(rep(20, (_, i) => [hand('point', 0.3 + i * 0.01, 0.5)])).events.length, 0);
});

test('losing the hand ends the pinch and clears the cursor', () => {
  const { engine, t } = run(rep(5, () => [hand('pinch', 0.5, 0.5)]));
  run(rep(15, () => []), engine, t);
  assert.equal(engine.pinching, false);
  assert.equal(engine.cursor, null);
});
