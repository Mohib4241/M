// X-Human J1 low-rise facade cleaning robot (the product deck's picture, taken from above). Y up, 1 unit = 100 mm.
// The robot is drawn lying flat with its cover up and its wall side down, as in the picture; the picture's up is +Z.
// The numbers come from X-Human's J1 page. X-Human publishes no size or weight for the J1, so the size is an
// estimate from the picture (a body about 0.6 m wide with a cleaning bar 1.2 m wide); treat it as a picture, not a
// measurement. Where parts sit inside is a schematic reconstruction, not CAD.
import * as THREE from 'three';
import * as L from '../lib.js';
import * as F from '../field.js';
import { labelTex } from '../kit.js';

const PI = Math.PI;
const P = (id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build) => ({ id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build });
const S = 0.02;
const G = F.fromPlan(S);
const WHITE = { k: 'shell', id: 'j1-white', color: 0xf3f4f6, metalness: 0.05, roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.18 };
const WHITE2 = { k: 'shell', id: 'j1-white2', color: 0xe4e7ea, metalness: 0.05, roughness: 0.35, clearcoat: 0.5 };
const BLACK = { k: 'shellDk', id: 'j1-black', color: 0x131517, metalness: 0.25, roughness: 0.55 };
const CYAN = { k: 'ledBlue', id: 'j1-cyan', color: 0x4fe6ff, emissive: 0x1fc8ff };
const TOP = 2.0;                                      // the top of the cover

