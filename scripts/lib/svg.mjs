/**
 * Small SVG helpers shared by the renderer.
 *
 * The output is embedded in a GitHub README through an <img>, so it has to be
 * one self-contained file: no external fonts, no stylesheets, no scripts. The
 * one thing that *does* work in that context is the viewer's own font stack —
 * which is exactly what GitHub renders its UI in — so text is real <text>,
 * drawn in the same system font GitHub uses. See fonts below.
 */

// GitHub's own UI font stacks (Primer). Set once on the root <svg> and every
// <text> inherits them; code-ish values opt into the mono stack per element.
export const SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif";
export const MONO =
  "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace";

export const round = (n) => Math.round(n * 100) / 100;
const r = round;

export const nf = new Intl.NumberFormat('en-US');

export const escapeXml = (s) =>
  String(s).replace(/[<>&"']/g, (c) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));

/** Truncate to n characters with a real ellipsis. */
export function ellipsis(str, n) {
  const s = String(str);
  return s.length <= n ? s : s.slice(0, Math.max(0, n - 1)).trimEnd() + '…';
}

export const rect = (x, y, w, h, attrs = '') =>
  `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" ${attrs}/>`;

export const rrect = (x, y, w, h, rad, attrs = '') =>
  `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${rad}" ${attrs}/>`;

export const circle = (cx, cy, rad, attrs = '') =>
  `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(rad)}" ${attrs}/>`;

export const line = (x1, y1, x2, y2, attrs = '') =>
  `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" ${attrs}/>`;

/** A GitHub "Box": rounded panel, hairline border, page-coloured fill. */
export const panel = (x, y, w, h, t) =>
  rrect(x, y, w, h, 6, `fill="${t.box}" stroke="${t.border}" stroke-width="1"`);

/**
 * A <text> node. `y` is the baseline.
 * opts: size, weight, fill, anchor ('start'|'middle'|'end'), mono, opacity.
 */
export function text(str, x, y, opts = {}) {
  const { size = 13, weight = 400, fill, anchor = 'start', mono = false, opacity } = opts;
  const a = [
    `x="${r(x)}"`,
    `y="${r(y)}"`,
    `font-size="${size}"`,
    weight !== 400 ? `font-weight="${weight}"` : '',
    fill ? `fill="${fill}"` : '',
    anchor !== 'start' ? `text-anchor="${anchor}"` : '',
    mono ? `font-family="${MONO}"` : '',
    opacity != null ? `opacity="${opacity}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<text ${a}>${escapeXml(str)}</text>`;
}

/** Crude proportional width estimate (px) for a sans string at a given size. */
export function measure(str, size) {
  let units = 0;
  for (const ch of String(str)) {
    if (' iIl.,:;\'|!'.includes(ch)) units += 0.30;
    else if ('mwMW@'.includes(ch)) units += 0.85;
    else if (ch >= 'A' && ch <= 'Z') units += 0.68;
    else if (ch >= '0' && ch <= '9') units += 0.56;
    else units += 0.54;
  }
  return units * size;
}
