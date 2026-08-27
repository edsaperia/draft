# SURFACE.md extracted, not culled — a proposal (Q944)

**Read-only.** Nothing in `SURFACE.md` changed in the build that wrote this file. Every
numbered item below is a **proposal**, to be approved one at a time — reply *do 3 and 7*.
A later plan applies what is approved, cites the file as it stands then, and runs where no
sibling writes `SURFACE.md`.

**Delete this file once its items are folded**, the way `design/spec-pass/` holds every
other working paper. What survives it is the reader contract in §2 below, which the
applying plan needs and which nothing else in the tree writes down.

## 0. The grounds, and the two rulings that bound them

`SURFACE.md`'s own opening line is the rule this whole proposal applies:

> Reasoning is in `design/DECISIONS.md`.

Three grounds, and only three. A fourth — *because the file is big* — does not exist here,
any more than it did for the `CLAUDE.md` pass.

1. **A reason.** Why a rule is what it is, what it replaced, what was tried and rejected.
   Destination `design/DECISIONS.md` — **surface reasons there, mechanism reasons to
   `design/SPEC-REASONING.md`** (Q564; `CLAUDE.md` *Documents*). Nothing in `SURFACE.md`
   is keyed `R-nnn`, so nothing here goes to SPEC-REASONING. Where DECISIONS.md already
   holds the reason, the move is a **pointer and no edit to DECISIONS.md at all**; where
   it does not, the text moves **verbatim** into one new dated section, the shape that file
   already keeps for every extraction.
2. **History.** *Born 2026-08-22 in spec pass 1*, *Lifted from CLAUDE.md in spec pass 2*,
   *since the rename of 2026-08-22*, *the remedy stood on 🪪 until entry 94*. History
   leaves **entirely** — DECISIONS.md's own pass sections and git already hold it. Where a
   sentence is half rule and half history, the rule half stays.
3. **Stated twice.** A rule that quantifies (a C-rule) and its instance in a section (an
   F-, M-, W- or K-rule) is **the file's stated design**, not a duplicate: *the rules that
   quantify over it*. An instance that cites its general rule in parentheses — F1 (C14),
   M1 (C6), F10 (C1), K12 (C11) — **is the pattern and is never an item here**. What is a
   duplicate is a second **full** statement of the same rule in a second place.

**Two rulings, Ed's, which the proposal may not reopen** (plan-queue backlog entry 143,
2026-08-27):

- **Refactor, not cull.** Every row and every cell of every table stays. There is no
  *retire* verdict anywhere in this document for a table row, a table cell, a rule id or a
  heading — and no *retire* at all except for pure history, meaning a sentence whose only
  content is a date, a pass number, or what the file used to say.
- **Approved line by line.** The build that wrote this file edited nothing in
  `SURFACE.md`, `design/DECISIONS.md`, `SPEC.md`, `CLAUDE.md` or `design/STYLE.md`. A
  destination is *named*, never prepared.

**Precedence.** Where an item here and `CLAUDE.md`'s *What goes in this file* disagree,
the admission rule wins and the item is withdrawn.

**Verdicts.** **keep** — nothing moves. **move** — the text leaves the file whole.
**reduce** — the rule stays, its reason or its history leaves, a pointer stays behind.
**point** — a second full statement becomes a citation of the first. Where the pass was
unsure, the verdict is **keep** with the doubt stated; there is no *maybe*.

**Byte counts are on disk, CRLF**, throughout — that is what plan-queue measures. Each
line that leaves takes its `\r` with it, so a reduce that drops a line saves its bytes plus
one. Counts are stated as information, never as an argument for an item.

---

## 1. Where the bytes are, at the tree this was written against

Measured at `5d2ac41`, 2026-08-27: **75,959 bytes on disk, 429 lines, CRLF**. Git holds it
at 75,530, the 429 CRs being the difference.

