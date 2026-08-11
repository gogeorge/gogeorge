import { Font, clean, ellipsis, escapeXml, round as r } from './text.mjs';
import { avatars, drawSprite } from './sprites.mjs';

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

/**
 * Merge a list of [x, y, w, h] into one path.
 *
 * This image is rasterised as a whole on every animation frame, so element
 * count is the thing that costs. Collapsing the 371-cell contribution grid
 * into one path per colour is worth far more than any byte saving.
 */
const rectsPath = (rects) =>
  rects.map(([x, y, w, h]) => `M${r(x)} ${r(y)}h${r(w)}v${r(h)}h-${r(w)}z`).join('');

/**
 * Wrap markup in a group that is visible for one slot of an N-slot rotation.
 *
 * The swap is discrete rather than a crossfade. A fade interpolates opacity on
 * every frame it runs, which forces the browser to re-rasterise the whole
 * image; a discrete step repaints only at the moment the panel changes.
 *
 * Slot 0 also carries a static opacity of 1, so if SMIL never runs - a still
 * capture, a converter, a reader that ignores animation - the panel shows its
 * first entry instead of going blank.
 */
function slotFade(svg, index, count, slotSeconds) {
  if (count <= 1) return svg;
  const values = Array.from({ length: count }, (_, i) => (i === index ? 1 : 0)).join(';');
  const keyTimes = Array.from({ length: count }, (_, i) => r(i / count)).join(';');
  return (
    `<g opacity="${index === 0 ? 1 : 0}">${svg}` +
    an(
      'opacity',
      `values="${values}" keyTimes="${keyTimes}" calcMode="discrete" ` +
        `dur="${count * slotSeconds}s" repeatCount="indefinite"`
    ) +
    `</g>`
  );
}

