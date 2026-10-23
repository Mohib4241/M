// The robots as cars. The game uses the same parts and materials as the viewer, with every part
// at its home position (the closed robot), so the car looks like the real thing.
//
// To keep the frame rate up, the car's parts share one material per finish and their meshes are
// merged into one mesh per material. The two drive wheels stay separate, so they can spin.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Builder } from '../kit.js';
import { applyPaint } from './livery.js';

// Drive wheel radius in units, from the wheel builders in each robot's data file
export const WHEEL_R = { phantas: 0.62, cc1pro: 0.8 };

const cache = new Map();
// the parts whose position the lights and decals are placed from
const KEY_PART = /^(side-(cover|shell)-[lr]|top-(cover|hood)|front-(cover|shell)|rear-(cover|shell)|bumper)$/;

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
  const boxes = {}; // where the key parts are, in the car's own frame

  for (const pd of def.parts) {
    if (pd.group === 'dock') continue; // the docking station is not part of the car
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
    if (KEY_PART.test(pd.id)) boxes[pd.id] = new THREE.Box3().setFromObject(holder);

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
  const local = new THREE.Box3().setFromObject(car); // in the car's own frame, before it is lifted onto the floor
  car.position.y = -local.min.y;
  car.rotation.order = 'YXZ'; // yaw, then pitch and roll in the robot's own frame
  applyPaint(shared, def.id);

  // where the drive wheels and the tail really are, for smoke, sparks and flames
  const wl = def.parts.find((x) => x.id === 'wheel-l'), box = new THREE.Box3().setFromObject(car);
  // where the covers, roof, front and rear are, for the number decals, the lights and the underglow
  const union = (re) => { const b = new THREE.Box3(); for (const [id, bx] of Object.entries(boxes)) if (re.test(id)) b.union(bx); return b.isEmpty() ? null : b; };
  const side = union(/^side-/), roof = union(/^top-/), front = union(/^front-/), rear = union(/^rear-/);
  const H = local.max.y - local.min.y, Ld = local.max.z - local.min.z;
  const dims = {
    sideX: side ? Math.max(Math.abs(side.min.x), Math.abs(side.max.x)) : (local.max.x - local.min.x) * 0.4,
    sideY: side ? (side.min.y + side.max.y) / 2 : H * 0.45,
    sideZ: side ? (side.min.z + side.max.z) / 2 : 0,
    sideLen: side ? side.max.z - side.min.z : Ld * 0.7,
    sideH: side ? side.max.y - side.min.y : H * 0.45,
    roofY: roof ? roof.max.y : H * 0.8,
    roofZ: roof ? (roof.min.z + roof.max.z) / 2 : 0,
    roofD: roof ? roof.max.z - roof.min.z : Ld * 0.6,
    frontZ: front ? front.max.z : local.max.z,
    frontY: front ? front.min.y : H * 0.3,
    rearZ: rear ? rear.min.z : local.min.z,
    rearY: rear ? rear.min.y + (rear.max.y - rear.min.y) * 0.5 : H * 0.4,
    footL: Ld,
  };
  const wrap = {
    car, wheels, shared, r: WHEEL_R[def.id] || 0.7,
    wheelX: Math.abs(wl?.home[0] ?? 2), wheelZ: wl?.home[2] ?? -0.7, // drive wheel offset from the centre
    rearZ: box.min.z, height: box.max.y - box.min.y, dims,
  };
  cache.set(def.id, wrap);
  return wrap;
}

function push(buckets, mat, g) {
  if (!buckets.has(mat)) buckets.set(mat, []);
  buckets.get(mat).push(g);
}
