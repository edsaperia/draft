/**
 * **The seat matrix** (backlog entry 127, plan-queue 38): N seats × the
 * epochs, the rail asserted per seat against SURFACE §2's audience column.
 *
 * Against a **running server** it founds a document, seats several Playwright
 * contexts as distinct roles — founder, two members who arrive before the
 * post-start rule, one who arrives after it, one who lapses for real, a
 * stranger and an applicant — drives the document through three epochs
 * (`EPOCHS`: before 🍾, live, closed) and after every step snapshots two
 * things per seat: the **rail**, read the way `journey-walk.mjs` reads it, and
 * the server's **`view()`** for that seat, fetched from inside the seat's own
 * page so its cookie rides. The assertion is one column of one table: for
 * each SURFACE §2 event a step triggers, the seats inside the *Audience* cell
 * must carry the entry and the seats outside it must not.
 *
 *   npm run server                      # in another shell, with a dev outbox
 *   npm run seat-matrix -- [<base-url>] [--hat=member|clerk|both]
 *        # the base defaults to DRAFT_BASE_URL, then PORT, then 8140
 *        [--to=before|live|closed] [--out=<file>] [--baseline=<file>]
 *
 * Three tables and one dispatcher: `SEATS` (who), `STEPS` (what happens, in
 * run order, each row naming the §2 events it triggers and the rail key the
 * audience should carry), `AUDIENCE` (SURFACE's audience cells, **character
 * for character**, to a predicate over a seat and a step — a reworded cell is
 * *no rule* until somebody reads it, which is the guard and not a nuisance),
 * and `RUN`, one case per step kind. Adding a step is adding a row.
 *
 * What it does NOT assert: any flight, wash or transition (the automation tab
 * is backgrounded — rAF never fires); copy; the Channel, Ask, Close and
 * Persistence columns. Holds are driven by a real pointer for their full
 * length. One window size, scroll 0.
 *
 * Exit codes: 0 green · 1 any finding, page error, refused command or a seat
 * that could not be stood · 3 **no-rule rows nobody has filed** (a cell the
 * harness cannot read, or a row that passed over an empty audience: red on
 * purpose, so somebody files the Q; distinguishable from a failure so a gate
 * can tell the two apart — and once filed, `filed: 'Qn'` on the event's row
 * reports it under `filed` and the run is green again) · 2 is
 * `assert-server`'s.
 * **Exit 3 fails the job** (Q1354, Ed 2026-09-14: *a cell nobody has written
 * a rule for reddens the job until it is read*). Until that date CI accepted
 * it as this harness's own green, because three cells stood unread and no run
 * could reach 0; with E11 and E22 read (Q1355) and E13's vacuous pass caught
 * (Q1356) the green line is 0, and 3 goes back to meaning what it says. The
 * code stays 3 rather than 1 so a reader can still tell an unread cell from a
 * product finding — it is the CI step that no longer forgives it.
 * The last line is machine-readable: `seat-matrix: findings=… noRule=… filed=… …`
 * — `filed` is in it because a run carried green over a growing pile of filed
 * rows is exactly what a gate needs to be able to see.
 *
 * **Where it stands, 2026-09-07** (the pass that re-read it against HEAD).
 * Three harness faults were fixed then and are named at their rows: an event
 * raised by a step that **did not happen** — skipped by `ifHat`, or thrown —
 * is no longer asserted against the seats (`D.skipped`); the
 * two steps that pressed OK on the founder's own 💡 and ⚖️ are **retired**,
 * Ed's ruling of 2026-09-01 having taken those cards off the founder's page
 * (`selfSet` on `E4` is what the founder carries instead); and a seat whose
 * **snapshot throws** is reported rather than dropped out of every audience in
 * silence. What is left red is the product, and each of the three is a
 * question already on the register:
 *   · **Q919 (b)**, `S.seen` never rebuilt from a poll — a member's page open
 *     across a later founder act withholds every card below the one that
 *     changed, for ever. `early` and `lapsed` report it on E4, E5 and E10; the
 *     `late` seat, freshly booted, carries all of them, which is the proof.
 *   · **Q920**, `view.convenor.isMember` stale for a clerk — the clerk
 *     document never begins, and every clerk row after `begin` is that.
 *   · the **applicant's live page** had no branch at all (Q1281, fixed
 *     2026-09-07): the server's applicant payload carried no `view`, and
 *     `remoteCS` read `self.v.view.*` unguarded, so the seat was dead from
 *     `knock` on — and read as *quiet*, because `liveBoot`'s catch swallowed
 *     the throw and the snapshot's failure dropped the seat from every
 *     audience. `knock` now asserts the page booted as the applicant, and an
 *     `unstood` seat is a red run (exit 1), never a line in the report.
 *
 * Two things learned building it (2026-08-27), both load-bearing:
 *  · **Presence is stamped hourly** (`SEEN_EVERY_MS` in session.ts), so a
 *    page that merely polls does not keep a seat alive under a one-minute 💤 —
 *    every quiet seat lapses, page open or not. The non-lapsing seats here
 *    therefore *act* before every snapshot (`keepAlive`: a `set-identity`
 *    re-stating the seat's own name), which is what the module counts. And
 *    since R-096 (Ed, 2026-09-08) **a read returns a lapsed member**: the
 *    lapsed seat's page is shut until the clock lapses it, and reopening it
 *    is the revival the `wait` step asserts.
 *  · **E9 is asserted, and no row here is filed** (2026-09-01). It was the one
 *    exception until then: on 2026-08-27 the news entry was unbuilt on both
 *    sides, so the `lay-down` row carried no key and was filed as Q918. Both
 *    halves landed on **2026-08-29** — entry 162 (Q1013) built the 👑
 *    `rel:<batch>` news card, `oweReleases` and `ackRelease`, and Ed rewrote
 *    §2's E9 Audience cell as *every member but the actor* — and the row was
 *    left green over a rule it was no longer checking. It now carries the
 *    `rel:` prefix key and the cell has its predicate, so `filed` should stay
 *    empty: a row filed here again means a genuinely unread cell, not this.
 *
 * First full run, 2026-08-27, against build 7eceef8 (plan-queue 41, entry 139)
 * — **red on two findings about the page and the module, not on the harness**:
 *   member: `seat-matrix: findings=15 noRule=0 shape=0 errors=0 refused=0 unstood=0 exit=1`
 *   clerk:  `seat-matrix: findings=25 noRule=0 shape=0 errors=0 refused=0 unstood=4 exit=1`
 * (quoted as they were printed; the line gained `filed=` afterwards).
 * Wall time about 8 minutes per hat (the lapse wait is 80–115 s of it); a
 * second member run `--baseline`d against the first reported *no rail
 * differences*, so `mask` folds every volatile field. Seats
 * stood per document: founder, early, lapsed, stranger before 🍾; late and the
 * applicant live; six of the seven rows, the clerk row on its own document.
 * Every member-hat finding is **Q919** (💤 cannot be rehydrated from the
 * module, so every card below it in `ORDER` is withheld from members) and
 * every clerk-hat one is **Q920** (`view.convenor.isMember` stays `true` for
 * a clerk, so 🏛️ is served and 🍾 waits on it); with those two built the
 * expected line is `findings=0 noRule=3 filed=0 … unstood=0 exit=3` — `filed=1`
 * while Q918's row was the exception, and 0 since it was asserted, so **exit 3
 * was the green line for a while** and 0 was not reachable until somebody
 * filed or keyed the unread rows. Which three they were moved twice: E13's
 * cell was keyed by Q1340 (2026-09-11) and E11's rewritten by Q930, leaving
 * E22 on both hats (mail, no rail entry either side) and E11 on the member
 * hat. Ed read both on 2026-09-14 — the three-cell paragraph below is what
 * replaced this one, and exit 3 is a failure again.
 *
 * **The three unread cells were read, 2026-09-14** (Q1354–Q1356, Ed
 * 2026-09-14), and the harness's green is 0 from here on: `seat-matrix:
 * findings=0 noRule=0 filed=0 shape=0 errors=0 refused=0 unstood=0 exit=0`,
 * ten minutes for both hats against a fresh server.
 *   · **E11** (the member hat) is every member with a page — the mover
 *     included, which is where it parts from E10 — waiting behind ⚖️ rather
 *     than 🏛️ (`waitsOn: 'canjudge'` on the row).
 *   · **E22** (both hats) is mail, so it is asserted against the **dev
 *     outbox** rather than the rail (`mail` on the event, `assertMail`): the
 *     warnings that fit inside the spell, then the package, priced off the
 *     module's own `WARN_LEADS` against this table's one-minute spell — at
 *     which none of the three fits, so what is owed is the package alone. Its
 *     page half is SURFACE's Keys cell for the row staying empty.
 *   · **E13** was keyed by Q1340 and passing over nothing ever since: 👥 at a
 *     count of one parks the race on `early`'s single judgment, so at
 *     `judge-text` no seat could still judge it and the audience was empty on
 *     every seat. The assertion moved up to `propose-text`, and a row whose
 *     audience comes out empty is a `shape` line from now on — **a vacuous
 *     pass is not a pass**, and nothing said so before.
 *
 * **Green, 2026-09-14** (Q1205, Ed 2026-09-14; the run that put it in CI):
 * `seat-matrix: findings=0 noRule=3 filed=0 shape=0 errors=0 refused=0
 * unstood=0 exit=3`, about ten minutes for both hats against a fresh server.
 * The three E10 cells 2026-09-12 left were all the harness reading the page
 * wrongly, and both are fixed at the assertion: a ⏳ entry counted as an ask
 * (the mover's own ledger line), and C9's staging behind an unclaimed 🏛️
 * counted as nothing served (`waitsOn`). Neither SURFACE cell moved.
 * Four harness faults were fixed to get here, each noted at its row: the
 * founder's page reloads after the wire founding (`reload` on `text`), every
 * seat introduces itself with a name and a face (`face`), 💤 is answered on
 * the card and 🏛️ acknowledged (`lapse-card`, `ok-voice`), and the ladder bar
 * is reloaded before it is pressed. The payload (`--out`): `base`, `build`,
 * `hat`, `to`, `seats` (the SEATS table), `epochs`, `documents[]` (one per hat:
 * `hat`, `slug` masked, `steps[]` each `{ id, epoch, events, seats }` where
 * `seats[<name>]` is `{ rail, band, readout, view }` or `{ unstood }`),
 * `findings`, `noRule`, `filed`, `shape`, `unstood`, `errors`, `refused`.
 * The run's JSON is **gitignored by design** (`design/tools/seat-matrix*.json`,
 * *a run is snapshots, not an artifact*): a later session re-runs the harness
 * for its baseline rather than looking for a file that is never committed.
 *
 * **The three rows of 2026-09-14 got their steps** (Q1359, Ed 2026-09-14:
 * *add steps for all three*). E38, E39 and E40 arrived that day and reached no
 * seat; the row-count line below said so and left the decision to Ed. Four
 * steps and three cells later they are asserted like everything else, and each
 * of them needed one thing the table did not already have:
 *   · **E38** needs a text change that a live patch cannot be carried across.
 *     Every adoption on this document parks (🛡️ is kept on the Text from
 *     `begin`) and a park rebases nothing, so the strand is the Founder's
 *     **pen** — which meant keeping ✒️ on the Text at 🍾 too, and standing the
 *     pair of rows ahead of the park, since a decree is refused while one
 *     stands. Its audience is one seat, so the row is as much about the four
 *     that must carry nothing.
 *   · **E39** needs a laid-down power, which `lay-down` has just made, and
 *     puts §9.7 rule 4's `reserve` on ⏱️'s ✒️ tab — the page's own payload,
 *     asserted on the tab's key rather than the setting's.
 *   · **E40** takes a seat **out** of the document, so it stands last in the
 *     live epoch and brings two new ideas with it: `left`, which stops every
 *     *every member* cell counting a seat the document no longer seats, and
 *     `orDeparted`, the third escape hatch beside `selfSet` and `orSigned` —
 *     the removed member is told by the door's sentence, on a channel no rail
 *     key could ever match.
 */
