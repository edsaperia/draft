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
