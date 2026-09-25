# Diagnosis — what is wrong with the cards, and why (Q1541, stage 2)

Written 2026-09-25 from `inventory.json` (1336 card records: key × walk × width, 37 of 40 kinds) by `tools/diagnose.mjs`, which writes every number below to `diagnosis-counts.json` beside this file and can be re-run (`node design/proposal/tools/diagnose.mjs`, `--full` to print the parts). A *record* is one card opened at one width in one walk; *pairs* folds the two widths, so a fault seen at 1600 and at 390 counts once. File:line references are to the tree at `843861b3` (this branch's base). Screenshots are in `shots/current/`.

## Summary

**1226 of the 1336 records (92%) carry at least one fault of the classes below; 110 are clean** — sealed records, 🍾, the admission cards, a few judgment cards and the doors. Most records carry two (524) or three (228).

### The classes, ranked by records × severity

Severity: **3** — the card misstates the document's state, or offers an act its state forbids; **2** — the reader meets noise: a doubled or empty thing, a control that does nothing, a fact drawn as a control; **1** — measurement: a box off the grid, a drift in words.

| rank | class | records (pairs) | sev | score | kinds touched | verdict |
|---|---|---|---|---|---|---|
| 1 | **D5** Two different things drawn alike — chiefly *who chose it* drawn as a pressed radio | 502 (251) | 2 | 1004 | setting, birth, news, 🪪 🤝, records, 👑 | grammar (but it is Ed's ruling CP2/Q1188 — a break for stage 3) |
| 2 | **D3** A control with no job in its state — 🗑️-alone rows, a 🗑️ with nothing to put back, dark commits on a closed document, one act offered twice | 468 (234) | 2 | 936 | 16 kinds; setting, grant, power, news worst | grammar |
| 3 | **D1** The frame is drawn whatever it holds — empty heads keeping their box, orphan hairlines, empty commit rows | 370 (185) | 2 | 740 | 18 kinds | grammar |
| 4 | **D7** Spacing and type off the scales | 704 (352) fixture records; 67 + 23 stylesheet literals | 1 | 704 | every card (`.headclause`, `.setupcard`, `.sugg`) | check (card-audit S1 exists) + tokens |
| 5 | **D9** State contradictions — closed documents offering acts, tabs asking on a closed page, provenance naming two parties, *Set to undefined* | 140 (70) | 3 | 420 | 15 kinds | grammar (state as an input) + a check |
| 6 | **D2** One fact stated twice on one card | 160 (80) | 2 | 320 | setting, birth, doors, 🪪 🤝, news, 🥂 | grammar only — paraphrases defeat a text check |
| 7 | **D4** The same idea drawn two ways — two shells, 23 commit-row shapes, 🗑️ with 8 meanings, 6 acknowledgement faces | 280 (140) minority-form records | 1 | 280 | all | grammar |
| 8 | **D6** Geometry that moves on open — the charter's tab drops 33–99 px when its card opens; 20 cards drop differently at 390 | 134 (67) | 2 | 268 | every charter card kind | grammar + a check (card-audit P2 made vertical) |
| 9 | **D8** Copy saying the same thing in different words | 158 (79) | 1 | 158 | settings, records, 🥂, withdrawals | check (copy-check) + one table |
| 10 | **D10** One place, several headings by entry point | 14 (7) | 1 | 14 | gap, park | grammar |
| — | **D11** SURFACE contradicting itself | 3 rule pairs | — | — | commit row, editing card, the tab | Ed |
| — | **D12** One fact, several readers (from Gotchas and the code) | 22 of 72 surface gotchas; 4 live pairs found here | — | — | cross-cutting: underlies D2, D9 | grammar (one home per fact) |
| — | **D13** The render lifecycle (from Gotchas) | 22 of 72 surface gotchas | — | — | cross-cutting | neither — outside the card grammar |

*D5 ranks first on volume, and the volume is one ruled decision drawn 490 times; by severity per record D9 is the worst class and should be read as the headline.* The worked example that shows most of them at once is 🌍 read by a member — [chamber-seat_1-1600.png](shots/current/chamber-seat_1-1600.png): the value stated three times (the standing block, *Set to Anyone with the link*, and the change line), who chose it stated three times and two of them disagreeing (*Chosen by the Founder ✒️*, *Decided by the members.*, *The Founder has changed…*), an empty head's 24 px above the first block, and a 🗑️ with nothing to put back beside the OK.

### The four structural causes most of it reduces to

1. **The shell draws its frame unconditionally; each part decides its own presence, and nothing asks what ended up inside.** `cardHtml` (design/setup.js:729) always emits the head — it is what carries the strip — and always the commit row unless the foot is literally `null` (:792); `commitBarHtml` (design/cards.js:1993) always emits a `binslot` spacer and a `rightpair` whether or not anything goes in them (:2003, :2009). Sixteen places emit a commit row and 41 call sites append `binBtn()` (design/band.js alone has 38). → D1, most of D3, and the P12 orphan.
2. **The document's state — era, seat, holder, closed — is not an input to the card; each body re-derives it, and each fix special-cases one key.** 146 per-key branches (`c.k === '…'` and kin) across the card builders; *closed* is tested in about 27 places, each body its own; `readBody` is applied to every non-founder seat and then switched off for 🪶 (band.js:1416, `c.k === 'title'`) and 🎩 (`c.k === 'hat'`, :1402) one card at a time, after Ed saw each. → D9, D3's dark commits, D2's *Set to* block, *Set to undefined*.
3. **One fact has several readers.** Who chose a rule is `provOf` (design/session-view.html:1580) on the radio, `ctx.lockline` (:7621) on the lockline and the record's eyebrow — three functions with three rules; what a rule is set to is the clause table on the standing block and `VALUE` (:5141) on the *Set to* line, which reads the founder's page state and prints `undefined` where the member's page has none. CLAUDE.md's Gotchas carry 22 post-mortems of this shape. → D2, D8, D9's contradictions, D12.
4. **Two shells for one card.** SURFACE §9 says it outright: *two implementations of one shell (`suggCardHtml` in session.js for the charter; `cardHtml` in setup.js for the band)*. The charter's has an eyebrow above the clause, the band's has none; the charter's judgment cards dropped their 🗑️ (Q1500) and keep a spacer, the band's keep theirs; acknowledgement is OK, *Accept ✒️*, *Activate 🏛️* or ✓ by kind. → D4, D6 (the tab drops 33 px on the charter and 0 on the band), part of D5.

A fifth cause sits outside any card grammar and should be named so the redesign does not claim it: **the page is string templates re-rendered wholesale on a 4 s poll**, so anything held in the DOM — a press, a caret, a drag, a half-typed date — is destroyed by a render. 22 of the 72 surface gotchas are this (D13). The grammar must not make it worse; it cannot fix it.

### Testing the plan's starting diagnosis

PLAN.md: *cards are assembled from parts that each decide their own presence, and the frame around them does not know what ended up inside; every new condition can leave an empty slot, an orphan divider, a statement made twice, or a control with no job; each has been fixed one at a time.*

- **Confirmed for the frame.** Cause 1 explains D1 and most of D3 — together the largest share of faults by score — and the code shows the one-at-a-time fixing literally (the two `c.k` special cases in `readBody`'s caller, each with Ed's date on it; Q1503 fixed 🎩's blank *Set to* the same way on 2026-09-22, which is why 🌍 and ❌ still print *undefined*).
- **But presence is not the whole of it, and not the worst of it.** The severe faults (D9) and the doubled facts (D2) come from causes 2 and 3 — the card does not receive the document's state, and one fact is computed in several places. A slot grammar that only decides *which slots are drawn* would leave all of them standing. The grammar has to take **the card's state as its input** and give **each fact exactly one home**; PLAN's stage 3 already asks for the second, and should be read as asking for the first too.
- **Orphan hairlines are nearly solved, and the one survivor lives in a fixture-only state.** 48 records, one cause (the judgment row's placeholder spans, cards.js:2003), one state: the fixture's closed page still serving 14 unjudged pairs, which the live ladder's closed document never serves (it served no pair at the closed rung). card-audit P12 already catches it. The frame's live failure is the *empty slot that keeps its box* — 322 records whose head holds nothing but the strip and still takes 12 px plus a 12 px margin — which P12 does not see, because an empty box is not a hairline.
- **"Most of the design-system Gotchas are this" — about half.** Of the 19 design-system gotchas, 10 are frame or drawn-two-ways; 7 are the render lifecycle. Across all 109 gotchas, the surface ones split: render 22, two readers 22, frame 8, drawn-two-ways 8, presence 8, fact twice 2, no job 2 (37 are engine, server, tooling or copy).
- **One of Ed's standing observations is not true today, and the check that should say so looks away.** *The tab you click does not move* holds in the band (0 px on all 12 band kinds measured) and fails on every charter card: the tab drops 33 px (quick, race, the ⏳ pair, mine), 62–84 px (records), 82 px (patch), 99 px (the backlog at 390), because the charter card's eyebrow is drawn above the clause. card-audit P2 (design/tools/card-audit.mjs:864–870) measures only the sideways half, by a comment that calls the vertical travel *the eyebrow's height, which every card has and no card is wrong about*; the band's cards have no eyebrow and do not move.
- **A doubled fact is always a paraphrase.** A whole-sentence equality test over every card found no repeated sentence outside a race card's two rivals (which share wording by nature); every doubled fact is the same thing in other words — *Set to Members only* under *The document can only be seen by members*, *final as of 00:44* under *closed at 00:44*. No text check will catch this class; only one home per fact prevents it.

---

## Method and its limits

- **Counted from `inventory.json`**, whose walks are the fixture (founding, answers, delegated, settled, seat:1, stranger, charter, closed, the two band walks, edit mode) and a phase-ladder document at five rungs × founder, two members and a stranger. Kinds not reached are not counted: the diagonal 🌶️, the applicant's five, and the four live-only news families (release batch, amendment news, mail give-up, departure news).
- **The instrument does not record** a radio's disabled state, a contenteditable lane, a `<select>`, or 🍾's glyph toggles as controls. Where that matters (D3's *🗑️ with nothing to put back*, D9's *action radios on a closed document*) the kinds whose bodies hold such controls are set aside, and the live closed rung's radios are reported as *drawn*, not proven pressable; stage 1 verified the fixture's closed settings cards live by eye (inventory evidence 5).
- **card-audit's findings (S1, H2, H4, F6, P12) exist only on the fixture walks**; the live walks carry none, so D7 undercounts.
- **Geometry is trusted on the fixture walks only** (scroll 0, motion stubbed). Six travels past 150 px are the walk's previous card collapsing above the measured one (card-audit's P7 case) and are set aside. The charter's recorded 12 px *sideways* clause travel is an artefact — the closed clause is measured as its `.anch` box (12 px padding included), the open one as its text — checked by hand on `quick-keys` and `race-purse`, and not counted.
- **The Gotchas tagging is a judgment**, made once in `diagnose.mjs` (`GOTCHAS`) so the count is reproducible and anyone can disagree with a row.

---

## The classes

### D1 — The frame is drawn whatever it holds · 370 records (185 pairs) · sev 2

- **Empty head that keeps its box** — 322 records, 15 kinds: grants 72, identity 66, setting 50, 🎩 34, settled records 28, 🪶 📍 12, both motion cards 22, 👑 16, 🪪 🤝 12, the stranger 6. The head holds only the strip (Q1151 took the title off option-block cards; Q1373 off the grants), but `clauseHeadHtml` (cards.js:1884) still emits `.headclause`, 12 px tall with its margin, so every such card opens with ~24 px of nothing above its first block. Evidence: `grant-pen|live_closed_founder|1600` [grant-pen-live_closed_founder-1600.png](shots/current/grant-pen-live_closed_founder-1600.png); `chamber|live_constitution_m-1|1600` [chamber-live_constitution_m-1-1600.png](shots/current/chamber-live_constitution_m-1-1600.png).
- **Orphan hairline and empty commit row** — 48 records (24 pairs), all `closed`, quick 38 · race 6 · insert 4: the judgment row's `binslot` and `rightpair` spans (cards.js:2003, :2009) are drawn with nothing in them, so the row's top hairline is the last thing on the card. `quick-keys|closed|1600` [quick-keys-closed-1600.png](shots/current/quick-keys-closed-1600.png). Fixture-only state (see the summary).
- **Blank field** — 6 records, 🪶 before it settles: a field slot drawn with no text; the title lane is in it but the instrument does not see contenteditables, so this part is a lower bound on nothing and is kept only as a pointer.
- **Root cause**: cause 1 — the shell's slots are fixed markup; the head exists because the strip rides in it, not because the card has a head; the row exists because the foot was not `null`.
- **Verdict: the grammar can make it impossible** — a slot with nothing in it is not drawn, and the strip is carried by the card, not by a head. **Check**: card-audit P12 (exists) plus a new **empty-slot** check — no slot box of height > 0 whose visible content is nothing but the strip.

### D2 — One fact stated twice on one card · 160 records (80 pairs) · sev 2

- **The *Set to … / Set by …* block under a standing block that already says both** — 142 records (71 pairs): setting 82, 🪶 📍 14, ✉️ 10, ❌ 10, 🪪 10, 🤝 10, news 6; on the live ladder above all (closed 70, ready 52). `readBody` (setup.js:801–820) prints a `statline` and a `lockline`; the band's caller applies it to every non-founder seat (band.js:1410–1416). [chamber-seat_1-1600.png](shots/current/chamber-seat_1-1600.png), [slug-closedband-1600.png](shots/current/slug-closedband-1600.png), [admission-live_ready_m-1-1600.png](shots/current/admission-live_ready_m-1-1600.png).
- **Who chose it, said more than once** — 130 records: *Chosen by the Founder + Set by the founder …* 90, *Chosen by the membership + Decided by the members* 16, *Chosen by the Founder + Decided by the members* 14 (a contradiction, D9), *Changed by the Founder + Chosen by the Founder* 10.
- **The same moment twice** — 🥂, 8 records: *The document closed at 00:51 on 25 September* and, beneath it, *The document is final as of 00:51 on 25 September.* [closing-closedband-1600.png](shots/current/closing-closedband-1600.png).
- **Not counted**: whole sentences repeated on 10 race/deadlock records are two rival wordings sharing a sentence — the diff, not a fault.
- **Root cause**: cause 3 — the value has two readers (the clause table on the block, `VALUE` on the *Set to* line) and provenance three (see D12); each reader was given its own slot, so each slot says it. Cause 2 keeps it alive: the fix has been per key (🪶 2026-09-24, 🎩 Q1503).
- **Verdict: only the grammar can make it impossible** — one home for the value (the standing block), one for provenance, one for history. No text check catches it (every instance is a paraphrase). A structural check can back it: **one-home** — at most one element per card carrying each fact role (value, provenance, date), read from `data-` roles the grammar would add.

### D3 — A control with no job in its state · 468 records (234 pairs) · sev 2

- **A commit row of 🗑️ alone** — 234 records, of which 38 are by rule (a mover's or author's withdraw: `mine`, the mover's motion, the editing card's site) and **196 are the rows CP9 forbids** (*the row is never 🗑️ by itself*): setting 94, 🪶 📍 28, 🎩 18, 🪪 12, 🤝 12, 👑 for others 10, ✉️ 10, ❌ 10. Mostly member seats on the live ladder (closed 80, ready 60). [title-closedband-1600.png](shots/current/title-closedband-1600.png), [hat-seat_1-1600.png](shots/current/hat-seat_1-1600.png).
- **🗑️ titled *Put it back as it stands* on a card with nothing to put back** — 388 records (kinds whose bodies hold unrecorded controls set aside): setting 98, grants 72, power 64, news 50, 🪶 📍 36, gates 16, 🪪 🤝 24, 👑 16, 🌂 6. C4 keeps 🗑️ *always live*; on a card with no provisional value it closes, and its tooltip says something false. The Q1500 finding — a member read the bin as *skip* — was this class on the judgment cards; the same bin stands on these 388.
- **A dark commit on a closed document** — 16 records: the admission card's 🏛️ (6, live closed), ❌'s ✒️ (4), a race's ✏️, the ordinary motion's ✓, the stranger's 📧. CP9: *a permanently dark commit promises a thaw that never comes*.
- **One act offered twice on screen** — 4 records: a single-site editing card carries 🗑️ ✏️ and the floating proposal-row carries 🗑️ ✏️ for the same draft, the row overlapping the card's foot. [editing-gap-site-1600.png](shots/current/editing-gap-site-1600.png).
- Smaller: *pressed on open* (F6) 2 records (⏱️ on the session band); an option block offering back the rule that stands (F6) 10 records (👤 ⏰).
- **Root cause**: cause 1 — `binBtn()` is appended by 41 body builders, each deciding for itself; the row has no notion of "this card has nothing unsent"; and cause 2 for the closed-document darks.
- **Verdict: the grammar can make it impossible** — a control exists only while it has a job, the bin only while an unsent value exists, and a card that asks nothing closes by its tab or an OK. **Check**: **no-job** — every enabled control on an open card either changes page state or sends a command (drive each and diff), and **no row is 🗑️ alone** (a one-line assertion over the row).

### D4 — The same idea drawn two ways · 280 minority-form records · sev 1

- **Four head forms**: rule-as-block with a provenance radio 444, a title or sentence 380, no head (strip only) 322, eyebrow + clause 190; six kinds use two forms depending on state (setting, 🪶 📍, 🪪, 🤝, the consent motion, the stranger).
- **23 commit-row shapes** for what §9.1 describes as one grammar (full list in the JSON), including three for *acknowledge*: OK (294), *Accept ✒️ / Accept 🛡️ / Activate 🏛️* (52), and 🛡️ ✒️ on 👑.
- **One 🗑️ glyph, eight tooltips, four acts**: put back (820), discard (180 — *Discard this motion*, *Discard this change*), withdraw with a refund (40 — three wordings), close (8 — two wordings).
- **Two open geometries**: the band's tab stays put (0 px on 12 kinds) while the charter's drops by the eyebrow (33–99 px, D6); the first line of a band card lands 0, 3, 17, 20 or 55 px below where its paragraph's text stood, by kind.
- **Root cause**: cause 4 — two shells, each extended separately (the band never adopted the charter's `keepStill` until a 570 px jump forced it — Gotchas); and cause 1 — commit rows composed per body.
- **Verdict: the grammar can make it impossible** — one shell, one row grammar with a closed vocabulary of acts. **Check**: a **row vocabulary** assertion (every row is one of the grammar's named shapes) and a **head form** assertion per kind.

### D5 — Two different things drawn alike · 502 records (251 pairs) · sev 2

- **Provenance drawn as a pressed radio** — 490 records: setting 250, 🪶 📍 80, news 50, 🪪 🤝 64, records 28, 👑 16. *Chosen by the Founder ✒️* is a solid `--primary` pill with a filled dot — the same drawing as the option you just chose, and the same fill as OK. A fact about the past is drawn as a control in its pressed state. Ruled (CP2, Q1167 (a), Q1176, Q1188: *the standing block always wears its provenance radio*), so this is **a break for stage 3**, not a finding. [rate-closedband-1600.png](shots/current/rate-closedband-1600.png).
- **🗑️ for acts that cost different things**: putting back an unsent value (free), withdrawing a proposal (refunds a ✏️ or a 🏛️ — money moves), discarding a draft, closing.
- **A radio with no label** — 8 records, the mover's own constitutional motion card: the standing block's radio is an empty ring with no words and no job (the mover cannot prefer the rule against their own motion). [mo_mo-4-settled-1600.png](shots/current/mo_mo-4-settled-1600.png).
- **The 👑 Text question's ✒️ accept drawn solid green**, the colour §9.1 keeps for ✓ = *decided* — 4 records. [crown_cq-4-live_session_founder-1600.png](shots/current/crown_cq-4-live_session_founder-1600.png).
- From Gotchas, the same class already bitten: 🍾 borrowing ✒️'s glyph; *stranded* wearing the live blue; every radio saying the same words.
- **Root cause**: a small visual vocabulary (pill, radio, blue fill, green fill, 🗑️) asked to carry more distinctions than it has shapes, and each new distinction borrowing the nearest existing drawing.
- **Verdict: the grammar can make it impossible** — a fact is text, a control is a control; one glyph, one act. **Check**: a **role/drawing** table (each drawing token used for exactly one role) asserted over the DOM — e.g. no `aria-pressed="true" disabled` pill; no solid green but ✓.

### D6 — Geometry that moves on open, or across widths · 134 records (67 pairs) · sev 2

- **The tab drops when its card opens**, every charter kind: quick 33 px, race 33 (48 with a two-line head), the ⏳ pair 33, mine 33, insert 35, sealed records 62–84, patch 82, backlog 67–99. The band's 12 kinds: 0. `quick-keys|charter|1600` [quick-keys-charter-1600.png](shots/current/quick-keys-charter-1600.png) — the 💡 tab sits beside the clause, 33 px below the card's top edge.
- **Width-dependent** — 20 cards drop a different distance at 390 than at 1600 (`race-sanctions` 33 → 48, `race-claims` 62 → 79, `quick-kitchen` 67 → 84): the eyebrow and record head wrap.
- **At 390** every card stands at x 64 with a 20 px right gutter (668 records): the tab gutter is kept on a phone.
- From the inventory's zones (not card records): the floating 📝 (`edit-door`, x 1154–1226) overlaps the right rail (x 1200–1518) by 26 px at 1600 and covers its lowest entries (inventory finding 7, Q1518); the contents rail's marks run past the left drawer at 390 (finding 11).
- **Root cause**: cause 4 — the charter shell puts an eyebrow above the clause, so the clause (and the tab beside it) moves down by the eyebrow's height; the band shell has no eyebrow. And the check was written to accept it.
- **Verdict: the grammar can make it impossible** (the label goes where it does not displace the clause, or the tab anchors to the card's top) — and **a check must hold it**: card-audit **P2 made two-dimensional** (the pressed tab moves 0 px on both axes), plus a **width-invariance** check (the same card's travel at 1600 and 390 agree).

### D7 — Spacing and type off the scales · 704 fixture records · sev 1

- **card-audit S1**, 1408 sightings on three boxes: `.headclause` padding 6 px (704), `.setupcard` padding 14 px and margin-top −17 px (500), `.sugg` side margins 15.13 px and padding 14 px (204). Every card carries at least one.
- **The stylesheet**: 23 `font-size` declarations not on the type scale (`8px`, `9px`, `16px`, `17px`, `18px`, `20px`, `22px`, `1.05rem`, `1.125rem` ×3, `1.35rem`, `1.5rem`, `2.7rem`, `0.8em`–`1.15em`; system.css lines listed in the JSON), and 67 margin/padding/gap literals off the 4 px grid (`6px` ×14, `14px` ×11, `3px` ×11, `10px` ×9, `5px` ×5, …).
- Helper text: H2 (`.setnote` in full `--fg`) 16 records; H4 (a 311-character helper on ✉️) 2.
- **Root cause**: the scales were introduced (Q1402) after most rules were written; boxes are tuned per case to make one measurement come out (the −17 px pulls a card up over its tab row).
- **Verdict: only a check can catch it** — card-audit S1 exists; add a **stylesheet lint** (every `font-size` a `--t-*`/`--h*` token; every spacing literal on the grid or in an allow-list with a reason). The grammar can reduce it by owning the card's padding and gaps itself.

### D8 — Copy saying the same thing in different words · 158 records · sev 1

- **Provenance, five phrasings** for two facts: *Chosen by the Founder* (326), *Chosen by the membership* (164), *Set by the founder when the document was made.* (112), *Decided by the members.* (30), *Changed by the Founder* (10). CP2 rules that the only two labels are *Chosen by the membership* and *Chosen by the Founder ✒️*; the lockline and the record eyebrow never adopted it.
- **Withdrawal, three**: *Withdraw — the edit comes back in full*, *Withdraw it — the ✏️ comes back in full*, *Withdraw it — your 🏛️ comes back whole*.
- **The closing moment, three**: *closed at 00:44*, *final as of 00:44*, *No more changes to the document may be made after …*.
- **A place, four eyebrows**: *The clause as it stands* (176), *The gap as it stands* (8), *The clause as it stands — and it is still standing* (4), *A new clause after: …* (2).
- **Root cause**: cause 3 — each reader of a fact brings its own sentence; `design/copy.js` holds the strings but not the rule that one fact has one sentence.
- **Verdict: only a check can catch it**, and the grammar helps by giving each fact one slot: a **copy-check rule** that a fact role (provenance, withdraw, the closing moment) draws from one key in `copy.js`.

### D9 — State contradictions · 140 records (70 pairs) · sev 3

- **A closed document offering acts** — live commits on 24 records: on the live ladder's closed rung the Founder's grant card offers *Accept ✒️* and *Activate 🏛️* (6), ✉️ offers ✒️ *Send the invitations — your word sends* (2 live, 2 fixture), ✋ and 🖼️ offer ✓ *Save* (10, live and fixture); the fixture's closed page offers ❄️ on a 🔥 pair and ✏️ *Re-make it here* on a stranded proposal. [grant-pen-live_closed_founder-1600.png](shots/current/grant-pen-live_closed_founder-1600.png), [invite-closedband-1600.png](shots/current/invite-closedband-1600.png).
- **Action radios on a closed document** — 100 records drawn with *Choose this / Prefer this / Propose this*: the fixture's closed charter (52, the unjudged pairs), its closed band (26 — the E5 cards, with *Picking a value here takes it back*, 16 records), and the live closed rung (22: 💤 👁️, ✋, and the 🪪 admission card with *Prefer this* ×2 and a dark 🏛️). 🎩's 8 are CP11's greyed radios by rule and are excluded from the severity reading.
- **Tabs asking on a closed document** — 20 records: the fixture's ⏱️ strip says *Set the Proposal Rate — waiting on you* (12); the live closed rung's strips say *Give your answer* (6, 🪪), *Founder Veto — yours to take* and *Activate Your Membership — yours to take* (2).
- **Provenance naming two parties** — 14 records: ⏱️ on the closed fixture (*Chosen by the Founder ✒️* / *Decided by the members.* / *Changed by the Founder*), ⏰ on the live ladder at closing and closed for every seat, 🌍 on the member's settled seat. [rate-closedband-1600.png](shots/current/rate-closedband-1600.png).
- **A raw value printed** — 4 records: *Set to undefined* on 🌍 and ❌ for a member at the constitution rung (STYLE T16). [chamber-live_constitution_m-1-1600.png](shots/current/chamber-live_constitution_m-1-1600.png).
- **Root cause**: cause 2 — *closed* is not an input to the card; each body checks it or does not (C9's closed clause, K2 and CP9 are each honoured in some bodies); and cause 3 for provenance and `undefined`.
- **Verdict: the grammar can make most of it impossible** — the card is a function of (kind, the document's era, the seat's powers), and on a closed document the grammar has one row: OK or nothing, 🥂's signature excepted. **Check**: a **closed-page** check — on a closed document, no enabled control but the fold, the tabs, an OK and 🥂's OK; no strip tooltip saying *waiting on you*, *yours to take* or *Give your answer*; and **copy-check --walk** extended to refuse `undefined`, `NaN`, `null` and `[object` in any rendered string.

### D10 — One place, several headings by entry point · 14 records · sev 1

- The gap is *The gap as it stands* on a race and *A new clause after: ‹the clause before›…* on your own draft (10 records) — one place, two heads.
- The park card's front tab tooltip is *Whole charter · place 2 of 3 — open it*, a patch sibling's place, not the clause (4 records, fixture).
- **Not counted**: the rail entry names the change and the tab names the clause on 168 records — that is M22 and C13 by rule.
- **Root cause**: cause 4 — the editing card and the judgment card are built by different code (composer.js vs cards.js) and each named the place.
- **Verdict: the grammar** (one head per place, whatever card is on it); a **place-head** assertion — every card on one anchor shows the same head text.

### D11 — SURFACE contradicting itself · 3 rule pairs

1. **K2** (§9.2): *on a closed document … nothing on it shows a commit either, the row being 🗑️ alone* — against **CP9** (§9.3): *the row is never 🗑️ by itself* and §9.1's OK row. The build follows K2 on 80 live closed records.
2. **§9's editing row**: *none on the card — the ✏️ hold is the proposal-row's (Q1382)* — against **§9.1's ✏️ hh:mm row**: *the same ✏️ drawn on a single-site card* (Q1486 (E)). The build follows §9.1, which is D3's *one act twice*.
3. **C1** and the glossary's `clause-head` (*the mark moves 0px in both axes*) — against card-audit P2's accepted vertical travel on every charter card (D6).
- **Verdict: Ed** — each is a question for stage 6; the grammar should make one of each pair unnecessary.

### D12 — One fact, several readers (cross-cutting)

- **Found here**: provenance (`provOf`, session-view.html:1580, counts a `crown` settled by the pen as the Founder; `ctx.lockline`, :7621, counts anything but `convenor` as the members); the value (`VALUE`, :5141, against the clause table behind the standing block; `takenOf`, :6336, deliberately returns `null` for a founder-set value, so `VALUE` falls back to the founder's page state `S`, which a member's page does not have); the title (`labelOf`, `railTitle`, the eyebrow); a gap's name (D10).
- **From Gotchas**, 22 post-mortems of this shape: `meRow` finding the founder, `isRoom` reading the holder radio, `visible` pacing a member by the founder's `ORDER`, `mayPen` against `mayPenOn`, version 0 meaning two things, a record keyed by race id, a seed taken for an origin, the composer's `MVAL` spelled another map's way, three readers disagreeing on a delegated card's take-back, and more.
- **Verdict: the grammar** — one home per fact, and the card reads it from there; this is PLAN stage 3's *one home for each kind of fact*, which should name the home for value, provenance, history, title and place explicitly.

### D13 — The render lifecycle (cross-cutting, outside the card grammar)

- 22 of 72 surface gotchas: a hold released by a render's `pointerleave`, a poll detaching the held button, a completed hold clicking twice, a wallet waiting on its own animation, a caret taken by a data swap, a half-typed date lost, a drag killed by `render()`, a press reading its answer from an older view, a control swapped in place stacking its neighbours.
- **Root cause**: the page is `innerHTML` string templates rebuilt wholesale, on every act and on a 4 s poll; everything held in the DOM is at risk every render, and each case is protected by its own deferral flag (`pressInFlight`, `dateInFlight`, `heldCaret`, …).
- **Verdict: neither the grammar nor a check** — it is an architecture question (keyed patching instead of wholesale rebuilds) for phase two to schedule or rule out. The prototype must not add a new kind of held state without the same protection.

---

## Plain bugs

Faults that are wrong today whatever the redesign decides, each reproducible on `main`. **Reproduction on the live ladder** means: a fresh dev server on a fresh port and data dir, `npm run ladder -- --to=<rung>` (seed 42 was used), then the `ladder-bar`'s seat switch.

1. **A member reads *Set to undefined* on 🌍 and ❌** (STYLE T16). Ladder `--to=constitution`, seat `m-1`, open the 🌍 paragraph's tab in Rules, then ❌ in *Proposed for removal*. Records `chamber|live_constitution_m-1|1600`, `remove|live_constitution_m-1|1600` (and at 390). Cause: `VALUE.chamber` (session-view.html:5156) looks `takenOf('chamber') || S.chamber` up in a three-key table, and `takenOf` (:6336) returns `null` for a founder-set value, leaving the member's `S.chamber`, which is not one of the three; `VALUE.remove` (:5147) indexes `REMOVAL_RULE` with `removalPrice()` (:7073), which falls back to the member's unset `S.removal`. `readBody` (setup.js:816) prints the result raw. Same family as Q1503 (🎩's blank *Set to*), which was fixed for 🎩 alone. The ❌ card also claims *Set by the founder when the document was made* for a price the document has not begun under.
2. **A closed document offers acts** (SURFACE C9's closed clause, Q1479; K2; CP9). Ladder `--to=closed`, seat founder: the unaccepted grant card offers *Accept ✒️* and its strip *Activate 🏛️*; ✉️ offers ✒️ *Send the invitations*; ✋ offers ✓ *Save*; every seat is served the 🪪 admission card with *Prefer this* radios, a dark 🏛️ and the strip's *Give your answer*; 💤 and 👁️ draw *Choose this* blocks. Records under D9. **Not measured: whether the host refuses the press** (engine-core's `DocumentClosedError` suggests it does, so the member meets a refusal); the drawing is wrong either way. Whether ✋ 🖼️ may change after the close is not stated anywhere — a question, not a bug, until Ed rules.
3. **Who chose it, contradicted on one card.** Fixture `?fixture=session&closed=1&band=1`, open ⏱️: *Chosen by the Founder ✒️* on the standing block, *Decided by the members.* beneath, *Changed by the Founder* on the latest record. Ladder `--to=closing`, any member, open ⏰: the same pair. 14 records. Cause: `provOf` (session-view.html:1580–1583) and `ctx.lockline` (:7621–7624) decide the same fact by different rules (a `crown` settled through the pen is the Founder to one and the members to the other).
4. **A tab says *waiting on you* on a closed document.** Fixture closed band, ⏱️'s strip: *Set the Proposal Rate — waiting on you* on the setting, both power tabs and all three records (12 records). The fixture's seeded ⏱️ motion is still open at the close; the live closed rung shows the same shape as *Give your answer* (bug 2).
5. **🥂 states the closing moment twice** — its head and the blue box beneath (8 records, fixture and live). [closing-closedband-1600.png](shots/current/closing-closedband-1600.png).
6. **The floating 📝 covers the right rail's foot at 1600** — `#editdoor` at x 1154–1226 over the rail at x 1200 (inventory zones, `page-session-1600.png`). Q1518 raised it *below 1600 wide*; it is true at 1600 on the fixture.
7. **The mover's constitutional motion card draws a radio with no label** on the standing block (8 records; fixture `settled` and `seat:1`, live session). [mo_mo-4-settled-1600.png](shots/current/mo_mo-4-settled-1600.png). A screen reader hears an unnamed radio; a sighted mover sees an empty ring that does nothing.
8. **The 👑 Text question's ✒️ accept is solid green** where §9.1 keeps green for ✓, and its strip's front tab is the race's 💡 rather than 👑 (4 records, ladder `--to=session`, founder). Inventory finding 9.
9. **A single-site draft offers 🗑️ ✏️ twice** — on its card and on the floating row, which overlaps the card's foot (4 records, edit mode). Which rule wins is D11 (2); the overlap is a bug under either.
10. **The contents rail's marks run past the left drawer's edge at 390** (*…8 more* cut by the glass) — inventory finding 11, `page-drawer-left-390.png`.
11. **Document drift**: CLAUDE.md's `heading ladder` entry gives `--h-title` 1.777rem, `--h1` 1.333rem, `--h2` 1.125rem, `--h3` 1rem; system.css:215–218 has 2.369, 1.777, 1.333 and 1.125 rem. Not a member-visible fault; CLAUDE.md is outside this run's write limit, so it is reported, not fixed.

Not bugs, recorded so nobody chases them: edit mode reached at 390 only by script (inventory finding 10 — no member can reach it); the 12 px sideways clause travel (a measurement artefact, above); the fixture's closed page serving unjudged pairs, a park awaiting assent and an open ⏱️ motion (fixture states the live closed rung does not produce — worth fixing in the fixture, since the probes and the audit read it).

---

## The checks this points at (for stage 3 to adopt or reject)

Existing: card-audit **P12** (hairlines), **S1** (spacing grid), **F6** (pressed on open, standing offered back), **H2/H4** (helper text), `copy-check`. New, each named where its class needs it:

- **empty-slot** — no slot drawn with nothing in it but the strip (D1).
- **no-job** — every enabled control changes page state or sends a command; no row is 🗑️ alone; 🗑️ only where an unsent value exists (D3).
- **closed-page** — on a closed document no enabled control but the tabs, an OK and 🥂's; no strip tooltip that asks (D9).
- **raw-value** — no rendered string contains `undefined`, `NaN`, `null` or `[object` (D9; a `copy-check --walk` rule).
- **one-home** — each fact role (value, provenance, date, title) appears at most once per card, read from the grammar's `data-` roles (D2, D8).
- **row-vocabulary** and **head-form** — every row and head is one of the grammar's named shapes, per kind (D4).
- **role-drawing** — each drawing token (the pressed pill, solid green, 🗑️) is used for one role only (D5).
- **P2 on both axes** and **width-invariance** — the pressed tab moves 0 px vertically too, and a card's travel agrees at 1600 and 390 (D6).
- **style-lint** — every `font-size` a type token, every spacing literal on the 4 px grid or allow-listed with a reason (D7).
- **place-head** — every card on one anchor shows the same head (D10).
