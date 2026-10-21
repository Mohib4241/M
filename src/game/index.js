// Race mode. Pick a robot, get five random roads, and race the other robot round each one. Each
// lap is one circuit of a random road, about a minute long. Points: 3 for winning a lap, 1 for
// second, and 1 bonus point for every 50 grains of dust in the tank. Most points wins.
import { makeRoad } from './track.js';
import { Race } from './race.js';
import { RaceScene, createRenderer } from './scene3d.js';
import { readInput, attachKeys } from './input.js';
import { GameAudio } from './audio.js';
import { rng } from './rng.js';
import { driverInput } from './ai.js';
import { QualityGovernor, MODES } from './quality.js';
import { TANK_MAX } from './dust.js';
import { CHARGE_MAX, TIER_AT, tierOf } from './drift.js';

export const LAPS = 5;
const SIM = 1 / 60;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let renderer = null;
let S = null; // the open session, or null when race mode is closed

export const isRaceOpen = () => !!S;

// ───────────────────────── session ─────────────────────────

/**
 * Open race mode over the viewer. `defs` maps robot ids to their data. `hooks.onOpen` and
 * `hooks.onClose` let the page pause its own renderer while the race is open.
 */
export function openRace(defs, hooks = {}) {
  if (S) return;
  const root = $('#game');
  if (!root.dataset.built) buildDom(root);
  root.hidden = false;
  S = {
    defs, hooks, root,
    robotId: 'phantas', oppId: 'cc1pro',
    seed: (Math.random() * 1e9) | 0,
    roads: [], lap: 0, results: [], race: null, scene: null,
    screen: 'robot', paused: false, acc: 0, last: performance.now(), raf: 0,
    audio: new GameAudio(), gov: new QualityGovernor({ mode: savedMode() }), sound: true, timers: [], detach: null, mapBg: null, bannerT: 0, prev: null,
  };
  S.oppId = otherRobot(S.robotId);
  S.detach = attachKeys();
  if (!renderer) renderer = createRenderer($('#game-gl'));
  hooks.onOpen?.();
  onResize();
  S.roads = makeRoads(S.seed);
  S.last = performance.now();
  showScreen('robot');
  S.raf = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', onVisibility);
  addEventListener('resize', onResize);
}

export function closeRace() {
  if (!S) return;
  cancelAnimationFrame(S.raf);
  for (const t of S.timers) clearTimeout(t);
  S.detach?.();
  S.scene?.dispose();
  S.audio.stop();
  S.root.hidden = true;
  const hooks = S.hooks;
  document.removeEventListener('visibilitychange', onVisibility);
  removeEventListener('resize', onResize);
  S = null;
  hooks.onClose?.();
}

function onVisibility() { if (document.hidden && S?.screen === 'race') pause(true); }
function onResize() {
  if (!renderer) return;
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  S?.scene?.resize(w, h);
}

const otherRobot = (id) => (id === 'phantas' ? 'cc1pro' : 'phantas');

function makeRoads(seedBase) {
  const roads = [];
  for (let i = 0; i < LAPS; i++) {
    const seed = seedBase + i * 7919 + 1;
    const length = 600 + Math.floor(rng(seed + 9)() * 121); // 60 to 72 m of road
    const road = makeRoad(seed, { length });
    roads.push({ seed, length, road, thumb: thumbPath(road) });
  }
  return roads;
}

/** A small SVG path of the road for the lap cards. */
function thumbPath(road) {
  const pts = [];
  for (let i = 0; i < road.n; i += 4) pts.push([road.x[i], road.z[i]]);
  const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const k = 88 / Math.max(x1 - x0, z1 - z0);
  const ox = (100 - (x1 - x0) * k) / 2, oz = (100 - (z1 - z0) * k) / 2;
  return 'M' + pts.map(([x, z]) => `${((x - x0) * k + ox).toFixed(1)} ${((z - z0) * k + oz).toFixed(1)}`).join(' L') + ' Z';
}

// ───────────────────────── scene ─────────────────────────

