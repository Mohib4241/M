// NWS Guard R security robot (NWS Digital, the robotics arm of the Nürnberger Wach- und Schließgesellschaft).
// Y up, +Z front, 1 unit = 100 mm. What it carries and where it works comes from NWS's own page for the Guard R:
// all-wheel drive, LiDAR, a 360° HD camera, a thermal camera, a gas sensor, a zero-degree turning radius, protection
// IP22 on the chassis and IP54 on the module housings, ROS 2 on an NVIDIA and Intel computer. NWS publishes no size
// or weight, so the size here is an estimate from the product picture in the product deck (the tyres taken as about
// 340 mm); treat it as a picture, not a measurement. The outside follows that picture; where parts sit inside is a
// schematic reconstruction, not CAD.
import * as THREE from 'three';
import * as L from '../lib.js';
import * as F from '../field.js';

const PI = Math.PI;
const P = (id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build) => ({ id, name, group, layer, delay, home, ex, tag, conf, src, desc, specs, build });
const TEAL = { k: 'shell', id: 'nws-teal', color: 0x0e6b66, metalness: 0.2, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.25 };
const BLACK = { k: 'shellDk', id: 'nws-black', color: 0x121416, metalness: 0.35, roughness: 0.45 };
const BLACK2 = { k: 'shell', id: 'nws-black2', color: 0x1c1f22, metalness: 0.3, roughness: 0.5 };
const ALU = { k: 'silver', id: 'nws-alu', color: 0xc8ccd0, metalness: 0.85, roughness: 0.3 };
const WHITE = { k: 'shell', id: 'nws-white', color: 0xe9ebed, metalness: 0.1, roughness: 0.35, clearcoat: 0.5 };
const STRIP = { k: 'shell', id: 'nws-plate', color: 0x2e6bb8, metalness: 0.3, roughness: 0.4 };

const WR = 1.7, WX = 4.9, WZ = 4.4, WW = 1.5;          // wheels (radius 1.7: 340 mm tyres, an estimate)

