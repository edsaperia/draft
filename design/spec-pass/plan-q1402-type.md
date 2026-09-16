# Plan — Q1402: the document's type — a modular scale, and Charis SIL for the text

**Ruling (Ed, 2026-09-16, 09:05–09:20):** *I think I'd like to change the typographic scale in the document to the modular scale, and to use Charis SIL.* Then, to the six questions: **text, not chrome** — *my main priority is the text and headings in the document itself, and then I want everything else to be harmonious*; the text ratio is the builder's choice as recommended (a major second); **larger headings** — *in general I prefer larger headings in documents, it makes them easier to skim*; a committed Latin subset, self-hosted; small caps undecided (moot while the chrome stays sans); the measure and line-height re-measured to what the serif wants.

Precedence: SURFACE.md and CLAUDE.md's gotchas win where this plan disagrees. **Run after Q1401 (the Fluent glyphs) has merged** — both touch system.css and the same probes; a glyph's `1em` size follows the text it stands in, so this plan re-measures every glyph site once more.

## The decision in one table

Two families, two ratios, one base.

| | today | after |
|---|---|---|
| **text face** — the document's prose, the constitution's clause sentences, card bodies and rationales, option text, the records, the signatures | `system-ui` sans | **Charis SIL**, Regular · Italic · Bold · Bold Italic, self-hosted Latin subset |
| **chrome face** — the topbar, the rail, tabs, buttons, eyebrows, counts, the composer's controls, the alpha flag, the stagehand | `system-ui` sans | unchanged |
| **text ladder** (`--t-lead … --t-micro`) | 1.25 · 1 · 0.875 · 0.8125 · 0.72 · 0.65 rem | **major second, 1.125**: 1.266 · 1 · 0.889 · 0.79 · 0.702 · 0.624 rem — within a pixel of today at every step, so nothing visibly moves outside the document |
| **document headings** | title 1.25 rem 600; lvl1 **body size**, letter-spaced, ruled; lvl2 `--t-small`; lvl3 `--t-cap` muted | **perfect fourth, 1.333, on top of the body**: title 1.777 rem (`--h-title`), lvl1 1.333 rem (`--h1`), lvl2 1.125 rem (`--h2`, one major second up), lvl3 1 rem italic (`--h3`) — a real skimming ladder, in the text face, Regular weight for the two large steps (Charis Bold at 28px is heavy; size does the work) and Bold for lvl2 |
| **body line-height** in the text face | 1.5 | **1.55**, measured (Charis's x-height is large and its descenders long) |
| **measure** | 70ch | **re-measured to ~66 words-per-line-equivalent**: Charis's `0` is wider, so 70ch in it is ~10% more text; set `--measure` in the text face so a body line holds 60–70 characters as today's does, and state the number |

Everything on the text ladder that is *chrome* keeps the sans by the same tokens — the ladder is shared, the family is not. The tokens gain a family pair: `--font-text: 'Charis SIL', Charter, Georgia, serif` and `--font-ui: system-ui, …` (the current stack).

## Stage 0 — the fonts, subset and committed

- Source: SIL's Charis release (`https://github.com/silnrsi/font-charis/releases`, the latest `CharisSIL-<version>.zip`; four `.ttf` faces; licence **SIL OFL 1.1**). `scripts/charis-subset.mjs` (`npm run charis-subset`): downloads the release once into the scratchpad, subsets each face to **Latin + Latin-1 Supplement + Latin Extended-A + General Punctuation + the typographic quotes and dashes the surface uses (‘ ’ “ ” – — … ·) + the currency signs (£ € $)** with `subset-font` (harfbuzz in wasm — this machine has no python), keeping the OpenType features the plan uses (`kern`, `liga`, `onum`/`pnum`, `smcp`), and writes `design/fonts/CharisSIL-{Regular,Italic,Bold,BoldItalic}.woff2` beside `design/fonts/OFL.txt`. Committed, like the emoji table: the build never reaches the network. Report the four file sizes; the four together should be well under 400 KB.
- `.github/workflows/ci.yml` packs `design/*.woff2` at the top level only (the surface lane's `tar` line) — **extend the glob to `design/fonts/*.woff2` and `design/fonts/OFL.txt`**, and `packages/server/src/surface.ts`'s `SURFACE_NAME` allow-list if it is by extension or path (read it; a font the host refuses to serve is a silent fallback to Georgia). The `x-build` verification in `verify-deploy` should fetch one font and assert 200.
- `@font-face` ×4 in system.css, `font-display: swap`, `unicode-range` stating the subset. The page never waits on the font: swap is the rule, and the fallback stack is `Charter, Georgia, serif` — Charter is Charis's ancestor and metric-close, so the swap barely moves.

## Stage 1 — the tokens

- `--t-*` re-cut to the major second: `--t-lead: 1.266rem; --t-body: 1rem; --t-ui: 0.889rem; --t-small: 0.79rem; --t-cap: 0.702rem; --t-micro: 0.624rem`. Round to three decimals, comment each with the ratio's power.
- New: `--font-text`, `--font-ui`; `--h-title: 1.777rem; --h1: 1.333rem; --h2: 1.125rem; --h3: 1rem`; `--lh-text: 1.55`; `--measure` re-measured (stage 3).
- `body` keeps `--font-ui`; the text sites take `--font-text` by class, never by element, so a `<p>` in the rail stays sans.
- Guard: `spec-check` (it reads no sizes, but run it); `npm run card-audit` at 1600 and 390 against the pre-change payload (`--baseline`) — S1 (grid) findings must not grow; the sub-pixel drift of the re-cut is what the baseline comparison is for.

## Stage 2 — the document

- `.doc .prose`, `.lp`, `.doc p`, `p.bullet`, the constitution's `.cptext` and `.headrule`, the `.doctitle`, the `.docline` levels → `--font-text`, `--lh-text`.
- Headings: `.doctitle` at `--h-title` Regular; `.docline.lvl1` at `--h1` Regular, keeping its rule (`--head-rule`) and **dropping the letter-spacing** (a size ladder needs no tracking to say rank); `.lvl2` at `--h2` Bold; `.lvl3` at `--h3` Italic, `--fg` rather than muted (a heading a reader skims by must not be grey). Margins re-set on the spacing scale so the space above a heading is larger than the space below it.
- **Geometry that is coupled to the heading sizes, each re-measured, not assumed:**
  - the riding tab rests level with the document's first line (`rideLine`; SURFACE §9's 📝 row: *a tab is 30px and the title's line box is 30px, so flush tops centre one on the other*) — the title's line box is now `1.777rem × lh`; `rideLine` must measure the line box rather than assume 30px, or the tab takes its own offset;
  - `h2.docline .chipcol { top: … }` and `.lvl1 .chipcol { top: calc(var(--head-rule) + 0.15em) }` — the gutter tabs beside headings, re-centred on the new line boxes (card-audit P2/P7 will say);
  - the constitution band's paragraphs (`fitBand` measures, never constants — the *tab you click does not move* rule) and `#titlepara`'s tab (`fitTitleCard`);
  - the contents rail's marks (`toc-travel`) and the TOC's own text stays sans (chrome);
  - `edit-mode`'s lifted column and the caret pulse (`.caretpulse` height is `1em`-relative — check);
  - `fitStacks` and the P6 rule on your own row (the row's text is document text, so it is Charis now).
- Guard: `npm run card-audit` P2, P3, P6, P7, P10 clean at 1600 and 390; `npm run toc-travel`; `npm run probe` (both; the references re-freeze once, after the diffs are read as the font change and nothing else); `npm run journey`'s caret and proposal lines.

## Stage 3 — the measure and the line-height, measured

- With the font loaded, measure a body paragraph's characters per line at the 70ch measure (`design/tools/pic-measure.mjs` is the pattern for a headless measurement script; write `design/tools/type-measure.mjs`, printing characters per line, line box height, and the widths of the title and the four heading levels at 1600 and 390). Set `--measure` so a line holds what it holds today (state both numbers), and confirm `--lh-text: 1.55` puts the body's line box on the 4px grid or say why not.
- The phone (390): the document's headings must still fit — `--h-title` at 1.777rem is 28.4px, fine; check that a long title wraps and that `text-wrap: balance` still applies.

## Stage 4 — the cards' text

- Card bodies (`.why`, `.setnote` where it is a sentence), option text (`.opttext`, `.headrule`), rationales and the `sealed-speaker`'s words, the records (`.record`), the closing signatures, the mail modal **excluded** (another medium), the composer's lane (`.editlane`) — `--font-text`. Controls inside them — the radio (`.lanepick`), `.ctl` words (*Fixed*, *Never*, *Admit them*), buttons, the eyebrow — stay `--font-ui`: the T46 distinction (a control's own word is not clause text) is now a font distinction too, which is what *harmonious* means here.
- Charis has no 600: every `font-weight: 600` on a **text** element becomes 700 or 400 by a read of what the weight was for (a name in a sentence — Bold; a title-shaped thing — Regular at the next size). List each in the report. Chrome keeps its 600s.
- Guard: card-audit B1–B6 (the commit row's height is chrome and must not move), H2/H4 unchanged, S1 not grown; copy-check walk unchanged (no strings change).

## Stage 5 — what must not change

- The chrome: the topbar's height (state the number before and after), the rail's entries, the tabs (34×30), the buttons (2.5rem rows), the eyebrows, the alpha flag, the stagehand, the mail modal, the emoji picker.
- Every glyph (Q1401) takes `1em` of the text it stands in, so a glyph inside a Charis sentence grows with it — that is the design, not a defect; the glyph *sites* that state a size (tab, socket, commit button) are chrome and unchanged.
- No string changes; `copy.js` untouched.

## Stage 6 — the documents

- CLAUDE.md: the `type scale` entry — the ratio, the two families, the heading ladder; a new `text face` [concept] line; the *glyph size is the one allowed literal* rule survives.
- SURFACE §9's 📝 row (the riding tab's alignment is measured, not 30px); §6 unchanged.
- STYLE.md: nothing (no copy changes) — unless small caps are adopted later (Q1402 (5), Ed: *not sure*).
- DECISIONS: a Q1402 section — the two ratios and why, the pairing and why the chrome stayed sans (weight, small sizes, the text/control distinction), the measured numbers, the subset's ranges and sizes, the OFL notice's home.
- QUESTIONS: 1402 leaves Spent numbers for DECISIONS once folded; (5) small caps stays an open item if Ed has not ruled.

## Acceptance

1. `npm run charis-subset` regenerates the four woff2 byte-identically from the committed release version; sizes reported.
2. The live host serves `design/fonts/*.woff2` (a surface push's tar carries them; `verify-deploy` fetches one).
3. `type-measure` output at 1600 and 390 in the report: characters per line before and after, the title's and each heading's line box, the topbar height before and after (unchanged).
4. Both probes IDENTICAL after one re-freeze; `card-audit` at 1600 and 390 with `--baseline`: nothing new in P, B, V, H; S1 not grown.
5. `journey`, `after-begin-walk`, `applicants-walk`, `toc-travel`, `drawer-walk`, `founder-answers`, `seat-matrix --hat=both` green; `spec-check`, `copy-check` (both), `clock-check`, `lint`, `typecheck`, `npm test`.
6. Screenshots at 1600 and 390: the document's first screen (title, a heading, a paragraph, a bullet), an open decision card with its commit row, your own row's stack — for Ed's read.

## Working notes for the builder

- A worktree by hand (`git worktree add ../draft-wt-q1402 -b q1402` **from main after Q1401 has merged**; `npm ci`); never `git stash`; commit each stage; the Edit tool, never `sed -i` (CRLF); `grep -a` on session-view.html; re-read a long shared file immediately before editing it.
- The fonts and the subsetter need the network once; commit the outputs, never a fetch at build.
- A walk server: `PORT=<p> DRAFT_BASE_URL=http://127.0.0.1:<p> DRAFT_DATA_DIR=<fresh> npm run server`, ports 8240+, one walk at a time, logs to files; kill by port at the end.
- Never push, never merge to main; report overrulable choices numbered — the weight reads of stage 4 especially, and the measured numbers of stage 3.
