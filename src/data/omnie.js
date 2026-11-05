// Gausium Omnie, roller-brush version. Y up, +Z front, 1 unit = 100 mm (810 L x 700 W x 1,070 H mm).
// Numbers come from Gausium's Omnie specification page and brochure (EN, 2025-11-14) and a distributor
// sheet. The outside follows Gausium's product pictures: a tall body whose silver front tapers towards a
// round black top, a dark rear, a camera pod and a dome at the front top, a rear handle, and a wide black
// base with the squeegee behind. Shapes and internal positions are a schematic reconstruction.
import * as THREE from 'three';
import * as L from '../lib.js';

const PI = Math.PI;
// the body: an oval column, 6.0 wide and 6.3 deep at its foot, leaning in a little to 5.4 x 5.7 under the top
const BODY = { y0: 1.8, y1: 9.4, rb: 3.0, rt: 2.7, kz: 1.05, z: -0.25 };
const DEG = PI / 180;
/** A slice of the body column, from angle a0 to a1 (degrees, 0 = straight ahead, 90 = the robot's left). */
const slice = (b, a0, a1, m) => {
  const h = BODY.y1 - BODY.y0;
  const geo = new THREE.CylinderGeometry(BODY.rt, BODY.rb, h, Math.max(8, Math.round((a1 - a0) / 4)), 1, true, a0 * DEG, (a1 - a0) * DEG);
  const mesh = b.mesh(geo, { m, thr: 40 });
  mesh.material.side = THREE.DoubleSide;
  mesh.scale.z = BODY.kz;
  return mesh;
};

