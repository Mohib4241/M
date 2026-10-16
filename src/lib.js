// Reusable component builders. Each draws into a Builder `b` around the local origin.
import * as THREE from 'three';

const PI = Math.PI;

/** Drive wheel with tread, hub and motor can. Axis along X; `side` is -1 (left) or +1 (right). */
export function wheel(b, { r = 0.62, w = 0.46, side = 1 } = {}) {
  b.cyl(r, r, w, { m: 'rubber', rot: [0, 0, PI / 2], seg: 36 });
  // tread blocks
  b.radial(new THREE.BoxGeometry(w * 0.96, 0.07, 0.16), 28, r + 0.015, { axis: 'x', m: 'rubber' });
  b.cyl(r * 0.62, r * 0.62, w * 1.02, { m: 'metal', rot: [0, 0, PI / 2], seg: 30 });
  b.cyl(r * 0.2, r * 0.2, w * 1.1, { m: 'accent', rot: [0, 0, PI / 2], seg: 16, e: false });
  b.radial(new THREE.BoxGeometry(w * 1.04, 0.05, r * 0.38), 6, r * 0.38, { axis: 'x', m: 'steel', e: false });
  // motor housing on the inboard side
  b.cyl(r * 0.5, r * 0.5, 0.5, { m: 'dark', rot: [0, 0, PI / 2], at: [-side * (w / 2 + 0.25), 0, 0], seg: 22 });
}

/** Roller brush lying along X: core + ridged bristle rows + end caps. */
export function roller(b, { r = 0.38, len = 3.3, rows = 22, m = 'bristle', cap = true } = {}) {
  b.cyl(r * 0.62, r * 0.62, len, { m: 'metal', rot: [0, 0, PI / 2], seg: 24 });
  b.radial(new THREE.BoxGeometry(len * 0.96, r * 0.62, 0.06), rows, r * 0.68, { axis: 'x', m });
  if (cap) {
    for (const s of [-1, 1]) {
      b.cyl(r * 0.8, r * 0.8, 0.14, { m: 'steel', rot: [0, 0, PI / 2], at: [s * (len / 2 + 0.05), 0, 0], seg: 24 });
      b.cyl(r * 0.26, r * 0.26, 0.28, { m: 'dark', rot: [0, 0, PI / 2], at: [s * (len / 2 + 0.2), 0, 0], seg: 14, e: false });
    }
  }
}

/** Side brush: hub + sweeping tufts splayed outward. */
export function sideBrush(b, { r = 0.8, tufts = 16 } = {}) {
  b.cyl(0.2, 0.26, 0.28, { m: 'steel', seg: 20 });
  b.cyl(0.1, 0.1, 0.5, { m: 'dark', at: [0, 0.3, 0], seg: 12, e: false });
  b.radial(new THREE.CapsuleGeometry(0.05, r - 0.1, 3, 6), tufts, r * 0.5, { axis: 'y', m: 'bristle', at: [0, -0.05, 0], rot: [0, 0, 0] });
  b.radial(new THREE.CapsuleGeometry(0.035, r * 0.8, 3, 6), tufts, r * 0.42, { axis: 'y', m: 'bristle', at: [0, -0.18, 0], phase: 0.2 });
  // three arms
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    b.box(r * 0.8, 0.07, 0.16, { m: 'accent', at: [Math.cos(a) * r * 0.4, 0.12, Math.sin(a) * r * 0.4], rot: [0, -a, 0], e: false });
  }
}

/** Squeegee: bracket + two rubber blades (front and rear) spanning `w` along X. */
export function squeegee(b, { w = 3.9 } = {}) {
  b.box(w, 0.2, 0.4, { m: 'steel', r: 0.05, at: [0, 0.25, 0] });
  b.box(w + 0.1, 0.18, 0.1, { m: 'dark', at: [0, 0.38, 0.1], e: false });
  b.box(w * 0.96, 0.46, 0.05, { m: 'rubber', at: [0, -0.02, 0.2], rot: [-0.18, 0, 0] });
  b.box(w * 0.96, 0.46, 0.05, { m: 'rubber', at: [0, -0.02, -0.2], rot: [0.18, 0, 0] });
  // wing-nut clamps
  for (const s of [-1, 1]) b.cyl(0.1, 0.1, 0.3, { m: 'accent', at: [s * (w / 2 - 0.2), 0.5, 0], seg: 12, e: false });
  // vacuum hose barb
  b.cyl(0.14, 0.14, 0.5, { m: 'dark', at: [0, 0.58, 0], seg: 14 });
}

/**
 * Water tank: glass shell + fill + cap + level ticks.
 * `kind` is 'clean' or 'dirty'. Fill is 0..1.
 */
