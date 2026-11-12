// Body mirror: turns the 33 body points of a pose tracker into a pose for the humanoid, like a mirror.
// You face the camera and the robot faces you: raise your right arm and the arm on the same side of the
// screen goes up (the robot's left); turn round and the robot turns round.
//
// Input: `world`, 33 points [x, y, z] in metres from the middle of the hips, in the tracker's frame
// (x to the right of the camera picture, y down, z away from the camera), and `vis`, how sure the tracker
// is of each point (0 to 1). Output: { yaw, lift, q: { joint: Quaternion } } for Stage.setPose. Each
// rotation is in the robot's own frame after the turn (yaw) has been taken out.
//
// The whole body is followed: head (up, down, left, right, tilt), torso (lean and twist), both arms and
// hands, both legs and feet, and where you stand (`place` and `moveFrom`, from the picture points).
import * as THREE from 'three';

// the tracker's point numbers
const NOSE = 0, EAR_L = 7, EAR_R = 8, SH_L = 11, SH_R = 12, EL_L = 13, EL_R = 14, WR_L = 15, WR_R = 16;
const PK_L = 17, PK_R = 18, IX_L = 19, IX_R = 20;
const HIP_L = 23, HIP_R = 24, KN_L = 25, KN_R = 26, AN_L = 27, AN_R = 28, HL_L = 29, HL_R = 30, TOE_L = 31, TOE_R = 32;
// The robot's left (+X when it faces you) copies your right side, as a mirror does.
const SIDE = {
  L: { sh: SH_R, el: EL_R, wr: WR_R, pk: PK_R, ix: IX_R, hip: HIP_R, kn: KN_R, an: AN_R, hl: HL_R, toe: TOE_R, ear: EAR_R },
  R: { sh: SH_L, el: EL_L, wr: WR_L, pk: PK_L, ix: IX_L, hip: HIP_L, kn: KN_L, an: AN_L, hl: HL_L, toe: TOE_L, ear: EAR_L },
};

const SEEN = 0.5; // below this the tracker is guessing: that limb rests
const SEEN_LEG = 0.6;
const DOWN = new THREE.Vector3(0, -1, 0), UPV = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rad = (d) => (d * Math.PI) / 180;

const v = (p, out) => out.set(-p[0], -p[1], -p[2]); // the mirror: left-right, up-down and depth all flip sign

/** Limit a rotation to `max` radians from rest. */
function limit(q, max) {
  const a = 2 * Math.acos(clamp(Math.abs(q.w), -1, 1));
  if (a > max) q.slerp(new THREE.Quaternion(), 1 - max / a);
  return q;
}

/** Turn direction `from` toward `to`, by `max` radians at most. Both are unit vectors; `to` is changed. */
function within(from, to, max) {
  const a = from.angleTo(to);
  if (a > max) {
    const axis = new THREE.Vector3().crossVectors(from, to);
    if (axis.lengthSq() < 1e-8) return to.copy(from);
    to.copy(from).applyAxisAngle(axis.normalize(), max);
  }
  return to;
}

// The nose sits in front of the ears and a little below them: this much (radians) is "looking level".
export const NOSE_DROP = 0.2;

/**
 * Rest lengths of the robot, used to keep its feet on the floor: `thigh` and `shin` in the robot's units.
 * `seen` says which regions the camera could follow this frame; the rest stand still.
 * @returns {{ yaw: number, lift: number, q: Object<string, THREE.Quaternion>, seen: { head: boolean, torso: boolean, arms: boolean[], hands: boolean[], legs: boolean[], feet: boolean[], all: boolean } } | null}
 */
