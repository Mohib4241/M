// Tracking in a worker: the page sends camera pictures, this thread runs the model and sends the points
// back. The page sends the next picture only after the answer to the last one, so nothing queues up.
import { TrackCore } from './track-core.js';

const core = new TrackCore();
let busy = Promise.resolve();

self.onmessage = (ev) => {
  const m = ev.data;
  busy = busy.then(async () => {
    try {
      if (m.type === 'init') { await core.init(m.wasm, m.mode); self.postMessage({ type: 'ready', mode: core.mode }); }
      else if (m.type === 'mode') { await core.setMode(m.mode); self.postMessage({ type: 'mode', mode: core.mode }); }
      else if (m.type === 'frame') {
        let out;
        try { out = core.detect(m.bitmap, m.ts); } finally { m.bitmap.close(); }
        self.postMessage({ type: 'result', ...out });
        await core.tune();
      } else if (m.type === 'close') { core.close(); self.close(); }
    } catch (e) {
      if (m.bitmap) { try { m.bitmap.close(); } catch { /* closed */ } }
      self.postMessage({ type: m.type === 'frame' ? 'result' : 'error', error: String((e && e.message) || e), mode: core.mode, hands: [], pose: null });
    }
  });
};