export function tank(b, { w, h, d, kind = 'clean', fill = 0.7, cap = true } = {}) {
  const clean = kind === 'clean';
  b.box(w, h, d, { m: clean ? 'tankCl' : 'tankDi', r: 0.16, ec: 'accent', eo: 0.7 });
  const fh = h * fill;
  const liquid = b.box(w - 0.12, fh, d - 0.12, { m: clean ? 'water' : 'sludge', r: 0.1, at: [0, -h / 2 + fh / 2 + 0.05, 0], e: false });
  liquid.userData.liquid = true;
  // level ticks on the front face
  for (let i = 1; i <= 4; i++) {
    b.box(0.34, 0.025, 0.02, { m: 'steel', at: [w / 2 - 0.3, -h / 2 + (h * i) / 5, d / 2 + 0.01], e: false });
  }
  if (cap) {
    b.cyl(0.26, 0.26, 0.18, { m: 'dark', at: [-w * 0.28, h / 2 + 0.09, 0], seg: 20 });
    b.cyl(0.18, 0.18, 0.1, { m: 'accent', at: [-w * 0.28, h / 2 + 0.2, 0], seg: 16, e: false });
  }
  // carry handle recess
  b.box(w * 0.38, 0.12, 0.1, { m: 'dark', at: [w * 0.18, h / 2 - 0.02, d / 2 + 0.02], e: false });
}

/** 2D LiDAR puck: base, smoked window ring, spinning scan head. */
export function lidar(b, { r = 0.42, h = 0.46 } = {}) {
  b.cyl(r, r * 1.06, h * 0.35, { m: 'dark', at: [0, -h * 0.3, 0], seg: 32 });
  const ring = b.cyl(r * 0.94, r * 0.94, h * 0.42, { m: 'lens', at: [0, h * 0.0, 0], seg: 32 });
  ring.userData.spin = 1.4;
  b.cyl(r * 0.8, r * 0.8, h * 0.18, { m: 'steel', at: [0, h * 0.3, 0], seg: 32 });
  b.cyl(r * 0.12, r * 0.12, h * 0.1, { m: 'accent', at: [0, h * 0.42, 0], seg: 12, e: false });
  // emitter / receiver windows
  b.box(0.18, 0.12, 0.1, { m: 'accent', at: [0, 0, r * 0.95], e: false });
}

/** Camera module: housing + lens barrel + glass. Faces +Z. */
export function camera(b, { w = 0.7, h = 0.42, d = 0.32, lens = 0.13, ring = true } = {}) {
  b.box(w, h, d, { m: 'dark', r: 0.08 });
  b.box(w * 0.88, h * 0.78, 0.04, { m: 'glass', at: [0, 0, d / 2 + 0.005], r: 0.03, e: false });
  b.cyl(lens, lens * 1.15, 0.12, { m: 'lens', rot: [PI / 2, 0, 0], at: [0, 0, d / 2 + 0.06], seg: 20 });
  if (ring) b.tor(lens * 1.3, 0.018, { m: 'accent', at: [0, 0, d / 2 + 0.11], seg: 24, e: false });
}

/** Lithium battery pack with strap handle and label. */
export function battery(b, { w = 2.3, h = 0.85, d = 1.9 } = {}) {
  b.box(w, h, d, { m: 'battery', r: 0.1 });
  b.box(w * 0.72, 0.04, d * 0.5, { m: 'accent', at: [0, h / 2 + 0.01, -d * 0.12], e: false });
  b.box(w * 0.5, 0.06, 0.12, { m: 'metal', at: [0, h / 2 + 0.08, d * 0.34], e: false });
  // cell seams
  for (let i = -2; i <= 2; i++) b.box(0.025, h * 0.96, d * 1.005, { m: 'dark', at: [i * (w / 5.5), 0, 0], e: false });
  // terminals
  for (const s of [-1, 1]) b.cyl(0.1, 0.1, 0.16, { m: s > 0 ? 'red' : 'dark', at: [s * w * 0.32, h / 2 + 0.08, -d * 0.4], seg: 14, e: false });
}

/** Printed circuit board with chips, connectors and a trace glow. */
export function pcb(b, { w = 2.4, d = 2.2, vertical = false } = {}) {
  const g = new THREE.Group();
  b.add(g);
  const sub = { parent: g };
  b.box(w, 0.08, d, { m: 'pcb', ...sub });
  const chips = [[-0.5, 0.35, 0.5, 0.5], [0.45, 0.3, 0.4, 0.4], [0.1, -0.5, 0.7, 0.35], [-0.6, -0.55, 0.3, 0.3], [0.7, 0.6, 0.35, 0.25]];
  for (const [x, z, cw, cd] of chips) b.box(cw * (w / 2.4), 0.09, cd * (d / 2.2), { m: 'chip', at: [x * (w / 2.4), 0.085, z * (d / 2.2)], e: false, ...sub });
  for (let i = 0; i < 6; i++) b.box(0.1, 0.12, 0.16, { m: 'copper', at: [-w / 2 + 0.12 + i * 0.13, 0.1, d / 2 - 0.12], e: false, ...sub });
  b.box(0.5, 0.18, 0.28, { m: 'steel', at: [w / 2 - 0.35, 0.12, -d / 2 + 0.25], e: false, ...sub });
  b.box(w * 0.6, 0.012, 0.03, { m: 'accent', at: [0, 0.05, 0.02], e: false, ...sub });
  b.box(0.03, 0.012, d * 0.5, { m: 'accent', at: [-0.2, 0.05, 0], e: false, ...sub });
  if (vertical) g.rotation.x = PI / 2;
  return g;
}

