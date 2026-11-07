// Builders shared by the field robots (ducts, pipes, facades, patrols): crawler tracks, round brushes,
// hoses, rugged control cases, pan-tilt-zoom heads. Y up, +Z front, 1 unit = 100 mm, like lib.js.
import * as THREE from 'three';

const PI = Math.PI;
const tmp = new THREE.Object3D();
const UP = new THREE.Vector3(0, 1, 0);

/** Instances of `geo` at the given poses [{ p: [x,y,z], q: THREE.Quaternion | null, s: [x,y,z] | number }]. */
export function instances(b, geo, poses, o = {}) {
  const im = new THREE.InstancedMesh(geo, b.m(o.m || 'dark'), poses.length);
  poses.forEach((ps, i) => {
    tmp.position.set(...ps.p);
    if (ps.q) tmp.quaternion.copy(ps.q); else tmp.quaternion.identity();
    const s = ps.s ?? 1;
    if (Array.isArray(s)) tmp.scale.set(...s); else tmp.scale.setScalar(s);
    tmp.updateMatrix();
    im.setMatrixAt(i, tmp.matrix);
  });
  im.instanceMatrix.needsUpdate = true;
  im.castShadow = im.receiveShadow = true;
  if (o.at) im.position.set(...o.at);
  if (o.rot) im.rotation.set(...o.rot);
  (o.parent || b.cur).add(im);
  b.meshes.push(im);
  return im;
}

/**
 * A round brush: bristles in rings round a core, pointing out and a little forward. The axis is Z (rotate the
 * group to aim it). `r` is the outer radius, `len` the length along the axis.
 */
export function bottleBrush(b, { r = 1.6, len = 2.0, rings = 16, per = 44, core = 0.16, m = 'bristle', thick = 0.014, lean = 0.12, seed = 1, hub = true, hubM = 'metal' } = {}) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const L = r - core;
  const geo = new THREE.CylinderGeometry(thick * 0.45, thick, L, 5, 1);
  geo.translate(0, L / 2, 0); // grows out of its base
  const poses = [];
  for (let i = 0; i < rings; i++) {
    const z = -len / 2 + (i / (rings - 1)) * len;
    for (let j = 0; j < per; j++) {
      const a = ((j + (i % 2) * 0.5) / per) * PI * 2 + rnd() * 0.07;
      const dir = new THREE.Vector3(Math.cos(a), Math.sin(a), lean + (rnd() - 0.5) * 0.12).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
      const k = 0.82 + rnd() * 0.18;
      poses.push({ p: [Math.cos(a) * core, Math.sin(a) * core, z], q, s: [1, k, 1] });
    }
  }
  instances(b, geo, poses, { m });
  if (hub) {
    b.cyl(core * 1.1, core * 1.1, len + 0.1, { m: hubM, rot: [PI / 2, 0, 0], seg: 20 });
    b.cyl(core * 1.9, core * 1.9, 0.12, { m: 'silver', rot: [PI / 2, 0, 0], at: [0, 0, len / 2 + 0.06], seg: 24 });
  }
}

/** A hose or cable: a tube through the points [[x,y,z], …], radius `r`. */
export function tube(b, pts, r, o = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', o.tension ?? 0.4);
  const geo = new THREE.TubeGeometry(curve, o.segs ?? Math.max(24, pts.length * 12), r, o.radial ?? 10, false);
  return b.mesh(geo, { m: o.m || 'rubber', thr: 90, e: false });
}

/** A ribbed hose: a tube with rings along it. */
export function ribbedHose(b, pts, r, o = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', o.tension ?? 0.4);
  const n = o.ribs ?? 40;
  const ring = new THREE.TorusGeometry(r, r * 0.16, 6, 14);
  const poses = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = curve.getPointAt(t), tg = curve.getTangentAt(t);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tg);
    poses.push({ p: [p.x, p.y, p.z], q });
  }
  tube(b, pts, r * 0.9, { ...o, m: o.m || 'rubber' });
  instances(b, ring, poses, { m: o.ribM || o.m || 'rubber' });
}

/**
 * A crawler track unit with its axis along X (the belt runs along Z). By default a stadium `len` × `h`; pass
 * `poly` ([[z, y], …], the corners of the belt, round them with `r`) for a wedge or a box. The belt is rubber
 * (or `beltM`) with cleats round the loop; a frame plate covers the outer face when `frame` is set, and a
 * sprocket sits at each corner in `wheelsAt` ([[z, y, radius], …]).
 */
