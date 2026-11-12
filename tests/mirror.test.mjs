// The body mirror: tracker points in, a pose for the humanoid out.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { solvePose, fakeBody, fakeHand, assignHands, place, moveFrom, Smoother, FINGERS } from '../src/mirror.js';
import g1 from '../src/data/g1.js';

const DOWN = new THREE.Vector3(0, -1, 0);
const dir = (q) => DOWN.clone().applyQuaternion(q);
const deg = (r) => (r * 180) / Math.PI;

test('mirror: standing still gives a robot at rest', () => {
  const p = solvePose(fakeBody(), null);
  assert.ok(Math.abs(deg(p.yaw)) < 1);
  for (const j of ['shoulderL', 'shoulderR', 'elbowL', 'elbowR']) assert.ok(dir(p.q[j]).y < -0.99, `${j} hangs down`);
  assert.ok(Math.abs(p.lift) < 0.01);
});

test('mirror: your right arm raises the arm on the same side of the screen (the robot\'s left, +X)', () => {
  const p = solvePose(fakeBody({ rightArm: 150 }), null);
  const up = dir(p.q.shoulderL);
  assert.ok(up.y > 0.8, 'the robot\'s left upper arm points up');
  assert.ok(up.x > 0.3, 'and out to +X, the right of the screen');
  assert.ok(dir(p.q.shoulderR).y < -0.99, 'the other arm stays down');
  const q = solvePose(fakeBody({ leftArm: 90 }), null);
  assert.ok(dir(q.q.shoulderR).x < -0.95, 'your left arm out sideways sends the robot\'s right arm to -X');
});

test('mirror: the elbow bends with yours and never past its limit', () => {
  const p = solvePose(fakeBody({ rightArm: 90, rightElbow: 90 }), null);
  assert.ok(dir(p.q.shoulderL).x > 0.95);
  assert.ok(dir(p.q.elbowL).y > 0.95, 'forearm up');
  const far = solvePose(fakeBody({ rightArm: 10, rightElbow: 175 }), null);
  const bend = deg(dir(far.q.shoulderL).angleTo(dir(far.q.elbowL)));
  assert.ok(bend <= 150.5, `the elbow bends ${bend.toFixed(0)} degrees at most 150`);
});

test('mirror: turning turns the robot, all the way round', () => {
  assert.ok(Math.abs(Math.abs(deg(solvePose(fakeBody({ turn: 60 }), null).yaw)) - 60) < 2);
  assert.ok(Math.abs(Math.abs(deg(solvePose(fakeBody({ turn: 180 }), null).yaw)) - 180) < 2);
  // the two directions give opposite turns
  assert.ok(solvePose(fakeBody({ turn: 40 }), null).yaw * solvePose(fakeBody({ turn: -40 }), null).yaw < 0);
  // arms are worked out after the turn is taken out: a raised arm is still raised
  assert.ok(dir(solvePose(fakeBody({ turn: 70, rightArm: 150 }), null).q.shoulderL).y > 0.8);
});

test('mirror: bent knees lower the hips so the feet stay on the floor', () => {
  const p = solvePose(fakeBody({ squat: 50 }), null, { thigh: 3, shin: 3 });
  assert.ok(p.seen.legs[0] && p.seen.legs[1]);
  assert.ok(p.lift < -0.5, `lift ${p.lift}`);
  assert.ok(Math.abs(solvePose(fakeBody(), null, { thigh: 3, shin: 3 }).lift) < 0.01);
});

test('mirror: what the camera cannot see stays at rest', () => {
  const vis = Array(33).fill(1);
  for (const i of [25, 26, 27, 28]) vis[i] = 0.2; // legs under the desk
  vis[14] = 0.1; // your right elbow out of the picture
  const p = solvePose(fakeBody({ rightArm: 150, leftArm: 150, squat: 60 }), vis);
  assert.deepEqual(p.seen.legs, [false, false]);
  assert.equal(p.seen.all, false);
  assert.equal(p.lift, 0);
  assert.ok(!p.q.hipL, 'no leg pose');
  assert.ok(dir(p.q.shoulderL).y < -0.9, 'the unseen arm rests');
  assert.ok(dir(p.q.shoulderR).y > 0.8, 'the seen arm is copied');
  vis[11] = 0.1;
  assert.equal(solvePose(fakeBody(), vis), null, 'no shoulders, no pose');
  assert.equal(solvePose(null, null), null);
});

