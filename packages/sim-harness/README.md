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
npm run sim -w @draft/sim-harness -- --mode scripted --seeds 5
npm run sim -w @draft/sim-harness -- --mode subscription --hours 6 --verbose
```

Flags: `--mode scripted|llm|subscription` · `--seeds N` (independent runs) ·
`--hours H` (window length, default 72; keep short in LLM modes — call count
scales with it) · `--seed S` · `--verbose` (per-action log) · `--json`.

## Metrics per run

Edge/diagonal judgment counts, candidates, adoptions, overturned issues
(early adoptions displaced later — SPEC §4.5 self-correction, visible),
per-issue outcome vs the utilitarian optimum, welfare ratio, backlog size,
per-persona participation and token balances, final text, rolling hash.

## Built-in scenario

`charter` — a six-line association charter with five contested issues
(membership, decisions, meetings, money, amendment), 2–3 alternatives each,
five personas with heterogeneous stances, salience, activity rhythms, and
judgment noise.