export function trackUnit(b, { len = 3, h = 1, w = 0.8, side = 1, poly, r, cleats = 30, beltM = 'rubber', frameM = 'yellow', frame = true, tread = 'dark', wheelsAt, hubM = 'steel', cleat = [1.02, 0.045, 0.09], inset = 0.06 } = {}) {
  const R = r ?? h / 2;
  const P = poly || [[-len / 2, -h / 2], [len / 2, -h / 2], [len / 2, h / 2], [-len / 2, h / 2]];
  b.profile(P.map(([z, y]) => [z, y, R]), w, { axis: 'x', m: beltM, bevel: 0.05 });
  // cleats at equal steps along the edges of the polygon
  const edges = P.map((p, i) => { const q = P[(i + 1) % P.length]; return { a: p, d: [q[0] - p[0], q[1] - p[1]], L: Math.hypot(q[0] - p[0], q[1] - p[1]) }; });
  const per = edges.reduce((t, e2) => t + e2.L, 0);
  const poses = [];
  for (let i = 0; i < cleats; i++) {
    let d = (i / cleats) * per;
    for (const e2 of edges) {
      if (d <= e2.L) {
        const u = d / e2.L;
        const ang = Math.atan2(e2.d[1], e2.d[0]);
        // the polygon runs (z, y); a cleat lies along its edge, so it turns about X by the edge's slope
        poses.push({ p: [0, e2.a[1] + e2.d[1] * u, e2.a[0] + e2.d[0] * u], q: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -ang) });
        break;
      }
      d -= e2.L;
    }
  }
  instances(b, new THREE.BoxGeometry(w * cleat[0], cleat[1], cleat[2]), poses, { m: tread });
  const xo = side * (w / 2 + 0.02);
  if (frame) {
    const cx = P.reduce((t, p) => t + p[0], 0) / P.length, cy = P.reduce((t, p) => t + p[1], 0) / P.length;
    const shrink = ([z, y]) => [z + Math.sign(cx - z) * inset, y + Math.sign(cy - y) * inset];
    b.profile(P.map(shrink).map(([z, y]) => [z, y, Math.max(0.05, R - inset)]), 0.07, { axis: 'x', m: frameM, at: [xo + side * 0.035, 0, 0], bevel: 0.025 });
  }
  const W = wheelsAt || [[-len / 2 + R, 0, R * 0.66], [len / 2 - R, 0, R * 0.66], [0, 0, R * 0.55]];
  for (const [z, y, rad] of W) {
    b.cyl(rad, rad, 0.05, { m: hubM, rot: [0, 0, PI / 2], at: [xo + side * (frame ? 0.09 : 0.03), y, z], seg: 24 });
    b.cyl(rad * 0.3, rad * 0.3, 0.06, { m: 'dark', rot: [0, 0, PI / 2], at: [xo + side * (frame ? 0.12 : 0.05), y, z], seg: 12 });
  }
}

/** A rugged hard case with its lid open: a tub, a panel with controls and a screen in the lid. */
export function ruggedCase(b, { w = 3.6, d = 2.7, h = 1.3, lid = 1.75, shellM = 'trim', screenM = 'screen' } = {}) {
  // the tub
  b.box(w, h, d, { m: shellM, r: 0.18, at: [0, h / 2, 0] });
  // the panel on top of the tub
  b.box(w - 0.3, 0.05, d - 0.3, { m: 'dark', r: 0.05, at: [0, h + 0.01, 0.02], e: false });
  // controls: four knobs, a socket and a small red display
  for (let i = 0; i < 4; i++) b.cyl(0.13, 0.13, 0.1, { m: 'metal', at: [-w * 0.3 + i * 0.52, h + 0.06, d * 0.3], seg: 16 });
  b.box(0.55, 0.22, 0.04, { m: 'red', at: [-w * 0.34, h + 0.05, -d * 0.18], e: false });
  b.cyl(0.14, 0.14, 0.1, { m: 'steel', at: [w * 0.34, h + 0.06, -d * 0.2], seg: 18 });
  b.box(w * 0.5, 0.01, d * 0.2, { m: { k: 'fabric', id: 'case-label', color: 0xcfd3d6 }, at: [0.15, h + 0.045, d * 0.02], e: false });
  // latches on the front
  for (const x of [-w * 0.32, w * 0.32]) b.box(0.3, 0.3, 0.1, { m: 'dark', r: 0.03, at: [x, h * 0.62, d / 2 + 0.03] });
  // the lid, hinged on the back edge
  b.at([0, h, -d / 2 + 0.03], () => {
    b.box(w, 0.28, d, { m: shellM, r: 0.16, at: [0, d / 2, 0.14], rot: [PI / 2 - 0.0, 0, 0], e: true });
    b.box(w * 0.7, 0.02, d * 0.56, { m: screenM, r: 0.03, at: [0, d / 2 + 0.12, 0.17], rot: [PI / 2, 0, 0], e: false });
    b.box(w * 0.78, 0.05, d * 0.66, { m: 'dark', r: 0.05, at: [0, d / 2 + 0.145, 0.15], rot: [PI / 2, 0, 0], e: false });
  }, [-(lid - PI / 2), 0, 0]);
}

