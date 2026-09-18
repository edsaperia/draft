# OPERATING.md — the operator's map

What runs where, what configures it, how a deploy happens, and where the
bytes live. Written for somebody who did not build it. PRODUCTION.md is the
plan — the stages, what is left of them, the decisions — and
`design/DECISIONS.md` carries the reasoning; this file is the map, and where
they disagree the code wins — every claim here was checked against
`packages/server/src/config.ts`, `render.yaml`, `.github/workflows/ci.yml`
and `scripts/verify-deploy.mjs` rather than against the plan, last on
**2026-09-17** (issue #15), which found the `DRAFT_STORE` row, the check and
field counts, both CI job lists, the documents-only lane and every restart
procedure out of date.

**Evidence here names a file and a symbol, never a line number** (Ed,
2026-09-17). A line number is right for a day and wrong for ever after, and
the one route split of Q1352 invalidated every one this file and
PRODUCTION.md carried; a symbol is what `grep` finds and what survives the
next move.

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
| `DRAFT_MAIL_FROM` | The `From` header on every mail | `docs.vote <invitations@mail.docs.vote>` | Dashboard, `sync: false` — **read §8, trap 2 before trusting it** |
| `DRAFT_MAIL_OFF` | The mail kill-switch (stage 16): `1` holds every queued mail **pending** — nothing is lost and nothing goes out — and clearing it delivers the backlog. `/healthz` reports it as `mail: off` | unset (mail on) | Not set. An env-var change and a restart; no deploy — **§3's *Restarting the live host* first**, for the pause and for the surface a restart drops |
| `DRAFT_NOTIFY_EMAIL` | Operator notification: every document birth is mailed here | `edsaperia@gmail.com`, compiled in | Not set. Setting it **empty** switches the notification off |
| `DRAFT_BOT_KEY` | The key to the bot outbox (§10, Q1310): mail to any address at `bots.docs.vote` is filed on the host instead of sent, and `GET /api/bots/outbox` serves the file to the bearer of this key. Unset or empty, the route is a 404 like any unknown path | unset | Dashboard, `sync: false`, on both services. Rotate by changing it; a restart applies it — **§3's *Restarting the live host* first**. Rotating it also takes the key CI pauses and uploads the surface with, so change the `DRAFT_BOT_KEY` repository secret in the same sitting |
| `DRAFT_STORE` | `file` or `pg` — where the bytes live. Absent means `file`. An unrecognised value is a **boot refusal**, never a fallback | `file` — the code's default (`config.ts`, `storeRaw`), **not production's value** | **`pg` in production**, and has been since the cutover of 2026-08-20 23:30 (§1, §7). Dashboard: `render.yaml` declares the key `sync: false`, so the value is not in the repo and a blueprint sync does not set it. This is the Postgres cutover switch, so **a service brought up without it boots on the file store** — which since 498(b) is an empty directory on the ephemeral instance filesystem, wiped at the next deploy. `/healthz` `store` says which one answered; on docs.vote it must read `pg` |
| `DATABASE_URL` | Postgres connection string; required when `DRAFT_STORE=pg` | unset | Dashboard, when it exists — the frankfurt database's **internal** connection string |
| `DRAFT_TRUST_PROXY` | `1`/`0`. Trust `x-forwarded-*` for the client IP and the original protocol | On in the built artifact, off in dev | Not set — the build's default is already right on Render |
| `DRAFT_PROXY_HOPS` | How many proxies **append** to `x-forwarded-for`, i.e. how far from the right the client's own entry sits. Only consulted when the proxy states the client no other way | `1` | Not set. **Never raise it "to be safe"** — a count larger than the real chain reads an entry the client supplied, which is the spoof the count exists to prevent |
| `DRAFT_COOLDOWN_MS` | The adoption metronome (SPEC §4.2) — how long after one adoption before the document can change again. Engine tuning, **never a room decision**: not a setting, not in the catalogue, not in the record. Above 5 min is a **boot refusal**, not a clamp | `0` — no cooldown; adoptions land as they clear (Ed, 2026-09-05, SPEC v0.97) | Not set. **Setting it switches pacing on**: `60000` gives a 15-minute room fifteen moments when the document can change. Before 2026-09-05 the unset default was the engine's `300000`, and docs.vote ran at it from the day it went live — the one-minute value in the earlier docs was never set anywhere. Read at boot, so changing it is a restart — **§3's *Restarting the live host* first**; every document the host serves is re-paced to the value at its next minute tick, by an amendment in its own engine log (R-086). `/healthz` states the value in force |
| `DRAFT_DESIGN_DIR` | Where `design/` is | `./design`, else `../../design`, whichever exists | Not set |
| `RENDER_GIT_COMMIT` | The commit the process was built from, served as the `x-build` header and as `booted` in `/healthz` — a page upload moves the header, never the field (issue #8) | — | Render sets it |
| `DRAFT_BUILD_SHA` | The same, anywhere that is not Render | unset | Not set |

Two things in that neighbourhood that are **not** configuration:

- **`DRAFT_BUILD`** is a build-time define, not an environment variable you
  set. `npm run build` bakes `prod` into `dist/server.mjs`, and that is what
  makes the artifact the production one: it refuses to boot
  half-configured, and the dev-outbox route is dropped from the bytes.
- **Engine tuning** (hot-set size, deadlock thresholds and the rest) is a
  config *field* and is deliberately not readable from the environment, so a
  deployed room always runs as shipped. The one exception is the cooldown
  above, which is the operator's by SPEC §4.2.

**The production artifact fails fast.** It refuses to boot without
`DRAFT_SECRET`, `DRAFT_BASE_URL` and `RESEND_API_KEY` — naming all of the
missing ones at once — and refuses a `DRAFT_BASE_URL` that is not `https://`.
A half-configured service crashes at deploy time instead of quietly serving
everyone's magic links.

## 3. How a deploy happens

There is no separate deploy step. **A push to `main` is a deploy.** Commit
freely; pushing is the decision.

1. Push to `main`.
2. CI (`.github/workflows/ci.yml`) has three jobs. **`ci`** — the only one
   that deploys — runs `npm ci`, `npm run lint`, `npm run typecheck`,
   `npm test`, `npm run spec-check`, `npm run copy-check`,
   `npm run clock-check`, re-runs the server's own tests against Postgres
   with `DRAFT_TEST_STORE=pg npm test -w @draft/server`, then
   `npm run build`. **`probe`** and **`walks`** run in parallel with `ci`
   and cannot hold the deploy: a red there is a red X on the commit, not a
   held deploy. **Each job's own step list in `ci.yml` is the list of
   record** — both grow — but as they stand, `probe` runs the two design
   probes against the frozen reference (`probe --strict`), the rendered
   copy golden (`copy-check --walk`), `probe-coverage`, `toc-travel`,
   `drawer-walk` and `picture-walk`; and `walks` boots a dev server in the
   job and runs `journey`, `founder-answers` (self-starting, its own
   server), `applicants-walk` at all three admission prices,
   `after-begin-walk`, `invite-walk`, `member-questions-walk`, `slug-walk`,
   `ladder`, `room-walk` against a second server with the cooldown at 0,
   and last — about ten minutes of it — `seat-matrix --hat=both`, whose
   exit 3 (a SURFACE §2 cell nobody has written a rule for) reddens the job
   like any other failure.
3. CI runs a **boot smoke** on the artifact: it must refuse to boot with no
   secrets; configured, it must serve `/`, serve `/setup.js`, answer
   `/healthz` with `"store":"file"`, send `x-content-type-options: nosniff`,
   and **404 on `/api/dev/outbox`**.
4. On `main` only, CI first asks **what the live host has not got** (Q1347;
   issue #8), through the compare API between the host's own commit and
   this one, and takes one of three lanes. The host is asked for it: a GET
   of `$DRAFT_BASE_URL/healthz` before anything else, whose `booted` names
   the commit the process was built from — the one field a surface upload
   cannot move — and whose `surface` names the last page upload. The engine
   lane compares against `booted`, the page lane against `surface ?? booted`,
   and a host that will not answer leaves the previous push standing as the
   base, which is the old behaviour and deploys more rather than less. **A
   commit that never deployed stays in the range until it does** — the
   whole of it, so a red server push followed by a design-only fix-up takes
   the full lane rather than serving the new page over the old engine
   (design/DECISIONS.md:6907). The test is on **paths**, not on names: a
   file is the host's unless it is under `docs/`, is a `.md` file at the
   **top level of the repository**, or is a served surface file — a name
   `surface.ts`'s `SURFACE_NAME` admits under `design/` (a test in
   `surface.test.ts` holds `ci.yml`'s filter to that pattern). **Documents
   only** — every changed file is under `docs/` or is a top-level `.md`:
   nothing is deployed. `packages/server/NOTES.md` and `design/MOBILE.md`
   are not documents by this filter, being neither at the top level nor
   under `docs/`: a push touching only the first takes the full, paused lane
   below, and one touching only the second takes the full lane too, since a
   `.md` under `design/` is not a served file. **The surface only** (every
   changed file is a document by that rule or a served surface file, and at
   least one is the latter): the served
   page files at the top of `design/` are packed as one ustar tar.gz and
   `POST`ed to `$DRAFT_BASE_URL/api/admin/surface?sha=<commit>` bearing
   `DRAFT_BOT_KEY`; the running host unpacks them into
   `<dataDir>/surface-<commit>/`, serves from there from that moment, and
   states the commit in `x-build` — so every open page reloads itself, CI's
   check sees the commit it pushed, and no process restarts, no document
   leaves memory, no room pauses. `/healthz` shows `surface`. A host that
   will not take the upload gets the full deploy instead. **Anything else**
   (`packages/`, `scripts/`, the workflow): the full deploy below. A page
   and a server change in one push always take the full lane; a change to
   both in two pushes is one push out of step, which is the lane's cost.
   For the full lane CI first **pauses the live host** (Q1345) — `POST
   $DRAFT_BASE_URL/api/admin/pause` bearing the `DRAFT_BOT_KEY` repository
   secret, the same key the host holds — and then POSTs the
   `RENDER_DEPLOY_HOOK` repository secret, with `ref=<the pushed commit>`
   on it so Render builds the commit this run tested rather than whatever
   `main`'s head is by the time it gets there (issue #8). With no hook
   secret the step is
   inert — no hook, no deploy, no failure; with no key secret the deploy
   runs **unpaused** and the log says so. **Deploys are serialised** (issue
   #8): the `ci` job takes a `deploy-main` concurrency group on a push to
   main, so two pushes deploy one after the other and never side by side; a
   run in flight is never cancelled, since it has already paused the live
   host, and a third quick push cancels the *pending* second, whose changes
   then deploy with the third — which step 4's base handles, the range being
   the host's rather than the push's. **Why the pause** (the
   notanotherpizza demo, 2026-09-12): Render boots the new instance beside
   the old and moves traffic over across some minutes, and a browser pinned
   to the old instance by keep-alive goes on writing to a document log the
   new instance has already loaded — the primary key on (document, seq)
   rejects one writer's rows with a 23505, that instance's cursor is behind
   the database for good, and every later write on it fails until it dies.
   Paused, the old instance persists nothing, refuses every command with
   503 and the pause in the answer, ticks nothing, and says `paused` on
   every view answer, so every open page draws the maintenance modal with
   the bar; the new instance boots unpaused and the page reloads itself when
   a new `x-build` answers. A magic link followed in those minutes is refused
   with a maintenance page rather than a redirect, and its single-use token is
   not spent, so the person's own link works again once the pause lifts; a
   command that was already queued behind a write when the pause landed is
   refused with the same 503, never answered 200 for a write that did not
   happen (issue #9). A pause lifts itself after fifteen minutes, so a
   deploy that never lands cannot hold a room; `POST /api/admin/resume`
   lifts it by hand. **Do not deploy while a room is live if you can help
   it** — the pause makes it safe, not free: the room waits.
5. CI polls `$DRAFT_BASE_URL/` every 15 seconds, reading the
   **`x-build`** response header, and waits for it to equal the pushed SHA.
   The budget is **thirteen minutes** where the host was paused and
   twenty-five where it was not (issue #8): a pause lifts itself after
   fifteen, so a poll that ran longer would spend its last minutes watching
   an instance that had gone back to writing. The pause is never re-sent
   while polling — once traffic has moved that would pause the *new*
   instance. If any of this fails after the pause landed, a step runs on the
   way out and POSTs `resume`, so a red deploy does not leave the room
   paused; the log says whether it took.
   This is the step that makes the verification mean something: the old
   instance keeps answering 200 for the whole minutes a build takes, so
   "the service is up" would verify the bytes the deploy was replacing. If
   `x-build` never becomes the pushed SHA, CI fails rather than report a
   verification of bytes it did not deploy.
6. CI runs `node scripts/verify-deploy.mjs $DRAFT_BASE_URL
   --before=before.json` against the live host, with `--booted=<the pushed
   commit>` after a full deploy and `--booted=same` after a surface upload:
   the first says the pushed *engine* is the one answering, the second that
   the page moved and the server did not (issue #8). `--before` is step 4's
   pre-deploy `/healthz`, and what it buys is in §4.

If a deploy's live verification fails: revert the commit, push the revert,
confirm the live host is healthy, and write it up. Do not push a fix forward
past a red verification.

**Five changes to the lane machinery land in the same deploy as this
description** (issue #8, ruled 2026-09-17), so the paragraphs above are
written with them in place and `.github/workflows/ci.yml` is the record of
what the workflow actually does:

- `/healthz` gains **`booted`**, the commit the *process* booted with, beside
  the `build` it serves — which a surface upload moves and a restart moves
  back. The lane is chosen against `booted` rather than against `x-build`
  alone, so a host that took a surface upload can no longer read as a host
  running that commit's server code.
- The surface lane's file list derives from `surface.ts`'s own
  `SURFACE_NAME` — the regexp the host validates the upload against — rather
  than from a list of globs repeated in the workflow, which is how the two
  could disagree about what a page file is.
- Deploys **serialise**: two pushes cannot have their deploys in the air at
  once, which is the overlap the pause exists to survive.
- A deploy that **fails** resumes the host it paused, rather than leaving the
  room waiting out the fifteen-minute self-lift.
- `verify-deploy` asserts the live **store** and the **quarantine count**, so
  a host that came up on the file store, or that lost a document at boot, is
  a red deploy rather than a quiet one.

### Restarting the live host

A restart is not a deploy, but on Render it is the same event from the
instance's point of view: with no disk (498(b)) the platform can start the
new instance beside the old and move traffic across, so two processes hold
the same document for some seconds. That is exactly the split §11's
`stalled` describes — the primary key on (document, seq) refuses one
writer's rows, its cursor is behind the database for good, and every later
write on it fails. So:

1. **Pause first**, for the same reason CI pauses before a deploy (§3, step
   4). Paused, the old instance persists nothing, refuses every command with
   503 and the pause in the answer, ticks nothing, and every open page draws
   the maintenance modal instead of meeting an error:

       curl -fsS -X POST -H "authorization: Bearer $DRAFT_BOT_KEY" \
         -H 'content-type: application/json' -d '{}' \
         https://docs.vote/api/admin/pause

   For a restart that only re-reads an environment variable the pause is a
   **courtesy to open pages** and a guard against the overlap; it is not a
   data gate. For `erase`, `delete` and `wipe` it **is** a data step, and the
   pause goes before the tool runs, not before the restart — see §5.
2. **Restart.** Render dashboard → the service → *Manual Deploy → Restart*.
3. **The pause needs no lifting after a restart** — it lives in the old
   process's memory and the new one boots unpaused — and it lifts itself
   after fifteen minutes in any case (`PauseState.MAX_MS`). If you paused and
   then did **not** restart, lift it by hand: `POST /api/admin/resume`, same
   key. Check `/healthz` `paused` is `null` either way.
4. **Read `/healthz` `surface` afterwards.** A surface upload lives only in
   the process's memory and in a directory under the *ephemeral* data dir
   (`routes-admin.ts`'s `POST /api/admin/surface` sets `designDir`,
   `buildSha` and `surfaceSha`; `server.ts` boots `surfaceSha` as `null` and
   nothing else ever writes it). So **after any restart the host serves the
   page files of its own artifact** — the commit of the last *full* deploy —
   and `x-build` reads that commit again. Every surface-lane push since then
   is silently gone. If `surface` is `null` while the last green `main` run
   took the surface lane, re-run that run's deploy job, or push again to take
   the full lane. Nothing announces this on its own, which is why it is a
   step here.

## 4. Verifying by hand

`verify-deploy.mjs` proves things about the **environment** that no unit
test can reach — TLS, HSTS, the redirect, the dev outbox's absence from a
real deploy, the design tree's notes staying unreachable. Everything it does by
default is a GET or a **POST it expects to be refused**, and nothing it does
is accepted — so nothing writes to a log or mints a mail, and **it is safe
to run against production**. The POSTs are there because a 404 for a GET on
a POST-only route proves nothing (Q674): `/api/dev/ladder` and
`/api/dev/seat` are asked with their real method and must 404; the three
admin routes — `/api/admin/pause`, `/api/admin/resume` and
`/api/admin/surface` — are asked carrying a **wrong** bearer token and must
answer 401 (or 404 on a host with no key); the bot outbox is asked with no
key and with a wrong one; and one cross-origin POST to `/auth/login` must be
refused 403.

```
npm run verify https://docs.vote
```

or equivalently `node scripts/verify-deploy.mjs https://docs.vote`. It
prints one line per check and exits non-zero if any failed.

**The run is its own list**, and the list of record is the sequence of
`check(…)` calls in `scripts/verify-deploy.mjs` — it has grown five times
since this paragraph first counted it, and issue #8 adds to it again, so
what follows says what the default run covers and deliberately does not
give a number. `/` serves HTML · `/healthz` states its build, store and
document count and is `no-store` · the security headers (`nosniff`,
`no-referrer`, and the three CSP directives) · HSTS a year with
`includeSubDomains` · plain http is redirected and never served · the dev
outbox is 404 · the error log's tail at `/api/dev/errors` is 404 (Q1330) ·
the phase ladder is not in the artifact, asked with its real method (Q674) ·
the pause, resume and surface-reload routes refuse a stranger (Q1345,
Q1347) · the bot outbox refuses a stranger (Q1310) · API responses are
`no-store` · design assets serve while notes, probe tooling and the frozen
reference copies 404 · the document's face serves as a woff2 from
`design/fonts/` at both the root and under a document, with the folder
otherwise locked (Q1402) · the retired threshold explainer at `/pairwise`
404s (Q1362) · an unknown document 404s in JSON without leaking internals ·
a cross-origin auth POST is refused 403.

**Four options** (issue #8), all off by default so a bare run is the same
script it always was. `--before=<file>` is a `/healthz` body read before the
deploy, and what it buys is comparison rather than absolutes: the store
unchanged, the documents no fewer, the quarantined no more — production
carries three quarantined logs today, so an absolute zero would redden every
deploy and only this deploy's *change* is this deploy's business.
`--booted=<commit>` asserts which engine is answering and `--booted=same`
that it has not moved (see §3). `--store=pg` asserts the store by name, which
is what CI passes against docs.vote — a host that came up on `file` would
otherwise pass every check here while serving an empty directory. Against the
dev host it is `--store=file`, that host's store being the instance's own
disk (§9).

```
npm run verify https://docs.vote -- --limits
```

adds one more check: it hammers `/api/docs/pending` — the one rate-limited door
that neither sends mail nor writes a log — with a *spoofed*
`x-forwarded-for` on every request, and expects a 429. It is off by default
because it leaves a 429 in the platform's logs.

**The login door has two buckets** (Q1341, Ed 2026-09-12): 200 requests per
IP in ten minutes, since a convention room arrives on one venue wifi and so
on one address, and 5 per email address in the same window, which is what
stops a script working one address. Both numbers are guesses to revisit
after a real convention.

**Reading a failure.** A `/healthz` 404 usually means the live build predates
the health route rather than that anything is wrong; check `x-build` against
`git log` before treating it as an incident.

`/healthz` is also the service's own health check path. **The route is the
list of record** — `GET /healthz` in `packages/server/src/routes-admin.ts`,
where each field carries the reason it is there — and as it stands it
answers `{ ok, build, surface, booted, catalogue, store, documents,
documentsSkipped, documentsQuarantined, documentsStalled, paused,
uptimeSeconds, mail, devMail, outbox, errors, cooldownMs }`. **Three of
those are commits and they are not the same question** (issue #8): `booted`
is what the *process* was built from and nothing can move it; `surface` is
the last page upload (Q1347), or `null` — §3's *Restarting the live host* on
why a `null` there after a restart is not nothing; `build` is whichever of
the two is answering in `x-build`, which is `surface` once there has been
one. A host whose `build` names today's commit and whose `booted` names last
week's is serving a new page over an old engine — which is a real incident,
not a curiosity (design/DECISIONS.md:6907). Adding `--booted=<commit>` to a
verify run asserts the engine by name, and `--booted=same` (with `--before`)
asserts it has not moved. The other four that are not self-explanatory:
`documentsSkipped` counts logs below schema version 2 and is 0 on docs.vote
since the wipe (§5); `documentsQuarantined` counts logs whose replay threw
(§5 point 1); `documentsStalled` counts documents the store has refused for
good (§11); and `paused` is the announced pause's payload, or `null`. It is
the one route excluded from the access log, so a health check every few
seconds does not drown it. `devMail` is
whether the host runs without a Resend key — the birth page reads it to
decide whether to ask for the stagehand's controls (Q1349), and it is `false`
on docs.vote.

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
  people.json        the people rows (decision 1253): every member's and
                     applicant's email, name and picture, keyed by the
                     person id the log's events carry — and nowhere else
  provisional.json   the founder's pasted pre-save text (a deliberate sidecar,
                     not a log event: nothing about it has been decided yet)
  engine.jsonl       the engine's own hash-chained log
  bridge.json        the engine bridge's pairing state
tokens.json          magic-link tokens, sha256-hashed, single-use, expiring
pending.json         the pre-save text stash, keyed by hashed capability id
mail-outbox.json     the durable mail queue: everything accepted and not yet
                     sent (review #1 finding 15). Not `outbox.jsonl` below —
                     that one records what was sent, this one holds what was
                     not, and a backup dropping it un-sends whatever is in it
outbox.jsonl         dev mail only — every mail and its magic link
bots-outbox.jsonl    mail to *@bots.docs.vote, under either store (§10)
errors.jsonl         the error log (§11): every refused command and every
                     failed request, one JSON line each, under either store
secret.txt           only when DRAFT_SECRET is unset (so: dev only)
```

**A copy carries the first eight and not the last four.** `export` and
`import` move everything down to `mail-outbox.json`, because those are what
the persistence seam holds; `outbox.jsonl`, `bots-outbox.jsonl`,
`errors.jsonl` and `secret.txt` are written beside it and are not a
document's state. `docs/runbooks/backup-and-restore.md` is the same list
as a backup's contents.

Five things to know about it:

1. **The log and the people rows are the persistence, and loading is
   replay.** There is no snapshot and no second source of truth. A document
   exists exactly when `docs/<id>/log.jsonl` exists; the server lists
   documents by scanning for that file, replays the log, and hands the
   replay its `people.json`. The rows are state *beside* the log, never
   derived from it: a replay writes none, and a person whose row is gone
   reads as erased on the next view. A log holding any entry below schema
   version 2 — the shape every document had before 2026-09-08, with the
   addresses in the events — is **skipped at boot and named once**
   (`[store] <id> is the pre-people shape (decision 1253): not loaded`),
   never migrated; `/healthz` counts them as `documentsSkipped`. Production
   holds none after the wipe. A log whose replay **throws** — a broken hash
   chain, most likely — is **quarantined**: named once in the boot log
   (`document '<id>' failed to load — quarantined: <error>`), answering 404
   until repaired, and counted as `documentsQuarantined` (Q1322, the day a
   production document vanished behind `errors: 0`). A log carrying a
   shape this build no longer reads — 🤝's pre-entry-94 `holder` or
   `joinPolicy` keys, 🪪 under its old id `membership`, a `signed-out` ·
   `frozen` · `thawed` event — is quarantined the same way, the error
   naming the key or id (Q1329: nothing is folded, there are no old
   documents). A non-zero there is the boot log's line to read, then §5's
   tools — and every copier names each of them (`SKIPPED <id> — <reason>`)
   and exits 1 while copying everything else, so an export is also a way to
   list them (issue #13; `docs/runbooks/backup-and-restore.md`).
2. **It is as sensitive as the room.** `people.json` carries every address,
   name and picture, and the log every founding answer **in plaintext** —
   the blindness design withholds at the projection, not at storage — and
   `provisional.json` is somebody's draft charter. Treat a copy of this
   directory as you would treat the members' inboxes. `data/`, `secret.txt`,
   `tokens.json` and `outbox.jsonl` are all gitignored so a careless
   `git add` cannot publish them.
3. **Nothing here is ever deleted as part of running the service.** No
   JSONL log is shortened, pruned or rewritten, by hand or by tooling; a log
   grows and is otherwise left alone. Deletion is an operator act, and there
   are exactly three verbs that do it, each behind its own typed refusal
   (point 5):
   - **`erase`** deletes one row from `people.json` (or the `people`
     table), which the log never covered, so every hash holds and the
     person's seat stands as *[redacted]* wherever a name was printed.
     Their judgments stay, as the privacy policy says they do.
   - **`delete`** (Q1322) deletes one whole document — log, engine log,
     people, provisional text, bridge state — and is how a quarantined
     document leaves the store.
   - **`wipe`** deletes every document and every sidecar. It has run once,
     on Ed's word (2026-09-08).

   `repair-tail` is the near miss: it *shortens* one log to its intact
   prefix, and it keeps the original byte for byte beside it as
   `log.jsonl.torn-<time>`, so nothing is lost there either.
4. **Slugs are not identities.** The directory name is the document id;
   every slug a document has ever worn routes to it, out of the registry
   inside its own log.
5. **The `draft-tools` verbs for what is in here** (`node
   dist/draft-tools.mjs`; `<store>` is a data directory or a `postgres://`
   URL). The tool has **ten verbs in all** — `node dist/draft-tools.mjs`
   with no arguments prints the list of record; the four copiers and
   `repair-tail` are `docs/runbooks/postgres-cutover.md`, and `errors` is
   §11. These four are the ones that read or delete what a document holds:

   ```
   draft-tools people <store> <docId>              list the rows: id, address,
                                                   whether a name and a picture stand
   draft-tools erase  <store> <docId> <personId>   delete one row; prints what it held
   draft-tools wipe   <store> --i-understand-this-deletes-every-document=<name>
   draft-tools delete <store> <docId> --i-understand-this-deletes-the-document=<docId>
   ```

   `delete` (Q1322) removes one document and every row it holds — its log,
   engine log, people, provisional text, bridge state — and nothing else;
   tokens, stashes and queued mail that named it are keyed by other things,
   stay, and expire on their own. The id is typed twice so it cannot be
   typed by habit. It is how a quarantined document leaves the store once
   its rows are not worth repairing — the full sequence, with what each
   command prints, is `docs/runbooks/backup-and-restore.md` § *Deleting a
   quarantined document*. On Render: **pause the host first** (§3's
   *Restarting the live host*, and the paragraph below on why the pause
   comes before the tool rather than before the restart), then the service's
   *Shell* tab, then
   `node dist/draft-tools.mjs delete "$DATABASE_URL" <docId> --i-understand-this-deletes-the-document=<docId>`,
   then *Manual Deploy → Restart* so the running server forgets it — which
   lifts the pause with the old process.

   `erase` is run **against a paused or stopped service, and the service is
   restarted after it** — a running server holds the rows in memory until it
   reloads, and it can write one back. The rows are a dirty set
   (`StorePeople.takeDirty`, `store.ts`): every commit that *touches* a
   person — a name set, a picture chosen, an invitation carrying an address
   — upserts that person's row beside the entries, so one such command after
   the erase restores the row the tool deleted, from memory, with no error
   anywhere. **This is why the pause goes before the tool and not before the
   restart**: paused, the write path persists nothing at all
   (`WritePath.commit` answers `null`), so there is no window in which a
   command can undo the erase. The same applies to `delete` and `wipe`.
   Erase-then-restart is the procedure until go-live is scheduled (Ed, 2026-09-08, decision
   1287): an operator route on the running server, so the row leaves memory
   and store in one act, is owed then and not before, the restart being
   honest while the store holds only alpha documents.
   `wipe` deletes every document and every sidecar (tokens, stashes, queued
   mail, the dev inbox) and leaves the schema migrated; it **refuses**
   without the flag, and with any `<name>` but the store's own — the data
   directory's basename, or the database's name — printing the count it
   would have deleted:

   ```
   wipe: refusing — this would delete N documents in <store>. To proceed, pass
   --i-understand-this-deletes-every-document=<name>, where <name> is the data
   directory's basename or the database's name, typed in full. Nothing was deleted.
   ```

   **The wipe ran once, on Ed's word, on 2026-09-08** (PRODUCTION.md decision
   1253; the procedure is `docs/runbooks/wipe.md`): the refusal first, then 25
   documents and every sidecar deleted from the frankfurt database, the schema
   left migrated. The store has held only the people shape since. `export`
   cannot write a restore point for the old shape — it replays through the
   oracle, which refuses it — so Render's backups were the restore point.

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
| Store | `file`, on the instance filesystem | **Every deploy or restart wipes every document.** A feature: the host holds only throwaways. And on the free plan **idle sleep is a restart** (Q1309, 2026-09-10: Ed's test room vanished under him with no deploy in a day) — a dev room lives until the next fifteen quiet minutes, which is why bot rooms run on docs.vote instead (§10) |
| Mail | dev outbox (`mailer.dev`) | No key set. The 📬 button on every page reads the tail; magic links are followed from there, no inbox involved |
| Deploys | `autoDeploy: true`, every push to `main` | No gate: red or green, the dev host updates. CI's deploy hook only knows the production service |
| Plan | `free` | Sleeps after ~15 min idle; the first load then takes up to a minute. A dashboard upgrade to `starter` keeps it warm |
| DNS | `dev.docs.vote` CNAME → the service's onrender hostname (Namecheap) | Same shape as the apex. Add the custom domain on the service too, so Render provisions TLS |
| `DRAFT_BASE_URL` | `https://dev.docs.vote`, dashboard | The same-origin check keys on it: visited by any other name (the onrender address included) the host serves pages but refuses logins — §8 trap 3 |

**The dev clock** (Q1455, 2026-09-18) rides the same label as the ladder and
the seat switch: `POST /api/dev/clock` with `{ slug, advanceMs, present? }`
runs **one** document ahead of the wall clock by that many milliseconds, so a
walk that needs a member to lapse under 💤's five-minute floor (Q1453) does
not have to sit through five minutes. It advances and never rewinds, refuses
a closed document and anything past a year, and **writes no lapse of its
own** — it moves the clock and stops, and the host's ordinary minute tick
does the lapsing, the warnings, the drips and the close exactly as it would
have. `present` names the seats whose pages are open when the clock moves,
each stamped through the ordinary presence door inside the same call;
everyone else is quiet, and quiet past the spell is what the next tick finds.
Because presence records at most one event an hour per member, a jump shorter
than an hour cannot keep a named seat alive, and such a call is refused
rather than losing the seat silently. The offset lives in memory only: a
restart forgets it and the document's clock falls back to real now, which
cannot move it backwards, and nothing of the skew is ever written down —
what reaches the log is the time. `{ slug, release: true }` hands the clock
back, which is not a rewind either: the document stands where its own log
left it and stops gaining. A walk that is done with the jump should release
it, because the **phase ladder** moves a document's ending backwards on its
last two rungs and doing that to a clock still gaining wedged the close, once
in about every two runs. The seat matrix is its only caller. Absent
from the production artifact like the ladder, and one step further: the
module behind the route is reached by a dynamic import inside the `DEV:`
label, and `scripts/build-server.mjs` also asserts that the one seam in
shipped code — `foldTime`'s per-document skew — has no writer left in the
bytes, `verify-deploy` asking the live host for the route besides.

**The one thing to hold in mind:** the outbox is publicly readable — that
is what makes the ladder and passwordless dev login work — so anybody who
finds the URL can read every magic link and **log in as anyone, on any
document there**. The host must never hold anything real. That posture is
the reason it exists at all: it is what docs.vote itself was *not* allowed
to become (decisions 437, Q674).

## 10. Bots on docs.vote

Bot rooms run on the production host (Ed, 2026-09-10, Q1310: *we can have
bot users in prod — we're still in alpha*), because a dev room dies at the
next idle sleep (§9). What makes that safe is one rule at the mailer:

**Any address at `bots.docs.vote` is a bot's.** The domain must match
exactly — `x@bots.docs.vote.evil.com` and `x@notbots.docs.vote` are
strangers — and case does not matter. Mail to a bot is never handed to
Resend and is never a bounce: it is filed in the **bot outbox**
(`bots-outbox.jsonl` in the data dir, the dev outbox's shape) on the host,
in the production branch and the dev branch alike. Ed's reason for the
subdomain over a local-part convention: *they could never be confused for a
real email address*. A dev server (no `RESEND_API_KEY`) files a bot's mail in
**both** outboxes, so `room-bots` works there with or without a key.

**The key.** `GET /api/bots/outbox` serves the file's tail, newest first,
to whoever sends `Authorization: Bearer <DRAFT_BOT_KEY>` — compared in
constant time, wrong keys rate-limited per IP, a right key never. With the
variable unset the route answers 404 with the same body as any unknown path,
so a host without a key exposes nothing; `verify-deploy` asserts a stranger
never gets 200 from it. The route ships in the production artifact and is
deliberately **not** under the `DEV:` label — it is the one dev-shaped door
that is meant to exist on docs.vote.

**Running a room against production.** Found a document in your own
browser, invite the bots through ✉️ at any addresses at `bots.docs.vote`
(`ada.lovelace@bots.docs.vote` → *Ada Lovelace*), then:

    npm run room-bots -- https://docs.vote/d/<slug> --key=<DRAFT_BOT_KEY>

or export `DRAFT_BOT_KEY` and omit `--key`. The bots follow their
invitations out of the bot outbox and act like members from then on. The
file is ephemeral — a deploy takes it — and that is fine: a magic link is
one-use, and a bot whose link is spent asks for a fresh login, which lands in
the same outbox.

**What a leaked key allows.** Reading every mail the host has filed to
`bots.docs.vote`, and therefore acting as those bots in the rooms they were
invited to: judging, proposing, moving, signing as them. Nothing more — no
real member's mail is ever in that file, and a bot has no power a member
lacks. Rotate by changing the variable in the dashboard and restarting
(§3's *Restarting the live host*); every link already filed stays one-use as
before. Two things ride the same key: CI's pause and its surface upload, so
the `DRAFT_BOT_KEY` repository secret is rotated in the same sitting or the
next deploy runs unpaused and falls back to the full lane.

## 11. The error log

A member is not expected to meet a refusal at all (Ed, 2026-09-11, Q1330:
*we don't expect users to encounter refusals — refusals should print an
error on screen with a debug message, and create some kind of error log we
can debug*), so one that happens is a defect, and this is where it is
written down. **Every refused command and every failed request** appends
one JSON line to `errors.jsonl` in the data dir — under the file store and
the Postgres store alike, since the file's reader is `tail` and the bot
outbox already lives beside Postgres the same way (§10). On docs.vote the
data dir is the ephemeral disk, so **a deploy takes the file**: read it
while the room is running, or copy it off first.

A line, newest last:

```
{"at":1789152834133,"kind":"refused","status":400,"method":"POST",
 "path":"/api/d/moon/cmd","doc":"d-cea25a9578","slug":"moon","seat":"m-4",
 "cmd":"answer","reason":"'chamber' is not collecting answers",
 "args":"{\"setting\":\"chamber\",\"value\":{\"rung\":\"link\"}}"}
```

- `kind` is `refused` (the module or a route said no; the member was told,
  4xx) or `failed` (the route threw something carrying a system code — an
  `ENOENT`, a pg error — and the member was told *something went wrong*,
  500). `/healthz` keeps counting the second kind as `errors.request`; the
  first is not counted there, by design (a 400 is the product working), but
  it is logged here, because the page now prints it and somebody will ask.
- `seat` is the member's or applicant's **id**, never an address — the
  people rows are the only place an address belongs (§5). `doc` and `slug`
  name the document; a refusal before any document was found (a body that
  is not JSON, a missing content-type) carries the path alone.
- `args` is the command's arguments as one string, **capped at 2,000
  characters** (`argsTruncated: true` says when) — a refused picture is
  forty thousand of base64. An invitation's arguments carry the invitee's
  address, and that stays: the file is as private as the data dir, which
  already holds every answer in plaintext, and a refused invitation with
  its address blanked cannot be debugged.
- `reason` is the sentence the wire got, with the module's own `(§…)`
  pointer where it had one; for a 500 it is the full message, which the
  wire never gets.

**A stalled document** (Q1346). A save the store rejects for a reason no
retry will clear — a 23505, another writer holding the document's log
(§3's split) — marks the document `stalled`: it still serves, every write
on it fails, `/healthz` counts it under `documentsStalled`, every view
answer carries `stalled: true`, and the page flies a red flag where the
alpha flag stands: *This document cannot save changes at the moment.
Nothing you do here will be kept.* A save that lands clears it. A stalled
document on docs.vote is recovered by a restart (§3's *Restarting the live
host* — pause first, and read `surface` after), which reloads it from the
database at the other writer's last row; what the stalled instance took in
memory after the split is gone. The pause matters more here than anywhere
else: a stalled document is the evidence that two instances were writing at
once, and a restart taken without one is how the same split happens again.

**Reading it.** On a dev server, `GET /api/dev/errors` serves the last
fifty, newest first, the outbox's own shape — the route is under the `DEV`
label and is not in the production artifact (`verify-deploy` asserts the
404). On docs.vote, in a shell on the host:

    node dist/draft-tools.mjs errors <dataDir> [n]

prints the last `n` (50), newest first, one event per line with its reason
beneath. A Postgres URL is the wrong address for this verb and it says so.

**What the page shows for the same event** (SURFACE Y25): the sentence
under the card the command left from, and a stagehand's line at the foot of
the window — the sentence, then the command, its arguments, the document,
the seat and the time — so a member's screenshot and a line in this file
can be matched on the seat and the timestamp.