import { writeFile, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';
import { tableAfter, keysOf } from './lib/surface-tables.mjs';
import { say, sleep, arg, linkIn, outbox as devOutbox, typeIn, press } from './lib/walk.mjs';

/* ---- arguments -------------------------------------------------------- */
const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8140');
const EPOCHS = ['before', 'live', 'closed'];
const HAT = arg('hat', 'both');
const TO = arg('to', null);
const OUT = arg('out', 'design/tools/seat-matrix.json');
const BASELINE = arg('baseline', null);
if (!['member', 'clerk', 'both'].includes(HAT)) {
  console.log('FAIL: --hat must be member, clerk or both'); process.exit(1);
}
if (TO !== null && !EPOCHS.includes(TO)) {
  console.log('FAIL: --to must be one of ' + EPOCHS.join(', ')); process.exit(1);
}
const SETTLE_MS = 5000;        // one 4s poll and air — journey's figure
const LAPSE_WAIT_MS = 240_000; // the bound on waiting for the clock to lapse a seat
// 💤's spell on this document, in one place: the `lapse-minute` step sets it
// and E22's mail assertion prices the warnings against it (R-097 sends every
// `WARN_LEADS` lead that fits *inside* the spell, and at a minute none does).
const LAPSE_AFTER_MS = 60_000;
// the bound on waiting for the outbox's sender pass to file a row's mail: it
// runs on a kick after the commit, so a few hundred ms behind the fold
const MAIL_WAIT_MS = 20_000;

/* ---- the spec's tables ------------------------------------------------- */
const EVENTS = tableAfter('SURFACE.md', 'events');
const EVENT = Object.fromEntries(EVENTS.map((r) => [r['#'], r]));
/**
 * **What the harness cannot honestly assert**, and so reports rather than
 * swallows: §2's own shape moving under the table, and — since Q1356 (Ed,
 * 2026-09-14) — a row whose audience came out **empty on every seat**, which
 * is a pass over nothing dressed as a pass. Both land on exit 3 with the
 * no-rule rows, and since Q1354 exit 3 is red in CI.
 */
const shape = [];
// 🍾's hold, read off the page's own ladder rather than guessed (§7.2)
const HOLDS = tableAfter('SURFACE.md', 'holds');
const beginRow = HOLDS.find((r) => (r.control || '').startsWith('🍾'));
const BEGIN_HOLD_MS = beginRow ? Number(beginRow['hold ms']) + 250 : 1250;
// a setting answered on its own card commits on the founder's ✒️, whose hold is
// the table's too — a literal here would silently under-hold the day SURFACE
// lengthens it, and an under-held commit rewinds in silence (§7.2)
const penRow = HOLDS.find((r) => (r.control || '').startsWith('✒️'));
const PEN_HOLD_MS = penRow ? Number(penRow['hold ms']) + 250 : 1250;

/* ---- table 1: the seats ----------------------------------------------- *
 * Data only. `document` says which founder's run a seat belongs to; where in
 * the epochs a seat arrives is the step table's business (`kind: 'seat'`).  */
// `face`: ✋ and 🖼️ are tasks in `ORDER` above 📝 and 🍾, so a seat that has
// not answered both blocks its own founding order (first run, 2026-08-27:
// `no begin card to hold … rail ["mypic"]`). One emoji per member per
// document (`RESERVED_EMOJI`), hence a distinct one per seat.
const SEATS = [
  { name: 'founder', role: 'founder', hat: 'member', document: 'member', person: 'Ada Lovelace', face: 'e🦉' },
  { name: 'clerk', role: 'founder', hat: 'clerk', document: 'clerk', person: 'Ada Lovelace', face: 'e🦉' },
  { name: 'early', role: 'member', stands: 'before-rule', document: 'both', person: 'Bo Marlowe', face: 'e🦊' },
  { name: 'late', role: 'member', stands: 'after-rule', document: 'both', person: 'Dee Latimer', face: 'e🐻' },
  { name: 'lapsed', role: 'member', stands: 'before-rule', lapses: true, document: 'both', person: 'Cy Quiet', face: 'e🐢' },
  { name: 'stranger', role: 'stranger', document: 'both' },
  { name: 'applicant', role: 'applicant', document: 'both', person: 'Rowan Vale' },
];

/* ---- table 3: the audience cells --------------------------------------- *
 * A key is a SURFACE §2 Audience cell **verbatim**; the value a predicate over
 * (seat, step, ctx). `ctx.stoodAt[name]` is the index of the step that stood
 * the seat; `ev.at` the index of the step at which the event happened
 * (defaults to the step it is listed on).                                  */
// **A seat the document has stopped seating is not a member** (E40, Q1359).
// `left` is set by the `carry-removal` runner at the step that removes them,
// and every cell that says *every member* has to stop counting them from that
// step on — E24's signature at the close first of all, which a removed seat
// can never carry because its page is the door. It rides on the per-document
// seat object the assertion spreads, never on the shared `SEATS` row, which
// the second hat's document would otherwise inherit.
const isMember = (s) => !s.left &&
  (s.role === 'member' || (s.role === 'founder' && s.hat === 'member'));
/**
 * **E10's set**: every member with a page, less the seat that moved it. E11's
 * cell reads almost the same and is **not** this — an ordinary motion never
 * stands its mover anywhere, so the mover is asked like anybody else; the note
 * at E11's own entry has the reasoning and the run that settled it.
 */
const activeButTheMover = (s, step, ctx, ev) => isMember(s) && s.name !== ctx.actorOf(ev);
const AUDIENCE = {
  'the holder': (s) => s.role === 'founder',
  'every member': (s) => isMember(s),
  'every member who had no say **and arrived when it was set**, lapsed included; a later joiner reads it as the document':
    (s, step, ctx, ev) => isMember(s) && s.name !== ctx.actorOf(ev) &&
      ctx.stoodAt[s.name] !== undefined && ctx.stoodAt[s.name] < ev.at,
  'the membership': (s) => isMember(s),
  // E13, a text race wants a judgment (Q1340, Ed 2026-09-11: *every member
  // who could still judge it, except the author*). *Could still judge* is
  // the module's own word — the seat's view carries the race's clause row
  // with `askable` (Q1202: dealt into the hand or riding the row as `ask`),
  // and a member who has spent every pair on it is outside the audience from
  // then on, their entry ⏳ rather than 💡. The author is the seat of the step
  // named on the event (`ev.author`), not the judging step's own seat. The
  // room of one (Q835) is outside this table: every hat seats several.
  'every member who could still judge it, except the author (Q1340, Ed 2026-09-11; the room of one, Q835, aside)':
    (s, step, ctx, ev, own) => {
      if (!isMember(s) || s.name === (STEPS[stepIndex(ev.author)] || {}).seat) return false;
      const v = (own && own.view) || {};
      return (v.clauses || []).some((c) => c.id === ev.key && c.askable);
    },
  // E9, a power laid down (Q918, Ed 2026-08-29 — *rewrite the cell as `every
  // member but the actor`*). The actor's own channel is the power card's
  // confirmation, which is not a news entry and is not this row; the entry
  // goes to everybody else. `stoodAt` deliberately has no part in it: unlike
  // E5 this cell puts no arrival condition on the audience, and the module
  // skips only the un-arrived, the removed and the convenor — so a seat stood
  // before the act is inside it whether it arrived early, late or has since
  // lapsed. Reversing the reading is this one line and `oweReleases`.
  'every member but the actor (Q918, Ed 2026-08-29)':
    (s, step, ctx, ev) => isMember(s) && s.name !== ctx.actorOf(ev),
  // E34, a mail that gave up. **Never the invitee** needs no clause here: an
  // invitee has not arrived, the module skips the unarrived, and no seat in
  // this table is one at the step that raises it. The `mailfail` step is
  // `ifHat: 'member'` — a clerk founder holds no member record, so the module
  // has no owed set to put the news in, and the card cannot reach them.
  'the founder; every member — **never the invitee**, who is exactly the person the mail could not reach':
    (s) => s.role === 'founder' || isMember(s),
  // no invitee seat stands in this table: every invited seat follows its link
  'every member and invitee': (s) => isMember(s),
  // E25's audience is the people who are *not* in the room. The applicant
  // seat is a stranger who has knocked, and its rail is the applicant's own
  // (`APPCARDS`), never `STRCARDS` — so the door's two keys belong to the
  // stranger seat alone (entry 78).
  strangers: (s) => s.role === 'stranger',
  // E10, a constitutional motion put (promise-coverage entry 84), and E21
  // since Q1284. One thing narrows *active* from `every member` here, and it
  // is the table's own arithmetic rather than an opinion about the page:
  //  · **the mover is not asked** — §9.6 stands the mover at accept from the
  //    moment the motion is put (R-021), and §2's own Close column for this
  //    row is *answered entry leaves*, so the seat that put it carries no ask.
  // The lapsed seat used to be out too (a lapsed membership leaves the motion
  // electorate, §9.5a) — but since R-096 (Ed, 2026-09-08) a read returns a
  // lapsed member, so the seat this harness lapses is active again from the
  // moment `wait-lapsed` reopens its page, and every seat with a page is
  // active by construction. A lapsed member is served nothing but mail (E22).
  'every active member': activeButTheMover,
  // E11, an **ordinary** motion put — read here by Q1355 (Ed, 2026-09-14).
  // Q930 rewrote the cell from *whoever the router serves*, which no seat-side
  // key could state, into a set this table can name, and the name is the
  // plain one: every member with a page. Two readings were weighed against
  // the run and dropped:
  //  · *not anyone whose membership has gone quiet* is not a second clause
  //    to test. Since R-096 a read revives, so the seat this harness lapses
  //    is active again from the moment `wait-lapsed` reopens its page, and
  //    every seat with a page here is active by construction — the same
  //    arithmetic E10's note sets out at length.
  //  · **the mover IS asked**, which is where E11 parts from E10. A
  //    constitutional motion stands its mover at accept from the put (§9.6,
  //    R-021), so their entry is a ledger from the first moment; an ordinary
  //    one is judged as a race and never answered (`motions.ts`: *an
  //    ordinary motion is judged as a race, not answered*), so nothing
  //    stands the mover anywhere and the page serves them the card like
  //    anybody else — `motionWaitsOnMe` exempts the mover from C9's wait
  //    rather than from the ask. The run says so: at `remove-motion` the
  //    `early` seat, which put the motion, carries `remove` as an **ask**.
  // What the row waits behind is ⚖️ and not 🏛️ (C9, Q1344; the page's own
  // `mayJudge` is `acked('canjudge')`), which is the row's `waitsOn`.
  'every active member — not anyone whose membership has gone quiet (Q930, Ed 2026-08-29)':
    (s) => isMember(s),
  // E22, a membership lapses (Q1355, Ed 2026-09-14). *The member* is the one
  // whose membership went quiet — the seat of the `wait` step that lapses it
  // — and E22's channel is **mail**, so the row is asserted against the
  // outbox rather than the rail (`mail` on the event, `assertMail` below).
  // Every other seat is outside it and must have been sent nothing.
  'the member': (s, step, ctx, ev) => s.name === ctx.actorOf(ev),
  // E36, the room's side of a park (Q1015, Ed 2026-09-09): every active
  // member but the Founder, whose own channel is the 👑 card (E12) — and the
  // author, told on their own line (E37), is the actor of the `park` step
  // here, which is the founder on both hats, so one exclusion covers both.
  'every active member except the Founder': (s) => isMember(s) && s.role !== 'founder',
  // E37, the author's line: the seat that proposed the parked text
  'the author': (s, step, ctx, ev) => s.name === ctx.actorOf(ev),
  // E38, a proposal stranded by a text change (Q170; read here by Q1359).
  // One seat wide, and the narrowest cell in the table: a `rebase-pending`
  // candidate is out of every race, so nobody else is judging it, nobody else
  // is told of it, and the ↻ entry is the author's alone. The author is the
  // seat of the step that **proposed** it (`ev.author`), never the step that
  // stranded it — the strand is the Founder's pen and the entry is not theirs.
  'the author, and nobody else: it is out of every race, so no other seat has anything to be told or asked':
    (s, step, ctx, ev) => s.name === (STEPS[stepIndex(ev.author)] || {}).seat,
  // E39, a proposal to hand a laid-down power back (Q386; read here by
  // Q1359). The cell says *as E10* and means it: the same set, the mover
  // standing at accept from the put and so carrying a ledger rather than an
  // ask. The two clauses that follow it are not second tests —
  //  · **the Founder's own tab is unchanged** is about the *offer*: they lay
  //    a power down on that tab and are never offered the road back to
  //    themselves. They still answer the motion there, which is the whole
  //    point of Q386's ruling and what `journey`'s `powerReturnOnATab`
  //    asserts, so the founder seat is inside this audience like any member;
  //  · **a clerk and a stranger meet nothing new** is `isMember` already.
  "every member answers it, as E10; the mover stands at accept from the put (K8). **The Founder's own tab is unchanged** — they lay a power down there and do not propose returning it to themselves — and a clerk and a stranger meet nothing new":
    activeButTheMover,
  // E40, a member removed by a carried motion (Q901; read here by Q1359),
  // and **E31's cell word for word** — the same tells, the room's act rather
  // than the Founder's. Two halves on two channels, which is why the row
  // carries `orDeparted` as well as its `dep:` key:
  //  · *every member* is the 🥾 news card, `dep:<member>`, owed to everybody
  //    still seated — the actor included, since only ❌ skips its actor
  //    (Q1358) and a carried motion is the room's own act;
  //  · *the removed member* is the door's departure sentence, not a rail
  //    entry at all, so it is read off their view's `departed` (the server's
  //    `strangerView`: a seat that dies mid-session becomes the door).
  // `isMember` no longer counts the removed seat — `left` — so the first
  // clause is what puts them back inside the audience.
  'the removed member; every member':
    (s, step, ctx, ev) => s.name === ev.removed || isMember(s),
};

/* ---- table 2: the steps ------------------------------------------------ *
 * `events`: what the step triggers — the §2 row and the rail key the audience
 * should carry. Keys are on the step and not read off SURFACE's Keys column,
 * which is `spec-check`'s page-keys map and `—` for the rows that matter most
 * here. A key ending in `:` matches by prefix. `key: null` says the page
 * exposes no key for the event, and the row is reported as *no rule* on the
 * page's side with `noKey` as the reason.
 * An acknowledged entry counts as carried (the seat's own `okd` readout), and
 * for the close so does a signature (`view.closed.mySignature`): the ladder's
 * `toClosed` signs for `cast[1..4]` before any snapshot is taken.
 * `oracle`: where `view()` states the audience itself, the line says whether
 * the module agreed with the rail.                                        */
const ORACLE = {
  gates: (p, key) => { const v = p && p.view; return v && v.gates ? (key === 'canpropose' ? v.gates.proposing : v.gates.judging) : null; },
  owed: (p, key) => { const v = p && p.view; return v && Array.isArray(v.owedOks) ? v.owedOks.includes(key) : null; },
  closed: (p) => { const v = p && p.view; return v && 'closed' in v ? v.closed !== null : null; },
};
const E8 = (key) => ({ id: 'E8', key, at: 'seat-early' });
// **A gate never withholds from the seat that set it** (Ed, 2026-09-01;
// `gateSelfSet` in `design/session-view.html`, SURFACE C8/E8). 💡 and ⚖️ are
// acknowledged for the founder the moment they open — no card, no press, and
// nothing in `S.okd` — so on the founder's seat the entry is carried by
// exemption and there is nothing in the rail, the band or the readout to read
// it off. The exemption is the founder's whole seat rather than a
// per-document test, because a gate is not a setting and cannot be delegated.
// `selfSet` is the one escape hatch this table gives an audience row, beside
// E24's `orSigned`, and it says so at the finding line rather than silently.
const E4 = (key) => ({ id: 'E4', key, at: 'begin', oracle: 'gates', staged: true,
  selfSet: (seat) => seat.role === 'founder' });
const E5 = (key, at) => ({ id: 'E5', key, at, oracle: 'owed' });
const STEPS = [
  // ---- before 🍾 --------------------------------------------------------
  { id: 'birth', epoch: 'before', kind: 'birth', seat: 'founder', events: [] },
  { id: 'settings', epoch: 'before', kind: 'settings', seat: 'founder', events: [] },
  { id: 'hat', epoch: 'before', kind: 'cmd', seat: 'founder', cmd: 'set-convenor-membership',
    args: (D) => ({ isMember: D.hat === 'member' }), events: [] },
  // `reload`: the founding here is done **over the wire**, and the page's
  // `S.seen` — *confirmed, not defaulted* — is rebuilt only by `hydrateS` at
  // boot; the 4s poll re-hydrates values alone. So on a founder's page that
  // stayed open through `settings`, 🌍 (first setting in `ORDER` after the
  // grants) stood as an *ask* for ever and hid 🍾 (first run, 2026-08-27:
  // `no begin card to hold · readiness {"ready":true …} · rail ["chamber"]`).
  // One reload after the last wire act is what a founder's own next visit does.
  { id: 'text', epoch: 'before', kind: 'cmd', seat: 'founder', cmd: 'confirm-starting-text', reload: true,
    args: () => ({ text: 'The clubhouse shall be kept open.\nEvery member may bring one guest.' }), events: [] },
  { id: 'invite-early', epoch: 'before', kind: 'invite', seat: 'founder', who: ['early', 'lapsed'], events: [] },
  // the snapshot where a re-introduced Q639 shows: the pen as a ⏳ tab on a
  // member's band. 🛡️ is staged behind the pen's OK on the founder's page
  // (`blocksOrder`), so its rows begin at `ok-pen`.
  { id: 'seat-early', epoch: 'before', kind: 'seat', seat: 'early', events: [E8('grant-pen')] },
  { id: 'seat-lapsed', epoch: 'before', kind: 'seat', seat: 'lapsed', events: [E8('grant-pen')] },
  // E25's two keys are split across the epochs on purpose (entry 78): 📧 Log
  // In stands at the door from the first knock, but Apply is `applyOpen` in
  // `strangerView`, which is `begun && …` — so `strapply` is asserted at the
  // first live step and would be red here for the right reason.
  { id: 'seat-stranger', epoch: 'before', kind: 'seat', seat: 'stranger',
    events: [E8('grant-pen'), { id: 'E25', key: 'strlogin', at: 'seat-stranger' }] },
  // **E34, a mail that gave up** (Q947 (c), backlog 173). Placed here rather
  // than beside `invite-early`, so that three seats are already stood and the
  // audience is asserted on both sides of the line at once: the founder and
  // the two members carry `mail:`, the stranger does not. The rail key carries
  // a batch id, hence the prefix match.
  { id: 'mailfail', epoch: 'before', kind: 'mailfail', seat: 'founder', ifHat: 'member',
    events: [{ id: 'E34', key: 'mail:', at: 'mailfail' }] },
  { id: 'ok-pen', epoch: 'before', kind: 'ok', seat: 'founder', key: 'grant-pen', events: [E8('grant-pen'), E8('grant-shield')] },
  { id: 'ok-shield', epoch: 'before', kind: 'ok', seat: 'founder', key: 'grant-shield', events: [E8('grant-pen'), E8('grant-shield')] },
  // 💤 is the one setting the page cannot rebuild from the module: `hydrateS`
  // writes the day count into `S.lapse` (the rung field) and never `S.lapseDays`,
  // so a reloaded founder is asked 💤 again and everything below it in `ORDER`
  // waits (first run, 2026-08-27: `no begin card to hold … rail ["lapse"]`;
  // a page finding, Q919 — not fixed here). And the one-minute lapse the
  // `lapsed` seat needs is not expressible on the card (7–365 days). So 💤 is
  // answered **on the card, after the reload**, which is what the page counts
  // as seen, and the minute is then set over the wire without a reload. These
  // two rows stand after `ok-shield`: 💤 is below the grants in `ORDER`, so its
  // card is not in the rail until both are acknowledged.
  { id: 'lapse-card', epoch: 'before', kind: 'card', seat: 'founder', key: 'lapse', setting: 'lapse',
    pick: { set: 'lapse', val: 'days' }, fields: { lapseDays: '7' }, events: [] },
  { id: 'lapse-minute', epoch: 'before', kind: 'cmd', seat: 'founder', cmd: 'set-setting',
    args: () => ({ setting: 'lapse', value: { afterMs: LAPSE_AFTER_MS } }), events: [] },
  // 🏛️ is served to a member founder as news once the constitution is settled,
  // and `beginOffered` holds 🍾 until it is acknowledged (first run, 2026-08-27:
  // `no begin card to hold … rail ["grant-voice"]`). journey OKs every served
  // task; this table has to say so. No events: the voice's audience row is
  // not in this table (E8 here is the founder's pen and shield).
  { id: 'ok-voice', epoch: 'before', kind: 'ok', seat: 'founder', key: 'grant-voice', ifHat: 'member', events: [] },
  // ---- live ---------------------------------------------------------------
  // `keep`: 🛡️ kept on the Text at 🍾 (the table's own toggle, journey's
  // `brSet`), so the `park` step below has a shield to park under — the one
  // precondition of E36/E37, and the state every text adoption on this
  // document is in from here: `propose-text`'s race parks rather than adopts.
  // **and ✒️ kept on the Text too** (E38, Q1359): the pen is the cheapest
  // reliable way to strand a proposal in a room this size — one command that
  // replaces a clause outright, where an adoption on this document parks
  // instead (the shield above) and never reaches `rebaseOthers` at all. The
  // Text is the one row of 🍾's table whose cells default to *down*
  // (`beginPos`), so both of its powers have to be asked for by name.
  { id: 'begin', epoch: 'live', kind: 'hold', seat: 'founder', key: 'begin',
    keep: [['text', 'a'], ['text', 'u']],
    events: [E4('canpropose'), E4('canjudge'), { id: 'E25', key: 'strapply', at: 'begin' }] },
  // `ok-propose` and `ok-judge` are **retired** (2026-09-07). They opened 💡
  // and ⚖️ on the founder's page and pressed their OK; since Ed's ruling of
  // 2026-09-01 (`gateSelfSet`) the founder has no such card to open, so both
  // steps could only ever report *no canpropose card to OK on the founder's
  // page* — a walk driving a control the surface no longer offers, which is
  // the harness testing something else. E4 keeps its assertion on `begin`,
  // where the gates open, and the founder's half of it is `selfSet` above.
  // Nothing else was riding them: a member's gate is news they acknowledge on
  // their own clock, and E4 asserts it as news, not as an acknowledgement.
  // 🌍's own promise — *at `public` the stranger reads the text* — is **not
  // rail-expressible** (entry 82): the door's cards are `strlogin` and
  // `strapply`, and neither depends on the rung, so the stranger's rail is
  // the same before and after this step and a row could not say otherwise.
  // What `amend` leaves behind for 🌍 is the stranger seat's `view` snapshot,
  // which the harness compares only under `--baseline`; read `canRead` off
  // the written JSON. The rung × reader × epoch table itself is asserted in
  // `packages/server/test/promise-chamber.test.ts`, and no code path is
  // added here to duplicate it.
  { id: 'amend', epoch: 'live', kind: 'cmd', seat: 'founder', cmd: 'set-setting',
    args: () => ({ setting: 'chamber', value: { rung: 'public' }, why: 'so the cohort can read along' }),
    events: [E5('chamber', 'amend')] },
  // 👤 **naming** (promise-coverage entry 86, batch L). `authorship` stands at
  // `sealed` in `SETTINGS` and is the founder's by pen, so this is a real
  // §9.7-rule-5 amendment — `setSetting` post-start emits `by: 'crown'` and
  // owes every arrived member who had no say an OK, which is exactly E5's
  // audience. Placed here, **before** `invite-late`/`seat-late`, so `late` is
  // not yet stood and reads the new rule as the document rather than as news;
  // that is the half of the cell `amend` already asserts on the seats that
  // were here, and this row asserts it on a second setting whose news card is
  // a different one. Order against `lay-down` does not matter either way: that
  // row relinquishes the pen on ⏱️ `rate`, never on 👤.
  // **It was 🌡️ the bar until 2026-09-15** (Q1362), which left the surface;
  // 👤 is the substitute because the row needs a **constitutional** setting
  // the founder holds by pen and standing **below 💤** in `ORDER` — and
  // because nothing else in this table turns on the naming rung, where 👥 and
  // 🥾 and ⏰ each carry a step that would move under an amendment. The move
  // is one rung, `sealed` → `sealedElective`, so the reveal at the close is
  // unchanged and only an author's option is added.
  // **Expected red at HEAD, under Q919**, for the same reason the E4 and E10
  // rows on this document are — and this row is the sharpest evidence of it
  // anywhere in the table, because it puts both halves in one snapshot:
  // `chamber` is `ORDER[5]` and 👤 is below 💤 at `ORDER[11]`, so after
  // `amend` and this step together a member's rail reads exactly
  // `["chamber"]` — the news above 💤 filed, the news below it withheld,
  // while `view.owedOks` carries **both**. The oracle is what says it is the
  // page's fault and not the module's. It should go green with the rest of
  // Q919; if it ever goes green alone, 👤 has been special-cased.
  { id: 'raise-naming', epoch: 'live', kind: 'cmd', seat: 'founder', cmd: 'set-setting',
    args: () => ({ setting: 'authorship', value: { rung: 'sealedElective' },
      why: 'an author who wants their name on it should be able to put it there' }),
    events: [E5('authorship', 'raise-naming')] },
  { id: 'invite-late', epoch: 'live', kind: 'invite', seat: 'founder', who: ['late'], events: [E5('chamber', 'amend')] },
  // E20 does not apply post-start; what is asserted on the arrival is *no
  // `chamber` for late*, which the E5 predicate says by `stoodAt`
  { id: 'seat-late', epoch: 'live', kind: 'seat', seat: 'late', events: [E5('chamber', 'amend')] },
  // E22's channel is **mail** and nothing else (SURFACE §2: *mail: three
  // warnings … then the package*; Ask `nothing; revival is being here
  // again`), so the page files no rail entry for either half and the row
  // carries no key. Until Q1355 (Ed, 2026-09-14) that was the whole of it and
  // the row was the harness's other no-rule exit: what it bought was the
  // record that the step had been **stood** — the lapsed seat really did
  // lapse on the clock, with no page open — so a later run could tell *E22
  // was exercised and the page said nothing* from *E22 was never reached*
  // (promise-coverage entry 81, batch L). It is asserted now, on its own
  // channel: `mail` sends the row to `assertMail`, which reads the dev
  // outbox instead of the rail. Its page side is asserted too, in the only
  // way a keyless row can be — SURFACE's own Keys cell for E22 must stay
  // empty, so the day the page grows an entry for a lapse the row goes red
  // and somebody reads it again rather than the harness quietly asserting
  // half of it. The E5 assertions already riding this row are the lock on the
  // other half of 💤's promise: *lapsed included* in the audience of a change
  // made while they were away.
  { id: 'wait-lapsed', epoch: 'live', kind: 'wait', seat: 'lapsed',
    events: [E5('chamber', 'amend'),
      { id: 'E22', key: null, at: 'wait-lapsed',
        noKey: 'E22 is mail: the page files no entry for a warning or a lapse, and the lapsed seat is the audience',
        // the package is `MAILS.lapsed`, each warning `MAILS.lapseWarning`;
        // matched on the subject line, which carries the document's title,
        // and the two phrases are disjoint by construction
        mail: { package: /has lapsed/, warning: /is about to lapse/ } }] },
  // `waitsOn`: an application at 🪪's *proposal* price is an ordinary motion
  // (E21's Channel column), and since Q1367 the admit card finds its motion
  // through the one list every motion uses, which stages a motion the viewer
  // cannot yet act on behind the ⚖️ OK (C9, Q1344) — E11's rule, E11's line.
  // Before Q1367 the admit card read the record directly and was served to a
  // member who had not acknowledged voting; the 2026-09-15 re-run found the
  // three member seats without it, and this is the rule, not a fault.
  { id: 'knock', epoch: 'live', kind: 'knock', seat: 'applicant',
    events: [{ id: 'E21', key: 'adm:', at: 'knock', waitsOn: 'canjudge' }] },
  // 🥾 stands at `proposal` in `SETTINGS`, so a removal put by one member
  // against another is E11 — *an ordinary motion is put, a removal too* —
  // and the ❌ card is where the page carries it (`motionTargets` returns the
  // door key `remove` for a `remove` payload). §2's audience for E11 read
  // *whoever the router serves* when this row was written — a router's choice
  // no seat-side key could state (entry 80) — and Q930 (Ed, 2026-08-29)
  // rewrote it as *every active member — not anyone whose membership has gone
  // quiet*, which is readable — and Ed read it on 2026-09-14 (Q1355), so the
  // row is asserted from then on: every member with a page, the mover
  // included, the cell's own entry in `AUDIENCE` carrying why.
  // `waitsOn`: E11's Channel column stages the race card behind the ⚖️ OK
  // (C9, Q1344) exactly as E10's stages the motion behind 🏛️'s, and no member
  // seat in this table presses one — so `late` and `lapsed` carry nothing and
  // are right to, while the mover and the founder, whom the page serves
  // regardless, are held to the cell. The first run with the predicate
  // (2026-09-14) reported those two as findings for want of this line.
  // What the row is here for beyond that is the snapshot: every member seat's
  // rail and `view()` with a live removal running, which is what fills the
  // ❌ door's *Proposed for removal* subsection (`removalPendingIds`). The
  // motion stays running for the rest of the epoch and `carry-removal`, the
  // last row of it, carries it — E40 (Q1359).
  // `ifHat: 'member'` is **not** about the hat: it is about the clerk document
  // never reaching the live epoch at HEAD (Q920 — 🍾 waits on a voice a clerk
  // does not hold), so a motion put on it is refused *before the start
  // nothing is amended* and reports a 400 that says nothing about 🥾. When
  // Q920 is built, drop the mark and let the row stand on both hats.
  { id: 'remove-motion', epoch: 'live', kind: 'cmd', seat: 'early', cmd: 'open-motion', ifHat: 'member',
    // the subject is named by id, and the harness knows the seats by address:
    // read `late`'s row off the mover's own view rather than assuming `m-n`
    args: async (D) => {
      const v = await viewAs(D, 'early');
      const row = (((v || {}).view || {}).members || [])
        .find((m) => m.email === D.seats.late.email);
      if (!row) throw new Error("no `late` row in the early seat's view — nothing to name as the removal's subject");
      // the subject's module id, kept for `carry-removal` at the tail of the
      // epoch (E40, Q1359): the race it opened is `remove:<id>` and the
      // departure is keyed `dep:<id>`, so both read it off this one lookup
      D.removeTarget = row.id;
      return { payload: { kind: 'remove', member: row.id },
        why: 'the clubhouse keys were never returned' };
    },
    events: [{ id: 'E11', key: (D) => (D.motionIds["remove-motion"] ? 'mo:' + D.motionIds["remove-motion"] : null), noKey: 'the motion remove-motion put came back with no id', at: 'remove-motion', waitsOn: 'canjudge' }] },
  // **👁️ judgments** (promise-coverage entry 84, batch L). Four rows that put
  // real judgments on the wire, so every seat's `view()` snapshot from here on
  // has something to leak and a later run can diff against these: a running
  // 🏛️ motion with two answers standing (E10), and one text race judged (E13).
  // Two of the four assert nothing — they are the acts that make the other two
  // possible, like `invite-early` before `seat-early`.
  //
  // What is deliberately *not* here is the assertion this pair most wants —
  // *no seat's snapshot carries another seat's answer*. That is an oracle over
  // the `view()` snapshot, a change to this harness's shape rather than a row
  // in its table, so entry 84 files it for whoever owns the harness and leaves
  // the snapshots behind as the evidence a later run can read.
  { id: 'judgments-motion', epoch: 'live', kind: 'cmd', seat: 'early', cmd: 'open-motion', ifHat: 'member',
    // 👁️ stands at `after` in `SETTINGS` and is the founder's by pen, so a
    // motion to `never` is a real constitutional change with a real crown
    // behind it. `ifHat` for `remove-motion`'s reason: the clerk document
    // never reaches the live epoch at HEAD (Q920).
    // **Expected red at HEAD, under Q919**: every member seat's rail is empty
    // from 💤 down (the page cannot rehydrate it), so `late` — inside the
    // audience, owed the ask — carries nothing and is reported as a finding.
    // It is the same defect the E4 rows already report on this document, on
    // one more key; when Q919 is built this row should go green with them.
    args: () => ({ payload: { kind: 'set', setting: 'judgments', value: { rung: 'never' } },
      why: 'how I judged should stay mine, and the record should not name it' }),
    // `waitsOn`: E10's Channel column gates the whole entry on the 🏛️ OK
    // (C9, Q1344), and no seat here but the founder has pressed one — the
    // assertion's own note says what that buys and what it still holds
    events: [{ id: 'E10', key: (D) => (D.motionIds["judgments-motion"] ? 'mo:' + D.motionIds["judgments-motion"] : null), noKey: 'the motion judgments-motion put came back with no id', at: 'judgments-motion', waitsOn: 'grant-voice' }] },
  // one keep, and the motion stands running for the rest of the run: a keep
  // does not settle a 🏛️ motion, it blocks it (§9.6, `maybeSettleMotions`),
  // which is exactly the state worth snapshotting — two answers on the wire,
  // neither seat told the other's.
  { id: 'judgments-keep', epoch: 'live', kind: 'cmd', seat: 'late', cmd: 'answer-motion', ifHat: 'member',
    args: async (D) => {
      const v = await viewAs(D, 'late');
      const m = (((v || {}).view || {}).motions || []).find((x) => x.status === 'running' &&
        x.route === 'constitutional' && ((x.payload || {}).setting) === 'judgments');
      if (!m) throw new Error("no running 🏛️ motion on `judgments` in the late seat's view — the motion step did not land");
      return { motion: m.id, answer: 'keep' };
    },
    events: [] },
  // **A proposal stranded by a text change** (SURFACE E38; Q170, Ed
  // 2026-09-14; stepped by Q1359). Two rows: a member writes a clause, and
  // the Founder's pen rewrites the same clause under them. `rebaseOthers` is
  // the one door every text change goes through, and a patch whose span the
  // new text replaced cannot be carried across — the candidate goes to
  // `rebase-pending`, out of every race, held for its author alone.
  //
  // **The pen, and not an adoption**, because 🛡️ is kept on the Text from
  // `begin`: every race on this document parks instead of adopting, and a
  // park rebases nothing. The pen is one command and reaches the same loop.
  //
  // **Before the park, not after**: `decreeText` refuses outright while any
  // candidate stands `awaiting-assent` (R-058, narrowed by R-100), so these
  // two rows have to stand ahead of `propose-text`, whose race the `park`
  // step below then parks. They also stand clear of it: a stranded candidate
  // is in no race, so `park`'s judging still meets exactly one text race.
  //
  // **`lapsed` writes it, not `early`**: its wallet is untouched (`early`
  // pays a stake at each of the two motions above), and a seat revived by
  // the read (R-096) carrying its own work is worth the snapshot. A member's
  // own entry is never withheld behind ⚖️ — `withheld` exempts `g.mine` —
  // so the row needs no `waitsOn`, unlike every other member-side row here.
  { id: 'strand-propose', epoch: 'live', kind: 'cmd', seat: 'lapsed', cmd: 'propose-text', ifHat: 'member',
    args: async (D) => {
      const v = await viewAs(D, 'lapsed');
      return { baseVersion: v.textVersion,
        hunks: [{ start: 0, end: 1, lines: ['The clubhouse shall be kept open at all hours.'] }],
        why: 'the hours are the whole of what people ask me about' };
    },
    events: [] },
  // the strand itself. The pen replaces **the same line**, one line for one,
  // so the conflict is exact (`spansConflict`) and every other candidate's
  // offsets are untouched — the Founder's own proposal two rows down is
  // written against line 1 and must rebase cleanly, not strand beside it.
  { id: 'strand-pen', epoch: 'live', kind: 'cmd', seat: 'founder', cmd: 'pen-text', ifHat: 'member',
    args: async (D) => {
      const v = await viewAs(D, 'founder');
      return { baseVersion: v.textVersion,
        hunks: [{ start: 0, end: 1, lines: ['The clubhouse shall be kept open on weekdays.'] }],
        why: 'the hours were never the club’s to promise' };
    },
    // the key is the entry the author's own page files for it — `mine:<id>`
    // (`itemsFromView`), the candidate id being the one it has carried since
    // it was proposed. Read back off the module, so a key at all is the
    // proof that the rebase really failed: nothing in `rebase-pending`, no
    // key, and the row reports itself as *no rule* rather than passing.
    events: [{ id: 'E38', at: 'strand-pen', author: 'strand-propose',
      key: async (D) => {
        const v = await viewAs(D, 'lapsed');
        const m = ((v || {}).mine || []).find((x) => x.state === 'rebase-pending');
        D.strandedId = m ? m.id : null;
        return m ? 'mine:' + m.id : null;
      } }] },
  // a text race for E13 to be about: the admit and removal races the live
  // epoch already carries are *setting* races, and E13 is a **text** race.
  // **E13 is asserted here, not at `judge-text`** (Q1356, Ed 2026-09-14).
  // 👥 stands at a count of one on this document, so `early`'s single
  // judgment at `judge-text` already puts the challenger on top with the floor met and the race parks
  // — which is what the `park` step below is built on — and from that moment
  // no seat's view carries the clause as askable at all. The row was
  // therefore asserted over an audience that was empty for every seat, and a
  // predicate nobody satisfies agrees with a page that carries nothing: it
  // passed by being about nothing, for as long as it had a key. Read one
  // step earlier the race is fresh and every member but the author can still
  // judge it, which is exactly the cell. The two alternatives were weighed
  // and dropped: a rival wording to keep the race open past one judgment
  // changes what the `park` step is standing on, and a larger 👥 enlarges the
  // room this table seats. `waitsOn`: E13's own Channel column stages the
  // whole entry behind the ⚖️ OK (C9, Q1328), and no member seat here has
  // pressed one — the same arm E10 rides.
  { id: 'propose-text', epoch: 'live', kind: 'cmd', seat: 'founder', cmd: 'propose-text', ifHat: 'member',
    args: async (D) => {
      const v = await viewAs(D, 'founder');
      return { baseVersion: v.textVersion,
        hunks: [{ start: 1, end: 2, lines: ['Every member may bring two guests.'] }],
        why: 'one guest is thin for a clubhouse this size' };
    },
    // the key is learned by asking the document what race the proposal made:
    // `clauses` is the text races alone (`settingId === undefined` in
    // `raceView`), so the one with a challenger on it is this one
    events: [{ id: 'E13', at: 'propose-text', author: 'propose-text', waitsOn: 'canjudge',
      key: async (D) => {
        const v = await viewAs(D, 'founder');
        const r = ((v || {}).clauses || []).find((c) => (c.candidates || []).length);
        D.textRace = r ? r.id : null;
        return D.textRace;
      } }] },
  // E13's audience read *whoever the router serves* until Q1340 (Ed,
  // 2026-09-11): a router's choice no seat-side key could state, so the row
  // stood as the member hat's no-rule exit. Since Q1202 the entry shows
  // while anything on the race can still be asked of the member, dealt or by
  // `ask`, and that is a fact about the seat — so the row was keyed then, on
  // this step, and Q1356 moved the **assertion** up to `propose-text`, where
  // the race is still askable of somebody (the note there says why). What
  // this step is for is unchanged and is not the assertion: a judgment is
  // really cast, so every snapshot after this one carries a document with a
  // live judgment, and the race parks for `park` to be about.
  { id: 'judge-text', epoch: 'live', kind: 'cmd', seat: 'early', cmd: 'judge-race', ifHat: 'member',
    args: async (D) => {
      const v = await viewAs(D, 'early');
      const rows = (v || {}).clauses || [];
      const text = new Set(rows.map((c) => c.id));
      // the hand first, then the row's own `ask` (Q1202): either is a pair
      // `judge-race` accepts, and a race off the hot set is not starvation
      const dealt = ((v || {}).raceCards || []).find((c) => text.has(c.raceId));
      const row = dealt ? rows.find((c) => c.id === dealt.raceId) : rows.find((c) => c.askable && c.ask);
      const card = dealt || (row && row.ask);
      if (!card || !row) throw new Error('no text race askable of the early seat — nothing to judge');
      D.textRace = row.id;
      return { a: card.a.id, b: card.b.id, outcome: 'a' };
    },
    events: [] },
  // **The park** (SURFACE E36, E37; Q1015, Q1179; Ed 2026-09-09). 🛡️ was
  // kept on the Text at `begin`, so the text race `propose-text` opened parks
  // the moment its leader is on top with the floor met: every member seat that has
  // not judged for the challenger does so, one at a time, until the founder's
  // view carries a text 👑 question for it. `seat: 'founder'` names the
  // **author** — the founder proposed the text — which is what E37's cell
  // reads through `actorOf`; the judging is done as the other seats. Two
  // assertions on one snapshot: every member but the founder carries the
  // `park:` entry (E36, the founder outside the audience by the cell and the
  // author excluded with it, being the same seat), and the author carries
  // their own `mine:` line (E37) — the matrix reads keys, not copy, so the
  // line's wording is `copy-check`'s to hold. `ifHat` for `remove-motion`'s
  // reason: the clerk document never reaches the live epoch at HEAD (Q920).
  // **E37's key is the parked candidate's, not the `mine:` prefix** (Q1359).
  // It was a prefix for as long as one seat at a time had a proposal at all;
  // `strand-propose` puts a second one on `lapsed`, and a prefix key then
  // reads every seat's own work as this row's entry — the first run with the
  // strand rows reported `lapsed` carrying `mine:c3` against an audience of
  // one. The park's own candidate is on the founder's 👑 task, so the key is
  // read from there and names exactly the proposal the row is about.
  { id: 'park', epoch: 'live', kind: 'park', seat: 'founder', ifHat: 'member',
    events: [{ id: 'E36', key: 'park:', at: 'park' },
      { id: 'E37', at: 'park',
        key: async (D) => {
          const v = await viewAs(D, 'founder');
          const q = (((v || {}).view || {}).crownTasks || []).find((x) => x.text);
          return q ? 'mine:' + q.text.candidateId : null;
        } }] },
  // ✒️ laid down on ⏱️ `rate`, not ⏰ (B14, 2026-08-27): the ladder drives
  // `ending` with the founder's pen and would stall on a relinquished one.
  // **E9's news entry, asserted since 2026-09-01** (Q918). The page files one
  // 👑 card per act, keyed `rel:<batch id>` and enumerated by the Proposals
  // section's `extraKeys`, so the key is a prefix match like E34's `mail:`.
  // The row exercises both branches of its own cell in one snapshot: the
  // founder is the actor and must carry nothing, and `early`, `late` and
  // `lapsed` are every other member and must each carry the entry.
  { id: 'lay-down', epoch: 'live', kind: 'cmd', seat: 'founder', cmd: 'relinquish',
    args: () => ({ setting: 'rate', power: 'unilateral' }),
    events: [{ id: 'E9', key: 'rel:', at: 'lay-down' }] },
  // **The road back to a laid-down power** (SURFACE E39; Q386, Ed
  // 2026-09-14; stepped by Q1359). It stands immediately behind `lay-down`
  // because that row is what makes it possible: ⏱️'s ✒️ has just left the
  // Founder's hand, and §9.7 rule 4's `reserve` is the one way it returns.
  // The payload names **one power**, since one tab is one power, and the
  // page puts exactly this over the wire from ⏱️'s ✒️ tab (`motionTargets`
  // → `pw:u:rate`, which is also the key asserted here).
  //
  // The row exercises both sides of its cell in one snapshot: the mover is
  // outside the audience — the put stands them at accept, so their entry is a
  // ⏳ ledger and the `wants` filter does not count it as an ask — while the
  // founder, who acknowledged 🏛️ at `ok-voice`, is inside it and is asked
  // **on the tab itself**, never on ⏱️'s own card (Q386's whole point, and
  // what `journey`'s `powerReturnOnATab` asserts card-side).
  // `waitsOn` is E10's: the entry stages behind the 🏛️ OK (C9, Q1344), which
  // only the founder has pressed on this document (`ok-voice`).
  //
  // **`lapsed` moves it, not `early`**: §9.6 allows one 🏛️ out per member at
  // a time and `early`'s is still running from `judgments-motion` — the first
  // run of this row was refused *one 🏛️ out per member at a time*. The seat
  // the clock lapsed and the read revived (R-096) is an ordinary member again
  // and holds none, which is the arithmetic E10's own note sets out.
  { id: 'return-motion', epoch: 'live', kind: 'cmd', seat: 'lapsed', cmd: 'open-motion', ifHat: 'member',
    args: () => ({ payload: { kind: 'reserve', setting: 'rate', power: 'unilateral' },
      why: 'one hand is quicker than three when the drip needs changing' }),
    events: [{ id: 'E39', key: (D) => (D.motionIds["return-motion"] ? 'mo:' + D.motionIds["return-motion"] : null), noKey: 'the motion return-motion put came back with no id', at: 'return-motion', waitsOn: 'grant-voice' }] },
  // **A member removed by a carried motion** (SURFACE E40; Q901, Ed
  // 2026-09-14; stepped by Q1359) — the last row of the live epoch, because
  // it takes a seat out of the document and every cell above it says *every
  // member*. `remove-motion` put the motion twelve rows up and left it
  // running, which is what E11 asserts there; this row carries it.
  //
  // E40's cell is E31's word for word, and the two halves are read on their
  // own channels: the 🥾 news card `dep:<member>` on every seat still in the
  // room, and the door's departure sentence on the seat that left
  // (`orDeparted`). The actor is inside the audience like anybody else —
  // only ❌ skips its own actor (Q1358) — so `early`, who moved it, carries
  // the card too.
  { id: 'carry-removal', epoch: 'live', kind: 'carry-removal', seat: 'founder', who: 'late', ifHat: 'member',
    events: [{ id: 'E40', key: 'dep:', at: 'carry-removal', removed: 'late', orDeparted: true }] },
  // ---- closed -------------------------------------------------------------
  // `toClosing` moves ⏰ with the founder's pen: a constitutional setting set
  // post-start, so E5 on `ending` for every member who was here
  { id: 'ladder-closing', epoch: 'closed', kind: 'ladder', seat: 'founder', to: 'closing',
    events: [E5('ending', 'ladder-closing')] },
  { id: 'ladder-closed', epoch: 'closed', kind: 'ladder', seat: 'founder', to: 'closed',
    events: [{ id: 'E24', key: 'closing', at: 'ladder-closed', oracle: 'closed', orSigned: true }] },
];
/**
 * A step id → its position. **It refuses an unknown id** rather than handing
 * back −1: `at` is what every audience predicate compares `stoodAt` against,
 * so a mistyped step would put every seat outside every audience and report
 * whoever *did* carry the entry as a finding — a table typo dressed as a
 * product defect.
 */
const stepIndex = (id) => {
  const i = STEPS.findIndex((s) => s.id === id);
  if (i < 0) throw new Error(`no step '${id}' in STEPS — an event's \`at\` names a step that does not exist`);
  return i;
};
// checked at load, so a typo is a refusal before a browser is launched
for (const s of STEPS) for (const e of s.events) {
  stepIndex(e.at ?? s.id);
  // `filed: 'Qn'` marks a *no rule* row whose question is on the register, so
  // a run whose every unread cell has a number can exit 0. It is only honest
  // on a row with no key: a filed row that later gains one should be read
  // again, not silently asserted under the mark.
  if (e.filed && e.key !== null) throw new Error(`step '${s.id}' ${e.id} is filed as ${e.filed} but has a key (${e.key}) — drop the mark and let the row be asserted`);
  // a mail row is asserted off the outbox and never off the rail (Q1355), so
  // a key on one would be read by neither half: the mail path takes the row
  // before the keyless branch and the rail path never sees it
  if (e.mail && e.key !== null) throw new Error(`step '${s.id}' ${e.id} carries a mail assertion and a key (${e.key}) — a mail row is read off the outbox, so the key would never be asserted`);
}

/* ======================================================================== */

/** One document, one founder's hat, the step table over it. */
async function runDocument(hat) {
  const D = {
    motionIds: {},            // open-motion results by step id (Q1367): the rail keys the motion rows assert
    hat, slug: null, docbase: null, title: 'Seat matrix ' + Date.now(),
    stamp: String(Date.now()).slice(-8), applicantId: null, closed: false,
    // the steps that did not happen on this document, by index — skipped by
    // `ifHat`, or thrown. An event raised by a step that never ran is
    // asserted against a document where the thing never happened, and every
    // seat inside the audience is then reported for not carrying news nobody
    // sent (2026-09-07: three E34 rows and one E10 on the clerk hat, all of
    // them the harness talking to itself)
    skipped: new Set(), snapDead: new Set(),
    seats: {}, stoodAt: {}, findings: [], noRule: [], filed: [], errors: [], refused: [], unstood: [], steps: [],
    actorOf: (ev) => (STEPS[ev.at] || {}).seat,
  };
  say(`\n══ document · founder is a ${hat} ══`);
  const mine = SEATS.filter((s) => s.document === 'both' || s.document === hat);
  for (const s of mine) {
    const name = s.role === 'founder' ? 'founder' : s.name; // one founder row per document
    D.seats[name] = { def: s, ctx: null, page: null, stood: false, quiet: false,
      email: name === 'founder' ? 'ada@example.org' : `${name}${D.stamp}@example.org` };
  }
  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    let evs = step.events.map((e) => ({ ...e, at: stepIndex(e.at ?? step.id) }));
    const label = `${step.epoch.padEnd(6)} · ${step.id}` +
      (evs.length ? ' · ' + evs.map((e) => e.id + ' ' +
        (typeof e.key === 'function' ? '(key at the assertion)' : (e.key ?? '(no key)'))).join(', ') : '');
    say(`⏭ ${label}`);
    // the runner's own `ifHat` test, read here so the assertion can see it:
    // each runner decides whether to act, and only this loop knows which
    // events the decision silences
    if (step.ifHat && step.ifHat !== D.hat) D.skipped.add(i);
    let note = null;
    try { note = await RUN[step.kind](step, D); } catch (e) {
      // **A step that could not be stood raised no event either.** The
      // failure is already reported under `unstood`, with its reason; going
      // on to assert that every seat inside the audience carries news the
      // step never sent adds a finding per seat about a fiction, and buries
      // the one line that says what actually went wrong (2026-09-07: the
      // clerk hat's 🍾 refusal was reported once and then re-reported as
      // eight audience findings across E4, E5 and E24).
      D.skipped.add(i);
      D.unstood.push(`${hat} · ${step.id}: ${String(e && e.message || e)}`);
      say('   ✗ ' + String(e && e.message || e));
    }
    if (note) say('   · ' + note);
    if (step.kind === 'ladder' && step.to === 'closed') D.closed = true;
    // a key the step only learns by running (E13's race id, Q1340) resolves
    // here, once, so the label, the payload and the assertion agree on it; a
    // function that has nothing to say is a `null` key and reads as no rule.
    // **Awaited** since Q1356: a key can be learned by asking the document
    // what the step just made, which is a read, and a step that did not run
    // is not asked at all
    const resolved = [];
    for (const e of evs) {
      if (typeof e.key !== 'function') { resolved.push(e); continue; }
      let k = null;
      if (!D.skipped.has(i)) { try { k = (await e.key(D)) ?? null; } catch { k = null; } }
      resolved.push({ ...e, key: k,
        noKey: e.noKey || `${e.id}'s key was not learned by ${step.id}` });
    }
    evs = resolved;
    const snap = await snapshot(D);
    // the outbox, for the rows whose channel is mail (E22, Q1355) — read
    // once per step that needs it, and polled, since the sender pass runs on
    // a kick after the commit rather than inside it
    D.mails = evs.some((e) => e.mail) && !D.skipped.has(i) ? await mailsFor(D, evs) : [];
    D.steps.push({ id: step.id, epoch: step.epoch, seats: snap,
      // `filed` rides along so the payload says why a row was not asserted
      events: evs.map((e) => ({ id: e.id, key: e.key, ...(e.filed ? { filed: e.filed } : {}) })) });
    assertStep(D, step, evs, snap);
    if (TO !== null && step.epoch === TO && (STEPS[i + 1] === undefined || STEPS[i + 1].epoch !== TO)) {
      say(`   stopped after the ${TO} epoch: ${D.docbase}/d/${D.slug}`);
      break;
    }
  }
  for (const s of Object.values(D.seats)) if (s.ctx) await s.ctx.close().catch(() => {});
  return { hat, findings: D.findings, noRule: D.noRule, filed: D.filed, errors: D.errors, refused: D.refused,
    unstood: D.unstood, steps: D.steps };
}

