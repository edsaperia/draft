# Questions for Ed — the surface redesign (Q1541, stage 6)

Written 2026-09-25 from `grammar.md` v2 (breaks B1–B13, open choices O1–O11), `critique.md`, `checks.md`, `diagnosis.md` and the mockups' captions. **28 questions and 15 findings, numbered 1541.1–1541.43 in one sequence.** Answer by number (*do 3 and 7*) or on the review page, which saves each answer.

**Questions** are genuine choices, the recommended option first; the prototype builds every recommendation, and BUILD.md assumes them. **Findings** are faults in today's page that any design should fix; each is fixed in the BUILD.md stage named unless you veto it. Every item is written to stand alone; the internal labels (B1, O6, CP2 …) appear only as pointers into grammar.md and SURFACE.md.

Screenshots are named as files under `design/proposal/shots/` on branch `redesign`; *today* is `current/`, the prototype `proposed/`. The same pairs are on the review page and in `mockups.html`.

## Where each break and open choice went

| grammar.md | question |
|---|---|
| B1 provenance as text | 1541.5 |
| B2 the head is the line | 1541.3 |
| B3 (withdrawn in v2; O6 (b)) | 1541.12 |
| B4 v2 and O1 (d) — the label slot | 1541.4 |
| B5 the bin with a job; J2 *Withdraw* | 1541.9 |
| B6 and O2 — no row where nothing is owed | 1541.8 |
| B7 v2 — settings rungs, not proposals | 1541.6 |
| B8 v2 — the power card | 1541.11 |
| B9 one ✏️ in edit mode | 1541.22 |
| B10 ✓ not green (with P7 v2) | 1541.13 |
| B11 *Set to / Set by* | 1541.14 |
| B12 🥂 once | 1541.23 |
| B13 the reason box with the change | 1541.21 |
| O3 *Accept 🏛️* | 1541.24 |
| O4 the 390 margin | 1541.20 |
| O5 no line on a text clause | 1541.26 |
| O7 where acts are worked out | 1541.19 |
| O8 keyed re-render (P10) | 1541.18 |
| O9 empty lists | 1541.25 |
| O10 🥂 discharges owed OKs | 1541.7 |
| O11 / G6 the strip hangs on | 1541.16 |
| P3 v2 against STYLE §3 | 1541.10 |
| G5's 4 px | 1541.15 |
| G4 v2 the 📝 door | 1541.17 |
| §10 go to phase two (the sorter, the 40 bodies) | 1541.1 |
| §1 the ten principles | 1541.2 |
| the new words (STYLE) | 1541.27 |
| ✋ 🖼️ after the close | 1541.28 |

## Backlog 1541 — the held items, judged

QUESTIONS.md backlog row 1541 (Ed, 2026-09-25: *do the redesign and then decide if you think these things are still relevant*) held four card faults and the diagnosis's plain bugs until this file existed. Each, judged against the grammar:

