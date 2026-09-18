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

---

# Addendum — the approval floor · Q1439 · 2026-09-18

**Date:** 2026-09-18 · **Engine:** SPEC **v0.132** as built by Q1439 stages 1–3 on the `q1439-sims` worktree, cut from `2ba1510` · **Mode:** scripted personas only — deterministic, no network, no LLM calls.

**Reproduce:** `npm run churn -w @draft/sim-harness` (`-- --seeds N --out <file>` for a per-seed CSV). **The room, the twin, the seeds and the alpha preset are unchanged**, so every number here is comparable seed for seed with a number above it. Sections 1–3 of the run are the study above, re-run under the new rule; sections 4 and 5 are new.

## The question, and why it is being asked again

Ed ruled the floor counts **approvals** rather than judges (Q1439, 2026-09-17), and made the churn re-run a condition of shipping — ruling (f). Then, at 00:20 on the 18th, he removed the built-in statistical minimum as well: *if the membership want a smaller quorum they should be able to choose it.* So there are two rules to report, not one, and he needs the answer before Sunday's live room. He asked three things, and this addendum is organised around them: **does the room still move, does it oscillate more or less, and does abstention end the deadlock it exists to end.**

**The baseline is quoted, not re-run.** The engine that produced §§1–3 above no longer exists in the tree; resurrecting it would be a bigger and less trustworthy job than reading the numbers it printed. The rows marked *baseline (2026-09-15)* below are lifted verbatim from the tables above.

**One new measure and one correction to an old one.**

- **stranded** — races the window ran out on with the leader **on top of the field and short of F**: the room prefers it to the text that stands and it never gathered the approvals. That is the deadlock, and it is read off `races()` **one instant before the close**, at the close's own `t`, because the close's final batch is the last thing that could have carried it and there are no live races after it. Every 💤 period has long run by then, so that batch sees the smallest group and the lowest floor the run will ever have: a stranded race is one that even the most generous moment refused. Beside the count the run prints the diagnosis — `approvals`, `floor`, `judges`, `group`, and the leader's age — because *asked and refused* and *never asked* are different failures and only one of them is the engine's fault.
- **sites** — one per drafting site that ever adopted, which is `adoptions − flips`. It is here because **`adoptions` is not progress**: two arms with the same ten sites and wildly different adoption counts have written the same document a different number of times. It saturates in this scenario — ten contested clauses, and almost every arm moves all ten — so the pace measure beside it, **all** (simulated minutes until every site had moved once), is the one that discriminates.
- **approvals min / mean / ≤2** — the approvals each adoption actually carried on, read from the `adopted` event's own `approvals` field (new in stage 1), pooled over the cell's seeds. *How thin did it ever get* is a question a mean cannot answer, so the minimum is reported and so is the count of adoptions carried by two people or fewer.

**One thing the harness does not do**, stated because it bounds every abstention number below: `runSession` never calls `tick`. An adoption that only an expiring 💤 period would release therefore lands at the **next persona action anywhere in the room**, or at the close's final batch — not at the instant the period runs out. In a room of fifteen acting every few minutes the lag is small, but a real host ticks every minute and would be marginally quicker. The direction of the bias is toward *fewer* abstention-released adoptions, so the abstention arms below understate rather than overstate.

---

## 6. The rule as Q1439 built it — the third still in

`F = max(Q′, min(⌈E/3⌉, 12))`, `Q′` the settled quorum read against the group the leader waits on and capped at half of it. At E = 15 the third is **5**, so the floor is `max(Q′, 5)` and only a quorum above a third can raise it.

Mean ±sd (min–max) over the same 20 seeds. *1st* is time to the first adoption; *all* is time until every site had moved once; both in simulated minutes.

