# Critique — the surface redesign, read adversarially (Q1541)

Written 2026-09-25 by a critic given only `grammar.md` §1 (the ten principles) and §7 (breaks B1–B13) and the prototype, for the first pass; SURFACE.md and design/DECISIONS.md were read afterwards, for the second. diagnosis.md, inventory.md and checks.md were not read. Nothing in the prototype was edited.

**How it was looked at.** `npm run design` on its own port; the prototype (`/proposal/proto/session-view.html`) and today's page (`/session-view.html`) side by side, driven headless with Playwright at 1600×1000 and 390×844, reduced motion. Every tab of `?fixture=session&band=1` was opened on both pages at both widths (52 cards each), and the same for `&closed=1` at 1600; the founding was walked by keyboard from a blank arrival through 🪶 and 📍; the band was photographed unfolded with no card open; settings records and power tabs were opened from a card's strip; and each pressed tab was measured before and after opening. The drivers are `design/proposal/tools/critique-*.mjs`; the screenshots and JSON dumps are in `design/proposal/data/critique/` (gitignored). A finding names the card, the state, the width and what was seen.

**The verdict in one paragraph.** On the band's settled settings cards the proposal is clearly better than today. The fake pressed provenance pill, the empty *Why are you changing this?* box and the bin with nothing to put back are all gone, and those cards read as the rule plus one grey line saying who chose it. On the charter it is roughly even: the tab and head registration was already good, and the *Current text / Proposed* labels moved to worse places. It is **worse** in four places: records (the outcome comes last, against a ruling made the day before); cards whose head has no radio (nothing says which paragraph is the current text, which was Q207's worry); locked and closed cards (B7 is half-applied, so one card states a fact and its opposite, and another hides the proposal it is about); and the first card a founder meets (the 🪶 head vanishes). Several principles are stated more strongly than the prototype honours, and some more strongly than any build could. Fix findings 1–6 before this is built.

---

## Part 1 — Findings, ranked by severity

Numbering is continuous. Each finding ends with **Verdict**: either a fix to the proposal, or a reason to keep today's rule (with the break named).

### Severe — the card says something false, or hides what it is about

**1. The locked 🎩 card states a fact and its opposite, one under the other.**
*Where*: band, 🎩 *Founder's Membership* after 🍾, 1600 and 390 (`new_…-08-hat.png`).
*Seen*: the head reads *The Founder is part of the membership.*; the fact line reads *Chosen by the Founder ✒️ · decided at the start*; below a hairline, with no radio, no label and no grey, comes *The Founder is not part of the membership.* That is two plain sentences in the same face that contradict each other. Today's card had the same two sentences but kept a pressed *Chosen* and a greyed *Choose this* radio, which is what told the reader they were options.
*Why*: B7 says *"on a read-only card, no alternatives are drawn"*, but the prototype removed the radio and kept the alternative. Removing the radio took away the only thing that marked the second sentence as a choice, which is exactly what reading 1193 protected (*"a locked or unavailable option is read as often as a live one"*).
*Verdict*: **fix to the proposal**. Either build B7 as written, with no alternative drawn at all, or keep CP11's greyed radio (reject B7 for locked cards). A bare alternative must never be possible. The grammar should state that an alternative block without a control cannot be built at all (a lint on the slot), not leave it to each card's discretion.

**2. On the closed page, a race the clock cut off opens to the clause alone, and its proposal is gone.**
*Where*: `?fixture=session&closed=1`, charter, *The Common Room* (and every other open race), 1600 (`one-closedarmchair-new-1600.png` against `…-old-…`).
*Seen*: the rail entry beside it still reads *'The armchair…' or 'before' …* and quotes the rationale. Opening the tab gives a one-paragraph card: the clause, and nothing else. There is no proposal, no fact line and no sentence saying the clock ran out. Today's card shows the proposal with greyed radios.
*Why*: B7 (*no alternatives on a read-only card*) combined with P4 (*a closed document offers nothing but 🥂*). "Offers nothing" has been read as "shows nothing". A closed document is where people read the record, and here the record of what was *not* decided has vanished from the card while its rail entry still advertises it.
*Verdict*: **reason to keep today's rule, narrowing B7**. B7 may cover settings cards whose alternatives are rungs of a ladder. It must not cover proposals: a proposal is content, not a control. Its radio can go (P4), but the block stays, with a fact line in the head's lane (*Undecided when the document closed · 25 September*). P4 should say *offers no act*, not *offers nothing*.

