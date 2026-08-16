# draft — project conventions

A group drafting engine: patches race, blind pairwise judgments rank them, adoption clears a rising confidence bar. SPEC.md is the source of truth for the mechanism; when spec and code disagree, the spec wins until Ed amends it.

## Documents

- `SPEC.md` — the mechanism spec, and the single source of truth. Amend only with Ed's sign-off; bump the version. No separate decision log: resolved decisions are folded into the spec ("keep latest design, not history" — Ed, 2026-08-13).
- `QUESTIONS.md` — open and deferred items only, numbered from one continuous project-wide sequence (Ed answers by number). Never renumber or reuse numbers; delete items once folded into the spec. Questions raised in chat that Ed doesn't answer before the session ends belong here with real sequence numbers — otherwise they die in the transcript. Draw in-chat numbers from this sequence too when they concern project decisions; ad-hoc chat numbering collides with it and makes the record ambiguous (learned 2026-08-15).
- `design/*.html` — the mockup series (race-card, session-view, composer): single static files, light-only, Bootstrap-plain, shared palette and one continuous fictional world (the Hollow Oak Club charter). Each carries its own design notes and named-parts glossary at the bottom — except `session-view`, whose notes moved to `design/session-view.notes.md` on 2026-08-15 (Ed, 76: nothing sits underneath the three-column view). Keep new surfaces consistent with the series.
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
- `session-view` — the default member surface: the current document with suggestions anchored where they bite — quick-approve singletons, race anchors that escalate in place, multi-site patch anchors — plus the needs-you queue. Design: design/session-view.html. Its named zones: `contents-rail` (left; the document's own headings, follows the reader, adopted sections only), `needs-you-queue` (right; one list, three states by colour — needs-you · still-deciding · sealed), `suggestion-anchor` (the paragraph treatment, in three kinds: quick · race · patch), `chip-gutter` (the left margin where anchor chips stack, keeping the prose column unbroken), `evidence-meter` (closeness-to-resolution as a magnitude, never a direction), `freshness-highlight` (a paragraph adopted since you last looked lights purple and cools over `--fresh-fade`; its gutter chip persists as the doorway to the change card), `insert-anchor` (a three-line held-open gap where a proposed new section would stand), `queue-wire` (for the open card, the run from its queue card down the gutter into every place in the document it refers to), `section-toggle` (the fold triangle on each heading, mirrored in the contents-rail and the document gutter), `verdict-pill` (the three-segment A / indifferent / B control below the lanes; Skip and Submit sit beneath it, so choosing and committing are separate acts). Colour grammar: yellow = text under challenge, in the document; pink = the card where it's argued; the anchor's left rule names the kind (green singleton, yellow race, blue patch); purple = changed-since-you-looked.
- `race-card` — the judging surface: contested text, two candidates, A/B/indifferent/propose-C. In the UI it is the session-view's escalation state (overlay model, design/race-card.html). **Note:** design/race-card.html predates the current card grammar — it still draws its cards yellow and puts the verdict in per-candidate buttons, where session-view now uses pink cards, ledgers above the lanes and the `verdict-pill` (Q70). Treat session-view as the current word on card design until race-card.html is brought forward.
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
- **Checking a mockup:** serve `design/` over localhost (a tiny node http server) and measure the DOM with the browser tools — geometry, computed styles, element counts. `file://` URLs are refused by the extension. Two traps cost real time on 2026-08-16: the automation tab runs **backgrounded**, so `requestAnimationFrame` never fires, CSS transitions don't run, `:hover` never applies, and `setTimeout` is clamped to ~1s. Anything animated must be driven by stubbing the animation helper, and hover states can only be verified by reading the CSS rule. A stalled sequence in that tab usually means rAF, not a bug.
- **Mockup fixtures:** one array of items, each carrying its own content, progress and state — never parallel literals kept in sync by hand. Content is hand-authored; `sim-harness` has no session-state exporter, and the fixture holds diffs, rationales and captions the engine has no opinion about anyway.
- No deploys or pushes without Ed's say-so.
