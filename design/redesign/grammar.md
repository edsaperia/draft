# Grammar — principles, the card grammar, the layout grammar (Q1541, stage 3; v2 after the critique)

> **Overridden where they disagree by `answers.md`** (Ed's answers to Q1541.1–.56, 2026-09-25) — its ten principles replace §1, its space-above ruling replaces G5 and G6, and `BUILD.md` / `checks.md` are revised to it; read this file as the reference only where the answers leave it standing.

**Version 2**, 2026-09-25, revised after `critique.md` and the 39 amber *worse than today* notes in `mockups.html`. Ids are stable: every principle, rule, break and open choice keeps its number, and whatever changed is marked **v2**. What changed and why is §0, *Changes from v1*; read it first if you read v1.

Version 1 was written 2026-09-25 from `diagnosis.md` (its classes D1–D13 and four causes), `inventory.md`, SURFACE §1/§6/§8/§9, STYLE, CLAUDE.md and the DECISIONS entries behind every rule broken here. It proposes; nothing in the product changes. Where this file and SURFACE disagree, SURFACE is the rule until Ed rules on the break, and every such place is a numbered break (§7) that stage 6 turns into a question.

**What the diagnosis changed about the brief.** PLAN's starting assumption — parts deciding their own presence inside a frame that does not know what ended up in it — explains the frame faults (D1, most of D3) but not the severe ones. The contradictions (D9) and the doubled facts (D2) come from two other causes: **the document's state is not an input to the card** (146 per-key branches; *closed* tested in ~27 places), and **one fact has several readers** (who chose a rule has three; what a rule is set to has two, one of which prints *undefined*). So the grammar is built round three things, in this order: **a card is a function of one state object; every fact on it has exactly one reader and one slot; and a slot or control exists only while it has content or a job.** Presence rules alone would have fixed the cheap classes and left the expensive ones standing.

Contents: §0 changes from v1 · §1 principles · §2 the card grammar · §3 the layout grammar · §4 tokens · §5 the checks · §6 five cards built by the grammar · §7 breaks · §8 the map · §9 open choices · §10 what the prototype proves, and what the programme costs.

---

## 0. Changes from v1

Two independent reviews of v1 — the adversarial critique (`critique.md`, findings 1–19 and notes A–H) and the stage-4 mockups' amber notes (`mockups.html`, 39 of them) — found the same weaknesses. v1 was right about the frame (the band's settled cards read better at once) and wrong in four places: it read *a closed document offers nothing* as *shows nothing*, it let the head carry no label, it treated every card as a place when some cards are acts or questions, and it stated its geometry without exceptions it could not keep. v2's answers:

| # | v1 said | v2 says | why (the finding) |
|---|---|---|---|
| 1 | P4: a closed document *offers nothing but 🥂* | **P4 v2**: it offers **no act** but 🥂's signature and keeps everything it recorded readable; **B7 v2** is narrowed to settings ladders — proposals, rivals and cut-off races stay as labelled blocks with no controls | critique 1, 2, D; amber 6, 7, 8, 17, 23 — a cut-off race opened to its clause alone, the deadlock lost its eight proposals, the locked 🎩 printed a fact and its opposite |
| 2 | B2/B3: every card heads with its place, and no card has a title | **P9 v2 and the label slot (§2.3a)**: a place card's head stays the line, but a card that is an act or a question (✋ 🖼️ 📧, 🌂, 🥂, 🍾, the grants, the power cards, 🎩 while asked, 👑) carries its ask as the **head label**; **B3 is withdrawn** in favour of **O6 (b)** | critique 10, amber 16, 36 — 🌂 named no act, the personal cards asked nothing |
| 3 | O1 (a): a block's label in its lane, beside its radio | **one label slot**: every block's label is its **first line**, the head's label sits in the card's top inset, drawn one way, and present wherever two similar paragraphs could be confused (Q207). A block with no live control cannot be built without a label | critique 4, 5, G; amber 2, 3, 9, 12, 21, 26 — four label placements; Q207's reader lost wherever the head had no radio |
| 4 | B4: the eyebrow and the dateline move below the head | **B4 v2**: the eyebrow's job moves into the head label, which does not displace the head; **a record's outcome comes first again** — it *is* the record's head label, in the outcome's colour (Q1522 kept); a superseded record says it is history | critique 3; amber 3 |
| 5 | P5/P8: a dark control *says* what will wake it | **P5 v2, P8 v2**: it says so **in words on the card**, in the row's note slot — a tooltip is not a note, since a phone has no hover; two dark commits with two reasons show both | critique 8, E |
| 6 | P1/P2 without exceptions | **P1 v2, P2 v2**: four stated exceptions to *word for word* (record, multi-place patch, gap, the birth's 🪶) and two to *moves 0 px* (a patch's other places, a filed tab's peek); a **top-edge budget** (**G5**): a card rises above its head only into the space above the head, never over ink | critique 6, 15, A, B — 📍 covered 🪶's descenders |
| 7 | the head is *the line*, power line and all, with no view on phase | **P3 v2**: a settings card's head is the rule's line **without its power line** — Ed's own ruling of 2026-09-03 (*the document keeps the powers; the card drops them*, session-view.html's `clauseText`), which v1 overrode unannounced; the power line is the subject of the ✒️ 🛡️ tabs' cards. **P4 v2**: a head is **true in the card's phase** — no *may amend this at will* on a closed document | critique C; amber 1, 13, 15, 19 |
| 8 | power cards head with the rule | **B8 v2**: a power card heads with **the power's own clause**; its fact line says who holds the power | critique 7; amber 18, 19 |
| 9 | P7: the solid accent is the acknowledgement alone | **P7 v2** made true: a chosen radio is a filled dot, not a filled pill; a vote on a text that has since changed is a fact, not a pressed *Preferred*; no green on ✓, recorded or armed | critique 9, F |
| 10 | 🗑️ alone withdraws | **J2 v2**: a withdraw carries its word | critique 11 |
| 11 | the 📝 door inside the sheet (G4) | **Ed's 2026-09-24 ruling restored** — the door straddles the page's edge; **G4 v2** makes the floating layer a sanctioned overlay that may cross a zone's edge but never covers a line of text | checks.md doubt 2; amber 39 |
| 12 | cards emptied by the grammar keep the strip's height | **G6 (new)**: the card ends where its content ends; a strip longer than the card hangs on down the gutter, and only the content below is pushed | amber 13, 20, 23, 31, 38 |
| 13 | (not stated) | **§10**: the prototype is a sorter over today's markup; the checks pass against a sorter; converting the 40 card bodies to read one `CardState` (**O7**) is the programme's main cost; **P10 is not built** | critique 13, H |

Smaller v2 changes, each marked where it lands: 👑's current rule appears once and its reason sits under the proposal (amber 24, 25); a rejected motion's news labels the rejected proposal, never the rule that stands (amber 27); news of a change keeps its sentence (amber 30); provenance takes one time form (critique 5); empty people lists speak as the document does (critique 14, amber 5, 34, 35); B1 says a record's outcome word stands in for T48's label (critique 16); records owed at the close are acknowledged by 🥂's signature (critique 12); the patch's navigator lives in its head label (amber 9); the deadlock keeps *— and it is still standing* (amber 10).

---

## 1. Principles

Ten, each a sentence a reviewer can hold against a screenshot. The check that holds each is named; §5 defines them. **v2** marks what changed.

