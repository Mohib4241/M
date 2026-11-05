// Gausium Marvel. Y up, +Z front, 1 unit = 100 mm (1,108 L x 699 W x 1,168 H mm).
// Numbers come from Gausium's Marvel specification page and brochure (EN, 2026-09-22). The outside
// follows Gausium's product picture: a tall rounded box with silver sides, a big black front panel, a
// black lid with the emergency stop and a sensor dome at its front, a wide lower bumper and two large
// side brushes out in front. Shapes and internal positions are a schematic reconstruction.
import * as L from '../lib.js';

const PI = Math.PI;
const W = 6.99, LEN = 11.08, H = 11.68;

export default {
  id: 'marvel',
  name: 'Gausium Marvel',
  short: 'Marvel',
  maker: 'Gausium',
  blurb: 'Large scrubber-sweeper for big, complex spaces. It sweeps and scrubs in one pass, with two front side brushes and a self-cleaning waste tank.',
  accent: '#5fd0ff',
  accent2: '#ffd166',
  studio: { accent: '#1f86b8', accent2: '#c08a12' },
  hover: 2.4,
  noDock: 'No dock or workstation is listed with the Marvel\'s specifications.',
  mats: {
    studio: {
      shell:   { color: 0xa9b0b6, metalness: 0.35, roughness: 0.34, clearcoat: 0.55, clearcoatRoughness: 0.22 },
      shellDk: { color: 0x1d2024, metalness: 0.15, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.2 },
      trim:    { color: 0x141619 },
      graphite:{ color: 0x5c636b },
    },
  },
  stats: [
    ['Size', '1,108 × 699 × 1,168 mm'],
    ['Weight', '220 kg'],
    ['Water tanks', '80 L clean · 70 L waste'],
    ['Debris', 'Swept into a hopper'],
    ['Cleaning width', 'Scrub 600 · sweep 840 · mop 760 mm'],
    ['Throughput', 'Scrub 3,024 · sweep 4,233 m²/h'],
    ['Battery', '120 Ah LFP'],
    ['Runtime', 'Scrub 5–7 h · sweep ≥10 h · mop ≥13 h'],
    ['Speed', 'Up to 1.4 m/s'],
    ['Sensing', '3D LiDAR'],
  ],
  notes: [
    'Gausium recommends it for more than 3,000 m², such as supermarkets, factories, warehouses, airports and shopping malls.',
    'Throughput figures are Gausium\'s theoretical maximums (dust mopping 3,830 m²/h). Gradeability 10°, minimum pass width 850 mm, minimum U-turn width 1,300 mm.',
    'Gausium names simultaneous sweeping and scrubbing, a patented front dual side-brush system, 3D LiDAR mapping with remote deployment, and an automatic refresh of the waste-water tank.',
    'The outside follows Gausium\'s product picture. The sources reached name only the 3D LiDAR among its sensors; the others here are inferred. The brush types, the hopper and the squeegee are standard for a sweeper-scrubber but not itemised. No dock or workstation is listed.',
  ],
  sources: ['gs-marvel-img', 'gs-marvel', 'gs-marvel-br'],
  water: ['clean-tank:out', 'pump:a', 'scrub-deck:nozzle', 'squeegee:in', 'recovery-tank:in'],

  parts: [
    // ───────────── Shell & covers ─────────────
    {
      id: 'top-cover', name: 'Top lid', group: 'shell', layer: 0, delay: 0,
      home: [0, 11.0, -0.4], ex: [0, 4.8, 0], tag: 'Lid', conf: 'named', src: ['gs-marvel-img'],
      desc: 'The black lid on top of the body, with the emergency stop at its front edge and two light strips. It lifts away first.',
      specs: [['Robot height', '1,168 mm']],
      build(b) {
        b.panel(5.9, 8.6, 0.9, { m: 'trim', r: 1.8, bevel: 0.25, rot: [-PI / 2, 0, 0] });
        for (const s of [-1, 1]) b.box(0.12, 0.05, 0.9, { m: 'led', at: [s * 2.0, 0.47, 3.4], e: false }); // the white light strips
      },
    },
    {
      id: 'front-shell', name: 'Front panel', group: 'shell', layer: 0, delay: 0.03,
      home: [0, 6.6, 4.2], ex: [0, 1.2, 8.4], tag: 'Black face', conf: 'named', src: ['gs-marvel-img'],
      desc: 'The tall black front panel with the maker\'s mark and a dark slot near its top. A recess at its top holds the sensor dome.',
      specs: [['Width', '699 mm overall']],
      build(b) {
        b.panel(4.6, 6.4, 0.4, { m: 'trim', r: 1.2, bevel: 0.1 });
        b.box(2.8, 0.35, 0.06, { m: 'glass', r: 0.1, at: [0, 2.1, 0.2], e: false }); // the dark slot
        b.box(0.5, 0.1, 0.04, { m: 'silver', at: [-0.06, -0.5, 0.22], rot: [0, 0, 0.7], e: false }); // the maker's mark
        b.box(0.5, 0.1, 0.04, { m: 'silver', at: [0.06, -0.75, 0.22], rot: [0, 0, 0.7], e: false });
      },
    },
    {
      id: 'rear-shell', name: 'Rear panel', group: 'shell', layer: 0, delay: 0.03,
      home: [0, 6.2, -5.0], ex: [0, 1.0, -8.6], tag: 'Rear', conf: 'inferred', src: ['gs-marvel-img'],
      desc: 'The rear panel over the waste-water tank. Its look is not shown in the picture reached.',
      specs: [['Waste tank behind it', '70 L']],
      build(b) { b.panel(5.6, 7.2, 0.4, { m: 'shell', r: 1.1, bevel: 0.1 }); },
    },
    ...[-1, 1].map((s) => ({
      id: s > 0 ? 'side-shell-l' : 'side-shell-r', name: s > 0 ? 'Left side shell' : 'Right side shell',
      group: 'shell', layer: 0, delay: 0.06,
      home: [s * 3.15, 6.2, -0.4], ex: [s * 6.0, 1.0, 0], tag: 'Silver side', conf: 'named', src: ['gs-marvel-img'],
      desc: 'A silver side of the body, rounding into the front with a soft edge. It comes off outward to reach the tanks.',
      specs: [['Width', '699 mm overall']],
      build(b) {
        b.panel(9.6, 7.6, 0.5, { m: 'shell', r: 1.4, bevel: 0.15, rot: [0, PI / 2, 0] });
        b.box(0.08, 0.9, 0.3, { m: 'yellow', r: 0.03, at: [s * 0.27, 1.2, 3.6], e: false }); // the side marker
      },
    })),
    {
      id: 'bumper', name: 'Lower front and bumper', group: 'shell', layer: 0, delay: 0.1,
      home: [0, 1.6, 0], ex: [0, -0.5, 9.0], tag: 'Contact', conf: 'inferred', src: ['gs-marvel-img'],
      desc: 'The silver lower body with the wide black recess across its front, over the brushes. Contact sensing here is inferred: the sources reached do not list it.',
      specs: [['Min. pass width', '850 mm']],
      build(b) {
        b.panel(W, LEN, 2.4, { m: 'shell', r: 1.6, bevel: 0.3, rot: [-PI / 2, 0, 0] });
        b.box(4.4, 0.9, 0.1, { m: 'trim', r: 0.2, at: [0, 0.3, LEN / 2 - 0.04], e: false }); // the front recess
      },
    },

    // ───────────── Controls ─────────────
    {
      id: 'e-stop', name: 'Emergency stop', group: 'ui', layer: 0, delay: 0.1,
      home: [0, 11.6, 3.6], ex: [0, 7.2, 4.4], tag: 'Stop', conf: 'named', src: ['gs-marvel-img'],
      desc: 'The red stop button at the front of the lid.',
      specs: [['Action', 'Cuts drive + brush power']],
      build(b) { L.eStop(b, { r: 0.3 }); },
    },

    // ───────────── Cleaning head ─────────────
    ...[-1, 1].map((s) => ({
      id: s < 0 ? 'side-brush-r' : 'side-brush-l', name: s < 0 ? 'Right side brush' : 'Left side brush',
      group: 'clean', layer: 3, delay: 0.1,
      home: [s * 2.7, 0.15, 5.6], ex: [s * 5.6, -2.6, 7.4], tag: '840 mm', conf: 'confirmed', src: ['gs-marvel-br', 'gs-marvel-img'],
      desc: 'One of the two large side brushes out in front (Gausium\'s patented dual side-brush system). They sweep fine dust and large debris into the path in one pass.',
      specs: [['Sweeping width', '840 mm']],
      build(b) { L.sideBrush(b, { r: 1.25, tufts: 20 }); },
    })),
    {
      id: 'main-broom', name: 'Main sweeping brush', group: 'clean', layer: 3, delay: 0.04,
      home: [0, 0.45, 3.6], ex: [0, -3.4, 5.4], tag: 'Sweep', conf: 'inferred', src: ['gs-marvel-br'],
      desc: 'The brush that throws the swept debris back into the hopper. Its type is not itemised; it is shown as a roller.',
      specs: [['Sweeping', 'At the same time as scrubbing']],
      build(b) { L.roller(b, { r: 0.45, len: 5.4, rows: 24 }); },
    },
    {
      id: 'hopper', name: 'Debris hopper', group: 'air', layer: 3, delay: 0.12,
      home: [0, 0.8, 2.3], ex: [0, -2.4, 2.6], tag: 'Debris', conf: 'inferred', src: ['gs-marvel-br'],
      desc: 'The bin the swept debris is thrown into. Standard in a sweeper; its size is not published.',
      specs: [['Capacity', 'Not published']],
      build(b) { b.box(5.2, 0.9, 1.4, { m: 'dark', r: 0.12 }); b.box(1.0, 0.12, 0.1, { m: 'accent', at: [0, 0.2, 0.72], e: false }); },
    },
    {
      id: 'scrub-deck', name: 'Scrub deck', group: 'clean', layer: 3, delay: 0,
      home: [0, 0.6, 0.6], ex: [0, -3.0, 1.2], tag: '600 mm', conf: 'confirmed', src: ['gs-marvel', 'gs-marvel-br'],
      desc: 'The scrubbing head, 600 mm wide, that scrubs while the brushes ahead sweep. The brush type is not itemised.',
      specs: [['Scrubbing width', '600 mm'], ['Max. scrubbing', '3,024 m²/h (theoretical)']],
      anchors: { nozzle: [0, 0.3, 0.4] },
      build(b) {
        b.box(6.0, 0.6, 1.8, { m: 'dark', r: 0.2 });
        for (const x of [-1.5, 1.5]) b.cyl(1.35, 1.35, 0.18, { m: 'bristle', at: [x, -0.38, 0], seg: 32 });
        b.box(5.4, 0.08, 0.1, { m: 'accent', at: [0, 0.32, 0.8], e: false });
      },
    },
    {
      id: 'dust-mop', name: 'Dust mop', group: 'clean', layer: 3, delay: 0.08,
      home: [0, 0.1, 5.2], ex: [0, -3.0, 9.0], tag: '760 mm', conf: 'named', src: ['gs-marvel', 'gs-marvel-img'],
      desc: 'The dust-mopping pad across the front, 760 mm wide (the blue strip at the floor in the picture).',
      specs: [['Dust mopping width', '760 mm'], ['Max. dust mopping', '3,830 m²/h (theoretical)']],
      build(b) { b.box(7.6, 0.16, 0.9, { m: 'fabric', r: 0.06 }); },
    },
    {
      id: 'squeegee', name: 'Squeegee', group: 'clean', layer: 3, delay: 0.1,
      home: [0, 0.25, -5.0], ex: [0, -2.6, -8.2], tag: 'Rear', conf: 'inferred', src: ['gs-marvel-br'],
      desc: 'The blade at the back that wipes up the dirty water after scrubbing. Standard in a scrubber; not itemised.',
      specs: [['Picks up into', '70 L waste tank']],
      anchors: { in: [0, 0.6, 0] },
      build(b) { L.squeegee(b, { w: 6.6 }); },
    },

    // ───────────── Water system ─────────────
    {
      id: 'clean-tank', name: 'Clean water tank', group: 'water', layer: 1, delay: 0,
      home: [0, 6.0, 1.5], ex: [0, 5.6, 5.4], tag: '80 L', conf: 'confirmed', src: ['gs-marvel', 'gs-marvel-br'],
      desc: 'Fresh water with detergent for scrubbing.',
      specs: [['Capacity', '80 L (21.1 gal)']],
      anchors: { out: [0, -2.6, 1.0] },
      build(b) { L.tank(b, { w: 5.4, h: 5.2, d: 3.0, kind: 'clean', fill: 0.75 }); },
    },
    {
      id: 'recovery-tank', name: 'Waste water tank', group: 'water', layer: 1, delay: 0.04,
      home: [0, 6.2, -2.4], ex: [0, 5.6, -6.0], tag: '70 L', conf: 'confirmed', src: ['gs-marvel', 'gs-marvel-br'],
      desc: 'Holds the dirty water. Gausium says it cleans itself (automatic water-tank refresh), which cuts the manual work.',
      specs: [['Capacity', '70 L (18.5 gal)'], ['Feature', 'Self-cleaning']],
      anchors: { in: [0, 2.2, -1.0] },
      build(b) { L.tank(b, { w: 5.4, h: 4.8, d: 2.8, kind: 'dirty', fill: 0.45, cap: false }); },
    },
    {
      id: 'pump', name: 'Solution pump', group: 'water', layer: 2, delay: 0,
      home: [2.2, 2.9, 1.6], ex: [5.4, 1.4, 2.4], tag: 'Feed', conf: 'inferred', src: ['gs-marvel-br'],
      desc: 'Moves water from the clean tank to the scrub deck. Standard; not itemised.',
      specs: [['Feeds', 'The scrub deck']],
      anchors: { a: [0, 0.4, 0] },
      build(b) { L.pump(b); },
    },
    {
      id: 'vacuum-motor', name: 'Vacuum motor', group: 'air', layer: 2, delay: 0.04,
      home: [-2.0, 9.6, -2.6], ex: [-5.4, 4.0, -3.0], tag: 'Suction', conf: 'inferred', src: ['gs-marvel-br'],
      desc: 'The fan that lifts the dirty water from the squeegee into the waste tank. Its rating is not published.',
      specs: [['Rating', 'Not published']],
      build(b) { L.turbine(b, { r: 0.6, h: 0.9 }); },
    },

    // ───────────── Power & brain ─────────────
    {
      id: 'battery', name: 'Lithium battery', group: 'power', layer: 2, delay: 0.04,
      home: [0, 2.9, -1.0], ex: [0, -0.4, -4.4], tag: '120 Ah', conf: 'confirmed', src: ['gs-marvel', 'gs-marvel-br'],
      desc: 'The lithium iron phosphate (LFP) pack.',
      specs: [['Type', 'Lithium iron phosphate'], ['Capacity', '120 Ah'], ['Runtime', 'Scrub 5–7 h · sweep ≥10 h · mop ≥13 h']],
      build(b) { L.battery(b, { w: 5.0, h: 1.4, d: 3.0 }); },
    },
    {
      id: 'charge-contacts', name: 'Charge contacts', group: 'power', layer: 2, delay: 0.1,
      home: [0, 0.7, -5.4], ex: [0, -0.8, -9.0], tag: 'Charging', conf: 'inferred', src: ['gs-marvel'],
      desc: 'Where the charger meets the robot. Their position here is schematic.',
      specs: [['Listed', 'Not in the sources reached']],
      build(b) { L.chargePads(b, { w: 1.6 }); },
    },
    {
      id: 'controller', name: 'Main controller', group: 'power', layer: 1, delay: 0.14,
      home: [0.4, 9.4, 1.2], ex: [1.6, 4.4, 2.6], tag: 'Brain', conf: 'inferred', src: ['gs-marvel-br'],
      desc: 'The computer that maps with the 3D LiDAR, plans the route and supports remote deployment and fleet management.',
      specs: [['Deployment', 'Fully remote']],
      build(b) { L.pcb(b, { w: 2.8, d: 2.2 }); },
    },

    // ───────────── Drive & frame ─────────────
    {
      id: 'chassis', name: 'Chassis frame', group: 'drive', layer: 3, delay: 0.12,
      home: [0, 0.9, -1.0], ex: [0, -2.0, -1.2], tag: 'Frame', conf: 'inferred', src: ['gs-marvel'],
      desc: 'The frame that carries the 220 kg robot.',
      specs: [['Net weight', '220 kg'], ['Gradeability', '10°']],
      build(b) { b.box(5.8, 0.2, 8.0, { m: 'metal', r: 0.05 }); for (const s of [-1, 1]) b.box(0.2, 0.6, 8.0, { m: 'metal', at: [s * 2.8, 0.35, 0] }); },
    },
    ...[-1, 1].map((s) => ({
      id: s < 0 ? 'wheel-l' : 'wheel-r', name: s < 0 ? 'Drive wheel (right)' : 'Drive wheel (left)', // ids follow the race's convention (wheel-l at -x)
      group: 'drive', layer: 3, delay: 0.04,
      home: [s * 3.0, 0.9, -1.6], ex: [s * 6.0, -1.2, -1.4], tag: '1.4 m/s', conf: 'inferred', src: ['gs-marvel'],
      desc: 'One of the two driven wheels.',
      specs: [['Max. speed', '1.4 m/s'], ['Min. U-turn width', '1,300 mm']],
      build(b) { L.wheel(b, { r: 0.9, w: 0.6, side: s }); },
    })),
    {
      id: 'casters', name: 'Front casters', group: 'drive', layer: 3, delay: 0.1,
      home: [0, 0.32, 2.0], ex: [0, -2.4, 2.4], tag: 'Swivel', conf: 'inferred', src: ['gs-marvel'],
      desc: 'Swivel casters under the front of the body.',
      specs: [['Type', 'Swivel']],
      build(b) { for (const s of [-1, 1]) b.at([s * 2.6, 0, 0], () => L.caster(b, { r: 0.32 })); },
    },

    // ───────────── Sensing ─────────────
    {
      id: 'lidar-3d', name: '3D LiDAR', group: 'sense', layer: 0, delay: 0.02,
      home: [0, 10.2, 4.45], ex: [0, 7.0, 7.0], tag: 'Mapping', conf: 'confirmed', src: ['gs-marvel-br', 'gs-marvel-img'],
      desc: 'The round sensor in the recess at the top of the front panel. Gausium names a 3D LiDAR for high-precision mapping, navigation and positioning; that it is this dome is our reading of the picture.',
      specs: [['Use', 'Mapping · navigation · positioning']],
      build(b) { b.cyl(0.42, 0.46, 0.4, { m: 'trim', rot: [PI / 2, 0, 0], seg: 28 }); b.sph(0.32, { m: 'lens', cap: PI / 2, rot: [PI / 2, 0, 0], at: [0, 0, 0.18], seg: 24 }); },
    },
    {
      id: 'cliff-sensors', name: 'Anti-drop sensors', group: 'sense', layer: 1, delay: 0.1,
      home: [0, 0.35, 5.3], ex: [0, -2.6, 8.0], tag: 'Cliff', conf: 'inferred', src: ['gs-marvel'],
      desc: 'Downward-looking sensors at the front edge. Standard on these robots; not listed in the sources reached.',
      specs: [['Listed', 'Not in the sources reached']],
      build(b) { for (const x of [-2.6, -0.9, 0.9, 2.6]) b.cyl(0.12, 0.12, 0.12, { m: 'lens', at: [x, 0, 0], seg: 16 }); },
    },
    {
      id: 'front-camera', name: 'Front camera', group: 'sense', layer: 1, delay: 0.06,
      home: [0, 8.7, 4.42], ex: [0, 3.0, 8.4], tag: 'Vision', conf: 'inferred', src: ['gs-marvel-img'],
      desc: 'A camera behind the dark slot at the top of the front panel. What sits behind the slot is not stated; a camera is our reading.',
      specs: [['Listed', 'Not in the sources reached']],
      build(b) { L.camera(b, { w: 0.6, h: 0.3, d: 0.25, lens: 0.1 }); },
    },
  ],
};