**3. Records put the outcome last, against Q1522 (Ed, 2026-09-24), and against B4's own claim.**
*Where*: every charter record (*The Kitchen*, *The Guest Bedroom — claims*, *Locking Up*…) and every band settings record (⏱️'s *Passed: a new proposal every 2 hours*), 1600 and 390 (`new_…-23-c.png`, `strip-raterec-new-1600.png`).
*Seen*: the order is now head wording, then the rationale, then *Decided · Tuesday, 29 September, 20:15 · 7 of 14 weighed in …* in small grey (on the settings record, *Passed · Friday …* at the foot). The green *DECIDED · 7/14* eyebrow, which was the first thing today's record said, is now the sixth line.
*Why it matters*: Q1522, one day old, ruled that *"the dateline and outcome come first … a reader opening a record wants what it did first and what it replaced second"*. B4 claims *"the record's what-it-did-first order is kept (the head is what it did; the fact line is directly under it)"*. The prototype does not put the fact line directly under the head; the rationale sits between them. That also breaks P3's own slot order (*who chose it and when is the line under the head*).
*Worse*: a record in a setting's strip that has since been superseded now opens with a head that is **not** the paragraph as it stands. ⏱️'s *Passed* record heads with *Members may make a new proposal every 2 hours* in the place where the paragraph says *45 minutes*, and nothing above it says this is history. Today's dateline did that job. P1 (*the line stays where it was, word for word, as the card's head*) cannot be true of a record, and the proposal does not say so.
*Verdict*: **fix to the proposal**. Records need to be a stated exception to P1: their head is the wording the record is about, marked past. The outcome and date go in the head's lane, on the line directly under the head and before the speaker (*✔ Passed · Tue 29 Sep, 20:15*), in the outcome's colour. Q1522's order survives, and nothing stands above the head.

**4. Q207 comes back: on every card whose head has no radio, nothing says which paragraph is the current text.**
*Where*: charter, 1600 and 390. Seen on your own proposal (*Spending*: `one-spending-new-1600.png`), a race of rivals only (*Quorum*, *Hardship*, *The Purse-holder*, *5. Expiry*), the deadlock (*Sanctions*) and the patch.
*Seen*: O1 (a) moves *The clause as it stands* into the head's lane as *Current text*, placed after the *Prefer this* radio. So the label exists only where there is a radio. On the rivals-only race the reader gets three near-identical paragraphs, with the first unlabelled and a grey *Proposed · 2 rival proposals* between it and the rest. On your own proposal the head is unlabelled and *What you proposed* comes **after** your wording and rationale, in 8-point grey. On the deadlock, *The clause as it stands — and it is still standing* is gone entirely, taking the one sentence that told the reader the deadlock had not displaced anything.
*Why it matters*: Q207 (Ed, closed 2026-09-14) put the clause under *The clause as it stands* because *"the risk is the first card someone ever sees"*. The cards now without a label are the ones where the paragraphs look most alike.
*Verdict*: **fix to the proposal**. The head's lane always carries the head's label on a charter card, radio or not: *Current text* on the left, the radio beside it when there is one. Every block's label goes in the same place, at the block's first line, not under its rationale (see 5).

### High — the proposal is inconsistent with itself, or a principle is visibly broken

**5. The same label is drawn four ways (P9).**
*Seen*, all at 1600:
- On a single proposal, *Proposed* sits to the right of its *Prefer this* radio, below the rationale.
- On rivals, *Proposed · 2 rival proposals* sits above the blocks as a grey line, followed by a new sentence (*Neither of these has to win — the clause above stands unless…*, which today sat under the last block).
- On yours, *What you proposed* comes after the rationale.
- On the patch, *§ THE PURSE-HOLDER · PLACE 1 OF 3 ↑ ↓* is still a blue upper-case eyebrow; it has just moved from above the head to the middle of the card, between the head's radio and the proposal, with a hairline under it and a note between two hairlines.

Provenance has two forms: *· Friday, 25 September, 03:01* on most rules, *· decided at the start* on 🎩. The door power cards head with the power sentence; the setting power cards head with the whole rule paragraph (see 7).
*Verdict*: **fix to the proposal**. Give the grammar a label slot per block (the block's first line, left, in `--t-micro`), give the patch navigation a stated home (the head's lane, right-aligned, as the ↑↓ already are), and give provenance one time form. G2 as prototyped has not removed the eyebrow; it has moved it to the middle of the card.

