# Group Drafting Engine — Specification v0.82
### Working name deferred (direction: "draft")

A compiler for group agreement. Input: a starting text, a roster, a constitution file. Output: the most-agreed text, plus a record of every disagreement, ranked and mapped. Institutional acts — provenance, adoption, ratification — belong to the convening context. The tool measures agreement; it does not confer legitimacy.

**The mechanism in a breath.** The document is a text; candidates are patches against it; patches that cannot coexist race each other; every participant makes one kind of move — shown two texts: A, B, indifferent, or propose C; a race resolves when its leader's win-probability clears the adoption threshold — a confidence bar, held fixed or ramping across a window as the document was set up to do; authors of losing patches are shown why they lost and invited to redraft; two publication ceremonies bracket a fully asynchronous window, or, where a document is perpetual, the roster ends it by signing out; whatever remains unresolved ships as a ranked backlog for the next session.

---

## 1. Contract

**Inputs.** `text` — the starting document. `roster` — E participants, equal standing; the convenor may add or remove participants mid-session (§9.3). `constitution` — every setting (§9.7.1) and the engine tuning (Appendix A), hashed into the log's genesis event.

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

**Who may sign is two rungs of that ladder, not a second setting** (v0.70). Elective signing — *each author chooses per candidate* — sits **above** its base rung and **below** the next: a document that names nobody unless they volunteer is more private than one that names everybody at the close, and one that names everybody at the close but lets you volunteer sooner is more private than one that names you as you propose. It was its own setting until v0.70, with rungs *nobody · each · everybody*; *everybody* was the same fact as **public** above, which made *nobody named* and *everybody signs* both settable at once, and *nobody* and *each* are what the two pairs of rungs now say. Elective signing is a real option and a costly one: in a small roster an unsigned candidate among signed ones says something about its author, so a document that allows the choice is not neutral between the two. That is a cost for the roster to weigh rather than a reason to withhold the option (Ed, 2026-08-17). → why: R-047

**Elective signing is a control on the proposal** (v0.78): under an elective rung the author chooses, per proposal and before proposing, and a signed proposal is named from the moment it is made; the choice is part of the proposal's record and is not revised. Under a fixed rung there is no choice and none is offered — nor accepted at the door. → why: R-050

**A proposal keeps the disclosure rung it was made under** (Ed, 2026-08-26, v0.78). The authorship rung can move by motion after the start; a change binds proposals made after it and none made before, and the record shows the rung each was made under beside the rung that stands. One rule reveals an author everywhere — the live view and the record alike: signed, or made under *public*, or, at the record only, made under *sealed*; never otherwise. **The rule is symmetric** (Ed, 2026-08-27, v0.80): the rung at submission governs in both directions, so a room that tightens to *nobody's name, ever* still names at the close a proposal made under *names at the close* — its author accepted that rung when they proposed — exactly as a room that loosens never names one made in anonymity. One rule, no per-direction exception. → why: R-050

**A signature is always named.** Acknowledging the close signs the final document (§4.6), and the signature carries the signer's own name whatever this setting says. Signing is the opposite act to proposing under a disclosure rule: deliberate, after every decision is made, and an unnamed signature is an anonymous comment rather than a signature. → why: R-047

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

