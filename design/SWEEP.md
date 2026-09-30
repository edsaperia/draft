# SWEEP.md — the queue card wash sweep transition

A working document in MOBILE.md's shape: decisions numbered from the project sequence, rules leaving for SURFACE.md when built — SURFACE wins where they disagree, and SPEC §3.5 wins over both. Written 2026-09-30 from the rulings Ed gave in the coordinator's session that evening (Q1571), the same evening as PRESENCE.md (Q1570); the two are one *liveness* brief for one builder after redesign stage 9.

## 0. Context and the decisions already made

Your own proposal is pinned in the rail (`yours`, SURFACE M3) and its entry carries the evidence-meter: the wash's fill is the race's `closeness` (`meter-need`, Q1538), a magnitude and never a direction. A vote landing on your proposal is today a fill growing by a few percent between two polls, which the eye misses; a decision is the blue ✏️ line becoming a ✔ or ✖ record with the wash crossfading over `--wash-ms`. Ed, 2026-09-30: *When you make a proposal it's pinned to the sidebar and likely you're keen to know its progress. I'd like more "juice" on your proposals to indicate when they're voted on. At the moment you just see the bar advance, which doesn't mark the change very effectively.*

**Decisions (Ed, 2026-09-30):**

1. **The name is the queue card wash sweep transition** — `wash-sweep` in code and the glossary.
2. **A landed vote sweeps the wash**: the fill runs from where it stands (x) to full, resets, and climbs to the new value — *the wash cycles from x → 100% → 0% → x+1*. Ed's shape, replacing the coordinator's beat and pulse (*they don't feel very natural for rectangular cards*) and the shake he first pictured (the refusal idiom).
3. **Always left to right.** Nothing in the gesture ever moves the fill's edge leftward: the reset from full to empty is instant.
4. **Constant speed, eased at the ends** — *faster at the beginning, slower towards the end*: one motion, its duration proportional to the distance swept, easing out.
5. **The mark stamps** on a decision (*the mark stamp idea is good too*): the new mark lands from about 1.6× and settles to size.
6. **Q1538 is not in play**: a live race never *reads* full, and the sweep clearly is a transition, not a reading.
7. **The transition is for every lifecycle transition** if it is nice — the sweep where an entry has a meter, the stamp wherever a mark changes.

## 1. The mechanism

### 1.1 The sweep, and its three endings

Every sweep begins the same way — the fill runs rightward from x to full — and differs only in where it stops:

| the change | the fill | then |
|---|---|---|
| a vote landed | x → full, an instant reset to empty, then rightward to the new value | nothing else: the mark is unchanged |
| the race passed | x → full, **and stays** | the wash turns green over `--wash-ms`; ✔ stamps in |
| the race failed | x → full, an instant reset to empty, **and stays** | the wash greys over `--wash-ms`; ✖ stamps in |

- **Speed**: one bar width in `SWEEP_MS` (500 ms, recommended); a sweep's duration is its distance over that speed — a vote's sweep covers (100 − x) + x′ and runs 500–1000 ms, a pass's covers 100 − x. One `ease-out` curve over the whole motion (decision 4); the keyframes' offsets are proportional to distance so the speed is constant between the eased ends.
- **One sweep per poll**: several votes landing in one poll make one sweep to the final value; a decision landing with them makes the ending alone.
- **Always rightward** (decision 3): the reset is a cut, never a drain.
- **Under reduced motion**: no sweep — the fill steps to its new value, the leading edge brightens for `--wash-ms`; the endings are the wash crossfade alone.

### 1.2 The stamp

- Where an entry's **mark changes** (SURFACE §6's alphabet: ✏️ → ✔ / ✖, ⏳ → ✔ on a pair you judged, a fold forming, a record filing), the new mark **stamps in**: it lands at 1.6× and settles to 1× over `STAMP_MS` (250 ms, recommended) with one small overshoot, the old mark gone at the first frame. The wash crossfades under it as today. Under reduced motion the mark swaps with the crossfade alone.
- The stamp is on the **glyph's transform alone**, never on the entry's box, so the entry's line and the rail's geometry never move (P13's discipline; the card-audit's R checks read the entry's box and hue, not the glyph's size).
- An entry **arriving** keeps `birth-pass`'s arrival and does not stamp; an entry leaving leaves as today.

### 1.3 Whose entries

- **The vote sweep is for what is yours**: an entry about your own proposal (`mine`). A vote on a race you are merely asked on does not sweep — in a room of thirty judging, a rail that swept on every vote would never be still (1571.2, recommended).
- **The endings and the stamp are for every entry**, whoever it belongs to: a race you were asked on being decided, a question resolving, a record filing.
- Nobody else's page sweeps for your proposal's votes; the topbar's `room-pulse` stays as it is, content-free.

