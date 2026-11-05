// A measured body. The shell of each robot is a loft: a stack of horizontal rounded rectangles, one per
// height, taken from the makers' pictures. At height y a section has a half-width `hw` (from the front
// view), a front line `zF` and a back line `zB` (from the side view) and corner radii `rF` at the front
// and `rB` at the back (from the top view). Panels are pieces of that surface, cut by height and by
// position round the section, with a thickness, so the shell still comes apart part by part while the
// parts together give the measured outline.
//
// Round a section, `t` runs from 0 at the front centre, along the right half (+x) to 0.5 at the back
// centre, then along the left half back to 1. A negative t is the left half too (t - 1).
// Units as everywhere: 1 unit = 100 mm, Y up, +Z front.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const HP = Math.PI / 2;
// where each piece of the right half starts: front edge, front corner, side, back corner, back edge
const T = [0, 0.06, 0.15, 0.35, 0.44, 0.5];

/** A function of y through the points [[y, v], ...], straight between them and flat past the ends. */
export function line(points) {
  const P = points.slice().sort((a, b) => a[0] - b[0]);
  return (y) => {
    if (y <= P[0][0]) return P[0][1];
    for (let i = 1; i < P.length; i++) {
      if (y <= P[i][0]) {
        const [y0, v0] = P[i - 1], [y1, v1] = P[i];
        return y1 === y0 ? v1 : v0 + ((y - y0) / (y1 - y0)) * (v1 - v0);
      }
    }
    return P[P.length - 1][1];
  };
}

/** Where a polygon [[a, y], ...] crosses the line at height y: [min a, max a], or null. */
export function span(poly, y) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [a0, y0] = poly[i], [a1, y1] = poly[(i + 1) % poly.length];
    if ((y0 <= y && y1 >= y) || (y1 <= y && y0 >= y)) {
      const a = y1 === y0 ? Math.min(a0, a1) : a0 + ((y - y0) / (y1 - y0)) * (a1 - a0);
      const b = y1 === y0 ? Math.max(a0, a1) : a;
      lo = Math.min(lo, a); hi = Math.max(hi, b);
    }
  }
  return lo <= hi ? [lo, hi] : null;
}

export class Loft {
  /**
   * @param {object} m  heights `y` (array) with `hw` at each, and `zF`, `zB`, `rF`, `rB` as arrays of
   *                    the same length or as functions of y.
   */
  constructor(m) {
    const ys = m.y;
    const get = (v, i, y) => (typeof v === 'function' ? v(y) : Array.isArray(v) ? v[i] : v);
    this.rows = ys.map((y, i) => [y, get(m.hw, i, y), get(m.zF, i, y), get(m.zB, i, y), get(m.rF, i, y), get(m.rB, i, y)])
      .sort((a, b) => a[0] - b[0]);
    this.y0 = this.rows[0][0];
    this.y1 = this.rows[this.rows.length - 1][0];
    this._s = { hw: 0, zF: 0, zB: 0, rF: 0, rB: 0 };
    this._v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  }

