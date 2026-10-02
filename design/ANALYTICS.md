# ANALYTICS.md — what we measure about rooms, and how a number becomes work

A working document like `design/MOBILE.md`: stages get checked off as they land, questions are numbered from the project sequence and answered by Ed, and rules that come out of it go into the rule files when built. **SPEC.md and SURFACE.md win wherever this document disagrees with them**, as they win over every plan; `docs/OPERATING.md` wins on what runs where and what configures it; `docs/legal/PRIVACY.md` is what members are told, and **nothing this plan collects may outrun what that file says** (§4); the code wins over all of them. This file **cites rather than restates**, and it **schedules** its edits to other documents (§7) rather than making them alongside the plan.

Written 2026-10-02 from issue #180 (Ed, the coordinator chat the same day: *we should think about all the things we want to measure about rooms and create an analytics process that tells us insights we can turn into features / remove pain points*). Ed's calls on it are **QUESTIONS.md 1592**, put as 1592.1–1592.9 in §8. **This is a plan: no product code changed.** Evidence points at a file and a symbol, never a line number (PRODUCTION.md stage 15's convention).

## Status

- **Planned 2026-10-02**, PR #181. Nothing built. §8's nine questions wait on Ed.
- Stage 1 (§6) needs no ruling to start: it reads logs that already exist, offline, and ships nothing.

## 0. The goal, and the four headline numbers

**What it serves.** CLAUDE.md's guiding light: *user acceptance, and the edge is speed*, set against **the huddle** — *a room huddling around google docs in suggestion mode … in an hour you might discuss a handful of amendments. This product … in an hour a group might be able to do several dozen amendments* (Ed, 2026-09-25). That sentence is a claim with a number in it, and today nothing measures it. The first job of analytics is to say, per room, whether the claim held.

**The four headline numbers**, on every report's first line, each defined in §2:

| # | Number | What it says | Against |
|---|---|---|---|
| H1 | **Changes decided per active hour** (S3) | how fast the room moves its text | the huddle's *handful* an hour; Ed's *several dozen* |
| H2 | **Proposal to decided**, median and p90 (S2) | how long a member waits to know | — a first baseline is the demo's and the nh2026 convention's |
| H3 | **Votes per decided change** (S5) | what a change costs the room | the rival-pair ranking Ed kept (Q1538, Q1539) is paid for here: the number says how much |
| H4 | **Share of members who propose at all** (P1) | whether *everyone may propose* is true in practice | the huddle, where one person's taste moderates the drafting |

A fifth sits beside them on the same line without being a headline: **the share of members who vote at all** (P2), because H4 without it reads a quiet room as a room of voters.

**What a headline is not.** None of the four is shown to a member, a Founder or a stranger (§4). They are the operator's reading of the product, never a feature of a room.

## 1. Sources first

**The rule: derive offline from what is already written; add a signal only where nothing written can answer, and only content-free.** Each document already carries two hash-chained logs whose every event has a time, so almost every question about a room is a replay away. The sources, as surveyed 2026-10-02:

| Source | What it holds | Where | Kept |
|---|---|---|---|
| **The engine log** | every proposal, judgment, adoption, withdrawal, strand, retirement, decree and the close — the event union `Event` in `packages/engine-core/src/types.ts` (`candidate-submitted`, `comparison`, `adopted`, `candidate-withdrawn`, `rebase-failed`, `candidate-retired`, `candidate-undecided`, `text-decreed`, `closed`, …), each with `t` | `engine_log` (Postgres), `engine.jsonl` (file store) | for ever; replay is `Session.replay` |
| **The document log** | the founding, the roster, motions, the crown, acknowledgements, lapse, applications, the close — `ConstitutionEvent` in `packages/constitution/src/types.ts` (`created`, `setting-delegated`, `answer-given`, `question-resolved`, `constituted`, `member-invited`, `member-arrived`, `member-lapsed`, `member-seen`, `motion-opened`, `ok-owed` / `ok-given`, `close-acknowledged`, …) | `document_log`, `log.jsonl` | for ever; replay is `ConstitutionSession.replay` |
| **The bridge state** | which engine candidate is which motion (`BridgeState.motionCandidates`, `packages/constitution/src/engine-bridge.ts`) — in neither log | `bridge_state`, `bridge.json` | for ever |
| **The error log** | every refusal, every failed request and every error the page threw: `ErrorLine` (`packages/server/src/persistence.ts`) with `at`, `kind`, `doc`, `slug`, `seat`, `cmd`, `reason`, and for a page error `source` and `build` | `errors`, `errors.jsonl` | until a wipe; no retention period yet (PRODUCTION.md stage 12) |
| **`/healthz`** | the two poll races (`races`: `judged-closed`, `stale-version`), request errors, documents stalled — `healthTable`, `packages/server/src/routes-admin.ts` | process memory | **until restart, and host-wide, never per document** |
| **The access line** | one stdout line per response: method, path (the slug in it), status, milliseconds — `server.ts` | Render's process log | Render's window; no seat, no query |
| **People** | addresses, names and pictures by `PersonId` — never needed by a report | `people`, `people.json` | until erased |
| **Presence** | where each member is reading — `packages/server/src/presence.ts` | **memory only, never written** (SPEC §3.5a, R-145) | 30 s |

