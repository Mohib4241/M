// Opponent driver: pure pursuit on the road centre line. It steers toward a point a little
// way ahead and sets its speed from the sharpest bend it can see, so it slows for corners.
import { CAR } from './car.js';
import { clamp } from './rng.js';

const LAT_SAFE = 16; // lateral accel the driver allows itself (below the car's grip limit)

/** Returns the same input shape the player sends to stepCar. */
export function driverInput(car, road, hint, skill, offset = 0) {
  const { s } = road.nearest(car.x, car.z, hint);
  const speed = Math.max(0, car.vx);
  const look = 4.5 + 0.5 * speed;
  // aim at the centre line ahead, nudged sideways to keep off the other robot's line
  const aim = road.pointAt(s + look);
  const tx = aim.x + aim.tz * offset, tz = aim.z - aim.tx * offset;
  const dx = tx - car.x, dz = tz - car.z;
  const lat = dx * Math.cos(car.psi) - dz * Math.sin(car.psi);
  const ahead2 = dx * dx + dz * dz || 1e-6;
  const curvature = (2 * lat) / ahead2;
  const wantDelta = Math.atan(curvature * (CAR.A + CAR.B));
  const maxD = CAR.STEER * (1 - 0.35 * Math.min(1, speed / CAR.VMAX));
  const steer = clamp(wantDelta / maxD, -1, 1);

  // speed: the sharpest bend in the next stretch sets the limit
  let kmax = 0;
  for (const ahead of [6, 12, 18, 26]) kmax = Math.max(kmax, Math.abs(road.pointAt(s + ahead).k));
  const vTarget = Math.min(CAR.VMAX * skill, Math.sqrt(LAT_SAFE / Math.max(kmax, 1e-3)));
  const throttle = speed < vTarget ? 1 : 0;
  const brake = speed > vTarget + 1 ? clamp((speed - vTarget) / 3, 0, 1) : 0;
  return { throttle: throttle * (1 - brake), brake, hand: 0, steer };
}

