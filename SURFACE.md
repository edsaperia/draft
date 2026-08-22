# SURFACE — what the surface tells a member, and what a control does

The communication rules of the one page (`design/session-view.html`), as a matrix — **event × audience × channel × ask × close × persistence** — plus the rules that quantify over it, the exceptions, and the map from the page's keys to the spec's settings. SPEC.md says what the mechanism does; this file says what a member is told when it does it, and what pressing a control does. Reasoning is in `design/DECISIONS.md`. Born 2026-08-22 in spec pass 1 (Q542), lifted from CLAUDE.md's glossary; `npm run spec-check` asserts the matrix's keys against the page's own maps.

Vocabulary: **audience** — nobody / the actor / one member / every member owed / the membership / invitees / strangers. **channel** — rail entry · clause in the band · card · gutter tab · topbar · wallet · mail · record. **ask** — nothing / OK / an answer / a judgment / a draft. **close** — what makes the card go. **persistence** — leaves the rail / stays in the clause / reaches the record / remembered per seat.

## 1. Rules

- **C1 Whatever the document wants from you goes in the rail, and everything that wants something is a card.** A card opens only on the user's click — nothing on the surface opens itself, arrival included — and it replaces the clause it is about, taking its tab with it; the tab you click does not move.
- **C2 A card closes when its answer becomes the document's** — set, saved, answered, acknowledged, judged, discarded — **and stays open while it is still the place the thing lives.** Discarding closes it too: the discard is a finished act and the close is its receipt.
- **C3 Closing is not discarding.** Every provisional value — a radio, a number, a draft, the title lane, the invitation boxes — lives in `S` until 🗑️ takes it; 🗑️ puts back only what the open card can write, and never touches a value already set.
- **C4 One commit row.** 🗑️ at the left, always live, on every card. At the right: ✒️ where the act is a set of your own (the power tabs included), ✓ where it is an answer, a judgment, or anything about yourself (*Save*), **✏️ Propose** / **🏛️ Hold to ask everyone** where it is a motion, **OK** where the card asks only to have been seen. Every control on the row shares one height and one disabled look. The hold ladder: 🪶 and ✒️ one second, ✏️ the length of its flight, 🏛️ ten seconds (the `assembly-press`: the members' avatars convene in a circle around the control, so the assembly is the progress meter; release early and it disperses, nothing sent).
- **C5 Opening focuses the main decision** — the first interactive control in the card's own order (the chosen option within a group), never the commit row; focus is never a press; `preventScroll`. A card asking for words puts the caret after any text already there.
- **C6 Exactly four kinds of entry pin**: 🔥, an unacknowledged decision, a proposal of your own, a prioritisation — what is about *you*. Everything else stands beside its clause and scrolls with it. What does not fit is not shown; admission is ranked by urgency and never thresholded.
- **C7 Hot for actions, cold for information.** Yellow and pink want something from you; blue and grey tell you where things stand; grey means nothing is asked of you. `--ok`'s green never leaves a card interior.
- **C8 A decision you had no say in is owed an OK; reading is not enough.** Nothing is owed before the start; the lapsed are owed it too.
- **C9 No power arrives without acknowledgement, and is not held until acknowledged.** An offer you cannot take is not shown; a question you may not answer is not shown at all — filtered at ingest, never at each render site. Re-asked on every not-held → held transition.
- **C10 The document reads identically to every reader; only their tasks differ.** The constitution's sentences are third person; attributions name the office (*The Founder …*), never the name, except the founder's own rationale on a pen act, which is attributed by construction. One sanctioned exception: you are at the top of the members list.
- **C11 A first decision is not a change. A change carries a reason and says who made it** — the founder on the card, everybody else told what changed and reading it. A long value is shown on two aligned lines, never narrated.
- **C12 Blind while running.** A founding question or a constitutional motion shows only the count of answers; a race shows no standings and no direction; a cleared race is never shown waiting.
- **C13 A task you have to do carries no subtitle**; a motion's subtitle is the value proposed, news's is what happened.
- **C14 The founding runs in single file**, one clause per step, in the document's own order (🪶 📍 📧, then the constitution's sections); a gate holds its place without blocking; ✒️ blocks; each answer lands as its own fading clause.
- **C15 Mail rides the fold** for every event a member is owed off-surface — the verification mail, the lapse warning and package, the close — and the link is the login. Nothing else mails (Q575).
- **C16 The topbar reads the document · the room · you**: 🪶 and the title; the pulse, the session clock, quorum; your wallets and `me`. Every wallet is a socket, shown to everybody from the start, struck when not held, empty when spent.

## 2. The event matrix