/* ---- seats: contexts, nets, pages --------------------------------------- */
async function standUp(D, name) {
  const s = D.seats[name];
  if (!s.ctx) {
    // the locale pinned for the reason Q628 gives: the snapshots are diffed later
    s.ctx = await browser.newContext({ viewport: { width: 1600, height: 1100 },
      locale: 'en-GB', timezoneId: 'Europe/London' });
  }
  s.page = await s.ctx.newPage();
  attachNets(D, name, s.page);
  return s;
}
function attachNets(D, name, page) {
  // the first frame of the stack too: `String(e)` is the message alone, and a
  // page error on a surface no walk opens by hand is unfindable without the
  // line it threw on (2026-09-07, the applicant's `self.v.view` getters)
  page.on('pageerror', (e) => D.errors.push(`[${D.hat}/${name}] ` + String(e) +
    (e && e.stack ? ' · ' + String(e.stack).split('\n').slice(1, 3).map((l) => l.trim()).join(' ← ') : '')));
  // a refused command is a failure even where the surface recovers (journey's rule)
  page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400) {
    const at = D.refused.push(`[${D.hat}/${name}] ` + r.status() + ' ' + r.request().method() + ' ' +
      new URL(r.url()).pathname + ' ' + String(r.request().postData() || '').slice(0, 120)) - 1;
    r.text().then((b) => { D.refused[at] += ' → ' + b.slice(0, 160); }).catch(() => {});
  } });
  // no `give-ok` tally here: what an acknowledgement *was about* is the
  // question, and `window.__founding().okd` — the seat's own key list, read
  // in `railOf` — answers it, where a count of POSTs cannot.
}
/** A command over the wire as a named seat, from inside its page so the cookie rides. */
const cmdAs = (D, name, op, args) => D.seats[name].page.evaluate(async ([slug, op2, args2]) => {
  const r = await fetch(`/api/d/${slug}/cmd`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cmd: op2, args: args2 }),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}, [D.slug, op, args]);
