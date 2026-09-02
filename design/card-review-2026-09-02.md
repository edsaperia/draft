# Card review — Ed, 2026-09-02

**What this is.** Ed reviewed the Card Specimen Sheet card by card and wrote notes on
twenty-four of them. This file carries every note **verbatim**, sorted so that the rules
which repeat across many cards are stated once, and marks the places where a note reverses
a ruling already on the record. It is a working document: **delete it once the review is
folded**, the way `design/spec-pass/pass-N.md` is deleted once its answers are in.

**Precedence.** Ed's notes win over anything in this file. Where a note contradicts
SPEC.md, SURFACE.md or STYLE.md, the document is amended — it does not veto the note — but
the amendment is a separate, deliberate act with its own commit, and where the note
contradicts a *numbered ruling* it is flagged in Part D so Ed can see what he is reversing
before it is built.

**Order of work.** Documents first, then code: a card change that lands before the rule it
implements makes the rule retroactive fiction. Part E sequences it.

---

## Part 0 — Standing context

For a session with none of the conversation this came from.

- **The sheet** is at https://claude.ai/code/artifact/bdd96cfd-768a-4354-adf1-619cf827ccb5 —
  78 specimens, every card kind from the birth to the close, each cropped out of the live
  surface at its real geometry with the queue card that opens it on its right.
- **It is generated**, not hand-built: `node design/tools/card-audit.mjs --specimens=<file>`
  keeps, for every card the audit opens on all seven walks, the page pruned to the boxes
  that position that card. Committed at `be8c3a0`. The sheet's *builder* and its geometry
  verify are still scratch scripts — whether they join the repo is **Q1145**, open.
- **Two things the capture taught us**, both of which will bite anything that renders a card
  outside its page: `design/session-view.html` carries a **third stylesheet inline in its
  own head** beyond `system.css` and `setup.css`; and the page has **no doctype**, so every
  surface renders in **quirks mode** and a mount that declares one draws every option block
  three pixels taller. Whether the missing doctype is fixed is **Q1146**, open.
- **Card keys** in this file are `walk·key` and match the sheet's own headings, so any note
  can be traced back to the specimen it was written on.
- **Tree at the time of writing**: `main` at `1a43af3`, two commits ahead of `origin/main`
  plus another session's `dd73389`. Nothing here is pushed. **A push is a deploy.**

**Guards that must stay green through this work**: `npm run spec-check`, `npm run copy-check`
(red until `npm run copy-freeze`, and its diff is what a STYLE pass reads), `npm run
card-audit`, `node scripts/founding-walk.mjs`, `npm run journey`, `npm run qa:freeze` at the
end of the batch.

---

## Part A — The rules that repeat

Six patterns account for most of the notes. Each is **one change**, not twelve, and each
should land as one commit with its own SURFACE/STYLE amendment.

### A1 — The card's title goes

**Ed wrote**, on 🌍 🪪 🤝 🎩 💤 🥾 ⏱️ ⏰ 🌡️ 👥 👤 👁️ and on settled 🌍:

> Remove the title.

**Reading.** On a settings card the head is the card's own question — *Do Memberships
Lapse?*, *When Does It End?* — sitting above the option blocks. Since CP1 every option
block states the rule it would set as a full sentence, so the title restates in four words
what the blocks say completely, and Ed is cutting the restatement. **The note is on every
option-block settings card and on none of the others**: 🪶 Title, 📍 Link, ✋, 🖼️ and the
grant cards keep theirs, and none of them is a set of rule-stating blocks.

**Lands in**: SURFACE §9's card rows (the *head* column for the setting row) and §8's
`ORDER` table; the head is drawn in `design/session-view.html`.

**Scope is a question — Q1151**: the title is not only the head. It is also the tab's
tooltip, the rail entry's label and the name the record uses. Removing the head does not
by itself answer what those say.

### A2 — The blind note goes

**Ed wrote**, on 🌍 🪪 🤝 💤 🥾 ⏱️ ⏰ 🌡️ 👤 (nine cards), in each case the whole of:

> Remove "Not now — every member states what they will accept, blind, before drafting
> begins, and the document takes the answer that satisfies all of them. …"

**Reading.** This is the paragraph explaining the founding's consent rule, with a
per-setting tail explaining which direction that setting's collection runs in (*the most
private answer wins*, *the document takes the dearest*, *the longest*, *the latest*). Ed is
cutting the explanation entirely, on every card that carries one.

