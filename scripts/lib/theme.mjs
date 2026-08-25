/**
 * GitHub Primer colour tokens, dark and light.
 *
 * These are GitHub's own values — the same ones github.com paints its profile
 * pages with — so a card built from them reads as a slice of the real UI. Both
 * modes are always rendered; the README's <picture> serves whichever matches
 * the viewer's GitHub theme.
 *
 * `levels` is GitHub's exact green contribution palette, reused here to shade
 * the commit-clock spokes from quiet to busy.
 */

const themes = {
  dark: {
    mode: 'dark',
    page: '#0d1117', // canvas.default
    box: '#0d1117',
    subtle: '#161b22', // canvas.subtle
    border: '#30363d', // border.default
    borderMuted: '#21262d', // border.muted
    fg: '#e6edf3', // fg.default
    fgMuted: '#7d8590', // fg.muted
    fgSubtle: '#6e7681', // fg.subtle
    accent: '#2f81f7', // accent.fg
    success: '#3fb950', // success.fg
    star: '#e3b341', // attention-ish
    topicBg: '#388bfd26', // accent.subtle
    topicFg: '#4493f8',
    topicBorder: '#1f6feb66',
    btnBg: '#21262d',
    btnBorder: '#3d444d',
    btnFg: '#c9d1d9',
    track: '#21262d', // language-bar remainder / meter track
    levels: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
  },

  light: {
    mode: 'light',
    page: '#ffffff',
    box: '#ffffff',
    subtle: '#f6f8fa',
    border: '#d0d7de',
    borderMuted: '#d8dee4',
    fg: '#1f2328',
    fgMuted: '#59636e',
    fgSubtle: '#6e7781',
    accent: '#0969da',
    success: '#1a7f37',
    star: '#9a6700',
    topicBg: '#ddf4ff',
    topicFg: '#0969da',
    topicBorder: '#0969da33',
    btnBg: '#f6f8fa',
    btnBorder: '#d0d7de',
    btnFg: '#24292f',
    track: '#eaeef2',
    levels: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
  },
};

export const modes = Object.keys(themes);

export function theme(mode) {
  const t = themes[mode];
  if (!t) throw new Error(`unknown mode "${mode}" — choose one of: ${modes.join(', ')}`);
  return t;
}
