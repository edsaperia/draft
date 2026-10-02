# ANALYTICS.md — what we measure about rooms, and how a number becomes work

A working document like `design/MOBILE.md`: stages get checked off as they land, questions are numbered from the project sequence and answered by Ed, and rules that come out of it go into the rule files when built. **SPEC.md and SURFACE.md win wherever this document disagrees with them**, as they win over every plan; `docs/OPERATING.md` wins on what runs where and what configures it; `docs/legal/PRIVACY.md` is what members will be told, and its draft is brought up to date by PRODUCTION.md stage 12, not here (§4, 1592.6); the code wins over all of them. This file **cites rather than restates**, and it **schedules** its edits to other documents (§7) rather than making them alongside the plan.

Written 2026-10-02 from issue #180 (Ed, the coordinator chat the same day: *we should think about all the things we want to measure about rooms and create an analytics process that tells us insights we can turn into features / remove pain points*). Ed's calls on it are **QUESTIONS.md 1592**, nine of them, **all ruled by Ed on 2026-10-02** and folded in below (§8). **This is a plan: no product code changed.** Evidence points at a file and a symbol, never a line number (PRODUCTION.md stage 15's convention).

## Status

- **Planned 2026-10-02**, PR #181. Nothing built. All nine questions ruled by Ed the same evening (§8).
- **Scheduled after redesign stage 10** (1592.9), with the other post-redesign work.

## 0. The goal, and the four headline numbers

**What it serves.** CLAUDE.md's guiding light: *user acceptance, and the edge is speed*, set against **the huddle** — *a room huddling around google docs in suggestion mode … in an hour you might discuss a handful of amendments. This product … in an hour a group might be able to do several dozen amendments* (Ed, 2026-09-25). That sentence is a claim with a number in it, and today nothing measures it. The first job of analytics is to say, per room, whether the claim held.

**The four headline numbers**, on every report's first line, each defined in §2:

| # | Number | What it says | Against |
|---|---|---|---|
| H1 | **Changes decided per active hour** (S3) | how fast the room moves its text | the huddle's *handful* an hour; Ed's *several dozen* |
| H2 | **Proposal to decided**, median and p90 (S2) | how long a member waits to know | the nh2026 convention's, the first real room whose logs exist |
| H3 | **Votes per decided change** (S5) | what a change costs the room | the rival-pair ranking Ed kept (Q1538, Q1539) is paid for here: the number says how much |
| H4 | **Share of members who propose at all** (P1) | whether *everyone may propose* is true in practice | the huddle, where one person's taste moderates the drafting |

A fifth sits beside them on the same line without being a headline: **the share of members who vote at all** (P2), because H4 without it reads a quiet room as a room of voters.

**What a headline is not.** None of the four is served to a member, a Founder or a stranger on any page (§4). They are the product's development numbers — *this is just for product development* (Ed, 1592.2) — never a feature of a room.

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

**What nothing holds:** a card opened and left; anything about the device; a poll that failed and recovered; the founder's dwell on a card. **The demo document is out of scope** (Ed, 1592.4: *demo is not a good thing to log because it's mostly bot activity*): its past is memory-only by design (DEMO.md §0.1 D1), and it stays that way.

**What already computes over these.** `computeMetrics` (`packages/sim-harness/src/metrics.ts`) reads an engine log into comparisons, adoptions, site churn (`SiteChurn`: flips and reversions), `approvalsAtAdoption`, `firstAdoptionMs` and `candidatesNeverJudged` — its log-only half is most of §2's *outcomes*, and stage 1 takes it rather than re-deriving it. `strandedAtClose` and `auditTokens` (`token-audit.ts`) are the same kind. `scripts/repro/nh2026-refusals.mjs` is the precedent for the whole approach: an instrument that replays a real room's `engine.jsonl` against its `errors.jsonl`, asserting nothing, and it found Q1491.

## 2. The catalogue

