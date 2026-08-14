# Group Drafting Engine — Specification v0.11
### Working name deferred (direction: "draft")

A compiler for group agreement. Input: a starting text, a roster, a constitution file. Output: the most-agreed text, plus a record of every disagreement, ranked and mapped. Institutional acts — provenance, adoption, ratification — belong to the convening context. The tool measures agreement; it does not confer legitimacy.

**The mechanism in a breath.** The document is a text; candidates are patches against it; patches that cannot coexist race each other; every participant makes one kind of move — shown two texts: A, B, indifferent, or propose C; a race resolves when its leader's win-probability clears the adoption threshold — a confidence bar that rises over the session window; authors of losing patches are shown why they lost and invited to redraft; two publication ceremonies bracket a fully asynchronous window; whatever remains unresolved ships as a ranked backlog for the next session.

---

## 1. Contract

**Inputs.** `text` — the starting document. `roster` — E participants, equal standing; the convenor may add or remove participants mid-session (§9.3). `constitution` — every parameter (Appendix A), hashed into the log's genesis event.

**Outputs.**
1. **The text**: each race rendered to its posterior leader.
2. **The record**: machine- and human-readable. Per race: candidates (text, author, rationale), the fitted ranking with confidence and comparison counts, camp structure with reason digests, the graveyard with causes of death, certification at close. Globally: the care map; the minority map (clusters whose preferences ran together and lost; persistent redrafters); the salience ranking; per-person participation statistics; the audit log and RNG seed; and the **backlog** — every unresolved or carried position, ranked by closeness × salience, stake-waived for re-entry next session.

The record is co-equal with the text: it is where outvoted currents remain visible, and it seeds the next session.

---

## 2. Object model

**2.1 Patches.** A candidate is a patch: a transformation of the document with a **footprint** (the spans it touches). One type covers everything — clause rewrites, insertions, deletions (patch to empty), restructures, and cross-cutting edits such as a document-wide rename, which is one candidate with a wide footprint, adopted atomically or not at all. Paragraphs exist for display and anchoring only; the mechanism's unit is the edit.

**2.2 Overlap: three gates.** When two live patches' footprints overlap:

1. **Textual composition** — three-way merge, both orders. If it succeeds, the patches are independent.
2. **Semantic composition** — the machine drafts one patch realizing both intents; both authors confirm. Success means the collision was accidental: the intents are compatible. The race becomes an **inclusion lattice** {status quo, A, B, A+B}. The composed candidate is machine-labeled, co-signed by both authors, no fresh stake, both refunded fully on adoption.
3. **Rivalry** — no joint realization exists. The patches are mutually exclusive answers to one question and race directly.

**2.3 Races.** A race is a connected component of mutually conflicting live patches, plus the incumbent text of the contested spans (the empty incumbent, for insertions). All resolution machinery attaches to races.

**2.4 Rebase.** Adoption applies the winning patch and rebases every live patch onto the new text. A failed rebase returns the patch to its author: confirm against the new text (evidence resets), revise, or withdraw with full refund.

**2.5 Surgery.** When a wide patch and a narrow patch collide at one site, the system proposes carving the contested instance into its own race, letting the rest of the wide patch proceed. The author accepts or declines. Surgery also normalizes partial-overlap rivals (A does X+Y, B does X+Z: the X-rivalry becomes its own race; Y and Z proceed independently).

**2.6 Candidate fields.** patch · footprint · author · rationale (≤300 chars, pinned) · stake · evidence record · state {live, adopted, retired, merged, carried, withdrawn}.

**2.7 Convenor guidance (non-normative).** Localize cross-cutting concerns in the starting text as legal drafting does — a definitions section turns renames into one-line patches. The patch model catches what document engineering cannot.

---

## 3. The move

**3.1 The card.** A race card renders the contested text once, two candidates as diffs against it (multi-hunk for non-contiguous footprints; wide patches show an intent summary, occurrence count, and sampled instances), each with its rationale. Four exclusive choices:

> **A** · **B** · **indifferent** · **propose C**

Skipping is not a move; the card returns later.

**3.2 Indifference** is a judgment: tie evidence for the ranking (a forced choice would fabricate preference), the instrument of behavioral dedup (§5), and, in aggregate, the **care map** — spans the group doesn't mind about keep their incumbents cheaply and stop drawing attention.

