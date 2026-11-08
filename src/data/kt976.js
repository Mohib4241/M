// Kuaitong KT-976 duct cleaning robot. Y up, +Z front, 1 unit = 100 mm.
// The numbers come from Kuaitong's data sheet for the KT-976. The outside follows the product picture in the
// product deck (a black tracked crawler with yellow track frames, a wide suction head, a yellow arm that
// carries a motor and a round brush, and a rugged control case with a monitor); where parts sit inside is
// a schematic reconstruction, not CAD.
import * as THREE from 'three';
import * as L from '../lib.js';
import * as F from '../field.js';

const PI = Math.PI;
// size of the crawler: 650 × 310 × 160 mm (data sheet); the head is the front 3.9 units, the tracks the rear
const TOP = 1.6;                  // the head's top, and the robot's height without the arm
const TRK = { len: 2.5, h: 1.1, w: 0.9, x: 1.05, z: -1.75 };
const HEAD = { z0: 0.1, z1: 3.55, w: 3.1, h: 1.3 };
const DECK = { y: 1.2, z0: -3.0, z1: 0.4, hw: 0.95 };
const AIM = new THREE.Vector3(0, Math.sin(0.5), Math.cos(0.5)); // the motor and brush point up and forward
const TIP = [0, 2.55, 0.55];     // where the motor meets the arm
const quat = (v) => new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), v));
const AIMROT = [quat(AIM).x, quat(AIM).y, quat(AIM).z];
const BLACK = { k: 'shell', id: 'kt-black', color: 0x17191c, metalness: 0.15, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.35 };
const BLACK2 = { k: 'shellDk', id: 'kt-black2', color: 0x0f1113, metalness: 0.15, roughness: 0.45 };
const GREY = { k: 'metal', id: 'kt-grey', color: 0x9a9fa5, metalness: 0.7, roughness: 0.35 };

