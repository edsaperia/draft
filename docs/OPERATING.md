# OPERATING.md — the operator's map

What runs where, what configures it, how a deploy happens, and where the
bytes live. Written for somebody who did not build it. PRODUCTION.md is the
plan and carries the reasoning; this file is the map, and where the two
disagree the code wins — every claim here was checked against
`packages/server/src/config.ts`, `render.yaml`, `.github/workflows/ci.yml`
and `scripts/verify-deploy.mjs` rather than against the plan.

Procedures — cutovers, restores, incident steps — live in
[`docs/runbooks/`](runbooks/). This file tells you what the pieces are; a
runbook tells you what to type.

## 1. What runs where

| Piece | Where | Notes |
|---|---|---|
| The app | **Render** web service `draft`, region **frankfurt**, plan `starter`, node runtime | One instance, by construction — see below |
| Its bytes | **Managed Postgres**, version 17, frankfurt — `DRAFT_STORE=pg`, `DATABASE_URL` the internal connection string | Since the cutover of 2026-08-20 23:30. The persistent disk `draft-data` was deleted the same night (498b); the service holds nothing between deploys |
| TLS and edge | **Cloudflare**, in front of every Render service | Which is why the client IP is read from `cf-connecting-ip` |
| Domain and DNS | **Namecheap**, on its own nameservers (`dns1`/`dns2.registrar-servers.com`) | `docs.vote` and `www.docs.vote` are **CNAMEs** to `draft-x290.onrender.com` |
| Mail | **Resend**, sending from **`mail.docs.vote`** | DKIM at `resend._domainkey.mail.docs.vote`; SPF TXT and MX (`feedback-smtp.eu-west-1.amazonses.com`) at `send.mail.docs.vote`; `_dmarc.docs.vote` carries `v=DMARC1; p=none;` |
| CI and deploys | **GitHub Actions** (`.github/workflows/ci.yml`) | Auto-deploy is **off** at Render; the workflow is the only gate |
| Backups | Render's managed Postgres backups | Decision 499(a): nothing further is automated; `draft-tools export` writes a restore point in the file layout when one is wanted |

**The service is single-instance on purpose.** Every document is replayed
into memory and never evicted, the rate limiter and the token cache are
in-process, and there is no locking anywhere; two instances would each
hold their own copy of a document and Postgres's primary key would refuse
the second writer rather than merge them. Do not scale it out.

**A deploy no longer has to stop the old instance first** (498b): with no
disk, Render can start the new one and hand over. Before that, a deploy
cost about 25 seconds of downtime. That was accepted at alpha
size, not a defect to chase.

## 2. Environment variables

Everything the server reads, from `packages/server/src/config.ts`. "Where
set" is `render.yaml` (checked in, applied when the blueprint syncs) or the
Render **dashboard** (`sync: false` in the blueprint means the value is not
in the repo).

