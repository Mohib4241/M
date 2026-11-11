// PUDU MT1 and MT1 Max, robotic sweepers. Y up, +Z front, 1 unit = 100 mm.
// MT1: 840 L x 600 W x 490 H mm. MT1 Max: 840 L x 600 W x 675 H mm, with a 3D LiDAR on a sensor tower
// and a 1.2 m warning light on a pole.
// Numbers come from PUDU's own product pages (specification tables) first, then PUDU's MT1 product
// presentation and user manual, PUDU's launch release for the MT1 Max and retailer listings. The outside
// follows PUDU's product pictures: an all-black body with a rounded front hood carrying a white light bar
// and a vertical camera window, a wide front lip over two long-bristle disc brushes, large grey-hubbed
// wheels behind the middle, a flat deck with a screen and the stop button at the rear, an extendable
// steering handle folded round the deck, and a lime-green latch on each side. Internal positions are a
// schematic reconstruction.
import * as THREE from 'three';
import * as L from '../lib.js';
import { labelTex, hazardTex } from '../kit.js';
import { view, box, pair, halfWidths } from '../measured.js';
import { Loft, line } from '../loft.js';
import shapeMt1 from './shapes/mt1.js';
import shapeMax from './shapes/mt1max.js';

const PI = Math.PI;

// ── Measured from PUDU's pictures (src/data/shapes/mt1.js and mt1max.js) ──
// Each robot's front picture gives the lip (its height and width) and the hood's outline, height by
// height; the MT1's top view gives the plan: a front that rounds in, a body about 540 mm wide and the
// handle frame round the rear. The side profile follows the side pictures.
const WHEEL = { z: -1.7, y: 1.18, r: 1.18 };
// the lip in plan: its front corners round in as the top view shows
const LIP = [[-3.0, 1.0, 0.1], [3.0, 1.0, 0.1], [3.0, 3.3, 0.8], [2.6, 4.0, 0.5], [1.7, 4.2, 0.4], [-1.7, 4.2, 0.4], [-2.6, 4.0, 0.5], [-3.0, 3.3, 0.8]];

/** The measured front of one robot: the lip, the hood outline and where the front details are. */
function front(max) {
  const F = view(max ? shapeMax : shapeMt1, 'front');
  const lip = box(F, 'lip');
  const top = max ? 4.15 : 4.55; // the top of the hood (higher rows show the deck behind it)
  // the hood starts a little above the lip (the first rows still show the lip's top, seen from above)
  const rows = halfWidths(F).filter(([y]) => y >= lip.y1 + (max ? 0.32 : 0.06) && y <= top - 0.08);
  // a moving average over five rows takes out pixel noise
  const sm = rows.map(([y], i) => { let a = 0, n = 0; for (let j = Math.max(0, i - 2); j <= Math.min(rows.length - 1, i + 2); j++) { a += rows[j][1]; n++; } return [y, a / n]; });
  const last = sm[sm.length - 1][1];
  // the body behind the hood is no wider than the outline above the lip (the median of its half-widths)
  const hws = sm.map((r) => r[1]).sort((a, b) => a - b);
  // the hood as a measured loft: the widths from the front picture, a nose that curves back into the
  // deck (PUDU's side pictures) and front corners rounded as in the top view
  const ys = [lip.y1 - 0.02, ...sm.map((r) => r[0]), top - 0.03, top];
  const hws2 = [sm[0][1], ...sm.map((r) => r[1]), last * 0.97, last * 0.86];
  const loft = new Loft({
    y: ys, hw: hws2,
    zF: line([[lip.y1, 3.98], [top - 1.4, 3.98], [top - 0.9, 3.88], [top - 0.5, 3.66], [top - 0.18, 3.3], [top, 2.8]]),
    zB: 1.7,
    rF: line([[lip.y1, 0.95], [top, 1.25]]),
    rB: 0.12,
  });
  return { F, lip, top, deck: top + 0.12, hw: hws[Math.floor(hws.length / 2)], loft };
}

