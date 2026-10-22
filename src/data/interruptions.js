// Interruptions: what stops a cleaning robot mid-run, and where on the robot it comes from.
//
// The counts and durations come from a fleet data workbook (see interruption-stats.js, generated
// by scripts/interruptions_from_xlsx.py). The workbook covers three models: Phantas, Omnie and
// Whiz. It has no rows for the CC1 Pro, so for that robot the page shows fleet-wide figures and
// says so.
//
// Which part an alarm points to is a mapping written here by hand, by what each part does. The
// workbook only names the alarm, not the part, so this is a reading of the alarm, not data.
// `fit: 'nearest'` marks a robot that has no part of exactly that kind (the CC1 Pro has no
// anti-drop sensor, neither robot has a separate suction pipe) and the closest part is used.
import { STATS, SOURCE } from './interruption-stats.js';

export { SOURCE };

// Colours work on both looks; they are used for dots, rings and glows, never for body text.
export const CATEGORIES = {
  Notice: { color: '#f0a000' },
  Maintenance: { color: '#2f7df6' },
  'Suction/airflow': { color: '#0fb5a4' },
  'Navigation interference': { color: '#e0457b' },
  'Location lost': { color: '#8b5cf6' },
  'Sensor error': { color: '#e5484d' },
};
export const CATEGORY_ORDER = Object.keys(CATEGORIES);

// `main` parts glow fully; `rel` (related) parts glow softly. A part id is that robot's part id.
export const TYPES = [
  {
    id: 'estop', title: 'Emergency stop pressed', category: 'Notice', codes: [20022, 500],
    why: 'The alarm comes from the red emergency-stop switch.',
    parts: { phantas: { main: ['e-stop'], rel: ['smart-handle'] }, cc1pro: { main: ['e-stop'] } },
  },
  {
    id: 'bumper-hit', title: 'Bumper triggered', category: 'Notice', codes: [21001],
    why: 'The front bumper was pressed in; the robot tries to back out of it on its own.',
    parts: { phantas: { main: ['bumper'] }, cc1pro: { main: ['bumper'], rel: ['line-sensor-f'] } },
  },
  {
    id: 'battery', title: 'Battery low', category: 'Maintenance', codes: [20021, 604],
    why: 'The battery ran low; the charge contacts are where the dock refills it.',
    parts: { phantas: { main: ['battery'], rel: ['charge-contacts'] }, cc1pro: { main: ['battery'], rel: ['charge-contacts'] } },
  },
  {
    id: 'waste-tank', title: 'Waste water tank full', category: 'Maintenance', codes: [20005],
    why: 'The tank that collects the dirty water is full and must be emptied before cleaning goes on.',
    parts: { phantas: { main: ['recovery-tank'] }, cc1pro: { main: ['dirty-tank'], rel: ['drain-outlet'] } },
  },
  {
    id: 'dust-bag', title: 'Dust bag full', category: 'Maintenance', codes: [605],
    why: 'The dry-debris store is full.',
    parts: { phantas: { main: ['dust-bag'], rel: ['trash-can'] }, cc1pro: { main: ['dust-bin'], fit: 'nearest', note: 'The CC1 Pro has a dust bin, with a bag as an option.' } },
  },
  {
    id: 'sensor-dirty', title: 'Bottom sensor dirty', category: 'Maintenance', codes: [6000],
    why: 'A floor-facing sensor is covered or dirty and needs wiping.',
    parts: { phantas: { main: ['cliff-sensors'] }, cc1pro: { main: ['line-sensor-f', 'line-sensor-r'], fit: 'nearest', note: 'The CC1 Pro has no separate anti-drop sensor; its low single-line sensors are the closest.' } },
  },
  {
    id: 'suction', title: 'Suction pipe blocked', category: 'Suction/airflow', codes: [10041],
    why: 'Something blocks the suction path, so the vacuum cannot lift the water. Both ends of the path glow.',
    parts: {
      phantas: { main: ['squeegee', 'recovery-tank'], rel: ['vacuum-motor'], fit: 'nearest', note: 'There is no separate suction-pipe part; the squeegee and the recovery tank are the two ends of it.' },
      cc1pro: { main: ['squeegee', 'dirty-tank'], rel: ['vacuum-motor'], fit: 'nearest', note: 'There is no separate suction-pipe part; the squeegee and the dirty tank are the two ends of it.' },
    },
  },
  {
    id: 'stuck', title: 'Robot is stuck', category: 'Navigation interference', codes: [103],
    why: 'The robot cannot move on. The wheels and frame are what hold it; the sensors beside them noticed.',
    parts: {
      phantas: { main: ['chassis', 'caster'], rel: ['bumper', 'lidar-2d', 'depth-cameras', 'cliff-sensors'] },
      cc1pro: { main: ['chassis', 'rear-casters'], rel: ['bumper', 'lidar', 'rgbd-camera', 'ultrasonic'] },
    },
  },
  {
    id: 'path-blocked', title: 'Path is blocked', category: 'Navigation interference', codes: [104, 302, 304],
    why: 'The sensors that look ahead found something in the way.',
    parts: {
      phantas: { main: ['lidar-2d', 'depth-cameras'], rel: ['bumper'] },
      cc1pro: { main: ['lidar', 'rgbd-camera'], rel: ['ultrasonic', 'line-sensor-f', 'bumper'] },
    },
  },
  {
    id: 'bumper-stuck', title: 'Bumper stuck', category: 'Navigation interference', codes: [602, 620],
    why: 'The front bumper is held in.',
    parts: { phantas: { main: ['bumper'] }, cc1pro: { main: ['bumper'], rel: ['line-sensor-f'] } },
  },
  {
    id: 'cliff', title: 'Cliff detected', category: 'Navigation interference', codes: [601],
    why: 'The floor-facing sensors lost the floor, like a step or a dock edge.',
    parts: { phantas: { main: ['cliff-sensors'] }, cc1pro: { main: ['line-sensor-f', 'line-sensor-r'], fit: 'nearest', note: 'The CC1 Pro has no separate anti-drop sensor; its low single-line sensors are the closest.' } },
  },
  {
    id: 'no-recover', title: 'Robot failed to recover', category: 'Navigation interference', codes: [106],
    why: 'The robot tried to free itself and could not: the wheels and frame, with the sensors that saw the trouble.',
    parts: {
      phantas: { main: ['chassis', 'caster'], rel: ['bumper', 'lidar-2d', 'depth-cameras'] },
      cc1pro: { main: ['chassis', 'rear-casters'], rel: ['bumper', 'lidar', 'rgbd-camera'] },
    },
  },
  {
    id: 'pos-lost', title: 'Positioning lost', category: 'Location lost', codes: [20057],
    why: 'The robot no longer knows where it is on its map: the laser scanner and the cameras that locate it.',
    parts: {
      phantas: { main: ['lidar-2d'], rel: ['depth-cameras', 'rgb-camera'] },
      cc1pro: { main: ['lidar', 'vslam-camera'], rel: ['rgbd-camera'] },
    },
  },
  {
    id: 'front-cam', title: 'Front camera error', category: 'Sensor error', codes: [6002],
    why: 'The forward-facing colour camera reports a fault.',
    parts: { phantas: { main: ['rgb-camera'], rel: ['depth-cameras'] }, cc1pro: { main: ['front-rgb'], rel: ['rgbd-camera'] } },
  },
];

