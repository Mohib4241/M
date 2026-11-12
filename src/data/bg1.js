// PUDU BG1 and BG1 Pro, large ride-on-capable scrubber-dryer robots. Y up, +Z front, 1 unit = 100 mm.
// Both: 1,195 L x 760 W x 1,303 H mm with the squeegee (1,120 x 660 without), about 344 kg.
// Numbers come from PUDU's own BG1 Series page (its two specification tables). The outside follows PUDU's
// product pictures: a tall body with silver side panels and a dark front carrying the maker's badge, a
// camera pod and a white light bar with blue ends; a dark base with red corner bumpers; one side brush at
// the front right; a large drive wheel with an orange hub each side; a squeegee behind; a warning light on
// a pole at the rear; and, on the BG1 Pro only, a 3D LiDAR on a mast on top (the BG1 has a low sensor
// cap there). PUDU says the pictures on its page show the BG1 Pro. Internal positions are a schematic
// reconstruction.
import * as L from '../lib.js';

const PI = Math.PI;
const SILVER = { k: 'silver', id: 'bg1-silver', color: 0xb9bec4, metalness: 0.35, roughness: 0.42 };
const DARK = { k: 'shellDk', id: 'bg1-dark', color: 0x24272c, metalness: 0.25, roughness: 0.5 };
const DARK2 = { k: 'shellDk', id: 'bg1-dark2', color: 0x16181b, metalness: 0.2, roughness: 0.6 };
const ORANGE = { k: 'hubGrey', id: 'bg1-orange', color: 0xd9641c, metalness: 0.1, roughness: 0.6 };
const BUMP = { k: 'red', id: 'bg1-bump', color: 0xd8483e, roughness: 0.6 };

// the body: a base from the floor skirt up to BASE, and the tower from there to TOP
const BASE = 3.0, TOP = 10.7, HW = 3.3, ZF = 4.55, ZB = -5.2;
const TOWER_H = TOP - BASE, TOWER_Y = (TOP + BASE) / 2;

