# Spec normalisation — pass 2 (extraction)

> Working document, 2026-08-22. The **extraction**, not the rewrite: SURFACE.md, STYLE.md, CLAUDE.md and
> `spec-check` change only after Ed answers the items in `pass-2.html`. Numbers 585–624 are the block
> claimed in QUESTIONS.md; unused numbers are released at the fold.
>
> Pass 1 did governance (SPEC §9) and the first half of communication (the event matrix, the card
> lifecycle). Pass 2 lifts the rest of the surface grammar out of CLAUDE.md's glossary into tables:
> **the marks alphabet and the rail**, **the wallets, sockets and holds**, **the founding order and the
> band**, **the card kinds and the commit row**, and **the composer and copy rules**. Raw extracts, one
> per family with `file:line` for every claim, are beside this file as `pass-2-extract-*.md`; this file
> is the normalised form and the list of what was found.

---

## A. The marks alphabet

One glyph per entry, the same alphabet in all three columns (contents rail · gutter · queue). A mark says
what the document wants **from you**, never what state the machine is in. Kind names are the code's
(`markKindOf`, session.js; `MARK`, cards.js).

<!-- spec-check: marks -->
| mark | kind | wants | hue | pins? | teaser? | columns | opens | drawn? | fit-cap exempt? |
|---|---|---|---|---|---|---|---|---|---|
| 💡 | needs | your judgment | open, alpha by urgency | no | the rationale(s) | rail · gutter · queue | the decision card | no | no |
| 🔥 | urgent | your judgment, most | open at `FLAME_A` | yes | hidden while its clause is off screen (Y12) | all three | the decision card, ❄️ on its row | no | yes |
| ⚔️ | stuck | a draft, not a judgment; seen only once you have judged | open, fixed 0.55 | no | the deadlock sentence | all three | the deadlock card | no | no |
| 🌶️ | weigh | which of two questions is hotter | weigh | yes | none; title over four lines | queue (one entry, at the earlier clause) · gutter · rail | the salience diagonal | no | no |
| ⏳ | deciding | nothing — you have judged; revisable | deciding (grey) | no | one line | all three | the card, revisable | no | no |
| ↻ | shifted | nothing — that judgment is void; the pair is re-served | closed wash; **glyph blue** (question 612) | no | one line | all three | the card, with the wording you judged against | character, styled as drawn | no |
| ✔ green | adopted | an OK — the charter changed here | changed | yes | one line + when | all three | the sealed record, OK | yes | no (leverage 0.5) |
| ✖ green | retired | an OK — the incumbent held; pins only if you judged | closed (grey wash, green glyph) | if unread | one line | all three | the sealed record, OK | yes | no |
| ✔ grey | filedYes | nothing; filed, the charter changed | none | no | no | gutter (filed pile) · queue | the sealed record | yes | no |
| ✖ grey | filedNo | nothing; filed, the incumbent held | none | no | no | gutter · queue | the sealed record | yes | no |
| ⏸ | filedUndecided | nothing; undecided at the close | none | no | no | gutter (`U:<race>`) · queue · (rail: finding 607) | the record card | yes | no |
| ✏️ | propose | nothing — withdraw is the remaining act | yours | yes | draft: the rationale as you type; proposed: one line | all three | your proposal | no | yes |

**The setup alphabet** (`stateOf`/`markOf`, setup.js) — five states, tested in the order yours · news · wait · ask · done:

| state | rail mark | tab mark | wants | hue | in the rail? | pins? | opens |
|---|---|---|---|---|---|---|---|
| ask | the subject glyph | the subject glyph | an answer or a set | open, 0.22 | yes | yes | the setting's card |
| wait | ⏳ — a constitutional card keeps its glyph and leaves (Y3) | ⏳, or the glyph | nothing; fill = how far the room has got | closed, 0.16 | only where the wait is about you | no | the watching card |
| news | drawn ✔ | drawn ✔ | OK | changed, 0.22 | yes | yes | the news card |
| yours | ✏️ | ✏️ | nothing — withdraw | yours | yes | yes, force-kept | the application |
| done | drawn grey ✔, and it leaves | **the subject glyph** on grey | nothing | closed, 0.16 | no | — | the settled card (= the composer) |

📈 is not a lifecycle mark: it is the **subject glyph** of the pace card (`CARDS.RAMP`), drawn as a filled incline.

### A.1 Rail rules