**What nothing holds:** a card opened and left; anything about the device; a poll that failed and recovered; the founder's dwell on a card; the demo document's past, which is memory-only by design (DEMO.md §0.1 D1) and gone at every Reset.

**What already computes over these.** `computeMetrics` (`packages/sim-harness/src/metrics.ts`) reads an engine log into comparisons, adoptions, site churn (`SiteChurn`: flips and reversions), `approvalsAtAdoption`, `firstAdoptionMs` and `candidatesNeverJudged` — its log-only half is most of §2's *outcomes*, and stage 1 takes it rather than re-deriving it. `strandedAtClose` and `auditTokens` (`token-audit.ts`) are the same kind. `scripts/repro/nh2026-refusals.mjs` is the precedent for the whole approach: an instrument that replays a real room's `engine.jsonl` against its `errors.jsonl`, asserting nothing, and it found Q1491.

## 2. The catalogue

Each measure has an id, a definition, its source, and **Logs?** — **yes** (a fold over one log), **replay** (needs the engine's own reading at a moment, `races(t)` or `dominated()`), **join** (two sources by `doc` and `t`), or **new** (nothing holds it; §3 says the smallest signal that would). *Active hour*: a ten-minute bucket in which any member acted counts as a sixth of one, so a perpetual document's quiet weekend does not dilute its pace. *Member* means a human member; machine members are reported apart (1592.8). *Decided* means adopted (✔) or closed for good (✖: dominated, withdrawn, held, refused at the crown); *undecided at close* is its own outcome.

### 2.1 Speed

| # | Measure | Definition | Source | Logs? |
|---|---|---|---|---|
| S1 | Time to first vote | per proposal, the first `comparison` naming it by anyone but its author, minus its `candidate-submitted`; median and p90 | engine | yes |
| S2 | **Proposal to decided** (H2) | per proposal, `adopted` / `candidate-retired` / `candidate-withdrawn` minus `candidate-submitted`; ✔ and ✖ reported apart | engine | yes |
| S3 | **Changes decided per active hour** (H1) | text adoptions ÷ active hours, between `constituted` and `closed`; beside it E at the time, so rooms of different size compare | engine + document | join |
| S4 | Time to the first proposal and the first adoption after 🍾 | `candidate-submitted`, `adopted` minus `constituted` (`firstAdoptionMs`) | both | join |
| S5 | **Votes per decided change** (H3) | edge `comparison`s naming the winner's race up to its `adopted`, over adoptions; and per member | engine | replay (a race is the engine's grouping, `raceOf`) |
| S6 | Last vote to adoption | `adopted.t` minus the race's last `comparison` — the cooldown and the batch, as the room felt them | engine | replay |
| S7 | Vote pace | `comparison`s per member per active hour, and its curve over the room's life in ten-minute buckets — where the energy goes | engine | yes |
| S8 | Motion speed | `motion-opened` to `motion-carried` / `motion-held`, by route (✏️, 🏛️, ✒️) | document | yes |

### 2.2 Participation

