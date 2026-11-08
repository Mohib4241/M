// RJ-Bot G31 kitchen exhaust (grease) duct cleaning robot. Y up, +Z front, 1 unit = 100 mm.
// What it does comes from RJ-Bot's G31 page: ducts 280 mm and wider, a rotating high-pressure nozzle, dual front
// and rear HD cameras with LED lights, magnetic wheels, IP65, a suction port for waste grease. RJ-Bot's spec image
// gives the crawler 445 mm long and 250 mm wide (no height); the height is read from the product picture. The outside
// follows that picture; where parts sit inside is a schematic reconstruction,
// not CAD.
import * as THREE from 'three';
import * as L from '../lib.js';
import * as F from '../field.js';

const PI = Math.PI;
const P = (id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build) => ({ id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build });
const BRASS = { k: 'copper', id: 'g31-brass', color: 0xc9a23a, metalness: 0.9, roughness: 0.28 };
const GREEN = { k: 'green', id: 'g31-green', color: 0x2fb35e, emissive: 0x000000 };

const TX = 0.92, TW = 0.66, TL = 4.45, TH = 1.05;  // track centre, width, length (445 mm), height; 250 mm over the tracks
const DECK = 1.2;                                  // top of the body
const BOX = { y0: 1.3, y1: 2.25, z0: -1.6, z1: 0.8, hw: 0.6 }; // the housing on the deck