**6. The first card a founder ever meets breaks P1, and 📍 breaks P2.**
*Where*: the founding, no query, 1600 (`birth-new-1600-s0a.png`, `slug-new-1600-1.png`).
*Seen*: 🪶: the *Untitled* line at `--h-title` vanishes when the card opens, and the card is a body-size input box, *Give this document a title*, 18 px lower. B2 promised *"the founder's 🪶 heads with the title at --h-title"*, and the prototype does not. On a settled document the 🪶 card's head reads *The Hollow Oak Club — House Charter* where the paragraph reads *The document is titled "The Hollow Oak Club — House Charter".*, so it is not word for word (P1's own words). 📍: the card's top edge (266 px) rises above its own paragraph's line and **covers the descenders of the 🪶 paragraph above it**, whose bottom is at 271 px. Today's card starts at 283 px and covers nothing.
*Verdict*: **fix to the proposal**, and see principle A below: P1 and P2 together are geometrically tight, and the prototype resolved the conflict by overlapping.

**7. A power card's fact line states the wrong fact.**
*Where*: band, ⏱️ → ✒️ *Can the Founder Make Amendments at Will?*, 1600 (`strip-power-new-1600.png`).
*Seen*: the head is the rule paragraph, *Members may make a new proposal every 45 minutes. / The Founder may amend this at will, and refuse proposals that the membership pass.* The fact line is *Chosen by the Founder ✒️ · Friday …*, which is who chose **45 minutes**, not who decided the power. The one block is *The Founder may **not** amend the proposal rate at will.* The ✒️ and 🛡️ tabs therefore open cards with the same head, and the reader has to pick the ✒️ half out of a sentence that also states the 🛡️ half. The door power cards (✉️ → 🛡️) head with the power sentence alone, so the same kind of card has two head forms.
*Verdict*: **fix to the proposal (B8)**. A power card's head is that power's own clause from the paragraph, and its fact line is the power's provenance. Otherwise take B8.

**8. P5 and P8 are not built, and cannot be verified on a phone.**
*Seen*: no card in the prototype shows a visible reason beside a dark control. Examples: 🪶 settled, with ✒️ and ✏️ both dark; ✉️'s 🏛️ dark; *Remove a Member*'s ✒️ dark. The reason exists only in `title` tooltips (*Give it a name first*), and a phone has no hover. Meanwhile ✉️'s ✒️ is **lit** over an empty address box, so a control is enabled that changes nothing when pressed (P5's first half). The 🪶 settled card has two dark commits for different reasons, and P8's *"one note in the middle"* cannot carry two reasons.
*Verdict*: **fix to the proposal**. Build the note slot before judging the row, and let P8 give each dark commit its own reason in that slot (the first, or the one whose act the reader chose). Today's page shares all three faults, but the proposal claims to fix them and a reviewer would take the claim on trust.

**9. P7 is contradicted by the prototype's own drawings.**
*Seen*: *The Garden* (↻, 1600) draws a vote about wording that no longer exists as a pressed *Preferred* radio on the head, beside a note saying *"You cannot change it"*. That is something already done, drawn as a pressed control, which is exactly what P7 forbids. The solid accent is on every selected radio (*Preferred*, *Chosen ✒️ or Proposed ✏️*), not *"the acknowledgement alone"*. The recorded ✓ is still a green-tinted button (B10 says it should not be).
*Verdict*: **fix to the proposal**. Either restate P7 honestly (the solid accent means *selected, or owed*), or change the selected-radio drawing. The ↻ case needs its own rule: a vote about a superseded text is a fact line, not a pressed radio.

**10. B3 leaves the personal cards without a question.**
*Where*: ✋ *Your Name*, 1600 (`new_…-09-myname.png`).
*Seen*: the head is your row (*AB Ash Bellamy · you*), then an empty focused box *Your name* with *Choose this*, then *Anonymous · Choose this*, then ✓. Nothing on the card says it is asking you to choose how you appear. The grants have the same problem: ✒️ *Founder Actions* now heads with *Founded by AB Ash Bellamy at 03:07 on 25 September*, which names the founding rather than the power the card grants.
*Verdict*: **reason to keep today's rule: reject B3**, take O6 (the personal cards keep their title), and give the grants the power's clause as head.

### Medium — lost signal, or a cost the breaks do not own up to

**11. On your own proposal, the only control is an unlabelled 🗑️ that withdraws it.**
*Where*: *Spending* (yours), 1600.
*Seen*: the row is 🗑️ alone. Its tooltip, *Withdraw — the edit comes back in full*, is the only thing that says it is not *close*. Q1500's finding (*a member read it as skip*) is the reason B5 exists, and B5 has kept the one bin that does something irreversible, alone, on a card that otherwise says nothing about its state (waiting on the membership? how far along?).
*Verdict*: **fix (B5)**. A withdraw bin carries its word, or the row's note says the proposal's state. Otherwise take B5.

