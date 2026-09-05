# Card review, round 3 — Ed, 2026-09-05

Ed's notes on the Card Specimen Sheet (https://claude.ai/code/artifact/bdd96cfd-768a-4354-adf1-619cf827ccb5), captured from the tree at 84eb3d1, pulled verbatim from the sheet's own store (collection `notes/round-2026-09-05/cards`) and **sorted by a session on 2026-09-05 evening** into the rules that repeat (Part A), every note verbatim under its card (Part B), and the questions the sort raises (Part C). Keys are the sheet's `walk·key`; the number is the specimen's position on the sheet. The handover for how comments are taken is `design/card-review-2026-09-02.md`: an answered question there is the instruction that was built, and a note below that contradicts one is Ed reversing, which is said back to him in Part A. A pass file: delete once folded.

44 cards carry a note. Ed's framing from the previous round still governs — *strip copy right back, communicate through consistency and careful use of words, using the clause text to explain everything* — and this round is that rule reaching the places the last build missed or did not touch: the standing value on a settled card, the record card, the composer's field blocks, the read-only cards.

**Numbers claimed for this round: 1181–1195** (QUESTIONS.md, Spent numbers). Blocking questions go one at a time, multiple choice; readings are numbered so they can be vetoed.

---

## Part A — The rules that repeat

### A1 — No green on any commit (a build defect, not a reversal)

**Ed wrote** *Button shouldn't have a green background* / *No green on button* on 02 📍, 16 ✉️, 23 🍾, 24 🌍 (delegated), 30 📍, 31 🌍, 43 ✉️, 49 ⏱️.

**Reading.** Every card he named has an **enabled** emoji commit (🪶 ✒️ 🍾); every card with the same commit disabled drew grey and got no note. `system.css:1914` gives `.btn.btn-approve.glyphbtn` the solid `--ok` fill for the ✓, and the emoji commits carry `glyphbtn` too, so once armed they inherit the tick's green. Q1153 ruled every glyph commit flat, armed said by elevation; Q1174 kept the green for the ✓ alone. **This is a Q1153 build miss** of the same kind as the `.emojibtn` accent rule found in round 2, and the fix is a CSS rule for `.emojibtn` that is flat when enabled. No question.

### A2 — Every option block carries its radio

**Ed wrote**, on 37 💤 (*"A membership lapses" should have a radio button*), 42 📧 (*Email composer is the second option, so there should be a "Choose this" radio*), 51 ⏰ (*"The drafting process will end on" should have a radio button "Prefer this"*), 54 🌡️ and 62 🌡️ seat:1 (*"A proposal passes when the members are" should have a radio button "Prefer this", since it is an option*), 57 👥 (*"Quorum is []% of the membership." should have a radio button "Prefer this"*).

**Reading.** The composer's field-carrying block (`inputBlock`, session-view.html ~4800) and 📧's composer block draw the sentence with its input and **no radio**, on the founding card's rule that typing into a field chooses that block (F6). Ed wants the radio on every block regardless, in the register CP2 already gives: *Prefer this / Preferred* where the choice is put to more than one person (the composer), *Choose this / Chosen* where the chooser alone decides (📧, and ⏱️'s pen-held composer already reads *Choose this*). Typing still chooses; the radio says so. No question.

### A3 — A value is always its clause sentence

**Ed wrote**: 31 🌍 *"Members only" => "The document can only be seen by members."*; 32 record *"members only" => "The document can only be seen by members." / "anyone with the link" => "The document can be seen by anyone with the link."*; 50 record *"a new proposal every 90 minutes" should be the full constitutional sentence*; 56 record *The chosen "82%" should be a full sentence*; 03 🧭 *write all the preset clauses as they would appear in the constitution*.

**Reading.** Three places still print a value as a short label instead of the sentence the constitution prints: the parked motion's block on the settled card (`wordsFor`'s labels — *Members only*), the record card's head (`motionDisplay` — *Anyone with the link*, *82% sure at the end*, *a new proposal every 90 minutes*) and the record's before/after blocks (`wordsFor` again — *members only*, *82%*). All three take the clause sentence (`RULES` / the `*_RULE` builders / `wordsFor` rewritten to return the sentence). The 🧭 note is the same rule reaching the shape card: each shape's block states what the shape sets as constitution sentences.

