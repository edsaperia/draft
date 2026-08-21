# The setup surfaces — task grammar and dependency tree

Working notes for the founding half of `design/session-view.html` (was `setup.html` until the stage 8 merge, 2026-08-21) — one surface since 2026-08-18 evening
(Ed, 361; `document-creation.html` and `founding-ceremony.html` are
redirects, who you are is the dev dropdown top-left) — kept
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

**The constitution is document text with sections** (Ed, 2026-08-18,
evening, two passes): five subtitled sections — Membership · Decisions ·
Privacy · Proposal Rate · The Document — each a subtitle, a line of prose,
then one paragraph per decision (*title — value*, Q331's (c) shape) with its
tab in the gutter to its left; the open card replaces its own paragraph.
**A question the members answer is a task standing in the section it
decides**: on the ceremony the rule and its question are one paragraph
wearing one tab; on the convenor surface a delegated setting's ⏳ paragraph
is followed by a *Your answer* task via ctx.tasksFor. The rails group by
section. Both piles are gone; tab-stacks survive only in the live gutter.

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
 ├─⇒ 🤝 Applications       an invitation IS the link, and the door is decided
 │                          before anyone is invited through it (Ed: "I need
 │                          to decide Applications before I can do Membership.
 │                          And I need to do Link before those.")
 ├─⋯ ✋ Your Name           pacing: nothing about a name needs the link
 ├─⋯ 🖼️ Your Picture       pacing
 └─⋯ 📄 Starting Text      pacing

🤝 Applications
 └─⇒ 🪪 Membership         the door before the room: inviting is governed by
                            the join policy, and who holds the register is
                            part of what Applications settles

🪪 Membership (a roster now exists)
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

## The empty members list (407a, Ed 2026-08-19)

A membership of one renders a placeholder row — *Nobody else yet.* — where
the other members would stand, full width, muted, no avatar (a face would
claim a person who does not exist). It leaves with the first invitee. Two
reasons, one visible and one geometric: a members list showing nobody while
the room has a member read as broken; and founder-alone the you-row stood so
high that its ✋🖼️📧 pile collided with the 🪪 pile above it — two stacks
twelve pixels apart inside one 42px clause, under the Q308 floor (a pile
cannot shrink below its 30px front tab; fitBand squeezed the peek to 0.0 and
still overlapped by 18px). The placeholder gives the you-row a row's
clearance, and the piles clear by measurement (5px at the default peek).

## Pacing — when each role is shown each card (Ed, 2026-08-19)

**A queue-card exists only when its holder can act on it.** Ed's example was
the founder alone on a document seeing the question they had just delegated;
the rule underneath is that the rail's one claim — *these things want you* —
must never be false. The schedule, per role:

**The founder.** The birth chain is dependency-paced, and since Ed's 409(a)
the whole constitution is paced the same way: the first three arrive one at a
time (title → 📧 → 🔗), the save opens the four that live inside a saved
document (🤝 ✋ 🖼️ 📄), and everything after that arrives **in waves, one per
section of the constitution, in the order the constitution itself reads** —
🪪 the register, then 💤 + 🚪, then ⏱️ + 🤖, then ⏰ + 👥, then ✒️ + 📈, then
👤 + ✍️ + 👁️; 🌍 rides the document's own run, behind 📄. It is the same
`dep` machinery that always paced the first three, so a wave is stated where
the card is and nowhere else, and re-ordering the constitution means editing
one line per card. Measured before: confirming the register alone bore nine
tasks in a single frame.

Delegating a setting **does not hand the founder their own question**: the
`ans-*` answer-task exists for nobody until somebody besides the founder has
**arrived** (`roomExists()` inside `visible`), because with an electorate of
one the founder's own answer would resolve the blind question solo —
delegation self-defeating in one click. The delegated paragraph's tail says
*waiting for members* instead of counting the founder alone. Ed's own
amendment to the rule is the other half of it (408): **if there is nothing
else outstanding and nobody has come, the remaining questions are served
anyway** (`ansDue`), because a rail that has emptied itself while the room
fills up is worse than an early answer. Both residuals were closed the same hour. **A blind question no longer
resolves while an invitation is outstanding, and never on one voice at all**
(Q413, module-side, SPEC §9.0b v0.61) — so the escape hatch is safe: the
founder standing alone may answer, and nothing settles until somebody else is
actually there. And **the answer tasks cascade too** (Q416, *if I have to do
all of them anyway, they should cascade*): they ride the settings' own wave
graph, looking **through** any dependency nobody is asked about — most of the
graph is settings the founder holds, and without the look-through a wave of
founder-held settings would let every question behind it past at once, which
is the batch arriving one level down. Measured: three, then two, then one,
then three, against eight in one frame.

**Nothing is owed an OK until the document begins** (Q414). A founder-set
constitutional rule is news to every other member — but §9.6a lets the
founder re-set freely until judging opens, so an OK collected before the
start acknowledges a rule that may not be the rule. The gates are the
exception and the proof: a gate opening is not a rule being set, it is a
thing that has happened to you.

**The watcher waits for your own answer.** A delegated setting stood in the
rail twice — the ⏳ entry counting the room, and your own question — which is
the same title twice, and the wrong one first. The watcher is hidden while
your answer is outstanding and returns once it is in (`owesOwnAnswer`, and
only on a *settled* card, so the founder's own open ask is untouched).

**A task you have to do carries no subtitle** (Ed, on the 📧 card: *the
queue-card does not need "Not given yet", that's why it's yellow*). Subtitles
are there to help you choose which task to open; where you have to do all of
them they are the rail saying twice what the wash and the title already say.
What keeps one is a **motion** (its subtitle is the value being proposed,
which is exactly what decides whether to open it) and **news** (what
happened is the whole point).

**The same knife on the card bodies** (Ed, through 2026-08-19 and the 20th).
📧 lost both explanatory blocks and its send button; 📍 lost the unlocks
line, the suggested-from-the-title note, *what people paste to each other*,
its field label, the Copy button (which had never been wired to anything)
and the recital of what characters are legal. What each card keeps is what
its field cannot say for itself: on 📍, that a *collision* moved your slug,
that the link you have typed is free, and — **only once the document exists**
— that changing it later breaks no invitation already sent. That last is the
general rule the trim found: **a note about changing a thing belongs where
you would change it, not where you set it** (Ed: *this should be shown where
you might change it, not when you set it*), which before the save is a
promise about a worry nobody has yet. The illegal-slug line survives on the
other side of the same test — it is not helper text, it is why the ✒️ is
greyed.

**A member.** Sees delegated questions from arrival (their seat cannot exist
earlier — sitting in an invited seat in the dev dropdown *is* that member's
first arrival). Constitutional settings the founder made are news to OK, as
before; the ✉️❌ **doors are excluded from news** — a door is not a decision,
nobody set it, nothing binds through it, and both doors were landing in every
member's rail as OK cards at the start.

**An applicant.** The seat follows the 🤝 rule as it stands and the phase:
under *invitation only* there is no Apply task and the topbar says
*membership is by invitation*; under *open*, arrival is joining, so nothing
to apply for either; under *proposed*/*apply* the task appears only once
judging is open, because an application becomes an ordinary motion and before
the start there is no room to put one before — until then the topbar says
*applications open when the document begins*.

## Entrances — what is born arrives (Ed, 2026-08-19)

The document and both rails are rebuilt wholesale on every render, so a
new paragraph, section or rail entry used to pop in fully formed between two
frames. `birthPass` (setup.js) keys every element by what it is about
(`data-para`, section ids, `data-q`), remembers every key ever seen
(cumulative — a section folded away and unfolded is not reborn; a seat
switched away from and back does not replay), and hands a newborn its full
presence after one forced reflow — the wash-fade move, applied to existence.
Two entrances, by what the element does to its neighbours: a **rail entry
grows open from zero height while it fades** (the jarring half of a rail
birth is the neighbours jumping down by its height in one frame — growing
makes them part), a **document paragraph or section only fades** (text that
slides while you read it is worse than text that arrives). Reduced motion:
everything fades, nothing moves. Stagehand acts (seat switch, ⏩) mute the
pass.

**A batch cascades, it does not land as a block** (Ed's 410, choosing grow-and
-fade with a stagger over the alternatives — arriving from the margin, and
inking the wash in after the landing). Several tasks born at once are several
things that happened, and arriving in one frame says they are one thing. They
come in document order, 55ms apart, capped at six steps — and **each column
keeps its own count**, so the rail's cascade and the document's run beside
each other rather than end to end. The cleanup timer waits for the longest
delay in the batch, which is the whole of what the stagger costs in code.

## The commit row — discard, commit, and OK (Ed's 412, 2026-08-19)

Three controls, and the rule is what each of them is *for* rather than where
it sits:

- **🗑️** — *put this card back the way it stands.* The left of every commit
  row you can commit, disabled when there is nothing to put back. A radio on
  a setting card writes straight into `S`, so what-it-stands-as is
  **remembered rather than derived**: one snapshot per opening, taken in
  `render` after the module has had its say (`takeSnap`/`snapDirty`/
  `revertSnap`). On an answer card it throws away an answer you have not sent
  — never one you have, since a committed answer is the module's.
- **the commit** — ✒️ where the act is a set of your own (every founder
  confirm, the 🔧/👑 power tabs included, since giving up a power is a
  unilateral act); ✓ where it is an answer to a shared question or a
  judgment; **✏️ Propose** and **🏛️ Hold to ask everyone** where it is a
  motion, one glyph per route so the two commits say which road they take.
- **OK** — what a card wears when it asks nothing of you but to have seen it
  (Ed's own words): a gate opening, a decision you are owed. It is not a
  quieter commit and not a politer Close.

"Close" survives only where the card holds nothing to put back — 🪪 the
register, whose invitations commit row by row as you send them, and 📄 the
starting text, which lives in the document column rather than on the card.

**Nothing in the document changes until ✒️** (Ed’s QA, 2026-08-19). The 🪶 card was rewriting the heading, the topbar and its own head as you typed — *inconsistent with all other decision behaviour*, and exactly right: every card on this surface holds what stands at the top and what you are proposing below it, and the title was the one that had let the two be the same string. `S.titleDraft` is the provisional value, the lane’s and nothing else’s, dropped whenever the open card changes; 🗑️ discards it and ✒️ is what moves the document. It also forced a distinction the surface had been getting away with: `ready` answers *is this settled*, which is not the same question as *may I press the pen* — a title that stands is settled while the pen wants something new to write — so the commit control asks `commitReady` instead.

**Grounds**: an emoji is a coloured object in its own right, so a saturated
fill under one fights the glyph for the same pixels (Ed: *icon button
backgrounds shouldn't be very saturated*). ✒️ moved onto the accent-subtle
ground with an accent border, which also splits the two commits by hue rather
than by accident — the pen wears the colour this surface already uses for
your own work, and the drawn ✓ stays the one solid green thing on a card.

**Switching cards is a morph, not a teardown** (same day): within one strip
the card's box survives — height glides from the old card's to the new
card's while field and commit row crossfade; the head swaps in place so the
strip, which lives inside it, never blinks and the tab you clicked never
moves. From anywhere else the old card first closes into its own paragraph,
then the new one opens out of its — the document never jumps by a card's
height in a single frame.
