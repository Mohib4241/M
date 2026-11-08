// Unitree Go2 quadruped robot (the product deck lists it as "G02"; Unitree's own name is Go2). Y up, +Z front,
// 1 unit = 100 mm. The numbers come from Unitree's Go2 page (its specification table), and the part names from
// Unitree's own labelled picture of the Go2: tracking module, intercom microphone, self-retracting strap, front camera,
// front lamp, 4D LiDAR L2, 12 aluminium joint motors, foot force sensor, computing core, smart battery, speaker. The
// outside follows the product picture in the product deck. Where parts sit inside is a schematic reconstruction,
// not CAD.
import * as THREE from 'three';
import * as L from '../lib.js';
import * as F from '../field.js';
import { labelTex } from '../kit.js';

const PI = Math.PI;
const P = (id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build) => ({ id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build });
const GREY = { k: 'shell', id: 'go2-grey', color: 0x868e96, metalness: 0.2, roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.35 };
const GREY2 = { k: 'shellDk', id: 'go2-grey2', color: 0x6d757d, metalness: 0.35, roughness: 0.42, clearcoat: 0.3 };
const MOTOR = { k: 'metal', id: 'go2-motor', color: 0x9aa1a8, metalness: 0.75, roughness: 0.32 };
const LIGHT = { k: 'shell', id: 'go2-light', color: 0xaeb4ba, metalness: 0.15, roughness: 0.45, clearcoat: 0.35 };
const BLK = { k: 'rubber', id: 'go2-black', color: 0x101214, roughness: 0.7 };

const TORSO = { y: 3.15, hw: 1.05, h: 1.5, z0: -2.25, z1: 2.15 };
const HIPX = 1.15, HIPZ = 2.0;                 // the hip motors sit at the torso's corners
const LEGX = 1.75;                              // the legs stand a little outside the torso

const knee = (f) => [LEGX, 1.6, f * HIPZ - 0.8];
const foot = (f) => [LEGX, 0.3, f * HIPZ + 0.3];

