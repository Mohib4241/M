// The 3D stage: renderer, hologram platform, explode timeline, camera rig,
// picking, dimming, assembly guides and the water-flow overlay.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Builder } from './kit.js';

// Parts open in four waves, outermost first: shell → subsystems → internals → frame.
const LAYER_START = [0, 0.18, 0.36, 0.54];
const LAYER_SPAN = 0.46;
// How far open the suit must be before a layer is clear of the shell.
export const REVEAL = [0.5, 0.66, 0.84, 1.0];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const damp = (dt, k) => 1 - Math.exp(-dt * k);

export class Stage {
  constructor(canvas, { look = 'studio' } = {}) {
    this.canvas = canvas;
    this.look = look; // 'studio' (realistic) or 'holo' (hologram)
    this.handlers = {};
    this.opts = { xray: true, labels: true, water: false, bloom: true, rotate: true, guides: true };
    this.reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.e = 0; // current explode 0..1
    this.ev = 0; // spring velocity
    this.eT = 0; // target explode
    this.baseY = 0;
    this._floorY = 0;
    this.time = 0;
    this.parts = [];
    this.partById = new Map();
    this.selected = null;
    this.hovered = null;
    this.groupFilter = null;
    this.userZoom = 1;
    this.insets = { left: 0, right: 0, bottom: 0 };
    this.lastInput = 0;
    this.accent = new THREE.Color('#3de0ff');
    this.accent2 = new THREE.Color('#ffd166');

    this.cam = { az: 0.62, el: 0.3, azC: 0.62, elC: 0.3, dist: 20, tx: 0, ty: 5, tz: 0, ft: new THREE.Vector3() };
    this._initRenderer();
    this._initScene();
    this._initStudio();
    this._applyLook();
    this._initInput();
    this._onResize();
    new ResizeObserver(() => this._onResize()).observe(canvas.parentElement || canvas);
    this.renderer.setAnimationLoop((t) => this._frame(t));
  }

  on(evt, fn) { (this.handlers[evt] ||= []).push(fn); return this; }
  emit(evt, ...a) { (this.handlers[evt] || []).forEach((f) => f(...a)); }