test('mirror: the humanoid has every joint the mirror drives, and every part names a joint', () => {
  const joints = g1.rig.joints;
  const p = solvePose(fakeBody({ squat: 20, rightArm: 40 }), null);
  for (const j of Object.keys(p.q)) assert.ok(joints[j], `the pose drives ${j}, which the robot does not have`);
  for (const [name, j] of Object.entries(joints)) if (j.parent) assert.ok(joints[j.parent], `${name}: unknown parent`);
  for (const part of g1.parts) assert.ok(joints[part.joint], `${part.id}: joint ${part.joint}`);
  assert.ok(Math.abs(g1.rig.thigh + g1.rig.shin - 6) < 0.01, 'calf plus thigh is 0.6 m, as Unitree lists');
});

const FWD = new THREE.Vector3(0, 0, 1), UP = new THREE.Vector3(0, 1, 0);
const look = (q) => FWD.clone().applyQuaternion(q);

test('whole body: the head looks up, down, left and right with yours, and tilts', () => {
  assert.ok(look(solvePose(fakeBody(), null).q.head).z > 0.999, 'level at rest');
  assert.ok(look(solvePose(fakeBody({ headUp: 30 }), null).q.head).y > 0.4, 'up');
  assert.ok(look(solvePose(fakeBody({ headUp: -30 }), null).q.head).y < -0.4, 'down');
  // you look to your left: the robot looks to its right (-X), the same side of the screen in a mirror
  const l = look(solvePose(fakeBody({ headTurn: 40 }), null).q.head), r = look(solvePose(fakeBody({ headTurn: -40 }), null).q.head);
  assert.ok(l.x < -0.5 && r.x > 0.5, `left ${l.x.toFixed(2)} right ${r.x.toFixed(2)}`);
  const tilt = UP.clone().applyQuaternion(solvePose(fakeBody({ headTilt: 25 }), null).q.head);
  assert.ok(tilt.x > 0.3 && tilt.y > 0.8, 'tilted toward the same side of the screen');
  const far = solvePose(fakeBody({ headUp: 85 }), null).q.head;
  assert.ok(deg(2 * Math.acos(Math.abs(far.w))) <= 60.5, 'never past its limit');
  // the head still follows after you turn your body
  assert.ok(look(solvePose(fakeBody({ turn: 50, headUp: 30 }), null).q.head).y > 0.4);
});

test('whole body: the hands bend at the wrist with yours', () => {
  const rest = solvePose(fakeBody({ rightArm: 90 }), null);
  assert.ok(dir(rest.q.wristL).angleTo(dir(rest.q.elbowL)) < 0.01, 'a straight wrist follows the forearm');
  const p = solvePose(fakeBody({ rightArm: 90, rightHand: 60 }), null);
  assert.ok(Math.abs(deg(dir(p.q.wristL).angleTo(dir(p.q.elbowL))) - 60) < 2, 'bent 60 degrees');
  assert.ok(dir(p.q.wristL).y > 0.8, 'the hand points up');
  assert.deepEqual(p.seen.hands, [true, true]);
  const far = solvePose(fakeBody({ rightArm: 90, rightHand: 130 }), null);
  assert.ok(deg(dir(far.q.wristL).angleTo(dir(far.q.elbowL))) <= 80.5, 'at most 80 degrees');
  const vis = Array(33).fill(1); vis[18] = vis[20] = 0.1; // your right knuckles hidden
  const hid = solvePose(fakeBody({ rightArm: 90, rightHand: 60 }), vis);
  assert.deepEqual(hid.seen.hands, [false, true]);
  assert.ok(dir(hid.q.wristL).angleTo(dir(hid.q.elbowL)) < 0.01, 'an unseen hand follows the forearm');
});

