#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { collect } from './lib/data.mjs';
import { themes } from './lib/theme.mjs';
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
for (const key of ['dark', 'light']) {
  const svg = renderDS(data, content, themes[key], now);
  const out = join(root, 'assets', `ds-${key}.svg`);
  await writeFile(out, svg);
  console.log(`· assets/ds-${key}.svg  ${(svg.length / 1024).toFixed(1)} KB`);
}

// A throwaway page for eyeballing both themes side by side: `npm run preview`.
if (process.argv.includes('--preview')) {
  const { avatars, drawSprite } = await import('./lib/sprites.mjs');
  const swatch = (name) =>
    `<figure><svg viewBox="0 0 24 24" width="120" height="120">${drawSprite(
      avatars[name],
      0,
      0,
      1
    )}</svg><figcaption>"avatar": "${name}"</figcaption></figure>`;

  const page = `<!doctype html><meta charset="utf-8"><title>DS preview</title>
<style>
  body{margin:0;padding:24px;background:#0d1117;color:#c9d6e3;font:14px system-ui}
  .themes{display:flex;gap:24px}
  .themes>div{flex:1}img{width:100%;display:block}
  .themes>div:last-child{background:#fff;padding:12px;border-radius:8px}
  .avatars{display:flex;gap:24px;margin-bottom:24px}
  figure{margin:0;background:#141b23;padding:12px;border-radius:8px;text-align:center}
  figcaption{margin-top:8px;font-family:ui-monospace,monospace;font-size:12px;color:#6f7f8e}
  svg{image-rendering:pixelated;background:#0d1117}
</style>
<div class="avatars">${swatch('male')}${swatch('female')}</div>
<div class="themes">
  <div><img src="assets/ds-dark.svg?t=${Date.now()}"></div>
  <div><img src="assets/ds-light.svg?t=${Date.now()}"></div>
</div>`;
  await writeFile(join(root, 'preview.html'), page);
  console.log('· preview.html');
}
