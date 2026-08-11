/**
 * Themes are two independent halves that get merged:
 *
 *   screens[mode]   the two screens - follows the viewer's GitHub theme
 *                   via <picture>, so both modes are always rendered
 *   shells[preset]  the plastic - your choice, set "theme" in content.json
 *
 * Keeping them apart is what allows a black console with a light UI, or a
 * white console with a dark one, without writing out every combination.
 */

const screens = {
  dark: {
    screen: '#0d1117',
    grid: '#151c24',
    ink: '#c9d6e3',
    inkDim: '#6f7f8e',
    accent: '#58a6ff',
    accent2: '#7ee787',
    hand: '#8ba3bb',
    handSecond: '#ff6b6b',
    titleBar: ['#1b4770', '#2f6ea9'],
    titleInk: '#e8f2ff',
    tile: '#141b23',
    tileEdge: '#232d38',
    tileTop: '#1c2530',
    bar: '#1b2430',
    // levels[0] must stay clearly lighter than `tile`, or an empty day
    // disappears into the panel behind it.
    levels: ['#212c38', '#0e4429', '#006d32', '#26a641', '#39d353'],
  },

  light: {
    // Slightly off-white so the white menu tiles still read as raised panels.
    screen: '#eaeee2',
    grid: '#dfe5d5',
    ink: '#2a312e',
    inkDim: '#79857e',
    accent: '#1f6feb',
    accent2: '#1a7f37',
    hand: '#41546b',
    handSecond: '#d1242f',
    titleBar: ['#5b8fce', '#9cc4ee'],
    titleInk: '#ffffff',
    tile: '#ffffff',
    tileEdge: '#bcc7b2',
    tileTop: '#eef2e7',
    bar: '#e7ecdf',
    levels: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
  },
};

/**
 * Shell presets. Each has a dark and light variant so the plastic can pick up
 * a little of the viewer's theme rather than glaring against it.
 */
const shells = {
  // The lime DS Lite this whole thing is a tribute to.
  lime: {
    dark: {
      shell: ['#b0c800', '#8b9f00'],
      shellEdge: '#cfe552',
      shellLine: '#65760a',
      shellInk: '#5c6a08',
      hinge: ['#8fa400', '#6f8000'],
      button: '#9db300',
      buttonEdge: '#c4d94a',
      buttonInk: '#5d6b0c',
      led: '#7ee787',
      bezel: '#1d1f1a',
      bezelEdge: '#3c4034',
    },
    light: {
      shell: ['#cbe22e', '#a9c200'],
      shellEdge: '#e6f27a',
      shellLine: '#7d9200',
      shellInk: '#6d7f06',
      hinge: ['#b7cd12', '#93a800'],
      button: '#c0d520',
      buttonEdge: '#e4f286',
      buttonInk: '#6c7d09',
      led: '#39d353',
      bezel: '#3b3d36',
      bezelEdge: '#5d6154',
    },
  },

  // Black plastic. Pairs with either screen mode.
  noir: {
    dark: {
      shell: ['#2b2f36', '#1a1d22'],
      shellEdge: '#474e59',
      shellLine: '#0e1013',
      shellInk: '#8d96a3',
      hinge: ['#22262c', '#15181c'],
      button: '#3a4049',
      buttonEdge: '#5c6472',
      buttonInk: '#aeb7c4',
      led: '#7ee787',
      bezel: '#08090b',
      bezelEdge: '#2b3038',
    },
    light: {
      shell: ['#3c414a', '#23272d'],
      shellEdge: '#5f6672',
      shellLine: '#14171b',
      shellInk: '#a2abb8',
      hinge: ['#2f343b', '#1d2025'],
      button: '#49505b',
      buttonEdge: '#6d7583',
      buttonInk: '#c6cdd8',
      led: '#39d353',
      bezel: '#0f1216',
      bezelEdge: '#363c45',
    },
  },

  // White plastic, the classic launch colour.
  snow: {
    dark: {
      shell: ['#e6e9ed', '#c6cbd3'],
      shellEdge: '#ffffff',
      shellLine: '#9ba1ac',
      shellInk: '#6f757f',
      hinge: ['#d6dae0', '#b8bdc6'],
      button: '#dde1e7',
      buttonEdge: '#ffffff',
      buttonInk: '#767c87',
      led: '#39d353',
      bezel: '#25282e',
      bezelEdge: '#464b54',
    },
    light: {
      shell: ['#f8f9fb', '#dde1e7'],
      shellEdge: '#ffffff',
      shellLine: '#b4b9c2',
      shellInk: '#828892',
      hinge: ['#edeff2', '#d0d5db'],
      button: '#f1f3f6',
      buttonEdge: '#ffffff',
      buttonInk: '#878d97',
      led: '#2da44e',
      bezel: '#383c43',
      bezelEdge: '#5a5f69',
    },
  },

  // Cobalt blue.
  cobalt: {
    dark: {
      shell: ['#2f5fa8', '#1e4276'],
      shellEdge: '#6a97d8',
      shellLine: '#132c50',
      shellInk: '#a6c4ec',
      hinge: ['#27508e', '#193a66'],
      button: '#356bbd',
      buttonEdge: '#7aa5de',
      buttonInk: '#cbdcf5',
      led: '#7ee787',
      bezel: '#0b121b',
      bezelEdge: '#2a3748',
    },
    light: {
      shell: ['#4a7fc9', '#2e5da4'],
      shellEdge: '#93b9e8',
      shellLine: '#1c3d6d',
      shellInk: '#c6dbf5',
      hinge: ['#3d6cb0', '#27548c'],
      button: '#5288ce',
      buttonEdge: '#9fc2eb',
      buttonInk: '#dde9f9',
      led: '#39d353',
      bezel: '#232830',
      bezelEdge: '#434a55',
    },
  },

  // Coral pink.
  coral: {
    dark: {
      shell: ['#c9506b', '#9c3550'],
      shellEdge: '#e9899e',
      shellLine: '#6d2138',
      shellInk: '#f0aebd',
      hinge: ['#ad4159', '#8a2d45'],
      button: '#bd4b64',
      buttonEdge: '#e28aa0',
      buttonInk: '#f7cdd7',
      led: '#7ee787',
      bezel: '#1b1013',
      bezelEdge: '#3d2a30',
    },
    light: {
      shell: ['#e9788f', '#c9506b'],
      shellEdge: '#f7b3c1',
      shellLine: '#8d2f48',
      shellInk: '#fbd7df',
      hinge: ['#d9647d', '#b44462'],
      button: '#e2718a',
      buttonEdge: '#f8bccb',
      buttonInk: '#fde7ec',
      led: '#39d353',
      bezel: '#302428',
      bezelEdge: '#524045',
    },
  },
};

export const presets = Object.keys(shells);
export const modes = Object.keys(screens);

/** Merge a shell preset with a screen mode into one flat token set. */
export function theme(preset, mode) {
  const shell = shells[preset];
  if (!shell) {
    throw new Error(`unknown theme "${preset}" - choose one of: ${presets.join(', ')}`);
  }
  return { ...screens[mode], ...shell[mode], name: `${preset}-${mode}` };
}