**The plan that ordered this pass measured 71,288 at `2154ccb`** — the batch's own base.
Five plans landed in `SURFACE.md` between that measurement and this reading (plan 58's Y24
and ✉️ row; 59's K28 and the editing card's sign choice; 60's *A settled motion files
behind its rule* and the `settled motion record` row; 65's ceiling passage in *Outside
`ORDER`*; 66's K2; 68's `deps-unsettled` in F19; 69's E31–E33 and C15). **The file gained
4,671 bytes in the five days the batch took to reach this plan**, which is the single most
important number in this document and is why §6's arithmetic does not land where the plan
predicted.

By section, on disk:

| § | bytes | of which table | note |
|---|---|---|---|
| preamble | 1,092 | — | two sentences and a vocabulary line |
| 1 Rules | 5,581 | — | all prose; C4 839, C16 803 |
| 2 The event matrix | 8,654 | 7,105 | plus the L1–L9 lifecycle table, no marker |
| 3 Exceptions | 5,007 | 4,660 | Y2–Y26 |
| 4 Page keys | 1,562 | ~700 | 545 of prose is the Q903 paragraph |
| 5 Things the spec used to say | 839 | — | three bullets and a lede |
| 6 Marks and the rail | 3,893 | ~2,400 | two tables |
| 6.1 Rail rules | 3,235 | — | M1–M16 and the exceptions paragraph (779) |
| 7 Wallets | 2,252 | ~1,500 | |
| 7.1 Socket states | 898 | 898 | |
| 7.2 The hold ladder | 1,167 | ~700 | |
| 7.3 Rules | 3,514 | — | W1–W16 |
| 8 The founding order and the band | 7,551 | 3,382 | *Outside `ORDER`* 1,921 · *The band* 907 · the Q942 paragraph 790 |
| **8.1 Rules** | **13,548** | — | F1–F22, all prose; F21 alone is 2,092, F19 1,995, F5 1,179 |
| 9 Card kinds | 12,159 | 10,393 + 450 | the card table and the picture table |
| 9.1 Commit-row grammar | 1,961 | 1,961 | |
| 9.2 Composer rules | 3,048 | — | K1–K28 |

Two things the plan expected to find, and did not:

- **§9's card table is not where the bulk is.** It is 10,393 bytes of cells that no reader
  parses top to bottom, and every one of them stays. Items 42 and 43 flag two cells as
  prose wearing a cell's clothes; neither is a reduce.
- **E28–E33's *unbuilt* notes are not either.** Since plan 69 landed, E31, E32 and E33 are
  built and say so; **the only Channel cells still carrying the word *unbuilt* are E28, E29
  and E30**, ~60 bytes each, all three read by `checkCommunication`. They stay.

Where the bulk actually is: **§8.1, 13,548 bytes of unbroken prose**, of which its ten
`→ why:` tails and two parentheticals are **3,948** (the eleventh tail, W6a's, is in §7.3
and is nineteen bytes). That is the pass's centre of gravity, and items 26–37 are it.

---

## 2. The reader contract

**What reads `SURFACE.md`, and what it reads.** Written from the tree
(`scripts/lib/surface-tables.mjs`, `scripts/spec-check.mjs`, `scripts/seat-matrix.mjs`),
not from the plan. An approved move is mechanical exactly to the extent this section is
right, so the applying plan should re-read it against those three files before it edits
anything — and re-read it *anyway* if a sibling has landed in `SURFACE.md` since.

**a. The seven markers, and the table after each.**
`tableAfter(rel, marker)` (`scripts/lib/surface-tables.mjs:27`, and a private verbatim copy
at `scripts/spec-check.mjs:80`) finds the literal string `<!-- spec-check: <marker> -->`,
then walks forward: it **skips any non-pipe lines before the first pipe line**, collects the
run of lines starting `|`, and **stops at the first non-pipe line after the run**. So a
blank line or a sentence *between* the marker and the table is tolerated; **a blank line
inside a table ends it silently**. Body rows are keyed by the header cells.

The seven, in file order, and the header cells each check keys on:

| marker | § | keyed on | read by |
|---|---|---|---|
| `events` | 2 | `#`, `Channel`, `Keys`, `Audience` | `checkCommunication`; `seat-matrix.mjs:111` |
| `keys` | 4 | `page key`, `setting` | `checkKeys` |
| `marks` | 6 | `kind`, `drawn?`, `pins?`, `exempt?` | `checkMarks` |
| `wallets` | 7 | `grant key`, `socket` | `checkWallets` |
| `holds` | 7.2 | `control`, `hold ms` | `checkWallets`; `seat-matrix.mjs:114` |
| `order` | 8 | `key`, `glyph`, `section`, `blocks?` | `checkOrder` |
| `picture` | 9 | `stored as` | `checkPicture` |

Two cell-level traps inside that:

- **`holds`.control is matched by prefix.** `checkWallets` calls
  `holds.find((h) => h.control.startsWith(ctl))` for `🪶`, `✒️`, `🍾`,
  `✏️ Propose (a draft`, `✏️ Propose (a motion` and `🏛️`; `seat-matrix.mjs` does the same
  for `🍾` and `✒️`. **The opening words of those six control cells are load-bearing.**
- **`order`.section is read up to the first `,`, `—` or `(`** —
  `r.section.split(/[,—(]/)[0].trim()` — so the word before that punctuation is the
  section name and everything after it is free prose.

**b. Every `| Yn |` line anywhere in the file is an exception row.** `exceptions()` does not
look for a marker or a section: it takes **every line in the whole file** matching
`^\| Y\d+ \|`, and asserts each has **at least five cells with cells 1–3 non-empty**. A `Y`
row written anywhere would be picked up; a Y row shortened below five columns is a finding.

**c. The `the preamble wearing` line.** `checkOrder` takes the **first line of `SURFACE.md`
containing the literal `the preamble wearing`** and parses the glyph run after those words
up to the first `·` or `)`, against the page's `PROPOSAL_CHIPS`. Today that line is §8's
*The band* paragraph, it occurs **exactly once in the file**, and the run is `🍾 💡 ⚖️ 🏛️`
followed by ` · `. **That paragraph cannot be moved, reworded across those words, or
preceded by any other sentence containing the phrase.** It is item 24, verdict keep.

**d. The headings.** `checkClaudeMd` resolves every `SURFACE §N` / `SURFACE §N.M` in
`CLAUDE.md` against `^#+ N[. ]` in `SURFACE.md`. The pointers `CLAUDE.md` carries today are
**§2, §6, §7, §7.2, §8, §9, §9.1 and §9.2** — eight, and **not §4 and not §5**, which the
plan expected to find cited. `SPEC.md`'s only pointers into this file are to **rows**
(*SURFACE.md E28–E30*, *E29*), never to a section number.

Nevertheless: **no heading is removed and no heading is renumbered.** A section whose body
leaves keeps its heading and one line saying where the body went. Item 13 records that §5
does not in fact empty under this proposal, and item 45's note says why an empty section
would still be acceptable to the checker and unacceptable to a reader.

**e. `EVENTS.length === 33`.** `scripts/seat-matrix.mjs:969` treats **any** change in the
row count as a *no rule* — exit 3, not a remark — on the reasoning that §2 growing or
losing a row is a fact the harness must be told about rather than infer. No item here adds
or removes an event row.

**f. The Audience cells, character for character.** `seat-matrix.mjs`'s `AUDIENCE` table is
keyed by §2 Audience cells **verbatim**. **There are seven keys today, not the five the
plan's Preconditions name** — plans 42 and 84 added two:

1. `the holder`
2. `every member`
3. `every member who had no say **and arrived when it was set**, lapsed included; a later joiner reads it as the document` (E5 — asterisks included)
4. `the membership`
5. `every member and invitee`
6. `strangers`
7. `every active member`

**No item in this proposal touches an Audience cell**, which is also plan 41's rule for the
seat matrix's first green run.

**g. Channel cells are read for the word *unbuilt*.** `checkCommunication` reports
`unbuilt channels: E28 E29 E30` as a note. Plan 69 rewrote E31–E33 in place and amended C15
(exile is now the fourth mail C15 names, and the one event whose audience is outside the
document); **if you are reading this contract as current, check §2 and C15 again** — the
last thing that changed them was 69, on 2026-08-27.

**h. Rule ids are cited widely and resolved by nobody.** `C1–C16`, `E1–E33`, `L1–L9`,
`Y2–Y26`, `M1–M16`, `W1–W16` (`W6a`), `F1–F22`, `K1–K28` are cited by name from
`CLAUDE.md`, `design/STYLE.md`, `design/MOBILE.md`, `design/DECISIONS.md`,
`design/SPEC-REASONING.md`, `packages/constitution/src/session.ts`,
`packages/constitution/src/view.ts`, `packages/server/src/server.ts`,
`packages/server/src/mailer.ts`, three constitution test files,
`scripts/journey-walk.mjs`, `scripts/spec-check.mjs`, `scripts/seat-matrix.mjs` and
`design/session-view.html` — at least 22 distinct ids by exact `SURFACE Xn` form, and more
in prose. **No checker resolves any of them**, so a dropped id fails silently and for ever.
**Every id and its bold lead stays in `SURFACE.md`**, whatever leaves the sentence after it.

**i. `land.appendOnly`.** `SURFACE.md` is listed under `land.appendOnly` in plan-queue's
config for draft, whose both-sides merge rule assumes a conflict is two appended
paragraphs. **This proposal's applying plan is not an append**, so it must run in a sprint
where no sibling writes `SURFACE.md` — the plan says so, and the queue should schedule it
alone.

---

## 3. The items

One continuous sequence. Section by section, in file order.

### The preamble

**1. — retire — history — 101 B.**
Opening: `Born 2026-08-22 in spec pass 1 (Q542), lifted from CLAUDE.md's glossary; `
Ground: pure history — a date, a pass number and where the file came from. DECISIONS.md's
*Spec pass 2 (2026-08-22, Q585–624)* section and git both hold it. What is left of the
sentence is a rule and stays: *`npm run spec-check` asserts the matrix's keys against the
page's own maps.* Nothing points here.

**2. — keep — 44 B.**
Opening: `Reasoning is in `design/DECISIONS.md`.`
This is the rule the whole proposal applies. It is quoted at the head of §0 above and must
survive the pass that it authorises.

### §1 Rules

**3. — point — stated twice — 172 B → ~10 B.**
Opening: ` (the `assembly-press`: the members' avatars convene in a circle around the control`
The assembly hold is stated in full **four** times: here inside C4, in §5's first bullet
(item 10), in §7's wallets row for 🏛️ (*the motion hold flies nothing — the assembly is the
meter*) and in §7.2's holds row (*nothing — the members' avatars convene*). **Keep §7.2's**,
which is the hold ladder's own row and the one a checker reads; C4's parenthetical becomes
`(§7.2)`. C4's own hold-ladder sentence — *🪶 and ✒️ one second, ✏️ the length of its
flight, 🏛️ ten seconds* — is a summary of a table rather than a second statement of a rule,
and stays.

