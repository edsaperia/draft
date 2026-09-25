# BUILD.md — the surface redesign, phase two (Q1541)

A working plan in `design/MOBILE.md`'s shape: stages are checked off as they land, each with its acceptance criteria, its guards, its re-freezes, the document edits it carries and what must wait while it is open. Written 2026-09-25 at the end of phase one, from `grammar.md` v2, `checks.md`, `diagnosis.md` and `questions.md`. **Nothing here starts before Ed's answers to 1541.1** (go ahead at all), and the stages assume the recommended answer to every other question in `questions.md`; where an answer goes the other way, the stage it names changes, and this file is amended before that stage starts.

**Precedence.** SURFACE.md wins until it is amended, and STYLE.md for every string. The answers to `1541.n` amend SURFACE and STYLE, and each amendment lands **in the stage that changes the cards it governs** — never ahead of the code (spec-check would be red) and never after it (SURFACE would describe a page that no longer exists). `grammar.md` is the design reference, not a rule file; where it and an amended SURFACE disagree, SURFACE wins. CLAUDE.md wins on process.

## 0. What merges, and what never does

The phase-one branch `redesign` is **never merged and never pushed**. The repository is public, and the branch carries **~36 MB of screenshots** (`design/proposal/shots/`, 884 files), a 4.8 MB `inventory.json`, the gitignored `data/` dumps, the prototype (`proto/`, a sorter over today's markup that grammar §10 says to throw away) and the review page's image copies. **None of that reaches main.**

Phase two is cut **fresh from main**. It brings **code and docs only**:

- the three rule-bearing documents, copied into `design/redesign/` in the stage-1 commit: `grammar.md` (the reference), this file, and `questions.md` with Ed's answers written in;
- `checks.md` and `diagnosis.md`'s summary and plain-bugs list, as the baseline the guards are measured against (text only, no image links that would dangle — they are rewritten to name the walk and card key instead);
- the checks themselves, **re-implemented** in `design/tools/card-audit.mjs` (stage 0), taking `design/proposal/tools/grammar-audit.mjs` as the specification, not as a file to copy.

Everything else stays on `redesign` for as long as Ed wants the review page's sources.

## 1. The shape of the work

The diagnosis's causes, and the grammar's answer to each, fix the order:

1. **One description of the card's state** (`CardState`, grammar §2.1) before any card uses it — stage 1.
2. **Families by risk**, lowest first: cards with nothing to type and one button (stage 2); the band's settings, where the breaks concentrate (stages 3–5); the charter, where the composer and the judgments live and the live walks are densest (stage 6); the closed page, which needs the one host change (stage 7); edit mode (stage 8).
3. **Keyed re-render last** (stage 9, 1541.18 (a)), once every card leaves through one shell and has stable slot keys.
4. **Retire and fold** (stage 10).

**The conversion is the cost.** About 40 card bodies — every `BODY` entry in `design/band.js`, the per-kind builders in `design/session.js`, `design/setup.js` and `design/session-view.html` — are rewritten to read one `CardState` and fill slots. The shell, the tokens and the checks are perhaps a fifth of the work. Estimates below are in **builder sessions** (one subagent build, as in the 2026-09-22 P1 batch) plus **Ed's QA rounds**; the programme as planned is **27–32 builder sessions and 10–11 QA rounds** (the stage table's sizes, summed), which at the project's pace is **four to six weeks** of calendar time with other work continuing around it. About two thirds of the sessions are stages 3–7, the conversion proper.

**Every stage ends the same way:** the eight `ci` gates green; `journey` green; the walks the stage names green; card-audit strict on the stage's kinds at both widths; `npm run qa:freeze` with the reference diff read (below); the SURFACE/STYLE/CLAUDE.md edits committed; a CHANGELOG section; and a deploy **only on Ed's word**, never during a live room.

## 2. The guards

Each check from `grammar.md` §5 becomes a numbered card-audit check, continuing after P12. In stage 0 they all run in **report mode**; from the stage that converts a family, they run **strict for that family's kinds** — card-audit gains a `GRAMMAR_KINDS` allow-list that each stage extends, so a converted card can never slide back while unconverted cards are not yet held to rules they cannot meet.

