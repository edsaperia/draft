# Brief — Stage 4 of the convention fix plan (the page, as Ed ruled it on 2026-09-21)

You are the one builder working in the main tree at `C:\users\edsap\dev\draft` (branch `main`). Nobody else is editing it. You have none of the planning conversation's context; everything you need is in the repo.

## Read first, in this order
1. `CLAUDE.md` (project conventions — the *Gotchas* and the *Conventions* sections especially; the Windows/CRLF traps).
2. `design/spec-pass/plan-convention-fixes.md` — **the contract**. Read *Rules for every stage* (all eight) and **Stage 4 (4a–4f; 4c is nothing to build)** in full. Earlier stages are done (the plan says what each settled — read those notes, they record traps); do not touch later stages.
3. In `QUESTIONS.md`, under *Spent numbers*: the blocks for **Q1484, Q1485, Q1486 and Q1493**, and the paragraph beginning **"Ed's rulings on the convention's open picks, 2026-09-21"** — Ed's own words are quoted there and in the plan; they are the spec for this stage. Also `SURFACE.md` K17–K18, §6 (the *stranded* row), §7, §9 (*mine (proposed)* row, L5) and `design/STYLE.md` §6 for the new mail. Stage 3 has just changed the same files — read its commits first (`git log -10 --stat`).
4. The existing repro scripts you will model on: `scripts/repro/stale-key.mjs`, `scripts/repro/wrong-line-room.mjs`, `scripts/repro/proposer-feedback.mjs`, and `scripts/lib/walk.mjs` (the shared hands) and `scripts/lib/assert-server.mjs`.
5. The memory note on dev servers: start a walk server EXACTLY as `PORT=<p> DRAFT_BASE_URL=http://127.0.0.1:<p> DRAFT_DATA_DIR=<a fresh empty dir under the tmp folder> npm run server > <logfile> 2>&1 &` on a spare port (8240+), and give the walks `http://127.0.0.1:<p>` — **without DRAFT_BASE_URL the mailed links land on localhost, the cookie jar for 127.0.0.1 is empty, and journey fails *log in first* in ways that read as product bugs**; never pipe a server into `head`; run attaching walks strictly one at a time; `mail: "on"` in `/healthz` is normal; never `TaskStop` a tsx server — **kill it by port** when done (`netstat -ano | findstr :<port>` then `taskkill /PID <pid> /F`). Python is absent on this machine; use node.

## The evidence (never commit it, never paste members' words into a report)
`data/nh2026/errors.jsonl`, `log.jsonl`, `engine.jsonl` — gitignored, real people's words. `node scripts/repro/nh2026-refusals.mjs` rebuilds all 98 versions of the text. Use them to get the exact shapes (line numbers, hunk spans, base versions); in scripts and reports use your own fixture text.

## The work
Build **4a, 4b, 4d, 4e, 4f** exactly as the plan's Stage 4 states them, in that order, **one commit per item** (SURFACE/STYLE amendments ride in the item's own commit; rule labels are never renumbered). SPEC.md is NOT amended in this stage — if an item seems to need a SPEC change, stop that item and report. 4a moves the copy golden and journey's propose steps: run `npm run copy-freeze`, read the diff, and do NOT re-freeze the probe references (say in the report which probe steps now differ and why). 4b: colour is the only signal by Ed's choice; check the contrast figure with `npm run a11y-audit` and report it. 4d: if the member view does not serve the wallet's next-drip moment, add the field to the view in `packages/` (a server/constitution test guards it) rather than recomputing the drip on the page. 4e and 4f are full-lane (server) changes and need server tests. The draft sentence in 4a (*Proposed — the members are deciding*) is a draft: keep it unless STYLE.md forbids it, and list every new member-readable string in your report so Ed can read them in one place.

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