/** Build the 3D scene for one road (the preview on the menus, then each lap). */
function buildScene(spec, { skill } = {}) {
  S.scene?.dispose();
  const race = new Race(spec.road, { skill: skill ?? lapSkill(spec), dustSeed: spec.seed });
  S.race = race;
  S.scene = new RaceScene(renderer, race, { playerDef: S.defs[S.robotId], aiDef: S.defs[S.oppId], level: S.gov.level });
  onResize();
  S.mapBg = null;
}

const lapSkill = (spec) => 0.93 + rng(spec.seed + 99)() * 0.07;

// ───────────────────────── screens ─────────────────────────

function showScreen(name) {
  S.screen = name;
  S.root.dataset.screen = name;
  const hud = $('#g-hud', S.root);
  const menus = name !== 'race' && name !== 'lap';
  hud.hidden = menus;
  const box = $('#g-screen', S.root);
  box.hidden = name === 'race';
  if (name === 'robot') { buildScene(S.roads[0]); box.innerHTML = robotScreen(); }
  if (name === 'roads') { buildScene(S.roads[0]); box.innerHTML = roadsScreen(); }
  if (name === 'lap') { box.innerHTML = lapScreen(); }
  if (name === 'final') { box.innerHTML = finalScreen(); }
  if (name === 'pause') { box.innerHTML = pauseScreen(); }
  if (name === 'race') { box.innerHTML = ''; }
  const first = box.querySelector('[data-focus]');
  first?.focus();
}

function robotCard(id) {
  const d = S.defs[id];
  const pick = (label) => d.stats.find(([k]) => k === label)?.[1];
  const picked = S.robotId === id;
  return `<button class="g-robot ${picked ? 'on' : ''}" style="--c:${d.accent}" data-act="robot:${id}" aria-pressed="${picked}">
    <span class="g-kicker">${esc(d.maker)}</span>
    <b>${esc(d.name)}</b>
    <small>${esc(d.blurb)}</small>
    <dl>
      <div><dt>Size</dt><dd>${esc(pick('Size') || '')}</dd></div>
      <div><dt>Water</dt><dd>${esc((pick('Water tanks') || '').split('·')[0].trim())}</dd></div>
      <div><dt>Cleaning</dt><dd>${esc(pick('Cleaning width') || '')}</dd></div>
    </dl>
  </button>`;
}

function robotScreen() {
  return `<div class="g-card g-wide">
    <header><span class="g-kicker">Race mode</span><h2>Choose your robot</h2>
    <p>You race the other robot, round five random roads. Each lap is about a minute.</p></header>
    <div class="g-robots">${robotCard('phantas')}${robotCard('cc1pro')}</div>
    <p class="g-note">You drive with the keyboard: <kbd>W</kbd> go, <kbd>S</kbd> front brake, <kbd>A</kbd> <kbd>D</kbd> steer, <kbd>Space</kbd> drift brake, <kbd>Shift</kbd> pick up dust. Race mode needs a keyboard, not a phone.</p>
    <div class="g-actions"><button class="g-btn primary" data-focus data-act="to-roads">Next: choose roads →</button><button class="g-btn" data-act="exit">Back to viewer</button></div>
  </div>`;
}

function roadsScreen() {
  const rows = S.roads.map((r, i) => `<li class="g-lap-row">
      <span class="g-num">${i + 1}</span>
      <svg viewBox="0 0 100 100" aria-hidden="true"><path d="${r.thumb}" /></svg>
      <div><b>Lap ${i + 1}</b><small>${(r.length / 10).toFixed(0)} m · about a minute · random bends</small></div>
    </li>`).join('');
  return `<div class="g-card">
    <header><span class="g-kicker">${esc(S.defs[S.robotId].short)} vs ${esc(S.defs[S.oppId].short)}</span><h2>Five roads</h2>
    <p>Each road is random. Every lap starts from the line, so the same road order can be raced again by reshuffling.</p></header>
    <ol class="g-laps">${rows}</ol>
    <div class="g-actions">
      <button class="g-btn primary" data-focus data-act="start">Start race</button>
      <button class="g-btn" data-act="shuffle">Shuffle roads</button>
      <button class="g-btn" data-act="to-robot">← Robot</button>
    </div>
  </div>`;
}

