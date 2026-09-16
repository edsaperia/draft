# Plan — Q1401: the subject, wallet and commit glyphs in Fluent Flat

**Ruling (Ed, 2026-09-16 08:20):** *we should convert the subject glyphs and also the wallet and commit glyphs to fluent flat.* After the lifecycle marks (Q1360, *Fluent Flat is perfect!*), every glyph the surface draws as a picture is drawn from Microsoft's Fluent Emoji, Flat style, MIT — not the platform's emoji font. What survives of Q288 (*a subject glyph is an emoji*) is the character as the glyph's **name** in code, copy and data; what goes is the platform rendering it.

Precedence: SURFACE.md wins where this plan disagrees with it; CLAUDE.md's gotchas bind. This plan schedules the edits to the other documents (stage 6) rather than performing them in parallel.

## What is in scope

Three families, one renderer:

| family | glyphs | where they are drawn today |
|---|---|---|
| **subject** — a setting, a door, a gate, an identity card, a news kind | 🪶 📍 🪪 🤝 💤 🥾 ⏱️ ⏰ 👥 👤 ✍️ 👁️ 🌍 📝 🎩 💡 ⚖️ 👑 📯 🌂 ✋ 🖼️ 📧 ✉️ ❌ 🍾 🥂 📭 📨 📬 👋 | the tab in the gutter (`achip`), the rail entry's mark, the card head's eyebrow, the strip on an open card, the birth's ⏩/⏭ stagehand bar (off-system, leave it) |
| **wallet** — the four verbs and the veto | 🪶 ✒️ 🛡️ ✏️ 🏛️ | the topbar sockets (`wallets.js`), the flights and the pencil storm (`flights.js`), the mobile topbar's glyph row |
| **commit** — the row's buttons | 🗑️ ✏️ 🏛️ ✒️ 🪶 📧 ❄️ ✓ (already drawn) ✋ | `.btn.glyphbtn.emojibtn` in band.js, cards.js, composer.js, door.js, begin.js; the proposal-row circles |

**Out of scope, deliberately:** a member's **face** (`emojiface`, the picker, `FACE_EMOJI`) — a face is the member's choice and stays the platform's emoji; the **lifecycle marks** (done, Q1360); the stagehand furniture (`.devswitch`, the ladder bar, 📬); the mail modal (off the design system).

**Ruled, Q1401 (a) — Ed, 2026-09-16 08:35: *draw them in prose too*. Stage 4 builds.** The question as it was put: the glyph **inside a clause sentence** — *all members must agree 🏛️*, *the membership decides ✏️*, *at will ✒️* (copy.js `RULES`), and the ✏️/🏛️/✒️ inside `PAGE_COPY` sentences. Two readings: (i) drawn too, by a post-escape substitution at every reading site (the way `linkify` works — applied **after** escaping, never before); (ii) left as characters inside prose, since a sentence is text and the picture is a control's. The plan builds (i) as stage 4 and stage 4 is skipped if Ed rules (ii). **Build stages 1–3 and 5 regardless.**

## The sizes

Counted 2026-09-16 (non-comment lines): 380 sites across session-view.html (94), setup.js (44), band.js (40), copy.js (27), wallets.js (26), begin.js (16), composer.js (11), session.js (7), flights.js (7), door.js (3), cards.js (2), edit-mode.js (1); the CSS files name glyphs only in comments and selectors. By glyph: ✏️ 71 · ✒️ 61 · 🏛️ 32 · 🛡️ 23 · 🗑️ 23 · 🍾 21 · 🪶 15 · 📝 15 · 🎩 13 · 🪪 10 · 📧 9 · ✋ 7 · the rest under 7 each. Most sites are **not rewritten**: a glyph in a card definition (`g: '🪪'`) stays a character and is drawn by the renderer at the few places that emit markup for it.

## Stage 0 — the assets: one sprite, generated, committed

