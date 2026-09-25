# Checks — today's page against the prototype (Q1541, stage 5)

Measured 2026-09-25 by `tools/grammar-audit.mjs` (a copy of `inventory-audit.mjs`, itself a copy of `design/tools/card-audit.mjs`, with grammar.md §5's checks added). Every check is **DOM-generic**: it reads today's page and the prototype by the same rules, so the two columns are comparable. Nine walks each (founding, answers, delegated, settled, outsiders, charter, closed, sessionband, closedband), 352 card openings per run, at 1600×1000 and 390×844. Reproduce:

- `node design/proposal/tools/grammar-audit.mjs --page=session-view.html --width=1600` (and `--width=390 --height=844`)
- the same with `--page=proposal/proto/session-view.html`
- `node design/proposal/tools/checks-table.mjs` prints the table below and examples from the four payloads (`data/grammar-{today,proto}-{1600,390}.json`, gitignored).

The prototype is at `/proposal/proto/session-view.html` under `npm run design` (`?fixture=session`, `&band=1`, `&closed=1`, none for the founding).

## The table

Findings (cards affected). The two widths agree except where noted: the checks are per card, and the geometry the prototype fixes it fixes at both widths.

| check | holds | today 1600 | **proto 1600** | today 390 | **proto 390** |
|---|---|---|---|---|---|
| still (2D) | P2, G1 | 185 (122) | **52 (50)** | 185 (122) | **52 (50)** |
| head-registration | P1, S2 | 262 (192) | **64 (44)** | 262 (192) | **64 (44)** |
| head-form (nothing above the head) | G2, L2 | 102 (102) | **0** | 102 (102) | **0** |
| hairline-gap | P6, H1 | 24 (24) | **1 (1)** | 24 (24) | **1 (1)** |
| empty-slot | P6, L1 | 232 (129) | **4 (2)** | 232 (129) | **4 (2)** |
| no-job | P5, J1 | 193 (121) | **0** | 193 (121) | **0** |
| bin-job | P5, J2 | 216 (216) | **13 (13)** | 216 (216) | **13 (13)** |
| row-vocabulary | P8 | 119 (119) | **0** | 119 (119) | **0** |
| closed-page | P4 | 269 (76) | **0** | 211 (76) | **0** |
| raw-value | P4, S1 | 0 | 0 | 0 | 0 |
| zone-overlap | G4 | 7 (4) | **3 (3)** | 0 | **0** |
| role-drawing | P7, R1 | 84 (84) | **0** | 84 (84) | **0** |

Row shapes seen (1600): today — commit 155, absent 44, pair 14, acknowledge 14, withdraw 6, plus 119 rows in none of the six; prototype — commit 148, absent 171, pair 14, acknowledge 9, accept 6, withdraw 4, and no row outside the six.

## Per check: what today fails, what the prototype still fails

**still.** Today: every charter card's tab and head drop 33 px on open (the eyebrow), records 62–84 px, the patch 82 px; one founding switch moves 187 px. Prototype: the charter and band cards open at 0.0 px on both axes at both widths. What is left, 52:
- 11 — *the text sheet's top moves* when a motion card opens in the Rules: the Text sheet lies below the card and is pushed down. This is G1 as written, not a fault — see doubt 1 below.
- 18 — the identity cards (✋ 🖼️) and 🎩: the check measures the Members *list* as the paragraph, while the card opens in place of *your row* (the last line of the list), so the head reads 40–45 px below the list's first line. A measurement choice; the tab itself moves 0.
- 10 — the doors ✉️ ❌: the head is the people row drawn by `doorPeople`, 1.5 px off the subsection's own row (two renderers of one list — only its empty wording was unified here).
- 4 — gap cards (`insert-quiet`, `race-quiet-rivals`): the tab moves 2.4 px, the `.insert-anchor` box not being `.anch`'s.
- 8 — record quick cards (`quick-kitchen`, `-larderfood`, `-notice`, `rec:fx-*` on the closed page): the tab moves 5 px while the head lands at 0 — the filed chip's peek, not the card.
- 4 — `quick-shedhead` (a heading as clause): 2 px.
- 1 — founding `rate` switch, −174 px: a switch between two band paragraphs, the old card closing above (card-audit P7's case), unchanged from today.

**head-registration.** Today: 94 heads whose text is not the paragraph's (the band's *Set to*/title heads, the charter's eyebrow counted above), 168 offset. Prototype 64: the 🪶 title lane at the birth (the head *is* the lane, empty until typed — 11), 📧 at the birth (3), the identity-card list/row measurement above (16), 🎩 (12 — its head is its standing sentence, the paragraph is the Members list), the doors (11), gaps (4), the fixture's empty two-clause draft head (4, below), `race-quorum`'s two-paragraph head (1), `quick-shedhead` (2).

**head-form.** Today 102: *The clause as it stands* / *The gap as it stands* above every charter head, and the patch's place navigator. Prototype 0: the eyebrow's words are the head lane's label (*Current text*, O1 (a)); the navigator is body.

**hairline-gap.** Today 24: the closed page's judgment rows, a top rule with nothing below it (P12's survivor). Prototype 1: `mine-guests-wording`, whose head is empty on the fixture (below), so the first hairline has nothing above it.

**empty-slot.** Today 232: the 12 px `.clausehead` holding only the strip on every headless band card. Prototype 4 (2 cards, both `mine-guests-wording`): a fixture fault — its two-clause site's `origin` rows carry `x:` where `originText` reads `text`, so the head's text is empty on **today's page too**; the shell cannot invent a head it was not given.

**no-job.** Today 193: 72 close-only OKs, 15 lone 🗑️ rows that close, 106 dark controls on a closed document. Prototype 0: close-only OKs are not drawn (B6), a closed document draws no control but 🥂's OK (P4), and every dark control carries a `data-until` from J1's list (choose, type, readiness, accept:pen, drip).

**bin-job.** Today 216: *Put it back as it stands* with nothing to put back, *Discard this motion* with no motion. Prototype 13, all one kind: the delegated walk's founder cards (10) and 🖼️ (3), where the 🗑️ shows because a radio is pressed. The audit counts only typed values as unsent; the prototype counts a pressed pick on a card with no Indifferent as unsent. For the Founder's picks (a provisional value until ✒️) the prototype is right; for 🖼️'s pressed current picture it is wrong. Neither the DOM nor the shell can tell a sent pick from an unsent one — J2 needs `CardState.draft` (doubt 3).

**row-vocabulary.** Today 119 rows in none of the six shapes (🗑️ + Accept, 🗑️ + OK, …). Prototype 0.

**closed-page.** Today 269 (76 cards): live radios, *propose edit*, steppers, a ❄️ ✓ patch row, and six tab tooltips reading *waiting on you*. Prototype 0.

**zone-overlap.** Today at 1600, 7: the 📝 door straddles the sheet's right edge and 26 px of the queue rail. Prototype 3: the door now stands inside the sheet (`--s3` in from its edge), so it overlaps no other zone — and the check, reading G4 literally, reports it overlapping the sheet (doubt 2). 390: 0 both.

**role-drawing.** Today 84: 70 pressed *Chosen by …* provenance radios on cards with no act, 14 solid-green ✓. Prototype 0.

**raw-value.** 0 on both pages on the fixture. The *Set to undefined* the inventory found is a live-ladder fault (🌍 and ❌ at the constitution rung), which these walks do not reach; the prototype removes the *Set to* line altogether (B11).

## What the checks cannot see

- **render-hold** (P10, U1) is not built into the prototype and not measured.
- **no-job's driven form** (press every control and watch for a command) is not built; the static form is.
- **one-home** needs `data-fact` roles on every fact; the prototype writes them on the head and fact line only.
- **The live-only cards** — 👑 question, release batch, amendment news, mail give-up, departure news, the applicant's five, the diagonal — are opened by no fixture walk on either page.
- 11 cards have no closed paragraph to register against (`mo:*`, `held:*`, `ans-chamber`, `strlogin`).

## Doubts about grammar.md these results raise

1. **G1's sheet rule needs scoping.** *The sheet's top edge never moves* is true of the sheet a card stands on; the Text sheet lies below the Rules and is pushed down by any card opening in the Rules, as all content below must be. The check should read *the sheet containing the card*.
2. **G4 contradicts itself.** §3.1 puts the floating layer *within the sheet's x-range* and §3.1/G4 require zone boxes *pairwise disjoint*; a door inside the sheet overlaps the sheet. The rule wants to be *the floating layer covers no text line and no other zone's box*. And the move breaks Ed's 2026-09-24 ruling that the door straddles the page's right edge (edit-mode.js) — a break not in B1–B13.
3. **J2 cannot be decided from what is drawn.** Whether a pressed radio is a choice already sent or one still unsent is a fact of the provisional layer; the bin rule needs `CardState.draft`, which is the argument for S1 over the shell-sorting the prototype does.
4. **O4 (a) at 390** widens the card without widening the column, so a head would re-wrap against its own paragraph (the measure changes under it). The card can be widened only with the column; the prototype leaves 390's card width as it is.
5. **The identity cards' anchor.** B3 heads ✋ 🖼️ 📧 with *your row*, but the tab pile they belong to rides the Members list, and head-registration measures against that list. Either the row is the anchor (and the checks must measure the row), or the list is (and the head is the list). The prototype takes the row.
