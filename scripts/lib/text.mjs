import { glyphs, GLYPH_W, GLYPH_H, ADVANCE } from './glyphs.mjs';

/**
 * Turns the bitmap font into SVG.
 *
 * Every distinct character used anywhere in the document is emitted once as a
 * <path> in <defs>, then referenced with <use>. That keeps the file small
 * (a <use> is ~40 bytes) even though the whole document is drawn in pixels.
 */

const idFor = (ch) => 'g' + ch.codePointAt(0).toString(16);

/** Merge each row's lit pixels into maximal horizontal runs -> compact path. */
function glyphPath(rows) {
  const parts = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < GLYPH_W) {
      if (row[x] !== '#') { x++; continue; }
      let w = 0;
      while (x + w < GLYPH_W && row[x + w] === '#') w++;
      parts.push(`M${x} ${y}h${w}v1h-${w}z`);
      x += w;
    }
  });
  return parts.join('');
}

export class Font {
  constructor() {
    this.used = new Set();
  }

  /** Width in user units of `str` rendered at `scale`. */
  measure(str, scale = 1) {
    return ([...str].length * ADVANCE - 1) * scale;
  }

  lineHeight(scale = 1) {
    return GLYPH_H * scale;
  }

  /**
   * Largest scale from `scales` (biggest first) at which `str` fits `maxWidth`.
   * Lets content.json hold a long title without it ever running off the screen.
   */
  fitScale(str, maxWidth, scales = [3, 2]) {
    return scales.find((s) => this.measure(str, s) <= maxWidth) ?? scales[scales.length - 1];
  }

  /**
   * Draw a string. `y` is the TOP of the cap box, not a baseline.
   * align: 'left' | 'center' | 'right' relative to x.
   */
  draw(str, x, y, { scale = 1, fill = 'currentColor', align = 'left', opacity, tracking = 0, attrs = '' } = {}) {
    const chars = [...str];
    const width = (chars.length * (ADVANCE + tracking) - 1 - tracking) * scale;
    let ox = 0;
    if (align === 'center') ox = -width / 2;
    else if (align === 'right') ox = -width;

    const uses = [];
    chars.forEach((ch, i) => {
      const g = glyphs[ch] ?? glyphs[ch.toUpperCase()] ?? glyphs['?'];
      if (g === glyphs[' ']) return; // nothing to draw
      const key = glyphs[ch] ? ch : (glyphs[ch.toUpperCase()] ? ch.toUpperCase() : '?');
      if (key === ' ') return;
      this.used.add(key);
      uses.push(`<use href="#${idFor(key)}" x="${i * (ADVANCE + tracking)}"/>`);
    });

    const o = opacity != null ? ` opacity="${opacity}"` : '';
    return `<g transform="translate(${round(x + ox)} ${round(y)}) scale(${scale})" fill="${fill}"${o}${attrs ? ' ' + attrs : ''}>${uses.join('')}</g>`;
  }

  /** Word-wrap into lines that fit `maxWidth`, then draw them. */
  paragraph(str, x, y, { scale = 1, leading = 3, maxWidth = 9999, ...rest } = {}) {
    const words = str.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const next = line ? line + ' ' + w : w;
      if (this.measure(next, scale) > maxWidth && line) {
        lines.push(line);
        line = w;
      } else line = next;
    }
    if (line) lines.push(line);
    const step = (GLYPH_H + leading) * scale;
    return {
      svg: lines.map((l, i) => this.draw(l, x, y + i * step, { scale, ...rest })).join(''),
      height: lines.length * step,
      lines: lines.length,
    };
  }

  /** <defs> content for every glyph actually used. Call last. */
  defs() {
    return [...this.used]
      .map((ch) => `<path id="${idFor(ch)}" d="${glyphPath(glyphs[ch])}"/>`)
      .join('');
  }
}

export const round = (n) => Math.round(n * 100) / 100;

/** Drop characters the font has no glyph for, so stray unicode never renders as '?'. */
export function clean(str) {
  return [...String(str)]
    .filter((c) => glyphs[c] || glyphs[c.toUpperCase()])
    .join('');
}

/** Trim to `n` characters, with an ellipsis made of periods. */
export function ellipsis(str, n) {
  const s = clean(str);
  return s.length <= n ? s : s.slice(0, Math.max(0, n - 3)).trimEnd() + '...';
}

export const escapeXml = (s) =>
  String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
