# Extraction — lifecycle marks · rail grammar · contents-rail marks · tab-stack / clause-tab ordering

Spec-pass extraction (step 2–4), 2026-08-22. Sources: CLAUDE.md glossary (`lifecycle mark` 323–336, `needs-you-queue` 316–322, `contents-rail` 315, `tab-stack` 351–357, `clause-tab` 347–350, `yours` 338, `lifecycle palette` 95–98, `wash` 92, `evidence-meter` 388, `setup-queue` 138–145, drawn marks 337), `design/session-view.notes.md`, `design/setup.notes.md`, and the code: `design/session.js`, `design/cards.js`, `design/setup.js`, `design/session-view.html`, `design/system.css`, `design/setup.css`. No repo file was edited.

All line numbers are from HEAD 936b554.

---

## 1. The marks table

### 1a. The charter alphabet (session.js / cards.js)

Mark kind is what `markKindOf(g)` returns (session.js:3546–3569); the glyph is `MARK[kind]` (cards.js:85–154); the hue is `anchHue(g)` (session.js:3503–3531) → `--lc-*` (system.css:80–92). "Pins" = `layoutQueue`'s `live` test (session.js:968–970); "fit-cap exempt" = the force-keep loop (session.js:1009–1013: `mosturgent` ∨ `holdsFocus` ∨ `mine`). "Columns": contents rail = `tocMarksHtml` (session.js:3617–3636), gutter = the `achip` in `renderDoc` (session.js:2751–2771 / 2783–2785), queue = `renderQueue` (session.js:598–792).

| glyph | code kind | what it says the document wants from you | hue token | pins? | teaser? | columns | click opens | drawn / emoji | fit-cap exempt? |
|---|---|---|---|---|---|---|---|---|---|
| 💡 | `needs` (session.js:3569) | a proposal; it wants your judgment | `--lc-open` yellow, alpha by urgency `washCol` 0.05–0.30 (session.js:358, 380) | **no** (session.js:968 — `needs` is not in the `live` list) | yes — the rationale(s): one per race candidate (`teasersFor`, session.js:463–481) | rail · gutter · queue | the decision card (`toggle`, session.js:790) | emoji | no |
| 🔥 | `urgent` (session.js:3568; `g.id === topUrgentId`, set in `settleTopUrgent` 588–596) | an ordinary judgment that wants you most | `--lc-open` at fixed `FLAME_A` 0.44 (session.js:392–394) | yes (968) | in markup always; hidden by `.qitem.mosturgent.offclause .qwhy {display:none}` (system.css:593) when the **anchor** is off screen (session.js:888–889) | rail · gutter · queue | the decision card, with ❄️ on its commit row | emoji | **yes** (`mosturgent`, session.js:1010) |
| ⚔️ | `stuck` (session.js:3565; `stuck(g) = deadlocked && isJudged`, 300) | a draft, not a judgment; you see it only after you have judged | `--lc-open` yellow, fixed wash 0.55 (session.js:712) | **no** (968) | yes — the one-sentence *Deadlocked — n people can't agree… Can you propose…* (session.js:468–469); no caption (689) | rail · gutter · queue | the `deadlock-card` | emoji | no |
| 🌶️ | `weigh` (session.js:3567; `kind === 'diagonal'`) | which of two questions is hotter | `--lc-weigh` pink (system.css:81) | yes (968) | none (`teasersFor` returns `[]`, session.js:478); title over four lines `.qprio` (716–718); fill forced `100%` (725) | queue (one entry, at the earlier clause) · gutter · **rail: only if it survives the cap — `weigh` is not in `KEEP_ORDER`** (see finding D7) | the `salience-diagonal` card | emoji | no (not `mosturgent`, not `mine`) |
| ⏳ | `deciding` (session.js:3566) | nothing — you have judged; still running; revisable | `--lc-deciding` grey (system.css:82; identical RGB to `--lc-closed`) | no (flows) | no — one line (`oneLine`, session.js:697, 727–729); caption only as tooltip | rail · gutter · queue | the decision card, revisable | emoji | no |
| ↻ | `shifted` (session.js:3566; `g.shifted`) | nothing yet — that judgment is void; the pair will be re-served | entry/clause wash `closed` grey (session.js:3517, 712); **glyph itself coloured `--primary` blue** (system.css:414 `.mk-shifted`) | no (flows) | no — one line, tooltip = `g.shifted` text (707) | rail · gutter · queue | the card, with the wording you judged against | a character (`'↻'`, cards.js:132) but listed in `DRAWN` (cards.js:157) so it takes `.mk` colouring | no |
| ✔ green | `adopted` (session.js:3551; `sealed && isUnread && carried`) | an OK — the charter changed here and you have not acknowledged it | `--lc-changed` green wash (session.js:3508); glyph `var(--ok)` (system.css:412) | yes (`isUnread`, 969) | no — one line + `when` (611–620) | rail · gutter · queue | the `sealed record` with OK | drawn `TICK` (cards.js:70) | no (takes leverage 0.5, session.js:860) |
| ✖ green | `retired` (session.js:3551; `sealed && isUnread && !carried`) | an OK — the incumbent held; **pins only if you judged** (`isUnread` requires `carried ∨ youJudged`, session.js:352–353) | wash `closed` **grey** (session.js:3508 — "Green is for what changed, not for what pinned itself"); glyph `var(--ok)` green (system.css:412) | yes, when unread | no | rail · gutter · queue | the sealed record with OK | drawn `CROSS` (cards.js:71) | no |
| ✔ grey | `filedYes` (session.js:3552) | nothing; filed, and the charter changed | no wash (`anchHue` → null, 3508); glyph `var(--muted)` (system.css:413) | no (flows) | no | gutter (filed pile) · queue (full-width line, `.filed`) · **not the contents rail** (session.js:3626) | the sealed record | drawn `TICK` | no |
| ✖ grey | `filedNo` (session.js:3552) | nothing; filed, incumbent held | as above | no | no | as above | the sealed record | drawn `CROSS` | no |
| ✏️ | `propose` (session.js:3562; `stateOf === 'yours'`, i.e. `g.mine`, 285) | withdraw is the only remaining act; from first keystroke to the seal | `--lc-yours` blue (system.css:92); draft wash flat 0.20 at 100% (session.js:657–658) | yes (968) | draft: the rationale as you type it (`.qwhy`, 666–668); proposed: one line + place count (673–675) | rail · gutter · queue | the `editing-card` / your proposal | emoji | **yes** (`mine`, session.js:1010) |
| ⏸ (two bars) | `filedUndecided` (session.js:3550; `g.undecided`) | nothing; undecided at the close — the incumbent stands | glyph `var(--muted)` (system.css:413) | no | no | gutter (under `U:<raceId>` keys, session-view.html:5931) · queue · **contents rail: not filtered** (finding D8) | the record card on the closed page | drawn `PAUSE` (cards.js:76) | no |
| 📈 | not a lifecycle kind — `RAMP` (cards.js:83) is the **subject glyph** of the `pace` card (`g: window.CARDS.RAMP`, session-view.html:1316) | n/a (a subject, like 🌍 or ⏰) | takes the setup tab's `--chiphue` via `currentColor` | per setup state | per setup state | band tab · setup rail (while `ask`) | ✒️'s stack / the 📈 card | drawn, `.mkg.fill` (system.css:407; restated setup.css:112) | n/a |

