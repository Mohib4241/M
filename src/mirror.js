// Body mirror: turns the 33 body points of a pose tracker into a pose for the humanoid, like a mirror.
// You face the camera and the robot faces you: raise your right arm and the arm on the same side of the
// screen goes up (the robot's left); turn round and the robot turns round.
//
// Input: `world`, 33 points [x, y, z] in metres from the middle of the hips, in the tracker's frame
// (x to the right of the camera picture, y down, z away from the camera), and `vis`, how sure the tracker
// is of each point (0 to 1). Output: { yaw, lift, q: { joint: Quaternion } } for Stage.setPose. Each
// rotation is in the robot's own frame after the turn (yaw) has been taken out.
import * as THREE from 'three';

// the tracker's point numbers
const NOSE = 0, EAR_L = 7, EAR_R = 8, SH_L = 11, SH_R = 12, EL_L = 13, EL_R = 14, WR_L = 15, WR_R = 16;
const HIP_L = 23, HIP_R = 24, KN_L = 25, KN_R = 26, AN_L = 27, AN_R = 28;
// The robot's left (+X when it faces you) copies your right side, as a mirror does.
const SIDE = { L: { sh: SH_R, el: EL_R, wr: WR_R, hip: HIP_R, kn: KN_R, an: AN_R }, R: { sh: SH_L, el: EL_L, wr: WR_L, hip: HIP_L, kn: KN_L, an: AN_L } };

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

/**
 * Rest lengths of the robot, used to keep its feet on the floor: `thigh` and `shin` in the robot's units.
 * @returns {{ yaw: number, lift: number, q: Object<string, THREE.Quaternion>, seen: { arms: boolean[], legs: boolean, head: boolean } } | null}
 */
export function solvePose(world, vis, { thigh = 3, shin = 3 } = {}) {
  if (!world || world.length < 29) return null;
  const ok = (i, min = SEEN) => !vis || (vis[i] ?? 1) >= min;
  if (!ok(SH_L) || !ok(SH_R)) return null; // no shoulders, no body

  const P = (i) => v(world[i], new THREE.Vector3());
  const shL = P(SIDE.L.sh), shR = P(SIDE.R.sh);
  // the turn: the line through the shoulders, seen from above
  const across = shL.clone().sub(shR);
  const yaw = Math.atan2(-across.z, across.x);
  const unYaw = new THREE.Quaternion().setFromAxisAngle(UPV, -yaw);
  const L = (i) => P(i).applyQuaternion(unYaw); // a point in the robot's own frame

  const q = {};
  // torso: lean and roll from the shoulders over the hips
  const hipsSeen = ok(HIP_L) && ok(HIP_R);
  const shMid = L(SIDE.L.sh).add(L(SIDE.R.sh)).multiplyScalar(0.5);
  const x = L(SIDE.L.sh).sub(L(SIDE.R.sh)).normalize();
  let up = UPV.clone();
  if (hipsSeen) {
    const hipMid = L(SIDE.L.hip).add(L(SIDE.R.hip)).multiplyScalar(0.5);
    up = shMid.clone().sub(hipMid).normalize();
  }
  up.addScaledVector(x, -up.dot(x)).normalize(); // square to the shoulder line
  const z = new THREE.Vector3().crossVectors(x, up).normalize();
  const torso = limit(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, up, z)), rad(35));
  q.torso = torso;

  // arms: each bone points where yours points
  const arms = [];
  for (const s of ['L', 'R']) {
    const m = SIDE[s];
    const seen = ok(m.el);
    arms.push(seen);
    if (!seen) { q[`shoulder${s}`] = torso.clone(); q[`elbow${s}`] = torso.clone(); q[`wrist${s}`] = torso.clone(); continue; }
    const upper = L(m.el).sub(L(m.sh)).normalize();
    const qu = new THREE.Quaternion().setFromUnitVectors(DOWN, upper);
    q[`shoulder${s}`] = qu;
    let qf = qu.clone();
    if (ok(m.wr)) {
      const fore = L(m.wr).sub(L(m.el)).normalize();
      // the elbow is a hinge: it bends up to about 150 degrees and never backwards past straight
      const bend = Math.acos(clamp(upper.dot(fore), -1, 1));
      if (bend > rad(150)) fore.copy(upper).applyAxisAngle(new THREE.Vector3().crossVectors(upper, fore).normalize(), rad(150));
      qf = new THREE.Quaternion().setFromUnitVectors(DOWN, fore);
    }
    q[`elbow${s}`] = qf;
    q[`wrist${s}`] = qf.clone();
  }

  // head: where the nose points from between the ears
  const headSeen = ok(NOSE) && ok(EAR_L, 0.3) && ok(EAR_R, 0.3);
  if (headSeen) {
    const f = L(NOSE).sub(L(EAR_L).add(L(EAR_R)).multiplyScalar(0.5));
    f.y *= 0.6; // the nose sits below the ears; do not read that as looking down
    q.head = limit(new THREE.Quaternion().setFromUnitVectors(FWD, f.normalize()), rad(55));
  } else q.head = torso.clone();

  // legs, when the camera sees them; otherwise the robot stands
  const legs = hipsSeen && ['L', 'R'].every((s) => ok(SIDE[s].kn, SEEN_LEG) && ok(SIDE[s].an, SEEN_LEG));
  let lift = 0;
  if (legs) {
    let low = Infinity;
    for (const s of ['L', 'R']) {
      const m = SIDE[s];
      const th = L(m.kn).sub(L(m.hip)).normalize();
      const sn = L(m.an).sub(L(m.kn)).normalize();
      const qt = limit(new THREE.Quaternion().setFromUnitVectors(DOWN, th), rad(110));
      const qs = limit(new THREE.Quaternion().setFromUnitVectors(DOWN, sn), rad(150));
      q[`hip${s}`] = qt; q[`knee${s}`] = qs; q[`ankle${s}`] = new THREE.Quaternion();
      // how far below the hip this ankle ends up
      const drop = DOWN.clone().applyQuaternion(qt).multiplyScalar(thigh).add(DOWN.clone().applyQuaternion(qs).multiplyScalar(shin));
      low = Math.min(low, drop.y);
    }
    lift = -(thigh + shin) - low; // negative when the knees bend: the hips come down so the lower foot stays on the floor
  }
  return { yaw, lift, q, seen: { arms, legs, head: headSeen } };
}