**12. The closed page loses owed OKs, and the topbar is outside P4.**
*Seen*: on `&closed=1`, the unread records (*knives*, *claims*, *Nomination*, *Locking Up*, *Calling a Meeting*) had an OK today and have none now. The rail is declared unchanged, so whether those entries still show as owed with no way to discharge them was **not verified**. It needs checking before B6 and P4 are ruled. The topbar still shows ✏️ ×3 +2 and a *19:09* drip countdown on a document that has closed.
*Verdict*: **fix to the proposal**. Either records owed at the close are acknowledged by 🥂's signature (say so), or they keep their OK. Scope P4 to the page, not only the card.

**13. The prototype demonstrates a look, not the architecture it argues for.**
*Seen*: `proto/grammar.js` is a classifier over today's markup. It recognises provenance with a regex over label strings (`PROV`), finds the bin by its glyph and a withdraw by a regex over `title`, and its own panel says *"S1 not met"*. Findings 1 and 2 have the shape of classifier mis-sorts (a radio removed but not its block). The headline claim — *a card is a function of one state object; every fact has one reader* — is untested by the prototype. Converting 40 kinds of body (O7) is the real cost, and it appears in no break's *Costs*.
*Verdict*: **fix to the proposal**. State the conversion as the cost of the whole programme. Say plainly that the checks pass against a sorter, and that a CardState build has to pass them again.

**14. Unreviewed copy entered with the shell.**
*Seen*: ✉️'s head is *(no outstanding invitations)*, the band's parenthetical placeholder, replacing the card's STYLE-passed *Nobody has been invited yet.*; *Remove a Member* likewise. *decided at the start* is new. *Current text* is a third name beside *The clause as it stands* and the record's *Previous text*.
*Verdict*: **fix**. Route every head string through copy.js and STYLE. A head that is *the line* means the band's placeholders are now card copy and need writing as such.

**15. Patches and records sit outside P1 and P2, and the principles do not admit it.**
*Measured* (1600): pressing *Whole charter · place 2 of 3* moves the pressed tab **−371 px**, and *place 3 of 3* **−1020 px**, on both pages. The card opens at place 1, under *PLACE 1 OF 3*. Records move the pressed tab 5 px (*The Kitchen*, *larder*, *Notice*), also on both. These are old faults, but P2 promises *"the pressed tab … moves 0 px"* without exception.
*Verdict*: **fix to the proposal**. Name the exceptions in P1 and P2 (multi-place patch, record, gap), or design for them. A principle a reviewer can hold against a screenshot has to be true of the screenshots.

**16. The settings record's provenance label is dropped.**
*Seen*: today's *Passed* record says *Chosen by the membership* under the rule. The prototype's says only *Passed · Friday …*, and the *Changed by the Founder* record likewise drops *Chosen by the Founder*. B1 claims T48's labels are *"kept word for word"*.
*Verdict*: minor. Either keep the label or say in B1 that on a record the outcome word replaces it.

### What is genuinely better (so it is not lost in the fixes)

**17.** The band's settled cards: the pressed provenance pill, the empty reason box and the bin with nothing to put back are all gone, and each card reads as *rule · who chose it · the alternatives*. The ⏱️ composer card is about 15 % shorter at 1600 with nothing lost. At 390, band cards come out 7–34 % shorter (🎩 324 → 213 px, which is finding 1's missing controls), charter cards 1–10 % shorter, and ⏱️ 1 % taller.

**18.** B6, B9, B10, B11, B12 and B13 each remove a real duplicate or a control with no job, at no visible cost in the prototype.

**19.** *The Garden* (↻) note now sits beside the head it is about, not under the proposal. That is an improvement.

---

## Part 2 — The principles themselves