<!-- spec-check: events -->
| # | Event | Audience | Channel | Ask | Close | Persistence | Keys |
|---|---|---|---|---|---|---|---|
| E1 | A founding question opens (delegated) | every arrived member, founder if a member | rail ask entry; task paragraph under the watching clause | an answer | ✓ | entry leaves; card shows the count; revisable until resolved | chamber policy lapse removal ending bar quorum authorship signing judgments rate machines |
| E2 | A founding question resolves | everyone who answered | clause; distribution strip | nothing (pre-start: no OK owed) | — | clause states the rule | — |
| E3 | A setting is set pre-start | nobody | clause fades in | nothing | — | clause | title slug text hat myname mypic roster |
| E4 | The document begins 🍾 | every member | 💡 ⚖️ gate news cards, 🏛️ grant, ✏️ storm, the Founded line | OK each | OK | `ACK_KEYS` per seat; grants staged behind the constitutional OKs | begin canpropose canjudge grant-voice |
| E5 | A constitutional setting set or changed post-start (pen or carried) | every member who had no say, lapsed included | news entry pinned ✔; clause change line (was / now, who, why) | OK | OK | clause keeps *Last amended*; the record's Amendments | — |
| E6 | An ordinary setting first set | nobody | clause | nothing | — | clause | — |
| E7 | An ordinary setting changed | as E5 | as E5; no mail | OK | OK | as E5 | — |
| E8 | A power arrives | the holder | news entry, wallet flight | OK | OK | per seat; re-asked on each not-held → held | grant-pen grant-shield grant-voice canpropose |
| E9 | A power is laid down | the actor; every member | the power card; **news entry owed an OK** (Q571); clause deviation vanishes | OK | on commit / on OK | clause; record | — |
| E10 | A constitutional motion is put (invitations and removals included) | every active member | the setting's own card, live again; rail ask | accept / keep / abstain | ✓ — answered entry leaves; tab keeps its glyph | carried → E5 | invite remove |
| E11 | An ordinary motion is put | whoever the router serves | race card | a judgment | ✓ — closes and files ⏳ (Q576) | → E5 / E14 | — |
| E12 | A 👑 question | the founder | news-pinned task, Accept / Reject | Accept / Reject | on commit | record | — |
| E13 | A text race wants a judgment | whoever the router serves | 💡 / 🔥 entry at the clause, gutter tab | a judgment | ✓ — closes; ⏳ tab is the way back to revise (Q576) | ⏳ until the seal | — |
| E14 | A race seals, the document changed | every member | ✔ green pinned; clause | OK | OK | grey ✔ filed; record | — |
| E15 | A race seals, the incumbent held | members who judged it | ✖ green, pins only if you judged | OK | OK | grey ✖ filed | — |
| E16 | The ground shifted under your judgment | the judge | ↻ receipt | nothing; the pair is re-served | — | — | — |
| E17 | A race deadlocks | each member, once it has nothing left to ask them | ⚔️ entry ranked by bounty | a draft | — | — | — |
| E18 | A salience diagonal | a member with an empty queue, below 2E | 🌶️ card, served not offered | which matters more | ✓ | no progress state | — |
| E19 | A proposal of your own | the author | ✏️ card, then one line; pinned | withdraw is the remaining act | Propose (stays pinned) | ✏️ throughout | — |
| E20 | Somebody arrives during the founding | founding answerers (ground shift) | **an acknowledgement task on their own answer card, marked ↻** — *one more member has arrived; your answer stands* (Q567, Q572); no mail | OK, revising optional | OK | register | roster |
| E21 | An application is submitted | the membership | Applicants block on 🪪; admit race | a judgment | — | record | apply appmail appname apppic apptext |
| E22 | A membership is about to lapse / lapses | the member | mail: warning, then the package | nothing; revival is logging in | — | — | — |
| E23 | The document freezes | every member | the session clock, *Frozen — n must return*; **nothing else** (Q573) | return | — | proposals made while frozen park and reach the record | — |
| E24 | The document closes | every member and invitee | 🥂 card per member; mail with the record link; the closed page — *its communication is undesigned beyond this: Q463* | OK = sign, with a comment | OK | record, signatures | closing |
| E25 | A stranger arrives | strangers | holding sentence, redacted bars, 📧 Log In / Apply | an address | on send | — | strlogin strapply |
| E26 | A verification mail | the actor | mail; the card | follow the link | on send; re-opens on refusal (Y2) | — | myemail appmail |
| E27 | Anybody acts | everybody | room-pulse | nothing | — | — | — |
| E28 | An adoption lands | everybody | **gazette + chime — unbuilt** (Q465) | nothing | — | — | — |
| E29 | The floor recomputes | everybody | **gazette — unbuilt** (Q465) | nothing | — | — | — |
| E30 | Digest: dominated / nearing resolution / deadlocked | the author / the judge | **§8.4 digest — unbuilt** (Q465) | — | — | — | — |

The card lifecycle, as the rows of the matrix a single card passes through:

