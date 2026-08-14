# engine-core — implementation notes (P1–P3)

Decisions the spec left to implementation, and P1 simplifications. Anything
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
  evidentiary role (loss accounts, span attribution) is P3.
- **Dominated** (SPEC §6.2, projected per Q11): P(incumbent beats X) exceeds
  the current adoption threshold, on ≥ 5 comparisons involving X. Since the
  threshold only rises within a session, "the incumbent already clears the
  current bar against you" is a fair reading of "no realistic path".
- **Saturation:** ≥ `saturationMinComparisons` usable comparisons AND the
  best available pair's value < `saturationEpsilon`, where pair value =
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

## Router v1 (SPEC §8, simplified)

- Race value = (leaderP / adoption threshold) × salience weight; races short
  of the floor get a 1.25× boost in feeds of participants who haven't judged
  them (§8.2's "unheard preference").
- Slot pattern is deterministic (every `salienceEvery`-th slot a diagonal,
  every `explorationEvery`-th an exploration card) rather than sampled;
  the seeded RNG picks diagonal race pairs. Feeds are pure: same state,
  same feed — replay-auditable.
- c_p = mean in-bout response gap (gaps > `boutGapMs` discarded).
  Participants at or below the median c_p (or without data) get exploration
  slots; costlier judges get only top-value edges. This implements the v/c_p
  division of labor without per-pair v/c_p arithmetic.
- Diagonal cards serve race leaders, uniformly sampled; salience-uncertainty
  weighting is a P2 refinement.

## Advisory gates beside the sync fold (P3 phase 1)

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

## Deferred to P2/P3 (stubs or absent by design)

- Gate 2 semantic composition, inclusion lattices, and lattice diagonals
  (overlap → rivalry today; lattice diagonals are logged but unmodeled).
- Dedup: behavioral probes, co-sign invitations, graveyard checks, and
  the author-facing co-sign/differentiate/insist choice (the P3 gate
  advises the caller only; the sim runner auto-co-signs).
- Surgery proposals (the `splitHunks` primitive exists; no engine command).
- Bridge metric / stratified probes; composer briefings; loss accounts.
- Machine participants (incl. coherence auditor); "weak dissatisfaction"
  from propose-C is logged but does not move any model.
- Authorship visibility is stored in the constitution; enforcement is the
  API layer's job (the engine stores truth).

## Module map

`session.ts` (engine-core state machine) · `text/` (patch-engine) ·
`ranking/davidson.ts` (ranking-model) · `adoption-threshold.ts` ·
`tokens.ts` · `hash.ts` + `rng.ts` (event-log integrity) · routing lives in
`session.ts` (`feed`, `bountyBoard`, `backlog`) · `oracle.ts`
(SemanticOracle contract; implementations live outside the engine) ·
`dedup-gate.ts` (advisory async dedup-gate, outside the Session).
