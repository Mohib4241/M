// RJ-Bot Q38 air duct cleaning robot. Y up, +Z front, 1 unit = 100 mm.
// What it can do comes from RJ-Bot's Q38 page: ducts 200–750 mm, five brush set-ups, three HD cameras, a control
// box on a cable. RJ-Bot publishes no size for it, so the size here is estimated from the product picture in the
// product deck and the duct range. The outside follows that picture: a flat black four-wheel chassis, a tall tilted
// arm and a head with two white nylon brushes. The inside is a schematic reconstruction, not CAD.
import * as THREE from 'three';
import * as L from '../lib.js';
import * as F from '../field.js';

const PI = Math.PI;
const P = (id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build) => ({ id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build });
const BLACK = { k: 'shell', id: 'q38-black', color: 0x15171a, metalness: 0.2, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.35 };
const BLACK2 = { k: 'shellDk', id: 'q38-black2', color: 0x0e1012, metalness: 0.2, roughness: 0.4 };
const WHITE = { k: 'bristle', id: 'q38-nylon', color: 0xf1f2ee, roughness: 0.9 };
const ALLOY = { k: 'hubGrey', id: 'q38-alloy', color: 0xb9bec3, metalness: 0.7, roughness: 0.3 };
const ORANGE = { k: 'yellow', id: 'q38-orange', color: 0xe9731c, emissive: 0x000000 };

const WX = 1.5, WZ = 1.55, WR = 0.62;           // wheels: half track, half wheelbase, radius
const BASE = { y: 0.78, h: 0.62 };               // the chassis box sits on the axles
const HEAD = new THREE.Vector3(0, 5.3, 0.4);     // the head with the camera and the two brushes
const ARM0 = new THREE.Vector3(0, 1.5, -1.55);   // the foot of the arm, at the back of the deck