**3.3 Propose C** opens the composer (§6), which reveals mid-flight state; choosing it therefore forfeits that pair's comparison (never collected — this prices the peek), and is itself logged as weak dissatisfaction with both. The composed draft is a brand-new patch: normal stake, and its footprint decides its race — it may re-enter the race that prompted it or land elsewhere.

**3.4 Speech.** Each candidate carries one pinned rationale. There is no chat. To argue is to draft. (Block-level threads can be added later without touching the mechanism.)

**3.5 Disclosure.** **Judgment is blind; composition is briefed.** Standings, splits, and camps are visible in exactly one place — the composer — reached voluntarily (propose C) or by invitation (§6.2). No feed, card, sort, or notification shows direction on a race the participant hasn't judged. Resolved outcomes are public in the gazette immediately.

Candidate authorship is governed by a constitution setting — **public** (visible live), **sealed** (hidden during the session, revealed at close), or **anonymous** (never revealed); default sealed. Rationales are always visible.

---

## 4. Resolution

**4.1 Preference and salience.** Per race, a Bradley–Terry ranking over candidates plus incumbent, updated online from blind comparisons, indifference as tie evidence, pairs sampled actively; sampling stops at resolution or saturation.

Every pair has a type, decided by Gate 2 and cached before serving:

- **Edge** — the two options are mutually exclusive futures (rivals; incumbent vs. challenger; lattice steps like A vs. A+B, which differ by exactly one intent). Edges feed the **preference model**, which governs adoption. Card copy: *"Which should the group adopt?"*
- **Diagonal** — the two intents admit a joint realization (lattice diagonals; any two patches from unrelated races). The answer means "if only one lands, let it be this," and feeds a **global salience model**: a Bradley–Terry ranking over *races* — the questions in dispute — that never touches adoption but sets priority: routing weight, bounty-board order, backlog order. A diagonal between candidates from races X and Y scores as "X's question matters more than Y's"; the router prefers leader-vs-leader pairs so a weak draft doesn't make its question look unimportant. Lattice diagonals are logged but do not enter the cross-race model. Diagonals are a low-rate stream (~1 card in 10). Card copy: *"Which matters more?"*

Separable bundles are flagged at submission: split, or stand as one take-it-or-leave-it intent.

**4.2 Adoption.** A race adopts challenger X when P(X beats incumbent) > T(now) — the adoption threshold — and ≥ F distinct participants have moved on the race, F = min(⌈E/3⌉, F_max). Adoption is atomic, lands in the gazette with a chime, rebases the field, and starts a short cooldown. At close, each race renders its posterior leader among threshold-clearing candidates; margins go in the record; exact ties break deterministically by hash.

The cooldown is a legibility device, not a quality device, and must stay short (≤5 min). The rising threshold is what makes the session stabilise; the cooldown only paces how changes land for the people in the room. If a session feels too fast, raise the threshold, never the cooldown: rationing adoptions by time starves the chains of sequenced adoptions an interconnected document needs (calibration sweep 2026-08-13 — 15–30 min cooldowns cut welfare and halved resolution), and a document that withholds what the room has already agreed is itself confusing. The cooldown and the threshold ramp also back each other up against hasty adoption — each looks redundant while the other is intact — so never weaken both together (sweep: no cooldown plus a softened ramp over-adopts and churns).

**4.3 The adoption threshold on the session clock.** The threshold ramps smoothly from T_start to T_end over the session window (wall clock). The ramp exists because the bar should track irreversibility: an early adoption can still be challenged within the session; a late one is permanent — the outcome is never a surprise. Early low-threshold adoptions give a distributed window visible motion from its first hours. Late activity self-limits (a near-unanimous fix clears T_end; a 60/40 preference cannot), so no proposal deadline is needed. Unscrutinised text is protected not by the clock but by the adoption floor and the posterior itself: a quiet session leaves incumbents standing and ships its questions as backlog. (An evidence-clock variant — the threshold as a function of total comparisons made, so the document stabilises in proportion to the judgment it has absorbed — is deferred to the sim to explore.)

