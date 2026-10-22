// Interruptions in the viewer. A dropdown lists everything that stops a robot mid-run; choosing one
// makes the open robot glow where it comes from (see Stage.setAlert), opens the suit far enough to
// show it, and says which section and part it is. The data and the part mapping are in
// data/interruptions.js.
import { TYPES, CATEGORIES, partsFor, typeStats, totalEvents, ranked, fmtHours, DATA_MODEL, MODEL_LABEL, SOURCE, typesForPart, alarmCodes, modelCounts } from './data/interruptions.js';

export function initInterruptions({ stage, app, $, esc, getDef, groups, gcol, onChange }) {
  const btn = $('#intr-btn'), list = $('#intr-list'), banner = $('#alert-banner');
  const robotId = () => app.dataset.robot;
  const typeById = (id) => TYPES.find((t) => t.id === id) || null;
  const partOf = (id) => getDef().parts.find((p) => p.id === id);
  let activeId = null;
  let open = false;
  let cursor = 0;
  let rows = [];

  // The workbook's model for the open robot, or null: then the figures are for every model in it.
  const dataModel = () => DATA_MODEL[robotId()] ?? null;
  const has = () => dataModel() !== null;
  const active = () => (activeId ? typeById(activeId) : null);
  const count = (t) => typeStats(t, dataModel()).n;

  function basis() {
    const label = getDef().short;
    if (has()) return `Counts are ${MODEL_LABEL[dataModel()] || label} events in the data workbook (${totalEvents(dataModel())} in all).`;
    const models = Object.entries(SOURCE.models).map(([m, n]) => `${MODEL_LABEL[m] || m} ${n}`).join(', ');
    return `The data workbook has no ${label} rows, so counts are for every robot in it (${models}). Parts are matched by what they do.`;
  }

  // ───────────── the dropdown ─────────────
  function buildList() {
    rows = ranked(robotId());
    const maxN = Math.max(1, ...rows.map(count));
    let html = '', last = null;
    for (const t of rows) {
      const cat = CATEGORIES[t.category];
      if (t.category !== last) { html += `<li class="o-cat" role="presentation" style="--c:${cat.color}"><i></i>${esc(t.category)}</li>`; last = t.category; }
      const n = count(t);
      html += `<li class="o" role="option" id="intr-o-${t.id}" data-id="${t.id}" aria-selected="${t.id === activeId}" style="--c:${cat.color}">
        <span class="o-title">${esc(t.title)}</span>
        <span class="o-meta"><span class="o-codes mono">${t.codes.join(' · ')}</span><span class="o-bar" aria-hidden="true"><b style="width:${n ? Math.max(4, (n / maxN) * 100) : 0}%"></b></span><span class="o-n mono" title="${has() ? 'events on this model' : 'events across every model in the workbook'}">${n}</span></span>
      </li>`;
    }
    list.innerHTML = html;
    $('#intr-count').textContent = TYPES.length;
    $('#intr-basis').textContent = basis();
  }

  function markCursor() {
    const id = rows[cursor] ? `intr-o-${rows[cursor].id}` : '';
    for (const li of list.querySelectorAll('.o')) li.classList.toggle('cur', li.id === id);
    if (id) { btn.setAttribute('aria-activedescendant', id); document.getElementById(id)?.scrollIntoView({ block: 'nearest' }); } else btn.removeAttribute('aria-activedescendant');
  }

  function setOpen(on) {
    open = on;
    list.hidden = !on;
    btn.setAttribute('aria-expanded', String(on));
    if (on) { cursor = Math.max(0, rows.findIndex((t) => t.id === activeId)); markCursor(); } else btn.removeAttribute('aria-activedescendant');
  }

  btn.addEventListener('click', () => setOpen(!open));
  btn.addEventListener('keydown', (e) => {
    const k = e.key;
    const move = (to) => { if (!open) setOpen(true); cursor = Math.max(0, Math.min(rows.length - 1, to)); markCursor(); e.preventDefault(); e.stopPropagation(); };
    if (k === 'ArrowDown') move(open ? cursor + 1 : cursor);
    else if (k === 'ArrowUp') move(open ? cursor - 1 : cursor);
    else if (k === 'Home' && open) move(0);
    else if (k === 'End' && open) move(rows.length - 1);
    else if ((k === 'Enter' || k === ' ') && open) { choose(rows[cursor]?.id); e.preventDefault(); e.stopPropagation(); }
    else if (k === 'Escape' && open) { setOpen(false); e.preventDefault(); e.stopPropagation(); }
    else if (k === 'Tab' && open) setOpen(false);
  });
  list.addEventListener('mousedown', (e) => e.preventDefault()); // keep the focus on the button
  list.addEventListener('click', (e) => { const li = e.target.closest('.o'); if (li) choose(li.dataset.id === activeId ? null : li.dataset.id); });
  list.addEventListener('pointermove', (e) => { const li = e.target.closest('.o'); if (li) { const i = rows.findIndex((t) => t.id === li.dataset.id); if (i !== cursor) { cursor = i; markCursor(); } } });
  document.addEventListener('pointerdown', (e) => { if (open && !e.target.closest('.combo')) setOpen(false); });
  $('#intr-clear').addEventListener('click', () => choose(null));

  // ───────────── choosing ─────────────
  function choose(id) {
    activeId = id || null;
    if (stage.selected) stage.select(null); // the camera would stay on the selected part otherwise
    apply();
    setOpen(false);
    if (activeId && matchMedia('(max-width: 860px)').matches) $('#left').classList.remove('open');
    onChange();
  }

  function apply() {
    const t = active();
    for (const li of list.querySelectorAll('.o')) li.setAttribute('aria-selected', String(li.dataset.id === activeId));
    $('#intr-clear').hidden = !t;
    const m = t && partsFor(t, robotId());
    if (!t || !m) {
      activeId = null;
      stage.setAlert(null);
      banner.hidden = true;
      btn.classList.remove('on');
      $('#intr-text').textContent = 'Choose an interruption…';
      $('#intr-dot').style.background = '';
      app.classList.remove('alerting');
      return;
    }
    const color = CATEGORIES[t.category].color;
    app.style.setProperty('--alert-c', color);
    app.classList.add('alerting');
    btn.classList.add('on');
    $('#intr-text').textContent = t.title;
    $('#intr-dot').style.background = color;
    stage.setAlert({ main: m.main, rel: m.rel, color });
    renderBanner(t, m, color);
  }

  // ───────────── the banner on the stage ─────────────
  function renderBanner(t, m, color) {
    const secs = [...new Set(m.main.map((id) => partOf(id)?.group).filter(Boolean))];
    banner.innerHTML = `<div class="ab" style="--c:${color}">
      <span class="ab-pulse" aria-hidden="true"></span>
      <div class="ab-main"><b>${esc(t.title)}</b><span>${esc(t.category)} · code ${t.codes.join(', ')}</span></div>
      <div class="ab-where">
        <span class="ab-k">Section</span>${secs.map((g) => `<span class="ab-sec" style="--c:${gcol(g)}"><i></i>${esc(groups[g].label)}</span>`).join('')}
        <span class="ab-k">Part</span>${m.main.map((id) => `<button class="ab-part" type="button" data-id="${id}">${esc(partOf(id).name)}</button>`).join('')}
      </div>
      <button class="ab-x" type="button" aria-label="Clear the interruption">×</button>
    </div>`;
    banner.hidden = false;
  }
  banner.addEventListener('click', (e) => {
    const p = e.target.closest('.ab-part');
    if (p) stage.select(p.dataset.id);
    else if (e.target.closest('.ab-x')) choose(null);
  });

  // ───────────── the card in the details panel ─────────────
  const stat = (label, value, sub = '') => `<div class="kpi"><small>${esc(label)}</small><b>${esc(value)}</b>${sub ? `<em>${esc(sub)}</em>` : ''}</div>`;

  function cardHtml(t) {
    const rid = robotId(), def = getDef(), m = partsFor(t, rid), cat = CATEGORIES[t.category];
    const own = typeStats(t, dataModel()), fleet = typeStats(t, null);
    const s = has() ? own : fleet;
    const where = has() ? '' : ' (all models)';
    const secs = [...new Set(m.main.map((id) => partOf(id)?.group).filter(Boolean))];
    const share = has() && totalEvents(dataModel()) ? Math.round((own.n / totalEvents(dataModel())) * 1000) / 10 : null;
    const by = Object.entries(modelCounts(t)).map(([k, n]) => `${MODEL_LABEL[k] || k} ${n}`).join(' · ');
    const codes = alarmCodes(t);
    const partBtn = (id, rel) => `<button class="ic-part${rel ? ' rel' : ''}" type="button" data-id="${id}" style="--c:${gcol(partOf(id).group)}"><i></i>${esc(partOf(id).name)}</button>`;
    return `
      <div class="d-kicker" style="--c:${cat.color}"><i></i>${esc(t.category)}<span class="ic-codes mono">code ${t.codes.join(' · ')}</span></div>
      <h2 class="d-title">${esc(t.title)}</h2>
      <p class="d-desc">${esc(t.why)}</p>
      <div class="d-sec ic-where"><h3>Where on the ${esc(def.short)}</h3>
        <div class="ic-row"><span class="ic-k">Section</span><span class="ic-chips">${secs.map((g) => `<span class="ic-sec" style="--c:${gcol(g)}"><i></i>${esc(groups[g].label)}</span>`).join('')}</span></div>
        <div class="ic-row"><span class="ic-k">Part</span><span class="ic-chips">${m.main.map((id) => partBtn(id, false)).join('')}</span></div>
        ${m.rel.length ? `<div class="ic-row"><span class="ic-k">Related</span><span class="ic-chips">${m.rel.map((id) => partBtn(id, true)).join('')}</span></div>` : ''}
        ${m.fit === 'nearest' ? `<p class="ic-note"><b>Nearest match.</b> ${esc(m.note)}</p>` : ''}
        <p class="ic-hint">Click a part to open its specs.</p>
      </div>
      <div class="d-sec"><h3>In the data${esc(where)}</h3>
        <div class="kpis ic-kpis">${stat(has() ? 'Events' : 'Events (fleet)', String(s.n), share !== null ? `${share}% of ${def.short}` : '')}${stat('Typical alarm', s.n ? fmtHours(s.median) : '–', 'median')}${stat('Longest', s.n ? fmtHours(s.max) : '–', 'alarm stayed open')}</div>
        ${has() && !own.n ? `<p class="ic-note">The workbook has no ${esc(t.title.toLowerCase())} events for the ${esc(def.short)}. ${fleet.n ? `Other models report ${fleet.n}: ${esc(by)}.` : ''}</p>` : ''}
        ${!has() ? `<p class="ic-note">The workbook has no ${esc(def.short)} rows. These figures are for every model in it: ${esc(by)}.</p>` : (own.n && fleet.n > own.n ? `<p class="ic-fleet">All models in the workbook: ${fleet.n} events (${esc(by)}).</p>` : '')}
      </div>
      <details class="more d-sec"><summary>Alarm wording and codes</summary>
        <ul class="ic-codelist">${codes.map((c) => `<li><span class="mono">${c.code}</span><span>${esc(c.reason)}</span><em class="mono">${c.n}</em></li>`).join('')}</ul>
      </details>
      <div class="honest">Which part an alarm points to is our reading of what each part does. The workbook names the alarm, not the part. ${esc(SOURCE.file)}, ${SOURCE.rows} events.</div>`;
  }

  /** The interruption card for the details panel, or '' when none is chosen. */
  function renderCard(root) {
    const t = active();
    if (!t) return false;
    root.innerHTML = `<button class="link d-back" id="intr-off" type="button">← ${esc(getDef().short)} overview</button>${cardHtml(t)}`;
    root.querySelector('#intr-off').onclick = () => choose(null);
    root.querySelectorAll('.ic-part').forEach((b) => { b.onclick = () => stage.select(b.dataset.id); });
    root.scrollTop = 0;
    return true;
  }

  /** Markup for the part's own panel: which interruptions point at it. */
  function partSection(partId) {
    const hits = typesForPart(partId, robotId());
    if (!hits.length) return '';
    return `<div class="d-sec"><h3>Interruptions</h3>
      <ul class="ip-list">${hits.map(({ type, role }) => `<li><button class="ip" type="button" data-t="${type.id}" style="--c:${CATEGORIES[type.category].color}"><i></i><span>${esc(type.title)}</span><em class="mono">${count(type)}</em><small>${role === 'main' ? 'comes from here' : 'related'}</small></button></li>`).join('')}</ul>
      <p class="ic-hint">Choose one to see it glow on the robot.</p></div>`;
  }
  function bindPartSection(root) { root.querySelectorAll('.ip').forEach((b) => { b.onclick = () => choose(b.dataset.t); }); }

  // ───────────── robot switches ─────────────
  function onRobot() {
    buildList();
    apply(); // the same interruption, on the other robot's parts
  }

  return { onRobot, active, clear: () => choose(null), renderCard, partSection, bindPartSection, isOpen: () => open, close: () => setOpen(false) };
}