| card-audit | grammar check | holds | strict from |
|---|---|---|---|
| **P13** | `still` — the pressed tab, the head's first line, the sheet's edges, the column, the topbar and the contents rail move 0 px on both axes on open, switch (within and across strips) and close; supersedes P2's one axis, P7 kept inside it | P2, G1 | each family's stage |
| **P14** | `head-registration` — head text equals the closed paragraph's (P1's four exceptions stated in the check) and lands on its first line | P1, S2 | 2 |
| **P15** | `head-form` — nothing in the card's flow above the head | G2, L2 | 2 |
| **P16** | `top-edge` — the card's box never over the ink above; the head label inside the top inset | G5 | 2 |
| **P17** | `strip-blank` — no more than 30 px of empty box under the last slot | G6 | 2 |
| **P18** | `hairline-gap` — every hairline between two drawn slots, per H1's table (P12 kept) | H1 | 1 |
| **P19** | `empty-slot` + `presence` — no empty slot; drawn slots equal the shell's predicate | L1 | 1 |
| **P20** | `slot-order` | L1 | 1 |
| **P21** | `label-slot` — the vocabulary, one place | §2.3a | 2 |
| **P22** | `no-job` — static form (every dark control carries a reachable `data-until`); the driven form (press it, see a command) added in stage 10 | J1 | 2 |
| **P23** | `note-visible` — every dark commit's reason as visible text | J1, P5 | 2 |
| **P24** | `bin-job` — 🗑️ present exactly when J2's predicate holds, read from `CardState.draft` | J2 | 2 |
| **P25** | `row-vocabulary` — every row one of the six shapes | §2.6 | 2 |
| **P26** | `role-drawing` — no pressed radio off a live lane, no green button, solid accent only on an owed OK/Accept | R1 | 2 |
| **P27** | `closed-page` — nothing enabled but the tabs and 🥂 | P4 | 7 (report before) |
| **P28** | `closed-keeps-content` | P4 | 7 |
| **P29** | `closed-tense` | P4 | 7 |
| **P30** | `zone-overlap` — zones disjoint; an overlay covers no text and no control | G4 | 8 |
| **P31** | `width-invariance` — against the 1600 run as `--baseline` | G3 | 2 |
| **P32** | `place-head` — every card on one anchor shows one head | P9 | 6 |
| **P33** | `one-home` — at most one element per `data-fact` role | F1 | 2 |

Outside card-audit: **`raw-value`** becomes a `copy-check --walk` rule (stage 0, strict at once — nothing should print *undefined* today, and bug 1 shows something does); **`state-only`** (slot builders import nothing but the state and the copy table) and **`style-lint`** (type tokens, the 4 px grid, an allow-list with reasons) become `spec-check` rules (stage 1); **`render-hold`** becomes a walk, `scripts/render-hold-walk.mjs`, in CI's `repros-b` group (stage 9).

**Where they run.** card-audit runs today only in the sprint tier (`sprint.yml`). A guard CLAUDE.md names must be one a workflow runs at the push, so stage 0 adds a fast strict pass — `card-audit --strict --kinds=<GRAMMAR_KINDS>` at 1600 and 390 over the fixture walks only — to CI's `probe` job. It costs the `probe` job about three minutes; the full audit stays in the sprint tier.

## 3. The probe references, and why each stage re-freezes

The two probes (`session-probe.js`, `setup-probe.js`) diff the page against a frozen copy in `design/reference/`; `copy-check` diffs every string against two goldens; `founding-golden` diffs the founder's walk. They exist to catch **unintended** change. Every stage below changes cards **on purpose**, so every stage ends with `npm run qa:freeze` — and the rule that makes that safe: **the reference diff is read before it is frozen, and a change in a family the stage did not touch is a bug, not a re-freeze.** A stage never freezes twice; a fix after the freeze goes into the next stage's diff.

| reference | moves when | stages |
|---|---|---|
| `design/reference/` (setup-probe) | any band card's DOM | 2, 3, 4, 5, 7, 10 |
| `design/reference/` (session-probe) | any charter card's DOM, the fixture | 0, 6, 7, 8, 10 |
| `card-copy.golden.json` (`copy-check --walk`) | any rendered string | 1 (the STYLE pass, 1541.27 (a)), then every stage |
| `copy-source.golden.json` | `design/copy.js` | 1, and any stage adding a key |
| `founding-walk.golden.json` | the founder's order, rail and card strings | 3, 5 |

