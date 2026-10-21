// How the robots look in the race: a glossy race paint, glowing LED strips, and per-race extras
// (racing numbers, headlights with a beam, tail lights that flare on the brake, underglow that
// takes the colour of the drift tier). The paint belongs to the robot, so it is applied once when
// the model is built; the extras belong to a race (the number and role change), so they are made
// per scene and removed when the scene is disposed.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { cached, canvasTexWH, dotTex } from './textures.js';
import { TIER_RGB } from './fx.js';

// per robot: the paint, and the colour of its stripes, numbers and underglow
export const LIVERY = {
  phantas: { shell: 0x1b4a70, trim: 0x0c1621, accent: [0.21, 0.94, 1.0], css: '#35f0ff' },
  cc1pro: { shell: 0x6a3f22, trim: 0x15100c, accent: [1.0, 0.69, 0.18], css: '#ffb02e' },
};
const liveryOf = (id) => LIVERY[id] || LIVERY.phantas;

/** Race paint and night-time LED brightness, on the materials shared by one robot's parts. */
export function applyPaint(shared, id) {
  const L = liveryOf(id);
  const shell = shared.get('shell');
  if (shell) { // deep metallic paint under a hard clearcoat: it picks up the club's neon in the reflections
    shell.color.set(L.shell);
    Object.assign(shell, { metalness: 0.6, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.9 });
  }
  const dk = shared.get('shellDk');
  if (dk) { dk.color.set(L.trim); Object.assign(dk, { metalness: 0.4, roughness: 0.34, clearcoat: 0.6, envMapIntensity: 1.3 }); }
  const trim = shared.get('trim');
  if (trim) { trim.color.set(0x10151c); trim.envMapIntensity = 1.2; }
  // LEDs, accent lines and screens run brighter than white, so bloom makes them glow
  const glow = (key, k) => { const m = shared.get(key); if (m && m.emissive) m.emissiveIntensity = k; };
  glow('led', 3.6);
  glow('accent', 2.0);
  glow('screen', 2.4);
  glow('red', 1.8);
  glow('yellow', 1.2);
}

// ───────────────────────── textures ─────────────────────────

const FONT = '"Arial Black", Impact, "Helvetica Neue", Arial, sans-serif';

