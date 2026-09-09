# The serve-all A/B — Q1178, the hot-3 hand against every race

**Date:** 2026-09-09 · **Engine:** SPEC v0.111 mechanics with Q1178 (ii) built — no unheard slot (branch `serve-all-0909`, commits `1dd2804` and `bbba20b`; the study lands with this report) · **Mode:** scripted personas only — deterministic, no network, no LLM calls.

**Reproduce:** `npm run ab:serve -w @draft/sim-harness -- --seeds 30` (the defaults: rosters 5, 10, 14, 20; both scenarios; 8h window). Per-run rows land in `packages/sim-harness/runs/serve-all-ab.csv` (git-ignored). Same seeds, same numbers, byte for byte. About four minutes.

**Question.** Ed ruled on 2026-09-09 (Q1178 (i)) that every live race a member has not judged is in their hand, ordered by v / c_p, the hot set an emphasis and not a gate — and that SPEC §8.3's sentence is written only after a sim A/B against the hot-3 hand, because R-068's *depth beats breadth* (2026-08-13) was measured with personas judging off a filtered feed and does not by itself say what an ordered, unfiltered hand does. Does serving every race, ordered, beat, match or lose to the hot set of three on welfare — and is any difference larger than seed noise?

**Method.** Two arms, differing in one `Constitution` field: **hot-3** is `hotSetSize: 3`, the shipped default; **serve-all** is `hotSetSize: 1000`, every race (a number rather than Infinity so the knob stays a serialised field). Both arms are `feed()` as it stands after Q1178 (ii): ordered by v / c_p, §8.2's ×1.25 unheard boost a value and not a slot, the exploration roll and the idle diagonal unchanged; the 2026-09-05 slot is not a third arm, since running it would need a code switch that would survive in the product. Rosters 5, 10, 14 and 20 in both scenarios (`clubhouse`, `charter`), 30 seeds per cell, 8h window, engine-default constitution otherwise: 480 runs. Rosters up to 14 are slices of each scenario's cast; **20 is the fourteen plus six clones of the first six profiles** (same stances, salience and rhythm, new ids), the only honest way to a roster the scenario never wrote — read that row as a bigger room of the same people, not a different room. Personas draw one card at a time (`nextCards(1, t)`), and the feed's round robin restarts per call, so the arms differ for a persona only when the top three races have nothing left to ask them: under hot-3 the draw comes back empty and the bout ends, under serve-all it continues down the ordered list. The two arms share every seed, so welfare is also read **paired** — serve-all minus hot-3 per seed, then the mean and sd of those differences — which is the answer to "larger than seed noise?" that a comparison of two cell sds is not. Columns: welfare ratio (mean±sd across seeds); simulated time to the first adoption (identical across arms wherever the first adoption lands before any hand is exhausted); adoptions per hour; judgments per adoption (cell total over cell total); the share of persona turns whose card draw came back empty (idle — over all turns, drafting turns included, since a bout ends on an empty draw either way); and candidates never named by any comparison but their author's, of candidates submitted. Findings are numbered continuously so you can answer by number.

---

## The table

**clubhouse** (14-persona cast; utilities with couplings)

| roster | arm | welfare (mean±sd) | first adoption | adoptions / h | judgments / adoption | idle turns | never judged (of candidates) |
|---|---|---|---|---|---|---|---|
| 5 | hot-3 | 0.988±0.031 | 0.29h | 1.32 | 2.02 | 59.4% | 0.07±0.25 of 13.17 |
| 5 | serve-all | 0.988±0.031 | 0.29h | 1.32 | 2.02 | 59.5% | 0.07±0.25 of 13.17 |
| 10 | hot-3 | 0.987±0.013 | 0.19h | 2.13 | 9.44 | 34.6% | 2.07±1.53 of 30.47 |
| 10 | serve-all | 0.989±0.009 | 0.18h | 2.26 | 9.72 | 32.3% | 2.30±1.73 of 31.87 |
| 14 | hot-3 | 0.991±0.011 | 0.17h | 2.75 | 12.75 | 29.3% | 3.70±1.72 of 41.43 |
| 14 | serve-all | 0.985±0.018 | 0.17h | 2.66 | 14.81 | 26.0% | 3.30±1.51 of 39.90 |
| 20 (6 cloned) | hot-3 | 0.993±0.010 | 0.16h | 2.41 | 20.75 | 29.7% | 3.17±1.71 of 39.53 |
| 20 (6 cloned) | serve-all | 0.988±0.011 | 0.16h | 2.63 | 23.80 | 23.3% | 3.30±1.64 of 42.27 |

| roster | Δ welfare, serve-all − hot-3 (paired mean±sd) | seeds serve-all wins / ties / loses |
|---|---|---|
| 5 | 0.000±0.000 | 0 / 30 / 0 |
| 10 | 0.002±0.014 | 7 / 18 / 5 |
| 14 | −0.005±0.019 | 5 / 15 / 10 |
| 20 | −0.005±0.016 | 6 / 11 / 13 |

**charter** (14-persona cast)

