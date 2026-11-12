// Unitree G1 humanoid robot. Y up, +Z front, 1 unit = 100 mm. It stands 1,320 mm tall, facing +Z; its left is +X.
// The numbers come from Unitree's G1 page (its parameter table) and the part names from Unitree's own labelled
// picture of the G1: 3D LiDAR (Livox MID-360), depth camera (Intel RealSense D435i), microphone array, stereo 5 W
// speaker, quick-release battery, hollow joint wiring, arm joints (shoulder 3 + elbow 2) and leg joints (hip 3 +
// knee 1 + ankle 2). The outside follows Unitree's pictures. Where parts sit inside is a schematic reconstruction,
// not CAD. The robot has joints (`rig`), so the viewer can pose it; each part names the joint it moves with.
import * as THREE from 'three';
import * as L from '../lib.js';
import * as F from '../field.js';

const PI = Math.PI;
const SHELL = { k: 'shell', id: 'g1-shell', color: 0xe6e8eb, metalness: 0.25, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 };
const SHELL2 = { k: 'shell', id: 'g1-shell2', color: 0xcfd3d8, metalness: 0.35, roughness: 0.35, clearcoat: 0.4 };
const BLACK = { k: 'shellDk', id: 'g1-black', color: 0x17191c, metalness: 0.4, roughness: 0.45 };
const BLACK2 = { k: 'shellDk', id: 'g1-black2', color: 0x0e0f11, metalness: 0.3, roughness: 0.55 };
const VISOR = { k: 'glass', id: 'g1-visor', color: 0x05070a, roughness: 0.08 };
const RUBBER = { k: 'rubber', id: 'g1-rubber', color: 0x1c1e21, roughness: 0.85 };

// the joints' pivots in the rest pose (standing, arms at the sides)
const AT = {
  pelvis: [0, 7.15, 0], torso: [0, 7.75, 0], head: [0, 11.35, 0],
  shoulderL: [1.85, 10.55, 0], elbowL: [1.88, 8.65, 0], wristL: [1.88, 6.85, 0],
  shoulderR: [-1.85, 10.55, 0], elbowR: [-1.88, 8.65, 0], wristR: [-1.88, 6.85, 0],
  hipL: [0.95, 6.65, 0], kneeL: [0.95, 3.65, 0], ankleL: [0.95, 0.65, 0],
  hipR: [-0.95, 6.65, 0], kneeR: [-0.95, 3.65, 0], ankleR: [-0.95, 0.65, 0],
};
export const THIGH = AT.hipL[1] - AT.kneeL[1], SHIN = AT.kneeL[1] - AT.ankleL[1];

// The five-finger hand (Unitree Dex5-1: 217.3 × 127.5 × 72.1 mm laid flat). At rest it hangs with the palm
// toward the body and the thumb forward. Each finger has three bones; the thumb leaves the palm at an angle.
const HAND_X = 1.88, KNUCKLE_Y = 5.78;
const FINGER = { // z across the palm, the knuckle's height, and the three bone lengths
  index: { z: 0.3, y: KNUCKLE_Y, len: [0.42, 0.3, 0.26] }, middle: { z: 0.1, y: KNUCKLE_Y - 0.03, len: [0.46, 0.32, 0.27] },
  ring: { z: -0.1, y: KNUCKLE_Y, len: [0.42, 0.3, 0.26] }, little: { z: -0.3, y: KNUCKLE_Y + 0.06, len: [0.34, 0.24, 0.22] },
};
const THUMB = { at: [-0.08, 6.38, 0.36], tilt: 0.75, len: [0.4, 0.32, 0.28] }; // x is toward the palm side
const thumbDir = [0, -Math.cos(THUMB.tilt), Math.sin(THUMB.tilt)];
const FINGER_NAMES = ['thumb', 'index', 'middle', 'ring', 'little'];
const BONE_WORD = ['base', 'middle', 'tip'];
/** Where bone `k` (0 to 2) of a finger starts, on the side `sd` (+1 left, -1 right). */
function boneAt(name, k, sd) {
  if (name === 'thumb') {
    const run = THUMB.len.slice(0, k).reduce((a, b) => a + b, 0);
    return [sd * (HAND_X + THUMB.at[0]), THUMB.at[1] + thumbDir[1] * run, THUMB.at[2] + thumbDir[2] * run];
  }
  const f = FINGER[name];
  return [sd * HAND_X, f.y - f.len.slice(0, k).reduce((a, b) => a + b, 0), f.z];
}
for (const [s, sd] of [['L', 1], ['R', -1]]) for (const name of FINGER_NAMES) for (let k = 0; k < 3; k++) AT[`${name}${s}${k + 1}`] = boneAt(name, k, sd);
const fingerJoints = {};
for (const s of ['L', 'R']) for (const name of FINGER_NAMES) for (let k = 1; k <= 3; k++) fingerJoints[`${name}${s}${k}`] = { parent: k === 1 ? `wrist${s}` : `${name}${s}${k - 1}`, at: AT[`${name}${s}${k}`] };

