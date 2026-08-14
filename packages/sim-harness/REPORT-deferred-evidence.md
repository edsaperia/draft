# Deferred-questions evidence pass — QUESTIONS #8, #9, #10, #13

**Date:** 2026-08-14 · **Engine:** SPEC v0.12 mechanics (commit 8a99bbe) · **Mode:** scripted personas only — deterministic, no network, no LLM calls.

**Reproduce:** `npm run evidence -w @draft/sim-harness -- --q all --seeds 10 --hours 8`. Per-run CSVs land in `packages/sim-harness/runs/evidence-q{8,9,10,13}.csv`. Same seeds, same numbers, byte for byte.

**Method.** Every configuration ran 10 seeds; numbers below are mean±sd across seeds unless stated. All runs use the clubhouse scenario family (8h window, engine-default constitution) except where noted; roster sizes are slices of the 14-persona clubhouse cast. Scripted personas judge and draft from a known latent utility model, which is what makes ground-truth comparisons (welfare, true indifference) possible. Findings are numbered continuously so you can answer by number.

---

## Q8 — Mixed clocks feel

**Question.** The token drip and the adoption threshold both run on the wall clock. Intended feel: soft early (low bar, visible motion), hardening as the session absorbs judgment. Does it play out that way, and does the token economy ever bind?

**Setup.** Rosters of 5, 8, and 14 (clubhouse slices), plus a "slow start" arm: roster 8 with every persona's first bout delayed to 40% of the window. Measured: when adoptions land (quarters of the window), the bar they cleared, drafting starvation (persona wanted to draft, had no token — scripted personas expose intent), and drip lost to the token cap (audited tick-by-tick from the event log with engine-core's own ledger arithmetic; the audit cross-checks exactly against session balances on every run).

| arm | adoptions | by quarter (Q1–Q4) | first adoption | mean bar cleared | starved | drip lost to cap | welfare | backlog |
|---|---|---|---|---|---|---|---|---|
| roster-5 | 10.3±0.9 | 4.2 / 4.2 / 1.7 / 0.2 | 0.17h | 0.69 | 0 | 29.8/run (≈6.0 per person) | 0.98±0.04 | 2.7 |
| roster-8 | 12.1±1.8 | 7.0 / 4.0 / 1.1 / 0.0 | 0.19h | 0.66 | 0 | 41.9/run (≈5.2) | 0.98±0.03 | 9.6 |
| roster-14 | 16.5±3.2 | 11.0 / 4.2 / 1.0 / 0.3 | 0.19h | 0.65 | 0 | 73.1/run (≈5.2) | 0.98±0.03 | 13.4 |
| roster-8 slow start | 9.7±1.1 | 0.0 / 3.0 / 5.4 / 1.3 | 3.39h | 0.82 | 0 | 40.4/run (≈5.0) | 0.93±0.04 | 8.2 |

**Reading.**

1. **The intended shape is real.** On prompt starts, 65–70% of adoptions land in the first quarter-and-a-bit of the window at a bar of 0.65–0.69; almost nothing adopts in Q4 (the 0.95-ish bar filters it out). First adoption inside the first 12 minutes at every roster size. Soft early, hard late — as designed, at all three roster sizes.
2. **The token economy never binds.** Zero starvation events across all 40 runs — no persona ever wanted to draft and couldn't. Meanwhile essentially every participant loses 5–6 of their 10 drip tokens to the cap (they sit at cap most of the session). At v1 parameters (grant 4 · drip 1/10% · cap 8 · stake 1) tokens are slack: the drip exists but does almost nothing, because drafting demand (~2–3 candidates per person) never outruns the grant plus refunds. The "mixed clocks tension" Q8 worries about barely has a surface to act on.
3. **A slow-starting session does waste its low-threshold phase, gracefully.** With everyone arriving at 40% of the window, the first adoption comes at 3.4h and the mean bar cleared jumps from 0.66 to 0.82. Cost: ~2.4 fewer adoptions, welfare 0.93 vs 0.98 (per-seed range 0.85–1.00 vs 0.89–1.00). Degradation, not pathology: the session still converges, backlog does not balloon, and nothing adopts on thin evidence — the floor and posterior do the protecting, as §4.3 claims.

**Recommendation.** Evidence says the wall-clock pairing is safe to keep for v1: the feel matches intent on prompt starts and degrades gracefully on slow ones. Separately, the drip is inert at current parameters — if simplification ever appeals, drip could shrink or the cap could drop without observable behavior change at small rosters. Re-check only if token demand rises (e.g. heavy propose-C use by live cohorts, or bigger menus of viable drafts).