| roster | arm | welfare (mean±sd) | first adoption | adoptions / h | judgments / adoption | idle turns | never judged (of candidates) |
|---|---|---|---|---|---|---|---|
| 5 | hot-3 | 0.988±0.015 | 0.29h | 0.80 | 2.84 | 64.7% | 0.23±0.42 of 9.33 |
| 5 | serve-all | 0.988±0.015 | 0.29h | 0.80 | 2.84 | 64.7% | 0.23±0.42 of 9.33 |
| 10 | hot-3 | 0.982±0.011 | 0.17h | 1.42 | 7.73 | 49.4% | 1.53±0.96 of 18.40 |
| 10 | serve-all | 0.982±0.011 | 0.17h | 1.46 | 8.36 | 46.9% | 1.40±0.76 of 18.73 |
| 14 | hot-3 | 0.985±0.014 | 0.16h | 1.47 | 11.83 | 48.2% | 1.20±0.98 of 19.73 |
| 14 | serve-all | 0.989±0.014 | 0.16h | 1.45 | 13.32 | 45.6% | 1.00±0.82 of 19.43 |
| 20 (6 cloned) | hot-3 | 0.987±0.012 | 0.16h | 1.40 | 17.46 | 48.7% | 1.33±1.14 of 19.77 |
| 20 (6 cloned) | serve-all | 0.982±0.010 | 0.16h | 1.23 | 21.96 | 46.2% | 0.97±1.02 of 17.87 |

| roster | Δ welfare, serve-all − hot-3 (paired mean±sd) | seeds serve-all wins / ties / loses |
|---|---|---|
| 5 | 0.000±0.000 | 0 / 30 / 0 |
| 10 | 0.000±0.000 | 0 / 30 / 0 |
| 14 | 0.004±0.016 | 7 / 20 / 3 |
| 20 | −0.005±0.011 | 1 / 22 / 7 |

## Reading

1. **On welfare, serve-all matches hot-3 at every roster size; nowhere is the difference larger than seed noise.** At roster 5 the two arms are the same runs — every seed ties in both scenarios, every other column agrees to the decimal — because with five members three races are already everything askable of anybody, so the hand is never exhausted and the arms coincide by construction. At roster 10 it is +0.002±0.014 on clubhouse and an exact tie on charter (30 of 30 seeds). At 14 the sign flips between scenarios (−0.005±0.019 clubhouse, +0.004±0.016 charter), each mean about a quarter of its paired sd. At 20 the sign is the same in both scenarios, −0.005, against paired sds of 0.016 and 0.011 — a standard error of roughly 0.002–0.003 over 30 seeds, so about two standard errors in serve-all's disfavour, with 13 losses to 6 wins on clubhouse and 7 to 1 on charter. That is a hint, not a finding: the effect is half a percent of the welfare span, well inside one seed's spread, and the roster-20 room is six clones deep. Nothing in the table says serve-all *beats* hot-3 anywhere.
2. **What serve-all buys is fewer empty draws, and not many.** Idle turns fall by two to six points wherever the arms differ (clubhouse 34.6→32.3, 29.3→26.0, 29.7→23.3; charter 49.4→46.9, 48.2→45.6, 48.7→46.2). The rest of the idleness is structural — on charter about half of all turns draw nothing under either arm, because there is nothing askable of that persona anywhere, not because the hand hid it. The exploration roll and the idle diagonal already reach past the hot set often enough that the gate was rarely what a persona hit.
3. **The extra judgments go to lower-valued races and buy nothing.** Judgments per adoption rise under serve-all at every roster above 5, by 3–25% (clubhouse 12.75→14.81 at 14, 20.75→23.80 at 20; charter 17.46→21.96 at 20). Those are the cards the hot set would have withheld: judgments on races far from resolving, which is exactly R-068's *depth beats breadth* seen from the other side. Adoptions per hour move both ways and by less than the cells' spread; time to first adoption is identical everywhere, since the first adoption lands long before any hand is exhausted.
4. **Reach is not the difference either.** Candidates never judged by anybody but their author are within a fraction of a candidate of each other in every cell (clubhouse 3.70 vs 3.30 at 14, 3.17 vs 3.30 at 20; charter 1.33 vs 0.97 at 20), and the sds are larger than the gaps. The 2026-09-05 starvation `room-walk` found was a property of a document whose hot set was full of evidenced races and whose members drew four cards and stopped; the sim's personas keep drawing until the draw is empty, and the exploration roll reaches the fresh race within a bout either way. The surface's guarantee of reach is Q1202's `ask` on every clause row, which neither arm here changes.
5. **Caveats.** The personas take the top of the feed, always; a member who browses the rail and picks a race by interest is not modelled, and that is the case where the hand's *order* matters and its *gate* does not. The 8h window is the harness's standard, not the alpha's ten-to-twenty-minute operating point (`alpha-preset`), where bouts are fewer and an empty draw costs more of the session. And the roster-20 cells are a cloned room.

No recommendation about §8.3's sentence is made here; Ed writes it.
