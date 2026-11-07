// X-Human K3 facade cleaning robot (the product deck's picture, taken from above). Y up, 1 unit = 100 mm.
// The robot is drawn lying flat with its cover up and its wall side down, as in the picture; the picture's up is +Z.
// The numbers come from X-Human's K3 page. X-Human publishes no size or weight for the K3, so the size is an estimate
// from the picture (about 1.0 m between the side pods, 1.25 m across the cleaning modules); treat it as a picture,
// not a measurement. Where parts sit inside is a schematic reconstruction, not CAD.
import * as THREE from 'three';
import * as L from '../lib.js';
import * as F from '../field.js';
import { labelTex } from '../kit.js';

const PI = Math.PI;
const P = (id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build) => ({ id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build });
const S = 0.026;                              // units per pixel of the deck picture
const G = F.fromPlan(S);
const BLUE = { k: 'shell', id: 'k3-blue', color: 0x1f7fe6, metalness: 0.1, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25 };
const BLUE2 = { k: 'shellDk', id: 'k3-blue2', color: 0x1766c2, metalness: 0.1, roughness: 0.4, clearcoat: 0.4 };
const WHITE = { k: 'shell', id: 'k3-white', color: 0xf1f3f5, metalness: 0.05, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 };
const BLACK = { k: 'shellDk', id: 'k3-black', color: 0x15171a, metalness: 0.3, roughness: 0.5 };
const GREY = { k: 'metal', id: 'k3-grey', color: 0x8d949a, metalness: 0.7, roughness: 0.4 };
const Y_BLUE = 1.45, Y_WHITE = 2.1;           // top of the blue pods, top of the white cover

const BODY_PX = [[300, 170], [500, 170], [500, 295], [520, 308], [585, 318], [596, 334], [596, 480], [585, 496], [520, 506], [500, 520], [500, 622], [300, 622], [300, 520], [280, 506], [215, 496], [205, 480], [205, 334], [215, 318], [280, 308], [300, 295]];
const ARMS = [[[245, 300], [172, 212]], [[555, 300], [628, 212]], [[245, 500], [172, 590]], [[555, 500], [628, 590]]];
const WHEELS = [[262, 242], [538, 242], [262, 548], [538, 548]];

