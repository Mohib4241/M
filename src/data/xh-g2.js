// X-Human G2 photovoltaic panel cleaning robot (the product deck's picture, taken from above). Y up, 1 unit = 100 mm.
// The robot is drawn lying flat on its panel side, as in the picture; the picture's up is +Z. The size comes from
// X-Human's own G2 page (1,205 × 1,305 × 500 mm); the picture's scale is set from it. The other numbers are on the
// same page and on a distributor's page for X-Human (1,000 m²/h, 8 h, 40 kg). Where parts sit inside is a schematic
// reconstruction, not CAD.
import * as THREE from 'three';
import * as L from '../lib.js';
import * as F from '../field.js';
import { labelTex } from '../kit.js';

const PI = Math.PI;
const P = (id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build) => ({ id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build });
const S = 1305 / 660 / 100;                   // units per pixel: 1,305 mm is the 660 px length of the two brush bars
const G = F.fromPlan(S);
const YEL = { k: 'yellow', id: 'g2-yellow', color: 0xf0b90f, metalness: 0.1, roughness: 0.3, emissive: 0x000000, clearcoat: 0.6 };
const BLK = { k: 'shellDk', id: 'g2-black', color: 0x131517, metalness: 0.25, roughness: 0.5, clearcoat: 0.3 };
const BLK2 = { k: 'shell', id: 'g2-black2', color: 0x1d2024, metalness: 0.2, roughness: 0.45 };
const BODY_Y = 3.4;                           // the top of the body cover; the handle and the posts rise to 5.0 (500 mm in all)

