// Shared geometry/material kit. Every robot part is authored through a Builder so
// the stage can dim, glow, outline and explode parts without knowing what they are.
//
// Units: 1 unit = 100 mm. Y is up, +Z is the robot's front.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Surface presets. `o` is base opacity, `shell` marks surfaces that fade in X-ray mode.
export const MATS = {
  shell:    { color: 0x8b9fb0, metalness: 0.12, roughness: 0.42, o: 0.97, shell: true },
  shellDk:  { color: 0x465669, metalness: 0.25, roughness: 0.45, o: 0.97, shell: true },
  glass:    { color: 0x070d14, metalness: 0.6,  roughness: 0.1,  o: 0.97, shell: true },
  trim:     { color: 0x2a3644, metalness: 0.4,  roughness: 0.5,  o: 0.97, shell: true },
  dark:     { color: 0x1b242e, metalness: 0.3,  roughness: 0.55 },
  metal:    { color: 0x7d8996, metalness: 0.55, roughness: 0.5 },
  steel:    { color: 0x98a3ae, metalness: 0.6,  roughness: 0.42 },
  rubber:   { color: 0x10151a, metalness: 0,    roughness: 0.9 },
  bristle:  { color: 0x3a4958, metalness: 0,    roughness: 0.95 },
  fabric:   { color: 0xb9c2ca, metalness: 0,    roughness: 1 },
  tankCl:   { color: 0x7fd3ff, metalness: 0,    roughness: 0.08, o: 0.26, glass: true },
  water:    { color: 0x2aa9ff, metalness: 0,    roughness: 0.2,  o: 0.62, emissive: 0x0a5f9e },
  tankDi:   { color: 0xc4b48f, metalness: 0,    roughness: 0.1,  o: 0.28, glass: true },
  sludge:   { color: 0x6f5d3b, metalness: 0,    roughness: 0.6,  o: 0.82, emissive: 0x201706 },
  pcb:      { color: 0x0c7048, metalness: 0.2,  roughness: 0.5,  emissive: 0x03301f },
  chip:     { color: 0x12161a, metalness: 0.4,  roughness: 0.4 },
  copper:   { color: 0xc98a4b, metalness: 0.95, roughness: 0.28 },
  red:      { color: 0xd22b2b, metalness: 0.1,  roughness: 0.35, emissive: 0x7a0c0c },
  yellow:   { color: 0xf2c230, metalness: 0.1,  roughness: 0.4,  emissive: 0x4a3a05 },
  lens:     { color: 0x04070a, metalness: 0.9,  roughness: 0.04, emissive: 0x0b3354 },
  screen:   { color: 0x08121c, metalness: 0.2,  roughness: 0.2,  emissive: 0x0e3a5c },
  battery:  { color: 0x1d2631, metalness: 0.5,  roughness: 0.45 },
  graphite: { color: 0x5d6b7a, metalness: 0.55, roughness: 0.4,  o: 0.97, shell: true },
  silver:   { color: 0xc3ccd4, metalness: 0.85, roughness: 0.3 },
  green:    { color: 0x2fe08a, metalness: 0,    roughness: 0.4,  emissive: 0x18c46c },
  window:   { color: 0xc9f7dc, metalness: 0,    roughness: 0.25, o: 0.9, emissive: 0x4fd88a },
  lamp:     { color: 0xf4f8ff, metalness: 0,    roughness: 0.3,  emissive: 0xeaf2ff, ei: 1.6 },
  ledBlue:  { color: 0x58b8ff, metalness: 0,    roughness: 0.3,  emissive: 0x2f9bff, ei: 1.8 },
  lime:     { color: 0xa9d81c, metalness: 0,    roughness: 0.45, emissive: 0x2c3a05 },
  hubGrey:  { color: 0xb8bec4, metalness: 0.2,  roughness: 0.45 },
};