| arm | window | floor | alive | adoptions | sites | 1st | all | flips | reversions | stranded | thinnest | welfare |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **baseline (2026-09-15)** | meeting | 5 | 100% | 18.1 ±3.4 (11–24) | 10.0 | — | — | 8.1 ±3.4 (1–14) | 5.5 ±3.0 (0–11) | — | — | 0.979 |
| **baseline (2026-09-15)** | conference | 5 | 100% | 24.1 ±8.8 (11–44) | 10.0 | — | — | 14.1 ±8.8 (1–34) | 11.6 ±8.4 (0–31) | — | — | 0.992 |
| no quorum · 💤 never | meeting | 5 | 100% | 14.6 ±1.9 (11–18) | 9.9 | 10 ±3 | 86 ±17 | 4.7 ±2.0 (1–8) | 2.4 ±1.3 (0–4) | 0.3 ±0.5 | 5 | 0.989 |
| no quorum · 💤 40 min | meeting | 5 | 100% | 14.6 ±1.9 (11–18) | 9.9 | 10 ±3 | 86 ±17 | 4.7 ±2.0 (1–8) | 2.4 ±1.3 (0–4) | 0.3 ±0.5 | 5 | 0.989 |
| quorum 33% · 💤 never | meeting | 5 | 100% | 14.6 ±1.9 (11–18) | 9.9 | 10 ±3 | 86 ±17 | 4.7 ±2.0 (1–8) | 2.4 ±1.3 (0–4) | 0.3 ±0.5 | 5 | 0.989 |
| quorum 50% · 💤 never | meeting | 8 | 100% | 12.0 ±1.1 (10–14) | 9.8 | 15 ±5 | 132 ±34 | 2.3 ±1.1 (0–4) | 0.3 ±0.6 (0–2) | 0.5 ±0.6 | 5 | 0.980 |
| quorum 50% · 💤 40 min | meeting | 8 | 100% | 13.0 ±1.0 (11–15) | 10.0 | 15 ±5 | 118 ±21 | 3.0 ±1.0 (1–5) | 0.8 ±0.8 (0–3) | 0.3 ±0.5 | 5 | 0.993 |
| **quorum 50% · 💤 15 min** | meeting | 8 | 100% | 14.7 ±2.0 (11–19) | 9.9 | 15 ±4 | **92 ±24** | 4.7 ±2.1 (1–9) | 2.4 ±1.7 (0–6) | 0.4 ±0.5 | 5 | 0.991 |
| no quorum · 💤 never | conference | 5 | 100% | 16.8 ±5.5 (11–34) | 9.9 | 10 ±3 | 86 ±17 | 6.8 ±5.6 (1–24) | 4.6 ±5.0 (0–21) | 0.0 ±0.0 | 5 | 0.991 |
| no quorum · 💤 12 h | conference | 5 | 100% | 16.8 ±5.5 (11–34) | 9.9 | 10 ±3 | 86 ±17 | 6.8 ±5.6 (1–24) | 4.6 ±5.0 (0–21) | 0.0 ±0.0 | 5 | 0.991 |
| quorum 50% · 💤 never | conference | 8 | 100% | 12.9 ±2.3 (10–18) | 9.8 | 15 ±5 | 132 ±34 | 3.1 ±2.5 (0–9) | 1.1 ±2.0 (0–7) | 0.1 ±0.4 | 5 | 0.984 |
| quorum 50% · 💤 12 h | conference | 8 | 100% | 12.9 ±2.3 (10–18) | 9.8 | 15 ±5 | 132 ±34 | 3.1 ±2.5 (0–9) | 1.1 ±2.0 (0–7) | 0.1 ±0.4 | 5 | 0.984 |

*(**ongoing** repeats **conference** exactly in every arm of this section, seed for seed, as it did in 2026-09-15's §1. The `25%` and `33%` arms are `no quorum`'s row: at fifteen they are ⌈E/3⌉ under another name.)*

**Reading.**

