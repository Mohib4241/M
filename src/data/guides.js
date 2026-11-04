// Step-by-step guides on the 3D robot: troubleshooting (something has gone wrong) and maintenance
// (routine care), shown as a silent animation with one short line of text per step. Each step makes
// its parts glow, opens the robot as far as `open` says (0 closed, 1 fully apart), can slide a part
// out (`pull`, in the robot's own units), tip the robot back (`tilt`, 0 to 1) and show the jammed
// debris (`debris`: 1 in the channel, 2 pulled out).
//
// Where the steps come from: a video filmed on site with a Phantas tipped back to show its underside
// (4 November 2026). It shows the side cover opened, the roller brush slid out, and the debris that
// jams the channel in front of the debris tray. The maker's manual could not be checked here, so the
// cards say so; nothing below is taken from anywhere else. The video itself is not used in the page.

export const KINDS = {
  trouble: { label: 'Troubleshooting', color: '#e5484d' },
  care: { label: 'Maintenance', color: '#2f7df6' },
};

export const GUIDE_SOURCE = 'Steps follow what was done on site (4 November 2026). Check them against the robot\'s user manual before training on them.';

const SLIDE = [4.6, 0, 0]; // the roller brush slides out sideways, along its own axis

export const GUIDES = [
  {
    id: 'tray-stuck', kind: 'trouble', robot: 'phantas',
    title: 'Debris tray stuck',
    sign: 'Litter is left behind on the floor, or the debris tray will not slide out.',
    cause: 'Debris such as a plastic strip or wrapper wedges in the channel behind the front roller brush, in front of the debris tray.',
    steps: [
      { text: 'Stop the robot and press the emergency stop before you touch anything underneath.', main: ['e-stop'], open: 0 },
      { text: 'Tip the robot back onto a clean floor so the underside faces you.', main: ['brush-deck'], open: 0, tilt: 1 },
      { text: 'Open the cover at the side of the brush deck.', main: ['brush-deck'], rel: ['front-roller'], open: 0, tilt: 1 },
      { text: 'Slide the front roller brush out sideways.', main: ['front-roller'], open: 0, tilt: 1, pull: { 'front-roller': SLIDE } },
      { text: 'Look in the channel behind the brush. This is where the debris jams the tray.', main: ['brush-deck'], rel: ['front-roller', 'trash-can'], open: 0, tilt: 1, debris: 1, pull: { 'front-roller': SLIDE } },
      { text: 'Pull the debris out with a pen or a thin tool. Keep your fingers clear of the edges.', main: ['brush-deck'], rel: ['front-roller', 'trash-can'], open: 0, tilt: 1, debris: 2, pull: { 'front-roller': SLIDE } },
      { text: 'Empty the debris tray, slide the brush back in and close the cover.', main: ['trash-can', 'front-roller'], open: 0, tilt: 1, pull: { 'trash-can': [0, 1.8, 0] } },
      { text: 'Stand the robot up, release the emergency stop and run a short test.', main: ['e-stop'], open: 0 },
    ],
  },
  {
    id: 'change-brush', kind: 'care', robot: 'phantas',
    title: 'Change the roller brush',
    sign: 'The brush is worn, bent or wrapped with hair that will not come off.',
    cause: 'Routine care. The front and rear roller brushes are sold as consumables.',
    steps: [
      { text: 'Stop the robot and press the emergency stop.', main: ['e-stop'], open: 0 },
      { text: 'Tip the robot back onto a clean floor so the underside faces you.', main: ['brush-deck'], rel: ['front-roller', 'rear-roller'], open: 0, tilt: 1 },
      { text: 'Open the cover at the side of the brush deck.', main: ['brush-deck'], rel: ['front-roller'], open: 0, tilt: 1 },
      { text: 'Hold the end of the brush and slide it straight out sideways.', main: ['front-roller'], open: 0, tilt: 1, pull: { 'front-roller': SLIDE } },
      { text: 'Wipe out the brush bay and clear any debris from the channel.', main: ['brush-deck'], rel: ['front-roller'], open: 0, tilt: 1, pull: { 'front-roller': SLIDE } },
      { text: 'Slide the new brush in the same way round until it sits fully home.', main: ['front-roller'], open: 0, tilt: 1 },
      { text: 'Close the cover, stand the robot up and release the emergency stop.', main: ['brush-deck'], rel: ['e-stop'], open: 0 },
      { text: 'Run a short test and listen for the brush turning freely.', main: ['front-roller'], open: 0 },
    ],
  },
];

export const guidesFor = (robotId) => GUIDES.filter((g) => g.robot === robotId);