/** A filled meter bar. Static - the grow-in animation cost more than it gave. */
const bar = (x, y, w, h, fill) => rect(x, y, Math.max(1, w), h, `fill="${fill}" rx="1"`);

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
  g.push(rrect(SCREEN_W - 56, 5, 12, 10, 1, `fill="${t.titleInk}" opacity="0.6"`));
  g.push(rrect(SCREEN_W - 40, 5, 12, 10, 1, `fill="${t.titleInk}" opacity="0.6"`));
  g.push(rrect(SCREEN_W - 24, 6, 18, 8, 1, `fill="none" stroke="${t.titleInk}" opacity="0.8"`));
  g.push(rect(SCREEN_W - 6, 8, 2, 4, `fill="${t.titleInk}" opacity="0.8"`));
  g.push(rect(SCREEN_W - 22, 8, 14, 4, `fill="${t.led}"`));

  // Two columns: device widgets on the left, everything you wrote on the right.
  const COL_L = { x: 16, w: 112 };
  const COL_R = { x: 136, w: 268 };
  const inset = 10;
  const textW = COL_R.w - inset * 2; // 248 -> 20 chars at scale 2, 13 at scale 3

  // --- clock ---------------------------------------------------------------
  const cx = COL_L.x + COL_L.w / 2;
  const cy = 86;
  g.push(tile(COL_L.x, 30, COL_L.w, 112, t));
  for (let i = 0; i < 12; i++) {
    if (i % 3 === 0) continue; // the 12/3/6/9 slots hold numerals instead
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    g.push(rect(cx + Math.cos(a) * 40 - 1.5, cy + Math.sin(a) * 40 - 1.5, 3, 3, `fill="${t.inkDim}"`));
  }
  const num = { scale: 2, fill: t.inkDim, opacity: 0.6, align: 'center' };
  g.push(f.draw('12', cx, cy - 48, num));
  g.push(f.draw('6', cx, cy + 32, num));
  g.push(f.draw('3', cx + 40, cy - 8, num));
  g.push(f.draw('9', cx - 40, cy - 8, num));

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

  g.push(hand(22, 4, t.hand, hourAngle));
  g.push(hand(32, 3, t.hand, minAngle));

  // The second hand is the one thing on the device that is genuinely live.
  // It steps once per second rather than sweeping: a real clock ticks, and a
  // discrete step repaints the image once a second instead of sixty times.
  const ticks = Array.from(
    { length: 60 },
    (_, i) => `${r((secAngle + i * 6) % 360)} ${r(cx)} ${r(cy)}`
  ).join(';');
  g.push(
    `<g>${rect(cx - 1, cy - 36, 2, 43, `fill="${t.handSecond}"`)}` +
      `<animateTransform attributeName="transform" type="rotate" values="${ticks}" ` +
      `calcMode="discrete" dur="60s" repeatCount="indefinite"/></g>`
  );
  g.push(circle(cx, cy, 3, `fill="${t.ink}"`));

  // --- last 30 days sparkline ----------------------------------------------
  g.push(tile(COL_L.x, 148, COL_L.w, 74, t));
  g.push(f.draw('LAST 30D', COL_L.x + 6, 154, { scale: 2, fill: t.inkDim }));
  const last30 = d.days.slice(-30);
  const peak = Math.max(1, ...last30.map((x) => x.count));
  const bars = { on: [], off: [] };
  last30.forEach((day, i) => {
    const h = Math.max(1, (day.count / peak) * 34);
    bars[day.count ? 'on' : 'off'].push([COL_L.x + 8 + i * 3.2, 216 - h, 2.4, h]);
  });
  g.push(`<path d="${rectsPath(bars.off)}" fill="${t.bar}"/>`);
  g.push(`<path d="${rectsPath(bars.on)}" fill="${t.accent2}"/>`);
  g.push(rect(COL_L.x + 8, 217, 96, 1, `fill="${t.tileEdge}"`));

  // --- play time -----------------------------------------------------------
  g.push(tile(COL_L.x, 228, COL_L.w, 74, t));
  const since = new Date(d.since);
  let months =
    (now.getFullYear() - since.getFullYear()) * 12 + now.getMonth() - since.getMonth();
  if (now.getDate() < since.getDate()) months -= 1; // don't round a partial month up
  months = Math.max(0, months);
  g.push(f.draw('PLAYTIME', COL_L.x + 6, 234, { scale: 2, fill: t.inkDim }));
  g.push(
    f.draw(`${Math.floor(months / 12)}Y ${months % 12}M`, COL_L.x + 6, 254, {
      scale: 2,
      fill: t.ink,
    })
  );
  const barW = COL_L.w - 20;
  g.push(rect(COL_L.x + 8, 276, barW, 10, `fill="${t.bar}" rx="1"`));
  const pct = Math.min(1, months / 180); // 15 years fills the bar
  g.push(bar(COL_L.x + 9, 277, barW * pct - 2, 8, t.accent2));

  // --- now playing ---------------------------------------------------------
  g.push(tile(COL_R.x, 30, COL_R.w, 112, t));
  g.push(f.draw('NOW PLAYING', COL_R.x + inset, 38, { scale: 2, fill: t.inkDim }));
  g.push(rect(COL_R.x + inset, 58, textW, 1, `fill="${t.tileEdge}"`));

  const slots = content.nowPlaying.slice(0, 3);
  slots.forEach((slot, i) => {
    const title = clean(slot.title);
    // Long titles drop to the smaller size rather than running off the tile.
    const scale = f.fitScale(title, textW, [3, 2]);
    const sub = f.paragraph(ellipsis(slot.sub, 40), COL_R.x + inset, 96, {
      scale: 2,
      leading: 0.5,
      maxWidth: textW,
      fill: t.inkDim,
    });
    g.push(
      slotFade(
        f.draw(ellipsis(title, scale === 3 ? 13 : 20), COL_R.x + inset, 66, { scale, fill: t.ink }) +
          sub,
        i,
        slots.length,
        5
      )
    );
  });

  g.push(rect(COL_R.x + COL_R.w - 18, 120, 8, 14, `fill="${t.accent}"`));

  // --- status list ---------------------------------------------------------
  g.push(tile(COL_R.x, 146, COL_R.w, 156, t));
  content.status.slice(0, 3).forEach((row, i) => {
    const y = 151 + i * 49;
    g.push(f.draw(clean(row.label).toUpperCase(), COL_R.x + inset, y, { scale: 2, fill: t.accent }));
    g.push(
      f.paragraph(ellipsis(row.value, 40), COL_R.x + inset, y + 16, {
        scale: 2,
        leading: 0.5,
        maxWidth: textW,
        fill: t.ink,
      })
    );
  });

  return g.join('');
}