export default {
  id: 'nws-guard-r',
  name: 'NWS Guard R',
  short: 'Guard R',
  maker: 'NWS Digital (Nürnberger Wach- und Schließgesellschaft)',
  blurb: 'Autonomous four-wheel security robot for indoor and outdoor patrols: LiDAR, a 360° HD camera, a thermal camera and a gas sensor, steered from NWS\'s cloud control room.',
  accent: '#3de0ff', accent2: '#ffd166',
  studio: { accent: '#0e6b66', accent2: '#c98a1a' },
  hover: 0.4,
  race: false, noDock: true,
  mats: { studio: { shell: { color: 0x0e6b66, metalness: 0.2, roughness: 0.4, clearcoat: 0.6 }, shellDk: { color: 0x121416, metalness: 0.35, roughness: 0.45 }, trim: { color: 0x2a2e33 } } },
  kpis: [['Drive', 'All-wheel'], ['Chassis', 'IP22'], ['Modules', 'IP54']],
  stats: [
    ['Drive', 'All-wheel drive · zero-degree turning radius'],
    ['Sensors', '360° HD camera · thermal imaging camera · LiDAR · gas sensor'],
    ['Navigation', 'Autonomous, without a constant network link · geofencing · QR codes'],
    ['Protection', 'IP22 chassis · IP54 module housings'],
    ['Use', 'Indoor and outdoor; asphalt, gravel and rough ground'],
    ['Computer', 'NVIDIA platform · Intel NUC module · ROS 2'],
    ['Cloud', 'Microsoft Azure IoT · "ROC" Robot Operation Center portal'],
    ['Events', 'Logged in an electronic guard book'],
    ['Size', 'Not published'],
  ],
  notes: [
    'NWS publishes no size or weight for the Guard R on the page read. The size of the model is our estimate from the picture, with the tyres taken as about 340 mm; treat it as a picture, not a measurement.',
    'The NWS page gives no speed or runtime for the Guard R, so none is shown.',
    'The picture shows a teal upper housing with four whip antennas, a black chassis with a charging plate and a red beacon at the front, and a sensor mast: a camera module with two lenses and lights, a LiDAR, a flat aluminium bar and a black 360° camera on top.',
    'What each box holds is read from the picture and NWS\'s list of sensors; NWS does not label them. NWS\'s range also has a tracked outdoor robot (Guard K) and a Guard B, which are not shown here.',
  ],
  sources: ['deck', 'nws-gr', 'nws-rob'],

  parts: [
    P('top-cover', 'Teal housing', 'shell', 0, 0, [0, 0, 0], [0, 3.4, -1.0], 'Housing', 'named', ['deck', 'nws-gr'],
      'The tall teal housing on top of the chassis. It carries four whip antennas for the radio links and has a lid that lifts away to the electronics. It is the first piece to lift off. NWS lists IP54 for its module housings.',
      [['Rating', 'IP54 (module housings)']],
      (b) => {
        b.box(6.3, 3.0, 6.6, { m: TEAL, r: 0.25, at: [0, 7.2, 0] });
        b.box(5.8, 0.12, 6.0, { m: { k: 'shell', id: 'nws-teal2', color: 0x0a5a56, roughness: 0.45 }, r: 0.1, at: [0, 8.72, 0], e: false });
        for (const [x, a] of [[-2.3, 0.5], [-0.9, 0.2], [0.9, -0.2], [2.3, -0.5]]) {
          F.rod(b, [x, 8.72, 1.4], [x + Math.sin(a) * 1.9, 8.72 + Math.cos(a) * 1.9, 1.4], 0.07, { m: BLACK, seg: 8, e: false });
        }
      }),
    P('chassis', 'Chassis', 'drive', 3, 0.06, [0, 0, 0], [0, -1.4, 0], 'Frame', 'named', ['deck', 'nws-gr'],
      'The black low chassis with wings over the wheels and a stepped middle with cooling fins. NWS gives it protection IP22, so it keeps to dry ground.',
      [['Rating', 'IP22 (chassis)']],
      (b) => {
        b.box(7.0, 1.3, 10.4, { m: BLACK, r: 0.3, at: [0, 2.4, 0] });
        b.box(5.3, 1.4, 7.0, { m: BLACK2, r: 0.2, at: [0, 3.65, -0.4] });
        for (let i = 0; i < 5; i++) b.box(5.2, 0.06, 0.5, { m: 'dark', at: [0, 4.0, 2.4 + i * 0.22], e: false });
        for (const sd of [-1, 1]) F.bar(b, [sd * 3.0, 1.9, -WZ], [sd * 3.0, 1.9, WZ], { w: 0.3, h: 0.3, m: BLACK, r: 0.05 });
      }),
    ...[-1, 1].map((sd) => P(sd < 0 ? 'wheels-r' : 'wheels-l', sd < 0 ? 'Right wheels' : 'Left wheels', 'drive', 2, 0.08,
      [0, 0, 0], [sd * 4.0, 0, 0], 'Wheels', 'named', ['deck', 'nws-gr'],
      'Two road-type tyres with an arrow tread on black rims. With four driven wheels the robot has a zero-degree turning radius: it can spin on the spot in a narrow corridor.',
      [['Drive', 'All-wheel'], ['Turning radius', '0°']],
      (b) => {
        for (const f of [-1, 1]) b.at([sd * WX, WR, f * WZ], () => {
          F.offroadWheel(b, { r: WR, w: WW, side: sd, rimM: { k: 'dark', id: 'nws-rim', color: 0x1a1c1f, metalness: 0.5, roughness: 0.4 }, blocks: 36, spokes: 5 });
        });
      })),
    P('suspension', 'Suspension arms', 'drive', 3, 0.1, [0, 0, 0], [0, -2.2, 0], 'Arms', 'inferred', ['deck'],
      'Black wishbone arms that join each wheel to the chassis and let it follow uneven ground, as the picture shows.',
      [['Reading', 'Our reading of the picture']],
      (b) => { for (const sd of [-1, 1]) for (const f of [-1, 1]) { F.bar(b, [sd * 3.0, 2.2, f * WZ], [sd * (WX - 0.5), 1.9, f * WZ], { w: 0.25, h: 0.22, m: BLACK, r: 0.04 }); b.cyl(0.18, 0.18, 0.5, { m: 'steel', rot: [0, 0, PI / 2], at: [sd * (WX - 0.9), 1.8, f * WZ], seg: 12, e: false }); } }),
    P('charge-plate', 'Charging plate', 'power', 1, 0.04, [0, 0, 0], [0, -0.6, 3.4], 'Charge', 'named', ['deck'],
      'A plate on the front of the chassis with charging contacts, marked as an auto-charge station in the picture, so the robot can drive up to a dock and charge itself. A red lamp above it shows its state.',
      [['Charging', 'Automatic, by its front contacts']],
      (b) => {
        b.box(3.3, 1.3, 0.4, { m: STRIP, r: 0.12, at: [0, 2.75, 5.3] });
        b.box(2.9, 0.14, 0.05, { m: 'silver', at: [0, 2.4, 5.52], e: false });
        b.box(2.9, 0.14, 0.05, { m: 'silver', at: [0, 2.15, 5.52], e: false });
        b.sph(0.26, { m: 'red', at: [0, 3.6, 5.25], seg: 16 });
      }),
    P('battery', 'Batteries', 'power', 3, 0.12, [0, 0, 0], [0, -2.6, -2.4], 'Power', 'inferred', ['nws-gr'],
      'NWS lists high-performance batteries. They sit low in the chassis; NWS gives no capacity or runtime on the page, and says the runtime depends on temperature, speed and load.',
      [['Runtime', 'Depends on temperature, speed and load']],
      (b) => { b.at([0, 2.35, -1.0], () => L.battery(b, { w: 4.0, h: 0.9, d: 3.8 })); }),
    P('computer', 'Computer', 'power', 2, 0.14, [0, 0, 0], [0, 1.2, -3.6], 'Brain', 'named', ['nws-gr'],
      'An NVIDIA platform and an Intel NUC module running ROS 2 in the housing. The robot navigates by itself without a constant network link; its data goes to NWS\'s cloud control room on Microsoft Azure IoT.',
      [['Computer', 'NVIDIA + Intel NUC · ROS 2'], ['Cloud', 'Azure IoT · ROC portal']],
      (b) => { b.at([0, 6.4, -0.4], () => L.pcb(b, { w: 3.4, d: 3.6 })); }),
    P('cable', 'Sensor cable', 'tether', 1, 0.1, [0, 0, 0], [0, 1.0, 2.8], 'Cable', 'inferred', ['deck'],
      'A black corrugated tube that carries power and data from the housing up to the sensor mast.',
      [['Reading', 'Our reading of the picture']],
      (b) => { F.tube(b, [[0.1, 7.6, 3.0], [-0.4, 8.6, 3.5], [-0.2, 9.4, 2.9]], 0.2, { m: { k: 'rubber', id: 'nws-cable', color: 0x15171a } }); }),
    P('camera-module', 'Thermal and HD camera', 'sense', 1, 0.06, [0, 0, 0], [0, 2.2, 3.0], 'Camera', 'named', ['deck', 'nws-gr'],
      'The grey and white camera box on the mast with two lenses and lamps: one is the thermal imaging camera, the other an HD camera. NWS lists a thermal imaging camera and a 360° HD camera.',
      [['Cameras', 'Thermal + HD']],
      (b) => {
        b.at([0, 9.5, 2.4], () => {
          b.box(2.1, 1.2, 1.2, { m: WHITE, r: 0.2 });
          b.box(0.9, 0.7, 0.1, { m: 'glass', r: 0.1, at: [-0.5, 0.0, 0.62], e: false });
          b.box(0.9, 0.7, 0.1, { m: 'glass', r: 0.1, at: [0.5, 0.0, 0.62], e: false });
          b.cyl(0.2, 0.2, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [-0.5, 0.0, 0.69], seg: 16 });
          b.cyl(0.2, 0.2, 0.06, { m: 'lens', rot: [PI / 2, 0, 0], at: [0.5, 0.0, 0.69], seg: 16 });
          b.box(2.1, 0.3, 1.0, { m: BLACK2, r: 0.1, at: [0, -0.75, 0] });
        });
      }),
    P('lidar', 'LiDAR', 'sense', 1, 0.08, [0, 0, 0], [0, 3.4, 2.4], 'LiDAR', 'named', ['deck', 'nws-gr'],
      'A spinning LiDAR in a black drum above the camera box. It maps the walls and obstacles around the robot, which is how it can navigate without a network link.',
      [['Sensor', 'LiDAR']],
      (b) => { b.at([0, 11.1, 2.3], () => { b.cyl(0.66, 0.66, 1.4, { m: BLACK, seg: 32 }); b.cyl(0.68, 0.68, 0.1, { m: 'silver', at: [0, 0.3, 0], seg: 32, e: false }); b.cyl(0.68, 0.68, 0.1, { m: 'silver', at: [0, -0.3, 0], seg: 32, e: false }); b.cyl(0.55, 0.55, 0.3, { m: 'lens', at: [0, 0.0, 0], seg: 28, e: false }); }); }),
    P('mast', 'Mast and 360° camera', 'arm', 1, 0.1, [0, 0, 0], [0, 4.6, 2.0], 'Mast', 'named', ['deck', 'nws-gr'],
      'A flat aluminium bar that lifts a black 360° HD camera to the top of the robot, about 1.8 m up (an estimate). NWS also lists a gas sensor and QR-code reading among the robot\'s senses.',
      [['Camera', '360° HD']],
      (b) => {
        b.box(0.75, 2.4, 0.3, { m: ALU, r: 0.05, at: [0, 14.0, 2.3] });
        b.at([0, 16.4, 2.3], () => {
          b.box(1.3, 3.0, 1.2, { m: BLACK, r: 0.15 });
          b.cyl(0.46, 0.46, 0.35, { m: 'lens', rot: [PI / 2, 0, 0], at: [0, 0.7, 0.62], seg: 24 });
          b.box(0.5, 0.06, 0.06, { m: 'green', at: [0.1, -0.1, 0.62], e: false });
        });
      }),
  ],
};