const landOn = async (page, url) => {
  await page.goto(url);
  for (let i = 0; i < 40 && !page.url().includes('/d/'); i++) await page.waitForTimeout(500);
  await page.waitForTimeout(2600);
};
/**
 * Open a card from the rail or from its tab, wherever that tab stands. The
 * page's own `tabFor` looks in **both** `#band` and `#titlepara` — the two
 * grants stand on the Founded line, which is `#titlepara` and has no clause
 * (SURFACE §8 rows 4–5) — and `railOf` below reads both for the same reason,
 * so opening must too: a task that stands only as a Founded-line tab is
 * precisely the Q639 case this harness exists to catch.
 */
const openCard = async (page, k) => {
  const ok = await page.evaluate((kk) => {
    const el = document.querySelector('#rail [data-card="' + kk + '"], ' +
      '#band .achip[data-tab="' + kk + '"], #titlepara .achip[data-tab="' + kk + '"]');
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    el.click();
    return true;
  }, k);
  await page.waitForTimeout(450);
  return ok;
};
// `press(page, ms)` and `typeIn(page, sel, v)` are the walks' shared ones
// (scripts/lib/walk.mjs), page-first because this harness drives several seats

/* ---- the dispatcher: one case per step kind ----------------------------- */
const SETTINGS = [
  ['ending', { endsAtMs: null }],
  ['quorum', { form: 'count', n: 1 }],
  ['authorship', { rung: 'sealed' }],
  ['judgments', { rung: 'after' }],
  ['chamber', { rung: 'closed' }],          // the setting the amendment moves
  // 💤 is not here: it is answered on the card (`lapse-card`) and then set to
  // one minute over the wire (`lapse-minute`), so the lapsed seat lapses for real
  ['removal', { price: 'proposal' }],
  ['rate', { grant: 4, cap: 8, dripMinutes: 240 }],
  ['machines', { enabled: false, budget: 0 }],
  ['applications', { apply: true }],
  ['admission', { price: 'proposal' }],
];
const RUN = {
  /** The birth through the surface: the three cards and the magic link. */
  birth: async (step, D) => {
    const s = await standUp(D, 'founder');
    const page = s.page;
    await page.goto(BASE + '/');
    await page.waitForTimeout(800);
    await openCard(page, 'title');
    await typeIn(page, '.setupcard [data-titlelane]', D.title);
    await press(page, 1250);
    await openCard(page, 'slug');
    await press(page, 1250);
    await openCard(page, 'myemail');
    await typeIn(page, '.setupcard input[type="email"]', s.email);
    await press(page, 1250);
    await page.waitForTimeout(1600);
    const held = await devOutbox(BASE);
    const mails = held.filter((m) => JSON.stringify(m).includes(D.title));
    if (!mails.length) throw new Error('no creation mail for ' + D.title + ' — the outbox held ' +
      held.length + ' mail(s), none for this title; the open card was ' +
      JSON.stringify(await page.evaluate(() => {
        const c = document.querySelector('.setupcard');
        return c ? (c.dataset.k || (c.querySelector('[data-tab]') || { dataset: {} }).dataset.tab || 'some card') : null;
      })));
    await landOn(page, linkIn(mails[mails.length - 1]));
    D.slug = (page.url().match(/\/d\/([^/?#]+)/) || [])[1];
    if (!D.slug) throw new Error('the magic link did not land on a document: ' + page.url());
    // a cookie belongs to an origin, and the magic link picks the origin
    D.docbase = new URL(page.url()).origin;
    s.stood = true; D.stoodAt.founder = stepIndex(step.id);
    return 'saved at ' + D.docbase + '/d/' + D.slug;
  },
  /** The rest of the constitution over the wire with the founder's pen. */
  settings: async (step, D) => {
    const bad = [];
    for (const [id, value] of SETTINGS) {
      const r = await cmdAs(D, 'founder', 'set-setting', { setting: id, value });
      if (r.status !== 200) bad.push(id + ' → ' + r.status + ' ' + JSON.stringify(r.body));
    }
    if (bad.length) throw new Error('set-setting refused: ' + bad.join(' · '));
    return SETTINGS.length + ' settings set · 🪪 proposal · 🤝 open · 🌍 closed';
  },
  /** A setting answered on its own card: open it, pick a rung, fill its fields, commit. */
  card: async (step, D) => {
    const page = D.seats[step.seat].page;
    if (!(await openCard(page, step.key))) throw new Error(`no ${step.key} card to open on the ${step.seat}'s page`);
    if (step.pick) {
      const picked = await page.evaluate((p) => {
        const b = document.querySelector('.setupcard [data-set="' + p.set + '"][data-val="' + p.val + '"]');
        if (!b) return false; b.click(); return true;
      }, step.pick);
      if (!picked) throw new Error(`${step.key}: no rung ${step.pick.set}=${step.pick.val} on the card`);
      await page.waitForTimeout(300);
    }
    for (const [k, v] of Object.entries(step.fields || {})) {
      if (!(await typeIn(page, '.setupcard [data-num="' + k + '"]', v))) throw new Error(`${step.key}: no field ${k} on the card`);
    }
    await page.waitForTimeout(300);
    const label = await press(page, PEN_HOLD_MS);
    if (label === null) throw new Error(`${step.key}: the card offers no live commit`);
    await page.waitForTimeout(900);
    // a press is not a commit: a hold that rewinds leaves the card exactly as it
    // was and this step would report success, the failure surfacing steps later
    // as a card that will not settle. Read the value back off the module.
    const id = step.setting ?? step.key;
    const v = await viewAs(D, step.seat);
    const sv = ((((v || {}).view) || {}).settings || []).find((x) => x.setting === id);
    if (!sv || sv.value === null || sv.value === undefined) {
      throw new Error(`${step.key}: the commit (${label}) did not land — ${id} is still unset in the module`);
    }
    return `${step.key} answered on the card (${label}) · ${id} = ${JSON.stringify(sv.value)}`;
  },
  cmd: async (step, D) => {
    // `ifHat` is the table's one conditional, and it belongs to any step kind
    // that can be a hat's alone — the `ok` runner has honoured it since the
    // first run, and a live-epoch command on a document that never begins is
    // the same shape of thing
    if (step.ifHat && step.ifHat !== D.hat) return `skipped: the founder is a ${D.hat}`;
    // `await`: a row whose arguments have to be looked up first (a member id
    // read off a seat's own view) returns a promise, and every existing row's
    // plain object awaits to itself
    const r = await cmdAs(D, step.seat, step.cmd, await step.args(D));
    if (r.status !== 200) throw new Error(`${step.cmd} as ${step.seat} → ${r.status} ${JSON.stringify(r.body)}`);
    // **A motion's entry is its own** (Q1367): keyed `mo:<id>` on every seat,
    // never by the setting, the door or the power tab it is about — so the
    // id the command minted is kept by step, and the motion rows' keys are
    // functions that read it at the assertion (E10, E11, E39)
    if (step.cmd === 'open-motion' && r.body && r.body.result) D.motionIds[step.id] = r.body.result;
    if (step.reload) {
      const page = D.seats[step.seat].page;
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2600);
    }
    return `${step.cmd} as ${step.seat}` + (step.reload ? ' · page reloaded, so the wire-set settings are seen' : '');
  },
  /**
   * **A mail that gave up** (SURFACE E34). Invite an address no seat will ever
   * follow, then drive the outbox to its attempt cap for it through the
   * dev-only forced give-up — six attempts and ~3 hours otherwise, and the
   * reserved-TLD seam is deliberately a *retire* rather than a give-up. The
   * address is the step's own and not a seat's: the give-up runs the outbox's
   * real `give`, and a seat that had not yet followed its link would be
   * standing one up afterwards.
   */
  mailfail: async (step, D) => {
    if (step.ifHat && step.ifHat !== D.hat) return `skipped: the founder is a ${D.hat}`;
    const to = `dead${D.stamp}@example.org`;
    const inv = await cmdAs(D, step.seat, 'invite', { email: to });
    if (inv.status !== 200) throw new Error(`invite ${to} → ${inv.status} ${JSON.stringify(inv.body)}`);
    // let the sender pass deliver it first: a forced give-up is about a mail
    // that has been offered, and the walk should meet the real sequence
    await sleep(1200);
    // from the seat's own page, so the Origin the dev route checks is the
    // document's own — `page.evaluate` fetches relative to it
    const r = await D.seats[step.seat].page.evaluate(async ([slug, addr]) => {
      const res = await fetch('/api/dev/outbox/give-up', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, to: addr }),
      });
      return { status: res.status, body: await res.json().catch(() => null) };
    }, [D.slug, to]);
    if (r.status !== 200) throw new Error(`forced give-up → ${r.status} ${JSON.stringify(r.body)}`);
    return `invited ${to} and drove its mail to the attempt cap · ${JSON.stringify(r.body)}`;
  },
  invite: async (step, D) => {
    for (const who of step.who) {
      const r = await cmdAs(D, 'founder', 'invite', { email: D.seats[who].email });
      if (r.status !== 200) throw new Error(`invite ${who} → ${r.status} ${JSON.stringify(r.body)}`);
    }
    return 'invited ' + step.who.join(', ');
  },
  /** Stand a seat up: a member follows their invitation; a stranger just arrives. */
  seat: async (step, D) => {
    const s = await standUp(D, step.seat);
    if (s.def.role === 'stranger') {
      await s.page.goto(D.docbase + '/d/' + D.slug);
      await s.page.waitForTimeout(2600);
    } else {
      const mail = (await devOutbox(BASE)).find((m) => JSON.stringify(m).includes(s.email));
      const link = mail ? linkIn(mail) : null;
      if (!link) throw new Error(`seat ${step.seat} could not be stood: no invitation link in the outbox for ${s.email}`);
      await landOn(s.page, link);
      if (!s.page.url().includes('/d/')) throw new Error(`seat ${step.seat} could not be stood: landed at ${s.page.url()}`);
    }
    if (s.def.role === 'member') {
      // ✋🖼️ answered over the wire, then one reload: `nameSet`/`picSet` are
      // hydrated at boot only, and unanswered they stand above the gates in
      // `ORDER` (see `face` on SEATS). It happens **before** `stood`: a seat
      // that never introduced itself carries no card below ✋🖼️, so asserting
      // its rail would report the founding order as a page finding per step.
      const r = await cmdAs(D, step.seat, 'set-identity', { name: s.def.person, picture: s.def.face });
      if (r.status !== 200) throw new Error(`seat ${step.seat} could not be stood: set-identity → ${r.status} ${JSON.stringify(r.body)}`);
      await s.page.reload({ waitUntil: 'domcontentloaded' });
      await s.page.waitForTimeout(2600);
    }
    s.stood = true; D.stoodAt[step.seat] = stepIndex(step.id);
    return `${step.seat} at ${s.page.url()}`;
  },
  /** Open a card by key on the founder's page and click its OK. */
  ok: async (step, D) => {
    if (step.ifHat && step.ifHat !== D.hat) return `skipped: the founder is a ${D.hat}, ${step.key} is not theirs`;
    const page = D.seats[step.seat].page;
    if (!(await openCard(page, step.key))) throw new Error(`no ${step.key} card to OK on the ${step.seat}'s page`);
    const pressed = await page.evaluate(() => {
      const b = document.querySelector('.setupcard [data-ok]');
      if (!b || b.disabled) return false;
      b.scrollIntoView({ block: 'center' });
      b.click();
      return true;
    });
    if (!pressed) throw new Error(`${step.key} opened but offers no live OK`);
    await page.waitForTimeout(900);
    return `OK on ${step.key}`;
  },
  /** A real-pointer hold on the open card's commit, for its full length. */
  hold: async (step, D) => {
    const page = D.seats[step.seat].page;
    if (!(await openCard(page, step.key))) {
      const f = await page.evaluate(() => (window.__founding ? window.__founding() : null));
      throw new Error(`no ${step.key} card to hold · readiness ${JSON.stringify(f && f.readiness)} · rail ${JSON.stringify(f && f.rail)}`);
    }
    // `keep`: cells of 🍾's power table pressed to *keep* before the hold —
    // the toggle is a flip, so it is pressed only where it does not already
    // stand kept (journey-walk's `brSet`, on the same `.pwtoggle` controls)
    for (const [k, pw] of step.keep || []) {
      const kept = await page.evaluate((sel) => {
        const b = document.querySelector(sel);
        if (!b) return null;
        if (b.getAttribute('aria-pressed') === 'true') return true;
        if (b.disabled) return false;
        b.click(); return true;
      }, '.setupcard .begintable .pwtoggle[data-bkey="' + k + '"][data-bpw="' + pw + '"]');
      if (kept !== true) throw new Error(`${step.key}: the power table has no live ${k}/${pw} cell to keep`);
      await page.waitForTimeout(200);
    }
    const label = await press(page, BEGIN_HOLD_MS);
    if (label === null) {
      const f = await page.evaluate(() => (window.__founding ? window.__founding() : null));
      throw new Error(`${step.key} has no live commit · readiness ${JSON.stringify(f && f.readiness)}`);
    }
    if (step.key === 'begin') {
      await page.waitForTimeout(800);
      const begun = await page.evaluate(() => !!document.querySelector('.doc.begun'));
      if (!begun) throw new Error('🍾 was held for ' + BEGIN_HOLD_MS + 'ms and the document did not begin');
    }
    return `held ${label} for ${BEGIN_HOLD_MS}ms`;
  },
  /**
   * **A text adoption parks** (SURFACE E36, E37): the member seats judge for
   * the challenger on the text race `propose-text` opened, one at a time,
   * until the founder's view carries a text 👑 question — the park. Stops at
   * the first sight of it; refuses if every seat has spoken and nothing
   * parked, since the row's assertions would then be about nothing.
   */
  park: async (step, D) => {
    if (step.ifHat && step.ifHat !== D.hat) return `skipped: the founder is a ${D.hat}`;
    const parkedNow = async () => {
      const f = await viewAs(D, 'founder');
      return ((((f || {}).view) || {}).crownTasks || []).filter((t) => t.text);
    };
    let tasks = await parkedNow();
    const voted = [];
    for (const name of ['early', 'late', 'lapsed']) {
      if (tasks.length) break;
      const s = D.seats[name];
      if (!s || !s.stood || !s.page) continue;
      const v = await viewAs(D, name);
      const text = new Set(((v || {}).clauses || []).map((c) => c.id));
      // the pair the hand dealt on the text race, else the one the race can still ask (Q1202)
      const dealt = ((v || {}).raceCards || []).find((c) => text.has(c.raceId));
      const clause = ((v || {}).clauses || []).find((c) => c.ask);
      const card = dealt || (clause && clause.ask);
      if (!card) continue; // nothing left to ask this seat here
      const outcome = card.a.incumbent ? 'b' : card.b.incumbent ? 'a' : 'a';
      const r = await cmdAs(D, name, 'judge-race', { a: card.a.id, b: card.b.id, outcome });
      if (r.status !== 200) throw new Error(`judge-race as ${name} → ${r.status} ${JSON.stringify(r.body)}`);
      voted.push(name);
      tasks = await parkedNow();
    }
    if (!tasks.length) throw new Error('no text 👑 question stands after ' + (voted.join(', ') || 'nobody') + ' judged for the challenger — nothing parked, so E36/E37 have nothing to assert');
    return `parked: ${tasks.length} text 👑 question(s) on the founder's view after ${voted.length ? voted.join(', ') + ' judged for the challenger' : 'no further judgment'}`;
  },
  /**
   * **Carrying the removal `remove-motion` put** (SURFACE E40; Q901; stepped
   * by Q1359). 🥾 stands at `proposal` on this document, so the motion is
   * **ordinary** and carries by being judged rather than answered: the bridge
   * gave it a race of its own on the synthetic `remove:<member>` setting
   * (`enterMembershipRace`), and a served card on it is found by that id —
   * `OptionView.setting`, the one place the engine says which setting a
   * side stands for. Every seat the race can still ask judges for the
   * challenger, the membership without them, until the engine adopts.
   *
   * **The mover is not among them**: an author is never served their own
   * candidate against the incumbent (§3.3), so `early`'s card never appears
   * and the loop simply finds nothing for that seat.
   *
   * ❌'s 🛡️ is still the Founder's — 🍾 keeps every power it is not told to
   * lay down — so `adjudicateOrdinaryMotion` parks the carry as a 👑
   * question rather than applying it, and the Founder answers it here in the
   * same breath. Either road, the departure is the room's act (`by:
   * 'members'`), which is exactly E40's distinction from E31.
   */
  'carry-removal': async (step, D) => {
    if (step.ifHat && step.ifHat !== D.hat) return `skipped: the founder is a ${D.hat}`;
    const target = D.removeTarget;
    if (!target) throw new Error('no removal was put, so there is nothing to carry');
    const settingId = 'remove:' + target;
    const gone = async () => {
      const v = await viewAs(D, 'founder');
      return (((v || {}).view || {}).departures || []).some((d) => d.id === target);
    };
    const judged = [];
    for (const name of ['founder', 'lapsed', 'late', 'early']) {
      if (await gone()) break;
      const s = D.seats[name];
      if (!s || !s.stood || !s.page) continue;
      const v = await viewAs(D, name);
      const rc = ((v || {}).raceCards || []).find((c) =>
        (c.a.setting && c.a.setting.settingId === settingId) ||
        (c.b.setting && c.b.setting.settingId === settingId));
      if (!rc) continue;                    // nothing on this race left to ask this seat
      const outcome = rc.a.incumbent ? 'b' : 'a';   // the challenger, whichever side it is
      const r = await cmdAs(D, name, 'judge-race', { a: rc.a.id, b: rc.b.id, outcome });
      if (r.status !== 200) throw new Error(`judge-race as ${name} → ${r.status} ${JSON.stringify(r.body)}`);
      judged.push(name);
    }
    let crowned = null;
    if (!(await gone())) {
      const v = await viewAs(D, 'founder');
      // the park from the `park` step is still pending and is a **text**
      // question; a motion's is the one with a motion on it
      const q = (((v || {}).view || {}).crownTasks || []).find((x) => !x.text && x.motion);
      if (q) {
        const r = await cmdAs(D, 'founder', 'answer-crown-question', { question: q.id, outcome: 'accept' });
        if (r.status !== 200) throw new Error(`answer-crown-question → ${r.status} ${JSON.stringify(r.body)}`);
        crowned = q.id;
      }
    }
    if (!(await gone())) {
      throw new Error('the removal did not carry after ' + (judged.join(', ') || 'nobody') +
        ' judged' + (crowned ? ` and the Founder accepted ${crowned}` : ' and no 👑 question stood') +
        ' — E40 has nothing to assert');
    }
    const s = D.seats[step.who];
    // **A removed seat is out of the document, not broken.** It keeps no
    // membership, so a keep-alive command from it is a 401 the net listener
    // would report as a refused command, and no cell that says *every
    // member* may count it from here on (`left`, read by `isMember`).
    s.left = true; s.quiet = true;
    // *…and, on their next visit, the door's departure sentence* — E40's own
    // channel for the person it happened to; a reload is that next visit.
    await s.page.reload({ waitUntil: 'domcontentloaded' });
    await s.page.waitForTimeout(2600);
    return `${step.who} removed by the room after ${judged.join(', ') || 'nobody'} judged` +
      (crowned ? `, the Founder accepting ${crowned}` : '') + '; their page is the door';
  },
  /** The lapsed seat goes quiet: page shut, no act, until the clock lapses it. */
  wait: async (step, D) => {
    const s = D.seats[step.seat];
    if (!s.stood) throw new Error(`${step.seat} was never stood, so it cannot lapse`);
    await s.page.close(); s.page = null; s.quiet = true;
    const t0 = Date.now();
    let lapsed = false; let lastAlive = 0;
    while (Date.now() - t0 < LAPSE_WAIT_MS) {
      await sleep(10_000);
      if (Date.now() - lastAlive > 30_000) { await keepAlive(D); lastAlive = Date.now(); }
      const v = await viewAs(D, 'founder');
      const row = (((v && v.view) || {}).members || []).find((m) => m.email === s.email);
      if (row && row.lapsed) { lapsed = true; break; }
    }
    if (!lapsed) { s.stood = false; throw new Error(`seat ${step.seat} could not be stood: the clock did not lapse it within ${LAPSE_WAIT_MS / 1000}s`); }
    // **Seeing is presence** (Ed, 2026-09-08, R-096): reopening the page is
    // the revival — the read returns the seat, E grows back, and from here on
    // it is an ordinary member again, served every open question. Until this
    // date a read did not revive, and the seat stayed lapsed for the rest of
    // the run with its page open, which is the state Ed says never exists.
    s.page = await s.ctx.newPage(); attachNets(D, step.seat, s.page);
    await s.page.goto(D.docbase + '/d/' + D.slug);
    await s.page.waitForTimeout(2600);
    const after = await viewAs(D, 'founder');
    const back = (((after && after.view) || {}).members || []).find((m) => m.email === s.email);
    if (!back || back.lapsed) throw new Error(`seat ${step.seat} opened the page lapsed and was not returned by the read (R-096)`);
    s.quiet = false; // an ordinary member again: kept alive like the others
    return `${step.seat} lapsed after ${Math.round((Date.now() - t0) / 1000)}s quiet; page reopened, and the read returned them (R-096)`;
  },
  /** A stranger knocks, verifies, and submits an application (applicants-walk's shape). */
  knock: async (step, D) => {
    const s = await standUp(D, 'applicant');
    const r = await fetch(D.docbase + '/api/d/' + D.slug + '/apply', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: s.email }) });
    const body = await r.json().catch(() => null);
    if (r.status !== 200 || !body || !body.devLink) throw new Error(`the door refused the knock → ${r.status} ${JSON.stringify(body)}`);
    await s.page.goto(body.devLink);
    await s.page.waitForTimeout(2200);
    // **the seat is read, not assumed** (Q1281): a page that booted as
    // nobody is an unstood seat, and an unstood seat is a red run — this is
    // the page that threw on load for as long as applicants existed while the
    // walk went on submitting for it by fetch
    const f = await s.page.evaluate(() => (window.__founding ? window.__founding() : null));
    if (!f || f.viewer !== 'applicant') {
      throw new Error(`the applicant's page did not boot as the applicant seat — viewer ${JSON.stringify(f && f.viewer)}`);
    }
    if (!f.rail.includes('apply')) throw new Error(`the applicant's rail holds no Apply card: ${JSON.stringify(f.rail)}`);
    s.stood = true; D.stoodAt.applicant = stepIndex(step.id);
    const sub = await cmdAs(D, 'applicant', 'submit-application', { name: s.def.person, words: 'I bake.' });
    if (sub.status !== 200) throw new Error(`submit-application → ${sub.status} ${JSON.stringify(sub.body)}`);
    // the minted id, so the mask can fold it
    const v = await viewAs(D, 'founder');
    const row = (((v && v.view) || {}).applicants || []).find((a) => a.email === s.email);
    D.applicantId = row ? row.id : null;
    return `${s.def.person} verified and submitted` + (D.applicantId ? ` · id ${D.applicantId}` : '');
  },
  /** Press ⏭ on the founder's ladder bar and wait for the page it lands on. */
  ladder: async (step, D) => {
    const page = D.seats.founder.page;
    // the bar posts the `to` it was **rendered** with (`d.next` from its own
    // load-time fetch), and the founder's page was last loaded before 🍾 —
    // so the first ⏭ asked for `session`, already the rung, and did nothing
    // (first run, 2026-08-27: `⏭ closing: the ladder reports 'session'`).
    // A press is a reload and a POST; here the reload comes first.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const btn = await page.$('#ladnext');
    if (btn === null) throw new Error('the ladder bar has no ⏭ — is the server in dev mail mode?');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60_000 }),
      btn.click(),
    ]);
    await page.waitForTimeout(1500);
    const d = await page.evaluate((slug) => fetch('/api/dev/ladder?slug=' + encodeURIComponent(slug)).then((r) => r.json()), D.slug);
    if (d.phase !== step.to) throw new Error(`⏭ ${step.to}: the ladder reports '${d.phase}' — the rung did not advance (its skipped list is in the server log)`);
    return `the ladder reports ${d.phase}`;
  },
};

