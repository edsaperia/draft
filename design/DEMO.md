# DEMO.md — the demo document at docs.vote/d/demo

A working document like `design/MOBILE.md`: stages get checked off as they land, the questions at the foot are numbered and answered by Ed, and rules that come out of it go into the rule files when built. **SPEC.md and SURFACE.md win wherever this document disagrees with them**, as they win over every plan; `docs/OPERATING.md` wins on what runs where and what configures it; the code wins over all three. This file **cites rather than restates** — a rule already written elsewhere is pointed at, not copied — and it **schedules** its edits to other documents (the *Documents to update* line of each stage) rather than making them alongside this plan. Written 2026-09-24 from Ed's brief of the same day; **Ed's rulings on it are QUESTIONS.md 1535** (2026-09-24), folded in below — where the first draft of this plan and a ruling differed, the ruling is what stands here, and the draft's own questions are gone except the ones still open (§9).

Line numbers below are evidence as of `da09af48` (main, 2026-09-24): they say where each change lands *today*, so a builder can find the spot; like MOBILE.md's, they will drift, and the symbol named beside each is what survives.

## Status

- **Stage 1 — built on branch `demo`** (2026-09-24): the preset converted to §3's contract and held by `npm run demo-check` in CI; `/d/demo` built in memory at boot from it, nothing stored or mailed. Not pushed.
- **Stage 2 — built on branch `demo`** (2026-09-24): `DRAFT_DEMO_KEY` (a passphrase is fine), the `draft_demo` cookie, **wrong guesses locked out** (five a minute from one address lock it for five minutes — Ed, 2026-09-24), the panel with Reset and the seat switch; the bot controls are drawn and dark. The questions every demo route asks are one module, `packages/server/src/demo-access.ts` (`hasDemoKey`, `demoDoc`, `isDemoDoc`), and `Demo.onRebuild` is the hook a reset stops the bots through. Not pushed.
- **Stage 3 — built on branch `demo-visitors`** (2026-09-24): 👋 *Try It* on the door (the door's only card on the demo — no 📧 Log In, the demo mailing nobody), `POST /api/demo/join`, one seat per device, names *adjective + topping* (Ed's reading of the ruling, not the plan's *adjective + animal*), the grants pre-accepted through the view's `preAcked`, the 30-minute lapse on the minute tick (`Demo.lapseVisitors`) with the room's departure news acknowledged (1535 (h)), the QR modal in the panel. The Log In and Apply doors now send nothing on an ephemeral document. **Not built:** the log-length self-reset (1535 (g), still open — no size ceiling on this branch). Not pushed.
- **Stages 4–5 — built on branch `demo-bots`** (2026-09-24): `applyCommand`, `DemoBots`, `ClaudeDemoModel` and the dev-only `StubDemoModel`, the bots' routes and `design/demo-bots.js`. Not pushed.
- **Integrated on branch `demo-int`** (2026-09-24, for the demo that evening): the bots' target is the demo document — its generation, and the preset's cast minus the Founder, each with its cast line (`demoTargetOf`, `Demo.botSeats`); **one gate** for every Ed-only route (`demoRefused` in `demo-access.ts`; `demo-key.ts` deleted); Reset stops the bots before it reads the preset; a visitor's clock is touched inside `applyCommand`, never by a bot; the bot controls mounted in the one panel. The builder's decided entries stop judging once the winner is adopted (since Q1534 a covering rival stays live, and judging against it refused). `npm run demo-walk` walks the whole; Ed's runbook is `docs/runbooks/demo-tonight.md`. Not pushed.
- Stage 6: not started.

## 0. What it is, in plain words

**One page Ed can open to show somebody what docs.vote is.** `docs.vote/d/demo` is always a busy, half-decided document: the programme for *PizzaCon 2027*, a single-track, three-day conference about pizza, with rival wordings racing on its sessions, some changes already decided, and a membership already in the room. Ed can:

- start a room of **bots — the conference's own speakers**, named in the preset — that read the programme and the rival wordings and propose (retitles, tightened abstracts, swapped sessions), argue and judge like members do, each **partial to its own session** as a speaker would be, powered by Claude (Haiku 4.5 unless he picks another model from a dropdown), and that **pause by themselves** two minutes after he closes the tab, after ten minutes of running, or at $3 of spend — **⏸️ / ▶️** in the panel pauses and resumes them by hand;
- put a **QR code** on the screen so the people he is showing it to can join from their phones in one tap, as members with made-up names, no email needed — **one seat per device**, a seat lapsing **30 minutes after its last action**;
- **switch his own seat** between the Founder and an ordinary member, to show both sides;
- **reset** the whole thing back to the prepared programme in one press — **the preset is read afresh at every Reset**.

Anybody else who opens `docs.vote/d/demo` gets the same working document and the same one-tap join, but no controls: the bots only run when Ed has started them, and a quiet room shows nothing extra (Q1535).

### 0.1 What is different about the demo document, and why

The demo document is a real document — the same page, the same engine, the same rules (SPEC §2–§9) — with these exemptions and nothing else. Each is argued in one line; anything not listed here behaves exactly as on any other document.

| # | The product's rule | The demo document | Why |
|---|---|---|---|
| D1 | A document is a hash-chained log in the store, replayed at boot (CLAUDE.md `replay`, OPERATING §5) | **Held in memory only, never written to the store.** Rebuilt from the preset at every boot and every reset | Nothing about it is worth keeping, a reset must be able to throw it away, and the server holds no deletion (decision 1253: *the deletions are the tool's, never the server's*). A document that is never written needs none |
| D2 | Membership begins by a verified address (SPEC §9.7½, §9.7a; `magic-link`) | **One-tap join, no address**: the host invites a made-up address on the Founder's ✉️ ✒️ and arrives it at once; one seat per device | The Founder's ✒️ on ✉️ already admits with nobody's say (SPEC §9.7 rule 9); the demo's only departure is that the host presses it on the Founder's standing behalf, and that no address is proved |
| D3 | Every document mails (invitations, the close, the lapse pair — `WritePath.relay`) | **Never mails, and queues nothing to mail** | Its addresses are made up, and nothing should reach Resend or the outbox table |
| D4 | A seat is a cookie minted by a magic link | Ed's **seat switch** mints a cookie for any seat in *this* document, behind the demo key | Showing the Founder's side and a member's side in one sitting is the point of the demo |
| D5 | Dev controls never ship (decision 437; `build-server.mjs`'s `NEVER_IN_PROD`) | **The demo panel ships**, gated by the demo key and scoped to the one document | Ed demos on docs.vote itself (Q1535); the argument is §0.2 |
| D6 | The error log records every refusal (Q1330) | Demo refusals are **counted, not logged** — proposed, §9 question 1535 (b) | Bots and strangers meet refusals by the dozen; the log is read line by line |
| D7 | A new member accepts ⚖️ 💡 🏛️ before judging or proposing (SURFACE C9, E8) | **A visitor's grants arrive pre-accepted** (Q1535) | Three presses before a first vote is too slow for a room watching a screen |
| D8 | A seat lasts until its member leaves or 💤 lapses them | **A visitor's seat lapses 30 minutes after its last action** — the member leaves; a rescan joins anew (Q1535) | A room of phones must not accumulate absent members counted in every quorum |

Nothing else is exempt: the blind view (§3.5), the command whitelist (`checkCommands`), the engine and the floor are the product's, unmodified.

### 0.2 The security argument for the production exception (one paragraph)

The demo panel is dev-shaped code that ships, which decision 437 forbids in general; this exception is narrow in four ways and each is enforced by the server, never by the page. **Only one document**: every demo route acts on the demo document alone, found by its reserved slug in memory, and refuses any other id — so no demo control can touch a real room. **Only with the key**: every Ed-only route answers 404 when `DRAFT_DEMO_KEY` is unset and 401 (rate-limited, like `bearerRefused`, `routes.ts:191`) without a valid demo cookie; the cookie holds an HMAC keyed on the demo key, never the key, so rotating the key kills every cookie. **Nothing it can reach is real**: the demo document holds no real address, is never persisted and never mails (D1, D3), so a leaked key lets somebody reset, seat-switch and spend Claude credit inside the demo, and nothing more — the spend pauses at $3 a run (Stage 5, `demo-spend-cap`) and the Anthropic key sits in its own Console workspace with its own limit. **Nothing else dev leaks**: the ladder, the dev clock, the outboxes and the stub model stay under the `DEV:` label, and the build's self-check and `verify-deploy` gain needles and checks that fail red if any of them, or an ungated demo route, reaches the artifact (Stage 2). What a leaked demo key allows is exactly the demo, which is the same posture `DRAFT_BOT_KEY` has for the bot outbox (PRODUCTION.md, *Q1310 — a keyed door that ships by design*).

### 0.3 Names

The six in CLAUDE.md's glossary since this file was committed are `demo-document`, `demo-preset`, `demo-key`, `demo-panel`, `demo-bots` and `demo-join`; the rest join it as their stage lands. Literal and stable; each a one-line job.

- `demo-document` [concept] — the document at `/d/demo`: memory-only, rebuilt from the preset at boot and at every reset, never mailed.
- `demo-preset` [concept] — `design/demo/pizzacon-2027.md`, Ed's hand-edited source: the title, the programme text, seeded proposals, decided changes, insertions, the cast and the rules.
- `demo-preset-parse` [symbol] — `parsePreset` in `packages/server/src/demo-preset.ts`: the preset file to a typed `DemoPreset`, refusing loudly on anything it cannot place.
- `demo-check` [symbol] — `npm run demo-check`: parses the preset and builds it on a scratch server, red in CI's `ci` job when Ed's edits break it.
- `demo-build` [symbol] — `buildDemo` in `packages/server/src/demo-build.ts`: one generation of the demo document from a `DemoPreset`, its past written backdated.
- `history-pen` [file] — `packages/server/src/history-pen.ts`: the ladder's `Pen` and its backdated-writing rules, moved out of `dev-ladder.ts` so the ladder and the demo share one.
- `ephemeral document` [concept] — a `LoadedDoc` with `ephemeral: true`: persisted by nobody, relayed by nobody, retired from the store in memory.
- `demo-key` [concept] — `DRAFT_DEMO_KEY` and the `draft_demo` cookie it mints: what makes a browser Ed's.
- `demo-panel` [concept] — Ed's controls, bottom-left, off the design system like the `ladder-bar`: ⏸️ / ▶️, count, pace, model, reset, QR, seat.
- `demo-join` [concept] — the stranger's *Try it* card and `POST /api/demo/join`: one tap, a made-up name, a member, one seat per device.
- `demo-qr` [concept] — the QR modal in the panel, encoding `https://docs.vote/d/demo?try=1`.
- `demo-bots` [concept] — `DemoBots` in `packages/server/src/demo-bots.ts`: server-side members acting through `applyCommand`, paced, counted, paused by heartbeat lapse, the run clock and the spend cap.
- `demo-heartbeat` [concept] — the panel's POST every 30 s while bots run; bots pause 120 s after the last.
- `demo-model` [symbol] — `DemoModel`, the bots' brain: `ClaudeDemoModel` over the Anthropic SDK, `StubDemoModel` for tests and CI (dev-only).
- `demo-spend-cap` [concept] — the per-run dollar ceiling ($3) over the bots' Claude usage; no daily cap (Q1535).
- `applyCommand` [symbol] — the member command path out of the `/cmd` route (`routes-member.ts:264–341`), shared by the route and the bots so the bots have no other way in.
- `demo-walk` [symbol] — `npm run demo-walk`: resets, joins two phone seats, runs stub bots, lets the heartbeat lapse, asserts they paused.

## 1. What the survey found (2026-09-24, read-only)

- **The slug is free** — `GET https://docs.vote/api/slug/demo` answered `{"available":true}` at 2026-09-24; `/d/demo` is a 404. Anybody may take it until Stage 1 ships (§9, 1535 (a)).
- **The ladder already builds a real, busy document through the module's own methods** (`dev-ladder.ts`: `toConstitution` :535, `toReady` :559, `toSession` :627, `proposeAndJudge` :711, `motions` :782), writing its past at backdated timestamps through `Pen` (:245), whose ceiling is *never later than real now*. The whole module is dev-only: reached through a dynamic `import()` inside a `DEV:` label (`routes-dev.ts:111–190`), and `build-server.mjs:31` greps the artifact for `dev-ladder`, `ladder.invalid` and `Bellamy`. **The demo cannot import it**; it shares the part that is machinery rather than cast (`Pen`) by moving it into a shipped module the ladder then imports.
- **The ladder is a stagehand, not a member**: it calls `cs.invite`, `cs.answer`, `bridge.proposeText`, `bridge.judge` directly. That is right for *history* (the past is written, not lived) and wrong for *bots* (members must speak the participant API — CLAUDE.md V1). So the demo's builder may be a stagehand and its bots may not.
- **The member command path is one route body** (`routes-member.ts:264–341`): pause check, applicant gate, lapse revival (:298), `runCommand` (:305) inside `commands.ts`'s whitelist, refusal logging (:283), `writes.commit` (:328). Nothing about it depends on HTTP after `readJson`, so it extracts cleanly into `applyCommand`.
- **The member read is two projections** — `view(doc.cs, memberId)` and `raceView(doc, memberId, nowMs)` (`routes-member.ts:220–257`) — both blind by construction (§3.5). A server-side bot reading through the same two sees exactly what a member's page sees.
- **Writes go through three stores per commit**: `DocStore.persist` (`store.ts:196`), `persistEngine` (`engine-host.ts:200`), and mail through `WritePath.relay` (`write-path.ts:247`) into `auth.flush` and `outbox.enqueue`. An in-memory document needs all three skipped — and nothing else.
- **The store keeps every document for ever and has no removal** (`store.ts:103–252`): no `delete`, `slugIndex` only grows. A reset needs a memory-only `retire` for ephemeral documents alone.
- **Cookies are per document id** (`routes.ts:142`, `cookieName`; `Max-Age` 90 days, `routes.ts:331`). Because the demo's id changes at every reset, a visitor's old cookie is simply a stranger's — no seat carries across a reset.
- **Joining without mail is legal in the module**: after 🍾, `cs.invite(t, email)` with no `by` succeeds while the Founder holds ✉️'s ✒️ (`session.ts:561–589`, `doorPen('door:invite')`); `emailOk` wants only a plausible shape, and the mailer refuses reserved TLDs (`mailer.ts:37`, `deliverable`) — so `@demo.invalid` addresses could never be sent even if D3 failed.
- **The stranger's door is `design/door.js`** (`STRCARDS`, :285–297): 📧 Log In and, where the door is open, 🪪 Apply/Join. *Try it* is a third card of the same kind.
- **The ladder bar is the pattern for the panel** (`session-view.html:9641–9705`, `ladderBar`): off the design system, bottom-left, every control a POST and a reload; it appears only where `devMail` rides the view (`live.js:1124`).
- **The CSP sets no `script-src`** (`server.ts:313–314`), so a vendored QR encoder served from `design/` loads like any page script.
- **The Anthropic SDK is a sim-harness dependency only** (`packages/sim-harness/package.json:25`); the server's one runtime dependency is `pg`. **Ruled (Q1535): the server takes `@anthropic-ai/sdk`**, bundled by esbuild into `dist/server.mjs`, as the simulator already uses it.
- **`llm-persona` and `persona-prompts`** (`packages/sim-harness/src/llm-persona.ts`, `persona-prompts.ts`) are the prompt shapes to model the bots on: a persona system prompt, a judge prompt over two options with their reasons, a draft prompt over a numbered document with the live rival lines, JSON-schema output, `indifferent` on any failure (*an API failure must not fabricate a preference*).
- **A proposal may already be several places at once.** `propose-text` takes `{ baseVersion, hunks: [{ start, end, lines, was }] }` — one to 200 hunks (`commands.ts:192`), each replacing the run of lines `[start, end)` with any number of lines, `start === end` an insertion; the engine requires them in order and non-overlapping (`validateHunks`, `engine-core/src/text/patch.ts:28–55`), and every hunk attests the wording it replaces (`attest`, `engine-core/src/text/attest.ts:56`). So a **session swap is one proposal of two hunks**; the ladder only ever proposes one hunk (`dev-ladder.ts:733`), and the demo's builder and bots build the multi-hunk case themselves.
- **`room-bots` is the behaviour to model the bots on** (`scripts/room-bots.mjs`, `tend` and `act`): answer what is owed, OK what is owed, then one weighted act — admit, judge, answer a motion, propose, move, withdraw. It is an HTTP script and stays one; the demo's bots port its policy, not its code.
- **Adoption is the ranking's top once the floor is met** (`races.ts:761`, `clearsFloor`; the floor `floorFor`, :94), and the floor counts **approvals** — members preferring the leader to the current text, the author's own derived preference among them. So with 👥 at three a seeded proposal stays live while it has at most two approvals (its author and one other), whatever else is judged; that is what the builder's `state:` judging keeps to (§3.3).

## 2. Architecture decisions

1. **The demo document is an `ephemeral document`**, not a persisted one with a reset that deletes. Reset makes a new generation with a fresh id (`d-demo-<6 hex>`) and retires the old from memory. No store deletion exists or is added.
2. **The preset is read at every reset, from disk** (`<designDir>/demo/pizzacon-2027.md`; ruled, Q1535), not embedded at build. Ed edits the file and presses Reset on a local server to see it — no rebuild; the production host has `design/` on disk (`DRAFT_DESIGN_DIR`, OPERATING §2), and a change to a `.md` under `design/` takes CI's full lane (OPERATING §3 step 4), so the host restarts onto the new file. A parse failure at reset **keeps the old generation** and reports in the panel; at boot it leaves the demo off and says so in `/healthz`. `demo-check` in CI makes both unreachable in practice.
3. **The bots run on the server**, in the host process, one timer loop per bot, acting through `applyCommand` and reading through `view`/`raceView` — never through `cs.*` or the bridge. They pause on heartbeat lapse, after ten minutes of running, at $3 of spend, and by ⏸️; they stop on reset, on the announced pause, and on a restart (their state is memory-only).
4. **The Claude call is server-side**, through `@anthropic-ai/sdk` bundled into the server (Q1535), key in `DRAFT_DEMO_ANTHROPIC_KEY` (a name of its own, so a key set for other tools never silently enables spending; unset ⇒ the panel says *no Claude key on this host* and ▶️ does nothing).
5. **The demo key rides a cookie**, set once by visiting `/d/demo?demokey=<key>`: the server compares the key in constant time (as `bearerOk`, `routes.ts:163`), sets `draft_demo=<exp>.<hmac(DRAFT_DEMO_KEY, 'demo'+exp)>` — `HttpOnly; Secure; SameSite=Strict`, a year — and 302s to `/d/demo`, taking the key out of the address bar. **Not the admin key**: issue #10 settled that `DRAFT_ADMIN_KEY` is never typed or held anywhere but the dashboard and CI; a browser holding it could pause every room.

## 3. The preset file — the contract (`design/demo/pizzacon-2027.md`)

Ed's file, hand-edited; the parser (`parsePreset`) and the check (`demo-check`) are what hold it. It lives under `design/demo/`, which the host never serves (`routes-surface.ts:76` admits top-level assets only, and `verify-deploy`'s *design notes do not serve* check covers the directory). It is document content, not surface copy: STYLE.md and `copy-check` do not read it, as they do not read the fixture's charter.

**The contract is shaped to Ed's own file**, not the other way round (Stage 1, 2026-09-24): his headings, his notes and his words for the fields (*Replaces*, *With*, *Reason*, *Proposer*, *As it was*, *Adopted*) are what the parser reads, and everything else in the file is prose the parser skips. The first draft of this section asked for a different layout (`### Author` headings, lower-case keys, the text before the decided changes); the preset was written first and reads better, so the parser moved.

### 3.1 Sections

Seven sections, each **opened by a marker line and closed by `<!-- @end -->`** — HTML comments, so they vanish in any markdown preview:

`<!-- @title -->` · `<!-- @text -->` · `<!-- @proposals -->` · `<!-- @decided -->` · `<!-- @insertions -->` · `<!-- @cast -->` · `<!-- @rules -->`

Each appears exactly once, in any order. **Everything outside a section is a note to Ed** — the headings, the introductions, the *things I am unsure about* — and is ignored. A marker is the whole line, trimmed; a line that looks like a marker (`<!-- @…`) and is not one of the eight is a parse error.

**`@title`** — one line: the document's title (🪶).

**`@text` — the programme as it stands at reset**, the decided changes already in it. Every non-blank line is one engine line, exactly as the product holds one block per line (CLAUDE.md `blocksOf`): `# ` · `## ` · `### ` a heading, `- ` a bullet, anything else a paragraph; inline `**bold**` and `*italic*` as the product reads them. **Blank lines are dropped**, so Ed may space the file for reading. The builder works the decided changes backwards to find the text as first published (§3.3).

**`@proposals`, `@decided`, `@insertions` — entries.** Inside these three a line is one of:

- blank, a heading (`#` … `######`, grouping for the reader only) or a note (a `> ` quotation — the *Contest* notes live here) — all skipped;
- an **entry opener**: a bold label alone at the start of the line, `**A1**`, optionally followed by ` — ` and free words (skipped);
- a **field**: `Name: value` at the start of the line, the name one of the list below, matched without regard to case; the value is one line when written after the colon, or **a run of lines** when the colon ends the line and the lines follow **indented by two spaces**, each one engine line;
- a **run line**: indented by exactly two spaces, under a field whose value is a run.

Anything else is an error (P3), so a mistyped field name is caught rather than skipped. A value or run line wrapped in one pair of backticks is read without them (Ed's own quoting style); a *Reason* wrapped in one pair of single asterisks is read without them.

The fields:

| Field | In | What it is |
|---|---|---|
| `Replaces:` (or `Place n replaces:`) | proposals, insertions | the run of lines a site replaces; must be followed by `With:` |
| `After:` | proposals, insertions | the line a site inserts after (`(start)` for the top of the document); followed by `With:` |
| `With:` | proposals, insertions | what the site puts there; `(delete)` removes the run |
| `As it was:` · `Adopted:` | decided | a decided site: what stood before, and the wording the room adopted (which is what `@text` holds) |
| `Reason:` | all | the proposer's rationale |
| `Proposer:` | all | the author, a cast member's name exactly |
| `State:` | proposals, insertions | `fresh`, `leaning` or `contested` (§3.3) |
| `Losing rival:` · `Rival reason:` · `Rival proposer:` | decided | optional: a rival wording that raced the adopted one on the same single site and lost |

**An entry is one or more *sites* plus a reason and a proposer** — because a proposal may change several separate places at once (a session swap is two), exactly as `propose-text` takes several hunks (§1). The sites of one entry may come in any order; the builder places them in document order, as the engine requires.

**`@cast` — the room; the bots are the conference's speakers** (Ed, 2026-09-24). One numbered line per person, as Ed wrote them: `1. **Name** — how they behave on the committee`. The name is the member's display name, set at reset; the rest of the line is the persona the bot is given. Exactly one line carries ` (founder)` after the bold name: the Founder's seat, **never a bot** — Ed sits in it. Every other cast member is a bot-seated member; the bots in a run are the first *n* in file order. A speaker's own sessions are the ones whose speaker line names them in bold, read off the text — the file does not repeat it.

**`@rules` — the settings the demo starts under.** One `id: value` line per setting, `id` a catalogue id (`catalogue.ts:128–371`), `value` one line of JSON validated by the catalogue's own `validateFor`, e.g. `rate: {"grant":3,"cap":3,"dripMinutes":2}`; notes as `> ` lines. **The demo's invariants are not the file's to change** — `ending` (never), `chamber` (public), `applications` (no), `admission` (pen) and the Founder keeping ✉️'s ✒️ — so a line may state an invariant at its invariant value, and naming one at any other value is an error. A setting the file does not name takes the builder's default (`DEMO_DEFAULTS` in `demo-build.ts`, printed by `demo-check`).

### 3.2 Parse and validation rules — each a named refusal

`parsePreset(text) → { preset, errors }` — every refusal names the file line and the rule, so Ed's editor can jump there, and `demo-check` prints every one, not the first.

| Rule | Refuses |
|---|---|
| P1 | a missing or repeated section; a section not closed by `@end`, or `@end` with none open; an unknown marker |
| P2 | `@title` not exactly one line; `@text` empty |
| P3 | a line the grammar cannot place (§3.1); a field outside an entry, or not allowed in its section; a site field without its `With:`/`Adopted:`, or one of those without a site before it; a missing `Reason:` or `Proposer:` (or `State:` outside `@decided`); a field given twice where once is allowed; a run line not indented by exactly two spaces; an empty value |
| P4 | **a `@decided` `Adopted:` run that is not verbatim a contiguous run of the text** as it stands with the later decided changes undone — every line compared after trimming only — so the builder can work each change backwards |
| P5 | **a `@proposals` or `@insertions` `Replaces:` run, or `After:` line, that is not verbatim in the text at reset** |
| P6 | **a site that matches in more than one place** (the run occurs twice — quote more lines, so it is unique) |
| P7 | two sites of one entry that overlap (the engine refuses them, `validateHunks`); a `With:` identical to what it replaces; an empty `With:` (write `(delete)`); more than 12 sites in an entry; a `Losing rival:` on an entry with more than one site |
| P8 | a `State:` outside `fresh · leaning · contested`; an `@insertions` entry with no `After:` site |
| P9 | `@cast` without exactly one founder; fewer than 4 bots; a line with no persona; two members with one name; a name over `LIMITS.name` (80, `commands.ts:45`); a `Proposer:` or `Rival proposer:` who is not in the cast |
| P9a | a proposal duplicating another's sites and wording exactly (the engine's dedup would refuse it — better told here) |
| P10 | a `@rules` id not in the catalogue, a retired setting (🤖 🌡️ 🪜, `retiredAnswer`), a personal one, an invariant at another value (§3.1), a value `validateFor` refuses, or a setting named twice |
| P11 | **the built document disagrees with the file** — `demo-check` then builds the preset in memory and asserts: every `@decided` entry adopted, and the text after them equal to `@text`; every `@proposals` and `@insertions` entry live with the number of hunks its sites say (none adopted by accident, none refused by the engine, none split); every `contested` entry holding a judgment against it; the cast all arrived under their preset names |

P11 is what stops a seeded proposal adopting by accident when Ed changes 👥 or the cast — the floor moves with them, and the only honest test is to build it.

### 3.3 What the builder does with each section

- **The text first published** is `@text` with the decided entries worked backwards, newest first: each `Adopted:` run put back to its `As it was:`. That text is what the Founder confirms before 🍾.
- **Decided entries** are adopted in file order, oldest first, one per stride of synthetic time: proposed by their proposer (and a losing rival by its proposer, on the same site), then judged by as many members as the floor needs, all preferring the adopted wording to the current text and to the rival.
- **Proposals and insertions** are then submitted, each one patch of as many hunks as it has sites, and judged by `State:`, **never past the floor**: `fresh` — nobody; `leaning` — one member approves; `contested` — one member approves and one or two prefer the current text (and, where the race holds rivals, they are judged against each other). The approver is never the author, and with the author's own derived preference that makes two approvals, which is under a 👥 of three. Rivals are whichever entries touch the same lines: the engine decides who races whom (SPEC §4), and the file does not say.
- **A seeded race with rivals is more than one vote from passing** (SPEC v0.142, Q1538; Ed's ruling 9 (b), 2026-09-25: *accept a slower demo*). Since v0.142 a leader passes only once it has been voted on directly against every live rival by that pair's own floor (R-142), and the builder does not seed those pairs, so a visitor's one approval no longer carries a multi-rival race: its rival pairs have to be voted too, and the router serves them next. As built, the three-way title race's leader stands at 2 of 6 approvals with 0 of its 2 rival pairs measured (the Q1538 builder's reading on the branch). `demo-check`'s P11 asserts *not adopted* and stays green; it does not assert *one vote from passing*.
- **The judges** are drawn from the cast in a fixed order, the author and the rival's author excluded, so a rebuild of an unchanged file is the same document.

**Guards:** `packages/server/test/demo-preset.test.ts` (each rule P1–P10 with a failing fixture string, and the real file passing); `demo-check` in CI's `ci` job beside `spec-check`.

## 4. Stages

Each stage is independently shippable and leaves the tree green. **A push is a deploy** (CLAUDE.md *Conventions*): every stage is committed freely and pushed only on Ed's word, never while a room is live.

| # | Stage | Ships to docs.vote as |
|---|---|---|
| 1 | The demo document: ephemeral, built from the preset, rebuilt at boot | a busy PizzaCon programme anybody can read at `/d/demo` |
| 2 | The demo key, the panel, Reset and the seat switch | Ed's controls, nobody else's |
| 3 | Visitors: *Try it*, the QR modal, one seat per device, the 30-minute seat lapse | one-tap joining from a phone |
| 4 | The bots, on the stub model | the bot machinery, heartbeat, pace and the pause, with no Claude yet |
| 5 | The Claude model, the dropdown, the spend cap | intelligent bots |
| 6 | Documents, names, and Ed's final preset | — |

### Stage 1 — the demo document

**Built.**
- `packages/server/src/history-pen.ts` — `Pen` moved verbatim from `dev-ladder.ts:245–269`, with `lastTOf` (:271); `dev-ladder.ts` imports it. The ladder's cast, charter and routes stay where they are and stay dev-only.
- `packages/server/src/demo-preset.ts` — `DemoPreset` type, `parsePreset` (§3), `presetPath(designDir)`.
- `packages/server/src/demo-build.ts` — `buildDemo(preset, nowMs, host) → { doc, built, skipped }`: creates an **ephemeral** document with id `d-demo-<6 hex>` and slug `demo` at `now − 3 h`; the founder is the cast's `(founder)`, addresses `<first>.<last>@demo.invalid`; then, through `Pen`, in the ladder's order: invite, arrive and name the cast; set the invariants, `@rules` and the builder's defaults; confirm the text first published; 🍾 with every power laid down **except ✉️'s ✒️** (`begin(t, laidDown)`, `session.ts:818`); adopt each `@decided` entry (§3.3), one per stride; then submit every `@proposals` and `@insertions` entry and judge by `State:`. Every seeded act is attributed to the entry's proposer. **Each entry becomes one patch of as many hunks as it has sites** — `sitesToHunks(sites, lines)` resolves every site to `[start, end)` on the current lines (an `After:` site to `start === end` one past its line), sorts them, attests each (`attest`, engine-core) and hands the whole set to `bridge.proposeText` (`engine-bridge.ts:413`) — the version read fresh before each, since a decided adoption moves it. The same function serves the bots (Stage 4), so a seeded swap and a bot's swap are one code path.
- `store.ts` — `LoadedDoc.ephemeral?: true`; `DocStore.createEphemeral(id, input, t)` beside `create` that registers without `persistence.createDoc`; `persist` advances its cursor and returns without touching the persistence when `doc.ephemeral`; `DocStore.retire(id)` removes an ephemeral document from `docs` and every slug it held from `slugIndex`, refusing a non-ephemeral id (throws).
- `engine-host.ts` — `persistEngine` returns at once for an ephemeral doc.
- `write-path.ts` — `commit`: an ephemeral doc skips `relay` outright, so no mail, no token and no outbox row is ever made (D3); `tick` ticks it like any document.
- `packages/server/src/demo.ts` — `Demo` (the host's one instance): `boot()` after `store.loadAll()` reads and builds the preset; **refuses to build if a persisted document already holds the slug `demo`** (it logs, sets `/healthz` `demo.state: 'slug-held'`, and serves nothing of its own — a real document is never shadowed); `generation`, `builtAt`, `state`.
- `config.ts` — `demo?: boolean` from `DRAFT_DEMO` (`off` switches it off; default on in `configFromEnv`) beside `botKey`/`adminKey`. A config that does not say is off, so tests build their own and no existing test's document count moves.
- `routes-admin.ts` — `/healthz` gains `demo: { state, generation, builtAt }` (no counts of people; public on the same argument as `documents`).
- `scripts/demo-check.mjs` (run under tsx) and `npm run demo-check` — §3.2's P1–P11, every failure printed; exit 1 on any.
- `design/demo/pizzacon-2027.md` — Ed's file, converted to the contract (§3): markers round its sections, the fields named in his own words, his §6 suggestions replaced by the rulings.

**Acceptance criteria** (file:line where each lands):
1. A dev server started with `DRAFT_DEMO` unset serves `/d/demo` with the preset's title at the head, the decided changes applied, and every seeded proposal a live race — asserted by `demo-check`'s P11 and by `demo-store.test.ts`.
2. **Nothing of the demo reaches the store**: over a full build, a reset and a run of commands, a spy `Persistence` records zero calls naming a `d-demo-` id — `appendDocLog`, `createDoc`, `appendEngineLog`, `writeBridgeState`, `saveToken`, `enqueue`.
3. A restart rebuilds a fresh generation at a new id (`demo.generation` counts builds within one process, so a restart starts it at 1 again and `builtAt` moves); `documents` counts it and `documentsQuarantined` stays 0.
4. With a persisted document holding the slug `demo`, boot leaves it serving and the demo off, `/healthz` `demo.state: 'slug-held'`.
5. `GET /api/slug/demo` answers `available: false` once the demo is built, so the birth cannot take it (`routes-auth.ts:37`, `slugFree` → `store.slugTaken`).
6. `dev-ladder.ts` imports `Pen` from `history-pen.ts` and `npm run ladder` is unchanged, green; `build-server.mjs`'s needles still find nothing.
7. **A seeded swap is one candidate of two hunks**: for every multi-site entry the engine holds one live candidate whose `patch.hunks.length` equals the entry's site count.
8. The spectator feed at `/d/demo/feed` serves the demo's decided changes, as for any document (Q1535).

**Guards.** `packages/server/test/demo-store.test.ts` (criteria 1–5, 7, 8); `demo-preset.test.ts` (§3.2); `demo-check` added to `ci.yml`'s `ci` job and to the gates CLAUDE.md names; `boot-guard` re-read, since boot now builds a document (measure, never assume).

**Documents to update** (scheduled, not done here): OPERATING §2 (`DRAFT_DEMO`), a new OPERATING §12 *The demo document* (what it is, D1–D8, how to take it off); OPERATING §5's *A copy carries…* (the demo is in no export, by construction); CLAUDE.md's *Conventions* gate list (`demo-check`) and glossary (`demo-preset-parse`, `demo-build`, `history-pen`, `ephemeral document`); PRODUCTION.md's stage table (a pointer row, as MOBILE.md has rows 17–18); CHANGELOG.md at the deploy.

### Stage 2 — the demo key, the panel, Reset and the seat switch

**Built.**
- `config.ts` — `demoKey` from `DRAFT_DEMO_KEY`, trimmed, empty ⇒ null (the `adminKey` shape).
- `packages/server/src/demo-access.ts` — the questions every demo route asks, in one module: `mintDemoCookie(key, nowMs)` and `demoCookieValid`: `<exp>.<base64url hmac-sha256(key, 'draft-demo.' + exp)>`, compared with `timingSafeEqual`, a year's expiry; `demoKeyMatches` (the typed passphrase, constant time); `hasDemoKey(ctx, req)`; `demoDoc(ctx)`, `isDemoDoc(ctx, doc)`; and **the guess lock** — `guessFailed` / `guessLocked`: five wrong tries a minute from one address lock it out of every key-checking row for five minutes, the right key included (Ed, 2026-09-24). The key is never logged: the request log and the error log drop the query.
- `packages/server/src/routes-demo.ts` — `demoTable`, spliced into `ROUTES` (`server.ts:59–72`) **before `surfaceTable`** so it claims `/d/demo?demokey=` ahead of the page row. Rows:
  - `GET /d/demo` **with** `?demokey=` — key right: set the cookie, 302 to `/d/demo`; wrong: counted against the address, then a plain 302 with no cookie (never say which), or 429 once the address is locked. Without `?demokey=` the row declines and the page serves as ever.
  - `GET /api/demo/panel` — the panel's readout: `{ generation, builtAt, seats, me, bots: {...} }` (the bot fields drawn and dark until Stage 4).
  - `POST /api/demo/reset` — stops the bots, reads the preset afresh (Q1535), `buildDemo` a new generation, `store.retire` the old, answers the new generation; a parse failure answers 422 with the error list and keeps the old.
  - `POST /api/demo/seat { member }` — the dev seat switch's body (`routes-dev.ts:240–262`) scoped to the demo document: the Founder's seat or any member's of the current generation, cookie set for it.
  - Every row: `ctx.cfg.demoKey` unset ⇒ 404 with an unknown path's body; cookie missing or bad ⇒ 401, counted as a wrong try, and 429 while the address is locked; POSTs carry the dev routes' Origin check (`devCrossSite`, `routes-dev.ts:36`) and `readJson`'s content-type gate.
- The view (`routes-member.ts:220`) carries `demoPanel: true` on the demo document only when the request bears a valid demo cookie — never a key, never on another slug.
- `design/demo.js` — the panel, a top-level surface file (so it rides the surface lane, `surface.ts:27`): built only when the view says `demoPanel`; bottom-left like `ladderBar` (`session-view.html:9641–9656`, `LADDER_STYLE`), off the design system, strings exempt from STYLE as the ladder bar's are (`T16-exempt` marker). Controls: **⏸️ / ▶️** · **count** (4 … the preset's bot cast) · **pace** (calm / lively / frantic, default lively) · **model** (Haiku 4.5 · Sonnet 5 · Opus 5.5) · **Reset** (confirm) · **QR** (Stage 3) · **seat** (Founder / each member), a line of readout (*bots: 8 lively · 142 acts · $0.31 of $3 · 6:12 of 10:00*). The bot controls are drawn and disabled until Stage 4.
- `live.js:1124` — beside `devInboxButton(); ladderBar();`, `if (data.demoPanel) DEMO.panel(env)`; `session-view.html`'s script block loads `demo.js` after `live.js`.

**Acceptance criteria.**
1. With `DRAFT_DEMO_KEY` unset, every `/api/demo/*` path is a 404 byte-identical to an unknown path's, and `/d/demo?demokey=x` sets no cookie.
2. With it set — a passphrase such as `oven-marble-quiet-harbour-seven` — a wrong key sets nothing; the fifth wrong try in a minute from one address is a 429 and locks it for five minutes, the right key included, on every key-checking row; the right key sets `draft_demo` `HttpOnly; SameSite=Strict` (and `Secure` over https) and redirects to a URL with no `demokey`.
3. Changing `DRAFT_DEMO_KEY` and restarting makes every previously minted cookie a 401.
4. Reset makes a new generation: the old id 404s through `store.byId`, the old member cookie reads the stranger's door on `/d/demo`, `/healthz` `demo.generation` moves.
5. The seat switch refuses any member not in the current generation.
6. **No route in `demoTable` accepts a document id or slug from the request**; a unit test walks every row and expects each to act on the demo alone.
7. The panel appears only in a browser holding the cookie; a stranger's and a visitor's page carry no `demoPanel`.

**Guards.** `packages/server/test/demo-key.test.ts`; `build-server.mjs` gains to `NEVER_IN_PROD` the stub model's class name and its two dev env names (`StubDemoModel`, `DRAFT_DEMO_STUB`, `DRAFT_DEMO_LAPSE_MS`, Stage 4); `verify-deploy.mjs` gains, beside the bot-outbox check: *the demo panel is closed to a stranger* (`GET /api/demo/panel` → 404 or 401, never 200; `POST /api/demo/reset` and `/seat` → 404/401/403, never 200; `GET /d/demo?demokey=wrong` sets no `draft_demo` cookie) and *the demo document serves* (`GET /d/demo` 200, `/healthz` `demo.state` `built`).

**Documents to update.** OPERATING §2 (`DRAFT_DEMO_KEY`: dashboard, `sync: false`, production and dev hosts with **different** values; rotation), §12 (how Ed sets his browser once); PRODUCTION.md's security section, a new table *The demo door (Ed, 2026-09-24) — a keyed door that ships by design*, in the shape of the Q1310 and issue #10 tables, with §0.2 as its argument; `render.yaml` declares `DRAFT_DEMO_KEY` `sync: false`.

### Stage 3 — visitors: *Try it*, the QR modal, one seat per device

**Built.**
- `routes-demo.ts` — `POST /api/demo/join` (public, no demo cookie): refuses unless the slug is the demo's; a generous per-IP limiter (§9, 1535 (c)); **no member cap** (Q1535); **one seat per device** — a browser already seated in this generation (its member cookie) is answered its own seat, never a second one; otherwise, on the demo document's clock, `cs.invite(t, '<rand>@demo.invalid')` (the Founder's ✉️ ✒️, `session.ts:561`) then `cs.arrive(t, id)` then `cs.setIdentity(t, id, { name, picture: null })` with a made-up name, the three grants pre-accepted (D7), commits, sets the member cookie (`setCookie`, `routes.ts:328`), answers `{ member, name }`. **This row is the host acting as the Founder's standing ✒️, the only stagehand act after the build**, and it acts on the demo document alone.
- **The visitor lapse** (D8, Q1535) — on the minute tick, a visitor seat whose last action is more than 30 minutes old leaves the document (`cs.resign`, the ordinary departure), so it stops counting in any quorum; its cookie then reads the stranger's door, and a rescan joins anew. Bot seats and the Founder's never lapse.
- The made-up name: `adjective + animal` from two lists in `demo-names.ts` (*Quiet Heron*, *Amber Otter*), drawn until it matches no member's name in the generation. Readable as a pseudonym, never a real person's name.
- `door.js` — `STRCARDS` (:285–297) gains `strtry` on the demo document (the view says `demo: true` — public, it is a public fact): glyph 👋, the card one sentence and one commit; the commit posts `/api/demo/join` and reloads into the seat. `?try=1` in the address opens `strtry` at load. `PAGE_COPY.strtry` in `design/copy.js`, through STYLE.md and `copy-check`.
- `design/demo.js` — the QR modal: `https://<host>/d/demo?try=1` drawn as SVG by a vendored MIT encoder `design/qr.js` (licence header kept; loaded on first open, never by a visitor's page), the address printed under it, Escape and a click outside close.
- **Size** — past a log-length ceiling (default 20,000 entries) the demo **resets itself** on the next minute tick and the panel says so. **Mail**: none, by D3.

**Acceptance criteria.**
1. A stranger's page at `/d/demo` shows *Try it* beside 📧 Log In; pressing it seats them as a member with a made-up name, no address prompt and the grants already accepted; the page reloads into the member surface.
2. Two phones joining get two different names, two seats, two cookies; a second join from one of them returns its own seat.
3. `?try=1` opens the card; the QR modal encodes exactly `https://docs.vote/d/demo?try=1` on production (decoded in the walk).
4. A visitor seat idle for 30 minutes leaves the document at the next tick; its old cookie reads the door.
5. **No join, and no act of a joined visitor, writes a token, an outbox row or a store row** (Stage 1 criterion 2's spy, extended).
6. On any other slug, `strtry` is never offered and `/api/demo/join` is a 404.

**Guards.** `packages/server/test/demo-join.test.ts`; the session-probe and setup-probe untouched (`strtry` exists only on a live demo document, not in the fixture); `copy-check` over `PAGE_COPY.strtry`; `demo-walk` (Stage 4) joins two seats.

**Documents to update.** SURFACE.md — E25's row gains *on the demo document, 👋 Try it*, and exception rows in §3 for D2, D7 and D8 (*the demo document seats a stranger without an address, pre-accepts their grants and lapses their seat — the demo is a sandbox — Ed 2026-09-24, Q1535*); §4's page keys gain `strtry`; CLAUDE.md glossary (`demo-qr`).

### Stage 4 — the bots, on the stub model

**Built.**
- `routes-member.ts` — **`applyCommand(ctx, doc, seat, cmd, args, nowMs)`** extracted from the `/cmd` body (:264–341): pause refusal, applicant gate, lapse revival, `runCommand`, refusal handling, `writes.commit`, the `null`-is-the-pause rule. The route becomes `readJson` + `applyCommand`. Behaviour unchanged, and the existing server tests are the proof.
- `packages/server/src/demo-bots.ts` — `DemoBots`: `start({ count, pace, model })`, `pause(reason)`, `resume()`, `stop(reason)`, `beat(nowMs)`, `stats()`. One loop per bot seat (the first *n* bot cast members). Each wake: read `view()` + `raceView()` as that member, do the housekeeping `room-bots`' `tend` does (answer owed questions, give owed OKs, ack releases and amendments), then one weighted act as `act` does — judge a dealt pair, answer a 🏛️ motion, propose, withdraw — **every write through `applyCommand`**, never `cs.*` or the bridge. What to propose and how to judge come from the `DemoModel`.
- **Pace** — the wait between one bot's acts, drawn uniformly: calm 60–120 s, lively 20–45 s, frantic 6–15 s; the first act of each bot staggered across the first interval so they do not arrive together.
- **The pause** (Q1535) — a run **pauses** (bots idle, ▶️ resumes, nothing is lost) on: the heartbeat lapsing — `POST /api/demo/heartbeat` (demo cookie) every 30 s from the panel while bots run, and a pause **120 s after the last beat** (`DRAFT_DEMO_LAPSE_MS`, read **inside a `DEV:` label** so a walk can shorten it and production cannot); **ten minutes of running** since the last ▶️; **$3 of spend** in the run (Stage 5); and ⏸️. It **stops** on Reset, on the announced pause (the first 503 from `applyCommand`), and when the process exits. No `pagehide` beacon: a reload would pause the room. No daily cap.
- `packages/server/src/demo-model.ts` — the interface: `judge(persona, card) → 'a'|'b'|'tie'` · `propose(persona, doc) → DemoProposal | null` · `answerMotion(persona, motion) → 'accept'|'keep'|'abstain'`, where **`DemoProposal` is one of two shapes**: `{ kind: 'rewrite', sites: [{ start, end, lines }], why }` or `{ kind: 'swap', a: { start, end }, b: { start, end }, why }` — **the host builds a swap itself**. Times stay in the `###` headings (Q1535), so a swap exchanges the two sessions' runs and **then writes each slot's time back into the heading that now stands in it**: the host's job, never the model's. Both go through Stage 1's `sitesToHunks`, are attested against the lines the model was shown, and are checked before sending (in range, non-overlapping, at most 4 sites, at most 12 lines a site); a proposal failing any is dropped, never sent. `StubDemoModel` — deterministic by a hash of seat and candidate id, **proposing a swap of two session blocks one time in four** so the walk exercises the multi-hunk path; reachable only through `DRAFT_DEMO_STUB=1`, **read inside a `DEV:` label**, and through `createServer`'s options in tests.
- The panel's bot controls come alive: ▶️ posts `/api/demo/bots { action: 'start'|'resume', count, pace, model }`, ⏸️ `{ action: 'pause' }`, the readout polls `/api/demo/panel` every 5 s.
- `scripts/demo-walk.mjs` and `npm run demo-walk` — against a dev server booted with `DRAFT_DEMO_KEY=walk`, `DRAFT_DEMO_STUB=1`, `DRAFT_DEMO_LAPSE_MS=10000`: (1) visit `?demokey=walk`, reset, assert the preset's counts on the page; (2) two cookie jars press *Try it*, each judges one dealt pair through the page; (3) start 4 stub bots at frantic, wait 60 s, assert the engine log grew by ≥ 20 events and at least one bot proposal, judgment and OK landed, **and at least one bot swap stands as a live two-hunk candidate with each slot's time in place**; (4) stop beating, wait 15 s, assert `bots.running: false` and no log growth over the next 20 s; (5) reset, assert both phone cookies are strangers. It calls `assert-server` first like every attaching walk.

**Acceptance criteria.**
1. The `/cmd` route and the bots share one path: `demo-bots.ts` imports `applyCommand` and nothing that mutates a session — `demo-bots.test.ts` greps its own module for `.cs.` calls other than reads and for the bridge, and fails on any.
2. A bot never sees what its member could not: every read goes through `view()` and `raceView()`, and a test asserts a bot's model input contains no author of a sealed proposal and no standing. (Every proposal is named in the demo, Q1535, so the author test is about the view, not the preset.)
3. Bots pause within `lapse + one wake` of the last heartbeat, at ten minutes, at the spend cap and on ⏸️; stop on Reset and on the announced pause; `stats().pausedBy` / `stoppedBy` names which.
4. The existing server test suite is green over both stores after the extraction, unedited.
5. `StubDemoModel`, `DRAFT_DEMO_STUB` and `DRAFT_DEMO_LAPSE_MS` are absent from `dist/server.mjs` (`build-server.mjs`'s needles, Stage 2).

**Guards.** `demo-bots.test.ts` (1–3, with a fake clock); `npm run demo-walk` in CI's `walks` matrix — a line in `scripts/ci-walks.sh`'s `doors` group, which already boots its own servers; `journey` unaffected.

**Documents to update.** OPERATING §12 (running and pausing bots, the heartbeat); CLAUDE.md glossary (`demo-heartbeat`, `demo-model`, `applyCommand`, `demo-walk`); CLAUDE.md *Conventions*' walks list names `demo-walk` in `doors`.

### Stage 5 — the Claude model, the dropdown, the spend cap

**Built.**
- `demo-model.ts` — `ClaudeDemoModel` through `@anthropic-ai/sdk` (Q1535), key `DRAFT_DEMO_ANTHROPIC_KEY`. Three calls, each **structured output** (a JSON schema, as `llm-persona.ts:44–56` does) and each failing safe — a judgment falls back to *indifferent*, a proposal to *nothing this turn*, never a fabricated preference (`llm-persona.ts:66`):
  - **judge** — system: the speaker's persona (their `@cast` line) and *you are one of this conference's speakers, on its programme committee, redrafting its agenda by pairwise judgments*; **partial to your own session, as a speaker is** (Q1535); user: the clause, the two wordings with their reasons and proposers (named, Q1535), the rival question's framing (`judgePrompt`, `persona-prompts.ts:74–93`). Output `{ choice, reason }`.
  - **propose** — system: the persona as above; user: the programme as numbered lines, **a list of its session blocks with their line ranges** (computed by the host: a heading and the lines under it until the next heading of its level or above), which of them are this speaker's own, the live proposals (*do not duplicate these*), and the kinds of change a programme committee makes — retitle a session, tighten an abstract, **swap two sessions**, move a session to another day, add a break, cut a bio to one line, add the odd light-hearted session — *keep headings headings, keep each slot's time where it is*. Output: `{ action: 'rewrite', sites: [{ start, end, lines }], why }` · `{ action: 'swap', a: [start, end], b: [start, end], why }` · `{ action: 'pass' }`, as one JSON schema with the action as a discriminator; validated like `validateDraftResult` (`persona-prompts.ts:118–138`) and turned into hunks by `sitesToHunks`.
  - **answer a motion** — rarely called; small.
  - **Prompt caching**: the system prompt plus the numbered programme is one stable prefix per generation, with `cache_control`; it changes only on an adoption. Check `usage.cache_read_input_tokens` against a real key once, by hand.
- **Models** — a table in `demo-model.ts`, the dropdown's source and the price book: **Haiku 4.5 `claude-haiku-4-5`, the default** (the alias, Q1535), Sonnet 5 `claude-sonnet-5`, Opus 5.5 `claude-opus-5-5`, each with its price per million tokens in and out as the Claude documentation states it when Stage 5 is built. Per-model settings (effort, thinking) as the documentation requires then.
- **Concurrency** — at most 4 calls in flight across all bots; a bot whose call is queued waits its turn.
- **The spend cap** (`demo-spend-cap`, Q1535) — every response's `usage` priced from the table and added to the run's total; **at $3 the run pauses** (`pausedBy: 'spend'`) and ▶️ starts a fresh run's total. **No daily cap.** The backstop is outside the host: the key lives in its own Anthropic Console workspace with a monthly spend limit Ed sets there.
- No key on the host ⇒ `claudeKey: false` in the panel readout; the panel draws *No Claude key on this host — the bots cannot start* and ▶️ stays dark.

**Acceptance criteria.**
1. With a key, 8 Haiku bots at lively for 10 minutes on the preset: every proposal lands or is refused with an ordinary reason (no malformed patch — `standDown` never fires), and at least one is a swap that lands as a two-hunk candidate; every judgment is *a*, *b* or indifferent; the run's spend readout agrees with the Console's usage for the workspace within 10% (measured once by hand, recorded in §6).
2. The spend cap pauses a run at the cap (a unit test with a fake model reporting usage).
3. The model dropdown changes the model for the next ▶️, never mid-run.
4. **No call to the Claude API in CI**: `ClaudeDemoModel` is constructed only when `DRAFT_DEMO_ANTHROPIC_KEY` is set, CI sets none, and `demo-walk` runs on the stub; a test asserts the constructor is never reached with the key unset.

**Guards.** `demo-model.test.ts` (schema validation, fail-safe fallbacks, pricing arithmetic, the cap) over a fake transport; the build's self-check still green with the SDK bundled.

**Documents to update.** OPERATING §2 (`DRAFT_DEMO_ANTHROPIC_KEY`; the Console workspace and its limit); §12 (the models, the costs of §6); CLAUDE.md glossary (`demo-spend-cap`); CLAUDE.md's `Persistence` entry (*`pg` is the only runtime dependency* becomes two, with the SDK).

### Stage 6 — documents, names, and Ed's preset

- Ed's edits to `pizzacon-2027.md`; `demo-check` green is the acceptance.
- This file's *Status* section written as the stages land, in MOBILE.md's manner.
- CHANGELOG.md's section for the deploy that ships Stage 1 (*New: a demo document at docs.vote/d/demo*) and each after, in the member voice (CLAUDE.md, the CHANGELOG row).
- README.md checked (packages and counts).
- The deferred register gains what was left out (a `pagehide` pause, a persisted spend ledger, per-visitor proposal caps) with their conditions to act.

## 5. How the pieces talk (for the builder)

- **Seats.** Ed: the demo cookie (panel) plus a member cookie for whichever seat he switched to. A visitor: a member cookie alone, one per device. A bot: no cookie at all — a member id inside the host, passed to `applyCommand`.
- **Time.** Built at `now − 3 h` through `Pen`; from then on the ordinary clock (`WritePath.tOf`) and the ordinary minute tick. No dev clock.
- **Memory.** One generation of the demo at a time; a retired one is dropped from `store` and garbage. The bots hold references by generation and stop on reset before the swap.
- **Restart.** A deploy or restart forgets everything demo-shaped — the document, the visitors, the bots, the run's spend — and boots a fresh generation. That is the intended behaviour, and it is why the bots cannot outlive a deploy.

## 6. Costs (estimates, to be replaced by the Stage 5 measurement)

Assumptions: a propose call reads ~5,000 input tokens (persona, the whole programme numbered, the live rivals) and writes ~300; a judge call reads ~1,500 and writes ~60; in a busy room about 55% of acts are judgments, 30% proposals and the rest OKs and motions that call no model. Prompt caching is **not** counted here; it should cut the proposal inputs by most of their cost once it holds.

| Run of 10 minutes | Model calls | Haiku 4.5 | Sonnet 5 | Opus 5.5 |
|---|---|---|---|---|
| 8 bots, lively (~150 acts) | ~130 | ≈ $0.45 | ≈ $0.90 | ≈ $2.30 |
| 8 bots, calm (~55 acts) | ~45 | ≈ $0.15 | ≈ $0.30 | ≈ $0.80 |
| 13 bots, frantic (~800 acts) | ~650 | ≈ $2.40 | ≈ $4.60 | ≈ $12 |

So the $3 cap (Q1535) lets any lively ten-minute run finish on any model and pauses a frantic Sonnet or Opus room part-way.

## 7. Risks

- **Anybody can write anything into a public document.** A visitor can propose offensive wording, and it is readable at `/d/demo` until it loses or Ed resets. **Reset is the remedy** (Q1535); nothing moderates.
- **A visitor may rename themselves as anybody** through ✋. The same answer.
- **A public, writable, never-persisted document is a memory lever.** The log-length self-reset bounds it; `demo-check`'s P11 bounds the build.
- **Bots may meet the engine's refusals often** (a race closed under them, a stale version). `applyCommand`'s race handling (Q1493 (a)) already tallies those; the bots retry once on a fresh read and move on.
- **The model may write something off-topic or unkind.** The persona prompts keep it on the programme; a reset clears it.
- **The demo shares the host with real rooms.** Thirteen frantic bots are about one command a second — measured headroom is ~140 acting bots on the starter plan (PRODUCTION.md *Measurements*, the moon rooms) — so the demo should never be run frantic while a real room sits; the panel says so beside *frantic*.

## 8. What this plan does not do

- No moderation, no per-visitor proposal cap beyond ⏱️'s, no persisted spend ledger.
- No change to the phase ladder's dev-only guarantee: `Pen` moves to a shipped module, but the ladder's cast, charter, routes and the dev clock stay behind `DEV:` and `build-server.mjs`'s needles hold them (Stage 1 criterion 6).
- No change to any other document's behaviour: every seam added (`ephemeral`, `retire`, `applyCommand`, `demoTable`) is inert for a persisted document, and the server suite runs unedited.

## 9. Rulings, and what is still open

**Ruled by Ed, 2026-09-24 (QUESTIONS.md 1535)** — folded into the stages above:

- The address is **docs.vote/d/demo**, with key-gated controls on the production host.
- Any visitor joins with one tap or by the QR code; **one seat per device** (the join cookie returns a device to its seat); **no member cap**; a visitor seat **lapses 30 minutes after its last action** (the member leaves; a rescan joins anew).
- **Reset is the remedy** for bad content; nothing moderates.
- **Visitors' powers (✏️ ⚖️ 🏛️ grants) arrive pre-accepted**; **nothing extra** in a quiet room.
- **Bots are the speakers**, server-side, **partial to their own sessions**; Claude **Haiku 4.5** by default (`claude-haiku-4-5`, the alias) with a dropdown (Sonnet 5 `claude-sonnet-5`, Opus 5.5 `claude-opus-5-5`); **Anthropic's SDK** (`@anthropic-ai/sdk`) bundled into the server; bot count and pace in the panel.
- **⏸️ / ▶️** in the panel; bots pause at **$3 per run**, after **10 minutes** of running, and **2 minutes** after the tab's last heartbeat; **no daily cap**.
- **Ed's seat switchable** between the Founder and a member.
- **The spectator feed** as for any document.
- **The preset read at every Reset.**
- **A slower demo accepted under v0.142** (Ed, 2026-09-25, Q1538 ruling 9 (b)): the seeded rival races are not re-seeded with their rival-pair votes (§3.3).
- **Times stay in the session headings** (`### 09:30 · Title`); a swap writes each slot's time back (Stage 4).
- The preset's rules as drafted except **every proposal signed** — named from the start, 👤 at *public* — and the wallet **3 up to 3** (R-083, unchanged), refilling **every 2 minutes**; **all three reorderings kept**; the clinic insertion and the invented names left as drafted.

**Still open** — numbered under 1535, recommendation first:

- **1535 (a) — Taking the slug now.** `docs.vote/d/demo` is free today and anybody could create a document there before Stage 1 ships; Stage 1 refuses to shadow a real document that holds it. *Recommend:* ship Stage 1 as the first push of this work; if a document takes the slug first, Ed decides whether to wipe it (`draft-tools`) or to pick another address. *Alternative:* a one-line reserved-slug list in `slugFree` (`routes-auth.ts:37`) pushed on its own.
- **1535 (b) — Refusals in the error log.** *Recommend:* demo refusals are counted in `/healthz` `demo.refusals` and never written to the error table, which an operator reads line by line (D6). *Alternative:* log them tagged `demo: true`.
- **1535 (c) — The per-IP join limiter.** A room of phones on one venue Wi-Fi shares one address. *Recommend:* 30 joins per IP per ten minutes, as the stranger budget was raised in #69 — enough for a room, a brake on a script. *Alternative:* none, since there is no member cap.
- **1535 (d) — Who the Founder is in the preset.** The cast is fourteen speakers and every one was drafted as a bot, but the Founder's seat is Ed's and must not be a bot. *Recommend (built):* **Professor Lucia Ferrante**, the programme chair, is the Founder — the chair convening the committee is the natural founder, her proposals (D2, G2, Decided 4) become the Founder's, and thirteen speakers remain bots. *Alternative:* a fifteenth cast member who is only the Founder (a programme office), keeping all fourteen speakers as bots.
- **1535 (e) — Screening what the bots write.** *Recommend:* no screening; the persona prompts and structured output keep it on the programme, and a reset clears a bad line. *Alternative:* a second, cheap model call that vetoes a bot proposal before it is sent.
- **1535 (f) — May a visitor ever be the Founder?** *Recommend:* never — the Founder's seat is reachable by Ed's seat switch alone. *Alternative:* a panel control to hand a visitor the Founder seat for the length of a demo.
- **1535 (g) — The size ceiling.** *Recommend:* the demo resets itself past 20,000 log entries (a busy hour is a few thousand). *Alternative:* no ceiling; Ed resets by hand. *Not built in Stage 3* (the branch has no ceiling): an automatic reset during a demo would throw away the room in front of it, and one evening's traffic is far below the figure.
- **1535 (h) — A lapsed visitor's departure news.** A visitor's lapse is a resignation, and every resignation owes the room a 🥾 departure card (SURFACE E31). *Built (the builder's call, 2026-09-24):* the host acknowledges that news for everybody as the seat lapses, so thirty phones leaving do not stack thirty 🥾 cards on the Founder's screen (SURFACE Y32). *Alternative:* the ordinary road in full — every member, the Founder included, OKs each visitor's departure.
- **1535 (i) — What counts as a visitor's action.** *Built:* the join and every command the visitor sends (a vote, a proposal, an OK) restart the 30 minutes; reading does not, so a phone left open on the page lapses too and next poll reads the door. *Alternative:* count the page's view polls as well, so a seat lives as long as its page is open.
