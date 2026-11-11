// Audit of every robot against its published size, plus how heavy each model is to draw.
//   node tools/audit.mjs
// A robot's data file gives `dims` in millimetres ({ l: front to back, w: side to side, h: height }, any of
// them) and may list `dimsSkip`: parts that are not in the maker's measure (a hose, a control case, a
// raised arm). The model's own box is measured from its triangles and compared. Where the maker's own picture
// and its sheet disagree and the model follows the picture, `dimsKnown` gives the reason for that dimension.
import { triangles } from './silhouette.mjs';
import { ROBOTS } from '../src/data/robots.js';

export const TOL = 0.06; // within 6 percent ...
export const TOL_MM = 25; // ... or 25 mm, whichever is larger

/** The model's box in millimetres, leaving out the dock and the parts in dimsSkip. */
export function modelBox(def) {
  const skip = new Set(def.dimsSkip || []);
  const t = triangles(def, { skip: (p) => skip.has(p.id) });
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < t.length; i += 3) for (let k = 0; k < 3; k++) { if (t[i + k] < lo[k]) lo[k] = t[i + k]; if (t[i + k] > hi[k]) hi[k] = t[i + k]; }
  let floor = lo[1];
  if (skip.size) { const all = triangles(def); for (let i = 1; i < all.length; i += 3) if (all[i] < floor) floor = all[i]; } // the floor counts every part
  return { w: (hi[0] - lo[0]) * 100, h: (def.dimsFromFloor === false ? hi[1] - lo[1] : hi[1]) * 100, l: (hi[2] - lo[2]) * 100, tris: t.length / 9, floor: floor * 100 };
}

/** One line per published dimension: { key, want, got, off (mm), ok }. */
export function checkDims(def) {
  if (!def.dims) return [];
  const box = modelBox(def);
  return Object.entries(def.dims).map(([key, want]) => {
    const got = box[key], off = got - want;
    const within = Math.abs(off) <= Math.max(TOL_MM, want * TOL);
    const noted = !within && def.dimsKnown && def.dimsKnown[key] ? def.dimsKnown[key] : '';
    return { key, want, got: Math.round(got), off: Math.round(off), within, noted, ok: within || !!noted };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const one = process.argv[2];
  if (one) { // node tools/audit.mjs <id>: the box of each part, to find what sticks out
    const def = ROBOTS[one];
    for (const p of def.parts) {
      if (p.group === 'dock') continue;
      const t = triangles({ ...def, parts: [p] });
      const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
      for (let i = 0; i < t.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], t[i + k]); hi[k] = Math.max(hi[k], t[i + k]); }
      console.log(p.id.padEnd(22), 'x', (lo[0] * 100).toFixed(0).padStart(6), (hi[0] * 100).toFixed(0).padStart(6), ' y', (lo[1] * 100).toFixed(0).padStart(6), (hi[1] * 100).toFixed(0).padStart(6), ' z', (lo[2] * 100).toFixed(0).padStart(6), (hi[2] * 100).toFixed(0).padStart(6));
    }
    process.exit(0);
  }
  let bad = 0;
  for (const [id, def] of Object.entries(ROBOTS)) {
    const box = modelBox(def);
    const rows = checkDims(def);
    const txt = rows.length ? rows.map((r) => `${r.key} ${r.got}/${r.want}${r.within ? '' : r.noted ? ' (noted)' : ' ✗'}`).join('  ') : 'no published size';
    if (rows.some((r) => !r.ok)) bad++;
    console.log(`${id.padEnd(12)} model ${Math.round(box.l)} × ${Math.round(box.w)} × ${Math.round(box.h)} mm (l × w × h)  ${String(Math.round(box.tris / 1000)).padStart(4)}k tris  parts ${String(def.parts.length).padStart(2)}  | ${txt}`);
  }
  console.log(bad ? `${bad} robots are off their published size` : 'every robot with a published size is within tolerance');
  process.exitCode = bad ? 1 : 0;
}