**4.2 Adoption.** A race adopts challenger X when P(X beats incumbent) > T(now) — the adoption threshold — and ≥ F distinct participants have moved on the race. **F = max(Q, min(⌈E/3⌉, F_max))**, where **Q is the settled quorum** (§9.0a): the room’s chosen answer to *how many of us must weigh in before the charter changes*, stated as a fixed count or as a share of the membership (share × E, rounded up — Ed, 2026-08-18; E as §8.2 defines it: arrived, non-removed, non-lapsed). The formula half is a statistical minimum the room’s number can raise but never lower; before the review of 2026-08-18 the spec carried both under different names and the engine implemented only the formula (Q338). Adoption is atomic, lands in the gazette with a chime, and rebases the field. Adoptions land **in batches on a cooldown metronome** (Ed, 2026-08-19): when the cooldown from the last batch has elapsed, *every* race whose leader clears bar and floor adopts at once — the document changes at most once per cooldown, by as much as the room has decided. One decision per race per batch: the ready set is snapshotted before anything lands, because a race's losers stay live after its winner adopts and must not ride the same batch on evidence gathered against the old text. Oldest race first, each adoption rebasing the field for the next; a leader whose rebase fails mid-batch waits like anybody. And a race is ready only once somebody has actually judged in it: two rival authors meet a floor of 2 on their own derived preferences (§3.3) alone, and an author's preference is counted but is not the room (§7's refund draws the same line — before batching, the one-race adoption trigger enforced this structurally). At close, each race renders its posterior leader among threshold-clearing candidates; margins go in the record; exact ties break deterministically by hash. **A fit that reached its iteration cap still adopts, and the receipt says so** (Ed, 2026-08-27, closing Q945, v0.81): the ranking fit reports whether it converged, and the rare fit that stopped at the cap with its gradient still moving is not a governance event — the adoption lands on the probability it produced, and the decision record carries *fitted to the iteration cap* for whoever reads it afterwards. A calibration test holds the cap high enough that no simulated room reaches it. → why: R-051

The cooldown is a legibility device, not a quality device — it is a *recognise-decisions* cadence, and it is **engine tuning, never a constitutional setting** (Ed, 2026-08-19, closing Q399: "effectively a convenience rather than a constitutional decision, part of the UI"). Batching is what keeps it cheap: since everything cleared lands at each tick, no decision waits longer than one cooldown however busy the document is — the serialized form (one adoption per cooldown, globally) queued a busy document's sixth decision for half an hour, which is why it went. It must still stay short (≤5 min): the rising threshold is what makes the session stabilise, the cooldown only paces how changes land for the people in the room, and rationing adoptions by time starves the chains of sequenced adoptions an interconnected document needs (calibration sweep 2026-08-13 — 15–30 min cooldowns cut welfare and halved resolution; re-verify under batching when the sweep is next run). A cleared race is **not surfaced as waiting** — no ⏳: there is no "cleared and cooling" state to show, because the batch evaluates fresh at its own moment (a leader that slips back before the tick simply does not adopt), and deriving one would be a standings reveal (§3.5) telling the room what has won before it lands and exactly how long remains to counter-judge it. The cooldown and the threshold ramp also back each other up against hasty adoption — each looks redundant while the other is intact — so never weaken both together (sweep: no cooldown plus a softened ramp over-adopts and churns). **Its home is the operator, not the document** (Ed, 2026-08-27, closing Q946, v0.81): the value is one minute, set once for the host (`DRAFT_COOLDOWN_MS`), the same for every document it serves — not in the catalogue, not in the record, not a motion anybody can raise. When a second kind of room exists (a six-month charter beside a twenty-minute meeting) it becomes a birth-time engine parameter beside the grant and the drip, chosen once and never afterwards; nothing about the operator value has to be undone to get there. → why: R-052

**4.3 The adoption threshold on the session clock.** *Applies where the document is set to ramp; a fixed bar is equally available, and is the only option without a window (§9.0).* The threshold ramps smoothly from T_start to T_end over **[the start, the close]** — from the moment judging opens (§9.0b), not from creation (Ed, 2026-08-18, Q342): the ramp’s own argument is that the bar tracks irreversibility, and nothing is irreversible before a judgment can exist, so a ceremony that takes two days must not eat two days of ramp. The close stays where it was set; only the span compresses. The drip is not paced against it: it runs on real minutes (§7, Q353), so re-anchoring the ramp never touches a wallet. **Postponing the close never lowers the bar** (Ed, 2026-08-18): when a motion moves the close later, the threshold keeps the value it has at that moment and rises from there to T_end over the new, longer remainder — the same ceiling, reached more slowly. Re-stretching the original ramp would drop the current bar, and a bar that fell because time was added would let a change through at a confidence the room had already moved past. Moving the close **earlier** mirrors it (Ed, 2026-08-18): the threshold keeps its current value and rises to T_end over the shorter remainder — steeper, never discontinuous. Both directions are one rule: **a bar never jumps because timings changed.** The ramp exists because the bar should track irreversibility: an early adoption can still be challenged within the session; a late one is permanent — the outcome is never a surprise. Early low-threshold adoptions give a distributed window visible motion from its first hours. Late activity self-limits (a near-unanimous fix clears T_end; a 60/40 preference cannot), so no proposal deadline is needed. Unscrutinised text is protected not by the clock but by the adoption floor and the posterior itself: a quiet session leaves incumbents standing and ships its questions as backlog. (An evidence-clock variant — the threshold as a function of total comparisons made, so the document stabilises in proportion to the judgment it has absorbed — is deferred to the sim to explore.)

**4.4 Incumbency and certification.** Nothing closes. Incumbency is positional: adoption makes a candidate the status quo; displacement always requires clearing the current threshold. Certification is continuous: P(incumbent beats best live challenger). A "resolved" race is one not currently worth sampling; stability is an equilibrium.

Judgments are living while their question is (Q50, Ed 2026-08-14, revised same day): while a race is open and its ground unchanged, a participant may freely revise any of their judgments on it — the new judgment supersedes the old (event-sourced as 'superseded'; the ranking uses the latest, the record keeps all). A judgment locks when its context ends, two ways: the race **seals** (resolves), or the race's **ground materially shifts** — the old judgment then stands as a locked fact about text that no longer exists, and pairs on the new ground are served fresh. Revision is an open question's privilege, never a closed one's.

**4.5 The certification gap.** When the threshold rises past a race's certification, the gap becomes routing value and the race quietly re-enters circulation: adoptions made on noisy early evidence self-correct (the true leader clears the current threshold); genuinely thin majorities are confirmed thin and recorded as such. Next session, the threshold resets and everything is contestable again — entrenchment is session-scoped.

**4.6 The close** (Ed, 2026-08-20, closing Q467 — *the clock closes the document; nobody presses anything*). The closing act happened when the close was set: the ⏰ question was consented at the founding or moved by motion since, so T=0 is the room's own past decision executing — a founder press would be a power nobody granted, and "close it now" already exists as the motion moving the close earlier. At T=0 a **final adoption batch** runs regardless of cooldown phase; the ready set snapshots at T=0, and a judgment arriving later is refused politely. A constitutional motion unresolved at T=0 resolves as **kept** — what stands stands, the mover's 🏛️ returns. A 👑 assent question pending at T=0 **fails closed**: the carried change is not applied and is recorded as carried-but-unassented, into the backlog — the crown-lapse auto-pass does not fire, because lapse is absence and the close is everybody's deadline. A draft in composition is never destroyed: it can no longer be proposed, and its author keeps the prose. A race unresolved at the close is a **third outcome**: the incumbent stands, but *undecided* is recorded as distinct from *kept* — the minority map and the backlog's stake-waived re-entry both live on the difference. An invitation outstanding at T=0 expires: there is nothing left to join, only to read. **Every member and invitee is mailed that the document has closed, with a link to the record** (Ed, 2026-08-20). Sealed authorship reveals as §3.5a provides. And the record collects each member's **closing comment** (Ed, 2026-08-20): the close is acknowledged per member on their own clock, acknowledging it signs the final document, and the comment — freely blank, dissent as welcome as praise — is the signing rationale.

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

Tokens exist to make proposing cost something — anti-flooding, nothing more. Equal grants are a hard invariant: identical per-person budgets, non-configurable, reset each session; the tool never carries reputation. Grant 4 · drip 1 per 240 real minutes · cap 8 · worthless at close. Stake: 1 token per candidate, flat. Refund at exit, with w = the candidate's peak modeled probability of beating the incumbent:

    refund = stake × min( w / 0.5 , 1.5 )

Co-signs and withdrawals refund fully; merges pool pro-rata. **The maximum caps accrual, and a cut to it clamps** (Ed, 2026-08-27, v0.80): the drip stops at the cap and a refund is never forfeited to it, so a wallet may stand above the maximum between changes — but a motion or a pen that **lowers** the cap clamps every wallet to the new maximum as it lands, which is what keeps the sentence the room agreed (*up to a maximum of y*) true whenever the room has just changed it. *Not yet built: the engine holds the accrual cap and does not clamp on a cut — see Q949.* **The drip runs on real minutes everywhere** (Ed, 2026-08-18, closing Q353): the %-of-window pacing is retired, so the unit the surface states — *an additional ✏️ every z minutes* — is the mechanism's own, a windowed document and a perpetual one fill the same way, and moving the close touches nobody's wallet: §4.3 made postponement bar-neutral, this makes it wallet-neutral. (240 minutes is the order of the old default — 10% of a two-day window; calibration owns the number, Appendix A.) (Calibration note, sim evidence 2026-08-14: at these defaults the economy is deliberately slack — no starvation observed at rosters 5–14, participants sit near the cap — so the drip is close to inert; it stays for population-scale headroom, and the wall-clock drip/threshold pairing is confirmed to feel soft-early/hard-late as intended, Q8.) The curve is continuous because cliffs concentrate gaming at the boundary; junk self-punishes in proportion, near-misses cost little. w is the peak rather than exit-time probability by design: a good early candidate displaced by a later, better draft is not punished for the improvement it provoked, and junk never peaks high. Calibration histories appear in the record as audit data; their use is the context's business.

---

## 8. Routing

**8.1 Judgment-budget routing.** Each participant carries a measured judgment cost c_p: bout-relative seconds (raw within active bouts; gaps over the bout-gap threshold discarded), which prices pace and availability with one number. Each servable pair carries a pivotality value v: expected movement of an adoption-relevant posterior, weighted by salience — races near the adoption threshold, certification-gap audits, and bridge probes score high; new-candidate measurement scores as exploration. Every feed is ordered by **v / c_p**. The division of labor follows without further rules: abundant cheap judgment sees everything, including the exploratory tail; scarce expensive judgment only ever reaches the top of its list, so its whole budget lands at decision margins. Frequent participants discover the edge cases; occasional participants cast them. At population scale the same formula prices the participation long tail instead of fighting it.

**8.2 Floors.** F = max(Q, min(⌈E/3⌉, F_max)) distinct movers per race before adoption (§4.2) — the room’s quorum riding on a statistical-sufficiency minimum, with per-race judge counts in the record. Near adoption, the router prefers participants who haven't judged the race: the unheard are asked at the moment their silence would be foreclosed. Judgments count once each; there are no weights. An author's own derived preference for their draft (§3.3) counts as a mover like any other — unless its author is out of E: an applicant authoring their own admit race (§9.7.3, X11), or an author who has lapsed; their cast judgments still count (§9.5a) — worth watching at small rosters, where F may be three or four and the author is therefore a large fraction of their own floor.

**E is the arrived, non-removed, non-lapsed membership** (Ed, 2026-08-18) — one definition, three uses: quorum's share form is ⌈share × E⌉ (§4.2), the adoption-floor term is ⌈E/3⌉, and the freeze base is E minus abstainers (§9.5). An invited member who has never arrived counts toward nothing (§9.6a — membership begins at first arrival), and a lapsed member has already left the base (§9.5a). Silence is never imputed (Q43, Ed 2026-08-14): a race short of the floor simply waits — the unheard boost keeps asking, and at close it degrades gracefully to backlog. The session must not adopt around a legitimate but silent member; presence is roster management, not mechanism. The system may surface sustained inactivity to the convenor as an advisory signal; what removal takes depends on whether the document has started (§9.6a), and F recomputes from the new E.

**8.3 Mechanics.** A hot set of ~3 races receives concentrated sampling (was ~6; calibration sweep 2026-08-13 — depth of evidence per race beats breadth at small-roster scale, best welfare and lowest variance of any setting tested) — resolving a race retires it from every feed, so finish lines come first. ~1 slot in 7 explores under-measured candidates (Thompson sampling). Salience diagonals are **not a rate** — see 8.3a. Deadlocked races leave the judgment stream — but only per-participant, and only once the race has nothing left to ask that participant (§8.3b); care-map-cold spans sink; skipped cards recirculate personally with decay. Feeds are suggestions — participants can browse, search, and judge anything live. Sort tabs expose magnitude only (activity, evidence volume, closeness-to-resolution as a single number, newness, mine), never direction. A deadlocked race surfaces in the participant's own queue, ranked by its bounty score (there is no separate board — Ed, 2026-08-17: the queue does its job).

**8.3a When a salience diagonal is served** (Ed, 2026-08-17, replacing the flat ~1-in-10 rate). Prioritisation is only worth anybody's attention when there is genuinely too much to do; below that, asking which of two questions matters more is asking which one is the hot one, and the answer is already on the surface. **Two conditions, both required.**

**Volume.** The document must hold at least E (§8.2's E) **live questions** — as many open disputes as there are people on the roster. A question, not a candidate: a race with five candidates counts **once**, because every candidate in it prioritises to the same place. Below that threshold no diagonal is served to anyone and the salience model simply goes uninformed, which costs nothing it was going to be used for: salience sets routing weight, bounty order and backlog order, and none of those has work to do in a document with fewer open questions than members.

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

**8.5 Hygiene.** One routing policy, identical for everyone; objective, index, and parameters published before open; every routing decision logged; log and RNG seed released with the record. No one — including the convenor — holds mid-session power over any feed: the convenor holds no power over routing. (What the convenor may hold over settings is §9.7.) → why: R-031

---

## 9. Sessions

Rules only. The reasoning behind each — the dated rulings, what they replaced, what was tried and rejected — is in `design/SPEC-REASONING.md`, keyed `R-nnn` and pointed at from each rule as `→ why: R-nnn`. How any of this is drawn, worded or announced is `SURFACE.md`'s.

**9.0 Vocabulary.**

| Term | Meaning |
|---|---|
| setting | a named, typed parameter of the document — the catalogue, §9.7.1 |
| kind | **ordinary** · **constitutional** · **personal**, by §9.6's test |
| power | ✒️ the **pen** (the convenor changes the setting directly) · 🛡️ the **shield** (a change the members pass waits on the convenor's accept); held per setting |
| holder | the convenor, or the members — which is the state of holding neither power |
| era | **pre-start** (creation → the start) · **post-start** (the start → the close) · **closed** |
| the start | the moment judging opens; the document is *constituted*, and the time is stamped (§9.6a) |
| route | how a change is decided: 🪶 set · 🏛️ founding consent · ✒️ pen · ✏️ ordinary · 🏛️ constitutional · personal (§9.7.2) |
| E | the arrived, non-removed, non-lapsed membership (§8.2) |
| judge-gate | a setting judging waits on, because a judgment is recorded under it or counted towards it |
| delegable | may open a blind founding question before the start |

**9.0a The founding.** Every setting is born convenor-held, both powers, its question shut and its value unset: nothing arrives delegated and nothing arrives answered. → why: R-001. A shape chosen at the birth is folded as the convenor's own pre-start sets: every setting stays convenor-held, both powers, its question shut. → why: R-053. Before the start the convenor sets what they hold freely, and delegates what they choose; delegating a delegable setting opens its **founding question**, answered **blind** by the arrived members:

- each member states their **minimum** — the least they will accept, read along the setting's protective order (the lowest quorum; the lowest threshold at the close; the most exposure; the shortest quiet spell; the easiest removal; the least generous rate) — and the document takes the **most protective** answer. A consent rule rather than a vote: the result satisfies every stated minimum by construction, which is what escapes the bootstrap (*by what quorum do you decide the quorum?*). → why: R-012, R-013
- **delegate the decision, not the field** (Q341): a question collects exactly the binding scalar — the threshold at the close, the quorum number in the convenor's chosen form — while the machinery it rides on (the ramp's shape and start, quorum's form) stays with the convenor and is ordinary. A question whose meaning depends on another setting is not served until that setting settles (`deps`, §9.7.1). → why: R-014
- the **distribution is published without names**; while the question runs only the count of answers shows, to the convenor and the members alike.
- the electorate is **E minus those who have signed out abstaining**: an abstainer has left the base and neither answers nor blocks. A question **does not resolve while an invitation is outstanding, and never on one voice**. **A sign-out is itself a resolution moment**: an abstention that leaves the electorate exactly the members who have already answered settles the question at that act, not at the next unrelated answer. It is not a ground shift — the roster has not moved — and an abstainer may still record an answer, which is served back to them and counted towards nothing. → why: R-015, R-049
- **the roster is the ground of every answer**: an arrival or removal while a question runs is a ground shift — answers stand, their authors are told and may revise until the question settles. → why: R-017
- members who join later **inherit** the constitution and are owed **nothing** for it: a setting that predates you is simply what the document says, and you read it like anybody arriving. What *is* addressed to a joiner is a power handed to them, which arrives as a grant and is acknowledged as one (§9.0b). → why: R-016

The founding is optional in full: a convenor may set everything and delegate nothing, in which case there is no founding question and the document opens straight into the start. The cost is stated in R-001.

**9.0b Two gates.** A document is live from the moment it is made: the link works, and anyone invited can open and read it. **Reading** needs nothing but 🌍 visibility (§9.3). **Proposing and judging open at the start**, together: a judgment is recorded under a disclosure setting and counted towards a quorum, neither of which can be settled afterwards without changing what the judgment was; and a proposal needs a wallet, which is granted at the start. Before the start a member reads, answers the founding questions put to them, and sets their own name and picture. → why: R-028. The start is refused while a delegated question on **any** setting is still collecting, and while any judge-gate is unsettled however it is held (§9.7.1); the six judge-gates are the settings a judgment is recorded under or counted towards: threshold, quorum, authorship, judgments, visibility, lapse. → why: R-029, R-045. A **starting text may be empty**: the prerequisite is a confirmed decision, not content.

**9.0c Identity is not authorship.** Each member chooses a display name and a picture, settled by them alone — personal settings: not part of the constitution, not delegable, never asked at the founding, because they bind nobody. A member whose name is blank is shown as **Anonymous** — a name, not a gap. A name is how you appear **in the room**; authorship is whether a name is attached to a **proposal**, which §3.5a governs. → why: R-036 A **picture** is an emoji, an uploaded image, or none — with none the member shows as their initials, or as an anonymous mark before they have a name. An emoji is worn by one member at a time, and may not be one of the glyphs the surface uses for its own vocabulary. → why: R-046

**9.1 Distributed by default.** The baseline is a fully remote window, possibly days long. Co-presence is optional; a projector is another client rendering the chamber view (room mode: ticker, the stuck set, closing sweep). Nothing in the mechanism references a room.

**9.2 Two publications.** Common knowledge is made by publication. **Opening:** roster, constitution, and starting text, hash-anchored and pushed to all. **Closing:** the text and the record. Between them the chamber view is ambient: adoptions land with a chime, the rolling log hash and deadlocked races are visible, live standings never are. *(The chime and the gazette are promised here and not yet built — SURFACE.md E28–E30, Q465.)*

**9.3 Presence and access.** Participation is bouts, not attendance; c_p absorbs intermittency. Roster changes follow §9.6a — freely before the start, by motion after. Where a change happens: a joiner receives the base grant plus drip accrued to date (capped); F recomputes from current E; a removed member's live candidates remain live, flagged author-departed, and their cast judgments stay counted; the floor recomputation is announced so races parked at the old floor never complete silently (Q10; unbuilt, SURFACE.md E29). Who may read is the 🌍 setting — constitutional, held like any constitutional setting. **Foundership carries a read independent of 🌍**: the setting decides who may read the document *besides* the people it is already about, and the convenor is one of those people whether or not they are a member. It is a read and nothing else — no judgment, no proposal, no quorum place — and it ends when the office does. → why: R-042. There is no observer role: who may read is settled by 🌍 alone, and nothing is known about a reader who is not a member. → why: R-030. The record's distribution is the convenor's.

**9.4 Sessions repeat.** Next session, the adoption threshold resets and the backlog re-enters stake-waived, carrying graveyards, camp maps, and rationales as briefing context — not as evidence. Between sessions, authors revise against everything the record taught; incubation is where bridges that need longer than a window get built.

**9.5 Signing out, and the freeze.** A perpetual document needs some way to say *deliberation is over* that is not the clock. A member may **sign out**, choosing between two things:

- **holding** — they remain in the quorum base. *I am not finished, and I do not consent to you finishing without me.*
- **abstaining** — they leave the quorum base. *I have said what I want to say; I trust you to finish up.*

When the members still counted — active plus signed-out-holding — fall below quorum, the document **freezes**: live races park exactly as a race short of its floor already parks (§8.2), and the record is cut. A freeze is a stall with an alarm, not a death: it thaws if enough people return. **Proposals may still be made while a document is frozen**: they park with the races, and ride into the record at the close like any unresolved position. → why: R-032

Three rules keep this honest. **Plain silence is not sign-out** — a quiet member stays active and stays counted, because §8.2's refusal to impute silence is the whole reason "didn't log in" cannot be read as "consented". **Judgments already cast keep counting** toward their race's floor after their author signs out. And the quorum base is **E minus abstainers**, never the still-active remainder — otherwise every departure would lower the bar and the last two members could adopt anything. Quorum-busting remains possible, as in every deliberative body, but it requires the explicit, logged act of signing out *holding* and cannot be disguised as attrition; where abstentions leave a handful carrying the document, that is the outcome the abstainers chose over freezing it. An abstainer is told when the base drops materially below where it stood when they left. → why: R-038

**9.5a Lapsing.** Whether a membership **lapses** after a long quiet spell — and after how long — is a constitutional setting (💤): each member states the **shortest** quiet spell they would accept and the document takes the longest, *never* being the longest of all. A lapsed member leaves the quorum base the way an abstainer does and **stands outside every electorate** — a 🏛️ does not wait on them, and they are counted as abstaining in every decision meanwhile; judgments already cast keep counting; warnings go by mail before it happens, and the **package** — the document as it stands and the record to date — goes out with the lapse. Returning is logging in again, and nothing else: no price is paid twice, the rule was consented to at the founding, so revival needs no motion. The convenor's clock runs too (§9.7 rule 6). **Lapse is a reading of the rule, re-read when the rule changes** (v0.75, entry 97): a lapsed member is in that status by no act of their own, so when 💤 is turned off, or lengthened past their quiet, they — and a lapsed crown — are returned at once, the room having chosen to count them again; a shorter spell moves nobody until the clock does. A sign-out is an act and is untouched. → why: R-037

**9.6 The two kinds, and the routes.** The test: **a constitutional decision is one that would make past decisions mean something different.** The list follows from it (→ why: R-033):

- **constitutional** — the disclosure family (§3.5a) and 🌍 visibility (a judgment was cast under a promise about who would see it); quorum and the threshold at the close (every past adoption means *this cleared that bar with that many behind it*); admission, applications, removal and lapse (each governs who is in the room, and quorum is a fraction of the roster); whether the document ends at all (windowed-to-perpetual abolishes the ramp, and the ramp is the bar).
- **ordinary** — everything else: the title, the link, the text, the closing *date*, the threshold's pacing, the proposal rate, AI proposals. **The line can fall inside one setting**: the window is one question whose answers include *never*, so moving the close is ordinary and removing the ending is constitutional — **the route belongs to what a motion changes, not to what card it sits on.**
- **personal** — a member's own name and picture: they bind nobody, so there is nothing to pass.

**A motion is a proposal to change a setting**, and its route is a fact about the setting (§9.7.2). An ordinary motion is **a race** — the whole mechanism, with a value where the prose would be: judged pairwise against the standing value, carrying at the threshold with quorum; rival values join the same race; an entry stakes one ✏️ and refunds by §7; withdrawal returns it whole; identical values are one proposal; a change to the standing value mid-race is a ground shift. → why: R-019. A constitutional motion is **a unanimous vote on the proposed amendment**: each active member accepts, keeps what stands, or abstains; one standing keep blocks but does not kill; abstention never blocks; the motion carries the moment every currently active member stands at accept or abstain with no keep, the electorate re-read live on every answer and roster event; the mover stands at accept from the open; it is blind while it runs (the count only) and every answer is revisable until it settles. → why: R-018, R-021. **A constitutional motion is free and limited**: one open per member at a time, returned on withdrawal or settlement. → why: R-020. **A carried amendment binds races in flight**: a race is always evaluated against the constitution as it stands, past adoptions keep their recorded threshold, and incoherence is a ground shift. → why: R-022

**9.6a Eras.** **Before the start nothing is amended — only set.** §9.6's test is time-indexed: before judging opens there are no past decisions for a change to re-rate, so the convenor re-sets what they hold and re-shapes the roster freely — inviting and uninviting asks nobody. **Membership begins at first arrival**: an invitee is listed as *invited* and counts toward nothing. The start is the convenor's explicit act (🍾): it stamps the constituted-at time, locks 🎩 *is the convenor a member* (a question with two answers and nothing pre-chosen: a **member**, with a wallet, judgments, a place in quorum and answers at the founding; or a **clerk**, who administers and does not write, whose name and picture are optional), lays down both powers on the Text (§9.7 rule 8), anchors the ramp (§4.3) and opens judging. → why: R-002. After the start a change takes its route; **an admission goes by 🪪's price and a removal by 🥾's** (§9.7½, §9.7.3 X4–X5) — at ✒️ the act is its own consent and asks nobody, whoever's word it is; **a resignation is free, immediate and nobody's to refuse**, the one act that is always at ✒️ (v0.74); the convenor's membership, if any, is ordinary membership. **A constitutional setting set or changed after the start is owed an acknowledgement** by every member who had no say **and had already arrived when it was set** — the lapsed included, the removed and the never-arrived excluded, and with them anybody who joined afterwards, for whom it is not news but the document; an ordinary setting only when *changed*; the convenor's re-setting before the start is owed nothing. → why: R-016

**9.7 Powers and holders.** Over every non-personal setting the convenor may hold two powers, ✒️ the pen and 🛡️ the shield (§9.0). A setting is **delegated** when the convenor holds neither. → why: R-007

| State | ✒️ | 🛡️ | Reads as |
|---|---|---|---|
| convenor decides | held | held | *The Founder may amend this at will, and refuse proposals that the membership pass.* |
| convenor decides, room decides too | held | — | *The Founder may amend this at will.* |
| room proposes, convenor answers | — | held | *The Founder may refuse proposals that the membership pass.* |
| delegated | — | — | no governance sentence; the preamble's default applies |

1. **Birth.** Every setting is born convenor-held, both powers, question shut, value unset. → why: R-001
2. **Delegation is an act, one-way, the convenor's own, never a motion.** Before the start, on a delegable setting, it opens the founding question; otherwise — and always after the start — it is a **hand-over**: the value stands, only the holder changes. Each setting's hand-over moment is in §9.7.1 (*hand-over from*). → why: R-006, R-027
3. **Relinquishing a power is free, separate and one-way after the start.** Either power may be laid down **once the setting has a value** — never before, a setting nobody has set having nothing to hand over — and before the start both are as revisable as any value (`reclaim`). **A release made before the start takes effect at the start**: it is recorded when it is made and the clause reads *from the start*, but the power is the convenor's until 🍾 spends it. Where laying one down would leave neither held on a delegable setting, the act is delegation and opens the founding question at once (rule 2). **Laying a power down is news**: every member is owed an acknowledgement of it, as of a changed rule. → why: R-007, R-044, R-048
4. **The road back is a constitutional `reserve` motion**, naming one power or both (default both), landing **without** the convenor's assent — a lapsed convenor included. → why: R-008
5. **A change takes the route of what it changes** (§9.7.2). Where the convenor holds ✒️ the route is the **pen**, on a setting of either kind: direct, recorded as an amendment with a reason, owed an acknowledgement (§9.6a). Otherwise an ordinary setting races and a constitutional one is decided by unanimity. Reservation never alters a setting's route. → why: R-004, R-005
6. **Where 🛡️ is held, a change the members pass is a 👑 question** — accept or reject, at the end of either route; rejection files it on the record. The convenor's crown **lapses like a member** (§9.5a): while lapsed, assent is granted automatically, nothing changes hands, and logging in restores the requirement; a 👑 question pending at the close **fails closed** (§4.6). → why: R-010, R-011
7. **👑 marks a convenor holding either power on any setting; 📯 marks one holding none.** A convenor who holds nothing and is not a member has no role — a name in the record, still able to change their own name and picture, and still an address the room may restore powers to. → why: R-009
8. **The start lays down both powers on the Text.** Adoptions then stand by themselves; a reserve motion on the Text is the road to adoptions waiting on the convenor's accept. → why: R-003
9. **The doors hold the same pair, over the act.** ✉️ *Invite* and ❌ *Remove* are not settings — what an act at them costs is a setting (🪪, 🥾) — but each is born with ✒️ and 🛡️ like one: **✒️ at a door is the act at will** (the convenor invites, or exiles, and asks nobody; exile is immediate, and every answer the member was standing on leaves with them), **🛡️ at a door is the veto of any one act** (a carried invitation or removal is a 👑 question). Laid down, reclaimed, lapsing and marked by 👑 exactly as a setting's pair; never delegated into a question, having none. An application passes ✉️ like an invitation. A resignation passes no door. **✒️ means any unilateral act in the document; the convenor only starts with it** — 🪪 at *pen* is every member's word admitting whom they like. → why: entry 94

Out of scope, by ruling: reserving the text from creation (Q387); delegating powers to individual members, transferring or inheriting the foundership (Q388). → why: R-043

**9.7.1 The settings.** One row per setting; `npm run spec-check` asserts this table against the code's catalogue.

<!-- spec-check: settings -->
| id | glyph | kind | delegable | judge-gate | deps | value | rungs (most protective first) | consent scalar | route of a change | hand-over from |
|---|---|---|---|---|---|---|---|---|---|---|
| title | 🪶 | ordinary | no | no | — | text | — | — | ordinary | text confirmed |
| link | 📍 | ordinary | no | no | — | slug | — | — | ordinary | text confirmed |
| startingText | 📄 | ordinary | no | no | — | text | — | — | none — changed by drafting (X1) | the start, automatically (X9) |
| ending | ⏰ | constitutional | yes | no | — | ending | — | earliest close accepted; never highest | per value: date ordinary, never constitutional (X2) | any time |
| bar | 🌡️ | constitutional | yes | yes | ending | percent | — | lowest threshold at the close | constitutional | any time |
| pace | 🪜 | ordinary | no | no | ending | pace | — | — | ordinary | text confirmed |
| quorum | 👥 | constitutional | yes | yes | — | quorum | — | lowest quorum, in the convenor's form | constitutional | any time |
| authorship | 👤 | constitutional | yes | yes | — | ladder | anonymous · anonymousElective · sealed · sealedElective · public | most exposure accepted | constitutional | any time |
| judgments | 👁️ | constitutional | yes | yes | — | ladder | never · after | most reveal accepted | constitutional | any time |
| chamber | 🌍 | constitutional | yes | yes | — | ladder | closed · link · public (Q527) | most visibility accepted | constitutional | any time |
| rate | ⏱️ | ordinary | yes | no | — | rate | — | least generous rate accepted (most generous wins) | ordinary | any time |
| lapse | 💤 | constitutional | yes | yes | — | lapse | — | shortest quiet spell accepted; never longest | constitutional | any time |
| removal | 🥾 | constitutional | yes | no | — | price | consent · assembly · proposal | easiest removal accepted | constitutional | any time |
| machines | 🤖 | ordinary | yes | no | — | machines | — | most machine proposing accepted | ordinary | any time |
| admission | 🪪 | constitutional | yes | no | — | price | assembly · proposal · pen | cheapest admission accepted | constitutional | any time |
| applications | 🤝 | constitutional | yes | no | — | applications | — | whether strangers may apply; *no* the protective answer | constitutional | any time |
| displayName | ✋ | personal | no | no | — | text | — | — | personal | never held |
| picture | 🖼️ | personal | no | no | — | text | — | — | personal | never held |

*Any time* means: before the start into the founding question, after it as a hand-over. A delegated question on **any** setting blocks the start while it collects; the judge-gate column says which settings must be *settled*.

**Decisions that are not settings** — things the founding asks that are not parameters of the document:

<!-- spec-check: decisions -->
| decision | what it is | lock | page key |
|---|---|---|---|
| 🎩 is the convenor a member | member or clerk (§9.6a); decides whether the convenor owes founding answers at all | locked at the start | hat |
| 🧭 the shape | a meeting, a conference, ongoing, or custom (§9.0a): folded at the save as the convenor's own pre-start sets, never a setting itself | once, before the save | shape |
| 📧 the convenor's address | identity, verified by magic link before the save (§9.7a); unique per member (§9.7½) | changeable by its owner | myemail |
| 🍾 the start | the convenor's explicit act (§9.6a) | once | begin |

**9.7.2 Routes** — who has to agree, in order. Every `MotionRoute` the code knows has a row here.

| Route | Who agrees | Era | Price | Blind? | Settles | Recorded as |
|---|---|---|---|---|---|---|
| 🪶 set | nobody — nothing exists yet | pre-start | a feather | — | on the act | a setting, not an amendment |
| 🏛️ founding consent | each member states a minimum; the document takes the most protective | pre-start | free | yes, count only | on the live electorate, never on one voice, never while an invitation is out | the founding |
| ✒️ pen | nobody — the convenor holds the power | post-start | — | — | on the act | amendment, route `pen`, with reason |
| ✏️ ordinary | enough of the room, at the threshold with quorum | post-start | one ✏️, refunded by §7 | §3.5 | a race | amendment, route `ordinary` |
| 🏛️ constitutional | everybody active: accept / keep / abstain, one keep blocks | post-start | free; one 🏛️ out per member | yes, count only | live electorate, no snapshot | amendment, route `constitutional` |
| personal | the member alone | any | — | — | on the act | not in the constitution |

**9.7.3 Exceptions** — each names the rule it breaks, why, and the ruling.

| # | What | Rule it breaks | Why | Ruling |
|---|---|---|---|---|
| X1 | The Text has no motion route; it changes by drafting in the document | rule 5 | a motion button there is a second door to the same room | Q440 |
| X2 | ⏰'s route falls inside the setting — moving the date is ordinary, removing the ending constitutional | route by kind | *never* is one of the answers to *when* | Q329 |
| X4 | The register is a fact, not a setting — who is a member changes by acts on people (invite, arrive, admit, remove, resign), each priced by a setting (🪪, 🥾) and each passing a **door** (✉️, ❌) that holds its own ✒️/🛡️ pair over the act (rule 9) | rule 5 | invite / arrive / remove are acts on people, and the founder's powers over an act are not powers over a rule | §9.7½, Q506, entry 94 |
| X5 | 🥾 *assembly* is a decision class of its own: unanimity minus the subject, who sees the motion running but is not asked; *consent* counts the subject too, so nobody is removed against their will; a price change mid-motion is a ground shift | routes | real constitutions expel by unanimity of the others | Q401(a) |
| X7 | 🎩 is a decision but not a setting; locked at the start | the table | it decides whether answers are owed at all | §9.6a |
| X8 | 🪜 has no clause of its own; it is stated inside the threshold's and set by 🌡️'s commit | one clause per setting | a ramp is part of what the threshold says | Q512 |
| X9 | The Text's powers are laid down automatically at the start | rule 3 (a free act) | a drafting engine's default is that adoptions stand by themselves | Q440 |
| X10 | The reserve motion lands without the convenor's assent | rule 6 | the release from an unwanted crown is delegation, already in their hands | Q394 |
| X11 | An applicant authors their own admit motion at 🪪's price, a voice for that one act, **and their derived preference is not a mover** toward its floor; under *assembly* nobody stands at accept for them | §3.3, §8.2, X16 | their application is a stranger proposing their own invitation; a wallet-less voice must not be its own floor | Q397, Q565 |
| X12 | Foundership carries a read independent of 🌍 | §9.0b | the convenor is one of the people the document is about | v0.64 |
| X13 | A 🏛️ motion is free and limited to one per member; an ordinary one costs an ✏️ | routes | a price on consent is the one thing that must stay free | Q327 |
| X14 | An invitation outstanding at the close expires, though every link ever issued keeps working | §9.6a | there is nothing left to join | §4.6, §9.7a |
| X15 | The convenor with no powers and no membership keeps their name and picture | rule 7 | identity binds nobody | §9.0c |
| X16 | The mover of a constitutional motion stands at accept from the open | routes (blind) | proposers prefer their own proposals | §3.3 |
| X17 | Crown lapse auto-accepts; a pending 👑 at the close fails closed | rule 6 | lapse is absence, the close is everybody's deadline | Q467 |

**9.7½ Admissions.** The membership is a fact — who is a member — and three settings and two doors govern how it changes (v0.74, entry 94). 🪪 **Admissions** is **the price of admission**, one scale for every route in: *assembly* (🏛️ everyone must agree) · *proposal* (✏️ the membership decides at the threshold) · *pen* (✒️ any member may invite — the act is its own consent). 🤝 **Applications** is one switch: **may strangers apply?** An application is *a stranger proposing their own invitation*, and it pays 🪪's price like one — so *open*, in the old sense, is 🤝 *yes* with 🪪 at *pen*: anyone with the link joins on arrival. 🥾 **Removal** prices the way out on the same scale (X5), with one rung admission has no analogue for: *consent*, unanimity including the subject, so nobody leaves but by their own word. The doors, ✉️ and ❌, carry the convenor's pair over the act itself (§9.7 rule 9). → why: R-024, entry 94. Where application is allowed, a reader who is not a member may apply: an **email, verified by magic link before anything is submitted** — the applicant's identity; **member emails are unique** (an address already on the membership is told to log in instead) — then a name, a picture and a few optional words; an empty application is a real application. A submitted application is **a motion to grant membership at 🪪's price**: under *proposal* its **own one-candidate race against the membership as it stands** (*admit them* against *keep the membership as it is*), carrying at the threshold with quorum, two applicants never raced against each other; under *assembly* a unanimous vote with nobody standing at accept for them; under *pen* admitted on submit. The candidate's author is the applicant (X11); nobody seconds an application, the application being the proposal. **Every proposal to bring somebody in offers a rationale, and a blank one is a real proposal.** An admitted applicant inherits the constitution and is owed nothing for it, like any late joiner (§9.0a); either way they are told by mail. **A change of rule never moves a person; it changes only what is decided next** (v0.75, entry 97). People stand in a status because of an act — an invitation sent, an application lodged, a motion opened — and the act stands under the rule it was done under: a 🪪 re-pricing moves no invitation or application, a 🥾 re-pricing fixes no motion's route. For an application, **submission is the act**: one already submitted when 🤝 shuts goes on to its judgment, the room having it; one only started or verified has lodged nothing, and the shut door refuses it as it refuses any stranger. The one status nobody enters by an act, lapse, is re-read instead (§9.5a).

**9.7a The link is where the document begins to exist.** Arriving at docs.vote presents a brand-new document, and nothing is saved anywhere until the link is followed: the **title** is the first question; the **link** is pre-filled from it and checked against the ones that exist; the **convenor's address** is collected and verified by a mail whose link is the login itself — clicking it proves the address and creates the document at the promised address. While nothing exists a typo costs nothing; after the save the address is the only way back in. Text typed before the save rides the pending creation and is waiting — not decided — in the saved document. **The link is never broken**: it is an ordinary setting, may be changed at any time, and every link the document has ever had keeps working, because an invitation *is* the link and is often opened weeks after it was sent. → why: R-035

**9.8 Names.** A document has one **convenor** — the surface says **founder**; the spec and the engine keep the older word, as `roster` persists for the membership; never "admin" — who is a **member** like anybody or a **clerk** who administers without writing (§9.6a). Everybody on the roster is a **member**, and the surface says **membership**. Anybody else who can read is **not a member at all**. "Participant" is the engine's word for whatever speaks the participant-api and appears in nothing a member reads.

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

## Appendix A — Engine tuning

Parameters the mechanism runs on and nobody is asked: published before open (§8.5), changed by calibration, never a constitution setting. What the room decides is §9.7.1; the fixture values the simulator and ⏩ use are in `packages/sim-harness` and `design/session-view.html` (`SEED`). → why: R-040

| Parameter | Value |
|---|---|
| Adoption threshold ramp (sim default T_start → T_end) | 0.60 → 0.95, smooth ramp from the start to the close (§4.3); the product's threshold is the room's (§9.7.1) |
| Adoption floor F | max(Q, min(⌈E/3⌉, 12)) distinct movers per race (§4.2) |
| Deadlock test | marginal information per comparison below cost; ≥ 20 comparisons |
| Post-adoption cooldown | 1 min (`DRAFT_COOLDOWN_MS`, the operator's — Q946); engine tuning, never constitutional (§4.2) |
| Redraft limit before carry | 2 informed redrafts |
| Rendering tiebreak | deterministic (hash order); margins in the record |
| Stake | 1 ✏️ per candidate, flat (§7, §13); the grant, drip and cap are the room's (⏱️, §9.7.1) |
| Refund | stake × min(w/0.5, 1.5); w = peak P(beats incumbent) |
| Rationale cap | 300 chars |
| Bout gap threshold | > 90 s discarded from latency |
| Hot set / exploration | ~3 races / ~1 in 7 |
| Salience diagonal gate (§8.3a) | none below E live questions (a race counts once); between E and 2E, served (not offered) to a participant with an empty queue, max 3 in a row; at 2E and above, also ~1 in 10 of everyone's stream. No completion state. |
| Deadlock disclosure (§8.3b) | per-participant: shown as an ordinary race until it has no pair left to serve that participant |
| Rival-pair gate (§8.3) | open when some challenger's posterior P(beats incumbent) > 0.5 on ≥ 3 incumbent-involving comparisons (current ground) |
| Re-opened race boost (§4.4 ground shift) | 1.5× routing value while fresh judgments < live candidates |
| Bridge metric | minimum support across camps, stratified probes |
| Machine drafter budget (§10) | 4 ✏️, no drip |
