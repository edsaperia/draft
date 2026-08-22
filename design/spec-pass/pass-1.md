# Spec normalisation — pass 1 (extraction)

> Working document, 2026-08-22. This is the **extraction**, not the rewrite: SPEC.md, SURFACE.md and
> SPEC-REASONING.md are rebuilt only after Ed answers the items below. `npm run spec-check` parses the
> tables in this file (marked `<!-- spec-check: … -->`) until they move into SPEC.md / SURFACE.md.
> Item numbers 540–576 are from the block reserved in QUESTIONS.md; unused numbers in the block are
> released when the passes end.

---

## A. Worked fragment — §9.7 in the governance normal form

> Replaces §9.7's ~2,000-word paragraph and the parts of §9.0a, §9.6 and §9.6a that restate it.
> `→ why: R-nnn` points into `design/SPEC-REASONING.md`, where the dated rulings and rejected
> alternatives go. Numbers are placeholders until that file exists.

**9.7 Powers and holders.**

A *setting* is a named parameter of the document with a typed value (the catalogue, §9.7.1). Over
every non-personal setting the founder may hold two *powers*: **✒️ the pen** — change the setting
directly, nobody asked — and **🛡️ the shield** — a change the members pass takes effect only on the
founder's accept. A setting is **delegated** when the founder holds neither. → why: R-403

