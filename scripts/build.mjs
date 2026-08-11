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
const login = env.GH_LOGIN || env.GITHUB_LOGIN || 'gogeorge';
const token = env.GH_TOKEN || env.GITHUB_TOKEN || '';

const content = JSON.parse(await readFile(join(root, 'content.json'), 'utf8'));
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
  const page = `<!doctype html><meta charset="utf-8"><title>DS preview</title>
<style>
  body{margin:0;display:flex;gap:24px;padding:24px;background:#0d1117;font:14px system-ui}
  div{flex:1}img{width:100%;display:block}
  div:last-child{background:#fff;padding:12px;border-radius:8px}
</style>
<div><img src="assets/ds-dark.svg"></div>
<div><img src="assets/ds-light.svg"></div>`;
  await writeFile(join(root, 'preview.html'), page);
  console.log('· preview.html');
}