export function solvePose(world, vis, { thigh = 3, shin = 3 } = {}) {
  if (!world || world.length < 29) return null;
  const ok = (i, min = SEEN) => !vis || (vis[i] ?? 1) >= min;
  if (!ok(SH_L) || !ok(SH_R)) return null; // no shoulders, no body

  const P = (i) => v(world[i], new THREE.Vector3());
  const hipsSeen = ok(HIP_L) && ok(HIP_R);
  // the turn: the line through the shoulders, seen from above. With the hips in view the turn is taken from
  // between the hips and the shoulders, and the twist between the two goes to the waist.
  const across = P(SIDE.L.sh).sub(P(SIDE.R.sh));
  if (hipsSeen) {
    const hips = P(SIDE.L.hip).sub(P(SIDE.R.hip));
    hips.y = 0; across.y = 0;
    if (hips.lengthSq() > 1e-6 && across.lengthSq() > 1e-6 && hips.normalize().dot(across.normalize()) > 0) across.add(hips);
  }
  const yaw = Math.atan2(-across.z, across.x);
  const unYaw = new THREE.Quaternion().setFromAxisAngle(UPV, -yaw);
  const L = (i) => P(i).applyQuaternion(unYaw); // a point in the robot's own frame

  const q = {};
  // the hips turn on their own under a twisted body
  if (hipsSeen) {
    const h = L(SIDE.L.hip).sub(L(SIDE.R.hip));
    q.pelvis = limit(new THREE.Quaternion().setFromAxisAngle(UPV, Math.atan2(-h.z, h.x)), rad(40));
  }
  // torso: lean and roll from the shoulders over the hips
  const shMid = L(SIDE.L.sh).add(L(SIDE.R.sh)).multiplyScalar(0.5);
  const x = L(SIDE.L.sh).sub(L(SIDE.R.sh)).normalize();
  let up = UPV.clone();
  if (hipsSeen) {
    const hipMid = L(SIDE.L.hip).add(L(SIDE.R.hip)).multiplyScalar(0.5);
    up = shMid.clone().sub(hipMid).normalize();
  }
  up.addScaledVector(x, -up.dot(x)).normalize(); // square to the shoulder line
  const z = new THREE.Vector3().crossVectors(x, up).normalize();
  const torso = limit(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, up, z)), rad(40));
  q.torso = torso;

  // arms: each bone points where yours points
  const arms = [], hands = [];
  for (const s of ['L', 'R']) {
    const m = SIDE[s];
    const seen = ok(m.el);
    arms.push(seen);
    if (!seen) { hands.push(false); q[`shoulder${s}`] = torso.clone(); q[`elbow${s}`] = torso.clone(); q[`wrist${s}`] = torso.clone(); continue; }
    const upper = L(m.el).sub(L(m.sh)).normalize();
    const qu = new THREE.Quaternion().setFromUnitVectors(DOWN, upper);
    q[`shoulder${s}`] = qu;
    let qf = qu.clone(), qh = null;
    if (ok(m.wr)) {
      const fore = L(m.wr).sub(L(m.el)).normalize();
      // the elbow is a hinge: it bends up to about 150 degrees and never backwards past straight
      const bend = Math.acos(clamp(upper.dot(fore), -1, 1));
      if (bend > rad(150)) fore.copy(upper).applyAxisAngle(new THREE.Vector3().crossVectors(upper, fore).normalize(), rad(150));
      qf = new THREE.Quaternion().setFromUnitVectors(DOWN, fore);
      // the hand: from the wrist to the knuckles, bending up to 80 degrees from the forearm
      if (ok(m.ix) && ok(m.pk)) {
        const hand = L(m.ix).add(L(m.pk)).multiplyScalar(0.5).sub(L(m.wr));
        if (hand.lengthSq() > 1e-6) qh = new THREE.Quaternion().setFromUnitVectors(DOWN, within(fore, hand.normalize(), rad(80)));
      }
    }
    hands.push(!!qh);
    q[`elbow${s}`] = qf;
    q[`wrist${s}`] = qh || qf.clone();
  }

  // head: a frame from the line through the ears and the way the nose points, so it follows a look up or
  // down, a turn left or right, and a tilt to the shoulder
  const headSeen = ok(NOSE) && ok(EAR_L, 0.3) && ok(EAR_R, 0.3);
  q.head = torso.clone();
  if (headSeen) {
    const hx = L(SIDE.L.ear).sub(L(SIDE.R.ear));
    const f = L(NOSE).sub(L(EAR_L).add(L(EAR_R)).multiplyScalar(0.5));
    if (hx.lengthSq() > 1e-6 && f.lengthSq() > 1e-6) {
      hx.normalize();
      f.addScaledVector(hx, -f.dot(hx)).normalize();
      f.applyAxisAngle(hx, -NOSE_DROP); // level, not looking down
      const hy = new THREE.Vector3().crossVectors(f, hx).normalize();
      q.head = limit(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(hx, hy, f)), rad(60));
    }
  }

  // legs and feet, each when the camera sees it; otherwise that leg stands
  const legs = [], feet = [];
  let lift = 0, low = Infinity;
  for (const s of ['L', 'R']) {
    const m = SIDE[s];
    const seen = hipsSeen && ok(m.kn, SEEN_LEG) && ok(m.an, SEEN_LEG);
    legs.push(seen);
    if (!seen) { feet.push(false); continue; }
    const th = L(m.kn).sub(L(m.hip)).normalize();
    const sn = L(m.an).sub(L(m.kn)).normalize();
    const qt = limit(new THREE.Quaternion().setFromUnitVectors(DOWN, th), rad(110));
    const qs = limit(new THREE.Quaternion().setFromUnitVectors(DOWN, sn), rad(150));
    q[`hip${s}`] = qt; q[`knee${s}`] = qs;
    // the foot: from the heel to the toes, up to 50 degrees from pointing straight ahead
    let qa = null;
    if (ok(m.hl) && ok(m.toe)) {
      const foot = L(m.toe).sub(L(m.hl));
      if (foot.lengthSq() > 1e-6) qa = limit(new THREE.Quaternion().setFromUnitVectors(FWD, foot.normalize()), rad(50));
    }
    feet.push(!!qa);
    q[`ankle${s}`] = qa || new THREE.Quaternion();
    // how far below the hip this ankle ends up
    const drop = DOWN.clone().applyQuaternion(qt).multiplyScalar(thigh).add(DOWN.clone().applyQuaternion(qs).multiplyScalar(shin));
    low = Math.min(low, drop.y);
  }
  // negative when the knees bend: the hips come down so the lower foot stays on the floor
  if (legs[0] && legs[1]) lift = -(thigh + shin) - low;
  const all = headSeen && hipsSeen && arms[0] && arms[1] && legs[0] && legs[1];
  return { yaw, lift, q, seen: { head: headSeen, torso: hipsSeen, arms, hands, legs, feet, all } };
}