- **M1 Four kinds of entry pin for what they are — 🔥, an unacknowledged decision, a proposal of your own, a prioritisation — and the open entry pins for being open.** Everything else stands beside its clause and scrolls with it. (`live`, session.js:968.) Corrects C6 — finding 589.
- **M2 Admission is a ranking by leverage, never a threshold.** Nothing is too unimportant to appear; the rail runs out of room; what does not fit is not shown and not counted.
- **M3 Three things are exempt from the fit cap: 🔥, the open entry, anything of your own.** (session.js:1010.)
- **M4 The open entry's claim on its clause's line is absolute**; entries that cannot fit around it are dropped, never displace it.
- **M5 Pinned entries sit at their clause while it is visible and pile against the band edge in document order.**
- **M6 Ties at one clause break by the tab stack's order, then leverage — one comparator for both columns** (`stackRank` then `leverage`, rail and gutter).
- **M7 Leverage is judgment leverage, with three floors for what a judgment cannot measure**: an unread decision 0.5 (the middle), a deadlocked race `0.9 + 0.1·bounty` (the top), a diagonal `max(urgency, 0.75)`.
- **M8 🔥 is the most urgent `needs` entry that is not ⚔️, not 🌶️ and not chilled**; ❄️ toggles chilled.
- **M9 A teaser is always in the markup and hidden in one case — the flame with its clause off screen — tested on the anchor's position, never the entry's.**
- **M10 The contents rail shows at most four marks per heading, chosen by `KEEP_ORDER` (retention: what must not be lost), drawn in document order, `+n` for the rest; filed marks are absent from it, not dropped first, and never counted.**
- **M11 The stack's front is what most wants you (`STACK_ORDER`: priority), and that is deliberately not `KEEP_ORDER`** — ✏️ is third for retention and seventh for priority.
- **M12 The strip does not reorder; the pile opens only its front tab, index 0 in both.** Slivers carry hue, not a count, and are inert; the pile is fitted by `fitStacks`, never fixed.
- **M13 Filed decisions are their own pile at the bottom of the open strip, newest first, off the closed gutter; decided-but-unread is not filed.**
- **M14 A decision announces itself if it changed the document, or if you are part of why it did not.**
- **M15 Code keys on the mark kind, never the character** — two kinds share ✔, two share ✖.
- **M16 ⚔️ is tested before ⏳ everywhere**, being the state that replaces it.

Exceptions (what · rule · why · ruling): the open entry pins and is exempt though not one of the four (M1/M3 · its wire has to hold · Q222); ✏️ exempt though it scores 0 (M2 · withdraw is the largest remaining act · Q240); ⚔️ and 🌶️ are never 🔥 (M8 · each asks a different act); ⚔️ ranks on bounty near the top (M7 · drafting leverage is maximal · Q223); the diagonal's floor (M7 · its urgency buried it · 2026-08-17); ✖ green washes grey with a green glyph (palette · green is for what changed); the filed pile is off the closed gutter (M12 · history one click away · Q294); 🌶️ is one entry at the earlier clause (M5 · one judgment about two questions · Q277); a draft started on the ⚔️ desk has no rail entry until proposed (the desk is on the card you are looking at); setup `ask` wears the subject glyph (a mark says what is wanted · many questions in one state, the informative mark is *which*); the done tab keeps its glyph, the rail entry becomes ✔ (the band is a menu); a setup 🔥 does not exist (single file, every question mandatory); the applicant's done tasks stay in the rail (its four tasks are the whole surface).

---

## B. The wallets, the sockets, the holds