**4. — keep — 803 B.**
Opening: `- **C16 The topbar reads the document · the room · you**`
The longest C-rule, and stated once. Every clause in it is a rule: the row's composition,
the cap, the `+n`, what a face may not say (§3.5, §3.5a), what the middle says before and
after 🍾, and the socket rule. Nothing here argues for itself. Doubt: none.

### §2 The event matrix

**5. — keep — 8,654 B — zero items.**
Opening: `<!-- spec-check: events -->`
**No item in this proposal touches §2.** Every row, every cell, the Audience column above
all (reader contract *f*), the *unbuilt* notes in E28–E30 (*g*), and the unmarked L1–L9
lifecycle table beneath. E31–E33's channel prose is long — E31's whole row is 452 B — but it is what
a member is told, cell by cell, which is precisely what this file is for. Stated for the
record so that a reader who expected the event matrix to be the target can stop looking.

### §3 Exceptions

**6. — retire — history — 331 B (333 with its blank line).**
Opening: `Y1 — *a submitted judgment does not close its card* — was retired by Q576`
Two retired exception ids and what they became. Pure history by the strictest reading: it
says what the file used to say. Y1's content is now E13's and L4's Close cells and F-rule
nothing; Y3's is §6's wait row, which the paragraph itself says. **Nothing anywhere cites
Y1 or Y3** (checked across the repo). The Y-sequence is unaffected: the table already runs
Y2, Y4, Y5, … with no Y1 and no Y3, and `exceptions()` reads lines, not a range.
Destination: DECISIONS.md's *Spec pass 2* section already records the pass; no edit needed.

**7. — keep — 62 B.**
Opening: `| Y26 | A 💤 change that returns lapsed members`
Y26's **Unbuilt** is a fact about the surface today, not history. It is a row. It stays.

### §4 Page keys

