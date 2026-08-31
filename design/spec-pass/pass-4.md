# Pass 4 — the card pattern census (2026-08-31)

The extraction of record for pass 4. Target: SURFACE §9.3 (CP1–CP7, Ed's rulings Q1096–Q1102, folded 2026-08-31). Instrument: `card-audit` at 1600×1000, all seven walks — 270 card openings, 107 distinct keys, payload reduced to a per-card × per-state grammar table (head, option blocks, radio labels, rationale input, left slot, right commit set). Questions Q1103–Q1108 are asked in `pass-4.html`; findings are fixed unless vetoed. This file is deleted when the pass folds.

## The census, by family

| family (keys) | states measured | as built | vs the pattern |
|---|---|---|---|
| founder setting cards (admission, applications, authorship, bar, chamber, ending, judgments, lapse, quorum, rate, removal, hat, shape) | founding · answers · delegated | options are `lanepick` sentences (the sentence is the radio), hairline-less; 🗑️ + ✒️ (🪶 for shape) commit, dark until answered; no rationale (first set) | **CP1 unbuilt**: no option blocks, no per-option radio. CP3 ✓ (no rationale on first set). CP7 ✓ (🗑️ present) |
| blind answer cards (ans-*) | answers | rungs as lanepick; 🗑️ + disabled commit **labelled "Not answered yet"** | **CP1 unbuilt**; commit label states the state, not the act (§9 row says *✓ Answer*) — Q1107 |
| composers (settled settings, both seats) | settled · seat:1 | alternatives carry **Prefer this** ✓; rationale lane ✓; 🗑️ ✓; route commits ✒️/✏️/🏛️ by value, paired per K29 (title, chamber, rate, pace, slug) ✓ | **conforms CP1/CP2/CP3/CP5** — the composer is the pattern's exemplar. Numeric settings (bar, quorum, lapse, rate, slug) compose as a value inside the sentence, no blocks — Q1104 |
| power cards (pw:a:*, pw:u:* × 16) | settled · seat:1 | two blocks, radios **Choose this / Chosen**, 🗑️ + ✒️ | **CP2 unbuilt**: labels → Prefer this / Preferred (K4's other-half rule survives relabelled) |
| judgment cards (quick-*, insert-*, race-*, patch-*: ~30) | charter · closed | Prefer this / Indifferent radios ✓; **no 🗑️ anywhere**; **Indifferent sits in the commit row**; ❄️ on the 🔥 card ✓; judged state shows *Recorded — choose again to change it* in the row | **CP4 + CP7 unbuilt**: Indifferent becomes a textless option block, 🗑️ joins the row's left. §9's table rows matched the page (the C4 contradiction was real drift, not a table error). CP3 ✓ — no rationale input, candidates' rationales are display only |
| deadlock ⚔️ (race-sanctions) | charter | 🗑️ + ✏️ hold; `edit-why` rationale input | conforms (a proposal act carries the lane) |
| sealed records (quick-calling, -knives, -lockup, race-claims, race-nomination) | charter · closed | OK only, no 🗑️ | conforms (Y20) |
| mine (mine-*) | charter · closed | 🗑️ + ✏️ Submitted (pressed) | conforms |
| settled motion records (rec:*) | settled · seat:1 · closed | 🗑️ only, no OK | conforms (Y20's *a record asks nothing*) |
| grants + gates (grant-*, canpropose, canjudge, rel:*) | founding · settled · seat:1 | 🗑️ + Take-verb / OK | conforms CP5. **B6 finding**: their OK is 11.52px where the charter's is 14px |
| 🍾 begin | founding · answers · settled | power table as switches (✒️/🛡️ Kept · Laid down · Mixed); 🗑️ + 🍾 Begin | conforms CP5; switches are not a multiple choice — Q1103 (exemption from CP1/CP2) |
| doors (invite, remove) | founding · answers · settled · seat:1 | direct: field in body, commit **"Done"**; composed: 🏛️/✒️ by route + rationale ✓ | routes conform CP5/K29. The direct send's row label — Q1105. **CP6 unbuilt** (heads are price + sentence, not the people) |
| identity (myname, mypic, myemail) | all four | 🗑️ + Save / 🪶 pre-save / ✓ once verified | conforms |
| locked (hat post-🍾; title·settled) | settled · seat:1 | 🗑️ + permanently dark ✒️ (·off) | Q1106 — a forever-dark commit on a card that can never commit |
| stranger's cards (slug, title, strlogin @ seat:stranger) | seat:stranger | 🗑️ only, act in body | conforms (Y20) |
| patch site sub-blocks (quick-guests-* ×11) | charter · closed | **no commit row at all** (empty foot, no radios) | Q1108 — exempt as non-cards (the patch head carries the one row) or give them the row |

## Findings (fixed unless vetoed — no numbers, per the pass procedure)

- **F-A CP1 build**: every founder setting card and blind answer card takes the option-block grammar — option text, hairline, *Prefer this* radio beneath, commit separate. `lanepick` retires.
- **F-B CP2 build**: the 16 power cards relabel *Choose this / Chosen* → *Prefer this / Preferred*.
- **F-C CP4 + CP7 build**: judgment cards gain 🗑️ (clears the selection, closes) and Indifferent moves from the row into a textless option block whose radio reads *Indifferent*.
- **F-D CP6 build**: ✉️ and ❌ head with the pile's avatar-and-name list; price and sentence beneath.
- **F-E** commit labels are two sizes, split by surface: **every word-carrying commit on a band card is 11.52px** (`--t-cap` — OK, ✏️ Propose, 🏛️ Ask all members, ✒️/🛡️/🏛️/✏️ Take …, 🍾 Begin) where the charter's are 14px (`--t-ui` — OK, ✏️ Submitted, Indifferent). Cause: `session-view.html:138`, `.setupcard .btn:not(.glyphbtn) { font-size: var(--t-cap) }`, overriding `.btn`'s own `--t-ui` (system.css:1878) on band cards only. Audit B6 saw the OK pair; the census sized the whole split. Fix: commit-row labels take `--t-ui` everywhere — scope the page rule away from `.commitrow` buttons.
- **F-F** 📧 heads two different cards (myemail, strlogin) — one subject glyph, one meaning (STYLE §1); the stranger's login card needs its own glyph or an exemption (`card-audit` G2).
- **F-G** two spacing nits off the 4px grid: `.rsub` margin-top 2px (answers·begin), `.choice` margin-left −2px (settled·pace) (`card-audit` S1).
- Accepted, not a finding: the 2px switch-pass glyph move (P7) — the tuck-under ruling of 2026-08-31 stands.

## Questions (Q1103–Q1108, asked in pass-4.html)

- **Q1103** switches outside CP1/CP2? (🍾's power table — recommend yes, a switch is not a choice among peers.)
- **Q1104** numeric/value-in-sentence composers outside CP1's block grammar? (recommend yes — CP1 governs enumerable choices.)
- **Q1105** the direct ✉️ send's row: "Done" (C4's *done here*) or the drawn closing ✓ (§9.1's own row)? (recommend ✓.)
- **Q1106** locked cards (🎩 post-🍾, closed-document cards): keep the permanently dark commit, or no commit at all? (recommend none — dark promises a thaw that never comes; Q331 adjacent.)
- **Q1107** after-state labels: judged cards' *Recorded — choose again to change it* and the blind answer's disabled *Not answered yet* — keep, or restate as the act (*✓ Answer*, greyed) with the state in the title? (recommend the act as label, state as title — the 202 ruling's logic.)
- **Q1108** patch site sub-blocks: not cards (head carries the one row — recommend), or each takes the row?

## Answers (Ed, 2026-08-31, paste-back)

F-A–F-G all stand; F-F as a recorded exemption (📧 used twice, deliberately — the G2 rule takes an EXEMPT entry, no new glyph). Q1103 **(b)**: 🍾's table becomes two columns (✒️ · 🛡️) of option blocks; `switch` retires; supersedes the backlog's switches ask. Q1104 **(b)**: numeric rungs as blocks whose text is `meaningOf`'s sentence with the number stated; *A number of my own* last, with the field. Q1105–Q1108 **(a)** as recommended → CP5 (drawn ✓ on the direct door), CP9 (no commit on a locked card), CP8 (act as label, state as title), CP7 (site sub-blocks are not cards). Folded into SURFACE §9.3 the same day; 1109–1115 released. This file stays until the family builds land and the census re-runs green.

## Instrument blind spots (stage-2b work, queued — a state not measured must not read as clean)

Never measured on any walk: the salience diagonal 🌶️ (unserved in the fixture, Q291's rule); the editing card (needs a keystroke); the `adm:` admission cards and the applicant's five (**seat:applicant offered no cards** — instrument error, needs an application seeded); the 👑 question, both kinds (needs a carried motion parked at the crown); the 🥂 closing card; a constitutional motion mid-flight (the consent picks card — walkSettled's seed answers instantly); the news family (E5 set-changed news, amendment-news, release-batch 👑, mail-give-up 📭); the closed backlog (**no U: records in the fixture**); 📝 text card in both modes; a gap-site card. Each needs either a walk extension or a hand-verification, and the pass is not closed until every row is measured or exempted with a reason.
