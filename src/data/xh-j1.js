// X-Human J1 low-altitude curtain wall cleaning robot (the product deck's picture, taken from above). Y up,
// 1 unit = 100 mm. The robot is drawn lying flat with its cover up and its wall side down, as in the picture; the
// picture's up is +Z. The size and the numbers come from X-Human's own J1 page (800 × 800 × 300 mm, an external
// 48 V 51 Ah battery and a 40 L external water tank) and its facade page; the picture's scale is set from that size.
// Where parts sit inside is a schematic reconstruction, not CAD.
import * as THREE from 'three';
import * as L from '../lib.js';
import * as F from '../field.js';
import { labelTex } from '../kit.js';

const PI = Math.PI;
const P = (id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build) => ({ id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build });
const S = 800 / 620 / 100;                            // units per pixel: 800 mm is the 620 px width of the cleaning bar
const G = F.fromPlan(S);
const WHITE = { k: 'shell', id: 'j1-white', color: 0xf3f4f6, metalness: 0.05, roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.18 };
const WHITE2 = { k: 'shell', id: 'j1-white2', color: 0xe4e7ea, metalness: 0.05, roughness: 0.35, clearcoat: 0.5 };
const BLACK = { k: 'shellDk', id: 'j1-black', color: 0x131517, metalness: 0.25, roughness: 0.55 };
const CYAN = { k: 'ledBlue', id: 'j1-cyan', color: 0x4fe6ff, emissive: 0x1fc8ff };
const TOP = 3.0;                                      // the top of the cover (300 mm thick in all)