- `scripts/fluent-glyphs.mjs` (`npm run fluent-glyphs`): reads the mapping table below, fetches each Flat SVG from `https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/<Folder>/Flat/<file>_flat.svg` — hand glyphs (✋ 👋 ✍️) live under `<Folder>/Default/Flat/`, the skin-tone-neutral default — strips `width`/`height`/`xmlns`, keeps the set's `viewBox="0 0 32 32"`, and writes **`design/fluent-glyphs.svg`**: one `<svg style="display:none">` of `<symbol id="fl-<key>" viewBox="0 0 32 32">…</symbol>`, with the MIT notice at the top (the same notice Q1360 put in cards.js). Committed, like `emoji-test.txt` and `emoji-data.js`: the build never reaches the network.
- The page loads it **inline**: `session-view.html` fetches `fluent-glyphs.svg` once at boot and injects it into `<body>` (a `<use href="#fl-…">` to an external file is blocked on `file://` and in the probes' static server; inline is the one form that works everywhere). Injected before the first render; `renderDoc` never waits on it — a `<use>` to a symbol that arrives a tick later simply appears.
- Mapping (key · character · Fluent folder · file stem). Keys are the code's own names where one exists:

| key | char | folder | stem |
|---|---|---|---|
| quill | 🪶 | Feather | feather |
| pin | 📍 | Round pushpin | round_pushpin |
| card | 🪪 | Identification card | identification_card |
| handshake | 🤝 | Handshake | handshake (under `Default/Flat`) |
| zzz | 💤 | Zzz | zzz |
| boot | 🥾 | Hiking boot | hiking_boot |
| stopwatch | ⏱️ | Stopwatch | stopwatch |
| alarm | ⏰ | Alarm clock | alarm_clock |
| busts | 👥 | Busts in silhouette | busts_in_silhouette |
| bust | 👤 | Bust in silhouette | bust_in_silhouette |
| writing | ✍️ | Writing hand | writing_hand (Default) |
| eye | 👁️ | Eye | eye |
| globe | 🌍 | Globe showing Europe-Africa | globe_showing_europe-africa |
| memo | 📝 | Memo | memo |
| tophat | 🎩 | Top hat | top_hat |
| bulb | 💡 | Light bulb | light_bulb (**already in cards.js as `BULB` — reuse, do not duplicate**) |
| scale | ⚖️ | Balance scale | balance_scale |
| crown | 👑 | Crown | crown |
| horn | 📯 | Postal horn | postal_horn |
| umbrella | 🌂 | Closed umbrella | closed_umbrella |
| hand | ✋ | Raised hand | raised_hand (Default) |
| picture | 🖼️ | Framed picture | framed_picture |
| email | 📧 | E-mail | e-mail |
| envelope | ✉️ | Envelope | envelope |
| cross | ❌ | Cross mark | cross_mark |
| bottle | 🍾 | Bottle with popping cork | bottle_with_popping_cork |
| glasses | 🥂 | Clinking glasses | clinking_glasses |
| mailbox-gave-up | 📭 | Open mailbox with lowered flag | open_mailbox_with_lowered_flag |
| incoming | 📨 | Incoming envelope | incoming_envelope |
| mailbox | 📬 | Open mailbox with raised flag | open_mailbox_with_raised_flag |
| wave | 👋 | Waving hand | waving_hand (Default) |
| pen | ✒️ | Black nib | black_nib |
| shield | 🛡️ | Shield | shield |
| voice | 🏛️ | Classical building | classical_building |
| pencil | ✏️ | Pencil | pencil (**already `PENCIL` in cards.js — reuse**) |
| bin | 🗑️ | Wastebasket | wastebasket |
| snowflake | ❄️ | Snowflake | snowflake |
| link | 🔗 | Link | link |
| label | 🏷️ | Label | label |

A folder name that does not resolve is a **finding**, printed by the script and left as a hole (the renderer falls back to the character), never guessed.

## Stage 1 — one renderer, and the marks that already have one

- `cards.js`: `glyphHtml(ch, opts)` → `'<svg class="gl" role="img" aria-label="<name>" data-gl="<key>"><use href="#fl-<key>"/></svg>'` for a mapped character, the escaped character for anything else. `GLYPH` is the table (character → key, name); the name is the Fluent folder's, lower-cased, for the label. Exported on `window.CARDS` beside `mkSvg`. **Every site that draws a glyph as a picture goes through it**; a site that stores or compares a glyph keeps the character.
- `.gl { width: 1em; height: 1em; vertical-align: -0.15em; display: inline-block }` in system.css beside `.mkp` — the same *a glyph is a glyph, not a disc* discipline as `emojiface`: it takes the size of the text it stands in. The three sites that state a size (the tab, the socket, the commit button) keep stating it on the container.
- Sites: the tab in the gutter (setup.js `achip` markup, session.js's charter tabs), the rail entry's mark (`railEntry`, and `markOf` where the mark is the subject glyph), the card head's eyebrow, the open card's strip, the ⏳/news entries' subject glyphs. `MARK`/`DRAWN` stay the lifecycle alphabet; a subject glyph is a different thing and is not added to them.
- Guard: `design/tools/session-probe.js` and `setup-probe.js` re-frozen once, and **a new probe assertion**: no `.achip`, `.qcard` mark or `.eyebrow` holds a raw character from `GLYPH`'s table (a scan of `textContent` against the table — the label is on the svg, not in the text, so the scan is exact).

## Stage 2 — the wallets and their flights

- `wallets.js`: each socket's `<i>` holds `glyphHtml` instead of the character; the mobile glyph row (Q1351) the same. The strike (`::after` on the socket) is untouched — it never entered the glyph. `.notheld i { filter: grayscale(1) }` still drains a drawn glyph (Q1360's rule: a picture is drained, not repainted).
- `flights.js`: `flyGlyph` clones the socket's token by `#penwallet i` — it keeps working because the `<i>` still exists; the flying node is now an `<i>` holding an svg, so `arcFrames`' transform applies to the `<i>`. The pencil storm builds its pencils from `glyphHtml('✏️')`. The spend-preview is render state and untouched.
- Guard: `npm run journey` (the flights and the wallet counts), `npm run powers-walk`, and card-audit's wallet measurement: **the navbar's height before and after is the same number** (CLAUDE.md gotcha: sockets are 24px because the avatar sets 26).

## Stage 3 — the commit row

- `.btn.glyphbtn.emojibtn`'s content becomes `glyphHtml(ch)`; `.btn.glyphbtn` alone states the size (card-audit B6) and now sizes the svg through `.gl`'s `1em`. ✓ stays the drawn `TICK`. Sites: band.js's commit builder (`commitGlyph`), the door commits, begin.js's 🍾, composer.js's row (`row-commit`, `draft-propose`), door.js's 📧, the proposal-row circles (`#editdoor`, `#patchrow`), cards.js's ❄️.
- The held state (`.holding`, `.penholding`) transforms the button, never the glyph — untouched. `isPenCommit(held)` reads a data attribute or class, never the character: check, and fix any site that compares `textContent` to a glyph (the *every radio says the same words* gotcha's cousin).
- Guard: `npm run card-audit` (B1–B6 on every commit), `journey`, `after-begin-walk`, `invite-walk`; copy-check `--walk`: the walk records a button's `label` from its text — with an svg the text is empty, so the walk must read `aria-label` first (`scripts/copy-check.mjs` and `card-audit.mjs`'s `buttons()`); re-freeze the goldens after.

## Stage 4 — glyphs inside sentences (only if Q1401 (a) = drawn)

- A post-escape pass `glyphify(html)` in cards.js: replaces each mapped character in an **already escaped** string with `glyphHtml`; applied exactly where `linkify` is applied and by the same rule (after escaping, never before). Sites: the clause sentences (`clauseOf`/`clauseRungs` readers), the settled strip, the composer's lanes, `PAGE_COPY` sentences at their render sites (the body builders in band.js and setup.js), the rail's summary lines, the mail modal **excluded** (it previews another medium).
- The contenteditable prose column is **excluded**: the document text is the member's, and a drawn glyph inside `contenteditable` would become harvested markup (the `sectoggle` lesson).
- Guard: copy-check's static golden is unchanged (copy.js keeps the characters); the walk golden changes once; the probe re-frozen.

## Stage 5 — what must not change

- The characters stay everywhere they are **data**: card definitions (`g:`), `ORDER`, `SEC`, `STYLE.md`'s glyph table, SURFACE's tables, `RESERVED_EMOJI`/`SURFACE_EMOJI` (the furniture scan is by character and still right), the server, the engine, the bots, every walk's selectors.
- `spec-check` reads glyphs out of the page's literals — run it after each stage; a check that reads a glyph from **rendered** markup (none known) would be the one to adjust.
- Dark mode is not a thing here (light-only mockups); the Flat set carries its own colour.

## Stage 6 — the documents

- CLAUDE.md: the `lifecycle mark` entry's *a subject glyph is an emoji (Q288)* → *a subject glyph is drawn too since Q1401*; a new `glyphHtml` [symbol] line under `cards.js`; the `emojiface` entry gains *a face is the one emoji the platform still draws*.
- SURFACE §6: the marks table's note; §7.1: the sockets hold drawn glyphs; §9.1: the commit glyphs are drawn.
- STYLE §1: the glyph table's note — *drawn, Fluent Flat; the character is the name*.
- DECISIONS: a Q1401 section with the mapping table, the sprite decision (inline injection over external `<use>`), what stage 4 decided, and the findings.
- QUESTIONS: 1401 leaves Spent numbers for DECISIONS once folded.

## Acceptance

1. `npm run fluent-glyphs` regenerates `design/fluent-glyphs.svg` byte-identically from the committed table; every key resolves or is printed as a finding.
2. Both probes IDENTICAL after one re-freeze; the new scan finds no raw glyph character in a tab, a mark or an eyebrow.
3. `card-audit` at 1600 and 390 reports nothing new in the B, P or V families; the navbar's height is unchanged (state the number before and after).
4. `journey`, `after-begin-walk`, `invite-walk`, `applicants-walk`, `powers-walk`, `slider-walk`, `founder-answers`, `seat-matrix --hat=both` green on one server, one at a time.
5. `spec-check`, `copy-check` (static and walk), `clock-check`, `lint`, `typecheck`, the test suites green.
6. A screenshot at 1600 and at 390 of the topbar, a decision card with its commit row, the rail and your own row's stack, for Ed's read.

## Working notes for the builder

- A worktree by hand (`git worktree add ../draft-wt-q1401 -b q1401`, `npm ci`); never `git stash`; commit each stage; `session-view.html` merges as a whole-file conflict (NULs) — merge to main by the mask recipe in DECISIONS if main has moved.
- Re-read a long shared file immediately before editing it; the Edit tool, never `sed -i` (CRLF).
- A walk server: `PORT=<p> DRAFT_BASE_URL=http://127.0.0.1:<p> DRAFT_DATA_DIR=<fresh> npm run server`, one walk at a time, logs to files.
- Report overrulable choices numbered, with the findings the script printed.
