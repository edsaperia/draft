# CLAUDE.md under the pruning test — a proposal, to be approved line by line (Q943)

Backlog entry 47, batch K, 2026-08-27. A **read-only** pass over `CLAUDE.md` at
`6d64d28`. **Nothing in `CLAUDE.md` was changed by the pass that produced this file**,
and nothing in `SPEC.md`, `SURFACE.md`, `design/STYLE.md` or `design/DECISIONS.md`
either. Every item below is a *candidate*, not a decision. A later plan applies what Ed
approves, and cites the file as it stands then.

## The four rules being applied

Taken from Ed's 2026-08-25 reading of BMAD's Project Context theory — instruction files
that restate the repository measured no improvement in success rate and +20% inference
cost, while a short index of what the model did *not* know took a task from 53% to 100%.

1. **The pruning test** — would removing this line change agent behaviour? If not, it is
   a candidate.
2. **Negative constraints over positive guidance**, and **every prohibition names the
   permitted alternative** — *do X* is weaker than *never Y; do X instead*, and a bare
   *never* leaves the session to invent the alternative.
3. **No repo structure, no tours, no history narration, no aspirational state** — the tree
   says what the tree contains; git says what happened; a plan says what is meant to exist.
4. **The inversion** — a policy or pitfall retires only when the thing it guards is gone
   or a human retires it, **never for absence of recent failures**, because a working rule
   erases its own evidence.

**The pruning test is a lens over the admission rule, not a replacement for it.** *What
goes in this file* asks *what kind of thing is this* — a rule, a reason, a gotcha, a name
— and sends three of the four elsewhere. The pruning test asks *does this line change what
a session does*, which a correctly-homed line can still fail: a glossary entry naming a
part nothing reads, a Documents bullet touring a directory, a convention restating what
the tree already enforces. **Precedence: where this proposal and *What goes in this file*
disagree, the admission rule wins and the item is withdrawn.**

## The three rulings that bound this audit

- **No byte budget** (Ed, Q723–731, 2026-08-23). This is not a diet. No item's ground is
  *the file is big*; every one of them is one of the four rules. The byte column is
  information. The 100,000 B figure in plan-queue's watch config is where the last
  refactor left the file, not a target this proposal has to reach.
- **The inversion, for gotchas** (Ed, Q736 + Q723–731). No gotcha is proposed for
  retirement because it has not bitten lately. A gotcha may be proposed for **move** only
  under the eviction rule — a named automated guard now catches the mistake, so one line
  stays (the failure and the guard) and the post-mortem goes to `design/DECISIONS.md` —
  or for **retire** only where the thing it guards is provably gone from the tree. Each
  gotcha item says which it claims, and *cannot know* is a keep. **This audit proposes no
  retirement anywhere in the file**: nothing in it guards a thing that has left the tree.
- **Approved line by line** (entry 47). Ed replies by number. Nothing is applied on its own.

## How to read the list

The unit is the line for bullets and the paragraph for prose; a glossary sub-bullet is an
item like any other, at any depth (the entry rule already says so). **282 items, one
continuous sequence, in file order.** Each carries its opening between `«` and `»`, quoted
verbatim so `grep -F` finds it at HEAD; its size; and a verdict.

- **keep** — it changes what a session does, or what it would get wrong.
- **move** — the content leaves `CLAUDE.md` for a named file; where that file already says
  it, no edit is needed there and the item says so.
- **rewrite** — it stays, reworded; the proposed sentence is written out.
- **retire** — it goes, and nothing takes its place. *Used nowhere in this proposal.*

Where the audit is unsure the verdict is **keep** with the doubt stated. There is no
*maybe*.