1. **A card opens in place of the line it is about, and that line stays where it was, word for word, as the card's head.** The clause, the rule, the row of faces, the title — whatever the tab hangs on is the first thing in the card, in its own face and size, on its own first line. **v2 — four stated exceptions**, each with its own head rule: a **record** heads with the wording it recorded, its label saying how and when it ended (and *since replaced* where the paragraph has moved on); a **multi-place patch** heads with the place it is showing; a **gap** heads with *(no text here)*; and at the **birth**, before there is a title, 🪶 heads with the title lane itself, at `--h-title`, where the title will stand. And one *trim*, not an exception: a rule's paragraph carries its power line beneath it, and the card heads with the rule's line alone (P3 v2). *(head-registration, place-head)*
2. **Opening a card moves nothing above it and nothing beside it.** The paper's edges, the text column, the pressed tab and the head's first line move 0 px on both axes, at 1600 and at 390; only what lies below the card is pushed down. **v2** — the card's box may rise above its head only into the space between the head and the ink above it (**G5**), never over ink; and two movements are not *opening*: going to a patch's second place is travel, as a rail click is (M17), and a filed tab steps out of its pile by its peek. *(still, top-edge)*
3. **Every fact on a card has one home.** What stands is the head; who chose it and when is the line under the head; what it replaced is a labelled block; why is under its speaker; the price is on the commit. Nothing is said twice, in the same words or in others. **v2** — a rule's paragraph states two facts on two lines, the rule and the Founder's powers over it (STYLE §3, entry 198), and **each has its own card**: a settings card heads with the rule's line alone, and each power card heads with its own clause of the power line. This is Ed's ruling of 2026-09-03 (*the document keeps the powers; the card drops them* — session-view.html's `clauseText`, whose `withPowers` is false on a card), which v1 overrode without numbering it (critique C: *the head has become the home of two*). STYLE §3's last sentence, *the opened card's head shows the same two lines*, predates that ruling and is drift. *(one-home)*
4. **v2 — A card shows what this reader can do now; a closed document offers no act but 🥂's signature, and keeps everything it recorded readable.** Who is looking and where the document is in its life are inputs to the card. On a closed document every proposal, rival and cut-off race stays on its card as a labelled block with no control, and what the clock cut off says so; no card offers an act its reader's state forbids; and **a head copied from a paragraph is true in the card's phase** — no power is claimed on a document that has closed. *(closed-page, closed-keeps-content, closed-tense, raw-value)*
5. **A control is drawn only while it has a job.** An enabled control changes something when pressed; a dark one says what will wake it, and that thing can happen in this phase. **v2** — it says so **in words, on the card**, never only in a tooltip: a phone has no hover. *(no-job, bin-job, note-visible)*
6. **An empty slot is not drawn, and takes its hairline with it.** A hairline separates two alternatives, or the content from the act, and nothing else; there is never one at a card's top or foot, and never two with nothing between. **v2** — and a card is never taller than what it holds: a long strip hangs on down the gutter rather than padding the card with white (**G6**). *(empty-slot, hairline-gap, P12, strip-blank)*
7. **A fact is text, a choice is a radio, an act is a button — and each drawing means one thing.** Nothing that already happened is drawn as a pressed control; solid green is not a button; the solid accent is the acknowledgement alone. **v2** — made true of the drawing: a chosen radio is a filled dot on the accent ring, never a filled pill; a vote about a wording that has since changed is a fact line, never a pressed *Preferred*; ✓ is never green, armed or recorded. *(role-drawing)*
8. **One commit row.** The bin at the left only when there is something of yours to remove, one note in the middle, at most two commits at the right, and one acknowledgement form. **v2** — a withdraw says so in its word (*🗑️ Withdraw*), and the note slot is visible text holding each dark commit's reason, one line per distinct reason. *(row-vocabulary, note-visible)*
9. **The same thing is drawn the same way everywhere** — in the band and in the charter, on a live card and a record, at 1600 and at 390. **v2 — and every card says what it is about and what it asks**: a head label names the head's role (*Current text*, *Current rule*, how a record ended) or, on a card that is an act or a question, the act or question itself; every block's label is its first line, drawn one way. *(head-form, slot-order, width-invariance, label-slot)*
10. **Nothing you are in the middle of is taken by the page updating.** A caret, a selection, a press, a drag, a half-typed value and a scroll position survive every render and every poll. **v2 — status: not built.** The prototype does not implement U1/U2 and no check measures it; this is the principle live rooms have taught hardest and the one this proposal has demonstrated least (§10). *(render-hold)*

---

## 2. The card grammar

### 2.1 The one input: the card's state

Every card is built by **one shell** from **one value**, `CardState`, made once per card per render by one function (`stateOf(cardKey)`), and **no slot reads anything else** — not the view, not `S`, not the module. Today each body re-derives the state it needs, which is how 🌍 prints *Set to undefined* to a member (the body read the founder's page state) and how a closed document offers *Accept ✒️* (the body never asked about *closed*). If the slots can see only `CardState`, those faults cannot be written: a slot that wanted *closed* has to find it in `CardState`, where it is always present.

`CardState` holds, and only holds:

| field | what it is | read from (the one reader) |
|---|---|---|
| **card** | kind, id, and the **anchor** — the place the card stands for: a clause or run, a gap, a rule's paragraph, a line a pile hangs on (the Founded line, the Proposals preamble), a register row or subsection | the item list (`itemsFromView`, `ORDER`/`SEC`) |
| **reader** | who is looking: founder-member · founder-clerk · member · stranger · applicant; the seat id | the seat |
| **phase** | where the document is in its life: *birth* (before the save) · *founding* (saved, not begun) · *live* · *closed* — and the line's state: *up* · *lost* (C17) · *paused* | the view |
| **place** | the anchor as the document draws it right now — the exact input the column's own paragraph renderer takes | the paragraph renderer's input (`placeOf`) |
| **standing** | for a rule: what stands, who chose it (*the Founder* · *the membership*), by which road (founding · pen · vote), and when — or nothing, before a first decision | `provenanceOf` — one function replacing `provOf`, `ctx.lockline` and the record's eyebrow |
| **power** (v2) | on a power card: which power, its own clause (in the phase's tense), who holds it and since when | `powersOf` |
| **acts** | the commands this reader may send on this card now, each with its glyph, route and price, or with the reason it is not yet available (`until`) | `actsOf` — the `may*` family, asked once, with `phase` inside it |
| **alternatives** | what may be chosen, each with its text, speaker and field — already filtered by value (what stands is never among them, Q620) and by `acts` (nothing is offered that no act could send) | `alternativesOf` |
| **owed** | what this reader owes the card: nothing · an OK · an Accept · a signature | the owed-OK set (`owed.ts`) |
| **record** | for a record or a news card: the outcome, when, the field (ranked wordings with shares, or the rule before and after), the participation line | `outcomeOf` |
| **draft** | what this reader has chosen or typed here and not sent — radio, fields, reason, sign choice | the provisional layer (`S`), this card's keys only |
| **notes** | the clocks and messages about the act: the abstention deadline, the next ✏️, a refusal, *n places changed* | `abstainAt`, the wallet's drip, the last refusal |

**Rule S1 — slots read `CardState` only.** *Check:* `state-only` (a static lint in phase two: slot builders import nothing but the state and the copy table) and `raw-value` (no rendered string contains `undefined`, `NaN`, `null`, `[object` or `Invalid Date`).

**Rule S2 — the head is the document's own rendering of the anchor.** The card head is produced by the same function, from the same input, that draws the anchor's paragraph in the column. There is no second reader of a rule's value (`VALUE`, `readBody`'s *Set to*, `headFor`) to disagree with the first. *Check:* `head-registration` (the head's text equals the closed paragraph's text, and its first line box lands on the paragraph's).

### 2.2 The facts and their homes

Every kind of fact a card states, the one place on the card it may appear, and its one reader. **A fact not in this table does not appear on a card.** Two facts sharing a slot are joined in that slot's one line, never split across two.

| fact | its home on the card | reader | today's other readers, retired |
|---|---|---|---|
| **the place as it stands** — clause, rule, title, row of faces | **head** | `placeOf` | the charter eyebrow's clause copy, the settings standing block, `readBody`'s *Set to …* line, `VALUE` |
| **who chose what stands, and when** | **fact line**, under the head | `provenanceOf` | the provenance radio (CP2), `ctx.lockline` (*Set by the founder when …*, *Decided by the members.*), the record eyebrow |
| **how a record ended, and when** (Passed · Rejected · Refused by the Founder · Changed by the Founder · Undecided at the close) | **v2: the head label** — first, in the outcome's colour, in the card's top inset (Q1522's *what it did first*, kept); *· since replaced* where the paragraph has moved on | `outcomeOf` | the record's eyebrow row above the head (which displaced it), 🥂's *final as of* box |
| **a record's participation** (*7 of 20 weighed in · quorum was 7 · you preferred this*) | **fact line** | `outcomeOf` | — |
| **who holds a power** | **v2: a power card's fact line** (*Kept by the Founder at the start · ‹when›*) — not the provenance of the rule the power sits on | `powersOf` | the rule's provenance, which v1's power cards printed |
| **that a race was cut off by the close** | **v2: fact line** — *Undecided when the document closed* | `outcomeOf` | — (v1 hid the race) |
| **what a change replaced** | a **block** labelled *Previous rule* / *Previous text*; **v2** — on a news card whose previous value is not a sentence, the news sentence itself (*The Founder has changed who may read the document from members only to anyone with the link.*) is the body, and there is no block | `outcomeOf` | the news card's *was / now* change line (its halves become head and block) |
| **why** — a rationale | under the **speaker** of the block (or head) it argues for | the item | — |
| **what a thing is** — a grant's power, 🌂's warning, 🍾's and 🥂's batch, the park's sentence, the price of a door | **body** | the copy table, by kind | — |
| **what you may choose** | **blocks** (and the head's lane, where what stands is itself a choice) | `alternativesOf` | — |
| **what you may do** | **row** (commits), **lanes** (radios) | `actsOf` | 41 separate `binBtn()` calls; per-body commit logic |
| **what doing it costs** | the commit's **tooltip**, once (T17) | `actsOf` | — |
| **why a commit is dark** | **v2: the row's note**, as text (P5 v2); the tooltip may repeat it, never hold it alone | `actsOf` (`until`) | the dark commit's tooltip, which a phone cannot show |
| **when silence becomes an abstention** | the Indifferent block's note (§9.1) | `abstainAt` | — |
| **when the next ✏️ arrives**, a refusal, *n places changed*, *one vote for all 3 places* | the row's **note** | `notes` | the patch's note fenced between two hairlines (v1) |
| **what a block is** (*Proposed*, *What you proposed*, *Previous text*, *Rejected proposal*) and **what the head is** (*Current text*, *Current rule*) | **v2: the label slot** — a block's first line; the head's in the card's top inset (§2.3a) | the kind and the block's role | *The clause as it stands* above the head, *Proposed* above or below or beside the block, *Previous text* above-right, *the text that stands* lower-case (four placements) |
| **the card's name** (the ask while outstanding, the noun once settled) | **v2: the head label on a card that is an act or a question** (✋ 🖼️ 📧, 🌂, 🥂, 🍾, the grants, the power cards, 🎩 while asked, 👑); on a place card, not on the card — the tab's tooltip and the rail entry | `labelOf` | the title heads of the personal cards, 🌂 and 👑, drawn as a head *above* the place |
| **how the room is leaning, or how many answered** | nowhere on a card (C12; the counts are 🍾's) | — | — |

**Rule F1 — one home per fact.** Each rendered fact carries its role (`data-fact="place|provenance|outcome|previous|reason|price|name"`); a card holds at most one element per role, and the head counts. *Check:* `one-home`. A text check cannot do this job — the diagnosis found every doubled fact is a paraphrase — so the roles are the enforcement and the grammar is the prevention.

### 2.3 The slots

A card is **the strip** plus **six slots, always in this order**:

| # | slot | what it may hold | present when |
|---|---|---|---|
| — | **strip** | the anchor's tabs (the pile opened), in the gutter; the pressed tab is the card's own. Not in the card's flow: it hangs off the head's first line and is positioned by the anchor, never carried inside a head box | always |
| — | **v2: head label** | the label slot's head half (§2.3a): the head's role, a record's outcome, or an act card's ask. Drawn in the card's top inset, so it never moves the head | the card draws any block, is a record, or is an act or question card |
| 1 | **head** | `placeOf(anchor)` — the anchor's own rendering. **v2**: on a power card, the power's own clause; on a closed document, the paragraph as it reads in that phase (no power it no longer has). It carries a **lane** (radio, and ✏️ *propose edit* on text) **exactly when what stands is one of the choices this reader's act can make**: the keep lane on a quick or insert pair, the standing rule on a consent or ordinary motion card (Q1362's peer). It carries a **speaker** exactly when it is also a record's winner (the head *is* the wording that passed). On a text record whose outcome is what now stands, it wears the record's marks | always, except on a **placeless card** — the diagonal, the stranger's two, the applicant's five — which heads with its title (`labelOf`), there being no line to stand in for |
| 2 | **fact** | one line, `provenanceOf` or `outcomeOf`, at `--t-small` in `--muted`; where it runs past one line at 390, it wraps, it does not split | the head is a **rule** with a decided value (a setting, a power line, a door's price), or the card is a **record or news** — and the fact is not already in the head's own words (F1). Never on a running race, never on a text clause (its history is its records' tabs). **v2**: also on a race or motion the close cut off (*Undecided when the document closed*). Where the head has a lane, the fact line stands **between the head's words and its lane**, so who chose what stands reads with what stands and never as a caption for the block below (amber 4, 22) |
| 3 | **body** | prose about the thing or the act, by kind: a grant's power, 🌂's warning, 🍾's batch and readiness, 🥂's batch, the park sentence, a door's price and the Founder's sentence | the kind has a body **and** it is non-empty for this state |
| 4 | **blocks** | option blocks (**v2**: label · text · speaker · lane) and record blocks (label · text · speaker · share), and Indifferent last where the act is a judgment (CP4). A block's label (*Proposed*, *Previous text*, *Rejected proposal*) is the block's first line (§2.3a) | `alternatives` is non-empty, or the card is a record with a field. **v2 — narrowed (B7 v2)**: a reader with no act that chooses sees **no settings-ladder rungs** (what was not chosen is not a thing anybody can do); **proposals, rivals, a record's field and what the close cut off are content, not controls, and stay**, each labelled, with no radio |
| 5 | **input** | what an act needs that is not a choice: the address box, the subject dropdown, the rationale lane, the closing comment, the sign choice (K28). A refusal stands under the input it refuses. **v2**: a note that explains a field (*Previous links still work.* under 📍's address) stays with the field, never with the fact line (amber 14); an input may carry a label (*Your closing comment*, the deadlock desk's *Propose something everyone can agree on*) in the same slot as a block's | an act in `acts` needs it — and **the rationale lane only once the draft differs from what stands** (CP3: a reason rides a change, and there is no change until something is picked or typed) |
| 6 | **row** | the commit row, §2.6 | at least one control with a job (§2.5) |

**Rule L1 — presence.** A slot with nothing in it is not in the DOM — no box, no margin, no placeholder span. The shell exports the presence predicate of each slot (the right-hand column); the audit reads the drawn slots and asserts they equal the predicate's answer for the card's state. *Checks:* `empty-slot` (no slot element whose visible content is nothing, or nothing but whitespace, and no zero-content box with height > 0), `presence` (drawn slots = predicate), `slot-order` (drawn slots in the table's order).

**Rule L2 — one shell.** Band and charter cards are the same shell (today `suggCardHtml` and `cardHtml`, the fourth cause). Nothing in the evidence argues for two: every difference the inventory found between them — an eyebrow on one side, a 🗑️ spacer on one side, the tab dropping on one side, four head forms — is a fault in one of them. *Check:* `head-form` (every head is the paragraph renderer's element; nothing drawn above a head **in the flow** — v2: the head label lives in the card's top inset, out of the flow, and is the one thing allowed there).

### 2.3a The label slot (v2)

v1 took the eyebrow off the head (it cost the tab 33 px) and moved its words into the head's lane, beside a radio. That left three faults the critique found at once: a head with no radio had no label at all, so on a rivals-only race, your own proposal and the deadlock the reader met near-identical paragraphs with nothing saying which was the current text (Q207's reader, lost); block labels ended up in four places (in the lane, above-right, at the block's foot, as a lower-case line); and a record's outcome, which Q1522 put first, came sixth. v2 gives labels **one slot, drawn one way**:

- **Where.** A block's label is **its first line**, left, above its words. The head's label is **in the card's top inset** — the space the card's box already takes above the head's first line (G5) — so it is read first and moves nothing: the head still lands on its paragraph at 0 px.
- **How it is drawn.** One drawing, and it already exists: **the design system's eyebrow treatment** (system.css's `.eyebrow` rule — `--t-micro`, 700, upper case, `--muted`), which today's *Proposed* and *The clause as it stands* wear already; v2 adds a place for it, not a style. Line height 1, so a label is 10 px of text, and the head label's foot stands 2 px above the head's first line. One line (it may wrap at 390 only on a block, never on the head). **A record's outcome is the one coloured label** — *Passed* and *Changed by the Founder* in `--ok` (green is *decided*, C7), *Rejected* / *Refused by the Founder* / *Undecided at the close* in `--muted`.
- **When it is present.** The head carries a label **whenever the card draws a block** (so what stands is never confused with an alternative — Q207), **whenever the card is a record**, and **whenever the card is an act or a question**. A block carries a label **whenever it has no live control** of its own, and **whenever it is one of two or more blocks of different roles** (a proposal beside the previous text). A settings rung with its radio is labelled by its radio's words (CP1, CP2) and needs no other. **A block with no control and no label cannot be built** — the slot is the lint.
- **The vocabulary** — every label on the surface is one of these (copy.js keys in phase two, through STYLE):

| label | on | replaces |
|---|---|---|
| *Current text* | the head of a live charter card, a gap's included | *The clause as it stands*, *The gap as it stands*, v1's in-lane *Current text* |
| *Current text — and it is still standing* | the deadlock's head | today's words, kept (amber 10) |
| *Current text · § ‹heading› · place n of m* with ↑ ↓ | a multi-place patch's head | the navigator eyebrow in the card's middle (amber 9) |
| *Current rule* | the head of a settings, motion, 👑 or news card that draws a block | — (v1: in the lane) |
| *‹outcome› · ‹when›* (and *· since replaced*) | a record's head, and on a rejected motion's block (*Rejected proposal · ‹when›*) | the record's *DECIDED · 7/14* eyebrow row |
| *Proposed* | a live proposal, a rival, a motion's proposed rule, and on a closed document what the close cut off | *Proposed*, *Two rivals* eyebrows |
| *What you proposed* | your own proposal or motion | the same words at the block's foot |
| *Previous text* · *Previous rule* | what a change replaced | the dashed-box label, the label under the old wording |
| *Rival · n%* | a record's losing wording | the right-aligned share above the block |
| *Rejected proposal* · *Refused proposal* | a failed motion's wording | the label under its rationale |
| *Your closing comment* · *Signed* | 🥂's input and its signatures | today's words, kept (amber 33) |
| *Propose something everyone can agree on* | the deadlock's desk (an input) | the desk's heading, kept |
| the card's ask, `labelOf` | the head of ✋ 🖼️ 📧, 🌂, 🥂, 🍾, a grant, a power card, 🎩 while asked, 👑 | the title head above the place (T3), which B3 had dropped |

*Check:* `label-slot` — every head on a card that draws a block, on a record and on an act card carries exactly one head label, in the top inset; every block with no live control carries one label, as its first child; no label is drawn anywhere else (no `.fieldlab` eyebrow, no label at a block's foot, no share above a block); every label's text is in the vocabulary.

### 2.4 Dividers

**Rule H1 — hairlines belong to gaps, never to slots.** A gap between two *drawn* slots, or between two blocks, takes a hairline or plain space by this table and nothing else; a slot owns no border of its own.

| gap (above → below) | hairline? |
|---|---|
| block → block | **yes** — alternatives are separated |
| head (with a lane or a speaker) → first block | **yes** — the head is itself an alternative |
| head, fact or body → first block | **yes** — the content ends and the choices begin |
| any slot → row | **yes** — the content ends and the act begins |
| head → fact · fact → body · body → input · block → input | **no** — space only (`--s3`) |
| the card's top, the card's foot | **never** |

Two hairlines with nothing between them therefore cannot be built (every hairline has a drawn slot on each side), and the P12 orphan — a row drawn empty under its top rule — cannot exist, because an empty row is not drawn. *Checks:* `hairline-gap` (every hairline has a non-empty drawn slot directly above and below it in the same card, and matches the table), card-audit **P12** (kept).

### 2.5 Controls exist only while they have a job

**Rule J1 — a control's job**, defined so a script can test it:

- An **enabled** control has a job if pressing it either **sends a command in `acts`** or **changes this card's `draft`** (picks, types, clears). *Check:* `no-job` drives each enabled control on every opened card and requires a network command or a change in the provisional layer (then undoes it).
- A **dark** control has a job only if its `until` names one of these reasons **and that reason can come true in the current phase**: `choose` (pick something first), `type` (write something first), `accept:<power>` (accept the grant first — Y19's dark ✒️), `drip` (the next ✏️ — its countdown in the row's note), `voice-out` (your 🏛️ is out on another motion), `readiness` (🍾 served refused while the room answers — F5), `reconnect` (C17), `flight` (a token is in the air). None of them can come true on a closed document, so **a closed document draws no dark control**. *Check:* `no-job` reads `data-until` on every disabled control and asserts it is in the list and reachable for `phase`.
- **v2 — a dark commit's reason is text on the card.** Each `until` has one sentence (*Choose one first*, *Type a new title first*, *Accept Founder Actions first*, *✏️ in 12:04*, *The room is still answering*, …), and the row's note slot prints it, visibly, at every width. Two dark commits waiting on the same reason print it once; two waiting on different reasons print one line each, glyph first (*✒️ Accept Founder Actions first · ✏️ Type a new title first*). A lit commit whose act would change nothing is not lit: ✉️'s ✒️ is dark over an empty address box, `until: type`, like its 🏛️ (critique 8). *Check:* `note-visible` — every dark commit on a live card has its reason in the row's note as rendered text, and the note is not empty, hidden or tooltip-only.
- A **radio** has a job only on a live lane — a block this reader can choose now. A block nobody may press has **no radio**, and on a read-only card it is not drawn at all (§2.3 row 4); the fact line and the head say what stands.

**Rule J2 — the bin.** 🗑️ means *remove what is yours* and nothing else. It is drawn exactly when:
- **there is an unsent value on this card that no other control on it can undo** — something typed, uploaded, composed or toggled; *a radio choice among blocks that include Indifferent is undone by choosing another or Indifferent*, so a judgment, a consent answer and an `adm:` vote carry no bin (Q1500's reason, generalised from a list of kinds to a rule); **or**
- **this reader has sent something here that can still be withdrawn** — their proposal, their motion, their application — and then its tooltip says what comes back (*the ✏️ comes back*, *your 🏛️ comes back*), from one copy key.

It is never drawn to close a card (the 👑 question's and the park's bins go), never drawn with nothing to put back (the 388 *Put it back as it stands* bins go), and a row may consist of 🗑️ alone exactly when withdrawing is the only job left (the author's proposed draft, the mover's motion). **v2 — a withdraw carries its word**: *🗑️ Withdraw*, because it is irreversible and because Q1500 found a bare bin read as *skip*; a discard stays the glyph alone, since it only takes back what has not been sent. *Check:* `bin-job` (🗑️ present ⇔ the predicate above, read from the card's state; a withdraw's text is *Withdraw*).

**Rule J3 — the price and the route are the commit's.** The glyph is the route (K7), the tooltip says the price once (T17), and the commit swaps as the value is typed (K6). Kept as ruled.

### 2.6 The commit row family

The inventory found **23 row shapes** for what §9.1 calls one grammar. Most of the variety is a 🗑️ with no job (eight tooltips, four acts), an OK used both to acknowledge and to close (six acknowledgement faces), and placeholder spans drawn empty. The route glyphs themselves are meaningful — one glyph per route is K7 and stays — so the grammar fixes **positions and membership**, not the glyph set.

**The row's three places.** Left: 🗑️ (J2) or nothing. Middle: **one note slot** — the ✏️ countdown, a refusal, *n places changed*, and (**v2**) each dark commit's reason, as visible text, one line per distinct reason — or nothing. Right: **at most two commits**, the Founder's power immediately left of the route's own (Q1154), or the acknowledgement alone.

**The six shapes** — every row on the surface is one of these, or is absent:

| shape | left | right | where |
|---|---|---|---|
| **absent** | — | — | a card with no job: every read-only card, a filed record, the 👑 question for anybody but the Founder, everything on a closed document but 🥂 |
| **withdraw** | *🗑️ Withdraw* (v2: the word is part of the control) | — | your proposal once proposed, the mover's own motion, a submitted application |
| **commit** | 🗑️ per J2 | one of ✓ · ✒️ · ✏️ · 🏛️ · 🪶 · 🍾 · 📧 · 📨 | an answer, a set, a proposal, a send, the start |
| **pair** | 🗑️ per J2 | one of (✒️, ✏️) · (✒️, 🏛️) — the Founder's pen beside the route (K29); (❄️, ✓) — the flame's chill beside the judgment; (🛡️, ✒️) — the 👑 question's refuse and accept (CP5) | as listed |
| **acknowledge** | — | **OK** | a card that owes this reader an OK: news, a record while unread, the park while unread, the mover's rejection (E41), 🥂 (the OK is the signature, K2) |
| **accept** | — | **Accept ‹glyph›** | a grant or gate not yet accepted (Q1501) |

**One acknowledgement form**: a word, on the solid accent with white ink, alone at the right of its row, and only while something is owed. Two words: **OK** (*I have seen this*) and **Accept** (*I take this power*). *Activate 🏛️* would be a third word for Accept (open choice **O3**). The close-only OK (on an accepted grant, a settled 🎩, a held power read by a non-founder, a settled 🍾, the stranger's read-only card) goes: an OK that is owed nothing is a second meaning of OK, and Q1522 (6) already took it off the record card on exactly that argument. The 👑 question's 🛡️ ✒️ is not an acknowledgement — it exercises a power — and keeps the glyph-commit drawing (so the Text question's solid green ✒️ is a bug, diagnosis 8).

**v2 — what a closed document owes.** A record, park or news card still owed an OK when the clock closes the document is **acknowledged by 🥂's signature**: 🥂's OK signs the document and discharges every OK owed at the close in the same press (K2 already makes it the one act), so no card on a closed page carries an OK but 🥂 (critique 12). The rail's entries for those cards leave with the signature. *Not verified in the prototype*: the rail is unchanged there, so an owed entry may stand until 🥂 is pressed, and the topbar's ✏️ drip still counts on a closed page (P4 v2 covers the page, not only the card; §10).

**Every card closes three ways, none of them a button**: its own pressed tab, a click on nothing outside it (C2), and Escape. That is what lets a card with no job have no row. *(open choice **O2** for the alternative; at 390 the tab is a 34 px target at the glass's edge, so the phone's exit is to be measured before B6 is built — critique Part 3)*

*Checks:* `row-vocabulary` (every drawn row is one of the six shapes, its right-hand glyphs from the listed sets and pairs), `role-drawing` (below).

### 2.7 One way to say who chose a value

The inventory found **five phrasings** of provenance for two facts (*Chosen by the Founder*, *Chosen by the membership*, *Set by the founder when the document was made.*, *Decided by the members.*, *Changed by the Founder*), drawn two ways (a pressed radio and a sentence), with 14 records naming both parties at once.

- **Provenance is text, in the fact line, from `provenanceOf` alone**: T48's two labels, verbatim — ***Chosen by the Founder ✒️*** and ***Chosen by the membership*** — then the moment in the card's long form (M23): *Chosen by the membership · Sunday, 20 September, 11:12*. Before a first decision there is no fact line (C11: a first decision is not a change; T13: the head already says *The Founder is deciding …*).
- **v2 — one time form.** The moment is always M23's long form (*Friday, 25 September, 03:22*). v1's *decided at the start* on 🎩 is retired: a setting decided at 🍾 carries 🍾's moment like any other.
- **A record's outcome is its own four words**: *Passed*, *Rejected*, *Refused by the Founder*, *Changed by the Founder* (Q1514, Q1526), and *Undecided at the close* on the backlog and on what the close cut off. These are how a motion ended, not who chose a rule; they do not appear on a live card. **v2**: the outcome and its moment are the record's **head label** (§2.3a), first, not a fact line under the rationale; and on a record **the outcome word stands in for T48's label** — *Passed* is the membership's choice, *Changed by the Founder* the Founder's — so the record does not print both (critique 16).
- **v2 — a power's holder is its own fact.** A power card's fact line says who holds the power and since when (*Kept by the Founder at the start · ‹when›*), never the provenance of the rule the power sits on (critique 7).
- **It is never a control.** The pressed provenance pill (490 records) goes — break **B1**.

### 2.8 Drawings and their one role

**Rule R1 — each drawing token has exactly one role.** *Check:* `role-drawing` asserts the table over the DOM.

| drawing | its one role | never |
|---|---|---|
| a radio with a filled dot on a `--primary` ring (**v2**: on a white pill, the words in `--primary` — never a filled pill) | a choice **this reader** has made on a live lane (sent or unsent) | provenance; a locked or unavailable option; any radio on a read-only card; **v2: a vote about a wording that has since changed** (that is a fact line: *You preferred this before it changed*) |
| the solid `--primary` fill, white ink | the acknowledgement — OK or Accept — while owed | a pressed option; a close-only button |
| a glyph commit, flat inert and lifted armed | an act that sends (every route glyph, ✓ included) | — |
| solid `--ok` green | **no button**; green is *decided*, on marks, on the record's passed highlight (`--ins-passed-bg`) and (**v2**) on a passed record's head label | the ✓ commit, armed **or recorded** (v2); the 👑 ✒️ |
| the outline 🗑️ | remove what is yours (J2) | close; put back nothing |
| a hairline | between alternatives, or content and act (H1) | a card's top or foot; a slot's own border |
| depth (`--shadow-*`) | open (CLAUDE.md: *open is said by depth*) | — |
| the struck greyed glyph | a power not held (§7.1) | — |
| highlighter yellow `--ins-bg` | words added, undecided (K19) | — |
| red `--lc-wrong` | something of yours went wrong (Q1484), and the reconnecting bar | — |

---

## 3. The layout grammar

### 3.1 Zones and their anchors (1600)

| zone | anchored to | may move | may never move |
|---|---|---|---|
| **topbar** | the window's top | — | anything, at any time; its height (sockets 24 px, avatar 26) |
| **desk** | the window | — | — |
| **contents rail** (left) | the window, below the topbar; its width `--rail-left` (300 from 1680) | its highlight follows the reader | on any card opening, closing or switching |
| **sheet** (the paper: Rules, then Text) | the column | its height grows below an opened card | its left and right edges, and its top edge in document coordinates, when a card opens, closes or switches (Ed's standing observation) |
| **text column** | the sheet (`--sheet-trim` in over the gutter) | — | its x and its measure (70ch), ever |
| **gutter** (tabs) | the column's left edge | a pile opens into a strip, downward from its front tab | **the pressed tab**, 0 px on both axes, on open, on a switch within a strip, on a switch between strips, on close |
| **card** | its anchor's first line | its own height, growing downward (`card-morph`) | the head's first line: 0 px from where the paragraph's first line stood, both axes |
| **content below the card** | the flow | pushed down by the card's growth | — |
| **queue rail** (right) | each entry beside its clause (M1, M5) | flow entries re-flow with their clauses; the open entry pins (M4) | an entry's own box when its 💤 figures appear (§9.1) |
| **floating layer** (📝 door, the proposal row) | the window's bottom-right / foot; **v2**: the door's centre on the Text sheet's right edge, never nearer the window's edge than `--s5` (Ed, 2026-09-24, *the door straddles the page's right edge* — restored) | appears and hides (K13) | **v2: it never covers a line of text** — it is a sanctioned overlay, so it may cross the sheet's edge into the gutter between the sheet and the queue rail, but its box never meets a text line's box (measured: at 1600 it crosses the sheet's edge and the queue rail's left margin, where no entry text stands) |
| **overlays** (drawers, modals, the reconnecting bar) | the window | — | they are the only things allowed in front of other zones |

**Rule G1 — what may move when a card opens, closes or switches:** the card's own height and body; the content below it; the queue rail's flow entries and the wires; the scroll position, only as M17 allows. **Everything else moves 0 px** — the paper's edges, the text column, the topbar, the contents rail, the sockets, the pressed tab, the head's first line. **v2**: *the paper's edges* means the sheet the card stands on; a sheet lying wholly below the card (the Text sheet under an open Rules card) is content below, and is pushed down like any (checks.md doubt 1). *Check:* `still` — card-audit's P2 made two-dimensional (the comment at design/tools/card-audit.mjs:864–870 that accepts the vertical drop as *the eyebrow's height* is retired), extended to the sheet edges, the column's x, the topbar and the contents rail; run on open, on switch within a strip, on switch between strips (P7) and on close; at both widths.

**Rule G2 — nothing is placed above a card's head.** The charter's eyebrow (*The clause as it stands*, 176 records), the gap's *The gap as it stands*, and a record's dateline row are what move the tab 33–99 px today (D6). Their jobs survive in the lane (the label that says which lane is the current text, O1) and the fact line (the dateline). *Checks:* `head-form`, `still`.

**Rule G3 — width does not change what moves.** A card's travel is the same at 1600 and at 390 — zero at both. *Check:* `width-invariance` (20 cards drop differently at the two widths today).

**Rule G4 — zones do not overlap** except overlays. **v2**: v1 listed the floating layer as a zone and also placed it inside the sheet, which contradicted itself and moved Ed's door (checks.md doubt 2). The floating layer is an **overlay** (like the drawers and the reconnecting bar), and an overlay has its own rule: **it never covers a line of text or a control**. So the door may straddle the page edge, as Ed ruled on 2026-09-24. *Check:* `zone-overlap` (the content boxes of topbar, rails and sheet pairwise disjoint at 1600; every overlay's box disjoint from every text line box and every enabled control outside it; at 390 the contents rail's marks stay inside the drawer — diagnosis bug 10).

**Rule G5 (v2) — the top edge.** A card's box rises above its head's first line by **its inset, and no more than the clear space above that line** — the space between the head's line box and the ink of whatever is above it. It never covers ink: where the space is smaller than the inset (📍 at the birth, packed under 🪶's title), the inset shrinks to the space, and the head label, if the card has one, is drawn in whatever the inset leaves — the head does not move for it. Measured on the fixture: a charter clause has 18 px clear above its text (the wash box's 6 px padding and the 12 px between clauses), and the head label needs 12 px plus 1 px of air; a band paragraph has 15–19 px; the two tight places were a charter clause straight under a section heading (about 11 px clear of the heading's line box) and a band subsection's first row (11 px under its heading). **The cost, stated:** a band subsection's heading gains 4 px beneath it on the closed page too, so a label fits; the charter's headings keep their spacing, and the label's 2 px foot is what the check holds them to. *Check:* `top-edge` — the open card's top edge is at or below the bottom of the ink above its anchor, and its head label (if any) lies wholly inside the card's top inset.

**Rule G6 (v2) — the card ends where its content ends.** v1 kept today's floor (a card at least as tall as its strip), so a card the grammar had emptied kept 80–110 px of white under one line (amber 13, 20, 23, 31, 38). The strip is the card's tabs, not its content: where the strip is longer than the card, **the card ends at its content and the strip hangs on down the gutter beside what follows**, and what follows is pushed down only as far as the strip needs to clear it — the same clearance a closed pile takes. The pressed tab and the strip's own geometry do not change. *Check:* `strip-blank` — no open card has more than one tab's height (30 px) of empty box below its last drawn slot.

### 3.2 The phone (390)

The phone is the same zones folded, not a different page. MOBILE.md's first cut stands; the grammar adds what the diagnosis found missing.

| zone at 1600 | at 390 |
|---|---|
| topbar | two rows, fixed (MOBILE.md); nothing in it moves |
| contents rail | the left drawer; its marks stay inside the drawer's glass |
| queue rail | the task drawer (only what asks you) and the task sheet; a tap travels to the card as a rail click does (M17) |
| sheet | runs to the glass, untrimmed (M21) |
| gutter | **kept**, narrowed to the tab's width plus `--s1`: the tab is the only way into a card from the document (Y18), so it stays; the card runs from the gutter to `--s3` of the glass (today every card stands at x 64 with a 20 px right gutter — O4) |
| card | the same slots, the same order, the same presence; the head on the paragraph's first line, 0 px |
| floating layer | the proposal row and the patch row at the foot; no edit door (read + judge) |

Everything in §3.1's *never* column holds at 390. *Checks:* the same `still`, `head-registration` and `zone-overlap`, run by `card-audit:narrow` with the 1600 run as `--baseline`.

### 3.3 The re-render rule

D13 is outside a card grammar — the page is `innerHTML` templates rebuilt wholesale, on every act and on a 4 s poll, and 22 of the 72 surface gotchas are that — but it is inside the layout grammar's remit, because a render that throws away the thing under the reader's hand is the largest movement the surface makes.

**Rule U1 — a render never replaces a node that holds something of the reader's in flight**: focus, a caret or selection, an IME composition, pointer capture (a press, a hold, a drag), a scroll offset inside the card, or an unsent value. Such a node is **patched in place** (text, attributes, classes) or left alone until it is released; the replacement waits.

**Rule U2 — every slot and control has a stable key** — card id, slot name, block or control id — so a renderer can tell *the same node with new data* from *a new node*. This is what makes U1 implementable by keyed patching rather than by the one-flag-per-gotcha deferrals that exist now (`pressInFlight`, `dateInFlight`, `heldCaret`, `penHold`, `SESSION.holding`); the grammar keys every slot so that phase two can make the switch card family by card family. W9 (*nothing rebuilds under a press*) is U1's first instance and stays.

*Check:* `render-hold` — a walk that, for each in-flight kind (caret in a lane, a half-typed date, a held commit, a drag, a scrolled picker grid, an open select), places it on an open card, forces a poll and a room event, and asserts the node is the same node (a marker property set before survives) and the state intact (caret offset, pressed, value, scrollTop). Until keyed patching exists, the prototype must not add any new kind of held state without this protection (diagnosis D13).

---

## 4. Tokens

**Kept as they are:** the type scale (`--t-lead` … `--t-micro`, major second), the heading ladder (`--h-title` … `--h3`), the two faces, the line heights, the spacing scale `--s1`–`--s5`, the radii, the four shadows, the palette and the lifecycle channels, the highlighters, the desk and sheet tokens, `--measure`, `--wash-ms`.

**Merged:**

| today | becomes | why |
|---|---|---|
| `.sugg` (charter) and `.setupcard` (band) boxes, with their own padding (14 px, 15.13 px side margins, a −17 px top margin) | **one card box**, its inset derived from the head: the card's content edge is the paragraph's text edge, so the inset is whatever puts the head on the paragraph — measured once, named `--card-inset`, on the grid | one shell (L2); card-audit S1's 1408 sightings are all on these three boxes |
| `.headclause` / `.clausehead` (a 12 px box of its own, 6 px padding) | **no head box**: the head wears the paragraph's own class | the head is the paragraph (S2); an empty head box is D1's 322 records |
| per-card slot spacing literals | `--slot-gap` = `--s3` between slots without a hairline; `--block-pad` = `--s4` either side of a hairline | one spacing rule for H1 |
| the eyebrow treatment above heads | retired from heads; `.eyebrow` survives only for a block's label, if O1 keeps labels in words | G2 |
| 23 off-scale `font-size` declarations, 67 off-grid spacing literals | each on a token, or in an allow-list with its reason (the glyph size, B6's one literal; the 24 px sockets) | D7 |

**Added:** `--card-inset`, `--slot-gap`, `--block-pad` (aliases onto the spacing scale, not new values); `--hair` for the one hairline (1 px `--border`). **v2**: `--card-top`, the card's top inset (G5), which is also the head label's line — on the charter the 14 px the card already rose by in v1, capped per card by the clear space above; and `.glab`, the one label *place* (§2.3a), drawn with the existing `.eyebrow` treatment, which retires `.fieldlab`, `.headlab`, `.rtag`, `.rechead` and v1's `.glabel` as separate label drawings on cards. Nothing else.

**Colour roles tightened** (§2.8): solid `--ok` leaves the ✓ commit (B10); the solid `--primary` fill is the acknowledgement alone — **v2**: and so the chosen `.lanepick` stops being a filled pill (a white pill, a filled dot, the words in `--primary`).

**Document drift reported, not fixed** (outside the write limit): CLAUDE.md's `heading ladder` entry states `--h-title` 1.777rem … `--h3` 1rem; system.css:215–218 has 2.369 / 1.777 / 1.333 / 1.125 rem (diagnosis bug 11).

*Check:* `style-lint` — every `font-size` in the stylesheets a type token (or the glyph literal), every margin/padding/gap on the 4 px grid or allow-listed with a reason; card-audit **S1** kept for the rendered boxes.

---

## 5. The checks

Every rule above names one of these. *Existing* checks are kept; *new* ones are what stage 5 adds to the prototype's copy of `card-audit.mjs` and phase two turns into guards.

| check | holds | what it asserts | kind |
|---|---|---|---|
| `head-registration` | P1, S2 | open card's head text = the closed paragraph's text; its first line box lands on the paragraph's first line box, Δx = Δy = 0 (±0.5 px) | new, geometry + text |
| `still` | P2, G1 | the pressed tab, the head's first line, the sheet's edges, the column's x and measure, the topbar and the contents rail move 0 px on both axes on open, switch (within and across strips) and close — **P2 made two-dimensional**, P7 kept inside it | new (supersedes P2's one axis) |
| `width-invariance` | P9, G3 | every travel above equal at 1600 and 390 | new |
| `zone-overlap` | G4 | zone content boxes pairwise disjoint; **v2**: an overlay (the floating layer included) covers no text line and no control | new, v2 amended |
| `top-edge` | P2, G5 | **v2** — the open card's top edge never above the ink over its anchor; the head label inside the top inset | new (v2) |
| `strip-blank` | P6, G6 | **v2** — no open card has more than 30 px of empty box below its last drawn slot | new (v2) |
| `label-slot` | P9, §2.3a | **v2** — every head on a card that draws a block, on a record and on an act card has one head label in the top inset; every block with no live control has a label as its first line; no label drawn elsewhere; every label from the vocabulary | new (v2) |
| `note-visible` | P5, P8, J1 | **v2** — every dark commit on a live card has its reason as rendered text in the row's note; no lit commit sits over an empty required input | new (v2) |
| `closed-keeps-content` | P4 | **v2** — on a closed document every card that held a proposal, rival or record field before the close still draws it, labelled, with no control; a cut-off race or motion carries *Undecided when the document closed* | new (v2) |
| `closed-tense` | P4 | **v2** — on a closed document no card's text claims a power in the present tense (*may amend*, *may refuse*, *may invite*, *may remove*) | new (v2) |
| `one-home` | P3, F1 | at most one element per `data-fact` role per card, the head included | new, needs the roles |
| `closed-page` | P4 | on a closed document: no enabled control but the tabs and 🥂's OK (and any OK the host still accepts); no dark control; no radio; no tooltip in the strip saying *waiting on you*, *yours to take* or *Give your answer* | new |
| `raw-value` | P4, S1 | no rendered string contains `undefined`, `NaN`, `null`, `[object`, `Invalid Date` — a `copy-check --walk` rule | new |
| `no-job` | P5, J1 | every enabled control, driven, sends a command or changes the provisional layer; every dark control carries a `data-until` from J1's list, reachable in the phase | new, driven |
| `bin-job` | P5, J2 | 🗑️ present ⇔ J2's predicate | new |
| `empty-slot` | P6, L1 | no drawn slot is empty or whitespace-only; no zero-content box of height > 0 | new |
| `presence` | L1 | drawn slots = the shell's presence predicate for the card's state | new, needs the shell's export |
| `slot-order` | P9, L1 | drawn slots in §2.3's order | new |
| `hairline-gap` | P6, H1 | every hairline between two drawn slots or blocks, as H1's table says; none at top or foot | new (with P12) |
| card-audit **P12** | P6 | no two hairlines with nothing between | existing |
| `row-vocabulary` | P8 | every row is one of §2.6's six shapes, glyphs from its sets | new |
| `role-drawing` | P7, R1 | §2.8's table: no pressed radio outside a live lane; no disabled radio; no solid-green button; solid `--primary` only on OK / Accept while owed — **v2**: measured on the computed background, so a chosen radio drawn as a filled pill fails | new, v2 tightened |
| `head-form` | P9, L2, G2 | every head is the paragraph renderer's element; nothing drawn above a head in the card | new |
| `place-head` | P9 | every card on one anchor shows the same head text (fixes D10's gap heads) | new |
| `render-hold` | P10, U1 | in-flight state survives a poll and a room event on the same node | new, a walk |
| `state-only` | S1 | slot builders read `CardState` only | new, static lint (phase two) |
| `style-lint`, card-audit **S1** | tokens | §4 | new / existing |
| card-audit **F6**, **H2/H4**, **P9–P11**, **B6**, **D1–D4**; `copy-check`; `journey` | — | as today | existing, kept |

---

## 6. Five cards, built by the grammar

Each in words, slot by slot, against what the inventory drew. The state named first is the `CardState` that builds it.

### 6.1 🪶 Title, settled, read by the Founder (a member, holding ✒️ and 🛡️ on it, document live)

*State:* anchor = the title; reader = founder-member; phase = live; standing = the title, *Chosen by the Founder ✒️*, set at the save; acts = set (✒️), propose (✏️), both `until: type`; alternatives = one, a new title (field); draft = empty.

- **Strip**: 🪶 pressed, ✒️ and 🛡️ beneath it; the 🪶 tab does not move.
- **Head label**: *Current rule* (the card draws a block).
- **Head** (**v2**): the paragraph the 🪶 tab hangs on, word for word — *The document is titled “The Hollow Oak Club — House Charter”.* — its rule line only; the power line beneath it in the paragraph (*The Founder may amend this at will, and refuse proposals that the membership pass.*) is the ✒️ and 🛡️ cards' (P3 v2). v1 wrote *the title at `--h-title`* here, which is the birth's anchor, not the settled document's: once the document is saved the 🪶 tab hangs on the Rules' title paragraph, and that paragraph is a sentence at body size (critique 6, amber 1). At the **birth**, before any save, the anchor is the big heading itself and the head is the title lane at `--h-title` — P1's fourth exception.
- **Fact**: *Chosen by the Founder ✒️ · ‹the save, in the long form›* — text, not a pill.
- **Body**: none.
- **Blocks**: one option block, the new title's sentence with its field (*The document is titled [A new title].*) — the same form as the head, as every rung repeats its rule's form — its radio in CP2's founder register.
- **Input**: none yet. The rationale lane (*Why are you changing this?*) appears when the first character is typed.
- **Row**: shape *pair*, ✒️ ✏️ at the right, both dark; **v2**: the note slot reads *Type a new title first*, once, since both wait on the same thing; no 🗑️ until something is typed.
- **Hairlines**: fact → block; block → row. None at the top.

*Against today* (the crop `title-settled-1600.png`, phase one's `design/proposal/shots/current/` on branch `redesign`): the head was a sentence restating the title in another form, the provenance a solid blue pressed pill, an empty *Why are you changing this?* box stood before anything was changed, and a live 🗑️ offered to put back nothing.

### 6.2 A quick judgment (💡, a pair against the current text, a member, live)

*State:* anchor = the clause; acts = judge (✓ `until: choose`), propose edit; alternatives = the proposal; the current text is a choice → the head has a lane; notes = the abstention deadline.

- **Strip**: 💡 pressed, beside the clause's first line — 0 px, where today it drops 33 px.
- **Head label** (**v2**): *Current text*, in the card's top inset — read first, moving nothing.
- **Head**: the clause in its paragraph's own box and face, with its **lane**: *Prefer this*, ✏️ *propose edit* at the right.
- **Fact**: none — a running race says nothing of who or when (C12).
- **Body**: none.
- **Blocks**: the proposal — **v2**: its label *Proposed* as its first line, then the wording with additions in highlighter, the sealed speaker and rationale, its lane *Prefer this* and ✏️ *propose edit*; then the Indifferent block, with *💤 abstain in hh:mm* at its right.
- **Input**: none.
- **Row**: shape *commit* — ✓ at the right, dark until a lane is chosen; ❄️ beside it (shape *pair*) only if the entry is 🔥 or chilled. No 🗑️ (J2: choosing another or Indifferent undoes a choice).
- **Hairlines**: head → proposal; proposal → Indifferent; Indifferent → row.

*Against today* (the crop `quick-keys-charter-1600.png`, phase one's `design/proposal/shots/current/` on branch `redesign`): the same content, less the eyebrow above the clause that pushed the clause and its tab down 33 px.

### 6.3 A sealed record (✔, a text change the reader has not yet read, live)

*State:* anchor = the clause the record descends to; record = passed, *Thursday, 24 September, 22:51*, 7 of 20 weighed in, quorum 7, the ranked field; owed = OK; the clause has not changed since, so what stands **is** the winning wording.

- **Strip**: ✔ pressed in the live part of the strip (M13), 0 px — and a switch to a live card at the same clause holds it at 0 px too (M12), since the dateline no longer stands above the head.
- **Head label** (**v2**, Q1522 kept): *Passed · Thursday, 24 September, 22:51*, in `--ok`, in the card's top inset — the first thing read, as Q1522 ruled, and the clause still lands on its paragraph.
- **Head**: the clause as it stands — the winning wording — in the paragraph's own box, wearing the record's marks (green on what passed, Q1531) and its **speaker** with the winner's rationale, the head being that alternative.
- **Fact**: *7 of 20 weighed in · quorum was 7 · you preferred this* — the participation, one line, wrapping at 390. (If the clause had changed again since, the head label would add *· since replaced*, the head would be the wording the record passed — P1's first exception — and the clause as it now stands is its paragraph's, a tab away — M1.)
- **Body**: none.
- **Blocks**: the rest of the field, ranked, each labelled on its first line — *Rival · 23%* for a losing wording (in yellow), *Previous text · 12%* for the incumbent, plain.
- **Input**: none.
- **Row**: shape *acknowledge* — OK, while owed. Once read and filed: **no row**, the card closing by its tab, a click outside, or Escape.
- **Hairlines**: head → first block; between blocks; last block → row.

*Against today* (the crop `rec_r_c1-live_session_founder-1600.png`, phase one's `design/proposal/shots/current/` on branch `redesign`): the *DECIDED · 7/20* eyebrow and the participation line stood above the head and pushed the clause 62–84 px down.

### 6.4 A constitutional motion (the consent card on 👤, a member who is not the mover, live, 🏛️ held)

*State:* anchor = 👤's paragraph; standing = *All proposals are made anonymously.*, *Chosen by the Founder ✒️*; acts = answer (🏛️, a click, `until: choose`); alternatives = the proposed rule; what stands is a peer choice (Q1362) → the head has a lane.

- **Strip**: 👤's own tab, then this motion's tab (M18) pressed, 0 px.
- **Head label** (**v2**): *Current rule*.
- **Head**: the paragraph as it stands — **v2**: the rule's line, without the power line beneath it (P3 v2).
- **Fact**: *Chosen by the Founder ✒️ · ‹when›* — **v2**: between the head's words and its lane, so it reads as the rule's.
- **Head lane**: *Prefer this*.
- **Body**: none (no count, no blind note — Q1182, C12).
- **Blocks**: *Proposed* (its first line) — *All proposals are made anonymously, and all names are revealed at the end.*, the mover's sealed speaker and rationale, *Prefer this*; then Indifferent.
- **Input**: none.
- **Row**: shape *commit* — 🏛️ at the right, dark until chosen. **No 🗑️**: the only unsent state is a radio among blocks that include Indifferent.
- **For the mover** the same card has no lanes (they stand at accept from the open, K8), no Indifferent, the block's label is *What you proposed*, and the row is shape *withdraw*: *🗑️ Withdraw*, its tooltip *your 🏛️ comes back*. The unlabelled empty radio (diagnosis bug 7) cannot be drawn: a radio exists only on a live lane.

*Against today* (the crop `mo_mo-4-seat_1-1600.png`, phase one's `design/proposal/shots/current/` on branch `redesign`): an empty head's ~24 px above the rule, and a 🗑️ with nothing to put back.

### 6.5 ✉️ Invite, a member, 🪪 at the all-members price, live

*State:* anchor = the *Invitees* subsection's rows; acts = propose an invitation (🏛️ hold, `until: type`, or `voice-out` while a 🏛️ of theirs is out); input = one address line (the 🏛️ price takes one at a time); draft = empty.

- **Strip**: ✉️ pressed, the door's ✒️ 🛡️ tabs beneath it while the Founder holds them.
- **Head label** (**v2**): the card's ask, *Invite a Member* (✉️ is an act card; the tab's own name).
- **Head**: the Invitees rows as they stand — *quillon@ladder.invalid · proposed*, or, empty, **v2** *Nobody has been invited yet.* — the STYLE-passed sentence, now the band's own words for the empty subsection too, so the head is still the line (v1 carried the band's bracketed placeholder into the card instead — critique 14, amber 5).
- **Fact**: none (the rows are the fact).
- **Body**: the price, once — 🪪's own clause sentence read from 🪪's reader (*Anyone may be proposed as a new member, and every member has to agree*), not a paraphrase of it.
- **Blocks**: none.
- **Input**: the address box (*name@example.com*); the rationale lane appears once an address is typed; a refusal stands under the box.
- **Row**: shape *commit* — 🏛️ at the right, dark until typed, the note *Type an address first*; 🗑️ at the left once something is typed. (**v2**: for the Founder the row is *pair*, ✒️ 🏛️ — and ✒️ is dark over the empty box too; v1 left it lit, a control that changed nothing — critique 8.)
- **Hairlines**: one, above the row; head → body and body → input are space.

*Against today* (the crop `invite-live_session_m-1-1600.png`, phase one's `design/proposal/shots/current/` on branch `redesign`): an empty rationale box stood beneath an empty address box, and a live 🗑️ had nothing to discard.

---

## 7. Breaks

Every place the grammar replaces or drops a ruling in SURFACE, STYLE or CLAUDE.md. Each: the ruling quoted with its label, why it existed, what the change buys, what it costs, and the recommendation. Stage 6 makes each a numbered question.

**B1 — Provenance is a line of text, not a pressed radio.**
*Ruling* (SURFACE CP2): *“Provenance is a sanctioned third form, and the standing block always wears it (Q1167 (a), Q1176, Q1188 — Ed 2026-09-05): every standing rule's block names who chose it, whoever that was — the only two labels are Chosen by the membership and Chosen by the Founder ✒️.”* Also §9's setting, composer, stranger's-card and settled-record rows, and STYLE T48's second half.
*Why it existed*: Q1188 — a founder-set rule had a bare block, *“the reader had to infer who set it from the absence of a label”*; Q1167 (a) made the standing rule the first block and put the label where its radio would be; Q1176 retired the watch half, leaving provenance on the radio.
*Buys*: D5's 490 records go — a fact about the past stops being drawn in the same pressed pill as the option you just chose and in the same fill as OK; the two labels and Q1188's *every standing rule says who chose it* are kept word for word; the fact gains its moment.
*Costs*: a ruling Ed has confirmed three times (Q1167, Q1176, Q1188) is re-drawn; T48's labels survive, their drawing does not. **v2**: on a record the outcome word stands in for the label (*Passed* is the membership's choice, *Changed by the Founder* the Founder's), so a settled motion record no longer prints *Chosen by the membership* under *Passed* — said here rather than left for a reviewer to find (critique 16).
*Recommendation*: take it.

**B2 — Every card heads with the line it opens in place of.**
*Rulings*: SURFACE F15, *“an option-block settings card carries no head, founding or settled, its first block being the rule (Q1151), and a heading-over-text card — the grants and the gates — no title head (Q1373); a founder's power tab carries no head at the founding only”*; STYLE T3's *“A settings card whose option blocks state the rule carries no head at all”*; §9's blind-answer row (*none*, Q1175), the settled motion record's (*no head*, Q1186, Q1522), and Q1170's striking of the Founded line from the grant cards.
*Why they existed*: each removed a head that **restated** the card — Q1151's four-word title over blocks that said the rule, Q1373's *Founder Actions* printed twice, Q1430's *one sentence twice*, Q1186's short-label head. Ed's reading (Q1373): *no card carries a title*.
*Buys*: nothing is restated — the head is not a title and not a restatement but the line itself, kept in place, and **what stands leaves the block list** (it is the head), which is what the standing block was trying to be. The head lands where the paragraph stood (P1), the empty head box goes (D1's 322 records), four head forms become one (D4), the place-head faults go (D10), and the *Set to undefined* class cannot be built, because the head is the document's own rendering (S2).
*Costs*: every band card changes its first line; the founder's 🪶 heads with the title at `--h-title` at the birth, a large head for a card; the grants and gates head with the line their tab hangs on (the Founded line, the Proposals preamble), which Q1170 took out of the grants' bodies — here it is not in the body but is the line the card opens under. **v2**: *the line* has four stated exceptions (P1 v2: record, multi-place patch, gap, the birth's 🪶), and on the settled document 🪶's head is the Rules paragraph word for word (*The document is titled “…”.*), not the title alone; a card that is an act or a question also wears its ask as a head label (§2.3a), which answers the costs Q1373 and T3 were protecting without putting a title above the place; and a power card heads with its power's own clause (B8 v2).
*Recommendation*: take it, with its exceptions; it is the grammar's central move and fixes more classes than any other.

**B3 — Titled cards head with their place too.**
*Rulings*: STYLE T3, *“open questions, 🪪, 📝, personal cards and answers keep the title (`headFor`)”*; F15's *“📝, personal cards and the blind answers keep their title”*; §9's identity, 🌂 and 👑 rows (*the title*).
*Why*: a personal card had nothing else to head with; the title said what was asked.
*Buys*: ✋ 🖼️ 📧 and 🌂 head with **your row as it stands** — your face and name — so the card replaces its row exactly as §9's identity row already describes it (*“the row gives way to the card inside the list”*); 👑 heads with its setting's paragraph or its person's row. One head rule with three placeless exceptions instead of a list.
*Costs*: the ask (*Choose Your Name*) is read on the rail entry and the tab's tooltip only; a member who opened the card from the rail has read it, one who pressed the tab has its tooltip.
*Recommendation* (v1): take it.
**v2 — withdrawn; take O6 (b).** The critique (finding 10) and the mockups (amber 36: 🌂, *the one card whose act is irreversible*, named no act; amber 16) showed the cost is not a tooltip but a card that asks nothing. The personal cards, 🌂 and 👑 **keep their title**, drawn as the **head label** (§2.3a) above your row — T3 and F15's *personal cards keep their title* are therefore **kept**, and P1 still holds because the label sits in the card's top inset. What survives of B3 is only that the head *under* the label is your row (the place the card opens in), which §9's identity row already describes; that is a restatement, not a break.

**B4 — Nothing stands above a card's head: the eyebrow and the dateline move.**
*Rulings*: CLAUDE.md glossary `clause-head`, *“the clause at document size and colour under an eyebrow”*; SURFACE M19, *“its head is the eyebrow The gap as it stands over the one line (no text here)”*; Q1522 (1), *“the dateline and the outcome as the eyebrow”* first; M12's *“though a record's head stands a dateline row lower in its card (Q1524 (a))”*.
*Why*: Q207 — nothing said which lane was the current text, and the first-time reader needed telling; Q1522 — *“a reader opening a record wants what it did first”*.
*Buys*: the tab drops 0 px instead of 33–99 px on every charter card (D6), C1's *the tab you click does not move* becomes true, and card-audit P2 stops looking away; the record's what-it-did-first order is kept (the head is what it did; the fact line is directly under it).
*Costs*: Q207's label has to live somewhere that does not displace the clause — O1 puts it in the head's lane; the record's dateline moves from above the head to below it.
*Recommendation* (v1): take it, with O1 (a).
**v2 — narrowed.** v1's costs were larger than it said: Q207's label vanished wherever the head had no radio (critique 4), and the record's outcome came sixth, against Q1522 (critique 3). v2 keeps both rulings' *content* and changes only where the words stand: the eyebrow's job is the **head label**, drawn in the card's top inset, so it is still read first and still over the clause — and still moves nothing. **For records B4 is rejected**: the outcome and its date are the head label, first, as Q1522 ruled. What remains a break: *The clause as it stands* and *The gap as it stands* become *Current text* (one word for the head's role on every live card — critique 14 counted three names), and Q1524 (a)'s *a record's head stands a dateline row lower* goes, since the dateline no longer takes a row.
*Recommendation*: take B4 v2.

**B5 — 🗑️ only where there is something of yours to remove.**
*Rulings*: SURFACE C4, *“🗑️ at the left, always live, on every card but those Y20 lists and the judgment cards”*; CP7; §9.1's 🗑️ row, *“one bin, always live, puts back un-actioned input only, closes”*; CP5, *“🗑️ at the left closes the card, the question kept pending”* (👑); §9's park row (*🗑️ once acknowledged*), the consent card's non-mover bin.
*Why*: one bin everywhere was consistency — a reader always knows where the way out is; C3's *closing is not discarding* needs a way to discard.
*Buys*: D3's 388 *Put it back as it stands* bins with nothing to put back and the 196 🗑️-alone rows CP9 forbids go; 🗑️ has one meaning (remove what is yours — discard or withdraw) instead of four; Q1500's finding (*a member read it as skip*) is applied by rule to every card whose only unsent state is a radio beside Indifferent, not by a list of kinds.
*Costs*: the bin appears and disappears as a draft starts and ends — the row's right-hand commits do not move, but the left end is sometimes empty; the way out of a card is no longer a button (O2).
*Recommendation*: take it. **v2 — with its fix**: the one bin that is irreversible, *withdraw*, carries its word (*🗑️ Withdraw*), since on your own proposal it is the only control and Q1500 found a bare bin read as *skip* (critique 11).

**B6 — A card with no job has no row: the close-only OK goes, and so does the lone-🗑️ closed row.**
*Rulings*: SURFACE CP9, *“a row that would be 🗑️ alone carries a close-only OK … but the row is never 🗑️ by itself, the OK being the reader's way to say they are done with a card that asks nothing”* (reading 1190); §9.1's OK row (*an acked grant and the settled 🎩 keep a close-only OK … as does every card whose row would otherwise be 🗑️ alone*); K2, *“by CP9 nothing on it shows a commit either, the row being 🗑️ alone”*.
*Why*: reading 1190 — a reader needs a way to say they are done; a lone 🗑️ read as a control with no job. K2 and CP9 contradict each other (diagnosis D11 (1)); the build follows K2 on 80 records.
*Buys*: settles D11 (1) in favour of neither, by removing the row both were arguing about; OK means *owed* and only that (D4's six acknowledgement faces become one form); Q1522 (6) already did this for the record card, and Q1500 for the judgment cards, so the surface is half-way there.
*Costs*: a read-only card has no button at all; closing is the tab, a click outside or Escape (O2). **v2**: on a closed document the OKs a card still owed are discharged by 🥂's signature (§2.6), which needs the module to accept the one press for all of them — today it refuses an OK after the close (SURFACE §9's settled-record row) — so this half is **O10**, not settled; and at 390 the way out is a 34 px tab at the glass's edge, to be measured before B6 is built.
*Recommendation*: take it.

**B7 — A block nobody may press has no radio; on a read-only card, no alternatives are drawn.** **v2 — narrowed to settings ladders.**
*Rulings*: SURFACE CP11, *“A block nobody may press keeps its words and greys its radio alone (reading 1193, 2026-09-05): a locked or unavailable option is read as often as a live one”*; §8's exception row, *“the hat's radios stay visible but disabled post-start”*.
*Why*: a locked decision still has to be readable.
*Buys*: the 100 closed-document records with *Choose this / Prefer this* radios and CP11's greyed ones become impossible (a radio exists only on a live lane, R1); what was decided stays readable — in the head and the fact line, which is where a decided thing lives.
*Costs*: a locked 🎩 no longer shows the answer that was *not* chosen.
*Recommendation* (v1): take it.
**v2.** v1 was built half-way and read too widely. Half-way: on the locked 🎩 the radio went and the unchosen sentence stayed, bare, so the card stated a fact and its opposite (critique 1, amber 17). Too widely: on the closed page every proposal counted as an *alternative*, so a race the clock cut off opened to its clause alone and the deadlock lost its eight proposals (critique 2, amber 6, 7, 8, 23). v2 draws the line at **what a block is**: a **settings rung** is a control (it exists to be chosen), so on a card whose reader cannot choose, the unchosen rungs are not drawn and what stands is the head; a **proposal, a rival, a record's field or what the close cut off** is content, so it stays, labelled (*Proposed*, *Undecided when the document closed*), with no radio. A block with no control and no label cannot be built (§2.3a). Reading 1193's worry — *a locked option is read as often as a live one* — is met differently for the two: a locked rung was never a thing anybody could do, and a proposal stays readable.
*Recommendation*: take B7 v2.

**B8 — A power card offers only the other half.**
*Rulings*: SURFACE K4, *“on a power card it stays, marked Chosen, because a two-state toggle needs its other half”*; §9's power-cards row, *“before 🍾 two proposal blocks”*.
*Why*: two blocks make the choice's shape visible; Q1430 then removed the head because *the head and the held block were one sentence twice*.
*Buys*: the power card is built like every other rule card — the paragraph's power line as it stands is the head (B2), the other state is the one block — so K4 needs no exception and Q1430's duplicate cannot recur.
*Costs*: before 🍾, the pair is read as head + one block rather than two peer blocks.
*Recommendation*: take it. **v2 — with its fix**: v1 headed the power card with the whole rule paragraph, so 🪶, ✒️ and 🛡️ opened three cards with one head and the rule's provenance (critique 7, amber 18). A power card's head is **the power's own clause** (*The Founder may amend this at will.* / *The Founder may refuse proposals that the membership pass.*), its head label the card's question (*Can the Founder Make Amendments at Will?*), its fact line **who holds the power** (*Kept by the Founder at the start · ‹when›*), and its one block the other state. On a closed document the clause is in the past (*Until the close, the Founder could amend this at will.*) — P4 v2's tense rule.

**B9 — One ✏️ in edit mode: the single-site card carries none.**
*Rulings*: SURFACE §9.1's ✏️ hh:mm row, *“the same ✏️ drawn on a single-site card”* (Q1486 (E)), against §9's editing row, *“none on the card — the ✏️ hold is the proposal-row's (Q1382)”* — diagnosis D11 (2).
*Why*: Q1486 (E) wanted the countdown wherever a member would press; Q1382 wanted one floating commit for the draft.
*Buys*: the one-act-twice fault (diagnosis bug 9) goes; the countdown stays on the proposal row's ✏️.
*Costs*: none found — §9's row already says this.
*Recommendation*: take it (resolve D11 (2) for Q1382).

**B10 — ✓ is not solid green.**
*Ruling*: SURFACE §9.1's ✓ row, *“the one solid green on a card”*, against the same section's *“✓ … greys while nothing is chosen and lights on `--primary` when armed”* — a contradiction inside §9.1.
*Why*: green means *decided* (C7), and a judgment decides.
*Buys*: every glyph commit takes one drawing (flat inert, lifted armed); green is left to marks and the record's passed highlight, where it always means *decided*; the 👑 ✒️ drawn solid green (diagnosis bug 8) has nothing to imitate.
*Costs*: the judgment's commit is less emphatic than today (if the build draws it green; the section is ambiguous).
*Recommendation*: take it. **v2**: the recorded ✓ (a ⏳ card's pressed commit) takes the same flat drawing; v1 left it green-tinted (critique 9).

**B11 — The *Set to … / Set by …* lines go from every card.**
*Rulings*: §9's watching row, *“the lockline and the value line only (Q1176)”*; STYLE T21's example, *“the lockline says what changing a setting actually takes, by kind”* (`ctx.lockline`).
*Why*: a read-only reader needed the value and the rule for changing it stated; T21 corrected a lockline that had gone stale.
*Buys*: D2's 142 doubled-value records and the provenance contradictions (14) go: the value is the head, who chose it is the fact line, and what changing it takes is the paragraph's own power line, which the head already carries.
*Costs*: none beyond the wording T21 protected, which the paragraph states.
*Recommendation*: take it.

**B12 — 🥂 states the closing moment once.**
*Ruling*: §9's 🥂 row, *“final as of · the batch · your closing comment”*.
*Why*: the card said what the close was; the head was added later.
*Buys*: diagnosis bug 5 (*closed at 00:51* and *final as of 00:51*) goes; the moment is the head's (🥂's paragraph) or the fact line's, not both.
*Costs*: none.
*Recommendation*: take it.

**B13 — The rationale lane appears with the change.**
*Ruling*: §9's composer row lists *the rationale lane* among its standing parts (the setting row already says *a change only*).
*Why*: CP3 — a reason rides every act that changes.
*Buys*: an empty reason box before anything is changed (every settled composer card, ✉️) goes; CP3 is kept exactly — the reason still rides every change.
*Costs*: the card grows by one lane at the first keystroke or pick (below the head, so nothing above moves).
*Recommendation*: take it. **v2**: the deadlock's desk too — its *We should change this because…* lane waits for the desk's first keystroke (amber 10).

**v2 — not a break any more: the 📝 door.** v1 moved the door inside the sheet to satisfy its own G4, which silently overruled Ed's 2026-09-24 ruling (*the door straddles the page's right edge*, design/edit-mode.js) — checks.md doubt 2, amber 39. v2 restores the ruling and amends the zone rule instead (G4 v2: the floating layer is a sanctioned overlay that covers no text).

**Not breaks, recorded so nobody reads them as one:** one shell (§9's *“Two implementations of one shell”* describes the code, it rules nothing); the ordinary motion row's *Keep this* (Q1377 changed *Keep* to *Prefer* on the consent card with the argument that the standing text is a peer, and T48 says so; the ordinary row is stale — a finding); the re-render rule (W9 generalised).

---

## 8. The map

Every rule the grammar touches, and its fate. *Kept* — unchanged. *Restated* — the same rule said in the grammar's terms, or made checkable. *Replaced* / *dropped* — a break, §7. Rules not listed are untouched: SURFACE C6, C13–C16, the §2 event matrix, §4, §5, §6's marks table and palette rules, M2–M11, M13–M16, M20, M22, M23, all of §7 but W9, §8's ORDER table and F1–F14, F16–F23, K5, K9–K11, K13–K16, K20–K25, K27–K28, K30–K34; STYLE T1, T4–T9, T12, T14, T16 (bar the new check), T19–T20, T22, T25–T28a, T30–T35, T37–T42, T45, T46, T49, T50, §6.

| rule | fate | how, and why |
|---|---|---|
| **C1** a card replaces its clause; the tab you click does not move | restated | P1, P2; made true on the charter (B4) and measured on both axes (`still`) |
| **C2** a card closes when answered; a click on nothing closes it | kept, extended | Escape added as the third way out (§2.6); needed once read-only cards have no row |
| **C3** closing is not discarding | kept | J2's bin is how a draft is discarded |
| **C4** one commit row; 🗑️ always live | **replaced — B5, B10** | the row family (§2.6); the bin only with a job; ✓ not solid green |
| **C5** opening focuses the main decision | kept | — |
| **C7** hot for actions, cold for information; green never leaves the card | kept | R1 |
| **C8, C8a** owed OKs | kept | `owed` is a state field; the acknowledge shape |
| **C9** no task until its main action can be taken; the closed page asks nothing but 🥂 | restated | P4, J1: `acts` has `phase` in it; a dark ✒️ is `until: accept:pen` (Y19); `closed-page`; **v2**: *asks* nothing, *shows* everything (`closed-keeps-content`) |
| **C10, T10** the document reads identically; the office, not the name | kept | the head is the document's own rendering, so it is identical by construction |
| **C11, T23, T24** a first decision is not a change; a change carries a reason | restated | no fact line before a first decision; *Previous …* block for a change; reason under its speaker |
| **C12, T11, T12** blind while running | kept | no counts or leanings on a card (§2.2) |
| **C17** held commits while reconnecting | restated | `until: reconnect` (J1) |
| **§6 setup alphabet** (tab and rail marks by state) | kept | the strip's tooltips read the same state (`closed-page` catches *waiting on you*) |
| **M1** a record stands on what descends from it; *changed again since* | restated | head = the place as it stands; *changed again since* in the fact line; the winner as block one then (§6.3) |
| **M12** the strip does not reorder; a switch holds the tab | restated | 0 px on both axes; Q1524 (a)'s *a dateline row lower* goes with **B4** (v2: the dateline is the head label, in the top inset) |
| **M13** the strip's live and filed halves | kept; **v2** G6 | a strip longer than its card hangs on down the gutter; the card is not padded to it |
| **M17** arriving moves the view only as far as it must | kept | G1 names it as the only allowed scroll |
| **M18** one live question, one tab, one entry; a card swallows its span | kept | the anchor is the span's first block |
| **M19** a gap race's head is *The gap as it stands* over *(no text here)* | **replaced — B4** (v2: wording only) | head = *(no text here)*, the gap's own rendering, for every card on the gap (the editing card's *A new clause after: …* goes too — `place-head`); v2: its head label *Current text* stands over it in the top inset, where the eyebrow stood |
| **M21** paper on a desk; sheet edges | restated | the sheet's edges never move (G1); the 390 untrimmed sheet kept |
| **§8 the band, the statuses table, F21** | kept | a door's head is its subsection's rows — already CP6 |
| **§8 exception: the hat's radios stay visible but disabled** | **dropped — B7** | v2: the locked 🎩 draws what stands as its head and nothing unchosen |
| **F15** no head on option-block, heading-over-text and pre-🍾 power cards; personal cards keep their title | first half **replaced — B2**; **v2: second half kept** (B3 withdrawn) | every card heads with its anchor; the personal cards' title is their head label |
| **F17** dead click | kept | — |
| **§9 two-label rule** (ask while outstanding, noun once settled) | kept | the name lives on the tab and rail (§2.2) |
| **§9 two implementations of one shell** | restated | one shell (L2) |
| **§9 quick / insert / race / ⏳ / patch rows** | restated | head with lane where the keep is a choice; no bin (J2); row shapes *commit* / *pair*; the eyebrow goes (**B4**) |
| **§9 deadlock** | kept | its desk's draft is what the bin removes |
| **§9 sealed record** (*the top of the ranking is the head*) | restated | head = the winner; **v2** the dateline and outcome first, as the head label (Q1522 kept; B4 rejected for records); *since replaced* where the paragraph moved on (§6.3) |
| **§9 editing** (none on the card) | kept | and §9.1's single-site ✏️ dropped — **B9** |
| **§9 mine** (🗑️ withdraw alone) | kept | shape *withdraw* |
| **§9 setting (founder, pen)** (no head; standing block with its provenance radio; *Why…* on a change) | **replaced — B1, B2** | head = the paragraph; fact line; alternatives by value (Q620 kept) |
| **§9 blind answer** (no head) | **replaced — B2** | head = the paragraph, which already reads *The membership will decide … (x of y have answered so far)* |
| **§9 watching** (the lockline and the value line) | **replaced — B11** | head + fact line |
| **§9 constitutional motion** | restated | head with its *Prefer this* lane (the peer); non-mover has no bin (**B5**); the mover's card has no lanes |
| **§9 ordinary motion** (*Keep this* on what stands) | restated | *Prefer this*, per Q1377 and T48 — a stale row, a finding |
| **§9 composer** (the standing rule the first block with its provenance radio; the rationale lane) | **replaced — B1, B2, B13** | — |
| **§9 power cards** (two blocks before 🍾; the held one marked *Chosen*) | **replaced — B8** | v2: head = the power's own clause, head label = its question, fact = who holds it |
| **§9 settled motion record** (no head; dateline eyebrow first; provenance radio; OK only while owed) | **replaced — B1, B2**; **v2 — dateline first kept** (in the head label); OK rule kept | the no-row-when-not-owed half (Q1522 (6)) is the grammar's rule everywhere; the rejected record labels its failed wording *Rejected proposal · ‹when›*, never the rule that stands (amber 27) |
| **§9 👑 question** (🗑️ closes, kept pending) | **replaced — B5** | the pair (🛡️, ✒️) kept; the Text question's green ✒️ a bug; **v2**: the ask is its head label, the current rule is the head once and never again as a block, the mover's reason sits under the proposal it argues for (amber 24, 25) |
| **§9 👑 for anybody else** (🗑️) | **replaced — B5, B6** | shape *absent* |
| **§9 park** (🗑️ once acknowledged) | **replaced — B5** | OK while unread; then no row |
| **§9 news** (read body · change line) | restated | head (now) · fact (who, when) · *Previous rule* block · reason; 🗑️ goes (**B5**); **v2**: the change line is kept as the body where the previous value is not a sentence (amber 30) |
| **§9 gates, grants** (🗑️; Accept; OK once accepted) | **replaced — B5, B6** | shape *accept*; accepted, no row; *Activate* is O3 |
| **§9 🍾** (settled: close-only OK) | **replaced — B6** | settled, shape *absent* |
| **§9 🥂** (*final as of*) | **replaced — B12** | — |
| **§9 🪪, 🤝** | restated | as the setting row |
| **§9 ✉️, ❌** (people head, price, the box) | restated | CP6 is already the anchor rule; the price is the body, once; the bin with a job |
| **§9 🌂** (the title) | **v2: kept** (B3 withdrawn) | the title is the head label, over your row |
| **§9 `adm:`** (the applicant at its head) | kept | already the anchor rule |
| **§9 identity** (the title) | **v2: kept** (B3 withdrawn) | the title is the head label, over your row |
| **§9 🎩** (locked: both blocks readable, radios greyed; close-only OK) | **replaced — B6, B7** | head + fact *The Founder is part of the membership · Chosen by the Founder ✒️ · ‹🍾's moment›*; v2: no unchosen sentence (B7 v2) |
| **§9 📝** | kept | a mode, not a card in this sense; its proposal row obeys §2.6 |
| **§9 the stranger's settled card** (provenance radio, close-only OK) | **replaced — B1, B6** | head + fact, shape *absent* |
| **§9 the applicant's five, the stranger's two** | restated | placeless cards: head = title |
| **§9.1 a body holds choices; an action is the row's** | kept | the row owns acts (§2.3) |
| **§9.1 glyph commits flat inert, lifted armed; every OK blue** | kept | R1 |
| **§9.1 a hairline earns its place; two hairlines with nothing between never appear** | restated | H1's gap table; the rule becomes structural |
| **§9.1 the pair groups at the far right** | kept | §2.6 |
| **§9.1 glyph alone for an act, words for a report; drawn glyphs; the stroked ✓** | kept | — |
| **§9.1 table: 🗑️ row** | **replaced — B5** | — |
| **§9.1 table: ✓ the one solid green** | **replaced — B10** | — |
| **§9.1 table: OK row's close-only OKs** | **replaced — B6** | — |
| **§9.1 table: 💤 abstain, 💤 in the rail** | kept | the Indifferent block's note |
| **§9.1 table: ✏️ hh:mm** | restated, part **replaced — B9** | the row's note; not on the single-site card |
| **§9.1 table: ❄️, 🛡️ ✒️, 🍾, 📨, ✏️ / 🏛️ second** | kept | the *pair* and *commit* shapes |
| **K1** the settled card is the composer | kept | — |
| **K2** founder's hand; closed: the row 🗑️ alone | restated, part **replaced — B6** | closed: shape *absent* |
| **K3, K6, K7, K8, K12, K29** | kept | route glyphs, the pair |
| **K4** what stands is never offered back; the power card's exception | kept; exception **replaced — B8** | what stands is the head |
| **K17, K18** the edit spent at Propose; the site card's bin | kept | — |
| **K19** proposals in highlighter, reading as the clause reads | kept | — |
| **K26** choosing and committing are two acts | kept | `draft` in the state |
| **K31** 📝 two modes | kept | — |
| **W9** nothing rebuilds under a press | restated | U1's first instance |
| **CP1** option blocks | kept | the block (§2.3) |
| **CP2** the radio names the register | kept; **provenance form replaced — B1** | — |
| **CP3** rationale rides acts that change | restated — **B13** | the lane appears with the change |
| **CP4** Indifferent a full block | kept | — |
| **CP5** the commit family pairs by route; 👑's 🗑️ closes | kept; bin **replaced — B5** | — |
| **CP6** a member-pile card heads with its people | kept | it is the anchor rule |
| **CP7** 🗑️ on every card but Y20's and the judgment cards | **replaced — B5** | J2 |
| **CP8** the row states the act, the title the state | kept | — |
| **CP9** no commit where none can come; the close-only OK | first half kept; second half **replaced — B6** | — |
| **CP10** every option block carries its radio | kept | a *live* block (R1) |
| **CP11** a locked block keeps its words and greys its radio | **replaced — B7** (v2: for settings rungs only) | a locked *rung* is not drawn; a locked *proposal* keeps its words and its label, without a radio |
| **STYLE §3** *the opened card's head shows the same two lines* | **v2: drift, not kept** | Ed's later ruling (2026-09-03, `clauseText`: *the card drops them*) governs today's page and the grammar; §3's sentence is reported as drift, and the power line is the power cards' head (P3 v2) |
| **T2** a title says what kind of answer it wants | kept | on the tab and rail |
| **T3** a settled head is the rule; no head on option-block / heading-over-text; personal cards keep the title | first clause kept; the middle **replaced — B2**; **v2: the last clause kept** (B3 withdrawn) | the title drawn as the head label |
| **T13** a value, never a guess | kept | the head of an undecided rule reads *The Founder is deciding …* |
| **T16** raw values are not copy | kept, checked | `raw-value` |
| **T17** the price once, at the act | kept | the commit's tooltip |
| **T18, T44** OK; a grant's *Accept ‹glyph›*; *Activate 🏛️* | kept; *Activate* is open choice **O3** | one acknowledgement form |
| **T21** read-only copy survives the spec (`ctx.lockline`) | **replaced — B11** | the paragraph's own power line |
| **T29** a field label counts rivals | kept (moot under M18) | — |
| **T36** one fact, one home | restated — generalised | F1 and `one-home`: T36 was one sentence of the mechanism; the grammar makes it every fact |
| **T43** the constitution speaks for itself | restated | the head is the constitution's own sentence |
| **T47** a glyph alone for an act | kept | — |
| **T48** consent labels; two provenance labels | labels kept; drawing **replaced — B1** | — |
| **CLAUDE.md** *open is said by depth, not by outline* | kept | R1 |
| **CLAUDE.md** `clause-head` *under an eyebrow … the mark moves 0px in both axes* | **replaced — B4** (v2: the eyebrow's words and its position in the flow; it survives as the head label in the top inset); the 0 px kept and made true | — |
| **CLAUDE.md / design/edit-mode.js** the 📝 door straddles the page's right edge (Ed, 2026-09-24) | **v2: kept** | v1 broke it unannounced; G4 v2 makes the floating layer an overlay |
| **CLAUDE.md** `decision card`: *replaces its paragraph; clause-head → proposal-block → commit row* | restated | the six slots |
| **CLAUDE.md** `commit row`: *every radio lines up down one left edge* | kept | — |
| **CLAUDE.md** *the tab you click does not move*, *a closed pile takes margin 0*, *the tuck under the card*, *one glyph size* | kept | `still`, B6 (card-audit) |
| **CLAUDE.md** *nothing rebuilds under a press* (five consequences) | restated | U1, U2 |
| **CLAUDE.md** *every radio on a card says the same words* | kept | — |
| **CLAUDE.md** `card-morph` | kept | the card's height glides; nothing above it moves |
| **card-audit P2** (*the eyebrow's height, which every card has and no card is wrong about*) | replaced | `still` — a check, not a ruling, so not a break |

**Count: 13 breaks (B1–B13)**, touching 37 of the 106 rule rows above; the other 69 are kept or restated. **v2: 12 breaks** — B3 is withdrawn, and B4 and B7 are narrowed (B4 to the eyebrow's wording and its place in the flow; B7 to settings rungs); the 📝 door, a break v1 made without numbering it, is undone rather than numbered. Rows v2 moves from *replaced* back to *kept*: F15's second half, T3's last clause, §9's 🌂 and identity rows, and the door.

---

## 9. Open choices

Where the grammar leaves a genuine choice. Stage 6 turns each into a question; the recommendation is what the prototype builds.

**O1 — Where a block's label goes** (the head's *current text*, *Proposed*, *Previous text*, *Rejected proposal*). The head's label cannot stand above the head (G2), and Q207 says something must tell a first-time reader which lane is the current text.
- (a) In the lane, beside the radio, for every block alike — *v1's recommendation, built and found wanting*: a block with no radio had no lane and so no label, and *Proposed* was read after the words and the rationale (critique 4, 5; amber 2).
- (b) Above every block but the head, the head's in its lane. Keeps today's *Proposed* eyebrow; two positions for one kind of thing.
- (c) No labels: position says it. Fewest words; Q207's first-time reader unanswered.
- **(d) v2 — recommended and built: the label slot (§2.3a).** Every block's label is its first line; the head's label is in the card's top inset, above the head without displacing it. One position (first, left), one drawing, and Q207's label present on every card whose head is not the only paragraph. Cost: the card's top inset now carries text, so G5 must hold the inset to the clear space above, and a card packed tight under another (📍 at the birth) has room for none — it has no blocks there, so it needs none.

**O2 — How a card with no row is closed.**
- **(a) Its pressed tab, a click on nothing outside, Escape — no button. Recommended**: the judgment cards (Q1500) and the filed records (Q1522 (6)) already close this way.
- (b) A quiet close control in one fixed corner of every card: discoverable, but furniture on every card, and a second way to say what the tab says.

**O3 — The 🏛️ grant's word.**
- **(a) *Accept 🏛️*, like the other three grants — recommended**: one acknowledgement word per meaning (D8). **v2: now built** in the prototype (v1 recommended it and kept *Activate* — amber 28).
- (b) Keep *Activate 🏛️* (Q1502), matching its title *Activate Your Membership*.

**O4 — The tab gutter at 390.**
- **(a) Kept, narrowed to the tab's width plus `--s1`; the card runs to `--s3` of the glass — recommended**: the tab is the only door from the document (Y18), and a kept gutter is what lets `still` hold at 390.
- (b) At 390 the strip becomes a row of tabs along the card's top edge: more text width, but the tab moves on open at one width and not the other (G3).

**O5 — A fact line on a text clause** (when it last changed, by which record).
- **(a) No — recommended**: a clause's history is its records' tabs (M13); a line on every judgment card is noise the reader is not asking for.
- (b) Yes, *Last changed · ‹when›*.

**O6 — The personal cards' title** (B3).
- (a) Head with your row — v1's recommendation; the critique and amber 36 showed a card that asks nothing.
- **(b) Keep *Choose Your Name* etc. — v2: recommended and built**, as the **head label** over your row, so it no longer breaks P1 (the label is in the top inset). Extended to every act or question card: 🌂, 🥂, 🍾, the grants, the power cards, 🎩 while asked, 👑.

**O7 — Where `acts` is computed.**
- **(a) Phase two starts with the page's one `actsOf`, over the `may*` family — recommended**: it removes the 27 scattered *closed* tests without a host change.
- (b) The host serves each seat its affordance list with the view, so the page cannot offer what the host would refuse. Stronger, and a server change; worth it once (a) has shown the list's shape.

**O8 — The re-render architecture** (U1, U2).
- **(a) Keyed patching for the card shell, family by family, in phase two — recommended**: the grammar's stable slot keys are its precondition.
- (b) Keep extending the deferral flags per case: no architecture change, and the 23rd gotcha of this shape.

**O9 (v2) — The empty people lists' words.** v1 carried the band's bracketed placeholder (*(no outstanding invitations)*, *(nobody proposed for removal)*) into ✉️ and ❌'s heads, replacing their STYLE-passed sentences (critique 14, amber 5, 34, 35). Since the head is the line, the line and the card must say the same.
- **(a) The band says the sentence** — *Nobody has been invited yet.* / *Nobody is proposed for removal.* — and the card's head is that line. **Recommended and built**: the document speaks in sentences everywhere else (T43), and these two already passed STYLE.
- (b) Both say the bracketed form: shorter, and reads as a placeholder rather than the document speaking.

**O10 (v2) — OKs owed at the close.** A record, park or news card still owed an OK when the document closes (the fixture's *knives*, *claims*, *Nomination*, *Locking Up*, *Calling a Meeting*).
- **(a) 🥂's signature discharges them — recommended, and drawn so in the prototype**: the close is one moment and 🥂 is its one act (K2); OK buttons on a closed page would be the only acts left beside it. Needs the module to accept that one press for the owed set, since today it refuses an OK after the close; the rail's entries must leave with the signature (not built — the prototype's rail is today's).
- (b) Each keeps its OK on the closed page: no module change, but P4's *no act but 🥂* gains an exception per card.

**O11 (v2) — A strip longer than its card** (G6).
- **(a) The card ends at its content, the strip hangs on down the gutter — recommended and built**: nothing is padded, the tab you pressed still does not move, and what follows is pushed only as far as a closed pile would push it.
- (b) The filed half of the strip (read records, laid-down powers) folds into one pile tab inside the open strip: shorter strips, but a second pile idiom inside an open card and one more press to reach a record.

---

## 10. What the prototype proves, and what the programme costs (v2)

Written because the critique found the prototype argued for an architecture it does not have (finding 13, note H), and a reviewer who took the checks table on trust would take that too.

**The prototype is a sorter, not the grammar.** `proto/grammar.js` takes the markup today's 40 card builders already write and sorts it into the six slots: it recognises provenance by matching label strings, finds the bin by its glyph and a withdraw by its tooltip, reads *closed* from one flag, and draws labels from what the old markup happened to carry. Everything v2 adds — the label slot, the visible note, the closed page that keeps its content, the power card's own clause — is built the same way, as a rule inside the sorter. So:

- **The checks pass against a sorter.** A card that passes `head-registration`, `label-slot` or `closed-keeps-content` here passes because the sorter recognised its parts. The faults the critique found in v1 (the locked 🎩's bare alternative, the cut-off race's missing proposal) had exactly the shape of a sorter's mis-sort. A build on `CardState` must pass the same checks again, from nothing.
- **S1 is not met, and cannot be by sorting.** *A slot reads `CardState` only* is the grammar's central claim, and the prototype has no `CardState`: J2 is decided by comparing the DOM with a baseline because *sent* and *unsent* are not in the markup (checks.md doubt 3).
- **P10 is not built.** U1/U2 (keyed patching, nothing replaced under the reader's hand) are not in the prototype and `render-hold` is not measured. It is the principle live rooms have taught hardest (focus steals, half-typed dates, holds taken by a poll), and the proposal has demonstrated it least.

**The programme's main cost is the conversion.** Phase two is not a restyle: it is **converting the 40 card bodies — every `BODY` in band.js, every per-kind builder in session.js, setup.js and session-view.html — to read one `CardState` and emit slots**, instead of each re-deriving its own state and writing a whole card. That is the work O7 (where `acts` is computed) and O8 (keyed re-render) presuppose, and it is most of the programme: the shell, the tokens and the checks are small beside it. It should be staged one card family at a time (BUILD.md), each family's checks turned into guards as it lands, and each family re-frozen in the probes' references once. The sorter is a way to see the grammar, and should be thrown away, not grown.
