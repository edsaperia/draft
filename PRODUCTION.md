# PRODUCTION.md — the road to docs.vote

Created 2026-08-20 from the approved production plan (superseding `PLAN.md`,
deleted; git history keeps it). A **working document**: stages get checked
off, findings get folded in, and when this file and reality disagree, fix
whichever is wrong. Decisions carry their QUESTIONS.md numbers.

What this file holds: the stage table, each stage's state with the commit or
file that proves it; the open stages' acceptance criteria, whole; the security
defects and review findings, each fixed with evidence or still open; the
decisions; and the alpha preset's measurements. What it does not hold:
**`docs/OPERATING.md` is the map of what runs where and what configures it,
and wins on that** — the code wins over both; procedures are
`docs/runbooks/`; and the build narrative of 2026-08-20 to 2026-08-21 — the
overnight mandate and its running log, stage 8's log, the design-day backlog,
the hosting and domain notes, the stage write-ups as they stood — is
`design/DECISIONS.md` § *PRODUCTION.md, the history lifted 2026-09-07*.

## Where it stands (2026-09-07)

docs.vote has served the product since 2026-08-20 — one Render service, the
alpha home (481 (a)), from Postgres since 23:30 that night with no disk
(498 (b)), mail from `mail.docs.vote` via Resend, the operator mailed at every
birth. CI deploys on green and verifies the live host afterwards, so **a push
to `main` is a deploy** (476). Stages 0–11 are done; 15 has had two passes;
12 is drafted and parked; 13, 14 and 16 are not started; 17–18 are planned in
`design/MOBILE.md`; 19 is in progress.

## The stages

State: **done** (with the commit or file that proves it) · **open** (its
acceptance criteria stand below) · **planned** (decided, not started).
Commit hashes are this repository's; *running log* means the lifted log in
`design/DECISIONS.md`.

