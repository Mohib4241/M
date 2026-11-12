// Hand control client. Gets hand points and gesture commands from one of two sources and
// turns them into viewer actions:
//   - "Python": jarvis.py on your own computer, reached over a local WebSocket
//   - "Browser": MediaPipe running inside this tab (used on a deployed site, e.g. Render)
import { BrowserTracker } from './handcam.js';
import { Hands3D } from './hands3d.js';
import { solvePose, place, moveFrom, Smoother } from './mirror.js';

const HAND_LINKS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];
// the body tracker's points, joined for the small preview
const BODY_LINKS = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [0, 7], [0, 8], [7, 8],
  [15, 17], [15, 19], [17, 19], [15, 21], [16, 18], [16, 20], [18, 20], [16, 22], [27, 29], [29, 31], [27, 31], [28, 30], [30, 32], [28, 32]];
const BODY_DOTS = [0, 7, 8, 11, 12, 13, 14, 15, 16, 19, 20, 23, 24, 25, 26, 27, 28, 31, 32];
// the regions the body mirror follows, as shown in the panel
const REGIONS = [['head', 'Head'], ['arms', 'Arms'], ['hands', 'Hands'], ['torso', 'Body'], ['legs', 'Legs'], ['feet', 'Feet']];
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
  const hands3d = new Hands3D(stage, $('#tether-label'));
  stage.hands3d = hands3d; // exposed for debugging
  const handsBtn = $('#hands3d-btn');
  const backdropBtn = $('#backdrop-btn');
  const mirrorBtn = $('#mirror-btn');
  let mirrorWanted = true; // with a robot that has joints open, the camera follows your body
  let mirroring = false;
  let pendingPose = null;
  let raf2 = 0;
  let poseSeen = '';
  let placeBase = null, placeN = 0, lostAt = 0; // where you stood when the mirror began
  const smWorld = new Smoother(), smPic = new Smoother({ minCutoff: 1, beta: 3 }); // steady points in, steady robot out
  let smT = 0;
  const regionEls = {};
  for (const [key] of REGIONS) regionEls[key] = $(`#jarvis-pip .regions [data-r="${key}"]`);
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
  let pyVideo = false; // does jarvis.py offer the camera picture?
  let pyCanvas = null;
  let pyCtx = null;
  let decoding = false;
  let autoFocused = false; // hand control hides the panels so your hands have the whole stage

  const say = (t) => { status.textContent = t; };

  function setState(s, src = '') {
    state = s;
    const on = s !== 'idle';
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = s === 'idle' ? 'Start hand control' : s === 'connecting' ? 'Starting…' : 'Stop hand control';
    app.classList.toggle('jarvis', s === 'running');
    pip.hidden = s !== 'running';
    hands3d.running = s === 'running';
    const focusBtn = $('#focus-btn');
    if (s === 'running' && !app.classList.contains('focus')) { focusBtn.click(); autoFocused = true; }
    if (s === 'idle' && autoFocused) { if (app.classList.contains('focus')) focusBtn.click(); autoFocused = false; }
    if (s === 'idle') { pyCanvas = null; pyVideo = false; stage.setBackdrop(null); backdropBtn.setAttribute('aria-pressed', 'false'); backdropBtn.disabled = true; }
    pipSrc.textContent = src ? (src === 'python' ? 'Python script' : 'this browser') : '';
    if (s !== 'running') { reticle.classList.remove('on', 'pinch'); stage._hoverAt = null; }
    syncMirror();
  }

  // Body mirror: on while hand control runs in this browser, the open robot has joints, and the button is on.
  function syncMirror() {
    const can = stage.posable;
    mirrorBtn.hidden = !can;
    const browser = !!tracker;
    mirrorBtn.disabled = state === 'running' && !browser; // the Python script tracks hands only
    mirrorBtn.title = mirrorBtn.disabled ? 'The body mirror uses this browser\'s camera. Open the deployed site, or stop the Python script, to use it.' : 'The robot copies your whole body: head, arms, hands, body, legs, feet and where you step.';
    mirrorBtn.setAttribute('aria-pressed', String(mirrorWanted));
    const on = state === 'running' && browser && can && mirrorWanted;
    if (on === mirroring) return;
    mirroring = on;
    app.classList.toggle('mirroring', on);
    $('#jarvis-pip .pip-head b').firstChild.textContent = on ? 'Body tracking ' : 'Hand tracking ';
    if (tracker) tracker.setMode(on ? 'body' : 'hands').catch(() => {});
    if (on) {
      // face the robot, like a mirror, and stop the slow orbit
      stage.cam.az = 0; stage.cam.el = 0.1;
      stage.select(null);
      if (stage.eT > 0.02) stage.setExplode(0);
      reticle.classList.remove('on', 'pinch'); stage._hoverAt = null;
      lastMode = ''; poseSeen = ''; placeBase = null; placeN = 0; smWorld.reset(); smPic.reset();
      say('Stand back until the camera sees you from head to feet.');
    } else {
      pendingPose = null;
      stage.setPose(null);
      if (state === 'running') { lastMode = ''; say('Show your hands.'); }
    }
  }
  stage.on('robot', syncMirror);
  mirrorBtn.addEventListener('click', () => { mirrorWanted = !mirrorWanted; syncMirror(); });

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
    stage.setPose(null);
    setState('idle');
    say('');
  }

  // ───── sources ─────
  // Python script over WebSocket. Resolves true once connected, false if nothing answers.
  function tryPython() {
    return new Promise((resolve) => {
      let opened = false;
      try { ws = new WebSocket(`ws://${location.host}/ws`); } catch { resolve(false); return; }
      ws.binaryType = 'blob';
      ws.onopen = () => {
        opened = true;
        ws.send(JSON.stringify({ type: 'start' }));
        say('Opening the camera…');
        resolve(true);
      };
      ws.onmessage = (ev) => {
        if (typeof ev.data !== 'string') { onPicture(ev.data); return; } // a camera picture for the backdrop
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
      onMessage: (m) => { if (m.type === 'frame') queueFrame(m); else if (m.type === 'pose') queuePose(m); else handle(m, 'browser'); },
      onStatus: say,
    });
    try {
      await tracker.start();
      setState('running', 'browser');
      syncMirror();
      backdropBtn.disabled = false; // the browser camera can also be shown behind the robot
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
  handsBtn.addEventListener('click', () => {
    hands3d.enabled = handsBtn.getAttribute('aria-pressed') !== 'true';
    handsBtn.setAttribute('aria-pressed', String(hands3d.enabled));
  });
  backdropBtn.addEventListener('click', () => {
    const on = backdropBtn.getAttribute('aria-pressed') !== 'true';
    if (tracker) {
      const video = tracker.videoElement;
      if (on && !video) return;
      stage.setBackdrop(on ? video : null); // the browser camera, flipped like a mirror
    } else if (ws && ws.readyState === 1 && pyVideo) {
      backdropBtn.setAttribute('aria-pressed', String(on)); // set first: late pictures are ignored once it is off
      ws.send(JSON.stringify({ type: 'video', on }));
      if (!on) { stage.setBackdrop(null); pyCanvas = null; }
    } else return;
    backdropBtn.setAttribute('aria-pressed', String(on));
  });

  // Pictures from jarvis.py (already mirrored) are drawn into a canvas that becomes the backdrop.
  function onPicture(blob) {
    if (decoding || backdropBtn.getAttribute('aria-pressed') !== 'true') return;
    decoding = true;
    createImageBitmap(blob).then((bmp) => {
      if (backdropBtn.getAttribute('aria-pressed') !== 'true') { bmp.close(); return; }
      if (!pyCanvas || pyCanvas.width !== bmp.width || pyCanvas.height !== bmp.height) {
        pyCanvas = document.createElement('canvas');
        pyCanvas.width = bmp.width;
        pyCanvas.height = bmp.height;
        pyCtx = pyCanvas.getContext('2d');
        stage.setBackdrop(pyCanvas, { mirror: false });
      }
      pyCtx.drawImage(bmp, 0, 0);
      bmp.close();
      stage.updateBackdrop();
    }).catch(() => { /* skip a bad picture */ }).finally(() => { decoding = false; });
  }
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
    raf = requestAnimationFrame(() => { raf = 0; const f = pending; pending = null; if (f && state === 'running' && !mirroring) frame(f); });
  }

  function queuePose(m) {
    pendingPose = m;
    if (raf2) return;
    raf2 = requestAnimationFrame(() => { raf2 = 0; const f = pendingPose; pendingPose = null; if (f && state === 'running' && mirroring) poseFrame(f); });
  }

  function poseFrame(m) {
    stage.lastInput = stage.time; // keep the view still while you are in front of it
    const rig = stage.def && stage.def.rig;
    if (m.world) {
      const t = performance.now() / 1000, dt = t - smT; smT = t;
      m.world = smWorld.points(m.world, t);
      m.lm = smPic.points(m.lm, t);
      m.vis = smWorld.seen(m.vis, dt);
    } else { smWorld.reset(); smPic.reset(); }
    const pose = m.world ? solvePose(m.world, m.vis, rig ? { thigh: rig.thigh, shin: rig.shin } : {}) : null;
    if (pose) {
      // where you stand: the first steady second sets the starting place, and the robot steps from there
      const vid = tracker && tracker.videoElement;
      const at = place(m.lm, m.vis, vid && vid.videoWidth ? vid.videoWidth / vid.videoHeight : 4 / 3);
      if (at) {
        lostAt = 0;
        if (placeN < 12) { placeN++; placeBase = placeBase ? { x: placeBase.x + (at.x - placeBase.x) / placeN, s: placeBase.s + (at.s - placeBase.s) / placeN, aspect: at.aspect } : at; }
        else pose.move = moveFrom(placeBase, at, { trunk: rig && rig.trunk ? rig.trunk : 3 });
      } else if (placeBase) { // out of view for two seconds: start again from wherever you come back
        if (!lostAt) lostAt = stage.time;
        else if (stage.time - lostAt > 2) { placeBase = null; placeN = 0; }
      }
    }
    stage.setPose(pose || { yaw: 0, lift: 0, q: {} }); // nobody in view: stand at rest, still facing you
    const s = pose && pose.seen;
    const any = (a) => a[0] || a[1];
    const lit = { head: !!s && s.head, arms: !!s && any(s.arms), hands: !!s && any(s.hands), torso: !!s && s.torso, legs: !!s && any(s.legs), feet: !!s && any(s.feet) };
    const seen = !s ? 'none' : s.all ? 'full' : !any(s.arms) ? 'shoulders' : any(s.legs) ? 'most' : 'upper';
    const key = seen + REGIONS.map(([k]) => (lit[k] ? 1 : 0)).join('');
    const count = REGIONS.filter(([k]) => lit[k]).length;
    const shown = `${seen === 'none' ? 'no body' : seen === 'full' ? 'whole body' : `${count} of ${REGIONS.length}`}${m.fps ? ` · ${m.fps} fps` : ''}`;
    if (shown !== lastShown) { lastShown = shown; pipMode.textContent = shown; }
    if (key !== poseSeen) {
      poseSeen = key;
      for (const [k] of REGIONS) if (regionEls[k]) regionEls[k].classList.toggle('on', lit[k]);
      say(seen === 'none' ? 'Step into view: the camera needs your shoulders.'
        : seen === 'full' ? 'Tracking your whole body: head, arms, hands, body, legs and feet.'
          : seen === 'shoulders' ? 'Raise your arms into view.'
            : seen === 'upper' ? 'Tracking your head, arms and hands. Step back to add your legs and feet.'
              : 'Almost all of you. Step back a little so nothing is cut off.');
    }
    nframe++;
    if (nframe % 30 === 1) accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || accent;
    drawBody(m);
  }

  function drawBody(m) {
    const W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    g.fillStyle = document.documentElement.dataset.look === 'holo' ? 'rgba(2,10,18,.55)' : 'rgba(14,27,38,.82)';
    g.fillRect(0, 0, W, H);
    if (!m.lm) return;
    const ok = (i) => (m.vis ? m.vis[i] : 1) >= 0.5;
    g.lineCap = 'round'; g.strokeStyle = accent; g.lineWidth = 2.5;
    g.beginPath();
    for (const [a, b] of BODY_LINKS) { if (!ok(a) || !ok(b)) continue; g.moveTo(m.lm[a][0] * W, m.lm[a][1] * H); g.lineTo(m.lm[b][0] * W, m.lm[b][1] * H); }
    g.stroke();
    g.fillStyle = '#fff';
    for (const i of BODY_DOTS) { if (!ok(i)) continue; g.beginPath(); g.arc(m.lm[i][0] * W, m.lm[i][1] * H, 2.6, 0, 6.3); g.fill(); }
  }

  function toPage(nx, ny, r = app.getBoundingClientRect()) {
    const [sx, sy] = stage.backdropMap(nx, ny); // identity unless the camera backdrop crops the video
    return { x: r.left + clamp(sx, 0, 1) * r.width, y: r.top + clamp(sy, 0, 1) * r.height };
  }

  function handle(m, src) {
    switch (m.type) {
      case 'hello': pyVideo = !!m.video; break;
      case 'status':
        if (m.state === 'running') {
          setState('running', src);
          say(m.message || 'Show your hands.');
          if (src === 'python' && pyVideo) backdropBtn.disabled = false; // the script can show the camera behind the robot
        }
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
        const ids = [...document.querySelectorAll('.robot-tab')].map((t) => t.dataset.robot);
        const next = ids[(ids.indexOf(app.dataset.robot) + 1) % ids.length]; // the next robot along the tabs
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
    hands3d.setFrame(m);
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
