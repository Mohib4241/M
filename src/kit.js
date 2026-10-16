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
    const isGlow = key === 'accent' || key === 'led';
    const d = isGlow ? { o: 1 } : MATS[key];
    if (!d) throw new Error(`Unknown material "${key}"`);
    let mat;
    if (isGlow) {
      mat = new THREE.MeshStandardMaterial({ color: this.ctx.accent.clone().multiplyScalar(0.25), emissive: this.ctx.accent.clone(), emissiveIntensity: key === 'led' ? 2.4 : 1.0, roughness: 0.4 });
    } else {
      mat = new THREE.MeshStandardMaterial({
        color: d.color, metalness: d.metalness, roughness: d.roughness,
        emissive: d.emissive || 0x000000,
      });
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
    const eg = new THREE.EdgesGeometry(geo, o.thr ?? 24);
    const mat = new THREE.LineBasicMaterial({
      color: o.ec === 'white' ? new THREE.Color(1.6, 1.6, 1.6) : this.ctx.accent.clone().multiplyScalar(2.1),
      transparent: true, opacity: o.eo ?? 0.55, toneMapped: false, depthWrite: false,
    });
    mat.userData.base = mat.opacity;
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