### 1.4 Detecting the change: a rail delta

- `renderQueue` (`design/session.js`) keeps the previous render's entries by key and, after the patch, reads each entry's delta: fill changed, mark changed, new, gone. Under stage 9 the entry is the node it was, so the sweep and the stamp run **on the kept node**, driven by hand after the render — the Web Animations API (`el.animate`), the way the washes and the lift paint from rest — never a CSS transition, which the patcher's land-still switches off for the flush.
- **A vote that does not move the bar** (one on a pair the leader is not waiting on, `meter-need`) still landed. So the author's own race carries **`voted`, the number of judgments cast on it** — served to its author alone, never how anyone judged (1571.1: a new disclosure under SPEC §3.5, Ed's ruling). The sweep fires on a change of `voted` or of the fill; the ending on the mark.
- Animations and the poll: a sweep in flight is not a press; a poll landing mid-sweep re-patches the node and the animation continues (WAAPI animations survive a patch that keeps the node). A render that replaces the node (`?render=replace`) ends it, which is fine on a dev switch.

### 1.5 What it must not say (SPEC §3.5)

- **No direction, ever.** The sweep says a vote landed; the fill lands on the same magnitude the meter shows today; the ending says what the mark already says.
- **No count on the surface**: `voted` drives the sweep and is printed nowhere.
- **Not for others' votes on your page** beyond what the meter already shows.

## 2. Verification

- **`scripts/sweep-walk.mjs`** (`npm run sweep-walk`, a sprint-tier walk from its first day — Q1547, `sprint-pages`): three seats at 1600. A proposes; B votes → within two polls A's entry plays one sweep (read through `getAnimations()`: one animation, its keyframes x → 100 → 0 → x′, rightward only), B's and C's rails play none; B and C vote in one poll → one sweep, not two; the race carries → A's fill runs to full and stays, ✔ stamps (the glyph's animation, the entry's box unmoved), the five-second sentence in the rail; a dominated race (journey's *dominated* road) → full, reset, empty and stays, ✖ stamps; a pair C judged → its ⏳ becomes ✔ with a stamp and no sweep; under `prefers-reduced-motion` none of it; under `?render=replace` the walk prints, not asserts.
- **`card-audit`** unchanged at 1600 and 390: the rail is not a card, and the stamp moves no box.
- **`render-hold-walk`** green: a sweep in flight under a forced poll continues on the same node.
- **`spec-check`**: the glossary entries; the SURFACE M rule's shape.

## 3. Docs, scheduled — edits to other documents, not performed here

| Document | Edit | When |
|---|---|---|
| `SPEC.md` §3.5 | a row: *the author of a proposal is served how many have judged it, never how* — **Ed's ruling (1571.1), sign-off, version bump**, `→ why: R-nnn` | before the build |
| `design/SPEC-REASONING.md` | the R-nnn: this document's §0 and §1.5 | with the SPEC edit |
| `SURFACE.md` | a new M rule: the rail's motion vocabulary — *arrive* (F14), *sweep* (§1.1's table), *stamp* (§1.2), whose entries (§1.3), reduced motion | at the build |
| `CLAUDE.md` | glossary: `wash-sweep` [concept] and `mark-stamp` [concept] under `needs-you-queue`; the guard named once `sweep-walk` runs in a workflow | at the build |
| `design/DECISIONS.md` | what was rejected and why: the shake (the refusal idiom), the beat and the pulse's ring (Ed: not natural for rectangular cards) | at the build |
| `QUESTIONS.md` | 1571's calls folded | at the build |

## 4. The calls (1571.1–1571.2), recommendation first

- **1571.1 — the count field.** The author's own race carries how many have judged it, never how (recommended: the sweep cannot otherwise see a vote the bar does not show). The alternative sweeps only on a fill change and misses the votes on the leader's other pairs.
- **1571.2 — whose entries sweep on a vote.** Your own proposals' entries only (recommended); the endings and the stamp on every entry.

## 5. Acceptance (evidence at file:line when built)

- `renderQueue`'s delta and the two animations, on the kept node, WAAPI, `ease-out`, distance-proportional duration; `SWEEP_MS` and `STAMP_MS` named once.
- `voted` on `mine` items in the member view and nowhere else; the stranger's and the applicant's views without it; the spectator projection untouched.
- `sweep-walk` green in `sprint-pages`; `card-audit` fast pass 0 findings at both widths; `render-hold-walk` green; both probes IDENTICAL.
- SPEC §3.5's row, SURFACE's M rule, the glossary entries; `spec-check` green.

## Status

Planned 2026-09-30. Not built. Waits on redesign stage 9 (PR #132) and on Ed's answers to 1571.1–1571.2; built with PRESENCE.md (Q1570) as one liveness brief, this one first — it is the smaller.
