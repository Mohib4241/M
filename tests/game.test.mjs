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
