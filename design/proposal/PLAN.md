# The surface redesign — phase one (Q1541)

Ed, 2026-09-25, after the 🪶 title card showed four faults at once (the open tab grey, a standing block restating its clause, a 🗑️ with nothing to discard, the paper's edge moving on open): *if you think hard enough, you could do a better job designing the cards and the overall layout than I can.* This plan is the long autonomous run that answers him. It is written for builders who have none of that conversation.

**Precedence.** SPEC.md and SURFACE.md stay the rules until Ed amends them. This run **proposes**; it changes nothing a member can see. Where this plan and CLAUDE.md disagree on process, CLAUDE.md wins.

## Ed's three rulings (2026-09-25)

1. **Scope: the whole surface** — every decision-card kind, both rails, the topbar and wallets, the band, the desk and paper, the drawers and the phone's `task-sheet`, at 1600 and at 390.
2. **Freedom: free, but flag every break.** Design what is best. Every place the proposal contradicts a ruling in SURFACE.md, STYLE.md or CLAUDE.md is a numbered question: the ruling quoted with its label, why it existed (look it up in `design/DECISIONS.md` / `design/SPEC-REASONING.md`), what the change buys, what it costs, the recommendation first.
3. **Deliverable: mockups and a clickable prototype.** One review artifact, plus a prototype page Ed can click at 1600 and on his phone.

## The diagnosis this run starts from

Cards are assembled from parts that each decide their own presence, and the frame around them — dividers, spacing, the commit row, the tab, the paper — does not know what ended up inside. Every new condition can leave an empty slot, an orphan divider, a statement made twice, or a control with no job; each has been fixed one at a time with a guard for that one case (read CLAUDE.md's *Gotchas*: most of the design-system list is this). **The aim is a grammar in which that class of fault cannot be built**, and a surface a first-time member reads without being taught. Test the diagnosis; do not assume it.

Ed's standing observations to honour as evidence (not rulings): *two hairlines with nothing between them is a defect and should never appear*; *the tab you click does not move*; *card consistency is the battle*; the paper's edge must not move when a card opens; a card shows one thing (Q1367).

## Hard limits

- Work in the worktree `../draft-wt-redesign`, branch `redesign`, cut from main after the `title-card` branch has merged. Commit on the branch at the end of every stage. **Never push, never merge to main, never `git stash`.**
- **Write only under `design/proposal/`** (and QUESTIONS.md is not touched: the run's questions are `1541.1, 1541.2, …` inside its own files). Product files — `design/*.js|css|html` outside `proposal/`, `packages/`, SURFACE, SPEC, STYLE, CLAUDE.md — are read, never edited. The prototype copies what it needs into `design/proposal/proto/` and changes the copies.
- Edit with the Edit/Write tools; the tree is CRLF and `sed -i` / `perl -pi` strip it.
- Servers: `npm run design` for the fixture (open the address it prints; set `DESIGN_PORT` if the port is held, never kill a holder). A dev server for live-only cards: fresh port, fresh data dir, `npm run ladder -- --to=<rung>` to stand a document at each rung. Kill your own servers by port when done.
- Measure with numbers and the DOM first; screenshots where the question is visual (the review needs them). The browser-extension tab is backgrounded — rAF and transitions do not run; Playwright (as `card-audit.mjs` uses) does.
- Subagents run on Opus (`model: "opus"`), never Haiku.

## Stages

Each stage writes its output file, commits, and appends a dated line to `design/proposal/LOG.md` (what was done, what was found, what is next). A stage may be resumed from its file alone.

### 1. Inventory — `design/proposal/inventory.md` (+ `inventory.json`, `shots/current/`)

Open **every card kind in every state it has** at 1600×1000 and 390×844: run `npm run card-audit` (all `ALL_WALKS`) and `npm run card-audit:narrow`, and extend coverage by hand or by a throwaway script under `proposal/` for what the audit does not open (the ladder's rungs; `probe-coverage`'s `EXEMPT` list names the known gaps). For each: its SURFACE §9 row, the slots it draws in order (head, eyebrow, choices, standing/record block, provenance line, notes, commit row), every divider, every control and what it does in that state, every string, the tab and rail entry beside it, and a screenshot. Then the non-card zones the same way: topbar, wallets, both rails, band, desk and paper, drawers, sheet, edit mode, the door, the closed page.

### 2. Diagnosis — `design/proposal/diagnosis.md`

Every inconsistency found, grouped by **class**, each with evidence (inventory row, screenshot, file:line): orphan and doubled dividers; a fact stated twice; a control that does nothing in its state; the same idea drawn two ways on two cards; one thing drawn the same as a different thing; geometry that moves on open or across widths; spacing off the scale; copy that says the same thing in different words. Add the classes found in CLAUDE.md *Gotchas*, `design/DECISIONS.md` and QUESTIONS.md's open items. Count each class. Say which the grammar should make impossible and which only a check can catch.

### 3. Principles and grammar — `design/proposal/grammar.md`

- **Principles**: at most ten, each a sentence a reviewer can apply to a screenshot.
- **The card grammar**: a small fixed set of slots, what each may hold, its order, and the rule that a slot with nothing in it is not drawn **and takes its dividers with it** (dividers belong to the gaps between filled slots, never to a slot). One home for each kind of fact (the value, who set it, its history, what you can do). The commit row's rule: a control exists only while it has a job.
- **The layout grammar**: the zones, what each is anchored to, what may move and what may never move (the paper, the text column, a pressed tab), and how the phone maps onto the same zones.
- **Tokens**: which of the existing tokens survive, what merges, what is added. Prefer the existing type and spacing scales.
- **Each rule is written so a script could check it**, and names the check that would.
- **The map**: a table of every SURFACE §6/§8/§9 rule and STYLE rule the grammar touches → kept / restated / replaced / dropped. Every *replaced* or *dropped* is a **break**, and becomes a question in stage 6.

### 4. Mockups — `design/proposal/mockups.html` (+ `shots/proposed/`)

Every card kind and zone from the inventory, **current beside proposed**, at 1600 and at 390, in its commonest states and its worst (longest title, empty, most options, closed). Proposed cards drawn with the real tokens from `system.css`, Charis for the text face, the Hollow Oak fixture's words. A card that does not change says so rather than being omitted.

### 5. Prototype — `design/proposal/proto/`

A clickable copy of `session-view.html` on the Hollow Oak fixture (`?fixture=session`, `&band=1`, `&closed=1`, and the founding with no query) carrying the grammar: the shared files copied in and changed there, the page's own `<script>` block pointed at the copies. It must open, close and switch cards, show both rails and the phone's drawer and sheet, and it must be servable by `npm run design` at `/proposal/proto/session-view.html`. Not everything need work; what does not work is listed on the page itself. Then **run the grammar's checks against it** — a copy of `card-audit.mjs` under `proposal/` pointed at the prototype, with the stage-3 checks added (no orphan dividers, no slot drawn empty, no control without a job, the paper and column moving 0px on open, the pressed tab moving 0px) — and record the results. The prototype passing the checks and the current page failing them is the argument.

### 6. Critique and questions — `design/proposal/questions.md`

A fresh subagent (Opus), given only the principles, the mockups and the prototype, reviews it adversarially as a first-time member and as Ed: what is less clear than before, what got lost, what is inconsistent in the proposal itself. Fix what can be fixed; keep what cannot as findings. Then write **every question Ed must answer**, numbered `1541.1…` in one sequence: each break from stage 3's map, each design choice with real alternatives, each finding. Every item self-contained: the ruling or sentence quoted, the current and proposed screenshots named, the reasoning, the recommendation first. Separate **findings** (faults in the current page that any design should fix) from **questions** (genuine choices).

### 7. The review artifact and the build plan

- `design/proposal/review.html`: one page, led by a worked example (the 🪶 title card before and after), then the principles, the grammar, the mockups, the prototype's address and check results, the diagnosis's counts, and the numbered questions with an answer control each and *Copy all answers*. Follow the `artifact-design` skill; publish it with the Artifact tool, private.
- `design/proposal/BUILD.md`: phase two as a staged migration in MOBILE.md's shape — card families moved to the grammar one at a time, each stage with acceptance criteria, the checks that become guards (card-audit's new numbers), which probe references re-freeze and why, and what other work must wait while each stage touches the shared files.

## Stopping rules

- Finish all seven stages, or stop at the end of a stage with LOG.md saying why and what is next.
- **A decision only Ed can make does not stop the run**: write it as a question, take the recommended branch, and say so where it matters.
- Stop and report instead of guessing if the worktree, the servers or the fixture cannot be made to work after two honest attempts.
- The run never deploys, never pushes, never edits product files. Phase two begins only on Ed's answers.

## Report at the end

To the session that dispatched the run, concisely and without code blocks: what each stage produced, the diagnosis's class counts, the principles, the prototype's check results against the current page's, the number of questions and the five most consequential, the artifact's link, and anything not done.
