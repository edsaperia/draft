# From mockups to a live service

Where the project stands after the setup-surface work of 2026-08-18, what
"integrating with session-view" actually means, and what has to be true before
a real cohort can open a real document.

This is a plan, not a decision. The choices it needs from Ed are numbered at
the end, drawn from the QUESTIONS.md sequence like everything else.

---

## 1. Where we are

**Three design surfaces**, all light-only static HTML served from `design/`:

- `session-view.html` (5,524 lines) — the live drafting surface. The whole card
  grammar lives here: clause tabs, piles, the needs-you queue, the decision
  card, the composer, the wire, the lifecycle palette.
- `document-creation.html` (735) — the convenor's setup, seventeen cards.
- `founding-ceremony.html` (676) — the same screen seen by a member.

They share `system.css` (1,615 lines) and the two setup screens share
`setup.css` and `setup.js` (997 more). Nothing is compiled and nothing has a
build step.

**An engine.** `packages/engine-core` — 2,732 lines of dependency-free
TypeScript: the session state machine, the ranking model, the adoption
threshold, tokens, the participant API, the event log, the dedup gate, the race
labeler.

**A simulator.** `packages/sim-harness` — synthetic participants driving
engine-core, with the deferred-evidence studies behind SPEC §§8–9.

**Nothing else.** No server, no persistence, no auth, no client, no deployment.

---

## 2. Four findings that shape the plan

### 2.1 The whole of §9 has no home in the code

`engine-core` takes a settled `Constitution` as an *input* to opening a
session, and runs a drafting session against it. Everything this week's design
work has been about — the ceremony that *produces* a constitution, delegation,
the roster and its invitations, identity, and the motion that *changes* a
constitution mid-session — exists in the spec and on the screen and nowhere in
the code.

This is the single largest gap, and it is not a matter of catching the engine
up. It is a layer that has never been written, and the design is now well ahead
of it: seventeen settings, two holders, two routes for changing one, a consent
rule that takes the maximum of stated minimums, and an acknowledgement rule for
members who had no say. A constitutional motion in particular is not a small
feature — it means the engine has to accept a constitution *change while
running*, which touches the threshold ramp, quorum, and the disclosure rules
under which judgments already in the log were cast.

### 2.2 "Constitution" currently names two different things

In `engine-core`, `Constitution` is a bundle of about twenty fields, of which
perhaps five are things a room decides (threshold start and end, grant, drip,
cap, stake) and the rest are engine tuning: `hotSetSize`, `explorationEvery`,
`boutGapMs`, `deadlockEpsilon`, `deadlockMinComparisons`, `redraftLimit`,
`cooldownMs`.

Since SPEC §9.6 the word has a precise and public meaning: **a constitutional
setting is one whose change would make past decisions mean something
different.** `hotSetSize` is not that. Splitting the type in two — what the
room agreed, and what the engine is tuned to — is cheap today and expensive
later, because the surface, the record, the motion routing and the audit log
all key off exactly that distinction. (One casualty to note in passing:
`salienceEvery` is stale, superseded by §8.3a's rule that a diagonal is served
only when the document holds at least E live questions and only to somebody
with nothing else to judge.)

### 2.3 The surfaces are already one surface, in three files

"Every surface is the session-view" has been the organising claim since
2026-08-17, and the mockups have earned it: setup, the founding questions and a
live session are the same three columns, the same rails, the same
card-over-document gesture. The extraction of `system.css` and then
`setup.css`/`setup.js` was that claim being made true one file at a time.

It is not finished. `session-view.html` still carries its own copy of the card
machinery, and the two setup surfaces carry a second copy in `setup.js`. Two
copies of one design system drift, and the housekeeping pass of 2026-08-17 was
largely an inventory of what drifting had already cost inside a single file.

### 2.4 The glossary is already the component list

This is the good news, and it is worth saying plainly because it is the payoff
of a discipline that has cost something to keep. Every named part in CLAUDE.md
— `clause-tab`, `tab-stack`, `decision card`, `lane-bar`, `commit row`,
`queue-wire`, `evidence-meter`, `setup-band`, `watch-half`, `gate-cards` — is a
component with a written contract and a recorded reason for existing. A port
does not have to invent a component boundary anywhere. That is unusual, and it
is why the client port below is estimated as work rather than as discovery.