<!-- spec-check: wallets -->
| wallet | verb | who has to agree | socket | quantity | hold | quarter-way | grant key · arrives · who gives it | flight |
|---|---|---|---|---|---|---|---|---|
| 🪶 quill | founding | nobody — nothing exists yet | `#quill` | 4 feathers; 3 spent on the birth (title, link, the send), the 4th permanent and is the logo | 1000 ms | 250 ms | none — conferred by navigating to docs.vote | feather → button, linear; home on release |
| ✒️ pen | drafting | nobody — you hold the power | `#penwallet` | one, perpetual, never spent; ∞ in the count slot | 1000 ms | 250 ms | `grant-pen` · the save · *You founded this document, and the pen came with it* / *The membership returned the pen to you* | pen → button; grant OK → socket 640 ms; farewell → 🥂 |
| 🛡️ shield | (the pen's other half; not a verb) | nobody — a refusal power | `#shieldwallet` | one, perpetual; ∞ | none — never a commit | — | `grant-shield` · the save · *…the shield came with it* / *…returned the shield* | grant OK → socket 640 ms; **no farewell** (question 621) |
| ✏️ propose | proposing | enough of the room, at the threshold | `#wallet` | many; 1 per Propose, refunded whole on withdraw, dripped on real minutes, capped | 3000 ms (the flight) | 864 ms | `canpropose` (the 💡 gate is the grant) · 🍾, per member at their OK · *The Founder began the document, granting every member the right to propose changes to it* | arc → button; home on release at ≥1.8×; storm from the OK; farewell storm → 🥂 |
| 🏛️ voice | consensus | everybody | `#voicewallet` | one at a time, returned whole on withdrawal or settlement | 10000 ms (the assembly) | none — the ring is the meter | `grant-voice` · question 605 · four sentences by arrival (founded / admitted / agreed to invite / the Founder invited) | grant OK → socket; farewell → 🥂; the motion hold flies nothing |
| 🍾 begin | — a moment, not a capacity | the founder alone | none | — | 1000 ms (rides the pen's hold) | 250 ms | no grant; 🍾 is its own task | the cork → the document title |
| ⚖️ judge | — a right, not an object | — | none | — | — | — | `canjudge` · 🍾 · *…granting every member the right to judge what is proposed* | nothing flies |

### B.1 Socket states

| state | class | look | when |
|---|---|---|---|
| not held | `.notheld` | the tool greyed, a `--slash` strike on the socket (never inside the glyph) | your role does not include it: stranger, applicant, clerk, a member before 🍾 or before the OK, the founder before the pen's OK |
| empty | `.empty` | ✏️ only: muted, a countdown to the next | held, none left — **never struck** |
| count | `.pencils` | up to four glyphs; past four, **three glyphs and +n** (finding 593) | ✏️ held |
| full | `.full` | no countdown | at the cap |
| ∞ | `.pmore` | the text ∞ (U+221E), never an `<i>` | ✒️ 🛡️ held |
| ghost | `.gone` | `visibility: hidden`, slot kept | a token is in the air, or a 🏛️ is out |
| gone | `.gonewallet` | socket absent | the closed page after the farewell |
| bubble | `.walletsay` | the socket's own title, under it | any press on a socket |

### B.2 The hold ladder

| control | hold | what flies | early release | the trailing click |
|---|---|---|---|---|
| 🪶 commit (title, link, the send) | 1000 ms `PEN_HOLD_MS` | the last feather | carried to ¼ at ≥1.8×, hangs 90 ms, rewinds ×4 | swallowed by `isPenCommit(held) && !penHoldFired` |
| ✒️ commit | 1000 ms | the pen | same | same; `holdWallet` asks `mayPen()`, never the DOM |
| 🍾 Begin | 1000 ms | the cork, button → title | same | same |
| ✏️ Propose (charter) | 3000 ms `HOLD_MS` | the last drawn ✏️ | ¼ floor at 864 ms; cancels on `pointerleave` too | none needed — the act fires from the timer |
| 🏛️ Hold to ask everyone | 10000 ms `HOLD_MS` | nothing — the members' avatars convene | disperses; nothing sent | none — no click path exists |
| ✏️ Propose (a motion) | **a click** — question 614 | nothing | — | — |
| OK | a click | the grant's object, OK → socket | — | — |

### B.3 Rules

- **W1 Every power is an object you hold, kept where you can see it, spent by flying it.** Four currencies, four scarcity rules, one gesture.
- **W2 The four verbs are a ladder of who has to agree**: 🪶 nobody, ✒️ nobody, ✏️ enough of the room, 🏛️ everybody; the founding answers are a kind of 🏛️.
- **W3 The quill line falls at the save**: the pen is issued when the URL goes live.
- **W4 A member's power is limited in quantity and unlimited in scope; the founder's is unlimited in quantity and limited in scope.** Per-setting permission is a property of the lock, never of the wallet.
- **W5 No power arrives without acknowledgement, and is not held until acknowledged.** `may* = can* && member && acked(k)`; `may*` is the only thing a control may ask. Grants stage behind the constitutional OKs; each animation fires from that press, per member.
- **W6 An acknowledgement covers this holding**: dropped on a seen held → not-held transition, keyed by seat; re-asked on every not-held → held.
- **W7 An offer you cannot take disappears** (the caret, ✏️ propose edit, the desk, the composer); a question you may not answer is not shown — filtered at ingest in the charter (`withheld`), at render sites in the band (finding 595). The ✒️ commit is the exception (question 622).
- **W8 Every acknowledgement that confers a power persists** — `ACK_KEYS` ⊃ `GRANT_KEYS`, one `localStorage` key per document and seat, live only.
- **W9 The pen blocks the founding order; no other grant or gate does.**
- **W10 A grant says who gave it, in the office's name, third person, read from the record — never inferred.**
- **W11 Nothing rebuilds under a press**; both polls defer while a hold is in flight; the hold belongs to the open card and re-finds its control.
- **W12 A completed hold clicks for you, and that click must not look like the user's.**
- **W13 Nothing may infer a power from the DOM.**
- **W14 The ghost must never become a removal.**
- **W15 A hold has to say so before it is held**: the spend-preview leans the paying token toward the control on hover (render state, phase-locked, never `:hover`); a short press always carries the token at least a quarter of the way — a distance floor, not a jump — then home at a minimum rate.
- **W16 The toolbar is a toolbar and every wallet is a socket**: all shown to everybody from the start; `notheld` ≠ `empty`; only `notheld` is struck; `--slash` is the only red; 24 px sockets; the navbar's height is load-bearing.
- **W17 A wallet says how many, and the pen's answer is ∞**, in the count slot, as text.
- **W18 A wallet must not depend on its own animation finishing** — every flight has a safety net.
- **W19 🍾 has no wallet; the cork flies** (Y11). **Wallets fly out at the close** from the 🥂 OK.
- **W20 One 🏛️ out per member at a time**, returned whole.

Exceptions: 🪶 has no grant task (W5 · nothing exists to acknowledge); 🍾 has no socket (W1 · a moment, not a capacity · Q516); 🛡️ is in the toolbar but is not a verb, has no hold, no spend (W1 · a refusal is not an act that spends · Q532); the ✒️/🛡️ power tabs commit without `mayPen()` (W5 · laying a power down must stay possible · Y7); the 💡 gate doubles as the ✏️ grant (one card per decision · the gate opening *is* the grant · Q461a); `canjudge` is acknowledged but nothing flies (a right, not an object); the ✏️ socket is hidden outright during the storm (W16 · a struck ✏️ in the target would lie for the length of the flight); the closed page hides the sockets rather than striking them (W16 · the tools were taken away · Q532 (a)); the ✏️ hold cancels on `pointerleave`, the pen hold does not (the pen hold is a document listener that survives a re-render); the 🏛️ hold has no token and no nudge (W15 · the assembly is the meter); the spend-preview never previews 🍾 or 🏛️ (nothing leaves a wallet).

---

## C. The founding order and the band

`ORDER` in session-view.html **is** the dependency list. The walk (`node scripts/founding-walk.mjs`, headless, exit 0) confirmed the founder meets it to the letter; the rail holds one entry at every step except after the pen's OK (🛡️ + 🌍) and after 🍾 (💡 ⚖️ 🏛️).

<!-- spec-check: order -->
| # | key | glyph | kind | clause lands in | blocks? | hidden until | asks |
|---|---|---|---|---|---|---|---|
| 1 | title | 🪶 | birth · ordinary | the opening run, first | yes | — | Title |
| 2 | slug | 📍 | birth · ordinary | the opening run, second | yes | title settled | Link |
| 3 | myemail | 📧 | birth · identity | the opening run, third, **pre-save only**; your own row after | yes | slug settled; never for an applicant | Your Email |
| 4 | grant-pen | ✒️ | grant | under the link clause | **yes** | the save | Your Pen |
| 5 | grant-shield | 🛡️ | grant | under the link clause, beside the pen | no | the save | Your Shield |
| 6 | chamber | 🌍 | constitutional · judge-gate | the opening run, penultimate | yes | the pen's OK | Visibility |
| 7 | policy | 🤝 | constitutional | Membership, first — above *Members* (question 617) | yes | chamber | Applications |
| 8 | hat | 🎩 | decision, not a setting | a tab on the members-list paragraph; no sentence — the *clerk* chip | yes | policy | Is the Founder a Member? |
| 9 | myname | ✋ | personal | your own row | yes | hat | Your Name |
| 10 | mypic | 🖼️ | personal | your own row | yes | myname | Your Picture |
| 11 | roster | 🪪 | constitutional, the register | Membership › Members — the list is the clause | yes | mypic | Membership |
| 12 | lapse | 💤 | constitutional · judge-gate | Membership, after the list | yes | roster | Do Memberships Lapse? |
| 13 | removal | 🚪 | constitutional | Membership, last | yes | lapse | How Is a Member Removed? |
| 14 | ending | ⏰ | constitutional, route inside it | Decisions, first | yes | removal | When Does It End? |
| 15 | bar | ✒️ | constitutional · judge-gate; its commit sets 📈 | Decisions, after 🥂's place | yes | ending | How Sure Must the Room Be? |
| 16 | quorum | 👥 | constitutional · judge-gate | Decisions, last | yes | bar | Quorum |
| 17 | authorship | 👤 | constitutional · judge-gate | Anonymity | yes | quorum | When Is a Proposer Named? |
| 18 | signing | ✍️ | constitutional · judge-gate | Anonymity | yes | authorship | Who May Sign a Proposal? |
| 19 | judgments | 👁️ | constitutional · judge-gate | Anonymity | yes | signing | When Are Judgments Revealed? |
| 20 | canpropose | 💡 | gate (and the ✏️ grant) | Proposals, after 🍾's clause | no | 🍾 | Proposing |
| 21 | canjudge | ⚖️ | gate | Proposals | no | 🍾 | Judging |
| 22 | grant-voice | 🏛️ | grant | under ⚖️'s clause (question 605) | no | structurally 🍾 | Your Voice |
| 23 | rate | ⏱️ | ordinary, delegable | Proposals | yes | judgments | Proposal Rate |
| 24 | machines | 🤖 | ordinary, delegable | Proposals, last | yes | rate | AI Proposals |
| 25 | text | 📄 | ordinary | the charter heading under the hairline | yes | machines | Text |
| 26 | begin | 🍾 | decision, not a setting | **Proposals, first** (question 616) | no | never for the founder; members never see it pre-start | Begin |

Outside `ORDER`: 📈 (a tab in ✒️'s stack; **no clause, no rail entry** — finding 598); the twelve `ans-*` answer tasks (a task paragraph under the watching clause; paced by the cards' own `dep` arrays — question 619); ✉️ ❌ (doors in the 🪪 pile, from the moment judging opens); the ✒️/🛡️ power tabs under every held-able setting; 🥂.

**The band** (`SEC`): the opening run — title (wearing 🪶 ✒️ 🛡️), link (with the pen and shield clauses beneath), 📧 pre-save, 🌍, the Founded line — then **Membership** (🤝 · *Members* · the list with 🪪 ✉️ ❌ 🎩 and your row wearing ✋ 🖼️ 📧 · 💤 · 🚪), **Decisions** (⏰ · 🥂 when closed · ✒️ with 📈 in its stack · 👥), **Anonymity** (👤 ✍️ 👁️), **Proposals** (the preamble · 🍾 · 💡 · ⚖️ with 🏛️ · ⏱️ · 🤖), the hairline, the charter under its own name with 📄 beside it. **The Document** is a rail-only group (🪶 📍 🌍 📄). No clause: 📈, 🎩, ✋🖼️📧 post-save, 🪪, ✉️ ❌, the power tabs, 📄.

### C.1 Rules

- **F1 The founding runs in single file, in the document's own order; `ORDER` is the dependency list.**
- **F2 The birth order is 🪶 → 📍 → 📧 and the magic link is the instantiation.**
- **F3 Each task is born as the one before it settles; a non-gate card blocks until settled; a gate or grant holds its place without blocking and stands beside the current question; the pen is the one grant that blocks.**
- **F4 The gate clauses wait for 🍾**, where they are decided; 🍾 is the only step that delivers more than one clause.
- **F5 🍾 is the founder's, invisible to members before the start; its card states the whole batch and the readiness readout, which informs and never blocks except while a judge-gate question is still collecting.**
- **F6 Nothing is pre-answered; typing into a rung's own field is choosing that rung; delegation is an option on the card and settles the clause the same way.** The old defaults survive only in ⏩'s `SEED`.
- **F7 A delegated question waits for a member who has arrived, unless nothing else is outstanding; it never resolves on one voice and never while an invitation is out; only committed answers count; the watcher waits for your own answer.**
- **F8 Nothing is owed an OK until the document begins; a gate opening is the exception.** Grants stage behind the constitutional OKs.
- **F9 A card with a dependency does not appear until its dependency is settled — never greyed — and gates and grants stand alongside rather than waiting** (finding 599).
- **F10 Nothing opens itself, arrival included.**
- **F11 The address is the machine's until you touch it**: a suggested address moves itself to the nearest free one and says so, a typed one never moves, the chain is capped at three, the check is idempotent and asked whenever there is an address, a verdict that cannot be got counts as one, and the page answers for its own reservation.
- **F12 The email is verified before anything is saved; the mail is the login; before the send the 📧 clause is blank; the birth has no heading and no sections; 📧 stands in the lead for the whole birth.**
- **F13 The constitution starts writing itself at the birth**; at the birth the founder holds everything by construction; the assent half waits for a membership.
- **F14 What is born arrives**: a rail entry grows from zero (240 ms), a clause fades (840 ms), a batch cascades 55 ms apart capped at six, each column counting its own; reduced motion fades everything; a stagehand act mutes the pass.
- **F15 A clause states *The Founder is deciding [what]* until decided, then the rule and its governance deviation; a settled card's head is the rule; open questions, 🪪, 📄, personal cards and answers keep their title.**
- **F16 The Founded line carries the founding moment and is never known before the start; 🎩 is settled once the document begins; the register asks for no minimum; the rail at the save holds the pen alone.**

Exceptions: 📈 arrives answered (F6 · the ramp is part of what the threshold says · Q512); 🛡️ stands beside 🌍 and 💡 ⚖️ 🏛️ arrive together (F1 · a grant announces a fact already true; 🍾 is where the gates are decided · Q514, Q529); the founder alone is served the delegated questions once nothing else is outstanding (F7 · an empty rail while the room fills is worse · Q408/Q413); 📧's clause is blank before the send and the card re-opens on refusal (F15, C2 · a document does not narrate that somebody is about to type · Y2, Y16); 📧 post-save speaks in the second person (C10 · your own row · Y8); 🎩 ✋ 🖼️ 🪪 write no sentence (F13 · the answer is the list or a chip); 🍾's clause heads Proposals though the task is last (question 616); 🏛️ is reachable only through ⚖️ (question 605); the answer cascade rides the old `dep` graph (question 619); 🌍 is asked sixth, ahead of Membership (F1 · it is the penultimate clause of the opening run); the hat's radios stay visible but disabled post-start (C9 · a locked decision still has to be readable).

---

## D. The card kinds and the commit row

Two implementations of one shell (`suggCardHtml` in session.js for the charter; `cardHtml` in setup.js for the band), the same shape: `clause-head` → field → commit row.

<!-- spec-check: cards -->
| kind | opened from | head | field | radios | left | right | closes | files as |
|---|---|---|---|---|---|---|---|---|
| quick / insert | gutter tab · rail · served 🔥 | the clause, **with the keep lane** | one proposal block | Prefer this / Preferred; ✏️ propose edit | Indifferent | ❄️ (🔥 or chilled) · ✓ | ✓ → files ⏳ (Q576); ❄️; the tab | ⏳ → ✔/✖ green → grey |
| race | as quick | the clause, **no lane** | two proposal blocks | Prefer this ×2; ✏️ | Indifferent | ❄️? · ✓ | as quick | as quick |
| patch | as quick, a card at every site | place i of n ↑↓, then the clause with the keep lane | one block per site | Prefer this | Indifferent | ❄️? · ✓ | one judgment commits all sites | as quick |
| deadlock ⚔️ | gutter · rail, only once you have judged | the clause, no lane | everything in flight, oldest first, floor forced off; then the desk | none (lane bar minus radio) | 🗑️ (disabled without a draft — question 613) | ✏️ hold | propose · discard · the tab | ⚔️ until a bridge lands |
| diagonal 🌶️ | served | **not a clause**: the question being put | two questions, the clause quoted under each; no speaker | Prefer this ×2 | Indifferent | ✓ | ✓ | flat, no progress |
| sealed record | gutter · filed pile · rail ✔/✖ · backlog tab | the top of the ranking **is** the head | the field ranked, % right-aligned; the incumbent in the list, labelled *Previous text* / *the text that stood* | none | **nothing** (question 613) | OK while unread | OK; the tab | grey ✔ / ✖ / ⏸ |
| editing (a draft) | the first keystroke; ✏️ on a lane; the ⚔️ desk | the clause run | one block: B · *I* · `[]`, the lane marking additions green, the rationale in the speaker's slot | none | 🗑️ discard | ✏️ **hold** (blue) | propose · discard · the tab | ✏️ full card |
| mine (proposed) | gutter ✏️ · pinned line | the clause | what you proposed + rationale | none | 🗑️ withdraw | ✏️ Submitted (pressed) | withdraw; the tab | ✏️ one line, pinned |
| setting (founder, pen) | band tab · rail ask | the rule once settled; the title while open | the body: why · the setting's own radios · *Delegate to the membership* (pre-start) · the watch half · *Why are you changing this?* (a change only) | per setting | 🗑️ | 🪶 / ✒️ / ✓ by era and route; dark until answered | commit · 🗑️ · the tab | grey tab with its glyph; the entry leaves |
| blind answer (member) | rail ask · task paragraph | the title | the consent control: slider, ladder or fields; *Nobody sees your answer…* | the ladder's rungs | 🗑️ | ✓ Answer | ✓ → the entry leaves; revisable until resolved | the tab keeps its glyph (Y3) |
| watching | band tab | the rule, or the title | the lockline · *What the room is saying*: pips and the count, or the distribution strip and what the document took | none | 🗑️ | OK when news | OK; the tab | grey |
| constitutional motion (consent) | the setting's card, live again · rail ask | the title | *Re-opened. A member has proposed…* · the consent picks · the count | Keep what stands / I accept the change / Abstain (invite and remove have their own words) | 🗑️, or 🗑️ Withdraw for the mover | ✓ | ✓ → the entry leaves; the tab keeps its glyph | wait → carried → news |
| ordinary motion (dev seam; live, a race card) | the setting's card | what stands with the keep lane | *A proposed change…* · the proposal *As proposed* · the count | Prefer this | nothing (non-mover) / 🗑️ Withdraw | Indifferent · ✓ | ✓ | ⏳-like |
| the composer | the settled setting's tab | what stands | `PROPOSE[k]`: the setting's own control, what stands omitted · the rationale lane · the 👑 note where the shield is held · the history | Prefer this (lanes) or a value inside the sentence | 🗑️ | ✏️ Propose (click — question 614) / 🏛️ Hold to ask everyone (10 s), by the value's route | commit · 🗑️ | ✏️ pinned |
| power cards ✒️ 🛡️ | the power tabs | the power's rule as it stands | why · two proposal blocks, the rule at document size with its consequence · *Choose this / Chosen*; a blocked option dims whole | Choose this / Chosen | 🗑️ | ✒️ (founder; not pen-gated, Y7) | ✒️ | the tab stays |
| 👑 question | the setting's card, news-pinned | the title | *Passed — awaiting the 👑…* | none | **Refuse** (no 🗑️ for the founder) | **Accept** | either press | record |
| news / owed OK | news entry ✔ | the rule | the read body · the watch half · the change line (was / now, who, why; *Last amended* once acknowledged) | none | 🗑️ | OK | OK | grey; the clause keeps the line |
| gates 💡 ⚖️ | rail, hidden until 🍾 | the gate's sentence | who gave it · why · the blockers · *OK puts n ✏️s in your wallet* (💡) | none | 🗑️ | OK | OK (persisted) | grey ✔; gone from the rail |
| grants 🏛️ ✒️ 🛡️ | rail, staged | the sentence | as a gate | none | 🗑️ | OK | OK → the flight | grey |
| 🍾 Begin | rail (founder) | the sentence | the batch · the readiness readout · the hold line | none | 🗑️ | 🍾 Begin (hold) | the hold | grey, restating the batch |
| 🥂 The Close | rail, pinned, per member | the sentence | final as of · the batch · your closing comment | none | 🗑️ | OK = sign | OK → the farewell | — |
| 🪪 Membership | band tab | **the list is the clause** | why · invite rows · *Several at once* · the Applicants block (Admit / Keep the membership as it is / Indifferent + ✓) | — | 🗑️ | ✒️ | ✒️; the tab | grey |
| ✉️ Invite · ❌ Remove | the 🪪 pile, post-start | what stands | the address rows / the members with ✕ *Propose that they leave* | — | 🗑️ | by route: ✒️ · 🏛️ hold · ✏️ Propose | commit | — |
| 🤝 Applications | band tab | the rule | why · the four rungs | Invitation only / must be proposed / Anyone may apply / Open | 🗑️ | ✒️ | ✒️ | grey |
| identity ✋ 🖼️ 📧 | your own row; the birth run for 📧 | the title | the name field / the picker / the address | — | 🗑️ (puts back, never clears) | ✓ Save; 📧: 🪶 at the birth, 📨 while unverified, ✓ once verified | Save · send; 📧 re-opens on refusal | the row |
| 🎩 | the members paragraph | the rule | Member — drafting too / Clerk — not drafting; locked at 🍾 | the two | 🗑️ | ✒️ (when dirty, pre-start) | ✒️ | locked |
| the applicant's five | the applicant's rail | the title | apply · email (Send the link **in the body**) · name · picture · words | — | Begin (no 🗑️) → 🗑️ + Submit | (as left) / ✓ | Submit · ✓ | ✏️ yours |
| the stranger's two | the door's rail | the title | why · the address · Send the link **in the body** | — | 🗑️ only | (in the body) | send | — |
| backlog (closed page) | the ⏸ tab | the best wording | as the sealed record, *Undecided at the close* | none | nothing | OK if unread | OK | ⏸ grey |

### D.1 The commit-row grammar

| control | where | hold | ground | rule |
|---|---|---|---|---|
| 🗑️ | every card (the exceptions are question 613) | — | outline | one bin, always live, puts back un-actioned input only, closes; *Withdraw* beside it only for a mover |
| 🪶 | every commit before the save | 1 s | accent-subtle | the ground belongs to the glyph, never to the card's kind |
| ✒️ | a set of your own post-save, the power tabs included | 1 s | accent-subtle | one glyph per route |
| ✓ (drawn) | an answer, a judgment, anything about yourself (*Save*) | — | **the one solid green on a card** | ✓ where the act binds nobody but you |
| ✏️ (hold) | a draft | the flight | blue `--primary` — *blue, not green* | the price is said in words exactly once, here |
| ✏️ Propose | an ordinary motion | **a click** (question 614) | accent-subtle | — |
| 🏛️ Hold to ask everyone | a constitutional motion | 10 s | accent-subtle | one 🏛️ out per member |
| ✏️ Submitted | a proposed draft | — | pressed | the act become the fact; the row does not move |
| OK | anything that asks only to have been seen | — | solid accent | a word, not a glyph |
| Indifferent | the third radio on a judgment | — | radio | labelled, never 🤷; a judgment about the pair, out of the lanes |
| ❄️ | the 🔥 card, or one already chilled | — | glyph button | a toggle on the flame; pressing closes, un-pressing does not |
| Refuse / Accept | the 👑 question | — | outline / accent | the founder's words |
| 🍾 Begin | the start | 1 s | accent-subtle | its own glyph on its own commit |
| 📨 | 📧 while sent and unverified | — | accent-subtle | a resend spends nothing |

### D.2 Composer rules

K1 the settled card **is** the composer — picking an option starts the motion · K2 the founder's direct hand is the pen; where it is given up they compose like a member · K3 a motion composes with the setting's own control, never a free-text lane; `PROPOSE` covers every composable setting (17 of 17, verified) · K4 what stands is never offered back, except on a power card where *Chosen* keeps the other half · K5 text composes nowhere · K6 the route is read off the value at compose time and the commit swaps as you type · K7 one route, one glyph · K8 the mover stands at accept; withdraw returns the 🏛️ / ✏️ whole · K9 a constitutional motion re-opens the founding question, no new object · K10 an ordinary motion is the race machinery whole · K11 reserved is assent, not silence · K12 a change carries a reason and says who made it · K13 always-on-typing intercepts every input; the gutter tab is the only way in from the document · K14 a selection may span blocks · K15 one site is one candidate; a run is one place · K16 one draft at a time · K17 the edit is spent at Propose · K18 the proposal's lifecycle is one row that does not move · K19 result-only with a marking floor (0.5), forced off on ⚔️ · K20 punctuation is its own token · K21 *(all text removed)* is a pseudo-element · K22 a candidate's text is markdown, inline only; B · *I* · one `[]` toggle · K23 the lane preserves spaces · K24 the seed of a draft is the lane you pressed ✏️ on · K25 a lane carries what is about that lane and nothing else · K26 choosing and committing are two acts.

### D.3 Copy rules

T1–T34 in `pass-2-extract-cards.md` §4; they go to STYLE.md (question 585), which already carries most of them.

---

## E. Findings — drift against a ruling already made

Fixed in the fold unless vetoed. **Documents** are mine to fix in the fold; **code** fixes are their own commits afterwards (no other session is running).

| # | Where | Finding | Fix |
|---|---|---|---|
| 588 | SURFACE.md:98, CLAUDE.md:109 | Q576 marked *not yet built*; built in `0fdec0d` | strike the notes |
| 589 | SURFACE C6, CLAUDE.md:317, :320 | *exactly four kinds pin* — the open entry is a fifth; fit-cap exemptions are three, stated as two | C6 = M1; M3 |
| 590 | CLAUDE.md:315, notes | *dropping filed first* — filed is absent from the contents rail and never counted | M10 |
| 591 | CLAUDE.md:140 vs :145 | *gates wait as pile tabs only* — true of the grants and 🍾, false of 💡 ⚖️ since Q529 | :140 reworded |
| 592 | SURFACE E18 | *below 2E* — the code and CLAUDE.md say *at least E* | E18 |
| 593 | CLAUDE.md:254, :272, :289; system.css, session-view.html comments | three wallets / three grants where there are four; `✏️✏️✏️✏️+5` cannot occur (three glyphs and +n) | the wallets table; the comments |
| 594 | SURFACE E4 | the ✏️ storm fires from 💡's OK, per member, not from 🍾; 🏛️'s row follows 605 | E4's channel |
| 595 | SURFACE C9 | *filtered at ingest* is true of the charter (`withheld`) and not of the band | C9 / W7 |
| 596 | SURFACE C4, CLAUDE.md | the ✏️ hold (3000 ms) and the 🍾 hold (1000 ms, by class) are stated nowhere | the hold ladder table |
| 597 | CLAUDE.md:206–207 | Membership listed with *machine member, and the gates* (they are in Proposals); Decisions omits 🥂 | the band table |
| 598 | CLAUDE.md:207, session-view.html:2008 | 📈 *keeps a rail entry and its place in the founding order* — it is in neither `keys` nor `ORDER`; no rail entry exists | docs match Q512 |
| 599 | CLAUDE.md:128; SURFACE C14 | *a card with a dependency does not appear until it is settled* states no gate/grant clause; *one task at a time* is false at two steps by ruling | F3, F9; C14 |
| 600 | SURFACE E12, §5; CLAUDE.md `reserved`; session-view.html:3920, setup.js:851 | *Accept / Reject* — STYLE #33 and the code say *Refuse / Accept*; the card's prose still says *accept or reject* | docs; the prose → *assent or refuse* (code copy) |
| 601 | CLAUDE.md; QUESTIONS.md:396 | stale prose: *Propose and Cancel*; *two-segment Rich / Markdown*; the deadlock card's *raised voice* and *record line* (gone 2026-08-17); the incumbent's *50%*; *the fifth lifecycle state*; *Next unused number: 527* | struck |
| 602 | session-view.html:4990 | *The founder [name] is deciding…* — lowercase where every clause says *The Founder* | code copy |
| 603 | setup.js:1033 | the member's 🌍 ladder still offers **Public** after it left every ladder (2026-08-22) | code |
| 604 | session-view.html:1419, 1609, 1650, 1146 | *directly*, *the Founder's OK*, *carried* survive in four strings after Q507 / STYLE #33 | code copy; the 🛡️ title is question 615 |
| 606 | session-view.html:2213, 3306, 1118–1121, 3101 | §9.0b / R-028: proposing opens at the start — `canPropose` is true from 📄, the topbar reads *proposals open* before 🍾, 💡's clause and blockers state the retired three-holders rule | code |
| 607 | session.js:3576, 3602, 3626 | 🌶️ is missing from `KEEP_ORDER` (first dropped in the contents rail); ⏸ is in neither order and not filtered from the rail | code |
| 608 | cards.js:425, 469, 672, 676, 735 | default tooltips say *roster* and cite *SPEC §3.4 / §4.4*; session.js never overrides them; STYLE's scan never read cards.js | code copy; STYLE scans cards.js |
| 609 | session-view.html:3804, 5186 | *Wrong address?* removed from 📧 (the field is the correction) survives on the applicant's and stranger's cards | code |
| 610 | — | released | — |
| 611 | session-view.html:6453, 6016, 2242, 3283, 1967, 2008, 2940; session.js:1590, 364 | stale comments (*a click, not a hold*; three wallets; *the shield rides the pen's ack*; ⏳ in the pile; the list-first order; 📈 in keys; *No score*), `WHAT.policy` declared twice, `classFor` emitting classes nothing styles | code comments |

## F. Questions — genuine choices

Numbered 585–587 (shape), 605, 612–624. Recommendation first; the page carries each in full.

- **585** Where the five families land. (a) SURFACE.md §6–§9 for marks, rail, wallets/holds, the order, cards and the commit row, with the composer rules; STYLE.md takes T1–T34; CLAUDE.md keeps one-line pointers as it did for the lifecycle. (b) all of it in SURFACE.md. (c) the card anatomy stays in CLAUDE.md (geometry the checker cannot see).
- **586** Which checker extensions: (a) the order table vs `ORDER` × `SEC` × flags; (b) marks vs `MARK` / `DRAWN` / `KEEP_ORDER` / `STACK_ORDER` / the `live` literal; (c) wallets vs `GRANT_KEYS` / `ACK_KEYS` / the hold constants; (d) `PROPOSE` ≡ the composable set, `ANSWER` ≡ delegable, rung **values** equal across founder / member / composer, `PW_*` maps sharing one key set; (e) the banned-word scan over cards.js; (f) a golden `founding-walk --json` in CI. Recommend a–e now, f as a nightly rather than at the push.
- **587** The notes files (`session-view.notes.md`, `setup.notes.md`) are stale on ten points between them: (a) a *superseded* banner on each, kept as history, no longer "kept current"; (b) bring them current; (c) delete.
- **605** 🏛️ *at arrival* (Q514) vs the build (at 🍾, through ⚖️): (a) the voice arrives with the first blind question you are asked — for an invitee, arrival; for a founder-member, their first delegation; for a founder who delegates nothing, 🍾; (b) immediately after 🛡️; (c) amend the ruling to *at the start, or at arrival into a begun document*.
- **612** ↻'s glyph is blue while the palette says grey: (a) grey; (b) keep blue, recorded.
- **613** Cards without a live 🗑️: (a) record the sealed record, the backlog card, the 👑 question, the applicant's and stranger's email cards and *Begin* as Y-exceptions; **enable** the ⚔️ desk's bin and give the non-mover ordinary motion a bin; (b) every card gets a live bin; (c) leave all as built.
- **614** ✏️ Propose on a motion is a click with no flight though it spends a ✏️: (a) the hold and the pencil flight, like the charter's; (b) record the exception.
- **615** The 🛡️ card's title, *Do Carried Changes Need the Founder's OK?*: (a) *Does the Founder Have a Veto?*; (b) *Do Passed Changes Need the Founder's Assent?*; (c) keep.
- **616** 🍾's clause heads Proposals while the task is last in the order: (a) record the exception — it heads the section because it is what opens it; (b) move the clause to the foot of the constitution, under 🤖.
- **617** Membership's first paragraph: CLAUDE.md:206 says *the people, then the rules*; :144 and the code put 🤝 first. (a) 🤝 first, as built (*I need to decide Applications before I can do Membership*); (b) the list first.
- **618** The interim visibility clause (*Until the members decide, the document is visible to members only*) is stated in two documents and built in none: (a) build it into the 🌍 clause's undecided form; (b) retire the sentence.
- **619** The member's answer tasks cascade on the retired wave graph's `dep` arrays: (a) the catalogue's `deps` only (bar waits for ending; everything else arrives as delegated); (b) `ORDER`; (c) keep, recorded.
- **620** One setting, three wordings across the founder's radios, the member's ladder and the composer: (a) one label per rung — the founder's card's — everywhere, and the composer filters by value not label; (b) leave.
- **621** The shield at the close: (a) flies into the 🥂 card like ✒️; (b) hidden, as now.
- **622** The ✒️ commit under an unacknowledged pen renders disabled with *Your pen is waiting in your tasks* while the rule says an offer disappears: (a) record the exception; (b) hide it.
- **623** Two wash strengths: the charter's entries ramp 0.05–0.30 by urgency, setup entries take a fixed 0.22: (a) setup entries take the ramp from their own `RAIL_U`; (b) record.
- **624** The exception lists: the rule *a grant stands beside the current question rather than blocking it* absorbs Y4, P3 and P4; *⏳ survives where the wait is about you* absorbs Y3 and the setup wait row. (a) absorb; (b) keep them separate.
