// Guides in the viewer: troubleshooting and maintenance, step by step on the 3D robot. The left panel
// lists the guides for the open robot; choosing one replaces the details panel with a step card, and
// each step makes its parts glow, opens the robot as far as needed and slides parts out. The steps
// are in data/guides.js.
import { KINDS, GUIDE_SOURCE, guidesFor } from './data/guides.js';
import brushIn from './media/guides/brush-in.webp';
import brushOut from './media/guides/brush-out.webp';
import deckOpen from './media/guides/deck-open.webp';
import jam from './media/guides/jam.webp';
import cover from './media/guides/cover.webp';

const PHOTOS = { 'brush-in': brushIn, 'brush-out': brushOut, 'deck-open': deckOpen, jam, cover };

export function initGuides({ stage, app, $, esc, getDef, onChange, onPick }) {
  const box = $('#guide-list');
  const robotId = () => app.dataset.robot;
  let guide = null, step = 0;

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
    if (guide) onPick?.(); // an interruption that is on gives way to the guide
    if (stage.selected) stage.select(null);
    buildList();
    if (had && !guide) stage.setAlert(null); // the guide's glow goes with it
    apply();
    if (guide && matchMedia('(max-width: 860px)').matches) $('#left').classList.remove('open');
    onChange(!!guide);
  }

  /** Put the robot in this step's state: glow, how far it is open, what is slid out. */
  function apply() {
    if (!guide) { stage.setPull(null); return; }
    const s = guide.steps[step], color = KINDS[guide.kind].color;
    stage.setAlert({ main: s.main, rel: s.rel || [], color }, { reveal: false });
    stage.setExplode(s.open || 0);
    $('#explode').value = s.open || 0;
    stage.setPull(s.pull || null);
  }

  function go(i) {
    if (!guide) return;
    step = Math.max(0, Math.min(guide.steps.length - 1, i));
    apply();
    const root = $('#detail');
    renderCard(root);
    root.querySelector('#gd-next')?.focus({ preventScroll: true });
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
        ${s.photo ? `<img class="gd-photo" src="${PHOTOS[s.photo]}" width="480" height="528" alt="On site: ${esc(s.text)}" decoding="async">` : ''}
        <p class="gd-parts">${s.main.map((id) => `<button class="ic-part" type="button" data-id="${id}" style="--c:${kind.color}"><i></i>${esc(name(id))}</button>`).join('')}</p>
        <div class="d-nav"><button class="btn" id="gd-prev" type="button"${step === 0 ? ' disabled' : ''}>← Back</button><button class="btn primary" id="gd-next" type="button">${step === n - 1 ? 'Done' : 'Next →'}</button></div>
      </div>
      <details class="more d-sec"><summary>All ${n} steps</summary><ol class="gd-all">${guide.steps.map((x, i) => `<li><button type="button" data-i="${i}" class="${i === step ? 'on' : ''}">${esc(x.text)}</button></li>`).join('')}</ol></details>
      <div class="honest">${esc(GUIDE_SOURCE)}</div>`;
    root.querySelector('#gd-off').onclick = () => choose(null);
    root.querySelector('#gd-prev').onclick = () => go(step - 1);
    root.querySelector('#gd-next').onclick = () => (step === n - 1 ? choose(null) : go(step + 1));
    root.querySelectorAll('.gd-all button').forEach((b) => { b.onclick = () => go(+b.dataset.i); });
    root.querySelectorAll('.gd-parts .ic-part').forEach((b) => { b.onclick = () => stage.select(b.dataset.id); });
    root.scrollTop = 0;
    return true;
  }

  // the arrow keys step through a guide while it is open
  addEventListener('keydown', (e) => {
    if (!guide || e.target.closest?.('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') { go(step + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { go(step - 1); e.preventDefault(); }
  });

  /** Close the guide without touching the glow (another feature is taking over the stage). */
  function release() { if (!guide) return; guide = null; step = 0; stage.setPull(null); buildList(); }

  function onRobot() {
    if (guide && guide.robot !== robotId()) { guide = null; step = 0; }
    buildList();
    if (guide) apply(); else stage.setPull(null);
  }

  return { active: () => guide, renderCard, release, clear: () => choose(null), onRobot };
}
