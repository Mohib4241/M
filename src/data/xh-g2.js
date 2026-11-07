// X-Human G2 photovoltaic panel cleaning robot (the product deck's picture, taken from above). Y up, 1 unit = 100 mm.
// The robot is drawn lying flat on its panel side, as in the picture; the picture's up is +Z. The numbers come from
// X-Human's solar page: 1,000 m²/h, 8 h a charge, 40 kg, IP65. X-Human publishes no size for the G2, so the size is
// an estimate from the picture (cleaning bars about 2 m wide); treat it as a picture, not a measurement. Where
// parts sit inside is a schematic reconstruction, not CAD.
import * as THREE from 'three';
import * as L from '../lib.js';
import * as F from '../field.js';
import { labelTex } from '../kit.js';

const PI = Math.PI;
const P = (id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build) => ({ id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build });
const S = 0.03;
const G = F.fromPlan(S);
const YEL = { k: 'yellow', id: 'g2-yellow', color: 0xf0b90f, metalness: 0.1, roughness: 0.3, emissive: 0x000000, clearcoat: 0.6 };
const BLK = { k: 'shellDk', id: 'g2-black', color: 0x131517, metalness: 0.25, roughness: 0.5, clearcoat: 0.3 };
const BLK2 = { k: 'shell', id: 'g2-black2', color: 0x1d2024, metalness: 0.2, roughness: 0.45 };

