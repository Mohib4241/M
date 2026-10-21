// Seeded random numbers (mulberry32). The same seed always gives the same road and dust,
// so a lap can be replayed and the tests can check exact behaviour.
export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + (hi - lo) * next();
  next.int = (lo, hi) => Math.floor(next() * (hi - lo + 1)) + lo; // both ends included
  return next;
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