| Variable | Meaning | Default | Where set |
|---|---|---|---|
| `PORT` | Listening port | `8140` | Render sets it |
| `DRAFT_DATA_DIR` | Root of the data directory (§5) | `<cwd>/data` | **Unset in production.** `render.yaml` stopped declaring it when the disk was retired (498(b), 2026-08-20); with `DRAFT_STORE=pg` the log lives in Postgres and only the ephemeral instance filesystem is used. |
| `DRAFT_BASE_URL` | Absolute origin used in **mailed links** and in the same-origin check | `http://localhost:<port>` | Dashboard → `https://docs.vote`. Also a **GitHub Actions repository variable** of the same name, which is what CI verifies against |
| `DRAFT_SECRET` | HMAC secret for session cookies and for tokens at rest | A random 32-byte secret persisted to `secret.txt` in the data dir | `render.yaml`, `generateValue: true` — so nothing is written to the disk in production |
| `RESEND_API_KEY` | Real mail when set; the dev outbox otherwise | unset | Dashboard |
| `DRAFT_MAIL_FROM` | The `From` header on every mail | `docs.vote <invitations@mail.docs.vote>` | Dashboard, `sync: false` — **read §6, trap 2 before trusting it** |
| `DRAFT_NOTIFY_EMAIL` | Operator notification: every document birth is mailed here | `edsaperia@gmail.com`, compiled in | Not set. Setting it **empty** switches the notification off |
| `DRAFT_STORE` | `file` or `pg` — where the bytes live. Absent means `file`. An unrecognised value is a **boot refusal**, never a fallback | `file` | Not set. This is the Postgres cutover switch (§7) |
| `DATABASE_URL` | Postgres connection string; required when `DRAFT_STORE=pg` | unset | Dashboard, when it exists — the frankfurt database's **internal** connection string |
| `DRAFT_TRUST_PROXY` | `1`/`0`. Trust `x-forwarded-*` for the client IP and the original protocol | On in the built artifact, off in dev | Not set — the build's default is already right on Render |
| `DRAFT_PROXY_HOPS` | How many proxies **append** to `x-forwarded-for`, i.e. how far from the right the client's own entry sits. Only consulted when the proxy states the client no other way | `1` | Not set. **Never raise it "to be safe"** — a count larger than the real chain reads an entry the client supplied, which is the spoof the count exists to prevent |
| `DRAFT_COOLDOWN_MS` | The adoption metronome (SPEC §4.2) — how long after one adoption before the document can change again. Engine tuning, **never a room decision**: not a setting, not in the catalogue, not in the record. Above 5 min is a **boot refusal**, not a clamp | `300000` (5 min) | Not set day to day. **`60000` for a supervised alpha session** — at the default a 15-minute room has three moments when the document can change, and at a minute it has fifteen. Read at boot, so changing it is a restart, and a running document keeps what it was born with until then. `/healthz` states the value in force |
| `DRAFT_DESIGN_DIR` | Where `design/` is | `./design`, else `../../design`, whichever exists | Not set |
| `RENDER_GIT_COMMIT` | The commit the process was built from, served as the `x-build` header | — | Render sets it |
| `DRAFT_BUILD_SHA` | The same, anywhere that is not Render | unset | Not set |

Two things in that neighbourhood that are **not** configuration:

- **`DRAFT_BUILD`** is a build-time define, not an environment variable you
  set. `npm run build` bakes `prod` into `dist/server.mjs`, and that is what
  makes the artifact the production one: it refuses to boot
  half-configured, and the dev-outbox route is dropped from the bytes.
- **Engine tuning** (cooldowns, hot-set size) is a config *field* and is
  deliberately not readable from the environment, so a deployed room always
  runs the pacing as shipped.

**The production artifact fails fast.** It refuses to boot without
`DRAFT_SECRET`, `DRAFT_BASE_URL` and `RESEND_API_KEY` — naming all of the
missing ones at once — and refuses a `DRAFT_BASE_URL` that is not `https://`.
A half-configured service crashes at deploy time instead of quietly serving
everyone's magic links.

## 3. How a deploy happens

There is no separate deploy step. **A push to `main` is a deploy.** Commit
freely; pushing is the decision.

1. Push to `main`.
2. CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm run lint`,
   `npm run typecheck`, `npm test`, `npm run spec-check`, `npm run build`,
   and re-runs the server's own tests against Postgres with
   `DRAFT_TEST_STORE=pg npm test -w @draft/server`.
3. CI runs a **boot smoke** on the artifact: it must refuse to boot with no
   secrets; configured, it must serve `/`, serve `/setup.js`, answer
   `/healthz` with `"store":"file"`, send `x-content-type-options: nosniff`,
   and **404 on `/api/dev/outbox`**.
4. On `main` only, CI POSTs the `RENDER_DEPLOY_HOOK` repository secret. With
   no such secret the step is inert — no hook, no deploy, no failure.
5. CI polls `$DRAFT_BASE_URL/` every 15 seconds, up to 100 times, reading the
   **`x-build`** response header, and waits for it to equal the pushed SHA.
   This is the step that makes the verification mean something: the old
   instance keeps answering 200 for the whole minutes a build takes, so
   "the service is up" would verify the bytes the deploy was replacing. If
   `x-build` never becomes the pushed SHA, CI fails rather than report a
   verification of bytes it did not deploy.
6. CI runs `node scripts/verify-deploy.mjs $DRAFT_BASE_URL` against the live
   host.

If a deploy's live verification fails: revert the commit, push the revert,
confirm the live host is healthy, and write it up. Do not push a fix forward
past a red verification.

## 4. Verifying by hand

`verify-deploy.mjs` proves things about the **environment** that no unit
test can reach — TLS, HSTS, the redirect, the dev outbox's absence from a
real deploy, the design tree's notes staying unreachable. Everything it does
by default is a GET or a deliberately-refused cross-origin POST; nothing
writes to a log or mints a mail, so **it is safe to run against production**.

```
npm run verify https://docs.vote
```

or equivalently `node scripts/verify-deploy.mjs https://docs.vote`. It
prints one line per check and exits non-zero if any failed.

