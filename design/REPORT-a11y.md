# REPORT-a11y.md — the first accessibility audit

Findings from the accessibility pass of **2026-09-16**, against `fba9d3e`.
Reproduced by `npm run a11y-audit` and `npm run a11y-audit:narrow`.

PRODUCTION.md **stage 13** has read *not started — no audit has run; nothing
in the tree names one* since the stage table was written on 2026-08-20. This
is the measurement that sentence was waiting for. It is **not the stage's plan
document**, which Ed ruled (Q1255) is owed in `design/MOBILE.md`'s shape when
the stage is *scheduled*; it is the evidence such a plan would have to be
built on, and the questions it raises are **Q1394–Q1398**.

**Precedence.** SURFACE.md and STYLE.md win over this file on what the surface
says and does; SPEC.md wins over everything. Nothing here is a ruling — every
row is a surface decision, and three of them move a frozen reference, so the
audit **measured and changed nothing**. That is the same contract `card-audit`
keeps, and for the same reason.

## What was measured

`design/tools/a11y-audit.mjs`, two instruments divided by what each can see:

- **axe-core 4.13** (MPL-2.0, a devDependency, injected into the page) owns the
  standard sweep — contrast, roles, labels, landmarks. Run with `wcag2a`,
  `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice` and
  `experimental`, the last being where `target-size` lives.
- **Twelve hand probes (A1–A16)** own the half axe cannot see, because each is
  a fact about *this* surface: a name that is a glyph, a radiogroup whose
  options are identical by design (CP1), a control the page invents with a
  pointer cursor, a commit that is only ever a held pointer. **A16 is driven
  rather than read** — it opens a card with the Enter key and commits a
  judgment with the Enter key, and asks after each what holds focus, which no
  static read of the DOM can answer.

