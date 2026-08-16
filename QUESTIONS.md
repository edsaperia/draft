# Open and deferred items

Resolved items are folded into SPEC.md and removed — this file holds only what's still open. Numbers are from the continuous project-wide sequence; never renumber or reuse.

## Deferred until the sim produces evidence

26. **Evidence-clock adoption threshold.** Wall clock chosen for v1 (Q22, options 23–25, 2026-08-13): simpler, knowable, one clock shared with the token drip. Revisit the evidence-clock (or a hybrid max-of-both) ramp as a sim A/B once everything else works.

## Open

49. **Naming and typing disputes** (Ed's question, 2026-08-14): the engine knows a dispute's *location* (span/footprint), not its *nature*. Labels in UI currently fall back to nearest markdown heading + excerpt, which fails on heading-less documents. P3 should generate both a name ("treasurer oversight") and a type (copy-edit vs substantive vs structural) per race — the type also informs routing (copy-edits shouldn't burn diagonal attention slots) and the record. *Interim landed 2026-08-14 (5e61969): advisory `describeRace` oracle capability + `race-labeler` with deterministic nearest-heading fallback; type stored but deliberately unwired from routing. Still open: wire type into routing (needs a SPEC §8 sentence), full P3 treatment.*

52. **Composer design decisions** (raised 2026-08-14, unanswered): three calls made in design/composer.html that Ed hasn't ruled on. (a) The standings-panel draws the incumbent's bar as its *certification* — P(current text beats best challenger) — so the display shows why only a bridge has a path; the spec doesn't dictate how the composer renders standings. (b) The dedup-gate borders purple, extending the series' "changed since you looked" grammar to "the engine interrupting your submission" — defensible stretch or grammar dilution. (c) The desk deliberately never predicts how your own draft would poll (a self-poll would be a standings feed by the back door) — spec-faithful, but a participant might expect it.

53. **Candidate states missing from the spec** (found 2026-08-14): SPEC §2.6 lists state {live, adopted, retired, merged, carried, withdrawn}, but engine-core's types.ts carries `displaced` and `rebase-pending`, which the mechanism needs. Fold them into §2.6, or rule them implementation detail and note why.

54. **Convenor powers wording** (found 2026-08-14): SPEC §8.5 ends "The convenor's in-session powers: none," which §9.3 (mid-session add/remove) and the new §8.2 both contradict. In context §8.5 is about *feeds* — nobody, convenor included, touches routing mid-session. Proposed rewording: "The convenor's in-session powers over the mechanism: none; roster management (§9.3) is the sole exception, and it is logged."

70. **Pink hasn't reached the rest of the series** (found 2026-08-15, from Q67; part (a) resolved 2026-08-16 with Q85 — the patch card is pink like the other two, so blue now survives only on the anchor rule and the still-deciding wash). Remaining: **design/race-card.html still draws its cards yellow**, so the two mockups are inconsistent with each other. Ed's "for now" suggests the pink is provisional, so this is parked rather than fixed — but it should be settled before any new surface joins the series.

72. **Queue-wire reach** (found 2026-08-15, from Q71; trigger settled by Q78 — the wire belongs to the open card only). Two calls I made that Ed hasn't ruled on. (a) The wire lands on the anchored **paragraph(s)**; Ed's phrasing was "left into the decision cards", which could instead mean the open inline card. (b) There is no wire in the other direction — hovering a paragraph in the document doesn't light its queue entry — though the relationship is symmetrical and the return trip is arguably the more useful one when you are reading rather than working the queue.

77. **Where the scroll runway lives** (raised 2026-08-15, unanswered): removing the design notes (76) took most of the page's scroll with them, so the document now carries ~95vh of bottom padding — without it an anchor near the end of the charter can never be scrolled up to the queue rail and the wire-levelling (74) silently stops working down there. I put that padding *inside* `.doc`, so the middle column literally runs to the bottom as Ed asked; the cost is that scrolling to the end shows about a screenful of blank paper below the last line. The alternative is padding on `main` instead: the card stops just after "Adopted at the house, by the fourteen, over pasta" and the runway is page background. One line either way.

89. **Where Skip lives, and how its decay is shown** (raised 2026-08-16; Ed: skip should not be on the decision card at all — it will probably live in the `needs-you-queue` once that surface is worked on; left in place for now). Two parts remain. (a) The move itself, which waits on the queue work. (b) The mockup does not model SPEC §8.3's "skipped cards recirculate personally with decay" — skipping closes the card and leaves the queue entry exactly where it was, so nothing conveys that it will come back less often. Whether that needs any acknowledgement at all, or whether silence is right, is undecided. Worth settling with (a), since a skip that visibly *moves* something in the queue would answer it for free.

## Backlog (provisioned, build later)

55. **Participant-api composer surface** (sim evidence 2026-08-14): `ParticipantApi` has no composer-opening call — the sim runner invokes `Session.openComposer` directly (same precedent as its dedup co-sign path). The product composer needs that surface, including the §3.3 forfeit semantics, before the UI can exist.

56. **Orphan refunds credit departed ledgers** (sim evidence 2026-08-14): when an author-departed candidate is adopted, its refund credits the removed member's ledger — harmless (tokens are worthless at close and E excludes them), but the UI must not render it as an invitation to act.

42. **Spectator commentary view** (Ed, 2026-08-14): an optional commentating view for people watching a convention — like the sim's commentator, but consuming **public data only**: gazette, live candidate texts/rationales, bounty board, document state. Never individual judgments, never standings, authorship only per the session's visibility setting. Provision: expose a `spectator-api` in engine-core (a strictly-public projection, sibling of the participant-api) and have every spectator surface — commentary LLM included — consume only that, so privacy holds by construction rather than by prompt discipline. Note the sim's own commentator is deliberately different: it is omniscient (sees temperaments and hidden agendas) because it narrates a fiction for the experimenter; the product spectator box narrates real people and gets none of that.

## Spent numbers

Next unused number: **91**. Never reuse a spent number.

Everything below 91 that does not appear as an open, deferred or backlog item above is spent. Where the content went:

- **Mechanism decisions** are folded into SPEC.md — including 8–10 and 13, resolved on sim evidence (see `packages/sim-harness/REPORT-deferred-evidence.md`).
- **Session-view UX decisions, 61–90**, are recorded in `design/session-view.notes.md` alongside the reasoning. They are not repeated here.
- **Ephemeral chat items** that never became project decisions: 30, 33–41, 44–45, 47, 51, 57–60, 83–84.

Two exceptions worth knowing. **46 is parked, not spent** — diagonal-card visual distinction, to be decided with the palette work. And **73** was raised in chat but folded into 72(b), so it stands for nothing on its own.

