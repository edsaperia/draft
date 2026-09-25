# scripts/repro — the 2026-09-15 bot room's reproductions

One-off scripts from the `lab-2026` room (Q1364–Q1372), kept so the batch can
replay each finding headless. None is a walk: nothing asserts, everything prints.
Each needs a dev server (`PORT=8181 DRAFT_BASE_URL=http://127.0.0.1:8181
DRAFT_DATA_DIR=<fresh> npm run server`) unless it says docs.vote.

- `found-lab.mjs` — a bot founds a room on docs.vote from `lab-text.md`, invites
  bots and people, delegates 👥 ⏱️ 🌍, waits for the answers and presses 🍾 with
  every power laid down. Reads `DRAFT_BOT_KEY` from `.env`; writes the founder's
  cookie beside itself (gitignored). Edit the constants at the top for a new room.
- `repro-begin.mjs` — a member's page open through 🍾 (fresh load after the
  founding settled): the news cards, the OKs, the gates; then a reload showing the
  phantom answer cards (Q1364).
- `repro-hossein.mjs` — the same page open from *before* the founder's 🎩 answer,
  answering its three questions on the page, then 🍾: nothing arrives, and
  `window.__founding()` says why (Q1364).
- `repro-reapply.mjs` — a member resigns and applies again from the door; the
  applicant's cards driven with real keystrokes; a member's ✉️ composer (Q1366,
  Q1370).
- `peek-seat.mjs <magic link>` — open any seat headless and print rail, sections,
  tabs. `peek-tab.mjs <magic link> <tab>` — press one gutter tab and print the card.
  For docs.vote, get a link by `POST /api/d/<slug>/login` for a bot address and
  read `GET /api/bots/outbox` with the key. Never open a bot's link in Ed's own
  Chrome: it replaces his cookie for the document.

## 2026-09-16 — Tim's birthday room

- `found-tim.mjs` — `found-lab.mjs` with the constants changed: a bot founds *Tim's Birthday
  Plan* at `/d/tims-birthday` from `tim-birthday-text.md`, invites seven more bots and Ed,
  delegates 👥 ⏱️ 🌍, waits for the answers and presses 🍾 with every power laid down. Run
  room-bots beside it — the bots are what answer the questions it waits on.
- `birthday-theme.json` — a room-bots `--theme`: the bots' provisos, new clauses, verb swaps,
  reasons and the rewrite prefix, birthday-flavoured. The edit shapes are the driver's own;
  a theme only changes what they say. Any key left out keeps the charter's words.

  ```
  node scripts/repro/found-tim.mjs
  node scripts/room-bots.mjs https://docs.vote/d/tims-birthday --key=<DRAFT_BOT_KEY> --theme=scripts/repro/birthday-theme.json
  ```

## 2026-09-18 — the residency room: crowded races

- `found-residency.mjs` — `found-tim.mjs` with the constants changed: a bot founds *The
  Residency Charter* at `/d/residency-charter` from `residency-text.md`, invites fourteen more
  bots and Ed **before 🍾**, delegates 👥 ⏱️ 👤 🌍 for the blind founding, holds 💤 at fifteen
  minutes, closes Saturday 19 September 23:59 London, and presses 🍾 once every answer is in.
  The document must exist before room-bots will start, so found first. A trial runs against a
  dev server started with a `DRAFT_BOT_KEY` of its own: `DRAFT_BASE_URL` and `DRAFT_BOT_KEY`
  in the environment, and `--no-people` so nobody real is invited.
- `residency-theme.json` — a theme with **`rivals`**: three groups of hand-written rival
  wordings (open licence · AI tools · whose money), each wording with its own rationale, keyed
  to its clause by a regex *or by being one of the group's wordings*, so the pile follows the
  clause through an adoption. `--pile` (default 0.8) is how often a proposal lands on one.
  The trial at a 3–10 s pace put 25 candidates in one race inside two minutes.

  ```
  node scripts/repro/found-residency.mjs
  node scripts/room-bots.mjs https://docs.vote/d/residency-charter --key=<DRAFT_BOT_KEY> --theme=scripts/repro/residency-theme.json --seed=residency --min 20s --max 2m --heat 0.7
  ```

## 2026-09-19 — a vote against ends a 🏛️ proposal (Q1473)

- `admit-keep.mjs` — **asserting, unlike everything above**: it exits 1 on a failure, so it
  is a guard and not a print-out. A document at 🪪 🏛️ with three members and somebody at the
  door; one member accepts, one votes against, and four things are read where a member reads
  them — the motion `held` and the applicant `refused`; the applicant's own 🪪 card saying the
  membership did not agree, naming nobody and counting nothing; the other member's rail with
  no admit entry left to press and *Applicants* empty; and the same address free to apply
  again. Red on the pre-Q1473 module at *the application ends on that one vote*, the keep
  having left the motion running. `node scripts/repro/admit-keep.mjs http://127.0.0.1:8270`

## 2026-09-19 — a closed document asks nothing but the signature (Q1479 (a))

