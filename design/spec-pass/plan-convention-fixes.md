# Plan — the fixes the convention found (nh2026, 2026-09-20)

Written 2026-09-21 for builders with none of the planning session's context. Deleted once every stage is folded and its questions are closed in `QUESTIONS.md`.

**Precedence.** SPEC wins over SURFACE, SURFACE over this plan, and the `QUESTIONS.md` block of each finding is the diagnosis of record: this plan **cites** those blocks and does not restate them. Where a block and this plan disagree about a file or a line, re-read the code; both were true when written and the tree moves.

**What happened.** The first real membership — twelve people, the Newspeak House convention — ran on docs.vote at `5929a6e` on 2026-09-20 and closed itself at 17:10. It worked, and it found defects in three ways: Ed's sightings in the room (Q1482–Q1486), the wrong-line hunt beside them (Q1487–Q1489, and Q1477 seen again), and the host's error log read the day after (Q1491–Q1493, and Q1477's first evidence). Q1490, the quorum scale, was ruled the same day and is built separately.

**The evidence is on this machine and nowhere in git**: `data/nh2026/errors.jsonl`, `log.jsonl`, `engine.jsonl` (gitignored; real people's words — never commit, never paste into a report). `node scripts/repro/nh2026-refusals.mjs` rebuilds all 98 versions of the text from them.

## Rules for every stage

1. **One builder at a time, in the main tree, stages in order.** Each stage leaves the tree green and is its own run of commits, one commit per finding, message in the house style (`git log --oneline -8`), via `git commit -F <file>`. **Never push** — a push to `main` is a deploy, and it is Ed's call. Never `git stash`.
2. **Files are CRLF.** Use the Edit tool; never `sed -i` or `perl -pi`. `git diff --ignore-cr-at-eol --stat` tells a real change from ending churn.
3. **Every fix lands with a named guard** that is red on the pre-fix tree: a unit test for `packages/`, a walk step or a `scripts/repro/` script promoted into a walk for the page. A fix with no guard is not done. Where a repro script already exists it is named below — make it assert, then make it green.
4. **Every string a member can read lives in `design/copy.js`** and passes `design/STYLE.md`. A copy change reddens `copy-check` until `npm run copy-freeze`; read the freeze's diff and confirm only intended strings moved.
5. **The seven gates before a stage is called green**: `npm test`, `npm run lint`, `npm run typecheck`, `npm run spec-check`, `npm run copy-check`, `npm run clock-check`, `npm run build`. A change to `cards.js` re-runs `design/tools/session-probe.js`; a change to the setup page re-runs `design/tools/setup-probe.js`; page changes run `npm run journey` against a dev server on a **fresh port and a fresh data dir**, killed by port afterwards.
6. **Nothing renders under a caret, a focused field or a press** (CLAUDE.md *Gotchas*: *Nothing rebuilds under a press*, *A data swap under a caret takes it*, *A drag is a press held down*). Several of these fixes live exactly there.
7. **A finding that turns out to need a decision stops and is reported**, with the readings as options. Do not implement a reading on spec.
8. Each stage's report: what changed by `file:line`, each guard and that it was red before, each gate's result with counts, walks that could not run and why, anything found on the way.

## Stage 0 — land Q1490 (in flight)

The 👥 scale opens to 1–100% with two conditional sentences on the card; R-126 reversed as R-139; SPEC v0.139. A builder is running from its own brief. The planning session reviews its diff and runs the seven gates. **Stage 1 does not start until Stage 0 is committed**, because both touch `packages/engine-core` and `design/setup.js`.

## Stage 1 — server and engine, no ruling needed (the full lane)

**1a. Q1491 — a line ending in a carriage return can never be proposed on again.** Highest priority in the plan: it silently destroys members' work and any paste from a Windows editor triggers it. Diagnosis: the Q1491 block. The rule to build, reading (a): **a carriage return never enters the text.**
- At the door: every hunk's `lines` (and `was`, and `after`) are normalised on submission — a trailing `\r` stripped, an embedded `\r\n` or lone `\r` inside one "line" refused or split the way `splitLines` (`packages/engine-core/src/text/diff.ts:22`) already does for a whole text. Do it once, at the engine's submit boundary, so the participant API, the bridge and the Founder's ✒️ road all pass through it. **Normalise at the command, never in the fold**: replay of an existing log must stay bit-identical (the golden-log tests are the assertion).
- One line array: `participant-api.ts:286` checks an attestation against `splitLines(this.session.document())` while `session.ts:1276`, `:1380`, `:1573` read `currentLines()`. Make them read the same thing, so the two checks cannot disagree again whatever a text holds.
- The page: the composer's paste path strips `\r` before it reaches a lane (find the paste handler in `design/composer.js` / `edit-mode.js`), so a draft never holds one.
- Guards: an engine test that submits a hunk whose lines end `\r`, adopts it, and then proposes on that line through the participant API (red today: *not what this proposal replaces*); a test that a log already holding CR lines still replays identically **and** that its CR lines can be proposed on (the one-array change is what cures an old text); a journey or repro step that pastes CRLF text into a lane and proposes twice on the result.
- No repair tool: nh2026 is closed and alpha documents are disposable (Ed, 2026-09-17).

**1b. Q1482 — a delegated question that has every answer and never resolves.** Diagnosis and cure in the block: `remove` (in `@draft/constitution`'s session) calls `afterRosterChange` only `if (wasInE)`, so withdrawing an unopened invitation lifts the hold and re-asks nobody. Add the missing `maybeResolveAll` on that road. Guard: a case in `begin.test.ts` — delegate 👥, invite two, have every arrived member answer, withdraw the unopened invitation, assert the question resolves and `readiness()` is ready.

**1c. Q1488 — a sealed record's *Previous text* off by a line after an early-closed rival.** Diagnosis and cure in the block (`packages/server/src/views.ts:492–496`): carry each field member's span to the record's version by `spanNow`, as `stillRacing` does a few lines above, or take the span and the displaced text from the winner alone. Guard: a server test beside `close-stranded.test.ts`; `scripts/repro/wrong-line-room.mjs`'s *record* case goes green.

## Stage 2 — two reproductions before any fix

**2a. Q1477 — a proposal aimed two lines low.** Three hunts did not reproduce it; the error log now gives the recipe. Evidence (Q1491–Q1493 block, last sentences): at version 0, with **one rival's one-line insertion live at `[0, 0)`**, two members' proposals each attested wording **exactly two lines above** the span they aimed at (line 5 for line 3; line 70 for line 68 of 70); two of the five came up to sixteen seconds **after** the insertion was withdrawn. The server's R-136 guard refused all five; the page's own `standDown` (`LIVE_HOOKS.misaimed`) let all five through.
- Build `scripts/repro/head-insertion-aim.mjs` on a multi-seat dev server: seat A proposes a one-line insertion at the head of the text; seat B, with the page already open, then with a fresh load, then after A withdraws, begins a draft on line 3 and on the last line by click-and-type and by ✏️ *propose edit*, and presses Propose. Record the hunk sent (`start`, `end`, `was`) against the served text. The suspects, from reading: a live insertion standing at a gap site (`siteOfSpan`, M19) counted as blocks by `blocksOf`-keyed readers, so keys beneath it shift by the anchor and the line; and `followSites` re-keying against a column that still holds it after the withdrawal.
- When red: fix the aim at its source, **and** make `standDown` catch what the server caught — it compares against the served text and should have refused these on the page without spending the flight. Guard: the repro promoted to a `journey` step (*head insertion*).
- If it does not reproduce in a day's honest hunting, stop and report what was driven; do not guess a fix.

**2b. Q1492 — the composer sent a patch whose two sites overlap.** Evidence: `validateHunks: hunks 0 and 1 overlap: [73, 86) and [74, 80)` (base v19, 15:49) and `[85, 95) and [86, 95)` (base v33, 16:05), one member rewriting a long section each time; the args are in `errors.jsonl`, truncated at 2,000 characters, and `engine.jsonl` gives the text at both versions. Reproduce in `scripts/repro/overlapping-sites.mjs`: a draft site over a long run, then a second site begun inside or at the edge of the first (Enter inside a multi-line site; ✏️ *propose edit* on a card whose span the draft already covers; a site grown by `followSites` over its neighbour). The rule (SURFACE K14–K16): one site is a run of adjacent blocks and two sites never share a line — a second site inside the first **is** the first. Fix at the draft model (`design/composer.js`), and let the row's ✏️ refuse on the page rather than the server if it can still happen. Guard: the repro, asserting.

## Stage 3 — the page, plain defects (the surface lane, no ruling needed)

Each is diagnosed in its block with files and lines; build the cure the block states.

- **3a. Q1483, both halves** — ✏️ *propose edit* on a rival's wording can never be proposed, and on a multi-line card it seeds the first line alone. Cure as the block states: the draft opens over the item's whole run (`addDraftRun` over `s.keys`), one origin per block, and a seeded origin keeps two wordings apart — what the diff is measured against, and what the document holds — with `misaimed` and `followSites` reading the second. Guard: the journey step the block specifies (✏️ on both lanes of a two-line run's card, each sent); `proposer-feedback.mjs --case=press/seeded` and `wrong-line-room.mjs --case=shapes` green.
- **3b. Q1486 (A) (B) (C) (G)** — the field composers (⏱️ 👥 💤 🪶 📍): read on `input` as well as `change` so ✏️ wakes while typing; `renderKeep`/`renderRestore` (band.js) carry every composer field and the caret across a poll's render, or the render is deferred while one is focused (the same `pressInFlight` family the polls already honour); `PROPOSE.rate` reads `d.val` and never the display phrase (Q1289's cure on ⏰); a validator's raw text never reaches a card — the field enforces its `min`/`max` and the refusal is a `copy.js` sentence. Guard: **a new walk that composes a settings motion with real key presses** on WebKit as well as Chromium if the toolchain has it (`design/REPORT-xbrowser.md` says what is installed), promoted from `scripts/repro/member-rate-motion.mjs`; the block notes that no walk does this today.
- **3c. Q1487** — the ⚔️ card headed by one line of a several-line race: a deadlocked item takes the race's span for its site and the head reads `runTextFor`. Guard: `wrong-line-room.mjs`'s *deadlock* case.
- **3d. Q1489** — a reader's view of a candidate holding an insertion and a replacement at one start: `applyIn` (live.js) orders `[k, k)` before `[k, k+1)`. Guard: `wrong-line-room.mjs`'s *reading* case.
- **3e. Q1484 (c)** — the ↻ stranded line is missing from the phone's task drawer: `session.js:1226–1227` lists `urgent · propose · weigh · unread` where the wide rail's list (`:1360`) has `stranded` too. Guard: `npm run drawer-walk` gains a stranded entry.
- **3f. Q1485 (D)** — the two accidents, whichever way Q1485 is ruled: the un-animated snap one round trip after *Submitted* (the id handed over before the refresh — live.js:190, :1900; session.js:5239), and a rule proposal's card redrawing as if untouched (`return render()` at session-view.html:7987 where its neighbours `closeThen`). Build only what both rulings share; leave the rest to Stage 4.
- **3g. Q1493's offered controls** — the Founder's lay-down on a setting with no value (SPEC §9.7: *a power can only be laid down once the setting is set*) is not offered until the setting has one; the four member-readable strings outside `copy.js` that Q1485's block lists (live.js:1456, :1576; session.js:4310; engine-bridge.ts:377) move into it.

## Stage 4 — the page, after Ed's rulings

Built only once each ruling is written into its `QUESTIONS.md` block. The planning session asks them one at a time and amends this section with the answers.

- **4a. Q1485** — what a card does at Propose: (A) close properly with a sentence on the rail line, text and rules alike (amends K17–K18, brings motions to L5); (B) keep it open as K18 says and make that true; (C) a sentence in the topbar. *Ruling: pending.*
- **4b. Q1484** — what a proposer is told when the text moves under their proposal: (a) the stranded line speaks; (b) a news card owed an OK; (d) records about your own wording say *yours*; (e) the refund at the stranding (engine and a SPEC reading). *Ruling: pending.*
- **4c. Q1486 (D) (E)** — whether a member's ⏱️ motion can carry the starting number and the maximum as well as the interval; what an empty wallet does to ✏️ on a motion and what the sentence says (*stake* is engine vocabulary). *Ruling: pending.*
- **4d. Q1493 (a)** — whether the page answers a race with the poll itself: a judgment on a pair closed since the card was drawn files the card as closed without a refusal; a proposal refused only for *targets version n; current is n + 1* is re-read against the new version and sent again where its lines stand unchanged. *Ruling: pending.*
- **4e. The withdrawn invitee's old link** — today *unknown member 'm-7'*. What it should say. *Ruling: pending.*

## Stage 5 — so the next room leaves a better record (after Ed's yes to each)

- **5a.** `docs/runbooks/demo-day.md`: the first step after a room closes, before any push — copy `data/errors.jsonl` off the host (docs/OPERATING.md §11 says a deploy takes the file).
- **5b.** The error log kept in Postgres beside the documents, so a deploy no longer deletes it; `draft-tools errors` reads either store.
- **5c.** A keyed read of it, `GET /api/admin/errors` under `DRAFT_BOT_KEY`, in the shape of the bot outbox route; decide with Ed whether it blanks addresses in `args`. `verify-deploy` asserts 401 without the key.
- **5d.** The page reports its own uncaught errors and rejections to the same log (`kind: 'page'`, the message, the source line, the seat, the build), rate-limited per seat, nothing else sent. Sunday's page-side failures left no trace at all.

## Stage 6 — green, rehearsed, pushed

1. The seven gates; both probes; `journey`, `applicants-walk` (three prices), `after-begin-walk`, `invite-walk`, `first-keys-walk`, `member-questions-walk`, `slug-walk`, `ladder`, `powers-walk`, `seat-matrix --hat=both`, `room-walk` on a cooldown-0 server — sequentially, not in parallel.
2. `npm run qa:freeze`, its three diffs read.
3. A bot room on a dev server as rehearsal — including a bot that pastes CRLF text and one that inserts at the head of the text while others draft beneath it.
4. `README.md`'s spec version and counts; CLAUDE.md gains a one-line gotcha for each finding whose guard now exists (the eviction rule: the failure, and the guard that catches it), post-mortems to `design/DECISIONS.md`; each closed question's block leaves `QUESTIONS.md` for DECISIONS.
5. **The push is Ed's**, one full-lane deploy, with `data/errors.jsonl` copied off the host first if any room has run since.
6. Then a second supervised sitting on the fixed build. PRODUCTION.md stage 19's criterion needs two in a row with no finding of the class *a control did the wrong thing*; nh2026 produced several, so the count stands at zero.
