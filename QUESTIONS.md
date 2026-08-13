# Open and deferred items

Resolved items are folded into SPEC.md and removed — this file holds only what's still open. Numbers are from the continuous project-wide sequence; never renumber or reuse.

## Deferred until the sim produces evidence

8. **Mixed clocks feel.** Wall-clock token drip against evidence-clock θ is intentional (soft early, hardening with absorbed judgment) but untested — check how it feels in sim and pilot.
9. **Propose-C staking.** "Brand-new patch, normal stake" is held loosely — revisit if the sim shows composer friction (peek-price plus stake may over-deter drafting).
10. **Roster-change mechanics.** Joiner grant/drip, F recomputation, and departed-author candidate handling (§9.3) are unvalidated defaults — confirm in sim.
13. **Care-map evidence variant.** Log both (incumbent-involving indifference only vs all indifference per race); choose after inspecting realistic sim care maps.

26. **Evidence-clock adoption threshold.** Wall clock chosen for v1 (Q22, options 23–25, 2026-08-13): simpler, knowable, one clock shared with the token drip. Revisit the evidence-clock (or a hybrid max-of-both) ramp as a sim A/B once everything else works.

## Decided, implementation deferred

29. **Off-menu welfare scoring** (decided 2026-08-13): option (a), an LLM judge — rate each final line against each persona's latent stance/salience to synthesize comparable utilities. Ed: use a clever model — judge on `claude-fable-5` (scoring is one pass per line, cheap relative to the run). Build when we next need to score an LLM run; scripted welfare stays the calibration gold standard, LLM-judge welfare is a sanity check, never an optimization target.

Next unused number: 31 (27 was credentials — resolved via subscription mode; 30 was the ephemeral "launch the 14-persona run?" asked in chat 2026-08-13).