export default {
  id: 'xh-j1',
  name: 'X-Human J1',
  short: 'J1',
  maker: 'X-Human (Lingdu Intel-tech)',
  blurb: 'Low-rise facade cleaning robot for glass curtain walls up to 30 m: four tracked pods carry a white body and a cleaning bar, with light strips on both sides.',
  accent: '#4cc9f0', accent2: '#ffd166',
  studio: { accent: '#0a8f9c', accent2: '#c98a1a' },
  hover: 1.0,
  race: false, noDock: true,
  mats: { studio: { shell: { color: 0xf3f4f6, metalness: 0.05, roughness: 0.28, clearcoat: 0.7 }, shellDk: { color: 0x131517, metalness: 0.25, roughness: 0.55 }, trim: { color: 0x2a2e33 } } },
  kpis: [['Speed', '432 m²/h'], ['Runtime', '8 h'], ['Height', 'up to 30 m']],
  stats: [
    ['Cleaning speed', '432 m²/h'],
    ['Runtime', '8 h a charge'],
    ['Operating height', 'Up to 30 m'],
    ['Walls', 'Glass curtain walls of mid-height buildings'],
    ['Control', 'Automatic or manual, by ordinary staff'],
    ['Turning', 'Rotates 360° on the wall (X-Human)'],
    ['Size', 'Not published'],
    ['Warranty', '12 months'],
  ],
  notes: [
    'X-Human publishes no size or weight for the J1. The size of the model is our estimate from the product deck\'s picture; treat it as a picture, not a measurement.',
    'The picture is taken from above, so the model lies flat with its cover up and its wall side down. On the building it hangs the other way round, with the cover facing out.',
    'X-Human\'s own site calls the J1 a "360° rotatable" cleaner; how it turns is not described. What the round openings and the bar are is read from the picture; X-Human does not label them.',
  ],
  sources: ['deck', 'xh-fac', 'xh-site'],

  parts: [
    P('top-cover', 'Cover', 'shell', 0, 0, [0, 0, 0], [0, 4.0, 0], 'Cover', 'named', ['deck', 'xh-fac'],
      'The white cover with a rounded top rail, a round black port near the top, a round cap near the bottom, a silver slot in the middle and the maker\'s name on it. It lifts off first.',
      [['Finish', 'Gloss white']],
      (b) => {
        const c = G.box(265, 125, 555, 595);
        b.box(c.w, 1.0, c.d, { m: WHITE, r: 1.0, at: [c.x, TOP - 0.5, c.z] });
        const t = G.box(228, 94, 590, 128);
        b.box(t.w, 0.5, t.d, { m: WHITE2, r: 0.2, at: [t.x, TOP - 0.7, t.z] });
        const s = G.box(365, 372, 460, 396);                                   // the silver slot
        b.box(s.w, 0.06, s.d, { m: 'silver', r: 0.25, at: [s.x, TOP + 0.02, s.z], e: false });
        b.box(s.w * 0.84, 0.07, s.d * 0.5, { m: 'dark', r: 0.1, at: [s.x, TOP + 0.04, s.z], e: false });
        b.cyl(0.7, 0.7, 0.14, { m: 'dark', at: [G.X(385), TOP + 0.04, G.Z(520)], seg: 26 });   // the lower cap
        b.cyl(0.48, 0.48, 0.05, { m: 'trim', at: [G.X(385), TOP + 0.12, G.Z(520)], seg: 24, e: false });
        const lg = G.box(345, 332, 465, 360);
        b.box(lg.w, 0.012, lg.d, { m: { k: 'shell', id: 'j1-logo', map: labelTex('X-Human', { color: '#33495f', font: '600 70px sans-serif', w: 512, h: 96, spacing: 2 }), color: 0xffffff }, at: [lg.x, TOP + 0.012, lg.z], e: false });
      }),
    P('port', 'Round port', 'air', 1, 0.04, [0, 0, 0], [0, 2.8, 0], 'Port', 'inferred', ['deck', 'xh-fac'],
      'A large round black port near the top of the cover, with a latch and a ring inside. It is read as the intake of the fan that holds the robot to the glass; X-Human does not label it.',
      [['Reading', 'Our reading of the picture']],
      (b) => {
        b.at([G.X(405), TOP + 0.02, G.Z(240)], () => {
          b.cyl(1.05, 1.05, 0.14, { m: 'dark', seg: 36 });
          b.tor(0.8, 0.07, { m: 'steel', rot: [PI / 2, 0, 0], at: [0, 0.1, 0], seg: 28, e: false });
          L.turbine(b, { r: 0.6, h: 0.3 });
          b.box(0.5, 0.2, 0.2, { m: 'silver', r: 0.04, at: [-0.15, 0.2, 0.0], e: false });
        });
      }),
    P('frame', 'Frame', 'drive', 3, 0.08, [0, 0, 0], [0, -1.8, 0], 'Frame', 'inferred', ['deck'],
      'The white frame under the cover with silver rails down both sides. It carries the four tracked pods, the cleaning bar and the electronics.',
      [['Frame', 'Aluminium rails']],
      (b) => {
        const f = G.box(245, 128, 575, 590);
        b.box(f.w, 0.5, f.d, { m: WHITE2, r: 0.5, at: [f.x, 0.7, f.z] });
        for (const sd of [-1, 1]) { const r = G.box(sd < 0 ? 240 : 560, 128, sd < 0 ? 262 : 580, 590); b.box(r.w, 0.4, r.d, { m: 'metal', r: 0.1, at: [r.x, 1.1, r.z], e: false }); }
      }),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'tracks-l' : 'tracks-r', sd < 0 ? 'Left tracked pods' : 'Right tracked pods', 'drive', 2, 0.06,
      [0, 0, 0], [sd * 4.4, 0, 0], 'Tracks', 'named', ['deck', 'xh-fac'],
      'Two black tracked pods on each side, in front and behind the middle, with shaped covers. They drive the robot over the glass and past the frames of a curtain wall.',
      [['Pods', '4 (two a side)']],
      (b) => {
        for (const [y0, y1] of [[125, 300], [405, 585]]) {
          const t = G.box(sd < 0 ? 190 : 580, y0, sd < 0 ? 262 : 650, y1);
          b.at([t.x, 0.95, t.z], () => F.trackUnit(b, { len: t.d, h: 1.3, w: t.w, side: sd, r: 0.6, cleats: 14, frame: false, wheelsAt: [[-t.d / 2 + 0.6, 0, 0.4], [t.d / 2 - 0.6, 0, 0.4]], cleat: [1.0, 0.04, 0.14] }));
        }
      })),
    P('leds', 'Light strips', 'ui', 1, 0.1, [0, 0, 0], [0, 1.6, 0], 'Lights', 'named', ['deck'],
      'A cyan light strip on each side of the cover, in a slot. They show the robot\'s state to people below; X-Human does not give their meaning.',
      [['Colour', 'Cyan']],
      (b) => { for (const x of [278, 532]) { const l = G.box(x - 8, 295, x + 8, 415); b.box(l.w, 0.14, l.d, { m: CYAN, r: 0.1, at: [l.x, TOP - 0.5, l.z], e: false }); } }),
    P('bar', 'Cleaning bar', 'clean', 1, 0.04, [0, 0, 0], [0, 0.8, -4.2], 'Cleaning', 'named', ['deck', 'xh-fac'],
      'A long white bar across the bottom of the robot, hinged to the frame at both sides, that does the cleaning. X-Human\'s robot cleans glass curtain walls automatically or by hand. The picture does not say which gear is in the bar.',
      [['Width', 'About 1.2 m (estimated)']],
      (b) => {
        const m = G.box(95, 598, 715, 688);
        b.box(m.w, 1.05, m.d, { m: WHITE, r: 0.5, at: [m.x, 1.0, m.z] });
        b.box(m.w * 0.9, 0.5, 0.3, { m: WHITE2, r: 0.1, at: [m.x, 0.95, m.z - m.d / 2 - 0.02], e: false });
        for (const x of [240, 575]) { const h = G.box(x - 12, 588, x + 12, 655); b.box(h.w, 0.3, h.d, { m: 'metal', r: 0.05, at: [h.x, 1.2, h.z] }); for (const y of [600, 640]) b.cyl(0.14, 0.14, 0.1, { m: 'steel', at: [G.X(x), 1.4, G.Z(y)], seg: 12, e: false }); }
      }),
    P('vision', 'Vision unit', 'sense', 1, 0.08, [0, 0, 0], [0, 2.2, 2.0], 'Camera', 'inferred', ['xh-fac'],
      'The same kind of "Owl" vision as on the K3: an RGBD depth camera with AI and SLAM that reads the wall and plans the route. X-Human does not say where it sits on the J1; it is shown at the top end.',
      [['Sensing', 'RGBD camera · AI · SLAM']],
      (b) => { b.at([G.X(405), TOP - 0.5, G.Z(112)], () => L.camera(b, { w: 0.8, h: 0.3, d: 0.3, lens: 0.1, ring: false })); }),
    P('battery', 'Battery', 'power', 3, 0.12, [0, 0, 0], [0, -2.6, -1.6], 'Power', 'inferred', ['xh-fac'],
      'The battery pack that runs the robot for about 8 hours a charge.',
      [['Runtime', '8 h']],
      (b) => { b.at([0, 0.95, -1.6], () => L.battery(b, { w: 2.6, h: 0.7, d: 2.4 })); }),
    P('controller', 'Control board', 'power', 2, 0.14, [0, 0, 0], [0, -1.6, 2.0], 'Brain', 'inferred', ['xh-fac'],
      'Plans the cleaning route and drives the pods, the fan and the bar, in automatic mode or by hand: X-Human says ordinary staff can run it.',
      [['Modes', 'Automatic · manual']],
      (b) => { b.at([0, 1.2, 1.2], () => L.pcb(b, { w: 2.2, d: 2.6 })); }),
  ],
};
