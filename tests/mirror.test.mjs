// The body mirror: tracker points in, a pose for the humanoid out.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { solvePose, fakeBody } from '../src/mirror.js';
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
  assert.ok(p.seen.legs);
  assert.ok(p.lift < -0.5, `lift ${p.lift}`);
  assert.ok(Math.abs(solvePose(fakeBody(), null, { thigh: 3, shin: 3 }).lift) < 0.01);
});

test('mirror: what the camera cannot see stays at rest', () => {
  const vis = Array(33).fill(1);
  for (const i of [25, 26, 27, 28]) vis[i] = 0.2; // legs under the desk
  vis[14] = 0.1; // your right elbow out of the picture
  const p = solvePose(fakeBody({ rightArm: 150, leftArm: 150, squat: 60 }), vis);
  assert.equal(p.seen.legs, false);
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