| # | Measure | Definition | Source | Logs? |
|---|---|---|---|---|
| P1 | **Proposers** (H4) | distinct `author`s of text proposals over members who ever arrived | both | join |
| P2 | Voters | distinct `participantId`s with a `comparison` over members who ever arrived | both | join |
| P3 | Concentration | the top member's share of proposals and of votes; the share the top fifth made | engine | yes |
| P4 | Arrival | invited → arrived share and lag (`member-invited` → `member-arrived`), before and after 🍾 | document | yes |
| P5 | Lapses and returns | `lapse-warned`, `member-lapsed`, `member-returned`; time lapsed; how many returned | document | yes |
| P6 | Abstentions | the `abstained` count every adoption carried, and how many candidates waited on silence past 💤 | engine | yes (`adopted.abstained`) / replay |
| P7 | Quorum met or missed | approvals against floor at each adoption (`approvals`, `floor`); races short of their floor at the close (`strandedAtClose`); `floor-recomputed` | both | yes / replay |
| P8 | Indifference | the share of a member's judgments that are `tie`, and on incumbent pairs (the care map's reading, SPEC §3.2) | engine | yes |
| P9 | Leaving | `member-removed` by `self` (resignation), by the Founder, by motion | document | yes |
| P10 | The closing signature | `close-acknowledged` share, and how long after `closed` | document | yes |

### 2.3 Friction

| # | Measure | Definition | Source | Logs? |
|---|---|---|---|---|
| F1 | **Opened and left** | a card opened and closed with no act — by card kind | — | **new** (§3, N1) |
| F2 | Withdrawn | `candidate-withdrawn` share of proposals, and time from submit | engine | yes |
| F3 | Stranded | `rebase-failed` share, and what followed: `candidate-confirmed`, withdrawn, or undecided at the close | engine | yes |
| F4 | **Refusals** | `kind: 'refused'` lines per member-hour, by `cmd` and by reason class; a cluster on one reason is a finding | errors | join |
| F5 | **Page errors** | `kind: 'page'` lines by `source` and `build` | errors | join |
| F6 | Poll races | `judged-closed`, `stale-version` | `/healthz` | **new** per document (§3, N4) |
| F7 | Reconnects | a poll that failed and later succeeded | — | **new** (§3, N3) |
| F8 | **Phone or desktop** | each seat's device class: narrow and coarse, nothing finer | — | **new** (§3, N2) |
| F9 | Revised judgments | the same member judging the same pair again — a change of mind, or a misclick | engine | yes |
| F10 | The OK burden | `ok-owed`, `release-owed`, `amendment-owed`, `departure-owed`, `held-owed` per member, and the lag to their `-ok` | document | yes |
| F11 | Two presses | a refusal followed within seconds by the same `cmd` succeeding from the same seat — the shape of Q1486 | errors + both | join |

### 2.4 Outcomes

| # | Measure | Definition | Source | Logs? |
|---|---|---|---|---|
| O1 | Contested races | races that ever held two live proposals, over all races | engine | replay |
| O2 | Deadlocks | races the engine read as deadlocked (`deadlocked`, SPEC §8.3), and for how long | engine | replay |
| O3 | **✔ / ✖ shares** | adopted · dominated · withdrawn · refused at the crown · undecided at the close, over proposals | engine | yes |
| O4 | **Rewrites of one clause** | per site, adoptions after the first (`flips`) and returns to a wording that stood before (`reversions`) — `SiteChurn` | engine | yes |
| O5 | Margin | approvals over floor at adoption; `rivals.measured` of `rivals.of` | engine | yes |
| O6 | Ranked below | retirements carrying `ranked` (*n of m preferred the current text*, Q1539) | engine | yes |
| O7 | The Founder's hand | `text-decreed`, `text-amended`, crown questions opened and how they were answered | both | yes |
| O8 | Rule changes | motions per setting, carried and held | document | yes |
| O9 | Shape of change | insertions · replacements · deletions, and lines changed per adoption; the text's length at 🍾 and at the close | engine | yes (`documentAt`) |
| O10 | **Twins** | two adjacent blocks of the text whose words overlap past the bots' own measure (Dice over content words at 0.35, Q1583 (1)) at any version — the shape of #150 | engine | yes |

### 2.5 The founding