The ten default checks: `/` serves HTML · `/healthz` states its build, store
and document count and is `no-store` · the security headers (`nosniff`,
`no-referrer`, and the three CSP directives) · HSTS a year with
`includeSubDomains` · plain http is redirected and never served · the dev
outbox is 404 · API responses are `no-store` · design assets serve while
notes, probe tooling and the frozen reference copies 404 · an unknown
document 404s in JSON without leaking internals · a cross-origin auth POST
is refused 403.

```
npm run verify https://docs.vote -- --limits
```

adds an eleventh: it hammers `/api/docs/pending` — the one rate-limited door
that neither sends mail nor writes a log — with a *spoofed*
`x-forwarded-for` on every request, and expects a 429. It is off by default
because it leaves a 429 in the platform's logs.

**Reading a failure.** A `/healthz` 404 usually means the live build predates
the health route rather than that anything is wrong; check `x-build` against
`git log` before treating it as an incident.

`/healthz` is also the service's own health check path, and answers
`{ ok, build, catalogue, store, documents, uptimeSeconds, mail, outbox,
errors, cooldownMs }`. It is the one route excluded from the access log, so
a health check every few seconds does not drown it.

**`errors` is the one to watch during a supervised session** (entry 77). No
error reporting exists in this service — Sentry is stage 16 — so this is the
whole of it: `{ total, request, tick, outbox, last }`, counted since boot,
where `request` is a route that ended 500, `tick` is a document the minute
metronome could not advance, and `outbox` is a sender pass that threw.
`last` carries the moment, the where and a **kind** — the error's system code
(`ENOENT`, `ECONNREFUSED`) or its class — and deliberately neither the
message nor a stack, because the route is public and the messages of exactly
these throws are the ones that quote a path and an opaque document id.
**A refusal is not an error**: a 400 or a 404 is the product working, and
counting those would bury the signal under ordinary traffic. Watch `total`
between sessions; anything above zero has a matching `console.error` in the
process log carrying the full message.

## 5. The data directory

**Production no longer has one** — the store is Postgres (§7) and
`DRAFT_DATA_DIR` is unset there, so the app makes an empty `data/` under
its working directory that nothing important lands in. The layout below is
what `npm run server` writes locally (`packages/server/data`), what
`draft-tools export` writes as a backup, and what `draft-tools import`
reads. Under `DRAFT_DATA_DIR`:

```
docs/<documentId>/
  log.jsonl          the constitution's hash-chained log — the source of truth
  provisional.json   the founder's pasted pre-save text (a deliberate sidecar,
                     not a log event: nothing about it has been decided yet)
  engine.jsonl       the engine's own hash-chained log
  bridge.json        the engine bridge's pairing state
tokens.json          magic-link tokens, sha256-hashed, single-use, expiring
pending.json         the pre-save text stash, keyed by hashed capability id
outbox.jsonl         dev mail only — every mail and its magic link
secret.txt           only when DRAFT_SECRET is unset (so: dev only)
```

Four things to know about it:

1. **The log is the only persistence, and loading is replay.** There is no
   database, no snapshot, no second source of truth. A document exists
   exactly when `docs/<id>/log.jsonl` exists; the server lists documents by
   scanning for that file.
2. **It is as sensitive as the room.** The log carries member email
   addresses and every founding answer **in plaintext** — the blindness
   design withholds at the projection, not at storage — and
   `provisional.json` is somebody's draft charter. Treat a copy of this
   directory as you would treat the members' inboxes. `data/`, `secret.txt`,
   `tokens.json` and `outbox.jsonl` are all gitignored so a careless
   `git add` cannot publish them.