---

## Q9 — Propose-C staking

**Question.** Propose C pays twice: the forfeited comparison (the peek price) plus a normal stake on the new draft. Does the combined price over-deter drafting?

**Setup.** The scripted machinery had no propose-C path, so one was added honestly: a persona policy (`ProposeCPersona`) that, when served a card where its own preferred alternative clearly beats both options shown, sometimes answers by drafting — the runner opens the composer (forfeiting the pair, exactly as §3.3 prices it) and submits at normal stake. Full 14-persona clubhouse; arms vary the propensity to take that path (0 / 0.3 / 0.6), plus a 0.3 arm with the stake set to 0 session-wide (the engine has no per-path stake knob; this is the honest available contrast). Bridge rate as spec'd (§6.3 minimum support across camps) isn't measurable — engine-core has no camp/bridge machinery yet — so the closest outcome measures are the C-drafts' adoption rate and welfare.

| arm | composer entries | C-drafts submitted | C-drafts adopted | stake-blocked intents | candidates | adoptions | welfare | edge judgments |
|---|---|---|---|---|---|---|---|---|
| propensity 0.0 | 0 | 0 | — | 0 | 34.5±5.6 | 16.1 | 0.98±0.02 | 308 |
| propensity 0.3 | 3.5±1.4 | 3.5±1.4 | 1.6 (46%) | 0 | 35.6±4.6 | 15.8 | 0.98±0.02 | 312 |
| propensity 0.6 | 5.7±1.6 | 5.7±1.6 | 3.4 (60%) | 0 | 40.3±6.5 | 17.3 | 1.00±0.01 | 342 |
| propensity 0.3, stake 0 | 3.5±1.4 | 3.5±1.4 | 1.6 | 0 | 35.6±4.6 | 15.8 | 0.98±0.02 | 312 |

**Reading.**

4. **No deterrence is measurable at v1 parameters.** Zero stake-blocked propose-C intents in 40 runs; every composer entry converted to a submitted draft. The stake-0 arm is decision-for-decision identical to the stake-1 arm (identical per-seed metrics) — because balances never drop low enough for the stake to gate anything, removing it changes ledgers but not one behavior. The price exists on paper; nobody ever hits it. This is the same slack economy as finding 2.
5. **The peek price also costs nothing visible.** Forfeited comparisons did not thin the evidence stream — edge judgments *rose* with propensity (308 → 342), because C-drafts spawn fresh pairs worth judging.
6. **Propose-C drafts are good drafts.** They adopt at 46–60%, above the all-candidates adoption rate (~43–47%), and the heavy arm's welfare nudged up (1.00±0.01 vs 0.98±0.02, 9/10 seeds at 1.00). Answering a card by drafting is exactly the escalation the mechanism wants; the pricing did not discourage the personas who had something better to say.
7. **Caveat.** Scripted personas draft from a fixed menu and want few tokens. A live or LLM cohort with a bigger appetite could still meet the price — the sim can't rule that out, only report that the v1 defaults leave enormous headroom before it binds.

**Recommendation.** Evidence says keep §3.3 as written ("brand-new patch, normal stake" plus the forfeit): at v1 parameters it deters nothing measurable and the path produces above-average candidates. Revisit only with live-cohort evidence of stake-blocked composer entries — which the product could log the same way the sim does.

---

## Q10 — Roster-change mechanics (§9.3)

