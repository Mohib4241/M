// Bundles src/ into one self-contained HTML file (dist/index.html) and an
// artifact-ready fragment (dist/armory.artifact.html).
import { build } from 'esbuild';
import fs from 'node:fs';

const TITLE = 'Armory';
const FONTS = 'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Condensed:wght@400;500;600;700&display=swap';
const fontLinks = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${FONTS}">`;

const opts = {
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  write: false,
  legalComments: 'none',
  logLevel: 'warning',
};

// The MediaPipe WebAssembly runtime (about 27 MB) is served beside the page for in-browser hand
// tracking. It is built here from node_modules and kept out of Git.
function copyWasm() {
  const from = 'node_modules/@mediapipe/tasks-vision/wasm';
  const to = 'dist/mediapipe/wasm';
  if (!fs.existsSync(from)) { console.warn('skipping hand-tracking runtime: @mediapipe/tasks-vision is not installed'); return; }
  fs.mkdirSync(to, { recursive: true });
  for (const f of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']) {
    fs.copyFileSync(`${from}/${f}`, `${to}/${f}`);
  }
}

async function assemble() {
  const out = await build(opts);
  const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const css = fs.readFileSync('src/style.css', 'utf8');
  const body = fs.readFileSync('src/body.html', 'utf8');
  fs.mkdirSync('dist', { recursive: true });
  copyWasm();

  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITLE}</title>
${fontLinks}
<style>${css}</style>
</head>
<body>
${body}
<script>${js}</script>
</body>
</html>
`;
  fs.writeFileSync('dist/index.html', page);

  // The artifact host adds the document skeleton, so publish only the page content.
  const fragment = `<title>${TITLE}</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fontLinks}
<style>${css}</style>
${body}
<script>${js}</script>
`;
  fs.writeFileSync('dist/armory.artifact.html', fragment);
  console.log(`built dist/index.html (${(page.length / 1024).toFixed(0)} KB)`);
}

if (process.argv.includes('--watch')) {
  let t;
  const run = () => assemble().catch((e) => console.error(e.message));
  await run();
  fs.watch('src', { recursive: true }, () => { clearTimeout(t); t = setTimeout(run, 120); });
  console.log('watching src/ …');
} else {
  await assemble();
}
