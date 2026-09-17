# REPORT-proposal-shapes.md — what the page assumes a proposal looks like

A static reading of the span→block mapping, **2026-09-17**, against `8d7230e`.
Nothing was run; nothing was changed. Every claim below is a citation.

**Precedence.** SURFACE.md wins over this file on what the surface does and
says; SPEC.md wins over everything. This report is a *reading*, not a ruling:
where a predicted finding has a rule it cites the rule, and where it has none
it says so and leaves the choice to Ed. It is the same contract `card-audit`
and `REPORT-a11y.md` keep, and for the same reason — an instrument that
changes what it measures measures nothing.

**Why now.** Six bugs in two days (Q1202, Q1379, Q1368, Q1406, Q1407, Q1408)
were all one kind of mistake: the engine holds a proposal as `hunks` over line
indices and the page holds the document as one block per *non-blank* line, and
every shape the hand-authored fixture does not contain is mapped by code
nobody has ever seen run on it. This report enumerates the assumptions in that
mapping and tests each by reading.

**The one structural fact behind most of what follows.**
`design/fixture-session.js` keys its blocks by name (`'guests'`, `'purse'`,
`'quorum'` — fixture-session.js:37–118) and hands `SESSION.setData` its items
**ready-made**, with `keys`, `sites` and `marked` already computed
(fixture-session.js:291–950). So `itemsFromView` — the whole of
`design/live.js`:817–1335, which is the mapping — **is never executed by
`card-audit`, by `session-probe`, or by any fixture walk.** It is executed only
against a live server, by `npm run journey`, `room-walk` and `applicants-walk`,
none of which asserts anything about span shape. That is the hole all six bugs
came through, and it is still open.

---

## 1. The assumptions

| id | the assumption | where | matrix cells that violate it |
|---|---|---|---|
| **S1** | Every non-blank line inside a span is a rendered block keyed `L<i>`; a span containing no non-blank line still gets one usable key. | live.js:817–822 (`keysOfSpan`) | a hunk whose span holds only blank lines; the produced span of a clause emptied to `['']`; any `at` that lands on a blank line |
| **S2** | A proposal occupies **one contiguous run**: `min(start) … max(end)` is the thing the member is looking at. | live.js:847 (`spanOf`) | a multi-site patch (two hunks far apart); a patch one of whose hunks is a gap |
| **S3** | `start === end` is the mark of an insertion, and `siteOfSpan` is the only reader of it. | live.js:830–838 | **`v.mine` never calls `siteOfSpan`** — live.js:1152–1160 uses `keysOfSpan` per hunk, so *your own* insertion has no gap site |
| **S4** | A gap's page identity is `G<sp.start>`, and the block before it is the last non-blank line before `sp.start`. | live.js:833–838; session.js:258–263 (`blockBeforeGap`, `gapFields`) | two engine insertion positions separated only by blank lines (`G5` and `G6` both sit after `L4`) |
| **S5** | `labelFor(key)` finds `key` in `SESSION.DOC`; the nearest heading above it is the entry's title. | live.js:863–867 | a key not in `DOC` — a gap at index 0 (`insertAfterKey` is null, so `labelFor('G0')` runs off the end and returns the **last** heading), and every orphan key from S1 |
| **S6** | Every hunk of a candidate lies inside the span the lane is drawn over, and blank lines never carry meaning. | live.js:840–846 (`applyIn`), 849 (`plain`) | a candidate that *adds* a blank line (silently dropped); otherwise sound |
| **S7** | `blocksOf` renders one block per non-blank line and **no block at all** for a blank line. | session-view.html:8520–8535 | this is the fact S1 collides with: real documents are blank-line separated (`scripts/repro/tim-birthday-text.md`) |
| **S8** | `tabKeysOf` is the one reader of where an item's tabs go (Q1408). | session.js:431–433 | `sealedAt` (session.js:3165), `hSealedAt` (3120) and `filedFor` (2258) still test `keys.includes(key)` — Q1408 reached live items only |
| **S9** | An open card swallows every block of its span (Q1407). | session.js:2975–2978, inside `swallowOpen` | `swallowOpen` runs only where `live.length` is non-zero; the **sealed** branch (session.js:3184–3191) draws the card at the first block and then draws every later block again |
| **S10** | An item's `keys` is exactly the set of blocks the card is about. | live.js:1153 | on a multi-site `draft`, `keys` is *every block between the sites*, which feeds `suggestionSections` (session.js:344–352), `foldBetweenSites` (400–419) and `filedFor` |
| **S11** | A run's head is its keys' source lines joined by newlines. | session.js:300–305 (`runTextFor`) | sound, and deliberately identical to `plain`'s blank-dropping |
| **S12** | A record's `at` is a span in current coordinates that still holds visible blocks. | live.js:1211–1213; `packages/server/src/record-spans.ts` (`adoptedSpan`, `spanNow`) | an adoption whose winner's lines are `['']` — the span survives, the blocks do not |
| **S13** | A deletion is `lines: []`, which produces an empty span and therefore a gap site. | record-spans.ts `adoptedSpan`; live.js:1250 (`gone`) | **the page's own delete gesture sends `lines: ['']`** — live.js:1383 (`hunksOf`: `site.text.split('\n')` on `''` is `['']`), and composer.js:687–697 counts that as a change, so it commits |
| **S14** | A sealed record needs no site key: it is about `keys[0]`. | session.js:1985 (`skey`), 1946 (`incumbent`) | a record over several blocks shows only the first block as *the current text* when it retired |
| **S15** | An undecided race's backlog paragraph is one line of text. | session-view.html:8614 | a multi-paragraph candidate — joined with a **space** and `unhead`ed, which is Q1406's bug in a place the fix never reached |
| **S16** | Every item the rail lists has a DOM anchor to travel to. | session.js:1033–1060 (`anchorForEntry`) | any orphan key from S1/S3 — `anchorForEntry` returns null and the press does nothing |
| **S17** | `kind: 'patch'` exists on the live path. | session.js:701, 2275, 2613, 2953, 3005–3006, 4522–4525; cards.js:844 | **it does not.** `itemsFromView` emits only `quick`, `race`, `draft`, `crown`, `park`; `kind: 'patch'` appears in `design/fixture-session.js:310` and nowhere else |
| **S18** | `spanOf` is never handed an empty hunk list. | live.js:847 | a record with no `at`, no field hunks and an empty footprint → `{start: Infinity, end: -Infinity}` |

