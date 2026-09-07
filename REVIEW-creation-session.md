# Review: document creation → founding questions → live session

An end-to-end walk of the creation process (Ed's ask, 2026-08-18): each step
checked for sense and for consistency — against SPEC v0.30, against the two
setup surfaces, against session-view's rules, and against what engine-core
actually implements. It doubles as the groundwork for Q335 (splitting
`Constitution`), because the split's contents are exactly what this walk
surfaces: §7 ends with the definitive settings-to-engine mapping.

**Findings are numbered 338–344** in the project sequence. Unambiguous bugs
found during the walk were fixed in the same pass and are marked **[fixed]**;
everything else is a decision and waits for Ed.

**Since 2026-09-07 this file holds §7 alone.** The walk (§1), what held (§2),
findings 338–344 (§3 — all since answered and built), the v0.31 SPEC fixes
(§4), the mockup fix (§5) and the integration contract the port was built
against (§6) are in `design/DECISIONS.md` § *REVIEW-creation-session.md,
§§1–6 lifted 2026-09-07*, verbatim. The file goes when Q335 lands.

---

## 7. The `Constitution` split (Q335 groundwork)

What the walk establishes about engine-core's `Constitution`, field by field.

**Room-agreed (→ `RoomSettings`, the constitution proper):**

| engine field | card | notes |
|---|---|---|
| `adoptionThresholdStart/End` | ✒️ approval threshold | shape implicit (start=end ⇒ fixed); see 341 |
| `windowStartMs/EndMs` | ⏰ when does it end | perpetual = no end; start semantics are 342 |
| `tokenGrant` | 🪙 grant | |
| `tokenDripPerTenth`, `tokenCap` | 💧 drip | per-hour form for perpetual docs not yet in engine |
| `authorshipVisibility` | 👤 whose proposal | |

**Room-agreed but missing from the engine entirely:**

| setting | card | engine today |
|---|---|---|
| quorum (+form) | 👥 | absent — finding 338 |
| signing | ✍️ | absent |
| judgments-reveal | 👁️ | absent |
| chamber | 🔭 | absent (server-side concern, but the *value* is constitutional and belongs in the record) |
| machine member (+budget) | 🤖 | absent as a setting; `Participant.machine` exists |

**Engine tuning (→ `EngineTuning`, never on a card, never in a motion):**
`adoptionFloorMax` (pending 338), `deadlockMinComparisons`, `deadlockEpsilon`,
`cooldownMs`, `redraftLimit`, `rationaleMaxChars`, `boutGapMs`, `hotSetSize`,
`explorationEvery`, `rivalGateProb`, `rivalGateMinComparisons`,
`reopenedBoost` — and `salienceEvery`, which is stale (§8.3a superseded it)
and should be deleted in the same pass.

**Neither:** `stake` becomes a constant (v0.30); `rngSeed` is provenance and
stays on the session, not in either bag.

Recommendation: implement the split as its own commit once Ed has read this —
it is still a rename today, and 338's answer decides one field's home.

**Where it stands, 2026-09-07.** The settings the walk called *missing from
the engine* live in `@draft/constitution`'s catalogue (SPEC §9.7.1: 👥 quorum
— now the adoption floor, SPEC §4.2 — ✍️ signing, 👁️ judgments, 🌍
visibility; 🤖 machines retired 2026-08-29), and the cards have been renamed
since (🌡️ the threshold, ⏰ the window, ⏱️ the proposal rate, 👤 authorship).
engine-core's `Constitution` (`packages/engine-core/src/types.ts:16`) still
holds both bags — `adoptionThresholdStart` (:22) beside `cooldownMs` (:42),
`tokenGrant` (:45), `hotSetSize` (:58) and `salienceEvery` (:62) — which is
Q335's open half (QUESTIONS.md: *partly answered — SPEC's half done (Q562);
engine-core's object still one*).

---

*Review conducted 2026-08-18 against SPEC v0.30→31, design/document-creation.html,
design/founding-ceremony.html, design/setup.js, design/session-view.html, and
packages/engine-core/src at commit `2f24490`.*
