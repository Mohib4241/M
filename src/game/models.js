// The robots as cars. The game uses the same parts and materials as the viewer, with every part
// at its home position (the closed robot), so the car looks like the real thing.
//
// To keep the frame rate up, the car's parts share one material per finish and their meshes are
// merged into one mesh per material. The two drive wheels stay separate, so they can spin.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Builder } from '../kit.js';

// Drive wheel radius in units, from the wheel builders in each robot's data file
export const WHEEL_R = { phantas: 0.62, cc1pro: 0.8 };

const cache = new Map();

/** Geometry in the shape the merge needs: non-indexed, with position, normal and uv. */
function plain(g) {
  const x = g.index ? g.toNonIndexed() : g.clone();
  if (!x.attributes.normal) x.computeVertexNormals();
  if (!x.attributes.uv) x.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2));
  for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'uv'].includes(k)) x.deleteAttribute(k);
  return x;
}

export function carModel(def) {
  if (cache.has(def.id)) return cache.get(def.id);
  const tone = def.studio || def;
  const ctx = { accent: new THREE.Color(tone.accent), accent2: new THREE.Color(tone.accent2), look: 'studio' };
  const shared = new Map(); // one material per finish, across all the parts
  const car = new THREE.Group();
  const buckets = new Map(); // material -> geometries to merge
  const wheels = { l: null, r: null };

  for (const pd of def.parts) {
    const b = new Builder(ctx);
    b._mats = shared;
    pd.build(b);
    // the outline lines are for the viewer; the race shows the clean surfaces
    const lines = [];
    b.group.traverse((o) => { if (o.userData.isEdge) lines.push(o); });
    for (const l of lines) l.removeFromParent();

    // place the part where it sits on the robot, and read each mesh's transform from there
    const holder = new THREE.Group();
    holder.position.set(...pd.home);
    if (pd.rot0) holder.rotation.set(...pd.rot0);
    holder.add(b.group);
    holder.updateMatrixWorld(true);

    if (pd.id === 'wheel-l' || pd.id === 'wheel-r') {
      // keep wheels as their own objects, centred on the axle, so they can turn
      const w = new THREE.Group();
      w.name = pd.id;
      w.position.copy(holder.position);
      w.add(b.group);
      b.group.position.set(0, 0, 0);
      car.add(w);
      wheels[pd.id === 'wheel-l' ? 'l' : 'r'] = b.group;
      continue;
    }
    b.group.traverse((o) => {
      if (o.isInstancedMesh) {
        const m = new THREE.Matrix4();
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m);
          const g = plain(o.geometry).applyMatrix4(m).applyMatrix4(o.matrixWorld);
          push(buckets, o.material, g);
        }
      } else if (o.isMesh) {
        push(buckets, o.material, plain(o.geometry).applyMatrix4(o.matrixWorld));
      }
    });
  }

  for (const [mat, list] of buckets) {
    const merged = mergeGeometries(list, false);
    for (const g of list) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    car.add(mesh);
  }

  // rest the lowest part on the floor
  car.updateMatrixWorld(true);
  const low = new THREE.Box3().setFromObject(car).min.y;
  car.position.y = -low;
  car.rotation.order = 'YXZ'; // yaw, then pitch and roll in the robot's own frame
  // where the drive wheels and the tail really are, for smoke, sparks and flames
  const wl = def.parts.find((x) => x.id === 'wheel-l'), box = new THREE.Box3().setFromObject(car);
  const wrap = {
    car, wheels, r: WHEEL_R[def.id] || 0.7,
    wheelX: Math.abs(wl?.home[0] ?? 2), wheelZ: wl?.home[2] ?? -0.7, // drive wheel offset from the centre
    rearZ: box.min.z, height: box.max.y - box.min.y,
  };
  cache.set(def.id, wrap);
  return wrap;
}

function push(buckets, mat, g) {
  if (!buckets.has(mat)) buckets.set(mat, []);
  buckets.get(mat).push(g);
}