/* ---- keeping the non-lapsing seats alive ---------------------------------- *
 * Presence is stamped hourly (`SEEN_EVERY_MS`), so under a one-minute 💤 a
 * polling page keeps nobody alive; only an act does. Every stood member seat
 * that is not the lapsing one re-states its own name and face before each
 * snapshot — an act that changes nothing the view shows, and for the founder
 * the act that answers ✋🖼️ before the `text` step's reload. Not after the
 * close.                                                                    */
async function keepAlive(D) {
  if (!D.slug || D.closed) return;
  for (const [name, s] of Object.entries(D.seats)) {
    if (!s.stood || s.quiet || !s.page) continue;
    if (!(s.def.role === 'member' || s.def.role === 'founder')) continue;
    const r = await cmdAs(D, name, 'set-identity', { name: s.def.person, picture: s.def.face }).catch(() => null);
    if (r && r.status !== 200) D.refused.push(`[${D.hat}/${name}] keep-alive set-identity → ${r.status} ${JSON.stringify(r.body)}`);
  }
}

/* ---- the two snapshots per seat ------------------------------------------- */
const viewAs = (D, name) => D.seats[name].page.evaluate((slug) =>
  fetch('/api/d/' + slug + '/view').then((r) => r.json()).catch((e) => ({ error: String(e && e.message) })), D.slug);
