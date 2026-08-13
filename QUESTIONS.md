# Open and deferred items

Resolved items are folded into SPEC.md and removed — this file holds only what's still open. Numbers are from the continuous project-wide sequence; never renumber or reuse.

## Deferred until the sim produces evidence

8. **Mixed clocks feel.** Wall-clock token drip against evidence-clock θ is intentional (soft early, hardening with absorbed judgment) but untested — check how it feels in sim and pilot.
9. **Propose-C staking.** "Brand-new patch, normal stake" is held loosely — revisit if the sim shows composer friction (peek-price plus stake may over-deter drafting).
10. **Roster-change mechanics.** Joiner grant/drip, F recomputation, and departed-author candidate handling (§9.3) are unvalidated defaults — confirm in sim.
13. **Care-map evidence variant.** Log both (incumbent-involving indifference only vs all indifference per race); choose after inspecting realistic sim care maps.

## Awaiting Ed

22. **Evidence horizon (new constitution parameter).** SPEC §4.3 ramps θ on "total comparisons" but never says how many comparisons reach θ_end — the ramp needs a scale. Implemented as `evidenceHorizon` with default **40 × E at open** (E=10 → θ_end at 400 comparisons). Sign off the parameter (it needs an Appendix A row) and adjust the default if you have a feel for it; the sim will calibrate either way.

Next unused number: 23.