## 4. Stages

| # | Stage | What it makes measurable | Size |
|---|---|---|---|
| 0 | ☐ **Measure and guard, no member-visible change** | today's counts, checked in; the fast strict pass wired | S — 1 session |
| 1 | ☐ **CardState and the shell**, two read-only pilots | one shell, one state; the pilots pass P13–P33 strict | L — 3 sessions, 1 QA |
| 2 | ☐ **Read-only and acknowledgement cards** | OK means owed; no close-only OK; accept shape | M — 2 sessions, 1 QA |
| 3 | ☐ **The band's settings** (3a settings and the birth; 3b 🪪 🤝 🎩, power cards, the composer) | the central breaks; bugs 1 and 3 | XL — 5–6 sessions, 2 QA |
| 4 | ☐ **Motions, 👑 and settled motion records** | outcome-first records; bugs 7 and 8 | M — 2–3 sessions, 1 QA |
| 5 | ☐ **Doors and people** | the asks; G5's 4 px; O9's sentences | M — 2 sessions, 1 QA |
| 6 | ☐ **The charter's judgment cards** | the tab you click does not move, on the charter | L — 3–4 sessions, 1–2 QA |
| 7 | ☐ **Records, the backlog and the closed page** (and the one host change) | the closed page offers only 🥂; bugs 2, 4, 5 | L — 3 sessions, 1 QA |
| 8 | ☐ **Edit mode, the proposal row, the 📝 door, the phone's drawers** | overlays never cover text; bugs 6, 9, 10 | M — 2 sessions, 1 QA |
| 9 | ☐ **Keyed re-render** (P10) | `render-hold` green | L — 3–4 sessions, 1 QA |
| 10 | ☐ **Retire and fold** | the old shells gone; every guard strict | S–M — 1–2 sessions |

### Stage 0 — Measure and guard (no member-visible change)

