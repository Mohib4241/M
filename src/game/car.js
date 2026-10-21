// Car dynamics: a single-track (bicycle) model with tyre grip limits. The front tyres grip
// and steer, the rear tyres can break loose, so the handbrake makes the robot slide.
// Pure maths, no rendering. Units: 1 unit = 10 cm, speeds in units per second (u/s).
// Body frame: forward is (sin psi, cos psi) in (x, z); +vy is toward the car's +x side.
import { clamp, wrapAngle } from './rng.js';

export const CAR = {
  A: 2.1, B: 2.1, K: 4.4, // distance from the centre to each axle, and yaw inertia / mass
  CF: 40, CR: 55, CR_DRIFT: 12, // tyre stiffness (accel per radian of slip)
  AMAX_F: 24, AMAX_R: 24, AMAX_R_DRIFT: 6, // grip limits (u/s^2); the rear lets go under the handbrake
  ENGINE: 14, VMAX: 13, // top speed 1.3 m/s, close to the CC1 Pro's published 1.2 m/s
  BRAKE: 20, HAND_DECEL: 3, ROLL: 0.5,
  STEER: 0.52, STEER_RATE: 2.6, // max wheel angle (rad) and how fast it turns
  RADIUS: 2.6, // for car-to-car contact
  H: 1 / 120, // fixed physics step
};

export function newCar(x, z, psi) {
  return { x, z, psi, vx: 0, vy: 0, r: 0, delta: 0, spin: 0, spinL: 0, spinR: 0, drift: 0, aLat: 0 };
}

/** Advance the car by dt seconds. input: { throttle 0..1, brake 0..1, hand 0|1, steer -1..1 }. */
export function stepCar(c, input, dt, surf = { grip: 1, vcap: 1 }) {
  const n = Math.max(1, Math.ceil(Math.min(dt, 1 / 20) / CAR.H));
  const h = Math.min(dt, 1 / 20) / n;
  for (let i = 0; i < n; i++) integrate(c, input, h, surf);
  return c;
}

function integrate(c, inp, h, surf) {
  const speed = Math.abs(c.vx);
  // wheels only grip once they are rolling
  const roll = Math.min(1, speed / 1.2);
  // steering: the wheel follows the input with a rate limit; the lock shrinks at speed
  const maxD = CAR.STEER * (1 - 0.35 * Math.min(1, speed / CAR.VMAX));
  const want = clamp(inp.steer, -1, 1) * maxD;
  c.delta += clamp(want - c.delta, -CAR.STEER_RATE * h, CAR.STEER_RATE * h);

  const hand = inp.hand ? 1 : 0;
  const cr = (hand ? CAR.CR_DRIFT : CAR.CR) * surf.grip;
  const aMaxF = CAR.AMAX_F * surf.grip;
  const aMaxR = (hand ? CAR.AMAX_R_DRIFT : CAR.AMAX_R) * surf.grip;
  // slip angles; the denominator is floored so a slow car does not get huge slip
  const vxs = c.vx >= 0 ? Math.max(c.vx, 1.5) : Math.min(c.vx, -1.5);
  const alphaF = Math.atan2(c.vy + CAR.A * c.r, vxs) - c.delta;
  const alphaR = Math.atan2(c.vy - CAR.B * c.r, vxs);
  const fF = clamp(-CAR.CF * surf.grip * roll * alphaF, -aMaxF, aMaxF);
  const fR = clamp(-cr * roll * alphaR, -aMaxR, aMaxR);
  const cd = Math.cos(c.delta);
  const vyDot = fF * cd + fR - c.vx * c.r;
  const rDot = (CAR.A * fF * cd - CAR.B * fR) / CAR.K;

  // along the car: engine, brake, handbrake, rolling resistance
  // a drift boost (from the drift charge) raises engine force and top speed; both are 1 without one
  const vcap = CAR.VMAX * surf.vcap * (inp.vmul ?? 1);
  let ax = 0;
  if (inp.throttle > 0) ax += CAR.ENGINE * (inp.amul ?? 1) * inp.throttle * Math.max(0, 1 - c.vx / vcap);
  // S is the front brake: it slows a moving robot and holds it at a stop, it never reverses
  if (inp.brake > 0 && c.vx > 0) ax -= CAR.BRAKE * inp.brake;
  if (hand && speed > 0.2) ax -= CAR.HAND_DECEL * Math.sign(c.vx);
  if (speed > 0.05) ax -= CAR.ROLL * Math.sign(c.vx);

  const prevVx = c.vx;
  c.vx += (ax + c.vy * c.r) * h;
  // a brake or roll-off stops the car, it does not push it backwards
  if (inp.throttle <= 0 && prevVx * c.vx < 0) c.vx = 0;
  if (inp.brake > 0 && c.vx < 0) c.vx = 0;
  c.vy += vyDot * h;
  c.r += rDot * h;
  c.x += (c.vx * Math.sin(c.psi) + c.vy * Math.cos(c.psi)) * h;
  c.z += (c.vx * Math.cos(c.psi) - c.vy * Math.sin(c.psi)) * h;
  c.psi = wrapAngle(c.psi + c.r * h);

  c.aLat = fF + fR;
  // how hard the rear is sliding (0..1), for skid marks and the screech
  c.drift = speed > 3 ? Math.min(1, Math.abs(alphaR) / 0.25) : 0;
  // distance rolled by each drive wheel. The outside wheel of a turn covers more ground, because
  // these robots steer by running their two wheels at different speeds.
  c.spin += c.vx * h;
  c.spinL += (c.vx + c.r * 1.9) * h;
  c.spinR += (c.vx - c.r * 1.9) * h;
}

/**
 * Two cars touching: push them apart, and if they are closing, exchange momentum (a little bounce).
 * A faster car behind a slower one therefore pushes it on, rather than both slowing to a crawl.
 */
export function contact(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const d = Math.hypot(dx, dz);
  const min = CAR.RADIUS * 2;
  if (d >= min || d < 1e-6) return false;
  const nx = dx / d, nz = dz / d;
  const push = (min - d) / 2;
  a.x -= nx * push; a.z -= nz * push;
  b.x += nx * push; b.z += nz * push;
  // world velocities of both cars, then the closing speed along the line between them
  const va = world(a), vb = world(b);
  const vn = (vb.x - va.x) * nx + (vb.z - va.z) * nz;
  if (vn < 0) {
    const e = 0.3; // restitution: a little bounce
    const j = (-(1 + e) * vn) / 2; // equal masses
    va.x -= j * nx; va.z -= j * nz;
    vb.x += j * nx; vb.z += j * nz;
    setBody(a, va); setBody(b, vb);
  }
  return true;
}

function world(c) {
  const s = Math.sin(c.psi), k = Math.cos(c.psi);
  return { x: c.vx * s + c.vy * k, z: c.vx * k - c.vy * s };
}

function setBody(c, v) {
  const s = Math.sin(c.psi), k = Math.cos(c.psi);
  c.vx = v.x * s + v.z * k;
  c.vy = v.x * k - v.z * s;
}
