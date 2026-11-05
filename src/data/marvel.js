// Gausium Marvel. Y up, +Z front, 1 unit = 100 mm (1,108 L x 699 W x 1,168 H mm).
// Numbers come from Gausium's Marvel specification page and brochure (EN, 2026-09-22). The outside
// follows Gausium's product pictures (front, side and top views): a tall tower with rounded silver sides
// that slant back to a black rear body, a black carbon-weave front panel with the maker's mark, a black
// visor at the top with a sensor dome and two white light strips, a flat lid with the emergency stop, a
// push handle at the rear, a drain hose with a yellow cap on the left, a wide silver base, two large side
// brushes at the front corners and a blue dust mop across the front. Internal positions are a schematic
// reconstruction.
import * as L from '../lib.js';
import { carbonTex } from '../kit.js';
import { line, span, clipZ } from '../loft.js';
import { view, loftFrom, outline, box, pair } from '../measured.js';
import shape from './shapes/marvel.js';

const PI = Math.PI;

// ── The measured body ──
// Widths at every height come from Gausium's front view (src/data/shapes/marvel.js); the front and back
// lines from the side and top pictures; the corner rounding from the top view and the front view's
// shading. The base (up to 2.05) juts out front and back; the tower above it has a vertical front with
// the visor bulging over it at the top, and rounds over into the lid.
const F = view(shape, 'front');
const body = loftFrom(F, {
  zF: line([[1.2, 4.72], [2.02, 4.72], [2.16, 3.78], [9.2, 3.78], [9.55, 4.02], [10.7, 4.02], [11.05, 3.82], [11.22, 3.45], [11.32, 2.9]]),
  zB: line([[1.2, -5.0], [2.02, -5.0], [2.16, -4.58], [10.9, -4.58], [11.15, -4.45], [11.32, -4.2]]),
  rF: line([[1.2, 1.3], [2.02, 1.3], [2.16, 1.05], [9.0, 1.05], [9.6, 1.4], [11.32, 1.4]]),
  rB: line([[1.2, 0.9], [2.02, 0.9], [2.16, 0.7], [11.32, 0.7]]),
});
const TOP = body.y1, BASE = 2.1;
const PANEL = outline(F, 'panel', { mirror: true });
const VISOR = outline(F, 'visor', { mirror: true });
const RECESS = outline(F, 'recess', { mirror: true });
const ZP = 1.15; // where the silver pillar ends on each side
const ZD = -4.3, YD0 = BASE, YD1 = 4.5; // the black side panels' lower edge runs from (ZP, YD0) up to (ZD, YD1)
const zDiag = (y) => ZP + ((y - YD0) / (YD1 - YD0)) * (ZD - ZP);
const half = (poly, y) => { const s = span(poly, y); return s ? (s[1] - s[0]) / 2 : null; };
const recessTop = Math.max(...RECESS.map((p) => p[1])), panelBot = Math.min(...PANEL.map((p) => p[1]));
// the inner edge of the silver pillars: the edge of the dark region on the front at that height
function xIn(y) {
  const v = half(VISOR, y) ?? half(PANEL, y) ?? half(RECESS, y);
  if (v !== null) return v;
  const a = half(RECESS, recessTop - 1e-3), b = half(PANEL, panelBot + 1e-3);
  return a + ((y - recessTop) / (panelBot - recessTop)) * (b - a);
}
const sideT = (y, z) => body.tAtZ(y, z);
const SKIN = { thick: 0.1 };
const M = (n) => box(F, n), P2 = (a, b2) => pair(F, a, b2);

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
      shell:   { color: 0x737a81, metalness: 0.6, roughness: 0.36, clearcoat: 0.35, clearcoatRoughness: 0.25 },
      shellDk: { color: 0x1d2024, metalness: 0.15, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.2 },
      trim:    { color: 0x0b0c0e, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.1 },
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
    'The outside follows Gausium\'s product pictures. The sources reached name only the 3D LiDAR among its sensors; the others here are inferred. The brush types, the hopper and the squeegee are standard for a sweeper-scrubber but not itemised. No dock or workstation is listed.',
  ],
  sources: ['gs-marvel-pics', 'gs-marvel-img', 'gs-marvel', 'gs-marvel-br'],
  water: ['clean-tank:out', 'pump:a', 'scrub-deck:nozzle', 'squeegee:in', 'recovery-tank:in'],

  parts: [
    // ───────────── Shell & covers ─────────────
    {
      id: 'top-cover', name: 'Visor and lid', group: 'shell', layer: 0, delay: 0,
      home: [0, 0, 0], ex: [0, 4.2, 0.6], tag: 'Lid', conf: 'named', src: ['gs-marvel-pics'],
      desc: 'The black visor that wraps over the front of the top, with the two white light strips and the sensor dome, and the flat lid behind it. Its outline is traced from Gausium\'s front view. It lifts away first.',
      specs: [['Robot height', '1,168 mm']],
      build(b) {
        b.skin(body, body.rowsFront(VISOR, { from: 8.9 }), { m: 'trim', ...SKIN, off: 0.015 });
        const lid = body.outline(TOP, 72, 0.02);
        b.profile(clipZ(lid, 0.9, 'above').map(([x, z]) => [x, z]), 0.1, { axis: 'y', m: 'trim', at: [0, TOP + 0.04, 0], bevel: 0.03 });
        b.profile(clipZ(lid, 0.9, 'below').map(([x, z]) => [x, z]), 0.1, { axis: 'y', m: 'graphite', at: [0, TOP + 0.04, 0], bevel: 0.03 });
        b.box(2.4, 0.03, 0.05, { m: 'trim', at: [0, TOP + 0.1, 0.9], e: false }); // the seam between visor and lid
        // the white light strips on the visor's top corners
        const led = P2('led_r', 'led_l');
        for (const sd of [-1, 1]) b.on(body.place(led.cy, { x: sd * led.cx, off: 0.03 }), () => b.box(led.w, led.h, 0.05, { m: 'lamp', r: 0.02, e: false }));
        // the sensors along the visor's lower edge
        const sa = M('sensor_a'), sb = M('sensor_b'), pill = M('pill');
        b.on(body.place(sa.cy, { x: sa.cx, off: 0.03 }), () => b.cyl(sa.w / 2, sa.w / 2, 0.05, { m: 'lens', rot: [PI / 2, 0, 0], seg: 24, e: false }));
        b.on(body.place(sb.cy, { x: sb.cx, off: 0.03 }), () => { b.cyl(sb.w / 2, sb.w / 2, 0.04, { m: 'graphite', rot: [PI / 2, 0, 0], seg: 24, e: false }); b.cyl(sb.w / 4, sb.w / 4, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], seg: 18, e: false }); });
        b.on(body.place(pill.cy, { x: pill.cx, off: 0.03 }), () => b.box(pill.w, pill.h, 0.05, { m: 'glass', r: pill.h / 2.2, e: false }));
      },
    },
    {
      id: 'front-shell', name: 'Front panel', group: 'shell', layer: 0, delay: 0.03,
      home: [0, 0, 0], ex: [0, 0.4, 6.0], tag: 'Carbon face', conf: 'named', src: ['gs-marvel-pics'],
      desc: 'The black carbon-weave front panel between the two silver pillars, traced from Gausium\'s front view: wider at the top than at the bottom, with rounded lower corners. Its upper band holds the camera slot; the maker\'s mark sits low in the middle.',
      specs: [['Panel', 'Carbon weave'], ['Width', '420 mm at the top']],
      build(b) {
        b.skin(body, body.rowsFront(PANEL), { m: { k: 'trim', id: 'carbon', map: carbonTex(), color: 0x6a6e74, roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.35, envMapIntensity: 0.35 }, ...SKIN, off: 0.025 });
        const seam = M('seam');
        b.on(body.place(seam.cy, { x: 0, off: 0.035 }), () => b.box(seam.w, 0.025, 0.02, { m: 'trim', e: false }));
        const slot = M('slot');
        b.on(body.place(slot.cy, { x: slot.cx, off: 0.035 }), () => {
          b.box(slot.w, slot.h, 0.05, { m: 'glass', r: slot.h / 2.2, e: false });
          b.cyl(0.08, 0.08, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [-0.35, 0, 0.01], seg: 20, e: false });
          b.box(0.55, 0.12, 0.05, { m: 'graphite', r: 0.02, at: [0.35, 0, 0.01], e: false });
        });
        for (const n of ['hole_r', 'hole_l']) { const h = M(n); b.on(body.place(h.cy, { x: h.cx, off: 0.03 }), () => b.cyl(h.w / 2, h.w / 2, 0.02, { m: 'trim', rot: [PI / 2, 0, 0], seg: 10, e: false })); }
        // the maker's mark: a lightning bolt in two strokes
        const lg = M('logo');
        b.on(body.place(lg.cy, { x: lg.cx, off: 0.04 }), () => {
          b.box(lg.w * 0.95, lg.h * 0.17, 0.02, { m: 'silver', at: [-lg.w * 0.06, lg.h * 0.14, 0], rot: [0, 0, 0.72], e: false });
          b.box(lg.w * 0.95, lg.h * 0.17, 0.02, { m: 'silver', at: [lg.w * 0.06, -lg.h * 0.14, 0], rot: [0, 0, 0.72], e: false });
          b.box(lg.w * 0.42, lg.h * 0.15, 0.02, { m: 'silver', at: [lg.w * 0.12, lg.h * 0.02, 0], e: false });
        });
      },
    },
    {
      id: 'rear-shell', name: 'Rear body and handles', group: 'shell', layer: 0, delay: 0.03,
      home: [0, 0, 0], ex: [0, 0.6, -6.0], tag: 'Handles', conf: 'named', src: ['gs-marvel-pics'],
      desc: 'The black rear body: the panels behind the silver pillars, whose lower edge slants down towards the front, the gunmetal housing under that edge over the rear wheels, and the rear face. The two grips at the top corners stick out past the sides (they show in Gausium\'s front view); the drain hose with its yellow cap runs down the right side, and a latch pocket with a yellow lever sits on the left.',
      specs: [['Waste tank behind it', '70 L']],
      build(b) {
        b.skin(body, body.rowsFn(YD1, TOP - 0.005, (y) => [sideT(y, ZP), 1 - sideT(y, ZP)]), { m: 'shellDk', ...SKIN });
        b.skin(body, body.rowsFn(YD0, YD1, (y) => [sideT(y, ZP), sideT(y, zDiag(y))]), { m: 'shellDk', ...SKIN });
        b.skin(body, body.rowsFn(YD0, YD1, (y) => [1 - sideT(y, zDiag(y)), 1 - sideT(y, ZP)]), { m: 'shellDk', ...SKIN });
        b.skin(body, body.rowsFn(BASE + 0.06, YD1, (y) => [sideT(y, zDiag(y)), 1 - sideT(y, zDiag(y))]), { m: { k: 'shell', id: 'gunmetal', color: 0x585e65, metalness: 0.45 }, ...SKIN });
        b.box(0.05, 0.05, 4.4, { m: 'trim', at: [3.05, 6.6, -2.2], e: false }); // the seam between the upper and lower side panels
        b.box(0.05, 0.05, 4.4, { m: 'trim', at: [-3.05, 6.6, -2.2], e: false });
        // the grips at the rear top corners
        const ear = P2('ear_r', 'ear_l');
        for (const sd of [-1, 1]) {
          b.at([sd * (ear.cx - 0.05), ear.cy, -4.95], () => {
            b.box(0.42, ear.h, 1.25, { m: 'trim', r: 0.12, rot: [0, sd * 0.35, 0] });
            b.box(0.06, ear.h * 0.45, 0.6, { m: 'glass', r: 0.02, at: [sd * 0.2, 0, 0.1], rot: [0, sd * 0.35, 0], e: false });
          });
        }
        b.cyl(0.11, 0.11, 5.2, { m: 'trim', rot: [0, 0, PI / 2], at: [0, ear.cy + 0.15, -5.3], seg: 16 }); // the bar between them
        b.cyl(0.14, 0.14, 0.9, { m: 'rubber', rot: [0, 0, PI / 2], at: [0, ear.cy + 0.15, -5.3], seg: 16, e: false });
        // the drain hose down the right side, from its yellow cap near the pillar to the rear bottom
        const top = body.place(8.6, { z: -0.1, side: -1, off: 0.1 }), bot = body.place(4.3, { z: -4.0, side: -1, off: 0.1 });
        const dz = top.at[2] - bot.at[2], dy = top.at[1] - bot.at[1];
        b.at([(top.at[0] + bot.at[0]) / 2, (top.at[1] + bot.at[1]) / 2, (top.at[2] + bot.at[2]) / 2], () => b.cyl(0.1, 0.1, Math.hypot(dz, dy), { m: 'rubber', seg: 14 }), [Math.atan2(dz, dy), 0, 0]);
        b.at(top.at, () => b.cyl(0.15, 0.15, 0.36, { m: 'yellow', seg: 18 }), [Math.atan2(dz, dy), 0, 0]);
        // the latch pocket on the left side
        b.on(body.place(6.5, { z: -2.4, side: 1, off: 0 }), () => { b.box(0.5, 0.75, 0.05, { m: 'trim', r: 0.04 }); b.box(0.22, 0.42, 0.08, { m: 'yellow', r: 0.06, at: [0, -0.05, 0.03] }); });
        // a door with a yellow tag in the housing, over each rear wheel
        for (const sd of [-1, 1]) b.on(body.place(3.0, { z: -3.0, side: sd, off: 0.02 }), () => { b.box(1.1, 1.3, 0.03, { m: 'graphite', r: 0.03, e: false }); b.box(0.1, 0.22, 0.04, { m: 'yellow', at: [-0.4, 0.3, 0.02], e: false }); });
      },
    },
    ...[-1, 1].map((sd) => ({
      id: sd > 0 ? 'side-shell-l' : 'side-shell-r', name: sd > 0 ? 'Left silver pillar' : 'Right silver pillar',
      group: 'shell', layer: 0, delay: 0.06,
      home: [0, 0, 0], ex: [sd * 4.4, 0.6, 0.4], tag: 'Silver side', conf: 'named', src: ['gs-marvel-pics'],
      desc: 'A silver pillar: it frames the black front panel, wraps round the front corner and ends a quarter of the way back along the side, from the base up over the shoulder. Its inner edge follows the dark front regions traced in Gausium\'s front view; the body narrows from 708 mm at the bottom to the shoulders.',
      specs: [['Width', '699 mm overall']],
      build(b) {
        b.skin(body, body.rowsFn(BASE + 0.06, TOP - 0.005, (y) => {
          const tIn = body.tAtX(y, sd * xIn(y)), tOut = sideT(y, ZP);
          return sd > 0 ? [tIn, tOut] : [-tOut, tIn];
        }), { m: 'shell', ...SKIN });
        // the recessed panel on its corner, and the screws down it
        const spn = P2('side_panel_r', 'side_panel_l');
        b.on(body.place(spn.cy, { x: sd * spn.cx, off: 0.01 }), () => { b.box(spn.w + 0.04, spn.h + 0.04, 0.02, { m: 'trim', r: 0.07, e: false }); b.box(spn.w, spn.h, 0.035, { m: { k: 'shell', id: 'pale', color: 0x9aa1a8 }, r: 0.06, e: false }); });
        for (const y of [3.2, 5.0, 7.2, 9.0]) b.on(body.place(y, { z: ZP + 0.25, side: sd, off: 0.01 }), () => b.cyl(0.04, 0.04, 0.03, { m: 'trim', rot: [PI / 2, 0, 0], seg: 10, e: false }));
        // the small yellow marker low on the flare
        const mk = P2('marker_r', 'marker_l');
        b.on(body.place(mk.cy, { x: sd * mk.cx, off: 0.01 }), () => b.box(mk.w, mk.h, 0.03, { m: 'yellow', e: false }));
      },
    })),
    {
      id: 'bumper', name: 'Base and lower front', group: 'shell', layer: 0, delay: 0.1,
      home: [0, 0, 0], ex: [0, -0.5, 5.6], tag: 'Contact', conf: 'named', src: ['gs-marvel-pics'],
      desc: 'The silver base the tower stands on, jutting out at the front, with the grey corner pads and the bar with two yellow sensor marks across its front; above it the dark recess and the silver band under the carbon panel. All traced from Gausium\'s front view. Contact sensing here is inferred.',
      specs: [['Min. pass width', '850 mm']],
      build(b) {
        b.skin(body, body.rowsFn(body.y0, BASE + 0.06, () => [0, 1]), { m: 'shell', ...SKIN, cols: 72 });
        b.skin(body, body.rowsFn(recessTop - 0.02, panelBot + 0.02, (y) => [-body.tAtX(y, xIn(y)), body.tAtX(y, xIn(y))]), { m: 'shell', ...SKIN });
        b.skin(body, body.rowsFront(RECESS, { from: BASE + 0.06 }), { m: { k: 'shellDk', id: 'recess', color: 0x34383d }, ...SKIN, off: -0.03 });
        const pad = P2('pad_r', 'pad_l');
        for (const sd of [-1, 1]) b.at([sd * pad.cx, pad.cy, 3.98], () => b.box(pad.w, pad.h, 0.55, { m: 'graphite', r: 0.08 }));
        const tr = M('tray');
        b.at([tr.cx, tr.cy, 4.62], () => b.box(tr.w, tr.h, 0.25, { m: 'graphite', r: 0.06 }));
        for (const n of ['dot_r', 'dot_l']) { const d = M(n); b.at([d.cx, d.cy, 4.76], () => b.cyl(d.w / 2, d.w / 2, 0.04, { m: 'yellow', rot: [PI / 2, 0, 0], seg: 14, e: false })); }
        // the corner guide rollers out front of the base
        const kn = P2('knob_r', 'knob_l');
        for (const sd of [-1, 1]) b.at([sd * kn.cx, kn.cy - 0.05, 4.2], () => { b.cyl(kn.w / 2, kn.w / 2, kn.h * 0.8, { m: 'trim', seg: 18 }); b.cyl(kn.w / 3, kn.w / 3, kn.h * 0.9, { m: 'steel', seg: 12, e: false }); });
      },
    },

    // ───────────── Controls ─────────────
    {
      id: 'e-stop', name: 'Emergency stop', group: 'ui', layer: 0, delay: 0.1,
      home: [0, TOP + 0.09, 1.5], ex: [0, 4.6, 0.4], tag: 'Stop', conf: 'named', src: ['gs-marvel-pics'],
      desc: 'The red stop button on the lid, just behind the visor (38 mm tall in Gausium\'s front view).',
      specs: [['Action', 'Cuts drive + brush power']],
      build(b) {
        const e = M('e_stop'), r = e.w / 2, h = e.y1 - (TOP + 0.09);
        b.cyl(r * 1.1, r * 1.2, h * 0.3, { m: 'trim', at: [0, h * 0.15, 0], seg: 28 });
        b.cyl(r, r * 0.98, h * 0.55, { m: 'red', at: [0, h * 0.58, 0], seg: 28 });
        b.sph(r * 0.98, { m: 'red', cap: PI / 2, at: [0, h * 0.85, 0], s: 1, seg: 24 }).scale.set(1, 0.3, 1);
      },
    },

    // ───────────── Cleaning head ─────────────
    ...[-1, 1].map((s) => ({
      id: s < 0 ? 'side-brush-r' : 'side-brush-l', name: s < 0 ? 'Right side brush' : 'Left side brush',
      group: 'clean', layer: 3, delay: 0.1,
      home: [s * 2.72, 0.95, 4.35], ex: [s * 4.0, -2.0, 4.0], tag: '840 mm', conf: 'confirmed', src: ['gs-marvel-br', 'gs-marvel-pics'],
      desc: 'One of the two large side brushes at the front corners (Gausium\'s patented dual side-brush system). They sweep fine dust and large debris into the path in one pass.',
      specs: [['Sweeping width', '840 mm']],
      build(b) { L.discBrush(b, { r: 1.3, hub: 0.45, n: 40, droop: 0.42 }); },
    })),
    {
      id: 'main-broom', name: 'Main sweeping brush', group: 'clean', layer: 3, delay: 0.04,
      home: [0, 0.45, 3.3], ex: [0, -3.0, 3.4], tag: 'Sweep', conf: 'inferred', src: ['gs-marvel-br'],
      desc: 'The brush that throws the swept debris back into the hopper. Its type is not itemised; it is shown as a roller.',
      specs: [['Sweeping', 'At the same time as scrubbing']],
      build(b) { L.roller(b, { r: 0.45, len: 5.4, rows: 24 }); },
    },
    {
      id: 'hopper', name: 'Debris hopper', group: 'air', layer: 3, delay: 0.12,
      home: [0, 0.8, 2.1], ex: [0, -2.2, 1.6], tag: 'Debris', conf: 'inferred', src: ['gs-marvel-br'],
      desc: 'The bin the swept debris is thrown into. Standard in a sweeper; its size is not published.',
      specs: [['Capacity', 'Not published']],
      build(b) { b.box(5.2, 0.9, 1.4, { m: 'dark', r: 0.12 }); b.box(1.0, 0.12, 0.1, { m: 'accent', at: [0, 0.2, 0.72], e: false }); },
    },
    {
      id: 'scrub-deck', name: 'Scrub deck', group: 'clean', layer: 3, delay: 0,
      home: [0, 0.6, 0.4], ex: [0, -3.0, 0.6], tag: '600 mm', conf: 'confirmed', src: ['gs-marvel', 'gs-marvel-br'],
      desc: 'The scrubbing head, 600 mm wide, that scrubs while the brushes ahead sweep. The brush type is not itemised.',
      specs: [['Scrubbing width', '600 mm'], ['Max. scrubbing', '3,024 m²/h (theoretical)']],
      anchors: { nozzle: [0, 0.3, 0.4] },
      build(b) {
        b.box(6.0, 0.6, 1.8, { m: 'dark', r: 0.2 });
        for (const x of [-1.5, 1.5]) b.cyl(1.35, 1.35, 0.18, { m: 'bristle', at: [x, -0.38, 0], seg: 40 });
        b.box(5.4, 0.08, 0.1, { m: 'accent', at: [0, 0.32, 0.8], e: false });
      },
    },
    {
      id: 'dust-mop', name: 'Dust mop', group: 'clean', layer: 3, delay: 0.08,
      home: [0, 0.3, 5.05], ex: [0, -2.4, 4.4], tag: '760 mm', conf: 'named', src: ['gs-marvel', 'gs-marvel-pics'],
      desc: 'The blue dust-mopping pad across the front, 760 mm wide.',
      specs: [['Dust mopping width', '760 mm'], ['Max. dust mopping', '3,830 m²/h (theoretical)']],
      build(b) {
        b.box(7.6, 0.18, 0.7, { m: { k: 'fabric', id: 'mop-blue', color: 0x2f67c8 }, r: 0.06 });
        b.box(7.2, 0.12, 0.4, { m: 'metal', r: 0.04, at: [0, 0.15, -0.05], e: false });
      },
    },
    {
      id: 'squeegee', name: 'Squeegee', group: 'clean', layer: 3, delay: 0.1,
      home: [0, 0.25, -5.3], ex: [0, -2.4, -3.6], tag: 'Rear', conf: 'inferred', src: ['gs-marvel-br'],
      desc: 'The blade at the back that wipes up the dirty water after scrubbing. Standard in a scrubber; not itemised.',
      specs: [['Picks up into', '70 L waste tank']],
      anchors: { in: [0, 0.6, 0] },
      build(b) { L.squeegee(b, { w: 6.6 }); },
    },

    // ───────────── Water system ─────────────
    {
      id: 'clean-tank', name: 'Clean water tank', group: 'water', layer: 1, delay: 0,
      home: [0, 6.4, 1.6], ex: [0, 5.0, 3.6], tag: '80 L', conf: 'confirmed', src: ['gs-marvel', 'gs-marvel-br'],
      desc: 'Fresh water with detergent for scrubbing.',
      specs: [['Capacity', '80 L (21.1 gal)']],
      anchors: { out: [0, -2.6, 1.0] },
      build(b) { L.tank(b, { w: 4.8, h: 5.0, d: 3.4, kind: 'clean', fill: 0.75 }); },
    },
    {
      id: 'recovery-tank', name: 'Waste water tank', group: 'water', layer: 1, delay: 0.04,
      home: [0, 6.6, -2.6], ex: [0, 5.0, -4.2], tag: '70 L', conf: 'confirmed', src: ['gs-marvel', 'gs-marvel-br'],
      desc: 'Holds the dirty water. Gausium says it cleans itself (automatic water-tank refresh), which cuts the manual work.',
      specs: [['Capacity', '70 L (18.5 gal)'], ['Feature', 'Self-cleaning']],
      anchors: { in: [0, 2.2, -1.0] },
      build(b) { L.tank(b, { w: 4.8, h: 4.6, d: 3.2, kind: 'dirty', fill: 0.45, cap: false }); },
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
      home: [0, 0.9, -5.0], ex: [0, -0.8, -3.6], tag: 'Charging', conf: 'inferred', src: ['gs-marvel'],
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
      home: [s * 3.05, 1.15, -3.7], ex: [s * 4.4, -0.8, -0.6], tag: '1.4 m/s', conf: 'named', src: ['gs-marvel', 'gs-marvel-pics'],
      desc: 'One of the two large black drive wheels at the rear corners.',
      specs: [['Max. speed', '1.4 m/s'], ['Min. U-turn width', '1,300 mm']],
      build(b) { L.tyreWheel(b, { r: 1.15, w: 0.6, side: s, hubM: 'dark' }); },
    })),
    {
      id: 'casters', name: 'Front casters', group: 'drive', layer: 3, delay: 0.1,
      home: [0, 0.32, 2.4], ex: [0, -2.4, 1.6], tag: 'Swivel', conf: 'inferred', src: ['gs-marvel'],
      desc: 'Swivel casters under the front of the body.',
      specs: [['Type', 'Swivel']],
      build(b) { for (const s of [-1, 1]) b.at([s * 2.6, 0, 0], () => L.caster(b, { r: 0.32 })); },
    },

    // ───────────── Sensing ─────────────
    {
      id: 'lidar-3d', name: '3D LiDAR', group: 'sense', layer: 0, delay: 0.02,
      home: [box(F, 'dome').cx, box(F, 'dome').cy, 4.06], ex: [0, 4.6, 3.4], tag: 'Mapping', conf: 'confirmed', src: ['gs-marvel-br', 'gs-marvel-pics'],
      desc: 'The round sensor dome at the front of the black visor. Gausium names a 3D LiDAR for high-precision mapping, navigation and positioning; that it is this dome is our reading of the picture.',
      specs: [['Use', 'Mapping · navigation · positioning']],
      build(b) {
        const ring = box(F, 'dome_ring'), dome = box(F, 'dome');
        b.cyl(ring.w / 2, ring.w / 2 + 0.02, 0.12, { m: 'trim', rot: [PI / 2 - 0.35, 0, 0], at: [0, ring.cy - dome.cy, 0], seg: 32 });
        b.sph(dome.w / 2, { m: 'lens', seg: 28, at: [0, 0, 0.12] });
        b.cyl(dome.w * 0.18, dome.w * 0.18, 0.04, { m: 'glass', rot: [PI / 2, 0, 0], at: [0, 0, 0.12 + dome.w / 2], seg: 14, e: false });
      },
    },
    {
      id: 'cliff-sensors', name: 'Anti-drop sensors', group: 'sense', layer: 1, delay: 0.1,
      home: [0, 0.6, 4.75], ex: [0, -2.0, 4.6], tag: 'Cliff', conf: 'inferred', src: ['gs-marvel'],
      desc: 'Downward-looking sensors at the front edge. Standard on these robots; not listed in the sources reached.',
      specs: [['Listed', 'Not in the sources reached']],
      build(b) { for (const x of [-2.6, -0.9, 0.9, 2.6]) b.cyl(0.12, 0.12, 0.12, { m: 'lens', at: [x, 0, 0], seg: 16 }); },
    },
    {
      id: 'front-camera', name: 'Front camera', group: 'sense', layer: 1, delay: 0.06,
      home: [box(F, 'slot').cx - 0.35, box(F, 'slot').cy, 3.84], ex: [0, 2.4, 5.0], tag: 'Vision', conf: 'inferred', src: ['gs-marvel-img'],
      desc: 'A camera behind the dark slot at the top of the front panel. What sits behind the slot is not stated; a camera is our reading.',
      specs: [['Listed', 'Not in the sources reached']],
      build(b) { L.camera(b, { w: 0.6, h: 0.3, d: 0.25, lens: 0.1 }); },
    },
  ],
};
