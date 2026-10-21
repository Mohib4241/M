// The race scene: road, kerbs, lane lines, checkered finish, verges, lamps and trees, the two
// robots, dust, skid marks and dust puffs, the vacuum's mouth, and a chase camera.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ROAD_W, KERB_W, PAVE_W } from './track.js';
import { MOUTH, NOZZLE, TAKEN } from './dust.js';
import { carModel } from './models.js';
import { CAR } from './car.js';
import { rng } from './rng.js';

const tmp = new THREE.Vector3();

// One renderer serves every lap. Textures are made once and reused.
const TEX = {};
const cached = (key, make) => (TEX[key] ||= make());

export function createRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); // sharp enough, and kinder to laptop GPUs
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

function canvasTex(size, draw, { repeat = null, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(...repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const asphaltTex = () => canvasTex(512, (g, s) => {
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

const grassTex = () => canvasTex(256, (g, s) => {
  g.fillStyle = '#5f8f4e';
  g.fillRect(0, 0, s, s);
  const r = rng(5);
  for (let i = 0; i < 2600; i++) {
    const l = 38 + r() * 30, a = 60 + r() * 60;
    g.fillStyle = `rgba(${l + 20},${l + 60},${l},${a / 255})`;
    g.fillRect(r() * s, r() * s, 1.4, 2 + r() * 3);
  }
}, { repeat: [60, 60] });

const concreteTex = () => canvasTex(256, (g, s) => {
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
}, { repeat: [1, 1] });

const checkerTex = () => canvasTex(128, (g, s) => {
  const n = 8, q = s / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
    g.fillStyle = (i + j) % 2 ? '#f4f4f1' : '#15171a';
    g.fillRect(i * q, j * q, q, q);
  }
});

const dotTex = () => canvasTex(64, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, s, s);
}, { srgb: false });

const mouthTex = () => canvasTex(128, (g, s) => {
  g.clearRect(0, 0, s, s);
  g.fillStyle = 'rgba(120,230,255,0.9)';
  for (let x = -s; x < s * 2; x += 36) {
    g.beginPath(); g.moveTo(x, s); g.lineTo(x + 18, s); g.lineTo(x + 18 + s, 0); g.lineTo(x + s, 0); g.fill();
  }
}, { srgb: true });

const SKY = { top: 0x5fa6dc, bottom: 0xe7f1f7 };

export class RaceScene {
  constructor(renderer, race, { playerDef, aiDef }) {
    this.race = race;
    this.road = race.road;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xd6e8f2, 160, 520);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 900);
    this.scene.add(this.camera);
    const pm = new THREE.PMREMGenerator(renderer);
    this.envTarget = pm.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envTarget.texture;
    pm.dispose();
    this.scene.environmentIntensity = 0.45;

    this._sky();
    this._lights();
    this._ground();
    this._road();
    this._scenery();
    this._cars(playerDef, aiDef);
    this._dust();
    this._skids();
    this._puffs();
    this._mouth();
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.initCam = false;
    this.orbit = 0;
  }

  _sky() {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { top: { value: new THREE.Color(SKY.top) }, bottom: { value: new THREE.Color(SKY.bottom) } },
      vertexShader: 'varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP;\nvoid main() {\n  float h = normalize(vP).y;\n  gl_FragColor = vec4(mix(bottom, top, smoothstep(0.0, 0.45, h)), 1.0);\n  #include <colorspace_fragment>\n}',
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), mat);
    this.scene.add(this.sky);
  }

  _lights() {
    this.hemi = new THREE.HemisphereLight(0xe2f0ff, 0x6c7068, 1.15);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -36; sc.right = sc.top = 36; sc.near = 5; sc.far = 220;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun, this.sun.target);
    this.sunOffset = new THREE.Vector3(-38, 70, 26);
  }

  _ground() {
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(1600, 1600),
      new THREE.MeshStandardMaterial({ map: cached('grass', grassTex), roughness: 1 }),
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.04;
    grass.receiveShadow = true;
    this.scene.add(grass);
  }

  // a flat ribbon following the centre line, from lateral offset d0 to d1 (both in units)
  _ribbon(d0, d1, y, { include = null, colorAt = null, uvU = (d) => (d + ROAD_W / 2) / ROAD_W, vScale = 1 / ROAD_W } = {}) {
    const road = this.road, N = road.n;
    const pos = [], uv = [], col = [];
    const pt = (i, d) => {
      const j = ((i % N) + N) % N;
      return [road.x[j] + d * road.tz[j], road.z[j] - d * road.tx[j]];
    };
    const push = (p, d, v, c) => {
      pos.push(p[0], y, p[1]);
      uv.push(uvU(d), v);
      if (c) col.push(c.r, c.g, c.b);
    };
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      if (include && !include(i)) continue;
      const a0 = pt(i, d0), a1 = pt(i, d1), b0 = pt(i + 1, d0), b1 = pt(i + 1, d1);
      const va = i * road.step * vScale, vb = (i + 1) * road.step * vScale;
      const cc = colorAt ? colorAt(i, c) : null;
      push(a0, d0, va, cc); push(b0, d0, vb, cc); push(a1, d1, va, cc);
      push(a1, d1, va, cc); push(b0, d0, vb, cc); push(b1, d1, vb, cc);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 3).fill(0).map((_, k) => (k % 3 === 1 ? 1 : 0)), 3));
    if (colorAt) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  }

  _road() {
    const half = ROAD_W / 2;
    const asphalt = new THREE.MeshStandardMaterial({ map: cached('asphalt', asphaltTex), roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
    const road = new THREE.Mesh(this._ribbon(-half, half, 0.012), asphalt);
    road.receiveShadow = true;
    this.scene.add(road);

    // painted kerbs: red and white bands, one band per unit of road
    const kerbMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide });
    const band = (i, c) => (Math.floor(i / 1.2) % 2 ? c.setHex(0xcf2a2a) : c.setHex(0xf2f2ee));
    for (const [a, b] of [[-half - KERB_W, -half], [half, half + KERB_W]]) {
      const k = new THREE.Mesh(this._ribbon(a, b, 0.014, { colorAt: band }), kerbMat);
      k.receiveShadow = true;
      this.scene.add(k);
    }

    // paving on both sides
    const pave = new THREE.MeshStandardMaterial({ map: cached('concrete', concreteTex), roughness: 0.85, side: THREE.DoubleSide });
    for (const [a, b] of [[-half - KERB_W, -half - KERB_W - PAVE_W], [half + KERB_W, half + KERB_W + PAVE_W]]) {
      const p = new THREE.Mesh(this._ribbon(Math.min(a, b), Math.max(a, b), 0.016, { vScale: 1 / 8, uvU: (d) => d / 8 }), pave);
      p.receiveShadow = true;
      this.scene.add(p);
    }

    // paint: white edge lines and a dashed centre line
    const paint = new THREE.MeshBasicMaterial({ color: 0xf5f5f0, side: THREE.DoubleSide, toneMapped: false });
    for (const [a, b] of [[-half + 0.5, -half + 0.85], [half - 0.85, half - 0.5]]) {
      this.scene.add(new THREE.Mesh(this._ribbon(a, b, 0.02), paint));
    }
    const dashes = new THREE.Mesh(this._ribbon(-0.16, 0.16, 0.021, { include: (i) => Math.floor(i / 3) % 2 === 0 }), paint);
    this.scene.add(dashes);

    // checkered finish across the road at arc length 0
    const p0 = this.road.pointAt(0);
    const finish = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_W, 1.6),
      new THREE.MeshStandardMaterial({ map: cached('checker', checkerTex), roughness: 0.5 }),
    );
    finish.rotation.set(-Math.PI / 2, 0, 0);
    finish.rotation.order = 'YXZ';
    finish.rotation.y = Math.atan2(p0.tx, p0.tz);
    finish.position.set(p0.x, 0.03, p0.z);
    finish.receiveShadow = true;
    this.scene.add(finish);
  }

  _scenery() {
    const road = this.road, r = rng(road.seed * 13 + 3);
    // lamp posts along the pavement
    const poleGeo = new THREE.CylinderGeometry(0.11, 0.15, 7.2, 10);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x59606a, roughness: 0.45, metalness: 0.6 });
    const headGeo = new THREE.BoxGeometry(0.9, 0.22, 0.45);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf6f8fa, emissive: 0xfff4d0, emissiveIntensity: 0.6, roughness: 0.3 });
    const lamps = [];
    for (let s = 6, k = 0; s < road.length; s += 30, k++) {
      for (const side of [-1, 1]) {
        const p = road.pointAt(s);
        const d = side * (ROAD_W / 2 + KERB_W + PAVE_W - 1);
        lamps.push({ x: p.x + d * p.tz, z: p.z - d * p.tx, yaw: Math.atan2(p.tx, p.tz) + (side > 0 ? Math.PI / 2 : -Math.PI / 2), side });
      }
    }
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, lamps.length);
    const heads = new THREE.InstancedMesh(headGeo, headMat, lamps.length);
    lamps.forEach((l, i) => {
      const m = new THREE.Matrix4();
      m.compose(new THREE.Vector3(l.x, 3.6, l.z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      poles.setMatrixAt(i, m);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, l.yaw, 0));
      m.compose(new THREE.Vector3(l.x, 7.2, l.z), q, new THREE.Vector3(1, 1, 1));
      heads.setMatrixAt(i, m);
    });
    poles.castShadow = heads.castShadow = true;
    this.scene.add(poles, heads);

    // trees on the grass
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 3, 8);
    const leafGeo = new THREE.IcosahedronGeometry(2.6, 1);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4f35, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
    const trees = [];
    for (let s = 0; s < road.length; s += 9) {
      if (r() < 0.45) continue;
      const p = road.pointAt(s);
      const side = r() < 0.5 ? -1 : 1;
      const d = side * (ROAD_W / 2 + KERB_W + PAVE_W + r.range(5, 16));
      trees.push({ x: p.x + d * p.tz, z: p.z - d * p.tx, s: r.range(0.8, 1.3), tint: r.range(0.85, 1.15) });
    }
    const tr = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
    const lf = new THREE.InstancedMesh(leafGeo, leafMat, trees.length);
    const col = new THREE.Color();
    trees.forEach((t, i) => {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(t.x, 1.5 * t.s, t.z), new THREE.Quaternion(), new THREE.Vector3(t.s, t.s, t.s));
      tr.setMatrixAt(i, m);
      const m2 = new THREE.Matrix4().compose(new THREE.Vector3(t.x, 4.6 * t.s, t.z), new THREE.Quaternion(), new THREE.Vector3(t.s, t.s * 1.1, t.s));
      lf.setMatrixAt(i, m2);
      col.setHSL(0.28 + r() * 0.05, 0.45 + r() * 0.1, (0.28 + r() * 0.1) * t.tint, THREE.SRGBColorSpace);
      lf.setColorAt(i, col);
    });
    tr.castShadow = lf.castShadow = true;
    tr.receiveShadow = lf.receiveShadow = true;
    this.scene.add(tr, lf);
  }

  _cars(playerDef, aiDef) {
    this.playerModel = carModel(playerDef);
    this.aiModel = carModel(aiDef);
    this.scene.add(this.playerModel.car, this.aiModel.car);
    // a soft dark pool under each robot so it sits on the road
    const shadowTex = cached('dot', dotTex);
    for (const key of ['player', 'ai']) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 12), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.45, depthWrite: false, color: 0x0b1116 }));
      m.rotation.order = 'YXZ'; // lie flat, then turn to the robot's heading
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.03;
      m.renderOrder = 1;
      this.scene.add(m);
      this[`${key}Blob`] = m;
    }
  }

  _dust() {
    const f = this.race.dust;
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
    this.dustMesh = new THREE.InstancedMesh(geo, mat, f.n);
    this.dustMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.dustMesh.castShadow = false;
    const col = new THREE.Color();
    const m = new THREE.Matrix4();
    for (let i = 0; i < f.n; i++) {
      m.compose(new THREE.Vector3(f.x[i], f.size[i] * 0.4, f.z[i]), new THREE.Quaternion(), new THREE.Vector3(f.size[i], f.size[i] * 0.45, f.size[i]));
      this.dustMesh.setMatrixAt(i, m);
      // fine grey-brown dust, a shade lighter than the asphalt so it reads on the road
      col.setHSL(0.08 + f.tint[i] * 0.04, 0.1 + f.tint[i] * 0.08, 0.3 + f.tint[i] * 0.14, THREE.SRGBColorSpace);
      this.dustMesh.setColorAt(i, col);
    }
    this.dustMesh.instanceMatrix.needsUpdate = true;
    this.dustMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.dustMesh);
  }

  _skids() {
    this.skidMax = 900;
    const geo = new THREE.BufferGeometry();
    this.skidPos = new Float32Array(this.skidMax * 6 * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.skidPos, 3));
    geo.setDrawRange(0, 0);
    this.skidGeo = geo;
    this.skidCount = 0;
    this.skidLast = { l: null, r: null };
    const mat = new THREE.MeshBasicMaterial({ color: 0x14171a, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, toneMapped: false });
    this.skids = new THREE.Mesh(geo, mat);
    this.skids.frustumCulled = false;
    this.skids.renderOrder = 2;
    this.scene.add(this.skids);
  }

  _puffs() {
    const N = 360;
    this.puffN = N;
    this.puffs = Array.from({ length: N }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 1, tint: 0 }));
    const pos = new Float32Array(N * 3), size = new Float32Array(N), alpha = new Float32Array(N), tint = new Float32Array(N);
    this.puffAttr = { pos, size, alpha, tint };
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
    geo.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { scale: { value: 500 } },
      vertexShader: `attribute float aSize; attribute float aAlpha; attribute float aTint; varying float vA; varying float vT;
        uniform float scale;
        void main() { vA = aAlpha; vT = aTint; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA; varying float vT;
        void main() { vec2 c = gl_PointCoord - 0.5; float d = dot(c, c) * 4.0; float a = smoothstep(1.0, 0.0, d) * vA;
          if (a < 0.01) discard; vec3 col = mix(vec3(0.42, 0.37, 0.3), vec3(0.6, 0.58, 0.54), vT); gl_FragColor = vec4(col, a * 0.8);
          #include <colorspace_fragment> }`,
    });
    this.puffPoints = new THREE.Points(geo, mat);
    this.puffPoints.frustumCulled = false;
    this.puffPoints.renderOrder = 3;
    this.scene.add(this.puffPoints);
    this.puffCursor = 0;
  }

  _spawnPuff(x, y, z, vx, vy, vz, size, life, tint) {
    const p = this.puffs[this.puffCursor];
    this.puffCursor = (this.puffCursor + 1) % this.puffN;
    Object.assign(p, { x, y, z, vx, vy, vz, size, life, max: life, tint });
  }

  _mouth() {
    const tex = cached('mouth', mouthTex);
    this.mouthTex = tex;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    this.mouth = new THREE.Mesh(new THREE.PlaneGeometry(MOUTH.half * 2, MOUTH.f1 - MOUTH.f0), mat);
    this.mouth.rotation.order = 'YXZ';
    this.mouth.rotation.x = -Math.PI / 2;
    this.mouth.renderOrder = 4;
    this.scene.add(this.mouth);
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Put every visual in place for the current race state and draw one frame. */
  draw(dt, opts = {}) {
    const race = this.race, P = race.player.car, A = race.ai.car;
    this._placeCar(this.playerModel, P);
    this._placeCar(this.aiModel, A);
    this.playerBlob.position.set(P.x, 0.03, P.z);
    this.playerBlob.rotation.set(-Math.PI / 2, P.psi, 0);
    this.aiBlob.position.set(A.x, 0.03, A.z);
    this.aiBlob.rotation.set(-Math.PI / 2, A.psi, 0);

    // the vacuum mouth: a moving glow on the road in front of the robot while the pickup is held
    const sx = Math.sin(P.psi), cz = Math.cos(P.psi);
    const mf = (MOUTH.f0 + MOUTH.f1) / 2;
    this.mouth.position.set(P.x + sx * mf, 0.05, P.z + cz * mf);
    this.mouth.rotation.set(-Math.PI / 2, P.psi, 0);
    this.mouth.material.opacity = opts.pick ? 0.75 : 0;
    this.mouthTex.offset.y -= dt * 2.4;

    this._dustUpdate(dt);
    this._trails(dt, opts);
    this._camera(dt, opts);
    this._sunFollow(P);
    this.renderer.render(this.scene, this.camera);
  }

  _placeCar(model, c) {
    const { car, wheels, r } = model;
    car.position.set(c.x, car.position.y, c.z);
    car.rotation.y = c.psi;
    // the two drive wheels turn at their own speeds, so a turn shows the outside wheel going faster
    if (wheels.l) wheels.l.rotation.x = c.spinL / r;
    if (wheels.r) wheels.r.rotation.x = c.spinR / r;
  }

  _dustUpdate(dt) {
    const f = this.race.dust;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3(), s = new THREE.Vector3();
    let any = false;
    for (let i = 0; i < f.n; i++) {
      if (!f.changed[i]) continue;
      f.changed[i] = 0;
      any = true;
      const sz = f.size[i];
      if (f.state[i] === TAKEN) {
        s.set(0, 0, 0);
        v.set(f.x[i], 0, f.z[i]);
      } else {
        const lift = f.state[i] === 1 ? 0.5 : 0; // grains being sucked up lift off the road
        v.set(f.x[i], sz * 0.4 + lift, f.z[i]);
        s.set(sz, sz * 0.45, sz);
      }
      m.compose(v, q, s);
      this.dustMesh.setMatrixAt(i, m);
    }
    if (any) this.dustMesh.instanceMatrix.needsUpdate = true;
  }

  _trails(dt, opts) {
    const race = this.race, P = race.player;
    const c = P.car;
    const sx = Math.sin(c.psi), cz = Math.cos(c.psi);
    // skid marks under the rear wheels while the rear slides or the robot brakes hard
    const sliding = c.drift > 0.35 || (opts.brake && Math.abs(c.vx) > 3);
    // rear wheel positions: back from the centre along the axle, out to each side
    const rear = [-1, 1].map((side) => ({
      x: c.x - sx * CAR.B + cz * side * 1.9,
      z: c.z - cz * CAR.B - sx * side * 1.9,
    }));
    rear.forEach((p, i) => {
      const key = i ? 'r' : 'l';
      const last = this.skidLast[key];
      if (sliding && last && !P.finished) this._skidQuad(last, p);
      this.skidLast[key] = sliding ? p : null;
    });
    if (sliding) {
      for (const p of rear) {
        if (Math.random() < 0.7) this._spawnPuff(p.x, 0.2, p.z, (Math.random() - 0.5) * 1.2, 0.8 + Math.random(), (Math.random() - 0.5) * 1.2, 1.4 + Math.random() * 1.2, 0.9 + Math.random() * 0.5, 0);
      }
    }
    // dust clouds off the rear when the robot moves quickly on pavement or grass
    if (Math.abs(c.vx) > 4 && race.player.surf !== 'road' && Math.random() < 0.3) {
      const p = rear[0];
      this._spawnPuff(p.x, 0.3, p.z, -sx * 1.5 + (Math.random() - 0.5), 0.6, -cz * 1.5 + (Math.random() - 0.5), 1.8, 1.1, 1);
    }
    // the vacuum's breath: small puffs at the nozzle while the pickup is held
    if (opts.pick && race.dust.sucking > 0) {
      for (let k = 0; k < 2; k++) {
        const jx = (Math.random() - 0.5) * MOUTH.half * 1.6;
        const x = c.x + sx * (NOZZLE + 0.2) + cz * jx, z = c.z + cz * (NOZZLE + 0.2) - sx * jx;
        this._spawnPuff(x, 0.35, z, -sx * 1.2, 0.6 + Math.random() * 0.4, -cz * 1.2, 0.8 + Math.random() * 0.4, 0.45, 0);
      }
    }
    // age and move the puffs
    const A = this.puffAttr;
    for (let i = 0; i < this.puffN; i++) {
      const p = this.puffs[i];
      if (p.life > 0) {
        p.life -= dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        p.vx *= 0.97; p.vz *= 0.97; p.vy += 0.6 * dt;
        const k = Math.max(0, p.life / p.max);
        A.pos[i * 3] = p.x; A.pos[i * 3 + 1] = p.y; A.pos[i * 3 + 2] = p.z;
        A.size[i] = p.size * (1.25 - k * 0.55); // world diameter; the shader turns it into pixels
        A.alpha[i] = Math.min(1, k * 1.4) * (p.tint ? 0.85 : 0.5);
        A.tint[i] = p.tint;
      } else {
        A.alpha[i] = 0;
      }
    }
    const g = this.puffPoints.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
    g.attributes.aTint.needsUpdate = true;
    // pixels per world unit at unit depth, so a puff keeps its real size on screen
    const fovK = this.renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2));
    this.puffPoints.material.uniforms.scale.value = fovK;
  }

  _skidQuad(a, b) {
    const pos = this.skidPos;
    const hw = 0.22;
    const dx = b.x - a.x, dz = b.z - a.z;
    if (Math.hypot(dx, dz) < 0.05) return;
    const nx = -dz, nz = dx;
    const n = Math.hypot(nx, nz) || 1;
    const ox = (nx / n) * hw, oz = (nz / n) * hw;
    const y = 0.025;
    const v = [
      a.x - ox, y, a.z - oz, a.x + ox, y, a.z + oz, b.x - ox, y, b.z - oz,
      a.x + ox, y, a.z + oz, b.x + ox, y, b.z + oz, b.x - ox, y, b.z - oz,
    ];
    const base = (this.skidCount % this.skidMax) * 18;
    pos.set(v, base);
    this.skidCount++;
    this.skidGeo.attributes.position.needsUpdate = true;
    this.skidGeo.setDrawRange(0, Math.min(this.skidCount, this.skidMax) * 6);
  }

  _camera(dt, opts) {
    const race = this.race, c = race.player.car;
    const speed = Math.abs(c.vx);
    const fwd = tmp.set(Math.sin(c.psi), 0, Math.cos(c.psi));
    const dist = 18 + Math.min(3, speed * 0.25);
    const height = 7.6 + Math.min(1.5, speed * 0.1);
    if (opts.finishView) {
      // slow orbit around the robot once the lap is done
      this.orbit += dt * 0.25;
      const o = this.orbit;
      const target = new THREE.Vector3(c.x + Math.cos(o) * 18, 7.6, c.z + Math.sin(o) * 18);
      this.camPos.lerp(target, 1 - Math.exp(-dt * 2));
    } else {
      const target = new THREE.Vector3(c.x - fwd.x * dist, height, c.z - fwd.z * dist);
      if (!this.initCam) { this.camPos.copy(target); this.initCam = true; }
      this.camPos.lerp(target, 1 - Math.exp(-dt * 7));
    }
    this.camera.position.copy(this.camPos);
    this.camLook.set(c.x + fwd.x * 4, 1.4, c.z + fwd.z * 4);
    this.camera.lookAt(this.camLook);
    const fov = 50 + Math.min(10, speed * 0.6);
    if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
  }

  _sunFollow(c) {
    this.sun.position.set(c.x + this.sunOffset.x, this.sunOffset.y, c.z + this.sunOffset.z);
    this.sun.target.position.set(c.x, 0, c.z);
    this.sun.target.updateMatrixWorld();
  }

  /** Free this lap's geometry and materials. The shared renderer and cached textures stay. */
  dispose() {
    this.scene.traverse((o) => {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) m?.dispose?.();
    });
    this.envTarget.dispose();
  }
}
