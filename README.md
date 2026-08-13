# draft (working name)

A compiler for group agreement. Input: a starting text, a roster, a constitution file. Output: the most-agreed text, plus a record of every disagreement, ranked and mapped.

First target: constitutional conventions for Newspeak House cohorts (rosters ~5–20), designed not to preclude much larger instances.

- **[SPEC.md](SPEC.md)** — the specification (currently v0.6), single source of truth for the mechanism.
- **[QUESTIONS.md](QUESTIONS.md)** — open and deferred items; resolved decisions are folded into the spec, not logged separately.
- **[CLAUDE.md](CLAUDE.md)** — project conventions, v1 product decisions, and the glossary of named parts.

Codename: **draft**.

## Layout

- `packages/engine-core` — the mechanism as a pure, deterministic TypeScript library (P1): patch-engine, ranking-model, session state machine, event-log, router. See its `NOTES.md` for implementation decisions.

## Development

`npm install` at the root, then `npm test` / `npm run typecheck` (workspaces).

Status: spec v0.6 current. P1 (engine-core) built and tested; P2 (sim-harness) next.
