// The race scene: the road with its kerbs, paddock and paint, the racing club around it (club.js,
// clubscene.js), the two robots, dust, skid marks, smoke and sparks, the vacuum's mouth, and a
// chase camera. One renderer serves every lap; textures are made once (textures.js).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ROAD_W, KERB_W, PAVE_W } from './track.js';
import { MOUTH, NOZZLE, TAKEN } from './dust.js';
import { carModel } from './models.js';
import { CAR } from './car.js';
import { layoutClub, CLUB } from './club.js';
import { buildClub } from './clubscene.js';
import { Effects } from './fx.js';
import { clamp } from './rng.js';
import { pointScale } from './pointscale.js';
import {
  cached, asphaltTex, carParkTex, concreteTex, checkerTex, dotTex, mouthTex,
} from './textures.js';

const tmp = new THREE.Vector3();

export function createRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); // sharp enough, and kinder to laptop GPUs
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.1;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFShadowMap;
  return r;
}

// Night at the club: a deep blue sky, a sodium-lit horizon, and fog the same colour as the horizon
// so the skyline fades into it.
const SKY = { top: 0x0b1124, horizon: 0x2b3457, glow: 0xd9824f };

export class RaceScene {
  constructor(renderer, race, { playerDef, aiDef }) {
    this.race = race;
    this.road = race.road;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(SKY.horizon, 120, 460);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 900);
    this.scene.add(this.camera);
    const pm = new THREE.PMREMGenerator(renderer);
    this.envTarget = pm.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envTarget.texture;
    pm.dispose();
    this.scene.environmentIntensity = 0.5;