Notes on the table:

- **"pins" is decided by `markKindOf`**, not by state: `const live = kind === 'urgent' || kind === 'propose' || kind === 'weigh' || isUnread(g) || holdsFocus(el)` (session.js:968–969). The open entry is a fifth pinner (`holdsFocus`).
- **Stack/TOC order uses kinds**; `KEEP_ORDER` (session.js:3576) and `STACK_ORDER` (session.js:3602–3603) are the two orderings. `weigh` is absent from `KEEP_ORDER`; `filedUndecided` is absent from both.
- **Leverage** (session.js:860–863): unread → 0.5; stuck → `0.9 + 0.1·bounty` (`DEADLOCK_FLOOR` 0.9, session.js:850); diagonal → `max(urgency, 0.75)` (`DIAGONAL_FLOOR`, 851); else `urgency`.
- `stateOf(g)` (session.js:284–286) is the underlying five-valued ladder: `sealed | yours | deciding | needs` (four values; "five" in CLAUDE.md counts `yours` as the fifth beside the judge's ladder of needs/deciding/sealed + the stuck overlay).

### 1b. The setup alphabet (setup.js `stateOf` / `markOf`)

`stateOf(c, ctx)` (setup.js:225–229) returns `yours | news | wait | ask | done`, tested in that order. `HUE` (setup.js:230) maps to `--lc-*`. `markOf(c, ctx, tab)` (setup.js:239–257) chooses the glyph. The rail entry is `railEntry` (setup.js:568–587) and its pin/rank/u meta is `entryOf` (session-view.html:3236–3244: `pinned: st !== 'wait' && st !== 'done'`, `RAIL_RANK = {ask:0, news:4, yours:6, wait:7, done:9}`, `RAIL_U = {ask:0.95, news:0.5, yours:0.5, wait:0.2, done:0}`, `mine: st === 'yours'`). Tab order is `RANK = {ask:0, news:1, yours:2, wait:3, done:4}` (setup.js:304).

| state | rail mark | tab mark | wants | hue (`HUE`, setup.js:230) | rail? | pins? | teaser? | fit-cap exempt? | click opens |
|---|---|---|---|---|---|---|---|---|---|
| `ask` | the subject glyph `c.g` (setup.js:256) | subject glyph | an answer / a set | `open` yellow, wash alpha 0.22 (setup.js:234) | yes | yes (`pinned`) | only `ctx.summary(c)` — a subtitle on motions/news (C13) | no | the setting's card |
| `wait` | ⏳ (setup.js:256) — **except a `constitutional` card, which keeps `c.g` (setup.js:255) and is then filtered out of the rail** (session-view.html:3299) | `constitutional`: subject glyph; otherwise ⏳ | nothing; fill = how far the room has got (setup.js:572–573) | `closed` grey, 0.16 | yes for 📧 / gates / 🍾 / applicant mail; **no** for constitutional waits | no (`pinned` false; flows) | no | no | the watching card |
| `news` | drawn ✔ `TICK` (setup.js:256) | drawn ✔, `var(--ok)` (setup.css:442, 445) | OK | `changed` green, 0.22 | yes | yes | `ctx.summary` = what happened | no | the news card with OK |
| `yours` | ✏️ | ✏️ | nothing — withdraw | `yours` blue | yes | yes, and force-kept (`mine`) | — | **yes** | the application |
| `done` | drawn ✔ grey (entry leaves: session-view.html:3291 filters `!== 'done'`) | **subject glyph** on grey (setup.js:246; setup.css:441) | nothing | `closed` grey, 0.16 | **no** | — | — | — | the settled card = the composer |

Gates: in the rail only as `news` (session-view.html:3291, `isGate && !isBegin && !isClosing ? stateOf === 'news'`); 💡 ⚖️ are hidden entirely until 🍾 (`hide: () => !constituted()`, CLAUDE.md:145). A ⏳ rail entry is therefore possible only for: 📧 `myemail` (`kind: 'personal'`, session-view.html:1225), 🍾 `begin`, 🥂 `closing`, the applicant's `appmail` (session-view.html:3772) and the stranger's sent card (5172).

---

## 2. Candidate rail rules (R1…)

R1. **Exactly five things pin; everything else flows beside its clause.** 🔥 (`urgent`), ✏️ (`propose`), 🌶️ (`weigh`), an unacknowledged decision (`isUnread`), and **whatever is open** (`holdsFocus`). session.js:968–970. CLAUDE.md:317 states four and omits the open entry (see D1). Setup entries: `ask`, `news`, `yours` pin; `wait` and `done` do not (session-view.html:3242).

R2. **Admission is a ranking by leverage, never a threshold.** `for (const r of [...pinned].sort((x, y) => y.u - x.u || x.want - y.want))` admits while room remains (session.js:1014–1019); nothing is too small to appear; what does not fit is `display: none` (1021–1022) and **not counted** (the +n tally is gone, 1111–1117). CLAUDE.md:320.

R3. **Three exemptions from the fit cap: 🔥, the open entry, anything of your own.** session.js:1009–1013 (`mosturgent` ∨ `holdsFocus` ∨ `mine`). CLAUDE.md:320 names two (🔥 and open); CLAUDE.md:338 (`yours`) names the third. Setup `yours` is `mine` too (session-view.html:3243).

R4. **The open entry's claim on its clause's line is absolute.** Entries above/below that cannot fit around it are cut rather than displacing it (session.js:1026–1061). CLAUDE.md:320; notes:656 ("0px, every time").

R5. **Pinned entries sit at their clause while visible and pile against the band edge in document order.** `r.top = min(max(want, bandTop), bandBot − h)` (session.js:1027); both populations sorted by `want` first (978–979). `BAND_TOP` 70 / `BAND_BOT` 24 / `QGAP` 8 (session.js:846). CLAUDE.md:319.

R6. **Ties at one clause break by the tab stack's order, then by leverage** — the one comparator both columns share. Rail: `order = want − want || rank − rank || u − u` with `rank = stackRank(kind)` (session.js:966, 977); gutter: `stackOrder = sort(stackRank(kind) || leverage desc)` (3614–3615). CLAUDE.md:318.

R7. **Leverage is judgment leverage, with three floors for what a judgment cannot measure**: unread → 0.5 (middle); stuck → `0.9 + 0.1·bounty` (top band, ordered among themselves as the bounty board would); diagonal → `max(urgency, 0.75)`. session.js:850–863. CLAUDE.md:321 states the first two; the diagonal floor 0.75 is undocumented (D9).

R8. **🔥 is the most urgent `needs` entry that is not stuck, not a diagonal, and not chilled.** `settleTopUrgent` (session.js:588–596); ❄️ toggles `chilled` (3441–3443). CLAUDE.md:335, 374.

R9. **A teaser is always in the markup; it is hidden for one case — the flame with its clause off screen — tested on the anchor's position.** session.js:757–778, 888–889; system.css:593. CLAUDE.md:325 / SURFACE Y12. ⚔️'s teaser is the deadlock sentence and it has no caption; 🌶️ has no teaser; ⏳ ↻ ✔ ✖ are one line.

R10. **The flow population steps around pinned blocks rather than hiding under them, and gives up only when nothing is in reach.** session.js:1082–1108 (`freeFor`, `clash`).

R11. **The contents rail shows at most `TOC_MARKS` = 4 marks per heading, chosen by `KEEP_ORDER`, drawn in document order, with a `+n` overflow; filed (✔/✖ grey) are removed before the choice and never counted.** session.js:3485, 3617–3636. `KEEP_ORDER = ['urgent','stuck','propose','needs','adopted','retired','deciding','shifted','filedYes','filedNo']` (3576). A folded heading takes its descendants' marks (3491–3499). A heading with exactly one question opens it (3644–3646). CLAUDE.md:315.

R12. **The stack's front is what most wants you; it is not `KEEP_ORDER`.** `STACK_ORDER = ['urgent','stuck','needs','weigh','adopted','retired','propose','deciding','shifted','filedYes','filedNo']` (session.js:3602–3603): hot marks, then decisions owed an OK, then your own, then the standing states. The difference is `propose`: third in `KEEP_ORDER` (retention), seventh in `STACK_ORDER` (priority). CLAUDE.md:352. Setup mirrors it: `RANK = {ask:0, news:1, yours:2, wait:3, done:4}` (setup.js:304) and `RAIL_RANK = {ask:0, news:4, yours:6, wait:7, done:9}` (session-view.html:3227) are both order-preserving projections of `STACK_ORDER`.

R13. **The strip does not reorder; the gutter pile opens only its front tab (index 0), which is the same index in the open strip.** `chipsFor` uses `stackOrder` for both (session.js:2351–2360); `behind` tabs are `aria-hidden` and `pointer-events: none` (2755–2757; system.css:810). CLAUDE.md:348, 354.

R14. **Slivers carry hue, not a count; they are inert.** `.chipcol.stack .achip.behind` at 42% mix, squared top (system.css:819–821) vs the 18% face (794); one target per stack (810). CLAUDE.md:353–354.

R15. **The pile is fitted, not fixed**: `fitStacks()` shrinks each stack's `--peek` to `max(1.5, min(4, (avail − 30)/(n − 1)))` against the next mark down the gutter (session.js:2254–2269). A lone tab is 30px and cannot shrink (Q308). CLAUDE.md:355.

R16. **Filed decisions live at the bottom of the open strip as their own pile, newest at the top, off the closed gutter; the pile never closes over the active card; the card grows to hold the opened pile.** `filedFor` excludes unread (session.js:2293–2297); `filedPileHtml` reverses to newest-first (2335–2351); `fitCards` (2280–2290). CLAUDE.md:356.

R17. **Decided-but-unread is not filed**: it stays with the live tabs until OK (`filedFor` requires `!isUnread`, session.js:2296). CLAUDE.md:356.

R18. **A decision announces itself if it changed the document, or if you are part of why it did not.** `isUnread = sealed && g.unread && (carried || youJudged) && !readSeals.has` (session.js:352–353). CLAUDE.md:333; SURFACE Y13.

R19. **Mark kinds, not characters, are what code compares.** Two kinds share ✔, two share ✖; `DRAWN = ['adopted','retired','filedYes','filedNo','filedUndecided','shifted']` take `.mk-<kind>` colouring (cards.js:157–162). CLAUDE.md:337.

R20. **⚔️ is tested before ⏳ everywhere** (`anchHue` 3514, `markKindOf` 3565) because it is the state that replaces it; a deadlock is invisible until you have judged (`stuck = deadlocked && isJudged`, session.js:300). CLAUDE.md:326.

R21. **The wash's alpha is the urgency ramp on a `needs` card (0.05–0.30), fixed 0.44 on 🔥, 0.55 on ⚔️, 0.16 where there is no urgency; the fill is `g.pct`, forced 100% on a diagonal and on an unproposed draft.** session.js:358, 380, 392–395, 657–658, 712, 725. Setup entries take fixed 0.16 (grey) / 0.22 (any hue) (setup.js:232–236) — a second wash-strength rule (D10).

R22. **The setup `wait` rule (Y3)**: a constitutional card waiting on the room keeps its subject glyph on the grey tab and leaves the rail; ⏳ survives only where the wait is about you. setup.js:247–256; session-view.html:3292–3299. CLAUDE.md:140.

R23. **The setup `done` rule**: the rail entry is a grey drawn ✔ and leaves; the band tab keeps its subject glyph on grey. setup.js:240–246, session-view.html:3291; setup.css:441. CLAUDE.md:143.

R24. **A gate is in the setup rail only as `news`** (session-view.html:3291) and the two gate clauses do not exist in the band until 🍾 (CLAUDE.md:145, Q529).

---

## 3. Exceptions

| # | What | Rule it breaks | Why | Ruling |
|---|---|---|---|---|
| X1 | The open entry pins and is fit-cap exempt although it is not one of the "four kinds" | R1 / C6 | its wire has to hold; under a ranking you may open something far down the order | Ed 222 (notes:161, 656) |
| X2 | A proposal of yours is fit-cap exempt although it scores 0 on judgment leverage | R2 | it carries the largest remaining act, withdraw; a ranking cannot see it | Ed 240 (CLAUDE.md:338; notes:716) |
| X3 | ⚔️ and 🌶️ are never 🔥 | R8 | 🔥 means *an ordinary judgment*; each of those asks for a different act and says so with its own glyph | CLAUDE.md:335; session.js:589–593 |
| X4 | A deadlocked race ranks near the top on bounty, not on urgency (≈0) | R7 | judgment leverage is nil precisely because drafting leverage is maximal | Ed 223 (notes:658) |
| X5 | A diagonal takes a floor of 0.75 | R7 | its urgency buried it (0.44 → eighth, one below the cut); what it buys is ordering, and it is rare and cheap | Ed 2026-08-17 (session.js:910–922) |
| X6 | 🔥's teaser is hidden while its clause is off screen | R9 | it has been decided for you; at its own clause it is an ordinary 💡 | Ed 2026-08-17, two passes (SURFACE Y12) |
| X7 | ✖ green pins only if you judged it; an untouched retired race files straight away | R1 | a receipt rather than news | SURFACE Y13 |
| X8 | ✖ green washes **grey** though its glyph is green | palette "green = news" | green is for what changed, not for what pinned itself | session.js:3504–3508 |
| X9 | ↻'s glyph is `--primary` blue while its entry and clause wash grey | palette: "one grey shared by ⏳ and ✔✖↻" (CLAUDE.md:95) | "kept at the colours the emoji happened to have" (system.css:389–393) | none recorded — see D4 |
| X10 | The filed pile is off the closed gutter, on the open strip only | R13 "one alphabet in all three columns" | the closed pile is live-only; history lives under the live tabs, one click away | Ed 294 (session.js:2320–2334) |
| X11 | 🌶️ is one rail entry at the earlier clause, not one per clause | "every entry stands beside its own clause" | a diagonal is one judgment about two questions; neither clause is where it lives | Ed 277 (session.js:522–530) |
| X12 | A draft started inside the deadlock card has no rail entry until proposed | "every proposal of yours is in the rail" | the desk is on the card you are looking at | Ed 2026-08-17 (session.js:503–516) |
| X13 | Setup `ask` wears the subject glyph as its mark | "a mark says what the document wants from you" | many questions in one state; the informative mark is *which* | Ed 2026-08-18 (setup.js:203–206) |
| X14 | Setup `done` tab keeps its subject glyph; the rail entry becomes ✔ | R23 vs "they lose their custom emoji and just become ✔s" (setup.notes.md:14–16) | the band is a menu; a menu of ✔s names nothing | Ed 2026-08-18 (setup.js:241–246) |
| X15 | A constitutional `wait` keeps its glyph and leaves the rail; ⏳ survives only where the wait is about you | R22 / the ⏳ row of the table | the tab says the rule, the queue says nothing | Ed 2026-08-21 (SURFACE Y3) |
| X16 | A setup 🔥 does not exist | R8 | the founding is single file; every question is mandatory | setup.notes.md:45–47 |
| X17 | The applicant's wizard keeps its `done` tasks in the rail | R23 | its four tasks are the whole surface | setup.notes.md:48–49 |
| X18 | Filed marks are excluded from the contents rail entirely, not merely dropped first | R11 | the rail is read as *where is there anything*; the gutter as *what has happened here* | Ed 2026-08-17 (session.js:3618–3625) |
| X19 | Unread (decided) marks stay with the live tabs, not the filed pile | R16 | still asking for its OK | session.js:2293–2297 |
| X20 | A pile never closes over the card you are reading | R16 | it would hide the tab that says where you are | session.js:2337–2341 |

---

## 4. Drift findings

D1. **"Exactly four kinds of entry pin" is five in code.** CLAUDE.md:317 — *"Exactly four kinds of entry pin: 🔥, an unacknowledged decision, a proposal of your own, and a prioritisation."* SURFACE.md:14 (C6) repeats it. Code: session.js:968–969 `const live = kind === 'urgent' || kind === 'propose' || kind === 'weigh' || isUnread(g) || holdsFocus(el);` — the open entry is a fifth. CLAUDE.md:320 does say *"🔥 and whatever is open are exempt from the fit cap"*, so the open entry's pinning is known; the "exactly four" sentence is the one that is wrong. (Resolve by rewording: four kinds pin *for what they are*; the open one pins *for being open*.)

D2. **Fit-cap exemptions: two in one sentence, three in code and in another sentence.** CLAUDE.md:320 — *"🔥 and whatever is open are exempt from the fit cap"*; session.js:1010 `if (!r.el.classList.contains('mosturgent') && !holdsFocus(r.el) && !r.mine) continue;` — `mine` (✏️, and setup `yours`) is a third. CLAUDE.md:338 states the third separately (*"force-kept beside the flame and the open card"*). Two sentences, one rule: the list at :320 should carry all three.

D3. **The contents-rail drop order is described as "dropping filed first"; code removes filed before the cap and never counts them.** CLAUDE.md:315 — *"capped at four, keeping whatever is still actionable and dropping filed first"*. Code session.js:3626 `const marks = entriesForSection(n).map(markKindOf).filter((k) => k !== 'filedYes' && k !== 'filedNo');` then the cap. So filed is not *dropped first*, it is *absent*, and the `+n` (3633) does not include it. session-view.notes.md:277–281 is staler still: *"Filed decisions drop first … Fold Part II of the charter and it collapses to ☑️✅✅🔄+1 … The count still reports everything dropped, including the quiet ones."* — the ☑️ cannot appear there any more and the count does not include filed.

D4. **↻ is blue in the glyph and grey in the palette prose.** CLAUDE.md:95 — *"one grey shared by `--lc-deciding` ⏳ and `--lc-closed` ✔✖↻"*; system.css:83 comment `/* ✖ ↻ grey — nothing to do */`. But system.css:414 `.mk-shifted { color: var(--primary); }` paints the ↻ character in the accent blue in every column (the wash behind it is grey: session.js:3517, 712). Also CLAUDE.md:337 — *"↻ stays a character — it has no partner whose weight it must equal"* — yet cards.js:157 lists `'shifted'` in `DRAWN`, so it is wrapped and coloured like the drawn marks; harmless, but the sentence implies it is outside the drawn set.

D5. **The palette note in session-view.notes.md is two generations stale.** notes:15 — *"five-part palette … `--lc-urgent` (🔥 orange), `--lc-open` (💡 ❌ yellow), `--lc-deciding` (⏳ blue), `--lc-yours` (✏️ and a green 💡 …), `--lc-closed` (✅ ❎ 🔄 ☑️ grey)"* and *"colour means you can still affect it"*. Current: system.css:80–92 (three hues + grey, no `--lc-urgent`, `--lc-changed` added, ⏳ grey, yours blue) and CLAUDE.md:95–97 (*grey means nothing is being asked of you*). notes:209 lists the old emoji alphabet (🔄 ✅ ❎ ☑️). notes:131 *"+N further off in the charter … Nothing is ever dropped silently"* contradicts CLAUDE.md:319 (*no "+n further off" tally*) and session.js:1111–1117.

D6. **"Submitting no longer closes the card" (notes:449) vs Q576.** CLAUDE.md:109 and :365 (*"Submitting closes the card and files it as ⏳ (Q576 …) — not yet built"*), SURFACE.md:98 (Y1 retired). Code still matches the notes (the card stays open after ✓). The notes file should be marked superseded; the code is a known gap, not drift.

D7. **`weigh` (🌶️) is not in `KEEP_ORDER`, so in the contents rail it is the first mark dropped — before ⏳ and ↻.** session.js:3576 `const KEEP_ORDER = ['urgent', 'stuck', 'propose', 'needs', 'adopted', 'retired', 'deciding', 'shifted', 'filedYes', 'filedNo'];` and `keepRank` returns `KEEP_ORDER.length` for a missing kind (3578–3579). CLAUDE.md:315 says the cap keeps *"whatever is still actionable"* and CLAUDE.md:97 says pink *wants something from you*. A 🌶️ is hot and actionable, and it is the one entry that is served only when you have nothing else — so a heading holding a 🌶️ and four ⏳ would show the four ⏳. (A diagonal is rare and sits in the rail anyway, so this is an inconsistency rather than a visible bug; `STACK_ORDER` does list `weigh` fourth, session.js:3602.)

D8. **`filedUndecided` (⏸) is not filtered out of the contents rail and is in neither order list.** session.js:3626 filters only `filedYes`/`filedNo`; `filedUndecided` (3550) therefore survives into the TOC on the closed page, where CLAUDE.md:315's rule (filed excluded: *"☑️ is not in the contents rail"*, session.js:3618) would exclude it. It is also missing from `KEEP_ORDER` and `STACK_ORDER` (falls to the end by the `indexOf < 0` guard), and from the `.mk-filedYes, .mk-filedNo, .mk-filedUndecided` CSS it *is* present (system.css:413). CLAUDE.md:300 calls it *"the third filed mark"*, so it belongs with the other two in both places.

D9. **`DIAGONAL_FLOOR` 0.75 is undocumented.** session.js:851 `const DIAGONAL_FLOOR = 0.75;` and 862. CLAUDE.md:321 documents the unread middle (0.5) and the deadlock top (bounty) but not the diagonal's floor; CLAUDE.md:340–345 (`salience-diagonal`) says nothing about its rank. Not a contradiction, a gap.

D10. **Two wash-strength rules.** session.js:358 `URG_LO = 0.05, URG_HI = 0.30`, :392 `FLAME_A = 0.44`, :712 stuck `0.55`; setup.js:234 `(h === 'closed' ? '0.16' : '0.22')`. A setup `ask` entry beside a charter 💡 at urgency 0.5 (0.175) is a different yellow for no stated reason; CLAUDE.md:98 documents only `FLAME_A`. The setup entries are laid out by the same `layoutQueue` with `RAIL_U` (session-view.html:3228) as their leverage, so they compete on one scale but paint on another.

D11. **CLAUDE.md:140 and :145 disagree about how gates wait.** :140 — *"Everywhere else a waiting card is ⏳ grey in the rail with its fill as the watching UI; gates wait as pile tabs only."* :145 — *"The gate clauses wait for 🍾 … This supersedes the ⏳-tab-in-the-band waiting state for these two"*, and :161 (`gate-cards`: *"it waits out of sight until 🍾"*). setup.notes.md:23 (*"except gates, which wait as pile tabs only"*) and the code comment session-view.html:3283–3287 (*"Locked, it is a ⏳ tab in the pile and nothing else"*) carry the older rule. Code: 💡 ⚖️ are hidden until `constituted()`; the remaining gates (🏛️ ✒️ 🛡️ 🍾 🥂) do show ⏳ on their tab while waiting. So :140's "gates wait as pile tabs only" is true of the grants and 🍾, false of 💡 ⚖️.

D12. **`classFor` emits a class nothing styles.** session.js:364 `const classFor = (g) => (g.mine ? 'yours' : stuck(g) ? 'wants' : 'needs');` and :693 `stateCls`; system.css has no `.queue button.wants` or `.queue button.needs` rule (grep: none; `--stuck-ink` is used only on `.bridgedesk .fieldlab`, system.css:1154). Setup's `railEntry` emits `needs` / `qwait` (setup.js:576) and only `qwait` is styled (setup.css:125–128). Not a behaviour drift, but a name in code that no longer names anything.

D13. **SURFACE.md E18 says "below 2E"; code and CLAUDE.md say "at least E".** SURFACE.md:48 — *"a member with an empty queue, below 2E"*. session.js:329–330 `(nothingToJudge() && liveQuestions() >= ROSTER)`; CLAUDE.md:340 *"served only when the document holds at least **E live questions**"*. Outside this family's sources strictly, but it is the 🌶️ row of the matrix.

D14. **CLAUDE.md:329's "1.5× routing boost (§6.2)" and "the race will ask you again" have no counterpart on the page.** session.js:3566 marks `shifted` and the card shows the judged-against wording (2363–2371); re-serving is the router's. Not drift; flagging that the sentence describes the engine, not the surface, and belongs in SPEC rather than the marks row.

D15. **`yours` is called "the fifth lifecycle state" (CLAUDE.md:338) but `stateOf` has four values.** session.js:284–286 returns `sealed | yours | deciding | needs`. The fifth is `stuck`, an overlay (`stuck(g)`, :300) rather than a state. Counting by *marks* the live alphabet is eight kinds before the filed ones. Wording, not behaviour.

D16. **setup.notes.md:14–16 quotes Ed's "they lose their custom emoji and just become ✔s" as the rule; the tab half was reversed the same day.** setup.js:241–246 and CLAUDE.md:143: the tab keeps its glyph. The notes table row (line 26) is correct; the quoted sentence above it is not.

D17. **session-view.html:3221–3224 comment vs table.** *"Ranks follow the tab stack's order (urgent · … · adopted · … · propose · deciding)"* — `RAIL_RANK = {ask:0, news:4, yours:6, wait:7, done:9}` maps `done` to 9 = `filedYes`. Consistent; noting that the mapping is hand-kept and nothing asserts it against `STACK_ORDER` (see §5).

---

## 5. What a checker could assert

Declarations, with the regex-able text:

1. `const MARK = {` … `};` — cards.js:85–154. Keys: `needs urgent stuck propose weigh deciding shifted adopted retired filedYes filedNo filedUndecided`. The marks table's *code kind* column must equal this key set, and the *glyph* column `MARK[kind]` (emoji string or `TICK`/`CROSS`/`PAUSE`).
2. `const DRAWN = ['adopted', 'retired', 'filedYes', 'filedNo', 'filedUndecided', 'shifted'];` — cards.js:157. The *drawn/emoji* column.
3. `const TICK = "<svg class=\"mkg\"…` / `const CROSS` / `const PAUSE` / `const RAMP = "<svg class=\"mkg fill\"…` — cards.js:70, 71, 76, 83.
4. `const KEEP_ORDER = [...]` — session.js:3576. Assert: every `MARK` key except the filed three appears (D7/D8 would fail today).
5. `const STACK_ORDER = [...]` — session.js:3602–3603. Assert: set equality with `MARK` keys (D8 fails today); `propose` index > `needs` index (the retention/priority split).
6. `const TOC_MARKS = 4;` — session.js:3485.
7. `const live = kind === 'urgent' || kind === 'propose' || kind === 'weigh' ||\n        isUnread(g) || holdsFocus(el);` — session.js:968–969. The *pins?* column.
8. `if (!r.el.classList.contains('mosturgent') && !holdsFocus(r.el) && !r.mine) continue;` — session.js:1010. The *fit-cap exempt* column.
9. `const leverage = (g) => (isUnread(g) ? 0.5\n    : stuck(g) ? DEADLOCK_FLOOR + …\n    : g.kind === 'diagonal' ? Math.max(g.urgency ?? 0, DIAGONAL_FLOOR)\n    : (g.urgency ?? 0));` with `const DEADLOCK_FLOOR = 0.9;` / `const DIAGONAL_FLOOR = 0.75;` — session.js:850–851, 860–863.
10. `const order = (x, y) => x.want - y.want || x.rank - y.rank || y.u - x.u;` — session.js:977; and `const stackOrder = (gs) => gs.slice().sort((a, b) => stackRank(markKindOf(a)) - stackRank(markKindOf(b)) || leverage(b) - leverage(a));` — session.js:3614–3615 (R6: both key on `stackRank` then leverage).
11. `const FLAME_A = 0.44;` — session.js:392; `const URG_LO = 0.05, URG_HI = 0.30;` — session.js:358.
12. `--lc-open:` / `--lc-weigh:` / `--lc-deciding:` / `--lc-closed:` / `--lc-changed:` / `--lc-yours:` — system.css:80–92. Assert the hue column's token names exist and that `--lc-deciding` and `--lc-closed` hold identical triples (the "one grey" claim).
13. `.mk-adopted, .mk-retired { color: var(--ok); }` / `.mk-filedYes, .mk-filedNo, .mk-filedUndecided { color: var(--muted); … }` / `.mk-shifted { color: var(--primary); }` — system.css:412–414. Assert every `DRAWN` kind has a `.mk-<kind>` rule (true today) and that the colours match the table (↻ fails the prose, D4).
14. `.qitem.mosturgent.offclause .qwhy { display: none; }` — system.css:593 (R9).
15. `const anchHue = (g) => {` — session.js:3503; `const markKindOf = (g) => {` — session.js:3546: the two ternaries must test `stuck` before `deciding` (R20) — assertable by source order of the literals `stuck(g)` and `'deciding'` inside each.
16. Setup: `const stateOf = (c, ctx) =>` — setup.js:225; `const HUE = { ask: 'open', wait: 'closed', news: 'changed', yours: 'yours', done: 'closed' };` — setup.js:230; `const RANK = { ask: 0, news: 1, yours: 2, wait: 3, done: 4 };` — setup.js:304; `return st === 'ask' ? c.g : st === 'wait' ? '⏳' : st === 'yours' ? '✏️' : TICK;` — setup.js:256 (the setup half of the table).
17. `const RAIL_RANK = { ask: 0, news: 4, yours: 6, wait: 7, done: 9 };` / `const RAIL_U = { ask: 0.95, news: 0.5, yours: 0.5, wait: 0.2, done: 0 };` — session-view.html:3227–3228 (grep -a). Assert `RAIL_RANK` is monotone in `RANK` and that each value is the `STACK_ORDER` index of the kind the comment names (`ask→urgent 0, news→adopted 4, yours→propose 6, wait→deciding 7, done→filedYes 9`).
18. `pinned: st !== 'wait' && st !== 'done'` — session-view.html:3242; the three rail filters `.filter((c) => ((c.isGate && !c.isBegin && !c.isClosing) ? stateOf(c, ctx) === 'news' : stateOf(c, ctx) !== 'done'))` and `.filter((c) => !(c.kind === 'constitutional' && stateOf(c, ctx) === 'wait'))` — session-view.html:3291, 3299 (R22–R24).
19. `.achip.st-done, .achip.st-wait { color: rgb(var(--lc-closed)); }` / `.achip.st-news { color: var(--ok); }` — setup.css:441–442; rail twins at 444–445.
20. `const filedFor = (key) => … stateOf(g) === 'sealed' && !isUnread(g)` — session.js:2293–2297 (R17), and `const gs = gs0.slice().reverse();` — session.js:2336 (newest first, R16).
21. `c.style.setProperty('--peek', Math.max(1.5, Math.min(4, (avail - 30) / (n - 1))).toFixed(2) + 'px');` — session.js:2266–2267 (R15); `.chipcol.stack .achip.behind { pointer-events: none; }` — system.css:810 (R14).
22. `const marks = entriesForSection(n).map(markKindOf).filter((k) => k !== 'filedYes' && k !== 'filedNo');` — session.js:3626 (R11; D8 wants `filedUndecided` added).

A checker reading SURFACE.md's future marks table could compare column by column: kind set ↔ `MARK` keys; drawn ↔ `DRAWN`; pins ↔ the `live` literal; exempt ↔ the `continue` literal; order columns ↔ `KEEP_ORDER` / `STACK_ORDER` / `RANK` / `RAIL_RANK`; hue ↔ the `--lc-*` block and `.mk-*` rules.