---

## 2. Predicted findings

### PF1 — your own proposed insertion loses its gap the instant you propose it
**Confidence: high. Severity: high.**

*Shape.* Document `L0 "# Plan"`, `L1 ""`, `L2 "The party starts at 4pm."`,
`L3 ""`, `L4 "Sam flat."`. In edit mode you put the caret at the end of `L2`
and press Enter — K31, Q261 — which makes the gap site `G3`
(session.js:256, `gapAfter`). You type, you hold the pencil. `hunksOf`
(live.js:1386–1390) sends `{ start: 3, end: 3, lines: ['Bring a cake.'] }`.

*What the code will draw.* The answer re-enters through `itemsFromView`
(live.js:1408), and your proposal comes back on the `v.mine` path, which
**does not use `siteOfSpan`**:

- live.js:1152–1160 — `const sp = spanOf(spans)` then `keysOfSpan(x, lines)`
  **per hunk**. For `{3,3}` the loop body never runs, so the fallback fires:
  `'L' + Math.min(3, lines.length - 1)` = `L3`.
- `L3` is a blank line, and `blocksOf` emits no block for a blank line
  (session-view.html:8523). So the site key names nothing.
- The site carries no `gapKey`, no `insertAfterKey`, no `isInsert`
  (live.js:1157–1161), so `gapHolders` (session.js:270–272) does not list it
  and no `.insert-anchor` is drawn for it. The `bindData` repair
  (session.js:4824) only fires on a key that already *is* a gap key.
- `tabKeysOf` gives `['L3']`, so `suggFor('L3')` is never called: no tab.
- `docIndexOf` (session.js:655–660) has no `insertAfterKey`, so
  `docIndexOfKey('L3')` is `-1` (composer.js:82–86) and the rail entry sorts
  **above the first clause**.
