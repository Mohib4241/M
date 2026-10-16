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
    if (typeof key !== 'string') return key;
    if (this._mats.has(key)) return this._mats.get(key);
    const studio = this.ctx.look === 'studio';
    const isGlow = key === 'accent' || key === 'led';
    let d = isGlow ? { o: 1 } : MATS[key];
    if (!d) throw new Error(`Unknown material "${key}"`);
    if (studio && !isGlow) d = { ...d, ...STUDIO[key] };
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
    }
    mat.transparent = true;
    const o = d.o ?? 1;
    mat.opacity = o;
    mat.depthWrite = o > 0.6;
    this.records.push({ mat, base: o, shell: !!(d && d.shell), emissive: mat.emissive.clone(), glass: !!(d && d.glass) });
    this._mats.set(key, mat);
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

  // Draw a sub-module at an offset: b.at([x,y,z], () => { ...b.box(...) }, [rx,ry,rz])
  at(pos, fn, rot) {
    const g = new THREE.Group();
    g.position.set(pos[0], pos[1], pos[2]);
    if (rot) g.rotation.set(rot[0], rot[1], rot[2]);
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

// Fine horizontal stripes with a slow wave: the "wavy-stripe" front-shell texture.
let _wave;
export function waveBump() {
  if (_wave) return _wave;
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
