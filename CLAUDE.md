# draft — project conventions

A group drafting engine: patches race, blind pairwise judgments rank them, adoption clears a rising confidence bar. SPEC.md is the source of truth for the mechanism; when spec and code disagree, the spec wins until Ed amends it.

## Documents

- `SPEC.md` — the mechanism spec, and the single source of truth. Amend only with Ed's sign-off; bump the version. No separate decision log: resolved decisions are folded into the spec ("keep latest design, not history" — Ed, 2026-08-13).
- `QUESTIONS.md` — open and deferred items only, numbered from one continuous project-wide sequence (Ed answers by number). Never renumber or reuse numbers; delete items once folded into the spec.

## V1 product decisions

- Target context: constitutional conventions for Newspeak House cohorts. Rosters typically 5–10, conventions 15–20; design must not preclude 100+/1000+ instances, but v1 tunes to small rosters (data-efficiency over throughput).
- Hosted multi-tenant web service; magic-link auth against roster emails.
- Documents are Markdown, rendered as rich text; usually a few pages, long-document behavior stays in scope for sim experiments.
- TypeScript end-to-end; engine-core is a pure, dependency-free library shared by sim-harness and product server.
- Sim personas are LLM-powered on a cheap model (Haiku-class) and speak the same participant API as human clients — no sim backdoor; mixed human/bot sessions are a goal.

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