const railOf = (page) => page.evaluate(() => ({
  rail: [...document.querySelectorAll('#rail li')].map((li) => {
    const b = li.querySelector('button');
    const st = b ? [...b.classList].find((c) => c.startsWith('st-')) : null;
    // `||`, not `??`: journey-walk reads it that way, and an empty `data-q`
    // has to fall through to the card key rather than stand as ''
    return { key: li.dataset.q || (li.querySelector('[data-card]') || { dataset: {} }).dataset.card || '?',
      kind: st ? st.slice(3) : null,
      // a subject glyph is drawn since Q1401, so its character comes back off
      // the picture rather than out of the (empty) text
      mark: li.querySelector('.subj') ? (window.CARDS.glyphTextOf(li.querySelector('.subj')).trim() || null) : null,
      site: li.dataset.site ?? null };
  }),
  // the band's tabs: the tab, the rail entry and the card are one thing (F17),
  // and a task can stand as a tab the rail never lists — Q639's ⏳ pair did
  band: [...document.querySelectorAll('#band .achip[data-tab], #titlepara .achip[data-tab]')].map((el) => ({
    key: el.dataset.tab, kind: ([...el.classList].find((c) => c.startsWith('st-')) || 'st-?').slice(3) })),
  // `order` rides along because the rail is a *consequence* of it: a card
  // withheld by `orderReady` and a card nobody is owed look identical in the
  // rail, and telling the two apart is the first question every finding here
  // asks (2026-09-07 — the whole member-hat cluster turned out to be one
  // card's `vis=0`, invisible in six runs of snapshots without this line).
  readout: (() => { const f = window.__founding ? window.__founding() : null;
    return f ? { served: f.served, okd: f.okd, owed: f.owed, amFounder: f.amFounder,
      viewerIsMember: f.viewerIsMember, constituted: f.constituted, readiness: f.readiness,
      order: f.order, answers: f.answers, owedUnservable: f.owedUnservable } : null; })(),
}));
async function snapshot(D) {
  if (!D.slug) return {};
  await keepAlive(D);
  await sleep(SETTLE_MS);
  const out = {};
  for (const [name, s] of Object.entries(D.seats)) {
    if (!s.stood) continue;
    if (!s.page) { out[name] = { unstood: 'page shut, waiting to lapse' }; continue; }
    try {
      const r = await railOf(s.page);
      const v = await viewAs(D, name);
      out[name] = { rail: r.rail, band: r.band, readout: r.readout, view: mask(D, v) };
    } catch (e) {
      // **A seat whose snapshot throws is not a seat that carries nothing.**
      // `assertStep` skips an `unstood` seat, so a page that cannot be read
      // drops silently out of every audience from that step on and the run
      // reports itself green over it — which is how the applicant's dead
      // live page went unseen from the step that stands it to the close
      // (2026-09-07). Once per seat per document: the cause is one page, and
      // a line per step would bury the rest of the report.
      const why = 'snapshot failed: ' + String(e && e.message).split('\n')[0];
      out[name] = { unstood: why };
      if (!D.snapDead.has(name)) {
        D.snapDead.add(name);
        D.unstood.push(`${D.hat} · seat ${name} could not be read from here on: ${why}`);
        say(`   ✗ seat ${name} · ${why}`);
      }
    }
  }
  return out;
}
/** Volatile fields folded before a snapshot is stored or compared. */
function mask(D, v) {
  let s = JSON.stringify(v);
  if (s === undefined) return null;
  s = s.split(D.title).join('<title>').split(D.slug).join('<slug>').split(D.stamp).join('<stamp>');
  if (D.applicantId) s = s.split(D.applicantId).join('<applicant>');
  const walk = (x) => {
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === 'object') {
      return Object.fromEntries(Object.entries(x).map(([k, val]) => [k,
        (typeof val === 'number' && (/(T|At|Ms)$/.test(k) || /^(t|at|seq|eseq|nowMs|settledAtT)$/.test(k)))
          ? '<n>' : walk(val)]));
    }
    return x;
  };
  return walk(JSON.parse(s));
}

