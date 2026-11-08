// RJ-Bot Q50 air duct cleaning robot. Y up, +Z front, 1 unit = 100 mm.
// The numbers come from RJ-Bot's Q50 page and its HVAC solutions page. The outside follows the product picture in
// the product deck: stainless wedge-shaped tracks, a stainless body, two lift actuators, a long two-bar boom and a big
// round black brush. Where parts sit inside is a schematic reconstruction, not CAD.
import * as THREE from 'three';
import * as L from '../lib.js';
import * as F from '../field.js';

const PI = Math.PI;
const P = (id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build) => ({ id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build });
const GREY = { k: 'metal', id: 'q50-grey', color: 0x9a9fa5, metalness: 0.7, roughness: 0.35 };
const BRUSH = { k: 'bristle', id: 'q50-bristle', color: 0x0b0c0d };
const WHITE = { k: 'fabric', id: 'q50-white', color: 0xf0f0ee, roughness: 0.6 };

// wedge-shaped track (z, y): tall at the back, low at the front
const WEDGE = [[-2.6, 0], [2.6, 0], [2.6, 0.85], [-2.6, 1.75]];
const TX = 1.65, TW = 1.0;                       // track centre and width
const PIVOT = new THREE.Vector3(0, 2.6, 0.2);    // where the boom leaves the body
const HUB = new THREE.Vector3(0, 4.9, 6.2);      // where it ends, at the brush
const BOOM_DIR = HUB.clone().sub(PIVOT).normalize();

