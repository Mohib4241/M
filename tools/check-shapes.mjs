// How closely each robot's front outline follows the outline measured from the maker's picture.
// node tools/check-shapes.mjs [robot ...]
import { compareFront } from './silhouette.mjs';
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['phantas', 'cc1pro', 'omnie', 'marvel', 'mt1', 'mt1max'];
for (const id of ids) {
  let shape;
  try { shape = (await import(`../src/data/shapes/${id}.js`)).default; } catch { console.log(id.padEnd(8), 'no measurements yet'); continue; }
  const def = (await import(`../src/data/${id}.js`)).default;
  const r = compareFront(def, shape);
  console.log(id.padEnd(8), `${r.rows} rows  mean ${r.mean.toFixed(1)} mm  p90 ${r.p90.toFixed(1)} mm  max ${r.max.toFixed(1)} mm  worst at`, r.worst.map(([y, e]) => `${y}mm:${e.toFixed(0)}`).join(' '));
}
