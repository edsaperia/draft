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
