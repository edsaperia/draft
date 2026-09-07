# STYLE — what the surface says, and how

The rules a piece of surface copy has to pass. Every string a member can read
— card heads, option labels, notes, tooltips, rail teasers, mail bodies — is
audited against this list; code comments are not surface copy and are exempt.
The reasoning behind each rule lives in `design/DECISIONS.md`, and so does
the audit log (§7); this is the checklist. §§1–6 state the rules by subject;
§8 numbers them (T1–T48) for citation and says where each is enforced.

## 1. Vocabulary

| Say | Never | Why |
|---|---|---|
| **founder** | admin, convenor (on the surface) | "Convenor" survives only in SPEC and engine code. |
| **member**, **membership** | roster, participant | `roster` and `participant` are code words. |
| **vote**, **voted**, **your vote** | judge, judged, judgment, comparison | Ed, 2026-08-27 — *for them "vote" just means anything democracy shaped; the math is something they never need to think about*. The act a member performs is a **vote**, everywhere a member reads. `judge-race`, `canJudge`, `judgedByMe` and their kin are symbols and keep their names. |
| **approval threshold** | the bar, θ, confidence, comparison, Bradley–Terry | **Vote is the member's word; the maths never appears on the surface.** The argument that the threshold is a confidence rather than a vote share now lives at `docs.vote/pairwise`. One exception: 🌡️'s single linking sentence (entry 163) names the method to link that page, and is the sole place it may stand. |
| **proposal rate**, ✏️ | tokens, the economy, credits | The currency is the act. |
| ✏️ *anybody may propose changing it* / 🏛️ *a constitutional change* | ordinary | "Ordinary" is engine vocabulary; the kind pair is glyphic. *Constitutional* survives. |
| ✒️ *any unilateral act in the document* | the Founder's pen | **✒️ means any unilateral act; the Founder only starts with it** — 🪪 at ✒️ is every member's word admitting whom they like, and a resignation is always ✒️ (Ed, 2026-08-26, entry 94). The same three verbs price every act on the membership: 🏛️ all members must agree · ✏️ the membership decides · ✒️ the act is its own consent. |
| **the powers wear their real names**: ✏️ **Proposal(s)** · 🏛️ **Constitutional Proposal(s)** · ✒️ **Founder Action(s)** · 🛡️ **Founder Veto** | the pen, the pencil, the shield, the quill (as objects a member reads) | Ed, 2026-09-01, backlog 263: *we scrap "the pen" "the pencil" "the shield" etc and we use the real names… there isn't actually a pen, the icon is just shorthand for the action.* The **glyphs stay everywhere**, as the shorthand they always were, and the glyph sits beside the word where a sentence already carried it. Plurals as he wrote them: many actions, one veto. **An amendment is the change and an action is the verb that makes it** — a text amendment stays an amendment, *made by* a Founder Action. Code and mechanism names — `grant-pen`, `penwallet`, `voicewallet`, `holdsPenAnywhere`, `mayPenOn`, SURFACE §7's wallet row labels — stay put, as `roster` and `convenor` did. |
| **all members must agree** (of 🏛️) | everyone's consent, everybody agrees, unanimity, consensus (as a rule stated to a member) | Ed, 2026-08-28, entry 187 — the route is stated as who must agree, and *members* is the word for who that is. *Each member holding one voice* has one home, the 🏛️ grant card (T36, item 62). |
| *everyone answers, and when everyone is ready the document begins* | ceremony | What is left is what happens. |
| **the membership**, **the membership as it stands**, **a membership of five** | the room, a room of five (for the people who decide) | Ed, 2026-08-28, QA on `/pairwise`: *rather than using "room" in this way, use "the current membership" or "the membership at that time" or "the membership as it changes".* *Room* survives only as a place — 🧭's *a few hours in one room* is a room. Guard: `spec-check`'s `BANNED`, with one exact-string allowance for the physical sense (item 69). |
| **inactive** | quiet (of a membership) | |
| **Anonymity** | Privacy (the section) | |
| **task**, **card** | queue-card | Copy says tasks; the design system names the objects cards. |
| **document**, **charter** | draft (for the thing being made) | `draft` means a candidate patch everywhere in this project. |
| **the record** | rolling log hash, audit log (as a noun a member meets) | No engine jargon on a card. |
| **the standard rate** | v1 defaults | No project-speak. |
| *A, B and C* | *A and B and C*, *A, B, and C* | Three or more things in one sentence take commas and a final *and*, with no serial comma — the register these documents already write in. The shape is a decision and it is made **once**: `listOf` in `design/setup.js` is the only joiner, never a join written at the site (Q630). |