/** The definition of the MT1 (`max` false) or the MT1 Max (`max` true). */
export function mt1Def(max) {
  const site = max ? 'pd-mt1max' : 'pd-mt1', img = max ? 'pd-mt1max-img' : 'pd-mt1-img';
  const src = max ? [site, img, 'pd-mt1max-pr', 'rl-mt1max', 'rs-mt1max', 'as-mt1max'] : [site, img, 'pd-mt1-ppt', 'pd-mt1-manual', 'rs-mt1', 'hh-mt1'];
  const name = max ? 'MT1 Max' : 'MT1';
  const { F, lip, top, deck, hw: HW, loft: HL } = front(max);
  const M = (n) => box(F, n), P2 = (a, b) => pair(F, a, b);
  const LY0 = lip.y0, LY1 = lip.y1, LT = LY1 - LY0;
  // the side profile with the wheel arch, from the lip's foot up to the deck
  const SIDE = [[-4.05, LY0 - 0.25, 0.15], [-3.12, LY0 - 0.25, 0], [-3.12, 1.7, 0.55], [-2.5, 2.58, 0.6], [-0.9, 2.58, 0.6], [-0.28, 1.7, 0.55], [-0.28, LY0 - 0.25, 0],
    [1.85, LY0 - 0.25, 0.08], [1.85, deck - 0.15, 0.08], [-3.7, deck - 0.15, 0.3], [-4.05, deck - 0.6, 0.35]];
  const DECK = [[-HW, -4.15, 0.75], [HW, -4.15, 0.75], [HW, 1.95, 0.2], [-HW, 1.95, 0.2]];
  return {
    id: max ? 'mt1max' : 'mt1',
    name: `PUDU ${name}`,
    short: name,
    maker: 'PUDU Robotics',
    blurb: max
      ? 'AI-powered robotic sweeper with 3D perception for large, complex sites, indoors and out: a 3D LiDAR, a 1.2 m warning light, a 35 L bin and IP54 sealing.'
      : 'AI-powered robotic sweeper for car parks, warehouses and factories: dual disc brushes that take leaves and bottles, a 35 L bin and AI trash recognition.',
    accent: max ? '#ffc233' : '#b5e61d',
    accent2: max ? '#b5e61d' : '#5fd0ff',
    studio: max ? { accent: '#c98f0a', accent2: '#6f9a12' } : { accent: '#6f9a12', accent2: '#1f86b8' },
    hover: 2.0,
    dims: { l: 840, w: 600, h: max ? 675 : 490 }, dimsSkip: max ? ['side-brush-l', 'side-brush-r', 'beacon'] : ['side-brush-l', 'side-brush-r'],
    noDock: 'PUDU offers an Auto-Empty Station (760 × 2,010 × 680 mm, 57.8 kg) as an optional accessory that empties the bin into a site trash can; it is not modelled here.',
    mats: {
      studio: {
        shell:   { color: 0x26292e, metalness: 0.22, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.35 },
        shellDk: { color: 0x1b1e22, metalness: 0.15, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.4 },
        trim:    { color: 0x131518 },
        graphite:{ color: 0x6b737c },
      },
    },
    stats: max ? [
      ['Size', '840 × 600 × 675 mm'],
      ['Weight', '85 kg'],
      ['Debris', '35 L bin'],
      ['Cleaning width', '70 cm with side brush'],
      ['Throughput', 'Cover 2,200 · spot 7,000 m²/h'],
      ['Battery', '60 Ah'],
      ['Runtime', '5–10 h (8 h standard)'],
      ['Charging', 'Under 3.5 h'],
      ['Speed', '0.2–1.2 m/s'],
      ['Navigation', 'VSLAM · markers · 3D LiDAR SLAM'],
    ] : [
      ['Size', '840 × 600 × 490 mm'],
      ['Weight', '65 kg'],
      ['Debris', '35 L bin'],
      ['Cleaning width', '70 cm'],
      ['Throughput', 'Standard 1,800 · spot 6,000 m²/h'],
      ['Battery', '45 Ah (retailer listing)'],
      ['Runtime', '4–8 h'],
      ['Charging', 'Under 3 h'],
      ['Speed', '0.2–1.2 m/s'],
      ['Navigation', 'VSLAM · markers · LiDAR SLAM'],
    ],
    notes: max ? [
      'PUDU\'s page lists 840 × 600 × 675 mm and 85 kg; some retailers list 1,000 × 750 × 850 mm and 95 kg, and one 238 kg. PUDU\'s figures are used.',
      'PUDU names a 3D LiDAR with multi-sensor fusion, a 1.2 m warning light with a safety projection light, IP54 sealing, a water-drop sensor for rain avoidance, a filter that cleans itself, and a dual-chip computer for AI adaptive cleaning and trash recognition.',
      'The launch release claims objects can be detected up to 150 m away. One retailer says it crosses 5 cm bumps and climbs 8°; the user manual gives 20 mm for bumps.',
      'The outside follows PUDU\'s product pictures. The 3D LiDAR sits on a tower on the hood with a three-lens sensor bar under it; the warning light stands on a pole at the rear left. Positions inside are schematic.',
    ] : [
      'PUDU\'s page lists 840 × 600 × 490 mm, 65 kg and a 35 L bin; some listings give 74–75 kg. The battery size is not on PUDU\'s page; 45 Ah is a retailer\'s figure.',
      'PUDU names dual disc brushes with AI trash recognition, high-flow suction with a filter in the debris box, LED light strips that light up dirt in dark corners, an extendable steering handle for moving it by hand, and 3 RGBD sensors, 1 LiDAR, 2 front-view cameras and a fish-eye camera.',
      'The outside follows PUDU\'s product pictures. Positions inside are schematic.',
    ],
    sources: src,
    water: null, // a sweeper: no water system

    parts: [
      // ───────────── Shell & covers ─────────────
      {
        id: 'top-cover', name: 'Top deck', group: 'shell', layer: 0, delay: 0,
        home: [0, deck - 0.15, 0], ex: [0, 4.0, -0.6], tag: 'Deck', conf: 'named', src: [img],
        desc: 'The flat black deck behind the hood, with the status screen and the stop button in its rear half, a small badge window with the maker\'s mark just behind the hood, and a blue light strip at each front corner, as PUDU\'s top view shows.',
        specs: [['Robot height', max ? '675 mm (warning light 1.2 m)' : '490 mm']],
        build(b) {
          b.profile(DECK, 0.3, { axis: 'y', m: 'shell', bevel: 0.1 });
          // the status screen in its bezel, at the rear
          b.box(2.3, 0.1, 1.75, { m: 'trim', r: 0.04, at: [0, 0.18, -1.05] });
          b.box(1.8, 0.04, 1.3, { m: 'screen', r: 0.015, at: [0, 0.24, -1.05], e: false });
          b.box(1.1, 0.04, 0.6, { m: 'green', r: 0.015, at: [0, 0.27, -1.05], e: false }); // the charge display
          // the small badge window in the middle
          b.box(0.55, 0.08, 1.0, { m: 'glass', r: 0.035, at: [0, 0.17, 1.35], e: false });
          b.box(0.3, 0.03, 0.4, { m: 'ledBlue', r: 0.01, at: [0, 0.22, 1.35], e: false });
          // the blue light strips at the front corners
          for (const s of [-1, 1]) b.box(0.12, 0.09, 1.1, { m: 'ledBlue', r: 0.04, at: [s * (HW - 0.12), 0.14, 1.25], e: false });
        },
      },
      {
        id: 'front-shell', name: 'Front hood', group: 'shell', layer: 0, delay: 0.03,
        home: [0, 0, 0], ex: [0, 0.8, 3.6], tag: 'Light bar', conf: 'named', src: [img, site],
        desc: 'The rounded front hood: its width at every height is traced from PUDU\'s front picture, its nose curves back into the deck as PUDU\'s side pictures show, and its front corners round off as in the top view. Across it runs the white light bar (PUDU: LED light strips that show up dirt in dark corners), above two slots; the tall window holds the front-view cameras, and the square windows at the lower corners look out for obstacles.',
        specs: [['Light', 'White LED light bar'], ['Behind it', '2 front-view cameras · RGBD sensors']],
        build(b) {
          b.skin(HL, HL.rowsBand(HL.y0, HL.y1 - 0.004, -0.36, 0.36), { m: 'shell', thick: 0.12, cols: 40 });
          b.profile(HL.outline(HL.y1, 64, 0.02), 0.06, { axis: 'y', m: 'shell', at: [0, HL.y1 + 0.01, 0], bevel: 0.02 }); // its top
          const lt = M('light'), sa = M('slot_a'), sb = M('slot_b'), pod = P2('pod_r', 'pod_l');
          b.on(HL.place(lt.cy, { x: 0, off: 0.03 }), () => b.box(lt.w, lt.h, 0.06, { m: 'lamp', r: lt.h / 2.2, e: false })); // the light bar
          for (const sl of [sa, sb]) b.on(HL.place(sl.cy, { x: 0, off: 0.02 }), () => b.box(sl.w, sl.h * 0.7, 0.04, { m: 'graphite', r: 0.02, e: false })); // the two slots
          for (const sd of [-1, 1]) b.on(HL.place(pod.cy, { x: sd * pod.cx, off: 0.02 }), () => { // the corner pods
            b.box(pod.w + 0.3, pod.h + 0.3, 0.12, { m: 'shellDk', r: 0.07 });
            b.box(pod.w, pod.h, 0.06, { m: 'glass', r: 0.025, at: [0, 0, 0.05], e: false });
          });
        },
      },
      {
        id: 'rear-shell', name: 'Rear panel', group: 'shell', layer: 0, delay: 0.03,
        home: [0, 0, -4.0], ex: [0, 0.6, -4.0], tag: 'Rear', conf: 'inferred', src: [img],
        desc: 'The back of the body, behind the battery, with the rear lamps and a grip. Its details are not shown in the pictures reached.',
        specs: [['Battery behind it', max ? '60 Ah' : '45 Ah (listing)']],
        build(b) {
          b.profile([[-HW, LY0 - 0.25, 0.2], [HW, LY0 - 0.25, 0.2], [HW, deck - 0.5, 0.4], [HW - 0.25, deck - 0.15, 0.3], [-(HW - 0.25), deck - 0.15, 0.3], [-HW, deck - 0.5, 0.4]], 0.38, { axis: 'z', m: 'shell', bevel: 0.12 });
          for (const s of [-1, 1]) b.box(0.9, 0.12, 0.06, { m: 'red', r: 0.02, at: [s * 2.1, deck - 0.8, -0.2], e: false }); // rear lamps
          b.box(1.8, 0.35, 0.12, { m: 'trim', r: 0.05, at: [0, (LY0 + deck) / 2, -0.2] }); // the grip
        },
      },
      ...[-1, 1].map((s) => ({
        id: s > 0 ? 'side-shell-l' : 'side-shell-r', name: s > 0 ? 'Left side panel' : 'Right side panel',
        group: 'shell', layer: 0, delay: 0.06,
        home: [s * (HW - 0.16), 0, 0], ex: [s * 4.4, 0.5, 0], tag: s > 0 ? 'Latch' : 'Charge port', conf: 'named', src: [img],
        desc: `The black side of the body, round the wheel arch, with "PUDU ${name}" moulded at the front, a ${s > 0 ? 'lime-green latch for the bin' : 'lime-green latch and the charging port'}${max ? ' and a side camera window' : ''}.`,
        specs: [['Width', '600 mm overall']],
        build(b) {
          b.profile(SIDE, 0.32, { axis: 'x', m: 'shell', bevel: 0.1, cs: 14 });
          const o = s * 0.17; // the outer face
          b.box(0.06, 0.08, 4.4, { m: 'shellDk', at: [o, deck - 0.55, -1.5], e: false }); // the crease
          b.box(0.08, 0.55, 3.1, { m: 'trim', r: 0.03, at: [o * 0.9, LY0 + 0.05, 0.75], e: false }); // the lower skirt band
          b.box(0.12, 0.42, 0.95, { m: 'lime', r: 0.05, at: [o, deck - 1.2, -2.95] }); // the latch
          if (s < 0) { // the charging port
            b.box(0.08, 0.6, 1.3, { m: 'trim', r: 0.03, at: [o, deck - 1.5, 0.4] });
            b.cyl(0.12, 0.12, 0.05, { m: 'steel', rot: [0, 0, PI / 2], at: [o + s * 0.05, deck - 1.5, 0.75], seg: 16, e: false });
          }
          if (max) b.box(0.14, 0.55, 1.4, { m: 'glass', r: 0.06, at: [o, deck - 0.85, -1.2], rot: [0.15, 0, 0] }); // the side camera window
          const tex = labelTex(`PUDU ${name}`, { color: '#5d646c' });
          b.mesh(new THREE.PlaneGeometry(2.2, 0.42), { m: { k: 'shellDk', id: 'name-' + name, map: tex, alphaTest: 0.35 }, at: [o + s * 0.01, deck - 0.95, 0.9], rot: [0, s * PI / 2, 0], e: false });
        },
      })),
      {
        id: 'bumper', name: 'Front lip and bumper', group: 'shell', layer: 0, delay: 0.1,
        home: [0, (LY0 + LY1) / 2, 0], ex: [0, -0.4, 4.6], tag: 'Contact', conf: 'named', src: [img, max ? site : 'pd-mt1-ppt'],
        desc: 'The wide black lip that juts out over the two disc brushes (600 mm wide; its height and depth traced from PUDU\'s front and top pictures), with the contact strip at its front edge that stops the robot on touch.',
        specs: [['Min. path', '75 cm']],
        build(b) {
          b.profile(LIP, LT, { axis: 'y', m: 'trim', bevel: Math.min(0.26, LT / 2 - 0.01), bs: 5 });
          b.box(3.2, LT * 0.3, 0.12, { m: 'rubber', r: 0.05, at: [0, -LT * 0.2, 4.15], e: false });
          b.box(2.4, LY0 - 0.15, 0.08, { m: 'rubber', at: [0, -LT / 2 - (LY0 - 0.15) / 2, 3.35] }); // the dark flap under it, between the brushes
        },
      },
      {
        id: 'handle', name: 'Extendable steering handle', group: 'ui', layer: 0, delay: 0.08,
        home: [0, deck + 0.18, -2.6], ex: [0, 3.0, -3.4], tag: 'Push', conf: 'confirmed', src: [site, img],
        desc: 'The handle folded round the rear of the deck. It pulls up so staff can steer the robot by hand between areas.',
        specs: [['Use', 'Moving the robot by hand']],
        build(b) {
          for (const s of [-1, 1]) {
            b.cyl(0.08, 0.08, 3.0, { m: 'trim', rot: [PI / 2, 0, 0], at: [s * (HW - 0.2), 0, 0.1], seg: 12 });
            b.box(0.3, 0.3, 0.4, { m: 'shellDk', r: 0.08, at: [s * (HW - 0.2), -0.08, 1.55] }); // the pivot
          }
          b.cyl(0.09, 0.09, 2 * (HW - 0.2), { m: 'trim', rot: [0, 0, PI / 2], at: [0, 0, -1.4], seg: 14 });
          b.cyl(0.11, 0.11, 1.6, { m: 'rubber', rot: [0, 0, PI / 2], at: [0, 0, -1.4], seg: 14, e: false }); // the grip
        },
      },

      // ───────────── Controls ─────────────
      {
        id: 'e-stop', name: 'Emergency stop', group: 'ui', layer: 0, delay: 0.1,
        home: [-1.95, deck + 0.08, -1.05], ex: [-1.8, 4.0, -1.6], tag: 'Stop', conf: 'named', src: [img],
        desc: 'The red stop button beside the status screen on the deck, on the right, where PUDU\'s top view shows it.',
        specs: [['Action', 'Cuts drive + brush power']],
        build(b) { b.cyl(0.22, 0.24, 0.05, { m: 'trim', at: [0, 0.025, 0], seg: 28 }); b.cyl(0.16, 0.16, 0.08, { m: 'red', at: [0, 0.09, 0], seg: 28 }); b.sph(0.16, { m: 'red', cap: PI / 2, at: [0, 0.13, 0], seg: 24 }).scale.set(1, 0.45, 1); },
      },

      // ───────────── Cleaning head ─────────────
      ...[-1, 1].map((s) => ({
        id: s < 0 ? 'side-brush-r' : 'side-brush-l', name: s < 0 ? 'Right disc brush' : 'Left disc brush',
        group: 'clean', layer: 3, delay: 0.1,
        home: [s * 1.72, LY0 - 0.55, 3.3], ex: [s * 3.4, -1.6, 4.0], tag: '70 cm', conf: 'confirmed', src: [site, img],
        desc: 'One of the two disc brushes under the front lip, with long splayed bristles. PUDU says they take larger debris like leaves and bottles and still sweep up fine dust; the two meet in the middle to cover the full width.',
        specs: [['Cleaning width', '70 cm with side brush'], ['Debris', 'Leaves, bottles, fine dust']],
        build(b) {
          b.cyl(0.95, 0.95, 0.3, { m: 'trim', at: [0, 0.38, 0], seg: 40 }); // the brush housing under the lip
          L.discBrush(b, { r: 2.0, hub: 0.6, n: 64, droop: Math.atan2(LY0 - 0.55, 1.45) - 0.1, m: { k: 'bristle', id: 'black-bristle', color: 0x121416 } });
        },
      })),
      {
        id: 'roller-brush', name: 'Main roller brush', group: 'clean', layer: 3, delay: 0.04,
        home: [0, 0.45, 0.4], ex: [0, -2.4, 0.6], tag: 'Sweep', conf: 'named', src: ['rs-mt1', img],
        desc: 'The roller across the middle (red in PUDU\'s side picture) that throws the sweepings back into the bin.',
        specs: [['Works with', 'The disc brushes and the suction']],
        build(b) { L.roller(b, { r: 0.42, len: 4.4, rows: 24, m: { k: 'bristle', id: 'red-bristle', color: 0x5a1519 } }); },
      },
      {
        id: 'trash-bin', name: 'Trash bin', group: 'air', layer: 1, delay: 0.06,
        home: [0, (LY0 + deck) / 2, 0.2], ex: [0, 2.6, 3.4], tag: '35 L', conf: 'confirmed', src: [site, max ? 'pd-mt1-manual' : 'mbs-mt1'],
        desc: 'The 35 L debris box the brushes fill. PUDU says it joins the body seamlessly and releases quickly to be emptied; the optional Auto-Empty Station can empty it without staff.',
        specs: [['Capacity', '35 L (9.25 gal)'], ['Release', 'Quick-release']],
        build(b) {
          b.box(4.6, 2.2, 3.4, { m: 'tankDi', r: 0.25, ec: 'accent', eo: 0.7 });
          b.box(4.4, 0.9, 3.2, { m: 'sludge', r: 0.18, at: [0, -0.6, 0], e: false });
          b.box(1.6, 0.18, 0.3, { m: 'lime', r: 0.07, at: [0, 1.0, -1.75] }); // the lift handle
        },
      },
      {
        id: 'filter', name: max ? 'F9 air filter' : 'Air filter', group: 'air', layer: 1, delay: 0.1,
        home: [0, deck - 0.6, 0.2], ex: [0, 3.4, 0.6], tag: max ? 'F9' : 'Filter', conf: 'confirmed', src: max ? [site, 'pd-mt1max-pr'] : [site, 'hh-mt1'],
        desc: max ? 'Non-woven filter paper on a metal frame, grade F9, on top of the bin. PUDU says it cleans itself automatically, so the robot can keep working without staff.'
          : 'The flat pleated filter on top of the debris box. PUDU says high-flow suction and this filter trap the fine particles in the box, so dust is not blown back out.',
        specs: max ? [['Grade', 'F9'], ['Cleaning', 'Automatic']] : [['Air flow', 'High-flow negative pressure']],
        build(b) {
          b.box(3.6, 0.22, 2.6, { m: 'metal', r: 0.05 });
          for (let i = 0; i < 16; i++) b.box(0.05, 0.18, 2.4, { m: 'fabric', at: [-1.65 + i * 0.22, 0.04, 0], rot: [0, 0, i % 2 ? 0.35 : -0.35], e: false });
        },
      },
      {
        id: 'vacuum-motor', name: 'Suction fan', group: 'air', layer: 2, delay: 0.04,
        home: [1.6, deck - 1.2, -2.3], ex: [3.0, 1.6, -2.4], tag: 'Suction', conf: 'named', src: [site],
        desc: 'The fan that pulls air through the bin and the filter (PUDU: high-flow negative pressure), so fine dust stays inside. Its rating is not published.',
        specs: [['Rating', 'Not published']],
        build(b) { L.turbine(b, { r: 0.5, h: 0.8 }); },
      },

      // ───────────── Power & brain ─────────────
      {
        id: 'battery', name: 'Battery', group: 'power', layer: 2, delay: 0.04,
        home: [0, 1.55, -2.65], ex: [0, -0.4, -3.6], tag: max ? '60 Ah' : '45 Ah', conf: max ? 'confirmed' : 'named', src: max ? [site] : ['rs-mt1'],
        desc: max ? 'The battery pack: 5 to 10 hours of work, 8 hours in standard mode, charged in under 3.5 hours.' : 'The battery pack: 4 to 8 hours of work depending on the cleaning level, charged in under 3 hours. The 45 Ah size is a retailer\'s figure.',
        specs: max ? [['Capacity', '60 Ah'], ['Runtime', '5–10 h (8 h standard)'], ['Charging', 'Under 3.5 h']] : [['Capacity', '45 Ah (listing)'], ['Runtime', '4–8 h'], ['Charging', 'Under 3 h']],
        build(b) { L.battery(b, { w: 3.6, h: 1.1, d: 1.9 }); },
      },
      {
        id: 'charge-contacts', name: 'Charge contacts', group: 'power', layer: 2, delay: 0.1,
        home: [0, 0.55, -4.1], ex: [0, -0.8, -4.6], tag: 'Charging', conf: 'inferred', src: [site],
        desc: 'Where the charger meets the robot. Their position here is schematic.',
        specs: [['Charging', max ? 'Under 3.5 h' : 'Under 3 h']],
        build(b) { L.chargePads(b, { w: 1.4 }); },
      },
      {
        id: 'controller', name: max ? 'Dual-chip controller' : 'Main controller', group: 'power', layer: 1, delay: 0.14,
        home: [-1.3, deck - 1.1, -2.3], ex: [-3.0, 2.8, -2.6], tag: 'AI', conf: max ? 'confirmed' : 'inferred', src: [site],
        desc: max ? 'PUDU\'s dual-chip computer: faster AI with built-in redundancy, for adaptive cleaning, trash recognition and spot cleaning. It also builds the map and plans the route.'
          : 'The computer that builds the map, keeps the robot located, recognises trash with the AI cameras and plans the cleaning route.',
        specs: [['Navigation', max ? 'VSLAM · markers · 3D LiDAR SLAM' : 'VSLAM · markers · LiDAR SLAM']],
        build(b) { L.pcb(b, { w: 2.2, d: 1.8 }); },
      },

      // ───────────── Drive & frame ─────────────
      {
        id: 'chassis', name: 'Chassis frame', group: 'drive', layer: 3, delay: 0.12,
        home: [0, 0.72, -0.4], ex: [0, -1.6, -0.6], tag: 'Frame', conf: 'inferred', src: [site],
        desc: max ? 'The frame that carries the 85 kg robot, sealed to IP54.' : 'The frame that carries the 65 kg robot.',
        specs: max ? [['Weight', '85 kg'], ['Protection', 'IP54']] : [['Weight', '65 kg']],
        build(b) {
          b.box(4.9, 0.16, 7.2, { m: 'metal', r: 0.05 });
          for (const s of [-1, 1]) b.box(0.16, 0.45, 7.2, { m: 'metal', at: [s * (HW - 0.5), 0.25, 0] });
        },
      },
      ...[-1, 1].map((s) => ({
        id: s < 0 ? 'wheel-l' : 'wheel-r', name: s < 0 ? 'Drive wheel (right)' : 'Drive wheel (left)', // ids follow the race's convention (wheel-l at -x)
        group: 'drive', layer: 3, delay: 0.04,
        home: [s * (HW - 0.12), WHEEL.y, WHEEL.z], ex: [s * 3.6, -0.6, -0.4], tag: '1.2 m/s', conf: 'named', src: [img],
        desc: 'One of the two large drive wheels behind the middle, with a grey hub.',
        specs: [['Speed', '0.2–1.2 m/s (adjustable)'], ['Thresholds', '20 mm (user manual)']],
        build(b) { L.tyreWheel(b, { r: WHEEL.r, w: 0.5, side: s }); },
      })),
      {
        id: 'casters', name: 'Front casters', group: 'drive', layer: 3, delay: 0.1,
        home: [0, 0.3, 2.15], ex: [0, -2.0, 2.2], tag: 'Swivel', conf: 'inferred', src: [img],
        desc: 'Swivel casters under the hood, behind the disc brushes. Not shown in the pictures reached.',
        specs: [['Type', 'Swivel']],
        build(b) { for (const s of [-1, 1]) b.at([s * 2.3, 0, 0], () => L.caster(b, { r: 0.3 })); },
      },

      // ───────────── Sensing ─────────────
      ...(max ? [{
        id: 'lidar-3d', name: '3D LiDAR', group: 'sense', layer: 0, delay: 0.02,
        home: [0, (M('lidar').y0 + M('lidar').y1) / 2 - 0.05, 2.45], ex: [0, 3.0, 1.0], tag: '3D', conf: 'confirmed', src: [site, img, 'pd-mt1max-pr'],
        desc: 'The 3D LiDAR on its tower over the hood, with the yellow-and-black ring on top. With the other sensors it maps the site, finds obstacles in real time and works under high ceilings, at night and with heavy interference.',
        specs: [['Detection', 'Up to 150 m (PUDU\'s claim)'], ['Navigation', '3D LiDAR SLAM']],
        build(b) {
          const ly = (M('lidar').y0 + M('lidar').y1) / 2 - 0.05, base = top - ly, neck = M('lidar').y0 - ly;
          b.profile([[-0.95, base, 0.12], [0.95, base, 0.12], [0.72, neck, 0.25], [-0.72, neck, 0.25]], 1.3, { axis: 'z', m: 'shell', bevel: 0.14 }); // the tower
          b.cyl(0.62, 0.66, 0.2, { m: 'trim', at: [0, -0.6, 0], seg: 36 });
          b.cyl(0.6, 0.6, 0.85, { m: 'lens', at: [0, -0.07, 0], seg: 40 }); // the window
          b.cyl(0.62, 0.62, 0.2, { m: 'trim', at: [0, 0.46, 0], seg: 36 });
          b.cyl(0.63, 0.63, 0.14, { m: { k: 'yellow', id: 'hazard', map: hazardTex(), color: 0xffffff }, at: [0, 0.63, 0], seg: 40, e: false });
          b.cyl(0.5, 0.58, 0.06, { m: 'trim', at: [0, 0.72, 0], seg: 36, e: false });
        },
      }, {
        id: 'beacon', name: 'Warning light', group: 'ui', layer: 0, delay: 0.04,
        home: [M('pole').cx, 8.0, -3.55], ex: [2.6, 2.2, -1.6], tag: '1.2 m', conf: 'confirmed', src: [site, img],
        desc: 'The 1.2 m warning light on its pole at the rear. With the safety projection light and the audible and visual alarms it makes the robot easy to see for people and drivers.',
        specs: [['Height', '1.2 m'], ['With it', 'Safety projection light · alarms']],
        build(b) {
          b.cyl(0.22, 0.28, 0.3, { m: 'trim', at: [0, -3.5, 0], seg: 20 }); // the foot
          b.cyl(0.07, 0.07, 6.8, { m: 'metal', at: [0, -0.1, 0], seg: 12 }); // the pole
          b.lathe([[0.18, 3.2], [0.36, 3.25], [0.4, 3.35], [0.4, 3.55], [0.001, 3.56]], { m: 'trim', seg: 32 }); // the base of the lamp
          b.cyl(0.4, 0.4, 0.75, { m: 'lamp', at: [0, 3.95, 0], seg: 32, e: false }); // the lamp
          b.lathe([[0.001, 4.32], [0.4, 4.32], [0.42, 4.42], [0.36, 4.52], [0.001, 4.54]], { m: 'graphite', seg: 32 }); // the cap
        },
      }] : []),
      {
        id: 'lidar-2d', name: 'LiDAR', group: 'sense', layer: 1, delay: 0.04,
        home: [0, LY0 - 0.4, 2.9], ex: [0, -1.4, 4.0], tag: 'SLAM', conf: 'confirmed', src: [site],
        desc: max ? 'The LiDAR low at the front, for chassis-level detection under the lip. Its place here is schematic.'
          : 'The LiDAR for LiDAR SLAM, low at the front under the lip, where PUDU\'s sensor layout covers the front of the chassis. Its exact place here is schematic.',
        specs: [['Use', 'Mapping, positioning and low obstacles']],
        build(b) { L.lidar(b, { r: 0.4, h: 0.38 }); },
      },
      {
        id: 'vslam-camera', name: 'Fish-eye camera', group: 'sense', layer: 0, delay: 0.06,
        home: max ? [0, deck + 0.04, 1.1] : [0, top + 0.06, 2.5], ex: max ? [0, 3.0, 0.4] : [0, 3.0, 1.2], tag: 'VSLAM', conf: max ? 'named' : 'confirmed', src: [site, img],
        desc: max ? 'The fish-eye camera for visual positioning (VSLAM). Its place here is schematic.' : 'The round camera on top of the hood: PUDU\'s fish-eye camera for visual positioning (VSLAM), looking up and around.',
        specs: [['Use', 'Visual SLAM']],
        build(b) {
          const d = max ? { w: 0.32 } : M('dome');
          b.cyl(d.w * 0.6, d.w * 0.68, 0.1, { m: 'trim', seg: 32 });
          b.sph(d.w * 0.42, { m: 'lens', cap: PI / 2, at: [0, 0.05, 0], seg: 28 });
        },
      },
      {
        id: 'depth-cameras', name: 'RGBD sensors (3)', group: 'sense', layer: 1, delay: 0.06,
        home: max ? [0, M('bar').cy, 3.22] : [0, 0, 0], ex: max ? [0, 2.0, 3.2] : [0, 0.6, 3.0], tag: 'Depth', conf: 'confirmed', src: [site, img],
        desc: max ? 'The three-lens sensor bar on the front of the LiDAR tower. PUDU lists 3 RGBD sensors; that they sit in this bar is our reading of the pictures.'
          : 'Depth sensors behind the square windows at the hood\'s lower corners and in the middle. PUDU lists 3 RGBD sensors covering the front of the chassis; their exact places are our reading.',
        specs: [['Count', '3'], ['Use', 'Obstacles in 3D']],
        build(b) {
          if (max) {
            b.box(1.55, 0.48, 0.3, { m: 'trim', r: 0.14 });
            for (const x of [-0.5, 0, 0.5]) {
              b.cyl(0.19, 0.19, 0.06, { m: 'graphite', rot: [PI / 2, 0, 0], at: [x, 0, 0.15], seg: 24, e: false });
              b.cyl(0.11, 0.11, 0.08, { m: 'lens', rot: [PI / 2, 0, 0], at: [x, 0, 0.17], seg: 20, e: false });
            }
          } else {
            const pd = P2('pod_r', 'pod_l');
            for (const x of [-pd.cx, 0, pd.cx]) b.on(HL.place(pd.cy - (x ? 0 : 0.5), { x, off: -0.05 }), () => L.camera(b, { w: 0.42, h: 0.26, d: 0.2, lens: 0.09, ring: false }));
          }
        },
      },
      {
        id: 'rgb-camera', name: 'Front-view cameras (2)', group: 'sense', layer: 1, delay: 0.08,
        home: HL.place(M('pill').cy, { x: 0, off: 0.04 }).at, rot0: HL.place(M('pill').cy, { x: 0 }).rot, ex: [0, 1.4, 3.6], tag: 'AI', conf: 'confirmed', src: [site, img],
        desc: 'The two front-view cameras in the tall window at the middle of the hood. They feed the AI that recognises trash in real time and learns new kinds over updates.',
        specs: [['Count', '2'], ['Use', 'AI trash recognition']],
        build(b) {
          const pl = M('pill');
          b.box(pl.w, pl.h, 0.08, { m: 'glass', r: Math.min(0.035, pl.w / 3) });
          for (const y of [pl.h * 0.28, -pl.h * 0.22]) b.cyl(0.09, 0.09, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [0, y, 0.05], seg: 20, e: false });
        },
      },
      {
        id: 'line-laser', name: max ? 'Line lasers (3)' : 'Line laser', group: 'sense', layer: 1, delay: 0.1,
        home: [0, LY0 + 0.18, 4.17], ex: [0, -0.4, 3.6], tag: 'Low', conf: 'named', src: max ? ['rl-mt1max'] : ['pd-mt1-ppt'],
        desc: 'Lasers that draw a line on the floor ahead to find low obstacles and drops. Their places here are schematic.',
        specs: [['Count', max ? '3' : 'Shown on PUDU\'s diagram']],
        build(b) {
          for (const x of max ? [-1.0, 0, 1.0] : [0]) {
            b.box(0.5, 0.14, 0.12, { m: 'trim', r: 0.03, at: [x, 0, 0] });
            b.box(0.36, 0.04, 0.04, { m: 'red', at: [x, 0, 0.05], e: false }); // the laser window
          }
        },
      },
    ],
  };
}

export default mt1Def(false);
