// Where everything in the racing club goes, for any random road. Plain data, no three.js, so the
// node tests can check it. The road is a closed loop; the club is placed by distance from its
// centre line, never by hand, so it fits every shape.
//
// Units: 1 unit = 10 cm. d is the distance from the centre line, s is the arc length.
// Robots stay inside |d| 19.8 (the play edge) and their bodies reach about 24.5, so nothing solid
// is placed inside |d| 25.
import { rng } from './rng.js';
import { ROAD_W, KERB_W, PAVE_W } from './track.js';

export const CLUB = {
  PADDOCK_IN: ROAD_W / 2 + KERB_W + PAVE_W, // 12.8: where the pavement ends and the paddock begins
  PLAY_EDGE: 19.8, // the white paint line (the robots are turned back here)
  BARRIER_IN: 25, BARRIER_OUT: 26, BARRIER_H: 9,
  BARRIER_MIN_RADIUS: 26, // no barrier where the road bends tighter than this (it would fold over itself)
  LAMP_D: 27, LAMP_EVERY: 40, LAMP_H: 45, LAMP_ARM: 4,
  GANTRY_D: 26.5, GANTRY_H: 60, BEAM_H: 55,
  NEAR: 28, // inner face of the garages and the stands
  GARAGE: { w: 40, d: 14, h: 30 },
  STAND: { w: 72, d: 36, h: 44, tiers: 4 },
  MAST: { inner: 96, size: 8, h: 100, spacing: 110 },
  TOWER: { w: 16, d: 16, h: 150 },
  CLUBHOUSE: [{ w: 80, d: 40, h: 60 }, { w: 60, d: 30, h: 50 }, { w: 44, d: 22, h: 40 }],
  CLEAR: 27, // infield buildings keep this far from the centre line
  SKYLINE: 72,
};

// ───────────────────────── oriented rectangles ─────────────────────────

/** A footprint: centre (x, z), size w across (along u) by d deep (along v), turned by yaw. */
export function rect(x, z, w, d, yaw, extra = {}) {
  return { x, z, w, d, yaw, ux: Math.cos(yaw), uz: -Math.sin(yaw), vx: Math.sin(yaw), vz: Math.cos(yaw), ...extra };
}

/** Distance from a point to a rectangle (0 inside). */
export function pointToRect(px, pz, r) {
  const dx = px - r.x, dz = pz - r.z;
  const a = Math.abs(dx * r.ux + dz * r.uz) - r.w / 2;
  const b = Math.abs(dx * r.vx + dz * r.vz) - r.d / 2;
  return Math.hypot(Math.max(a, 0), Math.max(b, 0));
}

/** Smallest distance from the rectangle to the road's centre line. */
export function clearance(r, road) {
  let best = Infinity;
  for (let i = 0; i < road.n; i++) best = Math.min(best, pointToRect(road.x[i], road.z[i], r));
  return best;
}

/** True if two rectangles come closer than `gap` (separating axis test on the four axes). */
export function rectsTouch(a, b, gap = 0) {
  for (const r of [a, b]) {
    for (const [ax, az] of [[r.ux, r.uz], [r.vx, r.vz]]) {
      const ha = (Math.abs(a.ux * ax + a.uz * az) * a.w + Math.abs(a.vx * ax + a.vz * az) * a.d) / 2;
      const hb = (Math.abs(b.ux * ax + b.uz * az) * b.w + Math.abs(b.vx * ax + b.vz * az) * b.d) / 2;
      const dist = Math.abs((b.x - a.x) * ax + (b.z - a.z) * az);
      if (dist > ha + hb + gap) return false;
    }
  }
  return true;
}

// ───────────────────────── layout ─────────────────────────

const cache = new Map();

export function layoutClub(road) {
  const key = `${road.seed}:${road.length}`;
  if (cache.has(key)) return cache.get(key);
  const layout = build(road);
  if (cache.size >= 5) cache.delete(cache.keys().next().value);
  cache.set(key, layout);
  return layout;
}