**8. — reduce — reason — 545 B → ~175 B.**
Opening: `**Two pairs stopped being asymmetric** (Q903, Ed 2026-08-26).`
Two sentences here are rules and stay: **`MID` carries neither pair** (the checker reads
`MID`), and **the page's word `'roster'` still means *the membership holds this setting* —
the delegation sentinel, not a key.** The rest — that 🪪's id was `membership` and its page
key `roster`, both naming the register it stopped being at entry 94; that 🤝's page key was
`policy`, naming a four-rung ladder that is now one switch — is why the two pairs were
renamed, which is a reason and also, in part, history. **Destination: a new dated
DECISIONS.md section** — Q903 has no heading of its own there and appears nowhere in it.
The pointer that stays: `→ why: Q903`. The `foldLegacyIds` sentence should stay with the
rule, being a fact about the module a reader of §4 needs.

### §5 Things the spec used to say about the surface

**9. — reduce — history — 92 B → ~46 B.**
Opening: `Relocated here from SPEC.md in spec pass 1 (finding 568), with the spec keeping a pointer:`
*Relocated here … in spec pass 1 (finding 568)* is history. *With the spec keeping a
pointer* is a fact about `SPEC.md` and stays — though see the reader contract *d*: the
spec's pointers are to **rows** (E28–E30, E29), not to this section, so the surviving
sentence should say what is true, e.g. *What SPEC.md used to state about the surface, kept
here:*.

**10. — point — stated twice — 235 B → ~86 B.**
Opening: `- **How a constitutional motion is put** — a full ten-second hold on 🏛️`
The same rule as item 3 and as §7.2's holds row. Keep §7.2's; this bullet becomes a
one-line cross-reference — *How a constitutional motion is put — the ten-second 🏛️ hold:
C4 and the hold ladder, §7.2.* — which is what the section is for, a reader arriving from
SPEC.md's pointer.

**11. — keep — 259 B.**
Opening: `- **The head of the document** — the Constitution block carries the founder`
The one bullet of the three stated **nowhere else** in the file. §8's *The band* names the
Founded line as a clause in the `lead` run; it does not say the head of the document
carries the founder, the constituted-at time and every setting's current value as a clause.
Keep whole.

**12. — point — stated twice — 201 B → ~92 B.**
Opening: `- **The 👑 question** — a task of its own kind on the founder's surface`
E12 is the row (*A 👑 question · the founder · news-pinned task, Refuse / Accept · …*) and
§9's `👑 question` card row is the card. Both stay; this bullet reduces to the one thing
neither carries — ***refuse* is the Founder's word, *reject* the membership's** — plus
`(E12; §9)`. That vocabulary distinction is a rule and is stated only here.

**13. — keep — the heading — 0 B.**
Opening: `## 5. Things the spec used to say about the surface`
**§5 does not empty under this proposal**: item 11 keeps a bullet, and items 9, 10 and 12
leave a lede and two cross-references. The heading stays regardless, under the
no-renumber rule (reader contract *d*). Recorded here because the pass expected §5 to be
the section most likely to empty and it is not.

### §6 The marks alphabet and the rail

**14. — retire — history — 46 B.**
Opening: `Lifted from CLAUDE.md in spec pass 2 (Q585).`
Pure history; DECISIONS.md's *Spec pass 2 (2026-08-22, Q585–624)* holds it. No edit to
DECISIONS.md.

**15. — reduce — history — 201 B → ~121 B.**
Opening: `🪜 is not a lifecycle mark: it is the **subject glyph** of the pace card`
The rule half — *🪜 is not a lifecycle mark: it is the subject glyph of the pace card, an
emoji like every other subject glyph* — stays. The history half, *since the rename of
2026-08-22, which retired the drawn incline it used to wear* (80 B), goes. This is the
plan's *half rule, half history* case and the rule half is the whole of what a reader
needs. Destination: DECISIONS.md's *Spec pass 2*; no edit needed.

**16. — keep — ~180 B.**
Opening: `- **M1 Four kinds of entry pin for what they are, and the open entry pins for being open** (C6).`
Named so it is not mistaken for a duplicate of C6, and with it **M3** (*Three things are
exempt from the fit cap*), whose content C6 also carries. M1 cites C6 in parentheses and is
therefore the pattern, not a duplicate (§0, ground 3). M3 is an id, and **ids and their
bold leads stay** (reader contract *h*): `SURFACE M3` is exactly the sort of citation a
future document makes. Neither is an item.

**17. — keep — 779 B.**
Opening: `Exceptions to these, beyond §3: ⚔️ ranks on bounty near the top`
The parentheticals here — `(M7 · drafting leverage is maximal · Q223)` — look like reasons
and are not: they are the exception table's own three columns (rule · why · ruling) written
inline, which is the shape §3 keeps and this paragraph is a continuation of. It is a rule
list. Keep whole.

### §7 The wallets, the sockets, the holds

**18. — retire — history — 39 B.**
Opening: `Lifted from CLAUDE.md in spec pass 2.`
As item 14.

**19. — keep — 19 B.**
Opening: ` → why: Q912 (a).`
W6a's tail is **already the short form** this proposal asks the other eleven to become. It
is named as an item only so that the applying plan does not touch it: Q912 has no section in
DECISIONS.md, and a bare Q pointer is what the file's own convention offers when none
exists. Nothing to do.

**20. — reduce — reason — 124 B → ~28 B.**
Opening: ` → the charter’s ✏️ Propose lost a live proposal to this twice (2026-08-22)`
W16's tail after the arrow is a post-mortem, and `CLAUDE.md`'s *Gotchas* already carries it
under *A hold is released by letting go, and by nothing else* — which names the guard, so
under the Q736 eviction rule it is already reduced to one line there, with the post-mortem
in DECISIONS.md. The half that must stay is **`spec-check` asserts the release set**: that
is a fact about the tree, not a reason. Proposed tail — *→ why: CLAUDE.md Gotchas; spec-check
asserts the release set.* No edit to DECISIONS.md.

### §8 The founding order and the band

