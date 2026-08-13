# draft

A compiler for group agreement. Input: a starting text, a roster, a constitution file. Output: the most-agreed text, plus a record of every disagreement, ranked and mapped.

The mechanism in one breath: proposed changes are patches; patches that conflict race each other; participants make blind pairwise judgments (A / B / indifferent / propose-C — no authorship, no standings); a race adopts its leader when the win-probability clears a confidence bar that rises over the session; whatever never clears the bar ships as a ranked backlog. The session's product is not just the text — it is the full map of what was agreed, what was contested, and what the minority cared about.

First target: constitutional conventions for [Newspeak House](https://newspeak.house) cohorts (rosters ~5–20), designed not to preclude much larger instances.

- **[SPEC.md](SPEC.md)** — the specification (currently v0.8), single source of truth for the mechanism.
- **[QUESTIONS.md](QUESTIONS.md)** — open and deferred items; resolved decisions are folded into the spec, not logged separately.
- **[CLAUDE.md](CLAUDE.md)** — project conventions, v1 product decisions, and the glossary of named parts.

## Layout

- `packages/engine-core` — the mechanism as a pure, deterministic, dependency-free TypeScript library (P1): patch-engine (diffs, footprints, rebase), ranking-model (Bradley–Terry with ties), the session state machine, hash-chained event-log, router, token economy, and the participant API — the one blind-discipline surface that humans, sim personas, and personal AIs all speak identically. See its [`NOTES.md`](packages/engine-core/NOTES.md) for implementation decisions.
- `packages/sim-harness` — synthetic participants driving full sessions (P2): deterministic scripted personas with ground-truth welfare metrics, LLM personas (fourteen of them, including a schemer, a revolutionary, and a literal dog), a constitution calibration sweep, and a colour commentator for watching runs live. See its [`README.md`](packages/sim-harness/README.md).

## Development

`npm install` at the root, then `npm test` / `npm run typecheck` (workspaces).

```
# a deterministic scripted run with welfare scoring
npm run sim -w @draft/sim-harness -- --mode scripted --scenario clubhouse --seeds 5

# the calibration sweep (LLM-free, ~575 runs)
npm run sweep -w @draft/sim-harness

# a live LLM session with colour commentary (needs Claude credentials)
npm run sim -w @draft/sim-harness -- --mode subscription --scenario clubhouse \
    --model claude-sonnet-5 --hours 4 --verbose --commentary
```

## Status

Spec v0.8. P1 (engine-core, 139 tests) and P2 (sim-harness) built and tested; the mechanism holds up in practice:

- **Scripted validation**: welfare ratios 0.96–1.00 across seeds on both scenarios — the mechanism reliably finds (nearly) the utilitarian-best text a roster's latent preferences admit, including on the coupled `clubhouse` scenario where the optimal document is reachable only through correctly *ordered* adoptions.
- **Calibration sweep** (2026-08): 575+ runs over nine constitution knobs. Robust everywhere (0.94–0.99); a smaller hot set (3) beat the old default and is now the spec default; long post-adoption cooldowns measurably starve resolution and are now doctrinally capped (§4.2).
- **Live LLM runs**: full sessions with fourteen Sonnet-powered personas speaking the same participant API as humans, no sim backdoor. Emergent bridge-drafting, factional skirmishes, and overturns consistent with the spec's self-correction story. Two real engine bugs (router slot starvation, replay divergence) were found by simulation before any UI existed.

Next: P3 — the LLM layer of the engine itself (semantic composition gates, dedup, surgery, briefings, machine participants).

Run logs and sweep CSVs land in `packages/sim-harness/runs/` (git-ignored).