Glyph names are stable (tabulated 2026-09-07, Q1208; the founding order's own glyph column is SURFACE §8's `ORDER`):

| Setting | Glyph | Note |
|---|---|---|
| title | 🪶 | — |
| link | 📍 | — |
| membership | 🪪 | — |
| applications | 🤝 | — |
| lapse | 💤 | — |
| removal | 🥾 | — |
| rate | ⏱️ | — |
| ending | ⏰ | — |
| quorum | 👥 | — |
| threshold | 🌡️ | — |
| pacing | 🪜 | — |
| naming | 👤 | — |
| signing | ✍️ | — |
| reveal | 👁️ | — |
| visibility | 🌍 | — |
| text | 📝 | 📄 until backlog 204; the applicant's words are 👋 |
| founder-is-member | 🎩 | — |
| proposing gate | 💡 | keeps its glyph on the card titled *Proposals* — Ed's ruling of 2026-09-01 (Q1121), the gate being what the tab and the preamble stack show |
| voting gate | ⚖️ | — |
| crown | 👑 | — |
| horn | 📯 | — |

## 2. Addresses and numbers

- **T14 · No spec references**, `cards.js` included (Q608). §-numbers cite a
  document members never see. Say the rule, not its address.
- **T16 · Raw values are not copy.** Never print an unformatted datetime, a float, a
  ratio. A threshold is `66%`; a time is *at 14:00 on 3 September*; a countdown
  follows the `session-clock` ladder (days beyond a week, hours inside one,
  20-minute steps inside six hours, 10-minute steps inside the hour, never
  finer, never seconds).
- **T12 · A count, never a direction**, wherever a question is still running:
  *4 of 9 have answered*, never *leaning to keep*.
- **T13 · A value, never a guess**: an undecided rule says who is deciding it,
  and what applies meanwhile where something does — *The Founder is deciding
  [x]*; *Until the Founder decides, only members can see the document* (Q618).
- **A ceiling the room can reach is floored to the whole percent, never
  rounded** — a bar equal to the number printed is one the room can clear, and
  one above it is not. A room of one reaches 0.7978, which reads *79%*: rounding
  would print 80, and 80 is the first bar that room can never clear.

## 3. Person and tense

- **T10 · The document reads identically to every reader.** Constitutional
  sentences are third person — *The document ends at…*, never *Your document
  ends at…* — and **"you" belongs to tasks and cards**: a card asks you; a
  clause tells everybody. What varies between readers is which tasks they
  hold, never the text.
- **T11 · A paragraph states the document's rule, never your own answer** —
  blindness intact.
- T10's first exception: in the members list *you* stand at the **top** on
  your own line (Ed, 2026-08-21), with *(nobody else here yet)* **above** you
  until somebody arrives — a statement about the list, not a caption on you
  (Q753). A clerk has no row there, so the list reads *(nobody here yet)*.
  Each subsection that stands when empty says so the same way, level with its
  own control: *(no outstanding invitations)* · *(no applicants at the
  moment)* · *(nobody proposed for removal)* — SURFACE F21.
- T10's second exception, the birth's title clause, where the Founder meets
  the word for the first time, says *(that’s you!)* once and only there (Ed,
  2026-08-27, entry 140) — only the Founder ever sees the birth, and after the
  save the same clause is byte-identical to what every other reader gets.