test('whole body: each leg and foot moves on its own', () => {
  const p = solvePose(fakeBody({ rightLeg: 60 }), null, { thigh: 3, shin: 3 });
  assert.ok(dir(p.q.hipL).z > 0.8, 'your right thigh swings forward: the robot\'s left');
  assert.ok(dir(p.q.kneeL).y < -0.99, 'its shin hangs down');
  assert.ok(dir(p.q.hipR).y < -0.99, 'the other leg stands');
  assert.ok(Math.abs(p.lift) < 0.01, 'standing on the other leg, the hips stay up');
  const t = solvePose(fakeBody({ rightToe: 35 }), null);
  assert.ok(look(t.q.ankleL).x > 0.5, 'toes turned out');
  assert.ok(look(t.q.ankleR).z > 0.999);
  assert.deepEqual(t.seen.feet, [true, true]);
  const vis = Array(33).fill(1); vis[26] = 0.2; // your right knee hidden
  const one = solvePose(fakeBody({ rightLeg: 60, leftLeg: 40, squat: 30 }), vis);
  assert.deepEqual(one.seen.legs, [false, true]);
  assert.ok(!one.q.hipL && one.q.hipR, 'only the seen leg is posed');
  assert.equal(one.lift, 0);
});

test('whole body: a twist at the waist turns the chest over the hips', () => {
  const p = solvePose(fakeBody({ twist: 40 }), null);
  const chest = look(p.q.torso), hips = Math.abs(deg(p.yaw));
  assert.ok(Math.abs(hips - 20) < 3, `the robot turns half way (${hips.toFixed(0)})`);
  assert.ok(Math.abs(chest.x) > 0.25, 'and the chest twists the rest');
  assert.ok(look(p.q.pelvis).x * chest.x < 0 && Math.abs(look(p.q.pelvis).x) > 0.25, 'while the hips turn the other way under it');
  assert.ok(Math.abs(look(solvePose(fakeBody({ turn: 70 }), null).q.pelvis).x) < 0.02, 'a plain turn leaves the hips square');
  // without hips in view the shoulders alone give the turn
  const vis = Array(33).fill(1); vis[23] = vis[24] = 0.1;
  assert.ok(Math.abs(Math.abs(deg(solvePose(fakeBody({ twist: 40 }), vis).yaw)) - 40) < 2);
});

test('whole body: stepping sideways, closer and back moves the robot', () => {
  const pic = (cx, s) => { const lm = Array.from({ length: 33 }, () => [0, 0]); lm[11] = [cx + 0.05, 0.4]; lm[12] = [cx - 0.05, 0.4]; lm[23] = [cx + 0.03, 0.4 + s]; lm[24] = [cx - 0.03, 0.4 + s]; return lm; };
  const base = place(pic(0.5, 0.3), null);
  assert.ok(Math.abs(base.x - 0.5) < 1e-9 && Math.abs(base.s - 0.3) < 1e-9);
  assert.deepEqual(moveFrom(base, base), { x: 0, z: 0 });
  assert.deepEqual(moveFrom(base, place(pic(0.51, 0.3), null)), { x: 0, z: 0 }, 'a small sway is ignored');
  assert.ok(moveFrom(base, place(pic(0.7, 0.3), null)).x > 1, 'to the right of the picture');
  assert.ok(moveFrom(base, place(pic(0.3, 0.3), null)).x < -1);
  assert.ok(moveFrom(base, place(pic(0.5, 0.45), null)).z > 1, 'closer: toward the viewer');
  assert.ok(moveFrom(base, place(pic(0.5, 0.2), null)).z < -1, 'further: away');
  const far = moveFrom(base, place(pic(0.99, 0.9), null));
  assert.ok(far.x <= 7 && far.z <= 5, 'never off the floor');
  const vis = Array(33).fill(1); vis[23] = 0.1;
  assert.equal(place(pic(0.5, 0.3), vis), null, 'no trunk, no place');
  assert.deepEqual(moveFrom(base, null), { x: 0, z: 0 });
});

