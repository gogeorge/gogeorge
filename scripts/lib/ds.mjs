import { Font, clean, ellipsis, escapeXml, round as r } from './text.mjs';

/**
 * Draws the whole handheld.
 *
 * Everything here is plain SVG geometry plus SMIL animation. No CSS classes,
 * no scripts, no external references - a GitHub README loads this through an
 * <img>, which means the file has to be completely self-contained, and any
 * <script> inside it would never run anyway. SMIL does run in that context,
 * so all the motion is <animate>/<animateTransform>.
 */

// ---------------------------------------------------------------- geometry --
const W = 780;
const H = 884;

const BODY_X = 20;
const BODY_W = 740;
const LID_Y = 14;
const LID_H = 386;
const HINGE_Y = 400;
const HINGE_H = 44;
const BASE_Y = 444;
const BASE_H = 418;

const SCREEN_W = 420;
const SCREEN_H = 315;
const TOP_SCREEN = { x: 180, y: 50 };
const BOT_SCREEN = { x: 180, y: 482 };

// -------------------------------------------------------------- primitives --
/** All primitives take optional `kids` so an <animate> can live inside them. */
const el = (tag, attrs, kids = '') =>
  kids ? `<${tag} ${attrs}>${kids}</${tag}>` : `<${tag} ${attrs}/>`;

const rect = (x, y, w, h, a = '', kids = '') =>
  el('rect', `x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" ${a}`, kids);

const rrect = (x, y, w, h, rx, a = '', kids = '') =>
  el('rect', `x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${rx}" ${a}`, kids);

const circle = (cx, cy, rad, a = '', kids = '') =>
  el('circle', `cx="${r(cx)}" cy="${r(cy)}" r="${rad}" ${a}`, kids);

/** <animate> shorthand. */
const an = (attr, attrs) => `<animate attributeName="${attr}" ${attrs}/>`;

/** Wrap arbitrary markup in a group whose opacity pulses. */
const pulse = (svg, values, dur) =>
  `<g>${svg}${an('opacity', `values="${values}" dur="${dur}s" repeatCount="indefinite"`)}</g>`;

/** Wrap markup in a group that is visible for one slot of an N-slot rotation. */
function slotFade(svg, index, count, slotSeconds) {
  const dur = count * slotSeconds;
  const share = 1 / count;
  const keyTimes = `0;0.03;${(share - 0.02).toFixed(3)};${share.toFixed(3)};1`;
  return (
    `<g opacity="0">${svg}` +
    an('opacity', `values="0;1;1;0;0" keyTimes="${keyTimes}" dur="${dur}s" begin="${index * slotSeconds}s" repeatCount="indefinite"`) +
    `</g>`
  );
}

const nf = new Intl.NumberFormat('en-US');

/** A DS menu tile: flat fill, hairline border, one highlight line along the top. */
function tile(x, y, w, h, t, { fill = t.tile } = {}) {
  return (
    rrect(x, y, w, h, 3, `fill="${fill}" stroke="${t.tileEdge}" stroke-width="1"`) +
    rect(x + 2, y + 1.5, w - 4, 1, `fill="${t.tileTop}"`)
  );
}

