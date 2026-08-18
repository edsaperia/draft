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
- **`applications.holder` is the convenor's frame, not part of the consent**:
  the delegated question collects the join-policy rung; the holder (the crown
  choice) is consented by joining, the way §9.7 says — so the consent order
  compares rungs only.
