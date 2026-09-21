# Brief — Stage 5 of the convention fix plan (the error log survives a deploy; the page reports its own errors)

You are the one builder working in the main tree at `C:\users\edsap\dev\draft` (branch `main`). Nobody else is editing it. You have none of the planning conversation's context; everything you need is in the repo.

## Read first, in this order
1. `CLAUDE.md` (project conventions — the *Gotchas* and the *Conventions* sections especially; the Windows/CRLF traps).
2. `design/spec-pass/plan-convention-fixes.md` — **the contract**. Read *Rules for every stage* (all eight) and **Stage 5 (5a, 5b)** in full. Earlier stages are done (the plan says what each settled — read those notes, they record traps); do not touch later stages.
3. In `QUESTIONS.md`, under *Spent numbers*: nothing new — but read `docs/OPERATING.md` §5, §7 and §11, `packages/server/NOTES.md`, `packages/server/src/persistence*.ts` (the `Persistence` / `MaintainablePersistence` seam), how `errors.jsonl` is written today (`grep -rn "errors.jsonl|noteError" packages/server/src`), `docs/legal/PRIVACY.md`, and how the Postgres tests run locally (they may be skipped without a database — say so in the report if so).
4. The existing repro scripts you will model on: `scripts/repro/stale-key.mjs`, `scripts/repro/wrong-line-room.mjs`, `scripts/repro/proposer-feedback.mjs`, and `scripts/lib/walk.mjs` (the shared hands) and `scripts/lib/assert-server.mjs`.
5. The memory note on dev servers: start a walk server EXACTLY as `PORT=<p> DRAFT_BASE_URL=http://127.0.0.1:<p> DRAFT_DATA_DIR=<a fresh empty dir under the tmp folder> npm run server > <logfile> 2>&1 &` on a spare port (8240+), and give the walks `http://127.0.0.1:<p>` — **without DRAFT_BASE_URL the mailed links land on localhost, the cookie jar for 127.0.0.1 is empty, and journey fails *log in first* in ways that read as product bugs**; never pipe a server into `head`; run attaching walks strictly one at a time; `mail: "on"` in `/healthz` is normal; never `TaskStop` a tsx server — **kill it by port** when done (`netstat -ano | findstr :<port>` then `taskkill /PID <pid> /F`). Python is absent on this machine; use node.

## The evidence (never commit it, never paste members' words into a report)
`data/nh2026/errors.jsonl`, `log.jsonl`, `engine.jsonl` — gitignored, real people's words. `node scripts/repro/nh2026-refusals.mjs` rebuilds all 98 versions of the text. Use them to get the exact shapes (line numbers, hunk spans, base versions); in scripts and reports use your own fixture text.

## The work
Build **5a** then **5b** exactly as the plan's Stage 5 states them, one commit each. 5b is a privacy-bearing route: send ONLY what the plan lists (kind, message, source file and line, seat, build, the address's path), rate-limited per seat, capped in length, **never any text a member typed** — truncate and strip anything that could carry it, and have a server test prove the limits. It is a production route (not under the `DEV:` label), so `scripts/build-server.mjs`'s artifact checks and `verify-deploy` must still pass; read how `checkCommands` in spec-check treats a new route.

## Rules that bite (from the plan, restated because they are the ones builders break)
- **Files are CRLF. Use the Edit tool for every source edit.** Never `sed -i`, `perl -pi`, PowerShell `Set-Content`. In Git Bash, `grep -c $'\r'` lies (it strips CRs) — check endings with node if you must. New files: write them CRLF to match their neighbours. `git diff --ignore-cr-at-eol --stat` before every commit; a whole-file diff means you broke the endings.
- **See each guard red on the pre-fix tree first**, and say in the report what it printed when red. To run a guard against the pre-fix page, copy your fixed file aside, `git show HEAD:<path> > <path>`, run, copy back. **Never `git stash`.**
- **Nothing renders under a caret, a focused field or a press** (plan rule 6). Your fixes live in exactly that code.
- One commit per finding, house style (`git log --oneline -8` — a long descriptive sentence-style message saying what was wrong, why, and the guard), via `git commit -F <file>` from the Bash tool. End every commit message with these two lines exactly:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01UL5ygq9ba5GN6MFukJNuxz
  ```
- **Never push. Never deploy.** Never touch `data/nh2026/`. Do not run `qa:freeze` or `probe --update`; do not re-freeze the probe references (the setup-probe's 19 👥 diffs are known and intended). If you change `design/copy.js`, run `npm run copy-freeze` and read its diff — only your strings may move.
- **The seven gates before you report green**, run sequentially, `npm test` ALONE with nothing else running beside it (its heartbeats time out under load): `npm test`, `npm run lint`, `npm run typecheck`, `npm run spec-check`, `npm run copy-check`, `npm run clock-check`, `npm run build`. Then `npm run journey` against your fresh dev server, and `node scripts/repro/stale-key.mjs` and `node scripts/repro/focus-steal.mjs` (they guard the same machinery you are changing).
- A finding that needs a decision **stops and is reported** with the readings as options (plan rule 7). Do not implement a reading on spec.
- If you add a named part or a guard, CLAUDE.md gets **one line** under *Gotchas* (the failure, and the guard that catches it) — no paragraphs; `npm run spec-check` holds the shape.

## Your report (plan rule 8) — this is what I read, so make it complete
For each item separately: root cause by `file:line`; what changed by `file:line`; each guard, the command that runs it, and what it printed red; each gate's result with counts; walks that could not run and why; anything else you found on the way (file it, do not fix it). State the commit hashes. If you stopped under the no-repro clause, say so in the first line.
