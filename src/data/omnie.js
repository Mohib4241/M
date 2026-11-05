// Gausium Omnie, roller-brush version. Y up, +Z front, 1 unit = 100 mm (810 L x 700 W x 1,070 H mm).
// Numbers come from Gausium's Omnie specification page and brochure (EN, 2025-11-14) and a distributor
// sheet. The outside is measured from Gausium's front view (src/data/shapes/omnie.js) and follows its pictures: a tall body whose silver front tapers towards a
// round black top, a dark rear, a camera pod and a dome at the front top, a rear handle, and a wide black
// base with the squeegee behind. Shapes and internal positions are a schematic reconstruction.
import * as THREE from 'three';
import * as L from '../lib.js';
import { line, span } from '../loft.js';
import { view, loftFrom, outline, box, pair, hwFn } from '../measured.js';
import shape from './shapes/omnie.js';

const PI = Math.PI;

// ── The measured body ──
// Widths at every height come from Gausium's front view (src/data/shapes/omnie.js). In plan the body is
// a rounded column about as deep as it is wide (Gausium's top view), a little shallower towards the top;
// the black head above it is round. The base below juts out at the front and the back.
const F = view(shape, 'front');
const DOME = [[9.95, 2.5], [10.15, 2.45], [10.27, 2.32], [10.33, 2.12], [10.37, 1.85]];
const hwM = hwFn(F);
const hw = (y) => (y <= 9.85 ? hwM(y) : line([[9.85, hwM(9.85)], ...DOME])(y));
const HEAD = 9.42, BASE = 2.02, ZC = -0.2; // the silver ends at HEAD; the head is round about z = ZC
// above 985 mm the picture shows the top of the head (it was taken from a little above), so the head's
// rounded top edge (DOME, above) comes from Gausium's 3/4 pictures and the 1,070 mm height
const body = loftFrom(F, {
  extra: DOME,
  zF: (y) => (y < BASE ? 3.45 : y < HEAD ? 2.85 - ((y - BASE) / (HEAD - BASE)) * 0.3 : Math.min(2.55, ZC + hw(y))),
  zB: (y) => (y < BASE ? -3.9 : y < HEAD ? -3.25 + ((y - BASE) / (HEAD - BASE)) * 0.3 : Math.max(-2.95, ZC - hw(y))),
  rF: (y) => (y < BASE ? 1.6 : y < HEAD ? 1.95 : hw(y)),
  rB: (y) => (y < BASE ? 1.3 : y < HEAD ? 2.5 : hw(y)),
});
const TOP = body.y1;
const PANEL = outline(F, 'panel', { mirror: true });
const POD = outline(F, 'pod', { mirror: true });
const half = (poly, y) => { const sp = span(poly, y); return sp ? (sp[1] - sp[0]) / 2 : 0; };
const notch = (y) => Math.max(half(PANEL, y), half(POD, y)); // the dark regions cut into the silver front
const zS = line([[BASE, -0.9], [5.0, -1.4], [8.0, -2.2], [HEAD, -2.7]]); // where the silver ends on each side
const FRONT = 0.72; // the front shell covers the middle 72 % of the width seen from the front
const SKIN = { thick: 0.1 };
const M = (n) => box(F, n), P2 = (a, b2) => pair(F, a, b2);

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
      shell:   { color: 0xa4aab0, metalness: 0.45, roughness: 0.34, clearcoat: 0.5, clearcoatRoughness: 0.22 },
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
      id: 'top-cover', name: 'Black head', group: 'shell', layer: 0, delay: 0,
      home: [0, 0, 0], ex: [0, 4.2, 0], tag: 'Round top', conf: 'named', src: ['gs-omnie-img'],
      desc: 'The round black head: the collar over the silver body with a tab on each side, the flat top with its dark panel, and the black camera housing that drops into the U cut in the silver front. Its outline is traced from Gausium\'s front view. It lifts away first.',
      specs: [['Robot height', '1,070 mm']],
      build(b) {
        b.skin(body, body.rowsBand(HEAD, TOP - 0.005, 0, 1), { m: 'trim', ...SKIN, cols: 72 });
        b.profile(body.outline(TOP, 72, 0.02), 0.08, { axis: 'y', m: 'trim', at: [0, TOP + 0.03, 0], bevel: 0.03 });
        // the camera housing in the U of the silver front
        b.skin(body, body.rowsFront(POD, { to: HEAD }), { m: 'trim', ...SKIN, off: 0.06 });
        // the flat dark panel on the top, and the oval light at the front of the collar
        const tp = M('top_panel');
        b.box(tp.w, 0.04, tp.w * 0.45, { m: 'glass', r: 0.02, at: [0, TOP + 0.08, 0.55], e: false });
        const ov = M('top_oval');
        b.on(body.place(ov.cy, { x: 0, off: 0.02 }), () => b.box(ov.w, ov.h, 0.03, { m: 'graphite', r: ov.h / 2.2, e: false }));
        // the tabs on the collar's sides
        const tab = P2('tab_r', 'tab_l');
        for (const sd of [-1, 1]) b.at([sd * tab.cx, tab.cy, ZC + 0.2], () => b.box(tab.w, tab.h, 0.7, { m: 'trim', r: 0.06 }));
        // the square sensors and the bar low on the camera housing, and the small round one under it
        for (const n of ['sq_r', 'sq_l']) { const q = M(n); b.on(body.place(q.cy, { x: q.cx, off: 0.12 }), () => b.box(q.w, q.h, 0.06, { m: 'glass', r: 0.03, e: false })); }
        const bar = M('bar'); b.on(body.place(bar.cy, { x: bar.cx, off: 0.12 }), () => b.box(bar.w, bar.h, 0.05, { m: 'glass', r: 0.03, e: false }));
        const pd = M('pod_dot'); b.on(body.place(pd.cy, { x: pd.cx, off: 0.1 }), () => b.cyl(pd.w / 2, pd.w / 2, 0.05, { m: 'lens', rot: [PI / 2, 0, 0], seg: 16, e: false }));
      },
    },
    {
      id: 'front-shell', name: 'Silver front', group: 'shell', layer: 0, delay: 0.03,
      home: [0, 0, 0], ex: [0, 0.6, 5.0], tag: 'Silver', conf: 'named', src: ['gs-omnie-img'],
      desc: 'The silver front of the body, traced from Gausium\'s front view: it narrows towards the top, a U is cut in it for the black camera housing, and the dark front panel sits in a notch at its foot. It carries the maker\'s mark and name.',
      specs: [['Width', '600 mm at the foot of the body']],
      build(b) {
        for (const sd of [-1, 1]) {
          b.skin(body, body.rowsFn(BASE + 0.02, HEAD, (y) => {
            const tIn = body.tAtX(y, sd * Math.max(notch(y), 0.0005)), tOut = body.tAtX(y, sd * FRONT * hw(y));
            return sd > 0 ? [tIn, tOut] : [tOut, tIn];
          }), { m: 'shell', ...SKIN });
        }
        // the maker's mark and the word under it
        const lg = M('logo');
        b.on(body.place(lg.cy, { x: lg.cx, off: 0.02 }), () => {
          b.box(lg.w * 0.9, lg.h * 0.16, 0.02, { m: 'graphite', at: [-lg.w * 0.05, lg.h * 0.13, 0], rot: [0, 0, 0.8], e: false });
          b.box(lg.w * 0.9, lg.h * 0.16, 0.02, { m: 'graphite', at: [lg.w * 0.05, -lg.h * 0.13, 0], rot: [0, 0, 0.8], e: false });
        });
        const w = M('word');
        b.on(body.place(w.cy, { x: w.cx, off: 0.02 }), () => b.box(w.w, w.h * 0.7, 0.02, { m: 'graphite', e: false }));
        const d = M('dot');
        b.on(body.place(d.cy, { x: d.cx, off: 0.02 }), () => b.cyl(d.w / 2, d.w / 2, 0.04, { m: 'lens', rot: [PI / 2, 0, 0], seg: 14, e: false }));
      },
    },
    {
      id: 'rear-shell', name: 'Rear shell', group: 'shell', layer: 0, delay: 0.03,
      home: [0, 0, 0], ex: [0, 0.6, -5.0], tag: 'Dark grey', conf: 'named', src: ['gs-omnie-img'],
      desc: 'The dark grey rear of the body. Its front edge sweeps forward towards the bottom in an S on each side, as in Gausium\'s pictures; the hose with its yellow ties runs down the left side.',
      specs: [['Waste tank behind it', '24 L']],
      build(b) {
        b.skin(body, body.rowsFn(BASE + 0.02, HEAD, (y) => [body.tAtZ(y, zS(y)), 1 - body.tAtZ(y, zS(y))]), { m: 'shellDk', ...SKIN, cols: 40 });
        for (let i = 0; i < 6; i++) b.on(body.place(6.6 - i * 0.16, { t: 0.5, off: 0.01 }), () => b.box(1.6, 0.06, 0.03, { m: 'dark', e: false })); // vent slits
        // the hose down the left side
        const top = body.place(5.6, { z: -2.0, side: 1, off: 0.1 }), bot = body.place(2.6, { z: -1.75, side: 1, off: 0.1 });
        const dy = top.at[1] - bot.at[1], dz = top.at[2] - bot.at[2];
        b.at([(top.at[0] + bot.at[0]) / 2, (top.at[1] + bot.at[1]) / 2, (top.at[2] + bot.at[2]) / 2], () => b.cyl(0.09, 0.09, Math.hypot(dy, dz), { m: 'rubber', seg: 14 }), [Math.atan2(dz, dy), 0, 0]);
        for (const pl of [top, bot]) b.at(pl.at, () => b.cyl(0.12, 0.12, 0.1, { m: 'yellow', seg: 16 }), [Math.atan2(dz, dy), 0, 0]);
      },
    },
    ...[-1, 1].map((sd) => ({
      id: sd > 0 ? 'side-shell-l' : 'side-shell-r', name: sd > 0 ? 'Left side shell' : 'Right side shell',
      group: 'shell', layer: 0, delay: 0.06,
      home: [0, 0, 0], ex: [sd * 4.6, 0.6, 0], tag: 'Side', conf: 'named', src: ['gs-omnie-img'],
      desc: 'A silver side of the body, from the front corner back to the S-shaped edge of the dark rear, with the sensor bump high at the front.',
      specs: [['Width', '700 mm overall (with the base)']],
      build(b) {
        b.skin(body, body.rowsFn(BASE + 0.02, HEAD, (y) => {
          const tA = body.tAtX(y, sd * FRONT * hw(y)), tB = sd * body.tAtZ(y, zS(y));
          return sd > 0 ? [tA, tB] : [tB, tA];
        }), { m: 'shell', ...SKIN });
        // the sensor bump high on the side (it shows past the outline in the front view)
        const ear = P2('ear_r', 'ear_l');
        b.on(body.place(ear.cy, { z: 0.9, side: sd, off: 0 }), () => {
          b.sph(ear.h / 2, { m: 'shell', seg: 24 }).scale.set(0.9, 1, 0.42);
          b.cyl(0.12, 0.12, 0.08, { m: 'lens', rot: [PI / 2, 0, 0], at: [0, -0.15, ear.h * 0.2], seg: 18, e: false });
        });
      },
    })),
    {
      id: 'front-panel', name: 'Front panel', group: 'shell', layer: 0, delay: 0.06,
      home: [0, 0, 0], ex: [0, 0.3, 5.8], tag: 'Dark panel', conf: 'inferred', src: ['gs-omnie-img'],
      desc: 'The dark panel set into the notch at the foot of the silver front, narrow at the top and wider at the bottom, with rounded top corners and the model name. Traced from Gausium\'s front view. What it covers is not stated in the sources; it sits in front of the clean-water tank.',
      specs: [['Label', 'OMNIE · Autonomous']],
      build(b) {
        b.skin(body, body.rowsFront(PANEL.map(([x, y]) => [x * 1.07 + Math.sign(x) * 0.05, y + 0.08]), { from: BASE + 0.02 }), { m: { k: 'shell', id: 'frame', color: 0x8b9197 }, ...SKIN, off: -0.035 }); // the lighter frame round it
        b.skin(body, body.rowsFront(PANEL, { from: BASE + 0.02 }), { m: { k: 'shellDk', id: 'panel', color: 0x2f3338 }, ...SKIN, off: -0.02 });
        for (const n of ['name', 'sub']) { const t = M(n); b.on(body.place(t.cy, { x: t.cx, off: 0.0 }), () => b.box(t.w, t.h * (n === 'name' ? 0.75 : 0.5), 0.02, { m: 'silver', e: false })); }
      },
    },
    {
      id: 'handle', name: 'Rear handle', group: 'shell', layer: 0, delay: 0.08,
      home: [0, 9.55, -3.15], ex: [0, 2.4, -4.6], tag: 'Push / pull', conf: 'named', src: ['gs-omnie-img'],
      desc: 'The black loop handle that sticks out behind the head, for pushing or pulling the robot by hand.',
      specs: [['Use', 'Moving it by hand']],
      build(b) {
        for (const sd of [-1, 1]) b.box(0.22, 0.24, 1.0, { m: 'trim', r: 0.08, at: [sd * 0.85, 0, -0.2] });
        b.cyl(0.13, 0.13, 1.9, { m: 'trim', rot: [0, 0, PI / 2], at: [0, 0, -0.7], seg: 16 });
      },
    },
    {
      id: 'bumper', name: 'Base and bumper', group: 'shell', layer: 0, delay: 0.1,
      home: [0, 0, 0], ex: [0, -0.5, 5.6], tag: 'Anti-collision', conf: 'confirmed', src: ['gs-omnie-img', 'gs-omnie'],
      desc: 'The wide black base, traced from Gausium\'s front view: the posts at its front corners, the ON/OFF switch, two grooves across the bumper and the lip at its foot. Gausium lists anti-collision sensing.',
      specs: [['Min. pass width', '800 mm']],
      build(b) {
        b.skin(body, body.rowsFn(body.y0, BASE + 0.02, () => [0, 1]), { m: 'trim', ...SKIN, cols: 72 });
        const post = P2('post_r', 'post_l');
        for (const sd of [-1, 1]) b.on(body.place(post.cy, { x: sd * post.cx, off: 0.02 }), () => b.box(post.w, post.h, 0.1, { m: 'dark', r: 0.03 }));
        const oo = M('onoff'); b.on(body.place(oo.cy, { x: oo.cx, off: 0.01 }), () => b.box(oo.w, oo.h, 0.02, { m: 'silver', e: false }));
        for (const n of ['groove_r', 'groove_l']) { const g = M(n); b.on(body.place(g.cy, { x: g.cx, off: -0.01 }), () => b.box(g.w, g.h, 0.04, { m: 'dark', r: g.h / 2.2, e: false })); }
        const lip = M('lip'); b.at([0, lip.cy, 3.35], () => b.box(lip.w, lip.h, 0.9, { m: 'trim', r: 0.08 }));
      },
    },

    // ───────────── Controls ─────────────
    {
      id: 'e-stop', name: 'Emergency stop', group: 'ui', layer: 0, delay: 0.1,
      home: [0, TOP + 0.03, ZC - 1.0], ex: [0, 4.6, 0], tag: 'Stop', conf: 'named', src: ['gs-omnie-img'],
      desc: 'The red stop button in its yellow ring on the top, behind the dark panel.',
      specs: [['Action', 'Cuts drive + brush power']],
      build(b) {
        const e = M('e_stop'), ring = M('e_ring');
        b.cyl(ring.w / 2, ring.w / 2, 0.05, { m: 'yellow', at: [0, 0.025, 0], seg: 32 });
        b.cyl(e.w / 2 * 1.08, e.w / 2 * 1.1, 0.1, { m: 'trim', at: [0, 0.1, 0], seg: 28 });
        b.cyl(e.w / 2, e.w / 2, 0.16, { m: 'red', at: [0, 0.23, 0], seg: 28 });
      },
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
      home: [s * 2.85, 0.55, 3.25], ex: [s * 5.0, -2.6, 4.2], tag: '780 mm', conf: 'confirmed', src: ['gs-omnie-br', 'gs-omnie'],
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
      home: body.place(M('cam_ball').cy, { x: M('cam_ball').cx, off: 0.1 }).at, rot0: body.place(M('cam_ball').cy, { x: M('cam_ball').cx }).rot, ex: [0, 3.6, 3.4], tag: 'OmniLiDAR', conf: 'confirmed', src: ['gs-omnie', 'gs-omnie-img'],
      desc: 'The round lens in the middle of the camera housing, under a small visor. Gausium lists a 3D LiDAR in the sensor system; with the 2D LiDAR it gives 360° coverage for large, busy spaces. Its size and place are measured from Gausium\'s front view; which lens is the 3D LiDAR is our reading.',
      specs: [['Coverage', '360° (OmniLiDAR)']],
      build(b) {
        const c = M('cam_ball'), v = M('pod_visor');
        b.cyl(c.w * 0.62, c.w * 0.66, 0.12, { m: 'trim', rot: [PI / 2, 0, 0], seg: 28 });
        b.sph(c.w / 2, { m: 'lens', seg: 28, at: [0, 0, 0.1] });
        b.box(v.w * 0.55, 0.08, 0.4, { m: 'trim', r: 0.03, at: [0, v.cy - c.cy, 0.1] }); // the little visor over it
      },
    },
    {
      id: 'depth-camera', name: '3D depth camera', group: 'sense', layer: 0, delay: 0.04,
      home: [0, P2('lens_r', 'lens_l').cy, body.place(P2('lens_r', 'lens_l').cy, { x: P2('lens_r', 'lens_l').cx }).at[2] + 0.1], ex: [0, 2.6, 4.4], tag: 'OmniVision', conf: 'confirmed', src: ['gs-omnie', 'gs-omnie-br'],
      desc: 'The two angled lenses either side of the middle lens in the camera housing. Gausium lists a 3D depth camera; the cameras give 360° object detection and a bird\'s-eye view for avoiding obstacles.',
      specs: [['Coverage', '360° camera coverage (OmniVision)']],
      build(b) {
        const l = P2('lens_r', 'lens_l');
        for (const s of [-1, 1]) b.at([s * l.cx, 0, 0], () => { b.box(l.w, l.h, 0.18, { m: 'trim', r: 0.04 }); b.cyl(l.w * 0.3, l.w * 0.3, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [0, 0, 0.1], seg: 20, e: false }); }, [0, s * 0.45, 0]);
      },
    },
    {
      id: 'rgb-camera', name: 'RGB camera', group: 'sense', layer: 0, delay: 0.06,
      home: [0, M('bar').cy, body.place(M('bar').cy, { x: 0 }).at[2] + 0.14], ex: [0, 1.6, 4.4], tag: 'AI spot', conf: 'confirmed', src: ['gs-omnie', 'gs-omnie-br'],
      desc: 'The colour camera behind the dark window low on the camera housing. It is what OmniSpotCleaning uses to spot dry and wet waste with AI. That it sits behind this window is our reading of the pictures.',
      specs: [['Feature', 'OmniSpotCleaning']],
      build(b) { b.cyl(0.07, 0.07, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], seg: 18, e: false }); b.box(0.3, 0.16, 0.04, { m: 'trim', r: 0.03, at: [0, 0, -0.03] }); },
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
