// RJ-Bot Q40 multi-function duct and floor cleaning robot. Y up, +Z front, 1 unit = 100 mm.
// What it does comes from RJ-Bot's Q40 page: ducts 25–75 cm with a telescopic arm that extends 1.2 m, a rotating
// floor scrubber with water spray, three cameras with LED and IR lights, a vacuum port of 3,000 W and a water
// injection of 2 L a minute. RJ-Bot publishes no size, so the size here is estimated from the product picture in
// the product deck: a blue four-wheel body, a black telescopic arm with a round brush, two side brushes at the nose
// and a rugged control case. The inside is a schematic reconstruction, not CAD.
import * as THREE from 'three';
import * as L from '../lib.js';
import * as F from '../field.js';

const PI = Math.PI;
const P = (id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build) => ({ id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build });
const BLUE = { k: 'shell', id: 'q40-blue', color: 0x1d46b8, metalness: 0.25, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 };
const BLUE2 = { k: 'shellDk', id: 'q40-blue2', color: 0x16368c, metalness: 0.25, roughness: 0.38, clearcoat: 0.5 };
const BLACK = { k: 'shell', id: 'q40-black', color: 0x15171a, metalness: 0.2, roughness: 0.45, clearcoat: 0.3 };
const BLACK2 = { k: 'shellDk', id: 'q40-black2', color: 0x0e1012, metalness: 0.2, roughness: 0.4 };
const ALLOY = { k: 'hubGrey', id: 'q40-alloy', color: 0xc9ced3, metalness: 0.85, roughness: 0.25 };
const CHROME = { k: 'silver', id: 'q40-chrome', color: 0xe3e7ea, metalness: 0.95, roughness: 0.15 };

const WX = 1.85, WZ = 1.9, WR = 0.85, BY = 1.05; // wheels (half track, half wheelbase, radius) and the body's centre height
const AIM = new THREE.Vector3(0, Math.sin(0.62), Math.cos(0.62));
const ARM0 = new THREE.Vector3(0, 2.0, -1.2);    // the black housing at the back of the body
const BOOM = 3.6;                                // how far the boom reaches in the picture

