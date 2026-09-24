# Plan — the leader measured against its rivals (A) and ranked inside the Smith set (B)

**Written 2026-09-24 15:49 by a planning subagent, read-only against `main` at `f839ac12` (Q1534 merged: SPEC v0.141, R-141).** For a builder with none of this conversation's context. **Nothing here is built. The builder never pushes** — a push to `main` is a deploy (CLAUDE.md, *Conventions*).

**Precedence.** SPEC.md wins over this plan once the amendment in §3 is folded; until Ed signs that amendment off, **SPEC v0.141 is the rule and this file is a proposal**. SURFACE.md wins over this plan on anything a member sees. Where this plan and the code disagree about *what the code does today*, the code wins and the disagreement is a finding for the hand-back. This file cites; it does not restate — a rule already written in SPEC, SURFACE or R-nnn is pointed at, not copied.

**Where it should live once committed.** Recommend `design/spec-pass/plan-q1538-rivals-and-smith.md`, after claiming **Q1538 (A)** and **Q1539 (B)** in QUESTIONS.md's *Spent numbers* (the next free number is 1538 at `QUESTIONS.md:255`) and committing that claim alone. The `plan-q14xx-*.md` files already in `design/spec-pass/` are the precedent: the plan is deleted at the fold, its reasoning going to R-142/R-143 and `design/DECISIONS.md`. The questions in §9 are numbered 1–12 here; the coordinator re-numbers them onto claimed project numbers (1540 onward) when filing, since a number is claimed only by writing it into QUESTIONS.md.

---

## 1. The two proposals, in plain terms

