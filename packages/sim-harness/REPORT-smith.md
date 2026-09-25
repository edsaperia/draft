# Q1538 + Q1539: the leader measured against its rivals, ranked inside the Smith set

The sim study behind SPEC v0.142 (R-142, R-143), run 2026-09-25 on branch `q1538` before merge. Ed had set the merge bar in advance (Q1538's ruling 8); it was missed narrowly on three of four conditions, and **Ed merged on 2026-09-25, judging the misses within noise at eight seeds and taking the gains**. The reasoning and the rulings are in `design/DECISIONS.md` (*Q1538 and Q1539*).

## Setup

Three arms compared: `main` (with Q1534), A (Q1538 alone), A+B (Q1538 + Q1539). Eight seeds per cell; rooms of 5, 7, 10, 15 and 20; a meeting window (4 h) and a conference window (72 h); no quorum and a 50% quorum. Two personas file near-copies of losing wordings, one naively, one strategically.

The arms were a dev switch on the engine (`ARMS`), removed at merge; `npm run smith -w @draft/sim-harness` now runs the merged engine as a single arm. The three-arm run is reproducible from `q1538` at `8acbe46e` with `npm run smith -w @draft/sim-harness -- --seeds 8 --churn-seeds 8` (about 35 minutes).

## Against the merge bar

| Condition | Result |
|---|---|
| A+B picks the head-to-head winner at least as often as `main`, at every room size | **Missed in 9 of 20 cells**, the largest shortfalls 1.3–1.6 points (room 7, meeting, 50%: 95.2% against 96.8%); met or beaten in 11 (room 10, meeting, no quorum: 90.2% against 83.9%) |
| Clone wins fall | **Met.** Adoptions a direct majority had refused, in races of two or more wordings: 2,117 → 1,929; with a near-copy in the race: 1,441 → 1,303; over every race: 4,764 → 4,475 |
| The churn study shows no more reversions | **Missed in 1 of 4 cells** (conference, no quorum: 317.4 against 315.4, +0.6%); lower in the other three (meeting, no quorum: 10.5 against 11.9) |
| Typical time to pass rises by no more than half at rooms of 5–10 | **Missed in 1 of 12 cells** (room 7, meeting, no quorum: 4.2 → 6.7 min, +60%); the others −8% to +37% |

## Also measured

- **Rival pairs are asked.** Their share of judgments rises in every cell: 0.8% → 25.9% (room 5, meeting), 8.2% → 15.8% (room 15, meeting). This is Ed's observation that members were served surprisingly few non-status-quo pairs.
- **Judgments per adoption** rise by up to about 30%.
- **A and A+B coincide in most small-room cells**: once A makes the leader wait on its rivals, B rarely changes the outcome. Each pair is measured by its own floor's worth of members rather than the whole room, so sampling alone produces cycles the room does not hold, and inside a cycle the fit decides (recorded in R-143).
- **Read path on a crowded clause** (20 rivals, 30 members), branch against `main`: view after a judgment 2.10 ms against 2.16; a repeat read ~0 against ~0; the feed 0.27 ms against 0.46; building 400 judgments 1,191 ms against 986 (+21%).

## Changed after this run

At the close an unmeasured pair counts as a gap, not a draw (Ed, 2026-09-25, overruling the plan's close rule; `9b57803d`). The study above ran with the draw at the close, so its close-time adoptions are, if anything, slightly more permissive than the merged engine's.