Each measure has an id, a definition, its source, and **Logs?** — **yes** (a fold over one log), **replay** (needs the engine's own reading at a moment, `races(t)` or `dominated()`), **join** (two sources by `doc` and `t`), or **new** (nothing holds it; §3 says the smallest signal that would). *Active hour*: a ten-minute bucket in which any member acted counts as a sixth of one, so a perpetual document's quiet weekend does not dilute its pace. *Member* means a human member; machine members are reported apart and never counted in a headline (1592.8). *Decided* means adopted (✔) or closed for good (✖: dominated, withdrawn, held, refused at the crown); *undecided at close* is its own outcome.

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

**One table, not a log.** The rows land in a new `signals` table (a `signals.jsonl` under the file store), the error log's shape: `at`, `doc`, `seat`, `kind`, and a small JSON payload. It is not hash-chained, it is deleted with its document by `draft-tools delete` and emptied by `wipe`, and its retention period is settled with PRODUCTION.md stage 12's other periods (1592.5): **until then it is unbounded**, as the error log is today.

**Why not per-card events with keys.** A row saying *seat m-4 opened race r-17's pair at 14:02 and left* is a measure of hesitation on a named wording by a named seat, and joined to the engine log it says what the member was reading when they hesitated. The tallies answer F1 — *do people open cards and walk away, and which kinds* — without that. If a tally shows a kind people leave, a walk or a sitting finds out why; that is cheaper and kinder than a timeline. **Ruled (a), Ed 2026-10-02 (1592.3): counts per page load, by card kind only, no keys.**

## 4. Privacy and consent

**Where it lives.** The host's own store, and **the report as a Markdown file in this repository** (1592.1, §5). **Never a third party**: no analytics script, no tag, no pixel, no hosted dashboard service. `docs/legal/PRIVACY.md`'s draft promises *no analytics, no tracking pixels, no third-party scripts, no profiling*. Stages 1 and 2 keep that true, since they only read what the host already holds. **Stage 3's signals make *no analytics … no profiling* stale**: they are new collection. By Ed's ruling (1592.6, (b)) the sentence is fixed by PRODUCTION.md stage 12's privacy work, not by this plan. The draft is neither in force nor linked from the product, so nobody is misled meanwhile.

**The report is public, so it is anonymised by construction.** Ed ruled the report a Markdown file in the repo, *with details anonymised* (1592.1). What a public finding may carry is the most the file may carry (1592.7):

| Carried | Never carried |
|---|---|
| the room's slug and dates; the four headline numbers; every §2 measure as a count, a share, a median or a p90; **distributions** (the top member's share, the top fifth's) | a name, an address, a picture |
| a flag's evidence as log `seq`s and times | a wording, a rationale, a closing comment, an application's words — anything a member wrote |
| a seat id and time **on a defect flag only** (F4, F5, F11), the error log's practice (OPERATING §11) | **a per-seat row of behaviour** — who proposed how much, who voted how often, who left cards |
| | how anybody voted, under any 👁️ rung (SPEC §3.5a): a report counts judgments and is never a reveal |
| | any aggregate over **fewer than three members** — printed as *fewer than three* |

**Why no per-seat rows, though 1592.7 allows seat ids.** A seat id is `m-<n>`, minted in invitation order (`ConstitutionSession`, `nextMemberN`), and a member's page knows the room's ids. A public row *m-4: 0 proposals, 31 votes* is readable as a named member's record by everyone in that room. That would break the brief's *a member never sees analytics about other members*. A defect line is different: it says the product failed a seat, not how a member behaved. So seat ids appear only there, as Ed ruled for findings. Per-report pseudonyms (S1, S2…) were weighed and rejected. In a room of eight, a pseudonym with a distinctive count is a name to anyone who was there, and distributions say what the product needs.

**Who sees what.**

| Who | Sees |
|---|---|
| **Anyone** (the repository is public) | the anonymised report and the findings, as above |
| **Ed** and a coordinator or builder session on his behalf | the same, plus the raw logs the operator already holds; the report widens nothing they could read before |
| **A Founder** | **nothing** beyond the public file: no route, no card, no page (Ed, 1592.2: *No, this is just for product development*) |
| **A member** | **nothing on any page**, about anybody. SPEC §1's *per-person participation statistics* in the record are a different thing: a promise of the record, read under the document's own disclosure rungs, and on the record-builder's road (CLAUDE.md glossary, `record-builder`), not this plan's |

**Sealed authorship stays sealed.** The store already knows every author, and the report never prints a wording, so it can never put an author beside one.

**Machine members** (1592.8, (a)). Room bots are members and act through the same path as people (`applyCommand`). Every report splits human from machine and **keeps machines out of the four headline numbers**. Bot rooms and sim runs are baselines, never results, and their reports say so on the first line.

**Retention** (1592.5, (c)). Reports hold no names and no member text, and stay in the repository's history. The signals table's period is decided with PRODUCTION.md stage 12's other periods, beside the error log's placeholder. **Until then it is unbounded**, as the error log is.

**Erasure.** A report holds nothing `draft-tools erase` needs to reach. The signals table is keyed by seat id and goes with its document on `delete` and `wipe`.

## 5. The process — from a number to a piece of work

**The loop, smallest first.**

1. **A report per room** (stages 1–2). After a room closes, or on demand for a perpetual document, `room-report` runs over the room's logs on the host and its anonymised page is committed as `design/rooms/<YYYY-MM-DD>-<slug>.md`, the date being the close or the run. One page: the headline line, §2's tables filled in, and **the flags** printed first. A flag is a measure crossing a fixed threshold.
2. **Ed reads it within a day**, beside the error log, which he already reads then (OPERATING §11, *When it is read*; `docs/runbooks/demo-day.md` § *Afterwards*). One read, two instruments.
3. **A flag becomes a finding, a finding becomes an issue.** The coordinator turns each flag into a finding of a fixed shape — the measure, the number, the threshold, the room, the log `seq`s that are its evidence, and a one-line guess at the cause — and files it as an issue (a bug, or an item for Ed's questions page where it needs a ruling), privacy as §4. **A finding with a guard to write joins the sprint tier from its first day** (CLAUDE.md, Q1547), exactly as a walk for a bug does today.
4. **A weekly digest** (stage 4): the four headline numbers for every room active that week, against the weeks before, as `design/rooms/digest-<YYYY>-W<ww>.md`. **Deferred on a condition**: it is built once three rooms close in one week, or when Ed asks. Before that, a digest of one room is that room's report.

**Where it lands, and who writes it** (1592.1, Ed: *How about a markdown file in the repo, with details anonymised?*). The report is a Markdown file under `design/rooms/`, anonymised as §4 says. The room's slug names it, which 1592.7 allows. **Who makes it:**

1. A `workflow_dispatch` workflow, `room-report.yml` (stage 2), takes a slug. A coordinator starts it with the GitHub tool when a room closes, or Ed starts it from the Actions tab.
2. The workflow asks the host for the page over `GET /api/admin/room-report/:slug`, behind `DRAFT_ADMIN_KEY`, which CI already holds as a secret (PRODUCTION.md, *Issue #10*). The route answers only the anonymised Markdown, so the key reveals nothing the commit would not.
3. The workflow opens a documents-only PR with the file. The coordinator merges it under CONVENTIONS' *A merge that deploys nothing is the coordinator's own*: `design/rooms/*.md` is outside `SURFACE_ERE` and inside the `docs` lane (`ci.yml`, the deploy step).
4. The coordinator puts one *update* on Ed's questions page per room, *Room nh2026: report ready — 3 flags*, with the file under `links`. Ed's OK says he has read it.

No session ever needs the host's shell, and no raw log leaves the host.

**The flags that would have caught this fortnight's pain points.** The smallest loop is the one that turns these into automatic first lines:

| Pain point | Found by | The flag that would have raised it |
|---|---|---|
| #150, a bot's rewrite sent as an insertion left both wordings in /demo (2026-10-02) | Ed's eye, on a screenshot | **O10 twins > 0** at any version. The demo itself is unmeasured (1592.4), so this flag catches the same shape in a human room or a bot room, where a member's rewrite lands as an insertion |
| Q1200, the page capped every member at one comparison per race | a walk, after the fact | **S5 per member per race never above 1** across a whole room |
| Q1491, CRLF lines refused for ever; the nh2026 convention's forty refusals | a copied file and a one-off script | **F4: one reason > 20% of a room's refusals**, or one clause refusing twice |
| Q1486, the field composers needed two presses | Ed, in a room | **F11 two presses > 0** |
| Q1477, pages open across 🍾 aimed proposals two lines low | Ed, in a room | **F4 refusals clustered within minutes of `constituted`** |

Each would have been a flag in a report the morning after its room, not a find by eye, a walk or a copied file. Q1200 and Q1477 are the weakest of the five: a member's one vote per race is also what a small room might do, and a refusal cluster after 🍾 needs a human reading. **That is the recommendation: stage 1 with these flags, run after every room, read beside the error log.** Everything else in §2 is printed but not flagged until a room shows it matters.

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
| 1 | ☐ **`room-report`, offline, logs only.** **After redesign stage 10** (1592.9). A pure module, `packages/server/src/room-report.ts`: both logs, the bridge and the error lines in, the anonymised page out. It is pure so stage 2's route and the offline script share one implementation. The script is `scripts/room-report.mjs`, run under `tsx` like `demo-check`. Given a data directory in the file layout (`docs/<id>/log.jsonl`, `engine.jsonl`, `bridge.json`, and `errors.jsonl` beside them) and a slug, it replays both logs (`ConstitutionSession.replay`, `Session.replay`) and computes every **yes**, **replay** and **join** row of §2. `computeMetrics`' log-only half (churn, comparisons, `approvalsAtAdoption`, `candidatesNeverJudged`) and `strandedAtClose` move into engine-core, so the sim-harness and the report read one implementation. The output is one Markdown page in §4's shape: the headline line, the flags (§5), the five tables, *new* rows marked *no source yet*. **An instrument**: it asserts nothing and changes nothing (CLAUDE.md's *instrument, not a guard*). **About a day and a half**: a day for the measures and the page, half a day for the baselines. | (1) **Baselines**, without the demo (1592.4) and without a live room: a `scale-seed` pool (`npm run scale-seed -w @draft/sim-harness`, the full file layout), a `room-bots` room on a dev server's data dir, and a sim run's engine log (`runSession`) for the engine-only rows, each report's first line saying *machine members only — a baseline*; (2) on the sim run, comparisons, adoptions, flips and reversions **equal `computeMetrics`'**; (3) the same input twice gives a byte-identical page; (4) **the page carries nothing §4 forbids**: a test seeds a room whose members' names, addresses, wordings and rationales are unique strings and asserts that none appears in the page, that no seat id appears outside a defect flag, and that a two-member room prints *fewer than three*; (5) machines are split from humans and absent from the headline numbers; (6) on a hand-made pair of near-duplicate adjacent blocks O10 flags them, and on the scale-seed pool it flags nothing. |
| 2 | ☐ **Getting a real room's report into the repo** (§5's four steps): `GET /api/admin/room-report/:slug` behind `bearerRefused(ctx.cfg.adminKey)`, answering the module's Markdown and nothing else; `room-report.yml` (`workflow_dispatch`, input `slug`), which fetches the page with CI's admin-key secret and opens a documents-only PR adding `design/rooms/<date>-<slug>.md`. **No demo export** (1592.4). **About a day.** | `room-report.test.ts`: 404 with the key unset, 401 without it or with the bot key, 200 with it, and the body equal to the offline script's page over the same store; `verify-deploy` asserts the route refuses a stranger; one dispatch against a dev host opens a PR whose only file sits under `design/rooms/`, and the deploy step reads its push as the `docs` lane. |
| 3 | ☐ **The signals** (§3, as ruled 1592.3): the beacon; `POST /api/d/:slug/signal` with `/api/page-error`'s discipline (fields allow-listed, the seat and build from the host, two rate limits); the `signals` table (a migration, both stores, `errorLogContract`'s twin); N4's per-document race tally; `room-report` reading it. Retention waits for stage 12, unbounded until then (1592.5). The privacy draft waits for stage 12 too (1592.6). **About two days.** | Persistence tests over both stores; a walk asserting the beacon carries no key, no text and no user agent (its body against an allow-list); no view and no page carries anything from the table (`spec-check`-style scan of `views.ts`); `wipe` and `delete` empty it; F1, F7, F8 printed for a walk room. |
| 4 | ☐ **The digest**: `room-report --since=<date>` over every document active in the window, the headline table across rooms, committed as `design/rooms/digest-<YYYY>-W<ww>.md` by the same workflow. **Deferred until three rooms close in one week, or Ed asks.** | Two weeks' digests in `design/rooms/`; every row aggregate, nothing under three members printed. |

