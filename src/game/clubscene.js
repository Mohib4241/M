// The racing club around the track, as three.js meshes: barrier walls with chase lights, lamps
// and their pools of light, the start gantry, pit garages, grandstands with a crowd, the clubhouse
// and control tower, floodlight masts and a lit skyline. Positions come from club.js.
//
// Everything is merged into a few meshes per material (about 30 draw calls in all), and every
// texture is drawn once and shared between laps (textures.js).
import * as THREE from 'three';
import { CLUB, rect } from './club.js';
import {
  cached, barrierTex, stripeTex, garageTex, crowdTex, windowsTex, clubGlassTex, bannerTex, signsTex, dotTex,
} from './textures.js';
import { rng } from './rng.js';
import { pointScale } from './pointscale.js';

// ───────────────────────── a batch of quads, merged into one geometry ─────────────────────────

// local corners (bottom-left, bottom-right, top-right, top-left as seen from outside) and normal
const FACE = {
  top: { n: [0, 1, 0], c: (x, y, z) => [[-x, y, -z], [-x, y, z], [x, y, z], [x, y, -z]] },
  bottom: { n: [0, -1, 0], c: (x, y, z) => [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]] },
  front: { n: [0, 0, 1], c: (x, y, z) => [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]] },
  back: { n: [0, 0, -1], c: (x, y, z) => [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]] },
  right: { n: [1, 0, 0], c: (x, y, z) => [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]] },
  left: { n: [-1, 0, 0], c: (x, y, z) => [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]] },
};
const SIDES = ['top', 'front', 'back', 'left', 'right'];

class Batch {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; }

  /** Four corners with their uvs, lit as if facing n. Wound so the face looks toward n. */
  quad(corners, uvs, n, col = [1, 1, 1]) {
    let [a, b, c, d] = corners, [ua, ub, uc, ud] = uvs;
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
    const cross = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    if (cross[0] * n[0] + cross[1] * n[1] + cross[2] * n[2] < 0) { [a, b, c, d] = [a, d, c, b]; [ua, ub, uc, ud] = [ua, ud, uc, ub]; }
    for (const [P, U] of [[a, ua], [b, ub], [c, uc], [a, ua], [c, uc], [d, ud]]) {
      this.p.push(P[0], P[1], P[2]);
      this.n.push(n[0], n[1], n[2]);
      this.uv.push(U[0], U[1]);
      this.c.push(col[0], col[1], col[2]);
    }
  }

  /** A box standing on a footprint (see club.js rect), from height y0 to y1. */
  box(rc, y0, y1, { only = SIDES, uv = {}, col = [1, 1, 1] } = {}) {
    const hx = rc.w / 2, hz = rc.d / 2, hy = (y1 - y0) / 2, cy = (y0 + y1) / 2;
    for (const name of only) {
      const f = FACE[name];
      const corners = f.c(hx, hy, hz).map(([lx, ly, lz]) => [rc.x + rc.ux * lx + rc.vx * lz, cy + ly, rc.z + rc.uz * lx + rc.vz * lz]);
      const nrm = [f.n[0] * rc.ux + f.n[2] * rc.vx, f.n[1], f.n[0] * rc.uz + f.n[2] * rc.vz];
      const [u0, v0, u1, v1] = uv[name] || [0, 0, 1, 1];
      this.quad(corners, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], nrm, col);
    }
  }

  get empty() { return this.p.length === 0; }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    return g;
  }
}

const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.05, side: THREE.DoubleSide, ...o });
const basic = (o) => new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false, ...o });

// ───────────────────────── the club ─────────────────────────

/**
 * Build the club for one road. Returns { group, update(time) }; add the group to the scene. Its
 * geometry and materials are freed with the scene; the textures are shared and stay.
 */