/**
 * Where the body is in the camera picture: `x` across (0 to 1, the middle of the trunk) and `s`, the length
 * of the trunk as a share of the picture's height (bigger when you step closer). `lm` holds the 33 picture
 * points [x, y] (0 to 1) and `aspect` is the picture's width over its height. Null when the trunk is not in view.
 */
export function place(lm, vis, aspect = 4 / 3) {
  if (!lm || lm.length < 25) return null;
  const ok = (i) => !vis || (vis[i] ?? 1) >= SEEN;
  if (![SH_L, SH_R, HIP_L, HIP_R].every(ok)) return null;
  const sx = (lm[SH_L][0] + lm[SH_R][0]) / 2, sy = (lm[SH_L][1] + lm[SH_R][1]) / 2;
  const hx = (lm[HIP_L][0] + lm[HIP_R][0]) / 2, hy = (lm[HIP_L][1] + lm[HIP_R][1]) / 2;
  const s = Math.hypot((sx - hx) * aspect, sy - hy);
  return s > 0.03 ? { x: (sx + hx) / 2, s, aspect } : null;
}

/**
 * How far the robot should step from where it started, in the robot's units: `x` sideways (to the right of
 * the screen when you move that way in the mirror picture) and `z` toward the viewer when you step closer.
 * `base` is the place when tracking began, `now` the place this frame, `trunk` the robot's trunk length.
 */
export function moveFrom(base, now, { trunk = 3, maxX = 7, maxZ = 5, range = 4 } = {}) {
  if (!base || !now) return { x: 0, z: 0 };
  const dead = (d, e) => (Math.abs(d) < e ? 0 : d - Math.sign(d) * e); // small sways do not walk the robot
  const x = dead(((now.x - base.x) * now.aspect) / now.s, 0.08) * trunk;
  // the trunk looks bigger in step with how much closer you are; `range` is how many trunk lengths away you began
  const z = dead(range * (1 - base.s / now.s), 0.12) * trunk;
  return { x: clamp(x, -maxX, maxX), z: clamp(z, -maxZ, maxZ) };
}