---

## 3. What integrating with session-view means

Concretely, four things:

**One card renderer.** A setup card, a decision card, a sealed record, a
deadlock card, an editing card and a motion are already one object: a
`clause-head`, a field of one or more blocks, and a commit row. They differ in
what fills the two halves. The port should make that literal — one component,
six bodies — rather than reproducing the three renderers the mockups have.

**The setup band is not a setup thing.** It is the constitution at the head of
the document, and it stays there for the life of the document: it is where you
go to ask what the threshold is, and it is where a motion opens. Q319 — where
the piles live once drafting starts — is therefore a blocker on the port rather
than a detail to settle afterwards, because it decides whether the band is a
permanent region of the live surface or something that collapses into the
topbar.

**The layout passes survive.** `fitBand`, `fitStacks`, `layoutQueue`,
`drawWire` and the wash fades are all *measure after layout, then adjust* —
which is an effect in any framework, and is the reason the choice of framework
matters less here than it usually would. What matters more is that they are
kept as named passes rather than dissolved into components, because each of
them enforces a rule that is written down.

**One fixture adapter.** The mockups' hand-authored fixtures become a fake
implementation of `participant-api`. Then the same client runs against the
fake, against the sim, and against a server, and the API contract gets written
down by being used three ways rather than by being designed in the abstract.

---

## 4. What putting it live means

Six pieces, in rough order of how settled each is.

**Already decided** (CLAUDE.md, V1 product decisions): hosted multi-tenant web
service; magic-link auth against roster emails; documents are Markdown rendered
as rich text; TypeScript end-to-end; engine-core stays a pure, dependency-free
library shared by sim and server.

**Client.** A real build for the first time: TypeScript, Vite, one component
per named part. My recommendation is React, not because it suits this UI best —
for a bespoke, measurement-heavy surface with no component library, Svelte is
the nicer fit — but because engine-core is TypeScript, the types cross the wire
unchanged, and React is the choice that stays easy to hand to somebody else.
(Q333.)

**Server.** TypeScript, engine-core in process, one document per session
instance. Rosters of 5–10 and conventions of 15–20 mean a single process holds
many documents comfortably; the scaling question is real but distant, and the
design must merely not preclude it.

**Persistence.** The event log is already append-only and hash-chained, which
is the hard half. Postgres, log as the source of truth, projections rebuilt
from it. The receipts participants already get become the thing that makes the
record auditable rather than merely published.

**Realtime.** The `room-pulse`, the rails and the wash fades all want a live
connection. Server-sent events are enough — there is no client-to-server
streaming anywhere in this design — and SSE degrades to polling without
ceremony, which matters for a cohort on institutional wifi.

**The §9 layer.** The gap from 2.1. It is a real design question where it goes:
inside engine-core (which keeps it pure and testable in sim, but stretches the
meaning of "engine"), in its own package beside it, or in the server (which is
where the roster and the emails have to live anyway). (Q334.)

---

## 5. Sequencing

Three honest options.

**(a) Engine first.** Bring engine-core to spec v0.30, write the §9 layer,
drive it all from sim. Lowest risk to the mechanism, and the sim can answer
calibration questions long before a person sees it. But there is nothing to
show for weeks, and the surfaces go on drifting from the engine while it
happens.

**(b) Client first.** Port the three mockups into one component set against a
fixture adapter. Proves the one-surface claim by construction, produces
something clickable early, and moves every subsequent design question out of
static HTML and into the real thing. The risk is building a client against an
API that does not exist yet.

**(c) Thin slice.** One document, one convenor, three members, one race, real
auth, real persistence, end to end and deliberately narrow. Answers the
questions sim cannot: whether people judge at all, whether suggestion-mode
reads the way it is supposed to, whether a blind consent question is a strange
thing to be handed by an email.

**Recommendation: (b), then (c), with (a) folded into both.** Write the client
against a fixture adapter *shaped like the real participant-api*, because that
forces the contract to be written down — and a contract is exactly what both
halves currently lack. The §9 layer then gets designed as part of that contract
rather than bolted on afterwards. Then replace the adapter with a server and
put the narrow slice in front of real people.

