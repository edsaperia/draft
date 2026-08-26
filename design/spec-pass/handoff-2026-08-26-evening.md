# Handoff — 2026-08-26 evening, the day the guards were made to speak

Temporary. **Delete this file once Q917 is answered or folded**, per the
`design/spec-pass/` convention: the archive holds working papers and nothing
else, and a stale handoff is worse than none. It replaces
`handoff-2026-08-26.md`, deleted on that file's own instruction now that
Q910–Q912 are closed.

## Where the tree is

`main`, clean, **everything pushed and deployed**. `docs.vote` is on
`5c4544c`; CI green on both jobs, and the `probe` job is **no longer
advisory**. Green as of the last run: `spec-check`, `lint`, `typecheck`, 534
tests, `build`, both probes under `--strict` (setup-probe **96 steps, 0
diffs, 0 allowed**), `probe-coverage` **25 of 25**, `founding-golden` (55
steps), `journey` ×2, `applicants-walk` on all three of 🪪's prices,
`slug-walk`, `ladder`.

## What happened, in one paragraph

Q910, Q911 and Q912 were answered and built, and four more questions
(913–916) were raised and closed the same day. **Every one of them turned out
to be the same thing: a guard that was working correctly and being
ignored.** `--strict` was already on in CI — `continue-on-error` had been
swallowing it since 2026-08-21, hiding 136 real diffs on the 25th and
thirteen dead steps on the 26th. `founding-golden` had not run at all for
days, because a red step above it stopped the job, and was 52 differences
stale when finally run by hand. `journey-walk` had been dead for a day
against entry 94's door rework while CLAUDE.md went on naming it as the
guard for five gotchas. And the setup-probe was opening 12 of the founding's
25 cards. The main-branch typecheck was also red on arrival
(`admit-view.test.ts` indexing under `noUncheckedIndexedAccess`), so the
previous push had never deployed.

## The one open item

**Q917 — nothing runs the server walks.** `journey`, `applicants-walk`,
`slug-walk` and `ladder` are all run by hand; CI runs only the five checks in
the `ci` job and the three design guards in the `probe` job. That is exactly
how Q916 happened. Recommended: one new job booting a server on an ephemeral
port, `if: always()` between the walks. Full text and options in
`QUESTIONS.md`. **Not urgent, but it is the last hole of this shape.**

Also unresolved, and not a project question: **three stale dev servers were
still listening on this machine** at 8140, 8199 and 8211 (3.8–4.2 days old
when found). Ed was asked whether to kill them and did not say; every server
*this* session started was stopped. Since Q911 they are harmless to the
walks, which now refuse them by name.

## Things worth knowing before touching this area

- **A scenario change needs no re-freeze; only a page change does.** The
  reference is a frozen *page* and the probe script is shared by both sides,
  so adding probe steps compares new behaviour against an unchanged copy.
  Q914 and Q915 both added steps with 0 diffs and no re-freeze.
- **A card the probe never opens can never produce a dead step**, so
  `--strict` is structurally blind to it. That is what `probe-coverage`
  exists for, and it is now a gating CI step.
- **💡 and ⚖️ arrive after 🍾**, not at their `ORDER` position — they hold a
  place in the order but are served only once the constitution is decided.
- **Every founding card carrying a number refuses its commit until the
  number is there**, and 🌡️ additionally refuses anything at or below the
  coin flip (the surface half of Q836).
- **The probe's ⏰ takes `perpetual` deliberately.** A windowed document puts
  a live countdown in the topbar, and the two sides of a comparison are
  measured seconds apart — `ends` would make the *Founded at* flake
  permanent.
- **A running server holds two copies of the work at different ages**: the
  page comes off disk and is always current, the mechanism is loaded at boot.
  Nothing fetched off disk can reveal a stale process. `assert-server` asks
  `/healthz` for the catalogue the process actually booted with.
- **`memSub` renders the card *instead of* its rows** when a card in that
  subsection's pile is open, so a membership row can only be read with the
  card shut — and status is the heading, not a chip. This is what made every
  row assertion in `journey-walk` read an empty array.