// ------------------------------------------------------------- top screen  --
function topScreen(f, d, content, t, now) {
  const g = [];
  const pad = 16;

  // --- title bar -----------------------------------------------------------
  g.push(rect(0, 0, SCREEN_W, 20, 'fill="url(#titlebar)"'));
  g.push(rect(0, 20, SCREEN_W, 1, `fill="${t.tileEdge}"`));
  g.push(f.draw(clean(content.handle), 8, 6, { scale: 2, fill: t.titleInk }));

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const stamp = `${hh}:${mm} ${String(now.getMonth() + 1).padStart(2, '0')}/${String(
    now.getDate()
  ).padStart(2, '0')}`;
  g.push(f.draw(stamp, SCREEN_W - 62, 6, { scale: 2, fill: t.titleInk, align: 'right' }));

  // little status icons, the way the DS crams them into the corner
  g.push(rrect(SCREEN_W - 56, 5, 12, 10, 1, `fill="${t.titleInk}" opacity="0.65"`));
  g.push(rrect(SCREEN_W - 40, 5, 12, 10, 1, `fill="${t.titleInk}" opacity="0.65"`));
  g.push(f.draw('M', SCREEN_W - 37, 6, { scale: 1, fill: t.titleBar[0] }));
  g.push(rrect(SCREEN_W - 24, 6, 18, 8, 1, `fill="none" stroke="${t.titleInk}" opacity="0.8"`));
  g.push(rect(SCREEN_W - 6, 8, 2, 4, `fill="${t.titleInk}" opacity="0.8"`));
  g.push(
    rect(SCREEN_W - 22, 8, 14, 4, `fill="${t.led}"`, an('opacity', 'values="1;1;0.35;1" dur="4s" repeatCount="indefinite"'))
  );

  // --- clock ---------------------------------------------------------------
  const cx = pad + 59;
  const cy = 34 + 59;
  g.push(tile(pad, 34, 118, 118, t));
  for (let i = 0; i < 12; i++) {
    if (i % 3 === 0) continue; // the 12/3/6/9 slots hold numerals instead
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    g.push(rect(cx + Math.cos(a) * 44 - 1.5, cy + Math.sin(a) * 44 - 1.5, 3, 3, `fill="${t.inkDim}"`));
  }
  const num = { scale: 3, fill: t.inkDim, opacity: 0.55, align: 'center' };
  g.push(f.draw('12', cx, cy - 50, num));
  g.push(f.draw('6', cx, cy + 38, num));
  g.push(f.draw('3', cx + 42, cy - 12, num));
  g.push(f.draw('9', cx - 42, cy - 12, num));

  const hourAngle = ((now.getHours() % 12) + now.getMinutes() / 60) * 30;
  const minAngle = now.getMinutes() * 6;
  const secAngle = now.getSeconds() * 6;
  const hand = (len, width, color, angle, extra = '') =>
    `<g transform="rotate(${r(angle)} ${r(cx)} ${r(cy)})">${rect(
      cx - width / 2,
      cy - len,
      width,
      len + width / 2,
      `fill="${color}" rx="1"`
    )}${extra}</g>`;

  g.push(hand(26, 4, t.hand, hourAngle));
  g.push(hand(38, 3, t.hand, minAngle));
  // The second hand is the one thing on the device that is genuinely live.
  g.push(
    `<g>${rect(cx - 1, cy - 42, 2, 50, `fill="${t.handSecond}"`)}` +
      `<animateTransform attributeName="transform" type="rotate" ` +
      `from="${r(secAngle)} ${r(cx)} ${r(cy)}" to="${r(secAngle + 360)} ${r(cx)} ${r(cy)}" ` +
      `dur="60s" repeatCount="indefinite"/></g>`
  );
  g.push(circle(cx, cy, 3, `fill="${t.ink}"`));

  // --- status card ---------------------------------------------------------
  const sx = 150;
  const sw = SCREEN_W - sx - pad;
  g.push(tile(sx, 34, sw, 118, t));
  content.status.slice(0, 3).forEach((row, i) => {
    const y = 42 + i * 38;
    // the highlight sweeps down the list the way a DS cursor idles
    g.push(
      rect(
        sx + 1,
        y - 3,
        sw - 2,
        36,
        `fill="${t.accent}" opacity="0"`,
        an('opacity', `values="0;0.10;0" dur="9s" begin="${i * 3}s" repeatCount="indefinite"`)
      )
    );
    g.push(f.draw(clean(row.label).toUpperCase(), sx + 10, y, { scale: 2, fill: t.accent }));
    const p = f.paragraph(clean(row.value), sx + 10, y + 20, {
      scale: 2,
      leading: 2,
      maxWidth: sw - 20,
      fill: t.ink,
    });
    g.push(p.svg);
  });

  // --- now playing ---------------------------------------------------------
  const ny = 164;
  const nw = SCREEN_W - pad * 2;
  g.push(tile(pad, ny, nw, 96, t));
  g.push(f.draw('NOW PLAYING', pad + 10, ny + 10, { scale: 2, fill: t.inkDim }));
  g.push(rect(pad + 10, ny + 30, nw - 20, 1, `fill="${t.tileEdge}"`));

  const slots = content.nowPlaying.slice(0, 3);
  slots.forEach((slot, i) => {
    const inner =
      f.draw(ellipsis(slot.title, 20), pad + 10, ny + 42, { scale: 3, fill: t.ink }) +
      f.draw(ellipsis(slot.sub, 33), pad + 10, ny + 72, { scale: 2, fill: t.inkDim });
    g.push(slotFade(inner, i, slots.length, 5));
  });

  // blinking cursor, bottom-right of the card
  g.push(
    rect(
      SCREEN_W - pad - 18,
      ny + 72,
      8,
      14,
      `fill="${t.accent}"`,
      an('opacity', 'values="1;1;0;0" dur="1.1s" repeatCount="indefinite"')
    )
  );

  // --- play time bar -------------------------------------------------------
  const by = 272;
  const since = new Date(d.since);
  const months = Math.max(0, (now.getFullYear() - since.getFullYear()) * 12 + now.getMonth() - since.getMonth());
  const label = `${Math.floor(months / 12)}Y ${months % 12}M ON GITHUB`;
  g.push(f.draw('PLAY TIME', pad, by, { scale: 2, fill: t.inkDim }));
  const barX = pad + 116;
  const barW = SCREEN_W - pad - barX;
  g.push(rect(barX, by + 2, barW, 12, `fill="${t.bar}" rx="1"`));
  const pct = Math.min(1, months / 120); // 10 years fills the bar
  g.push(
    rect(
      barX + 1,
      by + 3,
      1,
      10,
      `fill="${t.accent2}" rx="1"`,
      an('width', `values="1;${r(Math.max(1, barW * pct - 2))}" dur="1.6s" fill="freeze"`)
    )
  );
  g.push(f.draw(label, pad, by + 20, { scale: 2, fill: t.inkDim, opacity: 0.75 }));

  return g.join('');
}