**Lands in**: `BLINDNOTE` at `design/setup.js:1211` and its nine call sites, plus the
per-setting tails; SURFACE §9's *body* column; STYLE.md's helper-text rules.

**Q1152**: the collection is still blind after this — nothing about the mechanism changes.
Whether a member is told that anywhere else, and if so where, is not answered by the note.

### A3 — The delegation sentence becomes per-setting

**Ed wrote**, on eleven cards, always the same shape:

| card | replacement |
| --- | --- |
| 🌍 chamber | "The membership are deciding if the document can be seen by anyone with the link." |
| 🪪 admission | "The membership are deciding how new members may join." |
| 🤝 applications | "The membership are deciding whether anyone with the link may apply to become a member." |
| 💤 lapse | "The membership are deciding whether inactive members lapse." |
| 🥾 removal | "The membership are deciding how a member is removed." |
| ⏱️ rate | "The membership is deciding how often members should be able to make proposals." |
| ⏰ ending | "The membership are deciding when changes may longer be made to the document." |
| 🌡️ bar | "The membership are deciding what proportion of votes a proposal ✏️ needs to pass." |
| 👥 quorum | "The membership is deciding how many members must vote on a proposal ✏️ before it can pass." |
| 👤 authorship | "The membership is deciding if anonymous proposals are allowed." |
| 👁️ judgments | *(sentence replaced; text as written on the card)* |

each replacing:

> "The Founder is letting the membership decide this rule themselves."

**Reading.** One generic sentence becomes one sentence per setting, naming the question
being decided. This is the same move `meaningOf` already makes for 👥 ⏱️ 💤 🪜 🌡️
(`packages/constitution/src/meaning.ts`) — *what choosing a value would do, in this room* —
and the new sentences should live in one table beside it rather than being written at each
call site, because there are **two** call sites for the current sentence
(`design/session-view.html:5502` and `:6039`) and a hand-written string at each would drift.

**Two things to carry through**: ⏰'s reads *when changes may longer be made* — the word
**no** is missing, and it should read *may no longer be made*. And Ed writes **"are
deciding"** on eight and **"is deciding"** on three — **Q1150**.

### A4 — The commit button loses its blue

**Ed wrote**:

> **📍 Link (founding·slug)** — Submit button shouldn't have a blue background, it should be
> the same as 01 (title)
> **✉️ Invite a Member** — ✒️ should not have a blue background.
> **🍾 Begin** — The commit button shouldn't have a blue background.
> **📍 Link (settled·slug)** — ✒️ shouldn't have a blue background
> **🌍 Visibility (settled·chamber)** — 🛡️ and ✒️ shouldn't have a blue background.

**Reading.** The filled commit treatment (`.btn.btn-approve`, `design/system.css:1890`,
`background: var(--primary)`) goes, and the commit button takes the same outline treatment
the other commits already wear — which is what *"the same as 01 (title)"* points at, 🪶
Title's own commit row being the reference Ed names.

**This reverses a standing ruling** — CLAUDE.md's `proposal-row` entry says *Propose is
blue, not green* — so it is **Q1153**, and it needs to say what the treatment becomes, not
only what it stops being.

**Lands in**: `design/system.css` (`.btn-approve` and the `.commitrow .btn` block from
`:1493`), SURFACE §9.1, STYLE.md if the change has a copy half.

### A5 — The founder's own commit moves left, beside the route's

**Ed wrote**:

> **🪶 Title (settled·title)** — The ✒️ should be next to ✏️ on the left
> **📍 Link (settled·slug)** — The ✒️ should be next to ✏️ on the left
> **🌍 Visibility (settled·chamber)** — The 🛡️ should be next to ✒️ on the left

**Reading.** On a settled card where the founder still holds a power, the card offers the
route's commit *and* the pen (`founderPair`, `mayPenOn(k)`). Today they sit at the right of
the row. Ed is grouping them at the left.

**This reverses SURFACE §9.1's own sentence** — *Indifferent at the left …, the ✓ at the
right* — so it is **Q1154**: whether the whole commit row re-orders, or only the pair.

### A6 — The commit button loses its word

**Ed wrote**:

> **🪶 Title (settled·title)** — Remove "Propose" from the ✏️ button
> **📍 Link (settled·slug)** — Remove "Propose" from the ✏️ button
> **🍾 Begin** — Remove "Begin" on the button

**Reading.** The commit becomes its glyph alone. **Q1155**: on these three cards, or on
every card that commits — the charter's proposal row wears *✏️ Propose* too, and K18 names
it (*✏️ hold → ✏️ Submitted*).