9. **The approval floor cuts churn by roughly two-thirds and costs the document nothing.** At the conference window, same seeds: adoptions 24.1 → 16.8, flips 14.1 → **6.8**, reversions 11.6 → **4.6**, welfare 0.992 → 0.991. At the meeting window: flips 8.1 → 4.7, reversions 5.5 → 2.4. And **`sites` is 10.0 in the baseline and 9.9 now** — the baseline's 24.1 adoptions and today's 16.8 move the same ten clauses. The whole of the difference is the document changing its mind fewer times. This is the single most important number in the addendum: *the churn went, the work stayed.*

10. **Nothing collapsed, and the router is reaching people.** `alive` is 100% in every cell, first adoption at 10 minutes (15 at a 50% quorum), and every stranded race in this section had been **judged more often than its floor asks** — at the conference window's 50% quorum, `judges 15.0`, the entire room, on a leader that had stood for **70 hours**. Those three races are not deadlock: six members preferred the change, seven preferred the text, and the floor said no. That is the rule doing exactly what Ed asked it to do, and it is the answer to the worry that a judgment *against* something used to help it pass.

11. **Below a 50% quorum, 💤 changes nothing at all, and that is arithmetic rather than measurement.** The floor is `max(Q′, 5)`; abstention moves only the group `Q′` is read against; where no quorum was asked, or where `Q′` is under 5, the third is the floor and there is nothing for the period to move. The run asserts this on the no-quorum arms. **Where 💤 does bite it is worth having**: at the meeting window at a 50% quorum, a 15-minute period takes *all sites* from 132 minutes to **92** — the whole pace the strict quorum costs, handed back — at a price of 2.1 more reversions. 40 minutes buys about a third of that.

12. **A period of a sixth of the window is useless at every shape but the shortest.** 12 hours (conference) and 5 days (ongoing) produce rows identical to *never*, seed for seed. The reason is §1's finding 3: the room does its work in the first two or three hours whatever the window is, so a period scaled to the window has not run before the room has finished. **💤 has to be scaled to the room's pace, not to the document's life** — which is what makes Ed's 15 minutes on Sunday the right order of magnitude and a "sixth of the window" the wrong rule.

---

## 7. The rule as ruled at 00:20 — the third removed

`F = max(Q′, 1)`, the quorum alone. Measured with `adoptionFloorMax: 1`, which makes the engine's `min(⌈E/3⌉, adoptionFloorMax)` term the constant 1 at every E — so `floorFor` computes exactly the ruled rule, *never below one* included, with no engine change and nothing assumed. (`adoptionFloorMax: 0` would drop that half and let a room with no quorum adopt on nobody's approval.) At fifteen the shares below are floors of **1 · 2 · 3 · 5 · 8**.

