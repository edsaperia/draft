# Brief — Stage 3 of the convention fix plan (the page, plain defects — no ruling needed)

You are the one builder working in the main tree at `C:\users\edsap\dev\draft` (branch `main`). Nobody else is editing it. You have none of the planning conversation's context; everything you need is in the repo.

## Read first, in this order
1. `CLAUDE.md` (project conventions — the *Gotchas* and the *Conventions* sections especially; the Windows/CRLF traps).
2. `design/spec-pass/plan-convention-fixes.md` — **the contract**. Read *Rules for every stage* (all eight) and **Stage 3 (3a–3g)** in full. Earlier stages are done (the plan says what each settled — read those notes, they record traps); do not touch later stages.
3. In `QUESTIONS.md`, under *Spent numbers*: the blocks for **Q1483, Q1484, Q1485, Q1486, Q1487, Q1489 and Q1493** (`grep -nE "1483|1484|1485|1486|1487|1489|1493" QUESTIONS.md`). Each block is the diagnosis of record, with files, lines and the cure; the plan cites them and does not restate them. Where a block and the tree disagree about a line, re-read the code — Stage 2 has just changed `design/composer.js` / `design/live.js` / `design/session.js`, so read its commits first (`git log -6 --stat`).
4. The existing repro scripts you will model on: `scripts/repro/stale-key.mjs`, `scripts/repro/wrong-line-room.mjs`, `scripts/repro/proposer-feedback.mjs`, and `scripts/lib/walk.mjs` (the shared hands) and `scripts/lib/assert-server.mjs`.
5. The memory note on dev servers: start a walk server EXACTLY as `PORT=<p> DRAFT_BASE_URL=http://127.0.0.1:<p> DRAFT_DATA_DIR=<a fresh empty dir under the tmp folder> npm run server > <logfile> 2>&1 &` on a spare port (8240+), and give the walks `http://127.0.0.1:<p>` — **without DRAFT_BASE_URL the mailed links land on localhost, the cookie jar for 127.0.0.1 is empty, and journey fails *log in first* in ways that read as product bugs**; never pipe a server into `head`; run attaching walks strictly one at a time; `mail: "on"` in `/healthz` is normal; never `TaskStop` a tsx server — **kill it by port** when done (`netstat -ano | findstr :<port>` then `taskkill /PID <pid> /F`). Python is absent on this machine; use node.

## The evidence (never commit it, never paste members' words into a report)
`data/nh2026/errors.jsonl`, `log.jsonl`, `engine.jsonl` — gitignored, real people's words. `node scripts/repro/nh2026-refusals.mjs` rebuilds all 98 versions of the text. Use them to get the exact shapes (line numbers, hunk spans, base versions); in scripts and reports use your own fixture text.

## The work
Build **3a, 3b, 3c, 3d, 3e, 3f, 3g** exactly as the plan's Stage 3 states them, in that order, **one commit per item**. Each names its guard (a journey step, a `scripts/repro/` case going green, a new walk for 3b composing a settings motion with real key presses — check `design/REPORT-xbrowser.md` for whether WebKit is installed — and `npm run drawer-walk` for 3e). **3f builds only what both rulings of Q1485 share** and leaves the rest to Stage 4; **3e does not recolour anything** (the red is Stage 4b). 3b lives under a focused field: plan rule 6 is the whole job there. If an item turns out to be already cured by Stage 2's changes, prove it with its guard red on the pre-Stage-2 file and green now, and say so.

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
