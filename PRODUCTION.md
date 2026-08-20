# PRODUCTION.md — the road to docs.vote

Created 2026-08-20 from the approved production plan. This supersedes the old
`PLAN.md` (deleted; git history keeps it). It is a **working document**: stages
get checked off, findings get folded in, and when this file and reality
disagree, fix whichever is wrong. Decisions carry their QUESTIONS.md numbers.

## Where we are

One command (`npm run server`) boots a real multi-tenant service: magic-link
auth, live documents, the engine racing motions, mail. It is well tested at
the happy path (374 tests green as of step zero). **What is missing is the
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

## Decisions

| # | Decision | State |
|---|---|---|
| — | Persistence: Postgres, **hybrid** — the hash-chained log as rows, source of truth; projection tables derived and rebuildable. SPEC §11 replay survives. | decided |
| — | First users: Ed + a few friends. Abuse/Sybil/moderation are not launch blockers; correctness, data safety, deliverability and the security fixes are. | decided |
| — | Public reads at launch (🌍 offers them; the server has no unauthenticated read path yet). | decided |
| — | Deploy: GitHub → hosting; mail via Resend; domain docs.vote. | decided |
| — | Surface merge (Q418) is its own supervised session — see stage 8 note. | decided |
| 430 | Push to the public GitHub repo (or flip private first)? | **open** |
| 431 | How far the first unsupervised run goes (recommended: stages 1–3). | **open** |
| 432 | Hosting: Render (recommended) or Fly. | **open** |
| 433 | Sending domain: `mail.docs.vote` (recommended) or the apex. | open — bites at stage 9 |
| 434 | ESLint only, **no Prettier** — it would reflow ten thousand lines of hand-wrapped prose comments and destroy the authorial voice. | adopted on recommendation |
| 435 | Build: **esbuild bundle** (already pinned, 0.28.2) rather than tsc project references. | adopted on recommendation |
| 436 | PII behind a `person_id` in a deletable `people` table **from the first schema** — nearly free now, structurally impossible later (see stage 12). | adopted on recommendation |
| 437 | `/api/dev/outbox` **deleted from the production build**, not flag-gated — half the defect is that the app can boot into a dangerous mode. | adopted on recommendation |

## Hosting: Render (pending 432)

A persistent-disk web service plus managed Postgres. The app is stateful and
single-instance *by construction* — every document is replayed into memory and
never evicted; the rate limiter and token store are in-process; there is no
locking anywhere — so a disk that pins it to one instance is the property we
want, not one we tolerate. Native GitHub deploys, managed TLS, and a second
service is a five-minute staging environment. **Auto-deploy off** — CI calls
the deploy hook after tests pass, so there is one gate. Fly.io is the named
alternative (cheaper always-on, more DIY). Not Vercel/Netlify/Workers: this is
a long-lived stateful process with a one-minute tick.

Accept ~30s downtime per deploy. At five users that is correct, not a
compromise.

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
| 1 | Toolchain: build, lint, CI, push (430) | 2–3d | everything else lands safely |
| 2 | Server refactor + unit tests + **review #1** | 4–6d | the storage swap becomes a substitution |
| 3 | **Security fixes** + **security review #1** | 4–6d | safe to be reachable |
| 4 | Staging deploy on Render — needs Ed's account | 2–3d | proxy / TLS / cookie truth, early |
| 5 | Schema versioning + golden-log test | 3–4d | safe to change the engine, ever |
| 6 | Postgres (hybrid) + import + **review #2** | 2–3w | durable, concurrent, backup-able |
| 7 | Config, secrets, observability, shutdown | 3–4d | deploys are visible |
| 8 | **Surface merge (Q418)** + `design/STYLE.md` audit — supervised | 1–2w | one surface to secure, style, cache, test |
| 9 | Resend domain + deliverability (433) | 2–3d + propagation | the product actually works |
| 10 | DNS, TLS, production + **security review #2** | 1d | docs.vote is live |
| 11 | Backups + a restore **drill** | 1–2d | the data is safe |
| 12 | Privacy, ToS, retention, erasure | 3–5d | legal to collect a friend's address |
| 13 | **Accessibility** | 4–6d | usable by everyone invited |
| 14 | Performance, caching, **stress tests** | 4–5d | known limits, proven crash recovery |
| 15 | **Documentation review** | 2–3d | somebody else can operate it |
| 16 | Rollback, go-live checklist, soft launch | 2–3d | live |

Roughly 10–13 weeks solo. Stages 1 and 9–10 partly overlap with waiting time
(DNS and DKIM propagation).

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
  `dist/server.js`, platform node, zero external deps (the server's only
  dependency is the workspace-internal constitution package, which bundles).
  `node dist/server.js` boots it. The dev path (`tsx`) survives as
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
after commit.

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
store, no `secret.txt` on disk · backup present in independent storage · a
full walk on production with a throwaway address, then delete it and verify
the deletion · mail kill-switch and maintenance mode tested, then off.

**Soft launch in three steps:** Ed alone with a real document for a week →
3–5 friends on one document with the logs watched daily → a Newspeak House
cohort. A named observation point after each.
