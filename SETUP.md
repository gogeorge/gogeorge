# Build your own

How to put this handheld on your own GitHub profile. Takes about ten minutes.

You'll end up with a self-contained animated SVG that redraws itself every
morning with your real GitHub stats, committed straight into your profile repo.

---

## What you need

- **Node 20 or newer** (`node --version`)
- **A profile repository** — a public repo named exactly the same as your
  username. `octocat` needs a repo called `octocat/octocat`. If you don't have
  one, GitHub offers to create it with a "special repository" note when you make
  a new repo with your own username.

Nothing else. No dependencies, no build tools, no npm install.

---

## 1. Copy the files

From this repo you need:

```
content.json
package.json
scripts/
.github/workflows/refresh-ds.yml
```

Drop them into your profile repo, keeping the folder structure. You do **not**
need `assets/` — that's generated output, and yours will be rebuilt in step 3.

## 2. Make it yours

Open `content.json`. This is the only file you edit routinely.

```jsonc
{
  "handle": "octocat",          // your GitHub username — also used to fetch your stats
  "theme": "lime",              // shell colour, see below
  "avatar": "male",             // "male", "female", or "activity"
  "nowPlaying": [ ... ],        // the rotating headline on the top screen
  "status": [ ... ]             // the three-row list below it
}
```

### Picking a console

**`theme`** sets the plastic:

| | |
|---|---|
| `lime` | the DS Lite green this is a tribute to (default) |
| `noir` | black |
| `snow` | white |
| `cobalt` | blue |
| `coral` | pink |

**`avatar`** sets the profile picture in the cart slot: `male`, `female`, or
`activity` for a mosaic of your last 64 days of contributions.

The two screens are separate from the shell colour — they follow whether the
person looking at your profile has GitHub in light or dark mode. That's why
every theme is rendered twice, and why a black console can show a light UI or a
white console a dark one. You don't choose that; your visitors do.

Run `npm run preview` and open `preview.html` to see all five shells in both
modes and both avatars on one page, with your current pick outlined in blue.

**Mind the character budgets.** The screens are 420 units wide and the font is
5 pixels, so space is genuinely tight. Anything too long is shortened with an
ellipsis rather than overflowing, but it's better to write to the limit:

| Field | Fits |
|---|---|
| `handle` | 13 characters |
| `nowPlaying[].title` | 13 at the large size, then auto-shrinks to 20 |
| `nowPlaying[].sub` | ~40, wraps to two lines |
| `status[].label` | 20 |
| `status[].value` | ~40, wraps to two lines |

`nowPlaying` and `status` each show up to three entries. Fewer is fine.

## 3. Render it

```bash
npm run preview
```

That writes `assets/ds-dark.svg`, `assets/ds-light.svg` and a `preview.html`
showing both themes side by side, plus the two avatar options. Open
`preview.html` in a browser to check your text fits.

Unauthenticated, GitHub's API only gives you public data and the contribution
graph will be sparse. To see the real thing locally, put a token in a `.env`
file at the repo root:

```
GH_TOKEN=ghp_your_token_here
```

`.env` is gitignored. See step 5 for how to create the token.

## 4. Point the README at your repo

In your `README.md`, embed the console. Replace **`octocat/octocat`** with your
own `username/repo` in all three URLs:

```html
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/octocat/octocat/main/assets/ds-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/octocat/octocat/main/assets/ds-light.svg">
    <img alt="A handheld console showing my GitHub stats" src="https://raw.githubusercontent.com/octocat/octocat/main/assets/ds-dark.svg" width="100%">
  </picture>
</p>
```

Two things about this snippet that are easy to get wrong:

- **Use absolute `raw.githubusercontent.com` URLs, not relative paths.** GitHub
  rewrites relative paths in `<img src>` but not reliably in `<source srcset>`,
  which is what the dark/light switch depends on.
- **Check your default branch.** The URLs say `main`. If yours is `master`,
  change it.

## 5. Add a token so the contribution graph is real

