# Checks — the checks as ruled, and today's page against the prototype (Q1541)

**Precedence.** `answers.md` (Ed's answers to Q1541.1–.56, 2026-09-25) **wins over this file**, and this file over `grammar.md` §5 and `tools/grammar-audit.mjs`. The first section below, *The checks as ruled*, is the specification phase two's card-audit is built to (BUILD.md §2, stage 0). Everything after it is the **measurement of record from before the answers** — the v2 checks on today's page and on the prototype — kept because it is what the answers were given against; where a row measures a rule the answers changed, it says so.

## The checks as ruled (answers.md)

Principle numbers are answers Part 5's. *Baseline* says whether today's count below still stands (**as measured**) or must be taken afresh by stage 0 under the rule as ruled (**re-measure**), in which case stage 0 writes it into a *today (as ruled)* column here, with the cards it names.

| card-audit | check | asserts, as ruled | changed from v2, and why | principle | baseline |
|---|---|---|---|---|---|
| P13 | `still` | On open, a switch within a strip, a switch across strips and close: the pressed tab and the card's first line move **0 px on screen** on both axes; the content above the card moves **up on screen by exactly the label room** (the scroll adjusted in the same frame); the content below is pushed down; nothing moves on x; the topbar, the contents rail and the sheet's left and right edges move 0 px. **The page-top case**, measured separately: where the scroll cannot take the room, the first line moves down by the shortfall and nothing else changes. Run from a scroll that allows compensation and again at the document's top | v2 held the first line still by rising into its own top inset (G5); 1541.44 makes room by moving the content above. v2's *the sheet's edges move 0* becomes *left and right*: the sheet's top is content above | 2 | re-measure |
| P14 | `head-registration` | The first line's text equals the closed paragraph's and its first line box lands on the paragraph's. Stated exceptions: a record (the wording it recorded), a multi-place proposal (the place it shows), a gap (*(no text here)*), 🪶 at the birth (the title box); a rule card's first line is the rule **without** its powers line (1541.10); a power card's first line is **the power's own clause, naming its subject** (1541.48) | the power card's clause now names its subject, so it is not the paragraph's words | 1 | as measured (the power cards re-counted) |
| P15 | `head-form` | Nothing between the card's label and its first line; the label is the one thing above the first line, and the first line is the paragraph renderer's element | the label is above the first line in made room, not in an inset | 1, 9 | as measured |
| P16 | `space-above` | **Replaces `top-edge`.** The card's box never overlaps the ink of the content above it; the label stands wholly inside the card, directly above the first line; the room made equals the label slot's height | G5's inset and its 4 px under band subsection headings are not built (1541.15, .35, .44) | 2 | re-measure |
| P17 | `strip-floor` | **Replaces `strip-blank`.** An open card is never shorter than its tab strip | 1541.16 (c): the floor is kept; G6 is not built | 6 | re-measure (today holds it) |
| P18 | `hairline-gap` | Every hairline between two drawn slots or blocks, per H1's table; none at top or foot; P12 kept. On a rule card the standing first line and the other options are separated by a hairline (1541.47) | — | 6 | as measured |
| P19 | `empty-slot` + `presence` | No drawn slot empty or whitespace-only; drawn slots equal the shell's predicate. **Stated exceptions: the reason box on a card that can take a change is always drawn, empty or not** (1541.21 (b)); **the floor's padding** under the last slot (P17) | two exceptions from principle 6 as ruled | 6 | re-measure |
| P20 | `slot-order` | Drawn slots in grammar §2.3's order, the label first | — | 1, 9 | as measured |
| P21 | `label-slot` | **Every card** carries exactly one label above its first line: what the first line is on a place card, the card's ask on an act or question card (1541.46 (a)); every block's label is its first line (1541.45) — *What you proposed* no longer at the foot, a rival's share as *Proposed · 23%*; one drawing, `--t-cap`, 700, upper case, `--muted`, a record's outcome in its colour (1541.27, Part 4 .27); every label's words are answers Part 4's (.1–.16, .23–.26) or today's titles where Part 4 keeps them | v2 required a head label only on cards with blocks, records and act cards, at `--t-micro`, from grammar §2.3a's vocabulary | 9 | re-measure |
| P22 | `no-job` | Static form: every dark control carries a `data-until` from `choose`, `type`, `drip`, `voice-out`, `readiness`, `reconnect`, `flight` or the bin's `nothing-yours`, reachable in the phase; **no commit is drawn for a power not yet accepted** (Part 4 .19 — so `accept:<power>` is not a reason); no lit commit over an empty required input (✉️'s ✒️). Driven form in stage 10 | `accept:<power>` removed; the dark bin added | 4, 5 | re-measure |
| P23 | `note-visible` | A dark commit waiting on `drip` (*✏️ 12:04*), `voice-out` (*You can only make one constitutional proposal 🏛️ at a time.*) or `readiness` (*Waiting for x members to answer questions.*) shows that note as visible text in the row; one waiting on `choose` or `type`, and the dark bin, shows **no** note (Part 4 .17–.22, 1541.49) | v2 required a note for every dark commit | 5, 8 | re-measure |
| P24 | `bin-job` | 🗑️ is drawn **exactly when the card can ever give it a job for this reader** — dark while there is nothing of theirs to remove, lit while there is (read from `CardState.draft`, `acts`); a withdraw is **the bare glyph** (1541.9 (b) with Ed's note) | v2 drew the bin only while it had a job, and gave withdraw its word | 5, 8 | re-measure |
| P25 | `row-vocabulary` | Every row one of six shapes — absent, withdraw (bare 🗑️), commit, pair, acknowledge (OK while owed), accept (*Accept ‹glyph›* on the grants and on 💡 ⚖️ — Part 4 .24); at most two commits at the right | *withdraw* loses its word; *accept* gains the gates | 8 | as measured (withdraw re-counted) |
| P26 | `role-drawing` | Today's drawings kept (1541.13 (c)): a chosen option stays the filled pill, the standing pill marks what stands; **✓ accent blue when armed, never green** (1541.50); no solid-green button (👑's ✒️ is a bug, 1541.38); green only on marks, the *Passed* and *Changed by the Founder* labels, the passed highlight and a recorded ✓; a block nobody may choose has no radio (the standing pill on a read-only card is a mark, not a radio) | v2's filled-dot radio, *solid accent only on OK/Accept* and *no green ✓ recorded* are dropped | 7 | re-measure |
| P27 | `closed-page` | On a closed document: nothing enabled but the tabs, 🥂 and a multi-place proposal's ↑ ↓ (reading, not an act); no dark control; no radio; no strip tooltip saying *waiting on you*, *yours to take* or *Give your answer* | — (🥂 now discharges every owed OK, 1541.7, so no OK survives beside it) | 4 | as measured |
| P28 | `closed-keeps-content` | Every card that raced still draws its proposals, each under its live label, no control; what the close cut off reads *‹label› · Ran out of time* and a record that ran out *Ran out of time · ‹longWhen›* (Part 4 .4, .14) | *Undecided when the document closed* → *Ran out of time* | 4 | as measured (the words re-read) |
| P29 | `closed-powers` | **Replaces `closed-tense`.** On a closed document no powers line in any paragraph or card and no ✒️ 🛡️ tab in any strip; the stated survivors are 👑 on the Founder's face and 🍾's table of the powers kept at the start; a rule card's label is *Rule at the close*, a text card's *Final text* (1541.34, .52; Part 4 .15, .16) | v2 kept the powers in the past tense; the answers remove them | 4 | re-measure |
| P30 | `zone-overlap` | Zones' content boxes pairwise disjoint; every overlay's box disjoint from every text line and enabled control outside it; **the floating 📝 door is a named exception** and may overlap (1541.17); at 390 the contents drawer is full width and its marks inside it (1541.40, .54) | the door exception; plain bug 6 is not a bug | — | re-measure |
| P31 | `width-invariance` | Every travel above equal at 1600 and 390 (against the 1600 run as `--baseline`). **Stated exception: the active tab** grows 8 px at 1600 and highlights in place at 390, split at the 900 px line (1541.53); at 390 the tabs stand flush with the glass's left edge (1541.20) | the exception and the flush tabs are new | 9 | re-measure |
| P32 | `place-head` | Every card on one anchor shows one first line | — | 1 | as measured |
| P33 | `one-home` | At most one element per `data-fact` role per card: `place` (the first line), `pill` (who chose it), `outcome` (a record's label), `author` (a signed proposal's label), `previous`, `price` (on the commit) | the roles are principle 3's homes as ruled; provenance is the pill, not a fact line | 3 | needs the roles |
| — | `raw-value` | No rendered string contains `undefined`, `NaN`, `null`, `[object`, `Invalid Date` — a `copy-check --walk` rule | — | 4 | as measured |
| — | `state-only`, `style-lint` | slot builders read `CardState` only; type tokens and the 4 px grid (finding 1541.41) | — | — | spec-check, stage 1 |
| — | `render-hold` | in-flight state (a caret, the always-shown reason box's text included) survives a poll and a room event on the same node, and the page's scroll is unmoved | the reason box and the scroll added | 10 | a walk, stage 9 |

**Not built, by the answers:** G5's top inset and its 4 px (1541.15), G6 and `strip-blank` (1541.16 (c)), the rationale lane appearing with the change (1541.21 (b)), the filled-dot radio and *You preferred this before it changed* (1541.13 (c)), the power cards' past tense (1541.34), the dark ✒️ before a grant is accepted (Part 4 .19), a note on a dark commit waiting on a choice or a keystroke (.17, .18).

### Today (as ruled) — stage 0's baseline, 2026-09-25

Measured by `design/tools/card-audit.mjs` (stage 0: P13–P33 in report mode, `GRAMMAR_KINDS` empty), **all nine walks** (`--walk=all`: the audit's seven, `sessionband`, `closedband`), 350 card openings per run, at 1600×1000 and at 390×844 (`--baseline=` the 1600 payload, for P31), on the tree **after** the fixture's closed page was fixed (1541.42, `closeFixture` in session-view.html). Answers Part 6 is in force: every label, card and block, at `--t-cap` (6.2); the page top is wherever room runs out (6.4); close and switch keep the clause still the same way (6.5); P29 reads the Rules paragraphs as well as the cards and tabs (6.6).

Reproduce: `node design/tools/card-audit.mjs --walk=all --out=a.json`, then `node design/tools/card-audit.mjs --walk=all --width=390 --height=844 --baseline=a.json --out=b.json`; the table prints last (*as ruled* · cards · *v2* · excepted).

**The unchanged checks reproduce the *today* column.** Run on the tree **before** the fixture fix (HEAD 2cc02604's page), card-audit's v2-comparable count equals the table below exactly, at both widths — head-registration 242 (172), head-form 102 (102), hairline-gap 24 (24), empty-slot 232 (129), row-vocabulary 119 (119), closed-page 268 (76) at 1600 and 210 (76) at 390, raw-value 0 — and so do the row shapes (commit 155, absent 44, pair 14, acknowledge 14, withdraw 6). slot-order had no *today* count; it reads 6 (6). The fixture fix then moves them, **on the two closed walks only** (every other walk's count is identical), line by line:

| check | before → after the fixture fix | why |
|---|---|---|
| head-registration | 242 (172) → 239 (170): `closed` 52 → 49 | 31 live cards leave the closed page (the open races, the park, the diagonal, the stranded proposal) and it files 31 undecided backlog records (`rec:fx-u0`…`u30`, the first two replacing the old pair), each heading with the wording they recorded |
| head-form | 102 → 100: `closed` 51 → 49 | the same swap: two fewer charter cards on the closed walk |
| hairline-gap | 24 → **0**: `closed` 24 → 0 | the 24 orphan hairlines were the judgment row's placeholder under the unjudged pairs the closed fixture served — no pair is served now (diagnosis: *the one survivor lives in a fixture-only state*) |
| empty-slot | 232 (129) → 207 (104): `closed` 25 → 0 | the same pairs' empty heads |
| row-vocabulary | 119 → 94: `closed` 25 → 0 | the pairs' rows (🗑️ + a commit on a closed page) |
| closed-page | 268 (76) → 114 (45) at 1600, 210 (76) → 114 (45) at 390: `closed` 149 → 5 (91 → 5 at 390), `closedband` 119 → 109 | no radios, commits or *waiting on you* tooltips on unjudged pairs, the park or the running ⏱️ and 👥 motions (held at the close now) |
| slot-order, raw-value | unchanged | — |

The v2-comparable count keeps each check's **stated exceptions** in (the column above); *as ruled* takes them out: head-registration 167 (99) — 72 excepted (records, the patch, gaps, 🪶 at the birth, the power cards' own clause); head-form 69 (69) — 31 cards whose only thing above the first line is one label.

**The revised and replaced checks' baseline** (as ruled; findings (cards), and the cards each kind names first):

| check | 1600 | 390 | kinds (findings, or cards where said), and the cards they name |
|---|---|---|---|
| P13 still | 207 (118) | 212 (121) | close 115 · open 89 · switch 3 at 1600 (+1 page-top at 390). The band holds still, bar the identity cards (✋ 🖼️ 📧: the ink above is the Members list, 25 px) and the seat's motion switches (`seat:stranger·mo:mo-3`…`mo-5`); **every charter card fails**: the charter drops its tab by the eyebrow on close (`charter·race-purse`: the line and tab move 33 px; the room says 26) and the room made on open is the eyebrow's 33 px, not the label's (`race-purse`, `patch-rename` 82 px). 40 readings no pointer could take (a tab behind a pile) are listed in the payload's `unread.p13` |
| P16 space-above | 201 (191) | 222 (212) | covers 120 (141 at 390): `founding·invite` 10 px, `founding·begin`, the settled band cards; room 81: `invite`, the charter's cards |
| P17 strip-floor | 0 | 0 | today holds the floor |
| P19 empty-slot | 207 (104) | 207 (104) | `founding·title`, `slug`, `myemail` — the empty `.clausehead` boxes (the reason-box exception excused none: today's rationale lanes carry a placeholder, which counts as content) |
| P21 label-slot | 803 (350) | 803 (350) | no-label 251 (`founding·title`, `slug`, `myemail` — the band draws no label above the first line); block 43 (`settled·pw:u:title` — a block with no label); block-place 48, drawing 116, words 115 (`settled·rec:chamber:0` — a record's labels below the first line, at `--t-micro`, in v2's words); labels 1 (`charter·patch-rename`) |
| P22 no-job | 259 (194) | 259 (194) | until 180 on 134 cards (no dark control carries `data-until` today: `founding·title`'s 🪶, `myname`'s ✓); lit-empty 7 (✉️'s ✒️ over the empty box: `founding·invite`, `settled·myemail`); close-ok 72 (the grants' OK that only closes: `settled·grant-pen`) |
| P23 note-visible | 20 (20) | 20 (20) | missing 20: `answers·begin` (🍾 waiting on readiness, no note), `settled·chamber`, `settled·admission` (🏛️ in use, tooltip only) |
| P24 bin-job | 255 (181) | 255 (181) | lit-empty 181 (*Put it back as it stands* lit with nothing to put back: `founding·title`, `myemail`, `myname`); no-job-ever 74 (a bin on a card that can never give it one: the grants, `founding·grant-pen`) |
| P26 role-drawing | 140 (107) | 140 (107) | unchoosable 119 on 91 cards (the settled cards' pressed provenance radio: `settled·title`, `slug`, `chamber`); green 14 (✋ 🖼️ 📧's solid-green ✓); green-tick 7 (a recorded pick's ✓: `charter·quick-guests-count`, `race-guests-rivals`, `quick-confidence`) |
| P28 closed-keeps-content | 2 (2) | 2 (2) | lost 2: `closed·rec:fx-u4` (the gap's cut-off insertion) and `rec:fx-u17` draw their head alone. The other 29 cut-off records already read *Proposal ran out of time* |
| P29 closed-powers | 90 (41) | 89 (40) | strip-tab 34 (`closedband·title`'s pw:u / pw:a tabs); page-tab 23 (22 at 390); label 15 (every closed rule card: no *Rule at the close*); card-line 10 (`closedband·pw:u:title` — *The Founder may amend the title at will*); paragraph 8 (the Rules paragraphs' powers sentences, 6.6) |
| P30 zone-overlap | 1 (1) | 0 | `charter·open:race-purse`: the patch row floating over a line of text. The 📝 door is the named exception and was excused nowhere this run |
| P31 width-invariance | — (the baseline) | 91 (89) | not-flush 10 (every walk: the tabs stand 28 px off the glass at 390, 1541.20); close 79 and open 2 (`charter·patch-rename` close travels 0 at 1600 and −82 px at 390; `insert-quiet`'s tab) |
| P32 place-head | 0 | 0 | — |
| P33 one-home | 0 | 0 | no card carries a `data-fact` role yet (350 of 350 in `unread.noFactRoles`) — measurable from stage 1 |
| P25 row-vocabulary's *withdraw-word* | 0 | 0 | the new kind (a withdraw with its word): today's withdraws are bare |

**Not measured in stage 0**, and said in the payload's `unread.notMeasured`: P19's `presence` half (needs the shell's predicate, stage 1); P30's contents drawer at 390 (no walk opens it); P18's hairline under a rule card's standing first line (none until stage 3).

**`raw-value`: the one known failure.** Strict in `copy-check --walk` from stage 0, and green there — nothing the fixture and founding walks open prints a raw value. Plain bug 1 (1541.29) is on the live path only and is **reproduced** (2026-09-25, a dev server, ladder `--to=constitution`, seed 42, seat `m-1`): 🌍 reads *… Does the Founder Have a Veto? Set to undefined Set by the …* and ❌ *… Nobody is proposed for removal. Set to undefined Set by the …* — both caught by the rule's pattern. It is fixed by construction in stage 3 and asserted on the ladder's constitution rung there.

## The measurement of 2026-09-25 (v2, before the answers)

Measured 2026-09-25 by `tools/grammar-audit.mjs` (a copy of `inventory-audit.mjs`, itself a copy of `design/tools/card-audit.mjs`, with grammar.md §5's checks added — **v2 adds six**). Every check is **DOM-generic**: it reads today's page and the prototype by the same rules, so the columns are comparable. Nine walks each (founding, answers, delegated, settled, outsiders, charter, closed, sessionband, closedband), 352 card openings per run, at 1600×1000 and 390×844. **This file supersedes the stage-5 version**: the prototype measured here is v2 (grammar.md v2), and today's page was re-measured with the v2 checks, so both columns come from the same instrument on the same day.

Reproduce:

- `node design/proposal/tools/grammar-audit.mjs --page=session-view.html` (`--width=390 --height=844` for the phone) — today, label `today`;
- `node design/proposal/tools/grammar-audit.mjs --page=proposal/proto/session-view.html --label=pshot --shots --hide=#gnote` (and at 390) — the prototype, with the crops `mockups.html` shows;
- `node design/proposal/tools/checks-table.mjs --proto=pshot` prints the table and examples from `data/grammar-{today,pshot}-{1600,390}.json` (gitignored).

**One false start, said.** The first final run found the 👑 card throwing — its note read a copy key from the wrong table (`PAGE_COPY` for `COPY.session`) — so the two walks it lives in were re-run after the fix and spliced in by `tools/merge-walks.mjs`. A last fix to the note slot (two dark commits waiting on one thing now say it once) then called for a whole new run anyway, so **the prototype's numbers and crops here are one full, unspliced run at each width**, and the table came out the same as the spliced one. `merge-walks.mjs` stays in `tools/` for the next time one card is fixed.

The prototype is at `/proposal/proto/session-view.html` under `npm run design` (`?fixture=session`, `&band=1`, `&closed=1`, none for the founding).

### The table

Findings (cards affected). **Read against the answers:** the prototype was built to grammar v2, so its zeros on `top-edge`, `strip-blank`, `note-visible`, `bin-job`, `role-drawing`, `label-slot` and `closed-tense` are zeros against rules the answers replaced (it has no space above, drops the pill, hides the reason box, has no dark bin, draws the filled-dot radio, and writes past-tense powers). The rows for `head-form`, `hairline-gap`, `empty-slot`, `row-vocabulary`, `closed-page` and `raw-value` still measure standing rules.

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

### The six v2 checks: what they assert, what today fails

- **label-slot** (§2.3a): every head on a card that draws a block has a label above its first line; every block with no live control has a label as its first line (or a label drawn directly above it); no label stands below its block's first line. Today, 102: **63 heads with no label beside blocks** — the settled band cards, whose standing block carried a provenance radio instead (e.g. *settled·title*, *settled·admission*) — and **39 blocks with neither control nor label**: the locked 🎩's greyed rungs, the second of two rivals sharing one *Proposed* label, the 👑 card's first pick. The prototype: 0.
- **note-visible** (P5 v2, P8 v2): every dark commit on a live card has its reason as visible text in the row, and no commit is lit over an empty address box. Today, 107: **100 rows whose dark commits explain themselves only in a tooltip** (a phone has none — *founding·title*, *settled·title*'s ✒️ ✏️), and **7 lit ✒️ over ✉️'s empty box**. The prototype: 0 — every such row prints *Choose one first*, *Give it a name first*, *✒️ Type an address first · 🏛️ One 🏛️ each — withdraw yours first*.
- **closed-keeps-content** (P4 v2): on the closed page, every card that raced (a charter race, a patch, a motion) still draws what was in flight, and says the close cut it off. Today, 31: all *unsaid* — today keeps the proposals (with live-looking radios, which `closed-page` counts) but nothing says they were undecided at the close. v1 of the prototype would have failed *lost* on these same cards (critique 2). The prototype: 0 — each carries *Undecided when the document closed*, its proposals labelled, no control.
- **closed-tense** (P4 v2): on a closed document no card claims a power of the Founder's in the present. Today, 10: the closed ✒️ 🛡️ cards (*closedband·pw:u:title — The Founder may amend the title at will*). The prototype: 0 — settings heads drop the power line (P3 v2) and power cards read *Until the document closed, the Founder could …*. (A rule's own *any member may* is the document's words and is not counted.)
- **top-edge** (G5): the open card's top edge never covers the ink of the line above its anchor, and its head label clears that ink. Today, 120 at 1600 and 141 at 390: today's cards rise over the paragraph above (*founding·invite* by 10 px — the 📍-over-🪶 class the critique found in v1, finding 6, is today's too). The prototype: 0 at both widths — `GRAMMAR.fitCard` shrinks the inset where the space is short, and the head label stands 2 px above the head's first line. Its one closed-layout cost: a band subsection's heading gains 4 px beneath it (grammar G5).
- **strip-blank** (G6): no open card has more than 30 px of empty box under its last drawn slot. Today, 30 at 1600 and 24 at 390: the cards the strip-height floor pads (*seat:1·pw:u:chamber*, 63 px). The prototype: 0 — the card ends at its content and a long strip hangs on down the gutter.

### Per check: what the prototype still fails, and why

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

### What the checks cannot see

- **render-hold** (P10, U1): **not built in the prototype, and not measured.** grammar.md §10 says so; it is the principle the proposal has demonstrated least.
- **State**: every check reads the DOM. The prototype passes them because its **sorter** recognised today's markup; a build on `CardState` must pass them again, from nothing (grammar §10).
- **no-job's driven form** (press every control and watch for a command) is not built; the static form is.
- **one-home** needs `data-fact` roles on every fact; the prototype writes them on the head and fact line only.
- **The live-only cards** — release batch, amendment news, mail give-up, departure news, the applicant's five, the diagonal — are opened by no fixture walk on either page.
- **Copy**: the label vocabulary, the dark commits' reasons, *Undecided when the document closed*, the power cards' past tense and the 👑 note for a rule have not passed STYLE; `copy-check` does not run on the prototype.
- 9 cards have no closed paragraph to register against (`mo:*`, `held:*`, `ans-chamber`, `strlogin`).

### Doubts, stage 5's and v2's

1. **G1's sheet rule** — *resolved in grammar v2* (G1: the sheet the card stands on); the tool still to be scoped (9 findings above). **As ruled:** P13 now measures on screen, and the sheet's top is content above (1541.44).
2. **G4 contradicted itself and moved Ed's door** — *resolved in grammar v2* (G4 v2: the floating layer is an overlay; the door straddles the page edge again); the tool now judges overlays by the text they cover. **As ruled:** the door keeps today's placement and may overlap; it is `zone-overlap`'s named exception (1541.17).
3. **J2 cannot be decided from what is drawn** — *stands*; it is §10's argument. **As ruled**, P24 also needs *can this card ever give the bin a job* (1541.9), which is `acts`, not markup.
4. **O4 at 390** — **resolved by 1541.20 (a)**: the margin narrows further, the tabs flush with the glass, the active tab highlighting in place (1541.53) — stage 6.
5. **The identity cards' anchor** — *stands*; v2 heads them with your row under the ask label (O6 (b)), and the checks measure the list.
6. **(v2) A head label is one line.** At 390 a long ask (*Can the Founder Make Amendments at Will?*) ends in an ellipsis, its words in the label's tooltip. Two lines were tried and met the ink above (G5). **As ruled** the label is larger (`--t-cap`, Part 4 .27) and its room is made rather than borrowed, so two lines no longer meet the ink above; whether a long ask wraps or ends in an ellipsis at 390 is for stage 3b to measure and show Ed. On a power card the head says the same in full; elsewhere the asks are short.
