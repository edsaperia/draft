# Ed's answers — the surface redesign (Q1541)

Answered 2026-09-25 in the session, from the review artifact (https://claude.ai/artifact/KLrKp3iRZ9m841zjEdZVgU) and a follow-up discussion (1541.44–1541.56, questions raised in chat where his answers pulled against each other or the grammar). **This file overrides `grammar.md`, `BUILD.md` and the prototype wherever they disagree**; they were written before these answers. Ed's notes are quoted verbatim.

## The headline ruling

**An opened card makes space above its first line as well as below** (Ed: *when a decision card opens, it should be able to create space above as well as below - this creates room for titles that go above the current text (which remains in place), and solves a lot of issues*). Mechanism, 1541.44: **everything above the card slides up by the label's height, and the scroll is adjusted in the same frame, so the clause and its tab stay still on screen** (0 px on both axes). At the page's top, where nothing is left to scroll into, the clause moves down there alone. This replaces the grammar's G5 (a card rises only into its own padding), the 4 px under band subsection headings (1541.15) and the top-edge rule (1541.35): a card never covers the line above it, because the line above moves. Examples: https://claude.ai/artifact/A6cFqL1wS5KzQfFpDB13da

## Part 1 — questions

| # | answer | Ed's note, and what it means for the build |
|---|---|---|
| 1541.1 | (a) the staged build | — |
| 1541.2 | (a) adopt all ten, with their checks | The ten must first be **redrafted to match these answers** (1541.51): the pill, the dark bin, the reason box always shown, the card floor and the 📝 overlap all break the v2 wording. |
| 1541.3 | (a) every card starts with its line, four exceptions | — |
| 1541.4 | (c) today's placements | Read with the headline ruling: the card's own label stays **above the first line**, in the new space, so it no longer drops the tab. Block labels: 1541.45. |
| 1541.5 | (b) keep the pill | *The pill gives the current state; it is a fact about the past, which is why it's the one that's selected when you open the card, and switching the state to another radio is proposing a change. If you take it away, they stop working like radio buttons normally work, and also there's no obvious way to unselect a proposal.* How it sits with 1541.3: 1541.47. |
| 1541.6 | (a) unchosen settings options not drawn where nobody can choose; proposals stay | — |
| 1541.7 | (a) 🥂 discharges every owed OK | Module change; full deploy. |
| 1541.8 | (a) no row; tab, outside click or Escape | — |
| 1541.9 | (b) bin only with a job; withdraw a bare glyph | *The bin shouldn't appear from nothing. If there is a card on which it will become active, it should be there in an unclickable state until e.g. a draft is started.* So: **🗑️ is drawn dark on every card where it can ever have a job, and lights once there is something to remove**; withdraw is the glyph alone. The dark bin's reason is not written out (1541.49). |
| 1541.10 | (a) drop the powers line from the settings card; amend STYLE §3 | *If you see the power lines without the rule, they should reference what they are referring to, e.g. "The Founder may amend the title at will, and refuse proposals that the membership pass to change it".* Applied to the power cards: 1541.48. |
| 1541.11 | (b) two equal blocks | Shape settled by 1541.48. |
| 1541.12 | (c) no ask label | **Superseded by 1541.46 (a)**, after the examples artifact. |
| 1541.13 | (c) keep today's drawings | ✓ settled by 1541.50. *You preferred this before it changed* is not adopted: a vote on changed wording keeps today's drawing. |
| 1541.14 | (a) *Set to / Set by* removed | — |
| 1541.15 | no choice | *Is it possible to create more space above a card when it's opened? that feels like it would love a lot of these problems - then we can see the text above, have a heading/label on the card, and still keep the current text in the same place.* → the headline ruling; the 4 px is not built. |
| 1541.16 | (c) keep the floor | The card stays at least as tall as its strip. |
| 1541.17 | no choice | *I think how it is currently is fine. The fact that it sometimes overlaps things is what makes it stand out.* The 📝 door keeps today's placement and may overlap; the zone-overlap check names it as an exception. Plain bug 6 is not a bug. |
| 1541.18 | (a) keyed re-render, its own stage after the families | — |
| 1541.19 | (a) in the page, one function | — |
| 1541.20 | (a) narrowed margin | *I think you could narrow it even more - the tabs can touch the left edge on mobile, and highlight instead of move when they're active.* Tabs flush with the glass at 390; active tab drawing: 1541.53. |
| 1541.21 | (b) the reason box always shown | — |
| 1541.22 | (a) the row's ✏️ only | — |
| 1541.23 | (a) 🥂 states the moment once | — |
| 1541.24 | (a) *Accept 🏛️* | — |
| 1541.25 | (a) the sentences, both places | — |
| 1541.26 | (a) no *last changed* line | — |
| 1541.27 | no choice | *Yours are good but let's go through each one multiple choice before STYLE is changed.* → 1541.55. |
| 1541.28 | (a) ✋ 🖼️ frozen after the close | — |

## Part 2 — findings

All (a), fix in the build, with these notes:

| # | Ed's note |
|---|---|
| 1541.33 | *I'd like to review the explanation text; For example, "One 🏛️ each" is meaningless, it should say "Each member can only make one constitutional proposal 🏛️ at a time."* → every dark-commit reason goes through the 1541.55 walk. |
| 1541.34 | *Rather than change them to past tense, after the document closes we can remove the power rules entirely - founder actions are shown in the history anyway.* Scope: 1541.52. No past-tense power clauses are built. |
| 1541.35 | *We can create more space above a card so that it does not overlap preceding text, this will give room for headings.* → the headline ruling. |
| 1541.40 | *It might make sense to make the table of contents take up the whole width on mobile, so the lifecycle marks can be seen.* → the contents drawer is full width at 390 (1541.54). |

1541.29–.32, .36–.39, .41–.43: (a), no note.

## Part 3 — the follow-up (2026-09-25, in the session)

| # | question | answer |
|---|---|---|
| 1541.44 | Where the space above comes from | **The content above slides up; the clause stays still on screen**; at the page top the clause moves down there alone. |
| 1541.45 | Labels inside a card | **On each block's first line**, left, in the eyebrow treatment; nowhere else (*What you proposed* moves from the foot; the rival's share reads *Rival · 23%*). |
| 1541.46 | What the space above holds | **(a) One label on every card**: on a place card what its first line is (*The clause as it stands*, a record's outcome in its colour), on an act or question card its ask (✋ 🖼️ 📧, 🌂, the grants, 🍾, 🥂, the power cards, 🎩 while asked, 👑). Replaces 1541.12 (c). |
| 1541.47 | The pill and the head | **The first line is the standing option and wears the pill**; the other options follow below a hairline; choosing the first line's radio again cancels a proposed change. The rule is said once. |
| 1541.48 | A power card's first line | **This power's own clause, naming its subject** (*The Founder may amend the proposal rate at will.*), wearing the pill; the other state below with *Choose this*. Label above: the card's ask. |
| 1541.49 | Does the dark bin state its reason? | **No — exempt.** The visible-reason rule (1541.33) covers commits only. |
| 1541.50 | ✓'s colour | **Accent blue when armed, as the page draws it**; SURFACE §9.1's *the one solid green on a card* is corrected. 👑's green ✒️ (1541.38) is fixed as a plain bug. |
| 1541.51 | The ten principles | Open: redrafted to match these answers (including *a control that can wake on this card is drawn from the start, dark*) and brought back to Ed before they enter SURFACE. |
| 1541.52 | What goes at the close | **The powers lines and the ✒️ 🛡️ tabs go; 👑 stays on the Founder's face, and 🍾 keeps its table of the powers kept at the start.** |
| 1541.53 | The active tab | **Grows 8 px on desktop, highlights on the phone** — two drawings, split at the 900 px line. |
| 1541.54 | The contents drawer at 390 | Full width (from 1541.40's note); no question needed. |
| 1541.55 | The STYLE walk | Open: one word at a time, multiple choice, after 1541.51 — over the words these answers keep (label vocabulary, dark-commit reasons, *Undecided when the document closed*). |
| 1541.56 | 🥂 discharging owed OKs | Noted: a module change, so a full deploy, not surface-only. |

## Part 4 — the STYLE walk (1541.55, 2026-09-25)

Ed's words, one at a time. They go into `design/copy.js` and STYLE (T3, §3's last sentence, T18's grant exception) at the fold, together with 1541.51. Examples of the drawing: https://claude.ai/artifact/LwRbgMYj1eQLt8s2qp45wP

**Labels above a card**

| # | where | the words |
|---|---|---|
| .1 | a live clause | **Current text** |
| .2 | a gap | **Current text** (first line *(no text here)*) |
| .3 | a rule (setting, motion, 👑) | **Current rule** |
| .4 | a record | **Passed** · **Rejected** · **Refused by the Founder** · **Changed by the Founder** · **Ran out of time** (.15), each `· ‹longWhen›`; *Passed* and *Changed by the Founder* in `--ok` |
| .5 | a record whose wording has since been changed | the outcome label + **· since replaced** |
| .6 | the deadlock | **Current text** (the *still standing* clause goes) |
| .7 | a multi-place proposal | **Current text · 2 of 3** with ↑ ↓ |
| .15 | a text card on a closed document | **Final text** |
| .16 | a rule card on a closed document | **Rule at the close** (Ed: *the rules do not stand after the end of the document since it is now over*) |

**Labels on blocks**

| # | block | the words |
|---|---|---|
| .8 | somebody else's proposal, rival or motion | **Proposed** — and where signed, **Proposed by ‹name›** (.10, Ed's own suggestion: *Perhaps other proposals could be "Proposed by [name]", if it's not anonymous*); the face stays on the rationale's disc; after a reveal the label follows |
| .9 | your own | **Proposed by you** |
| .11 | what a change replaced | **Previous text** · **Previous rule** |
| .12 | a losing wording on a record | the live label + share: **Proposed · 23%**, **Proposed by Ada Kline · 23%**, **Proposed by you · 23%** |
| .13 | a failed motion's wording | the live label (**Proposed** / **Proposed by ‹name›**); the outcome is said once, above the card |
| .14 | a proposal the close cut off | **Proposed by ‹name› · Ran out of time** (Ed's words) |

**Why a commit is dark** — the visible note (1541.33) is narrower than the grammar had it:

| # | reason | ruling |
|---|---|---|
| .17 | nothing chosen yet | **No note** (Ed: *it's the most obvious action on the card*) |
| .18 | nothing typed yet | **No note** |
| .19 | the grant not yet accepted | **The commit is not drawn at all** (Ed: *before an action is accepted we shouldn't show the button at all*) — overrides Y19's dark ✒️ and the grammar's `accept:<power>` |
| .20 | no ✏️ left | **✏️ 12:04**, today's countdown, kept |
| .21 | your 🏛️ is out on another motion | **You can only make one constitutional proposal 🏛️ at a time.** |
| .22 | 🍾 waiting on answers | **Waiting for x members to answer questions.** — and Ed wants 🍾 reworked so the Founder can begin before everyone has answered: filed as **Q1542** |
| — | the dark 🗑️ | no note (1541.49) |

**Labels that ask**

| # | card | the words |
|---|---|---|
| .23 | the grants | the act: **Accept Founder Actions** · **Accept the Founder Veto** · **Accept Constitutional Proposals** |
| .24 | 💡 ⚖️ | **like grants**: **Accept Proposals** · **Accept Voting**, the button **Accept ✏️** / **Accept ⚖️** in place of OK — they already gate the power (`mayPropose`/`mayJudge` require the acknowledgement, session-view.html:5373–5374) |
| .25 | 🥂 | **Add your closing comment** (so the input's own *Your closing comment* label is not drawn) |
| .26 | 👑 | **Accept This Change?** |
| — | ✋ 🖼️ 📧 🌂 🎩 power cards | today's titles, unchanged (*Choose Your Name*, *Leave the Membership*, *Is the Founder a Member?*, *Can the Founder Make Amendments at Will?*) |
| — | 🍾 | held with Q1542 |

**How labels are drawn** (.27): **all capitals, one drawing, a step larger than the eyebrow** — `--t-cap` (0.79rem) rather than `--t-micro`, 700, upper case, `--muted`; a record's outcome in its colour. The label slot's height grows with it.

## Part 5 — the ten principles, as ruled (1541.51, Ed 2026-09-25: *take all ten as drafted*)

These replace grammar.md §1. They enter SURFACE's opening as each build stage makes them true (a rule the tree does not hold is not written as held), each naming its check.

1. **A card opens in place of the line it is about**; that line is its first line, word for word, still where it was — except a record (the wording it recorded), a multi-place proposal (the place it is showing), a gap (*(no text here)*) and 🪶 at the birth (the title box). On a rule card the first line is the standing rule and wears the pill; on a power card it is that power's own clause, naming its subject.
2. **Opening a card moves nothing you are looking at.** The card makes room for its label by sliding the content above it upward; the first line and the pressed tab stay put on screen at both widths; what lies below is pushed down; only at the page's top does the first line move down.
3. **Every fact has one home**: what stands is the first line; who chose it, the pill on it; how a record ended, the label above; who wrote a signed proposal, its label; the price, on the commit.
4. **A card offers only what this reader can do now.** Closed: nothing but 🥂, whose signature also answers every OK owed; what the close cut off stays readable (*Ran out of time*); the powers lines and ✒️ 🛡️ tabs go (👑 and 🍾's table stay); ✋ 🖼️ frozen. A commit for a power not yet accepted is not drawn.
5. **A control that can come alive on this card is there from the start, dark, and lights when it has a job**; one that can never have a job here is not drawn. A dark commit explains itself in words only where the reason is not on the card (the ✏️ countdown, 🏛️ in use, 🍾 waiting); no note for *choose*, *type* or the bin.
6. **No empty frames**: an empty part is not drawn and takes its hairline with it; never two hairlines facing. Stated exceptions: the reason box always shows on a card that can take a change; a card is never shorter than its tab strip.
7. **Each drawing means one thing**: the pill marks what stands; a radio is a choice you can make now; a button is an act; ✓ lights accent blue when armed; green means *decided* (marks, the *Passed* and *Changed by the Founder* labels, the passed highlight, a recorded ✓). A block nobody may choose has no radio.
8. **One commit row**: 🗑️ at the left, dark until there is something of yours to remove (a withdraw is the bare glyph); a note in the middle when there is one; at most two commits at the right. A card that asks nothing has no row — tab, outside click or Escape closes it; OK only while owed; *Accept* for a power (grants, 💡, ⚖️).
9. **The same thing is drawn the same way everywhere** — band and charter, live and record, both widths. Every card has one label above its first line, all capitals at `--t-cap`: what the line is, or what the card asks; every block's label is its first line. Stated exception: the active tab grows 8 px at 1600 and highlights at 390.
10. **Nothing you are in the middle of is taken by the page updating** — caret, press, drag, half-typed value. *Not built* until the re-render stage.

The floating 📝 door is not a principle: it is a named exception in `zone-overlap` (1541.17, *the fact that it sometimes overlaps things is what makes it stand out*).

## Part 6 — BUILD.md §6's ten points, ruled (Ed 2026-09-25, one at a time)

| # | Point | Ruling |
|---|---|---|
| 6.1 | 👑's label | **Ask while owed, then the rule**: *Accept This Change?* while the seat's OK is owed; *Current rule* once pressed or never owed — `labelOf`'s ask-then-noun pattern. |
| 6.2 | Label size | **Every label at `--t-cap`**, the card's and each block's alike (principle 9 read literally; 1541.45's *eyebrow treatment* means the drawing, not the step). |
| 6.3 | The two homeless lines | **Keep the record's participation line** (*7 of 20 weighed in · quorum was 7*) as its one fact line; **the power card's holder line goes** — the pill on its clause says it. |
| 6.4 | *At the page's top* | **Wherever room runs out**: the page scrolls as far as it can and the first line moves down only by the shortfall, wherever the label would land above the visible area or under the topbar. |
| 6.5 | Close and switch | **The same rule both ways**: closing and switching take the room back above, the clause still on screen. |
| 6.6 | Closed document's powers | **Both go**: the powers sentence leaves the Rules paragraphs as well as the cards and tabs. |
| 6.7 | The subject-naming clause | **Card only**: the Rules paragraph keeps *this*. |
| 6.8 | 🍾 while Q1542 is open | **Convert 🍾 in stage 2** with today's title as its label; the Q1542 session reworks it again. (Reverses BUILD.md's assumption.) |
| 6.9 | Stage 1's second pilot | **A filed sealed record on a clause**, as proposed. |
| 6.10 | A cut-off proposal's label | **The live label plus *· Ran out of time***: *Proposed by ‹name› · Ran out of time* signed, *Proposed · Ran out of time* anonymous. |