---

## Part B — The notes, card by card

Sheet order. Every note verbatim; the reading and the file follow it.

### 📍 Link (founding·slug)

> Submit button shouldn't have a blue background, it should be the same as 01 (title)

→ **A4**. Nothing else on this card.

### 🧭 What Type of Document Is This? (founding·shape)

> remove "- every rule is a card."

→ A fragment of 🧭's body. `design/setup.js`'s shape body; `copy-check` will redden.

### ✋ Your Name (founding·myname)

> Remove small "Your name" above input box.
> Remove avatar.
> Remove "This is how you appear to the membership. Leave it blank and you appear as
> Anonymous. You can set it later from any seat."
> Have radio button with two options, the first option is the name composer, the second
> option is "Anonymous".

→ **The card becomes an option-block card** (CP1), with the field carried inside the first
block the way 🌡️'s *A number of my own* carries its field. The label, the avatar preview
and the helper paragraph all go.
**Q1164**: SPEC §9.0c says a blank name *is* Anonymous — *a name, not a gap*. With
Anonymous as its own option, a blank first block and the second block mean the same thing
by two routes, and the spec sentence needs re-reading.
**Lands in**: `design/setup.js` (the ✋ answer body), SURFACE §9's ✋ row, SPEC §9.0c.

### 🖼️ Your Picture (founding·mypic)

> Emoji should be slighty larger
> It should be a "Choose this" multiple choice card, the "currently" should be the top
> option (status quo), then "Upload an image", then "Pick an emoji", with the emoji picker
> opening when that option is selected.
> Remove "or drag one onto this box. It is scaled down and saved as a still, so an animated
> picture stops moving." and "With no picture you appear as your initials." helper text

→ Same move as ✋: `pictureBody` becomes three option blocks in the stated order, the
picker opening on selection rather than standing open. The emoji size is `.emojiface`'s
`font-size: 1em` — note the CLAUDE.md rule that **an emoji is a glyph, not a disc** and
takes the size of the text it stands in, so "slightly larger" is a change to the block's
text size or an explicit exception, not a nudge to a box.
**Q1165**: what the *Currently* block reads when nothing is set yet, which is every
founder's first sight of this card.
**Lands in**: `pictureBody` in `design/setup.js`, `.emojiface` in `design/system.css`,
SURFACE §9's 🖼️ row.

### ✒️ Founder Actions (founding·grant-pen)

> Remove body text "You hold Founder Actions" from the queue card
> Remove "Founded by Ada Lovell" line
> Remove "You founded this document, and Founder Actions came with it."
> Replace "Founder Actions are yours: you can change this document’s rules yourself,
> without asking anybody. You can hand them over later." with "As the founder of this
> document, you have the power to change settings and edit the document at will. Founder
> Actions are denoted by ✒️. You can give up these powers if you choose to."

→ Three removals and one replacement. The first is a **rail** change, not a card one: the
queue entry's subtitle. STYLE T4 already says *a task you have to do carries no subtitle;
subtitles survive on a motion and on news* — a grant is news, so this narrows T4 rather
than applying it. The *Founded by* line is the Founded line (F16), which is this card's
head. **Q1170**: whether it goes from the three grant cards only or wherever it appears.

### 🛡️ Founder Veto (founding·grant-shield)

> Remove body text "You hold the Founder veto" from the queue card
> Remove "Founded by Ada Lovell" line
> Remove "You founded this document, and Founder veto came with it."
> Replace "The Founder Veto is yours: a change other people agree on waits until you accept
> it. You can hand it over later." with "As the founder of this document, you have the power
> to veto choices that the membership make. Founder Veto is denoted by 🛡️. You can later
> give up this power if you choose to."

→ As ✒️, same shape. Note this is the card CLAUDE.md records as a **probe blind spot** —
its copy has only ever been verified by rendering the labels directly — so the change wants
eyes on the rendered card, not only a green `copy-check`.

### 🌍 Visibility (founding·chamber)

> Remove the title
> remove "Not now — …"
> Change "Only members can see the document." to "The document can only be seen by members."
> Change "Anyone with the link can read the document." to "The document can be seen by
> anyone with the link."
> Change "The Founder is letting the membership decide this rule themselves." to "The
> membership are deciding if the document can be seen by anyone with the link."