test('smooth: shake is taken out of a still body, and a fast move is still followed', () => {
  // a still arm with 1 cm of tracker shake, 30 times a second
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
  const sm = new Smoother(); const still = fakeBody({ rightArm: 90 });
  let rawJump = 0, outJump = 0, prevRaw = null, prevOut = null;
  for (let i = 0; i < 90; i++) {
    const raw = still.map((p) => p.map((c) => c + rnd() * 0.02));
    const out = sm.points(raw, i / 30);
    if (prevRaw && i > 30) { rawJump += Math.abs(raw[16][1] - prevRaw[16][1]); outJump += Math.abs(out[16][1] - prevOut[16][1]); }
    prevRaw = raw; prevOut = out;
  }
  assert.ok(outJump < rawJump * 0.35, `shake cut to ${((outJump / rawJump) * 100).toFixed(0)}%`);
  // then the arm goes up in a third of a second: the smoothed arm is up within a quarter second more
  let p;
  for (let i = 0; i < 18; i++) p = solvePose(sm.points(fakeBody({ rightArm: Math.min(170, 90 + i * 8) }), (90 + i) / 30), null);
  assert.ok(dir(p.q.shoulderL).y > 0.9, `followed the fast move (${dir(p.q.shoulderL).y.toFixed(2)})`);
  // a gap starts again from the new place instead of sweeping across
  const back = sm.points(fakeBody({ leftArm: 120 }), 60);
  assert.deepEqual(back[15], fakeBody({ leftArm: 120 })[15]);
});

test('smooth: a point that flickers at the edge of view does not drop the limb', () => {
  const sm = new Smoother(); const vis = Array(33).fill(0.9);
  sm.seen(vis, 0);
  const dip = vis.slice(); dip[14] = 0.1;
  assert.ok(sm.seen(dip, 1 / 30)[14] > 0.5, 'one bad frame is ridden out');
  let v; for (let i = 0; i < 30; i++) v = sm.seen(dip, 1 / 30);
  assert.ok(v[14] < 0.2, 'a second out of view and it rests');
  assert.ok(sm.seen(vis, 1 / 30)[14] > 0.89, 'back at once when seen again');
});

const turnY = (d) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (d * Math.PI) / 180);
const PALM_L = new THREE.Vector3(-1, 0, 0); // the robot's left palm faces its body at rest

test('hands: a hand at rest leaves the robot\'s hand at rest, fingers straight', () => {
  const p = solvePose(fakeBody(), null, { hands: { L: fakeHand({ side: 'right' }), R: fakeHand({ side: 'left' }) } });
  assert.deepEqual(p.seen.fingers, [true, true]);
  for (const s of ['L', 'R']) {
    assert.ok(deg(2 * Math.acos(Math.abs(p.q[`wrist${s}`].w))) < 8, `wrist${s} at rest`);
    for (const f of ['index', 'middle', 'ring', 'little']) for (const k of [1, 2, 3]) assert.ok(dir(p.q[`${f}${s}${k}`]).y < -0.99, `${f}${s}${k} straight`);
    assert.ok(deg(2 * Math.acos(Math.abs(p.q[`thumb${s}1`].w))) < 3, 'the thumb too');
  }
});

test('hands: show your palm and the robot shows its palm; the forearm rolls to do it', () => {
  // your right palm turned to face the camera
  const p = solvePose(fakeBody(), null, { hands: { L: fakeHand({ side: 'right', turn: turnY(-90) }), R: null } });
  assert.ok(PALM_L.clone().applyQuaternion(p.q.wristL).z > 0.95, 'the palm faces the viewer');
  assert.ok(Math.abs(deg(2 * Math.acos(Math.abs(p.q.elbowL.w))) - 90) < 5, 'by a roll of the forearm');
  assert.ok(dir(p.q.elbowL).y < -0.99 && dir(p.q.wristL).y < -0.95, 'which still hangs down');
  // the back of the hand
  const b = solvePose(fakeBody(), null, { hands: { L: fakeHand({ side: 'right', turn: turnY(90) }), R: null } });
  assert.ok(PALM_L.clone().applyQuaternion(b.q.wristL).z < -0.95);
  // the wrist itself bends no further than Unitree's 92.5 degrees
  const far = solvePose(fakeBody(), null, { hands: { L: fakeHand({ side: 'right', turn: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 2.6) }), R: null } });
  assert.ok(deg(dir(far.q.wristL).angleTo(dir(far.q.elbowL))) <= 93, 'wrist limit');
});