**21. — reduce — reason — 142 B → ~38 B.**
Opening: `the setting's clause already counts the answers, the answerer's among them`
Inside *Outside `ORDER`*, explaining why the `ans-*` answer tasks have no clause of their
own. The rule — *a tab in the delegated setting's own stack, and no clause of their own* —
stays, as does the `stackOrder` sentence, which is a fact about the page. **Destination:
DECISIONS.md, *The founder's answer writes no clause (2026-08-25, Q786–Q788)*** — it is
already there in full. Pointer: `→ why: Q786–Q788`. No edit to DECISIONS.md.

**22. — reduce — reason — 162 B → ~26 B.**
Opening: `The founder's own 🌡️ set card carries the same line, in the same words`
The closing sentence of the ceiling passage (Q840, landed by plan 65 on 2026-08-27 — this
item did not exist when the plan for this pass was written). Two halves: *the founder's own
🌡️ set card carries the same line, in the same words* is a **rule** and stays; *what a
founder setting 85% alone in the room is told is what a member answering 85% is told* is
the argument for it. **Destination: DECISIONS.md, *The ceiling a room can reach
(2026-08-27, Q840)***, which holds it. Pointer: `→ why: Q840` — the passage already ends
`Q840)`, so this is close to free. The rest of the passage (the ceiling's shape, the 95/99
bounds, *out of reach*) is rule and stays.

**23. — keep — 91 B — doubt stated.**
Opening: `✉️ because it is the founder's invitation box before the start, ❌ because withdrawing an invitation is a kind of removal`
This is a reason by the strict test and it has **no home in DECISIONS.md** — *A door stands
by its result* (entry 96) has no section there, and *The invite door: two gates wearing one
name (2026-08-25, Q811–Q818)* predates it. Moving 91 bytes would cost a new dated section
of its own, which is a worse trade than leaving it. **Doubt:** if item 8 or item 43 is
approved and a new dated section is being written anyway, this sentence could ride along at
no extra cost. Ed's call; the pass's own verdict is keep.

**24. — keep — 907 B — load-bearing.**
Opening: `**The band** (`SEC`): the opening run (`lead`)`
`checkOrder` reads **this line** for the glyph run after the literal `the preamble wearing`
(reader contract *c*). It is a rule — the band's own composition, section by section —
and it is stated once. **The applying plan must not move it, must not reword across those
five words, and must not introduce any earlier line containing the phrase.**

**25. — reduce — reason — 152 B → ~30 B.**
Opening: `A settled setting stays in its pile because it is the rule, not history — and a motion that passed or was rejected at that clause **is** history there`
Inside *A settled motion files behind its rule* (Q942, entry 72 — landed by plan 60 on
2026-08-27, after this pass's plan was written). The rules stay in full: what files, what
does not (withdrawn, kept-at-close, `awaiting-crown`), the ordering, that it is not a task,
that the membership acts file on their own subsections, and that *Last amended* stays where
it is. The clause quoted is the argument for the reversal. **Destination: DECISIONS.md, *A
settled motion files behind its rule (2026-08-27, Q942)***, which holds it. Pointer:
`→ why: Q942`. No edit to DECISIONS.md.

### §8.1 Rules — where the bytes are

Twelve items, 3,948 bytes, and the section is 13,548. Read them together: nine of
the eleven `→ why:` tails have a home in DECISIONS.md already and reduce to a pointer with
**no edit to DECISIONS.md at all**; one (item 32) does not and is the pass's single verbatim
move; two (items 19 and 28) are already pointers.

**26. — reduce — reason — 449 B → ~66 B.**
Opening: ` → why: the readout's *except while a judge-gate question is still collecting* was outgrown twice`
F5's tail: two supersessions (R-045/Q626 widening `waitingOn` past the judge-gates; Q745
stopping the card appearing before then), the last-resort door (Q773), and Ed's 2026-08-21
ruling. **Destination: DECISIONS.md, *Begin says what it is waiting for (2026-08-25,
Q826–Q834)***, which carries the last-resort door and F18's door in full. Pointer:
`→ why: Q626, Q745; DECISIONS.md, *Begin says what it is waiting for*`. **Doubt:** the
2026-08-21 Ed quotation — *whether a document can begin with nobody in it is 🍾's question,
and 🍾 has a readout that names what it is waiting for* — is the sentence F5 is an
implementation of; see §7's could-not-decide list.

**27. — point — stated twice — 123 B → ~10 B.**
Opening: `(F19 — the remedy is the dead end wearing a card, not the next task, so it never counts as *something else being served*)`
F19 states this in its own words, at length, and F7 states it a third time. F5 already cites
F19 in the same breath. Reduce the parenthetical to `(F19)`. **Keep F19's**, which is where
the rule lives.

**28. — keep — 15 B.**
Opening: ` → why: Q740.`
F6's tail is already the short form, and DECISIONS.md has *⏱️'s **I set it** fills its own
fields (2026-08-24, Q740)*. Nothing to do. Named so the applying plan leaves it alone.

**29. — reduce — reason — 300 B → ~38 B.**
Opening: ` → why: 🍾 and 🏛️ each made the exception unreachable`
F7's tail: three instances of one shape (🍾, 🏛️, the ✉️ remedy), Q645 and Q828.
DECISIONS.md carries all three — Q645's under the ✋/🖼️ gotcha in the glossary and the
third under *Begin says what it is waiting for*, which names *Q775's shape … for the third
time in this file, after 🍾 (Q645) and 🪜 (Q773)*. Pointer: `→ why: Q645, Q828`. No edit.