**Question.** Are the §9.3 defaults (joiner gets base grant + accrued drip capped; F recomputes from current E; departed authors' candidates stay live) free of pathologies — adoption storms after F drops, orphaned candidates distorting welfare, joiner token advantage?

**Setup.** Roster-8 clubhouse, four arms: baseline; a join at 50% (Rosa, an eager drafter); removal at 50% of Gale (p7, high draftiness, reliably has live candidates); and a double removal at 60% (Bee + Eli) dropping E 8→6 so the adoption floor F falls from 3 to 2 — below any race already waiting at 2 movers. Movers-at-adoption recovered by replaying the log prefix before each adoption. Welfare of every arm's final text is scored over four fixed roster subsets (the original 8, 8+Rosa, 8−Gale, 8−Bee−Eli) so every comparison is over the same people.

| arm | adoptions | after 60% mark | adopted with movers < old F | welfare over orig. 8 | welfare over arm's own roster | backlog |
|---|---|---|---|---|---|---|
| baseline | 13.8±1.9 | 1.3 | 0.0 | 0.97±0.07 | 0.97±0.07 | 9.2 |
| join at 50% | 14.3±1.2 | 1.6 | 0.0 | 0.98±0.03 | 0.98±0.02 (9) | 10.2 |
| remove author at 50% | 14.2±2.3 | 1.9 | 0.0 | 0.96±0.04 | 0.97±0.03 (7) | 9.4 |
| F-drop at 60% | 13.8±2.0 | 1.3 | 0.9 | 0.96±0.06 | 0.94±0.08 (6) | 9.3 |

Join arm details: joiner balance at join **8.0±0.0** (grant 4 + 5 accrued drip ticks, capped at 8) vs incumbent roster mean **7.9±0.2** at the same moment; the joiner then cast 12.4 judgments and 1.7 drafts in the remaining half-window. Removal arm details: **1.5±0.9** live candidates orphaned at removal, of which **0.2/run** were adopted later.

**Reading.**

8. **No joiner token advantage or disadvantage.** The capped grant+drip formula lands the joiner at exactly the cap — which is where the incumbents already sit (finding 2). Balance parity is near-perfect (8.0 vs 7.9), and the joiner participates immediately and usefully (welfare over the original 8 is unchanged; on the one volatile seed, ev10-9, the join arm scored 0.91 where baseline scored 0.78 — fresh judgment helped).
9. **Orphaned candidates are benign.** Departed-author candidates stay live, keep racing, and occasionally win (0.2/run) — and welfare for the *remaining* seven is indistinguishable from baseline over the same seven (0.97±0.03 vs 0.97±0.06). No distortion. One observation worth knowing, not fixing: when an orphan is adopted, its refund is credited to the removed author's ledger — dead tokens for someone who can no longer act. Harmless (tokens are worthless at close, and E excludes the removed), but the product UI should not show it as an invitation.
10. **No adoption storm when F drops.** After the 60% removal, adoptions in the remaining window are exactly baseline (1.3 = 1.3 per run). What changes: ~0.9 of those adoptions clear with 2 movers, legal under the new F=2, impossible under the old F=3 — races that were parked at the floor complete rather than backlog. They still had to clear the ~0.9 posterior bar, so they are late-window near-consensus calls, not junk. Remaining-roster welfare dips slightly (0.94±0.08 vs 0.96±0.08) but inside noise, and the worst seed (ev10-9, 0.73) is bad in baseline too (0.73) — a scenario quirk, not a removal effect.

**Anomaly note.** Seed ev10-9 is the single outlier across Q10 (welfare 0.73–0.78 in baseline and F-drop): the roster locks in a bad coupled pair early. It appears in both arms, so no arm comparison rests on it.

**Recommendation.** Evidence says §9.3's defaults are sound as specified — nothing pathological in join grants, F recomputation, or orphan candidates at this scale. The only nuance worth carrying to product design: F dropping below a waiting race's mover count converts floor-parked races into adoptions silently; if that ever feels abrupt in a live session, the fix is ceremony (a gazette note "floor recomputed, N races now eligible"), not mechanism.

---

## Q13 — Care-map evidence variant

**Question.** Should the care map count (a) only indifference on incumbent-involving pairs, or (b) all indifference in the race? Log both, compare against ground truth.

**Setup.** Both variants computed per issue from the same runs, across three scenarios: `care-map` (new, engineered heterogeneous care — two pure-rewording issues everyone shrugs at, a hot consensus fix, a hot contested split, a camp-split issue where four personas split and four sit exactly midway between the rivals, and a borderline one), plus charter and clubhouse as-is. Ground truth from the personas' utility models: share of (persona, alternative-pair) combinations within the tie threshold — computed two ways, over **all** pairs and over **incumbent-involving** pairs only. "Cold" classification cutoff: indifference rate ≥ 0.5.

Pooled rates over 10 seeds (care-map scenario, the discriminating one):

| issue (design) | (a) inc-only | (b) all | truth all-pairs | truth vs-incumbent |
|---|---|---|---|---|
| motto (cold rewording) | 0.75 | 0.75 | 1.00 | 1.00 |
| newsletter (cold rewording) | 0.76 | 0.76 | 1.00 | 1.00 |
| funds (hot, contested) | 0.00 | 0.00 | 0.00 | 0.00 |
| chair (hot, consensus) | 0.00 | 0.00 | 0.00 | 0.00 |
| **archive (camp split + indifferent middle)** | **0.02** | **0.09** | **0.17** | **0.00** |
| snacks (borderline) | 0.46 | 0.46 | 0.50 | 0.50 |

Agreement summary across all three scenarios: the variants **never disagreed on a cold/not-cold call** — 0 disagreements in 210 classifiable issue-runs. Rank correlation with truth (care-map scenario): vs all-pairs truth 0.99 / 0.99; vs incumbent-relative truth 0.94 / 0.94. Charter and clubhouse have no genuinely cold spans (all truth values ≤ 0.07), and both variants correctly read every span as not-cold there.

**Reading.**

11. **In practice the variants are nearly the same measurement.** The rival-pair gate (§8.3, Q48) keeps rival-vs-rival cards a small fraction of served pairs, so variant (b)'s extra evidence is thin — for most issues the two rates are identical to two decimals, and no cold/not-cold call ever differed.
12. **Where they diverge, the divergence is informative — and favors (a) for the map itself.** The engineered archive issue is the tell: half the roster splits on the rivals, the other half genuinely cannot tell the rivals apart but *actively prefers the incumbent*. The spec's operative definition of cold (§3.2: spans that "keep their incumbents cheaply and stop drawing attention") is incumbent-relative — and the incumbent-relative truth for archive is 0.00: this span is *not* cold, people mind. Variant (a) reads 0.02 (correct); variant (b) reads 0.09, inflated by rival-pair ties cast by people who would object to either change. At higher rival-pair volume (a wide-open gate, or big fields) that inflation would grow.
13. **The (b)−(a) gap is a useful diagnostic, separately from the map.** A span where (b) runs hot while (a) runs cold is the camp-split signature: challengers indistinguishable to a chunk of the room that still defends the status quo. That is composer-briefing material (heat/camp structure), not care-map material.
14. **Honest noise floor:** even engineered fully-cold spans read ~0.75, not 1.00, because persona noise breaks ties; any product cutoff for "cold" should sit well below 1 (0.5 worked cleanly here).

**Recommendation.** Evidence says: build the care map on variant (a), incumbent-involving indifference only — it matches the spec's own meaning of cold and stays honest when rival ties come from incumbent-preferrers. Keep logging (b) (it's free — same events, second counter) and surface the (b)−(a) gap to the composer briefing as a camp-split hint rather than folding it into the map.

