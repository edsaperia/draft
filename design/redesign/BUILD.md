# BUILD.md — the surface redesign, phase two (Q1541)

A working plan in `design/MOBILE.md`'s shape: stages are checked off as they land, each with its acceptance criteria, its guards, its re-freezes, the document edits it carries and what must wait while it is open. Written 2026-09-25 at the end of phase one; **revised the same day to Ed's answers** (`answers.md`, Q1541.1–.56), which he gave from the review artifact and in the session. Ed answered 1541.1 (a): the staged build goes ahead.

**Precedence.** **`answers.md` wins over this file, and this file over `grammar.md` and the prototype**: where this plan and `answers.md` disagree, the plan is wrong and is amended before the stage it names starts. SURFACE.md stays the rule for the page until a stage amends it, and STYLE.md for every string; each stage lands the SURFACE, STYLE and `design/copy.js` edits for the cards it converts — **never ahead of the code** (spec-check would be red) **and never after it** (SURFACE would describe a page that no longer exists), by Ed's decision that those three change stage by stage as the build lands. `grammar.md` is the design reference only where `answers.md` leaves it standing; `checks.md` is the checks' specification, revised to the answers. CLAUDE.md wins on process.

**What the answers changed, in one paragraph.** The headline ruling (1541.44): **an opened card makes space above its first line** — the content above slides up by the label's height and the scroll is adjusted in the same frame, so the clause and its tab stay still on screen; only at the page top does the clause move down. That replaces the grammar's top inset (G5), its 4 px under band subsection headings and the top-edge check. Ed's standing preference throughout is **stable furniture**: a control that can come alive on a card is drawn from the start, dark (the bin, 1541.9); the provenance pill stays, on the first line (1541.5, .47); the reason box is always shown (1541.21 (b)); the card floor is kept (1541.16 (c)); today's drawings are kept (1541.13 (c)) with ✓ accent blue when armed (1541.50). Every card carries **one label above its first line** (1541.46 (a)), in words Ed chose one at a time (1541.55, answers Part 4). A dark commit's reason is written out for three reasons only (1541.33, Part 4 .17–.22); a commit for a power not yet accepted is **not drawn** (.19). The closed page loses the powers lines and the ✒️ 🛡️ tabs altogether (1541.34, .52). The ten principles are those of answers Part 5, not grammar §1.

## 0. What merges, and what never does