The contribution calendar is only available through GitHub's GraphQL API, and
the automatic `GITHUB_TOKEN` in Actions can't read it. Without a personal token
the build still succeeds — it just approximates the graph from your public
events, which usually means a nearly empty grid.

1. Go to **Settings → Developer settings → Personal access tokens → Tokens
   (classic)** and generate a new token.
2. Tick the **`read:user`** scope. Nothing else is needed.
3. In your profile repo: **Settings → Secrets and variables → Actions → New
   repository secret**.
4. Name it **`GH_PAT`** and paste the token.

## 6. Let the workflow commit

The workflow pushes the regenerated SVGs back to your repo, so it needs write
access. In your repo: **Settings → Actions → General → Workflow permissions**,
select **Read and write permissions**, and save.

## 7. Push

```bash
git add .
git commit -m "Add DS profile console"
git push
```

Then open the **Actions** tab, pick **Refresh DS**, and hit **Run workflow** to
render it immediately rather than waiting for the 06:00 UTC schedule.

---

## Customising further

**Colours.** `scripts/lib/theme.mjs` is split in two: `screens` holds the dark
and light screen palettes, `shells` holds one entry per console colour. To add
your own shell, copy an existing preset, rename it, and use that name in
`content.json` — an unknown name fails the build and lists the valid ones. One
rule if you touch the screen palettes: keep `levels[0]` clearly lighter than
`tile`, or empty days in the contribution graph vanish into the panel.

**Avatars.** `scripts/lib/sprites.mjs` defines them as 24×24 ASCII art — `H`
hair, `S` skin, `K` ink, `N` nose, `R` shirt, `.` transparent. Edit the grid or
add your own and reference it by name in `content.json`. Row widths are checked
at build time, so a miscount fails loudly instead of rendering skewed.

**The font.** `scripts/lib/glyphs.mjs` is a 5×7 bitmap font written as ASCII
art. To add a character, add an 8-row entry (row 8 is only for descenders).
Anything without a glyph is silently dropped rather than rendered as `?`.

**Layout.** `scripts/lib/ds.mjs` has the shell geometry at the top and the two
screen layouts below. Both screens are 420×315 with the origin at the top-left
of the screen. Text `y` is the top of the cap box, not a baseline.

### Two rules that keep it cheap to render

A browser rasterises an `<img>`-embedded SVG as a single texture, so *any*
change anywhere redraws the whole image. That makes two things unusually
expensive, and both were learned the hard way here — an earlier version made
laptop fans audible just by sitting on a profile page.

**No filters.** `feDropShadow` and friends recompute across the element's whole
bounding box on every redraw. The shell shadow is three offset rounded rects
instead. If you want a glow, fake it with stacked shapes.

**Animate discretely, never continuously.** A crossfade or a sweeping motion
interpolates on every frame, pinning a core at 60fps forever. Every animation
in this file uses `calcMode="discrete"` — the clock's second hand ticks once a
second instead of sweeping, panels snap instead of fading. The result repaints
about once a second rather than sixty times, and it looks *more* like a real
handheld, not less.

---

## Troubleshooting

**The image on my profile is stale.**
GitHub proxies and caches images through camo. A refresh usually shows up within
minutes, but it can lag. Confirm the SVG in the repo actually changed first — if
the workflow logged "No change", the data genuinely didn't move.

**The contribution graph is nearly empty.**
The `GH_PAT` secret is missing, expired, or lacks `read:user`. Check the workflow
log: it prints `data source: graphql` when the token worked, and
`data source: events` when it fell back.

**The workflow fails on `git push`.**
Workflow permissions are still read-only. See step 6.

**"NO RECENT PUBLIC PUSHES".**
Commits are read from your most recently pushed public repos. If your recent
work is all private, there is nothing public to show — this is deliberate, the
build never reads private commit messages into a public image.

**Nothing animates.**
Check you're looking at the SVG through an `<img>` or a browser tab, not a
Markdown previewer that rasterises it. Everything still reads correctly when
frozen: bars render full and rotating panels show their first entry.

**A character comes out blank.**
It has no glyph in the 5×7 font. Add it to `glyphs.mjs`, or use a plain ASCII
substitute.