- `closed-unacked.mjs` — **asserting**, like `admit-keep.mjs`: exit 1 on the defect, 2 on a
  set-up that never got there. A ladder document at `closed`, read from a seat the rung left
  unsigned — chosen by the wire's own signatures, never by name — in a **fresh** browser
  context, because an empty `localStorage` is exactly what the closing mail's link produces
  on a second device. It asserts no clause still says *being decided*, no greyed tab that
  opens nothing, one `rec:` rail entry per record on the wire, that one of them opens its
  card, and that 🥂 still signs. Red on the pre-fix page at the first four (issue #30
  findings 2–3): `withheld` held every record behind an ⚖️ OK the closed page has nowhere
  to give. `node scripts/repro/closed-unacked.mjs http://127.0.0.1:8341`

## 2026-09-20 — a draft sends only the places that changed (issue #43, Q1479 (b))

- `untouched-place.mjs` — **asserting**, like the two above: exit 1 on the defect, 2 on a
  set-up that never got there. An untouched place in a draft survives on purpose (Q1382), and
  the row beside it counts only the places that *changed* — but `hunksOf` sent every site, so
  a member who typed into two paragraphs and put one back proposed both, and the untouched
  clause joined the candidate's footprint and the race running there. Four cases, each on its
  own document and each holding **two** sites so the filter is exercised rather than bypassed:
  `two-places` (one clause changed, one put back — one hunk on the wire, carrying its own
  `was`, and a footprint that does not cover the other clause), `deletion` (Q1415's emptied
  clause still sends `lines: []`), `gap` (a sentence in the trailing gap still goes as a pure
  insertion), `pen` (the Founder's ✒️ road, one hunk). Red on the pre-fix page at *exactly one
  hunk goes over the wire* in all four.
  `node scripts/repro/untouched-place.mjs http://127.0.0.1:8360`

## 2026-09-20 — the rehearsal, the night before the room

- `rehearsal.mjs` — **asserting, like `admit-keep.mjs`**: a whole document's life driven
  headless, so the room is walked before anybody real is in it. A bot Founder founds a
  short-lived charter with every setting held and set (nothing delegated, so 🍾 is ready at
  once), presses 🍾 laying every power down **except 🛡️ on the Text**, and then keeps the
  three posts a person would keep in a live room until the clock closes it: the Founder's
  Accept on every 👑 park (the third refused, so both roads are walked), the spectator feed
  polled exactly as `design/feed.js` polls it, and `/healthz` with the round trips beside
  it. At the close the Founder signs and the record is read twice — once full, once on a
  **slim** poll (issue #30 finding 1). It starts no bots; it prints the `room-bots` line.
  There is no default `--base`: docs.vote is never reached by forgetting an argument.

  ```
  node scripts/repro/rehearsal.mjs --base http://127.0.0.1:8350 --minutes 25 --bots 8
  node scripts/room-bots.mjs http://127.0.0.1:8350/d/<slug> --key=$DRAFT_BOT_KEY --seed=rehearsal --min 10s --max 40s --heat 0.6 --motions 0.05
  ```

## 2026-09-23 — the P1 batch (plan-p1-batch.md, Stage 1)

Guards rather than room replays: each asserts, exits 1 on a failure, and was seen red on the
pre-fix page before its fix landed.

- `lane-enter.mjs <design base>` — issue #78: Enter at the end of a lane you are drafting in
  makes a second line; four cases on the fixture (end · bare · middle · twice). Needs
  `npm run design`, not a dev server.
- `refused-acts.mjs <dev server>` — issue #37: a refused judgment is un-filed, a double ✓
  sends one, a refused withdrawal puts the proposal and the ✏️ back, a command that never
  answers does not hold the next one.
- `reconnecting.mjs <dev server>` — Q1505: the red *Reconnecting…* bar and its cause — the
  device offline (`context.setOffline`), a 502 twice, a view that never answers — every commit
  held while it stands, scrolling and typed work untouched, lifted by the first good poll; the
  pause keeps its modal; a vote refused at the press says *That was refused: …* on its card
  (`--only=offline|502|hang|pause|refused`).
- `crown-rail.mjs <dev server>` — issue #32 (built as Q1475): a change the membership
  carried and the Founder's 🛡️ holds asks the Founder — member or clerk — on the `adm:` and
  `mo:` entries, and waits on them everywhere else.
- `feed-scroll-hold.mjs` — issue #87 F2: the spectator feed, scrolled back, holds the entry
  being read still when an entry leaves above it (a rules motion voted down) and when one
  arrives. No server — `design/feed.html` served from disk with a fabricated feed answer.
- `stranger-records.mjs <dev server>` — Q1508: a signed-out page on a closed document 🌍
  lets a stranger read shows its records — the door's payload carries them with nobody's
  vote in them, the gutter carries the very ✔ tabs a member's closed page files, the
  undecided races stand as the Backlog, one tab opens its card; and (Q1512) the payload
  carries the signatures and the amendments, no member id and no mover, and the page draws
  the Amendments and the Signatures block for block as a member's closed page. The phase ladder closes the document (`--seed=`, moving on until 🌍 is readable).
- `review-walk.mjs <dev server>` — Q1536: a clause decided three times while a reader looks
  on (passed, rejected with the reader's vote against it, passed) folds into one entry, one
  tab and one card — its head the net change, each record listed and opening inside it, one
  OK for all three — while the reader's own ✔ on the same clause keeps its own; OK, and
  Enter, walk to the next owed record in document order, wrapping to the top, and the one
  pinned record is the one the walk would open. Asserting: exit 1 on the defect, 2 on a
  set-up that never got there.