The phase-one branch `redesign` is **never merged and never pushed**. The repository is public, and the branch carries **~36 MB of screenshots** (`design/proposal/shots/`, 884 files), a 4.8 MB `inventory.json`, the gitignored `data/` dumps, the prototype (`proto/`, a sorter over today's markup that grammar §10 says to throw away) and the review page's image copies. **None of that reaches main.**

Phase two is cut **fresh from main**. It brings **code and docs only**:

- the rule-bearing documents, copied into `design/redesign/` in stage 0's commit: **`answers.md`** (the rulings, first in precedence), this file, `grammar.md` (the reference, with its one-line note that `answers.md` overrides it), and `checks.md` (the checks as ruled);
- `diagnosis.md`'s summary and plain-bugs list, as the baseline the guards are measured against (text only, no image links that would dangle — they are rewritten to name the walk and card key instead);
- the checks themselves, **re-implemented** in `design/tools/card-audit.mjs` (stage 0), taking `design/proposal/tools/grammar-audit.mjs` as a starting point and **`checks.md`'s *checks as ruled* as the specification where the two differ** — the audit measures the v2 grammar, and six of its checks measure rules the answers changed.

Everything else stays on `redesign` for as long as Ed wants the review page's sources.

## 1. The shape of the work

The diagnosis's causes, and the answer to each, fix the order:

1. **One description of the card's state** (`CardState`, grammar §2.1) and **one shell that makes space above** before any card uses them — stage 1.
2. **Families by risk**, lowest first: cards with nothing to type and one button (stage 2); the band's settings, where the breaks concentrate (stages 3–5); the charter, where the composer and the judgments live and the live walks are densest (stage 6); the closed page, which needs the one host change (stage 7); edit mode (stage 8).
3. **Keyed re-render last** (stage 9, 1541.18 (a)), once every card leaves through one shell and has stable slot keys.
4. **Retire and fold** (stage 10), where the principles not yet made true enter SURFACE.

**Names for the new parts** (for the glossary, CLAUDE.md, as the stage that builds each lands):

- `space-above` — the shell's opening geometry: the card's label room is made by sliding the content above up and adjusting the scroll in the same frame, so the first line and the pressed tab stay put on screen (1541.44). Stage 1.
- `label slot` — the one label above every card's first line, and each block's label on its own first line (1541.45, .46). Stage 1.
- `dark furniture` — the rule that a control that can come alive on a card is drawn from the start, dark, and lights when it has a job; one that can never have a job there is not drawn (principle 5). Stage 1 for the shell, every stage for its kinds.
- `standing pill` — the provenance pill on a rule card's first line, the option selected when the card opens; choosing it again cancels a proposed change (1541.5, .47). Stage 3.
- `card-state`, `card-shell`, `row shapes` — as before.

**The conversion is the cost.** About 40 card bodies — every `BODY` entry in `design/band.js`, the per-kind builders in `design/session.js`, `design/setup.js` and `design/session-view.html` — are rewritten to read one `CardState` and fill slots. The shell, the tokens and the checks are perhaps a fifth of the work. Estimates below are in **builder sessions** (one subagent build, as in the 2026-09-22 P1 batch) plus **Ed's QA rounds**; the programme as revised is **28–34 builder sessions and 10–11 QA rounds** (the stage table's sizes, summed — the space-above geometry adds to stage 1, the standing pill and the power clauses to stage 3, and the dropped work, G5's 4 px, G6 and the STYLE pass, gives a little back), which at the project's pace is **four to six weeks** of calendar time with other work continuing around it. About two thirds of the sessions are stages 3–7, the conversion proper.

**Every stage ends the same way:** the eight `ci` gates green; `journey` green; the walks the stage names green; card-audit strict on the stage's kinds at both widths; `npm run qa:freeze` with the reference diff read (below); the SURFACE/STYLE/copy.js/CLAUDE.md edits committed; a CHANGELOG section; and a deploy **only on Ed's word**, never during a live room.

## 2. The guards

Each check in `checks.md`'s *checks as ruled* becomes a numbered card-audit check, continuing after P12. In stage 0 they all run in **report mode**; from the stage that converts a family, they run **strict for that family's kinds** — card-audit gains a `GRAMMAR_KINDS` allow-list that each stage extends, so a converted card can never slide back while unconverted cards are not yet held to rules they cannot meet.

| card-audit | check (checks.md) | holds (answers Part 5) | strict from |
|---|---|---|---|
| **P13** | `still` — **revised to 1541.44**: on open, switch (within and across strips) and close, the pressed tab and the first line move 0 px **on screen** on both axes; the content above the card moves up on screen by exactly the label room, the content below is pushed down, nothing moves on x; the topbar, the contents rail and the sheet's left and right edges 0 px; at the page top the first line moves down by the shortfall instead (the stated case, measured separately) | 2 | each family's stage |
| **P14** | `head-registration` — the first line equals the closed paragraph's line and lands on it; the four exceptions (record, multi-place proposal, gap, 🪶 at the birth), the rule card's trimmed power line and the power card's own clause stated in the check | 1 | 2 |
| **P15** | `head-form` — nothing in the card between its label and its first line; the label is the one thing above the first line | 1, 9 | 2 |
| **P16** | `space-above` — **replaces `top-edge`**: the card's box never overlaps the ink of the content above it (it cannot, because that content moved); the label stands wholly inside the card, directly above the first line; the room made equals the label slot's height | 2 | 2 |
| **P17** | `strip-floor` — **replaces `strip-blank`** (1541.16 (c)): an open card is never shorter than its tab strip | 6 | 2 |
| **P18** | `hairline-gap` — every hairline between two drawn slots, per H1's table (P12 kept) | 6 | 1 |
| **P19** | `empty-slot` + `presence` — no empty slot; drawn slots equal the shell's predicate; **the reason box on a card that can take a change and the floor's padding are stated exceptions** | 6 | 1 |
| **P20** | `slot-order` | 1, 9 | 1 |
| **P21** | `label-slot` — **revised to 1541.45, .46, .27**: every card carries exactly one label above its first line; every block's label is its first line; one drawing (`--t-cap`, 700, upper case, `--muted`; a record's outcome in its colour); every label's words from answers Part 4 | 9 | 2 |
| **P22** | `no-job` — static form: every dark control carries a `data-until` from the revised list (`choose`, `type`, `drip`, `voice-out`, `readiness`, `reconnect`, `flight`, and the bin's `nothing-yours`), reachable in the phase; **no `accept:<power>`** — such a commit is not drawn (Part 4 .19); no lit commit over an empty required input. The driven form added in stage 10 | 5 | 2 |
| **P23** | `note-visible` — **narrowed to Part 4 .17–.22**: a dark commit waiting on `drip`, `voice-out` or `readiness` shows its note as visible text in the row; one waiting on `choose` or `type`, and the dark bin, shows **no** note | 5, 8 | 2 |
| **P24** | `bin-job` — **revised to 1541.9**: 🗑️ is drawn exactly when the card can ever give it a job for this reader, dark until there is something of theirs to remove and lit while there is (read from `CardState.draft` and `owed`/`acts`); a withdraw is the bare glyph | 5, 8 | 2 |
| **P25** | `row-vocabulary` — every row one of the six shapes; *accept* covers the grants and 💡 ⚖️ (Part 4 .24); *withdraw* is the bare 🗑️ | 8 | 2 |
| **P26** | `role-drawing` — **revised to 1541.13 (c), .50**: today's drawings kept (a chosen option stays the filled pill); ✓ accent blue when armed, never green; no solid-green button (👑's ✒️ included); green only on marks, the *Passed* and *Changed by the Founder* labels, the passed highlight and a recorded ✓; a block nobody may choose has no radio (the standing pill marks what stands and is not a radio on a card whose reader cannot choose) | 7 | 2 |
| **P27** | `closed-page` — nothing enabled but the tabs, 🥂 and a multi-place proposal's ↑ ↓; no dark control | 4 | 7 (report before) |
| **P28** | `closed-keeps-content` — every raced card keeps its proposals, labelled, no control; what the close cut off reads *Ran out of time* (Part 4 .14) | 4 | 7 |
| **P29** | `closed-powers` — **replaces `closed-tense`** (1541.34, .52): on a closed document no powers line in any paragraph or card, and no ✒️ 🛡️ tab in any strip; 👑 on the Founder's face and 🍾's table of the powers kept at the start are the stated survivors; a rule card's label reads *Rule at the close*, a text card's *Final text* | 4 | 7 |
| **P30** | `zone-overlap` — zones disjoint; an overlay covers no text and no control; **the floating 📝 door is a named exception** (1541.17) | — | 8 |
| **P31** | `width-invariance` — against the 1600 run as `--baseline`; **the active tab is the stated exception** (grows 8 px at 1600, highlights in place at 390, split at the 900 px line — 1541.53); at 390 the tabs stand flush with the glass (1541.20) | 9 | 2 |
| **P32** | `place-head` — every card on one anchor shows one first line | 1 | 6 |
| **P33** | `one-home` — at most one element per `data-fact` role: `place`, `pill`, `outcome`, `author`, `previous`, `price` | 3 | 2 |

Outside card-audit: **`raw-value`** becomes a `copy-check --walk` rule (stage 0, strict at once — nothing should print *undefined* today, and bug 1 shows something does); **`state-only`** (slot builders import nothing but the state and the copy table) and **`style-lint`** (type tokens, the 4 px grid, an allow-list with reasons — finding 1541.41) become `spec-check` rules (stage 1); **`render-hold`** becomes a walk, `scripts/render-hold-walk.mjs`, in CI's `repros-b` group (stage 9).