/** A round number badge: dark disc, accent ring, white number. */
const badgeTex = (n, css) => canvasTexWH(256, 256, (g, w) => {
  g.clearRect(0, 0, w, w);
  g.fillStyle = 'rgba(8,12,18,0.88)';
  g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2); g.fill();
  g.strokeStyle = css; g.lineWidth = 14; g.shadowColor = css; g.shadowBlur = 14;
  g.beginPath(); g.arc(128, 128, 104, 0, Math.PI * 2); g.stroke();
  g.shadowBlur = 0;
  g.fillStyle = '#ffffff';
  g.font = `900 112px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(n, 128, 136);
}, { wrap: false });

/** A racing stripe: a thick accent bar over a thin white one, fading out at both ends. */
const stripeTexFor = (css) => canvasTexWH(512, 64, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.fillStyle = css; g.fillRect(0, 6, w, 36);
  g.fillStyle = '#ffffff'; g.fillRect(0, 48, w, 8);
  const mask = g.createLinearGradient(0, 0, w, 0); // multiply the alpha by a fade at both ends
  mask.addColorStop(0, 'rgba(0,0,0,0)'); mask.addColorStop(0.12, 'rgba(0,0,0,1)');
  mask.addColorStop(0.88, 'rgba(0,0,0,1)'); mask.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = mask; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
}, { wrap: false });

const glowRectTex = () => canvasTexWH(128, 128, (g, w) => {
  g.clearRect(0, 0, w, w);
  const gr = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)');
  gr.addColorStop(0.55, 'rgba(255,255,255,0.4)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, w, w);
}, { srgb: false, wrap: false });

// ───────────────────────── geometry helpers ─────────────────────────

const _o = new THREE.Object3D();
/** A plane of w x h placed at (x, y, z) and rotated (euler XYZ), as plain geometry ready to merge. */
function plane(w, h, x, y, z, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.PlaneGeometry(w, h);
  _o.position.set(x, y, z);
  _o.rotation.set(rx, ry, rz);
  _o.scale.set(1, 1, 1);
  _o.updateMatrix();
  return g.applyMatrix4(_o.matrix);
}

const BEAM = {
  vertex: 'attribute float aT; varying vec3 vN; varying vec3 vV; varying float vT;\nvoid main() {\n  vT = aT;\n  vec4 mv = modelViewMatrix * vec4(position, 1.0);\n  vN = normalize(normalMatrix * normal);\n  vV = normalize(-mv.xyz);\n  gl_Position = projectionMatrix * mv;\n}',
  // brightest at the lens, fading along its length and toward the silhouette edges
  fragment: 'uniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vV; varying float vT;\nvoid main() {\n  float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);\n  float a = uOpacity * pow(1.0 - vT, 1.5) * smoothstep(0.0, 0.08, vT) * edge;\n  gl_FragColor = vec4(uColor * a, a);\n}',
};

/**
 * The extras for one robot in one race. model: from carModel (with .car and .dims); id: the robot
 * id (for its colours); number: the racing number. Returns { group, update(state) }; the group is
 * a child of the car, so it follows the robot. Call dispose() to take it off the car again.
 */
export function robotExtras(model, { id, number }) {
  const L = liveryOf(id), d = model.dims;
  const group = new THREE.Group();
  const accent = new THREE.Color(...L.accent);
  const dot = cached('dot', dotTex);
  const lifetime = []; // materials made here, to free them again

  // ── racing numbers and a stripe, lit like the paint they sit on ──
  const badge = cached(`badge:${number}:${L.css}`, () => badgeTex(number, L.css));
  const stripe = cached(`stripe:${L.css}`, () => stripeTexFor(L.css));
  const decalMat = (map, k) => { const m = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: k, transparent: true, roughness: 0.35, metalness: 0, polygonOffset: true, polygonOffsetFactor: -3, depthWrite: false, side: THREE.DoubleSide }); lifetime.push(m); return m; };
  const side = d.sideX + 0.03;
  const badgeSize = Math.min(d.sideLen * 0.5, d.sideH * 0.62);
  const badges = mergeGeometries([1, -1].map((s) => plane(badgeSize, badgeSize, s * side, d.sideY + d.sideH * 0.06, d.sideZ + d.sideLen * 0.2, 0, s * Math.PI / 2, 0))
    .concat([plane(badgeSize * 1.5, badgeSize * 1.5, 0, d.roofY + 0.04, d.roofZ + d.roofD * 0.14, -Math.PI / 2, 0, Math.PI)])); // roof: reads from behind
  const badgeMesh = new THREE.Mesh(badges, decalMat(badge, 0.32));
  const stripes = mergeGeometries([1, -1].map((s) => plane(d.sideLen * 0.72, d.sideLen * 0.09, s * side, d.sideY - d.sideH * 0.2, d.sideZ - d.sideLen * 0.1, 0, s * Math.PI / 2, 0)));
  const stripeMesh = new THREE.Mesh(stripes, decalMat(stripe, 0.9));
  group.add(badgeMesh, stripeMesh);

  // ── headlights: a bright lens, a halo, a soft beam and a pool of light on the road ──
  const lx = d.sideX * 0.58, ly = d.frontY + 0.42, lz = d.frontZ + 0.03;
  const lens = new THREE.Mesh(
    mergeGeometries([plane(1.1, 0.34, lx, ly, lz), plane(1.1, 0.34, -lx, ly, lz)]),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 4.0, 3.4), side: THREE.DoubleSide, toneMapped: false }),
  );
  lifetime.push(lens.material);
  const beamGeo = (x) => {
    // narrow at the lens, wide far ahead; aT is 0 at the lens and 1 at the far end (set before the cone is turned)
    const g = new THREE.CylinderGeometry(4.6, 0.3, 16, 20, 1, true);
    const t = new Float32Array(g.attributes.position.count);
    for (let i = 0; i < t.length; i++) t[i] = g.attributes.position.getY(i) / 16 + 0.5;
    g.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1));
    const m = new THREE.Matrix4().makeRotationX(Math.PI / 2 + 0.05);
    m.setPosition(x, ly - 0.5, lz + 8);
    return g.applyMatrix4(m);
  };
  const beam = new THREE.Mesh(
    mergeGeometries([beamGeo(lx), beamGeo(-lx)]),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.FrontSide,
      uniforms: { uColor: { value: new THREE.Color(1.0, 0.93, 0.78) }, uOpacity: { value: 0.2 } },
      vertexShader: BEAM.vertex, fragmentShader: BEAM.fragment,
    }),
  );
  lifetime.push(beam.material);
  beam.frustumCulled = false;
  beam.renderOrder = 4;
  const pool = new THREE.Mesh(
    mergeGeometries([plane(9, 17, 0, 0.07, lz + 10.5, -Math.PI / 2, 0, 0)]),
    new THREE.MeshBasicMaterial({ map: dot, color: new THREE.Color(1.5, 1.35, 1.1), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  );
  lifetime.push(pool.material);
  pool.renderOrder = 2;
  const halo = (list, color, size, opacity) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(list, 3));
    const m = new THREE.PointsMaterial({ map: dot, color, size, sizeAttenuation: true, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    lifetime.push(m);
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    p.renderOrder = 4;
    return p;
  };
  const headHalo = halo([lx, ly, lz + 0.3, -lx, ly, lz + 0.3], 0xfff0cc, 2.2, 0.8);

  // ── tail lights: two red bars that flare when the brake is on ──
  const tx = d.sideX * 0.5, ty = d.rearY + 0.35, tz = d.rearZ - 0.03;
  const tail = new THREE.Mesh(
    mergeGeometries([plane(1.2, 0.3, tx, ty, tz, 0, Math.PI), plane(1.2, 0.3, -tx, ty, tz, 0, Math.PI)]),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 0.1, 0.07), side: THREE.DoubleSide, toneMapped: false }),
  );
  lifetime.push(tail.material);
  const tailHalo = halo([tx, ty, tz - 0.3, -tx, ty, tz - 0.3], 0xff2a1a, 1.5, 0.35);

  // ── underglow: a soft pool of light under the robot, in its accent colour ──
  const glow = new THREE.Mesh(
    mergeGeometries([plane(d.sideX * 3.2, d.footL * 1.3, 0, 0.065, (d.frontZ + d.rearZ) / 2, -Math.PI / 2, 0, 0)]),
    new THREE.MeshBasicMaterial({ map: cached('glowRect', glowRectTex), color: accent.clone(), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  );
  lifetime.push(glow.material);
  glow.renderOrder = 2;

  group.add(lens, beam, pool, headHalo, tail, tailHalo, glow);
  model.car.add(group);

  const tint = new THREE.Color(), hot = new THREE.Color(1, 0.7, 0.35);
  return {
    group,
    /** state: { brake: bool, speed: 0..1, tier: 0..3, boost: 0..1, time } */
    update({ brake = false, speed = 0, tier = 0, boost = 0, time = 0 }) {
      tail.material.color.setRGB(1.3, 0.1, 0.07).multiplyScalar(brake ? 3.0 : 1);
      tailHalo.material.opacity = brake ? 0.85 : 0.35;
      // underglow: the robot's accent, then the drift tier's colour while charging, then white-hot in a boost
      if (tier > 0) tint.setRGB(...TIER_RGB[tier]); else tint.copy(accent);
      if (boost > 0) tint.lerp(hot, boost);
      glow.material.color.copy(tint).multiplyScalar(1.4 + boost * 1.4);
      glow.material.opacity = 0.42 + 0.3 * speed + 0.08 * Math.sin(time * 3);
    },
    /** Take the extras off the robot and free what they use. The cached textures stay. */
    dispose() {
      model.car.remove(group);
      group.traverse((o) => o.geometry?.dispose?.());
      for (const m of lifetime) m.dispose();
    },
  };
}
