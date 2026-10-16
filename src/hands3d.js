// Holographic hands inside the 3D scene. Every tracked hand is drawn as glowing joints and
// bones with real depth, a pinch becomes a bright orb, a beam runs from the pinch to the part
// you are pointing at (with a ring where it lands), and two hands get a tether with a live
// "% open" readout. It all lives in the three.js scene, so it gets the same lighting, glow and
// camera as the robot.
import * as THREE from 'three';

const LINKS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];
const TIPS = new Set([4, 8, 12, 16, 20]);
const PALM = [0, 5, 9, 13, 17];
const D = 12; // hands float this far in front of the camera
const UP = new THREE.Vector3(0, 1, 0);

const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const dummy = new THREE.Object3D();
const q = new THREE.Quaternion();

export class Hands3D {
  constructor(stage, labelEl) {
    this.stage = stage;
    this.label = labelEl;
    this.enabled = true;
    this.running = false;
    this.frame = null;
    this.t = 0;
    this.n = 0;
    this.w3 = 10;
    this.hit = null;
    this._style = '';

    this.group = new THREE.Group(); // lives in camera space
    this.group.visible = false;
    stage.camera.add(this.group);
    this.world = new THREE.Group(); // beam and ring live in the scene
    this.world.visible = false;
    stage.scene.add(this.world);

    const mat = (opacity, side) => new THREE.MeshBasicMaterial({
      transparent: true, opacity, depthTest: false, depthWrite: false, toneMapped: false, fog: false, side: side || THREE.FrontSide,
    });
    this.m = { joint: mat(0.95), bone: mat(0.8), palm: mat(0.16, THREE.DoubleSide), orb: mat(0.95), tether: mat(0.85), beam: mat(0.65), ring: mat(0.95, THREE.DoubleSide), dot: mat(0.9, THREE.DoubleSide) };

    const sph = new THREE.SphereGeometry(1, 14, 10);
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
    this.hands = [0, 1].map(() => {
      const joints = new THREE.InstancedMesh(sph, this.m.joint, 21);
      const bones = new THREE.InstancedMesh(cyl, this.m.bone, LINKS.length);
      const palmGeo = new THREE.BufferGeometry();
      palmGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12 * 3), 3));
      const palm = new THREE.Mesh(palmGeo, this.m.palm);
      const orb = new THREE.Mesh(sph, this.m.orb);
      for (const o of [joints, bones, palm, orb]) { o.frustumCulled = false; o.renderOrder = 60; o.visible = false; this.group.add(o); }
      return { joints, bones, palm, orb, pts: Array.from({ length: 21 }, () => new THREE.Vector3()), init: false, palmC: new THREE.Vector3() };
    });

    this.tether = new THREE.Mesh(cyl, this.m.tether);
    this.tether.frustumCulled = false; this.tether.renderOrder = 60; this.tether.visible = false;
    this.group.add(this.tether);

    this.beam = new THREE.Mesh(cyl, this.m.beam);
    this.beam.frustumCulled = false; this.beam.renderOrder = 61;
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 1, 40), this.m.ring);
    this.dot = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), this.m.dot);
    for (const o of [this.ring, this.dot]) { o.frustumCulled = false; o.renderOrder = 61; }
    this.world.add(this.beam, this.ring, this.dot);

    stage.hooks.push((dt) => this.update(dt));
  }

  /** Landmark (0..1 in the camera image) to screen (0..1). Replaced by the page when a backdrop crops the video. */
  map(x, y) { return this.stage.backdropMap(x, y); }

  setFrame(f) { this.frame = f; this.t = performance.now(); }

  // Holo look: additive glow that blooms. Studio look: solid darker colours that read on a light floor.
  _restyle() {
    const st = this.stage;
    const key = st.look + st.accent.getHexString();
    if (key === this._style) return;
    this._style = key;
    const holo = st.look === 'holo';
    const a = st.accent;
    const blend = holo ? THREE.AdditiveBlending : THREE.NormalBlending;
    const set = (m, color, opacity) => { m.color.copy(color); m.opacity = opacity; m.blending = blend; m.needsUpdate = true; };
    const glow = a.clone().multiplyScalar(1.7);
    const solid = a.clone().multiplyScalar(0.8);
    const white = new THREE.Color(1.5, 1.5, 1.5);
    const ink = new THREE.Color(0x0e2433);
    set(this.m.joint, holo ? white : ink, 0.95);
    set(this.m.bone, holo ? glow : solid, holo ? 0.8 : 0.9);
    set(this.m.palm, holo ? glow : solid, holo ? 0.16 : 0.14);
    set(this.m.orb, holo ? white : a, 0.95);
    set(this.m.tether, holo ? glow : solid, 0.85);
    set(this.m.beam, holo ? glow : solid, holo ? 0.65 : 0.7);
    set(this.m.ring, holo ? glow : solid, 0.95);
    set(this.m.dot, holo ? glow : solid, 0.9);
  }

  _toCam(nx, ny, z, out) {
    const [sx, sy] = this.map(nx, ny);
    out.set(sx * 2 - 1, -(sy * 2 - 1), 0.5).applyMatrix4(this.stage.camera.projectionMatrixInverse);
    out.multiplyScalar(D / -out.z);
    out.z += -(z || 0) * this.w3 * 0.9; // MediaPipe depth: negative is nearer the camera
    return out;
  }

  // Lets _bone write a single mesh's matrix directly.
  _sink(mesh) {
    mesh.matrixAutoUpdate = false;
    return { setMatrixAt: (_i, m) => { mesh.matrix.copy(m); mesh.matrixWorldNeedsUpdate = true; } };
  }

  _bone(mesh, i, a, b, r) {
    tmp.subVectors(b, a);
    const len = tmp.length();
    dummy.position.copy(a).addScaledVector(tmp, 0.5);
    q.setFromUnitVectors(UP, tmp.normalize());
    dummy.quaternion.copy(q);
    dummy.scale.set(r, Math.max(len, 1e-4), r);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  update(dt) {
    const f = this.frame;
    // "Fresh" means a hand frame arrived recently, measured against how slowly this machine is rendering.
    const now = performance.now();
    const realDt = this._lastUpd ? now - this._lastUpd : 16;
    this._lastUpd = now;
    const live = this.running && this.enabled && f && now - this.t < 400 + realDt * 3;
    this.group.visible = !!live;
    if (!live) {
      this.world.visible = false;
      if (this.label) this.label.hidden = true;
      return;
    }
    this._restyle();
    const st = this.stage, cam = st.camera;
    // full width of the view at the hand distance, in world units
    tmp.set(1, 0, 0.5).applyMatrix4(cam.projectionMatrixInverse);
    tmp.multiplyScalar(D / -tmp.z);
    this.w3 = Math.max(1, tmp.x * 2);
    const k = 1 - Math.exp(-dt * 30); // light smoothing so jitter does not shimmer
    const jr = this.w3 * 0.0042;

    this.hands.forEach((h, hi) => {
      const src = f.hands[hi];
      const on = !!src;
      h.joints.visible = h.bones.visible = h.palm.visible = on;
      if (!on) { h.init = false; h.orb.visible = false; return; }
      for (let i = 0; i < 21; i++) {
        const p = src.lm[i];
        this._toCam(p[0], p[1], p[2], tmp2);
        if (!h.init) h.pts[i].copy(tmp2); else h.pts[i].lerp(tmp2, k);
        const r = jr * (TIPS.has(i) ? 1.5 : i === 0 ? 1.7 : 1);
        dummy.position.copy(h.pts[i]);
        dummy.quaternion.identity();
        dummy.scale.setScalar(r);
        dummy.updateMatrix();
        h.joints.setMatrixAt(i, dummy.matrix);
      }
      h.init = true;
      h.joints.instanceMatrix.needsUpdate = true;
      LINKS.forEach(([a, b], i) => this._bone(h.bones, i, h.pts[a], h.pts[b], jr * 0.42));
      h.bones.instanceMatrix.needsUpdate = true;
      // translucent palm: a fan from the wrist
      const pos = h.palm.geometry.attributes.position;
      const fan = [[0, 1, 5], [0, 5, 9], [0, 9, 13], [0, 13, 17]];
      fan.forEach((tri, ti) => tri.forEach((idx, vi) => pos.setXYZ(ti * 3 + vi, h.pts[idx].x, h.pts[idx].y, h.pts[idx].z)));
      pos.needsUpdate = true;
      h.palmC.set(0, 0, 0);
      PALM.forEach((i) => h.palmC.add(h.pts[i]));
      h.palmC.multiplyScalar(1 / PALM.length);
      // pinch orb: pulses while you hold the pinch
      const pinching = src.shape === 'pinch';
      h.orb.visible = pinching;
      if (pinching) {
        h.orb.position.copy(h.pts[4]).add(h.pts[8]).multiplyScalar(0.5);
        const pulse = 1 + 0.18 * Math.sin(performance.now() / 90);
        h.orb.scale.setScalar(this.w3 * 0.022 * pulse);
      }
    });

    // two hands: a tether between the palms, with the suit's openness as a readout
    const two = f.mode === 'two' && f.hands.length === 2;
    this.tether.visible = two;
    if (two) {
      this._bone(this._sink(this.tether), 0, this.hands[0].palmC, this.hands[1].palmC, this.w3 * 0.0035);
      if (this.label) {
        tmp.copy(this.hands[0].palmC).add(this.hands[1].palmC).multiplyScalar(0.5);
        tmp.applyMatrix4(cam.projectionMatrix);
        this.label.hidden = false;
        this.label.style.transform = `translate(${((tmp.x * 0.5 + 0.5) * st.W).toFixed(1)}px, ${((-tmp.y * 0.5 + 0.5) * st.H).toFixed(1)}px) translate(-50%, -140%)`;
        this.label.textContent = `${Math.round(st.eT * 100)}% open`;
      }
    } else if (this.label) this.label.hidden = true;

    this._beam(f, two, dt);
  }

  // Beam from the pinch to the part under the cursor, with a ring where it lands.
  _beam(f, two, dt) {
    const st = this.stage;
    const c = f.cursor;
    const src = f.hands[0];
    if (two || !c || !src || !st._hoverAt) { this.world.visible = false; return; }
    const rect = st.canvas.getBoundingClientRect();
    const [sx, sy] = this.map(c.x, c.y);
    if ((this.n++ & 1) === 0) this.hit = st.pickPoint(rect.left + sx * rect.width, rect.top + sy * rect.height);
    const hit = this.hit;
    if (!hit) { this.world.visible = false; return; }
    const h = this.hands[0];
    // the ray leaves the wrist, so it reads as pointing out of your hand rather than along the line of sight
    const from = st.camera.localToWorld(tmp2.copy(h.pts[0]));
    const to = hit.point;
    const dist = st.camera.position.distanceTo(to);
    this.world.visible = true;
    this._bone(this._sink(this.beam), 0, from, to, dist * 0.0022);
    const pinching = c.pinching;
    const s = dist * (pinching ? 0.014 : 0.019) * (1 + 0.06 * Math.sin(performance.now() / 160));
    this.ring.position.copy(to);
    this.ring.quaternion.copy(st.camera.quaternion);
    this.ring.scale.setScalar(s);
    this.dot.position.copy(to);
    this.dot.quaternion.copy(st.camera.quaternion);
    this.dot.scale.setScalar(dist * (pinching ? 0.03 : 0.012));
  }
}
