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

## Where it stands (2026-09-26)

**Since the 2026-09-22 paragraph below.** The P1 batch Ed ruled that day shipped, and the open GitHub issues stand at **43, 3 of them P1** (#86 the operator docs, #67 links spent by previews, #10 the bot key's reach) — all three **after the redesign**, by Ed's word of 2026-09-26. The demo document (`docs.vote/d/demo`, `design/DEMO.md`) is live, stages 1–5. The **surface redesign** (Q1541, `design/redesign/BUILD.md`) is the main line of work — *full speed ahead* (Ed, 2026-09-26): stages 0–2 are live at `0e2039e5` (deploy-2026-09-26e), stage 3a is building. Stage 19's supervised sittings wait for it: **the next human rooms sit after redesign stage 10** (Ed, 2026-09-26). How changes ship changed the same day: **the eight gates alone before a push** (Q1545), the walks on CI after it, and a **sprint tier that runs on every push carrying a merge**, holding the guards the 2026-09-26 audit found had caught nothing in four weeks (Q1546, Q1547) — CLAUDE.md's CI bullet is the rule.

**As it stood on 2026-09-22.** docs.vote has served the product since 2026-08-20 — one Render service, the
alpha home (481 (a)), from Postgres since 23:30 that night with no disk
(498 (b)), mail from `mail.docs.vote` via Resend, the operator mailed at every
birth. CI deploys on green and verifies the live host afterwards, so **a push
to `main` is a deploy** (476). **The first real room sat on 2026-09-20**: the
Newspeak House convention, `docs.vote/d/nh2026`, twelve members with Ed as
Founder, on 5929a6e; it closed itself at 17:10 and raised Q1477–Q1493, every
one built, folded and **live at e31ce168 since 2026-09-22 18:45** (the batch's
notes are in `design/DECISIONS.md`). Stages 0–11 are done; 15 has had three
passes, the third on 2026-09-17; 12 is drafted and parked; 13 is not started
as a stage but has been **measured** (`design/REPORT-a11y.md`, 2026-09-16) and
its three plain defects are owed by the next batch (Ed, 2026-09-22); 14 is
parked, measured twice for concurrency and never for replay; 16 is not
started; **17's first cut is live** — a one-column phone layout since
2026-09-12, well short of what `design/MOBILE.md` asks for — and 18 is not
started; 19 is in progress, the convention counting as its first sitting, and
its fix batch is now the **62 open GitHub issues** (23 P1) and Q1494–Q1499,
the P1s to be ruled one at a time before any is built (Ed, 2026-09-22).

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
| 6 | Postgres backend, the importer with the hash oracle, CI over both stores; cut over and drilled on the live database, the disk deleted | done 2026-08-20 (cutover 23:30, disk gone 23:45) | `076d919`; `packages/server/src/pg-persistence.ts`, `copy-store.ts`, `tools.ts`; `docs/runbooks/postgres-cutover.md`; `ci.yml` *the server walk again, over Postgres*. Not built, by decision: the **projection tables** — *Owed* below. The `people` table was not built at this stage and is not owed by it: it arrived with decision 1253 as migration 5 on 2026-09-08 (`pg-persistence.ts`'s `MIGRATIONS`; stage 12 below) |
| 7 | `/healthz`, the request log, graceful SIGTERM, the two cutover switches | done 2026-08-20 | `1829889`; `docs/runbooks/deploy-health-shutdown.md`; `render.yaml` `healthCheckPath: /healthz` |
| 8 | Surface merge (Q418 (a)): one page, text proposals through the engine end to end, `design/STYLE.md` written, both references re-frozen | done 2026-08-21 | `aaf057b`, live as `7e81d30`; `design/session-view.html`, `design/STYLE.md` |
| 9 | Resend domain and deliverability (433) | done 2026-08-20 | DNS confirmed by query (DKIM at `resend._domainkey.mail.docs.vote`, SPF and MX at `send.mail.docs.vote`); the domain verified and the sandbox sender cleared by Ed (running log, 23:15); `config.ts`'s `mailFrom` defaults the sender to `docs.vote <invitations@mail.docs.vote>`; OPERATING §1. The one real send to a non-Resend address the stage asked for happened — Ed's word, 2026-09-07 (Q1251), the date itself unrecorded |
| 10 | docs.vote live (481 (a)); security review #2 | live: done 2026-08-20; review #2: **deferred by Ed, 2026-09-07 (Q1252), until the product is more stable** | certificate issued, `www` and http 301, `npm run verify` 10/10 on the host; two source passes ran (`c8a732d`, 2026-08-20; the stranger's door, `083d95e`, 2026-08-21 — stored XSS at the public door, pinned by a server test) and `verify-deploy` checks headers, exposed paths and error leakage on every deploy. The post-deployment review the stage promised, and stage 19's targeted review of the seams changed since, wait together for a stable product |
| 11 | Backups and the restore drill; `repair-tail` for torn files | done 2026-08-20 | `8f9d56c`; `draft-tools drill` passed on the live database (2 documents, 16 entries, every hash identical); `docs/runbooks/backup-and-restore.md`; 499 (a) |
| 12 | Privacy, ToS, retention, erasure | **open** — drafted, parked | `docs/legal/PRIVACY.md` and `TERMS.md` (`2a70192`; placeholders marked, not in force, not linked from the product); Q500's eight decisions **parked by Ed, 2026-08-29, until go-live is actually scheduled** |
| 13 | Accessibility | **open** — not started as a stage, but **measured 2026-09-16**: the first audit ran and raised Q1394–Q1398, nothing on the surface changed. **Ruled by Ed, 2026-09-22: the three plain defects are ordinary fixes and join the next batch** — the missing `<html>` element and its language (Q1394), focus that stays on the card after an act (Q1397), and a distinct accessible name for each of a judgment's two wordings (Q1395); Q1396 and Q1398 wait for the stage. Its plan document is still owed when the stage is scheduled, in `design/MOBILE.md`'s shape — precedence declared, cite rather than restate, per-stage acceptance with file:line evidence (Ed, 2026-09-07, Q1255) — and now has an evidence base to be built on | `design/REPORT-a11y.md` (44 findings at 1600×1000, 50 at 390×844, four confirmed by two independent instruments); `design/tools/a11y-audit.mjs`, `npm run a11y-audit`. The worst row is the judgment lanes: 79 sightings on 27 cards where two rival wordings share one accessible name and sit in no group. Beside it, driven rather than read: **every act drops the keyboard at the top of the page** — opening a card and committing a judgment both leave focus on `<body>`, 6 of 6. The only Level-A failure is that the page has no `<html>` element, so it declares no language |
| 14 | Performance, caching, stress tests | **open** — not started as a stage; **measured twice for concurrency** (the two moon rooms under *Measurements*: the knee is about 140 acting bots on the Render starter) and **for replay on 2026-09-23** (plan-scaling.md Stage 0, *Measurements*: boot, memory and CPU all fail between about 200 and 300 documents on the starter), which stage 19's rules name as the real scaling risk — and which bit on 2026-09-19, when a bot room's replay outgrew Render's health-check window, the instance died, and the third wipe was run with the host down (decision 1253). **Left parked by Ed, 2026-09-22**: the replay curve and a boot guard wait for the stage; issue #70 (`/healthz` reports no memory, boot time or document size) is the operator's half of the same gap | the instruments exist: `soak-harness` (`packages/sim-harness/src/soak.ts`, 2026-08-27) and the alpha preset below; **load waits until behaviour is as expected** (Ed, 2026-08-26 — stage 19) |
| 15 | Documentation review — the gate is *somebody else can operate it* | **open** — three passes (2026-08-20, 2026-09-07, and **2026-09-17**, issue #15, which found the `DRAFT_STORE` row telling an operator to boot production on the ephemeral store, two stale counts, both CI job lists short, the documents-only lane described as a glob it is not, and every restart procedure silent about the pause and about the surface a restart drops). The gate is literal (Ed, 2026-09-07, Q1254): it closes when an operator who is neither Ed nor a session follows a runbook cold to its end; on the go-live checklist. **The convention the third pass adopted** (Ed, 2026-09-17): evidence points at a file and a symbol, never a line number | `752b41d`; `docs/OPERATING.md`, the four runbooks, `README.md` |
| 16 | Rollback, go-live checklist, soft launch | **open** — not started | the checklist below; built so far, the mail kill-switch `DRAFT_MAIL_OFF` (`config.ts`'s `mailOff`; OPERATING §2) and the **announced pause** the deploy already uses as a maintenance mode (`write-path.ts`'s `PauseState`, Q1345); the **error log in the store** since 2026-09-22 (migration 6, `errorLogContract`; the page's own uncaught errors posted to `POST /api/page-error`; OPERATING §11) — nobody is *told*, and **Ed ruled 2026-09-22 that the log is enough, read within a day of every room and weekly besides** (`docs/runbooks/demo-day.md` § *Afterwards*), so the checklist asks for the log and its reading, not for an alert |
| 17 | Mobile read + judge — `design/MOBILE.md` stages 0–4 | **open** — planned 2026-08-23 (655–673); a **first cut is live since 2026-09-12** (`b95e44b`, `435b8fe`), read + judge on one column with both rails as drawers, and the stage's own plan is what is still owed | `design/MOBILE.md` § *Status — the first cut, 2026-09-12* and the two passes after it (Q1350–Q1351, Q1387–Q1388), which list what is built and what is not; guards `npm run card-audit:narrow` and `npm run drawer-walk` (CI's `probe` job). **Not built**: the two-tap confirm, the tap targets, the pinned/flow split, and `mobile-walk` — there is still no such script in `scripts/` |
| 18 | PWA · push · offline — `design/MOBILE.md` stage 5 | **planned**, not built | no service worker, manifest, VAPID or push anywhere; notification is email only (`design/MOBILE.md` § *Server*) |
| 19 | Supervised beta — the criterion below | **open** — in progress | built: the seat matrix (`scripts/seat-matrix.mjs`, 2026-08-27, plan-queue batch N), the copy freeze (`scripts/copy-check.mjs`, both goldens), promise-coverage (batch L, 2026-08-27, backlog entries 78–86); not yet: the fix batch sized from L, the scripted sittings. **Issues #2–#28** — an automated review of the tree (2026-09-16), read and ruled by Ed one at a time on the afternoon of 2026-09-17 — is the fix batch that arrived instead of L's: merged that afternoon, #2 · #3 · #4 · #5 · #7 · #9 · #13 · #14's tuning half · #20 · #24 · #26 and the Q1412 group; built beside them, #6's invitation race · #8 · #11 · #12 · #15 (this file and `docs/OPERATING.md`) · #18 · #21; scheduled rather than built, #10 · #23 · #28 after the weekend, #17 behind #8's `ci.yml`, and #14's withdrawal half and #27 as spec-pass work — of which **only #17 has landed** (`ff1fdbab`, `49e535ff`). Each issue's own commit says what it changed. **The first sitting was the nh2026 convention of 2026-09-20** (twelve members, Ed the Founder, free play; it counts — Ed, 2026-09-22), and it produced findings of the criterion's own class (Q1483, Q1486 among them), so **two clean sittings are owed from here**; its seventeen questions are built and live at e31ce168. **The fix batch now** (Ed, 2026-09-22): the **62 open GitHub issues** — 36 filed 2026-09-19 (#29–#74, the user-flow exercise and its adviser panel, Q1479), 20 on 2026-09-20 (#75–#94), 6 older; 23 P1, 30 P2, 8 P3, 14 carrying a question, 17 marked spec-drift — and Q1494–Q1499 from the convention batch. **The 23 P1s were ruled one at a time on the evening of 2026-09-22**: #69 and #68 closed as built on 2026-09-19 (#68's residual refiled as #95, P3), #77 closed as fixed by Q1483, and **twenty ruled build** — the GitHub milestone *P1 batch, ruled 2026-09-22*, each issue commented with its ruling; the contract is `design/spec-pass/plan-p1-batch.md` (deleted at the fold, as the convention plan was). Two rulings narrowed an issue: #88 builds the page fix and no module refusal; #86's runbook waits for the batch. One widened: #76's Begin task lists the members whose answers are still due. P2 and P3 wait; the three plain accessibility defects (stage 13) and Q1498 ride with the batch |

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

- **Sittings are scripted where possible** (amended by Ed, 2026-09-22; the
  rule read *scripted, not free-play* until then). Each tester gets a role
  and a numbered sequence drawn from the matrix; the observer logs every
  finding against a cell. A finding then says something about one cell and
  silence says something about the rest — free play only ever reports the
  cells the tester wandered into. **But a real room supervised by Ed is a
  sitting whether or not it was scripted**: the nh2026 convention of
  2026-09-20 was free play and is sitting one, with a red result. Findings go
  to QUESTIONS.md as numbered items or to the repository's issues.
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
   *[redacted]*). Stronger option: per-member encryption of free text,
   delete the key.
3. **Be honest in advance about the remainder.** Unattributed judgments cannot
   be withdrawn — they were inputs to a collective decision others relied on.
   The privacy policy says so before anyone joins: *erasure removes your
   identity, your contact details and anything you wrote, from every view and
   every published record; your judgments, which were never attributed to you,
   remain, because the group's decision was made with them.*


**Where stage 12 stands.** *As of 2026-09-07*, parts 1 and 2 were not built:
there was no `people` table and no `person_id` (the Postgres migrations then
created `documents`, `document_log`, `engine_log`, `provisional`,
`bridge_state`, `tokens`, `stashes`, `outbox` and `schema_migrations` and
nothing else). Part 1 landed the next day and the rest of this paragraph
says so. Decision 436 adopted
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
flag and **run by Ed on 2026-09-08** from the service's Render shell
(`docs/runbooks/wipe.md`). The reasoning and the calls made: `design/DECISIONS.md`
(2026-09-08). Two residuals ruled the same day (Q1287): erasure on a running
server is *erase, then restart* until go-live is scheduled, and the operator
route that does both in one act is owed then; the erased person stands as
*[redacted]* (STYLE T49). Part 2 — redaction of free text at the projection — is not
built: rationales, application words and closing comments still ride events.
Part 3 is written into `docs/legal/PRIVACY.md` as a marked draft. Q500's eight
decisions are parked until go-live is scheduled. **A ninth joined them on
2026-09-22**: the error log is permanent now — in the store since migration 6,
where it had lived on the ephemeral disk and been deleted by every deploy —
so it needs a retention period, which `PRIVACY.md` carries as a placeholder;
the wipe clears it with everything else (`docs/OPERATING.md` §11). Parked
with the eight, on the same condition.

## Stages 17 and 18 — the phone

Decided by Ed on 2026-08-23 (655–673). The plan, its `mobile-walk` and the
PWA · push · offline stage are `design/MOBILE.md`, which wins on everything
about narrow layout; nothing about it is restated here — **including what is
built**, since a first cut of stage 17 went live on 2026-09-12 and that
document's *Status* section, with the two passes after it, is the record of
what it does and does not do. Stage 18 is untouched.

## Go-live checklist (stage 16)

CI green on the release SHA · migrations applied ·
restore drill within 7 days · health checks green and **the error log in the
store, its tail readable by the operator's tool, and read within a day of
every room and weekly besides** (Ed, 2026-09-22: *the log is enough* — the
item read *error reporting receiving a test event* until then, and no alert
is built or owed; the reading is `docs/runbooks/demo-day.md` § *Afterwards*
and OPERATING §11) · `/api/dev/outbox` absent from the artifact and
`design/*.notes.md` unreachable · headers, cert, HSTS, redirect verified live ·
test mail to Gmail/Outlook/iCloud lands in the inbox and the link works
exactly once · privacy policy and ToS linked · `DRAFT_SECRET` in the platform
store, no `secret.txt` on disk · Render's Postgres backups enabled and one restore from them drilled (499a) · a
full walk on production with a throwaway address, then delete it and verify
the deletion · mail kill-switch and maintenance mode tested, then off · an
operator who is neither Ed nor a session follows one runbook cold to its end
(stage 15's gate, Q1254).

**Struck from this gate on 2026-09-17** (Ed, issue #15): *and projections
matching*, which stood beside *migrations applied*. The projection tables
are **not built, by decision** — the server replays into memory and reads
nothing from them (*Owed by a later session*, below) — so the clause named
something that does not exist and no release could ever have satisfied it.
Nothing replaces it: a new clause would be a new gate, and that is Ed's to
write.

**The soft launch, as it happened** (Ed, 2026-09-22, replacing the three
steps this paragraph held — *Ed alone for a week → 3–5 friends → a Newspeak
House cohort*, each with an observation point): the cohort came first. A
Newspeak House convention of twelve sat on docs.vote on 2026-09-20, in alpha,
before the checklist above and before any friends-only room; its findings are
stage 19's first sitting. There is no dated sequence any more. **Go-live is
the day the second, production service is stood up** (481), on this
checklist, and the observation points are stage 19's sittings.

## Security defects and review findings

Every row below was re-verified against the tree on 2026-09-07 and its
evidence re-pointed on **2026-09-17** (issue #15); the evidence column is
where to look. **A cell names a file and a symbol, never a line number**
(Ed, 2026-09-17): every line number this table carried was dead, most of
them killed by the Q1352 route split, which took `server.ts` from some two
thousand lines to three hundred and moved the rest into `routes-*.ts` — a
cell citing `server.ts:1812` was pointing past the end of the file it named.
Paths are under `packages/server/src` unless another is given.

### Stage 3 — the nine defects (found 2026-08-20, fixed in `906ab30` and `3ccc78a`)

| # | Defect, as found | State | Evidence |
|---|---|---|---|
| 1 | `GET /api/dev/outbox` unauthenticated, serving the last 30 magic links, 404ing only when `RESEND_API_KEY` was set | fixed — deleted from the production build, never flag-gated (437) | `scripts/build-server.mjs`: `dropLabels: ['DEV']`, `NEVER_IN_PROD` names `/api/dev/`; `ci.yml`'s boot smoke asserts the 404; `verify-deploy` check *"/api/dev/outbox is not in the artifact (437)"* |
| 2 | No `Secure` cookie flag, no HSTS, no http→https redirect | fixed | `server.ts`'s `httpsOn` and the header block in `route()` — `strict-transport-security` a year with `includeSubDomains`, and the 301 on an `x-forwarded-proto: http`; `routes.ts`'s `setCookie` puts `; Secure` on every cookie; `verify-deploy` checks *HSTS a year* and *http is redirected, never served* |
| 3 | `ipOf()` read the socket only — one bucket for everybody behind the proxy; 3 of 8 routes limited | fixed, then fixed again on staging (below) | `routes.ts`'s `ipOf` reads `cf-connecting-ip`, else `x-forwarded-for` counted from the right by `DRAFT_PROXY_HOPS` (`config.ts`'s `proxyHops`); `routes.ts`'s `tooMany` guards nine doors — slug, docs, pending, auth ×3, login, apply, stranger, now in `routes-auth.ts` and `routes-member.ts` since Q1352 — and a tenth bucket refuses wrong keys at the bot outbox; `grep -rn "tooMany(" packages/server/src` is the list of record. `verify-deploy --limits` |
| 4 | Attribute-context XSS: `esc()` escaped only `&` and `<`; `avHtml` put a stored `picture` unescaped into `style="background-image:url(…)"`; `set-identity` validated nothing | fixed at the source and again at the sink | `design/cards.js`'s `esc` is the one five-character escape — `& < > " '`, coercing — and `design/setup.js` takes it as `window.CARDS.esc` rather than keeping a second; `commands.ts`'s `validPicture` admits one emoji grapheme or a data-URI image and nothing else; `design/cards.js`'s `avHtml` re-tests the data-URI shape before it enters a `style` attribute |
| 5 | No input validation or length limits; unbounded strings written permanently into an append-only log | fixed | `commands.ts`'s `LIMITS`; `cap()` and `capValue()` on every string a command accepts |
| 6 | CSRF rested on `SameSite=Lax` alone; `readJson` never checked Content-Type; the magic-link routes were state-changing GETs that scanners would burn | fixed | Origin check on every auth POST, in `server.ts`'s `route()` against `baseOrigin`; `application/json` required by `routes.ts`'s `readJson`, **on the MIME essence rather than a substring since issue #20**; the magic-link GET serves `routes-auth.ts`'s `interstitial`, and the POST it makes is what consumes the token |
| 7 | Applicants received the full member read, every member's email included | fixed | `routes-member.ts`'s view route, applicant branch (Q1281): an applicant is served `views.ts`'s `strangerView` — the document's face, the text following 🌍 — plus their own application row and nothing else |
| 8 | `POST /apply` wrote to the log while unauthenticated | fixed | `routes-auth.ts`, `POST /api/d/:slug/apply`: the door writes nothing to the log; the write moved to `POST /auth/apply`, after the address has proved it works |
| 9 | Non-constant-time HMAC compare; internal error strings returned; no security headers, CSP included; no fail-fast config validation | fixed | `auth.ts` compares with `timingSafeEqual`, and so does `routes.ts`'s bearer check; `server.ts`'s error handler answers 500 with *something went wrong* and logs the rest; its header block sets `referrer-policy: no-referrer` and the three `content-security-policy` directives; the production artifact refuses to boot half-configured, naming every missing variable (OPERATING §2) |

### Found on staging (stage 4, 2026-08-20) — both fixed the same day

| Defect | Evidence |
|---|---|
| The rate limiter never limited: it keyed on the rightmost `x-forwarded-for` entry, which behind Cloudflare is a rotating edge address | `288845a`; three tests pin one bucket per stated client, two clients two buckets, a prepended entry failing to evade; `verify-deploy --limits` |
| The whole of `design/tools/` and `design/reference/` was public (Q478) | top-level assets only, no path separator survives; `verify-deploy` check *design assets serve, design notes do not* |

### Issue #10 — the host's own key (Ed, 2026-09-22, option 1)

| Surface | What it exposes | Guard | Evidence |
|---|---|---|---|
| `POST /api/admin/pause`, `/resume`, `/surface`, in the production artifact | **The host itself**: a re-POSTed pause freezes every room for as long as somebody keeps asking, and the surface route installs and serves whatever page it is sent — every open member page reloads into it within 4 s, acting as each member and defeating blindness. They rode `DRAFT_BOT_KEY` (Q1345, Q1347), a key typed on command lines and declared on the public dev host, while every document called its leak bots-only | `DRAFT_ADMIN_KEY` as `Authorization: Bearer`, the same timing-safe compare and wrong-key limiter; unset, the three are 404s. Held in production's dashboard and CI's secret alone — never on draft-dev, never in a room-bots user's hands; **both keys rotated by Ed at the deploy that splits them** | `routes-admin.ts` (`bearerRefused(ctx.cfg.adminKey)`); `pause.test.ts` *refuses the bot key on pause and resume, and the admin key at the bot outbox*; `surface.test.ts` *the surface takes the admin key and no other*; `verify-deploy` *the bot key cannot replace the page (issue #10)*; OPERATING §2, §3, §10 |

### Q1310 — the bot outbox route (Ed, 2026-09-10) — a keyed door that ships by design

| Surface | What it exposes | Guard | Evidence |
|---|---|---|---|
| `GET /api/bots/outbox`, in the production artifact and outside the `DEV:` label | The host's filed mail to `*@bots.docs.vote` only — the mailer files nothing else there and hands none of it to Resend — so a key in the wrong hands acts as the bots in bot rooms and nothing more. Accepted by Ed: *we can have bot users in prod — we're still in alpha* | `DRAFT_BOT_KEY` as `Authorization: Bearer`, compared with `timingSafeEqual`; unset, the route is a 404 with an unknown path's body; wrong keys rate-limited per IP (`tooMany('bots')`), right ones never; 401 carries no detail; rotated by changing the variable | `routes.ts`'s `bearerOk` and `bearerRefused`, and `routes-admin.ts`'s `GET /api/bots/outbox` — the guard the pause and the surface reload sat behind until issue #10 moved them to `DRAFT_ADMIN_KEY` (below), which is what makes *nothing more* true; `bots.test.ts` (404 without a key, 401 wrong or missing, 200 right, the domain rule exact against `bots.docs.vote.evil.com` and `notbots.docs.vote`); `verify-deploy` check *the bot outbox is closed to a stranger (Q1310)*; OPERATING §10 |

### Review #1 (stages 2–3; 19 findings, 14 fixed in `3ccc78a`) — the residuals

| Finding | State | Evidence |
|---|---|---|
| 6a — the bridge emitted the motion before the engine accepted the candidate | fixed 2026-08-20, stage 5, by a compensating event rather than a reorder | `9ac2793` |
| 13 — one cookie for all documents | fixed 2026-08-21, stage 8 | `routes.ts`'s `cookieName(docId)` — `draft_session_<docId>` |
| 15 — mail failure was silent: a transient Resend failure lost an invitation the log said was sent | fixed 2026-08-23: the outbox table and sender loop; since 2026-08-29 a give-up is reported to the founder as 📭 | `packages/server/src/outbox.ts` (`d102cac`); migration 4, `outbox`, in `pg-persistence.ts`'s `MIGRATIONS`; `mail-give-up.test.ts` (`b319c55`); SURFACE E34 |
| 19 — emoji reservation and one-face-one-member were client-side only | fixed 2026-08-21, stage 8 | `packages/server/src/faces.ts` |
| 11, second half — a torn log tail had no repair | fixed 2026-08-20, stage 11 | `draft-tools repair-tail`, the `'repair-tail'` case in `tools.ts`; `docs/runbooks/backup-and-restore.md` |
| An applicant who lost their cookie was locked out | fixed 2026-08-20 (Ed: (a)) — the apply door re-sends the verification mail for an application already underway | `routes-auth.ts`, the `underway` branch of `POST /api/d/:slug/apply` (Q439 (a)) |

### Review #2 (2026-08-20, `c8a732d`; 16 findings, 14 fixed) — recorded, not fixed

- The copier takes no lock on its destination — documented instead: never run it against the live store (`docs/runbooks/postgres-cutover.md`).
- Migrations carry no checksum.
- `documents.created_at` is import time, not birth time.

### Owed by a later session (the run's close, 2026-08-20 23:03) — where each stands

| Item | State |
|---|---|
| The mail outbox and sender loop (finding 15) | done — above |
| Projection tables (stage 6's plan: members, settings, motions, applications, slugs, rebuildable from the log, a CI test asserting rebuild == live) | not built, by decision: the server replays into memory and reads nothing from them; build them when a consumer appears |
| `person_id` / `people` (436) | **built 2026-09-08, both halves** — the schema and the module deployed at 3feb77b; the wipe run by Ed the same evening from the service's Render shell, 25 alpha documents deleted, the store never holding the old shape again; stage 12's state note above |
| Review #2's second pass on the surface | done 2026-08-21 (the stranger's door); the next is stage 19's targeted review of the command whitelist, cookie auth, the poll/re-render path and `PgPersistence` |
| The sim-harness sweep baseline (`hotSetSize` 6 against an engine default of 3) | fixed 2026-08-27 with the alpha preset, below |

## Decisions

| # | Decision | State |
|---|---|---|
| — | Persistence: Postgres, **hybrid** — the hash-chained log as rows, source of truth; projection tables derived and rebuildable. SPEC §11 replay survives. | decided |
| — | First users: Ed + a few friends. Abuse/Sybil/moderation are not launch blockers; correctness, data safety, deliverability and the security fixes are. | decided |
| — | Public reads at launch (🌍 offers them). **Built**: the stranger's door, 2026-08-21 — a seatless `GET /api/d/:slug/view` served by `views.ts`'s `strangerView` when the request carries no live seat, rate-limited per IP, showing what 🌍 allows and nothing more; the page's half is `design/door.js`. | decided; the read path exists |
| — | Deploy: GitHub → hosting; mail via Resend; domain docs.vote. | decided |
| 418 | Surface merge: **(a)** — one file, fixture only for states the server cannot yet produce; engine wiring for text proposals in the same pass; STYLE.md during; residuals 13 and 19 ride along. | decided 2026-08-21 |
| 430 | Push to the public GitHub repo. | decided 2026-08-20 |
| 431 | The first unsupervised run is stages 1–3. | decided 2026-08-20 |
| 432 | Hosting: **Render**. | decided 2026-08-20 |
| 433 | Sending domain: **mail.docs.vote**. | decided 2026-08-20 |
| 434 | ESLint only, **no Prettier** — it would reflow ten thousand lines of hand-wrapped prose comments and destroy the authorial voice. | adopted on recommendation |
| 435 | Build: **esbuild bundle** (already pinned, 0.28.2) rather than tsc project references. | adopted on recommendation |
| 436 | PII behind a `person_id` in a deletable `people` table **from the first schema** — nearly free now, structurally impossible later (see stage 12). | adopted on recommendation; how it lands after the window closed is 1253; **built 2026-09-08, half (1)** |
| 1253 | **Clear the database, split from now on.** The alpha's documents are wiped rather than migrated; the `people` split is the schema every document is born into afterwards, so there is one erasure story and no hash migration. The wipe runs only on Ed's word at the time. | decided by Ed 2026-09-07; **half (1) built 2026-09-08** — the schema, the module, the tool verbs; **the wipe run by Ed on 2026-09-08** from the service's Render shell (`docs/runbooks/wipe.md`): 25 documents and every sidecar deleted, the refusal exercised first; **run a second time by Ed on 2026-09-18**, 14 documents (11 loaded, 3 quarantined), before the push carrying Q1439–Q1458, whose rules were tightened with no path for older logs; **and a third time by Ed on 2026-09-19**, 2 documents, with the host down — a bot room's replay had outgrown Render's health-check window and the old process had died (Q1470), run from his own machine since the dead instance has no shell; the running-server erase route **owed at go-live** (Q1287 (a), Ed 2026-09-08) |
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

**Overtaken 2026-09-15 (Q1362, SPEC v0.128):** the bar is no longer a room setting — the text is the ranking's top once the quorum is met, the engine's threshold pinned at 0.5 and deleted in the pass after — so every row above that varies the bar, and finding 1 below, describe a knob that no longer exists. The alpha preset's operating point is quorum and rate; the post-change measurement is pass 6's churn study (`packages/sim-harness/REPORT-churn.md`).

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

### The host under thirty-one members — measured 2026-09-11 (Q1324)

**The finding.** docs.vote document 1 — about a hundred lines, thirty-one
bot members acting every 5–30 s, a dozen live text races — saturated the
Render starter instance: every view 500–1000 ms, every command 2–13 s, then
502s and a restart (Ed: *we should be able to handle far more than 31 users
acting every 30 seconds*). The cause was the view route, which rebuilt the
whole race picture — union-find, incumbent hashes, every race's fit over
every judgment — once per race per seat per poll (`askOn` began with
`races()`), O(races² × judgments) per view. Fixed on the engine side by
`Session.derived`, one memo per state version (the reasoning, the profiles
and what was rejected: `design/DECISIONS.md` § *Q1324*).

**The instrument.** A room of the same shape on a local file-store server
with the cooldown at 0: a 97-line charter, a bot founder, thirty-one bots
over the API, `room-bots --min 5s --max 30s`, a monitor sampling every 15 s
with the founder's cookie (one full view, then one real judgment on the pair
offered), and *N* member pages polling every 4 s as the real page does. **In
a busy room every poll is a full view** — one of the two seqs has always
moved inside 4 s, so the `since` short-circuit never fires — which makes
*members × 4 s* the view rate. Numbers are one desktop core (this machine);
before the fix the same shape ran here at about a seventh of the Render
latencies, so read Render as roughly seven times these.

| load (31 bots acting, plus …) | view p50 / p95 | judge p50 / p95 | core busy | pages dropped |
| --- | --- | --- | --- | --- |
| **before**, nothing, 25–31 races | 91 / 117 ms | 14 / 29 ms | 37% | — |
| **before**, 19 pages at 4 s, 36–51 races | 4,218 / 10,541 ms (max 13.4 s) | 5,798 / 11,669 ms | 98–102% | 47 of 639 |
| **after**, nothing, 15–25 races | 9 / 13 ms | 16 / 34 ms | 3% | — |
| **after**, 19 pages at 4 s, 25–54 races | 21 / 27 ms (max 51) | 20 / 40 ms | 6% | 0 of 1,193 |
| **after**, 60 pages at 4 s, 59–64 races | 22 / 37 ms (max 179) | 44 / 69 ms | 15% | 0 of 2,234 |
| **after**, 120 pages at 4 s, 55–61 races | 22 / 41 ms (max 103) | 35 / 38 ms | 24% | 0 of 4,468 |
| **after**, 240 pages at 4 s, 50–54 races | 23 / 57 ms (max 196) | 46 / 57 ms | 38% | 0 of 8,932 |

(The 60–240-page rows share twenty logged-in seats — the login door allows
twenty per ten minutes — so the per-seat hand memo is hit more than real
members would hit it; everything else a view does is per request.)

**The operating point.** On this machine, **thirty-one members acting every
5–30 s plus 240 pages polling every 4 s hold p95 view under 60 ms and p95
command under 60 ms at 38% of one core**; Ed's bar — p95 view under 100 ms,
command under 500 ms — is still met at 240 pages, and a linear read of the
busy column puts one core at about 600 pages. On the Render starter, at
about a seventh of this, the same shape sits near 40% for thirty-one
members, and the honest envelope is **sixty to a hundred members polling
every 4 s on one instance** before the core fills; the number to watch on
docs.vote is `/api/d/:slug/view` latency in the Render log, which should now
read tens of milliseconds. **What remains at the top of the profile at 240
pages** (self time, 38% busy): `json` 8.2% — the serialisation of a 117 KB
view sixty times a second — the view builder itself 4.5%, socket writes
3.5%, `buildUsableComparisons` 2.2% (one rebuild per event, with ~2 events a
second). The next lever is therefore the payload, not the engine: a hundred
lines of text and every candidate's hunks ride every poll, and a page that
asked for the races' deltas by seq would cut the byte rate by an order of
magnitude. That is a page-contract change and was not made here. Beyond
that, the structural options — a worker per document, a read replica of the
view, or pushing on change instead of polling every 4 s — are not needed
for the rooms v1 tunes to (5–20 members); at 100+ the push is the one that
changes the shape, since it makes the view rate the event rate rather than
members × 4 s.

**Not measured.** Postgres in the command path (the local room ran the file
store; on docs.vote a command is three round trips inside the write chain,
which is its floor); RSS grew 108 → 303 MB over twenty minutes and 4,800
engine events on both the before and the after server, and was not chased.

### The host under two hundred bots — measured 2026-09-11 (Q1326)

**The run.** Ed's moon room on docs.vote (*We should do a stress test with
lots of active bots*; he chose 200 bots and a bot founder): a 97-line
charter, `room-bots --min 5s --max 30s`, one invitation every 12 s (the
login door follows sixty links per ten minutes from one address, and the
bot outbox serves its newest thirty mails), the founder's full view and one
real judgment sampled every 15 s. Times from the monitor, Render's starter:

| bots acting | view | judge | healthz (no work — pure queueing) | payload |
| --- | --- | --- | --- | --- |
| ~30 | 62 ms | 58 ms | 56 ms | 77 KB |
| ~70 | 65 ms | 104 ms | 53 ms | 173 KB |
| ~90 | 103–144 ms | 481–792 ms | 64–398 ms | 200–216 KB |
| ~104 | 93 ms | 1,472 ms | 135 ms | 236 KB |
| ~116 | 2,803 ms | 11,204 ms | 2,700 ms | 255 KB |
| ~123 | 330–7,493 ms | 3,577–18,590 ms | 3,212–7,853 ms | 258 KB |

At 17:23:53 the proxy answered 502 for everything; the instance came back
with all three documents intact (the Q1322 fix's first live test) and the
bots were stopped. **The knee is 115–120 bots at this act rate** — about
seven full views and seven commands a second — and Ed's bar (p95 view under
100 ms, command under 500 ms) held to seventy bots for views and ninety for
commands. A bot's act is a full view plus a command every seventeen seconds
on average, so this is a harsher shape than Q1324's polling members: read it
as a few hundred readers with a hundred concurrent writers.

**The limiting factor is one thread, shared by every document.** The
server is one Node process and one event loop; views, folds and
serialisation are synchronous on it, so a hot document queues every other
document's requests behind its own (healthz at 8 s is the proof). Only the
write chain — a document's commands landing in order — is per document.

**The profile, locally** (fifty bots at 2–8 s, eighty races, the same event
rate): `buildUsableComparisons` 23% of samples — every judgment in the room
walked once per race per state version, and again uncached inside every
command's fold — `runCommand` 30% inclusive, views 12%. And the process's
live heap was 60 MB under an RSS of 345 MB (107 after a forced GC): V8 was
not collecting, and on a 512 MB instance that is the kill.

**Built the same day (Ed: *do any straightforward optimisations now*):**

1. **Edge judgments indexed as they land**, by ground and by candidate
   (`Session.edgesByGround` / `edgesByCandidate`, filled in `apply`); the
   usable-set scan and the locked-evidence scan read their own bucket.
   After, same load: `usableComparisons` 7%, `runCommand` 16%.
2. **V8 told the container's size**: `--max-old-space-size=384` in
   render.yaml's start command.
3. **The slim view** (Ed: *do it now*): the page's poll states the
   document seq it has seen (`since`), its text version (`tv`) and the
   records' key (`rk`, the count of outcomes); the server leaves out the
   constitution's projection, the text and the sealed records it already
   holds and names them in `slim`; the page fills them from its last full
   view at the poll boundary. Of a 148 KB view, the records were 62 KB, the
   projection 37 KB, the text 11 KB and candidate wording 5 KB — so in a
   real room, where the document log moves rarely, a busy poll drops to
   about a third. Before 🍾 the text version is 0 for ever while the
   founder's text still changes, so text and records slim only once the
   engine exists (journey's *paste ✒️* step caught it). The short answer
   now says `short: true`; a client that states nothing gets everything.

**Not built:** the fold's uncached `races()` reads (a version bump per
mutation inside `apply` would let the memo hold within a fold); more than
one process. The next instrument to run is this room again on docs.vote
after the push, to move the knee's number.

### The second moon room — measured 2026-09-11 19:00 (Q1326, after the three levers)

**The run.** The same shape on the deployed 41da2ea: `docs.vote/d/moon`,
the same 97-line charter, 🥾 set this time, one invitation every 12 s,
`room-bots --min 5s --max 30s`, the founder's full view and one judgment
sampled every 15 s. Stopped by hand at 161 bots seated, 19:25, with the
knee found; the instance never restarted (uptime continuous, `errors`
0). Samples bucketed by bots seated, p50 / max over eight samples each:

| bots seated | view | judge | healthz | full view | races |
| --- | --- | --- | --- | --- | --- |
| 50–59 | 61 / 71 ms | 59 / 193 ms | 58 / 114 ms | 137 KB | 70 |
| 70–79 | 62 / 78 ms | 65 / 95 ms | 64 / 82 ms | 184 KB | 98 |
| 90–99 | 68 / 86 ms | 96 / 244 ms | 56 / 151 ms | 218 KB | 103 |
| 110–119 | 70 / 170 ms | 147 / 343 ms | 55 / 185 ms | 244 KB | 99 |
| 120–129 | 68 / 134 ms | 242 / 3,015 ms | 65 / 744 ms | 265 KB | 104 |
| 130–139 | 124 / 984 ms | 309 / 5,193 ms | 206 / 2,186 ms | 281 KB | 107 |
| 140–149 | 225 / 1,161 ms | 2,261 / 9,066 ms | 906 / 5,399 ms | 293 KB | 113 |
| 150–159 | 230 / 3,358 ms | 6,296 / 19,193 ms | 576 / 4,372 ms | 303 KB | 108 |

**The knee moved from 115–120 to about 140 bots**, and the collapse
changed shape: views held under a quarter of a second at the median right
through it while the judgment went past ten seconds — so what saturates
now is the command path, which is the lever not built (the fold's
uncached `races()` reads), not the view. Render's proxy timed out
individual requests past the knee (67 views and 17 judgments answered 502
to the bots) without the instance falling over, which is the Q1322 and
Q1326 fixes doing their job. Ed's bar — p95 view under 100 ms, command
under 500 ms — held to about 100 bots for views and about 110 for
commands, against 70 and 90 in the afternoon.

**Two findings for the next pass.** Eight judgments were refused
*timestamps must be non-decreasing*: a command queued for seconds behind
the load is stamped at receipt and folded after the minute `tick()` has
stamped *now* on the log, so its time is in the past by the time it lands
(Q1332). And the full view grew past 300 KB at a hundred races — the slim
view spares the polling page, not the founder's monitor, and a first load
at that size is the next payload to look at.

**The lever is built — measured 2026-09-14 (Q1326, Ed: *build the
remaining lever now*).** The version the memo keys on is bumped at every
mutation the fold makes rather than once at its end, so the memo is live
inside a fold too: a read is a hit exactly while nothing has moved since
it. With it, the judgment fold reads the race picture **once** instead of
twice — the ground before the push and `updatePeaks` after it share one
read, membership and incumbent ids not depending on comparisons — and the
read is cached all the way down, where before each in-fold build computed
`usableComparisons` twice per race. Counted rather than reasoned:
`derived.test.ts` holds one judgment at two rebuilds, against three on an
incumbent pair and five on a rival pair before.

Locally, fifty seats and eighty races, 2,920 judgments driven through
`Session.judge` with the sweep running on every one of them: the command
path went from **24.5–26.3 s to 12.5–13.8 s** (8.38–9.02 ms a judgment to
4.28–4.72 ms), and replaying the 3,001-entry log the run produced — the
same folds with no command layer around them, which is what a cold boot
does — from **2.81–4.36 ms an entry to 1.10–1.76 ms**. The rolling hash is
the same in both, which is the whole point.

The guard is differential, because a mistake here shows up as a document
that replays differently or a race that ranks differently and neither
announces itself: `memo-differential.test.ts` drives one long seeded script
twice, once with every read recomputed (`Session.memo.off`) and once with
the memo live, and compares everything the engine publishes after every
step; `Session.memo.audit` recomputes each cache hit and throws where the
cache and the live state disagree, so a mutation that escaped its `touch()`
is caught at the read that would have been wrong. Both halves were shown to
fail on a session whose memo spans the fold again. Still not built: more
than one process, and the 300 KB first load above. The next instrument is
this room again on docs.vote, to move the knee's number a second time.

### The host against the number of documents — measured 2026-09-23 (stage 14, plan-scaling.md Stage 0)

**The question** (Ed, 2026-09-23): does the one instance hold 300 documents
with people in them? **No — not on the Render starter, and not for one
reason but three, all arriving between about 200 and 300 documents.**

**The instrument.** `npm run scale-seed -w @draft/sim-harness` wrote a pool
of 1,000 documents through the real member route with the engine live (a
server in the seeding process; the founder by the magic link, members by
the dev seat switch; every act off a full member view), in a stated mix:
115 never begun, 487 small (3–15 proposals), 294 working (20–60), 104
conventions (150–200 proposals, ~1,000 judgments, 10–14 members); 369
closed. 1.09 M log entries, 431 MB of JSONL. `npm run scale-measure` then
copied the first *N* into a fresh data dir and booted the host over it —
`main.ts`'s boot as a measured child (`scale-host.ts`, tsx over the
sources, `--max-old-space-size=384` as render.yaml runs it) and, with
`--artifact`, `dist/server.mjs` itself — read memory, three `tick()`
passes, and then a share of every document's members polling `view` every
4 s the way `live.js` does (`since`/`tv`/`rk`), with the seats in 1–5 open
documents also acting every 15–45 s, for 60 s. Latencies are the server's
own request lines (on Windows a loopback fetch jitters 0–16 ms by itself,
so client-side times were not used). **One machine**: an i9-13900H laptop
(14 cores, 16 GB), Node 24.18, the file store. Render read as the moon
room's seven times slower (the 2026-09-11 sections above) — **an
assumption for replay and CPU, never measured on Render.**

| N | log entries | boot to `/healthz` (artifact / dev) | on Render ×7 | RSS after boot (artifact) | live heap after GC | one `tick()` (cold / warm) | 10% online: polls/s · view p50/p95 · busy | 30% online: polls/s · view p50/p95 · busy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 30 | 23,210 | 8.5 / 8.3 s | ~1 min | 220 MB | 33 MB | 10 / 1 ms | 10 · 0 / 1 ms · 1% | 27 · 0 / 1 ms · 2% |
| 100 | 96,512 | 29.2 / 36.0 s | ~3.5–4 min | 287 MB | 85 MB | 13 / 2 ms | 26 · 0 / 1 ms · 2% | 79 · 0 / 1 ms · 3% |
| 300 | 340,630 | 217.6 / 201.9 s | **~25 min** | **516 MB** | 261 MB | 119 / 14 ms | 96 · 0 / 1 ms · 8% | 292 · 0 / 1 ms · **19%** |
| 1,000 | 1,094,319 | not run | — | — | — | — | — | — |

**1,000 was not run**: the host's live heap there extrapolates to about
900 MB and its RSS past 1.2 GB, and this machine had 1.2 GB free — a run
would have measured the page file. Its boot extrapolates to 10–12 minutes
here, over an hour on Render.

**Cold open of one document** (a host over that document alone): the
median seeded convention (184 + 6,919 entries) replays in **4.0 s**, its
first full view 17 ms; a median working document 0.15 s; a small one
0.02 s; **nh2026's own logs** (317 + 3,057 entries, copied from the
convention's data) **1.3 s**, first view 16–19 ms, 19 MB live heap with the
process's own ~15.

**What the numbers say.**

1. **Boot is the big documents, not the count.** At N = 300 the 34
   conventions are about three quarters of the replay; a small document
   costs nothing. Replay per entry climbs with document size (0.34 ms at
   N = 30, 0.59 ms at 300), and was the same 202 s with the heap
   unconstrained, so it is the fold, not the collector. On Render at ×7 the
   15-minute window is full at **about 200 documents of this mix** (about
   20–25 rebase-heavy conventions), and half of it — the boot guard's budget —
   at about 135.
2. **Memory kills next, at about 290.** RSS grows ~1.15 MB a document;
   the starter's 512 MB is passed at N = 300 (516 MB, the heap at 261 of
   its 384 MB, collecting hard — the first `tick()` took 119 ms against 52
   unconstrained). Unlike boot this is not an extrapolation: RSS was read
   directly.
3. **CPU is not far behind on Render.** Idle polling is cheap per request
   (the short answer, p95 1 ms) but not free — 292 polls a second cost 19%
   of a desktop core at N = 300, and under the heap limit a poll costs
   about twice what it does at N = 100. Read at ×7, 30% of members
   online fills Render's core at **about 240 documents**; 10% online at
   about 550. The active rooms' own cost is the moon room's, on top.
4. **`tick()` is not a problem**: 119 ms cold and 14 ms warm over 300
   documents, far under the 5 s a health check waits.

**The order of failure: confirmed in sequence, corrected in its margins.**
Boot replay, then memory, then CPU — as the plan guessed — but not as
three well-separated walls: at 30% online the three fall at about 200, 290
and 240 documents on Render, so CPU arrives *before* memory, and **the
order of the first two depends on how heavy the big documents are**. The
seeded conventions are rebase-heavy (5,804 rebases in the median one
against nh2026's 1,591, because more proposals are live at each adoption)
and replay three times slower than nh2026; with nh2026-weight conventions
boot would fill the window nearer 400 documents and **memory, at ~290,
would fail first**. The residency room (Q1469: twelve thousand entries,
nine minutes on Render) is the other direction. Either way nothing about
300 holds.

**What changes for the later stages** (plan-scaling.md's Stage notes):
Stage 2 fixes the first two failures at once and must not ship without
Stage 3, because a lazy load is a synchronous replay on the one thread — a
convention's 4 s here is ~30 s on Render, during which every request and
the health check wait, and Render stops routing after 15 s of failed checks
and restarts after 60; Stage 1's CPU saving is negligible (a tick pass is
milliseconds) and it is worth building only as Stage 2's prerequisite;
Stage 4 is needed sooner than its place suggests, since idle polling is
the CPU failure's whole cause at these shares. The cheap stopgap is a
larger Render plan (memory buys the second failure; it does not move the
first).

**The boot guard** — `npm run boot-guard -w @draft/sim-harness`, about 50 s:
seeds ten documents in the pool's mix (one convention), replays them in a
fresh process three times, and fails when the median scaled to **60
documents** on Render (×7) passes **half** of the 15-minute window
(render.com/docs/health-checks, read 2026-09-23; render.yaml sets the
path, not the time). It reads 22% here. Sixty rather than 300 because
nothing boots 300 today: the guard catches replay getting slower (red at
about 2.5×) and states the headroom, and `FLEET` rises when Stages 1–3 stop
boot growing with the fleet. Wired by the session (not by Stage 0).

**Not measured.** Postgres (every number above is the file store; on
docs.vote each log is a query at boot); Render itself — the ×7 is a
latency ratio borrowed for replay and CPU, and the first thing to check is
one real boot's time in the Render log against a local replay of the same
store.


## History

The overnight mandate of 2026-08-20 and its running log, stage 8's log, the
design-day backlog, the hosting and domain notes and the stage write-ups as
they stood on 2026-09-07 are in `design/DECISIONS.md` § *PRODUCTION.md, the
history lifted 2026-09-07*, verbatim. Two rules from the mandate still bind
operating the service and live in the runbooks: **no JSONL log is ever
deleted**, and **never relax the hash oracle**.