// Studio look: real-material colours and finishes, no emissive glow.
// A preset with `clearcoat` becomes a MeshPhysicalMaterial (lacquered plastic, glass, lenses).
const STUDIO = {
  shell:    { color: 0xeceff1, metalness: 0,    roughness: 0.34, o: 0.98, clearcoat: 0.5, clearcoatRoughness: 0.3 },
  shellDk:  { color: 0x5b646d, metalness: 0.05, roughness: 0.48, o: 0.98, clearcoat: 0.25 },
  glass:    { color: 0x0a0d11, metalness: 0,    roughness: 0.06, o: 0.98, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.5 },
  trim:     { color: 0x30373d, metalness: 0.05, roughness: 0.5,  o: 0.98, clearcoat: 0.2 },
  dark:     { color: 0x25292e, metalness: 0.15, roughness: 0.6 },
  metal:    { color: 0x9aa3ab, metalness: 0.85, roughness: 0.38 },
  steel:    { color: 0xcdd3d8, metalness: 0.92, roughness: 0.26 },
  rubber:   { color: 0x17191c, metalness: 0,    roughness: 0.96 },
  bristle:  { color: 0x2f353b, metalness: 0,    roughness: 1 },
  fabric:   { color: 0xe9e6df, metalness: 0,    roughness: 1 },
  tankCl:   { color: 0xd6ecf6, metalness: 0,    roughness: 0.04, o: 0.3,  glass: true },
  water:    { color: 0x59b4e8, metalness: 0,    roughness: 0.1,  o: 0.55, emissive: 0x000000 },
  tankDi:   { color: 0xd3c8aa, metalness: 0,    roughness: 0.05, o: 0.3,  glass: true },
  sludge:   { color: 0x7d6a45, metalness: 0,    roughness: 0.5,  o: 0.85, emissive: 0x000000 },
  pcb:      { color: 0x1f7d55, metalness: 0.1,  roughness: 0.45, emissive: 0x000000 },
  chip:     { color: 0x16191c, metalness: 0.3,  roughness: 0.4 },
  copper:   { color: 0xc58b53, metalness: 0.95, roughness: 0.3 },
  red:      { color: 0xc72a2a, metalness: 0,    roughness: 0.3,  emissive: 0x000000 },
  yellow:   { color: 0xe8b420, metalness: 0,    roughness: 0.4,  emissive: 0x000000 },
  lens:     { color: 0x080a0d, metalness: 0.4,  roughness: 0.05, emissive: 0x000000, clearcoat: 1, clearcoatRoughness: 0.03 },
  screen:   { color: 0x0a1118, metalness: 0,    roughness: 0.25, emissive: 0x0c2a44 },
  battery:  { color: 0x2d353d, metalness: 0.3,  roughness: 0.5 },
  graphite: { color: 0x737b84, metalness: 0.7,  roughness: 0.36, o: 0.98, clearcoat: 0.3 },
  silver:   { color: 0xc9d0d6, metalness: 0.92, roughness: 0.24 },
  green:    { color: 0x2fe08a, metalness: 0,    roughness: 0.4,  emissive: 0x1fd27a },
  window:   { color: 0xd6f7e2, metalness: 0,    roughness: 0.3,  o: 0.92, emissive: 0x6be39a },
  lamp:     { color: 0xf6f9ff, metalness: 0,    roughness: 0.3,  emissive: 0xf2f6ff, ei: 1.3 },
  ledBlue:  { color: 0x6cc2ff, metalness: 0,    roughness: 0.3,  emissive: 0x3aa2ff, ei: 1.5 },
  lime:     { color: 0xb2dd22, metalness: 0,    roughness: 0.42, emissive: 0x1a2403, clearcoat: 0.4, clearcoatRoughness: 0.3 },
  hubGrey:  { color: 0xa9afb5, metalness: 0.2,  roughness: 0.45 },
};

const tmpObj = new THREE.Object3D();

export class Builder {
  constructor(ctx) {
    this.ctx = ctx; // { accent: THREE.Color, accent2: THREE.Color }
    this.group = new THREE.Group();
    this.cur = this.group; // current attach point (see `at`)
    this.records = []; // material records for dimming/glow
    this.edgeMats = []; // outline materials
    this.meshes = []; // pickable meshes
    this._mats = new Map();
  }