**30. — reduce — reason — 325 B → ~22 B.**
Opening: ` → why: the grants' own clauses stated a count `holderLine` and the wallet tooltip already state`
F16's tail. DECISIONS.md carries it twice: in the `constitution-section` glossary entry
(*Q639 (a), Ed 2026-08-22: these clauses only exist to give "Your Pen" and "Your Shield"
news a home*) and again beside *A grant is the holder's, and nothing hid them*. Pointer:
`→ why: Q639`. No edit. Note that `spec-check`'s `checkOrder` asserts F16's *effect* — the
pen and shield clauses staying gone — so the rule half is guarded and the reason is not
load-bearing.

**31. — reduce — reason — 571 B → ~30 B.**
Opening: ` → why: the founder's first instinct is to edit the title in place`
F17's tail, including the rejected idle jiggle. **The plan for this pass expected this one
to need a verbatim move; it does not.** DECISIONS.md's `dead-click-nudge` entry carries the
whole of it and more — the `#doctitle` diagnosis, *both halves beat, and that is the
lesson*, the jiggle rejection with its reason (*the birth has no clock to ride anyway*), the
`.queue button` transform, `#prose`'s exclusion and reduced motion. Pointer:
`→ why: Q650–Q653`. No edit to DECISIONS.md.

**32. — move — reason — 325 B out, ~58 B stays. The one verbatim move in this proposal.**
Opening: ` → why: Ed, 2026-08-25, founding a document task by task`
F18's tail: Ed's own words (*before begin, there shouldn't be a situation where I don't see
any queue-cards*), and the diagnosis — a delegated 🌡️ left 🪜 owed by a hand nothing could
ask for, `ansDue()` false for ever, and not one delegated question came back. **Q773–Q777
has no section in `design/DECISIONS.md`**; it appears only in passing, inside *The two blind
sliders* (*which is Q773/Q776's subject and the reason each slider gets a founding of its
own*) and inside *Begin says what it is waiting for*. So this text moves **verbatim** into
**one new dated section**, and it is the only one: propose
`## The founding never runs out of tasks (2026-08-25, Q773–Q777)`, placed in the file's
date order. Pointer that stays: `→ why: DECISIONS.md, *The founding never runs out of
tasks*`. If items 8 and 43 are also approved, their text joins the same new section rather
than opening two more.

**33. — retire — history — 98 B.**
Opening: ` (the remedy stood on 🪪 until entry 94, 2026-08-26, which moved the invitation box to the door)`
F19's opening parenthetical: where the remedy used to live and when it moved. Pure history —
Y24 and §9's ✉️ row state where it lives **now**, which is what a reader needs. Git and
DECISIONS.md's *The invite door: two gates wearing one name (Q811–Q818)* hold the move. No
edit.

**34. — reduce — reason — 365 B → ~66 B.**
Opening: ` → why: Ed, 2026-08-25, founding alone — *I did all my open tasks and then got served Begin while being unable to action it.`
F19's tail. **DECISIONS.md's *Begin says what it is waiting for (2026-08-25, Q826–Q834)*
opens with this exact quotation** and spends four paragraphs on it, including the sentence
this tail compresses (*a question that looks finished, standing next to a start that will
not come*). Pointer: `→ why: DECISIONS.md, *Begin says what it is waiting for*`. No edit.
See item 26's doubt and §7.

**35. — reduce — reason — 420 B → ~66 B.**
Opening: ` → why: Ed, 2026-08-25 — *when I (as a founder-member) was granted 🏛️ I did not get a task. The 🏛️ tab was grey.*`
F20's tail. Same DECISIONS.md section: it quotes this report in its opening paragraph
(*And, separately: "When I (as a founder-member) was granted 🏛️ I did not get a task…"*) and
gives the diagnosis in full — ⚖️ hidden until 🍾, `tasksFor` never reaching the grant, 🪪 as
the pre-start host, the move to after 👁️, and *a power you hold and have not been told about
is the unacknowledged-decision rule seen from the other side*. Pointer:
`→ why: DECISIONS.md, *Begin says what it is waiting for* (Q829)`. No edit.

**36. — reduce — reason — 373 B → ~66 B.**
Opening: ` → why: membership begins at first arrival, so a flat list told apart by a chip read as`
F21's tail, with the *chip was doing a heading's job* argument and Ed's 2026-08-26 sentence.
**Destination: DECISIONS.md, *The leaving rules before the register, and Proposals before
Decisions (2026-08-26, Q865–Q876)***, which carries *the chip was doing a heading's job*
verbatim. Pointer: `→ why: DECISIONS.md, *The leaving rules before the register*
(Q868–Q870)`. No edit. F21 is the file's longest rule at 2,092 B and everything before the
arrow is rules — this is the only part of it that moves.

**37. — reduce — reason — 584 B → ~66 B.**
Opening: ` → why: Q865 and Q871 (Ed, 2026-08-26: *💤 and 🥾 sections should be above the Members heading*`
F22's tail, and the largest single reduce in the proposal: two Ed quotations, the reversal
of Q617 (a) with its argument, and the 2026-08-21 *Proposals reads fourth* objection with
why it dissolved. Same destination as item 36 — that section names both quotations and both
reversals. Pointer: `→ why: DECISIONS.md, *The leaving rules before the register*
(Q865, Q871; reverses Q617 (a))`. **Keep the words *reversing the second half of Q617 (a)*
in some form**: that a rule reversed a numbered ruling is a fact about the rule, and the
`(Q617)` in the pointer carries it.

**38. — keep — 616 B.**
Opening: `Exceptions beyond §3: 🪜 arrives answered (F6 · the ramp is part of what the threshold says · Q512)`
As item 17: rule · why · ruling written inline, the exception table's own shape. Keep whole.

### §9 The card kinds, the commit row, the composer

**39. — keep — 506 B.**
Opening: `**The picker** (Q732) is Unicode's own list`
Every sentence is a rule about what the picker draws and what it refuses. The `(Q732)` is a
ruling pointer, not a reason. Keep whole.