| State | ✒️ | 🛡️ | Reads as |
|---|---|---|---|
| founder decides | held | held | *The Founder may amend this at will, and refuse proposals that the membership pass.* |
| founder decides, room decides too | held | — | *The Founder may amend this at will.* |
| room proposes, founder answers | — | held | *The Founder may refuse proposals that the membership pass.* |
| delegated | — | — | (no governance sentence; the preamble's default applies) |

Rules:

1. **Birth.** Every setting is born founder-held, both powers, its question shut, its value unset.
   Nothing arrives delegated and nothing arrives answered. → why: R-511
2. **Delegation is an act, one-way, the founder's own, never a motion.** Before the start, on a
   delegable setting, it opens the blind founding question (§9.0a); otherwise — and always after the
   start — it is a hand-over: the value stands, only the holder changes. A hand-over is available from
   whichever comes first, the text confirming or the start. → why: R-052, R-415
3. **Relinquishing is free, separate and one-way after the start.** Before the start both powers are
   as revisable as any radio (`reclaim`). Laying down 🛡️ alone is available from creation; laying
   down ✒️ alone waits for proposing to open, because the shield-only state is inert before it.
   → why: R-054
4. **The road back is a constitutional `reserve` motion**, naming one power or both (default both),
   landing **without** the founder's assent, a lapsed founder included. → why: R-394
5. **A change takes the route of what it changes** (§9.7.2). Where the founder holds ✒️ the route is
   the **pen**: direct, recorded as an amendment with a reason, owed an acknowledgement. Otherwise an
   ordinary setting races at the threshold with quorum and a constitutional one is decided by
   unanimity. Reservation never alters a setting's route. → why: R-321, R-530
6. **Where 🛡️ is held, a change the members pass is a 👑 question** — Accept / Reject, at the end of
   either route. Crown lapse is automatic acceptance; a 👑 question pending at the close fails closed.
   → why: R-351, R-467
7. **👑 marks a founder holding either power on any setting; 📯 marks one holding none.** A founder
   who holds nothing and is not a member has no role — a name in the record, still able to change
   their own name and picture (§9.0c), and still an address the room may restore powers to.
   → why: R-379
8. **The start lays down both powers on the Text.** Adoptions then stand by themselves; a reserve
   motion on the Text is the road to adoptions waiting on the founder's accept. → why: R-440

**9.7.2 Routes** — who has to agree, in order:

| Route | Who agrees | Era | Price | Blind? | Settles | Recorded as |
|---|---|---|---|---|---|---|
| 🪶 set | nobody — nothing exists yet | pre-start | a feather | — | on the act | a setting, not an amendment |
| 🏛️ founding consent | each member states a minimum; the document takes the most protective | pre-start | free | yes, count only | on the live electorate, never on one voice, never while an invitation is out | the founding |
| ✒️ pen | nobody — the founder holds the power | post-start | — | — | on the act | amendment, route `pen`, with reason |
| ✏️ ordinary | enough of the room, at the threshold with quorum | post-start | one ✏️, refunded by §7 | §3.5 | a race | amendment, route `ordinary` |
| 🏛️ constitutional | everybody active: accept / keep / abstain, one keep blocks | post-start | free; one 🏛️ out per member | yes, count only | live electorate, no snapshot | amendment, route `constitutional` |
| personal | the member alone | any | — | — | on the act | not in the constitution |

---

## B. Worked fragment — the card lifecycle in the communication normal form

> Replaces CLAUDE.md's *a card closes when…*, *commit-row grammar*, *what you typed survives a close*,
> *an opening card focuses…* and *🗑️* bullets. Each row: **event × audience × channel × ask × close
> × persistence**.

**Universal rules**

- C1 **Whatever the document wants from you goes in the rail, and everything that wants something is
  a card.** A card opens only on the user's click; it replaces the clause it is about.
- C2 **A card closes when its answer becomes the document's** (set, saved, acknowledged, discarded)
  **and stays open while it is still the place the thing lives.**
- C3 **Closing is not discarding.** Every provisional value lives in `S` until 🗑️ takes it, and 🗑️
  puts back only what the open card can write.
- C4 **One commit row**: 🗑️ always live at the left; at the right ✒️ (a set of your own), ✓ (an answer
  or a judgment, or anything about yourself), ✏️ Propose / 🏛️ Hold to ask everyone (a motion), or
  **OK** (a card that asks only to have been seen). The hold ladder: 🪶 ✒️ 1s, ✏️ its flight, 🏛️ 10s.
- C5 **Opening focuses the main decision** — the first interactive control in the card's own order,
  the chosen option within a group; focus is never a press; `preventScroll`.

| # | Event | Audience | Channel | Ask | Close | Persistence |
|---|---|---|---|---|---|---|
| L1 | A setting of yours is set (✒️) | the actor | the card | a value (+ reason once it is a change) | on commit | clause states the rule; tab goes grey |
| L2 | An answer about yourself is saved (✋🖼️📧) | the actor | the card | a value | on Save | your member row |
| L3 | A blind question is answered | the actor | the card | an answer | on ✓ | entry leaves the rail; card shows the count; revisable until resolved |
| L4 | A judgment is cast | the actor | the card | A / B / indifferent | **does not close** (exception Y1) | ⏳ in the gutter until the race seals |
| L5 | A motion is committed | the actor | the card | value + rationale | on Propose / on the 🏛️ hold | ✏️ entry pinned (ordinary); answered 🏛️ leaves the rail |
| L6 | 📧 send | the actor | the card, then mail | an address | on send; **re-opens on refusal** (Y2) | the clause: *checking their email* |
| L7 | A decision you are owed | each member owed it | news entry pinned, clause | OK | on OK | clause keeps the change line permanently; OK persisted per document and member |
| L8 | A power arrives | the holder | news entry, wallet flight | OK | on OK | `ACK_KEYS` per seat; re-asked on every not-held → held |
| L9 | 🗑️ | the actor | the card | nothing | always | un-actioned input reverted; set values untouched |

Exceptions: **Y1** a judgment is revisable and its field still worth reading, so submitting does not
close; **Y2** a refused send has nowhere else to be read.

---

## C. Governance — extraction

### C.1 Vocabulary

| Term | Meaning |
|---|---|
| setting | a named, typed parameter of the document; 19 in the catalogue |
| kind | **ordinary** · **constitutional** · **personal**, by the test: *a constitutional decision is one that would make past decisions mean something different*; personal binds nobody |
| power | ✒️ pen (change directly) · 🛡️ shield (a passed change waits on the founder's accept); held per setting |
| holder | the founder, or the members (= neither power held) |
| era | **pre-start** (birth → 🍾) · **post-start** (🍾 → close) · **closed** |
| route | 🪶 set · 🏛️ founding consent · ✒️ pen · ✏️ ordinary · 🏛️ constitutional · personal (§9.7.2) |
| electorate E | the arrived, non-removed, non-lapsed membership |
| judge-gate | a setting judging waits on, because a judgment is recorded under it or counted towards it |
| delegable | may open a blind founding question pre-start |

### C.2 The settings table

<!-- spec-check: settings -->
| id | glyph | kind | delegable | judge-gate | deps | value | rungs (most protective first) | consent scalar | route of a change | page key |
|---|---|---|---|---|---|---|---|---|---|---|
| title | 🪶 | ordinary | no | no | — | text | — | — | ordinary | title |
| link | 📍 | ordinary | no | no | — | slug | — | — | ordinary | slug |
| startingText | 📄 | ordinary | no | no | — | text | — | — | none — changed by drafting (X1) | text |
| ending | ⏰ | constitutional | yes | no | — | ending | — | earliest close accepted; never highest | per value: date ordinary, never constitutional (X2) | ending |
| bar | ✒️ | constitutional | yes | yes | ending | percent | — | lowest threshold at the close | constitutional | bar |
| pace | 📈 | ordinary | no | no | ending | pace | — | (most gradual arrival — X3) | ordinary | pace |
| quorum | 👥 | constitutional | yes | yes | — | quorum | — | lowest quorum, in the founder's form | constitutional | quorum |
| authorship | 👤 | constitutional | yes | yes | — | ladder | anonymous · sealed · public | most exposure accepted | constitutional | authorship |
| signing | ✍️ | constitutional | yes | yes | — | ladder | nobody · each · everybody | most signing accepted | constitutional | signing |
| judgments | 👁️ | constitutional | yes | yes | — | ladder | never · after | most reveal accepted | constitutional | judgments |
| chamber | 🌍 | constitutional | yes | yes | — | ladder | closed · link · public (Q527) | most visibility accepted | constitutional | chamber |
| rate | ⏱️ | ordinary | yes | no | — | rate | — | least generous rate accepted (most generous wins) | ordinary | rate |
| lapse | 💤 | constitutional | yes | yes | — | lapse | — | shortest quiet spell accepted; never longest | constitutional | lapse |
| removal | 🚪 | constitutional | yes | no | — | ladder | everyone · others · ordinary | easiest removal accepted | constitutional | removal |
| machines | 🤖 | ordinary | yes | no | — | machines | — | most machine proposing accepted | ordinary | machines |
| membership | 🪪 | constitutional | no | no | — | register | — | — | commands (X4) | roster |
| applications | 🤝 | constitutional | yes | no | — | applications | — | most open policy accepted, over invite · proposed · apply · open | constitutional | policy |
| displayName | ✋ | personal | no | no | — | text | — | — | personal | myname |
| picture | 🖼️ | personal | no | no | — | text | — | — | personal | mypic |

Decisions the founding asks that are **not settings** (see question 561): 🎩 *Is the Founder a
Member?* (locked at the start); 📧 the founder's address (identity, unique); 🍾 the start; the three
grants and two gates (news, not decisions).

### C.3 Rules that quantify over the table

- G1 Kind is by the test; the list is derived, not argued (§9.6). Personal settings bind nobody and
  have no route.
- G2 Birth is uniform: founder-held, both powers, question shut, value unset (§9.7 rule 1).
- G3 **Before the start nothing is amended, only set.** The founder re-sets any setting they hold and
  re-shapes the roster freely; inviting and uninviting asks nobody.
- G4 Delegation and relinquishment as §9.7 rules 2–4.
- G5 **Founding consent**: blind, each member's minimum read along the setting's protective order; the
  document takes the most protective; the distribution is published nameless; a question waits for its
  `deps`; it resolves on E, never on one voice, never while an invitation is outstanding; a roster
  change is a ground shift (answers stand, authors may revise); later members inherit.
- G6 **Post-start a change takes the route of what it changes** (§9.7 rule 5, the routes table).
- G7 Shield and crown as §9.7 rules 6–7.
- G8 A carried amendment binds races in flight; past adoptions keep their recorded threshold;
  incoherence is a ground shift.
- G9 Every held-able setting is a tab group; the constitution states governance by deviation under the
  preamble.
- G10 **The start (🍾)** is the founder's explicit act: stamps constituted-at, locks 🎩, lays down the
  Text's powers, opens judging, anchors the ramp; refused while a judge-gate question is still
  collecting.
- G11 **Three gates**: reading needs nothing but 🌍 (the founder always reads); proposing and judging
  open at the start — see question 570, where the spec and the build disagree.
- G12 **Acknowledgement**: a constitutional setting set or changed after the start is owed an OK by
  every member who had no say (lapsed included; removed and un-arrived excluded); an ordinary one only
  when changed; a power on every not-held → held transition.
- G13 The membership: begins at first arrival; invitees count toward nothing; post-start an invitation
  is a constitutional motion, removal goes by 🚪's rung, admission is an ordinary one-candidate race.

### C.4 Exceptions

| # | What | Rule it breaks | Why | Ruling |
|---|---|---|---|---|
| X1 | The Text has no motion route; it changes by drafting in the document | G6 | a motion button there is a second door to the same room | Q440 |
| X2 | Ending's route falls inside the setting — moving the date is ordinary, removing the ending constitutional | G6 "route by kind" | *never* is one of the answers to *when* | Q329 |
| X3 | Pace is ordinary and not delegable but carries a consent order | C.2 delegable | the order exists for a post-start hand-over, where no blind question is asked | Q415 (see question 560) |
| X4 | The register is changed by commands, never by a value; its powers are 🤝's | G6 | invite/arrive/remove are acts on people | §9.7½, Q506 |
| X5 | 🚪 *others* is a decision class of its own: unanimity minus the subject, who sees the motion but is not asked | routes table | real constitutions expel by unanimity of the others | Q401(a) |
| X6 | Title, link, pace and the Text take no founding question; their hand-over waits for the text to confirm | G4 | a blind consent question over prose is nonsense | §9.7, Q415 |
| X7 | 🎩 is a decision but not a setting; locked at the start | C.2 | it decides whether answers are owed at all | §9.6a |
| X8 | 📈 has no clause and no place in the founding order; ✒️'s commit sets it | G9 one clause per setting | a ramp is part of what the threshold says | Q512 |
| X9 | The Text's powers are laid down automatically at 🍾 | §9.7 rule 3 (a free act) | a drafting engine's default is that adoptions stand by themselves | Q440 |
| X10 | The reserve motion lands without the founder's assent | §9.7 rule 6 | the release from an unwanted crown is delegation, already in their hands | Q394 |
| X11 | Under *apply* the applicant authors their own admit race, a voice for that one act | E, §3.3 | their application is a type of proposal | Q397 (see question 565) |
| X12 | Foundership carries a read independent of 🌍 | G11 | the convenor is one of the people the document is about | v0.64 |
| X13 | A 🏛️ motion is free and limited to one per member; an ordinary one costs an ✏️ | routes table | a price on consent is the one thing that must stay free | Q327 |
| X14 | An invitation outstanding at the close expires, though every link ever issued keeps working | G13 | there is nothing left to join | §4.6, §9.7a |
| X15 | The founder with no powers and no membership keeps their name and picture | §9.7 rule 7 | identity binds nobody | §9.0c |
| X16 | The mover of a constitutional motion stands at accept from the open | routes table (blind) | proposers prefer their own proposals | §3.3 |
| X17 | Crown lapse auto-accepts; a pending 👑 at the close fails closed | §9.7 rule 6 | lapse is absence, the close is everybody's deadline | Q467 |

---

## D. Communication — extraction

### D.1 Columns

**event** what happened · **audience** nobody / the actor / one member / every member owed / the
membership / invitees / strangers · **channel** rail entry · clause in the band · card · gutter tab ·
topbar · wallet · mail · gazette · record · **ask** nothing / OK / an answer / a judgment / a draft ·
**close** what makes the card go · **persistence** leaves the rail / stays in the clause / reaches the
record / remembered per seat.

### D.2 The event matrix

<!-- spec-check: events -->
| # | Event | Audience | Channel | Ask | Close | Persistence | Keys |
|---|---|---|---|---|---|---|---|
| E1 | A founding question opens (delegated) | every arrived member, founder if a member | rail ask entry; task paragraph under the watching clause | an answer | ✓ | entry leaves; card shows the count | chamber policy lapse removal ending bar quorum authorship signing judgments rate machines |
| E2 | A founding question resolves | everyone who answered | clause; distribution strip | nothing (pre-start: no OK owed) | — | clause states the rule | — |
| E3 | A setting is set pre-start | nobody | clause fades in | nothing | — | clause | title slug text hat myname mypic roster |
| E4 | The document begins 🍾 | every member | 💡 ⚖️ gate news cards, 🏛️ grant, ✏️ storm, Founded line | OK each | OK | `ACK_KEYS`; grants staged behind constitutional OKs | begin canpropose canjudge grant-voice |
| E5 | A constitutional setting set or changed post-start (pen or carried) | every member who had no say, lapsed included | news entry pinned ✔, clause change line (was/now, who) | OK | OK | clause keeps *Last amended*; record's Amendments | — |
| E6 | An ordinary setting first set | nobody | clause | nothing | — | clause | — |
| E7 | An ordinary setting changed | as E5 | as E5 | OK | OK | as E5 | — |
| E8 | A power arrives | the holder | news entry, wallet flight | OK | OK | per seat; re-asked on each not-held → held | grant-pen grant-shield grant-voice canpropose |
| E9 | A power is laid down | the actor | the power card; clause deviation vanishes | nothing | on commit | clause | — (question 571) |
| E10 | A constitutional motion is put | every active member | the setting's own card, live again; rail ask | accept / keep / abstain | ✓ (answered entry leaves; tab keeps its glyph) | carried → E5 | invite remove |
| E11 | An ordinary motion is put | whoever the router serves | race card | a judgment | never on submit (Y1) | → E5/E14 | — |
| E12 | A 👑 question | the founder | news-pinned task | Accept / Reject | on commit | record | — |
| E13 | A text race wants a judgment | whoever the router serves | 💡 / 🔥 entry at the clause, gutter tab | a judgment | never on submit (Y1) | ⏳ until the seal | — |
| E14 | A race seals, the document changed | every member | ✔ green pinned; clause | OK | OK | grey ✔ filed; record | — |
| E15 | A race seals, the incumbent held | members who judged it | ✖ green, pins only if you judged (Y15) | OK | OK | grey ✖ filed | — |
| E16 | The ground shifted under your judgment | the judge | ↻ receipt | nothing; the pair is re-served | — | — | — |
| E17 | A race deadlocks | each member, once it has nothing left to ask them | ⚔️ entry ranked by bounty | a draft | — | — | — |
| E18 | A salience diagonal | a member with an empty queue, below 2E | 🌶️ card, served not offered | which matters more | ✓ | no progress state | — |
| E19 | A proposal of your own | the author | ✏️ card, then one line; pinned | withdraw is the remaining act | Propose (stays pinned) | ✏️ throughout | — |
| E20 | Somebody arrives | the room; founding answerers (ground shift) | member row; answerers *notified* — channel unspecified (question 572) | revise, optionally | — | register | roster |
| E21 | An application is submitted | the membership | Applicants block on 🪪; admit race | a judgment | — | record | apply appmail appname apppic apptext |
| E22 | A membership is about to lapse / lapses | the member | mail: warning, then the package | nothing; revival is logging in | — | — | — |
| E23 | The document freezes | every member | session-clock *Frozen — n must return*; *notified* — channel unspecified (question 573) | return | — | — | — |
| E24 | The document closes | every member and invitee | 🥂 card per member; mail with the record link; closed page | OK = sign, with a comment | OK | record, signatures | closing |
| E25 | A stranger arrives | strangers | holding sentence, redacted bars, 📧 Log In / Apply | an address | on send | — | strlogin strapply |
| E26 | A verification mail | the actor | mail; the card | follow the link | on send; re-opens on refusal (Y2) | — | myemail appmail |
| E27 | Anybody acts | everybody | room-pulse | nothing | — | — | — |
| E28 | An adoption lands | everybody | **gazette + chime — unbuilt** (finding 566) | nothing | — | — | — |
| E29 | The floor recomputes | everybody | **gazette — unbuilt** | nothing | — | — | — |
| E30 | Digest: dominated / nearing resolution / deadlocked | the author / the judge | **§8.4 digest — unbuilt (Q465)** | — | — | — | — |

### D.3 Universal rules

- C1–C5 as fragment B.
- C6 **Exactly four kinds of entry pin**: 🔥, an unacknowledged decision, a proposal of your own, a
  prioritisation — what is about *you*. Everything else stands beside its clause.
- C7 **Hot for actions, cold for information.** Grey means nothing is asked of you. Green never leaves
  a card interior.
- C8 **A decision you had no say in is owed an OK; reading is not enough.** Nothing is owed before the
  start.
- C9 **No power arrives without acknowledgement, and is not held until acknowledged.** A question you
  may not answer is not shown at all — filtered at ingest.
- C10 **The document reads identically to every reader; only their tasks differ.** Third person; the
  office, not the name, in attributions.
- C11 **A first decision is not a change. A change carries a reason and says who made it.**
- C12 **Blind while running**: only the count shows; no standings, no direction, no cleared-and-cooling.
- C13 **A task you have to do carries no subtitle**; motions and news do.
- C14 **The founding runs in single file**, one clause per step, in the document's own order.
- C15 **Mail rides the fold** for every event a member is owed off-surface; the link is the login.

### D.4 Exceptions

| # | What | Rule | Why | Ruling |
|---|---|---|---|---|
| Y1 | A judgment does not close its card on submit | C2 | revisable, and the field is still worth reading | 2026-08-21 |
| Y2 | 📧 closes on send and re-opens on refusal | C2 | a refusal has nowhere else to be read | 2026-08-21 |
| Y3 | ⏳ survives only where the wait is about you (📧, a gate, 🍾); a constitutional card waiting on the room keeps its glyph and leaves the rail | lifecycle marks | the tab says the rule, the queue says nothing | 2026-08-21 |
| Y4 | A gate holds its place in the order without blocking it; ✒️ blocks; 🏛️ does not | C14 | everything below ✒️ is committed with the pen it hands over | 2026-08-22 |
| Y5 | The gate clauses wait for 🍾 | C14 | 🍾 is where they are decided | Q529 |
| Y6 | A gate opening is owed an OK even pre-start | C8 | a thing that happened, not a rule that was set | Q414 |
| Y7 | The ✒️/🛡️ power tabs are exempt from pen gating | C9 | laying a power down must stay possible | 2026-08-21 |
| Y8 | You are at the top of the members list | C10 | a membership starts as one person, reading this | 2026-08-21 |
| Y9 | The founder's rationale is not sealed | §3.4 | a ✒️ act is attributed by construction | 2026-08-22 |
| Y10 | A lapsed member is owed an OK though outside E | C8 / E | lapse is a stall, not a departure | 2026-08-22 |
| Y11 | 🍾 has no wallet; the cork flies | wallets | beginning is a moment, not a capacity | Q516 |
| Y12 | 🔥's entry carries no teaser while pinned | rail grammar | it has been decided for you | — |
| Y13 | ✖ green pins only if you judged; filed keeps its direction | C6 | a decision announces itself if it changed the document or you are part of why it did not | — |
| Y14 | The diagonal is served, never offered, and draws no progress | C1 | no finish line exists | §8.3a |
| Y15 | The stranger's door has no provisional layer | C3 | it prints what the module holds | — |
| Y16 | The birth is its own phase: no heading, no sections, 📧 in the lead, the clause blank before the mail | C14, band grammar | nothing is being headed yet | 2026-08-21 |
| Y17 | The alpha flag is absent from the magic-link interstitial | alpha-flag | it would only flash | — |
| Y18 | A clause is not a button; the gutter tab is the only way into a card from the document | C1 | clicking a clause puts a caret in it | — |

---

## E. Findings — drift I will fix in the rewrite unless vetoed

Each is a place where the spec, CLAUDE.md or the code disagrees with a ruling Ed has already made.
Code is never changed by this pass; where the fix is in `packages/` it is recorded for the other
session.

| # | Where | Finding | Fix in the rewrite |
|---|---|---|---|
| 543 | SPEC §9.7 ¶1 | *Who holds what, by default* — constitutional → roster, ordinary → convenor — contradicts §9.0a (v0.63, Q511): nothing arrives delegated | §9.7 rule 1 replaces it; the defaults argument goes to SPEC-REASONING |
| 544 | SPEC §9.7, §9.6a | 🔧 for the unilateral power; CLAUDE.md retired 🔧 for ✒️/🛡️ on 2026-08-21 | ✒️ pen / 🛡️ shield throughout; a note keeps `unilateral`/`assent` as the engine's names |
| 545 | SPEC §9.6a | the hat as a *pre-checked row in the membership list*; 🎩 is a card with nothing pre-answered, locked at the start | rewrite to the card; 🎩 is exception X7 |
| 546 | SPEC §9.7 | *the starting text sits outside all of this… holding it crowns nobody*; Q440 made the Text held-able and 🍾 lays its powers down | rule 8 and X1/X9 replace it |
| 547 | SPEC §8.5 | *The convenor's in-session powers: none* (open as Q54 since 2026-08-14) | reword to feeds: nobody, founder included, touches routing |
| 548 | SPEC §9.0, §9.6 | the pen is absent: §9.0 says settings change *only by motion… never by anybody's unilateral hand*; code has `MotionRoute 'pen'`, folded as an amendment (2026-08-22) | the routes table carries the pen; §9.0's sentence goes |
| 549 | SPEC §9.0a ¶3 | *a convenor who keeps one still cannot change it after the start except by the unanimous route* — contradicted by §9.7 (*unilateral control… at any time*) **and by the module**: `setSetting` post-start succeeds whenever ✒️ is held, on any setting, emitted `by: 'crown'` (`session.ts:797–830`) | §9.0a's sentence goes; rule 5 states it. **Veto here means a code change, not a spec one** |
| 550 | CLAUDE.md `constitution` | *the 18-setting catalogue*; the catalogue and its test say 19 | 19 |
| 551 | SPEC Appendix A | two `Window` rows; *observer role off by default* (Q324); *Constitution source* / *Disclosure source* rows describing the roster as default (pre-Q511); *Visibility link-only by default* when nothing is pre-answered | drop the stale rows; the rest is question 562 |
| 552 | SPEC §9.7, §9.7½ | *the register's crown lives in the applications value / delegated both its holds at once*; since Q506 the pair is 🤝's own powers and the value is the join policy alone (catalogue order comment, `PW_KEYS`) | X4 states it |
| 553 | SPEC §9.6a (🚪) | *Delegated by default like every constitutional setting* | goes with 543 |
| 554 | `catalogue.ts` | `holderDefault` on all 19 rows, **unread** (`session.ts:144`: *survives as doctrine… no longer read here*) | the spec table carries no holder-default column; removing the field is the other session's call |
| 555 | `catalogue.ts` / CLAUDE.md | `chamber` still carries `public` after it left the surface (Q527, open) | the table marks the rung *(Q527)* until answered |
| 556 | SPEC §9.0b vs `JUDGE_GATES` | *Judging needs the whole constitution*; code gates on seven (bar quorum authorship signing judgments chamber lapse) — exactly those a judgment is recorded under or counted towards | the spec names the seven and the reason; the judge-gate column is the oracle |
| 557 | CLAUDE.md `toolbar` | *🛡️ rides grant-pen's acknowledgment*; since d20f67a the shield is its own grant (`grant-shield` in `GRANT_KEYS` and `ORDER`) | CLAUDE.md corrected in D6 |
| 558 | `session-view.html:473` | the page **does** carry an id map, `MID` (slug link · text startingText · policy applications · roster membership) — but `myname`/`mypic` → displayName/picture are not in it and `hat` has no catalogue id | the checker holds the full map (page key column); growing `MID` is the other session's call |
| 559 | CLAUDE.md `gate-cards` | *a ⏳ tab in the band while it waits*; Q529 superseded that for 💡 and ⚖️ (they wait for 🍾) | corrected in D6; Y5 states it |
| 566 | SPEC §9.2, §9.3, §8.4 | the gazette, the adoption chime, the floor-recomputed announcement and the digest have no surface; the glossary's `gazette` is a stub | the matrix carries E28–E30 as **unbuilt** rows pointing at Q465 (or see question 574) |
| 567 | SPEC §9.6a, §9.5 | *their authors are notified* (ground shift) and *participants are notified* (freeze) name no channel | the matrix marks the channel unspecified; questions 572–573 ask |
| 568 | SPEC §9.6, §9.6a, §9.7 | surface detail living in the mechanism spec: the assembly-press, the Constitution block's layout, *the 👑 question arrives as news with Accept / Reject* | moves to SURFACE.md with a pointer from the spec |

---

## F. Questions — genuine choices

Recommendation first in each list.

**Shape**

- **540** Does fragment A read as the target governance shape? (a) yes — rebuild §9 this way; (b) fewer
  universal rules, more exceptions; (c) keep §9.7's prose and add only the table; (d) other.
- **541** Does fragment B read as the target communication shape — six columns? (a) yes; (b) drop
  *persistence*; (c) add a *who acts* column; (d) other.
- **542** Where does the communication matrix live? (a) a new `SURFACE.md`, lifted out of CLAUDE.md's
  glossary; (b) restructured inside CLAUDE.md; (c) SPEC §12 Display.

**Governance**

- **559** is a finding above; the next question number is 560.
- **560** Pace's consent order is dead (no founding question is ever asked; a hand-over needs none):
  (a) the table omits it and the catalogue drops it (other session); (b) keep it as doctrine.
- **561** 🎩, 📧 and 🍾 are questions the founding asks but not settings: (a) a second small table in
  the spec, *decisions that are not settings*, each with its lock; (b) rows in the settings table with
  a `kind: founding` value; (c) leave them in prose.
- **562** Appendix A's future: (a) rename to *Engine tuning* and keep only what is not a constitution
  setting — cooldown, hot set, deadlock test, refund, rival gate, boost — which is Q335's split; (b)
  keep it, stale rows removed; (c) delete it.
- **563** Route names in the spec: (a) the four-verb glyphs as the routes' names — 🪶 set · ✒️ pen ·
  ✏️ ordinary · 🏛️ constitutional, with 🏛️ also naming founding consent as its pre-start form; (b)
  words only.
- **564** `SPEC-REASONING.md`'s scope: (a) only what leaves SPEC.md, keyed `R-###` by the rule it
  explains; (b) also absorb `design/DECISIONS.md`'s mechanism entries so there is one reasoning file.
- **565** Under *apply* §9.7½ says the applicant is *counted toward no quorum and no floor*, but §3.3 and
  §8.2 count an author's derived preference as a mover toward the floor: (a) the applicant's preference
  is not a mover — X11 is an exception to §8.2 and the spec says so; (b) it is a mover like any author's.

**Communication**

- **570** Proposing: §9.0b says it needs only a confirmed text and your own answers (*a member who has
  answered can draft while the rest are still answering*); the build opens ✏️ at 🍾 and the server
  refuses `propose-text` before the document has begun. (a) amend the spec — proposing and judging both
  open at the start, the gates being reading · the start; (b) restore §9.0b in code (other session).
- **571** When the founder lays a power down, is the membership told? (a) no — the clause's deviation
  vanishes and that is the record; (b) a news entry owed an OK, like a changed rule.
- **572** The founding ground shift (*their authors are notified*): (a) a ↻-style receipt on their own
  answer card, no mail; (b) mail; (c) both.
- **573** The freeze (*participants are notified*): (a) the session-clock line plus one mail to every
  member in the base; (b) the clock only.
- **574** The gazette, the chime and the §8.4 digest: (a) stay in the spec and sit in the matrix as
  *unbuilt* rows pointing at Q465; (b) leave the spec until they are designed.
- **575** Does a pen change to an *ordinary* setting mail anybody? (a) no — news on the surface only;
  (b) it rides the fold like every other owed event.
- **576** L4/Y1 — a submitted judgment leaves its card open: (a) keep the exception; (b) close and file
  as ⏳ like every other commit.
