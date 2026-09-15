# The churn measurement — Q1362 stage 5

**Date:** 2026-09-15 · **Engine:** SPEC v0.128 mechanics as built by stages 1–2 (merge `657164a`, amendment `70ea6c8`) · **Mode:** scripted personas only — deterministic, no network, no LLM calls.

**Reproduce:** `npm run churn -w @draft/sim-harness` (add `-- --seeds N --out runs/churn.csv` for a per-seed CSV). Two full runs of the file printed the same bytes, `diff` clean, on this tree. Each cell also prints a digest of its seeds' rolling hashes, so a re-run that has drifted says where.

---

## The question

Ed's ruling of 2026-09-15 (QUESTIONS.md block 1362 (a)) made the current text a peer: a race's field is its live candidates **and** the wording that stands, the ranking orders the whole field, and the top of it is the document once the adoption floor is met. The ruling recorded one known cost in so many words —

> **Recorded as a known cost:** churn (a peer status quo loses on 8–7 and returns on 7–8; the cooldown and the floor are the brakes) — the harness measures flip counts before the fold.

So: **does a peer status quo oscillate, in a room of fifteen, and how much?** And the decision the plan hung on the answer (`design/spec-pass/pass-6.md`, Decision D3): *if reversions at 0.5 are materially above 0.6's, Ed may raise the pinned value — the rule is unchanged, the constant is.*

The short answer to D3 is that **the decision it offers does not exist**, and the long answer is that churn is real, substantial, and braked by the floor rather than by the bar or the cooldown.

## Method

**The two measures**, both new in `src/metrics.ts` and both read from the engine's own log rather than from what the personas intended. A **site** is a patch's own span on the document's line space, taken from the `adopted` event's candidate; the site's first incumbent comes from the `opened` event's text.

- **flips** — every adoption on a site after its first, summed over sites. The document changing its mind.
- **reversions** — an adoption whose wording had stood on that site before. The document changing its mind *back*.

Every `adopted` event also still records `p`, the posterior that the leader beats the text it displaced. It gates nothing now, which is exactly what makes it useful: it lets a log the **new** rule produced be asked the **old** rule's question.

**The room is fifteen, and the fifteenth is constructed.** Ed's alpha room is fifteen; the clubhouse scenario holds fourteen personas, and a scenario persona *is* ground truth — the stances and saliences the welfare model scores against — so inventing a fifteenth opinion would be inventing part of the answer. The fifteenth is therefore a **twin**: the clubhouse member with the flattest stance vector (smallest summed |stance| — chosen by that rule in code, not by hand), seated again under a new id, which the run names in its header as `Biscuit-twin`. A room can hold two people who agree; the twin judges on its own rng draws; and whatever it does to the ranking it does identically in every arm, which is what the study compares. This is the one place the harness could not express what the plan asked for, and it is stated rather than hidden.

**The cells.** The alpha preset (1-minute cooldown, 6 ✏️ capped at 8, one every 5 real minutes) over the three shapes' windows — *meeting* 4 hours, *conference* 3 days, *ongoing* a month standing in for perpetual — 20 seeds each, the same seeds in every arm. No run stopped at the action cap, asserted in the run: the window is the axis.

---

## 1. The bar, which no longer bites

The same seeds at three thresholds. Mean ±sd (min–max) over 20 seeds.

| arm | window | alive | adoptions | flips | reversions | welfare |
|---|---|---|---|---|---|---|
| bar 0.50 (pinned) | meeting | 100% | 18.1 ±3.4 (11–24) | 8.1 ±3.4 (1–14) | 5.5 ±3.0 (0–11) | 0.979 |
| bar 0.50 | conference | 100% | 24.1 ±8.8 (11–44) | 14.1 ±8.8 (1–34) | 11.6 ±8.4 (0–31) | 0.992 |
| bar 0.50 | ongoing | 100% | 24.1 ±8.8 (11–44) | 14.1 ±8.8 (1–34) | 11.6 ±8.4 (0–31) | 0.992 |
| bar 0.60 | meeting | 100% | 18.1 ±3.4 (11–24) | 8.1 ±3.4 (1–14) | 5.5 ±3.0 (0–11) | 0.979 |
| bar 0.60 | conference | 100% | 24.1 ±8.8 (11–44) | 14.1 ±8.8 (1–34) | 11.6 ±8.4 (0–31) | 0.992 |
| bar 0.60 | ongoing | 100% | 24.1 ±8.8 (11–44) | 14.1 ±8.8 (1–34) | 11.6 ±8.4 (0–31) | 0.992 |
| bar 0.80 | meeting | 100% | 18.1 ±3.4 (11–24) | 8.1 ±3.4 (1–14) | 5.5 ±3.0 (0–11) | 0.979 |
| bar 0.80 | conference | 100% | 24.1 ±8.8 (11–44) | 14.1 ±8.8 (1–34) | 11.6 ±8.4 (0–31) | 0.992 |
| bar 0.80 | ongoing | 100% | 24.1 ±8.8 (11–44) | 14.1 ±8.8 (1–34) | 11.6 ±8.4 (0–31) | 0.992 |

