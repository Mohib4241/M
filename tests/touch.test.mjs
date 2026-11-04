// The on-screen race buttons drive the robot the same way the keys do.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pad } from '../src/game/touch.js';
import { readInput } from '../src/game/input.js';

test('touch buttons feed the race input', () => {
  assert.deepEqual(readInput(), { throttle: 0, brake: 0, hand: 0, steer: 0, pick: 0 });
  Object.assign(pad, { throttle: 1, left: 1 });
  let i = readInput();
  assert.equal(i.throttle, 1); assert.equal(i.steer, 1); // +1 is left
  Object.assign(pad, { throttle: 0, left: 0, right: 1, brake: 1, hand: 1, pick: 1 });
  i = readInput();
  assert.equal(i.steer, -1); assert.equal(i.brake, 1); assert.equal(i.hand, 1); assert.equal(i.pick, 1);
  Object.assign(pad, { right: 0, brake: 0, hand: 0, pick: 0 });
});
