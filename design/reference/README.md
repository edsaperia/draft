# Frozen reference — do not edit

Byte-copies of `design/session-view.html` and `design/system.css` as they
stood on 2026-08-18, immediately before the decision-card machinery was
extracted into `design/cards.js`. Ed asked for the pre-extraction
session-view kept somewhere careful; this is it.

- Never edit these files. If session-view changes intentionally later,
  re-freeze (new copies, new tag) as its own commit.
- `http://localhost:8137/reference/session-view.html` renders the frozen
  surface standalone — the stylesheet href is relative and resolves to the
  frozen copy beside it.
- The git tag `pre-cards` marks the same state and is authoritative if
  EOL normalization ever makes the copies differ byte-wise.
- The contamination guard (`design/tools/session-probe.js`) measures the
  live surface against this one: card-by-card outerHTML equality and
  0.0px geometry difference.

## setup-pre-constitution/ (frozen 2026-08-18, evening)

Byte-copies of `design/setup.html`, `setup.css`, `setup.js`, `cards.js` and
`system.css` as they stood immediately before the setup surface was rewired
onto `@draft/constitution` (plan 367a — the shadow-engine cure). Same rules:
never edit; re-freeze on intentional change as its own commit. The git tag
`pre-constitution` marks the state.

The guard here is `design/tools/setup-probe.js` — step-driven, because this
surface has to be *driven*: an identical public-DOM script (data-* clicks
only) runs on the live page and on
`http://localhost:8137/reference/setup-pre-constitution/setup.html`,
snapshotting per step; diffs fail unless allowlisted per
scenario:step:region. Its commit-8 self-proof ran live-vs-frozen with the
live page untouched and an empty allowlist: 34 steps, identical.

## Running the probes since the merge (stage 8, 2026-08-21)

One surface now: `setup.html` is the page, `session-view.html` a redirect to
`setup.html?fixture=session`, and the session's machinery is `session.js`.

- **session-probe**: reference `/reference/session-view.html`, live
  `/setup.html?fixture=session`. In that mode the constitution band is hidden
  (`.doc.fixsession`) so the charter's geometry is the frozen page's to the
  pixel — pinned rail entries clamp to the *viewport* edge, so a band above
  the charter cannot be normalised away. `&band=1` shows the whole
  composition (not a probe target). Measurements take y from the charter's
  `.prose` top and the contents rail's charter headings from the first of
  them. Gate unchanged: IDENTICAL.
- **setup-probe**: the frozen `setup-pre-constitution/` copy is the
  constitution swap's baseline and now differs from HEAD by design (200
  diffs at 2026-08-21). For any later change the reference is **HEAD
  itself**: `git show HEAD:design/<f> > design/_head/<f>` for setup.html,
  setup.js, setup.css, cards.js, system.css, constitution.js (the directory
  is gitignored; a path containing `/_head/` counts as the reference side).
  Intentional diffs since the merge are allowlisted by pattern: `geo.rail`
  at every step (the tasks are entries in the session's margin index,
  absolutely positioned) and `toc` once the text is confirmed (the
  charter's headings come from session.js). Rail entries are still compared
  by content, with the layout's own attributes stripped. The *Founded at
  [time]* line is stamped from the load-time clock: run both sides inside
  one minute or the band hashes differ after ⏩.
