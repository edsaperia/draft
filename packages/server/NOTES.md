# @draft/server — author calls (Q368)

- **The log is the only persistence.** One JSONL of the ConstitutionSession's
  own hash-chained LogEntry per document; loading is `replay` (chain
  verified), persisting is appending what a command emitted. No database, no
  snapshot, no second source of truth — the §11 property made operational.
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
- **Arrival is the link** (§9.6a): following an invitation logs you in and
  arrives you in one act; revival (§9.5a) is the same — any authenticated
  command by a lapsed member calls memberReturn first.
- **Time** is the server clock clamped non-decreasing per document
  (`max(Date.now(), last event t)`); `tick()` runs the lapse/freeze clocks
  once a minute on constituted documents.
- **Slugs never break**: every slug a document has worn routes to it
  (cs.slugs is the registry, §9.7). /d/:slug serves setup.html live
  (Q391): the page detects its address and renders the real document
  through the blind view; '/' serves the same page as the §9.7a birth.
- **The engine rides every commit** (Q391): engine-host.ts attaches an
  EngineBridge the moment a document constitutes, persists the engine's
  own hash-chained log as engine.jsonl and the bridge's pairing state as
  bridge.json beside log.jsonl, resumes both by replay, syncs on every
  command, and closes the races when a windowed ending passes. Ordinary
  set-motions stake and race; judge-race is in the whitelist; the view
  serves each member their race cards and wallet.
- **Not in this slice**, each deliberate: the applicant flow (§9.7½ — needs
  its own verify-before-submit token dance; the module is ready), reading
  a public/link chamber without a membership cookie (every view requires
  login today), rate limiting / abuse controls (Q346 territory), HTTPS and
  deployment (Ed's call — nothing here deploys itself).
