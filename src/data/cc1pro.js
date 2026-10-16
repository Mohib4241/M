// PUDU CC1 Pro. Y up, +Z front, 1 unit = 100 mm.
// Part names and numbers come from PUDU's operation guide, the CC1 version-comparison sheet
// and retailer spec listings. Shapes and internal positions are a schematic reconstruction.
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
  frame: { d0: 17, d1: 40, y0: 5.6, y1: 7.4 },
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
  ],
  sources: ['pd-guide', 'pd-cmp', 'pd-site', 'pbtech', 'hh', 'rl-pd', 'homery', 'anton'],
  water: ['clean-tank:out', 'pump:a', 'pump:b', 'roller-chamber:nozzle', 'squeegee:in', 'dirty-tank:in'],

  parts: [
    // ───────────── Shell & covers ─────────────
    {
      id: 'top-hood', name: 'Top hood', group: 'shell', layer: 0, delay: 0,
      home: [0, 5.65, -0.3], ex: [0, 4.3, 0], tag: 'Roof', conf: 'inferred', src: ['pd-guide'],
      desc: 'The upper shell. It carries the touchscreen and the roof camera and lifts away first, exposing both tanks.',
      specs: [['Overall height', '695 mm']],
      build(b) {
        b.box(5.0, 0.8, 5.4, { m: 'shell', r: 0.3 });
        b.box(3.2, 0.3, 1.4, { m: 'trim', r: 0.12, at: [0, 0.5, 1.7] });
        b.box(2.9, 0.04, 0.12, { m: 'led', at: [0, 0.4, 2.45], e: false });
        for (let i = 0; i < 5; i++) b.box(1.6, 0.04, 0.07, { m: 'dark', at: [1.5, 0.405, 0.2 - i * 0.2], e: false });
      },
    },
    {
      id: 'front-shell', name: 'Front sensor fascia', group: 'shell', layer: 0, delay: 0.03,
      home: [0, 3.425, 3.0], ex: [0, 1.0, 4.8], tag: 'Sensor face', conf: 'named', src: ['pd-cmp'],
      desc: 'Black-glass front. Windows for the RGBD and RGB cameras high up, the LiDAR low, and ultrasonic sensors at the corners.',
      specs: [['Behind it', 'LiDAR · RGBD · front RGB · ultrasonic']],
      build(b) {
        b.panel(5.1, 3.65, 0.36, { m: 'shell', r: 0.7, bevel: 0.1 });
        b.box(4.3, 1.1, 0.06, { m: 'glass', at: [0, 0.9, 0.2], r: 0.04, e: false });
        b.box(2.0, 0.7, 0.06, { m: 'glass', at: [0, -1.3, 0.2], r: 0.04, e: false });
        b.box(4.3, 0.04, 0.03, { m: 'accent', at: [0, 0.2, 0.2], e: false });
      },
    },
    {
      id: 'rear-shell', name: 'Rear shell', group: 'shell', layer: 0, delay: 0.03,
      home: [0, 3.425, -3.0], ex: [0, 1.0, -4.8], tag: 'Rear door', conf: 'inferred', src: ['pd-guide'],
      desc: 'Rear panel with a window for the AI camera, exhaust vents, and the cut-out where the drain hose leaves.',
      specs: [['Window for', 'Rear AI camera']],
      build(b) {
        b.panel(5.1, 3.65, 0.36, { m: 'shell', r: 0.7, bevel: 0.1 });
        b.box(1.5, 0.7, 0.06, { m: 'glass', at: [0, 0.9, -0.2], r: 0.04, e: false });
        for (let i = 0; i < 8; i++) b.box(2.2, 0.06, 0.04, { m: 'dark', at: [0, -0.2 - i * 0.14, -0.2], e: false });
      },
    },
    ...[-1, 1].map((s) => ({
      id: s < 0 ? 'side-shell-l' : 'side-shell-r', name: s < 0 ? 'Left side shell' : 'Right side shell',
      group: 'shell', layer: 0, delay: 0.06,
      home: [s * 2.65, 3.425, 0], ex: [s * 4.8, 0.9, 0], tag: 'Side panel', conf: 'inferred', src: ['pd-guide'],
      desc: 'Side panel that closes the cabinet. It comes off outward to reach the tanks, battery and pump.',
      specs: [['Width', '552 mm overall']],
      build(b) {
        b.panel(5.66, 3.65, 0.36, { m: 'shell', r: 0.75, bevel: 0.1, rot: [0, PI / 2, 0] });
        b.box(0.04, 0.06, 4.6, { m: 'accent', at: [s * 0.2, 1.1, 0], e: false });
        b.box(0.04, 1.2, 1.7, { m: 'trim', r: 0.06, at: [s * 0.2, -0.2, -0.5], e: false });
      },
    })),
    {
      id: 'bumper', name: 'Front bumper', group: 'shell', layer: 0, delay: 0.1,
      home: [0, 1.3, 3.28], ex: [0, -0.4, 6.3], tag: 'Soft edge', conf: 'inferred', src: ['pd-cmp'],
      desc: 'Soft front edge that protects furniture and houses the low front sensor.',
      specs: [['Min. passage', '70 cm']],
      build(b) {
        b.box(5.4, 0.6, 0.45, { m: 'rubber', r: 0.22 });
        b.box(4.4, 0.05, 0.05, { m: 'accent', at: [0, 0.14, 0.23], e: false });
      },
    },

    // ───────────── Controls ─────────────
    {
      id: 'display', name: '10.1″ touchscreen', group: 'ui', layer: 0, delay: 0.05,
      home: [0, 6.35, -1.9], rot0: [0.4, 0, 0], ex: [0, 5.6, -2.8], tag: '10.1″', conf: 'confirmed', src: ['pbtech', 'hh'],
      desc: 'Where staff choose a map, a zone and a cleaning mode, and watch progress. Its tilt and position here are schematic.',
      specs: [['Screen', '10.1-inch LCD'], ['Speed setting', '0.2–1.2 m/s']],
      build(b) {
        b.box(2.7, 1.7, 0.16, { m: 'trim', r: 0.1 });
        const tex = screenTexture('#ffb347');
        const scr = b.box(2.4, 1.38, 0.02, { m: 'screen', at: [0, 0, -0.09], e: false });
        scr.material.map = tex;
        scr.material.emissiveMap = tex;
        scr.material.emissive = new THREE.Color(0xffffff);
        scr.material.emissiveIntensity = 0.9;
        b.records.find((r) => r.mat === scr.material).emissive.set(0xffffff);
        scr.rotation.y = PI; // face the rear
        scr.position.z = -0.09;
        b.box(0.8, 0.12, 0.12, { m: 'metal', at: [0, -0.9, 0.05], e: false });
      },
    },
    {
      id: 'e-stop', name: 'Emergency stop switch', group: 'ui', layer: 0, delay: 0.1,
      home: [2.0, 6.05, 0.2], ex: [2.0, 4.6, 1.2], tag: 'E-stop', conf: 'named', src: ['pd-guide'],
      desc: 'The big red switch that stops everything at once. It is listed in the operation guide’s appearance table; its exact position here is schematic.',
      specs: [['Action', 'Cuts drive + brush power']],
      build(b) { L.eStop(b, { r: 0.3 }); },
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
      home: [s * 2.45, 0.8, -0.9], ex: [s * 3.4, -1.0, -0.2], tag: '1.2 m/s', conf: 'named', src: ['pbtech'],
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
      home: [0, 2.1, 3.0], ex: [0, -0.3, 5.4], tag: 'Laser scan', conf: 'confirmed', src: ['pd-cmp', 'rl-pd'],
      desc: 'A spinning laser that measures distance to walls and obstacles all the way round. With the roof camera it forms PUDU’s LiDAR + VSLAM positioning.',
      specs: [['Type', 'LiDAR (comparison sheet)']],
      build(b) { L.lidar(b, { r: 0.4, h: 0.45 }); },
    },
    {
      id: 'rgbd-camera', name: 'RGBD camera', group: 'sense', layer: 1, delay: 0.04,
      home: [0, 4.2, 3.2], ex: [0, 3.6, 5.6], tag: 'Depth + colour', conf: 'confirmed', src: ['pd-cmp'],
      desc: 'Camera that returns colour and distance for every pixel, so the robot sees the shape of tables, chairs and people above the LiDAR plane.',
      specs: [['Type', 'RGBD camera (comparison sheet)']],
      build(b) { L.camera(b, { w: 0.9, h: 0.45, d: 0.3 }); },
    },
    {
      id: 'front-rgb', name: 'Front RGB camera', group: 'sense', layer: 1, delay: 0.06,
      home: [1.3, 4.2, 3.2], ex: [2.4, 4.4, 4.6], tag: 'Vision', conf: 'confirmed', src: ['pd-cmp'],
      desc: 'Colour camera facing forward for recognising what is ahead and for remote viewing.',
      specs: [['Type', 'RGB camera (comparison sheet)']],
      build(b) { L.camera(b, { w: 0.5, h: 0.32, d: 0.26, lens: 0.09 }); },
    },
    {
      id: 'vslam-camera', name: 'VSLAM fisheye camera', group: 'sense', layer: 1, delay: 0.1,
      home: [0, 6.3, 1.7], ex: [0, 5.6, 2.6], tag: 'Top view', conf: 'confirmed', src: ['pd-cmp', 'pd-guide'],
      desc: 'A wide fisheye camera on the roof that watches walls and ceiling to work out where the robot is, even in long plain corridors. No QR codes or beacons needed.',
      specs: [['Navigation', 'LiDAR + visual positioning (VSLAM+)'], ['Markers', 'None needed']],
      build(b) {
        b.cyl(0.36, 0.4, 0.14, { m: 'dark', seg: 24 });
        b.sph(0.3, { m: 'lens', at: [0, 0.07, 0], cap: PI / 2, seg: 24 });
        b.tor(0.34, 0.025, { m: 'accent', rot: [PI / 2, 0, 0], at: [0, 0.08, 0], seg: 28, e: false });
      },
    },
    {
      id: 'ai-camera', name: 'Rear AI camera', group: 'sense', layer: 1, delay: 0.1,
      home: [0, 4.2, -3.2], rot0: [0, PI, 0], ex: [0, 3.2, -5.0], tag: 'Stain check', conf: 'confirmed', src: ['pd-site', 'rl-pd'],
      desc: 'Looks back at the floor the robot just cleaned. It spots leftover stains such as coffee and sauce, sends the robot back to re-clean them, and builds a heatmap after the job.',
      specs: [['Detects', 'Wet spills and leftover stains'], ['Output', 'Spot re-clean + post-task heatmap']],
      build(b) { L.camera(b, { w: 0.8, h: 0.5, d: 0.3, lens: 0.15 }); },
    },
    {
      id: 'line-sensor-f', name: 'Front single-line sensor', group: 'sense', layer: 1, delay: 0.12,
      home: [0, 1.3, 3.5], ex: [1.8, -1.0, 4.4], tag: 'Low ranger', conf: 'confirmed', src: ['pd-cmp'],
      desc: 'A low single-beam sensor for close-range obstacle detection near the floor (typical use for this type).',
      specs: [['Type', 'Front single-line sensor (comparison sheet)']],
      build(b) {
        b.box(0.9, 0.16, 0.2, { m: 'dark', r: 0.05 });
        b.box(0.6, 0.06, 0.04, { m: 'accent', at: [0, 0, 0.11], e: false });
      },
    },
    {
      id: 'line-sensor-r', name: 'Rear single-line sensor', group: 'sense', layer: 1, delay: 0.12,
      home: [0, 1.3, -3.15], rot0: [0, PI, 0], ex: [1.8, -0.6, -3.4], tag: 'Low ranger', conf: 'confirmed', src: ['pd-cmp'],
      desc: 'The matching low single-beam sensor at the rear, for close-range detection when backing up.',
      specs: [['Type', 'Rear single-line sensor (comparison sheet)']],
      build(b) {
        b.box(0.9, 0.16, 0.2, { m: 'dark', r: 0.05 });
        b.box(0.6, 0.06, 0.04, { m: 'accent', at: [0, 0, 0.11], e: false });
      },
    },
    {
      id: 'ultrasonic', name: 'Ultrasonic sensors', group: 'sense', layer: 1, delay: 0.14,
      home: [0, 2.5, 3.2], ex: [0, 1.4, 5.4], tag: 'Echo', conf: 'confirmed', src: ['pd-cmp'],
      desc: 'Sound-wave rangefinders at the front corners. They catch glass walls and mirrors that lasers and cameras can look straight through.',
      specs: [['Type', 'Ultrasonic sensor (comparison sheet)']],
      build(b) {
        for (const s of [-1, 1]) b.at([s * 2.0, 0, 0], () => {
          b.cyl(0.2, 0.2, 0.14, { m: 'dark', rot: [PI / 2, 0, 0], seg: 20 });
          b.cyl(0.14, 0.14, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [0, 0, 0.09], seg: 20 });
          b.tor(0.2, 0.02, { m: 'accent', at: [0, 0, 0.08], seg: 20, e: false });
        });
      },
    },
  ],
};
