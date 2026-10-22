// Every texture the race scene uses, drawn with the canvas 2D API (no image files). Each one is
// made once and reused for every lap through `cached`.
import * as THREE from 'three';
import { rng } from './rng.js';

const TEX = {};
export const cached = (key, make) => (TEX[key] ||= make());

export function canvasTexWH(w, h, draw, { repeat = null, srgb = true, wrap = true, aniso = 8 } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(...repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}
export const canvasTex = (size, draw, opts) => canvasTexWH(size, size, (g, w) => draw(g, w), opts);

const FONT = '"Arial Black", Impact, "Helvetica Neue", Arial, sans-serif';

/** Neon text: a bright core with a coloured glow. */
function neon(g, text, x, y, size, color, { align = 'center', glow = 26 } = {}) {
  g.font = `900 ${size}px ${FONT}`;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = glow;
  g.fillStyle = color;
  g.fillText(text, x, y);
  g.shadowBlur = glow / 2;
  g.fillStyle = '#ffffff';
  g.fillText(text, x, y);
  g.shadowBlur = 0;
}

// ───────────────────────── road and ground ─────────────────────────

export const asphaltTex = () => canvasTex(512, (g, s) => {
  g.fillStyle = '#3d4248';
  g.fillRect(0, 0, s, s);
  const r = rng(77);
  for (let i = 0; i < 5200; i++) {
    const v = 40 + r() * 46;
    g.fillStyle = `rgba(${v},${v + 2},${v + 6},${0.5 + r() * 0.4})`;
    g.fillRect(r() * s, r() * s, 1 + r() * 2.2, 1 + r() * 2.2);
  }
  for (let i = 0; i < 70; i++) { // a few patches and tyre-worn streaks
    g.fillStyle = `rgba(20,22,26,${0.08 + r() * 0.12})`;
    g.beginPath(); g.ellipse(r() * s, r() * s, 10 + r() * 40, 4 + r() * 12, r() * 3, 0, Math.PI * 2); g.fill();
  }
});

/** The car park around the track: dark asphalt with a faint seam where one slab meets the next. */
export const carParkTex = () => canvasTex(256, (g, s) => {
  g.fillStyle = '#20232a';
  g.fillRect(0, 0, s, s);
  const r = rng(31);
  for (let i = 0; i < 1800; i++) {
    const v = 26 + r() * 22;
    g.fillStyle = `rgba(${v},${v + 1},${v + 5},${0.4 + r() * 0.4})`;
    g.fillRect(r() * s, r() * s, 1 + r() * 2, 1 + r() * 2);
  }
  for (let i = 0; i < 12; i++) { // oil stains
    g.fillStyle = `rgba(10,11,14,${0.15 + r() * 0.2})`;
    g.beginPath(); g.ellipse(r() * s, r() * s, 6 + r() * 20, 4 + r() * 10, r() * 3, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = 'rgba(8,9,12,0.8)';
  g.lineWidth = 2;
  g.strokeRect(0, 0, s, s);
}, { repeat: [64, 64] });

export const concreteTex = () => canvasTex(256, (g, s) => {
  g.fillStyle = '#b9bcbf';
  g.fillRect(0, 0, s, s);
  const r = rng(9);
  for (let i = 0; i < 900; i++) {
    const v = 150 + r() * 60;
    g.fillStyle = `rgba(${v},${v},${v + 2},0.35)`;
    g.fillRect(r() * s, r() * s, 2 + r() * 4, 2 + r() * 4);
  }
  g.strokeStyle = 'rgba(70,74,78,0.7)';
  g.lineWidth = 2;
  g.strokeRect(0, 0, s, s); // one paving slab
});

export const checkerTex = () => canvasTex(128, (g, s) => {
  const n = 8, q = s / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
    g.fillStyle = (i + j) % 2 ? '#f4f4f1' : '#15171a';
    g.fillRect(i * q, j * q, q, q);
  }
});

export const dotTex = () => canvasTex(64, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, s, s);
}, { srgb: false });

export const mouthTex = () => canvasTex(128, (g, s) => {
  g.clearRect(0, 0, s, s);
  g.fillStyle = 'rgba(120,230,255,0.9)';
  for (let x = -s; x < s * 2; x += 36) {
    g.beginPath(); g.moveTo(x, s); g.lineTo(x + 18, s); g.lineTo(x + 18 + s, 0); g.lineTo(x + s, 0); g.fill();
  }
});

// ───────────────────────── barrier ─────────────────────────