function fmtTime(t) {
  if (t === null || t === undefined) return 'DNF';
  const m = Math.floor(t / 60), s = (t - m * 60).toFixed(1).padStart(4, '0');
  return `${m}:${s}`;
}
const ordinal = (n) => ['', '1st', '2nd'][n] || `${n}th`;

/** Points for one lap: 3 for first, 1 for second, and a bonus for dust. */
function lapPoints(row, dust) {
  const place = row.place === 1 ? 3 : row.place === 2 ? 1 : 0;
  return { place, dust: Math.floor(dust / 50), total: place + Math.floor(dust / 50) };
}

function lapScreen() {
  const last = S.results[S.results.length - 1];
  const opp = S.defs[S.oppId].short, me = S.defs[S.robotId].short;
  const won = last.player.place === 1;
  const finalLap = S.lap === LAPS - 1;
  return `<div class="g-card">
    <header><span class="g-kicker">Lap ${S.lap + 1} of ${LAPS}</span>
      <h2>${won ? 'You won the lap' : last.player.finished ? `${ordinal(last.player.place)} place` : 'Not finished'}</h2></header>
    <table class="g-table">
      <thead><tr><th></th><th>Place</th><th>Time</th><th>Dust</th><th>Points</th></tr></thead>
      <tbody>
        <tr class="me"><td>${esc(me)} (you)</td><td>${last.player.place ? ordinal(last.player.place) : '–'}</td><td class="mono">${fmtTime(last.player.time)}</td><td class="mono">${last.dust}</td><td class="mono">${last.pts.total}</td></tr>
        <tr><td>${esc(opp)}</td><td>${last.ai.place ? ordinal(last.ai.place) : '–'}</td><td class="mono">${fmtTime(last.ai.time)}</td><td class="mono">–</td><td class="mono">${last.aiPts}</td></tr>
      </tbody>
    </table>
    <p class="g-note">Points: 3 for first, 1 for second, plus 1 for every 50 grains of dust in the tank.</p>
    <div class="g-actions">
      <button class="g-btn primary" data-focus data-act="${finalLap ? 'final' : 'next-lap'}">${finalLap ? 'See the final result' : `Next: lap ${S.lap + 2}`}</button>
    </div>
  </div>`;
}

function standings() {
  const sum = { me: { pts: 0, time: 0, dust: 0, won: 0, done: 0 }, opp: { pts: 0, time: 0, dust: 0, won: 0, done: 0 } };
  for (const r of S.results) {
    sum.me.pts += r.pts.total; sum.opp.pts += r.aiPts;
    sum.me.dust += r.dust;
    if (r.player.place === 1) sum.me.won++;
    if (r.ai.place === 1) sum.opp.won++;
    if (r.player.finished) { sum.me.time += r.player.time; sum.me.done++; }
    if (r.ai.finished) { sum.opp.time += r.ai.time; sum.opp.done++; }
  }
  return sum;
}

function finalScreen() {
  const s = standings();
  const me = S.defs[S.robotId].short, opp = S.defs[S.oppId].short;
  let verdict;
  if (s.me.pts !== s.opp.pts) verdict = s.me.pts > s.opp.pts ? 'You win the race' : `${opp} wins the race`;
  else verdict = 'A draw on points';
  const tcell = (done, t) => (done ? `${t.toFixed(1)} s` : 'no finish');
  return `<div class="g-card">
    <header><span class="g-kicker">Race over · ${LAPS} laps</span><h2>${verdict}</h2></header>
    <table class="g-table">
      <thead><tr><th></th><th>Points</th><th>Lap wins</th><th>Total time (finished laps)</th><th>Dust</th></tr></thead>
      <tbody>
        <tr class="me"><td>${esc(me)} (you)</td><td class="mono">${s.me.pts}</td><td class="mono">${s.me.won}</td><td class="mono">${tcell(s.me.done, s.me.time)}</td><td class="mono">${s.me.dust}</td></tr>
        <tr><td>${esc(opp)}</td><td class="mono">${s.opp.pts}</td><td class="mono">${s.opp.won}</td><td class="mono">${tcell(s.opp.done, s.opp.time)}</td><td class="mono">–</td></tr>
      </tbody>
    </table>
    <div class="g-actions">
      <button class="g-btn primary" data-focus data-act="again">Race again (new roads)</button>
      <button class="g-btn" data-act="to-robot">Change robot</button>
      <button class="g-btn" data-act="exit">Back to viewer</button>
    </div>
  </div>`;
}

