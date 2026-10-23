// The robot definitions: every part is well formed, each robot has its docking station as a group of
// its own, and the parts the race needs to dress the robot as a car are still there.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import phantas from '../src/data/phantas.js';
import cc1pro from '../src/data/cc1pro.js';
import { GROUPS, SOURCES, CONF } from '../src/data/shared.js';

const ROBOTS = { phantas, cc1pro };
const finite3 = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);

test('models: every part has an id, a known group, a layer, a build function and sources that exist', () => {
  for (const [rid, def] of Object.entries(ROBOTS)) {
    const ids = new Set();
    for (const p of def.parts) {
      const at = `${rid}/${p.id}`;
      assert.ok(p.id && !ids.has(p.id), `${at}: id missing or used twice`);
      ids.add(p.id);
      assert.ok(p.name, `${at}: no name`);
      assert.ok(GROUPS[p.group], `${at}: unknown group ${p.group}`);
      assert.ok([0, 1, 2, 3].includes(p.layer), `${at}: layer ${p.layer}`);
      assert.equal(typeof p.build, 'function', `${at}: no build function`);
      assert.ok(finite3(p.home), `${at}: home must be three numbers`);
      assert.ok(finite3(p.ex), `${at}: ex must be three numbers`);
      assert.ok(CONF[p.conf], `${at}: unknown confidence ${p.conf}`);
      for (const s of p.src || []) assert.ok(SOURCES[s], `${at}: unknown source ${s}`);
    }
    for (const s of def.sources) assert.ok(SOURCES[s], `${rid}: unknown source ${s}`);
  }
});

test('models: each robot has a docking station made of several parts, split off to the side', () => {
  for (const [rid, def] of Object.entries(ROBOTS)) {
    const dock = def.parts.filter((p) => p.group === 'dock');
    assert.ok(dock.length >= 5, `${rid}: the station has only ${dock.length} parts`);
    for (const id of ['dock-shell', 'dock-contacts', 'dock-board', 'dock-cable', 'dock-base']) {
      assert.ok(dock.some((p) => p.id === id), `${rid}: no ${id}`);
    }
    // it stands behind the robot and comes apart to the right, away from the robot's own parts
    for (const p of dock) {
      assert.ok(p.home[2] < 0, `${rid}/${p.id}: the station belongs behind the robot (z < 0), not ${p.home[2]}`);
    }
    assert.ok(dock.find((p) => p.id === 'dock-shell').ex[0] >= 8, `${rid}: the station shell must move well clear of the robot`);
    assert.ok(!def.parts.filter((p) => p.group !== 'dock').some((p) => p.id.startsWith('dock-')), `${rid}: a dock part outside the dock group`);
  }
});

test('models: the parts the race dresses as a car are on both robots', () => {
  const need = [/^top-(cover|hood)$/, /^front-(cover|shell)$/, /^rear-(cover|shell)$/, /^side-(cover|shell)-[lr]$/, /^bumper$/, /^wheel-l$/, /^wheel-r$/];
  for (const [rid, def] of Object.entries(ROBOTS)) {
    for (const re of need) assert.ok(def.parts.some((p) => re.test(p.id)), `${rid}: nothing matches ${re}`);
  }
});

test('models: the LiDAR of the Phantas is on the lid, not at the front', () => {
  const lid = phantas.parts.find((p) => p.id === 'top-cover');
  const lidar = phantas.parts.find((p) => p.id === 'lidar-2d');
  assert.ok(lidar.home[1] >= lid.home[1], `the LiDAR (y ${lidar.home[1]}) must be on or above the lid (y ${lid.home[1]})`);
  assert.ok(Math.abs(lidar.home[0]) < 1.5, 'the LiDAR is near the middle of the lid');
});

test('models: the station group is the only one named for a station, and the race leaves it out', () => {
  assert.match(GROUPS.dock.label, /docking/i);
  const src = readFileSync(new URL('../src/game/models.js', import.meta.url), 'utf8');
  assert.match(src, /group === 'dock'/, 'the race model must skip the station parts');
});

test('the product name and the data source stay out of the page, the data and the docs', () => {
  const files = [];
  const walk = (dir) => { for (const e of readdirSync(dir, { withFileTypes: true })) { const p = `${dir}${e.name}`; if (e.isDirectory()) walk(`${p}/`); else if (/\.(js|mjs|html|css|md|json)$/.test(e.name)) files.push(p); } };
  walk(new URL('../src/', import.meta.url).pathname);
  files.push(new URL('../README.md', import.meta.url).pathname);
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    assert.ok(!/armory/i.test(text), `${f} still says the old name`);
    assert.ok(!/\bwhiz|\bomnie/i.test(text), `${f} names another robot model`);
  }
});