/** The definition of the BG1 (`pro` false) or the BG1 Pro (`pro` true). */
export function bg1Def(pro) {
  const name = pro ? 'BG1 Pro' : 'BG1';
  const SITE = 'pd-bg1', IMG = 'pd-bg1-img';
  const nav = pro ? '3D LiDAR + 3D VSLAM fusion positioning' : 'LiDAR + 3D VSLAM fusion positioning';
  const speed = pro ? '0.2–1.2 m/s' : '0.2–1.0 m/s';
  return {
    id: pro ? 'bg1pro' : 'bg1',
    name: `PUDU ${name}`,
    short: name,
    maker: 'PUDU Robotics',
    blurb: pro
      ? 'AI-native large scrubber-dryer robot: sweeps and scrubs in one pass, a brush that reaches out to the edge, 75 L and 60 L tanks, and a 3D LiDAR for big, busy sites.'
      : 'AI-native large scrubber-dryer robot: sweeps and scrubs in one pass, a brush that reaches out to the edge, and 75 L and 60 L tanks for up to 7.5 hours.',
    accent: pro ? '#5fd0ff' : '#7fe0d0',
    accent2: '#ff8a4c',
    studio: pro ? { accent: '#1f86b8', accent2: '#c2551a' } : { accent: '#168f80', accent2: '#c2551a' },
    hover: 2.4,
    dims: { l: 1195, w: 760, h: 1303 }, dimsSkip: ['side-brush'],
    noDock: 'PUDU offers an optional all-in-one workstation that refills, drains and charges the robot for unattended work; PUDU publishes no size for it, so it is not modelled here.',
    mats: {
      studio: {
        shell: { color: 0xb9bec4, metalness: 0.35, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.4 },
        shellDk: { color: 0x24272c, metalness: 0.2, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.4 },
        trim: { color: 0x131518 },
      },
    },
    stats: [
      ['Size with squeegee', '1,195 × 760 × 1,303 mm'],
      ['Size without squeegee', '1,120 × 660 × 1,303 mm'],
      ['Weight', 'About 344 kg'],
      ['Tanks', '75 L clean · 60 L waste · about 7 L of cleaning agent in two tanks'],
      ['Trash bin', '5 L'],
      ['Cleaning width', '550 mm · 708 mm with side brushes'],
      ['Throughput', 'Covered cleaning up to 2,000 m²/h · spot cleaning up to 6,000 m²/h'],
      ['Battery', '90 Ah on a 48 V platform (equal to 180 Ah at 24 V)'],
      ['Runtime', 'Sweeping and scrubbing: up to 7.5 h'],
      ['Charging', 'About 3 h (AC 180 V or more) · about 4.5 h (AC 180 V or less)'],
      ['Speed', speed],
      ['Path clearance', '85 cm at least'],
      ['Navigation', nav],
      ['Communications', '4G, Wi-Fi, Bluetooth; e-gate and elevator control optional'],
    ],
    notes: [
      pro
        ? 'BG1 Pro against BG1, from PUDU\'s two specification tables: the Pro navigates with a 3D LiDAR (the BG1 with a LiDAR), cruises up to 1.2 m/s (the BG1 up to 1.0 m/s), and its unattended work needs the optional charging dock or workstation. Size, weight, tanks, battery, cleaning width and throughput are the same in both tables.'
        : 'BG1 against BG1 Pro, from PUDU\'s two specification tables: the BG1 navigates with a LiDAR (the Pro with a 3D LiDAR), cruises up to 1.0 m/s (the Pro up to 1.2 m/s), and its unattended work needs the optional workstation. Size, weight, tanks, battery, cleaning width and throughput are the same in both tables.',
      'PUDU names: sweeping and scrubbing in one pass; a scrubbing brush that extends to walls and shelf edges; automatic dosing from two agent tanks; automatic disc-brush attachment and snap-on consumables (PUDU says routine maintenance takes under a minute); sweeping modules that pull back from wet spills; more brush pressure on stubborn stains; AI spot cleaning; a ride-on mode with a platform for driving it by hand; and light and sound alerts.',
      'Options PUDU lists: dust mopping and polishing. Consumables it lists: scrubbing disc brush, rubber blade, scrubbing pad, side brush, sweeping roller brush and trash bin.',
      pro
        ? 'PUDU says the pictures on its page show the BG1 Pro; the outside follows them. The 3D LiDAR stands on a mast on top. Positions inside are schematic, and PUDU does not say how many scrubbing discs there are: two are drawn across the 550 mm width.'
        : 'PUDU says the pictures on its page show the BG1 Pro; its picture of the BG1 shows the same body with a low sensor cap on top in place of the Pro\'s mast, and the model follows that. Positions inside are schematic, and PUDU does not say how many scrubbing discs there are: two are drawn across the 550 mm width.',
    ],
    sources: [SITE, IMG],
    water: ['clean-tank:out', 'agent-tanks:out', 'scrub-deck:nozzle', 'squeegee:in', 'recovery-tank:in'],

    parts: [
      // ───────────── Shell & covers ─────────────
      {
        id: 'top-cover', name: 'Top cover', group: 'shell', layer: 0, delay: 0,
        home: [0, TOP, -0.4], ex: [0, 3.4, 0], tag: 'Lid', conf: 'named', src: [IMG],
        desc: 'The dark lid over the tanks, stepped down toward the front. It lifts away first.',
        specs: [['Height of the robot', '1,303 mm']],
        build(b) {
          b.box(HW * 2 - 0.5, 0.3, ZF - ZB - 1.6, { m: DARK, r: 0.12, at: [0, 0.0, -0.4] });
          b.box(HW * 2 - 1.6, 0.22, 3.2, { m: DARK2, r: 0.1, at: [0, 0.22, -1.6] });
          b.box(HW * 2 - 0.9, 0.5, 1.5, { m: DARK, r: 0.2, at: [0, -0.28, ZF - 0.55], rot: [0.32, 0, 0] });
        },
      },
      {
        id: 'front-shell', name: 'Front panel', group: 'shell', layer: 0, delay: 0.03,
        home: [0, TOWER_Y, ZF], ex: [0, 0.6, 3.6], tag: 'Front', conf: 'named', src: [IMG],
        desc: 'The dark front of the tower, with the maker\'s badge above the camera pod, the light bar across the middle and a lower panel with two vents and a sensor window.',
        specs: [['Path clearance', '85 cm at least']],
        build(b) {
          b.box(HW * 2 - 0.5, TOWER_H - 0.4, 0.3, { m: DARK, r: 0.14, at: [0, 0, -0.1] });
          b.box(1.5, 2.3, 0.14, { m: DARK2, r: 0.2, at: [0, 1.55, 0.1] }); // the badge and camera pod
          b.box(0.36, 0.36, 0.03, { m: 'silver', r: 0.05, at: [0, 2.25, 0.19], e: false }); // the maker's badge
          b.box(HW * 2 - 0.9, 2.3, 0.12, { m: DARK2, r: 0.1, at: [0, -2.35, 0.08] }); // the lower panel
          for (const y of [-1.75, -2.0]) b.box(0.8, 0.13, 0.04, { m: 'silver', r: 0.03, at: [0, y, 0.16], e: false });
        },
      },
      {
        id: 'rear-cover', name: 'Rear panel', group: 'shell', layer: 0, delay: 0.03,
        home: [0, TOWER_Y, ZB], ex: [0, 0.4, -3.6], tag: 'Rear', conf: 'named', src: [IMG],
        desc: 'The dark rear of the tower, behind the tanks. The driver\'s controls sit at its top and the hose to the squeegee runs down it.',
        specs: [['Ride-on mode', 'Yes: a platform folds out for driving by hand']],
        build(b) {
          b.box(HW * 2 - 0.5, TOWER_H - 0.4, 0.3, { m: DARK, r: 0.14, at: [0, 0, 0.1] });
          b.cyl(0.2, 0.2, TOWER_H - 1.4, { m: DARK2, at: [-2.3, -0.4, -0.2], seg: 16 }); // the suction hose
        },
      },
      ...[-1, 1].map((s) => ({
        id: s < 0 ? 'side-cover-r' : 'side-cover-l', name: s < 0 ? 'Right side panel' : 'Left side panel', group: 'shell', layer: 0, delay: 0.05,
        home: [s * (HW - 0.1), TOWER_Y, (ZF + ZB) / 2], ex: [s * 3.4, 0.4, 0], tag: 'Side', conf: 'named', src: [IMG],
        desc: 'A silver side panel in two pieces, the lower one a service door with two latches. A side camera looks out near the top, with a dark window behind it.',
        specs: [['Width of the body', '660 mm without the squeegee']],
        build(b) {
          const len = ZF - ZB - 0.3;
          b.box(0.2, TOWER_H * 0.56, len, { m: 'shell', r: 0.08, at: [0, TOWER_H * 0.2, 0] });
          b.box(0.2, TOWER_H * 0.4, len - 0.5, { m: 'shell', r: 0.08, at: [0, -TOWER_H * 0.29, -0.25] });
          for (const z of [-0.6, 2.4]) b.box(0.06, 0.2, 0.2, { m: DARK2, at: [s * 0.11, -TOWER_H * 0.1, z], e: false }); // latches
          b.box(0.06, 0.5, 1.5, { m: DARK2, r: 0.05, at: [s * 0.1, TOWER_H * 0.3, -2.4], rot: [s * 0.25, 0, 0], e: false }); // the dark window
        },
      })),
      {
        id: 'bumper', name: 'Base skirt and bumpers', group: 'shell', layer: 0, delay: 0.1,
        home: [0, 2.0, 0.1], ex: [0, -1.2, 3.2], tag: 'Base', conf: 'named', src: [IMG],
        desc: 'The dark base round the cleaning deck, with a row of sensor windows across its front and a red bumper on each front corner. Contact sensing here is inferred.',
        specs: [['Length of the body', '1,120 mm without the squeegee']],
        build(b) {
          b.box(HW * 2, 1.7, 10.4, { m: DARK, r: 0.3, at: [0, 0, 0] });
          b.box(HW * 2 - 0.3, 0.9, 1.0, { m: DARK2, r: 0.25, at: [0, -0.5, 5.0] }); // the nose
          for (const x of [-1.3, 1.3]) b.box(0.3, 0.1, 0.04, { m: 'lens', at: [x, -0.35, 5.51], e: false });
          for (const s of [-1, 1]) b.box(0.4, 0.45, 0.7, { m: BUMP, r: 0.1, at: [s * (HW - 0.05), -0.75, 4.85] });
        },
      },

      // ───────────── Controls ─────────────
      {
        id: 'light-bar', name: 'Light bar', group: 'ui', layer: 0, delay: 0.06,
        home: [0, TOWER_Y - 0.55, ZF + 0.12], ex: [0, 0, 4.6], tag: 'Signals', conf: 'named', src: [SITE, IMG],
        desc: 'The white light bar across the front with a blue light at each end. PUDU says light signals and sound cues tell people and vehicles what the robot is about to do.',
        specs: [['Alerts', 'Light and sound']],
        build(b) {
          b.box(4.4, 0.14, 0.08, { m: 'lamp', r: 0.04 });
          for (const s of [-1, 1]) b.box(0.5, 0.22, 0.1, { m: 'led', r: 0.05, at: [s * 2.75, 0.02, -0.02], rot: [0, 0, s * 0.2] });
        },
      },
      {
        id: 'beacon', name: 'Warning light', group: 'ui', layer: 0, delay: 0.04,
        home: [2.6, TOP, -4.4], ex: [2.4, 2.6, -1.4], tag: 'Beacon', conf: 'named', src: [IMG],
        desc: 'The amber warning light on a pole at the rear, the highest point of the robot.',
        specs: [['Top of the robot', '1,303 mm']],
        build(b) {
          b.cyl(0.11, 0.13, 1.75, { m: DARK2, at: [0, 0.95, 0], seg: 14 });
          b.cyl(0.2, 0.2, 0.22, { m: DARK2, at: [0, 1.86, 0], seg: 18 });
          b.cyl(0.18, 0.2, 0.34, { m: { k: 'yellow', id: 'bg1-amber', color: 0xf2a81d, emissive: 0x6a3c00 }, at: [0, 2.14, 0], seg: 18 });
        },
      },
      {
        id: 'steering', name: 'Driver\'s controls', group: 'ui', layer: 0, delay: 0.08,
        home: [0, TOP - 0.2, ZB - 0.25], ex: [0, 2.2, -3.4], tag: 'Ride-on', conf: 'named', src: [SITE, IMG],
        desc: 'The handles and screen at the rear for ride-on mode. PUDU says driving it by hand speeds up mapping and long moves, and lets staff deal with what the robot cannot do alone.',
        specs: [['Ride-on mode', 'Manual control from the platform']],
        build(b) {
          b.box(3.6, 0.9, 0.5, { m: DARK2, r: 0.18, at: [0, 0, 0], rot: [-0.5, 0, 0] });
          b.box(1.9, 0.05, 1.1, { m: 'screen', r: 0.04, at: [0, 0.33, 0.12], rot: [-0.5, 0, 0], e: false });
          for (const s of [-1, 1]) b.cyl(0.12, 0.12, 1.3, { m: 'rubber', rot: [0.5, 0, 0], at: [s * 2.25, -0.15, -0.3], seg: 14 });
        },
      },
      {
        id: 'ride-platform', name: 'Ride-on platform', group: 'ui', layer: 1, delay: 0.1,
        home: [0, 1.35, ZB + 0.2], ex: [0, -0.6, -3.8], tag: 'Platform', conf: 'named', src: [SITE],
        desc: 'The platform PUDU says is deployed for ride-on mode. It is drawn folded up against the rear; its size and hinge are schematic.',
        specs: [['Use', 'Stand on it to drive by hand']],
        build(b) { b.box(4.2, 0.12, 2.0, { m: 'steel', r: 0.04, rot: [1.35, 0, 0], at: [0, 0.9, 0] }); b.box(3.8, 0.02, 1.7, { m: 'rubber', rot: [1.35, 0, 0], at: [0, 0.9, -0.07], e: false }); },
      },
      {
        id: 'e-stop', name: 'Emergency stop', group: 'ui', layer: 0, delay: 0.1,
        home: [-2.2, TOP + 0.2, -3.6], ex: [-2.4, 2.4, -1.6], tag: 'Stop', conf: 'inferred', src: [IMG],
        desc: 'The emergency stop button. A machine of this class has one within the driver\'s reach; PUDU\'s pages do not show where, so its place here is inferred.',
        specs: [['Position', 'Schematic']],
        build(b) { L.eStop(b, { r: 0.3 }); },
      },

      // ───────────── Cleaning head ─────────────
      {
        id: 'side-brush', name: 'Side brush', group: 'clean', layer: 3, delay: 0.1,
        home: [-3.0, 0.5, 5.0], ex: [-3.4, -1.4, 3.2], tag: '708 mm', conf: 'confirmed', src: [SITE, IMG],
        desc: 'The disc brush at the front right corner that sweeps debris from the edge into the path. PUDU gives a cleaning width of 708 mm with side brushes.',
        specs: [['Cleaning width', '708 mm with side brushes']],
        build(b) { b.cyl(0.5, 0.5, 0.3, { m: 'trim', at: [0, 0.4, 0], seg: 24 }); L.discBrush(b, { r: 1.5, hub: 0.45, n: 40, droop: 0.34 }); },
      },
      {
        id: 'roller-brush', name: 'Sweeping roller brush', group: 'clean', layer: 3, delay: 0.04,
        home: [0, 0.5, 3.9], ex: [0, -2.2, 3.4], tag: 'Sweep', conf: 'named', src: [SITE],
        desc: 'The roller that sweeps debris into the trash bin ahead of the scrubbing. PUDU says the sweeping modules pull back when the robot sees a wet spill, so it is not spread about.',
        specs: [['Works with', 'The side brush and the 5 L trash bin']],
        build(b) { L.roller(b, { r: 0.42, len: 5.2, rows: 24 }); },
      },
      {
        id: 'trash-bin', name: 'Trash bin', group: 'air', layer: 2, delay: 0.08,
        home: [0, 1.5, 3.0], ex: [0, -1.0, 5.4], tag: '5 L', conf: 'confirmed', src: [SITE],
        desc: 'The 5 L bin the sweeping roller fills. It snaps in and out for emptying.',
        specs: [['Capacity', '5 L (1.32 US gal)']],
        build(b) { b.box(4.6, 0.9, 1.3, { m: 'tankDi', r: 0.14, ec: 'accent', eo: 0.7 }); b.box(1.4, 0.14, 0.2, { m: 'graphite', r: 0.05, at: [0, 0.1, 0.72] }); },
      },
      {
        id: 'scrub-deck', name: 'Scrubbing disc brushes', group: 'clean', layer: 3, delay: 0.06,
        home: [0, 0.55, 1.2], ex: [0, -2.6, 1.0], tag: '550 mm', conf: 'confirmed', src: [SITE],
        desc: 'The scrubbing deck, 550 mm wide. PUDU says the discs attach themselves, the brush pressure rises on stubborn stains, and the brush can reach out sideways to scrub along walls and shelf edges. The number of discs is not published; two are drawn.',
        specs: [['Scrubbing width', '550 mm'], ['Edge cleaning', 'The brush extends to the edge'], ['Options', 'Scrubbing pad, polishing']],
        anchors: { nozzle: [0, 0.45, 0] },
        build(b) {
          b.box(5.7, 0.3, 3.0, { m: 'steel', r: 0.12, at: [0, 0.45, 0] });
          for (const s of [-1, 1]) b.at([s * 1.38, 0, 0], () => { b.cyl(1.36, 1.36, 0.16, { m: 'dark', at: [0, 0.22, 0], seg: 36 }); b.cyl(1.36, 1.38, 0.34, { m: 'bristle', at: [0, -0.02, 0], seg: 36, e: false }); });
          b.box(0.5, 0.2, 0.9, { m: 'accent', r: 0.06, at: [2.6, 0.7, 0] }); // the slide that carries the deck out to the edge
        },
      },
      {
        id: 'squeegee', name: 'Squeegee', group: 'clean', layer: 3, delay: 0.1,
        home: [0, 0.3, -6.1], ex: [0, -1.6, -3.4], tag: '760 mm', conf: 'confirmed', src: [SITE, IMG],
        desc: 'The rubber-bladed squeegee behind the wheels that gathers the dirty water for the suction. It is the widest part of the robot: 760 mm with it, 660 mm without.',
        specs: [['Width with squeegee', '760 mm'], ['Consumable', 'Rubber blade']],
        anchors: { in: [0, 0.6, 0] },
        build(b) { L.squeegee(b, { w: 7.5 }); },
      },

      // ───────────── Water system ─────────────
      {
        id: 'clean-tank', name: 'Clean water tank', group: 'water', layer: 1, delay: 0.04,
        home: [0, 7.9, 1.6], ex: [0, 3.0, 3.2], tag: '75 L', conf: 'confirmed', src: [SITE],
        desc: 'The 75 L clean water tank. With the optional workstation it is refilled without staff.',
        specs: [['Capacity', '75 L (19.81 US gal)']],
        anchors: { out: [0, -2.3, 0.4] },
        build(b) { L.tank(b, { w: 5.2, h: 4.6, d: 4.4, kind: 'clean', fill: 0.75 }); },
      },
      {
        id: 'recovery-tank', name: 'Waste water tank', group: 'water', layer: 1, delay: 0.06,
        home: [0, 7.7, -2.9], ex: [0, 3.0, -3.4], tag: '60 L', conf: 'confirmed', src: [SITE],
        desc: 'The 60 L waste water tank the squeegee fills. With the optional workstation it is drained without staff, which PUDU says prevents residue and odours.',
        specs: [['Capacity', '60 L (15.85 US gal)']],
        anchors: { in: [0, 2.0, -0.8] },
        build(b) { L.tank(b, { w: 5.2, h: 4.2, d: 3.6, kind: 'dirty', fill: 0.45, cap: false }); },
      },
      {
        id: 'agent-tanks', name: 'Cleaning agent tanks (2)', group: 'water', layer: 2, delay: 0.08,
        home: [2.0, 4.4, 2.6], ex: [4.2, 0.6, 3.0], tag: '7 L', conf: 'confirmed', src: [SITE],
        desc: 'Two tanks holding about 7 L of cleaning agent in total. PUDU says the dosing is accurate to the millilitre and the strength is matched to the floor.',
        specs: [['Capacity', 'About 7 L in total (1.85 US gal)'], ['Dosing', 'Automatic, two agents']],
        anchors: { out: [0, -0.8, 0] },
        build(b) { for (const s of [-1, 1]) { b.box(0.9, 1.5, 1.5, { m: 'tankCl', r: 0.12, at: [s * 0.52, 0, 0], ec: 'accent', eo: 0.6 }); b.cyl(0.14, 0.14, 0.14, { m: s < 0 ? 'lime' : 'accent', at: [s * 0.52, 0.82, 0.3], seg: 14, e: false }); } },
      },
      {
        id: 'vacuum-motor', name: 'Suction motor', group: 'water', layer: 2, delay: 0.1,
        home: [-1.9, 4.6, -3.4], ex: [-4.2, 0.8, -3.6], tag: 'Dry', conf: 'inferred', src: [SITE],
        desc: 'The motor that pulls the dirty water from the squeegee into the waste tank. A scrubber-dryer needs one; PUDU does not publish its rating or place.',
        specs: [['Rating', 'Not published']],
        build(b) { L.turbine(b, { r: 0.6, h: 0.9 }); },
      },

      // ───────────── Power & brain ─────────────
      {
        id: 'battery', name: 'Battery', group: 'power', layer: 2, delay: 0.04,
        home: [0, 3.9, -0.6], ex: [0, -0.4, -5.4], tag: '90 Ah', conf: 'confirmed', src: [SITE],
        desc: 'The battery: 90 Ah on a 48 V platform, which PUDU says equals 180 Ah at 24 V. Up to 7.5 hours of sweeping and scrubbing; about 3 hours to charge on AC of 180 V or more, about 4.5 hours below that.',
        specs: [['Capacity', '90 Ah at 48 V'], ['Runtime', 'Up to 7.5 h'], ['Charging', 'About 3 h or 4.5 h by mains voltage']],
        build(b) { L.battery(b, { w: 4.6, h: 1.5, d: 3.0 }); },
      },
      {
        id: 'charge-contacts', name: 'Workstation port', group: 'power', layer: 2, delay: 0.1,
        home: [0, 2.3, 5.25], ex: [0, 0.6, 6.4], tag: 'Dock', conf: 'inferred', src: [SITE, IMG],
        desc: 'Where the robot meets the workstation to charge, refill and drain. PUDU\'s picture shows it docking nose-first; the place of the contacts here is schematic.',
        specs: [['Workstation', 'Optional: charging, refilling, drainage']],
        build(b) { L.chargePads(b, { w: 1.6 }); },
      },
      {
        id: 'controller', name: 'AI computer', group: 'power', layer: 1, delay: 0.14,
        home: [-1.6, 5.0, 3.2], ex: [-4.4, 1.8, 3.4], tag: 'AI', conf: 'named', src: [SITE],
        desc: 'PUDU says the BG1 Series joins 3D sensing to high-performance AI computing for recognition, obstacle avoidance, mapping and positioning, and for spotting messes to clean on sight.',
        specs: [['Navigation', nav], ['Communications', '4G, Wi-Fi, Bluetooth']],
        build(b) { L.pcb(b, { w: 2.4, d: 2.0 }); },
      },

      // ───────────── Drive & frame ─────────────
      {
        id: 'chassis', name: 'Chassis frame', group: 'drive', layer: 3, delay: 0.12,
        home: [0, 1.25, -0.2], ex: [0, -3.4, -0.4], tag: 'Frame', conf: 'inferred', src: [SITE],
        desc: 'The frame that carries the robot, about 344 kg.',
        specs: [['Weight', 'About 344 kg (758 lb)']],
        build(b) { b.box(5.6, 0.2, 9.6, { m: 'metal', r: 0.05 }); for (const s of [-1, 1]) b.box(0.2, 0.6, 9.6, { m: 'metal', at: [s * 2.7, 0.35, 0] }); },
      },
      ...[-1, 1].map((s) => ({
        id: s < 0 ? 'wheel-l' : 'wheel-r', name: s < 0 ? 'Drive wheel (right)' : 'Drive wheel (left)', // ids follow the race's convention (wheel-l at -x)
        group: 'drive', layer: 3, delay: 0.04,
        home: [s * 2.85, 1.25, -2.2], ex: [s * 4.6, -0.6, -0.4], tag: speed, conf: 'named', src: [SITE, IMG],
        desc: 'One of the two large drive wheels, with the orange hub that shows in PUDU\'s side picture.',
        specs: [['Cruise speed', speed]],
        build(b) { L.tyreWheel(b, { r: 1.25, w: 0.6, side: s, hubM: ORANGE }); },
      })),
      {
        id: 'casters', name: 'Casters', group: 'drive', layer: 3, delay: 0.1,
        home: [0, 0.4, 3.0], ex: [0, -2.0, 6.0], tag: 'Steer', conf: 'named', src: [IMG],
        desc: 'The swivel casters that carry the front. PUDU\'s side picture shows casters under the base; their number and place here are schematic.',
        specs: [['Position', 'Schematic']],
        build(b) { for (const s of [-1, 1]) b.at([s * 2.3, 0, 0], () => L.caster(b, { r: 0.38 })); },
      },

      // ───────────── Sensing ─────────────
      pro ? {
        id: 'lidar-3d', name: '3D LiDAR', group: 'sense', layer: 0, delay: 0.02,
        home: [0, TOP + 0.1, 2.6], ex: [0, 3.2, 2.0], tag: '3D', conf: 'confirmed', src: [SITE, IMG],
        desc: 'The 3D LiDAR on its mast on top of the BG1 Pro. PUDU says 3D LiDAR and 3D VSLAM together keep mapping and positioning steady under high ceilings, at night and where there is interference.',
        specs: [['Navigation', nav]],
        build(b) {
          b.box(0.9, 0.3, 0.9, { m: DARK2, r: 0.1, at: [0, 0.1, 0] });
          b.cyl(0.2, 0.26, 1.5, { m: DARK2, at: [0, 0.95, 0], seg: 18 });
          b.at([0, 1.75, 0], () => L.lidar(b, { r: 0.34, h: 0.5 }));
        },
      } : {
        id: 'lidar-2d', name: 'LiDAR', group: 'sense', layer: 0, delay: 0.02,
        home: [0, TOP + 0.1, 2.6], ex: [0, 3.2, 2.0], tag: 'LiDAR', conf: 'confirmed', src: [SITE, IMG],
        desc: 'The LiDAR of the BG1, under a low cap on top where the Pro carries its mast. PUDU says LiDAR and 3D VSLAM together give the robot its position.',
        specs: [['Navigation', nav]],
        build(b) { b.box(0.9, 0.3, 0.9, { m: DARK2, r: 0.1, at: [0, 0.1, 0] }); b.at([0, 0.3, 0], () => L.lidar(b, { r: 0.3, h: 0.34 })); },
      },
      {
        id: 'vslam-camera', name: 'Front 3D camera', group: 'sense', layer: 0, delay: 0.06,
        home: [0, TOWER_Y + 1.15, ZF + 0.2], ex: [0, 1.4, 4.4], tag: '3D VSLAM', conf: 'named', src: [SITE, IMG],
        desc: 'The camera pod under the badge. PUDU names 3D VSLAM for positioning and a very wide field of view with AI vision for finding messes to clean.',
        specs: [['Positioning', '3D VSLAM'], ['AI', 'Spot cleaning on sight']],
        build(b) { L.camera(b, { w: 0.7, h: 0.8, d: 0.3, lens: 0.2 }); },
      },
      {
        id: 'front-sensor', name: 'Lower front sensor', group: 'sense', layer: 1, delay: 0.08,
        home: [0, TOWER_Y - 3.0, ZF + 0.16], ex: [0, -0.6, 4.6], tag: 'Obstacles', conf: 'inferred', src: [IMG],
        desc: 'The sensor window low on the front panel. PUDU\'s pictures show it; what kind of sensor it holds is not published, so obstacle sensing is inferred.',
        specs: [['Type', 'Not published']],
        build(b) { b.box(1.0, 0.7, 0.16, { m: DARK2, r: 0.1 }); b.cyl(0.18, 0.18, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [0, 0, 0.09], seg: 20, e: false }); },
      },
      {
        id: 'side-cameras', name: 'Side cameras (2)', group: 'sense', layer: 1, delay: 0.1,
        home: [0, TOWER_Y + 2.3, 2.9], ex: [0, 2.6, 4.0], tag: 'Sides', conf: 'named', src: [IMG],
        desc: 'A small camera high on each side panel, as PUDU\'s side picture shows. PUDU does not itemise them; they are taken to be part of the 3D sensing.',
        specs: [['Type', 'Not published']],
        build(b) { for (const s of [-1, 1]) b.at([s * (HW + 0.03), 0, 0], () => { b.box(0.08, 0.42, 0.5, { m: DARK2, r: 0.04 }); b.cyl(0.11, 0.11, 0.05, { m: 'lens', rot: [0, 0, PI / 2], at: [s * 0.05, 0, 0], seg: 16, e: false }); }); },
      },
    ],
  };
}

export default bg1Def(false);