- `anchorForEntry` (session.js:1033–1060) finds no `.insert-anchor` and no
  `[data-key="L3"]`: clicking the entry opens nothing.

In a document with **no** blank lines the same arithmetic lands on the *next*
clause instead: the tab appears beside a clause you did not touch, and
`origin` (live.js:1158–1160) reads `sourceTextFor('L3')` — that clause own
words — so `mineCardHtml` diffs your insertion against the wrong paragraph and
draws a pure insert as a **rewrite of the next clause**.

*What the member should see.* SURFACE M19 and K31: *a race on a gap stands in
the gap* — the held-open anchor after the block before, 30px, the head
*The gap as it stands · (no text here)*. SURFACE E37 *yours* line belongs on
that anchor. This is Q1308 ruling, applied to the race path (live.js:830) and
never to the author own.

*Why high.* Pure reading, no timing, no layout. The two paths are visibly
different code: the race path calls `siteOfSpan` at live.js:1013, 1091, 1117
and 1221; the `mine` path calls `keysOfSpan` at 1153 and 1155 and nothing else.

---

### PF2 — somebody else’s multi-site patch is drawn as one enormous run
**Confidence: high. Severity: high.**

*Shape.* A member proposes one candidate with two hunks — `{4,5}` and
`{40,41}` — which is exactly what the composer sends for a two-site draft
(live.js:1383–1395 maps `d.sites` to one hunk each).

*What the code will draw.* `spanOfSides` (live.js:947–950) is `spanOf(hs)` over
that candidate’s hunks: `{start: 4, end: 41}`. `siteOfSpan` sees `end > start`
and returns `keysOfSpan` over the whole stretch — every visible block from
`L4` to `L40`. So:

- the card’s head is thirty-six paragraphs (`runTextFor`, session.js:300–305);
- both lanes are thirty-six paragraphs with two marked changes
  (`applyIn`, live.js:840–846 — the content is *correct*, the scope is not);
- opening it swallows every one of those blocks into the card
  (session.js:2975–2978), so a third of the charter vanishes into a card;
- there is one tab, at `L4` (`tabKeysOf`, session.js:431).

*What the member should see.* SURFACE M18: *a patch alone keeps a tab at every
place it touches, its sites being separate places*, and K18: a patch race’s
site cards each carry their own controls with one floating vote row
(`renderPatchRow`). SURFACE K17–K18 and §9.1 write several rules about exactly
this object.

*The deeper fact.* **`kind: 'patch'` is fixture-only** (S17). Every piece of
machinery SURFACE writes rules for — the per-site card (session.js:2613), the
*place n of m* tooltip (session.js:3005–3006), the per-site teasers
(session.js:701), the floating patch row (session.js:4522–4525), the patch
branch of `swallowOpen` (session.js:2953) and of `cards.js:844` — is
unreachable from `itemsFromView`. The live path has never drawn a rival’s patch
as a patch. Q1407’s fix cut the *pair* span to the union of two sides’ hunks,
which is the right cut for two candidates and no cut at all for one candidate
with two hunks.

*Why high.* `spanOf` is min/max by construction (live.js:847); nothing between
it and the renderer re-splits.

---

### PF3 — an open sealed record over several blocks prints its later blocks twice
**Confidence: high. Severity: medium-high.**

*Shape.* A race over `L4` + `L6` (a merge, or a two-paragraph rewrite — the
fixture’s `race-quorum` shape) is adopted. The record’s `at` spans both, so
`keysOfSpan` gives `['L4','L6']`. You press its filed mark.

*What the code will draw.* Q1407’s swallow lives in `swallowOpen`
(session.js:2975–2978), which the clause pass calls **only inside
`if (live.length)`** (session.js:3179). A sealed-only clause takes the other
branch (session.js:3183–3205), whose test is

    const swallowed = wasResolved && openId === wasResolved.id && !cardDone;

At `L4` that is true: the card is drawn and `cardDone` is set. At `L6`
`cardDone` is now true, so `swallowed` is false and the paragraph is drawn
again — *below* the card that already holds it in its head (`runTextFor` joins
both keys, session.js:300–305, reached via `skey = keys[0]` at session.js:1985
and `headOpts` at 2096) — carrying its own `.achip` tab
(session.js:3200–3202).