  // Material for this part (cloned per part so each part can fade on its own).
  m(key) {
    if (key && typeof key === 'object' && key.k) return this._variant(key);
    if (typeof key !== 'string') return key;
    if (this._mats.has(key)) return this._mats.get(key);
    const studio = this.ctx.look === 'studio';
    const isGlow = key === 'accent' || key === 'led';
    let d = isGlow ? { o: 1 } : MATS[key];
    if (!d) throw new Error(`Unknown material "${key}"`);
    if (studio && !isGlow) d = { ...d, ...STUDIO[key] };
    if (this.ctx.mats && this.ctx.mats[key] && !isGlow) d = { ...d, ...this.ctx.mats[key] }; // this robot's own finish for the key
    let mat;
    if (isGlow) {
      const lit = key === 'led' ? (studio ? 1.4 : 2.4) : (studio ? 0.3 : 1.0);
      mat = new THREE.MeshStandardMaterial({
        color: studio ? this.ctx.accent.clone() : this.ctx.accent.clone().multiplyScalar(0.25),
        emissive: this.ctx.accent.clone(), emissiveIntensity: lit, roughness: studio ? 0.45 : 0.4,
      });
    } else {
      const Cls = studio && d.clearcoat !== undefined ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
      mat = new Cls({ color: d.color, metalness: d.metalness, roughness: d.roughness, emissive: d.emissive || 0x000000 });
      if (Cls === THREE.MeshPhysicalMaterial) { mat.clearcoat = d.clearcoat; mat.clearcoatRoughness = d.clearcoatRoughness ?? 0.1; }
      if (d.envMapIntensity) mat.envMapIntensity = d.envMapIntensity;
      if (d.ei) mat.emissiveIntensity = d.ei;
    }
    mat.transparent = true;
    const o = d.o ?? 1;
    mat.opacity = o;
    mat.depthWrite = o > 0.6;
    this.records.push({ mat, base: o, shell: !!(d && d.shell), emissive: mat.emissive.clone(), glass: !!(d && d.glass) });
    this._mats.set(key, mat);
    return mat;
  }

  // A preset with changes, such as a texture: { k: 'trim', id: 'carbon', map, color, roughness, ... }.
  // Registered like any other material, so it dims, glows and fades with its part.
  _variant(v) {
    const id = v.id || `${v.k}~${v.color ?? ''}~${v.roughness ?? ''}`;
    if (this._mats.has(id)) return this._mats.get(id);
    const base = this.m(v.k);
    const mat = base.clone();
    for (const [k, val] of Object.entries(v)) {
      if (k === 'k' || k === 'id') continue;
      if (k === 'color' || k === 'emissive') mat[k] = new THREE.Color(val);
      else mat[k] = val;
    }
    const rec = this.records.find((r) => r.mat === base) || { base: 1, shell: false, glass: false };
    this.records.push({ ...rec, mat, emissive: mat.emissive.clone() });
    this._mats.set(id, mat);
    return mat;
  }

  _edges(geo, mesh, o) {
    if (o.e === false) return;
    const studio = this.ctx.look === 'studio';
    const eg = new THREE.EdgesGeometry(geo, o.thr ?? 24);
    const mat = new THREE.LineBasicMaterial({
      color: studio ? new THREE.Color(0x0f1c26)
        : o.ec === 'white' ? new THREE.Color(1.6, 1.6, 1.6) : this.ctx.accent.clone().multiplyScalar(2.1),
      transparent: true, opacity: studio ? 0 : (o.eo ?? 0.55), toneMapped: !studio, depthWrite: false,
    });
    // In the studio look outlines stay hidden until a part is selected.
    mat.userData.base = studio ? 0.75 : mat.opacity;
    mat.userData.studio = studio;
    this.edgeMats.push(mat);
    const lines = new THREE.LineSegments(eg, mat);
    lines.userData.isEdge = true;
    lines.visible = !studio; // hidden outlines are not drawn at all; the stage shows them when they light up
    mat.userData.lines = lines;
    mesh.add(lines);
  }

  _place(obj, o) {
    if (o.at) obj.position.set(o.at[0], o.at[1], o.at[2]);
    if (o.rot) obj.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
    if (o.s) obj.scale.setScalar(o.s);
  }

  mesh(geo, o = {}) {
    const mesh = new THREE.Mesh(geo, this.m(o.m || 'dark'));
    mesh.castShadow = mesh.receiveShadow = true;
    this._place(mesh, o);
    this._edges(geo, mesh, o);
    (o.parent || this.cur).add(mesh);
    this.meshes.push(mesh);
    return mesh;
  }

