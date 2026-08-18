# The setup surfaces — task grammar and dependency tree

Working notes for `document-creation.html` and `founding-ceremony.html`, kept
here because they describe structure the code holds in scattered `dep:` arrays,
`ready()` functions, gate `blockers()` and `ansFor` births (Ed, 2026-08-18:
*it might be helpful for you to maintain a dependency tree for all the founding
tasks*). Update this file whenever a card, a dependency or a state rule
changes.

## The lifecycle grammar (Ed, 2026-08-18)

Setup tasks speak the session-view's own alphabet — *they are yellow when
open, ⏳ while waiting for other input, grey when decided, they lose their
custom emoji and just become ✔s*. Five states, implemented once in
`setup.js` (`stateOf` / `markOf` / `hueOf`); each surface supplies the
`waiting` / `news` / `yours` predicates its cards can reach.

| state | mark | wash | in the rail? | meaning |
|---|---|---|---|---|
| **ask** | the subject glyph | yellow `--lc-open` | yes | the question is open and yours. The glyph is the mark *only here*: a setup rail is many questions in one state, so while they ask, the informative mark is which |
| **wait** | ⏳ | grey `--lc-closed` | yes (its fill is the watching UI) — except gates, which wait as pile tabs only | your part is done or there is no part for you: the room is answering, the inbox holds the next move, a gate's blockers stand above it |
| **news** | drawn ✔ | green `--lc-changed` | yes, pinned until OK | a decision arrived: the room's number came back, a rule you never chose binds you, a gate opened. The unacknowledged-decision rule, arriving from the live rail |
| **yours** | ✏️ | blue `--lc-yours` | yes | a thing of your own in flight (a submitted application); fill = how far judging has got |
| **done** | rail: drawn ✔ · tab: **its own glyph** | grey | **no** — it leaves the rail | settled. The tab stays in the pile wearing its subject glyph (Ed, 2026-08-18: the piles stand in one place, most of their contents can still be acted on — *it's basically a menu*); the grey wash says settled. The constitution block's lines are buttons too |

**The constitution is document text** (Ed, 2026-08-18, same evening): the
Constitution group renders not as a pile but as a section — one paragraph
per decision (*title — value*, Q331's (c) shape), its tab in the gutter to
its left, constitutional first; the open card replaces its own paragraph.
The Membership pile remains a pile. On the ceremony the room's questions'
rules appear as tabless paragraphs, their tab staying with the task.

Rules carried over whole from session-view: grey means nothing is being asked
of you; hot for actions, cold for information; the ✔ is drawn (one function),
never an emoji plate; a decision announces itself if it changed the document
or you put something into it — which is why a resolved blind question pins
green for everyone who answered it, convenor included.

What deliberately does **not** carry over: there is no 🔥 (the dependency
chain already serves the founding one question at a time, and every setup
question is mandatory — a flame picks the next judgment among optional ones);
and the applicant's wizard keeps its done tasks visible as a checklist, since
its four tasks are the whole surface.

## Dependency tree — document-creation (the convenor)

Edge key: **⇒ literal** (needs information or existence from upstream) ·
**⋯ pacing** (UX only — don't overwhelm; the answer needs nothing upstream)
(Ed, 2026-08-18: *some of these are literal dependencies … and some are UX
only*).

```
🏷️ Title
 ├─⇒ 📧 Your Email        the verification mail names the document
 │     └─⇒ 🔗 Link         nothing may be saved before the address is proven;
 │                          confirming the link IS the save (§9.7a)
 │            (slug text itself ⇒ generated from Title)
 └─(the title is first because it is the first fact that exists)

🔗 Link (the document now exists)
 ├─⇒ 🪪 Membership         an invitation IS the link
 ├─⋯ ✋ Your Name           pacing: nothing about a name needs the link
 ├─⋯ 🖼️ Your Picture       pacing
 └─⋯ 📄 Starting Text      pacing

🪪 Membership (a roster now exists)
 ├─⇒ 🚪 Membership Policy  who holds the register; how anyone joins later
 ├─⇒ ⏰ When Does It End?  delegable — "the members decide" needs members
 ├─⇒ 👥 Quorum             delegable, and counted against the roster
 ├─⇒ 👤 ✍️ 👁️ 🌍 💤 🤖 🪙   delegable — same reason
 └─⇒ (every ans-* question card: born of delegating its setting)

⏰ When Does It End? (an endpoint may now exist)
 ├─⇒ ✒️ How Sure Must the Room Be?   the close bar needs a close
 ├─⇒ 📈 How Does the Bar Get There?  a ramp needs an endpoint
 └─⇒ 💧 How Fast Do ✏️s Come Back?   the drip is paced against the window

gates (not decisions — they follow from the others):
 ✏️ Proposing ⇐ 📄 Starting Text settled + your own ans-* answers in
 ⚖️ Judging   ⇐ the whole constitution settled + every room question resolved
```

## Dependency tree — founding-ceremony (a member / an applicant)

```
member:
 (no chain — all nine questions arrive together; the constitution's news
  cards arrive with them and want only OK)
 ✏️ Proposing ⇐ your own answers, all in
 ⚖️ Judging   ⇐ everyone's answers, all in

applicant:
 🪪 Apply for Membership (Begin)
  └─⇒ 📧 Your Email       the identity; verified by magic link before
   │                       anything can be submitted; unique among members
   ├─⋯ ✋ Your Name        needed for Submit, no upstream information
   ├─⋯ 🖼️ Your Picture    needed for Submit
   └─⋯ 📝 Your Application optional — an empty application is real
  Submit ⇐ email verified + name + picture → the apply card turns ✏️ yours
```

## Residual decisions (Q350)

Where the grammar could have gone another way, and which way it went — see
QUESTIONS.md 350 for the calls awaiting Ed.