*What the member should see.* SURFACE M18: *an open card swallows every block
of its span … so the text is never on the page twice with the run’s tabs under
the card that holds it*, and `card-audit`’s **P10**: *one tab per open card —
the strip’s, none outside it*. P10 would catch this if the fixture had a
multi-block sealed record; it has only single-block ones
(fixture-session.js:517–603, 854–933).

*Why high.* Two branches, one fixed and one not, visible side by side.

---

### PF4 — a sealed record over several blocks wears its filed tab on every block
**Confidence: high. Severity: medium.**

*Shape.* As PF3, card closed.

*What the code will draw.* `sealedAt` (session.js:3165) and `hSealedAt`
(session.js:3120) test `(g.keys ?? []).includes(line.key)`, and `filedFor`
(session.js:2258) does the same. Q1408 routed **live** items through
`tabKeysOf` (session.js:431, via `suggFor` at 434) and left these three alone.
So the adopted record shows its grey mark at `L4` *and* at `L6`, and once read
it joins the filed pile at both.

*What the member should see.* SURFACE M18: *a race or a pair spanning several
blocks stands at its first block alone* — Ed’s answer to *for my whole-document
rewrite I now see a blue proposal tab beside every clause*. A record is the
settled form of a race; M18’s sentence does not exempt it, but it also does not
name it. **Probably ruled; worth one line of confirmation from Ed.**

---

### PF5 — a clause emptied from the composer leaves a record with no tab and no card
**Confidence: high. Severity: medium.**

*Shape.* In edit mode you select a paragraph (`L4`) and delete its text. The
site’s text is the empty string; `draftRowState` (composer.js:687–697) compares
it with the origin, finds it changed, and enables the commit. `hunksOf`
(live.js:1383) then sends `{ start: 4, end: 5, lines: [''] }` — **not**
`lines: []`, because splitting the empty string on a newline gives one empty
line, not none.

*What the code will draw.* While it is live everything is fine: the span is
`{4,5}`, `L4` is still a real block, and the lane says *(all text removed)*
(`mdBlocksHtml` returns an empty `.lp`, cards.js:582; the pseudo-element is
system.css:1517–1522 — K21 handled). The break is at adoption:

- `adoptedSpan` grows the span by the winner’s growth, which here is zero, so
  the record’s `at` is `{4,5}` — **not** the empty span the deletion path is
  written for;
- line 4 is now blank, so `blocksOf` emits no block for it
  (session-view.html:8523);
- `keysOfSpan({4,5})` finds nothing non-blank and falls back to `L4`
  (live.js:821) — a key no block answers to;
- `siteOfSpan` sees `end > start` and returns a plain key site, not a gap site
  (live.js:831), so `gone` is false (live.js:1250) and the record does not say
  *removed*;
- no tab, no card, and a rail entry at index -1 that opens nothing.

*What the member should see.* SURFACE M19 / Q1333: a deleted clause’s record
*takes the gap’s own site … the gap key, the block before it, the insert head*,
and says *removed*. The engine and the server already implement that — for
`lines: []` (`packages/server/src/record-spans.ts`, whose `adoptedSpan` comment
names the case explicitly). `scripts/room-bots.mjs:324` sends `lines: []`, so
**a bot’s deletion is drawn correctly and a human’s is not** — which is why
this has never been seen in a bot room.

*The question underneath.* Whether an emptied site *should* send `lines: []` is
a rule nobody has written. **No rule — a question for Ed.** Two readings:
(a) an emptied site is a deletion and the page should send an empty lines
array; (b) an emptied site is a blank line and the page is right, in which case
`keysOfSpan` owes blank-only spans a site.

---

### PF6 — the first gap in the document is labelled by the document’s last heading
**Confidence: high. Severity: low.**

*Shape.* Anybody proposes an insertion at line 0 — including the only proposal
an **empty document** can carry, which `hunksOf` sends as `{0,0}` by
construction (live.js:1391–1393, Q649 (a)).