→ **A1**, **A2**, **A3**, plus two clause rewrites into the passive. The clause sentences
are the ones the constitution prints, so the rewrite moves the **document's own text**, not
just the card's — SURFACE Y-rules and STYLE §3. There is also a known residual here: 🌍's
**composer lane** hand-writes its own copy (`PROPOSE.chamber`) instead of reading the
clause table, so this string has two homes and both must move (Q1112 (b)'s residual, on the
record at QUESTIONS.md's 1143–1144 entry).

### 🪪 Admissions (founding·admission)

> Remove the title.
> Remove "Not now — …"
> Change "The Founder is letting the membership decide this rule themselves." to "The
> membership are deciding how new members may join."
> Change "Members may invite people to join the membership ✒️." to "Members may invite
> people to join the membership at will ✒️."

→ **A1**, **A2**, **A3**, plus one clause rewrite adding *at will*.

### 🤝 Applications (founding·applications)

> Remove the title.
> Remove "Not now — …"
> Change "Membership is by invitation only." to "New members may only join by invitation."
> Change "Anyone may apply to join — an application is voted on like an invitation." to
> "Anyone with the link may apply to become a member."
> Change "The Founder is letting the membership decide this rule themselves." to "The
> membership are deciding whether anyone with the link may apply to become a member."

→ **A1**, **A2**, **A3**, plus two clause rewrites. Note the second drops *an application
is voted on like an invitation*, which was the sentence tying 🤝 to 🪪's price; the tie is
still true (SPEC §9.7½) and now goes unsaid on this card.

### 🎩 Is the Founder a Member? (founding·hat)

> Remove the title.
> Change "The Founder is a member — drafting, voting, counting towards quorum and answering
> the founding questions like anybody." to "The Founder is part of the membership."
> Change "The Founder only runs the document — no ✏️s, no votes, counting towards nothing,
> with nothing to answer. A clerk can stay unnamed." to "The Founder is not part of the
> membership."

→ **A1** plus two clause rewrites that cut the consequences and keep the fact. Worth
knowing what is being cut: *a clerk can stay unnamed* is the sentence that told a founder
their name is optional, and ✋'s own note says the same thing in its clerk branch — so the
information survives on ✋ and only on ✋ after this.

### 💤 Do Memberships Lapse? (founding·lapse)

> Remove the title
> Change "Nobody ever drops out of the count, however long they are away." to "After
> [composer] days, inactive members lapse and automatically abstain from votes."
> Change "They lapse" to "Inactive members never lapse and are still counted towards votes."
> Change "The Founder is letting the membership decide this rule themselves." to "The
> membership are deciding whether inactive members lapse."
> Remove "Not now — …"

→ **A1**, **A2**, **A3** — and **the two option rewrites look paired with the wrong
options**. *Nobody ever drops out of the count* is the **no-lapse** option and is being
given the lapse sentence; *They lapse* is the **lapse** option and is being given the
never-lapse sentence. Built verbatim, the card would set the opposite of what it says.
**Q1149** — do not build this card until it is answered.
**Q1168**: *automatically abstain from votes* is a claim about what lapsing does. SPEC
§9.5a should be read before the sentence is printed.

### 🥾 How Is a Member Removed? (founding·removal)

> Remove the title
> Change "Removing a member needs every member to agree, including them 🏛️." to "To remove
> a member, all members must agree 🏛️."
> Change "Removing a member needs every other member to agree 🏛️ — they see the proposal,
> and it is decided without them." to "To remove a member, all members *apart from them*
> must agree 🏛️."
> Change "Members may propose to remove a member, and the membership decides ✏️." to "To
> remove a member, a majority of members must agree ✏️."
> Change "The Founder is letting the membership decide this rule themselves." to "The
> membership are deciding how a member is removed."
> Remove "Not now — …"

→ **A1**, **A2**, **A3**, plus three clause rewrites. **Q1163**: the third says *a
majority of members must agree ✏️*, and ✏️ does not mean a majority — it passes at the
approval threshold, which 🌡️ sets and which is a confidence rather than a share. As
written the clause would be false on most documents.

### 🏛️ Constitutional Proposals (founding·grant-voice)

> Remove "Your consent counts in every constitutional question"
> Remove "You founded this document, and Constitutional Proposals came with it. All members
> must agree for a constitutional proposal 🏛️ to pass, and this is your consent in that. One
> at a time, and it comes back whole when the question settles or you withdraw it."
> Change "When the document begins, members may propose changes to rules and vote on
> proposals. A proposal ✏️ passes when it meets the approval threshold; all members must
> agree for a constitutional proposal 🏛️ to pass. Nobody amends a rule at will, and no
> passed change waits on anyone’s assent, unless a rule says so." to "When the document
> begins, members may propose changes to rules and vote on proposals.<br>A proposal ✏️
> passes when it meets the approval threshold.<br>A constitutional proposal 🏛️ passes only
> when all members agree."

→ The first is the rail subtitle again (**see ✒️**). The replacement is **three lines with
explicit breaks** — the first multi-line body on these cards; whether that is `<br>` or
three paragraphs is a rendering choice, and STYLE's body rules should say which.
What the replacement drops is *Nobody amends a rule at will, and no passed change waits on
anyone's assent, unless a rule says so* — the sentence that told a member the **default**
is no pen and no veto. On a document where the founder has laid both down, nothing else
says it.

### ✉️ Invite a Member (founding·invite)

> remove "Anyone may be proposed as a new member, and every member has to agree — one
> refusal keeps them out. The Founder may invite people at will, and refuse invitations and
> applications that the membership pass."
> remove "An invitation is just the link, sent by email: somebody becomes a member when they
> open it, and is listed as invited until then."
> Remove the single address option
> Remove "several at once" text
> Replace the ✔️ submit button with the ✒️ button from the "several at once" composer.
> Change "Paste addresses here, one per line" to "name@example.com<br>one address per line"
> ✒️ should not have a blue background.

→ The card collapses to one box: the multi-line address field with the pen's own commit.
**Q1166**: the "single address" path is `directInvite` — the box that appears *only where
the viewer's word sends* (SURFACE E31). Removing the option may mean removing the
distinction, or only the choice between two boxes; those are different builds.
The new placeholder is two lines, so it is a `data-placeholder`, and note that the
placeholder rules on this surface put drawn placeholders out of the text flow.
**A4** applies to the ✒️.

### ⏱️ Proposal Rate (founding·rate)

> Change "Members start with [] proposals ✏️ each, up to a maximum of []. They get an
> additional ✏️ every [] minutes. A proposal costs one ✏️, and one that passes gives it
> back." to "Members may make a new proposal ✏️ every [] [minutes/hours/days selector]."
> The starting number of ✏️ should be fixed at 3, and the maximum at 3.
> Change "The Founder is letting the membership decide this rule themselves." to "The
> membership is deciding how often members should be able to make proposals."
> Remove Not now — …"
> Remove the title.

→ **A1**, **A2**, **A3** — and **a mechanism change**, see Part C1.

### ⏰ When Does It End? (founding·ending)

> Remove the title.
> Change "At a set time" to "No more changes to the document may be made after [time/date
> picker]."
> Change "The drafting process has no set end — it runs until too few members are active."
> to "Changes to the document may be made perpetually."
> Change "The Founder is letting the membership decide this rule themselves." to "The
> membership are deciding when changes may longer be made to the document."
> Remove "Not now — …"
> Remove "Moving the date is a proposal ✏️ like any other. Taking the end date away
> altogether needs every member to agree, because with no end date the approval threshold
> cannot rise, and every change made so far was made under one that did."