**Reading.**

1. **The three arms are not merely close; they are identical, seed by seed.** Not a rounding coincidence — the run asserts it per window, on adoptions, flips, reversions and welfare for every one of the twenty seeds. The plan's premise was that *the engine still honours the values; that is what pinning rather than deleting buys*. It does not: stage 1 removed the threshold from the adoption predicate altogether (`clearsFloor` in `packages/engine-core/src/races.ts:288-293` reads the floor, the leader's on-top flag and the measured clause, and nothing else), so the constant in the constitution is inert. What pinning bought is replay — every live log still resolves `bar` at its recorded value — and not a tuning knob.

   The run also asserts that the value was genuinely applied, because otherwise the identity above would be proof of nothing: the genesis event hashes the constitution, so the three arms' logs differ although nothing *in* them does.

2. **So Decision D3 is void as offered.** There is no pinned constant Ed can raise to buy less churn. If the churn below is judged too high, the remedy has to be a change to the rule or to the floor, not to a number — and that is a bigger decision than D3 was framed as.

3. **A perpetual document is not a document that churns for ever.** *Ongoing* (a month) runs the same session as *conference* (three days) on every seed, adoption for adoption — asserted in the run. The room reaches a fixed point inside three days and the remaining twenty-seven days are idle turns. Churn is front-loaded and self-limiting, not a slow bleed.

## 2. What the retired bar would have stopped

Every adoption at the pinned bar, bucketed by the posterior it was decided on. Reversions are counted in their own row, not in *later flips*.

| window | class | n | median p | below 0.60 | below 0.80 | below 0.85 | below 0.95 |
|---|---|---|---|---|---|---|---|
| meeting | first adoptions | 200 | 0.954 | 1% | 13% | 18% | 47% |
| meeting | later flips | 50 | 0.821 | 12% | 46% | 58% | 76% |
| meeting | reversions | 111 | 0.697 | 5% | 51% | 72% | 86% |
| conference | first adoptions | 200 | 0.954 | 1% | 13% | 18% | 47% |
| conference | later flips | 50 | 0.821 | 12% | 46% | 58% | 76% |
| conference | reversions | 231 | 0.732 | 9% | 52% | 71% | 86% |

*(ongoing repeats conference exactly, per finding 3. First adoptions and later flips are identical across windows because every window shares the same first four hours.)*

**This is an upper bound, not a counterfactual.** Refusing one adoption changes every judgment after it, so a genuine old-rule run would diverge. What the table answers is *how much of this churn is low-confidence churn* — the thing the bar was for.

**Reading.**

4. **Reversions really are the thin end of the evidence.** A first adoption's median posterior is 0.954; a reversion's is 0.70–0.73. Half of all reversions sat below 0.80 and about 70% below 0.85 — so the old 0.85 alpha bar would have refused roughly seven reversions in ten, on this bound. That is a real thing the bar was buying, and the ruling gave it up knowingly.

5. **But the bar would not have stopped the worst of it.** Only 5–9% of reversions sat below 0.60, and the pathological seed in the narrative below flips at posteriors up to 0.969 — the fit is *confident*, in both directions, on successive passes. A bar is a filter on thin evidence; the oscillation here is not thin evidence, it is an evenly-matched pair where each new judgment genuinely tips a small fit. No threshold that let a contested clause change at all would have stopped it.

## 3. The brakes that do exist

SPEC §4.2 now rests its case on two brakes (amendment A4: *the cooldown is the one brake on the pace of change; it backs the floor, and nothing else does*). Both are measured at the **conference** window, where churn is highest, 20 seeds, same seeds throughout.

