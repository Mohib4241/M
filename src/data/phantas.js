// Gausium Phantas (Gaussian Robotics). Y up, +Z front, 1 unit = 100 mm.
// Part names and numbers come from published spec sheets, manuals and parts catalogs.
// The outside follows photographs of a unit and its dock; shapes and internal positions are a schematic
// reconstruction, not CAD.
import * as THREE from 'three';
import * as L from '../lib.js';
import { eyesTexture } from '../kit.js';

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
  // the real unit is black, so the studio look uses black for the shell, the lid and the skirt
  mats: {
    studio: {
      shell:   { color: 0x14171a, metalness: 0.2, roughness: 0.4,  clearcoat: 0.7, clearcoatRoughness: 0.25 },
      shellDk: { color: 0x0d0f11, metalness: 0.2, roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.12 },
      trim:    { color: 0x262c31 },
    },
  },
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
    'The outside follows photographs of a unit docked on its CD-04: a black body, the LiDAR and the emergency stop on the lid, a face-screen and a pull handle at the front, a grey side trim with a green light bar.',
    'The dock is shown attached behind the robot, as in the photographs; open the Docking station group to take it apart by itself.',
    'An optional dock handles charging, water refill, wastewater drainage and component rinsing.',
    'TASKI (Diversey) lists the dirty-water tank at 11 L; Gausium lists 10.5 L.',
  ],
  sources: ['photos', 'gs-spec', 'taski', 'gs-manual', 'softbank', 'okm', 'gs-dock', 'gs-news', 'gs-nz', 'anton-gs', 'sonny', 'award', 'rl-ph', 'leo'],
  water: ['clean-tank:out', 'pump:a', 'pump:b', 'brush-deck:nozzle', 'squeegee:in', 'recovery-tank:in'],

  parts: [
    // ───────────── Shell & covers ─────────────
    // The body is a rounded box: four flat panels with the rounded corners carried by the side covers.
    // The lid and the skirt are rounded-rectangle slabs. 1 unit = 100 mm; the body is 420 x 540 mm.
    {
      id: 'top-cover', name: 'Top cover', group: 'shell', layer: 0, delay: 0,
      home: [0, 5.11, 0], ex: [0, 4.4, 0], tag: 'Lid', conf: 'named', src: ['photos', 'gs-spec'],
      desc: 'The black lid over the tanks and the dust bay. The LiDAR, the emergency stop, a ring button and the screen sit on it, with a dark oval slot between them. A grey trim runs under its edge. It is the first piece to lift away.',
      specs: [['Robot height', '619 mm (with the LiDAR)']],
      build(b) {
        b.panel(4.5, 5.75, 0.42, { m: 'shell', r: 0.95, bevel: 0.12, rot: [-PI / 2, 0, 0] });
        b.panel(4.3, 5.55, 0.1, { m: 'graphite', r: 0.85, bevel: 0.02, rot: [-PI / 2, 0, 0], at: [0, -0.26, 0], e: false });
        b.panel(1.1, 0.6, 0.03, { m: 'dark', r: 0.3, bevel: 0.01, rot: [-PI / 2, 0, 0], at: [0, 0.215, -0.45], e: false }); // oval slot
        b.box(1.2, 0.03, 1.2, { m: 'dark', r: 0.05, at: [-0.2, 0.215, -1.95], e: false }); // LiDAR mount
        b.panel(0.5, 0.5, 0.03, { m: 'dark', r: 0.25, bevel: 0.01, rot: [-PI / 2, 0, 0], at: [0.9, 0.215, -1.9], e: false }); // ring-button bezel
      },
    },
    {
      id: 'front-cover', name: 'Front panel', group: 'shell', layer: 0, delay: 0.03,
      home: [0, 3.175, 2.55], ex: [0, 1.0, 4.4], tag: 'Front', conf: 'named', src: ['photos', 'gs-spec'],
      desc: 'The black front panel. It has a recess for the pull handle under the lid, two small icon keys above it, and the maker\'s emblem and a label field lower down. The corners round away into the side covers.',
      specs: [['Finish', 'Black, carbon-fibre look']],
      build(b) {
        b.panel(2.5, 3.45, 0.32, { m: 'shell', r: 0.3, bevel: 0.08 });
        b.box(2.25, 0.68, 0.05, { m: 'trim', r: 0.06, at: [0, 0.8, 0.17], e: false }); // handle recess frame
        b.box(2.0, 0.46, 0.09, { m: 'dark', r: 0.05, at: [0, 0.8, 0.14], e: false });
        b.box(2.0, 1.5, 0.03, { m: 'trim', r: 0.08, at: [0, -0.75, 0.165], e: false }); // label field
        // the emblem: two bent bars
        b.box(0.5, 0.1, 0.04, { m: 'graphite', at: [-0.06, -0.62, 0.19], rot: [0, 0, 0.7], e: false });
        b.box(0.5, 0.1, 0.04, { m: 'graphite', at: [0.06, -0.86, 0.19], rot: [0, 0, 0.7], e: false });
      },
    },
    {
      id: 'rear-cover', name: 'Rear panel', group: 'shell', layer: 0, delay: 0.03,
      home: [0, 3.175, -2.55], ex: [0, 1.0, -4.4], tag: 'Rear door', conf: 'inferred', src: ['photos', 'gs-spec'],
      desc: 'Rear panel over the tanks and the drive bay. It faces the dock when the robot is parked on it, with a window that lines up with the dock\'s contacts.',
      specs: [['Dock', 'CD-04, auto-recharge']],
      build(b) {
        b.panel(2.5, 3.45, 0.32, { m: 'shell', r: 0.3, bevel: 0.08 });
        for (let i = 0; i < 6; i++) b.box(1.5, 0.06, 0.04, { m: 'dark', at: [0, 0.8 - i * 0.15, -0.17], e: false });
        b.box(1.1, 0.4, 0.04, { m: 'glass', at: [0, -1.3, -0.17], e: false });
      },
    },
    ...[-1, 1].map((s) => ({
      id: s < 0 ? 'side-cover-l' : 'side-cover-r', name: s < 0 ? 'Right side cover' : 'Left side cover',
      group: 'shell', layer: 0, delay: 0.06,
      home: [s * 2.08, 3.175, 0], ex: [s * 4.6, 1.0, 0], tag: 'Side panel', conf: 'named', src: ['photos', 'gs-spec'],
      desc: 'Side panel that closes the cabinet, with the rounded front and rear corners. A grey plate with a green light bar at its front edge sits on it. It pops off outward so the tanks and wiring can be reached.',
      specs: [['Width', '445 mm overall']],
      build(b) {
        b.panel(3.6, 3.45, 0.32, { m: 'shell', r: 0.3, bevel: 0.08, rot: [0, PI / 2, 0] });
        for (const z of [-1.8, 1.8]) b.cyl(0.9, 0.9, 3.45, { m: 'shell', at: [-s * 0.88, 0, z], seg: 32, e: false }); // the rounded corners
        b.panel(2.4, 2.7, 0.06, { m: 'graphite', r: 0.35, bevel: 0.02, rot: [0, PI / 2, 0], at: [s * 0.19, -0.1, 0.6], e: false });
        b.box(0.07, 1.25, 0.15, { m: 'green', r: 0.03, at: [s * 0.24, -0.1, 1.62], e: false });
        for (let i = 0; i < 6; i++) b.box(0.03, 0.06, 0.9, { m: 'dark', at: [s * 0.17, 1.1 - i * 0.12, -1.2], e: false }); // speaker slits
      },
    })),
    {
      id: 'bumper', name: 'Skirt and bumper', group: 'shell', layer: 0, delay: 0.1,
      home: [0, 0.825, 0.025], ex: [0, -0.5, 5.3], tag: 'Contact', conf: 'named', src: ['photos', 'gs-spec'],
      desc: 'The glossy black skirt around the base. Three sensor windows sit across its nose, and a pod on one side houses the side brush. Contact stops the robot; the spec sheet lists anti-collision sensing in its sensor suite.',
      specs: [['Sensor class', 'Anti-collision']],
      build(b) {
        b.panel(4.45, 5.85, 1.25, { m: 'shellDk', r: 1.0, bevel: 0.22, rot: [-PI / 2, 0, 0] });
        for (const x of [-1.5, 1.5]) b.box(0.8, 0.28, 0.07, { m: 'steel', r: 0.05, at: [x, 0.12, 2.93], e: false });
        b.box(0.9, 0.24, 0.07, { m: 'glass', r: 0.05, at: [0, 0.12, 2.94], e: false });
        for (const x of [-1.95, 1.95]) b.box(0.1, 0.22, 0.05, { m: 'yellow', at: [x, 0.5, 2.62], e: false });
        b.cyl(0.55, 0.55, 1.0, { m: 'shellDk', at: [-2.2, -0.05, 1.9], seg: 32 }); // the side-brush pod
      },
    },

    // ───────────── Controls ─────────────
    {
      id: 'display', name: 'Screen', group: 'ui', layer: 0, delay: 0.05,
      home: [0, 5.33, 1.2], ex: [0, 5.2, 1.0], tag: 'Face', conf: 'inferred', src: ['photos'],
      desc: 'A colour screen set into the front half of the lid. On the unit photographed it shows two rounded-square eyes while idle. Its size and what it controls are not stated in the sources reached.',
      specs: [['Seen on the unit', 'Idle face with two eyes']],
      build(b) {
        b.panel(2.8, 2.0, 0.06, { m: 'glass', r: 0.25, bevel: 0.01, rot: [-PI / 2, 0, 0] });
        const tex = eyesTexture();
        const scr = b.box(2.55, 0.012, 1.78, { m: 'screen', r: 0, at: [0, 0.04, 0], e: false });
        scr.material.map = tex;
        scr.material.emissiveMap = tex;
        scr.material.emissive = new THREE.Color(0xffffff);
        scr.material.emissiveIntensity = 0.55;
        b.records.find((r) => r.mat === scr.material).emissive.set(0xffffff);
      },
    },
    {
      id: 'smart-handle', name: 'Pull handle', group: 'ui', layer: 0, delay: 0.08,
      home: [0, 4.0, 2.7], ex: [0, 0.3, 5.8], tag: 'Hard keys', conf: 'named', src: ['photos', 'gs-news', 'gs-nz', 'anton-gs'],
      desc: 'A handle that sits in a recess at the front, under the lid, with two small keys above it. It switches the robot between automatic and manual operation, so staff can start or steer a job without the screen. Hard keys for basic operations such as picking a cleaning mode were shown as an upgrade at Interclean Amsterdam 2024.',
      specs: [['Operation', 'Switches between auto and manual'], ['Buttons', 'Hard keys such as mode selection (reported)']],
      build(b) {
        b.box(1.9, 0.3, 0.22, { m: 'dark', r: 0.09, at: [0, 0, 0] });
        b.box(1.5, 0.05, 0.05, { m: 'steel', at: [0, 0.1, 0.12], e: false });
        for (const x of [-0.22, 0.22]) b.box(0.2, 0.2, 0.05, { m: 'trim', r: 0.06, at: [x, 0.42, -0.02] });
      },
    },
    {
      id: 'e-stop', name: 'Emergency stop', group: 'ui', layer: 0, delay: 0.1,
      home: [-1.2, 5.37, -1.9], ex: [-0.9, 5.4, -0.6], tag: 'E-stop', conf: 'named', src: ['photos', 'gs-spec'],
      desc: 'Red mushroom switch on the lid, at the rear corner. It cuts drive and cleaning power at once.',
      specs: [['Action', 'Cuts drive + brush power']],
      build(b) { L.eStop(b, { r: 0.3 }); },
    },
    {
      id: 'ring-button', name: 'Ring button', group: 'ui', layer: 0, delay: 0.1,
      home: [0.9, 5.34, -1.9], ex: [0.9, 5.0, -0.6], tag: 'Button', conf: 'inferred', src: ['photos'],
      desc: 'A round push button with a thin ring around it, at the opposite rear corner of the lid from the emergency stop. What it does is not stated in the sources reached (power or start is typical).',
      specs: [['Seen on the unit', 'Ring-shaped push button on the lid']],
      build(b) {
        b.cyl(0.2, 0.2, 0.05, { m: 'dark', seg: 28 });
        b.tor(0.17, 0.028, { m: 'steel', rot: [PI / 2, 0, 0], at: [0, 0.03, 0], seg: 28, e: false });
        b.cyl(0.07, 0.07, 0.06, { m: 'trim', at: [0, 0.03, 0], seg: 16, e: false });
      },
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
          b.box(0.14, 0.7, 2.0, { m: 'trim', r: 0.04, at: [s * 1.95, 0, 0] });
          b.box(0.06, 0.3, 1.9, { m: 'rubber', at: [s * 1.88, -0.38, 0], e: false });
        }
        b.box(3.7, 0.6, 0.12, { m: 'trim', at: [0, 0.02, -0.95] });
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
      home: [-2.2, 0.45, 1.9], ex: [-4.6, -1.5, 3.0], tag: 'Edges', conf: 'confirmed', src: ['softbank', 'rl-ph'],
      desc: 'Spinning brush in the pod at the front corner that sweeps edges and corners into the roller path. Retailers quote cleaning right up to the wall.',
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
      home: [s * 1.9, 0.62, -0.7], ex: [s * 3.3, -1.0, -0.4], tag: '300 W', conf: 'named', src: ['gs-manual'],
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
      id: 'lidar-2d', name: '2D LiDAR', group: 'sense', layer: 0, delay: 0.02,
      home: [-0.2, 5.33, -1.95], ex: [0, 6.0, -0.6], tag: '2D scan', conf: 'confirmed', src: ['photos', 'gs-spec'],
      desc: 'A spinning laser that draws a flat map of walls and obstacles at its height. It sits on top of the lid, at the rear, under a square metal cap, so nothing on the body blocks its view.',
      specs: [['Type', '2D LiDAR (spec sheet)'], ['Position', 'On the lid, rear centre']],
      build(b) {
        b.box(1.0, 0.12, 1.0, { m: 'dark', r: 0.04, at: [0, 0.06, 0] });
        const ring = b.cyl(0.36, 0.36, 0.34, { m: 'lens', at: [0, 0.29, 0], seg: 32 });
        ring.userData.spin = 1.4;
        b.box(0.78, 0.18, 0.78, { m: 'silver', r: 0.07, at: [0, 0.55, 0] });
        const top = b.cyl(0.18, 0.4, 0.14, { m: 'silver', at: [0, 0.71, 0], seg: 4 });
        top.rotation.y = PI / 4;
        b.box(0.18, 0.1, 0.06, { m: 'accent', at: [0, 0.3, 0.37], e: false });
      },
    },
    {
      id: 'depth-cameras', name: '3D depth cameras', group: 'sense', layer: 0, delay: 0.04,
      home: [0, 0.85, 2.5], ex: [0, -0.2, 5.8], tag: '3D', conf: 'confirmed', src: ['gs-spec', 'leo'],
      desc: 'Depth cameras that see the shape of things above the floor, such as table edges, chair legs and people. They look out through the two outer windows across the nose of the skirt. They give the robot 3D obstacle awareness. Their exact place is not shown in the sources reached.',
      specs: [['Type', '3D depth cameras (spec sheet)'], ['Role', '3D obstacle perception']],
      build(b) {
        for (const s of [-1, 1]) b.at([s * 1.5, 0, 0], () => L.camera(b, { w: 0.75, h: 0.3, d: 0.3, lens: 0.1 }));
      },
    },
    {
      id: 'rgb-camera', name: 'RGB camera', group: 'sense', layer: 0, delay: 0.06,
      home: [0, 0.85, 2.5], ex: [0, -0.2, 4.6], tag: 'Vision', conf: 'confirmed', src: ['gs-spec'],
      desc: 'Colour camera for recognising what is in front of the robot and for remote monitoring. It is placed behind the darker middle window of the skirt. Its exact place is not shown in the sources reached.',
      specs: [['Type', 'RGB camera (spec sheet)']],
      build(b) { L.camera(b, { w: 0.5, h: 0.26, d: 0.28, lens: 0.1 }); },
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

    // ───────────── Docking station (CD-04) ─────────────
    // 345 x 195 x 689 mm, 9 kg. It stands behind the robot with its front face at z = -3.18, as in the photographs.
    {
      id: 'dock-shell', name: 'Dock front shell', group: 'dock', layer: 0, delay: 0,
      home: [0, 3.6, -3.43], ex: [9.5, 0.6, 0], tag: 'CD-04', conf: 'confirmed', src: ['photos', 'gs-dock'],
      desc: 'The black front shell of the charging dock: a tall slab with an arched top, the maker\'s emblem near the top and a grey lower housing with a small round indicator. It stands against the wall and the robot backs onto it.',
      specs: [['Size', '345 × 195 × 689 mm'], ['Weight', '9 kg'], ['Mains', '735 W max · 220 V ±22 V']],
      build(b) {
        b.panel(3.45, 6.6, 0.5, { m: 'shell', r: 1.05, bevel: 0.1 });
        for (const s of [-1, 1]) b.panel(1.55, 5.5, 0.12, { m: 'shell', r: 0.3, bevel: 0.03, rot: [0, PI / 2, 0], at: [s * 1.665, -0.5, -0.8], e: false }); // the side walls
        b.box(1.3, 0.12, 1.55, { m: 'shell', r: 0.04, at: [0, 3.2, -0.78], e: false }); // the flat part of the top
        b.box(3.05, 1.4, 0.14, { m: 'graphite', r: 0.12, at: [0, -2.6, 0.31], e: false });
        b.tor(0.1, 0.025, { m: 'steel', at: [0.9, -2.35, 0.4], seg: 20, e: false });
        b.box(0.5, 0.1, 0.04, { m: 'graphite', at: [-0.06, 2.75, 0.27], rot: [0, 0, 0.7], e: false });
        b.box(0.5, 0.1, 0.04, { m: 'graphite', at: [0.06, 2.51, 0.27], rot: [0, 0, 0.7], e: false });
      },
    },
    {
      id: 'dock-window', name: 'Dock status window', group: 'dock', layer: 0, delay: 0.04,
      home: [0, 5.45, -3.1], ex: [9.5, 0.6, 1.6], tag: 'Green light', conf: 'inferred', src: ['photos'],
      desc: 'A frosted window high on the dock, lit green and ringed with a green light line while the robot is parked and charging. What sits behind it is not stated in the sources reached.',
      specs: [['Seen on the unit', 'Lit green while docked']],
      build(b) {
        b.panel(2.4, 1.8, 0.1, { m: 'green', r: 0.6, bevel: 0.02, e: false });
        b.panel(2.1, 1.5, 0.12, { m: 'window', r: 0.48, bevel: 0.02, at: [0, 0, 0.03], e: false });
      },
    },
    {
      id: 'dock-contacts', name: 'Dock charging contacts', group: 'dock', layer: 1, delay: 0.02,
      home: [0, 0.95, -3.2], rot0: [0, PI, 0], ex: [9.5, -0.3, 3.4], tag: 'Pads', conf: 'named', src: ['gs-dock'],
      desc: 'Copper pads low on the dock\'s front face. They meet the pads on the robot\'s back when it parks, and charge the pack.',
      specs: [['Charge time', 'About 2 h']],
      build(b) { L.chargePads(b, { w: 1.4 }); },
    },
    {
      id: 'dock-board', name: 'Dock power board', group: 'dock', layer: 1, delay: 0.06,
      home: [0, 3.2, -4.3], ex: [11.2, 0.6, 0.4], tag: '735 W', conf: 'inferred', src: ['gs-dock'],
      desc: 'The power supply and control board inside the dock. The dock draws up to 735 W from a 220 V mains. The layout drawn here is schematic.',
      specs: [['Mains', '220 V ±22 V'], ['Max power', '735 W']],
      build(b) {
        b.box(2.4, 1.7, 0.7, { m: 'metal', r: 0.08, at: [0, -0.9, 0] });
        for (let i = -3; i <= 3; i++) b.box(0.03, 1.6, 0.72, { m: 'dark', at: [i * 0.3, -0.9, 0], e: false });
        L.pcb(b, { w: 2.4, d: 2.6, vertical: true });
      },
    },
    {
      id: 'dock-back', name: 'Dock back cover', group: 'dock', layer: 1, delay: 0.1,
      home: [0, 3.55, -5.0], ex: [13.0, 0.6, -1.2], tag: 'Rear', conf: 'inferred', src: ['photos'],
      desc: 'The rear shell of the dock, against the wall, with vents and the opening where the power cord leaves.',
      specs: [['Fixing', 'Stands against a wall socket']],
      build(b) {
        b.panel(3.4, 6.5, 0.3, { m: 'shell', r: 1.05, bevel: 0.08 });
        for (let i = 0; i < 7; i++) b.box(1.6, 0.06, 0.04, { m: 'dark', at: [0, 0.4 - i * 0.16, -0.17], e: false });
      },
    },
    {
      id: 'dock-cable', name: 'Power cord and plug', group: 'dock', layer: 2, delay: 0.04,
      home: [0, 0.5, -5.1], ex: [13.0, 0.2, -2.4], tag: 'Mains', conf: 'named', src: ['photos'],
      desc: 'The mains lead from the back of the dock up to a wall socket, where its plug sits.',
      specs: [['Seen on the unit', 'Plugged into a wall socket behind the dock']],
      build(b) {
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.4, 0, 0), new THREE.Vector3(1.2, -0.1, -0.7), new THREE.Vector3(2.0, 0.3, -1.2), new THREE.Vector3(2.4, 1.6, -1.5), new THREE.Vector3(2.5, 3.0, -1.55)]);
        b.mesh(new THREE.TubeGeometry(curve, 28, 0.06, 8), { m: 'rubber', e: false });
        b.box(0.32, 0.4, 0.2, { m: 'rubber', r: 0.05, at: [2.5, 3.2, -1.55] });
      },
    },
    {
      id: 'dock-base', name: 'Dock base plate', group: 'dock', layer: 3, delay: 0,
      home: [0, 0.08, -3.45], ex: [9.5, -0.6, -1.0], tag: 'Floor', conf: 'inferred', src: ['photos'],
      desc: 'A low black plate on the floor under the dock that carries it and guides the robot\'s back wheels onto the contacts.',
      specs: [['Fixing', 'Stands on the floor']],
      build(b) {
        b.panel(3.6, 3.4, 0.16, { m: 'shellDk', r: 0.55, bevel: 0.05, rot: [-PI / 2, 0, 0] });
      },
    },
  ],
};
