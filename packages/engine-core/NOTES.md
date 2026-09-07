# engine-core — implementation notes

Decisions the spec left to implementation, and the first build's simplifications. Anything
needing Ed's sign-off is in QUESTIONS.md; the rest is engineering record.

## Mechanism decisions

- **peakW starts at 0 and only moves on evidence.** The bare prior puts any
  untested candidate at P ≈ 0.5, so the spec's refund formula taken literally
  would refund junk in full before a single judgment — an anti-flooding hole.
  A candidate's peakW updates only from fits in which it has at least one
  comparison. Corollary: a never-judged candidate that retires refunds 0
  (withdrawal still refunds fully).
- **Incumbent identity is the hash of the contested spans' current text.**
  Incumbency is positional (SPEC §4.4); evidence against the incumbent goes
  stale exactly when the text it judged stops being the status quo. Slightly
  conservative: when a race widens (new member joins, union spans grow) the
  hash changes and prior incumbent evidence is dropped even though the old
  spans' text is unchanged.
- **Fit scope: live members + incumbent.** Comparisons involving retired /
  withdrawn / merged candidates drop out of the race fit. The graveyard's
  evidentiary role (loss accounts, span attribution) is deferred.
- **Dominated** (SPEC §6.2 — a query, not an event, and not the projection
  §6.2 asks for): `dominated()` names the candidates the incumbent already
  beats at the bar *as it stands now*, on at least five usable comparisons in
  which the candidate is a side (locked, ground-shifted evidence excluded).
  Today's bar is a floor under any projection's because the ramp is a
  smoothstep to its closing value and re-anchoring on a moved close never
  lowers it (`@draft/constitution`'s `barAt`) — with the one caveat that
  nothing validates a ramp whose start exceeds its end. No engine command
  fires §6.2's invitation: the composer's summons is the host's to send, and
  `dominated()` is what it would read. (Re-read against the code 2026-09-07,
  Q1262.)
- **Deadlock:** ≥ `deadlockMinComparisons` usable comparisons AND the
  best available pair's value < `deadlockEpsilon`, where pair value =
  posterior variance of the strength difference × outcome unpredictability.
  This is the "marginal information below cost" test with an explicit ε.
- **Cooldown is global** (one adoption anywhere starts it), reading §4.2's
  "starts a short cooldown" as protecting the whole field's rebase window.
- **Token cap applies to grant + drip accrual only.** Refunds are never
  forfeited to the cap; drip forfeited while at cap is not recovered later.
- **finalRender** applies all threshold-clearing, floor-satisfying race
  leaders as one batch: distinct races cannot conflict by construction, so
  their hunks share current-version coordinates (hash order retained
  defensively).
- **Adoption threshold runs on the session clock (wall time), Q22–25.**
  Queries that need it (`feed`, `dominated`, `backlog`) take a time and
  default to the last event's time, which keeps replays exact; live callers
  pass now. The evidence-clock variant is deferred to the sim (Q26).

## The router (SPEC §8; re-read against `feed()` 2026-09-07, Q1262)

What is still simplified against the spec is the per-pair v/c_p arithmetic,
approximated as one binary gate; everything else the first build hedged as a
later refinement has since landed.

- **What a race is worth.** Value = (leaderP / adoption threshold) × salience
  weight, an unmeasured race entering at 0.5; × 1.25 while the race is short
  of its floor and unjudged by this participant (§8.2's unheard preference,
  now a tiebreak inside the hot-set ordering rather than the mechanism); ×
  `reopenedBoost` (1.5) while a ground shift has locked the race's evidence
  and nothing fresh has been measured (§4.4, Q50). The hot set is the top
  `hotSetSize` = 3 by that value (Q31).
- **How a hand is built.** The leading slots are the *unheard* slots — every
  floor-short race this participant has not judged, least-measured first —
  before any hot-set slot is filled (Q1178, `f345167`): a fresh race carries
  no evidence and so sorts below every measured one, and the multiplier alone
  starved new proposals, which `room-walk` reproduces. The remaining slots
  take a seeded per-slot roll rather than a fixed pattern (`roll <
  1/salienceEvery` a diagonal, then `1/explorationEvery` an exploration card,
  cheap judges only), so a client fetching one card at a time gets the same
  mix; the diagonal branch opens only above 2E live questions, and §8.3a's
  idle serving is a separate budget capped at three in a row
  (`trailingDiagonalRun`). Feeds are pure in state and in the time argument
  — same state, same `t`, same feed — so replay is auditable.
- **Cost, and the pair.** c_p is the mean in-bout response gap (gaps over
  `boutGapMs` discarded; a member with no data counts as cheap); at or below
  the roster's upper median it buys exactly one thing, the exploration slot,
  and with it the shape of the empty-queue test. Within a race the pair
  dealt is the highest-value one this participant has not already judged on
  this ground (`servedOut` on `contextKey`, so a race keeps dealing fresh
  pairs, Q1200), incumbent pairs first while the rival gate is shut (§8.3's
  "sparingly"), and never the author's own text against the incumbent
  (R-062).
- **Diagonals** serve leader against leader, chosen by the same
  active-sampling value over one race-level salience fit and terminating at
  `deadlockEpsilon` (§8.3a's "it terminates"); the seeded RNG rolls only
  what kind of slot it is. Uniform sampling and the "later" salience
  weighting are both history.

## Advisory gates beside the sync fold

The pattern for every LLM feature: **async oracles advise; the sync fold
decides.** `oracle.ts` defines the `SemanticOracle` interface (pure types,
no SDK import — transports live in sim-harness, later the server) and
`dedup-gate.ts` is the first consumer: an async helper the CALLER runs
before issuing a submit command. The gate returns a verdict; the caller
turns it into ordinary commands — submit as usual, or co-sign the
existing candidate instead (`Session.coSign` already carries SPEC §5.1's
"join its supporters"). Why outside the Session: commands are synchronous
and replay must stay bit-identical (the peakW lesson — nothing outside
the fold may feed state that affects replay). Because the oracle's
influence is only WHICH commands get issued, and those commands are in
the log, replay never re-consults an oracle and a log is exactly as
deterministic as before. Corollaries: no oracle configured ⇒ behavior
byte-identical to pre-gate (regression-pinned in sim-harness); oracle
error ⇒ verdict degrades to `fresh` — an LLM is never load-bearing and
never blocks a submission. Gate 2 (semantic composition), race
naming/typing, and change ledgers should extend `SemanticOracle` with
optional sibling methods and follow the same advise-then-command shape.

Dedup pipeline (SPEC §5.1 "embeddings, edit distance, LLM equivalence"):
exact match → normalized relative Levenshtein (threshold 0.15 — see the
rationale in `dedup-gate.ts`; embeddings dropped for v1, edit distance
plus the LLM covers small rosters) → oracle. The gate checks live
candidates only; graveyard checking and behavioral probes are later
phases.

## Deferred (stubs or absent by design)

- Gate 2 semantic composition, inclusion lattices, and lattice diagonals
  (overlap → rivalry today; lattice diagonals are logged but unmodeled).
- Dedup: behavioral probes, co-sign invitations, graveyard checks, and
  the author-facing co-sign/differentiate/insist choice (the P3 gate
  advises the caller only; the sim runner auto-co-signs).
- Surgery proposals (the `splitHunks` primitive exists; no engine command).
- Bridge metric / stratified probes; composer briefings; loss accounts.
- Machine participants (incl. coherence auditor); "weak dissatisfaction"
  from propose-C is logged but does not move any model.
- Authorship visibility: the engine stores the truth and answers
  `authorVisible` (SPEC §3.5a, R-050); withholding is the view layer's job.

## Module map

`session.ts` (engine-core state machine) · `text/` (patch-engine: `diff`,
`patch`, `compose`, `rebase`) · `ranking/davidson.ts` (ranking-model) ·
`ranking/ceiling.ts` (the confidence a room's evidence can reach —
`ceilingPct`, `winsNeeded`; Q840) · `adoption-threshold.ts` · `tokens.ts` ·
`hash.ts` + `sha256.ts` + `rng.ts` (event-log integrity) · routing lives in
`session.ts` (`feed`, `bountyBoard`, `backlog`) · `participant-api.ts` (the
blind-discipline surface, `authorVisible`) · `race-labeler.ts` (advisory
naming, outside the state machine; Q49) · `oracle.ts` (SemanticOracle
contract; implementations live outside the engine) · `dedup-gate.ts`
(advisory async dedup-gate, outside the Session).

## The close (SPEC §4.6, Q467)

`Session.tick(t)` runs the close when the clock reaches the window's end
(`dueToClose(t)`): a **final adoption batch regardless of cooldown phase**
(`sweepAdoptions(t, final)` snapshots the ready set at T=0), then every race
still live records the third outcome **`candidate-undecided`** (raceId + refund
0 — tokens are worthless at close, §7), then **`closed`**. `closedAt` reads
T=0; a later act meets `assertOpen`, which throws the typed `DocumentClosedError`
(`the document closed at N`). The close is an event, never a wall-clock
inference at load — replay is bit-identical across it. The engine does **not**
close on an arbitrary act carrying a past-window timestamp (tests use such
timestamps freely); only the clock — `tick` — closes, the way lapse
is host-driven. `finalRender` and `backlog` read the log after the close
(races() is then empty): `finalRender` reports the adopted-at-T=0 set and the
document as it stands; `backlog` is the undecided set, ranked. `outcomes()`
serves `undecided` alongside `adopted`/`retired`. The host's explicit `close(t)`
(a sim's end) runs the same sequence.
