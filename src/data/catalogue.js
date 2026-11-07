// How the catalogue groups its robots: where each one works (indoor, outdoor or both) and what kind of
// job it does. Each robot also carries a short written profile that says where it fits.
//
// The three bullet points of the deck robots are the wording of the product deck they come from; the
// "where" lines and the numbers in them come from the makers' own pages and datasheets (see `sources`
// in each robot's data file). A tag is only given where a source supports it, and `basis` says which.

export const ENVIRONMENTS = {
  indoor:  { label: 'Indoor',  note: 'Inside buildings: floors, ducts, corridors, plant rooms.' },
  outdoor: { label: 'Outdoor', note: 'Outside: building facades, roofs, solar farms, yards, and pipes underground.' },
};

// In the order the browser lists them. `blurb` says what the group of robots does and where it fits.
export const CATEGORIES = {
  floor: {
    label: 'Floor cleaning',
    blurb: 'Sweep, vacuum, scrub or mop big floors on a mapped route. Shopping centres, hotels, supermarkets, warehouses and factories; one model also works outside.',
  },
  facade: {
    label: 'Facade cleaning',
    blurb: 'Climb the outside of a building and wash its glass and curtain walls, so crews do not hang from ropes. Outdoor, on the building itself.',
  },
  solar: {
    label: 'Solar panel cleaning',
    blurb: 'Brush dust off photovoltaic panels so they keep their output, without people walking on roofs and arrays. Outdoor.',
  },
  'duct-air': {
    label: 'Duct cleaning · Air',
    blurb: 'Drive inside air-conditioning and ventilation ducts, brush the dust off the walls and show the inside on a camera. Indoor: the ceilings stay closed.',
  },
  'duct-grease': {
    label: 'Duct cleaning · Grease',
    blurb: 'Cut the grease out of kitchen exhaust ducts, which lowers the fire risk. Indoor: restaurants, hotel kitchens and canteens.',
  },
  'duct-sewer': {
    label: 'Duct cleaning · Sewer',
    blurb: 'Drive through sewer and drain pipes with a camera and record their condition, so nobody has to enter the pipe. Outdoor and underground.',
  },
  inspection: {
    label: 'Inspection robots',
    blurb: 'Walk a set round past plant, shafts and roofs and collect the same readings every time. Indoor and outdoor.',
  },
  security: {
    label: 'Security patrolling',
    blurb: 'Patrol a set route with cameras, send live video to a control room and raise an alert so a person can act. Outdoor yards and indoor halls.',
  },
  patrol: {
    label: 'Patrolling robots',
    blurb: 'Drive the same route at set times with a pan-tilt-zoom camera, record the site and flag anything unusual. Outdoor.',
  },
};
export const CATEGORY_ORDER = Object.keys(CATEGORIES);

