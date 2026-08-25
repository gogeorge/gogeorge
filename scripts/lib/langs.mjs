/**
 * GitHub Linguist language colours — the same hues GitHub paints its language
 * bars and dots with. Unknown languages fall back to a small neutral rotation
 * so the bar never renders a colourless gap.
 */

const COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Go: '#00ADD8',
  Java: '#b07219',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Rust: '#dea584',
  Dart: '#00B4AB',
  HTML: '#e34c26',
  CSS: '#663399',
  SCSS: '#c6538c',
  Less: '#1d365d',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Astro: '#ff5a03',
  Shell: '#89e051',
  PowerShell: '#012456',
  'Jupyter Notebook': '#DA5B0B',
  'Objective-C': '#438eff',
  Elixir: '#6e4a7e',
  Erlang: '#B83998',
  Haskell: '#5e5086',
  Clojure: '#db5855',
  Lua: '#000080',
  Perl: '#0298c3',
  Scala: '#c22d40',
  R: '#198CE7',
  Julia: '#a270ba',
  MATLAB: '#e16737',
  Zig: '#ec915c',
  Nix: '#7e7eff',
  OCaml: '#3be133',
  'F#': '#b845fc',
  Solidity: '#AA6746',
  Markdown: '#083fa1',
  Dockerfile: '#384d54',
  Makefile: '#427819',
  TeX: '#3D6117',
  Vim: '#199f4b',
  'Vim Script': '#199f4b',
  Assembly: '#6E4C13',
  GDScript: '#355570',
  'Emacs Lisp': '#c065db',
  Roff: '#ecdebe',
  HCL: '#844FBA',
};

const FALLBACK = ['#8b949e', '#a5a5a5', '#6f7681', '#b1bac4', '#768390'];

let fbIndex = 0;
export function langColor(name) {
  if (COLORS[name]) return COLORS[name];
  return FALLBACK[fbIndex++ % FALLBACK.length];
}

export function resetFallback() {
  fbIndex = 0;
}