/** A made-up body for tests and demos: 33 points for a person facing the camera. Angles in degrees. */
export function fakeBody({ rightArm = 0, leftArm = 0, rightElbow = 0, leftElbow = 0, turn = 0, squat = 0 } = {}) {
  const W = Array.from({ length: 33 }, () => [0, 0, 0]);
  const set = (i, x, y, z = 0) => { W[i] = [x, y, z]; };
  // the person's own frame: x to their left, y up, z forward; converted to the tracker's frame below
  const pts = {};
  const sw = 0.19, hw = 0.1, torso = 0.5, ua = 0.28, fa = 0.26, th = 0.42, sn = 0.42;
  pts[SH_L] = [sw, torso, 0]; pts[SH_R] = [-sw, torso, 0];
  pts[HIP_L] = [hw, 0, 0]; pts[HIP_R] = [-hw, 0, 0];
  pts[NOSE] = [0, torso + 0.18, 0.1]; pts[EAR_L] = [0.08, torso + 0.2, 0]; pts[EAR_R] = [-0.08, torso + 0.2, 0];
  const arm = (sh, el, wr, side, raise, bend) => {
    const a = rad(raise), b = rad(raise + bend);
    const e = [pts[sh][0] + side * Math.sin(a) * ua, pts[sh][1] - Math.cos(a) * ua, 0];
    pts[el] = e; pts[wr] = [e[0] + side * Math.sin(b) * fa, e[1] - Math.cos(b) * fa, 0];
  };
  arm(SH_L, EL_L, WR_L, 1, leftArm, leftElbow);
  arm(SH_R, EL_R, WR_R, -1, rightArm, rightElbow);
  const k = rad(squat);
  for (const [hip, kn, an] of [[HIP_L, KN_L, AN_L], [HIP_R, KN_R, AN_R]]) {
    pts[kn] = [pts[hip][0], -Math.cos(k) * th, Math.sin(k) * th];
    pts[an] = [pts[hip][0], pts[kn][1] - Math.cos(k) * sn, pts[kn][2] - Math.sin(k) * sn];
  }
  const t = rad(turn), c = Math.cos(t), s = Math.sin(t);
  for (const [i, p] of Object.entries(pts)) {
    const x = p[0] * c + p[2] * s, z = -p[0] * s + p[2] * c; // the person turns to their left
    // facing the camera, the person's left is on the right of the picture (+x), up is -y, and forward is toward the camera (-z)
    set(+i, x, -p[1], -z);
  }
  return W;
}
