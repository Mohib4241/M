// The robot browser in the left panel. A switch filters by where the robots work (all, indoor, outdoor);
// below it the robots sit in their categories, each with a line that says what that kind of robot does
// and where it fits. Picking a robot hands its id to `onPick`.
import { ENVIRONMENTS, CATEGORIES, PROFILES, grouped, counts, isBoth } from './data/catalogue.js';

const KEY = 'catalogue-env';

export function initBrowser({ root, robots, esc, onPick }) {
  const ids = Object.keys(robots).filter((id) => PROFILES[id]);
  const n = counts(ids);
  let env = 'all';
  try { const s = localStorage.getItem(KEY); if (s === 'indoor' || s === 'outdoor') env = s; } catch { /* storage unavailable */ }
  let current = null;
  const closed = new Set(); // categories the user closed by hand

  const tag = (e) => `<i class="env-tag" data-env="${e}">${ENVIRONMENTS[e].label}</i>`;

  function tab(id) {
    const p = PROFILES[id];
    const tags = isBoth(p) ? `${tag('indoor')}${tag('outdoor')}` : tag(p.env[0]);
    return `<button type="button" class="robot-tab" data-robot="${id}"${id === current ? ' aria-current="true"' : ''}><span>${esc(p.brand)}</span><b>${esc(p.tab)}</b><em>${tags}</em></button>`;
  }

  function render() {
    const groups = grouped(ids, env);
    const shown = groups.reduce((s, g) => s + g.robots.length, 0);
    const openCat = groups.find((g) => g.robots.includes(current))?.category;
    root.innerHTML = `
      <div class="list-head"><h2>Robots <span class="mono">${shown}</span></h2></div>
      <div class="env" role="group" aria-label="Where the robot works">
        ${['all', 'indoor', 'outdoor'].map((e) => `<button type="button" class="env-btn" data-env="${e}" aria-pressed="${e === env}">${e === 'all' ? 'All' : ENVIRONMENTS[e].label}<em>${n[e]}</em></button>`).join('')}
      </div>
      <p class="env-note">${env === 'all' ? 'Pick a robot, or filter by where it works. A robot that works in both shows under each.' : esc(ENVIRONMENTS[env].note)}</p>
      <div class="cats">
        ${groups.map((g) => `
          <details class="cat" data-cat="${g.category}"${(g.category === openCat || (!openCat && g === groups[0])) && !closed.has(g.category) ? ' open' : ''}>
            <summary><span>${esc(CATEGORIES[g.category].label)}</span><em>${g.robots.length}</em></summary>
            <p class="cat-blurb">${esc(CATEGORIES[g.category].blurb)}</p>
            <div class="switch">${g.robots.map(tab).join('')}</div>
          </details>`).join('')}
      </div>`;
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('.env-btn');
    if (b) {
      env = b.dataset.env;
      try { localStorage.setItem(KEY, env); } catch { /* ignore */ }
      render();
      return;
    }
    const t = e.target.closest('.robot-tab');
    if (t && t.dataset.robot !== current) onPick(t.dataset.robot);
  });
  root.addEventListener('toggle', (e) => {
    const d = e.target;
    if (d.matches && d.matches('details.cat')) { if (d.open) closed.delete(d.dataset.cat); else closed.add(d.dataset.cat); }
  }, true);

  render();
  return {
    /** Mark a robot as the open one and open its category. */
    select(id) {
      current = id;
      closed.delete(PROFILES[id]?.category);
      // the robot may be filtered out; then the list stays as it is and nothing is marked
      render();
    },
    count: ids.length,
  };
}
