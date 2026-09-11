# draft

A group drafting engine, and the web app built on it: **[docs.vote](https://docs.vote)**.

A membership writes a document together. Anybody may propose a change; proposals that conflict race each other; the membership votes on them in blind pairwise comparisons — *which of these two wordings?*, with no names attached and no standings shown — and a race adopts its leader when the **approval threshold**, a confidence that rises over the document's life, is cleared. Whatever never clears ships with the document as a ranked backlog. The output is not just the agreed text but the record of what was contested, by how much, and what the minority cared about. The document's own rules — who is a member, how sure the membership must be, whether the document ever ends — are decided inside the document by the same mechanism, constitutional changes needing everybody.

First target: constitutional conventions for [Newspeak House](https://newspeak.house) cohorts (5–20 members), designed not to preclude much larger instances.

**docs.vote is live, in alpha.** A document is created by naming it and verifying an email address; everything after that happens in the document. The banner on every page says what alpha means here: this is early, and nothing in it should yet be trusted with a decision that matters.

## Run it locally

Node 24 or later.

```
git clone https://github.com/edsaperia/draft && cd draft
npm install
npm run server        # → draft server on http://localhost:8140
npm test              # every package
```

Without `RESEND_API_KEY` the server runs a **dev inbox**: every mail, magic links intact, goes to the console and to `packages/server/data/outbox.jsonl`, and the page grows a 📬 button that opens them — so a whole membership can be played from one browser. That route does not exist in the production build.

| Command | What it does |
|---|---|
| `npm run typecheck` · `npm run lint` · `npm run spec-check` · `npm run copy-check` | The checks CI runs at every push: types per package, eslint, the spec and surface tables against the code, the surface copy against its golden. |
| `npm run build` | The production artifacts, `dist/server.mjs` and `dist/draft-tools.mjs`, with the dev routes dropped from the bytes. `npm start` boots the artifact and refuses without `DRAFT_SECRET`, an `https://` `DRAFT_BASE_URL` and `RESEND_API_KEY`. |
| `npm run verify <url>` | The live-environment checks (TLS, headers, no dev outbox). Read-only; safe against production. |
| `npm run design` | Serves `design/` at `http://localhost:8137/` with the fixture documents: `/` a blank arrival, `/?fixture=session` a session mid-flight, `&closed=1` a closed one. Needs no server and no account. |
| `npm run sim -w @draft/sim-harness -- --mode scripted --scenario clubhouse --seeds 5` | A deterministic simulated session, scored against the scenario's ground truth. No network. |
| `npm run sweep -w @draft/sim-harness` | The calibration sweep: ~575 scripted runs over the constitution's knobs. LLM-free. |
| `npm run test:pg` | The server suite against a real Postgres (a local `postgres:17` on `127.0.0.1:5433`); `npm test` skips those 17 tests without one. |

## Packages

TypeScript end to end; `pg` is the only runtime dependency. Tests measured 2026-09-11 with `npm test`: **1,146 passing** (9 todo, 17 skipped without Postgres).

| Package | What it is | Tests |
|---|---|---|
| `packages/engine-core` | The mechanism as a pure, deterministic, dependency-free library: diffs and footprints, the races, Bradley–Terry ranking with ties, the session state machine, the hash-chained event log, the feed router, and the participant API — the one blind surface that people, simulated members and personal AIs all speak identically. Notes: [`NOTES.md`](packages/engine-core/NOTES.md). | 307 |
| `packages/constitution` | The document's rules as a module, equally pure: the settings catalogue, the blind founding (each member states the least they will accept; the document takes the maximum), motions on both routes — ordinary ones race, constitutional ones need everybody — applications, lapse, its own hash-chained log. Runs in the browser too, as the committed bundle `design/constitution.js`. Notes: [`NOTES.md`](packages/constitution/NOTES.md). | 698 |
| `packages/server` | The product host: `node:http` with no framework, one hash-chained log per document as the only persistence (JSONL on disk or one row per entry in Postgres), magic-link login, stateless HMAC cookies, the engine riding every commit. Notes: [`NOTES.md`](packages/server/NOTES.md). | 109 (+17 Postgres) |
| `packages/sim-harness` | Simulated members driving whole sessions: deterministic scripted personas with ground-truth welfare scoring, LLM personas speaking the same participant API with no back door, a calibration sweep whose findings are folded into SPEC §4.2 and §8.3, and a live commentator. [`README.md`](packages/sim-harness/README.md). | 32 |
| `design/` | The surface itself, served by the server off disk: `session-view.html` is the one page — arrival, founding and the live document — with its machinery in `session.js`, `setup.js` and `cards.js`, and every string a member can read in `copy.js`. | — |

## Documents

Rule files hold rules; the reasoning behind them lives in `design/`. Where two disagree, `SPEC.md` wins.

| Document | What it is | Read it when |
|---|---|---|
| [`SPEC.md`](SPEC.md) | The mechanism, v0.116 — tables and numbered rules, each pointing at its reasons as `→ why: R-nnn`. The single source of truth. | First, to understand what the engine does. |
| [`SURFACE.md`](SURFACE.md) | What the surface tells a member and what a control does: the event matrix, the marks, the wallets, the founding order, the card kinds. Asserted against the page's own tables by `npm run spec-check`. | Second, to understand what a member sees. |
| [`CLAUDE.md`](CLAUDE.md) | The project's operative reference: the vocabulary, the glossary of every named part, and the post-mortems that bite. | Before contributing. |
| [`design/STYLE.md`](design/STYLE.md) | The surface-copy checklist every string a member can read has to pass. | Before touching `copy.js`. |
| [`design/DECISIONS.md`](design/DECISIONS.md) · [`design/SPEC-REASONING.md`](design/SPEC-REASONING.md) | The archives: why a thing is the way it is, what it replaced, what was rejected. The second is keyed to the spec's `R-nnn` rulings. | When a rule seems arbitrary. |
| [`QUESTIONS.md`](QUESTIONS.md) | Open and deferred items, on one project-wide number sequence. | To see what is undecided. |
| [`PRODUCTION.md`](PRODUCTION.md) | The roadmap: the staged rollout to docs.vote and what is left of it. | To see what is next. |
| [`design/MOBILE.md`](design/MOBILE.md) | docs.vote on a phone — planned, not yet built. | Before touching layout for narrow screens. |
| [`docs/OPERATING.md`](docs/OPERATING.md) | The operator's map: what runs where, every environment variable, how a deploy happens. Procedures in [`docs/runbooks/`](docs/runbooks/). | Before running an instance. |

## Checks, walks and deploys

**A push to `main` is a deploy** — CI deploys on green and verifies docs.vote afterwards, and nothing gates a merge; the three jobs and what each holds are `docs/OPERATING.md` §3. **[dev.docs.vote](https://dev.docs.vote)** is a second, throwaway instance on the dev path — a ⏭ control bottom-left walks a document through its whole life, and the 📬 outbox is public, so it must never hold anything real; every deploy wipes it.

The rest of `package.json`'s scripts are instruments, in two kinds:

| Kind | Scripts | Needs |
|---|---|---|
| Headless over `design/` | `probe`, `probe-coverage`, `card-audit`, `toc-travel`, `slider-walk`, `founder-answers`, `founding-golden`, `copy-check -- --walk` | Playwright's Chromium (`npm run playwright:install`); each serves `design/` itself. `clock-check` needs only node. |
| Against a running dev server | `journey`, `applicants-walk`, `slug-walk`, `powers-walk`, `ladder`, `room-walk`, `seat-matrix`, `room-bots -- <document url>` | `npm run server` in another terminal, with no `RESEND_API_KEY`. Each checks it is talking to a server built from your tree before it starts. `room-bots` alone also runs against docs.vote itself: invite bots at `*@bots.docs.vote`, whose mail the host catches, and pass `--key=<DRAFT_BOT_KEY>` (`docs/OPERATING.md` §10). |

What each asserts is in `CLAUDE.md`'s glossary under *Tooling*.

## Licence

[MIT](LICENSE).