export default {
  id: 'rj-q38',
  name: 'RJ Bots Q38',
  short: 'Q38',
  maker: 'Guangzhou RJ-Bot Industrial Group',
  blurb: 'Air duct cleaning robot for ducts 200–750 mm across: a four-wheel crawler with a lifting arm, two rotating nylon brushes and three HD cameras.',
  accent: '#ffd166', accent2: '#3de0ff',
  studio: { accent: '#9a6b00', accent2: '#0a8f9c' },
  hover: 1.0,
  race: false, noDock: true,
  mats: { studio: { shell: { color: 0x15171a, metalness: 0.2, roughness: 0.45, clearcoat: 0.3 }, shellDk: { color: 0x0e1012, metalness: 0.2, roughness: 0.4 }, trim: { color: 0x2a2e33 } } },
  kpis: [['Ducts', '200–750 mm'], ['Modes', '5 brush set-ups'], ['Cameras', '3 HD']],
  stats: [
    ['Ducts', '200–750 mm'],
    ['Cleaning modes', '5: dual side brushes, single large brush, small brush, dual bottom brushes, inspection'],
    ['Cameras', '3 HD, recorded on the control box'],
    ['Brushes', 'Soft nylon, in modular sets'],
    ['Dust', 'Negative-pressure vacuum (a W40 unit is recommended)'],
    ['Cable', '15 m, configured to the job'],
    ['In the box', 'Control box, power and shielded cables, short brush, brush, adapter, memory card, remote control'],
    ['Maker', 'In business since 2008 · CE · 1-year warranty'],
  ],
  notes: [
    'RJ-Bot publishes no size or weight for the Q38. The size of the model is our estimate from the product picture and the 200–750 mm duct range; treat it as a picture, not a measurement.',
    'RJ-Bot\'s own Q38 page shows a blue four-wheel robot with a black round brush and side brushes at the nose (the picture your deck uses for the Q40), and a front view with two white brushes. The deck\'s Q38 picture (black chassis, orange wheel caps, two white brushes) is not on RJ-Bot\'s page. The model follows the deck\'s picture.',
    'The outside follows the deck\'s picture: a flat black chassis with a slot down the middle, four black tyres on silver alloy wheels with orange caps, a tall tilted arm and a head with two white nylon brushes and a camera. The picture shows the brushes in the big set-up.',
    'RJ-Bot sells the Q38 with a control box (three HD cameras recorded on it), a power cable, a shielded cable, a short brush, a brush, an adapter, a memory card and a remote control; it recommends its W40 negative-air vacuum. These are not on the robot and are not modelled. The dual bottom brushes of the fourth set-up are not in the picture either.',
  ],
  sources: ['deck', 'rj-q38', 'rj-hvac'],

  parts: [
    P('top-cover', 'Top cover', 'shell', 0, 0, [0, 0, 0], [0, 3.0, 0], 'Deck', 'named', ['deck', 'rj-q38'],
      'The black top plates of the chassis, in two halves with a slot between them. White knobs and lamps sit on the corners, and the arm stands on the rear of the deck.',
      [['Finish', 'Black painted steel']],
      (b) => {
        for (const sd of [-1, 1]) b.box(1.0, 0.1, 3.9, { m: BLACK, r: 0.04, at: [sd * 0.78, BASE.y + BASE.h / 2 + 0.05, 0.0] });
        b.box(0.5, 0.1, 3.9, { m: BLACK2, r: 0.02, at: [0, BASE.y + BASE.h / 2 + 0.0, 0.0], e: false });
        for (const [x, z] of [[-1.15, -1.7], [1.15, -1.7], [-1.15, 1.7], [1.15, 1.7], [0, 0]]) b.cyl(0.04, 0.04, 0.03, { m: 'steel', at: [x, BASE.y + BASE.h / 2 + 0.11, z], seg: 8, e: false });
      }),
    P('chassis', 'Chassis', 'shell', 0, 0.04, [0, 0, 0], [0, -0.6, 0], 'Body', 'named', ['deck', 'rj-q38'],
      'A flat black box that carries the four wheels, the arm and the electronics. The front corners are cut away round the lamp.',
      [['Material', 'Black painted steel']],
      (b) => {
        b.box(2.5, BASE.h, 4.6, { m: BLACK, r: 0.1, at: [0, BASE.y, 0] });
        b.box(2.7, 0.14, 0.2, { m: 'trim', r: 0.03, at: [0, BASE.y - 0.1, 2.35], e: false });
      }),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'wheels-r' : 'wheels-l', sd < 0 ? 'Right wheels' : 'Left wheels', 'drive', 2, 0.06,
      [0, 0, 0], [sd * 2.8, -0.2, 0], 'Wheels', 'named', ['deck', 'rj-q38'],
      'Two black tyres on silver alloy wheels with orange centre caps. They give the robot "strong climbing and obstacle-crossing ability", in RJ-Bot\'s words.',
      [['Wheels', '4 (two a side)']],
      (b) => {
        for (const z of [-WZ, WZ]) b.at([sd * WX, WR, z], () => {
          L.tyreWheel(b, { r: WR, w: 0.5, side: sd, hubM: ALLOY, motor: false });
          b.cyl(0.1, 0.1, 0.06, { m: ORANGE, rot: [0, 0, PI / 2], at: [sd * 0.27, 0, 0], seg: 14, e: false });
        });
      })),
    P('drive-motors', 'Wheel motors', 'drive', 3, 0.1, [0, 0, 0], [0, -1.8, 0], 'Drive', 'inferred', ['rj-q38'],
      'A motor inside the chassis for each side. RJ-Bot does not list them; four-wheel crawlers of this kind use gear motors.',
      [['Drive', 'Four wheels']],
      (b) => { for (const sd of [-1, 1]) b.cyl(0.26, 0.26, 0.9, { m: 'metal', rot: [0, 0, PI / 2], at: [sd * 0.7, BASE.y, 0], seg: 20 }); }),
    P('controller', 'Control board', 'power', 2, 0.12, [0, 0, 0], [0, -1.4, -2.2], 'Brain', 'inferred', ['rj-q38'],
      'The board in the chassis that drives the wheels, the arm and the brushes and carries the three camera pictures up the cable to the control box.',
      [['Link', 'Cable to the control box']],
      (b) => { b.at([0, BASE.y + 0.05, -0.2], () => L.pcb(b, { w: 1.6, d: 2.2 })); }),
    P('lamps', 'Lamps', 'sense', 1, 0.08, [0, 0, 0], [0, 1.2, 1.8], 'Light', 'named', ['deck'],
      'A white lamp at the front of the chassis and white knobs on the deck corners light the duct for the cameras.',
      [['Lights', 'White LED']],
      (b) => {
        b.cyl(0.14, 0.14, 0.06, { m: 'lamp', rot: [PI / 2, 0, 0], at: [-0.6, BASE.y - 0.05, 2.33], seg: 16 });
        for (const [x, z] of [[-1.15, -1.7], [1.15, -1.7], [1.15, 1.7]]) b.cyl(0.14, 0.14, 0.08, { m: 'fabric', at: [x, BASE.y + BASE.h / 2 + 0.16, z], seg: 18 });
      }),

    P('arm', 'Lifting arm', 'arm', 1, 0.02, [0, 0, 0], [0, 2.0, -2.4], 'Lift', 'named', ['deck', 'rj-q38'],
      'A black arm with a silver tube that stands on the rear of the deck, leans forward and lifts the brush head into the middle of the duct. RJ-Bot calls the brushes\' mount a "lifting swing arm" that tilts the brushes to follow the duct wall.',
      [['Lift', 'Tilting arm, from the floor of the duct to its middle']],
      (b) => {
        b.box(1.0, 0.5, 0.9, { m: BLACK2, r: 0.06, at: [ARM0.x, ARM0.y, ARM0.z] });
        F.bar(b, [0, ARM0.y + 0.2, ARM0.z], [HEAD.x, HEAD.y - 0.7, HEAD.z - 0.2], { w: 0.55, h: 0.5, m: BLACK2, r: 0.06 });
        F.rod(b, [-0.2, ARM0.y + 0.4, ARM0.z + 0.1], [-0.15, HEAD.y - 1.2, HEAD.z - 0.5], 0.17, { m: 'silver', seg: 20 });
      }),
    P('head', 'Brush head and camera', 'sense', 1, 0.06, [0, 0, 0], [0, 3.0, 0.8], 'Head', 'named', ['deck', 'rj-q38'],
      'A black head at the top of the arm that holds both brushes and a camera on the middle. RJ-Bot lists three HD cameras in all, which it records on the control box as proof of work.',
      [['Cameras', '3 HD (head, front, rear)']],
      (b) => {
        b.at([HEAD.x, HEAD.y, HEAD.z], () => {
          b.box(0.9, 0.9, 1.0, { m: BLACK2, r: 0.1 });
          b.cyl(0.4, 0.4, 0.5, { m: 'dark', rot: [0, 0, PI / 2], at: [0.55, 0, 0], seg: 20 });
          b.at([0, 0.55, 0.1], () => L.camera(b, { w: 0.5, h: 0.36, d: 0.3, lens: 0.11, ring: false }));
        });
      }),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'brush-r' : 'brush-l', sd < 0 ? 'Rear nylon brush' : 'Front nylon brush', 'clean', 2, 0.08,
      [0, 0, 0], [0, 3.4 + (sd > 0 ? 0.6 : 0), sd * 3.2], 'Brush', 'named', ['deck', 'rj-q38'],
      'One of two big brushes of soft white nylon that spin on the head. Nylon will not scratch the duct, which a steel brush would. The brushes swap for other set-ups in under a minute.',
      [['Bristle', 'Soft nylon'], ['Set-ups', '5 (dual side, single, small, dual bottom, inspection)']],
      (b) => { b.at([HEAD.x, HEAD.y, HEAD.z + sd * 1.15], () => F.bottleBrush(b, { r: 2.0, len: 1.5, rings: 14, per: 80, m: WHITE, hubM: WHITE, thick: 0.022, core: 0.28, lean: 0.05 })); })),
    P('cable', 'Cable', 'tether', 1, 0.08, [0, 0, 0], [0, 0, -3.0], 'Cable', 'named', ['rj-q38'],
      'The cable from the robot to the control box, 15 m in the usual set-up. It carries power, the drive signals and the three camera pictures.',
      [['Length', '15 m (configured to the job)']],
      (b) => { F.tube(b, [[0.3, BASE.y - 0.1, -2.3], [0.6, 0.35, -3.6], [-0.5, 0.2, -5.0], [0.3, 0.2, -6.4]], 0.13, { m: { k: 'rubber', id: 'q38-cable', color: 0x1b1e21 } }); }),
  ],
};
