# @draft/sim-harness

Synthetic participants driving the engine through full sessions (P2, SPEC §13.2).
Personas speak only the participant API — no sim backdoor — so a persona, a human
client, and a personal AI are interchangeable (D3/D17).

## Modes

- **scripted** — deterministic personas judging by the scenario's latent utility
  model (position + quality per alternative, stance + salience + noise per
  persona). Same seed ⇒ same session, same rolling log hash. Because the utility
  model is ground truth, every run gets a **welfare ratio**: 1.0 = the session
  found the utilitarian-best text, 0 = the incumbent survived, < 0 = worse than
  doing nothing. This is the regression + calibration workhorse.
- **llm** — personas played by `claude-haiku-4-5` via the Claude API (structured
  outputs for judgments and drafts). Realistic, non-deterministic, pay-per-token.
  Needs `ANTHROPIC_API_KEY` (in the repo-root `.env`) or an `ant auth login` profile.
- **subscription** — the same personas and prompts, transported through the
  Claude Agent SDK (headless Claude Code), billed to the local Claude
  subscription (e.g. Max) instead of an API key. Needs a logged-in Claude Code
  or `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`. Slower per call (a
  harness process per judgment); local/personal use only — hosted deployments
  need a real key. Probe auth with `npx tsx src/probe.ts`.

## Run

```
npm run sim -w @draft/sim-harness -- --mode scripted --scenario clubhouse --seeds 5
npm run sim -w @draft/sim-harness -- --mode subscription --scenario clubhouse \
    --model claude-sonnet-5 --hours 4 --verbose --commentary
```

Flags: `--mode scripted|llm|subscription` · `--scenario charter|clubhouse` ·
`--seeds N` (independent runs) · `--hours H` (window length, default 72; keep
short in LLM modes — call count scales with it) · `--seed S` · `--model M` ·
`--dedup` (see below) · `--verbose` (per-action log) · `--commentary` (see
below) · `--json`.

## Dedup-gate (`--dedup`)

Opt-in advisory duplicate check on submissions (SPEC §5.1). Before a
persona's draft is submitted, the runner consults the engine's
`DedupGate`: exact text match, then normalized edit distance
(relative Levenshtein ≤ 0.15), then — in `llm`/`subscription` modes —
an LLM equivalence oracle over the matching transport (`LlmOracle` /
`SubscriptionOracle` in `src/oracles.ts`; `MockOracle` serves tests).
Scripted mode runs oracle-free: exact + edit distance only.

A duplicate is not submitted: the runner co-signs the existing candidate
on the drafter's behalf (support merges, SPEC §5.1) or, if they already
support it, skips and logs. Progress lines look like:

```
[1h23] Cam drafts a duplicate of c7 (edit-distance): support merged
```

The gate only advises — it never blocks on oracle failure (errors read
as fresh), and with `--dedup` off the run is byte-identical to the
pre-gate runner (regression-pinned in `test/dedup.test.ts`).

## Metrics per run

Edge/diagonal judgment counts, candidates, adoptions, overturned issues
(early adoptions displaced later — SPEC §4.5 self-correction, visible),
per-issue outcome vs the utilitarian optimum, welfare ratio, backlog size,
per-persona participation and token balances, final text, rolling hash.

## Built-in scenarios

- `charter` — a six-line association charter, five independent contested
  issues (membership, decisions, meetings, money, amendment), 2–3
  alternatives each. The original small testbed.
- `clubhouse` — the Hollow Oak Club house charter: fourteen personas, ten
  contested issues (keys, guest bedroom, garden, treasury, dues, dinner,
  guests, decisions, offices, amendment), and — the point — **couplings**:
  a clause's utility depends on where the rest of the document sits (a key
  register with an open-door guest policy leaks; budgets need dues), so the
  optimal document is a property of combinations, adoption *order* matters,
  and per-issue greedy choice cannot reach the optimum. Scripted personas
  judge and draft conditionally on the live document state. The optimum is
  computed by exhaustive enumeration of the menu product.