**Where they run.** card-audit runs today only in the sprint tier (`sprint.yml`). A guard CLAUDE.md names must be one a workflow runs at the push, so stage 0 adds a fast strict pass — `card-audit --strict --kinds=<GRAMMAR_KINDS>` at 1600 and 390 over the fixture walks only — to CI's `probe` job. It costs the `probe` job about three minutes; the full audit stays in the sprint tier.

**Opening from a scroll that allows compensation.** The probes and today's audit open cards from scroll 0, where the top of the document is the page-top case of P13 (the first line moves down). P13 therefore opens each card twice: once scrolled so the label room can be made above it (the general rule, 0 px), and once at the document's top for the band's first card and the first clause (the stated case). The probes keep opening from scroll 0 — their references simply freeze the stated case.

## 3. The probe references, and why each stage re-freezes

The two probes (`session-probe.js`, `setup-probe.js`) diff the page against a frozen copy in `design/reference/`; `copy-check` diffs every string against two goldens; `founding-golden` diffs the founder's walk. They exist to catch **unintended** change. Every stage below changes cards **on purpose**, so every stage ends with `npm run qa:freeze` — and the rule that makes that safe: **the reference diff is read before it is frozen, and a change in a family the stage did not touch is a bug, not a re-freeze.** A stage never freezes twice; a fix after the freeze goes into the next stage's diff.

| reference | moves when | stages |
|---|---|---|
| `design/reference/` (setup-probe) | any band card's DOM | 1, 2, 3, 4, 5, 7, 10 |
| `design/reference/` (session-probe) | any charter card's DOM, the fixture | 0, 1, 6, 7, 8, 10 |
| `card-copy.golden.json` (`copy-check --walk`) | any rendered string | every stage from 1 |
| `copy-source.golden.json` | `design/copy.js` | every stage that adds the Part 4 words its kinds draw |
| `founding-walk.golden.json` | the founder's order, rail and card strings | 3, 5 |

**No STYLE pass stage.** 1541.27's pass was held as the STYLE walk (1541.55), and Ed has answered it one word at a time (answers Part 4). Each stage writes into `design/copy.js` the Part 4 words its kinds draw, and amends STYLE (T3, §3's last sentence, T18's grant exception) where its kinds are the ones those rules govern. Words the answers do not give — the power cards' clauses naming their subject (1541.48) — are the stage's to draft through STYLE and put to Ed before the freeze; 🍾's label is today's title (answers Part 6.8).

## 4. Stages

| # | Stage | What it makes measurable | Size |
|---|---|---|---|
| 0 | ☐ **Measure and guard, no member-visible change** | today's counts under the checks as ruled, checked in; the fast strict pass wired | S — 1 session |
| 1 | ☐ **CardState, the shell and the space above**, two read-only pilots | one shell, one state; a card opens with its label above and nothing on screen moves; the pilots pass P13–P33 strict | L — 3–4 sessions, 1 QA |
| 2 | ☐ **Read-only and acknowledgement cards** | OK means owed; no close-only OK; *Accept* on the grants and 💡 ⚖️ | M — 2 sessions, 1 QA |
| 3 | ☐ **The band's settings** (3a settings and the birth; 3b 🪪 🤝 🎩, power cards, the composer) | the standing pill on the first line; bugs 1 and 3; unaccepted powers draw no commit | XL — 5–6 sessions, 2 QA |
| 4 | ☐ **Motions, 👑 and settled motion records** | outcome labels on records; bugs 7 and 8 | M — 2–3 sessions, 1 QA |
| 5 | ☐ **Doors and people** | the asks; O9's sentences; ✋ 🖼️ frozen at the close | M — 2 sessions, 1 QA |
| 6 | ☐ **The charter's judgment cards** | the tab you click does not move, on the charter; the phone's flush tabs | L — 3–4 sessions, 1–2 QA |
| 7 | ☐ **Records, the backlog and the closed page** (and the one host change) | the closed page offers only 🥂 and carries no powers; bugs 2, 4, 5 | L — 3 sessions, 1 QA |
| 8 | ☐ **Edit mode, the proposal row, the phone's drawers** | overlays never cover text, the 📝 door excepted; bugs 9, 10 | M — 2 sessions, 1 QA |
| 9 | ☐ **Keyed re-render** (principle 10) | `render-hold` green | L — 3–4 sessions, 1 QA |
| 10 | ☐ **Retire and fold** | the old shells gone; every guard strict; the principles in SURFACE | S–M — 1–2 sessions |

### Stage 0 — Measure and guard (no member-visible change)