| # | Measure | Definition | Source | Logs? |
|---|---|---|---|---|
| B1 | **Time to 🍾** | `constituted` minus `created` | document | yes |
| B2 | Delegated questions | `setting-delegated` count and which; delegation → `question-resolved` time; answers over electorate (`distribution`, `electorate`) | document | yes |
| B3 | Time per card | the gap between the Founder's successive acts (`setting-set`, `setting-delegated`, `power-relinquished`) in `ORDER`'s order — an upper bound: a gap holds the card *and* whatever else they did | document | yes (bound); the true dwell is **new** (N1) |
| B4 | Second thoughts | a setting set twice before 🍾; a delegation reclaimed (`setting-reclaimed`) | document | yes |
| B5 | What held 🍾 | the longest-standing reason `readiness().holds` gave, by replaying to each moment | document | replay |
| B6 | Who was there | members arrived before 🍾, and answers given before it | document | yes |

## 3. New signals — the smallest that would answer

Five measures above have no source. Each signal below is the least that answers its measure, and each is held to the same four rules: **content-free** (no text a member wrote, no wording, no address, no name); **never in either log** — the logs are the record and are replayed, and a signal about where somebody hesitated is not part of what the room decided; **never served to any page** (SPEC §3.5: no feed, card or notification shows direction; §11 already names *latencies, skips, composer visits* as private); and **counted on the host, never by a third party** (§4).

| # | Signal | Answers | What is sent | How |
|---|---|---|---|---|
| N1 | **Card tallies** | F1, B3 | per page load, counts only: cards opened and cards closed with no act, by card kind (pair, motion, rule, record, news, edit) — **no card key, no race id** | one `navigator.sendBeacon` at `pagehide` to a new `POST /api/d/:slug/signal`, the seat and the build from the host as `POST /api/page-error` already does (OPERATING §11) |
| N2 | Device class | F8 | `narrow` and `coarse` as two booleans (`NARROW_Q` as the page evaluates it, and one `matchMedia('(pointer: coarse)')`, MOBILE.md §6a's `coarse()` once built) — never the user agent, never a size | on the same beacon |
| N3 | Reconnects | F7 | count of polls that failed and of recoveries, in the same load | on the same beacon |
| N4 | Poll races per document | F6 | the two counts `/healthz` already keeps, keyed by document | the host's own tally, `raceRefusal` (`error-log.ts`), given a `doc` and written to the same table at the close or hourly |
| N5 | Founder's dwell | B3 | — | **not proposed**: N1's tallies by kind bound it well enough, and a per-card timeline of one named person is the most identifying signal on this list |

**One table, not a log.** The rows land in a new `signals` table (a `signals.jsonl` under the file store), the error log's shape: `at`, `doc`, `seat`, `kind`, and a small JSON payload. It is not hash-chained, it is deleted with its document by `draft-tools delete` and emptied by `wipe`, and it has a retention period from the start (1592.5).

**Why not per-card events with keys.** A row saying *seat m-4 opened race r-17's pair at 14:02 and left* is a measure of hesitation on a named wording by a named seat, and joined to the engine log it says what the member was reading when they hesitated. The tallies answer F1 — *do people open cards and walk away, and which kinds* — without that. If a tally shows a kind people leave, a walk or a sitting finds out why; that is cheaper and kinder than a timeline. 1592.3 asks Ed.

## 4. Privacy and consent

**Where it lives.** The host's own store and the operator's machine. **Never a third party**: no analytics script, no tag, no pixel, no hosted dashboard service — `docs/legal/PRIVACY.md` already promises *no analytics, no tracking pixels, no third-party scripts, no profiling*, and stage 1 keeps every word of that true. Stage 3's signals do not: they are collection, and the sentence must change before they ship (1592.6).

**Who sees what.**

| Who | Sees |
|---|---|
| **Ed** (the operator) | every report and digest, per room and across rooms; per-seat rows, by **seat id** (`m-4`), never a name |
| A coordinator or builder session | what Ed sees, to make the reports and file the findings, on Ed's behalf |
| A Founder | **nothing** in v1 (1592.2) |
| A member | **nothing about any other member, ever**; nothing about themselves in v1. SPEC §1's *per-person participation statistics* in the record are a different thing — a promise of the record, read under the document's own disclosure rungs, and on the record-builder's road (CLAUDE.md glossary, `record-builder`), not this plan's |
| The public repository | **aggregates and seat ids only**: a finding filed as an issue names the room's slug, the measure, the number, and a seat id and time where it needs one (the error log's practice today, OPERATING §11) — **never a wording from a document, a rationale, a name or an address** (1592.7). The repository is public |

