// The outline of a built robot as seen from straight in front, for checking it against the outline
// measured from the maker's picture (src/data/shapes). Runs in Node: the parts are built with the real
// Builder and every triangle is projected onto the front plane.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Builder, mergePart } from '../src/kit.js';

/** Every triangle of the robot (dock left out) in robot space, as a flat array of 9 numbers each. */
export function triangles(def, { skip = () => false } = {}) {
  const out = [];
  const v = new THREE.Vector3();
  for (const p of def.parts) {
    if (p.group === 'dock' || skip(p)) continue;
    const b = new Builder({ accent: new THREE.Color('#3de0ff'), accent2: new THREE.Color('#ffd166'), look: 'studio', mats: def.mats?.studio });
    p.build(b);
    mergePart(b, mergeGeometries);
    const root = new THREE.Group();
    root.add(b.group);
    root.position.set(...p.home);
    if (p.rot0) root.rotation.set(...p.rot0);
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isMesh || o.userData.isEdge) return;
      const g = o.geometry, pos = g.attributes.position, idx = g.index;
      const mats = [];
      if (o.isInstancedMesh) { const m = new THREE.Matrix4(); for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); mats.push(new THREE.Matrix4().multiplyMatrices(o.matrixWorld, m)); } }
      else mats.push(o.matrixWorld);
      const n = idx ? idx.count : pos.count;
      for (const M of mats) {
        for (let i = 0; i < n; i++) {
          v.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(M);
          out.push(v.x, v.y, v.z);
        }
      }
    });
  }
  return out;
}

/** For each height y (units), the leftmost and rightmost x of the robot seen from the front, or null. */
export function frontSpans(tris, ys) {
  const lo = ys.map(() => Infinity), hi = ys.map(() => -Infinity);
  const sorted = ys.map((y, i) => [y, i]).sort((a, b) => a[0] - b[0]);
  const yv = sorted.map((s) => s[0]);
  for (let t = 0; t < tris.length; t += 9) {
    const ax = tris[t], ay = tris[t + 1], bx = tris[t + 3], by = tris[t + 4], cx = tris[t + 6], cy = tris[t + 7];
    const y0 = Math.min(ay, by, cy), y1 = Math.max(ay, by, cy);
    // first sample row at or above y0
    let k = 0, h = yv.length;
    while (k < h) { const m = (k + h) >> 1; if (yv[m] < y0) k = m + 1; else h = m; }
    for (; k < yv.length && yv[k] <= y1; k++) {
      const y = yv[k];
      let a = Infinity, b = -Infinity;
      for (const [px, py, qx, qy] of [[ax, ay, bx, by], [bx, by, cx, cy], [cx, cy, ax, ay]]) {
        if ((py <= y && qy >= y) || (qy <= y && py >= y)) {
          if (qy === py) { a = Math.min(a, px, qx); b = Math.max(b, px, qx); }
          else { const x = px + ((y - py) / (qy - py)) * (qx - px); a = Math.min(a, x); b = Math.max(b, x); }
        }
      }
      const i = sorted[k][1];
      if (a < lo[i]) lo[i] = a;
      if (b > hi[i]) hi[i] = b;
    }
  }
  return ys.map((_, i) => (lo[i] <= hi[i] ? [lo[i], hi[i]] : null));
}

/** Compare a robot's front outline with the measured one: errors in millimetres per edge. */
export function compareFront(def, shape, { view = 'front', skipParts } = {}) {
  const v = shape.views[view];
  const skipBands = (v.skip_mm || []).map(([a, b]) => [a - 12, b + 12]);
  const rows = v.rows.filter(([y]) => !skipBands.some(([a, b]) => y >= a && y <= b));
  const tris = triangles(def, { skip: skipParts });
  const sp = frontSpans(tris, rows.map((r) => r[0] / 100));
  const errs = [];
  const worst = [];
  rows.forEach(([y, xl, xr], i) => {
    const s = sp[i];
    if (!s) { errs.push(999, 999); worst.push([y, 999]); return; }
    const el = Math.abs(s[0] * 100 - xl), er = Math.abs(s[1] * 100 - xr);
    errs.push(el, er);
    worst.push([y, Math.max(el, er)]);
  });
  const sorted = errs.slice().sort((a, b) => a - b);
  const mean = errs.reduce((a, b) => a + b, 0) / errs.length;
  return { rows: rows.length, mean, p90: sorted[Math.floor(sorted.length * 0.9)], max: sorted[sorted.length - 1], worst: worst.sort((a, b) => b[1] - a[1]).slice(0, 5) };
}
