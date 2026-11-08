// RJ-Bot K20 sewer pipe inspection crawler. Y up, +Z front, 1 unit = 100 mm.
// The numbers come from RJ-Bot's K20 page (the 2026 edition) and its manual's packing list. The picture in the
// product deck shows the crawler on four big pneumatic tyres with orange rims, a black body, a camera head on a
// lift linkage and a stainless bumper loop; the 2026 edition on RJ-Bot's page is a six-wheel drive, so the picture
// may be an earlier edition. The size is RJ-Bot's figure with the 10-inch wheels. Where parts sit inside is a
// schematic reconstruction, not CAD.
import * as THREE from 'three';
import * as L from '../lib.js';
import * as F from '../field.js';

const PI = Math.PI;
const P = (id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build) => ({ id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build });
const BLACK = { k: 'shell', id: 'k20-black', color: 0x131517, metalness: 0.3, roughness: 0.45, clearcoat: 0.2 };
const BLACK2 = { k: 'shellDk', id: 'k20-black2', color: 0x0c0d0f, metalness: 0.3, roughness: 0.5 };
const ORANGE = { k: 'hubGrey', id: 'k20-orange', color: 0xe4511d, metalness: 0.1, roughness: 0.5 };
const TYRE = { k: 'rubber', id: 'k20-tyre', color: 0x0d0e10, roughness: 0.95 };

const WR = 1.27, WW = 0.9, WX = 1.27, WZ = 1.5;   // 10-inch wheels: radius, width, half track, half wheelbase
const DECK = 1.5;

