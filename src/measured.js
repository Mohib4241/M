// Reading the measurements in src/data/shapes (millimetres, from tools/measure/measure.py) in model
// units (1 unit = 100 mm). Front views: x to the robot's left (+x), y up from the floor.
import { Loft } from './loft.js';

const U = 0.01;

/** The measured view, or throws with a clear message. */
export function view(shape, name = 'front') {
  const v = shape.views[name];
  if (!v) throw new Error(`${shape.robot}: no measured ${name} view`);
  return v;
}

/** Half-width at each measured height, the two sides averaged (the robots are symmetric): [[y, hw], ...]. */
export function halfWidths(v, { from = -Infinity, to = Infinity, scale = 1 } = {}) {
  return v.rows.filter((r) => r[0] >= from && r[0] <= to).map(([y, a, b]) => [y * U, ((b - a) / 2) * U * scale]);
}

/** A loft whose widths are the measured ones, with the side and plan given as functions of y. */
export function loftFrom(v, { zF, zB, rF, rB, from, to, scale = 1, extra = [], smooth = 5 }) {
  let hw = halfWidths(v, { from, to, scale });
  // a moving average over `smooth` rows (10 mm apart) takes out pixel noise but keeps the shape
  if (smooth > 1) {
    const k = Math.floor(smooth / 2);
    hw = hw.map(([y], i) => { let s = 0, n = 0; for (let j = Math.max(0, i - k); j <= Math.min(hw.length - 1, i + k); j++) { s += hw[j][1]; n++; } return [y, s / n]; });
  }
  hw = hw.concat(extra).sort((a, b) => a[0] - b[0]);
  return new Loft({ y: hw.map((r) => r[0]), hw: hw.map((r) => r[1]), zF, zB, rF, rB });
}

/** A traced region's outline [[x, y], ...] in units. */
export function outline(v, name, { mirror = false } = {}) {
  const r = v.regions[name];
  if (!r) throw new Error(`no measured region ${name}`);
  const pts = r.outline.map(([x, y]) => [x * U, y * U]);
  if (!mirror) return pts;
  // the same shape on both sides of the centre line: average the outline with its mirror image
  const ys = pts.map((p) => p[1]);
  const lo = Math.min(...ys), hi = Math.max(...ys), out = [];
  const N = 48;
  const sp = (y) => { let a = Infinity, b = -Infinity; for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length]; if ((y0 <= y && y1 >= y) || (y1 <= y && y0 >= y)) { const x = y1 === y0 ? x0 : x0 + ((y - y0) / (y1 - y0)) * (x1 - x0); a = Math.min(a, x); b = Math.max(b, x); } } return a <= b ? (b - a) / 2 : null; };
  const right = [];
  for (let i = 0; i <= N; i++) { const y = lo + ((hi - lo) * i) / N; const h = sp(Math.min(hi - 1e-4, Math.max(lo + 1e-4, y))); if (h !== null) right.push([h, y]); }
  for (const p of right) out.push(p);
  for (let i = right.length - 1; i >= 0; i--) out.push([-right[i][0], right[i][1]]);
  return out;
}

/** A traced region's box { x0, y0, x1, y1, cx, cy, w, h } in units. */
export function box(v, name) {
  const r = v.regions[name] || v.marks[name];
  if (!r) throw new Error(`no measured region or mark ${name}`);
  const [x0, y0, x1, y1] = r.box.map((n) => n * U);
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
}

/** A mark's box, with its mirror twin's averaged in when given (left and right parts of a pair). */
export function pair(v, a, b) {
  const A = box(v, a), B = box(v, b);
  const cx = (Math.abs(A.cx) + Math.abs(B.cx)) / 2, cy = (A.cy + B.cy) / 2, w = (A.w + B.w) / 2, h = (A.h + B.h) / 2;
  return { cx, cy, w, h };
}

/** The measured half-width as a function of y (units), smoothed like the loft's. */
export function hwFn(v, { smooth = 5 } = {}) {
  let hw = halfWidths(v);
  const k = Math.floor(smooth / 2);
  hw = hw.map(([y], i) => { let s = 0, n = 0; for (let j = Math.max(0, i - k); j <= Math.min(hw.length - 1, i + k); j++) { s += hw[j][1]; n++; } return [y, s / n]; });
  return (y) => {
    if (y <= hw[0][0]) return hw[0][1];
    for (let i = 1; i < hw.length; i++) if (y <= hw[i][0]) { const [y0, a] = hw[i - 1], [y1, b] = hw[i]; return a + ((y - y0) / (y1 - y0)) * (b - a); }
    return hw[hw.length - 1][1];
  };
}
