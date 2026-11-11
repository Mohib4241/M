// X-Human K3 high-altitude curtain wall cleaning robot (the product deck's picture, taken from above). Y up,
// 1 unit = 100 mm. The robot is drawn lying flat with its cover up and its wall side down, as in the picture; the
// picture's up is +Z. The size and the numbers come from X-Human's own K3 page (1,377 × 1,000 × 288 mm, a 48 V 50 Ah
// battery, a 9 L water circulation tank, a 1,500 kg safety rope) and its facade page; the picture's scale is set from
// that size. Where parts sit inside is a schematic reconstruction, not CAD.
import * as THREE from 'three';
import * as L from '../lib.js';
import * as F from '../field.js';
import { labelTex } from '../kit.js';

const PI = Math.PI;
const P = (id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build) => ({ id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build });
const S = 1377 / 660 / 100;                   // units per pixel: 1,377 mm is the 660 px between the outer edges of the two modules
const G = F.fromPlan(S);
const BLUE = { k: 'shell', id: 'k3-blue', color: 0x1f7fe6, metalness: 0.1, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25 };
const BLUE2 = { k: 'shellDk', id: 'k3-blue2', color: 0x1766c2, metalness: 0.1, roughness: 0.4, clearcoat: 0.4 };
const WHITE = { k: 'shell', id: 'k3-white', color: 0xf1f3f5, metalness: 0.05, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 };
const BLACK = { k: 'shellDk', id: 'k3-black', color: 0x15171a, metalness: 0.3, roughness: 0.5 };
const GREY = { k: 'metal', id: 'k3-grey', color: 0x8d949a, metalness: 0.7, roughness: 0.4 };
const Y_BLUE = 1.9, Y_WHITE = 2.88;           // top of the blue pods, top of the white cover (288 mm thick in all)

const BODY_PX = [[300, 170], [500, 170], [500, 295], [520, 308], [585, 318], [596, 334], [596, 480], [585, 496], [520, 506], [500, 520], [500, 622], [300, 622], [300, 520], [280, 506], [215, 496], [205, 480], [205, 334], [215, 318], [280, 308], [300, 295]];
const ARMS = [[[245, 300], [172, 212]], [[555, 300], [628, 212]], [[245, 500], [172, 590]], [[555, 500], [628, 590]]];
const WHEELS = [[262, 242], [538, 242], [262, 548], [538, 548]];

