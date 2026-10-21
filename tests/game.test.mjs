// Tests for the race game's logic (no rendering): roads, driving, dust and laps.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRoad } from '../src/game/track.js';
import { newCar, stepCar, CAR } from '../src/game/car.js';
import { driverInput } from '../src/game/ai.js';
import { Race, COUNTDOWN } from '../src/game/race.js';
import { DustField, NOZZLE, TANK_MAX } from '../src/game/dust.js';
import { rng } from '../src/game/rng.js';
import { newDrift, stepDrift, tierOf, onKerb, BOOST } from '../src/game/drift.js';
import { layoutClub, clearance, rectsTouch, CLUB } from '../src/game/club.js';
import { QualityGovernor, MODES } from '../src/game/quality.js';

const DT = 1 / 60;

test('same seed gives the same random numbers', () => {
  const a = rng(42), b = rng(42);
  for (let i = 0; i < 20; i++) assert.equal(a(), b());
});

test('roads close, have the asked length and their curves are drivable', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const road = makeRoad(seed, { length: 640 });
    assert.equal(road.length, 640);
    assert.ok(road.minRadius >= 11, `seed ${seed} tightest bend ${road.minRadius}`);
    const a = road.pointAt(0), b = road.pointAt(road.length - road.step);
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 2, `seed ${seed} does not close`);
  }
});

test('nearest() finds the centre line and the lateral offset', () => {
  const road = makeRoad(7);
  const p = road.pointAt(200);
  const q = road.nearest(p.x + p.tz * 3, p.z - p.tx * 3, 200); // 3 units to the car's +x side
  assert.ok(Math.abs(q.s - 200) < 0.6, `s ${q.s}`);
  assert.ok(Math.abs(q.d - 3) < 0.1, `d ${q.d}`);
  assert.equal(q.onTrack, true);
});

test('throttle drives forward, and steering left turns toward +x', () => {
  const c = newCar(0, 0, 0);
  for (let i = 0; i < 120; i++) stepCar(c, { throttle: 1, brake: 0, hand: 0, steer: 0 }, DT);
  assert.ok(c.vx > 5 && c.z > 5, `vx ${c.vx} z ${c.z}`);
  assert.ok(Math.abs(c.x) < 0.01);
  const t = newCar(0, 0, 0);
  t.vx = 8;
  for (let i = 0; i < 60; i++) stepCar(t, { throttle: 0.4, brake: 0, hand: 0, steer: 1 }, DT);
  assert.ok(t.psi > 0.3, `psi ${t.psi}`);
});

test('the front brake stops the robot in well under a second without going backwards', () => {
  const c = newCar(0, 0, 0);
  c.vx = 13;
  let t = 0;
  while (c.vx > 0 && t < 5) { stepCar(c, { throttle: 0, brake: 1, hand: 0, steer: 0 }, DT); t += DT; }
  assert.ok(t < 1, `stop time ${t}`);
  // S is a brake only: holding it on a stopped robot keeps it still, it does not reverse
  const zStop = c.z;
  for (let i = 0; i < 120; i++) stepCar(c, { throttle: 0, brake: 1, hand: 0, steer: 0 }, DT);
  assert.ok(Math.abs(c.vx) < 1e-9 && Math.abs(c.z - zStop) < 1e-6, `vx ${c.vx} moved ${c.z - zStop}`);
});

test('the handbrake lets the rear slide: more yaw than gripping', () => {
  const run = (hand) => {
    const c = newCar(0, 0, 0);
    c.vx = 10;
    for (let i = 0; i < 60; i++) stepCar(c, { throttle: 0.2, brake: 0, hand, steer: 0.7 }, DT);
    return c;
  };
  const grip = run(0), slide = run(1);
  assert.ok(slide.r > grip.r * 1.3, `yaw grip ${grip.r.toFixed(2)} slide ${slide.r.toFixed(2)}`);
  assert.ok(slide.drift > 0.8, `drift ${slide.drift}`);
});

