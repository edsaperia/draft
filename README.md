# draft

A compiler for group agreement. Input: a starting text, a roster, a constitution file. Output: the most-agreed text, plus a record of every disagreement, ranked and mapped.

The mechanism in one breath: proposed changes are patches; patches that conflict race each other; participants make blind pairwise judgments (A / B / indifferent / propose-C — no authorship, no standings); a race adopts its leader when the win-probability clears a confidence bar that rises over the session; whatever never clears the bar ships as a ranked backlog. The session's product is not just the text — it is the full map of what was agreed, what was contested, and what the minority cared about.

First target: constitutional conventions for [Newspeak House](https://newspeak.house) cohorts (rosters ~5–20), designed not to preclude much larger instances.

**It is live, in alpha, at [docs.vote](https://docs.vote).** One document is created by naming it and verifying an address; everything after that — who is a member, how sure the room must be, whether the document ever ends — is decided in the document itself, by the people in it. Alpha means exactly what the banner on every page says: this is early, and nothing in it should yet be trusted with a decision that matters.

- **[SPEC.md](SPEC.md)** — the specification (currently v0.64), single source of truth for the mechanism.
- **[QUESTIONS.md](QUESTIONS.md)** — open and deferred items; resolved decisions are folded into the spec, not logged separately.
- **[PRODUCTION.md](PRODUCTION.md)** — the road to docs.vote: the staged rollout, the security work, the persistence design, and the go-live checklist. A working document.
- **[docs/OPERATING.md](docs/OPERATING.md)** — the operator's map: what runs where, every environment variable, how a deploy happens, and the data directory's layout. Procedures live beside it, in `docs/runbooks/`.
- **[CLAUDE.md](CLAUDE.md)** — project conventions, v1 product decisions, and the glossary of named parts.

## Layout

- `packages/engine-core` — the mechanism as a pure, deterministic, dependency-free TypeScript library (P1): patch-engine (diffs, footprints, rebase), ranking-model (Bradley–Terry with ties), the session state machine, hash-chained event-log, router, token economy, and the participant API — the one blind-discipline surface that humans, sim personas, and personal AIs all speak identically. See its [`NOTES.md`](packages/engine-core/NOTES.md) for implementation decisions.
- `packages/constitution` — the §9 layer, equally pure and dependency-free: the settings catalogue, the blind founding (each member states the least they will accept; the document takes the maximum), motions on both routes — ordinary ones race, constitutional ones need everybody — applications, lapse, and its own hash-chained log. It runs in a browser as well as in node, and ships as a committed bundle the design surfaces load. See its [`NOTES.md`](packages/constitution/NOTES.md).
- `packages/server` — the product host: node:http with no framework, one hash-chained JSONL log per document as the only persistence, magic-link auth, stateless HMAC cookies, and the engine riding every commit. See its [`NOTES.md`](packages/server/NOTES.md).
- `packages/sim-harness` — synthetic participants driving full sessions (P2): deterministic scripted personas with ground-truth welfare metrics, LLM personas (fourteen of them, including a schemer, a revolutionary, and a literal dog), a constitution calibration sweep, and a colour commentator for watching runs live. See its [`README.md`](packages/sim-harness/README.md).
- `design/` — the surfaces themselves. `session-view.html` is the one page the server serves — birth, founding and the live, drafted document — with its machinery in `session.js`, `setup.js` and `cards.js`; `setup.html` redirects to it.

## Development

`npm install` at the root, then:

```
npm test               # every workspace (460 tests)
npm run typecheck
npm run lint
npm run build          # the production artifact: dist/server.mjs
npm run server         # a local instance on :8140
npm run verify <url>   # the live-environment checks, safe against production
```

Without `RESEND_API_KEY` the server runs its dev inbox: every magic link is written to `packages/server/data/outbox.jsonl` and offered on the page behind a 📬 button, so a whole room can be played from one browser. That route does not exist in the production artifact.

The simulator, which needs none of the above:

```
# a deterministic scripted run with welfare scoring
npm run sim -w @draft/sim-harness -- --mode scripted --scenario clubhouse --seeds 5

# the calibration sweep (LLM-free, ~575 runs)
npm run sweep -w @draft/sim-harness

# a live LLM session with colour commentary (needs Claude credentials)
npm run sim -w @draft/sim-harness -- --mode subscription --scenario clubhouse \
    --model claude-sonnet-5 --hours 4 --verbose --commentary
```

## Status

Spec v0.64. The mechanism (engine-core, 217 tests) and the constitutional layer (173 tests) are built and tested; the server (39 tests, 13 more against Postgres) hosts real documents at docs.vote; the simulator (31 tests) is what keeps all of it honest.

The mechanism holds up in practice:

- **Scripted validation**: welfare ratios 0.96–1.00 across seeds on both scenarios — the mechanism reliably finds (nearly) the utilitarian-best text a roster's latent preferences admit, including on the coupled `clubhouse` scenario where the optimal document is reachable only through correctly *ordered* adoptions.
- **Calibration sweep** (2026-08): 575+ runs over nine constitution knobs. Robust everywhere (0.94–0.99); a smaller hot set (3) beat the old default and is now the spec default; long post-adoption cooldowns measurably starve resolution and are now doctrinally capped (§4.2).
- **Live LLM runs**: full sessions with fourteen Sonnet-powered personas speaking the same participant API as humans, no sim backdoor. Emergent bridge-drafting, factional skirmishes, and overturns consistent with the spec's self-correction story. Two real engine bugs (router slot starvation, replay divergence) were found by simulation before any UI existed.

The surface merge landed on 2026-08-21: a begun document is drafted in on the page, proposals race in the engine and adopt into the text. Next, in the order PRODUCTION.md sets out: accessibility, performance and stress tests, and the privacy policy and terms (drafted, not in force). Postgres, observability, backups and deliverable mail landed on 2026-08-20. P3 (the LLM layer of the engine itself: semantic composition gates, dedup, surgery, briefings, machine participants) waits behind it.

Run logs and sweep CSVs land in `packages/sim-harness/runs/` (git-ignored).
