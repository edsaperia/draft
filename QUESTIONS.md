# Open and deferred items

Resolved items are folded into SPEC.md and removed — this file holds only what's still open. Numbers are from the continuous project-wide sequence; never renumber or reuse.

## Deferred until the sim produces evidence

9. **Propose-C staking.** "Brand-new patch, normal stake" is held loosely — revisit if the sim shows composer friction (peek-price plus stake may over-deter drafting). *Sim evidence 2026-08-14 (REPORT-deferred-evidence.md Q9): no measurable deterrence at v1 defaults — zero stake-blocked entries, C-drafts adopt above average. Recommendation: keep §3.3, have the product log stake-blocked composer entries; awaiting Ed's confirmation.*

26. **Evidence-clock adoption threshold.** Wall clock chosen for v1 (Q22, options 23–25, 2026-08-13): simpler, knowable, one clock shared with the token drip. Revisit the evidence-clock (or a hybrid max-of-both) ramp as a sim A/B once everything else works.

## Open

49. **Naming and typing disputes** (Ed's question, 2026-08-14): the engine knows a dispute's *location* (span/footprint), not its *nature*. Labels in UI currently fall back to nearest markdown heading + excerpt, which fails on heading-less documents. P3 should generate both a name ("treasurer oversight") and a type (copy-edit vs substantive vs structural) per race — the type also informs routing (copy-edits shouldn't burn diagonal attention slots) and the record. *Interim landed 2026-08-14 (5e61969): advisory `describeRace` oracle capability + `race-labeler` with deterministic nearest-heading fallback; type stored but deliberately unwired from routing. Still open: wire type into routing (needs a SPEC §8 sentence), full P3 treatment.*

## Backlog (provisioned, build later)

42. **Spectator commentary view** (Ed, 2026-08-14): an optional commentating view for people watching a convention — like the sim's commentator, but consuming **public data only**: gazette, live candidate texts/rationales, bounty board, document state. Never individual judgments, never standings, authorship only per the session's visibility setting. Provision: expose a `spectator-api` in engine-core (a strictly-public projection, sibling of the participant-api) and have every spectator surface — commentary LLM included — consume only that, so privacy holds by construction rather than by prompt discipline. Note the sim's own commentator is deliberately different: it is omniscient (sees temperaments and hidden agendas) because it narrates a fiction for the experimenter; the product spectator box narrates real people and gets none of that.

Next unused number: 52 (30, 33–41, 44–47, 51 were ephemeral chat items, 2026-08-13/14; 46 is parked — diagonal-card visual distinction, decide with the palette work; 48 and 50 resolved 2026-08-14, folded into SPEC §8.3 and §4.4; 43 resolved 2026-08-14 — silence never imputed, presence is roster management — folded into SPEC §8.2; 8, 10, 13 resolved 2026-08-14 on sim evidence (REPORT-deferred-evidence.md) — wall-clock pairing kept, §9.3 defaults confirmed + gazette floor announcement, care map on incumbent-involving indifference — folded into SPEC §7, §9.3, §3.2).