**The byte column is UTF-8 bytes on disk, including the line's own CRLF** — `CLAUDE.md`
is CRLF like the rest of the tree. The 282 units sum to exactly **97,343 B**, the file's
size on disk, so the arithmetic at the foot reconciles against a measurement and not
against a string in memory. (Plan-queue's watch series measured **95,471 B** at
2026-08-27 01:05; the file has gained 1,872 B since, from batch N's own commits.)

**Five standing grounds**, so that 235 keeps do not each restate the same sentence:

- **G1** — a glossary entry that is a name, a one-line job and pointers: a session without
  it uses a different name, or opens the wrong file (rule 1; admission question 4).
- **G2** — an **unguarded** post-mortem: no named automated guard catches this mistake, so
  the eviction rule does not reach it and the inversion forbids retiring it for quiet
  (rule 4).
- **G3** — a negative constraint that already names its permitted alternative (rule 2).
- **G4** — a structural label carrying no claim; removing it merges two groups (rule 1).
- **G5** — a guarded gotcha already reduced to the failure and its guard, inside the
  400-character cap `checkClaudeMd` holds (rule 4; Q736 satisfied).

---

## Preamble (2 items, 498 B)

**1.** «A group drafting engine: patches race, blind pairwise judgments rank them» · 230 B · **keep**
Rule 1. The precedence sentence — *when spec and code disagree, the spec wins until Ed
amends it* — is the one rule in the file a session breaks by default, by fixing the spec
to match the code.

**2.** «Design reasoning — why a thing is the way it is, what it replaced» · 229 B · **keep**
Rule 1. It is the admission rule's first sentence in miniature and names the destination
three of the four questions point at.

## Documents (14 items, 6,040 B)

**3.** «- `SPEC.md` — the mechanism spec, and the single source of truth» · 541 B · **rewrite**
Rule 3 (history narration). *Since spec pass 1 (v0.65, 2026-08-22) §9 is tables and
numbered rules* records when the file took its present shape; a session reads the shape
off the file. What bites is the amend rule and that `spec-check` is red at the push.
Proposed: ``- `SPEC.md` — the mechanism spec, and the single source of truth. **Amend only with Ed's sign-off; bump the version.** §9 is tables and numbered rules, each pointing at its reasons as `→ why: R-nnn`. `npm run spec-check` asserts §9.7.1 and §9.7.2 against the code, so drift is red at the push.``

**4.** «- `design/SPEC-REASONING.md` — the reasoning behind SPEC.md §9» · 283 B · **keep**
Rule 1. *Not loaded per session* is operative — it tells a session the file exists and
that it must open it deliberately.

**5.** «- `SURFACE.md` — **what the surface tells a member, and what a control does**» · 685 B · **rewrite**
Rule 3. The *Spec pass 2 (2026-08-22) lifted the rest of the surface grammar* clause is a
changelog entry; the sections it names are findable in SURFACE's own table of contents.
Proposed: ``- `SURFACE.md` — **what the surface tells a member, and what a control does**: the event matrix (event × audience × channel × ask × close × persistence), the rules C1–C16 over it, the exceptions, the page-key ↔ setting map, the marks and the rail (§6), the wallets (§7), the founding order and the band (§8), the card kinds and the composer (§9). `spec-check` asserts its tables against the page's own maps.``

**6.** «- `design/spec-pass/` — the pass archive» · 242 B · **keep**
Rule 1. It says when a file in that directory may be deleted, which nothing else does —
this proposal is governed by it.

**7.** «- `QUESTIONS.md` — open and deferred items only» · 393 B · **keep**
Rule 1, and the strongest keep in the section: *never renumber or reuse numbers*, and
*draw in-chat numbers from this sequence*, are rules a session breaks silently and
expensively (two sessions took 482 for the same question, Conventions).

**8.** «- `PRODUCTION.md` — the road to docs.vote» · 247 B · **rewrite**
Rule 3 (tour + history). The contents list is a tour of a file's own headings, and
*Supersedes `PLAN.md` (deleted 2026-08-20)* narrates a deletion git holds.
Proposed: ``- `PRODUCTION.md` — the road to docs.vote: the staged rollout and the security-defect list. A working document; read it before proposing anything about hosting, data or go-live.``

**9.** «- `design/MOBILE.md` — **docs.vote on a phone**» · 599 B · **rewrite**
Rule 3 (tour + aspirational state). Two thirds of the bullet is the plan's own contents,
including decisions answered inside it; a session that is building mobile opens the file.
Proposed: ``- `design/MOBILE.md` — **docs.vote on a phone**: the responsive plan, its walk, and the PWA · push · offline stage, all decided by Ed 2026-08-23 and **not yet built**. Read it before touching layout for narrow; PRODUCTION.md stages 17–18 point at it.``

**10.** «- `design/DECISIONS.md` — the reasoning behind everything in the glossary below» · 370 B · **keep**
Rule 1. *Read it before re-proposing something* is the sentence that stops a session
re-litigating a settled decision, and this pass used it exactly that way.

**11.** «- `design/*.html` — the mockup series (session-view, setup, race-card)» · 1,169 B · **rewrite**
Rule 3, and the largest single line in the section. Mixed: the **load order** is a
constraint a session can break and the file cannot show; the shared-file **inventory** —
what setup.js holds, what session.js holds — is a tour of five files' contents, and
*Since stage 8 (2026-08-21)* is history. What must survive is which file a new helper
belongs in, which is one clause, not a paragraph.
Proposed: ``- `design/*.html` — the mockup series, one continuous fictional world (the Hollow Oak Club charter). **There is one page**, `design/session-view.html`; the others redirect. Shared: `system.css` (all surfaces), `cards.js` (the card grammar), `setup.css`/`setup.js` (setup only), `session.js` (the charter column, rail, composer, wallets), `fixture-session.js` (the fixture). **A new helper belongs in the shared file its callers share, never copied into a surface.** Load order: `constitution.js` → `cards.js` → `setup.js` → `session.js` → inline.``

**12.** «- **Every surface is the session-view.** Setup, the founding and a live session» · 497 B · **move**
Rule 1 and *a rule in two places*. This is not a document; it is a surface rule, and
**SURFACE §1 C1 already states it in the same words** — *Whatever the document wants from
you goes in the rail, and everything that wants something is a card*. Destination needs no
edit. The trailing sentence about the two deleted notes files is history git holds.
What a session loses: nothing it cannot get from C1, which `spec-check` already asserts
against the page.

**13.** «- `packages/sim-harness/REPORT-deferred-evidence.md` — findings from the» · 147 B · **keep**
Rule 1, with the doubt stated: a session doing evidence work would otherwise re-run
studies that have already been run. It is one line and the cheapest form of that warning.

**14.** «- `design/STYLE.md` — the surface-copy checklist» · 362 B · **rewrite**
Rule 3. *Since the eleventh pass (2026-08-23) the log has a non-chronological entry* is
an audit-log fact belonging to the audit log.
Proposed: ``- `design/STYLE.md` — the surface-copy checklist (vocabulary, numbers, person, titles, bodies, mail) and the audit log. **Every string a member can read passes it; code comments are exempt.**``

**15.** «- `REVIEW-creation-session.md` — the 2026-08-18 end-to-end walk» · 237 B · **keep**
Rule 4's shape applied to a document: the thing it guards — **Q335, open at HEAD**
(`QUESTIONS.md:152`) — has not landed, and the bullet says *Keep until that lands*, which
is the retirement condition written down in advance. Verified, not assumed.

**16.** «- `README.md` — the public repo's front door» · 250 B · **keep**
Rule 1. *It goes stale silently — check it whenever one of those changes* is an obligation
nothing else states and no checker holds.

## V1 product decisions (6 items, 1,203 B)

**17.** «- Target context: constitutional conventions for Newspeak House cohorts» · 233 B · **keep**
Rule 1. It settles which way to trade data-efficiency against throughput, which is a
choice a session makes wrongly by default (big-system instincts).

**18.** «- Hosted multi-tenant web service; magic-link auth against roster emails» · 180 B · **keep**
Rule 1. *No password* is the constraint; a session that lacked it would add one.

**19.** «- Documents are Markdown, rendered as rich text» · 130 B · **keep**
Rule 1. It rules out a rich-text model as the source of truth.

**20.** «- TypeScript end-to-end; engine-core is a pure, dependency-free library» · 115 B · **keep**
Rule 1, and the highest-value line in the section: a session adding a dependency to
engine-core breaks the browser bundle and finds out much later.

**21.** «- Sim personas are LLM-powered on a cheap model» · 173 B · **keep**
Rule 1. *No sim backdoor* is a prohibition naming its alternative (the participant API).

**22.** «- UI north star: **suggestion-mode with escalation**» · 343 B · **move**
Rule 3 (aspirational state) — with the doubt stated below, and listed under *could not
decide*. It describes an intent rather than a rule a session can break, and the surface it
describes is now built and owned by SURFACE §6 and §9. Destination `design/DECISIONS.md`,
which would need the paragraph added. **Against**: a north star is exactly the thing that
shapes a *new* decision, and no checker will ever catch its absence. See item C1 below.

## The two kinds of decision (12 items, 5,526 B)

This section is the audit's largest single finding, so it is worth stating once before the
items. **SPEC §9.6 and §9.6a state most of it in the same words**, and the admission rule's
first question already sends a rule to SPEC and keeps *a § pointer*. Verified line by line:
`SPEC.md:249` carries the test verbatim; `SPEC.md:255` the motion routes; `SPEC.md:257`
the eras, membership-begins-at-first-arrival, and the acknowledgement rule including *had
already arrived when it was set*. `SURFACE.md:16` (C8) and `SURFACE.md:35` (E5) carry the
surface half. The cost of every move here is the same and is stated once: **SPEC.md is not
loaded per session, so a session must open it.** That is the trade the admission rule
already makes everywhere else in the file. It is item C7 under *could not decide*.

**23.** «**A constitutional decision is one that would make past decisions mean something different.**» · 373 B · **move**
Rule 1 + *a rule in two places*. `SPEC.md:249` (§9.6) opens with the same sentence and the
list follows it there. Destination needs no edit. Proposed residual, shared with item 26
(≈180 B): ``**The two kinds of decision** are SPEC §9.6 (the test, and which settings fall which side) and §9.6a (the eras). What is here is only what the surface does with them.``

**24.** «The line can fall **inside** one setting: the window is one question» · 270 B · **keep**
Rule 1. *The route belongs to what a motion changes, not to what card it sits on* (Q329)
is the one part of the test a session gets wrong by reading the card list, and SPEC states
it only obliquely.

**25.** «**The membership is a fact, not a setting**» · 560 B · **rewrite**
Rule 1 keeps the headline; rule 3 and *a rule in two places* take the price list, which
`SPEC.md:346` (§9.7½) states in full, glyph for glyph.
Proposed: ``**The membership is a fact, not a setting** (Ed, 2026-08-26, entry 94): who is a member is the list under *Members*, not a value anybody sets. 🪪 prices every route in, 🤝 is only whether strangers may apply, 🥾 prices the way out — SPEC §9.7½. **✒️ means any unilateral act; the Founder only starts with it.**``

**26.** «A `motion` is the act of proposing a change to any setting» · 539 B · **move**
Rule 1 + *a rule in two places*. `SPEC.md:255` states both routes, the one-refusal rule and
the ground-shift rule, and the bullet already ends by pointing at it. Destination needs no
edit; residual folded into item 23's.

**27.** «**Five rules that follow:**» · 29 B · **keep**
G4.

**28.** «1. **The test is time-indexed**» · 260 B · **move**
Rule 1 + *a rule in two places*. `SPEC.md:257` (§9.6a) opens *Before the start nothing is
amended — only set* and gives the reason. Destination needs no edit; covered by item 23's
residual pointer.

**29.** «2. **Membership begins at first arrival.**» · 359 B · **move**
Rule 1 + *a rule in two places*. `SPEC.md:257`: *Membership begins at first arrival: an
invitee is listed as invited and counts toward nothing.* The ground-shift half is
`SURFACE.md:50` (E20). Destination needs no edit.

**30.** «3. **Delegate the decision, not the field** (Q341).» · 691 B · **rewrite**
Rule 1 keeps the principle — it is the one line that stops a session collecting a whole
setting where the room decides only a scalar. Rule 3 takes the consequences: the two
threshold cards are SURFACE §8's `ORDER`, and the quorum floor formula is SPEC §4.2.
Proposed: ``3. **Delegate the decision, not the field** (Q341). A delegated question collects exactly the binding scalar; the machinery it rides on — the ramp's shape and start, quorum's form — is pacing, stays with the founder, and is **ordinary by the test**. SPEC §4.2, SURFACE §8.``

**31.** «4. **Constitutional settings default to the members, ordinary ones to the founder**» · 1,104 B · **rewrite**
The heaviest line in the section, and it is three things at once: a **retired rule** stated
in full before being retired (rule 3 — history narration), a **post-mortem** of the day the
retirement was half-applied (a gotcha, in the wrong section), and the **rule that now
stands**. Only the third changes what a session does. The post-mortem's destination is
*Gotchas* — it is a real one, and `settled()` counting a members-held setting as settled is
exactly the shape of mistake that section owns.
Proposed: ``4. **Nothing arrives delegated** (Ed's no-defaults instruction, SPEC §9.0a v0.63, closing Q511), because a default holder states an answer the founder has not given. Every setting is born convenor-held, both powers intact, its question **shut** — and **delegation is the act that opens a blind question**. **A holder radio reports an act, never a default**: delegated reads *roster*, held-and-set *founder*, held-and-unset blank; `holder === 'convenor'` no longer tells *kept* from *untouched*, so the page must not render the two alike.``

**32.** «5. **The opening question is the amendment question**» · 128 B · **keep**
Rule 1. It is why nothing on the surface has an *amend* object, which a session designing
one would not otherwise know.

**33.** «**The tab you click does not move.** A closed pile takes margin **0**» · 418 B · **move**
Rule 1 — **within the file**, to *Gotchas · Design system*. It is a post-mortem with a
measurement in it (*verify 0px in both axes after any change here*), sitting in a section
about governance because its headline sentence sounds like a principle. The headline is
already SURFACE C1; the body is the gotcha. **Its bytes stay in the file**; the item is a
proposal about where they sit.

**34.** «**Two rules the constitution band carries.**» · 747 B · **move**
Rule 1 + *a rule in two places*, twice over. First half: `SURFACE.md:16` (C8) — *A decision
you had no say in is owed an OK; reading is not enough. Nothing is owed before the start;
the lapsed are owed it too* — and `SURFACE.md:35` (E5) carries **and arrived when it was
set**, with `SPEC.md:222` and `:257` behind them. Second half (ordinary settings enter no
rail) is E5's neighbour rows. **The third clause, *the headings are the people*, is stated
nowhere else** — grep finds it in no other document — so that clause alone needs SURFACE §8
to gain a line before this moves. Residual ≈ 120 B, or none if SURFACE takes the clause.

## Names (10 items, 1,561 B)

Rule 2's own section: nine of the ten are already negative constraints naming their
alternative. Only one fails.

**35.** «- **founder** — whoever creates and administers a document.» · 171 B · **keep**
G3 — *Never "admin"*, alternative named in the entry's own first word.

**36.** «- **member** — anybody on the roster; the surface says **membership**» · 98 B · **keep**
G3, and the surface/code split is the thing a session gets wrong.

**37.** «- **clerk** — a founder who is not a member.» · 114 B · **keep**
G1.

**38.** «- **Observers are not members**» · 271 B · **keep**
G3 — the prohibition names 🌍 as what settles readership instead.

**39.** «- **approval threshold**, never "the bar"» · 134 B · **keep**
G3, and *it is a confidence, not a vote share* is a claim a session restates wrongly in
copy every time it is absent.

**40.** «- **proposal rate**, never "economy" or "tokens".» · 51 B · **keep**
G3.

**41.** «- **participant** is the engine's word» · 132 B · **rewrite**
Rule 2 — **the one prohibition in the file's most disciplined section that names no
permitted alternative.** *It must never appear in anything a member reads* leaves the
session to invent the surface word, and the surface has two, for two different things.
Proposed: ``- **participant** is the engine's word for whatever speaks the `participant-api`; **never in anything a member reads — the surface says *member* for a person and *the room* for the set.**``

**42.** «- **"ordinary" never appears on the surface**» · 279 B · **keep**
G3 — the glyph pair is the named alternative.

**43.** «- **"ceremony" never appears on the surface.**» · 144 B · **keep**
G3 — *what is left is what happens* is the alternative, written out.

**44.** «- **`draft` already means a candidate patch**» · 153 B · **keep**
G3 — *document* or *charter* named.

## Glossary — named parts (145 items, 41,669 B)

The section's own test, from the plan: **an entry earns its place if a session that lacked
it would use a different name, or look in the wrong file.** By the inversion, an entry
whose `[file]` or `[symbol]` has not appeared in a recent diff is *not* a candidate on that
ground — that is recency. Nine items below are not keeps; the rest are G1, and each names
what it specifically pins.

**45.** «Use these names in all discussion, commits, and code.» · 89 B · **keep**
Rule 1. It is the instruction the whole section is; without it the section is a reference
nobody is obliged to use.

**46.** «**An entry is a name, a one-line job, and pointers — nothing else.**» · 492 B · **rewrite**
*A rule in two places*, and both are in this file: `## What goes in this file` states the
entry rule (Q737) and the four homes at the foot, and `spec-check` enforces the shape. This
paragraph restates all of it 250 lines earlier.
Proposed: ``**An entry is a name, a one-line job, and pointers — nothing else**, at any depth: `[file]` a path, `[symbol]` a name in the source, `[concept]` an idea or a planned part. Why, and where the other three kinds go: *What goes in this file*, below. `npm run spec-check` holds the shape.``

**47.** «**Retired names**, kept here so a lookup lands» · 520 B · **keep**
Rule 1, by the entry's own argument — a session searching for `setup-piles` finds nothing
in the tree and would otherwise re-invent the name. The trailing sentence about the two
deleted notes files is the same service for two paths.

**48.** «**Engine (mechanism, no UI):**» · 32 B · **keep** — G4.

**49.** «- `engine-core` [symbol] — the session state machine» · 335 B · **keep** — G1; the SPEC pointers are the load-bearing half.
**50.** «- `adoption-threshold` [symbol] — the confidence bar» · 243 B · **keep** — G1, plus *always use this name* (rule 2, alternative named).
**51.** «- `patch-engine` [concept] — text machinery» · 101 B · **keep** — G1; names the machinery a session would otherwise call *diffing*.
**52.** «- `overlap-gates` [concept] — the three-gate classifier» · 150 B · **keep** — G1; the three gates are the vocabulary SPEC §4 uses.
**53.** «- `ranking-model` [concept] — Bradley–Terry preference model» · 171 B · **keep** — G1.
**54.** «- `router` [concept] — feed ordering, hot set» · 138 B · **keep** — G1; *router* is otherwise read as HTTP routing.
**55.** «- `event-log` [concept] — append-only hash-chained log» · 104 B · **keep** — G1.
**56.** «- `dedup-gate` [concept] — submission-time duplicate check» · 147 B · **keep** — G1; the symbol exists (`packages/engine-core/src/dedup-gate.ts`).
**57.** «- `race-labeler` [symbol] — advisory naming and typing of disputes» · 235 B · **keep** — G1; *labels never enter the event log and gate nothing* is a prohibition a session breaks by making the label useful.
**58.** «- `document-modes` [concept] — two independent settings fixed at creation» · 355 B · **keep** — G1.
**59.** «- `founding-ceremony` [concept] — the blind collection before any drafting» · 313 B · **keep** — G1; *a consent rule rather than a vote* is why the bootstrap is shut, and a session redesigning it needs the sentence.
**60.** «- `sign-out` [concept] — a member declaring they are done» · 180 B · **keep** — G1; *plain silence is never sign-out* is a prohibition.
**61.** «- `freeze` [symbol] — what happens when active plus holding falls below quorum» · 237 B · **keep** — G1.
**62.** «- `coherence-auditor` [concept] — machine drafter patrolling document drift» · 243 B · **keep** — G1; **Not a member** is the constraint, and it is the whole of 🤖's mechanism half.

**63.** «**Design system** (session-view's, tokenised» · 106 B · **keep** — G4, and the parenthesis is a rule (adopt, do not invent).

**64.** «- `cards.js` [file] — **the decision-card grammar, one implementation**» · 259 B · **keep** — G1; *one implementation* is the constraint.
**65.** «- `wash` [symbol] — the lifecycle colour on anything that carries one» · 284 B · **keep** — G1; the keying rule is what makes a clause and its card share a wash.
**66.** «- `room-pulse` [concept] — one grey dot in the topbar» · 297 B · **keep** — G1; *content-free* is what keeps it inside SPEC §3.5.
**67.** «- `me` [symbol] — the user avatar at the right of the topbar» · 245 B · **keep** — G1; the §9.0c/§3.5a split is the mistake it prevents.
**68.** «- `lifecycle palette` [concept] — three hues held as raw RGB channels» · 358 B · **keep** — G1; the two rules are SURFACE C7's local form.
**69.** «- `--primary` [symbol] — the one accent» · 150 B · **keep** — G1; *green means decided and only that* is a prohibition.
**70.** «- `type scale` [concept]» · 318 B · **keep** — G1; *a glyph size is the one allowed literal* is the exception a session needs.
**71.** «- `spacing scale` [concept]» · 276 B · **keep** — G1, and it already points at the gotcha rather than restating it.
**72.** «- `lanepick` [symbol] — the session-view's own radio» · 289 B · **rewrite**
*A reason in two places*: the last two sentences — *no box round each option, which would
compete with the radio* — are the Gotchas bullet at `CLAUDE.md:229` almost word for word.
The entry should point, as `spacing scale` already does.
Proposed: ``- `lanepick` [symbol] — the session-view's own radio, and what a settings choice is drawn with: one of these, or none of them yet. **No box round each option** — Gotchas below.``

**73.** «**Product (UI and founding):**» · 32 B · **keep** — G4.

**74.** «- `session-view.html` [file] — **the one surface**» · 379 B · **keep** — G1; the four SURFACE pointers are what stop a session inventing a second grammar.
**75.** «- `remoteCS` [symbol] — the live path» · 377 B · **keep** — G1; *never under the open card* is the constraint the 4s poll breaks.
**76.** «- `blocksOf` [symbol] — **one block is one engine line**» · 338 B · **keep** — G1; the empty-document case is the one a session gets wrong.
**77.** «- `provisional layer` [concept]» · 278 B · **keep** — G1; *the `S` fields are exactly that and nothing more* is the prohibition, and the file's own gotchas show what breaks without it.
**78.** «- `layoutQueue` [symbol] — one rail, one wire layer, one TOC, one open card» · 343 B · **keep** — G1.
**79.** «- `standsOf` [symbol] — what stands on a delegated setting» · 255 B · **keep** — G1; *never the founder's field* is the prohibition.
**80.** «- `dev-dropdown` [concept] — who you are, top-left under the topbar» · 377 B · **rewrite**
Rule 1 keeps the name and *deliberately off the design system*. The ⏩ sentence states a
reason the Gotchas bullet at `CLAUDE.md:245` already argues at length; the entry should
point at it rather than carry a second copy of the conclusion.
Proposed: ``- `dev-dropdown` [concept] — who you are, top-left under the topbar, deliberately off the design system: a stagehand, not a member of the cast. Per-user state lives on the roster rows. Beside it **⏩ settle the founding** completes the founding in one press — Gotchas below.``

**81.** «- `setup-probe.js` [file] — the contamination guard» · 212 B · **rewrite**
Rule 3. *42 steps* is a measurement of the script, taken by hand and never re-taken; the
script counts its own steps every run. The reference tag is the part that bites.
Proposed: ``- `setup-probe.js` [file] — the contamination guard: `design/tools/setup-probe.js` against `design/reference/session-view.html` (tag `refs-founded-2026-08-22`); **no allowances after a fresh freeze.**``

**82.** «- `setup-queue` [concept] — the right-hand rail during the founding» · 318 B · **keep** — G1; it names its walk and its residual question.
**83.** «- `birth-pass` [symbol] — **what is born arrives, it does not appear.**» · 316 B · **keep** — G1; the keying rule is the implementation constraint.
**84.** «- `card-morph` [concept]» · 332 B · **keep** — G1; the 0.0px promise is the thing a change breaks.
**85.** «- `dead-click-nudge` [concept]» · 362 B · **keep** — G1; *dead is structural rather than a list of `data-*` hooks that would rot* is a prohibition with its alternative.
**86.** «- `commit-row grammar` [concept] — discard, commit, and OK» · 262 B · **keep** — G1; it points rather than restating, which is the entry rule working.
**87.** «- `setup-band` [concept] — **the constitution, at the top of the document.**» · 360 B · **keep** — G1; *in the document, never over it* is the constraint.
**88.** «- `gate-cards` [concept] — 💡 **Proposing** and ⚖️ **Judging**» · 306 B · **keep** — G1; *not settings, since nobody decided them* is what stops a session adding them to the catalogue.
**89.** «- `motion-controls` [concept]» · 371 B · **keep** — G1; *never a free-text lane* and *filters by value, never by label text* are both prohibitions with alternatives.
**90.** «- `reserved` [concept] — the founder» · 391 B · **keep** — G1; the doors carrying their own pair is the part a session forgets.
**91.** «- `founderDirect` [symbol]» · 294 B · **keep** — G1; it names its guard, `npm run powers-walk`.
**92.** «- `governance-tabs` [concept]» · 378 B · **keep** — G1; *delegation is the state of holding neither power* is the definition everything else keys on.
**93.** «- `task` [concept] — the general term» · 287 B · **keep** — G1 + rule 2: *"queue-card" never appears in anything a member reads*, alternative named.
**94.** «- `admissions-card` [concept] — 🪪 **Admissions**» · 299 B · **keep**, with the doubt stated — the three-rung price list is SPEC §9.7½'s, but the entry is one line and the glyph→name binding is the part the surface needs.
**95.** «- `applications-card` [concept] — 🤝 **Applications**» · 219 B · **keep** — G1.
**96.** «- `door-cards` [concept] — ✉️ and ❌: **doors, not decisions**» · 435 B · **keep** — G1; *doors, not decisions* is the classification a session gets wrong, and it points at E31–E33 rather than restating them.
**97.** «- `applicants` [concept] — a subsection of Membership» · 386 B · **keep** — G1; *member emails are unique* and *an empty application is a real application* are both invariants.
**98.** «- `lapse` [symbol] — 💤» · 274 B · **keep** — G1 + rule 2 (*the surface says "inactive", never "quiet"*).
**99.** «- `mail-modal` [concept] — the verification email drawn as a modal» · 341 B · **keep** — G1; *deliberately off the design system* stops a session tokenising it.
**100.** «- `alpha-flag` [concept]» · 294 B · **keep** — G1; `pointer-events: none` and the interstitial exception are both constraints.
**101.** «- `constitution-section` [concept] — the document» · 393 B · **keep** — G1.
**102.** «- `sectoggle` [symbol] — the fold triangle ▸» · 375 B · **keep** — G1; *a button inside contenteditable would become harvested text* is the reason the overlay rail exists and a session would undo it.
**103.** «- `linkify` [symbol] — the constitution» · 150 B · **keep** — G1; **applied after escaping** is an ordering constraint with an XSS behind it.
**104.** «- `answer-bodies` [concept] — the consent controls and per-question copy» · 355 B · **keep** — G1; *only committed answers count anywhere* is the invariant.
**105.** «- `consent-slider` [concept] — the control for stating a minimum» · 276 B · **keep** — G1; *nothing preselected* is the rule two shipped defects came from.
**106.** «- `privacy-ladder` [concept]» · 245 B · **keep** — G1; *dimmed rather than hidden* is the constraint.
**107.** «- `distribution-strip` [concept]» · 101 B · **keep** — G1; *without names* is the whole of it.
**108.** «- `watch-half` [concept]» · 317 B · **keep** — G1; *how many have answered and nothing more* is SPEC §3.5's blindness at one site.
**109.** «- `identity-cards` [concept] — ✋» · 341 B · **keep** — G1; **Not authorship** is the confusion it exists to prevent.
**110.** «- `pictureBody` [symbol] — **a picture is an emoji, an uploaded image, or none**» · 372 B · **keep** — G1.
**111.** «- `emoji-data.js` [file] — **the picker is Unicode» · 379 B · **rewrite**
Rule 3. *1906 fully-qualified glyphs in nine categories* is a count of a generated file,
and the generator re-derives it on every run; a new `emoji-test.txt` makes the line wrong
with nothing to catch it.
Proposed: ``- `emoji-data.js` [file] — **the picker is Unicode's own list** (Q732), generated from the committed `design/emoji-test.txt` by `npm run emoji-data`. **Only the open category is drawn**, and the grid refreshes in place (`wireEmojiPicker`). `FACE_EMOJI` survives as the exemption list and nothing else.``

**112.** «- `emojiface` [symbol] — **an emoji is a glyph, not a disc**» · 351 B · **keep** — G1; it points at its own gotcha rather than repeating it.
**113.** «- `FACE_TONES` [symbol] — six ✋ swatches» · 241 B · **keep** — G1; *after the first code point* is the ZWJ constraint, and **never stored** the prohibition.
**114.** «- `RESERVED_EMOJI` [symbol]» · 362 B · **keep** — G1; *both refusals met in the grid* is the rule a session implements at submit instead.
**115.** «- `clerk` [concept] — a founder who is not a drafter.» · 316 B · **keep** — G1; the four *nothings* are what a clerk seat gets wrong.
**116.** «- `proposal-rate` [concept] — the ⏱️ card» · 351 B · **keep** — G1 + rule 2; **the drip runs on real minutes everywhere** is the constraint.
**117.** «- `wallets` [concept] — **every power is an object you hold» · 365 B · **keep** — G1; the five socket names are the vocabulary, the rules are pointed at.
**118.** «- `🍾 Begin` [concept] — **the founder» · 405 B · **keep** — G1; `begin(t)` being the only emitter of `constituted` is a single-writer invariant.
**119.** «- `the close` [concept] — **the clock closes the document; nobody presses anything**» · 360 B · **keep** — G1; the prohibition is the design, and a session adds a close button without it.
**120.** «- `session-clock` [concept] — one plain line in the topbar centre» · 342 B · **keep** — G1; **Cold at every distance** is the palette rule at its hardest site.
**121.** «- `topbar` [concept] — **the document · the room · you**» · 302 B · **keep** — G1; *the approval threshold is not topbar material* is a prohibition with its reason.
**122.** «- `room-faces` [concept] — the row of avatars in the topbar middle» · 216 B · **keep** — G1.
**123.** «- `closing-card` [concept] — 🥂» · 390 B · **keep** — G1; **OK on it signs the document** is a consequence nothing on the card says.
**124.** «- `closedBlocks` [symbol] — **the closed page**» · 388 B · **keep** — G1.
**125.** «- `Text` [concept] — **there is no "starting text"**» · 408 B · **keep** — G1; the name refusal is rule 2 with its alternative.
**126.** «- `the four verbs` [concept]» · 319 B · **keep** — G1; the ladder is the reason the wallets stop at four (Gotchas).
**127.** «- `quill line` [concept]» · 369 B · **keep** — G1; *the line falls at the save* is the boundary two surfaces key on.
**128.** «[concept] — **there is no login screen**» · 375 B · **keep** — G1; the four page-half symbols are where a session would otherwise look in the wrong file.
**129.** «- `hydrateFromModule` [symbol] — the door has no provisional layer» · 306 B · **keep** — G1; **a seat that dies mid-session becomes the door** is the case nobody thinks of.
**130.** «- `session-view` [concept] — the default member surface» · 385 B · **keep** — G1; **Nothing underneath the view** is the prohibition.
**131.** «- `contents-rail` [concept] — left» · 141 B · **keep** — G1.
**132.** «- `needs-you-queue` [concept] — right» · 186 B · **keep** — G1; *where an entry sits is never a claim about importance* is the rule ranking breaks.
**133.** «- `lifecycle mark` [concept] — one glyph per entry» · 361 B · **keep** — G1; **Code keys on the mark kind, never the character** is a prohibition with its alternative and four named maps.
**134.** «- `yours` [concept] — a proposal of your own» · 202 B · **keep** — G1.
**135.** «- `salience-diagonal` [concept]» · 251 B · **keep** — G1; **served, never offered** is SPEC §8.3a at its one site.
**136.** «- `suggestion-anchor` [concept] — **the prose carries no highlight**» · 375 B · **keep** — G1; *the geometry stays* is exactly the thing a tidy-up removes.
**137.** «- `clause-tab` [concept] — the object in the `chip-gutter`» · 292 B · **keep** — G1; *on `padding-left` as well as `width`* is why the glyph does not move.
**138.** «- `tab-stack` [concept] — the pile a clause's tabs make» · 133 B · **keep** — G1.
**139.** «- `decision card` [concept] — **the clause, opened.**» · 346 B · **keep** — G1; *it replaces its paragraph* is the whole gesture.
**140.** «- `clause-head` [concept] — the clause at document size» · 318 B · **keep** — G1; *the same box as a `.anch` paragraph* is the 0px promise's mechanism.
**141.** «- `proposal-block` [concept] — one candidate» · 259 B · **keep** — G1.
**142.** «- `commit row` [concept] — Indifferent at the left» · 260 B · **keep** — G1; it points at SURFACE §9.1 for the rules.
**143.** «- `deadlock-card` [concept] — what a ⚔️ race opens into» · 233 B · **keep** — G1; **no standings, and therefore no lock** is SPEC §3.5 here.
**144.** «- `sealed record` [concept] — every entry opens one» · 292 B · **keep** — G1.
**145.** «- `evidence-meter` [concept] — closeness-to-resolution as a magnitude, never a direction» · 289 B · **keep** — G1; *never a direction* is the blindness rule.
**146.** «- `queue-wire` [concept] — the open judgment» · 386 B · **keep** — G1; **a patch is joined at its cards, not in the rail** is a prohibition with its alternative.
**147.** «- `section-toggle` [concept] — the fold triangle» · 110 B · **keep** — G1, with the doubt stated: it and `sectoggle` (item 102) are the same triangle under two names, one per surface, which is what the entry is for.
**148.** «- `race-card` [concept] — the judging surface» · 316 B · **rewrite**
Rule 2 — a prohibition naming no permitted alternative. **`design/race-card.html` is stale
and must not be copied from** leaves a session with a judging surface to build and nowhere
to copy it from; the answer (`session-view.html`'s card grammar, `cards.js`) is in the file
but not in the sentence that forbids the wrong one.
Proposed: ``- `race-card` [concept] — the judging surface: contested text, two candidates, A/B/indifferent/propose-C, and in the UI the session-view's escalation state. **Never copy from `design/race-card.html`** — it predates the whole current card grammar; **take the shape from `cards.js` and the `decision card` entry instead.** Q70 asks whether the file should exist at all.``

**149.** «- `composer` [concept] — **not a surface**» · 244 B · **keep** — G1; *you compose by editing the charter* is the design a session would reverse.
**150.** «- `always-on-typing` [concept]» · 308 B · **keep** — G1; **`contenteditable` is a hint; the refusal is the lock** is the security-shaped constraint.
**151.** «- `editing-card` [concept] — the same `decision card` shape» · 355 B · **keep** — G1; the placeholder-out-of-flow rule is a caret bug written down.
**152.** «- `sign-control` [symbol]» · 332 B · **keep** — G1; the newest entry in the file (R-050) and the one a session is most likely to look for.
**153.** «- `lane-controls` [concept]» · 338 B · **keep** — G1; **a candidate's text *is* markdown** is the invariant the rich mode must preserve.
**154.** «- `draft-site` [concept] — a run of adjacent blocks» · 225 B · **keep** — G1; *one draft at a time, because there is one caret* is the reason a session would otherwise remove.
**155.** «- `propose-edit` [concept] — ✏️ on either lane» · 177 B · **keep** — G1.
**156.** «- `proposal-row` [concept] — 🗑️ at the very left throughout» · 368 B · **keep** — G1; *🗑️ is an ordinary outline button, not a red one; Propose is blue, not green* is two prohibitions with their alternatives.
**157.** «- `the-briefing` [concept] — **not yet rebuilt**» · 314 B · **keep**, and listed under *could not decide* (C2). Rule 3 would make an unbuilt part with no plan behind it an aspirational-state candidate; the audit cannot see plan-queue's `BACKLOG.md` from the worktree, and the SPEC §3.5 sentence is a real constraint on whoever does build it. *Cannot know* is a keep.
**158.** «- `motion` [concept] — a proposal to change a **setting**» · 401 B · **keep** — G1; the `MotionRoute`/`RaisedRoute` distinction is a type a session gets wrong, and *ordinary adjudication in the page is still a dev seam* is a live caveat.
**159.** «- `assembly-press` [concept] — how a constitutional motion is put» · 334 B · **keep** — G1; *the ring is the meter* is the reduced-motion rule.
**160.** «- `gazette` [concept] — public feed of resolved outcomes» · 104 B · **keep** — G1.
**161.** «- `bounty score` [concept] — resolvable disagreement × salience» · 183 B · **keep** — G1.
**162.** «- `record-builder` [concept] — closing publication» · 275 B · **keep** — G1; *names the office rather than the person* is C10 at the record.
**163.** «- `spectator-api` [concept]» · 189 B · **keep** — G1; backlog-named (Q42), so the aspirational-state rule does not reach it.
**164.** «- `spectator-commentary` [concept]» · 219 B · **keep** — G1; same, and *it sees no private data* is the constraint.

**165.** «**Tooling:**» · 14 B · **keep** — G4.

**166.** «- `phase-ladder` [concept] — **one dev control that walks a real document» · 367 B · **keep** — G1; see item 265, where the Conventions section says it a second time.
**167.** «- `ladder-bar` [concept] — the control, off the design system» · 287 B · **keep** — G1; *a seat is a cookie* is the design a session would replace with page state.
**168.** «- `card-audit` [symbol] — **every decision card on every surface» · 295 B · **rewrite**
Rule 3, **and it is already wrong.** *Six walks, 182 cards: founding · answers · settled ·
outsiders · charter · closed* — `design/tools/card-audit.mjs:52` has **seven**:
`['founding', 'answers', 'delegated', 'settled', 'outsiders', 'charter', 'closed']`. The
list omits `delegated`, so a session reading this line believes a walk that exists does
not. The card count is unverifiable without a run and stale by construction.
Proposed: ``- `card-audit` [symbol] — **every decision card on every surface, opened and measured at once** (`design/tools/card-audit.mjs`, `npm run card-audit`). Its walks are `ALL_WALKS` in the script; `--walk=<name>` runs one. It opens cards and writes JSON, and changes nothing.``

**169.** «- `--baseline` [concept] — the second window size» · 165 B · **keep** — G1; *a geometry finding that moves with the viewport is a layout fact, not a defect* is the discipline the flag exists for.
**170.** «- `copy-check` [symbol] — **every card's strings on every walk, frozen**» · 338 B · **keep** — G1; *red until `npm run copy-freeze`* is the workflow, and this batch used it.
**171.** «- `founding-golden` [symbol]» · 296 B · **keep** — G1; *never at the push (Q625)* is a decision a session would undo by adding the step back to CI.
**172.** «- `assert-server` [symbol] — **which server, and is it your tree?**» · 397 B · **keep** — G1; the four-rung ladder is what a walk's base resolves through, and it changed three days ago.
**173.** «- `probe-coverage` [symbol]» · 385 B · **keep** — G1; *coverage is measured by opening rather than by a selector* is the lesson and the guard in one line.
**174.** «- `seat-matrix.mjs` [file] — **N seats × the epochs» · 411 B · **rewrite**
Rule 3, on two counts. The payload path is stated as a fact — *two snapshots per seat per
step to `design/tools/seat-matrix.json`* — where the script takes `--out` and defaults to
it (`scripts/seat-matrix.mjs:97`), and `.gitignore:11` keeps every such payload out of the
tree, so a session that goes looking for the file finds nothing and cannot tell absence
from failure. The bare trailing `127.` is a backlog-entry number with no label.
Proposed: ``- `seat-matrix.mjs` [file] — **N seats × the epochs, the rail asserted per seat against SURFACE §2's audience column** (`scripts/seat-matrix.mjs`, `npm run seat-matrix`). Three tables — `SEATS`, `STEPS`, `AUDIENCE` (a cell verbatim → a predicate) — and one `RUN` dispatcher. **Its payload is gitignored: pass `--out` and re-run for a baseline rather than looking for one in the tree.** A cell with no rule: exit 3 until `filed`. Entry 127.``

**175.** «- `server` [symbol] — `packages/server` (`@draft/server`)» · 365 B · **keep** — G1; **A push is a deploy** is the highest-stakes sentence in the section.
**176.** «- `Persistence` [symbol] — two stores, one seam» · 366 B · **keep** — G1; *`event` as `text`, never jsonb* is a prohibition with its reason (NUL and lone surrogates).
**177.** «- `replay` [symbol] — one hash-chained JSONL log per document» · 217 B · **keep** — G1; *it holds answers in plaintext, so the data dir is as sensitive as the room* is a security fact nothing else states.
**178.** «- `view` [symbol] — the only member read» · 368 B · **keep** — G1; **a command whitelist injects the authenticated actor; a body never names who acts** is the rule every new command must obey.
**179.** «- `magic-link` [concept] — creation *is* the §9.7a mail» · 155 B · **keep** — G1.
**180.** «- `mail-fold` [concept] — Resend via `RESEND_API_KEY`» · 310 B · **keep** — G1; the reserved-TLD refusal and its deliberate exclusion are both constraints.
**181.** «- `engine-host` [concept] — the engine rides every commit» · 182 B · **keep** — G1.
**182.** «- `dev-outbox` [concept]» · 256 B · **keep** — G1; **in the production artifact the route does not exist at all** is the invariant `build-server.mjs` greps for.
**183.** «- `notifyEmail` [symbol] — the operator hears about every birth» · 326 B · **keep** — G1; **the save must never fail or wait on a mail** is a prohibition with its alternative.
**184.** «- `engine-bridge` [symbol] — `packages/constitution/src/engine-bridge.ts`» · 384 B · **rewrite**
Rule 1, on a fact: **`npm run motions` is not a script.** The root `package.json` defines
no `motions`; it lives in `packages/sim-harness` and runs as `npm run motions -w
@draft/sim-harness`. A session told to run the walk runs nothing and reads npm's error as a
broken tree.
Proposed: ``- `engine-bridge` [symbol] — `packages/constitution/src/engine-bridge.ts`: marries a `ConstitutionSession` to an engine-core `Session`. Text candidates go straight to the engine; set-motions race there and what *stands* flows back by a **standing diff** in `sync(t)`, the ground shift. **Not exported from index.ts**, so the page bundle stays engine-free. Walk: `npm run motions -w @draft/sim-harness`.``

**185.** «- `constitution` [symbol] — **the §9 layer as a real package**» · 387 B · **keep** — G1. The *18-setting catalogue* was checked against `packages/constitution/src/catalogue.ts`'s `SettingId` union and is correct; it is a count of a hand-written union rather than a generated list, so it is the one measurement in the section that does not rot on its own.
**186.** «- `sim-harness` [symbol] — synthetic-participant simulator» · 330 B · **keep** — G1; the `-w @draft/sim-harness` invocation is written out correctly here, which is what item 184 asks for.
**187.** «- `participant-api` [concept] — the blind-discipline surface» · 229 B · **keep** — G1; *humans, sim personas and personal AIs are interchangeable behind it* is the constraint on every new method.
**188.** «- `scripted-persona` [symbol] — deterministic utility-model participants» · 175 B · **keep** — G1.
**189.** «- `welfare-ratio` [concept] — sim metric» · 163 B · **keep** — G1; the formula is the definition, not a tour.

## Gotchas — what bites (64 items, 29,734 B)

**Rule 4 and only rule 4 applies here.** No gotcha below is proposed for retirement, and
none is judged on when it last bit. Seven are proposed for **move** under the eviction rule
(Q736) — each names the automated guard that now catches the mistake and where the
post-mortem goes — and two for **rewrite** where the *rule* they carry is STYLE.md's. The
other 55 are keeps, most of them **G2**: unguarded, and therefore capped by nothing.

Two of the moves are worth reading before the list, because they are the audit's largest.
`journey-walk.mjs:19–28` states in its own header that **the propose hold is now driven for
its full three seconds with a render forced into the middle of it — the case that used to
cancel it in silence**, which is items 197 and 198 exactly. `slug-walk.mjs:1–36` states that
it **fails on the pre-fix page at *the commit is dark on a typed address that is taken***,
which is item 235's failure exactly. Both guards are named in the *neighbouring* bullet
rather than in the bullet they guard, which is why `checkClaudeMd`'s cap has never seen
them: its `GUARD` test reads one bullet at a time.

**190.** «The post-mortems: what broke, why it broke, and the shape of the mistake» · 450 B · **keep**
Rule 1. It is the section's admission rule and the sole-ownership claim; without it a
session files a post-mortem in DECISIONS.md and the two sets drift.

**191.** «**Design system:**» · 20 B · **keep** — G4.

**192.** «- **Open is said by depth, not by outline**» · 341 B · **keep** — G2.
**193.** «- **A settings choice is the session-view's own radio**» · 311 B · **keep** — G2, and this bullet is the *owner* of the reason item 72 asks the `lanepick` entry to stop repeating.
**194.** «- **A hold is released by letting go, and by nothing else**» · 397 B · **keep** — G5 (spec-check asserts the release set; `npm run journey` fails on the pre-fix page).
**195.** «- **A state class is a name two things can answer to**» · 398 B · **keep** — G5 (journey asserts the held button's box).
**196.** «- **Nothing rebuilds under a press**» · 313 B · **keep**
Rule 4. The parent stays: it is the rule the four children are instances of, and the one a
session breaks by adding a render to a gesture. With items 197 and 198 moved it carries
one line each in their place.
**197.** «- The **pen hold captured its button at `pointerdown`**» · 426 B · **move**
Eviction rule (Q736). **Guard: `npm run journey`** — `scripts/journey-walk.mjs:22–25` drives
the hold for its full three seconds *with a render forced into the middle of it*, which is
this exact failure. Destination `design/DECISIONS.md`. Residual line, ≈100 B: ``A poll landing inside a hold detached the button the hold had captured, and the act vanished in silence: the hold belongs to the **open card**, not to one DOM node. Guard: `npm run journey`.``
**198.** «- **Both polls now defer while a hold is in flight**» · 226 B · **move**
Eviction rule, same guard and same destination. Residual, ≈100 B: ``Both polls defer while a hold is in flight (`penHold || SESSION.holding`), the flag being module-level because the propose hold's state is re-created by every render. Guard: `npm run journey`.``
**199.** «- **A completed hold clicks for you, and that click must not look like the user's.**» · 1,171 B · **keep**
The second-largest line in the file, and the audit cannot evict it. `journey` drives every
commit with a real pointer press, but **nothing asserts that a held commit fires once**,
and the birth's own double-send is not walked. *Cannot know* is a keep. If a walk ever
asserts one command per hold, this becomes the single largest eviction in the file.
**200.** «- **A wallet must not depend on its own animation finishing.**» · 402 B · **keep**
G2, and unguarded **by construction**: `journey-walk.mjs:19` says *What it does NOT prove:
anything that depends on an animation completing.* No walk will ever catch this.
**201.** «- **`npm run journey`**» · 389 B · **keep** — G5, and it is the bullet that names the guard the two moves above lean on.
**202.** «- **The card lifecycle lives in `SURFACE.md`**» · 598 B · **move**
*A rule in two places*, and the bullet says so itself — *the card lifecycle lives in
`SURFACE.md`* — then restates C1–C5 and L1–L9 in one line each. `SURFACE.md:9–13` carries
all five verbatim; destination needs no edit. **Against**: *Kept here in one line each
because they bite* records a deliberate decision to duplicate, so this is a veto, not a
correction — see C3. Residual, ≈90 B: ``The card lifecycle — what opens a card, what it focuses, what closes it, what 🗑️ puts back — is **SURFACE C1–C5 and L1–L9**.``
**203.** «- **The open rail entry lifts, it does not jump**» · 334 B · **keep** — G2.

**204.** «**Product (UI and founding):**» · 32 B · **keep** — G4.

**205.** «- **A server serves today's page over whatever engine it booted with**» · 380 B · **keep** — G5 (assert-server, and the failure mode reads as a product bug, which is why the line earns its place even guarded).
**206.** «- **A card the probe never opens can never produce a dead step**» · 301 B · **keep** — G5 (probe-coverage).
**207.** «- **The power clause, the 🛡️ radios, the power option as a proposal block» · 728 B · **rewrite**
*A rule in two places.* The bullet opens by saying the rules **are STYLE.md T6–T9** and then
states them — the vocabulary sentence, the two radio labels, `PW_NOUN`, the `.propblock`
treatment. The last sentence is the actual gotcha and nothing else in the file says it.
Proposed: ``- **The 🛡️ card is a blind spot in the probe**: the setup-probe never opens one with live radios, so its copy has only ever been verified by rendering the labels directly. The copy rules themselves are STYLE.md T6–T9; the head keeps *may refuse* because the clause joins ✒️ and 🛡️ as verb phrases that *has a veto over* cannot be joined into.``
**208.** «- **⏩ keeps 🌍 with the founder**» · 1,130 B · **move**
Admission question 2 — this is **a reason**, not a post-mortem: nothing broke, a tool was
made more useful and the paragraph argues why. Destination `design/DECISIONS.md`, which
needs the paragraph added. Residual, ≈110 B, folded into the `dev-dropdown` entry by item
80: ``⏩ keeps 🌍 with the founder, so a constitutional 🛡️ card and the crown route stay reachable by hand.``
**209.** «- **A change carries a reason, and says who made it** (Q530)» · 391 B · **keep** — G5 (the golden log unedited is the assertion, and the post-mortem is already out).
**210.** «- **A unilateral rule change by the founder is an amendment» · 379 B · **keep** — G5, same shape; **Folded, not emitted** is the invariant.
**211.** «- **A lapsed member is owed an acknowledgement too**» · 1,239 B · **move**
*A rule in two places*, and the largest instance in the section. `SPEC.md:257` (§9.6a):
*owed by every member who had no say and had already arrived when it was set — the lapsed
included, the removed and the never-arrived excluded, and with them anybody who joined
afterwards*. `SURFACE.md:16` (C8), `:35` (E5) and `:90` (Y10) carry the surface half.
Destination needs no edit. Residual, ≈130 B: ``Who is owed an acknowledgement is one question — **were you here when it was set?** — and a grant is different, being addressed to you whenever it arrives. SPEC §9.6a, SURFACE C8/E5/Y10.``
**212.** «- **🍾 has no wallet, and that is where the family stops**» · 696 B · **move**
Admission question 2 — a reason, and an argument against a design nobody built.
Destination `design/DECISIONS.md`. Residual, ≈80 B: ``🍾 has no wallet: beginning is a moment, not a capacity. Its commit wears its own glyph and the cork lands in the document.``
**213.** «- **Surface copy audit rules** are STYLE.md §8» · 433 B · **rewrite**
*A rule in two places*, stated by the bullet itself. T1–T35 live in STYLE.md and
`copy-check` freezes every string they govern.
Proposed: ``- **Every string a member can read passes STYLE.md §8's T1–T35** — `cards.js` included, which the stage-8 audit never scanned. Guard: `npm run copy-check`, red until `npm run copy-freeze`.``
**214.** «- **The prose column invites before it asks** (Q513(c))» · 346 B · **keep** — G2.
**215.** «- **And it stays live after it has asked, until 🍾** (Q819)» · 391 B · **keep** — G5 (founding-walk).
**216.** «- **A blind slider's unset test was `v === null`» · 342 B · **keep** — G5 (slider-walk asserts both are born untouched).
**217.** «- **A drag is a press held down, so `render()` under one kills it**» · 381 B · **keep** — G5 (slider-walk drags to both ends).
**218.** «- **Task titles are Title Case**» · 315 B · **keep**, with the doubt stated: the two power-tab titles are copy STYLE.md owns, and the bullet says the rule is T1–T2. It stays because *a title says what kind of answer it wants* is a naming rule a session applies while writing a card, before it opens STYLE.md.
**219.** «- **A press that reads its own answer from the view it was made against takes two presses**» · 336 B · **keep** — G5 (journey's second seat).
**220.** «- **The page assumed a room bigger than one** (Q835)» · 382 B · **keep** — G5 (spec-check's `checkSoloJudgment`).
**221.** «- **A readout saying *which* and not *why* leaves the founder guessing**» · 405 B · **keep** — G5 (spec-check, journey `--delegate-all`).
**222.** «- **A walk that drives a control the surface reads differently is testing something else**» · 395 B · **keep** — G5 (the walk's own skip).
**223.** «- **And at a bar of exactly 50% the evidence meter read 0 for ever**» · 363 B · **keep** — G5 (a named test file).
**224.** «- **A confidence is bounded by the evidence a room can produce» · 365 B · **keep** — G5 (threshold.test.ts), and *nothing enforces it* is the live caveat.
**225.** «- **One card per decision.**» · 636 B · **keep**, with the doubt stated and listed at C5: it is a **test**, not a post-mortem — *could somebody answer it differently and on its own?* — and it changes what a session does when it proposes a new card, which is why it stays; but its two worked examples are reasoning, and `design/DECISIONS.md` is where reasoning lives.

**226.** «**Lifted out of name entries (2026-08-23):**» · 46 B · **keep** — G4.

**227.** «- **🎩 is settled once the document begins» · 901 B · **keep** — G2, and the general lesson (*a card whose settledness lives only in `S` is a card the live path cannot rebuild*) is the reusable half.
**228.** «- **✋ and 🖼️ are answered, and null is not the answer to» · 388 B · **keep** — G5 (journey asserts the rail).
**229.** «- **An unproposed draft survives a data swap**» · 567 B · **keep** — G2.
**230.** «- **And saving is not discarding either**» · 677 B · **keep** — G2.
**231.** «- **Clicking a rail entry travels to its card.**» · 667 B · **keep** — G2.
**232.** «- **The charter key uses a NUL as its separator**» · 282 B · **keep** — G2, and it carries a live instruction (`grep -a`, and don't "fix" the NULs) that costs a session a wasted hour.
**233.** «- **Your own row clears the paragraph's own tab.**» · 591 B · **keep** — G2; *it has to be padding* is the part a tidy-up reverses.
**234.** «- **A `me`-named helper that finds the founder is a bug factory**» · 873 B · **keep** — G2, and the naming lesson generalises beyond the two helpers it names.
**235.** «- **An address is checked because it is the address, not because it was typed**» · 2,167 B · **move**
**The largest line in `CLAUDE.md`, and the clearest eviction in the file.** Guard:
**`npm run slug-walk`** — `scripts/slug-walk.mjs:34` says it *fails on the pre-fix page at
the commit is dark on a typed address that is taken*, which is this bullet's failure, and
its two halves walk the suggested and typed paths. Destination `design/DECISIONS.md`,
beside the post-mortem item 236 already sends there. Residual, ≈150 B: ``**An address is checked because it is the address, not because it was typed** — a pre-filled 📍 had no verdict at all and the gate stood open on an unasked question; a verdict that cannot be got counts as one. Guard: `npm run slug-walk`.``
**236.** «- **The address is the machine» · 393 B · **keep** — G5 (slug-walk walks both halves), and it is where item 235's post-mortem lands.
**237.** «- **The surface was built on the wide gate and the narrow one acted**» · 381 B · **keep** — G5 (journey walks the door on both sides of 🍾).
**238.** «- **A grant is the holder» · 347 B · **keep** — G5 (spec-check asserts both predicates and that the retired sentences never come back).
**239.** «- Ladder rungs write `data-ans`/`data-ansval`» · 260 B · **keep** — G2, and rule 2: **never** `opt()`'s `data-set`, with the alternative named.
**240.** «- **Avatars align by box, not by content baseline**» · 315 B · **keep** — G2.
**241.** «- **`may*` is the only thing a control may ask» · 428 B · **keep** — G2; the `can*`/`may*` split is a naming rule and the ingest-filter rule is a security-shaped one.
**242.** «- **A wallet question is not a lock** (entry 62)» · 305 B · **keep** — G5 (powers-walk), already reduced to failure + guard: the shape item 235 would take.
**243.** «- **`syncGrantAcks` watches a transition and never reads an absolute**» · 296 B · **keep** — G2; *the drop itself is not verified end to end (Q526)* says so explicitly.
**244.** «- **Nothing may infer a power from the DOM**» · 337 B · **keep** — G2.
**245.** «- **The spend-preview must never key on `:hover`**» · 427 B · **keep** — G2; the headless-Chromium fact is the kind nothing else records.
**246.** «- **The quarter-way floor is distance, not time**» · 325 B · **keep** — G2.
**247.** «- **`walletHeld` is wallet render state, never a class toggled from outside**» · 662 B · **keep** — G2; four separate prohibitions, each with its alternative, and *the navbar's height is load-bearing* is a measurement instruction.
**248.** «- **The payload is text and the page escapes.**» · 404 B · **keep** — G5 (pinned by a server test), and it was live XSS at an unauthenticated door, which is the one class of gotcha worth keeping guarded.
**249.** «- **Reading a document is a write, and that nearly sank the whole idea**» · 582 B · **keep** — G2.

**250.** «**Lifted out of name entries (2026-08-24, Q736/Q737):**» · 57 B · **keep** — G4.

**251.** «- **The 7px emoji face was a specificity fix that could not work**» · 375 B · **keep** — G5 (`node design/tools/pic-measure.mjs`).
**252.** «- **The picture upload» · 190 B · **keep** — G2; one sentence, load-bearing, and nothing measures it.
**253.** «- **None of the phase ladder ships**» · 310 B · **keep** — G5 (build-server.mjs greps its own artifact; verify-deploy asks both routes).

## The spec pass (8 items, 2,152 B)

The section is a **procedure**, and the audit's question is the plan's: would a session that
had not read it run a pass wrongly? Two of its eight lines are rules that bite outside a
pass — claim the numbers in the file, and never touch `packages/` in the extraction — and
both are already stated elsewhere in this file or in SPEC's own discipline. The other six
are steps nobody but a pass-running session executes, and a pass-running session can be
told to open one file. **Destination: a new `design/spec-pass/PROCEDURE.md`** — not
`pass-N.md`, which the Documents section says is deleted once folded.

**254.** «How SPEC.md and SURFACE.md are kept tabular, checkable and free of history» · 290 B · **rewrite**
Rule 1 + rule 3 (the dated pass history).
Proposed: ``**The spec pass.** How SPEC.md and SURFACE.md are kept tabular, checkable and free of history: the procedure is `design/spec-pass/PROCEDURE.md`, the guarantee is `npm run spec-check`. Two of its rules bite outside a pass: **claim the question block in QUESTIONS.md before anything else**, and **never touch `packages/` in the extraction steps** — where spec and code disagree, record it; changing code is a separate decision.``

**255.** «1. **Claim a question block first**» · 216 B · **keep**
Rule 1, and the only step that binds a session which is *not* running a pass: *numbers are
claimed in the file, never in chat or a commit message* is the rule Conventions learned the
hard way (item 272), and this build obeyed it.
**256.** «2. **Extract** — walk one rule family» · 267 B · **move** — to `design/spec-pass/PROCEDURE.md`; no session that is not running a pass acts on it.
**257.** «3. **Normalise** — find the general rule covering the most rows» · 232 B · **move** — same.
**258.** «4. **Diff** — `npm run spec-check`, then read spec against CLAUDE.md» · 159 B · **move** — same.
**259.** «5. **Ask** — the artifact (`design/spec-pass/pass-N.html`)» · 424 B · **move** — same; and the findings/questions split is a shape this proposal borrowed, which is an argument for the procedure being written down somewhere, not for it being loaded every session.
**260.** «6. **Fold** — answers land in SPEC.md (version bump)» · 318 B · **move** — same. Its last clause, *re-read every hot shared file immediately before editing it*, is already Conventions' last rule (item 272).
**261.** «7. **Assert** — extend `spec-check`» · 222 B · **move** — same; its *never touch `packages/`* clause is carried by item 254's proposed replacement.

## Conventions (11 items, 4,926 B)

**262.** «- Windows machine, PowerShell 5.1» · 152 B · **keep** — G3; the prohibition names the Bash tool as the alternative, and the global CLAUDE.md carries the detail.
**263.** «- **Checking a mockup:** serve `design/` over localhost» · 597 B · **keep**
Rule 1, and the highest-value convention in the section: **`file://` URLs are refused**, rAF
never fires, `:hover` never applies, `setTimeout` clamped to ~1s, *a stalled sequence in
that tab usually means rAF, not a bug*. A session without it debugs the harness.
**264.** «- **Mockup fixtures:** one array of items» · 312 B · **keep** — G3 (*never parallel literals kept in sync by hand*, alternative named).
**265.** «- **The phase ladder:** `npm run ladder`» · 515 B · **rewrite**
Rule 3, and *a name in two places inside this file*: the `phase-ladder` glossary entry
(item 166) already names the rungs, the parts and the script. What is left after the
duplication is the two flags and the reason it drives the bar.
Proposed: ``- **The phase ladder:** `npm run ladder` asserts the **surface** at each rung, not the stagehand's report — the two can agree and both be wrong. `--to=<rung>` stops and leaves the document standing, which is the eyeballing mode; `--seed=<n>` reproduces one. See the `phase-ladder` entry.``
**266.** «- **The founder's walk:** `node scripts/founding-walk.mjs`» · 359 B · **keep**
Rule 1. It says what the walk is *for* — *it is how a STYLE.md pass over the founding is
read* — which is the part no script header can tell you.
**267.** «- **Probe discipline:** any change to `cards.js` re-runs» · 215 B · **keep**
Rule 1. It is an obligation attached to a file, and nothing enforces it.
**268.** «- **The applicant's walk:** `npm run applicants-walk -- <url>`» · 481 B · **rewrite**
Rule 3. *No other harness has ever had an applicant in it, which is how Q900 stayed
invisible; it fails on the pre-entry-96 page* is the walk's origin story, and the walk's own
header carries it.
Proposed: ``- **The applicant's walk:** `npm run applicants-walk -- <url>` (against a running server, `--price=proposal|assembly|pen`) founds a document, knocks at the door as a stranger, and asserts what the membership is served. **It is the only harness with an applicant in it** — a door change that no other walk reddens still needs this one.``
**269.** «- **The seat matrix:** `npm run seat-matrix -- <url>`» · 760 B · **rewrite**
Rule 3, and the largest duplication inside the file: the `seat-matrix.mjs` glossary entry
(item 174) says the same thing 110 lines earlier. What only the convention says is how to
invoke it and what a *no rule* row obliges you to do.
Proposed: ``- **The seat matrix:** `npm run seat-matrix -- $DRAFT_BASE_URL` (`--hat=member|clerk|both`, `--to=before|live|closed`, `--out=<file>`, `--baseline=<file>`) seats seven contexts as roles and asserts SURFACE §2's **audience** column at every step. **A cell with no `AUDIENCE` entry is *no rule*: exit 3, and it is a question for Ed, not a predicate to invent** — once filed, `filed: 'Qn'` on the row makes it green. See the `seat-matrix.mjs` entry.``
**270.** «- **CI runs `npm run typecheck`» · 366 B · **keep**
Rule 1, and the plan names it: a session that lacks it calls a tree green on three gates.
The 2026-08-21 sentence is history, but it is the *evidence* for a rule a session otherwise
disbelieves (*vitest does not type-check tests*), so it stays.
**271.** «- No deploys or pushes without Ed's say-so.» · 254 B · **keep**
Rule 1, and the highest-stakes line in the file: **a push to `main` is a deploy** and there
is no gate behind it.
**272.** «- **Two sessions often run at once**» · 895 B · **rewrite**
Rule 3. Three operative rules, each with its own 2026-08-20 post-mortem attached — the
`CLAUDE.new.md` find, the 482 collision, the concurrent-write loser. The rules bite; the
stories are `design/DECISIONS.md`'s.
Proposed: ``- **Two sessions often run at once** (Ed, 2026-08-20). **Commit before compacting or clearing** — compaction takes with it the only record of what a half-finished file was for. **Claim a question number by writing it into QUESTIONS.md**, never in a commit message or in chat, because the other session cannot see prose. **Re-read a long shared file immediately before editing it** — the loser of a concurrent write is whoever wrote first. Post-mortems: `design/DECISIONS.md`.``

## What goes in this file (10 items, 4,034 B)

**Keep whole, by precedence.** This section is the admission rule; the pruning test is a
lens over it, and an audit that pruned its own governing rule would be marking its own
homework. Every item below is a keep on rule 1, and the section is the one part of
`CLAUDE.md` that `spec-check` both describes and enforces.

**273.** «The admission rule, written down because the two prior extractions had none» · 314 B · **keep** — rule 1: **extraction without an admission rule only resets the clock** is the sentence that makes this proposal necessary rather than sufficient.
**274.** «**This file is loaded whole into every session.**» · 225 B · **keep** — rule 1; it is the premise every item above rests on.
**275.** «1. **A rule** — what the surface does» · 283 B · **keep** — rule 1; *a rule stated in two places is a rule that will shortly be true in only one of them* is the ground of eleven items above.
**276.** «2. **A reason** — why a thing is the way it is» · 231 B · **keep** — rule 1; the ground of items 22, 208 and 212.
**277.** «3. **A gotcha** — something that broke, why it broke» · 299 B · **keep** — rule 1, and it carries Ed's *no byte budget* ruling, which bounds this whole proposal.
**278.** «4. **A name** — a new part of the system.» · 266 B · **keep** — rule 1; the second-paragraph test is what item 46's rewrite defers to.
**279.** «**The eviction rule (Q736): a gotcha whose mistake is now caught by a named automated guard» · 838 B · **keep** — rule 1; it is the authority for items 197, 198 and 235, and its closing sentence (*never stop naming the guard*) is why each of those keeps a residual line.
**280.** «**The entry rule (Q737): every glossary bullet, at any depth, names something» · 645 B · **keep** — rule 1; the authority for the glossary walk's unit.
**281.** «`npm run spec-check` holds the shape» · 497 B · **keep** — rule 1; and its last sentence — *what it cannot tell you is that a paragraph is a rule wearing a name's clothes* — is the gap this pass was run to cover.
**282.** «The same discipline for the plan documents» · 395 B · **keep** — rule 1; **declare precedence in the opening**, **cite rather than restate**, **schedule the edits rather than performing them in parallel** are the three rules this proposal itself is written under.

**283.** *(an addition, not a line that exists — it quotes nothing, so the verification script does not check it)* · **for Ed**
The plan permits proposing the pruning test as a **fifth admission question**, as an item
and nothing more. It would sit after question 4 in *What goes in this file*, and it is the
only way the lens becomes standing discipline rather than a pass that has to be re-run.
Proposed: ``5. **And then: would removing it change what a session does?** A line can be correctly homed and still earn nothing — a name nothing looks up, a paragraph that tours a directory, a convention restating what a checker already enforces. The first four questions decide *where* a thing goes; this one decides whether it goes anywhere at all. It is the one question that applies to a line already in the file, so it is asked at every extraction and never as a byte cull (Ed, Q723–731: there is no byte budget).``

---

## The arithmetic

**A consequence, not a goal.** Ed's *no byte budget* ruling (Q723–731) stands: no item above
is grounded on the file's size, and this table exists so he can see what any subset of
approvals would leave, not so that a target is met. Bytes are UTF-8 on disk including each
line's CRLF; the 282 audited units sum to the file's measured size exactly.

| | items | bytes | share |
|---|---:|---:|---:|
| **keep** | 235 | 72,356 | 74.3% |
| **move** — out of the file | 20 | 11,222 | 11.5% |
| **move** — within the file (item 33, to *Gotchas*) | 1 | 418 | 0.4% |
| **rewrite** — bytes as they stand today | 26 | 13,347 | 13.7% |
| **retire** | 0 | 0 | 0% |
| **total** | **282** | **97,343** | **100%** |

The file on disk is **97,343 B**, and 72,356 + 11,222 + 418 + 13,347 = 97,343.

What the moves and rewrites would actually leave, if every item were approved:

- **Moved out: −11,222 B**, of which 6,482 B is *Gotchas* (seven items), 3,118 B is *The two
  kinds of decision* (six items, all of them SPEC §9.6/§9.6a restated) and 1,622 B is the
  spec-pass procedure (six items).
- **Residual pointers the moves leave behind: +1,369 B**, measured over the eight residual
  lines written out above. Twelve of the twenty out-of-file moves need no residual at all,
  because the destination already says it; item 34 would need ≈120 B more if SURFACE §8
  declines *the headings are the people*.
- **Rewrites: 13,347 B today, 8,565 B as proposed** — measured over all 26 replacement
  sentences exactly as they are written out above, so the figure is checkable rather than
  estimated. Net **−4,782 B**.
- **Net, everything approved: −14,635 B**, leaving `CLAUDE.md` at **82,708 B** (82,828 with
  item 34's residual). Eight of the twenty-one moves are a rule SPEC or SURFACE already
  states in the same words, and ten of the twenty-six rewrites remove either a count that
  is wrong or a date git holds — seventeen items with no judgement call in them at all.

**The single largest items**, so that a partial approval can start where the argument is
strongest: item 235 (2,167 B, guarded by `slug-walk`), item 211 (1,239 B, SPEC §9.6a
verbatim), item 208 (1,130 B, a reason), item 31 (1,104 B, a retired rule stated in full),
item 11 (1,169 B, a five-file tour) and item 202 (598 B, SURFACE C1–C5).

## What a lint could hold

Two candidate classes have two or more instances today and could be asserted by
`checkClaudeMd` from now on. **Nothing is filed** — *nothing reaches `BACKLOG.md` untapped*
— and the entry number is left as `NN`. The shape below is taken from this project's plan
documents; plan-queue's `BACKLOG.md` is outside the worktree, so its heading style may need
adjusting when it is filed.

> **NN — `checkClaudeMd` holds two more shapes: a dated Documents bullet, and a counted entry**
>
> Two classes the pruning-test audit (Q943) found more than one of, both of which rot in
> silence and neither of which any checker sees today.
>
> **(a) A `## Documents` bullet carrying a bare date.** Nine of the fourteen bullets do —
> *since spec pass 1 (v0.65, 2026-08-22)*, *Supersedes `PLAN.md` (deleted 2026-08-20)*,
> *Since stage 8 (2026-08-21)* and six more. A date in that section is history narration:
> git holds when a file changed, and the bullet's job is what the file is *for*. The check
> is one regex over the lines between `## Documents` and the next `## `, with an allowance
> list for the two cases where the date **is** the content (`REVIEW-creation-session.md` is
> the 2026-08-18 walk; the sim-harness report is the 2026-08-14 pass).
>
> **(b) A `[file]` or `[symbol]` glossary entry stating a count.** Four do: `card-audit`
> (*Six walks, 182 cards* — **already wrong**, `ALL_WALKS` has seven and the entry's list
> omits `delegated`), `setup-probe.js` (*42 steps*), `emoji-data.js` (*1906
> fully-qualified glyphs*) and `constitution` (*the 18-setting catalogue* — correct today,
> and the only one taken from a hand-written union rather than a generated list). The
> cheap form of the check is to flag any digit-led quantity in an entry and require an
> allowance naming where the number is re-derived; the expensive form counts against the
> named source. Start with the cheap one.
>
> **Touches**: `scripts/spec-check.mjs` (`checkClaudeMd`), and whatever `CLAUDE.md` lines
> the check reddens — but **only after Ed has answered Q943's items 3, 5, 8, 9, 11, 14, 81,
> 111, 168 and 174**, since a checker landing before the copy it enforces is the Q736
> mistake in reverse.
> **Checks**: `npm run spec-check`, red before the copy changes and green after.

A third class was found and **does not qualify**: *an `npm run <name>` that the root
`package.json` does not define* has exactly **one** true instance (`npm run motions`, item
184) plus one near-miss (`npm run evidence`, which is correct because the bullet writes the
`-w @draft/sim-harness` with it). It is a four-line check and would have caught the one
instance, but it is below the two-or-more bar this section is held to, so it is recorded
here rather than proposed.

A fourth was considered and rejected as unlintable: *a `never` with no `instead`*. There
are 82 sentences in the file containing *never*, *must not* or *don't*, of which the audit
judged exactly two to name no alternative (items 41 and 148). No regex separates the two
from the eighty, and a checker that cries wolf on prose is worse than none — which is the
reasoning `checkClaudeMd`'s own `GUARD` comment already gives.

## What the audit could not decide

Seven items turn on a fact only Ed has. Each is listed with its two readings; none is
implied by any verdict above.

**C1 — Is *suggestion-mode with escalation* still the north star?** (item 22, 343 B.)
*(a)* It is intent rather than a rule, the surface it describes is built, and SURFACE §6/§9
own what is drawn — so it moves to `design/DECISIONS.md`. *(b)* A north star shapes the
*next* decision, no checker will ever catch its absence, and the escalation framing is the
thing a session reaches for when it is asked to add a new surface — so it stays. The audit
recommends (b) if it is still true and (a) if it is not, and cannot tell which.

**C2 — Is `the-briefing` still planned?** (item 157, 314 B.) *(a)* A plan or backlog entry
names it, in which case it is a keep and rule 3's aspirational-state clause does not reach
it. *(b)* Nothing names it, in which case it is an aspirational-state candidate and its
SPEC §3.5 constraint moves with it. The audit **cannot see plan-queue's `BACKLOG.md` from
the worktree**, so it recorded a keep.

**C3 — Does the deliberate duplication of the card lifecycle still stand?** (item 202,
598 B.) The bullet says *kept here in one line each because they bite*, which is a decision,
and the inversion says a policy retires only when a human retires it. *(a)* The decision
stands and the item is withdrawn. *(b)* It was made before `spec-check` asserted SURFACE's
tables, and the duplication is now the risk rather than the insurance.

**C4 — Should `design/race-card.html` exist at all?** (item 148, 316 B; Q70, still open.)
*(a)* It stays and the rewrite stands, naming what to copy from instead. *(b)* It is deleted,
in which case the entry retires with it and the rewrite is wasted work. The audit proposed
the rewrite because it is correct under either answer.

**C5 — Is *One card per decision* a test or a reason?** (item 225, 636 B.) *(a)* A test a
session applies while proposing a card, which is why it sits in a file loaded every session.
*(b)* Reasoning, whose two worked examples (⏰ swallowing *whether it ends*, 🎲 ceasing to be
a card) belong in `design/DECISIONS.md`, leaving one line here. The audit kept it.

**C6 — Should the pruning test become a fifth admission question?** (item 283.) *(a)* Yes,
and the sentence is written out above; the lens then applies at every extraction rather than
only when a pass is commissioned. *(b)* No: four questions are memorable, five are a
checklist, and the pruning test is a periodic audit rather than a per-line gate.

**C7 — Is the SPEC-pointer trade acceptable at this size?** (items 23, 26, 28, 29, 34, 202,
211 — 4,915 B in total.) Every one of them is a rule `SPEC.md` or `SURFACE.md` already states
in the same words, and the admission rule's first question says *what comes back here is a
§ pointer*. But **SPEC.md is not loaded per session**, so a session that needs the two kinds
of decision must open it. *(a)* The admission rule means what it says and these move; the
residual pointers name the section. *(b)* Governance is the one family where the cost of a
session getting it wrong is high enough to buy a second copy, and Ed keeps them. **This is
the single most consequential answer in the proposal** — it is 5.0% of the file and the
audit's largest coherent group.


