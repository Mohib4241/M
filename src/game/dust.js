// Dust on the road and the vacuum that picks it up. Holding the pickup key turns the suction
// on: dust inside the mouth in front of the robot is pulled to the nozzle and taken into the tank.
// Dust that is only driven past stays on the floor.
import { rng } from './rng.js';
import { ROAD_W } from './track.js';

export const NOZZLE = 4.0; // forward of the robot's centre, where the mouth opens
export const MOUTH = { f0: NOZZLE - 1.4, f1: NOZZLE + 5, half: 2.4 }; // mouth in front of the robot
export const TANK_MAX = 150;
const PULL = 18; // faster than the top speed, so dust just behind the nozzle is still caught
const FLOOR = 0, SUCKING = 1, TAKEN = 2;

export class DustField {
  constructor(road, seed, density = 0.075) {
    const r = rng(seed * 31 + 5);
    const n = Math.round(road.length * ROAD_W * density);
    this.n = n;
    this.x = new Float32Array(n);
    this.z = new Float32Array(n);
    this.size = new Float32Array(n);
    this.tint = new Float32Array(n);
    this.state = new Uint8Array(n);
    this.changed = new Uint8Array(n); // set when a grain moved or was taken, so the renderer updates it
    this.taken = 0;
    for (let i = 0; i < n; i++) {
      const s = r.range(0, road.length);
      // some dust gathers along the kerbs, the rest is spread across the road
      const edge = r() < 0.3;
      const d = edge ? (r() < 0.5 ? -1 : 1) * r.range(5.6, 7.6) : r.range(-7.4, 7.4);
      const p = road.pointAt(s);
      this.x[i] = p.x + d * p.tz;
      this.z[i] = p.z - d * p.tx;
      this.size[i] = 0.06 + r() * 0.08; // fine grains
      this.tint[i] = r();
    }
  }

  get remaining() { return this.n - this.taken; }

  /**
   * Advance the suction by dt. `pick` is true while the pickup key is held; `room` is how much the
   * tank can still take. Returns how many grains went into the tank this step.
   */
  pickup(car, dt, pick, room) {
    const sx = Math.sin(car.psi), cs = Math.cos(car.psi);
    const nx = car.x + sx * NOZZLE, nz = car.z + cs * NOZZLE;
    const active = pick && room > 0;
    let got = 0;
    for (let i = 0; i < this.n; i++) {
      const st = this.state[i];
      if (st === TAKEN) continue;
      if (st === FLOOR) {
        if (!active) continue;
        const dx = this.x[i] - car.x, dz = this.z[i] - car.z;
        const f = dx * sx + dz * cs; // forward of the robot's centre
        const l = dx * cs - dz * sx; // sideways of the robot's centre
        if (f < MOUTH.f0 || f > MOUTH.f1 || Math.abs(l) > MOUTH.half) continue;
        this.state[i] = SUCKING;
      } else if (!active) {
        this.state[i] = FLOOR; // let go when the key is released or the tank is full
        continue;
      }
      const ex = nx - this.x[i], ez = nz - this.z[i];
      const dist = Math.hypot(ex, ez);
      if (dist < 0.9) {
        this.state[i] = TAKEN;
        this.changed[i] = 1;
        got++;
        continue;
      }
      const step = Math.min(dist, PULL * dt);
      this.x[i] += (ex / dist) * step;
      this.z[i] += (ez / dist) * step;
      this.changed[i] = 1;
    }
    this.taken += got;
    return got;
  }

  /** How many grains are being sucked up right now (for the sound and the mouth glow). */
  get sucking() {
    let c = 0;
    for (let i = 0; i < this.n; i++) if (this.state[i] === SUCKING) c++;
    return c;
  }
}

export { FLOOR, SUCKING, TAKEN };
