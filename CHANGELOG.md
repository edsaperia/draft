# Changelog

**[docs.vote](https://docs.vote)** is a place for a group to write a document together. Anybody may propose a change; rival wordings of the same passage race each other; the membership votes on them in blind pairs (*which of these two wordings?*, no names attached, no scores shown), and the wording that comes out on top is adopted once enough of the membership has voted. The document's own rules are decided the same way, inside the document.

docs.vote has been live, in alpha, since 2026-08-20. This file runs newest first, back to the project's first commit on 2026-08-13. The mechanism's full rules are in [`SPEC.md`](SPEC.md) (v0.146 today), and what the page shows a member is in [`SURFACE.md`](SURFACE.md).

---

## 2026-10-02: your email card shows the address you have

### Fixed
- **📧 now shows your current address as the chosen option.** It stands under your name and picture with a pressed *Chosen*, and a new address goes in the field below, under its own *Choose this*. Typing a new address chooses it. Pressing *Chosen* again, or 🗑️, puts the card back as it was. 🗑️ used to restore the text but leave your address reading as unverified.

### For contributors
- **Surface-only.** `emailStands`, `emailStandsHtml` and `BODY_EMAIL` (`design/session-view.html`); SURFACE §9's identity row. Guard: `scripts/repro/email-card-standing.mjs`, in the sprint tier.

## 2026-10-02: live updates measured before they are built

### For contributors
- **Nothing a member sees changes.** Scaling Stage 4's spike (issue #159) measured a Server-Sent Events stream on a local server and found it fit to build on. A stream stayed open past Node's request timeout. Writes arrived within 5 ms with no buffering. Each stream cost one file descriptor and 10–20 KB, with no event-loop lag at 1,000 streams. Stage 4 has to end its streams at shutdown and spread its reconnects. The spike's route was removed unshipped by Ed's ruling (no Render measurement); `scripts/spike-sse.mjs` stays for measuring Stage 4's real stream. Findings: `design/spec-pass/plan-scaling.md` *Stage notes*.

## 2026-10-02: the questions page's contract, kept by code

### For contributors
- **Nothing a member sees changes; a full deploy of the same build.** Sessions on this repo can load the `page-contract` mod (`.claude/skills/page-contract/`, a copy of dev-ops' kept identical to it; loaded where the cloud environment's `CLAUDE_CODE_PLUGIN_DIRS` names it): a write to Ed's questions page that breaks its contract is refused with the reasons, the coordinator's `lastActive` is stamped after working turns, and answers left without `handledAt` are named. `eslint.config.mjs` skips the type files Claude Code writes beside the mod when it loads it.

## 2026-10-02: the task list keeps a clause's order

### Fixed
- **Your task list now lists one clause's entries in the same order as the tabs beside that clause.** With a card open, a decision you had not yet acknowledged could sit above the open entry in the list while its tab sat below it in the margin; both now read the same way.

### For contributors
- **Surface-only.** `layoutQueue` ranks a clause's entries by the gutter's own `stackKey`, and a flow entry at a pinned entry's clause steps to the side the strip puts it on (`freeFor`, session.js); SURFACE M6 names the open entry's case. Guarded by `scripts/repro/rail-stack-order.mjs`, in the sprint tier's `sprint-pages`.

## 2026-10-02: the demo's speakers reword rather than repeat

### Fixed
- **A speaker in the demo document can no longer add a second wording of a paragraph beside the first.** When one of the demo's speakers meant to reword an abstract, it sometimes sent the new wording as an extra paragraph, and once that passed the session read twice, old and new together. Such a proposal is now set aside before it is sent, and the speakers are shown plainly how to reword a line in place.

### For contributors
- **A server change, so a full deploy.** `proposalHunks` (`demo-model.ts`) drops an insertion that rewords the line beside it — `wordOverlap`, the Dice coefficient over content words, at `REWRITE_OVERLAP` 0.35, a heading weighed only against a heading of the same time; the bot's log reads *dropped a proposal: a rewrite sent as an insertion*. The propose prompt gains a worked `start: k, end: k+1` example. Tests in `demo-model.test.ts`.

## 2026-10-02: headings sized by the levels a document uses

### Changed
- **A document's headings are larger, and take their size from the levels it uses.** The smallest kind of heading in the text is drawn in bold at a clear step over the body, the next kind up larger again with a rule above it, and a third kind larger still; the document's title grows to stay above them. A document whose headings start at `##` now reads the way one starting at `#` did, and no heading is ever drawn barely larger than the text under it. The Rules keep their own headings as they were.

### For contributors
- **Surface-only.** `CARDS.setHeadLevels` and `CARDS.rankCls` (`design/cards.js`) give every Text heading a `rank1`–`rank3` class beside its `lvlN`, in the column, a card's head, a lane and edit mode; `--h-part` joins the heading ladder in `design/system.css`. Guard: `scripts/repro/heading-rank.mjs`, in the sprint tier.

## 2026-10-02: a clause's decisions read top down from the current text

### Changed
- **A card holding several decisions on one clause now starts with the current text**, labelled *Current text*, shown once. The newest decision is that text, so it is no longer drawn a second time below it, and the line *Marked against the text before them* is gone. No earlier decision in the card says *since replaced* any more: everything below the top is an earlier version.

### Fixed
- **A decision that added a new clause now says it replaced nothing.** Its *Previous text* reads *(no text here)* instead of *This clause would be removed*, and the added wording is marked as new throughout.

### For contributors
- **Surface-only.** `foldPresent` and the sealed record (`session.js`); `foldHead` and `foldSince` retired from `copy.js`. Guarded by `scripts/repro/review-walk.mjs`.

## 2026-10-02: the waiting entries show their progress

### Changed
- **An entry you have voted on shows how far the others have got.** In your list of tasks, a ⏳ entry, a proposal or question you have voted on that the others are still deciding, now fills with grey as more members vote, so you can tell one that is nearly decided from one that has barely begun. When a vote lands on it, you can see the bar move.

### For contributors
- **Surface-only.** A ⏳ rail entry keeps its white slip and paints its fill in the deciding grey (`washAttrs`, session.js); its cable stays white. `card-audit` gains P35 `wait-fill`, held on every card.

## 2026-10-02: a card stays open while it changes

### Changed
- **A card you have open stays open when it changes.** When a proposal you are looking at passes or is rejected, the card becomes its record where it stands, and its entry in the list on the right stays in place and changes its colour and mark. The same goes for a proposal held for the Founder, a rule change that is decided, an application that is decided and any other card that changes while you read it; where nothing takes its place, the card says it is no longer outstanding until you close it.

### For contributors
- **Surface-only.** An open card is kept by its lineage (`lineageOf` in `design/card-state.js`) and morphs in place (`CARD_SHELL.morph`); `npm run morph-walk` joins the sprint tier.

## 2026-10-01, night: faces for the demo's speakers

### Changed
- **The speakers in the demo document wear faces.** Each of the conference's speakers on the demo's committee now has an emoji beside their name, chosen to suit them: a scroll for the archivist, a microphone for the broadcaster, a pineapple for pineapple's defender. If you try the demo yourself, you still start without one, and you can pick your own.

### For contributors
- **A server and preset change, so a full deploy.** A `@cast` line may open with one emoji before the bold name (`design/DEMO.md` §3.1); `buildDemo` sets it as the bot's picture, P9 refuses a face that is not one emoji, the page's furniture, already worn, or on the founder's line, and `demo-check`'s P11 checks every bot wears its own.

## 2026-10-01, night: a proposal is only what it changes

### Changed
- **A proposal is cut down to the lines it actually changes.** If you rewrite a passage and leave some lines as they were, the proposal no longer covers the lines you left alone, so it only competes with proposals on the lines you changed. Where unchanged lines sit in the middle, it becomes a proposal in two places. A proposal that changes nothing is turned away, and costs you no ✏️.

### For contributors
- **An engine change, so a full deploy.** `minimalHunks` (engine-core `text/minimal.ts`) normalises every text patch at the three doors — proposing, the ✒️ decree, the re-make of a stranded patch — after the attestation is checked as sent; replay is untouched. The demo's J1 swap now arrives as two sites.
- **SPEC v0.146** (§2.1, R-147).

## 2026-10-01, late: one card shell

### Changed
- **The ✔✔✔ mark stands in one column**, the three ticks one above another.
- **A stack of decisions on one clause reads from the current text down**: the clause as it stands, then each change, newest first, then the text it started from at the bottom, each wording shown once.
- **Other members' reading marks move more slowly**, easing in and out as they go.
- **The 📭 and 🥾 news cards are drawn like every other card.**

### For contributors
- **Surface-only.** The old card builders are gone: every card is on the one shell (`design/card-shell.js`), and a card whose subject leaves the page while it is open becomes the shell's read-only card.
- **card-audit is strict on every kind**, in the push tier and the sprint tier: its driven pass presses every live control on every card, and every fact on a card carries its role.

## 2026-10-01, evening: votes on the record

### New
- **A document can show how each member voted as soon as each proposal is decided.** 👁️ *Judgments* has a new choice between *never* and *at the end*: once a proposal is passed or rejected, its record shows who voted on it, between which two wordings and which they preferred. Nothing is shown about a proposal still being voted on, and a vote cast while the document showed none stays hidden.
- **Whoever wrote a proposal counts as having voted for it** on that record, listed like any other vote.

### Changed
- **Where a document shows votes at the end, they now appear on its records when it closes.** Until now that choice showed nothing.

### For contributors
- **A server change, so a full deploy.** Sealed records carry `revealed` for members only, read under the 👁️ choice that stood when the record sealed; never in the stranger's or the applicant's view, never logged. The page draws it after redesign stage 10 (SPEC §13's ledger).
- **SPEC v0.145** (§3.5a, R-146); QUESTIONS.md claims 1574; one setup-probe freeze, read.

## 2026-10-01, later: the room moves

### New
- **You can see where the other members are reading.** Beside the clause each of them is reading, a small face, moving down the page as they read and lined up with any others reading the same clause. Hold the pointer on one to see whose it is. Where the document keeps proposals anonymous, a pair of eyes stands in for each face, and nobody's name is attached. Your own face is never there, and the faces show on a computer's screen, not yet on a phone.

### Changed
- **When somebody votes on a proposal in your list, its bar sweeps to show it**: it runs to the end, starts again from empty and climbs to where it now stands. Several votes landing together make one sweep.
- **The mark beside an entry lands with a small stamp when it changes**: a ✔ when a proposal passes, a ✖ when it fails. A rule change's entry sweeps and stamps the same way.

### For contributors
- **A server change, so a full deploy.** The member view carries `voteTick` on every live race, the time of the latest vote on it and never a count, and `reading`, where every other member is reading, from a table the host keeps in memory alone (`packages/server/src/presence.ts`): one query field on the poll, a 30-second lifetime, a per-boot token in place of a member's id under 👤's anonymous rungs. Neither reaches the stranger's or the applicant's view, and neither is logged.
- **`sweep-walk` and `presence-walk` join the sprint tier's `sprint-pages`**, on its own dev server.
- **👀 joins the drawn glyphs**, mirrored to face into the document, and so is no longer offered as a face. The session fixture gains two readers; one session-probe freeze, read.
- **SPEC v0.144**: §3.5 says a member is told when a vote lands on a race in their list, never how many or how (R-144); §3.5a says where a member is reading is shown to the membership (R-145). SURFACE gains M24, M25 and the event row E43.

## 2026-10-01: nothing in your hand is taken by the page updating

### Changed
- **What you are in the middle of stays where it is when the page updates.** A half-typed date or number, an open list of choices, a reason you are writing and a button you are holding are the same control after an update, holding what you put in them.
- **Opening a card at the top of the page on a phone no longer nudges the page a moment later.**

### Fixed
- **Writing the reason for a proposed rule change no longer loses your place** when somebody else acts in the room.
- **The emoji list on your picture card keeps its place** when the page updates.

### For contributors
- **Surface-only.** The page renders by patching (`design/patch.js`): what an update draws is walked onto the nodes already there by key, and a node holding something of the reader's in flight is never replaced. `?render=replace` restores the old wholesale replacement for comparison.
- **`render-hold-walk` joins the push tier's `repros-b`**, with `focus-steal --gap` beside it: every in-flight kind on an open card under a forced poll and a room event, the node the same node.
- **The deferral flags are retired** where the walk proves the patch covers them: `dateInFlight` and the caret keeper go; the ✒️ flight and the ✏️ hold no longer make the poll wait (a deploy's reload still does). The poll still waits for the assembly, a travel and the task sheet's drag.
- **`html { overflow-anchor: none }`**: the page makes every scroll it makes by measurement, and kept nodes gave the browser's scroll anchoring something to move a frame later. The setup-probe was re-frozen twice, each diff read.

## 2026-09-30, night: two plans for a livelier document

### For contributors
- **Documents only, nothing a member sees changes yet.** Two plans ruled by Ed this evening, each in MOBILE.md's shape: `design/SWEEP.md`, the queue card wash sweep transition (Q1571) — a vote landing on a race in your rail sweeps its entry's wash from where it stands to full, resets and climbs to the new value, always left to right; a decision runs to full (✔) or to full and empty (✖) and stamps the mark — and `design/PRESENCE.md`, where each member is reading (Q1570, unshelving Q314) — faces on the document's left edge beside the clause each member's reading line rests on, named wherever proposals may be signed, 👀 otherwise, on the 4 s poll and never in the log. Every call in both is ruled; the builder brief is issue #134 and starts when redesign stage 9 merges.
- **QUESTIONS.md claims 1570, 1571 and 1572** (stage 9's calls, 1572.1 ruled); the next free number is 1573. CLAUDE.md's Documents table gains the two plans' rows.

## 2026-09-30, late: a document address with a slash on the end

### Fixed
- **A document address typed or pasted with a slash on the end** (`docs.vote/d/demo/`) **now opens the document.** It used to show an unstyled page reading *Untitled*, because the page's own files were looked for under the slash. The address is redirected to the one without it, and anything after a `?` is kept.

### For contributors
- **A server change, so a full deploy**: `GET /d/:slug/` answers 302 to `/d/:slug` with the query kept (`routes-surface.ts`; the demo store's test asserts it).
- **The *Final text* label is retired** (1569.4 (c)): a closed document's text is the document itself, and 📝 opens no card there; Part 4 .15, BUILD.md's P29 and QUESTIONS.md's 1568 (7) say so.

## 2026-09-30, evening: edit mode, the proposal row and the phone's drawers

### New
- **While you write in edit mode, the card for your change says what it is**: *Current text* over the clause, *Your proposal* over your words.

### Changed
- **One ✏️ while you write.** In edit mode the card's only button is its own 🗑️; you propose with the ✏️ floating at the foot of the window. A change started with *✏️ propose edit*, outside edit mode, keeps its ✏️ on the card, because no floating row stands there.
- **The floating buttons at the foot of the window** — 🗑️, ✏️, ✒️, ❄️ and ✓ — are now as large as the 📝 button, and sit over the text as it does.

### Fixed
- **On a phone, the contents drawer opens the full width of the screen**, and every heading's marks can be seen inside it.

### For contributors
- **Surface-only.** The editing card is built on the one card shell, and card-audit holds it strictly (`GRAMMAR_KINDS`).
- **card-audit's `STAGE` is 8, so P30 is strict**: an overlay is read by what it paints, against every text line and enabled control; the 📝 door, the proposal row and the patch row are its named exceptions.
- **The rows' circles take the door's 4.5rem**, and card-audit's D1 and journey's *door* step hold the door and the row's ✏️ at one size.
- **`drawer-walk` asserts the contents drawer is full width at 390** and every heading's marks sit inside it.

## 2026-09-29, evening: records, and the closed document

### New
- **Every record says how it ended and when**, above its first line: *Passed*, *Rejected*, *Refused by the Founder*, or *Ran out of time* where the document closed before anything was decided.
- **When a clause has several records you have not seen, they are one card.** Its tab is a stack of three ✔s, the card is labelled with how many decisions it holds, and it shows every change in full, oldest first. Each record keeps its own tab too, and its OK answers that record alone.
- **The card you are reading becomes its record** when its vote is decided, in the same place, whether the wording passed, failed or was your own. You watched it happen, so you are not asked to OK it again.

### Changed
- **A closed document asks nothing but your signature.** There is nothing else to press, no sentence about the Founder's powers and no ✒️ 🛡️ tabs; 🥂 asks you to *Add your closing comment*, and its OK signs.
- **Proposals the clock cut off read *Proposed · Ran out of time*.**
- **Signing the document answers everything else you were owed**, so nothing is left waiting in your margin afterwards.

### Fixed
- **A wording the membership stopped early no longer says the Founder refused it**; it reads *Rejected*.
- **An application still open when the document closed** no longer offers *Prefer this*.
- **Your margin clears the moment you sign**, not at the next refresh.
- **The ✏️ countdown stops** once the document is closed.

### For contributors
- **A full deploy, not surface-only**: signing now clears every OK a member is owed. It is a change to how the existing sign-off event is read, with no new event, so every existing log replays unchanged (`close-owed.test.ts`).
- **The records, the clause fold, the Founder's amendment news, the backlog and 🥂 are built on the one card shell**, and card-audit holds every card kind strictly at both widths, the closed document included.
- **Two new walks join the sprint tier**: `closed-press-walk` opens and presses everything on a closed document as the Founder, a member and a visitor; `record-travel` checks the card you are reading becoming its record.

## 2026-09-29, afternoon: a word and its glyph keep their space

### Fixed
- **A button no longer runs a word into its glyph**: *Accept 🏛️* read *Accept🏛️* on the cards that hand you a power. Wherever a word stands beside a glyph, the space between them now stays.

### For contributors
- **card-audit's P34 `glyph-space`** measures the space between a word and a drawn glyph on every card and its rail entry, in the fast pass at both widths; STYLE.md T50 is the rule.

## 2026-09-29: a Founder outside the membership

### Fixed
- **A Founder who is not a member is no longer asked to accept Constitutional Proposals** once the document begins. That power arrives with membership, and they hold none.

## 2026-09-28, evening: your name, the doors and applications, in the new shape

### Changed
- **Your name, picture and email open with their question on top** — *Choose Your Name*, *Choose Your Picture*, *Enter Your Email* — and your own row from the Members list as the first line, so the card opens exactly where your row was. After the document closes they stay as they are, with nothing to press.
- **Inviting, removing and leaving open over the list they belong to**: *Invite a Member* over the applications, *Remove a Member* over the people proposed for removal, *Leave the Membership* over the people who have left.
- **An empty list says so in a sentence**, in the document and on the card alike: *There are no applications at the moment.*, *Nobody is proposed for removal.*, *Nobody has left.*
- **The 🗑️ and the send stay dark until you type an address or choose somebody**, and light up as you type, without the card redrawing under you.
- **A proposal to invite or remove somebody** opens over the same list, labelled with the door it came through: the membership as it is, then the change marked *Proposed* with its reason, then Indifferent. Your own proposal reads *Proposed by you*, with the 🗑️ alone to withdraw it.
- **When the membership lets somebody in and the Founder can refuse**, the Founder's card asks *Accept This Change?*, and says the membership stays as it is until they answer.
- **An application shows the applicant's own words** as the reason under the change.
- **The cards for applying and logging in** carry their title on top and what they ask as the first line.

### Fixed
- **If the membership turned down your proposal to invite or remove somebody**, the card telling you so could not be opened. It now stands with the invitation or removal tabs, and opens from its entry.
- **Typing an address to invite somebody no longer loses your place** when the page refreshes.

### For contributors
- **The identity cards, the doors, proposals about a person, applications, and the applicant's and stranger's cards are built on the one card shell**, and card-audit holds them strictly. The applicant's cards, which only a live document can show, are checked by applicants-walk.

## 2026-09-28, afternoon: proposals to change a rule, in the new shape

### Changed
- **A proposal to change a rule opens as the rule's own card**: *Current rule* on top, the rule as it stands marked with who chose it, with *Prefer this* beside it, and the change below labelled *Proposed*. If the proposal is yours, it reads *Proposed by you*, with no choices to make and the 🗑️ alone to withdraw it.
- **The ✓ on a proposal to change a rule turns blue when you have chosen.**
- **When the membership passes a change the Founder can refuse, the Founder's card asks *Accept This Change?***, with one sentence saying the rule stands until they answer, and 🛡️ and ✒️ as the two answers. Everybody else sees the rule, the change, and that it is waiting on the Founder.
- **The same question about the text leads its clause's pile of tabs**, so pressing the pile opens the question rather than a vote on the clause.
- **The record of a change to a rule is labelled by how it ended and when**: *Passed*, *Changed by the Founder*, *Rejected* or *Refused by the Founder*, with *since replaced* where the rule has changed again since. The rule that passed is the first line, with *Previous rule* beneath it; a proposal that failed keeps its own label.
- **The Founder's reason for a change shows their picture and no name line**, since the card already says it was the Founder.

### For contributors
- **Proposals to change a rule, the Founder's questions on them, and their records are built on the one card shell**, and card-audit holds them strictly. Its fast pass now also walks the settled rules and a member's and a stranger's seats at every push (Q1547, Ed 1566.7).

## 2026-09-28: the glossary in two files

### For contributors
- **The names of the engine's and the tooling's parts now live in `design/GLOSSARY.md`**, moved out of `CLAUDE.md`, which keeps the names of what a member sees. Nothing on docs.vote changes.

## 2026-09-28, midday: every deploy tags itself

### For contributors
- **CI now tags every deploy it has verified live** (`deploy-YYYY-MM-DD`, then `b`, `c`, … on the same day), so nobody pushes a deploy tag by hand any more. Nothing on docs.vote changes.

## 2026-09-27, evening: the cards you vote on, in the new shape

### Changed
- **Every card you vote on opens without moving the text you were reading.** It makes room above the clause, so the clause and the tab you pressed stay exactly where they were, and closing it gives the room back.
- **The clause at the top of a card is labelled *Current text*,** and each proposal is labelled on its first line: *Proposed*, *Proposed by* and the name where one is attached, or *Proposed by you*. The same goes for a proposal on a gap between two clauses, a proposal in several places (*Current text · 1 of 3*, with ↑ ↓ beside it), a stuck race and your own proposals.
- **The ✓ turns blue when you have chosen**, and green once your vote is in.
- **On a stuck race, the 🗑️ stays dark until you start writing**, and your own proposal's withdraw is the 🗑️ alone.
- **The card that asks which of two questions matters more** is labelled the way its task is, and each question is labelled by its own name.
- **On a phone, the tabs beside the text stand at the very edge of the screen**, so the text and every card are wider, and the tab of the card you have open is highlighted where it stands rather than growing.

### Fixed
- **On a phone, pressing a tab low in a clause's pile no longer makes it jump** when another card at that clause is already open.
- **A card on a heading no longer shifts the heading as it opens.**

## 2026-09-27: the rest of the rules in the new shape

### Changed
- **Admissions, Applications and the Founder's membership open on their rule**, like every other rule: *Current rule* on top, the rule itself as the first line marked with who chose it, and any other choices below a thin line. While the Founder has not yet said whether they are a member, the card asks *Is the Founder a Member?* instead.
- **Once the document has begun, the Founder's membership is simply shown**: the answer and who chose it, with no greyed-out choices and nothing to press.
- **A Founder power's card states its own rule in full, naming what it is about**, such as *The Founder may amend the proposal rate at will.*, under the card's question. The Founder sees the other choice below it; everybody else sees the rule alone, with nothing to press.
- **Proposing a change to a rule happens on the rule's own card**: the rule on top with who chose it, your choices below, and the box for your reason. Choosing the current rule again cancels the change you had started, and the card stays open.
- **A number or date you propose starts empty**, rather than filled in with the value that already stands, so nothing on the card looks chosen before you choose it.
- **Until you have accepted the power a change needs, a rule's card says which one to accept**, rather than offering a button that cannot work yet.
- **Admissions is called *the admissions rule*** wherever a Founder power names it.
- **A rule no longer carries a line saying how it last changed.** That history is behind the rule's tab, in the record of the change.

### Fixed
- **A card that asks nothing of you no longer offers an OK that only closes it**: the Founder's membership once the document has begun, and a Founder power read by anybody but the Founder, now close from their tab, a click outside or Escape.

## 2026-09-26, evening: every rule said once

### Changed
- **A rule's card opens on the rule itself**, under *Current rule*, marked with who chose it; any other choices sit below a thin line, and choosing the current rule again cancels a change you had started.
- **Who chose a rule is said once**, so a card no longer names two different choosers, and no card prints *Set to undefined*.
- **When the Founder changes a rule, members see the new rule, the Founder's reason and the previous rule**, in the same order as a change to the text.
- **The box for the reason behind a change is always on the card**, drawn like a proposal's reason.
- **After the document is saved, its title and link settle in quietly** once the Founder accepts Founder Actions, rather than standing there with nothing to press.
- **Closing a card near the top of the page no longer nudges the page.**

### For contributors
- **When one group of the slower checks fails on a branch, the fix can re-run that group alone** rather than the whole twenty minutes, by naming it when the run is started.
- **The README names both packages the server needs at run time.**
- **Mentioning `@claude` in an issue or pull request starts an automated builder** on GitHub's machines, following the shared conventions at [edsaperia/dev-ops](https://github.com/edsaperia/dev-ops); only people who can already write to the repository can start one.

## 2026-09-26, later afternoon: who is in, who is asking, who has left

### Changed
- **The list of members reads in plain groups.** Somebody invited who has not yet followed their link is listed with the members, tagged *invited*. Every vote still running on letting somebody in, whether a member proposed them or they applied, is listed under **Applications for Membership**.
- **Members who have left are listed under Alumni**, each with their picture and the day they left, in place of a sentence at the foot of the list. Leaving the membership now starts from the Alumni heading.
- **A tag beside a name only says what its heading does not**, and no tag looks as though it can be pressed.
- **A new power's task reads the same words as its card**, such as *Accept Proposals*, until you accept it.
- **The Begin card says in one short line why it cannot start yet**, beside its button, and has no 🗑️.

## 2026-09-26, afternoon: one way to separate, one way to choose

### Changed
- **A decision's record lists its wordings the way every other card lists its choices**, separated by a thin line rather than each in its own box.
- **The rule that stands on a card and the options you can choose are drawn as the same button**, the same size and shape wherever they appear.

### For contributors
- **Checks are split into two tiers.** Every push runs the checks that have caught real problems, and reports in about nine minutes rather than fourteen. The rest run after any push that merges a new feature or fix, off the path of the deploy.

## 2026-09-26, midday: more cards in the new shape

### Changed
- **The cards that hand you a power, the Proposals and Voting cards, the Begin card, the news of powers laid down, and the notice that a proposal is on hold now take the new shape**: one label on top, the rule itself as the first line, and one button saying what it does, such as *Accept Proposals*. Once accepted, the card reads *Current rule*.
- **On a phone, a card that asks nothing of you closes when you tap outside it**, without pressing anything beneath.
- **The Begin card's 🗑️ stays dark until you change a row of its table**, and lights when there is something to put back.

## 2026-09-26, early morning: the first cards in a new shape

### Changed
- **A decision's record opens without moving the text you were reading.** The card makes room above the clause, so the clause and its tab stay exactly where they were, and closing it gives the room back the same way.
- **Every record carries one label on top** saying how it ended and when, such as *REJECTED · MONDAY, 21 SEPTEMBER, 17:40*, and each proposal in it is labelled the same way. A record of a clause that has changed since shows the wording it decided, marked *since replaced*.
- **A visitor reading a document's rules sees each rule with who chose it**, on the same kind of card.
- These are the first cards in a new, consistent shape; the rest follow over the coming weeks.

## 2026-09-26, night: the phone's task sheet shows what's next

### Changed
- **On a phone, the lowered task sheet shows your most urgent task as its own card**, in its colour and with its progress filled in, rather than a line of text. Tap it to open it; tap *+n more*, swipe up or press ≣ to see the rest.

## 2026-09-26, early: a faster restart

### Changed
- **docs.vote comes back faster after an update.** Reloading every document when the service restarts now takes about a third of the time it did, so the pause while a new version goes live is shorter. Nothing in any document changes.

## 2026-09-26: catching up on a busy document

### Changed
- **Several decisions on one clause arrive as one.** When you come back to a document where a clause changed more than once, its task list shows one entry, *3 new decisions*, and one card showing the clause now against how it was before them, with one OK for all. Each decision can still be opened from its own tab. Decisions on your own proposals keep their own entry.
- **OK takes you to the next thing to read.** After you press OK, the next decision waiting for you opens, working down the document from the rules at the top and starting again from the top at the end. Enter presses OK. Accepting a new power always takes a click of its own.

## 2026-09-25, night: rival wordings face each other

### Changed
- **When several wordings compete for the same clause, you are now asked to choose between them directly**, not only between each one and the current text. A leading wording passes once enough members have compared it with each rival still in the running, so the one that passes is the one the members preferred to all the others.
- **A near-copy of a losing wording can no longer carry it past the current text.** A wording passes only if no other wording beat it head to head.
- **The progress bar on a contested clause counts every vote still needed**, including those between rivals, so it no longer reads full while a proposal is still waiting.
- **A record can say how many members preferred the current text** to a proposal that lost, and whether a proposal that passed as the document closed had been compared with all of its rivals.

## 2026-09-25, evening: clearer for screen readers

### Fixed
- **A screen reader hears the document's title once, as the page's main heading.** While a document was being set up, the title was announced as a main heading twice.
- **The two side columns are named for a screen reader** as *Contents* and *What needs you*, the same words the phone's buttons for them use.

## 2026-09-25: a task list for phones

### New
- **On a phone, your tasks sit in a sheet at the bottom of the screen.** Its edge peeks up with the most urgent task's title and how many more are waiting; tap it, swipe it up or press ≣ to raise it, and it tucks away while you read down the document.

### Changed
- **Proposing and voting arrive once you have activated your membership.** A new member meets 🏛️ first, and 💡 Proposals and ⚖️ Voting follow after, so nobody is asked to vote before they are a full member.
- **The title card is tidier.** Its open tab is white like the others that need nothing from you, the page's edge no longer moves when the card opens, and the card never shows two lines with nothing between them.

## 2026-09-24, night: calmer margins and bigger headings

### Changed
- **The document's headings are larger.** Every level is one step bigger, so even the smallest heading now stands above the text beneath it.
- **Tabs and entries that need nothing from you are white** rather than grey, in the margin, in the list of tasks and on the lines that join them, so the ones with a colour stand out.
- **On a narrower desktop window the tabs keep their space** from the page's edge, as they do on a wide one.

## 2026-09-24, late evening: the demo, tuned

### Changed
- **The 📝 button sits on the right edge of the page** rather than in the window's corner, and the 📝 on it is twice the size.
- **The red that says something needs your attention is lighter.**
- **In the demo document, a proposal needs six members' votes to pass** rather than three, so most proposals are still open when you arrive and your vote can count.

## 2026-09-24, evening: a demo anyone can try

### New
- **[docs.vote/d/demo](https://docs.vote/d/demo), a demonstration document.** It holds the agenda of *PizzaCon 2027*, a fictional three-day conference, with proposals already racing on its sessions. Anyone who opens it can tap **👋 Try It** to join as a member with a made-up name and start voting and proposing at once; a phone keeps its seat when it comes back, and an idle seat ends after half an hour. The document is reset from time to time, and nothing written there is kept.
- **The conference's speakers can take part as AI members** during a live demonstration, proposing and voting in character. They only act while the presenter has started them, and they sit out when stopped.

## 2026-09-24, later afternoon: a proposal that loses to a rival stays in the running

### Changed
- **When one wording wins a clause, the other proposals for that clause carry on** against the new wording, keeping the votes that compared them with the winner. Before, every one of them was handed back to its author with a red ↻, and all their votes were lost. A proposal the members had already preferred the winner to is closed straight away, and its author is told. A proposal that only partly overlapped the winner is still handed back, because nobody has voted on what it would now make.
- **The same holds when the Founder changes the text directly,** and for rival proposals on the document's rules.
- **A clause can now carry more than one record**, one for each time its wording changed.

## 2026-09-24, afternoon: records that show what changed

### New
- **Links in reasons.** A reason can now carry a web address or a `[link](address)`, and **bold** and *italic* words. Links to other sites open in a new tab and say so.

### Changed
- **A record shows what changed, in green.** On a passed change the new words are highlighted green; the wordings that lost keep the yellow they had while racing. On a change that was turned down, the words the proposal would have removed are highlighted green in the text that stayed.
- **One record at a time stays pinned** in your task list while you owe it an OK, instead of three; news about the rules and new powers still pin as before.
- **A proposal the Founder vetoed says so**: its record reads *Refused by the Founder*, and its box *Refused proposal*.
- **Task titles are tidier.** Removed words are shown struck through; a rule set for the first time shows its value; a quorum count reads as the number alone; a rewritten passage fills the line.
- **Dates read the same everywhere**, on the 24-hour clock and in docs.vote's own words, whatever language your browser is set to. Cards show the full date, the task list the short one.
- **Fewer buttons that do nothing.** The closing card and the card saying a member left have no bin, and no buttons at all once you have answered them.

### Fixed
- **Clicking between tabs on a clause no longer makes the card jump** when one of them is a decided change.

## 2026-09-24, night: tasks you can tell apart, and records that read cleanly

### Changed
- **Each task in the list says what it is about.** A rule change reads as the change itself (*⏱️ 10 → 5 minutes*), and a pair of wordings or a decided change reads as the words that differ, instead of a long list of entries all starting *Members…* or the same section name. Dates are shorter and always on the 24-hour clock: *15:25* today, *Sun 15:25* this week, *20 Sep* before that.
- **A record of a rule change reads top to bottom.** When it happened and how it ended come first (*Changed by the Founder*, *Passed* or *Rejected*); then the rule it set, who proposed it and why; then the rule it replaced, in its own box. A record you have already read has no buttons, because there is nothing on it to do.
- **A pile of filed records shows its depth.** Records you have already acknowledged sit in a pile beside their clause; the pile now shows a card edge for each record behind the front one, so a pile of three no longer looks like one.

### Fixed
- **Every record you have not yet acknowledged keeps its tab.** On a clause with several decided changes, only the one you had open showed a tab, and the rest vanished when you clicked another.
- **Stray backslashes are gone from the text.** Text pasted from some editors carries backslashes before full stops and brackets (*5\\. Expiry*); they are no longer shown when reading, and they are left out when you paste. Nothing already written was changed.

## 2026-09-24, later: the wire's border removed

### Changed
- **The line joining a task to its place in the document has no border again.** The previous deploy gave it a darker outline so it would stand out more against the page; it read as a border, and it is gone.

## 2026-09-24: the fix batch after the first real document

Twenty high-priority issues (filed after a review of every user flow and after the first real document), three accessibility defects and a round of Founder feedback, all fixed in one deploy. Most of it makes the page tell you the truth, faster, when something goes wrong.

### New
- **A red *Reconnecting…* bar.** If your device goes offline or docs.vote stops answering, a red bar appears along the top of the page, with the cause where it is known (*Your device is offline.* or *docs.vote is not answering.*). Every button that would send something is held until the connection comes back. The page stays readable and anything you have typed is kept. Until now you only found out when an action failed, and the rule now is to warn before anybody acts.
- **Strangers can read a closed document's history.** Where a closed document is readable by anyone with the link, or by everyone, a visitor who isn't signed in sees what a member sees: every passed change marked ✔ where it landed, the signatures and the amendments. Those records are sealed exactly as a member's are.
- **Begin waits in the open.** While members are still answering a question the Founder handed to them, the Founder sees a waiting Begin task that names each member still to answer, with their face.
- **A document open to anybody can be joined from the page.** Before, it could only be joined by applying.
- **A refused applicant is emailed**, and so is a member the membership votes out. Before, only people the Founder removed got a mail. An applicant's page now says when they have been admitted.
- **Grants say they must be accepted.** A new power arrives in its own colour with a gentle sparkle until you take it, and its button says what it does (*Accept ✏️*). The 🏛️ grant is now titled *Activate Your Membership*.

### Changed
- **The Constitution section is now called *Rules*** everywhere a member reads it.
- **The paper look.** The document sits as a sheet of paper on a desk, with balanced margins, a stronger tint on the task list, and a clear break between the Rules and the Text.
- **Green for passed.** A passed change's ✔ is green and a rejected ✖ is grey. Before, both were purple.
- **📝 has its own corner.** The floating edit button sits bottom-right at one and a half times its old size, and sparkles until you first press it. The 📝 tab beside the text stays where the text begins instead of following you down the page.
- **No bin on a vote card.** Members read the 🗑️ on a vote card as *skip*, but all it did was close the card. To take a vote back, choose differently or pick *Indifferent*. To close the card, click outside it.
- **A Founder's direct change reads *Changed by the Founder:*** in a rule's history, never *Passed:*, which now means only a change the membership voted through.
- **Each mark in the contents rail opens its card**, the way the task list's entry does.
- **The spectator feed is leaner.** Each author's picture now travels once rather than with every entry, which took a convention-sized live feed from 1.38 MB to 289 KB. A closed document's feed now serves its whole history rather than the last 200 entries.
- **A magic link waits for you to press *Continue*.** Mail scanners and link previews can no longer use up your link before you do. A link that was cut short in transit now says so, instead of claiming it was already used.
- **Faster checks for contributors.** A push to `main` is now decided in about ten minutes instead of 43, because the walks run side by side ([#96](https://github.com/edsaperia/draft/pull/96)).
- **We measured how far one server goes.** Tools that seed hundreds of realistic documents found where today's hosting stops coping (at around 200 documents), and a new check warns before start-up time creeps towards the host's limit. The plan to go further is in `design/spec-pass/plan-scaling.md`.

### Fixed
- A vote or withdrawal the server refused used to look as if it had worked, and one stuck request could block every later one. The page now believes the server, and a hung request gives up after 20 seconds ([#37](https://github.com/edsaperia/draft/issues/37)).
- A proposal the server failed to save could still stand in memory, so everybody else kept it while the proposer was told it had failed. Now nothing stands unless it was saved, and any failed save raises the document's red flag ([#79](https://github.com/edsaperia/draft/issues/79)).
- Pressing Enter at the end of a clause you were drafting was dropped, which glued your next sentence onto the one before ([#78](https://github.com/edsaperia/draft/issues/78)).
- A ⏰ question handed to the membership could only ever settle on *Never*, and a number typed into an answer card was lost on the first press ([#75](https://github.com/edsaperia/draft/issues/75)).
- When the Founder changed a rule directly, the membership was told nothing, and the reason the Founder gave was lost ([#80](https://github.com/edsaperia/draft/issues/80), [#34](https://github.com/edsaperia/draft/issues/34)).
- The proposer of a 🏛️ change could vote against their own proposal, which killed it ([#88](https://github.com/edsaperia/draft/issues/88)).
- A member who left or was removed kept supporting the proposal they had left behind. And if every member lapsed at once, every live proposal was thrown away ([#65](https://github.com/edsaperia/draft/issues/65)).
- A link followed after the document closed, or a refused application's link, showed raw JSON. The closing email now signs a member straight in ([#35](https://github.com/edsaperia/draft/issues/35)).
- A creation link sent to a mistyped address could found the document for whoever held that address. It is now refused with a sentence saying the Founder has since changed the address ([#38](https://github.com/edsaperia/draft/issues/38)).
- A rules proposal the membership had rejected stayed on the spectator feed as if it were still live ([#87](https://github.com/edsaperia/draft/issues/87)).
- An applicant who picked an emoji face someone else already used was told that person's name ([#33](https://github.com/edsaperia/draft/issues/33)).
- The 🎩 card (*Is the Founder a Member?*) showed no answer after a reload.
- A closed document showed at most fifty ✔s, so the convention's earlier passed changes were missing from its closed page.
- A poll arriving while you typed a number or a date into an answer card took your cursor and your half-typed value.
- **Accessibility:** after you open a card, vote or press OK, the keyboard stays on the card instead of jumping to the top of the page.
- **Accessibility:** the lines joining a task to its passage were too faint to see in several colours. Each now has a thin darker edge, so every one is clearly visible.

### Security
- The host's own maintenance routes (pause, resume, page upload) now take a separate administrator key. The key that serves test bots opens their outbox and nothing else ([#10](https://github.com/edsaperia/draft/issues/10)).
- A malformed or oversized request to a sign-in link is now counted against the rate limit before it is read ([#89](https://github.com/edsaperia/draft/issues/89)).
- An email address with characters outside plain ASCII is refused where it is typed.

---

## 2026-09-20 to 2026-09-22: the first real document

**Milestone: the first real use.** On 2026-09-20 a Newspeak House convention of twelve members drafted its charter on docs.vote, in free play, supervised by its Founder. The document closed itself at 17:10 as its rules said it would. It produced 93 adoptions and a clear list of what went wrong. Everything the convention found was fixed and live by the evening of 2026-09-22.

### New
- **A quorum can be anything from one member to everybody.** The quorum scale now runs from 1% to 100%. The card says what either end means, and prints the number of members the rule actually requires. Before, a quorum was capped at half the membership, and a 50% quorum was met by 6 of 12, not the majority of 7 a member would expect.
- **An empty ✏️ wallet says when your next proposal arrives.** Every ✏️ goes dark with a countdown beside it, instead of letting you press and be refused.
- **The error log lives in the database**, so a deploy no longer deletes it. The page also reports its own crashes to the same log. Before, the convention's refusals survived only because someone copied the file off the server by hand.

### Changed
- **A proposal closes its card as it goes out**, and the task list says *sent* for a few seconds. Before, the card stayed open and the proposer couldn't tell whether it was live.
- **A proposal stranded by a change underneath it turns red.** It's the one colour on the page that means something needs your attention.
- **✏️ *propose edit* starts from the whole passage** its wording covers, not just its first line.
- A member can now change the proposal rate with one press, and the field shows what you typed.

### Fixed
- A line pasted from Windows carried an invisible character, and after that nobody could propose a change to that line.
- Withdrawing an invitation nobody had opened left a question stuck, so the Founder couldn't Begin.
- A member's card could show a proposal against the line above the one it changed, after the text shifted under it. The convention hit several versions of this bug and all were fixed.
- Dragging a selection across an open card made two overlapping changes, and the server refused the whole proposal.
- A vote that crossed paths with the page's 4-second refresh was shown to the member as an error. A withdrawn invitee's old link answered with an internal error.

---

## 2026-09-19: the spectator feed, and ready for real use

The day before the convention. The page learned to project itself and to fail more gracefully, and the host was rehearsed end to end. This batch went live just after midnight.

### New
- **Milestone: the spectator feed.** Every document has a feed at `/d/<address>/feed`: a dark timeline made for a projector on the wall. It shows proposals as they are made and as they pass, each with the text it replaced and a paragraph either side, and the proposer's reason in a speech bubble. Proposals to change the rules appear there too, in the rule's own words. It is built on a strictly public view of the document, so it can never show a vote, a standing or anything a member's page keeps sealed. The document's visibility setting decides who may read it.
- **A pile under a crowded clause.** When rival wordings are still waiting on one clause, its task-list entry shows the edges of the cards behind it, up to five.
- **Your draft follows its paragraph.** If an adoption elsewhere moves the text you were editing, your draft moves with it. If the words it was about are gone, you are told, on the card your words are in, before anything is sent. Every proposal now carries the wording it replaces, and the server refuses one aimed at the wrong place.
- **Edit mode shows the Markdown source.** Headings, bullets, bold and italic appear as the characters that make them, so there is no longer a second view to switch to.
- A runbook for operators hosting a live session: the morning checks, the projector, what to tell the members.

### Changed
- A single vote against now ends a 🏛️ proposal, whatever it is about. A constitutional change needs everybody, so one *no* is final.
- A change held for the Founder's veto now asks the Founder, and keeps the membership's vote counts.
- The sign-in limits are sized for twenty phones on one venue's Wi-Fi.

### Fixed
- Signing a closed document emptied its record on everybody else's page ([#30](https://github.com/edsaperia/draft/issues/30)).
- After a rival wording carried, an open page could show the wrong clause on your own proposal, and *Re-make* sent nothing ([#66](https://github.com/edsaperia/draft/issues/66)).
- A line reading *undefined* appeared under every text proposal when the Founder kept their veto on the text ([#58](https://github.com/edsaperia/draft/issues/58)).
- An open feed never showed a new constitutional proposal or a Founder's direct change. It now also says when the host is paused and holds a reader's scroll position still ([#68](https://github.com/edsaperia/draft/issues/68)).
- Refused sign-ins and knocks at the door now answer with a page saying what happened, not raw data or *a link was sent* ([#45](https://github.com/edsaperia/draft/issues/45), [#53](https://github.com/edsaperia/draft/issues/53), [#69](https://github.com/edsaperia/draft/issues/69)).

---

## 2026-09-17 to 2026-09-18: a review of the whole tree, and votes that count

An automated review of the whole codebase filed 27 issues (#2 to #28). The Founder ruled on them one at a time, and most were fixed within a day. Alongside that, the rules for when a change passes were tightened around *who actually said yes*.

### New
- **Silence becomes an abstention, with a clock you can see.** If you don't vote on a proposal within the lapse period, you abstain on that proposal alone. The *Indifferent* button shows how long you have left, and the task list shows it too in the last day. The record says how many members ran out of time.
- **A proposal needs a seconder, and counts approvals.** The quorum now counts the members who preferred a change, not merely those who looked at it. A proposal can't pass on its author's say-so alone.
- **A proposal that can never win is closed early.** Once no answer still to come could carry it, it closes, and its author is told straight away.
- **You hear when your proposal fails.** A rule change you proposed that is voted down, or a wording of yours that is rejected, now tells you, even if you never voted.
- A proposal still running when the document closes is filed as *Proposal ran out of time*, and the closing card counts them.

### Changed
- **Only a proposal that passes gets its ✏️ back.** It gets back exactly the one it cost.
- The shortest lapse period is five minutes, and a lapse can be stated in minutes, hours or days.
- A spent or expired magic link is answered with a page, not raw data.
- The picture uploader says out loud why it refused a file. Before, a refused upload simply closed the file dialog.

### Fixed
- Proposal numbers were reused after a restart, overwriting an earlier proposal ([#2](https://github.com/edsaperia/draft/issues/2)).
- A member acting between the document's ending and the next minute's tick stopped the document from ever closing ([#3](https://github.com/edsaperia/draft/issues/3)).
- A proposal rate under one minute could hang the whole host ([#4](https://github.com/edsaperia/draft/issues/4)).
- A write that half-failed could silently lose people's names or queued mail ([#7](https://github.com/edsaperia/draft/issues/7)).
- An invitation priced *members must vote* was never actually put to a vote ([#6](https://github.com/edsaperia/draft/issues/6)).
- Open pages reloaded on a new deploy and threw away drafts that hadn't been proposed ([#12](https://github.com/edsaperia/draft/issues/12)).
- A member with no ✏️ left could freeze a document by proposing a removal ([#26](https://github.com/edsaperia/draft/issues/26)).
- The page drifted from the server in several small ways: a departed member still listed, a boot that never retried, a closed card undoing what you'd typed ([#11](https://github.com/edsaperia/draft/issues/11)).
- One unreadable document aborted the whole backup ([#13](https://github.com/edsaperia/draft/issues/13)). The quorum's rounding was off by one at some sizes ([#24](https://github.com/edsaperia/draft/issues/24)).
- **Accessibility:** the page now declares its language, a vote's two wordings are a proper radio group each named by its own text, and the grey text meets the contrast standard.

### Security
- A command-name check could reach more than it should, letting a member read beyond their own view of a document. Text members wrote could also run as script in other members' task lists. Both were closed ([#5](https://github.com/edsaperia/draft/issues/5)).
- A request's content type is now checked exactly, the mail provider has a deadline, and magic links followed during a maintenance pause are no longer used up ([#9](https://github.com/edsaperia/draft/issues/9), [#20](https://github.com/edsaperia/draft/issues/20)).

---

## 2026-09-15 to 2026-09-16: the current text is a peer, and the page gets a typeface

The biggest change to the mechanism since launch. It was followed by a day on how the page looks and a first measure of how accessible it is.

### Changed
- **The current text is just another wording in the race** (SPEC v0.128). A change is adopted when the ranking puts it above the current text and enough members have voted. A tie leaves the current text standing. The confidence bar a Founder used to set, and its ramp, are gone from the page, along with the `/pairwise` page that explained them. **Why it matters:** the old rule made the status quo a gatekeeper with a number nobody could reason about. Now it competes on the same terms as every proposal, and the quorum is the only brake. A simulated study measured how often a text now flips back and forth, and the approval rule added on 2026-09-17 cut that by about two thirds.
- **The birth is three steps again**: the title, the address, your email. The document-type presets added in August are gone.
- **A power the Founder lays down stays down.** Its tab leaves the pile and there is no road back (SPEC v0.130). **Why it matters:** the Founder starts with every power and can only give them away, so members can trust that what was handed over stays handed over.
- **One question, one tab, one entry.** Every pair of wordings you are asked about, and every rule change in progress, is its own tab and its own task-list entry.
- The 🏛️ grant arrives the moment you become a member, before any question that needs it.
- A member is no longer held back by how far the Founder has got. A question handed to the membership is yours the moment it is handed over.
- A proposal's wording is shown as the clause is shown, with Markdown rendered, not as raw asterisks.

### New
- **Milestone: the first accessibility audit** ([`design/REPORT-a11y.md`](design/REPORT-a11y.md)). The whole surface was read by an automated WCAG sweep and a dozen hand probes, at desktop and phone widths, and it changed nothing. Its findings have been fixed since, in the 2026-09-18 and 2026-09-23 batches.
- **Charis SIL for the document's text**, with the page's controls in the system sans, on one modular type scale.
- **Every glyph is drawn**: the lifecycle marks, wallets, subjects and buttons all use one consistent emoji set (Fluent Flat), in colour, so they look the same on every device.
- 🌂 **Leave**: resigning is a card in your own row, and its body warns that the membership would have to vote to re-admit you.
- What an applicant fills in at the door (name, picture) arrives with them when they're admitted.

### Fixed
- After Begin, a setting the Founder had handed over was sometimes asked again as if it were a new question.
- A new clause between two others was drawn with two tabs, and the phone's task drawer let its entries overlap.

---

## 2026-09-12 to 2026-09-14: phones, deploys you can survive, and a big tidy

### New
- **Milestone: docs.vote on a phone.** The first cut of the phone layout: one column, with the contents and the task list as drawers on either side, and enough to read the document and vote. Proposing on a phone, the two-tap confirm and full tap targets are still to come ([`design/MOBILE.md`](design/MOBILE.md)).
- **Announced maintenance.** A deploy now pauses the host first, and your page shows a maintenance notice instead of losing what you did. A document that can't save raises a red flag instead of failing quietly.
- **Stranded proposals are marked.** If the text changes under your proposal, it wears ↻ and offers to re-make it on the new text or withdraw it. At the close, a stranded proposal goes into the backlog instead of vanishing.
- A departure, a removal or a refused application now owes every member one acknowledgement.

### Changed
- New wording is highlighted yellow in a proposal. Green now means *decided* and nothing else.
- Page-only updates no longer restart the host.
- The code was reorganised in nineteen behaviour-preserving moves: the engine's routing and ranking, the rules' motions and fold, the server's routes and write path, and the page's scripts each got a file of their own. It is a good moment to start reading the code.

### Security
- Sign-in links are now rate-limited per email address as well as per network address.

### Fixed
- A pasted list of invitees now names every address it refused. Two proposals for the same rule change are refused on either route.

---

## 2026-09-08 to 2026-09-11: identity out of the log, bots as members, and speed

### Changed
- **Names and emails no longer live in the permanent record.** Each document's history is a tamper-evident, hash-chained log, and until now it held people's emails, names and pictures in plain text, where they could never be deleted without breaking the chain. Identity now lives in a separate, deletable table the log points at. An erased person reads as *[withdrawn]*, and the rest of the history still checks out.
- **The text is Markdown, rendered.** Bold, italic, headings and bullets display as rich text. **B** and *I* sit at the top of the editing column.
- **Every live proposal can ask for your vote.** Before, a busy document could leave some proposals waiting behind others.
- A lapse is warned a week, a day and an hour before it happens. One-character document addresses are allowed.
- The ⏳ mark now means only *waiting for other people to vote*. A proposal you can still act on stays lit.
- Every task-list entry now scrolls the page to its card, even when the card is off screen.

### New
- **Test bots on docs.vote.** Mail to any address at `bots.docs.vote` is caught by the host and never sent, so a Founder can fill a document with bot members that propose, vote and move, and see a busy document for themselves (`npm run room-bots`).
- A refused action now says why on screen, and goes into an error log.

### Fixed
- **A data-loss bug:** under heavy load the host could skip saving some actions, and the gap only showed up on restart. One bot-heavy document on docs.vote lost its entries after that point. The save bookkeeping is fixed, and a document that fails to load is now counted and reported instead of hidden.
- **Speed:** with 31 members acting at once, a page refresh took up to 10 seconds. After the fixes the same load answers in 27 ms at the 95th percentile, and 240 open pages stay under 60 ms. Measured on the live host, the limit is now about 140 bots acting at once ([`PRODUCTION.md`](PRODUCTION.md) § *Measurements*).

---

## 2026-08-31 to 2026-09-07: one shape for every card, and the quorum means one thing

A stretch of close design review. The Founder read every card on the page, three times over, and the notes were built each time.

### Changed
- **Every choice looks the same.** Each option is a block with its text, and a radio beneath it: *Prefer this* where the choice is put to the membership, *Choose this* where it is yours alone. Nothing is ever preselected.
- **📝 is the door to editing.** You read by default and press 📝 to edit, instead of every click putting a cursor in the text.
- **The quorum is the floor and only that** (SPEC v0.99). *Signing out* and *freezing* a document are gone. Quorum is the minimum support a change needs, and presence no longer freezes anything.
- **Your votes on one clause form a deck.** You can be asked about several pairs on the same clause, and the ⏳ card keeps your own record of how you voted, which you can revise.
- The proposal rate is one number: how often a new ✏️ arrives. You start with three and can hold at most three.
- The rules read as the document's own sentences, in the third person, the same for every reader.
- Every string a member can read now lives in one file and is checked against a style guide at every push.
- The host no longer enforces a pause between adoptions unless it is configured to.

### New
- [dev.docs.vote](https://dev.docs.vote): a throwaway second instance with a control that walks a document through its whole life, for trying things out. Never put anything real there.
- An applicant has a live page of their own.

---

## 2026-08-27 to 2026-08-30: the Founder's powers, and the text as a card

### New
- **Signed or anonymous, your choice.** Where the rules allow it, a proposer chooses at the moment of proposing whether their name goes on the proposal. The record shows the choice as it was made.
- **The Founder's pen and veto on the text.** A Founder who kept ✒️ can amend the text directly, and members get a news card beside the changed clause. A Founder who kept 🛡️ can hold an adopted change for their assent.
- **Begin lays powers down in one table.** At 🍾 the Founder sees every setting with ✒️ and 🛡️ switches and chooses what to keep. Anything not kept is laid down. Powers laid down together arrive as one news card with one OK.
- **The text is the open card.** 📝 opens edit mode, a new clause can go between any two, and a proposal can touch several places at once.
- **You hear when mail fails.** If an invitation couldn't be delivered, the Founder is told on the page and can resend it.
- A member Founder can resign like anybody else after the start.
- A seat-by-seat test harness checks what every kind of member is shown at every stage of a document's life.

### Changed
- **The surface says *vote***, never *judgment*, and *the membership*, never *the room*.
- The 🤖 *AI Proposals* setting left the page.
- An author is never asked to vote on their own proposal against the current text.
- Every hold-to-confirm button takes one second.

---

## 2026-08-22 to 2026-08-26: the membership's doors, and the rules as tables

### New
- **Admissions and applications.** 🪪 *Admissions* sets one price for every way in: all members must agree, members vote, or any member may invite. 🤝 *Applications* decides whether strangers may ask to join at all. ✉️ invites, ❌ proposes a removal, and 🥾 prices removal on the same scale. The open-join link admits the visitor straight away.
- **A reason with every change.** When the Founder changes a setting they write a reason, and everybody else is told what changed and why. A Founder's direct change is filed as an amendment.
- **Faces in the topbar**: a row of avatars of everybody who has arrived, instead of *n in the room*.
- **Emoji faces from Unicode's own list**, with skin tones, one face per member.
- Begin says what it is waiting for, and offers the fix.
- A phone plan was written ([`design/MOBILE.md`](design/MOBILE.md)).
- A beta criterion was written down: every combination of role, stage and setting has to be visited by an automated seat or a scripted tester, and two supervised sessions in a row have to pass with no control doing the wrong thing.

### Changed
- **The spec became tables.** The rules were rewritten as numbered rules and tables, each pointing at its reasoning, with an automated check that holds the code to them. [`SURFACE.md`](SURFACE.md) was born to state what the page tells a member and what each control does.

### Fixed
- **A hold is released by letting go, and by nothing else.** A background refresh could interrupt a hold-to-confirm and lose the action, or fire it twice. Nothing on the page now rebuilds under a press.
- A reserved or test email address is refused before any mail is sent.

---

## 2026-08-20 to 2026-08-21: docs.vote goes live

### New
- **Milestone: docs.vote is live** (2026-08-20). A document is created by naming it and verifying an email address. Invitations come from `mail.docs.vote`. Every page carries a banner: *docs.vote is in alpha*.
- **Milestone: Postgres.** The same night, at 23:30, the live service moved from files on disk to Postgres. It was drilled with a full backup and restore, and every hash was checked.
- **Milestone: one page** (2026-08-21). Birth, founding and the live document are one page. The separate setup screens are gone, and text proposals race through the real engine end to end.
- **🍾 Begin.** The Founder's explicit act of starting the document.
- **🥂 The close and the signed record.** The clock closes the document; nobody presses anything. Each member then gets a closing card, and pressing OK on it signs the document, with an optional closing comment. **Why it matters:** the output isn't just the agreed text. It is a record, signed by the people who made it, of what was contested, by how much, and what is left in the backlog.
- **Wallets.** Every power is something you hold and can see in the topbar: ✏️ proposals, 🏛️ your constitutional voice, and the Founder's ✒️ and 🛡️. None arrives without your acknowledgement.
- **Nothing arrives already decided.** Every setting starts with the Founder, unanswered, and handing a question to the membership is what opens it to a blind vote.
- **The stranger's door.** There is no login screen. A visitor sees the document as its visibility setting allows, with one card offering a way in.
- CI deploys on green and verifies the live host afterwards; a health check, backups and a restore drill.

### Security
- Nine defects found in a pre-launch review were fixed before go-live. They covered session cookies and HTTPS, rate limiting behind the proxy, escaping of stored text, input limits, cross-site request protection, what applicants could read, and security headers. A second review the same night fixed fourteen of sixteen findings.
- Staging caught a rate limiter that never limited, and it was fixed the same day.
- A Founder's name could run as script for any visitor at a document's door. It was fixed on 2026-08-21 and pinned by a test.

---

## 2026-08-13 to 2026-08-19: before docs.vote (the spec, the engine, the simulations, the mockups)

There was no public service yet. This week produced the ideas and the machinery the product runs on.

- **The spec** (v0.5 to v0.58). The core idea is that rival wordings of the same passage race each other, and the membership ranks them by **blind pairwise votes**: *which of these two?*, with no names and no running scores. The result is fitted to a ranking model (Bradley–Terry with ties). **Why it matters:** comparing two wordings is easy for a person, hard to game, and needs no one to design a ballot. Blindness keeps anyone from voting with the crowd.
- **Two kinds of decision.** Ordinary settings change the way text does, by a vote. A *constitutional* change, one that would make past decisions mean something different, needs everybody (🏛️).
- **The blind founding.** Before drafting starts, each member privately states the least they will accept on each rule, and the document takes the highest of those minimums. **Why it matters:** it is a consent rule, not a vote, which lets a group set up its own rules without first needing rules to set them up with.
- **The Founder's powers:** the Founder starts with the power to change any setting alone and to veto, and can only lay these powers down.
- **The engine** (`engine-core`): a pure, dependency-free TypeScript library for diffs, racing proposals, the ranking, the proposal rate and a hash-chained event log.
- **The simulator** (`sim-harness`): scripted and AI-played members speak the same interface a human does, with a welfare score and a calibration sweep. Its findings set several of the spec's defaults. It also includes a live commentator for simulated runs.
- **The rules package** (`@draft/constitution`): the settings catalogue, the blind founding, motions on both routes, applications and lapse, with its own log.
- **The mockups:** the vote card went through six versions in a day, and then the session view made the document itself the surface. Then came the session view, the founding and the composer, all set in one fictional charter (the Hollow Oak Club).
- **The server:** a thin host with magic-link sign-in and the engine riding every save.
- MIT licence (2026-08-14).
