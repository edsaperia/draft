# draft — project conventions

A group drafting engine: patches race, blind pairwise judgments rank them, adoption clears a rising confidence bar. SPEC.md is the source of truth for the mechanism; when spec and code disagree, the spec wins until Ed amends it.

## Documents

- `SPEC.md` — the mechanism spec. Amend only with Ed's sign-off; bump the version.
- `QUESTIONS.md` — open clarifying questions, numbered. Never renumber; mark answered items and record the answer inline.
- `DECISIONS.md` — (to be created) durable decisions with rationale, one entry per decision.

## Glossary — named parts

Use these names in all discussion, commits, and code. Literal and stable beats elegant.

**Engine (mechanism, no UI):**
- `engine-core` — session state machine: candidates, races, adoptions, θ ramp, tokens/refunds, adoption floors, certification.
- `patch-engine` — text machinery: diffs, footprints, three-way merge, rebase, surgery.
- `overlap-gates` — the three-gate classifier for colliding patches: textual composition → semantic composition → rivalry.
- `ranking-model` — Bradley–Terry preference model (per race) + global salience model, with active pair sampling and saturation detection.
- `router` — v/c_p feed ordering, hot set, exploration/salience streams, floors-aware serving, notification digests.
- `event-log` — append-only hash-chained log, seeded RNG, participant receipts.
- `dedup-gate` — submission-time duplicate check (embeddings, edit distance, LLM equivalence) plus behavioral dedup probes.
- `coherence-auditor` — machine participant patrolling document drift, fixed token budget.

**Product (UI and ceremony):**
- `race-card` — the judging surface: contested text, two candidates, A/B/indifferent/propose-C.
- `composer` — the briefed drafting surface: heat, camps, why-digest, graveyard, bridge bar.
- `gazette` — public feed of resolved outcomes; the chamber view is its ambient rendering.
- `bounty-board` — public tab of saturated races ranked by resolvable disagreement × salience.
- `record-builder` — closing publication: final text + the record (rankings, camps, graveyard, care map, minority map, backlog, audit log).

**Tooling:**
- `sim-harness` — synthetic-participant simulator driving engine-core; parameter sweeps against throughput, stability, bridge rate, backlog quality.

## Conventions

- Windows machine, PowerShell 5.1 — see global CLAUDE.md traps (no Get-Content/Set-Content rewrites, use Bash tool for gh/multi-line git).
- No deploys or pushes without Ed's say-so.
