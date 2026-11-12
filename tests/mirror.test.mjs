// The body mirror: tracker points in, a pose for the humanoid out.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { solvePose, fakeBody, place, moveFrom, Smoother } from '../src/mirror.js';
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
