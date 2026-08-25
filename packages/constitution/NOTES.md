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
- **The two powers ride the settings; the register's ride its value** (v0.54).
  A setting's crown is `SettingState.powers` and changes by relinquish /
  delegate / reclaim / the reserve motion; the register's crown stays inside
  the applications value (four holder states) and changes by changing that
  value. One corner deliberately left: a founder holding assent-only on the
  applications setting cannot rewrite its value directly, so they cannot
  soften the register's own powers by hand — the room can, by motion, and
  delegation of the applications setting still un-crowns the register whole.
- **Q395 order** (v0.54): the applications consent tiebreak ranks holders
  both > assent-only > unilateral-only > members, on the reasoning that
  assent restricts the members while unilateral only adds a founder power.
  Wants Ed's eye; the primary key (join policy) is unchanged.
- **The Text is held like anything else** (Q440, 2026-08-21). `startingText`
  now carries a crown pair (`HELD` = the managed map plus the Text), held
  by the founder from creation, relinquished on the same clock as every
  setting (R-048: once it has a value — for the Text, once it is confirmed —
  and a pre-start release takes effect at 🍾), reclaimed
  pre-start, handed over by `delegate`, restored by a `reserve` motion, and
  counted by `crowned()` — the founder who keeps the pen or the shield on
  the document itself is a 👑. The founding value is untouched:
  `confirmStartingText` / `cs.text` stay the pre-start act, `setSetting`
  refuses the Text, and a `set` motion on it is still *not moved this way*
  (the text changes by drafting). The shield's meaning is the one seam the
  bridge will wire: `textAdoptionNeedsAssent()` (shield held, crown awake)
  and `openTextCrownQuestion(t, {candidateId, summary})`, which opens a 👑
  question with `motion: null` and a `text` field — the existing
  `answerCrownQuestion` records accept/reject, crown lapse auto-passes it,
  and the host reads `crownQuestionRecords()` to decide whether the document
  it serves follows the engine's adoption. The event gained an optional
  `text` and a nullable `motion`; absent means a motion question, so older
  logs read unchanged and `SCHEMA_VERSION` did not move.
- **🤝's crown pair moved from the value to the setting** (Q506, Ed,
  2026-08-21: *🤝 also needs ✒️ and 🛡️*). `ApplicationsValue` is the join
  policy alone; `registerPowers()` reads `settings.get('applications').powers`,
  so the v0.54 corner above (two pairs on one card) is gone and the reserve
  motion on `applications` is now ordinary machinery. **Migration in the
  fold, not the log**: a legacy value carrying `holder` still validates,
  keeps its bytes, and `foldApplications` maps the holder onto the powers
  and strips it from what stands — an old log replays to the same state a
  fresh session reaches the new way (test). The golden state was re-frozen
  for exactly this derived change (`founding.jsonl` is byte-identical; only
  the applications entry of `founding.state.json` moved). The Q395 holder
  tiebreak in the consent order went with the field: the blind question
  collects the policy, the powers are the founder's to give up (Q341).

## The close (SPEC §4.6, Q467)

`tick(t)` closes the document when the ending date is crossed (tested before
the lapse/freeze clocks, which stop at T=0): `closed`, then every running
**constitutional** motion is `motion-kept-at-close` (what stands stands, the
mover's 🏛️ returns via `myHeldMotion` clearing), every pending 👑 question is
`crown-failed-closed` (carried-but-unassented — crown-lapse auto-pass does not
fire, because the close is everybody's deadline, not one absence), and every
outstanding invitation is `invitation-expired` (`arrive` then refuses: *nothing
left to join, only to read*). After the close every mutator is refused
(`requireOpen`) except **`acknowledgeClose(t, member, comment)`** — the OK on
the 🥂 card, per member once, blank allowed: `close-acknowledged` **is** the
signature, the comment its rationale. `closingSignatures()` orders them by
signing time, names per the ✍️ setting (`nobody` anonymises). `view()` serves
`closed: { at, mySignature, signatures }`.

**The bridge relays the close engine-first** (`engine-bridge.close` /
`finishClose`): the engine's final batch runs, `reportAdoptions` turns each
verdict into the constitution's language while it is still open — a carried
setting motion, or (Q440) a **text adoption under the Text's shield** opening a
👑 question — then the ordinary motions the batch did not carry are held, and
the constitution closes, which fails those just-opened 👑 questions closed. A
text adoption needing assent at T=0 therefore lands as carried-but-unassented:
the engine applied it to its own document, but the room never assented, so
`closeRecord()` lists it under `carriedButUnassented`. The shield is held
only when the room has handed it back by a `reserve` motion: **the start lays
the founder's hand off the Text** (CLAUDE.md `🍾 Begin`) — `maybeConstitute`
emits `power-relinquished` for each power still held, so post-start the
default is neither, and `reportAdoptions` opens a 👑 question only under a
reserved shield. **Migration note**: a log constituted before 2026-08-21 holds
no such events, so on replay its founder still holds both powers on the Text
(the golden v0 test pins this) — the two live documents on docs.vote
included; a text adoption there waits on the founder's 🛡️ until they lay
it down or the page performs 🍾's batch for them.

## 🍾 begin, readiness, and presence (Q443, Q441/457, Q459 — 2026-08-21)

- **Nothing starts until the founder says so.** `maybeConstitute` is gone; `begin(t)`
  emits the one `constituted` event (so a log from before today replays identically —
  its `constituted` was simply auto-emitted). `begin` refuses while any judge-gate
  setting is unsettled and names them: judging needs the whole constitution (§9.0b).
  It does **not** wait on anybody's answer once the questions stand — readiness
  informs and never blocks (Q443c).
- `readiness()` is the founder's readout: per question settled/collecting/answered/
  electorate, per member arrived/owed/answered. Names, never values.
- **An invitation outstanding at 🍾 survives it** (Q441/457): the room's half of the
  consent was given before the start and stands; `arrive` after `begin` joins with
  no motion. Nothing changed in code — the test now says so.
- **Presence is presence** (Q459a): `seen(t, member)` emits `member-seen` at most
  once an hour per member (`SEEN_EVERY_MS`), folding to the same activity touch an
  act makes. A lapsed member's read records nothing — revival stays an act
  (`memberReturn`). The server calls it on every member view.