The reason not to lead with (a): the mechanism's open questions are mostly
answerable by sim, and sim already works. The design's open questions are
mostly answerable only by a cohort. Leading with the client is what gets to a
cohort soonest without guessing.

A rough shape, deliberately without dates:

1. **Contract.** `participant-api` and `spectator-api` as wire contracts, with
   the §9 layer designed in. Fixture adapter implementing them.
2. **Client port.** One component set, three surfaces, running on the fixture.
   Session-view first, since it holds the grammar; the two setup screens follow
   almost for free.
3. **Engine catch-up.** Audit engine-core against spec v0.30, split
   `Constitution`, implement §9.
4. **Server.** Postgres, magic links, SSE, one document end to end.
5. **Pilot.** One convention, watched closely, with the gazette and the record
   as the deliverable that makes it worth a cohort's time.

---

## 6. What is still missing from the design

Not blockers on starting, but they will block a pilot:

- **The record.** `record-builder` — final text plus rankings, camps,
  graveyard, care map, minority map, backlog, audit log. It is the artefact a
  convention takes away, and it has no design at all.
- **The gazette**, and the chamber view that renders it for people who are not
  members.
- **The briefing** (§6.1) — designed, superseded, never rebuilt, and
  constrained by §3.5 to appear only where there is no live judgment to
  contaminate.
- **Notifications** (§8.4). A document that runs for two weeks is a document
  people leave and come back to, and nothing has been designed for the coming
  back.
- **Mobile.** Every mockup is a three-column desktop layout. A cohort will read
  this on phones.
- **Sign-out and the freeze** (§9.5) have a spec and no surface.

---

## 7. Decisions needed

**Client framework: React + Vite.** Ed's call, delegated (2026-08-18). Not
because it suits this UI best — for a bespoke, measurement-heavy surface with
no component library, Svelte is the nicer fit — but because engine-core is
TypeScript and its types cross the wire unchanged, and because it is the choice
that stays easy to hand to somebody else. The measured-layout passes are
effects in either, which is what makes the decision low-stakes enough to take
without asking again.

**334. Do we want to be able to simulate the founding questions and motions?**
That is what "where the §9 layer lives" actually asks, because the only
consequence that differs between the three homes is this one: in the server it
can never be driven by `sim-harness`; in `engine-core` or in its own package
beside it, it can. The reason to want it is that the consent rule has a shape
worth testing before a cohort meets it — taking the maximum of stated minimums
means one member who says *never* makes a document perpetual, and one who says
*95%* sets the threshold at 95%. That may be exactly right, since it is the
whole point of consent, or it may make documents that cannot move; a simulated
room of fourteen answers it in an afternoon. Recommendation: **yes**, therefore
not the server, and then **its own package** — the ceremony and the motion are
mechanism but not the *drafting* mechanism, and engine-core's boundary is the
one thing in this codebase that has stayed clean.

**335. Split `Constitution` in two.** Three things go wrong while the room's
settings and the engine's tuning share one object. The **record** published at
the close would list `hotSetSize` beside the threshold as though the room had
agreed it. The **motion** machinery routes on whether a setting is
constitutional, and with one object there is nothing to stop somebody moving to
amend `boutGapMs`. And the **ceremony** has no definable output, because what
the founding questions produce *is* the room's half of this object and it
cannot produce half of a thing. A rename today, a data migration once real
documents exist. Recommendation: **now**.

**336. Whose address do the invitations come from?** Auth is a magic link
mailed to a roster address, so the service's front door is an email that has to
arrive — and mail from an unknown domain to fifteen people at once is the
definition of what spam filters are for. The sending domain is the decision and
the host is a consequence of it. Either **ours** (a domain we own, a
transactional sender, any managed platform underneath — fastest, and the link
arrives from a name nobody recognises), or **Newspeak House's** (a link from an
address the cohort already trusts, which matters more than it sounds for a
screen asking somebody what they will accept of a constitution — at the cost of
needing somebody there to grant it).

**On the pilot.** An earlier draft made "which cohort, and when" a decision the
plan needed. It is not: the contract, the client port, the engine catch-up and
a server can all be built without knowing. What it decides is only **what to
cut** — a rehearsal needs no `record-builder` and no gazette, a real charter
needs both — so it is a question for the point where §6's list has to be
scoped, not for the start.