*What the code will draw.* `siteOfSpan({0,0})` sets `insertAfterKey: null`
(live.js:835–837 — the backward scan starts at -1). Every caller then does
`labelFor(site.insertAfterKey || site.keys[0])` (live.js:977, 1093, 1119, 1252,
1313), so the label is computed for the gap key `G0`. `labelFor`
(live.js:863–867) walks `SESSION.DOC`, never finds `G0`, never breaks, and
returns whatever heading it saw **last**. So the rail entry for an insertion at
the top of the document is titled by the bottom section of it.

*What the member should see.* session.js’s own `gapLabel` (session.js:274–282)
has the answer — *at the start of the document* — and the live path never calls
it. The fallbacks after `h` (`cs_titleNow()`, then the clause’s first words)
are both unreachable, because `h` is truthy in any document with a heading.

---

### PF7 — the closed page’s backlog paragraph joins a multi-paragraph candidate with spaces
**Confidence: medium-high. Severity: medium.**

*Shape.* A race whose leader is two paragraphs, or whose leader begins with a
`# ` heading, is still undecided when the clock closes (SPEC §4.6).

*What the code will draw.* session-view.html:8614 flattens the leader’s hunk
lines, runs `unhead` over each to strip the block marker, and joins them with a
**space** into one `t: 'p'` block. The same candidate’s own record card renders
it in blocks (`textOfF`, live.js:1224, then `mdBlocksHtml`), so the closed page
and the record beneath it disagree about the same words.

*What the member should see.* SURFACE K19 as amended by Q1406: *the head, every
proposal lane and a record’s slate render the source through one block renderer
… so a clause or a candidate of several paragraphs keeps its breaks and a
heading in it its rank*. The backlog paragraph is not one of the three places
K19 names, so this is **ruled by analogy at best — worth asking Ed** whether
the closed page’s backlog is document text (blocks) or a summary line (prose).

*Why medium-high rather than high:* the shape needs a close, which only
`ladder --to=closed` and the `closed` fixture reach, and the fixture’s
undecided records are single-line.

---

### PF8 — two engine insertion points, one visual gap
**Confidence: medium. Severity: low-medium.**

*Shape.* `L4` paragraph, `L5` blank, `L6` paragraph. One insertion goes at
`{5,5}` (what the page sends: `gapAfter('L4')` is `G5`, session.js:256).
Another arrives at `{6,6}` — from a client with different line arithmetic, or
from `rebaseHunks` after an adjacent adoption.

*What the code will draw.* `spansConflict`
(`packages/engine-core/src/text/patch.ts`:110–118) says two insertions conflict
only at the *same* position, so these are two races that will never be
compared. Both `siteOfSpan` calls scan back to the last non-blank line and
return `insertAfterKey: 'L4'` (live.js:835–837), so `gapsAfter('L4')`
(session.js:3064) draws **two anchors in the same visual gap**, with different
gap keys, about the same place in the document, which no member can tell apart.

*What the member should see.* SURFACE M19: *two insertions at one gap are two
entries* — which is this, and reads as intended. But the two are *not* at one
gap in the engine’s terms. **No rule — a question for Ed:** whether the blank
line between two paragraphs is a place the page may address at all.

---

### PF9 — the auto-fold between a proposal’s sites never fires on the live path
**Confidence: medium. Severity: low.**

`foldBetweenSites` (session.js:400–419) folds the sections *between* a patch’s
sites so the whole footprint fits one screen, and refuses to fold anything a
site lives inside. Its input is `suggestionSections(id)` (session.js:344–352),
which reads `s.keys` — and on a live multi-site `draft`, `keys` is
`keysOfSpan(spanOf(spans))` (live.js:1153), i.e. **every block between the
first and last site**. So every intervening section is in `secs`, lands in
`keep`, and nothing folds. Called from session.js:3908.

*What the member should see.* No SURFACE rule names the auto-fold; its reason
is in `design/DECISIONS.md`. **Unruled, and low stakes** — but it is the same
root cause as PF2: `keys` is a range, not a set of places.

---

### PF10 — a hunk whose span holds only blank lines orphans its item outright
**Confidence: medium. Severity: medium where it happens.**

*Shape.* Any hunk `{i, i+1}` where line `i` is blank. The composer cannot
produce one (it keys by block, and blanks have no block), but three other
things can: a client writing hunks off its own line arithmetic; `rebaseHunks`
after an adoption that inserted a blank line; and PF5’s adoption, which
*creates* the blank line every later hunk can land on.

