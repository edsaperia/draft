# Plan — Q1447: a failed motion tells its mover

**Written 2026-09-17 23:50 by the planning session, for a builder with none of its context.** SURFACE.md and SPEC.md win once folded; delete this file then. **The builder never pushes.** Built after the Q1439 branches are on main (it touches `packages/constitution/src/` and the page, which those branches own until they merge).

## The ruling

Ed, 2026-09-17 23:45: ***someone that proposes a motion should get an acknowledgement task if it fails.***

## What happens today

A motion that **carries** is news to everyone (SURFACE E5). A motion that is **held** tells nobody: its `mo:<id>` rail entry and live tab go for every reader, a grey ✖ record files behind the rule (SURFACE §8, *A settled motion files behind its rule*, Q942 — *It is not a task: nothing is owed an OK, it never enters the rail, and it is `done` from the moment it exists*; drawn by `recordCard` / `recordBody`, `design/session-view.html` ~:2850, ~:3173; titled `PAGE_COPY.synth.rejectedLead` + the motion's own display), and the mover's 🏛️ or ✏️ is back in the wallet with no word said. Membership motions (✉️ ❌) file nothing in a pile: they stand by their result on *Invitees* / *Proposed for removal*.

## The rule to build

**One news card and one OK per failed motion, for its mover alone.**

- **Fails** means, for a motion somebody put (`motion-opened` with a `by`): (1) **held** — every road to `status: 'held'`: the constitutional settle (`maybeSettleMotions`, one *keep*), the Founder's 🛡️ refusing a carried one (the 👑 question answered *refuse* — find where that lands in `motions.ts` / `session.ts`), and an ordinary motion adjudicated *held* by the bridge (`engine-bridge.ts` ~:513); (2) **withdrawn by the system** — `abandonMotion` (`motions.ts` ~:296; issue #26's `enterOrAbandon`), where the engine could not enter the race. **Never** the mover's own `withdrawMotion`: they know. **Not** `kept-at-close`: report what the 🥂 closing card tells a mover about their unresolved motions, and build nothing for it. **Not** an `admit` motion: its "mover" is the applicant, whose own page already reads *refused* (`application-refused`).
- **Owed to** the mover only, and only while they are a member (not removed). A lapsed mover is owed it — lapse is a stall, not a departure (R-016's line: *were you here when it happened*). The founder as mover is owed it like anybody.
- **The family's shape, not a new one.** Read `packages/constitution/src/owed.ts` whole first: `oweDeparture` / `ackDeparture` (`departure-owed` / `departure-ok`, view `owedDepartures`, page key `dep:<member>`) and `oweAmendment` / `ackAmendment` are the two siblings. Add `held-owed` / `held-ok` `{ t, motion, member }` to `types.ts`, `oweHeld` / `ackHeld` in `owed.ts`, the fold's arm in `fold.ts`, `owedHeld: MotionId[]` on the member view (`view.ts`), the session delegates, and the command (`ack-held`) in the server's whitelist — `spec-check`'s `checkCommands` holds that table, and the actor is injected, never named in the body. Optional fields only on existing events; **the golden logs pass unedited**. Emit the owing **in the same act as the settle**, after the status event, exactly where the departure owing is emitted relative to `member-removed`.
- **The card is the record card, pinned.** For a `set` or `reserve` motion: the mover's rail gains a news entry beside the setting (the news treatment E5 uses — read SURFACE §6's marks and §9's news-card row; a news card is pinned until OK and carries **OK**, a word, bottom right), which opens **the ✖ record card as it is drawn today** — dateline *Rejected*, the rule as it stood marked as standing, the proposed rule with the reason — with the commit row's OK. Until the OK the record's tab wears the news state for the mover; after it, it is today's grey chip. Every other reader sees today's grey chip from the start. For an `invite` or `remove` motion there is no record card: the news card sits beside *Members* as the departure news card does, one sentence and OK — drafted: *Your proposal to invite ‹who› was rejected.* / *Your proposal to remove ‹who› was rejected.*, and for the system's withdrawal, *Your proposal could not be put to the membership, and your ✏️ is back in your wallet.* Where the Founder's 🛡️ refused it, STYLE T8 governs the verb (*refuse* is the Founder's word, *reject* the membership's): *The Founder refused your proposal ‹…›.* Every string in `design/copy.js`, passing `design/STYLE.md`; all of it **verbatim, old beside new, in the hand-back for Ed's review**.
- **The live path**: `design/live.js` `itemsFromView` / `hydrate…` and the page's `LIVE_HOOKS`-style post for the OK; the 4s poll must not take the card away under an open card; **a press that reads its own answer from the view it was made against takes two presses** (CLAUDE.md gotcha, Q846) — read `syncOwedOks` before writing the ack path.

## Documents (SURFACE wins; cite, do not restate)

SURFACE.md §2 gains a row — take the next free E number (E41 if free; rule labels are never renumbered): *A motion fails — held by the membership, refused by the Founder's 🛡️, or withdrawn by the system* | audience **the mover** | news-pinned task: the record card (or the one sentence, for ✉️ ❌) | OK | OK | the grey ✖ record / nothing. Amend §8's *A settled motion files behind its rule* sentence: *It is not a task* **except for its mover while a rejection is unacknowledged (E41)**. SPEC §9.6a already says what a member is owed (*what happened while they were here*); add the mover's owing there in one clause with `→ why: R-130`, and **R-130** to `design/SPEC-REASONING.md` (Ed's words above; the defect — a wallet that refills in silence; rejected: telling everybody, which is E5's job for a change and would be noise for a non-change). SPEC version bumps once (read the current number — Q1439 will have moved it).

## Guards

- Module tests first (`packages/constitution/test/`): each failing road owes exactly one `held-owed` to the mover and nobody else; own withdrawal, a carry, `kept-at-close` and an `admit` owe none; the OK clears it; replay is bit-identical; a removed mover is owed nothing, a lapsed one is.
- Server test over HTTP: the view's `owedHeld`, the `ack-held` command, the actor injected.
- **`scripts/seat-matrix.mjs`**: a new §2 row with no `AUDIENCE` entry is **exit 3, and CI treats it as red** (Q1354). Add the row's predicate — the audience cell is *the mover* — and a step that fails a motion, or mark the row the way the file's own convention says an unwalked row is marked; read its header first.
- `npm run journey`: the second seat puts a 🏛️ motion, the founder answers *keep*, the mover's rail shows the news entry, one OK clears it (one press, not two), the chip is grey after. `journey`'s refused list stays empty.
- All seven gates; `npm run probe -- --strict`; `npm run copy-check -- --walk` then `copy-freeze` for the new strings (read its diff); `card-audit` on the new card at 1600 and 390 (P2, P7 must not appear); `npm run bundle` in every commit touching `packages/constitution/src/`.

## Rules of the tree

Work only in your worktree; never `git stash`, never push, never call docs.vote; do not edit QUESTIONS.md or CLAUDE.md (list CLAUDE.md's stale or missing glossary lines instead — this wants a `failed-motion-news` entry beside `departure-news`). CRLF: Edit tool only; `git diff --stat` must equal `git diff --ignore-cr-at-eol --stat`. `design/session-view.html` holds NULs on purpose (`grep -a`). Python is absent; use node. Walk servers: fresh port, fresh data dir, `DRAFT_BASE_URL=http://127.0.0.1:<port>`, `DRAFT_COOLDOWN_MS=0`, `DRAFT_BUILD_SHA=$(git rev-parse HEAD)`, log to a file, one walk at a time, killed by port.

## Hand-back

Per piece: what changed (file:line), its guard and how it is red before the change; every gate and walk with its verdict; the copy verbatim; what the 🥂 card says about unresolved motions; commit hashes; stale SURFACE / CLAUDE.md sentences; what is unrun; every doubt.
