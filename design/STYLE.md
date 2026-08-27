# STYLE — what the surface says, and how

The rules a piece of surface copy has to pass. Every string a member can read
— card heads, option labels, notes, tooltips, rail teasers, mail bodies — is
audited against this list; code comments are not surface copy and are exempt.
The reasoning behind each rule lives in `design/DECISIONS.md`; this is the
checklist. Written at stage 8 (2026-08-21), when the two surfaces became one
and their copy was read side by side for the first time.

## 1. Vocabulary

| Say | Never | Why |
|---|---|---|
| **founder** | admin, convenor (on the surface) | "Convenor" survives only in SPEC and engine code. |
| **member**, **membership** | roster, participant | `roster` and `participant` are code words. |
| **approval threshold** | the bar, θ | And it is a **confidence**, not a vote share — the copy has to keep saying so. |
| **proposal rate**, ✏️ | tokens, the economy, credits | The currency is the act. |
| ✏️ *anybody may propose changing it* / 🏛️ *a constitutional change* | ordinary | "Ordinary" is engine vocabulary; the kind pair is glyphic. *Constitutional* survives. |
| ✒️ *any unilateral act in the document* | the Founder's pen | **✒️ means any unilateral act; the Founder only starts with it** — 🪪 at ✒️ is every member's word admitting whom they like, and a resignation is always ✒️ (Ed, 2026-08-26, entry 94). The same three verbs price every act on the membership: 🏛️ everyone must agree · ✏️ the membership decides · ✒️ the act is its own consent. |
| *everyone answers, and when everyone is ready the document begins* | ceremony | What is left is what happens. |
| **inactive** | quiet (of a membership) | |
| **Anonymity** | Privacy (the section) | |
| **task**, **card** | queue-card | Copy says tasks; the design system names the objects cards. |
| **document**, **charter** | draft (for the thing being made) | `draft` means a candidate patch everywhere in this project. |
| **the record** | rolling log hash, audit log (as a noun a member meets) | No engine jargon on a card. |
| **the standard rate** | v1 defaults | No project-speak. |
| *A, B and C* | *A and B and C*, *A, B, and C* | Three or more things in one sentence take commas and a final *and*, with no serial comma — the register these documents already write in. The shape is a decision and it is made **once**: `listOf` in `design/setup.js` is the only joiner, never a join written at the site (Q630). |

Glyph names are stable: title 🪶, link 📍, membership 🪪, applications 🤝,
lapse 💤, removal 🥾, rate ⏱️, machines 🤖, ending ⏰, quorum 👥, threshold 🌡️,
pacing 🪜, naming 👤, signing ✍️, reveal 👁️, visibility 🌍, text 📄,
founder-is-member 🎩, proposing gate 💡, judging gate ⚖️, crown 👑, horn 📯.

## 2. Addresses and numbers

- **No spec references.** §-numbers cite a document members never see. Say the
  rule, not its address.
- **Raw values are not copy.** Never print an unformatted datetime, a float, a
  ratio. A threshold is `66%`; a time is *at 14:00 on 3 September*; a countdown
  follows the `session-clock` ladder (days beyond a week, hours inside one,
  20-minute steps inside six hours, 10-minute steps inside the hour, never
  finer, never seconds).
- **A count, never a direction**, wherever a question is still running: *4 of 9
  have answered*, never *leaning to keep*.
- **A ceiling the room can reach is floored to the whole percent, never
  rounded** — a bar equal to the number printed is one the room can clear, and
  one above it is not. A room of one reaches 0.7978, which reads *79%*: rounding
  would print 80, and 80 is the first bar that room can never clear.

## 3. Person and tense

- **The document reads identically to every reader.** Constitutional
  sentences are third person — *The document ends at…*, never *Your document
  ends at…*. What varies between readers is which tasks they hold, never the
  text.
- **A paragraph states the document's rule, never your own answer** —
  blindness intact.
- **"You" belongs to tasks and cards**: a card asks you; a clause tells
  everybody.
- One sanctioned exception: in the members list *you* stand at the **top** on
  your own line (Ed, 2026-08-21), with *(nobody else here yet)* **above** you
  until somebody arrives — a statement about the list, not a caption on you
  (Q753). A clerk has no row there, so the list reads *(nobody here yet)*.
- And the birth's title clause, where the Founder meets the word for the first
  time, says *(that’s you!)* once and only there (Ed, 2026-08-27, entry 140) —
  only the Founder ever sees the birth, and after the save the same clause is
  byte-identical to what every other reader gets.

## 4. Titles and labels

- **Task titles are Title Case**; bare nouns drop their article (*Title*,
  *Link*, *Text*).
- **A title says what kind of answer it wants**: *Is the Founder a member?*
  wants yes or no; *How many ✏️s do members start with?* wants a number.
  **Quorum** and **Approval threshold** stay nouns — terms of art that plainly
  want a number.
- **A rename reaches the option labels**, not just the headings.
- **A task you have to do carries no subtitle.** Subtitles help you choose
  which task to open, so they survive only on a motion (the value proposed)
  and on news (what happened).
