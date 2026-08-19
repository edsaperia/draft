# @draft/constitution — author calls

Open-question calls made while building, per the engine-core convention:
recorded here as they are made, so Ed can flip any of them cheaply.

- **Plaintext answers, projection withholds** (blindness design). Ceremony
  answers and motion answers ride in events in plaintext; blindness is a
  property of the projection layer — `view(memberId)` exposes only your own
  answers, counts for running questions, distributions (names-off) once
  resolved. Commit-reveal was rejected for v1: resolution must be a
  deterministic fold; a non-revealing member would block everyone (the §9.6a
  bug class); and the host that would leak already saw the plaintext command.
  The upgrade path stays clean — a payload swap, same fold shape.
- **Close moved earlier**: the threshold keeps its current value and rises to
  T_end over the shorter remainder — steeper, never discontinuous. Confirmed
  by Ed 2026-08-18 (*a bar shouldn't need to jump if timings are changed*);
  now §4.3, v0.49.
- **`applications` is not judge-gated.** §9.0b's reason for the gate is that
  a judgment is *recorded under a disclosure setting* and *counted towards a
  quorum*; the join policy touches neither, and the mock's ceremony gate was
  already exactly the other eight. A delegated applications question still
  blocks judging while it collects, like any delegated question.
- **`routeOf(ending)` is symmetric across never**: giving a perpetual
  document a close is constitutional too, not just removing one — §9.6 makes
  *whether the document ends at all* the constitutional fact, and installing
  a close installs the ramp and a record cut just as surely as abolishing one
  removes them. (The plan's phrasing covered only the proposed-value side.)
- **The quorum form never converts**: resolution refuses answers in the wrong
  form rather than converting count↔share, because the form is the frame the
  question was asked under (§9.0a — delegate the decision, not the field).
- ~~The mover answers like everybody~~ **Reversed by Ed 2026-08-18 (v0.49)**:
  the mover stands at accept from the moment the motion is put — proposers
  prefer their own proposals, the same way §3.3 counts an author's own
  preference without asking. Revisable like any answer; 🗑️ stays their way out.
- **A motion carried by pure abstention carries nothing**: at least one
  standing accept is required, because a motion nobody consented to is not a
  consent.
- **A document-abstainer's standing keep leaves with them**: the electorate
  is live (v0.48), and abstaining the document is "I trust you to finish up"
  — so a keep from a member who then signs out abstaining stops blocking.
  Confirmed by Ed 2026-08-18 (*abstain means abstain — if they wanted to
  block it, they shouldn't have signed out*; Q371 closed).
- **Convenor direct-change on reserved settings post-start is uniform**,
  constitutional ones included (Ed's 366; the reservation was consented by
  everybody on the way in, the crown argument generalised). A member's route
  is untouched by reservation — and since Ed's 377 ruling (2026-08-18,
  v0.49) **assent ends either route**: the v0.48 constitutional-route
  exemption is gone, because consent's everyone does not include a clerk,
  and a member-convenor's accept in the vote is their answer as a member,
  not their assent as holder.
- ~~On convenor lapse every reserved setting passes to the members~~
  **Reversed by Ed 2026-08-18 (v0.49)**: lapse is automatic abstention, and
  on an assent, abstaining is granting — nothing changes hands, every
  reserved setting stays reserved, pending 👑 questions pass by themselves,
  and while the crown sleeps a members-passed change applies as if accepted.
  Revival is logging in (`crown-returned`), restoring the assent requirement.
- **Late pace/ending resolution re-anchors prospectively**: if a non-gate
  pacing question resolves after constituted, the anchors reseed at that
  moment — a room-decided ramp can lower the bar from its fixed-interim
  ceiling, which is the room's explicit decision, unlike a time-added fall.
- **`memberReturn` emits only when something revives** (lapse, sign-out, a
  warning); routine activity rides the member's own commands, so the log
  carries no heartbeats.
- **Delegating 'applications' releases both holds at once** (v0.52): the
  membership's crown lives in the applications *value* (§9.7½), so the
  hand-over event flips the setting's holder and, if the value says
  'reserved', rewrites it to 'members' — "delegate anything" must not
  leave the register crowned behind a members-held policy. Q389 records
  the one-sentence reading this commits to.
- **The reserve payload excludes the text, the register, applications and
  personal settings**: the text is never held (changed by drafting, §9.7),
  the register is held through applications, and the membership's road
  back is a constitutional *set* motion on the applications value — the
  holder is part of the value there.
- **A reservation returned to a lapsed founder sleeps from the next tick**:
  the reserve motion applies immediately (holder → convenor), and the
  crown-lapse event — with its auto-assent mode — fires at the next tick,
  since the clocks are event-driven and never preempted. A 👑 question
  raised in that gap simply auto-passes at the tick.
- **`applications.holder` is the convenor's frame, not part of the consent**:
  the delegated question collects the join-policy rung; the holder (the crown
  choice) is consented by joining, the way §9.7 says — so the consent order
  compares rungs only.
- **The engine-bridge's standing diff** (367b). sync() relays what stands by
  diffing every raceable setting's cs value against the engine's standings
  map, rather than by pattern-matching the events that could have changed
  one (a carried motion, a crown's direct change, a 👑 acceptance, a
  constitutional amendment, a hand-over) — the diff is immune to new routes
  being added and cannot double-apply. Roster events are relayed
  event-by-event because they have no value to diff.
- **Admit-motions still adjudicate by the host's hand** (367b residual). An
  application (§9.7½) is an ordinary motion with no scalar value to race,
  so the bridge does not enter it in the engine; its engine shape is part
  of Q391's design work. The seam stays open for it.
- **Bar amendments: the engine glides, the cs display re-seeds** (367b).
  engine-core re-anchors on any ceiling or close change — keep the current
  value, ride to the (new) ceiling over the remainder, §4.3's "a bar never
  jumps" applied uniformly. The cs's own anchors re-seed from startPct on a
  bar/pace change (threshold.ts, prospective application), which can
  disagree with the engine's glide while a ramp is live. The engine is the
  adjudicating authority (adoption tests against engine.adoptionThreshold);
  cs.bar() is display. Reconcile if a surface ever draws both.
