// Wheel and drift effects, drawn around the player's robot:
//   - skid marks that fade, and coloured glow streaks while a drift is charging
//   - tyre smoke that grows with slip and speed, and dust when off the road
//   - sparks off the kerb, and sparks from the wheels while a drift is charged
//   - flames out of the tail during a boost, and the vacuum's breath at the nozzle
// Everything lives in two pooled point-sprite systems and two ring buffers of quads, so nothing
// is allocated per frame. The effects read the car's state; they never change it.
import * as THREE from 'three';
import { rng } from './rng.js';
import { pointScale } from './pointscale.js';
import { NOZZLE } from './dust.js';
import { onKerb, tierOf } from './drift.js';

// colour of each drift tier (0 = none): grey-black, blue, amber, pink
export const TIER_RGB = [[0.1, 0.11, 0.13], [0.23, 0.71, 1.0], [1.0, 0.69, 0.13], [1.0, 0.24, 0.5]];
const TIER_RGBA = TIER_RGB.map((c) => [c[0], c[1], c[2], 1]); // the same, with alpha, made once

const VERT_POINTS = `
attribute float aSize; attribute float aAlpha; attribute vec3 aColor;
uniform float uScale; varying float vA; varying vec3 vC;
void main() {
  vA = aAlpha; vC = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aAlpha < 0.003 ? 0.0 : min(180.0, aSize * uScale / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
// The colours are written as they should look on screen, so they are turned into linear light here
// and the shared output conversion turns them back (or the post-processing pass does, when it runs
// the scene in an HDR buffer). uGain above 1 makes a particle brighter than white, so it blooms.
const FRAG_POINTS = `
uniform float uGain; varying float vA; varying vec3 vC;
void main() {
  vec2 c = gl_PointCoord - 0.5; float d = dot(c, c) * 4.0;
  float a = smoothstep(1.0, 0.0, d) * vA;
  if (a < 0.01) discard;
  gl_FragColor = vec4(pow(vC, vec3(2.2)) * uGain, a);
  #include <colorspace_fragment>
}`;

/** A fixed pool of point sprites with their own life, velocity, size and colour ramp. */
class PointPool {
  constructor(n, { additive = false, order = 3, gain = 1 } = {}) {
    this.n = n;
    this.next = 0;
    const f = (k = 1) => new Float32Array(n * k);
    this.life = f(); this.max = f(); this.drag = f(); this.grav = f(); this.s0 = f(); this.s1 = f(); this.a0 = f();
    this.v = f(3); this.c0 = f(3); this.c1 = f(3);
    this.pos = f(3); this.size = f(); this.alpha = f(); this.col = f(3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uScale: pointScale, uGain: { value: gain } },
      vertexShader: VERT_POINTS, fragmentShader: FRAG_POINTS,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = order;
  }

  /** Start a particle in the next slot (the oldest one is reused when the pool is full). */
  spawn(x, y, z, vx, vy, vz, life, size0, size1, alpha, drag, grav, c0, c1) {
    const i = this.next;
    this.next = (this.next + 1) % this.n;
    this.life[i] = this.max[i] = life;
    this.s0[i] = size0; this.s1[i] = size1; this.a0[i] = alpha; this.drag[i] = drag; this.grav[i] = grav;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
    for (let k = 0; k < 3; k++) { this.c0[i * 3 + k] = c0[k]; this.c1[i * 3 + k] = c1[k]; }
  }

  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      const t = 1 - this.life[i] / this.max[i];
      const k = Math.exp(-this.drag[i] * dt);
      const j = i * 3;
      this.v[j] *= k; this.v[j + 2] *= k; this.v[j + 1] = this.v[j + 1] * k - this.grav[i] * dt;
      this.pos[j] += this.v[j] * dt; this.pos[j + 1] += this.v[j + 1] * dt; this.pos[j + 2] += this.v[j + 2] * dt;
      if (this.pos[j + 1] < 0.03) { this.pos[j + 1] = 0.03; this.v[j + 1] = 0; }
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      this.alpha[i] = this.a0[i] * (t < 0.12 ? t / 0.12 : (1 - t) / 0.88);
      for (let c = 0; c < 3; c++) this.col[j + c] = this.c0[j + c] + (this.c1[j + c] - this.c0[j + c]) * t;
    }
    const g = this.points.geometry.attributes;
    g.position.needsUpdate = g.aSize.needsUpdate = g.aAlpha.needsUpdate = g.aColor.needsUpdate = true;
  }

  get alive() { let n = 0; for (let i = 0; i < this.n; i++) if (this.life[i] > 0) n++; return n; }
}

/** A ring buffer of flat quads laid on the road, each with its own colour, birth time and life. */
class TrailRing {
  constructor(max, { additive = false, y = 0.026, order = 1, gain = 1 } = {}) {
    this.max = max;
    this.count = 0;
    this.dirty = false;
    this.y = y;
    this.pos = new Float32Array(max * 6 * 3);
    this.col = new Float32Array(max * 6 * 4);
    this.birth = new Float32Array(max * 6);
    this.life = new Float32Array(max * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aCol', new THREE.BufferAttribute(this.col, 4));
    geo.setAttribute('aBirth', new THREE.BufferAttribute(this.birth, 1));
    geo.setAttribute('aLife', new THREE.BufferAttribute(this.life, 1));
    geo.setDrawRange(0, 0);
    this.uTime = { value: 0 };
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uTime: this.uTime, uGain: { value: gain } },
      vertexShader: `attribute vec4 aCol; attribute float aBirth; attribute float aLife; uniform float uTime; varying vec4 vC;
        void main() {
          float f = clamp(1.0 - (uTime - aBirth) / aLife, 0.0, 1.0);
          vC = vec4(aCol.rgb, aCol.a * f * f);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `uniform float uGain; varying vec4 vC;
        void main() {
          if (vC.a < 0.01) discard;
          gl_FragColor = vec4(pow(vC.rgb, vec3(2.2)) * uGain, vC.a);
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = order;
  }

  /**
   * A strip from (ax, az) to (bx, bz), hw either side, that fades over `life` seconds. The two ends
   * carry their own birth times (tA, tB), so the fade runs smoothly along a trail.
   */
  quad(ax, az, bx, bz, hw, rgba, tA, tB, life) {
    const dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz);
    if (len < 0.02) return;
    const ox = (-dz / len) * hw, oz = (dx / len) * hw;
    const slot = this.count % this.max;
    const p = slot * 18, y = this.y;
    const x = [ax - ox, ax + ox, bx - ox, ax + ox, bx + ox, bx - ox];
    const z = [az - oz, az + oz, bz - oz, az + oz, bz + oz, bz - oz];
    const t = [tA, tA, tB, tA, tB, tB];
    for (let k = 0; k < 6; k++) {
      this.pos[p + k * 3] = x[k]; this.pos[p + k * 3 + 1] = y; this.pos[p + k * 3 + 2] = z[k];
      const q = slot * 6 + k;
      this.col[q * 4] = rgba[0]; this.col[q * 4 + 1] = rgba[1]; this.col[q * 4 + 2] = rgba[2]; this.col[q * 4 + 3] = rgba[3];
      this.birth[q] = t[k]; this.life[q] = life;
    }
    this.count++;
    this.dirty = true;
  }

  flush(time) {
    this.uTime.value = time;
    if (!this.dirty) return;
    this.dirty = false;
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = g.attributes.aCol.needsUpdate = g.attributes.aBirth.needsUpdate = g.attributes.aLife.needsUpdate = true;
    g.setDrawRange(0, Math.min(this.count, this.max) * 6);
  }
}

const GREY = [0.86, 0.87, 0.89], GREY2 = [0.7, 0.72, 0.75], DUST = [0.62, 0.5, 0.36], DUST2 = [0.5, 0.42, 0.33];
const FLAME0 = [1.0, 0.95, 0.69], FLAME1 = [1.0, 0.24, 0.0], SPARK0 = [1.0, 0.89, 0.48], SPARK1 = [1.0, 0.54, 0.12];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export class Effects {
  /**
   * model: the player's car model (carModel), with wheelX, wheelZ and rearZ.
   * road: for finding where a wheel is on the kerb.
   */
  constructor(model, road, seed) {
    this.model = model;
    this.road = road;
    this.r = rng((seed || 1) * 131 + 17);
    this.group = new THREE.Group();
    this.skid = new TrailRing(700, { y: 0.026, order: 1 });
    this.glow = new TrailRing(260, { y: 0.032, order: 2, gain: 2.2 }); // brighter than white, so it blooms
    this.smoke = new PointPool(320, { order: 3 });
    this.fire = new PointPool(220, { additive: true, order: 4, gain: 3 }); // flames and sparks bloom
    this.group.add(this.skid.mesh, this.glow.mesh, this.smoke.points, this.fire.points);
    // per wheel (index 0 = -x, 1 = +x): the last trail point, the smoke accumulator, kerb state, a road hint
    this.w = [0, 1].map(() => ({ sx: 0, sz: 0, st: 0, has: false, gx: 0, gz: 0, gt: 0, hasG: false, acc: 0, dust: 0, spark: 0, kerb: false, hint: null }));
    this.exAcc = 0;
    this.breath = 0;
    this.wx = [0, 0];
    this.wz = [0, 0];
  }

  /**
   * Advance by dt and emit for this frame. st: { car, time, racing, brake, pick, sucking, surf,
   * charge: the race's drift state ({ q, tier, vmul }), finished }.
   */
  update(dt, st) {
    const { time } = st;
    const c = st.car, m = this.model, r = this.r;
    const sx = Math.sin(c.psi), cz = Math.cos(c.psi); // forward
    const ux = cz, uz = -sx; // sideways (+x)
    const speed = Math.abs(c.vx);
    // world velocity of the car, for particles to start with
    const vwx = c.vx * sx + c.vy * cz, vwz = c.vx * cz - c.vy * sx;

    if (st.racing) {
      const slip = c.drift;
      const charging = st.charge.q > 0.05 ? tierOf(st.charge.q) : 0; // tier colour while charging
      const boost = Math.max(0, Math.min(1, (st.charge.vmul - 1) / 0.2));
      const sliding = slip > 0.35 || (st.brake && speed > 3);
      const tintC = charging ? TIER_RGB[charging] : null;

      for (let k = 0; k < 2; k++) {
        const side = k ? 1 : -1, w = this.w[k];
        const lx = side * m.wheelX, lz = m.wheelZ;
        const wx = c.x + ux * lx + sx * lz, wz = c.z + uz * lx + cz * lz;
        this.wx[k] = wx; this.wz[k] = wz;

        // skid mark: one quad every half unit of travel while sliding or braking hard
        if (sliding && !st.finished) {
          if (w.has && Math.hypot(wx - w.sx, wz - w.sz) >= 0.5) {
            this.skid.quad(w.sx, w.sz, wx, wz, 0.22, [0.1, 0.11, 0.13, 0.5], w.st, time, 7);
            w.sx = wx; w.sz = wz; w.st = time;
          } else if (!w.has) { w.sx = wx; w.sz = wz; w.st = time; w.has = true; }
        } else w.has = false;
        // coloured streak while a drift is charging
        if (charging && slip > 0.3 && speed > 3) {
          if (w.hasG && Math.hypot(wx - w.gx, wz - w.gz) >= 0.5) {
            this.glow.quad(w.gx, w.gz, wx, wz, 0.42, TIER_RGBA[charging], w.gt, time, 1.6);
            w.gx = wx; w.gz = wz; w.gt = time;
          } else if (!w.hasG) { w.gx = wx; w.gz = wz; w.gt = time; w.hasG = true; }
        } else w.hasG = false;

        // tyre smoke: grows with slip and speed
        if (slip > 0.2 || (st.brake && speed > 5)) {
          const amount = Math.max(slip, 0.35);
          w.acc += (4 + 24 * amount) * Math.min(1, 0.35 + speed / 10) * dt;
          let n = Math.min(6, Math.floor(w.acc));
          w.acc -= n;
          while (n-- > 0) {
            const s0 = 0.9 + 1.2 * amount;
            const base = tintC ? mix(GREY, tintC, 0.25) : GREY;
            this.smoke.spawn(
              wx + (r() - 0.5) * 0.6, 0.25, wz + (r() - 0.5) * 0.6,
              vwx * 0.3 + ux * side * 0.6 + (r() - 0.5) * 0.6, 0.9, vwz * 0.3 + uz * side * 0.6 + (r() - 0.5) * 0.6,
              0.9 + r() * 0.5, s0, s0 * 2.1, 0.5, 2, -0.5, base, GREY2,
            );
          }
        }
        // dust kicked up off the road
        if (st.surf && st.surf !== 'road' && st.surf !== 'kerb' && speed > 4) {
          w.dust += 14 * dt;
          let n = Math.min(3, Math.floor(w.dust));
          w.dust -= n;
          while (n-- > 0) {
            this.smoke.spawn(wx, 0.3, wz, vwx * 0.2 + (r() - 0.5), 0.6, vwz * 0.2 + (r() - 0.5), 0.9 + r() * 0.4, 1.0, 2.2, 0.4, 2.2, -0.4, DUST, DUST2);
          }
        }

        // sparks off the kerb: a burst on entry, then a steady shower
        const near = this.road.nearest(wx, wz, w.hint);
        w.hint = near.s;
        const onK = onKerb(near.d) && speed > 3;
        if (onK) {
          const p = this.road.pointAt(near.s), sgn = Math.sign(near.d) || 1;
          const inx = -sgn * p.tz, inz = sgn * p.tx; // toward the road's middle
          let n;
          if (!w.kerb) n = 8;
          else { w.spark += 40 * dt; n = Math.min(4, Math.floor(w.spark)); w.spark -= n; }
          while (n-- > 0) {
            const out = 2 + r() * 3;
            this.fire.spawn(wx, 0.15, wz, vwx * 0.5 + inx * out, 3 + r() * 4, vwz * 0.5 + inz * out, 0.2 + r() * 0.15, 0.35, 0.1, 1, 0.6, 98, SPARK0, SPARK1);
          }
        }
        w.kerb = onK;
        // sparks in the tier's colour straight off the wheels while a charged drift holds
        if (charging && slip > 0.3 && speed > 3) {
          w.spark += 18 * dt;
          let n = Math.min(3, Math.floor(w.spark));
          w.spark -= n;
          while (n-- > 0) {
            this.fire.spawn(wx, 0.2, wz, vwx * 0.4 + ux * side * (1 + r() * 2), 1 + r() * 2.5, vwz * 0.4 + uz * side * (1 + r() * 2), 0.25 + r() * 0.2, 0.3, 0.1, 1, 0.8, 60, TIER_RGB[charging], mix(TIER_RGB[charging], [1, 1, 1], 0.5));
          }
        }
      }

      // boost flames out of the tail, two exhausts
      if (boost > 0.2) {
        this.exAcc += 55 * 2 * boost * dt;
        let n = Math.min(10, Math.floor(this.exAcc));
        this.exAcc -= n;
        while (n-- > 0) {
          const side = r() < 0.5 ? -0.9 : 0.9;
          const ex = c.x + ux * side + sx * m.rearZ, ez = c.z + uz * side + cz * m.rearZ;
          this.fire.spawn(
            ex, 1.0 + (r() - 0.5) * 0.4, ez,
            vwx * 0.6 - sx * (4 + r() * 3) + (r() - 0.5) * 0.8, 0.4 + r() * 0.5, vwz * 0.6 - cz * (4 + r() * 3) + (r() - 0.5) * 0.8,
            0.18 + r() * 0.1, 0.9 + r() * 0.5, 0.25, 0.95, 1.5, 0, FLAME0, FLAME1,
          );
        }
      }

      // the vacuum's breath at the nozzle
      if (st.pick && st.sucking) {
        this.breath += 70 * dt;
        let n = Math.min(4, Math.floor(this.breath));
        this.breath -= n;
        while (n-- > 0) {
          const jx = (r() - 0.5) * 3.8;
          this.smoke.spawn(
            c.x + sx * (NOZZLE + 0.2) + ux * jx, 0.35, c.z + cz * (NOZZLE + 0.2) + uz * jx,
            -sx * 1.2, 0.6 + r() * 0.4, -cz * 1.2, 0.45, 0.6 + r() * 0.3, 1.1, 0.5, 2, -0.4, GREY, GREY2,
          );
        }
      }
    } else {
      for (const w of this.w) { w.has = false; w.hasG = false; }
    }

    this.skid.flush(time);
    this.glow.flush(time);
    this.smoke.update(dt);
    this.fire.update(dt);
  }

  /** How many particles are alive, for tests and the budget check. */
  get counts() { return { smoke: this.smoke.alive, fire: this.fire.alive, skid: Math.min(this.skid.count, this.skid.max), glow: Math.min(this.glow.count, this.glow.max) }; }
}