function pauseScreen() {
  return `<div class="g-card g-small">
    <header><span class="g-kicker">Paused</span><h2>Lap ${S.lap + 1} of ${LAPS}</h2></header>
    <div class="g-actions column">
      <button class="g-btn primary" data-focus data-act="resume">Resume</button>
      <button class="g-btn" data-act="restart-lap">Restart this lap</button>
      <button class="g-btn" data-act="to-roads">Change roads</button>
      <button class="g-btn" data-act="exit">Back to viewer</button>
    </div>
  </div>`;
}

// ───────────────────────── race flow ─────────────────────────

function startLap(i) {
  for (const t of S.timers) clearTimeout(t);
  S.timers = [];
  S.lap = i;
  buildScene(S.roads[i], { skill: lapSkill(S.roads[i]) });
  S.acc = 0;
  S.paused = false;
  S.prev = null;
  S.prevTier = 0;
  S.bannerT = 0;
  S.lapEnded = false;
  S.audio.start();
  $('#g-lap', S.root).textContent = `${i + 1} / ${LAPS}`;
  $('#g-road', S.root).textContent = `Road ${i + 1} · ${(S.roads[i].length / 10).toFixed(0)} m`;
  $('#g-target', S.root).textContent = 'About a minute';
  showScreen('race');
  setBanner('');
}

function pause(on) {
  if (S.screen !== 'race' && S.screen !== 'pause') return;
  if (on) { S.paused = true; S.audio.stop(); showScreen('pause'); } else { S.paused = false; S.audio.start(); showScreen('race'); }
}

function endLap() {
  if (S.lapEnded) return;
  S.lapEnded = true;
  const r = S.race.result();
  const pts = lapPoints(r.player, r.dust);
  const aiPts = r.ai.place === 1 ? 3 : r.ai.place === 2 ? 1 : 0;
  S.results.push({ lap: S.lap, player: r.player, ai: r.ai, dust: r.dust, pts, aiPts });
  // give the finish a moment to be seen, then show the lap card
  S.timers.push(setTimeout(() => showScreen('lap'), 1100));
}

function nextLap() {
  if (S.lap + 1 < LAPS) startLap(S.lap + 1);
  else showScreen('final');
}

// the graphics setting is remembered between visits (separately from the viewer's look settings)
const GFX_KEY = 'armory-gfx';
function savedMode() {
  try { const m = localStorage.getItem(GFX_KEY); return MODES.includes(m) ? m : 'auto'; } catch { return 'auto'; }
}
function saveMode(m) {
  try { localStorage.setItem(GFX_KEY, m); } catch { /* private window: the setting just lasts for this visit */ }
}

