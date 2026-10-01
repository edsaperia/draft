# PRESENCE.md — where each member is reading

A working document in MOBILE.md's shape: decisions numbered from the project sequence, stages checked off as they land, rules leaving for SURFACE.md when built — SURFACE wins where they disagree, and SPEC §3.5 / §3.5a win over both. Written 2026-09-30 from the rulings Ed gave in the coordinator's session that evening (Q1570). It answers **Q314** (Ed, 2026-08-17: *let's shelve this for now until we actually test with a group of real humans*): the lab room of 2026-09-11 and the convention were those humans, and Ed reopened it himself — *it would be nice to see more user presence in the document, at least on desktop.*

## 0. Context and the decisions already made

Presence today is one bit per member: an authenticated read stamps the member's activity clock (`Session.seen`, `packages/constitution/src/session.ts:1047`, at most hourly — Q459 (a)), the view says who has arrived and not lapsed, and the topbar draws them as the `room-faces` row (`roomFaces`, `design/session-view.html:2478`): *everybody who has arrived except you*, presence and nothing else (SURFACE C16). The `room-pulse` beats once per action by anybody and says nothing else, which is what keeps it inside SPEC §3.5. Nothing on the surface says **where** anybody is.

**Decisions (Ed, 2026-09-30):**

1. **More presence in the document, desktop first.** Members' avatars on the left edge of the document, moving up and down as they read, showing where each is looking. *It doesn't have to be very real-time if that is expensive.*
2. **Anchored to text, never to pixels.** A mark stands beside a block (an engine line, `blocksOf`'s `L<i>`), so the same clause on every screen; a phone at 390 and a desktop at 1600 share no scroll position.
3. **Dwell, not scroll.** A place is reported once the reading line has rested on it; scrolling past moves nobody.
4. **Clause grain, on the document's left edge** — *connected to clauses rather than the ToC*. Several readers on one clause **line up vertically**; no stack, no +n.
5. **The same mark in every state** — *fine for now*: reading, judging and drafting draw alike. Where, never what.
6. **Pressing a face does nothing.** Beside a clause there is nowhere to travel to. **Hover shows the name.**
7. **You are not in it**, as the topbar row already excludes you.
8. **The topbar row stays.** It says who is here; the margin says where.
9. **Faces are named wherever proposals may be signed.** *If the proposal setting is fully anonymous, we can have anonymous faces* — and, ruled on 1570.1, *I can live with faces being shown on any setting that allows signed proposals*: under 👤 Anonymous Proposals' `public`, `anonymousElective` and `sealedElective` rungs a member's own face; under `anonymous` and `sealed` an anonymous mark, **👀**, drawn **right-facing** — looking into the document, not out of it (the emoji faces left in every platform set).
10. **Tracking an anonymous mark from poll to poll is not a concern** — *not very important in practice*. A mark keeps its identity between polls and glides under every rung.
11. **Not real-time.** The 4 s poll is the clock; nothing new is opened to the host.

## 1. The mechanism

### 1.1 Reporting: the poll carries where you are

- **The reading line** is the one `bringIntoView` already aims at (`READ_LINE`, `design/session.js:5168`). `readingKey()` is the block under it: the nearest `[data-key]` block whose box spans the line, else the last one above it; a heading is a block like any other (a kind per line).
- **Dwell**: a scroll listener notes the key and the time it arrived; the key is *settled* once it has stood for `DWELL_MS` (2 s, recommended). The poll reports the settled key, or nothing while the reader is moving.
- **Transport**: the seat's view GET (`api.refresh`, `design/live.js`) gains one query field, `?at=L7`. No command, no body, **no log event** — *reading a document is a write* (Q681) is the gotcha this must not re-earn.
- **Who reports**: members. Strangers and applicants report nothing; the closed page reports nothing. Narrow reports too — it is one field — but does not draw (§1.3).

### 1.2 The host: a table in memory, never the log

- Each open document keeps `presence: Map<memberId, { at: string, t: number }>` beside its record in the server's memory, written by every view that carries `at`, an entry dropped after `PRESENCE_TTL_MS` (30 s — seven polls) or on the member's removal. Lost at a restart, which is right: nobody is reading a host that has just come up until they poll it, four seconds later.
- The member view carries `reading: [{ id, at }]` for every *other* member whose entry is inside the TTL. The stranger's view and the applicant's view carry none: the audience is **the membership** (a §2 row in SURFACE, `seat-matrix` reading it).
- **Under the two anonymous rungs the payload carries no member id** (1570.3, ruled): each entry is `{ k, at }` with `k` an opaque token minted per member per host boot. The view is the blind projection — what a seat may know is what the payload holds (SPEC §3.5) — so *anonymous* has to be true of the bytes, not only of the picture. The token keeps decision 10: a mark still glides.
- **The demo**: a bot sets its `at` through the same table when it acts (the target clause is known in `applyCommand`, `packages/server/src/apply-command.ts`), so the PizzaCon room visibly moves around the document; a visitor's phone reports through the poll like any member.

### 1.3 Drawing: a column of marks beside each clause

- A new layer, **`reading-margin`** (`#reading`), a child of `.doc` beside the wires layer, laid on the same passes as `layoutQueue` and `drawWires` (scroll, resize, every render, and each font face landing — the rail-font gotcha). Each mark is positioned absolutely: `top` from its block's rect, at the line the block's own tab uses (`.chipcol`'s `top: 0.15em`, `design/system.css:1829`); `left` on the **desk**, outside the sheet's trim (`--sheet-trim`, `design/system.css:3413`), so it collides with nothing — the tab gutter (`.chipcol`, `right: 100%` of the paragraph plus 14px) is inside the sheet.
- **One column per block**, marks stacked downward from the block's first line with a 2px gap, in arrival order so a column never reshuffles; a column longer than its clause runs past it rather than shrinking. **20px marks** (1570.2, ruled: smaller than the topbar's 26px so a column of five reads as a margin note, not a crowd).
- **Keyed by member id** (or the token), so under the keyed re-render (stage 9, `PATCH.set`) a mark is the node it was and its `top` **transitions over `--reading-ms`** (1400 ms), eased at both ends on `cubic-bezier(0.65, 0, 0.35, 1)` (Ed, 2026-10-01): a move glides, setting off and settling gently. A mark that arrives fades in; one that leaves fades out over `--wash-ms` (700 ms). Under reduced motion it steps.
- **A face** is `avHtml`'s (`design/cards.js:1597`), the topbar's own; its `title` is the name and nothing else (STYLE §3). **The anonymous mark** is `glyphHtml('eyes')`: `GLYPH` (`design/cards.js:342`) gains `eyes: ['👀', 'eyes']`, `scripts/fluent-glyphs.mjs` gains a per-key **mirror** flag so the sprite's symbol faces right; no `title`. Adding 👀 to `GLYPH` makes it furniture, so `RESERVED_EMOJI` refuses it as a member's face (and `faces.ts` mirrors that).
- **Desktop only**: drawn when `!matchMedia(NARROW_Q).matches` (`design/session.js:5203`). On a phone the left gutter is gone and the task sheet is the wrong home; the narrow form is an open item for MOBILE.md.
- **Never** on the closed page, never for a stranger or an applicant, never your own.

### 1.4 What it must not say (SPEC §3.5)

- **Where, never what.** The mark is the same by a clause with a race on it as by any other, the same while the member's card is open, the same while they draft. No count, no direction, no state.
- **Names follow 👤** (decision 9):

| 👤 rung | the mark | hover |
|---|---|---|
| `public`, `anonymousElective`, `sealedElective` | the member's face | the name |
| `anonymous`, `sealed` | 👀 | nothing |

  The elective rungs show faces by Ed's ruling on 1570.1 (*any setting that allows signed proposals*), against the coordinator's recommendation of 👀 there — the reasoning offered, that the choice to sign is made per proposal after the reading, is in DECISIONS with the ruling.
- **A small room** is a known limit, not a new one: with two members an anonymous mark is plainly the other person, exactly as an anonymous proposal is.
- **The topbar row stays named under every rung**: who is in the room is membership and public (§9.0c); what the anonymous rungs hide is where each person is.

## 2. Verification

- **`scripts/presence-walk.mjs`** (`npm run presence-walk`, a sprint-tier walk from its first day — Q1547, `sprint-pages`): founds a document, three seats at 1600 under 👤 `public`. A scrolls to a clause and dwells → within two polls B's margin shows A's face beside that block and never B's own; A scrolls on inside the dwell → nothing moves; A and C on one block → two marks in one column, none stacked, no +n, in arrival order; hover → the name alone; the founder moves 👤 to `sealed` → both marks 👀, no `title`, and B's view payload carries no member id beside a place; a fourth seat at 390 reports (B sees it) and draws nothing; a seat that closes its page is gone from B's margin within the TTL; the closed page draws none. Keyed identity: the mark's node is the same node after a move (the stage 9 discipline, `render-hold-walk`'s assertion shape).
- **`card-audit`'s fast pass unchanged** at 1600 and 390: the margin lives outside every card.
- **The probes**: the session-probe's fixture (`?fixture=session`) gains two readers so the margin is part of the frozen surface — one freeze (1570.4, ruled); the setup-probe is untouched (no presence at the birth).
- **`spec-check`**: the new SURFACE §2 row's audience cell read by `seat-matrix --static`; the glossary entries.

## 3. Docs, scheduled — edits to other documents, not performed here

| Document | Edit | When |
|---|---|---|
| `SPEC.md` §3.5a | a numbered rule: *where a member is reading is shown to the membership; named under every 👤 rung that allows a signed proposal, unnamed under `anonymous` and `sealed`; never logged* — ruled 2026-09-30, **Ed's sign-off on the sentence, version bump**; until built, a row of §13's ledger (Q1275), `→ why: R-nnn` | with the build |
| `design/SPEC-REASONING.md` | the R-nnn: this document's §0 and §1.4 | with the SPEC edit |
| `SURFACE.md` | C16 amended (the topbar row *and the reading margin*: presence, where, and nothing else); a new M rule for the margin's geometry (§1.3); a §2 row with audience *the membership*; the hover copy | at the build |
| `design/STYLE.md` | the hover: the name alone, no verb | at the build |
| `CLAUDE.md` | glossary: `reading-margin` [concept] under `session-view`; the guard named once `presence-walk` runs in a workflow | at the build |
| `design/DEMO.md` | the bots' place (§1.2) | at the build |
| `design/MOBILE.md` | open item: the margin's narrow form | at the build |
| `QUESTIONS.md` | 314 folded into 1570 | now |

## 4. The calls (1570.1–1570.5) — all ruled by Ed, 2026-09-30

- **1570.1 — the elective rungs.** Faces (*I can live with faces being shown on any setting that allows signed proposals*), against the recommendation of 👀; §1.4's table.
- **1570.2 — size and place.** 20px marks, 2px gaps, on the desk at the sheet's left edge outside the trim (*sounds good*). Ed eyeballs it on the fixture.
- **1570.3 — the anonymous payload.** Tokens, not ids (*yes*; §1.2).
- **1570.4 — the fixture.** Two readers in `?fixture=session`, one session-probe freeze (*ok*).
- **1570.5 — sequencing.** After redesign stage 9 merges (*yes*): the margin lives in `session.js`, `live.js` and `session-view.html`, the files stage 9 is patching, and the keyed re-render is what lets a mark glide. A builder brief from this document and SWEEP.md, one liveness brief.

## 5. Acceptance (evidence at file:line when built)

- A member's poll carries `at`; the host's table holds it; the view carries `reading` for the membership only — `packages/server/src/routes-member.ts` (the GET view route, :101), the view projection, `seat-matrix` green on the §2 row.
- No log event per poll: the golden log unchanged; `Session.seen`'s hourly stamp untouched.
- The margin drawn by `layoutQueue`'s passes, marks keyed, `top` transitioning; `render-hold-walk`-shaped assertion in `presence-walk`.
- 👀 in `GLYPH`, mirrored in the sprite, refused as a face; `npm run fluent-glyphs -- --check` clean.
- `presence-walk` green in `sprint-pages`; `card-audit` fast pass 0 findings at both widths; session-probe IDENTICAL after its one freeze.
- SPEC §3.5a's rule and SURFACE's C16 / M rule / §2 row landed; `spec-check` green.

## Status

Planned 2026-09-30, every call ruled the same evening. **Built 2026-10-01 on PR #136** (`9bbd581`): the host's table (`packages/server/src/presence.ts`, `reading` on every member answer), the margin (`#reading`, `design/session.js`'s `setReading` · `renderReading` · `layoutReading`), 👀 in the sprite facing right, two readers in the session fixture and the one session-probe freeze (1570.4), `npm run presence-walk` in `sprint-pages`; SPEC §3.5a → R-145, SURFACE C16, M25, E43; the build's calls are 1573.9–1573.15 (QUESTIONS.md, DECISIONS); the narrow form stays MOBILE.md's open item.