export default {
  id: 'omnie',
  name: 'Gausium Omnie',
  short: 'Omnie',
  maker: 'Gausium',
  blurb: 'AI-powered scrubber for busy, changing places. Dual roller brushes and side brushes clean 780 mm wide and sweep debris into a built-in tray.',
  accent: '#b49bff',
  accent2: '#7cf0c8',
  studio: { accent: '#6c4fd6', accent2: '#169c78' },
  hover: 2.2,
  noDock: 'No dock or workstation is listed with the Omnie\'s specifications.',
  // a silver front over a dark grey rear, a black top and a black base, as in the product pictures
  mats: {
    studio: {
      shell:   { color: 0xb9bec3, metalness: 0.35, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 },
      shellDk: { color: 0x2c3036, metalness: 0.15, roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.25 },
      trim:    { color: 0x16191c },
      graphite:{ color: 0x5c636b },
    },
  },
  stats: [
    ['Size', '810 × 700 × 1,070 mm'],
    ['Weight', '148 kg (roller) · 157 kg (disc)'],
    ['Water tanks', '33 L clean · 24 L waste'],
    ['Debris', 'Built-in debris tray'],
    ['Cleaning width', '406 mm roller · 780 mm with side brushes'],
    ['Throughput', 'Scrub 2,046 m²/h · sweep 3,931 m²/h'],
    ['Battery', '60 Ah · 24 V LiFePO4'],
    ['Runtime', '3 h scrub · 8 h sweep or dust mop'],
    ['Speed', 'Up to 1.4 m/s'],
    ['Sensing', '3D + 2D LiDAR · 3D depth · RGB'],
  ],
  notes: [
    'Shown is the roller-brush version. The disc-brush version scrubs 520 mm wide, weighs 157 kg and reaches 2,621 m²/h scrubbing.',
    'Throughput figures are Gausium\'s theoretical maximums. Gradeability 4.6°, minimum pass width 800 mm, minimum U-turn width 1,100 mm, charging about 2 h.',
    'Gausium names OmniVision (360° camera coverage and a bird\'s-eye view), OmniLiDAR (360° LiDAR coverage), OmniClean (dual roller and side brushes into the debris tray) and OmniSpotCleaning (AI detection of dry and wet waste).',
    'The outside follows Gausium\'s product pictures. The flat black panel on the top and the dark panel on the front are shown as they look; what is behind them is not stated in the sources. No dock or workstation is shown: none is listed with the Omnie\'s specifications.',
  ],
  sources: ['gs-omnie-img', 'gs-omnie', 'gs-omnie-br', 'zx-omnie'],
  water: ['clean-tank:out', 'pump:a', 'brush-deck:nozzle', 'squeegee:in', 'recovery-tank:in'],

  parts: [
    // ───────────── Shell & covers ─────────────
    {
      id: 'top-cover', name: 'Top cover', group: 'shell', layer: 0, delay: 0,
      home: [0, 9.85, BODY.z], ex: [0, 4.6, 0], tag: 'Round top', conf: 'named', src: ['gs-omnie-img'],
      desc: 'The round black top of the body. A flat dark panel sits in it, with the red emergency stop at its front edge. It lifts away first.',
      specs: [['Robot height', '1,070 mm']],
      build(b) {
        const ring = b.cyl(2.8, 2.95, 0.9, { m: 'trim', seg: 48 }); ring.scale.z = BODY.kz; // a collar a little wider than the body
        const top = b.cyl(2.55, 2.8, 0.25, { m: 'trim', seg: 48, at: [0, 0.55, 0] }); top.scale.z = BODY.kz;
        b.panel(3.2, 2.6, 0.06, { m: 'glass', r: 0.3, bevel: 0.02, rot: [-PI / 2, 0, 0], at: [0, 0.69, -0.15], e: false }); // the flat dark panel
      },
    },
    {
      id: 'front-shell', name: 'Front shell', group: 'shell', layer: 0, delay: 0.03,
      home: [0, (BODY.y0 + BODY.y1) / 2, BODY.z], ex: [0, 1.0, 5.2], tag: 'Silver', conf: 'named', src: ['gs-omnie-img'],
      desc: 'The silver front half of the body. It leans back as it rises, so the top is narrower than the foot. It carries the maker\'s mark and the model name, and frames the dark front panel.',
      specs: [['Width', '700 mm overall (with the base)']],
      build(b) {
        slice(b, -45, 45, 'shell');
        // the maker's mark: two bent bars, below the camera pod
        b.box(0.42, 0.09, 0.04, { m: 'graphite', at: [-0.05, 1.75, 2.82], rot: [-0.08, 0, 0.7], e: false });
        b.box(0.42, 0.09, 0.04, { m: 'graphite', at: [0.05, 1.55, 2.84], rot: [-0.08, 0, 0.7], e: false });
      },
    },
    {
      id: 'rear-shell', name: 'Rear shell', group: 'shell', layer: 0, delay: 0.03,
      home: [0, (BODY.y0 + BODY.y1) / 2, BODY.z], ex: [0, 1.0, -5.2], tag: 'Dark grey', conf: 'named', src: ['gs-omnie-img'],
      desc: 'The dark grey rear half of the body, over the waste-water tank and the battery.',
      specs: [['Waste tank behind it', '24 L']],
      build(b) {
        slice(b, 105, 255, 'shellDk');
        for (let i = 0; i < 6; i++) b.box(1.6, 0.06, 0.05, { m: 'dark', at: [0, -1.2 - i * 0.16, -3.12 + i * 0.012], e: false }); // vent slits
      },
    },
    ...[-1, 1].map((s) => ({
      id: s > 0 ? 'side-shell-l' : 'side-shell-r', name: s > 0 ? 'Left side shell' : 'Right side shell',
      group: 'shell', layer: 0, delay: 0.06,
      home: [0, (BODY.y0 + BODY.y1) / 2, BODY.z], ex: [s * 5.0, 0.9, 0], tag: 'Side', conf: 'named', src: ['gs-omnie-img'],
      desc: 'A side of the body column, silver like the front, curving round into the dark rear.',
      specs: [['Width', '700 mm overall (with the base)']],
      build(b) { if (s > 0) slice(b, 45, 105, 'shell'); else slice(b, -105, -45, 'shell'); },
    })),
    {
      id: 'front-panel', name: 'Front panel', group: 'shell', layer: 0, delay: 0.06,
      home: [0, 4.15, 2.93], rot0: [-0.04, 0, 0], ex: [0, 0.4, 6.6], tag: 'Dark panel', conf: 'inferred', src: ['gs-omnie-img'],
      desc: 'The dark panel with a rounded top in the lower front of the body, carrying the model name. What it covers is not stated in the sources; it sits in front of the clean-water tank.',
      specs: [['Label', 'OMNIE · Autonomous']],
      build(b) {
        b.panel(3.1, 4.1, 0.12, { m: 'trim', r: 0.7, bevel: 0.03 });
        b.box(1.0, 0.1, 0.03, { m: 'silver', at: [0, -1.4, 0.07], e: false }); // the model name
        b.cyl(0.05, 0.05, 0.03, { m: 'graphite', rot: [PI / 2, 0, 0], at: [0, 1.85, 0.07], seg: 12, e: false });
      },
    },
    {
      id: 'handle', name: 'Rear handle', group: 'shell', layer: 0, delay: 0.08,
      home: [0, 9.55, -3.25], ex: [0, 2.4, -6.0], tag: 'Push / pull', conf: 'named', src: ['gs-omnie-img'],
      desc: 'A loop handle at the back of the top, for pushing the robot by hand.',
      specs: [['Use', 'Moving the robot by hand']],
      build(b) {
        b.tor(0.75, 0.09, { m: 'trim', rot: [PI / 2, 0, 0], arc: PI, at: [0, 0, -0.1] });
        for (const s of [-1, 1]) b.box(0.18, 0.16, 0.5, { m: 'trim', r: 0.05, at: [s * 0.75, 0, 0.15] });
      },
    },
    {
      id: 'bumper', name: 'Base and bumper', group: 'shell', layer: 0, delay: 0.1,
      home: [0, 0.95, 0], ex: [0, -0.5, 7.2], tag: 'Anti-collision', conf: 'confirmed', src: ['gs-omnie-img', 'gs-omnie'],
      desc: 'The wide black base under the body. It reaches out past the body all round and carries the low sensor window at the front. Contact stops the robot; anti-collision sensing is listed in its sensor system.',
      specs: [['Footprint', '810 × 700 mm'], ['Min. pass width', '800 mm']],
      build(b) {
        b.panel(7.0, 8.1, 1.7, { m: 'trim', r: 2.9, bevel: 0.35, rot: [-PI / 2, 0, 0] });
        b.panel(6.9, 8.0, 0.14, { m: 'graphite', r: 2.85, bevel: 0.03, rot: [-PI / 2, 0, 0], at: [0, 0.5, 0], e: false }); // the grey band round it
        b.box(2.6, 0.22, 0.08, { m: 'glass', r: 0.06, at: [0, -0.15, 4.03], e: false }); // the front sensor window
        const deck = b.cyl(3.15, 3.15, 0.08, { m: 'dark', seg: 48, at: [0, 0.87, BODY.z], e: false }); deck.scale.z = BODY.kz;
      },
    },

    // ───────────── Controls ─────────────
    {
      id: 'e-stop', name: 'Emergency stop', group: 'ui', layer: 0, delay: 0.1,
      home: [0, 10.62, 1.55], ex: [0, 6.6, 2.0], tag: 'Stop', conf: 'named', src: ['gs-omnie-img'],
      desc: 'The red mushroom button at the front of the top. Pressing it cuts the drive and the brushes at once.',
      specs: [['Action', 'Cuts drive + brush power']],
      build(b) { L.eStop(b, { r: 0.28 }); },
    },

    // ───────────── Cleaning head ─────────────
    {
      id: 'brush-deck', name: 'Brush deck', group: 'clean', layer: 3, delay: 0,
      home: [0, 0.75, 1.9], ex: [0, -2.4, 3.2], tag: 'Hood', conf: 'inferred', src: ['gs-omnie-br'],
      desc: 'The housing under the front of the base that holds the two roller brushes and the solution feed, and guides the debris back into the tray.',
      specs: [['Roller cleaning width', '406 mm']],
      anchors: { nozzle: [0, 0.2, 0.2] },
      build(b) {
        b.box(4.8, 0.55, 2.2, { m: 'dark', r: 0.18 });
        b.box(4.4, 0.08, 0.1, { m: 'accent', at: [0, 0.3, 0.6], e: false }); // the spray bar
      },
    },
    ...[[2.55, 'front-roller', 'Front roller brush'], [1.4, 'rear-roller', 'Rear roller brush']].map(([z, id, name], i) => ({
      id, name, group: 'clean', layer: 3, delay: 0.04 + i * 0.04,
      home: [0, 0.4, z], ex: [0, -3.4, 3.6 + i * 1.5], tag: i ? 'Pair' : '406 mm', conf: 'confirmed', src: ['gs-omnie-br', 'gs-omnie'],
      desc: i ? 'The second of the two roller brushes. Turning against each other, they scrub the floor and throw debris back into the tray.'
        : 'The front one of the two roller brushes, 406 mm wide. They scrub and sweep at once, throwing debris back into the built-in tray.',
      specs: [['Scrubbing width', '406 mm'], ['Max. scrubbing', '2,046 m²/h (theoretical)']],
      build(b) { L.roller(b, { r: 0.42, len: 4.06, rows: 22 }); },
    })),
    ...[-1, 1].map((s) => ({
      id: s < 0 ? 'side-brush-r' : 'side-brush-l', name: s < 0 ? 'Right side brush' : 'Left side brush',
      group: 'clean', layer: 3, delay: 0.1,
      home: [s * 2.85, 0.15, 3.25], ex: [s * 5.0, -2.6, 4.2], tag: '780 mm', conf: 'confirmed', src: ['gs-omnie-br', 'gs-omnie'],
      desc: 'One of the two spinning side brushes at the front corners. They sweep edges into the rollers\' path and widen the clean to 780 mm.',
      specs: [['Cleaning width', '780 mm with side brushes']],
      build(b) { L.sideBrush(b, { r: 0.85 }); },
    })),
    {
      id: 'debris-tray', name: 'Debris tray', group: 'air', layer: 3, delay: 0.12,
      home: [0, 0.55, 0.45], ex: [0, -2.2, 0.6], tag: 'Built-in', conf: 'confirmed', src: ['gs-omnie-br'],
      desc: 'The built-in tray behind the roller brushes. The rollers throw debris into it as they turn; it is emptied by hand.',
      specs: [['Fed by', 'Dual roller and side brushes']],
      build(b) {
        b.box(4.2, 0.5, 0.9, { m: 'dark', r: 0.08 });
        b.box(4.0, 0.06, 0.8, { m: 'graphite', at: [0, 0.26, 0], e: false });
        b.box(0.8, 0.12, 0.1, { m: 'accent', at: [0, 0.1, -0.47], e: false }); // the pull tab
      },
    },
    {
      id: 'squeegee', name: 'Squeegee', group: 'clean', layer: 3, delay: 0.1,
      home: [0, 0.25, -3.75], ex: [0, -2.4, -6.0], tag: 'Rear', conf: 'named', src: ['gs-omnie-img', 'gs-omnie-br'],
      desc: 'The curved blade behind the base that wipes up the dirty water after scrubbing. The vacuum lifts the water through it into the waste tank.',
      specs: [['Picks up into', '24 L waste tank']],
      anchors: { in: [0, 0.6, 0] },
      build(b) { L.squeegee(b, { w: 6.2 }); },
    },

    // ───────────── Water system ─────────────
    {
      id: 'clean-tank', name: 'Clean water tank', group: 'water', layer: 1, delay: 0,
      home: [0, 5.2, 1.0], ex: [0, 4.5, 4.4], tag: '33 L', conf: 'confirmed', src: ['gs-omnie', 'gs-omnie-br'],
      desc: 'Fresh water (with detergent) for scrubbing. It fills the front of the body.',
      specs: [['Capacity', '33 L (8.7 gal)']],
      anchors: { out: [0, -1.8, 0.6] },
      build(b) { L.tank(b, { w: 4.4, h: 3.8, d: 2.4, kind: 'clean', fill: 0.75 }); },
    },
    {
      id: 'recovery-tank', name: 'Waste water tank', group: 'water', layer: 1, delay: 0.04,
      home: [0, 5.6, -1.6], ex: [0, 4.5, -4.6], tag: '24 L', conf: 'confirmed', src: ['gs-omnie', 'gs-omnie-br'],
      desc: 'Holds the dirty water the squeegee lifts. It is emptied when full.',
      specs: [['Capacity', '24 L (6.3 gal)']],
      anchors: { in: [0, 1.2, -0.6] },
      build(b) { L.tank(b, { w: 4.2, h: 3.2, d: 2.0, kind: 'dirty', fill: 0.45, cap: false }); },
    },
    {
      id: 'pump', name: 'Solution pump', group: 'water', layer: 2, delay: 0,
      home: [1.9, 2.7, 1.2], ex: [4.6, 1.2, 2.0], tag: 'Feed', conf: 'inferred', src: ['gs-omnie-br'],
      desc: 'Moves water from the clean tank down to the brush deck. Standard in a scrubber; not itemised in the sources.',
      specs: [['Feeds', 'The brush deck']],
      anchors: { a: [0, 0.4, 0], b: [0.8, -0.2, 0] },
      build(b) { L.pump(b); },
    },

    // ───────────── Air & debris ─────────────
    {
      id: 'vacuum-motor', name: 'Vacuum motor', group: 'air', layer: 2, delay: 0.04,
      home: [-1.6, 8.0, -1.6], ex: [-4.2, 3.0, -2.0], tag: 'Suction', conf: 'inferred', src: ['gs-omnie-br'],
      desc: 'The fan that pulls the dirty water up from the squeegee into the waste tank. Standard in a scrubber; its rating is not published.',
      specs: [['Rating', 'Not published']],
      build(b) { L.turbine(b, { r: 0.5, h: 0.8 }); },
    },

    // ───────────── Power & brain ─────────────
    {
      id: 'battery', name: 'Lithium battery', group: 'power', layer: 2, delay: 0.04,
      home: [0, 2.75, -1.2], ex: [0, -0.4, -3.4], tag: '60 Ah', conf: 'confirmed', src: ['gs-omnie'],
      desc: 'The lithium iron phosphate pack that runs the drive, the brushes, the pump and the electronics.',
      specs: [['Type', 'Lithium iron phosphate'], ['Capacity', '60 Ah'], ['Voltage', '24 V DC'], ['Charging', 'About 2 h'], ['Runtime', '3 h scrubbing · 8 h sweeping or dust mopping']],
      build(b) { L.battery(b, { w: 4.0, h: 1.2, d: 2.2 }); },
    },
    {
      id: 'charge-contacts', name: 'Charge contacts', group: 'power', layer: 2, delay: 0.1,
      home: [0, 0.6, -4.0], ex: [0, -0.8, -6.6], tag: 'Charging', conf: 'inferred', src: ['gs-omnie'],
      desc: 'Where the charger meets the robot. Their position here is schematic; the sources give only the charging time.',
      specs: [['Charging time', 'About 2 h']],
      build(b) { L.chargePads(b, { w: 1.4 }); },
    },
    {
      id: 'controller', name: 'Main controller', group: 'power', layer: 1, delay: 0.14,
      home: [0.2, 7.9, 0.6], ex: [1.4, 4.0, 1.8], tag: 'AI', conf: 'inferred', src: ['gs-omnie-br'],
      desc: 'The computer that fuses the LiDARs and cameras, plans the route and runs the AI spot cleaning.',
      specs: [['Runs', 'Navigation · OmniSpotCleaning']],
      build(b) { L.pcb(b, { w: 2.6, d: 2.0 }); },
    },

    // ───────────── Drive & frame ─────────────
    {
      id: 'chassis', name: 'Chassis frame', group: 'drive', layer: 3, delay: 0.12,
      home: [0, 0.75, -1.2], ex: [0, -1.8, -1.0], tag: 'Frame', conf: 'inferred', src: ['gs-omnie'],
      desc: 'The steel frame that carries the 148 kg robot, the drive wheels and the cleaning deck.',
      specs: [['Net weight', '148 kg (roller version)'], ['Gradeability', '4.6°']],
      build(b) {
        b.box(5.4, 0.18, 4.6, { m: 'metal', r: 0.05 });
        for (const s of [-1, 1]) b.box(0.18, 0.5, 4.6, { m: 'metal', at: [s * 2.6, 0.3, 0] });
      },
    },
    ...[-1, 1].map((s) => ({
      id: s < 0 ? 'wheel-l' : 'wheel-r', name: s < 0 ? 'Drive wheel (right)' : 'Drive wheel (left)', // ids follow the race's convention (wheel-l at -x)
      group: 'drive', layer: 3, delay: 0.04,
      home: [s * 2.95, 0.7, -0.9], ex: [s * 5.2, -1.2, -0.6], tag: '1.4 m/s', conf: 'inferred', src: ['gs-omnie'],
      desc: 'One of the two driven wheels. Turning them at different speeds steers the robot.',
      specs: [['Max. cleaning speed', '1.4 m/s'], ['Min. U-turn width', '1,100 mm']],
      build(b) { L.wheel(b, { r: 0.7, w: 0.5, side: s }); },
    })),
    {
      id: 'casters', name: 'Rear casters', group: 'drive', layer: 3, delay: 0.1,
      home: [0, 0.3, -2.9], ex: [0, -2.2, -3.4], tag: 'Swivel', conf: 'inferred', src: ['gs-omnie'],
      desc: 'Swivel casters that carry the rear of the base.',
      specs: [['Type', 'Swivel']],
      build(b) { for (const s of [-1, 1]) b.at([s * 2.2, 0, 0], () => L.caster(b, { r: 0.3 })); },
    },

    // ───────────── Sensing ─────────────
    {
      id: 'lidar-3d', name: '3D LiDAR', group: 'sense', layer: 0, delay: 0.02,
      home: [0.55, 8.75, 2.95], rot0: [PI / 2 - 0.2, 0, 0], ex: [0, 6.4, 3.4], tag: 'OmniLiDAR', conf: 'confirmed', src: ['gs-omnie', 'gs-omnie-img'],
      desc: 'The domed lens in the camera pod at the front top. Gausium lists a 3D LiDAR in the sensor system; with the 2D LiDAR it gives 360° coverage for large, busy spaces. Its place is taken from the pictures; which lens is the 3D LiDAR is our reading.',
      specs: [['Coverage', '360° (OmniLiDAR)']],
      build(b) {
        b.cyl(0.42, 0.48, 0.3, { m: 'trim', seg: 28 });
        b.sph(0.36, { m: 'lens', cap: PI / 2, at: [0, 0.15, 0], seg: 28 });
        b.tor(0.4, 0.04, { m: 'accent', rot: [PI / 2, 0, 0], at: [0, 0.16, 0], e: false });
      },
    },
    {
      id: 'depth-camera', name: '3D depth camera', group: 'sense', layer: 0, delay: 0.04,
      home: [0, 8.75, 2.75], rot0: [-0.05, 0, 0], ex: [0, 3.6, 6.4], tag: 'OmniVision', conf: 'confirmed', src: ['gs-omnie', 'gs-omnie-br'],
      desc: 'The camera pod under the dome. Gausium lists a 3D depth camera; the cameras give 360° object detection and a bird\'s-eye view for avoiding obstacles.',
      specs: [['Coverage', '360° camera coverage (OmniVision)']],
      build(b) {
        b.box(1.7, 0.9, 0.4, { m: 'trim', r: 0.18 });
        for (const s of [-1, 1]) b.cyl(0.12, 0.12, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [s * 0.5, -0.12, 0.21], seg: 20, e: false });
      },
    },
    {
      id: 'rgb-camera', name: 'RGB camera', group: 'sense', layer: 0, delay: 0.06,
      home: [-0.45, 8.6, 3.0], ex: [0, 2.4, 6.6], tag: 'AI spot', conf: 'confirmed', src: ['gs-omnie', 'gs-omnie-br'],
      desc: 'The colour camera in the pod. It is what OmniSpotCleaning uses to spot dry and wet waste with AI.',
      specs: [['Feature', 'OmniSpotCleaning']],
      build(b) { L.camera(b, { w: 0.45, h: 0.3, d: 0.2, lens: 0.1 }); },
    },
    {
      id: 'lidar-2d', name: '2D LiDAR', group: 'sense', layer: 1, delay: 0.04,
      home: [0, 1.0, 3.6], ex: [0, -0.6, 7.6], tag: '2D scan', conf: 'confirmed', src: ['gs-omnie'],
      desc: 'A flat laser scanner behind the front window of the base. Gausium lists it with the 3D LiDAR; its place here is schematic.',
      specs: [['Coverage', '360° with the 3D LiDAR']],
      build(b) { L.lidar(b, { r: 0.42, h: 0.4 }); },
    },
    {
      id: 'cliff-sensors', name: 'Anti-drop sensors', group: 'sense', layer: 1, delay: 0.1,
      home: [0, 0.3, 3.85], ex: [0, -2.6, 5.2], tag: 'Cliff', conf: 'confirmed', src: ['gs-omnie'],
      desc: 'Downward-looking sensors under the front edge that stop the robot before a step or an edge.',
      specs: [['Listed as', 'Anti-drop']],
      build(b) { for (const x of [-2.4, -0.8, 0.8, 2.4]) b.cyl(0.12, 0.12, 0.12, { m: 'lens', at: [x, 0, 0], seg: 16 }); },
    },
  ],
};
