# draft — project conventions

A group drafting engine: patches race, blind pairwise judgments rank them, adoption clears a rising confidence bar. SPEC.md is the source of truth for the mechanism; when spec and code disagree, the spec wins until Ed amends it.

## Documents

- `SPEC.md` — the mechanism spec, and the single source of truth. Amend only with Ed's sign-off; bump the version. No separate decision log: resolved decisions are folded into the spec ("keep latest design, not history" — Ed, 2026-08-13).
- `QUESTIONS.md` — open and deferred items only, numbered from one continuous project-wide sequence (Ed answers by number). Never renumber or reuse numbers; delete items once folded into the spec. Questions raised in chat that Ed doesn't answer before the session ends belong here with real sequence numbers — otherwise they die in the transcript. Draw in-chat numbers from this sequence too when they concern project decisions; ad-hoc chat numbering collides with it and makes the record ambiguous (learned 2026-08-15).
- `design/*.html` — the mockup series (race-card, session-view, composer): single static files, light-only, Bootstrap-plain, shared palette and one continuous fictional world (the Hollow Oak Club charter). Each carries its own design notes and named-parts glossary at the bottom. Keep new surfaces consistent with the series.
- `packages/sim-harness/REPORT-deferred-evidence.md` — findings from the 2026-08-14 evidence pass (Q8/Q9/Q10/Q13), with reproduce instructions.

## V1 product decisions

- Target context: constitutional conventions for Newspeak House cohorts. Rosters typically 5–10, conventions 15–20; design must not preclude 100+/1000+ instances, but v1 tunes to small rosters (data-efficiency over throughput).
- Hosted multi-tenant web service; magic-link auth against roster emails.
- Documents are Markdown, rendered as rich text; usually a few pages, long-document behavior stays in scope for sim experiments.
- TypeScript end-to-end; engine-core is a pure, dependency-free library shared by sim-harness and product server.
- Sim personas are LLM-powered on a cheap model (Haiku-class) and speak the same participant API as human clients — no sim backdoor; mixed human/bot sessions are a goal.

- UI north star (Ed, 2026-08-14): **suggestion-mode with escalation** — the default surface reads like familiar Google-Docs-style inline suggestions with approval; the race view (overlay model, pairwise cards) is the escalation state that appears only where suggestions collide or stakes demand ceremony. Most of a session should feel like approving typo fixes; the machinery earns its visibility.

## Glossary — named parts

Use these names in all discussion, commits, and code. Literal and stable beats elegant.

**Engine (mechanism, no UI):**
- `engine-core` — session state machine: candidates, races, adoptions, the adoption-threshold ramp, tokens/refunds, adoption floors, certification.
- `adoption-threshold` — the confidence bar a challenger's win-probability must clear; ramps over the session window (wall clock). Formerly "θ"; always use this name.
- `patch-engine` — text machinery: diffs, footprints, three-way merge, rebase, surgery.
- `overlap-gates` — the three-gate classifier for colliding patches: textual composition → semantic composition → rivalry.
- `ranking-model` — Bradley–Terry preference model (per race) + global salience model, with active pair sampling and saturation detection.
- `router` — v/c_p feed ordering, hot set, exploration/salience streams, floors-aware serving, notification digests.
- `event-log` — append-only hash-chained log, seeded RNG, participant receipts.
- `dedup-gate` — submission-time duplicate check (embeddings, edit distance, LLM equivalence) plus behavioral dedup probes.
- `race-labeler` — advisory naming and typing of disputes: a name ("treasurer oversight") and a type (copy-edit · substantive · structural) per race, from the oracle's `describeRace`, with a deterministic nearest-heading + excerpt fallback. Outside the state machine — labels never enter the event log or gate anything; type is stored but not yet wired to routing (Q49).
- `coherence-auditor` — machine participant patrolling document drift, fixed token budget.

**Product (UI and ceremony):**
- `session-view` — the default member surface: the current document with suggestions anchored where they bite — quick-approve singletons, race anchors that escalate in place, multi-site patch anchors — plus the needs-you queue. Design: design/session-view.html.
- `race-card` — the judging surface: contested text, two candidates, A/B/indifferent/propose-C. In the UI it is the session-view's escalation state (overlay model, design/race-card.html).
- `composer` — the briefed drafting surface: heat, camps, why-digest, graveyard, bridge bar. Design: design/composer.html. Its named zones: `arrival-bar` (which door you came through and what it cost), `dominated-account` (the three-tier loss account), `the-briefing` (heat-panel, standings-panel, camp-map, why-digest, graveyard, bridge-bar), `drafting-desk`, `dedup-gate`.
- `gazette` — public feed of resolved outcomes; the chamber view is its ambient rendering.
- `bounty-board` — public tab of saturated races ranked by resolvable disagreement × salience.
- `record-builder` — closing publication: final text + the record (rankings, camps, graveyard, care map, minority map, backlog, audit log).
- `spectator-api` — strictly-public engine-core projection (gazette, live candidates, bounty board, document): the only surface spectator views may consume (Q42, backlog).
- `spectator-commentary` — optional LLM commentating view for convention spectators, fed exclusively by the spectator-api; unlike the sim's omniscient `commentator`, it sees no private data (Q42, backlog).

**Tooling:**
- `sim-harness` — synthetic-participant simulator driving engine-core; parameter sweeps against throughput, stability, bridge rate, backlog quality. `npm run evidence -w @draft/sim-harness` runs the deferred-question studies (deterministic, no network); findings live in packages/sim-harness/REPORT-deferred-evidence.md.
- `participant-api` — the blind-discipline surface (engine-core module) every participant speaks: cards, judge, submit, gazette, browse. Humans, sim personas, and personal AIs are interchangeable behind it.
- `scripted-persona` / `llm-persona` — deterministic utility-model participants (regression + welfare ground truth) vs claude-haiku-4-5 participants (realism).
- `welfare-ratio` — sim metric: (achieved − incumbent) / (optimal − incumbent) summed utility over the roster; 1.0 = utilitarian-best text found.

## Conventions

- Windows machine, PowerShell 5.1 — see global CLAUDE.md traps (no Get-Content/Set-Content rewrites, use Bash tool for gh/multi-line git).
- No deploys or pushes without Ed's say-so.
