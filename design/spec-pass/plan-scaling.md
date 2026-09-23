# Scaling — PRODUCTION.md stage 14's plan, written 2026-09-23

**What this is.** Ed, 2026-09-23, asking whether the service holds 300
documents with people in them: *I think we should make a plan to do this,
because it sounds like we might hit some of these limits quite soon after a
launch.* **A plan, not a build:** stage 14 was parked by Ed on 2026-09-22 and
*load waits until behaviour is as expected* is his ruling of 2026-08-26
(PRODUCTION.md stage 19); **when** any stage below is built is his call, and
that call is recorded as a change to those rulings when he makes it.

**Precedence.** SPEC wins over this file (the log and its replay are the
mechanism's own, §11); PRODUCTION.md holds the stage and this file its plan;
CLAUDE.md's conventions bind every commit. This file cites rather than
restates, and it is deleted once built, its notes lifted into
`design/DECISIONS.md`.

## The model today, and why it breaks first where it does

One Render starter instance (512 MB; `--max-old-space-size=384`,
`render.yaml`), one Node process, Postgres behind it. **Every document lives
in memory, replayed from its whole log at boot** (`store.loadAll()`,
`server.ts:155`), before `/healthz` answers. **Every page polls** its view
every 4 s (`live.js` `refresh()`). **`tick()` visits every document every
minute** (`write-path.ts:476`): the adoption metronome, lapses, abstain
deadlines, the close.

Measured (PRODUCTION.md *Measurements*, the moon room, 2026-09-11): one
document, 31 acting bots and 240 polling pages — p95 view under 60 ms, p95
command under 60 ms, **38% of one core**; ~60 MB live heap for a 200-bot room.
Broken once (decision 1253, 2026-09-19): **one** oversized document's replay
outran Render's health-check window and the instance died.

At 300 documents the expected order of failure is **boot replay** (every
deploy and restart replays everything before the health check), then
**memory** (nothing ever unloads), then **CPU** at peak (≈1,000 polling pages
reads, linearly, as ~1.5 cores, with one available) — an estimate until
Stage 0 measures it.

## Invariants every stage keeps

1. **The log is the only truth.** Anything derived — a snapshot, an index, a
   cache — is disposable, versioned by the code that made it, and rebuilt
   from the log whenever that code changes. Replay stays bit-identical.
2. **One owner per document.** Every write to a document happens in one
   process, in order; the store's duplicate-position refusal (the `23505`
   behind `stalled`, #79) stays the backstop, never the mechanism.
3. **Blindness does not move.** Nothing new carries a view, a standing, an
   author or a judgment; a member's view is still only `view()` and
   `raceView` for that seat.
4. **Every stage is proved by a differential**: the new path against the old
   one on the same logs, byte for byte — the pattern
   `packages/engine-core/test/memo-differential.test.ts` already uses.

## Stage 0 — measure (step zero; changes no product code)

- A seeding tool (sim-harness beside `soak.ts`): N documents of realistic
  shape — a charter of 40–150 lines, 5–20 members, logs from a few hundred to
  convention size (nh2026's) — written straight to a scratch store.
- Measured on a scratch server (never docs.vote), at N = 30, 100, 300, 1000:
  boot time; RSS and live heap; one `tick()` pass; view p50/p95 and core busy
  at realistic online shares (10%, 30%) of members polling; the cold-open
  cost of one convention-sized document.
- **The boot guard**, the one product-adjacent piece: a check (CI's `ci` job
  or `verify-deploy`) that fails when boot replay of the seeded set exceeds a
  stated share of Render's health-check window. Cheap insurance against the
  failure that already happened once.
- **Acceptance:** a *Measurements* section in PRODUCTION.md with the curves,
  and the order of failure confirmed or corrected. Every later stage's target
  is set from these numbers, not from this file's estimate.

## Stage 1 — the clock index (tick only what is due)

The prerequisite for unloading anything, and a CPU saving on its own.

- Each document states **when it next needs a tick**: the earliest of its
  close, the next lapse warning or lapse, the next abstain deadline, the
  adoption metronome's next beat where races are live, the outbox's retries.
  Derived from the session and the engine, recomputed after every commit,
  held in memory and mirrored to a small Postgres table so an unloaded
  document is still findable.
- `tick()` visits only documents that are due (loading them, from Stage 2
  on).
- **Acceptance:** a differential — the same logs driven by the all-documents
  tick and by the due-only tick end byte-identical, over the golden logs and
  seeded rooms, clocks crossing every deadline kind; one `tick()` pass at
  N = 300 idle documents measured before and after.

## Stage 2 — load on demand, unload when idle

- Boot loads **no document**: it reads the registry (slugs, clock index) and
  answers `/healthz` at once. A document is replayed on its first request or
  its first due tick.
- A document with no page polling (or pushed to) for a stated idle period and
  no tick due within it is **unloaded**; its next request loads it again.
  Never unloaded mid-command or mid-tick.
- `/healthz` reports loaded vs registered documents, memory, and the slowest
  recent load (issue #70's gap).
- **Acceptance:** boot time flat in N; memory proportional to *active*
  documents; a walk that opens a cold document, idles it past eviction, and
  reopens it with nothing lost; the Stage 1 differential still green.

## Stage 3 — snapshots (fast loads however long the history)

- Periodically (every K entries, and at close) a document's folded state is
  written as a snapshot row: `(document, seq, eseq, codeVersion, state)`.
  Loading takes the newest snapshot whose `codeVersion` matches the running
  code and replays only the tail; any mismatch falls back to full replay.
- `codeVersion` is a fingerprint of the fold and engine code, so **a code
  change invalidates every snapshot automatically**.
- An audit switch (like `Session.memo`'s `audit`) replays from scratch beside
  every snapshot load and throws on any difference; on in CI, sampled in
  production.
- **Acceptance:** a differential over the golden logs and seeded rooms —
  snapshot + tail equals full replay, byte for byte, at every K; a cold open
  of a convention-sized document under a stated time; a deliberate fold
  change proved to invalidate the snapshots.

## Stage 4 — push instead of polling (Server-Sent Events)

- `GET /api/d/:slug/events`: the seat's cookie, the same guards as the view;
  a long-lived response that sends **only the document's `seq.eseq`** when it
  changes, and a heartbeat every 15–30 s. Never a view, never content.
- The page opens it with `EventSource`; an event triggers the existing
  `refresh()` (the slim view already asks only for what moved). The 4 s poll
  becomes a 30 s backstop. Q1505's bar learns of a lost connection from the
  stream's own error at once.
- Reconnects after a deploy are spread with random delay; connections are
  capped per seat and per IP.
- **A spike first**: Render's proxy and long-lived responses, measured, before
  the build.
- **Acceptance:** a vote on one seat reaches another seat's page in under a
  second (walked); idle pages cost no requests beyond the backstop; the
  seat matrix and journey green with push on and with it blocked (backstop
  only); the reconnect storm measured at N pages.

## Stage 5 — more than one process (deferred, with its condition)

Only when **Stage 0's method, re-run on docs.vote's real load, shows one core
above 70% at peak** — a checkable measurement, not a judgement. Then: several
worker processes on one larger instance, a front process routing by document
address (one owner per document, invariant 2), the non-document routes on a
designated worker. Several instances, a router service, or ownership leases
in Postgres are a later plan again.

## What it costs besides building (said to Ed, 2026-09-23)

Hosting money (a larger Render plan at some point — Stages 2–4 postpone it);
permanent complexity (a snapshot format, a load life-cycle, long-lived
connections, each with its guards and CI minutes); the beta's clock (every
week here is a week the two supervised sittings wait); and dev drifting from
production unless walks force cold loads, evictions and reconnects.

## Risks, and where each is caught

| Risk | Caught by |
|---|---|
| A snapshot disagrees with the log — a document silently wrong | invariant 1; Stage 3's differential and audit switch; `codeVersion` invalidation |
| An unloaded document misses its close or a deadline | Stage 1 before Stage 2; the clock-index differential |
| A cold open of a big document is slow | Stage 3 paired with Stage 2; the cold-open measurement |
| Push re-renders under a caret or a press more often | the existing gotcha guards (journey, rate-motion, focus-steal) run with push on |
| A deploy's reconnect storm | Stage 4's jitter and its measured storm |
| The push endpoint as an attack surface or a leak | the view's own guards; `seq.eseq` only; per-seat and per-IP caps; a blindness test |
| Two processes owning one document | Stage 5's routing; the `23505` backstop |

## Stage notes

(One line per stage as it lands: commit, measurement, what was found.)