## 7. Documents to change when built (scheduled, not performed)

- **Stage 1**: CLAUDE.md's Documents table gains `design/rooms/` (*anonymised room reports, §4; never edited, a new run adds a new file*); the glossary gains `room-report` [file], one line, *an instrument, not a guard*; `design/GLOSSARY.md` if Ed prefers tooling there (Q1548 puts tooling names there).
- **Stage 2**: `docs/OPERATING.md` §2 (the admin key's new use) and §11's neighbour for the route; `docs/runbooks/demo-day.md` § *Afterwards* gains *dispatch `room-report.yml` with the slug; merge its PR; put the update on the page*; PRODUCTION.md's *Issue #10* row names the route beside pause and surface.
- **Stage 3**: `docs/OPERATING.md` §11's sibling for the signals table; PRODUCTION.md stage 12 gains two items, the signals table's retention period (1592.5) and *Things we do not collect* in `docs/legal/PRIVACY.md`, which the signals make stale (1592.6). SPEC §11's *private during* list is already the rule, so SPEC changes only if Ed wants the signals named there.
- **QUESTIONS.md**: block 1592 spent at the fold (the coordinator writes it, CONVENTIONS *Shared ledgers*).
- **PRODUCTION.md**: one row in *The stages* pointing here, beside 17 and 18's pointer — written when stage 1 lands.

## 8. Ed's rulings (1592)

Put to Ed as **1592.1–1592.9** on PR #181, each with its recommendation first. **All nine were ruled by Ed on 2026-10-02**, relayed by the coordinator, and are folded in above.

1. **Where a room's report lands.** **Ruled, Ed's own option:** *How about a markdown file in the repo, with details anonymised?* The report goes to `design/rooms/<date>-<slug>.md`, anonymised by construction (§4), made by a workflow and merged by the coordinator as a documents-only PR (§5). This also bounds the file by 1592.7.
2. **Does a Founder see their own room's report?** **Ruled (a):** *No, this is just for product development.* No Founder-facing route, card or page.
3. **Card opened and left.** **Ruled (a):** counts per page load, by card kind only, no keys (§3, N1).
4. **The demo's logs.** **Ruled, Ed's own answer:** *demo is not a good thing to log because it's mostly bot activity.* The demo is unmeasured, with no export. Baselines come from the sim-harness and bot rooms, reported apart.
5. **Retention of the signals table.** **Ruled (c):** decided with PRODUCTION.md stage 12's other periods. Unbounded until then, as the error log is.
6. **Telling members.** **Ruled (b):** the privacy draft waits for stage 12. Stage 3's signals make its *No analytics … no profiling* stale, and stage 12 fixes the sentence (§4, §7).
7. **What a finding filed on GitHub may carry.** **Ruled (a):** the slug, the measure, the number, and a seat id and time where needed. Never a wording, a rationale, a name or an address. Since the report is public, the same limit binds the file. §4 narrows it further: a seat id appears on a defect flag only, never on a row of a member's behaviour.
8. **Machine members.** **Ruled (a):** reported apart and never counted in the four headline numbers. Bot rooms are baselines, never results.
9. **When stage 1 is built.** **Ruled (b):** after redesign stage 10, with the other post-redesign work.

## 9. Names

Proposed, to join the glossary as each lands (§7): `room-report` [file] — the offline instrument that replays a room's logs into one page of measures and flags; `headline numbers` [concept] — H1–H4; `flag` [concept] — a measure past its threshold, printed first in a report; `finding` [concept] — a flag turned into an issue or a question, of §5's fixed shape; `signals` [concept] — §3's content-free table, never a log; `room digest` [concept] — stage 4's weekly page; `design/rooms/` [file] — where the reports and digests are committed; `room-report.yml` [file] — the workflow that fetches a room's report from the host and opens its PR.