**Two shape consequences.** (i) The record card loses its head and its two hairlines (32: *Remove the top "Anyone with the link" and top two hairlines*; 56: *Remove "82% sure at the end" and double hairline*) — the card becomes eyebrow → block (what stood) → block (what was chosen, with its provenance radio) → the speaker → OK, and with no head it takes Q1173's no-hairline rule. (ii) On the **rejected** record (50) Ed asked only for the full sentence, not for the head to go — **Q1186** asks whether the rejected record takes the same headless two-block shape.

### A4 — The delegation sentence names both alternatives

**Ed wrote**: 09 🌍 *"The membership will decide if the document can be seen only be members or by anyone with the link."*; 24 🌍 delegated *"The membership will decide if the document can only be seen by members or by anyone with the link."*; 11 🤝 *"The membership are deciding whether new members may only join by invitation or whether anyone with the link may apply."*

**Reading.** The `DECIDING` table (session-view.html:5240) gets its sentences rewritten to state both alternatives where a setting has two. Two things to settle: Ed writes **"will decide"** on 🌍 twice and **"are deciding"** on 🤝, and Q1150 chose *are deciding* for all eleven; and the both-alternatives form fits the binary settings (🌍 🤝 💤 ⏰ 👁️) but not the ladders (🪪 🥾 🌡️ 👤) or the numbers (⏱️ 👥). **Q1185**.

### A5 — The copy that goes

Straight cuts, each one instance of *strip copy right back*:

