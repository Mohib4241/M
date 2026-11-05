// Part groups, confidence levels and the research sources behind the numbers.

// `color` is for the dark hologram look, `studio` for the light studio look.
export const GROUPS = {
  shell: { label: 'Shell & covers', color: '#cfe0ee', studio: '#5f7183' },
  ui:    { label: 'Controls',        color: '#ffd166', studio: '#b97d00' },
  clean: { label: 'Cleaning head',   color: '#5cf0b4', studio: '#0f9d6e' },
  water: { label: 'Water system',    color: '#4cc9f0', studio: '#1b84c4' },
  air:   { label: 'Air & debris',    color: '#ff9f68', studio: '#d0581f' },
  power: { label: 'Power & brain',   color: '#f6e05e', studio: '#a58500' },
  drive: { label: 'Drive & frame',   color: '#b79cff', studio: '#7254d0' },
  sense: { label: 'Sensing',         color: '#ff6b8b', studio: '#cf2f58' },
  dock:  { label: 'Docking station', color: '#7ff0b0', studio: '#2a9d62' },
};

// How well-sourced a part's data is. Shapes and positions are always schematic.
export const CONF = {
  confirmed: { label: 'Published spec', level: 3, note: 'Name and key numbers appear in spec sheets or manuals.' },
  named:     { label: 'Named in catalog', level: 2, note: 'The part is named in manuals or parts lists; size and position are schematic.' },
  inferred:  { label: 'Inferred', level: 1, note: 'Standard for this class of machine; not itemised in the sources reached.' },
};

