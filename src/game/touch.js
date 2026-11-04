// On-screen controls for race mode on phones, tablets and small windows: steer left and right on the
// left thumb, accelerator and brake on the right, with drift and dust buttons above the pedals.
// Every button tracks its own finger, so steering and the accelerator can be held at once. The state
// is read by input.js alongside the keys.
export const pad = { throttle: 0, brake: 0, hand: 0, left: 0, right: 0, pick: 0 };

/** Should the touch controls show? Touch screens, and any window too narrow for the key hints. */
export const wantsTouch = () => typeof matchMedia !== 'undefined' && (matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 900px)').matches);

const ICON = {
  left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
};

/** Build the controls into `root` and start listening. Returns a function that removes them. */
export function attachTouch(root) {
  const el = document.createElement('div');
  el.className = 'g-touch';
  el.setAttribute('aria-hidden', 'true'); // the keys do the same job for keyboard and screen-reader users
  el.innerHTML = `
    <div class="g-steer"><button data-k="left" class="g-tb round">${ICON.left}</button><button data-k="right" class="g-tb round">${ICON.right}</button></div>
    <div class="g-pedals">
      <div class="g-extra"><button data-k="hand" class="g-tb small">Drift</button><button data-k="pick" class="g-tb small">Dust</button></div>
      <button data-k="brake" class="g-tb pedal brake">Brake</button>
      <button data-k="throttle" class="g-tb pedal gas">Go</button>
    </div>`;
  root.appendChild(el);
  const held = new Map(); // pointer id -> key
  const set = (k, v) => { pad[k] = v; el.querySelector(`[data-k="${k}"]`)?.classList.toggle('on', !!v); };
  const recount = () => { for (const k of Object.keys(pad)) set(k, [...held.values()].includes(k) ? 1 : 0); };
  const down = (e) => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    e.preventDefault();
    b.setPointerCapture?.(e.pointerId);
    held.set(e.pointerId, b.dataset.k); recount();
    navigator.vibrate?.(8);
  };
  const up = (e) => { if (held.delete(e.pointerId)) recount(); };
  el.addEventListener('pointerdown', down);
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(t, up);
  el.addEventListener('contextmenu', (e) => e.preventDefault()); // a long press must not open a menu
  return () => { held.clear(); recount(); el.remove(); };
}

/** Ask for the whole screen in landscape (phones allow it only from a tap). Quietly does nothing where it is not supported. */
export async function goLandscape() {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await screen.orientation?.lock?.('landscape');
  } catch { /* iPhone and desktop browsers say no: the page turns itself instead (see the .rot class) */ }
}
export function leaveFullscreen() { try { if (document.fullscreenElement) document.exitFullscreen(); } catch { /* not in full screen */ } }