// ------------------------------------------------------------ bottom screen --
function bottomScreen(f, d, content, t) {
  const g = [];

  // --- cart slot / profile -------------------------------------------------
  g.push(tile(10, 6, 400, 76, t));

  // 8x8 mosaic icon, seeded from the contribution data so it changes over time
  const recent = d.days.slice(-64);
  for (let i = 0; i < 64; i++) {
    const c = recent[i]?.count ?? 0;
    const lv = c === 0 ? 0 : c < 3 ? 1 : c < 6 ? 2 : c < 10 ? 3 : 4;
    g.push(rect(20 + (i % 8) * 6, 20 + Math.floor(i / 8) * 6, 6, 6, `fill="${t.levels[lv]}"`));
  }
  g.push(rect(20, 20, 48, 48, `fill="none" stroke="${t.tileEdge}"`));

  g.push(f.draw(clean(content.handle), 82, 18, { scale: 3, fill: t.ink }));
  g.push(f.draw(`${nf.format(d.total)} CONTRIBUTIONS`, 82, 46, { scale: 2, fill: t.accent }));
  g.push(
    f.draw(`${d.repoCount} REPOS ` + '•' + ` ${nf.format(d.stars)} STARS`, 82, 64, {
      scale: 2,
      fill: t.inkDim,
    })
  );

  // --- languages -----------------------------------------------------------
  g.push(tile(10, 88, 196, 66, t));
  g.push(f.draw('LANGUAGES', 20, 94, { scale: 2, fill: t.inkDim }));
  const langs = d.languages.slice(0, 3);
  langs.forEach((l, i) => {
    const y = 112 + i * 14;
    const w = 176;
    g.push(rect(20, y, w, 12, `fill="${t.bar}" rx="1"`));
    const fillW = Math.max(4, (w * l.pct) / 100);
    g.push(
      rect(
        20,
        y,
        4,
        12,
        `fill="${t.accent}" opacity="0.45" rx="1"`,
        an('width', `values="4;${r(fillW)}" dur="1.2s" begin="${0.3 + i * 0.15}s" fill="freeze"`)
      )
    );
    g.push(f.draw(ellipsis(l.name, 12).toUpperCase(), 24, y + 2, { scale: 2, fill: t.ink }));
    g.push(f.draw(`${Math.round(l.pct)}%`, 192, y + 2, { scale: 2, fill: t.inkDim, align: 'right' }));
  });

  // --- stats ---------------------------------------------------------------
  g.push(tile(214, 88, 196, 66, t));
  g.push(f.draw('SAVE DATA', 224, 94, { scale: 2, fill: t.inkDim }));
  const rows = [
    ['STREAK', `${d.current}D`],
    ['BEST', `${d.longest}D`],
    ['FOLLOWERS', `${nf.format(d.followers)}`],
  ];
  rows.forEach(([k, v], i) => {
    const y = 114 + i * 14;
    g.push(f.draw(k, 224, y, { scale: 2, fill: t.inkDim }));
    g.push(f.draw(v, 400, y, { scale: 2, fill: t.ink, align: 'right' }));
  });

  // --- contribution graph --------------------------------------------------
  g.push(tile(10, 160, 400, 82, t));
  g.push(f.draw('CONTRIBUTIONS', 20, 168, { scale: 2, fill: t.inkDim }));
  t.levels.forEach((c, i) => g.push(rect(340 + i * 8, 169, 6, 6, `fill="${c}" rx="1"`)));
  g.push(f.draw('LESS', 336, 168, { scale: 2, fill: t.inkDim, align: 'right' }));

  const gx = 20;
  const gy = 188;
  d.days.forEach((day, i) => {
    const wk = Math.floor(i / 7);
    const dow = i % 7;
    if (wk > 52) return;
    const c = day.count;
    const lv = c === 0 ? 0 : c < 3 ? 1 : c < 6 ? 2 : c < 10 ? 3 : 4;
    g.push(rect(gx + wk * 7, gy + dow * 7, 6, 6, `fill="${t.levels[lv]}" rx="1"`));
  });
  // a soft scanline sweeping across the grid, like the DS menu shimmer
  g.push(
    rect(
      gx,
      gy,
      40,
      49,
      'fill="url(#sweep)"',
      an('x', `values="${gx - 40};${gx + 380}" dur="4.5s" repeatCount="indefinite"`)
    )
  );

  // --- latest push ---------------------------------------------------------
  g.push(tile(10, 248, 400, 42, t));
  const commits = d.commits.slice(0, 3);
  if (commits.length === 0) {
    g.push(f.draw('NO RECENT PUSHES', 20, 264, { scale: 2, fill: t.inkDim }));
  }
  commits.forEach((c, i) => {
    const inner =
      f.draw('▶ ' + ellipsis(c.repo, 22), 20, 254, { scale: 2, fill: t.accent2 }) +
      f.draw(c.date, 400, 254, { scale: 2, fill: t.inkDim, align: 'right' }) +
      f.draw(ellipsis(c.message, 31), 20, 272, { scale: 2, fill: t.ink });
    g.push(slotFade(inner, i, commits.length, 4));
  });

  // --- selection ring, cycling across the four tiles -----------------------
  g.push(
    `<rect x="8" y="4" width="404" height="80" rx="4" fill="none" stroke="${t.accent}" stroke-width="2" stroke-dasharray="5 3">` +
      anim('x', '8;8;212;8', 12) +
      anim('y', '4;86;86;158', 12) +
      anim('width', '404;200;200;404', 12) +
      anim('height', '80;70;70;86', 12) +
      `<animate attributeName="stroke-dashoffset" values="0;-8" dur="0.5s" repeatCount="indefinite"/>` +
      `</rect>`
  );

  // --- footer --------------------------------------------------------------
  const fy = 296;
  // brightness sun
  g.push(circle(22, fy + 7, 4, `fill="none" stroke="${t.inkDim}"`));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.push(
      rect(22 + Math.cos(a) * 7 - 0.75, fy + 7 + Math.sin(a) * 7 - 0.75, 1.5, 1.5, `fill="${t.inkDim}"`)
    );
  }
  g.push(
    pulse(
      f.draw('TOUCH SCREEN TO CONTINUE', SCREEN_W / 2, fy + 2, {
        scale: 2,
        fill: t.inkDim,
        align: 'center',
      }),
      '1;1;0.15;1',
      2.4
    )
  );
  // settings gear
  g.push(circle(398, fy + 7, 5, `fill="none" stroke="${t.inkDim}"`));
  g.push(circle(398, fy + 7, 1.5, `fill="${t.inkDim}"`));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.push(rect(398 + Math.cos(a) * 7 - 1, fy + 7 + Math.sin(a) * 7 - 1, 2, 2, `fill="${t.inkDim}"`));
  }

  return g.join('');
}