export default {
  id: 'rj-q50',
  name: 'RJ Bots Q50',
  short: 'Q50',
  maker: 'Guangzhou RJ-Bot Industrial Group',
  blurb: 'Air duct cleaning robot for large ducts, 400–1,200 mm: a stainless tracked crawler with a lifting boom, a big rotating nylon brush, a dust-blowing fan and three cameras.',
  accent: '#ffd166', accent2: '#3de0ff',
  studio: { accent: '#5b6770', accent2: '#9a6b00' },
  hover: 1.0,
  race: false, noDock: true,
  kpis: [['Ducts', '400–1,200 mm'], ['Reach', '60 m'], ['Robot', '33 kg']],
  stats: [
    ['Robot size', '1,000 × 450 × 300 mm'],
    ['Robot weight', '33 kg'],
    ['Ducts', '400–1,200 mm (page) · 500–1,200 mm (a picture)'],
    ['Cleaning height', 'Up to 1,200 mm (page) · 1,185 mm (spec picture) · lift 885 mm, 400 mm extension'],
    ['Cleaning scope', '1,185 mm wide'],
    ['Work distance', '60 m (standard)'],
    ['Cameras', '3: one 6 MP for recording, two 5 MP'],
    ['Travel / cleaning power', '100 W / 70 W'],
    ['Blower', '240 W (12 V × 20 A), 102° angle'],
    ['Body', '304 stainless steel'],
    ['Supply', '220 V, 50 Hz · tablet control'],
    ['Signal box', '400 × 320 × 180 mm'],
  ],
  notes: [
    'The 1,000 × 450 × 300 mm size is RJ-Bot\'s figure for the robot folded flat. The picture, and so the model, shows the boom raised and the brush held out; another RJ-Bot picture shows the arm standing almost upright with the brush on top.',
    'RJ-Bot\'s sources disagree a little: the page says ducts of 400–1,200 mm and a cleaning height of 1,200 mm, a picture says 500–1,200 mm and 1,185 mm. Both are shown.',
    'RJ-Bot labels the white nozzle on the arm a "high power fan" in its pictures: an added high-pressure airflow jetting device for enhanced cleaning. Its blower is listed at 240 W (12 V × 20 A) and 102°. It also lists imported non-slip rubber tracks, a 304 stainless steel body and a tablet control in Chinese and English.',
    'The signal box (400 × 320 × 180 mm, with a crank for the cable) and the dust collector are separate units and are not in the picture, so they are not modelled.',
  ],
  sources: ['deck', 'rj-q50', 'rj-hvac'],

  parts: [
    P('top-cover', 'Top cover', 'shell', 0, 0, [0, 0, 0], [0, 3.2, -0.6], 'Deck', 'named', ['deck', 'rj-q50'],
      'The stainless top plate of the body, with a row of drilled holes. The two lift actuators and the boom stand on it.',
      [['Body', '304 stainless steel']],
      (b) => {
        b.box(2.2, 0.12, 3.8, { m: 'steel', r: 0.05, at: [0, 1.95, 0.0] });
        for (let i = 0; i < 6; i++) b.cyl(0.04, 0.04, 0.02, { m: 'dark', at: [-0.7, 2.02, -1.5 + i * 0.5], seg: 8, e: false });
      }),
    P('body', 'Body', 'shell', 0, 0.04, [0, 0, 0], [0, -0.8, 0], 'Body', 'named', ['deck', 'rj-q50'],
      'The stainless box between the tracks that holds the electronics and the drive motors and carries the lifting mechanism.',
      [['Body', '304 stainless steel']],
      (b) => { b.box(2.3, 1.4, 3.8, { m: 'steel', r: 0.08, at: [0, 1.25, 0.0] }); }),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'track-r' : 'track-l', sd < 0 ? 'Right track' : 'Left track', 'drive', 2, 0.06,
      [0, 0, 0], [sd * 3.0, -0.3, 0], 'Track', 'named', ['deck', 'rj-q50'],
      'A wedge-shaped track of imported non-slip rubber with chevron treads on a stainless frame, with a large sprocket at the back. RJ-Bot says it navigates pipe obstacles without effort.',
      [['Track', 'Rubber on stainless frames']],
      (b) => {
        b.at([sd * TX, 0.05, 0], () => F.trackUnit(b, { poly: WEDGE, r: 0.3, w: TW, side: sd, cleats: 34, beltM: 'rubber', frameM: 'steel', hubM: 'silver',
          wheelsAt: [[-1.95, 0.85, 0.72], [2.15, 0.42, 0.4], [0.2, 0.3, 0.3]], cleat: [1.0, 0.05, 0.12] }));
      })),
    P('drive-motors', 'Drive motors', 'drive', 3, 0.1, [0, 0, 0], [0, -1.8, 0], 'Drive', 'named', ['rj-q50'],
      'The motors behind the sprockets. RJ-Bot lists 100 W for travel and 70 W for cleaning.',
      [['Power', '100 W travel · 70 W cleaning']],
      (b) => { for (const sd of [-1, 1]) b.cyl(0.28, 0.28, 0.9, { m: 'metal', rot: [0, 0, PI / 2], at: [sd * 0.85, 1.0, -1.5], seg: 20 }); }),
    P('controller', 'Control board', 'power', 2, 0.12, [0, 0, 0], [0, -1.2, -2.4], 'Brain', 'inferred', ['rj-q50'],
      'The board in the body: it reads the tablet\'s commands over the wired link and drives the tracks, the lift, the boom and the fan. The robot runs from a 220 V, 50 Hz supply.',
      [['Control', 'Tablet, wired link'], ['Supply', '220 V, 50 Hz']],
      (b) => { b.at([0, 1.2, 0.2], () => L.pcb(b, { w: 1.7, d: 2.4 })); }),

    P('lift', 'Lift actuators', 'arm', 1, 0.02, [0, 0, 0], [0, 2.2, -2.8], 'Lift', 'named', ['deck', 'rj-q50'],
      'Two linear actuators that tilt the boom up from the body. RJ-Bot gives a lifting height of 885 mm, so the brush can be raised from the floor of a duct up to its top.',
      [['Lifting height', '885 mm']],
      (b) => {
        for (const x of [-0.55, 0.55]) {
          F.rod(b, [x, 2.05, -1.5], [x, 3.0, 0.1], 0.16, { m: GREY, seg: 18 });
          F.rod(b, [x, 2.7, -0.5], [x, 3.4, 0.9], 0.085, { m: 'steel', seg: 12, e: false });
        }
        b.box(1.6, 0.3, 0.5, { m: 'steel', r: 0.05, at: [0, 2.15, -1.5] });
      }),
    P('boom', 'Boom', 'arm', 1, 0.06, [0, 0, 0], [0, 3.0, 1.8], 'Boom', 'named', ['deck', 'rj-q50'],
      'Two drilled stainless bars with a coiled cable running between them. It reaches the brush out 400 mm further than the lift alone, to a cleaning height of 1,200 mm.',
      [['Extension', '400 mm'], ['Cleaning height', '1,200 mm']],
      (b) => {
        for (const x of [-0.75, 0.75]) {
          F.bar(b, [x, PIVOT.y, PIVOT.z], [x, HUB.y, HUB.z - 0.3], { w: 0.1, h: 0.42, m: 'steel', r: 0.03 });
        }
        F.bar(b, [-0.75, PIVOT.y + 0.1, PIVOT.z + 0.2], [0.75, PIVOT.y + 0.1, PIVOT.z + 0.2], { w: 0.15, h: 0.4, m: 'steel', r: 0.03 });
        F.tube(b, [[0, PIVOT.y + 0.3, PIVOT.z + 0.8], [0, 3.5, 2.6], [0, 4.1, 4.2], [0, HUB.y - 0.2, HUB.z - 0.6]], 0.07, { m: 'dark' });
      }),
    P('brush', 'Round brush', 'clean', 2, 0.1, [0, 0, 0], [0, 3.2, 3.2], 'Brush', 'named', ['deck', 'rj-q50'],
      'A 360° rotating brush of soft black nylon with a white hub, 1,185 mm wide in its sweep. Nylon does not scratch the duct. RJ-Bot reckons it improves cleaning efficiency by 80% over a hand-held shaft.',
      [['Bristle', 'Nylon'], ['Scope', '1,185 mm wide']],
      (b) => {
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), BOOM_DIR), e = new THREE.Euler().setFromQuaternion(q);
        b.at([HUB.x, HUB.y, HUB.z + 0.4], () => F.bottleBrush(b, { r: 1.7, len: 2.0, rings: 14, per: 56, m: BRUSH, hubM: 'dark', thick: 0.015 }), [e.x, e.y, e.z]);
      }),
    P('fan', 'High-power fan', 'air', 2, 0.12, [0, 0, 0], [0, 2.4, 2.2], 'Blower', 'named', ['rj-q50', 'deck'],
      'RJ-Bot labels it a high-power fan: an added high-pressure airflow jetting device that blows the dust off the duct wall toward the vacuum at the far end. It is 240 W (12 V, 20 A) at 102°, and it is the white funnel on the arm in the picture.',
      [['Power', '240 W (12 V × 20 A)'], ['Angle', '102°']],
      (b) => {
        b.at([0.2, 3.2, 0.9], () => {
          b.box(1.3, 0.9, 1.0, { m: GREY, r: 0.08 });
          b.cyl(0.18, 0.5, 0.9, { m: WHITE, rot: [PI / 2 + 0.3, 0, 0], at: [-0.4, 0.55, 0.9], seg: 20 });
        });
      }),
    P('cameras', 'Cameras', 'sense', 1, 0.08, [0, 0, 0], [0, 1.6, 2.6], 'Camera', 'named', ['rj-q50', 'rj-hvac'],
      'Three HD cameras record the work: one 6 MP camera for recording and two 5 MP cameras. The tablet shows all three.',
      [['Cameras', '1 × 6 MP + 2 × 5 MP']],
      (b) => {
        b.at([0, 2.35, 2.1], () => L.camera(b, { w: 0.6, h: 0.34, d: 0.3, lens: 0.11, ring: false }));
        b.at([0.8, 2.4, 1.2], () => L.camera(b, { w: 0.4, h: 0.28, d: 0.25, lens: 0.09, ring: false }));
        b.at([0, 1.9, -1.95], () => b.at([0, 0, 0], () => L.camera(b, { w: 0.4, h: 0.28, d: 0.25, lens: 0.09, ring: false }), [0, PI, 0]));
      }),
    P('cable', 'Signal cable', 'tether', 1, 0.1, [0, 0, 0], [0, 0, -3.2], 'Cable', 'named', ['rj-q50'],
      'The wired link to the signal box, 60 m in the standard set-up.',
      [['Reach', '60 m (standard)'], ['Signal box', '400 × 320 × 180 mm']],
      (b) => { F.tube(b, [[0, 1.0, -2.0], [0.4, 0.3, -3.4], [-0.5, 0.2, -4.8], [0.3, 0.2, -6.2]], 0.13, { m: { k: 'rubber', id: 'q50-cable', color: 0x1b1e21 } }); }),
  ],
};
