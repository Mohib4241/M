// The interruption data: every recorded alarm belongs to one type, every type points to parts that
// exist on both robots, and the figures add up.
import test from 'node:test';
import assert from 'node:assert/strict';
import phantas from '../src/data/phantas.js';
import cc1pro from '../src/data/cc1pro.js';
import { STATS, SOURCE } from '../src/data/interruption-stats.js';
import { TYPES, CATEGORIES, CATEGORY_ORDER, partsFor, typeStats, totalEvents, ranked, fmtHours, wording, typesForPart, alarmCodes } from '../src/data/interruptions.js';

const ROBOTS = { phantas, cc1pro };

test('interruptions: every recorded alarm code belongs to exactly one type, and every type code was recorded', () => {
  const seen = new Map();
  for (const t of TYPES) for (const c of t.codes) {
    assert.ok(STATS[c], `${t.id}: code ${c} was never recorded`);
    assert.ok(!seen.has(c), `code ${c} is in both ${seen.get(c)} and ${t.id}`);
    seen.set(c, t.id);
  }
  for (const c of Object.keys(STATS)) assert.ok(seen.has(Number(c)), `code ${c} (${STATS[c].reasons[0]}) has no type`);
});

test('interruptions: a type has one category, and it matches the recorded data', () => {
  for (const t of TYPES) {
    assert.ok(CATEGORIES[t.category], `${t.id}: unknown category ${t.category}`);
    for (const c of t.codes) assert.equal(STATS[c].category, t.category, `${t.id} code ${c}`);
  }
  assert.deepEqual(CATEGORY_ORDER.sort(), [...new Set(TYPES.map((t) => t.category))].sort()); // no empty category
  for (const c of Object.values(CATEGORIES)) assert.match(c.color, /^#[0-9a-f]{6}$/);
});

test('interruptions: every type points to real parts on both robots, with at least one main part', () => {
  for (const t of TYPES) {
    assert.ok(t.title && t.why, `${t.id}: title and why`);
    for (const [rid, robot] of Object.entries(ROBOTS)) {
      const m = partsFor(t, rid);
      assert.ok(m && m.main.length > 0, `${t.id} has no main part on ${rid}`);
      const ids = new Set(robot.parts.map((p) => p.id));
      for (const id of [...m.main, ...m.rel]) assert.ok(ids.has(id), `${t.id}: ${rid} has no part "${id}"`);
      assert.equal(new Set([...m.main, ...m.rel]).size, m.main.length + m.rel.length, `${t.id} on ${rid} lists a part twice`);
      if (m.fit === 'nearest') assert.ok(m.note, `${t.id} on ${rid} is a nearest fit and needs a note`);
    }
  }
});

test('interruptions: the figures add up', () => {
  assert.equal(totalEvents(), SOURCE.rows);
  assert.equal(totalEvents(), 827);
  const byId = Object.fromEntries(TYPES.map((t) => [t.id, t]));
  // spot checks, counted by hand from the data
  assert.equal(typeStats(byId.estop).n, 344);
  assert.equal(typeStats(byId.battery).n, 168);
  assert.equal(typeStats(byId['waste-tank']).n, 104);
  assert.equal(typeStats(byId.suction).n, 83);
  assert.equal(typeStats(byId['dust-bag']).n, 19);
  assert.equal(typeStats(byId.battery).max, 167.13); // the longest alarm anywhere
  assert.equal(typeStats(byId['waste-tank']).max, 165.82);
  assert.equal(typeStats(byId.suction).max, 17.24);
});

test('interruptions: statistics are consistent', () => {
  for (const t of TYPES) {
    const s = typeStats(t);
    assert.ok(s.n > 0, t.id);
    assert.ok(s.median >= 0 && s.median <= s.max && s.mean <= s.max + 1e-9, t.id);
    assert.ok(Math.abs(s.hours - s.mean * s.n) < 1e-6, t.id);
  }
  // an even-length list takes the mean of the middle two, an odd one the middle value
  assert.equal(typeStats({ codes: [103] }).n, 42);
  assert.ok(Number.isFinite(typeStats({ codes: [103] }).median));
  assert.equal(typeStats({ codes: [999999] }).n, 0); // a code nobody recorded
});

test('interruptions: the dropdown order is by category, then the most frequent first', () => {
  const r = ranked();
  assert.equal(r.length, TYPES.length);
  const cats = r.map((t) => CATEGORY_ORDER.indexOf(t.category));
  assert.deepEqual(cats, [...cats].sort((a, b) => a - b), 'grouped by category in order');
  assert.deepEqual(r.filter((t) => t.category === 'Notice').map((t) => t.id), ['estop', 'bumper-hit']); // 344 before 14
  const maint = r.filter((t) => t.category === 'Maintenance').map((t) => t.id);
  assert.deepEqual(maint.slice(0, 2), ['battery', 'waste-tank']); // 168, then 104
  for (const cat of CATEGORY_ORDER) {
    const ns = r.filter((t) => t.category === cat).map((t) => typeStats(t).n);
    assert.deepEqual(ns, [...ns].sort((a, b) => b - a), `${cat} is most frequent first`);
  }
});

test('interruptions: alarm lengths read well', () => {
  assert.equal(fmtHours(0), '< 1 min');
  assert.equal(fmtHours(0.1), '6 min');
  assert.equal(fmtHours(0.5), '30 min');
  assert.equal(fmtHours(1.25), '1.3 h');
  assert.equal(fmtHours(12.4), '12 h');
  assert.ok(wording(TYPES.find((t) => t.id === 'bumper-hit')).startsWith('Bumper triggered'));
});

test('interruptions: a part knows which interruptions point at it, and every main part is found again', () => {
  for (const [rid, robot] of Object.entries(ROBOTS)) {
    for (const t of TYPES) for (const id of partsFor(t, rid).main) {
      const hit = typesForPart(id, rid).find((x) => x.type.id === t.id);
      assert.ok(hit && hit.role === 'main', `${rid}: ${id} should list ${t.id}`);
    }
    assert.ok(robot.parts.some((p) => typesForPart(p.id, rid).length === 0), `${rid} has parts no alarm points at`); // e.g. the roller brush
  }
  assert.deepEqual(typesForPart('e-stop', 'phantas').map((x) => x.type.id), ['estop']);
  assert.ok(typesForPart('battery', 'cc1pro').some((x) => x.type.id === 'battery'));
});

test('interruptions: alarm codes add up to the type\'s count', () => {
  const estop = TYPES.find((t) => t.id === 'estop');
  assert.deepEqual(alarmCodes(estop).map((c) => [c.code, c.n]), [[20022, 343], [500, 1]]);
  for (const t of TYPES) assert.equal(alarmCodes(t).reduce((s, c) => s + c.n, 0), typeStats(t).n, t.id);
});
