// Gausium Phantas (Gaussian Robotics). Y up, +Z front, 1 unit = 100 mm.
// Part names and numbers come from published spec sheets, manuals and parts catalogs.
// Shapes and internal positions are a schematic reconstruction, not CAD.
import * as THREE from 'three';
import * as L from '../lib.js';
import { waveBump } from '../kit.js';

const PI = Math.PI;

export default {
  id: 'phantas',
  name: 'Gausium Phantas',
  short: 'Phantas',
  maker: 'Gaussian Robotics',
  blurb: 'Compact 4-in-1 commercial robot that sweeps, vacuums, scrubs and dust-mops. Red Dot and A\' Design award winner.',
  accent: '#3de0ff',
  accent2: '#ffd166',
  studio: { accent: '#0a8f9c', accent2: '#c98a1a' },
  hover: 2.0,
  frame: { d0: 15.5, d1: 37, y0: 5.1, y1: 7.1 },
  stats: [
    ['Size', '585 × 445 × 619 mm'],
    ['Weight', '65 kg'],
    ['Water tanks', '11.5 L clean · 10.5 L recovery'],
    ['Debris', '6 L dust bag · 1 L trash can'],
    ['Cleaning width', '465 mm sweep · 330 mm scrub'],
    ['Battery', '24 V · 40 Ah LFP'],
    ['Runtime', '4–4.5 h scrub · 10 h dust-mop'],
    ['Passage', '650 mm corridor clearance'],
    ['Sensing', '2D LiDAR · 3D depth · RGB'],
  ],
  notes: [
    'The compact Phantas 1.3 is listed at 21.3 × 17.3 × 24.3 in (about 540 × 440 × 617 mm) and 46–53 kg, so figures vary by version.',
    'Design coverage describes a rounded, minimalist body in a monochrome scheme, with wavy-stripe texture on the front shell.',
    'An optional dock handles charging, water refill, wastewater drainage and component rinsing.',
    'TASKI (Diversey) lists the dirty-water tank at 11 L; Gausium lists 10.5 L.',
  ],
  sources: ['gs-spec', 'taski', 'gs-manual', 'softbank', 'okm', 'gs-dock', 'gs-news', 'gs-nz', 'anton-gs', 'sonny', 'award', 'rl-ph', 'leo'],
  water: ['clean-tank:out', 'pump:a', 'pump:b', 'brush-deck:nozzle', 'squeegee:in', 'recovery-tank:in'],

  parts: [
    // ───────────── Shell & covers ─────────────
    {
      id: 'top-cover', name: 'Top cover', group: 'shell', layer: 0, delay: 0,
      home: [0, 4.89, -0.2], ex: [0, 4.4, 0], tag: 'Lid', conf: 'inferred', src: ['gs-spec'],
      desc: 'The lid over the dust-bag and filter bay. It carries the status light bar and is the first piece to lift away.',
      specs: [['Robot height', '619 mm (with handle)']],
      build(b) {
        b.box(3.9, 0.62, 4.5, { m: 'shell', r: 0.3 });
        b.box(3.1, 0.05, 0.5, { m: 'glass', at: [0, 0.315, 1.7], r: 0.02, e: false });
        b.box(2.0, 0.05, 0.08, { m: 'led', at: [0, 0.335, 1.7], e: false });
        for (let i = 0; i < 5; i++) b.box(1.7, 0.04, 0.07, { m: 'dark', at: [0, 0.31, -0.3 - i * 0.22], e: false });
        b.box(3.0, 0.05, 0.7, { m: 'trim', r: 0.02, at: [0, 0.315, -1.85] });
      },
    },
    {
      id: 'front-cover', name: 'Front sensor fascia', group: 'shell', layer: 0, delay: 0.03,
      home: [0, 3.1, 2.6], ex: [0, 1.0, 4.4], tag: 'Sensor face', conf: 'named', src: ['gs-spec', 'leo', 'award'],
      desc: 'The face of the robot, finished with a wavy-stripe texture according to design coverage. Windows let the depth and RGB cameras look out from the top edge and the LiDAR from the bottom, while keeping dust off the electronics.',
      specs: [['Sensors behind it', '2D LiDAR · 3D depth cameras · RGB camera']],
      build(b) {
        const face = b.panel(3.95, 2.8, 0.32, { m: 'shell', r: 0.55, bevel: 0.1 });
        if (b.ctx.look === 'studio') {
          const t = waveBump();
          t.repeat.set(2, 2);
          face.material.bumpMap = t;
          face.material.bumpScale = 1.1;
        }
        b.box(3.3, 1.15, 0.06, { m: 'glass', at: [0, 0.78, 0.18], r: 0.03, e: false });
        b.box(1.5, 0.6, 0.06, { m: 'glass', at: [0, -0.95, 0.18], r: 0.03, e: false });
        b.box(3.3, 0.04, 0.03, { m: 'accent', at: [0, 0.08, 0.18], e: false });
        b.box(3.6, 0.03, 0.02, { m: 'trim', at: [0, -0.4, 0.17], e: false });
      },
    },
    {
      id: 'rear-cover', name: 'Rear cover', group: 'shell', layer: 0, delay: 0.03,
      home: [0, 3.0, -2.75], ex: [0, 1.0, -4.4], tag: 'Rear door', conf: 'inferred', src: ['gs-spec'],
      desc: 'Rear panel over the recovery tank and drive bay, with vents for motor exhaust and a window that lines up with the charging dock.',
      specs: [['Dock', 'CD-04, auto-recharge']],
      build(b) {
        b.panel(3.95, 3.0, 0.32, { m: 'shell', r: 0.55, bevel: 0.1 });
        for (let i = 0; i < 7; i++) b.box(1.8, 0.06, 0.04, { m: 'dark', at: [0, 0.6 - i * 0.15, -0.17], e: false });
        b.box(1.3, 0.4, 0.04, { m: 'glass', at: [0, -1.0, -0.17], e: false });
        b.box(2.6, 0.03, 0.02, { m: 'accent', at: [0, -0.2, -0.17], e: false });
      },
    },
    ...[-1, 1].map((s) => ({
      id: s < 0 ? 'side-cover-l' : 'side-cover-r', name: s < 0 ? 'Left side cover' : 'Right side cover',
      group: 'shell', layer: 0, delay: 0.06,
      home: [s * 2.08, 3.0, -0.1], ex: [s * 4.6, 1.0, 0], tag: 'Side panel', conf: 'inferred', src: ['gs-spec'],
      desc: 'Side panel that closes the cabinet. It pops off outward so the tanks and wiring can be reached.',
      specs: [['Width', '445 mm overall']],
      build(b) {
        b.panel(4.7, 3.0, 0.32, { m: 'shell', r: 0.6, bevel: 0.1, rot: [0, PI / 2, 0] });
        b.box(0.04, 0.06, 4.0, { m: 'accent', at: [s * 0.17, 0.7, 0], e: false });
        b.box(0.04, 1.1, 1.5, { m: 'trim', r: 0.05, at: [s * 0.17, -0.3, -0.6], e: false });
        b.box(0.04, 0.5, 0.5, { m: 'glass', at: [s * 0.17, -0.3, 1.6], e: false });
      },
    })),
    {
      id: 'bumper', name: 'Anti-collision bumper', group: 'shell', layer: 0, delay: 0.1,
      home: [0, 0.95, 2.95], ex: [0, -0.5, 5.3], tag: 'Contact', conf: 'named', src: ['gs-spec'],
      desc: 'A soft bumper across the nose. The spec sheet lists anti-collision sensing as part of the sensor suite, so contact stops the robot.',
      specs: [['Sensor class', 'Anti-collision']],
      build(b) {
        b.box(4.3, 0.55, 0.45, { m: 'rubber', r: 0.22 });
        b.box(3.6, 0.05, 0.05, { m: 'accent', at: [0, 0.1, 0.23], e: false });
      },
    },

    // ───────────── Controls ─────────────
    {
      id: 'smart-handle', name: 'Smart handle', group: 'ui', layer: 0, delay: 0.08,
      home: [0, 5.2, -2.3], ex: [0, 5.4, -2.0], tag: 'Hard keys', conf: 'named', src: ['gs-news', 'gs-nz', 'anton-gs'],
      desc: 'An integrated handle with hard buttons for basic operations like picking a cleaning mode. It switches the robot between automatic and manual operation, so staff can start or steer a job without a touchscreen. The buttons were shown as an upgrade at Interclean Amsterdam 2024.',
      specs: [['Operation', 'Switches between auto and manual'], ['Buttons', 'Hard keys such as mode selection (reported)']],
      build(b) {
        for (const s of [-1, 1]) b.cyl(0.13, 0.13, 0.84, { m: 'metal', at: [s * 1.5, 0.42, 0], seg: 18 });
        b.cyl(0.15, 0.15, 3.3, { m: 'dark', rot: [0, 0, PI / 2], at: [0, 0.84, 0], seg: 20 });
        for (const s of [-1, 1]) b.cyl(0.17, 0.17, 0.7, { m: 'rubber', rot: [0, 0, PI / 2], at: [s * 1.25, 0.84, 0], seg: 18, e: false });
        const ctl = b.at([0, 0.92, 0.12], () => {
          b.box(1.5, 0.3, 0.6, { m: 'trim', r: 0.1 });
          for (let i = 0; i < 4; i++) b.cyl(0.07, 0.07, 0.05, { m: 'accent', at: [-0.5 + i * 0.33, 0.17, 0.14], seg: 12, e: false });
          b.box(0.7, 0.02, 0.18, { m: 'screen', at: [0, 0.16, -0.14], e: false });
        }, [-0.35, 0, 0]);
        ctl.name = 'ctl';
      },
    },
    {
      id: 'e-stop', name: 'Emergency stop', group: 'ui', layer: 0, delay: 0.1,
      home: [1.8, 5.2, 1.1], ex: [1.4, 5.0, 1.4], tag: 'E-stop', conf: 'inferred', src: ['gs-spec'],
      desc: 'Red mushroom switch that cuts drive and cleaning power at once. Standard on commercial floor machines; its exact position on the Phantas is not shown in the sources reached.',
      specs: [['Action', 'Cuts drive + brush power']],
      build(b) { L.eStop(b, { r: 0.3 }); },
    },

    // ───────────── Cleaning head ─────────────
    {
      id: 'brush-deck', name: 'Cleaning deck housing', group: 'clean', layer: 3, delay: 0,
      home: [0, 0.95, 1.85], ex: [0, -1.2, 2.2], tag: 'Hood', conf: 'inferred', src: ['gs-spec'],
      desc: 'The hood that holds both roller brushes, the solution spray bar and the rubber skirts that keep water and debris from escaping.',
      specs: [['Down pressure', '10 kg']],
      anchors: { nozzle: [0, 0.22, -0.2] },
      build(b) {
        b.box(3.9, 0.12, 2.0, { m: 'dark', r: 0.05, at: [0, 0.32, 0] });
        for (const s of [-1, 1]) {
          b.box(0.14, 0.7, 2.0, { m: 'shellDk', r: 0.04, at: [s * 1.95, 0, 0] });
          b.box(0.06, 0.3, 1.9, { m: 'rubber', at: [s * 1.88, -0.38, 0], e: false });
        }
        b.box(3.7, 0.6, 0.12, { m: 'shellDk', at: [0, 0.02, -0.95] });
        b.box(3.7, 0.2, 0.1, { m: 'rubber', at: [0, -0.28, 0.98], e: false });
        b.cyl(0.05, 0.05, 3.0, { m: 'steel', rot: [0, 0, PI / 2], at: [0, 0.22, -0.2], seg: 10 });
        for (let i = -4; i <= 4; i++) b.cyl(0.03, 0.03, 0.12, { m: 'accent', at: [i * 0.34, 0.15, -0.2], seg: 8, e: false });
      },
    },
    {
      id: 'front-roller', name: 'Front roller brush', group: 'clean', layer: 3, delay: 0.04,
      home: [0, 0.5, 2.3], ex: [0, -1.9, 5.2], tag: '465 mm', conf: 'confirmed', src: ['softbank', 'gs-spec'],
      desc: 'Front roller of the pair on the cleaning deck. It is sold as its own consumable.',
      specs: [['Parts list name', 'Front Roller Brush'], ['Sweep / vacuum width', '465 mm'], ['Scrub / dust-mop width', '330 mm']],
      build(b) { L.roller(b, { r: 0.38, len: 3.3 }); },
    },
    {
      id: 'rear-roller', name: 'Rear roller brush', group: 'clean', layer: 3, delay: 0.08,
      home: [0, 0.5, 1.45], ex: [0, -1.9, 3.0], tag: '330 mm', conf: 'confirmed', src: ['softbank', 'gs-spec'],
      desc: 'Rear roller of the pair on the cleaning deck. Also sold as its own consumable.',
      specs: [['Parts list name', 'Rear Roller Brush'], ['Scrub / dust-mop width', '330 mm']],
      build(b) { L.roller(b, { r: 0.38, len: 3.3, rows: 20 }); },
    },
    {
      id: 'side-brush', name: 'Side brush', group: 'clean', layer: 3, delay: 0.1,
      home: [-2.0, 0.45, 2.6], ex: [-4.6, -1.5, 3.0], tag: 'Edges', conf: 'confirmed', src: ['softbank', 'rl-ph'],
      desc: 'Spinning brush at the front corner that sweeps edges and corners into the roller path. Retailers quote cleaning right up to the wall.',
      specs: [['Parts list name', 'Side Brush Soft Rubber Assy'], ['Edge reach', 'About 0 cm from walls']],
      build(b) { L.sideBrush(b, { r: 0.8 }); },
    },
    {
      id: 'squeegee', name: 'Squeegee assembly', group: 'clean', layer: 3, delay: 0.1,
      home: [0, 0.42, -2.85], ex: [0, -1.6, -5.0], tag: 'Front + rear', conf: 'confirmed', src: ['softbank'],
      desc: 'Two rubber blades behind the deck. They gather the dirty water into one line and the vacuum hose pulls it up into the recovery tank.',
      specs: [['Parts list names', 'Front + Rear Squeegee Rubber']],
      anchors: { in: [0, 0.62, 0] },
      build(b) { L.squeegee(b, { w: 3.9 }); },
    },

    // ───────────── Water system ─────────────
    {
      id: 'clean-tank', name: 'Clean water tank', group: 'water', layer: 1, delay: 0,
      home: [0, 2.6, 1.0], ex: [-3.4, 2.4, 2.4], tag: '11.5 L', conf: 'confirmed', src: ['gs-spec', 'taski'],
      desc: 'Fresh water (plus detergent) for the brush deck. The pump draws from the outlet at the bottom front.',
      specs: [['Capacity', '11.5 L'], ['Feeds', 'Spray bar over the rollers']],
      anchors: { out: [0, -0.95, 0.5] },
      build(b) { L.tank(b, { w: 3.1, h: 1.9, d: 2.0, kind: 'clean', fill: 0.72 }); },
    },
    {
      id: 'recovery-tank', name: 'Recovery tank', group: 'water', layer: 1, delay: 0.04,
      home: [0, 2.6, -1.2], ex: [3.4, 2.4, -2.6], tag: '10.5 L', conf: 'confirmed', src: ['gs-spec', 'taski'],
      desc: 'Catches the dirty water the squeegee lifts off the floor. The drain hose drawn at the rear is schematic.',
      specs: [['Capacity', '10.5 L (TASKI lists 11 L)'], ['Fed by', 'Squeegee vacuum hose']],
      anchors: { in: [0, 0.9, 0.5] },
      build(b) {
        L.tank(b, { w: 3.1, h: 1.8, d: 1.9, kind: 'dirty', fill: 0.45, cap: false });
        b.cyl(0.12, 0.12, 0.9, { m: 'dark', rot: [PI / 2, 0, 0], at: [-1.0, -0.6, -1.05], seg: 12 });
      },
    },
    {
      id: 'pump', name: 'Solution pump', group: 'water', layer: 2, delay: 0,
      home: [-1.25, 1.25, 0.7], ex: [-4.0, 0.5, 1.4], tag: 'Pump', conf: 'inferred', src: ['gs-spec'],
      desc: 'Moves water from the clean tank to the spray bar, with a valve that sets how much goes onto the brushes. Standard in a scrubber; sizing is not published.',
      specs: [['Feeds', 'Cleaning deck spray bar']],
      anchors: { a: [0, -0.5, 0], b: [0.82, -0.15, 0] },
      build(b) { L.pump(b); },
    },

    // ───────────── Air & debris ─────────────
    {
      id: 'dust-bag', name: 'Dust bag', group: 'air', layer: 1, delay: 0.08,
      home: [0.6, 4.1, -1.25], ex: [0.6, 3.4, -3.2], tag: '6 L', conf: 'confirmed', src: ['gs-spec', 'gs-manual', 'softbank'],
      desc: 'Fabric bag that holds the fine dust pulled in by the vacuum when sweeping and vacuuming. Replaceable consumable.',
      specs: [['Capacity', '6 L'], ['Parts list name', 'Dust Bag']],
      build(b) {
        b.box(2.2, 0.95, 1.9, { m: 'fabric', r: 0.35 });
        b.box(0.7, 0.15, 0.5, { m: 'dark', at: [-0.5, -0.5, 0.95], r: 0.04 });
        for (let i = -2; i <= 2; i++) b.box(0.03, 0.9, 1.88, { m: 'fabric', at: [i * 0.4, 0.02, 0], e: false });
      },
    },
    {
      id: 'trash-can', name: 'Trash can', group: 'air', layer: 1, delay: 0.1,
      home: [-1.05, 4.1, 0.65], ex: [-1.8, 3.6, 2.2], tag: '1 L', conf: 'confirmed', src: ['gs-spec', 'gs-manual'],
      desc: 'Small bin for larger litter such as leaves, wrappers and bottle caps.',
      specs: [['Capacity', '1 L (manual: 0.7 L)']],
      build(b) {
        b.box(1.3, 0.9, 1.2, { m: 'dark', r: 0.1 });
        b.box(0.7, 0.08, 0.08, { m: 'steel', at: [0, 0.5, 0.62], e: false });
        b.box(1.1, 0.04, 0.04, { m: 'accent', at: [0, 0.3, 0.61], e: false });
      },
    },
    {
      id: 'hepa-filter', name: 'HEPA filter', group: 'air', layer: 1, delay: 0.12,
      home: [1.0, 4.05, 0.75], ex: [2.5, 4.2, 1.8], tag: 'Air', conf: 'named', src: ['softbank'],
      desc: 'Pleated filter that cleans the exhaust air so fine dust stays out of the room. Listed as a replacement part.',
      specs: [['Parts list name', 'HEPA Filter'], ['Grade', 'Not stated for Phantas']],
      build(b) { L.pleatedFilter(b, { r: 0.5, h: 0.85 }); },
    },
    {
      id: 'vacuum-motor', name: 'Vacuum motor', group: 'air', layer: 2, delay: 0.04,
      home: [1.0, 1.25, -2.0], rot0: [0, 0, PI / 2], ex: [4.4, 0.6, -2.4], tag: 'Suction', conf: 'inferred', src: ['gs-manual'],
      desc: 'Blower that creates suction at the squeegee and the dust path. Power split is not published for the Phantas.',
      specs: [['Whole-robot output (S1 PRO manual)', '700 W']],
      build(b) { L.turbine(b, { r: 0.42, h: 0.7 }); },
    },

    // ───────────── Power & brain ─────────────
    {
      id: 'battery', name: 'Lithium battery', group: 'power', layer: 2, delay: 0.04,
      home: [0, 1.2, -0.6], ex: [0, 0.4, -1.4], tag: '24 V · 40 Ah', conf: 'confirmed', src: ['okm', 'taski', 'gs-manual'],
      desc: 'Lithium iron phosphate pack that runs the drive, brushes, pump and electronics.',
      specs: [['Pack', '24 V · 40 Ah LFP'], ['Charge time', 'About 2 h'], ['Runtime', '4–4.5 h scrub · up to 6 h sweep · ~10 h dust-mop'], ['Output (S1 PRO manual)', '700 W']],
      build(b) { L.battery(b, { w: 2.3, h: 0.85, d: 1.9 }); },
    },
    {
      id: 'charge-contacts', name: 'Charge contacts', group: 'power', layer: 2, delay: 0.1,
      home: [0, 0.95, -2.95], ex: [0, -0.2, -3.9], tag: 'Dock', conf: 'named', src: ['gs-dock'],
      desc: 'Copper pads on the back that meet the CD-04 dock. When the battery runs low the robot drives itself back and docks.',
      specs: [['Dock', 'CD-04 · 345 × 195 × 689 mm · 9 kg'], ['Dock power', '735 W · 220 V ±22 V']],
      build(b) { L.chargePads(b, { w: 1.4 }); },
    },
    {
      id: 'controller', name: 'Main controller', group: 'power', layer: 1, delay: 0.14,
      home: [0, 3.59, 0.1], ex: [0, 1.2, 0.6], tag: 'Fusion', conf: 'inferred', src: ['leo'],
      desc: 'Computer board that fuses the LiDAR and cameras into a 3D picture, plans the route and drives the motors.',
      specs: [['Perception', 'Multi-sensor fusion, 3D obstacle avoidance']],
      build(b) { L.pcb(b, { w: 2.4, d: 2.2 }); },
    },

    // ───────────── Drive & frame ─────────────
    {
      id: 'chassis', name: 'Chassis frame', group: 'drive', layer: 3, delay: 0.12,
      home: [0, 0.62, -0.8], ex: [0, -1.5, -0.2], tag: 'Frame', conf: 'inferred', src: ['gs-spec'],
      desc: 'The steel base everything bolts to. It carries the drive wheels, battery, tanks and cleaning deck.',
      specs: [['Overall footprint', '585 × 445 mm']],
      build(b) {
        b.box(4.2, 0.28, 3.9, { m: 'metal', r: 0.1 });
        for (const s of [-1, 1]) b.box(0.2, 0.4, 3.7, { m: 'steel', at: [s * 1.95, 0.18, 0], e: false });
        b.box(3.4, 0.18, 0.9, { m: 'metal', at: [0, -0.05, 2.05], e: false });
        for (const z of [-1.2, 0, 1.2]) b.box(3.8, 0.12, 0.14, { m: 'steel', at: [0, 0.18, z], e: false });
      },
    },
    ...[-1, 1].map((s) => ({
      id: s < 0 ? 'wheel-l' : 'wheel-r', name: s < 0 ? 'Drive wheel (left)' : 'Drive wheel (right)',
      group: 'drive', layer: 3, delay: 0.04,
      home: [s * 2.0, 0.62, -0.7], ex: [s * 3.3, -1.0, -0.4], tag: '300 W', conf: 'named', src: ['gs-manual'],
      desc: 'Independent drive wheel. Steering is done by spinning the two sides at different speeds.',
      specs: [['Drive motor (S1 PRO manual)', '300 W']],
      build(b) { L.wheel(b, { r: 0.62, w: 0.46, side: s }); },
    })),
    {
      id: 'caster', name: 'Front caster', group: 'drive', layer: 3, delay: 0.1,
      home: [0, 0.3, 0.4], ex: [0, -1.8, 0.8], tag: 'Swivel', conf: 'inferred', src: ['gs-spec'],
      desc: 'Free-swivel wheel that keeps the robot level while the two drive wheels steer.',
      specs: [['Type', 'Swivel caster']],
      build(b) { L.caster(b, { r: 0.3 }); },
    },

    // ───────────── Sensing ─────────────
    {
      id: 'lidar-2d', name: '2D LiDAR', group: 'sense', layer: 1, delay: 0.0,
      home: [0, 1.95, 2.9], ex: [0, -0.2, 5.0], tag: '2D scan', conf: 'confirmed', src: ['gs-spec'],
      desc: 'A spinning laser that draws a flat map of walls and obstacles at its height.',
      specs: [['Type', '2D LiDAR (spec sheet)']],
      build(b) { L.lidar(b); },
    },
    {
      id: 'depth-cameras', name: '3D depth cameras', group: 'sense', layer: 1, delay: 0.04,
      home: [0, 4.0, 2.86], ex: [0, 3.2, 5.6], tag: '3D', conf: 'confirmed', src: ['gs-spec', 'leo'],
      desc: 'Depth cameras that see the shape of things above the LiDAR plane, such as table edges, chair legs and people. They give the robot 3D obstacle awareness. The pair shown is schematic.',
      specs: [['Type', '3D depth cameras (spec sheet)'], ['Role', '3D obstacle perception']],
      build(b) {
        for (const s of [-1, 1]) b.at([s * 0.95, 0, 0], () => L.camera(b, { w: 0.75, h: 0.42, d: 0.3 }));
      },
    },
    {
      id: 'rgb-camera', name: 'RGB camera', group: 'sense', layer: 1, delay: 0.06,
      home: [0, 4.0, 2.86], ex: [0, 4.5, 4.4], tag: 'Vision', conf: 'confirmed', src: ['gs-spec'],
      desc: 'Colour camera for recognising what is in front of the robot and for remote monitoring.',
      specs: [['Type', 'RGB camera (spec sheet)']],
      build(b) { L.camera(b, { w: 0.45, h: 0.3, d: 0.28, lens: 0.1 }); },
    },
    {
      id: 'cliff-sensors', name: 'Anti-drop sensors', group: 'sense', layer: 1, delay: 0.1,
      home: [0, 0.4, 2.9], ex: [0, -1.5, 3.0], tag: 'Cliff', conf: 'confirmed', src: ['gs-spec'],
      desc: 'Downward-looking sensors under the nose that detect a missing floor, like a stairwell or a dock edge, so the robot stops before it falls.',
      specs: [['Type', 'Anti-drop (spec sheet)']],
      build(b) {
        for (const s of [-1, 1]) b.at([s * 1.5, 0, 0], () => {
          b.box(0.4, 0.16, 0.3, { m: 'dark', r: 0.04 });
          b.box(0.12, 0.04, 0.12, { m: 'accent', at: [0, -0.09, 0.08], e: false });
        });
      },
    },
  ],
};