test('the physics stays finite over a long run', () => {
  const c = newCar(0, 0, 0);
  const r = rng(9);
  for (let i = 0; i < 60 * 120; i++) {
    stepCar(c, { throttle: r() < 0.8 ? 1 : 0, brake: r() < 0.1 ? 1 : 0, hand: r() < 0.1 ? 1 : 0, steer: r.range(-1, 1) }, DT);
  }
  for (const v of [c.x, c.z, c.vx, c.vy, c.r, c.psi]) assert.ok(Number.isFinite(v));
  assert.ok(Math.abs(c.vx) < CAR.VMAX * 1.2);
});

test('the opponent completes random roads in about a minute', () => {
  const times = [];
  for (let seed = 1; seed <= 12; seed++) {
    const road = makeRoad(seed, { length: 640 });
    const race = new Race(road, { skill: 0.95 });
    let guard = 0;
    while (!race.ai.finished && guard++ < 60 * 200) race.step(DT, {});
    assert.ok(race.ai.finished, `seed ${seed} not finished`);
    times.push(race.ai.time);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  assert.ok(avg > 45 && avg < 75, `average lap ${avg.toFixed(1)} s (${times.map((t) => t.toFixed(0)).join(' ')})`);
});

test('nothing moves during the countdown', () => {
  const race = new Race(makeRoad(3), { skill: 1 });
  const x0 = race.player.car.x, z0 = race.player.car.z;
  for (let t = 0; t < COUNTDOWN - 0.1; t += DT) race.step(DT, { throttle: 1 });
  assert.equal(race.player.car.x, x0);
  assert.equal(race.player.car.z, z0);
  assert.ok(race.clock < 0);
});

test('a driver who follows the line finishes the lap and is placed', () => {
  const road = makeRoad(11);
  const race = new Race(road, { skill: 1 });
  let guard = 0;
  while (!race.over && guard++ < 60 * 200) {
    // the test drives the player with the same line-following logic as the opponent
    const hint = race.player.hint;
    const inp = driverInput(race.player.car, road, hint, 1);
    race.step(DT, { throttle: inp.throttle, brake: inp.brake, steer: inp.steer });
  }
  assert.ok(race.player.finished, 'player finished');
  assert.ok(race.player.time > 40 && race.player.time < 100, `player time ${race.player.time}`);
  assert.ok([1, 2].includes(race.player.place));
  const events = race.events.map((e) => e.type);
  assert.ok(race.over);
  assert.ok(events.length >= 0);
});

test('dust is picked up only in the mouth, and only while the pickup is held', () => {
  const road = makeRoad(5);
  const field = new DustField(road, 5);
  // stand the robot on a grain and aim it at the grain
  const car = newCar(field.x[0], field.z[0] - NOZZLE - 1.5, 0); // a grain just ahead of the nozzle
  const before = field.taken;
  // with the key up nothing is taken, however close
  for (let i = 0; i < 120; i++) field.pickup(car, DT, false, TANK_MAX);
  assert.equal(field.taken, before);
  // with the key held the grain in the mouth is taken
  let got = 0;
  for (let i = 0; i < 240; i++) got += field.pickup(car, DT, true, TANK_MAX);
  assert.ok(got >= 1, `picked ${got}`);
});

test('the tank does not take dust once it is full', () => {
  const road = makeRoad(5);
  const field = new DustField(road, 5);
  const car = newCar(field.x[3], field.z[3] - NOZZLE - 1.5, 0);
  let got = 0;
  for (let i = 0; i < 240; i++) got += field.pickup(car, DT, true, 0);
  assert.equal(got, 0);
});

test('dust sits on the road and some gathers along the kerbs', () => {
  const road = makeRoad(8);
  const field = new DustField(road, 8);
  assert.ok(field.n > 500, `grains ${field.n}`);
  let edge = 0;
  for (let i = 0; i < field.n; i++) {
    // find the nearest centre-line point and its offset
    const q = road.nearest(field.x[i], field.z[i], null);
    assert.ok(Math.abs(q.d) < 8.5, `grain ${i} off the road at ${q.d}`);
    if (Math.abs(q.d) > 5.5) edge++;
  }
  // a 30% share is placed on the kerbs, so more than the uniform share lands near the edges
  assert.ok(edge > field.n * 0.35 && edge < field.n * 0.6, `edge share ${edge / field.n}`);
});

// ───────── drift charge and boost ─────────
// drive a drift for `secs` (Space held, steer, throttle), releasing Space at the end
function driftRun({ secs, throttle = 1, steer = 0.7, v0 = 9, release = true }) {
  const c = newCar(0, 0, 0); c.vx = v0;
  const d = newDrift();
  const tierAt = [null, null, null];
  let started = 0, t = 0;
  for (let i = 0; i < Math.round(secs / DT); i++, t += DT) {
    stepCar(c, { throttle, brake: 0, hand: 1, steer, amul: d.amul, vmul: d.vmul }, DT);
    stepDrift(d, c, 1, DT);
    for (let k = 0; k < 3; k++) if (tierAt[k] === null && tierOf(d.q) >= k + 1) tierAt[k] = +t.toFixed(2);
  }
  if (release) started = stepDrift(d, c, 0, DT);
  return { d, c, tierAt, started };
}

test('drift charge: a full-throttle drift reaches tiers 1, 2 and 3 at about 1.4, 2.9 and 4.4 s', () => {
  const { tierAt } = driftRun({ secs: 5, release: false });
  assert.ok(Math.abs(tierAt[0] - 1.4) < 0.3, `tier 1 at ${tierAt[0]}`);
  assert.ok(Math.abs(tierAt[1] - 2.9) < 0.3, `tier 2 at ${tierAt[1]}`);
  assert.ok(Math.abs(tierAt[2] - 4.4) < 0.3, `tier 3 at ${tierAt[2]}`);
});

test('partial throttle drifts too briefly to earn a boost', () => {
  const { started } = driftRun({ secs: 6, throttle: 0.2 });
  assert.equal(started, 0);
});

test('releasing after a tier-2 drift starts a boost that eases in and out', () => {
  const c = newCar(0, 0, 0); c.vx = 9;
  const d = newDrift();
  for (let i = 0; i < Math.round(3 / DT); i++) { stepCar(c, { throttle: 1, brake: 0, hand: 1, steer: 0.7, amul: d.amul, vmul: d.vmul }, DT); stepDrift(d, c, 1, DT); }
  const tier = stepDrift(d, c, 0, DT);
  assert.equal(tier, 2);
  assert.equal(d.tier, 2);
  const mults = [];
  for (let i = 0; i < Math.round(1.6 / DT); i++) {
    stepDrift(d, c, 0, DT);
    mults.push(d.amul);
  }
  const at = (s) => mults[Math.round(s / DT)];
  assert.ok(Math.abs(mults[0] - 1) < 0.2, `start ${mults[0]}`);
  assert.ok(Math.abs(Math.max(...mults) - BOOST[2].amul) < 1e-9, `peak ${Math.max(...mults)}`);
  assert.ok(at(0.7) > 1.4, `mid ${at(0.7)}`);
  assert.equal(d.tier, 0);
  assert.equal(d.amul, 1);
  assert.equal(d.vmul, 1);
});

test('the default input (no boost fields) is unchanged by the boost hook', () => {
  const a = newCar(0, 0, 0), b = newCar(0, 0, 0);
  const inp = { throttle: 0.8, brake: 0, hand: 1, steer: 0.5 };
  for (let i = 0; i < 300; i++) {
    stepCar(a, inp, DT);
    stepCar(b, { ...inp, amul: 1, vmul: 1 }, DT);
  }
  assert.equal(a.vx, b.vx); assert.equal(a.z, b.z); assert.equal(a.psi, b.psi);
});

test('a boosted car is faster than top speed but never above 1.3 times it', () => {
  const c = newCar(0, 0, 0);
  for (let i = 0; i < 60 * 10; i++) stepCar(c, { throttle: 1, brake: 0, hand: 0, steer: 0, amul: 1.7, vmul: 1.3 }, DT);
  assert.ok(c.vx > CAR.VMAX * 1.1, `boosted vx ${c.vx}`);
  assert.ok(c.vx < CAR.VMAX * 1.35 + 0.01, `boosted vx ${c.vx}`);
});

test('charge drains only after the 0.6 s grace, at 0.35 per second', () => {
  const d = newDrift();
  d.q = 2;
  const c = newCar(0, 0, 0); c.vx = 8; c.drift = 0;
  for (let i = 0; i < Math.round(0.6 / DT); i++) stepDrift(d, c, 1, DT);
  assert.ok(Math.abs(d.q - 2) < 0.01, `q during grace ${d.q}`);
  for (let i = 0; i < Math.round(1 / DT); i++) stepDrift(d, c, 1, DT);
  assert.ok(Math.abs(d.q - 1.65) < 0.02, `q after 1.6 s ${d.q}`);
});

test('no charge and no boost while Space is up, even in a slide', () => {
  const c = newCar(0, 0, 0); c.vx = 10;
  const d = newDrift();
  let started = 0;
  for (let i = 0; i < 60 * 8; i++) {
    stepCar(c, { throttle: 1, brake: 0, hand: 0, steer: 1, amul: d.amul, vmul: d.vmul }, DT);
    started += stepDrift(d, c, 0, DT);
  }
  assert.equal(started, 0);
  assert.equal(d.q, 0);
});

test('the race emits a boost event only after a charged drift, and never on straight throttle', () => {
  const road = makeRoad(4);
  const race = new Race(road, { skill: 1 });
  const boosts = [];
  for (let i = 0; i < 60 * 25; i++) {
    race.step(DT, { throttle: 1, steer: 0, hand: 0 });
    for (const e of race.events) if (e.type === 'boost') boosts.push(e);
  }
  assert.equal(boosts.length, 0);
});

test('kerb band: a wheel on the kerb lip counts, a wheel on the road or the pavement does not', () => {
  assert.ok(onKerb(8.0));
  assert.ok(onKerb(-8.5));
  assert.ok(!onKerb(7.0));
  assert.ok(!onKerb(9.5));
});

test('the race emits a boost event when a charged drift is released', () => {
  const road = makeRoad(4);
  const race = new Race(road, { skill: 1 });
  const boosts = [];
  const run = (secs, input) => {
    for (let i = 0; i < Math.round(secs / DT); i++) {
      race.step(DT, input);
      for (const e of race.events) if (e.type === 'boost') boosts.push(e);
    }
  };
  run(3.1, {});                                         // countdown
  run(2.5, { throttle: 1 });                            // build speed
  run(3.2, { throttle: 1, steer: 0.7, hand: 1 });       // hold a drift
  run(0.2, { throttle: 1, steer: 0, hand: 0 });         // release
  assert.ok(boosts.length >= 1, 'a boost event came after the release');
  assert.ok(boosts[0].tier >= 1 && boosts[0].dur > 0);
});

test('the opponent never gets a boost, so its lap times do not depend on the drift code', () => {
  const road = makeRoad(11, { length: 640 });
  const race = new Race(road, { skill: 0.95 });
  let guard = 0;
  while (!race.ai.finished && guard++ < 60 * 200) race.step(DT, {});
  assert.ok(Math.abs(race.ai.time - 55) < 12, `ai lap ${race.ai.time}`);
  assert.equal(race.drift.q, 0);
});

// ───────── racing club layout ─────────
test('club layout: every part is present, nothing solid is near the track, and footprints are disjoint', () => {
  const counts = { garages: [], stands: [], masts: [] };
  for (let seed = 1; seed <= 20; seed++) {
    const road = makeRoad(seed, { length: 600 + ((seed * 37) % 121) });
    const t0 = performance.now();
    const L = layoutClub(road);
    const ms = performance.now() - t0;
    assert.ok(ms < 150, `seed ${seed}: layout took ${ms.toFixed(0)} ms`);
    assert.ok(L.clubhouse && L.tower, `seed ${seed}: clubhouse and tower`);
    assert.ok(L.garages.length >= 3 && L.stands.length >= 3 && L.masts.length >= 1, `seed ${seed}: counts`);
    assert.ok(L.lamps.length > 20, `seed ${seed}: lamps ${L.lamps.length}`);
    for (const o of L.solids) {
      // the robots reach about 24.5 from the centre line, so nothing solid may be closer than 25
      assert.ok(clearance(o, road) >= 25, `seed ${seed}: ${o.kind} is ${clearance(o, road).toFixed(1)} from the track`);
    }
    for (let i = 0; i < L.solids.length; i++) {
      for (let j = i + 1; j < L.solids.length; j++) {
        assert.ok(!rectsTouch(L.solids[i], L.solids[j], 0), `seed ${seed}: ${L.solids[i].kind} overlaps ${L.solids[j].kind}`);
      }
    }
    assert.ok(L.skyline.length >= 25 && L.skyline.length <= CLUB.SKYLINE, `skyline ${L.skyline.length}`);
    counts.garages.push(L.garages.length); counts.stands.push(L.stands.length); counts.masts.push(L.masts.length);
  }
  const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  assert.ok(median(counts.stands) >= 4, `median stands ${median(counts.stands)}`);
  assert.ok(median(counts.garages) >= 5, `median garages ${median(counts.garages)}`);
});

test('club layout: the barrier is left out only on the inside of a tight bend', () => {
  const road = makeRoad(4, { length: 640 });
  const L = layoutClub(road);
  const tight = 1 / CLUB.BARRIER_MIN_RADIUS;
  let gaps = 0;
  for (let i = 0; i < road.n; i++) {
    if (!L.barrierNeg[i]) { gaps++; assert.ok(road.k[i] > tight, 'a -d gap needs a tight bend with its centre on that side'); }
    if (!L.barrierPos[i]) { gaps++; assert.ok(road.k[i] < -tight, 'a +d gap needs a tight bend with its centre on that side'); }
  }
  assert.ok(gaps < road.n * 0.2, `gaps ${gaps}`);
});

test('club layout is the same every time for the same road', () => {
  const a = layoutClub(makeRoad(9, { length: 650 })), b = layoutClub(makeRoad(9, { length: 650 }));
  assert.equal(a, b); // memoised
  assert.equal(a.garages.length, b.garages.length);
});

// ───────── graphics quality ─────────
const frames = (g, secs, fps) => { let level = null; for (let i = 0; i < secs * fps; i++) { const r = g.update(1 / fps); if (r !== null) level = r; } return level; };

test('quality: a steady 60 fps never lowers the graphics', () => {
  const g = new QualityGovernor();
  assert.equal(frames(g, 30, 60), null);
  assert.equal(g.level, 2);
});

test('quality: slow frames drop one level at a time, down to low, and it never climbs back by itself', () => {
  const g = new QualityGovernor();
  const seen = [];
  for (let i = 0; i < 20 * 15; i++) { const r = g.update(1 / 15); if (r !== null) seen.push(r); }
  assert.deepEqual(seen, [1, 0]);
  assert.equal(g.level, 0);
  assert.equal(frames(g, 20, 120), null); // a fast machine afterwards changes nothing
  assert.equal(g.level, 0);
});

test('quality: the start-up is ignored, and so are frames from a sleeping tab', () => {
  const g = new QualityGovernor();
  assert.equal(frames(g, 2.4, 10), null); // slow, but still inside the warm-up
  assert.equal(g.level, 2);
  const h = new QualityGovernor();
  for (let i = 0; i < 50; i++) assert.equal(h.update(3), null); // 3 s frames: a hidden tab
  assert.equal(h.level, 2);
});

test('quality: a fixed mode ignores frame time, and cycling visits every mode', () => {
  const g = new QualityGovernor({ mode: 'medium' });
  assert.equal(g.level, 1);
  assert.equal(frames(g, 30, 5), null);
  assert.equal(g.level, 1);
  const seen = [];
  for (let i = 0; i < MODES.length; i++) seen.push(g.cycle());
  assert.deepEqual(seen, ['low', 'auto', 'high', 'medium']);
  assert.equal(new QualityGovernor({ mode: 'low' }).level, 0);
  assert.equal(new QualityGovernor({ mode: 'high' }).level, 2);
});

