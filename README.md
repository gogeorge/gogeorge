<h1 align="center">Hi there, I'm George 👋</h1>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/gogeorge/gogeorge/main/assets/ds-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/gogeorge/gogeorge/main/assets/ds-light.svg">
    <img alt="A handheld console rendered in SVG. The top screen shows what George is working on; the bottom screen shows GitHub stats, top languages, a contribution graph and the latest commit." src="https://raw.githubusercontent.com/gogeorge/gogeorge/main/assets/ds-dark.svg" width="100%">
  </picture>
</p>

<p align="center">
  <em>🔋 Batteries included. Screens refresh every morning at 06:00 UTC.</em>
</p>

---

### 🎨 Creative Developer & Researcher

- Developer by day, designer by night
- Currently studying International Business Management
- **🔭 Researching:** Language, CNF, and how they can be applied to LLM system prompts
- **👯 Collaboration:** Actively looking to contribute to open-source projects involving UI components
- **💼 Work:** Open for remote work and freelancing

---

<details>
<summary><b>🕹️ How the console works</b></summary>

<br>

GitHub strips `<style>`, `<script>` and `class` attributes out of every README, so
the usual answer — build it in CSS — is off the table. But an SVG loaded through
an `<img>` renders as its own little document, and **SMIL animation inside that
document still runs**. So the whole handheld is one self-contained SVG file:
shell, buttons, hinge, both screens, every animation.

Two details worth stealing:

**The text is a real bitmap font.** Web fonts don't load inside a README-embedded
SVG, and system fonts render differently on every machine. So `scripts/lib/glyphs.mjs`
defines a 5×7 pixel font by hand, each glyph compiled to an SVG `<path>` in `<defs>`
and stamped out with `<use>`. Genuinely pixelated, identical for everyone, and
cheap enough that ~700 characters of text costs about 30 KB.

**Every animation is discrete.** A browser rasterises an embedded SVG as one
texture, so anything that moves continuously — a crossfade, a sweeping second
hand — redraws the entire console 60 times a second. An early version made
laptop fans audible. Now the second hand *ticks*, panels snap, and the whole
thing repaints about once a second. It reads as more of a real handheld, not
less. There are no filters either: the shadow is three offset rectangles,
because `feDropShadow` recomputes a full-canvas blur on every repaint.

**Nothing renders from empty.** Bars are drawn at their final width and the
first slot of each rotation starts visible, so if animation is stripped or the
image is captured as a still, the screens read as finished rather than blank.

Five shell colours (`lime`, `noir`, `snow`, `cobalt`, `coral`), two avatars, and
screens that follow whichever theme the visitor has GitHub set to — so a black
console can show a light UI, or a white one a dark UI. All of it is two lines in
`content.json`.

| | |
|---|---|
| `content.json` | Everything the top screen says. Edit this, not the code. |
| `scripts/lib/glyphs.mjs` | The 5×7 font, as ASCII art. |
| `scripts/lib/sprites.mjs` | The avatars, same idea at 24×24. |
| `scripts/lib/ds.mjs` | Shell geometry and both screen layouts. |
| `scripts/lib/data.mjs` | GitHub API → numbers. Degrades to public data, then to demo data. |
| `.github/workflows/refresh-ds.yml` | Redraws and commits both themes daily. |

**Want one on your own profile?** [SETUP.md](SETUP.md) walks through it — about
ten minutes, no dependencies to install.

</details>