export default {
  id: 'go2',
  name: 'Unitree Go2',
  short: 'Go2',
  maker: 'Unitree Robotics',
  blurb: 'Four-legged robot of about 15 kg with 12 aluminium joint motors, a 4D LiDAR, a 120° front camera and foot force sensors: it climbs stairs and 15 cm steps, carries about 7 kg and follows or maps on its own.',
  accent: '#3de0ff', accent2: '#ffd166',
  studio: { accent: '#0a8f9c', accent2: '#c98a1a' },
  hover: 0.4,
  race: false, noDock: true,
  mats: { studio: { shell: { color: 0x868e96, metalness: 0.2, roughness: 0.45, clearcoat: 0.4 }, shellDk: { color: 0x6d757d, metalness: 0.35, roughness: 0.42, clearcoat: 0.3 }, trim: { color: 0x2a2e33 } } },
  kpis: [['Weight', '≈ 15 kg'], ['Payload', '≈ 7 kg'], ['Torque', '≈ 45 N·m']],
  stats: [
    ['Size standing', '700 × 310 × 400 mm'],
    ['Size crouching', '760 × 310 × 200 mm'],
    ['Weight', 'About 15 kg with the battery'],
    ['Material', 'Aluminium alloy and high-strength engineering plastic'],
    ['Payload', 'About 7 kg (up to about 10 kg) · about 8 kg (up to 12 kg) on the top version'],
    ['Speed', '0–2.5 m/s · 0–3.5 m/s · 0–3.7 m/s (up to about 5 m/s) by version'],
    ['Climbing', 'Steps about 15–16 cm · slopes 30° or 40° by version'],
    ['Joints', '12 aluminium joint motors · peak torque about 45 N·m · heat-pipe cooling'],
    ['Range of motion', 'Body -48° to 48° · thigh -200° to 90° · shank -156° to -48°'],
    ['Power', '28–33.6 V · about 3,000 W at most'],
    ['Battery', 'Standard 8,000 mAh (about 1–2 h) · long-endurance 15,000 mAh (about 2–4 h)'],
    ['Charging', '33.6 V 3.5 A · fast charge 33.6 V 9 A'],
    ['Perception', '4D LiDAR L2 360° × 96°, from 0.05 m · HD wide-angle camera 1280 × 720, 120° · foot force sensors'],
    ['Wireless', 'Wi-Fi 6 dual band · Bluetooth 5.2 · 4G eSIM with GPS'],
    ['Computing', '8-core CPU on the top versions · upgradeable AI module (Orin NX, Orin Nano and others, 40–100 TOPS)'],
    ['Warranty', '6 months · 12 months on the top version'],
  ],
  notes: [
    'The product deck writes "G02"; the machine in the picture is marked UNITREE and Unitree\'s own name for it is Go2.',
    'Unitree sells Go2 in versions (Air, Pro, X and EDU); its specification table lists payload, speed, step height, slope and battery per version. The figures here give the range across them, and the picture shows no version marking.',
    'The outside follows the product picture in the deck: a grey torso, round hip and thigh motors at the corners, light-grey legs with black rubber feet, the 4D LiDAR in the chin and the camera and lamp in the nose. The part names are Unitree\'s own, from its labelled picture.',
    'Unitree\'s page, as read, gives no ingress-protection rating, so none is shown.',
  ],
  sources: ['deck', 'ut-go2', 'ut-go2-parts'],

  parts: [
    P('top-cover', 'Top shell', 'shell', 0, 0, [0, 0, 0], [0, 3.0, 0], 'Shell', 'named', ['deck', 'ut-go2'],
      'The grey top shell of the torso, in aluminium alloy and high-strength engineering plastic, with a round button on the top and a long shallow dish. It is the first piece to lift off.',
      [['Material', 'Aluminium alloy + engineering plastic']],
      (b) => {
        b.box(TORSO.hw * 2, 0.9, TORSO.z1 - TORSO.z0 - 0.4, { m: GREY, r: 0.5, at: [0, TORSO.y + 0.35, (TORSO.z0 + TORSO.z1) / 2 - 0.1] });
        b.cyl(0.25, 0.25, 0.1, { m: GREY2, at: [-0.35, TORSO.y + 0.84, 1.1], seg: 20 });
        b.box(0.9, 0.04, 0.6, { m: GREY2, r: 0.1, at: [0.45, TORSO.y + 0.82, 0.2], e: false });
      }),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'side-cover-r' : 'side-cover-l', sd < 0 ? 'Right side panel' : 'Left side panel', 'shell', 0, 0.04,
      [0, 0, 0], [sd * 3.0, 0, 0], 'Panel', 'named', ['deck', 'ut-go2'],
      'The side panel of the torso. On the left it carries the maker\'s name and the slot for the smart battery with its level lights.',
      [['Battery', 'Slides in from the side · level lights']],
      (b) => {
        b.box(0.18, 1.15, 2.6, { m: GREY, r: 0.1, at: [sd * (TORSO.hw + 0.04), TORSO.y - 0.1, -0.2] });
        if (sd > 0) {
          b.box(0.02, 0.28, 1.5, { m: { k: 'shell', id: 'go2-name', map: labelTex('UNITREE', { color: '#f2f4f6', font: '700 80px sans-serif', w: 640, h: 128, spacing: 6 }), color: 0xffffff }, at: [TORSO.hw + 0.14, TORSO.y + 0.3, -0.4], e: false });
          b.box(0.03, 0.55, 0.4, { m: 'dark', r: 0.04, at: [TORSO.hw + 0.14, TORSO.y - 0.25, -0.1], e: false });
          for (let i = 0; i < 4; i++) b.box(0.03, 0.05, 0.05, { m: 'green', at: [TORSO.hw + 0.16, TORSO.y - 0.05, -0.18 + i * 0.1], e: false });
        }
      })),
    P('head', 'Nose and head', 'shell', 0, 0.06, [0, 0, 0], [0, 0.6, 3.2], 'Head', 'named', ['deck', 'ut-go2'],
      'The rounded front of the torso. The front camera and the lamp are in its face and the 4D LiDAR sits under the chin in a black ribbed cage. The "02" on the picture\'s unit is a number, not part of the model.',
      [['Material', 'Engineering plastic']],
      (b) => { b.box(TORSO.hw * 2 - 0.2, TORSO.h - 0.1, 1.3, { m: GREY, r: 0.55, at: [0, TORSO.y - 0.05, TORSO.z1 + 0.15] }); }),
    P('camera', 'Front camera', 'sense', 1, 0.07, [0, 0, 0], [0, 1.6, 3.4], 'Camera', 'confirmed', ['ut-go2', 'ut-go2-parts', 'deck'],
      'The HD wide-angle camera in the nose. Unitree gives it an image transmission of 1280 × 720 with a 120° field of view, so the pictures in the app are rich and stable.',
      [['Picture', '1280 × 720'], ['Field of view', '120°']],
      (b) => {
        b.box(0.5, 0.45, 0.12, { m: 'dark', r: 0.08, at: [-0.5, TORSO.y + 0.25, TORSO.z1 + 0.82], e: false });
        b.cyl(0.17, 0.17, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [-0.5, TORSO.y + 0.27, TORSO.z1 + 0.9], seg: 20 });
      }),
    P('lamp', 'Front lamp', 'sense', 1, 0.08, [0, 0, 0], [0, 1.2, 3.4], 'Lamp', 'confirmed', ['ut-go2', 'ut-go2-parts'],
      'A lamp in the nose that "brightly lights the way ahead", so the camera can see in poor light.',
      [['Function', 'Lights the way ahead']],
      (b) => { b.cyl(0.1, 0.1, 0.06, { m: 'lamp', rot: [PI / 2, 0, 0], at: [-0.5, TORSO.y - 0.05, TORSO.z1 + 0.88], seg: 14, e: false }); }),
    P('lidar', '4D LiDAR L2', 'sense', 1, 0.09, [0, 0, 0], [0, -0.8, 3.4], 'LiDAR', 'confirmed', ['deck', 'ut-go2', 'ut-go2-parts'],
      'Unitree\'s own 4D LiDAR L2: 360° × 96° ultra-wide scanning with a small blind spot (0.05 m minimum range), for automatic avoidance and stable operation. With the app it builds a point-cloud map of the area and the robot can follow a path across it.',
      [['Field', '360° × 96°'], ['Minimum range', '0.05 m']],
      (b) => {
        b.at([0.0, TORSO.y - 0.78, TORSO.z1 + 0.75], () => {
          b.sph(0.5, { m: BLK, seg: 24, cap: PI * 0.62 });
          b.radial(new THREE.BoxGeometry(0.05, 0.7, 0.05), 10, 0.45, { axis: 'y', m: 'dark', e: false, at: [0, 0, 0] });
          b.cyl(0.28, 0.28, 0.05, { m: 'lens', rot: [PI / 2, 0, 0], at: [0, 0.05, 0.4], seg: 18, e: false });
        });
      }),
    P('tracking', 'Tracking module', 'sense', 1, 0.1, [0, 0, 0], [0, 2.0, 2.2], 'Tracking', 'confirmed', ['ut-go2', 'ut-go2-parts'],
      'The wireless vector positioning module of the Intelligent Side-follow System (ISS 2.0): the robot follows its owner, remote-controlled or by automatic tracking, over a remote range of more than 30 m. It sits at the top of the head.',
      [['System', 'ISS 2.0'], ['Range', 'Over 30 m']],
      (b) => { b.box(0.9, 0.12, 0.5, { m: GREY2, r: 0.1, at: [0.1, TORSO.y + 0.82, 1.9], e: false }); b.cyl(0.12, 0.12, 0.06, { m: 'dark', at: [0.1, TORSO.y + 0.9, 1.9], seg: 12, e: false }); }),
    P('audio', 'Intercom microphone and speaker', 'ui', 1, 0.11, [0, 0, 0], [0, 1.6, 0.6], 'Audio', 'confirmed', ['ut-go2-parts'],
      'An intercom microphone for talking to the robot without scenario limits, and a speaker for music and voice. Their openings are small holes in the shell.',
      [['Function', 'Intercom · music']],
      (b) => {
        b.cyl(0.06, 0.06, 0.05, { m: 'dark', at: [0.5, TORSO.y + 0.82, 0.3], seg: 10, e: false });
        for (let i = 0; i < 3; i++) b.cyl(0.04, 0.04, 0.03, { m: 'dark', rot: [PI / 2, 0, 0], at: [-0.3 + i * 0.18, TORSO.y - 0.7, 1.0], seg: 8, e: false });
      }),
    P('strap', 'Self-retracting strap', 'shell', 0, 0.1, [0, 0, 0], [0, 2.2, -2.0], 'Strap', 'confirmed', ['ut-go2-parts'],
      'A strap on the back that winds itself in: "easy to carry and load things". It is the loop at the rear top of the torso.',
      [['Function', 'Carry handle · loading']],
      (b) => { F.tube(b, [[-0.6, TORSO.y + 0.82, -1.7], [-0.4, TORSO.y + 1.1, -1.9], [0.4, TORSO.y + 1.1, -1.9], [0.6, TORSO.y + 0.82, -1.7]], 0.06, { m: BLK, e: false }); }),
    P('hip-motors', 'Hip motors', 'drive', 2, 0.04, [0, 0, 0], [0, 1.2, 0], 'Hips', 'confirmed', ['deck', 'ut-go2', 'ut-go2-parts'],
      'The four round motors at the corners of the torso that swing each leg out sideways (the body joint, -48° to 48°). They are among the 12 aluminium alloy precision joint motors, with a heat-pipe cooler on each joint.',
      [['Joints', '3 motors a leg (12 in all)'], ['Range', '-48° to 48°']],
      (b) => {
        for (const sd of [-1, 1]) for (const f of [-1, 1]) {
          b.at([sd * HIPX, TORSO.y + 0.05, f * HIPZ], () => {
            b.cyl(0.42, 0.42, 0.95, { m: GREY2, rot: [PI / 2, 0, 0], seg: 28 });
            b.cyl(0.44, 0.44, 0.1, { m: MOTOR, rot: [PI / 2, 0, 0], at: [0, 0, f * 0.45], seg: 28, e: false });
          });
        }
      }),
    ...[['fl', 1, 1], ['fr', 1, -1], ['rl', -1, 1], ['rr', -1, -1]].map(([id, f, sd]) => P(`leg-${id}`,
      `${f > 0 ? 'Front' : 'Rear'} ${sd > 0 ? 'left' : 'right'} leg`, 'drive', 3, 0.08 + (f > 0 ? 0 : 0.03),
      [0, 0, 0], [sd * 3.6, 0, f * 2.4], 'Leg', 'confirmed', ['deck', 'ut-go2'],
      'A leg of three joints: a big thigh motor with a rounded cover, a light-grey thigh and calf, and a black rubber foot. The knee points backward. Peak joint torque is about 45 N·m, and the thigh swings -200° to 90° and the shank -156° to -48°. This is what lets Go2 climb steps of about 15 cm and slopes of 30° or more.',
      [['Peak joint torque', '≈ 45 N·m'], ['Thigh', '-200° to 90°'], ['Shank', '-156° to -48°']],
      (b) => {
        const K = knee(f), Fo = foot(f);
        const H = [LEGX * sd, 3.05, f * HIPZ];
        const k = [LEGX * sd, K[1], K[2]], ft = [LEGX * sd, Fo[1], Fo[2]];
        b.at([sd * 1.55, 3.05, f * HIPZ], () => {
          b.cyl(0.52, 0.52, 0.75, { m: GREY2, rot: [0, 0, PI / 2], seg: 30 });
          b.cyl(0.54, 0.54, 0.08, { m: MOTOR, rot: [0, 0, PI / 2], at: [sd * 0.38, 0, 0], seg: 30, e: false });
        });
        F.rod(b, H, k, 0.36, { m: LIGHT, seg: 20 });
        b.sph(0.36, { m: LIGHT, at: k, seg: 18, e: false });
        F.rod(b, k, ft, 0.2, { m: LIGHT, seg: 18 });
        b.sph(0.3, { m: BLK, at: ft, seg: 16 });
      })),
    P('foot-sensors', 'Foot force sensors', 'sense', 3, 0.14, [0, 0, 0], [0, -1.4, 0], 'Feet', 'confirmed', ['ut-go2', 'ut-go2-parts'],
      'A force sensor in each rubber foot that "receives foot perception in real time", so the robot knows when and how hard each foot touches the ground.',
      [['Sensors', '4, one a foot']],
      (b) => { for (const sd of [-1, 1]) for (const f of [-1, 1]) b.sph(0.18, { m: 'copper', at: [LEGX * sd, 0.3, f * HIPZ + 0.3], seg: 12, e: false }); }),
    P('battery', 'Smart battery', 'power', 2, 0.1, [0, 0, 0], [0, -1.6, -2.4], 'Power', 'confirmed', ['ut-go2', 'ut-go2-parts'],
      'The smart battery, standard 8,000 mAh (about 1–2 hours) or long-endurance 15,000 mAh (about 2–4 hours), protected against over-temperature, overcharge and short circuit. It charges at 33.6 V 3.5 A, or 9 A on the fast charger.',
      [['Standard', '8,000 mAh'], ['Long-endurance', '15,000 mAh'], ['Voltage', '28–33.6 V']],
      (b) => { b.at([0, TORSO.y - 0.15, -0.5], () => L.battery(b, { w: 1.7, h: 0.8, d: 2.6 })); }),
    P('controller', 'Computing core', 'power', 2, 0.12, [0, 0, 0], [0, -1.2, 2.2], 'Brain', 'confirmed', ['ut-go2', 'ut-go2-parts'],
      'The computing core: the motion controller on a high-performance ARM processor, and an upgradeable AI computing module that takes external AI processors such as Orin NX and Orin Nano. The top versions have an 8-core CPU.',
      [['Motion control', 'ARM processor'], ['AI module', 'Orin NX / Orin Nano and others']],
      (b) => { b.at([0, TORSO.y + 0.2, 0.9], () => L.pcb(b, { w: 1.4, d: 1.6 })); }),
    P('comms', 'Wireless module', 'power', 2, 0.13, [0, 0, 0], [0, -0.8, 1.4], 'Radio', 'confirmed', ['ut-go2', 'ut-go2-parts'],
      'Wi-Fi 6 on two bands, Bluetooth 5.2 and a 4G eSIM with GPS, for a stable connection and remote control, high-definition pictures in the app and cloud updates.',
      [['Wi-Fi', 'Wi-Fi 6, dual band'], ['Cellular', '4G eSIM with GPS']],
      (b) => { b.at([0.4, TORSO.y - 0.1, -1.6], () => L.pcb(b, { w: 0.9, d: 0.9 })); }),
  ],
};
