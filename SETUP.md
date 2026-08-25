# Build your own

How to put this profile card on your own GitHub profile. Takes about ten minutes.

You'll end up with a self-contained SVG — one for dark mode, one for light —
that redraws itself every morning with your real GitHub stats, committed
straight into your profile repo. It's styled entirely from GitHub's own design
language, so it reads as a slice of the real UI.

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
.github/workflows/refresh.yml
```

Drop them into your profile repo, keeping the folder structure. You do **not**
need `assets/` — that's generated output, and yours will be rebuilt in step 3.

## 2. Make it yours

Open `content.json`. This is the only file you edit routinely.

```jsonc
{
  "handle": "octocat",                 // your GitHub username — also used to fetch your stats
  "name": "The Octocat",               // display name in the header (optional; defaults to your GitHub name)
  "bio": "Building things at GitHub.", // one line under your name, ~104 chars
  "focus": ["open source", "APIs"],    // up to five topic pills
  "now":  ["Shipping the v2 API"],     // "Currently" list — up to four lines
  "next": ["A public changelog"]       // "Up next" list — up to four lines
}
```

Everything else on the card — repositories, followers, stars, most-used
languages and the "when you commit" clock — is pulled live from the GitHub API,
so there's nothing to type by hand.

## 3. Render it

```bash
npm run build
```

That writes `assets/github-dark.svg` and `assets/github-light.svg`. Open either
in a browser to check it.

Unauthenticated, GitHub's API only gives you public data and the contribution
graph will be sparse. To see the real thing locally, put a token in a `.env`
file at the repo root:

```
GH_TOKEN=ghp_your_token_here
```

`.env` is gitignored. See step 5 for how to create the token.

## 4. Point the README at your repo

In your `README.md`, embed the card. Replace **`octocat/octocat`** with your
own `username/repo` in all three URLs:

```html
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/octocat/octocat/main/assets/github-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/octocat/octocat/main/assets/github-light.svg">
    <img alt="My GitHub profile card" src="https://raw.githubusercontent.com/octocat/octocat/main/assets/github-dark.svg" width="100%">
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
git commit -m "Add GitHub profile card"
git push
```

Then open the **Actions** tab, pick **Refresh profile card**, and hit **Run
workflow** to render it immediately rather than waiting for the 06:00 UTC
schedule.

---

## Customising further

**Colours.** `scripts/lib/theme.mjs` holds GitHub's Primer tokens for dark and
light. They're GitHub's real values, so there's rarely a reason to touch them.
The `levels` array is GitHub's green contribution scale, reused to shade the
commit-clock spokes.

**Layout.** `scripts/lib/render.mjs` is where the card is drawn. Each section —
header, counters, languages, the "when you commit" clock, working-on notes — is its own
function, laid out top-to-bottom with a running `y` cursor, so you can reorder,
resize or drop a section without touching the others. Text `y` is the baseline.

**The commit clock.** `scripts/lib/insights.mjs` draws the 24-hour dial. The hour
buckets come from `commitHours()` in `data.mjs`, which reads timestamps off your
public commits — so the more public commit history you have, the more it has to
work with. The panel prints its sample size so a thin dial reads as honest.

**Language colours.** `scripts/lib/langs.mjs` mirrors GitHub Linguist's palette.
Add an entry for any language it's missing; unknowns fall back to a neutral grey.

**Icons.** `scripts/lib/icons.mjs` holds the octicon path data. Paste any icon
from [primer/octicons](https://primer.style/foundations/icons) (the 16px
variant) to add one.

### One rule if you add motion

A browser rasterises an `<img>`-embedded SVG as a single texture, so *any*
change anywhere redraws the whole image. The card is deliberately static. If you
add an animation, make it finite and `fill="freeze"` — a looping animation
repaints the entire card forever and can pin a CPU core.

---

## Troubleshooting

**The image on my profile is stale.**
GitHub proxies and caches images through camo. A refresh usually shows up within
minutes, but it can lag. Confirm the SVG in the repo actually changed first — if
the workflow logged "No change", the data genuinely didn't move.

**Contributions and the streak read low.**
The `GH_PAT` secret is missing, expired, or lacks `read:user`. Without it the
totals come from public events instead of the real contribution calendar. Check
the workflow log: it prints `data source: graphql` when the token worked, and
`data source: events` when it fell back.

**The commit clock looks sparse.**
It's built from the timestamps on your public commits, capped at a few of your
most recently pushed repos. If most of your work is private or squashed by a bot,
there simply aren't many public timestamps to plot — the sample size next to the
dial tells you how many it found.

**The workflow fails on `git push`.**
Workflow permissions are still read-only. See step 6.

**The "working on" section is empty.**
It reads the `now` and `next` arrays from `content.json`. Add a few short lines
to each — this block is written by you, not fetched.

**A language or icon is missing.**
Add the language to `scripts/lib/langs.mjs` or the octicon to
`scripts/lib/icons.mjs`, then rebuild.