const anim = (attr, values, dur) =>
  `<animate attributeName="${attr}" values="${values};${values.split(';')[0]}" ` +
  `keyTimes="0;0.25;0.5;0.75;1" calcMode="discrete" dur="${dur}s" repeatCount="indefinite"/>`;

// ------------------------------------------------------------------- shell --
function shell(f, t) {
  const g = [];

  // lid
  g.push(rrect(BODY_X, LID_Y, BODY_W, LID_H, 26, `fill="url(#shell)" stroke="${t.shellLine}"`));
  g.push(rrect(BODY_X + 5, LID_Y + 5, BODY_W - 10, LID_H - 10, 22, `fill="none" stroke="${t.shellEdge}" opacity="0.45"`));

  // screen bezel
  g.push(rrect(166, 36, 448, 343, 8, `fill="${t.bezel}" stroke="${t.bezelEdge}"`));

  // corner screws
  [[42, 36], [726, 36], [42, 368], [726, 368]].forEach(([x, y]) =>
    g.push(rrect(x - 5, y - 5, 10, 10, 2, `fill="${t.shellLine}" opacity="0.35"`))
  );

  // speaker grilles
  for (const startX of [66, 648]) {
    for (let c = 0; c < 4; c++) {
      for (let row = 0; row < 3; row++) {
        g.push(circle(startX + c * 18, 172 + row * 18, 2.5, `fill="${t.shellLine}" opacity="0.55"`));
      }
    }
  }

  // hinge
  g.push(rrect(BODY_X, HINGE_Y - 4, BODY_W, HINGE_H + 8, 12, `fill="url(#hinge)" stroke="${t.shellLine}"`));
  g.push(rrect(BODY_X, HINGE_Y - 6, 150, HINGE_H + 12, 14, `fill="url(#shell)" stroke="${t.shellLine}"`));
  g.push(rrect(BODY_X + BODY_W - 150, HINGE_Y - 6, 150, HINGE_H + 12, 14, `fill="url(#shell)" stroke="${t.shellLine}"`));

  // stylus resting in the hinge channel
  g.push(rrect(400, 416, 320, 11, 5.5, `fill="${t.shellEdge}" opacity="0.75" stroke="${t.shellLine}"`));
  g.push(rrect(700, 416, 20, 11, 5.5, `fill="${t.led}" opacity="0.85"`));

  // mic
  g.push(circle(360, 422, 3.5, `fill="${t.shellLine}" opacity="0.7"`));
  g.push(f.draw('MIC', 370, 417, { scale: 2, fill: t.shellInk, opacity: 0.7 }));

  // power LED
  g.push(
    rrect(736, 412, 8, 20, 4, `fill="${t.led}"`, an('opacity', 'values="1;0.45;1" dur="3s" repeatCount="indefinite"'))
  );

  // base
  g.push(rrect(BODY_X, BASE_Y, BODY_W, BASE_H, 26, `fill="url(#shell)" stroke="${t.shellLine}"`));
  g.push(rrect(BODY_X + 5, BASE_Y + 5, BODY_W - 10, BASE_H - 10, 22, `fill="none" stroke="${t.shellEdge}" opacity="0.4"`));
  g.push(rrect(166, 468, 448, 343, 8, `fill="${t.bezel}" stroke="${t.bezelEdge}"`));

  // d-pad
  const dx = 96;
  const dy = 600;
  const arm = 52;
  const half = 17;
  g.push(
    `<path d="M${dx - half} ${dy - arm}h${half * 2}v${arm - half}h${arm - half}v${half * 2}h-${
      arm - half
    }v${arm - half}h-${half * 2}v-${arm - half}h-${arm - half}v-${half * 2}h${arm - half}z" ` +
      `fill="${t.button}" stroke="${t.shellLine}" stroke-linejoin="round" stroke-width="2"/>`
  );
  [[0, -32], [32, 0], [0, 32], [-32, 0]].forEach(([ox, oy]) =>
    g.push(circle(dx + ox, dy + oy, 3, `fill="${t.buttonInk}" opacity="0.45"`))
  );

  // face buttons
  const bx = 684;
  const by = 592;
  [['X', 0, -40], ['A', 40, 0], ['B', 0, 40], ['Y', -40, 0]].forEach(([label, ox, oy]) => {
    g.push(circle(bx + ox, by + oy, 19, `fill="${t.button}" stroke="${t.shellLine}" stroke-width="2"`));
    g.push(circle(bx + ox, by + oy - 1, 17, `fill="none" stroke="${t.buttonEdge}" opacity="0.5"`));
    g.push(f.draw(label, bx + ox, by + oy - 7, { scale: 2, fill: t.buttonInk, align: 'center' }));
  });

  // start / select
  [['START', 690], ['SELECT', 726]].forEach(([label, y]) => {
    g.push(circle(660, y, 9, `fill="${t.button}" stroke="${t.shellLine}" stroke-width="1.5"`));
    g.push(f.draw(label, 676, y - 5, { scale: 2, fill: t.shellInk }));
  });

  // shell wordmark
  g.push(f.draw('gogeorge DS', 44, 828, { scale: 2, fill: t.shellInk, opacity: 0.65 }));
  g.push(f.draw('64-BIT DEV EDITION', 44, 846, { scale: 1, fill: t.shellInk, opacity: 0.5 }));

  return g.join('');
}