**Today** a clause with several rival wordings is decided by one statistical ranking (the "fit") over every vote cast in it. The fit fills in any head-to-head question nobody was asked by assuming preferences are consistent ("if X beats the current text by more than Y does, X probably beats Y"). And the router rarely *asks* the head-to-head questions between rivals: it serves each proposal against the current text first (Q1439's decisive pair), it holds rival pairs back until some challenger looks likely to win (the rival gate, SPEC §8.3), and it never asks a pair whose answer the fit thinks it already knows (SPEC §5.3). Ed's observation — *people are served surprisingly few non-status-quo pairs* — is this, seen from a seat.

Two things go wrong because of it, and this plan's scripts measured both with the repo's own fit (§2):

- **A hidden better rival.** X and Y both beat the current text, X by more. Nobody is asked X against Y; the fit assumes X would win; X passes. In fact, asked, 10 of 15 members prefer Y. **Proposal A fixes this**: before a wording passes, it must have been voted on directly against every live rival in its race, by enough members (the same quorum as against the current text), or the result must already be beyond changing. While that is short, the wording waits, live and votable, and the router asks those pairs next.
- **A clone lifting a loser.** X loses to the current text 7–8. Someone files Y, a clumsier copy of X that everybody ranks just below X. Now X "beats" Y 14–1, and the fit, which rewards beating things, lifts X over the current text — X passes, though 8 of 15 preferred the current text to it and nothing changed their minds. **Proposal B fixes this**: before the fit chooses, the engine builds the plain head-to-head table and finds the **Smith set** — the smallest group of wordings that each beat every wording outside the group head to head. The winner is chosen by the fit **from inside that group only**. In the clone case the current text beats both X and Y, so the group is the current text alone, and it stands.

Everything else stays: the quorum (the floor), the tie rule, routing by value, certification, deadlock, the batch. Most races have one proposal; **for those, neither A nor B changes any decision** (§4.1 and §6.1 prove it and pin it in tests). What does change for them is the progress bar, which Ed has ruled must never fill and then fail to pass (§5).

**The parts, named** (Ed's *name the parts*; for CLAUDE.md's glossary at the fold, §8):

| Name | What it does |
|---|---|
| `measured pair` | a head-to-head pair that counts: answered by its own floor's worth of members, or *settled* (no answer still to come could flip it) |
| `rival-measure` | proposal A's wait: a leader passes only once its pair with every live rival is a measured pair |
| `measure-serving` | the router's second priority: the leader's unmeasured rival pairs, right after Q1439's decisive pair |
| `pair table` | the head-to-head table built from each member's latest votes, one cell per measured pair |
| `smith-set` | the wordings (current text included) that reach every other wording through measured results they did not lose |
| `smith-rank` | the field's order: the Smith set above everything else, the fit's order within each part — what "the top of the ranking" means from v0.142 |
| `meter-need` | the progress bar's new denominator: every vote the rules still require on the pairs the leader waits on |
| `measured-note` | the record's line for a wording passed at the close before it was measured against every rival |
| `ranked-note` | the record's line where the wording that stood shows a lower percentage than one that lost |

---

## 2. The worked numbers, reproduced

Throwaway scripts in the scratchpad (`smith-check.ts`, `smith-check2.ts`, not in the repo) import `fitDavidson` from `packages/engine-core/src/ranking/davidson.ts` — the very function `races.ts:1027` fits every race with — and feed it complete ballots.

**The clone case (B's motivation) reproduced exactly.** 15 members: 7 X>Y>cur, 7 cur>X>Y, 1 cur>Y>X. Head to head: cur beats X 8–7, cur beats Y 8–7, X beats Y 14–1 — cur is the Condorcet winner, no cycle.

| Field fitted | Strengths (repo fit) | What adopts today |
|---|---|---|
| {cur, X} | cur **0.070**, X **−0.070** (ν 0.162, converged) | nothing — the current text is on top |
| {cur, X, Y}, every pair asked | X **0.594**, cur **0.100**, Y **−0.694** (ν 0.088; P(X beats cur) 0.863) | **X** — a wording 8 of 15 preferred the current text to |
| {cur, X, Y}, only the pairs against cur asked | cur 0.092, X −0.046, Y −0.046 | nothing |

Every figure Ed pasted matches to three decimals. The third row is worth Ed's attention: **today the clone only bites when the rival pair is asked — which is exactly what proposal A makes happen.** A without B would make the clone problem *more* frequent; that is the strongest argument for building both, and for the sim study before merging either (§7).

**The hidden-rival case (A's motivation).** 3 X>Y>cur, 1 X>cur>Y, 5 Y>X>cur, 1 cur>X>Y, 5 cur>Y>X. Head to head: X beats cur 9–6, Y beats cur 8–7, **Y beats X 10–5** (Y is the Condorcet winner).

| Field fitted | Strengths | Top |
|---|---|---|
| only the pairs against cur asked (today's usual serving) | X 0.226, Y −0.041, cur −0.185 | **X** passes |
| every pair asked (A) | Y 0.275, X −0.092, cur −0.183 | **Y** |

A alone fixes this one; B agrees (the Smith set is {Y}).

**The known limitation (for R-143, stated honestly).** A genuine cycle, 5 cur>X>Y, 5 X>Y>cur, 5 Y>cur>X — every pair 10–5, round the circle. The fit reads all three level (0.000 each), and a tie leaves the current text standing. Add Y2, a copy of Y everybody ranks just below Y: Y 0.534, X 0.175, cur −0.175, Y2 −0.534 — **Y passes**. Clone X instead and X passes (0.534). All four wordings are in the Smith set (it is one cycle), so B cannot help: **inside a genuine cycle, filing a clone of your own wording still tips the fit toward it.** Schulze or ranked pairs would not be moved by the clone; both replace the fit's decision outright, and §9 question 11 asks whether Ed wants that conversation now (recommendation: no).

---

## 3. The SPEC amendment (v0.141 → v0.142), as it would read

Written in SPEC's own register — bold rules, `→ why:` pointers, no history. **Only the changed sentences are given**, each with the sentence it replaces or follows. The builder folds these at Stage 6; spec-check must stay green (`→ why: R-142`, `R-143` must resolve, so the two R entries land in the same commit).

### §4.2 Adoption

*Replaces* "A race adopts X when X is the top of the ranking — its fitted strength above the current text's, equal within the fit's noise being a tie, and **a tie leaves the current text standing**, the one asymmetry that survives — and **≥ F members have approved X**. With rivals in a cycle … There is no bar. → why: R-114, R-115" with:

> A race adopts X when X is **the top of the ranking**, **≥ F members have approved X**, and **X has been measured against every live rival in its race**. **The ranking is read inside the race's Smith set**: from each member's latest judgment of each pair, a wording **beats** another when more of the members who preferred one of the two preferred it — counted only once the pair is **measured**: answered by F of the members that pair is waiting on (the floor below, read on that pair's own group, §8.2), or **settled**, its lead larger than every member of E who has not answered it. A pair not yet measured, or level, is a result for neither. **The Smith set** is every wording in the field — the current text among it — that reaches every other wording through a chain of measured results, none of which it lost at its own link; and **the top of the ranking** is the member of the Smith set the fit rates strongest, its fitted strength above the current text's where the current text is in the set, equal within the fit's noise being a tie, and **a tie leaves the current text standing**, the one asymmetry that survives. **Until some wording reaches every other through measured results the Smith set is empty**: the fit's order stands for the ranking, and nothing is carried. So a wording a direct majority preferred the current text to is never carried over it by rivals the current text also beat. **With the field in a genuine cycle the fit still resolves inside it**, by weight of evidence, and the wording it puts on top may be one a direct majority preferred the current text to, and a near-copy of one wording in the cycle can tip it: an accepted property of the rule, not a defect. There is no bar. → why: R-114, R-115, R-143 **Measured against every rival**: while any pair of X against a live rival in its race is short of measured, X waits, live and judgeable — a rival the batch will close (§4.4) is not waited on, and a race of one candidate waits on nothing. → why: R-142

*Replaces* "At close, each race renders the leader that is on top and has met the floor; margins go in the record; exact ties break deterministically by hash." with:

> At close, each race renders the leader that is on top and has met the floor **on the evidence it has**: the wait for rivals is waived, and a pair short of measured is a result for neither in the Smith set; margins go in the record, and **so does how many of its live rivals the winner was measured against**; exact ties break deterministically by hash. → why: R-142

### §4.4 Incumbency and certification

*Follows* "…which is also what makes it impossible to close a race's own leader." :

> **The ranking both guards read is §4.2's** — the Smith set above the rest of the field, the fit's order within each — so a wording outside the Smith set is not protected by a fitted strength above the current text's, and a rival pair or an abstention that moves the Smith set can close a wording with no judgment of its own: a domination arrives when a judgment does **or when a silence runs its period** (§8.2). → why: R-132, R-143

### §4.6 The close — first row of the table

> | every race whose leader is on top and has met the floor | a **final adoption batch** runs regardless of cooldown phase; the ready set snapshots at T=0; **the wait for rivals is waived** (§4.2) | an adoption like any other, **stating how many of its rivals the winner was measured against** | §4.2, → why: R-142 |

### §5.3 Lateral

*Replaces* "Active sampling never schedules a pair whose outcome the model already implies." with:

> Active sampling never schedules a pair whose outcome the model already implies — **except a pair §4.2 waits on**, which is a question the room answers and not one the model may answer for it. → why: R-142

### §8.2 Floors — the silence paragraph

*Replaces* its last sentence "Near adoption the router asks the unheard **the leader against the current text first**: … → why: R-127" with:

> Near adoption the router asks the unheard **the leader against the current text first**, **then the leader against each live rival short of measured, oldest rival first, then the current text against any rival that beats the leader head to head** (§4.2): they are asked at the moment their silence would be foreclosed. **Every pair §4.2 measures waits on its own group** — the members of E who have answered it, and those who have not and whose 💤 period, run from the later of the moment the pair as it stands became answerable and their own arrival or return, has not run out — and *Indifferent* leaves a pair's group as it leaves the leader's. → why: R-127, R-142

### §8.3 Mechanics

*Replaces* "…closeness-to-resolution as a single number — the leader's judges over the floor, → why: R-118 — newness, mine" with:

> …closeness-to-resolution as a single number — **the votes cast on every pair the leader waits on, over the votes those pairs still need**: the leader against the current text counted to its floor, and once there always needing one vote more than it has; each rival pair short of measured counted to its own floor, a measured one complete. A magnitude and never a direction, it grows when a rival arrives and is never full on a live race. → why: R-118, R-142 — newness, mine

*Follows* "Deadlocked races leave the judgment stream — but only per-participant, and only once the race has nothing left to ask that participant (§8.3b)":

> **— and a race is never deadlocked while a pair §4.2 waits on is short of measured and a member of its group could still answer it.** → why: R-142

*Follows* the rival-pair paragraph's "…before that, incumbent-involving pairs dominate the race's sampling. → why: R-071":

> **Once it does, the leader's own rival pairs short of measured come before any other rival pair** (§8.2). → why: R-142

### Front matter and elsewhere

- Version line `SPEC.md:1` → v0.142.
- **§9.6 (ordinary motions)** needs no sentence if Ed takes question 4's recommendation: a setting race *is* a race, and §4.2 already governs it. If he rules otherwise, §9.6 gains one exclusion sentence.
- **§1 item 2 (the record)** gains nothing: "the fitted ranking with confidence" stays true; the Smith set is a reading of it.
- **Appendix A** gains no row: there is no new tuning constant. The floor is the room's (Ed's coverage ruling: *the floor, settled-early allowed*).
- **§13's ledger**: no row, provided the SPEC fold and the build land together (Stage 6). If Ed signs v0.142 off before the build merges, every new sentence above is a promise the tree does not hold and needs a ledger row until it does (CLAUDE.md's Documents table, SPEC row).

### Draft R-142 — for `design/SPEC-REASONING.md`

> **R-142 The leader is measured against its rivals before it passes** (SPEC v0.142, Ed 2026-09-24, Q1538). The rival gate (R-071), active sampling's refusal to ask a pair the model already implies (§5.3) and Q1439's decisive pair (R-127) each made sense alone, and together they meant a leader was almost never put directly against its rivals: the fit filled those pairs in by transitivity, which is exactly the inference a clone or a cycle breaks. Ed, from the seat: *at the moment I feel like people are served surprisingly few non-status-quo pairs.* So before a race carries its leader, the leader's pair with each live rival must be **measured** — answered by the pair's own floor (§4.2's F, read on that pair's group, the seconder included), or settled, its lead beyond every member of E still to answer, which is R-132's rival count used the other way round. The floor rather than a smaller number because it is the one number the room chose, and *settled early* because a pair already beyond changing needs no more asking (Ed's rulings, 2026-09-24). A rival the batch is about to close is not waited on — it is leaving. **The router asks those pairs next**, after the decisive pair and only once the rival gate is open, since before that no challenger is near passing. **The bar counts them**: Ed ruled that *the progress bar must not fill and then fail to adopt* and that it should count every action still needed, conservatively, with no explanatory line instead; so the meter's denominator is every vote the rules still require on those pairs, the pair against the current text always wanting one more once at its floor — which keeps the bar direction-free (a vote either way moves it the same) and never full on a live race; its maximum grows when a rival arrives, which Ed accepted as honest. **At the close the wait is waived** and the record says how many rivals the winner was measured against: the clock is everybody's deadline, and a leader a room had approved should not be undecided for want of a pair nobody reached. **Deadlock yields to it**: a race cannot stop asking while a pair it waits on is short. **Measured cost** (the sim study, `REPORT-smith.md`): extra judgments and time per adoption, the rival-pair share served — to be filled in at the fold. **Synergy with R-141**: a rival carried past the winner arrives measured against the new current text, so R-132 closes the ones the room had refused in the very batch — A makes Q1534's carried votes decisive rather than incidental. Rejected: **a smaller fixed number of rival votes** (a second number beside the quorum, nobody's choice); **measuring every pair in the race** (quadratic in the rivals, and most of those pairs cannot change the outcome); **explaining a full-but-stuck bar in words** (Ed: *the purpose of the bar is to give a sense of progress and how close things are to resolving*).

### Draft R-143 — for `design/SPEC-REASONING.md`

> **R-143 The top of the ranking is found inside the Smith set** (SPEC v0.142, Ed 2026-09-24, Q1539; narrows R-114, keeps R-115's choice of a pure ranking). R-114 accepted that a cyclic field can put on top a wording a direct majority opposed. It did not foresee the commoner case: **no cycle at all**, and a clumsy near-copy of a losing wording lifting it over the current text by giving it something to beat. Fifteen members, 7 X>Y>cur, 7 cur>X>Y, 1 cur>Y>X: the current text beats both 8–7, and the fit with all three pairs asked puts X at 0.594 over the current text's 0.100 (P 0.863). So the ranking is read inside the **Smith set** of the head-to-head table: the fit still chooses — its tie rule, its record, its routing weight and certification untouched — but only among wordings not beaten, directly or through a chain, by everything outside. A result counts only once its pair is measured (R-142's line), so an unasked pair is never read as a win; and a chain may run only through measured results, so an unasked pair between two other wordings cannot smuggle a loser into the set. With one challenger the Smith set and the fit always agree (with two options the fit's order is the majority's), so **a race of one candidate decides exactly as before**. **The domination guards read the same ranking** (R-132): a wording outside the Smith set is no longer protected by a fitted strength above the current text's, so the clone case seals at once rather than leaving two wordings nobody can pass live on the rail to the close; the cost is that a domination can now arrive when a silence runs its period, not only with a judgment. **What survives, stated so it can be reversed**: inside a genuine cycle the fit still resolves by weight of evidence, and a near-copy of one member of the cycle tips it toward that member (a cycle of 10–5 results, level in the fit, is won by whichever side files a copy — 0.534 against 0.175). Schulze and ranked pairs are immune and were rejected: each replaces the fit's decision outright, so the record's percentages, the routing weight and certification would describe a ranking that did not decide anything. Rejected also: **gate-then-rank** (R-115, again: it demands a direct majority against the current text and so refuses the genuine-cycle winner too); **Copeland** (counts wins, and is itself cloneable); **unmeasured pairs as level in the Smith set** (the textbook definition, and it lets an unasked current-text pair pull a Condorcet loser back in — see the plan's §4.3).

---

## 4. The rule, precisely — what the builder implements

### 4.1 Definitions (engine; `packages/engine-core/src/races.ts`)

For a race with live members M (candidates) and incumbent `cur`, and `usable` as `buildUsableComparisons` builds it today (`races.ts:899–1011`: latest judgment per member per pair, ground-locked, the author's derived preference on (m, cur) only):

- **Pair core** (time-free, memoised with the race): for each unordered pair {x, y} ⊂ M ∪ {cur}: `forX`, `forY` (decisive answers), `ties` (Indifferent), `answeredBy` (set), and `awaited: Array<{id, from}>` over E exactly as `approvalCore` builds it (`races.ts:567–595`), with `from = max(answerableSince(x,y), arrivalT(m))`. For a pair with `cur`, this *is* today's `approvalCore` for that candidate (approvals = for the candidate). For a rival pair, `answerableSince` generalises `races.ts:740`: the max of `groundSince(pairGround(x, y))`, both candidates' `submittedT`, both `evidenceSinceT`.
- **At t** (in `viewAt`, beside the floor, because it moves with the clock — Q1439's discipline, `races.ts:14–22`): `awaitedAt` per pair (`races.ts:226`); `group = forX + forY + awaitedAt`; `F_pair = floorFor(c, |E|, group)` (`races.ts:94`, unchanged, seconder included).
- **Measured**: `forX + forY >= F_pair`, **or settled**: `|forX − forY| > (members of E not in answeredBy)` — the unanswered count *including* the abstained, as `rivalDominates` counts it (`races.ts:725–727`), which keeps settled time-free.
- **Beats** (for the pair table): x beats y iff the pair is measured and `forX > forY`.
- **Smith set** (question 2's recommendation): the directed graph with an edge x → y whenever {x, y} is measured and y does not beat x; the set is every node that reaches every other node. Computed by reachability over ≤ |M|+1 nodes (Floyd–Warshall on booleans; |M| is rarely above 10, Q1431's crowded clause ~20 — 21³ is trivial).
- **smith-rank**: where the Smith set is non-empty, its members first, then the rest, the fitted strength ordering each part; **where it is empty** (not enough is measured for anything to reach everything), the fitted strength alone — today's order exactly. `TIE_EPS` (`races.ts:49`) as today.
- **Top**: the first of smith-rank. **leaderOnTop** = top ≠ cur **and** (cur ∉ Smith set, or top's strength > cur's + `TIE_EPS`). **leaderId** = the top where it is a candidate; else the strongest candidate in the Smith set; else the strongest candidate overall (today's `races.ts:454–462`) — so routing, the decisive pair, the meter and `leaderP` always have a challenger to talk about.
- **rival-measure** (A): `ready` additionally requires every pair {leaderId, r}, r ∈ M \ {leaderId} \ dominated, to be measured. Question 2's loophole needs nothing further here: a leader in the Smith set reaches everyone through measured results by definition.
- **clearsFloor** (`races.ts:778`) = today's four clauses ∧ `leaderOnTop` as redefined ∧ **the Smith set non-empty** (so the top was read inside it, never off the empty-set fallback — the fallback exists for routing, the meter and `metrics.ts:347`'s stranded count, never to carry) ∧ rival-measure, **unless `final`** (the close), where rival-measure is waived and the Smith set is recomputed with unmeasured pairs read as level (the liberal definition — "the evidence it has").

**Single-candidate invariance** (the acceptance criterion that protects every ordinary race): with M = {X}, the only pair is {X, cur}, and its floor *is* the race's floor (same group). **Unmeasured**: the Smith set is empty, smith-rank is the fit's order, `leaderOnTop` is exactly today's — and the race cannot be ready either way, since approvals ≥ F would make the pair measured (forX = approvals ≥ F). **Measured**: the Smith set is the head-to-head winner, or both at a level result; with two options the fit's order is the majority's (Davidson with two items and a symmetric prior: the sign of s_X − s_cur is the sign of forX − forCur, a level count fitting level and the tie rule keeping the current text). So **for one candidate, `leaderOnTop` and ready are identical to today's in every state**. Pin it as a property test over random tallies (Stage 3, test 3). *(A builder who finds a counter-example has found a question for Ed, not a fix to invent.)*

### 4.2 Which pieces move from the memo into `viewAt`

Today `leaderId`, `leaderOnTop`, `leaderJudges`, `leaderMeasured`, `leaderP`, `certification` and `dominated` are **time-free** (`RaceCore`, `races.ts:109–110`; `dominations` at :532, justified by R-132's "time-free" argument at :612–616). Under v0.142 the Smith set depends on which pairs are measured, and measured depends on `F_pair`, which depends on who has abstained at t. So all seven move to `viewAt` (`races.ts:263`), computed from time-free per-candidate and per-pair cores that stay in the memo. The per-state-version memo stays exact by extending the `races@…` key (`races.ts:213–214`) from one awaited count per race to **one per pair** (joined, then hashed if long). This is the plan's main engineering risk — the Q1324/Q1439 read-path lesson (91% of a saturated host) — and has its own guards (Stage 3, tests 7–8; Stage 5's `scale-measure`).

### 4.3 Why unmeasured pairs are gaps, not ties (question 2)

Textbook Smith treats a missing result as a tie. With the clone field and only {cur, Y} unasked: cur beats X, X beats Y, cur–Y level ⇒ Y joins cur's set (cur does not beat it), X joins (Y does not beat X) ⇒ Smith = {cur, X, Y} ⇒ the fit picks X ⇒ X passes, the defect back. As gaps: cur → X → Y, and nothing reaches cur from X ⇒ Smith = {cur} ⇒ the current text stands, with no further pair needed. The gap rule's cost is on the other side: a leader L beaten head to head by a rival R is in the Smith set only if a chain of measured results leads from L back to R — usually L ⪰ cur ⪰ R — so L can wait on {cur, R}, a pair that is not its own. That is `measure-serving`'s third step (the §8.2 amendment). The sim measures how often it bites.

### 4.4 The domination guards (R-132, `races.ts:653–705`)

- `above(id)` (`:669`) becomes "above cur in smith-rank"; the rival guard (`:692`) becomes "above y in smith-rank". Everything else — the three counts, the floor clause, the one pass of conservatism (`:698`), *nothing dominated while E is empty* (`:667`) — unchanged.
- Consequence in the clone case: X (a 7, o 8, w 0) is dominated by the current text and no longer protected, Y likewise; both close in one batch; the race seals, the current text standing. Without this (keeping the fit guard), X and Y stay live to the close, never passable. Question 3.
- `dominated` leaves the memo (§4.2), so `retireDominated` (`session.ts:2029`) can find a domination at a tick. It already reads `races(t)` — no change there; the comment at `session.ts:2006–2027` and R-132's "time-free" sentence are amended at the fold.
- The **Q1534 carry** is untouched and helps: carried rival-vs-winner judgments are ordinary usable judgments of (rival, cur) after the re-aim (`reaim.test.ts`), so they populate the pair table the moment the winner lands.

### 4.5 Routing (`packages/engine-core/src/routing.ts`)

- `bestPairFor` (`routing.ts:213`): after the decisive block (`:251–255`), a **measure block**, only when `rivalGateOpen`: scan pairs {leader, r} short of measured (the view carries the list, see below), oldest rival first by `candidateNum`; then {cur, r} for rivals r that beat the leader and are short. The scan's own exclusions apply (`ownIncumbentPair`, `servedOut`). Then today's value order.
- `askOnRace` (`routing.ts:291`) passes the view's `measureShort` list down; `feed` (`:351`) extends its memo key (`:366`) with each race's `measureShort` pair keys, since they move with the clock exactly as `short` does; the ×1.25 unheard boost (`:409`) also fires on a race whose leader is short of measured.
- `maxPairValue` (`:155`) and the race's `deadlocked` (`races.ts:504–508`): a race with a non-empty `measureShort` on which some member of the pair's group has not answered is **not deadlocked**.
- §5.3's exception needs no code beyond this: active sampling's value order is untouched; the measure block precedes it.

### 4.6 The bar (`meter-need`) — Ed's ruling, designed against the current meter

**Today** (`races.ts:289`, R-118, Q1439 (b)): `closeness = min(1, leaderJudges / max(1, floor))`, where `leaderJudges` (`races.ts:493–495`) counts distinct members with any usable judgment touching the leader — against the current text *or a rival*. It is carried unchanged by `views.ts:215` (clauses) and `views.ts:300` (setting races), turned into a percentage at `design/live.js:1461` (`pct`), and painted as the wash's width in `design/session.js` (`wash`, comment at `:642–648`; `washAttrs(…, w.fill)` at `:1139–1146`). It reads full at the floor whichever way the votes went — the code says so at `races.ts:282–288` — so on a live race at the host's default cooldown of 0, **a full bar already means "met its floor and did not pass"**. That is the state Ed has ruled out.

**New** (recommendation, question 1): over the pairs P the leader waits on — {leader, cur}, and {leader, r} for every live, not-dominated rival r whose pair is not yet measured:

- `n_P` = distinct members who have answered P (decisive **and Indifferent** — Q1362 (d): the member was asked and answered — and, on {leader, cur}, the author's derived preference, as `leaderJudges` counts it today);
- `need` for {leader, cur}: `F` if `n < F`, else `n + 1` — *at its floor it always wants one more vote than it has*;
- `need` for a rival pair: its own `F_pair`; a measured pair (count or settled) drops out of P (or, equivalently, `need = n`);
- `closeness = Σ min(n_P, need_P) / Σ need_P`.

Properties, each a test (Stage 2):

1. **Never full on a live race** — the {leader, cur} term is always short by at least one. At cooldown 0 the race that clears passes in the same command, so the member sees a ✔ record, never a full bar. With a cooldown, a cleared-and-cooling race reads exactly as an uncleared one at the same counts, which is what §4.2 requires (*a "cleared and cooling" state would be a standings reveal*).
2. **Direction-free** — every term counts answers, not approvals; a vote for and a vote against move it identically. The existing mirror test (`session.test.ts:1260–1290`) keeps passing with new expected values.
3. **Honest growth** — a rival arriving adds a term (the maximum grows, Ed's ruling); an abstention shrinks `F` and the bar steps forward with no vote; a leader change re-bases it on the new leader (it can fall).
4. **Single candidate** — P = {leader, cur}: the bar is `n/F` below the floor (today's reading, since `leaderJudges` = answers on that pair when there is no rival) and `n/(n+1)` at and above it, where today it read 1.

What it concedes, for Ed to weigh (question 1): it is a *lower bound* on what is left, not a guarantee of when the race passes — past the floor, "one more" is all a direction-free meter can honestly say. The two alternatives are in question 1.

**Where each change lands**: the engine only. `closeness` keeps its name and its [0, 1] contract in `RaceView` (`types.ts:377–388`, doc comment rewritten); `views.ts:215/300` and `live.js:1461` carry it unchanged; `session.js` paints it unchanged. `judges`/`floor` still cross (`views.ts:220–221`) and are read only by the deadlocked line (`session.js:773`), so they stay `leaderJudges` and `r.floor`.

### 4.7 Settings races, parks, the batch, certification, replay

- **Settings races** (question 4): `buildRaceGroups` (`races.ts:344–356`) makes every live value on one setting a race, so A and B apply to an ordinary motion with rival values by construction. Admissions (`admit:<id>`) are one-candidate races: unchanged (§4.1). The constitutional route is not a race (R-105): untouched. `finalRender`'s `appliedSettings` (`session.ts:2416–2421`) gets the close's waiver through `clearsFloor(r, { final: true })`.
- **Parks** (§9.7 rule 8, R-100): the park is decided by the same ready set (`session.ts:1886`), so A and B hold a park back exactly as they hold an adoption. `decided` (`session.ts:~1925` snapshot; `candidate-awaiting-assent` and `adopted` events) gains an optional `rivals: { measured, of }`, recorded at the park and carried to the accept's adoption unchanged (R-134's *what the membership decided on*). `blockedByPark` (`races.ts:293–295`) reads `clearsFloor` and follows automatically.
- **The batch** (`sweepAdoptions`, `session.ts:1867`): unchanged in shape. Ready is still snapshotted before anything lands; an adoption in one race cannot move another race's pair table (disjoint footprints); within a race, the rivals carried by R-141 re-enter with their votes, and the next leader waits on its own rival pairs at the next batch.
- **The close** (`runClose`, `session.ts:1019`; `finalRender`, `:2387`): `sweepAdoptions(t, true)` passes `final` into `clearsFloor`; `finalRender`'s projection (`:2416`) likewise.
- **Certification** (`races.ts:480`): `1 − leaderP` against the new `leaderId`. A routing and record number, never a gate (§4.4): no further change.
- **Deadlock** (⚔️): §4.5's exemption only. A deadlocked race is by definition one the fit cannot separate; B does not change when it is declared.
- **Replay — derived only, no gate needed.** `Session.replay` (`session.ts:430–440`) folds recorded events through `apply`; the sweep, the batch and `retireDominated` run only on the command path (`session.ts:1566–1571`: *adoption … emits new events and so must never run during replay*). Nothing in A or B is an event or folds one, except the optional `decided.rivals` field on **new** events, which old logs do not have and old records therefore omit. So **every existing log folds bit-identically** and the golden `packages/engine-core/test/golden/pre-q1534.json` must pass unedited. What changes is the *future*: a document live at the deploy is judged by v0.142 from its next batch — a race one approval from passing may now wait for its rival pairs, and a clone-lifted leader stops being the leader. No version gate is recommended (question 10): the alpha documents are disposable (Ed, 2026-09-17), the fold stays single-path, and a gate would need an amendment event in every log.
- **The demo document** (`design/DEMO.md` on branch `demo`, §3.3; preset `design/demo/pizzacon-2027.md`): the builder seeds *contested* entries "one member approves … and, where the race holds rivals, they are judged against each other", **never past the floor** (👥 = 3 members). Under A, a seeded multi-rival race (the three-way title, preset line 116) no longer passes on the visitor's one missing approval: its leader also needs three members on each rival pair. P11 (`demo-check`) does not catch this — it asserts *not adopted*, which stays true. Question 9.

---

## 5. Stages

Build order is Ed's: **A, then B**, both on one branch (`q1538`), the bar with A because A is what changes what "done" means, **the sim study (Stage 5) on the branch before either merges**. Each stage is its own commit set; the gates at the end of each are CLAUDE.md's seven (tests, lint, typecheck, spec-check, copy-check, clock-check, build) plus `npm run journey` and the walks named. Acceptance evidence is **file:line in the hand-back** for every criterion — the lines below are today's anchors, which will move.

### Stage 1 — A in the engine and the router (`rival-measure`, `measure-serving`)

**Files**: `packages/engine-core/src/races.ts`, `routing.ts`, `types.ts`, `session.ts`.

1. `pairCore(x, y, usable)` time-free, generalising `approvalCore` (`races.ts:567`) and `answerableSince` (`:740`); `approvalCore` becomes the cur-pair case of it (no behaviour change — the existing tests are the proof).
2. `RaceCore` gains the per-pair cores for {leader-candidates × everything}; `viewAt` (`:263`) computes `measured`, `measureShort: string[]` (pair keys) and `rivals: { measured, of }`.
3. `clearsFloor(r, opts?)` (`:778`) adds `rival-measure` unless `opts.final`; callers at `session.ts:1886`, `:2416`, `races.ts:293` pass `final` where they are the close.
4. `deadlocked` (`:504–508`) yields to a short, askable measure pair; `RaceView` doc comments (`types.ts`) for the new fields.
5. `bestPairFor` measure block (`routing.ts:251–261`), `askOnRace` (`:291–299`), feed memo key and boost (`:366`, `:409`).
6. `decided.rivals` on the snapshot (`session.ts` sweep map) and on `adopted` / `candidate-awaiting-assent` events (`types.ts` event shapes), optional.

**Acceptance** (each with file:line evidence):
- A1 A two-rival race whose leader has F approvals and an unasked rival pair does not adopt at the batch; it adopts in the command that measures the last pair (`clearsFloor` + test line).
- A2 The hidden-rival fixture (§2) passes **Y**, not X, with the router alone choosing pairs (a scripted room answering whatever it is served, not hand-chosen pairs).
- A3 A settled rival pair (lead > unanswered in E) counts as measured below its floor.
- A4 An abstention on a rival pair shrinks that pair's floor at t with no event, and the batch at that t can release the leader (the Q1439 pattern, `memo-differential`'s clock case).
- A5 At the close, the leader with F approvals and an unmeasured rival adopts, and its `adopted` event carries `decided.rivals = { measured: k, of: m }` with k < m.
- A6 A single-candidate race's ready set is identical to `main`'s over the whole existing test corpus (the invariance, §4.1) — every existing adoption test passes unedited.
- A7 A dominated rival is not waited on (a race whose only unmeasured rival is in `dominated` adopts at the batch that retires the rival).
- A8 A deadlocked race with a short measure pair keeps serving it to members of its group who have not answered it.
- A9 Serving order: for a member who has answered the decisive pair, `askOn` returns {leader, r} for the oldest short rival before any value-ordered pair, and only while `rivalGateOpen`.

**Tests**: new `packages/engine-core/test/rival-measure.test.ts` (A1–A9); `askable.test.ts` (A9's order beside the Q1202 cases); `deadlock-serving.test.ts` (A8); `dominated.test.ts` unchanged and green (A doesn't touch dominations); `memo-differential.test.ts` — add a scripted multi-rival random session with the clock moving, `audit` mode, and amend *"the races read at two clocks on one state differ only in the floor they were read at"* (`:346`) to name the new time-dependent fields (`measureShort`, `rivals`); `legacy-replay.test.ts` unedited and green; **a new golden** `golden/pre-q1538.json`, written by `main` at the branch point: a race that adopted its leader with an unmeasured rival, replaying under the new engine to the same hash and states (the proof that the change is derived-only).

**Walks**: `npm run journey` (existing lines green; new step in Stage 2); `npm run room-walk` (cooldown-0 server: the adoption loop still completes); `node scripts/repro/…` none new.

### Stage 2 — the bar (`meter-need`)

**Files**: `races.ts` (`viewAt`'s `closeness`, `:289`), `types.ts` (`closeness` doc, `:377–388`). No page file changes; the page already paints whatever ratio arrives (`live.js:1461`).

**Acceptance**:
- M1 `closeness < 1` on every live race in every test and every random `memo-differential` session (a property asserted in the differential loop).
- M2 Mirror races read identically (`session.test.ts:1260`, expected values updated, the assertion kept).
- M3 A single-candidate race reads `n/F` below the floor and `n/(n+1)` at or above it (`session.test.ts:1595–1616` rewritten to these numbers).
- M4 A rival arriving lowers the reading by adding its pair's floor to the denominator; the pair becoming measured removes it.
- M5 No change to `views.ts`'s payload shape (`server.test.ts:487–514` green unedited).

**Walks**: `npm run journey` gains a *rival bar* step: two rival proposals on one clause, the leader brought to its approvals, the rail entry's `pct` asserted below 100 and the entry still live; the rival pair voted by F members; the ✔ record appears. `npm run applicants-walk` (its fill assertion at `scripts/applicants-walk.mjs:757` reads closeness: update the expected wording of its comment, the assertion is a range). `npm run card-audit` at 1600 and `:narrow` against the baseline — the wash is geometry-neutral, so **no** finding is expected; any is a regression.

### Stage 3 — B in the engine (`pair table`, `smith-set`, `smith-rank`)

**Files**: `races.ts` (leader selection `:454–479` moves into `viewAt`; `dominations` `:653–705` reads smith-rank; the memo key `:213`); a small pure module `packages/engine-core/src/ranking/smith.ts` (`smithSet(nodes, beats, measured)`, no engine types, unit-testable alone).

**Acceptance**:
- B1 The clone fixture (§2, 15 members, all three pairs answered by everyone): no adoption; at the batch X and Y retire as `dominated`; the race seals with the current text standing; `leaderP` on the last view ≈ 0.863 (the record's number is still the fit's).
- B2 The cycle fixture: level cycle → nothing adopts (tie rule); cycle + clone of Y → **Y adopts** — the known limitation, pinned as a test so a future change to it is deliberate (`it('a clone inside a genuine cycle still tips the fit (R-143, accepted)')`).
- B3 Single-candidate invariance: a property test over random {a, o, ties, awaited} tallies at E 1–20 and both quorum forms — `leaderOnTop` and `clearsFloor` equal `main`'s. Run against a copy of `main`'s `races.ts` in the test (vendored as a fixture function, not imported from git).
- B4 The gap rule (§4.3): the clone field with {cur, Y} unasked → X does not pass (Smith = {cur}); and a cycle-shaped field where the leader L is beaten by R and {cur, R} is unmeasured → L waits, and `askOn` serves {cur, R} to a member who has answered everything else; once measured with cur ahead, L passes.
- B5 `dominated.test.ts` — every existing case green; add *"a wording outside the Smith set is not protected by its fitted strength"* (the clone case) and *"a race's own top is never closed"* re-proved against smith-rank; the brute-force block (`:100`) extended to random three-candidate fields checking no closure of the smith-rank top.
- B6 The Q1534 *Notice* fixture (`dominated.test.ts:369–470`) green unedited.
- B7 `memo-differential` in `audit` mode over random multi-rival sessions with the clock moving: cache and live agree at every step; the per-pair memo key hits between abstentions (count hits in the test, as `derived.test.ts` does).

**Tests**: as above; `derived.test.ts:35`'s note about `closeness` updated; `setting-races.test.ts` gains one two-value motion case per rule (question 4); `park-numbers.test.ts` gains `decided.rivals` carried through a park to its accept.

**Walks**: `npm run journey`, `npm run motions -w @draft/sim-harness` (setting races), `npm run room-walk`, `npm run seat-matrix` (both hats — audiences are unchanged, so it must be green with no new `AUDIENCE` cells; a new cell is a question for Ed, never a predicate invented, CLAUDE.md *seat matrix*).

### Stage 4 — the record's two lines (`measured-note`, `ranked-note`)

**Files**: `packages/server/src/views.ts` (the record builder, `:377–520`: carry `decided.rivals` and a per-field `smith: false` where a wording outside the Smith set outscored the one that stood — computed at the seal from the same pair table and stamped on the retire/adopt event as an optional field, so the record never re-derives, the R-141 lesson *write the choice down rather than re-derive it*); `design/copy.js` (`record`, `:345–395`: two new strings); `design/session.js` (the sealed record, `:2230–2300`: the note under the field label or under the wording, per SURFACE's ruling); SURFACE §9's sealed-record row; STYLE pass.

**Acceptance**:
- R1 A ✔ record passed at the close with k < m shows the `measured-note`; a live-batch ✔ never does.
- R2 A ✖ record where a wording's percentage is above 50% and the text stood by the Smith rule shows the `ranked-note`; a ✖ record where the text stood on the floor does not.
- R3 Old records (no field) print exactly as today — `copy-check --walk` diff shows only the new strings.

**Guards**: `npm run copy-check` then `npm run copy-freeze` (both goldens); `design/tools/session-probe.js` (any `cards.js`/record change re-runs it, CLAUDE.md *Probe discipline*); `card-audit` over the fixture's sealed records — a fixture record for each note added to `design/fixture-session.js` (one array, CLAUDE.md *Mockup fixtures*).

### Stage 5 — the sim study (before merge)

**Files**: `packages/sim-harness/src/smith-study.ts` (new, `npm run smith -w @draft/sim-harness`), a clone-filing persona in `persona.ts`, metrics in `metrics.ts`; report `packages/sim-harness/REPORT-smith.md`.

- **Arms**: `main` (with Q1534) · A · A+B. Engine switches are a test-only option on the session (like `Session.memo`), never a document setting, removed at merge.
- **Rooms**: 5, 7, 10 and 15, 20 members; seeded; the three windows `churn.ts` already uses.
- **Personas**: the scripted utility personas, plus **`clone-filer`** in two flavours — *naive* (re-files a live wording it likes with a small uniform utility penalty δ, everybody ranking the copy just below the original) and *strategic* (copies a wording it wants to win when that wording is losing to the current text). Scenario side: an alternative whose utility is the original's minus δ for every persona.
- **Metrics**: **Condorcet efficiency** (per sealed or adopted race, whether the standing wording is the latent profile's Condorcet winner over the race's field, where one exists; and the share with no Condorcet winner); **rival-pair share served** (rival edge cards over all edge cards — the number behind Ed's observation); **extra judgments per adoption** and **median minutes from submission to adoption**; welfare ratio (existing); **clone wins** (adoptions of a wording a direct majority preferred the current text to).
- **And the churn study** re-run (`npm run churn -w @draft/sim-harness`) on all three arms: flips and reversions (`REPORT-churn.md` §8's table is the baseline).
- **Instrument**: `scale-measure` on a crowded clause (20 rivals, 30 members) for the per-pair memo key — the view path's time per poll against `main`.

**Acceptance**: the report exists with every metric above for every arm and room size, seeds stated, reproducible by one command; **the merge decision is Ed's** against question 8's criteria.

### Stage 6 — the documents (at merge)

Scheduled, not performed in parallel (MOBILE.md's discipline). Re-read each file immediately before editing (two sessions run at once).

| Document | Edit | When |
|---|---|---|
| `SPEC.md` | §3's amendment text; version v0.142 | merge commit, with Ed's sign-off |
| `design/SPEC-REASONING.md` | R-142, R-143 (§3 drafts, measured numbers from Stage 5 filled in); R-132's "time-free" sentence gains a pointer to R-143; R-118 gains a pointer to R-142 | same commit (spec-check resolves `→ why:`) |
| `SURFACE.md` | §6's fill wording (the `wait` row and the lifecycle fill rule: *how far the room has got* stays true — check the words, `SURFACE.md:197`); §9's sealed-record row gains the two notes | Stage 4 commit |
| `design/STYLE.md` | nothing new unless a note's wording needs a vocabulary row (*head to head*) | Stage 4, if Ed's copy needs it |
| `CLAUDE.md` | glossary: `evidence-meter` rewritten (its "judges over the floor" is now wrong); new entries `measured pair`, `rival-measure`, `smith-set`, `smith-rank`, `meter-need`, `packages/engine-core/src/ranking/smith.ts` [file]; `adoption-threshold` untouched; Gotchas: *"A meter that counts judgments reads full on a race that did not pass"* (guard: `memo-differential`'s M1 property) | merge |
| `QUESTIONS.md` | Q1538/Q1539 blocks folded and deleted; unanswered §9 questions carried with real numbers | merge |
| `design/DECISIONS.md` | the plan's reasoning not in R-142/R-143 (the bar options, the gap rule's example), dated section | merge |
| `README.md` | spec version, test counts | merge |
| `CHANGELOG.md` | *Changed*: "A wording now passes only after it has been voted on directly against each rival; the progress bar counts those votes too." *Fixed*: "A near-copy of a losing wording could lift it over the current text." | at the deploy, with its tag |
| `design/DEMO.md` (branch `demo`) | question 9's ruling | whichever lands second |

Delete this plan at the fold.

---

## 6. Costs and risks

1. **More votes per change.** Each live rival adds up to F votes before the leader passes. At 15 members, quorum 8, three rivals: up to 24 more answers, about two per member. The sim's *extra judgments per adoption* is the honest number; Q1534's carried votes pay part of it back (a carried rival arrives measured against the new text).
2. **Slower passes in small rooms.** At E = 2 the seconder rule makes every rival pair need both members (`floorFor`, `races.ts:98`) — a silent partner blocks until 💤's period runs. Same property the approval floor already has; worth saying to Ed.
3. **The memo** (§4.2): seven fields leave the time-free core; the key grows to one count per pair. Risk: the read path regresses on a crowded clause. Guards: `memo-differential` audit, `boot-guard` in CI, Stage 5's `scale-measure`.
4. **Dominations on a clock tick** (question 3): a wording can close with no judgment in the room. Visible to its author as a ✖ record at an odd moment.
5. **A without B is worse than neither on clones** (§2's third row). Do not merge A alone.
6. **The cycle limitation** stays (R-143). Rare at 15 with mostly single-proposal races (R-115's own observation), but it is now *the* way to game a vote, and the clone-filer persona will measure how rare.
7. **Live documents at the deploy** change behaviour mid-life (question 10); the demo's seeded races slow (question 9). **Never deploy during a live room** (memory rule).
8. **The bar changes for every race**, single-candidate included: it no longer reaches 100%. Members used to "full then passes" at cooldown 0 never saw full anyway (the pass is instant); a member who saw "full and stuck" sees "92% and stuck" — which is Ed's ruling working as intended.

---

## 7. What the study decides

The merge is gated on Stage 5's report, read by Ed. The recommendation for question 8 is a pre-registered bar so the decision is not argued from the numbers after the fact.

---

## 8. Rules of the tree (for the builder)

- Branch `q1538` by hand (`git worktree add ../draft-wt-q1538`; the Agent tool's worktree isolation fails on this machine — memory note). Never `git stash`. Commit before compacting.
- Edit tool only on CRLF files; no `sed -i`/`perl -pi` (global CLAUDE.md).
- Never push. Never merge to `main` before Ed has read the sim report and ruled on question 8.
- Every string a member reads lives in `design/copy.js`.

---

## 9. Questions for Ed

Each gives the background in plain terms, then the options, **recommended first**.

**1. What should the progress bar count once the vote against the current text has reached its quorum?** Today the bar fills when enough people have voted either way, so at quorum it reads full even if too few said yes — and a full bar that sits there is what you ruled out. The bar can't count only "yes" votes without telling everyone which way the voting is going (your "no" vote would leave it where it was).
- (a) **Recommended.** Count votes towards each quorum — against the current text and against each unmeasured rival — and once the current-text pair is at quorum, always need one more vote than it has. The bar moves the same for a yes or a no, never reads full while the proposal is still open, and grows when a rival arrives. Cost: past quorum it says "almost", not how many more are really needed.
- (b) Count every member who could still vote on those pairs. Never over-promises, but a room of 15 with a quorum of 8 passes a proposal with the bar around half full, then jumps.
- (c) Count only yes votes towards the quorum. Never fills early, but reveals the direction of the vote to anyone watching the bar, against the blind-voting rule (SPEC §3.5).

**2. When a head-to-head pair hasn't been voted on enough yet, should it count as a draw or as a gap?** (This is about B's head-to-head table.)
- (a) **Recommended.** As a gap: a wording only reaches the top through results that have actually been voted. Stops a losing wording slipping back in through an unasked pair (§4.3); costs the occasional wait for one more pair (the current text against a rival that beat the leader), which the router asks next.
- (b) As a draw (the textbook rule). Simpler, but in the clone case one unasked pair is enough to let the losing wording pass again.

**3. Should a wording that can't get into the winning group be closed straight away?** In the clone case, X and Y can never beat the current text head to head.
- (a) **Recommended.** Yes — the closing rule reads the new ranking, so both close in the next batch and the clause's rail entry goes quiet. Cost: a close can now happen when someone's 💤 period runs out, not only when somebody votes.
- (b) No — keep today's closing rule; X and Y stay live and votable until the document closes, but can never pass.

**4. Should both changes apply to motions on the rules (ordinary route) as well as to text?** Two rival values for, say, the proposal rate are a race like any other.
- (a) **Recommended.** Yes, one rule everywhere — the same call you made for Q1534's rivals. Admissions have one candidate and are unaffected; constitutional motions aren't races and are untouched.
- (b) Text only.

**5. When should the router start asking the leader-versus-rival questions?**
- (a) **Recommended.** Once some proposal looks likely to beat the current text (the existing rival gate), right after the leader-versus-current question. Before that, nothing is near passing, so there's nothing to hold up.
- (b) Always, right after the leader-versus-current question, even when every proposal is losing.

**6. Wording for the record when the text that stood shows a lower percentage than a proposal that lost.** The percentages rank every vote in the race together; the winner is now chosen by head-to-head results first. Options (member voice, STYLE-checked):
- (a) **Recommended.** Under the losing wording: *More members preferred the current text to this, one against one.*
- (b) Once, under the field label: *The percentages count every vote in the race; the text that stands won its head-to-head votes.*
- (c) *Kept: every proposal lost to the current text head to head.*

**7. Wording for a proposal that passed at the close before it was voted on against every rival.**
- (a) **Recommended.** *Passed when the document closed, voted against 2 of its 3 rivals.*
- (b) *Passed at the close; 1 rival was never voted against it.*
- (c) No line — the record's counts are enough.

**8. What result in the simulation should stop the merge?**
- (a) **Recommended.** Merge if, in every room size, A+B gets the head-to-head winner at least as often as today, clone wins fall, the churn study shows no more reversions, and the typical time to pass rises by no more than half in rooms of 5–10. Otherwise it comes back to you.
- (b) No bar set in advance: I read the report and decide.

**9. The demo (PizzaCon).** Its seeded contests are built one vote short, so a visitor's vote passes one on stage. Under A, a seeded race with rivals (the three-way title) would also need three people to vote the leader against each rival first.
- (a) **Recommended.** The demo builder also seeds the rival-pair votes, so one visitor vote still decides; `demo-check` asserts it.
- (b) Accept a slower demo.
- (c) Deploy A and B only after the demo nights.

**10. Documents that are live when this deploys.** Nothing in their history changes; their next decisions use the new rule (some will wait for rival votes, some clone-lifted leaders will stop leading).
- (a) **Recommended.** No special handling — alpha documents are disposable.
- (b) Keep the old rule for documents begun before the deploy (needs a marker in every log).

**11. The known gap: inside a genuine three-way cycle, a near-copy can still tip the result.** (§2's cycle numbers.) Fixing it means replacing the ranking maths that decides (Schulze), which would also change the percentages on every record.
- (a) **Recommended.** Accept and record it (R-143), and let the simulation's clone-filer tell us how often it happens.
- (b) Open a separate question on Schulze now.

**12. The quorum for a rival pair includes the "seconder" rule (at least two people).** In a document of two members, both must vote on every rival pair before a leader passes.
- (a) **Recommended.** Keep it — the same rule the approval floor already has, and 💤 stops a silent partner blocking for ever.
- (b) One voter is enough on rival pairs.

---

## 10. Hand-back the builder owes

Per stage: the commit list; each acceptance criterion with its file:line evidence and the test that proves it; the seven gates and the named walks, each with its verdict line; the deferred items in `QUESTIONS.md`'s Backlog with a checkable condition to act (global CLAUDE.md); and anything the code did that this plan did not expect, as a numbered finding rather than a fix.
