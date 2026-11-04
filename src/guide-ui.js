// Guides in the viewer: troubleshooting and maintenance, step by step on the 3D robot. The left panel
// lists the guides for the open robot; choosing one replaces the details panel with a step card, and
// each step makes its parts glow, opens the robot as far as needed, tips it back and slides parts out.
// It plays itself like a silent video, one line of text per step over the picture; Back, Next and Pause
// take over. The steps are in data/guides.js.
import { KINDS, GUIDE_SOURCE, guidesFor } from './data/guides.js';

// how long a step stays on screen while the guide plays itself: time to move, then time to read
const stepTime = (s) => 3200 + s.text.split(/\s+/).length * 300;

export function initGuides({ stage, app, $, esc, getDef, onChange, onPick }) {
  const box = $('#guide-list');
  const robotId = () => app.dataset.robot;
  let guide = null, step = 0, playing = false, timer = 0;
  const cap = $('#guide-cap');

  function buildList() {
    const list = guidesFor(robotId());
    let html = '';
    for (const [k, kind] of Object.entries(KINDS)) {
      const gs = list.filter((g) => g.kind === k);
      if (!gs.length) continue;
      html += `<li class="gd-cat" style="--c:${kind.color}"><i></i>${esc(kind.label)}</li>`;
      html += gs.map((g) => `<li><button class="gd-item${guide === g ? ' on' : ''}" type="button" data-g="${g.id}" aria-pressed="${guide === g}" style="--c:${kind.color}"><b>${esc(g.title)}</b><small>${g.steps.length} steps</small></button></li>`).join('');
    }
    box.innerHTML = html || `<li class="gd-none">No guides for the ${esc(getDef().short)} yet.</li>`;
    $('#guide-count').textContent = list.length || '';
  }
  box.addEventListener('click', (e) => {
    const b = e.target.closest('.gd-item');
    if (b) choose(guide?.id === b.dataset.g ? null : b.dataset.g);
  });

  function choose(id) {
    const had = !!guide;
    guide = id ? guidesFor(robotId()).find((g) => g.id === id) || null : null;
    step = 0;
    stop();
    if (guide) onPick?.(); // an interruption that is on gives way to the guide
    if (stage.selected) stage.select(null);
    buildList();
    if (had && !guide) stage.setAlert(null); // the guide's glow goes with it
    apply();
    if (guide) { stage.cam.az = 0.75; stage.cam.el = 0.32; stage.userZoom = 1; play(); } // from the front right, so the underside shows when it tips back; it plays on its own
    if (guide && matchMedia('(max-width: 860px)').matches) $('#left').classList.remove('open');
    onChange(!!guide);
  }

  /** Put the robot in this step's state: glow, how far it is open, what is slid out. */
  function apply() {
    if (!guide) { stage.setPull(null); stage.setGuideFx(null); cap.hidden = true; return; }
    const s = guide.steps[step], color = KINDS[guide.kind].color;
    stage.setGuideFx({ tilt: s.tilt || 0, debris: s.debris || 0 });
    cap.hidden = false;
    cap.style.setProperty('--c', color);
    cap.innerHTML = `<small class="mono">${esc(guide.title)} · step ${step + 1} of ${guide.steps.length}</small><b>${esc(s.text)}</b>`;
    stage.setAlert({ main: s.main, rel: s.rel || [], color, wide: true }, { reveal: false });
    stage.setExplode(s.open || 0);
    $('#explode').value = s.open || 0;
    stage.setPull(s.pull || null);
  }

  // playing: each step waits its time, then the next; the last one stays
  function play() { playing = true; schedule(); refreshPlay(); }
  function stop() { playing = false; clearTimeout(timer); refreshPlay(); }
  function schedule() {
    clearTimeout(timer);
    if (!playing || !guide) return;
    if (step >= guide.steps.length - 1) { timer = setTimeout(stop, stepTime(guide.steps[step])); return; }
    timer = setTimeout(() => { go(step + 1, true); }, stepTime(guide.steps[step]));
  }
  function refreshPlay() {
    const b = document.querySelector('#gd-play'); if (!b) return;
    b.textContent = playing ? 'Pause' : step === guide?.steps.length - 1 ? 'Play again' : 'Play';
    b.setAttribute('aria-pressed', String(playing));
  }

  function go(i, auto = false) {
    if (!guide) return;
    if (!auto) stop();
    step = Math.max(0, Math.min(guide.steps.length - 1, i));
    apply();
    const root = $('#detail');
    renderCard(root);
    if (!auto) root.querySelector('#gd-next')?.focus({ preventScroll: true });
    schedule();
  }

  /** The step card for the details panel; false when no guide is open. */
  function renderCard(root) {
    if (!guide) return false;
    const kind = KINDS[guide.kind], s = guide.steps[step], n = guide.steps.length, def = getDef();
    const name = (id) => def.parts.find((p) => p.id === id)?.name || id;
    root.innerHTML = `<button class="link d-back" id="gd-off" type="button">← ${esc(def.short)} overview</button>
      <div class="d-kicker" style="--c:${kind.color}"><i></i>${esc(kind.label)}</div>
      <h2 class="d-title">${esc(guide.title)}</h2>
      <dl class="gd-when"><dt>When</dt><dd>${esc(guide.sign)}</dd><dt>Why</dt><dd>${esc(guide.cause)}</dd></dl>
      <div class="gd-step" style="--c:${kind.color}" aria-live="polite">
        <div class="gd-count"><span class="mono">Step ${step + 1} of ${n}</span><span class="gd-dots" aria-hidden="true">${guide.steps.map((_, i) => `<i class="${i === step ? 'on' : i < step ? 'done' : ''}"></i>`).join('')}</span></div>
        <p class="gd-text">${esc(s.text)}</p>
        <p class="gd-parts">${s.main.map((id) => `<button class="ic-part" type="button" data-id="${id}" style="--c:${kind.color}"><i></i>${esc(name(id))}</button>`).join('')}</p>
        <div class="d-nav"><button class="btn" id="gd-prev" type="button"${step === 0 ? ' disabled' : ''}>← Back</button><button class="btn" id="gd-play" type="button" aria-pressed="false">Play</button><button class="btn primary" id="gd-next" type="button">${step === n - 1 ? 'Done' : 'Next →'}</button></div>
      </div>
      <details class="more d-sec"><summary>All ${n} steps</summary><ol class="gd-all">${guide.steps.map((x, i) => `<li><button type="button" data-i="${i}" class="${i === step ? 'on' : ''}">${esc(x.text)}</button></li>`).join('')}</ol></details>
      <div class="honest">${esc(GUIDE_SOURCE)}</div>`;
    root.querySelector('#gd-off').onclick = () => choose(null);
    root.querySelector('#gd-prev').onclick = () => go(step - 1);
    root.querySelector('#gd-play').onclick = () => { if (playing) stop(); else { if (step === n - 1) go(0, true); play(); } };
    root.querySelector('#gd-next').onclick = () => (step === n - 1 ? choose(null) : go(step + 1));
    root.querySelectorAll('.gd-all button').forEach((b) => { b.onclick = () => go(+b.dataset.i); });
    root.querySelectorAll('.gd-parts .ic-part').forEach((b) => { b.onclick = () => stage.select(b.dataset.id); });
    root.scrollTop = 0;
    refreshPlay();
    return true;
  }

  // the arrow keys step through a guide while it is open
  addEventListener('keydown', (e) => {
    if (!guide || e.target.closest?.('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') { go(step + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { go(step - 1); e.preventDefault(); }
  });

  /** Close the guide without touching the glow (another feature is taking over the stage). */
  function release() { if (!guide) return; stop(); guide = null; step = 0; stage.setPull(null); stage.setGuideFx(null); cap.hidden = true; buildList(); }

  function onRobot() {
    if (guide && guide.robot !== robotId()) { stop(); guide = null; step = 0; }
    buildList();
    if (guide) apply(); else { stage.setPull(null); stage.setGuideFx(null); cap.hidden = true; }
  }

  return { active: () => guide, renderCard, release, clear: () => choose(null), onRobot };
}
