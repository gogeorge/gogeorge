#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { collect } from './lib/data.mjs';
import { theme, presets, modes } from './lib/theme.mjs';
import { renderDS } from './lib/ds.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

async function loadDotEnv(path) {
  try {
    const raw = await readFile(path, 'utf8');
    return Object.fromEntries(
      raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
          const idx = line.indexOf('=');
          if (idx < 0) return null;
          let key = line.slice(0, idx).trim();
          let value = line.slice(idx + 1).trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          return [key, value];
        })
        .filter(Boolean)
    );
  } catch {
    return {};
  }
}

const env = { ...process.env, ...(await loadDotEnv(join(root, '.env')))};
const token = env.GH_TOKEN || env.GITHUB_TOKEN || '';

const content = JSON.parse(await readFile(join(root, 'content.json'), 'utf8'));
// GH_LOGIN wins (the workflow sets it from the repo owner); otherwise fall back
// to the handle in content.json, so a fresh copy works with nothing configured.
const login = env.GH_LOGIN || env.GITHUB_LOGIN || content.handle;
const data = await collect(login, token);
console.log(
  `· data source: ${data.source}  ` +
    `(${data.total} contributions, ${data.current}d streak, ${data.languages.length} languages, ${data.commits.length} commits)`
);

await mkdir(join(root, 'assets'), { recursive: true });

const now = new Date();
const preset = content.theme ?? 'lime';
if (!presets.includes(preset)) {
  console.error(`! unknown theme "${preset}" in content.json`);
  console.error(`  choose one of: ${presets.join(', ')}`);
  process.exit(1);
}
console.log(`· theme: ${preset}   avatar: ${content.avatar ?? 'male'}`);

for (const mode of modes) {
  const svg = renderDS(data, content, theme(preset, mode), now);
  await writeFile(join(root, 'assets', `ds-${mode}.svg`), svg);
  console.log(`· assets/ds-${mode}.svg  ${(svg.length / 1024).toFixed(1)} KB`);
}

// A throwaway "choose your console" page: every shell preset in both screen
// modes, plus both avatars. Gitignored - it exists to be looked at, not kept.
if (process.argv.includes('--preview')) {
  const { avatars, drawSprite } = await import('./lib/sprites.mjs');

  const swatch = (name) =>
    `<figure${content.avatar === name || (!content.avatar && name === 'male') ? ' class="on"' : ''}>` +
    `<svg viewBox="0 0 24 24" width="110" height="110">${drawSprite(avatars[name], 0, 0, 1)}</svg>` +
    `<figcaption>"avatar": "${name}"</figcaption></figure>`;

  // Each console is embedded as its own document. Inlining eight <svg> blocks
  // in one page would collide on ids (gradients, clip paths, every glyph), and
  // all eight would resolve url(#...) against whichever was defined first.
  const card = (p, mode) => {
    const svg = renderDS(data, content, theme(p, mode), now);
    const uri = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
    return (
      `<figure class="console ${mode}${p === preset ? ' on' : ''}">` +
      `<img src="${uri}" alt="${p} ${mode}">` +
      `<figcaption>"theme": "${p}" &middot; ${mode}</figcaption></figure>`
    );
  };

  const page = `<!doctype html><meta charset="utf-8"><title>DS preview</title>
<style>
  body{margin:0;padding:28px;background:#0d1117;color:#c9d6e3;font:14px system-ui}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#6f7f8e;margin:32px 0 12px}
  .row{display:flex;flex-wrap:wrap;gap:20px}
  figure{margin:0;padding:14px;border-radius:10px;background:#141b23;border:2px solid transparent}
  figure.on{border-color:#58a6ff}
  figure.light{background:#eaeee2}
  figure.light figcaption{color:#4a5350}
  figcaption{margin-top:10px;font-family:ui-monospace,monospace;font-size:12px;color:#6f7f8e;text-align:center}
  .console{width:300px}.console img{width:100%;height:auto;display:block}
  .avatars svg{image-rendering:pixelated;background:#0d1117;border-radius:6px}
  .avatars figure{text-align:center}
</style>
<h2>Avatar &mdash; blue border is your current pick</h2>
<div class="row avatars">${swatch('male')}${swatch('female')}</div>
<h2>Shell &mdash; set "theme" in content.json</h2>
<div class="row">${presets.map((p) => modes.map((m) => card(p, m)).join('')).join('')}</div>`;

  await writeFile(join(root, 'preview.html'), page);
  console.log(`· preview.html  (${presets.length} themes x ${modes.length} modes)`);
}
