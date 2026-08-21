# @draft/server — author calls (Q368)

- **The log is the only persistence.** One JSONL of the ConstitutionSession's
  own hash-chained LogEntry per document; loading is `replay` (chain
  verified), persisting is appending what a command emitted. No snapshot, no
  second source of truth — the §11 property made operational. Since
  PRODUCTION.md stage 6 the log may live in Postgres (`pg-persistence.ts`,
  one row per entry, `DRAFT_STORE=pg`) instead of JSONL; it is the same log
  behind the same `Persistence` seam, and `copy-store.ts` moves it between
  the two with every rolling hash asserted identical.
  Consequence to hold in mind: the log carries answers in plaintext (the
  package's documented blindness design — projection withholds, storage does
  not), so the data directory is as sensitive as the room. `view()` is the
  only read the API serves; there is deliberately no log endpoint.
- **Text pasted before the save survives it** (§9.7a v0.55, Ed's own
  workflow: copy, paste, then do the tasks). Pre-save it syncs against a
  capability id minted with the creation mail (stored hashed, expiring
  with the token, in pending.json); the save consumes it into the one
  deliberate sidecar beside the log, provisional.json — deliberately NOT
  a log event, because nothing about it has been decided: it is the
  founder's draft of an answer, superseded the moment the starting text
  confirms. Readable by any member in view() (the charter is what the
  founding questions are about); writable by the founder alone. As
  sensitive as the log itself: it is somebody's draft charter.
- **The cookie is the actor.** No request body ever names who is acting; the
  whitelist in commands.ts shapes calls onto the module with the
  authenticated member injected. Founder-ness is `memberId ===
  convenorRecord().id`, checked per request, never stored.
- **Sessions are stateless HMAC cookies** over (docId, memberId, expiry) —
  restart logs nobody out and there is no session table to leak. Tokens
  (create/login) are single-use, expiring, stored sha256-hashed.
- **Mail rides the fold.** After every persist the fresh events are scanned:
  member-invited sends the invitation (with a login token minted then),
  lapse-warned/member-lapsed send theirs. The server never composes a
  notification the log does not imply. Without RESEND_API_KEY everything
  lands in data/outbox.jsonl and on the console — the dev inbox.
- **The operator hears about every birth** (Ed, 2026-08-20): the §9.7a
  save mails `cfg.notifyEmail` the title, the founder's address and the
  URL — the one mail the server sends to somebody who is not a member,
  and the one it sends outside the fold, since a birth is a save rather
  than an event anybody in the room is owed. Fired and forgotten: the
  save must never fail, or wait, on it. DRAFT_NOTIFY_EMAIL overrides;
  empty switches it off.
- **Arrival is the link** (§9.6a): following an invitation logs you in and
  arrives you in one act; revival (§9.5a) is the same — any authenticated
  command by a lapsed member calls memberReturn first.
- **Time** is the server clock clamped non-decreasing per document
  (`max(Date.now(), last event t)`); `tick()` runs the lapse/freeze clocks
  once a minute on constituted documents.
- **Slugs never break**: every slug a document has worn routes to it
  (cs.slugs is the registry, §9.7). /d/:slug serves session-view.html live
  (Q391): the page detects its address and renders the real document
  through the blind view; '/' serves the same page as the §9.7a birth.
- **The engine rides every commit** (Q391): engine-host.ts attaches an
  EngineBridge the moment a document constitutes, persists the engine's
  own hash-chained log as engine.jsonl and the bridge's pairing state as
  bridge.json beside log.jsonl, resumes both by replay, syncs on every
  command, and closes the races when a windowed ending passes. Ordinary
  set-motions stake and race; judge-race is in the whitelist; the view
  serves each member their race cards and wallet.
- **Applicants speak the same doors** (§9.7½): POST /api/d/:slug/apply
  starts an application (the module refuses invitation-only documents and
  member addresses, told to log in instead), the mailed /auth/apply link
  verifies the address and sets an `app:`-prefixed cookie whose one
  permitted act is submit-application; under `apply` the submission opens
  the free ordinary admit motion — **which races** (§9.7½ v0.56, Q397):
  the bridge enters it as its own one-candidate race against the
  membership as it stands, members judge it on their served race cards,
  and adoption admits. A seconder's propose-applicant is priced through
  the bridge (the ✏️ stake refused at the door if the wallet is short)
  and carries the seconder's rationale where one was written (blank is
  fine, v0.57).
- **The dev inbox is an endpoint** (Ed, 2026-08-19): GET /api/dev/outbox
  serves the tail of outbox.jsonl — links intact — so the page can put
  the magic-link mails in a modal instead of asking QA to tail a file.
  Exists only in dev mail mode, and **not at all in the production
  artifact**: the route sits under a DEV label the build drops bodily
  (PRODUCTION.md stage 3, decision 437), so no misconfiguration can
  serve magic links — the code is not there. The view's `devMail:
  false` keeps the page from offering it.
- **Engine tuning is a config field, never an env var** (`engineTuning`):
  tests that adopt twice in one second pass cooldownMs 0; production
  constructs its config from the environment, which cannot set it, so a
  deployed room always runs the §4.2 pacing as shipped.
- **The mail-minting doors are rate-limited**, minimally (Q346 territory):
  an in-memory per-IP bucket on create/login/apply, 20 per 10 minutes —
  a brake on mail floods, not an abuse story. Restart empties it.
- **Not in this slice**, each deliberate: reading a public/link chamber
  without a membership cookie (every view requires login today), and
  what PRODUCTION.md still has staged — Postgres, deliverable mail from
  mail.docs.vote, the surface merge. HTTPS and deployment are no longer
  among them: docs.vote is live in alpha on Render, CI deploys it on
  green (decision 476) and verifies the live host afterwards with
  `npm run verify`.

## 🍾 begin, readiness and the hourly touch (2026-08-21)

- `begin` is founder-only and is the only way a document starts; the founder's view
  carries `readiness` (null for everybody else). Until the page has its 🍾 card, a
  document can be begun only through the API — the fixture's ⏩ and the live page's
  auto-open both assumed the module constituted itself.
- Every member `GET …/view` calls `cs.seen` first and commits only when the module
  recorded something (at most hourly per member), so a reader never lapses (Q459a) and
  a four-second poll does not write the log.
