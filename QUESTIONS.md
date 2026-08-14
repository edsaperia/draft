# Open and deferred items

Resolved items are folded into SPEC.md and removed — this file holds only what's still open. Numbers are from the continuous project-wide sequence; never renumber or reuse.

## Deferred until the sim produces evidence

8. **Mixed clocks feel.** Wall-clock token drip against evidence-clock θ is intentional (soft early, hardening with absorbed judgment) but untested — check how it feels in sim and pilot.
9. **Propose-C staking.** "Brand-new patch, normal stake" is held loosely — revisit if the sim shows composer friction (peek-price plus stake may over-deter drafting).
10. **Roster-change mechanics.** Joiner grant/drip, F recomputation, and departed-author candidate handling (§9.3) are unvalidated defaults — confirm in sim.
13. **Care-map evidence variant.** Log both (incumbent-involving indifference only vs all indifference per race); choose after inspecting realistic sim care maps.

26. **Evidence-clock adoption threshold.** Wall clock chosen for v1 (Q22, options 23–25, 2026-08-13): simpler, knowable, one clock shared with the token drip. Revisit the evidence-clock (or a hybrid max-of-both) ramp as a sim A/B once everything else works.

## Backlog (provisioned, build later)

42. **Spectator commentary view** (Ed, 2026-08-14): an optional commentating view for people watching a convention — like the sim's commentator, but consuming **public data only**: gazette, live candidate texts/rationales, bounty board, document state. Never individual judgments, never standings, authorship only per the session's visibility setting. Provision: expose a `spectator-api` in engine-core (a strictly-public projection, sibling of the participant-api) and have every spectator surface — commentary LLM included — consume only that, so privacy holds by construction rather than by prompt discipline. Note the sim's own commentator is deliberately different: it is omniscient (sees temperaments and hidden agendas) because it narrates a fiction for the experimenter; the product spectator box narrates real people and gets none of that.

Next unused number: 43 (30, 33-41 were ephemeral chat items, 2026-08-13/14: run launches, license, scoring, roadmap, UI scoping).