export default {
  id: 'rj-k20',
  name: 'RJ Bots K20',
  short: 'K20',
  maker: 'Guangzhou RJ-Bot Industrial Group',
  blurb: 'Sewer pipe inspection crawler for DN200–DN2000 pipes: big pneumatic wheels, a camera head that lifts, 5 MP front and rear cameras and 100 m of cable on a reel.',
  accent: '#ffd166', accent2: '#ff9f68',
  studio: { accent: '#e4511d', accent2: '#5b6770' },
  hover: 0.4,
  race: false, noDock: true,
  mats: { studio: { shell: { color: 0x131517, metalness: 0.3, roughness: 0.45, clearcoat: 0.2 }, shellDk: { color: 0x0c0d0f, metalness: 0.3, roughness: 0.5 }, trim: { color: 0x2a2e33 } } },
  kpis: [['Pipes', 'DN200–2000'], ['Cable', '100 m'], ['Crawler', '19.4 kg']],
  stats: [
    ['Pipes', 'DN200–DN2000'],
    ['Crawler size', '760 × 345 × 255 mm (10-inch wheels)'],
    ['Crawler weight', '19.4 kg (10-inch) · 13.7 kg (4-inch)'],
    ['Drive', 'Dual-motor six-wheel drive (2026 edition)'],
    ['Obstacles', 'Up to 100 mm · slopes up to 30°'],
    ['Cameras', '5 MP front, 360° × 180°, and a rear camera'],
    ['Lift', '80° angle, 178 mm height'],
    ['Lights', '12 × 3 W'],
    ['Wheels', 'Three sets: 4-inch × 6, 6-inch × 4, 10-inch × 4'],
    ['Cable reel', '100 m · 640 × 428 × 532 mm · 53.6 kg · 60 V 15 Ah, 6 h'],
    ['Rating', 'IP68 crawler · -20 to +50 °C'],
    ['Tablet', '10.4-inch, 2000 × 1200, Android, touchscreen'],
  ],
  notes: [
    'RJ-Bot\'s 2026 edition of the K20 is a six-wheel drive with three wheel sets. The picture in the product deck, which is also RJ-Bot\'s main picture of the K20, shows four wheels with orange rims; the model follows the picture, so it has four. Other RJ-Bot pictures show a blue-framed K20 with a ring of lamps round its camera.',
    'The size and weight are RJ-Bot\'s for the crawler with the 10-inch wheels, which is the set pre-installed on the picture\'s unit. Fitted with 6-inch wheels it is 760 × 242 × 175 mm and 17.95 kg.',
    'RJ-Bot\'s chassis drawing labels the front camera, the adjustable lift arm (178 mm rise), the six-wheel drive system and the aviation plug that joins the crawler to its tether.',
    'The cable reel (100 m, 53.6 kg, 640 × 428 × 532 mm, with antennas and wheels in RJ-Bot\'s pictures) and the 10.4-inch tablet are part of the K20 system but not in the deck\'s picture, so they are not modelled. RJ-Bot says the reel is splash-resistant only: wipe it, do not wash it down.',
    'The stainless loop in the picture is read as the stainless bumper bar and handle that RJ-Bot\'s sheet lists.',
  ],
  sources: ['deck', 'rj-k20'],

  parts: [
    P('chassis', 'Chassis', 'drive', 0, 0, [0, 0, 0], [0, 2.6, 0], 'Frame', 'named', ['deck', 'rj-k20'],
      'The black frame between the wheels: a flat deck with rails, carrying the camera linkage and the electronics. The crawler is 345 mm wide over its 10-inch wheels.',
      [['Size', '760 × 345 × 255 mm'], ['Weight', '19.4 kg']],
      (b) => {
        b.box(1.5, 0.5, 5.0, { m: BLACK, r: 0.1, at: [0, DECK - 0.35, 0.0] });
        b.box(1.7, 0.18, 3.8, { m: BLACK2, r: 0.05, at: [0, DECK + 0.0, -0.3] });
        for (const sd of [-1, 1]) b.box(0.15, 0.5, 4.4, { m: BLACK2, r: 0.04, at: [sd * 0.85, DECK - 0.45, 0.0], e: false });
        b.box(1.0, 0.06, 2.6, { m: 'trim', r: 0.02, at: [0, DECK + 0.12, -0.5], e: false });
      }),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'wheels-r' : 'wheels-l', sd < 0 ? 'Right wheels' : 'Left wheels', 'drive', 2, 0.04,
      [0, 0, 0], [sd * 3.6, -0.2, 0], 'Wheels', 'named', ['deck', 'rj-k20'],
      'Two big pneumatic tyres with a block tread on orange steel rims. RJ-Bot supplies three sets of anti-slip wheels, 4-inch, 6-inch and 10-inch; the 10-inch set clears obstacles up to 100 mm.',
      [['Wheel sets', '4-inch, 6-inch, 10-inch'], ['Obstacles', 'Up to 100 mm']],
      (b) => {
        for (const z of [-WZ, WZ]) b.at([sd * WX, WR, z], () => {
          L.tyreWheel(b, { r: WR, w: WW, side: sd, hubM: ORANGE, motor: false });
          b.cyl(WR * 0.28, WR * 0.28, 0.12, { m: 'steel', rot: [0, 0, PI / 2], at: [sd * (WW / 2 + 0.01), 0, 0], seg: 18, e: false });
          b.radial(new THREE.BoxGeometry(WW * 0.9, 0.12, 0.3), 22, WR + 0.04, { axis: 'x', m: TYRE, e: false });
        });
      })),
    P('drive-motors', 'Drive motors', 'drive', 3, 0.1, [0, 0, 0], [0, -2.0, 0], 'Drive', 'named', ['rj-k20'],
      'Two motors drive the wheels through the frame (the 2026 edition: dual-motor drive on six wheels). They carry the crawler over obstacles up to 100 mm and up slopes of 30°.',
      [['Drive', 'Dual-motor'], ['Slopes', 'Up to 30°']],
      (b) => { for (const sd of [-1, 1]) b.cyl(0.32, 0.32, 0.9, { m: 'metal', rot: [0, 0, PI / 2], at: [sd * 0.45, DECK - 0.35, -0.4], seg: 20 }); }),
    P('controller', 'Control board', 'power', 2, 0.12, [0, 0, 0], [0, -1.5, -2.4], 'Brain', 'inferred', ['rj-k20'],
      'Takes the commands from the tablet over the cable and drives the wheels, the lift, the camera and the lights. The tablet connects to the reel\'s own Wi-Fi.',
      [['Control', 'Tablet over the reel\'s Wi-Fi']],
      (b) => { b.at([0, DECK - 0.05, -0.8], () => L.pcb(b, { w: 1.1, d: 2.2 })); }),

    P('lift', 'Camera lift linkage', 'arm', 1, 0.02, [0, 0, 0], [0, 2.4, -1.2], 'Lift', 'named', ['deck', 'rj-k20'],
      'A two-bar linkage with a spring that raises the camera head by up to 178 mm through an 80° swing, so the lens stays in the middle of the pipe as the crawler runs along its bottom.',
      [['Lift', '80° angle · 178 mm height']],
      (b) => {
        F.bar(b, [0.55, DECK + 0.1, -0.6], [0.35, DECK + 1.5, 0.5], { w: 0.12, h: 0.3, m: 'silver', r: 0.03 });
        F.bar(b, [0.55, DECK + 0.1, -1.3], [0.15, DECK + 1.6, -0.3], { w: 0.12, h: 0.3, m: 'silver', r: 0.03 });
        b.cyl(0.22, 0.22, 0.3, { m: 'dark', rot: [0, 0, PI / 2], at: [0.45, DECK + 0.15, -1.0], seg: 16 });
        b.cyl(0.12, 0.12, 0.35, { m: 'steel', at: [0.2, DECK + 0.65, -0.4], seg: 12, e: false });
      }),
    P('camera-head', 'Camera head', 'sense', 1, 0.06, [0, 0, 0], [0, 1.6, 3.0], 'Camera', 'named', ['deck', 'rj-k20'],
      'A black quick-release head with a 5 MP camera at the front that turns 360° round and 180° up and down, and twelve 3 W lights. It sits on a round swivel joint at the end of the linkage.',
      [['Camera', '5 MP · 360° × 180°'], ['Lights', '12 × 3 W']],
      (b) => {
        b.at([0.0, DECK + 1.6, 1.0], () => {
          b.cyl(0.4, 0.4, 0.5, { m: 'steel', rot: [0, 0, PI / 2], at: [0.35, 0, -0.65], seg: 20 });
          b.box(1.5, 1.2, 2.2, { m: BLACK, r: 0.12, at: [-0.3, 0, 0.5] });
          b.box(1.2, 0.2, 1.6, { m: BLACK2, r: 0.03, at: [-0.3, 0.55, 0.3], e: false });
          b.cyl(0.38, 0.38, 0.1, { m: 'lens', rot: [PI / 2, 0, 0], at: [-0.3, 0.0, 1.64], seg: 24 });
          for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; b.cyl(0.06, 0.06, 0.05, { m: 'lamp', rot: [PI / 2, 0, 0], at: [-0.3 + Math.cos(a) * 0.52, Math.sin(a) * 0.52, 1.62], seg: 8, e: false }); }
        });
      }),
    P('rear-camera', 'Rear camera', 'sense', 1, 0.08, [0, 0, 0], [0, 1.2, -3.0], 'Camera', 'named', ['rj-k20'],
      'A fixed 5 MP camera at the back for reversing out of the pipe and for watching the cable.',
      [['Camera', '5 MP, rear']],
      (b) => { b.at([0, DECK - 0.15, -2.55], () => b.at([0, 0, 0], () => L.camera(b, { w: 0.7, h: 0.4, d: 0.3, lens: 0.13, ring: false }), [0, PI, 0])); }),
    P('bumper', 'Bumper bar and handle', 'shell', 0, 0.08, [0, 0, 0], [0, 0.8, 3.4], 'Bumper', 'named', ['deck', 'rj-k20'],
      'A long loop of stainless steel in front of the crawler that guards it against knocks and serves as a handle for lifting it into a manhole.',
      [['Material', 'Stainless steel']],
      (b) => {
        const y = 0.55, hw = 1.0;
        F.rod(b, [-hw, DECK - 0.5, 2.3], [-hw, y, 5.2], 0.07, { m: 'silver', seg: 10, e: false });
        F.rod(b, [hw, DECK - 0.5, 2.3], [hw, y, 5.2], 0.07, { m: 'silver', seg: 10, e: false });
        b.tor(hw, 0.07, { m: 'silver', arc: PI, rot: [PI / 2, 0, PI / 2], at: [0, y, 5.2], seg: 24, e: false });
      }),
    P('cable', 'Cable', 'tether', 1, 0.1, [0, 0, 0], [0, 0, -3.0], 'Cable', 'named', ['rj-k20'],
      'The 100 m cable from the reel to the crawler, with a tensile strength of 200 kg. The reel counts out the metres with an electronic encoder.',
      [['Length', '100 m'], ['Tensile strength', '200 kg']],
      (b) => { F.tube(b, [[0, DECK - 0.4, -2.5], [-0.6, 0.5, -3.6], [-1.8, 0.2, -5.0], [-1.0, 0.2, -6.6]], 0.14, { m: { k: 'rubber', id: 'k20-cable', color: 0x1b1e21 } }); }),
    P('aviation-plug', 'Aviation plug', 'tether', 1, 0.12, [0, 0, 0], [0, 0.6, -3.4], 'Plug', 'named', ['rj-k20'],
      'The sealed round connector at the back of the crawler where the tether plugs in. RJ-Bot\'s chassis drawing calls it the aviation plug. It joins the power, the drive signals and the camera pictures to the cable.',
      [['Rating', 'IP68 crawler']],
      (b) => { b.cyl(0.26, 0.26, 0.5, { m: 'steel', rot: [PI / 2, 0, 0], at: [0.3, DECK - 0.3, -2.7], seg: 18 }); b.cyl(0.18, 0.18, 0.3, { m: 'dark', rot: [PI / 2, 0, 0], at: [0.3, DECK - 0.3, -3.05], seg: 16, e: false }); }),
  ],
};
