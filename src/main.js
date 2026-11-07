import { Stage } from './stage.js';
import { GROUPS, CONF, SOURCES } from './data/shared.js';
import { ROBOTS } from './data/robots.js';
import { initJarvis } from './jarvis.js';
import { openRace, isRaceOpen } from './game/index.js';
import { initInterruptions } from './interruption-ui.js';
import { initGuides } from './guide-ui.js';
import { initBrowser } from './browser-ui.js';
import { PROFILES, ENVIRONMENTS, CATEGORIES, isBoth } from './data/catalogue.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return `${n >> 16}, ${(n >> 8) & 255}, ${n & 255}`; };

const app = $('#app');
const canvas = $('#gl');

function glOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
if (!glOk()) { $('#nogl').hidden = false; throw new Error('WebGL unavailable'); }

let look = 'studio';
try { const saved = localStorage.getItem('catalogue-look'); if (saved === 'holo' || saved === 'studio') look = saved; } catch { /* storage unavailable */ }
const stage = new Stage(canvas, { look });
const gcol = (g) => (stage.look === 'studio' ? GROUPS[g].studio : GROUPS[g].color);

// Colours, fonts and panel chrome follow the look.
function applyLookUI() {
  const L = stage.look;
  document.documentElement.dataset.look = L;
  app.dataset.look = L;
  $$('.look button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.look === L)));
  if (def) {
    const tone = L === 'studio' && def.studio ? def.studio : def;
    for (const el of [app, document.documentElement]) {
      el.style.setProperty('--accent', tone.accent);
      el.style.setProperty('--accent-2', tone.accent2);
      el.style.setProperty('--accent-rgb', hexRgb(tone.accent));
    }
  }
}
let def = null;
let order = []; // part ids in list order (for prev/next)
const callouts = new Map(); // id → { el, path, dot }

// ─────────────── robot rendering ───────────────
function useRobot(id, { intro = true } = {}) {
  def = ROBOTS[id];
  app.dataset.robot = id;
  applyLookUI();
  browser.select(id);
  const floor = PROFILES[id]?.category === 'floor'; // the alarms and guides are written for the floor cleaners
  $('#intr-sec').hidden = !floor;
  $('#guides-sec').hidden = !floor;
  stage.loadRobot(def, { intro });
  buildList();
  buildCallouts();
  intr.onRobot(); // an interruption that is on points at the same thing on this robot's parts
  guides.onRobot(); // a guide stays open only on the robot it is written for
  showOverview();
  $('#explode').value = stage.eT;
  hint(true);
  if (!stage.reduced && intro) setTimeout(() => { if (stage.eT === 0) stage.setExplode(0); }, 0);
}

function buildList() {
  const groupsUsed = [...new Set(def.parts.map((p) => p.group))];
  $('#groups').innerHTML = groupsUsed.map((g) => `<button class="chip" data-g="${g}" aria-pressed="false" style="--c:${gcol(g)}"><i></i>${esc(GROUPS[g].label)}</button>`).join('');
  let html = '';
  order = [];
  for (const g of groupsUsed) {
    const members = def.parts.filter((x) => x.group === g);
    html += `<li class="gh" style="--c:${gcol(g)}"><i></i>${esc(GROUPS[g].label)}<em>${members.length}</em></li>`;
    for (const p of members) {
      order.push(p.id);
      html += `<li style="--c:${gcol(g)}"><button class="part" data-id="${p.id}" data-g="${g}"><span>${esc(p.name)}</span><span class="pips" title="${esc(CONF[p.conf].label)}" aria-hidden="true">${[1, 2, 3].map((i) => `<b class="${i <= CONF[p.conf].level ? 'on' : ''}"></b>`).join('')}</span><em>${esc(p.tag)}</em></button></li>`;
    }
  }
  $('#parts').innerHTML = html;
  $('#part-count').textContent = def.parts.length;
  $('#clear-filter').hidden = true;
}

function buildCallouts() {
  $('#callouts').innerHTML = '';
  $('#leaders').innerHTML = '';
  callouts.clear();
  for (const p of def.parts) {
    const c = gcol(p.group);
    const el = document.createElement('div');
    el.className = 'callout';
    el.style.setProperty('--c', c);
    el.innerHTML = `<i></i>${esc(p.name)} <em>${esc(p.tag)}</em>`;
    $('#callouts').appendChild(el);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke', c);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('r', '2.6'); dot.setAttribute('fill', c);
    $('#leaders').append(path, dot);
    callouts.set(p.id, { el, path, dot, w: 0, on: false, sel: false, alert: false });
  }
}

// ─────────────── detail panel ───────────────
function bars(level) { return `<span class="bars">${[1, 2, 3].map((i) => `<b class="${i <= level ? 'on' : ''}"></b>`).join('')}</span>`; }

function srcList(keys) {
  return `<ul class="src">${keys.map((k, i) => `<li><span class="n">${i + 1}</span>${SOURCES[k].u ? `<a href="${esc(SOURCES[k].u)}" target="_blank" rel="noopener">${esc(SOURCES[k].t)}</a>` : `<span>${esc(SOURCES[k].t)}</span>`}</li>`).join('')}</ul>`;
}

// Spec rows: a long value sits under its label instead of wrapping beside it.
function kv(rows) { return rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd${String(v).length > 22 ? ' class="long"' : ''}>${esc(v)}</dd>`).join(''); }

// Three headline numbers from a robot's published specs (the number and its unit only).
// Where the robot works and what it is for, in the robot's own words (see data/catalogue.js).
function whereBlock(id) {
  const p = PROFILES[id];
  if (!p) return '';
  const chips = p.env.map((e) => `<span class="env-chip" data-env="${e}">${esc(ENVIRONMENTS[e].label)}</span>`).join('');
  return `<div class="d-sec where"><h3>Where it fits</h3>
      <div class="where-chips">${chips}<span class="cat-chip">${esc(CATEGORIES[p.category].label)}</span></div>
      <p class="where-text">${esc(p.where)}</p>
      <ul class="points">${p.points.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <p class="basis"><b>Why ${isBoth(p) ? 'indoor and outdoor' : esc(ENVIRONMENTS[p.env[0]].label.toLowerCase())}:</b> ${esc(p.basis)}</p>
    </div>`;
}

function kpiTiles(d) {
  if (d.kpis) return `<div class="kpis" aria-hidden="true">${d.kpis.map(([k, v]) => `<div class="kpi"><small>${esc(k)}</small><b${String(v).length > 8 ? ' class="sm"' : ''}>${esc(v)}</b></div>`).join('')}</div>`; // the robot names its own headline numbers
  // the first number and its unit, or the number after `prefer` ("Scrub 600 · sweep 840 · mop 760 mm" → "840 mm")
  const num = (v, prefer) => {
    const s = String(v);
    const p = prefer && s.match(new RegExp(prefer + '\\s*≥?([\\d.,–-]*\\d)\\s*([A-Za-zµ²/%]+)?', 'i'));
    if (p) return `${p[1]} ${p[2] || (s.match(/([A-Za-zµ²]+)\s*$/) || [])[1] || ''}`.trim();
    const m = s.match(/[\d.,–-]*\d(?:\s?[A-Za-zµ²/%]+)?/);
    return m ? m[0].trim() : s;
  };
  const pick = (label) => d.stats.find(([k]) => k === label)?.[1];
  const tiles = [['Weight', 'Weight'], ['Cleaning width', 'Sweep', 'sweep'], ['Runtime', 'Runtime']]
    .map(([k, name, pref]) => (pick(k) ? `<div class="kpi"><small>${esc(name)}</small><b>${esc(num(pick(k), pref))}</b></div>` : '')).join('');
  return tiles ? `<div class="kpis" aria-hidden="true">${tiles}</div>` : '';
}

function showOverview() {
  if (guides.renderCard($('#detail'))) { setSheet(true); return; } // a guide is open: its step card replaces the overview
  if (intr.renderCard($('#detail'))) { setSheet(false); return; } // an interruption is chosen: its card replaces the overview
  const d = def;
  $('#detail').innerHTML = `
    <div class="d-kicker">${esc(d.maker)}</div>
    <h2 class="d-title">${esc(d.name)}</h2>
    <p class="d-blurb">${esc(d.blurb)}</p>
    ${whereBlock(d.id)}
    ${kpiTiles(d)}
    <div class="d-sec"><h3>Published specs</h3>
      <dl class="kv">${kv(d.stats)}</dl>
    </div>
    <div class="d-sec"><h3>Source notes</h3>
      <ul class="notes">${d.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    </div>
    <div class="d-sec"><h3>How sure is each part</h3>
      <div class="legend">${Object.values(CONF).map((c) => `<div>${bars(c.level)}<span><b style="color:var(--text);font-weight:500">${esc(c.label)}.</b> ${esc(c.note)}</span></div>`).join('')}</div>
    </div>
    <div class="honest">Part names and numbers come from published sheets and manuals. The shapes and where parts sit inside are a schematic reconstruction, not CAD. Click a part for its sources.</div>
    <details class="more d-sec"><summary>Sources (${d.sources.length})</summary>${srcList(d.sources)}</details>`;
  setSheet(false);
}

function showPart(id) {
  const p = def.parts.find((x) => x.id === id);
  const conf = CONF[p.conf];
  const i = order.indexOf(id);
  $('#detail').innerHTML = `
    <button class="link d-back" id="back">← ${esc(def.short)} overview</button>
    <div class="d-kicker" style="--c:${gcol(p.group)}"><i></i>${esc(GROUPS[p.group].label)}</div>
    <h2 class="d-title">${esc(p.name)}</h2>
    <div class="conf">${bars(conf.level)}<span><b style="font-weight:500">${esc(conf.label)}</b><small>${esc(conf.note)}</small></span></div>
    <p class="d-desc">${esc(p.desc)}</p>
    <div class="d-sec"><h3>Specs</h3><dl class="kv">${kv(p.specs)}</dl></div>
    <div class="d-sec"><h3>Sources</h3>${srcList(p.src)}</div>
    ${intr.partSection(id)}
    <div class="d-nav"><button class="btn" id="prev">← Previous</button><button class="btn" id="next">Next →</button></div>`;
  intr.bindPartSection($('#detail'));
  $('#back').onclick = () => stage.select(null);
  $('#prev').onclick = () => stage.select(order[(i - 1 + order.length) % order.length]);
  $('#next').onclick = () => stage.select(order[(i + 1) % order.length]);
  $('#detail').scrollTop = 0;
  setSheet(true);
}

function setSheet(on) {
  const mobile = matchMedia('(max-width: 1180px)').matches;
  const open = on && mobile;
  $('#right').classList.toggle('open', open);
  $('#open-right').setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('sheet-open', open && matchMedia('(max-width: 860px)').matches);
  layoutInsets();
}

// ─────────────── events ───────────────
stage.on('select', (id) => {
  $$('.part').forEach((b) => b.classList.toggle('sel', b.dataset.id === id));
  if (id) { showPart(id); hint(false); $('.part.sel')?.scrollIntoView({ block: 'nearest' }); }
  else showOverview();
  document.body.classList.toggle('has-sel', !!id);
});
stage.on('hover', (id) => {
  $$('.part').forEach((b) => b.classList.toggle('hot', b.dataset.id === id));
  const tip = $('#tip');
  if (id && lastMouse) {
    const p = def.parts.find((x) => x.id === id);
    tip.textContent = `${p.name} · ${p.tag}`;
    tip.hidden = false;
  } else tip.hidden = true;
});
stage.on('pick', (id) => stage.select(id && id === stage.selected?.def.id ? null : id));
stage.on('input', () => hint(false));
stage.on('quality', () => {
  const b = $('.tgl[data-opt="bloom"]');
  b.setAttribute('aria-pressed', 'false');
  b.title = 'Glow was switched off to keep the view smooth on this device.';
});

let lastMouse = null;
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  lastMouse = e;
  const tip = $('#tip');
  tip.style.left = e.clientX - app.getBoundingClientRect().left + 'px';
  tip.style.top = e.clientY - app.getBoundingClientRect().top + 'px';
});
canvas.addEventListener('pointerleave', () => { lastMouse = null; $('#tip').hidden = true; });

$('#parts').addEventListener('click', (e) => {
  const b = e.target.closest('.part');
  if (!b) return;
  stage.select(b.dataset.id === stage.selected?.def.id ? null : b.dataset.id);
  if (matchMedia('(max-width: 860px)').matches) $('#left').classList.remove('open');
});
$('#parts').addEventListener('pointerover', (e) => { const b = e.target.closest('.part'); stage.hoverExternal = b ? b.dataset.id : null; });
$('#parts').addEventListener('pointerleave', () => { stage.hoverExternal = null; });

$('#groups').addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  const on = b.getAttribute('aria-pressed') !== 'true';
  $$('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
  b.setAttribute('aria-pressed', String(on));
  setGroup(on ? b.dataset.g : null);
});
$('#clear-filter').onclick = () => { $$('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false')); setGroup(null); };
function setGroup(g) {
  stage.select(null);
  stage.setGroup(g);
  if (g) stage.setExplode(Math.max(stage.eT, 0.86));
  $('#clear-filter').hidden = !g;
  $$('.part').forEach((b) => b.classList.toggle('mute', !!g && b.dataset.g !== g));
}

$$('.look button').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.look === stage.look) return;
  const sel = stage.selected?.def.id || null;
  const g = $('.chip[aria-pressed="true"]')?.dataset.g || null;
  stage.setLook(b.dataset.look);
  try { localStorage.setItem('catalogue-look', stage.look); } catch { /* ignore */ }
  applyLookUI();
  buildList();
  buildCallouts();
  if (g) { $$('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.g === g))); $$('.part').forEach((x) => x.classList.toggle('mute', x.dataset.g !== g)); $('#clear-filter').hidden = false; }
  if (sel) { $$('.part').forEach((x) => x.classList.toggle('sel', x.dataset.id === sel)); showPart(sel); } else showOverview();
}));


// dock
const slider = $('#explode');
let sliding = false;
slider.addEventListener('pointerdown', () => { sliding = true; });
addEventListener('pointerup', () => { sliding = false; });
slider.addEventListener('input', () => { stage.setExplode(+slider.value); hint(false); });
const STOPS = [['Sealed', 0], ['Shell open', 0.36], ['Subsystems', 0.66], ['Teardown', 1]];
$('#stops').innerHTML = STOPS.map(([n, v]) => `<button data-v="${v}" style="left:${v * 100}%">${n}</button>`).join('');
$('#stops').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { stage.setExplode(+b.dataset.v); hint(false); } });
$('#zoom-in').onclick = () => stage.zoomBy(0.82);
$('#zoom-out').onclick = () => stage.zoomBy(1.22);
$('#reset').onclick = () => { stage.resetView(); $$('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false')); setGroup(null); stage.setExplode(0); };
$$('.tgl[data-opt]').forEach((b) => b.addEventListener('click', () => {
  const on = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', String(on));
  stage.setOpt(b.dataset.opt, on);
  if (b.dataset.opt === 'water' && on) stage.setExplode(Math.max(stage.eT, 0.9));
}));
function setFocus(on) {
  app.classList.toggle('focus', on);
  $('#focus-btn').setAttribute('aria-pressed', String(on));
  layoutInsets();
}
$('#focus-btn').onclick = () => setFocus(!app.classList.contains('focus'));
$('#open-left').onclick = () => { const o = $('#left').classList.toggle('open'); $('#open-left').setAttribute('aria-expanded', String(o)); };
$('#open-right').onclick = () => { const mobile = matchMedia('(max-width: 1180px)').matches; if (!mobile) return; const o = !$('#right').classList.contains('open'); $('#right').classList.toggle('open', o); document.body.classList.toggle('sheet-open', o && matchMedia('(max-width: 860px)').matches); layoutInsets(); };

addEventListener('keydown', (e) => {
  if (isRaceOpen() || e.target.closest('input, textarea')) return; // the race has the keys while it is open
  const k = e.key;
  if (k === 'ArrowUp' || k === '+' || k === '=') { stage.nudgeExplode(0.07); e.preventDefault(); }
  else if (k === 'ArrowDown' || k === '-' || k === '_') { stage.nudgeExplode(-0.07); e.preventDefault(); }
  else if (k === 'ArrowLeft') { stage.cam.az -= 0.12; stage.lastInput = stage.time; }
  else if (k === 'ArrowRight') { stage.cam.az += 0.12; stage.lastInput = stage.time; }
  else if (k === 'Escape') {
    if (intr.isOpen()) intr.close();
    else if (!stage.selected && intr.active()) intr.clear(); // nothing selected: Esc puts the glow away
    else stage.select(null);
    $('#left').classList.remove('open');
  }
  else if (k === 'r' || k === 'R') $('#reset').click();
  else if (k === 'f' || k === 'F') setFocus(!app.classList.contains('focus'));
  else if (k === '[' ) stage.select(order[(Math.max(0, order.indexOf(stage.selected?.def.id)) - 1 + order.length) % order.length]);
  else if (k === ']') stage.select(order[(order.indexOf(stage.selected?.def.id) + 1) % order.length]);
});

function hint(show) { $('#hint').classList.toggle('gone', !show); }

// ─────────────── per-frame UI ───────────────
const tmp = { x: 0, y: 0, z: 0 };
const GAP = 25;

const MIN_GAP = 21; // a label is about 20 px tall: closer than this they overlap
let lastPct = -1, lastStage = '';

stage.on('frame', () => {
  const e = stage.e;
  const pct = Math.round(e * 100);
  if (pct !== lastPct) { lastPct = pct; $('#pct').textContent = pct + '%'; }
  const sn = stage.stageName();
  if (sn !== lastStage) { lastStage = sn; $('#stage-name').textContent = sn; }
  if (!sliding) slider.value = stage.eT;
  slider.style.setProperty('--p', slider.value * 100 + '%');
  const on = e < 0.18 ? 0 : e < 0.51 ? 1 : e < 0.83 ? 2 : 3;
  $$('#stops button').forEach((b, i) => b.classList.toggle('on', i === on));
  updateCallouts();
});

function setOn(c, on) {
  if (c.on === on) return;
  c.on = on;
  for (const n of [c.el, c.path, c.dot]) n.classList.toggle('on', on);
  if (!on) { c.alert = false; for (const n of [c.el, c.path, c.dot]) n.classList.remove('alert'); }
}

function updateCallouts() {
  const W = stage.W, H = stage.H;
  const left = stage.insets.left, right = stage.insets.right;
  const freeW = W - left - right;
  const cx = left + freeW / 2;
  const wide = freeW >= 680 && stage.opts.labels;
  const sel = stage.selected, hov = stage.hovered;
  const pointed = stage.alert ? stage.alert.main : null; // parts an interruption points at
  const show = [];
  for (const p of stage.parts) {
    const isSel = p === sel, isHov = p === hov, isAlert = !!pointed && pointed.includes(p);
    const auto = wide && !sel && !pointed && !stage.groupFilter && stage.e > 0.55 && p.t > 0.75;
    const grp = wide && !sel && stage.groupFilter && p.def.group === stage.groupFilter && p.t > 0.5;
    if (isSel || isHov || auto || grp || isAlert) {
      stage.projectAnchor(p, tmp);
      if (tmp.z < 1) show.push({ p, x: tmp.x, y: tmp.y, sel: isSel || isHov || isAlert, alert: isAlert });
    }
  }

  const banner = stage.alert ? $('#alert-banner') : null; // labels start below the interruption banner
  const top = banner && !banner.hidden ? Math.max(64, banner.offsetHeight + 36) : 64, bottom = H - stage.insets.bottom - 10;
  // A column holds only as many labels as fit between the top and the bottom of the view. Past that the
  // selected and pointed-at parts keep theirs, then the biggest parts, so no label is pushed off screen.
  const room = Math.max(1, Math.floor((bottom - top) / MIN_GAP) + 1);
  const fit = (arr) => {
    if (arr.length > room) {
      arr.sort((a, b) => (b.sel - a.sel) || (b.p.radius - a.p.radius));
      arr.length = room;
    }
    return arr.sort((a, b) => a.y - b.y);
  };
  const Ls = fit(show.filter((s) => s.x < cx));
  const Rs = fit(show.filter((s) => s.x >= cx));
  const shown = new Set([...Ls, ...Rs].map((s) => s.p.def.id));
  for (const [id, c] of callouts) if (!shown.has(id)) setOn(c, false);
  if (!shown.size) return;

  // Write the classes first, then read every new width at once, then place: one layout per frame at
  // most, instead of one forced layout per label.
  const all = [...Ls, ...Rs];
  for (const it of all) {
    const c = callouts.get(it.p.def.id);
    setOn(c, true);
    if (c.sel !== it.sel) { c.sel = it.sel; c.el.classList.toggle('sel', it.sel); c.w = 0; }
    const al = !!it.alert;
    if (c.alert !== al) { c.alert = al; for (const n of [c.el, c.path, c.dot]) n.classList.toggle('alert', al); c.w = 0; }
  }
  for (const it of all) { const c = callouts.get(it.p.def.id); if (!c.w) c.w = c.el.offsetWidth || 120; }

  const place = (arr, dir) => {
    const n = arr.length;
    const gap = n > 1 ? Math.max(MIN_GAP, Math.min(GAP, (bottom - top) / (n - 1))) : GAP;
    let last = top - gap;
    for (const it of arr) { it.ly = Math.max(it.y, last + gap); last = it.ly; }
    let next = bottom + gap;
    for (let i = n - 1; i >= 0; i--) { arr[i].ly = Math.min(arr[i].ly, next - gap); next = arr[i].ly; }
    for (const it of arr) it.ly = Math.max(top, Math.min(bottom, it.ly));
    for (const it of arr) {
      const c = callouts.get(it.p.def.id);
      const w = c.w;
      let x0, ly, ex, elbow;
      if (wide) {
        // columns hug the edges of the free area so the model keeps the middle
        x0 = dir < 0 ? left + 10 : W - right - 10 - w;
        ly = it.ly;
        ex = dir < 0 ? x0 + w : x0;
        elbow = ex + dir * 16;
      } else {
        // narrow screens: one label beside its part
        const side = it.x < cx ? -1 : 1;
        ly = Math.max(top, Math.min(bottom, it.y - 30));
        x0 = side < 0 ? Math.max(left + 8, it.x - 40 - w) : Math.min(W - right - 8 - w, it.x + 40);
        ex = side < 0 ? x0 + w : x0;
        elbow = ex + side * 10;
      }
      c.el.style.transform = `translate(${x0.toFixed(1)}px, ${ly.toFixed(1)}px) translateY(-50%)`;
      c.path.setAttribute('d', `M${it.x.toFixed(1)} ${it.y.toFixed(1)} L${elbow.toFixed(1)} ${ly.toFixed(1)} L${ex.toFixed(1)} ${ly.toFixed(1)}`);
      c.dot.setAttribute('cx', it.x.toFixed(1)); c.dot.setAttribute('cy', it.y.toFixed(1));
    }
  };
  place(Ls, -1);
  place(Rs, 1);
}

// keep the model centred between the side panels
function layoutInsets() {
  const l = $('#left').getBoundingClientRect(), r = $('#right').getBoundingClientRect(), a = app.getBoundingClientRect();
  const d = $('.dock').getBoundingClientRect();
  const focus = app.classList.contains('focus');
  const desktop = matchMedia('(min-width: 1181px)').matches;
  const mid = matchMedia('(min-width: 861px)').matches;
  const sheetOpen = $('#right').classList.contains('open');
  const bottom = sheetOpen ? $('#right').offsetHeight + 8 : Math.max(0, a.bottom - d.top + 6);
  const il = !focus && mid ? l.right - a.left + 8 : 0, ir = !focus && desktop ? a.right - r.left + 8 : 0;
  stage.setInsets(il, ir, bottom);
  app.style.setProperty('--ins-l', il + 'px'); // the alert banner sits in the free area between the panels
  app.style.setProperty('--ins-r', ir + 'px');
}
new ResizeObserver(layoutInsets).observe(app);
new ResizeObserver(layoutInsets).observe($('.dock'));
new ResizeObserver(layoutInsets).observe($('#right'));
addEventListener('orientationchange', layoutInsets);

// ─────────────── boot ───────────────
const intr = initInterruptions({ stage, app, $, esc, getDef: () => def, groups: GROUPS, gcol, onChange: () => { if (intr.active()) guides.release(); hint(false); showOverview(); } });
const guides = initGuides({ stage, app, $, esc, getDef: () => def, onPick: () => { if (intr.active()) intr.clear(); }, onChange: () => { hint(false); showOverview(); } });
const browser = initBrowser({
  root: $('#browse'), robots: ROBOTS, esc,
  onPick: (id) => { useRobot(id); if (matchMedia('(max-width: 860px)').matches) $('#left').classList.remove('open'); },
});
$('#brand-sub').textContent = `Open up ${browser.count} robots, piece by piece: floor cleaners, facade and solar robots, duct crawlers, inspection and security robots.`;
useRobot('phantas');
layoutInsets();
initJarvis({ stage, app, $ });

// Race mode runs on its own canvas, so the viewer's render loop pauses while it is open.
$('#play-btn').onclick = () => openRace(Object.fromEntries(Object.entries(ROBOTS).filter(([, r]) => r.race !== false)), { // only the floor cleaners race
  onOpen: () => stage.renderer.setAnimationLoop(null),
  onClose: () => stage.renderer.setAnimationLoop((t) => stage._frame(t)),
});
window.__catalogue = { stage, useRobot, ROBOTS };
