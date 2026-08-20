# Runbook — deploys, health, shutdown (stage 7)

Written 2026-08-20 as stage 7 landed. For the map of what runs where, see
`docs/OPERATING.md`; this is the procedure sheet.

## Is it up, and which bytes are answering?

    curl -s https://docs.vote/healthz

    {"ok":true,"build":"<commit sha>","store":"file","documents":3,"uptimeSeconds":912}

- `build` is the commit the running artifact was built from (Render's
  `RENDER_GIT_COMMIT`; `DRAFT_BUILD_SHA` elsewhere). Compare with
  `git rev-parse origin/main`. CI polls this after every deploy and refuses
  to verify until it matches the pushed SHA.
- `store` is `file` (the JSONL layout on the persistent disk) or `pg`
  (Postgres). Until the stage-6 cutover this says `file`.
- `documents` is how many documents loaded at boot. After a restore, this
  is the first number to read.
- `uptimeSeconds` resets on every deploy or crash. A small number you did
  not cause means the process restarted: read the logs.

Render's own health check points at `/healthz` (render.yaml). A service
created from an earlier blueprint keeps its old path until changed in the
dashboard: Settings → Health Check Path.

## Reading the logs

One line per response: `GET /d/hollow-oak 200 12ms`. Query strings are
never logged (magic-link tokens travel there); `/healthz` is never logged
(the platform pings it constantly). Errors carrying a system code (fs, net,
pg) are logged as `internal error:` with the stack and answered 500 with no
detail; module and validation errors are answered 400 with their message
and not logged.

Boot prints one line: `draft server on https://docs.vote (store: file,
data: /var/data, mail: resend, build: abcdef123456)`. Mail mode `dev
outbox` in production means RESEND_API_KEY is missing — but the production
artifact refuses to boot in that state, so you will see the refusal
instead.

## How a deploy happens

1. Push to `main`. There is no other step: a push is a deploy.
2. CI lints, typechecks, tests, builds, boot-smokes the artifact (including
   a SIGTERM and a clean exit), fires the Render deploy hook, waits for
   `x-build` / `/healthz` to report the pushed SHA, then runs
   `scripts/verify-deploy.mjs` against the live host.
3. If verification fails, the workflow is red but **the new build is
   already live**. Revert the commit and push the revert; CI deploys the
   revert the same way. Then confirm `/healthz` and write it up.

Manual verification at any time (read-only, safe against production):

    npm run verify https://docs.vote

## Shutdown, and why it is safe to deploy often

On SIGTERM (every deploy, every restart) the process:

1. stops the minute clock (no new ticks start commits);
2. stops listening (no new requests), finishing the ones in flight;
3. waits for every per-document write chain to drain — an append is never
   cut in half;
4. closes idle connections and releases the store;
5. exits 0, or exits 1 after 10 seconds if something refuses to finish.

`closed cleanly` in the logs is the normal ending. `shutdown exceeded
10000ms` means a request or a store call hung; the platform's restart
recovers the service, and the log before it says what hung.

An unhandled rejection or uncaught exception exits 1 immediately, logged.
The platform restarts the process. A loop of these is an incident: find the
request in the log lines before each exit.

## Configuration reference for this stage

| Variable | Meaning | Default |
|---|---|---|
| `DRAFT_STORE` | `file` or `pg` — **the cutover switch** (stage 6) | `file` (absent) |
| `DATABASE_URL` | where Postgres is; inert while `DRAFT_STORE` is `file` | unset |
| `RENDER_GIT_COMMIT` / `DRAFT_BUILD_SHA` | shown as `build` | unset |

`DRAFT_STORE=pg` is refused at boot by any build that does not carry the
Postgres backend, and by any build when `DATABASE_URL` is unset. An
unrecognised value is also refused. It never falls back to the disk
silently: if you meant the disk, unset it.
