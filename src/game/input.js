// Keyboard controls for the race. Uses physical key codes, so the keys sit in the same place on
// any layout. Arrow keys work as well as W A S D.
import { pad } from './touch.js';

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
  // the keys and the on-screen buttons (touch.js) together
  return {
    throttle: held('KeyW', 'ArrowUp') || pad.throttle,
    brake: held('KeyS', 'ArrowDown') || pad.brake, // S is the front brake
    hand: held('Space') || pad.hand, // drift brake
    steer: Math.max(held('KeyA', 'ArrowLeft'), pad.left) - Math.max(held('KeyD', 'ArrowRight'), pad.right), // +1 is left
    pick: held('ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'MetaLeft', 'MetaRight') || pad.pick,
  };
}