  /** The section at height y, between the measured rows. */
  sec(y, out = this._s) {
    const R = this.rows;
    let i = 0;
    if (y >= R[R.length - 1][0]) i = R.length - 2;
    else if (y > R[0][0]) { let lo = 0, hi = R.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (R[mid][0] <= y) lo = mid; else hi = mid; } i = lo; }
    const a = R[Math.max(0, i)], b = R[Math.min(R.length - 1, i + 1)];
    const k = b[0] === a[0] ? 0 : Math.min(1, Math.max(0, (y - a[0]) / (b[0] - a[0])));
    out.hw = a[1] + (b[1] - a[1]) * k;
    out.zF = a[2] + (b[2] - a[2]) * k;
    out.zB = a[3] + (b[3] - a[3]) * k;
    const d = Math.max(0.002, out.zF - out.zB);
    out.rF = Math.max(0.001, Math.min(a[4] + (b[4] - a[4]) * k, out.hw, d * 0.5));
    out.rB = Math.max(0.001, Math.min(a[5] + (b[5] - a[5]) * k, out.hw, d * 0.5));
    return out;
  }

  /** The surface point at height y, at t round the section. */
  point(y, t, out = new THREE.Vector3()) {
    t -= Math.floor(t);
    const left = t > 0.5;
    if (left) t = 1 - t;
    const s = this.sec(y);
    let x, z;
    if (t < T[1]) { x = (t / T[1]) * (s.hw - s.rF); z = s.zF; }
    else if (t < T[2]) { const p = ((t - T[1]) / (T[2] - T[1])) * HP; x = s.hw - s.rF + s.rF * Math.sin(p); z = s.zF - s.rF + s.rF * Math.cos(p); }
    else if (t < T[3]) { const u = (t - T[2]) / (T[3] - T[2]); x = s.hw; z = s.zF - s.rF + u * (s.zB + s.rB - (s.zF - s.rF)); }
    else if (t < T[4]) { const p = ((t - T[3]) / (T[4] - T[3])) * HP; x = s.hw - s.rB + s.rB * Math.cos(p); z = s.zB + s.rB - s.rB * Math.sin(p); }
    else { const u = (t - T[4]) / (T[5] - T[4]); x = (s.hw - s.rB) * (1 - u); z = s.zB; }
    return out.set(left ? -x : x, y, z);
  }

  /** The outward surface normal at (y, t), taken from the surface itself (so slopes count too). */
  normal(y, t, out = new THREE.Vector3()) {
    const [a, b, c, d] = this._v;
    const e = 1e-3, ey = 0.01;
    this.point(y, t + e, a); this.point(y, t - e, b); a.sub(b);
    this.point(Math.min(this.y1, y + ey), t, c); this.point(Math.max(this.y0, y - ey), t, d); c.sub(d);
    out.crossVectors(c, a);
    if (out.lengthSq() < 1e-12) out.set(0, 1, 0);
    out.normalize();
    // outward: away from the middle of the section
    const s = this.sec(y);
    this.point(y, t, d);
    if (out.x * d.x + out.z * (d.z - (s.zF + s.zB) / 2) < 0) out.negate();
    return out;
  }

  /** t at x on the front (as seen from the front); negative on the left half. */
  tAtX(y, x) {
    const s = this.sec(y), ax = Math.abs(x);
    let t;
    if (ax <= s.hw - s.rF) t = (ax / Math.max(1e-6, s.hw - s.rF)) * T[1];
    else t = T[1] + (Math.asin(Math.min(1, (ax - (s.hw - s.rF)) / s.rF)) / HP) * (T[2] - T[1]);
    return x < 0 ? -t : t;
  }

  /** t at z on the right side (as seen from the side). */
  tAtZ(y, z) {
    const s = this.sec(y);
    if (z >= s.zF - s.rF) return T[1] + (Math.acos(Math.max(-1, Math.min(1, (z - (s.zF - s.rF)) / s.rF))) / HP) * (T[2] - T[1]);
    if (z >= s.zB + s.rB) return T[2] + ((s.zF - s.rF - z) / Math.max(1e-6, s.zF - s.rF - (s.zB + s.rB))) * (T[3] - T[2]);
    return T[3] + (Math.asin(Math.max(-1, Math.min(1, (s.zB + s.rB - z) / s.rB))) / HP) * (T[4] - T[3]);
  }

  /** Rows [y, t0, t1] for a region outlined in the front view, [[x, y], ...]. */
  rowsFront(poly, { step = 0.08, from = -Infinity, to = Infinity } = {}) {
    return this._rows(poly, step, (y, [xl, xr]) => [this.tAtX(y, xl), this.tAtX(y, xr)], from, to);
  }

  /** Rows for a region outlined in the side view, [[z, y], ...], on the right (+1) or left (-1) side. */
  rowsSide(poly, side = 1, { step = 0.08, from = -Infinity, to = Infinity } = {}) {
    return this._rows(poly, step, (y, [za, zb]) => {
      const t0 = this.tAtZ(y, zb), t1 = this.tAtZ(y, za);
      return side > 0 ? [t0, t1] : [-t1, -t0];
    }, from, to);
  }

  /** Rows from a function of y giving [t0, t1] (or null), between two heights. */
  rowsFn(y0, y1, fn, { step = 0.08 } = {}) {
    const out = [];
    const n = Math.max(1, Math.ceil((y1 - y0) / step));
    for (let i = 0; i <= n; i++) { const y = y0 + ((y1 - y0) * i) / n; const r = fn(y); if (r) out.push([y, r[0], r[1]]); }
    return out;
  }

  /** Rows for a band all the way round between two heights, or between t0 and t1. */
  rowsBand(y0, y1, t0 = 0, t1 = 1, { step = 0.08 } = {}) {
    const out = [];
    const n = Math.max(1, Math.ceil((y1 - y0) / step));
    for (let i = 0; i <= n; i++) { const y = y0 + ((y1 - y0) * i) / n; out.push([y, t0, t1]); }
    return out;
  }

  _rows(poly, step, toT, from = -Infinity, to = Infinity) {
    let lo = Infinity, hi = -Infinity;
    for (const p of poly) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
    lo = Math.max(lo, this.y0, from); hi = Math.min(hi, this.y1, to);
    const out = [];
    const n = Math.max(1, Math.ceil((hi - lo) / step));
    for (let i = 0; i <= n; i++) {
      const y = lo + ((hi - lo) * i) / n;
      const yy = Math.min(hi - 1e-4, Math.max(lo + 1e-4, y));
      const sp = span(poly, yy);
      if (sp) out.push([y, ...toT(y, sp)]);
    }
    return out;
  }

  /**
   * A panel of the surface over rows [y, t0, t1], with a thickness. It sits `off` proud of the surface
   * and goes `thick` inwards from there. Returns one BufferGeometry (outer face smooth, edges square).
   */
  panel(rows, { cols = 22, thick = 0.12, off = 0 } = {}) {
    const R = rows.length, C = cols + 1;
    if (R < 2) return new THREE.BufferGeometry();
    const P = new THREE.Vector3(), N = new THREE.Vector3();
    const outer = new Float32Array(R * C * 3), inner = new Float32Array(R * C * 3), uv = new Float32Array(R * C * 2);
    for (let i = 0; i < R; i++) {
      const [y, t0, t1] = rows[i];
      let arc = 0, px = 0, py = 0, pz = 0;
      for (let j = 0; j < C; j++) {
        const t = t0 + ((t1 - t0) * j) / cols;
        this.point(y, t, P);
        this.normal(y, t, N);
        const k = (i * C + j) * 3;
        outer[k] = P.x + N.x * off; outer[k + 1] = P.y + N.y * off; outer[k + 2] = P.z + N.z * off;
        inner[k] = P.x + N.x * (off - thick); inner[k + 1] = P.y + N.y * (off - thick); inner[k + 2] = P.z + N.z * (off - thick);
        if (j) arc += Math.hypot(P.x - px, P.y - py, P.z - pz);
        px = P.x; py = P.y; pz = P.z;
        uv[(i * C + j) * 2] = arc; uv[(i * C + j) * 2 + 1] = y;
      }
    }
    // centre the arc length so textures line up across the panel
    for (let i = 0; i < R; i++) { const m = uv[(i * C + cols) * 2] / 2; for (let j = 0; j < C; j++) uv[(i * C + j) * 2] -= m; }

    // which way round the triangles go so the outer face points outwards
    const a = new THREE.Vector3(outer[0], outer[1], outer[2]);
    const b = new THREE.Vector3(outer[C * 3], outer[C * 3 + 1], outer[C * 3 + 2]);
    const d = new THREE.Vector3(outer[3], outer[4], outer[5]);
    const tn = new THREE.Vector3().crossVectors(b.sub(a), d.sub(a));
    this.normal(rows[0][0], rows[0][1], N);
    const flip = tn.dot(N) < 0;

    const grid = (pos, out) => {
      const idx = [];
      for (let i = 0; i < R - 1; i++) {
        for (let j = 0; j < C - 1; j++) {
          const q = i * C + j, r = (i + 1) * C + j, s = (i + 1) * C + j + 1, w = i * C + j + 1;
          if (flip !== !out) idx.push(q, w, r, r, w, s); else idx.push(q, r, w, r, s, w);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.BufferAttribute(uv.slice(), 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g.toNonIndexed();
    };
    const gOut = grid(outer, true), gIn = grid(inner, false);

    // the four edges, square to the faces
    const wall = [];
    const cx = new THREE.Vector3();
    for (let k = 0; k < R * C; k++) cx.x += outer[k * 3], cx.y += outer[k * 3 + 1], cx.z += outer[k * 3 + 2];
    cx.divideScalar(R * C);
    const edge = (list) => {
      for (let e = 0; e < list.length - 1; e++) {
        const p = list[e] * 3, q = list[e + 1] * 3;
        const v = [outer[p], outer[p + 1], outer[p + 2], outer[q], outer[q + 1], outer[q + 2], inner[q], inner[q + 1], inner[q + 2], inner[p], inner[p + 1], inner[p + 2]];
        // face away from the middle of the panel
        const A = new THREE.Vector3(v[0], v[1], v[2]), B = new THREE.Vector3(v[3], v[4], v[5]), D = new THREE.Vector3(v[9], v[10], v[11]);
        const n = new THREE.Vector3().crossVectors(B.clone().sub(A), D.clone().sub(A));
        const mid = A.clone().add(B).multiplyScalar(0.5).sub(cx);
        if (n.dot(mid) < 0) wall.push(v[0], v[1], v[2], v[9], v[10], v[11], v[6], v[7], v[8], v[0], v[1], v[2], v[6], v[7], v[8], v[3], v[4], v[5]);
        else wall.push(v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8], v[0], v[1], v[2], v[6], v[7], v[8], v[9], v[10], v[11]);
      }
    };
    const row = (i) => Array.from({ length: C }, (_, j) => i * C + j);
    const col = (j) => Array.from({ length: R }, (_, i) => i * C + j);
    edge(row(0)); edge(row(R - 1)); edge(col(0)); edge(col(C - 1));
    const gW = new THREE.BufferGeometry();
    gW.setAttribute('position', new THREE.Float32BufferAttribute(wall, 3));
    gW.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((wall.length / 3) * 2), 2));
    gW.computeVertexNormals();
    return mergeGeometries([gOut, gIn, gW], false);
  }

  /** The outline of the section at height y as [[x, z], ...] (for a lid or a floor plate). */
  outline(y, n = 72, inset = 0) {
    const out = [], P = new THREE.Vector3(), N = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const t = i / n;
      this.point(y, t, P);
      if (inset) { this.normal(y, t, N); N.y = 0; N.normalize(); P.addScaledVector(N, -inset); }
      out.push([P.x, P.z]);
    }
    return out;
  }

  /**
   * Where to put something on the surface: at height y and at x on the front (`x`), or at z on the
   * right or left side (`z`, `side`), or at t round the section (`t`). Returns the position `off`
   * proud of the surface and the rotation that turns +Z to face out of it (Euler order 'YXZ').
   */
  place(y, { x, z, side = 1, t, off = 0 } = {}) {
    const tt = t !== undefined ? t : x !== undefined ? this.tAtX(y, x) : side > 0 ? this.tAtZ(y, z) : -this.tAtZ(y, z);
    const P = this.point(y, tt), N = this.normal(y, tt);
    P.addScaledVector(N, off);
    return { at: [P.x, P.y, P.z], rot: [-Math.asin(Math.max(-1, Math.min(1, N.y))), Math.atan2(N.x, N.z), 0], n: [N.x, N.y, N.z] };
  }
}

/** The part of a polygon [[x, z], ...] on one side of z = c (keep 'above' or 'below'). */
export function clipZ(poly, c, keep = 'above') {
  const inside = (p) => (keep === 'above' ? p[1] >= c : p[1] <= c);
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ia = inside(a), ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) { const k = (c - a[1]) / (b[1] - a[1]); out.push([a[0] + k * (b[0] - a[0]), c]); }
  }
  return out;
}
