// Each robot's built shell must follow the outline measured from its maker's front picture
// (src/data/shapes, made by tools/measure/measure.py): at every measured height the left and right edges
// of the built robot, seen from straight in front, are compared with the measured ones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareFront } from '../tools/silhouette.mjs';

const IDS = ['phantas', 'cc1pro', 'omnie', 'marvel', 'mt1', 'mt1max'];

for (const id of IDS) {
  test(`shapes: the ${id} follows its measured front outline`, async () => {
    const def = (await import(`../src/data/${id}.js`)).default;
    const shape = (await import(`../src/data/shapes/${id}.js`)).default;
    assert.ok(shape.views.front.rows.length >= 20, `${id}: too few measured heights`);
    const r = compareFront(def, shape);
    assert.ok(r.mean <= 10, `${id}: the outline is ${r.mean.toFixed(1)} mm off on average (worst at ${r.worst.map(([y, e]) => `${y} mm: ${e.toFixed(0)}`).join(', ')})`);
    assert.ok(r.p90 <= 20, `${id}: 1 height in 10 is more than ${r.p90.toFixed(1)} mm off`);
    assert.ok(r.max <= 30, `${id}: the worst height is ${r.max.toFixed(1)} mm off`);
  });
}

test('shapes: every measurement says where it comes from and how it was scaled', async () => {
  for (const id of IDS) {
    const shape = (await import(`../src/data/shapes/${id}.js`)).default;
    for (const [name, v] of Object.entries(shape.views)) {
      assert.match(v.src, /^https:\/\/(gausium\.com|cdn\.pudutech\.com)\//, `${id}.${name}: the picture must be the maker's own`);
      assert.ok(v.mm_per_px > 0.05 && v.mm_per_px < 10, `${id}.${name}: odd scale ${v.mm_per_px}`);
    }
  }
});
