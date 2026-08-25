#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { collect } from './lib/data.mjs';
import { theme, modes } from './lib/theme.mjs';
import { render } from './lib/render.mjs';

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

const env = { ...process.env, ...(await loadDotEnv(join(root, '.env'))) };
const token = env.GH_TOKEN || env.GITHUB_TOKEN || '';

const content = JSON.parse(await readFile(join(root, 'content.json'), 'utf8'));
// GH_LOGIN wins (the workflow sets it from the repo owner); otherwise fall back
// to the handle in content.json, so a fresh copy works with nothing configured.
const login = env.GH_LOGIN || env.GITHUB_LOGIN || content.handle;
const data = await collect(login, token);
console.log(
  `· data source: ${data.source}  ` +
    `(${data.total} contributions, ${data.current}d streak, ${data.languages.length} languages, ${data.hoursSampled} commit-hours sampled)`
);

await mkdir(join(root, 'assets'), { recursive: true });

const now = new Date();
for (const mode of modes) {
  const svg = render(data, content, theme(mode), now);
  await writeFile(join(root, 'assets', `github-${mode}.svg`), svg);
  console.log(`· assets/github-${mode}.svg  ${(svg.length / 1024).toFixed(1)} KB`);
}