  box(w, h, d, o = {}) {
    const r = o.r ?? 0;
    const geo = r > 0
      ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, Math.min(w, h, d) / 2 - 0.001))
      : new THREE.BoxGeometry(w, h, d);
    return this.mesh(geo, { thr: r > 0 ? 18 : 24, ...o });
  }

  // A moulded panel: rounded rectangle in XY (w × h), thickness t along Z, soft bevelled edge.
  panel(w, h, t, o = {}) {
    const bev = Math.min(o.bevel ?? 0.07, t / 2 - 0.005);
    const pw = w - 2 * bev, ph = h - 2 * bev;
    const r = Math.max(0.01, Math.min((o.r ?? 0.4) - bev, Math.min(pw, ph) / 2 - 0.01));
    const x = -pw / 2, y = -ph / 2;
    const sh = new THREE.Shape();
    sh.moveTo(x + r, y);
    sh.lineTo(x + pw - r, y); sh.absarc(x + pw - r, y + r, r, -Math.PI / 2, 0);
    sh.lineTo(x + pw, y + ph - r); sh.absarc(x + pw - r, y + ph - r, r, 0, Math.PI / 2);
    sh.lineTo(x + r, y + ph); sh.absarc(x + r, y + ph - r, r, Math.PI / 2, Math.PI);
    sh.lineTo(x, y + r); sh.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    const depth = Math.max(0.01, t - 2 * bev);
    const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 16 });
    geo.translate(0, 0, -depth / 2);
    return this.mesh(geo, { thr: 35, ...o });
  }

  // A moulded body from a 2D outline with rounded corners, pushed out `depth` with a soft edge.
  // pts: [[u, v, r], ...] where r rounds that corner. axis 'x': u = z (forward), v = y, pushed across
  // the width (a side profile). axis 'z': u = x, v = y, pushed front to back (a front outline).
  // axis 'y': u = x, v = z, pushed up (a plan). The outline keeps its size: the soft edge is inside it.
  profile(pts, depth, o = {}) {
    const bev = Math.min(o.bevel ?? 0.08, depth / 2 - 0.005);
    const d = Math.max(0.01, depth - 2 * bev);
    const geo = new THREE.ExtrudeGeometry(roundedShape(pts), {
      depth: d, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev,
      bevelSegments: o.bs ?? 3, curveSegments: o.cs ?? 10,
    });
    geo.translate(0, 0, -d / 2);
    const axis = o.axis || 'x';
    if (axis === 'x') geo.rotateY(-Math.PI / 2);
    else if (axis === 'y') geo.rotateX(Math.PI / 2);
    geo.computeVertexNormals();
    return this.mesh(geo, { thr: 30, ...o });
  }

  // A panel of a measured body (see loft.js): rows [y, t0, t1] of the loft's surface, with a thickness.
  skin(loft, rows, o = {}) {
    return this.mesh(loft.panel(rows, o), { thr: 40, ...o });
  }

  // Something set on a measured surface, facing out of it: b.on(loft.place(y, { x }), () => { ... }).
  on(pl, fn) { return this.at(pl.at, fn, pl.rot, 'YXZ'); }

  // A turned part from a half outline [[r, y], ...] spun round the Y axis (lamp heads, knobs, hubs).
  lathe(pts, o = {}) {
    const geo = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), o.seg ?? 32);
    return this.mesh(geo, { thr: 40, ...o });
  }

  cyl(rt, rb, h, o = {}) {
    return this.mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 28), o);
  }

  sph(r, o = {}) {
    return this.mesh(new THREE.SphereGeometry(r, o.seg ?? 24, o.seg ? o.seg : 16, 0, Math.PI * 2, 0, o.cap ?? Math.PI), o);
  }

  tor(R, r, o = {}) {
    return this.mesh(new THREE.TorusGeometry(R, r, 10, o.seg ?? 36, o.arc ?? Math.PI * 2), o);
  }

  cap(r, len, o = {}) {
    return this.mesh(new THREE.CapsuleGeometry(r, len, 4, 10), o);
  }

  // N copies of `geo` arranged around an axis (roller ridges, bristles, fan blades, pleats).
  radial(geo, n, R, o = {}) {
    const axis = o.axis || 'x';
    const im = new THREE.InstancedMesh(geo, this.m(o.m || 'bristle'), n);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (o.phase || 0);
      const c = Math.cos(a), s = Math.sin(a);
      tmpObj.rotation.set(0, 0, 0);
      if (axis === 'x') { tmpObj.position.set(0, R * c, R * s); tmpObj.rotation.set(a, 0, 0); }
      else if (axis === 'y') { tmpObj.position.set(R * c, 0, R * s); tmpObj.rotation.set(0, -a, 0); }
      else { tmpObj.position.set(R * c, R * s, 0); tmpObj.rotation.set(0, 0, a); }
      if (o.tilt) tmpObj.rotateZ(o.tilt);
      tmpObj.updateMatrix();
      im.setMatrixAt(i, tmpObj.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = im.receiveShadow = true;
    this._place(im, o);
    (o.parent || this.cur).add(im);
    this.meshes.push(im);
    return im;
  }

  add(obj) { this.cur.add(obj); return obj; }

  // Draw a sub-module at an offset: b.at([x,y,z], () => { ...b.box(...) }, [rx,ry,rz], order)
  at(pos, fn, rot, order) {
    const g = new THREE.Group();
    g.position.set(pos[0], pos[1], pos[2]);
    if (rot) g.rotation.set(rot[0], rot[1], rot[2], order || 'XYZ');
    const prev = this.cur;
    prev.add(g);
    this.cur = g;
    fn(g);
    this.cur = prev;
    return g;
  }
}

