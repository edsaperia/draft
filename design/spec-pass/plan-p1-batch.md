# The P1 batch — ruled by Ed on 2026-09-22, PRODUCTION.md stage 19's fix batch

**What this is.** The twenty open P1 GitHub issues Ed ruled *build* on the
evening of 2026-09-22, one question at a time, plus the three plain
accessibility defects he sent to the same batch earlier that evening
(Q1394, Q1395, Q1397 — PRODUCTION.md stage 13). The GitHub milestone
*P1 batch, ruled 2026-09-22* lists the issues; each carries a comment stating
his ruling and the date. **This file is the contract**: the order, the lanes,
what each item builds and what it does not, and the rules the build runs
under. It is deleted once the batch is folded (its own rule, as the
convention plan's was), its stage notes lifted into `design/DECISIONS.md`.

**Precedence.** SURFACE and SPEC win where an issue's body and a rule
disagree; the issue's *Not in scope* stands unless Ed's comment says
otherwise; CLAUDE.md's conventions bind every commit. Where an issue's line
numbers have moved (every one filed 2026-09-19 has), the file and symbol are
the citation, never the number.

**How it is built** (Ed's standing instructions; memory
`fable-plans-opus-builds`, `draft-convention-fix-plan`):

- One builder at a time in the main tree, briefed to read this plan,
  CLAUDE.md, the issue and the cited QUESTIONS blocks. Best available model.
- **Every item sees its guard red first**: the issue's *Reproduce first*
  driven on a scratch server (fresh port, `mktemp` data dir — never 8140,
  never docs.vote) or a new test, red on the pre-fix tree, green after.
- The seven `ci` gates after every item: `npm test`, lint, `npm run
  typecheck`, `spec-check`, `copy-check`, `clock-check`, build. Copy edits
  touch `design/copy.js` only and are frozen (`npm run copy-freeze`) as they
  land.
- **Nothing is pushed by the builder.** One paused full deploy at the end,
  by Ed or on his standing word, never during a live room, with the walk
  sweep, `qa:freeze` read, and a bot-room rehearsal before it (the
  convention batch's Stage 6 is the model; `design/DECISIONS.md`
  2026-09-22).
- Each issue's commit names the issue and the finding; the issue is closed
  by the commit that finishes it, with the guard named.
- A finding that turns out to need a ruling not in the issue's comment stops
  and files a question in QUESTIONS.md (claim the number in the file).

## Stage 0 — the docs that are wrong today

Already done in the same commit as this plan: OPERATING.md's per-address
login cap reads 10 (#86 F1). **#86 F2/F3 (the runbook) are Stage 5**, after
the batch, so the runbook lists only the workarounds still needed.

## Stage 1 — page only (a surface upload could carry these alone)

Order by blast radius; each is independent.

| # | Build | Guard | Not built |
|---|---|---|---|
| **#78** | `readLane` (cards.js) keeps the trailing empty block an Enter at the lane's end makes; the caret lands in it | a repro driver beside `scripts/repro/` and a `journey` step (*lane keys*) | charters already carrying a join |
| **#75** | (F1) the ⏰ answer card: the rung chooses first, the box appears, as the Founder's own ⏰ does — `session-view.html`'s `[data-ans]` date arm and `setup.js`'s `on` test; (F2) the `ans-*` `[data-ansnum]`/`[data-ansdate]` `change` branches take the in-place repaint the motion fields got in Q1486 (A) | `founding-walk --delegate=ending` answering *At a set time* on a member seat; a first-press assertion in `member-questions-walk` | — |
| **#80** | the live `settingState` adapter (live.js) carries `previousValue` and `setWhy`, so `news()`'s ordinary-change arm fires | `journey`: a Founder pen on ⏱️ after 🍾 serves every member a news card whose OK clears `owedOks` | — |
| **#34** | (F1) `setSetting` in live.js sends `why`; (F2) 🗑️ on 🍾 restores the struck power cells (`REVERTKEYS` / `beginRows`); (F3) `REVERTKEYS` carries `setWhy` | `journey`: the member's card reads the reason; a walk step pressing 🗑️ on 🍾 | reasons already lost |
| **#88** | `consentBody` passes the mover, as `ordinaryBody` does, so the mover's 🏛️ card draws the inert two blocks and 🗑️ | `journey`'s *a keep ends* row: the mover's card has no pressable lane | **finding 2** — no module refusal (Ed: a mover who changes their mind withdraws) |
| **#37** | (F1) `LIVE_HOOKS.judge` reads the answer: a refusal un-files the pair (`resolved.delete`) and re-asks, with the sentence; (F2) `withdraw` likewise puts the proposal and the ✏️ back; (F3) `api.cmd`'s chain gets a timeout (`AbortSignal.timeout`) that reports and releases the chain | a `journey` step with a refusing server seam; a unit on the chain | — |
| **#76** | Begin shows while a delegated question is collecting, refused with its reason from `readiness().holds` — **and its rail entry is a ⏳ Begin task listing the members whose answers are still due, by name and avatar** (Ed's shape). `founder-answers` re-asserted against the live page | `founder-answers` red on the pre-fix page; `journey -- --delegate-all` | — |
| **#32** | the band's `adm:` and `mo:` cards gain the awaiting-crown branch (Refuse / Accept, SURFACE E12) for the Founder; every other seat reads *waiting on the Founder*; the Founder's rail entry is live, a clerk Founder gets one too | `applicants-walk` at every price with 🛡️ kept; a `powers-walk` step for a carried motion | — |
| **Q1500** | the judgment cards — quick · insert · race · patch · diagonal · the ⏳ judged pair — draw no 🗑️ (Ed, 2026-09-22, reading (b)); a chosen radio is undone by another choice or Indifferent, the card closes by a click outside; the deadlock ⚔️ keeps its bin for the desk's draft (Q613, assumed). SURFACE C4 and §9.3's commit column amended in the same commit; `spec-check` reads §9.3 against the cards, so the row moves with the code | `card-audit`: no discard control on those kinds; the session-probe re-frozen by `qa:freeze` | the settings, answer and editing cards' bins |
| **Q1501 + Q1502** | the five grant cards (💡 ⚖️ ✒️ 🛡️ 🏛️): a wash of their own until accepted — the *yours* hue, since a grant is addressed to you (C8) — on card, tab and rail entry, grey after; the commit reads *Accept* + the power's glyph (T44 amended for grants: *Accept ✏️* · *Accept ⚖️* · *Accept ✒️* · *Accept 🛡️* — and **🏛️'s reads *Activate 🏛️***, to match its title, Ed 20:14); the unaccepted rail entry **sparkles** (Ed's word — a small, slow, repeating shimmer, with a still form under `prefers-reduced-motion`, and never on an accepted entry). The 🏛️ grant is titled **Activate your membership** and its body is about 🏛️ alone: what a 🏛️ is, that you are already a member, what accepting it opens — a body of its own in copy.js, `proposalsClause` staying the constitution's. SURFACE §6 (the wash rules), §7's table, §9's grants row and STYLE T44 amended in the same commit | `card-audit` on the five cards' wash and commit label; the session- and setup-probes re-frozen by `qa:freeze`; `copy-freeze`; a `journey` line reading *Activate 🏛️* on a member's seat; `a11y-audit`'s reduced-motion probe | body text saying what the OK gates (Ed did not choose it) |
| **Q1503** — **DONE 2026-09-22 evening, before the batch** (`hatCurrent`, band.js; the ladder's session rung and journey's *hat* line) | 🎩's marked radio derived from the module (`iDraft()`) whenever `settled(c)`, in `BODY.hat` and the commit row's `cur` alike, never from `S.seen`; every seat but the founder's gets the founder's own locked view (the settled two-block grammar, the standing sentence marked and greyed) instead of `readBody`'s *Set to* line, which has no `VALUE.hat` to print | `npm run ladder`'s session rung asserts 🎩's marked radio after the reload past 🍾; a `journey` line opening 🎩 on a member's seat; the setup-probe re-frozen | the member's lockline (noted in the block, Ed's call) |
| **a11y** | Q1394 the `<html lang>` element; Q1397 focus stays on the card after an act (open, commit, OK); Q1395 each judgment lane's radio carries a distinct accessible name (the wording, or *first / second wording*) | `npm run a11y-audit` — A16 and the lane rows green; the audit re-run and its report re-dated | everything else in `design/REPORT-a11y.md` (the stage) |

## Stage 2 — server and engine

| # | Build | Guard | Not built |
|---|---|---|---|
| **#89** | the three `/auth/*` doors count the request before the body can throw: `readTokenBody` in a try/catch falling through to `tooMany` with an empty token | `door.test.ts`: a malformed body on `/auth/login` is counted; the busy case unedited | the cap numbers (#93); log rotation (#70) |
| **#79** | (F1) `commit` (write-path.ts) undoes the in-memory apply — or refuses before applying — when `persist` throws, and the refusal says so; (F2) `stalled` marks the document on any persistent write failure, not 23505 alone | two `pause.test.ts`-shaped cases: a permanent and a transient failure, the room's view asserted after each | rewriting anything stored; a document already carrying a doubled candidate |
| **#35** | `/auth/login` after the close: a condition before the spend, landing on the closed page; `/auth/apply` on a refused application: catch → a page that says so; the mail arm | four tests in `server.test.ts` / `mail-give-up.test.ts` | — |
| **#33** | `refuseTaken` takes a blind flag; the applicant's refusal names no holder; the status check runs first | `faces.test.ts`: an applicant's refusal carries no name | — |
| **#38** | one accessor (`Stash.pendingOf`) read by all three `routes-auth.ts` handlers: a superseded create link refused, the claimed stash readable by the stale tab, 📨 on a claimed stash answering what happened, no twin; **then** F5's nullable `email` column, migration 7 | `server.test.ts` cases per finding; `slug-walk`'s resend half | — |
| **#65** | the engine's author preference counts only while the author is in E (`RacesHost` closure for membership); a whole-room lapse retires nothing; the bridge's two fallbacks deleted | three engine tests; `memo-differential` still green; a golden replay unchanged | — |
| **#87** | `settingFeed` retracts a `proposed` entry at `motion-held`, `motion-withdrawn` and the close's keep; `feed.js` scroll hold on `grew !== 0`; the `decreed` branch skips an equal value; the stalled sentence said about the document; `toEqual` on all three rules entry kinds | `spectator.test.ts`'s failed-motion case (the issue's repro), `feed.test.ts` | `candidate-retired` on the feed (ruled, #68) |
| **#29 + Q1498** | `relay` gains `application-refused` on all three roads with its `MAILS` template; the applicant's page reads the outcome; **and** a member removed by a carried 🥾 motion gets E31's tells (the mail among them) — Q1498's block | `mail-give-up.test.ts` / `server.test.ts`; `applicants-walk` at *proposal* through a refusal; `seat-matrix`'s E40 row | refusals from before the deploy |
| **#36** | the Join card on an open-door document (`joinOpen`, Q509 (a)); `STRS.sent` set from the answer, never before it, each refusal in its own words | `applicants-walk`: a join at 🪪 ✒️ 🤝 yes; a refused knock reading refused | — |
| **#67** | the interstitial waits for a press (a `Continue` button, the script gone); a cut link diagnosed as cut, the remedy naming what the mail carries; the two stranger doors get a send queue; a non-ASCII address refused at the gate | the walks that follow links (`scripts/lib/walk.mjs`'s `followLink`) press the button; `door.test.ts`; then **a real Gmail and Outlook test by Ed** | — |
| **#10** | `DRAFT_ADMIN_KEY` guards pause, resume and surface; `DRAFT_BOT_KEY` guards the bot outbox alone; CI carries the admin key; OPERATING §3, §10 and PRODUCTION's Q1310 row rewritten; **both keys rotated by Ed at the deploy** (the transition-push trap in the issue's body: set the new variable before the push that reads it) | `bots.test.ts` and `pause.test.ts`: each route refuses the other key; `verify-deploy` asks both | — |
| **Q1504** — **DONE 2026-09-23 00:18, before the batch** (31e04c37; `records-uncapped.test.ts`) | the fifty-record cap leaves `raceView` (`views.ts`, `.slice(-50)` on `records`): every resolved race's record is served, live and closed, the slim view's `recordsKey` doing the withholding it already does | a server test beside `slim-text.test.ts`: a closed document with sixty resolved races serves sixty records; red on the pre-fix tree at fifty | a cap of any size; any change to what a record holds |

## Stage 3 — the convention's own residue

Q1494–Q1497 carry readings for Ed and are **not in this batch until ruled**;
Q1499 (the seat-matrix step for E42) is built if the count bump left the
step itself owed — read the block. Q1498 rides #29 above.

## Stage 4 — the sweep and the deploy

The convention batch's Stage 6, repeated: every walk in CI's `walks` and
`probe` jobs green locally against a scratch server; `qa:freeze` read, never
run blind; a twelve-bot rehearsal room that closes itself; README's counts;
CLAUDE.md gotchas for anything that earned one, each naming its guard;
DECISIONS.md takes this file's stage notes. Then Ed's push — one paused full
deploy — with `#10`'s key rotation sequenced as its body says.

## Stage 5 — after the deploy

#86 F2/F3: `docs/runbooks/demo-day.md` rewritten against what now ships —
delegation described, the workarounds that survive listed, the rest gone.
Then the second supervised sitting (PRODUCTION.md stage 19).

## Stage notes

(Appended by the builder as each stage lands: commit, what was found on the
way, what was left and why.)

- **#78** (Stage 1, 2026-09-23): `readLane` (cards.js) keeps an empty last block of two or more as the lane's final newline, each block's own trailing break taken off first; `sentText` (cards.js, new) drops that line again from what goes out — `hunksOf` (live.js) and `draftRowState` (composer.js) read it, so Enter alone at a lane's end neither sends a blank line nor counts as a change. Guards: `scripts/repro/lane-enter.mjs` (fixture, four cases: end · bare · middle · twice — red at end, bare and twice on the pre-fix page) and `journey`'s *lane keys* (red on the pre-fix `readLane`: one line, glued). Found: live.js's comment promised `SESSION.LIVE_HOOKS.hunksOf` to walks and no walk could reach it — `SESSION.hunksOf` now exists. Left: `focus-steal --lane` (needs a bot room); charters already carrying a join (not built, the plan's column).
- **#75** (Stage 1, 2026-09-23): (F1) the `[data-ans]` click branch records a date rung's press as `myAns.<key>Kind = 'date'` beside the answer (clearing a *Never*, keeping a date already given), `setup.js`'s ⏰ `on` test reads it, `cardKeys` names it so 🗑️ puts it back; (F2) the `[data-ansnum]` and `[data-ansdate]` `change` branches repaint rail and commit in place and never render, and the `input` listener gained the `[data-ansdate]` arm. Guards: `member-questions-walk` (⏱️ answered by one real press; ⏰ *At a set time* chosen by its press, box shown, answered with the date by one press — red on the pre-fix page at both, *0 answer(s) sent* and `chosen:false, box:false`), `founding-walk --delegate=ending` (red on the pre-fix page: 🍾 unreachable, the question unanswerable). Found: `founding-walk`'s verdict read *answers it* over a commit step logged *no commit control*; it now asks for a commit that pressed. `[data-ansunit]` left rendering: the plan names the two field branches, and a select's `change` is not a blur under a press.
- **#80** (Stage 1, 2026-09-23): the live `settingState` adapter (live.js) carries `previousValue` and `setWhy`, so `changedFrom` reads a real *from* and `news()`'s ordinary arm fires; `window.__founding()` reads out `changedFrom` per setting. Guards: `journey`'s *title news* (the Founder's ✒️ on 🪶 served to the member as news with its reason, one OK clearing `owedOks`, and a second change news again — red on the pre-fix `live.js` at *railed: false* with `owedOks ['title']`), and F2's pin in `change-record.test.ts` (a second ✒️ change after 🍾, the first OK given, is owed again — green on both trees, being the module's side). Found: the plan's guard names ⏱️, but journey promises ⏱️'s ✒️ away before 🍾 (`beginRowsBeforeStart`), so the step drives 🪶, the ordinary rule whose pen the Founder still holds there. The news card reads *No reason given.* for a reason typed on the Founder's card until #34 F1, next.
- **#34** (Stage 1, 2026-09-23): (F1) `setSetting` (live.js) sends `why`; (F2) `takeSnap` copies `S.beginRows` as `__begin`, `cardKeys` names `beginRows` on a card with `.pwtoggle[data-bkey]`, `revertSnap` restores a copy; (F3) `takeSnap` copies `S.setWhy` as `__why`, `revertSnap` restores the open card's reason alone; `openCardDirty` compares both by content. Guards: `powers-walk`'s *⏰ reason* (✒️ with a typed reason, `setWhy` read off the view — red on the pre-fix `live.js` at `setWhy: null`), `journey`'s *begin bin* (two struck cells, 🗑️, 🍾 reopened as it opened, twice — red on the pre-fix page at both rounds). **Found on the way**: the band's render keeper (`renderKeep`/`renderRestore`, band.js) held `input` fields only, so a 4 s poll landing while the Founder typed a reason took the caret and ✒️ sent half the sentence (`setWhy: "The co"` on the first run); it now holds the `[data-setwhy]` lane by character offset — Q1486 (B)'s *every field on the card*, no new ruling — and the powers-walk step lets one poll land mid-reason on purpose (red without the band fix at `"The cohort"`). The member's news card reading the reason is covered by `journey`'s *title news* (set at the wire with a reason) plus this step (the Founder's card carrying it); no single walk drives both halves.
