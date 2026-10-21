// Sound for the race, made in the browser (no files):
//   - a wheel whine that rises with speed (and a little more during a boost)
//   - the vacuum's hiss while it is picking up dust, and a tick for each grain taken
//   - a tyre squeal while the rear slides: a tonal note whose pitch follows the slide, with a
//     vibrato and a layer of noise grit
//   - a whoosh that sweeps upward during a drift boost, a chime when a drift charge reaches a
//     new tier, and a crackle for sparks off the kerb
// Starts only after a key press or click, as browsers require.
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export class GameAudio {
  constructor() { this.ctx = null; this.ok = false; this.lastCrackle = -1; }

  start() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const c = (this.ctx = new AC());
        const out = (this.master = c.createGain());
        out.gain.value = 0.18;
        out.connect(c.destination);

        // one looping noise buffer shared by every noise source
        const noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
        const d = noiseBuf.getChannelData(0);
        let seed = 12345;
        for (let i = 0; i < d.length; i++) { seed = (seed * 16807) % 2147483647; d[i] = seed / 2147483647 * 2 - 1; }
        const noise = (type, freq, q) => {
          const src = c.createBufferSource();
          src.buffer = noiseBuf;
          src.loop = true;
          const f = c.createBiquadFilter();
          f.type = type; f.frequency.value = freq; f.Q.value = q;
          const g = c.createGain();
          g.gain.value = 0;
          src.connect(f).connect(g).connect(out);
          src.start();
          return { f, g };
        };

        // wheel whine: two detuned oscillators through a low-pass
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 520;
        this.eng = [c.createOscillator(), c.createOscillator()];
        this.eng[0].type = 'sawtooth';
        this.eng[1].type = 'square';
        this.engG = c.createGain();
        this.engG.gain.value = 0;
        for (const o of this.eng) { o.connect(lp); o.start(); }
        lp.connect(this.engG).connect(out);

        this.suck = noise('bandpass', 2100, 0.9);
        this.tick = noise('highpass', 3200, 0.7);

        // tyre squeal: a sawtooth and a triangle a fifth above, with a slow vibrato, through a
        // narrow band-pass that follows the pitch
        this.sqA = c.createOscillator(); this.sqA.type = 'sawtooth';
        this.sqB = c.createOscillator(); this.sqB.type = 'triangle';
        this.sqF = c.createBiquadFilter(); this.sqF.type = 'bandpass'; this.sqF.Q.value = 7;
        this.sqG = c.createGain(); this.sqG.gain.value = 0;
        const lfo = c.createOscillator(); lfo.frequency.value = 6.5;
        const lfoG = c.createGain(); lfoG.gain.value = 22; // +/- 22 Hz
        lfo.connect(lfoG);
        lfoG.connect(this.sqA.frequency); lfoG.connect(this.sqB.frequency);
        this.sqA.connect(this.sqF); this.sqB.connect(this.sqF);
        this.sqF.connect(this.sqG).connect(out);
        for (const o of [this.sqA, this.sqB, lfo]) o.start();
        this.grit = noise('bandpass', 3800, 1.5);

        // boost whoosh and kerb crackle
        this.whoosh = noise('bandpass', 350, 0.8);
        this.crack = noise('highpass', 2500, 0.7);
        this.ok = true;
      }
      this.ctx.resume?.();
    } catch {
      this.ok = false;
    }
  }

  /** Call once per frame. drift is 0..1 slip, boost is 0..1 (how hard a boost is pushing). */
  update({ speed = 0, drift = 0, sucking = false, active = false, boost = 0 }) {
    if (!this.ok || !this.ctx) return;
    const t = this.ctx.currentTime;
    const ramp = (param, v, tc = 0.08) => param.setTargetAtTime(v, t, tc);
    const rev = active ? 1 : 0.35;
    const whine = 1 + 0.18 * boost;
    ramp(this.eng[0].frequency, (48 + speed * 16) * whine, 0.12);
    ramp(this.eng[1].frequency, (49.5 + speed * 16.3) * whine, 0.12);
    ramp(this.engG.gain, active ? 0.05 + Math.min(0.12, speed * 0.008) : 0.02 * rev, 0.15);
    ramp(this.suck.g.gain, sucking ? 0.22 : 0, 0.05);
    ramp(this.suck.f.frequency, 1700 + (sucking ? 500 : 0), 0.2);
    // the squeal needs a real slide at a real speed; its pitch climbs with the slide
    const f = 900 + 1000 * drift;
    ramp(this.sqA.frequency, f, 0.05);
    ramp(this.sqB.frequency, f * 1.5, 0.05);
    ramp(this.sqF.frequency, f, 0.05);
    ramp(this.sqG.gain, active ? 0.09 * smoothstep(0.35, 0.8, drift) * clamp((speed - 2) / 4, 0, 1) : 0, 0.05);
    ramp(this.grit.g.gain, active && speed > 3 ? 0.04 * drift : 0, 0.06);
  }

  /** A short tick for each grain taken into the tank. */
  pulse(strength = 1) {
    if (!this.ok || !this.ctx) return;
    const t = this.ctx.currentTime;
    const g = this.tick.g.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.05 * strength, t);
    g.linearRampToValueAtTime(0, t + 0.04);
  }

  /** A drift boost starts: a whoosh that sweeps upward over its length. */
  boost(dur = 1.2) {
    if (!this.ok || !this.ctx) return;
    const t = this.ctx.currentTime;
    const f = this.whoosh.f.frequency, g = this.whoosh.g.gain;
    f.cancelScheduledValues(t);
    f.setValueAtTime(350, t);
    f.exponentialRampToValueAtTime(2600, t + dur);
    g.cancelScheduledValues(t);
    g.setValueAtTime(0, t);
    g.linearRampToValueAtTime(0.14, t + 0.12);
    g.linearRampToValueAtTime(0, t + dur);
  }

  /** The drift charge reached a new tier: a short rising note, higher for a higher tier. */
  chime(tier = 1) {
    if (!this.ok || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine';
    const base = 660 * (1 + 0.12 * (tier - 1));
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * 1.5, t + 0.09);
    g.gain.setValueAtTime(0.05, t);
    g.gain.linearRampToValueAtTime(0, t + 0.12);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.14);
  }

  /** Sparks off the kerb: a 30 ms crackle, at most 14 a second. */
  crackle(strength = 1) {
    if (!this.ok || !this.ctx) return;
    const t = this.ctx.currentTime;
    if (t - this.lastCrackle < 1 / 14) return;
    this.lastCrackle = t;
    const g = this.crack.g.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.02 * strength, t);
    g.linearRampToValueAtTime(0, t + 0.03);
  }

  stop() {
    this.ctx?.suspend?.();
  }
}
