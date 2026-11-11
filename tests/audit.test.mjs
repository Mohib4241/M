// Every robot against its maker's published size, and the limits that keep the viewer smooth.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ROBOTS } from '../src/data/robots.js';
import { checkDims, modelBox } from '../tools/audit.mjs';

test('audit: every model is the size its maker publishes (within 6% or 25 mm)', () => {
  for (const [id, def] of Object.entries(ROBOTS)) {
    for (const r of checkDims(def)) {
      assert.ok(r.ok, `${id}: ${r.key} is ${r.got} mm in the model, ${r.want} mm published`);
      if (r.noted) assert.ok(r.noted.length > 40, `${id}: the note on ${r.key} must say why`);
    }
    for (const pid of def.dimsSkip || []) assert.ok(def.parts.some((p) => p.id === pid), `${id}: dimsSkip names a part that does not exist: ${pid}`);
  }
});

test('audit: a robot without a published size says so', () => {
  for (const [id, def] of Object.entries(ROBOTS)) {
    if (def.dims) continue;
    const text = JSON.stringify([def.stats, def.notes]);
    assert.match(text, /no size|Not published|publishes no size/i, `${id}: has no dims and does not say the size is unpublished`);
  }
});

test('audit: every model stands on the floor and stays light enough to draw', () => {
  for (const [id, def] of Object.entries(ROBOTS)) {
    const box = modelBox(def);
    assert.ok(box.floor > -30 && box.floor < 60, `${id}: lowest point is ${Math.round(box.floor)} mm from the floor`);
    assert.ok(box.tris < 130000, `${id}: ${Math.round(box.tris)} triangles`);
  }
});