**4.4 Incumbency and certification.** Nothing closes. Incumbency is positional: adoption makes a candidate the status quo; displacement always requires clearing the current threshold. Certification is continuous: P(incumbent beats best live challenger). A "resolved" race is one not currently worth sampling; stability is an equilibrium.

Judgments are living while their question is (Q50, Ed 2026-08-14, revised same day): while a race is open and its ground unchanged, a participant may freely revise any of their judgments on it — the new judgment supersedes the old (event-sourced as 'superseded'; the ranking uses the latest, the record keeps all). A judgment locks when its context ends, two ways: the race **seals** (resolves), or the race's **ground materially shifts** — the old judgment then stands as a locked fact about text that no longer exists, and pairs on the new ground are served fresh. Revision is an open question's privilege, never a closed one's.

**4.5 The certification gap.** When the threshold rises past a race's certification, the gap becomes routing value and the race quietly re-enters circulation: adoptions made on noisy early evidence self-correct (the true leader clears the current threshold); genuinely thin majorities are confirmed thin and recorded as such. Next session, the threshold resets and everything is contestable again — entrenchment is session-scoped.

---

## 5. Deduplication

**5.1 At submission.** The composer's gate checks a draft against the race's live set and graveyard (embeddings, edit distance, LLM equivalence). Near-duplicate → the author sees the existing candidate: **co-sign** (stake refunded, join its supporters), **differentiate** (the machine articulates the delta; the author sharpens), or **insist** (enters flagged-similar).

**5.2 Behavioral.** Flagged-similar pairs receive a few direct probes through the ordinary move. Overwhelming indifference means the group cannot tell them apart — the operative definition of duplicate — and an auto-merge is proposed: authors confirm; supporters, stakes, and evidence pool; refunds split pro-rata. A consistent preference means they weren't duplicates, and the probe sharpened the ranking.

**5.3 Lateral.** Cross-race mirroring is flagged advisory-only. Active sampling never schedules a pair whose outcome the model already implies.

---

## 6. The composer

**6.1 The briefing.** Opening the composer for a race shows: the heat (split magnitude, indifference rate, evidence volume — never identities); camp structure if detected; a digest of the *why*, built from rationales of camp-preferred candidates and comparison structure; the graveyard, so the dead aren't redrafted; and, for saturated races, the bridge bar (§6.3).

**6.2 Invitations.** Two events summon an author to the composer, firing on confident states only and re-firing only when something has changed — never on a timer:

- **Dominated.** The candidate looks very unlikely to win: projected against the threshold ramp, current evidence and trajectory give it no realistic path to clearing the bar before close. The author sees a three-tier account, each tier labeled as what it is: **facts** (standings; the differential diff against the winner; indifference rate; decision speed; the camp cut if one exists), **the winners' own words** (their pinned rationales), and **hypothesis** — a span-level attribution fitted across the race and graveyard ("every candidate containing clause X ranks below 0.45"), with its evidence attached, or an honest "the data can't isolate a cause" plus a proposed isolating redraft. Thin data gets a thin account. Options: retire (refund per performance) · co-sign the leader (full refund) · redraft informed. Two failed informed redrafts carry the position to the backlog as a recorded persistent current.
- **Saturated.** The race is close relative to the marginal value of further sampling. Judgment stops; the race moves to the **bounty board** — a public tab of races where a good draft has the highest expected leverage, ranked by the disagreement it would resolve, weighted by salience. Both camps' authors are invited; anyone may draft.

**6.3 Bridges.** A candidate entering a saturated race is measured by **minimum support across camps** — it must beat A among B's preferrers and beat B among A's — via stratified probes. Aggregate win rate is not the test; a candidate beloved by one camp is exposed in a handful of judgments.

**6.4 Geometry.** The machine classifies saturated races: one-dimensional splits seed midpoint drafts (a true median beats both camps); multi-dimensional splits seed unbundled drafts or propose surgery. Seeds enter as labeled machine candidates and compete like anything else.

---

## 7. Economy

Tokens exist to make proposing cost something — anti-flooding, nothing more. Equal grants are a hard invariant: identical per-person budgets, non-configurable, reset each session; the tool never carries reputation. Grant 4 · drip 1 per 10% of window · cap 8 · worthless at close. Stake: 1 token per candidate, flat. Refund at exit, with w = the candidate's peak modeled probability of beating the incumbent:

    refund = stake × min( w / 0.5 , 1.5 )