export const SOURCES = {
  'photos':    { t: 'Photographs of a Phantas with its dock and of a CC1 Pro, supplied for this project', u: '' },
  'gs-spec':   { t: 'Gausium: Phantas specifications', u: 'https://gausium.com/specs/phantas/' },
  'taski':     { t: 'TASKI Phantas product sheet (Diversey)', u: 'https://taski.com/wp-content/uploads/2024/11/PSS-TASKI_Phantas.pdf' },
  'gs-manual': { t: 'Phantas S1 PRO user manual V1.1', u: 'https://innovi.nl/wp-content/uploads/2025/07/Phantas-User-Manual-EN-V1.1-20240621-.pdf.pdf' },
  'gs-dock':   { t: 'Gausium CD-04 charging dock for Phantas', u: 'https://gausium.com/wp-content/uploads/2022/10/CD-04-Charging-Dock-for-Phantas.pdf' },
  'softbank':  { t: 'SoftBank Robotics US: Phantas consumables', u: 'https://us-store.softbankrobotics.com/collections/phantas-consumables' },
  'okm':       { t: 'OKMbot: Gausium Phantas', u: 'https://okmbot.de/en/products/gausium-phantas/' },
  'rl-ph':     { t: 'RobotLAB: Gausium Phantas', u: 'https://www.robotlab.com/store/gausium-phantas' },
  'gs-news':   { t: 'Gausium at Interclean Amsterdam 2024', u: 'https://gausium.com/news/gausium-unveiled-groundbreaking-innovations-at-interclean-amsterdam-2024/' },
  'leo':       { t: 'Leobotics: Phantas comparison', u: 'https://en.leobotics.com/comparateur-robot/robot-nettoyage-professionnel-phantas-gausium' },
  'gs-nz':     { t: 'Gausium NZ: Phantas', u: 'https://gausium.co.nz/products/phantas-commercial-robot-floor-cleaner/' },
  'anton-gs':  { t: 'Anton Robots: Gausium Phantas review', u: 'https://antonrobots.com/gausium-phantas-review/' },
  'sonny':     { t: 'Sonny Robotics: Gausium Phantas', u: 'https://sonnyrobotics.com/products/gausium-phantas' },
  'award':     { t: 'CleanLink: Gausium celebrates design award win', u: 'https://www.cleanlink.com/news/article/Gausium-Celebrates-Design-Award-Win--28670' },
  'pd-guide':  { t: 'PUDU CC1 Operation Guide V6', u: 'https://academy.pudutech.com/en/docs/PUDU-CC1-Operation-Guide-V6' },
  'pd-cmp':    { t: 'PUDU CC1 version comparison (PDF)', u: 'https://cdn.robotshop.com/media/P/Pud/RB-Pud-40/pdf/cc1-version-comparison.pdf' },
  'pd-site':   { t: 'PUDU Robotics: CC1 Pro', u: 'https://www.pudurobotics.com/en/products/cc1-pro' },
  'pbtech':    { t: 'PB Tech: CC1 Pro listing', u: 'https://www.pbtech.co.nz/product/ROBPDUCC007/Pudu-CC1-Pro---Green-AI-Powered-Autonomous-Cleanin' },
  'hh':        { t: 'Hospitality Hub: CC1 Pro', u: 'https://www.hospitalityhub.com.au/cc1-pro-ai-powered-4-in-1-cleaning-robot/p/287676' },
  'rl-pd':     { t: 'RobotLAB: PUDU CC1 Pro', u: 'https://www.robotlab.com/store/pudu-cc1-pro-robot/' },
  'homery':    { t: 'Homery: CC1 Pro listing', u: 'https://www.homery.com/product/pudu-10110000039' },
  'anton':     { t: 'Anton Robots: CC1 Pro review', u: 'https://antonrobots.com/pudu-cc1-pro-review/' },
  'gs-omnie-img': { t: 'Gausium: Omnie product pictures (specification page and a distributor sheet)', u: 'https://gausium.com/specs/omnie/' },
  'gs-omnie':  { t: 'Gausium: Omnie specifications', u: 'https://gausium.com/specs/omnie/' },
  'gs-omnie-br': { t: 'Gausium: Omnie brochure (EN, 2025-11-14)', u: 'https://gausium.com/wp-content/uploads/2024/12/EN_Brochure_OMNIE_251114.pdf' },
  'zx-omnie':  { t: 'Zetrix: Omnie product sheet (Robotic Solutions Catalogue 2026)', u: 'https://www.zetrix.com/wp-content/uploads/2026/02/Omnie.pdf' },
  'gs-marvel-img': { t: 'Gausium: Marvel product picture (specification page)', u: 'https://gausium.com/specs/marvel/' },
  'gs-marvel': { t: 'Gausium: Marvel specifications', u: 'https://gausium.com/specs/marvel/' },
  'gs-marvel-br': { t: 'Gausium: Marvel brochure (EN, 2026-09-22)', u: 'https://gausium.com/wp-content/uploads/2026/04/Brochure_Marvel_260922.pdf' },
  'pd-mt1':    { t: 'PUDU Robotics: MT1 AI-powered robotic sweeper', u: 'https://www.pudurobotics.com/products/mt1' },
  'pd-mt1-ppt': { t: 'PUDU MT1 product introduction (EN, 2025-05-08)', u: 'https://www.czapnik.co.il/wp-content/uploads/2026/08/PUDU-MT1-Product-Intro.-PPT-EN20250508-1.pdf' },
  'rs-mt1':    { t: 'RobotShop: PUDU MT1 robotic sweeper and vacuum', u: 'https://www.robotshop.com/products/pudu-mt1-robotic-sweeper-vacuum' },
  'hh-mt1':    { t: 'Hospitality Hub: PUDU MT1 AI-powered robotic sweeper', u: 'https://img0.hospitalityhub.com.au/pudu-mt1-ai-powered-robotic-sweeper/p/280813' },
  'mbs-mt1':   { t: 'MyBotShop: PUDU MT1', u: 'https://www.mybotshop.de/Pudu-MT1_1' },
  'rl-mt1max': { t: 'RobotLAB: PUDU MT1 Max', u: 'https://www.robotlab.com/store/pudu-mt1-max/' },
  'rs-mt1max': { t: 'RobotShop: PUDU MT1 Max robotic sweeper', u: 'https://www.robotshop.com/products/pudu-mt1-max-robotic-sweeper' },
  'as-mt1max': { t: 'American Satellite: PUDU MT1 Max (10252-000003)', u: 'https://www.americansatellite.com/PUDU-MT1-Max-Al-powered-3D-Perception-Robotic-Sweeper.htm' },
  'pd-mt1max-pr': { t: 'PUDU launch release: MT1 Max AI-powered 3D perception robotic sweeper', u: 'https://newequipment.com/home/product/55311414/pudu-robotics-us-pudu-mt1-max-robotic-sweeper-adds-3d-perception-for-large-environments' },
  'pd-mt1-manual': { t: 'PUDU MT1 user manual (multilanguage)', u: 'https://resource-wangsu.helplook.net/docker_production/nqpdhq/article/2ByanRUk/attachments/PUDU_MT1_User_Manual-multilanguage.pdf' },
};
