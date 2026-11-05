// One lap: the robot you chose against every other robot, on one random road. Pure logic, no
// rendering, so it can be tested. Time is measured from the start signal; the cars wait on a
// staggered grid during the countdown, one behind the other in two lanes, the player at the back.
import { newCar, stepCar, contact, CAR } from './car.js';
import { driverInput } from './ai.js';
import { DustField, TANK_MAX } from './dust.js';
import { newDrift, stepDrift, BOOST } from './drift.js';
import { lapDelta, ROAD_W, KERB_W, PAVE_W } from './track.js';

export const COUNTDOWN = 3; // seconds before the start signal
export const TIME_LIMIT = 100; // a lap that takes longer than this is not finished
export const EDGE = ROAD_W / 2 + KERB_W + PAVE_W + 7; // the play area ends here
export const GRID_GAP = 8; // how far each grid slot is behind the one before (the other lane), in units
export const GRID_LANE = 4; // how far each lane is from the centre line
export const GRACE = 12; // seconds the others get to finish after the player has

/** Grip and speed cap by how far the robot is from the road centre. */
export function surfaceAt(d) {
  const a = Math.abs(d);
  if (a <= ROAD_W / 2) return { name: 'road', grip: 1, vcap: 1 };
  if (a <= ROAD_W / 2 + KERB_W) return { name: 'kerb', grip: 0.95, vcap: 1 };
  if (a <= ROAD_W / 2 + KERB_W + PAVE_W) return { name: 'pavement', grip: 0.7, vcap: 0.7 };
  return { name: 'grass', grip: 0.45, vcap: 0.5 };
}

export class Race {
  /**
   * opps: the opponents, [{ id, skill, offset, r }] (default one, as before). playerR: the player's
   * size for bumping. Each racer has a size `r`, so a big robot shoves a small one aside.
   */
  constructor(road, { skill = 0.95, dustSeed = road.seed || 1, opps = null, playerId = 'player', playerR = null } = {}) {
    this.road = road;
    this.L = road.length;
    this.skill = skill;
    this.clock = -COUNTDOWN;
    this.over = false;
    this.events = [];
    this.placed = 0;
    this.dust = new DustField(road, dustSeed);
    this.tank = 0;
    this.drift = newDrift(); // the player's drift charge and boost

    // the grid: slot 0 on the line, each next slot a little further back in the other lane
    // (called without `opps`, it is the old two-robot lap: both side by side on the line)
    const list = opps || [{ id: 'ai', skill }];
    const n = list.length + 1, pair = !opps;
    this.opps = list.map((o, i) => this._racer('ai', pair ? { back: 0, lane: 2.4 } : i, o.id, o.r, { skill: o.skill ?? skill, offset: o.offset ?? 0 }));
    this.player = this._racer('player', pair ? { back: 0, lane: -2.4 } : n - 1, playerId, playerR, {});
    this.ai = this.opps[0]; // the first opponent, under its old name
    this.racers = [...this.opps, this.player];
    this.playerFinishAt = null;
  }

  /** A racer in grid slot `slot`: lane alternates, each slot GRID_GAP further back. */
  _racer(kind, slot, id, r, drive) {
    const { back, lane } = typeof slot === 'number'
      ? { back: slot * GRID_GAP, lane: slot % 2 ? -GRID_LANE : GRID_LANE } // odd slots on the right
      : slot;
    const s = ((-back % this.L) + this.L) % this.L;
    const p0 = this.road.pointAt(s);
    const lx = p0.tz, lz = -p0.tx; // sideways unit vector (the car's +x)
    const x = p0.x + lx * lane, z = p0.z + lz * lane;
    const car = newCar(x, z, Math.atan2(p0.tx, p0.tz));
    car.size = r || CAR.RADIUS; // (car.r is the yaw rate)
    const near = this.road.nearest(x, z, s);
    // progress starts behind zero, so every racer covers the same distance to the line
    return { kind, id, slot, car, hint: near.s, p: -back, finished: false, time: null, place: null, pos: near.s, ...drive };
  }

