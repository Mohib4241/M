// PUDU CC1 Pro. Y up, +Z front, 1 unit = 100 mm.
// Part names and numbers come from PUDU's operation guide, the CC1 version-comparison sheet
// and retailer spec listings. The outside is measured from PUDU's front picture (src/data/shapes/cc1pro.js)
// and follows PUDU's 3/4 pictures and a photograph of the unit; internal positions are a schematic
// reconstruction.
import * as THREE from 'three';
import * as L from '../lib.js';
import { puduFaceTexture } from '../kit.js';
import { view, loftFrom, outline, box, pair } from '../measured.js';
import shape from './shapes/cc1pro.js';

const PI = Math.PI;

// ── The measured body ──
// Widths at every height come from PUDU's front picture of the CC1 Pro (src/data/shapes/cc1pro.js): a
// plinth 568 mm wide, a dark gap, and a body that narrows from 505 mm at its foot to 441 mm under the lid.
// In plan the body is a rounded box (from the photograph of the unit and PUDU's 3/4 pictures), the plinth
// longer at the front.
const F = view(shape, 'front');
const BASE = 1.48, GAP = 1.74, LID = 6.5; // the plinth's top, the body's foot, the lid's lower edge
const body = loftFrom(F, {
  from: 30,
  extra: [[6.74, 2.0], [6.79, 1.8]],
  zF: (y) => (y < BASE ? 3.14 : y < GAP ? 2.85 : 2.65),
  zB: (y) => (y < BASE ? -3.15 : y < GAP ? -2.9 : -2.95),
  rF: (y) => (y < BASE ? 1.05 : y < GAP ? 0.9 : 0.7),
  rB: (y) => (y < BASE ? 0.9 : y < GAP ? 0.8 : 0.6),
});
const TOP = body.y1;
const FRONT = 0.7;
const SKIN = { thick: 0.1 };
const M = (n) => box(F, n), P2 = (a, b2) => pair(F, a, b2);
const tFront = (y) => body.tAtX(y, FRONT * body.sec(y).hw);
// the side plate's outline seen from the side (z towards the front, y up): its front edge slopes back
// towards the bottom, as in PUDU's pictures
const PLATE = [[1.1, 6.35], [-2.75, 6.35], [-2.75, 1.95], [-0.45, 1.95], [-0.45, 3.4]];

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
    'The outside is measured from PUDU\'s front picture (the white and lime colour; the unit photographed for this project is dark slate, shown here): a body that narrows towards the lid on a wider plinth, the face screen at the front top, a camera pod and pairs of ultrasonic sensors. The charging station is shown behind the robot; it is listed at 390 × 390 × 165 mm and 5.5 kg and its shape here is schematic.',
  ],
  sources: ['pd-img', 'photos', 'pd-guide', 'pd-cmp', 'pd-site', 'pbtech', 'hh', 'rl-pd', 'homery', 'anton'],
  water: ['clean-tank:out', 'pump:a', 'pump:b', 'roller-chamber:nozzle', 'squeegee:in', 'dirty-tank:in'],

  parts: [
    // ───────────── Shell & covers ─────────────
    {
      id: 'top-hood', name: 'Top hood', group: 'shell', layer: 0, delay: 0,
      home: [0, 0, 0], ex: [0, 4.0, 0], tag: 'Roof', conf: 'named', src: ['photos', 'pd-guide', 'pd-img'],
      desc: 'The upper lid, a little narrower than the body below it. It carries the emergency stop and the roof camera dome and lifts away first, exposing both tanks.',
      specs: [['Overall height', '695 mm']],
      build(b) {
        b.skin(body, body.rowsBand(LID, TOP - 0.004, 0, 1), { m: 'shellDk', ...SKIN, cols: 72 });
        b.profile(body.outline(TOP, 72, 0.02), 0.06, { axis: 'y', m: 'shellDk', at: [0, TOP + 0.02, 0], bevel: 0.02 });
        b.box(3.6, 0.03, 0.03, { m: 'trim', at: [0, TOP + 0.06, 0.4], e: false }); // the seam across the lid
      },
    },
    {
      id: 'front-shell', name: 'Front panel', group: 'shell', layer: 0, delay: 0.03,
      home: [0, 0, 0], ex: [0, 0.6, 4.0], tag: 'Sensor face', conf: 'named', src: ['photos', 'pd-cmp', 'pd-img'],
      desc: 'The front of the body, under the face screen. Two small sensors sit at the screen\'s lower corners with a camera between them; the upright camera pod with the maker\'s mark is in the middle, and the ultrasonic sensors sit in pairs at the lower corners. All placed as in PUDU\'s front picture.',
      specs: [['Behind it', 'RGBD · front RGB · ultrasonic']],
      build(b) {
        b.skin(body, body.rowsFn(GAP, LID, (y) => [-tFront(y), tFront(y)]), { m: 'shell', ...SKIN });
        for (const n of ['ear_r', 'ear_l']) { const e = M(n); b.on(body.place(e.cy, { x: e.cx, off: 0.02 }), () => { b.cyl(e.w / 2, e.w / 2, 0.05, { m: 'trim', rot: [PI / 2, 0, 0], seg: 18 }); b.cyl(e.w / 4, e.w / 4, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], seg: 14, e: false }); }); }
        // the camera pod: a dark pill with the maker's mark
        b.skin(body, body.rowsFront(outline(F, 'pod', { mirror: true })), { m: { k: 'shellDk', id: 'pod', color: 0x0b0c0e }, ...SKIN, off: 0.06 });
        const pod = box(F, 'pod');
        b.on(body.place(pod.y1 - 0.35, { x: 0, off: 0.12 }), () => { b.box(0.16, 0.2, 0.02, { m: 'silver', at: [-0.05, 0, 0], e: false }); b.box(0.06, 0.2, 0.02, { m: 'silver', at: [0.06, 0, 0], e: false }); });
      },
    },
    {
      id: 'rear-shell', name: 'Rear shell', group: 'shell', layer: 0, delay: 0.03,
      home: [0, 0, 0], ex: [0, 0.6, -4.0], tag: 'Rear door', conf: 'inferred', src: ['photos', 'pd-guide'],
      desc: 'Rear panel with a window for the AI camera, exhaust vents, and the cut-out where the drain hose leaves.',
      specs: [['Window for', 'Rear AI camera']],
      build(b) {
        b.skin(body, body.rowsFn(GAP, LID, () => [0.42, 0.58]), { m: 'shell', ...SKIN });
        b.on(body.place(4.65, { t: 0.5, off: 0.01 }), () => b.box(1.5, 0.7, 0.05, { m: 'glass', r: 0.04, e: false }));
        for (let i = 0; i < 8; i++) b.on(body.place(3.55 - i * 0.14, { t: 0.5, off: 0.01 }), () => b.box(2.2, 0.06, 0.03, { m: 'dark', e: false }));
      },
    },
    ...[-1, 1].map((sd) => ({
      id: sd < 0 ? 'side-shell-l' : 'side-shell-r', name: sd < 0 ? 'Right side shell' : 'Left side shell',
      group: 'shell', layer: 0, delay: 0.06,
      home: [0, 0, 0], ex: [sd * 4.2, 0.6, 0], tag: 'Side panel', conf: 'named', src: ['photos', 'pd-guide', 'pd-img'],
      desc: 'A side of the body, from the front corner round to the rear corner. A large plate covers the rear of it, its front edge sloping back towards the bottom as in PUDU\'s pictures (lime on the white robot, a lighter grey on the unit photographed), with the maker\'s mark at its top.',
      specs: [['Width', '552 mm overall']],
      build(b) {
        b.skin(body, body.rowsFn(GAP, LID, (y) => (sd > 0 ? [tFront(y), 0.42] : [0.58, 1 - tFront(y)])), { m: 'shell', ...SKIN });
        b.skin(body, body.rowsSide(PLATE, sd), { m: 'graphite', thick: 0.05, off: 0.03 });
        b.on(body.place(5.9, { z: -0.6, side: sd, off: 0.07 }), () => b.box(1.0, 0.24, 0.02, { m: 'silver', e: false })); // the maker's mark
        b.on(body.place(2.3, { z: -2.2, side: sd, off: 0.07 }), () => b.box(0.3, 0.28, 0.02, { m: 'yellow', e: false })); // a warning label
        // a pair of ultrasonic sensors low on the side, near the front
        for (const dz of [-0.17, 0.17]) b.on(body.place(2.35, { z: 1.4 + dz, side: sd, off: 0.02 }), () => { b.cyl(0.11, 0.11, 0.06, { m: 'trim', rot: [PI / 2, 0, 0], seg: 18 }); b.cyl(0.07, 0.07, 0.07, { m: 'lens', rot: [PI / 2, 0, 0], seg: 14, e: false }); });
      },
    })),
    {
      id: 'bumper', name: 'Base and bumper', group: 'shell', layer: 0, delay: 0.1,
      home: [0, 0, 0], ex: [0, -0.4, 4.6], tag: 'Soft edge', conf: 'named', src: ['photos', 'pd-cmp', 'pd-img'],
      desc: 'The wide plinth under the body (568 mm in PUDU\'s front picture), jutting out at the front with a rounded lip and a light slot, and the dark gap between it and the body.',
      specs: [['Min. passage', '70 cm']],
      build(b) {
        b.skin(body, body.rowsFn(body.y0, BASE, () => [0, 1]), { m: 'shellDk', ...SKIN, cols: 72 });
        b.skin(body, body.rowsFn(BASE, GAP, () => [0, 1]), { m: 'rubber', ...SKIN, cols: 72, off: -0.12 });
        b.profile(body.outline(BASE - 0.01, 72, 0.02), 0.04, { axis: 'y', m: 'shellDk', at: [0, BASE - 0.01, 0], bevel: 0.015, e: false });
        const sl = M('slot');
        b.on(body.place(sl.cy, { x: sl.cx, off: 0.01 }), () => b.box(sl.w, sl.h, 0.04, { m: 'graphite', r: sl.h / 2.2, e: false }));
      },
    },

    // ───────────── Controls ─────────────
    {
      id: 'display', name: '10.1″ touchscreen', group: 'ui', layer: 0, delay: 0.05,
      home: [0, (box(F, 'screen').y0 + box(F, 'screen').y1) / 2, 2.95], rot0: [-0.33, 0, 0], ex: [0, 4.0, 2.6], tag: '10.1″', conf: 'confirmed', src: ['photos', 'pbtech', 'hh'],
      desc: 'The big screen on the front top, tilted back and standing out from the body, 357 mm wide in PUDU\'s front picture. While it works it shows PUDU\'s two-eyed face (drawn here); staff also choose a map, a zone and a cleaning mode on it and watch progress.',
      specs: [['Screen', '10.1-inch LCD'], ['Speed setting', '0.2–1.2 m/s']],
      build(b) {
        const sc = box(F, 'screen'), w = sc.w, h = sc.h / Math.cos(0.33);
        b.box(w, h, 0.45, { m: 'trim', r: 0.22 });
        const tex = puduFaceTexture();
        const scr = b.box(w - 0.3, h - 0.3, 0.03, { m: 'screen', at: [0, 0, 0.23], e: false });
        scr.material.map = tex;
        scr.material.emissiveMap = tex;
        scr.material.emissive = new THREE.Color(0xffffff);
        scr.material.emissiveIntensity = 0.9;
        b.records.find((r) => r.mat === scr.material).emissive.set(0xffffff);

      },
    },
    {
      id: 'e-stop', name: 'Emergency stop switch', group: 'ui', layer: 0, delay: 0.1,
      home: [-1.6, TOP + 0.03, -2.0], ex: [-1.6, 4.4, -0.5], tag: 'E-stop', conf: 'named', src: ['photos', 'pd-guide'],
      desc: 'The big red switch on the lid, at the rear corner. It stops everything at once. It is listed in the operation guide’s appearance table.',
      specs: [['Action', 'Cuts drive + brush power']],
      build(b) { b.cyl(0.24, 0.26, 0.05, { m: 'yellow', at: [0, 0.025, 0], seg: 28 }); b.cyl(0.17, 0.17, 0.08, { m: 'red', at: [0, 0.09, 0], seg: 28 }); b.sph(0.17, { m: 'red', cap: PI / 2, at: [0, 0.13, 0], seg: 24 }).scale.set(1, 0.4, 1); },
    },

    // ───────────── Cleaning head ─────────────
    {
      id: 'roller-chamber', name: 'Roller brush chamber', group: 'clean', layer: 3, delay: 0,
      home: [0, 1.0, 1.85], ex: [0, -1.0, 2.4], tag: 'Hood', conf: 'named', src: ['pd-guide'],
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
      home: [-2.3, 0.3, 2.75], ex: [-4.4, -1.5, 3.2], tag: 'Edges', conf: 'confirmed', src: ['pd-guide', 'pbtech'],
      desc: 'Spinning brush at the front corner that pulls debris from edges toward the roller. It adds to the 500 mm cleaning width.',
      specs: [['Cleaning width with brush', '500 mm']],
      build(b) { L.discBrush(b, { r: 1.0, hub: 0.32, n: 30, droop: 0.38 }); },
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
      home: [0, 0.95, 2.55], ex: [0, -0.3, 4.6], tag: 'Laser scan', conf: 'confirmed', src: ['pd-cmp', 'rl-pd'],
      desc: 'A spinning laser that measures distance to walls and obstacles all the way round, looking out through the slot in the base. With the roof camera it forms PUDU’s LiDAR + VSLAM positioning. Its exact place is not shown in the sources reached.',
      specs: [['Type', 'LiDAR (comparison sheet)']],
      build(b) { L.lidar(b, { r: 0.4, h: 0.45 }); },
    },
    {
      id: 'rgbd-camera', name: 'RGBD camera', group: 'sense', layer: 1, delay: 0.04,
      home: [M('cam').cx, M('cam').cy, 2.7], ex: [0, 2.6, 4.2], tag: 'Depth + colour', conf: 'confirmed', src: ['pd-cmp'],
      desc: 'Camera that returns colour and distance for every pixel, so the robot sees the shape of tables, chairs and people above the LiDAR plane. It is shown in the small window between the two sensors under the screen; that it sits there is our reading of PUDU\'s front picture.',
      specs: [['Type', 'RGBD camera (comparison sheet)']],
      build(b) { const c = M('cam'); b.box(c.w * 1.4, c.h, 0.08, { m: 'trim', r: 0.04 }); b.cyl(c.w * 0.3, c.w * 0.3, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [0, 0, 0.05], seg: 16, e: false }); },
    },
    {
      id: 'front-rgb', name: 'Front RGB camera', group: 'sense', layer: 1, delay: 0.06,
      home: [M('lens').cx, M('lens').cy, 2.79], ex: [0, 1.6, 4.6], tag: 'Vision', conf: 'confirmed', src: ['pd-cmp'],
      desc: 'Colour camera facing forward for recognising what is ahead and for remote viewing. It looks out of the lens in the camera pod.',
      specs: [['Type', 'RGB camera (comparison sheet)']],
      build(b) { const l = M('lens'); b.cyl(l.w / 2, l.w / 2, 0.06, { m: 'graphite', rot: [PI / 2, 0, 0], seg: 20 }); b.cyl(l.w * 0.3, l.w * 0.3, 0.08, { m: 'lens', rot: [PI / 2, 0, 0], seg: 18, e: false }); },
    },
    {
      id: 'vslam-camera', name: 'VSLAM fisheye camera', group: 'sense', layer: 0, delay: 0.1,
      home: [0, TOP + 0.04, 0.6], ex: [0, 4.6, 0.2], tag: 'Top view', conf: 'confirmed', src: ['photos', 'pd-cmp', 'pd-guide'],
      desc: 'A wide fisheye camera in the round dome on the lid. It watches walls and ceiling to work out where the robot is, even in long plain corridors. No QR codes or beacons needed.',
      specs: [['Navigation', 'LiDAR + visual positioning (VSLAM+)'], ['Markers', 'None needed']],
      build(b) {
        const d = M('dome');
        b.cyl(d.w * 0.9, d.w, 0.08, { m: 'dark', seg: 32 });
        b.sph(d.w * 0.55, { m: 'lens', at: [0, 0.04, 0], cap: PI / 2, seg: 28 });
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
      home: [0, P2('sonar_r1', 'sonar_l2').cy, 2.66], ex: [0, 1.0, 4.4], tag: 'Echo', conf: 'confirmed', src: ['photos', 'pd-cmp'],
      desc: 'Sound-wave rangefinders in pairs at the lower corners of the front panel (where PUDU\'s front picture shows them), with more pairs low on the sides. They catch glass walls and mirrors that lasers and cameras can look straight through.',
      specs: [['Type', 'Ultrasonic sensor (comparison sheet)']],
      build(b) {
        for (const n of ['sonar_r1', 'sonar_r2', 'sonar_l1', 'sonar_l2']) {
          const sn = M(n);
          b.at([sn.cx, 0, 0], () => { b.cyl(sn.w / 2, sn.w / 2, 0.08, { m: 'trim', rot: [PI / 2, 0, 0], seg: 20 }); b.cyl(sn.w * 0.32, sn.w * 0.32, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [0, 0, 0.05], seg: 18, e: false }); });
        }
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
