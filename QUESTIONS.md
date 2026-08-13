# Open questions — spec v0.5

Numbered continuously; never renumber. When answered, record the answer inline under the question and mark ✅.

## Scope and shape

1. **First real session.** Who is the v1 deployment for — a group Ed convenes, a demo for others, a research artifact? And what's the expected roster size E — ~10, ~30, ~200+? Mechanics, UI, and infra all tune to this.
2. **Deployment shape.** Hosted multi-tenant web service, or a self-hosted thing a convenor runs per session?
3. **Build entry point.** Spec §13 puts the sim-harness first, but the harness *consumes* the engine, ranking, and patch machinery — it can't literally be built first. Options: (a) engine first, harness as its first client, buttons later; (b) an early throwaway clickable race-card prototype first, to feel the move before calibrating mechanics.
4. **Stack.** Recommendation: TypeScript end-to-end — engine-core as a pure dependency-free library shared by sim-harness (Node) and the product (web). Objections or preferences?
5. **LLM cost posture for the sim-harness.** Real-LLM personas make every parameter sweep cost real money. Proposal: scripted/statistical personas as the default sweep mode, LLM personas as a high-fidelity tier run sparingly. OK?

## Spec ambiguities

6. **Evidence clock scope.** θ ramps on "total comparisons made" — global across the document, or per race? Global means a busy document hardens θ for races that received little attention; per-race means quiet races stay soft forever. Which is intended (or a blend: per-race evidence with a global floor)?
7. **Refund on *peak* w.** A candidate that briefly modeled at 0.9 then collapsed to 0.1 refunds at 1.5×. Is "peak" deliberate (rewarding ever-having-been-plausible, encouraging bold drafts), or should it be final/exit-time probability?
8. **Mixed clocks.** Token drip is wall-clock (per 10% of window) while θ is evidence-clock. Intentional? A quiet stretch drips proposal capacity while hardening nothing.
9. **Propose C mechanics.** Must the resulting draft enter *that* race, and does it pay the normal 1-token stake? The composer might produce a patch touching different spans entirely — what happens then?
10. **Roster fixed at open.** Truly no late joiners across a days-long window? (Equal grants and the F floor both lean on fixed E — but the product implication is "missed the open, you observe.")
11. **"Dominated: the candidate cannot win."** Under what test — current θ at current evidence, projected θ_end, a formal stochastic-dominance check? This gate fires invitations, so it needs a crisp trigger.
12. **Salience unit.** The salience model ranks "intents" — is an intent a candidate, a race, or something extracted from candidates? Diagonals compare candidate pairs, but backlog/bounty ordering seems to want race- or position-level salience.
13. **Care-map evidence.** Indifference between two *challengers* says nothing about the incumbent. Is care-map coldness computed only from incumbent-involving indifference, or from all indifference on the race?
14. **Authorship visibility.** Judgments are anonymous, but is candidate *authorship* public to participants during the session? Author is a candidate field and rationales are pinned — yet blind judgment might argue for hiding authors on race cards specifically.

## Product basics

15. **Auth.** Magic-link per roster email for v1?
16. **Document format and scale.** Markdown? Typical size — a few pages (bylaws, statements) or potentially book-length? Footprint/anchoring design cares.
