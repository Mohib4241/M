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
};

// How well-sourced a part's data is. Shapes and positions are always schematic.
export const CONF = {
  confirmed: { label: 'Published spec', level: 3, note: 'Name and key numbers appear in spec sheets or manuals.' },
  named:     { label: 'Named in catalog', level: 2, note: 'The part is named in manuals or parts lists; size and position are schematic.' },
  inferred:  { label: 'Inferred', level: 1, note: 'Standard for this class of machine; not itemised in the sources reached.' },
};

export const SOURCES = {
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
};