export default {
  id: 'kt-976',
  name: 'Kuaitong KT-976',
  short: 'KT-976',
  maker: 'Anhui Kuaitong Technologies',
  blurb: 'Duct cleaning robot for air conditioning ducts: a tracked crawler that brushes and vacuums at the same time, with front and rear cameras on a control case.',
  accent: '#ffd166', accent2: '#3de0ff',
  studio: { accent: '#b8860b', accent2: '#0a8f9c' },
  hover: 1.0,
  race: false, noDock: true,
  mats: { studio: { shell: { color: 0x17191c, metalness: 0.15, roughness: 0.5, clearcoat: 0.3 }, shellDk: { color: 0x0f1113, metalness: 0.15, roughness: 0.45 }, trim: { color: 0x2a2e33 } } },
  kpis: [['Ducts', '250–800 mm'], ['Suction', '2,000 m³/h'], ['Robot', '11 kg']],
  stats: [
    ['Robot size', '650 × 310 × 160 mm'],
    ['Robot weight', '11 kg'],
    ['Main unit', '480 × 500 × 700 mm · 43 kg'],
    ['Ducts', '250–800 mm'],
    ['Power', '2,800 W · 220–240 V / 110 V'],
    ['Robot supply', '24 V low voltage'],
    ['Suction', '2,000 m³/h (1,180 CFM)'],
    ['Brush speed', '500 rpm'],
    ['Cameras', '2 × 1080P, front and rear'],
    ['Screen', '10-inch HD monitor'],
    ['Hose', '50 mm × 15 m (up to 20 m)'],
    ['Warranty', '1 year'],
  ],
  notes: [
    'Kuaitong\'s own KT-976 page carries pictures of a different machine from the one in the product deck: a black four-wheel robot with orange wheel caps and a long arm with a round brush. The deck\'s picture (yellow track frames, a wide suction head, a yellow arm) is the same machine RJ-Bot shows on its Q40 page. The model follows the deck\'s picture, as asked; the figures are Kuaitong\'s data sheet for the KT-976.',
    'Kuaitong\'s pages disagree with each other: the data sheet table gives an 11 kg robot of 650 × 310 × 160 mm and a 2,000 m³/h suction; a long marketing text on a sister page describes a 28 kg crawler with a HEPA filter and other figures. The data sheet table is used here.',
    'The outside follows the product picture in the deck: black chassis, yellow track frames, a wide suction head at the front, a yellow arm that carries a motor and a round brush, and a separate control case with a monitor. The brush is shown raised, as in the picture.',
    'The 43 kg main unit (the vacuum and power unit, 480 × 500 × 700 mm) is in the data sheet but is not in the picture, so it is not modelled. Kuaitong says the vacuums sit on the top and the bottom of the robot and two negative-pressure fans work together; where the fans sit in the head is our reading.',
  ],
  sources: ['deck', 'kt-976', 'kt-976-d'],

  parts: [
    // ───────────── Shell & covers ─────────────
    {
      id: 'top-cover', name: 'Top cover', group: 'shell', layer: 0, delay: 0,
      home: [0, 0, 0], ex: [0, 3.2, -0.8], tag: 'Deck', conf: 'named', src: ['deck', 'kt-976'],
      desc: 'The black deck plate over the tracked chassis. The arm stands on it, behind the head. It lifts off first.',
      specs: [['Robot height', '160 mm (without the arm)']],
      build(b) {
        b.box(DECK.hw * 2, 0.22, DECK.z1 - DECK.z0, { m: BLACK, r: 0.08, at: [0, DECK.y, (DECK.z0 + DECK.z1) / 2] });
        b.box(1.0, 0.06, 0.9, { m: 'trim', r: 0.04, at: [0, DECK.y + 0.14, 0.0], e: false }); // the arm's mounting plate
        for (const [x, z] of [[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.3], [0.4, 0.3]]) b.cyl(0.05, 0.05, 0.05, { m: 'steel', at: [x, DECK.y + 0.19, z], seg: 10, e: false });
      },
    },
    {
      id: 'head-shell', name: 'Suction head', group: 'shell', layer: 0, delay: 0.04,
      home: [0, 0, 0], ex: [0, 1.0, 3.4], tag: 'Head', conf: 'named', src: ['deck', 'kt-976'],
      desc: 'The wide black housing at the front. The suction opening is at its nose, behind a grey filter pad, and two small lamps sit on its top face. It is as wide as the robot, 310 mm.',
      specs: [['Width', '310 mm'], ['Suction', '2,000 m³/h (the whole machine)']],
      build(b) {
        const zc = (HEAD.z0 + HEAD.z1) / 2, d = HEAD.z1 - HEAD.z0;
        b.box(HEAD.w, HEAD.h, d, { m: BLACK, r: 0.16, at: [0, HEAD.h / 2, zc] });
        b.box(HEAD.w - 0.4, 0.04, d - 0.5, { m: BLACK2, r: 0.04, at: [0, HEAD.h + 0.015, zc - 0.05], e: false });
        for (const x of [-1.2, 1.2]) b.cyl(0.07, 0.07, 0.05, { m: 'lamp', at: [x, HEAD.h + 0.04, HEAD.z1 - 0.25], seg: 12, e: false });
        b.box(0.18, 0.1, 0.05, { m: 'green', at: [-HEAD.w / 2 + 0.2, HEAD.h - 0.2, HEAD.z0 + 0.1], e: false });
      },
    },

    // ───────────── Cleaning ─────────────
    {
      id: 'arm', name: 'Arm', group: 'arm', layer: 1, delay: 0.02,
      home: [0, 0, 0], ex: [0, 1.6, -1.8], tag: 'Lift arm', conf: 'named', src: ['deck', 'kt-976'],
      desc: 'A yellow bracket on the deck with two grey linear actuators. It raises the motor and the brush off the floor of the duct and tips them forward, so the brush can reach the top and the sides of a duct 250–800 mm across.',
      specs: [['Reach', 'Brush centred in the duct (250–800 mm)']],
      build(b) {
        const base = [0, DECK.y + 0.2, -0.6];
        b.box(1.3, 0.22, 0.8, { m: 'yellow', r: 0.06, at: base });
        // two grey linear actuators from the deck to the cheeks, and the yellow cheeks up to the motor
        for (const x of [-0.38, 0.38]) {
          F.rod(b, [x, DECK.y + 0.3, -0.75], [x, 2.15, 0.1], 0.13, { m: GREY, seg: 18 });
          F.rod(b, [x, 1.9, -0.05], [x, 2.55, 0.35], 0.075, { m: 'steel', seg: 12, e: false });
        }
        for (const x of [-0.55, 0.55]) F.bar(b, [x, DECK.y + 0.3, -0.7], [x, TIP[1], TIP[2]], { w: 0.12, h: 0.2, m: 'yellow', r: 0.04 });
        F.rod(b, [-0.62, TIP[1], TIP[2]], [0.62, TIP[1], TIP[2]], 0.2, { m: 'steel', seg: 14, e: false });
      },
    },
    {
      id: 'brush-motor', name: 'Brush motor', group: 'clean', layer: 2, delay: 0.04,
      home: [0, 0, 0], ex: [0, 2.0, 0.6], tag: 'Spin', conf: 'inferred', src: ['deck', 'kt-976'],
      desc: 'The motor that spins the brush, in a grey housing at the end of the arm with a black collar. Kuaitong gives a brush speed of 500 rpm.',
      specs: [['Brush speed', '500 rpm']],
      build(b) {
        b.at(TIP, () => {
          b.cyl(0.36, 0.36, 1.2, { m: GREY, rot: [PI / 2, 0, 0], at: [0, 0, 0.5], seg: 24 });
          b.cyl(0.43, 0.43, 0.26, { m: 'dark', rot: [PI / 2, 0, 0], at: [0, 0, 1.15], seg: 24 });
          b.cyl(0.14, 0.14, 0.4, { m: 'steel', rot: [PI / 2, 0, 0], at: [0, 0, 1.4], seg: 14, e: false });
        }, AIMROT);
      },
    },
    {
      id: 'brush', name: 'Round brush', group: 'clean', layer: 2, delay: 0.08,
      home: [0, 0, 0], ex: [0, 2.6, 2.2], tag: 'Brush', conf: 'named', src: ['deck', 'kt-976'],
      desc: 'A round brush of black bristles, about 360 mm across, that spins at 500 rpm and loosens the dust from the duct wall. It swaps for a smaller brush for narrower ducts.',
      specs: [['Brush', 'About 360 mm across in the picture'], ['Speed', '500 rpm']],
      build(b) {
        b.at([TIP[0] + AIM.x * 2.3, TIP[1] + AIM.y * 2.3, TIP[2] + AIM.z * 2.3], () => {
          F.bottleBrush(b, { r: 1.75, len: 1.7, rings: 16, per: 52, m: { k: 'bristle', id: 'kt-bristle', color: 0x0b0c0d }, hubM: 'dark' });
        }, AIMROT);
      },
    },
    {
      id: 'suction-pad', name: 'Suction opening and filter pad', group: 'air', layer: 1, delay: 0.06,
      home: [0, 0, 0], ex: [0, -0.3, 3.8], tag: 'Pick-up', conf: 'named', src: ['deck', 'kt-976'],
      desc: 'The wide mouth at the nose of the head, behind a grey, porous pad. The dust the brush knocks loose is drawn in here and carried through the hose to the main unit.',
      specs: [['Suction', '2,000 m³/h (1,180 CFM)'], ['Hose', '50 mm']],
      build(b) {
        b.box(2.6, 0.7, 0.2, { m: { k: 'fabric', id: 'kt-pad', color: 0x9da0a2, roughness: 1 }, r: 0.05, at: [0, 0.62, HEAD.z1 + 0.06] });
        b.box(2.8, 0.82, 0.08, { m: 'dark', r: 0.05, at: [0, 0.62, HEAD.z1 - 0.06], e: false });
      },
    },
    {
      id: 'fans', name: 'Negative-pressure fans', group: 'air', layer: 2, delay: 0.1,
      home: [0, 0, 0], ex: [0, 0.2, 2.2], tag: 'Suction', conf: 'inferred', src: ['kt-976', 'kt-976-d'],
      desc: 'Kuaitong\'s sheet says two negative-pressure fans work together so the robot can vacuum while it brushes, in both directions of travel. Here they sit side by side in the head.',
      specs: [['Fans', '2 (Kuaitong)'], ['Suction', '2,000 m³/h']],
      build(b) {
        for (const x of [-0.75, 0.75]) b.at([x, 0.78, 1.9], () => L.turbine(b, { r: 0.52, h: 0.6 }));
        b.cyl(0.25, 0.25, 1.9, { m: 'rubber', rot: [0, 0, PI / 2], at: [0, 0.45, 2.7], seg: 16, e: false });
      },
    },

    // ───────────── Drive & frame ─────────────
    ...[-1, 1].map((sd) => ({
      id: sd < 0 ? 'track-r' : 'track-l', name: sd < 0 ? 'Right track' : 'Left track', group: 'drive', layer: 2, delay: 0.06,
      home: [0, 0, 0], ex: [sd * 3.0, -0.2, -0.2], tag: 'Track', conf: 'named', src: ['deck', 'kt-976'],
      desc: 'A rubber track on a yellow frame with a sprocket at each end. Two tracks drive the crawler along a duct, over joins and rivets.',
      specs: [['Track', '250 mm long in the picture, 90 mm wide']],
      build(b) {
        b.at([sd * TRK.x, TRK.h / 2 + 0.02, TRK.z], () => F.trackUnit(b, { len: TRK.len, h: TRK.h, w: TRK.w, side: sd, cleats: 28, wheels: 3 }));
      },
    })),
    {
      id: 'chassis', name: 'Chassis', group: 'drive', layer: 3, delay: 0.1,
      home: [0, 0, 0], ex: [0, -1.0, 0], tag: 'Frame', conf: 'inferred', src: ['deck'],
      desc: 'The black body between the tracks that carries the deck, the arm and the head.',
      specs: [['Width over the tracks', '310 mm']],
      build(b) {
        b.box(1.5, 0.8, 4.4, { m: BLACK2, r: 0.1, at: [0, 0.66, -0.8] });
        b.box(2.6, 0.2, 0.5, { m: 'trim', r: 0.05, at: [0, 0.35, 0.3], e: false });
      },
    },
    ...[-1, 1].map((sd) => ({
      id: sd < 0 ? 'drive-motor-r' : 'drive-motor-l', name: sd < 0 ? 'Right drive motor' : 'Left drive motor', group: 'drive', layer: 3, delay: 0.14,
      home: [0, 0, 0], ex: [sd * 1.8, -1.6, -1.4], tag: 'Motor', conf: 'inferred', src: ['kt-976-d'],
      desc: 'A gear motor that turns the sprocket of one track. Kuaitong\'s listings describe a drive of two motors; their size here is schematic.',
      specs: [['Drive', 'Two motors, one per track']],
      build(b) {
        b.cyl(0.26, 0.26, 0.9, { m: 'metal', rot: [0, 0, PI / 2], at: [sd * 0.55, 0.62, -2.6], seg: 20 });
        b.cyl(0.18, 0.18, 0.35, { m: 'steel', rot: [0, 0, PI / 2], at: [sd * 1.1, 0.62, -2.6], seg: 14, e: false });
      },
    })),

    // ───────────── Power & brain ─────────────
    {
      id: 'controller', name: 'Robot control board', group: 'power', layer: 2, delay: 0.12,
      home: [0, 0, 0], ex: [0, -0.6, -2.6], tag: 'Brain', conf: 'inferred', src: ['kt-976'],
      desc: 'The board that drives the tracks, the arm and the lamps and sends the two camera pictures up the cable. The robot runs on a 24 V low-voltage supply from the main unit, which keeps it safe to handle.',
      specs: [['Supply', '24 V low voltage']],
      build(b) { b.at([0, 0.95, -1.0], () => L.pcb(b, { w: 1.1, d: 1.5 })); },
    },

    // ───────────── Sensing ─────────────
    {
      id: 'cameras', name: 'Cameras and lamps', group: 'sense', layer: 1, delay: 0.04,
      home: [0, 0, 0], ex: [0, 1.4, 2.4], tag: 'Camera', conf: 'named', src: ['kt-976', 'kt-976-d'],
      desc: 'A 1080P camera at the front and one at the back, with bright LED lights, send the view of the duct to the 10-inch screen on the control case.',
      specs: [['Cameras', '2 × 1080P'], ['Lights', 'Strong LEDs']],
      build(b) {
        b.at([0, HEAD.h + 0.05, HEAD.z1 - 0.1], () => L.camera(b, { w: 0.6, h: 0.3, d: 0.28, lens: 0.1, ring: false }));
        b.at([0, DECK.y + 0.05, DECK.z0 + 0.1], () => b.at([0, 0, 0], () => L.camera(b, { w: 0.5, h: 0.28, d: 0.25, lens: 0.09, ring: false }), [0, PI, 0]));
        for (const x of [-0.5, 0.5]) b.cyl(0.07, 0.07, 0.04, { m: 'lamp', rot: [PI / 2, 0, 0], at: [x, HEAD.h + 0.05, HEAD.z1 - 0.12], seg: 12, e: false });
      },
    },

    // ───────────── Hose, cable & case ─────────────
    {
      id: 'hose', name: 'Suction hose and cable', group: 'tether', layer: 1, delay: 0.08,
      home: [0, 0, 0], ex: [0, 0, -3.2], tag: 'Hose', conf: 'named', src: ['kt-976', 'kt-976-d'],
      desc: 'A 50 mm hose of EVA, light and flexible, 15 m long (20 m on request), carries the dust back to the main unit. The power and the camera lines run with it.',
      specs: [['Hose', '50 mm × 15 m (up to 20 m)'], ['Material', 'EVA']],
      build(b) {
        F.ribbedHose(b, [[0, 0.7, -2.9], [0, 0.55, -4.0], [0.6, 0.4, -5.2], [-0.8, 0.3, -6.4], [0.2, 0.3, -7.6]], 0.25, { m: { k: 'rubber', id: 'kt-hose', color: 0x202326 }, ribs: 34 });
      },
    },
    {
      id: 'case', name: 'Control case', group: 'ui', layer: 0, delay: 0.02,
      home: [-5.8, 0, -1.6], ex: [-2.6, 0.4, 0], tag: 'Monitor', conf: 'named', src: ['deck', 'kt-976'],
      desc: 'A rugged black hard case with the 10-inch HD screen in its lid and the controls on its panel: switches for the tracks, the arm and the brush, the lamps, and a power display. It shows both camera views, so no dead corner is missed.',
      specs: [['Screen', '10-inch HD'], ['Cameras', '2 × 1080P']],
      build(b) { F.ruggedCase(b, { w: 4.2, d: 3.2, h: 1.3, lid: 1.78 }); },
    },
  ],
};
