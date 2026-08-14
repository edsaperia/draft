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
`--verbose` (per-action log) · `--commentary` (see below) · `--json`.

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