Co-signs and withdrawals refund fully; merges pool pro-rata. The curve is continuous because cliffs concentrate gaming at the boundary; junk self-punishes in proportion, near-misses cost little. w is the peak rather than exit-time probability by design: a good early candidate displaced by a later, better draft is not punished for the improvement it provoked, and junk never peaks high. Calibration histories appear in the record as audit data; their use is the context's business.

---

## 8. Routing

**8.1 Judgment-budget routing.** Each participant carries a measured judgment cost c_p: bout-relative seconds (raw within active bouts; gaps over the bout-gap threshold discarded), which prices pace and availability with one number. Each servable pair carries a pivotality value v: expected movement of an adoption-relevant posterior, weighted by salience — races near the adoption threshold, certification-gap audits, and bridge probes score high; new-candidate measurement scores as exploration. Every feed is ordered by **v / c_p**. The division of labor follows without further rules: abundant cheap judgment sees everything, including the exploratory tail; scarce expensive judgment only ever reaches the top of its list, so its whole budget lands at decision margins. Frequent participants discover the edge cases; occasional participants cast them. At population scale the same formula prices the participation long tail instead of fighting it.

**8.2 Floors.** F = min(⌈E/3⌉, F_max) distinct movers per race before adoption — statistical sufficiency, with per-race judge counts in the record. Near adoption, the router prefers participants who haven't judged the race: the unheard are asked at the moment their silence would be foreclosed. Judgments count once each; there are no weights.

**8.3 Mechanics.** A hot set of ~3 races receives concentrated sampling (was ~6; calibration sweep 2026-08-13 — depth of evidence per race beats breadth at small-roster scale, best welfare and lowest variance of any setting tested) — resolving a race retires it from every feed, so finish lines come first. ~1 slot in 7 explores under-measured candidates (Thompson sampling); ~1 in 10 serves a salience diagonal. Saturated races leave the judgment stream for the bounty board; care-map-cold spans sink; skipped cards recirculate personally with decay. Feeds are suggestions — participants can browse, search, and judge anything live. Sort tabs expose magnitude only (activity, evidence volume, closeness-to-resolution as a single number, newness, mine), never direction. The bounty board is a first-class tab; each entry opens the composer.

Rival-vs-rival pairs answer a conditional question — "if this text changes, which change is better?" — and their signal is precious precisely because it cannot be recovered from incumbent comparisons. Two serving rules follow (Ed, 2026-08-14). First, cards never offer "keep the current text" on a rival pair: a pro-incumbent judge expresses that on incumbent-involving pairs, which the router owes them, and the rival card's prompt states the conditional framing plainly. Second, rival pairs are served sparingly until the race shows evidence that at least one challenger plausibly displaces the incumbent; before that, incumbent-involving pairs dominate the race's sampling — there is little decision value in finely ranking challengers that are all losing to the status quo (their order matters only to the backlog).

**8.4 Notifications.** A thin digest layer — your candidate was dominated; a race you drafted for nears resolution; the bounty board moved. Batched, magnitude-only, policy published. It is the liveness engine of a distributed window and gets router-grade hygiene.

**8.5 Hygiene.** One routing policy, identical for everyone; objective, index, and parameters published before open; every routing decision logged; log and RNG seed released with the record. No one — including the convenor — holds mid-session power over any feed. The convenor's in-session powers: none.

---

## 9. Sessions

**9.1 Distributed by default.** The baseline is a fully remote window, possibly days long. Co-presence is optional; a projector is another client rendering the chamber view (room mode: ticker, bounty board, closing sweep). Nothing in the mechanism references a room.

**9.2 Two publications.** Common knowledge is made by publication. **Opening:** roster, constitution, and starting text, hash-anchored and pushed to all. **Closing:** the text and the record. Between them the chamber view is ambient: adoptions land with a chime, the rolling log hash and bounty board are visible, live standings never are.

**9.3 Presence and access.** Participation is bouts, not attendance; c_p absorbs intermittency. The convenor may add or remove participants mid-session: a joiner receives the base grant plus drip accrued to date (capped); F recomputes from current E; a removed participant's live candidates remain live, flagged author-departed, and their cast judgments stay counted. Chamber visibility is convenor-toggled (default link-only). An **observer role** provides the chamber plus an anonymized live metrics feed (throughput, saturation events, care-map evolution). The record's distribution is the convenor's.