3. **Nothing here is ever deleted.** No JSONL log is removed, by hand or by
   tooling, while the file store is the live fallback.
4. **Slugs are not identities.** The directory name is the document id;
   every slug a document has ever worn routes to it, out of the registry
   inside its own log.

## 6. Local development

```
npm install
npm run server      # http://localhost:8140
```

1. `npm run server` runs the **dev path** (`tsx`), not the artifact, with
   its working directory in `packages/server` — so the data directory is
   `packages/server/data/`, not the repo root's.
2. Without `RESEND_API_KEY` the server runs its **dev inbox**: every mail,
   magic links intact, goes to the console and is appended to
   `packages/server/data/outbox.jsonl`.
3. `GET /api/dev/outbox` serves the tail of that file, and the page grows a
   📬 button opening every mail in a modal with its link clickable — so a
   whole room can be played from one browser without tailing a file.
4. **That route does not exist in the production artifact.** It sits under a
   `DEV:` label which `npm run build` drops bodily from the bytes, so no
   misconfiguration can turn it back on. This is why the CI smoke asserts a
   404 on it and why `verify-deploy.mjs` asserts it again live.
5. To exercise the real artifact locally: `npm run build`, then `npm start`
   with `DRAFT_SECRET`, an `https://` `DRAFT_BASE_URL` and `RESEND_API_KEY`
   in the environment. Without them it will refuse to boot, which is the
   behaviour under test.

`npm test` runs every workspace; `npm run bundle` rebuilds the committed
browser bundle `design/constitution.js`, whose byte-freshness the test suite
checks.

## 7. The Postgres cutover, and why it is two variables

**Executed 2026-08-20, 23:30** — the service has served from Postgres since,
and the disk is gone. What follows is kept because the two-variable design
is still how the service is configured, and `unset DRAFT_STORE` still means
"the disk" (which would now be an empty directory — so it is no longer a
rollback, only a refusal to boot into an empty service by accident).

`DATABASE_URL` and `DRAFT_STORE` are two switches set at **different times**,
and the separation is the whole safety property.

The obvious design — *`DATABASE_URL` present means use Postgres* — is
wrong, because a fresh managed database is **empty**. The first deploy
carrying the variable would serve an empty service while every real document
sat on the disk beside it. Nothing would be lost, and it would look exactly
like everything being lost, which at 3am is the same thing.

So:

- **`DATABASE_URL`** says *where the database is*. It is safe to set at any
  point, including before the code that uses it exists. On its own it
  changes nothing about how the service stores anything.
- **`DRAFT_STORE`** says *which store is live*: `file` (the default, and the
  meaning of absent) or `pg`. **This one is the cutover**, and it is set only
  after the importer has run and its hash assertions have passed.

Which makes the cutover a sequence with a rollback at every step:

1. Set `DATABASE_URL` on the service; deploy. The service is still serving
   from the disk.
2. Run the importer against the live disk.
3. It asserts **every rolling hash is identical before and after**. If that
   assertion fails, stop — never relax it. It is the one oracle that says
   the migration preserved the log's meaning.
4. Set `DRAFT_STORE=pg`; restart; verify.
5. If anything is wrong, **unset `DRAFT_STORE`** and the service is back on
   the disk it never stopped writing to.

The importer is built to be re-runnable and idempotent for the same reason.
The disk remains the source of truth until the restore drill has passed. The
step-by-step is a runbook, not this file: see [`docs/runbooks/`](runbooks/).

**The local database** for development is a pinned container:
`postgres:17-alpine`, container `draft-pg`, on `127.0.0.1:5433`, with user,
password and database all `draft`.

```
docker run -d --name draft-pg -e POSTGRES_PASSWORD=draft \
  -e POSTGRES_USER=draft -e POSTGRES_DB=draft -p 5433:5432 postgres:17-alpine
```

## 8. Things that are not true

Traps already paid for once. Each of these is something a reasonable person
would assume, and each is wrong.