**40. — retire — history — 127 B.**
Opening: `the grounds for your initials and the drawn marks left the picker on 2026-08-23, and are refused rather than merely un-offered`
Half history, half rule, and the rule half is already in the table beneath it — the
`picture` table's *refused when* column says exactly *it is one of the surface's own marks*.
What leaves is *left the picker on 2026-08-23*. The surviving sentence should keep **and
are refused rather than merely un-offered**, which is a rule the table's column expresses
but the paragraph explains, and the whole of the following sentence about the initials,
which is stated nowhere else. Destination: DECISIONS.md already covers Q734; no edit.

**41. — keep — 10,393 B — every row, every cell.**
Opening: `| kind | opened from | head | field | radios | left | right | closes | files as |`
The card table is the largest single object in the file and **not one row or cell of it is
proposed for anything**. It is the answer to *what does this card do*, cell by cell, for 27
kinds of card. Stated for the record, as item 5 is for §2.

**42. — keep, flagged — 472 B.**
Opening: `**one dropdown naming the subject**, members and invitees alike — withdrawing an invitation is a kind of removal, priced as one`
❌ Remove's `field` cell is 472 B of prose inside a table cell, and one clause of it is a
reason — *withdrawing an invitation is a kind of removal, priced as one*, which is also
stated in §8's *Outside `ORDER`* (item 23). **Flagged, not reduced:** the plan for this pass
forbids carrying a reduce into a table cell on this pass's own word, and rightly — a cell is
read by column, and a `→ why:` pointer inside one would be the first in the file.
**The sentence that could become a pointer, if Ed wants it:** the clause quoted, against
`entry 96`. Verdict as it stands: **keep**.

**43. — keep, flagged — 308 B.**
Opening: `**three forms, by 🪪's price**: at *proposal* the judgment *Admit them*`
`adm:`'s `field` cell, and its `head` cell above it (`at *pen* the address is the name`,
which carries a genuine reason: *opening the link being the joining, so nothing else is
known of them yet and the announcement says so rather than waiting for a name that may never
come (Q912 (b))*, ~200 B). Same flag as item 42, same reasoning. **If Ed wants a cell
reduced**, this head cell is the strongest candidate in the table: Q912 (b) is a ruling with
no DECISIONS.md section, so its text would join item 32's new dated section and the cell
would end `(Q912 (b))`. Verdict as it stands: **keep**.

**44. — keep — 1,961 B.**
Opening: `### 9.1 The commit-row grammar`
A table, 14 rows, one `rule` column, no reasons and no history. Keep whole.

