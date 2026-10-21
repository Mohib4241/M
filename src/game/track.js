// A random closed road. The centre line is a loop whose radius changes smoothly with angle,
// so it never crosses itself. It is resampled to one point per unit, and a road is only kept
// if its tightest bend is still wide enough for the robot to drive round.
// Units: 1 unit = 10 cm, so ROAD_W = 16 is a 1.6 m road.
import { rng } from './rng.js';

export const ROAD_W = 16;
export const KERB_W = 0.8; // painted kerb beyond the road edge
export const PAVE_W = 4; // pavement beyond the kerb
export const VERGE_W = 14; // grass beyond that, then the play area ends

export function makeRoad(seed, { length = 640, minTurn = 11 } = {}) {
  for (let attempt = 0; attempt < 300; attempt++) {
    const road = buildLoop(rng(seed * 7919 + attempt * 104729 + 17), length);
    if (road.minRadius >= minTurn) return Object.assign(road, { seed });
  }
  // Never reached in practice; a plain big loop keeps the game playable if it ever is.
  return Object.assign(buildLoop(rng(1), length, true), { seed });
}

function buildLoop(r, length, plain = false) {
  // Log-radius as a sum of a few harmonics: low ones give sweeping bends, high ones tighter kinks.
  const terms = [];
  if (!plain) {
    for (let k = 2; k <= 6; k++) {
      if (r() < (k <= 3 ? 0.9 : 0.55)) terms.push({ k, a: (0.42 / k) * r.range(0.5, 1.2), ph: r.range(0, Math.PI * 2) });
    }
  }
  const M = 900;
  const raw = [];
  for (let j = 0; j < M; j++) {
    const th = (j / M) * Math.PI * 2;
    let lr = 0;
    for (const t of terms) lr += t.a * Math.sin(t.k * th + t.ph);
    raw.push([Math.exp(lr) * Math.cos(th), Math.exp(lr) * Math.sin(th)]);
  }
  // scale so the loop is exactly `length` long
  let per = 0;
  for (let j = 0; j < M; j++) {
    const a = raw[j], b = raw[(j + 1) % M];
    per += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  const sc = length / per;
  for (const p of raw) { p[0] *= sc; p[1] *= sc; }

  // resample to one point per unit of arc length
  const N = Math.round(length);
  const step = length / N;
  const x = new Float64Array(N), z = new Float64Array(N);
  let j = 0, acc = 0;
  for (let i = 0; i < N; i++) {
    const target = i * step;
    while (acc + Math.hypot(raw[(j + 1) % M][0] - raw[j][0], raw[(j + 1) % M][1] - raw[j][1]) < target) {
      acc += Math.hypot(raw[(j + 1) % M][0] - raw[j][0], raw[(j + 1) % M][1] - raw[j][1]);
      j = (j + 1) % M;
    }
    const a = raw[j], b = raw[(j + 1) % M];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-9;
    const f = (target - acc) / seg;
    x[i] = a[0] + (b[0] - a[0]) * f;
    z[i] = a[1] + (b[1] - a[1]) * f;
  }

  // tangent (unit) and curvature from points three steps either side (smoother than neighbours)
  const tx = new Float64Array(N), tz = new Float64Array(N), k = new Float64Array(N);
  let minRadius = Infinity;
  const at = (i) => ((i % N) + N) % N;
  for (let i = 0; i < N; i++) {
    const a = at(i + 1), b = at(i - 1);
    const dx = x[a] - x[b], dz = z[a] - z[b];
    const len = Math.hypot(dx, dz) || 1;
    tx[i] = dx / len; tz[i] = dz / len;
    const p0 = at(i - 3), p2 = at(i + 3);
    const ax = x[i] - x[p0], az = z[i] - z[p0], bx = x[p2] - x[i], bz = z[p2] - z[i];
    const cx = x[p2] - x[p0], cz = z[p2] - z[p0];
    const area2 = Math.abs(ax * bz - az * bx);
    const prod = Math.hypot(ax, az) * Math.hypot(bx, bz) * Math.hypot(cx, cz) || 1e-9;
    const kap = (2 * area2) / prod * Math.sign(ax * bz - az * bx || 1);
    k[i] = kap;
    if (Math.abs(kap) > 1e-6) minRadius = Math.min(minRadius, 1 / Math.abs(kap));
  }

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < N; i++) {
    minX = Math.min(minX, x[i]); maxX = Math.max(maxX, x[i]);
    minZ = Math.min(minZ, z[i]); maxZ = Math.max(maxZ, z[i]);
  }
  return new Road({ x, z, tx, tz, k, length, step, minRadius, bounds: { minX, maxX, minZ, maxZ } });
}

export class Road {
  constructor(d) {
    Object.assign(this, d);
    this.n = this.x.length;
    this.half = ROAD_W / 2;
  }

  /** Point on the centre line at arc length s (wraps around the loop). */
  pointAt(s) {
    const f = (((s / this.step) % this.n) + this.n) % this.n;
    const i = Math.floor(f), t = f - i;
    const a = i, b = (i + 1) % this.n;
    const tx = this.tx[a] + (this.tx[b] - this.tx[a]) * t;
    const tz = this.tz[a] + (this.tz[b] - this.tz[a]) * t;
    const len = Math.hypot(tx, tz) || 1;
    return {
      x: this.x[a] + (this.x[b] - this.x[a]) * t,
      z: this.z[a] + (this.z[b] - this.z[a]) * t,
      tx: tx / len, tz: tz / len,
      k: this.k[a] + (this.k[b] - this.k[a]) * t,
    };
  }

  /**
   * Nearest centre-line point to (x, z). `hint` is the last arc length, so a car is matched
   * against the samples near it rather than the whole loop (no jump to the other side of the lap).
   * Returns arc length s and lateral offset d (positive is toward the car's +x side).
   */
  nearest(x, z, hint = null) {
    const n = this.n;
    let best = -1, bestD = Infinity;
    const scan = (i) => {
      const j = ((i % n) + n) % n;
      const dx = this.x[j] - x, dz = this.z[j] - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD) { bestD = d2; best = j; }
    };
    if (hint === null) for (let i = 0; i < n; i++) scan(i);
    else {
      const c = Math.round(hint / this.step);
      for (let o = -40; o <= 40; o++) scan(c + o);
    }
    const p = this.pointAt(best * this.step);
    const ax = x - p.x, az = z - p.z;
    const along = ax * p.tx + az * p.tz;
    const lateral = ax * p.tz - az * p.tx;
    let s = best * this.step + along;
    s = ((s % this.length) + this.length) % this.length;
    return { s, d: lateral, onTrack: Math.abs(lateral) <= this.half + KERB_W };
  }
}

/** Forward distance from a to b around the loop, always in (-L/2, L/2]. */
export function lapDelta(a, b, L) {
  let d = b - a;
  if (d > L / 2) d -= L;
  if (d <= -L / 2) d += L;
  return d;
}