- **Build:** P13–P33 in `design/tools/card-audit.mjs`, report mode, **to `checks.md`'s *checks as ruled*** (P13's on-screen measurement from both scroll positions, P16 `space-above`, P17 `strip-floor`, P21's one-label rule, P22–P24's revised job and bin rules, P26's kept drawings, P29 `closed-powers`, P30's door exception, P31's active-tab exception); `GRAMMAR_KINDS` (empty); `raw-value` in `copy-check --walk`, **strict**; the fast strict pass in CI's `probe` job; the fixture's closed page closed the way a live one is (finding 1541.42: no unjudged pairs, no park awaiting assent, no open ⏱️ motion — `design/fixture-session.js`). Copy `answers.md`, this file, `grammar.md` and `checks.md` into `design/redesign/` (§0).
- **Acceptance:** for every check **unchanged** by the answers (`head-registration`, `head-form`, `hairline-gap`, `empty-slot`, `slot-order`, `row-vocabulary`, `closed-page`, `raw-value`), card-audit's report reproduces `checks.md`'s *today* column within the fixture change's difference, at both widths, the difference explained line by line; for every check **revised or replaced**, the report's count is written into `checks.md`'s *today (as ruled)* column as the new baseline, with the cards it names; `raw-value` red on bug 1's record is recorded as the one known failure, fixed in stage 3 (the walk that reaches it is the ladder's constitution rung, so it is asserted there, not in the fixture pass); the eight gates green.
- **Re-freeze:** session-probe (the fixture changed) — its diff should touch the closed page only.
- **Docs:** CLAUDE.md glossary — `card-audit` gains P13–P33's pointer; *Gotchas* unchanged.
- **Waits:** nothing but other edits to `card-audit.mjs` and `fixture-session.js`.

### Stage 1 — CardState, the shell and the space above, with two read-only pilots

- **Build:** `design/card-state.js` — `stateOf(key)` and its readers `placeOf` (phase inside it, so a closed document's paragraph has no powers line — 1541.52), `provenanceOf` (the **one** reader of who chose a rule, for the standing pill — 1541.5 (b)), `powersOf`, `actsOf` (one function over the `may*` family with `phase` inside, 1541.19 (a); an act for a power not yet accepted is **absent**, not dark — Part 4 .19), `alternativesOf`, `outcomeOf`, each the **only** reader of its fact. `design/card-shell.js` — the slots and the strip; the **label slot** above the first line and on each block's first line (1541.45, .46); **`space-above`**, the opening geometry (1541.44): the label room is inserted above the first line and the scroll adjusted in the same frame, on open, on a switch within a strip and across strips (the old card's room removed in the same frame) and on close, with the page-top case moving the first line down by the shortfall; the scroll adjustment is written against `card-morph`, the rail's travel (`bringIntoView`, `scrollToCard`, M17) and the task sheet at 390, and browser scroll anchoring is ruled out explicitly (`overflow-anchor: none` on the column, or measured to agree) so the compensation is never applied twice. H1's hairline table; the six row shapes; **`dark furniture`** in the row (the bin drawn dark wherever it can ever have a job, lit when it has one — 1541.9; notes only for `drip`, `voice-out`, `readiness` — Part 4 .17–.22); the card floor kept (1541.16 (c)); presence predicates exported for P19. Tokens in `design/system.css`: `--card-inset`, `--slot-gap`, `--block-pad`, `--hair`, and `.glab`, **the one label drawing at `--t-cap`, 700, upper case, `--muted`** (Part 4 .27), the label slot's height growing with it — no `--card-top` inset (the room is made, not borrowed). **Pilots:** the stranger's settled rule card (band: *Current rule*, the standing pill as a fact with no radio, no row) and a filed sealed record on the charter (*Passed · ‹longWhen›* in `--ok`, the field's block labels *Proposed · 23%*, no row) — two read-only cards with no draft, one on each side of the one shell, so `space-above` is proved on the band and the charter at once; every other kind still by today's builders. `state-only` and `style-lint` in `spec-check`, `state-only` scoped to the new files. The pilots' Part 4 words (.3, .4, .12) into `design/copy.js`.
- **Acceptance:** `stateOf` tested over every epoch of the fixture and the ladder (a node test in the `ci` job, the state compared with what today's builders derive — a disagreement is a finding, not a pass); the pilots strict on P13–P33 at both widths, **P13 from both scroll positions**; a pilot opened, switched to another pilot across strips, and closed leaves the window's scroll where compensation says and the pressed tab at 0 px; everything else in the probes 0 deltas; **`clock-check`'s hand-kept load order and session-view.html's script-tag block both list the two new files** (the 2026-09-14 gotcha: a file session.js newly makes at load reddens clock-check and nothing else); `spec-check`'s glossary rules resolve the new `[file]` entries; `toc-travel` and `drawer-walk` green (the scroll is theirs too).
- **Re-freeze:** copy goldens (the pilots' words); setup-probe and session-probe for the pilots.
- **Docs:** SURFACE §9's *"two implementations of one shell"* restated as one; the stranger's-card and filed-record rows for the pilots; **no principle enters SURFACE yet** (a rule the tree does not hold is not written as held — each enters at the stage in §4's table below that makes it true). CLAUDE.md — glossary entries `card-state`, `card-shell`, `label slot`, `space-above`, `dark furniture`, `row shapes`; *Load order* updated.
- **Waits:** any other work in `design/system.css`, `design/copy.js`, `design/session-view.html`'s script block, and anything that scrolls the page (`session.js`'s `smoothScrollBy`, the task sheet).

### Stage 2 — Read-only and acknowledgement cards

- **Kinds:** news of a change, failed-motion news, and the four live-only news families (release batch, amendment news, mail give-up, departure news — never reached in phase one); the grants and the gates 💡 ⚖️; the park; 🍾 in every state (**converted here with today's title as its label** — answers Part 6.8, Ed 2026-09-25, reversing this plan's earlier wait on Q1542; the Q1542 session reworks it again); the stranger's read-only cards.
- **Rulings landing:** no row where nothing is owed; close by tab, outside click or Escape (1541.8 (a)), **with the 390 exit measured first**: a phone walk that closes each read-only card by tapping outside, asserting it closes and nothing beneath is pressed; no bin on these kinds, since none of them can ever give it a job (1541.9); *Accept 🏛️* (1541.24 (a)); the grants' labels *Accept Founder Actions* · *Accept the Founder Veto* · *Accept Constitutional Proposals* (Part 4 .23); **💡 and ⚖️ drawn like grants** — labels *Accept Proposals* · *Accept Voting*, the button *Accept ✏️* / *Accept ⚖️* in place of OK (Part 4 .24; they already gate the power through `mayPropose`/`mayJudge`); 🍾's dark note *Waiting for x members to answer questions.* (Part 4 .22); news labels *Current rule* / *Current text* and *Previous rule* / *Previous text* (Part 4 .1, .3, .11).
- **Acceptance:** strict P13–P33 on the kinds at both widths; **the four live-only news families opened on a live document** by a new walk that performs the act each needs (a power laid down after 🍾, a ✒️ decree, `/api/dev/outbox/give-up`, a departure) and asserts each card's slots — the first time any audit has seen them; `journey`, `member-questions-walk`, `after-begin-walk`, `powers-walk` green; a member who has not accepted 💡 finds no ✏️ commit drawn anywhere (Part 4 .19, asserted by `journey`'s grant line).
- **Re-freeze:** setup-probe; copy goldens.
- **Docs:** SURFACE §9.1's OK row and CP9's second half (close-only OK gone), K2's closed row (moot until stage 7, amended here to say so), T18/T44 (*Accept 🏛️*; T18's grant exception extended to 💡 ⚖️), §9's news, grant, gate, park and 🍾 rows, F4/F8 for the gates' Accept.
- **Waits:** `design/band.js` (the grant, gate and 🍾 bodies), `design/begin.js`, `design/setup.js`.

### Stage 3 — The band's settings

The largest stage and the centre of the breaks, split in two so a QA round sits between.

- **3a — kinds:** every settings card (founder, pen, watching, blind answer), the birth (🪶 📍 📧). **3b — kinds:** 🪪 🤝 🎩, the power cards, the settled card as composer (K1).
- **Rulings landing:** every card starts with its line (1541.3 (a)) — **the first line is the standing rule and wears the standing pill; the other options follow below a hairline; choosing the first line's radio again cancels a proposed change; the rule is said once** (1541.5 (b), .47); the label *Current rule* above it (1541.46 (a), Part 4 .3); the powers line dropped from the settings card's first line (1541.10 (a)); *Set to / Set by* gone (1541.14 (a)); unchosen settings options not drawn where nobody can choose (1541.6 (a)); **the reason box always shown on a card that can take a change** (1541.21 (b) — grammar B13 is not built); the bin drawn dark from the start and lit once a draft starts (1541.9); **the founder's ✒️ not drawn at all until Founder Actions is accepted** (Part 4 .19, overriding Y19's dark ✒️); dark notes only for the ✏️ countdown and 🏛️ in use (*You can only make one constitutional proposal 🏛️ at a time.*, Part 4 .20–.21); the card floor kept (1541.16 (c)); no 4 px under band subsection headings (1541.15 → the headline ruling). **3b's power cards** (1541.11, .48): the label is the card's ask, today's title (*Can the Founder Make Amendments at Will?*, Part 4); the first line is **this power's own clause, naming its subject** (*The Founder may amend the proposal rate at will.*), wearing the pill; the other state below with *Choose this*. 🎩's label *Is the Founder a Member?* while asked.
- **Fixes:** plain bug 1 (*Set to undefined*, 1541.29) and bug 3 (two choosers, 1541.31) — both by construction, since the first line is the document's own sentence and `provenanceOf` the one reader of the pill; finding 1541.33 on these kinds (the reasons as Part 4 has them); finding 1541.35 by `space-above`.
- **New copy:** one power clause per power-holding setting, naming its subject, in the form of 1541.48's example — drafted through STYLE and put to Ed as one list before 3b's freeze (§3).
- **Acceptance:** strict P13–P33 on the kinds; `raw-value` green on the ladder's constitution rung for seat `m-1` (bug 1's record); `founding-walk`, `founding-walk --takeback=applications` and `=chamber`, `founder-answers`, `slug-walk`, `slider-walk`, `powers-walk`, `rate-motion` (the composer, sixteen scenarios — the walk re-chooses the pill to cancel a change in a new scenario), `member-questions-walk`, `seat-matrix` both hats — all green; the 🪶 worked example (grammar §6.1, **as amended**: label *Current rule*; first line the rule wearing *Chosen by the Founder ✒️* as its pill; no fact line; the reason box shown; the bin dark; ✒️ ✏️ dark with no note) matches slot for slot.
- **Re-freeze:** setup-probe; founding golden; copy goldens — at the end of 3a and again at 3b, each diff read.
- **Docs:** SURFACE CP2 (the pill on the first line, the rule said once — 1541.47), CP3 (the reason box always shown), CP11 (settings rungs), F15's first half, Y19 (no dark ✒️ before the grant), §8's hat exception row, K4 (the power card's pill and other state — 1541.48), §9's setting, blind-answer, watching, composer, power-card, 🪪, 🤝 and 🎩 rows; STYLE T3's middle clause, T21 (the lockline goes), §3's last sentence (the card drops the powers line), T48 (its labels, now the pill on the first line); CLAUDE.md's `commit row` entry, glossary `standing pill`, *Gotchas* entries whose mistake the new guards now catch reduced to one line each (the eviction rule, Q736).
- **Waits:** `design/band.js`, `design/setup.js`, `design/session-view.html` (the `VALUE`/`provOf`/`ctx.lockline` readers leave), `design/system.css`. **No other band work** for the stage's length — the founding, the powers and the composer are all in it.

### Stage 4 — Motions, 👑 and settled motion records

- **Kinds:** constitutional and ordinary motion cards (mover and not), 👑 (Text and rule, the Founder and others), settled motion records, failed-motion news if not already in stage 2.
- **Rulings landing:** the rule card's form from stage 3 (first line the standing rule with its pill, *Current rule* above); block labels *Proposed*, *Proposed by ‹name›* where signed (the face stays on the rationale's disc), *Proposed by you* (Part 4 .8–.10); a record's label its outcome · `‹longWhen›` (*Passed* and *Changed by the Founder* in `--ok`), *· since replaced* where the rule has moved on, *Previous rule* on what it replaced, a failed motion's wording under its live label with the outcome said once above (Part 4 .4, .5, .11, .13 — Q1522's outcome-first kept); 👑's label *Accept This Change?* (Part 4 .26 — but see §6 on .3); no bin on 👑 (it can never have a job there); the mover's withdraw a bare 🗑️ (1541.9 (b)); ✓ accent blue when armed (1541.50).
- **Fixes:** bug 7 (1541.37 — a block nobody may choose has no radio), bug 8 (1541.38 — 👑's green ✒️ drawn as every glyph commit, 1541.50; the 💡 front tab), finding 1541.43 (SURFACE's *Keep this* → *Prefer this*).
- **Acceptance:** strict on the kinds; the `motions` CI group, `rate-motion`, `powers-walk`, `room-walk`'s 🛡️ park-and-crown, `journey` green.
- **Re-freeze:** setup-probe; copy goldens.
- **Docs:** SURFACE §9's constitutional, ordinary-motion (*Prefer this*), 👑 and settled-motion-record rows, CP5's bin (gone), M12's *a dateline row lower* (gone — the label is in the room made above).
- **Waits:** `design/band.js`, `design/session-view.html` (`motionCard`, `motionCardsFor`).

### Stage 5 — Doors and people

- **Kinds:** ✉️ ❌ 🌂, ✋ 🖼️ 📧, `adm:` admission cards, the applicant's five and the stranger's two (placeless — they head with their title).
- **Rulings landing:** labels as asks, today's titles unchanged (*Choose Your Name*, *Leave the Membership* …, Part 4; 1541.46 (a)); the empty-list sentences in the document and on the card (1541.25 (a)); ✉️'s reason box always shown (1541.21 (b)) and its bin dark until an address is typed (1541.9); ✉️'s ✒️ and 🏛️ dark over the empty box with no note (Part 4 .18); a submitted application's withdraw the bare 🗑️ (1541.9 (b)); ✋ 🖼️ frozen after the close (1541.28 (a)) — the rule built here, asserted on the closed page in stage 7. No 4 px under the subsection headings (1541.15).
- **Acceptance:** strict on the kinds; `invite-walk`, `applicants-walk` at all three prices (the only walk that reaches the applicant's five — it gains slot assertions), `picture-walk`, `seat-matrix` both hats, `drawer-walk` at 390 green.
- **Re-freeze:** setup-probe; founding golden (✋ 🖼️ 📧 are served at the save); copy goldens.
- **Docs:** SURFACE §9's ✉️ ❌ 🌂 identity and `adm:` rows, E31–E33 if a sentence moves; the band's empty-list sentences in `design/copy.js`.
- **Waits:** `design/band.js`, `design/door.js`, `design/setup.js`.

### Stage 6 — The charter's judgment cards

- **Kinds:** quick, insert (gap), race, ⏳ judged pair, deadlock, patch, the diagonal (reached by a new walk that serves one, since the fixture's is unserved), mine, stranded, the park on the charter.
- **Rulings landing:** the label above the first line in the room `space-above` makes (1541.4 (c) read with the headline ruling — *the tab you click does not move* becomes true, finding 1541.32): *Current text* on a clause and a gap (first line *(no text here)*), *Current text* on the deadlock (*still standing* goes), *Current text · 2 of 3* with ↑ ↓ on a multi-place proposal (Part 4 .1, .2, .6, .7); block labels *Proposed* / *Proposed by ‹name›* / *Proposed by you* on the block's first line (1541.45); no bin on judgment cards (it can never have a job there) and the author's withdraw the bare glyph (1541.9 (b)); today's drawings kept, ✓ accent blue when armed, a recorded ✓ as today, a vote on changed wording as today (1541.13 (c), .50); the deadlock desk's reason box always shown (1541.21 (b)); no *last changed* line (1541.26 (a)); **at 390 the tabs stand flush with the glass's left edge and the card takes the width they free** (1541.20 (a), narrowed further by Ed's note); **the active tab grows 8 px at 1600 and highlights in place at 390**, split at the 900 px line (`NARROW_Q` and system.css's literal agree — 1541.53).
- **Acceptance:** strict on the kinds; **P13 at 0 px on every charter card at both widths from a compensable scroll** (today 33–99 px), and the page-top case on the first clause; `journey` (every line, `--delegate-all` too), `focus-steal --lane` and `--gap`, `poll-race`, `stale-key`, `wrong-line-room --case=shapes` and `=record`, `overlapping-sites`, `head-insertion-aim`, `first-keys-walk`, `drawer-walk`, `toc-travel`; card-audit's R1/R2 (queue-card stack, stranded red) and P9–P11 unchanged; P31 with the active-tab exception.
- **Waits on Ed's rulings on Q1549 and Q1550** (2026-09-25): the rationale at the top of each proposal block, and comments with votes — both change these cards' shape, so the stage does not start until both are ruled.
- **Absorbs Q1369** (Ed, 2026-09-25: *add to redesign*): the 🔥 tab and the clause tab on an open race card — a 30px gap, the card's edge cutting the tab, seen on a live race under the 📝 riding tab and never reproduced on the fixture. Acceptance adds a measurement on a **live** dev-server document with `#ridetab` present, 1600 and 390: no gap between the strip's tabs, no tab cut by the card's edge; the question is deleted when it passes.
- **Re-freeze:** session-probe; copy goldens.
- **Docs:** SURFACE C1 (now true), C4 (the bin's new rule), CP7, M12 (the active tab's two drawings), M19 (*Current text* over *(no text here)*), §9's quick/insert/race/⏳/patch/deadlock/mine rows, §9.1's ✓ row (*accent blue when armed*; *the one solid green on a card* corrected — 1541.50) and 🗑️ row; `design/MOBILE.md`'s tab margin; CLAUDE.md's `clause-head`, `clause-tab`, `decision card`, `proposal-block` entries; card-audit P2's comment accepting the vertical drop deleted.
- **Waits:** `design/session.js` (`suggCardHtml` retires here), `design/cards.js`, `design/composer.js`, `design/live.js`'s `itemsFromView` if a field is added, the narrow block of `design/system.css`. **No charter or composer work** for the stage's length — this is where most of the project's recent live-room fixes live, and the walks above are their guards.

### Stage 7 — Records, the backlog and the closed page

- **Kinds:** sealed record, backlog, 🥂, every card as the closed page draws it; the closed page's tabs, rail and topbar.
- **Rulings landing:** a closed card offers nothing but 🥂, whose signature also answers every OK owed (1541.7 (a)); what the close cut off stays readable, each proposal under its live label + *· Ran out of time* (Part 4 .14), a record that ran out labelled *Ran out of time · ‹longWhen›* (.4); **the powers lines leave every paragraph and card and the ✒️ 🛡️ tabs leave every strip; 👑 stays on the Founder's face and 🍾 keeps its table of the powers kept at the start** (1541.34, .52 — no past-tense power clauses are built); labels *Final text* on a text card and *Rule at the close* on a rule card (Part 4 .15, .16); a losing wording on a record *Proposed · 23%* etc. (.12); 🥂's label *Add your closing comment*, the input's own label not drawn (.25); 🥂 states the moment once (1541.23 (a)); unchosen settings rungs not drawn (1541.6 (a)); ✋ 🖼️ frozen (1541.28 (a)).
- **The host change:** 1541.7 (a) — `packages/constitution`'s close acknowledgement discharges every OK owed at the close in 🥂's one press (`acknowledgeClose` with `owed.ts`), the rail's owed entries leaving with it; unit tests beside `owed.ts`; the golden log must replay unedited (a fold change, not a new event, if it can be; if it needs an event, that is a question for Ed before the stage starts). **A module change, so a full deploy, not surface-only** (1541.56).
- **Fixes:** bugs 2 and 4 (1541.30 — including the topbar's ✏️ countdown stopping on a closed document), bug 5 (1541.23), finding 1541.34.
- **Acceptance:** P27–P29 strict on **every** kind (the closed page is every card); the ladder's `closed` rung asserts no enabled control but tabs and 🥂 for founder, member and stranger, and no powers line or ✒️ 🛡️ tab anywhere; `seat-matrix --to=closed`; `journey`; the host refuses nothing the page offers on a closed document (a walk that presses everything enabled and reads the error log).
- **Re-freeze:** both probes (`&closed=1`); copy goldens.
- **Docs:** SURFACE C9 (restated), K2, §9's sealed-record, backlog and 🥂 rows, the settled-record row's OK-after-close sentence, the closed page's powers (`closedBlocks`); STYLE for *Ran out of time* replacing *Undecided …*; SPEC only if the close acknowledgement's meaning changes (Ed's sign-off and a version bump); CHANGELOG notes a host change.
- **Waits:** `packages/constitution` (owed and close), `design/session-view.html`, the topbar in `design/wallets.js`. **A full deploy, not surface-only** — schedule it outside any live room.

### Stage 8 — Edit mode, the proposal row and the phone's drawers

- **Kinds and zones:** the editing card, the proposal and patch rows, the contents drawer at 390. **The 📝 door keeps today's placement and may overlap** (1541.17: *the fact that it sometimes overlaps things is what makes it stand out*) — it is not converted, only named as `zone-overlap`'s exception.
- **Rulings landing:** one ✏️ in edit mode, the row's (1541.22 (a) — grammar B9); **the contents drawer full width at 390** so the lifecycle marks can be seen (1541.40, .54).
- **Fixes:** bug 9's overlap (1541.39), bug 10 (1541.40, by the full-width drawer). **Plain bug 6 is not a bug** (1541.17) and is not fixed.
- **Acceptance:** P30 strict at 1600, 1240 and 390 (an overlay covers no text and no control; the 📝 door excepted by name); card-audit D1–D4 (the door) unchanged; `journey`'s edit lines, `crlf-paste`, `heading-marker`, `first-keys-walk`, `drawer-walk` (the drawer's width asserted), `toc-travel` green.
- **Re-freeze:** session-probe; copy goldens.
- **Docs:** SURFACE §9's editing row and §9.1's ✏️ row (D11 (2) resolved for Q1382), K13/K17 if the row changes, the 📝 door's overlap stated as sanctioned; `design/MOBILE.md` (the drawer's width).
- **Waits:** `design/edit-mode.js`, `design/composer.js`, `design/flights.js`, the narrow block of `design/system.css`.

### Stage 9 — Keyed re-render (principle 10)

- **Build:** every slot and control keyed (card id, slot, block or control id) by the shell; renders patch in place and never replace a node holding focus, a caret or selection, pointer capture, a scroll offset or an unsent value (U1, U2) — and never re-run `space-above`'s compensation for a card already open. A dev switch in the manner of `Session.memo` — `?render=replace` restores wholesale replacement — so the two can be compared on any walk. The deferral flags (`pressInFlight`, `dateInFlight`, `heldCaret`, `penHold`, `SESSION.holding`) are retired **only** where `render-hold` proves the shell covers their case.
- **Acceptance:** `render-hold-walk` — for each in-flight kind (caret in a lane or the always-shown reason box, a half-typed date, a held commit, a drag, a scrolled picker grid, an open select) on an open card, a forced poll and a room event, the node is the same node and its state intact, and the page's scroll unmoved — green, in CI; every walk from stages 2–8 green with the flags retired.
- **Size and risk:** the riskiest stage. It touches how every card is drawn; its regressions look like the 22 render gotchas, which is why the walks that guard those are its acceptance.
- **Re-freeze:** none expected (the DOM should not change); a probe difference is a bug.
- **Docs:** SURFACE W9 restated as U1; principle 10 enters SURFACE's opening; CLAUDE.md *Gotchas* — the render-lifecycle post-mortems whose flags retire move to DECISIONS, reduced to one line naming `render-hold`.
- **Waits:** everything in `design/` that renders. **Nothing else ships on the surface** during this stage.

### Stage 10 — Retire and fold

- **Build:** delete today's shells and their helpers (`cardHtml`'s frame, `commitBarHtml`'s spacer, the 41 `binBtn()` sites, `readBody`, `VALUE`, `provOf`, `ctx.lockline`); `GRAMMAR_KINDS` becomes *all*; `no-job`'s driven form (press every enabled control on every card, require a command or a draft change); `one-home`'s `data-fact` roles on every fact.
- **Acceptance:** card-audit strict on every kind in the sprint tier and the fast pass; the full walks job green; `state-only` over every slot builder.
- **Re-freeze:** both probes, copy goldens (a last, empty-diff freeze proves the deletions changed nothing a member sees).
- **Docs:** SURFACE §9 read end to end against the page (each row now one line of what is particular to its card); the principles not yet in SURFACE enter its opening, each naming its check (table below); CLAUDE.md glossary pruned (the retired names into *Retired names*); `design/DECISIONS.md` gets phase one's reasoning (grammar §0, §7, §10) and the answers' (answers.md, verbatim) as dated sections; `design/redesign/` keeps grammar.md as the reference.

### When each principle enters SURFACE

The ten principles are answers Part 5's (1541.51, *take all ten as drafted*). Each enters SURFACE's opening **at the stage whose acceptance makes its checks strict on every kind it governs**, naming its check — never before.

| principle (answers Part 5) | its checks | enters at |
|---|---|---|
| 1 a card opens in place of its line | P14, P15, P20, P32 | 10 |
| 2 opening moves nothing you are looking at | P13, P16 | 10 |
| 3 every fact has one home | P33 | 10 |
| 4 a card offers only what this reader can do now | P27–P29, P22 (the unaccepted power) | 7 (the closed half); whole at 10 |
| 5 dark furniture | P22–P24 | 10 |
| 6 no empty frames | P17–P19, P12 | 10 |
| 7 each drawing means one thing | P26 | 10 |
| 8 one commit row | P23–P25 | 10 |
| 9 the same thing drawn the same way | P21, P31 | 10 |
| 10 nothing in hand is taken by an update | `render-hold` | 9 |

Until then, each stage's per-card SURFACE rows say what its cards do.

## 5. Critical files

Where each stage lands. The rule for all of them: **while a stage is open, no other branch edits the files it lists** (two sessions run at once — CLAUDE.md's four rules apply, and a stage's files are claimed in QUESTIONS.md's backlog row for it); engine, server and sim work is unaffected except in stage 7.

| file | what changes | stages |
|---|---|---|
| `design/card-state.js`, `design/card-shell.js` (new) | the one state, the one shell, `space-above` | 1, then every stage |
| `design/system.css` | tokens, the card box, `.glab` at `--t-cap`, the narrow margin and the flush tabs, the active tab's two drawings, the drawer's width | 1, 3, 6, 8 |
| `design/copy.js` | the Part 4 words, stage by stage; the power clauses naming their subject | every stage from 1 |
| `design/band.js` | the band's bodies → slots | 2, 3, 4, 5 |
| `design/setup.js` | `cardHtml` (the band's shell), `readBody` | 2, 3, 5, 10 |
| `design/session-view.html` | `VALUE`, `provOf`, `ctx.lockline`, `motionCard`, the script-tag block | 1, 3, 4, 7 |
| `design/session.js` | `suggCardHtml` (the charter's shell), `renderDoc`'s card pass, `smoothScrollBy` (the compensation) | 1, 6, 8, 9 |
| `design/cards.js` | `commitBarHtml`, the option block's drawing | 2, 6, 10 |
| `design/composer.js`, `design/edit-mode.js`, `design/flights.js` | the editing card, the rows | 6, 8 |
| `design/door.js`, `design/begin.js`, `design/wallets.js` | the stranger's cards, 🍾, the closed topbar | 2, 5, 7 |
| `design/fixture-session.js` | the closed page | 0 |
| `packages/constitution/src/owed.ts` (and its close) | 1541.7 | 7 |
| `design/tools/card-audit.mjs`, `scripts/copy-check.mjs`, `scripts/spec-check.mjs`, `scripts/clock-check.mjs` | the guards | 0, 1, 9, 10 |
| `.github/workflows/ci.yml` | the fast strict pass in `probe`; `render-hold-walk` in `repros-b` | 0, 9 |
| `SURFACE.md`, `design/STYLE.md`, `design/MOBILE.md`, `CLAUDE.md` | as each stage's *Docs* line says | every stage |

## 6. What this plan does not decide

**Ruled — every point below was put to Ed one at a time on 2026-09-25, and his rulings are `answers.md` Part 6 (6.1–6.10), which wins over this section.** In short: 👑's label is *Accept This Change?* while owed, then *Current rule* (6.1); every label, card and block, at `--t-cap` (6.2); the record keeps its participation line and the power card's holder line goes (6.3); "the page top" is wherever room runs out (6.4); close and switch take the room back the same way (6.5); the powers sentence leaves the closed Rules paragraphs as well as the cards and tabs (6.6); the subject-naming clause is the card's only (6.7); 🍾 converts in stage 2 with today's title as its label (6.8); stage 1's second pilot is a filed sealed record (6.9); a cut-off proposal reads *‹live label› · Ran out of time* (6.10). The text below is kept as it was asked.

- **Q1542 — 🍾 before every answer is in.** Ed wants 🍾 reworked so the Founder can begin before everyone has answered; its label is held with it (Part 4). ~~Stage 2 converts 🍾's shell but its label and readiness copy wait on Q1542's ruling; if Q1542 is not ruled when stage 2 starts, 🍾 stays on today's builder and moves to the end of stage 3a.~~ **Ruled 6.8: 🍾 converts in stage 2 with today's title as its label; the Q1542 session reworks it again.**
- **Open readings of `answers.md`**, to be settled before the stage named (**all ruled, Part 6**): whether 👑's label is *Current rule* (Part 4 .3) or *Accept This Change?* (.26), and for whom (stage 4); whether a block's label takes the head label's `--t-cap` drawing or stays at the eyebrow's `--t-micro` (1541.45 against .27 — stage 1); where a record's participation line (*7 of 20 weighed in*) and a power's holder line go now that the pill carries provenance (principle 3 names no home for either — stages 3 and 7); how far "the page top" reaches in P13 (stage 1); the closed document's power line in the Rules paragraph as well as on the card (1541.52 — stage 7, read as *both*).
- **Whether O7 (b)** — the host serving each seat its allowed acts — follows stage 10. It is worth it once the list's shape has held for every family; it is a server change and a question for then.
- **The live-only cards' final drawing.** Four news families, the applicant's five and the diagonal were never inventoried; their stages open them first and may find something the answers did not foresee. That is a finding for Ed, not a stage failure.