| # | Stage | State | Evidence |
|---|---|---|---|
| 0 | Step zero: the QA batch committed, `data/` gitignored | done 2026-08-20 | `.gitignore`: `packages/server/data/`, `data/`, `secret.txt`, `tokens.json`, `outbox.jsonl` |
| 1 | Toolchain: build, lint, CI, push (430, 434, 435) | done 2026-08-20 | `d5ac9bf`; `scripts/build-server.mjs`, `eslint.config.mjs`, `.github/workflows/ci.yml` |
| 2 | Server refactor — the `Persistence` seam, unit tests, review #1 | done 2026-08-20 | `034b9a3`; `packages/server/src/persistence.ts`; review #1's fixes `3ccc78a` |
| 3 | The nine security fixes, and security review #1 | done 2026-08-20 | `906ab30`, `3ccc78a`; the defect table below, every row verified 2026-09-07 |
| 4 | Staging live on Render, verified; deploy-on-green wired (476) | done 2026-08-20 | `288845a`; `scripts/verify-deploy.mjs`; `ci.yml`'s *deploy to Render, then verify* step; Q477 (a)/(b), Q478 |
| 5 | Schema version on the log envelope (480) and the golden-log test | done 2026-08-20 | `0803eff`, `9ac2793`; `packages/constitution/test/golden-log.test.ts` |
| 6 | Postgres backend, the importer with the hash oracle, CI over both stores; cut over and drilled on the live database, the disk deleted | done 2026-08-20 (cutover 23:30, disk gone 23:45) | `076d919`; `packages/server/src/pg-persistence.ts`, `copy-store.ts`, `tools.ts`; `docs/runbooks/postgres-cutover.md`; `ci.yml` *the server walk again, over Postgres*. Not built, by decision: projection tables and the `people` table — *Owed* below |
| 7 | `/healthz`, the request log, graceful SIGTERM, the two cutover switches | done 2026-08-20 | `1829889`; `docs/runbooks/deploy-health-shutdown.md`; `render.yaml` `healthCheckPath: /healthz` |
| 8 | Surface merge (Q418 (a)): one page, text proposals through the engine end to end, `design/STYLE.md` written, both references re-frozen | done 2026-08-21 | `aaf057b`, live as `7e81d30`; `design/session-view.html`, `design/STYLE.md` |
| 9 | Resend domain and deliverability (433) | done 2026-08-20 | DNS confirmed by query (DKIM at `resend._domainkey.mail.docs.vote`, SPF and MX at `send.mail.docs.vote`); the domain verified and the sandbox sender cleared by Ed (running log, 23:15); `config.ts:199` defaults the sender to `docs.vote <invitations@mail.docs.vote>`; OPERATING §1. The one real send to a non-Resend address the stage asked for happened — Ed's word, 2026-09-07 (Q1251), the date itself unrecorded |
| 10 | docs.vote live (481 (a)); security review #2 | live: done 2026-08-20; review #2: **deferred by Ed, 2026-09-07 (Q1252), until the product is more stable** | certificate issued, `www` and http 301, `npm run verify` 10/10 on the host; two source passes ran (`c8a732d`, 2026-08-20; the stranger's door, `083d95e`, 2026-08-21 — stored XSS at the public door, pinned by a server test) and `verify-deploy` checks headers, exposed paths and error leakage on every deploy. The post-deployment review the stage promised, and stage 19's targeted review of the seams changed since, wait together for a stable product |
| 11 | Backups and the restore drill; `repair-tail` for torn files | done 2026-08-20 | `8f9d56c`; `draft-tools drill` passed on the live database (2 documents, 16 entries, every hash identical); `docs/runbooks/backup-and-restore.md`; 499 (a) |
| 12 | Privacy, ToS, retention, erasure | **open** — drafted, parked | `docs/legal/PRIVACY.md` and `TERMS.md` (`2a70192`; placeholders marked, not in force, not linked from the product); Q500's eight decisions **parked by Ed, 2026-08-29, until go-live is actually scheduled** |
| 13 | Accessibility | **open** — not started; its plan document is owed when the stage is scheduled, in `design/MOBILE.md`'s shape — precedence declared, cite rather than restate, per-stage acceptance with file:line evidence (Ed, 2026-09-07, Q1255) | no audit has run; nothing in the tree names one (the four surface files carry 74 `aria-` attributes between them, `grep -c aria-`) |
| 14 | Performance, caching, stress tests | **open** — not started as a stage | the instruments exist: `soak-harness` (`packages/sim-harness/src/soak.ts`, 2026-08-27) and the alpha preset below; **load waits until behaviour is as expected** (Ed, 2026-08-26 — stage 19) |
| 15 | Documentation review — the gate is *somebody else can operate it* | **open** — the documents are right (first pass 2026-08-20, re-verified 2026-09-07), but the gate is literal (Ed, 2026-09-07, Q1254): it closes when an operator who is neither Ed nor a session follows a runbook cold to its end; on the go-live checklist | `752b41d`; `docs/OPERATING.md`, the three runbooks, `README.md` |
| 16 | Rollback, go-live checklist, soft launch | **open** — not started | the checklist below; built so far, the mail kill-switch `DRAFT_MAIL_OFF` (`config.ts:60`); no error reporting exists (OPERATING §4) |
| 17 | Mobile read + judge — `design/MOBILE.md` stages 0–4 | **planned** 2026-08-23 (655–673), not built | no `mobile-walk` in `scripts/` |
| 18 | PWA · push · offline — `design/MOBILE.md` stage 5 | **planned**, not built | as 17 |
| 19 | Supervised beta — the criterion below | **open** — in progress | built: the seat matrix (`scripts/seat-matrix.mjs`, 2026-08-27, plan-queue batch N), the copy freeze (`scripts/copy-check.mjs`, both goldens), promise-coverage (batch L, 2026-08-27, backlog entries 78–86); not yet: the fix batch sized from L, the scripted sittings |

The original plan put the surface merge at stage 2; it moved to 8 so that
three weeks of backend work needed no design QA and a staging service existed
by stage 4 — the argument, and why each piece of housekeeping sat where it
did, is in `design/DECISIONS.md` (*Why the housekeeping sits where it does*).

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