/** Concrete barrier panels with a joint every half tile. u runs along the road, 12 units a tile. */
export const barrierTex = () => canvasTexWH(256, 128, (g, w, h) => {
  g.fillStyle = '#767a82';
  g.fillRect(0, 0, w, h);
  const r = rng(21);
  for (let i = 0; i < 1400; i++) {
    const v = 105 + r() * 40;
    g.fillStyle = `rgba(${v},${v + 1},${v + 5},0.3)`;
    g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3);
  }
  for (let i = 0; i < 9; i++) { // rain streaks
    const x = r() * w;
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(40,44,50,0.28)');
    gr.addColorStop(1, 'rgba(40,44,50,0)');
    g.fillStyle = gr;
    g.fillRect(x, 0, 2 + r() * 4, h);
  }
  g.fillStyle = 'rgba(25,28,33,0.9)';
  g.fillRect(0, 0, 3, h);
  g.fillRect(w / 2 - 1, 0, 3, h);
  g.fillStyle = 'rgba(25,28,33,0.7)';
  g.fillRect(0, h - 6, w, 6); // dirt at the foot
});

/** The moving chase lights on the barrier: bright, dim, bright, dim every two units. */
export const stripeTex = () => canvasTexWH(128, 8, (g, w, h) => {
  g.fillStyle = 'rgba(255,255,255,1)';
  g.fillRect(0, 0, w / 2, h);
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.fillRect(w / 2, 0, w / 2, h);
});

// ───────────────────────── buildings ─────────────────────────

