// The Omnie matches Gausium's published figures, and stands inside its listed size.
import test from 'node:test';
import assert from 'node:assert/strict';
import omnie from '../src/data/omnie.js';

const stat = (k) => omnie.stats.find(([x]) => x === k)?.[1];

test('omnie: the published figures are the ones shown', () => {
  assert.equal(stat('Size'), '810 × 700 × 1,070 mm');
  assert.match(stat('Water tanks'), /33 L clean · 24 L waste/);
  assert.match(stat('Battery'), /60 Ah · 24 V/);
  assert.match(stat('Cleaning width'), /406 mm.*780 mm/);
  const spec = (id, label) => omnie.parts.find((p) => p.id === id).specs.find(([k]) => k === label)?.[1];
  assert.match(spec('clean-tank', 'Capacity'), /^33 L/);
  assert.match(spec('recovery-tank', 'Capacity'), /^24 L/);
});

test('omnie: every part sits inside the 810 x 700 x 1,070 mm envelope (1 unit = 100 mm)', () => {
  for (const p of omnie.parts) {
    const [x, y, z] = p.home;
    assert.ok(Math.abs(x) <= 3.5 && y >= 0 && y <= 10.7 && Math.abs(z) <= 4.05, `${p.id} at ${p.home} is outside the robot`);
  }
});

test('omnie: the sensors Gausium lists are all there', () => {
  for (const id of ['lidar-3d', 'lidar-2d', 'depth-camera', 'rgb-camera', 'bumper', 'cliff-sensors']) assert.ok(omnie.parts.some((p) => p.id === id), id);
});
