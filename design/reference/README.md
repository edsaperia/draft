# Frozen reference — do not edit

Byte-copies of the merged page and everything it loads, as they stood at
the end of stage 8 (2026-08-21) — `session-view.html`, `session.js`,
`fixture-session.js`, `setup.js`, `setup.css`, `cards.js`, `system.css`,
`constitution.js`, and since 2026-08-23 `emoji-data.js`, which the picker
reads and the page therefore loads. The git tag `post-merge`, re-frozen at `refs-2026-08-21`
after the design-day builds and again after review #2's door fixes, at
`refs-birth-2026-08-21` after the constitution's section order was restored
and the birth was given its own layout, at `refs-gates-2026-08-21` after the
🎩 fix let the gates through, and at `refs-acks-2026-08-21` after a power
stopped being held until its grant is acknowledged, and at
`refs-withheld-2026-08-22` after a task you cannot do stopped being drawn
at all, and at `refs-pen-first-2026-08-22` after the pen took its place as
the only thing the save asks for and 🌍 lost its Public rung, and at
`refs-toolbar-2026-08-22` after every wallet became a socket shown to
everybody, 🛡️ joined the row with a grant of its own, and a released hold
stopped deleting its token in mid-air, and at `refs-pass2-2026-08-22` after
spec pass 2 folded (🏛️ with the first question you are asked, one label per
rung, the 🌍 interim clause, the motion hold, ↻ grey, the cards.js tooltips
in surface vocabulary), and at `refs-glyphs-2026-08-22` after the threshold,
the ramp and removal took new glyphs (🌡️ 🪜 🥾), which also cleared the
Proposals-preamble freeze the previous run had left pending, and at
`refs-anon-2026-08-22` after ✍️ and 👤 were renamed to the anonymity
question and its follow-up and traded places in the founding order, and at
`refs-hold-2026-08-22` after the propose hold stopped releasing on a
boundary event and ✏️ Propose took the accent-subtle ground, and at
`refs-founded-2026-08-22` after the pen and shield gave up their clauses
and hung their tabs on the Founded line, which now stands from the save,
and at `refs-picture-2026-08-23` after an emoji face stopped being a disc
and the picture card became *pick an emoji* → *upload an image* → what
you are wearing now, re-taken the same day when the picker became
Unicode's own with a search box and category tabs. That run also caught
`session.js` and
`constitution.js` having drifted from the previous freeze, which is
exactly the rot this file warns about below: re-freeze **every** copy,
not the ones you happened to edit.
And at **`refs-membership-2026-08-26`** after entries 94, 95 and 96 rebuilt
the membership — 🪪 became the price of admission, Membership became one
lvl-3 subsection per status, and each door came to stand by its own result.
The freeze it replaced was four days old and the setup-probe was reporting
**319 diffs**, which is a probe telling you nothing: essentially every step
already differed, so a new defect could not have moved the number. Six of
the nine copies had drifted, not the two that had been edited — the same
lesson as the run above, learned again.
It marks the same commit
and is authoritative if EOL normalisation ever makes a copy differ byte-wise.
**The litany ends there**: `refs-membership-2026-08-26` is the last per-freeze
tag, and every freeze after it is found by `git log -- design/reference`
instead. Do not extend this paragraph.

- **Never edit these files.** When the surface changes intentionally,
  re-freeze with **`npm run qa:freeze`** — which re-freezes all three of the
  references a batch moves, these copies among them — or with
  `npm run probe -- --update` for these copies alone. Both re-copy **every**
  file in the list, which is the point: two freezes in a row re-copied only
  the files somebody had edited and left the rest to rot. Empty the probes'
  allowlists again while you are there — a freeze needs no allowances.
- **The commit is normally not yours.** plan-queue offers the freeze once per
  batch, after Ed's QA, and `pq freeze` runs `npm run qa:freeze` and commits
  what it changed as *plan-queue: re-freeze the reference after QA of
  <batch>*. A per-freeze `refs-*` tag is no longer part of the ritual: the
  commit is the record, `git log -- design/reference` finds every freeze, and
  `pq ship`'s `batch/<letter>-<date>` tag already names what shipped.
- `http://localhost:8137/reference/session-view.html` renders the frozen
  surface standalone (relative hrefs resolve to the frozen copies beside
  it); `?fixture=session` renders the frozen Hollow Oak session.
- `session-baseline.json` is the session-probe's recorded baseline at the
  cards.js extraction (2026-08-18), kept as history.

History: the `pre-cards` tag (2026-08-18) froze the pre-extraction
session-view; the `pre-constitution` tag froze the setup surface before the
`@draft/constitution` rewiring. The pre-constitution copy had drifted 200
diffs from HEAD by the time the merge was measured, which is why HEAD, not a
rotted copy, must be the baseline whenever the copies are not re-frozen.

## Running the probes

Serve `design/` on `localhost:8137` (a tiny node http server). Both sides at
**one window size**, both pages **from scroll 0**; the automation tab runs
backgrounded (rAF never fires, timers clamp — the probes stub what they
need). Each probe is injected as a MAIN-world `<script src="/tools/…">`; it
stores its run in `localStorage` (keyed by side from the pathname —
`/reference/` is the reference) and, once both runs exist, compares them
into `window.__probeReport` and a `#probe-report` `<pre>`.

- **session-probe** (`tools/session-probe.js`): reference
  `/reference/session-view.html?fixture=session`, live
  `/session-view.html?fixture=session`. Walks all 43 Hollow Oak cards: 0.0px
  geometry and whitespace-normalised outerHTML equality per card, plus the
  rail, the anchors, the chips and the charter's contents-rail entries. In
  fixture-session mode the constitution band is hidden (`.doc.fixsession`);
  `&band=1` shows the composition but is not a probe target. Gate: IDENTICAL.
  A first load occasionally reports one or two rail y deltas that vanish on
  a rerun (a settle-timing flake, never a card diff).
- **setup-probe** (`tools/setup-probe.js`): reference
  `/reference/session-view.html`, live `/session-view.html`. Drives the
  founding and a motion — 42 steps — through public DOM only, snapshotting
  regions and rects after each. Diffs fail unless their
  `scenario:step:region` key is allowlisted (empty since the freeze). The
  *Founded at [time]* line is stamped from the load-time clock, so run both
  sides inside one minute or the band hashes differ from ⏩ onward.

Re-run the session-probe whenever `cards.js` or `session.js` changes, the
setup-probe whenever the page, `setup.js` or `setup.css` changes.

## In CI

`npm run probe` (`scripts/probe.mjs`, Q504(b)) does the whole procedure
headless: it serves `design/` on a free port, opens a Playwright Chromium
at **1600×1000** (both sides, always), loads the reference then the live
URL of each probe from scroll 0, injects the probe, and reads its own
report — the probes stay the authority on what differs. It fails on any
diff outside a probe's allowlist, retries the setup-probe once when only
`band` hashes differ (the *Founded at* minute), and prints every step whose
target was missing on the live side; `--strict` makes those fatal, which
CI turns on once the founding scenario is re-derived (Q504(a)). The `probe`
job in `.github/workflows/ci.yml` runs it on every push, advisory
(`continue-on-error`) until it has been green for a week. About 8 seconds.