let toastTimer = 0;
/** A small message at the bottom of the screen, for things like the graphics setting. */
function toast(text) {
  const el = $('#g-toast', S.root);
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function setBanner(text, ms = 2600) {
  const b = $('#g-banner', S.root);
  b.textContent = text;
  b.classList.toggle('show', !!text);
  S.bannerT = text ? ms / 1000 : 0;
}

function onEvent(e) {
  if (e.type === 'pickup') S.audio.pulse(1);
  if (e.type === 'boost') {
    S.audio.boost(e.dur);
    setBanner(`Drift boost${'!'.repeat(e.tier)}`, 1600);
  }
  if (e.type === 'finish') {
    if (e.kind === 'player') setBanner(`You finished ${ordinal(e.place)}!`, 3000);
    else setBanner(`${S.defs[S.oppId].short} finished ${ordinal(e.place)}`, 2600);
  }
  if (e.type === 'over') endLap();
}

// ───────────────────────── frame loop ─────────────────────────

function frame(now) {
  if (!S) return;
  S.raf = requestAnimationFrame(frame);
  const raw = Math.max(0, (now - S.last) / 1000); // the real frame time, for the quality governor
  const dt = Math.min(0.05, raw);
  S.last = now;
  if (S.scene && !window.__armoryNoAdapt) {
    const lv = S.gov.update(raw);
    if (lv !== null) { S.scene.setLevel(lv); toast(`Graphics lowered to keep the race smooth: ${S.gov.label}`); }
  }
  const input = readInput();
  const R = S.race;
  if (S.screen === 'race' && !S.paused && R) {
    S.acc += dt;
    let guard = 0;
    while (S.acc >= SIM && guard++ < 12) {
      R.step(SIM, input);
      S.acc -= SIM;
      for (const e of R.events) onEvent(e);
      if (R.over) break;
    }
    if (R.over) endLap(); // the lap ends whenever the race says it is over, whatever the events did
    const tier = tierOf(R.drift.q);
    if (tier > (S.prevTier || 0)) S.audio.chime(tier); // the charge reached a new tier
    S.prevTier = tier;
    if (S.scene?.fx.onKerb) S.audio.crackle(1); // sparks off the kerb: the same wheels that throw them
    updateHud(input);
  }
  if (S.bannerT > 0) { S.bannerT -= dt; if (S.bannerT <= 0) setBanner(''); }
  if (S.scene) {
    const racing = S.screen === 'race' && !S.paused;
    S.scene.draw(dt, {
      pick: racing && input.pick && R.room > 0,
      brake: racing && input.brake > 0,
      finishView: !racing,
      racing,
    });
    const c = R.player.car;
    S.audio.update({
      speed: Math.abs(c.vx), drift: c.drift, sucking: racing && input.pick && R.room > 0 && R.dust.sucking > 0,
      active: racing, boost: Math.max(0, Math.min(1, (R.drift.vmul - 1) / 0.2)),
    });
  }
}

// ───────────────────────── HUD ─────────────────────────

const lastText = new Map();
function setText(sel, text) {
  if (lastText.get(sel) === text) return;
  lastText.set(sel, text);
  const el = $(sel, S.root);
  if (el.tagName === 'DIV') el.innerHTML = text; // chips are small markup
  else el.textContent = text;
}

function updateHud(input) {
  const R = S.race, P = R.player, A = R.ai, c = P.car;
  const ms = Math.abs(c.vx) * 0.1; // 1 unit = 10 cm
  setText('#g-speed', ms.toFixed(1));
  const chips = [
    `<span class="g-chip">${{ road: 'Road', kerb: 'Kerb', pavement: 'Pavement', grass: 'Off road' }[P.surf] || 'Road'}</span>`,
    c.drift > 0.4 ? '<span class="g-chip hot">Drift</span>' : '',
    input.pick && R.room > 0 ? '<span class="g-chip on">Pick-up on</span>' : '',
    R.room <= 0 ? '<span class="g-chip hot">Tank full</span>' : '',
    R.drift.tier ? `<span class="g-chip boost t${R.drift.tier}">Boost</span>` : '',
  ].join('');
  setText('#g-chips', chips);
  setRing($('#g-bar', S.root), ms / (1.3 * R.drift.vmul)); // the dial's full scale grows with a boost
  const charge = $('#g-charge', S.root);
  const tierNow = String(tierOf(R.drift.q));
  if (charge.dataset.tier !== tierNow) charge.dataset.tier = tierNow;
  charge.classList.toggle('boosting', R.drift.tier > 0);
  setRing($('#g-chargebar', S.root), R.drift.tier > 0 ? 1 : R.drift.q / CHARGE_MAX);
  setText('#g-time', fmtTime(Math.max(0, R.clock)));
  const ahead = P.finished ? P.place === 1 : P.p >= A.p;
  const place = P.finished ? ordinal(P.place) : ahead ? '1st' : '2nd';
  setText('#g-pos', place);
  const gap = Math.abs(P.p - A.p) * 0.1;
  setText('#g-gap', P.finished ? '' : `${ahead ? 'Ahead' : 'Behind'} by ${gap.toFixed(1)} m`);
  setText('#g-dust', String(R.tank));
  setRing($('#g-tankbar', S.root), R.tank / TANK_MAX);
  $('#g-dustg', S.root).classList.toggle('full', R.room <= 0);
  // countdown
  const count = $('#g-count', S.root);
  let cText = '';
  if (R.clock < 0) cText = String(Math.ceil(-R.clock));
  else if (R.clock < 0.9) cText = 'GO';
  if (count.dataset.v !== cText) {
    count.dataset.v = cText;
    count.textContent = cText;
    count.classList.remove('pop');
    void count.offsetWidth;
    count.classList.add('pop');
  }
  count.hidden = !cText;
  drawMap();
}

function drawMap() {
  const canvas = $('#g-map', S.root);
  const g = canvas.getContext('2d');
  const road = S.race.road;
  const W = canvas.width, H = canvas.height;
  if (!S.mapBg) {
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    const b = bg.getContext('2d');
    const bx = road.bounds;
    const k = (W - 36) / Math.max(bx.maxX - bx.minX, bx.maxZ - bx.minZ);
    const ox = (W - (bx.maxX - bx.minX) * k) / 2, oz = (H - (bx.maxZ - bx.minZ) * k) / 2;
    const map = (x, z) => [(x - bx.minX) * k + ox, (z - bx.minZ) * k + oz];
    S.mapXY = map;
    b.lineCap = 'round';
    b.lineJoin = 'round';
    b.strokeStyle = 'rgba(255,255,255,0.22)';
    b.lineWidth = 12;
    b.beginPath();
    for (let i = 0; i <= road.n; i++) {
      const j = i % road.n;
      const [px, py] = map(road.x[j], road.z[j]);
      i ? b.lineTo(px, py) : b.moveTo(px, py);
    }
    b.stroke();
    b.strokeStyle = 'rgba(255,255,255,0.7)';
    b.lineWidth = 2;
    b.stroke();
    const [fx, fy] = map(road.x[0], road.z[0]);
    b.fillStyle = '#ffffff';
    b.fillRect(fx - 3, fy - 3, 6, 6);
    S.mapBg = bg;
  }
  g.clearRect(0, 0, W, H);
  g.drawImage(S.mapBg, 0, 0);
  const dot = (c, col, r) => {
    const [x, y] = S.mapXY(c.x, c.z);
    g.beginPath();
    g.fillStyle = col;
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(0,0,0,0.6)';
    g.stroke();
  };
  dot(S.race.ai.car, S.defs[S.oppId].accent, 6);
  dot(S.race.player.car, S.defs[S.robotId].accent, 7.5);
}

// ───────────────────────── DOM ─────────────────────────

// The round gauges are 270-degree arcs: 75 of the 100 units of a circle's length (pathLength 100),
// started at the lower left and swept clockwise.
const ARC = 75;
const arc = (r, id, cls) => `<circle class="${cls}"${id ? ` id="${id}"` : ''} cx="60" cy="60" r="${r}" pathLength="100" stroke-dasharray="${cls === 'trk' ? ARC : 0} 100" transform="rotate(135 60 60)"/>`;
/** A short mark on the outer arc where each drift tier starts. */
function tierTicks() {
  return TIER_AT.map((t) => {
    const a = ((135 + (t / CHARGE_MAX) * 270) * Math.PI) / 180;
    const p = (r) => `${(60 + Math.cos(a) * r).toFixed(1)}`, q = (r) => `${(60 + Math.sin(a) * r).toFixed(1)}`;
    return `<line class="tick" x1="${p(49)}" y1="${q(49)}" x2="${p(58)}" y2="${q(58)}"/>`;
  }).join('');
}
/** Fill an arc gauge to a fraction (0 to 1). */
function setRing(el, frac) {
  el.setAttribute('stroke-dasharray', `${(Math.max(0, Math.min(1, frac)) * ARC).toFixed(2)} 100`);
}

function buildDom(root) {
  root.dataset.built = '1';
  root.innerHTML = `
    <canvas id="game-gl" aria-label="Race view"></canvas>
    <div class="g-hud" id="g-hud" hidden>
      <div class="g-corner left">
        <div class="g-gauge g-speedo" id="g-charge" data-tier="0" title="Speed, and the drift charge round the outside">
          <svg viewBox="0 0 120 120" aria-hidden="true">${arc(53, '', 'trk')}${arc(53, 'g-chargebar', 'val chg')}${tierTicks()}${arc(41, '', 'trk')}${arc(41, 'g-bar', 'val spd')}</svg>
          <div class="g-readout"><b id="g-speed" class="mono">0.0</b><small>m/s</small></div>
        </div>
        <div class="g-chips" id="g-chips"></div>
      </div>
      <div class="g-card-s g-top">
        <div class="g-lap"><small>Lap</small><b id="g-lap" class="mono">1 / 5</b><span id="g-road">Road 1</span></div>
        <div class="g-timer"><b id="g-time" class="mono">0:00.0</b><span id="g-target">About a minute</span></div>
        <div class="g-pos"><b id="g-pos">1st</b><span id="g-gap"></span></div>
      </div>
      <div class="g-corner right">
        <div class="g-gauge g-dustg" id="g-dustg" title="Dust in the tank">
          <svg viewBox="0 0 120 120" aria-hidden="true">${arc(50, '', 'trk')}${arc(50, 'g-tankbar', 'val')}</svg>
          <div class="g-readout"><b id="g-dust" class="mono">0</b><small>/ ${TANK_MAX}</small></div>
        </div>
        <span class="g-cap">Dust · hold <kbd>Shift</kbd></span>
      </div>
      <div class="g-count" id="g-count" hidden></div>
      <div class="g-banner" id="g-banner" aria-live="polite"></div>
      <div class="g-card-s g-map"><canvas id="g-map" width="240" height="240" aria-label="Road map"></canvas></div>
      <div class="g-keys"><span><kbd>W</kbd> go</span><span><kbd>S</kbd> front brake</span><span><kbd>A</kbd><kbd>D</kbd> steer</span><span><kbd>Space</kbd> drift (hold in a slide, let go to boost)</span><span><kbd>Shift</kbd> pick up dust</span><span><kbd>G</kbd> graphics</span><span><kbd>Esc</kbd> pause</span></div>
    </div>
    <div class="g-screen" id="g-screen"></div>
    <div class="g-toast" id="g-toast" role="status"></div>
    <button class="g-exit" id="g-exit" type="button">Back to viewer</button>`;
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b) act(b.dataset.act);
  });
  $('#g-exit', root).onclick = () => act('exit');
}

