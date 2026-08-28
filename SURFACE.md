# SURFACE — what the surface tells a member, and what a control does

The communication rules of the one page (`design/session-view.html`), as a matrix — **event × audience × channel × ask × close × persistence** — plus the rules that quantify over it, the exceptions, and the map from the page's keys to the spec's settings. SPEC.md says what the mechanism does; this file says what a member is told when it does it, and what pressing a control does. Reasoning is in `design/DECISIONS.md`. Born 2026-08-22 in spec pass 1 (Q542), lifted from CLAUDE.md's glossary; `npm run spec-check` asserts the matrix's keys against the page's own maps.

Vocabulary: **audience** — nobody / the actor / one member / every member owed / the membership / invitees / strangers. **channel** — rail entry · clause in the band · card · gutter tab · topbar · wallet · mail · record. **ask** — nothing / OK / an answer / a judgment / a draft. **close** — what makes the card go. **persistence** — leaves the rail / stays in the clause / reaches the record / remembered per seat.

## 1. Rules

- **C1 Whatever the document wants from you goes in the rail, and everything that wants something is a card.** A card opens only on the user's click — nothing on the surface opens itself, arrival included — and it replaces the clause it is about, taking its tab with it; the tab you click does not move.
- **C2 A card closes when its answer becomes the document's** — set, saved, answered, acknowledged, judged, discarded — **and stays open while it is still the place the thing lives.** Discarding closes it too: the discard is a finished act and the close is its receipt.
- **C3 Closing is not discarding.** Every provisional value — a radio, a number, a draft, the title lane, the invitation boxes — lives in `S` until 🗑️ takes it; 🗑️ puts back only what the open card can write, and never touches a value already set.
- **C4 One commit row.** 🗑️ at the left, always live, on every card but the five Y20 lists. At the right: ✒️ where the act is a set of your own (the power tabs included), ✓ where it is an answer, a judgment, or anything about yourself (*Save*) — or, on the direct ✉️ and the applicant's cards, simply *done here*, the act having been performed in the body — **✏️ Propose** / **🏛️ Hold to ask everyone** where it is a motion, **OK** where the card asks only to have been seen. Every control on the row shares one height and one disabled look. The hold ladder: 🪶 and ✒️ one second, ✏️ the length of its flight, 🏛️ ten seconds (the `assembly-press`: the members' avatars convene in a circle around the control, so the assembly is the progress meter; release early and it disperses, nothing sent).
- **C5 Opening focuses the main decision** — the first interactive control in the card's own order (the chosen option within a group), never the commit row; focus is never a press; `preventScroll`. A card asking for words puts the caret after any text already there.
- **C6 Four kinds of entry pin for what they are** — 🔥, an unacknowledged decision, a proposal of your own, a prioritisation — what is about *you* — **and the open entry pins for being open.** Everything else stands beside its clause and scrolls with it. What does not fit is not shown and not counted; admission is ranked by urgency and never thresholded; 🔥, the open entry and anything of your own are exempt from the cap (§6).
- **C7 Hot for actions, cold for information.** Yellow and pink want something from you; blue and grey tell you where things stand; grey means nothing is asked of you. `--ok`'s green never leaves a card interior.
- **C8 A decision you had no say in is owed an OK; reading is not enough.** Nothing is owed before the start; the lapsed are owed it too.
- **C9 No power arrives without acknowledgement, and is not held until acknowledged.** An offer you cannot take is not shown — except the ✒️ commit, which stays dark and names where the pen is (Y19); a question you may not answer is not shown at all — filtered at ingest in the charter (`withheld`) and by `visible` in the band, never at each render site. Re-asked on every not-held → held transition.
- **C10 The document reads identically to every reader; only their tasks differ.** The constitution's sentences are third person; attributions name the office (*The Founder …*), never the name, except the founder's own rationale on a pen act, which is attributed by construction. One sanctioned exception: you are at the top of the members list.
- **C11 A first decision is not a change. A change carries a reason and says who made it** — the founder on the card, everybody else told what changed and reading it. A long value is shown on two aligned lines, never narrated.
- **C12 Blind while running.** A founding question or a constitutional motion shows only the count of answers; a race shows no standings and no direction; a cleared race is never shown waiting.
- **C13 A task you have to do carries no subtitle**; a motion's subtitle is the value proposed, news's is what happened.
- **C14 The founding runs in single file**, one clause per step, in the document's own order (🪶 📍 📧, then the constitution's sections — §8); **a grant or gate holds its place without blocking and stands beside the current question**; ✒️ blocks; each answer lands as its own fading clause. A member's answer tasks ride the same order (Q619).
- **C15 Mail rides the fold** for every event a member is owed off-surface — the verification mail, the lapse warning and package, the close, and exile — the one event whose audience is outside the document (E31), so its link is the document's address and not a login — and otherwise the link is the login. Nothing else mails (Q575).
- **C16 The topbar reads the document · the room · you**: 🪶 and the title; the pulse, the session clock, the quorum reading and the faces of everybody else who has arrived; your wallets and `me`. The row is the register's arrived rows minus your own — yours is `me` — capped, the excess counted as `+n`, and the head count it replaced survives as its title. **A face there says only that somebody is present**: never what they are doing, never which way (§3.5), never whose a proposal is (§3.5a). Before the start the row is the whole of what the middle says about the room; from 🍾 the quorum reading stands beside it, and that count is the electorate's where the row is the register's. Every wallet is a socket, shown to everybody from the start, struck when not held, empty when spent.

## 2. The event matrix