**9.4 Sessions repeat.** Next session, the adoption threshold resets and the backlog re-enters stake-waived, carrying graveyards, camp maps, and rationales as briefing context — not as evidence. Between sessions, authors revise against everything the record taught; incubation is where bridges that need longer than a window get built.

---

## 10. Machine participants

All advisory or ordinary-citizen; none carries authority. The dedup gate and equivalence judgments; semantic composition drafts (Gate 2); geometry diagnosis and synthesis seeds; briefing digests and loss accounts; stratified probe design; and the **coherence auditor** — a standing account with a fixed budget (4 tokens, no drip) that reads the whole document and enters patches against drift, labeled machine-authored, competing by the same arithmetic as anyone.

**Bring your own AI (non-normative).** Humans, simulated personas, and participants' personal AIs all speak the same participant API — submit, judge, read one's own briefings. A participant may connect their own AI to draft and propose on their behalf; supported as a first-class path, never the default UX.

---

## 11. Integrity

Rules maximally public, state maximally private. Published before open: the constitution and routing policy. Private during: individual judgments, latencies, skips, composer visits. The event log is append-only and hash-chained, its rolling hash visible in the chamber; released at close: the full log, seed, per-race evidence, participation statistics. Individual judgments are never attributed; each participant receives a cryptographic receipt verifying their own were counted. Co-present deployments add identical post-move screens and position-consistent buttons — plausible deniability, labeled as such.

---

## 12. Display

Non-contiguous footprints render as multi-hunk diffs with collapsed context. Wide patches show intent summary, occurrence count, and expandable sampled instances. Race cards render contested spans once, candidates as toggleable overlays. The composer renders the full race. The care map renders as document heat. All public views inherit the magnitude-only discipline.

---

## 13. Build order (non-normative)

1. **Engine core + textual patch machinery.** A pure, deterministic, UI-free, LLM-free library: the object model, races via textual overlap (Gate 1 + rivalry; Gate 2 stubbed), BT ranking with ties, the adoption-threshold ramp, tokens and refunds, floors, salience model, routing, event log.
2. **Simulation harness.** LLM agents as synthetic participants — heterogeneous personas (cheap-model) drafting, judging, and skipping with realistic bout patterns — sweeping the adoption-threshold ramp (start/end/shape/clock), F_max, hot-set size, and token schedule against throughput, stability, bridge rate, and backlog quality. Personas are ordinary clients of the same participant API a human client uses, so real users can play alongside bot cohorts. Calibrates mechanics before any live cohort.
3. **LLM layer** — semantic composition (Gate 2), the dedup gate, surgery proposals, geometry seeds, loss accounts, the coherence auditor. Isolated behind interfaces so 1–2 never depend on a network call.
4. **Product** — race card, composer, gazette and chamber, bounty board, live feeds, notifications, magic-link auth, the two publications, the record.
5. **Pilot** — a real session with a real group, constitution calibrated from 2's sweeps. Name it after pressing the buttons.

---

## Appendix A — Constitution defaults

| Parameter | Default |
|---|---|
| Adoption threshold (T_start → T_end) | 0.60 → 0.95, smooth ramp over the session window (wall clock) |
| Adoption floor F | min(⌈E/3⌉, 12) distinct movers per race |
| Saturation test | marginal information per comparison below cost; ≥ 20 comparisons |
| Post-adoption cooldown | 5 min |
| Redraft limit before carry | 2 informed redrafts |
| Rendering tiebreak | deterministic (hash order); margins in the record |
| Tokens | grant 4 · drip 1 per 10% window · cap 8 · flat stake 1 |
| Refund | stake × min(w/0.5, 1.5); w = peak P(beats incumbent) |
| Rationale cap | 300 chars |
| Bout gap threshold | > 90 s discarded from latency |
| Hot set / exploration / salience stream | ~3 races / ~1 in 7 / ~1 in 10 |
| Bridge metric | minimum support across camps, stratified probes |
| Window | convenor-set; wall end triggers closing publication only |
| Visibility | chamber link-only by default; observer role off by default |
| Authorship visibility | public · sealed · anonymous; default sealed |