/* ---- the outbox, for the rows whose channel is mail -------------------------- */
/**
 * This document's mails, polled until every mail row's own has landed or
 * `MAIL_WAIT_MS` is up: the outbox's sender runs on a **kick after** the
 * commit rather than inside it, so a row is filed a few hundred ms behind the
 * fold it came from and a read taken at the fold would report an empty outbox
 * as a defect. Filtered by the document's own title, which every subject
 * carries, so the second hat's document and the other walks sharing a server
 * cannot leak in. `WARN_LEADS` rides back with them, read once off the page's
 * own constitution bundle rather than repeated here — R-097's three leads are
 * the module's, and a literal in this file would go stale in silence.
 */
async function mailsFor(D, evs, ms = MAIL_WAIT_MS) {
  if (D.warnLeads === undefined) {
    D.warnLeads = await D.seats.founder.page.evaluate(() =>
      (window.CONSTITUTION && window.CONSTITUTION.WARN_LEADS)
        ? [...window.CONSTITUTION.WARN_LEADS] : null).catch(() => null);
  }
  const t0 = Date.now();
  for (;;) {
    const mails = (await devOutbox(BASE).catch(() => []))
      .filter((m) => String(m.subject || '').includes(D.title));
    const landed = evs.filter((e) => e.mail).every((e) =>
      mails.some((m) => e.mail.package.test(String(m.subject || ''))));
    if (landed || Date.now() - t0 > ms) return mails;
    await sleep(1500);
  }
}
/**
 * **A mail row is asserted against the outbox** (E22, Q1355, Ed 2026-09-14).
 * Its channel is mail and nothing else, so a rail-shaped assertion could only
 * ever report *no rule* — what the document owes is in `data/outbox.jsonl`,
 * which the dev outbox serves. Two halves, and the row is red on either.
 *  · **The mail.** Inside the audience a seat is owed every warning that fits
 *    inside the spell, then the package (SPEC §9.5a, R-097). The leads are
 *    the module's own and the spell is this table's `LAPSE_AFTER_MS`, so the
 *    count is derived rather than written down: at one minute none of the
 *    three (a week, a day, an hour) fits, and E22 here is the package alone.
 *    Outside the audience a seat must have been sent neither.
 *  · **The page.** A keyless row cannot assert an absent entry by looking for
 *    it, so what is asserted instead is that SURFACE still says there is
 *    nothing to look for: E22's Keys cell must stay empty. The day the page
 *    grows an entry for a lapse this goes red and somebody reads the row
 *    again, rather than half of it being asserted in silence.
 */
function assertMail(D, step, ev, row) {
  const cell = row.Audience;
  const pred = AUDIENCE[cell];
  if (!pred) {
    D.noRule.push({ hat: D.hat, step: step.id, event: ev.id, cell, why: 'no AUDIENCE entry for this cell' });
    say(`   ? ${ev.id} "${cell}" — no rule`); return;
  }
  const keys = keysOf(row.Keys);
  if (keys.length) {
    shape.push(`${ev.id} is asserted as mail-only and SURFACE's Keys cell now names ${keys.join(' ')} — read the row again`);
    say(`   ? ${ev.id} — SURFACE now gives it page keys (${keys.join(' ')}); the mail-only reading needs re-reading`);
  }
  if (D.warnLeads === null) {
    shape.push(`${ev.id}: the page answered with no WARN_LEADS, so the warnings owed could not be priced`);
    say(`   ? ${ev.id} — no WARN_LEADS off the page; what is owed cannot be priced`);
    return;
  }
  const leads = D.warnLeads.filter((l) => l < LAPSE_AFTER_MS);
  const warned = (m) => ev.mail.warning.test(String(m.subject || ''));
  const packed = (m) => ev.mail.package.test(String(m.subject || ''));
  const owed = leads.length + 1; // the warnings that fit, then the package
  const audience = [];
  for (const [name, s] of Object.entries(D.seats)) {
    if (!s.stood) continue;
    const inAud = !!pred({ ...s.def, name, left: !!s.left }, step, D, ev, null);
    if (inAud) audience.push(name);
    const got = (D.mails || []).filter((m) => m.to === s.email && (warned(m) || packed(m)));
    const want = inAud ? owed : 0;
    if (got.length === want && (!inAud || got.filter(packed).length === 1)) continue;
    const how = got.length ? got.map((m) => (packed(m) ? 'the package' : 'a warning')).join(' + ') : 'nothing';
    const line = `${ev.id} mail · ${D.hat}/${name} was sent ${how}, ${inAud ? 'inside' : 'outside'} the ` +
      `audience (${cell}) — ${want} owed (${leads.length} of ${D.warnLeads.length} warning lead(s) ` +
      `fit a ${LAPSE_AFTER_MS / 1000}s spell${inAud ? ', then the package' : ''})`;
    D.findings.push({ hat: D.hat, step: step.id, event: ev.id, key: null, seat: name,
      expected: inAud, carried: got.length > 0, rail: [], line });
    say('   ✗ ' + line);
  }
  // **A mail row can go vacuous too** (Q1356): an audience nobody is in makes
  // an outbox nobody is owed anything from, and every seat then agrees.
  if (!audience.length) {
    shape.push(`${ev.id} "${cell}" at ${step.id} (${D.hat}): no seat was inside the audience, so the row passed over nothing`);
    say(`   ? ${ev.id} — no seat inside the audience: a vacuous pass, not a pass`);
    return;
  }
  say(`   · ${ev.id} "${cell}" — mail asserted: ${leads.length} warning(s) fit the ` +
    `${LAPSE_AFTER_MS / 1000}s spell, then the package, to ${audience.join(', ')}` +
    `; the page files no entry, and SURFACE's Keys cell for it is still empty`);
}