<!-- spec-check: events -->
| # | Event | Audience | Channel | Ask | Close | Persistence | Keys |
|---|---|---|---|---|---|---|---|
| E1 | A founding question opens (delegated) | every arrived member, founder if a member | rail ask entry; task paragraph under the watching clause | an answer | ✓ | entry leaves; card shows the count; revisable until resolved | chamber applications lapse removal ending bar quorum authorship judgments rate machines |
| E2 | A founding question resolves | everyone who answered | clause; distribution strip | nothing (pre-start: no OK owed) | — | clause states the rule | — |
| E3 | A setting is set pre-start | nobody | clause fades in | nothing | — | clause | title slug shape text hat myname mypic admission |
| E4 | The document begins 🍾 | every member | 💡 ⚖️ gate news cards, the Founded line; 🏛️ for anybody not yet handed a voice (E8) | OK each | OK | `ACK_KEYS` per seat; grants staged behind the constitutional OKs | begin canpropose canjudge |
| E5 | A constitutional setting set or changed post-start (pen or carried) | every member who had no say **and arrived when it was set**, lapsed included; a later joiner reads it as the document | news entry pinned ✔; clause change line (was / now, who, why) | OK | OK | clause keeps *Last amended*; the record's Amendments | — |
| E6 | An ordinary setting first set | nobody | clause | nothing | — | clause | — |
| E7 | An ordinary setting changed | as E5 | as E5; no mail | OK | OK | as E5 | — |
| E8 | A power arrives | the holder | news entry, wallet flight (the ✏️ storm from 💡's OK, per member); 🏛️ arrives with the first blind question you are asked (Q605) | OK | OK | per seat; re-asked on each not-held → held | grant-pen grant-shield grant-voice canpropose |
| E9 | A power is laid down | the actor; every member | the power card; **news entry owed an OK** (Q571); clause deviation vanishes | OK | on commit / on OK | clause; record | — |
| E10 | A constitutional motion is put — an invitation or removal too, where 🪪 / 🥾 stands at *assembly* (entry 94) | every active member | the setting's own card, live again; rail ask | accept / keep / abstain | ✓ — answered entry leaves; tab keeps its glyph | carried → E5 | invite remove |
| E11 | An ordinary motion is put — an invitation or removal too, where 🪪 / 🥾 stands at *proposal* (entry 94) | whoever the router serves | race card | a judgment | ✓ — closes and files ⏳ (Q576) | → E5 / E14 | invite remove |
| E12 | A 👑 question | the founder | news-pinned task, Refuse / Accept | Refuse / Accept | on commit | record | — |
| E13 | A text race wants a judgment | whoever the router serves | 💡 / 🔥 entry at the clause, gutter tab | a judgment | ✓ — closes; ⏳ tab is the way back to revise (Q576) | ⏳ until the seal | — |
| E14 | A race seals, the document changed | every member | ✔ green pinned; clause | OK | OK | grey ✔ filed; record | — |
| E15 | A race seals, the incumbent held | members who judged it | ✖ green, pins only if you judged | OK | OK | grey ✖ filed | — |
| E16 | The ground shifted under your judgment | the judge | ↻ receipt | nothing; the pair is re-served | — | — | — |
| E17 | A race deadlocks | each member, once it has nothing left to ask them | ⚔️ entry ranked by bounty | a draft | — | — | — |
| E18 | A salience diagonal | a member with nothing else to judge, once the document holds at least E live questions | 🌶️ card, served not offered | which matters more | ✓ | no progress state | — |
| E19 | A proposal of your own | the author | ✏️ card, then one line; pinned | withdraw is the remaining act — **unless nobody else in the room could judge it** (Q835): where every member of the race is an author, at E = 1 always, the judgment is offered beside the withdrawal | Propose (stays pinned) | ✏️ throughout | — |
| E20 | Somebody arrives during the founding | founding answerers (ground shift) | **an acknowledgement task on their own answer card, marked ↻** — *one more member has arrived; your answer stands* (Q567, Q572); no mail | OK, revising optional | OK | register | admission |
| E21 | An application is submitted | the membership | a row under *Applicants*, and its own admit card in that subsection's pile (entry 96) | **at 🪪's price**: a judgment at *proposal* (a race) · an answer at *assembly* (a 🏛️ question) · **nothing at *pen*, where it is news** — they are already in, so the card reports and asks only to have been seen | ✓, or OK where it is news | record | apply appmail appname apppic apptext |
| E22 | A membership is about to lapse / lapses | the member | mail: warning, then the package | nothing; revival is logging in | — | — | — |
| E23 | The document freezes | every member | the session clock, *Frozen — n must return*; **nothing else** (Q573) | return | — | proposals made while frozen park and reach the record | — |
| E24 | The document closes | every member and invitee | 🥂 card per member; mail with the record link; the closed page — *its communication is undesigned beyond this: Q463* | OK = sign, with a comment | OK | record, signatures | closing |
| E25 | A stranger arrives | strangers | holding sentence, redacted bars, 📧 Log In / Apply | an address | on send | — | strlogin strapply |
| E26 | A verification mail | the actor | mail; the card | follow the link | on send; re-opens on refusal (Y2) | — | myemail appmail |
| E27 | Anybody acts | everybody | room-pulse | nothing | — | — | — |
| E28 | An adoption lands | everybody | **gazette + chime — unbuilt** (Q465) | nothing | — | — | — |
| E29 | The floor recomputes | everybody | **gazette — unbuilt** (Q465) | nothing | — | — | — |
| E30 | Digest: dominated / nearing resolution / deadlocked | the author / the judge | **§8.4 digest — unbuilt** (Q465) | — | — | — | — |
| E31 | A member is exiled at will (❌'s ✒️ — immediate, and every answer they were standing on leaves with them) | the removed member; every member | mail (the document's address, no login link) and, on their next visit, the door's departure sentence — by the office, with the date, whatever 🌍 says; every member: a departure line under *Members*, grey (Q901) | nothing | — | the register's text: the closed page and the record | remove |
| E32 | A member resigns (*Leave* — free, immediate, nobody's to refuse) | the member; every member | the door's departure sentence on their next poll; every member: the departure line under *Members* (Q901) | nothing | — | as E31 | — |
| E33 | An application is refused at the door — 🤝 shut after the applicant verified but before they submitted (entry 97) | the applicant | one sentence under Submit, before the press (`applyOpen`) and after it (the wire's refusal), Y25's shape; Submit dark; the task reads *Applications closed* (Q901) | nothing | retired when the door opens again, or on a keystroke | — | apply |
| E34 | An invitation mail gave up — the outbox's attempt cap reached, the token revoked (Q947 (c), backlog 173) | the founder; every member — **never the invitee**, who is exactly the person the mail could not reach | **unbuilt**: the founder's ✉️ row under *Invitees* says *that did not send*, with 📨 re-send beside it; every member: one news card stating the address that could not be reached, OK closes | nothing | the row line: on a re-send that sends; the news card: OK | the row line stands until re-sent or withdrawn | invite |

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
| Y4 | ✒️ is the one grant that blocks the order | C14 | everything below ✒️ is committed with the pen it hands over | 2026-08-22 |
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
| Y19 | The ✒️ commit under an unacknowledged pen stays, dark, with *Your pen is waiting in your tasks* | C9 | a dark commit naming where the pen is tells more than an absent one | Q622 |
| Y20 | The sealed record and the backlog card have no 🗑️; 📄 Text has no 🗑️; the 👑 question has Refuse / Accept and no 🗑️; the stranger's and applicant's email cards commit in the body; the applicant's Apply opens with *Begin* | C4 | nothing to put back, or the two answers are the whole act, or the door has no provisional layer | Q613; 📄 Q744 |
| Y21 | 🍾's clause **is** the Proposals preamble, and heads the section while its task is last in the order | C14 | pressing 🍾 is what makes the preamble's first sentence true, so the tab belongs on it | Q616; Ed 2026-08-22 |
| Y22 | ↻ is a character, styled as a drawn mark | §6 | it has no partner whose weight it must equal | — |
| Y23 | The Proposals opening is **one clause carrying four tabs** (🍾 💡 ⚖️ 🏛️): the gates and the voice grant contribute fragments, not paragraphs, and each joins the stack as it arrives | C14 | the four state one rule together — how a rule changes, and who may take part — so four stubs claimed four decisions where there is one | Q748–Q751 |
| Y24 | ✉️'s invitation field is drawn **only where the viewer's own word sends** (`directInvite`): the founder before the start; after it the founder while the **door's** ✒️ is held — `membershipReserved()`, which is `invite()`'s own test — and **any member while 🪪 stands at *pen***. Where it is not, the card composes the invitation as a motion at 🪪's price instead. And the field's send wears **✒️**, the mark of the word that sends — so the row is left with nothing to commit and only closes (§9.1) | C1 | a control that cannot act is worse than an absent one; the 🛡️ only refuses, so it can never open a door; the mark goes where the act is | Q812–Q813, entry 94, entry 37; §9.6a, R-048 |
| Y25 | An invite, uninvite or motion the document refuses says so in **one sentence under the control that tried**, retired by the next keystroke — the module's own `(§…)` pointer dropped | C4 | every act on these cards was fire-and-forget, so a refusal and a success looked identical | Q811, Q815; backlog 51 |
| Y26 | A 💤 change that returns lapsed members **names them in its own change line** — the change is the news (E5), and who it put back is part of what changed. **Unbuilt** | C11 | a rule change that silently re-populates the electorate is a fact about people, not only about the rule | Ed, 2026-08-26 (Q902); §9.5a, entry 97 |

Y1 — *a submitted judgment does not close its card* — was retired by Q576 (Ed, 2026-08-22) and built the same day: a judgment closes and files as ⏳ like every other commit, and the ⏳ tab is the way back to revise. Y3 (⏳ survives where the wait is about you) became the wait row of §6's setup alphabet in pass 2 (Q624).

## 4. Page keys

The page speaks its own keys; the spec speaks the catalogue's ids. This table is the map (`MID` in `session-view.html` carries the non-identical pairs), and the checker asserts it.

**Two pairs stopped being asymmetric** (Q903, Ed 2026-08-26). 🪪's id was `membership` and its page key `roster`, both naming the register it stopped being at entry 94; 🤝's page key was `policy`, naming a four-rung ladder that is now one switch. Both are now `admission` and `applications` on either side, so `MID` carries neither, and a log written under the old id folds at load (`foldLegacyIds` in `session.ts`). The page's word `'roster'` still means *the membership holds this setting* — that is the delegation sentinel, not a key.

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
| judgments | judgments |
| chamber | chamber |
| rate | rate |
| lapse | lapse |
| removal | removal |
| machines | machines |
| admission | admission |
| applications | applications |
| myname | displayName |
| mypic | picture |

Keys that are not settings: `hat` `myemail` `begin` (SPEC §9.7.1, decisions that are not settings); `grant-pen` `grant-shield` `grant-voice` `canpropose` `canjudge` (grants and gates); `invite` `remove` (doors); `apply` `appmail` `appname` `apppic` `apptext` (the applicant's seat); `strlogin` `strapply` (the stranger's door); `closing`.

## 5. Things the spec used to say about the surface

Relocated here from SPEC.md in spec pass 1 (finding 568), with the spec keeping a pointer:

- **How a constitutional motion is put** — a full ten-second hold on 🏛️ in which the members' avatars convene in a circle around the control; the assembling circle is the progress meter; release early and nothing is sent (C4).
- **The head of the document** — the Constitution block carries the founder, the constituted-at time (*Founded by [name] 👑 at [time] on [date]*) and every setting's current value as a clause, governance stated by deviation under the Proposals preamble.
- **The 👑 question** — a task of its own kind on the founder's surface: news-pinned, Refuse / Accept as its commit row (E12) — *refuse* is the Founder's word, *reject* the membership's.

## 6. The marks alphabet and the rail

One glyph per entry, the same alphabet in all three columns (contents rail · gutter · queue). A mark says what the document wants **from you**, never what state the machine is in. Kind names are the code's (`markKindOf` in session.js, `MARK` in cards.js); the checker asserts the kind set, which are drawn, which pin, which are exempt from the cap, and that every kind has a place in both orders. Lifted from CLAUDE.md in spec pass 2 (Q585).

<!-- spec-check: marks -->
| mark | kind | wants | hue | pins? | teaser? | columns | opens | drawn? | exempt? |
|---|---|---|---|---|---|---|---|---|---|
| 💡 | needs | your judgment | open, alpha by urgency | no | the rationale(s) | rail · gutter · queue | the decision card | no | no |
| 🔥 | urgent | your judgment, most | open at `FLAME_A` 0.44 | yes | hidden while its clause is off screen (Y12) | all three | the decision card, ❄️ on its row | no | yes |
| ⚔️ | stuck | a draft, not a judgment; seen only once you have judged | open, fixed 0.55 | no | the deadlock sentence | all three | the deadlock card | no | no |
| 🌶️ | weigh | which of two questions is hotter | weigh | yes | none; the title over four lines | queue (one entry, at the earlier clause) · gutter · rail | the salience diagonal | no | no |
| ⏳ | deciding | nothing — you have judged; revisable | deciding (grey) | no | one line | all three | the card, revisable | no | no |
| ↻ | shifted | nothing — that judgment is void; the pair is re-served | closed (grey; Q612) | no | one line | all three | the card, with the wording you judged against | yes (Y22) | no |
| ✔ green | adopted | an OK — the charter changed here | changed | yes | one line + when | all three | the sealed record, OK | yes | no |
| ✖ green | retired | an OK — the incumbent held; pins only if you judged (Y13) | closed wash, green glyph | if unread | one line | all three | the sealed record, OK | yes | no |
| ✔ grey | filedYes | nothing; filed, the charter changed | none | no | no | gutter (the filed pile) · queue | the sealed record | yes | no |
| ✖ grey | filedNo | nothing; filed, the incumbent held | none | no | no | gutter · queue | the sealed record | yes | no |
| ⏸ | filedUndecided | nothing; undecided at the close | none | no | no | gutter · queue | the record card | yes | no |
| ✏️ | propose | nothing — withdraw is the remaining act | yours | yes | draft: the rationale as you type; proposed: one line | all three | your proposal | no | yes |

**The setup alphabet** (`stateOf` / `markOf`, setup.js) — five states, tested in the order yours · news · wait · ask · done. A setup entry's wash takes the same urgency ramp as a charter entry's, from its own `RAIL_U` (Q623).

| state | rail mark | tab mark | wants | hue | in the rail? | pins? | opens |
|---|---|---|---|---|---|---|---|
| ask | the subject glyph | the subject glyph | an answer or a set | open, by urgency | yes | yes | the setting's card |
| wait | ⏳ **only where the wait is about you** (📧, a gate, 🍾); a constitutional card waiting on the room keeps its glyph and leaves the rail — the tab says the rule, the queue says nothing | ⏳, or the glyph | nothing; fill = how far the room has got | closed | only where the wait is about you | no | the watching card |
| news | drawn ✔; **a grant wears the glyph of the power it grants** (✒️ 🛡️ 🏛️, and ✏️ on 💡 — entry 180) | drawn ✔; **a grant wears the glyph of the power it grants** | OK, or the take | changed | yes | yes | the news card |
| yours | ✏️ | ✏️ | nothing — withdraw | yours | yes | yes, force-kept | the application |
| done | drawn grey ✔, and it leaves | **the subject glyph** on grey | nothing | closed | no | — | the settled card (= the composer) |

🪜 is not a lifecycle mark: it is the **subject glyph** of the pace card — an emoji like every other subject glyph since the rename of 2026-08-22, which retired the drawn incline it used to wear.

### 6.1 Rail rules

- **M1 Four kinds of entry pin for what they are, and the open entry pins for being open** (C6).
- **M2 Admission is a ranking by leverage, never a threshold.** Nothing is too unimportant to appear; the rail runs out of room; what does not fit is not shown and not counted.
- **M3 Three things are exempt from the fit cap: 🔥, the open entry, anything of your own.**
- **M4 The open entry's claim on its clause's line is absolute**; entries that cannot fit around it are dropped, never displace it.
- **M5 Pinned entries sit at their clause while it is visible and pile against the band edge in document order.** The flow population steps around pinned blocks rather than hiding under them.
- **M6 Ties at one clause break by the tab stack's order, then leverage — one comparator for both columns.**
- **M7 Leverage is judgment leverage, with three floors for what a judgment cannot measure**: an unread decision 0.5 (the middle), a deadlocked race `0.9 + 0.1·bounty` (the top), a diagonal `max(urgency, 0.75)`.
- **M8 🔥 is the most urgent `needs` entry that is not ⚔️, not 🌶️ and not chilled**; ❄️ toggles chilled.
- **M9 A teaser is always in the markup and hidden in one case — the flame with its clause off screen — tested on the anchor's position, never the entry's.**
- **M10 The contents rail shows at most four marks per heading, chosen by `KEEP_ORDER` (retention: what must not be lost), drawn in document order, `+n` for the rest; filed marks are absent from it, never counted.** A heading holding exactly one question opens it.
- **M11 The stack's front is what most wants you (`STACK_ORDER`: priority), and that is deliberately not `KEEP_ORDER`** — ✏️ is third for retention and seventh for priority.
- **M12 The strip does not reorder; the pile opens only its front tab, index 0 in both.** Slivers carry hue, not a count, and are inert; the pile is fitted by `fitStacks`, never fixed.
- **M13 Filed decisions are their own pile at the bottom of the open strip, newest first, off the closed gutter; decided-but-unread is not filed; a pile never closes over the card you are reading.**
- **M14 A decision announces itself if it changed the document, or if you are part of why it did not.**
- **M15 Code keys on the mark kind, never the character** — two kinds share ✔, two share ✖.
- **M16 ⚔️ is tested before ⏳ everywhere**, being the state that replaces it.

Exceptions to these, beyond §3: ⚔️ ranks on bounty near the top though its urgency is nil (M7 · drafting leverage is maximal · Q223); the diagonal's floor (M7 · its urgency buried it · 2026-08-17); ✖ green washes grey with a green glyph (green is for what changed, not for what pinned itself); 🌶️ is one entry at the earlier clause (M5 · one judgment about two questions · Q277); a draft started on the ⚔️ desk has no rail entry until proposed (the desk is on the card you are looking at); setup `ask` wears the subject glyph (a rail of many questions in one state — the informative mark is *which*); a grant's news wears the power's glyph (the press takes something, where every other news only wants to have been seen — entry 180); a setup 🔥 does not exist (single file, every question mandatory); the applicant's done tasks stay in the rail (its four tasks are the whole surface).

## 7. The wallets, the sockets, the holds

Every power is an object you hold, kept where you can see it, spent by flying it. The four verbs are a ladder of who has to agree; the founding answers are a kind of 🏛️. Lifted from CLAUDE.md in spec pass 2.

<!-- spec-check: wallets -->
| wallet | verb | who has to agree | socket | quantity | hold ms | grant key | arrives | flight |
|---|---|---|---|---|---|---|---|---|
| 🪶 quill | founding | nobody — nothing exists yet | quill | 4 feathers; 3 spent on the birth (title, link, the send), the 4th permanent and is the logo | 1000 | — | by navigating to docs.vote; no task | feather → button; home on release |
| ✒️ pen | drafting | nobody — you hold the power | penwallet | one, perpetual, never spent; ∞ in the count slot | 1000 | grant-pen | the save · *You founded this document, and the pen came with it* / *The membership returned the pen to you* | pen → button; the take → socket; farewell → 🥂 |
| 🛡️ shield | the pen's other half | nobody — a refusal power | shieldwallet | one, perpetual; ∞ | — | grant-shield | the save · *…the shield came with it* / *…returned the shield* | the take → socket; farewell → 🥂 (Q621) |
| ✏️ propose | proposing | enough of the room, at the threshold | wallet | many; 1 per Propose, refunded whole on withdraw, dripped on real minutes, capped; past four, three glyphs and +n | 3000 | canpropose | 🍾, per member at their OK · *The Founder began the document, granting every member the right to propose changes to it* | arc → button; the storm from the take; farewell storm → 🥂 |
| 🏛️ voice | consensus | all members | voicewallet | one at a time, returned whole | 10000 | grant-voice | with the first blind question you are asked (Q605) · four sentences by arrival | the take → socket; farewell → 🥂; the motion hold flies nothing — the assembly is the meter |
| 🍾 begin | a moment, not a capacity | the founder alone | — | — | 1000 | — | 🍾 is its own task | the cork → the document title |
| ⚖️ judge | a right, not an object | — | — | — | — | canjudge | 🍾 · *…granting every member the right to vote on what is proposed* | nothing flies |

### 7.1 Socket states

| state | class | look | when |
|---|---|---|---|
| not held | `notheld` | the tool greyed, a `--slash` strike on the socket, never inside the glyph | your role does not include it: stranger, applicant, clerk, a member before 🍾 or before the OK, the founder before the pen's OK |
| empty | `empty` | ✏️ only: muted, a countdown to the next | held, none left — **never struck** |
| count | `pencils` | up to four glyphs; past four, three glyphs and +n | ✏️ held |
| full | `full` | no countdown | at the cap |
| ∞ | `pmore` | the text ∞, never an `<i>` | ✒️ 🛡️ held |
| ghost | `gone` | `visibility: hidden`, the slot kept | a token is in the air, or a 🏛️ is out |
| gone | `gonewallet` | the socket absent | the closed page, after the farewell |
| bubble | `walletsay` | the socket's own title, under it | any press on a socket |

### 7.2 The hold ladder

An act that spends something out of a wallet is held, and its gravity is the length of the hold. A hold has to say so before it is held: the paying token leans toward the control on hover (`spend-preview`), and a short press always carries it at least a quarter of the way — a distance floor, not a jump — then home at a minimum rate (`short-press-nudge`).

<!-- spec-check: holds -->
| control | hold ms | quarter-way ms | what flies | early release |
|---|---|---|---|---|
| 🪶 commit (title, link, the send) | 1000 | 250 | the last feather | carried to the floor, hangs, rewinds at ×4 |
| ✒️ commit | 1000 | 250 | the pen | same |
| 🍾 Begin | 1000 | 250 | the cork, button → title | same |
| ✏️ Propose (a draft in the charter) | 3000 | 864 | the last drawn ✏️ | same |
| ✏️ Propose (a motion) | 3000 | 864 | the last drawn ✏️ (Q614) | same |
| 🏛️ Hold to ask everyone | 10000 | — | nothing — the members' avatars convene | disperses; nothing sent |
| the take (✒️ 🛡️ 🏛️ ✏️ Take …) | a click | — | the grant's object, the take → socket | — |

The refund flight and every grant's inbound flight take 640 ms.

### 7.3 Rules

- **W1 Every power is an object you hold, kept where you can see it, spent by flying it.** 🛡️ is in the toolbar but is not a verb: a refusal is not an act that spends, so it has no hold and nothing flies out of it.
- **W2 A member's power is limited in quantity and unlimited in scope; the founder's is unlimited in quantity and limited in scope.** Per-setting permission is a property of the lock (the ✒️ tab), never of the wallet.
- **W3 The quill line falls at the save**: the pen is issued when the URL goes live.
- **W4 No power arrives without acknowledgement, and is not held until acknowledged** (C9). `may* = can* && member && acked(k)`, and `may*` is the only thing a control may ask. Grants stage behind the constitutional OKs; each animation fires from that press, per member. 🪶 takes no task; `canjudge` is acknowledged but nothing flies.
- **W5 An acknowledgement covers this holding**: dropped only on a seen held → not-held transition, keyed by seat; re-asked on every not-held → held.
- **W6 Every acknowledgement that confers a power persists** — `ACK_KEYS` ⊃ `GRANT_KEYS`, one key per document and seat, live only.
- **W6a And so does an acknowledgement that confers none** — the 🪪 `pen` admit news, keyed `adm:<applicant>`. It confers no power, so W6 does not reach it; **C8 does** — a decision you had no say in is owed an OK, and an OK that comes back after every reload asks the same member to acknowledge the same joiner for ever. One key per joiner, so it is a family rather than a literal in `ACK_KEYS`: the page asks `ackPersists`. → why: Q912 (a).
- **W7 The pen blocks the founding order; no other grant or gate does** (Y4). The ✒️/🛡️ power tabs commit without the pen's acknowledgement (Y7).
- **W8 A grant says who gave it, in the office's name, third person, read from the record — never inferred.**
- **W9 Nothing rebuilds under a press**: both polls defer while a hold is in flight; the hold belongs to the open card and re-finds its control. A completed hold clicks for you, and that click must not look like the user's.
- **W10 Nothing may infer a power from the DOM. The ghost must never become a removal.**
- **W11 The toolbar is a toolbar and every wallet is a socket** (C16): all shown from the start; `notheld` ≠ `empty`; only `notheld` is struck; `--slash` is the only red on the surface; 24 px sockets; the navbar's height is load-bearing. The ✏️ socket is hidden outright during the storm; the closed page hides the sockets rather than striking them.
- **W12 A wallet says how many, and the pen's answer is ∞**, in the count slot, as text.
- **W13 A wallet must not depend on its own animation finishing** — every flight has a safety net.
- **W14 🍾 has no wallet; the cork flies** (Y11). Every wallet flies out at the close, from the 🥂 OK.
- **W15 One 🏛️ out per member at a time**, returned whole.
- **W16 A hold is released by letting go, and by nothing else**: `pointerup` and `pointercancel`, bound once on the document, never `pointerleave` and never per control. A hold that a boundary event can cancel is cancelled by its own surface — a render detaches the button under the pointer, and `.holding`’s own shrink insets the hit box by 0.78 px under a stationary cursor. What survives that is a commit resolved by **id** rather than by node. → the charter’s ✏️ Propose lost a live proposal to this twice (2026-08-22); `spec-check` asserts the release set.

## 8. The founding order and the band

`ORDER` in session-view.html **is** the dependency list: each task is born as the one before it settles. A member's answer tasks ride the same order (Q619). The checker asserts the key column equals `ORDER` and each row's section against `SEC`.

<!-- spec-check: order -->
| # | key | glyph | kind | section | blocks? | hidden until | asks |
|---|---|---|---|---|---|---|---|
| 1 | title | 🪶 | birth · ordinary | lead | yes | — | Title |
| 2 | slug | 📍 | birth · ordinary | lead | yes | title | Link |
| 2a | shape | 🧭 | birth · decision, not a setting | lead — its own clause until the save, none after | yes | slug | What Type of Document Is This? |
| 3 | myemail | 📧 | birth · identity | lead (pre-save); your own row after | yes | shape | Your Email |
| 4 | myname | ✋ | personal | members — your own row | no | the save | Your Name |
| 5 | mypic | 🖼️ | personal | members — your own row | no | the save | Your Picture |
| 6 | grant-pen | ✒️ | grant | lead — a tab on the Founded line, no clause | yes | the save | Your Pen |
| 7 | grant-shield | 🛡️ | grant | lead — a tab on the Founded line, no clause | no | the save | Your Shield |
| 8 | chamber | 🌍 | constitutional · judge-gate | lead, penultimate | yes | the pen's OK | Visibility |
| 9 | admission | 🪪 | constitutional — **the price of admission** (entry 94) | members, first — its own clause, above 🤝, because an application pays it (Ed, 2026-08-26) | yes | chamber | Admissions (the ✉️ door is the **remedy** while 🍾 waits on `one-voice`, F19) |
| 10 | applications | 🤝 | constitutional | members — above *Members*, ahead of 💤 🥾 (Q617) | yes | admission | Applications |
| 11 | hat | 🎩 | decision, not a setting | members — a tab on the list; no sentence | yes | applications | Is the Founder a Member? |
| 12 | lapse | 💤 | constitutional · judge-gate | members — above *Members*, with 🤝 (Q865) | yes | hat | Do Memberships Lapse? |
| 13 | removal | 🥾 | constitutional | members — the last rule above *Members* | yes | lapse | How Is a Member Removed? |
| 14 | canpropose | 💡 | gate (and the ✏️ grant) | rate — in the preamble's stack | no | 🍾 | Proposing |
| 15 | canjudge | ⚖️ | gate | rate — in the preamble's stack | no | 🍾 | Voting |
| 16 | grant-voice | 🏛️ | grant | rate — in the preamble's stack (Y23) | no | its clause is pinned; the **news** still arrives with the first blind question you are asked — else, **before the start, under 🪪**, and under ⚖️ after it (Q605, narrowed by Q750, widened by Q829) | Your Voice |
| 17 | rate | ⏱️ | ordinary, delegable | rate | yes | removal | Proposal Rate |
| 18 | machines | 🤖 | ordinary, delegable | rate, last | yes | rate | AI Proposals |
| 19 | ending | ⏰ | constitutional, route inside it | deciding, first | yes | machines | When Does It End? |
| 20 | bar | 🌡️ | constitutional · judge-gate; its commit sets 🪜 | deciding | yes | ending | How Sure Must the Room Be? |
| 21 | quorum | 👥 | constitutional · judge-gate | deciding, last | yes | bar | Quorum |
| 22 | authorship | 👤 | constitutional · judge-gate | privacy | yes | quorum | Anonymous Proposals |
| 23 | judgments | 👁️ | constitutional · judge-gate | privacy | yes | authorship | When Are Votes Revealed? |
| 24 | text | 📄 | ordinary | doc — the charter heading under the hairline | yes | judgments | Text |
| 25 | begin | 🍾 | decision, not a setting | rate — the preamble's stack, first (Y21, Y23) | no | until the founder can press it — `readiness().ready` and 🏛️ not still being served — **or until nothing but the ✉️ remedy is being served** (F5, F9, F18, F19); members never see it pre-start | Begin |

Outside `ORDER`: 🪜 (a tab in 🌡️'s stack; no clause, no rail entry — Q512, and therefore **answered by 🌡️'s commit on both its branches**, F18); the `ans-*` answer tasks (**a tab in the delegated setting's own stack, and no clause of their own** — Q786–Q788: the setting's clause already counts the answers, the answerer's among them, so a second sentence saying whether *you* have answered is the same fact twice; `stackOrder` puts the question in front while it is asking and the watcher in front once it is answered; and 🌡️'s answer body, alone among them, **is a ladder of rungs each saying what it would mean for the room as it stands, and names the ceiling that room can reach**. Three rungs most-protective-first — *Nearly everyone 90%* · *Broad agreement 80%* · *A bare majority 60%* — and a fourth, *A number of my own*, holding a box of `min="50" max="99"`; each carries one grey line saying what taking it would cost this room in votes (*In a room of 5, 4 of 5 must vote for it by the end*), read live so an arriving member visibly moves it, and *nothing can pass at 90% until more members arrive* where the room cannot reach that bar at all. Under them the ceiling line states the highest confidence a room of this size can produce, shown only while the control can express a value above it (so up to a room of 9 under the box's 99, and silent above). The founder's own 🌡️ set card carries the same rungs, the same labels and the same lines, and 🪜's *Rising* carries them again as starting points, dimmed where the start would not be below the close. Q840, entry 165); ✉️ ❌ (**a door stands by its result**, entry 96: ✉️ on *Invitees*, ❌ on *Proposed for removal*, both from the birth — ✉️ because it is the founder's invitation box before the start, ❌ because withdrawing an invitation is a kind of removal — each wearing its own ✒️/🛡️ pair over the act, entry 94; and ✉️ **stands in the founder's rail as a task** once the Membership rules stand, beside whatever the founding is asking next, until the first invitation goes out or 🍾 is pressed — F23, entry 181); the `adm:` admit cards (one per applicant still asking, in the *Applicants* pile, absent at 🪪 *pen* where an application is admitted on submit — entry 96); the ✒️/🛡️ power tabs under every held-able setting (*Can the Founder Make Amendments at Will?* / *Does the Founder Have a Veto?* — Q615; on the doors *Can the Founder Invite / Remove at Will?* / *Does the Founder Have a Veto over Invitations / Removals?*); 🥂.

**The band** (`SEC`): the opening run (`lead`) — title wearing 🪶 ✒️ 🛡️, the link, 📧 pre-save, 🌍, the Founded line wearing the two grants' ✒️ 🛡️ — then **Membership** (`members`: the rules 🪪 · 🤝 · 💤 · 🥾, then one lvl-3 subsection per status, each carrying the control whose result it holds — *Members* with 🎩, your row wearing ✋ 🖼️ 📧 and, once begun, *Leave*; *Invitees* with ✉️ and its power tabs; *Applicants* with one admit card per person asking; *Lapsed* with none; *Proposed for removal* with ❌ and its power tabs — F21, entries 95 and 96), **Proposals** (`rate`: the preamble wearing 🍾 💡 ⚖️ 🏛️ · ⏱️ · 🤖), **Decisions** (`deciding`: ⏰ · 🥂 when closed · 🌡️ with 🪜 in its stack · 👥), **Anonymity** (`privacy`: 👤 👁️), the hairline, the charter under its own name with 📄 beside it.

**A settled motion files behind its rule** (Q942, entry 72). A settled setting stays in its pile because it is the rule, not history — and a motion that passed or was rejected at that clause **is** history there, so it files behind the rule as one more grey chip, ✔ carried or ✖ rejected, oldest in front of newest. It is not a task: nothing is owed an OK, it never enters the rail, and it is `done` from the moment it exists. Withdrawn and kept-at-close motions file nothing, `awaiting-crown` is still live and has its own card, and the membership acts (✉️ ❌ `adm:`) file on their own subsections instead. The *Last amended* line under the clause stays where it is: the line is the clause's one-sentence summary of the latest change, the chip is where the whole record lives.

**The Document** (`doc`) is a rail-only group: 🪶 📍 🌍 📄. Before 🌍 is decided the clause states the interim rule: *Until the Founder decides, only members can see the document* / *Until the members decide, …* (Q618).

### 8.1 Rules

- **F1 The founding runs in single file, in the document's own order** (C14).
- **F2 The birth order is 🪶 → 📍 → 🧭 → 📧, and the magic link is the instantiation**: nothing is saved anywhere until it is followed; the rail at the save holds the pen, ✋ and 🖼️ — the two personal cards being the one non-gate pair that holds its place without blocking (F3, Q980), so they arrive together and the founding walks past them. 🧭 chooses a **shape** (entry 166) — *a meeting* · *a conference* · *ongoing* · *custom* — folded at the save as the Founder's own pre-start sets (SPEC §9.0a): every shaped clause reads *As for a meeting.* until the Founder touches it or presses 🍾, 🍾 states which they changed, 💤 is not shown at all under a meeting or a conference, and ⏰ offers chips in the shape's unit. The table is `packages/constitution/src/shapes.ts`; custom is the absence of a shape.
- **F3 A non-gate card blocks until settled; a gate or grant holds its place without blocking and stands beside the current question; the pen is the one grant that blocks** — and ✋ 🖼️, being personal, hold their place too: a blank name is Anonymous and a blank picture is initials (§9.0c), so nothing waits on them. They stand at the save above the pen, the pen's rule — *every card below it is committed with the very pen it hands over* — not reaching a pair that is committed with no power at all (Q980). The exemption is the cards' own `blocks: false`, read by `blocksOrder` and asserted against this table's *blocks?* column.
- **F4 The gate clauses wait for 🍾**, where they are decided (Y5); 🍾 is the only step that delivers more than one clause.
- **F5 🍾 is the founder's, invisible to members before the start, and it does not appear until it can be pressed — or until nothing else is being served** (F9, F18): shown once the module's own `readiness()` is ready and 🏛️ is not still being served, hidden before that rather than greyed, **except that it is shown with its commit dark when the rail would otherwise hold nothing but the ✉️ remedy** (F19 — the remedy is the dead end wearing a card, not the next task, so it never counts as *something else being served*). Its card states the whole batch, the readiness readout — which informs and never blocks — and, where `readiness()` gives the reason `one-voice`, the sentence naming both acts that end it. → why: the readout's *except while a judge-gate question is still collecting* was outgrown twice — R-045/Q626 widened `waitingOn` past the judge-gates, and Q745 stopped the card appearing at all before then; the last-resort door is Q773, and it restores the ruling the 🪪 card already carries — *whether a document can begin with nobody in it is 🍾's question, and 🍾 has a readout that names what it is waiting for* (Ed, 2026-08-21).
- **F6 Nothing is pre-answered; typing into a rung's own field is choosing that rung; picking a rung may fill that rung's own fields; delegation is an option on the card and settles the clause the same way.** The old defaults survive only in ⏩'s `SEED`. The fill is ⏱️'s *I set it*, which writes the standard proposal rate — 4 ✏️ to start with, up to a maximum of 6, an additional every 10 minutes — **silently, only where the field is empty, and only on the pick**, so the card still arrives with nothing answered and the founder may commit unchanged. → why: Q740.
- **F7 A delegated question waits for a member who has arrived, unless nothing else is outstanding — and a gate or a grant is never *outstanding*, being news rather than a question; it never resolves on one voice and never while an invitation is out; only committed answers count; the watcher waits for your own answer.** **Nor is the ✉️ remedy outstanding** (F19): a question is `one-voice` only once it has been handed over, so counting the remedy would withhold every delegated question from the founder's first delegation onwards. → why: 🍾 and 🏛️ each made the exception unreachable, the first by being outstanding until pressed and unpressable until the answers were in, the second by being the grant that arrives *with* the question it was withholding (Q645); the ✉️ remedy is the same shape a third time (Q828).
- **F8 Nothing is owed an OK until the document begins; a gate opening is the exception** (Y6).
- **F9 A card with a dependency does not appear until its dependency is settled — never greyed.**
- **F10 Nothing opens itself, arrival included** (C1).
- **F11 The address is the machine's until you touch it**: a suggested address moves itself to the nearest free one and says so; a typed one never moves; the chain is capped at three; the check is asked whenever there is an address; a verdict that cannot be got counts as one; the page answers for its own reservation.
- **F12 The email is verified before anything is saved; before the send the 📧 clause is blank; the birth has no heading and no sections; 📧 stands in the lead for the whole birth** (Y16).
- **F13 The constitution starts writing itself at the birth**; at the birth the founder holds everything by construction; the assent half waits for a membership.
- **F14 What is born arrives**: a rail entry grows from zero (240 ms), a clause fades (840 ms), a batch cascades 55 ms apart capped at six, each column counting its own; reduced motion fades everything; a stagehand act mutes the pass.
- **F15 A clause states *The Founder is deciding [what]* until decided, then the rule and its governance deviation; a settled card's head is the rule; open questions, 🪪, 📄, personal cards and answers keep their title.**
- **F16 The Founded line stands from the save and gains its moment at the press** — the *moment* is what is unknown before the start, not the founding — **and it is the clause ✒️ and 🛡️ hang their tabs on, neither writing a sentence of its own; 🎩 is settled once the document begins; the register asks for no minimum.** → why: the grants' own clauses stated a count `holderLine` and the wallet tooltip already state (Q639); every settings clause wears ✒️ and 🛡️ for its **own** powers, so a grant hung on one would put two ✒️ tabs meaning different things in one stack, and the Founded line carries none and already wears 👑.

- **F17 A dead click beats the next task**: during the birth, a click landing on document space with no control under it — while a task is outstanding and no card is open — lifts and settles **both** that task's tab and its rail entry, twice, over 640 ms. It never opens the card, however often it is clicked, and **nothing ever beats unprompted**. Reduced motion holds the lift for the same span instead of moving. → why: the founder's first instinct is to edit the title in place, and the heading answered that click with nothing at all, so a tester went and typed the document's title into the prose column beneath it (Q650–Q653). Beating both halves is the lesson — that the tab, the rail entry and the card are one thing — where beating either alone only points at a location. The idle jiggle first asked for was rejected: every other motion on this surface is a consequence of something, and an ambient one would be the first that moves at a reader for no reason (Q651).

- **F18 The founding never runs out of tasks before 🍾**: from the save until the press, a founder is always served the next founding task, a delegated question to answer as a member, or 🍾 itself. Two rules hold it — **a task nothing can serve never withholds one that can** (🪜 is in neither `ORDER` nor any section's keys, so 🌡️'s commit answers it on **both** branches, and `otherTasksLeft` counts only what the rail could offer), and **🍾 is served when it is the last thing standing** (F5). → why: Ed, 2026-08-25, founding a document task by task — *before begin, there shouldn't be a situation where I don't see any queue-cards*. A delegated 🌡️ left 🪜 owed by a hand nothing could ask for, `ansDue()` was false for ever, and not one of the questions he had handed over came back to him (Q773–Q777).

- **F19 A wait the founding cannot end says why, and ✉️ is the remedy** (the remedy stood on 🪪 until entry 94, 2026-08-26, which moved the invitation box to the door): `readiness()` gives a reason beside each waiting question — `judge-gate`, `deps-unsettled` (the dependency named beside it), `invitation-open`, `one-voice`, `collecting`, `text-unconfirmed` — and **`one-voice` is the only one no amount of answering will clear**, a question handed to a membership of one having been handed to nobody. **`deps-unsettled` is served without the remedy** (entry 69): §9.0a serves a question only once its own dependencies stand, so a delegated 🌡️ under an undecided ⏰ is waiting on another question and not on the room — ✉️ is not summoned for it, and 🍾 names the dependency and that it must settle first rather than an act. Where the dependency is *itself* a `one-voice` hold, the ✉️ card that is served for **that** question says what is waiting on it in turn, so the second question is not read as a second problem. In that state 🍾 names it and both acts that end it, **✉️ stands as a task** whose card leads with why the founder is there, and the two are served **together**: the remedy is the dead end wearing a card, so it neither counts as *something else being served* (F5) nor as one of the *other tasks* that pace a founder's own delegated questions (F7). The ✉️ task is derived and acknowledges nothing — no OK, no `ACK_KEYS` key, nothing owed (F8) — and leaves the instant an invitation goes out (the reason becomes `invitation-open`) or the delegated setting is taken back. → why: Ed, 2026-08-25, founding alone — *I did all my open tasks and then got served Begin while being unable to action it. My guess is this is because I delegated things to the members and I'm the only member.* He had to guess: the readout said *1 of 1 have answered*, which is a question that looks finished beside a start that will not come (Q826–Q830).

- **F20 A grant a founder-member holds is served to them before the start** (F3's *stands beside the current question*, made reachable): 🏛️'s host is the first blind question asking you, else 🪪 before the start and ⚖️ after it — never ⚖️ alone, which is hidden until 🍾 and so put the grant behind the very press it stands in front of. → why: Ed, 2026-08-25 — *when I (as a founder-member) was granted 🏛️ I did not get a task. The 🏛️ tab was grey.* A founder who delegates nothing has no blind question to hang it on and was therefore never served the voice they have held since the save; a founder who does delegate has one only once F7's exception lets it through. The grant now arrives at its own place in `ORDER`, after 👁️ (Q829).

- **F21 Membership is one subsection per status, and only the first is the membership.** Under the rules (🪪 🤝 💤 🥾) stand lvl-3 subsections — **Members** · **Invitees** · **Applicants** · **Lapsed** · **Proposed for removal** — each the document's own text, not a card's. *Applicants* stands only where 🤝 allows applications and *Lapsed* only where 💤 lapses; **the three that carry a control stand when empty** (Invitees, Applicants, Proposed for removal), a control needing a fixed home and inviting mattering most when nobody has been invited — **each with a placeholder row saying so**: *(no outstanding invitations)* · *(no applicants at the moment)* · *(nobody proposed for removal)*, in *(nobody else here yet)*'s own grey treatment, since a heading over a pile and nothing else reads as a heading that lost its paragraph (entry 183). **Every such row stands level with the pile at its paragraph's head** — under *Members* the placeholder is lifted out of flow into the clearance the list already carries for your own row, so the 42 px stays the one clearance number (Q757). **A door stands by its result** (entry 96): ✉️ on *Invitees*, ❌ on *Proposed for removal*, the admit judgment on *Applicants*, 🎩 on *Members* — each a pile with its own ✒️/🛡️ tabs, never a button inside a row, and **no card draws the register**. *Members* is your own row first, then everybody else who has **arrived**, and *(nobody else here yet)* counts those rows alone. **Your ✋ 🖼️ 📧 card opens in your own row's place** (entry 188): the row gives way to the card *inside the list*, the strip's front tab exactly where the pile's front tab stood and *Invitees* still below it — a decision card replacing its own paragraph, like every other one — and a folded *Members* renders its rows to hold it, since no heading folds over the open card. **A lapsed member moves to *Lapsed* and counts all the same** (Y10) — lapse is a stall, not a departure, and they abstain rather than leave; **a removal running against somebody names them under *Proposed for removal* whatever else is true of them**, a motion about a person being the more urgent fact than a quiet spell — and where they are also lapsed the row **wears a *lapsed* pill**, so the subsection they are not in is not the only place that fact can be read. **Every subsection folds**, like every other heading in the document (entry 96, closing the lvl3 half of Q406): the same `cs-` id, the same triangle, and never over an open card. The stranger reads the register under *Members* alone — the per-subsection counts are unbuilt (Q508). → why: membership begins at first arrival, so a flat list told apart by a chip read as *these are your members, some of them faintly* — the chip was doing a heading's job, and so was the eyebrow subheading that replaced it (Q868–Q870, then plan-queue entry 95; Ed, 2026-08-26: *these are sections of the constitution, one per status, and the document's own text*).

- **F22 The rules about a membership stand above the register, and Proposals reads before Decisions**: 🤝 how people join, 💤 and 🥾 the two ways they leave, and only then *Members* and the list; and the whole Proposals run — 💡 ⚖️ 🏛️ ⏱️ 🤖 — above ⏰ 🌡️ 👥 👤 👁️, 🍾 keeping its place last in `ORDER` though its clause opens Proposals, and 📄 last but one. → why: Q865 and Q871 (Ed, 2026-08-26: *💤 and 🥾 sections should be above the Members heading*; *Proposals above Decisions*), reversing the second half of Q617 (a) — *a register is the fact, and those are rules about it*, true of a finished document but not of the founding, where the register is the founder's own name and every rule under it will be in force before the first invitation — and *Proposals reads fourth* (Ed, 2026-08-21), whose objection was a whole section arriving at once, which Q748's four-tab preamble and `ORDER`'s single file had already dissolved.

- **F23 The founder is asked to invite once the Membership rules stand**: the five rules of the section — 🪪 🤝 🎩 💤 🥾 — settled or handed to the membership (a rule a shape hides is a decision nobody has and completes the section by not existing), and no row on the register but the founder's. Then ✉️ stands in the founder's rail as a task. It is **derived and acknowledges nothing** — no OK, no `ACK_KEYS` key, nothing owed (F8) — it **blocks nothing** (F3), standing beside whatever the founding is asking next, and like the `one-voice` remedy it is counted neither as *something else being served* (F5/F18) nor as one of the *other tasks* that pace the founder's own delegated questions (F7): what is offered because the founder may want company must not withhold the questions or shut 🍾's last-resort door, so ✉️ and 🍾 stand side by side. Its card is the door's own, leading with the invitation box; the remedy's *why you are here* paragraph belongs to F19's case alone. It leaves at the first invitation or at 🍾, and 🍾 is never gated on one having been sent. → why: Ed, 2026-08-28, entry 181 — *"Invite Members" task for the founder should appear as soon as the membership section is completed*; F19's remedy only ever finds a founder who delegated something, so one who delegates nothing reached 🍾 with a room of one having been told nothing about it.

Exceptions beyond §3: 🪜 arrives answered (F6 · the ramp is part of what the threshold says · Q512); the founder alone is served the delegated questions once nothing else is outstanding (F7 · an empty rail while the room fills is worse · Q408/Q413); 📧 post-save speaks in the second person (C10 · your own row · Y8); 🎩 ✋ 🖼️ 🪪 write no sentence (F13 · the answer is the list or a chip); 🌍 is asked sixth, ahead of Membership (F1 · it is the penultimate clause of the opening run); the hat's radios stay visible but disabled post-start (C9 · a locked decision still has to be readable).

## 9. The card kinds, the commit row, the composer

Two implementations of one shell (`suggCardHtml` in session.js for the charter; `cardHtml` in setup.js for the band), one shape: `clause-head` → field → commit row. Every card the surface draws:

| kind | opened from | head | field | radios | left | right | closes | files as |
|---|---|---|---|---|---|---|---|---|
| quick / insert | gutter tab · rail · served 🔥 | the clause, **with the keep lane** | one proposal block | Prefer this / Preferred; ✏️ propose edit | Indifferent | ❄️ (🔥 or chilled) · ✓ | ✓ → files ⏳ (Q576); ❄️; the tab | ⏳ → ✔/✖ green → grey |
| race | as quick | the clause, **no lane** (nothing on a race votes to keep) | two proposal blocks | Prefer this ×2; ✏️ | Indifferent | ❄️? · ✓ | as quick | as quick |
| patch | as quick, a card at every site | place i of n ↑↓, then the clause with the keep lane | one block per site | Prefer this | Indifferent | ❄️? · ✓ | one judgment commits all sites | as quick |
| deadlock ⚔️ | gutter · rail, only once you have judged | the clause, no lane | everything in flight, oldest first, floor forced off; then the desk | none (lane bar minus radio) | 🗑️ (always live — Q613) | ✏️ hold | propose · discard · the tab | ⚔️ until a bridge lands |
| diagonal 🌶️ | served | **not a clause**: the question being put | two questions, the clause quoted under each; no speaker | Prefer this ×2 | Indifferent | ✓ | ✓ | flat, no progress |
| sealed record | gutter · filed pile · rail ✔/✖ · backlog tab | the top of the ranking **is** the head | the field ranked, % right-aligned; the incumbent in the list, *Previous text* / *the text that stood*; under a speaker whose proposal was made under a disclosure rung other than the one that stands, *made under ‹rung›, before the rule changed* (entry 31 — silent where they agree) | none | nothing (Y20) | OK while unread | OK; the tab | grey ✔ / ✖ / ⏸ |
| editing (a draft) | the first keystroke; ✏️ on a lane; the ⚔️ desk | the clause run | one block: B · *I* · `[]`, the lane marking additions green, the rationale in the speaker's slot; under an elective 👤 rung the sign choice beneath it (K28) | none | 🗑️ discard | ✏️ **hold** (blue) | propose · discard · the tab | ✏️ full card |
| mine (proposed) | gutter ✏️ · pinned line | the clause | what you proposed + rationale | none | 🗑️ withdraw | ✏️ Submitted (pressed) | withdraw; the tab | ✏️ one line, pinned |
| setting (founder, pen) | band tab · rail ask | the rule once settled; the title while open | why · the setting's own radios · *Let the membership decide this* (pre-start) · the watch half · *Why are you changing this?* (a change only) | per setting | 🗑️ | 🪶 / ✒️ / ✓ by era and route; dark until answered | commit · 🗑️ · the tab | grey tab with its glyph |
| blind answer (member) | rail ask · task paragraph | the title | the consent control: slider, ladder or fields; *Nobody sees your answer…* | the ladder's rungs | 🗑️ | ✓ Answer | ✓ → the entry leaves; revisable until resolved | the tab keeps its glyph |
| watching | band tab | the rule, or the title | the lockline · *What the room is saying*: pips and the count, or the distribution strip and what the document took | none | 🗑️ | OK when news | OK; the tab | grey |
| constitutional motion (consent) | the setting's card, live again · rail ask | the title | *Re-opened…* · the consent picks · the count | Keep what stands / I accept the change / Abstain | 🗑️, or 🗑️ Withdraw for the mover | ✓ | ✓ → the entry leaves | wait → carried → news |
| ordinary motion (dev seam; live, a race card) | the setting's card | what stands with the keep lane | *A proposed change…* · *As proposed* · the count | Prefer this | 🗑️ (Q613) / 🗑️ Withdraw | Indifferent · ✓ | ✓ | ⏳-like |
| the composer | the settled setting's tab | what stands | `PROPOSE[k]`: the setting's own control, what stands omitted (by value — Q620) · the rationale lane · the 👑 note where the shield is held · the history | Prefer this, or a value inside the sentence | 🗑️ | ✏️ Propose (hold — Q614) / 🏛️ Hold to ask everyone, by the value's route | commit · 🗑️ | ✏️ pinned |
| power cards ✒️ 🛡️ | the power tabs | the power's rule as it stands | why · two proposal blocks, the rule at document size with its consequence · *Choose this / Chosen* | Choose this / Chosen | 🗑️ | ✒️ (founder; not pen-gated, Y7) | ✒️ | the tab stays |
| settled motion record | the pile behind the rule's own tab — never the rail, and never `offered()`'s front chip | what was proposed, in the page's words | a dateline — the date, absolute and with its year, then *Passed* / *Rejected*; then what changed by route and outcome — *The Founder changed …* for a ✒️ amendment, *The membership changed …* for a raised one, *The membership kept … as it stood* for a rejected one — then the reason, the featureless disc unless it is the founder's own hand | none | 🗑️ | nothing — a record asks nothing, so it has no OK (Y20) | 🗑️; the tab | a grey ✔ / ✖ behind the rule, and it stays |
| 👑 question | the setting's card, news-pinned | the title | *Passed — awaiting the 👑…* | none | **Refuse** (Y20) | **Accept** | either press | record |
| news / owed OK | news entry ✔ | the rule | the read body · the watch half · the change line (was / now, who, why; *Last amended* once acknowledged) | none | 🗑️ | OK | OK | grey; the clause keeps the line |
| gates 💡 ⚖️ | rail, hidden until 🍾 | the gate's sentence | who gave it · why · the blockers · *✏️ Take them puts n ✏️s in your wallet* (💡) | none | 🗑️ | OK; **💡: ✏️ Take them** (it is the ✏️ grant — Q461a) | OK (persisted) | grey ✔; gone from the rail |
| grants 🏛️ ✒️ 🛡️ | rail, staged | the sentence | as a gate, closing on *‹the take› puts it in your wallet* | none | 🗑️ | **✒️ Take the pen · 🛡️ Take the shield · 🏛️ Take your voice**, a click | the take → the flight | grey |
| 🍾 Begin | rail (founder) | the sentence | the batch · the readiness readout · the hold line | none | 🗑️ | 🍾 Begin (hold) | the hold | grey, restating the batch |
| 🥂 The Close | rail, pinned, per member | the sentence | final as of · the batch · your closing comment | none | 🗑️ | OK = sign | OK → the farewell | — |
| 🪪 Admissions | band tab, above 🤝 | the rule — the price of admission (entry 94) | why · the three options | All members must agree / The membership decides / Any member may invite | 🗑️ | ✒️ | ✒️ | grey |
| ✉️ Invite | the *Invitees* pile, from the birth; ✒️/🛡️ power tabs in its stack | what stands — the price, then the Founder's sentence from the door's powers | the invitation field and *Several at once* **only where the viewer's word sends** (Y24; the founder before the start or holding ✉️'s ✒️, any member while 🪪 stands at ✒️) · else the composer · a refusal sentence under the field (Y25); the `one-voice` remedy leads the card (F19) · the plain task once the Membership rules stand, whose card is simply the box (F23) · **the send wears ✒️** (a click — nothing leaves a wallet) | — | 🗑️ | direct: **✒️ on the send**, ✓ (drawn) on the row · else by route: 🏛️ hold (dark while a 🏛️ of yours is out, on every card including this one) · ✏️ Propose | ✓, keeping what is typed; the composer on commit | — |
| ❌ Remove | the *Proposed for removal* pile, **from the birth** (entry 96); ✒️/🛡️ power tabs in its stack | what stands — the price, then the Founder's sentence | **one dropdown naming the subject**, members and invitees alike — withdrawing an invitation is a kind of removal, priced as one — then *❌ Remove* where the founder's word acts (before the start, or holding the door's ✒️: exile at will, immediate) · else the same dropdown composing at 🥾's price · a refusal sentence (Y25). The subsection it stands on is this door's pending list, the way *Invitees* is ✉️'s | — | 🗑️ (puts the chosen subject back) | by route: ✒️ · 🏛️ hold · ✏️ Propose | commit | — |
| `adm:` an admission | the *Applicants* pile, one card per applicant; **a task at *assembly* and *proposal*, news at *pen*** | the applicant — face, name, address, and their own words; **at *pen* the address is the name**, opening the link being the joining, so nothing else is known of them yet and the announcement says so rather than waiting for a name that may never come (Q912 (b)) | **three forms, by 🪪's price**: at *proposal* the judgment *Admit them* / *Keep the membership as it is* / Indifferent; at *assembly* the consent picks and the blind note, on the same motion machinery as any other 🏛️ question; at *pen* one sentence saying they are already a member | by form | 🗑️ | ✓, or **OK** where it is news | ✓ / OK | the race's own marks |
| 🤝 Applications | band tab | the rule — whether strangers may apply; what it costs them is 🪪's | why · the two rungs | Invitation only / Anyone may apply | 🗑️ | ✒️ | ✒️ | grey |
| identity ✋ 🖼️ 📧 | your own row — the Founded line for a clerk, who has none (Q759); the birth run for 📧 | the title | the name field / *Pick an emoji* → *Or upload an image* → *Currently* with Remove / the address | — | 🗑️ (puts back, never clears) | ✓ Save; 📧: 🪶 at the birth, 📨 while unverified, ✓ once verified | Save · send; 📧 re-opens on refusal | the row |
| 🎩 | the members paragraph | the rule | Member — drafting too / Clerk — not drafting; locked at 🍾 | the two | 🗑️ | ✒️ (when dirty, pre-start) | ✒️ | locked |
| 📄 Text | the tab beside the charter heading · rail ask | the title — its clause is the document itself (F15) | the fact the press acknowledges · what stands in the column · *Write it below, or leave it blank* | — | nothing (Y20) | **OK** — the task is an acknowledgement, not a set, so it is not a pen act (Q798), and it does not take the column: what stands there is the founder's, and editable, until 🍾 (Q819) | OK; the tab | grey; the ✒️ 🛡️ tabs beneath it stay, and are where the pen is laid down |
| the applicant's five | the applicant's rail | the title | apply · email (Send the link in the body) · name · picture · words | — | Begin (Y20) → 🗑️ + Submit | (as left) / ✓ | Submit · ✓ | ✏️ yours |
| the stranger's two | the door's rail | the title | why · the address · Send the link in the body (Y20) | — | 🗑️ only | (in the body) | send | — |
| backlog (closed page) | the ⏸ tab | the best wording | as the sealed record, *Undecided at the close* | none | nothing (Y20) | OK if unread | OK | ⏸ grey |

**The picker** (Q732) is Unicode's own list — a search field over the CLDR names, then one tab per Unicode category, and only the open category is drawn. The skin-tone row stands on **People & Body** alone, and only over the glyphs a tone may be put on. A glyph the surface uses for its own vocabulary, and one another member already wears, are both **greyed in the grid with the reason on them** rather than refused after the press. *Or any emoji* stays underneath, for a glyph the list does not have.

**What a picture may be** (Q734). Two shapes and the absence of one — the grounds for your initials and the drawn marks left the picker on 2026-08-23, and are refused rather than merely un-offered. The initials are not a third answer: they are what the room shows when you have given no picture, which is why the card says so in a sentence instead of offering them in a row.

<!-- spec-check: picture -->

| stored as | what it is | how it is drawn | refused when |
|---|---|---|---|
| `e`+emoji | one pictographic grapheme, picked from Unicode's own list by search or category, or typed | the glyph itself, at the size of the text it stands in — never a disc | it is one of the surface's own marks · another member already wears it |
| `u`+data URI | an image, scaled and re-encoded in the page before it is stored | a photograph filling a disc | it is not an image · it is bigger than the page will encode |
| — | none | your initials on a disc, an anonymous mark before you have a name | — |

### 9.1 The commit-row grammar

| control | where | hold | ground | rule |
|---|---|---|---|---|
| 🗑️ | every card (Y20 lists the five without one) | — | outline | one bin, always live, puts back un-actioned input only, closes; *Withdraw* beside it only for a mover |
| 🪶 | every commit before the save | 1 s | accent-subtle | the ground belongs to the glyph, never to the card's kind |
| ✒️ | a set of your own post-save, the power tabs included | 1 s | accent-subtle | one glyph per route |
| ✓ (drawn) | an answer, a judgment, anything about yourself (*Save*) | — | **the one solid green on a card** | ✓ where the act binds nobody but you |
| ✓ (drawn), closing | a door whose act is in the body — the direct ✉️ — and the applicant's cards | — | solid green | closes and **keeps** what is typed; the act is on the field, so the row has nothing left to commit |
| ✏️ (hold) | a draft, or an ordinary motion | the flight | accent-subtle — *blue, not green* | the price is said in words exactly once, here |
| 🏛️ Hold to ask everyone | a constitutional motion | 10 s | accent-subtle | one 🏛️ out per member |
| ✏️ Submitted | a proposed draft | — | pressed | the act become the fact; the row does not move |
| OK | anything that asks only to have been seen — ⚖️, news, 🥂, and 📄 Text (Q798) | — | solid accent | a word, not a glyph |
| ✒️ 🛡️ 🏛️ ✏️ Take … | a grant | — (a click) | accent-subtle | the glyph of the power it hands over, then the verb; OK is for what only wants to have been seen — a grant is taken |
| Indifferent | the third radio on a judgment | — | radio | labelled, never 🤷; a judgment about the pair, out of the lanes |
| ❄️ | the 🔥 card, or one already chilled | — | glyph button | a toggle on the flame; pressing closes, un-pressing does not |
| Refuse / Accept | the 👑 question | — | outline / accent | the Founder's words |
| 🍾 Begin | the start | 1 s | accent-subtle | its own glyph on its own commit |
| 📨 | 📧 while sent and unverified | — | accent-subtle | a resend spends nothing |

### 9.2 Composer rules

- **K1 The settled card is the composer**: what stands at the head, the alternatives as the setting's own controls, a rationale lane, 🗑️ and the route's commit. Picking an option starts the motion.
- **K2 The founder's direct hand is the pen**; where it is given up they compose like a member — and where they compose nothing (a clerk) the card is the settled one, read-only. **On a closed document nobody composes and the founder's hand is off every setting**: the tabs open the settled card and nothing on it commits.
- **K3 A motion composes with the setting's own control, never a free-text lane**; `PROPOSE` covers every composable setting; the rationale is always a lane.
- **K4 What stands is never offered back** (filtered by value); on a power card it stays, marked *Chosen*, because a two-state toggle needs its other half.
- **K5 Text composes nowhere** — the text is changed by proposing in the document itself.
- **K6 The route is read off the value at compose time**, and the commit swaps as you type. **K7 One route, one glyph.**
- **K8 The mover stands at accept from the open**; 🗑️ Withdraw is their way out and returns the 🏛️ / ✏️ whole.
- **K9 A constitutional motion re-opens the founding question — no new object.** **K10 An ordinary motion is the race machinery whole.** **K11 Reserved is assent, not silence.**
- **K12 A change carries a reason and says who made it** (C11).
- **K13 Always-on-typing intercepts every input**: every clause and heading carries a caret; the keystroke opens the editing card with that character applied; the gutter tab is the only way into a decision card from the document (Y18).
- **K14 A selection may span blocks; K15 one site is one candidate and a run is one place; K16 one draft at a time.**
- **K17 The edit is spent at Propose, nowhere earlier; K18 the proposal's lifecycle is one row that does not move.**
- **K19 A proposal states the text as it would stand, additions marked, nothing struck, with a marking floor of half the new text** (forced off on ⚔️); **K20 punctuation is its own token; K21 *(all text removed)* is a pseudo-element.**
- **K22 A candidate's text is markdown, inline only** — B · *I* · one `[]` toggle; **K23 the lane preserves spaces.**
- **K24 The seed of a draft is the lane you pressed ✏️ on; K25 a lane carries what is about that lane and nothing else; K26 choosing and committing are two acts.**
- **K27 One label per rung, everywhere** — the founder's radio, the member's ladder and the composer's lane say the same words (Q620).
- **K28 Under an elective 👤 rung the draft carries a sign choice, default the base, fixed at Propose** (Q770): *Anonymous* first, *Signed — as ‹your name›* second, drawn only when the standing rung is `anonymousElective` or `sealedElective`; a signed proposal is named on its card from the moment it is proposed, the `mine` line says *signed* and offers no switch, and the server refuses `signed` under any other rung (SPEC §3.5a).
