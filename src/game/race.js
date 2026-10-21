// One lap: the robot you chose against the other robot, on one random road. Pure logic, no
// rendering, so it can be tested. Time is measured from the start signal; the cars wait on the
// grid during the countdown.
import { newCar, stepCar, contact } from './car.js';
import { driverInput } from './ai.js';
import { DustField, TANK_MAX } from './dust.js';
import { newDrift, stepDrift, BOOST } from './drift.js';
import { lapDelta, ROAD_W, KERB_W, PAVE_W } from './track.js';

export const COUNTDOWN = 3; // seconds before the start signal
export const TIME_LIMIT = 100; // a lap that takes longer than this is not finished
export const EDGE = ROAD_W / 2 + KERB_W + PAVE_W + 7; // the play area ends here

/** Grip and speed cap by how far the robot is from the road centre. */
export function surfaceAt(d) {
  const a = Math.abs(d);
  if (a <= ROAD_W / 2) return { name: 'road', grip: 1, vcap: 1 };
  if (a <= ROAD_W / 2 + KERB_W) return { name: 'kerb', grip: 0.95, vcap: 1 };
  if (a <= ROAD_W / 2 + KERB_W + PAVE_W) return { name: 'pavement', grip: 0.7, vcap: 0.7 };
  return { name: 'grass', grip: 0.45, vcap: 0.5 };
}

export class Race {
  constructor(road, { skill = 0.95, dustSeed = road.seed || 1 } = {}) {
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

    const p0 = road.pointAt(0);
    const psi0 = Math.atan2(p0.tx, p0.tz);
    // the player starts on the right of the line, the opponent on the left
    const lx = p0.tz, lz = -p0.tx; // sideways unit vector (the car's +x)
    this.player = this._racer('player', p0.x - lx * 2.4, p0.z - lz * 2.4, psi0);
    this.ai = this._racer('ai', p0.x + lx * 2.4, p0.z + lz * 2.4, psi0);
  }

  _racer(kind, x, z, psi) {
    const car = newCar(x, z, psi);
    const near = this.road.nearest(x, z, null);
    return { kind, car, hint: near.s, p: 0, finished: false, time: null, place: null, pos: near.s };
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

    const P = this.player, A = this.ai;
    const playerInput = P.finished
      ? { throttle: 0, brake: 0.4, hand: 0, steer: 0 } // roll to a stop after the line
      : { throttle: input.throttle || 0, brake: input.brake || 0, hand: input.hand ? 1 : 0, steer: input.steer || 0 };
    // a boost from the last step reaches the physics as multipliers; the opponent never gets one
    playerInput.amul = this.drift.amul;
    playerInput.vmul = this.drift.vmul;
    this._drive(P, dt, playerInput);
    const tier = stepDrift(this.drift, P.car, playerInput.hand, dt);
    if (tier) this.events.push({ type: 'boost', tier, dur: BOOST[tier].dur });
    this._drive(A, dt, A.finished ? { throttle: 0, brake: 0.4, hand: 0, steer: 0 }
      : driverInput(A.car, this.road, A.hint, this.skill));
    contact(P.car, A.car);

    // dust: only the player's robot has the vacuum on
    if (!P.finished) {
      const got = this.dust.pickup(P.car, dt, !!input.pick, this.room);
      if (got) { this.tank += got; this.events.push({ type: 'pickup', count: got }); }
    }

    for (const r of [P, A]) {
      if (!r.finished && r.p >= this.L) {
        r.finished = true;
        r.time = this.clock;
        r.place = ++this.placed;
        this.events.push({ type: 'finish', kind: r.kind, place: r.place, time: r.time });
      }
    }
    if ((P.finished && A.finished) || this.clock >= TIME_LIMIT) {
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
    const row = (r) => ({ kind: r.kind, finished: r.finished, time: r.finished ? r.time : null, place: r.place });
    return { player: row(this.player), ai: row(this.ai), dust: this.tank, dustSeen: this.dust.taken };
  }
}