| arm | window | floor | alive | adoptions | sites | 1st | all | flips | reversions | stranded | thinnest | on ≤2 | welfare |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| no quorum · 💤 never | meeting | 1 | 100% | 28.6 ±4.2 (16–35) | 10.0 | 5 ±2 | 69 ±15 | 18.6 ±4.2 (6–25) | 14.1 ±3.6 (3–21) | 0.0 | 1 | 513/573 | 0.970 |
| quorum 10% · 💤 never | meeting | 2 | 100% | 24.4 ±4.4 (15–31) | 10.0 | 5 ±2 | 67 ±13 | 14.3 ±4.4 (5–21) | 11.0 ±3.7 (3–19) | 0.3 | 2 | 429/487 | 0.991 |
| quorum 20% · 💤 never | meeting | 3 | 100% | 19.0 ±3.4 (12–23) | 10.0 | 7 ±3 | 71 ±16 | 9.0 ±3.4 (2–13) | 6.3 ±2.9 (0–10) | 0.5 | 3 | 0/380 | 0.990 |
| quorum 30% · 💤 never | meeting | 5 | 100% | 14.2 ±2.3 (10–18) | 9.9 | 9 ±3 | 85 ±19 | 4.2 ±2.4 (0–8) | 2.1 ±1.7 (0–5) | 0.2 | **4** | 0/283 | 0.988 |
| quorum 50% · 💤 never | meeting | 8 | 100% | 12.0 ±1.1 (10–14) | 9.8 | 15 ±5 | 132 ±34 | 2.3 ±1.1 (0–4) | 0.3 ±0.6 (0–2) | 0.5 | 5 | 0/240 | 0.980 |
| quorum 30% · 💤 15 min | meeting | 5 | 100% | 16.6 ±2.8 (11–21) | 9.9 | 9 ±3 | 77 ±23 | 6.7 ±2.8 (1–11) | 4.2 ±2.7 (0–8) | 0.3 | 2 | 24/332 | 0.980 |
| quorum 50% · 💤 15 min | meeting | 8 | 100% | 16.6 ±3.5 (12–28) | 10.0 | 15 ±4 | 87 ±26 | 6.6 ±3.5 (2–18) | 3.9 ±3.1 (0–14) | 0.2 | 1 | 28/332 | 0.993 |
| **no quorum · 💤 never** | conference | 1 | 100% | **281.8 ±74.0 (61–374)** | 10.0 | 5 ±2 | 69 ±15 | **271.8 ±74.0 (51–364)** | **265.9 ±73.1 (48–356)** | 0.0 | 1 | 5192/5635 | 0.972 |
| quorum 10% · 💤 never | conference | 2 | 100% | 46.1 ±25.7 (17–103) | 10.0 | 5 ±2 | 67 ±13 | 36.1 ±25.7 (7–93) | 32.6 ±25.2 (6–89) | 0.0 | 2 | 792/922 | 0.990 |
| quorum 20% · 💤 never | conference | 3 | 100% | 26.3 ±11.1 (12–52) | 10.0 | 7 ±3 | 71 ±16 | 16.3 ±11.1 (2–42) | 13.5 ±10.7 (0–38) | 0.0 | 3 | 0/525 | 0.990 |
| quorum 30% · 💤 never | conference | 5 | 100% | 15.6 ±5.0 (10–33) | 9.9 | 9 ±3 | 85 ±19 | 5.7 ±5.0 (0–23) | 3.6 ±4.4 (0–20) | 0.0 | 4 | 0/312 | 0.987 |
| quorum 50% · 💤 never | conference | 8 | 100% | 12.9 ±2.3 (10–18) | 9.8 | 15 ±5 | 132 ±34 | 3.1 ±2.5 (0–9) | 1.1 ±2.0 (0–7) | 0.1 | 5 | 0/258 | 0.984 |
| **no quorum · 💤 never** | ongoing | 1 | 100% | **904.0 ±551.6 (61–2062)** | 10.0 | 5 ±2 | 69 ±15 | **894.0 ±551.6** | **888.0 ±551.4 (48–2046)** | 0.0 | 1 | 16680/18081 | 0.989 |
| quorum 10% · 💤 never | ongoing | 2 | 100% | 46.1 ±25.7 (17–103) | 10.0 | 5 ±2 | 67 ±13 | 36.1 ±25.7 (7–93) | 32.6 ±25.2 (6–89) | 0.0 | 2 | 792/922 | 0.990 |