function build(road) {
  const r = rng((road.seed || 1) * 977 + 13);
  const N = road.n;
  let cx = 0, cz = 0;
  for (let i = 0; i < N; i++) { cx += road.x[i]; cz += road.z[i]; }
  cx /= N; cz /= N;

  // Which side of the road faces away from the middle (the loops are nearly convex, so one side).
  let sideSum = 0;
  for (let i = 0; i < N; i++) sideSum += (road.x[i] - cx) * road.tz[i] - (road.z[i] - cz) * road.tx[i];
  const out = sideSum >= 0 ? 1 : -1; // multiply the lateral vector (tz, -tx) by this to face outward

  // Where each barrier is allowed. Only the inside of a tight bend would fold over itself: a
  // positive curvature puts the centre of the bend on the -d side, so that is the inside there.
  const barrierNeg = new Uint8Array(N), barrierPos = new Uint8Array(N);
  const tight = 1 / CLUB.BARRIER_MIN_RADIUS;
  for (let i = 0; i < N; i++) {
    const k = road.k[i];
    barrierNeg[i] = k > tight ? 0 : 1;
    barrierPos[i] = k < -tight ? 0 : 1;
  }

  const solids = []; // every footprint, so each new one can be checked against them
  const place = (rc) => { solids.push(rc); return rc; };
  const fits = (rc, inner) => clearance(rc, road) >= inner - 0.5 && !solids.some((o) => rectsTouch(rc, o, 1));

  // a footprint standing outside the road at arc length s, its front toward the road
  const outward = (s, inner, w, d, extra) => {
    const p = road.pointAt(s);
    const lx = p.tz * out, lz = -p.tx * out; // outward unit vector
    const c = inner + d / 2;
    return rect(p.x + lx * c, p.z + lz * c, w, d, Math.atan2(-lx, -lz), extra);
  };

  // start/finish gantry
  const p0 = road.pointAt(0);
  const gantry = { x: p0.x, z: p0.z, yaw: Math.atan2(p0.tx, p0.tz), span: CLUB.GANTRY_D * 2, h: CLUB.GANTRY_H, beamH: CLUB.BEAM_H };

  // street lamps along the barrier
  const lamps = [];
  for (let s = 20; s < road.length - 5; s += CLUB.LAMP_EVERY) {
    if (s < 25 || s > road.length - 25) continue;
    for (const side of [-1, 1]) {
      const p = road.pointAt(s);
      const d = side * CLUB.LAMP_D;
      const yaw = Math.atan2(-side * p.tz, side * p.tx); // the arm points to the road
      lamps.push({ x: p.x + d * p.tz, z: p.z - d * p.tx, yaw, side, s });
    }
  }

  // the infield: a clubhouse and a control tower in the open middle
  const cells = infieldCells(road, cx, cz);
  let clubhouse = null, tower = null;
  const toStart = Math.atan2(p0.x - cx, p0.z - cz);
  for (const size of CLUB.CLUBHOUSE) {
    for (const cell of cells) {
      const rc = rect(cell.x, cell.z, size.w, size.d, toStart, { h: size.h, kind: 'clubhouse' });
      if (clearance(rc, road) >= CLUB.CLEAR) { clubhouse = place(rc); break; }
    }
    if (clubhouse) break;
  }
  for (const cell of cells) {
    const rc = rect(cell.x, cell.z, CLUB.TOWER.w, CLUB.TOWER.d, toStart, { h: CLUB.TOWER.h, kind: 'tower' });
    if (clearance(rc, road) >= CLUB.CLEAR && !solids.some((o) => rectsTouch(rc, o, 6))) { tower = place(rc); break; }
  }

  // the near ring on the outside: grandstands and pit garages along the road
  const stands = [], garages = [];
  const pattern = ['stand', 'garage', 'garage', 'stand', 'garage'];
  let step = r.int(0, pattern.length - 1);
  for (let s = 10; s < road.length - 20;) {
    const kind = pattern[step % pattern.length];
    const sz = kind === 'stand' ? CLUB.STAND : CLUB.GARAGE;
    const rc = outward(s + sz.w / 2, CLUB.NEAR, sz.w, sz.d, { h: sz.h, kind });
    if (fits(rc, CLUB.NEAR)) {
      place(rc);
      (kind === 'stand' ? stands : garages).push(rc);
      s += sz.w + 1;
      step++;
    } else {
      s += 4; // the road bends toward it here; try a little further on
    }
  }

  // floodlight masts behind the ring
  const masts = [];
  for (let s = r.range(0, 40); s < road.length; s += CLUB.MAST.spacing) {
    const rc = outward(s, CLUB.MAST.inner, CLUB.MAST.size, CLUB.MAST.size, { h: CLUB.MAST.h, kind: 'mast' });
    if (fits(rc, CLUB.MAST.inner)) { place(rc); masts.push(rc); }
  }

  // a ring of towers on the horizon, one per sector, beyond whatever the sector holds
  const sectorMax = new Float64Array(CLUB.SKYLINE);
  const bump = (x, z) => {
    const a = Math.atan2(z - cz, x - cx);
    const k = ((Math.floor(((a + Math.PI) / (2 * Math.PI)) * CLUB.SKYLINE) % CLUB.SKYLINE) + CLUB.SKYLINE) % CLUB.SKYLINE;
    sectorMax[k] = Math.max(sectorMax[k], Math.hypot(x - cx, z - cz));
  };
  for (let i = 0; i < N; i++) bump(road.x[i], road.z[i]);
  for (const o of solids) {
    for (const [a, b] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      bump(o.x + o.ux * a * o.w / 2 + o.vx * b * o.d / 2, o.z + o.uz * a * o.w / 2 + o.vz * b * o.d / 2);
    }
  }
  const skyline = [];
  for (let k = 0; k < CLUB.SKYLINE; k++) {
    if (r() < 0.38) continue; // gaps, so the sky and the stars show between the towers
    // a sector with nothing in it still sits beyond the whole loop
    const near = Math.max(sectorMax[k], sectorMax[(k + 1) % CLUB.SKYLINE], sectorMax[(k + CLUB.SKYLINE - 1) % CLUB.SKYLINE]);
    const rad = near + 90 + r.range(0, 80);
    const a = -Math.PI + ((k + 0.5) / CLUB.SKYLINE) * Math.PI * 2;
    const landmark = r() < 0.1;
    skyline.push({
      x: cx + Math.cos(a) * rad, z: cz + Math.sin(a) * rad,
      w: r.range(30, 60), d: r.range(30, 50), h: landmark ? r.range(180, 260) : r.range(40, 150), yaw: -a + Math.PI / 2, lit: r(),
    });
  }

  return { seed: road.seed, centroid: { x: cx, z: cz }, out, barrierNeg, barrierPos, lamps, gantry, clubhouse, tower, stands, garages, masts, skyline, solids };
}

/** Open ground inside the loop, best (most room) first, on a 4-unit grid. */
function infieldCells(road, cx, cz) {
  const b = road.bounds;
  const cells = [];
  for (let x = b.minX; x <= b.maxX; x += 4) {
    for (let z = b.minZ; z <= b.maxZ; z += 4) {
      if (!inside(road, x, z)) continue;
      let dmin = Infinity;
      for (let i = 0; i < road.n; i += 2) dmin = Math.min(dmin, Math.hypot(road.x[i] - x, road.z[i] - z));
      if (dmin > CLUB.CLEAR) cells.push({ x, z, d: dmin });
    }
  }
  cells.sort((a, b2) => b2.d - a.d);
  return cells;
}

/** Point in polygon (ray crossing) against the centre line. */
function inside(road, px, pz) {
  let c = false;
  const n = road.n;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = road.x[i], zi = road.z[i], xj = road.x[j], zj = road.z[j];
    if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
