# The guard regime, made fast — audited 2026-09-22, to build when Ed is home

**What this is.** Ed, 2026-09-22 evening: *our current test/walk/guard regime
is very slow — audit the work, see where the time breaks down, whether we can
optimise or parallelise without losing much, which are earning their keep* —
and, on the results: *make a plan to do all this and save it, and we will do
it first thing when I get home.* This file is the audit of record (§1) and
the contract for the build (§2 onward): the order, what each stage changes,
what it does not, and how each is proved. Deleted once folded (the P1 plan's
rule); its numbers go to `design/DECISIONS.md` as one dated section.

**Precedence.** CLAUDE.md's *Conventions* paragraph on CI is the rule this
plan amends, and is rewritten in Stage 7, never before. Three rulings stand
untouched: Q1354 (an unread §2 cell is exit 3 and red), Q625 (the founding
golden compares per sprint, never at the push), Q917 (a) (`if: always()`
between walks so none masks another — the same guarantee must hold in
whatever shape the job takes). Q736's eviction rule is read the other way in
Stage 4: a gotcha may name a guard only if some job runs it.

**How it is built.**

- One builder, a subagent (memory `feedback-build-in-subagents`), on the
  guard-priced rule (memory `feedback-subagent-model-guard-priced`): every
  stage here is proved by the runner or by a walk that existed before the
  stage, so **Opus**; the session briefs, reviews the diff and reads the
  runs.
- **A workflow change is proved only by the runner**, and `ci.yml` runs on
  `pull_request` with the deploy step guarded to `main` — so each stage is
  pushed to a branch and opened as a PR, which runs `ci`, `probe` and the
  walks and deploys nothing. **A branch push needs Ed's word once** (the
  no-push rule); merging to `main` is a deploy and is his call at the end,
  never during a live room.
- The seven `ci` gates after every stage that touches the tree outside
  `.github/`: `npm test`, lint, `npm run typecheck`, `spec-check`,
  `copy-check`, `clock-check`, build.
- Each stage's commit names the stage and the measurement it moved. Nothing
  here changes what a walk asserts; a walk that has to change what it
  asserts to pass is a finding, filed in QUESTIONS.md, not a fix.

## §1 The audit — what the record says

**Sources.** Every CI run on record (184, 2026-08-20 to 2026-09-22, via
`gh run list`), the failing step of every red one (59 reads of `gh run
view`), the two 2026-09-22 runs step by step, the workflow's git history
(`git log -S` per step), and four days of local gate and walk logs in the
job temp directory.

**Per push, on the runner, today** (both 2026-09-22 runs, identical):

| Job | Wall clock | Gates the deploy | What dominates |
|---|---|---|---|
| `ci` | 4 min | yes | `npm test` 53 s; deploy-and-verify 121 s |
| `probe` | 9.5 min | no | `toc-travel` 272 s; `copy-check --walk` 180 s; the rest 90 s |
| `walks` | 43 min | no | seat-matrix 1105 s; journey 444 s; rate-motion 320 s; powers-walk 129 s; after-begin 103 s; head-insertion-aim 78 s; invite 73 s; applicants ×3 183 s; the rest ~60 s |

The jobs run in parallel, so a push is decided after 43 minutes, and that
number is the `walks` job's twenty steps in series on one runner.

**How it grew** (average minutes per run, by week):

| Week of | Runs | Avg min | Red | Note |
|---|---|---|---|---|
| 08-20 | 53 | 2 | 3 | `ci` alone |
| 08-25 | 39 | 9 (one run hung 70 h: 113 with it) | 20 | `probe` 08-21, walks 08-27 |
| 08-31 | 21 | 9 | 20 | walks red on every push |
| 09-07 | 27 | 18 | 7 | first green walks 09-07; `copy-check --walk`, `room-walk` |
| 09-14 | 42 | 29 | 9 | seat-matrix, founder-answers, five walks 09-15, three 09-17 |
| 09-22 | 2 | 43 | 1 | head-insertion, overlapping-sites, rail-font 09-21; rate-motion 09-22 |

Doubling roughly every ten days. No job carries `timeout-minutes`, which is
how one run stood for seventy hours.