- **A settled card's head is the rule, not the task's name.**

## 5. Bodies and notes

- **A shared body must not hard-code one caller's frame** — the quorum body
  takes the form (count or share) rather than assuming one.
- **Read-only copy must survive the spec it summarises.** "Fixed for the life
  of the document" predated motions and was false; the lockline says what
  changing a setting actually takes, by kind.
- **Section headings carry no intro prose.**
- **The price is said in words exactly once**, at the act: *the edit is spent
  at Propose*. Nowhere else repeats it — the flying pencil teaches it.
- **Grey means nothing is being asked of you.** A note that asks nothing wears
  no hot colour and no glyph (the alpha flag is the model).
- **Decided is a word, not a glyph**: *OK* on anything that only wants to have
  been seen — there is no glyph in common use for *I have taken this in*.

## 6. Mail

- The mail is itself the login. Its copy lives in one template object
  (`MAILS`), one substitution from the real transactional template, and owes
  nothing to the surface's look.
- Subject lines name the document: *you have created a document called
  [title]*.

## 7. The audit (stage 8, 2026-08-21)

Run over `design/session.js`, `design/setup.js` and `design/session-view.html` after the merge — every
string literal a member can read, against §§1–6. Findings and fixes are
listed below as they land; a finding that is *not* fixed says why.

Scanned: every string literal in `session.js`, `setup.js` and the page, comments stripped (the earlier tally of 31 "ordinary" and 17 "the bar" in session-view.html was almost entirely comments). Findings:

