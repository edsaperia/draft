# PRODUCTION.md — the road to docs.vote

Created 2026-08-20 from the approved production plan. This supersedes the old
`PLAN.md` (deleted; git history keeps it). It is a **working document**: stages
get checked off, findings get folded in, and when this file and reality
disagree, fix whichever is wrong. Decisions carry their QUESTIONS.md numbers.

## Where we are

One command (`npm run server`) boots a real multi-tenant service: magic-link
auth, live documents, the engine racing motions, mail. It is well tested at
the happy path (374 tests green as of step zero; 399 by stage 5, 440 by stage 6). **What is missing is the
entire operational envelope** — no packaging, no CI, no deploy target, no TLS,
no backups, no schema versioning, no observability, no lint — plus a handful
of security defects that matter the moment it is reachable.

Two facts found at step zero that the original plan did not know:

- **The GitHub repo is public** (`github.com/edsaperia/draft`), and local
  `main` was 219 commits ahead of it. Pushing publishes six weeks of work and
  this file's defect list — acceptable, since the code is public anyway and
  nothing is deployed, but it makes stage 3 a hard precondition of anything
  being reachable, and it means `data/` and `secret.txt` must be gitignored
  (done, step zero) so member emails can never be committed by accident.
- **The server boots via `tsx`** — a compile-on-the-fly dev tool in the boot
  path. Production runs a compiled artifact: the bytes CI tested are the bytes
  that serve. That is stage 1's real deliverable.

## Tonight's autonomous run — the mandate (2026-08-20, 22:10)

**Read this first.** Ed set an unsupervised run going after this was written,
having compacted the session and switched models, so this section — not any
conversation — is the brief. Keep the running log at the bottom of it current
as each stage lands: **a compaction mid-run will take everything that is not
in a file.**

**The order** (his 492): **7 → 6 → 11 → 15 → 12-drafts**, then whatever of 9
is reachable. Stage 7 first because it is small and makes everything after it
observable; 6 is the night's main work; 11's restore drill immediately after,
because the drill is what makes 6 believable; 15 and 12 are independent of
both and are the delegation candidates. **Not tonight, and not for want of
time**: stage 8 (the surface merge) is supervised design work, stage 13
follows it by design, stage 16 is calendar time.

**Decisions taken at the outset**, all Ed's, 2026-08-20:

- **491(b) — push freely.** Each stage deploys to docs.vote as it lands; CI
  is the gate and verifies the live host afterwards. This reverses the
  standing "no pushes without Ed's say-so" **for this run only**.
- **493 — Ed provisions the Render Postgres.** Precise ask, so it can be done
  without a conversation: a managed Postgres, **version 17** (the local
  container is 17.11 — leave a note in the running log if Render gives a
  different major), in **frankfurt**, which is the region `render.yaml` puts
  the web service in and therefore the only region whose *internal*
  connection string will work. Then `DATABASE_URL` on the web service, from
  that database's **internal** connection string. **Not a paid-tier
  question to duck**: a free Postgres on Render expires, and an expired
  database holding somebody's constitution is a data-loss event with a
  calendar for a trigger. The disk remains the source of truth until the
  restore drill passes, which is the only reason this is survivable at all.
- **494 — subagents allowed**, under the safety rules below.
- **495 — placeholders are fine** in the privacy and ToS drafts. Nobody is
  using the site for real yet. They are drafts for Ed's review, never legal
  advice, and every placeholder must be visibly marked as one.
- **496 — the second session is parked**, so nothing else is writing to this
  repo tonight.
- **497 — the Resend DNS is done**, and confirmed live from here: DKIM at
  `resend._domainkey.mail.docs.vote`, MX and SPF at `send.mail.docs.vote`
  (eu-west-1). See stage 9's note below for what is actually left.

**The safety property that survives pushing freely — and the cutover is two
variables, not one.** The obvious design, *`DATABASE_URL` present means use
Postgres*, is wrong, and Ed's question about how to set it is what exposed
it: a fresh managed database is **empty**, so the first deploy carrying that
variable would serve an empty service while every real document sat on the
disk beside it. Nothing would be lost, and it would look exactly like
everything being lost, which at 3am is the same thing.

So there are two switches and they are set at different times:

- **`DATABASE_URL`** — where the database *is*. Safe to set at any point,
  including before the code that uses it exists. On its own it changes
  nothing about how the service stores anything.
- **`DRAFT_STORE`** — `file` (the default, and the meaning of *absent*) or
  `pg`. **This one is the cutover**, and it is only ever set after the
  importer has run and its hash assertions have passed.

Which makes the cutover a sequence with a rollback at every step: set
`DATABASE_URL` → deploy (still serving from the disk) → run the importer
against the live disk → it asserts every rolling hash identical → set
`DRAFT_STORE=pg` → restart → verify → and if anything is wrong, **unset
`DRAFT_STORE` and the service is back on the disk it never stopped writing
to**. Build the importer to be re-runnable and idempotent for the same
reason. Every push all night stays safe by construction, and both switches
are Ed's to time.

**Guardrails.**

- Lint, typecheck, tests and build green **before** any commit; CI green
  before moving to the next stage.
- The importer asserts **every rolling hash is identical before and after**.
  If that assertion fails, stop — never relax the assertion. It is the one
  oracle that says the migration preserved the log's meaning.
- **No JSONL log is ever deleted.** The file store stays the live fallback
  until the restore drill has passed.