// Canvas texture for the CC1 Pro touchscreen, so the display reads as a live UI.
export function screenTexture(accent = '#35e0ff') {
  if (typeof document === 'undefined') return null; // outside a page (tests)
  const c = document.createElement('canvas');
  c.width = 512; c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = '#06121c'; g.fillRect(0, 0, 512, 320);
  g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, 512, 34);
  g.fillStyle = accent; g.font = '600 18px sans-serif'; g.fillText('CLEANING  ·  ZONE 3', 16, 23);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '14px sans-serif'; g.fillText('87%', 462, 23);
  // floor map
  g.strokeStyle = 'rgba(120,200,255,.35)'; g.lineWidth = 2;
  g.strokeRect(24, 58, 300, 230);
  g.fillStyle = 'rgba(80,190,255,.16)';
  g.fillRect(26, 60, 190, 226);
  g.strokeStyle = accent; g.lineWidth = 3; g.beginPath();
  for (let i = 0; i < 7; i++) { const y = 74 + i * 30; g.moveTo(40, y); g.lineTo(i % 2 ? 40 : 200, y); g.lineTo(i % 2 ? 200 : 200, y + 30); }
  g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(200, 224, 7, 0, 6.3); g.fill();
  // right-hand controls
  const btn = (y, label, hot) => {
    g.fillStyle = hot ? accent : 'rgba(255,255,255,.1)';
    g.fillRect(348, y, 140, 52);
    g.fillStyle = hot ? '#02121c' : '#cfe6f5'; g.font = '600 20px sans-serif';
    g.fillText(label, 366, y + 33);
  };
  btn(58, 'PAUSE', true); btn(122, 'MODE: SCRUB', false); btn(186, 'WATER', false); btn(250, 'DOCK', false);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// The Phantas screen when idle: a dark glass with a faint pattern and two rounded-square "eyes".
export function eyesTexture() {
  if (typeof document === 'undefined') return null; // outside a page (tests)
  const c = document.createElement('canvas');
  c.width = 512; c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = '#05080b'; g.fillRect(0, 0, 512, 320);
  g.strokeStyle = 'rgba(150,170,185,.07)'; g.lineWidth = 3;
  for (let i = 0; i < 6; i++) { g.strokeRect(70 + i * 24, 40 + i * 20, 372 - i * 48, 240 - i * 40); }
  const eye = (x) => {
    g.lineJoin = 'round';
    g.strokeStyle = '#d3dade'; g.lineWidth = 12;
    g.strokeRect(x - 44, 112, 88, 96);
    g.strokeStyle = 'rgba(210,220,226,.35)'; g.lineWidth = 3;
    g.strokeRect(x - 28, 128, 56, 64);
  };
  eye(176); eye(336);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Fine horizontal stripes with a slow wave: the "wavy-stripe" front-shell texture.
let _wave;
export function waveBump() {
  if (_wave) return _wave;
  if (typeof document === 'undefined') return null; // outside a page (tests)
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const img = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const u = x / 256, v = y / 256;
      const h = 0.5 + 0.5 * Math.sin(Math.PI * 2 * (v * 5 + 0.35 * Math.sin(Math.PI * 2 * u)));
      const k = (y * 256 + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = Math.round(h * 255);
      img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  _wave = new THREE.CanvasTexture(c);
  _wave.wrapS = _wave.wrapT = THREE.RepeatWrapping;
  return _wave;
}

// A closed outline from corner points; a corner with a radius r is rounded with a smooth curve.
export function roundedShape(pts) {
  const n = pts.length;
  const P = pts.map(([x, y]) => new THREE.Vector2(x, y));
  const cut = (i, j, r) => {
    const a = P[i], b = P[j];
    const len = a.distanceTo(b);
    return a.clone().lerp(b, Math.min(r, len * 0.49) / Math.max(len, 1e-6));
  };
  const sh = new THREE.Shape();
  for (let i = 0; i < n; i++) {
    const r = pts[i][2] || 0;
    const prev = (i - 1 + n) % n, next = (i + 1) % n;
    const a = r > 0 ? cut(i, prev, r) : P[i];
    const b = r > 0 ? cut(i, next, r) : P[i];
    if (i === 0) sh.moveTo(a.x, a.y); else sh.lineTo(a.x, a.y);
    if (r > 0) sh.quadraticCurveTo(P[i].x, P[i].y, b.x, b.y);
  }
  sh.closePath();
  return sh;
}

function canvasTex(w, h, draw, repeat = null) {
  if (typeof document === 'undefined') return null; // tests build parts without a page
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// A twill carbon weave, for dark front panels.
let _carbon;
export function carbonTex() {
  if (_carbon !== undefined) return _carbon;
  _carbon = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#26292d'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      for (let x = 0; x < w; x += 8) {
        const k = ((x + y) / 8) % 2;
        const grd = k ? g.createLinearGradient(x, y, x + 8, y) : g.createLinearGradient(x, y, x, y + 8);
        grd.addColorStop(0, '#1d2023'); grd.addColorStop(0.5, '#34383d'); grd.addColorStop(1, '#1d2023');
        g.fillStyle = grd; g.fillRect(x, y, 8, 8);
      }
    }
  }, [2, 2]);
  return _carbon;
}