/** Blower/vacuum motor: volute, rotor can and exhaust. */
export function turbine(b, { r = 0.52, h = 0.8 } = {}) {
  b.cyl(r, r, h, { m: 'dark', seg: 32 });
  b.cyl(r * 0.92, r * 0.92, 0.1, { m: 'metal', at: [0, h / 2 + 0.05, 0], seg: 32 });
  const fan = new THREE.Group();
  b.add(fan);
  b.radial(new THREE.BoxGeometry(r * 0.78, 0.08, 0.05), 11, r * 0.4, { axis: 'y', m: 'steel', parent: fan, at: [0, h / 2 + 0.12, 0], e: false });
  fan.userData.spin = 4;
  b.cyl(r * 0.18, r * 0.18, 0.12, { m: 'accent', at: [0, h / 2 + 0.16, 0], seg: 12, e: false });
  b.cyl(0.18, 0.18, 0.7, { m: 'metal', rot: [0, 0, PI / 2], at: [r * 0.95, 0, 0], seg: 16 });
  b.cyl(r * 0.55, r * 0.55, 0.3, { m: 'rubber', at: [0, -h / 2 - 0.15, 0], seg: 20 });
}

/** Water pump with solenoid valve and hose barbs. */
export function pump(b) {
  b.cyl(0.24, 0.24, 0.72, { m: 'dark', seg: 22 });
  b.cyl(0.26, 0.26, 0.08, { m: 'metal', at: [0, 0.4, 0], seg: 22 });
  b.box(0.42, 0.34, 0.34, { m: 'metal', r: 0.05, at: [0.42, -0.15, 0] });
  b.cyl(0.14, 0.14, 0.26, { m: 'accent', at: [0.42, 0.14, 0], seg: 14, e: false });
  b.cyl(0.07, 0.07, 0.5, { m: 'steel', rot: [0, 0, PI / 2], at: [0.82, -0.15, 0], seg: 10, e: false });
  b.cyl(0.07, 0.07, 0.4, { m: 'steel', at: [0, -0.5, 0], seg: 10, e: false });
  b.tor(0.18, 0.03, { m: 'rubber', rot: [PI / 2, 0, 0], at: [-0.3, -0.35, 0], arc: PI * 1.2, e: false });
}

/** Pleated cylindrical air filter. */
export function pleatedFilter(b, { r = 0.5, h = 0.8 } = {}) {
  b.cyl(r, r, h, { m: 'fabric', seg: 36 });
  b.radial(new THREE.BoxGeometry(0.05, h * 0.94, 0.1), 28, r + 0.005, { axis: 'y', m: 'fabric', e: false });
  for (const s of [-1, 1]) b.cyl(r * 1.08, r * 1.08, 0.1, { m: 'dark', at: [0, s * (h / 2 + 0.03), 0], seg: 36 });
  b.cyl(r * 0.2, r * 0.2, h * 1.05, { m: 'dark', seg: 14, e: false });
}

/** Emergency stop: yellow collar, red mushroom head. */
export function eStop(b, { r = 0.3 } = {}) {
  b.cyl(r * 1.25, r * 1.35, 0.1, { m: 'yellow', seg: 28 });
  b.cyl(r * 0.7, r * 0.8, 0.16, { m: 'dark', at: [0, 0.12, 0], seg: 24 });
  b.cyl(r, r * 0.92, 0.2, { m: 'red', at: [0, 0.3, 0], seg: 28 });
  b.sph(r, { m: 'red', at: [0, 0.4, 0], cap: PI / 2.2, seg: 24, e: false });
}

/** Little round caster with fork. */
export function caster(b, { r = 0.3 } = {}) {
  b.cyl(r, r, 0.22, { m: 'rubber', rot: [0, 0, PI / 2], seg: 24 });
  b.cyl(r * 0.5, r * 0.5, 0.26, { m: 'metal', rot: [0, 0, PI / 2], seg: 16 });
  for (const s of [-1, 1]) b.box(0.05, r * 1.7, 0.22, { m: 'steel', at: [s * 0.17, r * 0.6, 0], e: false });
  b.cyl(0.18, 0.18, 0.12, { m: 'steel', at: [0, r * 1.5, 0], seg: 16 });
}

/** Charging contact plate: two copper pads on a dark base. */
export function chargePads(b, { w = 1.4 } = {}) {
  b.box(w, 0.5, 0.16, { m: 'dark', r: 0.04 });
  for (const s of [-1, 1]) b.box(0.32, 0.26, 0.06, { m: 'copper', at: [s * w * 0.28, 0, -0.1], e: false });
  b.box(0.12, 0.12, 0.04, { m: 'accent', at: [0, 0, -0.09], e: false });
}