function act(name) {
  if (!S) return;
  const [verb, arg] = name.split(':');
  if (verb === 'robot') {
    S.robotId = arg;
    S.oppId = otherRobot(arg);
    buildScene(S.roads[0]);
    $('#g-screen', S.root).innerHTML = robotScreen();
    $('#g-screen [data-focus]', S.root)?.focus();
    return;
  }
  switch (name) {
    case 'to-roads': S.results = []; S.lap = 0; showScreen('roads'); break;
    case 'to-robot': S.results = []; showScreen('robot'); break;
    case 'shuffle': S.roads = makeRoads((Math.random() * 1e9) | 0); buildScene(S.roads[0]); showScreen('roads'); break;
    case 'start': S.results = []; startLap(0); break;
    case 'next-lap': nextLap(); break;
    case 'final': showScreen('final'); break;
    case 'again': S.results = []; S.roads = makeRoads((Math.random() * 1e9) | 0); showScreen('roads'); break;
    case 'resume': pause(false); break;
    case 'restart-lap': startLap(S.lap); break;
    case 'exit': closeRace(); break;
    default: break;
  }
}

// Esc pauses and resumes; the rest of the keys are read by the race.
addEventListener('keydown', (e) => {
  if (!S) return;
  if (e.code === 'KeyG' && !e.repeat && !e.metaKey && !e.ctrlKey) { // G steps through the graphics settings
    saveMode(S.gov.cycle());
    S.scene?.setLevel(S.gov.level);
    toast(`Graphics: ${S.gov.label}`);
    return;
  }
  if (e.code !== 'Escape') return;
  if (S.screen === 'race') pause(true);
  else if (S.screen === 'pause') pause(false);
});

// For tests: opening the page with ?racedebug exposes the live race, so a test can step it directly
// instead of waiting for frames (software rendering is far too slow to play a lap in real time).
if (typeof location !== 'undefined' && /[?&]racedebug\b/.test(location.search)) {
  window.__raceDbg = { get S() { return S; }, get renderer() { return renderer; }, readInput, driverInput };
}