/** A pan-tilt-zoom camera head: a dome on a yoke, with a lens pointing +Z. */
export function ptzHead(b, { r = 0.55, m = 'shellDk', lens = true } = {}) {
  b.cyl(r * 0.55, r * 0.7, r * 0.5, { m: 'trim', at: [0, r * 0.25, 0], seg: 28 });
  b.sph(r, { m, at: [0, r * 0.95, 0], seg: 28 });
  if (lens) {
    b.cyl(r * 0.42, r * 0.42, r * 0.5, { m: 'dark', rot: [PI / 2, 0, 0], at: [0, r * 0.95, r * 0.78], seg: 24 });
    b.cyl(r * 0.3, r * 0.3, r * 0.1, { m: 'lens', rot: [PI / 2, 0, 0], at: [0, r * 0.95, r * 1.04], seg: 24 });
  }
}

/** A row of small round LEDs / lamps along X at height 0. */
export function ledRow(b, n, gap, r = 0.05, m = 'lamp') {
  for (let i = 0; i < n; i++) b.cyl(r, r, 0.03, { m, rot: [PI / 2, 0, 0], at: [(i - (n - 1) / 2) * gap, 0, 0], seg: 10, e: false });
}

const Z = new THREE.Vector3(0, 0, 1);

/** A box from point `a` to point `c`: w × h across, as long as the distance between them. */
export function bar(b, a, c, { w = 0.15, h = 0.15, m = 'metal', r = 0.03, e } = {}) {
  const A = new THREE.Vector3(...a), C = new THREE.Vector3(...c), d = C.clone().sub(A), len = d.length();
  const mesh = b.box(w, h, len, { m, r, e });
  mesh.position.copy(A.clone().add(C).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(Z, d.normalize());
  return mesh;
}

/** A cylinder from point `a` to point `c`. */
export function rod(b, a, c, rad = 0.1, { m = 'steel', seg = 16, e } = {}) {
  const A = new THREE.Vector3(...a), C = new THREE.Vector3(...c), d = C.clone().sub(A), len = d.length();
  const mesh = b.cyl(rad, rad, len, { m, seg, e });
  mesh.position.copy(A.clone().add(C).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}

/**
 * For a robot placed from a picture taken from above: `S` is units per pixel, (cx, cy) the pixel at the origin.
 * Image right is +X, image up is +Z. X(px), Z(py) convert, `box(x0, y0, x1, y1)` gives { x, z, w, d } of a pixel box.
 */
export function fromPlan(S, cx = 400, cy = 400) {
  const X = (px) => (px - cx) * S, Z = (py) => (cy - py) * S;
  return {
    X, Z, S,
    box: (x0, y0, x1, y1) => ({ x: X((x0 + x1) / 2), z: Z((y0 + y1) / 2), w: Math.abs(x1 - x0) * S, d: Math.abs(y1 - y0) * S }),
    pts: (list, r) => list.map(([px, py]) => [X(px), Z(py), r]),
  };
}

/** An off-road wheel: knobbly tyre on a rim with spokes. Axis along X; `side` is -1 or +1. */
export function offroadWheel(b, { r = 2.2, w = 0.9, side = 1, rimM = 'silver', blocks = 28, spokes = 6, tyreM = 'rubber' } = {}) {
  const h = w / 2, ri = r * 0.62;
  const tyre = [[ri, -h * 0.9], [r - 0.14, -h], [r - 0.04, -h * 0.8], [r, -h * 0.4], [r, h * 0.4], [r - 0.04, h * 0.8], [r - 0.14, h], [ri, h * 0.9]];
  b.lathe(tyre, { m: tyreM, rot: [0, 0, PI / 2], seg: 48 });
  b.radial(new THREE.BoxGeometry(w * 0.92, 0.16, 0.3), blocks, r + 0.02, { axis: 'x', m: tyreM, e: false });
  b.cyl(ri, ri, w * 0.5, { m: 'dark', rot: [0, 0, PI / 2], seg: 36, e: false });
  b.cyl(ri * 0.93, ri * 0.93, 0.06, { m: rimM, rot: [0, 0, PI / 2], at: [side * (w * 0.26), 0, 0], seg: 40, e: false });
  b.radial(new THREE.BoxGeometry(0.1, ri * 0.7, 0.2), spokes, ri * 0.5, { axis: 'x', m: rimM, at: [side * (w * 0.3), 0, 0], e: false });
  b.cyl(ri * 0.22, ri * 0.22, 0.12, { m: 'steel', rot: [0, 0, PI / 2], at: [side * (w * 0.32), 0, 0], seg: 18, e: false });
}

/** A coil spring along Y (a tube with rings), radius `r`, height `h`. */
export function coil(b, r = 0.18, h = 1.2, { m = 'red', turns = 6 } = {}) {
  b.tor(r, 0.03, { m, rot: [PI / 2, 0, 0], at: [0, 0, 0], e: false });
  for (let i = 0; i < turns; i++) b.tor(r, 0.035, { m, rot: [PI / 2 + 0.12, 0, 0], at: [0, -h / 2 + (i + 0.5) * (h / turns), 0], seg: 18, e: false });
}
