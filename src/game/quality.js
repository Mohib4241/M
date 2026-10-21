// Chooses how much graphics work the race does, from how long frames really take. Pure logic, so
// it can be tested without a GPU.
//
//   level 2  high    bloom, speed blur and vignette, sharp pixels (up to 1.5x), big shadow map
//   level 1  medium  speed blur and vignette, no bloom, normal pixels, smaller shadow map
//   level 0  low     no post-processing at all, normal pixels, smaller shadow map
//
// In `auto` mode the level only ever goes down: it starts high, waits out the start-up hitches (the
// first shaders compile), then drops a level whenever the frame rate stays low for a moment. It
// never climbs back on its own, so it cannot flip up and down. A fixed mode ignores frame time.
export const LEVEL_NAMES = ['Low', 'Medium', 'High'];
export const MODES = ['auto', 'high', 'medium', 'low'];

export class QualityGovernor {
  constructor({ mode = 'auto', warmup = 2.5, slowFps = 28, slowFor = 1.5 } = {}) {
    this.warmup = warmup; // seconds of start-up to ignore
    this.slowFps = slowFps; // below this frame rate counts as slow
    this.slowFor = slowFor; // seconds of slow frames before a level is dropped
    this.setMode(mode);
  }

  setMode(mode) {
    this.mode = mode;
    this.level = mode === 'low' ? 0 : mode === 'medium' ? 1 : 2;
    this.t = 0;
    this.slow = 0;
    this.ema = 0;
  }

  /** Step to the next mode: auto, high, medium, low, then auto again. */
  cycle() {
    this.setMode(MODES[(MODES.indexOf(this.mode) + 1) % MODES.length]);
    return this.mode;
  }

  /**
   * Call once per frame with the real frame time in seconds. Returns the new level when it
   * changes, otherwise null.
   */
  update(dt) {
    if (this.mode !== 'auto' || !(dt > 0) || dt > 1) return null; // a frame over a second is a sleeping tab, not a slow GPU
    this.t += dt;
    if (this.t < this.warmup) return null;
    this.ema = this.ema ? this.ema * 0.9 + dt * 0.1 : dt;
    if (this.level > 0 && 1 / this.ema < this.slowFps) {
      this.slow += dt;
      if (this.slow >= this.slowFor) {
        this.level--;
        this.slow = 0;
        this.ema = 0;
        return this.level;
      }
    } else this.slow = 0;
    return null;
  }

  get label() { return this.mode === 'auto' ? `Auto (${LEVEL_NAMES[this.level]})` : LEVEL_NAMES[this.level]; }
}
