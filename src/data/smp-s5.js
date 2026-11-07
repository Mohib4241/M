// SMP Robotics S5 PTZ security robot. Y up, +Z front, 1 unit = 100 mm.
// The size and the technical figures come from SMP's S5 PTZ data sheet (2017): 1,372 mm long, 813 mm wide over the
// tyres, a 914 mm wheelbase, 432 mm wheels and 1,549 mm tall with the mast. The outside follows the drawing in that
// data sheet and the product picture in the product deck: a dark pod on four off-road wheels, a tall raked front
// panel with the panoramic cameras and a mast with the pan-tilt-zoom head. Where parts sit inside is a schematic
// reconstruction, not CAD.
import * as THREE from 'three';
import * as L from '../lib.js';
import * as F from '../field.js';

const PI = Math.PI;
const P = (id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build) => ({ id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build });
const BODY = { k: 'shell', id: 's5-body', color: 0x3a3d42, metalness: 0.25, roughness: 0.5, clearcoat: 0.3 };
const BODY2 = { k: 'shellDk', id: 's5-body2', color: 0x24272b, metalness: 0.3, roughness: 0.5 };
const MAST = { k: 'metal', id: 's5-mast', color: 0x75797e, metalness: 0.5, roughness: 0.45 };
const HEADM = { k: 'shell', id: 's5-head', color: 0x303338, metalness: 0.25, roughness: 0.4, clearcoat: 0.4 };

const WR = 2.16, WZ = 4.57, WX = 3.68, WW = 0.9;     // wheel radius, half wheelbase, half track, tyre width
const MASTZ = -3.2, MASTY0 = 5.3, MASTY1 = 12.2;     // the mast stands behind the front panel, over the rear axle