**Where stage 12 stands (2026-09-07).** Parts 1 and 2 are not built: no
`people` table and no `person_id` exist (`grep -r person_id
packages/server/src` finds nothing; the Postgres migrations create
`documents`, `document_log`, `engine_log`, `provisional`, `bridge_state`,
`tokens`, `stashes`, `outbox` and `schema_migrations`). Decision 436 adopted
them for the first schema and stage 6 deferred them as an event-shape change
with hash consequences for a supervised session; real logs have existed since
2026-08-20, so the *nearly free* window this section describes had closed.
**Ruled by Ed, 2026-09-07 (Q1253, decision 1253 below): clear the database,
split from now on.** No migration and no second erasure story: the alpha's
existing documents are wiped in a supervised session, the `people` split
lands as the schema every document is born into after it, and nothing in the
store ever carries the old shape. The wipe is run only on Ed's word at the
time. **Half (1) built 2026-09-08**: `PersonId` rows (`people.json` on disk,
the `people` table in Postgres, migration 5) hold every email, name and
picture; every event carries the id; a log below schema version 2 is skipped
at boot and named, never read; `draft-tools people` · `erase` · `wipe` are the
operator's verbs (`docs/OPERATING.md` §5), the wipe refusing without its full
flag and **not yet run**. The reasoning and the calls made: `design/DECISIONS.md`
(2026-09-08). Part 2 — redaction of free text at the projection — is not
built: rationales, application words and closing comments still ride events.
Part 3 is written into `docs/legal/PRIVACY.md` as a marked draft. Q500's eight
decisions are parked until go-live is scheduled.

## Stages 17 and 18 — the phone

Decided by Ed on 2026-08-23 (655–673) and not built. The plan, its
`mobile-walk` and the PWA · push · offline stage are `design/MOBILE.md`, which
wins on everything about narrow layout; nothing about it is restated here.

## Go-live checklist (stage 16)

