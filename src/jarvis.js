// Hand control client. Talks to jarvis.py over a local WebSocket and turns what it
// sends (hand points and gesture commands) into viewer actions.
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
  const reticle = $('#reticle');
  const cv = pip.querySelector('canvas');
  const g = cv.getContext('2d');
  // Only the copy served by jarvis.py (http://localhost) may connect; it rejects every other origin.
  const local = location.protocol === 'http:' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

  let ws = null;
  let state = 'idle'; // idle | connecting | running
  let lastMode = '';
  let pending = null; // newest hand frame, drawn once per animation frame (stale ones are dropped)
  let raf = 0;
  let nframe = 0;
  let accent = '#3de0ff';

  const say = (t) => { status.textContent = t; };

  function setState(s) {
    state = s;
    const on = s !== 'idle';
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = s === 'idle' ? 'Start hand control' : s === 'connecting' ? 'Starting…' : 'Stop hand control';
    app.classList.toggle('jarvis', s === 'running');
    pip.hidden = s !== 'running';
    if (s !== 'running') { reticle.classList.remove('on', 'pinch'); stage._hoverAt = null; }
  }

  function showHelp(kind, message) {
    const title = $('#jarvis-help-title');
    const body = $('#jarvis-help-body');
    if (kind === 'error') {
      title.textContent = 'The camera could not start';
      body.textContent = message || 'Check that no other app is using the camera.';
      $('#jarvis-help-steps').hidden = true;
    } else {
      title.textContent = kind === 'remote' ? 'Hand control runs from the local copy' : 'Start the hand-tracking script first';
      body.textContent = kind === 'remote'
        ? 'A web page cannot open your camera into Python by itself. Run the script on your computer; it serves this viewer at http://localhost:8765 with the Start button connected.'
        : 'The page could not reach the script. Run these two commands in a terminal, then click Start again in the page it opens.';
      $('#jarvis-help-steps').hidden = false;
    }
    help.hidden = false;
  }

  function end() {
    if (ws) { try { ws.close(); } catch { /* already closed */ } }
    ws = null;
    setState('idle');
    say('');
  }

  function start() {
    help.hidden = true;
    if (!local) { showHelp('remote'); return; }
    setState('connecting');
    say('Connecting…');
    let opened = false;
    try {
      ws = new WebSocket(`ws://${location.host}/ws`);
    } catch {
      end(); showHelp('noscript'); return;
    }
    ws.onopen = () => { opened = true; ws.send(JSON.stringify({ type: 'start' })); say('Opening the camera…'); };
    ws.onmessage = (ev) => {
      try {
        const m = JSON.parse(ev.data);
        if (m.type === 'frame') queueFrame(m); else handle(m); // commands are never dropped, frames can be
      } catch { /* ignore a malformed message */ }
    };
    ws.onclose = () => { const was = state; end(); if (!opened && was === 'connecting') showHelp('noscript'); };
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

  // ───── messages from the script ─────
  function queueFrame(m) {
    pending = m;
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; const f = pending; pending = null; if (f && state === 'running') frame(f); });
  }

  function toPage(nx, ny, r = app.getBoundingClientRect()) {
    return { x: r.left + clamp(nx, 0, 1) * r.width, y: r.top + clamp(ny, 0, 1) * r.height };
  }

  function handle(m) {
    switch (m.type) {
      case 'status':
        if (m.state === 'running') { setState('running'); say(m.message || 'Show your hands.'); }
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
    if (label !== lastMode) {
      lastMode = label;
      pipMode.textContent = label;
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