*(💤 arms are omitted where they print their parent row to the digit, which is every conference and ongoing arm — finding 12 again. The meeting window's 💤 rows are given for the two quorums where they move.)*

**Reading.**

13. **Removing the third re-opens the low end of the floor curve, and churn there is catastrophic.** At a floor of 1 the conference window runs **282 adoptions, 272 flips and 266 reversions** per seed, against a 2026-09-15 baseline of 24 / 14 / 12 and today's floor-5 rule of 17 / 7 / 5. A floor of 2 is 46 / 36 / 33. The old study's finding 6 — *the floor is the brake, and the cooldown is not* — is confirmed from the other side: the brake was doing more work than anybody had seen, because the third had never let the room get below 5.

14. **And at a floor of 1 the document never reaches a fixed point.** §1's finding 3 was that a perpetual document is not a document that churns for ever — the month-long window ran the same session as the three-day one, adoption for adoption. **That stops being true at a floor of 1**: 282 adoptions over three days become **904 over a month**, worst seed 2062, still climbing when the window closed. At a floor of 2 the fixed point returns (46.1 at both windows, identical). So the property Ed was shown in September is a property of floors of two and above, and one room setting now switches it off.

15. **The loosening is visible in what the room was holding when it acted.** At a floor of 1, **513 of 573** meeting-window adoptions and **5,192 of 5,635** conference-window adoptions carried on **two approvals or fewer**, in a room of fifteen; the thinnest carried on one. At a floor of 3 the count at ≤ 2 is **zero**. The mean approval count at a floor of 1 is 1.8 — the author and, usually, one other person.

16. **A quorum that asks for a third is no longer a floor of a third.** The check in the run makes this explicit, and it is the whole difference the ruling makes. At fifteen a share of 30% is ⌈E/3⌉ exactly, so *no third · 30%* and the old *third alone* both start at 5 — but **the third is read on E, which does not move, and Q′ is read on the group, which shrinks** whenever somebody answers *Indifferent*, leaves, or abstains. The no-third arm's thinnest adoption is **4 approvals at every window**, against 5 where the third holds the floor. With 💤 at 15 minutes it falls to **2**. So *at least 30% of the membership* becomes, in practice, *at least 30% of whoever was still in the group when the batch ran*, and a room told the first will experience the second.

17. **Nothing in this section is a deadlock finding, at any floor.** `alive` is 100% everywhere, first adoption is *faster* at low floors (5 minutes against 15), all ten sites move in every arm, and `stranded` is at most 0.5 races per run. The stranded races at floors of 2 and 3 have `judges 1.2–1.9` and leaders **2–7 minutes old** — proposals made at the buzzer, not proposals the room was stuck on. **The problem the ruling creates is the opposite of the one it was written to solve.**

18. **Welfare says nothing, again, and more loudly than before.** 0.97–0.99 across every arm in both sections, including the 904-adoption month. §1's finding 9 stands and should be treated as a rule: **any guard on churn has to count flips, not score documents.**

---

## What this says to the three questions

- **Does the room still move?** **Yes, in every arm measured, and the approval floor did not cost it anything.** All ten contested clauses move in essentially every seed under both rules; the baseline's extra nine adoptions per run at the conference window were all flips and reversions, not new ground. The only thing the approval floor slows is the *pace* at a strict quorum — all ten sites in 132 minutes at a 50% quorum against 86 at the third — which is what a strict quorum is for, and which 💤 at 15 minutes gives back.
- **Does it oscillate more or less?** **Much less under the rule as built; catastrophically more if the third is removed and the room does not set a quorum.** Reversions per run at the conference window: 11.6 baseline → 4.6 under the approval floor with the third → 266 at a floor of 1 → 33 at a floor of 2 → 13.5 at 3 → 3.6 at 5 → 1.1 at 8. The floor is the brake, the curve is steep, and the third was the only thing keeping a fifteen-person room off the steep part of it.
- **Does abstention end the deadlock it is meant to end?** **There was no deadlock for it to end, and where the floor bit it did the job it was designed for.** The stranded races under the rule as built were refusals by a fully-polled room (judges 15.0 of 15), which no period can or should rescue — once everybody has answered there is nobody left to abstain. Where members had *not* answered, at the meeting window at a 50% quorum, a 15-minute period recovered the entire pace cost of the quorum. **But it is inert below a 50% quorum at fifteen** (the third is the floor there), and inert entirely at a period scaled to the window rather than to the room.

## Findings, as a list

Continuing the numbering above; these want project numbers and it is the merging session's to claim them — this build has not touched `QUESTIONS.md`.

19. **A floor of 1 is reachable and ruinous, and it is what a founder gets for answering 👥 with nothing.** Without the third, *no quorum* means `max(0, 1)` = one approval. 904 adoptions in a month, 888 of them reversions. If the third goes, **the no-quorum answer needs a floor of its own, or 👥 needs to stop being optional.** *(wants a Q number — it is a gap the ruling opens, not a tuning choice.)*
20. **Removing the third makes every stated share smaller than it sounds**, because Q′ rides a shrinking group while the third rode E. Finding 16's numbers. Ruling (m)'s *(x of y)* sentence on the surface will show `y` as the membership, and the number the engine used will often be smaller. *(wants a Q number — it is a copy correctness question as much as a mechanism one.)*
21. **💤 must be scaled to the room's pace, not the document's window.** Finding 12. A "sixth of the window" rule would be inert at two of the three shapes. 15 minutes at the meeting shape is the measured working value. *(wants a Q number if 💤 ever gets a suggested default.)*
22. **§1's *a perpetual document is not a document that churns for ever* is now conditional**, and holds only at a floor of 2 or more. Finding 14. *(a correction to a statement in this report, above.)*
23. **`quorum 80%` in `churn.ts` had been a 50% share since Q1439 stage 2 (`84f8ae3`) with its label unchanged** — the value was corrected there, the label was not, so §3's table above reported floor 12 for a cell that would now run at floor 8. Replaced here with a **count of twelve**, which is the same number asked the only way the surface still allows, and which prints the engine's half-the-group cap doing its work (floor 8, identical to the 50% share). **The 2026-09-15 `quorum 80% · floor 12` row is not reproducible on this engine at all**: R-126 caps both forms at half the group, so the strictest floor a room of fifteen can ask for is 8, where that row measured 12. The lowest-churn arm in the study above is no longer available to a founder.
24. **The clubhouse personas re-propose from a fixed menu** — §1's finding 6, and it bites hardest here. At a floor of 1 the room can re-propose a displaced wording almost for free, so the 904-adoption figure is an **upper bound on a human room**. The *ordering across arms* is the finding, and the ordering is unambiguous.

## Recommendation

**Ship the approval floor as stage 1–3 built it.** It does what it was for: churn down by two-thirds, the same document reached, no race left stuck that the room had not been asked about, and a judgment against a proposal can no longer help it pass.

**Do not ship the removal of the third without a floor under the no-quorum answer.** The measurement is not close: one room setting, left at its arrival value, takes a fifteen-person document from five reversions a session to several hundred. Ed's reason for the ruling — *if the membership want a smaller quorum they should be able to choose it* — is met at a floor of 3 (a 20% share here) with reversions at 13.5 and every clause still moving; it is the floor of 1 that has no defensible room behind it. The cheapest shapes, in the order this report would try them: keep a small absolute minimum (2 or 3) in place of ⌈E/3⌉, so the *choose it* half of the ruling survives and the cliff does not; or make 👥 a required founding answer with no *no quorum* rung.

**For Sunday:** the room is a meeting shape at fifteen. On the rule as built, a 50% quorum with 💤 at 15 minutes is the arm to found at — 14.7 adoptions, all ten clauses moved in 92 minutes, 2.4 reversions, no race stranded that the room had not been asked about — and it is close to the fastest arm measured as well as one of the calmest.

## What was added to sim-harness for this addendum

- `src/metrics.ts` — `StrandedRace` and `strandedAtClose(session, t)` (the deadlock measure, a pure read); `Metrics.stranded`; `Metrics.approvalsAtAdoption` and `approvals`/`floor` carried onto `SiteAdoption`, read from the `adopted` event's new optional fields.
- `src/runner.ts` — the stranded snapshot taken one instant before `session.close`, and handed to `computeMetrics`. No event, no state change: the log is byte-identical to a run without it.
- `src/churn.ts` — sections 4 and 5; `sites`, time-to-first-adoption, time-until-every-site-moved and the thin-adoption columns; the `quorum 80%` mislabel corrected (finding 23); two new assertions — that 💤 is inert where no quorum was asked, and that a 30%-no-third floor adopts on fewer approvals than a third-held floor of the same nominal size.