*What the code will draw.* `keysOfSpan` falls back to the key of `sp.start`
(live.js:821), which no block answers to: no tab (`suggFor`, session.js:434),
no card (the clause pass never reaches a key it does not render), a rail entry
sorted to -1 (`docIndexOfKey`, composer.js:82–86), and `anchorForEntry` null
(session.js:1058–1060).

*What the member should see.* A press on an entry changes something on the
page. This is the same class as Q1298 (*a green tick entry whose click opened
nothing*) and Q897 (*a heading proposal that opened nothing*) — both found by
eye in a bot room. The remedy — clamp to the nearest rendered block either
side — is **unruled as such**, though it follows from M19’s treatment of a
deleted clause.

---

### PF11 — an empty hunk list makes an infinite span
**Confidence: medium. Severity: low.**

live.js:847 takes `Math.min` over a spread of an array that can be empty. Two
call sites can be handed one: live.js:1213 (a record with no `at`, no field
hunks and an empty `footprint`) and live.js:935 (`csp`, if a race’s `contested`
is empty *and* every candidate has no hunks — not reachable today, since a pure
insertion still has a one-span footprint, patch.ts:88–107). `keysOfSpan` then
clamps to the last line (live.js:821), so the symptom is a record filed at the
end of the document rather than a crash.

---

### PF12 — a retired multi-block record shows one block as the current text
**Confidence: high. Severity: low.**

`sealedCardHtml` takes no site key (session.js:1922) and reads
`currentTextFor((s.keys ?? [])[0])` for the incumbent line (session.js:1946),
where the head one line above reads the **whole run** (`runTextFor` via
`headOpts(s, skey)`, session.js:2096). On a record that retired a
two-paragraph challenge the card states the incumbent as its first paragraph
and the head as both.

---

## 3. Cells the code handles correctly

Read and found sound, so the reader knows the sweep was complete:

- **one block**, **the first block**, **the last block** — the ordinary path:
  `keysOfSpan` gives one key, one tab, and the card replaces the paragraph.
- **several adjacent blocks** (a race, a pair, a park, a crown): one tab at the
  first block (`tabKeysOf`, session.js:431), the card swallows the rest
  (session.js:2975–2978), the head is the run joined by newlines
  (`runTextFor`, session.js:300–305). Q1407 and Q1408, both verified in place.
- **a run spanning a blank line** (a merge of two paragraphs): `keysOfSpan`
  skips the blank, and `plain` and `runTextFor` drop it identically, so the
  head and the lanes agree.
- **a gap between blocks, and a gap after the last line**, on the *race*,
  *crown*, *park* and *record* paths: `siteOfSpan` (live.js:830–838) gives a
  `gapKey` and an `insertAfterKey`, `gapHolders` (session.js:270) draws the
  anchor, and the open card replaces the anchor (session.js:3041–3047, Q1379).
- **a gap at index 0**: the anchor *placement* is right — the holders whose
  `after` is null are emitted above the first block (session.js:3065). Only the
  label is wrong (PF6).
- **a true deletion**, of one block or several: the lane says *(all text
  removed)* (cards.js:582, system.css:1517), and the record’s `adoptedSpan`
  collapses to an empty span, hence a gap site, hence `gone` and *removed*
  (record-spans.ts; live.js:1250–1252).
- **a split** (one line into two) and **a replacement producing more lines than
  it replaces**: `adoptedSpan` grows the span by the winner’s growth, so the
  record covers the lines it produced.
- **the whole document rewritten**: the pair’s span is the rewrite’s own
  footprint, one tab at `L0`, and the card swallows the document. That is what
  Q1407 ruled and what the code does.
- **a one-line proviso in a race that also holds a whole-document rewrite**:
  `spanOfSides` (live.js:947–950) cuts the pair to the union of its two sides’
  hunks, the incumbent contributing none — Q1407’s fix, verified.
- **a candidate whose hunks lie partly outside the pair’s other side**: the
  union covers both, and `applyIn`’s splice index (live.js:843) is non-negative
  by construction.