/** The part ids an interruption points to on a robot ({ main, rel, fit, note }), or null if none. */
export function partsFor(type, robotId) {
  const p = type.parts[robotId];
  return p ? { main: p.main || [], rel: p.rel || [], fit: p.fit || 'direct', note: p.note || '' } : null;
}

// The workbook's robot model for each robot in the viewer. The CC1 Pro is not in the workbook.
export const DATA_MODEL = { phantas: 'phantas', cc1pro: null };
export const MODEL_LABEL = { phantas: 'Phantas', omnie: 'Omnie', whiz: 'Whiz' };

const median = (sorted) => {
  const n = sorted.length;
  return n ? (n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2) : 0;
};

/**
 * Figures for one interruption type. model: a workbook model ('phantas', 'omnie', 'whiz'), or
 * null for the whole fleet in the workbook. Durations are alarm lengths in hours.
 */
export function typeStats(type, model = null) {
  const all = [];
  for (const code of type.codes) {
    const h = STATS[code]?.hours;
    if (!h) continue;
    for (const [m, list] of Object.entries(h)) if (model === null || m === model) all.push(...list);
  }
  all.sort((a, b) => a - b);
  const total = all.reduce((s, v) => s + v, 0);
  return { n: all.length, hours: total, median: median(all), mean: all.length ? total / all.length : 0, max: all.length ? all[all.length - 1] : 0 };
}

/** How many interruptions the workbook holds for a model (null: all of them). */
export function totalEvents(model = null) {
  return TYPES.reduce((s, t) => s + typeStats(t, model).n, 0);
}

/** The types in dropdown order: by category, then the most frequent first on the robot's own model, then fleet-wide. */
export function ranked(robotId) {
  const model = DATA_MODEL[robotId] ?? null;
  const key = (t) => [typeStats(t, model).n, typeStats(t, null).n];
  return [...TYPES].sort((a, b) => {
    const c = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    if (c) return c;
    const [an, af] = key(a), [bn, bf] = key(b);
    return bn - an || bf - af;
  });
}

/** An alarm length as text: minutes under an hour, hours above. */
export function fmtHours(h) {
  if (h < 0.0085) return '< 1 min';
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${h < 10 ? h.toFixed(1) : Math.round(h)} h`;
}

/** The alarm wording from the workbook for a type: the first reason on its first code that has data. */
export function wording(type) {
  for (const code of type.codes) if (STATS[code]) return STATS[code].reasons[0];
  return type.title;
}

/** The alarm codes of a type with their workbook wording and the event count, fleet-wide. */
export function alarmCodes(type) {
  return type.codes.filter((c) => STATS[c]).map((c) => ({
    code: c,
    reason: STATS[c].reasons[0],
    n: Object.values(STATS[c].hours).reduce((s, l) => s + l.length, 0),
  }));
}

/** Which interruption types point at a part on a robot, and how: [{ type, role: 'main' | 'rel' }]. */
export function typesForPart(partId, robotId) {
  const out = [];
  for (const type of TYPES) {
    const m = partsFor(type, robotId);
    if (!m) continue;
    if (m.main.includes(partId)) out.push({ type, role: 'main' });
    else if (m.rel.includes(partId)) out.push({ type, role: 'rel' });
  }
  return out;
}

/** The workbook's per-model event counts for a type: { phantas: 273, omnie: 70, whiz: 1 }. */
export function modelCounts(type) {
  const out = {};
  for (const m of Object.keys(SOURCE.models)) {
    const n = typeStats(type, m).n;
    if (n) out[m] = n;
  }
  return out;
}
