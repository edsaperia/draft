# Inventory — the surface as it stands (Q1541, stage 1)

Generated 2026-09-24 23:53 UTC from the payloads in `design/proposal/data/` by `tools/build-inventory.mjs` (→ `inventory.json`, which stage 2 counts from) and `tools/write-inventory-md.mjs` (→ this file). Every card was opened by a script and measured in the DOM at **1600×1000** and **390×844**; nothing here is a redrawing.

**How it was made.** `tools/inventory-audit.mjs` is a copy of `design/tools/card-audit.mjs` that also reads each card's slots in order and its rail entry, crops a screenshot, re-shoots the *delegated* state after the rung is chosen, and adds two walks (`sessionband`, `closedband`) for the band's cards on the session and closed fixtures, which the audit's charter walks never open. `tools/live-shots.mjs` stood a phase-ladder document (seed 42) at each of the five rungs on a throwaway dev server (port 8177, scratch data dir, killed after) and opened every card offered to the founder, two members and a stranger (at most three of any one key shape per seat). `tools/edit-shots.mjs` typed into the column in edit mode for the editing card. `tools/zone-shots.mjs` cropped the non-card zones. No product file was touched.

**Reading a state.** A state is the walk that reached it: *founding* (unanswered), *answers*, *delegated* (collecting), *settled* (⏩ plus five seeded motions — carried, held, crowned, running constitutional, running ordinary — seen by the founder), *seat:1* (a member, the motions' mover), *seat:stranger*, *charter* (session fixture), *closed*, *sessionband*, *closedband*, *edit*, and *live · rung · seat*. On the fixture charter the state also names the item's fixture state (needs · deciding · sealed, deadlocked, outcome); everywhere the rail entry's mark is appended where the card has one. One screenshot per kind × state × width; the other cards in the group point at it (`shotOf` in the JSON). **Geometry caveat:** glyph and clause travel are card-audit's measurements and are trustworthy on the fixture walks, which run at scroll 0 with the motion stubbed; on the live walks a card is opened from its rail entry, which travels the page to it, so a live travel figure mixes the scroll in and is not evidence of a moving tab.

## Summary

| | |
|---|---|
| card records (key × state × width) | 1336 |
| card kinds listed (SURFACE §9 rows, split where one row draws two shapes) | 40 |
| kinds reached | 37 of 40 |
| distinct kind × state pairs (both widths) | 295 |
| non-card zone crops | 94 |
| screenshots in `shots/current/` | 713 PNG, 25.2 MB |

| family | kind | SURFACE §9 row | reached | states | records @1600 | @390 |
|---|---|---|---|---|---|---|
| judgment | `quick` | quick / insert | yes | 4 | 41 | 41 |
| judgment | `insert` | quick / insert (gap) | yes | 2 | 4 | 4 |
| judgment | `race` | race | yes | 4 | 13 | 13 |
| judgment | `judged-pair` | ⏳ judged pair | yes | 1 | 7 | 7 |
| judgment | `patch` | patch | yes | 2 | 2 | 2 |
| judgment | `deadlock` | deadlock ⚔️ | yes | 1 | 1 | 1 |
| judgment | `diagonal` | diagonal 🌶️ | **no** | 0 | 0 | 0 |
| composer | `editing` | editing (a draft) | yes | 3 | 3 | 3 |
| composer | `mine` | mine (proposed) | yes | 4 | 14 | 14 |
| composer | `stranded` | mine (stranded, E38) | yes | 2 | 2 | 2 |
| record | `sealed-record` | sealed record | yes | 5 | 51 | 51 |
| record | `backlog` | backlog (closed page) | yes | 1 | 2 | 2 |
| record | `motion-record` | settled motion record | yes | 5 | 14 | 14 |
| setting | `setting` | setting (founder, pen) / the composer | yes | 12 | 150 | 150 |
| setting | `birth` | setting — the birth (🪶 📍) | yes | 13 | 46 | 46 |
| setting | `admissions` | 🪪 Admissions | yes | 11 | 19 | 19 |
| setting | `applications` | 🤝 Applications | yes | 11 | 19 | 19 |
| setting | `hat` | 🎩 | yes | 10 | 17 | 17 |
| setting | `blind-answer` | blind answer (member) | yes | 1 | 1 | 1 |
| setting | `watching` | watching | **no** | 0 | 0 | 0 |
| power | `power` | power cards ✒️ 🛡️ | yes | 5 | 56 | 56 |
| motion | `motion-constitutional` | constitutional motion (consent) | yes | 6 | 9 | 9 |
| motion | `motion-ordinary` | ordinary motion (a race card) | yes | 5 | 5 | 5 |
| motion | `crown` | 👑 question | yes | 3 | 3 | 3 |
| motion | `crown-other` | 👑 question, for anybody but the Founder | yes | 3 | 5 | 5 |
| motion | `crown-text` | 👑 question (the Text) | yes | 2 | 2 | 2 |
| news | `park` | park ⏳ (news; E36) | yes | 4 | 6 | 6 |
| news | `failed-news` | settled motion record — mover’s unacknowledged rejection (E41) | yes | 1 | 1 | 1 |
| news | `grant` | grants 🏛️ ✒️ 🛡️ | yes | 11 | 36 | 36 |
| news | `gate` | gates 💡 ⚖️ | yes | 4 | 8 | 8 |
| news | `news` | news / owed OK | yes | 4 | 25 | 25 |
| lifecycle | `begin` | 🍾 Begin | yes | 9 | 15 | 15 |
| lifecycle | `closing` | 🥂 The Close | yes | 2 | 4 | 4 |
| door | `door-invite` | ✉️ Invite | yes | 11 | 20 | 20 |
| door | `door-remove` | ❌ Remove | yes | 9 | 18 | 18 |
| door | `door-leave` | 🌂 Leave the Membership | yes | 3 | 3 | 3 |
| door | `admit` | `adm:` an admission | yes | 3 | 9 | 9 |
| door | `stranger` | the stranger’s two | yes | 3 | 4 | 4 |
| door | `applicant` | the applicant’s five | **no** | 0 | 0 | 0 |
| identity | `identity` | identity ✋ 🖼️ 📧 | yes | 12 | 33 | 33 |

## Not reached

1. **diagonal 🌶️** — The fixture carries one (`diag-quorum-keys`) but it is unserved — SPEC §8.3a serves a diagonal, never offers it, and neither the fixture page nor the ladder's rooms served one to any seat opened. `SESSION.toggle` on it draws no card. Two attempts: the charter walk's toggle, and three seats at each live rung.
2. **the applicant’s five** — Only the applicant's own seat draws them. The ladder leaves one applicant *submitted* at the door, but `POST /api/dev/seat` seats members only (an applicant has no member record), and the file fixture cannot seat one (`allApplicants` reads the live view; card-audit's own EXEMPT note). `npm run applicants-walk` drives them end to end but asserts rather than photographs. Not reached.
3. **watching (as its own card)** — Reached only as the *delegated* walk's collecting state of each setting card (13 kinds × 2 widths); §9's separate "watching" row — the band tab of a setting you handed over and do not answer — draws the same setting card, so it is inventoried under `setting` / delegated rather than as its own kind.
4. **👑 release-batch · amendment-news · 📭 mail-give-up · 🥾 departure-news** — Each needs an act the ladder does not perform (a power laid down after 🍾, a ✒️ text decree, a bounced mail via `/api/dev/outbox/give-up`, a departure). Reaching them means scripting those acts on a live document seat by seat; the run did the phase ladder at five rungs × three seats and the fixture's seeded motions, and none of the four appeared in any rail. Recorded as not reached; they share the news card's grammar (one sentence and an OK).

## Evidence carried from the title-card fix (2026-09-24) — inputs for stage 2

1. **The *Set to … / Set by …* standing block repeats the card's head** (`readBody`, design/setup.js:801 — a `statline` then a `lockline`). **142** records: every read-only setting card (📍, 🌍, ⏱️, any setting whose ✒️ was laid down) on the member, stranger, closed and live walks. Example: [chamber-seat_1-1600.png](shots/current/chamber-seat_1-1600.png). **And a worse case:** on the live ladder at the *constitution* rung a member opening 🌍 or ❌ reads **"Set to undefined"** — [chamber-live_constitution_m-1-1600.png](shots/current/chamber-live_constitution_m-1-1600.png) (also at 390).
2. **A card with nothing left to change has a commit row of 🗑️ alone**, where SURFACE §9.1 / CP9 give such a row 🗑️ + OK. **234** records; by kind: `motion-constitutional` 8, `hat` 18, `crown-other` 10, `mine` 28, `birth` 28, `setting` 94, `admissions` 12, `applications` 12, `identity` 2, `door-invite` 10, `door-remove` 10, `editing` 2. Some are 🗑️-as-withdraw by rule (a member's own proposal, the editing card, a mover's motion); the read-only settings, 🎩 once locked, 🪪 🤝, the doors for a member and the non-founder 👑 are the CP9 cases.
3. **The closed document's charter cards draw an empty commit row whose hairline stands over nothing** (placeholder spans `binslot`, `rightpair`). card-audit P12 counts **24** at 1600; here **48** records across both widths, every one `bottom: div.race-mid.commitrow (top)`. Example: [quick-keys-closed-1600.png](shots/current/quick-keys-closed-1600.png).
4. **On the closed fixture ⏱️ says three things about who decided it**: the standing block *Decided by the members.*, the head radio *Chosen by the Founder ✒️*, its latest record *Changed by the Founder: a new proposal every 45 minutes* — with *Set to One every 45 minutes* restating the clause beneath. Records: `rate|closedband|1600`, `rate|closedband|390`; shot [rate-closedband-1600.png](shots/current/rate-closedband-1600.png).
5. **On the closed fixture the founder's settings still offer live *Choose this* radios and *Picking a value here takes it back*** on a document where nothing can change. **24** records (12 cards × 2 widths): admission, applications, lapse, removal, hat, myname, mypic, myemail, ending, quorum, authorship, judgments.

**Found along the way** (numbered on, for stage 2):

6. **🥂 states the closing moment twice** — its head *The document closed at 00:42 on 25 September. 2 members have signed it.* and a blue box beneath, *The document is final as of 00:42 on 25 September.* [closing-closedband-1600.png](shots/current/closing-closedband-1600.png).
7. **The floating 📝 (`edit-door`) covers the right rail's lowest entries at 1600** on the session fixture (the ✏️ and ↻ entries) — [page-session-1600.png](shots/current/page-session-1600.png). The dev switch likewise covers the contents rail's foot, but it is stagehand furniture.
8. **In edit mode a single-site draft carries 🗑️ and ✏️ twice** — the card's own row and the floating proposal-row, which at the window's foot overlaps the card — [editing-gap-site-1600.png](shots/current/editing-gap-site-1600.png). And a gap draft's head reads *A new clause after: ‹the clause before›…* where M19 heads a gap race *The gap as it stands / (no text here)*: one place, two heads.
9. **The 👑 Text question's ✒️ accept is drawn solid green** beside a flat 🛡️, where §9.1 reserves solid green for ✓; its strip's tab is the race's 💡, not 👑 — [crown_cq-4-live_session_founder-1600.png](shots/current/crown_cq-4-live_session_founder-1600.png).
10. **At 390 there is no edit door and no riding 📝 tab** (MOBILE.md: read + judge), yet edit mode opens if the tab is clicked by script, and the lifted column then stands 64px off the left edge and flush with the right — [page-editmode-390.png](shots/current/page-editmode-390.png).
11. **The contents rail's marks run past the left drawer's edge at 390** (*…8 more* cut by the glass) — [page-drawer-left-390.png](shots/current/page-drawer-left-390.png).

card-audit's rollup at 1600, for reference: S1 538 · P12 24 · H2 8 · F6 2 · H4 1 sightings. S1 is the spacing grid (`.sugg` 15.13px side margins and 14px padding, `.headclause` 6px padding, `.setupcard` −17px top margin — all off `--s1…--s5`).

## Judgment cards (the charter)

### `quick` — quick / insert

Rules: §9 quick, CP1, CP2, CP4, CP7 (Q1500), M18, K19, §9.1. Keys: `quick-keys` `quick-armchair` `quick-books` `quick-powertools` `quick-shedhead` `quick-twiceyear` `quick-attendance` `quick-subs` `quick-guests-hours` `race-guests-notice` `quick-guestkey` `quick-nohead` `quick-cellar` `quick-lostkey` … (23).

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| the session fixture (Hollow Oak) · needs | 14 | [quick-keys-charter-1600.png](shots/current/quick-keys-charter-1600.png) | [quick-keys-charter-390.png](shots/current/quick-keys-charter-390.png) | Choose one of the three first | — | 0, 32.97 |
| the session fixture (Hollow Oak) · needs, deadlocked | 1 | [race-guests-notice-charter-1600.png](shots/current/race-guests-notice-charter-1600.png) | [race-guests-notice-charter-390.png](shots/current/race-guests-notice-charter-390.png) | Choose one of the three first | — | 0, 32.97 |
| the closed page (fixture &closed=1) · needs | 14 | [quick-keys-closed-1600.png](shots/current/quick-keys-closed-1600.png) | [quick-keys-closed-390.png](shots/current/quick-keys-closed-390.png) | (none) | 26/28 | 0, 32.97 |
| the closed page (fixture &closed=1) · deciding | 5 | [quick-guests-count-closed-1600.png](shots/current/quick-guests-count-closed-1600.png) | [quick-guests-count-closed-390.png](shots/current/quick-guests-count-closed-390.png) | (none) | 10/10 | 0, 122.65 |
| the closed page (fixture &closed=1) · needs, deadlocked | 1 | [race-guests-notice-closed-1600.png](shots/current/race-guests-notice-closed-1600.png) | [race-guests-notice-closed-390.png](shots/current/race-guests-notice-closed-390.png) | (none) | 2/2 | 0, 32.97 |
| live ladder · rung session | 3 | [r_c2_c2_inc_384ecc90923c13ae-live_session_founder-1600.png](shots/current/r_c2_c2_inc_384ecc90923c13ae-live_session_founder-1600.png) | [r_c2_c2_inc_384ecc90923c13ae-live_session_founder-390.png](shots/current/r_c2_c2_inc_384ecc90923c13ae-live_session_founder-390.png) | Recorded — choose again to change it | — | 0, 90.97 |
| live ladder · rung closing | 3 | [r_c2_c2_inc_384ecc90923c13ae-live_session_founder-1600.png](shots/current/r_c2_c2_inc_384ecc90923c13ae-live_session_founder-1600.png) | [r_c2_c2_inc_384ecc90923c13ae-live_session_founder-390.png](shots/current/r_c2_c2_inc_384ecc90923c13ae-live_session_founder-390.png) | Recorded — choose again to change it | — | 0, 90.97 |

<details><summary><b>the session fixture (Hollow Oak) · needs</b> — <code>quick-keys</code></summary>

- **Slots, in order:** head “The clause as it standsEvery member holds a front-door key, and membe…” → field [top rule] “ProposedEvery member holds a front-door key, and may lend or cut a sp…” → choices [top rule] “Indifferent” → commit row [top rule]
- **Dividers:** head | field; field | choices; choices | commit row
- **Controls:** button ? — nothing (disabled); radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** eyebrow “The clause as it stands” · head “Every member holds a front-door key, and members may lend or cut spares for regulars they trust.”
- **All visible text:** The clause as it standsEvery member holds a front-door key, and members may lend or cut spares for regulars they trust.Prefer this✏️ propose editProposedEvery member holds a front-door key, and may lend or cut a spare for a regular they trust, provided the Steward keeps a simple note of who holds one.Keys are a security matter, not a vibe. A one-line log with the Steward costs nothing and means we can account for wh…
- **Tab and rail:** tab —, glyph travel [0,32.97], clause travel [12,38.96]; rail  “with or without ‘members’ …Keys are a security matter, not a vibe. A one-line l…”
- **Geometry:** 652×473px at x 478, radius 8, border 0; at 390 306×609px, page 390px wide, glyph travel [0,32.97]
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [quick-keys-charter-1600.png](shots/current/quick-keys-charter-1600.png) · same state: `quick-keys` `quick-armchair` `quick-books` `quick-powertools` `quick-shedhead` `quick-twiceyear` `quick-attendance` `quick-subs` `quick-guests-hours` `quick-guestkey` `quick-nohead` `quick-cellar`

</details>

<details><summary><b>the session fixture (Hollow Oak) · needs, deadlocked</b> — <code>race-guests-notice</code></summary>

- **Slots, in order:** head “The clause as it standsFriends of the house are welcome whenever a me…” → field [top rule] “ProposedFriends of the house are welcome whenever a member is in, and…” → choices [top rule] “Indifferent” → commit row [top rule]
- **Dividers:** head | field; field | choices; choices | commit row
- **Controls:** button ? — nothing (disabled); radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** eyebrow “The clause as it stands” · head “Friends of the house are welcome whenever a member is in.”
- **All visible text:** The clause as it standsFriends of the house are welcome whenever a member is in.Prefer this✏️ propose editProposedFriends of the house are welcome whenever a member is in, and a member expecting more than one says so in the Members’ Book. The house splits cleanly on this and has not moved in a week: half want it written down, half think a rule about friends is the beginning of the end. Somebody needs to find the ver…
- **Tab and rail:** tab —, glyph travel [0,32.97], clause travel [12,38.97]; rail  “with or without ‘and a member expecting more than…’The house splits cleanly on …”
- **Geometry:** 652×466px at x 478, radius 8, border 0; at 390 306×596px, page 390px wide, glyph travel [0,32.97]
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [race-guests-notice-charter-1600.png](shots/current/race-guests-notice-charter-1600.png)

</details>

<details><summary><b>the closed page (fixture &closed=1) · needs</b> — <code>quick-keys</code></summary>

- **Slots, in order:** head “The clause as it standsEvery member holds a front-door key, and membe…” → field [top rule] “ProposedEvery member holds a front-door key, and may lend or cut a sp…” → choices [top rule] “Indifferent” → commit row [top rule]
- **Dividers:** head | field; field | choices; choices | commit row **(nothing on one side)** — **P12:** bottom div.race-mid.commitrow (top)
- **Controls:** radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** eyebrow “The clause as it stands” · head “Every member holds a front-door key, and members may lend or cut spares for regulars they trust.”
- **All visible text:** The clause as it standsEvery member holds a front-door key, and members may lend or cut spares for regulars they trust.Prefer this✏️ propose editProposedEvery member holds a front-door key, and may lend or cut a spare for a regular they trust, provided the Steward keeps a simple note of who holds one.Keys are a security matter, not a vibe. A one-line log with the Steward costs nothing and means we can account for wh…
- **Tab and rail:** tab —, glyph travel [0,32.97], clause travel [12,38.97]; rail  “with or without ‘members’ …Keys are a security matter, not a vibe. A one-line l…”
- **Geometry:** 652×433px at x 478, radius 8, border 0; at 390 306×569px, page 390px wide, glyph travel [0,32.97]
- **card-audit:** P12: div.race-mid.commitrow (top) is the last thing on the card; S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [quick-keys-closed-1600.png](shots/current/quick-keys-closed-1600.png) · same state: `quick-keys` `quick-armchair` `quick-books` `quick-powertools` `quick-shedhead` `quick-twiceyear` `quick-attendance` `quick-subs` `quick-guests-hours` `quick-guestkey` `quick-nohead` `quick-cellar`

</details>

<details><summary><b>the closed page (fixture &closed=1) · deciding</b> — <code>quick-guests-count</code></summary>

- **Slots, in order:** head “The clause as it standsFriends of the house are welcome whenever a me…” → field [top rule] “ProposedFriends of the house are welcome whenever a member is in, up …” → choices [top rule] “Indifferent” → commit row [top rule]
- **Dividers:** head | field; field | choices; choices | commit row **(nothing on one side)** — **P12:** bottom div.race-mid.commitrow (top)
- **Controls:** radio “Preferred” (on); radio “Prefer this”; radio “Indifferent”
- **Strings:** eyebrow “The clause as it stands” · head “Friends of the house are welcome whenever a member is in.”
- **All visible text:** The clause as it standsFriends of the house are welcome whenever a member is in.Preferred✏️ propose editProposedFriends of the house are welcome whenever a member is in, up to three at a time without telling anybody.Nobody minds two friends. Nine is a party, and a party is a thing you mention.Prefer this✏️ propose editIndifferent
- **Tab and rail:** tab —, glyph travel [0,122.65], clause travel [12,38.96]; rail  “with or without ‘up to three at a time without…’”
- **Geometry:** 652×393px at x 478, radius 8, border 0; at 390 306×501px, page 390px wide, glyph travel [0,119.97]
- **card-audit:** P12: div.race-mid.commitrow (top) is the last thing on the card; S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [quick-guests-count-closed-1600.png](shots/current/quick-guests-count-closed-1600.png) · same state: `quick-guests-count` `quick-confidence` `quick-probation` `quick-accounts-blocked` `quick-garden`

</details>

<details><summary><b>the closed page (fixture &closed=1) · needs, deadlocked</b> — <code>race-guests-notice</code></summary>

- **Slots, in order:** head “The clause as it standsFriends of the house are welcome whenever a me…” → field [top rule] “ProposedFriends of the house are welcome whenever a member is in, and…” → choices [top rule] “Indifferent” → commit row [top rule]
- **Dividers:** head | field; field | choices; choices | commit row **(nothing on one side)** — **P12:** bottom div.race-mid.commitrow (top)
- **Controls:** radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** eyebrow “The clause as it stands” · head “Friends of the house are welcome whenever a member is in.”
- **All visible text:** The clause as it standsFriends of the house are welcome whenever a member is in.Prefer this✏️ propose editProposedFriends of the house are welcome whenever a member is in, and a member expecting more than one says so in the Members’ Book. The house splits cleanly on this and has not moved in a week: half want it written down, half think a rule about friends is the beginning of the end. Somebody needs to find the ver…
- **Tab and rail:** tab —, glyph travel [0,32.97], clause travel [12,38.96]; rail  “with or without ‘and a member expecting more than…’The house splits cleanly on …”
- **Geometry:** 652×426px at x 478, radius 8, border 0; at 390 306×556px, page 390px wide, glyph travel [0,32.97]
- **card-audit:** P12: div.race-mid.commitrow (top) is the last thing on the card; S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [race-guests-notice-closed-1600.png](shots/current/race-guests-notice-closed-1600.png)

</details>

<details><summary><b>live ladder · rung session</b> — <code>r:c2#c2:inc:384ecc90923c13ae</code></summary>

- **Slots, in order:** head “The clause as it standsFront-door keys are held by members only; ever…” → field [top rule] “ProposedKeys are held by members only, and no copies may be made; any…” → choices [top rule] “Indifferent” → commit row [top rule]
- **Dividers:** head | field; field | choices; choices | commit row
- **Controls:** button ? — Recorded — choose again to change it; radio “Preferred” (on); radio “Prefer this”; radio “Indifferent”
- **Strings:** eyebrow “The clause as it stands” · head “Front-door keys are held by members only; every key and fob is listed in the Key Book, and lost keys are reported and r…”
- **All visible text:** The clause as it standsFront-door keys are held by members only; every key and fob is listed in the Key Book, and lost keys are reported and replaced at the holder’s expense.Preferred✏️ propose editProposedKeys are held by members only, and no copies may be made; anyone else is let in by a member and is that member’s guest.Fourteen keys, fourteen people, no ambiguity. Everyone else knocks.Prefer this✏️ propose editI…
- **Tab and rail:** tab —, glyph travel [0,90.97], clause travel [12,38.97]; rail  “‘Front-door…’ or ‘Keys are held…’”
- **Geometry:** 652×458px at x 478, radius 8, border 0; at 390 306×597px, page 390px wide, glyph travel [0,90.97]
- **Shot:** [r_c2_c2_inc_384ecc90923c13ae-live_session_founder-1600.png](shots/current/r_c2_c2_inc_384ecc90923c13ae-live_session_founder-1600.png) · same state: `r:c2#c2:inc:384ecc90923c13ae` `r:c2#c3:inc:384ecc90923c13ae` `r:c5#c5:inc:8f0cdaed80f0087e`

</details>

<details><summary><b>live ladder · rung closing</b> — <code>r:c2#c2:inc:384ecc90923c13ae</code></summary>

- **Slots, in order:** head “The clause as it standsFront-door keys are held by members only; ever…” → field [top rule] “ProposedKeys are held by members only, and no copies may be made; any…” → choices [top rule] “Indifferent” → commit row [top rule]
- **Dividers:** head | field; field | choices; choices | commit row
- **Controls:** button ? — Recorded — choose again to change it; radio “Preferred” (on); radio “Prefer this”; radio “Indifferent”
- **Strings:** eyebrow “The clause as it stands” · head “Front-door keys are held by members only; every key and fob is listed in the Key Book, and lost keys are reported and r…”
- **All visible text:** The clause as it standsFront-door keys are held by members only; every key and fob is listed in the Key Book, and lost keys are reported and replaced at the holder’s expense.Preferred✏️ propose editProposedKeys are held by members only, and no copies may be made; anyone else is let in by a member and is that member’s guest.Fourteen keys, fourteen people, no ambiguity. Everyone else knocks.Prefer this✏️ propose editI…
- **Tab and rail:** tab —, glyph travel [0,90.97], clause travel [12,38.97]; rail  “‘Front-door…’ or ‘Keys are held…’”
- **Geometry:** 652×458px at x 478, radius 8, border 0; at 390 306×597px, page 390px wide, glyph travel [0,90.97]
- **Shot:** [r_c2_c2_inc_384ecc90923c13ae-live_session_founder-1600.png](shots/current/r_c2_c2_inc_384ecc90923c13ae-live_session_founder-1600.png) · same state: `r:c2#c2:inc:384ecc90923c13ae` `r:c2#c3:inc:384ecc90923c13ae` `r:c5#c5:inc:8f0cdaed80f0087e`

</details>

### `insert` — quick / insert (gap)

Rules: §9 quick, M19, K31 gap, CP4, Q1379. Keys: `insert-quiet` `race-quiet-rivals`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| the session fixture (Hollow Oak) · needs | 2 | [insert-quiet-charter-1600.png](shots/current/insert-quiet-charter-1600.png) | [insert-quiet-charter-390.png](shots/current/insert-quiet-charter-390.png) | Choose one of the three first | — | 0, 35.36 |
| the closed page (fixture &closed=1) · needs | 2 | [insert-quiet-closed-1600.png](shots/current/insert-quiet-closed-1600.png) | [insert-quiet-closed-390.png](shots/current/insert-quiet-closed-390.png) | (none) | 4/4 | 0, 35.36 |

<details><summary><b>the session fixture (Hollow Oak) · needs</b> — <code>insert-quiet</code></summary>

- **Slots, in order:** head “The gap as it stands(no text here)Prefer this” → field [top rule] “ProposedQuiet HoursThe house keeps quiet hours from eleven at night t…” → choices [top rule] “Indifferent” → commit row [top rule]
- **Dividers:** head | field; field | choices; choices | commit row
- **Controls:** button ? — nothing (disabled); radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** eyebrow “The gap as it stands” · head “(no text here)”
- **All visible text:** The gap as it stands(no text here)Prefer thisProposedQuiet HoursThe house keeps quiet hours from eleven at night to eight in the morning: voices low in the Common Areas, the Workshop’s louder tools asleep, and any gathering still going moves to the Garden or winds down.We’ve never written down the one rule everyone already tiptoes around. Guests stay over, members work early — saying it out loud beats resenting each…
- **Tab and rail:** tab —, glyph travel [0,35.36], clause travel null; rail  “with or without ‘The house keeps quiet hours from…’We’ve never written down the…”
- **Geometry:** 652×498px at x 478, radius 8, border 0; at 390 306×652px, page 390px wide, glyph travel [0,35.36]
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [insert-quiet-charter-1600.png](shots/current/insert-quiet-charter-1600.png) · same state: `insert-quiet` `race-quiet-rivals`

</details>

<details><summary><b>the closed page (fixture &closed=1) · needs</b> — <code>insert-quiet</code></summary>

- **Slots, in order:** head “The gap as it stands(no text here)Prefer this” → field [top rule] “ProposedQuiet HoursThe house keeps quiet hours from eleven at night t…” → choices [top rule] “Indifferent” → commit row [top rule]
- **Dividers:** head | field; field | choices; choices | commit row **(nothing on one side)** — **P12:** bottom div.race-mid.commitrow (top)
- **Controls:** radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** eyebrow “The gap as it stands” · head “(no text here)”
- **All visible text:** The gap as it stands(no text here)Prefer thisProposedQuiet HoursThe house keeps quiet hours from eleven at night to eight in the morning: voices low in the Common Areas, the Workshop’s louder tools asleep, and any gathering still going moves to the Garden or winds down.We’ve never written down the one rule everyone already tiptoes around. Guests stay over, members work early — saying it out loud beats resenting each…
- **Tab and rail:** tab —, glyph travel [0,35.36], clause travel null; rail  “with or without ‘The house keeps quiet hours from…’We’ve never written down the…”
- **Geometry:** 652×458px at x 478, radius 8, border 0; at 390 306×612px, page 390px wide, glyph travel [0,35.36]
- **card-audit:** P12: div.race-mid.commitrow (top) is the last thing on the card; S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [insert-quiet-closed-1600.png](shots/current/insert-quiet-closed-1600.png) · same state: `insert-quiet` `race-quiet-rivals`

</details>

### `race` — race

Rules: §9 race, CP2, CP4, M18, M20. Keys: `race-purse` `race-quorum` `race-expiry` `race-guests-rivals` `race-sanctions` `race-hardship` `r:c2#c2:c3` `r:c5#c5:c6` `r:c8#c8:c9`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| the session fixture (Hollow Oak) · needs | 3 | [race-purse-charter-1600.png](shots/current/race-purse-charter-1600.png) | [race-purse-charter-390.png](shots/current/race-purse-charter-390.png) | Choose one of the three first | — | 0, 32.97 |
| the closed page (fixture &closed=1) · deciding | 2 | [race-guests-rivals-closed-1600.png](shots/current/race-guests-rivals-closed-1600.png) | [race-guests-rivals-closed-390.png](shots/current/race-guests-rivals-closed-390.png) | (none) | 4/4 | 0, 152.54 |
| the closed page (fixture &closed=1) · deciding, deadlocked | 1 | [race-sanctions-closed-1600.png](shots/current/race-sanctions-closed-1600.png) | [race-sanctions-closed-390.png](shots/current/race-sanctions-closed-390.png) | 🗑️ · ✏️ | — | 0, 32.97 |
| the closed page (fixture &closed=1) · needs | 1 | [race-expiry-closed-1600.png](shots/current/race-expiry-closed-1600.png) | [race-expiry-closed-390.png](shots/current/race-expiry-closed-390.png) | (none) | 2/2 | 0, 32.97 |
| live ladder · rung session | 3 | [r_c2_c2_c3-live_session_founder-1600.png](shots/current/r_c2_c2_c3-live_session_founder-1600.png) | [r_c2_c2_c3-live_session_founder-390.png](shots/current/r_c2_c2_c3-live_session_founder-390.png) | ❄️ · Choose one of the three first | — | 0, 32.97 |
| live ladder · rung closing | 3 | [r_c2_c2_c3-live_session_founder-1600.png](shots/current/r_c2_c2_c3-live_session_founder-1600.png) | [r_c2_c2_c3-live_closing_founder-390.png](shots/current/r_c2_c2_c3-live_closing_founder-390.png) | ❄️ · Choose one of the three first | — | 0, 32.97 |

<details><summary><b>the session fixture (Hollow Oak) · needs</b> — <code>race-purse</code></summary>

- **Slots, in order:** head “The clause as it standsThe Purse-holder pays the bills and reimburses…” → field [top rule] “Proposed · 2 rival proposalsThe Purse-holder pays only bills approved…” → other “Neither of these has to win — the clause above stands unless the memb…” → choices [top rule] “Indifferent” → commit row [top rule]
- **Dividers:** head | field; other | choices; choices | commit row
- **Controls:** button ? — nothing (disabled); radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** eyebrow “The clause as it stands” · head “The Purse-holder pays the bills and reimburses what seems fair, and keeps the receipts in the tin.”
- **All visible text:** The clause as it standsThe Purse-holder pays the bills and reimburses what seems fair, and keeps the receipts in the tin.Proposed · 2 rival proposalsThe Purse-holder pays only bills approved under the budget or by a house decision, reimburses claims against receipts, keeps accounts and receipts open to any member on request, and reports income and spending at every meeting.Whoever holds the purse must be watched: "r…
- **Tab and rail:** tab —, glyph travel [0,32.97], clause travel [12,38.97]; rail  “‘only bills…’ or ‘the house’s…’Whoever holds the purse must be watched: "reimbu…”
- **Geometry:** 652×693px at x 478, radius 8, border 0; at 390 306×1060px, page 390px wide, glyph travel [0,32.97]
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [race-purse-charter-1600.png](shots/current/race-purse-charter-1600.png) · same state: `race-purse` `race-quorum` `race-expiry`

</details>

<details><summary><b>the closed page (fixture &closed=1) · deciding</b> — <code>race-guests-rivals</code></summary>

- **Slots, in order:** head “The clause as it standsFriends of the house are welcome whenever a me…” → field [top rule] “Proposed · 2 rival proposalsFriends of the house are welcome whenever…” → other “Neither of these has to win — the clause above stands unless the memb…” → choices [top rule] “Indifferent” → commit row [top rule]
- **Dividers:** head | field; other | choices; choices | commit row **(nothing on one side)** — **P12:** bottom div.race-mid.commitrow (top)
- **Controls:** radio “Preferred” (on); radio “Prefer this”; radio “Indifferent”
- **Strings:** eyebrow “The clause as it stands” · head “Friends of the house are welcome whenever a member is in.”
- **All visible text:** The clause as it standsFriends of the house are welcome whenever a member is in.Proposed · 2 rival proposalsFriends of the house are welcome whenever a member is in, up to three at a time without telling anybody.Nobody minds two friends. Nine is a party, and a party is a thing you mention.Preferred✏️ propose editFriends of the house are welcome whenever a member is in, and until the quiet hours begin.Welcome and “we…
- **Tab and rail:** tab —, glyph travel [0,152.54], clause travel [12,38.96]; rail  “‘up to three…’ or ‘and until the…’”
- **Geometry:** 652×537px at x 478, radius 8, border 0; at 390 306×740px, page 390px wide, glyph travel [0,148.97]
- **card-audit:** P12: div.race-mid.commitrow (top) is the last thing on the card; S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [race-guests-rivals-closed-1600.png](shots/current/race-guests-rivals-closed-1600.png) · same state: `race-guests-rivals` `race-hardship`

</details>

<details><summary><b>the closed page (fixture &closed=1) · deciding, deadlocked</b> — <code>race-sanctions</code></summary>

- **Slots, in order:** head “The clause as it stands — and it is still standingThe house may ask f…” → field [top rule] “Everything in flight · 8 proposals, oldest firstThe house may ask for…” → field [top rule] “✏️ propose something everyone can agree onThe house may ask for an ap…” → commit row [top rule] “🗑️✏️”
- **Dividers:** head | field; field | field; field | commit row
- **Controls:** button 🗑️ — Close — there is nothing here to put back; button ✏️ — nothing (disabled)
- **Strings:** eyebrow “The clause as it stands — and it is still standing” · head “The house may ask for an apology, may suspend a right for a season, or in the last resort may remove a member under Par…” · notes “We should change this because…”
- **All visible text:** The clause as it stands — and it is still standingThe house may ask for an apology, may suspend a right for a season, or in the last resort may remove a member under Part III.Everything in flight · 8 proposals, oldest firstThe house may ask for an apology or suspend a right for a season; removal under Part III is available only where a sanction has already been imposed and has not been kept to.Removal should never b…
- **Tab and rail:** tab —, glyph travel [0,32.97], clause travel [12,38.97]; rail  “SanctionsDeadlocked — 11 people can’t agree on a proposal even after 34 votes. …”
- **Geometry:** 652×1789px at x 478, radius 8, border 0; at 390 306×2811px, page 390px wide, glyph travel [0,47.94]
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [race-sanctions-closed-1600.png](shots/current/race-sanctions-closed-1600.png)

</details>

<details><summary><b>the closed page (fixture &closed=1) · needs</b> — <code>race-expiry</code></summary>

- **Slots, in order:** head “The clause as it standsThe lease under Section 2. ends on 29 November…” → field [top rule] “Proposed · 2 rival proposalsThe lease under Section 2. ends on 29 Nov…” → other “Neither of these has to win — the clause above stands unless the memb…” → choices [top rule] “Indifferent” → commit row [top rule]
- **Dividers:** head | field; other | choices; choices | commit row **(nothing on one side)** — **P12:** bottom div.race-mid.commitrow (top)
- **Controls:** radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** eyebrow “The clause as it stands” · head “The lease under Section 2. ends on 29 November 2026. The Club asks the Trust to renew it *before* the spring meeting, n…”
- **All visible text:** The clause as it standsThe lease under Section 2. ends on 29 November 2026. The Club asks the Trust to renew it *before* the spring meeting, not after it!Proposed · 2 rival proposalsThe lease under Section 2. ends on 29 November 2026. The Steward writes to the Trust about renewing it in September.Asking before the spring meeting is too early to know the rent. September leaves two months, which has always been enough…
- **Tab and rail:** tab —, glyph travel [0,32.97], clause travel [12,38.97]; rail  “‘Steward…’ or ‘Club asks’ …Asking before the spring meeting is too early to kno…”
- **Geometry:** 652×562px at x 478, radius 8, border 0; at 390 306×821px, page 390px wide, glyph travel [0,32.97]
- **card-audit:** P12: div.race-mid.commitrow (top) is the last thing on the card; S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [race-expiry-closed-1600.png](shots/current/race-expiry-closed-1600.png)

</details>

<details><summary><b>live ladder · rung session</b> — <code>r:c2#c2:c3</code></summary>

- **Slots, in order:** head “The clause as it standsFront-door keys are held by members only; ever…” → field [top rule] “Proposed · 2 rival proposalsKeys are held by members only, and no cop…” → other “Neither of these has to win — the clause above stands unless the memb…” → choices [top rule] “Indifferent” → commit row [top rule] “❄️”
- **Dividers:** head | field; other | choices; choices | commit row
- **Controls:** button ❄️ — Not this one, not now — it stays open and stops being the most urgent; button ? — nothing (disabled); radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** eyebrow “The clause as it stands” · head “Front-door keys are held by members only; every key and fob is listed in the Key Book, and lost keys are reported and r…”
- **All visible text:** The clause as it standsFront-door keys are held by members only; every key and fob is listed in the Key Book, and lost keys are reported and replaced at the holder’s expense.Proposed · 2 rival proposalsKeys are held by members only, and no copies may be made; anyone else is let in by a member and is that member’s guest.Fourteen keys, fourteen people, no ambiguity. Everyone else knocks.Prefer this✏️ propose editSpare…
- **Tab and rail:** tab —, glyph travel [0,32.97], clause travel [12,38.97]; rail  “‘Keys are held…’ or ‘Spare keys…’Fourteen keys, fourteen people, no ambiguity. …”
- **Geometry:** 652×563px at x 478, radius 8, border 0; at 390 306×775px, page 390px wide, glyph travel [0,32.97]
- **Shot:** [r_c2_c2_c3-live_session_founder-1600.png](shots/current/r_c2_c2_c3-live_session_founder-1600.png) · same state: `r:c2#c2:c3` `r:c5#c5:c6` `r:c8#c8:c9`

</details>

<details><summary><b>live ladder · rung closing</b> — <code>r:c2#c2:c3</code></summary>

- **Slots, in order:** head “The clause as it standsFront-door keys are held by members only; ever…” → field [top rule] “Proposed · 2 rival proposalsKeys are held by members only, and no cop…” → other “Neither of these has to win — the clause above stands unless the memb…” → choices [top rule] “Indifferent” → commit row [top rule] “❄️”
- **Dividers:** head | field; other | choices; choices | commit row
- **Controls:** button ❄️ — Not this one, not now — it stays open and stops being the most urgent; button ? — nothing (disabled); radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** eyebrow “The clause as it stands” · head “Front-door keys are held by members only; every key and fob is listed in the Key Book, and lost keys are reported and r…”
- **All visible text:** The clause as it standsFront-door keys are held by members only; every key and fob is listed in the Key Book, and lost keys are reported and replaced at the holder’s expense.Proposed · 2 rival proposalsKeys are held by members only, and no copies may be made; anyone else is let in by a member and is that member’s guest.Fourteen keys, fourteen people, no ambiguity. Everyone else knocks.Prefer this✏️ propose editSpare…
- **Tab and rail:** tab —, glyph travel [0,32.97], clause travel [12,38.97]; rail  “‘Keys are held…’ or ‘Spare keys…’Fourteen keys, fourteen people, no ambiguity. …”
- **Geometry:** 652×563px at x 478, radius 8, border 0; at 390 306×775px, page 390px wide, glyph travel [0,32.97]
- **Shot:** [r_c2_c2_c3-live_session_founder-1600.png](shots/current/r_c2_c2_c3-live_session_founder-1600.png) · same state: `r:c2#c2:c3` `r:c5#c5:c6` `r:c8#c8:c9`

</details>

### `judged-pair` — ⏳ judged pair

Rules: §9 ⏳ judged pair, Q1367, CP8. Keys: `quick-guests-count` `race-guests-rivals` `quick-confidence` `race-hardship` `quick-probation` `quick-accounts-blocked` `quick-garden`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| the session fixture (Hollow Oak) · deciding | 7 | [quick-guests-count-charter-1600.png](shots/current/quick-guests-count-charter-1600.png) | [quick-guests-count-charter-390.png](shots/current/quick-guests-count-charter-390.png) | Recorded — choose again to change it | — | 0, 122.64 |

<details><summary><b>the session fixture (Hollow Oak) · deciding</b> — <code>quick-guests-count</code></summary>

- **Slots, in order:** head “The clause as it standsFriends of the house are welcome whenever a me…” → field [top rule] “ProposedFriends of the house are welcome whenever a member is in, up …” → choices [top rule] “Indifferent” → commit row [top rule]
- **Dividers:** head | field; field | choices; choices | commit row
- **Controls:** button ? — Recorded — choose again to change it; radio “Preferred” (on); radio “Prefer this”; radio “Indifferent”
- **Strings:** eyebrow “The clause as it stands” · head “Friends of the house are welcome whenever a member is in.”
- **All visible text:** The clause as it standsFriends of the house are welcome whenever a member is in.Preferred✏️ propose editProposedFriends of the house are welcome whenever a member is in, up to three at a time without telling anybody.Nobody minds two friends. Nine is a party, and a party is a thing you mention.Prefer this✏️ propose editIndifferent
- **Tab and rail:** tab —, glyph travel [0,122.64], clause travel [12,38.97]; rail  “with or without ‘up to three at a time without…’”
- **Geometry:** 652×433px at x 478, radius 8, border 0; at 390 306×541px, page 390px wide, glyph travel [0,119.97]
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [quick-guests-count-charter-1600.png](shots/current/quick-guests-count-charter-1600.png) · same state: `quick-guests-count` `race-guests-rivals` `quick-confidence` `race-hardship` `quick-probation` `quick-accounts-blocked` `quick-garden`

</details>

### `patch` — patch

Rules: §9 patch, Q1108, Q1382, K17–K18. Keys: `patch-rename`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| the session fixture (Hollow Oak) · needs | 1 | [patch-rename-charter-1600.png](shots/current/patch-rename-charter-1600.png) | [patch-rename-charter-390.png](shots/current/patch-rename-charter-390.png) | (none) | — | 0, 110.97 |
| the closed page (fixture &closed=1) · needs | 1 | [patch-rename-closed-1600.png](shots/current/patch-rename-closed-1600.png) | [patch-rename-closed-390.png](shots/current/patch-rename-closed-390.png) | (none) | — | 0, 81.97 |

<details><summary><b>the session fixture (Hollow Oak) · needs</b> — <code>patch-rename</code></summary>

- **Slots, in order:** other [bottom rule] “§ The Purse-holder · place 1 of 3↑↓” → head “The clause as it standsThe Purse-holder pays the bills and reimburses…” → field [top rule] “ProposedThe Treasurer pays the bills and reimburses what seems fair, …” → other “One vote for all 3 places — choosing here chooses everywhere.” → choices [top rule] “Indifferent”
- **Dividers:** other | head; head | field; other | choices
- **Controls:** radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** eyebrow “The clause as it stands” · head “The Purse-holder pays the bills and reimburses what seems fair, and keeps the receipts in the tin.”
- **All visible text:** § The Purse-holder · place 1 of 3↑↓The clause as it standsThe Purse-holder pays the bills and reimburses what seems fair, and keeps the receipts in the tin.Prefer this✏️ propose editProposedThe Treasurer pays the bills and reimburses what seems fair, keeps the receipts in the tin, and hands the tin and books to their successor."Purse-holder" is twee and confuses newcomers. One rename, all three places it appears, pl…
- **Tab and rail:** tab —, glyph travel [0,110.97], clause travel [12,87.97]; rail  “‘Purse-holder’ or ‘Treasurer’ …1 of 3 places"Purse-holder" is twee and confuses…”
- **Geometry:** 652×482px at x 478, radius 8, border 0; at 390 306×628px, page 390px wide, glyph travel [0,110.97]
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [patch-rename-charter-1600.png](shots/current/patch-rename-charter-1600.png)

</details>

<details><summary><b>the closed page (fixture &closed=1) · needs</b> — <code>patch-rename</code></summary>

- **Slots, in order:** other [bottom rule] “§ The Purse-holder · place 1 of 3↑↓” → head “The clause as it standsThe Purse-holder pays the bills and reimburses…” → field [top rule] “ProposedThe Treasurer pays the bills and reimburses what seems fair, …” → other “One vote for all 3 places — choosing here chooses everywhere.” → choices [top rule] “Indifferent”
- **Dividers:** other | head; head | field; other | choices
- **Controls:** radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** eyebrow “The clause as it stands” · head “The Purse-holder pays the bills and reimburses what seems fair, and keeps the receipts in the tin.”
- **All visible text:** § The Purse-holder · place 1 of 3↑↓The clause as it standsThe Purse-holder pays the bills and reimburses what seems fair, and keeps the receipts in the tin.Prefer this✏️ propose editProposedThe Treasurer pays the bills and reimburses what seems fair, keeps the receipts in the tin, and hands the tin and books to their successor."Purse-holder" is twee and confuses newcomers. One rename, all three places it appears, pl…
- **Tab and rail:** tab —, glyph travel [0,81.97], clause travel [12,87.97]; rail  “‘Purse-holder’ or ‘Treasurer’ …1 of 3 places"Purse-holder" is twee and confuses…”
- **Geometry:** 652×482px at x 478, radius 8, border 0; at 390 306×628px, page 390px wide, glyph travel [0,81.96]
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [patch-rename-closed-1600.png](shots/current/patch-rename-closed-1600.png)

</details>

### `deadlock` — deadlock ⚔️

Rules: §9 deadlock, M16, Q613. Keys: `race-sanctions`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| the session fixture (Hollow Oak) · deciding, deadlocked | 1 | [race-sanctions-charter-1600.png](shots/current/race-sanctions-charter-1600.png) | [race-sanctions-charter-390.png](shots/current/race-sanctions-charter-390.png) | 🗑️ · ✏️ | — | 0, 32.97 |

<details><summary><b>the session fixture (Hollow Oak) · deciding, deadlocked</b> — <code>race-sanctions</code></summary>

- **Slots, in order:** head “The clause as it stands — and it is still standingThe house may ask f…” → field [top rule] “Everything in flight · 8 proposals, oldest firstThe house may ask for…” → field [top rule] “✏️ propose something everyone can agree onThe house may ask for an ap…” → commit row [top rule] “🗑️✏️”
- **Dividers:** head | field; field | field; field | commit row
- **Controls:** button 🗑️ — Close — there is nothing here to put back; button ✏️ — nothing (disabled)
- **Strings:** eyebrow “The clause as it stands — and it is still standing” · head “The house may ask for an apology, may suspend a right for a season, or in the last resort may remove a member under Par…” · notes “We should change this because…”
- **All visible text:** The clause as it stands — and it is still standingThe house may ask for an apology, may suspend a right for a season, or in the last resort may remove a member under Part III.Everything in flight · 8 proposals, oldest firstThe house may ask for an apology or suspend a right for a season; removal under Part III is available only where a sanction has already been imposed and has not been kept to.Removal should never b…
- **Tab and rail:** tab —, glyph travel [0,32.97], clause travel [12,38.97]; rail  “SanctionsDeadlocked — 11 people can’t agree on a proposal even after 34 votes. …”
- **Geometry:** 652×1789px at x 478, radius 8, border 0; at 390 306×2811px, page 390px wide, glyph travel [0,47.94]
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [race-sanctions-charter-1600.png](shots/current/race-sanctions-charter-1600.png)

</details>

## Your own proposals (the composer)

### `editing` — editing (a draft)

Rules: §9 editing, K13–K31, Q1306, Q1382. Keys: `draft-yours`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| edit mode on the session fixture · one-site | 1 | [editing-one-site-1600.png](shots/current/editing-one-site-1600.png) | [editing-one-site-390.png](shots/current/editing-one-site-390.png) | 🗑️ · ✏️ | — | — |
| edit mode on the session fixture · patch-second-site | 1 | [editing-patch-second-site-1600.png](shots/current/editing-patch-second-site-1600.png) | [editing-patch-second-site-390.png](shots/current/editing-patch-second-site-390.png) | 🗑️ | — | — |
| edit mode on the session fixture · gap-site | 1 | [editing-gap-site-1600.png](shots/current/editing-gap-site-1600.png) | [editing-gap-site-390.png](shots/current/editing-gap-site-390.png) | 🗑️ · ✏️ | — | — |

<details><summary><b>edit mode on the session fixture · one-site</b> — <code>draft-yours</code></summary>

- **Slots, in order:** head “The clause as it standsThe good knives are sharpened by the Steward a…” → field [top rule] “What you are proposingThe good knives are sharpened by the Steward an…” → commit row [top rule] “🗑️✏️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Discard this change — nothing has been spent on it; button ✏️ — Hold to propose this — one edit leaves your wallet to pay for it
- **Strings:** eyebrow “The clause as it stands” · head “The good knives are sharpened by the Steward and are not to be used on bone, frozen food, or the garden.” · notes “We should change this because…”
- **All visible text:** The clause as it standsThe good knives are sharpened by the Steward and are not to be used on bone, frozen food, or the garden.What you are proposingThe good knives are sharpened by the Steward and are not to be used on bone, frozen food, or the garden. and more🗑️✏️
- **Tab and rail:** tab —, glyph travel null, clause travel null; rail  “‘and m’no reason given yet — say what this is for”
- **Geometry:** 652×367px at x 478, radius 8, border 0; at 390 306×441px, page 390px wide
- **Proposal row:** “🗑️1 place changed✏️” — 🗑️ · ✏️
- **Shot:** [editing-one-site-1600.png](shots/current/editing-one-site-1600.png)

</details>

<details><summary><b>edit mode on the session fixture · patch-second-site</b> — <code>draft-yours</code></summary>

- **Slots, in order:** other [bottom rule] “The Kitchen · place 1 of 2↑↓” → head “The clause as it standsThe good knives are sharpened by the Steward a…” → field [top rule] “What you are proposingThe good knives are sharpened by the Steward an…” → commit row [top rule] “🗑️” → other “All 2 places go in as one change.”
- **Dividers:** other | head; head | field; field | commit row
- **Controls:** button 🗑️ — Discard this change — nothing has been spent on it
- **Strings:** eyebrow “The clause as it stands” · head “The good knives are sharpened by the Steward and are not to be used on bone, frozen food, or the garden.” · notes “We should change this because…”
- **All visible text:** The Kitchen · place 1 of 2↑↓The clause as it standsThe good knives are sharpened by the Steward and are not to be used on bone, frozen food, or the garden.What you are proposingThe good knives are sharpened by the Steward and are not to be used on bone, frozen food, or the garden. and more🗑️All 2 places go in as one change.
- **Tab and rail:** tab —, glyph travel null, clause travel null; rail  “‘and more’1 of 2 placesno reason given yet — say what this is for”
- **Geometry:** 652×440px at x 478, radius 8, border 0; at 390 306×515px, page 390px wide
- **Proposal row:** “🗑️2 places changed✏️” — 🗑️ · ✏️
- **Shot:** [editing-patch-second-site-1600.png](shots/current/editing-patch-second-site-1600.png)

</details>

<details><summary><b>edit mode on the session fixture · gap-site</b> — <code>draft-yours</code></summary>

- **Slots, in order:** head “A new clause after: The lease under Section 2. ends on 29…” → field [top rule] “What you are proposingA new clause.” → commit row [top rule] “🗑️✏️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Discard this change — nothing has been spent on it; button ✏️ — Hold to propose this — one edit leaves your wallet to pay for it
- **Strings:** eyebrow “A new clause after: The lease under Section 2. ends on 29…” · notes “We should change this because…”
- **All visible text:** A new clause after: The lease under Section 2. ends on 29…What you are proposingA new clause.🗑️✏️
- **Tab and rail:** tab —, glyph travel null, clause travel null, 1 tab(s) outside the card; rail  “‘A new clause’no reason given yet — say what this is for”
- **Geometry:** 652×307px at x 478, radius 8, border 0; at 390 306×322px, page 390px wide
- **Proposal row:** “🗑️1 place changed✏️” — 🗑️ · ✏️
- **Shot:** [editing-gap-site-1600.png](shots/current/editing-gap-site-1600.png)

</details>

### `mine` — mine (proposed)

Rules: §9 mine, Q1485 (A), K17–K18. Keys: `mine-guests-wording` `mine-spending` `mine:c21` `mine:c2` `mine:c22` `mine:c3` `mine:c23`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| the session fixture (Hollow Oak) · needs | 2 | [mine-guests-wording-charter-1600.png](shots/current/mine-guests-wording-charter-1600.png) | [mine-guests-wording-charter-390.png](shots/current/mine-guests-wording-charter-390.png) | 🗑️ | — | 0, 92.75 |
| the closed page (fixture &closed=1) · needs | 2 | [mine-guests-wording-closed-1600.png](shots/current/mine-guests-wording-closed-1600.png) | [mine-guests-wording-closed-390.png](shots/current/mine-guests-wording-closed-390.png) | 🗑️ | — | 0, 92.75 |
| live ladder · rung session | 5 | [mine_c21-live_session_founder-1600.png](shots/current/mine_c21-live_session_founder-1600.png) | [mine_c21-live_session_founder-390.png](shots/current/mine_c21-live_session_founder-390.png) | 🗑️ | — | 0, 61.97 |
| live ladder · rung closing | 5 | [mine_c21-live_session_founder-1600.png](shots/current/mine_c21-live_session_founder-1600.png) | [mine_c21-live_closing_founder-390.png](shots/current/mine_c21-live_closing_founder-390.png) | 🗑️ | — | 0, 61.97 |

<details><summary><b>the session fixture (Hollow Oak) · needs</b> — <code>mine-guests-wording</code></summary>

- **Slots, in order:** head “The clause as it stands” → field [top rule] “What you proposedFriends of the house are welcome whenever a member i…” → commit row [top rule] “🗑️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Withdraw — the edit comes back in full
- **Strings:** eyebrow “The clause as it stands”
- **All visible text:** The clause as it stands What you proposedFriends of the house are welcome whenever a member is in, which is what makes them guests and not visitors.A member answers for their guest: for what the guest breaks, and for what the guest is told about the other members.“Whenever a member is in” is doing the work already — it is the being-in that makes it hospitality rather than a key.🗑️
- **Tab and rail:** tab —, glyph travel [0,92.75], clause travel [12,38.97]; rail  “‘which is what makes them guests…’ …”
- **Geometry:** 652×324px at x 478, radius 8, border 0; at 390 306×441px, page 390px wide, glyph travel [0,90.97]
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [mine-guests-wording-charter-1600.png](shots/current/mine-guests-wording-charter-1600.png) · same state: `mine-guests-wording` `mine-spending`

</details>

<details><summary><b>the closed page (fixture &closed=1) · needs</b> — <code>mine-guests-wording</code></summary>

- **Slots, in order:** head “The clause as it stands” → field [top rule] “What you proposedFriends of the house are welcome whenever a member i…” → commit row [top rule] “🗑️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Withdraw — the edit comes back in full
- **Strings:** eyebrow “The clause as it stands”
- **All visible text:** The clause as it stands What you proposedFriends of the house are welcome whenever a member is in, which is what makes them guests and not visitors.A member answers for their guest: for what the guest breaks, and for what the guest is told about the other members.“Whenever a member is in” is doing the work already — it is the being-in that makes it hospitality rather than a key.🗑️
- **Tab and rail:** tab —, glyph travel [0,92.75], clause travel [12,38.96]; rail  “‘which is what makes them guests…’ …”
- **Geometry:** 652×324px at x 478, radius 8, border 0; at 390 306×441px, page 390px wide, glyph travel [0,90.97]
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [mine-guests-wording-closed-1600.png](shots/current/mine-guests-wording-closed-1600.png) · same state: `mine-guests-wording` `mine-spending`

</details>

<details><summary><b>live ladder · rung session</b> — <code>mine:c21</code></summary>

- **Slots, in order:** head “The clause as it standsFriends of the house are welcome whenever a me…” → field [top rule] “What you proposedThe door is open; a clubhouse that vets its visitors…” → commit row [top rule] “🗑️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Withdraw — the edit comes back in full
- **Strings:** eyebrow “The clause as it stands” · head “Friends of the house are welcome whenever a member is in.”
- **All visible text:** The clause as it standsFriends of the house are welcome whenever a member is in.What you proposedThe door is open; a clubhouse that vets its visitors is a members-only fortress.The whole point of the place is that people wander in. Keep the door open.🗑️
- **Tab and rail:** tab —, glyph travel [0,61.97], clause travel [12,38.97]; rail  “‘The door is open; a clubhouse…’”
- **Geometry:** 652×252px at x 478, radius 8, border 0; at 390 306×341px, page 390px wide, glyph travel [0,61.97]
- **Shot:** [mine_c21-live_session_founder-1600.png](shots/current/mine_c21-live_session_founder-1600.png) · same state: `mine:c21` `mine:c2` `mine:c22` `mine:c3` `mine:c23`

</details>

<details><summary><b>live ladder · rung closing</b> — <code>mine:c21</code></summary>

- **Slots, in order:** head “The clause as it standsFriends of the house are welcome whenever a me…” → field [top rule] “What you proposedThe door is open; a clubhouse that vets its visitors…” → commit row [top rule] “🗑️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Withdraw — the edit comes back in full
- **Strings:** eyebrow “The clause as it stands” · head “Friends of the house are welcome whenever a member is in.”
- **All visible text:** The clause as it standsFriends of the house are welcome whenever a member is in.What you proposedThe door is open; a clubhouse that vets its visitors is a members-only fortress.The whole point of the place is that people wander in. Keep the door open.🗑️
- **Tab and rail:** tab —, glyph travel [0,61.97], clause travel [12,38.97]; rail  “‘The door is open; a clubhouse…’”
- **Geometry:** 652×252px at x 478, radius 8, border 0; at 390 306×341px, page 390px wide, glyph travel [0,61.97]
- **Shot:** [mine_c21-live_session_founder-1600.png](shots/current/mine_c21-live_session_founder-1600.png) · same state: `mine:c21` `mine:c2` `mine:c22` `mine:c3` `mine:c23`

</details>

### `stranded` — mine (stranded, E38)

Rules: E38, Q1484, §6 stranded. Keys: `mine-lostkey-stranded`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| the session fixture (Hollow Oak) · needs | 1 | [mine-lostkey-stranded-charter-1600.png](shots/current/mine-lostkey-stranded-charter-1600.png) | [mine-lostkey-stranded-charter-390.png](shots/current/mine-lostkey-stranded-charter-390.png) | 🗑️ · ✏️ | — | 0, 61.97 |
| the closed page (fixture &closed=1) · needs | 1 | [mine-lostkey-stranded-closed-1600.png](shots/current/mine-lostkey-stranded-closed-1600.png) | [mine-lostkey-stranded-closed-390.png](shots/current/mine-lostkey-stranded-closed-390.png) | 🗑️ · ✏️ | — | 0, 61.97 |

<details><summary><b>the session fixture (Hollow Oak) · needs</b> — <code>mine-lostkey-stranded</code></summary>

- **Slots, in order:** head “The clause as it stands↻A member who loses a key tells the Steward th…” → field [top rule] “What you proposedA member who loses a key tells the Steward the same …” → note “The document changed here, and your proposal could not be carried acr…” → commit row [top rule] “🗑️✏️”
- **Dividers:** head | field; note | commit row
- **Controls:** button 🗑️ — Withdraw — the edit comes back in full; button ✏️ — Re-make it here — write it against the clause as it now stands, and propose it …
- **Strings:** eyebrow “The clause as it stands” · head “A member who loses a key tells the Steward the same day, and the house decides at the next meeting whether the locks ar…” · notes “The document changed here, and your proposal could not be carried across to the new wordi…”
- **All visible text:** The clause as it stands↻A member who loses a key tells the Steward the same day, and the house decides at the next meeting whether the locks are worth changing.What you proposedA member who loses a key tells the Steward the same day, whether or not they expect to find it again.The same day is the whole of it. A key that turns up in a coat pocket on Thursday was still a key in the street on Tuesday, and the house sho…
- **Tab and rail:** tab ↻, glyph travel [0,61.97], clause travel [12,38.97]; rail  “↻without ‘and the house decides at the…’ …”
- **Geometry:** 652×364px at x 478, radius 8, border 0; at 390 306×542px, page 390px wide, glyph travel [0,61.97]
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px; H2: .setnote is full --fg
- **Shot:** [mine-lostkey-stranded-charter-1600.png](shots/current/mine-lostkey-stranded-charter-1600.png)

</details>

<details><summary><b>the closed page (fixture &closed=1) · needs</b> — <code>mine-lostkey-stranded</code></summary>

- **Slots, in order:** head “The clause as it stands↻A member who loses a key tells the Steward th…” → field [top rule] “What you proposedA member who loses a key tells the Steward the same …” → note “The document changed here, and your proposal could not be carried acr…” → commit row [top rule] “🗑️✏️”
- **Dividers:** head | field; note | commit row
- **Controls:** button 🗑️ — Withdraw — the edit comes back in full; button ✏️ — Re-make it here — write it against the clause as it now stands, and propose it …
- **Strings:** eyebrow “The clause as it stands” · head “A member who loses a key tells the Steward the same day, and the house decides at the next meeting whether the locks ar…” · notes “The document changed here, and your proposal could not be carried across to the new wordi…”
- **All visible text:** The clause as it stands↻A member who loses a key tells the Steward the same day, and the house decides at the next meeting whether the locks are worth changing.What you proposedA member who loses a key tells the Steward the same day, whether or not they expect to find it again.The same day is the whole of it. A key that turns up in a coat pocket on Thursday was still a key in the street on Tuesday, and the house sho…
- **Tab and rail:** tab ↻, glyph travel [0,61.97], clause travel [12,38.97]; rail  “↻without ‘and the house decides at the…’ …”
- **Geometry:** 652×364px at x 478, radius 8, border 0; at 390 306×542px, page 390px wide, glyph travel [0,61.96]
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px; H2: .setnote is full --fg
- **Shot:** [mine-lostkey-stranded-closed-1600.png](shots/current/mine-lostkey-stranded-closed-1600.png)

</details>

## Records

### `sealed-record` — sealed record

Rules: §9 sealed record, Q1531, Y20, M13, M1. Keys: `quick-guests-pets` `quick-guests-inhouse` `quick-guests-three` `quick-guests-book` `quick-guests-children` `quick-guests-late` `quick-guests-dinner` `quick-guests-wine` `race-claims` `quick-kitchen` `quick-larderfood` `quick-knives` `quick-calling` `quick-lockup-first` … (21).

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| the session fixture (Hollow Oak) · sealed, retired | 10 | [quick-guests-pets-charter-1600.png](shots/current/quick-guests-pets-charter-1600.png) | [quick-guests-pets-charter-390.png](shots/current/quick-guests-pets-charter-390.png) | (none) | — | — |
| the session fixture (Hollow Oak) · sealed | 1 | [quick-guests-inhouse-charter-1600.png](shots/current/quick-guests-inhouse-charter-1600.png) | [quick-guests-inhouse-charter-390.png](shots/current/quick-guests-inhouse-charter-390.png) | (none) | — | — |
| the session fixture (Hollow Oak) · sealed, adopted | 7 | [race-claims-charter-1600.png](shots/current/race-claims-charter-1600.png) | [race-claims-charter-390.png](shots/current/race-claims-charter-390.png) | OK | — | 0, 61.81 |
| the closed page (fixture &closed=1) · sealed, retired | 10 | [quick-guests-pets-closed-1600.png](shots/current/quick-guests-pets-closed-1600.png) | [quick-guests-pets-closed-390.png](shots/current/quick-guests-pets-closed-390.png) | (none) | — | — |
| the closed page (fixture &closed=1) · sealed | 1 | [quick-guests-inhouse-closed-1600.png](shots/current/quick-guests-inhouse-closed-1600.png) | [quick-guests-inhouse-closed-390.png](shots/current/quick-guests-inhouse-closed-390.png) | (none) | — | — |
| the closed page (fixture &closed=1) · sealed, adopted | 7 | [race-claims-closed-1600.png](shots/current/race-claims-closed-1600.png) | [race-claims-closed-390.png](shots/current/race-claims-closed-390.png) | OK | — | 0, 61.81 |
| live ladder · rung session | 3 | [rec_r_c1-live_session_founder-1600.png](shots/current/rec_r_c1-live_session_founder-1600.png) | [rec_r_c1-live_session_founder-390.png](shots/current/rec_r_c1-live_session_founder-390.png) | OK | — | 0, 90.81 |
| live ladder · rung closing | 3 | [rec_r_c1-live_session_founder-1600.png](shots/current/rec_r_c1-live_session_founder-1600.png) | [rec_r_c1-live_session_founder-390.png](shots/current/rec_r_c1-live_session_founder-390.png) | OK | — | 0, 90.81 |
| live ladder · rung closed | 3 | [rec_r_c1-live_closed_founder-1600.png](shots/current/rec_r_c1-live_closed_founder-1600.png) | [rec_r_c1-live_closed_founder-390.png](shots/current/rec_r_c1-live_closed_founder-390.png) | OK | — | 0, 61.81 |

<details><summary><b>the session fixture (Hollow Oak) · sealed, retired</b> — <code>quick-guests-pets</code></summary>

- **Slots, in order:** other “Decided · 6/14👤Monday, 21 September, 17:40” → note “6 of 14 weighed in · quorum was 5 · you kept the current text” → head “Friends of the house are welcome whenever a member is in.” → field “38%Friends of the house are welcome, and so are their dogs, on the gr…”
- **Dividers:** none between top-level slots
- **Controls:** none
- **Strings:** head “Friends of the house are welcome whenever a member is in.” · notes “6 of 14 weighed in · quorum was 5 · you kept the current text”
- **All visible text:** Decided · 6/14👤Monday, 21 September, 17:406 of 14 weighed in · quorum was 5 · you kept the current textFriends of the house are welcome whenever a member is in.38%Friends of the house are welcome, and so are their dogs, on the ground floor.Hollis’s lurcher has been coming for two years and nobody has ever objected. Write down what we already do.
- **Tab and rail:** tab —, glyph travel null, clause travel null; rail  “‘and so are their dogs…’21 Sep”
- **Geometry:** 652×510px at x 478, radius 8, border 0; at 390 306×527px, page 390px wide
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [quick-guests-pets-charter-1600.png](shots/current/quick-guests-pets-charter-1600.png) · same state: `quick-guests-pets` `quick-guests-three` `quick-guests-book` `quick-guests-children` `quick-guests-late` `quick-guests-dinner` `quick-guests-wine` `quick-larderfood` `quick-lockup-first` `race-nomination`

</details>

<details><summary><b>the session fixture (Hollow Oak) · sealed</b> — <code>quick-guests-inhouse</code></summary>

- **Slots, in order:** other “Decided · 9/14👤Tuesday, 22 September, 11:20” → note “9 of 14 weighed in · 6 preferred it · 4 did not answer in time · quor…” → head “Friends of the house are welcome whenever a member is in.” → speaker “As it stood it invited people to a house with nobody in it. The guest…” → field “Previous textFriends of the house are welcome.”
- **Dividers:** none between top-level slots
- **Controls:** none
- **Strings:** head “Friends of the house are welcome whenever a member is in.” · notes “9 of 14 weighed in · 6 preferred it · 4 did not answer in time · quorum was 5 · you prefe…”
- **All visible text:** Decided · 9/14👤Tuesday, 22 September, 11:209 of 14 weighed in · 6 preferred it · 4 did not answer in time · quorum was 5 · you preferred the new wordingFriends of the house are welcome whenever a member is in.As it stood it invited people to a house with nobody in it. The guest is a member’s guest, and the member should be here.Previous textFriends of the house are welcome.
- **Tab and rail:** tab —, glyph travel null, clause travel null; rail  “‘whenever a member is in’22 Sep”
- **Geometry:** 652×510px at x 478, radius 8, border 0; at 390 306×543px, page 390px wide
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [quick-guests-inhouse-charter-1600.png](shots/current/quick-guests-inhouse-charter-1600.png)

</details>

<details><summary><b>the session fixture (Hollow Oak) · sealed, adopted</b> — <code>race-claims</code></summary>

- **Slots, in order:** other “Decided · 7/14👤Tuesday, 29 September, 20:15” → note “7 of 14 weighed in · quorum was 5 · you voted on three pairs — twice …” → head “A claim is made by writing in the book on the landing. A claim more t…” → speaker “Displacement is fine — it is being displaced silently that stings. Sa…” → field “58%A claim is made by writing in the book on the landing. Claims are …” → commit row “OK”
- **Dividers:** none between top-level slots
- **Controls:** button OK — It leaves your margin and stays in the record
- **Strings:** head “A claim is made by writing in the book on the landing. A claim more than a month ahead may be displaced by a member wit…” · notes “7 of 14 weighed in · quorum was 5 · you voted on three pairs — twice for the wording that…”
- **All visible text:** Decided · 7/14👤Tuesday, 29 September, 20:157 of 14 weighed in · quorum was 5 · you voted on three pairs — twice for the wording that stoodA claim is made by writing in the book on the landing. A claim more than a month ahead may be displaced by a member with a nearer need, who tells the displaced member within a day and offers them the next free week.Displacement is fine — it is being displaced silently that stings…
- **Tab and rail:** tab —, glyph travel [0,61.81], clause travel [12,67.81]; rail  “‘on notice’ → ‘who tells…’ …Tue 20:15”
- **Geometry:** 652×1017px at x 478, radius 8, border 0; at 390 306×1718px, page 390px wide, glyph travel [0,78.66]
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [race-claims-charter-1600.png](shots/current/race-claims-charter-1600.png) · same state: `race-claims` `quick-kitchen` `quick-knives` `quick-calling` `quick-lockup-lamp` `quick-lockup` `quick-notice`

</details>

<details><summary><b>the closed page (fixture &closed=1) · sealed, retired</b> — <code>quick-guests-pets</code></summary>

- **Slots, in order:** other “Decided · 6/14👤Monday, 21 September, 17:40” → note “6 of 14 weighed in · quorum was 5 · you kept the current text” → head “Friends of the house are welcome whenever a member is in.” → field “38%Friends of the house are welcome, and so are their dogs, on the gr…”
- **Dividers:** none between top-level slots
- **Controls:** none
- **Strings:** head “Friends of the house are welcome whenever a member is in.” · notes “6 of 14 weighed in · quorum was 5 · you kept the current text”
- **All visible text:** Decided · 6/14👤Monday, 21 September, 17:406 of 14 weighed in · quorum was 5 · you kept the current textFriends of the house are welcome whenever a member is in.38%Friends of the house are welcome, and so are their dogs, on the ground floor.Hollis’s lurcher has been coming for two years and nobody has ever objected. Write down what we already do.
- **Tab and rail:** tab —, glyph travel null, clause travel null; rail  “‘and so are their dogs…’21 Sep”
- **Geometry:** 652×510px at x 478, radius 8, border 0; at 390 306×527px, page 390px wide
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [quick-guests-pets-closed-1600.png](shots/current/quick-guests-pets-closed-1600.png) · same state: `quick-guests-pets` `quick-guests-three` `quick-guests-book` `quick-guests-children` `quick-guests-late` `quick-guests-dinner` `quick-guests-wine` `quick-larderfood` `quick-lockup-first` `race-nomination`

</details>

<details><summary><b>the closed page (fixture &closed=1) · sealed</b> — <code>quick-guests-inhouse</code></summary>

- **Slots, in order:** other “Decided · 9/14👤Tuesday, 22 September, 11:20” → note “9 of 14 weighed in · 6 preferred it · 4 did not answer in time · quor…” → head “Friends of the house are welcome whenever a member is in.” → speaker “As it stood it invited people to a house with nobody in it. The guest…” → field “Previous textFriends of the house are welcome.”
- **Dividers:** none between top-level slots
- **Controls:** none
- **Strings:** head “Friends of the house are welcome whenever a member is in.” · notes “9 of 14 weighed in · 6 preferred it · 4 did not answer in time · quorum was 5 · you prefe…”
- **All visible text:** Decided · 9/14👤Tuesday, 22 September, 11:209 of 14 weighed in · 6 preferred it · 4 did not answer in time · quorum was 5 · you preferred the new wordingFriends of the house are welcome whenever a member is in.As it stood it invited people to a house with nobody in it. The guest is a member’s guest, and the member should be here.Previous textFriends of the house are welcome.
- **Tab and rail:** tab —, glyph travel null, clause travel null; rail  “‘whenever a member is in’22 Sep”
- **Geometry:** 652×510px at x 478, radius 8, border 0; at 390 306×543px, page 390px wide
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [quick-guests-inhouse-closed-1600.png](shots/current/quick-guests-inhouse-closed-1600.png)

</details>

<details><summary><b>the closed page (fixture &closed=1) · sealed, adopted</b> — <code>race-claims</code></summary>

- **Slots, in order:** other “Decided · 7/14👤Tuesday, 29 September, 20:15” → note “7 of 14 weighed in · quorum was 5 · you voted on three pairs — twice …” → head “A claim is made by writing in the book on the landing. A claim more t…” → speaker “Displacement is fine — it is being displaced silently that stings. Sa…” → field “58%A claim is made by writing in the book on the landing. Claims are …” → commit row “OK”
- **Dividers:** none between top-level slots
- **Controls:** button OK — It leaves your margin and stays in the record
- **Strings:** head “A claim is made by writing in the book on the landing. A claim more than a month ahead may be displaced by a member wit…” · notes “7 of 14 weighed in · quorum was 5 · you voted on three pairs — twice for the wording that…”
- **All visible text:** Decided · 7/14👤Tuesday, 29 September, 20:157 of 14 weighed in · quorum was 5 · you voted on three pairs — twice for the wording that stoodA claim is made by writing in the book on the landing. A claim more than a month ahead may be displaced by a member with a nearer need, who tells the displaced member within a day and offers them the next free week.Displacement is fine — it is being displaced silently that stings…
- **Tab and rail:** tab —, glyph travel [0,61.81], clause travel [12,67.82]; rail  “‘on notice’ → ‘who tells…’ …Tue 20:15”
- **Geometry:** 652×1017px at x 478, radius 8, border 0; at 390 306×1718px, page 390px wide, glyph travel [0,78.66]
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [race-claims-closed-1600.png](shots/current/race-claims-closed-1600.png) · same state: `race-claims` `quick-kitchen` `quick-knives` `quick-calling` `quick-lockup-lamp` `quick-lockup` `quick-notice`

</details>

<details><summary><b>live ladder · rung session</b> — <code>rec:r:c1</code></summary>

- **Slots, in order:** other “Decided · 7/20👤Thursday, 24 September, 22:51” → note “7 of 20 weighed in · 7 preferred it · quorum was 7 · you voted on this” → head “Front-door keys are held by members only; every key and fob is listed…” → speaker “A house anyone can copy a key to is a house nobody is responsible for…” → field “Previous textEvery member holds a front-door key, and members may len…” → commit row “OK”
- **Dividers:** none between top-level slots
- **Controls:** button OK — It leaves your margin and stays in the record
- **Strings:** head “Front-door keys are held by members only; every key and fob is listed in the Key Book, and lost keys are reported and r…” · notes “7 of 20 weighed in · 7 preferred it · quorum was 7 · you voted on this”
- **All visible text:** Decided · 7/20👤Thursday, 24 September, 22:517 of 20 weighed in · 7 preferred it · quorum was 7 · you voted on thisFront-door keys are held by members only; every key and fob is listed in the Key Book, and lost keys are reported and replaced at the holder’s expense.A house anyone can copy a key to is a house nobody is responsible for. The Key Book is one page of admin for knowing who can open our door.Previous textE…
- **Tab and rail:** tab —, glyph travel [0,90.81], clause travel [12,67.81]; rail  “‘Front-door keys are…’Thu 22:51”
- **Geometry:** 652×355px at x 478, radius 8, border 0; at 390 306×532px, page 390px wide, glyph travel [0,107.66]
- **Shot:** [rec_r_c1-live_session_founder-1600.png](shots/current/rec_r_c1-live_session_founder-1600.png) · same state: `rec:r:c1` `rec:r:c4` `rec:r:c7`

</details>

<details><summary><b>live ladder · rung closing</b> — <code>rec:r:c1</code></summary>

- **Slots, in order:** other “Decided · 7/20👤Thursday, 24 September, 22:51” → note “7 of 20 weighed in · 7 preferred it · quorum was 7 · you voted on this” → head “Front-door keys are held by members only; every key and fob is listed…” → speaker “A house anyone can copy a key to is a house nobody is responsible for…” → field “Previous textEvery member holds a front-door key, and members may len…” → commit row “OK”
- **Dividers:** none between top-level slots
- **Controls:** button OK — It leaves your margin and stays in the record
- **Strings:** head “Front-door keys are held by members only; every key and fob is listed in the Key Book, and lost keys are reported and r…” · notes “7 of 20 weighed in · 7 preferred it · quorum was 7 · you voted on this”
- **All visible text:** Decided · 7/20👤Thursday, 24 September, 22:517 of 20 weighed in · 7 preferred it · quorum was 7 · you voted on thisFront-door keys are held by members only; every key and fob is listed in the Key Book, and lost keys are reported and replaced at the holder’s expense.A house anyone can copy a key to is a house nobody is responsible for. The Key Book is one page of admin for knowing who can open our door.Previous textE…
- **Tab and rail:** tab —, glyph travel [0,90.81], clause travel [12,67.81]; rail  “‘Front-door keys are…’Thu 22:51”
- **Geometry:** 652×355px at x 478, radius 8, border 0; at 390 306×532px, page 390px wide, glyph travel [0,107.66]
- **Shot:** [rec_r_c1-live_session_founder-1600.png](shots/current/rec_r_c1-live_session_founder-1600.png) · same state: `rec:r:c1` `rec:r:c4` `rec:r:c7`

</details>

<details><summary><b>live ladder · rung closed</b> — <code>rec:r:c1</code></summary>

- **Slots, in order:** other “Decided · 7/20👤Thursday, 24 September, 22:51” → note “7 of 20 weighed in · 7 preferred it · quorum was 7 · you voted on this” → head “Front-door keys are held by members only; every key and fob is listed…” → speaker “ABAsh BellamyA house anyone can copy a key to is a house nobody is re…” → field “Previous textEvery member holds a front-door key, and members may len…” → commit row “OK”
- **Dividers:** none between top-level slots
- **Controls:** button OK — It leaves your margin and stays in the record
- **Strings:** head “Front-door keys are held by members only; every key and fob is listed in the Key Book, and lost keys are reported and r…” · notes “7 of 20 weighed in · 7 preferred it · quorum was 7 · you voted on this”
- **All visible text:** Decided · 7/20👤Thursday, 24 September, 22:517 of 20 weighed in · 7 preferred it · quorum was 7 · you voted on thisFront-door keys are held by members only; every key and fob is listed in the Key Book, and lost keys are reported and replaced at the holder’s expense.ABAsh BellamyA house anyone can copy a key to is a house nobody is responsible for. The Key Book is one page of admin for knowing who can open our door.P…
- **Tab and rail:** tab —, glyph travel [0,61.81], clause travel [12,67.81]; rail  “‘Front-door keys are…’Thu 22:51”
- **Geometry:** 652×382px at x 478, radius 8, border 0; at 390 306×559px, page 390px wide, glyph travel [0,78.65]
- **Shot:** [rec_r_c1-live_closed_founder-1600.png](shots/current/rec_r_c1-live_closed_founder-1600.png) · same state: `rec:r:c1` `rec:r:c4` `rec:r:c7`

</details>

### `backlog` — backlog (closed page)

Rules: §9 backlog, Y20. Keys: `rec:fx-u0` `rec:fx-u1`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| the closed page (fixture &closed=1) | 2 | [rec_fx-u0-closed-1600.png](shots/current/rec_fx-u0-closed-1600.png) | [rec_fx-u0-closed-390.png](shots/current/rec_fx-u0-closed-390.png) | (none) | — | 0, 66.82 |

<details><summary><b>the closed page (fixture &closed=1)</b> — <code>rec:fx-u0</code></summary>

- **Slots, in order:** other “Proposal ran out of time · 6/14👤Wednesday, 30 September, 12:00” → note “6 of 14 weighed in · quorum was 5 · you voted on this” → head “The Purse-holder pays only bills approved under the budget or by a ho…” → speaker “Whoever holds the purse must be watched: "reimburses what seems fair"…” → field “the text that standsThe Purse-holder pays the bills and reimburses wh…”
- **Dividers:** none between top-level slots
- **Controls:** none
- **Strings:** head “The Purse-holder pays only bills approved under the budget or by a house decision, reimburses claims against receipts, …” · notes “6 of 14 weighed in · quorum was 5 · you voted on this” “the text that stands”
- **All visible text:** Proposal ran out of time · 6/14👤Wednesday, 30 September, 12:006 of 14 weighed in · quorum was 5 · you voted on thisThe Purse-holder pays only bills approved under the budget or by a house decision, reimburses claims against receipts, keeps accounts and receipts open to any member on request, and reports income and spending at every meeting.Whoever holds the purse must be watched: "reimburses what seems fair" with r…
- **Tab and rail:** tab —, glyph travel [0,66.82], clause travel [12,67.82]; rail  “‘the’ → ‘only’ …12:00”
- **Geometry:** 652×515px at x 478, radius 8, border 0; at 390 306×930px, page 390px wide, glyph travel [0,98.63]
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [rec_fx-u0-closed-1600.png](shots/current/rec_fx-u0-closed-1600.png) · same state: `rec:fx-u0` `rec:fx-u1`

</details>

### `motion-record` — settled motion record

Rules: §9 settled motion record, Q1522, Q1186, Q1188. Keys: `rec:chamber:0` `rec:rate:0` `rec:quorum:0` `rec:rate:1` `rec:rate:2`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| settled by ⏩ + seeded motions — the founder | 3 | [rec_chamber_0-settled-1600.png](shots/current/rec_chamber_0-settled-1600.png) | [rec_chamber_0-settled-390.png](shots/current/rec_chamber_0-settled-390.png) | (none) | — | 0, 0 |
| settled + seeded — a member (seat 1, the mover) | 2 | [rec_chamber_0-seat_1-1600.png](shots/current/rec_chamber_0-seat_1-1600.png) | [rec_chamber_0-seat_1-390.png](shots/current/rec_chamber_0-seat_1-390.png) | (none) | — | 0, 0 |
| settled + seeded — a stranger at the door | 3 | [rec_chamber_0-seat_stranger-1600.png](shots/current/rec_chamber_0-seat_stranger-1600.png) | [rec_chamber_0-seat_stranger-390.png](shots/current/rec_chamber_0-seat_stranger-390.png) | (none) | — | 0, 0 |
| the session fixture, band cards (&band=1) | 3 | [rec_rate_0-sessionband-1600.png](shots/current/rec_rate_0-sessionband-1600.png) | [rec_rate_0-sessionband-390.png](shots/current/rec_rate_0-sessionband-390.png) | (none) | — | 0, 0 |
| the closed page, band cards (&closed=1&band=1) | 3 | [rec_rate_0-sessionband-1600.png](shots/current/rec_rate_0-sessionband-1600.png) | [rec_rate_0-sessionband-390.png](shots/current/rec_rate_0-sessionband-390.png) | (none) | — | 0, 0 |

<details><summary><b>settled by ⏩ + seeded motions — the founder</b> — <code>rec:chamber:0</code></summary>

- **Slots, in order:** head “🌍Visibility🌍Who Can See the Document?✒️Can the Founder Make Amendme…” → field “Friday, 25 September, 00:21 · Changed by the FounderThe document can …”
- **Dividers:** none between top-level slots
- **Controls:** radio “Chosen by the Founder ✒️” (on)
- **Strings:** —
- **All visible text:** 🌍Visibility🌍Who Can See the Document?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Changed by the Founder: Anyone with the linkFriday, 25 September, 00:21 · Changed by the FounderThe document can be seen by anyone with the link.ABAsh Bellamy 👑Readers who are not members should see what we are building.Chosen by the Founder ✒️Previous ruleThe document can only be seen by members.
- **Tab and rail:** tab Cha, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×280px at x 478, radius 8, border 0; at 390 306×363px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [rec_chamber_0-settled-1600.png](shots/current/rec_chamber_0-settled-1600.png) · same state: `rec:chamber:0` `rec:rate:0` `rec:quorum:0`

</details>

<details><summary><b>settled + seeded — a member (seat 1, the mover)</b> — <code>rec:chamber:0</code></summary>

- **Slots, in order:** head “🌍VisibilityWho Can See the Document?✒️Can the Founder Make Amendment…” → field “Friday, 25 September, 00:21 · Changed by the FounderThe document can …”
- **Dividers:** none between top-level slots
- **Controls:** radio “Chosen by the Founder ✒️” (on)
- **Strings:** —
- **All visible text:** 🌍VisibilityWho Can See the Document?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Changed by the Founder: Anyone with the linkFriday, 25 September, 00:21 · Changed by the FounderThe document can be seen by anyone with the link.ABAsh Bellamy 👑Readers who are not members should see what we are building.Chosen by the Founder ✒️Previous ruleThe document can only be seen by members.
- **Tab and rail:** tab Cha, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×280px at x 478, radius 8, border 0; at 390 306×363px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [rec_chamber_0-seat_1-1600.png](shots/current/rec_chamber_0-seat_1-1600.png) · same state: `rec:chamber:0` `rec:quorum:0`

</details>

<details><summary><b>settled + seeded — a stranger at the door</b> — <code>rec:chamber:0</code></summary>

- **Slots, in order:** head “🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Fou…” → field “Friday, 25 September, 00:21 · Changed by the FounderThe document can …”
- **Dividers:** none between top-level slots
- **Controls:** radio “Chosen by the Founder ✒️” (on)
- **Strings:** —
- **All visible text:** 🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?🌍VisibilityChanged by the Founder: Anyone with the linkFriday, 25 September, 00:21 · Changed by the FounderThe document can be seen by anyone with the link.ABAsh Bellamy 👑Readers who are not members should see what we are building.Chosen by the Founder ✒️Previous ruleThe document can only be seen by members.
- **Tab and rail:** tab Cha, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×280px at x 478, radius 8, border 0; at 390 306×363px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [rec_chamber_0-seat_stranger-1600.png](shots/current/rec_chamber_0-seat_stranger-1600.png) · same state: `rec:chamber:0` `rec:rate:0` `rec:quorum:0`

</details>

<details><summary><b>the session fixture, band cards (&band=1)</b> — <code>rec:rate:0</code></summary>

- **Slots, in order:** head “⏱️Proposal Rate⏱️Set the Proposal Rate✒️Can the Founder Make Amendmen…” → field “Friday, 25 September, 00:51 · PassedMembers may make a new proposal ✏…”
- **Dividers:** none between top-level slots
- **Controls:** radio “Chosen by the membership” (on)
- **Strings:** —
- **All visible text:** ⏱️Proposal Rate⏱️Set the Proposal Rate✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Passed: a new proposal every 2 hoursPassed: a new proposal every hourChanged by the Founder: a new proposal every 45 minutesFriday, 25 September, 00:51 · PassedMembers may make a new proposal ✏️ every 2 hours.Three hours between proposals is a long time to sit on a good idea.Chosen by the membership
- **Tab and rail:** tab Pas, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×242px at x 478, radius 8, border 0; at 390 306×242px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [rec_rate_0-sessionband-1600.png](shots/current/rec_rate_0-sessionband-1600.png) · same state: `rec:rate:0` `rec:rate:1` `rec:rate:2`

</details>

<details><summary><b>the closed page, band cards (&closed=1&band=1)</b> — <code>rec:rate:0</code></summary>

- **Slots, in order:** head “⏱️Proposal Rate⏱️Set the Proposal Rate✒️Can the Founder Make Amendmen…” → field “Friday, 25 September, 00:51 · PassedMembers may make a new proposal ✏…”
- **Dividers:** none between top-level slots
- **Controls:** radio “Chosen by the membership” (on)
- **Strings:** —
- **All visible text:** ⏱️Proposal Rate⏱️Set the Proposal Rate✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Passed: a new proposal every 2 hoursPassed: a new proposal every hourChanged by the Founder: a new proposal every 45 minutesFriday, 25 September, 00:51 · PassedMembers may make a new proposal ✏️ every 2 hours.Three hours between proposals is a long time to sit on a good idea.Chosen by the membership
- **Tab and rail:** tab Pas, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×242px at x 478, radius 8, border 0; at 390 306×242px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [rec_rate_0-sessionband-1600.png](shots/current/rec_rate_0-sessionband-1600.png) · same state: `rec:rate:0` `rec:rate:1` `rec:rate:2`

</details>

## Settings cards (the band)

### `setting` — setting (founder, pen) / the composer

Rules: §9 setting, §9 composer, CP1, CP2, CP10, F6, F15, Q1151, Q1293, K1–K12. Keys: `chamber` `lapse` `removal` `rate` `ending` `quorum` `authorship` `judgments`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| founding, unanswered (founder) · rail 🌍 | 1 | [chamber-founding-1600.png](shots/current/chamber-founding-1600.png) | [chamber-founding-390.png](shots/current/chamber-founding-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| founding, unanswered (founder) · rail 💤 | 1 | [lapse-founding-1600.png](shots/current/lapse-founding-1600.png) | [lapse-founding-390.png](shots/current/lapse-founding-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| founding, unanswered (founder) · rail 🥾 | 1 | [removal-founding-1600.png](shots/current/removal-founding-1600.png) | [removal-founding-390.png](shots/current/removal-founding-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| founding, unanswered (founder) · rail ⏱️ | 1 | [rate-founding-1600.png](shots/current/rate-founding-1600.png) | [rate-founding-390.png](shots/current/rate-founding-390.png) | 🗑️ · ✒️ | — | 0, -187.24 |
| founding, unanswered (founder) · rail ⏰ | 1 | [ending-founding-1600.png](shots/current/ending-founding-1600.png) | [ending-founding-390.png](shots/current/ending-founding-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| founding, unanswered (founder) · rail 👥 | 1 | [quorum-founding-1600.png](shots/current/quorum-founding-1600.png) | [quorum-founding-390.png](shots/current/quorum-founding-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| founding, unanswered (founder) · rail 👤 | 1 | [authorship-founding-1600.png](shots/current/authorship-founding-1600.png) | [authorship-founding-390.png](shots/current/authorship-founding-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| founding, unanswered (founder) · rail 👁️ | 1 | [judgments-founding-1600.png](shots/current/judgments-founding-1600.png) | [judgments-founding-390.png](shots/current/judgments-founding-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail 🌍 | 1 | [chamber-founding-1600.png](shots/current/chamber-founding-1600.png) | [chamber-founding-390.png](shots/current/chamber-founding-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail 💤 | 1 | [lapse-answers-1600.png](shots/current/lapse-answers-1600.png) | [lapse-answers-390.png](shots/current/lapse-answers-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail 🥾 | 1 | [removal-founding-1600.png](shots/current/removal-founding-1600.png) | [removal-answers-390.png](shots/current/removal-answers-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail ⏱️ | 1 | [rate-founding-1600.png](shots/current/rate-founding-1600.png) | [rate-answers-390.png](shots/current/rate-answers-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail ⏰ | 1 | [ending-founding-1600.png](shots/current/ending-founding-1600.png) | [ending-answers-390.png](shots/current/ending-answers-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail 👥 | 1 | [quorum-founding-1600.png](shots/current/quorum-founding-1600.png) | [quorum-answers-390.png](shots/current/quorum-answers-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail 👤 | 1 | [authorship-founding-1600.png](shots/current/authorship-founding-1600.png) | [authorship-answers-390.png](shots/current/authorship-answers-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail 👁️ | 1 | [judgments-founding-1600.png](shots/current/judgments-founding-1600.png) | [judgments-answers-390.png](shots/current/judgments-answers-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| settled by ⏩ + seeded motions — the founder | 8 | [chamber-settled-1600.png](shots/current/chamber-settled-1600.png) | [chamber-settled-390.png](shots/current/chamber-settled-390.png) | 🗑️ · ✒️ · 🏛️ | — | 0, 0 |
| settled + seeded — a member (seat 1, the mover) | 7 | [lapse-settled-1600.png](shots/current/lapse-settled-1600.png) | [lapse-seat_1-390.png](shots/current/lapse-seat_1-390.png) | 🗑️ · 🏛️ | — | 0, 0 |
| founding, handed to the membership and collecting · rail 🌍 | 1 | [chamber-delegated-1600.png](shots/current/chamber-delegated-1600.png) | [chamber-delegated-390.png](shots/current/chamber-delegated-390.png) | 🗑️ · ✒️ | — | — |
| founding, handed to the membership and collecting · rail 💤 | 1 | [lapse-delegated-1600.png](shots/current/lapse-delegated-1600.png) | [lapse-delegated-390.png](shots/current/lapse-delegated-390.png) | 🗑️ · ✒️ | — | — |
| founding, handed to the membership and collecting · rail 🥾 | 1 | [removal-delegated-1600.png](shots/current/removal-delegated-1600.png) | [removal-delegated-390.png](shots/current/removal-delegated-390.png) | 🗑️ · ✒️ | — | — |
| founding, handed to the membership and collecting · rail ⏱️ | 1 | [rate-delegated-1600.png](shots/current/rate-delegated-1600.png) | [rate-delegated-390.png](shots/current/rate-delegated-390.png) | 🗑️ · ✒️ | — | — |
| founding, handed to the membership and collecting · rail ⏰ | 1 | [ending-delegated-1600.png](shots/current/ending-delegated-1600.png) | [ending-delegated-390.png](shots/current/ending-delegated-390.png) | 🗑️ · ✒️ | — | — |
| founding, handed to the membership and collecting · rail 👥 | 1 | [quorum-delegated-1600.png](shots/current/quorum-delegated-1600.png) | [quorum-delegated-390.png](shots/current/quorum-delegated-390.png) | 🗑️ · ✒️ | — | — |
| founding, handed to the membership and collecting · rail 👤 | 1 | [authorship-delegated-1600.png](shots/current/authorship-delegated-1600.png) | [authorship-delegated-390.png](shots/current/authorship-delegated-390.png) | 🗑️ · ✒️ | — | — |
| founding, handed to the membership and collecting · rail 👁️ | 1 | [judgments-delegated-1600.png](shots/current/judgments-delegated-1600.png) | [judgments-delegated-390.png](shots/current/judgments-delegated-390.png) | 🗑️ · ✒️ | — | — |
| the session fixture, band cards (&band=1) | 8 | [chamber-sessionband-1600.png](shots/current/chamber-sessionband-1600.png) | [chamber-sessionband-390.png](shots/current/chamber-sessionband-390.png) | 🗑️ · ✒️ · 🏛️ | — | 0, 0 |
| the closed page, band cards (&closed=1&band=1) | 8 | [chamber-closedband-1600.png](shots/current/chamber-closedband-1600.png) | [chamber-closedband-390.png](shots/current/chamber-closedband-390.png) | 🗑️ | — | 0, 0 |
| live ladder · rung constitution | 1 | [chamber-live_constitution_m-1-1600.png](shots/current/chamber-live_constitution_m-1-1600.png) | [chamber-live_constitution_m-1-390.png](shots/current/chamber-live_constitution_m-1-390.png) | 🗑️ | — | 0, 0 |
| live ladder · rung ready | 8 | [chamber-live_ready_m-1-1600.png](shots/current/chamber-live_ready_m-1-1600.png) | [chamber-live_ready_m-1-390.png](shots/current/chamber-live_ready_m-1-390.png) | 🗑️ | — | 0, 0 |
| live ladder · rung session | 8 | [chamber-live_session_founder-1600.png](shots/current/chamber-live_session_founder-1600.png) | [chamber-live_session_founder-390.png](shots/current/chamber-live_session_founder-390.png) | 🗑️ · ✒️ · 🏛️ | — | 0, 0 |
| live ladder · rung closing | 8 | [chamber-live_session_founder-1600.png](shots/current/chamber-live_session_founder-1600.png) | [chamber-live_closing_founder-390.png](shots/current/chamber-live_closing_founder-390.png) | 🗑️ · ✒️ · 🏛️ | — | 0, 0 |
| live ladder · rung closed | 8 | [chamber-live_closed_founder-1600.png](shots/current/chamber-live_closed_founder-1600.png) | [chamber-live_closed_founder-390.png](shots/current/chamber-live_closed_founder-390.png) | 🗑️ | — | 0, 0 |

<details><summary><b>founding, unanswered (founder) · rail 🌍</b> — <code>chamber</code></summary>

- **Slots, in order:** head “🌍Who Can See the Document?✒️Can the Founder Make Amendments at Will?…” → field “The document can only be seen by members.Choose thisThe document can …” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”
- **Strings:** options “The document can only be seen by members.” “The document can be seen by anyone with the link.” “The membership will decide whether the document can only be…”
- **All visible text:** 🌍Who Can See the Document?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document can only be seen by members.Choose thisThe document can be seen by anyone with the link.Choose thisThe membership will decide whether the document can only be seen by members or by anyone with the link.Choose this🗑️✒️
- **Tab and rail:** tab 🌍W, glyph travel [0,0], clause travel [0,17]; rail 🌍 “🌍Who Can See the Document?”
- **Geometry:** 652×394px at x 478, radius 8, border 0; at 390 306×493px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [chamber-founding-1600.png](shots/current/chamber-founding-1600.png)

</details>

<details><summary><b>founding, unanswered (founder) · rail 💤</b> — <code>lapse</code></summary>

- **Slots, in order:** head “💤Do Memberships Lapse?✒️Can the Founder Make Amendments at Will?🛡️D…” → field “After minuteshoursdays, inactive members lapse and automatically abst…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”; number field
- **Strings:** options “After minuteshoursdays, inactive members lapse and automati…” “Inactive members never lapse and are still counted towards …” “The membership will decide whether inactive members lapse o…”
- **All visible text:** 💤Do Memberships Lapse?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?After minuteshoursdays, inactive members lapse and automatically abstain from votes.Choose thisInactive members never lapse and are still counted towards votes.Choose thisThe membership will decide whether inactive members lapse or never lapse.Choose this🗑️✒️
- **Tab and rail:** tab 💤D, glyph travel [0,0], clause travel [0,17]; rail 💤 “💤Do Memberships Lapse?”
- **Geometry:** 652×429px at x 478, radius 8, border 0; at 390 306×503px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [lapse-founding-1600.png](shots/current/lapse-founding-1600.png)

</details>

<details><summary><b>founding, unanswered (founder) · rail 🥾</b> — <code>removal</code></summary>

- **Slots, in order:** head “🥾How Is a Member Removed?✒️Can the Founder Make Amendments at Will?�…” → field “To remove a member, all members must agree 🏛️.Choose thisTo remove a…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”; radio “Choose this”
- **Strings:** options “To remove a member, all members must agree 🏛️.” “To remove a member, all members apart from them must agree …” “To remove a member, a majority of members must agree ✏️.” “The membership will decide how a member is removed.”
- **All visible text:** 🥾How Is a Member Removed?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?To remove a member, all members must agree 🏛️.Choose thisTo remove a member, all members apart from them must agree 🏛️.Choose thisTo remove a member, a majority of members must agree ✏️.Choose thisThe membership will decide how a member is removed.Choose this🗑️✒️
- **Tab and rail:** tab 🥾H, glyph travel [0,0], clause travel [0,17]; rail 🥾 “🥾How Is a Member Removed?”
- **Geometry:** 652×461px at x 478, radius 8, border 0; at 390 306×560px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [removal-founding-1600.png](shots/current/removal-founding-1600.png)

</details>

<details><summary><b>founding, unanswered (founder) · rail ⏱️</b> — <code>rate</code></summary>

- **Slots, in order:** head “⏱️Set the Proposal Rate✒️Can the Founder Make Amendments at Will?🛡️D…” → field “Members may make a new proposal ✏️ every minuteshoursdays.Choose this…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; number field
- **Strings:** options “Members may make a new proposal ✏️ every minuteshoursdays.” “The membership will decide how often members should be able…”
- **All visible text:** ⏱️Set the Proposal Rate✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Members may make a new proposal ✏️ every minuteshoursdays.Choose thisThe membership will decide how often members should be able to make proposals.Choose this🗑️✒️
- **Tab and rail:** tab ⏱️S, glyph travel [0,-187.24], clause travel [0,-170.24]; rail ⏱️ “⏱️Set the Proposal Rate”
- **Geometry:** 652×313px at x 478, radius 8, border 0; at 390 306×363px, page 390px wide, glyph travel [0,-187.23]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [rate-founding-1600.png](shots/current/rate-founding-1600.png)

</details>

<details><summary><b>founding, unanswered (founder) · rail ⏰</b> — <code>ending</code></summary>

- **Slots, in order:** head “⏰When Does It End?✒️Can the Founder Make Amendments at Will?🛡️Does t…” → field “No more changes to the document may be made after .Choose thisChanges…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”; datetime-local field
- **Strings:** options “No more changes to the document may be made after .” “Changes to the document may be made perpetually.” “The membership will decide whether changes end on a set dat…”
- **All visible text:** ⏰When Does It End?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?No more changes to the document may be made after .Choose thisChanges to the document may be made perpetually.Choose thisThe membership will decide whether changes end on a set date or may be made perpetually.Choose this🗑️✒️
- **Tab and rail:** tab ⏰Wh, glyph travel [0,0], clause travel [0,17]; rail ⏰ “⏰When Does It End?”
- **Geometry:** 652×431px at x 478, radius 8, border 0; at 390 306×505px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [ending-founding-1600.png](shots/current/ending-founding-1600.png)

</details>

<details><summary><b>founding, unanswered (founder) · rail 👥</b> — <code>quorum</code></summary>

- **Slots, in order:** head “👥Choose the Quorum✒️Can the Founder Make Amendments at Will?🛡️Does …” → field “A proposal ✏️ cannot pass until it is preferred by at least % of the …” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”; number field; number field
- **Strings:** options “A proposal ✏️ cannot pass until it is preferred by at least…” “A proposal ✏️ cannot pass until it is preferred by at least…” “The membership will decide how many members must prefer a p…”
- **All visible text:** 👥Choose the Quorum✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?A proposal ✏️ cannot pass until it is preferred by at least % of the membership.Choose thisA proposal ✏️ cannot pass until it is preferred by at least members.Choose thisThe membership will decide how many members must prefer a proposal ✏️ before it can pass.Choose this🗑️✒️
- **Tab and rail:** tab 👥C, glyph travel [0,0], clause travel [0,17]; rail 👥 “👥Choose the Quorum”
- **Geometry:** 652×464px at x 478, radius 8, border 0; at 390 306×538px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [quorum-founding-1600.png](shots/current/quorum-founding-1600.png)

</details>

<details><summary><b>founding, unanswered (founder) · rail 👤</b> — <code>authorship</code></summary>

- **Slots, in order:** head “👤Are Proposals Anonymous?✒️Can the Founder Make Amendments at Will?�…” → field “All proposals are made anonymously.Choose thisProposals may be made a…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”; radio “Choose this”; radio “Choose this”; radio “Choose this”
- **Strings:** options “All proposals are made anonymously.” “Proposals may be made anonymously.” “All proposals are made anonymously, and all names are revea…” “Proposals may be made anonymously, and all names are reveal…” “Proposals may not be made anonymously.” “The membership will decide if anonymous proposals are allow…”
- **All visible text:** 👤Are Proposals Anonymous?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?All proposals are made anonymously.Choose thisProposals may be made anonymously.Choose thisAll proposals are made anonymously, and all names are revealed at the end.Choose thisProposals may be made anonymously, and all names are revealed at the end.Choose thisProposals may not be made anonymously.Choose thisThe member…
- **Tab and rail:** tab 👤A, glyph travel [0,0], clause travel [0,17]; rail 👤 “👤Are Proposals Anonymous?”
- **Geometry:** 652×692px at x 478, radius 8, border 0; at 390 306×841px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [authorship-founding-1600.png](shots/current/authorship-founding-1600.png)

</details>

<details><summary><b>founding, unanswered (founder) · rail 👁️</b> — <code>judgments</code></summary>

- **Slots, in order:** head “👁️When Are Votes Revealed?✒️Can the Founder Make Amendments at Will?…” → field “Votes are never revealed.Choose thisVotes are revealed when the docum…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”
- **Strings:** options “Votes are never revealed.” “Votes are revealed when the document is finished, and not b…” “The membership will decide whether votes are revealed at th…”
- **All visible text:** 👁️When Are Votes Revealed?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Votes are never revealed.Choose thisVotes are revealed when the document is finished, and not before.Choose thisThe membership will decide whether votes are revealed at the end or never.Choose this🗑️✒️
- **Tab and rail:** tab 👁️, glyph travel [0,0], clause travel [0,17]; rail 👁️ “👁️When Are Votes Revealed?”
- **Geometry:** 652×394px at x 478, radius 8, border 0; at 390 306×469px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [judgments-founding-1600.png](shots/current/judgments-founding-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail 🌍</b> — <code>chamber</code></summary>

- **Slots, in order:** head “🌍Who Can See the Document?✒️Can the Founder Make Amendments at Will?…” → field “The document can only be seen by members.Choose thisThe document can …” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”
- **Strings:** options “The document can only be seen by members.” “The document can be seen by anyone with the link.” “The membership will decide whether the document can only be…”
- **All visible text:** 🌍Who Can See the Document?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document can only be seen by members.Choose thisThe document can be seen by anyone with the link.Choose thisThe membership will decide whether the document can only be seen by members or by anyone with the link.Choose this🗑️✒️
- **Tab and rail:** tab 🌍W, glyph travel [0,0], clause travel [0,17]; rail 🌍 “🌍Who Can See the Document?”
- **Geometry:** 652×394px at x 478, radius 8, border 0; at 390 306×493px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [chamber-founding-1600.png](shots/current/chamber-founding-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail 💤</b> — <code>lapse</code></summary>

- **Slots, in order:** head “💤Do Memberships Lapse?✒️Can the Founder Make Amendments at Will?🛡️D…” → field “After minuteshoursdays, inactive members lapse and automatically abst…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”; number field
- **Strings:** options “After minuteshoursdays, inactive members lapse and automati…” “Inactive members never lapse and are still counted towards …” “The membership will decide whether inactive members lapse o…”
- **All visible text:** 💤Do Memberships Lapse?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?After minuteshoursdays, inactive members lapse and automatically abstain from votes.Choose thisInactive members never lapse and are still counted towards votes.Choose thisThe membership will decide whether inactive members lapse or never lapse.Choose this🗑️✒️
- **Tab and rail:** tab 💤D, glyph travel [0,0], clause travel [0,17]; rail 💤 “💤Do Memberships Lapse?”
- **Geometry:** 652×429px at x 478, radius 8, border 0; at 390 306×503px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [lapse-answers-1600.png](shots/current/lapse-answers-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail 🥾</b> — <code>removal</code></summary>

- **Slots, in order:** head “🥾How Is a Member Removed?✒️Can the Founder Make Amendments at Will?�…” → field “To remove a member, all members must agree 🏛️.Choose thisTo remove a…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”; radio “Choose this”
- **Strings:** options “To remove a member, all members must agree 🏛️.” “To remove a member, all members apart from them must agree …” “To remove a member, a majority of members must agree ✏️.” “The membership will decide how a member is removed.”
- **All visible text:** 🥾How Is a Member Removed?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?To remove a member, all members must agree 🏛️.Choose thisTo remove a member, all members apart from them must agree 🏛️.Choose thisTo remove a member, a majority of members must agree ✏️.Choose thisThe membership will decide how a member is removed.Choose this🗑️✒️
- **Tab and rail:** tab 🥾H, glyph travel [0,0], clause travel [0,17]; rail 🥾 “🥾How Is a Member Removed?”
- **Geometry:** 652×461px at x 478, radius 8, border 0; at 390 306×560px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [removal-founding-1600.png](shots/current/removal-founding-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail ⏱️</b> — <code>rate</code></summary>

- **Slots, in order:** head “⏱️Set the Proposal Rate✒️Can the Founder Make Amendments at Will?🛡️D…” → field “Members may make a new proposal ✏️ every minuteshoursdays.Choose this…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; number field
- **Strings:** options “Members may make a new proposal ✏️ every minuteshoursdays.” “The membership will decide how often members should be able…”
- **All visible text:** ⏱️Set the Proposal Rate✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Members may make a new proposal ✏️ every minuteshoursdays.Choose thisThe membership will decide how often members should be able to make proposals.Choose this🗑️✒️
- **Tab and rail:** tab ⏱️S, glyph travel [0,0], clause travel [0,17]; rail ⏱️ “⏱️Set the Proposal Rate”
- **Geometry:** 652×313px at x 478, radius 8, border 0; at 390 306×363px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [rate-founding-1600.png](shots/current/rate-founding-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail ⏰</b> — <code>ending</code></summary>

- **Slots, in order:** head “⏰When Does It End?✒️Can the Founder Make Amendments at Will?🛡️Does t…” → field “No more changes to the document may be made after .Choose thisChanges…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”; datetime-local field
- **Strings:** options “No more changes to the document may be made after .” “Changes to the document may be made perpetually.” “The membership will decide whether changes end on a set dat…”
- **All visible text:** ⏰When Does It End?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?No more changes to the document may be made after .Choose thisChanges to the document may be made perpetually.Choose thisThe membership will decide whether changes end on a set date or may be made perpetually.Choose this🗑️✒️
- **Tab and rail:** tab ⏰Wh, glyph travel [0,0], clause travel [0,17]; rail ⏰ “⏰When Does It End?”
- **Geometry:** 652×431px at x 478, radius 8, border 0; at 390 306×505px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [ending-founding-1600.png](shots/current/ending-founding-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail 👥</b> — <code>quorum</code></summary>

- **Slots, in order:** head “👥Choose the Quorum✒️Can the Founder Make Amendments at Will?🛡️Does …” → field “A proposal ✏️ cannot pass until it is preferred by at least % of the …” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”; number field; number field
- **Strings:** options “A proposal ✏️ cannot pass until it is preferred by at least…” “A proposal ✏️ cannot pass until it is preferred by at least…” “The membership will decide how many members must prefer a p…”
- **All visible text:** 👥Choose the Quorum✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?A proposal ✏️ cannot pass until it is preferred by at least % of the membership.Choose thisA proposal ✏️ cannot pass until it is preferred by at least members.Choose thisThe membership will decide how many members must prefer a proposal ✏️ before it can pass.Choose this🗑️✒️
- **Tab and rail:** tab 👥C, glyph travel [0,0], clause travel [0,17]; rail 👥 “👥Choose the Quorum”
- **Geometry:** 652×464px at x 478, radius 8, border 0; at 390 306×538px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [quorum-founding-1600.png](shots/current/quorum-founding-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail 👤</b> — <code>authorship</code></summary>

- **Slots, in order:** head “👤Are Proposals Anonymous?✒️Can the Founder Make Amendments at Will?�…” → field “All proposals are made anonymously.Choose thisProposals may be made a…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”; radio “Choose this”; radio “Choose this”; radio “Choose this”
- **Strings:** options “All proposals are made anonymously.” “Proposals may be made anonymously.” “All proposals are made anonymously, and all names are revea…” “Proposals may be made anonymously, and all names are reveal…” “Proposals may not be made anonymously.” “The membership will decide if anonymous proposals are allow…”
- **All visible text:** 👤Are Proposals Anonymous?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?All proposals are made anonymously.Choose thisProposals may be made anonymously.Choose thisAll proposals are made anonymously, and all names are revealed at the end.Choose thisProposals may be made anonymously, and all names are revealed at the end.Choose thisProposals may not be made anonymously.Choose thisThe member…
- **Tab and rail:** tab 👤A, glyph travel [0,0], clause travel [0,17]; rail 👤 “👤Are Proposals Anonymous?”
- **Geometry:** 652×692px at x 478, radius 8, border 0; at 390 306×841px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [authorship-founding-1600.png](shots/current/authorship-founding-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail 👁️</b> — <code>judgments</code></summary>

- **Slots, in order:** head “👁️When Are Votes Revealed?✒️Can the Founder Make Amendments at Will?…” → field “Votes are never revealed.Choose thisVotes are revealed when the docum…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”
- **Strings:** options “Votes are never revealed.” “Votes are revealed when the document is finished, and not b…” “The membership will decide whether votes are revealed at th…”
- **All visible text:** 👁️When Are Votes Revealed?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Votes are never revealed.Choose thisVotes are revealed when the document is finished, and not before.Choose thisThe membership will decide whether votes are revealed at the end or never.Choose this🗑️✒️
- **Tab and rail:** tab 👁️, glyph travel [0,0], clause travel [0,17]; rail 👁️ “👁️When Are Votes Revealed?”
- **Geometry:** 652×394px at x 478, radius 8, border 0; at 390 306×469px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [judgments-founding-1600.png](shots/current/judgments-founding-1600.png)

</details>

<details><summary><b>settled by ⏩ + seeded motions — the founder</b> — <code>chamber</code></summary>

- **Slots, in order:** head “🌍Visibility🌍Who Can See the Document?✒️Can the Founder Make Amendme…” → field “The document can only be seen by members.Choose ✒️ or Propose 🏛️ thi…” → commit row [top rule] “🗑️✒️🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); button 🏛️ — nothing (disabled); radio “Chosen by the Founder ✒️” (on); radio “Choose ✒️ or Propose 🏛️ this”
- **Strings:** head “The document can be seen by anyone with the link.Chosen by the Founder ✒️” · standing “The document can be seen by anyone with the link.” · notes “I am changing this because…” · options “The document can only be seen by members.”
- **All visible text:** 🌍Visibility🌍Who Can See the Document?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Changed by the Founder: Anyone with the linkThe document can be seen by anyone with the link.Chosen by the Founder ✒️The document can only be seen by members.Choose ✒️ or Propose 🏛️ thisWhy are you changing this?ABAsh Bellamy 👑🗑️✒️🏛️
- **Tab and rail:** tab 🌍V, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×417px at x 478, radius 8, border 0; at 390 306×467px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [chamber-settled-1600.png](shots/current/chamber-settled-1600.png) · same state: `chamber` `lapse` `removal` `rate` `ending` `quorum` `authorship` `judgments`

</details>

<details><summary><b>settled + seeded — a member (seat 1, the mover)</b> — <code>lapse</code></summary>

- **Slots, in order:** head “💤LapsingInactive members never lapse and are still counted towards v…” → field “A membership lapses after minuteshoursdays without logging in.Propose…” → commit row [top rule] “🗑️🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Discard this motion; button 🏛️ — nothing (disabled); radio “Chosen by the membership” (on); radio “Propose this”; number field
- **Strings:** head “Inactive members never lapse and are still counted towards votes.Chosen by the membership” · standing “Inactive members never lapse and are still counted towards votes.” · notes “We should change this because…”
- **All visible text:** 💤LapsingInactive members never lapse and are still counted towards votes.Chosen by the membershipA membership lapses after minuteshoursdays without logging in.Propose this🗑️🏛️
- **Tab and rail:** tab 💤L, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×374px at x 478, radius 8, border 0; at 390 306×448px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [lapse-settled-1600.png](shots/current/lapse-settled-1600.png) · same state: `lapse` `removal` `rate` `ending` `quorum` `authorship` `judgments`

</details>

<details><summary><b>founding, handed to the membership and collecting · rail 🌍</b> — <code>chamber</code></summary>

- **Slots, in order:** head “🌍Who Can See the Document?✒️Can the Founder Make Amendments at Will?…” → field “The document can only be seen by members.Choose thisThe document can …” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Set it; radio “Choose this”; radio “Choose this”; radio “Chosen” (on)
- **Strings:** options “The document can only be seen by members.” “The document can be seen by anyone with the link.” “The membership will decide whether the document can only be…”
- **All visible text:** 🌍Who Can See the Document?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document can only be seen by members.Choose thisThe document can be seen by anyone with the link.Choose thisThe membership will decide whether the document can only be seen by members or by anyone with the link.Chosen🗑️✒️
- **Tab and rail:** tab 🌍W, glyph travel null, clause travel null; rail 🌍 “🌍Who Can See the Document?”
- **Geometry:** 652×394px at x 478, radius 8, border 0; at 390 306×493px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [chamber-delegated-1600.png](shots/current/chamber-delegated-1600.png)

</details>

<details><summary><b>founding, handed to the membership and collecting · rail 💤</b> — <code>lapse</code></summary>

- **Slots, in order:** head “💤Do Memberships Lapse?✒️Can the Founder Make Amendments at Will?🛡️D…” → field “After minuteshoursdays, inactive members lapse and automatically abst…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Set it; radio “Choose this”; radio “Choose this”; radio “Chosen” (on); number field
- **Strings:** options “After minuteshoursdays, inactive members lapse and automati…” “Inactive members never lapse and are still counted towards …” “The membership will decide whether inactive members lapse o…”
- **All visible text:** 💤Do Memberships Lapse?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?After minuteshoursdays, inactive members lapse and automatically abstain from votes.Choose thisInactive members never lapse and are still counted towards votes.Choose thisThe membership will decide whether inactive members lapse or never lapse.Chosen🗑️✒️
- **Tab and rail:** tab 💤D, glyph travel null, clause travel null; rail 💤 “💤Do Memberships Lapse?”
- **Geometry:** 652×429px at x 478, radius 8, border 0; at 390 306×503px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [lapse-delegated-1600.png](shots/current/lapse-delegated-1600.png)

</details>

<details><summary><b>founding, handed to the membership and collecting · rail 🥾</b> — <code>removal</code></summary>

- **Slots, in order:** head “🥾How Is a Member Removed?✒️Can the Founder Make Amendments at Will?�…” → field “To remove a member, all members must agree 🏛️.Choose thisTo remove a…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Set it; radio “Choose this”; radio “Choose this”; radio “Choose this”; radio “Chosen” (on)
- **Strings:** options “To remove a member, all members must agree 🏛️.” “To remove a member, all members apart from them must agree …” “To remove a member, a majority of members must agree ✏️.” “The membership will decide how a member is removed. [on]”
- **All visible text:** 🥾How Is a Member Removed?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?To remove a member, all members must agree 🏛️.Choose thisTo remove a member, all members apart from them must agree 🏛️.Choose thisTo remove a member, a majority of members must agree ✏️.Choose thisThe membership will decide how a member is removed.Chosen🗑️✒️
- **Tab and rail:** tab 🥾H, glyph travel null, clause travel null; rail 🥾 “🥾How Is a Member Removed?”
- **Geometry:** 652×461px at x 478, radius 8, border 0; at 390 306×560px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [removal-delegated-1600.png](shots/current/removal-delegated-1600.png)

</details>

<details><summary><b>founding, handed to the membership and collecting · rail ⏱️</b> — <code>rate</code></summary>

- **Slots, in order:** head “⏱️Set the Proposal Rate✒️Can the Founder Make Amendments at Will?🛡️D…” → field “Members may make a new proposal ✏️ every minuteshoursdays.Choose this…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Set it; radio “Choose this”; radio “Chosen” (on); number field
- **Strings:** options “Members may make a new proposal ✏️ every minuteshoursdays.” “The membership will decide how often members should be able…”
- **All visible text:** ⏱️Set the Proposal Rate✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Members may make a new proposal ✏️ every minuteshoursdays.Choose thisThe membership will decide how often members should be able to make proposals.Chosen🗑️✒️
- **Tab and rail:** tab ⏱️S, glyph travel null, clause travel null; rail ⏱️ “⏱️Set the Proposal Rate”
- **Geometry:** 652×313px at x 478, radius 8, border 0; at 390 306×363px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [rate-delegated-1600.png](shots/current/rate-delegated-1600.png)

</details>

<details><summary><b>founding, handed to the membership and collecting · rail ⏰</b> — <code>ending</code></summary>

- **Slots, in order:** head “⏰When Does It End?✒️Can the Founder Make Amendments at Will?🛡️Does t…” → field “No more changes to the document may be made after .Choose thisChanges…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Set it; radio “Choose this”; radio “Choose this”; radio “Chosen” (on); datetime-local field
- **Strings:** options “No more changes to the document may be made after .” “Changes to the document may be made perpetually.” “The membership will decide whether changes end on a set dat…”
- **All visible text:** ⏰When Does It End?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?No more changes to the document may be made after .Choose thisChanges to the document may be made perpetually.Choose thisThe membership will decide whether changes end on a set date or may be made perpetually.Chosen🗑️✒️
- **Tab and rail:** tab ⏰Wh, glyph travel null, clause travel null; rail ⏰ “⏰When Does It End?”
- **Geometry:** 652×431px at x 478, radius 8, border 0; at 390 306×505px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [ending-delegated-1600.png](shots/current/ending-delegated-1600.png)

</details>

<details><summary><b>founding, handed to the membership and collecting · rail 👥</b> — <code>quorum</code></summary>

- **Slots, in order:** head “👥Choose the Quorum✒️Can the Founder Make Amendments at Will?🛡️Does …” → field “A proposal ✏️ cannot pass until it is preferred by at least % of the …” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Set it; radio “Choose this”; radio “Choose this”; radio “Chosen” (on); number field; number field
- **Strings:** options “A proposal ✏️ cannot pass until it is preferred by at least…” “A proposal ✏️ cannot pass until it is preferred by at least…” “The membership will decide how many members must prefer a p…”
- **All visible text:** 👥Choose the Quorum✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?A proposal ✏️ cannot pass until it is preferred by at least % of the membership.Choose thisA proposal ✏️ cannot pass until it is preferred by at least members.Choose thisThe membership will decide how many members must prefer a proposal ✏️ before it can pass.Chosen🗑️✒️
- **Tab and rail:** tab 👥C, glyph travel null, clause travel null; rail 👥 “👥Choose the Quorum”
- **Geometry:** 652×464px at x 478, radius 8, border 0; at 390 306×538px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [quorum-delegated-1600.png](shots/current/quorum-delegated-1600.png)

</details>

<details><summary><b>founding, handed to the membership and collecting · rail 👤</b> — <code>authorship</code></summary>

- **Slots, in order:** head “👤Are Proposals Anonymous?✒️Can the Founder Make Amendments at Will?�…” → field “All proposals are made anonymously.Choose thisProposals may be made a…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Set it; radio “Choose this”; radio “Choose this”; radio “Choose this”; radio “Choose this”; radio “Choose this”; radio “Chosen” (on)
- **Strings:** options “All proposals are made anonymously.” “Proposals may be made anonymously.” “All proposals are made anonymously, and all names are revea…” “Proposals may be made anonymously, and all names are reveal…” “Proposals may not be made anonymously.” “The membership will decide if anonymous proposals are allow…”
- **All visible text:** 👤Are Proposals Anonymous?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?All proposals are made anonymously.Choose thisProposals may be made anonymously.Choose thisAll proposals are made anonymously, and all names are revealed at the end.Choose thisProposals may be made anonymously, and all names are revealed at the end.Choose thisProposals may not be made anonymously.Choose thisThe member…
- **Tab and rail:** tab 👤A, glyph travel null, clause travel null; rail 👤 “👤Are Proposals Anonymous?”
- **Geometry:** 652×692px at x 478, radius 8, border 0; at 390 306×841px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [authorship-delegated-1600.png](shots/current/authorship-delegated-1600.png)

</details>

<details><summary><b>founding, handed to the membership and collecting · rail 👁️</b> — <code>judgments</code></summary>

- **Slots, in order:** head “👁️When Are Votes Revealed?✒️Can the Founder Make Amendments at Will?…” → field “Votes are never revealed.Choose thisVotes are revealed when the docum…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Set it; radio “Choose this”; radio “Choose this”; radio “Chosen” (on)
- **Strings:** options “Votes are never revealed.” “Votes are revealed when the document is finished, and not b…” “The membership will decide whether votes are revealed at th…”
- **All visible text:** 👁️When Are Votes Revealed?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Votes are never revealed.Choose thisVotes are revealed when the document is finished, and not before.Choose thisThe membership will decide whether votes are revealed at the end or never.Chosen🗑️✒️
- **Tab and rail:** tab 👁️, glyph travel null, clause travel null; rail 👁️ “👁️When Are Votes Revealed?”
- **Geometry:** 652×394px at x 478, radius 8, border 0; at 390 306×469px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [judgments-delegated-1600.png](shots/current/judgments-delegated-1600.png)

</details>

<details><summary><b>the session fixture, band cards (&band=1)</b> — <code>chamber</code></summary>

- **Slots, in order:** head “🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Fou…” → field “The document can be seen by anyone with the link.Choose ✒️ or Propose…” → commit row [top rule] “🗑️✒️🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); button 🏛️ — nothing (disabled); radio “Chosen by the Founder ✒️” (on); radio “Choose ✒️ or Propose 🏛️ this”
- **Strings:** head “The document can only be seen by members.Chosen by the Founder ✒️” · standing “The document can only be seen by members.” · notes “I am changing this because…” · options “The document can be seen by anyone with the link.”
- **All visible text:** 🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document can only be seen by members.Chosen by the Founder ✒️The document can be seen by anyone with the link.Choose ✒️ or Propose 🏛️ thisWhy are you changing this?ABAsh Bellamy 👑🗑️✒️🏛️
- **Tab and rail:** tab 🌍V, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×417px at x 478, radius 8, border 0; at 390 306×467px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [chamber-sessionband-1600.png](shots/current/chamber-sessionband-1600.png) · same state: `chamber` `lapse` `removal` `rate` `ending` `quorum` `authorship` `judgments`

</details>

<details><summary><b>the closed page, band cards (&closed=1&band=1)</b> — <code>chamber</code></summary>

- **Slots, in order:** head “🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Fou…” → field “Set toMembers onlySet by the founder when the document was made.” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; radio “Chosen by the Founder ✒️” (on)
- **Strings:** head “The document can only be seen by members.Chosen by the Founder ✒️” · standing “The document can only be seen by members.” · lockline “Set by the founder when the document was made.” · notes “Set by the founder when the document was made.”
- **All visible text:** 🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document can only be seen by members.Chosen by the Founder ✒️Set toMembers onlySet by the founder when the document was made.🗑️
- **Tab and rail:** tab 🌍V, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×270px at x 478, radius 8, border 0; at 390 306×311px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [chamber-closedband-1600.png](shots/current/chamber-closedband-1600.png) · same state: `chamber` `lapse` `removal` `rate` `ending` `quorum` `authorship` `judgments`

</details>

<details><summary><b>live ladder · rung constitution</b> — <code>chamber</code></summary>

- **Slots, in order:** head “🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Fou…” → field “Set toundefinedSet by the founder when the document was made.” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands
- **Strings:** lockline “Set by the founder when the document was made.” · notes “Set by the founder when the document was made.”
- **All visible text:** 🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Set toundefinedSet by the founder when the document was made.🗑️
- **Tab and rail:** tab 🌍V, glyph travel [0,0], clause travel [0,17]; rail no entry
- **Geometry:** 652×178px at x 478, radius 8, border 0; at 390 306×195px, page 390px wide, glyph travel [0,0]
- **Shot:** [chamber-live_constitution_m-1-1600.png](shots/current/chamber-live_constitution_m-1-1600.png)

</details>

<details><summary><b>live ladder · rung ready</b> — <code>chamber</code></summary>

- **Slots, in order:** head “🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Fou…” → field “Set toMembers onlySet by the founder when the document was made.” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; radio “Chosen by the Founder ✒️” (on)
- **Strings:** head “The document can only be seen by members.Chosen by the Founder ✒️” · standing “The document can only be seen by members.” · lockline “Set by the founder when the document was made.” · notes “Set by the founder when the document was made.”
- **All visible text:** 🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document can only be seen by members.Chosen by the Founder ✒️Set toMembers onlySet by the founder when the document was made.🗑️
- **Tab and rail:** tab 🌍V, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×270px at x 478, radius 8, border 0; at 390 306×311px, page 390px wide, glyph travel [0,0]
- **Shot:** [chamber-live_ready_m-1-1600.png](shots/current/chamber-live_ready_m-1-1600.png) · same state: `chamber` `lapse` `removal` `rate` `ending` `quorum` `authorship` `judgments`

</details>

<details><summary><b>live ladder · rung session</b> — <code>chamber</code></summary>

- **Slots, in order:** head “🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Fou…” → field “The document can be seen by anyone with the link.Choose thisWhy are y…” → commit row [top rule] “🗑️✒️🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); button 🏛️ — nothing (disabled); radio “Chosen by the Founder ✒️” (on); radio “Choose this”
- **Strings:** head “The document can only be seen by members.Chosen by the Founder ✒️” · standing “The document can only be seen by members.” · notes “I am changing this because…” · options “The document can be seen by anyone with the link.”
- **All visible text:** 🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document can only be seen by members.Chosen by the Founder ✒️The document can be seen by anyone with the link.Choose thisWhy are you changing this?ABAsh Bellamy 👑🗑️✒️🏛️
- **Tab and rail:** tab 🌍V, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×417px at x 478, radius 8, border 0; at 390 306×467px, page 390px wide, glyph travel [0,0]
- **Shot:** [chamber-live_session_founder-1600.png](shots/current/chamber-live_session_founder-1600.png) · same state: `chamber` `lapse` `removal` `rate` `ending` `quorum` `authorship` `judgments`

</details>

<details><summary><b>live ladder · rung closing</b> — <code>chamber</code></summary>

- **Slots, in order:** head “🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Fou…” → field “The document can be seen by anyone with the link.Choose thisWhy are y…” → commit row [top rule] “🗑️✒️🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); button 🏛️ — nothing (disabled); radio “Chosen by the Founder ✒️” (on); radio “Choose this”
- **Strings:** head “The document can only be seen by members.Chosen by the Founder ✒️” · standing “The document can only be seen by members.” · notes “I am changing this because…” · options “The document can be seen by anyone with the link.”
- **All visible text:** 🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document can only be seen by members.Chosen by the Founder ✒️The document can be seen by anyone with the link.Choose thisWhy are you changing this?ABAsh Bellamy 👑🗑️✒️🏛️
- **Tab and rail:** tab 🌍V, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×417px at x 478, radius 8, border 0; at 390 306×467px, page 390px wide, glyph travel [0,0]
- **Shot:** [chamber-live_session_founder-1600.png](shots/current/chamber-live_session_founder-1600.png) · same state: `chamber` `lapse` `removal` `rate` `ending` `quorum` `authorship` `judgments`

</details>

<details><summary><b>live ladder · rung closed</b> — <code>chamber</code></summary>

- **Slots, in order:** head “🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Fou…” → field “Set toMembers onlySet by the founder when the document was made.” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; radio “Chosen by the Founder ✒️” (on)
- **Strings:** head “The document can only be seen by members.Chosen by the Founder ✒️” · standing “The document can only be seen by members.” · lockline “Set by the founder when the document was made.” · notes “Set by the founder when the document was made.”
- **All visible text:** 🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document can only be seen by members.Chosen by the Founder ✒️Set toMembers onlySet by the founder when the document was made.🗑️
- **Tab and rail:** tab 🌍V, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×270px at x 478, radius 8, border 0; at 390 306×311px, page 390px wide, glyph travel [0,0]
- **Shot:** [chamber-live_closed_founder-1600.png](shots/current/chamber-live_closed_founder-1600.png) · same state: `chamber` `lapse` `removal` `rate` `ending` `quorum` `authorship` `judgments`

</details>

### `birth` — setting — the birth (🪶 📍)

Rules: §9 setting, F2, F11, F12, Q1151. Keys: `title` `slug`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| founding, unanswered (founder) · rail 🪶 | 1 | [title-founding-1600.png](shots/current/title-founding-1600.png) | [title-founding-390.png](shots/current/title-founding-390.png) | 🗑️ · 🪶 | — | 0, 0.01 |
| founding, unanswered (founder) · rail 📍 | 1 | [slug-founding-1600.png](shots/current/slug-founding-1600.png) | [slug-founding-390.png](shots/current/slug-founding-390.png) | 🗑️ · 🪶 | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail 🪶 | 1 | [title-answers-1600.png](shots/current/title-answers-1600.png) | [title-answers-390.png](shots/current/title-answers-390.png) | 🗑️ · 🪶 | — | 0, 0.01 |
| founding, 🌍 delegated → the founder’s own answer card · rail 📍 | 1 | [slug-founding-1600.png](shots/current/slug-founding-1600.png) | [slug-founding-390.png](shots/current/slug-founding-390.png) | 🗑️ · 🪶 | — | 0, 0 |
| settled by ⏩ + seeded motions — the founder | 2 | [title-settled-1600.png](shots/current/title-settled-1600.png) | [title-settled-390.png](shots/current/title-settled-390.png) | 🗑️ · ✒️ · ✏️ | — | 0, 0 |
| settled + seeded — a member (seat 1, the mover) | 2 | [title-seat_1-1600.png](shots/current/title-seat_1-1600.png) | [title-seat_1-390.png](shots/current/title-seat_1-390.png) | 🗑️ · ✏️ | — | 0, 0 |
| settled + seeded — a stranger at the door | 1 | [title-seat_stranger-1600.png](shots/current/title-seat_stranger-1600.png) | [title-seat_stranger-390.png](shots/current/title-seat_stranger-390.png) | 🗑️ · OK | — | 0, 0 |
| founding, handed to the membership and collecting · rail 🪶 | 1 | [title-delegated-1600.png](shots/current/title-delegated-1600.png) | [title-delegated-390.png](shots/current/title-delegated-390.png) | 🗑️ · 🪶 | — | 0, 0.01 |
| founding, handed to the membership and collecting · rail 📍 | 1 | [slug-delegated-1600.png](shots/current/slug-delegated-1600.png) | [slug-delegated-390.png](shots/current/slug-delegated-390.png) | 🗑️ · 🪶 | — | 0, 0 |
| the session fixture, band cards (&band=1) | 2 | [title-sessionband-1600.png](shots/current/title-sessionband-1600.png) | [title-sessionband-390.png](shots/current/title-sessionband-390.png) | 🗑️ · ✒️ · ✏️ | — | 0, 0 |
| the closed page, band cards (&closed=1&band=1) | 2 | [title-closedband-1600.png](shots/current/title-closedband-1600.png) | [title-closedband-390.png](shots/current/title-closedband-390.png) | 🗑️ | — | 0, 0 |
| live ladder · rung constitution | 2 | [title-live_constitution_founder-1600.png](shots/current/title-live_constitution_founder-1600.png) | [title-live_constitution_founder-390.png](shots/current/title-live_constitution_founder-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| live ladder · rung ready | 2 | [title-live_constitution_founder-1600.png](shots/current/title-live_constitution_founder-1600.png) | [title-live_constitution_founder-390.png](shots/current/title-live_constitution_founder-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| live ladder · rung session | 2 | [title-live_session_founder-1600.png](shots/current/title-live_session_founder-1600.png) | [title-live_session_founder-390.png](shots/current/title-live_session_founder-390.png) | 🗑️ · ✒️ · ✏️ | — | 0, 0 |
| live ladder · rung closing | 2 | [title-live_session_founder-1600.png](shots/current/title-live_session_founder-1600.png) | [title-live_closing_founder-390.png](shots/current/title-live_closing_founder-390.png) | 🗑️ · ✒️ · ✏️ | — | 0, 0 |
| live ladder · rung closed | 2 | [title-live_closed_founder-1600.png](shots/current/title-live_closed_founder-1600.png) | [title-live_closed_founder-390.png](shots/current/title-live_closed_founder-390.png) | 🗑️ | — | 0, 0 |

<details><summary><b>founding, unanswered (founder) · rail 🪶</b> — <code>title</code></summary>

- **Slots, in order:** head “🪶Name the Document” → field → commit row [top rule] “🗑️🪶”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🪶 — nothing (disabled)
- **Strings:** notes “Give this document a title”
- **All visible text:** 🪶Name the Document🗑️🪶
- **Tab and rail:** tab 🪶N, glyph travel [0,0.01], clause travel [0,20]; rail 🪶 “🪶Name the Document”
- **Geometry:** 652×181px at x 478, radius 8, border 0; at 390 306×181px, page 390px wide, glyph travel [0,0.01]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [title-founding-1600.png](shots/current/title-founding-1600.png)

</details>

<details><summary><b>founding, unanswered (founder) · rail 📍</b> — <code>slug</code></summary>

- **Slots, in order:** head “📍Choose the Link” → field “docs.vote/d/” → commit row [top rule] “🗑️🪶”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🪶 — Set it; text field
- **Strings:** notes “docs.vote/d/”
- **All visible text:** 📍Choose the Linkdocs.vote/d/🗑️🪶
- **Tab and rail:** tab 📍C, glyph travel [0,0], clause travel [0,17]; rail 📍 “📍Choose the Link”
- **Geometry:** 652×156px at x 478, radius 8, border 0; at 390 306×186px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [slug-founding-1600.png](shots/current/slug-founding-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail 🪶</b> — <code>title</code></summary>

- **Slots, in order:** head “🪶Name the Document” → field → commit row [top rule] “🗑️🪶”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🪶 — nothing (disabled)
- **Strings:** notes “Give this document a title”
- **All visible text:** 🪶Name the Document🗑️🪶
- **Tab and rail:** tab 🪶N, glyph travel [0,0.01], clause travel [0,20]; rail 🪶 “🪶Name the Document”
- **Geometry:** 652×181px at x 478, radius 8, border 0; at 390 306×181px, page 390px wide, glyph travel [0,0.01]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [title-answers-1600.png](shots/current/title-answers-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail 📍</b> — <code>slug</code></summary>

- **Slots, in order:** head “📍Choose the Link” → field “docs.vote/d/” → commit row [top rule] “🗑️🪶”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🪶 — Set it; text field
- **Strings:** notes “docs.vote/d/”
- **All visible text:** 📍Choose the Linkdocs.vote/d/🗑️🪶
- **Tab and rail:** tab 📍C, glyph travel [0,0], clause travel [0,17]; rail 📍 “📍Choose the Link”
- **Geometry:** 652×156px at x 478, radius 8, border 0; at 390 306×186px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [slug-founding-1600.png](shots/current/slug-founding-1600.png)

</details>

<details><summary><b>settled by ⏩ + seeded motions — the founder</b> — <code>title</code></summary>

- **Slots, in order:** head “🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder …” → field “The document is titled .Choose thisWhy are you changing this?ABAsh Be…” → commit row [top rule] “🗑️✒️✏️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); button ✏️ — nothing (disabled); radio “Chosen by the Founder ✒️” (on); radio “Choose this”
- **Strings:** head “The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️” · standing “The document is titled “The Hollow Oak Club — House Charter”.” · notes “A new title” “I am changing this because…”
- **All visible text:** 🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️The document is titled .Choose thisWhy are you changing this?ABAsh Bellamy 👑🗑️✒️✏️
- **Tab and rail:** tab 🪶T, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×450px at x 478, radius 8, border 0; at 390 306×499px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [title-settled-1600.png](shots/current/title-settled-1600.png) · same state: `title` `slug`

</details>

<details><summary><b>settled + seeded — a member (seat 1, the mover)</b> — <code>title</code></summary>

- **Slots, in order:** head “🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder …” → field “The document is titled .Propose this” → commit row [top rule] “🗑️✏️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Discard this motion; button ✏️ — nothing (disabled); radio “Chosen by the Founder ✒️” (on); radio “Propose this”; text field “A new title”
- **Strings:** head “The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️” · standing “The document is titled “The Hollow Oak Club — House Charter”.” · notes “We should change this because…”
- **All visible text:** 🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️The document is titled .Propose this🗑️✏️
- **Tab and rail:** tab 🪶T, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×374px at x 478, radius 8, border 0; at 390 306×448px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [title-seat_1-1600.png](shots/current/title-seat_1-1600.png) · same state: `title` `slug`

</details>

<details><summary><b>settled + seeded — a stranger at the door</b> — <code>title</code></summary>

- **Slots, in order:** head “🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder …” → commit row “🗑️OK”
- **Dividers:** none between top-level slots
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close; radio “Chosen by the Founder ✒️” (on)
- **Strings:** head “The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️” · standing “The document is titled “The Hollow Oak Club — House Charter”.”
- **All visible text:** 🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️🗑️OK
- **Tab and rail:** tab 🪶T, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×184px at x 478, radius 8, border 0; at 390 306×209px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [title-seat_stranger-1600.png](shots/current/title-seat_stranger-1600.png)

</details>

<details><summary><b>founding, handed to the membership and collecting · rail 🪶</b> — <code>title</code></summary>

- **Slots, in order:** head “🪶Name the Document” → field → commit row [top rule] “🗑️🪶”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🪶 — nothing (disabled)
- **Strings:** notes “Give this document a title”
- **All visible text:** 🪶Name the Document🗑️🪶
- **Tab and rail:** tab 🪶N, glyph travel [0,0.01], clause travel [0,20]; rail 🪶 “🪶Name the Document”
- **Geometry:** 652×181px at x 478, radius 8, border 0; at 390 306×181px, page 390px wide, glyph travel [0,0.01]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [title-delegated-1600.png](shots/current/title-delegated-1600.png)

</details>

<details><summary><b>founding, handed to the membership and collecting · rail 📍</b> — <code>slug</code></summary>

- **Slots, in order:** head “📍Choose the Link” → field “docs.vote/d/” → commit row [top rule] “🗑️🪶”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🪶 — Set it; text field
- **Strings:** notes “docs.vote/d/”
- **All visible text:** 📍Choose the Linkdocs.vote/d/🗑️🪶
- **Tab and rail:** tab 📍C, glyph travel [0,0], clause travel [0,17]; rail 📍 “📍Choose the Link”
- **Geometry:** 652×156px at x 478, radius 8, border 0; at 390 306×186px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [slug-delegated-1600.png](shots/current/slug-delegated-1600.png)

</details>

<details><summary><b>the session fixture, band cards (&band=1)</b> — <code>title</code></summary>

- **Slots, in order:** head “🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder …” → field “The document is titled .Choose thisWhy are you changing this?ABAsh Be…” → commit row [top rule] “🗑️✒️✏️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); button ✏️ — nothing (disabled); radio “Chosen by the Founder ✒️” (on); radio “Choose this”
- **Strings:** head “The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️” · standing “The document is titled “The Hollow Oak Club — House Charter”.” · notes “A new title” “I am changing this because…”
- **All visible text:** 🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️The document is titled .Choose thisWhy are you changing this?ABAsh Bellamy 👑🗑️✒️✏️
- **Tab and rail:** tab 🪶T, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×450px at x 478, radius 8, border 0; at 390 306×499px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [title-sessionband-1600.png](shots/current/title-sessionband-1600.png) · same state: `title` `slug`

</details>

<details><summary><b>the closed page, band cards (&closed=1&band=1)</b> — <code>title</code></summary>

- **Slots, in order:** head “🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder …” → commit row “🗑️”
- **Dividers:** none between top-level slots
- **Controls:** button 🗑️ — Put it back as it stands; radio “Chosen by the Founder ✒️” (on)
- **Strings:** head “The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️” · standing “The document is titled “The Hollow Oak Club — House Charter”.”
- **All visible text:** 🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️🗑️
- **Tab and rail:** tab 🪶T, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×184px at x 478, radius 8, border 0; at 390 306×209px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [title-closedband-1600.png](shots/current/title-closedband-1600.png) · same state: `title` `slug`

</details>

<details><summary><b>live ladder · rung constitution</b> — <code>title</code></summary>

- **Slots, in order:** head “🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder …” → field “The document is titled .Choose thisWhy are you changing this?ABAsh Be…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Chosen by the Founder ✒️” (on); radio “Choose this”
- **Strings:** head “The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️” · standing “The document is titled “The Hollow Oak Club — House Charter”.” · notes “A new title” “I am changing this because…”
- **All visible text:** 🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️The document is titled .Choose thisWhy are you changing this?ABAsh Bellamy 👑🗑️✒️
- **Tab and rail:** tab 🪶T, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×450px at x 478, radius 8, border 0; at 390 306×499px, page 390px wide, glyph travel [0,0]
- **Shot:** [title-live_constitution_founder-1600.png](shots/current/title-live_constitution_founder-1600.png) · same state: `title` `slug`

</details>

<details><summary><b>live ladder · rung ready</b> — <code>title</code></summary>

- **Slots, in order:** head “🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder …” → field “The document is titled .Choose thisWhy are you changing this?ABAsh Be…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Chosen by the Founder ✒️” (on); radio “Choose this”
- **Strings:** head “The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️” · standing “The document is titled “The Hollow Oak Club — House Charter”.” · notes “A new title” “I am changing this because…”
- **All visible text:** 🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️The document is titled .Choose thisWhy are you changing this?ABAsh Bellamy 👑🗑️✒️
- **Tab and rail:** tab 🪶T, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×450px at x 478, radius 8, border 0; at 390 306×499px, page 390px wide, glyph travel [0,0]
- **Shot:** [title-live_constitution_founder-1600.png](shots/current/title-live_constitution_founder-1600.png) · same state: `title` `slug`

</details>

<details><summary><b>live ladder · rung session</b> — <code>title</code></summary>

- **Slots, in order:** head “🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder …” → field “The document is titled .Choose thisWhy are you changing this?ABAsh Be…” → commit row [top rule] “🗑️✒️✏️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); button ✏️ — nothing (disabled); radio “Chosen by the Founder ✒️” (on); radio “Choose this”
- **Strings:** head “The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️” · standing “The document is titled “The Hollow Oak Club — House Charter”.” · notes “A new title” “I am changing this because…”
- **All visible text:** 🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️The document is titled .Choose thisWhy are you changing this?ABAsh Bellamy 👑🗑️✒️✏️
- **Tab and rail:** tab 🪶T, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×450px at x 478, radius 8, border 0; at 390 306×499px, page 390px wide, glyph travel [0,0]
- **Shot:** [title-live_session_founder-1600.png](shots/current/title-live_session_founder-1600.png) · same state: `title` `slug`

</details>

<details><summary><b>live ladder · rung closing</b> — <code>title</code></summary>

- **Slots, in order:** head “🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder …” → field “The document is titled .Choose thisWhy are you changing this?ABAsh Be…” → commit row [top rule] “🗑️✒️✏️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); button ✏️ — nothing (disabled); radio “Chosen by the Founder ✒️” (on); radio “Choose this”
- **Strings:** head “The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️” · standing “The document is titled “The Hollow Oak Club — House Charter”.” · notes “A new title” “I am changing this because…”
- **All visible text:** 🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️The document is titled .Choose thisWhy are you changing this?ABAsh Bellamy 👑🗑️✒️✏️
- **Tab and rail:** tab 🪶T, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×450px at x 478, radius 8, border 0; at 390 306×499px, page 390px wide, glyph travel [0,0]
- **Shot:** [title-live_session_founder-1600.png](shots/current/title-live_session_founder-1600.png) · same state: `title` `slug`

</details>

<details><summary><b>live ladder · rung closed</b> — <code>title</code></summary>

- **Slots, in order:** head “🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder …” → commit row “🗑️”
- **Dividers:** none between top-level slots
- **Controls:** button 🗑️ — Put it back as it stands; radio “Chosen by the Founder ✒️” (on)
- **Strings:** head “The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️” · standing “The document is titled “The Hollow Oak Club — House Charter”.”
- **All visible text:** 🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document is titled “The Hollow Oak Club — House Charter”.Chosen by the Founder ✒️🗑️
- **Tab and rail:** tab 🪶T, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×184px at x 478, radius 8, border 0; at 390 306×209px, page 390px wide, glyph travel [0,0]
- **Shot:** [title-live_closed_founder-1600.png](shots/current/title-live_closed_founder-1600.png) · same state: `title` `slug`

</details>

### `admissions` — 🪪 Admissions

Rules: §9 🪪, SPEC §9.7½. Keys: `admission`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| founding, unanswered (founder) · rail 🪪 | 1 | [admission-founding-1600.png](shots/current/admission-founding-1600.png) | [admission-founding-390.png](shots/current/admission-founding-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail 🪪 | 1 | [admission-founding-1600.png](shots/current/admission-founding-1600.png) | [admission-answers-390.png](shots/current/admission-answers-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| settled by ⏩ + seeded motions — the founder | 1 | [admission-settled-1600.png](shots/current/admission-settled-1600.png) | [admission-settled-390.png](shots/current/admission-settled-390.png) | 🗑️ · 🏛️ | — | 0, 0 |
| settled + seeded — a member (seat 1, the mover) | 1 | [admission-settled-1600.png](shots/current/admission-settled-1600.png) | [admission-seat_1-390.png](shots/current/admission-seat_1-390.png) | 🗑️ · 🏛️ | — | 0, 0 |
| founding, handed to the membership and collecting · rail 🪪 | 1 | [admission-delegated-1600.png](shots/current/admission-delegated-1600.png) | [admission-delegated-390.png](shots/current/admission-delegated-390.png) | 🗑️ · ✒️ | — | — |
| the session fixture, band cards (&band=1) | 1 | [admission-sessionband-1600.png](shots/current/admission-sessionband-1600.png) | [admission-sessionband-390.png](shots/current/admission-sessionband-390.png) | 🗑️ · 🏛️ | — | 0, 0 |
| the closed page, band cards (&closed=1&band=1) | 1 | [admission-closedband-1600.png](shots/current/admission-closedband-1600.png) | [admission-closedband-390.png](shots/current/admission-closedband-390.png) | 🗑️ | — | 0, 0 |
| live ladder · rung ready | 1 | [admission-live_ready_m-1-1600.png](shots/current/admission-live_ready_m-1-1600.png) | [admission-live_ready_m-1-390.png](shots/current/admission-live_ready_m-1-390.png) | 🗑️ | — | 0, 0 |
| live ladder · rung session | 1 | [admission-live_session_founder-1600.png](shots/current/admission-live_session_founder-1600.png) | [admission-live_session_founder-390.png](shots/current/admission-live_session_founder-390.png) | 🗑️ · ✒️ · 🏛️ | — | 0, 0 |
| live ladder · rung closing | 1 | [admission-live_session_founder-1600.png](shots/current/admission-live_session_founder-1600.png) | [admission-live_closing_founder-390.png](shots/current/admission-live_closing_founder-390.png) | 🗑️ · ✒️ · 🏛️ | — | 0, 0 |
| live ladder · rung closed | 1 | [admission-live_closed_founder-1600.png](shots/current/admission-live_closed_founder-1600.png) | [admission-live_closed_founder-390.png](shots/current/admission-live_closed_founder-390.png) | 🗑️ | — | 0, 0 |

<details><summary><b>founding, unanswered (founder) · rail 🪪</b> — <code>admission</code></summary>

- **Slots, in order:** head “🪪How Does Somebody Join?✒️Can the Founder Make Amendments at Will?🛡…” → field “Any member may propose to invite someone to join the membership, but …” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”; radio “Choose this”
- **Strings:** options “Any member may propose to invite someone to join the member…” “Any member may propose to invite someone to join the member…” “Any member may invite someone to join the membership at wil…” “The membership will decide how new members may join.”
- **All visible text:** 🪪How Does Somebody Join?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Any member may propose to invite someone to join the membership, but all members must agree 🏛️.Choose thisAny member may propose to invite someone to join the membership, and the membership decides ✏️.Choose thisAny member may invite someone to join the membership at will ✒️.Choose thisThe membership will decide how n…
- **Tab and rail:** tab 🪪H, glyph travel [0,0], clause travel [0,17]; rail 🪪 “🪪How Does Somebody Join?”
- **Geometry:** 652×510px at x 478, radius 8, border 0; at 390 306×609px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [admission-founding-1600.png](shots/current/admission-founding-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail 🪪</b> — <code>admission</code></summary>

- **Slots, in order:** head “🪪How Does Somebody Join?✒️Can the Founder Make Amendments at Will?🛡…” → field “Any member may propose to invite someone to join the membership, but …” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”; radio “Choose this”
- **Strings:** options “Any member may propose to invite someone to join the member…” “Any member may propose to invite someone to join the member…” “Any member may invite someone to join the membership at wil…” “The membership will decide how new members may join.”
- **All visible text:** 🪪How Does Somebody Join?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Any member may propose to invite someone to join the membership, but all members must agree 🏛️.Choose thisAny member may propose to invite someone to join the membership, and the membership decides ✏️.Choose thisAny member may invite someone to join the membership at will ✒️.Choose thisThe membership will decide how n…
- **Tab and rail:** tab 🪪H, glyph travel [0,0], clause travel [0,17]; rail 🪪 “🪪How Does Somebody Join?”
- **Geometry:** 652×510px at x 478, radius 8, border 0; at 390 306×609px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [admission-founding-1600.png](shots/current/admission-founding-1600.png)

</details>

<details><summary><b>settled by ⏩ + seeded motions — the founder</b> — <code>admission</code></summary>

- **Slots, in order:** head “🪪AdmissionsAny member may propose to invite someone to join the memb…” → field “Any member may propose to invite someone to join the membership, and …” → commit row [top rule] “🗑️🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Discard this motion; button 🏛️ — nothing (disabled); radio “Chosen by the membership” (on); radio “Propose this”; radio “Propose this”
- **Strings:** head “Any member may propose to invite someone to join the membership, but all members must agree 🏛️.Chosen by the membership” · standing “Any member may propose to invite someone to join the membership, but all members must agree 🏛️.” · notes “We should change this because…” · options “Any member may propose to invite someone to join the member…” “Any member may invite someone to join the membership at wil…”
- **All visible text:** 🪪AdmissionsAny member may propose to invite someone to join the membership, but all members must agree 🏛️.Chosen by the membershipAny member may propose to invite someone to join the membership, and the membership decides ✏️.Propose thisAny member may invite someone to join the membership at will ✒️.Propose this🗑️🏛️
- **Tab and rail:** tab 🪪A, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×499px at x 478, radius 8, border 0; at 390 306×573px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [admission-settled-1600.png](shots/current/admission-settled-1600.png)

</details>

<details><summary><b>settled + seeded — a member (seat 1, the mover)</b> — <code>admission</code></summary>

- **Slots, in order:** head “🪪AdmissionsAny member may propose to invite someone to join the memb…” → field “Any member may propose to invite someone to join the membership, and …” → commit row [top rule] “🗑️🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Discard this motion; button 🏛️ — nothing (disabled); radio “Chosen by the membership” (on); radio “Propose this”; radio “Propose this”
- **Strings:** head “Any member may propose to invite someone to join the membership, but all members must agree 🏛️.Chosen by the membership” · standing “Any member may propose to invite someone to join the membership, but all members must agree 🏛️.” · notes “We should change this because…” · options “Any member may propose to invite someone to join the member…” “Any member may invite someone to join the membership at wil…”
- **All visible text:** 🪪AdmissionsAny member may propose to invite someone to join the membership, but all members must agree 🏛️.Chosen by the membershipAny member may propose to invite someone to join the membership, and the membership decides ✏️.Propose thisAny member may invite someone to join the membership at will ✒️.Propose this🗑️🏛️
- **Tab and rail:** tab 🪪A, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×499px at x 478, radius 8, border 0; at 390 306×573px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [admission-settled-1600.png](shots/current/admission-settled-1600.png)

</details>

<details><summary><b>founding, handed to the membership and collecting · rail 🪪</b> — <code>admission</code></summary>

- **Slots, in order:** head “🪪How Does Somebody Join?✒️Can the Founder Make Amendments at Will?🛡…” → field “Any member may propose to invite someone to join the membership, but …” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Set it; radio “Choose this”; radio “Choose this”; radio “Choose this”; radio “Chosen” (on)
- **Strings:** options “Any member may propose to invite someone to join the member…” “Any member may propose to invite someone to join the member…” “Any member may invite someone to join the membership at wil…” “The membership will decide how new members may join. [on]”
- **All visible text:** 🪪How Does Somebody Join?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Any member may propose to invite someone to join the membership, but all members must agree 🏛️.Choose thisAny member may propose to invite someone to join the membership, and the membership decides ✏️.Choose thisAny member may invite someone to join the membership at will ✒️.Choose thisThe membership will decide how n…
- **Tab and rail:** tab 🪪H, glyph travel null, clause travel null; rail 🪪 “🪪How Does Somebody Join?”
- **Geometry:** 652×510px at x 478, radius 8, border 0; at 390 306×609px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [admission-delegated-1600.png](shots/current/admission-delegated-1600.png)

</details>

<details><summary><b>the session fixture, band cards (&band=1)</b> — <code>admission</code></summary>

- **Slots, in order:** head “🪪AdmissionsAny member may propose to invite someone to join the memb…” → field “Any member may propose to invite someone to join the membership, and …” → commit row [top rule] “🗑️🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Discard this motion; button 🏛️ — nothing (disabled); radio “Chosen by the membership” (on); radio “Propose this”; radio “Propose this”
- **Strings:** head “Any member may propose to invite someone to join the membership, but all members must agree 🏛️.Chosen by the membership” · standing “Any member may propose to invite someone to join the membership, but all members must agree 🏛️.” · notes “We should change this because…” · options “Any member may propose to invite someone to join the member…” “Any member may invite someone to join the membership at wil…”
- **All visible text:** 🪪AdmissionsAny member may propose to invite someone to join the membership, but all members must agree 🏛️.Chosen by the membershipAny member may propose to invite someone to join the membership, and the membership decides ✏️.Propose thisAny member may invite someone to join the membership at will ✒️.Propose this🗑️🏛️
- **Tab and rail:** tab 🪪A, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×499px at x 478, radius 8, border 0; at 390 306×573px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [admission-sessionband-1600.png](shots/current/admission-sessionband-1600.png)

</details>

<details><summary><b>the closed page, band cards (&closed=1&band=1)</b> — <code>admission</code></summary>

- **Slots, in order:** head “🪪AdmissionsAny member may propose to invite someone to join the memb…” → field “You propose like anybody, and nothing comes to you for assent. Pickin…” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; radio “Chosen by the membership” (on); radio “Choose this”; radio “Choose this”
- **Strings:** head “Any member may propose to invite someone to join the membership, but all members must agree 🏛️.Chosen by the membership” · standing “Any member may propose to invite someone to join the membership, but all members must agree 🏛️.” · notes “You propose like anybody, and nothing comes to you for assent. Picking a value here takes…” · options “Any member may propose to invite someone to join the member…” “Any member may invite someone to join the membership at wil…”
- **All visible text:** 🪪AdmissionsAny member may propose to invite someone to join the membership, but all members must agree 🏛️.Chosen by the membershipYou propose like anybody, and nothing comes to you for assent. Picking a value here takes it back.Any member may propose to invite someone to join the membership, and the membership decides ✏️.Choose thisAny member may invite someone to join the membership at will ✒️.Choose this🗑️
- **Tab and rail:** tab 🪪A, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×457px at x 478, radius 8, border 0; at 390 306×549px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [admission-closedband-1600.png](shots/current/admission-closedband-1600.png)

</details>

<details><summary><b>live ladder · rung ready</b> — <code>admission</code></summary>

- **Slots, in order:** head “🪪Admissions✒️Can the Founder Make Amendments at Will?🛡️Does the Fou…” → field “Set toAny member may propose to invite someone to join the membership…” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; radio “Chosen by the Founder ✒️” (on)
- **Strings:** head “Any member may propose to invite someone to join the membership, but all members must agree 🏛️.Chosen by the Founder ✒️” · standing “Any member may propose to invite someone to join the membership, but all members must agree 🏛️.” · lockline “Set by the founder when the document was made.” · notes “Set by the founder when the document was made.”
- **All visible text:** 🪪Admissions✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Any member may propose to invite someone to join the membership, but all members must agree 🏛️.Chosen by the Founder ✒️Set toAny member may propose to invite someone to join the membership, but all members must agree 🏛️.Set by the founder when the document was made.🗑️
- **Tab and rail:** tab 🪪A, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×318px at x 478, radius 8, border 0; at 390 306×408px, page 390px wide, glyph travel [0,0]
- **Shot:** [admission-live_ready_m-1-1600.png](shots/current/admission-live_ready_m-1-1600.png)

</details>

<details><summary><b>live ladder · rung session</b> — <code>admission</code></summary>

- **Slots, in order:** head “🪪Admissions✒️Can the Founder Make Amendments at Will?🛡️Does the Fou…” → field “Any member may propose to invite someone to join the membership, and …” → commit row [top rule] “🗑️✒️🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); button 🏛️ — nothing (disabled); radio “Chosen by the Founder ✒️” (on); radio “Choose this”; radio “Choose this”
- **Strings:** head “Any member may propose to invite someone to join the membership, but all members must agree 🏛️.Chosen by the Founder ✒️” · standing “Any member may propose to invite someone to join the membership, but all members must agree 🏛️.” · notes “I am changing this because…” · options “Any member may propose to invite someone to join the member…” “Any member may invite someone to join the membership at wil…”
- **All visible text:** 🪪Admissions✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Any member may propose to invite someone to join the membership, but all members must agree 🏛️.Chosen by the Founder ✒️Any member may propose to invite someone to join the membership, and the membership decides ✏️.Choose thisAny member may invite someone to join the membership at will ✒️.Choose thisWhy are you changing this?ABAsh …
- **Tab and rail:** tab 🪪A, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×558px at x 478, radius 8, border 0; at 390 306×632px, page 390px wide, glyph travel [0,0]
- **Shot:** [admission-live_session_founder-1600.png](shots/current/admission-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closing</b> — <code>admission</code></summary>

- **Slots, in order:** head “🪪Admissions✒️Can the Founder Make Amendments at Will?🛡️Does the Fou…” → field “Any member may propose to invite someone to join the membership, and …” → commit row [top rule] “🗑️✒️🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); button 🏛️ — nothing (disabled); radio “Chosen by the Founder ✒️” (on); radio “Choose this”; radio “Choose this”
- **Strings:** head “Any member may propose to invite someone to join the membership, but all members must agree 🏛️.Chosen by the Founder ✒️” · standing “Any member may propose to invite someone to join the membership, but all members must agree 🏛️.” · notes “I am changing this because…” · options “Any member may propose to invite someone to join the member…” “Any member may invite someone to join the membership at wil…”
- **All visible text:** 🪪Admissions✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Any member may propose to invite someone to join the membership, but all members must agree 🏛️.Chosen by the Founder ✒️Any member may propose to invite someone to join the membership, and the membership decides ✏️.Choose thisAny member may invite someone to join the membership at will ✒️.Choose thisWhy are you changing this?ABAsh …
- **Tab and rail:** tab 🪪A, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×558px at x 478, radius 8, border 0; at 390 306×632px, page 390px wide, glyph travel [0,0]
- **Shot:** [admission-live_session_founder-1600.png](shots/current/admission-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closed</b> — <code>admission</code></summary>

- **Slots, in order:** head “🪪Admissions✒️Can the Founder Make Amendments at Will?🛡️Does the Fou…” → field “Set toAny member may propose to invite someone to join the membership…” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; radio “Chosen by the Founder ✒️” (on)
- **Strings:** head “Any member may propose to invite someone to join the membership, but all members must agree 🏛️.Chosen by the Founder ✒️” · standing “Any member may propose to invite someone to join the membership, but all members must agree 🏛️.” · lockline “Set by the founder when the document was made.” · notes “Set by the founder when the document was made.”
- **All visible text:** 🪪Admissions✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Any member may propose to invite someone to join the membership, but all members must agree 🏛️.Chosen by the Founder ✒️Set toAny member may propose to invite someone to join the membership, but all members must agree 🏛️.Set by the founder when the document was made.🗑️
- **Tab and rail:** tab 🪪A, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×318px at x 478, radius 8, border 0; at 390 306×408px, page 390px wide, glyph travel [0,0]
- **Shot:** [admission-live_closed_founder-1600.png](shots/current/admission-live_closed_founder-1600.png)

</details>

### `applications` — 🤝 Applications

Rules: §9 🤝. Keys: `applications`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| founding, unanswered (founder) · rail 🤝 | 1 | [applications-founding-1600.png](shots/current/applications-founding-1600.png) | [applications-founding-390.png](shots/current/applications-founding-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail 🤝 | 1 | [applications-founding-1600.png](shots/current/applications-founding-1600.png) | [applications-answers-390.png](shots/current/applications-answers-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| settled by ⏩ + seeded motions — the founder | 1 | [applications-settled-1600.png](shots/current/applications-settled-1600.png) | [applications-settled-390.png](shots/current/applications-settled-390.png) | 🗑️ · 🏛️ | — | 0, 0 |
| settled + seeded — a member (seat 1, the mover) | 1 | [applications-settled-1600.png](shots/current/applications-settled-1600.png) | [applications-seat_1-390.png](shots/current/applications-seat_1-390.png) | 🗑️ · 🏛️ | — | 0, 0 |
| founding, handed to the membership and collecting · rail 🤝 | 1 | [applications-delegated-1600.png](shots/current/applications-delegated-1600.png) | [applications-delegated-390.png](shots/current/applications-delegated-390.png) | 🗑️ · ✒️ | — | — |
| the session fixture, band cards (&band=1) | 1 | [applications-sessionband-1600.png](shots/current/applications-sessionband-1600.png) | [applications-sessionband-390.png](shots/current/applications-sessionband-390.png) | 🗑️ · 🏛️ | — | 0, 0 |
| the closed page, band cards (&closed=1&band=1) | 1 | [applications-closedband-1600.png](shots/current/applications-closedband-1600.png) | [applications-closedband-390.png](shots/current/applications-closedband-390.png) | 🗑️ | — | 0, 0 |
| live ladder · rung ready | 1 | [applications-live_ready_m-1-1600.png](shots/current/applications-live_ready_m-1-1600.png) | [applications-live_ready_m-1-390.png](shots/current/applications-live_ready_m-1-390.png) | 🗑️ | — | 0, 0 |
| live ladder · rung session | 1 | [applications-live_session_founder-1600.png](shots/current/applications-live_session_founder-1600.png) | [applications-live_session_founder-390.png](shots/current/applications-live_session_founder-390.png) | 🗑️ · ✒️ · 🏛️ | — | 0, 0 |
| live ladder · rung closing | 1 | [applications-live_session_founder-1600.png](shots/current/applications-live_session_founder-1600.png) | [applications-live_closing_founder-390.png](shots/current/applications-live_closing_founder-390.png) | 🗑️ · ✒️ · 🏛️ | — | 0, 0 |
| live ladder · rung closed | 1 | [applications-live_closed_founder-1600.png](shots/current/applications-live_closed_founder-1600.png) | [applications-live_closed_founder-390.png](shots/current/applications-live_closed_founder-390.png) | 🗑️ | — | 0, 0 |

<details><summary><b>founding, unanswered (founder) · rail 🤝</b> — <code>applications</code></summary>

- **Slots, in order:** head “🤝Can Strangers Apply?✒️Can the Founder Make Amendments at Will?🛡️Do…” → field “New members may only join by invitation.Choose thisAnyone with the li…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”
- **Strings:** options “New members may only join by invitation.” “Anyone with the link may apply to become a member.” “The membership will decide whether new members may only joi…”
- **All visible text:** 🤝Can Strangers Apply?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?New members may only join by invitation.Choose thisAnyone with the link may apply to become a member.Choose thisThe membership will decide whether new members may only join by invitation or whether anyone with the link may apply.Choose this🗑️✒️
- **Tab and rail:** tab 🤝C, glyph travel [0,0], clause travel [0,17]; rail 🤝 “🤝Can Strangers Apply?”
- **Geometry:** 652×394px at x 478, radius 8, border 0; at 390 306×493px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [applications-founding-1600.png](shots/current/applications-founding-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail 🤝</b> — <code>applications</code></summary>

- **Slots, in order:** head “🤝Can Strangers Apply?✒️Can the Founder Make Amendments at Will?🛡️Do…” → field “New members may only join by invitation.Choose thisAnyone with the li…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”
- **Strings:** options “New members may only join by invitation.” “Anyone with the link may apply to become a member.” “The membership will decide whether new members may only joi…”
- **All visible text:** 🤝Can Strangers Apply?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?New members may only join by invitation.Choose thisAnyone with the link may apply to become a member.Choose thisThe membership will decide whether new members may only join by invitation or whether anyone with the link may apply.Choose this🗑️✒️
- **Tab and rail:** tab 🤝C, glyph travel [0,0], clause travel [0,17]; rail 🤝 “🤝Can Strangers Apply?”
- **Geometry:** 652×394px at x 478, radius 8, border 0; at 390 306×493px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [applications-founding-1600.png](shots/current/applications-founding-1600.png)

</details>

<details><summary><b>settled by ⏩ + seeded motions — the founder</b> — <code>applications</code></summary>

- **Slots, in order:** head “🤝ApplicationsNew members may only join by invitation.Chosen by the m…” → field “Anyone with the link may apply to become a member.Propose this” → commit row [top rule] “🗑️🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Discard this motion; button 🏛️ — nothing (disabled); radio “Chosen by the membership” (on); radio “Propose this”
- **Strings:** head “New members may only join by invitation.Chosen by the membership” · standing “New members may only join by invitation.” · notes “We should change this because…” · options “Anyone with the link may apply to become a member.”
- **All visible text:** 🤝ApplicationsNew members may only join by invitation.Chosen by the membershipAnyone with the link may apply to become a member.Propose this🗑️🏛️
- **Tab and rail:** tab 🤝A, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×358px at x 478, radius 8, border 0; at 390 306×408px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [applications-settled-1600.png](shots/current/applications-settled-1600.png)

</details>

<details><summary><b>settled + seeded — a member (seat 1, the mover)</b> — <code>applications</code></summary>

- **Slots, in order:** head “🤝ApplicationsNew members may only join by invitation.Chosen by the m…” → field “Anyone with the link may apply to become a member.Propose this” → commit row [top rule] “🗑️🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Discard this motion; button 🏛️ — nothing (disabled); radio “Chosen by the membership” (on); radio “Propose this”
- **Strings:** head “New members may only join by invitation.Chosen by the membership” · standing “New members may only join by invitation.” · notes “We should change this because…” · options “Anyone with the link may apply to become a member.”
- **All visible text:** 🤝ApplicationsNew members may only join by invitation.Chosen by the membershipAnyone with the link may apply to become a member.Propose this🗑️🏛️
- **Tab and rail:** tab 🤝A, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×358px at x 478, radius 8, border 0; at 390 306×408px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [applications-settled-1600.png](shots/current/applications-settled-1600.png)

</details>

<details><summary><b>founding, handed to the membership and collecting · rail 🤝</b> — <code>applications</code></summary>

- **Slots, in order:** head “🤝Can Strangers Apply?✒️Can the Founder Make Amendments at Will?🛡️Do…” → field “New members may only join by invitation.Choose thisAnyone with the li…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Set it; radio “Choose this”; radio “Choose this”; radio “Chosen” (on)
- **Strings:** options “New members may only join by invitation.” “Anyone with the link may apply to become a member.” “The membership will decide whether new members may only joi…”
- **All visible text:** 🤝Can Strangers Apply?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?New members may only join by invitation.Choose thisAnyone with the link may apply to become a member.Choose thisThe membership will decide whether new members may only join by invitation or whether anyone with the link may apply.Chosen🗑️✒️
- **Tab and rail:** tab 🤝C, glyph travel null, clause travel null; rail 🤝 “🤝Can Strangers Apply?”
- **Geometry:** 652×394px at x 478, radius 8, border 0; at 390 306×493px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [applications-delegated-1600.png](shots/current/applications-delegated-1600.png)

</details>

<details><summary><b>the session fixture, band cards (&band=1)</b> — <code>applications</code></summary>

- **Slots, in order:** head “🤝ApplicationsNew members may only join by invitation.Chosen by the m…” → field “Anyone with the link may apply to become a member.Propose this” → commit row [top rule] “🗑️🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Discard this motion; button 🏛️ — nothing (disabled); radio “Chosen by the membership” (on); radio “Propose this”
- **Strings:** head “New members may only join by invitation.Chosen by the membership” · standing “New members may only join by invitation.” · notes “We should change this because…” · options “Anyone with the link may apply to become a member.”
- **All visible text:** 🤝ApplicationsNew members may only join by invitation.Chosen by the membershipAnyone with the link may apply to become a member.Propose this🗑️🏛️
- **Tab and rail:** tab 🤝A, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×358px at x 478, radius 8, border 0; at 390 306×408px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [applications-sessionband-1600.png](shots/current/applications-sessionband-1600.png)

</details>

<details><summary><b>the closed page, band cards (&closed=1&band=1)</b> — <code>applications</code></summary>

- **Slots, in order:** head “🤝ApplicationsNew members may only join by invitation.Chosen by the m…” → field “You propose like anybody, and nothing comes to you for assent. Pickin…” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; radio “Chosen by the membership” (on); radio “Choose this”
- **Strings:** head “New members may only join by invitation.Chosen by the membership” · standing “New members may only join by invitation.” · notes “You propose like anybody, and nothing comes to you for assent. Picking a value here takes…” · options “Anyone with the link may apply to become a member.”
- **All visible text:** 🤝ApplicationsNew members may only join by invitation.Chosen by the membershipYou propose like anybody, and nothing comes to you for assent. Picking a value here takes it back.Anyone with the link may apply to become a member.Choose this🗑️
- **Tab and rail:** tab 🤝A, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×316px at x 478, radius 8, border 0; at 390 306×383px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [applications-closedband-1600.png](shots/current/applications-closedband-1600.png)

</details>

<details><summary><b>live ladder · rung ready</b> — <code>applications</code></summary>

- **Slots, in order:** head “🤝Applications✒️Can the Founder Make Amendments at Will?🛡️Does the F…” → field “Set toAnyone with the link may apply to become a member.Set by the fo…” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; radio “Chosen by the Founder ✒️” (on)
- **Strings:** head “Anyone with the link may apply to become a member.Chosen by the Founder ✒️” · standing “Anyone with the link may apply to become a member.” · lockline “Set by the founder when the document was made.” · notes “Set by the founder when the document was made.”
- **All visible text:** 🤝Applications✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Anyone with the link may apply to become a member.Chosen by the Founder ✒️Set toAnyone with the link may apply to become a member.Set by the founder when the document was made.🗑️
- **Tab and rail:** tab 🤝A, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×270px at x 478, radius 8, border 0; at 390 306×335px, page 390px wide, glyph travel [0,0]
- **Shot:** [applications-live_ready_m-1-1600.png](shots/current/applications-live_ready_m-1-1600.png)

</details>

<details><summary><b>live ladder · rung session</b> — <code>applications</code></summary>

- **Slots, in order:** head “🤝Applications✒️Can the Founder Make Amendments at Will?🛡️Does the F…” → field “New members may only join by invitation.Choose thisWhy are you changi…” → commit row [top rule] “🗑️✒️🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); button 🏛️ — nothing (disabled); radio “Chosen by the Founder ✒️” (on); radio “Choose this”
- **Strings:** head “Anyone with the link may apply to become a member.Chosen by the Founder ✒️” · standing “Anyone with the link may apply to become a member.” · notes “I am changing this because…” · options “New members may only join by invitation.”
- **All visible text:** 🤝Applications✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Anyone with the link may apply to become a member.Chosen by the Founder ✒️New members may only join by invitation.Choose thisWhy are you changing this?ABAsh Bellamy 👑🗑️✒️🏛️
- **Tab and rail:** tab 🤝A, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×417px at x 478, radius 8, border 0; at 390 306×467px, page 390px wide, glyph travel [0,0]
- **Shot:** [applications-live_session_founder-1600.png](shots/current/applications-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closing</b> — <code>applications</code></summary>

- **Slots, in order:** head “🤝Applications✒️Can the Founder Make Amendments at Will?🛡️Does the F…” → field “New members may only join by invitation.Choose thisWhy are you changi…” → commit row [top rule] “🗑️✒️🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); button 🏛️ — nothing (disabled); radio “Chosen by the Founder ✒️” (on); radio “Choose this”
- **Strings:** head “Anyone with the link may apply to become a member.Chosen by the Founder ✒️” · standing “Anyone with the link may apply to become a member.” · notes “I am changing this because…” · options “New members may only join by invitation.”
- **All visible text:** 🤝Applications✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Anyone with the link may apply to become a member.Chosen by the Founder ✒️New members may only join by invitation.Choose thisWhy are you changing this?ABAsh Bellamy 👑🗑️✒️🏛️
- **Tab and rail:** tab 🤝A, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×417px at x 478, radius 8, border 0; at 390 306×467px, page 390px wide, glyph travel [0,0]
- **Shot:** [applications-live_session_founder-1600.png](shots/current/applications-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closed</b> — <code>applications</code></summary>

- **Slots, in order:** head “🤝Applications✒️Can the Founder Make Amendments at Will?🛡️Does the F…” → field “Set toAnyone with the link may apply to become a member.Set by the fo…” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; radio “Chosen by the Founder ✒️” (on)
- **Strings:** head “Anyone with the link may apply to become a member.Chosen by the Founder ✒️” · standing “Anyone with the link may apply to become a member.” · lockline “Set by the founder when the document was made.” · notes “Set by the founder when the document was made.”
- **All visible text:** 🤝Applications✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Anyone with the link may apply to become a member.Chosen by the Founder ✒️Set toAnyone with the link may apply to become a member.Set by the founder when the document was made.🗑️
- **Tab and rail:** tab 🤝A, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×270px at x 478, radius 8, border 0; at 390 306×335px, page 390px wide, glyph travel [0,0]
- **Shot:** [applications-live_closed_founder-1600.png](shots/current/applications-live_closed_founder-1600.png)

</details>

### `hat` — 🎩

Rules: §9 🎩, CP9, CP11. Keys: `hat`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| founding, unanswered (founder) · rail 🎩 | 1 | [hat-founding-1600.png](shots/current/hat-founding-1600.png) | [hat-founding-390.png](shots/current/hat-founding-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail 🎩 | 1 | [hat-founding-1600.png](shots/current/hat-founding-1600.png) | [hat-answers-390.png](shots/current/hat-answers-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| settled by ⏩ + seeded motions — the founder | 1 | [hat-settled-1600.png](shots/current/hat-settled-1600.png) | [hat-settled-390.png](shots/current/hat-settled-390.png) | 🗑️ · OK | — | 0, 0 |
| settled + seeded — a member (seat 1, the mover) | 1 | [hat-seat_1-1600.png](shots/current/hat-seat_1-1600.png) | [hat-seat_1-390.png](shots/current/hat-seat_1-390.png) | 🗑️ | — | 0, 0 |
| the session fixture, band cards (&band=1) | 1 | [hat-sessionband-1600.png](shots/current/hat-sessionband-1600.png) | [hat-sessionband-390.png](shots/current/hat-sessionband-390.png) | 🗑️ · OK | — | 0, 0 |
| the closed page, band cards (&closed=1&band=1) | 1 | [hat-closedband-1600.png](shots/current/hat-closedband-1600.png) | [hat-closedband-390.png](shots/current/hat-closedband-390.png) | 🗑️ · OK | — | 0, 0 |
| live ladder · rung ready | 1 | [hat-live_ready_m-1-1600.png](shots/current/hat-live_ready_m-1-1600.png) | [hat-live_ready_m-1-390.png](shots/current/hat-live_ready_m-1-390.png) | 🗑️ | — | 0, 0 |
| live ladder · rung session | 1 | [hat-live_session_founder-1600.png](shots/current/hat-live_session_founder-1600.png) | [hat-live_session_founder-390.png](shots/current/hat-live_session_founder-390.png) | 🗑️ · OK | — | 0, 0 |
| live ladder · rung closing | 1 | [hat-live_session_founder-1600.png](shots/current/hat-live_session_founder-1600.png) | [hat-live_session_founder-390.png](shots/current/hat-live_session_founder-390.png) | 🗑️ · OK | — | 0, 0 |
| live ladder · rung closed | 1 | [hat-live_session_founder-1600.png](shots/current/hat-live_session_founder-1600.png) | [hat-live_closed_founder-390.png](shots/current/hat-live_closed_founder-390.png) | 🗑️ · OK | — | 0, 0 |

<details><summary><b>founding, unanswered (founder) · rail 🎩</b> — <code>hat</code></summary>

- **Slots, in order:** head “🎩Is the Founder a Member?” → field “The Founder is part of the membership.Choose thisThe Founder is not p…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”
- **Strings:** options “The Founder is part of the membership.” “The Founder is not part of the membership.”
- **All visible text:** 🎩Is the Founder a Member?The Founder is part of the membership.Choose thisThe Founder is not part of the membership.Choose this🗑️✒️
- **Tab and rail:** tab 🎩I, glyph travel [0,0], clause travel [0,20]; rail 🎩 “🎩Is the Founder a Member?”
- **Geometry:** 652×274px at x 478, radius 8, border 0; at 390 306×324px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [hat-founding-1600.png](shots/current/hat-founding-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail 🎩</b> — <code>hat</code></summary>

- **Slots, in order:** head “🎩Is the Founder a Member?” → field “The Founder is part of the membership.Choose thisThe Founder is not p…” → commit row [top rule] “🗑️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); radio “Choose this”; radio “Choose this”
- **Strings:** options “The Founder is part of the membership.” “The Founder is not part of the membership.”
- **All visible text:** 🎩Is the Founder a Member?The Founder is part of the membership.Choose thisThe Founder is not part of the membership.Choose this🗑️✒️
- **Tab and rail:** tab 🎩I, glyph travel [0,0], clause travel [0,20]; rail 🎩 “🎩Is the Founder a Member?”
- **Geometry:** 652×274px at x 478, radius 8, border 0; at 390 306×324px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [hat-founding-1600.png](shots/current/hat-founding-1600.png)

</details>

<details><summary><b>settled by ⏩ + seeded motions — the founder</b> — <code>hat</code></summary>

- **Slots, in order:** head “🎩Founder’s Membership” → field “The Founder is part of the membership.ChosenThe Founder is not part o…” → commit row [top rule] “🗑️OK”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close; radio “Chosen” (on); radio “Choose this”
- **Strings:** —
- **All visible text:** 🎩Founder’s MembershipThe Founder is part of the membership.ChosenThe Founder is not part of the membership.Choose this🗑️OK
- **Tab and rail:** tab 🎩F, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×274px at x 478, radius 8, border 0; at 390 306×324px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [hat-settled-1600.png](shots/current/hat-settled-1600.png)

</details>

<details><summary><b>settled + seeded — a member (seat 1, the mover)</b> — <code>hat</code></summary>

- **Slots, in order:** head “🎩Founder’s Membership” → field “The Founder is part of the membership.ChosenThe Founder is not part o…” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; radio “Chosen” (on); radio “Choose this”
- **Strings:** —
- **All visible text:** 🎩Founder’s MembershipThe Founder is part of the membership.ChosenThe Founder is not part of the membership.Choose this🗑️
- **Tab and rail:** tab 🎩F, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×274px at x 478, radius 8, border 0; at 390 306×324px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [hat-seat_1-1600.png](shots/current/hat-seat_1-1600.png)

</details>

<details><summary><b>the session fixture, band cards (&band=1)</b> — <code>hat</code></summary>

- **Slots, in order:** head “🎩Founder’s Membership” → field “The Founder is part of the membership.ChosenThe Founder is not part o…” → commit row [top rule] “🗑️OK”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close; radio “Chosen” (on); radio “Choose this”
- **Strings:** —
- **All visible text:** 🎩Founder’s MembershipThe Founder is part of the membership.ChosenThe Founder is not part of the membership.Choose this🗑️OK
- **Tab and rail:** tab 🎩F, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×274px at x 478, radius 8, border 0; at 390 306×324px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [hat-sessionband-1600.png](shots/current/hat-sessionband-1600.png)

</details>

<details><summary><b>the closed page, band cards (&closed=1&band=1)</b> — <code>hat</code></summary>

- **Slots, in order:** head “🎩Founder’s Membership” → field “The Founder is part of the membership.ChosenThe Founder is not part o…” → commit row [top rule] “🗑️OK”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close; radio “Chosen” (on); radio “Choose this”
- **Strings:** —
- **All visible text:** 🎩Founder’s MembershipThe Founder is part of the membership.ChosenThe Founder is not part of the membership.Choose this🗑️OK
- **Tab and rail:** tab 🎩F, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×274px at x 478, radius 8, border 0; at 390 306×324px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [hat-closedband-1600.png](shots/current/hat-closedband-1600.png)

</details>

<details><summary><b>live ladder · rung ready</b> — <code>hat</code></summary>

- **Slots, in order:** head “🎩Founder’s Membership” → field “The Founder is part of the membership.ChosenThe Founder is not part o…” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; radio “Chosen” (on); radio “Choose this”
- **Strings:** —
- **All visible text:** 🎩Founder’s MembershipThe Founder is part of the membership.ChosenThe Founder is not part of the membership.Choose this🗑️
- **Tab and rail:** tab 🎩F, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×274px at x 478, radius 8, border 0; at 390 306×324px, page 390px wide, glyph travel [0,0]
- **Shot:** [hat-live_ready_m-1-1600.png](shots/current/hat-live_ready_m-1-1600.png)

</details>

<details><summary><b>live ladder · rung session</b> — <code>hat</code></summary>

- **Slots, in order:** head “🎩Founder’s Membership” → field “The Founder is part of the membership.ChosenThe Founder is not part o…” → commit row [top rule] “🗑️OK”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close; radio “Chosen” (on); radio “Choose this”
- **Strings:** —
- **All visible text:** 🎩Founder’s MembershipThe Founder is part of the membership.ChosenThe Founder is not part of the membership.Choose this🗑️OK
- **Tab and rail:** tab 🎩F, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×274px at x 478, radius 8, border 0; at 390 306×324px, page 390px wide, glyph travel [0,0]
- **Shot:** [hat-live_session_founder-1600.png](shots/current/hat-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closing</b> — <code>hat</code></summary>

- **Slots, in order:** head “🎩Founder’s Membership” → field “The Founder is part of the membership.ChosenThe Founder is not part o…” → commit row [top rule] “🗑️OK”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close; radio “Chosen” (on); radio “Choose this”
- **Strings:** —
- **All visible text:** 🎩Founder’s MembershipThe Founder is part of the membership.ChosenThe Founder is not part of the membership.Choose this🗑️OK
- **Tab and rail:** tab 🎩F, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×274px at x 478, radius 8, border 0; at 390 306×324px, page 390px wide, glyph travel [0,0]
- **Shot:** [hat-live_session_founder-1600.png](shots/current/hat-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closed</b> — <code>hat</code></summary>

- **Slots, in order:** head “🎩Founder’s Membership” → field “The Founder is part of the membership.ChosenThe Founder is not part o…” → commit row [top rule] “🗑️OK”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close; radio “Chosen” (on); radio “Choose this”
- **Strings:** —
- **All visible text:** 🎩Founder’s MembershipThe Founder is part of the membership.ChosenThe Founder is not part of the membership.Choose this🗑️OK
- **Tab and rail:** tab 🎩F, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×274px at x 478, radius 8, border 0; at 390 306×324px, page 390px wide, glyph travel [0,0]
- **Shot:** [hat-live_session_founder-1600.png](shots/current/hat-live_session_founder-1600.png)

</details>

### `blind-answer` — blind answer (member)

Rules: §9 blind answer, Q1175, C4, Q1182. Keys: `ans-chamber`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| founding, 🌍 delegated → the founder’s own answer card · rail 🌍 | 1 | [ans-chamber-answers-1600.png](shots/current/ans-chamber-answers-1600.png) | [ans-chamber-answers-390.png](shots/current/ans-chamber-answers-390.png) | 🗑️ · 🏛️ | — | — |

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail 🌍</b> — <code>ans-chamber</code></summary>

- **Slots, in order:** head “🌍Who Can See the Document?🌍Who Can See the Document?✒️Can the Found…” → field “This is your answer to this question as a member.The document can onl…” → commit row [top rule] “🗑️🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🏛️ — nothing (disabled); radio “Prefer this”; radio “Prefer this”
- **Strings:** options “The document can only be seen by members.” “The document can be seen by anyone with the link.”
- **All visible text:** 🌍Who Can See the Document?🌍Who Can See the Document?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?This is your answer to this question as a member.The document can only be seen by members.Prefer thisThe document can be seen by anyone with the link.Prefer this🗑️🏛️
- **Tab and rail:** tab 🌍W, glyph travel null, clause travel null; rail 🌍 “🌍Who Can See the Document?”
- **Geometry:** 652×319px at x 478, radius 8, border 0; at 390 306×386px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [ans-chamber-answers-1600.png](shots/current/ans-chamber-answers-1600.png)

</details>

## Power cards ✒️ 🛡️

### `power` — power cards ✒️ 🛡️

Rules: §9 power cards, Q1430, Q1404, CP9, T6. Keys: `pw:u:title` `pw:a:title` `pw:u:slug` `pw:a:slug` `pw:u:chamber` `pw:a:chamber` `pw:u:invite` `pw:a:invite` `pw:u:remove` `pw:a:remove` `pw:u:rate` `pw:a:rate`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| settled by ⏩ + seeded motions — the founder | 12 | [pw_u_title-settled-1600.png](shots/current/pw_u_title-settled-1600.png) | [pw_u_title-settled-390.png](shots/current/pw_u_title-settled-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| settled + seeded — a member (seat 1, the mover) | 12 | [pw_u_title-seat_1-1600.png](shots/current/pw_u_title-seat_1-1600.png) | [pw_u_title-seat_1-390.png](shots/current/pw_u_title-seat_1-390.png) | 🗑️ · OK | — | 0, 0 |
| settled + seeded — a stranger at the door | 8 | [pw_u_title-seat_1-1600.png](shots/current/pw_u_title-seat_1-1600.png) | [pw_u_title-seat_1-390.png](shots/current/pw_u_title-seat_1-390.png) | 🗑️ · OK | — | 0, 0 |
| the session fixture, band cards (&band=1) | 12 | [pw_u_title-sessionband-1600.png](shots/current/pw_u_title-sessionband-1600.png) | [pw_u_title-sessionband-390.png](shots/current/pw_u_title-sessionband-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| the closed page, band cards (&closed=1&band=1) | 12 | [pw_u_title-closedband-1600.png](shots/current/pw_u_title-closedband-1600.png) | [pw_u_title-closedband-390.png](shots/current/pw_u_title-closedband-390.png) | 🗑️ · OK | — | 0, 0 |

<details><summary><b>settled by ⏩ + seeded motions — the founder</b> — <code>pw:u:title</code></summary>

- **Slots, in order:** head “🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder …” → field [top rule] “The Founder may not amend the title at will.One way — it cannot be ta…” → commit row [top rule] “🗑️✒️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Set it; radio “Choose this”
- **Strings:** head “The Founder may amend the title at will.” · notes “One way — it cannot be taken back.” · options “Choose this”
- **All visible text:** 🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The Founder may amend the title at will.The Founder may not amend the title at will.One way — it cannot be taken back.Choose this🗑️✒️
- **Tab and rail:** tab ✒️C, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×266px at x 478, radius 8, border 0; at 390 306×316px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [pw_u_title-settled-1600.png](shots/current/pw_u_title-settled-1600.png) · same state: `pw:u:title` `pw:a:title` `pw:u:slug` `pw:a:slug` `pw:u:chamber` `pw:a:chamber` `pw:u:invite` `pw:a:invite` `pw:u:remove` `pw:a:remove` `pw:u:rate` `pw:a:rate`

</details>

<details><summary><b>settled + seeded — a member (seat 1, the mover)</b> — <code>pw:u:title</code></summary>

- **Slots, in order:** head “🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder …” → commit row [top rule] “🗑️OK”
- **Dividers:** head | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close
- **Strings:** head “The Founder may amend the title at will.”
- **All visible text:** 🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The Founder may amend the title at will.🗑️OK
- **Tab and rail:** tab ✒️C, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×130px at x 478, radius 8, border 0; at 390 306×155px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [pw_u_title-seat_1-1600.png](shots/current/pw_u_title-seat_1-1600.png) · same state: `pw:u:title` `pw:a:title` `pw:u:slug` `pw:a:slug` `pw:u:chamber` `pw:a:chamber` `pw:u:invite` `pw:a:invite` `pw:u:remove` `pw:a:remove` `pw:u:rate` `pw:a:rate`

</details>

<details><summary><b>settled + seeded — a stranger at the door</b> — <code>pw:u:title</code></summary>

- **Slots, in order:** head “🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder …” → commit row [top rule] “🗑️OK”
- **Dividers:** head | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close
- **Strings:** head “The Founder may amend the title at will.”
- **All visible text:** 🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The Founder may amend the title at will.🗑️OK
- **Tab and rail:** tab ✒️C, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×130px at x 478, radius 8, border 0; at 390 306×155px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [pw_u_title-seat_1-1600.png](shots/current/pw_u_title-seat_1-1600.png) · same state: `pw:u:title` `pw:a:title` `pw:u:slug` `pw:a:slug` `pw:u:chamber` `pw:a:chamber` `pw:u:rate` `pw:a:rate`

</details>

<details><summary><b>the session fixture, band cards (&band=1)</b> — <code>pw:u:title</code></summary>

- **Slots, in order:** head “🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder …” → field [top rule] “The Founder may not amend the title at will.One way — it cannot be ta…” → commit row [top rule] “🗑️✒️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Set it; radio “Choose this”
- **Strings:** head “The Founder may amend the title at will.” · notes “One way — it cannot be taken back.” · options “Choose this”
- **All visible text:** 🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The Founder may amend the title at will.The Founder may not amend the title at will.One way — it cannot be taken back.Choose this🗑️✒️
- **Tab and rail:** tab ✒️C, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×266px at x 478, radius 8, border 0; at 390 306×316px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [pw_u_title-sessionband-1600.png](shots/current/pw_u_title-sessionband-1600.png) · same state: `pw:u:title` `pw:a:title` `pw:u:slug` `pw:a:slug` `pw:u:chamber` `pw:a:chamber` `pw:u:invite` `pw:a:invite` `pw:u:remove` `pw:a:remove` `pw:u:rate` `pw:a:rate`

</details>

<details><summary><b>the closed page, band cards (&closed=1&band=1)</b> — <code>pw:u:title</code></summary>

- **Slots, in order:** head “🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder …” → commit row [top rule] “🗑️OK”
- **Dividers:** head | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close
- **Strings:** head “The Founder may amend the title at will.”
- **All visible text:** 🪶Title✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The Founder may amend the title at will.🗑️OK
- **Tab and rail:** tab ✒️C, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×130px at x 478, radius 8, border 0; at 390 306×155px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [pw_u_title-closedband-1600.png](shots/current/pw_u_title-closedband-1600.png) · same state: `pw:u:title` `pw:a:title` `pw:u:slug` `pw:a:slug` `pw:u:chamber` `pw:a:chamber` `pw:u:invite` `pw:a:invite` `pw:u:remove` `pw:a:remove` `pw:u:rate` `pw:a:rate`

</details>

## Motions and 👑 questions

### `motion-constitutional` — constitutional motion (consent)

Rules: §9 consent, Q1182, Q1377, CP2. Keys: `mo:mo-4` `mo:mo-5` `mo:mo-3` `mo:mo-2`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| settled by ⏩ + seeded motions — the founder · rail 👤 | 1 | [mo_mo-4-settled-1600.png](shots/current/mo_mo-4-settled-1600.png) | [mo_mo-4-settled-390.png](shots/current/mo_mo-4-settled-390.png) | 🗑️ | — | — |
| settled + seeded — a member (seat 1, the mover) · rail ⏱️ | 1 | [mo_mo-5-seat_1-1600.png](shots/current/mo_mo-5-seat_1-1600.png) | [mo_mo-5-seat_1-390.png](shots/current/mo_mo-5-seat_1-390.png) | 🗑️ | — | — |
| settled + seeded — a member (seat 1, the mover) · rail 👤 | 1 | [mo_mo-4-seat_1-1600.png](shots/current/mo_mo-4-seat_1-1600.png) | [mo_mo-4-seat_1-390.png](shots/current/mo_mo-4-seat_1-390.png) | 🗑️ · 🏛️ | — | — |
| settled + seeded — a stranger at the door | 3 | [mo_mo-3-seat_stranger-1600.png](shots/current/mo_mo-3-seat_stranger-1600.png) | [mo_mo-3-seat_stranger-390.png](shots/current/mo_mo-3-seat_stranger-390.png) | 🗑️ · OK | — | 0, 0 |
| the session fixture, band cards (&band=1) · rail 👥 | 1 | [mo_mo-4-sessionband-1600.png](shots/current/mo_mo-4-sessionband-1600.png) | [mo_mo-4-sessionband-390.png](shots/current/mo_mo-4-sessionband-390.png) | 🗑️ · 🏛️ | — | — |
| live ladder · rung session · rail ⏱️ | 1 | [mo_mo-2-live_session_m-2-1600.png](shots/current/mo_mo-2-live_session_m-2-1600.png) | [mo_mo-2-live_session_m-2-390.png](shots/current/mo_mo-2-live_session_m-2-390.png) | 🗑️ | — | — |
| live ladder · rung closing · rail ⏱️ | 1 | [mo_mo-2-live_session_m-2-1600.png](shots/current/mo_mo-2-live_session_m-2-1600.png) | [mo_mo-2-live_session_m-2-390.png](shots/current/mo_mo-2-live_session_m-2-390.png) | 🗑️ | — | — |

<details><summary><b>settled by ⏩ + seeded motions — the founder · rail 👤</b> — <code>mo:mo-4</code></summary>

- **Slots, in order:** head “👤Anonymous ProposalsAre Proposals Anonymous?” → field “All proposals are made anonymously.All proposals are made anonymously…” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Withdraw it — your 🏛️ comes back whole; radio “”; radio “Proposed” (on)
- **Strings:** —
- **All visible text:** 👤Anonymous ProposalsAre Proposals Anonymous?All proposals are made anonymously.All proposals are made anonymously, and all names are revealed at the end.Names put pressure on people; the writing should stand alone.Proposed🗑️
- **Tab and rail:** tab Are, glyph travel null, clause travel null; rail 👤 “👤 → named at the closeNames put pressure on people; the writing should stand a…”
- **Geometry:** 652×323px at x 478, radius 8, border 0; at 390 306×387px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [mo_mo-4-settled-1600.png](shots/current/mo_mo-4-settled-1600.png)

</details>

<details><summary><b>settled + seeded — a member (seat 1, the mover) · rail ⏱️</b> — <code>mo:mo-5</code></summary>

- **Slots, in order:** head “⏱️Proposal RateYour proposal did not pass: a new proposal every 90 mi…” → field “Members may make a new proposal ✏️ every 3 hours.Members may make a n…” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Withdraw it — the ✏️ comes back in full; radio “”; radio “Proposed” (on)
- **Strings:** —
- **All visible text:** ⏱️Proposal RateYour proposal did not pass: a new proposal every 90 minutesSet the Proposal Rate✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Members may make a new proposal ✏️ every 3 hours.Members may make a new proposal ✏️ every 6 hours.Fewer, better proposals — let the wait be longer.Proposed🗑️
- **Tab and rail:** tab Set, glyph travel null, clause travel null; rail ⏱️ “⏱️ → 6 hoursFewer, better proposals — let the wait be longer.”
- **Geometry:** 652×298px at x 478, radius 8, border 0; at 390 306×362px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [mo_mo-5-seat_1-1600.png](shots/current/mo_mo-5-seat_1-1600.png)

</details>

<details><summary><b>settled + seeded — a member (seat 1, the mover) · rail 👤</b> — <code>mo:mo-4</code></summary>

- **Slots, in order:** head “👤Anonymous Proposals👤Are Proposals Anonymous?” → field “All proposals are made anonymously.Prefer thisAll proposals are made …” → commit row [top rule] “🗑️🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🏛️ — nothing (disabled); radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** options “All proposals are made anonymously.” “All proposals are made anonymously, and all names are revea…” “Indifferent”
- **All visible text:** 👤Anonymous Proposals👤Are Proposals Anonymous?All proposals are made anonymously.Prefer thisAll proposals are made anonymously, and all names are revealed at the end.Names put pressure on people; the writing should stand alone.Prefer thisIndifferent🗑️🏛️
- **Tab and rail:** tab 👤A, glyph travel null, clause travel null; rail 👤 “👤→ named at the closeNames put pressure on people; the writing should stand al…”
- **Geometry:** 652×395px at x 478, radius 8, border 0; at 390 306×460px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [mo_mo-4-seat_1-1600.png](shots/current/mo_mo-4-seat_1-1600.png)

</details>

<details><summary><b>settled + seeded — a stranger at the door</b> — <code>mo:mo-3</code></summary>

- **Slots, in order:** head “🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Fou…” → commit row [top rule] “🗑️OK”
- **Dividers:** head | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close
- **Strings:** head “Visibility”
- **All visible text:** 🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?🌍VisibilityChanged by the Founder: Anyone with the linkVisibility🗑️OK
- **Tab and rail:** tab 🌍V, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×176px at x 478, radius 8, border 0; at 390 306×176px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [mo_mo-3-seat_stranger-1600.png](shots/current/mo_mo-3-seat_stranger-1600.png) · same state: `mo:mo-3` `mo:mo-5` `mo:mo-4`

</details>

<details><summary><b>the session fixture, band cards (&band=1) · rail 👥</b> — <code>mo:mo-4</code></summary>

- **Slots, in order:** head “👥Quorum👥Choose the Quorum” → field “A proposal ✏️ cannot pass until it is preferred by at least 33% of th…” → commit row [top rule] “🗑️🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🏛️ — nothing (disabled); radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** options “A proposal ✏️ cannot pass until it is preferred by at least…” “A proposal ✏️ cannot pass until it is preferred by at least…” “Indifferent”
- **All visible text:** 👥Quorum👥Choose the QuorumA proposal ✏️ cannot pass until it is preferred by at least 33% of the membership (2 of 3).Prefer thisA proposal ✏️ cannot pass until it is preferred by at least 2 members.A third of three is one person. Two is the least that is still a decision.Prefer thisIndifferent🗑️🏛️
- **Tab and rail:** tab 👥C, glyph travel null, clause travel null; rail 👥 “👥→ 2A third of three is one person. Two is the least that is still a decision.”
- **Geometry:** 652×395px at x 478, radius 8, border 0; at 390 306×460px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [mo_mo-4-sessionband-1600.png](shots/current/mo_mo-4-sessionband-1600.png)

</details>

<details><summary><b>live ladder · rung session · rail ⏱️</b> — <code>mo:mo-2</code></summary>

- **Slots, in order:** head “⏱️Proposal RateSet the Proposal Rate✒️Can the Founder Make Amendments…” → field “Members may make a new proposal ✏️ every 11 minutes.Members may make …” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Withdraw it — the ✏️ comes back in full; radio “”; radio “Proposed” (on)
- **Strings:** —
- **All visible text:** ⏱️Proposal RateSet the Proposal Rate✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Members may make a new proposal ✏️ every 11 minutes.Members may make a new proposal ✏️ every 11 minutes.Two more ✏️ to start with — the first hour is the busy one.Proposed🗑️
- **Tab and rail:** tab Set, glyph travel null, clause travel null; rail ⏱️ “⏱️ → 11 minutesTwo more ✏️ to start with — the first hour is the busy one.”
- **Geometry:** 652×298px at x 478, radius 8, border 0; at 390 306×362px, page 390px wide
- **Shot:** [mo_mo-2-live_session_m-2-1600.png](shots/current/mo_mo-2-live_session_m-2-1600.png)

</details>

<details><summary><b>live ladder · rung closing · rail ⏱️</b> — <code>mo:mo-2</code></summary>

- **Slots, in order:** head “⏱️Proposal RateSet the Proposal Rate✒️Can the Founder Make Amendments…” → field “Members may make a new proposal ✏️ every 11 minutes.Members may make …” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Withdraw it — the ✏️ comes back in full; radio “”; radio “Proposed” (on)
- **Strings:** —
- **All visible text:** ⏱️Proposal RateSet the Proposal Rate✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Members may make a new proposal ✏️ every 11 minutes.Members may make a new proposal ✏️ every 11 minutes.Two more ✏️ to start with — the first hour is the busy one.Proposed🗑️
- **Tab and rail:** tab Set, glyph travel null, clause travel null; rail ⏱️ “⏱️ → 11 minutesTwo more ✏️ to start with — the first hour is the busy one.”
- **Geometry:** 652×298px at x 478, radius 8, border 0; at 390 306×362px, page 390px wide
- **Shot:** [mo_mo-2-live_session_m-2-1600.png](shots/current/mo_mo-2-live_session_m-2-1600.png)

</details>

### `motion-ordinary` — ordinary motion (a race card)

Rules: §9 ordinary motion, Q1331, Q1460. Keys: `mo:mo-5` `mo:mo-3` `mo:mo-2`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| settled by ⏩ + seeded motions — the founder · rail ⏱️ | 1 | [mo_mo-5-settled-1600.png](shots/current/mo_mo-5-settled-1600.png) | [mo_mo-5-settled-390.png](shots/current/mo_mo-5-settled-390.png) | 🗑️ · ? | — | — |
| the session fixture, band cards (&band=1) · rail ⏱️ | 1 | [mo_mo-3-sessionband-1600.png](shots/current/mo_mo-3-sessionband-1600.png) | [mo_mo-3-sessionband-390.png](shots/current/mo_mo-3-sessionband-390.png) | 🗑️ · ? | — | — |
| the closed page, band cards (&closed=1&band=1) | 1 | [mo_mo-3-closedband-1600.png](shots/current/mo_mo-3-closedband-1600.png) | [mo_mo-3-sessionband-390.png](shots/current/mo_mo-3-sessionband-390.png) | 🗑️ · ? | — | 0, 0 |
| live ladder · rung session · rail ⏱️ | 1 | [mo_mo-2-live_session_founder-1600.png](shots/current/mo_mo-2-live_session_founder-1600.png) | [mo_mo-2-live_session_founder-390.png](shots/current/mo_mo-2-live_session_founder-390.png) | 🗑️ · ? | — | — |
| live ladder · rung closing · rail ⏱️ | 1 | [mo_mo-2-live_session_founder-1600.png](shots/current/mo_mo-2-live_session_founder-1600.png) | [mo_mo-2-live_session_founder-390.png](shots/current/mo_mo-2-live_session_founder-390.png) | 🗑️ · ? | — | — |

<details><summary><b>settled by ⏩ + seeded motions — the founder · rail ⏱️</b> — <code>mo:mo-5</code></summary>

- **Slots, in order:** head “⏱️Proposal Rate⏱️Set the Proposal Rate✒️Can the Founder Make Amendmen…” → field “Members may make a new proposal ✏️ every 3 hours.Prefer thisMembers m…” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — nothing (disabled); radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** options “Members may make a new proposal ✏️ every 3 hours.” “Members may make a new proposal ✏️ every 6 hours.Fewer, bet…” “Indifferent”
- **All visible text:** ⏱️Proposal Rate⏱️Set the Proposal Rate✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Rejected: a new proposal every 90 minutesMembers may make a new proposal ✏️ every 3 hours.Prefer thisMembers may make a new proposal ✏️ every 6 hours.Fewer, better proposals — let the wait be longer.Prefer thisIndifferent🗑️
- **Tab and rail:** tab ⏱️S, glyph travel null, clause travel null; rail ⏱️ “⏱️→ 6 hoursFewer, better proposals — let the wait be longer.”
- **Geometry:** 652×371px at x 478, radius 8, border 0; at 390 306×435px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [mo_mo-5-settled-1600.png](shots/current/mo_mo-5-settled-1600.png)

</details>

<details><summary><b>the session fixture, band cards (&band=1) · rail ⏱️</b> — <code>mo:mo-3</code></summary>

- **Slots, in order:** head “⏱️Proposal Rate⏱️Set the Proposal Rate✒️Can the Founder Make Amendmen…” → field “Members may make a new proposal ✏️ every 45 minutes.Prefer thisMember…” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — nothing (disabled); radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** options “Members may make a new proposal ✏️ every 45 minutes.” “Members may make a new proposal ✏️ every 30 minutes.Half an…” “Indifferent”
- **All visible text:** ⏱️Proposal Rate⏱️Set the Proposal Rate✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Passed: a new proposal every 2 hoursPassed: a new proposal every hourChanged by the Founder: a new proposal every 45 minutesMembers may make a new proposal ✏️ every 45 minutes.Prefer thisMembers may make a new proposal ✏️ every 30 minutes.Half an hour, for the last day, when everybody is finally reading.Pr…
- **Tab and rail:** tab ⏱️S, glyph travel null, clause travel null; rail ⏱️ “⏱️→ 30 minutesHalf an hour, for the last day, when everybody is finally reading.”
- **Geometry:** 652×371px at x 478, radius 8, border 0; at 390 306×435px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [mo_mo-3-sessionband-1600.png](shots/current/mo_mo-3-sessionband-1600.png)

</details>

<details><summary><b>the closed page, band cards (&closed=1&band=1)</b> — <code>mo:mo-3</code></summary>

- **Slots, in order:** head “⏱️Proposal Rate⏱️Set the Proposal Rate✒️Can the Founder Make Amendmen…” → field “Members may make a new proposal ✏️ every 45 minutes.Prefer thisMember…” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — nothing (disabled); radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** options “Members may make a new proposal ✏️ every 45 minutes.” “Members may make a new proposal ✏️ every 30 minutes.Half an…” “Indifferent”
- **All visible text:** ⏱️Proposal Rate⏱️Set the Proposal Rate✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Passed: a new proposal every 2 hoursPassed: a new proposal every hourChanged by the Founder: a new proposal every 45 minutesMembers may make a new proposal ✏️ every 45 minutes.Prefer thisMembers may make a new proposal ✏️ every 30 minutes.Half an hour, for the last day, when everybody is finally reading.Pr…
- **Tab and rail:** tab ⏱️S, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×371px at x 478, radius 8, border 0; at 390 306×435px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [mo_mo-3-closedband-1600.png](shots/current/mo_mo-3-closedband-1600.png)

</details>

<details><summary><b>live ladder · rung session · rail ⏱️</b> — <code>mo:mo-2</code></summary>

- **Slots, in order:** head “⏱️Proposal Rate⏱️Set the Proposal Rate✒️Can the Founder Make Amendmen…” → field “Members may make a new proposal ✏️ every 11 minutes.Prefer thisMember…” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — nothing (disabled); radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** options “Members may make a new proposal ✏️ every 11 minutes.” “Members may make a new proposal ✏️ every 11 minutes.Two mor…” “Indifferent”
- **All visible text:** ⏱️Proposal Rate⏱️Set the Proposal Rate✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Members may make a new proposal ✏️ every 11 minutes.Prefer thisMembers may make a new proposal ✏️ every 11 minutes.Two more ✏️ to start with — the first hour is the busy one.Prefer thisIndifferent🗑️
- **Tab and rail:** tab ⏱️S, glyph travel null, clause travel null; rail ⏱️ “⏱️→ 11 minutesTwo more ✏️ to start with — the first hour is the busy one.”
- **Geometry:** 652×371px at x 478, radius 8, border 0; at 390 306×435px, page 390px wide
- **Shot:** [mo_mo-2-live_session_founder-1600.png](shots/current/mo_mo-2-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closing · rail ⏱️</b> — <code>mo:mo-2</code></summary>

- **Slots, in order:** head “⏱️Proposal Rate⏱️Set the Proposal Rate✒️Can the Founder Make Amendmen…” → field “Members may make a new proposal ✏️ every 11 minutes.Prefer thisMember…” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — nothing (disabled); radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** options “Members may make a new proposal ✏️ every 11 minutes.” “Members may make a new proposal ✏️ every 11 minutes.Two mor…” “Indifferent”
- **All visible text:** ⏱️Proposal Rate⏱️Set the Proposal Rate✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Members may make a new proposal ✏️ every 11 minutes.Prefer thisMembers may make a new proposal ✏️ every 11 minutes.Two more ✏️ to start with — the first hour is the busy one.Prefer thisIndifferent🗑️
- **Tab and rail:** tab ⏱️S, glyph travel null, clause travel null; rail ⏱️ “⏱️→ 11 minutesTwo more ✏️ to start with — the first hour is the busy one.”
- **Geometry:** 652×371px at x 478, radius 8, border 0; at 390 306×435px, page 390px wide
- **Shot:** [mo_mo-2-live_session_founder-1600.png](shots/current/mo_mo-2-live_session_founder-1600.png)

</details>

### `crown` — 👑 question

Rules: §9 👑, CP5, Q1154, Q1475. Keys: `mo:mo-3` `mo:mo-5`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| settled by ⏩ + seeded motions — the founder · rail 🌍 | 1 | [mo_mo-3-settled-1600.png](shots/current/mo_mo-3-settled-1600.png) | [mo_mo-3-settled-390.png](shots/current/mo_mo-3-settled-390.png) | 🗑️ · 🛡️ · ✒️ | — | — |
| live ladder · rung session · rail 🥾 | 1 | [mo_mo-5-live_session_founder-1600.png](shots/current/mo_mo-5-live_session_founder-1600.png) | [mo_mo-5-live_session_founder-390.png](shots/current/mo_mo-5-live_session_founder-390.png) | 🗑️ · 🛡️ · ✒️ | — | — |
| live ladder · rung closing · rail 🥾 | 1 | [mo_mo-5-live_session_founder-1600.png](shots/current/mo_mo-5-live_session_founder-1600.png) | [mo_mo-5-live_session_founder-390.png](shots/current/mo_mo-5-live_session_founder-390.png) | 🗑️ · 🛡️ · ✒️ | — | — |

<details><summary><b>settled by ⏩ + seeded motions — the founder · rail 🌍</b> — <code>mo:mo-3</code></summary>

- **Slots, in order:** head “🌍Visibility🌍Who Can See the Document?✒️Can the Founder Make Amendme…” → field “The document can be seen by anyone with the link.The document can onl…” → commit row [top rule] “🗑️🛡️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🛡️ — Refuse — the Founder Veto holds it, and what stands stands; button ✒️ — Accept — a Founder Action passes it now; radio “Chosen by the membership” (on)
- **Strings:** —
- **All visible text:** 🌍Visibility🌍Who Can See the Document?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Changed by the Founder: Anyone with the linkThe document can be seen by anyone with the link.The document can only be seen by members.Chosen by the membershipWho reads the document should be the membership’s call.🗑️🛡️✒️
- **Tab and rail:** tab 🌍W, glyph travel null, clause travel null; rail 🌍 “🌍→ members onlyWho reads the document should be the membership’s call.”
- **Geometry:** 652×263px at x 478, radius 8, border 0; at 390 306×327px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [mo_mo-3-settled-1600.png](shots/current/mo_mo-3-settled-1600.png)

</details>

<details><summary><b>live ladder · rung session · rail 🥾</b> — <code>mo:mo-5</code></summary>

- **Slots, in order:** head “🥾Removals🥾How Is a Member Removed?✒️Can the Founder Make Amendments…” → field “To remove a member, all members apart from them must agree 🏛️.To rem…” → commit row [top rule] “🗑️🛡️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🛡️ — Refuse — the Founder Veto holds it, and what stands stands; button ✒️ — Accept — a Founder Action passes it now; radio “Chosen by the membership” (on)
- **Strings:** —
- **All visible text:** 🥾Removals🥾How Is a Member Removed?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?To remove a member, all members apart from them must agree 🏛️.To remove a member, all members must agree 🏛️.Chosen by the membershipNobody should be able to vote themselves out in a huff.🗑️🛡️✒️
- **Tab and rail:** tab 🥾H, glyph travel null, clause travel null; rail 🥾 “🥾→ all agree, them includedNobody should be able to vote themselves out in a h…”
- **Geometry:** 652×263px at x 478, radius 8, border 0; at 390 306×327px, page 390px wide
- **Shot:** [mo_mo-5-live_session_founder-1600.png](shots/current/mo_mo-5-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closing · rail 🥾</b> — <code>mo:mo-5</code></summary>

- **Slots, in order:** head “🥾Removals🥾How Is a Member Removed?✒️Can the Founder Make Amendments…” → field “To remove a member, all members apart from them must agree 🏛️.To rem…” → commit row [top rule] “🗑️🛡️✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🛡️ — Refuse — the Founder Veto holds it, and what stands stands; button ✒️ — Accept — a Founder Action passes it now; radio “Chosen by the membership” (on)
- **Strings:** —
- **All visible text:** 🥾Removals🥾How Is a Member Removed?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?To remove a member, all members apart from them must agree 🏛️.To remove a member, all members must agree 🏛️.Chosen by the membershipNobody should be able to vote themselves out in a huff.🗑️🛡️✒️
- **Tab and rail:** tab 🥾H, glyph travel null, clause travel null; rail 🥾 “🥾→ all agree, them includedNobody should be able to vote themselves out in a h…”
- **Geometry:** 652×263px at x 478, radius 8, border 0; at 390 306×327px, page 390px wide
- **Shot:** [mo_mo-5-live_session_founder-1600.png](shots/current/mo_mo-5-live_session_founder-1600.png)

</details>

### `crown-other` — 👑 question, for anybody but the Founder

Rules: §9 👑 other, Q1475. Keys: `mo:mo-3` `mo:mo-5`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| settled + seeded — a member (seat 1, the mover) · rail 🌍 | 1 | [mo_mo-3-seat_1-1600.png](shots/current/mo_mo-3-seat_1-1600.png) | [mo_mo-3-seat_1-390.png](shots/current/mo_mo-3-seat_1-390.png) | 🗑️ | — | — |
| live ladder · rung session · rail 🥾 | 1 | [mo_mo-5-live_session_m-1-1600.png](shots/current/mo_mo-5-live_session_m-1-1600.png) | [mo_mo-5-live_session_m-1-390.png](shots/current/mo_mo-5-live_session_m-1-390.png) | 🗑️ | — | — |
| live ladder · rung closing · rail 🥾 | 1 | [mo_mo-5-live_session_m-1-1600.png](shots/current/mo_mo-5-live_session_m-1-1600.png) | [mo_mo-5-live_session_m-1-390.png](shots/current/mo_mo-5-live_session_m-1-390.png) | 🗑️ | — | — |

<details><summary><b>settled + seeded — a member (seat 1, the mover) · rail 🌍</b> — <code>mo:mo-3</code></summary>

- **Slots, in order:** head “🌍VisibilityWho Can See the Document?✒️Can the Founder Make Amendment…” → field “The document can be seen by anyone with the link.The document can onl…” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; radio “Chosen by the membership” (on)
- **Strings:** —
- **All visible text:** 🌍VisibilityWho Can See the Document?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Changed by the Founder: Anyone with the linkThe document can be seen by anyone with the link.The document can only be seen by members.Chosen by the membershipWho reads the document should be the membership’s call.🗑️
- **Tab and rail:** tab Who, glyph travel null, clause travel null; rail 🌍 “🌍 → members onlyWho reads the document should be the membership’s call.”
- **Geometry:** 652×263px at x 478, radius 8, border 0; at 390 306×327px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [mo_mo-3-seat_1-1600.png](shots/current/mo_mo-3-seat_1-1600.png)

</details>

<details><summary><b>live ladder · rung session · rail 🥾</b> — <code>mo:mo-5</code></summary>

- **Slots, in order:** head “🥾RemovalsHow Is a Member Removed?✒️Can the Founder Make Amendments a…” → field “To remove a member, all members apart from them must agree 🏛️.To rem…” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; radio “Chosen by the membership” (on)
- **Strings:** —
- **All visible text:** 🥾RemovalsHow Is a Member Removed?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?To remove a member, all members apart from them must agree 🏛️.To remove a member, all members must agree 🏛️.Chosen by the membershipNobody should be able to vote themselves out in a huff.🗑️
- **Tab and rail:** tab How, glyph travel null, clause travel null; rail 🥾 “🥾 → all agree, them includedNobody should be able to vote themselves out in a …”
- **Geometry:** 652×263px at x 478, radius 8, border 0; at 390 306×327px, page 390px wide
- **Shot:** [mo_mo-5-live_session_m-1-1600.png](shots/current/mo_mo-5-live_session_m-1-1600.png)

</details>

<details><summary><b>live ladder · rung closing · rail 🥾</b> — <code>mo:mo-5</code></summary>

- **Slots, in order:** head “🥾RemovalsHow Is a Member Removed?✒️Can the Founder Make Amendments a…” → field “To remove a member, all members apart from them must agree 🏛️.To rem…” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; radio “Chosen by the membership” (on)
- **Strings:** —
- **All visible text:** 🥾RemovalsHow Is a Member Removed?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?To remove a member, all members apart from them must agree 🏛️.To remove a member, all members must agree 🏛️.Chosen by the membershipNobody should be able to vote themselves out in a huff.🗑️
- **Tab and rail:** tab How, glyph travel null, clause travel null; rail 🥾 “🥾 → all agree, them includedNobody should be able to vote themselves out in a …”
- **Geometry:** 652×263px at x 478, radius 8, border 0; at 390 306×327px, page 390px wide
- **Shot:** [mo_mo-5-live_session_m-1-1600.png](shots/current/mo_mo-5-live_session_m-1-1600.png)

</details>

### `crown-text` — 👑 question (the Text)

Rules: §9 👑 Text, CP5. Keys: `crown:cq-4`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| live ladder · rung session | 1 | [crown_cq-4-live_session_founder-1600.png](shots/current/crown_cq-4-live_session_founder-1600.png) | [crown_cq-4-live_session_founder-390.png](shots/current/crown_cq-4-live_session_founder-390.png) | 🗑️ · 🛡️ · ✒️ | — | 0, 32.97 |
| live ladder · rung closing | 1 | [crown_cq-4-live_session_founder-1600.png](shots/current/crown_cq-4-live_session_founder-1600.png) | [crown_cq-4-live_closing_founder-390.png](shots/current/crown_cq-4-live_closing_founder-390.png) | 🗑️ · 🛡️ · ✒️ | — | 0, 32.97 |

<details><summary><b>live ladder · rung session</b> — <code>crown:cq-4</code></summary>

- **Slots, in order:** head “The clause as it standsThe Purse-holder pays the bills and reimburses…” → field [top rule] “ProposedThe Purse-holder spends within a termly budget agreed by the …” → other “The membership passed this. Until you answer, the clause above stands.” → commit row [top rule] “🗑️🛡️✒️”
- **Dividers:** head | field; other | commit row
- **Controls:** button 🗑️ — Close — the question stays pending; button 🛡️ — Refuse — the Founder Veto holds it, and the clause above stands; button ✒️ — Accept — a Founder Action passes it now
- **Strings:** eyebrow “The clause as it stands” · head “The Purse-holder pays the bills and reimburses what seems fair, and keeps the receipts in the tin.”
- **All visible text:** The clause as it standsThe Purse-holder pays the bills and reimburses what seems fair, and keeps the receipts in the tin.ProposedThe Purse-holder spends within a termly budget agreed by the house, keeps an itemised book open to any member, and reports at each house meeting.A budget the house agreed and a book anyone may open. Not bureaucracy — just the difference between our money and their money.The membership pass…
- **Tab and rail:** tab —, glyph travel [0,32.97], clause travel [12,38.97]; rail  “‘pays the…’ or ‘spends within…’A budget the house agreed and a book anyone may …”
- **Geometry:** 652×341px at x 478, radius 8, border 0; at 390 306×493px, page 390px wide, glyph travel [0,32.97]
- **Shot:** [crown_cq-4-live_session_founder-1600.png](shots/current/crown_cq-4-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closing</b> — <code>crown:cq-4</code></summary>

- **Slots, in order:** head “The clause as it standsThe Purse-holder pays the bills and reimburses…” → field [top rule] “ProposedThe Purse-holder spends within a termly budget agreed by the …” → other “The membership passed this. Until you answer, the clause above stands.” → commit row [top rule] “🗑️🛡️✒️”
- **Dividers:** head | field; other | commit row
- **Controls:** button 🗑️ — Close — the question stays pending; button 🛡️ — Refuse — the Founder Veto holds it, and the clause above stands; button ✒️ — Accept — a Founder Action passes it now
- **Strings:** eyebrow “The clause as it stands” · head “The Purse-holder pays the bills and reimburses what seems fair, and keeps the receipts in the tin.”
- **All visible text:** The clause as it standsThe Purse-holder pays the bills and reimburses what seems fair, and keeps the receipts in the tin.ProposedThe Purse-holder spends within a termly budget agreed by the house, keeps an itemised book open to any member, and reports at each house meeting.A budget the house agreed and a book anyone may open. Not bureaucracy — just the difference between our money and their money.The membership pass…
- **Tab and rail:** tab —, glyph travel [0,32.97], clause travel [12,38.97]; rail  “‘pays the…’ or ‘spends within…’A budget the house agreed and a book anyone may …”
- **Geometry:** 652×341px at x 478, radius 8, border 0; at 390 306×493px, page 390px wide, glyph travel [0,32.97]
- **Shot:** [crown_cq-4-live_session_founder-1600.png](shots/current/crown_cq-4-live_session_founder-1600.png)

</details>

## News, grants, gates, park

### `park` — park ⏳ (news; E36)

Rules: §9 park, E36, E37. Keys: `park-accounts` `park:r:c10`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| the session fixture (Hollow Oak) · deciding | 1 | [park-accounts-charter-1600.png](shots/current/park-accounts-charter-1600.png) | [park-accounts-charter-390.png](shots/current/park-accounts-charter-390.png) | OK | — | 0, 90.97 |
| the closed page (fixture &closed=1) · deciding | 1 | [park-accounts-closed-1600.png](shots/current/park-accounts-closed-1600.png) | [park-accounts-closed-390.png](shots/current/park-accounts-closed-390.png) | OK | — | 0, 90.97 |
| live ladder · rung session | 1 | [park_r_c10-live_session_m-1-1600.png](shots/current/park_r_c10-live_session_m-1-1600.png) | [park_r_c10-live_session_m-1-390.png](shots/current/park_r_c10-live_session_m-1-390.png) | OK | — | 0, 32.97 |
| live ladder · rung closing | 1 | [park_r_c10-live_session_m-1-1600.png](shots/current/park_r_c10-live_session_m-1-1600.png) | [park_r_c10-live_closing_m-1-390.png](shots/current/park_r_c10-live_closing_m-1-390.png) | OK | — | 0, 32.97 |

<details><summary><b>the session fixture (Hollow Oak) · deciding</b> — <code>park-accounts</code></summary>

- **Slots, in order:** head “The clause as it standsThe Purse-holder keeps the accounts in whateve…” → note “Awaiting assent from the Founder 🛡️” → commit row [top rule] “OK”
- **Dividers:** note | commit row
- **Controls:** button OK — It leaves your margin and stays in the record
- **Strings:** eyebrow “The clause as it stands” · head “The Purse-holder keeps the accounts in whatever way suits them, and shows them to any member who asks.” · notes “Awaiting assent from the Founder 🛡️”
- **All visible text:** The clause as it standsThe Purse-holder keeps the accounts in whatever way suits them, and shows them to any member who asks.Awaiting assent from the Founder 🛡️OK
- **Tab and rail:** tab —, glyph travel [0,90.97], clause travel [12,38.97]; rail  “Accounts and Inspection”
- **Geometry:** 652×210px at x 478, radius 8, border 0; at 390 306×275px, page 390px wide, glyph travel [0,90.96]
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px; H2: .setnote is full --fg
- **Shot:** [park-accounts-charter-1600.png](shots/current/park-accounts-charter-1600.png)

</details>

<details><summary><b>the closed page (fixture &closed=1) · deciding</b> — <code>park-accounts</code></summary>

- **Slots, in order:** head “The clause as it standsThe Purse-holder keeps the accounts in whateve…” → note “Awaiting assent from the Founder 🛡️” → commit row [top rule] “OK”
- **Dividers:** note | commit row
- **Controls:** button OK — It leaves your margin and stays in the record
- **Strings:** eyebrow “The clause as it stands” · head “The Purse-holder keeps the accounts in whatever way suits them, and shows them to any member who asks.” · notes “Awaiting assent from the Founder 🛡️”
- **All visible text:** The clause as it standsThe Purse-holder keeps the accounts in whatever way suits them, and shows them to any member who asks.Awaiting assent from the Founder 🛡️OK
- **Tab and rail:** tab —, glyph travel [0,90.97], clause travel [12,38.97]; rail  “Accounts and Inspection”
- **Geometry:** 652×210px at x 478, radius 8, border 0; at 390 306×275px, page 390px wide, glyph travel [0,90.97]
- **card-audit:** S1: .sugg — margin-r 15.13px · margin-l 15.13px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px; H2: .setnote is full --fg
- **Shot:** [park-accounts-closed-1600.png](shots/current/park-accounts-closed-1600.png)

</details>

<details><summary><b>live ladder · rung session</b> — <code>park:r:c10</code></summary>

- **Slots, in order:** head “The clause as it standsThe Purse-holder pays the bills and reimburses…” → note “Awaiting assent from the Founder 🛡️” → commit row [top rule] “OK”
- **Dividers:** note | commit row
- **Controls:** button OK — It leaves your margin and stays in the record
- **Strings:** eyebrow “The clause as it stands” · head “The Purse-holder pays the bills and reimburses what seems fair, and keeps the receipts in the tin.” · notes “Awaiting assent from the Founder 🛡️”
- **All visible text:** The clause as it standsThe Purse-holder pays the bills and reimburses what seems fair, and keeps the receipts in the tin.Awaiting assent from the Founder 🛡️OK
- **Tab and rail:** tab —, glyph travel [0,32.97], clause travel [12,38.97]; rail  “Money”
- **Geometry:** 652×210px at x 478, radius 8, border 0; at 390 306×250px, page 390px wide, glyph travel [0,32.96]
- **Shot:** [park_r_c10-live_session_m-1-1600.png](shots/current/park_r_c10-live_session_m-1-1600.png)

</details>

<details><summary><b>live ladder · rung closing</b> — <code>park:r:c10</code></summary>

- **Slots, in order:** head “The clause as it standsThe Purse-holder pays the bills and reimburses…” → note “Awaiting assent from the Founder 🛡️” → commit row [top rule] “OK”
- **Dividers:** note | commit row
- **Controls:** button OK — It leaves your margin and stays in the record
- **Strings:** eyebrow “The clause as it stands” · head “The Purse-holder pays the bills and reimburses what seems fair, and keeps the receipts in the tin.” · notes “Awaiting assent from the Founder 🛡️”
- **All visible text:** The clause as it standsThe Purse-holder pays the bills and reimburses what seems fair, and keeps the receipts in the tin.Awaiting assent from the Founder 🛡️OK
- **Tab and rail:** tab —, glyph travel [0,32.97], clause travel [12,38.97]; rail  “Money”
- **Geometry:** 652×210px at x 478, radius 8, border 0; at 390 306×250px, page 390px wide, glyph travel [0,32.96]
- **Shot:** [park_r_c10-live_session_m-1-1600.png](shots/current/park_r_c10-live_session_m-1-1600.png)

</details>

### `failed-news` — settled motion record — mover’s unacknowledged rejection (E41)

Rules: E41, Q1447, Q1522 (6). Keys: `held:mo-2`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| settled + seeded — a member (seat 1, the mover) · rail ⏱️ | 1 | [held_mo-2-seat_1-1600.png](shots/current/held_mo-2-seat_1-1600.png) | [held_mo-2-seat_1-390.png](shots/current/held_mo-2-seat_1-390.png) | OK | — | — |

<details><summary><b>settled + seeded — a member (seat 1, the mover) · rail ⏱️</b> — <code>held:mo-2</code></summary>

- **Slots, in order:** head “⏱️Proposal RateYour proposal did not pass: a new proposal every 90 mi…” → field “Friday, 25 September, 00:21 · RejectedMembers may make a new proposal…” → commit row [top rule] “OK”
- **Dividers:** field | commit row
- **Controls:** button OK — acknowledge and close; radio “Chosen by the Founder ✒️” (on)
- **Strings:** —
- **All visible text:** ⏱️Proposal RateYour proposal did not pass: a new proposal every 90 minutesSet the Proposal Rate✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Friday, 25 September, 00:21 · RejectedMembers may make a new proposal ✏️ every 3 hours.Chosen by the Founder ✒️Rejected proposalMembers may make a new proposal ✏️ every 90 minutes.Half the wait would let people write while the thought is warm.OK
- **Tab and rail:** tab You, glyph travel null, clause travel null; rail ⏱️ “⏱️ 3 hours → 90 minutes”
- **Geometry:** 652×330px at x 478, radius 8, border 0; at 390 306×394px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [held_mo-2-seat_1-1600.png](shots/current/held_mo-2-seat_1-1600.png)

</details>

### `grant` — grants 🏛️ ✒️ 🛡️

Rules: §9 grants, Q1501, Q1502, Q1373. Keys: `grant-pen` `grant-shield` `grant-voice`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| founding, unanswered (founder) · rail ✒️ | 1 | [grant-pen-founding-1600.png](shots/current/grant-pen-founding-1600.png) | [grant-pen-founding-390.png](shots/current/grant-pen-founding-390.png) | 🗑️ · Accept ✒️ | — | 0, 0 |
| founding, unanswered (founder) · rail 🛡️ | 1 | [grant-shield-founding-1600.png](shots/current/grant-shield-founding-1600.png) | [grant-shield-founding-390.png](shots/current/grant-shield-founding-390.png) | 🗑️ · Accept 🛡️ | — | 0, 0 |
| founding, unanswered (founder) · rail 🏛️ | 1 | [grant-voice-founding-1600.png](shots/current/grant-voice-founding-1600.png) | [grant-voice-founding-390.png](shots/current/grant-voice-founding-390.png) | 🗑️ · Activate 🏛️ | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail ✒️ | 1 | [grant-pen-founding-1600.png](shots/current/grant-pen-founding-1600.png) | [grant-pen-founding-390.png](shots/current/grant-pen-founding-390.png) | 🗑️ · Accept ✒️ | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail 🛡️ | 1 | [grant-shield-founding-1600.png](shots/current/grant-shield-founding-1600.png) | [grant-shield-founding-390.png](shots/current/grant-shield-founding-390.png) | 🗑️ · Accept 🛡️ | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail 🏛️ | 1 | [grant-voice-founding-1600.png](shots/current/grant-voice-founding-1600.png) | [grant-voice-founding-390.png](shots/current/grant-voice-founding-390.png) | 🗑️ · Activate 🏛️ | — | 0, 0 |
| settled by ⏩ + seeded motions — the founder | 3 | [grant-pen-settled-1600.png](shots/current/grant-pen-settled-1600.png) | [grant-pen-settled-390.png](shots/current/grant-pen-settled-390.png) | 🗑️ · OK | — | 0, 0 |
| settled + seeded — a member (seat 1, the mover) | 1 | [grant-voice-seat_1-1600.png](shots/current/grant-voice-seat_1-1600.png) | [grant-voice-seat_1-390.png](shots/current/grant-voice-seat_1-390.png) | 🗑️ · OK | — | 0, 0 |
| the session fixture, band cards (&band=1) | 3 | [grant-pen-sessionband-1600.png](shots/current/grant-pen-sessionband-1600.png) | [grant-pen-sessionband-390.png](shots/current/grant-pen-sessionband-390.png) | 🗑️ · OK | — | 0, 0 |
| the closed page, band cards (&closed=1&band=1) | 3 | [grant-pen-sessionband-1600.png](shots/current/grant-pen-sessionband-1600.png) | [grant-pen-closedband-390.png](shots/current/grant-pen-closedband-390.png) | 🗑️ · OK | — | 0, 0 |
| live ladder · rung constitution · rail ✒️ | 1 | [grant-pen-live_constitution_founder-1600.png](shots/current/grant-pen-live_constitution_founder-1600.png) | [grant-pen-live_constitution_founder-390.png](shots/current/grant-pen-live_constitution_founder-390.png) | 🗑️ · Accept ✒️ | — | 0, 0 |
| live ladder · rung constitution · rail 🏛️ | 1 | [grant-voice-live_constitution_founder-1600.png](shots/current/grant-voice-live_constitution_founder-1600.png) | [grant-voice-live_constitution_founder-390.png](shots/current/grant-voice-live_constitution_founder-390.png) | 🗑️ · Activate 🏛️ | — | — |
| live ladder · rung ready · rail ✒️ | 1 | [grant-pen-live_constitution_founder-1600.png](shots/current/grant-pen-live_constitution_founder-1600.png) | [grant-pen-live_ready_founder-390.png](shots/current/grant-pen-live_ready_founder-390.png) | 🗑️ · Accept ✒️ | — | 0, 0 |
| live ladder · rung ready · rail 🏛️ | 1 | [grant-voice-live_constitution_founder-1600.png](shots/current/grant-voice-live_constitution_founder-1600.png) | [grant-voice-live_ready_founder-390.png](shots/current/grant-voice-live_ready_founder-390.png) | 🗑️ · Activate 🏛️ | — | — |
| live ladder · rung session · rail ✒️ | 1 | [grant-pen-live_session_founder-1600.png](shots/current/grant-pen-live_session_founder-1600.png) | [grant-pen-live_session_founder-390.png](shots/current/grant-pen-live_session_founder-390.png) | 🗑️ · Accept ✒️ | — | 0, 0 |
| live ladder · rung session · rail 🛡️ | 1 | [grant-shield-live_session_founder-1600.png](shots/current/grant-shield-live_session_founder-1600.png) | [grant-shield-live_session_founder-390.png](shots/current/grant-shield-live_session_founder-390.png) | 🗑️ · Accept 🛡️ | — | — |
| live ladder · rung session · rail 🏛️ | 1 | [grant-voice-live_session_founder-1600.png](shots/current/grant-voice-live_session_founder-1600.png) | [grant-voice-live_session_founder-390.png](shots/current/grant-voice-live_session_founder-390.png) | 🗑️ · Activate 🏛️ | — | — |
| live ladder · rung closing · rail ✒️ | 1 | [grant-pen-live_session_founder-1600.png](shots/current/grant-pen-live_session_founder-1600.png) | [grant-pen-live_session_founder-390.png](shots/current/grant-pen-live_session_founder-390.png) | 🗑️ · Accept ✒️ | — | 0, 0 |
| live ladder · rung closing · rail 🛡️ | 1 | [grant-shield-live_session_founder-1600.png](shots/current/grant-shield-live_session_founder-1600.png) | [grant-shield-live_session_founder-390.png](shots/current/grant-shield-live_session_founder-390.png) | 🗑️ · Accept 🛡️ | — | — |
| live ladder · rung closing · rail 🏛️ | 1 | [grant-voice-live_session_founder-1600.png](shots/current/grant-voice-live_session_founder-1600.png) | [grant-voice-live_session_founder-390.png](shots/current/grant-voice-live_session_founder-390.png) | 🗑️ · Activate 🏛️ | — | — |
| live ladder · rung closing | 1 | [grant-voice-live_closing_m-1-1600.png](shots/current/grant-voice-live_closing_m-1-1600.png) | [grant-voice-live_closing_m-1-390.png](shots/current/grant-voice-live_closing_m-1-390.png) | 🗑️ · Activate 🏛️ | — | 0, 0 |
| live ladder · rung closed | 2 | [grant-pen-live_closed_founder-1600.png](shots/current/grant-pen-live_closed_founder-1600.png) | [grant-pen-live_closed_founder-390.png](shots/current/grant-pen-live_closed_founder-390.png) | 🗑️ · Accept ✒️ | — | 0, 0 |

<details><summary><b>founding, unanswered (founder) · rail ✒️</b> — <code>grant-pen</code></summary>

- **Slots, in order:** head “✒️Founder Actions🏛️Activate Your Membership” → field “As the founder of this document, you have the power to change setting…” → commit row [top rule] “🗑️Accept ✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button Accept ✒️ — (untitled)
- **Strings:** notes “As the founder of this document, you have the power to change settings and edit the docum…”
- **All visible text:** ✒️Founder Actions🏛️Activate Your MembershipAs the founder of this document, you have the power to change settings and edit the document at will. Founder Actions are denoted by ✒️. You can give up these powers later if you choose to.🗑️Accept ✒️
- **Tab and rail:** tab ✒️F, glyph travel [0,0], clause travel [0,17]; rail ✒️ “✒️Founder Actions”
- **Geometry:** 652×195px at x 478, radius 8, border 0; at 390 306×270px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [grant-pen-founding-1600.png](shots/current/grant-pen-founding-1600.png)

</details>

<details><summary><b>founding, unanswered (founder) · rail 🛡️</b> — <code>grant-shield</code></summary>

- **Slots, in order:** head “🛡️Founder Veto🏛️Activate Your Membership✒️Founder Actions” → field “As the founder of this document, you have the power to veto choices t…” → commit row [top rule] “🗑️Accept 🛡️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button Accept 🛡️ — (untitled)
- **Strings:** notes “As the founder of this document, you have the power to veto choices that the membership m…”
- **All visible text:** 🛡️Founder Veto🏛️Activate Your Membership✒️Founder ActionsAs the founder of this document, you have the power to veto choices that the membership make. Founder Veto is denoted by 🛡️. You can give up this power later if you choose to.🗑️Accept 🛡️
- **Tab and rail:** tab 🛡️, glyph travel [0,0], clause travel [0,17]; rail 🛡️ “🛡️Founder Veto”
- **Geometry:** 652×195px at x 478, radius 8, border 0; at 390 306×245px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [grant-shield-founding-1600.png](shots/current/grant-shield-founding-1600.png)

</details>

<details><summary><b>founding, unanswered (founder) · rail 🏛️</b> — <code>grant-voice</code></summary>

- **Slots, in order:** head “🏛️Activate Your Membership✒️Founder Actions🛡️Founder Veto” → field “A 🏛️ is a constitutional proposal: one at a time, returned whole, pa…” → commit row [top rule] “🗑️Activate 🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button Activate 🏛️ — (untitled)
- **Strings:** notes “A 🏛️ is a constitutional proposal: one at a time, returned whole, passing only when all …”
- **All visible text:** 🏛️Activate Your Membership✒️Founder Actions🛡️Founder VetoA 🏛️ is a constitutional proposal: one at a time, returned whole, passing only when all members agree. You are already a member; activating it opens every question, proposal and vote on the rules.🗑️Activate 🏛️
- **Tab and rail:** tab 🏛️, glyph travel [0,0], clause travel [0,17]; rail 🏛️ “🏛️Activate Your Membership”
- **Geometry:** 652×195px at x 478, radius 8, border 0; at 390 306×270px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [grant-voice-founding-1600.png](shots/current/grant-voice-founding-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail ✒️</b> — <code>grant-pen</code></summary>

- **Slots, in order:** head “✒️Founder Actions🏛️Activate Your Membership” → field “As the founder of this document, you have the power to change setting…” → commit row [top rule] “🗑️Accept ✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button Accept ✒️ — (untitled)
- **Strings:** notes “As the founder of this document, you have the power to change settings and edit the docum…”
- **All visible text:** ✒️Founder Actions🏛️Activate Your MembershipAs the founder of this document, you have the power to change settings and edit the document at will. Founder Actions are denoted by ✒️. You can give up these powers later if you choose to.🗑️Accept ✒️
- **Tab and rail:** tab ✒️F, glyph travel [0,0], clause travel [0,17]; rail ✒️ “✒️Founder Actions”
- **Geometry:** 652×195px at x 478, radius 8, border 0; at 390 306×270px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [grant-pen-founding-1600.png](shots/current/grant-pen-founding-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail 🛡️</b> — <code>grant-shield</code></summary>

- **Slots, in order:** head “🛡️Founder Veto🏛️Activate Your Membership✒️Founder Actions” → field “As the founder of this document, you have the power to veto choices t…” → commit row [top rule] “🗑️Accept 🛡️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button Accept 🛡️ — (untitled)
- **Strings:** notes “As the founder of this document, you have the power to veto choices that the membership m…”
- **All visible text:** 🛡️Founder Veto🏛️Activate Your Membership✒️Founder ActionsAs the founder of this document, you have the power to veto choices that the membership make. Founder Veto is denoted by 🛡️. You can give up this power later if you choose to.🗑️Accept 🛡️
- **Tab and rail:** tab 🛡️, glyph travel [0,0], clause travel [0,17]; rail 🛡️ “🛡️Founder Veto”
- **Geometry:** 652×195px at x 478, radius 8, border 0; at 390 306×245px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [grant-shield-founding-1600.png](shots/current/grant-shield-founding-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail 🏛️</b> — <code>grant-voice</code></summary>

- **Slots, in order:** head “🏛️Activate Your Membership✒️Founder Actions🛡️Founder Veto” → field “A 🏛️ is a constitutional proposal: one at a time, returned whole, pa…” → commit row [top rule] “🗑️Activate 🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button Activate 🏛️ — (untitled)
- **Strings:** notes “A 🏛️ is a constitutional proposal: one at a time, returned whole, passing only when all …”
- **All visible text:** 🏛️Activate Your Membership✒️Founder Actions🛡️Founder VetoA 🏛️ is a constitutional proposal: one at a time, returned whole, passing only when all members agree. You are already a member; activating it opens every question, proposal and vote on the rules.🗑️Activate 🏛️
- **Tab and rail:** tab 🏛️, glyph travel [0,0], clause travel [0,17]; rail 🏛️ “🏛️Activate Your Membership”
- **Geometry:** 652×195px at x 478, radius 8, border 0; at 390 306×270px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [grant-voice-founding-1600.png](shots/current/grant-voice-founding-1600.png)

</details>

<details><summary><b>settled by ⏩ + seeded motions — the founder</b> — <code>grant-pen</code></summary>

- **Slots, in order:** head “✒️Founder Actions🛡️Founder Veto🏛️Activate Your Membership” → field “As the founder of this document, you have the power to change setting…” → commit row [top rule] “🗑️OK”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close
- **Strings:** notes “As the founder of this document, you have the power to change settings and edit the docum…”
- **All visible text:** ✒️Founder Actions🛡️Founder Veto🏛️Activate Your MembershipAs the founder of this document, you have the power to change settings and edit the document at will. Founder Actions are denoted by ✒️. You can give up these powers later if you choose to.🗑️OK
- **Tab and rail:** tab ✒️F, glyph travel [0,0], clause travel [0,17]; rail no entry
- **Geometry:** 652×195px at x 478, radius 8, border 0; at 390 306×270px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [grant-pen-settled-1600.png](shots/current/grant-pen-settled-1600.png) · same state: `grant-pen` `grant-shield` `grant-voice`

</details>

<details><summary><b>settled + seeded — a member (seat 1, the mover)</b> — <code>grant-voice</code></summary>

- **Slots, in order:** head “🏛️Activate Your Membership” → field “The Founder invited you into the membership, and Constitutional Propo…” → commit row [top rule] “🗑️OK”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close
- **Strings:** notes “The Founder invited you into the membership, and Constitutional Proposals came with it.” “A 🏛️ is a constitutional proposal: one at a time, returned whole, passing only when all …”
- **All visible text:** 🏛️Activate Your MembershipThe Founder invited you into the membership, and Constitutional Proposals came with it.A 🏛️ is a constitutional proposal: one at a time, returned whole, passing only when all members agree. You are already a member; activating it opens every question, proposal and vote on the rules.🗑️OK
- **Tab and rail:** tab 🏛️, glyph travel [0,0], clause travel [0,17]; rail no entry
- **Geometry:** 652×225px at x 478, radius 8, border 0; at 390 306×317px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [grant-voice-seat_1-1600.png](shots/current/grant-voice-seat_1-1600.png)

</details>

<details><summary><b>the session fixture, band cards (&band=1)</b> — <code>grant-pen</code></summary>

- **Slots, in order:** head “✒️Founder Actions🛡️Founder Veto🏛️Activate Your Membership” → field “As the founder of this document, you have the power to change setting…” → commit row [top rule] “🗑️OK”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close
- **Strings:** notes “As the founder of this document, you have the power to change settings and edit the docum…”
- **All visible text:** ✒️Founder Actions🛡️Founder Veto🏛️Activate Your MembershipAs the founder of this document, you have the power to change settings and edit the document at will. Founder Actions are denoted by ✒️. You can give up these powers later if you choose to.🗑️OK
- **Tab and rail:** tab ✒️F, glyph travel [0,0], clause travel [0,17]; rail no entry
- **Geometry:** 652×195px at x 478, radius 8, border 0; at 390 306×270px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [grant-pen-sessionband-1600.png](shots/current/grant-pen-sessionband-1600.png) · same state: `grant-pen` `grant-shield` `grant-voice`

</details>

<details><summary><b>the closed page, band cards (&closed=1&band=1)</b> — <code>grant-pen</code></summary>

- **Slots, in order:** head “✒️Founder Actions🛡️Founder Veto🏛️Activate Your Membership” → field “As the founder of this document, you have the power to change setting…” → commit row [top rule] “🗑️OK”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close
- **Strings:** notes “As the founder of this document, you have the power to change settings and edit the docum…”
- **All visible text:** ✒️Founder Actions🛡️Founder Veto🏛️Activate Your MembershipAs the founder of this document, you have the power to change settings and edit the document at will. Founder Actions are denoted by ✒️. You can give up these powers later if you choose to.🗑️OK
- **Tab and rail:** tab ✒️F, glyph travel [0,0], clause travel [0,17]; rail no entry
- **Geometry:** 652×195px at x 478, radius 8, border 0; at 390 306×270px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [grant-pen-sessionband-1600.png](shots/current/grant-pen-sessionband-1600.png) · same state: `grant-pen` `grant-shield` `grant-voice`

</details>

<details><summary><b>live ladder · rung constitution · rail ✒️</b> — <code>grant-pen</code></summary>

- **Slots, in order:** head “✒️Founder Actions🏛️Activate Your Membership” → field “As the founder of this document, you have the power to change setting…” → commit row [top rule] “🗑️Accept ✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button Accept ✒️ — (untitled)
- **Strings:** notes “As the founder of this document, you have the power to change settings and edit the docum…”
- **All visible text:** ✒️Founder Actions🏛️Activate Your MembershipAs the founder of this document, you have the power to change settings and edit the document at will. Founder Actions are denoted by ✒️. You can give up these powers later if you choose to.🗑️Accept ✒️
- **Tab and rail:** tab ✒️F, glyph travel [0,0], clause travel [0,17]; rail ✒️ “✒️Founder Actions”
- **Geometry:** 652×195px at x 478, radius 8, border 0; at 390 306×270px, page 390px wide, glyph travel [0,0]
- **Shot:** [grant-pen-live_constitution_founder-1600.png](shots/current/grant-pen-live_constitution_founder-1600.png)

</details>

<details><summary><b>live ladder · rung constitution · rail 🏛️</b> — <code>grant-voice</code></summary>

- **Slots, in order:** head “✒️Founder Actions🏛️Activate Your Membership” → field “A 🏛️ is a constitutional proposal: one at a time, returned whole, pa…” → commit row [top rule] “🗑️Activate 🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button Activate 🏛️ — (untitled)
- **Strings:** notes “A 🏛️ is a constitutional proposal: one at a time, returned whole, passing only when all …”
- **All visible text:** ✒️Founder Actions🏛️Activate Your MembershipA 🏛️ is a constitutional proposal: one at a time, returned whole, passing only when all members agree. You are already a member; activating it opens every question, proposal and vote on the rules.🗑️Activate 🏛️
- **Tab and rail:** tab 🏛️, glyph travel null, clause travel null; rail 🏛️ “🏛️Activate Your Membership”
- **Geometry:** 652×195px at x 478, radius 8, border 0; at 390 306×270px, page 390px wide
- **Shot:** [grant-voice-live_constitution_founder-1600.png](shots/current/grant-voice-live_constitution_founder-1600.png)

</details>

<details><summary><b>live ladder · rung ready · rail ✒️</b> — <code>grant-pen</code></summary>

- **Slots, in order:** head “✒️Founder Actions🏛️Activate Your Membership” → field “As the founder of this document, you have the power to change setting…” → commit row [top rule] “🗑️Accept ✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button Accept ✒️ — (untitled)
- **Strings:** notes “As the founder of this document, you have the power to change settings and edit the docum…”
- **All visible text:** ✒️Founder Actions🏛️Activate Your MembershipAs the founder of this document, you have the power to change settings and edit the document at will. Founder Actions are denoted by ✒️. You can give up these powers later if you choose to.🗑️Accept ✒️
- **Tab and rail:** tab ✒️F, glyph travel [0,0], clause travel [0,17]; rail ✒️ “✒️Founder Actions”
- **Geometry:** 652×195px at x 478, radius 8, border 0; at 390 306×270px, page 390px wide, glyph travel [0,0]
- **Shot:** [grant-pen-live_constitution_founder-1600.png](shots/current/grant-pen-live_constitution_founder-1600.png)

</details>

<details><summary><b>live ladder · rung ready · rail 🏛️</b> — <code>grant-voice</code></summary>

- **Slots, in order:** head “✒️Founder Actions🏛️Activate Your Membership” → field “A 🏛️ is a constitutional proposal: one at a time, returned whole, pa…” → commit row [top rule] “🗑️Activate 🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button Activate 🏛️ — (untitled)
- **Strings:** notes “A 🏛️ is a constitutional proposal: one at a time, returned whole, passing only when all …”
- **All visible text:** ✒️Founder Actions🏛️Activate Your MembershipA 🏛️ is a constitutional proposal: one at a time, returned whole, passing only when all members agree. You are already a member; activating it opens every question, proposal and vote on the rules.🗑️Activate 🏛️
- **Tab and rail:** tab 🏛️, glyph travel null, clause travel null; rail 🏛️ “🏛️Activate Your Membership”
- **Geometry:** 652×195px at x 478, radius 8, border 0; at 390 306×270px, page 390px wide
- **Shot:** [grant-voice-live_constitution_founder-1600.png](shots/current/grant-voice-live_constitution_founder-1600.png)

</details>

<details><summary><b>live ladder · rung session · rail ✒️</b> — <code>grant-pen</code></summary>

- **Slots, in order:** head “✒️Founder Actions🛡️Founder Veto🏛️Activate Your Membership” → field “As the founder of this document, you have the power to change setting…” → commit row [top rule] “🗑️Accept ✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button Accept ✒️ — (untitled)
- **Strings:** notes “As the founder of this document, you have the power to change settings and edit the docum…”
- **All visible text:** ✒️Founder Actions🛡️Founder Veto🏛️Activate Your MembershipAs the founder of this document, you have the power to change settings and edit the document at will. Founder Actions are denoted by ✒️. You can give up these powers later if you choose to.🗑️Accept ✒️
- **Tab and rail:** tab ✒️F, glyph travel [0,0], clause travel [0,17]; rail ✒️ “✒️Founder Actions”
- **Geometry:** 652×195px at x 478, radius 8, border 0; at 390 306×270px, page 390px wide, glyph travel [0,0]
- **Shot:** [grant-pen-live_session_founder-1600.png](shots/current/grant-pen-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung session · rail 🛡️</b> — <code>grant-shield</code></summary>

- **Slots, in order:** head “✒️Founder Actions🛡️Founder Veto🏛️Activate Your Membership” → field “The membership returned the Founder Veto to you.As the founder of thi…” → commit row [top rule] “🗑️Accept 🛡️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button Accept 🛡️ — (untitled)
- **Strings:** notes “The membership returned the Founder Veto to you.” “As the founder of this document, you have the power to veto choices that the membership m…”
- **All visible text:** ✒️Founder Actions🛡️Founder Veto🏛️Activate Your MembershipThe membership returned the Founder Veto to you.As the founder of this document, you have the power to veto choices that the membership make. Founder Veto is denoted by 🛡️. You can give up this power later if you choose to.🗑️Accept 🛡️
- **Tab and rail:** tab 🛡️, glyph travel null, clause travel null; rail 🛡️ “🛡️Founder Veto”
- **Geometry:** 652×225px at x 478, radius 8, border 0; at 390 306×274px, page 390px wide
- **Shot:** [grant-shield-live_session_founder-1600.png](shots/current/grant-shield-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung session · rail 🏛️</b> — <code>grant-voice</code></summary>

- **Slots, in order:** head “✒️Founder Actions🛡️Founder Veto🏛️Activate Your Membership” → field “A 🏛️ is a constitutional proposal: one at a time, returned whole, pa…” → commit row [top rule] “🗑️Activate 🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button Activate 🏛️ — (untitled)
- **Strings:** notes “A 🏛️ is a constitutional proposal: one at a time, returned whole, passing only when all …”
- **All visible text:** ✒️Founder Actions🛡️Founder Veto🏛️Activate Your MembershipA 🏛️ is a constitutional proposal: one at a time, returned whole, passing only when all members agree. You are already a member; activating it opens every question, proposal and vote on the rules.🗑️Activate 🏛️
- **Tab and rail:** tab 🏛️, glyph travel null, clause travel null; rail 🏛️ “🏛️Activate Your Membership”
- **Geometry:** 652×195px at x 478, radius 8, border 0; at 390 306×270px, page 390px wide
- **Shot:** [grant-voice-live_session_founder-1600.png](shots/current/grant-voice-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closing · rail ✒️</b> — <code>grant-pen</code></summary>

- **Slots, in order:** head “✒️Founder Actions🛡️Founder Veto🏛️Activate Your Membership” → field “As the founder of this document, you have the power to change setting…” → commit row [top rule] “🗑️Accept ✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button Accept ✒️ — (untitled)
- **Strings:** notes “As the founder of this document, you have the power to change settings and edit the docum…”
- **All visible text:** ✒️Founder Actions🛡️Founder Veto🏛️Activate Your MembershipAs the founder of this document, you have the power to change settings and edit the document at will. Founder Actions are denoted by ✒️. You can give up these powers later if you choose to.🗑️Accept ✒️
- **Tab and rail:** tab ✒️F, glyph travel [0,0], clause travel [0,17]; rail ✒️ “✒️Founder Actions”
- **Geometry:** 652×195px at x 478, radius 8, border 0; at 390 306×270px, page 390px wide, glyph travel [0,0]
- **Shot:** [grant-pen-live_session_founder-1600.png](shots/current/grant-pen-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closing · rail 🛡️</b> — <code>grant-shield</code></summary>

- **Slots, in order:** head “✒️Founder Actions🛡️Founder Veto🏛️Activate Your Membership” → field “The membership returned the Founder Veto to you.As the founder of thi…” → commit row [top rule] “🗑️Accept 🛡️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button Accept 🛡️ — (untitled)
- **Strings:** notes “The membership returned the Founder Veto to you.” “As the founder of this document, you have the power to veto choices that the membership m…”
- **All visible text:** ✒️Founder Actions🛡️Founder Veto🏛️Activate Your MembershipThe membership returned the Founder Veto to you.As the founder of this document, you have the power to veto choices that the membership make. Founder Veto is denoted by 🛡️. You can give up this power later if you choose to.🗑️Accept 🛡️
- **Tab and rail:** tab 🛡️, glyph travel null, clause travel null; rail 🛡️ “🛡️Founder Veto”
- **Geometry:** 652×225px at x 478, radius 8, border 0; at 390 306×274px, page 390px wide
- **Shot:** [grant-shield-live_session_founder-1600.png](shots/current/grant-shield-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closing · rail 🏛️</b> — <code>grant-voice</code></summary>

- **Slots, in order:** head “✒️Founder Actions🛡️Founder Veto🏛️Activate Your Membership” → field “A 🏛️ is a constitutional proposal: one at a time, returned whole, pa…” → commit row [top rule] “🗑️Activate 🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button Activate 🏛️ — (untitled)
- **Strings:** notes “A 🏛️ is a constitutional proposal: one at a time, returned whole, passing only when all …”
- **All visible text:** ✒️Founder Actions🛡️Founder Veto🏛️Activate Your MembershipA 🏛️ is a constitutional proposal: one at a time, returned whole, passing only when all members agree. You are already a member; activating it opens every question, proposal and vote on the rules.🗑️Activate 🏛️
- **Tab and rail:** tab 🏛️, glyph travel null, clause travel null; rail 🏛️ “🏛️Activate Your Membership”
- **Geometry:** 652×195px at x 478, radius 8, border 0; at 390 306×270px, page 390px wide
- **Shot:** [grant-voice-live_session_founder-1600.png](shots/current/grant-voice-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closing</b> — <code>grant-voice</code></summary>

- **Slots, in order:** head “🏛️Activate Your Membership” → field “The Founder invited you into the membership, and Constitutional Propo…” → commit row [top rule] “🗑️Activate 🏛️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button Activate 🏛️ — (untitled)
- **Strings:** notes “The Founder invited you into the membership, and Constitutional Proposals came with it.” “A 🏛️ is a constitutional proposal: one at a time, returned whole, passing only when all …”
- **All visible text:** 🏛️Activate Your MembershipThe Founder invited you into the membership, and Constitutional Proposals came with it.A 🏛️ is a constitutional proposal: one at a time, returned whole, passing only when all members agree. You are already a member; activating it opens every question, proposal and vote on the rules.🗑️Activate 🏛️
- **Tab and rail:** tab 🏛️, glyph travel [0,0], clause travel [0,17]; rail no entry
- **Geometry:** 652×225px at x 478, radius 8, border 0; at 390 306×317px, page 390px wide, glyph travel [0,0]
- **Shot:** [grant-voice-live_closing_m-1-1600.png](shots/current/grant-voice-live_closing_m-1-1600.png)

</details>

<details><summary><b>live ladder · rung closed</b> — <code>grant-pen</code></summary>

- **Slots, in order:** head “✒️Founder Actions🛡️Founder Veto🏛️Activate Your Membership” → field “As the founder of this document, you have the power to change setting…” → commit row [top rule] “🗑️Accept ✒️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button Accept ✒️ — (untitled)
- **Strings:** notes “As the founder of this document, you have the power to change settings and edit the docum…”
- **All visible text:** ✒️Founder Actions🛡️Founder Veto🏛️Activate Your MembershipAs the founder of this document, you have the power to change settings and edit the document at will. Founder Actions are denoted by ✒️. You can give up these powers later if you choose to.🗑️Accept ✒️
- **Tab and rail:** tab ✒️F, glyph travel [0,0], clause travel [0,17]; rail no entry
- **Geometry:** 652×195px at x 478, radius 8, border 0; at 390 306×270px, page 390px wide, glyph travel [0,0]
- **Shot:** [grant-pen-live_closed_founder-1600.png](shots/current/grant-pen-live_closed_founder-1600.png) · same state: `grant-pen` `grant-voice`

</details>

### `gate` — gates 💡 ⚖️

Rules: §9 gates, Q1501, Q1373, C13. Keys: `canpropose` `canjudge`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| settled by ⏩ + seeded motions — the founder | 2 | [canpropose-settled-1600.png](shots/current/canpropose-settled-1600.png) | [canpropose-settled-390.png](shots/current/canpropose-settled-390.png) | 🗑️ · OK | — | 0, 0 |
| settled + seeded — a member (seat 1, the mover) | 2 | [canpropose-settled-1600.png](shots/current/canpropose-settled-1600.png) | [canpropose-settled-390.png](shots/current/canpropose-settled-390.png) | 🗑️ · OK | — | 0, 0 |
| the session fixture, band cards (&band=1) | 2 | [canpropose-sessionband-1600.png](shots/current/canpropose-sessionband-1600.png) | [canpropose-sessionband-390.png](shots/current/canpropose-sessionband-390.png) | 🗑️ · OK | — | 0, 0 |
| the closed page, band cards (&closed=1&band=1) | 2 | [canpropose-sessionband-1600.png](shots/current/canpropose-sessionband-1600.png) | [canpropose-sessionband-390.png](shots/current/canpropose-sessionband-390.png) | 🗑️ · OK | — | 0, 0 |

<details><summary><b>settled by ⏩ + seeded motions — the founder</b> — <code>canpropose</code></summary>

- **Slots, in order:** head “🍾Begin💡Proposals⚖️VotingMembers may propose changes to rules as soo…” → commit row [top rule] “🗑️OK”
- **Dividers:** head | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close
- **Strings:** head “Members may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is …”
- **All visible text:** 🍾Begin💡Proposals⚖️VotingMembers may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is preferred by enough of the membership, and by more than prefer the current text.A constitutional proposal 🏛️ passes only when all members agree.🗑️OK
- **Tab and rail:** tab 💡P, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×229px at x 478, radius 8, border 0; at 390 306×328px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [canpropose-settled-1600.png](shots/current/canpropose-settled-1600.png) · same state: `canpropose` `canjudge`

</details>

<details><summary><b>settled + seeded — a member (seat 1, the mover)</b> — <code>canpropose</code></summary>

- **Slots, in order:** head “🍾Begin💡Proposals⚖️VotingMembers may propose changes to rules as soo…” → commit row [top rule] “🗑️OK”
- **Dividers:** head | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close
- **Strings:** head “Members may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is …”
- **All visible text:** 🍾Begin💡Proposals⚖️VotingMembers may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is preferred by enough of the membership, and by more than prefer the current text.A constitutional proposal 🏛️ passes only when all members agree.🗑️OK
- **Tab and rail:** tab 💡P, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×229px at x 478, radius 8, border 0; at 390 306×328px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [canpropose-settled-1600.png](shots/current/canpropose-settled-1600.png) · same state: `canpropose` `canjudge`

</details>

<details><summary><b>the session fixture, band cards (&band=1)</b> — <code>canpropose</code></summary>

- **Slots, in order:** head “🍾Begin💡Proposals⚖️VotingMembers may propose changes to rules as soo…” → commit row [top rule] “🗑️OK”
- **Dividers:** head | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close
- **Strings:** head “Members may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is …”
- **All visible text:** 🍾Begin💡Proposals⚖️VotingMembers may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is preferred by enough of the membership, and by more than prefer the current text.A constitutional proposal 🏛️ passes only when all members agree.🗑️OK
- **Tab and rail:** tab 💡P, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×229px at x 478, radius 8, border 0; at 390 306×328px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [canpropose-sessionband-1600.png](shots/current/canpropose-sessionband-1600.png) · same state: `canpropose` `canjudge`

</details>

<details><summary><b>the closed page, band cards (&closed=1&band=1)</b> — <code>canpropose</code></summary>

- **Slots, in order:** head “🍾Begin💡Proposals⚖️VotingMembers may propose changes to rules as soo…” → commit row [top rule] “🗑️OK”
- **Dividers:** head | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close
- **Strings:** head “Members may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is …”
- **All visible text:** 🍾Begin💡Proposals⚖️VotingMembers may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is preferred by enough of the membership, and by more than prefer the current text.A constitutional proposal 🏛️ passes only when all members agree.🗑️OK
- **Tab and rail:** tab 💡P, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×229px at x 478, radius 8, border 0; at 390 306×328px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [canpropose-sessionband-1600.png](shots/current/canpropose-sessionband-1600.png) · same state: `canpropose` `canjudge`

</details>

### `news` — news / owed OK

Rules: §9 news, E5, C8. Keys: `chamber` `slug` `admission` `applications` `lapse` `removal` `rate` `ending` `quorum` `authorship` `judgments`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| settled + seeded — a member (seat 1, the mover) · rail 🌍 | 1 | [chamber-seat_1-1600.png](shots/current/chamber-seat_1-1600.png) | [chamber-seat_1-390.png](shots/current/chamber-seat_1-390.png) | 🗑️ · OK | — | 0, 0 |
| settled + seeded — a stranger at the door | 11 | [chamber-seat_stranger-1600.png](shots/current/chamber-seat_stranger-1600.png) | [chamber-seat_stranger-390.png](shots/current/chamber-seat_stranger-390.png) | 🗑️ · OK | — | 0, 0 |
| live ladder · rung session | 11 | — | — | 🗑️ · OK | — | 0, 0 |
| live ladder · rung closing · rail ⏰ | 1 | [ending-live_closing_m-1-1600.png](shots/current/ending-live_closing_m-1-1600.png) | [ending-live_closing_m-1-390.png](shots/current/ending-live_closing_m-1-390.png) | 🗑️ · OK | — | 0, 0 |

<details><summary><b>settled + seeded — a member (seat 1, the mover) · rail 🌍</b> — <code>chamber</code></summary>

- **Slots, in order:** head “🌍VisibilityWho Can See the Document?✒️Can the Founder Make Amendment…” → field “Set toAnyone with the linkDecided by the members.The Founder has chan…” → commit row [top rule] “🗑️OK”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close; radio “Chosen by the Founder ✒️” (on)
- **Strings:** head “The document can be seen by anyone with the link.Chosen by the Founder ✒️” · standing “The document can be seen by anyone with the link.” · lockline “Decided by the members.” · notes “Decided by the members.”
- **All visible text:** 🌍VisibilityWho Can See the Document?✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Changed by the Founder: Anyone with the linkThe document can be seen by anyone with the link.Chosen by the Founder ✒️Set toAnyone with the linkDecided by the members.The Founder has changed who may read the document from members only to anyone with the link.ABAsh Bellamy 👑Readers who are not members should…
- **Tab and rail:** tab 🌍V, glyph travel [0,0], clause travel [0,0]; rail 🌍 “🌍 members only → anyone with the link”
- **Geometry:** 652×389px at x 478, radius 8, border 0; at 390 306×457px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [chamber-seat_1-1600.png](shots/current/chamber-seat_1-1600.png)

</details>

<details><summary><b>settled + seeded — a stranger at the door</b> — <code>chamber</code></summary>

- **Slots, in order:** head “🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Fou…” → commit row “🗑️OK”
- **Dividers:** none between top-level slots
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close; radio “Chosen by the Founder ✒️” (on)
- **Strings:** head “The document can be seen by anyone with the link.Chosen by the Founder ✒️” · standing “The document can be seen by anyone with the link.”
- **All visible text:** 🌍Visibility✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?🌍VisibilityChanged by the Founder: Anyone with the linkThe document can be seen by anyone with the link.Chosen by the Founder ✒️🗑️OK
- **Tab and rail:** tab 🌍V, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×193px at x 478, radius 8, border 0; at 390 306×209px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [chamber-seat_stranger-1600.png](shots/current/chamber-seat_stranger-1600.png) · same state: `slug` `chamber` `admission` `applications` `lapse` `removal` `rate` `ending` `quorum` `authorship` `judgments`

</details>

<details><summary><b>live ladder · rung session</b> — <code>slug</code></summary>

- **Slots, in order:** head “📍Link✒️Can the Founder Make Amendments at Will?🛡️Does the Founder H…” → commit row “🗑️OK”
- **Dividers:** none between top-level slots
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close; radio “Chosen by the Founder ✒️” (on)
- **Strings:** head “The document lives at docs.vote/d/ladder-16-5.Chosen by the Founder ✒️” · standing “The document lives at docs.vote/d/ladder-16-5.”
- **All visible text:** 📍Link✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?The document lives at docs.vote/d/ladder-16-5.Chosen by the Founder ✒️🗑️OK
- **Tab and rail:** tab 📍L, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×184px at x 478, radius 8, border 0; at 390 306×209px, page 390px wide, glyph travel [0,0]
- **Shot:** — · same state: `slug` `chamber` `admission` `applications` `lapse` `removal` `rate` `ending` `quorum` `authorship` `judgments`

</details>

<details><summary><b>live ladder · rung closing · rail ⏰</b> — <code>ending</code></summary>

- **Slots, in order:** head “⏰Ending✒️Can the Founder Make Amendments at Will?🛡️Does the Founder …” → field “Set toFriday, 25 September, 00:47Decided by the members.The Founder h…” → commit row [top rule] “🗑️OK”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close; radio “Chosen by the Founder ✒️” (on)
- **Strings:** head “No more changes to the document may be made after Friday, 25 September, 00:47.Chosen by the Founder ✒️” · standing “No more changes to the document may be made after Friday, 25 September, 00:47.” · lockline “Decided by the members.” · notes “Decided by the members.”
- **All visible text:** ⏰Ending✒️Can the Founder Make Amendments at Will?🛡️Does the Founder Have a Veto?Changed by the Founder: Friday, 25 September, 00:47No more changes to the document may be made after Friday, 25 September, 00:47.Chosen by the Founder ✒️Set toFriday, 25 September, 00:47Decided by the members.The Founder has changed when the drafting process will end from Friday, 25 September, 03:39 to Friday, 25 September, 00:47.ABAsh …
- **Tab and rail:** tab ⏰En, glyph travel [0,0], clause travel [0,0]; rail ⏰ “⏰ 03:39 → 00:47”
- **Geometry:** 652×389px at x 478, radius 8, border 0; at 390 306×507px, page 390px wide, glyph travel [0,0]
- **Shot:** [ending-live_closing_m-1-1600.png](shots/current/ending-live_closing_m-1-1600.png)

</details>

## 🍾 and 🥂

### `begin` — 🍾 Begin

Rules: §9 🍾, F5, BEGIN_ROWS, CP9. Keys: `begin`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| founding, unanswered (founder) · rail 🍾 | 1 | [begin-founding-1600.png](shots/current/begin-founding-1600.png) | [begin-founding-390.png](shots/current/begin-founding-390.png) | 🗑️ · 🍾 | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail 🍾 | 1 | [begin-answers-1600.png](shots/current/begin-answers-1600.png) | [begin-answers-390.png](shots/current/begin-answers-390.png) | 🗑️ · 🍾 | — | 0, 0 |
| settled by ⏩ + seeded motions — the founder | 1 | [begin-settled-1600.png](shots/current/begin-settled-1600.png) | [begin-settled-390.png](shots/current/begin-settled-390.png) | 🗑️ · OK | — | 0, 0 |
| settled + seeded — a member (seat 1, the mover) | 1 | [begin-settled-1600.png](shots/current/begin-settled-1600.png) | [begin-settled-390.png](shots/current/begin-settled-390.png) | 🗑️ · OK | — | 0, 0 |
| the session fixture, band cards (&band=1) | 1 | [begin-sessionband-1600.png](shots/current/begin-sessionband-1600.png) | [begin-sessionband-390.png](shots/current/begin-sessionband-390.png) | 🗑️ · OK | — | 0, 0 |
| the closed page, band cards (&closed=1&band=1) | 1 | [begin-sessionband-1600.png](shots/current/begin-sessionband-1600.png) | [begin-sessionband-390.png](shots/current/begin-sessionband-390.png) | 🗑️ · OK | — | 0, 0 |
| live ladder · rung session | 1 | [begin-live_session_founder-1600.png](shots/current/begin-live_session_founder-1600.png) | [begin-live_session_founder-390.png](shots/current/begin-live_session_founder-390.png) | 🗑️ · OK | — | 0, 0 |
| live ladder · rung closing | 1 | [begin-live_session_founder-1600.png](shots/current/begin-live_session_founder-1600.png) | [begin-live_session_founder-390.png](shots/current/begin-live_session_founder-390.png) | 🗑️ · OK | — | 0, 0 |
| live ladder · rung closed | 1 | [begin-live_session_founder-1600.png](shots/current/begin-live_session_founder-1600.png) | [begin-live_closed_founder-390.png](shots/current/begin-live_closed_founder-390.png) | 🗑️ · OK | — | 0, 0 |

<details><summary><b>founding, unanswered (founder) · rail 🍾</b> — <code>begin</code></summary>

- **Slots, in order:** head “🍾BeginWhen the document begins, members may propose changes to rules…” → field [top rule] “What beginning does, all at once.The Founder lays down ✒️ and 🛡️ on …” → commit row [top rule] “🗑️🍾”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🍾 — Begin the document — a full one-second hold
- **Strings:** head “When the document begins, members may propose changes to rules and vote on proposals.A proposal ✏️ passes once it is pr…” · notes “Every power is the Founder’s until they lay it down. Whatever is not kept here goes the m…” “· nothing owed” “Nobody is kept waiting by this: whoever has not answered can still answer after the start…”
- **All visible text:** 🍾BeginWhen the document begins, members may propose changes to rules and vote on proposals.A proposal ✏️ passes once it is preferred by enough of the membership, and by more than prefer the current text.A constitutional proposal 🏛️ passes only when all members agree.What beginning does, all at once.The Founder lays down ✒️ and 🛡️ on the Text — from here it changes by proposal alone.Members gain ✏️s on it, at the …
- **Tab and rail:** tab 🍾B, glyph travel [0,0], clause travel [0,0]; rail 🍾 “🍾Begin”
- **Geometry:** 652×1383px at x 478, radius 8, border 0; at 390 306×1617px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [begin-founding-1600.png](shots/current/begin-founding-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail 🍾</b> — <code>begin</code></summary>

- **Slots, in order:** head “🍾BeginWhen the document begins, members may propose changes to rules…” → field [top rule] “What beginning does, all at once.The Founder lays down ✒️ and 🛡️ on …” → commit row [top rule] “🗑️🍾”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🍾 — nothing (disabled)
- **Strings:** head “When the document begins, members may propose changes to rules and vote on proposals.A proposal ✏️ passes once it is pr…” · notes “The document cannot begin while 🌍 Visibility is still being decided.” “🌍 Visibility is delegated to the membership, and you are its only member: a question ans…” “Every power is the Founder’s until they lay it down. Whatever is not kept here goes the m…” “· answered everything” “It comes back to you the moment somebody else can answer.”
- **All visible text:** 🍾BeginWhen the document begins, members may propose changes to rules and vote on proposals.A proposal ✏️ passes once it is preferred by enough of the membership, and by more than prefer the current text.A constitutional proposal 🏛️ passes only when all members agree.What beginning does, all at once.The Founder lays down ✒️ and 🛡️ on the Text — from here it changes by proposal alone.Members gain ✏️s on it, at the …
- **Tab and rail:** tab 🍾B, glyph travel [0,0], clause travel [0,0]; rail 🍾 “🍾Begin”
- **Geometry:** 652×1485px at x 478, radius 8, border 0; at 390 306×1831px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px; H2: .setnote is full --fg; H2: .setnote is full --fg
- **Shot:** [begin-answers-1600.png](shots/current/begin-answers-1600.png)

</details>

<details><summary><b>settled by ⏩ + seeded motions — the founder</b> — <code>begin</code></summary>

- **Slots, in order:** head “🍾Begin💡Proposals⚖️VotingMembers may propose changes to rules as soo…” → field [top rule] “What beginning did.The Founder lays down ✒️ and 🛡️ on the Text — fro…” → commit row [top rule] “🗑️OK”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close
- **Strings:** head “Members may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is …”
- **All visible text:** 🍾Begin💡Proposals⚖️VotingMembers may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is preferred by enough of the membership, and by more than prefer the current text.A constitutional proposal 🏛️ passes only when all members agree.What beginning did.The Founder lays down ✒️ and 🛡️ on the Text — from here it changes by proposal alone.Members gain ✏️s on it, …
- **Tab and rail:** tab 🍾B, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×387px at x 478, radius 8, border 0; at 390 306×584px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [begin-settled-1600.png](shots/current/begin-settled-1600.png)

</details>

<details><summary><b>settled + seeded — a member (seat 1, the mover)</b> — <code>begin</code></summary>

- **Slots, in order:** head “🍾Begin💡Proposals⚖️VotingMembers may propose changes to rules as soo…” → field [top rule] “What beginning did.The Founder lays down ✒️ and 🛡️ on the Text — fro…” → commit row [top rule] “🗑️OK”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close
- **Strings:** head “Members may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is …”
- **All visible text:** 🍾Begin💡Proposals⚖️VotingMembers may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is preferred by enough of the membership, and by more than prefer the current text.A constitutional proposal 🏛️ passes only when all members agree.What beginning did.The Founder lays down ✒️ and 🛡️ on the Text — from here it changes by proposal alone.Members gain ✏️s on it, …
- **Tab and rail:** tab 🍾B, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×387px at x 478, radius 8, border 0; at 390 306×584px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [begin-settled-1600.png](shots/current/begin-settled-1600.png)

</details>

<details><summary><b>the session fixture, band cards (&band=1)</b> — <code>begin</code></summary>

- **Slots, in order:** head “🍾Begin💡Proposals⚖️VotingMembers may propose changes to rules as soo…” → field [top rule] “What beginning did.The Founder lays down ✒️ and 🛡️ on the Text — fro…” → commit row [top rule] “🗑️OK”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close
- **Strings:** head “Members may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is …”
- **All visible text:** 🍾Begin💡Proposals⚖️VotingMembers may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is preferred by enough of the membership, and by more than prefer the current text.A constitutional proposal 🏛️ passes only when all members agree.What beginning did.The Founder lays down ✒️ and 🛡️ on the Text — from here it changes by proposal alone.Members gain ✏️s on it, …
- **Tab and rail:** tab 🍾B, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×387px at x 478, radius 8, border 0; at 390 306×584px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [begin-sessionband-1600.png](shots/current/begin-sessionband-1600.png)

</details>

<details><summary><b>the closed page, band cards (&closed=1&band=1)</b> — <code>begin</code></summary>

- **Slots, in order:** head “🍾Begin💡Proposals⚖️VotingMembers may propose changes to rules as soo…” → field [top rule] “What beginning did.The Founder lays down ✒️ and 🛡️ on the Text — fro…” → commit row [top rule] “🗑️OK”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close
- **Strings:** head “Members may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is …”
- **All visible text:** 🍾Begin💡Proposals⚖️VotingMembers may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is preferred by enough of the membership, and by more than prefer the current text.A constitutional proposal 🏛️ passes only when all members agree.What beginning did.The Founder lays down ✒️ and 🛡️ on the Text — from here it changes by proposal alone.Members gain ✏️s on it, …
- **Tab and rail:** tab 🍾B, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×387px at x 478, radius 8, border 0; at 390 306×584px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [begin-sessionband-1600.png](shots/current/begin-sessionband-1600.png)

</details>

<details><summary><b>live ladder · rung session</b> — <code>begin</code></summary>

- **Slots, in order:** head “🍾BeginMembers may propose changes to rules as soon as they arrive, a…” → field [top rule] “What beginning did.The Founder keeps 🛡️ on the Text and lays down ✒️…” → commit row [top rule] “🗑️OK”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close
- **Strings:** head “Members may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is …”
- **All visible text:** 🍾BeginMembers may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is preferred by enough of the membership, and by more than prefer the current text.A constitutional proposal 🏛️ passes only when all members agree.What beginning did.The Founder keeps 🛡️ on the Text and lays down ✒️ — they may refuse changes to the text that the membership pass.Members gain ✏️…
- **Tab and rail:** tab 🍾B, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×407px at x 478, radius 8, border 0; at 390 306×584px, page 390px wide, glyph travel [0,0]
- **Shot:** [begin-live_session_founder-1600.png](shots/current/begin-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closing</b> — <code>begin</code></summary>

- **Slots, in order:** head “🍾BeginMembers may propose changes to rules as soon as they arrive, a…” → field [top rule] “What beginning did.The Founder keeps 🛡️ on the Text and lays down ✒️…” → commit row [top rule] “🗑️OK”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close
- **Strings:** head “Members may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is …”
- **All visible text:** 🍾BeginMembers may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is preferred by enough of the membership, and by more than prefer the current text.A constitutional proposal 🏛️ passes only when all members agree.What beginning did.The Founder keeps 🛡️ on the Text and lays down ✒️ — they may refuse changes to the text that the membership pass.Members gain ✏️…
- **Tab and rail:** tab 🍾B, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×407px at x 478, radius 8, border 0; at 390 306×584px, page 390px wide, glyph travel [0,0]
- **Shot:** [begin-live_session_founder-1600.png](shots/current/begin-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closed</b> — <code>begin</code></summary>

- **Slots, in order:** head “🍾BeginMembers may propose changes to rules as soon as they arrive, a…” → field [top rule] “What beginning did.The Founder keeps 🛡️ on the Text and lays down ✒️…” → commit row [top rule] “🗑️OK”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button OK — acknowledge and close
- **Strings:** head “Members may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is …”
- **All visible text:** 🍾BeginMembers may propose changes to rules as soon as they arrive, and may vote on proposals.A proposal ✏️ passes once it is preferred by enough of the membership, and by more than prefer the current text.A constitutional proposal 🏛️ passes only when all members agree.What beginning did.The Founder keeps 🛡️ on the Text and lays down ✒️ — they may refuse changes to the text that the membership pass.Members gain ✏️…
- **Tab and rail:** tab 🍾B, glyph travel [0,0], clause travel [0,0]; rail no entry
- **Geometry:** 652×407px at x 478, radius 8, border 0; at 390 306×584px, page 390px wide, glyph travel [0,0]
- **Shot:** [begin-live_session_founder-1600.png](shots/current/begin-live_session_founder-1600.png)

</details>

### `closing` — 🥂 The Close

Rules: §9 🥂, Q1450, Y20. Keys: `closing`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| the closed page, band cards (&closed=1&band=1) | 1 | [closing-closedband-1600.png](shots/current/closing-closedband-1600.png) | [closing-closedband-390.png](shots/current/closing-closedband-390.png) | OK | — | 0, 0 |
| live ladder · rung closed | 1 | [closing-live_closed_founder-1600.png](shots/current/closing-live_closed_founder-1600.png) | [closing-live_closed_founder-390.png](shots/current/closing-live_closed_founder-390.png) | OK | — | 0, 0 |

<details><summary><b>the closed page, band cards (&closed=1&band=1)</b> — <code>closing</code></summary>

- **Slots, in order:** head “🥂The CloseThe document closed at 00:51 on 25 September. 2 members ha…” → field [top rule] “The document is final as of 00:51 on 25 September.11 proposals were a…” → commit row [top rule] “OK”
- **Dividers:** head | field; field | commit row
- **Controls:** button OK — OK signs the document; your comment goes on the record
- **Strings:** head “The document closed at 00:51 on 25 September. 2 members have signed it.” · notes “Dissent is as welcome as praise — or nothing at all.” “OK signs the document. Your comment, or its absence, goes on the record beside your name.” “· I still think the garden clause goes too far — but it was fairly decided.”
- **All visible text:** 🥂The CloseThe document closed at 00:51 on 25 September. 2 members have signed it.The document is final as of 00:51 on 25 September.11 proposals were adopted into the text.3 motions passed.1 motion was still open and did not pass.2 questions were left undecided — the text stands, and they are filed below the charter as its backlog.Authorship stays sealed: the record names nobody.The record is published with the docu…
- **Tab and rail:** tab 🥂T, glyph travel [0,0], clause travel [0,0]; rail  “The Close”
- **Geometry:** 652×503px at x 478, radius 8, border 0; at 390 306×701px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [closing-closedband-1600.png](shots/current/closing-closedband-1600.png)

</details>

<details><summary><b>live ladder · rung closed</b> — <code>closing</code></summary>

- **Slots, in order:** head “🥂The CloseThe document closed at 00:44 on 25 September. 4 members ha…” → field [top rule] “The document is final as of 00:44 on 25 September.3 proposals were ad…” → commit row [top rule] “OK”
- **Dividers:** head | field; field | commit row
- **Controls:** button OK — OK signs the document; your comment goes on the record
- **Strings:** head “The document closed at 00:44 on 25 September. 4 members have signed it.” · notes “Dissent is as welcome as praise — or nothing at all.” “OK signs the document. Your comment, or its absence, goes on the record beside your name.” “· I still think the garden clause goes too far — but it was fairly decided.” “· Well argued throughout, and the keys question was worth the trouble.” “· Signing under protest about the Thursday dinner.”
- **All visible text:** 🥂The CloseThe document closed at 00:44 on 25 September. 4 members have signed it.The document is final as of 00:44 on 25 September.3 proposals were adopted into the text.3 motions passed; 1 passed change waited on an assent that never came, and goes to the backlog.5 motions were still open and did not pass.11 questions were left undecided — the text stands, and they are filed below the charter as its backlog.The re…
- **Tab and rail:** tab 🥂T, glyph travel [0,0], clause travel [0,0]; rail  “The Close”
- **Geometry:** 652×554px at x 478, radius 8, border 0; at 390 306×853px, page 390px wide, glyph travel [0,0]
- **Shot:** [closing-live_closed_founder-1600.png](shots/current/closing-live_closed_founder-1600.png)

</details>

## Doors (✉️ ❌ 🌂 adm: the stranger)

### `door-invite` — ✉️ Invite

Rules: §9 ✉️, Q1166, Q1187, F19, F23, CP6. Keys: `invite`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| founding, unanswered (founder) · rail ✉️ | 1 | [invite-founding-1600.png](shots/current/invite-founding-1600.png) | [invite-founding-390.png](shots/current/invite-founding-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail ✉️ | 1 | [invite-answers-1600.png](shots/current/invite-answers-1600.png) | [invite-answers-390.png](shots/current/invite-answers-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| settled by ⏩ + seeded motions — the founder | 1 | [invite-settled-1600.png](shots/current/invite-settled-1600.png) | [invite-settled-390.png](shots/current/invite-settled-390.png) | 🗑️ · ✒️ · 🏛️ | — | 0, 0 |
| settled + seeded — a member (seat 1, the mover) | 1 | [invite-seat_1-1600.png](shots/current/invite-seat_1-1600.png) | [invite-seat_1-390.png](shots/current/invite-seat_1-390.png) | 🗑️ · 🏛️ | — | 0, 0 |
| the session fixture, band cards (&band=1) | 1 | [invite-sessionband-1600.png](shots/current/invite-sessionband-1600.png) | [invite-sessionband-390.png](shots/current/invite-sessionband-390.png) | 🗑️ · ✒️ · 🏛️ | — | 0, 0 |
| the closed page, band cards (&closed=1&band=1) | 1 | [invite-closedband-1600.png](shots/current/invite-closedband-1600.png) | [invite-closedband-390.png](shots/current/invite-closedband-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| live ladder · rung constitution | 1 | [invite-live_constitution_founder-1600.png](shots/current/invite-live_constitution_founder-1600.png) | [invite-live_constitution_founder-390.png](shots/current/invite-live_constitution_founder-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| live ladder · rung ready | 1 | [invite-live_constitution_founder-1600.png](shots/current/invite-live_constitution_founder-1600.png) | [invite-live_ready_founder-390.png](shots/current/invite-live_ready_founder-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| live ladder · rung session | 1 | [invite-live_session_founder-1600.png](shots/current/invite-live_session_founder-1600.png) | [invite-live_session_founder-390.png](shots/current/invite-live_session_founder-390.png) | 🗑️ · ✒️ · 🏛️ | — | 0, 0 |
| live ladder · rung closing | 1 | [invite-live_closing_founder-1600.png](shots/current/invite-live_closing_founder-1600.png) | [invite-live_closing_founder-390.png](shots/current/invite-live_closing_founder-390.png) | 🗑️ · ✒️ · 🏛️ | — | 0, 0 |
| live ladder · rung closed | 1 | [invite-live_constitution_founder-1600.png](shots/current/invite-live_constitution_founder-1600.png) | [invite-live_closed_founder-390.png](shots/current/invite-live_closed_founder-390.png) | 🗑️ · ✒️ | — | 0, 0 |

<details><summary><b>founding, unanswered (founder) · rail ✉️</b> — <code>invite</code></summary>

- **Slots, in order:** head “✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder…” → field [top rule] → commit row [top rule] “🗑️✒️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Send the invitations — your word sends; textarea field “name@example.com
one address per line”
- **Strings:** head “Nobody has been invited yet.”
- **All visible text:** ✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder Have a Veto over Invitations?Nobody has been invited yet.🗑️✒️
- **Tab and rail:** tab ✉️I, glyph travel [0,0], clause travel [0,3]; rail ✉️ “✉️Invite a Member”
- **Geometry:** 652×220px at x 478, radius 8, border 0; at 390 306×220px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [invite-founding-1600.png](shots/current/invite-founding-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail ✉️</b> — <code>invite</code></summary>

- **Slots, in order:** head “✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder…” → field [top rule] “🌍 Visibility is waiting for somebody to answer it. You handed it to …” → commit row [top rule] “🗑️✒️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Send the invitations — your word sends; textarea field “name@example.com
one address per line”
- **Strings:** head “Nobody has been invited yet.” · notes “🌍 Visibility is waiting for somebody to answer it. You handed it to the membership, and …”
- **All visible text:** ✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder Have a Veto over Invitations?Nobody has been invited yet.🌍 Visibility is waiting for somebody to answer it. You handed it to the membership, and you are its only member — a question answered by one voice has not been handed to anybody, so one more member is enough to start it. If you would rather not invite anybody, take it back on its own card a…
- **Tab and rail:** tab ✉️I, glyph travel [0,0], clause travel [0,3]; rail ✉️ “✉️Invite a Member”
- **Geometry:** 652×334px at x 478, radius 8, border 0; at 390 306×393px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px; H4: 311 characters
- **Shot:** [invite-answers-1600.png](shots/current/invite-answers-1600.png)

</details>

<details><summary><b>settled by ⏩ + seeded motions — the founder</b> — <code>invite</code></summary>

- **Slots, in order:** head “✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder…” → field [top rule] → commit row [top rule] “🗑️✒️🏛️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Send the invitations — your word sends; button 🏛️ — nothing (disabled); textarea field “name@example.com
one address per line”
- **Strings:** head “Nobody has been invited yet.”
- **All visible text:** ✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder Have a Veto over Invitations?Nobody has been invited yet.🗑️✒️🏛️
- **Tab and rail:** tab ✉️I, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×220px at x 478, radius 8, border 0; at 390 306×220px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [invite-settled-1600.png](shots/current/invite-settled-1600.png)

</details>

<details><summary><b>settled + seeded — a member (seat 1, the mover)</b> — <code>invite</code></summary>

- **Slots, in order:** head “✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder…” → field [top rule] → commit row [top rule] “🗑️🏛️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Discard this motion; button 🏛️ — nothing (disabled); text field “name@example.com”
- **Strings:** head “Nobody has been invited yet.Anyone may be proposed as a new member, and every member has to agree — one refusal keeps t…” · notes “We should change this because…”
- **All visible text:** ✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder Have a Veto over Invitations?Nobody has been invited yet.Anyone may be proposed as a new member, and every member has to agree — one refusal keeps them out.🗑️🏛️
- **Tab and rail:** tab ✉️I, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×332px at x 478, radius 8, border 0; at 390 306×381px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [invite-seat_1-1600.png](shots/current/invite-seat_1-1600.png)

</details>

<details><summary><b>the session fixture, band cards (&band=1)</b> — <code>invite</code></summary>

- **Slots, in order:** head “✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder…” → field [top rule] → commit row [top rule] “🗑️✒️🏛️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Send the invitations — your word sends; button 🏛️ — nothing (disabled); textarea field “name@example.com
one address per line”
- **Strings:** head “Nobody has been invited yet.”
- **All visible text:** ✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder Have a Veto over Invitations?Nobody has been invited yet.🗑️✒️🏛️
- **Tab and rail:** tab ✉️I, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×220px at x 478, radius 8, border 0; at 390 306×220px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [invite-sessionband-1600.png](shots/current/invite-sessionband-1600.png)

</details>

<details><summary><b>the closed page, band cards (&closed=1&band=1)</b> — <code>invite</code></summary>

- **Slots, in order:** head “✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder…” → field [top rule] → commit row [top rule] “🗑️✒️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Send the invitations — your word sends; textarea field “name@example.com
one address per line”
- **Strings:** head “Nobody has been invited yet.”
- **All visible text:** ✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder Have a Veto over Invitations?Nobody has been invited yet.🗑️✒️
- **Tab and rail:** tab ✉️I, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×220px at x 478, radius 8, border 0; at 390 306×220px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [invite-closedband-1600.png](shots/current/invite-closedband-1600.png)

</details>

<details><summary><b>live ladder · rung constitution</b> — <code>invite</code></summary>

- **Slots, in order:** head “✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder…” → field [top rule] → commit row [top rule] “🗑️✒️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Send the invitations — your word sends; textarea field “name@example.com
one address per line”
- **Strings:** head “Nobody has been invited yet.”
- **All visible text:** ✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder Have a Veto over Invitations?Nobody has been invited yet.🗑️✒️
- **Tab and rail:** tab ✉️I, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×220px at x 478, radius 8, border 0; at 390 306×220px, page 390px wide, glyph travel [0,0]
- **Shot:** [invite-live_constitution_founder-1600.png](shots/current/invite-live_constitution_founder-1600.png)

</details>

<details><summary><b>live ladder · rung ready</b> — <code>invite</code></summary>

- **Slots, in order:** head “✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder…” → field [top rule] → commit row [top rule] “🗑️✒️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Send the invitations — your word sends; textarea field “name@example.com
one address per line”
- **Strings:** head “Nobody has been invited yet.”
- **All visible text:** ✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder Have a Veto over Invitations?Nobody has been invited yet.🗑️✒️
- **Tab and rail:** tab ✉️I, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×220px at x 478, radius 8, border 0; at 390 306×220px, page 390px wide, glyph travel [0,0]
- **Shot:** [invite-live_constitution_founder-1600.png](shots/current/invite-live_constitution_founder-1600.png)

</details>

<details><summary><b>live ladder · rung session</b> — <code>invite</code></summary>

- **Slots, in order:** head “✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder…” → field [top rule] → commit row [top rule] “🗑️✒️🏛️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Send the invitations — your word sends; button 🏛️ — nothing (disabled); textarea field “name@example.com
one address per line”
- **Strings:** head “quillon@ladder.invalid proposed”
- **All visible text:** ✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder Have a Veto over Invitations? quillon@ladder.invalid proposed🗑️✒️🏛️
- **Tab and rail:** tab ✉️I, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×224px at x 478, radius 8, border 0; at 390 306×224px, page 390px wide, glyph travel [0,0]
- **Shot:** [invite-live_session_founder-1600.png](shots/current/invite-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closing</b> — <code>invite</code></summary>

- **Slots, in order:** head “✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder…” → field [top rule] → commit row [top rule] “🗑️✒️🏛️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Send the invitations — your word sends; button 🏛️ — nothing (disabled); textarea field “name@example.com
one address per line”
- **Strings:** head “quillon@ladder.invalid proposed”
- **All visible text:** ✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder Have a Veto over Invitations? quillon@ladder.invalid proposed🗑️✒️🏛️
- **Tab and rail:** tab ✉️I, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×224px at x 478, radius 8, border 0; at 390 306×224px, page 390px wide, glyph travel [0,0]
- **Shot:** [invite-live_closing_founder-1600.png](shots/current/invite-live_closing_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closed</b> — <code>invite</code></summary>

- **Slots, in order:** head “✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder…” → field [top rule] → commit row [top rule] “🗑️✒️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — Send the invitations — your word sends; textarea field “name@example.com
one address per line”
- **Strings:** head “Nobody has been invited yet.”
- **All visible text:** ✉️Invite a Member✒️Can the Founder Invite at Will?🛡️Does the Founder Have a Veto over Invitations?Nobody has been invited yet.🗑️✒️
- **Tab and rail:** tab ✉️I, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×220px at x 478, radius 8, border 0; at 390 306×220px, page 390px wide, glyph travel [0,0]
- **Shot:** [invite-live_constitution_founder-1600.png](shots/current/invite-live_constitution_founder-1600.png)

</details>

### `door-remove` — ❌ Remove

Rules: §9 ❌, CP6, entry 96. Keys: `remove`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| settled by ⏩ + seeded motions — the founder | 1 | [remove-settled-1600.png](shots/current/remove-settled-1600.png) | [remove-settled-390.png](shots/current/remove-settled-390.png) | 🗑️ · ✒️ · 🏛️ | — | 0, 0 |
| settled + seeded — a member (seat 1, the mover) | 1 | [remove-seat_1-1600.png](shots/current/remove-seat_1-1600.png) | [remove-seat_1-390.png](shots/current/remove-seat_1-390.png) | 🗑️ · 🏛️ | — | 0, 0 |
| the session fixture, band cards (&band=1) | 1 | [remove-sessionband-1600.png](shots/current/remove-sessionband-1600.png) | [remove-sessionband-390.png](shots/current/remove-sessionband-390.png) | 🗑️ · ✒️ · 🏛️ | — | 0, 0 |
| the closed page, band cards (&closed=1&band=1) | 1 | [remove-closedband-1600.png](shots/current/remove-closedband-1600.png) | [remove-closedband-390.png](shots/current/remove-closedband-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| live ladder · rung constitution | 1 | [remove-live_constitution_founder-1600.png](shots/current/remove-live_constitution_founder-1600.png) | [remove-live_constitution_founder-390.png](shots/current/remove-live_constitution_founder-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| live ladder · rung ready | 1 | [remove-live_ready_founder-1600.png](shots/current/remove-live_ready_founder-1600.png) | [remove-live_ready_founder-390.png](shots/current/remove-live_ready_founder-390.png) | 🗑️ · ✒️ | — | 0, 0 |
| live ladder · rung session | 1 | [remove-live_session_founder-1600.png](shots/current/remove-live_session_founder-1600.png) | [remove-live_session_founder-390.png](shots/current/remove-live_session_founder-390.png) | 🗑️ · ✒️ · 🏛️ | — | 0, 0 |
| live ladder · rung closing | 1 | [remove-live_closing_founder-1600.png](shots/current/remove-live_closing_founder-1600.png) | [remove-live_closing_founder-390.png](shots/current/remove-live_closing_founder-390.png) | 🗑️ · ✒️ · 🏛️ | — | 0, 0 |
| live ladder · rung closed | 1 | [remove-live_closed_founder-1600.png](shots/current/remove-live_closed_founder-1600.png) | [remove-live_closed_founder-390.png](shots/current/remove-live_closed_founder-390.png) | 🗑️ · ✒️ | — | 0, 0 |

<details><summary><b>settled by ⏩ + seeded motions — the founder</b> — <code>remove</code></summary>

- **Slots, in order:** head “❌Remove a Member✒️Can the Founder Remove at Will?🛡️Does the Founder …” → field [top rule] “Choose somebody to remove…Ivy FenMoss Whitlow” → commit row [top rule] “🗑️✒️🏛️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); button 🏛️ — nothing (disabled)
- **Strings:** head “Nobody is proposed for removal.”
- **All visible text:** ❌Remove a Member✒️Can the Founder Remove at Will?🛡️Does the Founder Have a Veto over Removals?Nobody is proposed for removal.Choose somebody to remove…Ivy FenMoss Whitlow🗑️✒️🏛️
- **Tab and rail:** tab ❌Re, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×194px at x 478, radius 8, border 0; at 390 306×194px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [remove-settled-1600.png](shots/current/remove-settled-1600.png)

</details>

<details><summary><b>settled + seeded — a member (seat 1, the mover)</b> — <code>remove</code></summary>

- **Slots, in order:** head “❌Remove a Member✒️Can the Founder Remove at Will?🛡️Does the Founder …” → field [top rule] “Choose somebody to remove…Moss WhitlowWhoever it is will see the prop…” → commit row [top rule] “🗑️🏛️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Discard this motion; button 🏛️ — nothing (disabled)
- **Strings:** head “Nobody is proposed for removal.” · notes “Whoever it is will see the proposal — nobody is removed in secret.” “We should change this because…”
- **All visible text:** ❌Remove a Member✒️Can the Founder Remove at Will?🛡️Does the Founder Have a Veto over Removals?Nobody is proposed for removal.Choose somebody to remove…Moss WhitlowWhoever it is will see the proposal — nobody is removed in secret.🗑️🏛️
- **Tab and rail:** tab ❌Re, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×289px at x 478, radius 8, border 0; at 390 306×309px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [remove-seat_1-1600.png](shots/current/remove-seat_1-1600.png)

</details>

<details><summary><b>the session fixture, band cards (&band=1)</b> — <code>remove</code></summary>

- **Slots, in order:** head “❌Remove a Member✒️Can the Founder Remove at Will?🛡️Does the Founder …” → field [top rule] “Choose somebody to remove…Ivy FenMoss Whitlow” → commit row [top rule] “🗑️✒️🏛️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); button 🏛️ — nothing (disabled)
- **Strings:** head “Nobody is proposed for removal.”
- **All visible text:** ❌Remove a Member✒️Can the Founder Remove at Will?🛡️Does the Founder Have a Veto over Removals?Nobody is proposed for removal.Choose somebody to remove…Ivy FenMoss Whitlow🗑️✒️🏛️
- **Tab and rail:** tab ❌Re, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×194px at x 478, radius 8, border 0; at 390 306×194px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [remove-sessionband-1600.png](shots/current/remove-sessionband-1600.png)

</details>

<details><summary><b>the closed page, band cards (&closed=1&band=1)</b> — <code>remove</code></summary>

- **Slots, in order:** head “❌Remove a Member✒️Can the Founder Remove at Will?🛡️Does the Founder …” → field [top rule] “Choose somebody to remove…Ivy Fenmoss@hollowoak.org” → commit row [top rule] “🗑️✒️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled)
- **Strings:** head “Nobody is proposed for removal.”
- **All visible text:** ❌Remove a Member✒️Can the Founder Remove at Will?🛡️Does the Founder Have a Veto over Removals?Nobody is proposed for removal.Choose somebody to remove…Ivy Fenmoss@hollowoak.org🗑️✒️
- **Tab and rail:** tab ❌Re, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×194px at x 478, radius 8, border 0; at 390 306×194px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — margin-t -17px · padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [remove-closedband-1600.png](shots/current/remove-closedband-1600.png)

</details>

<details><summary><b>live ladder · rung constitution</b> — <code>remove</code></summary>

- **Slots, in order:** head “❌Remove a Member✒️Can the Founder Remove at Will?🛡️Does the Founder …” → field [top rule] “Until the document begins, taking somebody off the list is yours alon…” → commit row [top rule] “🗑️✒️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled)
- **Strings:** head “Nobody is proposed for removal.” · notes “Until the document begins, taking somebody off the list is yours alone — an invitation wi…”
- **All visible text:** ❌Remove a Member✒️Can the Founder Remove at Will?🛡️Does the Founder Have a Veto over Removals?Nobody is proposed for removal.Until the document begins, taking somebody off the list is yours alone — an invitation withdrawn is nobody else’s business yet.Choose somebody to remove…Ivy FenMoss WhitlowBram AldercottNell SowerbyCorin HaleWren PettiferOsric VaneTamsin RookEmlyn CrakeDilys MarchmontFenn OttawaySorrel BlighH…
- **Tab and rail:** tab ❌Re, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×249px at x 478, radius 8, border 0; at 390 306×268px, page 390px wide, glyph travel [0,0]
- **Shot:** [remove-live_constitution_founder-1600.png](shots/current/remove-live_constitution_founder-1600.png)

</details>

<details><summary><b>live ladder · rung ready</b> — <code>remove</code></summary>

- **Slots, in order:** head “❌Remove a Member✒️Can the Founder Remove at Will?🛡️Does the Founder …” → field [top rule] “Until the document begins, taking somebody off the list is yours alon…” → commit row [top rule] “🗑️✒️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled)
- **Strings:** head “Nobody is proposed for removal.” · notes “Until the document begins, taking somebody off the list is yours alone — an invitation wi…”
- **All visible text:** ❌Remove a Member✒️Can the Founder Remove at Will?🛡️Does the Founder Have a Veto over Removals?Nobody is proposed for removal.Until the document begins, taking somebody off the list is yours alone — an invitation withdrawn is nobody else’s business yet.Choose somebody to remove…Ivy FenMoss WhitlowBram AldercottNell SowerbyCorin HaleWren PettiferOsric VaneTamsin RookEmlyn CrakeDilys MarchmontFenn OttawaySorrel BlighH…
- **Tab and rail:** tab ❌Re, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×249px at x 478, radius 8, border 0; at 390 306×268px, page 390px wide, glyph travel [0,0]
- **Shot:** [remove-live_ready_founder-1600.png](shots/current/remove-live_ready_founder-1600.png)

</details>

<details><summary><b>live ladder · rung session</b> — <code>remove</code></summary>

- **Slots, in order:** head “❌Remove a Member✒️Can the Founder Remove at Will?🛡️Does the Founder …” → field [top rule] “Choose somebody to remove…Ivy FenMoss WhitlowBram AldercottNell Sower…” → commit row [top rule] “🗑️✒️🏛️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); button 🏛️ — nothing (disabled)
- **Strings:** head “👩 Linnet Frayne”
- **All visible text:** ❌Remove a Member✒️Can the Founder Remove at Will?🛡️Does the Founder Have a Veto over Removals?👩 Linnet FrayneChoose somebody to remove…Ivy FenMoss WhitlowBram AldercottNell SowerbyCorin HaleWren PettiferOsric VaneTamsin RookEmlyn CrakeDilys MarchmontFenn OttawaySorrel BlighHesper NyeRufus QuillPerrin DaceAlys ThorneGideon MarshVerity CombeLinnet Frayne🗑️✒️🏛️
- **Tab and rail:** tab ❌Re, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×196px at x 478, radius 8, border 0; at 390 306×196px, page 390px wide, glyph travel [0,0]
- **Shot:** [remove-live_session_founder-1600.png](shots/current/remove-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closing</b> — <code>remove</code></summary>

- **Slots, in order:** head “❌Remove a Member✒️Can the Founder Remove at Will?🛡️Does the Founder …” → field [top rule] “Choose somebody to remove…Ivy FenMoss WhitlowBram AldercottNell Sower…” → commit row [top rule] “🗑️✒️🏛️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled); button 🏛️ — nothing (disabled)
- **Strings:** head “👩 Linnet Frayne”
- **All visible text:** ❌Remove a Member✒️Can the Founder Remove at Will?🛡️Does the Founder Have a Veto over Removals?👩 Linnet FrayneChoose somebody to remove…Ivy FenMoss WhitlowBram AldercottNell SowerbyCorin HaleWren PettiferOsric VaneTamsin RookEmlyn CrakeDilys MarchmontFenn OttawaySorrel BlighHesper NyeRufus QuillPerrin DaceAlys ThorneGideon MarshVerity CombeLinnet Frayne🗑️✒️🏛️
- **Tab and rail:** tab ❌Re, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×196px at x 478, radius 8, border 0; at 390 306×196px, page 390px wide, glyph travel [0,0]
- **Shot:** [remove-live_closing_founder-1600.png](shots/current/remove-live_closing_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closed</b> — <code>remove</code></summary>

- **Slots, in order:** head “❌Remove a Member✒️Can the Founder Remove at Will?🛡️Does the Founder …” → field [top rule] “Choose somebody to remove…Ivy FenMoss WhitlowBram AldercottNell Sower…” → commit row [top rule] “🗑️✒️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ✒️ — nothing (disabled)
- **Strings:** head “Nobody is proposed for removal.”
- **All visible text:** ❌Remove a Member✒️Can the Founder Remove at Will?🛡️Does the Founder Have a Veto over Removals?Nobody is proposed for removal.Choose somebody to remove…Ivy FenMoss WhitlowBram AldercottNell SowerbyCorin HaleWren PettiferOsric VaneTamsin RookEmlyn CrakeDilys MarchmontFenn OttawaySorrel BlighHesper NyeRufus QuillPerrin DaceAlys ThorneGideon MarshVerity CombeLinnet Frayne🗑️✒️
- **Tab and rail:** tab ❌Re, glyph travel [0,0], clause travel [0,3]; rail no entry
- **Geometry:** 652×194px at x 478, radius 8, border 0; at 390 306×194px, page 390px wide, glyph travel [0,0]
- **Shot:** [remove-live_closed_founder-1600.png](shots/current/remove-live_closed_founder-1600.png)

</details>

### `door-leave` — 🌂 Leave the Membership

Rules: §9 🌂, Q1400, E32. Keys: `leave`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| settled by ⏩ + seeded motions — the founder | 1 | [leave-settled-1600.png](shots/current/leave-settled-1600.png) | [leave-settled-390.png](shots/current/leave-settled-390.png) | 🗑️ · Leave the Membership | — | 0, 0 |
| settled + seeded — a member (seat 1, the mover) | 1 | [leave-settled-1600.png](shots/current/leave-settled-1600.png) | [leave-settled-390.png](shots/current/leave-settled-390.png) | 🗑️ · Leave the Membership | — | 0, 0 |
| the session fixture, band cards (&band=1) | 1 | [leave-sessionband-1600.png](shots/current/leave-sessionband-1600.png) | [leave-sessionband-390.png](shots/current/leave-sessionband-390.png) | 🗑️ · Leave the Membership | — | 0, 0 |

<details><summary><b>settled by ⏩ + seeded motions — the founder</b> — <code>leave</code></summary>

- **Slots, in order:** head “✋Your Name🖼️Your Picture📧Your Email🌂Leave the MembershipLeave the …” → field [top rule] “If you give up your membership you may not be able to rejoin: the mem…” → commit row [top rule] “🗑️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — Leave the Membership
- **Strings:** head “Leave the Membership” · notes “If you give up your membership you may not be able to rejoin: the membership will have to…”
- **All visible text:** ✋Your Name🖼️Your Picture📧Your Email🌂Leave the MembershipLeave the MembershipIf you give up your membership you may not be able to rejoin: the membership will have to decide whether to re-admit you. Leaving is immediate, and nobody has to agree.🗑️
- **Tab and rail:** tab 🌂L, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×223px at x 478, radius 8, border 0; at 390 306×243px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [leave-settled-1600.png](shots/current/leave-settled-1600.png)

</details>

<details><summary><b>settled + seeded — a member (seat 1, the mover)</b> — <code>leave</code></summary>

- **Slots, in order:** head “✋Your Name🖼️Your Picture📧Your Email🌂Leave the MembershipLeave the …” → field [top rule] “If you give up your membership you may not be able to rejoin: the mem…” → commit row [top rule] “🗑️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — Leave the Membership
- **Strings:** head “Leave the Membership” · notes “If you give up your membership you may not be able to rejoin: the membership will have to…”
- **All visible text:** ✋Your Name🖼️Your Picture📧Your Email🌂Leave the MembershipLeave the MembershipIf you give up your membership you may not be able to rejoin: the membership will have to decide whether to re-admit you. Leaving is immediate, and nobody has to agree.🗑️
- **Tab and rail:** tab 🌂L, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×223px at x 478, radius 8, border 0; at 390 306×243px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [leave-settled-1600.png](shots/current/leave-settled-1600.png)

</details>

<details><summary><b>the session fixture, band cards (&band=1)</b> — <code>leave</code></summary>

- **Slots, in order:** head “✋Your Name🖼️Your Picture📧Your Email🌂Leave the MembershipLeave the …” → field [top rule] “If you give up your membership you may not be able to rejoin: the mem…” → commit row [top rule] “🗑️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — Leave the Membership
- **Strings:** head “Leave the Membership” · notes “If you give up your membership you may not be able to rejoin: the membership will have to…”
- **All visible text:** ✋Your Name🖼️Your Picture📧Your Email🌂Leave the MembershipLeave the MembershipIf you give up your membership you may not be able to rejoin: the membership will have to decide whether to re-admit you. Leaving is immediate, and nobody has to agree.🗑️
- **Tab and rail:** tab 🌂L, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×223px at x 478, radius 8, border 0; at 390 306×243px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [leave-sessionband-1600.png](shots/current/leave-sessionband-1600.png)

</details>

### `admit` — `adm:` an admission

Rules: §9 adm:, E21, Q1371, Q1473. Keys: `adm:ap-1`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| live ladder · rung session | 1 | [adm_ap-1-live_session_founder-1600.png](shots/current/adm_ap-1-live_session_founder-1600.png) | [adm_ap-1-live_session_founder-390.png](shots/current/adm_ap-1-live_session_founder-390.png) | 🗑️ · 🏛️ | — | 0, 0 |
| live ladder · rung closing | 1 | [adm_ap-1-live_closing_founder-1600.png](shots/current/adm_ap-1-live_closing_founder-1600.png) | [adm_ap-1-live_session_founder-390.png](shots/current/adm_ap-1-live_session_founder-390.png) | 🗑️ · 🏛️ | — | 0, 0 |
| live ladder · rung closed | 1 | [adm_ap-1-live_closing_founder-1600.png](shots/current/adm_ap-1-live_closing_founder-1600.png) | [adm_ap-1-live_closed_founder-390.png](shots/current/adm_ap-1-live_closed_founder-390.png) | 🗑️ · 🏛️ | — | 0, 0 |

<details><summary><b>live ladder · rung session</b> — <code>adm:ap-1</code></summary>

- **Slots, in order:** head “🪪Admit Thea Ollerenshaw?Admit Thea Ollerenshaw?” → field [top rule] “TOThea Ollerenshawthea@ladder.invalid · I live four doors down, I can…” → commit row [top rule] “🗑️🏛️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🏛️ — nothing (disabled); radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** head “Admit Thea Ollerenshaw?” · notes “thea@ladder.invalid · I live four doors down, I can fix a sash window, and I would like t…” · options “The membership stays as it is.” “Thea Ollerenshaw joins the membership.” “Indifferent”
- **All visible text:** 🪪Admit Thea Ollerenshaw?Admit Thea Ollerenshaw?TOThea Ollerenshawthea@ladder.invalid · I live four doors down, I can fix a sash window, and I would like to join.The membership stays as it is.Prefer thisThea Ollerenshaw joins the membership.Prefer thisIndifferent🗑️🏛️
- **Tab and rail:** tab 🪪A, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×461px at x 478, radius 8, border 0; at 390 306×486px, page 390px wide, glyph travel [0,0]
- **Shot:** [adm_ap-1-live_session_founder-1600.png](shots/current/adm_ap-1-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closing</b> — <code>adm:ap-1</code></summary>

- **Slots, in order:** head “🪪Admit Thea Ollerenshaw?Admit Thea Ollerenshaw?” → field [top rule] “TOThea Ollerenshawthea@ladder.invalid · I live four doors down, I can…” → commit row [top rule] “🗑️🏛️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🏛️ — nothing (disabled); radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** head “Admit Thea Ollerenshaw?” · notes “thea@ladder.invalid · I live four doors down, I can fix a sash window, and I would like t…” · options “The membership stays as it is.” “Thea Ollerenshaw joins the membership.” “Indifferent”
- **All visible text:** 🪪Admit Thea Ollerenshaw?Admit Thea Ollerenshaw?TOThea Ollerenshawthea@ladder.invalid · I live four doors down, I can fix a sash window, and I would like to join.The membership stays as it is.Prefer thisThea Ollerenshaw joins the membership.Prefer thisIndifferent🗑️🏛️
- **Tab and rail:** tab 🪪A, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×461px at x 478, radius 8, border 0; at 390 306×486px, page 390px wide, glyph travel [0,0]
- **Shot:** [adm_ap-1-live_closing_founder-1600.png](shots/current/adm_ap-1-live_closing_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closed</b> — <code>adm:ap-1</code></summary>

- **Slots, in order:** head “🪪Admit Thea Ollerenshaw?Admit Thea Ollerenshaw?” → field [top rule] “TOThea Ollerenshawthea@ladder.invalid · I live four doors down, I can…” → commit row [top rule] “🗑️🏛️”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🏛️ — nothing (disabled); radio “Prefer this”; radio “Prefer this”; radio “Indifferent”
- **Strings:** head “Admit Thea Ollerenshaw?” · notes “thea@ladder.invalid · I live four doors down, I can fix a sash window, and I would like t…” · options “The membership stays as it is.” “Thea Ollerenshaw joins the membership.” “Indifferent”
- **All visible text:** 🪪Admit Thea Ollerenshaw?Admit Thea Ollerenshaw?TOThea Ollerenshawthea@ladder.invalid · I live four doors down, I can fix a sash window, and I would like to join.The membership stays as it is.Prefer thisThea Ollerenshaw joins the membership.Prefer thisIndifferent🗑️🏛️
- **Tab and rail:** tab 🪪A, glyph travel [0,0], clause travel [0,20]; rail no entry
- **Geometry:** 652×461px at x 478, radius 8, border 0; at 390 306×486px, page 390px wide, glyph travel [0,0]
- **Shot:** [adm_ap-1-live_closing_founder-1600.png](shots/current/adm_ap-1-live_closing_founder-1600.png)

</details>

### `stranger` — the stranger’s two

Rules: §9 stranger’s two, Q1390, reading 1194. Keys: `strlogin` `strapply`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| settled + seeded — a stranger at the door · rail 📧 | 1 | [strlogin-seat_stranger-1600.png](shots/current/strlogin-seat_stranger-1600.png) | [strlogin-seat_stranger-390.png](shots/current/strlogin-seat_stranger-390.png) | 🗑️ · 📧 | — | — |
| live ladder · rung session · rail 📧 | 1 | [strlogin-live_session_stranger-1600.png](shots/current/strlogin-live_session_stranger-1600.png) | [strlogin-live_session_stranger-390.png](shots/current/strlogin-live_session_stranger-390.png) | 🗑️ · 📧 | — | — |
| live ladder · rung session · rail 🪪 | 1 | [strapply-live_session_stranger-1600.png](shots/current/strapply-live_session_stranger-1600.png) | [strapply-live_session_stranger-390.png](shots/current/strapply-live_session_stranger-390.png) | 🗑️ · 📧 | — | — |
| live ladder · rung closed · rail 📧 | 1 | [strlogin-live_session_stranger-1600.png](shots/current/strlogin-live_session_stranger-1600.png) | [strlogin-live_session_stranger-390.png](shots/current/strlogin-live_session_stranger-390.png) | 🗑️ · 📧 | — | — |

<details><summary><b>settled + seeded — a stranger at the door · rail 📧</b> — <code>strlogin</code></summary>

- **Slots, in order:** head “📧Log In” → field → commit row [top rule] “🗑️📧”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 📧 — nothing (disabled); email field “you@example.com”
- **Strings:** —
- **All visible text:** 📧Log In🗑️📧
- **Tab and rail:** tab 📧L, glyph travel null, clause travel null; rail 📧 “📧Log InMembers log in by email”
- **Geometry:** 652×156px at x 478, radius 8, border 0; at 390 306×156px, page 390px wide
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [strlogin-seat_stranger-1600.png](shots/current/strlogin-seat_stranger-1600.png)

</details>

<details><summary><b>live ladder · rung session · rail 📧</b> — <code>strlogin</code></summary>

- **Slots, in order:** head “📧Log In” → field → commit row [top rule] “🗑️📧”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 📧 — nothing (disabled); email field “you@example.com”
- **Strings:** —
- **All visible text:** 📧Log In🗑️📧
- **Tab and rail:** tab 📧L, glyph travel null, clause travel null; rail 📧 “📧Log InMembers log in by email”
- **Geometry:** 652×156px at x 478, radius 8, border 0; at 390 306×156px, page 390px wide
- **Shot:** [strlogin-live_session_stranger-1600.png](shots/current/strlogin-live_session_stranger-1600.png)

</details>

<details><summary><b>live ladder · rung session · rail 🪪</b> — <code>strapply</code></summary>

- **Slots, in order:** head “🪪Apply for MembershipApply for Membership” → field [top rule] “Membership is by application. Your email is your identity here — the …” → commit row [top rule] “🗑️📧”
- **Dividers:** head | field; field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 📧 — nothing (disabled); email field “you@example.com”
- **Strings:** head “Apply for Membership” · notes “Membership is by application. Your email is your identity here — the link it sends is the…”
- **All visible text:** 🪪Apply for MembershipApply for MembershipMembership is by application. Your email is your identity here — the link it sends is the login, and the answer arrives on it.Your email🗑️📧
- **Tab and rail:** tab 🪪A, glyph travel null, clause travel null; rail 🪪 “🪪Apply for MembershipMembership is by application”
- **Geometry:** 652×276px at x 478, radius 8, border 0; at 390 306×295px, page 390px wide
- **Shot:** [strapply-live_session_stranger-1600.png](shots/current/strapply-live_session_stranger-1600.png)

</details>

<details><summary><b>live ladder · rung closed · rail 📧</b> — <code>strlogin</code></summary>

- **Slots, in order:** head “📧Log In” → field → commit row [top rule] “🗑️📧”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 📧 — nothing (disabled); email field “you@example.com”
- **Strings:** —
- **All visible text:** 📧Log In🗑️📧
- **Tab and rail:** tab 📧L, glyph travel null, clause travel null; rail 📧 “📧Log InMembers log in by email”
- **Geometry:** 652×156px at x 478, radius 8, border 0; at 390 306×156px, page 390px wide
- **Shot:** [strlogin-live_session_stranger-1600.png](shots/current/strlogin-live_session_stranger-1600.png)

</details>

## Identity ✋ 🖼️ 📧

### `identity` — identity ✋ 🖼️ 📧

Rules: §9 identity, Q1164, Q1165, K26, F21. Keys: `myemail` `myname` `mypic`.

| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |
|---|---|---|---|---|---|---|
| founding, unanswered (founder) · rail 📧 | 1 | [myemail-founding-1600.png](shots/current/myemail-founding-1600.png) | [myemail-founding-390.png](shots/current/myemail-founding-390.png) | 🗑️ · 🪶 | — | 0, 0 |
| founding, unanswered (founder) · rail ✋ | 1 | [myname-founding-1600.png](shots/current/myname-founding-1600.png) | [myname-founding-390.png](shots/current/myname-founding-390.png) | 🗑️ · Save | — | 0, 0 |
| founding, unanswered (founder) · rail 🖼️ | 1 | [mypic-founding-1600.png](shots/current/mypic-founding-1600.png) | [mypic-founding-390.png](shots/current/mypic-founding-390.png) | 🗑️ · Save | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail 📧 | 1 | [myemail-founding-1600.png](shots/current/myemail-founding-1600.png) | [myemail-founding-390.png](shots/current/myemail-founding-390.png) | 🗑️ · 🪶 | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail ✋ | 1 | [myname-founding-1600.png](shots/current/myname-founding-1600.png) | [myname-founding-390.png](shots/current/myname-founding-390.png) | 🗑️ · Save | — | 0, 0 |
| founding, 🌍 delegated → the founder’s own answer card · rail 🖼️ | 1 | [mypic-founding-1600.png](shots/current/mypic-founding-1600.png) | [mypic-founding-390.png](shots/current/mypic-founding-390.png) | 🗑️ · Save | — | 0, 0 |
| settled by ⏩ + seeded motions — the founder | 3 | [myname-settled-1600.png](shots/current/myname-settled-1600.png) | [myname-settled-390.png](shots/current/myname-settled-390.png) | 🗑️ · Save | — | 0, 0 |
| settled + seeded — a member (seat 1, the mover) | 3 | [myname-seat_1-1600.png](shots/current/myname-seat_1-1600.png) | [myname-seat_1-390.png](shots/current/myname-seat_1-390.png) | 🗑️ · Save | — | 0, 0 |
| founding, handed to the membership and collecting · rail 📧 | 1 | [myemail-delegated-1600.png](shots/current/myemail-delegated-1600.png) | [myemail-delegated-390.png](shots/current/myemail-delegated-390.png) | 🗑️ · 🪶 | — | 0, 0 |
| the session fixture, band cards (&band=1) | 3 | [myname-sessionband-1600.png](shots/current/myname-sessionband-1600.png) | [myname-sessionband-390.png](shots/current/myname-sessionband-390.png) | 🗑️ · Save | — | 0, 0 |
| the closed page, band cards (&closed=1&band=1) | 3 | [myname-closedband-1600.png](shots/current/myname-closedband-1600.png) | [myname-closedband-390.png](shots/current/myname-closedband-390.png) | 🗑️ · Save | — | 0, 0 |
| live ladder · rung constitution | 1 | [myname-live_constitution_founder-1600.png](shots/current/myname-live_constitution_founder-1600.png) | [myname-live_constitution_founder-390.png](shots/current/myname-live_constitution_founder-390.png) | 🗑️ · Save | — | 0, 0 |
| live ladder · rung ready | 1 | [myname-live_constitution_founder-1600.png](shots/current/myname-live_constitution_founder-1600.png) | [myname-live_ready_founder-390.png](shots/current/myname-live_ready_founder-390.png) | 🗑️ · Save | — | 0, 0 |
| live ladder · rung session | 1 | [myname-live_session_founder-1600.png](shots/current/myname-live_session_founder-1600.png) | [myname-live_session_founder-390.png](shots/current/myname-live_session_founder-390.png) | 🗑️ · Save | — | 0, 0 |
| live ladder · rung closing | 1 | [myname-live_closing_founder-1600.png](shots/current/myname-live_closing_founder-1600.png) | [myname-live_session_founder-390.png](shots/current/myname-live_session_founder-390.png) | 🗑️ · Save | — | 0, 0 |
| live ladder · rung closed | 1 | [myname-live_closed_founder-1600.png](shots/current/myname-live_closed_founder-1600.png) | [myname-live_closed_founder-390.png](shots/current/myname-live_closed_founder-390.png) | 🗑️ · Save | — | 0, 0 |

<details><summary><b>founding, unanswered (founder) · rail 📧</b> — <code>myemail</code></summary>

- **Slots, in order:** head “📧Enter Your Email” → field → commit row [top rule] “🗑️🪶”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🪶 — nothing (disabled); email field “you@example.com”
- **Strings:** —
- **All visible text:** 📧Enter Your Email🗑️🪶
- **Tab and rail:** tab 📧E, glyph travel [0,0], clause travel [0,17]; rail 📧 “📧Enter Your Email”
- **Geometry:** 652×156px at x 478, radius 8, border 0; at 390 306×156px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [myemail-founding-1600.png](shots/current/myemail-founding-1600.png)

</details>

<details><summary><b>founding, unanswered (founder) · rail ✋</b> — <code>myname</code></summary>

- **Slots, in order:** head “✋Choose Your Name🖼️Choose Your Picture📧Your Email” → field “Choose thisAnonymousChoose this” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — nothing (disabled); radio “Choose this”; radio “Choose this”; text field “Your name”
- **Strings:** options “” “Anonymous”
- **All visible text:** ✋Choose Your Name🖼️Choose Your Picture📧Your EmailChoose thisAnonymousChoose this🗑️
- **Tab and rail:** tab ✋Ch, glyph travel [0,0], clause travel [0,55]; rail ✋ “✋Choose Your Name”
- **Geometry:** 652×281px at x 478, radius 8, border 0; at 390 306×281px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [myname-founding-1600.png](shots/current/myname-founding-1600.png)

</details>

<details><summary><b>founding, unanswered (founder) · rail 🖼️</b> — <code>mypic</code></summary>

- **Slots, in order:** head “🖼️Choose Your Picture✋Your Name📧Your Email” → field “ALChoose thisUpload an imageChoose thisPick an emojiChoose this” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”
- **Strings:** options “AL” “Upload an image” “Pick an emoji”
- **All visible text:** 🖼️Choose Your Picture✋Your Name📧Your EmailALChoose thisUpload an imageChoose thisPick an emojiChoose this🗑️
- **Tab and rail:** tab 🖼️, glyph travel [0,0], clause travel [0,55]; rail 🖼️ “🖼️Choose Your Picture”
- **Geometry:** 652×378px at x 478, radius 8, border 0; at 390 306×378px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [mypic-founding-1600.png](shots/current/mypic-founding-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail 📧</b> — <code>myemail</code></summary>

- **Slots, in order:** head “📧Enter Your Email” → field → commit row [top rule] “🗑️🪶”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🪶 — nothing (disabled); email field “you@example.com”
- **Strings:** —
- **All visible text:** 📧Enter Your Email🗑️🪶
- **Tab and rail:** tab 📧E, glyph travel [0,0], clause travel [0,17]; rail 📧 “📧Enter Your Email”
- **Geometry:** 652×156px at x 478, radius 8, border 0; at 390 306×156px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [myemail-founding-1600.png](shots/current/myemail-founding-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail ✋</b> — <code>myname</code></summary>

- **Slots, in order:** head “✋Choose Your Name🖼️Choose Your Picture📧Your Email” → field “Choose thisAnonymousChoose this” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — nothing (disabled); radio “Choose this”; radio “Choose this”; text field “Your name”
- **Strings:** options “” “Anonymous”
- **All visible text:** ✋Choose Your Name🖼️Choose Your Picture📧Your EmailChoose thisAnonymousChoose this🗑️
- **Tab and rail:** tab ✋Ch, glyph travel [0,0], clause travel [0,55]; rail ✋ “✋Choose Your Name”
- **Geometry:** 652×281px at x 478, radius 8, border 0; at 390 306×281px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [myname-founding-1600.png](shots/current/myname-founding-1600.png)

</details>

<details><summary><b>founding, 🌍 delegated → the founder’s own answer card · rail 🖼️</b> — <code>mypic</code></summary>

- **Slots, in order:** head “🖼️Choose Your Picture✋Your Name📧Your Email” → field “ALChoose thisUpload an imageChoose thisPick an emojiChoose this” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — nothing (disabled); radio “Choose this”; radio “Choose this”; radio “Choose this”
- **Strings:** options “AL” “Upload an image” “Pick an emoji”
- **All visible text:** 🖼️Choose Your Picture✋Your Name📧Your EmailALChoose thisUpload an imageChoose thisPick an emojiChoose this🗑️
- **Tab and rail:** tab 🖼️, glyph travel [0,0], clause travel [0,55]; rail 🖼️ “🖼️Choose Your Picture”
- **Geometry:** 652×378px at x 478, radius 8, border 0; at 390 306×378px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [mypic-founding-1600.png](shots/current/mypic-founding-1600.png)

</details>

<details><summary><b>settled by ⏩ + seeded motions — the founder</b> — <code>myname</code></summary>

- **Slots, in order:** head “✋Your Name🖼️Your Picture📧Your Email🌂Leave the Membership” → field “Ash BellamyChosenChoose thisAnonymousChoose this” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — Save; radio “Chosen” (on); radio “Choose this”; radio “Choose this”; text field “Your name”
- **Strings:** options “Ash Bellamy [on]” “” “Anonymous”
- **All visible text:** ✋Your Name🖼️Your Picture📧Your Email🌂Leave the MembershipAsh BellamyChosenChoose thisAnonymousChoose this🗑️
- **Tab and rail:** tab ✋Yo, glyph travel [0,0], clause travel [0,55]; rail no entry
- **Geometry:** 652×372px at x 478, radius 8, border 0; at 390 306×372px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [myname-settled-1600.png](shots/current/myname-settled-1600.png) · same state: `myname` `mypic` `myemail`

</details>

<details><summary><b>settled + seeded — a member (seat 1, the mover)</b> — <code>myname</code></summary>

- **Slots, in order:** head “✋Your Name🖼️Your Picture📧Your Email🌂Leave the Membership” → field “Ivy FenChosenChoose thisAnonymousChoose this” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — Save; radio “Chosen” (on); radio “Choose this”; radio “Choose this”; text field “Your name”
- **Strings:** options “Ivy Fen [on]” “” “Anonymous”
- **All visible text:** ✋Your Name🖼️Your Picture📧Your Email🌂Leave the MembershipIvy FenChosenChoose thisAnonymousChoose this🗑️
- **Tab and rail:** tab ✋Yo, glyph travel [0,0], clause travel [0,55]; rail no entry
- **Geometry:** 652×372px at x 478, radius 8, border 0; at 390 306×372px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [myname-seat_1-1600.png](shots/current/myname-seat_1-1600.png) · same state: `myname` `mypic` `myemail`

</details>

<details><summary><b>founding, handed to the membership and collecting · rail 📧</b> — <code>myemail</code></summary>

- **Slots, in order:** head “📧Enter Your Email” → field → commit row [top rule] “🗑️🪶”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button 🪶 — nothing (disabled); email field “you@example.com”
- **Strings:** —
- **All visible text:** 📧Enter Your Email🗑️🪶
- **Tab and rail:** tab 📧E, glyph travel [0,0], clause travel [0,17]; rail 📧 “📧Enter Your Email”
- **Geometry:** 652×156px at x 478, radius 8, border 0; at 390 306×156px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [myemail-delegated-1600.png](shots/current/myemail-delegated-1600.png)

</details>

<details><summary><b>the session fixture, band cards (&band=1)</b> — <code>myname</code></summary>

- **Slots, in order:** head “✋Your Name🖼️Your Picture📧Your Email🌂Leave the Membership” → field “Ash BellamyChosenChoose thisAnonymousChoose this” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — Save; radio “Chosen” (on); radio “Choose this”; radio “Choose this”; text field “Your name”
- **Strings:** options “Ash Bellamy [on]” “” “Anonymous”
- **All visible text:** ✋Your Name🖼️Your Picture📧Your Email🌂Leave the MembershipAsh BellamyChosenChoose thisAnonymousChoose this🗑️
- **Tab and rail:** tab ✋Yo, glyph travel [0,0], clause travel [0,55]; rail no entry
- **Geometry:** 652×372px at x 478, radius 8, border 0; at 390 306×372px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [myname-sessionband-1600.png](shots/current/myname-sessionband-1600.png) · same state: `myname` `mypic` `myemail`

</details>

<details><summary><b>the closed page, band cards (&closed=1&band=1)</b> — <code>myname</code></summary>

- **Slots, in order:** head “✋Your Name🖼️Your Picture📧Your Email” → field “Ash BellamyChosenChoose thisAnonymousChoose this” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — Save; radio “Chosen” (on); radio “Choose this”; radio “Choose this”; text field “Your name”
- **Strings:** —
- **All visible text:** ✋Your Name🖼️Your Picture📧Your EmailAsh BellamyChosenChoose thisAnonymousChoose this🗑️
- **Tab and rail:** tab ✋Yo, glyph travel [0,0], clause travel [0,55]; rail no entry
- **Geometry:** 652×372px at x 478, radius 8, border 0; at 390 306×372px, page 390px wide, glyph travel [0,0]
- **card-audit:** S1: .setupcard — padding-t 14px · padding-b 14px; S1: .headclause — padding-t 6px · padding-b 6px
- **Shot:** [myname-closedband-1600.png](shots/current/myname-closedband-1600.png) · same state: `myname` `mypic` `myemail`

</details>

<details><summary><b>live ladder · rung constitution</b> — <code>myname</code></summary>

- **Slots, in order:** head “✋Your Name🖼️Your Picture📧Your Email” → field “Ash BellamyChosenChoose thisAnonymousChoose this” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — Save; radio “Chosen” (on); radio “Choose this”; radio “Choose this”; text field “Your name”
- **Strings:** options “Ash Bellamy [on]” “” “Anonymous”
- **All visible text:** ✋Your Name🖼️Your Picture📧Your EmailAsh BellamyChosenChoose thisAnonymousChoose this🗑️
- **Tab and rail:** tab ✋Yo, glyph travel [0,0], clause travel [0,123.81]; rail no entry
- **Geometry:** 652×372px at x 478, radius 8, border 0; at 390 306×372px, page 390px wide, glyph travel [0,0]
- **Shot:** [myname-live_constitution_founder-1600.png](shots/current/myname-live_constitution_founder-1600.png)

</details>

<details><summary><b>live ladder · rung ready</b> — <code>myname</code></summary>

- **Slots, in order:** head “✋Your Name🖼️Your Picture📧Your Email” → field “Ash BellamyChosenChoose thisAnonymousChoose this” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — Save; radio “Chosen” (on); radio “Choose this”; radio “Choose this”; text field “Your name”
- **Strings:** options “Ash Bellamy [on]” “” “Anonymous”
- **All visible text:** ✋Your Name🖼️Your Picture📧Your EmailAsh BellamyChosenChoose thisAnonymousChoose this🗑️
- **Tab and rail:** tab ✋Yo, glyph travel [0,0], clause travel [0,123.81]; rail no entry
- **Geometry:** 652×372px at x 478, radius 8, border 0; at 390 306×372px, page 390px wide, glyph travel [0,0]
- **Shot:** [myname-live_constitution_founder-1600.png](shots/current/myname-live_constitution_founder-1600.png)

</details>

<details><summary><b>live ladder · rung session</b> — <code>myname</code></summary>

- **Slots, in order:** head “✋Your Name🖼️Your Picture📧Your Email🌂Leave the Membership” → field “Ash BellamyChosenChoose thisAnonymousChoose this” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — Save; radio “Chosen” (on); radio “Choose this”; radio “Choose this”; text field “Your name”
- **Strings:** options “Ash Bellamy [on]” “” “Anonymous”
- **All visible text:** ✋Your Name🖼️Your Picture📧Your Email🌂Leave the MembershipAsh BellamyChosenChoose thisAnonymousChoose this🗑️
- **Tab and rail:** tab ✋Yo, glyph travel [0,0], clause travel [0,123.82]; rail no entry
- **Geometry:** 652×372px at x 478, radius 8, border 0; at 390 306×372px, page 390px wide, glyph travel [0,0]
- **Shot:** [myname-live_session_founder-1600.png](shots/current/myname-live_session_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closing</b> — <code>myname</code></summary>

- **Slots, in order:** head “✋Your Name🖼️Your Picture📧Your Email🌂Leave the Membership” → field “Ash BellamyChosenChoose thisAnonymousChoose this” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — Save; radio “Chosen” (on); radio “Choose this”; radio “Choose this”; text field “Your name”
- **Strings:** options “Ash Bellamy [on]” “” “Anonymous”
- **All visible text:** ✋Your Name🖼️Your Picture📧Your Email🌂Leave the MembershipAsh BellamyChosenChoose thisAnonymousChoose this🗑️
- **Tab and rail:** tab ✋Yo, glyph travel [0,0], clause travel [0,123.82]; rail no entry
- **Geometry:** 652×372px at x 478, radius 8, border 0; at 390 306×372px, page 390px wide, glyph travel [0,0]
- **Shot:** [myname-live_closing_founder-1600.png](shots/current/myname-live_closing_founder-1600.png)

</details>

<details><summary><b>live ladder · rung closed</b> — <code>myname</code></summary>

- **Slots, in order:** head “✋Your Name🖼️Your Picture📧Your Email” → field “Ash BellamyChosenChoose thisAnonymousChoose this” → commit row [top rule] “🗑️”
- **Dividers:** field | commit row
- **Controls:** button 🗑️ — Put it back as it stands; button ? — Save; radio “Chosen” (on); radio “Choose this”; radio “Choose this”; text field “Your name”
- **Strings:** —
- **All visible text:** ✋Your Name🖼️Your Picture📧Your EmailAsh BellamyChosenChoose thisAnonymousChoose this🗑️
- **Tab and rail:** tab ✋Yo, glyph travel [0,0], clause travel [0,123.82]; rail no entry
- **Geometry:** 652×372px at x 478, radius 8, border 0; at 390 306×372px, page 390px wide, glyph travel [0,0]
- **Shot:** [myname-live_closed_founder-1600.png](shots/current/myname-live_closed_founder-1600.png)

</details>

## Non-card zones

Cropped by `tools/zone-shots.mjs` (fixture: the birth, the mail modal, the save, ⏩ settled, a member, the stranger's door, the session, the sheet break, edit mode, the session band, the closed page and its foot) and one full-window shot per live rung × seat.

| zone | state | 1600 | 390 | box @1600 (x, y, w, h) | what it holds @1600 |
|---|---|---|---|---|---|
| page | birth | [page-birth-1600.png](shots/current/page-birth-1600.png) | [page-birth-390.png](shots/current/page-birth-390.png) | 0, 0, 1600, 1000 |  |
| topbar | birth | [topbar-birth-1600.png](shots/current/topbar-birth-1600.png) | [topbar-birth-390.png](shots/current/topbar-birth-390.png) | 0, 0, 1600, 49 | 🪶🪶🪶🪶Untitled reading only ✏️ ✒️ 🛡️ 🏛️ |
| rail | birth | [rail-birth-1600.png](shots/current/rail-birth-1600.png) | — | 1200, 67, 318, 56 | 🪶Name the Document |
| band | birth | zero box | zero box | 463, 219, 682, 0 |  |
| alphaflag | birth | [alphaflag-birth-1600.png](shots/current/alphaflag-birth-1600.png) | [alphaflag-birth-390.png](shots/current/alphaflag-birth-390.png) | 10, 963, 189, 27 | Warning: docs.vote is in alpha! |
| devswitch | birth | [devswitch-birth-1600.png](shots/current/devswitch-birth-1600.png) | [devswitch-birth-390.png](shots/current/devswitch-birth-390.png) | 10, 924, 409, 29 | dev · viewing as Unnamed founder 🎩— an applicant— a stranger ⏩ settle the founding |
| mailmodal | sent | [mailmodal-sent-1600.png](shots/current/mailmodal-sent-1600.png) | [mailmodal-sent-390.png](shots/current/mailmodal-sent-390.png) | 0, 0, 1600, 1000 | docs.voteto ada@example.org✕ Create “Hollow Oak Club Charter” You have named a document Hollow Oak Club Charter and chosen its address, docs.vote/d/h… |
| page | mailmodal | [page-mailmodal-1600.png](shots/current/page-mailmodal-1600.png) | [page-mailmodal-390.png](shots/current/page-mailmodal-390.png) | 0, 0, 1600, 1000 |  |
| page | saved | [page-saved-1600.png](shots/current/page-saved-1600.png) | [page-saved-390.png](shots/current/page-saved-390.png) | 0, 0, 1600, 1000 |  |
| topbar | saved | [topbar-saved-1600.png](shots/current/topbar-saved-1600.png) | [topbar-saved-390.png](shots/current/topbar-saved-390.png) | 0, 0, 1600, 49 | 🪶Hollow Oak Club Charter reading only ✏️ ✒️ 🛡️ 🏛️ |
| wallets | saved | [wallets-saved-1600.png](shots/current/wallets-saved-1600.png) | [wallets-saved-390.png](shots/current/wallets-saved-390.png) | 1293, 13, 28, 24 | ✏️ |
| rail | saved | [rail-saved-1600.png](shots/current/rail-saved-1600.png) | — | 1200, 67, 318, 56 | ✋Choose Your Name 🖼️Choose Your Picture ✒️Founder Actions 🏛️Activate Your Membership |
| toc | saved | [toc-saved-1600.png](shots/current/toc-saved-1600.png) | — | 96, 67, 210, 107 | ▸Rules ▸Membership Hollow Oak Club Charter |
| band | saved | [band-saved-1600.png](shots/current/band-saved-1600.png) | [band-saved-390.png](shots/current/band-saved-390.png) | 463, 132, 682, 765 | ▸Rules 🪶Title✒️🛡️The document is titled “Hollow Oak Club Charter”. The Founder may amend this at will. 📍Link✒️🛡️The document lives at docs.vote/d… |
| page | settled | [page-settled-1600.png](shots/current/page-settled-1600.png) | [page-settled-390.png](shots/current/page-settled-390.png) | 0, 0, 1600, 1000 |  |
| topbar | settled | [topbar-settled-1600.png](shots/current/topbar-settled-1600.png) | [topbar-settled-390.png](shots/current/topbar-settled-390.png) | 0, 0, 1600, 49 | 🪶The Hollow Oak Club — House Charter closing nowquorum 1 of 3🦉MW ✏️✏️✏️+219:11 ✒️∞ 🛡️∞ 🏛️ AB |
| wallets | settled | [wallets-settled-1600.png](shots/current/wallets-settled-1600.png) | [wallets-settled-390.png](shots/current/wallets-settled-390.png) | 1154, 13, 135, 24 | ✏️✏️✏️+219:11 |
| rail | settled | [rail-settled-1600.png](shots/current/rail-settled-1600.png) | — | 1200, 67, 318, 56 |  |
| toc | settled | [toc-settled-1600.png](shots/current/toc-settled-1600.png) | — | 96, 67, 210, 195 | ▸Rules ▸Membership ▸Proposals ▸Decisions ▸Anonymity The Hollow Oak Club — House Charter |
| band | settled | [band-settled-1600.png](shots/current/band-settled-1600.png) | [band-settled-390.png](shots/current/band-settled-390.png) | 463, 266, 682, 1629 | ▸Rules 🪶Title✒️🛡️The document is titled “The Hollow Oak Club — House Charter”. The Founder may amend this at will, and refuse proposals that the me… |
| ridetab | settled | [ridetab-settled-1600.png](shots/current/ridetab-settled-1600.png) | zero box | 442, 1916, 34, 30 | 📝Text |
| page | member | [page-member-1600.png](shots/current/page-member-1600.png) | [page-member-390.png](shots/current/page-member-390.png) | 0, 0, 1600, 1000 |  |
| topbar | member | [topbar-member-1600.png](shots/current/topbar-member-1600.png) | [topbar-member-390.png](shots/current/topbar-member-390.png) | 0, 0, 1600, 49 | 🪶The Hollow Oak Club — House Charter closing nowquorum 1 of 3ABMW ✏️✏️✏️+219:10 ✒️ 🛡️ 🏛️ 🦉 |
| rail | member | [rail-member-1600.png](shots/current/rail-member-1600.png) | — | 1200, 67, 318, 56 |  |
| band | member | [band-member-1600.png](shots/current/band-member-1600.png) | [band-member-390.png](shots/current/band-member-390.png) | 463, 266, 682, 1629 | ▸Rules 🪶Title✒️🛡️The document is titled “The Hollow Oak Club — House Charter”. The Founder may amend this at will, and refuse proposals that the me… |
| page | door | [page-door-1600.png](shots/current/page-door-1600.png) | [page-door-390.png](shots/current/page-door-390.png) | 0, 0, 1600, 1000 |  |
| topbar | door | [topbar-door-1600.png](shots/current/topbar-door-1600.png) | [topbar-door-390.png](shots/current/topbar-door-390.png) | 0, 0, 1600, 47 | 🪶The Hollow Oak Club — House Charter closing nowquorum 1 of 3 ✏️ ✒️ 🛡️ 🏛️ ? |
| rail | door | [rail-door-1600.png](shots/current/rail-door-1600.png) | — | 1200, 65, 318, 56 | 📧Log InMembers log in by email |
| band | door | [band-door-1600.png](shots/current/band-door-1600.png) | [band-door-390.png](shots/current/band-door-390.png) | 463, 265, 682, 1391 | ▸Rules 🪶Title✒️🛡️The document is titled “The Hollow Oak Club — House Charter”. The Founder may amend this at will, and refuse proposals that the me… |
| page | session | [page-session-1600.png](shots/current/page-session-1600.png) | [page-session-390.png](shots/current/page-session-390.png) | 0, 0, 1600, 1000 |  |
| topbar | session | [topbar-session-1600.png](shots/current/topbar-session-1600.png) | [topbar-session-390.png](shots/current/topbar-session-390.png) | 0, 0, 1600, 49 | 🪶The Hollow Oak Club — House Charter 2h 00m leftquorum 1 of 3🦉MW ✏️✏️✏️+219:12 ✒️∞ 🛡️∞ 🏛️ AB |
| wallets | session | [wallets-session-1600.png](shots/current/wallets-session-1600.png) | [wallets-session-390.png](shots/current/wallets-session-390.png) | 1154, 13, 135, 24 | ✏️✏️✏️+219:12 |
| toc | session | [toc-session-1600.png](shots/current/toc-session-1600.png) | [toc-session-390.png](shots/current/toc-session-390.png) | 96, 67, 210, 926 | ▸Rules ▸Membership ▸Proposals ▸Decisions ▸Anonymity The Hollow Oak Club — House Charter ▸Part I — The Club ▸Founding ▸Purpose ▸Name and Seat ▸The Tru… |
| rail | session | [rail-session-1600.png](shots/current/rail-session-1600.png) | [rail-session-390.png](shots/current/rail-session-390.png) | 1200, 67, 318, 14531 | ‘The armchair…’ or ‘before’ …The joke about Hollis is lovely and it is not a rule. Charters that wink at people age badly, and whoever inherits this … |
| doc | session | [doc-session-1600.png](shots/current/doc-session-1600.png) | [doc-session-390.png](shots/current/doc-session-390.png) | 330, 67, 860, 15479 | 📝Text The Hollow Oak Club — House Charter The Hollow Oak Club exists so that its members may have a place of their own: to meet, make, cook, argue, … |
| ridetab | session | [ridetab-session-1600.png](shots/current/ridetab-session-1600.png) | zero box | 442, 140, 34, 30 | 📝Text |
| editdoor | session | [editdoor-session-1600.png](shots/current/editdoor-session-1600.png) | zero box | 1154, 904, 72, 72 | 📝 |
| page | sheetbreak | [page-sheetbreak-1600.png](shots/current/page-sheetbreak-1600.png) | [page-sheetbreak-390.png](shots/current/page-sheetbreak-390.png) | 0, 0, 1600, 1000 | the desk between the Rules and the Text sheets (.docsep) |
| page | editmode | [page-editmode-1600.png](shots/current/page-editmode-1600.png) | [page-editmode-390.png](shots/current/page-editmode-390.png) | 0, 0, 1600, 1000 |  |
| proposalrow | editmode | [proposalrow-editmode-1600.png](shots/current/proposalrow-editmode-1600.png) | [proposalrow-editmode-390.png](shots/current/proposalrow-editmode-390.png) | 478, 920, 652, 80 | 🗑️✏️ |
| lanectl | editmode | [lanectl-editmode-1600.png](shots/current/lanectl-editmode-1600.png) | [lanectl-editmode-390.png](shots/current/lanectl-editmode-390.png) | 1062, 109, 60, 22 | BI |
| band | session | [band-session-1600.png](shots/current/band-session-1600.png) | [band-session-390.png](shots/current/band-session-390.png) | 463, 266, 682, 309 | ▸Rules The Hollow Oak Club — House Charter |
| page | session-band | [page-session-band-1600.png](shots/current/page-session-band-1600.png) | [page-session-band-390.png](shots/current/page-session-band-390.png) | 0, 0, 1600, 1000 |  |
| page | closed | [page-closed-1600.png](shots/current/page-closed-1600.png) | [page-closed-390.png](shots/current/page-closed-390.png) | 0, 0, 1600, 1000 |  |
| topbar | closed | [topbar-closed-1600.png](shots/current/topbar-closed-1600.png) | [topbar-closed-390.png](shots/current/topbar-closed-390.png) | 0, 0, 1600, 49 | 🪶The Hollow Oak Club — House Charter Closed 25 Septemberquorum 1 of 3🦉 ✏️✏️✏️+219:12 ✒️∞ 🛡️∞ 🏛️ AB |
| wallets | closed | [wallets-closed-1600.png](shots/current/wallets-closed-1600.png) | [wallets-closed-390.png](shots/current/wallets-closed-390.png) | 1154, 13, 135, 24 | ✏️✏️✏️+219:12 |
| rail | closed | [rail-closed-1600.png](shots/current/rail-closed-1600.png) | — | 1200, 67, 318, 15451 | ‘The armchair…’ or ‘before’ …The joke about Hollis is lovely and it is not a rule. Charters that wink at people age badly, and whoever inherits this … |
| toc | closed | [toc-closed-1600.png](shots/current/toc-closed-1600.png) | — | 96, 67, 210, 926 | ▸Rules ▸Membership ▸Proposals ▸Decisions ▸Anonymity The Hollow Oak Club — House Charter ▸Part I — The Club ▸Founding ▸Purpose ▸Name and Seat ▸The Tru… |
| band | closed | [band-closed-1600.png](shots/current/band-closed-1600.png) | [band-closed-390.png](shots/current/band-closed-390.png) | 463, 266, 682, 309 | ▸Rules The Hollow Oak Club — House Charter |
| page | closed-foot | [page-closed-foot-1600.png](shots/current/page-closed-foot-1600.png) | [page-closed-foot-390.png](shots/current/page-closed-foot-390.png) | 0, 15780, 1600, 1000 | the backlog and signatures at the closed page foot |
| sheetbar | peek | — | [sheetbar-peek-390.png](shots/current/sheetbar-peek-390.png) | — |  |
| page | sheet-raised | — | [page-sheet-raised-390.png](shots/current/page-sheet-raised-390.png) | — |  |
| page | drawer-left | — | [page-drawer-left-390.png](shots/current/page-drawer-left-390.png) | — |  |

**Live ladder pages** (rung × seat × width): [page-live_closed_founder-1600.png](shots/current/page-live_closed_founder-1600.png) · [page-live_closed_founder-390.png](shots/current/page-live_closed_founder-390.png) · [page-live_closed_m-1-1600.png](shots/current/page-live_closed_m-1-1600.png) · [page-live_closed_m-1-390.png](shots/current/page-live_closed_m-1-390.png) · [page-live_closed_m-2-1600.png](shots/current/page-live_closed_m-2-1600.png) · [page-live_closed_m-2-390.png](shots/current/page-live_closed_m-2-390.png) · [page-live_closed_stranger-1600.png](shots/current/page-live_closed_stranger-1600.png) · [page-live_closed_stranger-390.png](shots/current/page-live_closed_stranger-390.png) · [page-live_closing_founder-1600.png](shots/current/page-live_closing_founder-1600.png) · [page-live_closing_founder-390.png](shots/current/page-live_closing_founder-390.png) · [page-live_closing_m-1-1600.png](shots/current/page-live_closing_m-1-1600.png) · [page-live_closing_m-1-390.png](shots/current/page-live_closing_m-1-390.png) · [page-live_closing_m-2-1600.png](shots/current/page-live_closing_m-2-1600.png) · [page-live_closing_m-2-390.png](shots/current/page-live_closing_m-2-390.png) · [page-live_constitution_founder-1600.png](shots/current/page-live_constitution_founder-1600.png) · [page-live_constitution_founder-390.png](shots/current/page-live_constitution_founder-390.png) · [page-live_constitution_m-1-1600.png](shots/current/page-live_constitution_m-1-1600.png) · [page-live_constitution_m-1-390.png](shots/current/page-live_constitution_m-1-390.png) · [page-live_ready_founder-1600.png](shots/current/page-live_ready_founder-1600.png) · [page-live_ready_founder-390.png](shots/current/page-live_ready_founder-390.png) · [page-live_ready_m-1-1600.png](shots/current/page-live_ready_m-1-1600.png) · [page-live_ready_m-1-390.png](shots/current/page-live_ready_m-1-390.png) · [page-live_ready_m-2-1600.png](shots/current/page-live_ready_m-2-1600.png) · [page-live_ready_m-2-390.png](shots/current/page-live_ready_m-2-390.png) · [page-live_session_founder-1600.png](shots/current/page-live_session_founder-1600.png) · [page-live_session_founder-390.png](shots/current/page-live_session_founder-390.png) · [page-live_session_m-1-1600.png](shots/current/page-live_session_m-1-1600.png) · [page-live_session_m-1-390.png](shots/current/page-live_session_m-1-390.png) · [page-live_session_m-2-1600.png](shots/current/page-live_session_m-2-1600.png) · [page-live_session_m-2-390.png](shots/current/page-live_session_m-2-390.png) · [page-live_session_stranger-1600.png](shots/current/page-live_session_stranger-1600.png) · [page-live_session_stranger-390.png](shots/current/page-live_session_stranger-390.png)

**Zone notes.** The topbar holds, left to right, 🪶 and the title; pulse · clock · quorum · the room's faces; the wallets (✏️ count and drip clock, ✒️ ∞, 🛡️ ∞, 🏛️) and `me` — see the topbar shots. At 390 the topbar is two rows, the right rail is the `task-sheet` (peek and raised), the contents rail the left drawer, and the floating 📝 and the riding tab are not drawn. The band at the birth has no box — the birth is one sheet with the title and link in `#titlepara`. The closed page folds *Rules* by default; the closed-band walk unfolds it.

## Instrument errors

