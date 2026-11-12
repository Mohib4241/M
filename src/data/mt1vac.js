// PUDU MT1 Vac, a robotic sweeper and vacuum. Y up, +Z front, 1 unit = 100 mm (840 L x 600 W x 490 H mm, 75 kg).
// Numbers come from PUDU's own MT1 Vac page (its specification table). PUDU's pictures show the same
// black body as the MT1, so the outside is built by the MT1's code (see mt1.js); the parts that differ
// (two suction fans, dust bags, a smaller trash bin, a HEPA filter, a dust mop and a hand vacuum) are
// changed or added here. Positions inside are a schematic reconstruction.
import * as L from '../lib.js';
import { mt1Def } from './mt1.js';

const SITE = 'pd-mt1vac', IMG = 'pd-mt1vac-img';
const base = mt1Def(false, { label: 'PUDU MT1 Vac' });
const part = (id) => base.parts.find((p) => p.id === id);
const swap = { // parts of the MT1 that the Vac changes
  'side-brush-l': (p) => ({ ...p, name: 'Left side brush', src: [SITE, IMG], desc: 'One of the two side brushes under the front lip, as PUDU\'s pictures show. They sweep debris in from the edges toward the 55 cm suction path; PUDU gives a sweeping width of 70 cm with the side brush, and they swap without tools.', specs: [['Sweeping width', '70 cm with side brush'], ['Swap', 'Without tools']] }),
  'side-brush-r': (p) => ({ ...p, name: 'Right side brush', src: [SITE, IMG], desc: 'One of the two side brushes under the front lip, as PUDU\'s pictures show. They sweep debris in from the edges toward the 55 cm suction path; PUDU gives a sweeping width of 70 cm with the side brush, and they swap without tools.', specs: [['Sweeping width', '70 cm with side brush'], ['Swap', 'Without tools']] }),
  'roller-brush': (p) => ({ ...p, tag: '55 cm', conf: 'confirmed', src: [SITE], desc: 'The roller brush across the 55 cm suction path. PUDU says the robot tells carpet from hard floor and sets the suction and the brush speed to suit, and that the roller swaps without tools.', specs: [['Vacuuming width', '55 cm'], ['Floors', 'Carpet and hard floor, recognised by AI']] }),
  'trash-bin': (p) => ({
    ...p, tag: '6 L', src: [SITE], desc: 'The 6 L bin for the larger rubbish, kept apart from the fine dust, which goes to the dust bags. It swaps without tools.',
    specs: [['Capacity', '6 L (0.21 ft³)'], ['Swap', 'Without tools']],
    home: [0, p.home[1] - 0.35, 1.2],
    build(b) { b.box(4.4, 1.3, 1.5, { m: 'tankDi', r: 0.2, ec: 'accent', eo: 0.7 }); b.box(4.2, 0.5, 1.3, { m: 'sludge', r: 0.14, at: [0, -0.35, 0], e: false }); b.box(1.4, 0.16, 0.26, { m: 'lime', r: 0.06, at: [0, 0.3, 0.8] }); },
  }),
  filter: (p) => ({ ...p, name: 'HEPA filter', tag: 'H11', src: [SITE], desc: 'The air filter after the dust bags. PUDU rates it H11 and says it holds more than 98% of particles down to 0.3 µm; an H13 filter (99.97%) is an option.', specs: [['Grade', 'H11 (H13 optional)'], ['Holds', 'Over 98% at 0.3 µm · 99.97% with H13']] }),
  'vacuum-motor': (p) => ({
    ...p, name: 'Suction fans (2)', tag: 'Dual fan', conf: 'confirmed', src: [SITE],
    desc: 'Two fans, each with its own air duct. PUDU says the dual-duct system raises suction efficiency by 200% and keeps dust from spreading. Their ratings are not published.',
    specs: [['Fans', '2, with independent air ducts'], ['Rating', 'Not published']],
    home: [0, p.home[1], p.home[2]], ex: [0, 2.6, -3.2],
    build(b) { for (const s of [-1, 1]) b.at([s * 1.5, 0, 0], () => L.turbine(b, { r: 0.46, h: 0.75 })); },
  }),
  battery: (p) => ({ ...p, tag: '3–6.5 h', conf: 'named', src: [SITE], desc: 'The battery pack: 3 to 6.5 hours of work (4 hours in standard sweep-and-vacuum mode on hard floors), charged in under 3.5 hours. PUDU calls it a large battery with fast charging but does not publish its capacity.', specs: [['Capacity', 'Not published'], ['Runtime', '3–6.5 h (4 h standard)'], ['Charging', 'Under 3.5 h']] }),
  'charge-contacts': (p) => ({ ...p, src: [SITE], desc: 'Where the automatic charging station meets the robot. Their position here is schematic.', specs: [['Charging', 'Under 3.5 h, automatic station']] }),
};
const dims = base.parts.find((p) => p.id === 'trash-bin').home;
const added = [
  {
    id: 'dust-bags', name: 'Dust bags (2)', group: 'air', layer: 1, delay: 0.08,
    home: [0, dims[1] + 0.1, -0.75], ex: [0, 3.0, 0.4], tag: '14 L', conf: 'confirmed', src: [SITE],
    desc: 'Two 7 L dust bags that take the fine dust, apart from the larger rubbish in the trash bin. PUDU says this lets one run cover a large area without frequent emptying.',
    specs: [['Capacity', '14 L (7 L × 2)']],
    build(b) { for (const s of [-1, 1]) { b.box(2.0, 1.9, 1.7, { m: 'fabric', r: 0.3, at: [s * 1.12, 0, 0] }); b.cyl(0.24, 0.24, 0.1, { m: 'graphite', rot: [Math.PI / 2, 0, 0], at: [s * 1.12, 0.3, 0.88], seg: 18, e: false }); } },
  },
  {
    id: 'dust-mop', name: 'Dust mop module', group: 'clean', layer: 3, delay: 0.12,
    home: [0, 0.3, -3.3], ex: [0, -1.8, -4.2], tag: 'Dust mop', conf: 'named', src: [SITE],
    desc: 'The quick-release dust mop PUDU lists for the MT1 Vac: it follows the suction to pick up the last fine dust, and comes off without tools. Its place and size here are schematic.',
    specs: [['Release', 'Quick-release, no tools']],
    build(b) { b.box(5.0, 0.16, 0.9, { m: 'graphite', r: 0.06, at: [0, 0.14, 0] }); b.box(5.1, 0.18, 1.0, { m: { k: 'fabric', id: 'vac-mop', color: 0x3f6fb5 }, r: 0.08, at: [0, -0.04, 0], e: false }); },
  },
  {
    id: 'hand-vac', name: 'Hand-vacuum extension', group: 'air', layer: 1, delay: 0.14,
    home: [-2.0, dims[1] + 0.6, -3.0], ex: [-4.2, 2.6, -3.4], tag: 'Hand vac', conf: 'named', src: [SITE],
    desc: 'The hose and nozzle PUDU lists for cleaning by hand where the robot cannot reach: sofa sides, walls, glass, edges and high surfaces. Where it stows on the robot is not shown; its place here is schematic.',
    specs: [['Use', 'Edges, high surfaces, soft furnishings']],
    build(b) { b.cyl(0.16, 0.16, 2.2, { m: 'dark', rot: [Math.PI / 2, 0, 0], seg: 14 }); b.box(0.7, 0.14, 0.36, { m: 'graphite', r: 0.05, at: [0, -0.05, 1.25] }); },
  },
];

