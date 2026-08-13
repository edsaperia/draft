# Decisions

One entry per durable decision, with rationale. Cross-referenced from QUESTIONS.md by number. Until a spec bump folds them in, entries here override SPEC.md where they conflict.

- **D1 — Target context.** Newspeak House constitutional conventions. Roster typically 5–10, conventions 15–20. Design must not preclude 100+/1000+ instances (spec §8.1 already anticipates population scale), but v1 tunes to small rosters — which means data-efficiency matters more than throughput in model choices.
- **D2 — Deployment.** Hosted multi-tenant web service.
- **D3 — Build order.** Engine-first (phases P1–P5 as proposed 2026-08-13). Consequence of the "play-along" ambition: sim-harness personas must be ordinary clients of the same engine API a human client uses, so mixed human/bot cohorts work — no privileged sim backdoor.
- **D4 — Stack.** TypeScript end-to-end; engine-core as a pure, dependency-free library shared by sim-harness and product server.
- **D5 — Sim personas.** LLM-powered by default on a cheap model (Haiku-class); realistic behavior valued over token savings. Scripted personas still worth having for fast deterministic unit-level sweeps.
- **D6 — Evidence clock.** Global: θ ramps on total comparisons across the whole session; the document settles as a whole. Known corner (quiet races face hardened θ) accepted; sim should measure it.
- **D7 — Refund formula.** Keep peak-w: refund = stake × min(peak P(beats incumbent)/0.5, 1.5). Rationale: refunds exist only for anti-flooding; peak protects early good-faith proposers whose probability collapses when a later, better draft arrives (exit-time w would punish them for someone else's bridge); junk never peaks high; implementation is one running max.
- **D8 — Mixed clocks intentional.** Wall-clock token drip + evidence-clock θ: soft, visible amendment space early to encourage proposals; hardening tracks absorbed judgment so the outcome isn't a surprise. Flag: feel unknown in advance — revisit after sim/pilot.
- **D9 — Propose C.** The composer's output is a brand-new patch: normal 1-token stake, races wherever its footprint lands (same race or elsewhere). Held loosely — Ed not fully certain; revisit if sim shows composer friction.
- **D10 — Roster is admin-mutable.** Admin may add/remove participants mid-session. Default mechanics (mine, to validate in sim): a joiner receives the base grant plus drip accrued to date, subject to cap; F recomputes from current E; on removal, the participant's live candidates remain live flagged author-departed and their cast judgments stay counted.
- **D11 — Dominated invitation.** Trigger: projected against the θ ramp — the candidate looks very unlikely to ever clear θ before close given current evidence and trajectory. UI language: "looks very unlikely to win", not "cannot win".
- **D13 — Care-map evidence.** Log enough to compute both variants (incumbent-involving indifference only vs all indifference on the race); choose after inspecting realistic sim care maps.
- **D14 — Authorship visibility.** Constitution/admin setting with modes: `public` (live), `sealed` (hidden during the session, revealed at close), `anonymous` (never revealed). Default: sealed, in the spirit of blind judgment. Rationales are always visible; only the author identity is governed.
- **D15 — Auth.** Magic links to roster email addresses.
- **D16 — Document format.** Markdown, rendered as rich text. Typical scale a few pages; long-document behavior stays in scope as a sim experiment, so footprint anchoring shouldn't assume small docs.
- **D17 — Bring-your-own-AI proposing.** Participants may connect their own AI to draft and propose patches on their behalf. Not the default UX, but a supported first-class path — which makes the participant-facing API (submit patch, read own briefings, judge) a real product surface, not an internal detail. (Follows from D3's no-backdoor principle: bots, personal AIs, and humans all speak the same API.)

## Proposed SPEC v0.6 edit list (pending Q21 approval)

1. §1 roster: "fixed at open" → admin-mutable, with D10 mechanics.
2. §6.2: "cannot win" → projected-θ trigger, softened language (D11).
3. §3.3: propose-C output is a new patch, normal stake, footprint decides its race (D9).
4. §7: note peak-w rationale (D7).
5. New constitution parameter: authorship visibility `public | sealed | anonymous`, default sealed (D14).
6. §4.1: salience model unit per Q18–20 outcome.
7. New non-normative note: participant-facing API as a first-class surface for bring-your-own-AI proposing (D17) and mixed human/bot sessions (D3).
