# Checks — today's page against the prototype (Q1541; v2, the revision pass)

Measured 2026-09-25 by `tools/grammar-audit.mjs` (a copy of `inventory-audit.mjs`, itself a copy of `design/tools/card-audit.mjs`, with grammar.md §5's checks added — **v2 adds six**). Every check is **DOM-generic**: it reads today's page and the prototype by the same rules, so the columns are comparable. Nine walks each (founding, answers, delegated, settled, outsiders, charter, closed, sessionband, closedband), 352 card openings per run, at 1600×1000 and 390×844. **This file supersedes the stage-5 version**: the prototype measured here is v2 (grammar.md v2), and today's page was re-measured with the v2 checks, so both columns come from the same instrument on the same day.

Reproduce:

- `node design/proposal/tools/grammar-audit.mjs --page=session-view.html` (`--width=390 --height=844` for the phone) — today, label `today`;
- `node design/proposal/tools/grammar-audit.mjs --page=proposal/proto/session-view.html --label=pshot --shots --hide=#gnote` (and at 390) — the prototype, with the crops `mockups.html` shows;
- `node design/proposal/tools/checks-table.mjs --proto=pshot` prints the table and examples from `data/grammar-{today,pshot}-{1600,390}.json` (gitignored).

**One splice, said.** The first final run found the 👑 card throwing — its note read a copy key from the wrong table (`PAGE_COPY` for `COPY.session`) — so the settled and outsiders walks were re-run after the fix and spliced into the payloads by `tools/merge-walks.mjs`, which takes every card, finding and reading of the re-run walks from the re-run and recounts the table. The other seven walks are the first run's. Nothing else was spliced.

The prototype is at `/proposal/proto/session-view.html` under `npm run design` (`?fixture=session`, `&band=1`, `&closed=1`, none for the founding).

## The table

Findings (cards affected).

| check | holds | today 1600 | **proto v2 1600** | today 390 | **proto v2 390** | proto v1 (stage 5, 1600) |
|---|---|---|---|---|---|---|
| still (2D) | P2, G1 | 185 (122) | **52 (50)** | 185 (122) | **52 (50)** | 52 (50) |
| head-registration | P1, S2 | 242 (172) | **57 (39)** | 242 (172) | **57 (39)** | 64 (44) |
| head-form | G2, L2 | 102 (102) | **0** | 102 (102) | **0** | 0 |
| hairline-gap | P6, H1 | 24 (24) | **0** | 24 (24) | **0** | 1 (1) |
| empty-slot | P6, L1 | 232 (129) | **0** | 232 (129) | **0** | 4 (2) |
| no-job | P5, J1 | 193 (121) | **0** | 193 (121) | **0** | 0 |
| bin-job | P5, J2 | 216 (216) | **13 (13)** | 216 (216) | **13 (13)** | 13 (13) |
| row-vocabulary | P8 | 119 (119) | **0** | 119 (119) | **0** | 0 |
| closed-page | P4 | 268 (76) | **0** | 210 (76) | **0** | 0 |
| raw-value | P4, S1 | 0 | 0 | 0 | 0 | 0 |
| zone-overlap (v2: overlays judged by the text they cover) | G4 v2 | 2 (2) | **1 (1)** | 1 (1) | **0** | 3 (3), v1's rule |
| role-drawing | P7, R1 | 84 (84) | **0** | 84 (84) | **0** | 0 |
| **label-slot** (v2) | P9, §2.3a | 102 (81) | **0** | 102 (81) | **0** | not measured |
| **note-visible** (v2) | P5, P8 | 107 (105) | **0** | 107 (105) | **0** | not measured |
| **closed-keeps-content** (v2) | P4 v2 | 31 (31) | **0** | 31 (31) | **0** | not measured |
| **closed-tense** (v2) | P4 v2 | 10 (10) | **0** | 10 (10) | **0** | not measured |
| **top-edge** (v2) | P2, G5 | 120 (120) | **0** | 141 (141) | **0** | not measured |
| **strip-blank** (v2) | P6, G6 | 30 (30) | **0** | 24 (24) | **0** | not measured |

The v1 column is stage 5's (the previous version of this file), kept so the table shows what the revision changed. The six new checks were not run on the v1 prototype; the critique and the mockups' amber notes are the evidence of what v1 failed on them (a cut-off race opening to its clause alone, labels in four places, a dark commit's reason in a tooltip, the power line on a closed document, 80–110 px of blank white).

Row shapes (1600): today — commit 155, absent 44, pair 14, acknowledge 14, withdraw 6, plus 119 rows in none of the six; prototype v2 — commit 148, absent 171, pair 14, acknowledge 9, accept 6, withdraw 4, and no row outside the six.

## The six v2 checks: what they assert, what today fails

- **label-slot** (§2.3a): every head on a card that draws a block has a label above its first line; every block with no live control has a label as its first line (or a label drawn directly above it); no label stands below its block's first line. Today, 102: **63 heads with no label beside blocks** — the settled band cards, whose standing block carried a provenance radio instead (e.g. *settled·title*, *settled·admission*) — and **39 blocks with neither control nor label**: the locked 🎩's greyed rungs, the second of two rivals sharing one *Proposed* label, the 👑 card's first pick. The prototype: 0.
- **note-visible** (P5 v2, P8 v2): every dark commit on a live card has its reason as visible text in the row, and no commit is lit over an empty address box. Today, 107: **100 rows whose dark commits explain themselves only in a tooltip** (a phone has none — *founding·title*, *settled·title*'s ✒️ ✏️), and **7 lit ✒️ over ✉️'s empty box**. The prototype: 0 — every such row prints *Choose one first*, *Give it a name first*, *✒️ Type an address first · 🏛️ One 🏛️ each — withdraw yours first*.
- **closed-keeps-content** (P4 v2): on the closed page, every card that raced (a charter race, a patch, a motion) still draws what was in flight, and says the close cut it off. Today, 31: all *unsaid* — today keeps the proposals (with live-looking radios, which `closed-page` counts) but nothing says they were undecided at the close. v1 of the prototype would have failed *lost* on these same cards (critique 2). The prototype: 0 — each carries *Undecided when the document closed*, its proposals labelled, no control.
- **closed-tense** (P4 v2): on a closed document no card claims a power of the Founder's in the present. Today, 10: the closed ✒️ 🛡️ cards (*closedband·pw:u:title — The Founder may amend the title at will*). The prototype: 0 — settings heads drop the power line (P3 v2) and power cards read *Until the document closed, the Founder could …*. (A rule's own *any member may* is the document's words and is not counted.)
- **top-edge** (G5): the open card's top edge never covers the ink of the line above its anchor, and its head label clears that ink. Today, 120 at 1600 and 141 at 390: today's cards rise over the paragraph above (*founding·invite* by 10 px — the 📍-over-🪶 class the critique found in v1, finding 6, is today's too). The prototype: 0 at both widths — `GRAMMAR.fitCard` shrinks the inset where the space is short, and the head label stands 2 px above the head's first line. Its one closed-layout cost: a band subsection's heading gains 4 px beneath it (grammar G5).
- **strip-blank** (G6): no open card has more than 30 px of empty box under its last drawn slot. Today, 30 at 1600 and 24 at 390: the cards the strip-height floor pads (*seat:1·pw:u:chamber*, 63 px). The prototype: 0 — the card ends at its content and a long strip hangs on down the gutter.

## Per check: what the prototype still fails, and why

**still — 52.** Unchanged in count from v1, and none of it moves on open in a way the grammar forbids:
- 14 — the identity cards ✋ 🖼️ 📧 and 🎩: the check measures the Members *list* as the paragraph, while the card opens in place of *your row* (a measurement choice; the tab moves 0 — doubt 5).
- 11 — **the Text sheet's top moves** when a card opens in the Rules above it (motion cards, `ans-chamber`, `strlogin`). G1 v2 scopes *the paper's edges* to the sheet the card stands on; the tool does not yet read which sheet that is, so it still counts these. They are content below.
- 10 — the doors ✉️ ❌: the head is the people row drawn by `doorPeople`, 1.5 px off the subsection's own row (two renderers of one list).
- 8 — gaps (`insert-quiet`, `race-quiet-rivals`) and `quick-shedhead`: the tab moves 0.5–2.4 px — the `.insert-anchor` box is not `.anch`'s.
- 8 — record quick cards (`quick-kitchen`, `-larderfood`, `-notice`, the closed page's `rec:fx-*`): the filed tab steps out of its pile by its 5 px peek (P2 v2 names it as not *opening*).
- 1 — the founding `rate` switch, −174 px: a switch between two band paragraphs with the old card closing above (card-audit P7's case), as today.

**head-registration — 57** (v1 64). What is left is P1 v2's stated exceptions and the known measurement choices: the identity cards and 🎩 (their anchor is the list, the head your row, or 🎩's rule once settled — 31), the doors (11: the price sentence drawn in a member's head, and the 1.5 px row), the birth's 🪶 (6: the head *is* the empty title lane — P1's fourth exception), the gaps and `quick-shedhead` (6: *(no text here)* against an empty paragraph — P1's third exception — and the heading clause's 0.5 px), the two-clause draft (2: its head is both clauses, the paragraph the first), `race-quorum`'s two-paragraph head (1). The v2 check reads a rule's paragraph *without its power line*, since P3 v2 trims it from the head by Ed's own ruling; without that trim the settled band cards would count 50 more.

**bin-job — 13.** Unchanged, and the same doubt as v1: the delegated walk's founder cards (10) and 🖼️ (3), where 🗑️ shows because a radio is pressed. Whether a pressed pick is sent or unsent is not in the markup — J2 needs `CardState.draft` (grammar §10: the sorter cannot know).

**zone-overlap — 1 at 1600.** v2's rule judges an overlay by the text it covers. What is left is the charter patch's floating row (*proposalrow*) covering one line of the text while a patch card is open — today's page does the same, twice. The 📝 door, back where Ed put it, covers none.

**closed-page — 0.** One exception is made in the tool and said here: the patch's ↑ ↓ in its head label stay live on the closed page, because moving between a patch's places is reading its record, not an act (P4 v2 withholds acts, not reading).

## What the checks cannot see

- **render-hold** (P10, U1): **not built in the prototype, and not measured.** grammar.md §10 says so; it is the principle the proposal has demonstrated least.
- **State**: every check reads the DOM. The prototype passes them because its **sorter** recognised today's markup; a build on `CardState` must pass them again, from nothing (grammar §10).
- **no-job's driven form** (press every control and watch for a command) is not built; the static form is.
- **one-home** needs `data-fact` roles on every fact; the prototype writes them on the head and fact line only.
- **The live-only cards** — release batch, amendment news, mail give-up, departure news, the applicant's five, the diagonal — are opened by no fixture walk on either page.
- **Copy**: the label vocabulary, the dark commits' reasons, *Undecided when the document closed*, the power cards' past tense and the 👑 note for a rule have not passed STYLE; `copy-check` does not run on the prototype.
- 9 cards have no closed paragraph to register against (`mo:*`, `held:*`, `ans-chamber`, `strlogin`).

## Doubts, stage 5's and v2's

1. **G1's sheet rule** — *resolved in grammar v2* (G1: the sheet the card stands on); the tool still to be scoped (9 findings above).
2. **G4 contradicted itself and moved Ed's door** — *resolved in grammar v2* (G4 v2: the floating layer is an overlay; the door straddles the page edge again); the tool now judges overlays by the text they cover.
3. **J2 cannot be decided from what is drawn** — *stands*; it is §10's argument.
4. **O4 at 390** — *stands*; the prototype leaves 390's card width as it is.
5. **The identity cards' anchor** — *stands*; v2 heads them with your row under the ask label (O6 (b)), and the checks measure the list.
6. **(v2) A head label is one line.** At 390 a long ask (*Can the Founder Make Amendments at Will?*) ends in an ellipsis, its words in the label's tooltip. Two lines were tried and met the ink above (G5). On a power card the head says the same in full; elsewhere the asks are short.