/* ---- the assertion ----------------------------------------------------------- */
function assertStep(D, step, evs, snap) {
  for (const ev of evs) {
    // an event whose own step this hat skipped never happened on this
    // document: nothing was sent, so nobody is owed it and a seat that does
    // not carry it is right
    if (D.skipped.has(ev.at)) {
      say(`   · ${ev.id} ${ev.key ?? '(no key)'} — not asserted: ${STEPS[ev.at].id} did not run on the ${D.hat} hat`);
      continue;
    }
    const row = EVENT[ev.id];
    const cell = row ? row.Audience : null;
    if (!row) { D.noRule.push({ hat: D.hat, step: step.id, event: ev.id, cell: '(no such row)', why: 'SURFACE §2 has no ' + ev.id }); continue; }
    // **A row whose channel is mail is read off the outbox** (E22, Q1355):
    // it has no key by construction, so it must be taken before the keyless
    // branch below, which would report it as *no rule* for ever
    if (ev.mail) { assertMail(D, step, ev, row); continue; }
    if (ev.key === null) {
      const entry = { hat: D.hat, step: step.id, event: ev.id, cell, why: 'page side — ' + ev.noKey };
      if (ev.filed) {
        D.filed.push({ ...entry, q: ev.filed });
        say(`   · ${ev.id} "${cell}" — no key on the page, filed as ${ev.filed}`);
      } else {
        D.noRule.push(entry);
        say(`   ? ${ev.id} "${cell}" — no key on the page: ${ev.noKey}`);
      }
      continue;
    }
    const pred = AUDIENCE[cell];
    if (!pred) {
      D.noRule.push({ hat: D.hat, step: step.id, event: ev.id, cell, why: 'no AUDIENCE entry for this cell' });
      say(`   ? ${ev.id} "${cell}" — no rule`);
      continue;
    }
    // **A vacuous pass is not a pass** (Q1356, Ed 2026-09-14). A predicate no
    // seat satisfies agrees with a page that carries nothing, on every seat,
    // for ever — so the row reports itself green while asserting nothing at
    // all. E13 stood like that from the day it was keyed: the race it names
    // had already parked on one judgment, so no seat's view carried it as
    // askable and the audience was empty on both halves of the test. Counted
    // here rather than assumed, because whether a row is vacuous is a fact
    // about the run and not about the table.
    let inAudience = 0;
    for (const [name, s] of Object.entries(D.seats)) {
      if (!s.stood || !snap[name] || snap[name].unstood) continue;
      // `left` rides beside the def rather than on it: a seat the document
      // stopped seating (E40) is outside every *every member* cell from that
      // step on, and the `SEATS` row is shared with the other hat's document
      const seat = { ...s.def, name, left: !!s.left };
      // the seat's own snapshot rides fifth, for a cell whose rule reads the
      // seat's view (E13's *could still judge it*, Q1340)
      const inAud = !!pred(seat, step, D, ev, snap[name]);
      if (inAud) inAudience++;
      const rail = snap[name].rail.map((e) => e.key);
      const match = (k) => k === ev.key || (ev.key.endsWith(':') && k.startsWith(ev.key));
      // **An entry that wants nothing is not evidence of an ask** — SURFACE
      // §6's setup alphabet, read off its own *wants* column: `ask` wants an
      // answer, `news` an OK, `yours` a withdrawal; `wait` wants *nothing —
      // fill = how far the room has got*, and `done` wants nothing either.
      // The band half read it that way from the first run; the rail half
      // counted every state, and since the deck (E10's Channel column,
      // Q1348) an answered motion's entry does not leave — it files ⏳ and
      // becomes the ledger of your own answers. The mover answered at the put
      // (§9.6, R-021), so their entry is that ledger from the first moment,
      // and the seat the audience deliberately leaves out was reported for
      // carrying an ask nobody makes of it (2026-09-14, Q1282's first E10
      // cell). The **full** rail still rides the finding line, so the report
      // loses nothing.
      const wants = (e) => e.kind !== 'wait' && e.kind !== 'done';
      const asks = snap[name].rail.filter(wants).map((e) => e.key);
      const tabs = (snap[name].band || []).filter(wants).map((e) => e.key);
      const has = asks.some(match) || tabs.some(match);
      // `match`, not `includes`: a prefix key (`rel:`, `mail:`) is acknowledged
      // under its own batch id, so an exact test never sees the OK and a seat
      // that has answered reads as one that was never served.
      const okd = !!(snap[name].readout && (snap[name].readout.okd || []).some(match));
      const mv = (snap[name].view || {}).view || {};
      const signed = !!(ev.orSigned && mv.closed && mv.closed.mySignature);
      // **The removed member's own channel** (E40, Q1359): they are told by
      // the door and not by a rail entry — `strangerView` puts `departed` on
      // the view their page now gets, one sentence saying by whose act and
      // when. Read off the view rather than the DOM, because the rail they
      // have is the door's own and no key of theirs could ever match.
      const departed = !!(ev.orDeparted && (snap[name].view || {}).departed);
      // `inAud &&`: an exemption is a way of **satisfying** an audience, never
      // evidence of carrying. Read the other way it manufactures a finding on
      // the clerk hat, where the founder is outside *every member* and holds
      // no gate to be exempt about (2026-09-07, first run with `selfSet`).
      const self = inAud && !!(ev.selfSet && ev.selfSet(seat, step, D, ev));
      // **A gate stages behind the constitutional OKs** (SURFACE E4's
      // persistence column, W4; Q453c): a seat still owed a decision's OK is
      // shown no gate until it has given it, so the gate is *carried* in the
      // staged sense — the module says it is owed (`owedOks`), the page is
      // holding it back on purpose. Read off the module's own list, never the
      // rail: 2026-09-12's E4 cluster (Q1205) was eight cells of exactly this,
      // the `early` and `lapsed` seats owed 💤's OK at 🍾 on both hats.
      const stagedBehind = inAud && !!ev.staged && !has && !okd
        ? ((mv.owedOks || []).length ? mv.owedOks.slice() : null) : null;
      // **And a task waits behind the power its main action needs** (C9,
      // Q1328; Q1344, Ed 2026-09-11). E10's own Channel column says it in as
      // many words — *none of it, for a member, until they have acknowledged
      // 🏛️* — and E11 and E13 say the same of ⚖️: an offer you cannot take is
      // not shown, so a member inside the audience who has not yet taken the
      // power up is served nothing, on purpose. The same shape as the staging
      // above and read the same way, off a list rather than assumed — here the
      // seat's **own** acknowledgements (`readout.okd`, what `acked` asks), so
      // a seat that HAS taken the power up and still carries nothing is a
      // finding. That is what keeps the row asserting E10's audience rather
      // than C9's staging: the founder's seat acknowledged 🏛️ at `ok-voice`
      // and is held to the cell. Q1282's other two E10 cells were this
      // (2026-09-14): `late` with 🏛️ standing unanswered in its own rail, and
      // `lapsed` — revived by the read as R-096 says, so *active* and rightly
      // inside the audience — with 🏛️ not yet served at all, staged in its
      // turn behind three owed news OKs.
      const heldBack = inAud && ev.waitsOn && !has && !okd &&
        !((snap[name].readout || {}).okd || []).includes(ev.waitsOn) ? ev.waitsOn : null;
      const carries = has || okd || signed || departed || self || !!stagedBehind || !!heldBack;
      const how = asks.some(match) ? 'carries it'
        : has ? 'carries it as a tab (' + ((snap[name].band || []).find((e) => match(e.key)) || {}).kind + ')'
        : okd ? 'acknowledged it' : signed ? 'signed it'
        : departed ? "was told by the door's departure sentence"
        : self ? 'holds it by the seat-that-set-it exemption'
        : stagedBehind ? 'holds it staged behind ' + stagedBehind.join(', ')
        : heldBack ? 'waits behind the ' + heldBack + ' it has not taken up (C9)' : 'does not carry it';
      if (carries === inAud) continue;
      let module = '';
      if (ev.oracle) {
        const o = ORACLE[ev.oracle](snap[name].view, ev.key);
        module = o === null ? '' : o === inAud
          ? ` — the module ${inAud ? 'owes it too' : 'does not owe it either'}: a page finding`
          : ` — the module ${o ? 'owes it' : 'does not owe it'}, against the rule: a fold finding`;
      }
      const line = `${ev.id} ${ev.key} · ${D.hat}/${name} ${how}, ${inAud ? 'inside' : 'outside'} the audience (${cell})${module} · rail ${JSON.stringify(rail)}`;
      D.findings.push({ hat: D.hat, step: step.id, event: ev.id, key: ev.key, seat: name, expected: inAud, carried: carries, rail, line });
      say('   ✗ ' + line);
    }
    if (!inAudience) {
      shape.push(`${ev.id} "${cell}" at ${step.id} (${D.hat}): no seat was inside the audience, ` +
        `so the row passed over nothing`);
      say(`   ? ${ev.id} ${ev.key} — no seat inside the audience: a vacuous pass, not a pass`);
    }
  }
}

/* ---- --baseline: rail differences per seat per step, and nothing more -------- */
async function diffAgainst(file, now) {
  let then;
  try { then = JSON.parse(await readFile(file, 'utf8')); } catch (e) { say('baseline   · unreadable: ' + String(e && e.message)); return; }
  let diffs = 0;
  for (const doc of now.documents) {
    const old = (then.documents || []).find((d) => d.hat === doc.hat);
    if (!old) { say(`baseline   · no ${doc.hat} document in ${file}`); continue; }
    for (const st of doc.steps) {
      const ost = old.steps.find((x) => x.id === st.id);
      if (!ost) { say(`baseline   · ${doc.hat}/${st.id}: not in the baseline`); diffs++; continue; }
      for (const [seat, snap] of Object.entries(st.seats)) {
        const a = ((ost.seats || {})[seat] || {}).rail || [];
        const b = snap.rail || [];
        const ak = new Map(a.map((e) => [e.key, e.kind])); const bk = new Map(b.map((e) => [e.key, e.kind]));
        const added = [...bk.keys()].filter((k) => !ak.has(k));
        const gone = [...ak.keys()].filter((k) => !bk.has(k));
        const kind = [...bk.keys()].filter((k) => ak.has(k) && ak.get(k) !== bk.get(k)).map((k) => `${k} ${ak.get(k)}→${bk.get(k)}`);
        if (added.length || gone.length || kind.length) {
          diffs++;
          say(`baseline   · ${doc.hat}/${st.id}/${seat}: ` + [added.length ? 'added ' + added.join(',') : '',
            gone.length ? 'gone ' + gone.join(',') : '', kind.length ? 'kind ' + kind.join(',') : ''].filter(Boolean).join(' · '));
        }
      }
    }
  }
  say('baseline   · ' + (diffs ? diffs + ' rail difference(s) against ' + file : 'no rail differences against ' + file));
}

/* ---- the run, last: everything above is a const, and a top-level await
   before it would meet the temporal dead zone ------------------------------ */
/* ---- the run ------------------------------------------------------------ */
const health = await assertServerBuild(BASE, 'seat-matrix');
say(`seat-matrix against ${BASE} · build ${health.build ?? 'unreported'} · hat=${HAT}` +
  (TO ? ` · to=${TO}` : ''));
say(`tables     · SURFACE §2 events ${EVENTS.length} rows · seats ${SEATS.length} · steps ${STEPS.length}` +
  ` · audience cells ${Object.keys(AUDIENCE).length} · 🍾 hold ${BEGIN_HOLD_MS}ms`);
// **A shape change is a no-rule, not a remark.** SURFACE §2 growing or losing
// a row means there are events this table does not cover, which is the same
// condition as an unread audience cell — so it goes to the same exit code
// rather than printing a ✗ into a run that then reports itself green.
// **40 since 2026-09-14**: three rows arrived in one day — E38 (Q170), *a proposal of yours was stranded
// by a text change*; E39 (Q386), *a member proposes returning a laid-down power*;
// E40 (Q901), *a member is removed by a carried motion* — the same day exit 3
// stopped being forgiven, and
// the run that caught it was the first in which the row count could be seen,
// because until Q1354 CI translated the 3 this line raises into a 0. The
// count is a **shape** tripwire, not a coverage guarantee: it says a row
// moved under the table, and somebody then decides whether the table should
// grow a step for it. **Ed decided, the same day** (Q1359): all three, and
// they have steps — `strand-propose` + `strand-pen`, `return-motion` and
// `carry-removal`. What each of them had to buy first is at its own row: the
// pen kept on the Text at 🍾, a `reserve` behind `lay-down`, and a carry that
// takes a seat out of the document and so has to stand last in its epoch.
if (EVENTS.length !== 40) {
  shape.push(`SURFACE §2 has ${EVENTS.length} event rows, not the 40 this table was written against`);
}
for (const s of shape) say('  ? ' + s);

const browser = await chromium.launch();
const runs = [];
const HATS = HAT === 'both' ? ['member', 'clerk'] : [HAT];
for (const hat of HATS) runs.push(await runDocument(hat));
await browser.close();

/* ---- the report --------------------------------------------------------- */
const findings = runs.flatMap((r) => r.findings);
const noRule = runs.flatMap((r) => r.noRule);
const filed = runs.flatMap((r) => r.filed);
const errors = runs.flatMap((r) => r.errors);
const refused = runs.flatMap((r) => r.refused);
const unstood = runs.flatMap((r) => r.unstood);
say('');
if (findings.length) {
  say(`findings   · ${findings.length}`);
  for (const f of findings) say('  ✗ ' + f.line);
} else say('findings   · none');
if (filed.length) {
  say(`filed      · ${filed.length} — filed, red no longer`);
  for (const n of filed) say(`  · ${n.hat} · ${n.event} "${n.cell}" at step ${n.step} — ${n.q}`);
}
if (noRule.length) {
  say(`no rule    · ${noRule.length} — SURFACE states an audience the harness cannot read; file it`);
  for (const n of noRule) say(`  ? ${n.hat} · ${n.event} "${n.cell}" at step ${n.step}` + (n.why ? ` — ${n.why}` : ''));
}
for (const s of shape) say('shape      · ? ' + s);
if (unstood.length) { say('unstood    · ' + unstood.length); for (const u of unstood) say('  ✗ ' + u); }
say('errors     · ' + (errors.length ? errors.slice(0, 6).join(' / ') : 'none'));
say('refused    · ' + (refused.length ? refused.slice(0, 6).join(' / ') : 'none'));

const payload = {
  base: BASE, build: health.build ?? null, hat: HAT, to: TO,
  seats: SEATS, epochs: EPOCHS,
  documents: runs.map((r) => ({ hat: r.hat, slug: '<slug>', steps: r.steps })),
  findings, noRule, filed, shape, unstood, errors, refused,
};
await writeFile(OUT, JSON.stringify(payload, null, 1));
say('written    · ' + OUT);
if (BASELINE !== null) await diffAgainst(BASELINE, payload);

const red = findings.length || errors.length || refused.length || unstood.length;
const code = red ? 1 : (noRule.length || shape.length) ? 3 : 0;
say(`\nseat-matrix: findings=${findings.length} noRule=${noRule.length} filed=${filed.length}` +
  ` shape=${shape.length}` +
  ` errors=${errors.length} refused=${refused.length} unstood=${unstood.length} exit=${code}`);
process.exit(code);