export default {
  id: 'xh-j1',
  name: 'X-Human J1',
  short: 'J1',
  maker: 'X-Human (Lingdu Intel-tech)',
  blurb: 'Low-altitude curtain wall cleaning robot, 800 × 800 mm: it walks glass on negative pressure, turns through 360°, sprays a water mist and runs from an external battery and water tank.',
  accent: '#4cc9f0', accent2: '#ffd166',
  studio: { accent: '#0a8f9c', accent2: '#c98a1a' },
  hover: 1.0,
  race: false, noDock: true,
  mats: { studio: { shell: { color: 0xf3f4f6, metalness: 0.05, roughness: 0.28, clearcoat: 0.7 }, shellDk: { color: 0x131517, metalness: 0.25, roughness: 0.55 }, trim: { color: 0x2a2e33 } } },
  kpis: [['Speed', '432 m²/h'], ['Runtime', '8 h'], ['Height', '30 m']],
  stats: [
    ['Size', '800 × 800 × 300 mm (W × H × D)'],
    ['Cleaning', '432 m²/h'],
    ['Runtime', '8 h a charge · one battery lasts a day'],
    ['Power', 'External battery, 48 V 51 Ah'],
    ['Water', 'External tank, 40 L · water mist'],
    ['Adhesion', 'Negative pressure: walks the surface without falling off or scratching the glass'],
    ['Turning', '360° rotation on the wall, horizontal and vertical paths'],
    ['Control', 'Remote control only, no supervision needed'],
    ['Surfaces', 'Glass, stone, aluminium alloy and aluminium-plastic panel'],
    ['Working height', 'Up to 30 m (distributor) · below 60 m (X-Human\'s text)'],
    ['Warranty', '12 months'],
  ],
  notes: [
    'The size, the external battery and the external water tank are from X-Human\'s own J1 page. The battery and the tank are not on the robot: they stay on the ground or roof and reach it by a cable and a hose, so they are not modelled as parts of the robot.',
    'The picture is taken from above, so the model lies flat with its cover up and its wall side down. On the building it hangs the other way round, with the cover facing out.',
    'X-Human\'s pages disagree on the J1\'s height: a distributor lists up to 30 m, X-Human\'s own text says below 30 m in one place and below 60 m in another.',
    'The black post beside the round port is in X-Human\'s own pictures of the J1; X-Human does not label it, so it is shown unnamed. What the round port and the bar hold is read from the picture.',
  ],
  sources: ['deck', 'xh-j1', 'xh-fac', 'xh-cw', 'xh-site'],

  parts: [
    P('top-cover', 'Cover', 'shell', 0, 0, [0, 0, 0], [0, 4.0, 0], 'Cover', 'named', ['deck', 'xh-j1'],
      'The white cover with a rounded top rail, a round black port near the top, a round cap near the bottom, a silver slot in the middle and the maker\'s name on it. It lifts off first.',
      [['Finish', 'Gloss white'], ['Thickness', '300 mm (the whole robot)']],
      (b) => {
        const c = G.box(265, 125, 555, 595);
        b.box(c.w, 1.5, c.d, { m: WHITE, r: 1.0, at: [c.x, TOP - 0.75, c.z] });
        const t = G.box(228, 94, 590, 128);
        b.box(t.w, 0.8, t.d, { m: WHITE2, r: 0.2, at: [t.x, TOP - 1.0, t.z] });
        const s = G.box(365, 372, 460, 396);                                   // the silver slot
        b.box(s.w, 0.06, s.d, { m: 'silver', r: 0.2, at: [s.x, TOP + 0.02, s.z], e: false });
        b.box(s.w * 0.84, 0.07, s.d * 0.5, { m: 'dark', r: 0.1, at: [s.x, TOP + 0.04, s.z], e: false });
        b.cyl(0.45, 0.45, 0.14, { m: 'dark', at: [G.X(385), TOP + 0.04, G.Z(520)], seg: 26 });   // the lower cap
        b.cyl(0.3, 0.3, 0.05, { m: 'trim', at: [G.X(385), TOP + 0.12, G.Z(520)], seg: 24, e: false });
        const lg = G.box(345, 332, 465, 360);
        b.box(lg.w, 0.012, lg.d, { m: { k: 'shell', id: 'j1-logo', map: labelTex('X-Human', { color: '#33495f', font: '600 70px sans-serif', w: 512, h: 96, spacing: 2 }), color: 0xffffff }, at: [lg.x, TOP + 0.012, lg.z], e: false });
      }),
    P('port', 'Round port', 'air', 1, 0.04, [0, 0, 0], [0, 2.8, 0], 'Port', 'inferred', ['deck', 'xh-j1'],
      'A large round black port near the top of the cover, with a latch and a ring inside. X-Human says the J1 walks on negative pressure; the port is read as the intake of the fan that makes it, but X-Human does not label it.',
      [['Adhesion', 'Negative pressure']],
      (b) => {
        b.at([G.X(405), TOP + 0.02, G.Z(240)], () => {
          b.cyl(0.67, 0.67, 0.14, { m: 'dark', seg: 36 });
          b.tor(0.52, 0.05, { m: 'steel', rot: [PI / 2, 0, 0], at: [0, 0.1, 0], seg: 28, e: false });
          L.turbine(b, { r: 0.4, h: 0.3 });
          b.box(0.34, 0.14, 0.14, { m: 'silver', r: 0.03, at: [-0.1, 0.18, 0.0], e: false });
        });
      }),
    P('post', 'Black post (not labelled)', 'arm', 1, 0.06, [0, 0, 0], [0, 2.6, 1.6], 'Post', 'named', ['deck', 'xh-j1'],
      'A slim black post with a round top on the cover, to the right of the round port, as in X-Human\'s own pictures of the J1. X-Human does not say what it is; it may be an antenna or the fitting for the cable and hose.',
      [['Reading', 'Not labelled by X-Human']],
      (b) => {
        b.at([G.X(500), TOP, G.Z(262)], () => {
          b.cyl(0.14, 0.18, 0.5, { m: BLACK, at: [0, 0.25, 0], seg: 14 });
          b.cyl(0.07, 0.07, 1.3, { m: BLACK, at: [0, 1.1, 0], seg: 10 });
          b.sph(0.2, { m: BLACK, at: [0, 1.82, 0], seg: 14, e: false });
        });
      }),
    P('frame', 'Frame', 'drive', 3, 0.08, [0, 0, 0], [0, -1.8, 0], 'Frame', 'inferred', ['deck'],
      'The white frame under the cover with silver rails down both sides. It carries the four tracked pods, the cleaning bar and the electronics.',
      [['Frame', 'Aluminium rails']],
      (b) => {
        const f = G.box(245, 128, 575, 590);
        b.box(f.w, 0.5, f.d, { m: WHITE2, r: 0.5, at: [f.x, 0.8, f.z] });
        for (const sd of [-1, 1]) { const r = G.box(sd < 0 ? 240 : 560, 128, sd < 0 ? 262 : 580, 590); b.box(r.w, 0.5, r.d, { m: 'metal', r: 0.1, at: [r.x, 1.4, r.z], e: false }); }
      }),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'tracks-l' : 'tracks-r', sd < 0 ? 'Left tracked pods' : 'Right tracked pods', 'drive', 2, 0.06,
      [0, 0, 0], [sd * 4.4, 0, 0], 'Tracks', 'named', ['deck', 'xh-j1'],
      'Two black tracked pods on each side, in front and behind the middle, with shaped covers. They drive the robot over the glass and past the frames of a curtain wall, horizontally and vertically, without dead corners.',
      [['Pods', '4 (two a side)'], ['Paths', 'Horizontal and vertical']],
      (b) => {
        for (const [y0, y1] of [[125, 300], [405, 585]]) {
          const t = G.box(sd < 0 ? 190 : 580, y0, sd < 0 ? 262 : 650, y1);
          b.at([t.x, 1.25, t.z], () => F.trackUnit(b, { len: t.d, h: 2.2, w: t.w, side: sd, r: 0.7, cleats: 14, frame: false, wheelsAt: [[-t.d / 2 + 0.7, 0, 0.55], [t.d / 2 - 0.7, 0, 0.55]], cleat: [1.0, 0.05, 0.16] }));
        }
      })),
    P('leds', 'Light strips', 'ui', 1, 0.1, [0, 0, 0], [0, 1.6, 0], 'Lights', 'named', ['deck'],
      'A cyan light strip on each side of the cover, in a slot. They show the robot\'s state to people below; X-Human does not give their meaning.',
      [['Colour', 'Cyan']],
      (b) => { for (const x of [278, 532]) { const l = G.box(x - 8, 295, x + 8, 415); b.box(l.w, 0.14, l.d, { m: CYAN, r: 0.08, at: [l.x, TOP - 0.7, l.z], e: false }); } }),
    P('bar', 'Cleaning bar', 'clean', 1, 0.04, [0, 0, 0], [0, 0.8, -4.2], 'Cleaning', 'named', ['deck', 'xh-j1'],
      'A long white bar across the bottom of the robot, hinged to the frame at both sides, that does the cleaning. X-Human\'s J1 sprays a water mist to clear dirt and dust, and cleans in horizontal and vertical paths so no corner is missed. The picture does not say which gear is in the bar.',
      [['Width', '800 mm'], ['Cleaning', 'Water mist · horizontal and vertical paths']],
      (b) => {
        const m = G.box(95, 598, 715, 688);
        b.box(m.w, 1.7, m.d, { m: WHITE, r: 0.5, at: [m.x, 1.3, m.z] });
        b.box(m.w * 0.9, 0.7, 0.3, { m: WHITE2, r: 0.1, at: [m.x, 1.2, m.z - m.d / 2 - 0.02], e: false });
        for (const x of [240, 575]) { const h = G.box(x - 12, 588, x + 12, 655); b.box(h.w, 0.4, h.d, { m: 'metal', r: 0.05, at: [h.x, 1.5, h.z] }); for (const y of [600, 640]) b.cyl(0.1, 0.1, 0.1, { m: 'steel', at: [G.X(x), 1.75, G.Z(y)], seg: 12, e: false }); }
      }),
    P('vision', 'Vision unit', 'sense', 1, 0.08, [0, 0, 0], [0, 2.2, 2.0], 'Camera', 'inferred', ['xh-j1', 'xh-fac'],
      'X-Human\'s pages say the J1 has automatic edge detection, real-time path correction and controlled brush pressure, and its facade range uses an RGBD depth camera with AI and SLAM. X-Human does not say where the sensors sit on the J1; they are shown at the top end.',
      [['Sensing', 'Edge detection · path correction']],
      (b) => { b.at([G.X(405), TOP - 0.7, G.Z(112)], () => L.camera(b, { w: 0.55, h: 0.22, d: 0.22, lens: 0.07, ring: false })); }),
    P('umbilical', 'Cable and water hose', 'tether', 1, 0.1, [0, 0, 0], [0, 1.0, 4.0], 'Cable', 'named', ['xh-j1', 'xh-fac'],
      'The robot runs from an external 48 V 51 Ah battery and takes its water from an external 40 L tank, so a cable and a hose run from it to the ground. X-Human says one battery meets a day\'s work and the robot runs 8 hours a charge. Place and shape here are schematic.',
      [['Battery', '48 V 51 Ah (external)'], ['Water tank', '40 L (external)']],
      (b) => {
        F.tube(b, [[0.5, TOP - 0.9, G.Z(118)], [0.9, TOP - 0.4, G.Z(118) + 2.5], [0.3, TOP, G.Z(118) + 6], [0.8, TOP + 0.2, G.Z(118) + 9]], 0.14, { m: { k: 'rubber', id: 'j1-cable', color: 0x1b1e21 }, e: false });
        F.tube(b, [[-0.5, TOP - 0.9, G.Z(118)], [-0.9, TOP - 0.3, G.Z(118) + 2.5], [-0.3, TOP + 0.1, G.Z(118) + 6], [-0.8, TOP + 0.3, G.Z(118) + 9]], 0.16, { m: { k: 'tankCl', id: 'j1-hose', color: 0x6fb7e8 }, e: false });
      }),
    P('controller', 'Control board', 'power', 2, 0.14, [0, 0, 0], [0, -1.6, 2.0], 'Brain', 'inferred', ['xh-j1', 'xh-fac'],
      'Drives the pods, the fan, the water mist and the bar. X-Human\'s J1 is run with only a remote control and needs no extra supervision, and the operation is simple enough for ordinary property-service staff.',
      [['Control', 'Remote control']],
      (b) => { b.at([0, 1.3, 1.2], () => L.pcb(b, { w: 2.2, d: 2.6 })); }),
  ],
};