export default {
  id: 'xh-g2',
  name: 'X-Human G2',
  short: 'G2',
  maker: 'X-Human (Lingdu Intel-tech)',
  blurb: 'Photovoltaic panel cleaning robot: a light tracked vehicle between two long brush bars, with AI route planning, run by one person.',
  accent: '#ffd166', accent2: '#4cc9f0',
  studio: { accent: '#b8860b', accent2: '#0a8f9c' },
  hover: 0.6,
  race: false, noDock: true,
  mats: { studio: { shell: { color: 0x1d2024, metalness: 0.2, roughness: 0.45 }, shellDk: { color: 0x131517, metalness: 0.25, roughness: 0.5 }, trim: { color: 0x2a2e33 } } },
  kpis: [['Speed', '1,000 m²/h'], ['Runtime', '8 h'], ['Weight', '40 kg']],
  stats: [
    ['Cleaning speed', '1,000 m²/h'],
    ['Runtime', '8 h a charge'],
    ['Weight', '40 kg'],
    ['Rating', 'IP65 · C4 corrosion protection (X-Human\'s solar page)'],
    ['Panel wear', 'Over 20,000 cleanings without damaging panels (X-Human)'],
    ['Drive', 'All-wheel drive with active posture adjustment'],
    ['Navigation', 'AI route planning, operated by one person'],
    ['Size', 'Not published'],
    ['Warranty', '12 months'],
  ],
  notes: [
    'X-Human publishes no size for the G2. The size of the model is our estimate from the product deck\'s picture; treat it as a picture, not a measurement.',
    'X-Human\'s own page lists the G2 for distributed solar (commercial and rooftop arrays) and its G1 for centralised solar farms. The IP65, C4 and 20,000-cleaning figures are listed for X-Human\'s solar cleaning robots in general, not for the G2 alone.',
    'The "powered by solar, 48 V" system on X-Human\'s page is not stated for the G2 in particular, so the model carries an ordinary battery pack.',
    'What the two bars hold and how the central vehicle hooks onto them is read from the picture; X-Human does not describe it.',
  ],
  sources: ['deck', 'xh-solar', 'xh-site'],

  parts: [
    P('top-cover', 'Body shell', 'shell', 0, 0, [0, 0, 0], [0, 3.6, 0], 'Shell', 'named', ['deck', 'xh-solar'],
      'The black body with two curved yellow side panels, a yellow bumper at the top end, a round knob and a socket on the lower half, and the maker\'s name. The G2 is light, which X-Human says reduces damage to the panels.',
      [['Weight', '40 kg']],
      (b) => {
        const c = G.box(322, 250, 478, 550);
        b.box(c.w, 1.1, c.d, { m: BLK, r: 0.6, at: [c.x, 1.55, c.z] });
        for (const sd of [-1, 1]) { const y = G.box(sd < 0 ? 326 : 440, 262, sd < 0 ? 362 : 476, 545); b.box(y.w, 0.08, y.d, { m: YEL, r: 0.4, at: [y.x, 2.13, y.z], e: false }); }
        const t = G.box(340, 252, 460, 285);
        b.box(t.w, 0.5, t.d, { m: YEL, r: 0.2, at: [t.x, 2.0, t.z] });
        b.box(t.w * 0.7, 0.08, t.d * 0.5, { m: BLK2, r: 0.1, at: [t.x, 2.28, t.z], e: false });
        b.cyl(0.3, 0.3, 0.1, { m: 'steel', at: [G.X(400), 2.18, G.Z(413)], seg: 18 });
        b.cyl(0.42, 0.42, 0.1, { m: 'dark', at: [G.X(400), 2.18, G.Z(448)], seg: 22 });
        b.cyl(0.14, 0.14, 0.12, { m: 'steel', at: [G.X(400), 2.24, G.Z(448)], seg: 10, e: false });
        const lg = G.box(375, 332, 428, 352);
        b.box(lg.w, 0.012, lg.d, { m: { k: 'shell', id: 'g2-logo', map: labelTex('X-Human', { color: '#e6e8ea', font: '600 70px sans-serif', w: 512, h: 96, spacing: 2 }), color: 0xffffff }, at: [lg.x, 2.16, lg.z], e: false });
      }),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'tracks-l' : 'tracks-r', sd < 0 ? 'Left track' : 'Right track', 'drive', 2, 0.04,
      [0, 0, 0], [sd * 4.6, 0, 0], 'Track', 'named', ['deck', 'xh-solar'],
      'A long black rubber track beside the body. With all-wheel drive and active posture adjustment, X-Human says, the G2 can climb and cross obstacles on the array.',
      [['Drive', 'All-wheel, active posture adjustment']],
      (b) => {
        const t = G.box(sd < 0 ? 268 : 482, 250, sd < 0 ? 320 : 532, 562);
        b.at([t.x, 0.75, t.z], () => F.trackUnit(b, { len: t.d, h: 1.3, w: t.w, side: sd, r: 0.65, cleats: 34, frame: false, wheelsAt: [[-t.d / 2 + 0.65, 0, 0.5], [t.d / 2 - 0.65, 0, 0.5], [0, 0, 0.4]], cleat: [1.0, 0.04, 0.14] }));
      })),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'pods-l' : 'pods-r', sd < 0 ? 'Left pods and handle' : 'Right pods and handle', 'shell', 1, 0.06,
      [0, 0, 0], [sd * 5.6, 0.6, 0], 'Pods', 'inferred', ['deck'],
      'Two black pods at the outer edge of each track with a round steel handle between them, for lifting the robot onto a panel. Our reading of the picture.',
      [['Handle', 'Steel loop']],
      (b) => {
        for (const [y0, y1] of [[232, 336], [466, 572]]) {
          const p = G.box(sd < 0 ? 214 : 526, y0, sd < 0 ? 278 : 586, y1);
          b.box(p.w, 1.0, p.d, { m: BLK2, r: 0.5, at: [p.x, 0.65, p.z] });
        }
        const x0 = G.X(sd < 0 ? 262 : 538), x1 = G.X(sd < 0 ? 228 : 572);
        F.rod(b, [x0, 1.0, G.Z(368)], [x1, 1.0, G.Z(368)], 0.07, { m: 'steel', seg: 10, e: false });
        F.rod(b, [x1, 1.0, G.Z(368)], [x1, 1.0, G.Z(432)], 0.07, { m: 'steel', seg: 10, e: false });
        F.rod(b, [x1, 1.0, G.Z(432)], [x0, 1.0, G.Z(432)], 0.07, { m: 'steel', seg: 10, e: false });
      })),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'bar-down' : 'bar-up', sd < 0 ? 'Lower brush bar' : 'Upper brush bar', 'clean', 1, 0.04,
      [0, 0, 0], [0, 1.4, sd * -6.0], 'Brush bar', 'named', ['deck', 'xh-solar'],
      'A long bar, yellow in the middle and black at the ends, that cleans one side of the track across the panels. Two of them, one in front and one behind, let the robot clean in both directions. The picture does not show the bristles.',
      [['Width', 'About 2 m (estimated)']],
      (b) => {
        const y0 = sd < 0 ? 595 : 95, y1 = sd < 0 ? 705 : 205, m = G.box(70, y0, 730, y1);
        b.box(m.w, 1.1, m.d, { m: BLK, r: 0.3, at: [m.x, 0.8, m.z] });
        const c = G.box(150, y0 + 5, 650, y1 - 15);
        b.box(c.w * 0.62, 0.6, c.d * 0.8, { m: YEL, r: 0.5, at: [c.x, 1.28, c.z] });
        b.box(c.w * 0.4, 0.06, 0.6, { m: BLK2, r: 0.1, at: [c.x, 1.62, c.z - sd * 0.25], e: false });
        b.box(m.w, 0.3, 0.3, { m: 'steel', at: [m.x, 0.35, m.z + sd * m.d * 0.35], e: false });
      })),
    P('clamps', 'Clamps', 'arm', 1, 0.08, [0, 0, 0], [0, 1.0, 0], 'Clamps', 'inferred', ['deck'],
      'Four black clamps with small adjusting knobs hold each brush bar to the body, two at each end of it. Our reading of the picture.',
      [['Clamps', '4']],
      (b) => {
        for (const x of [330, 465]) for (const [a, c] of [[170, 255], [545, 635]]) {
          const k = G.box(x - 14, a, x + 14, c);
          b.box(k.w, 0.5, k.d, { m: BLK, r: 0.1, at: [k.x, 1.0, k.z] });
          b.cyl(0.14, 0.14, 0.3, { m: 'steel', at: [k.x, 1.35, k.z], seg: 10, e: false });
        }
      }),
    P('battery', 'Battery', 'power', 3, 0.12, [0, 0, 0], [0, -2.6, -2.4], 'Power', 'inferred', ['xh-solar'],
      'The battery pack that runs the robot for about 8 hours a charge. X-Human also sells solar-powered models; this is an ordinary pack.',
      [['Runtime', '8 h']],
      (b) => { b.at([0, 0.95, -1.4], () => L.battery(b, { w: 2.4, h: 0.7, d: 2.8 })); }),
    P('controller', 'Control board', 'power', 2, 0.14, [0, 0, 0], [0, -1.6, 2.4], 'Brain', 'inferred', ['xh-solar'],
      'Plans the cleaning route with the robot\'s AI navigation, so one person can run it, and drives the tracks and the two bars.',
      [['Navigation', 'AI route planning']],
      (b) => { b.at([0, 1.0, 2.0], () => L.pcb(b, { w: 2.0, d: 2.4 })); }),
    P('sensor', 'Edge sensors', 'sense', 1, 0.1, [0, 0, 0], [0, 2.0, 2.6], 'Sensor', 'inferred', ['xh-solar'],
      'X-Human says the robot detects and protects the panels and avoids obstacles on its own. Small sensors at the ends of the body would do this; they are not shown in the picture.',
      [['Protection', 'PV panel detection and protection']],
      (b) => { for (const z of [248, 553]) b.cyl(0.14, 0.14, 0.12, { m: 'lens', at: [G.X(400), 1.5, G.Z(z)], seg: 14 }); }),
  ],
};