    this._sky();
    this._lights();
    this._ground();
    this._road();
    this._club();
    this._cars(playerDef, aiDef);
    this._dust();
    this._mouth();
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.initCam = false;
    this.orbit = 0;
    this.time = 0;
    this.fov = 56;
    this.motion = { vx: 0, ax: 0, burn: 0 }; // body lean, nose dip and wheel burnout of the player's robot
  }

  _sky() {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color(SKY.top) },
        horizon: { value: new THREE.Color(SKY.horizon) },
        glow: { value: new THREE.Color(SKY.glow) },
      },
      vertexShader: 'varying vec3 vP;\nvoid main() {\n  vP = position;\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n}',
      fragmentShader: [
        'uniform vec3 top; uniform vec3 horizon; uniform vec3 glow; varying vec3 vP;',
        'float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }',
        'void main() {',
        '  vec3 d = normalize(vP);',
        '  float h = d.y;',
        '  vec3 col = mix(horizon, top, smoothstep(0.0, 0.5, h));',
        '  col += glow * (1.0 - smoothstep(0.0, 0.14, h)) * 0.32;', // sodium haze over the city
        '  float star = step(0.9965, hash(floor(d * 220.0))) * smoothstep(0.2, 0.5, h);',
        '  col += vec3(star) * 0.85;',
        '  gl_FragColor = vec4(col, 1.0);',
        '  #include <colorspace_fragment>',
        '}',
      ].join('\n'),
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), mat);
    this.scene.add(this.sky);
  }

  _lights() {
    this.hemi = new THREE.HemisphereLight(0x7f8fc4, 0x1d1f29, 0.9);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffc58a, 2.0); // the last of the sunset
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
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1600, 1600),
      new THREE.MeshStandardMaterial({ map: cached('carpark', carParkTex), roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.04;
    ground.receiveShadow = true;
    this.scene.add(ground);
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
    this._paddock();
  }

  // The paddock: dark asphalt between the pavement and the barrier, a red and white chevron band at
  // the barrier's foot, and the white line where the robots are turned back.
  _paddock() {
    const a = CLUB.PADDOCK_IN, b = CLUB.BARRIER_IN;
    const both = (d0, d1, y, opts) => mergeGeometries([this._ribbon(d0, d1, y, opts), this._ribbon(-d0, -d1, y, opts)]);
    const base = new THREE.Mesh(
      both(a, b, 0.008, { uvU: (d) => d / 8, vScale: 1 / 8 }),
      new THREE.MeshStandardMaterial({ map: cached('carpark', carParkTex), color: 0xb8bcc8, roughness: 0.92, side: THREE.DoubleSide }),
    );
    base.receiveShadow = true;
    const band = (i, c) => (Math.floor(i / 3) % 2 ? c.setHex(0xcf2a2a) : c.setHex(0xe9e9e4));
    const chevrons = new THREE.Mesh(
      both(b - 1.4, b, 0.012, { colorAt: band }),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }),
    );
    chevrons.receiveShadow = true;
    const line = new THREE.Mesh(
      both(CLUB.PLAY_EDGE - 0.15, CLUB.PLAY_EDGE + 0.15, 0.015, {}),
      new THREE.MeshBasicMaterial({ color: 0xe9e9e4, side: THREE.DoubleSide, toneMapped: false }),
    );
    this.scene.add(base, chevrons, line);
  }

  // The racing club: barrier, lamps, gantry, garages, stands, clubhouse, tower, masts, skyline.
  _club() {
    this.club = buildClub(this.road, layoutClub(this.road));
    this.scene.add(this.club.group);
  }

  _cars(playerDef, aiDef) {
    this.playerModel = carModel(playerDef);
    this.aiModel = carModel(aiDef);
    for (const m of [this.playerModel, this.aiModel]) { m.car.rotation.x = 0; m.car.rotation.z = 0; }
    this.scene.add(this.playerModel.car, this.aiModel.car);
    this.fx = new Effects(this.playerModel, this.road, this.road.seed);
    this.scene.add(this.fx.group);
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
    this.time += dt;
    this.club.update(this.time);
    this._placeCar(this.playerModel, P, dt, this.motion);
    this._placeCar(this.aiModel, A, dt, null);
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
    this.fx.update(dt, {
      car: P, time: this.time, racing: !!opts.racing, brake: !!opts.brake, pick: !!opts.pick,
      sucking: !!opts.pick && race.dust.sucking > 0, surf: race.player.surf, charge: race.drift, finished: race.player.finished,
    });
    this._camera(dt, opts);
    this._sunFollow(P);
    this.renderer.render(this.scene, this.camera);
  }

  _placeCar(model, c, dt, motion) {
    const { car, wheels, r } = model;
    car.position.set(c.x, car.position.y, c.z);
    car.rotation.y = c.psi;
    let burn = 0;
    if (motion) {
      // the player's robot leans away from a turn and dips its nose on the brake
      const ax = dt > 0 ? (c.vx - motion.vx) / dt : 0;
      motion.vx = c.vx;
      motion.ax += (ax - motion.ax) * (1 - Math.exp(-dt * 8));
      const roll = clamp(c.aLat * 0.008, -0.05, 0.05), pitch = clamp(-motion.ax * 0.0035, -0.04, 0.05);
      const k = 1 - Math.exp(-dt * 10);
      car.rotation.z += (roll - car.rotation.z) * k;
      car.rotation.x += (pitch - car.rotation.x) * k;
      motion.burn += dt * 28 * c.drift; // the wheels spin faster than the ground while sliding
      burn = motion.burn;
    }
    // the two drive wheels turn at their own speeds, so a turn shows the outside wheel going faster
    if (wheels.l) wheels.l.rotation.x = c.spinL / r + burn;
    if (wheels.r) wheels.r.rotation.x = c.spinR / r + burn;
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

  _camera(dt, opts) {
    const race = this.race, c = race.player.car;
    const speed = Math.abs(c.vx);
    const fwd = tmp.set(Math.sin(c.psi), 0, Math.cos(c.psi));
    const dist = 17 + Math.min(3, speed * 0.2) + 2 * clamp((race.drift.vmul - 1) / 0.2, 0, 1);
    const height = 6.2 + Math.min(1.2, speed * 0.08);
    if (opts.finishView) {
      // slow orbit around the robot once the lap is done
      this.orbit += dt * 0.25;
      const o = this.orbit;
      const target = new THREE.Vector3(c.x + Math.cos(o) * 18, 6.5, c.z + Math.sin(o) * 18);
      this.camPos.lerp(target, 1 - Math.exp(-dt * 2));
    } else {
      const target = new THREE.Vector3(c.x - fwd.x * dist, height, c.z - fwd.z * dist);
      if (!this.initCam) { this.camPos.copy(target); this.initCam = true; }
      this.camPos.lerp(target, 1 - Math.exp(-dt * 7));
    }
    this.camera.position.copy(this.camPos);
    this.camLook.set(c.x + fwd.x * 10, 2.2, c.z + fwd.z * 10); // look well ahead, so the horizon and skyline show
    this.camera.lookAt(this.camLook);
    // a boost opens the view a little and pulls the camera back
    const boost = clamp((race.drift.vmul - 1) / 0.2, 0, 1);
    const fovTarget = 56 + Math.min(8, speed * 0.5) + 6 * boost;
    this.fov += (fovTarget - this.fov) * (1 - Math.exp(-dt * 6));
    if (Math.abs(this.camera.fov - this.fov) > 0.01) { this.camera.fov = this.fov; this.camera.updateProjectionMatrix(); }
  }

  _sunFollow(c) {
    this.sun.position.set(c.x + this.sunOffset.x, this.sunOffset.y, c.z + this.sunOffset.z);
    this.sun.target.position.set(c.x, 0, c.z);
    this.sun.target.updateMatrixWorld();
  }

  /** Free this lap's geometry and materials. The shared renderer and cached textures stay. */
  dispose() {
    this.scene.traverse((o) => {
      if (o.isInstancedMesh) o.dispose(); // frees the instance buffers, which dispose() on the geometry does not
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) m?.dispose?.();
    });
    this.envTarget.dispose();
  }
}
