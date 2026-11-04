// The troubleshooting and maintenance guides point only at real parts and real photos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GUIDES, KINDS, guidesFor } from '../src/data/guides.js';
import phantas from '../src/data/phantas.js';
import cc1pro from '../src/data/cc1pro.js';

const ROBOTS = { phantas, cc1pro };

test('every guide step names parts the robot has, and photos that exist', () => {
  for (const g of GUIDES) {
    assert.ok(KINDS[g.kind], `${g.id}: unknown kind`);
    const ids = new Set(ROBOTS[g.robot].parts.map((p) => p.id));
    assert.ok(g.steps.length >= 3, `${g.id}: too few steps`);
    for (const s of g.steps) {
      assert.ok(s.text && s.text.length <= 110, `${g.id}: a step must be short: ${s.text}`);
      assert.ok(s.main.length, `${g.id}: a step must point at something`);
      for (const id of [...s.main, ...(s.rel || []), ...Object.keys(s.pull || {})]) assert.ok(ids.has(id), `${g.id}: no part ${id} on ${g.robot}`);
      if (s.photo) assert.ok(fs.existsSync(new URL(`../src/media/guides/${s.photo}.webp`, import.meta.url)), `missing photo ${s.photo}`);
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
