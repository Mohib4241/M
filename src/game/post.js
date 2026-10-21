// The race's post-processing: the scene is drawn into a half-float (HDR) buffer, so neon, flames,
// sparks and lamps can be brighter than white; bloom makes those glow; a speed pass adds a soft
// radial blur at speed, a colour split at the edges during a boost and a vignette; and the output
// pass applies the tone mapping and the final colour encoding.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const SPEED_SHADER = {
  uniforms: { tDiffuse: { value: null }, uSpeed: { value: 0 }, uBoost: { value: 0 }, uVig: { value: 0.3 } },
  vertexShader: 'varying vec2 vUv;\nvoid main() {\n  vUv = uv;\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n}',
  fragmentShader: [
    'uniform sampler2D tDiffuse; uniform float uSpeed; uniform float uBoost; uniform float uVig; varying vec2 vUv;',
    'void main() {',
    '  vec2 d = vUv - 0.5;',
    '  float r = length(d);',
    '  float k = (uSpeed * 0.3 + uBoost * 0.9) * smoothstep(0.12, 0.8, r);', // blur grows toward the edges
    '  vec4 c = texture2D(tDiffuse, vUv);',
    '  if (k > 0.002) {',
    '    c = vec4(0.0);',
    '    for (int i = 0; i < 6; i++) { float t = float(i) / 5.0; c += texture2D(tDiffuse, vUv - d * k * 0.07 * t); }',
    '    c /= 6.0;',
    '  }',
    '  float ca = uBoost * 0.006 * r;', // red and blue drift apart at the edges during a boost
    '  if (ca > 0.00005) { c.r = texture2D(tDiffuse, vUv - d * ca).r; c.b = texture2D(tDiffuse, vUv + d * ca).b; }',
    '  c.rgb *= 1.0 - uVig * smoothstep(0.38, 1.0, r);',
    '  gl_FragColor = c;',
    '}',
  ].join('\n'),
};

export class RacePost {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }));
    this.camera = camera;
    this.renderPass = new RenderPass(scene, camera);
    // threshold 1.0: only what is brighter than white (neon, lamps, flames, sparks) blooms
    this.bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.6, 0.7, 1.0);
    this.speed = new ShaderPass({ ...SPEED_SHADER, uniforms: THREE.UniformsUtils.clone(SPEED_SHADER.uniforms) });
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.speed);
    this.composer.addPass(new OutputPass());
  }

  setSize(w, h) {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
  }

  /** speed: 0..1 of top speed, boost: 0..1, vignette: 0..1 */
  set({ speed = 0, boost = 0, vignette = 0.3 }) {
    const u = this.speed.uniforms;
    u.uSpeed.value = speed;
    u.uBoost.value = boost;
    u.uVig.value = vignette;
  }

  /** Draw one frame. A different camera can be passed (used for fixed-camera pictures in tests). */
  render(dt, camera = null) {
    this.renderPass.camera = camera || this.camera;
    this.composer.render(dt);
  }

  dispose() {
    // composer.dispose() frees only its own two buffers; each pass owns targets and materials too
    for (const p of this.composer.passes) p.dispose?.();
    this.composer.dispose();
  }
}