export default {
  id: 'rj-q40',
  name: 'RJ Bots Q40',
  short: 'Q40',
  maker: 'Guangzhou RJ-Bot Industrial Group',
  blurb: 'Hybrid duct and floor cleaning robot: a four-wheel body with a telescopic arm and a round brush for ducts 25–75 cm, and a rotating scrubber with water spray for floors.',
  accent: '#ffd166', accent2: '#3de0ff',
  studio: { accent: '#1d46b8', accent2: '#9a6b00' },
  hover: 1.0,
  race: false, noDock: true,
  mats: { studio: { shell: { color: 0x15171a, metalness: 0.2, roughness: 0.45, clearcoat: 0.3 }, shellDk: { color: 0x0e1012, metalness: 0.2, roughness: 0.4 }, trim: { color: 0x2a2e33 } } },
  kpis: [['Ducts', '25–75 cm'], ['Arm reach', '1.2 m'], ['Vacuum port', '3,000 W']],
  stats: [
    ['Ducts', '25–75 cm (page) · 28–75 cm working height (spec image) · pipes from 15 cm to detect'],
    ['Weight', '19 kg robot · 4.65 kg control box (spec image)'],
    ['Arm', 'Telescopic, 1.2 m extension'],
    ['Floor mode', 'Rotating scrubber with water spray'],
    ['Cameras', '3: front, side and rear (page) · two (spec image), infrared HD night vision, 3 flashing LED lights'],
    ['Screen', '1024 × 1200 px · control box 420 × 180 × 320 mm'],
    ['Vacuum port', '3,000 W, HEPA, connects to an external unit'],
    ['Water', 'Injection of 2 L/min, adjustable'],
    ['Cable', '15 m, customisable · 220 V 50 Hz'],
    ['Body', 'Composite material'],
    ['Floors', 'Up to 1,500 m² (RJ-Bot)'],
  ],
  notes: [
    'RJ-Bot\'s Q40 page mixes two machines. Its text (a telescopic arm of 1.2 m, a floor scrubber, a water spray, three cameras) and your deck\'s picture are the blue four-wheel robot with two side brushes. Its spec image (19 kg robot, 4.65 kg control box, 28–75 cm, two cameras) and most of its pictures show a yellow tracked machine, the one your deck labels KT-976. The numbers of both are listed; RJ-Bot publishes no size for the blue robot, so its size is estimated from the picture.',
    'The outside follows the deck\'s picture: a blue body, four silver alloy wheels, a black housing and a black telescopic boom that carries a round brush, a chrome handle at the back, two side brushes under the nose, and a rugged black control case with a screen. The brush is shown raised, as in the picture.',
    'RJ-Bot calls the Q40 the first hybrid air duct cleaning machine with a floor scrubber, and says it connects to an industrial vacuum cleaner for the vacuuming. The vacuum unit and the floor tank and pump are not in the picture and are not modelled.',
  ],
  sources: ['deck', 'rj-q40', 'rj-hvac'],

  parts: [
    P('top-cover', 'Body cover', 'shell', 0, 0, [0, 0, 0], [0, 3.2, 0.4], 'Cover', 'named', ['deck', 'rj-q40'],
      'The blue body cover over the electronics, with a stainless handle at the back and small lamps on the nose. It lifts off first.',
      [['Finish', 'Blue painted body']],
      (b) => {
        b.box(3.5, 0.9, 5.2, { m: BLUE, r: 0.18, at: [0, BY + 0.1, 0.3] });
        b.box(2.6, 0.1, 3.2, { m: BLUE2, r: 0.04, at: [0, BY + 0.6, 0.3], e: false });
        for (const x of [-1.2, 1.2]) b.cyl(0.09, 0.09, 0.05, { m: 'lamp', rot: [PI / 2, 0, 0], at: [x, BY + 0.3, 2.9], seg: 12, e: false });
      }),
    P('handle', 'Carry handle', 'shell', 0, 0.03, [0, 0, 0], [0, 2.4, -2.2], 'Handle', 'named', ['deck'],
      'A bent chrome bar across the back of the body for lifting the robot into a duct opening or onto a trolley.',
      [['Material', 'Chrome-plated steel']],
      (b) => {
        F.rod(b, [-1.3, BY + 0.6, -2.0], [-1.3, BY + 1.1, -1.5], 0.07, { m: CHROME, seg: 10, e: false });
        F.rod(b, [1.3, BY + 0.6, -2.0], [1.3, BY + 1.1, -1.5], 0.07, { m: CHROME, seg: 10, e: false });
        F.rod(b, [-1.3, BY + 1.1, -1.5], [1.3, BY + 1.1, -1.5], 0.07, { m: CHROME, seg: 10, e: false });
      }),
    P('chassis', 'Chassis', 'drive', 3, 0.06, [0, 0, 0], [0, -1.2, 0], 'Frame', 'inferred', ['deck'],
      'The steel frame under the cover that carries the axles, the arm housing and the side brushes.',
      [['Frame', 'Steel']],
      (b) => { b.box(3.3, 0.5, 5.0, { m: BLUE2, r: 0.1, at: [0, BY - 0.45, 0.3] }); }),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'wheels-r' : 'wheels-l', sd < 0 ? 'Right wheels' : 'Left wheels', 'drive', 2, 0.08,
      [0, 0, 0], [sd * 3.0, -0.1, 0], 'Wheels', 'named', ['deck'],
      'Two black tyres on silver multi-spoke alloy wheels. They carry the robot along the floor of the duct and across the floor of a room in floor mode.',
      [['Wheels', '4 (two a side)']],
      (b) => {
        for (const z of [-WZ, WZ]) b.at([sd * WX, WR, z], () => {
          L.tyreWheel(b, { r: WR, w: 0.6, side: sd, hubM: ALLOY, motor: false });
          b.cyl(0.35, 0.35, 0.05, { m: 'dark', rot: [0, 0, PI / 2], at: [sd * 0.31, 0, 0], seg: 14, e: false });
        });
      })),
    P('drive-motors', 'Wheel motors', 'drive', 3, 0.12, [0, 0, 0], [0, -2.0, 0], 'Drive', 'inferred', ['rj-q40'],
      'The motors that turn the wheels, inside the body. RJ-Bot does not list them.',
      [['Drive', 'Four wheels']],
      (b) => { for (const sd of [-1, 1]) b.cyl(0.3, 0.3, 1.0, { m: 'metal', rot: [0, 0, PI / 2], at: [sd * 0.9, BY - 0.2, 0.2], seg: 20 }); }),
    P('controller', 'Control board', 'power', 2, 0.14, [0, 0, 0], [0, -1.6, -2.4], 'Brain', 'inferred', ['rj-q40'],
      'Drives the wheels, the arm, the brushes and the water, and sends three camera pictures to the screen on the control case.',
      [['Cameras', '3 pictures to the screen']],
      (b) => { b.at([0, BY - 0.1, 0.5], () => L.pcb(b, { w: 2.0, d: 2.6 })); }),

    P('arm-housing', 'Arm housing and camera', 'arm', 1, 0.02, [0, 0, 0], [0, 2.4, -2.8], 'Arm base', 'named', ['deck', 'rj-q40'],
      'The big black housing at the back of the body. It holds the arm\'s drive and a camera that looks along the boom. RJ-Bot says the telescopic arm can extend 1.2 m.',
      [['Arm', 'Telescopic, 1.2 m extension']],
      (b) => {
        b.at([ARM0.x, ARM0.y, ARM0.z], () => {
          b.box(1.9, 1.5, 2.0, { m: BLACK, r: 0.16 });
          b.cyl(0.33, 0.33, 0.1, { m: 'lens', rot: [PI / 2, 0, 0], at: [0.35, 0.2, 1.04], seg: 20 });
        });
        b.cyl(0.22, 0.22, 0.9, { m: 'steel', at: [0, BY + 0.2, -1.5], seg: 16, e: false });
      }),
    P('boom', 'Telescopic boom', 'arm', 1, 0.06, [0, 0, 0], [0, 3.0, 1.2], 'Boom', 'named', ['deck', 'rj-q40'],
      'The black boom that slides out of the housing, carrying the brush into the middle of the duct. Ducts of 25–75 cm are within reach, with single or double brushes.',
      [['Reach', '1.2 m extension'], ['Ducts', '25–75 cm']],
      (b) => {
        const a = [ARM0.x, ARM0.y + 0.2, ARM0.z + 0.8];
        const c = [AIM.x * BOOM + a[0], AIM.y * BOOM + a[1], AIM.z * BOOM + a[2]];
        F.rod(b, a, c, 0.42, { m: BLACK, seg: 22 });
        F.rod(b, [a[0], a[1], a[2]], [a[0] + AIM.x * 1.2, a[1] + AIM.y * 1.2, a[2] + AIM.z * 1.2], 0.52, { m: BLACK2, seg: 22, e: false });
      }),
    P('brush', 'Round brush', 'clean', 2, 0.1, [0, 0, 0], [0, 2.6, 3.0], 'Brush', 'named', ['deck', 'rj-q40'],
      'A round brush of black nylon bristles on a white hub at the end of the boom. It cleans duct walls; the machine takes single or double brushes and interchangeable sets.',
      [['Bristle', 'Nylon'], ['Set-ups', 'Single or double, interchangeable']],
      (b) => {
        const t = ARM0.clone().add(new THREE.Vector3(0, 0.2, 0.8)).addScaledVector(AIM, BOOM + 0.9);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), AIM);
        const e = new THREE.Euler().setFromQuaternion(q);
        b.at([t.x, t.y, t.z], () => F.bottleBrush(b, { r: 1.85, len: 1.6, rings: 14, per: 46, m: { k: 'bristle', id: 'q40-bristle', color: 0x0b0c0d }, hubM: 'dark', thick: 0.012 }), [e.x, e.y, e.z]);
      }),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'side-brush-r' : 'side-brush-l', sd < 0 ? 'Right side brush' : 'Left side brush', 'clean', 2, 0.1,
      [0, 0, 0], [sd * 2.2, -1.2, 2.2], 'Scrubber', 'named', ['deck', 'rj-q40'],
      'A grey housing with a black round brush under the nose. In floor mode the two brushes scrub, with the water spray in front of them.',
      [['Floor mode', 'Rotating scrubber + water spray']],
      (b) => {
        b.at([sd * 1.0, 0.65, 2.9], () => {
          b.cyl(0.5, 0.5, 0.35, { m: 'metal', seg: 24 });
          F.bottleBrush(b, { r: 1.0, len: 0.3, rings: 3, per: 26, m: { k: 'bristle', id: 'q40-side', color: 0x0b0c0d }, hub: false, thick: 0.013 });
        }, [PI / 2, 0, 0]);
      })),
    P('spray', 'Water spray jets', 'water', 2, 0.14, [0, 0, 0], [0, -0.8, 3.0], 'Water', 'named', ['rj-q40'],
      'Retractable jets in front of the side brushes. RJ-Bot\'s water injection runs at 2 L a minute, adjustable, and dissolves stubborn grease in ducts and on floors.',
      [['Flow', '2 L/min, adjustable']],
      (b) => { for (const x of [-0.6, 0.6]) b.cyl(0.07, 0.07, 0.5, { m: 'steel', rot: [PI / 2, 0, 0], at: [x, 0.55, 3.15], seg: 10, e: false }); }),
    P('cameras', 'Cameras and lights', 'sense', 1, 0.08, [0, 0, 0], [0, 1.4, 2.6], 'Camera', 'named', ['rj-q40'],
      'Three cameras, front, side and rear, with LED and infrared lights, stream the duct to the screen on the control case.',
      [['Cameras', '3'], ['Lights', 'LED + IR']],
      (b) => {
        b.at([0, BY + 0.55, 2.7], () => L.camera(b, { w: 0.6, h: 0.34, d: 0.3, lens: 0.11, ring: false }));
        b.at([ARM0.x + 0.95, ARM0.y + 0.1, ARM0.z + 0.2], () => b.at([0, 0, 0], () => L.camera(b, { w: 0.4, h: 0.3, d: 0.25, lens: 0.09, ring: false }), [0, PI / 2, 0]));
      }),
    P('case', 'Control case', 'ui', 0, 0.02, [-6.0, 0, -2.0], [-2.6, 0.4, 0], 'Monitor', 'named', ['deck', 'rj-q40'],
      'A rugged black hard case with the screen in the lid and the controls on its panel: a joystick, switches and a power display. It shows the three camera pictures and records them.',
      [['Pictures', '3 cameras, recorded']],
      (b) => { F.ruggedCase(b, { w: 4.2, d: 3.2, h: 1.4, lid: 1.8 }); }),
    P('cable', 'Cable', 'tether', 1, 0.1, [0, 0, 0], [0, 0, -3.0], 'Cable', 'inferred', ['rj-q40'],
      'The cable to the control case: power, drive signals and the camera pictures.',
      [['Link', 'Cable to the control case']],
      (b) => { F.tube(b, [[-0.5, BY - 0.2, -2.4], [-1.8, 0.3, -3.4], [-3.4, 0.2, -3.0], [-5.0, 0.2, -2.6]], 0.14, { m: { k: 'rubber', id: 'q40-cable', color: 0x1b1e21 } }); }),
  ],
};
