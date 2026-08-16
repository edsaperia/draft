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

**Design system (session-view, tokenised 2026-08-16 — the composer should adopt it rather than invent its own):**
- `lifecycle palette` — four hues held as raw RGB channels: `--lc-urgent` 🔥, `--lc-open` ❓❌, `--lc-deciding` ⏳, `--lc-closed` ✅❎🔄☑️. One rule: **colour means you can still affect it; grey means the door is shut.** Applied identically to the queue card's wash, the paragraph's wash and the gutter mark.
- `--primary` — the one accent: every open card, every wire, every selection. `--ok` — green, meaning *decided* and only that.
- type scale `--t-lead / --t-body / --t-ui / --t-small / --t-cap / --t-micro`; the `.eyebrow` class carries the single upper-case label treatment.
- spacing `--s1`–`--s5` on a 4px grid; radii `--r-sm / --r-md / --r-lg`; elevation `--shadow-sm/md/lg`, neutral never tinted; layout constants `--rail-left / --rail-right / --nav-h`.

**Product (UI and ceremony):**
- `session-view` — the default member surface: the charter, readable top to bottom, with every contested clause marked where it bites and the `needs-you-queue` beside it. Design: design/session-view.html; reasoning in design/session-view.notes.md, which opens with the current design system. Its zones:
  - `contents-rail` (left) — the charter's own headings, following the reader, adopted sections only. Each heading carries the **lifecycle marks** of the questions inside it (innermost ownership, capped at four, keeping whatever is still actionable and dropping ☑️ first); a heading holding exactly one question opens it on click. Scrolls inside itself, scrollbar hidden.
  - `needs-you-queue` (right) — a **margin index**, not a ranking: every entry stands beside its own clause in document order. Entries that still **need you** are pinned on screen (at their clause while it is visible, piled against the band edge once it is not, always in document order, with an overflow count when more exist than fit). Judged lines and sealed dots stay with their clauses, scroll away, and step around a pinned card rather than hiding under it. The single most urgent card is exempt from the fit cap.
  - `lifecycle mark` — one glyph per entry, the same alphabet in all three columns (contents rail, document gutter, queue): ❓ needs you · 🔥 wants you most · ❌ stuck, wants a draft not a judgment · ⚖️ a salience diagonal, wants a ranking not a judgment · ⏳ you have judged, still running · 🔄 ground shifted, comes back rebuilt · ✅ decided, charter changed · ❎ decided, incumbent held · ☑️ filed. 🔥 means *an ordinary judgment that wants you most*, so ❌ and ⚖️ are never it.
  - `salience-diagonal` — SPEC §8.3's ~1-in-10 card, asking which of two open **questions** deserves more of the room's attention. A patch turned inside out: one judgment, two anchors in different parts of the charter, two queue entries joined by a wire spine, and one card whose two lanes hold the two questions. Choosing ranks the questions and never touches either text.
  - `suggestion-anchor` — a challenged clause wears its queue card's own lifecycle hue and no left rule; the wash deepens on whatever is open. A filed clause washes nothing. `insert-anchor` is a blank held-open gap with ❓ beside it. `chip-gutter` is the left margin the marks stack in, keeping the prose column unbroken.
  - `decision card` — opens in place beneath its clause. The author's rationale on top, then two lanes and nothing else: **the lanes are the buttons** (click the text you prefer), with no titles at all. Commit row is two glyphs sharing one slot — 🤷 until you choose, then a green ✓ — with Skip only on the 🔥 card. Submitting does not close the card: the tick presses in and springs back out if you change your mind. A patch opens **a card at every place it touches**, one judgment across all of them, with a ↑/↓ stepper between places.
  - `sealed record` — every entry opens one, filed ones included: the **whole field ranked**, each proposal full width in order with its win probability and whether it cleared the bar. The incumbent is not in the ranking — it sits above the field where it held, below it as "the text it replaced" where a challenger carried. Plus quorum met, the bar at the time, and what you did. Unread decisions pin themselves until you press **OK, I've seen this**; reading alone does not clear it.
  - `evidence-meter` — closeness-to-resolution as a magnitude, never a direction. Lives **only** on queue cards, where the wash's fill *is* the bar; decision cards carry no progress.
  - `queue-wire` — for the open judgment only, the run from its entry down the gutter into every place in the charter it refers to; a patch's runs share a spine. `section-toggle` — the fold triangle, mirrored in the contents rail and the document gutter.
- `race-card` — the judging surface: contested text, two candidates, A/B/indifferent/propose-C. In the UI it is the session-view's escalation state. **design/race-card.html is stale and should not be copied from** — it predates the whole current card grammar (yellow cards, per-candidate verdict buttons, "Option A/B" labels), all of which session-view has since replaced. Session-view is the only current word on card design; bringing race-card.html forward is now a rebuild, and Q70 asks whether it should exist at all.
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
