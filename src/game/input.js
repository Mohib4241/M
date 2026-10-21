// Keyboard controls for the race. Uses physical key codes, so the keys sit in the same place on
// any layout. Arrow keys work as well as W A S D.
const down = new Set();

const onDown = (e) => {
  if (!CONTROL_KEYS.has(e.code)) return;
  down.add(e.code);
  // stop the page scrolling on Space and the arrows, but let a focused button take Space as a click
  if (document.activeElement?.tagName !== 'BUTTON') e.preventDefault();
};
const onUp = (e) => { down.delete(e.code); };
const onBlur = () => down.clear();
const CONTROL_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
  'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'MetaLeft', 'MetaRight',
]);

/** Start listening. Returns a function that stops listening and clears the keys. */
export function attachKeys() {
  addEventListener('keydown', onDown);
  addEventListener('keyup', onUp);
  addEventListener('blur', onBlur);
  return () => {
    removeEventListener('keydown', onDown);
    removeEventListener('keyup', onUp);
    removeEventListener('blur', onBlur);
    down.clear();
  };
}

/** The race input for this moment, read from the keys that are held. */
export function readInput() {
  const held = (...codes) => (codes.some((c) => down.has(c)) ? 1 : 0);
  return {
    throttle: held('KeyW', 'ArrowUp'),
    brake: held('KeyS', 'ArrowDown'), // S is the front brake
    hand: held('Space'), // drift brake
    steer: held('KeyA', 'ArrowLeft') - held('KeyD', 'ArrowRight'), // +1 is left
    pick: held('ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'MetaLeft', 'MetaRight'),
  };
}