- **on a heading line**: an addressable block like any other (Q897) — the
  heading branch carries both the live half and the sealed half
  (session.js:3106–3157).
- **spanning a heading boundary**: `keysOfSpan` does not care, and the head
  keeps the `# ` marker since Q1403/Q1406, so the rank survives into
  `mdBlocksHtml` (cards.js:580–622).
- **an empty document**: `blocksOf` returns one empty block and **no** trailing
  gap (session-view.html:8533–8535), `hunksOf` clamps the proposal to `{0,0}`
  (live.js:1391–1393), and `siteOfSpan` makes it the start gap. Only PF6’s
  label is wrong.
- **a stranded candidate**: `m.at` is carried per hunk by `spanNow`
  (`packages/server/src/views.ts`:240–243) and consumed only when its length
  matches (live.js:1151). Correct — except that a stranded *insertion* inherits
  PF1, since `shiftSpan` cannot touch an empty span and `keysOfSpan` still
  fumbles it.
- **after an adoption above it moved lines**: records carry `at` (Q1333,
  record-spans.ts); live candidates are rebased by the engine (`rebaseOthers`,
  `packages/engine-core/src/session.ts`:1715–1751) so their hunks and
  footprints are always current; and a park cannot be crossed at all
  (session.ts:1727–1739). The drift the live.js:1291–1301 comment tolerates is
  real but bounded.
- **markdown in blocks** (Q1406) on the head, the lanes and the slate; and the
  markdown-aware diff (Q1368) — one renderer, `mdBlocksHtml`.
- **the closed page**: `closedBlocks` keys its synthetic blocks with the `U:`,
  `S:` and `A:` prefixes (session-view.html:8606–8625), and `siteOfSpan` is
  bypassed for undecided records (live.js:1221). Only PF7 bites.

---

## 4. What the fixture covers

`card-audit` opens 48 cards per epoch against `design/fixture-session.js`.
**It exercises the renderers and not the mapping** — the fixture’s blocks are
named (`guests`, `quorum`), never `L<i>`, and its items arrive with `keys`,
`sites` and `marked` already computed, so `keysOfSpan`, `siteOfSpan`, `spanOf`,
`spanOfSides`, `applyIn`, `plain` and `labelFor` are never called.

Shapes the fixture **does** contain, and the probes that read them:

| shape | fixture | probe |
|---|---|---|
| one block, one candidate against the incumbent | `quick-keys` and ~25 others (fixture-session.js:322+) | the whole `charter` walk |
| two challengers as a pair | `race-purse` (291), `race-guests-rivals` (478) | — |
| **a run of two blocks, a race** | `race-quorum`, keys `quorum` + `quorumShort` (351) | **T1** (card-audit.mjs:1779–1796): head 2 blocks, each lane 2 or more, one bullet, no raw marker; **P10** through `walkSettled` |
| **a run of two blocks, yours** | `mine-guests-wording`, one site over `guests` + `guestsDuty` (502–516) | **T2** (card-audit.mjs:1741–1748): exactly one tab |
| a multi-site patch, three sites | `patch-rename` (310–320) — **but `kind: 'patch'`, which the live path never emits (S17)** | P7’s switch pass |
| a gap between blocks | `insert-quiet` (367), `race-quiet-rivals` (380) — `insertAfterKey` only, **no `gapKey`** | **P9** (card-audit.mjs:781–795): the anchor is 30px, the tab flush; **P10** |
| a stranded proposal | `mine-lostkey-stranded` (665) | — |
| a park | `park-accounts` (768), `quick-accounts-blocked` (779) | — |
| a deadlocked race of eight | `race-sanctions` (681) | — |
| a salience diagonal | `diag-quorum-keys` (336) | — |
| sealed records, **single-block only** | `quick-guests-pets` through `race-nomination` (517–940) | the `charter` and `closed` walks |

Shapes the fixture does **not** contain, each of which is a predicted finding
above: a gap at index 0; a gap after the last line; a deletion in either
spelling; a **sealed record over several blocks** (PF3, PF4); a whole-document
rewrite; a record carrying `at`; a multi-site patch on the live path; a blank
line between blocks at all; an empty document; and a candidate that produces
more lines than it replaces.