- **Build:** P13–P33 in `design/tools/card-audit.mjs`, report mode, from `grammar-audit.mjs`'s definitions; `GRAMMAR_KINDS` (empty); `raw-value` in `copy-check --walk`, **strict**; the fast strict pass in CI's `probe` job; the fixture's closed page closed the way a live one is (finding 1541.42: no unjudged pairs, no park awaiting assent, no open ⏱️ motion — `design/fixture-session.js`).
- **Acceptance:** card-audit's report reproduces `checks.md`'s *today* column within the fixture change's difference, at both widths, and the difference is explained line by line; `raw-value` red on bug 1's record is recorded as the one known failure, fixed in stage 3 (the walk that reaches it is the ladder's constitution rung, so it is asserted there, not in the fixture pass); the eight gates green.
- **Re-freeze:** session-probe (the fixture changed) — its diff should touch the closed page only.
- **Docs:** CLAUDE.md glossary — `card-audit` gains P13–P33's pointer; *Gotchas* unchanged.
- **Waits:** nothing but other edits to `card-audit.mjs` and `fixture-session.js`.

### Stage 1 — CardState and the shell, with two read-only pilots

- **Build:** `design/card-state.js` — `stateOf(key)` and its readers `placeOf`, `provenanceOf`, `powersOf`, `actsOf` (one function over the `may*` family with `phase` inside, 1541.19 (a)), `alternativesOf`, `outcomeOf`, each the **only** reader of its fact; `design/card-shell.js` — the six slots and the strip, the label slot, H1's hairline table, the six row shapes, presence predicates exported for P19; the tokens (`--card-inset`, `--card-top`, `--slot-gap`, `--block-pad`, `--hair`, `.glab` on `.eyebrow`'s treatment) in `design/system.css`; the STYLE pass over the whole new vocabulary (1541.27 (a)) frozen into `design/copy.js`. **Pilots:** the stranger's settled card and 🍾 settled — two read-only cards with no draft, drawn by the new shell; every other kind still by today's builders. `state-only` and `style-lint` in `spec-check`, `state-only` scoped to the new files.
- **Acceptance:** `stateOf` tested over every epoch of the fixture and the ladder (a node test in the `ci` job, the state compared with what today's builders derive — a disagreement is a finding, not a pass); the pilots strict on P13–P33 at both widths; everything else in the probes 0 deltas; **`clock-check`'s hand-kept load order and session-view.html's script-tag block both list the two new files** (the 2026-09-14 gotcha: a file session.js newly makes at load reddens clock-check and nothing else); `spec-check`'s glossary rules resolve the new `[file]` entries.
- **Re-freeze:** copy goldens (the vocabulary); setup-probe for the pilots.
- **Docs:** SURFACE — the ten principles into the opening (1541.2 (a)), P10 marked *not built*; §9's *"two implementations of one shell"* restated as one; CLAUDE.md — glossary entries `card-state`, `card-shell`, `label slot`, `row shapes`; *Load order* updated.
- **Waits:** any other work in `design/system.css`, `design/copy.js`, `design/session-view.html`'s script block.

### Stage 2 — Read-only and acknowledgement cards

- **Kinds:** news of a change, failed-motion news, and the four live-only news families (release batch, amendment news, mail give-up, departure news — never reached in phase one); the grants and gates; the park; 🍾 in every state; the stranger's read-only cards.
- **Breaks landing:** B6 (1541.8 — no row where nothing is owed; close by tab, outside, Escape, **with the 390 exit measured first**: a phone walk that closes each read-only card by tapping outside, asserting it closes and nothing beneath is pressed); B5 on these kinds (1541.9); O3 (1541.24, *Accept 🏛️*); O6's asks on the grants and 🍾 (1541.12).
- **Acceptance:** strict P13–P33 on the kinds at both widths; **the four live-only news families opened on a live document** by a new walk that performs the act each needs (a power laid down after 🍾, a ✒️ decree, `/api/dev/outbox/give-up`, a departure) and asserts each card's slots — the first time any audit has seen them; `journey`, `member-questions-walk`, `after-begin-walk`, `powers-walk` green.
- **Re-freeze:** setup-probe; copy goldens.
- **Docs:** SURFACE §9.1's OK row and CP9's second half (close-only OK gone), K2's closed row (moot until stage 7, amended here to say so), T18/T44 (*Accept 🏛️*), §9's news, grant, gate, park and 🍾 rows.
- **Waits:** `design/band.js` (the grant and 🍾 bodies), `design/begin.js`, `design/setup.js`.

### Stage 3 — The band's settings

The largest stage and the centre of the breaks, split in two so a QA round sits between.

- **3a — kinds:** every settings card (founder, pen, watching, blind answer), the birth (🪶 📍 📧). **3b — kinds:** 🪪 🤝 🎩, the power cards, the settled card as composer (K1).
- **Breaks landing:** B2 (1541.3), B1 (1541.5), B11 (1541.14), B13 (1541.21), B7 v2 for settings rungs (1541.6), P3 v2 (1541.10), B8 v2 (1541.11), the label slot on band cards (1541.4), G5's 4 px under band subsection headings (1541.15), G6 (1541.16).
- **Fixes:** plain bug 1 (*Set to undefined*, 1541.29) and bug 3 (two choosers, 1541.31) — both by construction, since the first line is the document's own sentence and `provenanceOf` the one reader; findings 1541.33 (dark buttons' reasons) and 1541.35 (top edge) on these kinds.
- **Acceptance:** strict P13–P33 on the kinds; `raw-value` green on the ladder's constitution rung for seat `m-1` (bug 1's record); `founding-walk`, `founding-walk --takeback=applications` and `=chamber`, `founder-answers`, `slug-walk`, `slider-walk`, `powers-walk`, `rate-motion` (the composer, sixteen scenarios), `member-questions-walk`, `seat-matrix` both hats — all green; the 🪶 worked example (grammar §6.1) matches its screenshot slot for slot.
- **Re-freeze:** setup-probe; founding golden; copy goldens — at the end of 3a and again at 3b, each diff read.
- **Docs:** SURFACE CP2 (provenance form), CP3's lane rule, CP11 (settings rungs), F15's first half, §8's hat exception row, K4's power-card exception, §9's setting, blind-answer, watching, composer, power-card, 🪪, 🤝 and 🎩 rows; STYLE T3's middle clause, T21, T48's drawing, §3's *same two lines* sentence; CLAUDE.md's `commit row` entry, *Gotchas* entries whose mistake the new guards now catch reduced to one line each (the eviction rule, Q736).
- **Waits:** `design/band.js`, `design/setup.js`, `design/session-view.html` (the `VALUE`/`provOf`/`ctx.lockline` readers leave), `design/system.css`. **No other band work** for the stage's length — the founding, the powers and the composer are all in it.

