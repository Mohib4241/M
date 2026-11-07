// Unitree Go2 quadruped robot (the product deck lists it as "G02"; Unitree's own name is Go2). Y up, +Z front,
// 1 unit = 100 mm. The numbers come from Unitree's Go2 page: standing 700 × 310 × 400 mm, about 15 kg, a payload of
// about 7 kg, a 4D LiDAR L2, a peak joint torque of about 45 N·m. The outside follows the product picture in the
// product deck. Where parts sit inside is a schematic reconstruction, not CAD.
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
  blurb: 'Four-legged inspection robot of about 15 kg: it walks stairs and uneven ground, maps what it passes with a 4D LiDAR and carries about 7 kg.',
  accent: '#3de0ff', accent2: '#ffd166',
  studio: { accent: '#0a8f9c', accent2: '#c98a1a' },
  hover: 0.4,
  race: false, noDock: true,
  mats: { studio: { shell: { color: 0xaab1b8, metalness: 0.15, roughness: 0.42, clearcoat: 0.45 }, shellDk: { color: 0x6d757d, metalness: 0.35, roughness: 0.42, clearcoat: 0.3 }, trim: { color: 0x2a2e33 } } },
  kpis: [['Weight', '≈ 15 kg'], ['Payload', '≈ 7 kg'], ['Speed', '≈ 5 m/s']],
  stats: [
    ['Size standing', '700 × 310 × 400 mm'],
    ['Size crouching', '760 × 310 × 200 mm'],
    ['Weight', 'About 15 kg with the battery'],
    ['Payload', 'About 7 kg (up to about 10 kg)'],
    ['Top speed', 'About 5 m/s (tested in the lab)'],
    ['Peak joint torque', 'About 45 N·m'],
    ['Endurance', 'About 2–4 h in real use'],
    ['Perception', '4D LiDAR L2: 360° × 96°, from 0.05 m'],
    ['Wireless', 'Wi-Fi 6 · Bluetooth · 4G'],
    ['Follow control', 'Remote range over 30 m'],
  ],
  notes: [
    'The product deck writes "G02"; the machine in the picture is marked UNITREE and Unitree\'s own name for it is Go2.',
    'The outside follows the product picture in the deck: a grey torso, round hip and thigh motors at the corners, light-grey legs with black rubber feet, the 4D LiDAR in the chin and a camera in the nose.',
    'Unitree sells Go2 in several versions; the pages list payload and endurance for each. The figures here are the page\'s main column.',
    'Retail listings give a battery of 8,000 mAh and an IP rating; Unitree\'s own page, as read, gives no rating, so none is shown.',
  ],
  sources: ['deck', 'ut-go2'],

  parts: [
    P('top-cover', 'Top shell', 'shell', 0, 0, [0, 0, 0], [0, 3.0, 0], 'Shell', 'named', ['deck', 'ut-go2'],
      'The grey top shell of the torso, with a round button on the top and a long shallow dish. It is the first piece to lift off.',
      [['Torso', 'Grey moulded shell']],
      (b) => {
        b.box(TORSO.hw * 2, 0.9, TORSO.z1 - TORSO.z0 - 0.4, { m: GREY, r: 0.5, at: [0, TORSO.y + 0.35, (TORSO.z0 + TORSO.z1) / 2 - 0.1] });
        b.cyl(0.25, 0.25, 0.1, { m: GREY2, at: [-0.35, TORSO.y + 0.84, 1.1], seg: 20 });
        b.box(0.9, 0.04, 0.6, { m: GREY2, r: 0.1, at: [0.45, TORSO.y + 0.82, 0.2], e: false });
      }),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'side-cover-r' : 'side-cover-l', sd < 0 ? 'Right battery panel' : 'Left battery panel', 'shell', 0, 0.04,
      [0, 0, 0], [sd * 3.0, 0, 0], 'Panel', 'named', ['deck', 'ut-go2'],
      'The side panel of the torso. On one side it carries the maker\'s name and the battery slot with its level lights, where the pack slides in.',
      [['Battery', 'Swappable pack, level lights']],
      (b) => {
        b.box(0.18, 1.15, 2.6, { m: GREY, r: 0.1, at: [sd * (TORSO.hw + 0.04), TORSO.y - 0.1, -0.2] });
        if (sd > 0) {
          b.box(0.02, 0.28, 1.5, { m: { k: 'shell', id: 'go2-name', map: labelTex('UNITREE', { color: '#f2f4f6', font: '700 80px sans-serif', w: 640, h: 128, spacing: 6 }), color: 0xffffff }, rot: [0, 0, 0], at: [TORSO.hw + 0.14, TORSO.y + 0.3, -0.4], e: false });
          b.box(0.03, 0.55, 0.4, { m: 'dark', r: 0.04, at: [TORSO.hw + 0.14, TORSO.y - 0.25, -0.1], e: false });
          for (let i = 0; i < 4; i++) b.box(0.03, 0.05, 0.05, { m: 'green', at: [TORSO.hw + 0.16, TORSO.y - 0.05 + i * 0.0, -0.18 + i * 0.1], e: false });
        }
      })),
    P('head', 'Nose and head', 'shell', 0, 0.06, [0, 0, 0], [0, 0.6, 3.2], 'Head', 'named', ['deck', 'ut-go2'],
      'The rounded front of the torso. A camera looks out of the nose and the 4D LiDAR sits under the chin in a black ribbed cage. The "02" on the picture\'s unit is a number, not part of the model.',
      [['Camera', 'HD, in the nose']],
      (b) => {
        b.box(TORSO.hw * 2 - 0.2, TORSO.h - 0.1, 1.3, { m: GREY, r: 0.55, at: [0, TORSO.y - 0.05, TORSO.z1 + 0.15] });
        b.box(0.5, 0.6, 0.12, { m: 'dark', r: 0.08, at: [-0.5, TORSO.y + 0.2, TORSO.z1 + 0.82], e: false });
        b.cyl(0.18, 0.18, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [-0.5, TORSO.y + 0.32, TORSO.z1 + 0.9], seg: 20 });
        b.cyl(0.1, 0.1, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [-0.5, TORSO.y + 0.05, TORSO.z1 + 0.9], seg: 14, e: false });
      }),
    P('lidar', '4D LiDAR L2', 'sense', 1, 0.08, [0, 0, 0], [0, -0.8, 3.4], 'LiDAR', 'named', ['deck', 'ut-go2'],
      'Unitree\'s own 4D LiDAR L2 sees a hemisphere, 360° × 96°, with a blind spot down to 0.05 m. With the app it builds a point-cloud map of the area and the robot can follow a path across it.',
      [['Field', '360° × 96°'], ['Minimum range', '0.05 m']],
      (b) => {
        b.at([-0.1, TORSO.y - 0.55, TORSO.z1 + 0.9], () => {
          b.sph(0.62, { m: BLK, seg: 24, cap: PI * 0.62 });
          b.radial(new THREE.BoxGeometry(0.05, 0.9, 0.05), 10, 0.55, { axis: 'y', m: 'dark', e: false, at: [0, 0, 0] });
          b.cyl(0.35, 0.35, 0.05, { m: 'lens', rot: [PI / 2, 0, 0], at: [0, 0.05, 0.5], seg: 18, e: false });
        });
      }),
    P('hip-motors', 'Hip motors', 'drive', 2, 0.04, [0, 0, 0], [0, 1.2, 0], 'Hips', 'named', ['deck', 'ut-go2'],
      'The four round motors at the corners of the torso that swing each leg out sideways. They are the big grey drums with a silver ring in the picture.',
      [['Joints', '3 motors a leg (12 in all)']],
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
      [0, 0, 0], [sd * 3.6, 0, f * 2.4], 'Leg', 'named', ['deck', 'ut-go2'],
      'A leg of three joints: a big thigh motor with a rounded cover, a light-grey thigh and calf, and a black rubber foot. The knee points backward. Peak joint torque is about 45 N·m, which is what lets Go2 climb stairs and step over obstacles.',
      [['Peak joint torque', '≈ 45 N·m'], ['Foot', 'Black rubber']],
      (b) => {
        const K = knee(f), Fo = foot(f);
        const H = [LEGX * sd, 3.05, f * HIPZ];
        const k = [LEGX * sd, K[1], K[2]], ft = [LEGX * sd, Fo[1], Fo[2]];
        b.at([sd * 1.55, 3.05, f * HIPZ], () => {
          b.cyl(0.52, 0.52, 0.75, { m: GREY2, rot: [0, 0, PI / 2], seg: 30 });
          b.cyl(0.54, 0.54, 0.08, { m: MOTOR, rot: [0, 0, PI / 2], at: [sd * 0.38, 0, 0], seg: 30, e: false });
        });
        F.rod(b, H, k, 0.42, { m: LIGHT, seg: 20 });
        b.sph(0.42, { m: LIGHT, at: k, seg: 18, e: false });
        F.rod(b, k, ft, 0.24, { m: LIGHT, seg: 18 });
        b.sph(0.3, { m: BLK, at: ft, seg: 16 });
      })),
    P('battery', 'Battery', 'power', 2, 0.1, [0, 0, 0], [0, -1.6, -2.4], 'Power', 'inferred', ['ut-go2'],
      'The battery pack inside the torso, behind the side panel. Unitree gives an endurance of about 2–4 hours in real use.',
      [['Endurance', '≈ 2–4 h']],
      (b) => { b.at([0, TORSO.y - 0.15, -0.5], () => L.battery(b, { w: 1.7, h: 0.8, d: 2.6 })); }),
    P('controller', 'Main board', 'power', 2, 0.12, [0, 0, 0], [0, -1.2, 2.2], 'Brain', 'inferred', ['ut-go2'],
      'The board that runs the walking control and the 12 joint motors, reads the LiDAR and the camera and talks over Wi-Fi 6, Bluetooth and 4G.',
      [['Wireless', 'Wi-Fi 6 · Bluetooth · 4G']],
      (b) => { b.at([0, TORSO.y + 0.2, 0.9], () => L.pcb(b, { w: 1.4, d: 1.6 })); }),
  ],
};