/** The front of four pit garages, 2 x 2 cells of 4 roller shutters (numbers 01 to 16). */
export const garageTex = () => canvasTexWH(1024, 768, (g, W, H) => {
  const cw = W / 2, ch = H / 2;
  const r = rng(404);
  for (let cell = 0; cell < 4; cell++) {
    const ox = (cell % 2) * cw, oy = Math.floor(cell / 2) * ch;
    g.save();
    g.translate(ox, oy);
    g.fillStyle = '#1b1f27';
    g.fillRect(0, 0, cw, ch);
    // sign band
    g.fillStyle = '#0e1117';
    g.fillRect(0, 0, cw, 70);
    g.fillStyle = '#35f0ff';
    g.shadowColor = '#35f0ff'; g.shadowBlur = 16;
    g.fillRect(14, 64, cw - 28, 4);
    g.fillStyle = '#ff3fa4';
    g.shadowColor = '#ff3fa4';
    g.fillRect(14, 10, cw - 28, 3);
    g.shadowBlur = 0;
    neon(g, 'PIT LANE', cw / 2, 38, 34, '#ffd15c', { glow: 14 });
    // four shutters
    for (let i = 0; i < 4; i++) {
      const x = 14 + i * ((cw - 28) / 4) + 4, w = (cw - 28) / 4 - 8, y = 92, h = 236;
      const open = r() < 0.34;
      g.fillStyle = '#10131a';
      g.fillRect(x - 3, y - 3, w + 6, h + 6);
      if (open) { // raised: a warm lit bay behind
        const gr = g.createLinearGradient(0, y, 0, y + h);
        gr.addColorStop(0, '#ffe2a8'); gr.addColorStop(1, '#8a5222');
        g.fillStyle = gr;
        g.fillRect(x, y + h * 0.42, w, h * 0.58);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(x + w * 0.2, y + h * 0.66, w * 0.6, h * 0.34); // a shape in the bay
        g.fillStyle = '#4a5160';
        g.fillRect(x, y, w, h * 0.42);
      } else {
        const gr = g.createLinearGradient(0, y, 0, y + h);
        gr.addColorStop(0, '#4b5364'); gr.addColorStop(1, '#2a303b');
        g.fillStyle = gr;
        g.fillRect(x, y, w, h);
      }
      g.fillStyle = 'rgba(0,0,0,0.45)';
      for (let k = 0; k < (open ? h * 0.42 : h); k += 12) g.fillRect(x, y + k, w, 2); // slats
      // number plate
      const n = String(cell * 4 + i + 1).padStart(2, '0');
      g.fillStyle = '#f2c230';
      g.fillRect(x + w / 2 - 22, y - 2, 44, 26);
      g.fillStyle = '#10131a';
      g.font = `900 20px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(n, x + w / 2, y + 12);
    }
    // hazard strip along the foot
    for (let x = -20; x < cw + 20; x += 28) {
      g.fillStyle = '#f2c230';
      g.beginPath(); g.moveTo(x, ch); g.lineTo(x + 14, ch); g.lineTo(x + 28, ch - 30); g.lineTo(x + 14, ch - 30); g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,0.9)';
    g.fillRect(0, ch - 34, cw, 4);
    g.restore();
  }
}, { wrap: false });

/** Rows of spectators, heads and shoulders in club colours, with the odd phone light. */
export const crowdTex = () => canvasTexWH(1024, 256, (g, w, h) => {
  g.fillStyle = '#12141a';
  g.fillRect(0, 0, w, h);
  const r = rng(77);
  const shirts = ['#2fd6e6', '#ff4fa6', '#ffb02e', '#f1f1f1', '#233a7a', '#d93636', '#3b2a8a'];
  const skins = ['#f1c9a5', '#d9a679', '#a97650', '#6f4a31'];
  const rows = 4;
  for (let row = 0; row < rows; row++) {
    const y0 = (row * h) / rows;
    for (let x = 6 + (row % 2) * 14; x < w; x += 30 + r() * 8) {
      const shirt = shirts[Math.floor(r() * shirts.length)];
      const skin = skins[Math.floor(r() * skins.length)];
      g.fillStyle = shirt;
      g.beginPath(); g.ellipse(x, y0 + 56, 17, 12, 0, Math.PI, 0); g.fill();
      g.fillRect(x - 17, y0 + 56, 34, 8);
      g.fillStyle = skin;
      g.beginPath(); g.arc(x, y0 + 36, 8.5, 0, Math.PI * 2); g.fill();
      if (r() < 0.14) { // arms up
        g.strokeStyle = shirt; g.lineWidth = 5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x + 11, y0 + 48); g.lineTo(x + 18, y0 + 20); g.stroke();
      }
      if (r() < 0.07) { g.fillStyle = '#ffffff'; g.fillRect(x + 10, y0 + 22, 4, 6); }
    }
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(0, y0 + 60, w, 4); // the bench edge
  }
});

/** Lit windows for the skyline: most dark, some warm, cool or pink. Used as an emissive map. */
export const windowsTex = () => canvasTex(256, (g, s) => {
  g.fillStyle = '#000';
  g.fillRect(0, 0, s, s);
  const r = rng(808);
  const cols = ['#ffd9a0', '#ffc27a', '#a6dcff', '#8fd0ff', '#ff9ccb', '#ffffff'];
  const cw = 24, ch = 14;
  for (let y = 6; y < s - ch; y += ch + 8) {
    for (let x = 6; x < s - cw; x += cw + 8) {
      if (r() < 0.34) {
        g.fillStyle = cols[Math.floor(r() * cols.length)];
        g.globalAlpha = 0.55 + r() * 0.45;
        g.fillRect(x, y, cw, ch);
        g.globalAlpha = 1;
      } else {
        g.fillStyle = '#05070b';
        g.fillRect(x, y, cw, ch);
      }
    }
  }
});

/** The clubhouse glass: warm lit windows with mullions, in two bands. */
export const clubGlassTex = () => canvasTexWH(512, 256, (g, w, h) => {
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  const r = rng(515);
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 6; i++) {
      const x = 8 + i * 84, y = 12 + row * 122;
      const gr = g.createLinearGradient(0, y, 0, y + 100);
      gr.addColorStop(0, r() < 0.5 ? '#ffd9a0' : '#fff1d0');
      gr.addColorStop(1, '#c47a3a');
      g.fillStyle = gr;
      g.fillRect(x, y, 76, 100);
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(x + 37, y, 3, 100);
      if (r() < 0.5) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(x + 8 + r() * 40, y + 40, 12, 60); } // a figure
    }
  }
});

// ───────────────────────── signs ─────────────────────────

/** Gantry banner: club name in neon between two checkered blocks. 2048 x 256. */
export const bannerTex = () => canvasTexWH(2048, 256, (g, w, h) => {
  g.fillStyle = '#080b12';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#35f0ff';
  g.shadowColor = '#35f0ff'; g.shadowBlur = 18;
  g.lineWidth = 6;
  g.strokeRect(10, 10, w - 20, h - 20);
  g.shadowBlur = 0;
  const q = 32;
  for (const x0 of [28, w - 28 - 4 * q]) {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 7; j++) {
      g.fillStyle = (i + j) % 2 ? '#f4f4f1' : '#15171a';
      g.fillRect(x0 + i * q, 16 + j * q, q, q);
    }
  }
  neon(g, 'APEX RACING CLUB', w / 2, h * 0.44, 150, '#ffffff', { glow: 34 });
  g.fillStyle = '#ff3fa4';
  g.shadowColor = '#ff3fa4'; g.shadowBlur = 18;
  g.fillRect(w / 2 - 560, h * 0.74, 1120, 7);
  g.shadowBlur = 0;
  neon(g, 'START  ·  FINISH', w / 2, h * 0.88, 40, '#35f0ff', { glow: 14 });
});

/** Four boards in one image (rows of 128 px): club slogans for the grandstands and the roof. */
export const signsTex = () => canvasTexWH(1024, 512, (g, w, h) => {
  const rows = [
    ['APEX RACING CLUB', '#35f0ff', '#ff3fa4'],
    ['NIGHT SERIES', '#ffd15c', '#35f0ff'],
    ['DRIFT KINGS', '#ff3fa4', '#ffd15c'],
    ['CLEAN SWEEP CUP', '#8dff7a', '#35f0ff'],
  ];
  rows.forEach(([text, c1, c2], i) => {
    const y = i * 128;
    g.fillStyle = '#080b12';
    g.fillRect(0, y, w, 128);
    g.strokeStyle = c2;
    g.shadowColor = c2; g.shadowBlur = 12;
    g.lineWidth = 5;
    g.strokeRect(8, y + 8, w - 16, 112);
    g.shadowBlur = 0;
    neon(g, text, w / 2, y + 64, 74, c1, { glow: 22 });
  });
});
