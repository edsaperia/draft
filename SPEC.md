# Group Drafting Engine — Specification v0.33
### Working name deferred (direction: "draft")

A compiler for group agreement. Input: a starting text, a roster, a constitution file. Output: the most-agreed text, plus a record of every disagreement, ranked and mapped. Institutional acts — provenance, adoption, ratification — belong to the convening context. The tool measures agreement; it does not confer legitimacy.

**The mechanism in a breath.** The document is a text; candidates are patches against it; patches that cannot coexist race each other; every participant makes one kind of move — shown two texts: A, B, indifferent, or propose C; a race resolves when its leader's win-probability clears the adoption threshold — a confidence bar, held fixed or ramping across a window as the document was set up to do; authors of losing patches are shown why they lost and invited to redraft; two publication ceremonies bracket a fully asynchronous window, or, where a document is perpetual, the roster ends it by signing out; whatever remains unresolved ships as a ranked backlog for the next session.

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

**3.2 Indifference** is a judgment: tie evidence for the ranking (a forced choice would fabricate preference), the instrument of behavioral dedup (§5), and, in aggregate, the **care map** — spans the group doesn't mind about keep their incumbents cheaply and stop drawing attention. The map counts indifference on incumbent-involving pairs only — "cold" is incumbent-relative, and rival-pair ties can come from people who defend the status quo (Q13, sim evidence 2026-08-14). All-pairs indifference is still logged; where it runs hot above the map's reading, that excess is a camp-split hint surfaced in the composer briefing (§6.1), never in the map.

**3.3 Propose C.** Drafting is always available: a participant may edit the document itself, anywhere, and any edit they propose becomes a candidate whose footprint decides its race — it may enter the race that prompted it or land elsewhere. Normal stake. Proposing **no longer forfeits** the pair's comparison (Ed, 2026-08-16): the forfeit priced a peek at mid-flight state, and drafting against a race still in the judgment stream now reveals nothing the card did not already show (§3.5). A participant who drafts still judges the pair they were asked about — they may well end up preferring someone else's draft to their own, which is the most informative judgment the system can collect, being made against interest.

One preference is counted without being asked for, and it is **derived rather than recorded** (Ed, Q245): *while a candidate is live, its author prefers it to the current text.* That is what a live candidate means — an author who stopped preferring it would withdraw it (§3.3a) — so it is computed against the incumbent as it now stands, every time, and never goes stale. Assuming that preference saves a pointless question; assuming any other would be fabrication, so the author judges everything else normally.

It counts toward the race's floor (§8.2): an author is a voice on the roster, and excluding them would systematically under-count the preferences of the people who cared enough to write. An explicit judgment always overrides it: an author who judges their own candidate against the incumbent and says otherwise has said something, and the mechanism does not overrule them.

Why derived and not recorded, since the distinction looks academic: a recorded comparison is stamped with the ground it was cast on, and a race's ground widens whenever a new candidate joins it, locking everything cast on the old one (§4.4). A human recovers, because the pair is re-served and they answer again — nobody re-asks an automatic vote. Built the recorded way, the first author into a contested area lost their voice the moment anyone joined them, while later authors kept theirs, and the floor became a function of submission order. The fault was modelling a standing fact as a dated one.

**Preference is not measurement.** A derived preference is a real preference — it feeds the ranking and counts as a voice — but no sampling effort was spent on it and its answer was known in advance. So everything asking *what does the room prefer, and how many voices are in* counts it, and everything asking *have we measured this enough* does not: the deadlock test (§8.3), the rival-pair gate, the per-race comparison counts in the record, and the performance a refund pays on (§7). A candidate has no performance at all until somebody other than its author has judged it — otherwise, since one favourable comparison already reaches the refund cap, submitting and retiring would pay back more than the stake with nobody else involved.

(Stake pricing confirmed against sim evidence 2026-08-14, Q9: no measurable deterrence at v1 defaults. The product logs any stake-blocked composer entry, so a live cohort feeling the price would show it immediately.)

**3.3a Withdrawal.** An author may withdraw a live candidate of theirs at any time before its race seals (Ed, 2026-08-16). Withdrawal is **retirement, not deletion**: the candidate stops being served in new pairs, but every judgment already cast on it stays in the log and in the ranking, because other candidates' estimates rest partly on comparisons against it and removing a node degrades everything it touched. It enters the graveyard marked *withdrawn by author* rather than beaten. The stake **refunds in full**, as §7 already provides: charging for withdrawal would price exactly the behaviour worth encouraging, since an author who must pay to tidy up will instead leave a candidate they no longer believe in standing in the race, consuming judgments that could have gone elsewhere.

Because withdrawal changes the field, it is a **ground shift** for that race (§4.4): judgments cast against the old field lock as facts about it, and pairs on the new field are served fresh. This is also what makes withdrawal safe to offer. A candidate that is splitting a camp could otherwise be pulled at a chosen moment to change which of the survivors wins; re-serving on the new ground means the room decides that question again rather than having it decided by the timing of a withdrawal.

**3.4 Speech.** Each candidate carries one pinned rationale. There is no chat. To argue is to draft. (Block-level threads can be added later without touching the mechanism.)

**3.5 Disclosure.** **Judgment is blind; composition is briefed.** Standings, splits, and camps are visible in exactly one place — the composer's briefing (§6.1) — and only where there is no live judgment left to contaminate: a race that has left the judgment stream as deadlocked, for that participant (§8.3, §8.3b), or an invitation about the participant's own candidate (§6.2). Drafting against a race that is **still being judged** shows the text and nothing else; a participant who could read the standings and then judge the pair would be casting an informed judgment in a blind field, which is the one thing this section exists to prevent. That constraint is what allows §3.3 to drop the forfeit rather than merely relocating the cost. No feed, card, sort, or notification shows direction on a race the participant hasn't judged. Resolved outcomes are public in the gazette immediately.

