// PUDU CC1 Pro. Y up, +Z front, 1 unit = 100 mm.
// Part names and numbers come from PUDU's operation guide, the CC1 version-comparison sheet
// and retailer spec listings. The outside follows a photograph of the unit; shapes and internal positions
// are a schematic reconstruction.
import * as THREE from 'three';
import * as L from '../lib.js';
import { screenTexture } from '../kit.js';

const PI = Math.PI;

export default {
  id: 'cc1pro',
  name: 'PUDU CC1 Pro',
  short: 'CC1 Pro',
  maker: 'PUDU Robotics',
  blurb: 'AI-powered 4-in-1 cleaner. A rear camera checks the floor it just cleaned and goes back for missed stains.',
  accent: '#ffb347',
  accent2: '#ff5a3c',
  studio: { accent: '#c8741a', accent2: '#d04a2c' },
  hover: 2.0,
  // slate body with a lighter side panel and a black base, as in the photograph
  mats: {
    studio: {
      shell:   { color: 0x565c65, metalness: 0.15, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3 },
      shellDk: { color: 0x14171a, metalness: 0.2,  roughness: 0.3,  clearcoat: 0.8, clearcoatRoughness: 0.15 },
      trim:    { color: 0x2b3036 },
      graphite:{ color: 0x8b929b },
    },
  },
  stats: [
    ['Size', '629 × 552 × 695 mm'],
    ['Weight', '75 kg'],
    ['Water tanks', '15 L clean · 15 L dirty'],
    ['Debris', '2.5 L bin · 6 L bag optional'],
    ['Cleaning width', '500 mm with side brush'],
    ['Throughput', '700–1,000 m²/h'],
    ['Battery', '50 Ah'],
    ['Runtime', '5 h scrub · 9 h silent mop'],
    ['Screen', '10.1-inch LCD'],
    ['Sensing', 'LiDAR · VSLAM · RGBD · AI camera'],
  ],
  notes: [
    'The base CC1 sheet lists a 17 L waste-water tank; CC1 Pro retailers list 15 L.',
    'RobotLAB quotes up to 8 h runtime, while other listings give 5 h scrubbing and 9 h silent mopping.',
    'One retailer lists 17,000 Pa suction. Battery voltage is not given in the sources reached.',
    'The outside follows a photograph of the unit: a tall boxy body on a wider black base, a big angled screen at the front top, a camera pod and a row of ultrasonic sensors below it. The charging station is shown behind the robot; it is listed at 390 × 390 × 165 mm and 5.5 kg and its shape here is schematic.',
  ],
  sources: ['photos', 'pd-guide', 'pd-cmp', 'pd-site', 'pbtech', 'hh', 'rl-pd', 'homery', 'anton'],
  water: ['clean-tank:out', 'pump:a', 'pump:b', 'roller-chamber:nozzle', 'squeegee:in', 'dirty-tank:in'],

  parts: [
    // ───────────── Shell & covers ─────────────
    {
      id: 'top-hood', name: 'Top hood', group: 'shell', layer: 0, delay: 0,
      home: [0, 6.375, -0.15], ex: [0, 4.3, 0], tag: 'Roof', conf: 'named', src: ['photos', 'pd-guide'],
      desc: 'The upper lid. It carries the emergency stop and the roof camera dome and lifts away first, exposing both tanks.',
      specs: [['Overall height', '695 mm']],
      build(b) {
        b.panel(5.3, 5.8, 0.25, { m: 'shell', r: 0.9, bevel: 0.08, rot: [-PI / 2, 0, 0] });
        b.panel(5.1, 5.6, 0.1, { m: 'dark', r: 0.8, bevel: 0.02, rot: [-PI / 2, 0, 0], at: [0, -0.17, 0], e: false });
      },
    },
    {
      id: 'front-shell', name: 'Front panel', group: 'shell', layer: 0, delay: 0.03,
      home: [0, 4.05, 2.47], ex: [0, 1.0, 4.8], tag: 'Sensor face', conf: 'named', src: ['photos', 'pd-cmp'],
      desc: 'The slate front panel. Under the screen it carries a small port plate and an upright camera pod; a row of ultrasonic sensors runs along its foot.',
      specs: [['Behind it', 'RGBD · front RGB · ultrasonic']],
      build(b) {
        b.panel(4.1, 4.4, 0.36, { m: 'shell', r: 0.4, bevel: 0.1 });
        b.panel(0.95, 2.0, 0.1, { m: 'trim', r: 0.47, bevel: 0.02, at: [0.9, -1.15, 0.2], e: false }); // the camera pod
        b.cyl(0.2, 0.2, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [0.9, -1.0, 0.28], seg: 24, e: false });
        b.cyl(0.14, 0.14, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [0.9, -1.55, 0.28], seg: 24, e: false });
        b.box(0.9, 0.26, 0.05, { m: 'trim', r: 0.05, at: [-0.6, 0.45, 0.19], e: false }); // port plate under the screen
      },
    },
    {
      id: 'rear-shell', name: 'Rear shell', group: 'shell', layer: 0, delay: 0.03,
      home: [0, 4.05, -2.77], ex: [0, 1.0, -4.8], tag: 'Rear door', conf: 'inferred', src: ['photos', 'pd-guide'],
      desc: 'Rear panel with a window for the AI camera, exhaust vents, and the cut-out where the drain hose leaves.',
      specs: [['Window for', 'Rear AI camera']],
      build(b) {
        b.panel(4.1, 4.4, 0.36, { m: 'shell', r: 0.4, bevel: 0.1 });
        b.box(1.5, 0.7, 0.06, { m: 'glass', at: [0, 0.6, -0.2], r: 0.04, e: false });
        for (let i = 0; i < 8; i++) b.box(2.2, 0.06, 0.04, { m: 'dark', at: [0, -0.5 - i * 0.14, -0.2], e: false });
      },
    },
    ...[-1, 1].map((s) => ({
      id: s < 0 ? 'side-shell-l' : 'side-shell-r', name: s < 0 ? 'Right side shell' : 'Left side shell',
      group: 'shell', layer: 0, delay: 0.06,
      home: [s * 2.37, 4.05, -0.15], ex: [s * 4.8, 0.9, 0], tag: 'Side panel', conf: 'named', src: ['photos', 'pd-guide'],
      desc: 'Side panel that closes the cabinet, with the rounded corners. A large lighter plate with the maker\'s mark covers most of it. It comes off outward to reach the tanks, battery and pump.',
      specs: [['Width', '552 mm overall']],
      build(b) {
        b.panel(4.6, 4.4, 0.36, { m: 'shell', r: 0.4, bevel: 0.1, rot: [0, PI / 2, 0] });
        for (const z of [-2.3, 2.3]) b.cyl(0.5, 0.5, 4.4, { m: 'shell', at: [-s * 0.32, 0, z], seg: 28, e: false }); // the rounded corners
        b.panel(4.0, 3.5, 0.06, { m: 'graphite', r: 0.5, bevel: 0.02, rot: [0, PI / 2, 0], at: [s * 0.2, 0.15, -0.1], e: false });
        b.box(0.05, 0.3, 1.2, { m: 'silver', r: 0.03, at: [s * 0.24, 1.2, -1.2], e: false }); // the maker's mark
        b.box(0.05, 0.28, 0.32, { m: 'yellow', r: 0.03, at: [s * 0.24, -1.45, -1.9], e: false }); // warning label
      },
    })),
    {
      id: 'bumper', name: 'Base and bumper', group: 'shell', layer: 0, delay: 0.1,
      home: [0, 1.0, 0], ex: [0, -0.4, 6.3], tag: 'Soft edge', conf: 'named', src: ['photos', 'pd-cmp'],
      desc: 'The wide black base. It runs round the whole robot, juts out at the front with a rounded lip, and houses the low front sensors. A dark gap separates it from the body above.',
      specs: [['Min. passage', '70 cm']],
      build(b) {
        b.panel(5.52, 6.29, 1.7, { m: 'shellDk', r: 0.95, bevel: 0.25, rot: [-PI / 2, 0, 0] });
        b.box(1.3, 0.16, 0.07, { m: 'glass', r: 0.05, at: [0, 0.0, 3.14], e: false }); // the low sensor slot
        b.panel(5.1, 5.7, 0.14, { m: 'dark', r: 0.8, bevel: 0.02, rot: [-PI / 2, 0, 0], at: [0, 0.85, -0.12], e: false });
      },
    },

    // ───────────── Controls ─────────────
    {
      id: 'display', name: '10.1″ touchscreen', group: 'ui', layer: 0, delay: 0.05,
      home: [0, 5.2, 2.9], rot0: [-0.3, 0, 0], ex: [0, 5.6, 2.6], tag: '10.1″', conf: 'confirmed', src: ['photos', 'pbtech', 'hh'],
      desc: 'The big screen on the front top, tilted back and held on two small hooks. Staff choose a map, a zone and a cleaning mode here and watch progress. Its size and tilt are schematic.',
      specs: [['Screen', '10.1-inch LCD'], ['Speed setting', '0.2–1.2 m/s']],
      build(b) {
        b.box(3.7, 2.35, 0.7, { m: 'trim', r: 0.25 });
        const tex = screenTexture('#ffb347');
        const scr = b.box(3.25, 1.9, 0.03, { m: 'screen', at: [0, 0, 0.36], e: false });
        scr.material.map = tex;
        scr.material.emissiveMap = tex;
        scr.material.emissive = new THREE.Color(0xffffff);
        scr.material.emissiveIntensity = 0.9;
        b.records.find((r) => r.mat === scr.material).emissive.set(0xffffff);
        for (const x of [-1.2, 1.2]) b.box(0.3, 0.3, 0.25, { m: 'steel', r: 0.05, at: [x, -1.25, -0.2], e: false });
      },
    },
    {
      id: 'e-stop', name: 'Emergency stop switch', group: 'ui', layer: 0, delay: 0.1,
      home: [-1.6, 6.5, -2.1], ex: [-1.6, 5.0, -0.5], tag: 'E-stop', conf: 'named', src: ['photos', 'pd-guide'],
      desc: 'The big red switch on the lid, at the rear corner. It stops everything at once. It is listed in the operation guide’s appearance table.',
      specs: [['Action', 'Cuts drive + brush power']],
      build(b) { L.eStop(b, { r: 0.28 }); },
    },

    // ───────────── Cleaning head ─────────────
    {
      id: 'roller-chamber', name: 'Roller brush chamber', group: 'clean', layer: 3, delay: 0,
      home: [0, 1.55, 2.1], ex: [0, -1.0, 2.4], tag: 'Hood', conf: 'named', src: ['pd-guide'],
      desc: 'The hood around the roller. The manual has a cleaning step just for it, because lint and hair build up inside.',
      specs: [['Manual section', 'Cleaning the roller brush chamber']],
      anchors: { nozzle: [0, 0.4, -0.2] },
      build(b) {
        b.box(4.2, 0.14, 1.5, { m: 'dark', r: 0.05, at: [0, 0.5, 0] });
        for (const s of [-1, 1]) {
          b.box(0.14, 1.0, 1.5, { m: 'shellDk', r: 0.04, at: [s * 2.05, 0, 0] });
          b.box(0.06, 0.3, 1.4, { m: 'rubber', at: [s * 1.98, -0.4, 0], e: false });
        }
        b.box(4.0, 0.9, 0.12, { m: 'shellDk', at: [0, 0.05, -0.7] });
        b.box(4.0, 0.2, 0.1, { m: 'rubber', at: [0, -0.4, 0.72], e: false });
        b.cyl(0.05, 0.05, 3.4, { m: 'steel', rot: [0, 0, PI / 2], at: [0, 0.4, -0.2], seg: 10 });
        for (let i = -5; i <= 5; i++) b.cyl(0.03, 0.03, 0.12, { m: 'accent', at: [i * 0.33, 0.33, -0.2], seg: 8, e: false });
      },
    },
    {
      id: 'scrub-roller', name: 'Scrubbing / sweeping roller brush', group: 'clean', layer: 3, delay: 0.04,
      home: [0, 0.45, 2.1], ex: [0, -1.9, 5.0], tag: 'Roller', conf: 'confirmed', src: ['pd-guide', 'pbtech'],
      desc: 'The main roller. It scrubs with water in scrubbing mode and sweeps in sweeping mode, and it is a wear part you swap.',
      specs: [['Manual section', 'Sweeping / scrubbing roller brushes'], ['Cleaning width', '500 mm incl. side brush']],
      build(b) { L.roller(b, { r: 0.45, len: 3.6, rows: 24 }); },
    },
    {
      id: 'mop-cloth', name: 'Mop cloth', group: 'clean', layer: 3, delay: 0.08,
      home: [0, 0.34, 1.1], ex: [0, -1.8, 3.4], tag: 'Dust-mop', conf: 'named', src: ['pd-guide'],
      desc: 'A washable cloth behind the roller for dust-mopping and a final wipe. The manual covers replacing it together with the squeegee.',
      specs: [['Manual section', 'Cleaning or replacing mop cloth & squeegee']],
      build(b) {
        b.box(3.7, 0.08, 1.0, { m: 'dark', r: 0.03, at: [0, 0.08, 0] });
        b.box(3.6, 0.1, 0.9, { m: 'fabric', r: 0.04, at: [0, -0.02, 0] });
        for (const s of [-1, 1]) b.box(0.3, 0.06, 0.25, { m: 'accent', at: [s * 1.6, 0.14, 0.6], e: false });
      },
    },
    {
      id: 'side-brush', name: 'Side brush', group: 'clean', layer: 3, delay: 0.1,
      home: [-2.55, 0.42, 2.75], ex: [-4.4, -1.5, 3.2], tag: 'Edges', conf: 'confirmed', src: ['pd-guide', 'pbtech'],
      desc: 'Spinning brush at the front corner that pulls debris from edges toward the roller. It adds to the 500 mm cleaning width.',
      specs: [['Cleaning width with brush', '500 mm']],
      build(b) { L.sideBrush(b, { r: 0.9 }); },
    },
    {
      id: 'squeegee', name: 'Squeegee', group: 'clean', layer: 3, delay: 0.1,
      home: [0, 0.42, -3.05], ex: [0, -1.7, -5.0], tag: 'Pick-up', conf: 'confirmed', src: ['pd-guide', 'anton'],
      desc: 'Rubber blade at the back that pulls dirty water off the floor and into the recovery path. Dull blades leave streaks, so it is replaceable.',
      specs: [['Moves water to', 'Dirty water tank']],
      anchors: { in: [0, 0.62, 0] },
      build(b) { L.squeegee(b, { w: 4.4 }); },
    },

    // ───────────── Water system ─────────────
    {
      id: 'clean-tank', name: 'Clean water tank', group: 'water', layer: 1, delay: 0,
      home: [0, 4.2, -1.45], ex: [-3.4, 3.2, -2.2], tag: '15 L', conf: 'confirmed', src: ['pbtech', 'hh', 'rl-pd'],
      desc: 'Fresh water for scrubbing. The pump draws from its outlet and sends it to the roller chamber.',
      specs: [['Capacity', '15 L (3.96 gal)']],
      anchors: { out: [0, -0.95, 0.6] },
      build(b) { L.tank(b, { w: 3.4, h: 1.9, d: 2.3, kind: 'clean', fill: 0.78 }); },
    },
    {
      id: 'dirty-tank', name: 'Dirty water tank', group: 'water', layer: 1, delay: 0.04,
      home: [0, 2.2, -1.45], ex: [3.4, 1.2, -2.4], tag: '15 L', conf: 'confirmed', src: ['pbtech', 'hh', 'pd-guide'],
      desc: 'Collects what the squeegee lifts off the floor. The operation guide has a cleaning procedure for it.',
      specs: [['Capacity', '15 L (base CC1 sheet: 17 L)'], ['Drains through', 'Drain outlet at the rear']],
      anchors: { in: [0, 0.95, 0.6] },
      build(b) { L.tank(b, { w: 3.4, h: 1.9, d: 2.3, kind: 'dirty', fill: 0.5, cap: false }); },
    },
    {
      id: 'pump', name: 'Solution pump', group: 'water', layer: 2, delay: 0,
      home: [-2.0, 1.55, -0.1], rot0: [0, -PI / 2, 0], ex: [-4.2, 0.4, 1.2], tag: 'Pump', conf: 'inferred', src: ['pd-guide'],
      desc: 'Moves water from the clean tank to the roller chamber. Typical for a scrubber; sizing is not published.',
      specs: [['Feeds', 'Roller chamber spray bar']],
      anchors: { a: [0, -0.5, 0], b: [0.82, -0.15, 0] },
      build(b) { L.pump(b); },
    },
    {
      id: 'drain-outlet', name: 'Drain outlet', group: 'water', layer: 2, delay: 0.1,
      home: [-1.3, 1.25, -2.95], ex: [-2.4, -0.6, -3.2], tag: 'Hose', conf: 'named', src: ['pd-guide', 'pd-site'],
      desc: 'Rear drain hose that empties the dirty tank. An optional dock can drain it automatically.',
      specs: [['Dock option', 'Water refill, drainage, roller cleaning']],
      build(b) {
        b.cyl(0.16, 0.16, 1.0, { m: 'rubber', rot: [PI / 2, 0, 0], seg: 18 });
        b.cyl(0.21, 0.21, 0.14, { m: 'accent', rot: [PI / 2, 0, 0], at: [0, 0, -0.55], seg: 18, e: false });
        b.cyl(0.19, 0.19, 0.1, { m: 'steel', rot: [PI / 2, 0, 0], at: [0, 0, 0.3], seg: 18, e: false });
      },
    },

    // ───────────── Air & debris ─────────────
    {
      id: 'dust-bin', name: 'Dust bin', group: 'air', layer: 1, delay: 0.1,
      home: [0, 3.0, 0.7], ex: [2.2, 3.8, 2.4], tag: '2.5 L', conf: 'confirmed', src: ['pbtech', 'hh'],
      desc: 'Onboard bin for the dry debris the roller throws up. A 6 L dust bag can be fitted as an option.',
      specs: [['Capacity', '2.5 L'], ['Option', '6 L dust bag']],
      build(b) {
        b.box(1.4, 1.4, 1.3, { m: 'dark', r: 0.12 });
        b.box(1.0, 0.08, 0.08, { m: 'steel', at: [0, 0.78, 0.66], e: false });
        b.box(1.2, 0.05, 0.05, { m: 'accent', at: [0, 0.2, 0.66], e: false });
      },
    },
    {
      id: 'vacuum-motor', name: 'Vacuum motor', group: 'air', layer: 2, delay: 0.04,
      home: [1.95, 1.65, 0.55], ex: [4.0, 0.6, 1.0], tag: '17,000 Pa', conf: 'named', src: ['homery'],
      desc: 'Blower that creates suction at the roller chamber and squeegee. The 17,000 Pa figure comes from a retailer listing, not from PUDU.',
      specs: [['Suction (retailer)', '17,000 Pa']],
      build(b) { L.turbine(b, { r: 0.45, h: 0.8 }); },
    },

    // ───────────── Power & brain ─────────────
    {
      id: 'battery', name: 'Lithium battery', group: 'power', layer: 2, delay: 0.04,
      home: [0, 1.5, 0.55], ex: [0, 0.2, -1.0], tag: '50 Ah', conf: 'confirmed', src: ['pd-cmp', 'hh'],
      desc: 'The main battery. Voltage is not in the sources reached, so only capacity is shown.',
      specs: [['Capacity', '50 Ah'], ['Charge time', 'About 3 h'], ['Runtime', '5 h scrub · 4 h carpet · 9 h silent mop']],
      build(b) { L.battery(b, { w: 2.6, h: 1.0, d: 1.6 }); },
    },
    {
      id: 'charge-contacts', name: 'Charge contacts', group: 'power', layer: 2, delay: 0.1,
      home: [0, 0.95, -3.15], ex: [0, -0.2, -3.6], tag: 'Dock', conf: 'named', src: ['pd-site', 'pbtech'],
      desc: 'Pads that meet the charging dock. The robot returns by itself when its battery is low.',
      specs: [['Charging', 'Auto-return to dock']],
      build(b) { L.chargePads(b, { w: 1.4 }); },
    },
    {
      id: 'controller', name: 'Main controller', group: 'power', layer: 1, delay: 0.14,
      home: [0, 4.2, 2.3], ex: [-2.2, 2.8, 2.0], tag: '4G', conf: 'inferred', src: ['homery'],
      desc: 'Computer that fuses LiDAR and cameras into a map and drives the motors. A retailer lists 4G connectivity.',
      specs: [['Connectivity', '4G (retailer listing)'], ['Standard', 'IEC 63327 certified']],
      build(b) { L.pcb(b, { w: 2.6, d: 1.4, vertical: true }); },
    },

    // ───────────── Drive & frame ─────────────
    {
      id: 'chassis', name: 'Chassis frame', group: 'drive', layer: 3, delay: 0.12,
      home: [0, 0.75, -0.65], ex: [0, -1.5, -0.2], tag: 'Frame', conf: 'inferred', src: ['pd-cmp'],
      desc: 'The steel base everything bolts to. A 75 kg robot needs a stiff one.',
      specs: [['Weight', '75 kg']],
      build(b) {
        b.box(5.1, 0.3, 4.3, { m: 'metal', r: 0.1 });
        for (const s of [-1, 1]) b.box(0.22, 0.42, 4.1, { m: 'steel', at: [s * 2.35, 0.18, 0], e: false });
        for (const z of [-1.4, -0.4, 0.6]) b.box(4.6, 0.12, 0.14, { m: 'steel', at: [0, 0.18, z], e: false });
      },
    },
    ...[-1, 1].map((s) => ({
      id: s < 0 ? 'wheel-l' : 'wheel-r', name: s < 0 ? 'Drive wheel (left)' : 'Drive wheel (right)',
      group: 'drive', layer: 3, delay: 0.04,
      home: [s * 2.3, 0.8, -0.9], ex: [s * 3.4, -1.0, -0.2], tag: '1.2 m/s', conf: 'named', src: ['pbtech'],
      desc: 'Independent drive wheel. Speed is adjustable from 0.2 to 1.2 m/s.',
      specs: [['Speed', '0.2–1.2 m/s adjustable']],
      build(b) { L.wheel(b, { r: 0.8, w: 0.55, side: s }); },
    })),
    {
      id: 'rear-casters', name: 'Rear casters', group: 'drive', layer: 3, delay: 0.1,
      home: [0, 0.32, -2.6], ex: [0, -1.8, -0.4], tag: 'Swivel', conf: 'inferred', src: ['pd-cmp'],
      desc: 'A pair of free-swivel wheels that keep the heavy tail level while the two drive wheels steer.',
      specs: [['Type', 'Swivel casters']],
      build(b) { for (const s of [-1, 1]) b.at([s * 1.7, 0, 0], () => L.caster(b, { r: 0.32 })); },
    },

    // ───────────── Sensing ─────────────
    {
      id: 'lidar', name: 'LiDAR', group: 'sense', layer: 1, delay: 0,
      home: [0, 0.95, 2.95], ex: [0, -0.3, 5.4], tag: 'Laser scan', conf: 'confirmed', src: ['pd-cmp', 'rl-pd'],
      desc: 'A spinning laser that measures distance to walls and obstacles all the way round, looking out through the slot in the base. With the roof camera it forms PUDU’s LiDAR + VSLAM positioning. Its exact place is not shown in the sources reached.',
      specs: [['Type', 'LiDAR (comparison sheet)']],
      build(b) { L.lidar(b, { r: 0.4, h: 0.45 }); },
    },
    {
      id: 'rgbd-camera', name: 'RGBD camera', group: 'sense', layer: 1, delay: 0.04,
      home: [0.9, 3.05, 2.4], ex: [0, 3.6, 5.6], tag: 'Depth + colour', conf: 'confirmed', src: ['pd-cmp'],
      desc: 'Camera that returns colour and distance for every pixel, so the robot sees the shape of tables, chairs and people above the LiDAR plane. It looks out of the upper window of the camera pod.',
      specs: [['Type', 'RGBD camera (comparison sheet)']],
      build(b) { L.camera(b, { w: 0.6, h: 0.5, d: 0.3, lens: 0.16 }); },
    },
    {
      id: 'front-rgb', name: 'Front RGB camera', group: 'sense', layer: 1, delay: 0.06,
      home: [0.9, 2.5, 2.4], ex: [2.4, 4.4, 4.6], tag: 'Vision', conf: 'confirmed', src: ['pd-cmp'],
      desc: 'Colour camera facing forward for recognising what is ahead and for remote viewing. It looks out of the lower window of the camera pod.',
      specs: [['Type', 'RGB camera (comparison sheet)']],
      build(b) { L.camera(b, { w: 0.4, h: 0.3, d: 0.26, lens: 0.1 }); },
    },
    {
      id: 'vslam-camera', name: 'VSLAM fisheye camera', group: 'sense', layer: 0, delay: 0.1,
      home: [0.3, 6.5, -1.4], ex: [0.3, 5.4, -0.2], tag: 'Top view', conf: 'confirmed', src: ['photos', 'pd-cmp', 'pd-guide'],
      desc: 'A wide fisheye camera in the round dome on the lid. It watches walls and ceiling to work out where the robot is, even in long plain corridors. No QR codes or beacons needed.',
      specs: [['Navigation', 'LiDAR + visual positioning (VSLAM+)'], ['Markers', 'None needed']],
      build(b) {
        b.cyl(0.55, 0.6, 0.16, { m: 'dark', seg: 32 });
        b.sph(0.45, { m: 'lens', at: [0, 0.08, 0], cap: PI / 2, seg: 28 });
        b.tor(0.5, 0.03, { m: 'trim', rot: [PI / 2, 0, 0], at: [0, 0.09, 0], seg: 32, e: false });
      },
    },
    {
      id: 'ai-camera', name: 'Rear AI camera', group: 'sense', layer: 1, delay: 0.1,
      home: [0, 4.65, -2.9], rot0: [0, PI, 0], ex: [0, 3.2, -5.0], tag: 'Stain check', conf: 'confirmed', src: ['pd-site', 'rl-pd'],
      desc: 'Looks back at the floor the robot just cleaned. It spots leftover stains such as coffee and sauce, sends the robot back to re-clean them, and builds a heatmap after the job.',
      specs: [['Detects', 'Wet spills and leftover stains'], ['Output', 'Spot re-clean + post-task heatmap']],
      build(b) { L.camera(b, { w: 0.8, h: 0.5, d: 0.3, lens: 0.15 }); },
    },
    {
      id: 'line-sensor-f', name: 'Front single-line sensor', group: 'sense', layer: 1, delay: 0.12,
      home: [1.4, 0.95, 2.95], ex: [1.8, -1.0, 4.4], tag: 'Low ranger', conf: 'confirmed', src: ['pd-cmp'],
      desc: 'A low single-beam sensor for close-range obstacle detection near the floor (typical use for this type). It sits in the front lip of the base.',
      specs: [['Type', 'Front single-line sensor (comparison sheet)']],
      build(b) {
        b.box(0.9, 0.16, 0.2, { m: 'dark', r: 0.05 });
        b.box(0.6, 0.06, 0.04, { m: 'accent', at: [0, 0, 0.11], e: false });
      },
    },
    {
      id: 'line-sensor-r', name: 'Rear single-line sensor', group: 'sense', layer: 1, delay: 0.12,
      home: [0, 0.95, -3.0], rot0: [0, PI, 0], ex: [1.8, -0.6, -3.4], tag: 'Low ranger', conf: 'confirmed', src: ['pd-cmp'],
      desc: 'The matching low single-beam sensor at the rear, for close-range detection when backing up.',
      specs: [['Type', 'Rear single-line sensor (comparison sheet)']],
      build(b) {
        b.box(0.9, 0.16, 0.2, { m: 'dark', r: 0.05 });
        b.box(0.6, 0.06, 0.04, { m: 'accent', at: [0, 0, 0.11], e: false });
      },
    },
    {
      id: 'ultrasonic', name: 'Ultrasonic sensors', group: 'sense', layer: 1, delay: 0.14,
      home: [0, 2.15, 2.62], ex: [0, 1.4, 5.4], tag: 'Echo', conf: 'confirmed', src: ['photos', 'pd-cmp'],
      desc: 'Sound-wave rangefinders in pairs along the foot of the front panel. They catch glass walls and mirrors that lasers and cameras can look straight through.',
      specs: [['Type', 'Ultrasonic sensor (comparison sheet)']],
      build(b) {
        for (const x of [-2.05, -0.85, 0.85, 2.05]) for (const dx of [-0.2, 0.2]) b.at([x + dx, 0, 0], () => {
          b.cyl(0.16, 0.16, 0.12, { m: 'dark', rot: [PI / 2, 0, 0], seg: 20 });
          b.cyl(0.11, 0.11, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [0, 0, 0.08], seg: 20 });
        });
      },
    },

    // ───────────── Charging station ─────────────
    // Listed at 390 x 390 x 165 mm and 5.5 kg (charge only). It stands behind the robot; its shape here is schematic.
    {
      id: 'dock-shell', name: 'Station cover', group: 'dock', layer: 0, delay: 0,
      home: [0, 0.9, -5.3], ex: [9.5, 0.8, 0], tag: '390 × 390 mm', conf: 'named', src: ['pbtech', 'photos'],
      desc: 'The cover of the optional charge-only station: a low black block on the floor. A light strip along its front edge shows that it is powered. The robot backs onto it and charges through two contacts.',
      specs: [['Size', '390 × 390 × 165 mm'], ['Weight', '5.5 kg'], ['Use', 'Charging only (a larger dock adds refill and drain)']],
      build(b) {
        b.box(3.9, 1.5, 3.9, { m: 'shellDk', r: 0.45 });
        b.box(3.0, 0.05, 0.1, { m: 'led', at: [0, 0.72, 1.82], e: false });
        for (let i = 0; i < 6; i++) b.box(2.4, 0.04, 0.05, { m: 'dark', at: [0, 0.76, -0.2 - i * 0.2], e: false });
      },
    },
    {
      id: 'dock-contacts', name: 'Station contacts', group: 'dock', layer: 1, delay: 0.02,
      home: [0, 0.95, -3.4], rot0: [0, PI, 0], ex: [9.5, -0.2, 3.4], tag: 'Pads', conf: 'named', src: ['pd-site', 'pbtech'],
      desc: 'Two copper pads on the front of the station. They meet the pads on the robot\'s back when it reverses onto the station.',
      specs: [['Charging', 'Auto-return to the station']],
      build(b) { L.chargePads(b, { w: 1.4 }); },
    },
    {
      id: 'dock-board', name: 'Station power board', group: 'dock', layer: 1, delay: 0.06,
      home: [0, 0.75, -5.3], ex: [11.4, 0.8, 0.4], tag: 'Power', conf: 'inferred', src: ['pbtech'],
      desc: 'The power board inside the station that turns mains into the charging current. The layout drawn here is schematic.',
      specs: [['Seen in the sources', 'Not itemised']],
      build(b) { L.pcb(b, { w: 2.8, d: 2.6 }); },
    },
    {
      id: 'dock-cable', name: 'Station power cord', group: 'dock', layer: 2, delay: 0.04,
      home: [0, 0.4, -7.3], ex: [13.0, 0.2, -2.0], tag: 'Mains', conf: 'inferred', src: ['pbtech'],
      desc: 'The mains lead from the back of the station to a wall socket.',
      specs: [['Seen in the sources', 'Not itemised']],
      build(b) {
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.6, 0, 0), new THREE.Vector3(1.4, -0.1, -0.7), new THREE.Vector3(2.2, 0.1, -1.2), new THREE.Vector3(2.6, 0.9, -1.6)]);
        b.mesh(new THREE.TubeGeometry(curve, 24, 0.06, 8), { m: 'rubber', e: false });
        b.box(0.32, 0.4, 0.2, { m: 'rubber', r: 0.05, at: [2.6, 1.1, -1.6] });
      },
    },
    {
      id: 'dock-base', name: 'Station base plate', group: 'dock', layer: 3, delay: 0,
      home: [0, 0.075, -5.3], ex: [9.5, -0.6, -1.0], tag: 'Floor', conf: 'inferred', src: ['pbtech'],
      desc: 'The flat plate under the station that carries it on the floor.',
      specs: [['Seen in the sources', 'Not itemised']],
      build(b) { b.panel(3.9, 3.9, 0.15, { m: 'dark', r: 0.5, bevel: 0.04, rot: [-PI / 2, 0, 0] }); },
    },
  ],
};
