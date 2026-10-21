// Sound for the race, made in the browser (no files): a wheel whine that rises with speed, the
// vacuum's hiss while it is picking up dust, a tyre screech while the rear slides, and a tick
// for each grain taken. Starts only after a key press, as browsers require.
export class GameAudio {
  constructor() { this.ctx = null; this.ok = false; }

  start() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const c = (this.ctx = new AC());
        const out = (this.master = c.createGain());
        out.gain.value = 0.18;
        out.connect(c.destination);

        const noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
        const d = noiseBuf.getChannelData(0);
        let seed = 12345;
        for (let i = 0; i < d.length; i++) { seed = (seed * 16807) % 2147483647; d[i] = seed / 2147483647 * 2 - 1; }
        const noise = (filterType, freq, q) => {
          const src = c.createBufferSource();
          src.buffer = noiseBuf;
          src.loop = true;
          const f = c.createBiquadFilter();
          f.type = filterType; f.frequency.value = freq; f.Q.value = q;
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
        this.screech = noise('bandpass', 2600, 6);
        this.tick = noise('highpass', 3200, 0.7);
        this.ok = true;
      }
      this.ctx.resume?.();
    } catch {
      this.ok = false;
    }
  }

  /** Call once per frame with the race state. */
  update({ speed = 0, drift = 0, sucking = false, active = false }) {
    if (!this.ok || !this.ctx) return;
    const t = this.ctx.currentTime;
    const ramp = (param, v, tc = 0.08) => param.setTargetAtTime(v, t, tc);
    const rev = active ? 1 : 0.35;
    ramp(this.eng[0].frequency, 48 + speed * 16, 0.12);
    ramp(this.eng[1].frequency, 49.5 + speed * 16.3, 0.12);
    ramp(this.engG.gain, active ? 0.05 + Math.min(0.12, speed * 0.008) : 0.02 * rev, 0.15);
    ramp(this.suck.g.gain, sucking ? 0.22 : 0, 0.05);
    ramp(this.suck.f.frequency, 1700 + (sucking ? 500 : 0), 0.2);
    ramp(this.screech.g.gain, drift > 0.4 ? Math.min(0.12, drift * 0.12) : 0, 0.06);
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

  stop() {
    this.ctx?.suspend?.();
  }
}