export default {
  id: 'xh-k3',
  name: 'X-Human K3',
  short: 'K3',
  maker: 'X-Human (Lingdu Intel-tech)',
  blurb: 'High-rise facade cleaning robot for flat glass and curtain walls: it clings to the wall with a 500 kg adsorption force, steps over obstacles up to 30 cm and recycles its own water.',
  accent: '#4cc9f0', accent2: '#ffd166',
  studio: { accent: '#1f7fe6', accent2: '#c98a1a' },
  hover: 1.0,
  race: false, noDock: true,
  mats: { studio: { shell: { color: 0xf1f3f5, metalness: 0.05, roughness: 0.3, clearcoat: 0.6 }, shellDk: { color: 0x15171a, metalness: 0.3, roughness: 0.5 }, trim: { color: 0x2a2e33 } } },
  kpis: [['Speed', '720 m²/h'], ['Runtime', '3 h'], ['Height', 'up to 600 m']],
  stats: [
    ['Cleaning speed', '720 m²/h · about 2,000 m² a day'],
    ['Runtime', 'About 3 h a charge (±30%)'],
    ['Operating height', 'Up to 600 m (as listed)'],
    ['Adsorption', '500 kg'],
    ['Obstacles', 'Protrusions of 10–30 cm'],
    ['Wind', 'Resists force 12 (32.7–36.9 m/s)'],
    ['Water', 'Circulation and filtration: up to 95% of the dirty water filtered'],
    ['Intelligence', 'RGBD depth camera, AI recognition, SLAM'],
    ['Size', 'Not published'],
    ['Warranty', '12 months'],
  ],
  notes: [
    'X-Human publishes no size or weight for the K3. The size of the model is our estimate from the product deck\'s picture; treat it as a picture, not a measurement.',
    'The picture is taken from above, so the model lies flat with its cover up and its wall side down. On the building it hangs the other way round, with the cover facing out.',
    'The 600 m working height and the other figures are on a distributor\'s page for X-Human. The same page lists the J1 at 30 m.',
    'What the round black openings, the arms with suction feet and the blue pods are is read from the picture and from X-Human\'s text (500 kg adsorption, obstacle crossing, water recycling); X-Human does not label them.',
  ],
  sources: ['deck', 'xh-fac', 'xh-site'],

  parts: [
    P('top-cover', 'Cover', 'shell', 0, 0, [0, 0, 0], [0, 4.0, 0], 'Cover', 'named', ['deck', 'xh-fac'],
      'The white cover over the middle of the robot. It has a hinged hatch, a recessed carry handle, a round filler cap and the maker\'s name on it. It is the first piece to lift off.',
      [['Finish', 'Gloss white']],
      (b) => {
        const c = G.box(300, 175, 500, 622);
        b.box(c.w, Y_WHITE - 1.2, c.d, { m: WHITE, r: 0.8, at: [c.x, (Y_WHITE + 1.2) / 2, c.z] });
        const h = G.box(312, 398, 490, 476);                                  // the hatch
        b.box(h.w, 0.06, h.d, { m: { k: 'shell', id: 'k3-hatch', color: 0xe3e6e9, roughness: 0.4 }, r: 0.25, at: [h.x, Y_WHITE + 0.02, h.z], e: false });
        b.box(h.w * 0.5, 0.05, h.d * 0.35, { m: WHITE, r: 0.15, at: [h.x, Y_WHITE + 0.06, h.z - 0.1], e: false });
        const s = G.box(362, 330, 438, 350);                                  // the carry handle slot
        b.box(s.w, 0.05, s.d, { m: 'dark', r: 0.15, at: [s.x, Y_WHITE + 0.01, s.z], e: false });
        b.cyl(0.6, 0.6, 0.14, { m: 'dark', at: [G.X(395), Y_WHITE + 0.05, G.Z(585)], seg: 28 });   // the filler cap
        b.cyl(0.42, 0.42, 0.06, { m: 'trim', at: [G.X(395), Y_WHITE + 0.13, G.Z(585)], seg: 24, e: false });
        const lg = G.box(335, 498, 465, 530);                                 // the maker's name
        b.box(lg.w, 0.015, lg.d, { m: { k: 'shell', id: 'k3-logo', map: labelTex('X-Human', { color: '#33495f', font: '600 70px sans-serif', w: 512, h: 96, spacing: 2 }), color: 0xffffff }, at: [lg.x, Y_WHITE + 0.012, lg.z], e: false });
      }),
    P('body', 'Blue body', 'shell', 0, 0.04, [0, 0, 0], [0, 1.6, 0], 'Body', 'named', ['deck', 'xh-fac'],
      'The blue moulded body that runs out sideways under the cover into two wide pods. The round black openings in the pods are read as the fans that hold the robot to the glass.',
      [['Finish', 'Blue moulded plastic']],
      (b) => {
        b.profile(G.pts(BODY_PX, 0.3), Y_BLUE - 0.3, { axis: 'y', m: BLUE, at: [0, (Y_BLUE + 0.3) / 2, 0], bevel: 0.12 });
        for (const sd of [-1, 1]) { const f = G.box(sd < 0 ? 215 : 505, 318, sd < 0 ? 295 : 585, 480); b.box(f.w, 0.05, f.d, { m: BLUE2, r: 0.3, at: [f.x, Y_BLUE + 0.02, f.z], e: false }); }
      }),
    P('frame', 'Black frame', 'drive', 3, 0.08, [0, 0, 0], [0, -2.0, 0], 'Frame', 'inferred', ['deck'],
      'The black frame under the body. It carries the arms, the wheels and the two cleaning modules, and shows in the gaps between them.',
      [['Frame', 'Black']],
      (b) => {
        const f = G.box(238, 128, 562, 664);
        b.box(f.w, 0.45, f.d, { m: BLACK, r: 0.3, at: [f.x, 0.55, f.z] });
        for (const x of [330, 470]) for (const y of [118, 682]) { const c = G.box(x - 16, y - 28, x + 16, y + 28); b.box(c.w, 0.9, c.d, { m: BLACK, r: 0.08, at: [c.x, 0.9, c.z] }); }
      }),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'fan-l' : 'fan-r', sd < 0 ? 'Left adsorption fan' : 'Right adsorption fan', 'air', 2, 0.06,
      [0, 0, 0], [sd * 4.0, 1.4, 0], 'Fan', 'inferred', ['xh-fac', 'deck'],
      'A fan under a round black grille in the side pod. X-Human lists a 500 kg adsorption force on a smooth facade; fans pulling the robot onto the glass are how this class of robot gets it. It is our reading of the picture.',
      [['Adsorption', '500 kg']],
      (b) => {
        b.at([G.X(sd < 0 ? 245 : 555), Y_BLUE - 0.35, G.Z(400)], () => {
          L.turbine(b, { r: 0.7, h: 0.7 });
          b.cyl(0.78, 0.78, 0.08, { m: 'dark', at: [0, 0.45, 0], seg: 32 });
          b.cyl(0.22, 0.22, 0.12, { m: 'metal', at: [0, 0.5, 0], seg: 14, e: false });
        });
      })),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'module-down' : 'module-up', sd < 0 ? 'Lower cleaning module' : 'Upper cleaning module', 'clean', 1, 0.04,
      [0, 0, 0], [0, 1.2, sd * -5.5], 'Cleaning', 'named', ['deck', 'xh-fac'],
      'A long blue module across the top (or the bottom) of the robot that holds the cleaning gear. The robot cleans in several ways; the picture does not say which gear sits in each module.',
      [['Methods', 'Several (X-Human)']],
      (b) => {
        const m = G.box(160, sd < 0 ? 640 : 75, 640, sd < 0 ? 725 : 160);
        b.box(m.w, 1.5, m.d, { m: BLUE, r: 0.4, at: [m.x, 0.95, m.z] });
        b.box(m.w * 0.42, 0.06, m.d * 0.5, { m: BLUE2, r: 0.2, at: [m.x - m.w * 0.27, 1.72, m.z], e: false });
        b.box(m.w * 0.42, 0.06, m.d * 0.5, { m: BLUE2, r: 0.2, at: [m.x + m.w * 0.27, 1.72, m.z], e: false });
        for (const x of [320, 480]) { const c = G.box(x - 18, (sd < 0 ? 640 : 75) + 15, x + 18, (sd < 0 ? 725 : 160) - 15); b.box(c.w, 0.08, c.d, { m: BLACK, r: 0.05, at: [c.x, 1.75, c.z], e: false }); }
        // two black loops on each side, the tubes the picture shows at the ends
        for (const e of [-1, 1]) F.tube(b, [[m.x + e * m.w * 0.36, 1.2, m.z - sd * 0.2], [m.x + e * m.w * 0.3, 1.9, m.z - sd * 0.5], [m.x + e * m.w * 0.3, 2.0, m.z - sd * 1.3]], 0.1, { m: 'rubber', e: false });
      })),
    ...[0, 1].map((k) => P(k ? 'arms-rear' : 'arms-front', k ? 'Rear arms and suction feet' : 'Front arms and suction feet', 'arm', 1, 0.08,
      [0, 0, 0], [0, 1.5, k ? -4.0 : 4.0], 'Arms', 'inferred', ['deck', 'xh-fac'],
      'Two grey arms with a round black foot each, reaching out of the corners of the body. X-Human says the K3 steps over protrusions of 10–30 cm; arms that lift and re-plant their feet are how it can. The picture does not label them.',
      [['Obstacles', '10–30 cm']],
      (b) => {
        for (const [a, c] of ARMS.slice(k * 2, k * 2 + 2)) {
          F.bar(b, [G.X(a[0]), 1.0, G.Z(a[1])], [G.X(c[0]), 1.0, G.Z(c[1])], { w: 0.22, h: 0.16, m: GREY, r: 0.04 });
          b.cyl(0.58, 0.58, 0.25, { m: 'rubber', at: [G.X(c[0]), 1.0, G.Z(c[1])], seg: 28 });
          b.cyl(0.2, 0.2, 0.3, { m: 'steel', at: [G.X(c[0]), 1.05, G.Z(c[1])], seg: 12, e: false });
        }
      })),
    P('wheels', 'Wheels', 'drive', 2, 0.1, [0, 0, 0], [0, -1.0, 0], 'Wheels', 'inferred', ['deck'],
      'Four small black wheels beside the body, two a side, that drive the robot across the glass.',
      [['Wheels', '4']],
      (b) => { for (const [x, y] of WHEELS) b.cyl(0.5, 0.5, 0.7, { m: 'rubber', rot: [0, 0, PI / 2], at: [G.X(x), 0.9, G.Z(y)], seg: 24 }); }),
    P('vision', 'Vision unit', 'sense', 1, 0.06, [0, 0, 0], [0, 2.4, 2.8], 'Camera', 'inferred', ['xh-fac'],
      'X-Human\'s "Owl" system reads the wall with an RGBD depth camera, AI recognition and SLAM, picks the best path and avoids obstacles. A black hinge at the top end of the cover is read as where it sits.',
      [['Sensing', 'RGBD camera · AI · SLAM']],
      (b) => { b.at([G.X(400), Y_WHITE - 0.3, G.Z(165)], () => L.camera(b, { w: 1.0, h: 0.4, d: 0.4, lens: 0.13, ring: false })); }),
    P('water', 'Water circulation filter', 'water', 2, 0.12, [0, 0, 0], [0, 0, 3.2], 'Water', 'named', ['xh-fac'],
      'X-Human\'s water circulation filter recovers the dirty water as it goes, separates the air from the water, and filters up to 95% of it, so the robot needs no outside water pipe.',
      [['Filtering', 'Up to 95% of the dirty water']],
      (b) => { b.at([-1.6, 0.9, 0.3], () => L.tank(b, { w: 2.6, h: 0.9, d: 3.2, kind: 'clean', fill: 0.6 })); b.at([1.6, 0.9, 0.3], () => L.tank(b, { w: 2.6, h: 0.9, d: 3.2, kind: 'dirty', fill: 0.5 })); b.at([0, 0.9, 3.2], () => L.pump(b)); }),
    P('battery', 'Battery', 'power', 3, 0.14, [0, 0, 0], [0, -2.6, -2.6], 'Power', 'inferred', ['xh-fac'],
      'The battery pack that runs the robot for about 3 hours a charge (±30%). With the water recycled on board, the robot needs no outside power, water or gas line, as the deck says.',
      [['Runtime', 'About 3 h (±30%)']],
      (b) => { b.at([0, 0.75, -3.2], () => L.battery(b, { w: 3.0, h: 0.8, d: 3.0 })); }),
    P('controller', 'Control board', 'power', 2, 0.16, [0, 0, 0], [0, -1.6, 1.8], 'Brain', 'inferred', ['xh-fac'],
      'Reads the depth camera and plans the route; drives the fans, the wheels, the arms and the cleaning modules.',
      [['Navigation', 'SLAM path planning']],
      (b) => { b.at([0, 1.05, -0.4], () => L.pcb(b, { w: 2.2, d: 2.8 })); }),
  ],
};