| arm | floor | alive | adoptions | flips | reversions | welfare |
|---|---|---|---|---|---|---|
| cooldown 1 min (the preset) | 5 | 100% | 24.1 ±8.8 (11–44) | 14.1 ±8.8 (1–34) | 11.6 ±8.4 (0–31) | 0.992 |
| cooldown 5 min (the default) | 5 | 100% | 24.4 ±9.8 (11–49) | 14.4 ±9.8 (1–39) | 11.8 ±9.8 (0–37) | 0.988 |
| cooldown 15 min | 5 | 100% | 22.9 ±10.1 (12–51) | 13.0 ±10.1 (2–41) | 10.6 ±10.3 (0–39) | 0.992 |
| cooldown 30 min | 5 | 100% | 19.7 ±6.8 (12–39) | 9.8 ±6.8 (3–29) | 7.5 ±6.7 (0–28) | 0.989 |
| no quorum | 5 | 100% | 24.1 ±8.8 (11–44) | 14.1 ±8.8 (1–34) | 11.6 ±8.4 (0–31) | 0.992 |
| quorum 25% — *ongoing*'s | 5 | 100% | 24.1 ±8.8 (11–44) | 14.1 ±8.8 (1–34) | 11.6 ±8.4 (0–31) | 0.992 |
| quorum 33% — *conference*'s | 5 | 100% | 24.1 ±8.8 (11–44) | 14.1 ±8.8 (1–34) | 11.6 ±8.4 (0–31) | 0.992 |
| quorum 50% — *meeting*'s | 8 | 100% | 19.5 ±6.6 (10–38) | 9.5 ±6.6 (0–28) | 7.4 ±6.4 (0–27) | 0.991 |
| quorum 80% | 12 | 100% | 13.7 ±2.5 (10–19) | 3.8 ±2.5 (0–9) | 2.3 ±2.1 (0–7) | 0.983 |

**Reading.**

6. **The floor is the brake.** Reversions run 11.6 → 7.4 → 2.3 as the floor goes 5 → 8 → 12, and the spread collapses with the mean: at floor 12 the worst seed of twenty has 7 reversions, where at floor 5 it has 31. Median reversions go 12 → 6 → 2, seeds with none at all go 2 → 2 → 6, and seeds with ten or more go 12 → 5 → **0**. This is ruling (c) vindicated in the mechanism as well as on the surface: the quorum is the number the room controls, and it is the number that decides how settled the document feels.

7. **The cooldown barely is.** 1, 5 and 15 minutes are indistinguishable inside their spreads (14.1 / 14.4 / 13.0 flips); 30 minutes takes about a third off (9.8). In a room whose adoptions are ~20 minutes apart on their own, a cooldown shorter than that gates nothing — it batches adoptions that were not competing for the same moment anyway. **SPEC A4's *the cooldown is the one brake on the pace of change* overstates it**, and the sentence should probably read that the floor is the brake and the cooldown batches. That is a finding against the spec amendment, for Ed, not a fix this build has made.

8. **At fifteen, two of the three shapes' quorums buy nothing.** The floor is `max(Q, min(⌈E/3⌉, 12))`, so at E = 15 the statistical minimum is 5 and *ongoing*'s 25% (4) and *conference*'s 33% (5) both vanish into it; only *meeting*'s 50% (8) raises it. A founder choosing *conference* over *ongoing* for a steadier document would get exactly no steadiness for it.

9. **Churn is nearly free in welfare terms, and that is the trap.** Welfare ratio sits at 0.98–0.99 in every arm — the room ends up in the right place whatever route it takes there, and the worst churning seed at the meeting window scored a perfect 1.000. So no outcome measure will ever flag this. The cost is entirely in what it is like to be in the room: a constitution that rewrites itself thirty times in a day is not a constitution anybody trusts, however good the final text is. **The measurement cannot make this decision; Ed has to.**

## The worst seed, in words

**`churn-11` at the conference window** — 44 adoptions, 34 flips, 31 reversions, welfare 0.981, from 64 candidates and 415 judgments.

Thirty of those forty-four adoptions land on **one line**: the amendment clause, which opened as *"These rules change when everyone who cares agrees, over dinner"*. At +1.3h the room replaced it with *"amended by a two-thirds vote at a house meeting"* (p 0.900). At +1.9h it replaced that with *"amended by simple majority at any house meeting"* (p 0.673). And then it alternated between those two wordings, and only those two, **twenty-eight more times** — +2.2h, +2.5h, +2.9h, +3.3h, +3.6h, +3.9h, and on through +16.3h — at posteriors running from 0.526 to 0.969. It did not converge. It stopped, at *simple majority*, because the proposals stopped: the room ran out of people willing to re-propose, not out of disagreement. Three other clauses on the same seed churned two or three times each and settled.

The mechanism is legible in the log. The room is split roughly evenly on this clause, a Davidson fit over a handful of comparisons swings with each new judgment, and **nothing about having just adopted a wording protects it**. The one cost a flip must pay is a fresh candidate meeting the floor again — the displaced wording is no longer in the field, so somebody must re-propose it and five distinct members must judge it. In a room of fifteen with a five-minute drip that costs about twenty minutes, and half of this seed's drafting went into re-typing two wordings the room had already seen.

The meeting window's worst seed, `churn-3`, is the same shape in miniature: 24 adoptions, 14 flips, 11 reversions in four hours, welfare **1.000**. Its guest clause alternated four times between the wording it opened with and one challenger; its key clause went out, came back, and went out again; its amendment clause flipped five times and settled on the second of the two. A member watching that afternoon sees five clauses change between eight and fourteen times, and ends with the best possible document.