// Yellow and black hazard stripes, for the ring on top of a 3D LiDAR.
let _hazard;
export function hazardTex() {
  if (_hazard !== undefined) return _hazard;
  _hazard = canvasTex(256, 32, (g, w, h) => {
    g.fillStyle = '#16181a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f0b81c';
    for (let x = -h; x < w + h; x += 24) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 12, h); g.lineTo(x + 12 + h, 0); g.lineTo(x + h, 0); g.closePath(); g.fill(); }
  }, [3, 1]);
  return _hazard;
}

// A word or mark printed on a panel (white or grey on transparent), for a maker's name or a badge.
export function labelTex(text, { color = '#cfd4d9', font = '600 54px sans-serif', w = 512, h = 96, spacing = 6 } = {}) {
  return canvasTex(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = spacing + 'px';
    g.fillText(text, w / 2, h / 2);
  });
}

// Fewer draw calls: within one part, the plain meshes that share a material become one mesh, and their
// outlines one set of lines per outline style. Spinning, liquid and instanced pieces stay as they are.
// Picking, dimming and glow work as before (they go by part and by material, not by mesh).
export function mergePart(b, merge) {
  const root = b.group;
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const keep = (o) => { for (let a = o; a && a !== root; a = a.parent) if (a.userData.spin || a.userData.liquid) return true; return false; };
  const byMat = new Map();
  for (const m of b.meshes) {
    if (!m.isMesh || m.isInstancedMesh || keep(m) || Array.isArray(m.material)) continue;
    (byMat.get(m.material) || byMat.set(m.material, []).get(m.material)).push(m);
  }
  const rel = new THREE.Matrix4();
  const edgeBuckets = new Map(); // outline material key -> { mat, geos }
  for (const [mat, list] of byMat) {
    if (list.length < 2) continue;
    const geos = [];
    for (const m of list) {
      rel.multiplyMatrices(inv, m.matrixWorld);
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone());
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.clearGroups();
      geos.push(g.applyMatrix4(rel));
      for (const c of m.children) {
        if (!c.userData.isEdge) continue;
        const em = c.material;
        const key = `${em.color.getHexString()}~${em.userData.base}`;
        const bucket = edgeBuckets.get(key) || edgeBuckets.set(key, { mat: em, geos: [] }).get(key);
        bucket.geos.push(c.geometry.clone().applyMatrix4(rel));
      }
    }
    const merged = merge(geos, false);
    if (!merged) continue;
    for (const g of geos) g.dispose();
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.part = list[0].userData.part;
    root.add(mesh);
    for (const m of list) {
      m.removeFromParent();
      m.geometry.dispose();
      b.meshes.splice(b.meshes.indexOf(m), 1);
      for (const c of m.children) if (c.userData.isEdge) b.edgeMats.splice(b.edgeMats.indexOf(c.material), 1);
    }
    b.meshes.push(mesh);
  }
  for (const { mat, geos } of edgeBuckets.values()) {
    const lines = new THREE.LineSegments(merge(geos, false), mat);
    for (const g of geos) g.dispose();
    lines.userData.isEdge = true;
    lines.visible = mat.userData.lines ? mat.userData.lines.visible : true;
    mat.userData.lines = lines;
    root.add(lines);
    if (!b.edgeMats.includes(mat)) b.edgeMats.push(mat);
  }
}
