import { Stage } from './stage.js';
import { GROUPS, CONF, SOURCES } from './data/shared.js';
import phantas from './data/phantas.js';
import cc1pro from './data/cc1pro.js';

const ROBOTS = { phantas, cc1pro };
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

const stage = new Stage(canvas);
let def = null;
let order = []; // part ids in list order (for prev/next)
const callouts = new Map(); // id → { el, path, dot }

// ─────────────── robot rendering ───────────────
function useRobot(id, { intro = true } = {}) {
  def = ROBOTS[id];
  app.dataset.robot = id;
  app.style.setProperty('--accent', def.accent);
  app.style.setProperty('--accent-2', def.accent2);
  app.style.setProperty('--accent-rgb', hexRgb(def.accent));
  document.documentElement.style.setProperty('--accent', def.accent);
  document.documentElement.style.setProperty('--accent-rgb', hexRgb(def.accent));
  $$('.robot-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.robot === id)));
  stage.loadRobot(def, { intro });
  buildList();
  buildCallouts();
  showOverview();
  $('#explode').value = stage.eT;
  hint(true);
  if (!stage.reduced && intro) setTimeout(() => { if (stage.eT === 0) stage.setExplode(0); }, 0);
}

function buildList() {
  const groupsUsed = [...new Set(def.parts.map((p) => p.group))];
  $('#groups').innerHTML = groupsUsed.map((g) => `<button class="chip" data-g="${g}" aria-pressed="false" style="--c:${GROUPS[g].color}"><i></i>${esc(GROUPS[g].label)}</button>`).join('');
  let html = '';
  order = [];
  for (const g of groupsUsed) {
    html += `<li class="gh" style="--c:${GROUPS[g].color}"><i></i>${esc(GROUPS[g].label)}</li>`;
    for (const p of def.parts.filter((x) => x.group === g)) {
      order.push(p.id);
      html += `<li><button class="part" data-id="${p.id}" data-g="${g}"><span>${esc(p.name)}</span><em>${esc(p.tag)}</em></button></li>`;
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
    const c = GROUPS[p.group].color;
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
    callouts.set(p.id, { el, path, dot, w: 0 });
  }
}

// ─────────────── detail panel ───────────────
function bars(level) { return `<span class="bars">${[1, 2, 3].map((i) => `<b class="${i <= level ? 'on' : ''}"></b>`).join('')}</span>`; }

function srcList(keys) {
  return `<ul class="src">${keys.map((k, i) => `<li><span class="n">${i + 1}</span><a href="${esc(SOURCES[k].u)}" target="_blank" rel="noopener">${esc(SOURCES[k].t)}</a></li>`).join('')}</ul>`;
}

function showOverview() {
  const d = def;
  $('#detail').innerHTML = `
    <div class="d-kicker">${esc(d.maker)}</div>
    <h2 class="d-title">${esc(d.name)}</h2>
    <p class="d-blurb">${esc(d.blurb)}</p>
    <div class="d-sec"><h3>Published specs</h3>
      <dl class="kv">${d.stats.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
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
    <div class="d-kicker" style="--c:${GROUPS[p.group].color}"><i></i>${esc(GROUPS[p.group].label)}</div>
    <h2 class="d-title">${esc(p.name)}</h2>
    <div class="conf">${bars(conf.level)}<span><b style="font-weight:500">${esc(conf.label)}</b><small>${esc(conf.note)}</small></span></div>
    <p class="d-desc">${esc(p.desc)}</p>
    <div class="d-sec"><h3>Specs</h3><dl class="kv">${p.specs.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>
    <div class="d-sec"><h3>Sources</h3>${srcList(p.src)}</div>
    <div class="d-nav"><button class="btn" id="prev">← Previous</button><button class="btn" id="next">Next →</button></div>`;
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

$$('.robot-tab').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.robot !== app.dataset.robot) useRobot(b.dataset.robot);
  if (matchMedia('(max-width: 860px)').matches) $('#left').classList.remove('open');
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
  if (e.target.closest('input, textarea')) return;
  const k = e.key;
  if (k === 'ArrowUp' || k === '+' || k === '=') { stage.nudgeExplode(0.07); e.preventDefault(); }
  else if (k === 'ArrowDown' || k === '-' || k === '_') { stage.nudgeExplode(-0.07); e.preventDefault(); }
  else if (k === 'ArrowLeft') { stage.cam.az -= 0.12; stage.lastInput = stage.time; }
  else if (k === 'ArrowRight') { stage.cam.az += 0.12; stage.lastInput = stage.time; }
  else if (k === 'Escape') { stage.select(null); $('#left').classList.remove('open'); }
  else if (k === 'r' || k === 'R') $('#reset').click();
  else if (k === 'f' || k === 'F') setFocus(!app.classList.contains('focus'));
  else if (k === '[' ) stage.select(order[(Math.max(0, order.indexOf(stage.selected?.def.id)) - 1 + order.length) % order.length]);
  else if (k === ']') stage.select(order[(order.indexOf(stage.selected?.def.id) + 1) % order.length]);
});