// ------------------------------------------------------------ bottom screen --
function bottomScreen(f, d, content, t) {
  const g = [];

  const level = (c) => (c === 0 ? 0 : c < 3 ? 1 : c < 6 ? 2 : c < 10 ? 3 : 4);

  // --- cart slot / profile -------------------------------------------------
  g.push(tile(10, 4, 400, 74, t));

  // Profile picture: a pixel-art avatar, or the last 64 days of activity as a
  // mosaic. Set "avatar" in content.json to "male", "female" or "activity".
  const choice = content.avatar ?? 'male';
  g.push(rect(20, 17, 48, 48, `fill="${t.bar}"`));
  if (avatars[choice]) {
    g.push(drawSprite(avatars[choice], 20, 17, 2));
  } else {
    const recent = d.days.slice(-64);
    const blank = d.total === 0;
    for (let i = 0; i < 64; i++) {
      const col = i % 8;
      const row = Math.floor(i / 8);
      // Without contribution data the mosaic would be a dead grey square.
      const lv = blank ? [0, 2, 3, 2][(col + row) % 4] : level(recent[i]?.count ?? 0);
      g.push(rect(20 + col * 6, 17 + row * 6, 6, 6, `fill="${t.levels[lv]}"`));
    }
  }
  g.push(rect(20, 17, 48, 48, `fill="none" stroke="${t.tileEdge}"`));

  g.push(f.draw(clean(content.handle), 82, 12, { scale: 3, fill: t.ink }));
  g.push(f.draw(`${nf.format(d.total)} CONTRIBUTIONS`, 82, 40, { scale: 2, fill: t.accent }));
  g.push(
    f.draw(`${d.repoCount} REPOS • ${nf.format(d.stars)} STARS`, 82, 58, {
      scale: 2,
      fill: t.inkDim,
    })
  );

  // --- languages -----------------------------------------------------------
  // Name and percentage sit ON the bar, which is the only way three rows of
  // readable 16px text fit in a 196px tile.
  g.push(tile(10, 82, 196, 82, t));
  g.push(f.draw('LANGUAGES', 20, 88, { scale: 2, fill: t.inkDim }));
  d.languages.slice(0, 3).forEach((l, i) => {
    const y = 108 + i * 18;
    const w = 176;
    g.push(rect(20, y, w, 16, `fill="${t.bar}" rx="1"`));
    g.push(`<g opacity="0.4">${bar(20, y, (w * l.pct) / 100, 16, t.accent)}</g>`);
    g.push(f.draw(ellipsis(l.name, 13).toUpperCase(), 24, y + 4, { scale: 2, fill: t.ink }));
    g.push(f.draw(`${Math.round(l.pct)}%`, 192, y + 4, { scale: 2, fill: t.inkDim, align: 'right' }));
  });

  // --- stats ---------------------------------------------------------------
  g.push(tile(214, 82, 196, 82, t));
  g.push(f.draw('SAVE DATA', 224, 88, { scale: 2, fill: t.inkDim }));
  [
    ['STREAK', `${d.current}D`],
    ['BEST', `${d.longest}D`],
    ['FOLLOWERS', `${nf.format(d.followers)}`],
  ].forEach(([k, v], i) => {
    const y = 110 + i * 18;
    g.push(f.draw(k, 224, y, { scale: 2, fill: t.inkDim }));
    g.push(f.draw(v, 400, y, { scale: 2, fill: t.ink, align: 'right' }));
  });

  // --- contribution graph --------------------------------------------------
  g.push(tile(10, 168, 400, 78, t));
  g.push(f.draw('CONTRIBUTIONS', 20, 174, { scale: 2, fill: t.inkDim }));
  g.push(f.draw('LESS', 300, 174, { scale: 2, fill: t.inkDim, align: 'right' }));
  t.levels.forEach((c, i) => g.push(rect(306 + i * 8, 175, 6, 6, `fill="${c}" rx="1"`)));
  g.push(f.draw('MORE', 350, 174, { scale: 2, fill: t.inkDim }));

  // One path per intensity level rather than 371 individual cells.
  const gx = 20;
  const gy = 192;
  const cells = t.levels.map(() => []);
  d.days.forEach((day, i) => {
    const wk = Math.floor(i / 7);
    if (wk > 52) return;
    cells[level(day.count)].push([gx + wk * 7, gy + (i % 7) * 7, 6, 6]);
  });
  cells.forEach((group, lv) => {
    if (group.length) g.push(`<path d="${rectsPath(group)}" fill="${t.levels[lv]}"/>`);
  });

  // --- latest push ---------------------------------------------------------
  g.push(tile(10, 250, 400, 38, t));
  const commits = d.commits.slice(0, 3);
  if (commits.length === 0) {
    g.push(f.draw('NO RECENT PUBLIC PUSHES', 20, 262, { scale: 2, fill: t.inkDim }));
  }
  commits.forEach((c, i) => {
    const inner =
      f.draw('▶ ' + ellipsis(c.repo, 20), 20, 253, { scale: 2, fill: t.accent2 }) +
      f.draw(c.date, 400, 253, { scale: 2, fill: t.inkDim, align: 'right' }) +
      f.draw(ellipsis(c.message, 31), 20, 271, { scale: 2, fill: t.ink });
    g.push(slotFade(inner, i, commits.length, 4));
  });

  // Selection ring, hopping between the four tiles. The marching-ants dash
  // animation was removed: it repainted the whole image sixty times a second.
  g.push(
    `<rect x="8" y="2" width="404" height="78" rx="4" fill="none" stroke="${t.accent}" stroke-width="2" stroke-dasharray="5 3">` +
      anim('x', '8;8;212;8', 12) +
      anim('y', '2;80;80;166', 12) +
      anim('width', '404;200;200;404', 12) +
      anim('height', '78;86;86;82', 12) +
      `</rect>`
  );

  // --- footer --------------------------------------------------------------
  const fy = 293;
  // brightness sun
  g.push(circle(22, fy + 7, 4, `fill="none" stroke="${t.inkDim}"`));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.push(
      rect(22 + Math.cos(a) * 7 - 0.75, fy + 7 + Math.sin(a) * 7 - 0.75, 1.5, 1.5, `fill="${t.inkDim}"`)
    );
  }
  g.push(
    f.draw('TOUCH SCREEN TO CONTINUE', SCREEN_W / 2, fy + 2, {
      scale: 2,
      fill: t.inkDim,
      align: 'center',
    })
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

  // Fake soft shadow: three offset rounded rects instead of feDropShadow.
  // A real blur filter has to be recomputed across the whole 780x884 canvas
  // whenever anything on the device animates, which is far too expensive.
  for (const [dy, o] of [[8, 0.05], [5, 0.06], [2, 0.07]]) {
    g.push(rrect(BODY_X + 4, LID_Y + dy, BODY_W - 8, LID_H, 26, `fill="#000" opacity="${o}"`));
    g.push(rrect(BODY_X + 4, BASE_Y + dy, BODY_W - 8, BASE_H, 26, `fill="#000" opacity="${o}"`));
  }

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

  // Mic hole and label, centred in the flat channel between the knuckles.
  g.push(circle(370, 422, 3.5, `fill="${t.shellLine}" opacity="0.75"`));
  g.push(circle(370, 422, 1.5, `fill="${t.bezel}" opacity="0.5"`));
  g.push(f.draw('MIC', 382, 417, { scale: 2, fill: t.shellInk, opacity: 0.7 }));

  // Power LED. Static: this sat inside the drop-shadow filter, so pulsing it
  // re-ran a full-device Gaussian blur on every frame.
  g.push(rrect(736, 412, 8, 20, 4, `fill="${t.led}"`));

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

  const screenBody = (inner) =>
    `<g clip-path="url(#screen)">${rect(0, 0, SCREEN_W, SCREEN_H, `fill="${t.screen}"`)}` +
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
  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
    <path d="M10 0H0V10" fill="none" stroke="${t.grid}" stroke-width="1"/>
  </pattern>
  <clipPath id="screen"><rect width="${SCREEN_W}" height="${SCREEN_H}"/></clipPath>
  ${f.defs()}
</defs>
${chrome}
<g transform="translate(${TOP_SCREEN.x} ${TOP_SCREEN.y})">${screenBody(top)}</g>
<g transform="translate(${BOT_SCREEN.x} ${BOT_SCREEN.y})">${screenBody(bottom)}</g>
</svg>`;
}