- Each stage is its own commit, with its **runbook written as it lands** (the
  plan's own rule — runbooks are never retrospective).
- If a deploy's live verification fails: revert the commit, push the revert,
  confirm the live host is healthy, then stop and write it up.

**Stop and write a report** — do not guess — on any of: something needing
Ed's credentials (Render, Resend, Namecheap); a design judgment (that is
stage 8's territory and it is supervised); CI red twice on the same cause;
the hash assertion failing; or anything that would delete or rewrite data a
real document depends on.

**Subagent rules (494's "safely").** Delegate only work whose file set is
**disjoint** from what is being edited in the main line — stage 15's runbooks
and stage 12's drafts qualify while stage 6 is in `packages/server/src`; two
agents in one file do not. Subagents write files; **the main line reviews
every diff and does every commit**, and no subagent pushes. Best available
model, per Ed's standing preference.

**The local database.** A pinned container is already running and proven:
`postgres:17-alpine`, container `draft-pg`, on `127.0.0.1:5433`, user /
password / database all `draft`. Recreate with `docker run -d --name draft-pg
-e POSTGRES_PASSWORD=draft -e POSTGRES_USER=draft -e POSTGRES_DB=draft -p
5433:5432 postgres:17-alpine`. **Port 5433, not 55432** — Windows reserves
ranges that make the higher port unbindable. CI needs the same database as a
service container, or the migration is tested only on this machine.

### Running log — keep this current

- 22:10 — prep complete: environment proven, mandate written, decisions
  recorded. Nothing of stages 6–16 started.
- 22:30 — **stage 7 landed** (commit follows): `/healthz` (build · store ·
  document count · uptime), one request line per response (no query
  strings, no health pings), graceful SIGTERM (stop clock → stop listening →
  drain write chains → close store → exit 0, 10s limit), loud exit on
  unhandled errors, and the two cutover switches read **inertly** —
  `DRAFT_STORE` absent = `file`, `pg` refused until stage 6 carries the
  backend, anything else refused. Runbook:
  `docs/runbooks/deploy-health-shutdown.md`. CI smoke now SIGTERMs the
  artifact and expects `closed cleanly`; render.yaml health path is
  `/healthz` — **Ed: set the same on the service** (Settings → Health Check
  Path), since a blueprint edit does not re-sync an existing service.
  Subagents running on stage 12 drafts (`docs/legal/`) and stage 15 review
  (README + `docs/OPERATING.md`).
- 22:40 — **stage 6 built and rehearsed locally** (commit follows; pushed
  only once the stage-7 deploy question below is resolved). `PgPersistence`
  behind the unchanged seam: one row per log entry in `document_log` /
  `engine_log`, PK `(document_id, seq)` as the cross-process guard plus a
  per-document advisory lock per batch; sidecars as rows; tokens taken by
  `DELETE … RETURNING`; migrations at boot under a lock, a newer schema
  refused. **Deviation from the plan's `event jsonb`: the column is
  `text`** — the hash is over key-sorted JSON so order would survive, but
  jsonb rejects NUL and lone surrogates, which member free text can carry,
  and an insert error there fails the document's commit; `event::jsonb`
  stays available to projections. `schema_version` is nullable so absent
  stays absent and an export is byte-identical. The copier
  (`copy-store.ts`) is one function in both directions with the oracle
  (every hash, both logs, replay-from-genesis, sidecars equal), re-runnable
  and refusing divergence; `dist/draft-tools.mjs` exposes import / export /
  verify / **drill**. Tested: 13 pg tests, and **the whole 14-test server
  walk runs a second time over Postgres** (locally and in CI via a
  `postgres:17-alpine` service container). Rehearsed on the built artifact
  against the local container: drill, import, idempotent re-import, verify,
  boot over pg serving the imported document, refusal without a URL. One
  defect the rehearsal caught that no test could: `pg` is CommonJS and the
  ESM bundle's `require` shim threw on boot — fixed with a `createRequire`
  banner in the build. **Not done from the stage's text, deliberately**:
  projection tables (the server replays into memory and reads nothing from
  them — a table nobody queries, with a rebuild test guarding a consumer
  that does not exist); the mail outbox table + sender loop (finding 15,
  still open); `person_id`/`people` (436 — an event-shape change with hash
  consequences, a design judgment for a supervised session); review #2.
  Runbook: `docs/runbooks/postgres-cutover.md`.
- 22:45 — **stage 11 landed locally** (commit follows, unpushed with the
  rest). The drill *is* `draft-tools drill` (disk → throwaway schema →
  throwaway directory → verified against the original, dropped after); the
  backup *is* the file layout, which boots directly and which `export`
  writes from Postgres re-runnably. New: `repair-tail` for finding 11's
  second half — dry run by default, the original kept byte for byte under
  `log.jsonl.torn-<time>`, a torn middle or a non-replaying prefix refused
  as corruption rather than "repaired". **Not automated: off-site copies** —
  a destination and a credential are Ed's to choose; Render's own Postgres
  backups stand in. Runbook: `docs/runbooks/backup-and-restore.md`.
- 22:42 — **the stage-7 deploy verified: 10/10 against docs.vote**, but the
  deploy itself took ~14½ minutes from hook to the new build answering
  (CI's poll got it at attempt 58 of 60), and **docs.vote answered 502 for
  roughly nine of those minutes** — the old instance was stopped long
  before the new one was healthy. Not a crash (the new build is up and
  verified) and not visible from here why; **Ed: the deploy's event
  timeline in Render will say whether that was build time, a slow health
  check, or the disk hand-off**. Stage 4 budgeted ~30s of downtime per
  deploy; nine minutes is a different thing, and with a push being a
  deploy it happens on every push. CI's poll widened to 25 minutes so a
  slow deploy is not reported as a failed one. Pushing stages 6, 11, 12,
  15 now — expect the same window.
- 22:45 — **stages 6, 11, 12-drafts, 15 deployed and verified, 10/10** —
  and this deploy took **75 seconds** hook-to-answer with no 502 observed.
  So the fourteen minutes were the exception, not the rule: Q498's shape
  (b) stays right for its own reasons, but the urgency is lower, and the
  first thing to check in the Render timeline is what was different about
  the stage-7 deploy (the blueprint's health-check path changing is the
  obvious candidate). Live: `/healthz` → `store: file`, 2 documents.
  `DRAFT_STORE=pg` is now available on the live build and **still unset**;
  the cutover remains Ed's, per the runbook.
- 23:00 — **review #2, first pass**: an adversarial read of the stage 6/7/11
  code returned 16 findings; 14 fixed in one commit, same night. The two
  HIGHs were real and predate nothing — **a half-written `bridge.json`
  would have put the server in a restart loop with every document down**
  (resume now quarantines that document's engine, and the file is written
  temp-then-rename), and **the commit persisted the engine's cursor before
  the document log it points into** (a crash between left the cursor
  ahead, and the entries between were never fed to the engine; the order
  is now log first, so a crash leaves the cursor behind, which resume
  catches up). Also fixed: `repair-tail` could empty a log whose only line
  was torn and call it a repair; the oracle ignored `schemaVersion` and
  would have dropped a sixth envelope field silently (whole-envelope
  compare + a byte-for-byte round-trip test); shutdown awaited stalled
  requests before draining; NUL accepted by files, refused by Postgres
  (now refused by `cap` for both); `dropSchemaAndClose` could drop
  `public`; single-key advisory locks shared one namespace; migrate
  assumed read committed; pool had no timeouts; the tools guard was
  unanchored; the tools artifact lacked `dropLabels`; `tick()` kept
  enqueuing during a drain. **Not fixed, recorded**: the copier takes no
  lock on its destination (documented: never run it against the live
  store); migrations carry no checksum; `documents.created_at` is import
  time, not birth time. The stage-6 text's claim that mail moved to an
  outbox is corrected in place — it has not.
- 23:03 — **run complete.** Live build `c8a732d`, verified 10/10, serving
  from the disk; `DRAFT_STORE=pg` available and unset. Order followed as
  mandated (7 → 6 → 11 → 15 → 12-drafts), stage 9 confirmed by DNS query
  and otherwise Ed's dashboard. Four deploys tonight: 14½ min / 75 s /
  90 s / 90 s. Test count 374 → 442 in the server package's share. **Ed's
  next moves, in order**: (1) Render: Health Check Path → `/healthz`; read
  the stage-7 deploy timeline for Q498's cause. (2) Provision Postgres 17
  in frankfurt, set `DATABASE_URL` (493). (3) Follow
  `docs/runbooks/postgres-cutover.md` — import, verify, `DRAFT_STORE=pg`,
  restart, verify; `unset` is the rollback. (4) After the drill passes on
  the live database: retire the disk (498b). (5) Resend: verify
  `mail.docs.vote`, clear `DRAFT_MAIL_FROM`, one real send (stage 9).
  (6) Q500's eight legal decisions — **parked by Ed, 2026-08-29, until
  go-live is actually scheduled**; all eight, not a subset, so nothing on
  stage 12 is owed until there is a date. **Owed by a later session**: the mail
  outbox + sender loop (finding 15); projection tables if a consumer
  appears; `person_id`/`people` (436, an event-shape change); review #2's
  second pass on the surface; the sim-harness sweep baseline
  (`hotSetSize` first value is 6, engine default is 3 — the sweep measures
  its old default as baseline).
- 23:15 — **Q498 answered by the Render logs** (Ed pasted them): the 21:25
  deploy ran an instance of the *previous* build while the blueprint sync
  had already moved the health check to `/healthz`, which that build did
  not serve; Render waited its full fifteen minutes ("Timed Out" 21:40:25)
  and only then built and ran `1829889`, live 49 s later. Every deploy
  since: SIGTERM → `closed cleanly` → live in **20–25 s**. So: a
  self-inflicted ordering mistake — **never change the health-check path
  in the same push as the route it points at; land the route first** —
  not the architecture. 498(b) stands for zero-downtime, no longer urgent.
  Also seen: the drain works in production on every deploy; Render probes
  `HEAD /`, answered 404 — harmless, to be answered like GET. Ed has done
  1 (health path), 2 (Postgres + `DATABASE_URL`) and 5 (Resend verified,
  sender cleared); the import is in progress in the Render shell.
- 23:30 — **Cut over.** `/healthz` → `store: pg`, 2 documents. Ed ran the
  drill on the live database: 2 documents, 16 entries, 8 tokens, 8
  stashes, every hash identical through disk → Postgres → disk; `verify`
  agrees exactly. The blueprint stops declaring the disk (498b) in the
  next push; Ed detaches it in the dashboard after. **The disk was never
  deleted by this run**: its bytes are in Postgres, proven, and Render's
  Postgres backups are the backup (499a).
- 23:45 — **Disk deleted by Ed; the service is stateless apart from
  Postgres.** `/healthz` → `pg`, 2 documents, on build `80428c2`. The
  mandate is closed: 7, 6, 11, 15 (first pass), 12 (drafts) built and live;
  9 done by Ed; the cutover executed, drilled on the live database, and the
  disk retired; 498 and 499 decided and applied. Open: Q500. Owed by a
  later session: the list at 23:03. Housekeeping pass updated OPERATING.md,
  the runbooks, CLAUDE.md and README to the post-cutover truth.
- 00:05 — **First no-disk deploy crash-looped, and nobody noticed from
  outside**: the dashboard still carried `DRAFT_DATA_DIR=/var/data` (a
  blueprint edit removes nothing already on the service), the mount was
  gone, and `configFromEnv` did an eager `mkdirSync` on a directory
  nothing would use → `EACCES` at every boot. **Render kept the old
  instance serving throughout — 180 polls, all 200 — which is 498(b)
  delivering on its first night.** Fix: the data directory is named by
  config and created only by what writes to it (file store, dev outbox,
  persisted dev secret). Ed: delete `DRAFT_DATA_DIR` from the service's
  Environment, so the variable matches the blueprint.
- 00:15 — `9d89a3a` live and verified 10/10; the run is closed for real.

### Stage 8 — the surface merge (2026-08-21, supervised)

- 00:17 — **Q418 answered (a)** and stage 8 opened. Scope, by Ed: merge the
  files *and* wire text proposals through the engine in one pass (one
  transition, not piecemeal); `design/STYLE.md` written as the copy audit
  passes the strings; residuals 13 (per-document cookie) and 19
  (server-side face reservation) ride along. Both probes must walk the
  merged file; intentional diffs allowlisted by name. Pushing stays Ed's.
- 01:15 — **Track A landed** (`1e9d998`): `propose-text` / `withdraw-text`,
  the view serves the engine's document (`text`, `textVersion`) and a blind
  projection of the text races (`clauses`, `mine`, `records`, ten cards,
  wallet); residuals 13 (per-document cookie) and 19 (server-side face
  reservation) closed. 404 → 413 tests. **B1 landed** (`b056153`): the
  session view's script is `design/session.js` (`window.SESSION`), probe
  IDENTICAL. B2a (page integration, fixture modes, both probes) running.
- 01:58 — **B2a landed** (`708acfd`): one page — `#charter` mount under the
  band, one rail (setup tasks as SESSION entries), one wire layer, one TOC;
  Hollow Oak fixture in `fixture-session.js` behind `?fixture=session`.
  session-probe IDENTICAL; setup-probe 0 unexplained diffs. **Finding: the
  frozen `setup-pre-constitution` reference had drifted 200 diffs from HEAD
  before tonight** — HEAD is the baseline until both references are
  re-frozen at the end of the stage. Q501/502 claimed. B2b (live wiring)
  running.
- 02:24 — **B2b landed** (`7b5b6a0`): the live document is drafted in.
  Walked on the real server: propose (wallet 4→3), a second member judges
  by its own per-document cookie, adoption at p 0.892 against 0.66, the
  page shows the new text and a ✔ record that pins until OK, stake
  refunded; withdraw refunds; a stale base is refused and the draft kept.
- 02:52 — **Stage 8 closed.** `setup.html` → `session-view.html` (redirects
  behind it), server and test repointed, three STYLE fixes, both
  references re-frozen as one page set at tag `post-merge`, allowlists
  emptied; session-probe IDENTICAL, setup-probe 34 steps clean — **but its
  founding chain is dead from step 6 (Q504)**, so that guard is thinner
  than its count says. 413 tests, build and lint clean, local birth and
  `/d/:slug` verified. Q501–504 filed. **Not pushed** — the push is the
  deploy and Ed's call; `npm run verify` after.
- 03:05 — **Pushed and live**: CI green (tests, build, deploy, verify);
  `/healthz` → build `aaf057b`, `pg`, 2 documents. `/` 200, `/session.js`
  200, `/setup.html` 404 (the server serves only the page it names — the
  redirect file is for the static design server), reference paths 404.
  Open for Ed: Q501–504.

### The design-day backlog (Ed, 2026-08-21: *do all of them*)

Q440–471 were settled on 2026-08-20 and not built, because that evening
went to stages 1–7. Order, dependency-driven (topbar outward; the close
last, being the one irreversible thing):

1. Q460/462 — birth order 🪶 → 📍 → 📧, the link collected and reserved.
2. Glyph batch — Q454 (🔧→✒️, 👑→🛡️, *Who has the pen?*), Q506 (🤝 in
   the governance-tabs pattern), Q449 (identity commits ✓), Q469 (drawn
   PAUSE), Q440 (the Text's powers modelled). One re-freeze.
3. Q466/471 — the session-clock and the topbar middle.
4. Wallets and acknowledgment — Q444–447, 458; Q448/453/442; Q445.
5. 🍾 Begin — Q443, with Q441/457 and Q459.
6. The close — Q467 (engine, §4.6), Q468 🥂, Q470 the closed page.
7. Stranger's door — Q455/456/452.
8. Q463–465 come back as questions (record surface, notifications).

- 04:10 — Q504(b) landed (`9a11d6b`). Q501/503 building; Q460 next.
- 04:55 — Q501/503 landed (`e3a3c2a`): urgency = the spec's v over the
  feed's max; closeness = |2p−1|/(2θ−1), mirror-symmetric; wallet clock;
  judge counts; records one per race with the displaced text. 429 tests.
  Item 2's module half landed (`3acc379`): the Text held, 🤝 in the pattern.
  Running in parallel: item 1 (Q460/462, page + server) and item 6's
  mechanism half (Q467, engine + constitution). **Nothing pushed since
  `aaf057b`** — the next push carries the whole run; Ed's call.
- 05:25 — Q460/462 landed (`019bede`): 🪶 → 📍 → 📧, the address
  collected, reserved (Postgres migration 2), honoured at the click; PAUSE
  drawn (Q469). Running: the glyph batch (Q454, Q506 page, Q440 page, Q449)
  and Q467 (the close, engine + module).
- 06:40 — Glyph batch landed (`0811b70`): ✒️/🛡️ on every held-able
  setting, 🤝 and 📄 included; identity commits ✓. Q467 built in engine +
  module, its tests being repointed at the start's lay-down of the Text's
  powers. Running: item 3 (session-clock).
- 07:10 — Q467 landed (`ca2d7b4`): the close in engine, module and bridge;
  the Text's powers lay down at the constituted fold, so the two live
  documents migrate by replay (golden unchanged, 74 entries). 159/217/31.
- 07:40 — Q466/471 landed (`6136e77`): the session-clock. STYLE second
  pass (Q502 → *Rising Approval Threshold?*, "starting text" and
  "ordinary" out of the copy); references re-frozen as one page set;
  probes IDENTICAL / 0 diffs. Checkpoint: items 1–3 and 6's mechanism
  done; 4, 5, 6 (server + page), 7 remain. Nothing pushed since `aaf057b`.
- 07:55 — **Pushed `e7d15df`; CI red on `npm run typecheck`** (server test
  casts behind the view's new fields — vitest never type-checks tests; the
  deploy gate held, docs.vote stays on `aaf057b`). Fix in flight with item
  5. The close's server half landed (`9ced181`): tick closes, signatures,
  record, mail, mustReturn. Ed's power-line rewording applied (Q507 for
  the other halves). Running: item 4 (wallets), item 5 (🍾) + the typecheck.
- 08:50 — Typecheck fixed and 🍾 built in module + server (`823a1a5`; **not
  deployable until the page has a 🍾 card** — nothing constitutes itself
  now). Item 4 landed (`a47e37c`): the wallet family and the grants.
  Running: the page half of 🍾 / 🥂 / the closed page; the stranger's
  door server half. Then the four checks, re-freeze, push.
- 09:10 — Stranger's door server half landed (`f76cf5a`); Q508 filed.
- 09:45 — 🍾 and 🥂 on the page and the closed page landed (`b4e65be`),
  walked live through a minute-tick close. **Found: the glyph batch had
  left an undefined name that threw on every live view with a text race;
  the CI gate kept that push off docs.vote.** Q440–471's built items
  retired from QUESTIONS.md. Running: the stranger's door page half — the
  last build; then the four checks, re-freeze, push.
- 10:20 — Stranger's door page half landed (`3ae71ad`). **The design day
  is built**: items 1–7 of the backlog; 463–465 remain as questions,
  plus Q504(a), 507–509. References re-frozen; probes IDENTICAL / 0 diffs;
  the four checks run before the push that repairs CI.
- 10:40 — **Pushed `5a3f019`; CI green (ci + probe); live** — `/healthz` → build
  `5a3f019`, `pg`, 3 documents (migration 2 applied on boot); `/` 200. The
  design day is on docs.vote.
- 11:20 — **Review #2 (`/code-review`) over the stranger's door, worked through.**
  Ten findings, nine real; two more found walking the door in a browser. The one
  that mattered: the founder's name reached an unauthenticated visitor's page
  through `innerHTML` unescaped — **stored XSS at the public door**, live since
  the door shipped this morning. Fixed at the markup site, contract pinned by a
  server test. The rest were the door telling small lies (page defaults printed
  as the document's rules, *Set to undefined*, *0 of 7 have answered* whatever
  the room had done, a *Join* card that mails nothing, the Founded clause
  vanishing for an unnamed founder) plus two structural ones: a seat that dies
  mid-session degraded into a blank member page instead of falling back to the
  door, and a **duplicate key in the page's `VALUE` map** whose second,
  module-blind copy had silently overridden 🌍 and 🤝. 447 tests + the new one,
  typecheck, lint, build, both probes (session IDENTICAL, setup 0 diffs).
  Not deployed — Ed's call.
- 09:22 — **Pushed `083d95e` (carrying `4ebd153`); CI green on both jobs; live.**
  `/healthz` → build `083d95e`, `pg`, 4 documents; `/` 200, unknown slug 404,
  the dev outbox 404 in the production artifact, and the served page carries
  the single-file founding order. The XSS repair at the stranger's door is
  live. The probe job ran `--strict` for the first time and passed (36 steps,
  0 diffs, no dead steps) — Q504(a) closed.
- 12:49 — **Pushed `6a423f4`; CI green on both jobs; live.** `/healthz` → build
  `6a423f4`, `pg`, 6 documents; `/` 200, unknown slug 404. Carries the
  founder's-walk rework (single-file pacing, no defaults, the birth's fading
  clauses, one hold guard), Ed's vocabulary pass (*pass* not *carry*, the
  joined power clause), 📈 out of the queue, 🍾 on its own commit, the
  stranger's door serving the membership under 🌍 (Q508c), and the truthful
  lockline (Q510a). **Q509(a) answered and not built** — minting a membership
  from a login link is next session's first job.

### The `alpha-preset` — measured 2026-08-27 (plan-queue 77, backlog entry 77)

**The operating point at fifteen minutes had never been measured.** The
sweep runs 8-hour windows and the sim CLI defaults to 72; the alpha is five
to ten people for ten to twenty minutes. `npm run preset -w
@draft/sim-harness` measures it — whole candidate constitutions rather than
one factor at a time, at the window and roster the day will have, scored on
**`alive`: the share of seeds in which the document changed at least once**,
because Ed's bar is *everyone gets in and presses things* and a room that
watches a perfect ranking converge on a text it never adopts has had the
worse afternoon.

**The preset.** Found at the ⏰/🌡️/🪜/⏱️ cards, plus one operator variable:

| what | value | where the founder sets it |
| --- | --- | --- |
| 🌡️ the bar | **85%** | the threshold card |
| 🪜 the pace | **fixed** | *Rising Approval Threshold?* → no |
| ⏱️ the rate | **6 to start, cap 8, one every 5 minutes** | the proposal-rate card |
| ⏰ the window | **20 minutes if the room allows it, 15 otherwise** | the ending card |
| the cooldown | **`DRAFT_COOLDOWN_MS=60000`** | **not a setting** — §4.2 engine tuning, an operator env knob since entry 77 |

**The numbers behind it** (clubhouse scenario, 25 seeds, scripted personas,
roster 8 at 15 minutes unless stated). Each row is the row above it with one
thing changed:

| candidate | alive | adoptions | judgments |
| --- | --- | --- | --- |
| shipped defaults (95% ramping from 60, 5-min cooldown, 1 ✏️/4h) | 52% | 0.64 | 5 |
| fixed bar at 95 | 40% | 0.48 | 6 |
| **fixed bar at 85** | **60%** | **0.92** | 5 |
| fixed 85 + 1-minute cooldown | 60% | 0.92 | 5 |
| ALPHA PRESET (+ the rate above) | 60% | 0.92 | 5 |

And the preset across the day's shapes:

| | roster 5 | roster 8 | roster 10 |
| --- | --- | --- | --- |
| 10 min | 36% | 44% | 44% |
| 15 min | 68% | 60% | 76% |
| 20 min | 76% | 72% | **84%** |

**Three findings, and two of them are not what the plan expected.**

1. **The bar is the only knob that moves anything at this scale.** 0.95 →
   0.85 takes `alive` from 40% to 60% and nearly doubles adoptions. Every
   other single change is inside the noise.
2. **The cooldown and the rate change nothing in the simulation** — the
   three rows carrying them are numerically identical to the row above. The
   reason is the last column: **five judgments in fifteen minutes across
   eight people**. The room never reaches the cooldown and never spends its
   wallet, so pacing and generosity have nothing to bind on. The plan
   expected the cooldown to be "most of the answer to the dead-session risk
   on its own"; against scripted personas it is not the lever. It stays in
   the preset because a *human* room proposes far faster than this model
   does, and one minute cannot be worse than five.
3. **The plan's fear of a dead session was right, and the fix is the
   clock, not the constitution.** Ten minutes is where it breaks down — 36–44%
   alive at every roster — and twenty minutes with ten people is the best
   cell measured. **Prefer 20 minutes and the larger room**; a 10-minute
   session is a demonstration of the surface, not of the mechanism.

**What this does not measure.** Scripted personas judge from a latent
utility model and propose at a fixed draftiness; they do not hesitate, read,
or talk to each other. The judgment count is the number to distrust most —
a real room of eight will cast far more than five in fifteen minutes, and
every cell above is therefore a floor rather than a forecast.

Assertions, not just numbers: `npm run preset` exits non-zero if the
preset's target cell falls below a majority, if it stops beating the shipped
defaults, or if any of the nine shapes goes inert — so an engine change that
kills the alpha room is a red run rather than a surprise in front of
friends. Also fixed on the way past: `sweep.ts`'s `hotSetSize` baseline was
**6 while the engine default is 3**, so every `hotSetSize` row of every
sweep since the default moved had been scored against the old value as its
control.

## Decisions

| # | Decision | State |
|---|---|---|
| — | Persistence: Postgres, **hybrid** — the hash-chained log as rows, source of truth; projection tables derived and rebuildable. SPEC §11 replay survives. | decided |
| — | First users: Ed + a few friends. Abuse/Sybil/moderation are not launch blockers; correctness, data safety, deliverability and the security fixes are. | decided |
| — | Public reads at launch (🌍 offers them; the server has no unauthenticated read path yet). | decided |
| — | Deploy: GitHub → hosting; mail via Resend; domain docs.vote. | decided |
| 418 | Surface merge: **(a)** — one file, fixture only for states the server cannot yet produce; engine wiring for text proposals in the same pass; STYLE.md during; residuals 13 and 19 ride along. | decided 2026-08-21 |
| 430 | Push to the public GitHub repo. | decided 2026-08-20 |
| 431 | The first unsupervised run is stages 1–3. | decided 2026-08-20 |
| 432 | Hosting: **Render**. | decided 2026-08-20 |
| 433 | Sending domain: **mail.docs.vote**. | decided 2026-08-20 |
| 434 | ESLint only, **no Prettier** — it would reflow ten thousand lines of hand-wrapped prose comments and destroy the authorial voice. | adopted on recommendation |
| 435 | Build: **esbuild bundle** (already pinned, 0.28.2) rather than tsc project references. | adopted on recommendation |
| 436 | PII behind a `person_id` in a deletable `people` table **from the first schema** — nearly free now, structurally impossible later (see stage 12). | adopted on recommendation |
| 476 | **Auto-deploy on green during alpha**: CI deploys and then verifies the live environment, failing the build if what came back is wrong. | decided 2026-08-20 |
| 480 | Schema version **on the log envelope**, outside the hash; absent means 1, read through `versionOf`. Both logs carry their own number. | decided 2026-08-20 |
| 437 | `/api/dev/outbox` **deleted from the production build**, not flag-gated — half the defect is that the app can boot into a dangerous mode. | adopted on recommendation |
| 498 | **Retire the persistent disk after the Postgres cutover** (b): the service becomes stateless apart from Postgres, Render can start the new instance before stopping the old, and the file layout survives only as the backup/export format. Sequence: cutover → drill passes → a final export kept off the disk → remove the disk in the blueprint and the dashboard. **Done 2026-08-20 23:40.** | decided 2026-08-20 |
| 499 | **Off-site backups are Render's managed Postgres backups** (a); nothing further is automated. Consequence accepted: disk, database and backup share one provider account. | decided 2026-08-20 |

## Hosting: Render (432)

A web service plus managed Postgres — **and since 2026-08-20 23:40, no disk**
(498b; the paragraph below describes the original shape). The app is
stateful and single-instance *by construction* — every document is replayed
into memory and never evicted; the rate limiter and token store are
in-process; there is no locking anywhere — so a disk that pins it to one
instance is the property we want, not one we tolerate. Native GitHub deploys, managed TLS, and a second
service is a five-minute staging environment. **Auto-deploy off** — CI calls
the deploy hook after tests pass, so there is one gate. Fly.io is the named
alternative (cheaper always-on, more DIY). Not Vercel/Netlify/Workers: this is
a long-lived stateful process with a one-minute tick.

Accept ~30s downtime per deploy. At five users that is correct, not a
compromise.

## The domain (Q473, answered 2026-08-20)

`docs.vote` is registered and its DNS is set, on **Namecheap's own
nameservers** (`dns1`/`dns2.registrar-servers.com`). Both `docs.vote` and
`www.docs.vote` are **CNAMEs to `draft-x290.onrender.com`**, and
`_dmarc.docs.vote` already carries `v=DMARC1; p=none;`. Three
observations, from querying it rather than being told:

- **Render does not serve it yet.** `http://docs.vote` gets Render's edge
  404 — the request arrives and no service claims the hostname — and
  `https://docs.vote` does not answer at all, because no certificate has
  been issued. The missing step is adding the custom domain **on the
  service** (Render → Settings → Custom Domains), which is what triggers
  verification and the cert. DNS first, service second; the DNS half is
  done.
- **`DRAFT_BASE_URL` moves with it.** Magic links are minted from that
  variable, so the moment docs.vote is the address people use, it must be
  `https://docs.vote` in Render *and* in the repository variable, or
  every mailed link points at the onrender hostname. Changing it is also
  what turns on the app's own http→https redirect for the new origin.
- **The apex is a CNAME, so nothing else can live at the apex.** A name
  with a CNAME can hold no other record type — which is why the MX and
  TXT queries return the CNAME chain rather than records. It costs
  nothing here: the sending domain is the subdomain `mail.docs.vote`
  (decision 433, and it does not exist yet — stage 9 creates it), and
  DKIM, SPF and DMARC all hang off subdomains. But **an apex TXT for
  domain verification would be impossible** while this stands, so if
  Resend asks for one, the answer is to verify the subdomain, not to
  reach for the apex.

### Live, 2026-08-20 (Q481 answered (a))

`https://docs.vote` serves the product: certificate issued, `www` 301ing to
the apex, http 301ing to https, and `verify-deploy.mjs` passing **10/10**
against the real host, limiter included. One service, which is the alpha
home — decision 481(a), with the second (production) service arriving at
the point there is something to lose.

Two truths learned in the last half hour, both worth keeping:

- **`DRAFT_BASE_URL` is not cosmetic, and the CSRF check is what tells you
  it is wrong.** Saving it in Render is not enough — the process must
  restart with it. While the service still believed it lived at the
  onrender hostname, an auth POST carrying `Origin: https://docs.vote`
  was refused 403 while the onrender origin was accepted: the stage-3
  origin check doing exactly its job against the wrong origin, which
  would have refused every real login through the domain. The test for
  "did the base URL take" is that inversion flipping — docs.vote → 400
  (bad token, accepted), onrender → 403 — and it costs one curl.
- **The onrender hostname is now secondary by construction.** It still
  serves pages, but its auth POSTs are refused, because the origin check
  keys on the base URL. That is the correct behaviour and worth knowing
  before somebody bookmarks the wrong address.

### The loop is closed: a push to `main` is a deploy (housekeeping, 2026-08-20)

Decision 476 is fully wired and no longer waiting on anything.
`RENDER_DEPLOY_HOOK` exists as a repository secret and `DRAFT_BASE_URL` as
a repository variable (`https://docs.vote`), so CI's last step fires the
hook, waits for `x-build` to become the pushed SHA, and then runs
`verify-deploy.mjs` against the live host. Checked rather than assumed:
the last five runs are green and `https://docs.vote` answers with exactly
`origin/main`'s commit.

**The operational consequence is the one to hold in mind: there is no
separate deploy step any more, so pushing is deploying.** Work can be
committed freely; a push is a decision to put those bytes in front of
whoever is using the alpha. (The second, production service — decision
481(a)'s deferred half — is what eventually restores the distinction.)

### The operator hears about every birth (Ed, 2026-08-20)

The §9.7a save mails `cfg.notifyEmail` the title, the founder's address
and the URL — the alpha's whole analytics story, and the right size for
it: at five users a mail per document is a complete picture and needs no
infrastructure. It is fired and forgotten, so a save can never fail or
wait on it, and `DRAFT_NOTIFY_EMAIL` overrides (empty switches it off).
The default address is compiled in rather than configured, which is
deliberate — the feature works without touching Render — and is Q482.

**Mail is the remaining gap before anybody is invited** — see stage 9.
Until `mail.docs.vote` is verified in Resend and `DRAFT_MAIL_FROM` points
at it, the sandbox sender delivers only to the Resend account's own
address, so an invitation to a friend goes nowhere. Everything else works.

## The stages

Reordered from the original plan: the merge moved from stage 2 to stage 8.
The "one esc() instead of two" argument for merge-first was hollow — there is
exactly one `esc()` in the design layer (`setup.js:27`) and `session-view.html`
is never served, so every security fix lands once regardless. The merge's real
halvings (accessibility, caching, CSP, one asset set) are all in stages that
still come after it. Moving it buys three weeks of pure backend work that
needs no design QA, and a **deployed staging service at stage 4** so
proxy/TLS/cookie truths are learned against reality rather than discovered in
a big-bang first deploy.

| # | Stage | Size | The gate it opens |
|---|---|---|---|
| 0 | ✅ Step zero: QA batch committed, data/ gitignored | done | — |
| 1 | ✅ 2026-08-20 — Toolchain: build, lint, CI, push (430) | done | everything else lands safely |
| 2 | ✅ 2026-08-20 — Server refactor + unit tests + **review #1** | done | the storage swap becomes a substitution |
| 3 | ✅ 2026-08-20 — **Security fixes** + **security review #1** (19 findings, 14 fixed same night — residuals below) | done | safe to be reachable |
| 4 | ✅ 2026-08-20 — Staging live on Render, verified (two defects found — below); deploy-on-green **wired and firing** (Q476 — a push to `main` is a deploy) | done | proxy / TLS / cookie truth, early |
| 5 | ✅ 2026-08-20 — Schema versioning (480a) + golden-log test + both homed residuals | done | safe to change the engine, ever |
| 6 | ✅ 2026-08-20 — Postgres backend + importer with the hash oracle + CI over both stores; **cut over and drilled on the live database the same night, disk deleted** (projection tables and review #2's second pass still owed — see the running log) | done | durable, concurrent, backup-able |
| 7 | ✅ 2026-08-20 — `/healthz`, request log, graceful SIGTERM, the two cutover switches | done | deploys are visible |
| 8 | ✅ 2026-08-21 — **Surface merge (Q418 (a))**: one page, `session-view.html`; text proposals wired through the engine end to end; `design/STYLE.md` written and the audit run; residuals 13 and 19 closed; both references re-frozen (`post-merge`) | done | one surface to secure, style, cache, test |
| 9 | Resend domain + deliverability (433) — **DNS live, see below**; what is left is verification and one real send | hours, not days | the product actually works |
| 10 | ✅ 2026-08-20 — **docs.vote is live** (481a: one service, the alpha home), verified 10/10 on the real host; security review #2 still owed | mostly done | docs.vote is live |
| 11 | ✅ 2026-08-20 — the drill is `draft-tools drill`, passed on the live database; backups are Render's (499a); `repair-tail` for torn files | done | the data is safe |
| 12 | Privacy, ToS, retention, erasure | 3–5d | legal to collect a friend's address |
| 13 | **Accessibility** | 4–6d | usable by everyone invited |
| 14 | Performance, caching, **stress tests** | 4–5d | known limits, proven crash recovery |
| 15 | **Documentation review** | 2–3d | somebody else can operate it |
| 16 | Rollback, go-live checklist, soft launch | 2–3d | live |
| 17 | **Mobile read + judge** — `design/MOBILE.md` stages 0–4 (planned 2026-08-23; decisions 655–673 answered the same day) | 5–8d | a cohort can judge on phones |
| 18 | **PWA · push · offline** — `design/MOBILE.md` stage 5 | 4–6d | a phone member learns the room wants them |
| 19 | **Supervised beta** — the seat matrix and the copy freeze (plan-queue batch N), promise-coverage (batch L), the fix batch sized from L, then scripted sittings until the criterion below holds | 2–3 weeks of sittings | a supervised cohort can use it |

Roughly 10–13 weeks solo. Stages 1 and 9–10 partly overlap with waiting time
(DNS and DKIM propagation).

### Stage 19 — the beta criterion (Ed, 2026-08-26)

Agreed 2026-08-26, when Ed asked how to approach a project in which every
informal test finds bugs fast (*cards don't do what they expect, copy on cards
is stale, people don't get tasks they should get*). The diagnosis: the fold is
the best-tested part and testers never touch it; the surface is where every
finding lands and has no test at the granularity findings occur — every walk
guards one path after one bite, and none enumerates the space. The three
symptom classes are the three dimensions no walk covers: control × epoch,
event × audience, and copy over time.

**Beta-ready means:** every cell of the scenario matrix — role × epoch ×
setting-value — has been visited by an automated seat (plan-queue entry 127,
the seat matrix) or by a scripted human, **and** the last two supervised
sittings produced no finding of the class *a control did the wrong thing*.
Copy is frozen (entry 128), so a stale sentence is a red build rather than a
remark.

Rules that follow:

- **Sittings are scripted, not free-play.** Each tester gets a role and a
  numbered sequence drawn from the matrix; the observer logs every finding
  against a cell. A finding then says something about one cell and silence
  says something about the rest — free play only ever reports the cells the
  tester wandered into. Findings go to the plan-queue backlog as entries.
- **Fixes wait for the net.** The seat matrix lands before promise-coverage
  (batch L) and before the fix batch, so each fix in a 545 KB page has an
  assertion under it and L's *lock what holds* has somewhere to put a surface
  row.
- **A cell with no rule to assert against is a spec gap** and gets a Q
  number — the harness is the generator of spec questions, not another
  extraction pass.
- **Code quality is not audited by reading, and nothing is refactored before
  beta** (batch D, the session-view split, stays withdrawn). One targeted
  review of the seams that changed since review #2 — the command whitelist,
  cookie auth, the poll/re-render path, `PgPersistence` — is enough, since
  those are where a fault is a security or data fault rather than a UX one.
- **Load waits until behaviour is as expected** (Ed, 2026-08-26). When it
  comes it is one measurement, not a build: N seats × the 4 s poll × `view()`
  cost, and `replay` time against log length. The log being the only
  persistence makes read cost a function of log length — a curve measured
  once — rather than of concurrency; the real scaling risk is replay-on-boot,
  not requests per second. Stage 14.

### Why the housekeeping sits where it does

- **Lint and CI first (1)** — not because linting is urgent, but because there
  is currently no gate at all, and every later stage wants one.
- **Refactor before the database (2)** — extracting a `Store` interface turns
  stage 6 from a rewrite into a substitution, and the unit tests written here
  pin behaviour *across* the storage change. Review #1 reads the refactored
  server whole.
- **Security before anything is reachable (3)**, and a **second security
  review after deployment (10)** — the second finds a different class of
  defect (headers, exposed paths, error leakage) than a source review can.
- **Staging early (4)** — every stage after it is exercised against a real
  proxy and real TLS. Staging runs on the JSONL store; Postgres arrives before
  production, not before staging.
- **Golden logs before Postgres (5)** — migration rows need a schema version
  to carry, and the golden test is the safety net *for* the migration.
- **The merge (8) before accessibility, caching and CSP** — its real
  halvings. It is also where `design/STYLE.md` gets written and the style
  audit of session-view's copy happens (~26 candidate strings), while the
  markup is being touched anyway. And it fills the actual product hole:
  `session-view.html` is never served today, so a constituted document has no
  drafting surface at all.
- **Accessibility after the merge and after the XSS fix (13)** — both rewrite
  the same render functions; doing a11y earlier means passing over the same
  markup three times.
- **Stress tests after Postgres (14)** — the crash-recovery test is the
  concrete payoff of the storage change, and would simply fail today.
- **Docs last (15)**, because the architecture stops moving at 14 — but
  **runbooks are written as each stage lands**, not retrospectively.

## Stage 1 — toolchain

- **Build**: esbuild (435) bundles `packages/server/src/main.ts` →
  `dist/server.mjs`, platform node, zero external deps (the server's only
  dependency is the workspace-internal constitution package, which bundles).
  `node dist/server.mjs` boots it. The dev path (`tsx`) survives as
  `npm run server`.
- **Lint**: ESLint flat config, typescript-eslint recommended, **no stylistic
  rules** (434) — the config must never touch comment prose. Fix real
  findings; suppress nothing silently.
- **CI**: GitHub Actions — `npm ci`, typecheck, test, build, plus the
  constitution bundle's byte-freshness check. Node pinned (engines field +
  workflow) to the local major (24).
- **Push** (430) — CI does not exist until the repo is pushed.

## Stage 3 — the security fixes, in severity order

1. **`GET /api/dev/outbox` is unauthenticated and serves the last 30 magic
   links.** It 404s *only* when `RESEND_API_KEY` is set — a missing env var on
   deploy hands anyone every login link for every document. Delete it from the
   production build (437); never let a dangerous mode depend on another
   variable being present.
2. **No `Secure` cookie flag, no HSTS, no http→https redirect.**
3. **`ipOf()` reads `req.socket.remoteAddress` only** — behind a proxy every
   request shares one IP, so the rate limiter becomes a global
   20-per-10-minutes cap: a one-person denial of service, and useless as abuse
   control. Only 3 of 8 routes are limited at all.
4. **Attribute-context XSS.** `esc()` (`design/setup.js:27`) escapes only `&`
   and `<`, not quotes, and is used inside attribute values. Worse, `avHtml`
   (`design/setup.js:160`) interpolates a member's stored `picture`
   **completely unescaped** into `style="background-image:url(…)"`, and
   `set-identity` validates nothing — one member injects script into every
   other member's session, in a room whose premise is that judgments are
   private.
5. **No input validation or length limits anywhere** — and unbounded strings
   are written *permanently* into an append-only log.
6. **CSRF rests solely on `SameSite=Lax`**, and `readJson` never checks
   Content-Type. The magic-link routes are state-changing GETs, so email
   scanners will burn single-use tokens.
7. **Applicants receive the full member read, including every member's email
   address.**
8. **`POST /apply` writes to the log while unauthenticated.**
9. Non-constant-time HMAC compare; internal error strings returned to
   clients; no security headers at all (CSP included — the served page needs
   only `self` plus Google Fonts); fail-fast config validation missing.

## Stage 4 — what staging taught (2026-08-20)

Ed created the Render service, followed a real magic link into a real
document, and confirmed the two truths a script cannot reach: **a document
survives a redeploy** on the persistent disk, and **a magic link works
exactly once** (Q477a/b). `scripts/verify-deploy.mjs` (`npm run verify
<url>`) is the rest of the live-environment checklist as a re-runnable
script — the same one stage 10 points at docs.vote, and the one CI runs
after each deploy. Nine checks passed first time against the staging URL:
TLS, HSTS a year with `includeSubDomains`, http 301'd and never answered,
nosniff, `no-referrer`, the three CSP directives, `no-store` on API
responses, the dev outbox absent from the artifact, an unknown document
404ing without internals in the error, and a cross-origin auth POST
refused. HSTS being present also proves cookies are issued `Secure`,
since both hang off one `httpsOn` condition.

Two defects it found, both fixed the same day, both invisible to every
test that came before because both are facts about the *environment*:

1. **The rate limiter was keyed on a value that changes per request, so
   it never limited anything** — 135 requests in a row, none refused,
   spoofed or not. Stage 3's fix for defect 3 assumed one proxy appends
   to `x-forwarded-for` and read the rightmost entry; Render fronts every
   service with Cloudflare, so *two* append, and the rightmost is a
   Cloudflare edge address that rotates. Every request got its own
   bucket. `ipOf` now reads the client Cloudflare states
   (`cf-connecting-ip`, which it overwrites and a client cannot forge on
   the way in), falling back to a configurable hop count
   (`DRAFT_PROXY_HOPS`, default 1) counted **from the right**, since a
   client may prepend entries but never append them. Three tests pin the
   behaviour end to end: one bucket per stated client whatever
   `x-forwarded-for` claims, two clients two buckets, and a prepended
   entry failing to evade the count. **A limiter that never limits is
   worse than none, because the defect list says it is fixed** — which
   is the general argument for stage 4 sitting where it does.
2. **The whole of `design/tools/` and `design/reference/` was public**
   (Q478): the `/design` route filtered by file extension, so the probe
   tooling and the byte-frozen reference copies answered 200 while the
   comment beside the filter claimed they were "none of this server's to
   serve". Now top-level assets only — no path separator survives, which
   is also a second lock on traversal.

### Review #1 residuals (2026-08-20), each with a home

The adversarial review of stages 2–3 returned 19 findings; the three HIGH
and eleven others were fixed the same night (commit `3ccc78a`). What
remains, deliberately:

- ✅ **The bridge emits the motion before the engine accepts the candidate**
  (finding 6a) — fixed 2026-08-20 with stage 5. Not by reordering, which
  only moves the orphan to the other log: two append-only logs cannot be
  written in one act, so the cure is a **compensating event**. A candidate
  the engine refuses now withdraws the motion the constitution had already
  opened, returning the stake and the seat whole (§3.3a), and the log says
  what happened rather than hiding it. The mover simply tries again.
- ✅ **One cookie for all documents** (finding 13, closed stage 8 — `draft_session_<docId>`): logging into one document
  logs you out of another, and the login-CSRF story leans on the Origin
  check. Per-document cookie naming belongs to stage 8 (the merge decides
  what the page expects) or earlier if it bites.
- **Mail failure is silent** (finding 15): a transient Resend failure
  loses an invitation the log says was sent. Already stage 6's outbox
  table with a sender loop — this is the concrete case for it.
- ✅ **Emoji reservation and one-face-one-member are client-side only**
  (finding 19, closed stage 8 — `faces.ts`): a member can claim ✏️ or another member's face via the
  API. Needs the reserved-glyph scan server-side; small, stage 8
  territory (it is a page-vocabulary fact).
- **Torn-log tail repair** (finding 11's second half): a corrupt document
  now quarantines loudly instead of stopping the world, but repair
  tooling is stage 11's (backups and the restore drill).
- ✅ **An applicant who loses their cookie is locked out** — apply said
  nothing (deliberately, the oracle fix) and login said nothing (they are
  not a member), so there was no door left to knock on. **Answered by Ed
  2026-08-20 as (a)** and built the same day: the apply door **re-sends
  the verification mail** when an application from that address is already
  underway, carrying the seat that exists rather than starting a second
  one, and the landing route tolerates an applicant already verified —
  the link's whole job there is the cookie. The response is the same plain
  200 as every other branch, so nothing is disclosed by trying. Proper
  user accounts, which would retire the question, remain a later thing.


## Stage 9 — what is actually left (checked 2026-08-20, 22:05)

The DNS half is **done and confirmed by query**, not by report: DKIM answers
at `resend._domainkey.mail.docs.vote`, and `send.mail.docs.vote` carries both
the SPF TXT and an MX to `feedback-smtp.eu-west-1.amazonses.com`. Nothing at
the apex, which is right — the apex is a CNAME and can hold nothing else.

Two things remain, and neither is a build:

1. **Resend must show the domain Verified**, which is Ed's dashboard and
   nobody else's. Propagation is the only clock.
2. **One real end-to-end send**, to a non-Resend address, proving an
   invitation reaches an inbox and its link works exactly once. Until that
   happens, "mail works" is a claim about DNS records rather than about mail.

**`DRAFT_MAIL_FROM` almost certainly does need changing, and the earlier
note here was wrong.** The code's default is already
`docs.vote <invitations@mail.docs.vote>` (`config.ts`), which is why an
*unset* variable would be correct — but `render.yaml` declares it
`sync: false`, meaning it is set in the dashboard, and stage 4 set it to
Resend's **sandbox sender**, which delivers only to the Resend account's own
address. That is exactly the state where an invitation to a friend silently
goes nowhere. So: read the dashboard value first, and either clear it (the
code default takes over) or set it to
`docs.vote <invitations@mail.docs.vote>`. Clearing is the tidier of the two,
because it leaves one place where the sending identity is written down.

## Stage 6 — Postgres, hybrid

`document_log(document_id, seq, prev_hash, hash, event jsonb, schema_version)`
is the source of truth, PK `(document_id, seq)`; `engine_log` the same.
**Projection tables** — members, settings, motions, applications, slugs — are
derived in the same transaction and rebuildable from the log at any time, with
a CI test asserting rebuild == live. One transaction per command under a
per-document advisory lock, with an expected-`seq` uniqueness constraint so a
concurrent write retries rather than corrupts.

Two latent defects this fixes: `tokens.json` is rewritten *in full* on every
mint, and mail is sent *inside* the commit path with a
`void … .catch(console.error)` — a failed invitation is lost forever while the
log records it as sent. Mail moves to an outbox table with a sender loop,
after commit. *(Not yet — the stage-6 commit of 2026-08-20 fixed
`tokens.json` by construction and left the outbox for a later session; see
the running log.)*

`pg` becomes **the project's first runtime dependency**. The zero-dependency
property is a real asset; spend it deliberately and only here.

An importer moves existing local documents and **asserts every rolling hash is
identical before and after** — which is also the restore drill's correctness
oracle at stage 11, a check most projects cannot make.

## Stage 12 — the erasure answer

Emails, names and free text sit in plaintext in an immutable hash-chained log,
so erasure is *structurally impossible* as built. Three parts, and **the first
two are stage 5/6 schema decisions** (436), not stage 12 ones — nearly free
early, painful once real logs exist:

1. Events carry a `person_id`; addresses and names live in a deletable
   `people` table. Deleting a person breaks no hash.
2. Free text that genuinely rides events is redacted at the projection (bytes
   stay, so hashes hold; `view()` never renders them; the record shows
   *[withdrawn]*). Stronger option: per-member encryption of free text,
   delete the key.
3. **Be honest in advance about the remainder.** Unattributed judgments cannot
   be withdrawn — they were inputs to a collective decision others relied on.
   The privacy policy says so before anyone joins: *erasure removes your
   identity, your contact details and anything you wrote, from every view and
   every published record; your judgments, which were never attributed to you,
   remain, because the group's decision was made with them.*

## Go-live checklist (stage 16)

CI green on the release SHA · migrations applied and projections matching ·
restore drill within 7 days · health checks green and error reporting
receiving a test event · `/api/dev/outbox` absent from the artifact and
`design/*.notes.md` unreachable · headers, cert, HSTS, redirect verified live ·
test mail to Gmail/Outlook/iCloud lands in the inbox and the link works
exactly once · privacy policy and ToS linked · `DRAFT_SECRET` in the platform
store, no `secret.txt` on disk · Render's Postgres backups enabled and one restore from them drilled (499a) · a
full walk on production with a throwaway address, then delete it and verify
the deletion · mail kill-switch and maintenance mode tested, then off.

**Soft launch in three steps:** Ed alone with a real document for a week →
3–5 friends on one document with the logs watched daily → a Newspeak House
cohort. A named observation point after each.
