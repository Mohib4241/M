// SMP Robotics S5.2 PTZ outdoor security robot (the product deck writes "S5.2TPZ"). Y up, +Z front, 1 unit = 100 mm.
// The size and the technical figures come from SMP's brochure for the S5.2 series (2019): 1,420 mm long, 780 mm wide,
// 1,670 mm tall with the mast, a 930 mm wheelbase and 210 mm of ground clearance. The outside follows the drawing in
// that brochure and the product picture in the product deck: a quad-bike shaped body (a blue fibreglass top over a
// silver frame), a row of lenses at the nose, a silver mast and a blue head with a pan-tilt-zoom camera on top. Where
// parts sit inside is a schematic reconstruction, not CAD.
import * as THREE from 'three';
import * as L from '../lib.js';
import * as F from '../field.js';

const PI = Math.PI;
const P = (id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build) => ({ id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build });
const BLUE = { k: 'shell', id: 's52-blue', color: 0x1c3a9c, metalness: 0.2, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.18 };
const BLUE2 = { k: 'shellDk', id: 's52-blue2', color: 0x152c7a, metalness: 0.25, roughness: 0.35, clearcoat: 0.6 };
const SILVER = { k: 'silver', id: 's52-silver', color: 0xb7bcc1, metalness: 0.6, roughness: 0.35 };
const MASTM = { k: 'silver', id: 's52-mast', color: 0xa6abb0, metalness: 0.8, roughness: 0.3 };

const WR = 2.3, WZ = 4.65, WX = 3.28, WW = 1.25;     // wheel radius, half wheelbase (930 mm), half track, tyre width
const MASTZ = 4.9, MASTY0 = 5.8, MASTY1 = 12.4;      // the mast rises from the front platform

