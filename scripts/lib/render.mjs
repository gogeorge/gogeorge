import {
  SANS,
  round as r,
  nf,
  escapeXml,
  ellipsis,
  rect,
  rrect,
  circle,
  line,
  panel,
  text,
  measure,
} from './svg.mjs';
import { icon } from './icons.mjs';
import { langColor, resetFallback } from './langs.mjs';
import { clockPanel } from './insights.mjs';

/**
 * Renders the whole profile card as one self-contained SVG, styled after
 * github.com's own profile page (Primer tokens, GitHub's system font, its
 * octicons, the language bar, the "when you commit" clock and a written status).
 *
 * A GitHub README loads this through an <img>, so the file must stand alone —
 * no CSS classes, no scripts, no web fonts. It's fully static: an <img>-embedded
 * SVG rasterises as one texture, so anything that animated would repaint the
 * whole card, and the point here is to read exactly like a slice of GitHub.
 */

// ------------------------------------------------------------------ layout --
const W = 854;
const PAD = 24;
const X = PAD;
const CW = W - PAD * 2; // 806
const GAP = 16;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmtDate = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;

// -------------------------------------------------------------- components --

function header(g, d, content, t, y) {
  // No avatar — the real profile page already shows it. Identity sits at the
  // left edge, Follow button at the right.
  const tx = X;

  const name = content.name || d.name;
  g.push(text(name, tx, y + 22, { size: 22, weight: 600, fill: t.fg }));
  g.push(text(`@${content.handle}`, tx, y + 44, { size: 15, fill: t.fgMuted }));

  if (content.bio) {
    g.push(text(ellipsis(content.bio, 104), tx, y + 68, { size: 14, fill: t.fg }));
  }

  // Focus items as GitHub topic pills.
  const focus = (content.focus || []).slice(0, 5);
  let px = tx;
  const py = y + 86;
  for (const item of focus) {
    const label = ellipsis(item, 26);
    const w = measure(label, 12) + 20;
    if (px + w > X + CW - 108) break; // keep clear of the Follow button
    g.push(rrect(px, py, w, 22, 11, `fill="${t.topicBg}" stroke="${t.topicBorder}" stroke-width="1"`));
    g.push(text(label, px + 10, py + 15, { size: 12, fill: t.topicFg }));
    px += w + 8;
  }

  // Follow button (decorative — the whole card is an image).
  const bw = 92;
  const bx = X + CW - bw;
  const by = y + 4;
  g.push(rrect(bx, by, bw, 30, 6, `fill="${t.btnBg}" stroke="${t.btnBorder}" stroke-width="1"`));
  g.push(icon('person', bx + 14, by + 7, 16, t.btnFg));
  g.push(text('Follow', bx + 36, by + 20, { size: 14, weight: 500, fill: t.btnFg }));

  return y + 116;
}

function counters(g, d, t, y) {
  const H = 76;
  g.push(panel(X, y, CW, H, t));
  const cols = [
    { icon: 'repo', value: nf.format(d.repoCount), label: 'Repositories' },
    { icon: 'people', value: nf.format(d.followers), label: 'Followers' },
    { icon: 'star', value: nf.format(d.stars), label: 'Stars' },
    { icon: 'graph', value: nf.format(d.total), label: 'Contributions' },
  ];
  const colW = CW / cols.length;
  cols.forEach((c, i) => {
    const cxx = X + i * colW + 22;
    if (i > 0) {
      g.push(line(X + i * colW, y + 16, X + i * colW, y + H - 16, `stroke="${t.borderMuted}" stroke-width="1"`));
    }
    g.push(icon(c.icon, cxx, y + 22, 16, t.fgMuted));
    g.push(text(c.value, cxx + 24, y + 35, { size: 20, weight: 600, fill: t.fg }));
    g.push(text(c.label, cxx, y + 56, { size: 12.5, fill: t.fgMuted }));
  });
  return y + H;
}