CI green on the release SHA · migrations applied and projections matching ·
restore drill within 7 days · health checks green and error reporting
receiving a test event · `/api/dev/outbox` absent from the artifact and
`design/*.notes.md` unreachable · headers, cert, HSTS, redirect verified live ·
test mail to Gmail/Outlook/iCloud lands in the inbox and the link works
exactly once · privacy policy and ToS linked · `DRAFT_SECRET` in the platform
store, no `secret.txt` on disk · Render's Postgres backups enabled and one restore from them drilled (499a) · a
full walk on production with a throwaway address, then delete it and verify
the deletion · mail kill-switch and maintenance mode tested, then off · an
operator who is neither Ed nor a session follows one runbook cold to its end
(stage 15's gate, Q1254).

**Soft launch in three steps:** Ed alone with a real document for a week →
3–5 friends on one document with the logs watched daily → a Newspeak House
cohort. A named observation point after each.

## Security defects and review findings

Every row below was re-verified against the tree on 2026-09-07; the evidence
column is where to look. File:line references are to `packages/server/src`
unless another path is given.

### Stage 3 — the nine defects (found 2026-08-20, fixed in `906ab30` and `3ccc78a`)

| # | Defect, as found | State | Evidence |
|---|---|---|---|
| 1 | `GET /api/dev/outbox` unauthenticated, serving the last 30 magic links, 404ing only when `RESEND_API_KEY` was set | fixed — deleted from the production build, never flag-gated (437) | `scripts/build-server.mjs`: `dropLabels: ['DEV']`, `NEVER_IN_PROD` names `/api/dev/`; `ci.yml`'s boot smoke asserts the 404; `verify-deploy` check *"/api/dev/outbox is not in the artifact (437)"* |
| 2 | No `Secure` cookie flag, no HSTS, no http→https redirect | fixed | `server.ts:649` `httpsOn`; `:683` HSTS a year with `includeSubDomains`; `:1812` `; Secure` on every cookie; `verify-deploy` checks *HSTS a year* and *http is redirected, never served* |
| 3 | `ipOf()` read the socket only — one bucket for everybody behind the proxy; 3 of 8 routes limited | fixed, then fixed again on staging (below) | `server.ts:1754` reads `cf-connecting-ip`, else `x-forwarded-for` counted from the right by `DRAFT_PROXY_HOPS` (`config.ts:205`); `tooMany()` guards nine doors (`server.ts:915`–`1384`: slug, docs, pending, auth ×3, login, apply, stranger); `verify-deploy --limits` |
| 4 | Attribute-context XSS: `esc()` escaped only `&` and `<`; `avHtml` put a stored `picture` unescaped into `style="background-image:url(…)"`; `set-identity` validated nothing | fixed at the source and again at the sink | `design/setup.js:31` escapes `& < > " '`; `commands.ts` `validPicture` admits one emoji grapheme or a data-URI image and nothing else; `design/cards.js:470` re-tests the data-URI shape before it enters a style attribute |
| 5 | No input validation or length limits; unbounded strings written permanently into an append-only log | fixed | `commands.ts:43` `LIMITS`; `cap()` on every string a command accepts |
| 6 | CSRF rested on `SameSite=Lax` alone; `readJson` never checked Content-Type; the magic-link routes were state-changing GETs that scanners would burn | fixed | Origin check on every auth POST, `server.ts:673`; `application/json` required, `:1707`; the magic-link GET serves an interstitial that POSTs the token, and the POST is what consumes it, `:1016`–`1033` |
| 7 | Applicants received the full member read, every member's email included | fixed | `server.ts:1435`–`1456`: an applicant is served their own application and the document's face, the text following 🌍 |
| 8 | `POST /apply` wrote to the log while unauthenticated | fixed | `server.ts:1130`–`1137`: the door writes nothing; the write moved to `POST /auth/apply`, after the address has proved it works |
| 9 | Non-constant-time HMAC compare; internal error strings returned; no security headers, CSP included; no fail-fast config validation | fixed | `auth.ts:81` `timingSafeEqual`; `server.ts:643` answers 500 with *something went wrong* and logs the rest; `:679`–`:680` `referrer-policy` and `content-security-policy`; the production artifact refuses to boot half-configured, naming every missing variable (OPERATING §2) |

### Found on staging (stage 4, 2026-08-20) — both fixed the same day

| Defect | Evidence |
|---|---|
| The rate limiter never limited: it keyed on the rightmost `x-forwarded-for` entry, which behind Cloudflare is a rotating edge address | `288845a`; three tests pin one bucket per stated client, two clients two buckets, a prepended entry failing to evade; `verify-deploy --limits` |
| The whole of `design/tools/` and `design/reference/` was public (Q478) | top-level assets only, no path separator survives; `verify-deploy` check *design assets serve, design notes do not* |

### Review #1 (stages 2–3; 19 findings, 14 fixed in `3ccc78a`) — the residuals

| Finding | State | Evidence |
|---|---|---|
| 6a — the bridge emitted the motion before the engine accepted the candidate | fixed 2026-08-20, stage 5, by a compensating event rather than a reorder | `9ac2793` |
| 13 — one cookie for all documents | fixed 2026-08-21, stage 8 | `server.ts:1811` `cookieName(docId)` — `draft_session_<docId>` |
| 15 — mail failure was silent: a transient Resend failure lost an invitation the log said was sent | fixed 2026-08-23: the outbox table and sender loop; since 2026-08-29 a give-up is reported to the founder as 📭 | `packages/server/src/outbox.ts` (`d102cac`); the `outbox` migration, `pg-persistence.ts:113`; `mail-give-up.test.ts` (`b319c55`); SURFACE E34 |
| 19 — emoji reservation and one-face-one-member were client-side only | fixed 2026-08-21, stage 8 | `packages/server/src/faces.ts` |
| 11, second half — a torn log tail had no repair | fixed 2026-08-20, stage 11 | `draft-tools repair-tail`, `tools.ts:99`; `docs/runbooks/backup-and-restore.md` |
| An applicant who lost their cookie was locked out | fixed 2026-08-20 (Ed: (a)) — the apply door re-sends the verification mail for an application already underway | `server.ts:1157`–`1170` |

### Review #2 (2026-08-20, `c8a732d`; 16 findings, 14 fixed) — recorded, not fixed

- The copier takes no lock on its destination — documented instead: never run it against the live store (`docs/runbooks/postgres-cutover.md`).
- Migrations carry no checksum.
- `documents.created_at` is import time, not birth time.

### Owed by a later session (the run's close, 2026-08-20 23:03) — where each stands

| Item | State |
|---|---|
| The mail outbox and sender loop (finding 15) | done — above |
| Projection tables (stage 6's plan: members, settings, motions, applications, slugs, rebuildable from the log, a CI test asserting rebuild == live) | not built, by decision: the server replays into memory and reads nothing from them; build them when a consumer appears |
| `person_id` / `people` (436) | **built 2026-09-08, half (1)** — the schema and the module; the wipe (the other half of decision 1253) is written and pending Ed's word; stage 12's state note above |
| Review #2's second pass on the surface | done 2026-08-21 (the stranger's door); the next is stage 19's targeted review of the command whitelist, cookie auth, the poll/re-render path and `PgPersistence` |
| The sim-harness sweep baseline (`hotSetSize` 6 against an engine default of 3) | fixed 2026-08-27 with the alpha preset, below |

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
| 436 | PII behind a `person_id` in a deletable `people` table **from the first schema** — nearly free now, structurally impossible later (see stage 12). | adopted on recommendation; how it lands after the window closed is 1253; **built 2026-09-08, half (1)** |
| 1253 | **Clear the database, split from now on.** The alpha's documents are wiped rather than migrated; the `people` split is the schema every document is born into afterwards, so there is one erasure story and no hash migration. The wipe runs only on Ed's word at the time. | decided by Ed 2026-09-07; **half (1) built 2026-09-08** — the schema, the module, the tool verbs; **the wipe is written and pending Ed's word** |
| 476 | **Auto-deploy on green during alpha**: CI deploys and then verifies the live environment, failing the build if what came back is wrong. | decided 2026-08-20 |
| 480 | Schema version **on the log envelope**, outside the hash; absent means 1, read through `versionOf`. Both logs carry their own number. | decided 2026-08-20 |
| 437 | `/api/dev/outbox` **deleted from the production build**, not flag-gated — half the defect is that the app can boot into a dangerous mode. | adopted on recommendation |
| 498 | **Retire the persistent disk after the Postgres cutover** (b): the service becomes stateless apart from Postgres, Render can start the new instance before stopping the old, and the file layout survives only as the backup/export format. Sequence: cutover → drill passes → a final export kept off the disk → remove the disk in the blueprint and the dashboard. **Done 2026-08-20 23:40.** | decided 2026-08-20 |
| 499 | **Off-site backups are Render's managed Postgres backups** (a); nothing further is automated. Consequence accepted: disk, database and backup share one provider account. | decided 2026-08-20 |
| 473 | The domain: `docs.vote` on Namecheap's nameservers, apex and `www` CNAMEs to the Render hostname; the sending domain is the subdomain, since a CNAME apex can hold no TXT | answered 2026-08-20 |
| 477 | Staging's two truths, confirmed by Ed by hand: a document survives a redeploy (a); a magic link works exactly once (b) | confirmed 2026-08-20 |
| 481 | **One service, the alpha home** (a); the second, production service arrives at the point there is something to lose | decided 2026-08-20 |
| 482 | The operator-notification address stays compiled in (a); `DRAFT_NOTIFY_EMAIL` overrides, empty switches it off; a build that *requires* the variable returns as a question when there are two services | decided 2026-08-29 (Ed: *keep the in-code default as it is*) |
| 491 | **Push freely** during the overnight run of 2026-08-20 (b): each stage deployed as it landed, CI the gate — a reversal of *no pushes without Ed's say-so* **for that run only** | decided 2026-08-20 |
| 492 | The run's order: **7 → 6 → 11 → 15 → 12-drafts**, then whatever of 9 was reachable; 8, 13 and 16 not that night | decided 2026-08-20 |
| 493 | **Ed provisions the Render Postgres**: version 17, frankfurt, `DATABASE_URL` from the *internal* connection string; not a free tier, since an expired database holding somebody's constitution is a data-loss event with a calendar for a trigger | decided 2026-08-20, done the same night |
| 494 | Subagents allowed on the run, on file sets disjoint from the main line's; the main line reviews every diff and makes every commit | decided 2026-08-20 |
| 495 | **Placeholders are fine** in the privacy and ToS drafts — drafts for Ed's review, never legal advice, every placeholder visibly marked | decided 2026-08-20 |
| 496 | The second session parked for the run, so nothing else wrote to the repository that night | decided 2026-08-20 |
| 497 | The Resend DNS done, confirmed by query from here | confirmed 2026-08-20 |
| 500 | The legal drafts' eight decisions | **parked by Ed, 2026-08-29, until go-live is actually scheduled** — all eight, so nothing on stage 12 is owed until there is a date |

## Measurements

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
| the cooldown | **none** — the host default since 2026-09-05 (R-086); `DRAFT_COOLDOWN_MS=60000` was the intended alpha value but was never set on the host, which paced at the engine's five minutes until then | **not a setting** — §4.2 engine tuning, an operator env knob since entry 77 |

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


## History

The overnight mandate of 2026-08-20 and its running log, stage 8's log, the
design-day backlog, the hosting and domain notes and the stage write-ups as
they stood on 2026-09-07 are in `design/DECISIONS.md` § *PRODUCTION.md, the
history lifted 2026-09-07*, verbatim. Two rules from the mandate still bind
operating the service and live in the runbooks: **no JSONL log is ever
deleted**, and **never relax the hash oracle**.