Four epochs, each with its 48 cards opened one at a time and read inside its
own box: **birth** (`/session-view.html`), **session**, **band** and **closed**
(the `fixture=session` payloads). Two window sizes, 1600×1000 and 390×844 —
`card-audit`'s own discipline, because a finding that moves with the viewport
is a layout fact and not a defect. And **both positions of SURFACE §7.2's
commit-gesture switch**, since the shipped position is *click* and the
documented alternative is *hold*, where a keyboard has no equivalent gesture
(`--gesture=hold`, the page's own `?gesture=hold`).

| | 1600×1000 | 390×844 |
|---|---|---|
| distinct hand findings | 44 | 50 |
| sightings | 873 | 739 |
| axe rules violated | 6 | 5 |
| axe nodes | 108 | 82 |
| tab stops, session | 189 | 147 |
| controls, session | 206 | 162 |

**Two instruments agreeing is the load-bearing part.** axe found
`html-has-lang`, `target-size`, `page-has-heading-one` and `region`
independently of A15, A4, A10 and A9 — four findings confirmed twice by
different code. Where only one of them speaks, the row says so.

One caveat on the numbers: this run used Chromium 141 (the revision available
in the session's environment), not the 151 the tree pins. Geometry is
therefore reported to the nearest pixel of intent — *23.55px, short of 24* —
rather than as an exact figure to freeze.

## The findings

Ordered by what a person using the product would hit first, not by count.

### 1 · The page has no `<html>` element, so it declares no language — Q1394

**WCAG 3.1.1 Language of Page, Level A**, and the only Level-A failure in the
audit. `design/session-view.html` opens at `<meta charset="utf-8">`: there is
no doctype, no `<html>`, no `<head>` and no `<body>`, and the browser's implied
structure carries the page. A screen reader therefore has nothing to pick a
voice from and reads English copy in whatever the user's default is.

- Seen by both instruments: A15, and axe `html-has-lang` (serious, 4 nodes,
  every epoch).
- Evidence: `design/session-view.html:1`.
- The fix is one line and touches no rendered byte, so it moves no frozen
  reference — the cheapest row in this file.

### 2 · A judgment's two options have one name, and are not a group — Q1395

**79 sightings on 27 cards** — every judgment card the charter serves. This is
the control the whole product turns on, and it is the audit's worst row.

A decision card's lanes are three `<button class="lanepick">` elements. They
carry **no `role`**, they sit in **no `radiogroup`** — there is not one
`[role="radiogroup"]` anywhere on the charter; the twelve in `band.js` and six
in `setup.js` are the founder's setting cards — and what a screen reader reads
off them is:

```
button  "Prefer this Preferred"
button  "Prefer this Preferred"
button  "Indifferent Indifferent"
```

Three things are wrong at once, and they compound.

1. **The two rival wordings have the same name.** This is CP1 working exactly
   as designed — *the option's name lives on the block, not the button*, which
   CLAUDE.md already names as the gotcha that broke `journey`'s three label
   helpers and would have broken `slider-walk`'s rung reader. A sighted member
   reads the wording in the `.opttext` beside the radio. A screen-reader member
   moving button to button hears the same four words twice and has no way to
   tell which wording they are about to prefer.
2. **They are not a group**, so nothing says *one of three*, nothing says which
   is chosen, and arrow keys do not move between them.
3. **The name carries both states at once.** *"Prefer thisPreferred"* is the
   resting label and the selected label concatenated: both are in the DOM and
   CSS shows one. So the name says the option is preferred whether or not it is.

The fix is not to rename the buttons — the visual design is ruled and CP1 is
load-bearing. It is that the *block* is the accessible name: an
`aria-labelledby` pointing at the `.opttext`, a `radiogroup` around the lane
bar, `role="radio"` with `aria-checked`, and the selected-state word out of the
name. That is markup, not copy, and it moves a frozen reference.

- Seen by: A6 only, and **only after the probe was corrected** — see *What was
  looked for and not found*.
- Evidence: `design/cards.js`, the `option-block` renderer; SURFACE §9.3, CP1,
  CP2; `design/session.js` `.lanebar`.

### 3 · Every act drops the keyboard at the top of the page — Q1397

Driven, not read, and the same answer six times out of six.

| the act | where focus lands |
|---|---|
| Enter on a clause tab, opening its card | `<body>` — 3 of 3 cards |
| Enter on an enabled ✓, committing a judgment | `<body>` — 3 of 3 cards |

A decision card **replaces its own paragraph** when it opens and **runs its
whole box back onto that paragraph** when it closes — the two motions the
surface is proudest of, and both of them destroy the element the keyboard was
standing on. Nothing catches it, so focus resets to the document.

What that costs a keyboard user is the whole product. The tab they pressed is
somewhere in the middle of a long charter; after one judgment they are back at
the top of the page with 189 tab stops between them and the next question.
Casting a second vote means tabbing there again. Casting ten is not credible.

The good news in the same measurement, and the reason this row is *focus* and
not *reachability*: **the ✓ is properly focusable and Enter does commit it**,
in both gesture positions — the card closed and the judgment landed each time.
The act works. It is only the aftermath that is unhandled, which makes this a
smaller fix than it reads: hand focus to the entry the card collapsed into, or
to the clause's tab, at both ends.

- Seen by: A16, which is new in this audit and exists because of this row.
- Related: SURFACE C1–C5 and L1–L9 govern what opens and closes a card and
  what it focuses. Whether *what it focuses* has ever meant the keyboard is
  the question.

### 4 · Nothing on the page announces itself — Q1396

There is **no `aria-live`, `role="status"`, `role="alert"` or `role="log"`
anywhere on the surface** — zero across all four epochs (`grep -c aria-live`
over `design/*.js` and `design/*.html` agrees: nothing).

This matters more here than it would on most pages, because arriving-without-
being-asked-for is the product. The live path re-hydrates on a **4 s poll**
(`remoteCS`), the rail is rebuilt wholesale on every render, and the whole
design of the `needs-you-queue` is that a task *appears* beside its clause. A
member using a screen reader is told none of it: a question addressed to them
lands silently, and they learn about it by tabbing the page again.

Four things change under the reader and none of them speaks: a new rail entry,
a mark changing state (SURFACE §6), the `stalled` flag, and the maintenance
modal an `announced-pause` draws.

- Seen by: A8 only — axe cannot find an absence.
- Deliberately *not* a finding: `room-pulse` is content-free by design
  (SPEC §3.5), and should stay silent.

### 5 · The glyph is the name — Q1395

Where the surface shows a picture, the picture is the whole of what a screen
reader has to say. **76 sightings on 26 cards** for the discard 🗑️ alone.

| what a reader hears | the control | where |
|---|---|---|
| "wastebasket" | discard | `button.btn.glyphbtn[data-act="clear-close"]`, the commit row |
| "wastebasket" | withdraw a proposal | `[data-act="draft-withdraw"]`, `[data-act="draft-cancel"]` |
| "pencil" | propose | `[data-act="draft-propose"]`, `[data-act="draft-remake"]` |
| "snowflake" | chill | `[data-act="chill"]` |
| "memo" | the edit door | `[data-act="edit-door"]` (`#editdoor`) |
| "black nib" / "shield" | the founder's two powers | `#penwallet`, `#shieldwallet` |
| "classical building" | the 🏛️ wallet | `#voicewallet` |
| "feather" | home | `a#quill` |
| "black right-pointing small triangle" | the fold | `button.sectoggle` |
| "counterclockwise arrows" | a shifted mark | `span.achip` |
| **"8"** | the task drawer, phone only | `button.drawerbtn.asks` — the name is the bare count |

This is not an accident and the audit does not treat it as one: the surface's
vocabulary **is** glyphic by ruling — the kind pair ✏️/🏛️ is glyphic
deliberately, and *"ordinary" never appears on the surface*. The question is
narrower than "label the buttons": **an `aria-label` is a string a member
reads**, so by CLAUDE.md's own rule it belongs in `design/copy.js` and passes
STYLE.md's T1–T49 like every other string. That makes this a copy decision with
a copy owner, not a markup chore — and it is the single largest body of
member-readable text the surface has never written.

`a#quill`'s name at the birth is `🪶🪶🪶🪶` — the glyph repeated, which is the
wallet's count bleeding into the link's text content.

### 6 · What the keyboard cannot reach — Q1397

Three groups, and only the first is clearly a defect.

**(a) The wallets are not focusable.** `#wallet`, `#penwallet`, `#shieldwallet`
and `#voicewallet` carry no `tabindex` and are not natively focusable, on every
epoch including the birth. They are controls — a hold starts on them and a
glyph flies from them — and the keyboard cannot start one.

- Evidence: `design/wallets.js`, the socket renderers; A3, 9 sightings.

**(b) The tabs behind the front of a stack are `aria-hidden`.** 143 sightings.
`design/session.js:2969` reads `(behind ? ' aria-hidden="true"' : ' role="button"
tabindex="0"')`, so in a `tab-stack` only the front tab is in the accessibility
tree at all. Each tab behind it is a *different decision* on the same clause.

This may well be right: the rail carries an entry for every one of them
(M1–M6), so no decision is unreachable — only unreachable *from the document*.
Naming it because the reasoning is not written down anywhere, and the pile is
the one place the surface stacks distinct decisions into one visual object.

**(c) A decided tab is in the focus order with no role.** `design/session.js:3104`
and `:3163` emit `<span class="achip" tabindex="0" …>` — tabindex, no
`role="button"` — where the live tab twelve lines away at `:2969` emits
`role="button" tabindex="0"`. A one-token drift between two sites that build
the same object.

- Seen by: axe `focus-order-semantics` (minor, 26 nodes) — the one row axe
  found that no hand probe did.

Not findings, checked and cleared: `disabled` controls are correctly out of the
focus order (the ✓ greyed until something is chosen, SURFACE §9.1, and a closed
document taking no edit, which `powers-walk` asserts) — 88 sightings of correct
behaviour, excluded by name rather than left to read as defects.

### 7 · The near-misses — Q1398

Two rows that fail by a margin small enough to be invisible and large enough to
be a failure.

**`--muted` is 4.44:1 where AA asks 4.5.** `design/system.css:42` sets
`--muted: #6C757D`; on the page's `#f8f9fa` ground that is **4.44**, short by
0.06. It is the topbar's own colour, so what it costs is `#titletext`, `#clock`
and `#quorum` — the document's name, the session clock and the quorum readout,
which is to say every standing fact the topbar exists to state. 30 axe nodes at
1600, 37 at 390.

- **WCAG 1.4.3 Contrast (Minimum), Level AA.** A single token, one shade
  darker, clears it everywhere at once; the palette is Ed's.

**Targets under 24×24** (WCAG 2.2 SC 2.5.8, Level AA — the audit reports raw
boxes and does not apply the standard's spacing exceptions, so some of these
are excused by it):

| control | shortest side | where |
|---|---|---|
| contents-rail anchors | 21.53 / 23.55px | `ul#toc > li.lvl1..lvl3 > a` |
| `button.lanepropose` | 23.27px | the lane bar, 27 cards |
| `button.sectoggle` | 13.78px | the fold triangle |
| `button#clock` | 19.5px | the session clock |
| **wallet sockets, phone** | **14px** | `span.wallet`, at 390 only |
| **task drawer ☰, phone** | **18px** | `button.drawerbtn` |
| `a#quill`, phone | 18px | the brand |

The desktop rows miss by under three pixels. **The phone rows do not**, and
they are the ones `design/MOBILE.md` already expects: its *Status* section
records that the two-tap and tap targets are not built. A 14px socket is the
smallest target on the product.

### 8 · Structure — Q1394

Three rows, all confirmed by both instruments, all cheap.

- **No `h1` in the accessibility tree on the session, band and closed epochs.**
  `h1#doctitle` exists in the markup but the first *visible* heading is
  `h2#sec-0` (or `h2#dochead`). axe: `page-has-heading-one`, moderate, 3 nodes.
  A10 says the same.
- **Content outside landmarks.** No `main`, `nav`, `header`, `footer` or
  `aside` element or role reaches the audit on any epoch, so a reader has no
  structure to navigate a three-column page by. axe `region`, moderate, 12
  nodes; A9 agrees. Three of the twelve nodes are the stagehand's furniture
  (`#devwho`, `.alphaflag`) and are not product.
- **`contenteditable` with no name and no role**, 4 sightings: `div#prose` —
  the charter column the founder writes the document into — and the composer's
  `.editlane`. A reader lands in an editable region that does not say what it
  is or what it is for.

## What was looked for and not found

Stated so the silence is worth something, which is the seat matrix's own rule.

- **The hold gesture was reached, and the news is mostly good** (A14). The
  first run of this audit could not answer the question — SURFACE §7.2's switch
  is on *click*, so nothing was held and the probe reported an empty list,
  which is *not asked* wearing the clothes of *nothing wrong*. The audit now
  takes `--gesture=hold` and drives the page's own `?gesture=hold`. At that
  position: **the ✓ is still focusable and Enter still commits it** — the same
  6-of-6 result as under click — because `submit` goes through the click path
  in both positions.

  The exception, established by reading rather than by driving: **`draft-propose`
  returns early under hold** (`design/session.js:3520`, *held, not clicked*) and
  the hold itself is driven by document-level `pointerdown` / `pointerup`
  (`:2823`, `:2839`), with no `keydown` bound anywhere for it. The only keydown
  handlers on the surface are the lane chooser's Enter/Space (`:3499`),
  edit-mode's, and the wallet's Escape. So under the hold gesture a keyboard
  user can **choose** an option and cannot **spend** one. It could not be
  driven to prove it, because the fixture has no enabled `draft-propose` on any
  of its 48 cards — every one is greyed for want of a choice. **The switch is
  an accessibility switch as well as a design one**, and that is worth knowing
  before the trial (backlog 184) is ever flipped.
- **A6 came back empty on its first run, and the emptiness was the bug.** The
  probe asked `[role="radiogroup"], fieldset` for its options, found none on
  any epoch, and reported nothing — which reads in a summary line as *the
  surface is clear*. It was the opposite: there is no `radiogroup` on the
  charter to ask, which is finding 2 above. Asking the card for its options
  instead turned one silent row into 79 sightings on 27 cards.

  Recorded here rather than quietly fixed, because it is the failure mode this
  whole audit is most exposed to and the one a reader should distrust it for:
  **a probe that asks for the thing it is checking is absent by definition
  whenever the thing is missing.** Every null result below is stated with what
  was asked, so the next reader can tell a clear surface from an unasked
  question.
- **No inline drawing was found bare** (A7, asked of every `svg` on the page):
  every one the lifecycle marks emit since Q1360 carries `aria-hidden` or a
  name.
- **A focus ring is drawn** (A12, asked of every rule in every stylesheet):
  eight `:focus-visible` rules across `system.css` and `setup.css`, including
  `.achip:focus-visible` — which is itself the evidence that a clause tab is
  *meant* to be reachable.
- **No heading level is stepped over** within any epoch (A10, asked of every
  visible `h1`–`h6` in document order). Only the missing `h1` fires.

## Reproducing

```
npm run a11y-audit                 # the four epochs at 1600×1000, every card
npm run a11y-audit:narrow          # the same at 390×844
npm run a11y-audit -- --gesture=hold          # the other position of §7.2's switch
npm run a11y-audit -- --scene=session --cards=0
npm run a11y-audit -- --json       # the payload on stdout
```

The payload is gitignored, as `card-audit`'s and the seat matrix's are: a run
is measurements, the artifact is this file. `axe-core` is optional — without it
the eleven hand probes still run and the script says so on its first line.