  /** Where each racer is now: finished ones by their place, the rest by how far round they are. */
  order() {
    return [...this.racers].sort((a, b) => (a.finished || b.finished
      ? (a.finished ? a.place : 1e9) - (b.finished ? b.place : 1e9)
      : b.p - a.p));
  }

  get room() { return TANK_MAX - this.tank; }

  /**
   * Advance by dt. input: { throttle, brake, hand, steer, pick } for the player; the opponent
   * drives itself. Returns this race (events are in this.events).
   */
  step(dt, input = {}) {
    this.events = [];
    if (this.over) return this;
    this.clock += dt;
    if (this.clock < 0) return this;

    const P = this.player;
    const playerInput = P.finished
      ? { throttle: 0, brake: 0.4, hand: 0, steer: 0 } // roll to a stop after the line
      : { throttle: input.throttle || 0, brake: input.brake || 0, hand: input.hand ? 1 : 0, steer: input.steer || 0 };
    // a boost from the last step reaches the physics as multipliers; the opponent never gets one
    playerInput.amul = this.drift.amul;
    playerInput.vmul = this.drift.vmul;
    this._drive(P, dt, playerInput);
    const tier = stepDrift(this.drift, P.car, playerInput.hand, dt);
    if (tier) this.events.push({ type: 'boost', tier, dur: BOOST[tier].dur });
    for (const A of this.opps) {
      this._drive(A, dt, A.finished ? { throttle: 0, brake: 0.4, hand: 0, steer: 0 }
        : driverInput(A.car, this.road, A.hint, A.skill, A.offset));
    }
    // every pair can bump
    const R = this.racers;
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) contact(R[i].car, R[j].car);

    // dust: only the player's robot has the vacuum on
    if (!P.finished) {
      const got = this.dust.pickup(P.car, dt, !!input.pick, this.room);
      if (got) { this.tank += got; this.events.push({ type: 'pickup', count: got }); }
    }

    for (const r of R) {
      if (!r.finished && r.p >= this.L) {
        r.finished = true;
        r.time = this.clock;
        r.place = ++this.placed;
        this.events.push({ type: 'finish', kind: r.kind, id: r.id, place: r.place, time: r.time });
        if (r === P) this.playerFinishAt = this.clock;
      }
    }
    const allIn = R.every((r) => r.finished);
    const graceOver = this.playerFinishAt !== null && this.clock - this.playerFinishAt >= GRACE;
    if (allIn || graceOver || this.clock >= TIME_LIMIT) {
      this.over = true;
      this.events.push({ type: 'over' });
    }
    return this;
  }

  _drive(r, dt, inp) {
    const road = this.road;
    const before = road.nearest(r.car.x, r.car.z, r.hint);
    stepCar(r.car, inp, dt, surfaceAt(before.d));
    const after = road.nearest(r.car.x, r.car.z, before.s);
    // a robot that runs off the play area is turned back onto the grass line
    if (Math.abs(after.d) > EDGE) {
      const over = Math.abs(after.d) - EDGE;
      const sgn = Math.sign(after.d);
      const p = road.pointAt(after.s);
      r.car.x -= sgn * over * p.tz;
      r.car.z += sgn * over * p.tx;
      r.car.vx *= 0.6;
      r.car.vy *= 0.6;
    }
    r.p += lapDelta(before.s, after.s, this.L);
    r.hint = after.s;
    r.pos = after.s;
    r.d = after.d;
    r.surf = surfaceAt(after.d).name;
  }

  /** Finishing order and times for the lap (unfinished robots are listed last). */
  result() {
    const row = (r) => ({ kind: r.kind, id: r.id, finished: r.finished, time: r.finished ? r.time : null, place: r.place });
    // everyone, in finishing order (robots that did not finish come last, by how far they got)
    const all = this.order().map(row);
    return { player: row(this.player), ai: row(this.ai), all, dust: this.tank, dustSeen: this.dust.taken };
  }
}


