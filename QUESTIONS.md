# Open questions

Numbered continuously; never renumber. When answered, record the answer inline and mark ✅. Durable consequences live in DECISIONS.md.

## Round 1 — spec v0.5 (asked & answered 2026-08-13)

1. ✅ **First real session.** Constitutional conventions for Newspeak House cohorts; roster typically 5–10, conventions 15–20; if effective, 100+/1000+ instances are an exciting ambition. → D1
2. ✅ **Deployment shape.** Hosted web service. → D2
3. ✅ **Build entry point.** Engine-first (option a); plus: build toward a harness where real users can play along with LLM-powered bot users. → D3
4. ✅ **Stack.** TypeScript end-to-end approved. → D4
5. ✅ **Sim cost posture.** Use real LLMs (cheaper model); realistic experience valued for testing. → D5
6. ✅ **Evidence clock scope.** Global — the document settles down gradually over the session. → D6
7. ✅ **Refund on peak w.** Ed: refunds exist only to prevent abuse/flooding; do whatever is simple and achieves that. Decision: keep peak-w. → D7
8. ✅ **Mixed clocks.** Intentional: visible/soft amendment space early to encourage proposals, hardening over time so the outcome isn't a surprise. Hard to say how it will feel — revisit after sim. → D8
9. ✅ **Propose C mechanics.** Treated as a brand-new patch (normal stake, races wherever its footprint lands). Ed not totally certain — held loosely. → D9
10. ✅ **Fixed roster.** Admin can add and remove users mid-session. → D10
11. ✅ **Dominated test.** Projected (against the θ ramp); soften language to "looks very unlikely to win". → D11
12. ⏳ **Salience unit.** Ed asked for expansion and alternatives → see questions 18–20.
13. ✅ **Care-map evidence.** Compute both variants; decide after seeing realistic care maps from the sim. → D13
14. ✅ **Authorship visibility.** Admin/constitution setting; include a "private during voting, public when sealed" mode. → D14
15. ✅ **Auth.** Magic links. → D15
16. ✅ **Document format.** Markdown (rendered rich); usually a few pages, but longer scenarios interesting to explore. → D16
17. ✅ **AI-assisted proposing** (Ed's addition). Make it easy for participants to use their own AIs to propose patches for them — supported, not the default UX. → D17

## Round 2 — open

Salience model unit (resolves 12) — pick one:

18. **Race-level salience** (recommended). The ranked object is the race (the question in dispute); a diagonal between candidates from races X and Y counts as evidence "X's question matters more than Y's"; BT fitted over races. Directly what routing/bounty/backlog consume; data-efficient at E = 5–20. Wrinkle: candidate quality contaminates the signal — mitigate by serving leader-vs-leader diagonals.
19. **Candidate-level salience.** Global ranking over all candidates; a race's salience = its leader's. Finer-grained, handles lattice diagonals naturally, but data-hungry at small E.
20. **Extracted-intent salience.** LLM clusters candidates into named intents; rank the intents. Closest to the spec's language and yields readable output ("the group cares most about: membership criteria"), but adds machinery and intents drift as drafting evolves. Can be layered later as a reporting view over 18.

21. **Spec bump to v0.6** — approve folding the round-1 decisions into SPEC.md (edit list in DECISIONS.md preamble / final message of 2026-08-13 session)?