**Sealed authorship stays sealed in anything shared.** The store already knows every author — the operator can read it now — so a report does not widen what the operator holds. What it must not do is carry it anywhere wider: a report never puts an author beside a wording, never prints a wording at all unless Ed asks for one by a flag, and keys every per-member row by seat id. Anything that leaves Ed's hands is aggregate, and an aggregate over fewer than three members is not printed (a room of two cannot have *the share who proposed* without saying who).

**Judgments.** A report counts judgments; it never prints how a member voted. The engine log holds that under every 👁️ rung (SPEC §3.5a), and a report is not a reveal.

**Machine members.** Demo bots and room bots are members and act through the same path (`applyCommand`, DEMO.md). Every report splits human from machine and keeps machines out of the headline numbers (1592.8); bot rooms are baselines (§6), never results.

**Retention.** Reports carry no names and no member text, so they are kept. The signals table is kept for a fixed period and then deleted (1592.5); the error log's own period is still PRODUCTION.md stage 12's placeholder, and this plan does not settle it.

**Erasure.** A report keyed by seat id holds nothing `draft-tools erase` needs to reach; the signals table is keyed the same way and goes with its document.

## 5. The process — from a number to a piece of work

**The loop, smallest first.**

1. **A report per room** (stage 1–2). After a room closes, or on demand for a perpetual document and after each demo sitting, the operator's session exports the room and runs `room-report` over it. One page: the headline line, §2's tables filled in, and **the flags** — each a measure crossing a fixed threshold, printed first.
2. **Ed reads it within a day**, beside the error log, which he already reads then (OPERATING §11, *When it is read*; `docs/runbooks/demo-day.md` § *Afterwards*). One read, two instruments.
3. **A flag becomes a finding, a finding becomes an issue.** The coordinator turns each flag into a finding of a fixed shape — the measure, the number, the threshold, the room, the log `seq`s that are its evidence, and a one-line guess at the cause — and files it as an issue (a bug, or an item for Ed's questions page where it needs a ruling), privacy as §4. **A finding with a guard to write joins the sprint tier from its first day** (CLAUDE.md, Q1547), exactly as a walk for a bug does today.
4. **A weekly digest** (stage 4) — the four headline numbers for every room active that week, against the weeks before. **Deferred on a condition**: it is built once three rooms close in one week, or Ed asks. Before that a digest of one room is that room's report.

**Where it lands** (1592.1). Each room's report is a **private artifact** (an HTML page on claude.ai, private to Ed) and one *update* on Ed's questions page per room — *Room nh2026: report ready — 3 flags* — with the artifact under `links`; Ed's OK says he has read it. The digest, when built, is one artifact republished to the same URL each week, so its history is the artifact's versions. Nothing about a room's numbers lands on GitHub except §4's findings.

**The flags that would have caught this fortnight's pain points.** The smallest loop is the one that turns these into automatic first lines:

| Pain point | Found by | The flag that would have raised it |
|---|---|---|
| #150, a bot's rewrite sent as an insertion left both wordings in /demo (2026-10-02) | Ed's eye, on a screenshot | **O10 twins > 0** at any version — a demo report after the sitting prints the two blocks' line numbers |
| Q1200, the page capped every member at one comparison per race | a walk, after the fact | **S5 per member per race never above 1** across a whole room |
| Q1491, CRLF lines refused for ever; the nh2026 convention's forty refusals | a copied file and a one-off script | **F4: one reason > 20% of a room's refusals**, or one clause refusing twice |
| Q1486, the field composers needed two presses | Ed, in a room | **F11 two presses > 0** |
| Q1477, pages open across 🍾 aimed proposals two lines low | Ed, in a room | **F4 refusals clustered within minutes of `constituted`** |

Each would have been a flag in a report the morning after its room, not a find by eye, a walk or a copied file. Q1200 and Q1477 are the weakest of the five: a member's one vote per race is also what a small room might do, and a refusal cluster after 🍾 needs a human reading. **That is the recommendation: stage 1 with these flags, run after every demo sitting and every room, read beside the error log.** Everything else in §2 is printed but not flagged until a room shows it matters.

**How a measurement becomes a feature.** Not every insight is a bug. A measure that settles a product question becomes a **QUESTIONS.md item for Ed with the number in it** — the coordinator's proposal and the evidence, recommendation first — and only Ed's ruling makes it work. The candidates already visible, each waiting on its measure, none proposed here:

| If a report shows | It may become |
|---|---|
| F1: people open pair cards and leave without voting | a lighter pair card, or ❄️ offered sooner — SURFACE's call |
| S1 long while S7 is high: votes are fast but slow to start | a nudge for the first vote on a new proposal (SPEC §8.4's digest, today a ledger row) |
| P1 low, P2 high: a room of voters | an easier door to propose (MOBILE.md §6a is the phone half) |
| B1 long, B3 concentrated on one card | that card simplified, or a preset for it |
| P4 slow arrival | the invitation mail's copy, or a reminder |
| O4 reversions above zero | the cooldown or the floor revisited (the churn pair's own question, R-116) |
| F8: most seats on phones | MOBILE.md's stages reordered |

## 6. Stages

| # | Stage | Done when |
|---|---|---|
| 1 | ☐ **`room-report`, offline, logs only.** `scripts/room-report.mjs`, run under `tsx` like `demo-check`: given a data directory in the file layout (`docs/<id>/log.jsonl`, `engine.jsonl`, `bridge.json`) and a slug or id, it replays both logs (`ConstitutionSession.replay`, `Session.replay`), computes every **yes**, **replay** and **join** row of §2 it has a source for, takes the log-only half of `computeMetrics` and `strandedAtClose` rather than re-deriving them, reads `errors.jsonl` where present, and prints one Markdown page: the headline line, the flags (§5), the five tables, *new* rows marked *no source yet*. **An instrument**: it asserts nothing and changes nothing (CLAUDE.md's *instrument, not a guard*). **About a day and a half**: a day for the measures and the page, half a day for the baselines below. | (1) **Baselines**, all without a live room: a `scale-seed` pool (`npm run scale-seed -w @draft/sim-harness`, the full file layout), a `room-bots` room on a dev server's data dir, and a sim run's engine log (`runSession`) for the engine-only rows; (2) on the sim run, comparisons, adoptions, flips and reversions **equal `computeMetrics`'**; (3) the same input twice gives a byte-identical page; (4) no wording, rationale, name or address in the output unless `--text`; (5) machine members split from human (1592.8); (6) on a hand-made pair of near-duplicate adjacent blocks, O10 flags them, and on the scale-seed pool it flags nothing. |
| 2 | ☐ **Getting a real room's logs to it.** docs.vote: `draft-tools export` already writes the file layout, but the whole store and without the error log — a one-document verb (`draft-tools export-doc <store> <id> <dir>`) that also writes that document's error lines. The demo: its past is memory-only (DEMO.md D1), so a **key-gated `GET /api/demo/export`** behind `demoRefused`, the same gate as every Ed-only demo route, returning both logs and the bridge of the current generation — never written to the store (1592.4). The runbook lines (§7). **About a day.** | `export-doc` on the Postgres CI store gives a directory `room-report` reads, its hashes verified by replay; `demo-access` refusals hold for the new route (404 without the key, 401 without the cookie); a demo sitting's report run from the export prints S1–S8 and O10; `verify-deploy` asserts the route refuses a stranger. |
| 3 | ☐ **The signals** (§3, on Ed's rulings 1592.3–1592.6): the beacon, `POST /api/d/:slug/signal` with its six-field discipline and two rate limits like `/api/page-error`, the `signals` table (a migration, both stores, `errorLogContract`'s twin), N4's per-document race tally, retention, and `room-report` reading it. **About two days.** **Not before** `PRIVACY.md`'s sentence is changed on Ed's word (1592.6). | Persistence tests over both stores; a walk asserting the beacon carries no key, no text and no user agent (its body against an allow-list); a seat's view and every page carry nothing from the table (`spec-check`-style scan of `views.ts`); `wipe` and `delete` empty it; F1, F7, F8 printed for a walk room. |
| 4 | ☐ **The digest** — `room-report --since=<date>` over every document active in the window, the headline table across rooms, published as one artifact. **Deferred until three rooms close in one week, or Ed asks.** | Two weeks' digests on the same URL; every row aggregate, nothing under three members printed. |

## 7. Documents to change when built (scheduled, not performed)

- **Stage 1**: CLAUDE.md's glossary — `room-report` [file], one line, *an instrument, not a guard*; `design/GLOSSARY.md` if Ed prefers tooling there (Q1548 puts tooling names there).
- **Stage 2**: `docs/OPERATING.md` §5 (`export-doc`) and §12 (the demo export); `docs/runbooks/demo-day.md` § *Afterwards* — *export, run `room-report`, publish, put the update on the page*; DEMO.md's §0.1 D1 gains *exported on the key, never stored*.
- **Stage 3**: `docs/legal/PRIVACY.md` — *Things we do not collect* loses *no analytics* for a precise sentence (what is counted, that it is counted on our host, how long it is kept), and *How long we keep things* gains the signals period; `docs/OPERATING.md` §11's sibling for the signals table; SPEC §11's *private during* list is already the rule, so SPEC changes only if Ed wants the signals named there.
- **QUESTIONS.md**: block 1592 spent at the fold (the coordinator writes it, CONVENTIONS *Shared ledgers*).
- **PRODUCTION.md**: one row in *The stages* pointing here, beside 17 and 18's pointer — written when stage 1 lands.

## 8. Questions for Ed

Put to Ed as **1592.1–1592.9** on PR #181, each with its recommendation first. *Cost* is build time.

1. **Where a room's report lands.** **(a) Recommended:** a private artifact per room, and one update on the questions page linking it — Ed reads it on his phone the morning after, with the error log. (b) A Markdown file under `design/` — no: the repository is public. (c) Only in the session that made it — no: it dies with the session.
2. **Does a Founder see their own room's report?** **(a) Recommended:** not in v1 — the report is the operator's reading of the product, and a Founder's version is a feature with its own privacy design (the record's *participation statistics*, SPEC §1). (b) Yes, the aggregate page without per-seat rows. Cost of (b): a route, a card, a disclosure pass.
3. **Card opened and left: how much to collect.** **(a) Recommended:** per-load tallies by card kind, no keys (§3 N1). (b) Per-card events with the race or setting key — answers *which* card, and records hesitation on named wordings by seat. (c) Nothing: find it in sittings instead.
4. **The demo's logs.** **(a) Recommended:** a key-gated export route on the demo, the current generation, never stored (stage 2). (b) Snapshot each generation to disk at Reset — breaks D1's *never written*. (c) Measure the demo only on a local server.
5. **Retention of the signals table.** **(a) Recommended:** 90 days, then deleted by the host; reports kept, as they hold no names. (b) Until the room closes plus 30 days. (c) Decide with stage 12's other periods — leaves the table unbounded until go-live.
6. **Telling members.** **(a) Recommended:** change `PRIVACY.md`'s draft in stage 3's own PR, before the beacon ships, so the draft never says *no analytics* over a host that counts; stage 12 stays parked for everything else. (b) Wait for stage 12 — the draft is not in force or linked, so nobody is misled today, but the draft goes stale.
7. **What a finding filed on GitHub may carry.** **(a) Recommended:** the slug, the measure, the number, and a seat id and time where needed — today's error-log practice — never a wording, a rationale, a name or an address. (b) The slug and the number only, seat ids kept in the private report.
8. **Machine members.** **(a) Recommended:** reported apart and kept out of the headline numbers; bot rooms are baselines. (b) Counted with humans, flagged.
9. **When stage 1 is built.** **(a) Recommended:** now, beside the redesign — it is one offline script that ships nothing, touches no page and no gate, and the next demo sitting is its first room. (b) After redesign stage 10, with the other post-redesign work.

## 9. Names

Proposed, to join the glossary as each lands (§7): `room-report` [file] — the offline instrument that replays a room's logs into one page of measures and flags; `headline numbers` [concept] — H1–H4; `flag` [concept] — a measure past its threshold, printed first in a report; `finding` [concept] — a flag turned into an issue or a question, of §5's fixed shape; `signals` [concept] — §3's content-free table, never a log; `room digest` [concept] — stage 4's weekly page.
