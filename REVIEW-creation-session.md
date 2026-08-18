# Review: document creation → founding questions → live session

An end-to-end walk of the creation process (Ed's ask, 2026-08-18): each step
checked for sense and for consistency — against SPEC v0.30, against the two
setup surfaces, against session-view's rules, and against what engine-core
actually implements. It doubles as the groundwork for Q335 (splitting
`Constitution`), because the split's contents are exactly what this walk
surfaces: §7 ends with the definitive settings-to-engine mapping.

**Findings are numbered 338–344** in the project sequence. Unambiguous bugs
found during the walk were fixed in the same pass and are marked **[fixed]**;
everything else is a decision and waits for Ed.

---

## 1. The walk

**Step 0 — creation.** A convenor makes a document. The link works from the
first second (§9.0b); the roster is the one constitutional setting they must
supply, because there is no room yet to ask (§9.7). Consistent, and the
surfaces honour it: nothing on document-creation is a form, the rail opens at
five cards and grows as dependencies settle.

**Step 1 — the convenor's own settings.** Text, title, link, membership, the
hat (🎩), name, picture. All checked out: the text card blocks on *deciding*
rather than on content, the link leaves redirects (§9.7a), identity is not
authorship (§9.0c), the clerk answers nothing and counts toward nothing.
One real gap here is **finding 344**: the convenor who delegates a question is
also a member who must *answer* it, and document-creation gives them nowhere
to do so.

**Step 2 — delegation.** Constitutional settings default to the roster,
ordinary to the convenor (§9.7); *the members decide* is a third value of the
setting, not a switch. Consistent everywhere. But delegating a **compound**
setting turns out to be underspecified — the bar has a shape and two numbers,
quorum has a form — and the ceremony collects a single slider value. That is
**finding 341**.

**Step 3 — invitation and arrival.** Members get a magic link; arrival is
drawn faintly until they open it. Here the walk hit the deepest problem in the
whole lifecycle: **who counts** for a blind consent question. The ceremony
completes when *everyone* has answered — and a single invitee who never opens
their email blocks judging for the whole room, forever. Worse, the obvious
remedy (remove them) is itself a constitutional motion under §9.7, which
requires the consent of… everyone, including the person who never arrived.
The room can be locked out of its own document by one unopened email. That is
**finding 339**, and the related authority conflict — §9.3 and §8.2 still say
the convenor alone adds and removes participants, which §9.7 flatly
contradicts — is **finding 340**.

**Step 4 — answering.** Blind, count-only progress, distribution published
without names once complete, nothing preselected, sliders discrete. All
consistent across both surfaces, and `watch-half` is the same object for the
convenor and for a member who has answered — verified in the DOM. The
consent rule generalises cleanly to every question asked… except the one it
was invented for. **Quorum, the ceremony's headline question, does not exist
below the surface**: §4.2's adoption condition is threshold + floor
(F = min(⌈E/3⌉, F_max)), the engine has no quorum field and never references
the word, and the floor is *computed* where quorum is *chosen*. The founding
question and the engine's F are two competing answers to the same question —
"how many of these people must weigh in before the charter changes" — and
neither document acknowledges the other. That is **finding 338**, and it is
the most consequential in this review.

**Step 5 — capability arrives.** Reading needs nothing; proposing needs the
text and your own answers; judging needs the whole constitution (§9.0b). The
gate cards match this exactly, one projection per surface. One bug **[fixed]**:
document-creation's judging gate collected only the five cards marked
`gate: 'judge'` and missed 🔭 chamber and 🤖 machines — both constitutional
(§9.6), both blocking judging on the member surface already, so the two
surfaces disagreed about when judging opens. Both cards now carry the gate.

There is also a clock question hiding here: the engine ramps the threshold
over `[windowStartMs, windowEndMs]` and paces the drip against the same
window. If the ceremony takes two days of a five-day window, the bar has
already risen — and wallets have already dripped — before the first judgment
is possible. When the window *starts* is nowhere decided. **Finding 342.**
And §9.0b's "until the economy is settled everyone drafts on the standard
grant" leaves open what happens to a wallet when the room's answer arrives
*below* what somebody already spent. **Finding 343.**

**Step 6 — the document begins.** "Everyone is ready" = the constitution is
settled = judging opens. This is consistent with §9.0b's *no single moment*
claim once you notice "begins" only names the last gate opening; proposing may
have been running for days. The copy on both surfaces says so correctly.

**Step 7 — live session.** The setup piles hold the constitution at the head
of the document; a settled setting stays as *the rule*; a member owed a
constitutional decision presses OK. Two integration facts fall out of the
walk and both land on **Q319** (already open): the band must be a *permanent*
region of session-view, because it is where a motion opens and where the rule
is looked up — and a motion's rail entry has no clause to stand beside, so its
anchor is its setting's tab in the band. Q319's answer should say both.

One composition verified with pleasure: a **late joiner** inherits the
constitution (Q257) *and* is owed an OK on every constitutional setting they
had no say in — the unacknowledged-decision rule covers inheritance with no
new machinery. This is the kind of thing the review was looking for and found
working.

**Step 8 — motions.** Route read off the value (329a), ordinary priced at one
✏️, constitutional free, answers never carried over. Consistent with §9.6
throughout, including the awkward case (⏰) that motivated 329. Two SPEC
leftovers contradicted decisions already signed and are **[fixed]** in v0.31:
§9.0's opening still said settings are chosen at creation "and never after"
(contradicting §9.6's motions, decided v0.28), and §9.0's proposal-rate
paragraph still gave the stake a resolution direction ("takes the lowest")
two sentences after declaring it is not a setting (decided v0.30).

**Step 9 — the close and the freeze.** The freeze needs quorum (§9.5), which
inherits finding 338; a perpetual document whose ceremony never completes
cannot even compute the freeze it would need. No separate finding — 338 and
339 cover it — but it shows how far up the tower those two reach.

---

## 2. What held (verified, no action)

- The two setup surfaces are projections of one card set: seventeen cards +
  two gates, mirrored, differing only in which are actionable. Verified by
  DOM walk on both.
- The three gates map one-to-one onto §9.0b's three capabilities and three
  holders (nobody / you / the room).
- Blindness is preserved end to end: counts only while running, distribution
  without names after, no preselection, no running maximum, on both surfaces.
- OK-then-disappear + Q257 inheritance compose without new rules.
- Pricing (§9.6) is consistent with the wallet: ordinary motion = proposal =
  one ✏️ staked flat, returned on withdrawal; constitutional free.
- Identity (§9.0c) never collides with disclosure: fourteen named faces over
  sealed proposals is the ordinary case, and the surfaces render exactly that.

---

## 3. Findings that are decisions (new questions 338–344)

Stated in full in QUESTIONS.md; one line each here.

- **338 — Quorum is two different things.** The ceremony collects a chosen
  per-race participation base; the engine computes F and has no quorum at
  all; §4.2's adoption condition never mentions it. Unify: recommend quorum
  *becomes* the floor — F = max(chosen quorum, min(⌈E/3⌉, F_max)) with the
  formula as the undelegated default — and §4.2 says so.
- **339 — Who counts for consent.** Recommend: membership begins at first
  arrival, not at invitation; the ceremony's E is the arrived; late arrivals
  inherit (Q257) and are owed OKs. Kills the unopened-email deadlock for the
  founding *and* for constitutional motions.
- **340 — Roster authority conflict.** §9.3/§8.2 (convenor adds/removes) vs
  §9.7 (invitation is a constitutional motion). Recommend §9.7 wins and
  §9.3/§8.2 are amended; removal-for-absence needs its own rule because of
  339.
- **341 — Delegating a compound setting.** What does the room's one slider
  bind when the bar has a shape and two numbers, and quorum a form? And is a
  quorum answered as a count re-asked when the roster grows? Recommend: the
  delegated question collects the binding scalar (the bar at the close; the
  count), the convenor keeps the residue (shape; form) as an ordinary
  setting, and a roster change re-serves nothing (Q257's logic).
- **342 — When the window starts.** Recommend: the ramp and the drip run from
  the moment judging opens, not from creation — the bar tracks
  irreversibility and nothing is irreversible before a judgment can exist.
- **343 — Wallets when the proposal rate settles late.** Recommend: the
  room's answer applies prospectively; nothing claws back; a wallet already
  above the settled cap drips nothing until it is below it.
- **344 — Where the convenor answers.** Document-creation shows a delegated
  card's watch-half but no consent controls, so a drafter-convenor currently
  has nowhere to answer their own ceremony. Recommend: the delegated card on
  document-creation grows the same answering body a member sees — one card,
  both halves, which is what "the same screen seen by two people" promises.

---

## 4. SPEC fixes made in this pass (v0.31)

Both fold decisions Ed already signed; neither is new design.

1. §9.0 opening: "chosen when the document is made and never after" →
   "…and after only by motion (§9.6)".
2. §9.0 proposal-rate paragraph: the stake's resolution direction removed;
   it is a flat 1 and not a setting (v0.30 decision).

Flagged but **not** fixed, pending Ed: §9.3's observer role (Q324), §9.3/§8.2
roster authority (Q340), §4.2 quorum (Q338).

---

## 5. Mockup fixes made in this pass

- 🔭 chamber and 🤖 machines now carry `gate: 'judge'` on document-creation,
  so both surfaces agree that judging waits on the whole constitution.

---

## 6. The integration contract (what the port builds against)

Condensed from the walk; this is the §3-of-PLAN.md list made concrete.

1. **One card set, two projections.** A surface is (cards × who-you-are).
   The port ships one renderer with per-kind bodies; `document-creation` and
   `founding-ceremony` are the same component tree with a different `me`.
2. **The band is permanent** (pending Q319's formal answer): the constitution
   lives at the head of the document for the document's life; motions open
   there; motion rail-entries anchor to their setting's tab.
3. **Gates are cards** with the unified conditions: propose = text ∧ own
   answers; judge = every constitutional setting settled (both surfaces now
   agree).
4. **The ceremony is mechanism** (334, decided): it lives in its own package
   beside engine-core, drivable by sim-harness, and the server consumes it —
   same shape as the drafting engine itself.

---

## 7. The `Constitution` split (Q335 groundwork)

What the walk establishes about engine-core's `Constitution`, field by field.

**Room-agreed (→ `RoomSettings`, the constitution proper):**

| engine field | card | notes |
|---|---|---|
| `adoptionThresholdStart/End` | ✒️ approval threshold | shape implicit (start=end ⇒ fixed); see 341 |
| `windowStartMs/EndMs` | ⏰ when does it end | perpetual = no end; start semantics are 342 |
| `tokenGrant` | 🪙 grant | |
| `tokenDripPerTenth`, `tokenCap` | 💧 drip | per-hour form for perpetual docs not yet in engine |
| `authorshipVisibility` | 👤 whose proposal | |

**Room-agreed but missing from the engine entirely:**

| setting | card | engine today |
|---|---|---|
| quorum (+form) | 👥 | absent — finding 338 |
| signing | ✍️ | absent |
| judgments-reveal | 👁️ | absent |
| chamber | 🔭 | absent (server-side concern, but the *value* is constitutional and belongs in the record) |
| machine member (+budget) | 🤖 | absent as a setting; `Participant.machine` exists |

**Engine tuning (→ `EngineTuning`, never on a card, never in a motion):**
`adoptionFloorMax` (pending 338), `deadlockMinComparisons`, `deadlockEpsilon`,
`cooldownMs`, `redraftLimit`, `rationaleMaxChars`, `boutGapMs`, `hotSetSize`,
`explorationEvery`, `rivalGateProb`, `rivalGateMinComparisons`,
`reopenedBoost` — and `salienceEvery`, which is stale (§8.3a superseded it)
and should be deleted in the same pass.

**Neither:** `stake` becomes a constant (v0.30); `rngSeed` is provenance and
stays on the session, not in either bag.

Recommendation: implement the split as its own commit once Ed has read this —
it is still a rename today, and 338's answer decides one field's home.

---

*Review conducted 2026-08-18 against SPEC v0.30→31, design/document-creation.html,
design/founding-ceremony.html, design/setup.js, design/session-view.html, and
packages/engine-core/src at commit `2f24490`.*
