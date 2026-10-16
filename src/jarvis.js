// Hand control client. Gets hand points and gesture commands from one of two sources and
// turns them into viewer actions:
//   - "Python": jarvis.py on your own computer, reached over a local WebSocket
//   - "Browser": MediaPipe running inside this tab (used on a deployed site, e.g. Render)
import { BrowserTracker } from './handcam.js';

const HAND_LINKS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];
const CMD = 'pip install mediapipe opencv-python aiohttp\npython3 jarvis.py';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function initJarvis({ stage, app, $ }) {
  const btn = $('#jarvis-btn');
  const status = $('#jarvis-status');
  const help = $('#jarvis-help');
  const pip = $('#jarvis-pip');
  const pipMode = $('#pip-mode');
  const pipSrc = $('#pip-src');
  const reticle = $('#reticle');
  const cv = pip.querySelector('canvas');
  const g = cv.getContext('2d');
  // Page served by jarvis.py (or any localhost server): try the Python script first.
  const local = location.protocol === 'http:' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

  let ws = null;
  let tracker = null;
  let state = 'idle'; // idle | connecting | running
  let lastMode = '';
  let lastShown = '';
  let pending = null; // newest hand frame, drawn once per animation frame (stale ones are dropped)
  let raf = 0;
  let nframe = 0;
  let accent = '#3de0ff';

  const say = (t) => { status.textContent = t; };

  function setState(s, src = '') {
    state = s;
    const on = s !== 'idle';
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = s === 'idle' ? 'Start hand control' : s === 'connecting' ? 'Starting…' : 'Stop hand control';
    app.classList.toggle('jarvis', s === 'running');
    pip.hidden = s !== 'running';
    pipSrc.textContent = src ? (src === 'python' ? 'Python script' : 'this browser') : '';
    if (s !== 'running') { reticle.classList.remove('on', 'pinch'); stage._hoverAt = null; }
  }

  const HELP = {
    remote: {
      title: 'Open the served copy for hand control',
      body: 'Hand control needs a page that can use your camera: the deployed site, or this viewer served by the Python script on your own computer.',
      steps: true,
    },
    embedded: {
      title: 'Hand control cannot run in a preview',
      body: 'Embedded previews block the camera. Open the deployed site in its own tab, or run the Python script on your computer.',
      steps: true,
    },
    insecure: {
      title: 'The camera needs a secure page',
      body: 'Browsers only allow camera access on https pages or on localhost. Open the site over https (Render provides this), or run the Python script locally.',
      steps: true,
    },
    denied: {
      title: 'Camera access is blocked',
      body: 'Allow the camera for this site (the camera icon in the address bar, or the browser’s site settings), then press Start again.',
    },
    nocamera: {
      title: 'No camera found',
      body: 'Plug in or enable a webcam, close other apps that use it, then press Start again.',
    },
    load: {
      title: 'Hand tracking could not load',
      body: 'The hand model comes from Google’s storage and the tracking runtime from this site. Check your connection and that the site was built with `npm run build`, then try again.',
    },
    error: { title: 'The camera could not start', body: '' },
  };

  function showHelp(kind, message) {
    const h = HELP[kind] || HELP.error;
    $('#jarvis-help-title').textContent = h.title;
    $('#jarvis-help-body').textContent = h.body || message || 'Check that no other app is using the camera.';
    $('#jarvis-help-steps').hidden = !h.steps;
    help.hidden = false;
  }

  function end() {
    if (ws) { try { ws.close(); } catch { /* already closed */ } }
    ws = null;
    if (tracker) { tracker.stop(); tracker = null; }
    setState('idle');
    say('');
  }

  // ───── sources ─────
  // Python script over WebSocket. Resolves true once connected, false if nothing answers.
  function tryPython() {
    return new Promise((resolve) => {
      let opened = false;
      try { ws = new WebSocket(`ws://${location.host}/ws`); } catch { resolve(false); return; }
      ws.onopen = () => {
        opened = true;
        ws.send(JSON.stringify({ type: 'start' }));
        say('Opening the camera…');
        resolve(true);
      };
      ws.onmessage = (ev) => {
        try {
          const m = JSON.parse(ev.data);
          if (m.type === 'frame') queueFrame(m); else handle(m, 'python'); // commands are never dropped
        } catch { /* ignore a malformed message */ }
      };
      ws.onclose = () => { ws = null; if (!opened) resolve(false); else if (state !== 'idle') { end(); } };
    });
  }

  async function startBrowser() {
    tracker = new BrowserTracker({
      onMessage: (m) => { if (m.type === 'frame') queueFrame(m); else handle(m, 'browser'); },
      onStatus: say,
    });
    try {
      await tracker.start();
      setState('running', 'browser');
      say('Show your hands.');
    } catch (e) {
      const kind = e.kind || 'error';
      end();
      showHelp(kind, e.message);
    }
  }

  async function start() {
    help.hidden = true;
    if (location.protocol === 'file:') { showHelp('remote'); return; }
    if (window.top !== window.self) { showHelp('embedded'); return; }
    setState('connecting');
    say('Connecting…');
    if (local) {
      say('Looking for jarvis.py…');
      if (await tryPython()) return; // the script answers; it reports "running" itself
    }
    if (state !== 'connecting') return; // stopped while waiting
    await startBrowser();
  }

  function stop() {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'stop' }));
    end();
  }

  btn.addEventListener('click', () => { if (state === 'idle') start(); else stop(); });
  $('#jarvis-help-close').addEventListener('click', () => { help.hidden = true; });
  $('#jarvis-help-copy').addEventListener('click', async () => {
    const b = $('#jarvis-help-copy');
    try { await navigator.clipboard.writeText(CMD); b.textContent = 'Copied'; } catch { b.textContent = 'Select and copy'; }
    setTimeout(() => { b.textContent = 'Copy commands'; }, 1600);
  });

  // ───── messages from either source ─────
  function queueFrame(m) {
    pending = m;
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; const f = pending; pending = null; if (f && state === 'running') frame(f); });
  }

  function toPage(nx, ny, r = app.getBoundingClientRect()) {
    return { x: r.left + clamp(nx, 0, 1) * r.width, y: r.top + clamp(ny, 0, 1) * r.height };
  }

  function handle(m, src) {
    switch (m.type) {
      case 'status':
        if (m.state === 'running') { setState('running', src); say(m.message || 'Show your hands.'); }
        else if (m.state === 'starting') { say(m.message || 'Opening the camera…'); }
        else if (m.state === 'error') { end(); showHelp('error', m.message); }
        else if (m.state === 'stopped' && state !== 'idle') { end(); }
        break;
      case 'orbit':
        stage.cam.az -= m.dx * 4.4;
        stage.cam.el = clamp(stage.cam.el + m.dy * 3.2, -0.08, 1.42);
        touch();
        break;
      case 'explode': stage.nudgeExplode(m.delta); break;
      case 'explode_to': stage.setExplode(m.value); stage.emit('input'); break;
      case 'click': click(m.x, m.y); break;
      case 'swap': {
        const next = app.dataset.robot === 'phantas' ? 'cc1pro' : 'phantas';
        $(`.robot-tab[data-robot="${next}"]`).click();
        break;
      }
      default: break;
    }
  }

  function touch() { stage.lastInput = stage.time; stage.emit('input'); }

  function click(nx, ny) {
    const { x, y } = toPage(nx, ny);
    pulse();
    const el = document.elementFromPoint(x, y);
    const target = el && el.closest('button, [role="tab"], a, summary, input');
    if (target && !target.closest('#jarvis-pip, #jarvis-help')) {
      if (target.type === 'range') {
        const r = target.getBoundingClientRect();
        target.value = String(clamp((x - r.left) / r.width, 0, 1) * (+target.max || 1));
        target.dispatchEvent(new Event('input', { bubbles: true }));
      } else target.click();
    } else if (!el || el === stage.canvas) {
      stage.pickAt(x, y);
    }
    touch();
  }

  function pulse() {
    reticle.classList.remove('click');
    void reticle.offsetWidth; // restart the animation
    reticle.classList.add('click');
  }

  function frame(m) {
    const n = m.hands.length;
    if (n) stage.lastInput = stage.time; // hands in view: keep auto-orbit paused
    const label = m.mode === 'two' ? 'two hands' : n === 1 ? 'one hand' : 'no hands';
    const shown = m.fps ? `${label} · ${m.fps} fps` : label;
    if (shown !== lastShown) { lastShown = shown; pipMode.textContent = shown; }
    if (label !== lastMode) {
      lastMode = label;
      say(m.mode === 'two' ? 'Two hands: pull apart or push together' : n === 1 ? 'One hand: pinch to grab or click' : 'Show your hands');
    }
    nframe++;
    if (nframe % 30 === 1) accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || accent;
    drawPip(m);
    const c = m.cursor;
    if (c) {
      const r = app.getBoundingClientRect();
      const { x, y } = toPage(c.x, c.y, r);
      reticle.style.transform = `translate(${x - r.left}px, ${y - r.top}px)`;
      reticle.classList.add('on');
      reticle.classList.toggle('pinch', !!c.pinching);
      if (nframe % 4 === 0) { // hit-testing forces layout, so do it a few times a second
        const under = document.elementFromPoint(x, y);
        stage._hoverAt = under === stage.canvas ? { x, y } : null;
      }
    } else {
      reticle.classList.remove('on', 'pinch');
      stage._hoverAt = null;
    }
  }

  function drawPip(m) {
    const W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    const dark = document.documentElement.dataset.look === 'holo';
    g.fillStyle = dark ? 'rgba(2,10,18,.55)' : 'rgba(14,27,38,.82)';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,.07)';
    g.lineWidth = 1;
    for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo((W / 6) * i, 0); g.lineTo((W / 6) * i, H); g.stroke(); }
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(0, (H / 4) * i); g.lineTo(W, (H / 4) * i); g.stroke(); }
    g.lineCap = 'round';
    for (const h of m.hands) {
      g.strokeStyle = accent;
      g.lineWidth = 2;
      g.beginPath();
      for (const [a, b] of HAND_LINKS) { g.moveTo(h.lm[a][0] * W, h.lm[a][1] * H); g.lineTo(h.lm[b][0] * W, h.lm[b][1] * H); }
      g.stroke();
      g.fillStyle = '#fff';
      for (const p of h.lm) { g.beginPath(); g.arc(p[0] * W, p[1] * H, 2.2, 0, 6.3); g.fill(); }
      const t = h.lm[4], i = h.lm[8];
      g.strokeStyle = h.shape === 'pinch' ? '#ffd166' : 'rgba(255,255,255,.5)';
      g.lineWidth = h.shape === 'pinch' ? 3 : 1;
      g.beginPath(); g.moveTo(t[0] * W, t[1] * H); g.lineTo(i[0] * W, i[1] * H); g.stroke();
    }
  }
}
