import { round as r, nf, circle, line, panel, text } from './svg.mjs';

/**
 * The "when you commit" insight — a 24-hour radial dial of the hour each commit
 * is authored, with a night-owl / early-bird verdict. Self-contained: takes
 * (d, t, x, y, w) and returns { markup, height } so the card can stack it.
 *
 * The hour data is `d.hours` (24 buckets) with `d.hoursSampled` the count it was
 * built from — see commitHours() in data.mjs. It samples public commit
 * timestamps only, so it reads as an approximation, not a census.
 */

const hourLabel = (h) => `${((h + 11) % 12) + 1}${h < 12 ? 'AM' : 'PM'}`;
const spacedHour = (h) => hourLabel(h).replace(/(AM|PM)/, ' $1');

/** Colour a value by its share of the max, using GitHub's calendar levels. */
function levelFor(frac) {
  if (frac <= 0) return 0;
  if (frac < 0.25) return 1;
  if (frac < 0.5) return 2;
  if (frac < 0.75) return 3;
  return 4;
}

/** A small crescent moon carved out of a disc, drawn in a 16-box at (x, y). */
function moon(x, y, size, fill, bg) {
  const s = size / 16;
  return (
    `<g transform="translate(${r(x)} ${r(y)}) scale(${r(s)})">` +
    `<circle cx="8" cy="8" r="7" fill="${fill}"/>` +
    `<circle cx="11" cy="6.5" r="6" fill="${bg}"/>` +
    `</g>`
  );
}

/** A small sun (disc + 8 rays) in a 16-box at (x, y). */
function sun(x, y, size, fill) {
  const s = size / 16;
  const rays = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    rays.push(
      `<line x1="${r(8 + Math.cos(a) * 6)}" y1="${r(8 + Math.sin(a) * 6)}" x2="${r(8 + Math.cos(a) * 7.6)}" y2="${r(8 + Math.sin(a) * 7.6)}" stroke="${fill}" stroke-width="1.4" stroke-linecap="round"/>`
    );
  }
  return `<g transform="translate(${r(x)} ${r(y)}) scale(${r(s)})"><circle cx="8" cy="8" r="4.2" fill="${fill}"/>${rays.join('')}</g>`;
}

// ------------------------------------------------------------- night owl clock --
export function clockPanel(d, t, x, y, w) {
  const g = [];
  const lpad = 16;
  const hours = d.hours && d.hours.some((h) => h > 0) ? d.hours : new Array(24).fill(0);
  const max = Math.max(1, ...hours);

  const R0 = 24;
  const maxLen = 42;
  const cx = x + 120;
  const cy = y + 118;
  // Sized so the dial (spokes + its quarter labels) sits fully inside the panel.
  const H = 210;

  g.push(panel(x, y, w, H, t));
  g.push(text('When you commit', x + lpad, y + 28, { size: 14, weight: 600, fill: t.fg }));
  g.push(
    text(`${nf.format(d.hoursSampled || 0)} commits sampled`, x + w - lpad, y + 28, {
      size: 12.5,
      fill: t.fgMuted,
      anchor: 'end',
    })
  );

  // Faint guide rings.
  g.push(circle(cx, cy, R0 + maxLen, `fill="none" stroke="${t.borderMuted}" stroke-width="1"`));
  g.push(circle(cx, cy, R0, `fill="none" stroke="${t.borderMuted}" stroke-width="1"`));

  // 24 spokes, hour 0 at top, clockwise.
  const sw = ((2 * Math.PI * R0) / 24) * 0.66;
  for (let h = 0; h < 24; h++) {
    const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
    const frac = hours[h] / max;
    const len = R0 + 3 + maxLen * frac;
    const x0 = cx + Math.cos(a) * R0;
    const y0 = cy + Math.sin(a) * R0;
    const x1 = cx + Math.cos(a) * len;
    const y1 = cy + Math.sin(a) * len;
    const color = frac === 0 ? t.track : t.levels[levelFor(frac)];
    if (frac === 0) {
      g.push(circle(x0, y0, sw / 2, `fill="${t.track}"`));
    } else {
      g.push(line(x0, y0, x1, y1, `stroke="${color}" stroke-width="${r(sw)}" stroke-linecap="round"`));
    }
  }

  // Quarter labels. Vertical (12AM/12PM) and horizontal (6AM/6PM) use slightly
  // different radii so the side labels stay clear of the verdict column.
  const dialLabel = (h, dx, dy, anchor) =>
    text(hourLabel(h), cx + dx, cy + dy, { size: 10, fill: t.fgSubtle, anchor });
  const outerV = R0 + maxLen + 13;
  const outerH = R0 + maxLen + 10;
  g.push(dialLabel(0, 0, -outerV + 3, 'middle'));
  g.push(dialLabel(6, outerH, 3, 'start'));
  g.push(dialLabel(12, 0, outerV + 2, 'middle'));
  g.push(dialLabel(18, -outerH, 3, 'end'));

  // Peak-hour readout in the centre.
  const peak = hours.indexOf(max);
  g.push(text(spacedHour(peak), cx, cy - 1, { size: 15, weight: 600, fill: t.fg, anchor: 'middle' }));
  g.push(text('peak', cx, cy + 14, { size: 10, fill: t.fgMuted, anchor: 'middle' }));

  // --- verdict column on the right ---
  // Fixed start with a clear gap after the dial's 6AM label.
  const rx = cx + 130;
  const total = hours.reduce((a, b) => a + b, 0) || 1;
  const afterDark = hours.reduce((a, c, h) => a + (h >= 18 || h < 6 ? c : 0), 0);
  const darkPct = Math.round((afterDark / total) * 100);

  let archetype, blurb, night;
  if (peak >= 22 || peak < 4) [archetype, blurb, night] = ['Night owl', 'Most commits land after midnight', true];
  else if (peak < 9) [archetype, blurb, night] = ['Early bird', 'You ship before the day gets going', false];
  else if (peak < 17) [archetype, blurb, night] = ['Daylight coder', 'A steady nine-to-five committer', false];
  else [archetype, blurb, night] = ['Evening shipper', 'You do your best work after hours', true];

  g.push(night ? moon(rx, y + 51, 18, t.accent, t.box) : sun(rx, y + 51, 18, t.star));
  g.push(text(archetype, rx + 26, y + 67, { size: 20, weight: 600, fill: t.fg }));
  g.push(text(blurb, rx, y + 92, { size: 13, fill: t.fgMuted }));

  const stats = [
    ['Peak hour', spacedHour(peak)],
    ['After dark (6pm–6am)', `${darkPct}%`],
    ['Busiest window', `${hourLabel(peak)}–${hourLabel((peak + 1) % 24)}`],
  ];
  stats.forEach(([k, v], i) => {
    const ly = y + 126 + i * 26;
    g.push(text(k, rx, ly, { size: 13, fill: t.fg }));
    g.push(text(v, x + w - lpad, ly, { size: 13, weight: 600, fill: t.fg, anchor: 'end' }));
    if (i < stats.length - 1) g.push(line(rx, ly + 9, x + w - lpad, ly + 9, `stroke="${t.borderMuted}" stroke-width="1"`));
  });

  return { markup: g.join('\n'), height: H };
}
