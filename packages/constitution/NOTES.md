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
  T_end over the shorter remainder (§4.3 states only the postponement case;
  the same keep-the-current-value principle applied in the other direction).
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
- **`applications.holder` is the convenor's frame, not part of the consent**:
  the delegated question collects the join-policy rung; the holder (the crown
  choice) is consented by joining, the way §9.7 says — so the consent order
  compares rungs only.
