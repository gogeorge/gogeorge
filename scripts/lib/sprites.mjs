/**
 * 24x24 pixel-art avatars for the cart slot on the bottom screen.
 *
 * Drawn in the same ASCII-art style as the font so the whole device stays on
 * one pixel grid. Rendered at 2px per cell to fill the 48x48 icon well.
 *
 *   .  transparent      S  skin        K  ink (eyes, mouth)
 *   H  hair             N  nose line   R  shirt
 */

export const PALETTE = {
  H: '#4a2c17',
  S: '#ffdcb0',
  K: '#1c1c1c',
  N: '#d5a074',
  R: '#e2352b',
};

const male = [
  '........................',
  '.......HHHHHHHHHH.......',
  '.....HHHHHHHHHHHHHH.....',
  '....HHHHHHHHHHHHHHHH....',
  '...HHHHHHHHHHHHHHHHHH...',
  '...HHHHHHHHHHHHHHHHHH...',
  '...HHSSHHHSSHHHSSHHHH...',
  '...HHSSSSSSSSSSSSSSHH...',
  '...HSSSSSSSSSSSSSSSSH...',
  '...HSSSHHHSSSSHHHSSSH...',
  '....SSSSSSSSSSSSSSSS....',
  '....SSSKKSSSSSSKKSSS....',
  '....SSSKKSSSSSSKKSSS....',
  '....SSSSSSSNSSSSSSSS....',
  '....SSSSSSSNSSSSSSSS....',
  '....SSSSSSSNNSSSSSSS....',
  '....SSSSSSSSSSSSSSSS....',
  '....SSSSSKKKKKKSSSSS....',
  '....SSSSSSSSSSSSSSSS....',
  '.....SSSSSSSSSSSSSS.....',
  '......SSSSSSSSSSSS......',
  '....RRRRRRRRRRRRRRRR....',
  '...RRRRRRRRRRRRRRRRRR...',
  '..RRRRRRRRRRRRRRRRRRRR..',
];

const female = [
  '........................',
  '.......HHHHHHHHHH.......',
  '.....HHHHHHHHHHHHHH.....',
  '....HHHHHHHHHHHHHHHH....',
  '...HHHHHHHHHHHHHHHHHH...',
  '...HHHHHHHHHHHHHHHHHH...',
  '...HHHHHSSSSSSSSHHHHH...',
  '...HHSSSSSSSSSSSSSSHH...',
  '...HHSSSSSSSSSSSSSSHH...',
  '...HHSSHHHSSSSHHHSSHH...',
  '...HHSSSSSSSSSSSSSSHH...',
  '...HHSSKKSSSSSSKKSSHH...',
  '...HHSSKKSSSSSSKKSSHH...',
  '...HHSSSSSSNSSSSSSSHH...',
  '...HHSSSSSSNSSSSSSSHH...',
  '...HHSSSSSSNNSSSSSSHH...',
  '...HHSSSSSSSSSSSSSSHH...',
  '...HHSSSSKKKKKKSSSSHH...',
  '...HHSSSSSSSSSSSSSSHH...',
  '...HHHSSSSSSSSSSSSHHH...',
  '...HHHHSSSSSSSSSSHHHH...',
  '...HHHHHRRRRRRRRHHHHH...',
  '..HHHHHRRRRRRRRRRHHHHH..',
  '..HHHHRRRRRRRRRRRRHHHH..',
];

export const avatars = { male, female };

const SIZE = 24;

// Catch a miscounted row at build time rather than shipping a skewed sprite.
for (const [name, rows] of Object.entries(avatars)) {
  if (rows.length !== SIZE) {
    throw new Error(`sprite "${name}" has ${rows.length} rows, expected ${SIZE}`);
  }
  rows.forEach((row, i) => {
    if (row.length !== SIZE) {
      throw new Error(`sprite "${name}" row ${i} is ${row.length} chars, expected ${SIZE}`);
    }
    for (const c of row) {
      if (c !== '.' && !PALETTE[c]) {
        throw new Error(`sprite "${name}" row ${i} uses unknown colour "${c}"`);
      }
    }
  });
}

/**
 * Render a sprite as merged horizontal runs, so a 24x24 avatar costs a few
 * dozen rects rather than 576.
 */
export function drawSprite(rows, x, y, px = 2) {
  const out = [];
  rows.forEach((row, ry) => {
    let cx = 0;
    while (cx < SIZE) {
      const ch = row[cx];
      if (ch === '.') {
        cx++;
        continue;
      }
      let w = 0;
      while (cx + w < SIZE && row[cx + w] === ch) w++;
      out.push(
        `<rect x="${x + cx * px}" y="${y + ry * px}" width="${w * px}" height="${px}" fill="${PALETTE[ch]}"/>`
      );
      cx += w;
    }
  });
  return out.join('');
}