test('hands: each finger curls on its own, toward the palm, and a fist closes them all', () => {
  const p = solvePose(fakeBody(), null, { hands: { L: fakeHand({ side: 'right', curl: { index: 60 } }), R: fakeHand({ side: 'left', curl: { little: 50 } }) } });
  const i1 = dir(p.q.indexL1), i3 = dir(p.q.indexL3);
  assert.ok(i1.x < -0.8 && Math.abs(i1.z) < 0.1, 'the first bone bends 60 degrees toward the palm');
  assert.ok(i3.y > 0.95, 'three bends of 60 fold the tip back up');
  assert.ok(dir(p.q.middleL1).y < -0.99 && dir(p.q.thumbL1).angleTo(dir(solvePose(fakeBody(), null, { hands: { L: fakeHand(), R: null } }).q.thumbL1)) < 0.05, 'the others stay');
  assert.ok(dir(p.q.littleR1).x > 0.7, 'the other hand curls toward its own palm (+X)');
  assert.ok(dir(p.q.indexR1).y < -0.99);
  const fist = solvePose(fakeBody(), null, { hands: { L: fakeHand({ curl: { thumb: 40, index: 85, middle: 85, ring: 85, little: 85 } }), R: null } });
  for (const f of ['index', 'middle', 'ring', 'little']) assert.ok(dir(fist.q[`${f}L2`]).y > 0.9, `${f} folded`);
  // a bone never bends more than about 100 degrees on the one before it
  const over = solvePose(fakeBody(), null, { hands: { L: fakeHand({ curl: { index: 150 } }), R: null } });
  assert.ok(deg(dir(over.q.indexL1).angleTo(dir(over.q.indexL2))) <= 100.5);
});

test('hands: fingers follow the arm, and a hand lost for a moment keeps its shape', () => {
  const up = solvePose(fakeBody({ rightArm: 170 }), null);
  assert.ok(dir(up.q.indexL1).y > 0.9, 'without finger points the fingers stay straight along the raised arm');
  const a = solvePose(fakeBody(), null, { hands: { L: fakeHand({ curl: { index: 70 } }), R: null } });
  const b = solvePose(fakeBody(), null, { hands: { L: null, R: null }, held: a.fingers });
  assert.deepEqual(b.seen.fingers, [false, false]);
  assert.ok(dir(b.q.indexL1).x < -0.8, 'the curl is kept');
  const vis = Array(33).fill(1); vis[14] = 0.1;
  const gone = solvePose(fakeBody(), vis, { hands: { L: fakeHand({ curl: { index: 70 } }), R: null } });
  assert.ok(gone.q.indexL1 && dir(gone.q.indexL1).y < -0.99, 'an unseen arm rests, fingers and all');
});

test('hands: each tracked hand goes to the arm whose wrist it is at', () => {
  const lm = Array.from({ length: 33 }, () => [0.5, 0.5]);
  lm[11] = [0.6, 0.3]; lm[12] = [0.4, 0.3]; lm[15] = [0.7, 0.6]; lm[16] = [0.3, 0.6];
  const hand = (x, y, tag) => ({ lm: Array.from({ length: 21 }, () => [x, y]), world: Array.from({ length: 21 }, () => [tag, 0, 0]) });
  const got = assignHands(lm, null, [hand(0.71, 0.62, 1), hand(0.29, 0.61, 2)]);
  assert.equal(got.R[0][0], 1, 'the hand at your left wrist (point 15) drives the robot\'s right');
  assert.equal(got.L[0][0], 2);
  assert.deepEqual(assignHands(lm, null, [hand(0.5, 0.05, 3)]), { L: null, R: null }, 'a hand nowhere near a wrist is someone else\'s');
  const two = assignHands(lm, null, [hand(0.33, 0.6, 4), hand(0.3, 0.6, 5)]);
  assert.equal(two.L[0][0], 5, 'two at one wrist: the nearer wins');
  assert.equal(two.R, null);
  assert.deepEqual(assignHands(lm, null, []), { L: null, R: null });
});

test('hands: the humanoid has three bones for each of its ten fingers', () => {
  for (const s of ['L', 'R']) for (const f of Object.keys(FINGERS)) for (const k of [1, 2, 3]) {
    const j = g1.rig.joints[`${f}${s}${k}`];
    assert.ok(j, `${f}${s}${k}`);
    assert.equal(j.parent, k === 1 ? `wrist${s}` : `${f}${s}${k - 1}`);
  }
  const palm = g1.parts.find((p) => p.id === 'hand-l');
  assert.equal(palm.conf, 'inferred', 'the five-finger hand on the G1 is marked as an assumption');
  assert.ok(g1.notes.some((n) => /Dex3-1/.test(n) && /Dex5-1/.test(n) && /assum/.test(n)), 'and the notes say which hand Unitree lists for the G1');
});
