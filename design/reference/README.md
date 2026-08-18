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