**A. P1 and P2 cannot both hold at a card's top edge.** A card has padding and a shadow. If the head sits exactly where the paragraph was (P1) and nothing above moves (P2), the padding has to go above the paragraph's line, over whatever lies there. The prototype does exactly that (finding 6: 📍 covers the 🪶 paragraph's descenders). The alternatives are zero top padding, or letting the head move by the padding. The grammar should choose one and say so, with the pixel budget.

**B. P1 is false for four kinds of card**: records (their head is history, finding 3), multi-place patches (one card, several lines, finding 15), gaps (there is no line; today's head was *The gap as it stands (no text here)*) and the founding (at 🪶 there is no line yet, only a placeholder, finding 6). A principle with four unstated exceptions will be argued about card by card. List them in the principle.

**C. P3 and P1 pull against each other in the head.** When the head is *"the line, word for word"*, it brings the paragraph's second sentence with it (*The Founder may amend this at will, and refuse …*). The head then states two facts, the value and the route, and on a power card the second is what the card is about (finding 7). P3 says each fact has one home, and the head has become the home of two.

**D. P4 as worded forces information loss.** *"Offers nothing but 🥂"* is right for acts and wrong for content (finding 2). Reword it: *a closed document offers no act but 🥂's signature; everything it decided or left undecided stays readable*.

**E. P5 cannot be verified on touch, and P8's single note fights it.** A reason that lives in a tooltip does not exist on a phone, and two dark commits can have two reasons (finding 8).

**F. P7's last clause is not true of the drawing it ships with** (finding 9). A principle a reviewer holds against a screenshot must be the screenshot's truth, or the review teaches that principles are aspirational.

**G. P9 needs a label vocabulary to be checkable.** Without a fixed slot per label, *"drawn the same way everywhere"* has nothing to compare, and the prototype has four label placements (finding 5).

**H. P10 is the principle Ed has felt most in live rooms** (focus steals, half-typed dates, holds taken by polls), and it is the one the prototype does not build (U1/U2). It is stated as settled when it is the least demonstrated.

---

## Part 3 — Second pass: what past rulings were protecting

Checked against SURFACE.md and design/DECISIONS.md after the first pass.

- **B1 (provenance as text), against Q1167 (a), Q1176 and Q1188.** Q1188's point was that *"the reader had to infer who set it from the absence of a label"*. The text form keeps the label everywhere except on the settings records (finding 16), so this holds. **Take**, with 16.
- **B4 (the eyebrow and dateline move), against Q207 and Q1522.** Q207 protected the first-time reader of a two-lane card. That reader is kept only where a radio exists (finding 4). Q1522 protected *what it did first*, and the prototype does not keep it (finding 3). **Reject B4 for records; take it for live cards only with the always-present head label.**
- **B6 (no close-only OK), against CP9 and reading 1190.** Reading 1190 gave the reader *"a way to say they are done"*. The prototype's way out is the tab or a click outside. That is adequate at 1600; at 390 the tab is a 34 px target at the screen's left edge. **Take**, and measure the phone's exit before building.
- **B7 (no radio on a read-only card), against CP11 and reading 1193.** Reading 1193 said a locked option *"is read as often as a live one"*. The prototype keeps the reading but drops the marker (finding 1), and drops the reading altogether on closed races (finding 2). **Reject as written.** Narrow it to settings ladders, drop the alternative entirely there, and keep proposals as blocks.
- **B3 (titles off personal cards), against T3 and F15.** T3 kept the title because *"a personal card had nothing else to head with"*, and the row does not replace a question (finding 10). **Reject; take O6.**
- **B5 (the bin only where there is yours), against C4 and Q1500.** Q1500 already removed the bin from judgment cards for the reason B5 generalises. The surviving withdraw needs its word (finding 11). **Take, with 11.**
- **B8 (power card offers only the other half), against K4 and Q1430.** Q1430 removed a head that repeated the held block. The prototype's head repeats the whole rule instead (finding 7). **Take, with 7.**

---

## Part 4 — The breaks, summarised

**Reject as written**: B7 (narrow it; see 1 and 2), B3 (take O6; see 10), and B4 for records (see 3).
**Take with a fix**: B2 (word for word, 🪶 at `--h-title`, stated exceptions: 3, 6, B), B4 on live cards (an always-present head label: 4), B5 (the withdraw carries its word: 11), B8 (the power's own clause as head: 7), B1 (records keep or explicitly fold the label: 16).
**Take**: B6 (with a phone-exit measurement), B9, B10 (and make the recorded ✓ match: 9), B11, B12, B13.

**Who it is better for**: the Founder and the regular member reading the band's settled rules. It is cleaner, has fewer false controls and makes one honest claim per line. **Who it is worse for**: the first-time member on a charter card without a radio, anyone reading a record, and anyone reading the closed document. **Before it is built**: findings 1–6. Then state P1 and P2's exceptions and the top-edge budget (A, B), reword P4 (D), build the note slot (8) and the label slot (5), and count the O7 conversion as the programme's cost (13).