The cast includes a careful proceduralist, a ruthless minimalist, a covert
schemer angling to control the treasury (his rationales always sound
public-spirited), a militant revolutionary, a gentle parody of a certain
opposition-turned-government politician, a member with dreadful spelling,
and a literal dog. Each exists to stress a specific mechanism claim:
manipulation resistance, deletion pressure, flood protection, substance vs
presentation.

## Calibration sweep

`npm run sweep -w @draft/sim-harness` — one-factor-at-a-time over nine
constitution knobs (threshold ramp, token economy, cooldown, hot set,
exploration/salience rates) × 25 seeds on the clubhouse scenario, ~575
scripted runs, CSV plus a per-knob summary. LLM-free; costs only CPU.
Findings so far are folded into SPEC §4.2 and §8.3.

The run of 2026-08-13 (`runs/sweep-clubhouse.log` and `.csv`, git-ignored;
575 runs, 25 seeds per value): baseline welfare **0.982 ± 0.021** (per-seed
0.91–1.00); every knob value between **0.945 and 0.994**, so the mechanism
is robust everywhere the sweep looked. Two values moved the spec:
`hotSetSize=3` scored 0.994 against the then-default 6's 0.982 and became
the engine default (Q31, SPEC v0.8); cooldowns of 15 and 30 minutes fell to
0.958 and 0.945 with adoptions halved, which is why §4.2 caps the cooldown at
five minutes (Q32). The one engine bug the early runs found is
`e3b7b6e` (2026-08-13): replay diverged because `peakW` updated in the
command layer rather than the fold.

## The other instruments

All `npm run <name> -w @draft/sim-harness`; each says what it needs.

| Script | What it does | Needs |
|---|---|---|
| `preset` | The alpha preset: whole candidate constitutions over roster × window at the ten-to-twenty-minute operating point, scored on `alive` (did the document change at all); exits non-zero if the preset stops beating the shipped defaults. Numbers: PRODUCTION.md § Measurements | nothing — scripted, in-process |
| `soak` | N clients against the **real server** at the same time: real personas over the real HTTP login path, one cookie jar per seat, every command fired in one tick. Assertions, not metrics | a running dev server |
| `evidence` | The four deferred-question studies (Q8/Q9/Q10/Q13) behind `REPORT-deferred-evidence.md`; `--q all\|8\|9\|10\|13 --seeds N --hours H`, CSVs to `runs/` | nothing — deterministic |
| `ab:serve` | The serve-all A/B (Q1178) behind `REPORT-serve-all-ab.md`: the hot-3 hand against a hand of every live race, rosters × seeds × both scenarios, welfare read paired per seed; `--seeds N --hours H --rosters 5,10,14,20 --scenario clubhouse\|charter\|both`, CSV to `runs/` | nothing — deterministic |
| `founding` | Deterministic acceptance walks over `@draft/constitution` with a narrative log; the same hash every run. Part of `npm test` | nothing |
| `motions` | The same over the engine-bridge: ordinary motions racing in engine-core, the crown's assent between verdict and application, an amendment binding a race in flight. Part of `npm test` | nothing |
| `score` | The welfare judge, below | Claude credentials |

## Welfare judge

LLM runs write novel text, so their final lines are usually off the
scenario's alternatives menu and unscoreable directly. `npm run score -w
@draft/sim-harness -- --log runs/<run>.log` has a judge model
(`claude-fable-5`) estimate each off-menu line's latent coordinates —
position and quality, calibrated against the menu alternatives as anchors —
then computes welfare through the same ground-truth machinery as scripted
runs (stances, couplings, enumerated optimum). The judge translates text
into the model; it never invents utilities. Judged welfare is a sanity
check on realism runs, never an optimization target; scripted welfare
remains the calibration gold standard.

## Commentator

`--commentary` adds a spectator-feed LLM narrating the run into the log
(🎙 lines) every ~15 events and after every adoption. It is presentation
layer, not a participant: it speaks no participant API and holds no vote,
so unlike the blind room it is shown authorship, temperaments, and hidden
agendas — dramatic irony is the product. Commentary is serialized off the
critical path: it lags play and never blocks it, and a failed call is
silently dropped.
