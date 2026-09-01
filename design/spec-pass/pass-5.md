# Pass 5 — SURFACE §8.1 as a table (2026-09-01)

The extraction of record for pass 5. Target: **SURFACE §8.1**, the twenty-three founding
rules F1–F23, 14,177 B from the `### 8.1 Rules` heading to the start of §9 — the *Exceptions
beyond §3* paragraph that closes the section included. Commissioned by **1006** and backlog entry **191** as Ed's **1050** redefined
it, ordered after the written extraction by **1009**. Questions **1122–1127** and finding
**1128** are asked in `pass-5.html`, which shows every rule in full both ways. This file is
deleted when the pass folds.

## The verdict

**F1–F23 do not tabulate, and §8.1 stays prose.** This is the outcome the plan's step 3
admits — *if the honest answer is that they cannot be tabulated without loss, say so … and
leave §8.1 as prose. That is a legitimate outcome of this plan, not a failure of it.*

The reason is structural, not editorial. **An F-rule is not one normative statement; it is a
named cluster of them**, and the clusters are wildly uneven — from F10's one statement in
54 B to F21's 14 in 2,733 B. §9's card-kinds table, which 1006 names as the model, works
because every row is the same kind of thing and **eight repeated field-labels lift out of
every row into the header**. That lifting is where a table's savings come from, and §8.1 has
nothing to lift: no two rules share a field. A table over them has one honest column — *the
rule* — and that column is the prose again, with scaffolding added.

Measured, on a faithful conversion (nothing shortened, nothing dropped, the `→ why:` tail
moved to a `cites` column and the hand-authored *governs* and *condition* columns added):

| | bytes |
|---|---|
| §8.1 as it stands — the `### 8.1 Rules` heading to the start of §9 | 14,177 |
| the 23 rules alone | 13,480 |
| the same 23 as one table, header included | 15,161 |
| **difference** | **+1,681** |
| `SURFACE.md` today | 95,917 |
| the watch number | 70,000 |

**The byte target is a consequence, never a criterion** (1051, plan-queue backlog 143).
Nothing was compressed to reach a number and no rule was shortened. The distance to 70,000
is unchanged at **25,917 B over**, and §8.1 was never where it was going to be found: the
whole section is 14.8% of the file.

## The three families

| family | rules | n | bytes | share |
|---|---|---|---|---|
| tabulates cleanly | F1 F4 F8 F9 F10 F12 F13 F15 | 8 | 1,030 | 7.6% |
| strained | F6 F7 F11 F14 F16 F17 F18 F20 F22 | 9 | 3,990 | 29.6% |
| resists | F2 F3 F5 F19 F21 F23 | 6 | 8,460 | 62.8% |

**The eight that tabulate cleanly are 7.6% of the section; the six that resist are 62.8%.** The
table would be at its best on the rules nobody struggles with and at its worst on F21, F19,
F5 and F23. F21 alone is 20% of §8.1 and would be a single table cell of 2,577 characters,
because **a markdown table cell cannot hold a break, a list or a paragraph**.

## Rule by rule

Column set attempted: **id · what it governs · the rule · the condition · cites**, derived
by reading all 23 first, as step 1 requires. `cites` is what keeps F5's `(F9, F18)`, F19's
and F23's cross-references intact. *stmts* is a hand count of the separable normative
statements inside the rule, and is the finding in one column.

| id | stmts | prose B | row B | Δ | verdict | what it governs |
|---|---|---|---|---|---|---|
| F1 | 1 | 77 | 130 | +53 | tabulates cleanly | the founding's pace |
| F2 | 9 | 844 | 967 | +123 | resists | the birth order, and 🧭’s shape |
| F3 | 6 | 643 | 736 | +93 | resists | what blocks the order |
| F4 | 2 | 127 | 169 | +42 | tabulates cleanly | the gate clauses |
| F5 | 12 | 1,434 | 1,574 | +140 | resists | 🍾’s visibility, and its power table |
| F6 | 6 | 581 | 655 | +74 | strained | defaults and pre-answering |
| F7 | 6 | 561 | 645 | +84 | strained | when a delegated question is served |
| F8 | 2 | 95 | 154 | +59 | tabulates cleanly | what is owed an OK |
| F9 | 1 | 99 | 158 | +59 | tabulates cleanly | when a card appears |
| F10 | 1 | 54 | 92 | +38 | tabulates cleanly | what opens a card |
| F11 | 6 | 318 | 392 | +74 | strained | the address (📍) |
| F12 | 4 | 192 | 245 | +53 | tabulates cleanly | the birth’s save, and 📧 |
| F13 | 3 | 161 | 220 | +59 | tabulates cleanly | the constitution’s own text |
| F14 | 5 | 234 | 295 | +61 | strained | the birth-pass |
| F15 | 3 | 225 | 283 | +58 | tabulates cleanly | what a clause says |
| F16 | 4 | 350 | 381 | +31 | strained | the Founded line |
| F17 | 4 | 441 | 504 | +63 | strained | the dead click |
| F18 | 3 | 570 | 621 | +51 | strained | the supply of tasks |
| F19 | 9 | 1,606 | 1,722 | +116 | resists | the readiness reasons, and the ✉️ remedy |
| F20 | 3 | 422 | 475 | +53 | strained | serving a founder-member’s grant |
| F21 | 14 | 2,733 | 2,807 | +74 | resists | the Membership section |
| F22 | 3 | 513 | 545 | +32 | strained | the band’s section order |
| F23 | 8 | 1,200 | 1,286 | +86 | resists | the founder’s ✉️ task |

## What the pass found beyond the verdict

1. **F19's six reason codes are genuinely tabular** — `judge-gate`, `deps-unsettled`,
   `invitation-open`, `one-voice`, `collecting`, `text-unconfirmed`, each with what it
   means and whether ✉️ is the remedy for it. The one place in §8.1 where rows would carry
   more than the prose does. **Not built**: it is a table *inside* F19, not F19 as a row,
   and it changes F19's shape. Asked as **1126**.
2. **F16 appends three unrelated rules** to a rule about the Founded line — the ✒️/🛡️ tabs,
   🎩 settled at the start, the register's minimum. Tabulating made it visible. A note, not
   an edit: this plan does not restructure rules.
3. **F3 restates a table two screens above it.** §8's own `ORDER` table has a *blocks?*
   column, and F3 is the general rule that column instantiates — asserted against it by
   `checkOrder` already.
4. **F14 and F17 are the only rules where the columns do real work** — F14 carries four
   numbers (240 ms, 840 ms, 55 ms, six), F17 three genuine preconditions (during the birth ·
   a task outstanding · no card open). Two rules out of twenty-three.
5. **The *Exceptions beyond §3* paragraph is already tabular in shape** — six exceptions,
   each *what · which rule it breaks · why · the ruling*. Left alone: tabulating it is not
   what 1006 asked for.

## What was built

- `scripts/spec-check.mjs` · **`checkFIds`** — the ids are exactly F1–F23 in order with no
  gap and no duplicate, no rule is defined outside §8.1, and every `F<n>` written anywhere
  in `SURFACE.md` resolves to a definition. **Definitions, never occurrences** (1128): F19
  is written seven times in the file, F5 and F18 five each, and §8's `ORDER` table cites
  F5, F9, F18 and F19 in two of its cells, so *appears exactly once* is unbuildable and
  would forbid the web the rules form. Green: 23 defined, 53 citations, all resolving.
- `design/spec-pass/pass-5.html` · every rule in full both ways, 1122–1128, answers saved
  in-page, *Copy all answers*.
- `SURFACE.md` · **untouched.** No id renumbered, added, removed, merged or split.