export default {
  id: 'smp-s52',
  name: 'SMP Robotics S5.2 PTZ',
  short: 'S5.2 PTZ',
  maker: 'SMP Robotics',
  blurb: 'Outdoor patrol robot of the S5.2 series: a quad-bike shaped, IP65-sealed rover 1.4 m long and 1.7 m tall, with panoramic cameras at the nose and a pan-tilt-zoom camera on a mast.',
  accent: '#3de0ff', accent2: '#ffd166',
  studio: { accent: '#1c3a9c', accent2: '#c98a1a' },
  hover: 0.4,
  race: false, noDock: true,
  kpis: [['Range', '24 km'], ['Rating', 'IP65'], ['Height', '1.67 m']],
  stats: [
    ['Size', '1,420 × 780 mm · 1,670 mm tall (with the mast)'],
    ['Wheelbase', '930 mm · 530 mm between the tyres · 210 mm clearance'],
    ['Rating', 'IP65 · -25 to +45 °C'],
    ['Range', 'Up to 24 km at +5 °C'],
    ['Patrol', 'Estimated 10–16 h by model (up to 18 h in SMP\'s feature list)'],
    ['Drive', 'Rear differential drive, 24 V DC, 500 W · electromagnetic brake'],
    ['Battery', '2 × 12.8 V 200 Ah LiFePO4 (2 × 12.6 V 120 Ah lead-acid for trials)'],
    ['Charging', '4 h fast · 6 h normal · 48 V 600 W off-board charger'],
    ['Cameras', '720P panoramic · PTZ ×20, 1/2.8", 1080P on the IP version'],
    ['Detection', 'People to 100 m with the PTZ camera, 30 m with the panoramic ones'],
    ['Body', 'Fibreglass on a hard-anodised aluminium frame · blue, orange or green'],
    ['Link', '4G · Wi-Fi and Wi-Fi mesh · Bluetooth · radio control 915 / 434 MHz'],
    ['Intercom', 'IP intercom · audio file playback · multi-colour beacon · alarm button'],
    ['Navigation', 'Visual · GPS · RFID anchors for places without sky or markers · RTK base station'],
    ['Charger', 'ACS 5 charger station: contacts rise from the ground to plates under the robot'],
  ],
  notes: [
    'The deck writes "S5.2TPZ"; SMP\'s name for the version with the pan-tilt-zoom camera is S5.2 PTZ.',
    'The S5.2 series has four versions (Promt, Picard, DJet and Kepler); they differ in their cameras, computer and Wi-Fi antennas. The size, the body and the drive are the same, and the figures here are common to all.',
    'SMP sells the S5.2 with equipment that is not on the robot and not modelled: the ACS 5 automatic charger station (1,480 × 1,469 × 225 mm, 40 kg: contacts rise out of the ground to the plates under the robot), the BS 5 GPS base station (RTK, 10 km radius), RFID anchors (70 m range) for places without sky or markers, and a rugged remote control.',
    'SMP says the S5.2 is for professional group use: using fewer than three robots at one site makes no sense, and swarm work covers up to 100 robots.',
    'SMP\'s brochure lists the weight of its own accessories, not of the whole robot, so no weight is given.',
  ],
  sources: ['deck', 'smp-s52', 'smp-site'],

  parts: [
    P('top-cover', 'Body shell', 'shell', 0, 0, [0, 0, 0], [0, 3.6, 0], 'Shell', 'named', ['deck', 'smp-s52'],
      'The blue fibreglass top of the body, shaped like a quad bike: a flat front platform with a faceted nose, a dip in the middle and a raised tail. It is the first piece to lift off.',
      [['Body', 'Fibreglass · blue, orange or green']],
      (b) => {
        b.profile([[7.1, 4.1, 0.3], [7.15, 5.3, 0.4], [4.2, 5.9, 0.5], [1.0, 5.3, 0.8], [-3.5, 6.1, 0.8], [-6.8, 6.8, 0.4], [-7.0, 4.2, 0.3]], 4.9, { axis: 'x', m: BLUE, bevel: 0.22 });
        b.box(2.0, 0.06, 4.0, { m: BLUE2, r: 0.1, at: [0, 6.0, -3.2], e: false });
        for (const x of [-1.9, 1.9]) b.box(0.55, 0.3, 0.1, { m: 'red', r: 0.05, at: [x, 6.2, -7.1], e: false });
      }),
    P('lights', 'Nose lenses and lights', 'sense', 1, 0.04, [0, 0, 0], [0, 1.4, 3.6], 'Lenses', 'named', ['deck', 'smp-s52'],
      'A row of six round lenses and lamps across the nose: the panoramic cameras (720P, 0.005 lux) and the headlights. SMP lists a multi-colour beacon too.',
      [['Panoramic cameras', '720P, 0.005 lux']],
      (b) => {
        b.box(4.2, 0.55, 0.12, { m: BLUE2, r: 0.1, at: [0, 5.1, 7.1] });
        for (let i = 0; i < 6; i++) b.cyl(0.2, 0.2, 0.1, { m: i % 3 === 1 ? 'lamp' : 'lens', rot: [PI / 2, 0, 0], at: [(i - 2.5) * 0.7, 5.1, 7.2], seg: 18 });
      }),
    P('lower-body', 'Lower body and frame', 'shell', 0, 0.06, [0, 0, 0], [0, -0.8, 0], 'Frame', 'named', ['deck', 'smp-s52'],
      'The silver-grey lower body of hard-anodised aluminium. It sits 210 mm off the ground.',
      [['Frame', 'Aluminium alloy, hard anodised'], ['Clearance', '210 mm']],
      (b) => {
        b.box(4.9, 1.7, 12.6, { m: SILVER, r: 0.4, at: [0, 3.1, -0.2] });
        b.box(5.1, 0.12, 12.8, { m: 'dark', r: 0.05, at: [0, 2.25, -0.2], e: false });
      }),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'wheels-r' : 'wheels-l', sd < 0 ? 'Right wheels' : 'Left wheels', 'drive', 2, 0.06,
      [0, 0, 0], [sd * 4.0, 0, 0], 'Wheels', 'named', ['deck', 'smp-s52'],
      'Two off-road wheels a side: deep-block tyres on silver multi-spoke rims. The 930 mm wheelbase and the long-travel springs let it ride over obstacles up to 7 in high.',
      [['Wheelbase', '930 mm'], ['Obstacles', 'Up to 7 in']],
      (b) => { for (const f of [-1, 1]) b.at([sd * WX, WR, f * WZ], () => F.offroadWheel(b, { r: WR, w: WW, side: sd, rimM: SILVER, blocks: 30 })); })),
    P('suspension', 'Suspension', 'drive', 3, 0.1, [0, 0, 0], [0, -2.2, 0], 'Springs', 'named', ['deck'],
      'A wishbone arm with an orange coil-over spring on each wheel, as the picture shows.',
      [['Springs', 'Coil-over, one a wheel']],
      (b) => {
        for (const sd of [-1, 1]) for (const f of [-1, 1]) {
          F.bar(b, [sd * 1.7, 2.8, f * WZ], [sd * (WX - 0.4), 2.3, f * WZ], { w: 0.2, h: 0.18, m: 'trim', r: 0.03 });
          b.at([sd * 2.55, 3.2, f * (WZ - 0.6)], () => F.coil(b, 0.22, 1.2, { m: { k: 'yellow', id: 's52-spring', color: 0xe0831c, emissive: 0x000000 } }), [0, 0, sd * -0.3]);
        }
      }),
    P('mast', 'Mast', 'arm', 1, 0.08, [0, 0, 0], [0, 4.0, 1.2], 'Mast', 'named', ['deck', 'smp-s52'],
      'A silver mast from the front platform that lifts the camera head to 1,670 mm.',
      [['Height', '1,670 mm (with the head)']],
      (b) => {
        b.cyl(0.58, 0.58, MASTY1 - MASTY0, { m: MASTM, at: [0, (MASTY0 + MASTY1) / 2, MASTZ], seg: 30 });
        b.cyl(0.9, 0.9, 0.3, { m: BLUE2, at: [0, MASTY0 + 0.1, MASTZ], seg: 30, e: false });
      }),
    P('head', 'PTZ and camera head', 'sense', 1, 0.1, [0, 0, 0], [0, 4.4, 1.4], 'Camera', 'named', ['deck', 'smp-s52'],
      'A blue head at the top of the mast with a ring of panoramic cameras round it and a pan-tilt-zoom camera on top, ×20 optical zoom. SMP\'s on-board AI finds people to 100 m with it, recognises faces and staff uniforms and follows a moving person.',
      [['PTZ', '×20 zoom, 1/2.8"'], ['Detection', 'People to 100 m']],
      (b) => {
        b.at([0, MASTY1, MASTZ], () => {
          b.lathe([[0.001, 0], [0.95, 0.15], [1.0, 0.8], [0.95, 2.3], [0.7, 2.9], [0.001, 3.0]], { m: BLUE, seg: 36 });
          for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2 + 0.25; b.cyl(0.12, 0.12, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [Math.sin(a) * 0.98, 1.2, Math.cos(a) * 0.98], seg: 12, e: false }); }
          b.cyl(0.45, 0.45, 0.6, { m: 'shell', at: [0, 3.25, 0], seg: 24 });
          b.sph(0.45, { m: { k: 'shell', id: 's52-dome', color: 0xf2f3f4, roughness: 0.2, clearcoat: 0.8 }, at: [0, 3.55, 0], seg: 24 });
          b.cyl(0.2, 0.2, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [0, 3.55, 0.42], seg: 16, e: false });
        });
      }),
    P('drive-motor', 'Rear drive', 'drive', 3, 0.12, [0, 0, 0], [0, -2.0, -2.4], 'Drive', 'named', ['smp-s52'],
      'A differential drive on the rear axle, 24 V DC and 500 W, with an electromagnetic brake. SMP also gives a remote-control link on 915 or 434 MHz for taking the robot off its route by hand.',
      [['Drive', '24 V DC · 500 W'], ['Brake', 'Electromagnetic']],
      (b) => { b.cyl(0.55, 0.55, 2.2, { m: 'metal', rot: [0, 0, PI / 2], at: [0, 2.6, -4.65], seg: 24 }); for (const sd of [-1, 1]) b.cyl(0.4, 0.4, 0.5, { m: 'dark', rot: [0, 0, PI / 2], at: [sd * 1.5, 2.6, -4.65], seg: 20, e: false }); }),
    P('battery', 'Batteries', 'power', 3, 0.14, [0, 0, 0], [0, -3.0, 0], 'Power', 'named', ['smp-s52'],
      'Two 12.8 V lithium iron phosphate batteries of 200 Ah for regular use (two 12.6 V 120 Ah lead-acid for trials). A fast charge takes 4 hours on the 48 V, 600 W charger.',
      [['Pack', '2 × 12.8 V · 200 Ah LiFePO4'], ['Charge', '4 h fast · 6 h normal']],
      (b) => { for (const z of [-0.5, 2.3]) b.at([0, 3.0, z], () => L.battery(b, { w: 3.0, h: 1.0, d: 2.4 })); }),
    P('controller', 'Computers', 'power', 2, 0.16, [0, 0, 0], [0, -1.6, 2.6], 'Brain', 'named', ['smp-s52'],
      'On-board computers for the drive and the AI: the Promt and Picard versions carry an NVIDIA Jetson TX2 for video analysis, and all versions record to a 64 GB SSD. 4G, Wi-Fi mesh and Bluetooth link the robot to others and to the control room.',
      [['Video analysis', 'Jetson TX2 (Promt, Picard)'], ['Storage', '64 GB SSD']],
      (b) => { b.at([0, 4.3, -2.4], () => L.pcb(b, { w: 2.6, d: 2.8 })); }),
    P('comm-unit', 'Communication unit (Abox 5)', 'power', 2, 0.18, [0, 0, 0], [0, -1.0, -2.8], 'Radio', 'named', ['smp-s52'],
      'SMP\'s Abox 5 communication unit, made by SMP, inside the robot: three 10/100 Ethernet ports with PoE, short-range Wi-Fi, 4G, 3G, LTE and GSM. There is also room inside for an extra router from a local mobile operator.',
      [['Ports', '3 × 10/100 Ethernet, PoE 24 V'], ['Radio', 'Wi-Fi · 4G · 3G · LTE · GSM']],
      (b) => { b.at([0, 4.3, 0.8], () => b.box(2.0, 0.8, 1.6, { m: 'dark', r: 0.1 })); b.at([0, 4.75, 0.8], () => b.cyl(0.08, 0.08, 0.4, { m: 'steel', seg: 8, e: false })); }),
    P('charge-plates', 'Charging plates', 'power', 3, 0.2, [0, 0, 0], [0, -3.0, 0], 'Charge', 'named', ['smp-s52'],
      'Current-conducting plates on the bottom of the robot. When it stops over SMP\'s ACS 5 charger station a set of contacts rises out of the station to the plates and charges the batteries without anyone; the contacts go back down when the charge is done.',
      [['Charger', 'ACS 5 · 48 V DC'], ['Charge', '4 h fast · 6 h normal']],
      (b) => { for (const x of [-0.8, 0.8]) b.box(0.9, 0.06, 1.8, { m: 'copper', r: 0.02, at: [x, 2.25, 0.6], e: false }); }),
    P('intercom', 'Intercom and alarm pod', 'ui', 1, 0.14, [0, 0, 0], [0, 2.0, 2.6], 'Intercom', 'inferred', ['smp-s52', 'deck'],
      'A small blue pod on the side of the mast. SMP lists a panic button and a two-way audio intercom, an IP intercom and audio file playback, and a multi-colour beacon with an alarm button; the picture shows only this pod, so it is read as their place.',
      [['Audio', 'IP intercom · file playback'], ['Button', 'Alarm']],
      (b) => { b.box(0.45, 1.3, 0.7, { m: BLUE2, r: 0.15, at: [0.75, 8.4, MASTZ - 0.2] }); b.cyl(0.1, 0.1, 0.06, { m: 'red', rot: [0, 0, PI / 2], at: [1.0, 8.7, MASTZ - 0.2], seg: 12, e: false }); }),
  ],
};