→ **A1**, **A2**, **A3**, plus the option rewrites — the first block now states its rule
with the picker inline in the sentence, which is exactly the shape Q1137 gave ⏱️. The last
removal cuts the sentence explaining **why ⏰ carries two routes on one card** (the line
falls inside the setting: moving the date is ordinary, removing the ending is
constitutional — CLAUDE.md's *The two kinds of decision*, Q329). The route behaviour does
not change; only the explanation goes.
Note *perpetually* replaces *runs until too few members are active* — the freeze is real
(SPEC §9.5) and after this the card does not mention it.

### 🌡️ Proposal Pass Threshold (founding·bar)

> Remove the title.
> Change "Uses the Bradley–Terry method to allow for a decision with few votes" to
> "docs.vote uses the Bradley–Terry–Davidson voting method to decide whether a proposal ✏️
> passes. It uses probability to compensate for when only a small fraction of the
> membership vote."
> Change "Nearly everyone must vote for a change for it to pass 90%" to "For a proposal ✏️
> to pass, nearly all members that voted on it must prefer it to the alternatives."
> Change "Most of the membership most vote for a change for it to pass 80%" to "For a
> proposal ✏️ to pass, most of the membership that voted on it must prefer it to the
> alternatives."
> Change "A bare majority voting for a change is enough for it to pass 60%" to "For a
> proposal ✏️ to pass, a majority of the membership that voted must prefer it to the
> alternatives."
> Remove the "A number of my own" option.
> Change "The Founder is letting the membership decide this rule themselves." to "The
> membership are deciding what proportion of votes a proposal ✏️ needs to pass."
> Remove "Not now — …"
> Remove "In a membership of one, nothing can pass at 90% until more members arrive."
> Remove "In a membership of one, nothing can pass at 80% until more members arrive."
> Remove "In a membership of one, the one vote must be for it."

→ **A1**, **A2**, **A3**, and four separate reversals. See Part C2. One thing settled
already: **Davidson is correct** — the engine fits it (`fitDavidson`,
`packages/engine-core/src/ranking/davidson.ts`, used by `ranking/ceiling.ts`), so the method named in the
new copy is accurate.

### 👥 Quorum (founding·quorum)

> Remove the title.
> Change "Asked as / The quorum is a share of the membership — the number moves as members
> join and leave." to "[% picker] of the membership must vote on a proposal ✏️ before it can
> pass."
> Change "The quorum is a fixed number of members, however the membership changes." to
> "[number picker] members must vote on a proposal ✏️ before it can pass."
> Remove the "The Number / I set it " option (it's integrated into the other options).
> Change "The Founder is letting the membership decide this rule themselves." to "The
> membership is deciding how many members must vote on a proposal ✏️ before it can pass."

→ **A1**, **A3**, plus a restructure: two blocks, each carrying its own picker, and the
separate number field folded into them. See Part C3.

### 👤 Anonymous Proposals (founding·authorship)

> Remove the title
> Change "Nobody who proposes a change is ever named, even after the document is finished."
> to "All proposals are made anonymously."
> Change "Nobody who proposes a change is named unless they choose to sign it themselves."
> to "Proposals may be made anonymously."
> Change "Whoever proposes a change is named when the document is finished, and not before."
> to "All proposals are made anonymously, and all names are revealed when no more changes can
> be made."
> Change "Whoever proposes a change is named when the document is finished — sooner, if they
> choose to sign it." to "Proposals may be made anonymously, and all names are revealed when
> no more changes can be made."
> Change "Whoever proposes a change is named from the moment they propose it." to "Proposals
> may not be made anonymously."
> Remove "If you choose this yourself, members can end up named without having agreed to it."
> Remove "Not now — …"

→ **A1**, **A2**, and five clause rewrites across the whole 👤 ladder. Two things to carry
in: Q995 ruled **one word for the close across both ladders — "at the end"**, and these
rewrites say *when no more changes can be made*, which is a third phrasing; and 👁️'s ladder
uses the same vocabulary, so the two must move together or Q995 breaks. The removed
sentence is the **warning** that choosing a naming rung yourself can name members who never
agreed to it — that is the protective note behind §3.5a, and cutting it is a deliberate
choice worth Ed's eyes.

### 👁️ When Are Votes Revealed? (founding·judgments)

> Remove the title
> Change "The Founder is letting the membership decide this rule themselves." to "The
> membership are deciding if votes are revealed."

→ **A1**, **A3**. Nothing else — but see 👤 above on the shared vocabulary.

### 🍾 Begin (founding·begin)

> Come back to this, put editing it on the backlog.
> The commit button shouldn't have a blue background.
> Remove "Begin" on the button

→ **A4**, **A6**, and a **backlog entry** for the card's redesign rather than a change now.
**Q1169**: what the backlog entry should say — 🍾 is the one card where the whole of what
*beginning* means is written down, so "come back to this" wants a scope before it is filed.

### 🪶 Title (settled·title)

> The rationale composer should be raised
> The ✒️ should be next to ✏️ on the left
> Remove "Propose" from the ✏️ button

→ **A5**, **A6**, plus *the rationale composer should be raised* — the *Why are you
changing this?* field moves up the card. Above what is not stated; the card is head → value
field → why → commit row, so the only move available is above the value field. Flagged as a
reading, not a question, because there is one place it can go.

### 📍 Link (settled·slug)

> Change "Every link this document has ever had keeps working: changing it leaves a redirect
> behind, so an invitation somebody was sent weeks ago still opens the right document." to
> "Previous URLs continue to work."
> Remove "Suggested from the title — "
> ✒️ shouldn't have a blue background
> The ✒️ should be next to ✏️ on the left
> Remove "Propose" from the ✏️ button

→ **A4**, **A5**, **A6**, plus two copy cuts. *Suggested from the title —* is the machine
saying it picked the address, which is `S.slugAuto`'s whole distinction (*the address is the
machine's until you touch it, and the machine says when it picks*). On the **settled** card
that sentence has no work to do, and the note is on the settled card only — the founding
card's own version is not touched by this review.

### 🌍 Visibility (settled·chamber)

> Remove the title
> It should be like an option card, with the top option as the status quo text, and the
> second option as the new text with "Chosen by the membership" underneath
> 🛡️ and ✒️ shouldn't have a blue background.
> The 🛡️ should be next to ✒️ on the left

→ **A1**, **A4**, **A5**, plus a **new card shape**: a settled setting drawn as two option
blocks — what stands, and what is proposed — with the provenance under the second.
**Q1167**: 🌍 only, or every settled setting; and what the top block reads on a setting
nobody has proposed a change to.

### Passed: Anyone with the link (settled·rec:chamber:0)

> This should have an OK button
> It should be like an option card, with the top option as the status quo text, and the
> second option as the new text with "Chosen by Founder Action ✒️" underneath

→ The same new shape, with the provenance line naming the **route** instead of the
membership. **Q1167** covers the shape; the OK is its own question — records are filed
history and are not acknowledged today, and an OK on one is a new obligation with an
`ACK_KEYS` entry behind it.

---

## Part C — The three that are not copy

### C1 — ⏱️ becomes one number

**What Ed asked for**: the sentence becomes *Members may make a new proposal ✏️ every []
[minutes/hours/days selector].* — **the starting grant and the maximum are both fixed at
3**, and the only thing anybody chooses is the interval.

**What it touches.** `RateValue` is `{ grant, cap, dripMinutes }`
(`packages/constitution/src/catalogue.ts:223`), and its consent rule orders on all three —
*higher grant, then higher cap, then a faster drip* (`:230`). With grant and cap constant
the ordering reduces to the drip alone, which is simpler and wants saying explicitly rather
than left as dead comparisons. SPEC §7 and §13 state the wallet and the flat stake; the
maximum is currently a cap on **accrual and not on possession**, with a clamp owed
(Q949) — fixing the cap at 3 does not remove that.

**Questions**: **Q1160** (is the shape change confirmed, and does the stake stay 1 with
refunds unchanged), **Q1161** (is the unit selector display only, with minutes still the
stored value — the drip runs on real minutes everywhere, per CLAUDE.md).

### C2 — 🌡️ stops being a confidence and starts being a share

Four separate reversals in one card:

1. **The card now states the method.** STYLE §1 and T15 say the opposite: *never the
   maths — the surface says vote; confidence, comparison and Bradley–Terry are engine
   vocabulary*. The new copy names Bradley–Terry–Davidson and probability. **Q1156.**
2. **The rungs now describe a share of voters.** *nearly all members that voted on it must
   prefer it* is a different claim from what the number is — the threshold is a
   **win-probability** a challenger must clear, which is why a room of one tops out at 79%
   and a bar of 80 never clears (Q840). At 60% the new sentence and the mechanism disagree
   most visibly. **Q1157.**
3. **"A number of my own" goes**, reversing Q1104 (b), which put the field-carrying last
   block there deliberately. **Q1158.**
4. **The ceiling notes go** (`ceilingNote`, `design/setup.js:1303`), reversing Q840, which
   added them because a room of one cannot reach a high bar and nothing else says so.
   **Q1159.**

None of these is wrong for Ed to want. All four are reversals, and the two documents that
carry them (STYLE.md T15, `design/SPEC-REASONING.md`) must be amended in the same batch or
the next reader will "fix" the copy back.

### C3 — 👥 folds the field into the options

**What Ed asked for**: two blocks, *[% picker] of the membership must vote…* and *[number
picker] members must vote…*, with the separate *The Number / I set it* option removed
because it is now inside them.

**What it collides with**: Q341, *delegate the decision, not the field* — a delegated
question collects the **binding scalar** (the quorum number) while the **form** (share or
fixed) is pacing and stays with the founder. That is why the card has two eyebrows today.
Folding the form and the number into one pair of blocks makes them one question again.
**Q1162** — this may be exactly what Ed wants (the founder still holds the form; the blocks
just carry the number), in which case it is a layout change and Q341 stands; or it may be a
reversal of Q341. The two readings build differently.

---

## Part D — Questions for Ed

Numbers claimed in QUESTIONS.md.

1149. **💤's two rewrites look swapped.** *Nobody ever drops out of the count* is the
    no-lapse option and is given the lapse sentence; *They lapse* is the lapse option and is
    given the never-lapse sentence. Do the sentences swap, or do the **options** swap order
    so that lapse comes first?
1150. **"The membership are" or "is"?** Eight of the new sentences say *are*, three say
    *is*. One or the other, everywhere.
1151. **"Remove the title" — how far?** The head goes. Does the card's name also leave the
    tab tooltip, the rail entry and the record, or does it stay everywhere except the head?
1152. **With the blind note gone, is a member told the collection is blind at all**, and if
    so where? The mechanism is unchanged.
1153. **The commit button's blue.** Reverses *Propose is blue, not green*. What treatment
    does it take instead — 🪶 Title's outline commit, as the 📍 note implies? And is this
    every commit on every surface, the charter's proposal row included?
1154. **✒️/🛡️ beside ✏️ on the left.** SURFACE §9.1 says the commit is at the very right and
    Indifferent at the left. Does the whole row re-order, or does the founder's pair move to
    the left of the route commit with 🗑️ still leftmost?
1155. **Glyph-only commits.** Is *Propose* dropped from every ✏️ commit, or only on 🪶 and
    📍 where the note was written?
1156. **🌡️ may now state the method.** This reverses STYLE T15. Confirm, so T15 is amended
    rather than quietly broken.
1157. **🌡️'s rungs now describe a share of voters**, where the number is a win-probability.
    Should the copy say what the number *is*, or is describing it as a share the deliberate
    simplification? At 60% the two readings diverge.
1158. **Removing "A number of my own"** reverses Q1104 (b). Confirm.
1159. **Removing the ceiling notes** reverses Q840. Confirm — a founder of a one-member room
    will otherwise set a bar that nothing can clear, with nothing on the card saying so.
1160. **⏱️: grant and cap fixed at 3**, the setting reduced to the interval. Confirmed? The
    stake stays a flat 1 and a passing proposal still refunds?
1161. **⏱️'s minutes/hours/days selector** — display only, with minutes still stored, or a
    stored unit?
1162. **👥: is the form still the founder's?** If the two blocks simply carry the number,
    Q341 stands and this is layout. If the member is now choosing share-or-fixed too, Q341 is
    reversed.
1163. **🥾's ✏️ sentence.** *a majority of members must agree ✏️* — ✏️ passes at the approval
    threshold, not a majority. Reword, or is *majority* the deliberate plain-English stand-in
    (which would be the same decision as Q1157)?
1164. **✋ with Anonymous as its own option** — what does a blank name in the first block
    mean? SPEC §9.0c says a blank *is* Anonymous.
1165. **🖼️'s *Currently* block before anything is set** — what does it read on a founder's
    first sight of the card?
1166. **✉️: does `directInvite` go, or only the choice between two boxes?** The single-address
    box appears only where the viewer's word sends; removing the option could mean either.
1167. **The settled-card option shape** — status quo on top, proposal beneath with its
    provenance. 🌍 only, or every settled setting? What does the top block read where nothing
    is proposed? And does the **record** card really gain an OK, which is a new obligation?
1168. **💤: "automatically abstain from votes"** — is that what lapsing does? SPEC §9.5a
    should be read before this is printed.
1169. **🍾's backlog entry** — what is the scope of the redesign being deferred?
1170. **The *Founded by* line** — does it leave the three grant cards only, or everywhere it
    appears?

---

## Part E — Suggested order

1. **Answer Part D**, at least 1149 (💤 would ship inverted), 1153–1155 (the commit row is
   one change across every card) and 1160–1162.
2. **Amend the documents**: SURFACE §9's card rows and §9.1; STYLE.md T15 and the helper-text
   rules; SPEC §7/§13 for ⏱️ with a version bump and Ed's sign-off; `design/SPEC-REASONING.md`
   for the reversals of Q840, Q1104 (b) and possibly Q341.
3. **The cross-cutting builds**, one commit each: A1 title, A2 blind note, A3 the per-setting
   sentence table, A4+A5+A6 the commit row.
4. **The card rebuilds**: ✋ and 🖼️ as option-block cards, the three grant cards, ✉️, then the
   settled shape for 🌍 and its record.
5. **The mechanism builds**: ⏱️ last, because it moves the catalogue, the consent rule, the
   composer and `meaningOf` together.
6. **`npm run qa:freeze`** at the end, and re-run the specimen capture so the sheet shows the
   new cards.