function languagesAndStats(g, d, content, t, y) {
  const H = 172;
  const Lw = Math.round((CW - GAP) * 0.58);
  const Rw = CW - GAP - Lw;
  const Rx = X + Lw + GAP;

  // ---- Most used languages ----
  g.push(panel(X, y, Lw, H, t));
  const lpad = 16;
  g.push(text('Most used languages', X + lpad, y + 28, { size: 14, weight: 600, fill: t.fg }));

  resetFallback();
  const langs = d.languages.slice(0, 5);
  const shown = langs.reduce((a, l) => a + l.pct, 0);
  const colored = langs.map((l) => ({ ...l, color: langColor(l.name) }));

  // The signature stacked language bar, clipped to a rounded pill.
  const barX = X + lpad;
  const barY = y + 46;
  const barW = Lw - lpad * 2;
  const barH = 10;
  g.push(`<clipPath id="langbar"><rect x="${r(barX)}" y="${r(barY)}" width="${r(barW)}" height="${barH}" rx="${barH / 2}"/></clipPath>`);
  const bar = [`<rect x="${r(barX)}" y="${r(barY)}" width="${r(barW)}" height="${barH}" fill="${t.track}"/>`];
  let bx = barX;
  for (const l of colored) {
    const w = (barW * l.pct) / 100;
    bar.push(rect(bx, barY, w + 0.5, barH, `fill="${l.color}"`));
    bx += w;
  }
  g.push(`<g clip-path="url(#langbar)">${bar.join('')}</g>`);

  // Legend, two columns.
  const legX = [X + lpad, X + lpad + (Lw - lpad * 2) / 2];
  colored.forEach((l, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const lx = legX[col];
    const ly = y + 82 + row * 24;
    g.push(circle(lx + 5, ly - 4, 5, `fill="${l.color}"`));
    g.push(text(ellipsis(l.name, 18), lx + 16, ly, { size: 13, fill: t.fg }));
    g.push(text(`${l.pct.toFixed(1)}%`, lx + (Lw - lpad * 2) / 2 - 12, ly, { size: 13, fill: t.fgMuted, anchor: 'end' }));
  });
  if (colored.length === 0) {
    g.push(text('No public language data yet', X + lpad, y + 82, { size: 13, fill: t.fgMuted }));
  }

  // ---- Stats summary (kept GitHub API numbers) ----
  g.push(panel(Rx, y, Rw, H, t));
  g.push(text('Activity', Rx + lpad, y + 28, { size: 14, weight: 600, fill: t.fg }));
  const rows = [
    { icon: 'graph', label: 'Total contributions', value: nf.format(d.total) },
    { icon: 'flame', label: 'Current streak', value: `${d.current} day${d.current === 1 ? '' : 's'}` },
    { icon: 'calendar', label: 'Longest streak', value: `${d.longest} day${d.longest === 1 ? '' : 's'}` },
    { icon: 'star', label: 'Stars earned', value: nf.format(d.stars) },
  ];
  rows.forEach((row, i) => {
    const ry = y + 58 + i * 27;
    g.push(icon(row.icon, Rx + lpad, ry - 12, 15, t.fgMuted));
    g.push(text(row.label, Rx + lpad + 24, ry, { size: 13, fill: t.fg }));
    g.push(text(row.value, Rx + Rw - lpad, ry, { size: 13, weight: 600, fill: t.fg, anchor: 'end' }));
  });

  return y + H;
}

function working(g, content, t, y) {
  const lpad = 16;
  const now = (content.now || []).slice(0, 4);
  const next = (content.next || []).slice(0, 4);
  const rows = Math.max(now.length, next.length, 1);
  const rowH = 26;
  const H = 54 + rows * rowH + 10;

  g.push(panel(X, y, CW, H, t));
  g.push(text("What I'm working on", X + lpad, y + 28, { size: 14, weight: 600, fill: t.fg }));

  const colW = (CW - lpad * 2) / 2;
  const columns = [
    { label: 'Currently', items: now, dot: (cx, cy) => circle(cx, cy, 4, `fill="${t.success}"`) },
    { label: 'Up next', items: next, dot: (cx, cy) => circle(cx, cy, 3.5, `fill="none" stroke="${t.accent}" stroke-width="1.5"`) },
  ];

  columns.forEach((col, ci) => {
    const cx = X + lpad + ci * colW;
    g.push(text(col.label, cx, y + 50, { size: 12.5, weight: 600, fill: t.fgMuted }));
    if (col.items.length === 0) {
      g.push(text('—', cx, y + 74, { size: 13, fill: t.fgSubtle }));
    }
    col.items.forEach((item, i) => {
      const iy = y + 72 + i * rowH;
      g.push(col.dot(cx + 4, iy - 4));
      g.push(text(ellipsis(item, 46), cx + 18, iy, { size: 13, fill: t.fg }));
    });
  });

  return y + H;
}

// ------------------------------------------------------------------ export --
export function render(d, content, t, now = new Date()) {
  const g = [];
  let y = PAD;

  y = header(g, d, content, t, y);
  y = counters(g, d, t, y + GAP);
  y = languagesAndStats(g, d, content, t, y + GAP);

  const clock = clockPanel(d, t, X, y + GAP, CW);
  g.push(clock.markup);
  y = y + GAP + clock.height;

  y = working(g, content, t, y + GAP);

  // Footer.
  const fy = y + GAP + 12;
  g.push(
    text(`Updated ${fmtDate(now)} · data via GitHub API`, X, fy, { size: 11, fill: t.fgSubtle })
  );
  g.push(
    text(`github.com/${content.handle}`, X + CW, fy, {
      size: 11,
      fill: t.fgSubtle,
      anchor: 'end',
      mono: true,
    })
  );

  const H = fy + PAD - 4;

  const title = `${content.name || d.name} — ${nf.format(d.total)} contributions in the last year, ${d.current}-day streak, top language ${d.languages[0]?.name ?? 'n/a'}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${SANS}" role="img" aria-label="${escapeXml(title)}">
<title>${escapeXml(title)}</title>
<rect width="${W}" height="${H}" rx="6" fill="${t.page}"/>
${g.join('\n')}
</svg>`;
}