export default {
  id: 'xh-g2',
  name: 'X-Human G2',
  short: 'G2',
  maker: 'X-Human (Lingdu Intel-tech)',
  blurb: 'Photovoltaic panel cleaning robot for factory rooftops and small PV stations: a light tracked vehicle between two brush bars, with AI route planning and dry and wet cleaning, for panels tilted up to 15°.',
  accent: '#ffd166', accent2: '#4cc9f0',
  studio: { accent: '#b8860b', accent2: '#0a8f9c' },
  hover: 0.6,
  race: false, noDock: true,
  mats: { studio: { shell: { color: 0x1d2024, metalness: 0.2, roughness: 0.45 }, shellDk: { color: 0x131517, metalness: 0.25, roughness: 0.5 }, trim: { color: 0x2a2e33 } } },
  kpis: [['Speed', '1,000 m²/h'], ['Runtime', '8 h'], ['Weight', '40 kg']],
  stats: [
    ['Size', '1,205 × 1,305 × 500 mm (W × H × D)'],
    ['Cleaning', '1,000 m²/h (distributor)'],
    ['Runtime', '8 h a charge (distributor)'],
    ['Weight', '40 kg (distributor)'],
    ['Panel tilt', '0 to 15°: wet and dry cleaning slope up to 15°'],
    ['Modes', 'Dry and wet cleaning'],
    ['Navigation', 'AI recognition, automatic route planning, fully automatic cleaning'],
    ['Use', 'Factory rooftop photovoltaics and small PV stations'],
    ['Rating', 'IP65 · C4 corrosion protection (X-Human\'s solar page, for its solar robots)'],
    ['Warranty', '12 months'],
  ],
  notes: [
    'The size, the 0–15° tilt, the dry and wet modes and the intended use are from X-Human\'s own G2 page. The 1,000 m²/h, 8 h and 40 kg are on a distributor\'s page for X-Human; the IP65 and C4 figures are listed there for X-Human\'s solar robots in general.',
    'X-Human\'s own page says the lightweight body avoids pressing on and damaging the panels. Its long marketing text also quotes figures (99.5% coverage and others) that read as generic; they are not used here.',
    'X-Human\'s photos show a cable trailing behind the G2 on a roof, and a black hand-held remote control on the roof edge; the cable is shown, the remote is not part of the robot.',
    'The handle, the posts and how the bars hook onto the body are read from X-Human\'s pictures of the G2; X-Human does not label them.',
  ],
  sources: ['deck', 'xh-g2', 'xh-solar', 'xh-site'],

  parts: [
    P('top-cover', 'Body shell', 'shell', 0, 0, [0, 0, 0], [0, 3.6, 0], 'Shell', 'named', ['deck', 'xh-g2'],
      'The black body with two curved yellow side panels, a yellow bumper at the top end, a round knob and a socket on the lower half, and the maker\'s name. X-Human says the lightweight body avoids pressing on and damaging the panels.',
      [['Weight', '40 kg (distributor)'], ['Thickness', '500 mm with the handle']],
      (b) => {
        const c = G.box(322, 250, 478, 550);
        b.box(c.w, 1.9, c.d, { m: BLK, r: 0.6, at: [c.x, BODY_Y - 0.95, c.z] });
        for (const sd of [-1, 1]) { const y = G.box(sd < 0 ? 326 : 440, 262, sd < 0 ? 362 : 476, 545); b.box(y.w, 0.08, y.d, { m: YEL, r: 0.4, at: [y.x, BODY_Y + 0.02, y.z], e: false }); }
        const t = G.box(340, 252, 460, 285);
        b.box(t.w, 0.9, t.d, { m: YEL, r: 0.2, at: [t.x, BODY_Y - 0.4, t.z] });
        b.box(t.w * 0.7, 0.08, t.d * 0.5, { m: BLK2, r: 0.1, at: [t.x, BODY_Y + 0.08, t.z], e: false });
        b.cyl(0.28, 0.28, 0.1, { m: 'steel', at: [G.X(400), BODY_Y + 0.07, G.Z(413)], seg: 18 });
        b.cyl(0.4, 0.4, 0.1, { m: 'dark', at: [G.X(400), BODY_Y + 0.07, G.Z(448)], seg: 22 });
        b.cyl(0.13, 0.13, 0.12, { m: 'steel', at: [G.X(400), BODY_Y + 0.13, G.Z(448)], seg: 10, e: false });
        const lg = G.box(375, 332, 428, 352);
        b.box(lg.w, 0.012, lg.d, { m: { k: 'shell', id: 'g2-logo', map: labelTex('X-Human', { color: '#e6e8ea', font: '600 70px sans-serif', w: 512, h: 96, spacing: 2 }), color: 0xffffff }, at: [lg.x, BODY_Y + 0.05, lg.z], e: false });
      }),
    P('handle', 'Top handle and posts', 'arm', 1, 0.03, [0, 0, 0], [0, 3.0, 0], 'Handle', 'named', ['deck', 'xh-g2'],
      'A black bar handle across the top of the body with two posts, one thick and one slim with a round tip, as X-Human\'s pictures of the G2 show. The handle is for lifting the robot onto a panel row; X-Human does not say what the posts are for (the slim one may be an antenna).',
      [['Reading', 'Not labelled by X-Human']],
      (b) => {
        const z = G.Z(300);
        F.rod(b, [-1.2, BODY_Y, z], [-1.2, BODY_Y + 1.1, z], 0.1, { m: BLK, seg: 10, e: false });
        F.rod(b, [1.2, BODY_Y, z], [1.2, BODY_Y + 1.1, z], 0.1, { m: BLK, seg: 10, e: false });
        F.rod(b, [-1.2, BODY_Y + 1.1, z], [1.2, BODY_Y + 1.1, z], 0.13, { m: BLK2, seg: 12, e: false });
        b.cyl(0.2, 0.28, 0.6, { m: BLK, at: [-1.9, BODY_Y + 0.3, G.Z(340)], seg: 14 });
        b.sph(0.25, { m: BLK, at: [-1.9, BODY_Y + 0.85, G.Z(340)], seg: 14, e: false });
        F.rod(b, [1.9, BODY_Y, G.Z(350)], [1.9, BODY_Y + 1.6, G.Z(350)], 0.05, { m: 'dark', seg: 8, e: false });
        b.sph(0.1, { m: 'dark', at: [1.9, BODY_Y + 1.65, G.Z(350)], seg: 10, e: false });
      }),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'tracks-l' : 'tracks-r', sd < 0 ? 'Left track' : 'Right track', 'drive', 2, 0.04,
      [0, 0, 0], [sd * 4.6, 0, 0], 'Track', 'named', ['deck', 'xh-g2'],
      'A long black rubber track beside the body. With all-wheel drive and active posture adjustment, X-Human says, the G2 can climb and cross obstacles on the array.',
      [['Drive', 'All-wheel, active posture adjustment']],
      (b) => {
        const t = G.box(sd < 0 ? 268 : 482, 250, sd < 0 ? 320 : 532, 562);
        b.at([t.x, 1.2, t.z], () => F.trackUnit(b, { len: t.d, h: 2.2, w: t.w, side: sd, r: 0.9, cleats: 34, frame: false, wheelsAt: [[-t.d / 2 + 0.9, 0, 0.7], [t.d / 2 - 0.9, 0, 0.7], [0, 0, 0.55]], cleat: [1.0, 0.05, 0.18] }));
      })),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'pods-l' : 'pods-r', sd < 0 ? 'Left pods and handle' : 'Right pods and handle', 'shell', 1, 0.06,
      [0, 0, 0], [sd * 5.6, 0.6, 0], 'Pods', 'inferred', ['deck'],
      'Two black pods at the outer edge of each track with a round steel handle between them, for lifting the robot onto a panel. Our reading of the picture.',
      [['Handle', 'Steel loop']],
      (b) => {
        for (const [y0, y1] of [[232, 336], [466, 572]]) {
          const p = G.box(sd < 0 ? 214 : 526, y0, sd < 0 ? 278 : 586, y1);
          b.box(p.w, 1.8, p.d, { m: BLK2, r: 0.7, at: [p.x, 1.1, p.z] });
        }
        const x0 = G.X(sd < 0 ? 262 : 538), x1 = G.X(sd < 0 ? 228 : 572);
        F.rod(b, [x0, 1.4, G.Z(368)], [x1, 1.4, G.Z(368)], 0.08, { m: 'steel', seg: 10, e: false });
        F.rod(b, [x1, 1.4, G.Z(368)], [x1, 1.4, G.Z(432)], 0.08, { m: 'steel', seg: 10, e: false });
        F.rod(b, [x1, 1.4, G.Z(432)], [x0, 1.4, G.Z(432)], 0.08, { m: 'steel', seg: 10, e: false });
      })),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'bar-down' : 'bar-up', sd < 0 ? 'Lower brush bar' : 'Upper brush bar', 'clean', 1, 0.04,
      [0, 0, 0], [0, 1.4, sd * -6.0], 'Brush bar', 'named', ['deck', 'xh-g2'],
      'A long bar, yellow in the middle and black at the ends, that cleans across the panels. Two of them, one in front and one behind, let the robot clean in both directions. X-Human gives two cleaning modes, dry and wet; the picture does not show the bristles.',
      [['Width', '1,305 mm across the bars'], ['Modes', 'Dry · wet']],
      (b) => {
        const y0 = sd < 0 ? 595 : 95, y1 = sd < 0 ? 705 : 205, m = G.box(70, y0, 730, y1);
        b.box(m.w, 2.0, m.d, { m: BLK, r: 0.4, at: [m.x, 1.2, m.z] });
        const c = G.box(150, y0 + 5, 650, y1 - 15);
        b.box(c.w * 0.62, 1.0, c.d * 0.8, { m: YEL, r: 0.6, at: [c.x, 1.95, c.z] });
        b.box(c.w * 0.4, 0.06, 0.7, { m: BLK2, r: 0.1, at: [c.x, 2.5, c.z - sd * 0.3], e: false });
        b.box(m.w, 0.4, 0.4, { m: 'steel', at: [m.x, 0.35, m.z + sd * m.d * 0.35], e: false });
      })),
    P('clamps', 'Clamps', 'arm', 1, 0.08, [0, 0, 0], [0, 1.0, 0], 'Clamps', 'inferred', ['deck'],
      'Four black clamps with small adjusting knobs hold each brush bar to the body, two at each end of it. Our reading of the picture.',
      [['Clamps', '4']],
      (b) => {
        for (const x of [330, 465]) for (const [a, c] of [[170, 255], [545, 635]]) {
          const k = G.box(x - 14, a, x + 14, c);
          b.box(k.w, 0.8, k.d, { m: BLK, r: 0.1, at: [k.x, 1.4, k.z] });
          b.cyl(0.14, 0.14, 0.4, { m: 'steel', at: [k.x, 2.0, k.z], seg: 10, e: false });
        }
      }),
    P('cable', 'Trailing cable', 'tether', 1, 0.1, [0, 0, 0], [0, 0.6, -3.6], 'Cable', 'named', ['deck', 'xh-g2'],
      'An orange cable runs behind the G2 on the roof in X-Human\'s photos. X-Human does not say whether it carries power, a safety line or the signal; it lists an 8-hour battery life.',
      [['Reading', 'Pictured, not labelled by X-Human']],
      (b) => { F.tube(b, [[0, BODY_Y - 1.4, G.Z(552)], [0.4, 0.6, G.Z(552) - 2.5], [-0.6, 0.35, G.Z(552) - 6], [0.5, 0.35, G.Z(552) - 9.5]], 0.08, { m: { k: 'yellow', id: 'g2-cable', color: 0xe8741a, emissive: 0x000000 }, e: false }); }),
    P('battery', 'Battery', 'power', 3, 0.12, [0, 0, 0], [0, -2.6, -2.4], 'Power', 'inferred', ['xh-solar'],
      'The battery pack that runs the robot for about 8 hours a charge, as a distributor\'s page for X-Human lists it. X-Human\'s own page does not give the battery.',
      [['Runtime', '8 h (distributor)']],
      (b) => { b.at([0, 1.2, -1.6], () => L.battery(b, { w: 2.6, h: 0.9, d: 3.2 })); }),
    P('controller', 'Control board', 'power', 2, 0.14, [0, 0, 0], [0, -1.6, 2.4], 'Brain', 'named', ['xh-g2'],
      'The AI recognition and automatic navigation system plans the cleaning route by itself and runs the tracks and the two bars, so the cleaning is fully automatic.',
      [['Navigation', 'AI recognition · automatic route planning']],
      (b) => { b.at([0, 1.3, 2.0], () => L.pcb(b, { w: 2.2, d: 2.6 })); }),
    P('sensor', 'Edge sensors', 'sense', 1, 0.1, [0, 0, 0], [0, 2.0, 2.6], 'Sensor', 'inferred', ['xh-solar'],
      'X-Human says the robot detects and protects the panels and avoids obstacles on its own. Small sensors at the ends of the body would do this; they are not shown in the picture.',
      [['Protection', 'PV panel detection and protection']],
      (b) => { for (const z of [248, 553]) b.cyl(0.14, 0.14, 0.12, { m: 'lens', at: [G.X(400), 1.9, G.Z(z)], seg: 14 }); }),
  ],
};
