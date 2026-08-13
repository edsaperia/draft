# draft (working name)

A compiler for group agreement. Input: a starting text, a roster, a constitution file. Output: the most-agreed text, plus a record of every disagreement, ranked and mapped.

First target: constitutional conventions for Newspeak House cohorts (rosters ~5–20), designed not to preclude much larger instances.

- **[SPEC.md](SPEC.md)** — the specification (currently v0.6), single source of truth for the mechanism.
- **[QUESTIONS.md](QUESTIONS.md)** — open and deferred items; resolved decisions are folded into the spec, not logged separately.
- **[CLAUDE.md](CLAUDE.md)** — project conventions, v1 product decisions, and the glossary of named parts.

Codename: **draft**.

## Layout

- `packages/engine-core` — the mechanism as a pure, deterministic TypeScript library (P1): patch-engine, ranking-model, session state machine, event-log, router, and the participant API (the one surface humans, sim personas, and personal AIs all speak). See its `NOTES.md` for implementation decisions.
- `packages/sim-harness` — synthetic participants driving full sessions (P2): deterministic scripted personas with ground-truth welfare metrics, and LLM personas on claude-haiku-4-5. See its `README.md`.

## Development

`npm install` at the root, then `npm test` / `npm run typecheck` (workspaces).
Run a simulation: `npm run sim -w @draft/sim-harness -- --mode scripted --seeds 5`.

Status: spec v0.7 current. P1 (engine-core) and P2 (sim-harness) built and tested,
including LLM personas running on the local Claude subscription (`--mode subscription`).
Open decision (QUESTIONS #28): calibration sweep of the constitution vs going straight
to P3 (LLM layer: semantic composition, dedup, surgery, briefings). Finished LLM run
logs land in `packages/sim-harness/runs/` (git-ignored).
