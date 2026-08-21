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
| *everyone answers, and when everyone is ready the document begins* | ceremony | What is left is what happens. |
| **inactive** | quiet (of a membership) | |
| **Anonymity** | Privacy (the section) | |
| **task**, **card** | queue-card | Copy says tasks; the design system names the objects cards. |
| **document**, **charter** | draft (for the thing being made) | `draft` means a candidate patch everywhere in this project. |
| **the record** | rolling log hash, audit log (as a noun a member meets) | No engine jargon on a card. |
| **the standard rate** | v1 defaults | No project-speak. |

Glyph names are stable: title 🪶, link 📍, membership 🪪, applications 🤝,
lapse 💤, removal 🚪, rate ⏱️, machines 🤖, ending ⏰, quorum 👥, threshold ✒️,
pacing 📈, naming 👤, signing ✍️, reveal 👁️, visibility 🌍, text 📄,
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

## 3. Person and tense

- **The document reads identically to every reader.** Constitutional
  sentences are third person — *The document ends at…*, never *Your document
  ends at…*. What varies between readers is which tasks they hold, never the
  text.
- **A paragraph states the document's rule, never your own answer** —
  blindness intact.
- **"You" belongs to tasks and cards**: a card asks you; a clause tells
  everybody.
- One sanctioned exception: in the members list *you* stand at the bottom on
  your own line.

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
4. **Open — Q502** — 📈 *How Does the Bar Get There?* is named that way in CLAUDE.md and breaks §1. Ed's call.
5. **Dropped** — the fixture topbar's *confidence bar 74% ▲* stat did not survive the merge: the threshold is not topbar material (`session-clock`).
6. **Passed** — the B2b strings (*you have judged this — it is still running*, *wants your judgment*, *yours · in the race*, *decided — adopted*, *decided — the current text stood*, *retired — the current text stood*, *you judged this*, the two refusal sentences, *today*/*yesterday*): third person about the document, second person only where the card asks; no addresses; a count never a direction.
7. **Noted, not surface** — `kind: 'ordinary'`, `settledBy === 'ceremony'`, `holder === 'convenor'` are engine vocabulary in data, never rendered; the surface says them only through the glyph pair.

**Second pass (the design-day builds, 2026-08-21, 07:40)** — over every string the builds of Q460/462, the glyph batch, Q501/503 and Q466/471 added (listed in their commit messages):

8. **Fixed — Q502 answered** — 📈 is *Rising Approval Threshold?*, a yes/no title for a yes/no card (Ed).
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
