// The troubleshooting and maintenance guides point only at real parts and real photos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GUIDES, KINDS, guidesFor } from '../src/data/guides.js';
import phantas from '../src/data/phantas.js';
import cc1pro from '../src/data/cc1pro.js';
import omnie from '../src/data/omnie.js';

const ROBOTS = { phantas, cc1pro, omnie };

test('every guide step names parts the robot has, and only the animation', () => {
  for (const g of GUIDES) {
    assert.ok(KINDS[g.kind], `${g.id}: unknown kind`);
    const ids = new Set(ROBOTS[g.robot].parts.map((p) => p.id));
    assert.ok(g.steps.length >= 3, `${g.id}: too few steps`);
    for (const s of g.steps) {
      assert.ok(s.text && s.text.length <= 110, `${g.id}: a step must be short: ${s.text}`);
      assert.ok(s.main.length, `${g.id}: a step must point at something`);
      for (const id of [...s.main, ...(s.rel || []), ...Object.keys(s.pull || {})]) assert.ok(ids.has(id), `${g.id}: no part ${id} on ${g.robot}`);
      assert.equal(s.photo, undefined, 'no photos: the guides are animated');
      assert.ok([0, 1, 2].includes(s.debris || 0) && (s.tilt || 0) >= 0 && (s.tilt || 0) <= 1);
      assert.ok((s.open ?? 0) >= 0 && (s.open ?? 0) <= 1);
    }
  }
});

test('the guides asked for are there, and a safe stop comes first', () => {
  const ph = guidesFor('phantas');
  assert.ok(ph.find((g) => g.id === 'tray-stuck' && g.kind === 'trouble'));
  assert.ok(ph.find((g) => g.id === 'change-brush' && g.kind === 'care'));
  for (const g of ph) assert.match(g.steps[0].text, /emergency stop/i);
});

test('the stuck-tray guide shows the jam, then takes it out, with the robot tipped back', () => {
  const g = GUIDES.find((x) => x.id === 'tray-stuck');
  const seen = g.steps.findIndex((s) => s.debris === 1), out = g.steps.findIndex((s) => s.debris === 2);
  assert.ok(seen > 0 && out > seen);
  assert.equal(g.steps[seen].tilt, 1);
  assert.equal(g.steps.at(-1).tilt || 0, 0, 'the robot stands up again at the end');
});