export default {
  id: 'xh-k3',
  name: 'X-Human K3',
  short: 'K3',
  maker: 'X-Human (Lingdu Intel-tech)',
  blurb: 'High-altitude curtain wall cleaning robot for flat glass: it sticks to the wall with its own suction, hangs on a 1,500 kg safety rope, steps over obstacles up to 30 cm and cleans with recycled water.',
  accent: '#4cc9f0', accent2: '#ffd166',
  studio: { accent: '#1f7fe6', accent2: '#c98a1a' },
  hover: 1.0,
  dims: { l: 1377, w: 1000, h: 288 }, dimsSkip: ['rope'],
  race: false, noDock: true,
  mats: { studio: { shell: { color: 0xf1f3f5, metalness: 0.05, roughness: 0.3, clearcoat: 0.6 }, shellDk: { color: 0x15171a, metalness: 0.3, roughness: 0.5 }, trim: { color: 0x2a2e33 } } },
  kpis: [['Speed', '720 m²/h'], ['Runtime', '3 h'], ['Height', '600 m']],
  stats: [
    ['Size', '1,377 × 1,000 × 288 mm (W × H × D)'],
    ['Cleaning', '720 m²/h · 1,200–2,000 m² a day'],
    ['Runtime', 'About 3 h on its dual batteries (±30%)'],
    ['Battery', 'Built in, 48 V 50 Ah (two packs)'],
    ['Water', 'Built-in circulation tank, 9 L · filters up to 95% of the dirty water'],
    ['Safety rope', 'Load-bearing 1,500 kg · self-locking device holds it on a power cut'],
    ['Adsorption', '500 kg · automatic atmospheric-pressure compensation, boost in an emergency'],
    ['Obstacles', 'Protrusions of 10–30 cm'],
    ['Wind', 'Holds in force 12 (32.7–36.9 m/s)'],
    ['Surfaces', 'Pure flat glass or pure flat smooth stone'],
    ['Working height', 'Up to 600 m (as listed)'],
    ['Intelligence', 'RGBD depth camera · AI · SLAM · edge and obstacle detection'],
    ['Warranty', '12 months'],
  ],
  notes: [
    'The size, battery, water tank and rope figures are from X-Human\'s own K3 page. The 720 m²/h, 3 h and 600 m are on X-Human\'s product page as listed by a distributor; X-Human\'s own page gives 1,200–2,000 m² a day.',
    'The picture is taken from above, so the model lies flat with its cover up and its wall side down. On the building it hangs the other way round, with the cover facing out and the safety rope running up from the top end, as X-Human\'s photos show.',
    'X-Human says one side of a 100 m building can be cleaned with two batteries, and that 8 L of water lasts half a day with the filter and recycling system. It calls the cleaning "brush, wash, scrape" so each pane is cleaned several times.',
    'X-Human does not label the round black openings, the arms with suction feet or the blue pods. They are read from the picture and from its text (suction, obstacle crossing, water recycling).',
  ],
  sources: ['deck', 'xh-k3', 'xh-fac', 'xh-cw', 'xh-site'],

  parts: [
    P('top-cover', 'Cover', 'shell', 0, 0, [0, 0, 0], [0, 4.0, 0], 'Cover', 'named', ['deck', 'xh-k3'],
      'The white cover over the middle of the robot. It has a hinged hatch, a recessed carry handle, a round filler cap and the maker\'s name on it. It is the first piece to lift off.',
      [['Finish', 'Gloss white'], ['Thickness', '288 mm (the whole robot)']],
      (b) => {
        const c = G.box(300, 175, 500, 622);
        b.box(c.w, Y_WHITE - 1.6, c.d, { m: WHITE, r: 0.8, at: [c.x, (Y_WHITE + 1.6) / 2, c.z] });
        const h = G.box(312, 398, 490, 476);                                  // the hatch
        b.box(h.w, 0.06, h.d, { m: { k: 'shell', id: 'k3-hatch', color: 0xe3e6e9, roughness: 0.4 }, r: 0.25, at: [h.x, Y_WHITE + 0.02, h.z], e: false });
        b.box(h.w * 0.5, 0.05, h.d * 0.35, { m: WHITE, r: 0.15, at: [h.x, Y_WHITE + 0.06, h.z - 0.1], e: false });
        const s = G.box(362, 330, 438, 350);                                  // the carry handle slot
        b.box(s.w, 0.05, s.d, { m: 'dark', r: 0.15, at: [s.x, Y_WHITE + 0.01, s.z], e: false });
        b.cyl(0.5, 0.5, 0.14, { m: 'dark', at: [G.X(395), Y_WHITE + 0.05, G.Z(585)], seg: 28 });   // the filler cap
        b.cyl(0.34, 0.34, 0.06, { m: 'trim', at: [G.X(395), Y_WHITE + 0.13, G.Z(585)], seg: 24, e: false });
        const lg = G.box(335, 498, 465, 530);                                 // the maker's name
        b.box(lg.w, 0.015, lg.d, { m: { k: 'shell', id: 'k3-logo', map: labelTex('X-Human', { color: '#33495f', font: '600 70px sans-serif', w: 512, h: 96, spacing: 2 }), color: 0xffffff }, at: [lg.x, Y_WHITE + 0.012, lg.z], e: false });
      }),
    P('body', 'Blue body', 'shell', 0, 0.04, [0, 0, 0], [0, 1.6, 0], 'Body', 'named', ['deck', 'xh-k3'],
      'The blue moulded body that runs out sideways under the cover into two wide pods. The round black openings in the pods are read as the fans of the self-adsorption system that holds the robot to the glass.',
      [['Finish', 'Blue moulded plastic']],
      (b) => {
        b.profile(G.pts(BODY_PX, 0.3), Y_BLUE - 0.4, { axis: 'y', m: BLUE, at: [0, (Y_BLUE + 0.4) / 2, 0], bevel: 0.12 });
        for (const sd of [-1, 1]) { const f = G.box(sd < 0 ? 215 : 505, 318, sd < 0 ? 295 : 585, 480); b.box(f.w, 0.05, f.d, { m: BLUE2, r: 0.3, at: [f.x, Y_BLUE + 0.02, f.z], e: false }); }
      }),
    P('frame', 'Black frame', 'drive', 3, 0.08, [0, 0, 0], [0, -2.0, 0], 'Frame', 'inferred', ['deck'],
      'The black frame under the body. It carries the arms, the wheels and the two cleaning modules, and shows in the gaps between them.',
      [['Frame', 'Black']],
      (b) => {
        const f = G.box(238, 128, 562, 664);
        b.box(f.w, 0.5, f.d, { m: BLACK, r: 0.3, at: [f.x, 0.6, f.z] });
        for (const x of [330, 470]) for (const y of [118, 682]) { const c = G.box(x - 16, y - 28, x + 16, y + 28); b.box(c.w, 1.2, c.d, { m: BLACK, r: 0.08, at: [c.x, 1.1, c.z] }); }
      }),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'fan-l' : 'fan-r', sd < 0 ? 'Left adsorption fan' : 'Right adsorption fan', 'air', 2, 0.06,
      [0, 0, 0], [sd * 4.0, 1.4, 0], 'Fan', 'inferred', ['xh-k3', 'xh-fac', 'deck'],
      'A fan under a round black grille in the side pod. X-Human lists a self-adsorption propelling system with automatic atmospheric-pressure compensation, a 500 kg adsorption force on a smooth facade, and a boost in an emergency. Fans pulling the robot onto the glass are how this class of robot gets it; X-Human does not label them.',
      [['Adsorption', '500 kg'], ['Emergency', 'Intelligent boost adsorption']],
      (b) => {
        b.at([G.X(sd < 0 ? 245 : 555), Y_BLUE - 0.45, G.Z(400)], () => {
          L.turbine(b, { r: 0.7, h: 0.8 });
          b.cyl(0.78, 0.78, 0.08, { m: 'dark', at: [0, 0.5, 0], seg: 32 });
          b.cyl(0.22, 0.22, 0.12, { m: 'metal', at: [0, 0.55, 0], seg: 14, e: false });
        });
      })),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'module-down' : 'module-up', sd < 0 ? 'Lower cleaning module' : 'Upper cleaning module', 'clean', 1, 0.04,
      [0, 0, 0], [0, 1.2, sd * -5.5], 'Cleaning', 'named', ['deck', 'xh-k3'],
      'A long blue module across the top (or the bottom) of the robot that holds the cleaning gear. X-Human describes a brush-wash-scrape design that goes over each pane several times; the picture does not say which gear sits in each module.',
      [['Method', 'Brush · wash · scrape']],
      (b) => {
        const m = G.box(160, sd < 0 ? 640 : 75, 640, sd < 0 ? 725 : 160);
        b.box(m.w, 1.9, m.d, { m: BLUE, r: 0.4, at: [m.x, 1.15, m.z] });
        b.box(m.w * 0.42, 0.06, m.d * 0.5, { m: BLUE2, r: 0.2, at: [m.x - m.w * 0.27, 2.12, m.z], e: false });
        b.box(m.w * 0.42, 0.06, m.d * 0.5, { m: BLUE2, r: 0.2, at: [m.x + m.w * 0.27, 2.12, m.z], e: false });
        for (const x of [320, 480]) { const c = G.box(x - 18, (sd < 0 ? 640 : 75) + 15, x + 18, (sd < 0 ? 725 : 160) - 15); b.box(c.w, 0.08, c.d, { m: BLACK, r: 0.05, at: [c.x, 2.15, c.z], e: false }); }
        for (const e of [-1, 1]) F.tube(b, [[m.x + e * m.w * 0.36, 1.6, m.z - sd * 0.2], [m.x + e * m.w * 0.3, 2.3, m.z - sd * 0.5], [m.x + e * m.w * 0.3, 2.4, m.z - sd * 1.3]], 0.1, { m: 'rubber', e: false });
      })),
    ...[0, 1].map((k) => P(k ? 'arms-rear' : 'arms-front', k ? 'Rear arms and suction feet' : 'Front arms and suction feet', 'arm', 1, 0.08,
      [0, 0, 0], [0, 1.5, k ? -4.0 : 4.0], 'Arms', 'inferred', ['deck', 'xh-fac'],
      'Two grey arms with a round black foot each, reaching out of the corners of the body. X-Human says the K3 steps over protrusions of 10–30 cm and has anti-bump and anti-collision detection of the building edge; arms that lift and re-plant their feet are how it can. The picture does not label them.',
      [['Obstacles', '10–30 cm']],
      (b) => {
        for (const [a, c] of ARMS.slice(k * 2, k * 2 + 2)) {
          F.bar(b, [G.X(a[0]), 1.3, G.Z(a[1])], [G.X(c[0]), 1.3, G.Z(c[1])], { w: 0.2, h: 0.16, m: GREY, r: 0.04 });
          b.cyl(0.5, 0.5, 0.25, { m: 'rubber', at: [G.X(c[0]), 1.3, G.Z(c[1])], seg: 28 });
          b.cyl(0.18, 0.18, 0.3, { m: 'steel', at: [G.X(c[0]), 1.35, G.Z(c[1])], seg: 12, e: false });
        }
      })),
    P('wheels', 'Wheels', 'drive', 2, 0.1, [0, 0, 0], [0, -1.0, 0], 'Wheels', 'inferred', ['deck'],
      'Four small black wheels beside the body, two a side, that drive the robot across the glass.',
      [['Wheels', '4']],
      (b) => { for (const [x, y] of WHEELS) b.cyl(0.45, 0.45, 0.65, { m: 'rubber', rot: [0, 0, PI / 2], at: [G.X(x), 1.1, G.Z(y)], seg: 24 }); }),
    P('rope', 'Safety rope and self-locking device', 'tether', 1, 0.06, [0, 0, 0], [0, 2.4, 3.4], 'Rope', 'named', ['xh-k3', 'xh-fac', 'deck'],
      'The robot hangs on a safety rope rated for 1,500 kg. A self-locking device keeps it on the rope if the power fails, and X-Human\'s anti-wind and anti-falling design plus an emergency safety system "ensure double guarantees". In X-Human\'s photos the rope runs up from the top end of the robot to the roof. The black hinge at the top end is read as the rope\'s fitting.',
      [['Rope load', '1,500 kg'], ['Power cut', 'Self-locking device']],
      (b) => {
        b.at([G.X(400), Y_WHITE - 0.35, G.Z(165)], () => {
          b.box(1.5, 0.7, 0.9, { m: BLACK, r: 0.15 });
          b.cyl(0.18, 0.18, 0.12, { m: 'steel', at: [0, 0.4, 0], seg: 14, e: false });
        });
        F.tube(b, [[0, Y_WHITE, G.Z(150)], [0.2, Y_WHITE + 0.5, G.Z(150) + 3], [-0.1, Y_WHITE + 0.9, G.Z(150) + 7], [0, Y_WHITE + 1.2, G.Z(150) + 11]], 0.12, { m: { k: 'fabric', id: 'k3-rope', color: 0xd9d2bf, roughness: 0.9 }, e: false });
      }),
    P('vision', 'Vision unit', 'sense', 1, 0.08, [0, 0, 0], [0, 2.4, 2.4], 'Camera', 'inferred', ['xh-fac'],
      'X-Human\'s "Owl" system reads the wall with an RGBD depth camera, AI recognition and SLAM, picks the best path and avoids obstacles. X-Human does not say where it sits on the K3.',
      [['Sensing', 'RGBD camera · AI · SLAM']],
      (b) => { b.at([G.X(400), Y_WHITE - 0.15, G.Z(215)], () => L.camera(b, { w: 0.9, h: 0.4, d: 0.4, lens: 0.12, ring: false })); }),
    P('water', 'Water circulation tank and filter', 'water', 2, 0.12, [0, 0, 0], [0, 0, 3.2], 'Water', 'named', ['xh-k3', 'xh-fac'],
      'A built-in water circulation tank of 9 L. The filter and recycling system recovers the dirty water as it goes, separates the air from the water and filters up to 95% of it, so 8 L of water lasts half a day and no outside water pipe is needed. Cleaning with running water avoids chemical additives on the glass and the greenery below.',
      [['Tank', '9 L'], ['Filtering', 'Up to 95%'], ['Water', '8 L for half a day']],
      (b) => { b.at([-1.4, 1.1, 0.2], () => L.tank(b, { w: 2.8, h: 1.0, d: 3.8, kind: 'clean', fill: 0.6 })); b.at([1.4, 1.1, 0.2], () => L.tank(b, { w: 2.8, h: 1.0, d: 3.8, kind: 'dirty', fill: 0.5 })); b.at([0, 1.1, 3.2], () => L.pump(b)); }),
    P('battery', 'Batteries', 'power', 3, 0.14, [0, 0, 0], [0, -2.6, -2.6], 'Power', 'named', ['xh-k3'],
      'The built-in 48 V, 50 Ah battery, as two packs. X-Human\'s dual-battery system gives about 3 hours of continuous cleaning, and two packs clean one side of a 100 m building. With the water recycled on board the robot needs no outside power, water or gas line.',
      [['Battery', '48 V 50 Ah'], ['Runtime', 'About 3 h']],
      (b) => { for (const x of [-1.6, 1.6]) b.at([x, 0.95, -3.4], () => L.battery(b, { w: 2.8, h: 0.9, d: 3.0 })); }),
    P('controller', 'Control board', 'power', 2, 0.16, [0, 0, 0], [0, -1.6, 1.8], 'Brain', 'inferred', ['xh-k3', 'xh-fac'],
      'Reads the depth camera and plans the route; drives the fans, the wheels, the arms and the cleaning modules. A one-button switch changes between the intelligent and manual modes.',
      [['Modes', 'Intelligent · manual (one button)']],
      (b) => { b.at([0, 1.25, -0.4], () => L.pcb(b, { w: 2.2, d: 2.8 })); }),
  ],
};