### Stage 4 — Motions, 👑 and settled motion records

- **Kinds:** constitutional and ordinary motion cards (mover and not), 👑 (Text and rule, the Founder and others), settled motion records, failed-motion news if not already in stage 2.
- **Breaks landing:** records outcome-first in the head label (Q1522 kept), B5 on 👑 (no bin to close it), B10 on 👑's ✒️.
- **Fixes:** bug 7 (1541.37), bug 8 (1541.38 — the green ✒️ and the 💡 front tab), finding 1541.43 (SURFACE's *Keep this*).
- **Acceptance:** strict on the kinds; the `motions` CI group, `rate-motion`, `powers-walk`, `room-walk`'s 🛡️ park-and-crown, `journey` green.
- **Re-freeze:** setup-probe; copy goldens.
- **Docs:** SURFACE §9's constitutional, ordinary-motion (*Prefer this*), 👑 and settled-motion-record rows, CP5's bin, M12's *a dateline row lower*.
- **Waits:** `design/band.js`, `design/session-view.html` (`motionCard`, `motionCardsFor`).

### Stage 5 — Doors and people

- **Kinds:** ✉️ ❌ 🌂, ✋ 🖼️ 📧, `adm:` admission cards, the applicant's five and the stranger's two (placeless — they head with their title).
- **Breaks landing:** O6 (1541.12) on the personal cards and 🌂, O9 (1541.25), J2's *Withdraw* on a submitted application, the answer to 1541.28 (✋ 🖼️ after the close).
- **Acceptance:** strict on the kinds; `invite-walk`, `applicants-walk` at all three prices (the only walk that reaches the applicant's five — it gains slot assertions), `picture-walk`, `seat-matrix` both hats, `drawer-walk` at 390 green.
- **Re-freeze:** setup-probe; founding golden (✋ 🖼️ 📧 are served at the save); copy goldens.
- **Docs:** SURFACE §9's ✉️ ❌ 🌂 identity and `adm:` rows, E31–E33 if a sentence moves; the band's empty-list sentences in `design/copy.js`.
- **Waits:** `design/band.js`, `design/door.js`, `design/setup.js`.

### Stage 6 — The charter's judgment cards

- **Kinds:** quick, insert (gap), race, ⏳ judged pair, deadlock, patch, the diagonal (reached by a new walk that serves one, since the fixture's is unserved), mine, stranded, the park on the charter.
- **Breaks landing:** the label slot on the charter (1541.4 — *the tab you click does not move* becomes true, finding 1541.32), B5 and J2 across the charter (1541.9), the drawing roles (1541.13), O4's narrowed margin at 390 (1541.20), O5 (no line, 1541.26).
- **Acceptance:** strict on the kinds; **P13 at 0 px on every charter card at both widths** (today 33–99 px); `journey` (every line, `--delegate-all` too), `focus-steal --lane` and `--gap`, `poll-race`, `stale-key`, `wrong-line-room --case=shapes` and `=record`, `overlapping-sites`, `head-insertion-aim`, `first-keys-walk`, `drawer-walk`, `toc-travel`; card-audit's R1/R2 (queue-card stack, stranded red) and P9–P11 unchanged.
- **Re-freeze:** session-probe; copy goldens.
- **Docs:** SURFACE C1 (now true), C4, CP7, M19 (*Current text* over *(no text here)*), §9's quick/insert/race/⏳/patch/deadlock/mine rows, §9.1's ✓ and 🗑️ rows; CLAUDE.md's `clause-head`, `decision card`, `proposal-block` entries; card-audit P2's comment accepting the vertical drop deleted.
- **Waits:** `design/session.js` (`suggCardHtml` retires here), `design/cards.js`, `design/composer.js`, `design/live.js`'s `itemsFromView` if a field is added. **No charter or composer work** for the stage's length — this is where most of the project's recent live-room fixes live, and the walks above are their guards.

### Stage 7 — Records, the backlog and the closed page

- **Kinds:** sealed record, backlog, 🥂, every card as the closed page draws it; the closed page's tabs, rail and topbar.
- **Breaks landing:** P4 and B7 v2 on the closed page (1541.6), O10 (1541.7), B12 (1541.23).
- **The host change:** O10 (a) — `packages/constitution`'s close acknowledgement discharges every OK owed at the close in 🥂's one press (`acknowledgeClose` with `owed.ts`), the rail's owed entries leaving with it; unit tests beside `owed.ts`; the golden log must replay unedited (a fold change, not a new event, if it can be; if it needs an event, that is a question for Ed before the stage starts).
- **Fixes:** bugs 2 and 4 (1541.30 — including the topbar's ✏️ countdown stopping on a closed document), bug 5 (1541.23), finding 1541.34.
- **Acceptance:** P27–P29 strict on **every** kind (the closed page is every card); the ladder's `closed` rung asserts no enabled control but tabs and 🥂 for founder, member and stranger; `seat-matrix --to=closed`; `journey`; the host refuses nothing the page offers on a closed document (a walk that presses everything enabled and reads the error log).
- **Re-freeze:** both probes (`&closed=1`); copy goldens.
- **Docs:** SURFACE C9 (restated), K2, §9's sealed-record, backlog and 🥂 rows, the settled-record row's OK-after-close sentence; SPEC only if the close acknowledgement's meaning changes (Ed's sign-off and a version bump); CHANGELOG notes a host change.
- **Waits:** `packages/constitution` (owed and close), `design/session-view.html`, the topbar in `design/wallets.js`. **A full deploy, not surface-only** — schedule it outside any live room.

### Stage 8 — Edit mode, the proposal row, the 📝 door and the phone's drawers

- **Kinds and zones:** the editing card, the proposal and patch rows, the 📝 door, the contents drawer at 390.
- **Breaks landing:** B9 (1541.22), G4 v2 (1541.17).
- **Fixes:** bug 6 (the door over the rail's text — 1541.17), bug 9's overlap (1541.39), bug 10 (1541.40).
- **Acceptance:** P30 strict at 1600, 1240 and 390 (an overlay covers no text and no control); card-audit D1–D4 (the door) unchanged; `journey`'s edit lines, `crlf-paste`, `heading-marker`, `first-keys-walk`, `drawer-walk` green.
- **Re-freeze:** session-probe; copy goldens.
- **Docs:** SURFACE §9's editing row and §9.1's ✏️ row (D11 (2) resolved), K13/K17 if the row changes.
- **Waits:** `design/edit-mode.js`, `design/composer.js`, `design/flights.js`, the narrow block of `design/system.css`.

### Stage 9 — Keyed re-render (P10)

- **Build:** every slot and control keyed (card id, slot, block or control id) by the shell; renders patch in place and never replace a node holding focus, a caret or selection, pointer capture, a scroll offset or an unsent value (U1, U2). A dev switch in the manner of `Session.memo` — `?render=replace` restores wholesale replacement — so the two can be compared on any walk. The deferral flags (`pressInFlight`, `dateInFlight`, `heldCaret`, `penHold`, `SESSION.holding`) are retired **only** where `render-hold` proves the shell covers their case.
- **Acceptance:** `render-hold-walk` — for each in-flight kind (caret in a lane, a half-typed date, a held commit, a drag, a scrolled picker grid, an open select) on an open card, a forced poll and a room event, the node is the same node and its state intact — green, in CI; every walk from stages 2–8 green with the flags retired; P10 in SURFACE loses *not built*.
- **Size and risk:** the riskiest stage. It touches how every card is drawn; its regressions look like the 22 render gotchas, which is why the walks that guard those are its acceptance.
- **Re-freeze:** none expected (the DOM should not change); a probe difference is a bug.
- **Docs:** SURFACE W9 restated as U1; CLAUDE.md *Gotchas* — the render-lifecycle post-mortems whose flags retire move to DECISIONS, reduced to one line naming `render-hold`.
- **Waits:** everything in `design/` that renders. **Nothing else ships on the surface** during this stage.

### Stage 10 — Retire and fold

- **Build:** delete today's shells and their helpers (`cardHtml`'s frame, `commitBarHtml`'s spacer, the 41 `binBtn()` sites, `readBody`, `VALUE`, `provOf`, `ctx.lockline`); `GRAMMAR_KINDS` becomes *all*; `no-job`'s driven form (press every enabled control on every card, require a command or a draft change); `one-home`'s `data-fact` roles on every fact.
- **Acceptance:** card-audit strict on every kind in the sprint tier and the fast pass; the full walks job green; `state-only` over every slot builder.
- **Re-freeze:** both probes, copy goldens (a last, empty-diff freeze proves the deletions changed nothing a member sees).
- **Docs:** SURFACE §9 read end to end against the page (each row now one line of what is particular to its card); CLAUDE.md glossary pruned (the retired names into *Retired names*); `design/DECISIONS.md` gets phase one's reasoning (grammar §0, §7, §10) as a dated section; `design/redesign/` keeps grammar.md as the reference.

## 5. Critical files

Where each stage lands. The rule for all of them: **while a stage is open, no other branch edits the files it lists** (two sessions run at once — CLAUDE.md's four rules apply, and a stage's files are claimed in QUESTIONS.md's backlog row for it); engine, server and sim work is unaffected except in stage 7.

| file | what changes | stages |
|---|---|---|
| `design/card-state.js`, `design/card-shell.js` (new) | the one state and the one shell | 1, then every stage |
| `design/system.css` | tokens, the card box, `.glab`, the band's 4 px, the narrow margin | 1, 3, 6, 8 |
| `design/copy.js` | the vocabulary, the dark reasons, the asks | 1, then any stage adding a key |
| `design/band.js` | the band's bodies → slots | 2, 3, 4, 5 |
| `design/setup.js` | `cardHtml` (the band's shell), `readBody` | 2, 3, 5, 10 |
| `design/session-view.html` | `VALUE`, `provOf`, `ctx.lockline`, `motionCard`, the script-tag block | 1, 3, 4, 7 |
| `design/session.js` | `suggCardHtml` (the charter's shell), `renderDoc`'s card pass | 6, 8, 9 |
| `design/cards.js` | `commitBarHtml`, the option block's drawing | 2, 6, 10 |
| `design/composer.js`, `design/edit-mode.js`, `design/flights.js` | the editing card, the rows, the door | 6, 8 |
| `design/door.js`, `design/begin.js`, `design/wallets.js` | the stranger's cards, 🍾, the closed topbar | 2, 5, 7 |
| `design/fixture-session.js` | the closed page | 0 |
| `packages/constitution/src/owed.ts` (and its close) | O10 | 7 |
| `design/tools/card-audit.mjs`, `scripts/copy-check.mjs`, `scripts/spec-check.mjs`, `scripts/clock-check.mjs` | the guards | 0, 1, 9, 10 |
| `.github/workflows/ci.yml` | the fast strict pass in `probe`; `render-hold-walk` in `repros-b` | 0, 9 |
| `SURFACE.md`, `design/STYLE.md`, `CLAUDE.md` | as each stage's *Docs* line says | every stage |

## 6. What this plan does not decide

- **The answers.** Every stage assumes the recommended branch of `questions.md`. The ones that would reshape a stage: 1541.1 (the whole plan), 1541.3 (stages 3–6), 1541.4 (stage 6's headline), 1541.7 (stage 7's host change), 1541.18 (stage 9's place, or its existence).
- **Whether O7 (b)** — the host serving each seat its allowed acts — follows stage 10. It is worth it once the list's shape has held for every family; it is a server change and a question for then.
- **The live-only cards' final drawing.** Four news families, the applicant's five and the diagonal were never inventoried; their stages open them first and may find something the grammar did not foresee. That is a finding for Ed, not a stage failure.