---

## Findings, as a list

Numbered locally; the ones that want a project number are marked, and it is the merging session's to claim them in `QUESTIONS.md` — this build has not touched that file.

1. **The bar is inert; Decision D3 is void as offered.** No constant left to raise. *(wants a Q number — it changes what Ed is being asked.)*
2. **The floor is the brake, the cooldown is not**, and SPEC amendment A4's sentence overstates the cooldown. *(wants a Q number — a proposed correction to a spec line not yet folded.)*
3. **At E = 15 only *meeting*'s quorum raises the floor**; *conference*'s and *ongoing*'s vanish into `⌈E/3⌉`. Whether the shapes should differ on this is a shape-table question. *(wants a Q number.)*
4. **A peer status quo has almost no hysteresis.** A flip costs one fresh candidate and one fresh floor; nothing else protects a wording for having just been adopted. If Ed wants a brake that is not the quorum, the cheap shapes are: count the leader's judges *since the last adoption on that site*, or require the leader to beat the current text by more than it beat the one before. Both are rule changes, not constants. *(wants a Q number.)*
5. **Welfare will never flag this.** 0.98–0.99 in every arm, 1.000 on a seed with eleven reversions. Any future guard on churn has to count flips, not score documents.
6. **The clubhouse personas re-propose from a fixed menu**, which makes re-proposal cheaper than it would be for people typing sentences; the advisory `dedup-gate` (off in this study) would not catch it either, since it checks *live* candidates and the displaced wording is not live. Treat the absolute counts as an upper bound on a human room and the *ordering* across arms as the finding.
7. **`npm test -w @draft/sim-harness` was red on the branch before this build started.** `dedup.test.ts`'s rolling-hash pin was re-pinned for stage 1 (`916ae1c`) and not re-run after the TIE_EPS amendment (`70ea6c8`), so the merge at `657164a` — which is on `main` — carries a red sim-harness test. Re-pinned here, four fresh computations agreeing.
8. **The alpha preset no longer separates from the shipped defaults.** With the bar pinned, *shipped defaults*, *the 1-minute cooldown* and *ALPHA PRESET* print the same row at 15 minutes and roster 8 (1.60 adoptions, 4 judgments, 100% alive at 5 seeds). The preset's sanity check *and more often than at the shipped defaults* now fails on a truth; it is restated as non-regression and the margin is reported. This confirms PRODUCTION.md's calibration finding — *the bar is the only knob that moves anything* — in the sharpest possible way, and stage 6 should say so rather than merely overturning it.

## Recommendation

Ship the rule. The churn is real and this report should not soften it, but nothing here argues the ruling was wrong: the outcomes are as good as they ever were, the room settles, and the pathology is confined to genuinely contested clauses where the old rule's alternative was to freeze them at whatever the incumbent happened to be.

What the numbers do argue is that **the quorum is now load-bearing in a way the shapes do not reflect**. A room that wants a settled document should found at a quorum above `⌈E/3⌉`; at fifteen that means above a third, and only *meeting* does it. If Ed wants one change out of this report, the cheapest is the shapes' quorum column, not the engine.

And the bot-room QA (ruling (e)) should be watched for exactly the seed above: one clause, two wordings, alternating. It is the thing fifteen real people will notice first.

---

## What was added to sim-harness

- `src/metrics.ts` — `flips`, `reversions` and `churn: SiteChurn[]`, the per-site standing history with each adoption's `t`, `p` and reversion flag. Read from the log; no engine change.
- `src/churn.ts` — this study; `npm run churn -w @draft/sim-harness`.
- `src/sweep.ts` — the two threshold rows commented out with a pointer to R-117, kept so the sweep's history reads.
- `src/alpha-preset.ts`, `src/alpha-preset-values.ts` — the two bar rungs retired, the preset's own bar pinned at 0.5, the *more often than the shipped defaults* check restated as non-regression.
- `src/deferred-evidence.ts` — Q8's threshold columns untouched, with a note saying they are history.
- `test/dedup.test.ts` — the rolling-hash pin re-run (finding 7).

## The CLAUDE.md entry, for whoever folds this

One glossary bullet under **Tooling**, beside `alpha-preset` and `soak-harness`. Not placed by this build — `CLAUDE.md` was not edited.

- `churn-study` [symbol] — **does a peer status quo oscillate** (`packages/sim-harness/src/churn.ts`, `npm run churn -w @draft/sim-harness`): `flips` and `reversions` read off the engine's log, a room of fifteen over the three shapes' windows. The bar arm is a pinned null result and a guard; the floor is the brake. Findings: `packages/sim-harness/REPORT-churn.md`. Q1362 stage 5.