export default {
  ...base,
  id: 'mt1vac',
  name: 'PUDU MT1 Vac',
  short: 'MT1 Vac',
  blurb: 'AI-powered robotic sweeper and vacuum for carpet and hard floors: two suction fans, a 55 cm suction path, dust bags apart from the trash bin, and HEPA-grade filtering.',
  accent: '#5fd0ff', accent2: '#b5e61d',
  studio: { accent: '#1f86b8', accent2: '#6f9a12' },
  noDock: 'PUDU lists an automatic charging station for the MT1 Vac but publishes no size for it, so it is not modelled here.',
  stats: [
    ['Size', '840 × 600 × 490 mm'],
    ['Weight', '75 kg'],
    ['Cleaning', 'Sweeping, vacuuming, dust mopping'],
    ['Vacuuming width', '55 cm'],
    ['Sweeping width', '70 cm with side brush'],
    ['Throughput', 'Up to 1,400 m²/h'],
    ['Dust', '14 L of dust bags (7 L × 2) · 6 L trash bin'],
    ['Air filter', 'H11 · H13 optional'],
    ['Runtime', '3–6.5 h (4 h standard, hard floors)'],
    ['Charging', 'Under 3.5 h'],
    ['Speed', '0.2–1.2 m/s'],
    ['Path clearance', '75 cm wide · 52 cm high at least'],
    ['Navigation', 'VSLAM · markers · LiDAR SLAM'],
  ],
  notes: [
    'PUDU\'s page gives the MT1 Vac the same 840 × 600 × 490 mm as the MT1, at 75 kg (the MT1 is 65 kg), and its pictures show the same black body. The model is therefore the MT1\'s body with the vacuum parts changed or added.',
    'PUDU names: two fans with independent air ducts (suction efficiency up 200%), a 55 cm suction path, dust and waste kept apart (14 L of dust bags, a 6 L trash bin), HEPA-grade filtering, AI recognition of carpet and hard floor, AI spot cleaning, a quick-release dust mop, a hand-vacuum extension, and tool-free swaps of the dust mop, dustbin, trash bin, roller brush and side brushes.',
    'PUDU says it works under furniture 52 cm high and in aisles 75 cm wide, and that it connects to elevators and e-gates.',
    'Not published by PUDU, and so not stated here: the battery capacity, the fans\' ratings, and where the dust mop and the hand vacuum sit. Their places in the model are schematic.',
  ],
  sources: [SITE, IMG, 'pd-mt1', 'pd-mt1-img'],
  parts: [...base.parts.map((p) => (swap[p.id] ? swap[p.id](p) : p)), ...added],
};