**Reds, whole record.** 60 of 184 runs red (33%). By failing step: journey
31, `probe --strict` 22, applicants-walk 9, deploy-and-verify 6, typecheck
3, founding-golden 3, ladder 2, toc-travel 2, `copy-check --walk` 2,
seat-matrix 1, spec-check 1, clock-check 1. **From 2026-08-27 to 09-06 the
walks job was red on every push** — twelve days in which a new red was
indistinguishable from the standing one, which is a job catching nothing.

**Reds, last two weeks, read one by one** (the commit after each):

| Kind | Count | Which |
|---|---|---|
| real product catch | 3 | spec-check 09-15 (a broken state chain; would have held the deploy, cost 0 s); applicants-walk 09-11 ×2 (the assembly admit card not opening — one bug) |
| real, dev tooling | 1 | ladder 09-18 (the cast's 👥 draw above Q1439's cap) |
| guard out of step with a deliberate change | 7 | journey ×3 (drawn marks read by text; 17 rows not 18; one unread), toc-travel ×2 (the stagehand's `devswitch` under a run at 1280×900), copy golden ×2, clock-check ×1 (load order after Q1352) |
| by design | 1 | seat-matrix 09-19: E42's row unread, exit 3, red three days (Q1499) |
| hosting | 6 | deploy-and-verify (fixed by e31ce168, *one sighting is not a cutover*) |

**Locally**, the last day: five full gate runs, three journeys, a dozen
single walks. `npm test` is ~140 s on this machine and **91 s of it is one
file**, `packages/engine-core/test/memo-differential.test.ts` (8 tests),
which also flaked on the worker heartbeat on 2026-09-21 (7bbf742c). The
walks job was run whole locally at least once before a push and then again
by CI.

**Guards named in CLAUDE.md that no workflow runs** (the shape issue #17
found on 2026-09-17, still open for these): `crlf-paste`, `poll-race`,
`slider-walk`, `scripts/repro/stale-key.mjs`, `focus-steal.mjs`,
`heading-marker.mjs`, `title-motion-tab.mjs`, `wrong-line-room.mjs`;
`card-audit` (13 gotchas cite it) and `a11y-audit` are audits with exit
codes and run nowhere either.

**What earns its keep.** The seconds-cost gates (`spec-check`, static
`copy-check`, `clock-check`, typecheck, lint: under 30 s together, one
deploy saved). journey: the only guard on the live path and the one with a
catch record, but its 29 explicit waits sum to ~35 s of 444, so the rest is
155 steps of round trips nobody has profiled. applicants-walk: two real
reds. seat-matrix: 18 minutes a push for one by-design red; its job is to
make an unread cell red *at once*, which parallel keeps. toc-travel: 4.5
minutes, two reds, both its own; it waits a literal 400 ms three times per
heading with the scroll already stubbed synchronous. `copy-check --walk`:
3 minutes, two stale-golden reds, and the static half already runs in `ci`.

## §2 Stage 1 — the walks job in parallel

Split `walks` into groups that run at once, each booting its own server as
the job does now (`PORT`, `DRAFT_DATA_DIR`, `DRAFT_BASE_URL` per group;
room-walk keeps its cooldown-0 second server in its group).

**Recommended shape**: one job with `strategy.matrix.group` over five
names and a shell script `scripts/ci-walks.sh <group>` that runs the
group's walks in order, `if: always()`'s guarantee kept in shell (run every
walk, print one verdict line each under `::group::`, exit red at the end if
any was), so `ci.yml` does not grow five copies of twenty steps. The
alternative — five named jobs with explicit steps — keeps the per-step
display at ~600 lines of YAML; the builder takes the script unless Ed
prefers the display.

| Group | Walks | Expected |
|---|---|---|
| `seat-member` | `seat-matrix --hat=member` | to measure; ~10 min |
| `seat-clerk` | `seat-matrix --hat=clerk` | to measure; ~8 min |
| `journey` | journey | 7.5 min |
| `motions` | rate-motion, powers-walk, head-insertion-aim, overlapping-sites | 9 min |
| `doors` | founder-answers, applicants ×3, after-begin, invite, first-keys, member-questions, slug, ladder, room-walk | 8 min |

Also: `timeout-minutes` on every job in both workflows (30 for a walks
group, 15 for `ci` and `probe`, 60 for sprint), and the `walks` artifact
upload per group.

**Proof.** A PR run where every group is green and the slowest is under 12
minutes, cited by run id; the same twenty walks appear across the groups
(a grep of the script against the old job's steps, in the commit); the
seat matrix's exit 3 still reddens its group (proved by a one-line
`AUDIENCE` deletion on a throwaway commit, then reverted).

## §3 Stage 2 — toc-travel's clock

`design/tools/toc-travel.mjs:114` waits `setTimeout(400)` three times per
heading. Replace `settle` with two animation frames (the tab is foreground
on the runner; locally under the extension rAF never fires, which is why
the literal was chosen — keep a `--slow` flag that restores the timer for
that case). Measure the run before and after on the runner.

**Proof.** `probe` job under 5 minutes on the PR run; toc-travel's own
count of anchors and its verdict unchanged against the previous run's log.
If the probe job is still over 5 minutes, `copy-check --walk` moves to a
second probe job in the same commit.

## §4 Stage 3 — memo-differential to the sprint tier

The file sizes its sweep from an env var: `MEMO_DIFF_FULL=1` runs today's
eight cases whole; unset, each case runs a seeded fraction under 5 s
total. `sprint.yml` sets the variable. Nothing else in the file changes.

**Proof.** `npm test` locally under 60 s (log the Duration lines); the
sprint workflow's step green on a `batch/**` tag Ed cuts, or on a manual
`workflow_dispatch` added to sprint.yml in this stage.

## §5 Stage 4 — the guards that run nowhere

For each of the ten named in §1: read what it needs (a server or the static
page), and put it in a group — the repro scripts and `crlf-paste`,
`poll-race`, `slider-walk` into a sixth walks group `repros`; `card-audit`
(both widths, `--baseline`) and `a11y-audit` into sprint.yml. A script that
is red on today's tree is a finding for QUESTIONS.md, not a fix, and stays
out of the group with its number on the row.

**Proof.** Every guard CLAUDE.md names resolves to a step in a workflow
(extend `spec-check`'s gotcha rule: a *Guard:* name must appear in
`.github/workflows/`), and the `repros` group is green on the PR run.

## §6 Stage 5 — rate-motion on one document

`scripts/repro/member-rate-motion.mjs` founds a document per scenario
(sixteen). Found once, run the scenarios that share a document shape on it,
found afresh only where a scenario changes the constitution. Expected: 320 s
→ under 120 s.

**Proof.** The `motions` group's time on the PR run; the sixteen verdict
lines unchanged.

## §7 Stage 6 — journey, profiled not changed

`scripts/lib/walk.mjs`'s `say` prints the elapsed milliseconds since the
previous line when `WALK_TIMING=1`; the group sets it. No assertion moves.
The next plan reads the table.

**Proof.** The journey group's log shows the timings; the walk's verdict
lines are identical to the previous run's.

## §8 Stage 7 — the rule, rewritten

CLAUDE.md's *Conventions* paragraph beginning *CI is three jobs* is
rewritten to the new shape: which groups exist, that `ci` alone gates, that
the local pre-push set is the seven gates plus journey plus the walks the
change touches — **never the whole walks job locally** — and the sprint
tier's contents (founding golden, memo-differential whole, card-audit,
a11y-audit). The §1 tables go to `design/DECISIONS.md` under this date.
This file is deleted in the same commit.

## Stage notes

(One line per stage as it lands: commit, run id, the number it moved.)

- **Stage 1** — PR #96, 90045bf4 (rebased as 34354c12); run 35792314266: the walks decided after 10m19s, down from 43 min (slowest group seat-member; the others 8m00s–10m09s; ~35 s setup per runner). Exit 3 proved on run 35793133650 (both seat groups red at noRule=7), reverted green on 35794080592. `seat-matrix --hat=both` split into one hat per group, identical assertions (each hat was already its own document). `ci`'s timeout is 45 on a push to main, 15 otherwise, so a timeout never cancels the deploy's poll and strands docs.vote paused. Leftovers on main as c44e8289: the copy golden re-frozen after Q1503, `*.sh text eol=lf`.