// id → profile.  brand and tab: the maker and the name on the robot's button.  env: where it works. kind: the short label under its name. line: what it is, in one line.
// where: where it fits, with the numbers that matter for that. points: three things to know.
// basis: what the environment tag rests on.
export const PROFILES = {
  // ───────────── Floor cleaning ─────────────
  phantas: {
    brand: 'Gausium', tab: 'Phantas',
    env: ['indoor'], category: 'floor', kind: 'Floor cleaning robot',
    line: 'Compact 4-in-1 commercial robot that sweeps, vacuums, scrubs and dust-mops.',
    where: 'Indoor commercial floors. It needs only a 650 mm corridor and stands 619 mm tall with its LiDAR.',
    points: ['Four jobs in one machine: sweep, vacuum, scrub and dust-mop', 'Passes through a 650 mm corridor', 'An optional dock charges it and refills and drains the water'],
    basis: 'A commercial floor machine: Gausium\'s site lists hotels and retail centres, and its page names no outdoor use.',
  },
  cc1pro: {
    brand: 'PUDU', tab: 'CC1 Pro',
    env: ['indoor'], category: 'floor', kind: 'Floor cleaning robot',
    line: 'AI-powered 4-in-1 cleaner that checks the floor it just cleaned and goes back for missed stains.',
    where: 'Indoor commercial floors, from 700 to 1,000 m² an hour. A rear camera looks at the floor behind it, so a missed stain is cleaned again on the same run.',
    points: ['Four cleaning jobs in one machine', '15 L clean and 15 L dirty water, 5 h of scrubbing', 'Charges and refills water on its station'],
    basis: 'A commercial floor machine: PUDU\'s page names no outdoor use (its outdoor model here is the MT1 Max).',
  },
  omnie: {
    brand: 'Gausium', tab: 'Omnie',
    env: ['indoor'], category: 'floor', kind: 'Floor cleaning robot',
    line: 'AI-powered scrubber for busy, changing places.',
    where: 'Indoor floors that people and furniture keep changing. Dual roller brushes and side brushes clean 780 mm wide, and it scrubs about 2,000 m² an hour.',
    points: ['Scrubs and sweeps with dual roller brushes and side brushes', '33 L clean and 24 L waste water', '3D and 2D LiDAR, depth and RGB cameras'],
    basis: 'A commercial floor machine: Gausium\'s site lists hotels and retail centres, and its page names no outdoor use.',
  },
  marvel: {
    brand: 'Gausium', tab: 'Marvel',
    env: ['indoor'], category: 'floor', kind: 'Floor cleaning robot',
    line: 'Large scrubber-sweeper for big, complex spaces.',
    where: 'Large indoor sites: Gausium recommends it for more than 3,000 m², such as supermarkets, factories, warehouses, airports and shopping malls.',
    points: ['Sweeps and scrubs in one pass', '80 L clean and 70 L waste water, 13 h or more of mopping', 'Two front side brushes and a self-cleaning waste tank'],
    basis: 'Gausium lists indoor sites for it (supermarkets, factories, warehouses, airports, malls).',
  },
  mt1: {
    brand: 'PUDU', tab: 'MT1',
    env: ['indoor'], category: 'floor', kind: 'Robotic sweeper',
    line: 'AI-powered robotic sweeper with dual disc brushes and a 35 L bin.',
    where: 'Large indoor sites such as car parks, warehouses and factories. The disc brushes take leaves and bottles as well as dust, and it sweeps 1,800 m² an hour.',
    points: ['Dual disc brushes for large and small debris', '35 L bin, 4 to 8 h of running', 'AI trash recognition, VSLAM, marker and LiDAR navigation'],
    basis: 'PUDU lists car parks, warehouses and factories and gives it no weather rating; its outdoor model here is the MT1 Max.',
  },
  mt1max: {
    brand: 'PUDU', tab: 'MT1 Max',
    env: ['indoor', 'outdoor'], category: 'floor', kind: 'Robotic sweeper',
    line: 'AI-powered robotic sweeper with 3D perception for large, complex sites.',
    where: 'Indoor, outdoor and semi-outdoor sites. PUDU calls it an outdoor and semi-outdoor sweeper: IP54 sealing, a 3D LiDAR and a 1.2 m warning light, and it should not work in extreme weather.',
    points: ['3D LiDAR perception for large, open sites', 'IP54 sealing against dust and water spray', '35 L bin and 5 to 10 h of running'],
    basis: 'PUDU titles it an outdoor and semi-outdoor 3D-perception sweeper.',
  },

  // ───────────── Facade cleaning ─────────────
  'xh-k3': {
    brand: 'X-Human', tab: 'K3',
    env: ['outdoor'], category: 'facade', kind: 'High altitude',
    line: 'Facade cleaning robot for high-rise flat glass and curtain walls.',
    where: 'Outdoor, on the glass and curtain walls of tall buildings: offices, hotels, shopping malls, car showrooms, railway stations and airports. X-Human lists 720 m² an hour, about 3 hours a charge and a working height of up to 600 m.',
    points: ['Cleans high-rise facades without rope access crews', 'Works without external water pipes, gas lines or power supply', 'Cleaning speed cited at over 3x manual cleaning'],
    basis: 'It works on the outside of a building.',
  },
  'xh-j1': {
    brand: 'X-Human', tab: 'J1',
    env: ['outdoor'], category: 'facade', kind: 'Low altitude',
    line: 'Low-rise facade cleaning robot for mid-height buildings.',
    where: 'Outdoor, on the glass curtain walls of mid-height buildings, podiums, retail frontages and lower floors. X-Human lists 432 m² an hour, up to 8 hours a charge and a working height of up to 30 m.',
    points: ['Built for low-rise building facades', 'Reduces work-at-height risk for cleaning crews', 'Suits podiums, retail frontages and lower floors'],
    basis: 'It works on the outside of a building.',
  },

  // ───────────── Solar panel cleaning ─────────────
  'xh-g2': {
    brand: 'X-Human', tab: 'G2',
    env: ['outdoor'], category: 'solar', kind: 'Solar panel cleaning robot',
    line: 'Photovoltaic panel cleaning robot.',
    where: 'Outdoor, on distributed solar arrays such as commercial rooftops (X-Human sells its G1 for centralised solar farms). It lists 1,000 m² an hour, up to 8 hours a charge and 40 kg, and sells its solar robots with IP65 sealing.',
    points: ['Keeps panels clean to protect energy output', 'Cuts the need for people on roofs and arrays', 'Part of the X-Human Lingguang PV series'],
    basis: 'It works on photovoltaic panels in the open, and X-Human lists it for distributed solar.',
  },

  // ───────────── Duct cleaning · Air ─────────────
  'kt-976': {
    brand: 'Kuaitong', tab: 'KT 976',
    env: ['indoor'], category: 'duct-air', kind: 'AC vent and duct cleaner',
    line: 'Duct cleaning robot for air conditioning ducts.',
    where: 'Indoor, inside air-conditioning and ventilation ducts 250 to 800 mm across. It brushes and vacuums at the same time, and front and rear 1080P cameras show the duct on a 10-inch screen.',
    points: ['Goes inside the duct so ceilings stay closed', 'Rotating brush loosens dust from duct walls', 'Camera lets the operator see the duct as it cleans'],
    basis: 'It works inside a building\'s ducts.',
  },
  'rj-q38': {
    brand: 'RJ Bots', tab: 'Q38',
    env: ['indoor'], category: 'duct-air', kind: 'Air duct cleaning robot',
    line: 'Rotating nylon brush duct cleaner for AC vents and ducts.',
    where: 'Indoor, in ventilation ducts 200 to 750 mm across: shopping malls, office towers, hotels, hospitals, schools, factories, airports and stations. RJ-Bot lists five brush set-ups and three HD cameras.',
    points: ['Rotating nylon brush cleans duct surfaces', 'Suited to AC vents and ventilation ducts', 'Operated remotely with a camera view'],
    basis: 'It works inside a building\'s ducts.',
  },
  'rj-q40': {
    brand: 'RJ Bots', tab: 'Q40',
    env: ['indoor'], category: 'duct-air', kind: 'Air duct cleaning robot',
    line: 'Rotating nylon brush duct cleaner for AC vents and ducts.',
    where: 'Indoor, in ducts 25 to 75 cm across, and on the floors of the same building: a telescopic arm for the duct, a rotating scrubber with water spray for the floor.',
    points: ['Rotating nylon brush cleans duct surfaces', 'Larger duct coverage than the Q38 class', 'Operated remotely with a camera view'],
    basis: 'It works inside a building\'s ducts and on its floors.',
  },
  'rj-q50': {
    brand: 'RJ Bots', tab: 'Q50',
    env: ['indoor'], category: 'duct-air', kind: 'Air duct cleaning robot',
    line: 'Rotating nylon brush duct cleaner for larger AC ducts.',
    where: 'Indoor, in large air ducts 400 to 1,200 mm across in factories, supermarkets, schools, hospitals, subways and airports. It reaches 60 m along a run and carries a 6 MP and two 5 MP cameras.',
    points: ['Rotating nylon brush cleans duct surfaces', 'Aimed at larger air ducts and main runs', 'Operated remotely with a camera view'],
    basis: 'It works inside a building\'s ducts.',
  },

  // ───────────── Duct cleaning · Grease ─────────────
  'rj-g31': {
    brand: 'RJ Bots', tab: 'G-31',
    env: ['indoor'], category: 'duct-grease', kind: 'Exhaust duct cleaning',
    line: 'Grease exhaust duct cleaning robot for kitchen extraction.',
    where: 'Indoor, in commercial kitchen exhaust ducts 280 mm and wider: school canteens, hotel kitchens, factory canteens and government sites. Magnetic wheels let it climb vertical metal ducts.',
    points: ['Removes grease build-up inside exhaust ducts', 'Lowers fire risk from grease deposits', 'Compact body for smaller exhaust ducts'],
    basis: 'It works inside kitchen exhaust ducts.',
  },

  // ───────────── Duct cleaning · Sewer ─────────────
  'rj-k20': {
    brand: 'RJ Bots', tab: 'K20',
    env: ['outdoor'], category: 'duct-sewer', kind: 'Sewer pipeline inspection',
    line: 'Crawler robot for sewer and drain pipeline inspection.',
    where: 'Outdoor and underground: municipal sewers, industrial pipelines and rainwater drains, DN200 to DN2000, on 100 m of cable. IP68 crawler with front and rear 5 MP cameras.',
    points: ['Camera inspection of sewer and drain lines', 'Records pipe condition for reports', 'Avoids sending people into confined spaces'],
    basis: 'Sewers and drains are infrastructure outside the building, mostly underground.',
  },

  // ───────────── Inspection robots ─────────────
  go2: {
    brand: 'Unitree', tab: 'Go2',
    env: ['indoor', 'outdoor'], category: 'inspection', kind: 'Inspection robot',
    line: 'Legged inspection robot for plant rooms, shafts and roofs.',
    where: 'Indoor and outdoor: plant rooms and shafts inside the building, roofs outside. A four-legged robot of about 15 kg that walks stairs and uneven ground and carries a 4D LiDAR that maps what it passes.',
    points: ['Carries cameras along a set inspection route', 'Walks stairs and uneven ground', 'Collects the same readings on every round'],
    basis: 'The deck places it in plant rooms and shafts (indoor) and on roofs (outdoor).',
  },

  // ───────────── Security patrolling ─────────────
  'smp-s5': {
    brand: 'SMP Robotics', tab: 'S5 PTZ',
    env: ['outdoor'], category: 'security', kind: 'Security patrol robot',
    line: 'Outdoor security patrol robot with pan-tilt-zoom camera.',
    where: 'Outdoor, on large sites: SMP made it part of the security system of large-area facilities. It patrols in rain, snow and wind from -20 to +45 °C and runs about 12 hours between charges.',
    points: ['Live video from the patrol route', 'Covers perimeters, gates and yards', 'Alerts the control room so a person can act'],
    basis: 'SMP describes it as an outdoor robot for all weather.',
  },
  'nws-guard-r': {
    brand: 'NWS', tab: 'Guard R',
    env: ['indoor', 'outdoor'], category: 'security', kind: 'Security patrol robot',
    line: 'Autonomous security guard robot.',
    where: 'Indoor and outdoor: NWS lists airports, logistics centres, trade fairs and shopping centres, and says it copes with asphalt, gravel and rough ground. The chassis is IP22 (not rain-proof) and the sensor modules IP54.',
    points: ['Patrols set routes without a night shift', 'Streams video to the control room', 'Flags people or objects that should not be there'],
    basis: 'NWS says it is built for indoor and outdoor use.',
  },

  // ───────────── Patrolling robots ─────────────
  'smp-s52': {
    brand: 'SMP Robotics', tab: 'S5.2 PTZ',
    env: ['outdoor'], category: 'patrol', kind: 'Patrol robot',
    line: 'Patrol robot with pan-tilt-zoom camera.',
    where: 'Outdoor: SMP calls the S5.2 series an outdoor security robot, IP65 sealed, for -25 to +45 °C and up to 18 hours of patrol on one charge.',
    points: ['Walks the same route at set times', 'Records site conditions and flags anything unusual', 'Sends live video to the control room'],
    basis: 'SMP calls it an outdoor security robot.',
  },
};

export const profileOf = (id) => PROFILES[id];
export const isBoth = (p) => p.env.length > 1;
export const envLabel = (p) => (isBoth(p) ? 'Indoor + outdoor' : ENVIRONMENTS[p.env[0]].label);
export const inEnv = (p, env) => env === 'all' || p.env.includes(env);

/** The robots of `ids` that work in `env` ('all', 'indoor' or 'outdoor'), grouped by category in order. */
export function grouped(ids, env = 'all') {
  const out = [];
  for (const c of CATEGORY_ORDER) {
    const robots = ids.filter((id) => PROFILES[id] && PROFILES[id].category === c && inEnv(PROFILES[id], env));
    if (robots.length) out.push({ category: c, robots });
  }
  return out;
}

/** How many robots work in each environment. */
export function counts(ids) {
  const n = { all: 0, indoor: 0, outdoor: 0 };
  for (const id of ids) {
    const p = PROFILES[id];
    if (!p) continue;
    n.all++;
    for (const e of p.env) n[e]++;
  }
  return n;
}