| # | Event | Audience | Channel | Ask | Close | Persistence |
|---|---|---|---|---|---|---|
| L1 | A setting of yours is set (✒️) | the actor | the card | a value (+ reason once it is a change) | on commit | clause states the rule; tab goes grey |
| L2 | An answer about yourself is saved (✋🖼️📧) | the actor | the card | a value | on Save | your member row |
| L3 | A blind question is answered | the actor | the card | an answer | on ✓ | entry leaves the rail; card shows the count; revisable until resolved |
| L4 | A judgment is cast | the actor | the card | A / B / indifferent | on ✓ — files as ⏳; the tab reopens it to revise (Q576) | ⏳ in the gutter until the race seals |
| L5 | A motion is committed | the actor | the card | value + rationale | on Propose / on the 🏛️ hold | ✏️ entry pinned (ordinary); answered 🏛️ leaves the rail |
| L6 | 📧 send | the actor | the card, then mail | an address | on send; **re-opens on refusal** (Y2) | the clause: *checking their email* |
| L7 | A decision you are owed | each member owed it | news entry pinned, clause | OK | on OK | clause keeps the change line permanently; OK persisted per document and member |
| L8 | A power arrives | the holder | news entry, wallet flight | OK | on OK | `ACK_KEYS` per seat; re-asked on every not-held → held |
| L9 | 🗑️ | the actor | the card | nothing | always | un-actioned input reverted; set values untouched |

## 3. Exceptions

| # | What | Rule | Why | Ruling |
|---|---|---|---|---|
| Y2 | 📧 closes on send and re-opens on refusal | C2 | a refusal has nowhere else to be read | 2026-08-21 |
| Y3 | ⏳ survives only where the wait is about you (📧, a gate, 🍾); a constitutional card waiting on the room keeps its glyph and leaves the rail | marks | the tab says the rule, the queue says nothing | 2026-08-21 |
| Y4 | A gate holds its place in the order without blocking it; ✒️ blocks; 🏛️ does not | C14 | everything below ✒️ is committed with the pen it hands over | 2026-08-22 |
| Y5 | The gate clauses wait for 🍾 | C14 | 🍾 is where they are decided | Q529 |
| Y6 | A gate opening is owed an OK even pre-start | C8 | a thing that happened, not a rule that was set | Q414 |
| Y7 | The ✒️/🛡️ power tabs are exempt from pen gating | C9 | laying a power down must stay possible | 2026-08-21 |
| Y8 | You are at the top of the members list | C10 | a membership starts as one person, reading this | 2026-08-21 |
| Y9 | The founder's rationale is not sealed | §3.4 | a ✒️ act is attributed by construction | 2026-08-22 |
| Y10 | A lapsed member is owed an OK though outside E | C8 | lapse is a stall, not a departure | 2026-08-22 |
| Y11 | 🍾 has no wallet; the cork flies | wallets | beginning is a moment, not a capacity | Q516 |
| Y12 | 🔥's entry carries no teaser while pinned | rail | it has been decided for you | — |
| Y13 | ✖ green pins only if you judged; filed keeps its direction | C6 | a decision announces itself if it changed the document or you are part of why it did not | — |
| Y14 | The diagonal is served, never offered, and draws no progress | C1 | no finish line exists | §8.3a |
| Y15 | The stranger's door has no provisional layer | C3 | it prints what the module holds | — |
| Y16 | The birth is its own phase: no heading, no sections, 📧 in the lead, the clause blank before the mail | C14 | nothing is being headed yet | 2026-08-21 |
| Y17 | The alpha flag is absent from the magic-link interstitial | alpha-flag | it would only flash | — |
| Y18 | A clause is not a button; the gutter tab is the only way into a card from the document | C1 | clicking a clause puts a caret in it | — |

Y1 — *a submitted judgment does not close its card* — was retired by Q576 (Ed, 2026-08-22): a judgment closes and files as ⏳ like every other commit, and the ⏳ tab is the way back to revise. **Not yet built**; recorded in QUESTIONS.md.

## 4. Page keys

The page speaks its own keys; the spec speaks the catalogue's ids. This table is the map (`MID` in `session-view.html` carries the non-identical pairs), and the checker asserts it.

<!-- spec-check: keys -->
| page key | setting |
|---|---|
| title | title |
| slug | link |
| text | startingText |
| ending | ending |
| bar | bar |
| pace | pace |
| quorum | quorum |
| authorship | authorship |
| signing | signing |
| judgments | judgments |
| chamber | chamber |
| rate | rate |
| lapse | lapse |
| removal | removal |
| machines | machines |
| roster | membership |
| policy | applications |
| myname | displayName |
| mypic | picture |

Keys that are not settings: `hat` `myemail` `begin` (SPEC §9.7.1, decisions that are not settings); `grant-pen` `grant-shield` `grant-voice` `canpropose` `canjudge` (grants and gates); `invite` `remove` (doors); `apply` `appmail` `appname` `apppic` `apptext` (the applicant's seat); `strlogin` `strapply` (the stranger's door); `closing`.

## 5. Things the spec used to say about the surface

Relocated here from SPEC.md in spec pass 1 (finding 568), with the spec keeping a pointer:

- **How a constitutional motion is put** — a full ten-second hold on 🏛️ in which the members' avatars convene in a circle around the control; the assembling circle is the progress meter; release early and nothing is sent (C4).
- **The head of the document** — the Constitution block carries the founder, the constituted-at time (*Founded by [name] 👑 at [time] on [date]*) and every setting's current value as a clause, governance stated by deviation under the Proposals preamble.
- **The 👑 question** — a task of its own kind on the founder's surface: news-pinned, Accept / Reject as its commit row (E12).