/** A made-up body for tests and demos: 33 points for a person facing the camera. Angles in degrees. */
export function fakeBody({ rightArm = 0, leftArm = 0, rightElbow = 0, leftElbow = 0, rightHand = 0, leftHand = 0, turn = 0, twist = 0, squat = 0, rightLeg = 0, leftLeg = 0, rightToe = 0, leftToe = 0, headTurn = 0, headUp = 0, headTilt = 0 } = {}) {
  const W = Array.from({ length: 33 }, () => [0, 0, 0]);
  const set = (i, x, y, z = 0) => { W[i] = [x, y, z]; };
  // the person's own frame: x to their left, y up, z forward; converted to the tracker's frame below
  const pts = {};
  const sw = 0.19, hw = 0.1, torso = 0.5, ua = 0.28, fa = 0.26, th = 0.42, sn = 0.42;
  pts[SH_L] = [sw, torso, 0]; pts[SH_R] = [-sw, torso, 0];
  pts[HIP_L] = [hw, 0, 0]; pts[HIP_R] = [-hw, 0, 0];
  // the head: headTurn to the person's left, headUp looking up, headTilt toward their right shoulder
  const hq = new THREE.Quaternion().setFromEuler(new THREE.Euler(-rad(headUp), rad(headTurn), rad(headTilt), 'YXZ'));
  const hp = (x, y, z) => { const p = new THREE.Vector3(x, y, z).applyQuaternion(hq); return [p.x, torso + 0.2 + p.y, p.z]; };
  pts[NOSE] = hp(0, -0.1 * Math.tan(NOSE_DROP), 0.1); pts[EAR_L] = hp(0.08, 0, 0); pts[EAR_R] = hp(-0.08, 0, 0);
  const arm = (sh, el, wr, pk, ix, side, raise, bend, hand) => {
    const a = rad(raise), b = rad(raise + bend), h = rad(raise + bend + hand);
    const e = [pts[sh][0] + side * Math.sin(a) * ua, pts[sh][1] - Math.cos(a) * ua, 0];
    const w = [e[0] + side * Math.sin(b) * fa, e[1] - Math.cos(b) * fa, 0];
    pts[el] = e; pts[wr] = w;
    const kx = w[0] + side * Math.sin(h) * 0.09, ky = w[1] - Math.cos(h) * 0.09;
    pts[pk] = [kx, ky, -0.03]; pts[ix] = [kx, ky, 0.03];
  };
  arm(SH_L, EL_L, WR_L, PK_L, IX_L, 1, leftArm, leftElbow, leftHand);
  arm(SH_R, EL_R, WR_R, PK_R, IX_R, -1, rightArm, rightElbow, rightHand);
  // legs: `squat` bends both knees; rightLeg / leftLeg swing that thigh forward with the shin hanging down;
  // rightToe / leftToe turn the foot out
  for (const [hip, kn, an, hl, toe, side, swing, out] of [[HIP_L, KN_L, AN_L, HL_L, TOE_L, 1, leftLeg, leftToe], [HIP_R, KN_R, AN_R, HL_R, TOE_R, -1, rightLeg, rightToe]]) {
    const k = rad(squat + swing), kk = rad(squat);
    pts[kn] = [pts[hip][0], -Math.cos(k) * th, Math.sin(k) * th];
    pts[an] = [pts[hip][0], pts[kn][1] - Math.cos(kk) * sn, pts[kn][2] - Math.sin(kk) * sn];
    const o = rad(out) * side;
    pts[hl] = [pts[an][0] - Math.sin(o) * 0.05, pts[an][1] - 0.06, pts[an][2] - Math.cos(o) * 0.05];
    pts[toe] = [pts[an][0] + Math.sin(o) * 0.14, pts[an][1] - 0.06, pts[an][2] + Math.cos(o) * 0.14];
  }
  // `twist` turns everything above the hips to the person's left, on top of `turn`
  const tw = rad(twist), ct = Math.cos(tw), st = Math.sin(tw);
  for (const [i, p] of Object.entries(pts)) {
    if (+i >= HIP_L || !twist) continue;
    pts[i] = [p[0] * ct + p[2] * st, p[1], -p[0] * st + p[2] * ct];
  }
  const t = rad(turn), c = Math.cos(t), s = Math.sin(t);
  for (const [i, p] of Object.entries(pts)) {
    const x = p[0] * c + p[2] * s, z = -p[0] * s + p[2] * c; // the person turns to their left
    // facing the camera, the person's left is on the right of the picture (+x), up is -y, and forward is toward the camera (-z)
    set(+i, x, -p[1], -z);
  }
  return W;
}