- ***Set to / Set by* on every read-only setting card** — Settled by the grammar — one home per fact; answered through **1541.14**. Drop it from the backlog.
- **The closed text cards' empty commit row (P12's 24)** — Settled by the grammar — a part with nothing in it is not drawn, and a closed card has no job; finding **1541.36**. Drop it.
- **🗑️ alone against §9.1's close-only OK** — Settled by the grammar — neither survives: no lone 🗑️ (**1541.9**) and no close-only OK (**1541.8**). Drop it; your answer to 1541.8 is the ruling.
- **The separate cross-width design offer** — Read as the offer to design the phone separately; the grammar answers *one design, folded* (the same zones, 0 px on open at both widths). The one open choice is **1541.20**, which carries this item. If the offer meant something else, say so there.
- **The ten plain bugs** — 1 → **1541.29**; 2 and 4 → **1541.30**; 3 → **1541.31**; 5 → **1541.23**; 6 → **1541.17**; 7 → **1541.37**; 8 → **1541.38**; 9 → **1541.22** and **1541.39**; 10 → **1541.40**. The eleventh (CLAUDE.md's heading ladder) was fixed on main in 178e0e99.

So the row can close once the answers are in: nothing it held needs a question of its own beyond the numbers above.

## Part 1 — Questions

### 1541.1 — Go ahead with phase two: rebuild every card from one shared description of its state

**What you see now.** Today each of about 40 kinds of card builds itself. Each one works out for itself whether the document is closed, who is looking, who chose a rule and what to draw, then writes its whole card. That is why the same fault keeps turning up somewhere new — a member reading *Set to undefined*, a closed document offering *Accept*, a 🗑️ with nothing to put back — and why every fix so far has covered one card.

**What the proposal changes.** One shell draws every card from one description of its state: what it is about, who is looking, where the document is in its life, what stands and who chose it, and what this reader may do now. A card can only be drawn from that description, so those faults cannot be written again. **Be clear about what the prototype you can click is:** it is not that. It takes the markup today's cards already write and *sorts* it into the new layout. It shows the look, and the checks pass against the sorter; the real build has to pass them again from nothing. Converting the 40 card bodies is most of the work (BUILD.md sizes the whole programme at 27–32 builder sessions and 10–11 QA rounds); the shell, the tokens and the checks are small beside it. And P10 — *nothing you are in the middle of is taken by the page updating* — is not built in the prototype at all (see 1541.18).

**What it buys.** Every class of fault the diagnosis counted (1,226 of 1,336 opened cards carried at least one) becomes either impossible to build or caught by a check that goes red. New cards are built by filling in one description, not by writing a card.

**What it costs.** Weeks of builder time and a QA round per card family. While a stage is open, other card work in the same six files waits (BUILD.md lists which).

**Screenshots** (today → proposed):
- The 🪶 card that started this, today and in the prototype: `shots/current/title-settled-1600.png` → `shots/proposed/title-settled-1600.png`

**Options** (recommended first):
- **(a) Yes — the staged build** — BUILD.md's migration, one card family at a time, each family's checks becoming guards as it lands; the sorter is thrown away, never merged. *(recommended)*
- **(b) Only the cheap half** — Patch today's card builders until they pass the checks, with no shared description. Faster; the next new condition brings the faults back, because each card still works out its own state.
- **(c) Not now** — Keep the proposal on its branch as a reference and go on fixing faults one card at a time.

### 1541.2 — Make the ten principles the surface's standing rules

**What you see now.** SURFACE.md states its rules card by card (C1–C17, CP1–CP11, K1–K34 and more). It has no short list a reviewer can hold against a screenshot, and three of its rules contradict each other today: what a closed card's buttons are (K2 against CP9), whether a single-place draft has its own ✏️ (§9 against §9.1), and whether the tab you press moves (C1 against what every charter card does).

**What the proposal changes.** The ten principles (listed on the review page and in grammar.md §1) go into SURFACE's opening, each naming the automatic check that holds it. The card-by-card rows then state only what is particular to each card.

**What it buys.** A new card is judged against ten sentences, and each sentence has a check that turns red. The three contradictions go, because the answers below settle each of them.

**What it costs.** SURFACE's opening changes. P10 would enter as a rule the page does not yet keep, marked *not built* until the re-render stage.

**Options** (recommended first):
- **(a) Adopt all ten, with their checks** — Into SURFACE's opening; P10 marked *not built* until BUILD.md's stage 9. *(recommended)*
- **(b) A design guide only** — Keep them in design/DECISIONS.md as guidance; SURFACE stays card by card.
- **(c) One by one** — Adopt each principle only as the questions below that depend on it are answered.

### 1541.3 — Every card starts with the line it opens in place of

**What you see now.** A card replaces the paragraph you pressed, but what stands at its top depends on the kind. A settings card has no head and repeats the rule as its first option — *The document is titled "…"* over a blue *Chosen by the Founder* pill. A charter card has a small grey *The clause as it stands* above the clause. The grants open with their own headings. And about 322 opened cards carry an empty 24 px box above everything.

**What the proposal changes.** Every card's first line is the paragraph it replaces, drawn by the same code that draws it in the document, word for word, exactly where it stood. What stands leaves the list of options, because it is the first line. Four stated exceptions: a **record** starts with the wording it recorded; a **patch** over several places starts with the place it is showing; a **gap** starts with *(no text here)*; and at the **birth**, before there is a title, 🪶 starts with the title box itself at title size. A rule's paragraph also carries a line about the Founder's powers; the card leaves that line to the ✒️ 🛡️ cards (1541.10).

**The ruling it touches.** SURFACE F15 and STYLE T3 — *"an option-block settings card carries no head … and a heading-over-text card — the grants and the gates — no title head (Q1151, Q1373)"* — and §9's blind-answer row (Q1175) and settled-record row (Q1186, Q1522). Each of these removed a head that *restated* the card. Your reading (Q1373): *no card carries a title*. The proposal keeps that: the first line is not a title, it is the line itself.

**What it buys.** Nothing is said twice. The empty head box goes; four ways of drawing a card's top become one; the *Set to undefined* kind of fault cannot happen, because the first line is the document's own rendering and cannot disagree with it.

**What it costs.** Every band card's first line changes. The grants and gates start with the line their tab hangs on (the Founded line, the Proposals preamble).

**Screenshots** (today → proposed):
- 🪶 settled: `shots/current/title-settled-1600.png` → `shots/proposed/title-settled-1600.png`
- 🌍 settled, the Founder: `shots/current/chamber-settled-1600.png` → `shots/proposed/chamber-settled-1600.png`
- the ✒️ grant: `shots/current/grant-pen-settled-1600.png` → `shots/proposed/grant-pen-settled-1600.png`

**Options** (recommended first):
- **(a) Take it, with the four exceptions** — Every card, band and charter. *(recommended)*
- **(b) Band cards only** — Settings cards start with their rule; charter cards keep today's top.
- **(c) Keep today's rules** — No head on settings cards; each kind keeps its own top.

### 1541.4 — One place for labels: each block's label is its first line, and the card's own label sits above the first line without moving it

**What you see now.** An opened charter card has a small grey *The clause as it stands* above the clause, which is why the tab you pressed drops 33 px when the card opens (62–84 px on a record, 99 px on the closed page's backlog at 390). Block labels stand in four different places: *Proposed* above, beside or below its block, *Previous text* above and to the right, *What you proposed* at the block's foot. A record opens with a green *DECIDED · 7/14* row above the clause.

**What the proposal changes.** Every block's label is its first line. The card's own label — *Current text*, *Current rule*, or how a record ended (*Passed · Thursday, 24 September, 22:51*, in green) — sits in the space the card's box already takes above its first line. It is still read first, and it moves nothing: the clause lands exactly where the paragraph was, and so does the tab you pressed. One short vocabulary of labels (grammar.md §2.3a lists it: *Current text*, *Current rule*, *Proposed*, *What you proposed*, *Previous text*, *Rival · n%*, *Rejected proposal*, the outcome words, and a card's ask); a block with no button and no label cannot be built. The first version of the proposal put labels beside radios, which left cards with no radio unlabelled — the critique caught it, and this is the fix.

**The ruling it touches.** CLAUDE.md's glossary, *clause-head*: *"the clause at document size and colour under an eyebrow"*; SURFACE M19, *"its head is the eyebrow The gap as it stands"*; M12, *"a record's head stands a dateline row lower in its card (Q1524 (a))"*. Kept in substance: Q207 (a first-time reader must be told which paragraph is the current text) and Q1522 (a record says what it did first).

**What it buys.** *The tab you click does not move* becomes true on the charter, where it is false on every card today. Labels read one way everywhere. Records still lead with their outcome.

**What it costs.** *The clause as it stands* and *The gap as it stands* become *Current text*. A card packed tight under the line above it (📍 at the birth) has room for no label — it has no blocks there, so it needs none. The label costs 4 px in the band (1541.15).

**Screenshots** (today → proposed):
- a quick judgment: `shots/current/quick-keys-charter-1600.png` → `shots/proposed/quick-keys-charter-1600.png`
- rivals only: `shots/current/race-purse-charter-1600.png` → `shots/proposed/race-purse-charter-1600.png`
- a sealed record: `shots/current/race-claims-charter-1600.png` → `shots/proposed/race-claims-charter-1600.png`

**Options** (recommended first):
- **(a) The label slot, as built** — Block labels on their first line; the card's label above the first line, moving nothing. *(recommended)*
- **(b) Labels beside the radios** — The first version: a card whose first line has no radio has no label (Q207 lost on rivals-only races, your own proposal and the deadlock).
- **(c) Today's placements** — Keep the label above the clause and accept the 33–99 px drop.
- **(d) No labels** — Position says it; Q207's first-time reader unanswered.

### 1541.5 — Who chose a rule is a line of grey text, not a pressed blue button

**What you see now.** Under every settled rule a solid blue pill reads *Chosen by the Founder ✒️* or *Chosen by the membership* — drawn exactly like the option you just pressed, and in the same fill as OK. 490 of the opened cards carry one.

**What the proposal changes.** The same words, verbatim, as one grey line under the rule, with the moment: *Chosen by the membership · Sunday, 20 September, 11:12*. On a record the outcome stands in for it — *Passed* is the membership's choice and *Changed by the Founder* the Founder's — so a record does not print both.

**The ruling it touches.** SURFACE CP2: *"Provenance is a sanctioned third form, and the standing block always wears it (Q1167 (a), Q1176, Q1188 — Ed 2026-09-05)"*, and STYLE T48's second half. You have confirmed the pill three times. Q1188's reason — a reader should not have to infer who chose a rule from a missing label — is kept: every settled rule still says who chose it, in the same two phrases.

**What it buys.** A fact about the past stops looking like a button you can press, and stops sharing its drawing with OK. It gains its moment.

**What it costs.** It re-draws a ruling you have made three times.

**Screenshots** (today → proposed):
- 🌍 settled: `shots/current/chamber-settled-1600.png` → `shots/proposed/chamber-settled-1600.png`
- 🪪 settled: `shots/current/admission-settled-1600.png` → `shots/proposed/admission-settled-1600.png`
- a settled motion record: `shots/current/rec_chamber_0-settled-1600.png` → `shots/proposed/rec_chamber_0-settled-1600.png`

**Options** (recommended first):
- **(a) A grey line of text** — T48's two labels verbatim, with the moment; the outcome word on records. *(recommended)*
- **(b) Keep the pill** — The pressed radio stays the drawing of who chose.

### 1541.6 — On a locked or closed card, the settings options nobody can choose are not drawn — but proposals stay

**What you see now.** After 🍾 the 🎩 card shows both *The Founder is part of the membership* (marked Chosen) and *The Founder is not part of the membership* with a greyed radio. On a closed document every setting still shows its options with *Choose this* radios, and every race its *Prefer this* radios.

**What the proposal changes.** The proposal tells two kinds of block apart. A **settings option** exists to be chosen, so where this reader cannot choose, the unchosen options are not drawn: what stands is the first line, and who chose it the grey line under it. A **proposal, a rival, a record's field, or a race the clock cut off** is content, so it stays, labelled (*Proposed*, *Undecided when the document closed*), with no radio. (The first version dropped proposals too, and the closed deadlock lost its eight proposals; the revision put them back.)

**The ruling it touches.** SURFACE CP11: *"A block nobody may press keeps its words and greys its radio alone (reading 1193, 2026-09-05): a locked or unavailable option is read as often as a live one"*; §8's exception row, *"the hat's radios stay visible but disabled post-start"*.

**What it buys.** No radio anywhere that cannot be pressed. The closed page asks nothing and still shows everything it recorded.

**What it costs.** A locked 🎩 no longer shows the answer that was *not* chosen. Reading 1193's worry is met differently for the two kinds: a locked option was never something anybody could do; a proposal stays readable.

**Screenshots** (today → proposed):
- 🎩 after 🍾: `shots/current/hat-settled-1600.png` → `shots/proposed/hat-settled-1600.png`
- ⏱️ on the closed page: `shots/current/rate-closedband-1600.png` → `shots/proposed/rate-closedband-1600.png`
- the deadlock on the closed page: `shots/current/race-sanctions-closed-1600.png` → `shots/proposed/race-sanctions-closed-1600.png`

**Options** (recommended first):
- **(a) Take it** — Unchosen settings options go where nobody can choose; proposals stay, labelled, with no radio. *(recommended)*
- **(b) Keep greyed radios on settings** — CP11 for settings options; radios removed only from proposals on the closed page.
- **(c) Keep today's** — Greyed and live-looking radios as now.

### 1541.7 — At the close, 🥂's signature also counts as every OK you still owed

**What you see now.** If a record, a park or a news card still owed you an OK when the clock closed the document, it keeps an OK button on the closed page (in the fixture: *knives*, *claims*, *Nomination*, *Locking Up*, *Calling a Meeting*) — although the module refuses an OK after the close.

**What the proposal changes.** 🥂 is the closed page's one act. Its OK signs the document and, in the same press, acknowledges every OK still owed; those rail entries leave with the signature.

**What it buys.** The closed page has one act, as the proposal's closed-document principle says, and no button that the host would refuse.

**What it costs.** A change in the module (`packages/constitution`) so that the one press answers the owed set, and a full deploy rather than a surface-only one. Not built in the prototype: its cards simply draw no OK, and its rail is today's, so an owed entry still stands there until 🥂.

**Screenshots** (today → proposed):
- an unread record on the closed page: `shots/current/race-claims-closed-1600.png` → `shots/proposed/race-claims-closed-1600.png`
- 🥂: `shots/current/closing-closedband-1600.png` → `shots/proposed/closing-closedband-1600.png`

**Options** (recommended first):
- **(a) 🥂 discharges them** — One press signs and acknowledges; module change in BUILD.md stage 7. *(recommended)*
- **(b) Each keeps its OK** — No module change; the closed page offers acts besides 🥂 (and the host must accept them).
- **(c) Dropped at the close** — What was owed is simply no longer owed once the document closes; no OK, no signature link.

### 1541.8 — A card that asks nothing has no buttons; you close it with its tab, a click outside, or Escape

**What you see now.** A card with nothing left to do shows a lone OK that only closes it (an accepted grant, a settled 🎩, a settled 🍾, a stranger's read-only card), or, on a closed document, a lone 🗑️. SURFACE says both things: CP9 — never 🗑️ alone, show a close-only OK — and K2 — on a closed document, 🗑️ alone. The page follows K2 on 80 cards.

**What the proposal changes.** No button row at all. OK appears only when something is owed. You close the card by pressing its tab again, clicking anywhere outside it, or pressing Escape.

**The ruling it touches.** SURFACE CP9 (reading 1190): *"the OK being the reader's way to say they are done with a card that asks nothing"*; §9.1's OK row; K2.

**What it buys.** OK means one thing — *I have seen this, and I owed it*. The K2/CP9 contradiction and the held backlog item (*🗑️ alone against §9.1's close-only OK*) both go.

**What it costs.** A read-only card has no button. On a phone the way out is tapping the 34 px tab at the screen's edge or tapping elsewhere; BUILD.md measures that exit before this lands.

**Screenshots** (today → proposed):
- the ✒️ grant, accepted: `shots/current/grant-pen-settled-1600.png` → `shots/proposed/grant-pen-settled-1600.png`
- 🍾 settled: `shots/current/begin-settled-1600.png` → `shots/proposed/begin-settled-1600.png`
- 🎩 settled: `shots/current/hat-settled-1600.png` → `shots/proposed/hat-settled-1600.png`

**Options** (recommended first):
- **(a) No row; tab, outside or Escape** — OK only while owed. *(recommended)*
- **(b) No row, plus a quiet ×** — A small close mark in one fixed corner of every card: easy to find, but furniture on every card and a second way of saying what the tab says.
- **(c) Keep the close-only OK** — CP9 as it stands; K2 amended to match.

### 1541.9 — 🗑️ appears only when there is something of yours to remove, and withdrawing says *Withdraw*

**What you see now.** 🗑️ sits at the left of nearly every card, *always live*. On 388 opened cards it offers to *Put it back as it stands* with nothing to put back; on 👑 and the park it only closes the card; on your own proposal it is the only control, withdraws the proposal irreversibly, and says so only in its tooltip.

**What the proposal changes.** 🗑️ is drawn exactly when there is something unsent here that no other control undoes (something typed, uploaded or toggled), or something you sent that can still be withdrawn. A choice among options that include Indifferent needs no bin, since choosing another undoes it — the reason behind Q1500, applied to every card rather than listed by kind. Withdrawing reads *🗑️ Withdraw*, because it is irreversible and a bare bin was read as *skip* (Q1500).

**The ruling it touches.** SURFACE C4, *"🗑️ at the left, always live"*; CP7; §9.1's 🗑️ row; CP5 (*"🗑️ at the left closes the card, the question kept pending"* on 👑); §9's park row.

**What it buys.** 🗑️ has one meaning — remove what is yours — instead of four.

**What it costs.** The bin comes and goes as you start and clear a draft, so the left end of the row is sometimes empty (the buttons on the right do not move).

**Screenshots** (today → proposed):
- a settled rule: no bin until you type: `shots/current/chamber-settled-1600.png` → `shots/proposed/chamber-settled-1600.png`
- your own proposal: *Withdraw*: `shots/current/mine-guests-wording-charter-1600.png` → `shots/proposed/mine-guests-wording-charter-1600.png`
- the 👑 question: `shots/current/mo_mo-3-settled-1600.png` → `shots/proposed/mo_mo-3-settled-1600.png`

**Options** (recommended first):
- **(a) Bin only with a job; *Withdraw* in words** — As built. *(recommended)*
- **(b) Bin only with a job; withdraw a bare glyph** — Same rule, no word on the withdraw.
- **(c) Keep the bin on every card** — C4 as it stands.

### 1541.10 — A settings card starts with the rule alone; the Founder's powers line belongs to the ✒️ 🛡️ cards

**What you see now.** In the document a rule reads as two lines: the rule, then *The Founder may amend this at will, and refuse proposals that the membership pass.* Today's opened card already drops the second line — your ruling of 2026-09-03, in the code: *the document keeps the powers; the card drops them*. But STYLE §3 still says *the opened card's head shows the same two lines*.

**What the proposal changes.** The proposal follows your 2026-09-03 ruling (its first version had quietly overridden it; the critique caught that). STYLE §3's sentence is amended to match. Each power card starts with its own clause of that line (1541.11).

**What it buys.** The first line of a settings card states one fact, and the powers are stated once, on their own cards.

**What it costs.** A STYLE amendment.

**Screenshots** (today → proposed):
- 🪶 settled: `shots/current/title-settled-1600.png` → `shots/proposed/title-settled-1600.png`
- 🌍 settled: `shots/current/chamber-settled-1600.png` → `shots/proposed/chamber-settled-1600.png`

**Options** (recommended first):
- **(a) Drop the powers line; amend STYLE §3** — Your 2026-09-03 ruling governs; STYLE catches up. *(recommended)*
- **(b) Show both lines, as STYLE §3 says** — The first line then states two facts, and the ✒️ 🛡️ cards repeat the second.

### 1541.11 — A power card starts with that power's own clause, says who holds it, and offers the other state

**What you see now.** Pressing ✒️ under ⏱️ opens two options: *The Founder may amend the proposal rate at will* (marked Chosen) and *The Founder may not amend the proposal rate at will*. Before 🍾 they are two equal blocks.

**What the proposal changes.** The first line is the power's own clause (*The Founder may amend this at will.*); the label above it is the card's question (*Can the Founder Make Amendments at Will?*); the grey line says who holds the power (*Kept by the Founder at the start · ‹when›*); the one block is the other state. On a closed document the clause turns to the past: *Until the document closed, the Founder could amend this at will.*

**The ruling it touches.** SURFACE K4: *"on a power card it stays, marked Chosen, because a two-state toggle needs its other half"*; §9's power-cards row, *"before 🍾 two proposal blocks"*.

**What it buys.** A power card is built like every other rule card; K4 needs no exception, and Q1430's doubled sentence cannot come back.

**What it costs.** Before 🍾 the pair reads as first line plus one block rather than two equal blocks.

**Screenshots** (today → proposed):
- ✒️ on 🪶: `shots/current/pw_u_title-settled-1600.png` → `shots/proposed/pw_u_title-settled-1600.png`
- the same, closed: `shots/current/pw_u_title-closedband-1600.png` → `shots/proposed/pw_u_title-closedband-1600.png`

**Options** (recommended first):
- **(a) Own clause, holder, the other state** — As built. *(recommended)*
- **(b) Two equal blocks** — K4 as it stands.

### 1541.12 — A card that asks you something says what it asks, as its label

**What you see now.** ✋ 🖼️ 📧 and 🌂 keep a title (*Choose Your Name*) above your row. The grants, gates, 🍾, 🥂 and the power cards have none, or a different form.

**What the proposal changes.** Every card that is an act or a question — ✋ 🖼️ 📧, 🌂, 🥂, 🍾, the grants, the power cards, 🎩 while it is asked, 👑 — carries its ask as the small label above its first line, and its first line is the place (your row, the Founded line). Cards about a place (a clause, a rule) carry *Current text* or *Current rule* instead. The first version dropped the titles altogether; 🌂, the one card whose act cannot be undone, then named no act, so the revision put them back in this form.

**The ruling it touches.** STYLE T3 and SURFACE F15 keep the personal cards' title — kept. Extending the ask to the grants, 🍾, 🥂, the power cards, 🎩 and 👑 is new.

**What it buys.** Every card says what it is about or what it asks, in one place, drawn one way.

**What it costs.** The ask is small upper-case type. At 390 a long ask is cut with an ellipsis (*Can the Founder Make Amendments at W…*), its full words on the power card's first line. One note stays amber from the mockups: 🖼️ shows your initials twice, because the *Anonymous* option shows what choosing it draws.

**Screenshots** (today → proposed):
- ✋: `shots/current/myname-founding-1600.png` → `shots/proposed/myname-founding-1600.png`
- 🌂: `shots/current/leave-settled-1600.png` → `shots/proposed/leave-settled-1600.png`
- the 🏛️ grant: `shots/current/grant-voice-founding-1600.png` → `shots/proposed/grant-voice-founding-1600.png`

**Options** (recommended first):
- **(a) Every act or question card** — As built. *(recommended)*
- **(b) Only the cards that keep a title today** — ✋ 🖼️ 📧 🌂; the grants and the rest carry no ask.
- **(c) No ask label** — The first version; 🌂 names no act.

### 1541.13 — Each drawing means one thing: ✓ is never green, a chosen option is a dot, a vote on changed wording is a sentence

**What you see now.** SURFACE §9.1 calls ✓ *"the one solid green on a card"* and also says it *"lights on --primary when armed"*; the recorded ✓ on a judged ⏳ card is green-tinted. A chosen option is a filled blue pill — the same fill as OK and as the provenance pill. A vote about wording that has since changed shows as a pressed *Preferred*.

**What the proposal changes.** Green means *decided* and stays on marks and on the record's passed highlight — never on a button. ✓ is drawn like every other glyph button (flat, lifted when armed). A chosen option is a white pill with a filled dot and blue words; solid blue is OK or Accept, while owed, and nothing else. A vote on wording that has changed is a sentence: *You preferred this before it changed*.

**The ruling it touches.** SURFACE §9.1's ✓ row (which contradicts itself).

**What it buys.** Nothing that already happened looks pressable, and no two different things share a drawing. The 👑 Text question's solid green ✒️ (plain bug 8) has nothing left to imitate.

**What it costs.** The ✓ is less emphatic, and every card's selected option looks quieter than today's filled pill.

**Screenshots** (today → proposed):
- a judged ⏳ pair: `shots/current/quick-guests-count-charter-1600.png` → `shots/proposed/quick-guests-count-charter-1600.png`
- a quick judgment, choosing: `shots/current/quick-keys-charter-1600.png` → `shots/proposed/quick-keys-charter-1600.png`

**Options** (recommended first):
- **(a) All three** — ✓ flat, chosen as a dot, a changed vote as a sentence. *(recommended)*
- **(b) ✓ only** — ✓ loses its green; the filled pill stays for a chosen option.
- **(c) Keep today's** — —

### 1541.14 — The *Set to …* and *Set by …* lines go from every card

**What you see now.** A member reading a rule may see it three times — the rule, *Set to Anyone with the link*, and a change line — plus *Set by the founder when the document was made.* or *Decided by the members.* That second reader of the same facts is what printed *Set to undefined* (1541.29) and named two different choosers on one card (1541.31).

**What the proposal changes.** The rule once (the first line), who chose it and when once (the grey line), and what changing it takes stays in the document's own powers line.

**The ruling it touches.** SURFACE §9's watching row, *"the lockline and the value line only (Q1176)"*; STYLE T21's lockline example.

**What it buys.** One home for each fact; the two plain bugs above cannot recur. This also answers a held backlog item (*Set to / Set by on every read-only setting card*).

**What it costs.** The wording T21 protected, which the paragraph states anyway.

**Screenshots** (today → proposed):
- 🌍 read by a member: `shots/current/chamber-seat_1-1600.png` → `shots/proposed/chamber-seat_1-1600.png`
- today on a live document: *Set to undefined*: `shots/current/chamber-live_constitution_m-1-1600.png` → *(today only)*

**Options** (recommended first):
- **(a) Remove them** — As built. *(recommended)*
- **(b) Keep them, read from one place** — Fix the two bugs but keep the lines.

### 1541.15 — The band's subsection headings gain 4 px so a card's label fits above your row

**What you see now.** An opened card's box rises above its first line by its padding, over whatever is above it: at the birth 📍's card covers the descenders of 🪶's title, and 120 cards do this at 1600 (141 at 390).

**What the proposal changes.** A card rises only into clear space, never over ink. The card's label needs 13 px; the first row under a band subsection heading (✉️'s invitees, ❌, the members list that ✋ 🖼️ 📧 open on) has 11 px. To fit, each band subsection heading gains 4 px of space below it — always, closed page included.

**What it buys.** No card ever covers the line above it, and the label fits everywhere a label is needed.

**What it costs.** 4 px of extra space under the band's subsection headings on every page, card open or not. The charter's headings do not change.

**Screenshots** (today → proposed):
- the band, no card open: `shots/current/band-settled-1600.png` → `shots/proposed/band-settled-1600.png`
- ✉️ opened under its heading: `shots/current/invite-settled-1600.png` → `shots/proposed/invite-settled-1600.png`

**Options** (recommended first):
- **(a) Accept the 4 px** — As built. *(recommended)*
- **(b) No label on those cards** — They open under their heading with no label; the rail entry and the tab carry the ask.
- **(c) A smaller label there** — Draw those labels below the type scale's smallest step (breaks the one-drawing rule).

### 1541.16 — A card ends where its content ends, and a long tab strip hangs on down the margin

**What you see now.** An open card is at least as tall as its strip of tabs, so a card with little in it — a power card on a setting with many records — keeps 60–110 px of blank white under one line (30 cards at 1600).

**What the proposal changes.** The card ends at its content. Where the strip is longer, it hangs on down the tab margin beside what follows, and pushes what follows down only as far as a closed pile of tabs would.

**What it buys.** No padded cards; the tab you pressed still does not move.

**What it costs.** The strip visibly runs past the card's foot.

**Screenshots** (today → proposed):
- ⏱️, many records in the strip: `shots/current/rate-closedband-1600.png` → `shots/proposed/rate-closedband-1600.png`

**Options** (recommended first):
- **(a) The strip hangs on** — As built. *(recommended)*
- **(b) Fold the read part of the strip** — Read records and laid-down powers fold into one pile tab inside the open strip: shorter strips, a second kind of pile, one more press to reach a record.
- **(c) Keep the floor** — Today's padding.

### 1541.17 — The floating 📝 may reach over the task rail's empty margin, but never over text

**What you see now.** At 1600 the floating 📝 — a 4.5 rem circle whose centre sits on the text sheet's right edge, as you ruled on 2026-09-24 — reaches over the task rail's left edge and covers the foot of its last entry (plain bug 6). Q1518 raised it below 1600; it is true at 1600 too.

**What the proposal changes.** The first version of the proposal moved the door inside the sheet, overruling you; the revision puts it back where you put it and states a rule instead: the floating layer may cross a zone's edge but never covers a line of text or a control. In the prototype at 1600 it crosses the sheet's edge and the rail's left margin, where no entry text stands — a slight overlap of rail entries' boxes, none of their words.

**What it buys.** Your placement kept, with a check that goes red the day it covers words.

**What it costs.** The door still overlaps the empty edge of a rail entry at some widths.

**Screenshots** (today → proposed):
- the session page at 1600: `shots/current/page-session-1600.png` → `shots/proposed/page-session-1600.png`

**Options** (recommended first):
- **(a) Keep your placement; never over text** — A check (zone-overlap) guards it. *(recommended)*
- **(b) Keep it, but shift it inward on narrower windows** — Below a width where it would meet an entry, the door moves into the gap between sheet and rail.
- **(c) Inside the sheet** — The first version; it stands in the text's right margin.

### 1541.18 — Stop the page rebuilding what you are holding: keyed updates instead of wholesale redraws

**What you see now.** The page rebuilds each card wholesale on every action and on the 4-second poll. Each time that took something from under someone's hand — a caret, a half-typed date, a held button, a drag — it got its own guard flag. 22 of the 72 surface gotchas in CLAUDE.md are this.

**What the proposal changes.** Every part of a card gets a stable key, and an update patches only what changed, never replacing something you are holding (focus, a caret, a press, a drag, a typed value). This is principle 10; the prototype does not build it and no check measures it yet.

**What it buys.** The class of fault live rooms have taught hardest stops needing a flag per case.

**What it costs.** The riskiest stage of the build (BUILD.md stage 9); it touches how every card is drawn.

**Options** (recommended first):
- **(a) Its own stage, after the families** — Keyed patching once every family is on the shell; a differential switch like the engine memo's audit mode. *(recommended)*
- **(b) From the first stage** — Every family lands already keyed: slower start, no second pass.
- **(c) Keep adding flags** — No architecture change; the 23rd gotcha of this shape.

### 1541.19 — Where the list of what you may do is worked out: in the page first, the host later

**What you see now.** Whether you may propose, judge, set, invite or accept is asked in about 27 separate places in the page, each card its own way, which is how a closed document came to offer *Accept*.

**What the proposal changes.** One function in the page answers it for every card, from the existing *may* checks, with *closed* inside it.

**What it buys.** The scattered tests go without a server change.

**What it costs.** The page could still offer something the host would refuse; only option (b) closes that.

**Options** (recommended first):
- **(a) In the page, one function** — Now; the host version later, once the list's shape is proven. *(recommended)*
- **(b) The host serves it** — Each seat's allowed acts come with the view: stronger, a server change up front.

### 1541.20 — On a phone, keep the tab margin but narrow it, so cards get more width

**What you see now.** At 390 every card stands 64 px in, with a 20 px right margin; the tab margin is kept (the tab is the only way into a card from the document). **Also:** your held backlog item *the separate cross-width design offer* — I read it as the earlier offer to design the phone layout separately. The proposal answers *one design, folded*: the phone has the same zones, and a card moves 0 px on open at both widths. If you meant something else, say so in the note.

**What the proposal changes.** The tab margin narrows to the tab's width plus 4 px and the card runs to 12 px from the glass. Not built in the prototype.

**What it buys.** More text width on a phone, and the tab still does not move on open.

**What it costs.** Needs building and measuring (the drawer walk, the narrow card audit).

**Screenshots** (today → proposed):
- a quick judgment at 390: `shots/current/quick-keys-charter-390.png` → `shots/proposed/quick-keys-charter-390.png`

**Options** (recommended first):
- **(a) Narrowed margin** — As described; one design at both widths. *(recommended)*
- **(b) Tabs along the card's top at 390** — More width, but the tab moves on open at 390 and not at 1600.
- **(c) Leave 390 as it is** — —

### 1541.21 — The *Why are you changing this?* box appears only once you change something

**What you see now.** Every settled rule card, ✉️ and the deadlock's desk show an empty reason box before anything has been chosen or typed.

**What the proposal changes.** The reason box appears with the first keystroke or pick, below the first line, so nothing above moves. A reason still rides every change (CP3).

**The ruling it touches.** SURFACE §9's composer row, which lists *the rationale lane* among the card's standing parts.

**What it buys.** No empty box asking why before there is a change.

**What it costs.** The card grows by one box at the first keystroke.

**Screenshots** (today → proposed):
- 🪶 settled: `shots/current/title-settled-1600.png` → `shots/proposed/title-settled-1600.png`
- the deadlock's desk: `shots/current/race-sanctions-charter-1600.png` → `shots/proposed/race-sanctions-charter-1600.png`

**Options** (recommended first):
- **(a) With the change** — As built. *(recommended)*
- **(b) Always shown** — The composer row as it stands.

### 1541.22 — In edit mode, a single-place draft has one ✏️ — the floating row's

**What you see now.** A draft at one place shows 🗑️ ✏️ twice: on its card and on the floating proposal row, which also overlaps the card's foot (plain bug 9). SURFACE says both: §9's editing row, *"none on the card — the ✏️ hold is the proposal-row's (Q1382)"*, and §9.1's ✏️ row, *"the same ✏️ drawn on a single-site card"* (Q1486 (E)).

**What the proposal changes.** The card carries no ✏️; the countdown to your next ✏️ stays on the proposal row's ✏️. The overlap is fixed either way (1541.39).

**What it buys.** One act, one button.

**What it costs.** None found.

**Screenshots** (today → proposed):
- a single-place draft, today: `shots/current/editing-one-site-1600.png` → *(today only)*

**Options** (recommended first):
- **(a) The row's ✏️ only** — Q1382 wins; §9.1 amended. *(recommended)*
- **(b) The card's ✏️ only** — Q1486 (E) wins; the floating row hides for a single place.

### 1541.23 — 🥂 states the closing moment once

**What you see now.** 🥂 says the document *closed at 00:51* in its first line and *final as of 00:51* in a blue box beneath (plain bug 5).

**What the proposal changes.** The moment once, in the first line.

**The ruling it touches.** SURFACE §9's 🥂 row, *"final as of · the batch · your closing comment"*.

**What it buys.** One home for the fact.

**What it costs.** None.

**Screenshots** (today → proposed):
- 🥂: `shots/current/closing-closedband-1600.png` → `shots/proposed/closing-closedband-1600.png`

**Options** (recommended first):
- **(a) Once** — As built. *(recommended)*
- **(b) Keep both** — —

### 1541.24 — The 🏛️ grant says *Accept 🏛️*, like the other three

**What you see now.** Three grants read *Accept ‹glyph›*; the 🏛️ grant reads *Activate 🏛️* (Q1502), matching its title *Activate Your Membership*.

**What the proposal changes.** *Accept 🏛️*, so one word means *I take this power* everywhere.

**What it buys.** One word per meaning.

**What it costs.** Q1502's match with the title goes.

**Screenshots** (today → proposed):
- the 🏛️ grant: `shots/current/grant-voice-founding-1600.png` → `shots/proposed/grant-voice-founding-1600.png`

**Options** (recommended first):
- **(a) Accept 🏛️** — As built. *(recommended)*
- **(b) Keep Activate 🏛️** — Q1502.

### 1541.25 — An empty invitations or removals list says so in a sentence, in the document and on the card

**What you see now.** The band shows *(no outstanding invitations)* and *(nobody proposed for removal)*; the cards say *Nobody has been invited yet.* and *Nobody is proposed for removal.*

**What the proposal changes.** Since a card's first line is the line itself, the two must match: the band says the sentences.

**What it buys.** The document speaks in sentences, and these two already passed STYLE.

**What it costs.** The band's placeholder look goes.

**Screenshots** (today → proposed):
- ✉️: `shots/current/invite-settled-1600.png` → `shots/proposed/invite-settled-1600.png`
- ❌: `shots/current/remove-settled-1600.png` → `shots/proposed/remove-settled-1600.png`

**Options** (recommended first):
- **(a) The sentences, both places** — As built. *(recommended)*
- **(b) The bracketed form, both places** — Shorter; reads as a placeholder.

### 1541.26 — No *last changed* line on a text clause's card

**What you see now.** A charter card says nothing about when its clause last changed; its history is its records' tabs.

**What the proposal changes.** Unchanged: no such line.

**What it buys.** No line on every judgment card that the reader is not asking for.

**What it costs.** When a clause last changed is a press away, on its record's tab.

**Options** (recommended first):
- **(a) No line** — As today and as built. *(recommended)*
- **(b) *Last changed · ‹when›*** — A grey line on every charter card.

### 1541.27 — The prototype's new words need a STYLE pass before they ship

**What you see now.** The proposal brought words that have not passed STYLE: the label vocabulary (*Current text*, *Current rule*, *Proposed*, *What you proposed*, *Previous text*, *Rival · 23%*, *Rejected proposal*), the reasons a button is dark (*Choose one first*, *Type an address first*, *One 🏛️ each — withdraw yours first*), *Undecided when the document closed*, the power clauses in the past tense, *You preferred this before it changed*, *Kept by the Founder at the start*. `copy-check` does not run on the prototype.

**What the proposal changes.** Whichever you choose, every one of these goes into `design/copy.js` before a member reads it.

**Screenshots** (today → proposed):
- *Undecided when the document closed*: `shots/current/quick-keys-closed-1600.png` → `shots/proposed/quick-keys-closed-1600.png`

**Options** (recommended first):
- **(a) One STYLE pass before the build** — The whole vocabulary passed and frozen into copy.js first, so every family lands with passed words. *(recommended)*
- **(b) Family by family** — Each stage's words pass STYLE as it lands.
- **(c) Accept the prototype's words** — Into copy.js as they are.

### 1541.28 — May your name and picture change after the document closes?

**What you see now.** On a closed document ✋ still offers ✓ *Save*. Nothing in SURFACE says whether your name and picture may change after the close; the diagnosis found it and could not call it a bug.

**What the proposal changes.** Depends on your answer; the prototype draws your row read-only on a closed document.

**Screenshots** (today → proposed):
- ✋ on the closed page: `shots/current/myname-closedband-1600.png` → `shots/proposed/myname-closedband-1600.png`

**Options** (recommended first):
- **(a) No — frozen with the record** — The signatures stand under the names as they were; ✋ 🖼️ read-only after the close. *(recommended)*
- **(b) Yes — how you appear is not the record** — Name and picture stay editable; the record resolves names live, as people rows already do.
- **(c) Picture yes, name no** — The name is what the signatures are under.

## Part 2 — Findings

Faults in today's page. Each is fixed in the BUILD.md stage named, whatever the questions decide, unless you veto it; option (b) brings one forward as a patch on main.

### 1541.29 — A member reads *Set to undefined* on 🌍 and ❌

**What you see now.** On a live document before 🍾, a member opening 🌍 in Rules (or ❌ under *Proposed for removal*) reads *Set to undefined*; the ❌ card also claims *Set by the founder when the document was made* for a price the document has not begun under. Plain bug 1: the value is looked up in the Founder's page state, which a member's page does not have.

**The fix.** The first line is the document's own sentence, so there is no second reader to print *undefined*; a check fails the build on *undefined*, *NaN*, *null* anywhere on a card.

**Settled how.** Settled by the grammar (one home per fact; 1541.14). **Lands in** BUILD.md stage 3.

**Screenshots** (today → proposed):
- 🌍 read by a member, today: `shots/current/chamber-live_constitution_m-1-1600.png` → *(today only)*

**Options** (recommended first):
- **(a) Fix it in the build** — In the BUILD.md stage named, with its check. *(recommended)*
- **(b) Fix it now** — A small patch on main before the build starts.
- **(c) Leave it** — Veto: it is not a fault, or not worth fixing.

### 1541.30 — A closed document still asks you things and offers acts

**What you see now.** On a closed document the unaccepted grant offers *Accept ✒️* and its strip *Activate 🏛️*; ✉️ offers ✒️ *Send the invitations*; ✋ offers ✓ *Save*; every seat is served the admission card with *Prefer this* radios; ⏱️'s tabs say *waiting on you*; the topbar's ✏️ countdown still runs. Plain bugs 2 and 4.

**The fix.** Where the document is in its life is an input to every card, the tabs and the topbar: on a closed document nothing is offered but 🥂, no tab asks, the ✏️ countdown stops.

**Settled how.** Settled by the grammar (principle 4; the closed-page check). **Lands in** BUILD.md stage 7.

**Screenshots** (today → proposed):
- the ✒️ grant on a closed document, today: `shots/current/grant-pen-live_closed_founder-1600.png` → *(today only)*
- the topbar on the closed page, today: `shots/current/topbar-closed-1600.png` → *(today only)*

**Options** (recommended first):
- **(a) Fix it in the build** — In the BUILD.md stage named, with its check. *(recommended)*
- **(b) Fix it now** — A small patch on main before the build starts.
- **(c) Leave it** — Veto: it is not a fault, or not worth fixing.

### 1541.31 — One card names two different choosers

**What you see now.** On the closed fixture's ⏱️ (and ⏰ on a live closing document) the card says *Chosen by the Founder ✒️*, then *Decided by the members.*, then its latest record *Changed by the Founder*. Plain bug 3: two functions decide the same fact by different rules.

**The fix.** One reader for who chose a rule, printed once.

**Settled how.** Settled by the grammar (one home per fact; 1541.5, 1541.14). **Lands in** BUILD.md stage 3.

**Screenshots** (today → proposed):
- ⏱️ on the closed page: `shots/current/rate-closedband-1600.png` → `shots/proposed/rate-closedband-1600.png`

**Options** (recommended first):
- **(a) Fix it in the build** — In the BUILD.md stage named, with its check. *(recommended)*
- **(b) Fix it now** — A small patch on main before the build starts.
- **(c) Leave it** — Veto: it is not a fault, or not worth fixing.

### 1541.32 — The tab you press drops 33–99 px on every charter card, and the audit looks away

**What you see now.** *The tab you click does not move* holds in the band and fails on every charter card: the tab drops 33 px on a judgment, 62–84 on a record, 82 on a patch, 99 on the closed page's backlog at 390, because the label above the clause pushes it down. The card audit measures only the sideways half, with a comment calling the drop expected.

**The fix.** The label moves into the card's top space (1541.4); the audit measures both axes, on open, switch and close, at both widths.

**Settled how.** Settled by the grammar if 1541.4 is taken; the two-axis check is needed either way. **Lands in** BUILD.md stage 6.

**Screenshots** (today → proposed):
- a quick judgment: `shots/current/quick-keys-charter-1600.png` → `shots/proposed/quick-keys-charter-1600.png`

**Options** (recommended first):
- **(a) Fix it in the build** — In the BUILD.md stage named, with its check. *(recommended)*
- **(b) Fix it now** — A small patch on main before the build starts.
- **(c) Leave it** — Veto: it is not a fault, or not worth fixing.

### 1541.33 — A dark button explains itself only in a tooltip, and ✉️'s ✒️ is lit over an empty box

**What you see now.** 100 cards' dark buttons say why only on hover — and a phone has no hover (🪶 settled: ✒️ ✏️ both dark, nothing says why). On ✉️ the Founder's ✒️ is lit over an empty address box, a button that changes nothing.

**The fix.** Each dark button's reason is visible text in the row (*Give it a name first*; two different reasons print one line each); a button over an empty required box is dark.

**Settled how.** Settled by the grammar (principles 5 and 8). **Lands in** BUILD.md stage 3 onwards.

**Screenshots** (today → proposed):
- ✉️, a member: `shots/current/invite-seat_1-1600.png` → `shots/proposed/invite-seat_1-1600.png`

**Options** (recommended first):
- **(a) Fix it in the build** — In the BUILD.md stage named, with its check. *(recommended)*
- **(b) Fix it now** — A small patch on main before the build starts.
- **(c) Leave it** — Veto: it is not a fault, or not worth fixing.

### 1541.34 — The closed page does not say what the clock cut off, and claims powers in the present tense

**What you see now.** On the closed page 31 cards whose race or motion was still running show it with live-looking radios and nothing saying it was undecided at the close; 10 power cards say *The Founder may amend the title at will* on a document that has closed.

**The fix.** A cut-off race or motion says *Undecided when the document closed*, its proposals kept and labelled; a power reads *Until the document closed, the Founder could …*.

**Settled how.** Settled by the grammar (principle 4). **Lands in** BUILD.md stage 7.

**Screenshots** (today → proposed):
- a judgment on the closed page: `shots/current/quick-keys-closed-1600.png` → `shots/proposed/quick-keys-closed-1600.png`
- a power card, closed: `shots/current/pw_u_title-closedband-1600.png` → `shots/proposed/pw_u_title-closedband-1600.png`

**Options** (recommended first):
- **(a) Fix it in the build** — In the BUILD.md stage named, with its check. *(recommended)*
- **(b) Fix it now** — A small patch on main before the build starts.
- **(c) Leave it** — Veto: it is not a fault, or not worth fixing.

### 1541.35 — An opened card covers the bottom of the line above it

**What you see now.** 120 cards at 1600 (141 at 390) rise over the ink above their paragraph — at the founding ✉️'s card covers 10 px of the line above.

**The fix.** A card rises only into clear space (the cost is 1541.15).

**Settled how.** Settled by the grammar (the top-edge rule). **Lands in** BUILD.md stage 3 and 6.

**Screenshots** (today → proposed):
- ✉️ at the founding: `shots/current/invite-founding-1600.png` → `shots/proposed/invite-founding-1600.png`

**Options** (recommended first):
- **(a) Fix it in the build** — In the BUILD.md stage named, with its check. *(recommended)*
- **(b) Fix it now** — A small patch on main before the build starts.
- **(c) Leave it** — Veto: it is not a fault, or not worth fixing.

### 1541.36 — Empty frames: a head box with nothing in it, and a button row drawn empty under its hairline

**What you see now.** About 322 opened cards carry an empty 24 px head box above everything; the closed page's text cards draw an empty button row under a hairline (24 cards — the held backlog item *the closed text cards' empty commit row*); 232 cards carry some empty part.

**The fix.** A part with nothing in it is not drawn and takes its hairline with it; hairlines only ever stand between two things.

**Settled how.** Settled by the grammar (presence and the hairline rule); the backlog item goes. **Lands in** BUILD.md stage 1 onwards.

**Screenshots** (today → proposed):
- a motion card: the empty head box above the rule: `shots/current/mo_mo-4-seat_1-1600.png` → `shots/proposed/mo_mo-4-seat_1-1600.png`

**Options** (recommended first):
- **(a) Fix it in the build** — In the BUILD.md stage named, with its check. *(recommended)*
- **(b) Fix it now** — A small patch on main before the build starts.
- **(c) Leave it** — Veto: it is not a fault, or not worth fixing.

### 1541.37 — The mover's own motion card draws a radio with no label

**What you see now.** On a constitutional motion you moved, the rule as it stands carries an empty ring that does nothing; a screen reader hears an unnamed radio. Plain bug 7.

**The fix.** A radio exists only where the reader can choose; the mover's card has none, and its one button is *🗑️ Withdraw*.

**Settled how.** Settled by the grammar (a radio only on a live choice). **Lands in** BUILD.md stage 4.

**Screenshots** (today → proposed):
- the mover's motion card: `shots/current/mo_mo-4-settled-1600.png` → `shots/proposed/mo_mo-4-settled-1600.png`

**Options** (recommended first):
- **(a) Fix it in the build** — In the BUILD.md stage named, with its check. *(recommended)*
- **(b) Fix it now** — A small patch on main before the build starts.
- **(c) Leave it** — Veto: it is not a fault, or not worth fixing.

### 1541.38 — The 👑 Text question's ✒️ is solid green, and its strip leads with 💡

**What you see now.** On a live document the Founder's 👑 question about the Text draws its ✒️ accept in solid green, and the strip's front tab is the race's 💡 rather than 👑. Plain bug 8.

**The fix.** ✒️ drawn like every glyph button (1541.13); the strip's front tab is the card's own.

**Settled how.** The green is settled by the grammar; the front tab is a plain fix. **Lands in** BUILD.md stage 4.

**Screenshots** (today → proposed):
- the 👑 Text question, today: `shots/current/crown_cq-4-live_session_founder-1600.png` → *(today only)*

**Options** (recommended first):
- **(a) Fix it in the build** — In the BUILD.md stage named, with its check. *(recommended)*
- **(b) Fix it now** — A small patch on main before the build starts.
- **(c) Leave it** — Veto: it is not a fault, or not worth fixing.

### 1541.39 — The floating proposal row overlaps a single-place draft's card

**What you see now.** In edit mode the floating 🗑️ ✏️ row covers the foot of a single-place draft's card (plain bug 9, its overlap half; which ✏️ survives is 1541.22).

**The fix.** The floating layer never covers a control or a line of text.

**Settled how.** Settled by the grammar (the overlay rule). **Lands in** BUILD.md stage 8.

**Screenshots** (today → proposed):
- a single-place draft in edit mode, today: `shots/current/editing-one-site-1600.png` → *(today only)*

**Options** (recommended first):
- **(a) Fix it in the build** — In the BUILD.md stage named, with its check. *(recommended)*
- **(b) Fix it now** — A small patch on main before the build starts.
- **(c) Leave it** — Veto: it is not a fault, or not worth fixing.

### 1541.40 — On a phone, the contents drawer's marks run past its edge

**What you see now.** At 390 the lifecycle marks beside the contents drawer's headings run past the drawer's glass, and *…8 more* is cut. Plain bug 10.

**The fix.** The marks stay inside the drawer; a check asserts it at 390.

**Settled how.** A plain fix, guarded by the overlap check. **Lands in** BUILD.md stage 8.

**Screenshots** (today → proposed):
- the contents drawer at 390, today: `shots/current/page-drawer-left-390.png` → *(today only)*

**Options** (recommended first):
- **(a) Fix it in the build** — In the BUILD.md stage named, with its check. *(recommended)*
- **(b) Fix it now** — A small patch on main before the build starts.
- **(c) Leave it** — Veto: it is not a fault, or not worth fixing.

### 1541.41 — Type and spacing off the scales

**What you see now.** 23 font sizes and 67 spacing values in the stylesheets are off the type scale and the 4 px grid; every card box carries off-grid padding (the audit's S1 sees it 1,408 times).

**The fix.** Each on a token, or on an allow-list with its reason (the glyph size, the 24 px sockets); a style lint in CI.

**Settled how.** A check, not the grammar. **Lands in** BUILD.md stage 1.

**Options** (recommended first):
- **(a) Fix it in the build** — In the BUILD.md stage named, with its check. *(recommended)*
- **(b) Fix it now** — A small patch on main before the build starts.
- **(c) Leave it** — Veto: it is not a fault, or not worth fixing.

### 1541.42 — The fixture's closed page shows states a real closed document never has

**What you see now.** The fixture's closed page still serves 14 unjudged pairs, a park awaiting assent and an open ⏱️ motion — none of which a live closed document produces. The probes and the audits read the fixture, so they measure faults no member can meet (the only surviving orphan hairlines are here).

**The fix.** The fixture closes the way a live document does.

**Settled how.** A fixture fix. **Lands in** BUILD.md stage 0.

**Screenshots** (today → proposed):
- the park on the fixture's closed page: `shots/current/park-accounts-closed-1600.png` → `shots/proposed/park-accounts-closed-1600.png`

**Options** (recommended first):
- **(a) Fix it in the build** — In the BUILD.md stage named, with its check. *(recommended)*
- **(b) Fix it now** — A small patch on main before the build starts.
- **(c) Leave it** — Veto: it is not a fault, or not worth fixing.

### 1541.43 — SURFACE's ordinary-motion row still says *Keep this*

**What you see now.** Q1377 changed *Keep* to *Prefer* on what stands, because the current rule is a peer of the proposal, and T48 says so; §9's ordinary-motion row still reads *Keep this*.

**The fix.** The row reads *Prefer this*, as the page already does.

**Settled how.** A SURFACE edit, scheduled with the motions stage. **Lands in** BUILD.md stage 4.

**Screenshots** (today → proposed):
- an ordinary motion: `shots/current/mo_mo-5-settled-1600.png` → `shots/proposed/mo_mo-5-settled-1600.png`

**Options** (recommended first):
- **(a) Fix it in the build** — In the BUILD.md stage named, with its check. *(recommended)*
- **(b) Fix it now** — A small patch on main before the build starts.
- **(c) Leave it** — Veto: it is not a fault, or not worth fixing.

