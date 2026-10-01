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

- **Every vote on every race in your rail sweeps that race's entry** (Ed, 1571.2: *let's try it on every vote visible on your rail and we can dial it back if it's too much*) — your own proposal's entry and the entries of the races you are asked on alike. The dial, if it is too much: the entries about your own proposals only.
- **Votes landing together aggregate** (Ed, the same ruling): several votes on one race inside one poll make one sweep to the final value, never one each. Sweeps on different entries in the same poll play together; a stagger between them is a second dial, not built until wanted.
- **The endings and the stamp are for every entry**, whoever it belongs to: a race you were asked on being decided, a question resolving, a record filing.
- The topbar's `room-pulse` stays as it is, content-free.

### 1.4 Detecting the change: a rail delta

- `renderQueue` (`design/session.js`) keeps the previous render's entries by key and, after the patch, reads each entry's delta: fill changed, mark changed, new, gone. Under stage 9 the entry is the node it was, so the sweep and the stamp run **on the kept node**, driven by hand after the render — the Web Animations API (`el.animate`), the way the washes and the lift paint from rest — never a CSS transition, which the patcher's land-still switches off for the flush.
- **A vote that does not move the bar still landed.** The fill is `closeness`, which counts only the answers on the pairs the leader is waiting on (`meter-need`), so a vote on any other pair of the race leaves the fill where it was — and a sweep that fires only on a fill change misses it. The page has to be told a vote landed. The least that tells it: **each live race in the view carries `voteTick`, a number that moves once per judgment** (the count of judgments is one such number; the last judgment's time is another). It is served to every seat whose rail holds the race, printed nowhere, and says only that a vote landed — never how many, if the tick is a clock, and never how (1571.1, Ed's ruling: a new fact the page receives about a live race, so SPEC §3.5's). The sweep fires on a change of the tick or of the fill; the ending on the mark.
- Animations and the poll: a sweep in flight is not a press; a poll landing mid-sweep re-patches the node and the animation continues (WAAPI animations survive a patch that keeps the node). A render that replaces the node (`?render=replace`) ends it, which is fine on a dev switch.

### 1.5 What it must not say (SPEC §3.5)

- **No direction, ever.** The sweep says a vote landed; the fill lands on the same magnitude the meter shows today; the ending says what the mark already says.
- **No count on the surface**: `voteTick` drives the sweep and is printed nowhere; a clock rather than a count is recommended, so even the payload carries no total.

## 2. Verification

- **`scripts/sweep-walk.mjs`** (`npm run sweep-walk`, a sprint-tier walk from its first day — Q1547, `sprint-pages`): three seats at 1600. A proposes; B votes → within two polls A's entry plays one sweep (read through `getAnimations()`: one animation, its keyframes x → 100 → 0 → x′, rightward only) and so does the race's entry on C's rail (1571.2), on a vote that moved the bar and on one that did not (1571.1); B and C vote in one poll → one sweep per entry, not two; the race carries → A's fill runs to full and stays, ✔ stamps (the glyph's animation, the entry's box unmoved), the five-second sentence in the rail; a dominated race (journey's *dominated* road) → full, reset, empty and stays, ✖ stamps; a pair C judged → its ⏳ becomes ✔ with the pass sweep and the stamp (§1.3: the endings are every entry's; 1573.3); a settings motion B puts and C votes on → its entry in A's rail sweeps (the band's own, 1573.5); under `prefers-reduced-motion` none of it; under `?render=replace` the walk prints, not asserts.
- **`card-audit`** unchanged at 1600 and 390: the rail is not a card, and the stamp moves no box.
- **`render-hold-walk`** green: a sweep in flight under a forced poll continues on the same node.
- **`spec-check`**: the glossary entries; the SURFACE M rule's shape.

## 3. Docs, scheduled — edits to other documents, not performed here

| Document | Edit | When |
|---|---|---|
| `SPEC.md` §3.5 | a row: *a seat whose rail holds a live race is told when a vote lands on it, never how many nor how* — ruled 2026-09-30 (1571.1), **Ed's sign-off on the sentence, version bump**; until built, a row of §13's ledger (Q1275), `→ why: R-nnn` | with the build |
| `design/SPEC-REASONING.md` | the R-nnn: this document's §0 and §1.5 | with the SPEC edit |
| `SURFACE.md` | a new M rule: the rail's motion vocabulary — *arrive* (F14), *sweep* (§1.1's table), *stamp* (§1.2), whose entries (§1.3), reduced motion | at the build |
| `CLAUDE.md` | glossary: `wash-sweep` [concept] and `mark-stamp` [concept] under `needs-you-queue`; the guard named once `sweep-walk` runs in a workflow | at the build |
| `design/DECISIONS.md` | what was rejected and why: the shake (the refusal idiom), the beat and the pulse's ring (Ed: not natural for rectangular cards) | at the build |
| `QUESTIONS.md` | 1571's calls folded | at the build |

## 4. The calls, recommendation first

- **1571.1 — telling the page a vote landed. Ruled (Ed, 2026-09-30: *let's show it*):** the host tells the page. A per-race tick that moves once per judgment, served to every seat whose rail holds the race, printed nowhere; a clock rather than a count, so no total is disclosed even in the payload. (The plain words: the bar only moves for some votes, §1.4, so sweeping on *every* vote needs this one more fact.)
- **1571.2 — whose entries sweep on a vote. Ruled (Ed, 2026-09-30):** every vote on every race in your rail, votes landing together on one entry aggregated into one sweep; dialled back to your own proposals' entries if it is too much. The endings and the stamp on every entry.

## 5. Acceptance (evidence at file:line when built)

- `renderQueue`'s delta and the two animations, on the kept node, WAAPI, `ease-out`, distance-proportional duration; `SWEEP_MS` and `STAMP_MS` named once.
- `voteTick` on every live race in the member view, printed nowhere; the stranger's and the applicant's views without it; the spectator projection untouched.
- `sweep-walk` green in `sprint-pages`; `card-audit` fast pass 0 findings at both widths; `render-hold-walk` green; both probes IDENTICAL.
- SPEC §3.5's row, SURFACE's M rule, the glossary entries; `spec-check` green.

## Status

Planned 2026-09-30, both calls ruled the same evening. **Built 2026-10-01 on PR #136** (`f496de0`, the band's entries in the closing commit), with PRESENCE.md as one liveness brief, this one first: the host's `voteTick` (`packages/server/src/views.ts`), the delta and the three endings on the kept node (`playSweeps`, `design/session.js`), the band's settings-motion entries swept too (1573.5), `npm run sweep-walk` in `sprint-pages`; SPEC §3.5 → R-144, SURFACE M24; the build's calls are 1573.1–1573.8 (QUESTIONS.md, DECISIONS).
