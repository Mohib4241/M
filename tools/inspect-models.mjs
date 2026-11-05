// Build every part of the given robots outside the browser: errors, overall size, triangles. node tools/inspect-models.mjs marvel [V=1 for each part]
// Build every part of the given robots with the real Builder, and report errors, sizes and triangles.
import * as THREE from 'three';
import { Builder, mergePart } from '../src/kit.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
const ids = process.argv.slice(2);
for (const id of ids) {
  const def = (await import(`../src/data/${id}.js`)).default;
  let tris = 0, bad = 0;
  const all = new THREE.Box3();
  for (const p of def.parts) {
    try {
      const b = new Builder({ accent: new THREE.Color('#3de0ff'), accent2: new THREE.Color('#ffd166'), look: 'studio', mats: def.mats?.studio });
      p.build(b);
      mergePart(b, mergeGeometries);
      const g = new THREE.Group(); g.add(b.group); g.position.set(...p.home); g.updateMatrixWorld(true);
      const bx = new THREE.Box3().setFromObject(g);
      g.traverse((o) => { if (o.isMesh && o.geometry) { const n = o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; tris += n * (o.isInstancedMesh ? o.count : 1); for (const v of o.geometry.attributes.position.array) if (!Number.isFinite(v)) { bad++; break; } } });
      if (!bx.isEmpty() && p.group !== 'dock') all.union(bx);
      if (process.env.V) console.log(' ', p.id.padEnd(16), bx.min.toArray().map((v) => v.toFixed(2)).join(','), '→', bx.max.toArray().map((v) => v.toFixed(2)).join(','));
    } catch (e) { console.log('  ERROR', id, p.id, e.message); bad++; }
  }
  console.log(id, 'tris', Math.round(tris), 'bad', bad, 'size', all.getSize(new THREE.Vector3()).toArray().map((v) => (v * 100).toFixed(0) + 'mm').join(' x '));
}