**45. — keep — 3,048 B.**
Opening: `### 9.2 Composer rules`
K1–K28. Every one is a rule; the parentheticals are ruling pointers (`Q620`, `Q614`,
`Q770`, `SPEC §3.5a`) and one citation of a general rule (K12's `(C11)`), which is the
pattern this proposal protects. Keep whole. **Note on the no-empty-section question:** the
checker resolves `SURFACE §N` against a heading alone and would be content with an empty
section; a **reader** would not, so the applying plan's rule is that a heading whose body
leaves keeps one line saying where the body went. Under this proposal no section empties.

---

## 4. The arithmetic

**All counts on disk, CRLF**, which is what plan-queue measures and what §1's 75,959 is.
A line that leaves takes its `\r` with it, so a whole-line retirement saves its bytes plus
one; the counts below already include that.

The **after** figures for a reduce or a point are the pass's estimate of the pointer that
stays, written out in each item. They are estimates and the applying plan's real figures
will differ by a few bytes each way.

| verdict | items | before | after | saved |
|---|---|---|---|---|
| retire (pure history) | 1, 6, 14, 18, 33, 40 | 744 | 0 | **744** |
| reduce (rule stays, reason or history leaves) | 8, 15, 20, 21, 22, 25, 26, 29, 30, 31, 34, 35, 36, 37 | 4,713 | 838 | **3,875** |
| move (verbatim, into one new dated DECISIONS.md section) | 32 | 325 | 58 | **267** |
| point (second full statement → citation) | 3, 9, 10, 12, 27 | 823 | 244 | **579** |
| keep | 2, 4, 5, 7, 11, 13, 16, 17, 19, 23, 24, 28, 38, 39, 41, 42, 43, 44, 45 | — | — | 0 |
| **total** | **45 items, 26 of them a change** | | | **5,465** |

**75,959 − 5,465 = 70,494.**

**Say plainly: that is a consequence, not a goal — and it does not clear 70,000.** The
plan that ordered this pass predicted ~65 KB and assumed the budget would be cleared with
margin. It is not, and the reason is item 1's paragraph: the file gained **4,671 bytes**
between the plan's measurement and this reading, all of it rules — five plans in the same
batch, every one of them adding what the surface now does. A full approval of every item
here lands the file **494 bytes over budget**, and the next event row, exception or F-rule
puts it further over.

What each subset leaves, against 71,288 (the plan's base) and 75,959 (the tree):

| approved | saved | leaves |
|---|---|---|
| history only (1, 6, 14, 18, 33, 40) | 744 | 75,215 |
| the eleven `→ why:` tails only (26, 29, 30, 31, 32, 34, 35, 36, 37 — 19 and 28 are already pointers) | 3,234 | 72,725 |
| history + the why-tails | 3,978 | 71,981 |
| everything except the *point* items | 4,886 | 71,073 |
| **everything** | **5,465** | **70,494** |

And the LF reading, for completeness: the file loses ~7 lines under a full approval, so git
would hold it at roughly **70,073** — still over.

## 5. The budget

**The item.** `~/.plan-queue/C-Users-edsap-Dev-draft/config.json` watches `SURFACE.md` at
`budgetBytes: 70000`, with the note *the surface inventory, append-only under
land.appendOnly, so nothing ever takes anything out unless somebody decides to*. Backlog
entry 143 left open *whether 70,000 is the right budget or whether the budget is what should
move; the measurement is the queue's, not a ruling.* **The builder changed nothing in that
config either way.**

**46. — the budget — three readings.**

- **(a) Keep 70,000.** A budget the discipline meets is one that keeps meaning something.
  Cost, now measurable: a full approval of items 1–45 leaves the file **494 bytes over**,
  so the watch stays red with nothing left to extract on any of the file's own three
  grounds — and the only remaining moves would be a cull, which Ed has ruled out.
- **(b) Raise to 76,000.** Recommended by this pass, and a **departure from the plan's own
  recommendation**, which was (a) and rested on arithmetic the tree has since falsified.
  76,000 is the post-extraction 70,494 plus one batch's growth at the rate just observed
  (4,671 bytes in five days, all of it rules) — headroom for the next sprint's event rows
  and F-rules, and still tight enough that a second pass gets ordered before the file
  doubles. For scale: the other two watched files sit at `SPEC.md` **78,741 of 80,000** and
  `CLAUDE.md` **97,343 of 100,000** today — both within 3% of their ceilings, which is the
  watch working, since that is what orders a pass. 76,000 would give `SURFACE.md` about
  8% and therefore one sprint's grace before it asks the same question again.
- **(c) Measure the LF size**, which is what git holds. It buys 429 bytes today and ~421
  after the pass, landing at ~70,073 — **still over**, so it settles nothing on its own; it
  is worth taking only alongside (b), and only if the series wants one number that does not
  depend on which machine checked the file out.

Recommendation: **(b)**, with the honest caveat that a budget raised because the file grew
is a budget that will be raised again. The alternative reading — that a 75 KB surface
inventory is telling us §8.1's twenty-two F-rules want to be a table, the way §9's card
kinds already are — is a real piece of work and is not this pass's to propose.

## 6. What this pass could not decide

Four items whose verdict turns on a fact only Ed has. Each is listed with its two readings;
none is folded into §4's arithmetic beyond the verdict already recorded.

**47. Ed's own sentences, quoted in F19 and F20 (and in F5, F17, F18, F22).** Items 26 and
31–37 send them to `design/DECISIONS.md`, where every one of them already sits verbatim.
- *Reading one (the pass's verdict):* they are reasons, they are duplicated, and the
  pointer is the file's own convention. **2,362 bytes of the 5,465** ride on this reading
  (items 26, 31, 32, 34, 35 and 37).
- *Reading two:* a session reads `SURFACE.md` and does **not** read
  `design/DECISIONS.md` — that is stated in `CLAUDE.md` for both files, *Not loaded per
  session* — so the founder's own words beside the rule are the one thing that stops the
  rule being re-litigated by somebody who never opens the archive. On this reading F19's
  and F20's quotations are load-bearing context, not history, and both items become
  **keep**.

**48. Whether §5 should survive as a section at all.** The pass's verdict is that it does
(item 13) and that its one surviving bullet, *The head of the document*, is stated nowhere
else. The other reading is that the bullet belongs in §8 beside *The band*, and §5 becomes
a one-line redirect under its own heading. Nothing points at §5 by number (reader contract
*d*), so either is safe; it is a question about how a reader arriving from `SPEC.md` finds
what the spec relocated.

**49. Whether a table cell may carry a `→ why:` pointer.** Items 42 and 43 flag two cells —
❌ Remove's field (472 B) and `adm:`'s head (~200 B) — as prose wearing a cell's clothes,
and keep both, because a cell is read by column and no cell in the file has ever carried a
pointer. If the answer is yes, those two and a handful like them are a second pass worth
~1 KB. If no, they are what the file looks like when a card is genuinely complicated, and
the flag should come off.

**50. Whether §8.1 should be a table.** Not proposed, not costed, and out of this pass's
grounds — but it is the honest reading of §1's measurements: 13,548 bytes of unbroken prose
in twenty-two rules, three of which run past 1,100 bytes each. §9's card kinds were prose
once. A pass that tabulated F1–F22 the way §9 tabulates card kinds would do more for this
file than every item above, and would need its own plan, its own approvals and its own
question number.

---

## Backlog text, ready to paste — a lint for the reader contract

Filed by nobody; the number is left as `NN` deliberately. **Not** in scope for the applying
plan either — the reader contract above is written down, not enforced, and this is the
proposal that it should be.

> **NN — the reader contract, asserted.** `SURFACE.md` is read by `spec-check`, the seat
> matrix and `CLAUDE.md`'s pointer check, and three of the things they depend on are
> invisible to every existing check: **the seven `<!-- spec-check: … -->` markers all
> being present** (a missing one throws inside `tableAfter` with a message about a table
> rather than a marker), **§2 having exactly 33 event rows** (the seat matrix exits 3, but
> only when somebody runs it against a live server), and **the single line containing
> `the preamble wearing` still being there** (`checkOrder` silently compares an empty
> string to `PROPOSAL_CHIPS` if it goes). Add one `checkSurfaceShape()` to
> `scripts/spec-check.mjs` beside `checkOrder`: assert the seven markers by name, assert
> `tableAfter('SURFACE.md', 'events').length === 33` with the count in the note line so a
> deliberate change is a one-line diff, assert exactly one line matches
> `the preamble wearing`, and assert every `^#+ N[. ]` heading number 1–9 with 6.1, 7.1,
> 7.2, 7.3, 8.1, 9.1 and 9.2 present. Cheap, and it makes the extraction pass's approved
> moves mechanical instead of careful. → why: Q944, this document's §2.