1. **"Saving `DRAFT_BASE_URL` in the Render dashboard is enough."** It is
   not: the *process* must restart with it. Until it does, the service still
   believes it lives at its old origin, and the same-origin check on auth
   POSTs refuses every real login through the new domain — a 403 that looks
   like a CSRF bug and is actually a stale variable. The test costs one
   curl: an auth POST carrying `Origin: https://docs.vote` should be
   **400** (bad token, i.e. accepted and rejected on the merits) and one
   carrying the onrender origin should be **403**. If that inversion runs
   the other way, the base URL has not taken.
2. **"`DRAFT_MAIL_FROM` is unset, so the code default applies."** The code
   default is right — but `render.yaml` declares the variable `sync: false`,
   meaning it is set in the dashboard, and it was set there to Resend's
   **sandbox sender**, which delivers only to the Resend account's own
   address. That is exactly the state in which an invitation to a friend
   silently goes nowhere while everything looks fine. Read the dashboard
   value before believing anything about mail. Clearing it is tidier than
   correcting it: it leaves one place where the sending identity is written
   down.
3. **"`draft-x290.onrender.com` is a working spare address."** It serves
   pages, but its auth POSTs are refused **by design**: the same-origin
   check keys on `DRAFT_BASE_URL`, which is `https://docs.vote`. Anybody who
   bookmarks the onrender hostname can read but can never log in. This is
   correct behaviour, not a fault to fix.
4. **"Postgres is on 5432."** The pinned local container binds
   **`127.0.0.1:5433`**. Not 5432, and not 55432 either — Windows reserves
   port ranges that make the higher number unbindable.
5. **"Editing `render.yaml` changes the service."** A blueprint edit does
   not re-sync a service that was created from an earlier version of it.
   `healthCheckPath` and anything else changed in the file must also be set
   on the service in the dashboard.
6. **"A TXT record can be added at the apex for domain verification."** It
   cannot: `docs.vote` is a **CNAME**, and a name holding a CNAME can hold no
   other record type. This is why MX and TXT queries at the apex return the
   CNAME chain instead of records. If a provider asks for apex verification,
   verify the subdomain instead — which is what `mail.docs.vote` is for.
7. **"Auto-deploy is on, so Render deploys what lands."** Auto-deploy is off
   at the platform; CI calls the deploy hook. But do not read that as a
   second gate before production — there isn't one. A green push to `main`
   goes live.

## 9. The dev host — dev.docs.vote

A second Render service, `draft-dev` (Ed, 2026-09-01), whose whole job is
the **phase ladder at a public URL**: press ⏭ bottom-left and walk a real
document birth → constitution → ready → session → closing → closed, sit in
any seat, read every mail in the 📬 outbox. It is the **dev path** —
`npm run server` under tsx, no build, no `RESEND_API_KEY` — which is the
exact configuration CI's `walks` job boots at every push, so nothing about
it is new territory. The production service, its artifact, the `DEV:` drop
and `verify-deploy` are all untouched by its existence.

| Property | Value | Why |
|---|---|---|
| Store | `file`, on the instance filesystem | **Every deploy or restart wipes every document.** A feature: the host holds only throwaways |
| Mail | dev outbox (`mailer.dev`) | No key set. The 📬 button on every page reads the tail; magic links are followed from there, no inbox involved |
| Deploys | `autoDeploy: true`, every push to `main` | No gate: red or green, the dev host updates. CI's deploy hook only knows the production service |
| Plan | `free` | Sleeps after ~15 min idle; the first load then takes up to a minute. A dashboard upgrade to `starter` keeps it warm |
| DNS | `dev.docs.vote` CNAME → the service's onrender hostname (Namecheap) | Same shape as the apex. Add the custom domain on the service too, so Render provisions TLS |
| `DRAFT_BASE_URL` | `https://dev.docs.vote`, dashboard | The same-origin check keys on it: visited by any other name (the onrender address included) the host serves pages but refuses logins — §8 trap 3 |

**The one thing to hold in mind:** the outbox is publicly readable — that
is what makes the ladder and passwordless dev login work — so anybody who
finds the URL can read every magic link and **log in as anyone, on any
document there**. The host must never hold anything real. That posture is
the reason it exists at all: it is what docs.vote itself was *not* allowed
to become (decisions 437, Q674).
