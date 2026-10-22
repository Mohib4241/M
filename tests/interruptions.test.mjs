// The interruption data: every alarm in the workbook belongs to one type, every type points to parts
// that exist on both robots, and the figures agree with the workbook's own totals.
import test from 'node:test';
import assert from 'node:assert/strict';
import phantas from '../src/data/phantas.js';
import cc1pro from '../src/data/cc1pro.js';
import { STATS, SOURCE } from '../src/data/interruption-stats.js';
import { TYPES, CATEGORIES, CATEGORY_ORDER, partsFor, typeStats, totalEvents, ranked, fmtHours, wording, DATA_MODEL, typesForPart, alarmCodes, modelCounts } from '../src/data/interruptions.js';

const ROBOTS = { phantas, cc1pro };

test('interruptions: every alarm code in the workbook belongs to exactly one type, and every type code is in the workbook', () => {
  const seen = new Map();
  for (const t of TYPES) for (const c of t.codes) {
    assert.ok(STATS[c], `${t.id}: code ${c} is not in the workbook`);
    assert.ok(!seen.has(c), `code ${c} is in both ${seen.get(c)} and ${t.id}`);
    seen.set(c, t.id);
  }
  for (const c of Object.keys(STATS)) assert.ok(seen.has(Number(c)), `code ${c} (${STATS[c].reasons[0]}) has no type`);
});

test('interruptions: a type has one category, and it is the workbook\'s', () => {
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

test('interruptions: the figures agree with the workbook', () => {
  assert.equal(totalEvents(), SOURCE.rows);
  for (const [m, n] of Object.entries(SOURCE.models)) assert.equal(totalEvents(m), n, m);
  const byId = Object.fromEntries(TYPES.map((t) => [t.id, t]));
  // spot checks against the sheet, counted by hand from the Interruptions tab
  assert.equal(typeStats(byId.suction, 'phantas').n, 83);
  assert.equal(typeStats(byId['waste-tank'], 'phantas').n, 33);
  assert.equal(typeStats(byId['waste-tank'], 'omnie').n, 71);
  assert.equal(typeStats(byId.estop, 'phantas').n, 273);
  assert.equal(typeStats(byId.estop, null).n, 344); // 273 + 70 on the Omnie + 1 on the Whiz
  assert.equal(typeStats(byId['dust-bag'], 'phantas').n, 0); // only the Whiz reports it
  assert.equal(typeStats(byId['dust-bag'], null).n, 19);
});

test('interruptions: the CC1 Pro has no rows in the workbook, so its own figures are empty and the fleet figures are not', () => {
  assert.equal(DATA_MODEL.cc1pro, null);
  const t = TYPES[0];
  assert.ok(typeStats(t, null).n > 0);
});

test('interruptions: statistics are consistent', () => {
  for (const t of TYPES) {
    const s = typeStats(t, null);
    assert.ok(s.n > 0, t.id);
    assert.ok(s.median >= 0 && s.median <= s.max && s.mean <= s.max + 1e-9, t.id);
    assert.ok(Math.abs(s.hours - s.mean * s.n) < 1e-6, t.id);
  }
  // the median of an even-length list is the mean of the middle two
  const fake = { codes: [103] };
  assert.ok(typeStats(fake, 'whiz').n === 42 && Number.isFinite(typeStats(fake, 'whiz').median));
});

test('interruptions: the dropdown order is by category, then the most frequent first on the open robot', () => {
  const r = ranked('phantas');
  assert.equal(r.length, TYPES.length);
  const cats = r.map((t) => CATEGORY_ORDER.indexOf(t.category));
  assert.deepEqual(cats, [...cats].sort((a, b) => a - b), 'grouped by category in order');
  const notice = r.filter((t) => t.category === 'Notice').map((t) => t.id);
  assert.deepEqual(notice, ['estop', 'bumper-hit']); // 273 before 14 on the Phantas
  const maint = r.filter((t) => t.category === 'Maintenance').map((t) => t.id);
  assert.equal(maint[0], 'battery'); // 60 on the Phantas, ahead of the waste tank's 33
  // the CC1 Pro has no rows of its own, so the fleet counts decide
  const c = ranked('cc1pro').filter((t) => t.category === 'Maintenance').map((t) => t.id);
  assert.equal(c[0], 'battery'); // 164 fleet-wide, ahead of the waste tank's 104
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

test('interruptions: alarm codes and per-model counts add up', () => {
  const estop = TYPES.find((t) => t.id === 'estop');
  assert.deepEqual(alarmCodes(estop).map((c) => [c.code, c.n]), [[20022, 343], [500, 1]]);
  assert.deepEqual(modelCounts(estop), { omnie: 70, phantas: 273, whiz: 1 });
  for (const t of TYPES) assert.equal(alarmCodes(t).reduce((s, c) => s + c.n, 0), typeStats(t, null).n, t.id);
});
