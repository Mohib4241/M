// Smooth drawing on screens faster than the simulation. The race steps at 60 Hz; a 120 or 144 Hz
// screen would show the same picture two or three times and then jump. So each frame draws the
// state between the last two steps instead (the one step of delay is not noticeable). Pure
// functions, so the node tests can check them.
import { wrapAngle } from './rng.js';

const FIELDS = ['x', 'z', 'psi', 'vx', 'vy', 'r', 'spinL', 'spinR', 'aLat', 'drift'];

/** Copy the drawn fields of a car state into `out` (made if missing). */
export function snapshot(c, out = {}) {
  for (const k of FIELDS) out[k] = c[k];
  return out;
}

/** out = a + (b - a) * t, going the short way round for the heading. */
export function lerpState(a, b, t, out = {}) {
  for (const k of FIELDS) out[k] = a[k] + (b[k] - a[k]) * t;
  out.psi = a.psi + wrapAngle(b.psi - a.psi) * t;
  return out;
}