  // ───────────────────────── setup ─────────────────────────
  _initRenderer() {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02060b);
    this.scene.fog = new THREE.FogExp2(0x02060b, 0.011);
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 400);
    this.scene.add(this.camera); // so things parented to it (the 3D hands) are drawn
    this.hooks = []; // per-frame callbacks, run after the camera is placed

    const pm = new THREE.PMREMGenerator(r);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.3;

    this.composer = new EffectComposer(r, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }));
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.55, 0.6, 1.12);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  _initScene() {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight(0x9fd0ff, 0x04080e, 0.55);
    s.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xffffff, 1.45);
    this.key.position.set(7, 12, 9);
    this.key.target.position.set(0, 4, 0);
    s.add(this.key, this.key.target);
    const sh = this.key.shadow;
    sh.mapSize.set(2048, 2048);
    sh.camera.left = sh.camera.bottom = -24;
    sh.camera.right = sh.camera.top = 24;
    sh.camera.near = 2;
    sh.camera.far = 80;
    sh.bias = -0.0004;
    sh.normalBias = 0.035;
    sh.radius = 3;
    this.rim = new THREE.DirectionalLight(this.accent, 2.2);
    this.rim.position.set(-9, 6, -8);
    s.add(this.rim);
    this.under = new THREE.PointLight(this.accent, 24, 26, 1.6);
    this.under.position.set(0, 0.5, 0);
    s.add(this.under);

    // Hologram platform: radial-fading grid, rings and orbiting arcs.
    const g = (this.platform = new THREE.Group());
    s.add(g);
    this.uniforms = { uColor: { value: this.accent }, uTime: { value: 0 } };
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        vertexShader: 'varying vec2 vXZ; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vXZ = w.xz; gl_Position = projectionMatrix*viewMatrix*w; }',
        fragmentShader: `varying vec2 vXZ; uniform vec3 uColor; uniform float uTime;
          void main(){
            vec2 g = abs(fract(vXZ - 0.5) - 0.5) / fwidth(vXZ);
            float line = 1.0 - min(min(g.x, g.y), 1.0);
            vec2 g5 = abs(fract(vXZ/5.0 - 0.5) - 0.5) / fwidth(vXZ/5.0);
            float major = 1.0 - min(min(g5.x, g5.y), 1.0);
            float r = length(vXZ);
            float fade = smoothstep(22.0, 3.0, r);
            float pulse = 0.5 + 0.5*sin(r*0.9 - uTime*1.6);
            float a = (line*0.22 + major*0.45 + pulse*0.025) * fade;
            gl_FragColor = vec4(uColor*1.4, a);
          }`,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    g.add(floor);

    this.ringMat = new THREE.MeshBasicMaterial({ color: this.accent.clone().multiplyScalar(1.6), transparent: true, opacity: 0.8, side: THREE.DoubleSide, toneMapped: false, depthWrite: false });
    this.rings = [];
    const addRing = (r0, r1, op, th0 = 0, th1 = Math.PI * 2, spin = 0) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 160, 1, th0, th1), this.ringMat.clone());
      m.material.opacity = op;
      m.rotation.x = -Math.PI / 2;
      m.userData.spin = spin;
      g.add(m);
      this.rings.push(m);
    };
    addRing(3.5, 3.54, 0.7);
    addRing(5.6, 5.63, 0.35);
    addRing(8.2, 8.23, 0.25);
    addRing(4.4, 4.52, 0.85, 0.2, 1.1, 0.35);
    addRing(4.4, 4.52, 0.85, 3.4, 1.1, 0.35);
    addRing(6.9, 7.0, 0.6, 0.6, 0.5, -0.22);
    addRing(6.9, 7.0, 0.6, 3.9, 0.5, -0.22);
    // tick ring
    const ticks = new THREE.Group();
    const tg = new THREE.PlaneGeometry(0.03, 0.22);
    const tm = this.ringMat.clone();
    tm.opacity = 0.5;
    // 120 marks merged into one mesh, so the ring costs one draw call, not 120
    const tickGeos = [], tmark = new THREE.Object3D();
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      tmark.position.set(Math.cos(a) * 9.4, 0, Math.sin(a) * 9.4);
      tmark.rotation.set(-Math.PI / 2, 0, -a + Math.PI / 2);
      tmark.scale.set(1, i % 5 === 0 ? 1.8 : 1, 1);
      tmark.updateMatrix();
      tickGeos.push(tg.clone().applyMatrix4(tmark.matrix));
    }
    ticks.add(new THREE.Mesh(mergeGeometries(tickGeos), tm));
    tickGeos.forEach((x) => x.dispose());
    g.add(ticks);
    this.ticks = ticks;

    // Scan beam used on load and when swapping robots.
    this.scan = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CircleGeometry(7.5, 72), new THREE.MeshBasicMaterial({ color: this.accent.clone().multiplyScalar(1.2), transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    const edge = new THREE.Mesh(new THREE.RingGeometry(7.4, 7.5, 120), new THREE.MeshBasicMaterial({ color: this.accent.clone().multiplyScalar(2), transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    disc.rotation.x = edge.rotation.x = -Math.PI / 2;
    this.scan.add(disc, edge);
    this.scan.visible = false;
    this.scanMats = [disc.material, edge.material];
    this.scanT = -1;
    s.add(this.scan);

    // Floating dust motes.
    const N = 360;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2, rr = 3 + Math.random() * 14;
      pos.set([Math.cos(a) * rr, Math.random() * 16 - 1, Math.sin(a) * rr], i * 3);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.motes = new THREE.Points(pg, new THREE.PointsMaterial({ color: this.accent.clone().multiplyScalar(1.5), size: 0.07, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    s.add(this.motes);

    // Dashed lines from each part's home position to where it is now.
    this.guideMat = new THREE.LineDashedMaterial({ color: this.accent.clone().multiplyScalar(1.4), dashSize: 0.14, gapSize: 0.12, transparent: true, opacity: 0.4, toneMapped: false, depthWrite: false });
    this.guides = null;

    // Water flow: a faint path plus particles that travel along it.
    this.flowLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: new THREE.Color(0x4cc9f0).multiplyScalar(1.8), transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false, depthTest: false }));
    this.flowLine.visible = false;
    this.flowLine.frustumCulled = false;
    s.add(this.flowLine);
    const dot = document.createElement('canvas');
    dot.width = dot.height = 64;
    const dg = dot.getContext('2d');
    const grad = dg.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,.85)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    dg.fillStyle = grad;
    dg.fillRect(0, 0, 64, 64);
    const dotTex = new THREE.CanvasTexture(dot);
    const FN = 120;
    this.flowN = FN;
    this.flowU = new Float32Array(FN).map((_, i) => i / FN);
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FN * 3), 3));
    fg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(FN * 3), 3));
    this.flowPts = new THREE.Points(fg, new THREE.PointsMaterial({ size: 0.55, map: dotTex, vertexColors: true, transparent: true, opacity: 1, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false, sizeAttenuation: true }));
    this.flowPts.visible = false;
    this.flowPts.frustumCulled = false;
    s.add(this.flowPts);

    this.raycaster = new THREE.Raycaster();
  }

  // Studio set: a seamless light cove with a soft shadow catcher.
  _initStudio() {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(256, 256, 0, 256, 256, 256);
    grd.addColorStop(0, '#eef1f4');
    grd.addColorStop(0.5, '#e0e5e9');
    grd.addColorStop(1, 'rgba(213,219,224,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const group = (this.studio = new THREE.Group());
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    disc.rotation.x = -Math.PI / 2;
    disc.renderOrder = -10; // the cove always draws first, then shadows, then the robot
    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), new THREE.ShadowMaterial({ opacity: 0.34 }));
    catcher.rotation.x = -Math.PI / 2;
    catcher.position.y = 0.004;
    catcher.receiveShadow = true;
    catcher.renderOrder = -9;
    // soft contact shadow under the sealed robot; fades as the parts lift away
    const cc = document.createElement('canvas');
    cc.width = cc.height = 256;
    const cg = cc.getContext('2d');
    const cgr = cg.createRadialGradient(128, 128, 10, 128, 128, 128);
    cgr.addColorStop(0, 'rgba(10,18,26,.9)');
    cgr.addColorStop(0.55, 'rgba(10,18,26,.45)');
    cgr.addColorStop(1, 'rgba(10,18,26,0)');
    cg.fillStyle = cgr;
    cg.fillRect(0, 0, 256, 256);
    this.contact = new THREE.Mesh(new THREE.PlaneGeometry(9, 10.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cc), transparent: true, depthWrite: false, toneMapped: false, opacity: 0.5 }));
    this.contact.rotation.x = -Math.PI / 2;
    this.contact.position.set(0, 0.008, -0.4);
    this.contact.renderOrder = -8;
    group.add(disc, catcher, this.contact);
    this.scene.add(group);
  }

  _applyLook() {
    const studio = this.look === 'studio';
    const sc = this.scene;
    this.platform.visible = this.motes.visible = !studio;
    if (studio) this.scan.visible = false;
    sc.environmentIntensity = studio ? 0.95 : 0.3;
    this.hemi.color.set(studio ? 0xffffff : 0x9fd0ff);
    this.hemi.groundColor.set(studio ? 0xaeb7bf : 0x04080e);
    this.hemi.intensity = studio ? 0.5 : 0.55;
    this.key.color.set(studio ? 0xfff6ec : 0xffffff);
    this.key.intensity = studio ? 2.5 : 1.45;
    this.key.position.set(studio ? -9 : 7, studio ? 17 : 12, studio ? 7 : 9);
    this.key.castShadow = studio;
    this.rim.intensity = studio ? 0.8 : 2.2;
    this.rim.color.set(studio ? 0xe8f1ff : this.accent);
    this.under.visible = !studio;
    this.baseY = studio ? 0 : (this.def ? this.def.hover : 0);
    // materials that must read on a light background
    this.flowPts.material.blending = studio ? THREE.NormalBlending : THREE.AdditiveBlending;
    this.flowPts.material.size = studio ? 0.4 : 0.55;
    this.flowGain = studio ? 1 : 1.5;
    this.flowLine.material.color.set(studio ? 0x1b84c4 : 0x4cc9f0).multiplyScalar(studio ? 1 : 1.8);
    this.guideMat.color.set(studio ? 0x2b3a47 : this.accent).multiplyScalar(studio ? 1 : 1.4);
    this.flowPts.material.needsUpdate = true;
    this._applyBackground();
  }

  // Studio cove / dark void, or the live camera feed when a backdrop is set.
  _applyBackground() {
    const studio = this.look === 'studio';
    const sc = this.scene;
    const bg = studio ? 0xd5dbe0 : 0x02060b;
    if (this.backdropTex) {
      sc.background = this.backdropTex;
      sc.backgroundIntensity = studio ? 1 : 0.75;
      sc.fog = null;
      this._coverTransform();
    } else {
      sc.background = new THREE.Color(bg);
      sc.backgroundIntensity = 1;
      sc.fog = new THREE.FogExp2(bg, studio ? 0.0035 : 0.011);
    }
    this.studio.visible = studio && !this.backdropTex;
  }

  /**
   * Show the camera behind the robot. `src` is a <video> (browser camera, mirrored here) or a <canvas>
   * (pictures from jarvis.py, already mirrored). Pass null to remove it.
   */
  setBackdrop(src, { mirror = true } = {}) {
    if (this.backdropTex) this.backdropTex.dispose();
    this.backdropSrc = src || null;
    this.backdropMirror = mirror;
    this.backdropTex = null;
    if (src) {
      const t = src instanceof HTMLVideoElement ? new THREE.VideoTexture(src) : new THREE.CanvasTexture(src);
      t.colorSpace = THREE.SRGBColorSpace;
      t.generateMipmaps = false;
      t.minFilter = THREE.LinearFilter;
      this.backdropTex = t;
    }
    this.cover = null;
    this._applyBackground();
    this.emit('backdrop', !!src);
  }

  /** Call after drawing a new picture into a canvas backdrop. */
  updateBackdrop() {
    if (!this.backdropTex) return;
    if (!(this.backdropSrc instanceof HTMLVideoElement)) this.backdropTex.needsUpdate = true;
    if (!this.cover) this._coverTransform();
  }

  // Crop the picture to cover the screen (no stretching), flipping it horizontally if it is a raw video.
  _coverTransform() {
    const t = this.backdropTex, v = this.backdropSrc;
    const vw = v && (v.videoWidth || v.width), vh = v && (v.videoHeight || v.height);
    if (!t || !vw || !this.W) return;
    const Av = this.W / this.H, Ac = vw / vh;
    const rx = Math.min(1, Av / Ac), ry = Math.min(1, Ac / Av);
    this.cover = { rx, ry };
    if (this.backdropMirror) { t.repeat.set(-rx, ry); t.offset.set((1 + rx) / 2, (1 - ry) / 2); }
    else { t.repeat.set(rx, ry); t.offset.set((1 - rx) / 2, (1 - ry) / 2); }
  }

  /** Map a point in mirrored video coordinates (0..1) to screen coordinates (0..1). */
  backdropMap(nx, ny) {
    const c = this.cover;
    if (!this.backdropTex || !c) return [nx, ny];
    return [(nx - (1 - c.rx) / 2) / c.rx, (ny - (1 - c.ry) / 2) / c.ry];
  }

  setLook(look) {
    if (look === this.look) return;
    const keep = { e: this.e, eT: this.eT, sel: this.selected?.def.id, group: this.groupFilter, az: this.cam.az, el: this.cam.el, zoom: this.userZoom };
    this.look = look;
    this._applyLook();
    this.loadRobot(this.def, { intro: false });
    this.e = keep.e; this.eT = keep.eT; this.ev = 0;
    this.cam.az = this.cam.azC = keep.az; this.cam.el = this.cam.elC = keep.el; this.userZoom = keep.zoom;
    this.groupFilter = keep.group;
    if (keep.sel) this.selected = this.partById.get(keep.sel) || null;
    this._update(0.016);
    this.snapCamera();
    this.emit('look', look);
  }

  _setAccent(a, a2) {
    this.accent.set(a);
    this.accent2.set(a2);
    if (this.look !== 'studio') this.rim.color.copy(this.accent);
    this.under.color.copy(this.accent);
    this.ringMat.color.copy(this.accent).multiplyScalar(1.6);
    for (const r of this.rings) r.material.color.copy(this.ringMat.color);
    this.ticks.children[0].material.color.copy(this.ringMat.color);
    this.motes.material.color.copy(this.accent).multiplyScalar(1.5);
    if (this.look !== 'studio') this.guideMat.color.copy(this.accent).multiplyScalar(1.4);
    this.scanMats[0].color.copy(this.accent).multiplyScalar(1.2);
    this.scanMats[1].color.copy(this.accent).multiplyScalar(2);
  }

  // ───────────────────────── robots ─────────────────────────
  loadRobot(def, { intro = true } = {}) {
    if (this.robot) {
      this.scene.remove(this.robot);
      this.robot.traverse((o) => { o.geometry?.dispose?.(); });
    }
    if (this.guides) { this.scene.remove(this.guides); this.guides.geometry.dispose(); }
    this.def = def;
    const tone = this.look === 'studio' && def.studio ? def.studio : def;
    this._setAccent(tone.accent, tone.accent2);
    this.baseY = this.look === 'studio' ? 0 : def.hover;
    const ctx = { accent: this.accent, accent2: this.accent2, look: this.look };

    const robot = (this.robot = new THREE.Group());
    robot.position.y = this.baseY;
    this.scene.add(robot);
    this.parts = [];
    this.partById.clear();
    this.selected = this.hovered = null;
    this.groupFilter = null;

    for (const pd of def.parts) {
      const b = new Builder(ctx);
      pd.build(b);
      const root = new THREE.Group();
      root.add(b.group);
      root.position.set(...pd.home);
      if (pd.rot0) root.rotation.set(...pd.rot0);
      robot.add(root);
      const p = {
        def: pd, root, b, home: new THREE.Vector3(...pd.home), ex: new THREE.Vector3(...pd.ex),
        t: 0, dim: 1, glow: 0, anchorLocal: new THREE.Vector3(), radius: 1, spinners: [], liquids: [],
      };
      for (const m of b.meshes) m.userData.part = p;
      b.group.traverse((o) => {
        if (o.userData.spin) p.spinners.push(o);
        if (o.userData.liquid) p.liquids.push(o);
      });
      for (const em of b.edgeMats) em.userData.col = em.color.clone();
      this.parts.push(p);
      this.partById.set(pd.id, p);
    }
    robot.updateMatrixWorld(true);
    for (const p of this.parts) {
      const box = new THREE.Box3().setFromObject(p.b.group);
      const c = box.getCenter(new THREE.Vector3());
      p.anchorLocal.copy(p.root.worldToLocal(c));
      p.radius = box.getSize(new THREE.Vector3()).length() / 2;
      p.homeWorld = p.root.localToWorld(p.anchorLocal.clone());
      p.minRel = box.min.y - this.baseY; // lowest point relative to the robot origin
      p.castOn = true;
    }
    this._floorY = 0;

    // Guide lines
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.parts.length * 6), 3));
    this.guides = new THREE.LineSegments(gg, this.guideMat);
    this.guides.frustumCulled = false;
    this.scene.add(this.guides);

    this.userZoom = 1;
    this.cam.az = this.cam.azC = 0.62;
    this.cam.el = this.cam.elC = 0.3;
    if (intro && !this.reduced) {
      this.e = 1;
      this.ev = 0;
      this.eT = 0;
      this._introHold = 0.9;
      if (this.look !== 'studio') this.startScan();
    } else {
      this.e = this.eT = 0;
      this.ev = 0;
    }
    this._update(0.016);
    this.snapCamera();
    this.emit('robot', def);
  }

  startScan() { if (this.reduced || this.look === 'studio') return; this.scanT = 0; this.scan.visible = true; }

  // ───────────────────────── input ─────────────────────────
  _initInput() {
    const c = this.canvas;
    const pts = new Map();
    let drag = null;
    let pinchD = 0;
    this._dragMoved = 0;

    c.addEventListener('pointerdown', (ev) => {
      c.setPointerCapture(ev.pointerId);
      pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      this.lastInput = this.time;
      if (pts.size === 1) drag = { x: ev.clientX, y: ev.clientY, t: performance.now(), moved: 0, multi: false };
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinchD = Math.hypot(a.x - b.x, a.y - b.y);
        if (drag) drag.multi = true;
      }
    });
    c.addEventListener('pointermove', (ev) => {
      const p = pts.get(ev.pointerId);
      if (!p) { if (ev.pointerType === 'mouse') this._hoverAt = { x: ev.clientX, y: ev.clientY }; return; }
      const dx = ev.clientX - p.x, dy = ev.clientY - p.y;
      p.x = ev.clientX; p.y = ev.clientY;
      this.lastInput = this.time;
      if (pts.size === 1 && drag) {
        drag.moved += Math.abs(dx) + Math.abs(dy);
        if (drag.moved > 4) {
          this.cam.az -= dx * 0.0062;
          this.cam.el = clamp(this.cam.el + dy * 0.0048, -0.08, 1.42);
          c.style.cursor = 'grabbing';
        }
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.nudgeExplode((d - pinchD) * 0.0042);
        pinchD = d;
      }
    });
    const up = (ev) => {
      const had = pts.delete(ev.pointerId);
      c.style.cursor = '';
      if (had && drag && !drag.multi && pts.size === 0 && drag.moved <= 4 && performance.now() - drag.t < 600) {
        const hit = this._pick(ev.clientX, ev.clientY);
        this.emit('pick', hit ? hit.def.id : null);
      }
      if (pts.size === 0) drag = null;
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('pointerleave', () => { this._hoverAt = null; });

    // Mouse wheel and trackpad pinch (ctrlKey) both open/close the suit.
    c.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      const dy = ev.deltaMode === 1 ? ev.deltaY * 33 : ev.deltaY;
      this.nudgeExplode(-dy * (ev.ctrlKey ? 0.011 : 0.0011));
      this.lastInput = this.time;
    }, { passive: false });

    // Safari trackpad pinch
    let gs = 1;
    c.addEventListener('gesturestart', (ev) => { ev.preventDefault(); gs = ev.scale; });
    c.addEventListener('gesturechange', (ev) => { ev.preventDefault(); this.nudgeExplode((ev.scale - gs) * 0.9); gs = ev.scale; });
    c.addEventListener('contextmenu', (ev) => ev.preventDefault());
  }

  nudgeExplode(d) {
    this.eT = clamp(this.eT + d, 0, 1);
    this._introHold = 0;
    this.emit('input');
  }

  setExplode(v, { instant = false } = {}) {
    this.eT = clamp(v, 0, 1);
    this._introHold = 0;
    if (instant) { this.e = this.eT; this.ev = 0; }
  }

  // Click at a screen point, as if the pointer had tapped there (used by hand control).
  pickAt(x, y) {
    const hit = this._pick(x, y);
    this.emit('pick', hit ? hit.def.id : null);
  }

  /** Part and 3D point under a screen position, or null. */
  pickPoint(x, y) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const list = [];
    for (const p of this.parts) if (p.dim > 0.3) list.push(...p.b.meshes);
    for (const h of this.raycaster.intersectObjects(list, false)) {
      if (h.object.material.opacity < 0.05) continue;
      return { part: h.object.userData.part, point: h.point };
    }
    return null;
  }

  _pick(x, y) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const list = [];
    for (const p of this.parts) if (p.dim > 0.3) list.push(...p.b.meshes);
    const hits = this.raycaster.intersectObjects(list, false);
    for (const h of hits) {
      const mat = h.object.material;
      if (mat.opacity < 0.05) continue;
      return h.object.userData.part;
    }
    return null;
  }

  // ───────────────────────── state ─────────────────────────
  select(id, { reveal = true } = {}) {
    const p = id ? this.partById.get(id) : null;
    this.selected = p;
    if (p && reveal) this.eT = Math.max(this.eT, REVEAL[p.def.layer]);
    if (p) this._introHold = 0;
    this.emit('select', p ? p.def.id : null);
  }

  hover(id) {
    const p = id ? this.partById.get(id) : null;
    if (p !== this.hovered) { this.hovered = p; this.emit('hover', p ? p.def.id : null); }
  }

  setGroup(g) { this.groupFilter = g; }
  setOpt(k, v) { this.opts[k] = v; }
  zoomBy(f) { this.userZoom = clamp(this.userZoom * f, 0.55, 1.7); }

  resetView() {
    this.cam.az = 0.62; this.cam.el = 0.3; this.userZoom = 1;
    this.select(null);
    this.setGroup(null);
  }

  setInsets(left, right, bottom = 0) {
    this.insets.left = left; this.insets.right = right; this.insets.bottom = bottom;
    this._applyView();
  }

  stageName() {
    const e = this.e;
    return e < 0.02 ? 'Sealed' : e < 0.4 ? 'Shell opening' : e < 0.75 ? 'Subsystems out' : e < 0.97 ? 'Internals out' : 'Full teardown';
  }

  anchorWorld(p, name) {
    const a = name && p.def.anchors && p.def.anchors[name];
    const v = a ? new THREE.Vector3(...a) : p.anchorLocal.clone();
    return p.root.localToWorld(v);
  }

  projectAnchor(p, out) {
    const v = this.anchorWorld(p).project(this.camera);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    out.x = (v.x * 0.5 + 0.5) * w;
    out.y = (-v.y * 0.5 + 0.5) * h;
    out.z = v.z;
    return out;
  }

  // ───────────────────────── resize ─────────────────────────
  _onResize() {
    const host = this.canvas.parentElement || this.canvas;
    const w = Math.max(2, host.clientWidth), h = Math.max(2, host.clientHeight);
    this.W = w; this.H = h;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    this.camera.aspect = w / h;
    this._applyView();
    this._coverTransform();
  }

  _applyView() {
    const { W, H } = this;
    if (!W) return;
    const shift = (this.insets.left - this.insets.right) / 2;
    const lift = this.insets.bottom / 2;
    if (Math.abs(shift) > 0.5 || lift > 0.5) this.camera.setViewOffset(W, H, -shift, lift, W, H);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  // ───────────────────────── frame ─────────────────────────
  _frame(tms) {
    const now = tms / 1000;
    const dt = Math.min(0.05, this._last ? now - this._last : 0.016);
    this._last = now;
    this.time += dt;
    this._adapt(dt);
    this._update(dt);
    if (this.look === 'holo' && this.opts.bloom) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
    this.emit('frame', dt);
  }

  // Switch off glow and drop to 1x pixel ratio if the device can't hold ~26 fps.
  _adapt(dt) {
    if (window.__armoryNoAdapt || this._adapted) return;
    this._perf = this._perf || { t: 0, n: 0, sum: 0 };
    const P = this._perf;
    P.t += dt;
    if (P.t < 1.2) return; // skip start-up and intro hitches
    P.n++; P.sum += dt;
    if (P.t > 4.5) {
      this._adapted = true;
      const fps = P.n / P.sum;
      if (fps < 26) {
        this.opts.bloom = false;
        if (this.look === 'studio') { this.key.shadow.map?.dispose(); this.key.shadow.map = null; this.key.shadow.mapSize.set(1024, 1024); }
        this.renderer.setPixelRatio(1);
        this._onResize();
        this.emit('quality', fps);
      }
    }
  }

  _update(dt) {
    const t = this.time;
    this.uniforms.uTime.value = t;
    if (this._introHold > 0) { this._introHold -= dt; }
    else if (this.reduced) this.e += (this.eT - this.e) * damp(dt, 30);
    else {
      // A lightly under-damped spring: parts accelerate, glide and settle like real mass.
      const K = 52, C = 13;
      this.ev += ((this.eT - this.e) * K - this.ev * C) * dt;
      this.e += this.ev * dt;
      if (this.e < 0) { this.e = 0; this.ev = 0; }
      if (this.e > 1) { this.e = 1; this.ev = 0; }
    }
    if (Math.abs(this.eT - this.e) < 0.0004 && Math.abs(this.ev) < 0.01) { this.e = this.eT; this.ev = 0; }
    const e = this.e;

    // part transforms
    for (const p of this.parts) {
      const d = p.def.delay || 0;
      const st = LAYER_START[p.def.layer] + d;
      const k = easeInOut(clamp((e - st) / (LAYER_SPAN - d), 0, 1));
      p.t = k;
      p.root.position.set(p.home.x + p.ex.x * k, p.home.y + p.ex.y * k, p.home.z + p.ex.z * k);
      for (const s of p.spinners) s.rotation.y += dt * (s.userData.spin || 1);
      for (const l of p.liquids) l.rotation.z = Math.sin(t * 1.3 + p.home.x) * 0.012;
    }
    const bob = this.look === 'studio' ? 0 : Math.sin(t * 0.9) * 0.05 * (1 - e) * (this.reduced ? 0 : 1);
    this.robot.position.y = this.baseY + bob;
    this.robot.updateMatrixWorld(true);

    this._visuals(dt);
    this._guides();
    this._water(dt);
    this._ambient(dt);
    this._camera(dt);
    this._hover();
    this.camera.updateMatrixWorld();
    for (const h of this.hooks) h(dt);
  }

  _visuals(dt) {
    const sel = this.selected, hov = this.hovered, gf = this.groupFilter;
    const studio = this.look === 'studio';
    const xr = this.opts.xray ? smooth(this.e, 0.03, 0.3) : 0;
    for (const p of this.parts) {
      let target = 1;
      if (sel) target = p === sel ? 1 : 0.09;
      else if (gf) target = p.def.group === gf ? 1 : 0.09;
      p.dim += (target - p.dim) * damp(dt, 10);
      const gt = p === sel ? 1 : p === hov ? 0.65 : 0;
      p.glow += (gt - p.glow) * damp(dt, 12);
      const pulse = p === sel ? 0.85 + 0.15 * Math.sin(this.time * 4) : 1;
      for (const r of p.b.records) {
        const f = r.shell ? 1 - (studio ? 0.58 : 0.66) * xr : 1;
        const o = r.base * f * p.dim;
        r.mat.opacity = o;
        r.mat.depthWrite = o > 0.62 && !r.glass;
        if (p.glow > 0.01) r.mat.emissive.copy(r.emissive).lerp(this.accent, p.glow * (studio ? 0.2 : 0.5) * pulse);
        else r.mat.emissive.copy(r.emissive);
      }
      for (const em of p.b.edgeMats) {
        if (em.userData.studio) {
          // outline only the selected or hovered part
          em.opacity = em.userData.base * p.glow * p.dim;
          continue;
        }
        const boost = 1 + p.glow * 0.9;
        em.opacity = Math.min(1, em.userData.base * p.dim * boost);
        em.color.copy(em.userData.col).lerp(WHITE, p.glow * 0.55);
      }
      // dimmed or X-rayed shell parts stop casting shadows
      if (studio) {
        const cast = p.dim > 0.5;
        if (cast !== p.castOn) { p.castOn = cast; for (const m of p.b.meshes) m.castShadow = cast; }
      }
      p.root.visible = p.dim > 0.015;
    }
  }

  _guides() {
    const pos = this.guides.geometry.attributes.position;
    let i = 0;
    for (const p of this.parts) {
      const cur = this.anchorWorld(p);
      pos.setXYZ(i++, p.homeWorld.x, p.homeWorld.y + this._hoverY(), p.homeWorld.z);
      pos.setXYZ(i++, cur.x, cur.y, cur.z);
    }
    pos.needsUpdate = true;
    this.guides.computeLineDistances();
    const on = this.opts.guides && !this.selected;
    this.guides.visible = on;
    this.guideMat.opacity = (this.look === 'studio' ? 0.5 : 0.4) * smooth(this.e, 0.02, 0.2) * (this.groupFilter ? 0.4 : 1);
  }

  _hoverY() { return this.robot.position.y - this.baseY; }

  _water(dt) {
    const on = this.opts.water && this.def.water;
    this.flowLine.visible = this.flowPts.visible = !!on;
    this.flowLine.renderOrder = this.flowPts.renderOrder = 20;
    if (!on) return;
    const pts = [];
    for (const ref of this.def.water) {
      const [id, an] = ref.split(':');
      const p = this.partById.get(id);
      if (p) pts.push(this.anchorWorld(p, an));
    }
    if (pts.length < 2) return;
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.35);
    const lp = curve.getPoints(80);
    this.flowLine.geometry.setFromPoints(lp);
    const pos = this.flowPts.geometry.attributes.position;
    const col = this.flowPts.geometry.attributes.color;
    const studio = this.look === 'studio';
    const clean = new THREE.Color(studio ? 0x1b9be0 : 0x56d3ff), dirty = new THREE.Color(studio ? 0xa4651f : 0xd9a35a);
    const sq = this.def.water.findIndex((r) => r.startsWith('squeegee'));
    const split = sq > 0 ? sq / (this.def.water.length - 1) : 0.65;
    for (let i = 0; i < this.flowN; i++) {
      this.flowU[i] = (this.flowU[i] + dt * 0.14) % 1;
      const u = this.flowU[i];
      const v = curve.getPointAt(u);
      pos.setXYZ(i, v.x, v.y, v.z);
      const c = u < split ? clean : dirty;
      col.setXYZ(i, c.r * this.flowGain, c.g * this.flowGain, c.b * this.flowGain);
    }
    pos.needsUpdate = col.needsUpdate = true;
  }

  _ambient(dt) {
    const t = this.time;
    if (this.look === 'studio') {
      // The floor sits under the lowest part, so a closed robot rests on it and open parts float above it.
      let low = Infinity;
      for (const p of this.parts) low = Math.min(low, this.robot.position.y + p.minRel + (p.root.position.y - p.home.y));
      this._floorY += (low - this._floorY) * damp(dt, 9);
      this.studio.position.y = this._floorY - 0.01;
      this.contact.material.opacity = 0.55 * (1 - smooth(this.e, 0, 0.28));
      this.key.target.position.y = 4 + this._floorY * 0.5;
      return;
    }
    this.ringMat.opacity = 1;
    for (const r of this.rings) if (r.userData.spin) r.rotation.z += dt * r.userData.spin * (this.reduced ? 0 : 1);
    this.ticks.rotation.y += dt * 0.02 * (this.reduced ? 0 : 1);
    this.platform.position.y = 0;
    this.under.intensity = 20 + 6 * Math.sin(t * 1.4) * (this.reduced ? 0 : 1) + this.e * 10;
    if (!this.reduced) {
      const pos = this.motes.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + dt * 0.12;
        if (y > 15) y = -1;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }
    if (this.scanT >= 0) {
      this.scanT += dt / 1.9;
      const k = this.scanT;
      if (k >= 1) { this.scanT = -1; this.scan.visible = false; }
      else {
        this.scan.position.y = lerp(-0.2, 13.5, easeInOut(k));
        const env = Math.sin(Math.PI * k);
        this.scanMats[0].opacity = 0.09 * env;
        this.scanMats[1].opacity = 0.95 * env;
      }
    }
  }

  // Fit the camera to where the parts actually are right now (or to the filtered group),
  // using the current view direction, so every open state stays framed.
  _fit() {
    const c = this.cam, e = this.e;
    const f = new THREE.Vector3(Math.sin(c.azC) * Math.cos(c.elC), Math.sin(c.elC), Math.cos(c.azC) * Math.cos(c.elC));
    const right = new THREE.Vector3(0, 1, 0).cross(f).normalize();
    const up = new THREE.Vector3().crossVectors(f, right);
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
    const gf = this.groupFilter;
    for (const p of this.parts) {
      if (gf && p.def.group !== gf) continue;
      const w = this.anchorWorld(p);
      const r = p.radius * 0.55;
      const x = w.dot(right), y = w.dot(up), z = w.dot(f);
      minX = Math.min(minX, x - r); maxX = Math.max(maxX, x + r);
      minY = Math.min(minY, y - r); maxY = Math.max(maxY, y + r);
      minZ = Math.min(minZ, z - r); maxZ = Math.max(maxZ, z + r);
    }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
    const center = right.clone().multiplyScalar(cx).addScaledVector(up, cy).addScaledVector(f, cz);
    const tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const fh = Math.max(0.2, (this.H - this.insets.bottom) / this.H);
    const fw = Math.max(0.2, (this.W - this.insets.left - this.insets.right) / this.W);
    const tanVe = tanV * fh;
    const tanHe = tanV * (this.W / this.H) * fw;
    const margin = lerp(1.38, 1.14, smooth(e, 0, 0.6));
    const need = Math.max(((maxY - minY) / 2) / tanVe, ((maxX - minX) / 2) / tanHe) * margin + (maxZ - cz);
    return { center, dist: clamp(need, 9, 80) };
  }

  snapCamera() {
    this._camera(1, true);
  }

  _camera(dt, snap = false) {
    const c = this.cam;
    const fit = this._fit();
    let dist = fit.dist * this.userZoom;
    let { x: tx, y: ty, z: tz } = fit.center;

    const sel = this.selected;
    if (sel) {
      const w = this.anchorWorld(sel);
      tx = w.x; ty = w.y; tz = w.z;
      const aspect = Math.max(0.3, (this.W - this.insets.left - this.insets.right) / Math.max(1, this.H - this.insets.bottom));
      dist = clamp(sel.radius * 3.5 + 5, 8.5, 22) * Math.max(1, 0.6 / aspect) * this.userZoom;
    }

    // auto-orbit when idle
    const idle = this.time - this.lastInput > 3.5;
    if (this.opts.rotate && idle && !sel && !this.reduced) c.az += dt * 0.07;

    const k = snap ? 1 : damp(dt, 4.5);
    c.azC += (c.az - c.azC) * (snap ? 1 : damp(dt, 9));
    c.elC += (c.el - c.elC) * (snap ? 1 : damp(dt, 9));
    c.dist += (dist - c.dist) * k;
    c.tx += (tx - c.tx) * k;
    c.ty += (ty - c.ty) * k;
    c.tz += (tz - c.tz) * k;
    const ce = Math.cos(c.elC);
    this.camera.position.set(c.tx + Math.sin(c.azC) * ce * c.dist, c.ty + Math.sin(c.elC) * c.dist, c.tz + Math.cos(c.azC) * ce * c.dist);
    this.camera.lookAt(c.tx, c.ty, c.tz);
  }

  _hover() {
    if (!this._hoverAt) { this.hover(this.hoverExternal || null); return; }
    this._hf = (this._hf || 0) + 1;
    if (this._hf % 3) return;
    const hit = this._pick(this._hoverAt.x, this._hoverAt.y);
    this.hover(hit ? hit.def.id : null);
    this.canvas.style.cursor = hit ? 'pointer' : '';
  }
}

const WHITE = new THREE.Color(1, 1, 1);