export default {
  id: 'smp-s5',
  name: 'SMP Robotics S5 PTZ',
  short: 'S5 PTZ',
  maker: 'SMP Robotics',
  blurb: 'Outdoor security patrol robot: a 1.4 m long all-weather rover with panoramic cameras in its front panel and a pan-tilt-zoom camera on a mast, 1.5 m tall.',
  accent: '#3de0ff', accent2: '#ffd166',
  studio: { accent: '#0a8f9c', accent2: '#c98a1a' },
  hover: 0.4,
  race: false, noDock: true,
  mats: { studio: { shell: { color: 0x3a3d42, metalness: 0.25, roughness: 0.5, clearcoat: 0.3 }, shellDk: { color: 0x24272b, metalness: 0.3, roughness: 0.5 }, trim: { color: 0x2a2e33 } } },
  kpis: [['Range', '24 km'], ['Patrol', '12 h'], ['Weight', '110 kg']],
  stats: [
    ['Size', '1,372 × 813 mm · 1,549 mm tall (with the mast)'],
    ['Wheels', '432 mm · 914 mm wheelbase · 660 mm between the tyres'],
    ['Weight', '110 kg with the batteries'],
    ['Range', 'Up to 24 km at +5 °C'],
    ['Patrol', 'More than 12 h without recharging'],
    ['Speed', '2 km/h when driving itself'],
    ['Obstacles', 'Up to 7 in (about 18 cm) · 18° slopes · 0.14 m wall climb'],
    ['PTZ camera', '1/4" CCD, ×28 zoom, human detection to 50 m'],
    ['Panoramic cameras', '72° each, 30 fps'],
    ['Battery', '2 × 12 V lead-acid 100 Ah, or LiFePO4 120 Ah · charge in about 4 h'],
    ['Weather', 'Rain, snow, gusty wind · -20 to +45 °C'],
    ['Link', 'Wi-Fi 802.11 a/b/g/n, 2.4 GHz, 0.5 mile range'],
  ],
  notes: [
    'The data sheet covers three versions: S5 PTZ, S5 HD and S5 HD PTZ. The figures are the S5 PTZ\'s; the HD versions swap the cameras.',
    'The model follows SMP\'s drawing for size and the deck\'s picture for the look: the tall raked panel at the front carries the panoramic cameras; the mast stands behind it.',
    'The patrol route is memorised on a first run under an operator; the robot keeps to it even when GPS is poor. In winter the route must be cleared of snow.',
    'SMP\'s data sheet gives the power use of the motion system as 300 W and of the cameras as 16–28 W.',
  ],
  sources: ['deck', 'smp-s5', 'smp-site'],

  parts: [
    P('top-cover', 'Body shell', 'shell', 0, 0, [0, 0, 0], [0, 3.4, 0], 'Shell', 'named', ['deck', 'smp-s5'],
      'The dark moulded shell of the rover. It rounds over the wheels and slopes down at the rear, and it is sealed so the robot works in rain and snow. The front panel rises from its nose.',
      [['Length', '1,372 mm']],
      (b) => {
        b.profile([[6.1, 3.9, 0.5], [6.2, 5.0, 0.6], [2.6, 5.5, 0.8], [-3.5, 5.4, 0.9], [-5.9, 4.8, 0.7], [-6.0, 3.4, 0.5], [-4.0, 2.7, 0.4], [4.4, 2.7, 0.4]], 5.6, { axis: 'x', m: BODY, bevel: 0.25 });
        b.box(2.2, 0.06, 4.8, { m: BODY2, r: 0.1, at: [0, 5.55, -1.2], e: false });
      }),
    P('fairing', 'Front panel', 'shell', 0, 0.04, [0, 0, 0], [0, 1.6, 3.6], 'Front', 'named', ['deck', 'smp-s5'],
      'The tall, raked panel at the front, 930 mm high at its top edge. A grid of windows in it holds the panoramic cameras and the lamps, and the robot\'s sensors look out through it.',
      [['Height', '930 mm (top edge)']],
      (b) => {
        b.profile([[6.2, 4.6, 0.2], [5.9, 6.0, 0.2], [3.8, 9.3, 0.4], [2.6, 9.3, 0.4], [2.4, 5.2, 0.2]], 4.6, { axis: 'x', m: BODY2, bevel: 0.12 });
        const n = [0, 0.538, 0.846];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
          const t = 0.22 + r * 0.22, z = 5.9 - 2.1 * t, y = 6.0 + 3.3 * t;
          b.at([(c - 1.5) * 0.85, y + 0.07, z + 0.1], () => b.box(0.55, 0.38, 0.1, { m: r === 1 && c % 3 ? 'lens' : 'glass', r: 0.05 }), [-0.567, 0, 0]);
        }
      }),
    P('chassis', 'Chassis', 'drive', 3, 0.08, [0, 0, 0], [0, -1.2, 0], 'Frame', 'inferred', ['smp-s5'],
      'The steel frame under the shell that carries the axles, the batteries and the mast. The robot drives over obstacles up to 7 in (about 18 cm) high.',
      [['Obstacles', 'Up to 7 in']],
      (b) => { b.box(3.6, 0.7, 10.6, { m: 'trim', r: 0.1, at: [0, 2.7, 0.2] }); b.box(5.2, 0.2, 6.4, { m: 'dark', r: 0.05, at: [0, 2.25, 0.4], e: false }); }),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'wheels-r' : 'wheels-l', sd < 0 ? 'Right wheels' : 'Left wheels', 'drive', 2, 0.06,
      [0, 0, 0], [sd * 3.6, 0, 0], 'Wheels', 'named', ['deck', 'smp-s5'],
      'Two off-road wheels of 432 mm with deep-block tyres on spoked rims. They drive the robot over any hard surface and through shallow puddles and soft ground.',
      [['Wheel', '432 mm'], ['Wheelbase', '914 mm']],
      (b) => { for (const f of [-1, 1]) b.at([sd * WX, WR, f * WZ], () => F.offroadWheel(b, { r: WR, w: WW, side: sd, rimM: 'silver', blocks: 34 })); })),
    P('suspension', 'Suspension', 'drive', 3, 0.1, [0, 0, 0], [0, -2.0, 0], 'Springs', 'named', ['deck'],
      'A wishbone arm and a red coil spring on each wheel keep all four tyres on the ground over rough ground. The picture shows the springs.',
      [['Springs', 'Coil-over, one a wheel']],
      (b) => {
        for (const sd of [-1, 1]) for (const f of [-1, 1]) {
          F.bar(b, [sd * 1.6, 2.5, f * WZ], [sd * (WX - 0.35), 2.2, f * WZ], { w: 0.2, h: 0.16, m: 'metal', r: 0.03 });
          b.at([sd * 2.5, 3.1, f * (WZ - 0.5)], () => F.coil(b, 0.2, 1.1, { m: 'red' }), [0, 0, sd * -0.25]);
        }
      }),
    P('mast', 'Mast', 'arm', 1, 0.06, [0, 0, 0], [0, 4.0, -1.0], 'Mast', 'named', ['deck', 'smp-s5'],
      'A slim grey mast that carries the camera head to 1,549 mm, a good height for seeing over a fence line and for reading a person\'s face.',
      [['Height', '1,549 mm (with the head)']],
      (b) => {
        b.cyl(0.52, 0.52, MASTY1 - MASTY0, { m: MAST, at: [0, (MASTY0 + MASTY1) / 2, MASTZ], seg: 28 });
        b.cyl(0.8, 0.8, 0.3, { m: 'dark', at: [0, MASTY0 + 0.1, MASTZ], seg: 28, e: false });
      }),
    P('head', 'PTZ and camera head', 'sense', 1, 0.08, [0, 0, 0], [0, 4.4, -1.4], 'Camera', 'named', ['deck', 'smp-s5'],
      'The head on top of the mast. The pan-tilt-zoom camera has a ×28 zoom and finds people up to 50 m away; it turns onto anything that moves. A ring of lenses round the head gives the 360° panoramic picture. The head also holds the two-way audio and the panic button.',
      [['PTZ', '×28 optical zoom'], ['Human detection', '50 m']],
      (b) => {
        b.at([0, MASTY1, MASTZ], () => {
          b.lathe([[0.001, 0], [0.9, 0.1], [0.95, 0.7], [0.9, 2.2], [0.7, 2.9], [0.001, 3.0]], { m: HEADM, seg: 36 });
          b.cyl(0.36, 0.36, 0.5, { m: 'dark', rot: [PI / 2, 0, 0], at: [0, 1.5, 0.9], seg: 20 });
          b.cyl(0.26, 0.26, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [0, 1.5, 1.18], seg: 20 });
          for (let i = 0; i < 5; i++) { const a = (i / 5) * PI * 2 + 0.3; b.cyl(0.12, 0.12, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [Math.sin(a) * 0.93, 0.6, Math.cos(a) * 0.93], seg: 12, e: false }); }
          b.sph(0.35, { m: 'glass', at: [0, 3.1, 0], seg: 16, cap: PI / 2, e: false });
        });
      }),
    P('headlights', 'Headlights', 'sense', 1, 0.1, [0, 0, 0], [0, 1.0, 3.4], 'Lights', 'named', ['smp-s5'],
      'Patrol headlights at the nose that switch between low and high beam. Infrared LEDs can be added for quiet night work.',
      [['Beams', 'Low and high'], ['Option', 'IR LED lights']],
      (b) => { for (const x of [-1.9, 1.9]) b.cyl(0.32, 0.32, 0.18, { m: 'lamp', rot: [PI / 2, 0, 0], at: [x, 4.2, 6.15], seg: 22 }); }),
    P('battery', 'Batteries', 'power', 3, 0.12, [0, 0, 0], [0, -2.8, -1.6], 'Power', 'named', ['smp-s5'],
      'Two 12 V batteries, lead-acid 100 Ah or lithium iron phosphate 120 Ah, each about 70 lb. A charge takes about 4 hours on the 600 W charger.',
      [['Pack', '2 × 12 V · 100 Ah / 120 Ah'], ['Charge', '≈ 4 h']],
      (b) => { for (const x of [-1.4, 1.4]) b.at([x, 3.1, -1.4], () => L.battery(b, { w: 1.9, h: 1.0, d: 3.5 })); }),
    P('drive-motors', 'Drive motors', 'drive', 3, 0.14, [0, 0, 0], [0, -1.8, 0], 'Drive', 'inferred', ['smp-s5'],
      'The motors that drive the wheels. SMP gives the power use of the motion system as 300 W; how the drive is laid out is not in the data sheet.',
      [['Motion system', '300 W']],
      (b) => { for (const sd of [-1, 1]) b.cyl(0.4, 0.4, 1.2, { m: 'metal', rot: [0, 0, PI / 2], at: [sd * 1.0, 3.0, -4.57], seg: 22 }); }),
    P('controller', 'Control and recording', 'power', 2, 0.16, [0, 0, 0], [0, -1.6, 2.6], 'Brain', 'named', ['smp-s5'],
      'The computer that drives the robot along its memorised route, spots people in the camera pictures, records the video (48 hours kept on board) and talks over Wi-Fi to the control room.',
      [['Recording', '48 h on board'], ['Link', 'Wi-Fi, 0.5 mile']],
      (b) => { b.at([0, 3.7, 3.0], () => L.pcb(b, { w: 2.4, d: 2.8 })); }),
  ],
};