function hint(show) { $('#hint').classList.toggle('gone', !show); }

// ─────────────── per-frame UI ───────────────
const tmp = { x: 0, y: 0, z: 0 };
const GAP = 25;

stage.on('frame', () => {
  const e = stage.e;
  $('#pct').textContent = Math.round(e * 100) + '%';
  $('#stage-name').textContent = stage.stageName();
  if (!sliding) slider.value = stage.eT;
  slider.style.setProperty('--p', slider.value * 100 + '%');
  const on = e < 0.18 ? 0 : e < 0.51 ? 1 : e < 0.83 ? 2 : 3;
  $$('#stops button').forEach((b, i) => b.classList.toggle('on', i === on));
  updateCallouts();
});

function updateCallouts() {
  const W = stage.W, H = stage.H;
  const left = stage.insets.left, right = stage.insets.right;
  const freeW = W - left - right;
  const cx = left + freeW / 2;
  const wide = freeW >= 680 && stage.opts.labels;
  const sel = stage.selected, hov = stage.hovered;
  const show = [];
  for (const p of stage.parts) {
    const isSel = p === sel, isHov = p === hov;
    const auto = wide && !sel && !stage.groupFilter && stage.e > 0.55 && p.t > 0.75;
    const grp = wide && !sel && stage.groupFilter && p.def.group === stage.groupFilter && p.t > 0.5;
    if (isSel || isHov || auto || grp) {
      stage.projectAnchor(p, tmp);
      if (tmp.z < 1) show.push({ p, x: tmp.x, y: tmp.y, sel: isSel || isHov });
    }
  }
  const shown = new Set(show.map((s) => s.p.def.id));
  for (const [id, c] of callouts) {
    if (!shown.has(id)) {
      if (c.on) { c.el.classList.remove('on'); c.path.classList.remove('on'); c.dot.classList.remove('on'); c.on = false; }
    }
  }
  if (!show.length) return;

  const Ls = show.filter((s) => s.x < cx).sort((a, b) => a.y - b.y);
  const Rs = show.filter((s) => s.x >= cx).sort((a, b) => a.y - b.y);
  const top = 64, bottom = H - stage.insets.bottom - 10;
  const place = (arr, dir) => {
    let last = top - GAP;
    for (const it of arr) { it.ly = Math.max(it.y, last + GAP); last = it.ly; }
    for (let i = arr.length - 1; i >= 0; i--) {
      const maxY = i === arr.length - 1 ? bottom : arr[i + 1].ly - GAP;
      arr[i].ly = Math.min(arr[i].ly, maxY);
    }
    for (let i = 1; i < arr.length; i++) arr[i].ly = Math.max(arr[i].ly, arr[i - 1].ly + GAP * 0.8);
    for (const it of arr) {
      const c = callouts.get(it.p.def.id);
      if (!c.on) { c.el.classList.add('on'); c.path.classList.add('on'); c.dot.classList.add('on'); c.on = true; }
      c.el.classList.toggle('sel', it.sel);
      const w = c.el.offsetWidth || 120;
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
      c.el.style.transform = `translate(${x0}px, ${ly}px) translateY(-50%)`;
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
  stage.setInsets(!focus && mid ? l.right - a.left + 8 : 0, !focus && desktop ? a.right - r.left + 8 : 0, bottom);
}
new ResizeObserver(layoutInsets).observe(app);
new ResizeObserver(layoutInsets).observe($('.dock'));
new ResizeObserver(layoutInsets).observe($('#right'));
addEventListener('orientationchange', layoutInsets);

// ─────────────── boot ───────────────
useRobot('phantas');
layoutInsets();
window.__armory = { stage, useRobot, ROBOTS };