// ------------------------------------------------------------------ export --
export function renderDS(d, content, t, now = new Date()) {
  const f = new Font();

  // Screens are drawn first so the font registry is populated before defs().
  const top = topScreen(f, d, content, t, now);
  const bottom = bottomScreen(f, d, content, t);
  const chrome = shell(f, t);

  const screenBody = (inner, clipId) =>
    `<g clip-path="url(#${clipId})">${rect(0, 0, SCREEN_W, SCREEN_H, `fill="${t.screen}"`)}` +
    rect(0, 0, SCREEN_W, SCREEN_H, 'fill="url(#grid)"') +
    inner +
    `</g>`;

  const title = `${d.name} - ${nf.format(d.total)} contributions, ${d.current}-day streak, top language ${
    d.languages[0]?.name ?? 'n/a'
  }`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escapeXml(
    title
  )}">
<title>${escapeXml(title)}</title>
<defs>
  <linearGradient id="shell" x1="0" y1="0" x2="0.3" y2="1">
    <stop offset="0" stop-color="${t.shell[0]}"/><stop offset="1" stop-color="${t.shell[1]}"/>
  </linearGradient>
  <linearGradient id="hinge" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${t.hinge[0]}"/><stop offset="1" stop-color="${t.hinge[1]}"/>
  </linearGradient>
  <linearGradient id="titlebar" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${t.titleBar[1]}"/><stop offset="1" stop-color="${t.titleBar[0]}"/>
  </linearGradient>
  <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${t.accent}" stop-opacity="0"/>
    <stop offset="0.5" stop-color="${t.accent}" stop-opacity="0.14"/>
    <stop offset="1" stop-color="${t.accent}" stop-opacity="0"/>
  </linearGradient>
  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
    <path d="M10 0H0V10" fill="none" stroke="${t.grid}" stroke-width="1"/>
  </pattern>
  <clipPath id="clipTop"><rect width="${SCREEN_W}" height="${SCREEN_H}"/></clipPath>
  <clipPath id="clipBottom"><rect width="${SCREEN_W}" height="${SCREEN_H}"/></clipPath>
  <filter id="drop" x="-10%" y="-10%" width="120%" height="120%">
    <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.28"/>
  </filter>
  ${f.defs()}
</defs>
<g filter="url(#drop)">${chrome}</g>
<g transform="translate(${TOP_SCREEN.x} ${TOP_SCREEN.y})">${screenBody(top, 'clipTop')}</g>
<g transform="translate(${BOT_SCREEN.x} ${BOT_SCREEN.y})">${screenBody(bottom, 'clipBottom')}</g>
</svg>`;
}
