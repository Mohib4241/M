// Drift charge and boost. Pure logic, no rendering, so the node tests can check it.
// A drift charges while Space is held and the rear is sliding well; releasing Space turns the
// charge into a boost of tier 1, 2 or 3. The boost raises engine force and top speed by multipliers.
export const GOOD_DRIFT = 0.4; // car.drift at or above this counts as drifting
export const GOOD_SPEED = 4; // u/s (0.4 m/s): a crawl does not charge
export const GRACE = 0.6; // s after a good drift ends before the charge starts to drain
export const DRAIN = 0.35; // charge lost per second after the grace
export const CHARGE_MAX = 4.5; // seconds of charge the bar can hold
export const TIER_AT = [1.0, 2.5, 4.0]; // charge (s) needed for tiers 1, 2, 3
export const RAMP_IN = 0.15, RAMP_OUT = 0.3; // s to ease a boost in and out
// index = tier; tier 0 is no boost
export const BOOST = [
  { dur: 0, amul: 1, vmul: 1 },
  { dur: 1.2, amul: 1.6, vmul: 1.15 }, // blue
  { dur: 1.6, amul: 1.8, vmul: 1.25 }, // orange
  { dur: 2.0, amul: 2.0, vmul: 1.35 }, // pink
];

export function newDrift() {
  return { q: 0, grace: 0, hand: 0, tier: 0, bt: 0, amul: 1, vmul: 1 };
}

export function tierOf(q) {
  return q >= TIER_AT[2] ? 3 : q >= TIER_AT[1] ? 2 : q >= TIER_AT[0] ? 1 : 0;
}

/**
 * Call once per physics step, after stepCar. hand: 1 while Space is held. Returns the tier of a
 * boost that starts on this step (a release with a tier reached), else 0. Writes d.amul and d.vmul
 * for the next step. Allocates nothing.
 */
export function stepDrift(d, car, hand, dt) {
  let started = 0;
  const speed = Math.abs(car.vx);
  if (d.hand && !hand) { // release
    const tier = tierOf(d.q);
    d.q = 0; d.grace = 0;
    if (tier) { d.tier = tier; d.bt = 0; started = tier; }
  }
  d.hand = hand;
  if (hand && car.drift >= GOOD_DRIFT && speed >= GOOD_SPEED) {
    d.q = Math.min(CHARGE_MAX, d.q + dt * (0.5 + 0.5 * car.drift));
    d.grace = 0;
  } else {
    d.grace += dt;
    if (d.grace > GRACE) d.q = Math.max(0, d.q - dt * DRAIN);
  }
  let lvl = 0;
  if (d.tier) {
    d.bt += dt;
    const B = BOOST[d.tier];
    if (d.bt >= B.dur) d.tier = 0;
    else lvl = Math.max(0, Math.min(1, d.bt / RAMP_IN, (B.dur - d.bt) / RAMP_OUT));
  }
  const B = BOOST[d.tier];
  d.amul = 1 + (B.amul - 1) * lvl;
  d.vmul = 1 + (B.vmul - 1) * lvl;
  return started;
}

/** Scrape test for a wheel: its lateral offset from the centre line (u), in the kerb band. */
export const KERB_BAND = [7.9, 8.8]; // ROAD_W/2 - 0.1 .. ROAD_W/2 + KERB_W
export function onKerb(wheelD) {
  const a = Math.abs(wheelD);
  return a >= KERB_BAND[0] && a <= KERB_BAND[1];
}