1. **Fixed** — race-card foot *"…unless the leader clears the bar"* → *"…clears the approval threshold"* (§1).
2. **Fixed** — the wallet's *"No edits left…"* / *"Your edits — proposing one costs…"* and the disabled-button title named the currency after what it buys; now ✏️ (§1 — the wallet was renamed `propose-wallet` for the same reason).
3. **Fixed** — the 📄 task was titled *Starting Text*; there is no starting text (Q440), so *Text*.
4. **Open — Q502** — 🪜 *How Does the Bar Get There?* is named that way in CLAUDE.md and breaks §1. Ed's call.
5. **Dropped** — the fixture topbar's *confidence bar 74% ▲* stat did not survive the merge: the threshold is not topbar material (`session-clock`).
6. **Passed** — the B2b strings (*you have judged this — it is still running*, *wants your judgment*, *yours · in the race*, *decided — adopted*, *decided — the current text stood*, *retired — the current text stood*, *you judged this*, the two refusal sentences, *today*/*yesterday*): third person about the document, second person only where the card asks; no addresses; a count never a direction.
7. **Noted, not surface** — `kind: 'ordinary'`, `settledBy === 'ceremony'`, `holder === 'convenor'` are engine vocabulary in data, never rendered; the surface says them only through the glyph pair.

**Second pass (the design-day builds, 2026-08-21, 07:40)** — over every string the builds of Q460/462, the glyph batch, Q501/503 and Q466/471 added (listed in their commit messages):

8. **Fixed — Q502 answered** — 🪜 is *Rising Approval Threshold?*, a yes/no title for a yes/no card (Ed).
9. **Fixed** — three *starting text* strings (*Waiting on the starting text…*, *when the starting text has been decided*) → *the text* (Q440).
10. **Fixed** — the preamble's *Ordinary proposals ✏️ pass…* → *Proposals ✏️ pass…*; setup.js's removal rung *An ordinary proposal ✏️* → *A proposal ✏️ like any other* (§1: "ordinary" never on the surface).
11. **Passed** — the birth's new mail (*you have named a document “T” and chosen its address, docs.vote/S — open this link to create it there*), the 📍 verdicts (*docs.vote/S is taken. docs.vote/S-2 is free.*), the power-card lines (*The Founder edits the text directly* / *A change to the text that carries waits on the Founder's OK before it lands*), 🤝's ladder copy (*the least open answer wins: one member who wants invitation only keeps it so*), *Save* on identity, the clock ladder (*6 days left* … *under 10 minutes left*, *Frozen*, *Closed 3 September*), *quorum 2 of 3*: third person about the document, second where a card asks, counts never directions, no addresses, no raw values.
12. **Open** — the clock says *Frozen* without *— N must return* until the module serves the count (close, server half).

**Third pass (10:20)** — over the strings of items 4–7 (wallets and grants, 🍾, 🥂, the closed page, the stranger's door): the scan for §1's banned words and §2's addresses is clean. Passed by reading: the grant whys, the 🍾 batch lines, the 🥂 card (*Dissent is as welcome as praise — or nothing at all.*), the closed page's *Undecided at the close · the text that stands*, the door's holding sentences and *If that address is on the membership, a link is on its way* (no oracle in the copy either). 13. **Fixed in passing** — the Founded line named the viewer, not the founder. 12 is closed: the clock reads *Frozen — N must return* from `mustReturn`.

**Fourth pass (review #2, 2026-08-21)** — the strings the stranger's door prints, read against what the module actually holds rather than against each other:

14. **Fixed** — the door printed the page's own defaults as the document's rules: an undecided setting showed a built-in value as if it had been set, and a settled one read *Set to undefined* where the page had no field for it. The door now hydrates from the module through the member surface's own mapping, and an undecided rule says who is deciding it instead of naming a value (§2's *a count, never a direction* has a sibling: **a value, never a guess**).
15. **Fixed** — *Set by the founder when the document was made.* on every rule, including the ones the room decided. The shared body now takes its sentence from the caller (§5), and the door says *Decided by the members.* Whether the member surface follows is **Q510**.
16. **Fixed** — *0 of 7 have answered* at the door, whatever the room had done: the door serves no counts by rule, so the sentence carried a number it could not know. It says *the members are answering.*
17. **Fixed** — under an open join policy the card was titled *Join* and promised *the link it sends is the login*, and no link was ever sent (Q509). It states the policy and offers the login it can do.
18. **Fixed** — the Founded clause vanished for a founder who set no name, taking the founding moment with it; a blank name is *Anonymous* (§9.0c), and the clause now waits on the start rather than on the name.

**Fifth pass (the founder's walk, 2026-08-21)** — every task from a blank arrival to a settled constitution, read in the order the founder now meets them (`node scripts/founding-walk.mjs`, which drives the whole founding headless and prints each card's strings).

19. **Fixed** — 🎩 was titled *Is the Founder a member?*, the one question title not in Title Case (§4).
20. **Fixed** — 🪜 described its neighbour as *the number on the last card*: a body naming another card by its position, which the new pacing could have made false and which said nothing to a reader who had not just been there. It names the approval threshold (§5).
21. **Fixed** — ✋ *Your Name* can now be saved empty (a blank name is Anonymous, §9.0c, and in a single-file founding a task that cannot be committed is a task nothing gets past), so the card had to say what saving it empty does (§5: the meaning is stated once, at the act).
22. **Fixed** — the commit's tooltip went stale the moment a typed number woke the button, so it said *Not answered yet* over a live control. One expression (`commitTitle`) now writes it from both the render and the live refresh, the title card's own wording included.
23. **Passed by reading** — the eighteen task bodies and their option labels against §§1–6: no banned vocabulary, no §-numbers, no raw values, second person only where a card asks, third person in every clause. The clause a settled card produces states the rule and appends only its deviations.
24. **Noted, not surface** — with nothing pre-answered, three cards (⏱️ 🌡️ 👥) open on a lone *I set it* rung with its fields beside it and no visible alternative, because delegation lives on the ✒️/🛡️ tabs by design. Legible once chosen; **Q511** asks whether the founder should meet a delegation default at all.

**Sixth pass (the pacing rework, 2026-08-21)** — the strings the birth's fading clauses, the delegation rung, the 📧 rework and the button pass added or changed.

25. **Fixed** — the title arrived as *Untitled*, helper text standing where the answer goes: the heading is blank until it is named, and the lane asks *Give this document a title* (was *Name this document*).
26. **Fixed** — ⏱️'s commit stayed dark with no reason given when the maximum was below the number members start with. The card says so.
27. **Passed** — the birth's clauses (*The document is titled “X”. The Founder may change this at will.*): third person about the document, the pen stated because at the birth it is true by construction, and no sentence about decisions from a membership that does not exist yet.
28. **Passed** — *Delegate to the membership* (Q511) and its note: it says what delegating does and when the room answers, and never the word *ordinary*.
29. **Passed** — 📨 *Resend* on the 📧 commit row, and *📨 Send* where the address has been edited since: a resend to a new address is not a resend, and the label says which act it is.

**Seventh pass (Ed's answers, 2026-08-21)** — the power lines, the threshold clause and the writing invitation.

30. **Fixed — Q507** — one voice, only the object changing. Every ✒️ line is *the Founder [does X] at will* (was *directly* on the membership and the Text); every 🛡️ line is *[what the membership decides] requires assent* (was *comes to the Founder as a 👑 question* / *waits on the Founder's OK before it lands*). The radio labels and the card whys follow, per §4's *a rename reaches the option labels*.
31. **Fixed — Q512** — 🪜's clause is gone; the ramp is a clause of 🌡️'s: *The members must be 78% sure a change is better for it to carry by the end, starting at 55% when judging opens.* A fixed threshold, or a ramp starting where it ends, says nothing extra.
32. **Passed — Q513(c)** — the writing invitation: *Start writing whenever you like. The document's own words are the last thing the constitution settles, so nothing here is being asked of you yet.* Grey, no glyph, asks nothing (§5).

**Eighth pass (Ed's answers, 2026-08-21 afternoon)** — the vocabulary change and the birth's third clause.

33. **Fixed — the surface says *pass*, not *carry*** (Ed: *I prefer "pass" to "carry", I think it's clearer*). His vocabulary, now the rule: **a member proposes; the membership passes and rejects proposals; the Founder assents, refuses, and amends.** So *reject* is the membership's word and *refuse* is the Founder's, and the 👑 question's buttons say Accept / Refuse. The *bear a name* sense of carry survives untouched — *no proposal ever carries a name* is about bearing, not passing — as does the module's own `carried` status, which nobody reads.
34. **Fixed — one clause for the two powers**: *The Founder may amend this at will, and refuse proposals that the membership pass.*
35. **Fixed** — 📨 lost the word *Resend*; the glyph says it and the tooltip says which act it is.
36. **Fixed** — two sentences left the 📧 card: *Sent to [address]. Nothing exists yet, so a typo here still costs nothing.* and *Opening the link in the mail creates the document at docs.vote/[slug] and carries you to it.* The first was reassurance about a state nobody is in danger from; the second is now the document's own clause — **The Founder is checking their email for a link.** — which wears the 📧 tab, so the founder reaches their address from the document rather than from a card that repeats itself.

**Ninth pass (Q531–Q532, 2026-08-22)** — the toolbar and the shield's grant. Read with `npm run founding`, which is what surfaced 37 and 38: both were invisible in the code and obvious in the walk.

37. **Fixed — 🛡️ had no clause of its own.** It fell through to the generic *The Founder is deciding this.* before its OK — wrong twice, since nothing is being decided and the sentence says nothing — and to *You hold the shield* after it. `decisionLine` now carries the branch, mirroring the pen: **The Founder holds the shield on 16 settings.** / **The Founder holds no shield.** §3: a constitutional sentence is third person, and *You hold the shield* is a card's voice in a clause's place.
38. **Fixed — a grant says who gave it, and the shield's said nothing.** Its card opened straight into the explanation, where every other grant names the act that conferred the power first — which is most of what tells a reader whether it can be taken away again. Now **You founded this document, and the shield came with it.** / **The membership returned the shield to you.**
39. **Fixed — *decline* is not in the vocabulary.** The shield's body said *you cannot write with it, only decline*; the Founder **refuses** (§1, eighth pass, 33).
40. **Fixed — the ✏️ socket restated the price.** Its bubble read *Each proposal spends one*, where §5 says the price is said in words exactly once, at the act — and it already is, on the Propose control. Now: **You can propose changes to the text. A ✏️ comes back if the membership passes yours, and more arrive as the document runs.** The 🪶 bubble keeps *Each one spends a feather*, and that is the same rule rather than an exception: nothing else on the surface says what a founding act costs, so the bubble is its "exactly once".
41. **Passed — the socket bubbles say the symbol, then the verb** (Ed: *don't name the item — just have the symbol, larger than in the wallet, and then explain what it is using the verb; keep the language as clear and functional as possible, using verbs and nouns that relate to concrete things on the page*). Naming a thing is not explaining it, and the glyph has already said which one it is. Each sentence starts with who can do what, and every noun in it is something the reader can point at — the text, a setting, a ✒️ tab, the membership, an address. **Held and not-held differ by subject**: holding it, the sentence is about *you*; not holding it, it names *who can*, which is the question a struck-through tool actually raises, answered without a word of apology.

**Tenth pass (Q639–Q641, 2026-08-22)** — the two grant clauses, on Ed's own reading: *the information is restated on other settings; these clauses only exist to give "Your Pen" and "Your Shield" news a home.*

42. **Cut — *The Founder holds the pen on 16 settings.* and its shield twin.** A count is the weakest form the fact has, and it was the third telling of it: `holderLine` puts *The Founder may amend this at will* on every setting the power turns, and the ✒️ socket's own tooltip says *You can change 16 settings yourself, without asking anybody* in the second person, where it is worth knowing. It was also the one form that went stale, since laying a power down changed a sentence three sections away from the card that did it. The tabs move to the **Founded line** — *Founded by [avatar] [name] 👑* — which is in the opening run, carries no power tabs of its own to collide with, and already wears the mark that means *holds either power*: the crown stops being a tooltip and becomes the way in.
43. **Fixed — a grant is the holder's** (SURFACE E8's own audience column). A **member** was served two ⏳ tabs titled *Your Pen* and *Your Shield*, about powers they do not hold, could never acknowledge and were never asked about. It hid behind the clauses while they existed — the tab had a sentence beside it — and retiring them would have left two unexplained tabs on a colophon. What the founder holds is stated where it bites, on each setting's own clause.
44. **Passed — *Founded by Anonymous 👑.* before the founder has given a name.** It reads oddly for a moment and it is right: §9.0c makes an unnamed member Anonymous, and the same argument that made an unnamed document read *Untitled* rather than a blank applies here — the line states the result so far, and the eye is drawn to the thing it can still answer.

**Eleventh pass — the card audit (2026-08-23, Q732–Q706)** — the first pass that is not chronological. The ten above each read whatever had just been built, which leaves two blind spots: a chronological audit cannot see *between* cards, though T5, T9 and §1's glyph table all quantify over the whole surface; and every finding in ten passes is a sentence, none is a measurement, though the rules governing Ed's three lenses (**helper text · spacing and positioning · buttons**) are numeric and already written down. So `design/tools/card-audit.mjs` (`npm run card-audit`) opens **182 cards** across all four surfaces — the founding as the founder meets it, the founder's own answer cards, the settled band with its composers and power tabs, a member's seat, an applicant's and a stranger's, the charter's 42 and the closed page — and records the strings *and* the pixels for each. The findings are put to Ed in `design/spec-pass/card-audit.html`; **nothing in the tree was changed by the pass**, and each answer becomes its own commit.

45. **Raised, awaiting Ed** — 14 findings and 8 questions, numbered 685–706. Measured: Indifferent is 33px in a 40px row on 44 cards, carries no rest shadow on 42, and misses the one flat disabled look on the two locked ones — all three because it is deliberately a `.lanepick` and every commit-row rule keys on `.btn` (685–687, 703); four labelled commits sit at `--t-cap` and *OK* is 11.52px on the founding surface and 14px on the charter (688); six structural boxes are off the 4px grid (698, 699). Read: the `\A\A` in the founder's first writing invitation has been stripped to a literal `AA` (690 — the one live bug, **closed at 46 below**); the threshold is stamped ✒️ and judgments 👍 (691, 702); `reviseNote` says *recirculates with decay* (692); the retired price sentence survives behind `walletTitle ||` (693); the `anonymous` rung is written three ways and *public* is read back from four maps that no ladder offers (694, 695, 700, 701); the clause's *Last amended* has no year where the record's does, against a comment that argues for both (696); the 🍾 refusal note is in full ink (697).
46. **Fixed — 690, the `AA`.** The `\A\A` in the founder's first writing invitation had been stripped to a literal *AA*, so the grey column read *Start writing whenever you like.AA The document's own words…* — almost certainly an in-place stream editor eating the backslashes, since the sibling `.pasteready` rule two lines below kept its escapes. Restored with the Edit tool (`design/session-view.html:111`). The one live bug of the eleventh pass; the rest of 685–706 are still open.
47. **Fixed — 📄 Text was an explainer, not a control** (Q744, Ed's live walk 2026-08-23). It is the one card whose object is not on it — what it decides is the whole prose column below — so it had grown three paragraphs of prose in place of a value, and **the first sentence of them was false**: *Once you confirm this, members can start proposing changes* is the pre-Q606 rule, and proposing has opened at 🍾 rather than here since `canPropose` gained `&& constituted()`. Both that sentence and its *They cannot judge…* companion are cut, with the *Type or paste it into the page below* `.why` whose job the new copy and the caret do better. What stands is the shape every other card uses: **What the document starts from. Write it in the column below; after the start it changes by proposing.** → the count line as the value (*2 paragraphs and 1 heading, below.* / *Nothing written yet.*) → **Or leave it blank.** Starting from nothing is a perfectly good way to begin — this card asks whether you have decided, not whether there is anything there yet. §9.0b's *the prerequisite is a confirmed decision, not content* survives in that second clause, which is the load-bearing half. The commit stops saying *Set it*: **Set the text** where there is text, **Start it empty** where there is not, because the pen is live from the moment the card appears.
48. **Three rules the instrument had to unlearn**, kept because the next one will meet them. **The tab is supposed to move** — the active tab grows 8px out to the left, so reading its rect reports the design as a defect on every card; what is promised is that the *glyph* does not move, so the glyph's content box is what is compared. **A tab in a pile is not where its card is** — the tabs behind slide up leaving a sliver each, so only the front of a stack is measurable. **A charter clause is not surface copy** — scanning card text for engine jargon reported the Hollow Oak charter's own *“Ordinary spending on the running of the house”* as a T15 breach. And every geometry finding is re-run at a second window size: two moved with the window and were dropped, which is now the instrument's `--baseline` flag rather than something somebody remembers to do.

**Twelfth pass — the body cut (2026-08-25, Q763–Q766)** — Ed's live read of the founding: the bodies are wordy, and one of them says the same sentence twice. Not chronological either, and not a fresh read of the surface: it is the eleventh pass's own instrument turned on the state the eleventh pass could not reach. `card-audit` gains a seventh walk, **`delegated`** — a founding question handed to the room and still collecting — plus **T36** (a sentence said twice on one card) and **H4** (a body past its budget), and both rules were written and shown red before anything was cut.

49. **Fixed — how blind answers aggregate had two homes, and both printed into one body** (Q763). The card record's `rule`, which the *Delegate to the membership* rung explains itself with, and a literal note handed to `theyDecide` at every one of twelve call sites. On ⏱️, 👥 and 🥾 the two were **verbatim**, a few lines apart; on 🌡️, 💤, 🤖 and ⏰ one was a prefix of the other; the four privacy settings said one fact in two wordings. The note argument is gone. The record owns the rule, and `theyDecide` prints the one fact only it can know — the frame, and a new `meanwhile` field for what applies while the question is still collecting (⏱️'s *Until it is settled everybody gets the standard rate.*, which was the only such sentence in the twelve). 🤝 gained the `rule` it had never had, since its aggregation fact lived **only** in the note; 👁️'s `rule` stopped carrying the whichever-you-choose sentence its own `.why` already states. **T36** is the rule; the instrument asserts it.
50. **Fixed — the bodies are subject plus one consequence** (Q764, Ed's budget: *the line names what the setting is and the one consequence that would change your answer; every other mechanic moves to the act*). Thirteen `.why` lines cut, the longest from 393 characters to 145. 🪪 stops explaining the whole invitation lifecycle; 🌡️ stops explaining what a vote is not, twice; 💤 stops listing four consequences of lapsing; 🌍 drops the founder-can-always-read and the nothing-while-open mechanics, both of which are stated where they bite; ⏱️ goes to **How often a member can propose something. Each proposal costs one ✏️.** — 68 characters against 139, the refund moving to the act, where §5 already puts the price, and to the settled clause, which says it. ✒️, 🛡️, 🏛️ and 💡 lose their issued-when and their parenthetical histories. **T37** is the rule and **H4** the ceiling, at 200 characters: two sentences do not run past it, so anything that does is carrying a third thing.
51. **Fixed — the delegate rung sat flush against the values above it** (Q761), 0px on twelve cards and loudest on the three whose value group holds one rung, where the `--s3` gap never paints anywhere on the card and there is no rhythm for the seam to be read against. A named rule in `setup.css` at `--s4`, with 👥's hand-rolled inline style retired onto it — one number for one relationship. **P5** is the instrument's half: the radio was measured on its left edge only, so the one defect the *spacing* lens was pointed straight at went through six walks unremarked.

**Thirteenth pass — the copy a moved control drags with it (2026-08-27, entry 37)** — not a read of the surface at all: one line, because moving ✉️'s ✒️ off the commit row and onto the send changed three strings, and the golden's diff is what a pass reads.

52. **Fixed — ✉️'s row said *Set it* over a card with nothing to set.** In the direct form the send is the act, so the ✒️ moved onto the two send buttons and the row kept only the drawn ✓. Three strings follow it: the buttons lose their words — **Invite** and **Send invitations** — exactly as 📨 did (eighth pass, Ed 2026-08-21), a label beside a glyph and a tooltip doing nothing they were not already doing, and the *Several at once* eyebrow already naming the second box; and the row's *Set it* becomes **Done**. The two new tooltips are **Send the invitation** and **Send them all** — §4's imperative, naming the act and not the control, one per button because the two boxes send different things. §1: no new vocabulary; the glyph is ✒️, already the mark of a word that binds nobody else.

**Fourteenth pass — a label that named the wrong moment (2026-08-27, entry 55)** — one rung, from Ed's QA of batch B: *“‘Revealed after the decision’ option sounds like they're revealed immediately after the proposal passes or fails; in fact it should be ‘Revealed at the end’.”*

53. **Fixed — 👁️'s second rung said *per proposal* and means *the close*.** *Revealed after the decision* → **Revealed at the end**, at all nine sites the rung is spoken: the founder's radio, the member's ladder, the composer's lane, the label→rung table (which keys on the label, so it moves or a motion composed on 👁️ resolves no rung), three value readbacks and the delegated card's distribution end (*After the decision* → **At the end**). T5's own example column cited the old label and moves with it. Two explanations were saying the wrong thing on their own account: the ladder's *Published with the record, never before it.* names a record the reader has not met and no *when*, and takes the radio's **Published with the document at the end, never before.** by T5; the lane's *Judgments are published with the record of each decision, never before.* asserted the per-decision reading in so many words, and becomes **Judgments are published with the closing record, never before.**, modelled on its 👤 neighbour. Not taken here: the **per-decision reveal rung** Ed's note also asks for is a SPEC §3.5a change he has not ruled on, and §3.5a's own *revealed after the decision they contributed to* stands unamended; nor is 👤's *Names at the close* reconciled with *at the end* — one label per rung is T5, one word for the close across ladders is a separate question.

**Fifteenth pass — the two cards a founder meets first (2026-08-27, entry 58)** — also from Ed's QA of batch B: *“Don't mix ‘pen’ and ‘key’ metaphors. ‘a pen is not spent’ is unclear. Please redraft it so that someone who has just started using the product a minute ago won't be confused. They don't know that there will be proposals, settings, members, rate limits, etc.”* ✒️ is the first thing in the rail at the save (F2), 🛡️ the next card after it, so both are read before the founder has met a single setting card. **T38** is the rule and the instrument's half is a list of the retired sentences, written and shown red on all six cards before either body was cut.

54. **Fixed — the pen's body explained the mechanism to somebody who had met none of it.** *The pen amends a setting at will, where it turns — each setting's ✒️ tab says whether it does. One pen, many locks, and a pen is not spent.* → **While you hold the pen, you can change this document's rules yourself, without asking anybody. You can hand it over later.** Every noun in the old body pointed at something the reader has not seen — a *setting*, *amending*, a ✒️ *tab* on a paragraph — and two of its three clauses were mechanism, which T37 already moves off a body. The second metaphor was a design-room image (`design/DECISIONS.md`'s *one pen, many locks*) that had leaked onto the surface; one metaphor now, the pen. *Rules* is the one noun the new body asks for and the reader already has it: the page's first heading is **Constitution** and its paragraphs are visibly rules. *Yourself, without asking anybody* is the ✒️ socket's own phrase (`SAY`), so hovering the socket after pressing OK is not the pen told twice in two vocabularies — T5's spirit. 122 characters against 143. The three lines around it stay and each is deliberate: `grantedBy`'s *You founded this document, and the pen came with it.* is item 38's rule for every grant and is quoted in SURFACE §7; the lockline *You hold the pen.* is already the one-sentence form; and *Nothing is being asked here — OK files it and it leaves your queue.* is `gateBody`'s shared sentence for every grant and gate.
55. **Fixed — the shield's, on the same rule and without a separate ruling.** *The shield refuses: where you hold it, a change the membership passes waits for you to accept it. One shield, many locks, and a shield is not spent.* → **While you hold the shield, a change other people agree on waits until you accept it. You can hand it over later.** It broke the rule in the same three places — *locks*, *spent*, and *the membership passes*, which a founder one minute in has not met either — and it is the very next card the same reader is served (Q532(3) has the two acknowledged separately), so leaving it would have put the retired image straight back. *Other people agree on* is the plain form of what 🛡️'s socket says with the membership in it. 112 characters against 152. Its opening line and its lockline stay, for the pen's reasons.

**Sixteenth pass (2026-08-27, batch entries 163–167)** — five plans written together, each landing its own item under this heading in build order. Items 56 and 57 belong to *the surface says vote, never judgment* (164) and *🌡️ offers three rungs* (165); 59 and 60 to 166 and 167. What follows is 163's.

58. **Added — the one place the method is named, and the page it links to** (entry 163, Ed: *do not change the question or the input; explain it once, properly, on its own page*). 🌡️ asks for a number nobody can answer with conviction, because the number is not a share of the votes: it is how sure the members have to be, and what one number means in people depends on how many votes a change has collected. The sentence is **Uses the Bradley–Terry method to allow for a decision with few votes — read more.**, one constant in `design/setup.js` (`methodNote`) at four sites — `ANSWER.bar` (after the ceiling, before the blind note), `BODY.bar` (after the `.why`, before the radios), `PROPOSE.bar` (after its own ceiling note) and `watchBody`'s settled branch, which takes it from the caller rather than from `c.k` alone because two of that helper's three callers have named the method already. **It is 164's sole exception**: §1's threshold row says the maths never appears on the surface, and this is the one string that names it, so that the explainer can be linked at all. It asks nothing — `--t-cap`, `--muted`, no glyph (§5, T19) — and its own element rather than a third sentence in `.why`, which H4 caps at 200 characters and which Q764 already cut. T36 is why the words exist once and why no card carries them twice; T15 is why the link is *read more* and not a §-number. **The page's own strings** (`design/pairwise.html`) were read against §§1–5 by hand, since `card-audit` does not walk it and `copy-check` does not freeze it: no *judgment*, no *participant*, no *ordinary*, no *roster*, no *the bar*; **approval threshold** wherever the setting is named; *member* and *membership*; third person about the document and second person only where the page addresses its reader, which it may, being a page rather than a clause. Two §-numbers do appear, in *Further reading* only, because Ed asked for the references — and one *paired comparison* survives inside the title of Davidson (1970), which is a published title and not this project's voice.

## 8. The card copy rules (spec pass 2, 2026-08-22)

Lifted from CLAUDE.md's glossary and the code in spec pass 2 (Q585 a); the numbered items above are the audit, these are the rules it audits against. Each names where it is enforced.

Since entry 128 the strings these rules govern are **pinned**: `npm run copy-check` diffs every card's words on every walk against `design/tools/card-copy.golden.json` at every push, so a copy change is a red build rather than a remark noticed at the next pass. A pass that moves copy ends with `npm run copy-freeze`, and that freeze's diff is the pass's own list of what changed.

| # | Rule | Example |
|---|---|---|
| T1 | Task titles are Title Case; bare nouns drop the article | *Title*, *Link*, *Text*; *Is the Founder a Member?* |
| T2 | A title says what kind of answer it wants; Quorum and Approval threshold stay nouns | *How Sure Must the Room Be?* / *Quorum* / *Admissions*; the power tabs: *Can the Founder Make Amendments at Will?* / *Does the Founder Have a Veto?* (Q615); on the doors, the act: *Can the Founder Invite at Will?* / *Does the Founder Have a Veto over Invitations?* / *Can the Founder Remove at Will?* / *Does the Founder Have a Veto over Removals?* (entry 94) |
| T3 | A settled card's head is the rule, not the task's name; open questions, 🪪, 📄, personal cards and answers keep the title | `headFor` |
| T4 | A task you have to do carries no subtitle; subtitles survive on a motion (the value) and on news (what happened) | `summary` |
| T5 | A rename reaches the option labels; **one label per rung, everywhere** — the founder's radio, the member's ladder and the composer's lane say the same words (Q620) | *AI proposals are permitted*; *Revealed at the end*; *Everyone has to agree, including them*; *Applications must be proposed by members* |
| T6 | The two 🛡️ radios say veto and name the setting, the negation bold; the head and clause keep the joined verb phrases; the `why` follows the options into veto vocabulary | `vetoLabel`, `PWWHY`, `powerHeadLine` |
| T7 | A power option is a proposal block, not a radio label: the rule at document size with a full stop, its consequence as a note, a lane bar reading *Choose this / Chosen* | `powerLane` |
| T8 | The power clause is one sentence in Ed's vocabulary: a member proposes; the membership passes and rejects; the Founder assents, refuses and amends. *pass* not *carry*; *refuse* is the Founder's word | `PW_PHRASE`; the 👑 question's buttons are *Refuse / Accept* |
| T9 | One voice, only the object changing: per-setting phrases only where the generic would be untrue (policy, text) | `PW_PHRASE`, `PW_OPTS`, `PW_NOUN` |
| T10 | The constitution's sentences are third person; "you" belongs to tasks and cards; two exceptions — you at the top of the members list, and the birth's title clause | *The Founder is checking their email for a link.* · *The Founder (that’s you!) may amend this at will.* (birth only) |
| T11 | A paragraph states the document's rule, never your own answer | the watch half shows a count, never a value |
| T12 | A count, never a direction, while a question runs | *4 of 9 have answered* |
| T13 | A value, never a guess: an undecided rule says who is deciding it, and what applies meanwhile where something does | *The Founder is deciding [x]*; *Until the Founder decides, only members can see the document* (Q618) |
| T14 | No spec references in surface copy — cards.js included (Q608) | — |
| T15 | No project-speak, no engine jargon: roster, participant, ordinary, ceremony, tokens, the bar, economy, queue-card, rolling log hash | *the standard rate*; *approval threshold* |
| T16 | Raw values are not copy | dates through `toLocaleString`; whole percents |
| T17 | The price is said in words exactly once, at the act | the ✏️ hold's tooltip; the 🪶 bubble |
| T18 | Decided is a word, not a glyph: OK on anything that only wants to have been seen | `data-seen`, `data-ok` |
| T19 | Grey means nothing is being asked; hot for actions, cold for information | `HUE` |
| T20 | A shared body must not hard-code one caller's frame | `ANSWER.quorum(A, E, form)` |
| T21 | Read-only copy must survive the spec it summarises; the lockline tells the truth about who set it | `ctx.lockline` |
| T22 | Section headings carry no intro prose | — |
| T23 | A long value is shown, not narrated: past 32 characters, two aligned *was* / *now* lines | `changeHalf` |
| T24 | A first decision is not a change and shows neither half | `isChange` |
| T25 | Attribution names the office, never the name — except the founder's own pen rationale, attributed by construction | *The Founder has changed …*; `founderSpeaker` |
| T26 | The rationale placeholder is an opening clause, not a question | *We should change this because…* |
| T27 | A blank rationale is real: *No reason given.* | `speakerHtml` |
| T28 | An empty application, a blank name, a blank closing comment is a real answer, and the card says what that means | the ✋, apply and 🥂 notes |
| T28a | 🖼️'s version of T28: with no picture the card says what you show as, and the uploader says what it does to a picture that moves | *With no picture you appear as your initials.* · *saved as a still* |
| T29 | A field label names the band and counts rivals as a fact, never a standing | *Proposed · 2 rival proposals* |
| T30 | The rail says what is true; the buttons say what you can do | ⚔️ is *stuck*; ✏️ is on the drafting it leads to |
| T31 | Indifferent is labelled, never drawn as 🤷; ❄️'s pressed state is its words | the commit row |
| T32 | Every commit at the birth wears the 🪶 on the accent-subtle ground — the ground belongs to the glyph | `commitGlyph` |
| T33 | Mail copy lives in `MAILS`, one substitution from the real template; the subject names the document | setup.js |
| T34 | A socket's bubble says the symbol then the verb; held and not-held differ by subject | `SAY` |
| T35 | The address field is the correction — no *Wrong address?* button anywhere (Q609) | 📧, the applicant's and the stranger's cards |
| T36 | **One fact, one home** — a sentence stating a rule of the mechanism appears once on a card; the catalogue record owns it and call sites cite it (Q765) | `c.rule`, `c.meanwhile`; `card-audit` T36 |
| T37 | A body is **subject plus one consequence**; every other mechanic moves to the act that performs it (Q764, and T17) | every `.why`; `card-audit` H4 |
| T38 | A grant's body is written for a **reader one minute in** — one metaphor, no mechanism vocabulary (settings, amend, spent, locks, turns), what holding it lets you do today and that it can be handed over (entry 58) | the ✒️ and 🛡️ bodies; `card-audit` T38 and `spec-check` F16 |