const P = (joint, id, name, group, layer, delay, ex, tag, conf, src, desc, specs, build) => ({ id, name, group, layer, delay, home: [0, 0, 0], ex, tag, conf, src, desc, specs, build, joint });
const SRC = ['ut-g1', 'ut-g1-parts'];
const HAND_SRC = ['ut-dex5', 'ut-dex3', 'ut-g1'];
const sides = (fn) => [['L', 1, 'Left'], ['R', -1, 'Right']].map(([s, sd, word]) => fn(s, sd, word));

export default {
  id: 'g1',
  name: 'Unitree G1',
  short: 'G1',
  maker: 'Unitree Robotics',
  blurb: 'Humanoid robot, 1.32 m tall and about 35 kg, with 23 joint motors (up to 43), a 3D LiDAR and a depth camera in its head, and a quick-release battery. In camera mode it copies your arms and turns as you turn.',
  accent: '#3de0ff', accent2: '#ffd166',
  studio: { accent: '#1f6fe0', accent2: '#c98a1a' },
  hover: 0.4,
  race: false, noDock: true,
  mats: { studio: { shell: { color: 0xe6e8eb, metalness: 0.25, roughness: 0.32, clearcoat: 0.6 }, shellDk: { color: 0x17191c, metalness: 0.4, roughness: 0.45 }, trim: { color: 0x2a2e33 } } },
  dims: { h: 1320, w: 450, l: 200 }, dimsSkip: ['foot-l', 'foot-r'],
  kpis: [['Height', '1.32 m'], ['Weight', '≈ 35 kg'], ['Joints', '23–43']],
  stats: [
    ['Size standing', '1,320 × 450 × 200 mm (height × width × thickness)'],
    ['Size folded', '690 × 450 × 300 mm'],
    ['Weight', 'About 35 kg with the battery'],
    ['Joints', '23 (G1) · 23 to 43 (G1 EDU)'],
    ['Per leg', '6: hip 3 + knee 1 + ankle 2'],
    ['Per arm', '5: shoulder 3 + elbow 2 (+ 2 at the wrist, optional)'],
    ['Waist', '1 (+ 2 optional)'],
    ['Hands (Unitree lists for the G1)', 'Optional three-finger force-control hand Dex3-1: 7 joints, 710 g, 33 touch sensors'],
    ['Hands (shown here)', 'Unitree Dex5-1 five-finger hand: 20 joints (16 driven + 4), 1,100 g, 217.3 × 127.5 × 72.1 mm laid flat'],
    ['Finger range (Dex5-1)', 'Four fingers: side swing ±22°, then 0–90°, 0–95°, 0–81° · thumb: -33.5 to 39°, 0–100°, 0–110°, 0–92°'],
    ['Knee torque', '90 N·m (G1) · 120 N·m (G1 EDU)'],
    ['Arm load', 'About 2 kg (G1) · about 3 kg (G1 EDU)'],
    ['Legs', 'Calf + thigh 0.6 m'],
    ['Joint range', 'Waist Z ±155° · knee 0–165° · hip P ±154°, R -30 to +170°, Y ±158°'],
    ['Motors', 'Low-inertia inner-rotor PMSM · crossed roller bearings · dual encoders'],
    ['Wiring', 'Hollow joints: no external cables'],
    ['Cooling', 'Local air cooling'],
    ['Sensing', '3D LiDAR (Livox MID-360) · depth camera (Intel RealSense D435i)'],
    ['Audio', '4-microphone array · stereo 5 W speaker'],
    ['Computing', '8-core high-performance CPU · optional high computing power module (Orin and others)'],
    ['Wireless', 'Wi-Fi 6 · Bluetooth 5.2'],
    ['Battery', '13-string lithium, 9,000 mAh, quick release · about 2 h · charger 54 V 5 A'],
    ['Speed', 'Moving speed of 2 m/s'],
    ['Warranty', '8 months (G1) · 18 months (G1 EDU)'],
  ],
  notes: [
    'Unitree sells the G1 and the G1 EDU; the table gives both where they differ (joints, knee torque, arm load, warranty). The model shows the standard 23-joint body.',
    'Hands: Unitree\'s G1 page lists the three-finger Dex3-1 as the G1\'s hand option. The model wears Unitree\'s five-finger Dex5-1 instead, so that all five of your fingers can be copied in camera mode. Unitree\'s Dex5-1 page gives its size, joints and joint ranges but does not say which robots it fits, so its fit on the G1 is an assumption of this catalogue, and the shape of each finger is schematic.',
    'The part names and the two sensor models (Livox MID-360, Intel RealSense D435i) are from Unitree\'s own labelled picture of the G1.',
    'The body\'s proportions follow the published 1,320 × 450 × 200 mm and the 0.6 m of calf plus thigh; the split between thigh and shin, the arm lengths and where each motor sits are read from Unitree\'s pictures.',
    'Whole-body tracking: with hand control running and this robot open, choose "Track my whole body". The camera then follows your body and both hands: head (up, down, left, right, tilt), arms, the roll of each forearm, which way each palm faces, every finger, the lean and twist of your body, legs and feet, and where you step. The panel lights up each region the camera can see; what it cannot see stands still.',
    'Unitree asks users to keep a safe distance from the real robot and calls it a civilian robot; it gives no ingress-protection rating, so the catalogue lists it as an indoor robot.',
  ],
  sources: ['ut-g1', 'ut-g1-parts'],

  rig: {
    joints: {
      pelvis: { at: AT.pelvis }, torso: { parent: 'pelvis', at: AT.torso }, head: { parent: 'torso', at: AT.head },
      shoulderL: { parent: 'torso', at: AT.shoulderL }, elbowL: { parent: 'shoulderL', at: AT.elbowL }, wristL: { parent: 'elbowL', at: AT.wristL },
      shoulderR: { parent: 'torso', at: AT.shoulderR }, elbowR: { parent: 'shoulderR', at: AT.elbowR }, wristR: { parent: 'elbowR', at: AT.wristR },
      hipL: { parent: 'pelvis', at: AT.hipL }, kneeL: { parent: 'hipL', at: AT.kneeL }, ankleL: { parent: 'kneeL', at: AT.ankleL },
      hipR: { parent: 'pelvis', at: AT.hipR }, kneeR: { parent: 'hipR', at: AT.kneeR }, ankleR: { parent: 'kneeR', at: AT.ankleR },
      ...fingerJoints,
    },
    thigh: THIGH, shin: SHIN, trunk: AT.shoulderL[1] - AT.hipL[1],
  },

  parts: [
    // ───────────── Torso ─────────────
    P('torso', 'top-cover', 'Chest shell', 'shell', 0, 0, [0, 0.6, 3.2], 'Chest', 'named', SRC,
      'The silver-white front of the torso, wider at the shoulders and narrower at the waist, with a small dark triangle mark high on the chest. It lifts away first.',
      [['Torso', 'About 450 mm across the shoulders with the arms']],
      (b) => {
        b.profile([[-1.5, 10.95, 0.35], [1.5, 10.95, 0.35], [1.42, 9.6, 0.3], [1.18, 8.15, 0.3], [-1.18, 8.15, 0.3], [-1.42, 9.6, 0.3]], 0.75, { axis: 'z', m: SHELL, at: [0, 0, 0.55], bevel: 0.22 });
        b.profile([[-0.16, 10.42, 0.02], [0.16, 10.42, 0.02], [0, 10.2, 0.02]], 0.04, { axis: 'z', m: BLACK2, at: [0, 0, 0.94], bevel: 0.01, e: false });
      }),
    P('torso', 'rear-cover', 'Back shell', 'shell', 0, 0.03, [0, 0.6, -3.2], 'Back', 'named', SRC,
      'The back of the torso. Air for the local air cooling passes through it, and the electronics sit behind it.',
      [['Cooling', 'Local air cooling']],
      (b) => {
        b.profile([[-1.5, 10.95, 0.35], [1.5, 10.95, 0.35], [1.42, 9.6, 0.3], [1.18, 8.15, 0.3], [-1.18, 8.15, 0.3], [-1.42, 9.6, 0.3]], 0.75, { axis: 'z', m: SHELL2, at: [0, 0, -0.42], bevel: 0.22 });
        for (let i = 0; i < 5; i++) b.box(1.3, 0.05, 0.03, { m: BLACK2, at: [0, 10.2 - i * 0.16, -0.81], e: false });
      }),
    P('torso', 'torso-frame', 'Torso frame', 'drive', 3, 0.1, [0, 1.8, 0], 'Frame', 'inferred', SRC,
      'The frame inside the torso that carries the shoulders, the neck, the battery and the computer. All the wiring runs through the hollow joints, so there are no external cables.',
      [['Wiring', 'Hollow joint wiring, no external cables']],
      (b) => { b.box(2.3, 2.6, 0.5, { m: 'metal', r: 0.1, at: [0, 9.5, 0.06] }); b.cyl(0.42, 0.42, 0.5, { m: BLACK, at: [0, 11.1, 0], seg: 24 }); }),
    P('torso', 'battery', 'Quick-release battery', 'power', 1, 0.02, [3.4, 0.4, 0], 'Battery', 'confirmed', SRC,
      'An extra-large quick-release battery in the side of the torso, with level lights. It is a 13-string lithium pack of 9,000 mAh that runs the robot for about 2 hours and charges at 54 V 5 A.',
      [['Capacity', '9,000 mAh · 13-string lithium'], ['Runtime', 'About 2 h'], ['Charger', '54 V 5 A']],
      (b) => {
        b.box(0.5, 1.9, 1.1, { m: 'battery', r: 0.08, at: [1.2, 9.45, 0.05] });
        b.box(0.06, 1.6, 0.7, { m: BLACK2, r: 0.04, at: [1.47, 9.45, 0.05], e: false });
        for (let i = 0; i < 4; i++) b.box(0.03, 0.05, 0.06, { m: 'green', at: [1.5, 9.5, -0.1 + i * 0.09], e: false });
      }),
    P('torso', 'computer', 'Main computer', 'power', 2, 0.06, [0, 0.4, -2.2], 'Brain', 'confirmed', SRC,
      'An 8-core high-performance CPU runs the robot; the G1 EDU can add a high computing power module (Orin and others). Unitree\'s imitation and reinforcement learning controls the walking.',
      [['CPU', '8-core'], ['Option', 'High computing power module (EDU)']],
      (b) => { b.at([0, 9.9, -0.2], () => L.pcb(b, { w: 1.6, d: 1.3, vertical: true })); }),
    P('torso', 'wireless', 'Wireless module', 'power', 2, 0.08, [-2.4, 0.4, -1.2], 'Radio', 'confirmed', ['ut-g1'],
      'Wi-Fi 6 and Bluetooth 5.2 for the app, the manual controller and software updates over the air.',
      [['Wi-Fi', 'Wi-Fi 6'], ['Bluetooth', '5.2']],
      (b) => { b.at([-0.6, 8.8, -0.15], () => L.pcb(b, { w: 0.8, d: 0.7, vertical: true })); }),
    P('torso', 'audio', 'Microphone array and speaker', 'ui', 1, 0.08, [0, 1.4, 2.2], 'Audio', 'confirmed', SRC,
      'A 4-microphone array with noise and echo cancellation, and a stereo speaker of 5 W, for voice. Their openings are small holes high on the chest.',
      [['Microphones', '4, noise and echo cancelling'], ['Speaker', 'Stereo, 5 W']],
      (b) => {
        for (const x of [-0.75, -0.25, 0.25, 0.75]) b.cyl(0.035, 0.035, 0.03, { m: BLACK2, rot: [PI / 2, 0, 0], at: [x, 10.75, 0.9], seg: 8, e: false });
        for (const x of [-0.9, 0.9]) b.cyl(0.2, 0.2, 0.12, { m: 'dark', rot: [PI / 2, 0, 0], at: [x, 10.2, 0.72], seg: 16 });
      }),

    // ───────────── Head ─────────────
    P('head', 'head-shell', 'Head', 'shell', 0, 0.05, [0, 2.6, 0], 'Head', 'named', SRC,
      'The head: a dark domed cap over a black face visor, on a black neck. A blue light ring runs round the visor.',
      [['Height', '1,320 mm to the top of the head']],
      (b) => {
        b.cyl(0.3, 0.4, 0.65, { m: BLACK, at: [0, 11.55, 0], seg: 20 });
        b.at([0, 12.3, 0.05], () => {
          const cap = b.sph(0.82, { m: BLACK, seg: 28 }); cap.scale.set(0.95, 1.08, 1.12);
          const face = b.sph(0.66, { m: VISOR, at: [0, -0.12, 0.42], seg: 28 }); face.scale.set(0.92, 1.16, 0.62);
          b.tor(0.6, 0.035, { m: 'ledBlue', at: [0, -0.12, 0.66], seg: 40, e: false }).scale.set(0.95, 1.2, 1);
          b.box(0.6, 0.07, 0.04, { m: 'ledBlue', r: 0.03, at: [0, 0.25, 0.8], e: false });
        });
      }),
    P('head', 'lidar', '3D LiDAR', 'sense', 1, 0.02, [0, 3.4, 1.4], 'LiDAR', 'confirmed', SRC,
      'A Livox MID-360 3D LiDAR in the head. With the depth camera it gives the robot 360° detection of the space round it.',
      [['Model', 'Livox MID-360'], ['Coverage', '360° perception with the depth camera']],
      (b) => { b.at([0, 12.75, 0.35], () => { b.cyl(0.33, 0.33, 0.3, { m: 'dark', seg: 24 }); b.cyl(0.3, 0.3, 0.16, { m: 'lens', at: [0, 0.2, 0], seg: 24 }); }); }),
    P('head', 'depth-camera', 'Depth camera', 'sense', 1, 0.04, [0, 2.0, 2.6], 'Camera', 'confirmed', SRC,
      'An Intel RealSense D435i depth camera behind the visor. It sees the shape of what is in front of the robot, for manipulation and for walking.',
      [['Model', 'Intel RealSense D435i']],
      (b) => { b.at([0, 12.42, 0.72], () => { b.box(0.7, 0.16, 0.14, { m: 'dark', r: 0.05 }); for (const x of [-0.24, 0, 0.24]) b.cyl(0.05, 0.05, 0.04, { m: 'lens', rot: [PI / 2, 0, 0], at: [x, 0, 0.08], seg: 12, e: false }); }); }),

    // ───────────── Waist and pelvis ─────────────
    P('pelvis', 'waist', 'Waist joint', 'drive', 2, 0.02, [0, 0, 2.6], 'Waist', 'confirmed', SRC,
      'The black waist joint between the torso and the hips turns the upper body ±155°. The G1 EDU can add two more waist joints (±30° forward and sideways).',
      [['Range', 'Z ±155°'], ['Option', 'X ±30°, Y ±30° (EDU)']],
      (b) => { b.cyl(0.62, 0.62, 0.34, { m: BLACK, at: [0, 7.95, 0], seg: 28 }); b.cyl(0.5, 0.5, 0.3, { m: 'metal', at: [0, 7.68, 0], seg: 28 }); b.cyl(0.66, 0.66, 0.2, { m: BLACK2, at: [0, 7.45, 0], seg: 28 }); }),
    P('pelvis', 'pelvis', 'Pelvis', 'drive', 3, 0.06, [0, -0.4, -2.6], 'Hips', 'named', SRC,
      'The black block that carries the waist and the two hip joints. Unitree calls the hip and leg motors the core motion module.',
      [['Width', 'Hips about 190 mm apart']],
      (b) => { b.box(2.5, 0.75, 1.3, { m: BLACK, r: 0.2, at: [0, 6.98, 0] }); b.box(1.0, 0.7, 0.3, { m: BLACK2, r: 0.1, at: [0, 6.9, 0.62] }); }),

    // ───────────── Arms ─────────────
    ...sides((s, sd, word) => P(`shoulder${s}`, `shoulder-${s.toLowerCase()}`, `${word} shoulder`, 'arm', 1, 0.04, [sd * 2.2, 1.6, 0], 'Shoulder', 'confirmed', SRC,
      'Three joints at the shoulder: the arm swings forward, out to the side and twists. The round silver cap covers the outer motor.',
      [['Joints', '3 at the shoulder'], ['Motor', 'Inner-rotor PMSM, dual encoders']],
      (b) => {
        b.at([sd * 1.85, 10.55, 0], () => {
          b.cyl(0.5, 0.5, 0.7, { m: SHELL, rot: [0, 0, PI / 2], seg: 28 });
          b.cyl(0.36, 0.36, 0.06, { m: SHELL2, rot: [0, 0, PI / 2], at: [sd * 0.37, 0, 0], seg: 24, e: false });
          b.cyl(0.4, 0.4, 0.3, { m: BLACK, rot: [0, 0, PI / 2], at: [-sd * 0.42, 0, 0], seg: 22 });
        });
      })),
    ...sides((s, sd, word) => P(`shoulder${s}`, `upper-arm-${s.toLowerCase()}`, `${word} upper arm`, 'arm', 1, 0.08, [sd * 3.2, 0.6, 0], 'Upper arm', 'named', SRC,
      'The silver upper arm from the shoulder to the elbow. The wiring runs inside it.',
      [['Arm load', 'About 2 kg (3 kg on the EDU)']],
      (b) => { b.box(0.62, 1.55, 0.66, { m: SHELL, r: 0.26, at: [sd * 1.88, 9.55, 0] }); b.cyl(0.3, 0.3, 0.2, { m: BLACK, at: [sd * 1.88, 10.08, 0], seg: 20, e: false }); })),
    ...sides((s, sd, word) => P(`elbow${s}`, `elbow-${s.toLowerCase()}`, `${word} elbow`, 'arm', 2, 0.04, [sd * 3.6, 0, 0.8], 'Elbow', 'confirmed', SRC,
      'Two joints at the elbow: it bends and the forearm rolls. The black round motor shows on the outside of the arm.',
      [['Joints', '2 at the elbow']],
      (b) => { b.cyl(0.4, 0.4, 0.62, { m: BLACK, rot: [0, 0, PI / 2], at: [sd * 1.88, 8.65, 0], seg: 26 }); b.cyl(0.26, 0.26, 0.05, { m: 'metal', rot: [0, 0, PI / 2], at: [sd * 2.2, 8.65, 0], seg: 20, e: false }); })),
    ...sides((s, sd, word) => P(`elbow${s}`, `forearm-${s.toLowerCase()}`, `${word} forearm`, 'arm', 1, 0.1, [sd * 3.2, -0.6, 0], 'Forearm', 'named', SRC,
      'The silver forearm, with black ribbed rings above the wrist. The G1 EDU can add two wrist joints here (±92.5° each).',
      [['Wrist option', 'P ±92.5°, Y ±92.5° (EDU)']],
      (b) => {
        b.box(0.56, 1.25, 0.6, { m: SHELL, r: 0.24, at: [sd * 1.88, 7.85, 0] });
        for (let i = 0; i < 3; i++) b.cyl(0.3, 0.3, 0.07, { m: BLACK, at: [sd * 1.88, 7.16 - i * 0.1, 0], seg: 20, e: false });
      })),
    ...sides((s, sd, word) => P(`wrist${s}`, `hand-${s.toLowerCase()}`, `${word} palm`, 'arm', 1, 0.12, [sd * 3.0, -1.2, 0.6], 'Hand', 'inferred', HAND_SRC,
      'The palm of a five-finger hand, drawn after Unitree\'s Dex5-1. Unitree lists the three-finger Dex3-1 for the G1; the five-finger hand is shown so that every finger of yours can be copied, and its fit on the G1 is assumed. At rest the palm faces the body.',
      [['Hand', 'Dex5-1: 20 joints (16 driven + 4)'], ['Size laid flat', '217.3 × 127.5 × 72.1 mm'], ['Weight', '1,100 g'], ['Touch', '94 pressure sensors on the Dex5-1P']],
      (b) => {
        b.cyl(0.27, 0.3, 0.2, { m: BLACK, at: [sd * HAND_X, 6.78, 0], seg: 20, e: false });
        b.box(0.34, 0.92, 0.82, { m: BLACK, r: 0.12, at: [sd * HAND_X, 6.25, 0] });
        b.box(0.05, 0.6, 0.56, { m: RUBBER, r: 0.02, at: [sd * (HAND_X - 0.17), 6.2, 0], e: false }); // the palm pad, on the side that faces the body
        for (const f of Object.values(FINGER)) b.cyl(0.1, 0.1, 0.3, { m: 'metal', rot: [0, 0, PI / 2], at: [sd * HAND_X, f.y, f.z], seg: 14, e: false });
        b.cyl(0.12, 0.12, 0.3, { m: 'metal', rot: [0, 0, PI / 2], at: [sd * (HAND_X + THUMB.at[0]), THUMB.at[1], THUMB.at[2]], seg: 14, e: false });
      })),
    ...[['L', 1, 'Left'], ['R', -1, 'Right']].flatMap(([s, sd, word]) => FINGER_NAMES.flatMap((name, fi) => [0, 1, 2].map((k) => {
      const thumb = name === 'thumb';
      const len = (thumb ? THUMB : FINGER[name]).len[k], at = AT[`${name}${s}${k + 1}`];
      const wide = (thumb ? 0.2 : name === 'little' ? 0.15 : 0.17) - k * 0.012;
      const range = thumb ? ['-33.5 to 39° and 0–100°', '0–110°', '0–92°'][k] : ['Side swing ±22° and 0–90°', '0–95°', '0–81°, coupled to the joint before it'][k];
      return P(`${name}${s}${k + 1}`, `${name}-${s.toLowerCase()}-${k + 1}`, `${word} ${name === 'little' ? 'little finger' : name === 'thumb' ? 'thumb' : `${name} finger`}: ${BONE_WORD[k]}`, 'arm', 2, 0.14 + fi * 0.01 + k * 0.01,
        [sd * (2.6 + k * 0.5), -1.4 - k * 0.7, (thumb ? 1.6 : (FINGER[name].z) * 5) + 0.3], 'Finger', 'inferred', HAND_SRC,
        `The ${BONE_WORD[k]} bone of the ${word.toLowerCase()} ${name === 'thumb' ? 'thumb' : `${name} finger`}. In camera mode it bends with the same finger of your hand. The joint ranges are Unitree's for the Dex5-1; the shape is schematic.`,
        [['Joint range (Dex5-1)', range]],
        (b) => {
          const seg = () => {
            b.box(wide, len - 0.03, wide + 0.02, { m: k === 2 ? BLACK2 : BLACK, r: 0.06, at: [0, -len / 2, 0] });
            b.cyl(wide * 0.52, wide * 0.52, wide + 0.03, { m: 'metal', rot: [0, 0, PI / 2], at: [0, 0, 0], seg: 12, e: false });
            if (k === 2) b.box(0.04, len * 0.5, wide * 0.8, { m: RUBBER, r: 0.015, at: [-sd * wide * 0.5, -len * 0.62, 0], e: false }); // the fingertip pad, on the palm side
          };
          b.at(at, seg, thumb ? [-THUMB.tilt, 0, 0] : undefined);
        });
    }))),

    // ───────────── Legs ─────────────
    ...sides((s, sd, word) => P(`hip${s}`, `hip-${s.toLowerCase()}`, `${word} hip`, 'drive', 2, 0.06, [sd * 2.6, 0.4, 1.2], 'Hip', 'confirmed', SRC,
      'Three joints at the hip, with a wide range: pitch ±154°, roll -30° to +170° and yaw ±158°. This range is what lets the G1 fold down to 690 mm and stand up from the floor.',
      [['Joints', '3 at the hip'], ['Range', 'P ±154° · R -30 to +170° · Y ±158°']],
      (b) => { b.cyl(0.55, 0.55, 0.8, { m: BLACK, rot: [0, 0, PI / 2], at: [sd * 0.95, 6.65, 0], seg: 28 }); b.cyl(0.42, 0.42, 0.1, { m: SHELL2, rot: [0, 0, PI / 2], at: [sd * 1.4, 6.65, 0], seg: 24, e: false }); })),
    ...sides((s, sd, word) => P(`hip${s}`, `thigh-${s.toLowerCase()}`, `${word} thigh`, 'drive', 3, 0.02, [sd * 3.0, 0, 0], 'Thigh', 'named', SRC,
      'The silver thigh, rounded at the top and tapering to the knee. Thigh and calf together are 0.6 m.',
      [['Calf + thigh', '0.6 m']],
      (b) => { b.profile([[-0.52, 6.6, 0.3], [0.52, 6.6, 0.3], [0.42, 4.05, 0.25], [-0.42, 4.05, 0.25]], 0.95, { axis: 'z', m: SHELL, at: [sd * 0.95, 0, 0.02], bevel: 0.3 }); })),
    ...sides((s, sd, word) => P(`knee${s}`, `knee-${s.toLowerCase()}`, `${word} knee`, 'drive', 2, 0.1, [sd * 3.0, 0, 1.4], 'Knee', 'confirmed', SRC,
      'One joint at the knee, the strongest on the robot: 90 N·m at most (120 N·m on the G1 EDU). It bends 0 to 165°. The black round motor shows on the side.',
      [['Torque', '90 N·m (120 N·m EDU)'], ['Range', '0–165°']],
      (b) => { b.cyl(0.46, 0.46, 0.9, { m: BLACK, rot: [0, 0, PI / 2], at: [sd * 0.95, 3.65, 0], seg: 28 }); b.cyl(0.3, 0.3, 0.08, { m: BLACK2, rot: [0, 0, PI / 2], at: [sd * 1.42, 3.65, 0], seg: 20, e: false }); })),
    ...sides((s, sd, word) => P(`knee${s}`, `shin-${s.toLowerCase()}`, `${word} shin`, 'drive', 3, 0.06, [sd * 3.0, -0.4, 0], 'Shin', 'named', SRC,
      'The silver shin. Two slim rods at its lower end drive the two ankle joints from motors higher up, which keeps the foot light.',
      [['Ankle drive', 'Two rods to the ankle']],
      (b) => {
        b.profile([[-0.42, 3.3, 0.22], [0.42, 3.3, 0.22], [0.3, 1.45, 0.2], [-0.3, 1.45, 0.2]], 0.8, { axis: 'z', m: SHELL, at: [sd * 0.95, 0, 0], bevel: 0.25 });
        for (const x of [-0.16, 0.16]) F.rod(b, [sd * 0.95 + x, 1.5, -0.12], [sd * 0.95 + x, 0.75, -0.12], 0.05, { m: 'steel', seg: 8, e: false });
        b.box(0.5, 0.75, 0.3, { m: 'metal', r: 0.06, at: [sd * 0.95, 1.05, 0.1] });
      })),
    ...sides((s, sd, word) => P(`ankle${s}`, `foot-${s.toLowerCase()}`, `${word} foot`, 'drive', 3, 0.1, [sd * 2.4, -0.2, 1.8], 'Foot', 'confirmed', SRC,
      'Two joints at the ankle and a black foot with a rubber sole. The robot moves at 2 m/s.',
      [['Joints', '2 at the ankle'], ['Speed', '2 m/s']],
      (b) => {
        b.cyl(0.2, 0.2, 0.6, { m: BLACK, rot: [0, 0, PI / 2], at: [sd * 0.95, 0.65, 0], seg: 18 });
        b.profile([[-0.75, 0.0, 0.1], [1.45, 0.0, 0.14], [1.4, 0.3, 0.14], [0.5, 0.62, 0.2], [-0.6, 0.6, 0.2]], 0.85, { axis: 'x', m: RUBBER, at: [sd * 0.95, 0, 0], bevel: 0.12 });
      })),
  ],
};