---

## 5. Suggested invariants

Predicates a walk should assert **per seat, per era**, against a live server
holding a blank-line-separated document — that is, in `journey-walk.mjs` or a
new `shapes-walk`, and **not** in `card-audit`, because the mapping is
live.js’s and the fixture cannot reach it. Each is traced to its rule, or
marked unruled.

1. **Every item in `SESSION.SUGGS` has a way in.** For every id, one of
   `[data-anchor]`, `[data-card]`, `[data-tab]` with that id exists in the
   charter column. → SURFACE M17; already the shape of `card-audit`’s *opened
   nothing* check (card-audit.mjs:1764–1775), never run live.
2. **Every key an item names is a rendered block or a gap.** For every
   `s.keys` and every `site.keys`: the key is a `G`, `U:`, `S:` or `A:` key, or
   a `[data-key]` for it exists. → derived from SURFACE M18 and M19; **unruled
   as stated** — the rules say where a tab goes, not that a key must resolve.
3. **An item whose span is an insertion carries a gap site.** For every hunk in
   `v.mine` with `start === end`, the matching site has `gapKey` and
   `isInsert`. → SURFACE M19, K31, Q1308. **PF1.**
4. **One tab per item, per place.** The count of `.achip[data-anchor=<id>]`
   equals the number of sites for an item with sites and 1 otherwise — **for
   sealed items too**. → SURFACE M18 (Q1408). **PF4.**
5. **No tab for the open card stands outside it.** P10’s predicate
   (card-audit.mjs:772–780), run against a live multi-block **sealed** record.
   → SURFACE M18 (Q1407), `card-audit` P10. **PF3.**
6. **An open card’s blocks appear once.** For the open item’s `keys`, no
   `[data-key]` for any of them exists outside `.sugg[data-card=<id>]`.
   → SURFACE M18 (Q1407). **PF3.**
7. **A pair’s span is the pair’s.** The `keys` length of a pair item equals the
   number of visible blocks in the union of its two sides’ hunks, not the
   race’s. → SURFACE M18 (Q1407). Already true; assert it so it stays true.
8. **A multi-hunk candidate is several places, not one run.** For a rival
   candidate with n hunks, the item has n tabs and n rail entries. → SURFACE
   M18’s patch clause, K18. **PF2 — and it needs a ruling first:** whether a
   rival’s patch should become a `patch` item, or whether M18’s patch clause is
   about your own drafts alone. **A question for Ed.**
9. **A gap entry is labelled by its gap.** The `qLabel` of an item with
   `isInsert` and a null `insertAfterKey` is *at the start of the document*,
   never a heading. → session.js’s `gapLabel` (274–282); **unruled on the live
   path** — the copy exists and nothing calls it. **PF6.**
10. **A record’s card says what happened to its clause.** For every record
    whose `at` names no visible block, the card reads *removed* and stands on a
    gap. → SURFACE M19, Q1333. **PF5, PF10.**
11. **A candidate of several paragraphs reads in blocks everywhere.** Extend
    T1’s predicate to the closed page’s backlog paragraph. → SURFACE K19
    (Q1406) **by analogy only — a question for Ed** (PF7).
12. **Two entries never share one anchor unless they are two insertions the
    engine can compare.** → **unruled** (PF8).

---

## Open questions for Ed

Raised by this reading. The numbers are **not claimed** — `8d7230e` reserves
1409–1428 for the overnight pass, and these should take five of them when the
pass writes its block into QUESTIONS.md.

1. **Should an emptied site send an empty lines array?** The composer sends one
   blank line instead, so a human’s deletion and a bot’s take different paths
   through the record (PF5).
2. **Is a rival’s multi-hunk candidate a patch on the surface?** SURFACE M18
   and K18 write rules for one; `itemsFromView` has never made one (PF2, S17).
3. **Is the blank line between two paragraphs a place the page may address?**
   Two engine insertion points, one visual gap (PF8).
4. **Is the closed page’s backlog paragraph document text or a summary line?**
   K19’s block rule reaches it, or it does not (PF7).
5. **Does M18’s “first block alone” cover a sealed record?** (PF4.)
