<h1 align="center">Hi, I'm George 👋</h1>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/gogeorge/gogeorge/main/assets/github-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/gogeorge/gogeorge/main/assets/github-light.svg">
    <img alt="George's GitHub profile card: identicon, bio, follower and star counts, most-used languages, a contribution graph and recent activity — rendered in GitHub's own UI style." src="https://raw.githubusercontent.com/gogeorge/gogeorge/main/assets/github-dark.svg" width="100%">
  </picture>
</p>

<p align="center">
  <em>Rebuilt from my live GitHub stats every morning at 06:00 UTC.</em>
</p>

---

<details>
<summary><b>How this card works</b></summary>

<br>

The card above isn't a screenshot of GitHub — it's a single SVG drawn to look
like GitHub drew it. The idea was simple: *if GitHub shipped a profile-stats
README, what would it look like?* So the whole thing is built from GitHub's own
design language — the [Primer](https://primer.style) colour tokens, GitHub's
system font stack, its [octicons](https://primer.style/foundations/icons) and
the language bar.

A few notes on how it's put together:

**It's one self-contained SVG per theme.** A GitHub README strips `<style>`,
`<script>` and `class` attributes, and an `<img>`-embedded SVG can't load web
fonts or external assets. So everything is inline: geometry, colours, icon
paths, text. The `<picture>` element in the README serves `github-dark.svg` or
`github-light.svg` depending on whether the visitor has GitHub in dark or light
mode — the two files use the exact Primer palette for each.

**The text is real text, in GitHub's font.** Web fonts don't load inside a
README SVG, but the *viewer's* font stack does — and GitHub renders its UI in
that same system stack. So the card uses real `<text>` in
`-apple-system, BlinkMacSystemFont, "Segoe UI"…`, which is what you're already
looking at everywhere else on the page.

**No avatar, no calendar — they'd just duplicate the profile page.** Instead of
re-drawing what GitHub already shows above the card, the big slot holds a
*"when you commit"* clock: a 24-hour radial dial of the hour each commit is
authored, with a night-owl / early-bird verdict. The hours come from the
timestamps on your public commits (which carry your own timezone offset), so
it's an approximation drawn from a sample, not a census — the count it was built
from is printed on the panel.

**It stays static.** An `<img>`-embedded SVG rasterises as a single texture, so
anything that animates repaints the whole card. This one doesn't move at all —
which keeps it cheap and reads exactly like the rest of a GitHub page.

| | |
|---|---|
| `content.json` | Your name, bio, focus tags and the "working on / up next" notes. Edit this, not the code. |
| `scripts/lib/data.mjs` | GitHub API → the numbers, including commit-hour buckets. Degrades to public data, then to demo data. |
| `scripts/lib/render.mjs` | The card layout — every section is a function here. |
| `scripts/lib/insights.mjs` | The "when you commit" clock. |
| `scripts/lib/theme.mjs` | GitHub's Primer tokens, dark and light. |
| `.github/workflows/refresh.yml` | Redraws and commits both themes daily. |

**Want one on your own profile?** [SETUP.md](SETUP.md) walks through it — about
ten minutes, no dependencies to install.

</details>