export default {
  id: 'rj-g31',
  name: 'RJ Bots G-31',
  short: 'G-31',
  maker: 'Guangzhou RJ-Bot Industrial Group',
  blurb: 'Kitchen exhaust duct cleaning robot: a stainless tracked crawler with magnetic wheels, a rotating high-pressure nozzle, front and rear cameras and a suction port for waste grease.',
  accent: '#ffd166', accent2: '#3de0ff',
  studio: { accent: '#5b6770', accent2: '#2a9d62' },
  hover: 1.0,
  race: false, noDock: true,
  kpis: [['Ducts', '≥ 280 mm'], ['Pressure', '200 bar'], ['Rating', 'IP65']],
  stats: [
    ['Crawler size', '445 mm long × 250 mm wide (RJ-Bot\'s spec image)'],
    ['Weight', '14 kg crawler · 7.45 kg control box'],
    ['Ducts', '280 mm and wider (page) · 28–75 cm (spec image)'],
    ['Cleaning', '360°, no dead corner: nozzle turns 120° left–right and 60° up–down · spray angles 0°, 15°, 25°, 40°'],
    ['High-pressure unit', 'P40, 200 bar (2,900 PSI), adjustable, with suction'],
    ['Cameras', '3: dual front and rear 5 MP HD with LED lights (triple camera exchange)'],
    ['Climbing', 'Magnetic wheels for vertical metal ducts (with a safety tether) · 30° slope'],
    ['Obstacles', '22 mm (a picture) · 50 mm (spec image)'],
    ['Body', '304 stainless steel'],
    ['Rating', 'IP65 (page text) · IP68 (a feature picture)'],
    ['Supply', '220 V 50 Hz (control box)'],
    ['Reach', '15 m cable, custom · a 15 m duct in one pass'],
    ['Waste', 'Dirty-water suction port, oil suction drum and bucket'],
  ],
  notes: [
    'RJ-Bot\'s spec image gives the crawler 445 mm long and 250 mm wide, with no height; the height of the model is read from the picture.',
    'RJ-Bot\'s sources disagree: the page text says IP65 and a feature picture says IP68; one picture says the G31 crosses 22 mm obstacles and the spec image says 50 mm; the page says ducts of 280 mm and wider and the spec image says 28–75 cm. Both figures are shown.',
    'The outside follows the product picture in the deck: a stainless tracked body with steel cleats, a stainless housing on the deck with four cable glands, two lamps at the front corners, a handle bar, and a long stainless rod with an elbow, a brass coupler and a green nozzle. RJ-Bot offers spray nozzles of 0°, 15°, 25° and 40°.',
    'RJ-Bot sells the G31 as a set: the crawler, a control box with a screen (7.45 kg), the P40 high-pressure washer (2,900 PSI, with suction), an oil suction drum, a spray machine and a bucket. The set is separate from the crawler and is not modelled. A newer G36 is listed for 25 m reach.',
  ],
  sources: ['deck', 'rj-g31'],

  parts: [
    P('top-cover', 'Deck plate', 'shell', 0, 0, [0, 0, 0], [0, 2.4, 0], 'Deck', 'named', ['deck', 'rj-g31'],
      'The stainless plate over the body, screwed down at the corners. The housing, the handle and the nozzle rod stand on it.',
      [['Material', 'Stainless steel']],
      (b) => {
        b.box(1.7, 0.1, TL - 0.5, { m: 'steel', r: 0.03, at: [0, DECK, 0] });
        for (const [x, z] of [[-0.7, -1.8], [0.7, -1.8], [-0.7, 1.8], [0.7, 1.8]]) b.cyl(0.05, 0.05, 0.04, { m: 'dark', at: [x, DECK + 0.07, z], seg: 8, e: false });
      }),
    P('body', 'Body', 'shell', 0, 0.04, [0, 0, 0], [0, -0.8, 0], 'Body', 'named', ['deck', 'rj-g31'],
      'A stainless box between the tracks, sealed to IP65, that holds the drive motors, the electronics and the lamps\' wiring.',
      [['Rating', 'IP65']],
      (b) => {
        b.box(1.6, 0.9, TL - 0.4, { m: 'steel', r: 0.06, at: [0, 0.85, 0] });
        for (const sd of [-1, 1]) b.cyl(0.14, 0.14, 0.05, { m: 'lamp', rot: [0, 0, PI / 2], at: [sd * 0.82, 0.9, 1.5], seg: 14, e: false });
      }),
    P('housing', 'Camera housing', 'sense', 1, 0.06, [0, 0, 0], [0, 2.8, -1.6], 'Housing', 'named', ['deck', 'rj-g31'],
      'The stainless box on the deck. A lens and a lamp look out of its front, a hatch panel sits on its side, and four cable glands on top take the cables in. RJ-Bot lists dual HD cameras with LED lights, front and rear, and a triple camera exchange.',
      [['Cameras', 'Dual front and rear HD + LED']],
      (b) => {
        b.box(BOX.hw * 2, BOX.y1 - BOX.y0, BOX.z1 - BOX.z0, { m: 'steel', r: 0.12, at: [0, (BOX.y0 + BOX.y1) / 2, (BOX.z0 + BOX.z1) / 2] });
        b.box(0.04, 0.5, 1.0, { m: 'trim', at: [BOX.hw + 0.01, 1.8, -0.3], r: 0.02, e: false });
        for (const [x, z] of [[-0.35, -1.0], [0.35, -1.0], [-0.35, -0.4], [0.35, -0.4]]) b.cyl(0.07, 0.09, 0.2, { m: 'silver', at: [x, BOX.y1 + 0.1, z], seg: 10, e: false });
        b.cyl(0.14, 0.14, 0.08, { m: 'lens', rot: [PI / 2, 0, 0], at: [-0.35, 1.75, BOX.z1 + 0.04], seg: 16 });
        b.cyl(0.1, 0.1, 0.06, { m: 'lamp', rot: [PI / 2, 0, 0], at: [0.25, 1.75, BOX.z1 + 0.04], seg: 12, e: false });
      }),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'track-r' : 'track-l', sd < 0 ? 'Right track' : 'Left track', 'drive', 2, 0.06,
      [0, 0, 0], [sd * 3.0, -0.3, 0], 'Track', 'named', ['deck', 'rj-g31'],
      'A track of steel cleats on a stainless frame. Magnets in the track let the robot grip vertical metal ducts; a safety tether stays on for those runs, RJ-Bot says.',
      [['Climbing', 'Magnetic wheels, vertical metal ducts']],
      (b) => {
        b.at([sd * TX, TH / 2 + 0.02, 0], () => F.trackUnit(b, { len: TL, h: TH, w: TW, side: sd, r: 0.3, cleats: 26, beltM: 'steel', tread: 'silver', frameM: 'steel', hubM: 'silver', cleat: [1.08, 0.08, 0.26], inset: 0.03,
          wheelsAt: [[-TL / 2 + 0.45, 0, 0.36], [TL / 2 - 0.45, 0, 0.36], [0, 0, 0.3]] }));
      })),
    P('drive-motors', 'Drive motors', 'drive', 3, 0.1, [0, 0, 0], [0, -1.8, 0], 'Drive', 'inferred', ['rj-g31'],
      'A motor for each track, inside the sealed body. RJ-Bot does not list them.',
      [['Drive', 'One motor per track']],
      (b) => { for (const sd of [-1, 1]) b.cyl(0.24, 0.24, 0.8, { m: 'metal', rot: [0, 0, PI / 2], at: [sd * 0.7, 0.7, -1.4], seg: 20 }); }),
    P('controller', 'Control board', 'power', 2, 0.12, [0, 0, 0], [0, -1.2, 1.6], 'Brain', 'inferred', ['rj-g31'],
      'Starts the nozzle motor with one button, drives the tracks and sends the camera pictures up the cable.',
      [['Start', 'One-button start (keyless box)']],
      (b) => { b.at([0, 0.9, 0.8], () => L.pcb(b, { w: 1.4, d: 1.8 })); }),
    P('handle', 'Handle bar', 'shell', 0, 0.08, [0, 0, 0], [0, 1.8, 2.0], 'Handle', 'named', ['deck'],
      'A bent stainless bar on the side of the deck for lifting the robot into the duct opening.',
      [['Material', 'Stainless steel']],
      (b) => {
        F.rod(b, [0.7, DECK + 0.06, 1.7], [0.82, DECK + 0.55, 1.45], 0.06, { m: 'silver', seg: 10, e: false });
        F.rod(b, [0.82, DECK + 0.55, 1.45], [0.82, DECK + 0.55, -0.3], 0.06, { m: 'silver', seg: 10, e: false });
        F.rod(b, [0.82, DECK + 0.55, -0.3], [0.7, DECK + 0.06, -0.55], 0.06, { m: 'silver', seg: 10, e: false });
      }),
    P('nozzle', 'Nozzle rod and spray head', 'clean', 1, 0.1, [0, 0, 0], [0, 0.4, 3.4], 'Nozzle', 'named', ['deck', 'rj-g31'],
      'A long stainless rod from the housing, an elbow, a brass quick coupler and a green spray nozzle. RJ-Bot\'s robot turns the nozzle through 120° left and right and 60° up and down, so the 200 bar jet reaches every side of the duct and cuts the grease away.',
      [['Pressure', '200 bar (2,900 PSI)'], ['Sweep', '120° left–right · 60° up–down']],
      (b) => {
        F.rod(b, [-0.4, 1.75, BOX.z1 + 0.08], [-0.9, 1.55, 3.6], 0.07, { m: 'silver', seg: 12, e: false });
        b.sph(0.12, { m: BRASS, at: [-0.9, 1.55, 3.6], seg: 12, e: false });
        F.rod(b, [-0.9, 1.55, 3.6], [-1.4, 1.0, 3.8], 0.09, { m: BRASS, seg: 14, e: false });
        F.rod(b, [-1.4, 1.0, 3.8], [-1.7, 0.7, 3.9], 0.15, { m: BRASS, seg: 16, e: false });
        b.cyl(0.18, 0.1, 0.22, { m: GREEN, at: [-1.8, 0.58, 3.95], rot: [0.5, 0, 0.45], seg: 18 });
      }),
    P('suction', 'Waste suction port', 'air', 2, 0.14, [0, 0, 0], [0, 1.2, -3.0], 'Suction', 'named', ['rj-g31'],
      'A suction port on the robot draws the dirty water and waste grease away so it does not run back down the duct. It can be fitted and removed as the job needs; the waste goes to a separate oil bucket.',
      [['Waste', 'Dirty-water suction port, separate waste-oil bucket']],
      (b) => { b.cyl(0.26, 0.26, 0.8, { m: 'silver', rot: [PI / 2, 0, 0], at: [0, 1.7, -2.1], seg: 18 }); b.cyl(0.18, 0.18, 0.3, { m: 'rubber', rot: [PI / 2, 0, 0], at: [0, 1.7, -2.6], seg: 14, e: false }); }),
    P('hose', 'Pressure hose and cable', 'tether', 1, 0.1, [0, 0, 0], [0, 0, -3.2], 'Hose', 'inferred', ['rj-g31'],
      'The high-pressure hose from the P40 unit and the cable with the camera lines. They run out of the back of the robot.',
      [['Unit', 'P40, 2,900 PSI']],
      (b) => { F.tube(b, [[0.2, 1.7, -2.3], [0.6, 0.9, -3.4], [-0.4, 0.4, -4.6], [0.3, 0.3, -6.0]], 0.2, { m: { k: 'rubber', id: 'g31-hose', color: 0x23272b } }); }),
  ],
};
