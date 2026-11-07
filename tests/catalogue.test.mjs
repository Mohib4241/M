// The catalogue's two ways of grouping robots: where they work (indoor, outdoor) and what job they do.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ENVIRONMENTS, CATEGORIES, CATEGORY_ORDER, PROFILES, grouped, counts, inEnv, envLabel, isBoth } from '../src/data/catalogue.js';
import { ROBOTS } from '../src/data/robots.js';

test('catalogue: every robot has a profile, and every profile has a robot', () => {
  for (const id of Object.keys(ROBOTS)) assert.ok(PROFILES[id], `${id}: no profile`);
  for (const id of Object.keys(PROFILES)) assert.ok(ROBOTS[id], `${id}: a profile but no robot`);
});

test('catalogue: a profile says where it works, what it is, where it fits and why', () => {
  for (const [id, p] of Object.entries(PROFILES)) {
    assert.ok(p.env.length >= 1 && p.env.every((e) => ENVIRONMENTS[e]), `${id}: unknown environment`);
    assert.equal(new Set(p.env).size, p.env.length, `${id}: an environment twice`);
    assert.ok(CATEGORIES[p.category], `${id}: unknown category ${p.category}`);
    for (const k of ['brand', 'tab', 'kind', 'line', 'where', 'basis']) assert.ok(p[k] && p[k].length >= 2, `${id}: no ${k}`);
    assert.equal(p.points.length, 3, `${id}: three points, not ${p.points.length}`);
    for (const t of p.points) assert.ok(t.length > 8 && t.length < 90, `${id}: a point of ${t.length} characters`);
    assert.ok(p.where.length > 40 && p.where.length < 330, `${id}: the where line is ${p.where.length} characters`);
  }
});

test('catalogue: the kind of job decides the setting (a facade is outdoors, a duct is indoors)', () => {
  const only = { facade: 'outdoor', solar: 'outdoor', 'duct-sewer': 'outdoor', patrol: 'outdoor', 'duct-air': 'indoor', 'duct-grease': 'indoor' };
  for (const [id, p] of Object.entries(PROFILES)) {
    const want = only[p.category];
    if (want) assert.deepEqual(p.env, [want], `${id}: ${p.category} robots work ${want} only`);
  }
  // the three that work in both, by what their makers say
  for (const id of ['mt1max', 'go2', 'nws-guard-r']) assert.deepEqual(PROFILES[id].env, ['indoor', 'outdoor'], id);
});

test('catalogue: every category is used, and the filter lists a robot under each setting it works in', () => {
  const ids = Object.keys(PROFILES);
  const used = new Set(ids.map((i) => PROFILES[i].category));
  for (const c of CATEGORY_ORDER) assert.ok(used.has(c), `no robot in ${c}`);
  for (const c of CATEGORY_ORDER) assert.ok(CATEGORIES[c].label && CATEGORIES[c].blurb.length > 40, `${c}: no description`);

  const all = grouped(ids, 'all').flatMap((g) => g.robots);
  assert.equal(all.length, ids.length, 'All lists every robot once');
  for (const env of ['indoor', 'outdoor']) {
    const list = grouped(ids, env).flatMap((g) => g.robots);
    assert.deepEqual(new Set(list), new Set(ids.filter((i) => PROFILES[i].env.includes(env))), `${env}: wrong robots`);
    assert.equal(counts(ids)[env], list.length);
  }
  const both = ids.filter((i) => isBoth(PROFILES[i]));
  for (const i of both) assert.ok(inEnv(PROFILES[i], 'indoor') && inEnv(PROFILES[i], 'outdoor'), `${i}: both`);
  assert.equal(envLabel(PROFILES.mt1max), 'Indoor + outdoor');
  assert.equal(envLabel(PROFILES['xh-k3']), 'Outdoor');
});

test('catalogue: categories come out in the order of the list, floor cleaning first', () => {
  const g = grouped(Object.keys(PROFILES), 'all').map((x) => x.category);
  assert.equal(g[0], 'floor');
  assert.deepEqual(g, CATEGORY_ORDER.filter((c) => g.includes(c)));
});

test('catalogue: the deck robots do not race and have no dock; the floor cleaners do', () => {
  for (const [id, def] of Object.entries(ROBOTS)) {
    const floor = PROFILES[id].category === 'floor';
    assert.equal(def.race !== false, floor, `${id}: race flag`);
    if (!floor) assert.ok(def.noDock, `${id}: a non-floor robot has no docking station`);
  }
});