- **The membership takes a plural verb** (Ed, 2026-09-02, Q1150): *the
  membership will decide*, on every delegation sentence and anywhere else the
  word stands for the people rather than the count. **The tense is future**
  (Ed, 2026-09-05, Q1185, reversing Q1150's *are deciding*), and on the five
  binary settings — 🌍 🤝 💤 ⏰ 👁️ — the sentence **names both answers**:
  *The membership will decide if the document can only be seen by members or
  by anyone with the link.* The ladders and the numbers keep a one-clause
  subject, there being no pair to name.
- **The rule stops at the end of its line, and the deviation follows.** A
  settled clause is the rule and its provenance (*As for a meeting.*) on one
  line, and the Founder's powers over it (*The Founder may amend this at
  will…*) on the line beneath — so a reader who wants the substantive part
  reads the first line and stops (Ed, 2026-08-28, entry 198). The opened
  card's head shows the same two lines.

## 4. Titles and labels

- **T1 · Task titles are Title Case**; bare nouns drop their article (*Title*,
  *Link*, *Text*).
- **T2 · A title says what kind of answer it wants, and that there is a
  choice to make**: *Is the Founder a Member?* wants yes or no; *How many
  ✏️s do members start with?* wants a number; *Choose the Quorum* wants a
  number and says whose choice it is. All three are examples of the shape,
  not a list of cards — the second has never been a title. **A settings
  title is an ask, an imperative or a question, chosen case by case for
  whichever reads most naturally; a bare noun is not an ask** (Ed,
  2026-09-07, Q1209: *it should be clear the user has a choice to make, and
  what the nature of that choice is* — reversing the exemption that had kept
  *Quorum* and *Proposal Pass Threshold* as nouns). The review of every title
  against this is owed (Q1209 in QUESTIONS.md's Backlog); what a settled
  card is titled is Q331.
- **T5 · A rename reaches the option labels**, not just the headings — **one
  label per rung, everywhere**: the founder's radio, the member's ladder and
  the composer's lane say the same words (Q620), which since Q1112 (b) they do
  by construction, the label being the clause sentence out of one table
  (`RULES` in `cards.js`).
- **T4 · A task you have to do carries no subtitle.** Subtitles help you choose
  which task to open, so they survive only on a motion (the value proposed)
  and on news (what happened) — **except a grant's own entry, which carries
  none** (Ed, 2026-09-02, card review: *remove body text "You hold Founder
  Actions" from the queue card*): the title names the power and the card says
  the rest.
- **T3 · A settled card's head is the rule, not the task's name**; open
  questions, 🪪, 📝, personal cards and answers keep the title (`headFor`).
  **A settings card whose option blocks state the rule carries no head at all**
  (Ed, 2026-09-02, card review, Q1151): since CP1 every block says completely
  what the title restated, so the head goes from every option-block settings
  card — founding and settled alike, its rule reading as its first block
  (Q1167). The card's name survives on the rail entry, the tab tooltip and the
  record.

## 5. Bodies and notes

- **T20 · A shared body must not hard-code one caller's frame** — the quorum
  body takes the form (count or share) rather than assuming one.
- **T21 · Read-only copy must survive the spec it summarises.** "Fixed for the
  life of the document" predated motions and was false; the lockline says what
  changing a setting actually takes, by kind.
- **T22 · Section headings carry no intro prose.**
- **T17 · The price is said in words exactly once**, at the act: *the edit is
  spent at Propose*. Nowhere else repeats it — the flying pencil teaches it.
- **T19 · Grey means nothing is being asked of you** — hot for actions, cold
  for information. A note that asks nothing wears no hot colour and no glyph
  (the alpha flag is the model).
- **T18 · Decided is a word, not a glyph**: *OK* on anything that only wants
  to have been seen, a grant included (T44) — there is no glyph in common use
  for *I have taken this in*. What says a grant hands something over is its
  mark, which wears the power's glyph, and the flight from the press.

## 6. Mail

- **T33 · The mail is itself the login.** Its copy lives in one template
  object (`MAILS`), one substitution from the real transactional template, and
  owes nothing to the surface's look.
- Subject lines name the document: *you have created a document called
  [title]*.

## 7. The audit log

Items 1–84 — sixteen passes, 2026-08-21 to 2026-09-06 — are in
`design/DECISIONS.md` under *STYLE.md §7, the audit log, lifted 2026-09-07*,
verbatim, and every new item is appended there, numbered on from 84. *STYLE
item n* anywhere in the tree means that section. What a pass is and how it
ends is §8's opening paragraph.

## 8. The card copy rules (spec pass 2, 2026-08-22)

The rules the audit log (§7) audits against, lifted from CLAUDE.md's glossary and the code in spec pass 2 (Q585 a). A row reading *§n · …* is stated in full in that section and the row is its label; every other row is its rule's only home. The third column is an example, or where the rule is enforced. The strings these rules govern are **pinned** (entry 128): `npm run copy-check` diffs every card's words on every walk against `design/tools/card-copy.golden.json` at every push, so a copy change is a red build rather than a remark at the next pass; a pass that moves copy ends with `npm run copy-freeze`, whose diff is the pass's own list of what changed, and its audit item.

| # | Rule | Example · where enforced |
|---|---|---|
| T1 | §4 · Task titles are Title Case | *Title*, *Link*, *Text*; *Is the Founder a Member?* |
| T2 | §4 · A title says what kind of answer it wants | *Proposal Pass Threshold* (Ed's own words, entry 215; Title Case and no question mark by his QA of 2026-08-30 — a noun title takes T1's case like any other) / *Quorum* / *Admissions*; the power tabs: *Can the Founder Make Amendments at Will?* / *Does the Founder Have a Veto?* (Q615); on the doors, the act: *Can the Founder Invite at Will?* / *Does the Founder Have a Veto over Invitations?* / *Can the Founder Remove at Will?* / *Does the Founder Have a Veto over Removals?* (entry 94) |
| T3 | §4 · A settled card's head is the rule, not the task's name | `headFor` |
| T4 | §4 · A task you have to do carries no subtitle | `summary` |
| T5 | §4 · A rename reaches the option labels; one label per rung, everywhere | *Votes are revealed when the document is finished, and not before.*; *Removing a member needs every member to agree, including them 🏛️.*; `card-audit` T5 |
| T6 | The two 🛡️ radios say veto and name the setting, the negation bold; the head and clause keep the joined verb phrases; the `why` follows the options into veto vocabulary | `vetoLabel`, `PWWHY`, `powerHeadLine` |
| T7 | A power option is a proposal block, not a radio label: the rule at document size with a full stop, its consequence as a note, a lane bar reading *Choose this / Chosen* | `powerLane` |
| T8 | The power clause is one sentence in Ed's vocabulary: a member proposes; the membership passes and rejects; the Founder assents, refuses and amends. *pass* not *carry*; *refuse* is the Founder's word. The Founder **also proposes**, and the word for it is the membership's — a Founder putting a change to the room does the same thing a member does and is said to in the same words (entry 161) | `PW_PHRASE`; the 👑 question's buttons are *Refuse / Accept*; the pair's second commit is *✏️ Propose* / *🏛️ Ask all members*, unchanged |
| T9 | One voice, only the object changing: per-setting phrases only where the generic would be untrue (policy, text) | `PW_PHRASE`, `PW_OPTS`, `PW_NOUN` |
| T10 | §3 · The document reads identically to every reader; "you" belongs to tasks and cards | *The Founder is checking their email for a link.* · *The Founder (that’s you!) may amend this at will.* (birth only) |
| T11 | §3 · A paragraph states the document's rule, never your own answer | a delegated clause's *(x of y have answered so far)*, never a value |
| T12 | §2 · A count, never a direction | *4 of 9 have answered* |
| T13 | §2 · A value, never a guess | *The Founder is deciding [x]* |
| T14 | §2 · No spec references | — |
| T15 | §1 · No project-speak, no engine jargon — every word in §1's *Never* column. **One amendment** (Ed, 2026-09-02, Q1156: *use my language — if someone wants to understand they can read the explainer*): 🌡️'s method note names **Bradley–Terry–Davidson** and probability, in Ed's own sentences, and keeps its link to `/pairwise` — the sole site, and the amendment reaches no other card | *the standard rate*; *approval threshold*; `methodNote` |
| T16 | §2 · Raw values are not copy | dates through `toLocaleString`; whole percents |
| T17 | §5 · The price is said in words exactly once, at the act | the ✏️ hold's tooltip; the 🪶 bubble |
| T18 | §5 · Decided is a word, not a glyph — OK on anything that only wants to have been seen, a grant included | `data-seen`, `data-ok`; `grants`, and no `take` |
| T19 | §5 · Grey means nothing is being asked | `HUE` |
| T20 | §5 · A shared body must not hard-code one caller's frame | `ANSWER.quorum(A, E, form)` |
| T21 | §5 · Read-only copy must survive the spec it summarises | `ctx.lockline` |
| T22 | §5 · Section headings carry no intro prose | — |
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
| T33 | §6 · Mail copy lives in `MAILS`; the subject names the document | setup.js |
| T34 | A socket's bubble says the symbol then the verb; held and not-held differ by subject | `SAY` |
| T35 | The address field is the correction — no *Wrong address?* button anywhere (Q609) | 📧, the applicant's and the stranger's cards |
| T36 | **One fact, one home** — a sentence stating a rule of the mechanism appears once on a card; the catalogue record owns it and call sites cite it (Q765) | `c.rule`, `c.meanwhile`; `card-audit` T36 |
| T37 | A body is **subject plus one consequence**; every other mechanic moves to the act that performs it (Q764, and T17) | every `.why`; `card-audit` H4 |
| T38 | A grant's body is written for a **reader one minute in** — one metaphor, no mechanism vocabulary (settings, amend, spent, locks, turns), what holding it lets you do today and that it can be handed over (entry 58) | the ✒️ and 🛡️ bodies; `card-audit` T38 and `spec-check` F16 |
| T39 | A **meaning** names its own dependence — the room, the window, 🌡️'s number — and no other: it lives on the card, never in the clause, states one consequence under H4's budget, and where there is nothing true to say the card prints no line rather than a stand-in of its own (entry 167) | `meaningOf`; `.meaning` under a field, a rung's `.exp`; guard `meaning.test.ts` |
| T40 | The Founder's pair says the act, never the seat: the pen keeps its own tooltip and the second commit borrows the membership's words verbatim (T5, one label per rung) — pen first, the room's route second, and no third word joining them. A **clerk** is given the reason rather than the absence: *You are not a member, so there is no ✏️ for you to spend — this one is yours to set.* (T13, T37) | `founderCommit`, `founderPairNote`; SURFACE K29; guard `npm run powers-walk` |
| T41 | **A rung is a complete sentence about the subject, readable with the card's title covered.** It names its own object rather than leaning on the heading above it, because T5 gives a rung **one** label and that label is read wherever the value is met — the founder's radio, the member's ladder, the composer's lane, the settled strip and the *You said* readback — none of them near the title (Q620, entry 250). Since **Q1112 (b)** that one label is the value's **clause sentence**, so T41 is satisfied by construction: a clause is a complete sentence about the subject or it is not a clause | 🪪: *Members may propose to invite people to join the membership, and all members must agree 🏛️.* · *… and the membership decides ✏️.* · *Members may invite people to join the membership ✒️.* |
| T42 | The who-has-to-agree ladder is a **gradient** — everybody · enough of them, at the threshold · one — three rungs in that order, dearest first. A card with a rung **dearer than everybody** names it above them (🥾's consent rung, where the person themselves must agree too), and a card with no unilateral route simply has no third rung; neither is an exception to the gradient, which is the rule. The delegation rung is about **the rule and not the subject**, so it is one sentence on every delegatable card, never a fourth rung of the ladder (entry 250). Since every rung is a clause sentence (Q1112 (b)) the *All members …* · *Members …* · *Any member …* opener lives on only where the gradient is drawn as an **axis** rather than offered as a choice: the settled strip's two ends (`distEnds`) | the gradient as an axis — 🪪's strip: *All members* … *Any member*; the delegation rung: *The Founder is letting the membership decide this rule themselves.* |
| T43 | **The constitution speaks for itself, and no surface copy sneaks its explanation elsewhere** (Ed, 2026-09-01: *the document's constitution speaks for itself, and shouldn't need extra explanation… we can start by not sneaking explanation elsewhere*). A rule the document states is not restated in a why paragraph, an explainer line or a subtitle; what may stand beside a rule is the document's own sentence (Q1109) or a consequence computed from the room as it stands (`meaningOf`, T39). Cards may still explain **tasks** — what a press does, what is being waited on — that being the card's voice about an act, not the document's rule said twice | the Q1109 bodies; item 74 |
| T44 | **A commit wearing a power's glyph is pressed only when exercising that power; an acknowledgment never wears one** (Ed, 2026-09-01, backlog 263: *you should only click a button with 🛡️ on it when you're actually doing a veto*). The glyph on a button is a promise about what pressing it does — ✒️ commits a Founder Action, 🛡️ refuses with the Founder Veto, ✏️ and 🏛️ spend what they name, 🪶 and 🍾 are their own acts — and a grant, which only says *I have seen this*, commits with the bare **OK** (T18). The **mark** still wears the power's glyph, and the object still flies from the press (item 76 records what this reversed) | the four grants' `data-ok`; the 👑 question's ✒️ / 🛡️; SURFACE §9.1's OK row |
| T45 | **A card body says what the thing is, never what the control does** (Ed, 2026-09-01, Q1129: *You don't even have to say “nothing is being asked here”; just say what proposals/voting/✏️/✒️ are and then they can press OK*). No sentence in a body names its own commit, states what pressing it will do, or says that nothing is being asked — a reader who has just been told what a power **is** needs no instruction to press OK, and a sentence about the power is true whether or not the card has been acknowledged, which is what stops a body going stale when a button changes. It **narrows T43's task carve-out rather than closing it**: what the card is waiting for, and that *It comes back to you the moment it opens*, are about the card's own queue and stay — what leaves is the **commit**, named or described (item 78) | `gateNote`, `grantNote`; the five gate and grant bodies; SURFACE §9's gates and grants rows |
| T46 | **Clause text wears the clause font wherever it is read, including inside a control** (Ed's QA, 2026-09-02, Q1136: *all clause text in radio options should be in clause font*). A sentence the document will carry is set in `--t-body` at the document's own weight whether it is standing in the charter, offered as an option block, offered as a ladder rung, typed in a composer lane or read back in a strip — the same words in one typography, which is the **typographic half of T43**: a constitution that speaks for itself does not change its voice when it is being chosen. Its second half is the exception, and the exception is marked rather than inferred: **a control's own word is not clause text** — *Fixed*, *Rising*, *Never*, *At a set time*, *I set it*, *They lapse*, *Kept*, *Admit them*, *A number of my own*, a shape's title, a consent answer — and keeps `--t-ui`/600. Marked on the exception, so an option carrying a clause is right by default. And a number that stands **inside** a clause is a word in it, not a field beneath it (Q1137) | `setup.css`'s `.pick .opttext`, `.opttext.ctl` and `.numin`; `ctlWord` and `numIn` in `design/setup.js`; item 79 |
| T47 | **A button offering an act wears its glyph alone; a button reporting what already happened says so in words** (Ed, 2026-09-02, Q1155 as narrowed by Q1171). So ✏️ Propose → **✏️**, 🍾 Begin → **🍾**, 🏛️ Ask all members → **🏛️** — and **✏️ Submitted** keeps its word, being the row's only report that the proposal is in (K18); the mover's **🗑️** on both motion cards is the glyph alone since 2026-09-05 (Ed: *not have the text "withdraw" on the button itself*, then *yes* to the ordinary card matching), the word surviving only in its tooltip. **OK** keeps its word, having no glyph (T18). Sits beside T44: the glyph is still a promise about what pressing it does; this rule only strips the word that repeated the promise | every commit row; SURFACE §9.1 |
| T48 | **A radio names the act it stands for, and a standing rule names who chose it** (Ed, 2026-09-05, Q1182 and Q1188). On the consent card of a constitutional motion the three blocks read **Keep this** on the rule that stands, **Prefer this** on the rule proposed, and **Abstain** on its own textless block — the register's act-naming form beside CP2's *Prefer this* / *Choose this*. And provenance has exactly **two labels, everywhere it is read**: ***Chosen by the membership*** and ***Chosen by the Founder ✒️*** — one wording for a founder-set value before the start and after it, so the record card's *Chosen by Founder Action ✒️* goes | the consent picks; `chosenRadio`; SURFACE §9.3 CP2 |
