// PUDU MT1 and MT1 Max, robotic sweepers. Y up, +Z front, 1 unit = 100 mm.
// MT1: 840 L x 600 W x 490 H mm. MT1 Max: 840 L x 600 W x 675 H mm, with a 3D LiDAR.
// Numbers come from retailer listings of PUDU's specifications, PUDU's MT1 product presentation and
// user manual, and PUDU's launch release for the MT1 Max; some listings disagree (see the notes). No
// picture of either robot could be reached, so the outside is schematic: a low sweeper body for the MT1,
// a taller one for the MT1 Max. Internal positions are a schematic reconstruction too.
import * as L from '../lib.js';

const PI = Math.PI;

/** The definition of the MT1 (`max` false) or the MT1 Max (`max` true). */
export function mt1Def(max) {
  const H = max ? 6.75 : 4.9, top = H - 0.35;
  const src = max ? ['rl-mt1max', 'rs-mt1max', 'as-mt1max', 'pd-mt1max-pr'] : ['pd-mt1', 'pd-mt1-ppt', 'rs-mt1', 'hh-mt1'];
  const s0 = src[0], s1 = src[1];
  return {
    id: max ? 'mt1max' : 'mt1',
    name: max ? 'PUDU MT1 Max' : 'PUDU MT1',
    short: max ? 'MT1 Max' : 'MT1',
    maker: 'PUDU Robotics',
    blurb: max
      ? 'AI-powered robotic sweeper with 3D perception for large, complex sites, indoors and out, with a 35 L bin and an IP54 rating.'
      : 'AI-powered robotic sweeper for large areas such as car parks, warehouses and factories, with LiDAR and visual SLAM.',
    accent: max ? '#ff7a59' : '#7ee081',
    accent2: max ? '#ffd166' : '#5fd0ff',
    studio: max ? { accent: '#c8502c', accent2: '#b98a10' } : { accent: '#2f9e44', accent2: '#1f86b8' },
    hover: 2.0,
    noDock: `No dock is shown for the ${max ? 'MT1 Max' : 'MT1'}: its shape and size were not in the sources reached.`,
    mats: {
      studio: {
        shell:   { color: max ? 0x3a3f46 : 0xd9dde1, metalness: 0.2, roughness: 0.4, clearcoat: 0.45, clearcoatRoughness: 0.25 },
        shellDk: { color: 0x1b1e22, metalness: 0.15, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.3 },
        trim:    { color: 0x17191c },
        graphite:{ color: 0x5c636b },
      },
    },
    stats: max ? [
      ['Size', '840 × 600 × 675 mm'],
      ['Weight', '85 kg'],
      ['Debris', '35 L bin'],
      ['Cleaning width', '700 mm with side brush'],
      ['Throughput', 'Up to 2,200 m²/h'],
      ['Battery', '60 Ah'],
      ['Runtime', '5–10 h (8 h standard)'],
      ['Speed', '0.2–1.2 m/s'],
      ['Protection', 'IP54'],
      ['Sensing', '3D LiDAR · LiDAR · VSLAM · RGBD ×3 · RGB ×2'],
    ] : [
      ['Size', '840 × 600 × 490 mm'],
      ['Weight', '65 kg (some listings: 74–75 kg)'],
      ['Debris', '35 L bin'],
      ['Cleaning width', '700 mm'],
      ['Battery', '45 Ah'],
      ['Runtime', 'Up to 8 h'],
      ['Speed', '0.2–1.2 m/s'],
      ['Navigation', 'LiDAR SLAM · VSLAM · markers'],
      ['Min. path', '75 cm'],
      ['Sensing', 'LiDAR · VSLAM · RGBD · RGB · line laser'],
    ],
    notes: max ? [
      'Retailers list 840 × 600 × 675 mm and 85 kg; one lists 1,000 × 750 × 850 mm, 95 kg and a 900 mm width, and another 238 kg. The figures most listings share are used.',
      'Navigation is VSLAM, markers and 3D LiDAR SLAM. The launch release claims objects can be detected up to 150 m away. The filter (F9, non-woven paper on a metal frame) is kept clear by a vibration system and can clean itself.',
      'One listing says it crosses 5 cm bumps and climbs 8°; the user manual gives 20 mm for bumps. Charging is under 3.5 h in retailer listings.',
      'No picture of the MT1 Max could be reached here, so its outside is schematic: a taller body than the MT1 with the 3D LiDAR on a mast. No dock is shown.',
    ] : [
      'Weight is 65 kg in PUDU-style brochures but 74–75 kg in some listings. The 35 L bin is quoted for the MT1 in most listings. Charging is under 3 h on PUDU\'s page.',
      'PUDU\'s product presentation shows a LiDAR, RGBD cameras, a VSLAM camera, an RGB camera, a line laser, a fill light, a bumper sensor and side brushes. The dust is held back by a filter in the debris box.',
      'No picture of the MT1 could be reached here, so its outside is schematic: a low, wide sweeper body. No dock is shown.',
    ],
    sources: src,
    water: null, // a sweeper: no water system

    parts: [
      // ───────────── Shell & covers ─────────────
      {
        id: 'top-cover', name: 'Top cover', group: 'shell', layer: 0, delay: 0,
        home: [0, top, -0.3], ex: [0, 4.2, 0], tag: 'Lid', conf: 'inferred', src: [s0],
        desc: 'The top cover over the bin and the electronics. Its shape is schematic.',
        specs: [['Robot height', max ? '675 mm' : '490 mm']],
        build(b) { b.panel(5.6, 7.4, 0.5, { m: 'shell', r: 1.4, bevel: 0.15, rot: [-PI / 2, 0, 0] }); },
      },
      {
        id: 'front-shell', name: 'Front sensor face', group: 'shell', layer: 0, delay: 0.03,
        home: [0, H * 0.5, 3.75], ex: [0, 0.8, 7.4], tag: 'Sensors', conf: 'inferred', src: [s0, s1],
        desc: 'The front of the body, where the cameras and the line lasers look out. Its shape is schematic.',
        specs: [['Behind it', max ? 'RGBD ×3 · RGB ×2 · line laser ×3' : 'RGBD · RGB · line laser · fill light']],
        build(b) {
          b.panel(5.4, H - 1.0, 0.5, { m: 'shellDk', r: 0.8, bevel: 0.12 });
          b.box(4.2, 0.5, 0.06, { m: 'glass', r: 0.1, at: [0, H * 0.12, 0.26], e: false }); // the sensor window
        },
      },
      {
        id: 'rear-shell', name: 'Rear panel', group: 'shell', layer: 0, delay: 0.03,
        home: [0, H * 0.5, -4.0], ex: [0, 0.8, -7.4], tag: 'Rear', conf: 'inferred', src: [s0],
        desc: 'The rear of the body, over the battery. Its shape is schematic.',
        specs: [['Battery behind it', max ? '60 Ah' : '45 Ah']],
        build(b) { b.panel(5.4, H - 1.0, 0.5, { m: 'shell', r: 0.8, bevel: 0.12 }); },
      },
      ...[-1, 1].map((s) => ({
        id: s > 0 ? 'side-shell-l' : 'side-shell-r', name: s > 0 ? 'Left side panel' : 'Right side panel',
        group: 'shell', layer: 0, delay: 0.06,
        home: [s * 2.75, H * 0.5, -0.1], ex: [s * 5.4, 0.8, 0], tag: 'Side', conf: 'inferred', src: [s0],
        desc: 'A side of the body. Its shape is schematic.',
        specs: [['Width', '600 mm overall']],
        build(b) { b.panel(7.6, H - 1.0, 0.5, { m: 'shell', r: 0.9, bevel: 0.14, rot: [0, PI / 2, 0] }); },
      })),
      {
        id: 'bumper', name: 'Base and bumper', group: 'shell', layer: 0, delay: 0.1,
        home: [0, 0.9, 0], ex: [0, -0.5, 7.6], tag: 'Contact', conf: 'named', src: max ? [s0] : ['pd-mt1-ppt'],
        desc: 'The dark base round the robot, with the bumper at the front that stops it on contact.',
        specs: [['Min. path', '75 cm']],
        build(b) { b.panel(6.0, 8.4, 1.4, { m: 'trim', r: 1.6, bevel: 0.25, rot: [-PI / 2, 0, 0] }); },
      },

      // ───────────── Controls ─────────────
      {
        id: 'e-stop', name: 'Emergency stop', group: 'ui', layer: 0, delay: 0.1,
        home: [-1.8, top + 0.4, -2.4], ex: [-1.8, 5.0, -3.0], tag: 'Stop', conf: 'inferred', src: [s0],
        desc: 'A red stop button on the top. Standard on these robots; its place here is schematic.',
        specs: [['Action', 'Cuts drive + brush power']],
        build(b) { L.eStop(b, { r: 0.28 }); },
      },

      // ───────────── Cleaning head ─────────────
      ...[-1, 1].map((s) => ({
        id: s < 0 ? 'side-brush-r' : 'side-brush-l', name: s < 0 ? 'Right side brush' : 'Left side brush',
        group: 'clean', layer: 3, delay: 0.1,
        home: [s * 2.4, 0.15, 3.6], ex: [s * 5.0, -2.4, 5.0], tag: '700 mm', conf: 'named', src: max ? [s0] : ['rs-mt1', 'pd-mt1-ppt'],
        desc: 'A spinning side brush at a front corner, sweeping edges and corners into the main brush.',
        specs: [['Cleaning width', '700 mm with side brush']],
        build(b) { L.sideBrush(b, { r: 0.95 }); },
      })),
      {
        id: 'roller-brush', name: 'Main roller brush', group: 'clean', layer: 3, delay: 0.04,
        home: [0, 0.45, 1.6], ex: [0, -3.0, 2.8], tag: 'Sweep', conf: 'named', src: max ? [s0] : ['rs-mt1'],
        desc: 'The main brush across the middle that throws the sweepings back into the bin.',
        specs: [['Works with', 'The side brushes and the suction']],
        build(b) { L.roller(b, { r: 0.45, len: 4.8, rows: 24 }); },
      },
      {
        id: 'trash-bin', name: 'Trash bin', group: 'air', layer: 1, delay: 0.06,
        home: [0, H * 0.4, 0.4], ex: [0, 3.0, 4.6], tag: '35 L', conf: max ? 'confirmed' : 'named', src: max ? [s0, 'pd-mt1-manual'] : ['mbs-mt1', 'rs-mt1'],
        desc: 'The bin the main brush fills. It lifts out to be emptied.',
        specs: [['Capacity', '35 L (9.25 gal)']],
        build(b) {
          b.box(4.4, H * 0.42, 2.6, { m: 'tankDi', r: 0.2, ec: 'accent', eo: 0.7 });
          b.box(4.2, H * 0.2, 2.4, { m: 'sludge', r: 0.15, at: [0, -H * 0.1, 0], e: false });
        },
      },
      {
        id: 'filter', name: max ? 'F9 air filter' : 'Air filter', group: 'air', layer: 1, delay: 0.1,
        home: [0, H * 0.72, -0.6], ex: [0, 4.4, -1.2], tag: max ? 'F9' : 'Filter', conf: 'named', src: max ? [s0, 'pd-mt1max-pr'] : ['hh-mt1'],
        desc: max ? 'Non-woven filter paper on a metal frame, grade F9. A vibration system shakes it clear while the robot works, and it can clean itself.'
          : 'The filter that holds the dust back in the debris box while the suction fan draws air through.',
        specs: max ? [['Grade', 'F9'], ['Kept clear by', 'Vibration, self-cleaning']] : [['Air flow', 'High-flow negative pressure']],
        build(b) { L.pleatedFilter(b, { r: 0.6, h: 1.0 }); },
      },
      {
        id: 'vacuum-motor', name: 'Suction fan', group: 'air', layer: 2, delay: 0.04,
        home: [1.6, H * 0.62, -1.8], ex: [4.4, 2.4, -2.4], tag: 'Suction', conf: 'named', src: max ? [s0] : ['hh-mt1'],
        desc: 'The fan that pulls air through the bin and the filter, so fine dust stays inside. Its rating is not published.',
        specs: [['Rating', 'Not published']],
        build(b) { L.turbine(b, { r: 0.5, h: 0.8 }); },
      },

      // ───────────── Power & brain ─────────────
      {
        id: 'battery', name: 'Battery', group: 'power', layer: 2, delay: 0.04,
        home: [0, 1.9, -2.4], ex: [0, -0.4, -5.0], tag: max ? '60 Ah' : '45 Ah', conf: max ? 'confirmed' : 'named', src: [s0],
        desc: max ? 'The battery pack: 5 to 10 hours of work, 8 hours in standard mode.' : 'The battery pack: up to 8 hours of work. One listing gives 45 Ah.',
        specs: max ? [['Capacity', '60 Ah'], ['Runtime', '5–10 h (8 h standard)'], ['Charging', 'Under 3.5 h']] : [['Capacity', '45 Ah'], ['Runtime', 'Up to 8 h'], ['Charging', 'Under 3 h']],
        build(b) { L.battery(b, { w: 3.6, h: 1.1, d: 2.0 }); },
      },
      {
        id: 'charge-contacts', name: 'Charge contacts', group: 'power', layer: 2, delay: 0.1,
        home: [0, 0.6, -4.1], ex: [0, -0.8, -6.8], tag: 'Charging', conf: 'inferred', src: [s0],
        desc: 'Where the charger meets the robot. Their position here is schematic.',
        specs: [['Charging', max ? 'Under 3.5 h' : 'Under 3 h']],
        build(b) { L.chargePads(b, { w: 1.4 }); },
      },
      {
        id: 'controller', name: 'Main controller', group: 'power', layer: 1, delay: 0.14,
        home: [-1.2, H * 0.72, 1.6], ex: [-3.6, 3.6, 2.4], tag: 'AI', conf: 'inferred', src: [s0],
        desc: 'The computer that builds the map, keeps the robot located and plans its cleaning route.',
        specs: [['Navigation', max ? 'VSLAM · markers · 3D LiDAR SLAM' : 'LiDAR SLAM · VSLAM · markers']],
        build(b) { L.pcb(b, { w: 2.2, d: 1.8 }); },
      },

      // ───────────── Drive & frame ─────────────
      {
        id: 'chassis', name: 'Chassis frame', group: 'drive', layer: 3, delay: 0.12,
        home: [0, 0.7, -0.6], ex: [0, -1.8, -0.8], tag: 'Frame', conf: 'inferred', src: [s0],
        desc: max ? 'The frame that carries the 85 kg robot.' : 'The frame that carries the robot.',
        specs: max ? [['Weight', '85 kg'], ['Protection', 'IP54']] : [['Weight', '65 kg (some listings: 74–75 kg)']],
        build(b) { b.box(5.0, 0.18, 6.4, { m: 'metal', r: 0.05 }); },
      },
      ...[-1, 1].map((s) => ({
        id: s < 0 ? 'wheel-l' : 'wheel-r', name: s < 0 ? 'Drive wheel (right)' : 'Drive wheel (left)', // ids follow the race's convention (wheel-l at -x)
        group: 'drive', layer: 3, delay: 0.04,
        home: [s * 2.55, 0.75, -1.0], ex: [s * 5.0, -1.0, -0.8], tag: '1.2 m/s', conf: 'named', src: max ? ['pd-mt1max-pr'] : [s0],
        desc: 'One of the two driven hub-motor wheels.',
        specs: [['Speed', '0.2–1.2 m/s (adjustable)']],
        build(b) { L.wheel(b, { r: 0.75, w: 0.5, side: s }); },
      })),
      {
        id: 'casters', name: 'Casters', group: 'drive', layer: 3, delay: 0.1,
        home: [0, 0.3, -3.2], ex: [0, -2.2, -3.6], tag: 'Swivel', conf: 'inferred', src: [s0],
        desc: 'Swivel casters that carry the rear of the robot.',
        specs: [['Type', 'Swivel']],
        build(b) { for (const s of [-1, 1]) b.at([s * 2.0, 0, 0], () => L.caster(b, { r: 0.3 })); },
      },

      // ───────────── Sensing ─────────────
      ...(max ? [{
        id: 'lidar-3d', name: '3D LiDAR', group: 'sense', layer: 0, delay: 0.02,
        home: [0, H + 0.45, -0.6], ex: [0, H + 3.6, -0.6], tag: '3D', conf: 'confirmed', src: [s0, 'pd-mt1max-pr'],
        desc: 'The 3D LiDAR that gives the MT1 Max its 3D perception. Its place on a mast on the top is schematic.',
        specs: [['Detection', 'Up to 150 m (PUDU\'s claim)']],
        build(b) { b.cyl(0.2, 0.25, 0.5, { m: 'trim', at: [0, -0.25, 0], seg: 16 }); L.lidar(b, { r: 0.5, h: 0.55 }); },
      }] : []),
      {
        id: 'lidar-2d', name: 'LiDAR', group: 'sense', layer: 1, delay: 0.04,
        home: [0, 1.2, 3.9], ex: [0, -0.6, 7.2], tag: 'SLAM', conf: 'confirmed', src: max ? [s0] : ['pd-mt1', 'pd-mt1-ppt'],
        desc: 'The laser scanner for LiDAR SLAM. Its place here is schematic.',
        specs: [['Use', 'Mapping and positioning']],
        build(b) { L.lidar(b, { r: 0.42, h: 0.4 }); },
      },
      {
        id: 'vslam-camera', name: 'VSLAM camera', group: 'sense', layer: 0, delay: 0.06,
        home: [1.4, top + 0.3, 2.6], ex: [3.0, top + 3.0, 3.4], tag: 'VSLAM', conf: 'confirmed', src: max ? [s0] : ['pd-mt1', 'pd-mt1-ppt'],
        desc: 'The camera for visual positioning, looking up and around. Its place here is schematic.',
        specs: [['Use', 'Visual SLAM']],
        build(b) { L.camera(b, { w: 0.45, h: 0.3, d: 0.3, lens: 0.12 }); },
      },
      {
        id: 'depth-cameras', name: max ? 'RGBD cameras (3)' : 'RGBD cameras', group: 'sense', layer: 1, delay: 0.06,
        home: [0, H * 0.62, 3.95], ex: [0, 2.0, 7.6], tag: 'Depth', conf: 'confirmed', src: max ? [s0] : ['pd-mt1-ppt'],
        desc: 'Depth cameras across the front for seeing obstacles in 3D.',
        specs: [['Count', max ? '3' : 'Shown on PUDU\'s diagram']],
        build(b) { for (const x of max ? [-1.6, 0, 1.6] : [-1.2, 1.2]) b.at([x, 0, 0], () => L.camera(b, { w: 0.6, h: 0.28, d: 0.26, lens: 0.1 })); },
      },
      {
        id: 'rgb-camera', name: max ? 'RGB cameras (2)' : 'RGB camera', group: 'sense', layer: 1, delay: 0.08,
        home: [0, H * 0.78, 3.95], ex: [0, 3.0, 7.0], tag: 'AI', conf: 'confirmed', src: max ? [s0] : ['pd-mt1-ppt'],
        desc: 'Colour camera for the AI that recognises dirt and obstacles.',
        specs: [['Count', max ? '2' : '1']],
        build(b) { for (const x of max ? [-0.8, 0.8] : [0]) b.at([x, 0, 0], () => L.camera(b, { w: 0.4, h: 0.26, d: 0.22, lens: 0.09 })); },
      },
      {
        id: 'line-laser', name: max ? 'Line lasers (3)' : 'Line laser', group: 'sense', layer: 1, delay: 0.1,
        home: [0, 1.6, 4.0], ex: [0, -1.4, 7.8], tag: 'Low', conf: 'confirmed', src: max ? [s0] : ['pd-mt1-ppt'],
        desc: 'Lasers that draw a line on the floor ahead to find low obstacles and drops.',
        specs: [['Count', max ? '3' : 'Shown on PUDU\'s diagram']],
        build(b) { for (const x of max ? [-1.6, 0, 1.6] : [0]) b.box(0.5, 0.14, 0.14, { m: 'red', r: 0.03, at: [x, 0, 0] }); },
      },
    ],
  };
}

export default mt1Def(false);