**3.5a Disclosure is constitutional** (Ed, 2026-08-17). Who may be seen, and when, is not one setting but a small family of them, and it is settled the same way quorum and the bar are: **either by the convenor at creation, or by the roster at the founding ceremony** (§9.0a). The convenor chooses which, and may delegate the numbers and the disclosure independently — a convenor may fix the quorum and still hand the room its own privacy, or the reverse (Ed, 2026-08-17, revising this section: it had said the disclosure family was never the convenor's, and the ceremony was therefore compulsory).

**Candidate authorship** runs on a ladder from most private to least: **anonymous** (never revealed) · **sealed** (hidden during the session, revealed at close) · **public** (visible live). Rationales are always visible whatever the setting — what varies is only whether a name is attached to one.

**Who may sign.** Independently, a document says whether authorship is uniform or elective: **nobody signs**, **everybody signs**, or **each author chooses per candidate**. Elective signing is a real option and a costly one: in a small roster an unsigned candidate among signed ones says something about its author, so a document that allows the choice is not neutral between the two. That is a cost for the roster to weigh rather than a reason to withhold the option (Ed, 2026-08-17).

**Judgments** have their own ladder, one rung shorter: **never revealed** (the default and the assumption everywhere else in this spec) or **revealed after the decision they contributed to**. Live disclosure is not on it — §8.3's no-standings rule is not a preference but the thing that keeps judgment blind while it is still being collected.

Two consequences worth stating, because they are the reason this is constitutional rather than cosmetic. Disclosure changes what the mechanism measures: a room that can see whose text it is can prefer the person, and §3.3's *preference is not measurement* has a sibling problem in deference. And in some rooms that is fine or even wanted — a standing committee that knows each other, a body whose members are accountable for their positions — which is exactly why the answer belongs to the roster and not to this document.

**Anonymous is the strong default** — but note what that rests on. Where the roster decides, anonymity is structural rather than preselected: it sits at the top of the privacy lattice, so it holds unless *every* member is content with more, and a single person keeps the whole document unnamed. Where the **convenor** decides, that guarantee is not available; anonymity is then a default like any other, and a convenor may open a document in which members are named without their having agreed to it. That is the price of making the ceremony optional, and it is worth a convenor knowing they are paying it (Ed, 2026-08-17).

---

## 4. Resolution

**4.1 Preference and salience.** Per race, a Bradley–Terry ranking over candidates plus incumbent, updated online from blind comparisons, indifference as tie evidence, pairs sampled actively; sampling stops at resolution or deadlock.

Every pair has a type, decided by Gate 2 and cached before serving:

- **Edge** — the two options are mutually exclusive futures (rivals; incumbent vs. challenger; lattice steps like A vs. A+B, which differ by exactly one intent). Edges feed the **preference model**, which governs adoption. Card copy: *"Which should the group adopt?"*
- **Diagonal** — the two intents admit a joint realization (lattice diagonals; any two patches from unrelated races). The answer means "if only one lands, let it be this," and feeds a **global salience model**: a Bradley–Terry ranking over *races* — the questions in dispute — that never touches adoption but sets priority: routing weight, the order stuck races surface in, backlog order. A diagonal between candidates from races X and Y scores as "X's question matters more than Y's"; the router prefers leader-vs-leader pairs so a weak draft doesn't make its question look unimportant. Lattice diagonals are logged but do not enter the cross-race model. Diagonals are served only where prioritisation is actually needed and only to participants with nothing left to judge (§8.3a), not at a fixed rate. Card copy: *"Which matters more?"*

Separable bundles are flagged at submission: split, or stand as one take-it-or-leave-it intent.

**4.2 Adoption.** A race adopts challenger X when P(X beats incumbent) > T(now) — the adoption threshold — and ≥ F distinct participants have moved on the race. **F = max(Q, min(⌈E/3⌉, F_max))**, where **Q is the settled quorum** (§9.0a): the room’s chosen answer to *how many of us must weigh in before the charter changes*, stated as a fixed count or as a share of the membership (share × E, rounded up — Ed, 2026-08-18). The formula half is a statistical minimum the room’s number can raise but never lower; before the review of 2026-08-18 the spec carried both under different names and the engine implemented only the formula (Q338). Adoption is atomic, lands in the gazette with a chime, rebases the field, and starts a short cooldown. At close, each race renders its posterior leader among threshold-clearing candidates; margins go in the record; exact ties break deterministically by hash.

The cooldown is a legibility device, not a quality device, and must stay short (≤5 min). The rising threshold is what makes the session stabilise; the cooldown only paces how changes land for the people in the room. If a session feels too fast, raise the threshold, never the cooldown: rationing adoptions by time starves the chains of sequenced adoptions an interconnected document needs (calibration sweep 2026-08-13 — 15–30 min cooldowns cut welfare and halved resolution), and a document that withholds what the room has already agreed is itself confusing. The cooldown and the threshold ramp also back each other up against hasty adoption — each looks redundant while the other is intact — so never weaken both together (sweep: no cooldown plus a softened ramp over-adopts and churns).

**4.3 The adoption threshold on the session clock.** *Applies where the document is set to ramp; a fixed bar is equally available, and is the only option without a window (§9.0).* The threshold ramps smoothly from T_start to T_end over **[the start, the close]** — from the moment judging opens (§9.0b), not from creation (Ed, 2026-08-18, Q342): the ramp’s own argument is that the bar tracks irreversibility, and nothing is irreversible before a judgment can exist, so a ceremony that takes two days must not eat two days of ramp. The close stays where it was set; only the span compresses. The drip is paced against the same span. **Postponing the close never lowers the bar** (Ed, 2026-08-18): when a motion moves the close later, the threshold keeps the value it has at that moment and rises from there to T_end over the new, longer remainder — the same ceiling, reached more slowly. Re-stretching the original ramp would drop the current bar, and a bar that fell because time was added would let a change through at a confidence the room had already moved past. The ramp exists because the bar should track irreversibility: an early adoption can still be challenged within the session; a late one is permanent — the outcome is never a surprise. Early low-threshold adoptions give a distributed window visible motion from its first hours. Late activity self-limits (a near-unanimous fix clears T_end; a 60/40 preference cannot), so no proposal deadline is needed. Unscrutinised text is protected not by the clock but by the adoption floor and the posterior itself: a quiet session leaves incumbents standing and ships its questions as backlog. (An evidence-clock variant — the threshold as a function of total comparisons made, so the document stabilises in proportion to the judgment it has absorbed — is deferred to the sim to explore.)

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

**6.1 The briefing.** Shown only where §3.5 allows it — a race that has left the judgment stream, or an invitation about the participant's own candidate. Where it is shown, it gives: the heat (split magnitude, indifference rate, evidence volume — never identities); camp structure if detected; a digest of the *why*, built from rationales of camp-preferred candidates and comparison structure; the graveyard, so the dead aren't redrafted; and, for deadlocked races, the bridge bar (§6.3).

**6.2 Invitations.** Two events summon an author to the composer, firing on confident states only and re-firing only when something has changed — never on a timer:

- **Dominated.** The candidate looks very unlikely to win: projected against the threshold ramp, current evidence and trajectory give it no realistic path to clearing the bar before close. The author sees a three-tier account, each tier labeled as what it is: **facts** (standings; the differential diff against the winner; indifference rate; decision speed; the camp cut if one exists), **the winners' own words** (their pinned rationales), and **hypothesis** — a span-level attribution fitted across the race and graveyard ("every candidate containing clause X ranks below 0.45"), with its evidence attached, or an honest "the data can't isolate a cause" plus a proposed isolating redraft. Thin data gets a thin account. Options: retire (refund per performance) · co-sign the leader (full refund) · redraft informed. Two failed informed redrafts carry the position to the backlog as a recorded persistent current.
- **Deadlocked.** The race is close relative to the marginal value of further sampling. Judgment stops; the race stops asking for judgments and starts asking for a draft — see §8.3b for when each participant is told, and §8.3c for what they are shown. It is ranked by the **bounty score**, the highest expected leverage, ranked by the disagreement it would resolve, weighted by salience. Both camps' authors are invited; anyone may draft.

**6.3 Bridges.** A candidate entering a deadlocked race is measured by **minimum support across camps** — it must beat A among B's preferrers and beat B among A's — via stratified probes. Aggregate win rate is not the test; a candidate beloved by one camp is exposed in a handful of judgments.

**6.4 Geometry.** The machine classifies deadlocked races: one-dimensional splits seed midpoint drafts (a true median beats both camps); multi-dimensional splits seed unbundled drafts or propose surgery. Seeds enter as labeled machine candidates and compete like anything else.

---

## 7. Economy

Tokens exist to make proposing cost something — anti-flooding, nothing more. Equal grants are a hard invariant: identical per-person budgets, non-configurable, reset each session; the tool never carries reputation. Grant 4 · drip 1 per 10% of window · cap 8 · worthless at close. Stake: 1 token per candidate, flat. Refund at exit, with w = the candidate's peak modeled probability of beating the incumbent:

    refund = stake × min( w / 0.5 , 1.5 )

Co-signs and withdrawals refund fully; merges pool pro-rata. (Calibration note, sim evidence 2026-08-14: at these defaults the economy is deliberately slack — no starvation observed at rosters 5–14, participants sit near the cap — so the drip is close to inert; it stays for population-scale headroom, and the wall-clock drip/threshold pairing is confirmed to feel soft-early/hard-late as intended, Q8.) The curve is continuous because cliffs concentrate gaming at the boundary; junk self-punishes in proportion, near-misses cost little. w is the peak rather than exit-time probability by design: a good early candidate displaced by a later, better draft is not punished for the improvement it provoked, and junk never peaks high. Calibration histories appear in the record as audit data; their use is the context's business.

---

## 8. Routing

**8.1 Judgment-budget routing.** Each participant carries a measured judgment cost c_p: bout-relative seconds (raw within active bouts; gaps over the bout-gap threshold discarded), which prices pace and availability with one number. Each servable pair carries a pivotality value v: expected movement of an adoption-relevant posterior, weighted by salience — races near the adoption threshold, certification-gap audits, and bridge probes score high; new-candidate measurement scores as exploration. Every feed is ordered by **v / c_p**. The division of labor follows without further rules: abundant cheap judgment sees everything, including the exploratory tail; scarce expensive judgment only ever reaches the top of its list, so its whole budget lands at decision margins. Frequent participants discover the edge cases; occasional participants cast them. At population scale the same formula prices the participation long tail instead of fighting it.

**8.2 Floors.** F = max(Q, min(⌈E/3⌉, F_max)) distinct movers per race before adoption (§4.2) — the room’s quorum riding on a statistical-sufficiency minimum, with per-race judge counts in the record. Near adoption, the router prefers participants who haven't judged the race: the unheard are asked at the moment their silence would be foreclosed. Judgments count once each; there are no weights. An author's own derived preference for their draft (§3.3) counts as a mover like any other — worth watching at small rosters, where F may be three or four and the author is therefore a large fraction of their own floor.

E is the whole non-removed roster, and silence is never imputed (Q43, Ed 2026-08-14): a race short of the floor simply waits — the unheard boost keeps asking, and at close it degrades gracefully to backlog. The session must not adopt around a legitimate but silent member; presence is roster management, not mechanism. The system may surface sustained inactivity to the convenor as an advisory signal; what removal takes depends on whether the document has started (§9.6a), and F recomputes from the new E.

**8.3 Mechanics.** A hot set of ~3 races receives concentrated sampling (was ~6; calibration sweep 2026-08-13 — depth of evidence per race beats breadth at small-roster scale, best welfare and lowest variance of any setting tested) — resolving a race retires it from every feed, so finish lines come first. ~1 slot in 7 explores under-measured candidates (Thompson sampling). Salience diagonals are **not a rate** — see 8.3a. Deadlocked races leave the judgment stream — but only per-participant, and only once the race has nothing left to ask that participant (§8.3b); care-map-cold spans sink; skipped cards recirculate personally with decay. Feeds are suggestions — participants can browse, search, and judge anything live. Sort tabs expose magnitude only (activity, evidence volume, closeness-to-resolution as a single number, newness, mine), never direction. A deadlocked race surfaces in the participant's own queue, ranked by its bounty score (there is no separate board — Ed, 2026-08-17: the queue does its job).

**8.3a When a salience diagonal is served** (Ed, 2026-08-17, replacing the flat ~1-in-10 rate). Prioritisation is only worth anybody's attention when there is genuinely too much to do; below that, asking which of two questions matters more is asking which one is the hot one, and the answer is already on the surface. **Two conditions, both required.**

**Volume.** The document must hold at least E (roster size) **live questions** — as many open disputes as there are people on the roster. A question, not a candidate: a race with five candidates counts **once**, because every candidate in it prioritises to the same place. Below that threshold no diagonal is served to anyone and the salience model simply goes uninformed, which costs nothing it was going to be used for: salience sets routing weight, bounty order and backlog order, and none of those has work to do in a document with fewer open questions than members.

**Audience.** A diagonal is served **only to a participant with nothing else to judge** — no live pair the router would otherwise hand them. Everyone else's attention is better spent judging, which is the act that resolves questions rather than ordering them. This is not a heuristic about who is keen: a diagonal costs a member with an empty queue nothing, and costs a member with a full one a judgment.

**Served, not offered** (Ed, 2026-08-17). When the queue empties the card simply arrives, as every card does when it becomes yours to judge. Asking first — *would you like to help prioritise?* — needs somewhere to put the question, and the answer is not in doubt: the whole reason a diagonal is cheap here is that the participant has nothing else to do.

**And it terminates.** An empty queue must not become an endless stream of prioritisations. Diagonals are served only while a pair would still move the salience ranking — the same active-sampling rule races use — and stop when the remaining pairs are already ordered confidently, with a hard ceiling of **three in a row** per participant regardless. Past either limit nothing is served and the queue is simply empty.

**Nothing about a diagonal has a completion state.** Salience is a continuous ranking with no threshold to clear and no quorum to ratify — which is precisely what allows it to be advisory — so a diagonal has no closeness-to-resolution, and no surface may draw one for it. A progress bar on a diagonal claims a finish line that does not exist.

**A second gate reopens the stream** (Ed, 2026-08-17, answering the timing objection below). The audience gate starves salience of exactly the data it needs *while a session is busy*, because that is when nobody has an empty queue. So above **2E live questions** the room is saturated enough that ordering the work is itself the valuable act, and diagonals return to the judgment stream at a low rate for everybody — the old ~1 in 10. Between E and 2E the audience gate alone applies; below E there are none at all. The three-in-a-row ceiling still governs what an idle participant is served; the stream rate is separate from it.

**Known limitation.** Below 2E, salience is measured on a biased sample: the members who reach the end of their queue, who are systematically the most active. The ranking this feeds is advisory — routing weight, the order stuck races surface in, backlog order — and never touches adoption (§4.2), which is what makes the bias tolerable. It is recorded here rather than corrected because the alternative, spending scarce judgment on ordering instead of deciding, is worse.

Rival-vs-rival pairs answer a conditional question — "if this text changes, which change is better?" — and their signal is precious precisely because it cannot be recovered from incumbent comparisons. Two serving rules follow (Ed, 2026-08-14). First, cards never offer "keep the current text" on a rival pair: a pro-incumbent judge expresses that on incumbent-involving pairs, which the router owes them, and the rival card's prompt states the conditional framing plainly. Second, rival pairs are served sparingly until the race shows evidence that at least one challenger plausibly displaces the incumbent; before that, incumbent-involving pairs dominate the race's sampling — there is little decision value in finely ranking challengers that are all losing to the status quo (their order matters only to the backlog).

**8.3b When a participant is told a race is deadlocked** (Ed, 2026-08-17). Deadlock detection is a property of the race (§8.3), but **disclosure of it is per-participant**: a deadlocked race is served to you as an ordinary race, and is disclosed as deadlocked only once it has **nothing left to ask you** — no pair in it the router would otherwise hand you. Until then the surface shows it as any other open race and the bridge invitation is withheld.

This is a rule about evidence before it is a rule about clarity. Judgments from members who have not yet judged the race are exactly the ones most likely to separate its candidates, and **a deadlock disclosed before the room has finished judging is disclosed early** — the old behaviour told a member the race was stuck before they had contributed the one thing they could still contribute. It also keeps the disclosure ladder consistent with §3.5: what a participant is shown is a function of what has been asked of them and what they have given, never of what the machine knows.

Two consequences. A deadlocked race that a participant has not judged **counts as work to do** for the empty-queue test in §8.3a, so it defers the diagonal. And there is **no public board** that could disagree with this rule: the bounty board is retired (Ed, 2026-08-17 — *I don't think we need the bounty board anymore; the sidebar-queue does its job*). Its score survives and does the ranking it always did, in each participant's own queue.

**8.4 Notifications.** A thin digest layer — your candidate was dominated; a race you drafted for nears resolution; a race you judged has deadlocked. Batched, magnitude-only, policy published. It is the liveness engine of a distributed window and gets router-grade hygiene.

**8.5 Hygiene.** One routing policy, identical for everyone; objective, index, and parameters published before open; every routing decision logged; log and RNG seed released with the record. No one — including the convenor — holds mid-session power over any feed. The convenor's in-session powers: none.

---

## 9. Sessions

**9.0 What is fixed at creation** (Ed, 2026-08-16; amended 2026-08-18). Every setting below is chosen when the document is made, and after that changes only by **motion** (§9.6) — ordinary or constitutional by §9.6’s test, never by anybody’s unilateral hand. Two of them are **independent axes**, and it is worth not confusing them.

**The window.** A document either has an **end datetime** or it is **perpetual**. A window buys the closing ceremony, a token drip paced against it, and a record cut at a known moment. Without one, the drip runs against **real time** and does not reset, and the document ends by **freeze** (§9.5) — so a perpetual document is not really endless, it is one whose ending is decided by its roster rather than its calendar.

**The proposal rate**, which is **two settings** (Ed, 2026-08-18): the **grant** a member starts with, and the **drip** that returns spent edits (with its cap). Not an “economy” and not “tokens” — both words describe the machinery from outside, where what a member is being asked is how often they may propose. The **stake** is not a third setting: it is a flat 1 (§13), and offering to set it would be offering a decision the mechanism does not have. They are delegable independently, and when delegated each takes the **most generous** answer any member stated. They are creation-time parameters (Ed, 2026-08-16), alongside quorum and the bar rather than buried among the defaults — a document meant to move quickly and one meant to be hard to change want different answers, and the members can see the difference in their wallets from the first minute.

**The approval threshold is two decisions of different kinds** (Ed, 2026-08-18, Q341 — *rethink this given what is being decided*). What consent is about is **how sure the room must be before a change is permanent**: the bar at the close, one number, and the only part of the threshold a member’s minimum can meaningfully bind — an early adoption is challengeable under the ramp’s own logic, so consenting to the close covers everything before it. How the bar **gets there** — fixed at that number for the whole window, or rising from a lower start — is *pacing*: how fast the document firms up on its way to the close. And pacing is **ordinary by §9.6’s own test**: every adoption is recorded against the bar as it stood, so re-shaping the ramp re-rates nothing already decided. So the close is constitutional and delegable; the shape and the start are the convenor’s, like the drip. Only the perpetual case is *constrained*: a ramp needs an endpoint, so no window means fixed. A fixed bar reads exactly as §4.4 already describes the mechanism: anything may displace anything, always, at the same price.

Open: a perpetual document has no inter-session reset, so it loses the periodic moment where the threshold resets and the backlog re-enters stake-waived (§9.4, §4.5) — the device that kept entrenchment session-scoped. Whether something replaces it is Q252.

**9.0a The founding ceremony.** Quorum, threshold and the disclosure family of §3.5a may each be set by the convenor, or **decided by the roster before any drafting begins**. The ceremony is **optional in full** (Ed, 2026-08-17): a convenor may settle the whole constitution alone, in which case there is no ceremony and the document opens straight into drafting. The delegations are independent and per-setting, so a ceremony may ask about any subset.

**But the roster is the default holder of the constitutional ones** (Ed, 2026-08-17, narrowed 2026-08-18 — see §9.7). Every *constitutional* setting starts delegated, and a convenor has to take one back rather than hand it over; the ordinary ones start with the convenor, because the room can take those back at any time with a motion. This is the same argument this section already makes about anonymity: a default that has to be argued out of is a far stronger thing than a radio button that happens to be ticked. It also means the ordinary document runs a ceremony, and the convenor-settled document is the deliberate exception.

**The convenor is a hat, not a role** (Ed, 2026-08-17). Whoever sets a document up chooses whether they are also a participant in it: a **drafter**, with a wallet, judgments, a place in quorum and an answer at the ceremony — or a **clerk**, who administers and does not write. Both are ordinary: a facilitator running a convention they are not a member of, and a member who happened to be the one to start the document, are different people performing the same administrative act. Each member is asked, blind, for the *lowest they are willing to accept* — the lowest quorum, and the lowest threshold — and the document takes the **maximum** of each.

Taking the maximum of stated minimums is what makes this a **consent rule rather than a vote**, and that matters more here than elegance: it dodges the constitutional bootstrap, which is the standing problem with founding decisions — *by what quorum do you decide the quorum?* There is no vote to govern, because the result satisfies every stated minimum by construction and nobody can say the rules were imposed on them. The cost is that the most demanding member sets the bar, and asking for full quorum is a perfectly reasonable position (Ed, 2026-08-16) — a document that cannot move without everyone is a legitimate thing to want.

Answers are collected blind, for the same reason judgment is blind: otherwise the room anchors on whoever answers first. The **distribution is published without names** — the shape of what people asked for is worth seeing and makes the resulting bar easier to live with; the identity of whoever needed most is not.

**The ceremony extends to disclosure** (Ed, 2026-08-17), and the consent rule generalises without amendment. Quorum and threshold are numbers, and "the lowest I will accept" is read up the scale. The disclosure settings of §3.5a are **ordered by privacy** — anonymous is more private than sealed, which is more private than public; nobody-signs than each-chooses than everybody-signs; judgments never revealed than revealed after the decision. Each member states the **most exposure they are willing to accept**, and the document takes the **most private** of those answers. It is the same rule seen from the other end: whatever the document ends up doing, no member is exposed further than they said they would accept, so nothing is imposed on anybody and there is still no vote to govern.

That is also what makes **anonymous the strong default** without anything being preselected. Anonymous sits at the top of the privacy lattice, so it holds unless *every* member is content with more exposure — a single person who wants to stay unnamed keeps the whole document unnamed. A default that has to be argued out of by unanimity is a much stronger thing than a radio button that happens to be ticked, and it means the room only becomes visible to itself when it has genuinely all agreed to be.

Quorum may be a fixed count or a share of the membership (Ed, 2026-08-18) — shares suit a windowed convention, where the membership is stable and a fraction expresses legitimacy; counts suit a perpetual document, where a drifting membership would otherwise silently re-rate every parked race. **The form is the convenor’s and the number is the room’s**: an instance of the general rule for delegating a compound setting — **delegate the decision, not the field** (Q341). A delegated question must be phrased over the thing consent is about, and it collects exactly the binding scalar: the bar *at the close*, the quorum *number in the convenor’s chosen form*, the grant count, the drip rate. The machinery each rides on — the ramp’s shape and start, quorum’s form — is pacing or wording, stays with the convenor, and is ordinary. Two consequences: a room answering a delegated question always answers something well-posed, since the frame was fixed before the question was served; and **a ceremony question whose meaning depends on another setting is not served until that setting settles** (the drip’s units depend on the window), the card-dependency rule arriving at the ceremony. Members who join later **inherit** the constitution rather than reopening it (Q257) — otherwise every arrival re-opens the founding question and a long-lived document never settles.

**9.0b Nothing waits for everything** (Ed, 2026-08-17). A document is live from the moment it is made: the link works, and anyone invited can open and read it immediately. Capability then arrives as its prerequisite is met, and there is no single moment at which the document "opens".

**Reading** needs nothing. **Proposing** needs a confirmed starting text, and — for a member with ceremony questions of their own outstanding — **their own answers to them** (Ed, 2026-08-17). You do not have to know what the room decided to say what a clause should say, and until the proposal rate is settled everyone drafts on the standard grant; when the room’s answer lands it applies **prospectively only** (Ed, 2026-08-18, Q343) — nothing is clawed back, no wallet goes negative, and a wallet above the settled cap simply drips nothing until it is under it. But you should not be able to act on a document whose rules you have not yet said what you will accept of. **Judging** needs the whole constitution, and that is not bureaucracy: a judgment is *recorded under a disclosure setting* and *counted towards a quorum*, and neither can be settled afterwards without changing what the judgment was.

So the three gates fall to three different holders: reading to nobody, proposing to the convenor and then to **you**, judging to the **room**. A member who has answered can draft while the rest of the roster is still answering, which is the point — the ceremony is not a queue everybody has to clear before anything can happen.

A **starting text may be empty**, which is why the prerequisite is a confirmed decision rather than content: a roster writing something from nothing is an ordinary way to begin, and a blank page nobody has looked at and a blank page somebody chose must not be the same state.

**9.6a Before the start, nothing is amended — only set** (Ed, 2026-08-18, Q339/Q340). A **motion** is the act of changing a *settled* document’s rules, and §9.6’s test is time-indexed by its own wording: before judging opens there are no past decisions for a change to make mean something different. So until **the start** — the moment judging opens (§9.0b) — the convenor re-sets their settings freely, and re-shapes the roster freely: inviting and uninviting costs nothing and asks nobody. The kinds still govern who *holds* each setting (§9.7); what changes at the start is what changing one *takes*.

**Membership begins at first arrival, not at invitation** (Ed, 2026-08-18). An invitation is an invitation *to become* a member; until somebody opens the document they are listed under the membership as **invited**, with no wallet, no answers owed, and no place in any count. The ceremony’s E is the arrived, which is what keeps one unopened email from blocking judging for everybody (Q339); a late arrival inherits the constitution (Q257) and is owed an **OK** on every constitutional setting they had no say in — the unacknowledged-decision rule, covering inheritance with no new machinery.

One honesty rule keeps the free pre-start roster from quietly re-rating the ceremony: **the roster is the ground of every ceremony answer** — *how much of these particular people* — so a roster change while answers are being collected is a ground shift. Answers already given stand, their authors are notified, and each may revise until the question settles; blindness is unaffected, since nobody sees anybody’s answer either way.

**After the start, both directions are constitutional motions** (§9.7): an invitation carries only if no member refuses, and a removal requires every member’s consent — **including the member being removed**. Stated plainly rather than hidden: expulsion from a settled document is effectively impossible, and that is the design — you cannot be thrown out of a constitution you consented to be bound by. The pressure valves for a member who should leave are their own sign-out (§9.5), the freeze, and the advisory-inactivity signal (§8.2); what a room does about a member who will neither participate nor leave is open (Q345).

**9.0c Identity is not authorship** (Ed, 2026-08-18). Each participant chooses a **display name and a picture**, and this is settled by them alone: it is not part of the constitution, not delegable, and not asked at the ceremony, because nothing about it binds anybody else.

It must not be confused with the disclosure family of §3.5a, and under most of that family's settings the two never meet: a name is how you appear **in the room** — in the roster, in the presence row, beside your own wallet — where authorship is whether a name is attached to a **proposal**, which is sealed by default and stays sealed unless every member consented to more (§9.0a). A document can perfectly well show fourteen named people and not one named candidate, and that is the ordinary case rather than a corner of it.

**9.1 Distributed by default.** The baseline is a fully remote window, possibly days long. Co-presence is optional; a projector is another client rendering the chamber view (room mode: ticker, the stuck set, closing sweep). Nothing in the mechanism references a room.

**9.2 Two publications.** Common knowledge is made by publication. **Opening:** roster, constitution, and starting text, hash-anchored and pushed to all. **Closing:** the text and the record. Between them the chamber view is ambient: adoptions land with a chime, the rolling log hash and deadlocked races are visible, live standings never are.

**9.3 Presence and access.** Participation is bouts, not attendance; c_p absorbs intermittency. Roster changes follow §9.6a — freely before the start, by constitutional motion after. Where a change happens: a joiner receives the base grant plus drip accrued to date (capped); F recomputes from current E; a removed participant's live candidates remain live, flagged author-departed, and their cast judgments stay counted. A roster change's floor recomputation is announced in the gazette ("floor recomputed, N races now eligible") so races parked at the old floor never complete silently (Q10, sim evidence 2026-08-14). Chamber visibility is convenor-toggled (default link-only). An **observer role** provides the chamber plus an anonymized live metrics feed (throughput, deadlock events, care-map evolution). The record's distribution is the convenor's.

**9.4 Sessions repeat.** Next session, the adoption threshold resets and the backlog re-enters stake-waived, carrying graveyards, camp maps, and rationales as briefing context — not as evidence. Between sessions, authors revise against everything the record taught; incubation is where bridges that need longer than a window get built.

**9.5 Signing out, and the freeze** (Ed, 2026-08-16). A perpetual document needs some way to say *deliberation is over* that is not the clock. A member may **sign out**, and in doing so chooses between two things that mean quite different things:

- **holding** — they remain in the quorum base. *I am not finished, and I do not consent to you finishing without me.*
- **abstaining** — they leave the quorum base. *I have said what I want to say; I trust you to finish up.*

When the members still counted — active plus signed-out-holding — fall below quorum, the document **freezes**: live races park exactly as a race short of its floor already parks (§8.2), participants are notified, and the record is cut. A freeze is a stall with an alarm, not a death: it thaws if enough people return.

Three rules keep this honest. **Plain silence is not sign-out** — a quiet member stays active and stays counted, because §8.2's refusal to impute silence is the whole reason "didn't log in" cannot be read as "consented". **Judgments already cast keep counting** toward their race's floor after their author signs out: signing out stops you being asked, it does not erase what you said. And the quorum base is the **whole roster minus abstainers**, never the still-active remainder — otherwise every departure would lower the bar and the last two members could adopt anything.

That split is also what makes a walkout visible. Quorum-busting remains possible, as it is in every deliberative body, but it now requires the explicit, logged, positive act of signing out *holding* — it cannot be disguised as ordinary attrition. And where abstentions leave only a handful of people carrying the document, that is the outcome the abstainers chose in preference to freezing it (Ed, 2026-08-16): each of them had the freeze available and declined it. An abstainer is notified when the base drops materially below where it stood when they left, so the choice they made can be revisited rather than merely inherited.

---

**9.6 Ordinary and constitutional** (Ed, 2026-08-18). A document is a constitution editor, so the question it has to answer about itself is which of its own decisions are **ordinary** and which are **constitutional**. The test is Ed's: **a constitutional decision is one that would make past decisions mean something different.**

That is structural rather than a matter of taste, so the list is derived and not argued:

- **the disclosure family** (§3.5a) and the **chamber**. A judgment was cast, and a rationale written, under a promise about who would ever see them. Changing the promise afterwards reaches back and breaks it.
- **quorum** and **the bar**. Every past judgment was cast knowing what it was being counted towards, and every past adoption means *this cleared that bar with that many behind it*. Move either and the record stops saying what it said.
- **the roster**, and with it **machine members**, since a machine member is one more participant with a wallet. Quorum is a fraction of the roster, so adding or removing anybody silently re-rates every judgment already cast and every race parked at a floor.
- **whether the document ends at all**, because windowed-to-perpetual abolishes the ramp and the ramp is the bar.

Everything else is **ordinary**, by the same test: no past judgment means anything different because the title changed, or the link, or the end **date**, or the size of the wallet. Note where that line falls inside a single setting: the **window** is one question with one answer, and *never* is one of its answers (§9.0) — so a motion to **move** the closing date is ordinary and a motion to remove the ending altogether is constitutional. The route belongs to what a motion changes, not to what card it sits on (Q329). So the starting text, the title, the link, the closing datetime, the grant, the drip and the stake are ordinary. A member's own **name and picture** are neither: they bind nobody, so there is nothing to pass.

**A motion is a proposal to change a setting**, and which route it takes is a fact about the setting rather than about the motion:

- an **ordinary** motion is a race. It is judged pairwise against the setting as it stands and carries when it clears the bar with quorum — the mechanism this engine already is, with a value where the prose would be.
- a **constitutional** motion is **the opening question, asked again**. Nothing is judged: each member states the least they will accept and the document takes the maximum, exactly as at the start (§9.0a), so the new answer satisfies every stated minimum by construction and nobody is bound by a rule they did not consent to.

Full quorum with full approval reaches the same place and was the first proposal, but the consent rule gets there **by construction rather than by collecting votes**, and that difference is the whole point: a unanimity rule is still a vote, and a vote on the constitution must be governed by the constitution — *by what quorum do you decide the quorum?* Taking the maximum of stated minimums has no vote in it to govern. It also means the amendment rule and the founding rule are one rule, so no second mechanism exists to be reasoned about, and the surface that asks a founding question is the surface that amends it.

**An ordinary motion costs an edit; a constitutional one costs nothing** (Ed, 2026-08-18). An ordinary motion *is* a proposal — it races against the value as it stands and carries at the bar — so it is priced exactly like a proposal against the text (§7): one edit, returned in full on withdrawal. A constitutional motion is not a proposal at all; it is a member asking to be asked again about a rule that binds them, and charging for that would put a price on consent, which is the one thing in this design that must stay free. What keeps it from being abused is therefore a **limit** rather than a price, and what that limit should be is open (Q327).

**A member's own answer is not carried over** when a constitutional question re-opens. Showing somebody what they said last time anchors them to it, which is the same reason the first asking is blind.

**9.7 Who holds what, by default.** Constitutional settings default to the **roster**; ordinary settings default to the **convenor** (Ed, 2026-08-18, moving the economy back). This replaces the flat "everything is delegated by default" of §9.0a with one rule that explains itself: an ordinary setting can be taken back by the room at any time with a motion at the bar, so defaulting it to the convenor costs them nothing. A constitutional setting cannot — changing it needs everybody — so it has to be theirs from the start or it is not really theirs at all. Either default may be overridden per setting at creation.

The **roster itself** is the one constitutional setting the convenor must supply, because at creation there is no room to ask: somebody has to send the first invitations. It is constitutional from that moment on, which is why an invitation after the start is a **motion**, decided by consent — one member who says no keeps a joiner out (Ed, 2026-08-18: *drafters can also make proposals to invite new members, which are passed in the constitutional way*).

**9.7a The link is never broken.** The document’s link is an ordinary setting and may be changed at any time, and **every link it has ever had keeps working**: a change leaves a redirect behind (Ed, 2026-08-18). Members are invited by a link sent to them once, often weeks before they open it, so a rename that broke old links would make the one ordinary setting with a real cost for being used as intended.

**9.8 Names.** A document has one **convenor** — never an "admin", never a "founder" — who may be a **drafter** like anybody else or a **clerk** who administers without writing (§9.0a). Everybody on the roster is a **member**, and the surface calls them the **membership**; a member who writes and judges is a **drafter**. Anybody else who can read a document is **not a member at all** — nothing is known about them, and who may read is settled by the chamber setting (§9.3) rather than by a role granted to a person (Ed, 2026-08-18). The fate of §9.3’s own observer role is Q324. "Participant" is the engine's word for whatever speaks the participant-api, where a human, a sim persona and a machine member are interchangeable, and it should not appear in anything a member reads (Ed, 2026-08-18).

## 10. Machine members

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
4. **Product** — race card, composer, gazette and chamber, live feeds, notifications, magic-link auth, the two publications, the record.
5. **Pilot** — a real session with a real group, constitution calibrated from 2's sweeps. Name it after pressing the buttons.

---

## Appendix A — Constitution defaults

| Parameter | Default |
|---|---|
| Adoption threshold (T_start → T_end) | 0.60 → 0.95, smooth ramp over the session window (wall clock) |
| Adoption floor F | min(⌈E/3⌉, 12) distinct movers per race |
| Deadlock test | marginal information per comparison below cost; ≥ 20 comparisons |
| Post-adoption cooldown | 5 min |
| Redraft limit before carry | 2 informed redrafts |
| Rendering tiebreak | deterministic (hash order); margins in the record |
| Tokens ("edits" in the interface) | grant 4 · drip 1 per 10% window · cap 8 · flat stake 1; grant and drip are creation-time parameters (§9.0) |
| Refund | stake × min(w/0.5, 1.5); w = peak P(beats incumbent) |
| Rationale cap | 300 chars |
| Bout gap threshold | > 90 s discarded from latency |
| Hot set / exploration | ~3 races / ~1 in 7 |
| Salience diagonal gate (§8.3a) | none below E live questions (a race counts once); between E and 2E, served (not offered) to a participant with an empty queue, max 3 in a row; at 2E and above, also ~1 in 10 of everyone's stream. No completion state. |
| Deadlock disclosure (§8.3b) | per-participant: shown as an ordinary race until it has no pair left to serve that participant |
| Rival-pair gate (§8.3) | open when some challenger's posterior P(beats incumbent) > 0.5 on ≥ 3 incumbent-involving comparisons (current ground) |
| Re-opened race boost (§4.4 ground shift) | 1.5× routing value while fresh judgments < live candidates |
| Bridge metric | minimum support across camps, stratified probes |
| Window | convenor-set; wall end triggers closing publication only |
| Window (§9.0) | end datetime (default) or perpetual; set at creation, never after |
| Threshold shape (§9.0) | ramping (default) or fixed; independent of the window, but perpetual forces fixed |
| Quorum form (§9.0a) | percentage of roster (suits a window) or fixed count (suits perpetual) |
| Constitution source (§9.0a) | quorum, threshold and disclosure each convenor-set **or** the roster's founding ceremony, independently; max of each member's stated minimum, most-private for disclosure. No ceremony at all if the convenor settles everything |
| Perpetual drip | per real time rather than per 10% window; capped as above; no reset |
| Visibility | chamber link-only by default; observer role off by default |
| Authorship visibility (§3.5a) | anonymous · sealed · public; **anonymous by default**, and by unanimity rather than by preselection |
| Who may sign (§3.5a) | nobody · each author chooses · everybody; default nobody |
| Judgment visibility (§3.5a) | never · revealed after the decision; default never. Live disclosure is not an option (§8.3) |
| Disclosure source (§9.0a) | the roster's founding ceremony — the **most private** of each member's stated maximum exposure |