export function buildClub(road, layout) {
  const group = new THREE.Group();
  const r = rng((road.seed || 1) * 31 + 7);
  const N = road.n;
  const add = (batch, material, { shadow = false, order = 0 } = {}) => {
    if (batch.empty) return null;
    const m = new THREE.Mesh(batch.geometry(), material);
    m.castShadow = shadow;
    m.receiveShadow = false;
    m.renderOrder = order;
    group.add(m);
    return m;
  };
  const halos = { amber: [], cool: [], pink: [], red: [] };
  const flash = [];
  const tint = (base, spread) => { const k = 1 + (r() - 0.5) * spread; return [base[0] * k, base[1] * k, base[2] * k]; };

  // ── barrier: concrete wall along both sides, with a coloured chase-light strip ──
  const wall = new Batch(), strip = new Batch();
  const H = CLUB.BARRIER_H;
  const P = (i, d) => { const j = i % N; return [road.x[j] + d * road.tz[j], road.z[j] - d * road.tx[j]]; };
  for (const side of [-1, 1]) {
    const include = side < 0 ? layout.barrierNeg : layout.barrierPos;
    const glow = side > 0 ? [0.2, 0.94, 1] : [1, 0.25, 0.65]; // cyan on one side, pink on the other
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      if (!include[i] || !include[j]) continue;
      const a = P(i, side * CLUB.BARRIER_IN), b = P(i + 1, side * CLUB.BARRIER_IN);
      const ao = P(i, side * CLUB.BARRIER_OUT), bo = P(i + 1, side * CLUB.BARRIER_OUT);
      const u0 = (i * road.step) / 12, u1 = ((i + 1) * road.step) / 12;
      const toRoad = [-side * road.tz[i], 0, side * road.tx[i]];
      wall.quad([[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], H, b[1]], [a[0], H, a[1]]], [[u0, 0], [u1, 0], [u1, 1], [u0, 1]], toRoad);
      wall.quad([[a[0], H, a[1]], [b[0], H, b[1]], [bo[0], H, bo[1]], [ao[0], H, ao[1]]], [[u0, 0], [u1, 0], [u1, 0.15], [u0, 0.15]], [0, 1, 0]);
      const sa = P(i, side * (CLUB.BARRIER_IN - 0.05)), sb = P(i + 1, side * (CLUB.BARRIER_IN - 0.05));
      const s0 = (i * road.step) / 2, s1 = ((i + 1) * road.step) / 2;
      strip.quad([[sa[0], 0.6, sa[1]], [sb[0], 0.6, sb[1]], [sb[0], 1.5, sb[1]], [sa[0], 1.5, sa[1]]], [[s0, 0], [s1, 0], [s1, 1], [s0, 1]], toRoad, glow);
    }
  }
  const stripeMap = cached('stripe', stripeTex);
  add(wall, std({ map: cached('barrier', barrierTex), roughness: 0.85 }), { shadow: true });
  add(strip, basic({ map: stripeMap, vertexColors: true, transparent: true, opacity: 1 }), { order: 1 });

  // ── lamps: a pole, an arm over the track, a bright head, a halo and a pool of light on the road ──
  const lampPost = new Batch(), lampHead = new Batch();
  const pools = [];
  for (const l of layout.lamps) {
    const base = rect(l.x, l.z, 0.9, 0.9, l.yaw);
    lampPost.box(base, 0, CLUB.LAMP_H, { col: [0.2, 0.22, 0.26] });
    const ax = l.x + base.vx * (CLUB.LAMP_ARM / 2), az = l.z + base.vz * (CLUB.LAMP_ARM / 2);
    lampPost.box(rect(ax, az, 0.5, CLUB.LAMP_ARM, l.yaw), CLUB.LAMP_H - 0.8, CLUB.LAMP_H, { col: [0.2, 0.22, 0.26] });
    const hx = l.x + base.vx * CLUB.LAMP_ARM, hz = l.z + base.vz * CLUB.LAMP_ARM;
    lampHead.box(rect(hx, hz, 1.4, 3.6, l.yaw), CLUB.LAMP_H - 1.8, CLUB.LAMP_H - 0.8, { col: [1.5, 1.25, 0.85] });
    halos.amber.push(hx, CLUB.LAMP_H - 1.4, hz);
    pools.push({ x: l.x + base.vx * (CLUB.LAMP_D - 9), z: l.z + base.vz * (CLUB.LAMP_D - 9) });
  }
  add(lampPost, std({ vertexColors: true, metalness: 0.5, roughness: 0.5 }), { shadow: true });
  add(lampHead, basic({ vertexColors: true }));
  if (pools.length) {
    const pool = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshBasicMaterial({ map: cached('dot', dotTex), color: 0xffb060, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      pools.length,
    );
    const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), s1 = new THREE.Vector3(1, 1, 1);
    pools.forEach((p, i) => { m.compose(new THREE.Vector3(p.x, 0.05, p.z), q, s1); pool.setMatrixAt(i, m); });
    pool.renderOrder = 2;
    pool.frustumCulled = false;
    group.add(pool);
  }

  // ── start gantry: two uprights and a beam with the club banner on both faces ──
  const g = layout.gantry;
  const beam = rect(g.x, g.z, CLUB.GANTRY_D * 2 + 2.4, 3, g.yaw);
  const steel = new Batch(), banner = new Batch();
  steel.box(beam, CLUB.BEAM_H - 2.5, CLUB.BEAM_H + 2.5, { only: ['top', 'bottom', 'left', 'right'], col: [0.17, 0.19, 0.23] });
  for (const sgn of [-1, 1]) {
    const up = rect(g.x + beam.ux * sgn * CLUB.GANTRY_D, g.z + beam.uz * sgn * CLUB.GANTRY_D, 2.4, 2.4, g.yaw);
    steel.box(up, 0, g.h, { col: [0.17, 0.19, 0.23] });
    halos.cool.push(up.x, g.h + 1, up.z);
  }
  banner.box(rect(g.x, g.z, beam.w, 3.2, g.yaw), CLUB.BEAM_H - 2.5, CLUB.BEAM_H + 2.5, { only: ['front', 'back'] });
  add(steel, std({ vertexColors: true, metalness: 0.5, roughness: 0.5 }), { shadow: true });
  add(banner, basic({ map: cached('banner', bannerTex) }));

  // ── pit garages: dark boxes, the road-facing side a lit shutter wall ──
  const garageBody = new Batch(), garageFront = new Batch();
  layout.garages.forEach((rc, k) => {
    const body = tint([0.2, 0.23, 0.29], 0.4);
    garageBody.box(rc, 0, rc.h, { only: ['top', 'back', 'left', 'right'], col: body });
    const cell = k % 4, col = cell % 2, row = Math.floor(cell / 2);
    garageFront.box(rc, 0, rc.h, { only: ['front'], uv: { front: [col * 0.5, 1 - (row + 1) * 0.5, col * 0.5 + 0.5, 1 - row * 0.5] } });
  });
  add(garageBody, std({ vertexColors: true }));
  add(garageFront, basic({ map: cached('garage', garageTex), color: new THREE.Color(1.3, 1.3, 1.3) }));

  // ── grandstands: four stepped tiers of spectators, a sign board above, camera flashes ──
  const standBody = new Batch(), crowd = new Batch(), board = new Batch();
  const T = CLUB.STAND.tiers, tierD = CLUB.STAND.d / T, tierH = CLUB.STAND.h / T;
  layout.stands.forEach((rc, k) => {
    for (let t = 0; t < T; t++) {
      const off = rc.d / 2 - (t + 0.5) * tierD;
      const tr = rect(rc.x + rc.vx * off, rc.z + rc.vz * off, rc.w, tierD, rc.yaw);
      standBody.box(tr, 0, tierH * (t + 1), { only: t === T - 1 ? ['top', 'back', 'left', 'right'] : ['top', 'left', 'right'], col: [0.34, 0.36, 0.41] });
      const u0 = r();
      crowd.box(tr, tierH * t, tierH * (t + 1), { only: ['front'], uv: { front: [u0, 0, u0 + 2, 1] } });
      for (let f = 0; f < 4; f++) { // a few camera flashes on each tier's face
        const lx = (r() - 0.5) * rc.w * 0.95, y = tierH * t + 2 + r() * (tierH - 4);
        flash.push(tr.x + tr.ux * lx + tr.vx * (tierD / 2 + 0.4), y, tr.z + tr.uz * lx + tr.vz * (tierD / 2 + 0.4), r() * 6.28);
      }
    }
    // the sign board stands on two posts above the back of the stand
    const bOff = -rc.d / 2 + 1.5;
    const bx = rc.x + rc.vx * bOff, bz = rc.z + rc.vz * bOff;
    const row = (k + 1) % 4;
    board.box(rect(bx, bz, rc.w, 1.2, rc.yaw), CLUB.STAND.h + 4, CLUB.STAND.h + 4 + rc.w / 8, { only: ['front', 'back'], uv: { front: [0, 1 - (row + 1) * 0.25, 1, 1 - row * 0.25], back: [0, 1 - (row + 1) * 0.25, 1, 1 - row * 0.25] } });
    for (const sgn of [-1, 1]) {
      standBody.box(rect(bx + rc.ux * sgn * (rc.w / 2 - 3), bz + rc.uz * sgn * (rc.w / 2 - 3), 1, 1, rc.yaw), CLUB.STAND.h, CLUB.STAND.h + 6, { col: [0.2, 0.22, 0.26] });
    }
    halos.pink.push(bx, CLUB.STAND.h + 4 + rc.w / 16, bz);
  });
  add(standBody, std({ vertexColors: true }));
  const crowdMap = cached('crowd', crowdTex);
  add(crowd, new THREE.MeshStandardMaterial({ map: crowdMap, emissiveMap: crowdMap, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 1, side: THREE.DoubleSide }));
  add(board, basic({ map: cached('signs', signsTex) }));

  // ── clubhouse and tower in the infield ──
  const ch = layout.clubhouse;
  const glass = cached('clubGlass', clubGlassTex);
  const towerMat = std({ color: 0x151b27, emissiveMap: glass, emissive: 0xffffff, emissiveIntensity: 1.0, metalness: 0.2, roughness: 0.5 });
  if (ch) {
    const house = new Batch(), trim = new Batch(), sign = new Batch();
    const wide = (w) => w / 30, high = ch.h / 15;
    house.box(ch, 0, ch.h, { uv: { front: [0, 0, wide(ch.w), high], back: [0, 0, wide(ch.w), high], left: [0, 0, wide(ch.d), high], right: [0, 0, wide(ch.d), high], top: [0, 0, 0, 0] } });
    trim.box(rect(ch.x, ch.z, ch.w + 1.2, ch.d + 1.2, ch.yaw), ch.h, ch.h + 0.9, { col: [0.2, 0.94, 1.0] });
    const sw = ch.w * 0.8, sh = sw / 8;
    const sx = ch.x + ch.vx * (ch.d / 2 - 2), sz = ch.z + ch.vz * (ch.d / 2 - 2);
    sign.box(rect(sx, sz, sw, 1.2, ch.yaw), ch.h + 2, ch.h + 2 + sh, { only: ['front', 'back'], uv: { front: [0, 0.75, 1, 1], back: [0, 0.75, 1, 1] } });
    add(house, towerMat);
    add(trim, basic({ vertexColors: true }));
    add(sign, basic({ map: cached('signs', signsTex) }));
    halos.pink.push(sx, ch.h + 2 + sh / 2, sz);
    for (const sgn of [-1, 1]) halos.cool.push(ch.x + ch.ux * sgn * ch.w * 0.5, ch.h + 1, ch.z + ch.uz * sgn * ch.w * 0.5);
  }
  const tw = layout.tower;
  if (tw) {
    const body = new Batch(), band = new Batch(), mast = new Batch();
    body.box(tw, 0, tw.h, { uv: { front: [0, 0, tw.w / 30, tw.h / 15], back: [0, 0, tw.w / 30, tw.h / 15], left: [0, 0, tw.d / 30, tw.h / 15], right: [0, 0, tw.d / 30, tw.h / 15], top: [0, 0, 0, 0] } });
    band.box(rect(tw.x, tw.z, tw.w + 3, tw.d + 3, tw.yaw), tw.h, tw.h + 9, { col: [0.2, 0.94, 1.0] });
    mast.box(rect(tw.x, tw.z, 1, 1, tw.yaw), tw.h + 9, tw.h + 40, { col: [0.5, 0.5, 0.55] });
    add(body, towerMat);
    add(band, basic({ vertexColors: true }));
    add(mast, std({ vertexColors: true }));
    halos.red.push(tw.x, tw.h + 40, tw.z);
    halos.cool.push(tw.x, tw.h + 5, tw.z);
  }

  // ── floodlight masts ──
  const mastPole = new Batch(), mastHead = new Batch();
  for (const m of layout.masts) {
    mastPole.box(rect(m.x, m.z, 1.4, 1.4, m.yaw), 0, m.h, { col: [0.3, 0.32, 0.36] });
    mastHead.box(rect(m.x + m.vx * 1.4, m.z + m.vz * 1.4, 14, 2, m.yaw), m.h, m.h + 7, { col: [1.7, 1.7, 1.55] });
    halos.cool.push(m.x + m.vx * 2.6, m.h + 3.5, m.z + m.vz * 2.6);
  }
  add(mastPole, std({ vertexColors: true, metalness: 0.5, roughness: 0.5 }));
  add(mastHead, basic({ vertexColors: true }));

  // ── skyline: a ring of towers on the horizon with lit windows ──
  const sky = new Batch();
  const win = cached('windows', windowsTex);
  for (const b of layout.skyline) {
    const rc = rect(b.x, b.z, b.w, b.d, b.yaw);
    const o1 = r(), o2 = r(), v = 0.05 + r() * 0.06;
    sky.box(rc, 0, b.h, {
      col: [v, v * 1.1, v * 1.5],
      uv: { front: [o1, 0, o1 + b.w / 13, b.h / 20], back: [o1, 0, o1 + b.w / 13, b.h / 20], left: [o2, 0, o2 + b.d / 13, b.h / 20], right: [o2, 0, o2 + b.d / 13, b.h / 20], top: [0, 0, 0, 0] },
    });
    if (b.h > 170) halos.red.push(b.x, b.h + 2, b.z);
  }
  add(sky, new THREE.MeshStandardMaterial({ vertexColors: true, color: 0xffffff, emissiveMap: win, emissive: 0xffffff, emissiveIntensity: 0.7, roughness: 1, side: THREE.DoubleSide }));

  // ── halos (soft additive glows) ──
  const dot = cached('dot', dotTex);
  const haloOf = (list, color, size, key) => {
    if (!list.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(list, 3));
    const mat = new THREE.PointsMaterial({ map: dot, color, size, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const p = new THREE.Points(geo, mat);
    p.frustumCulled = false;
    p.renderOrder = 3;
    group.add(p);
    return p;
  };
  haloOf(halos.amber, 0xffa850, 11);
  haloOf(halos.cool, 0x7fe8ff, 18);
  haloOf(halos.pink, 0xff4fa8, 24);
  const beacon = haloOf(halos.red, 0xff2a2a, 12);

  // ── camera flashes in the stands: short white twinkles ──
  let flashMat = null;
  if (flash.length) {
    const pos = [], phase = [];
    for (let i = 0; i < flash.length; i += 4) { pos.push(flash[i], flash[i + 1], flash[i + 2]); phase.push(flash[i + 3]); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1));
    flashMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uTime: { value: 0 }, uScale: pointScale },
      vertexShader: `attribute float aPhase; uniform float uTime; uniform float uScale; varying float vA;
        void main() {
          float s = sin(uTime * (1.3 + fract(aPhase * 7.0)) + aPhase * 20.0);
          vA = pow(max(s, 0.0), 40.0);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = min(60.0, 3.0 * uScale / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying float vA;
        void main() {
          vec2 c = gl_PointCoord - 0.5; float d = dot(c, c) * 4.0;
          float a = smoothstep(1.0, 0.0, d) * vA; if (a < 0.02) discard;
          gl_FragColor = vec4(vec3(1.0, 0.97, 0.9), a);
          #include <colorspace_fragment>
        }`,
    });
    const pts = new THREE.Points(geo, flashMat);
    pts.frustumCulled = false;
    pts.renderOrder = 3;
    group.add(pts);
  }

  return {
    group,
    /** Animate: the chase lights run along the barrier, the flashes twinkle, the beacon blinks. */
    update(time) {
      stripeMap.offset.x = -((time * 0.7) % 1);
      if (flashMat) flashMat.uniforms.uTime.value = time;
      if (beacon) beacon.material.opacity = Math.sin(time * 3.2) > 0 ? 1 : 0.25;
    },
  };
}