---

## What was added to sim-harness (no engine-core changes)

- `src/persona.ts` — `PersonaTelemetry` intent hooks (L33), optional `Persona.considerProposeC` (L57), `TIE_THRESHOLD` exported (L64), starvation hook in `draft` (L128); `scenario`/`rng` made protected for subclassing. Behavior byte-identical when hooks unused (pinned-hash regression still passes).
- `src/scenario.ts` — optional `PersonaProfile.arrivalDelayMs` (L56) and `proposeC` (L62).
- `src/propose-c-persona.ts` — new: `ProposeCPersona`, the propose-C policy.
- `src/runner.ts` — `RosterEvent` + `rosterEvents` config (L29, L48), arrival delay in `makeState` (L95), convenor-act processing in the loop (L156), propose-C serving path (L249: composer open with forfeited pair, then submit). All inert when unused.
- `src/token-audit.ts` — new: tick-by-tick ledger replay from the log via engine-core's `materialize`; cross-checks against session balances (held on every run).
- `src/care-map.ts` — new: both care-map variants + ground-truth oracle + `careMapScenario`.
- `src/deferred-evidence.ts` — new: the four studies behind `npm run evidence` (`--q all|8|9|10|13 --seeds N --hours H`); CSVs to `runs/`.
- `test/deferred-evidence.test.ts` — new: determinism + inertness + audit-consistency + oracle-sanity tests (7 tests).

**Engine observations (documented, not fixed, per scope):** no bugs found. Two design-adjacent notes: refunds credit removed members' ledgers (finding 9), and `ParticipantApi` has no composer-opening call — the runner invokes `Session.openComposer` directly (same precedent as its dedup co-sign path); when the product builds the composer, the participant-api will need that surface.

**Test status:** engine-core 178 passed, sim-harness 31 passed (including the pinned rolling-hash regression `4f1ff461…`, byte-identical — the new hooks change nothing when unused).
