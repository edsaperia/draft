# Scaling — PRODUCTION.md stage 14's plan, written 2026-09-23

**What this is.** Ed, 2026-09-23, asking whether the service holds 300
documents with people in them: *I think we should make a plan to do this,
because it sounds like we might hit some of these limits quite soon after a
launch.* **A plan, not a build:** stage 14 was parked by Ed on 2026-09-22 and
*load waits until behaviour is as expected* is his ruling of 2026-08-26
(PRODUCTION.md stage 19); **when** any stage below is built is his call, and
that call is recorded as a change to those rulings when he makes it. **Ruled by Ed, 2026-09-23 ~11:25: Stage 0 now, the rest before launch** — the measurement and the boot guard are built at once (they touch no product code); Stages 1–4 are built after the beta criterion is met and before any public launch, in order, each proved against the old path; Stage 5 keeps its own measured condition. **Re-ordered by Ed, 2026-09-23 ~17:00, on Stage 0's numbers: Stage 4 (push) comes first of the build stages**, since idle polling alone is the CPU limit and push depends on nothing in Stages 1–3; then 1, 2 and 3 as before — **and Stage 2 never ships without Stage 3** (a lazy load of a convention-sized document is a ~30 s synchronous replay on Render, long enough to fail health checks). Stage 1 is kept only as Stage 2's prerequisite (a tick pass is milliseconds). Nothing is started by this ruling (Ed: *let's not start anything now*). This changes *load waits until behaviour is as expected* (2026-08-26) for Stage 0 alone, and un-parks stage 14 (2026-09-22) to that extent. **Re-ruled by Ed, 2026-10-01 ~09:25 UTC, in the coordinator's session (*after current redesigns are done*): Stages 1–4 are built once redesign stage 10 (BUILD.md's last) has merged, not after the beta criterion — Stage 4 first, its spike before its build, the order and the Stage 2–3 pairing unchanged.** This moves *after the beta criterion is met* (2026-09-23) to *after the redesign*; *before any public launch* stands.

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

- **Stage 0**, 2026-09-23, branch `scaling-stage0`: `scale-seed` / `scale-measure` / `boot-guard` in sim-harness; PRODUCTION.md *Measurements*, 2026-09-23. A pool of 1,000 seeded documents measured at N = 30, 100, 300 (1,000 not run: this machine lacked the memory). On the starter at ×7, boot fills the 15-minute window at ~200 documents, RSS passes 512 MB at ~290, 30%-online polling fills the core at ~240 — the plan's order holds in sequence but not in margin, and boot and memory swap places if the big documents weigh what nh2026 does. `tick()` is milliseconds, so Stage 1 is only Stage 2's prerequisite; Stage 2 must not ship without Stage 3 (a convention's lazy load is ~30 s of blocked thread on Render, past the health check's 15 s); Stage 4 matters sooner than its place. Boot guard at `FLEET = 60`, half the window; wiring it into CI is the session's.
- **Stage 4's spike**, 2026-10-02, issue #159, PR #161: three flagged rows behind `DRAFT_SPIKE_SSE=1` — `GET /api/spike/sse` (a counter every 5 s, a comment heartbeat every 15 s, `retry:` with optional jitter), `POST /api/spike/poke` (one event onto a named stream, at once) and `GET /api/spike/stats` (streams, RSS, heap, fds, event-loop lag), nothing from any document — **measured locally and removed unshipped** (in git at `7c3f8f93`); `node scripts/spike-sse.mjs <base>` measured them (an instrument, not a guard) and stays for Stage 4's `/api/d/:slug/events`. **Local half, measured** (this container, the production flags `--max-old-space-size=384`, Node 24, one client process on the same host — so no proxy between them):

  | question | measured locally |
  |---|---|
  | 1. stays open? | 100 streams held 420 s, **0 cuts** — past Node's 300 s `requestTimeout`, which bounds the request and not the response |
  | 2. buffers? | no: poke write-to-receive p50 1 ms, p99 3–5 ms at 100, 300 and 1,000 streams; counter gaps p5–p95 4 999–5 002 ms against 5 000 |
  | 3. cost per stream | **one fd** and **~10–20 KB of heap** (1,000 streams: heap 18 → 25–29 MB, RSS 97 → 116 MB, fds 30 → 1,031); event-loop lag p99 ~1 ms at 0, 100, 300 and 1,000 streams alike — an idle stream costs no CPU worth measuring |
  | 4. after a restart | 300 streams cut by SIGTERM, a new process started: with `retry: 3000` and no jitter **all 300 came back inside one second** (reopen p50 3 090 ms, max 3 122); with 10 s of server-chosen jitter, **22–38 a second over ten seconds** (p50 7.5 s, max 13 s) |

  **Stage 4's build carries two findings:**
  1. **End every stream at the start of `close()`.** Open streams hold the shutdown: `close()`'s `server.close()` waits on them until its 3 s race gives up, so a deploy's drain took 3.0–4.4 s instead of milliseconds.
  2. **The herd is the views, not the streams.** A reconnect costs a socket, but the page follows each with `refresh()`, so jitter is what spreads N view requests. It is sent as `retry:` from the server, which `EventSource` obeys: at 300 pages, about 30 views a second over ten seconds rather than 300 at once.

  **Recommendation: build Stage 4 as planned** — taken by Ed as (b), below.

  **No Render measurement — Ed's (b), 2026-10-02 ~10:26 UTC:** *skip the Render measurement, build Stage 4 on the local numbers, the backstop covers a cut.* Render's documented cap (100 minutes the most a request may last; a long-lived connection's zero-downtime routing covers its handshake only, so the old instance's streams break when it stops) is met by `EventSource`'s reconnect plus the 30 s backstop.
- **Stage 4**, 2026-10-02, issue #162 (PR #171), built on the spike's local numbers by Ed's (b): `GET /api/d/:slug/events` (`routes-events.ts`, `EventHub` in `events.ts`) and the page's `EventSource` (`design/live.js`, `pushOpen` / `pushWant` / `pollTick`). The stream says `hello {seq, eseq, build}`, `doc {seq, eseq}` and `nudge {}`. A nudge goes on the pause, the stall flag, the build, and, to member streams only, a reading place moving. Changes are found by a 200 ms scan of streamed documents rather than by hooks. A 15 s `ping` keeps an open member's place inside E43's TTL and feeds the page's 20 s silence watchdog (C17). `retry:` is 1 s plus up to 10 s of jitter, chosen per stream. The caps are 6 per seat and 200 per IP, answered 429. **Every stream ends at the start of `close()`.** The page asks `refresh()` on an event and defers under a press as the tick does. The poll is a 30 s backstop while the stream is open, and 4 s while it is not, while the pause stands or while a deploy's reload waits. `DRAFT_PUSH=off` gives today's page exactly. **Measured** (`push-walk`, local): a proposal reached the other seat's rail in 146–198 ms and a vote in 134–199 ms after the command answered, over three runs. An idle page asked for 2 views in 65 s against 17 at 4 s. `journey` and `seat-matrix` (both hats) were green with push on and with `DRAFT_PUSH=off`, and the two probes stayed identical. An event under a held press was kept and landed within a second of the release. B's page with push and B's page with the poll alone showed the same text and the same rail (Invariant 4). **The storm** (`spike-sse.mjs --doc`, 190 streams at the door, SIGTERM and a fresh process): the 190 came back over 9 s, 5–35 a second, p50 6.3 s and max 11 s, 38 of them meeting a host not yet up and retrying. SIGTERM to exit took 1.9 s with all 190 open against 1.4 s with none.
- **Stage 1**, 2026-10-03, issue #210, PR #213: `nextClockT` beside each `tick` (constitution, engine-core), `clockDueT` and `sweptAtT` in engine-host, the index and `isDue` in `WritePath`; `DRAFT_TICK=all` is the old tick. Memory only, the Postgres mirror deferred to Stage 2 (the QUESTION on #213). **Differential** (`clock-index.test.ts`, in `ci`): the boot-guard set, the golden founding log and three made rooms, ticked by both paths over 930 instants to 22 days, byte-identical; every kind crossed; 12,070 of 12,090 document-ticks skipped; each of the four clocks mutated out turns it red. **Measured** at N = 300 (fresh pool, 306,876 entries, this container): one `tick()` pass 249/10/9 ms → 209/2/1 ms; the first pass after boot is the same work by design (every resumed bridge sweeps once).