| card | goes |
| --- | --- |
| 01 🪶 | the top hairline (the card has an empty placeholder head, so `.field`'s border draws over a control with no head above it) |
| 02 📍 | the title *Link* and the top hairline |
| 03 🧭 | the title and *A shape sets the rules the way a document of that kind usually runs. You can change any of them afterwards.* |
| 30 📍 | *docs.vote/d/… is taken, so this one is docs.vote/d/…-3b3f.* (`takenSo`) |
| 36 🤝 | *One motion proposes one rule; what you do not touch stands.* (`oneMotionOneRule`, session-view.html:4910) |
| 39 🎩 | *Settled. Now that people are voting, the Founder joins the same way as anybody else.* |
| 46 💡 / 47 ⚖️ | the whole body — provenance line, the explainer, the *Open —* line and the wallet count; the card is its head and its OK |
| 52 ✒️ / 53 🛡️ (given up) | *Given up — one way. The road back is the members' reserve motion.* and the hairline above it |
| 61 🪶 seat:1 | *If it passes it goes to the Founder, who may assent or refuse.* (`crownWaits`, two sites at 7123/7127) — **reading 1189: removed everywhere it appears**, not on 🪶 alone |
| 63 ✉️ seat:1 | both policy sentences (*Anyone may be proposed…* and *An invitation is constitutional…*) |
| 66 📧 Log In | the title, the hairline, the paragraph and the *Your email* label |

### A6 — A close-only OK on every card that asks nothing

**Ed wrote**: 45 🍾 settled *This should have an "OK" button*; 52 / 53 *This should have an "OK"*.

**Reading.** Round 2 gave settled ✒️ 🛡️ 🎩 a close-only OK (1167 b's grammar); 🎩 got it, the power tabs in their given-up state did not, and settled 🍾 never had one. **Reading 1190**: every card whose commit row is 🗑️ alone gains the close-only OK — the two given-up power tabs, a held power tab seen by a non-founder, settled 🍾, and the stranger's read-only cards if they survive Q1183.

### A7 — Anonymous is the avatar, not the word

**Ed wrote** on 06 and 41 🖼️: *It shouldn't say "Anonymous" but instead show the Anonymous avatar* / *"Anonymous" should be the avatar, not the word.*

**Reading.** The first block of `pictureBody` draws what Anonymous looks like for this member — initials where they have a name, the anonymous mark otherwise (Q1165's rule) — via `avHtml`, in place of the word. No question.

### A8 — Clause and grant rewrites

- 07 ✒️: *…You can give up these powers if you choose to.* → *…You can give up these powers **later** if you choose to.*
- 08 🛡️: *You can later give up this power if you choose to.* → *You can give up this power later if you choose to.*
- 10 🪪 (the three clause sentences, so the constitution, the founding card and settled 35 move together):
  - *Any member may propose to invite someone to join the membership, but all members must agree 🏛️.*
  - *Any member may propose to invite someone to join the membership, and the membership decides ✏️.*
  - *Any member may invite someone to join the membership at will ✒️.* (Ed wrote *Any members* — read as a typo, **reading 1191**.)

### A9 — The composer starts blank, in an outlined box

**Ed wrote**: 29 🪶 *The new title option should start out unfilled and in a composer box that has an outline. Text the same size as the status quo.*; 30 📍 *Alternative option should start out blank*.

**Reading.** The second block's lane is empty (placeholder only), drawn as an outlined composer box (`.titlelane` in `.opttext` today has no outline), its text at the head's size — the head's title is `.headdoct` at `--t-lead` and 600, so the composer lane matches it. 📍's field likewise starts blank. The ✒️/✏️ stay disabled until something is typed, which they already do.

### A10 — 🌡️'s method note in the blue box

**Ed wrote** on 19 and 54: the Bradley–Terry–Davidson sentence *is important and shouldn't be in tiny text, but also shouldn't be in clause text. Maybe use a blue highlight box that we use elsewhere.*

**Reading.** The box is `.unlocks` (setup.css:88 — `--primary-subtle` ground, `--primary-emphasis` ink), which 🍾 and 👑 use. `.methodnote` takes that treatment, at `--t-ui` rather than the box's `--t-cap` (**reading 1192** — "not tiny" is the instruction; `--t-ui` is the card's button and title size). Position unchanged: above the rungs on the founding card, below the standing rule on the settled one. The *read more* link stays (1156/1157: the explainer carries the precision).

### A11 — Three smaller geometry notes

- 35 🪪 *Vertical spacing is inconsistent.* Three implementations of an option block sit on one card: the head's `.headrule.asblock`, the composer's `.propblock` + `.lanebar` lanes, and `.pick`. The lanes become `.pick` blocks so one rule spaces them, verified by measurement.
- 39 🎩 *It should just be the "Choose this" option button that's greyed out, not everything on the card.* `.pick.off` dims the whole block (setup.css:253). **Reading 1193**: a block whose radio cannot be pressed keeps its text at full ink and greys the radio alone — on every `.pick.off`, not 🎩's only (🪜's *Rising* under a perpetual document is the other user).
- 44 ❌ *make the dropdown taller; its text should be clause-text sized.* The `select` takes `--t-body` and the option block's line height.

### A12 — The two Ed asked back

- 23 🍾: *The text/membership/everything else power selection is a bad design. Switches was better, but maybe there is something better still. Would you like to propose something? We have 3 x 2 binary choices to make, ideally it should stay with the existing card design language as much as possible but clarity and compactness are important.* → **Q1181**, asked with mockups.
- 58 👤: *This doesn't seem to conform to the pattern set by other cards at all, in several ways. We should talk about it.* The specimen is the settled card **while a constitutional motion is in flight** on it — the consent card: a *Re-opened…* paragraph, a count line, the blind sentence, three bare-word blocks (*Keep what stands / I accept the change / Abstain*) each with an explainer, *🗑️ Withdraw* and an unlabelled commit. Every one of those is a thing round 2 removed from the other cards. → **Q1182**.

### A13 — The three "when is this shown?"

- 60 *What the Founder Has Laid Down* (seat:1·rel:rel-1): *When is someone shown this card?* — the `release-batch` news card (SURFACE C8a, E9): every member is served it once per act that lays powers down, until they press OK. In the specimen it is 🍾 laying ✒️ and 🛡️ down on the Text. → **Q1184**.
- 64 🪶 / 65 📍 (seat:stranger): *This seems wrong. When is this card shown?* — the stranger's door: a stranger clicking a constitution paragraph's tab opens the read-only card (`hydrateFromModule`, Q510) — *Set to … / Set by the founder when the document was made.*, with the ✒️ 🛡️ power tabs in its strip and 🗑️ alone. It predates every round of this review. → **Q1183**.

### A14 — ✉️ on a member's seat

**Ed wrote** on 63: *We have replaced the single invite box with the multi-invite. There shouldn't be an invite button; the submit button actions the invite.*

**Reading.** Round 2's reading 3 left the member's composer lane deliberately unchanged; Ed is now extending Q1166 to it: the same multi-line box, no *Invite* button, the route's commit (🏛️ or ✏️) in the row is the act. What a box holding several addresses does at a member's price is **Q1187** — a member may hold one 🏛️ motion at a time.

### A15 — Provenance on a founder-set rule

**Ed wrote** on 49 ⏱️: *"Members may make a new proposal ✏️ every 3 hours." should have "Chosen by [whoever it was chosen by]"*.

**Reading.** The standing block's provenance radio is drawn only where the membership chose the value (`byRoom`, session-view.html:5669). Ed wants it on every standing rule, naming who chose it. → **Q1188** for the wording where the founder did.

---

## Part B — The notes, card by card

Sheet order, every note verbatim, the pattern it lands in after it.

## 01 · 🪶 Title (`founding·title`)

Remove top hairline

→ A5.

## 02 · 📍 Link (`founding·slug`)

Remove title and top hairline
Button shouldn't have a green background!

→ A5, A1.

## 03 · 🧭 What Type of Document Is This? (`founding·shape`)

Remove "What Type of Document Is This? A shape sets the rules the way a document of that kind usually runs. You can change any of them afterwards."
"A meeting" => "This document is for a meeting"
"A conference" => "This document is for a conference"
"Ongoing" => "This document is perpetual"
"Custom" => "The Founder will decide every setting by hand"

With the helper copy on each of the presets, can you instead write all the preset clauses as they would appear in the constitution? Only the ones that are preset by the choice, not the ones that must still be chosen.

→ A5, A3. Each shape block: its sentence as Ed wrote it, then under it the clauses its `sets` produce (`SHAPES` in `packages/constitution/src/shapes.ts` — 🌡️ 🪜 👥 👤 👁️ 🌍 ⏱️ 🥾; 💤 is set but hidden for meeting and conference, so it is printed only for ongoing; `machines` has no clause), built by the same rule builders the constitution prints with. The custom block carries its sentence alone. The rung labels stop being `ctlWord` control words and become clause text.

## 06 · 🖼️ Your Picture (`founding·mypic`)

It shouldn't say "Anonymous" but instead show the Anonymous avatar

→ A7.

## 07 · ✒️ Founder Actions (`founding·grant-pen`)

"You can give up these powers if you choose to." => "You can give up these powers later if you choose to.

→ A8.

## 08 · 🛡️ Founder Veto (`founding·grant-shield`)

"You can later give up this power if you choose to." => "You can give up this power later if you choose to."

→ A8.

## 09 · 🌍 Visibility (`founding·chamber`)

"The membership are deciding if the document can be seen by anyone with the link." => "The membership will decide if the document can be seen only be members or by anyone with the link."

→ A4 (Q1185). *only be members* read as *only by members*.

## 10 · 🪪 Admissions (`founding·admission`)

"Members may propose to invite people to join the membership, and all members must agree 🏛️." => "Any member may propose to invite someone to join the membership, but all members must agree 🏛️."
"Members may propose to invite people to join the membership, and the membership decides ✏️." => "Any member may propose to invite someone to join the membership, and the membership decides ✏️."
"Members may invite people to join the membership at will ✒️." => "Any members may invite someone to join the membership at will ✒️."

→ A8.

## 11 · 🤝 Applications (`founding·applications`)

"The membership are deciding whether anyone with the link may apply to become a member." => "The membership are deciding whether new members may only join by invitation or whether anyone with the link may apply."

→ A4 (Q1185).

## 16 · ✉️ Invite a Member (`founding·invite`)

Submit button should not be green.

→ A1.

## 19 · 🌡️ Proposal Pass Threshold (`founding·bar`)

"docs.vote uses the Bradley–Terry–Davidson voting method to decide whether a proposal ✏️ passes. It uses probability to compensate for when only a small fraction of the membership vote — read more." is important and shouldn't be in tiny text, but also shouldn't be in clause text. Maybe use a blue highlight box that we use elsewhere.

→ A10.

## 23 · 🍾 Begin (`founding·begin`)

Button should not be green.
The text/membership/everything else power selection is a bad design. Switches was better, but maybe there is something better still. Would you like to propose something? We have 3 x 2 binary choices to make, ideally it should stay with the existing card design language as much as possible but clarity and compactness are important.

→ A1, A12 (Q1181).

## 24 · 🌍 Visibility (`delegated·chamber`)

No green on the button.
"The membership are deciding if the document can be seen by anyone with the link." => "The membership will decide if the document can only be seen by members or by anyone with the link."

→ A1, A4 (Q1185).

## 29 · 🪶 Title (`settled·title`)

The new title option should start out unfilled and in a composer box that has an outline. Text the same size as the status quo.

→ A9.

## 30 · 📍 Link (`settled·slug`)

Alternative option should start out blank
Remove "docs.vote/d/the-hollow-oak-club-house-charter is taken, so this one is docs.vote/d/the-hollow-oak-club-house-charter-3b3f."
No green on button.

→ A9, A5, A1.

## 31 · 🌍 Visibility (`settled·chamber`)

"Members only" => "The document can only be seen by members."
No green on button.

→ A3 (the parked block), A1.

## 32 · Passed: Anyone with the link (`settled·rec:chamber:0`)

Remove the top "Anyone with the link" and top two hairlines.
"members only" => "The document can only be seen by members."
"anyone with the link" => "The document can be seen by anyone with the link."

→ A3 (the record's head goes; the blocks take the sentences).

## 35 · 🪪 Admissions (`settled·admission`)

Vertical spacing is inconsistent.

→ A11.

## 36 · 🤝 Applications (`settled·applications`)

Remove "One motion proposes one rule; what you do not touch stands."

→ A5.

## 37 · 💤 Do Memberships Lapse? (`settled·lapse`)

The "A membership lapses" option should have a radio button.

→ A2.

## 39 · 🎩 Is the Founder a Member? (`settled·hat`)

It should just be the "Choose this" option button that's greyed out, not everything on the card.
Remove "Settled. Now that people are voting, the Founder joins the same way as anybody else."

→ A11 (reading 1193), A5.

## 41 · 🖼️ Your Picture (`settled·mypic`)

"Anonymous" should be the avatar, not the word.

→ A7.

## 42 · 📧 Your Email (`settled·myemail`)

Email composer is the second option, so there should be a "Choose this" radio

→ A2.

## 43 · ✉️ Invite a Member (`settled·invite`)

No green on button

→ A1.

## 44 · ❌ Remove a Member (`settled·remove`)

Can you make the dropdown taller; its text should be clause-text sized.

→ A11.

## 45 · 🍾 Begin (`settled·begin`)

This should have an "OK" button.

→ A6.

## 46 · 💡 Proposals (`settled·canpropose`)

Remove "The Founder began the document, granting every member the right to propose changes to it. A proposal is a change you write to the document, for the membership to vote on. Open — members can propose as soon as they arrive. You hold 5 ✏️s to propose with."

→ A5. The OK's own job (the grant, the pencil storm) is unchanged; only the words go.

## 47 · ⚖️ Voting (`settled·canjudge`)

Remove "The Founder began the document, granting every member the right to vote on what is proposed. A vote is your say on a proposal: you are shown two at a time and choose the one you prefer, or neither. Open — the constitution is settled."

→ A5.

## 49 · ⏱️ Proposal Rate (`settled·rate`)

No green on button
"Members may make a new proposal ✏️ every 3 hours." should have "Chosen by [whoever it was chosen by]"

→ A1, A15 (Q1188).

## 50 · Rejected: 6 each, up to 8, one every 180 minutes (`settled·rec:rate:0`)

"a new proposal every 90 minutes" should be the full constitutional sentence

→ A3 (Q1186 for the shape).

## 51 · ⏰ When Does It End? (`settled·ending`)

"The drafting process will end on" should have a radio button "Prefer this"

→ A2.

## 52 · ✒️ Can the Founder Make Amendments at Will? (`settled·pw:u:ending`)

remove "Given up — one way. The road back is the members’ reserve motion." and the hairline above it
This should have an "OK"

→ A5, A6.

## 53 · 🛡️ Does the Founder Have a Veto? (`settled·pw:a:ending`)

remove "Given up — one way. The road back is the members’ reserve motion." and the hairline above it
This should have an "OK"

→ A5, A6.

## 54 · 🌡️ Proposal Pass Threshold (`settled·bar`)

"A proposal passes when the members are" should have a radio button "Prefer this", since it is an option
"docs.vote uses the Bradley–Terry–Davidson voting method to decide whether a proposal ✏️ passes. It uses probability to compensate for when only a small fraction of the membership vote — read more." should be in a blue box

→ A2, A10.

## 56 · Passed: 82% sure at the end (`settled·rec:bar:0`)

Remove "82% sure at the end" and double hairline
The chosen "82%" should be a full sentence.

→ A3.

## 57 · 👥 Quorum (`settled·quorum`)

"Quorum is []% of the membership." should have a radio button "Prefer this"

→ A2.

## 58 · 👤 Anonymous Proposals (`settled·authorship`)

This doesn't seem to conform to the pattern set by other cards at all, in several ways. We should talk about it.

→ A12 (Q1182).

## 60 · What the Founder Has Laid Down (`seat:1·rel:rel-1`)

When is someone shown this card?

→ A13 (Q1184).

## 61 · 🪶 Title (`seat:1·title`)

Remove "If it passes it goes to the Founder, who may assent or refuse."

→ A5 (reading 1189).

## 62 · 🌡️ Proposal Pass Threshold (`seat:1·bar`)

The second option should have a "Prefer this" radio

→ A2.

## 63 · ✉️ Invite a Member (`seat:1·invite`)

Remove "Anyone may be proposed as a new member, and every member has to agree — one refusal keeps them out."
Remove "An invitation is constitutional, because the membership is what quorum is a fraction of: all members must agree, and one who says no keeps them out."
We have replaced the single invite box with the multi-invite. There shouldn't be an invite button; the submit button actions the invite.

→ A5, A14 (Q1187).

## 64 · 🪶 Title (`seat:stranger·title`)

This seems wrong. When is this card shown?

→ A13 (Q1183).

## 65 · 📍 Link (`seat:stranger·slug`)

This seems wrong. When is this card shown?

→ A13 (Q1183).

## 66 · 📧 Log In (`seat:stranger·strlogin`)

Remove the title, hairline, "Members log in by email: enter the address the membership knows you by, and follow the link it sends. Nothing here says whether an address is a member’s.", "your email",
Send the link should be a submit button in the bottom right.

→ A5, and **reading 1194**: the field alone in the body (placeholder *you@example.com*), the send as the commit row's right-hand button — a 📧 glyph under Q1171's rule (*a button offering an act wears its glyph alone*), armed by a valid address.

---

## Part C — Questions and readings

**Blocking, asked one at a time (multiple choice):** 1181 🍾's power table; 1182 the consent card; 1183 the stranger's settled cards; 1184 the release-batch card; 1185 the delegation sentences; 1186 the rejected record's shape; 1187 ✉️'s multi-address box at a member's price; 1188 provenance wording where the founder chose.

**Readings, built unless vetoed:** 1189 `crownWaits` goes everywhere; 1190 close-only OK on every 🗑️-only card; 1191 *Any members* → *Any member*; 1192 the method note at `--t-ui` in the box; 1193 `.pick.off` greys the radio alone, everywhere; 1194 the login card's send is a 📧 glyph commit. 1195 spare.

### Answered (Ed, 2026-09-05 evening, one at a time in chat)

- **1181 — six clause blocks, glyph toggles.** Each power on each zone is one option block stating the *kept* rule as a constitution sentence; where the radio would sit stands the power's own glyph as a toggle — plain for kept, wearing the wallets' red strike (`--slash`) for laid down, pressed to flip. Six blocks, not twelve; no Kept / Laid down words.
- **1182 — the consent card takes the settled shape, with act-naming radios.** Every block is full clause text: the standing rule first with **Keep this**, the proposed rule beneath with the proposer's sealed rationale and **Prefer this**, then **Abstain** on its own row like Indifferent. No Withdraw. Everything else goes (the *Re-opened* paragraph, the count, the privacy sentence, the explainers, the blind note). **The commit is 🏛️ — on every answer to a constitutional question**, the founding answer cards included; ✓ is left to ordinary judgments and personal cards. SURFACE C4 and §7 are amended (Ed's *the founding answers are a kind of 🏛️*, made literal).
- **1183 — a stranger's tab opens the settled card, read-only**: the standing rule as block one with its provenance radio, the power and record tabs in the strip, a close-only OK. The *Set to / Set by the founder* card retires.
- **1184 — no release card at 🍾; kept for later releases.** The start's own news (💡 ⚖️) and the settled 🍾 card's list cover the Text's ✒️ 🛡️; a power laid down after the start is still one news card per act, stripped to its list and its OK. SPEC §9.7 rule 3 gains the exception.
- **1185 — both alternatives on the five binaries, *will decide* everywhere.** 🌍 🤝 💤 ⏰ 👁️ name their two answers; the ladders and numbers keep a one-clause subject; all eleven read *The membership will decide…* — **Q1150's tense is reversed.** 🍾's count lines follow the subjects.
- **1186 — the rejected record takes the passed record's headless two-block shape**: eyebrow, the rule that stands with its provenance radio, the refused rule with the sealed rationale and no radio, OK. The narrated *kept … as it stood* sentence goes.
- **1187 — one motion per address; a single-line box where only one may be proposed.** At ✏️ price every line raises its own motion and costs its own ✏️; at 🏛️ price (one at a time) the box allows one line.
- **1188 — *Chosen by the Founder ✒️* everywhere the founder chose**, one wording for both eras; the record card's *Chosen by Founder Action ✒️* changes to match. *Chosen by the membership* is the other wording.

**Ed's mid-round note:** *✔️ should still be green* — Q1174 stands; A1 is the emoji commits alone.

### Built (2026-09-05, late evening) — the handover for QA

Everything in Part A and every answer above is on `main`, unpushed. Documents first (SURFACE, SPEC v0.98, STYLE T48 and item 82, SPEC-REASONING R-087, DECISIONS, CLAUDE.md glossary, README), then the module (the start owes no release batch — `begin()` no longer calls `oweReleases`; `begin.test.ts` and `promise-holder.test.ts` amended; the golden log re-frozen), then the page (session-view.html, setup.js, copy.js, setup.css, system.css; `journey-walk.mjs` drives the glyph toggles; `card-audit.mjs` exempts the anonymous picture rung from T5), then the freeze (`qa:freeze`: probe references incl. a first `design/reference/copy.js`, both copy goldens, the founding golden).

**Green**: `spec-check`, `typecheck`, `lint`, `build`, `npm test` (every workspace — run the constitution package from its own workspace; from the root, `bundle-fresh` resolves `src/browser.ts` against the wrong cwd and fails for that reason alone), `founding-walk`, `journey` (the zones read Kept / Laid down / Mixed off the toggles), `powers-walk`, `slider-walk`, `slug-walk` (first run red on the cold-server outbox race the memory records; green on the re-run), `applicants-walk`, `ladder`, `room-walk`, `motions`, `probe-coverage`. `probe` had 154 diffs before the freeze and 0 allowed, as a real page change should. **card-audit** (1600×1000): H2 2 · H4 1 · P7 2, all pre-existing (🍾's hold sentence, ✉️'s one-voice paragraph, the two tab-switch pixels), and one new T5 which was the anonymous block's per-member initials — exempted in the audit; P2 · P3 · S1 are gone with the record and consent cards' rebuild. The second window size was not run tonight. **seat-matrix**: findings 56 · noRule 6 · unstood 6 · errors 1, with no baseline payload to compare against (it is gitignored); the unstood cells are the clerk hat's 🍾/lapse/ladder steps and the founder's `ok-propose` / `ok-judge`, and the one error is `[member/applicant] TypeError: … reading 'closed'` — none obviously this batch's, none verified as not.

**The sheet** is re-captured from the built tree and republished to the same URL as version *round-3 built*: 77 specimens (the 🍾 release card is gone by Q1184), renumbered, notes saving to `notes/round-2026-09-05-qa/cards`. The builder is a scratch script beside the capture (Q1145 still open).

**Residuals**, filed as **Q1195** (a)–(d): where a mover withdraws a constitutional motion now that the consent card has no Withdraw; whether an answer's 🏛️ is held or clicked (built as a click, flying nothing); the mixed zone's look under the glyph toggle (built struck with a tooltip); and the reversal of Q1129's wallet-count sentence on 💡, cut on Ed's note 46.
