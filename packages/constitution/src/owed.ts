/**
 * What a member is owed, and the OK that answers it: the acknowledgement
 * family (SPEC §9.6a; SURFACE C8, E5, E9, E34, E35), out of session.ts since
 * Q1352 (q), 2026-09-14. Five kinds of news, one posture each way — an
 * *owing* walks the room and emits one event per person it is addressed to,
 * an *OK* refuses nothing it can simply ignore — and the fold in session.ts
 * is what turns those events into `okOwed`, `releasesOwed`,
 * `amendmentsOwed`, `mailGaveUpOwed` and `departuresOwed` on each member's
 * record.
 *
 * Every function here reads the session through `OwedState`, a view of
 * exactly the fields this family needs and nothing else, and writes only by
 * `emit`. The batch ids are minted from counters the fold moves
 * (`nextReleaseN`, `nextMailGiveUpN`), never here: a batch id minted in the
 * command would replay differently from the session that wrote it.
 */

import type { ConstitutionEvent, MemberId, MemberRecord, Power, PowerKey } from './types.js';
import type { People, PersonId } from './people.js';
import type { SettingId } from './catalogue.js';

/** The session as the acknowledgements see it, taken at the call. A snapshot
 *  is enough because every function here reads its counters before it emits;
 *  the fold moves them under the emit, and nothing below reads them after. */
export interface OwedState {
  readonly members: ReadonlyMap<MemberId, MemberRecord>;
  readonly convenorId: MemberId;
  readonly people: People;
  readonly closed: boolean;
  readonly lastReleaseT: number | null;
  readonly lastReleaseBatch: string | null;
  readonly nextReleaseN: number;
  readonly nextMailGiveUpN: number;
  emit(event: ConstitutionEvent): void;
  requireOpen(what: string): void;
}

/**
 * The narrower view a departure's owing needs: the membership and `emit`, and
 * nothing else. It is its own interface because the owing has **two callers on
 * two hosts** — `remove` and `resign` on the session, and the carried 🥾
 * motion's arm inside `motions.ts`, whose `MotionHost` is a live view rather
 * than a snapshot — and a rule about who is told must be written once whatever
 * it is called through. `OwedState` and `MotionHost` both satisfy it.
 */
export interface DepartureAudience {
  readonly members: ReadonlyMap<MemberId, MemberRecord>;
  emit(event: ConstitutionEvent): void;
}

/**
 * **A lapsed member is owed it too** (Q530, Ed 2026-08-22). E excludes the
 * lapsed, and for every other purpose that is right: they are out of the
 * quorum base and out of the electorate, because those are about who is
 * deciding. An acknowledgement is not a decision — it is a thing owed to
 * somebody about a document they are **still a member of**. Lapse is a
 * stall with an alarm rather than a departure (§9.5a): revival is just
 * logging in, and their cast judgments keep counting. So the person who
 * was living under the old rule and went quiet is exactly the one a change
 * ought to find, and owing it now is how they meet it on the way back in.
 *
 * The two exclusions that stay are the two that mean something. A
 * **removed** member is gone. Somebody who has **not arrived** never knew
 * the old rule, so the change is not news to them — it is simply what the
 * document says, which they will read like anybody arriving.
 */
export function oweOks(s: OwedState, t: number, setting: SettingId): void {
  for (const m of s.members.values()) {
    if (m.arrivedAtT === null || m.removed) continue;
    if (m.id === s.convenorId) continue; // the convenor had their say
    if (m.okOwed.has(setting)) continue;
    s.emit({ type: 'ok-owed', t, member: m.id, settings: [setting] });
  }
}

/**
 * **Everything one act lays down is one news entry and one OK** (Ed,
 * 2026-08-27, entry 162; Q1013, extending R-044). SPEC §9.7 rule 3 has said
 * since R-044 that laying a power down is news; what entry 162 adds is the
 * batching, because 158 gives 🍾 a table of zone switches and one press can
 * lay down about thirty-four powers — thirty-four separate acknowledgements
 * landing in every rail at the moment the document opens is the flood that
 * makes members stop reading acknowledgements at all.
 *
 * **The audience rule is `oweOks`'s**, one function up: every member,
 * skipping the un-arrived, the removed and the convenor. The convenor is
 * skipped for `oweOks`'s stated reason and for a stronger one here — the
 * founder is the *actor*, and E9's other half, *the actor*, is already served
 * by the power card's own confirmation. That is Q918's reading (b) on the
 * cell and (c) on the audience; **this does not settle Q918**, and it is one
 * predicate to reverse if Ed rules otherwise. The one skip of `oweOks` with
 * no analogue here is `okOwed.has(setting)`: every batch carries a fresh id,
 * so there is nothing to be already owed — the omission is deliberate, not an
 * oversight.
 *
 * **A release joins an open batch rather than always opening one**: Ed's
 * rule is that releases sharing one event, or one `t` and one actor, are one
 * group, and `relinquish` admits only the convenor as actor, so the actor
 * half needs no field. On a **solo document** the loop emits nothing — the
 * founder is the only member and is the actor — and then nothing is
 * recomputed either, `lastReleaseT` included, since all three fields move in
 * the fold. A later release therefore opens a fresh batch, which is right: a
 * call that told nobody anything has no group for anything to join
 * (the shape of Q835 — the page assumed a room bigger than one).
 */
export function oweReleases(s: OwedState, t: number,
  releases: Array<{ setting: PowerKey; power: Power }>): void {
  if (releases.length === 0) return;
  const batch = s.lastReleaseT === t && s.lastReleaseBatch !== null
    ? s.lastReleaseBatch : `rel-${s.nextReleaseN}`;
  for (const m of s.members.values()) {
    if (m.arrivedAtT === null || m.removed) continue;
    if (m.id === s.convenorId) continue; // the founder is the actor
    s.emit({ type: 'release-owed', t, batch, member: m.id, releases });
  }
}

/**
 * The OK on a release batch (entry 162) — `giveOk`'s posture exactly: it
 * refuses nothing it can simply ignore, so a batch that is not owed to this
 * member returns silently rather than throwing at a page that was a poll
 * behind.
 */
export function ackRelease(s: OwedState, t: number, member: MemberId, batch: string): void {
  s.requireOpen('acknowledging');
  const m = s.members.get(member);
  if (!m) throw new Error(`unknown member '${member}'`);
  if (!m.releasesOwed.has(batch)) return;
  s.emit({ type: 'release-ok', t, batch, member });
}

/**
 * **A text amendment is news beside the clause it changed** (Ed, 2026-08-29,
 * decision D47, answering Q1021; SURFACE E35, R-058). `oweReleases`' other
 * sibling, and **the audience rule is `oweOks`'s** exactly: every member,
 * skipping the un-arrived, the removed and the convenor, who is the actor.
 *
 * **Two differences from `oweReleases`, and both are the ruling.** There is
 * **no batching and no join of an open group**: entry 162 groups because one
 * press of 🍾 lays down thirty-four powers that belong to no clause, where
 * here the card *is* the clause — so two amendments at two places are two
 * cards, and collapsing them is precisely what the ruling reverses. And
 * there is **no skip for something already owed**: every amendment carries
 * its own candidate id, so there is nothing to be already owed — the same
 * deliberate omission `oweReleases` records for its batch ids.
 *
 * **Why it is called from `recordTextAmendment` and not from the fold.**
 * `replay` calls `apply` directly and `emit` pushes to the log, so an owing
 * performed in a fold appends events to every session that replays that
 * log — the log growing every time it is read. That is entry 162's rule and
 * this is it kept; the reading it replaces (📄's own key through `oweOks`)
 * had the call in the `text-amended` fold and so had the bug.
 */
export function oweAmendment(s: OwedState, t: number, candidate: string): void {
  for (const m of s.members.values()) {
    if (m.arrivedAtT === null || m.removed) continue;
    if (m.id === s.convenorId) continue; // the Founder is the actor
    s.emit({ type: 'amendment-owed', t, candidate, member: m.id });
  }
}

/**
 * The OK on one text amendment (SURFACE E35) — `ackRelease`'s posture
 * exactly: an amendment this member is not owed returns silently rather than
 * throwing at a page that was a poll behind.
 */
export function ackAmendment(s: OwedState, t: number, member: MemberId, candidate: string): void {
  s.requireOpen('acknowledging');
  const m = s.members.get(member);
  if (!m) throw new Error(`unknown member '${member}'`);
  if (!m.amendmentsOwed.has(candidate)) return;
  s.emit({ type: 'amendment-ok', t, candidate, member });
}

/**
 * **A mail that gave up is told** (SURFACE E34, Q947 (c), backlog 173).
 * `oweReleases`' sibling: the outbox hands over the whole of one sender
 * pass's give-ups at once, and one pass is the act — entry 162's rule is
 * that the boundary of the group is the act, so a pass that killed three
 * mails is one batch, one card and one OK.
 *
 * **Two differences from `oweReleases`, both deliberate.** The convenor is
 * *not* skipped: there they are the actor, and here nobody in the room is —
 * E34's audience is *the founder; every member*. And where the audience is
 * empty the event is still emitted once with `member: null`, because the
 * addresses are a fact about the register that the founder's ✉️ row reads
 * whether or not there was anybody to tell.
 *
 * The unarrived skip stays exactly as it is, and it is the whole of E34's
 * **never the invitee**: an invitee has `arrivedAtT === null` by definition,
 * and they are precisely the person the mail could not reach.
 *
 * **A give-up after the close owes nobody.** The closing notices are mailed
 * from the close itself, so this is the one owing in the file that can be
 * raised on a shut document — and every acknowledgement in the file
 * (`giveOk`, `ackRelease`, `ackMailGaveUp`) refuses one, so a card owed here
 * would sit in the rail for ever behind an OK that throws. The batch is
 * still recorded: it falls through to the told-nobody arm, which is exactly
 * the shape for *the addresses are a fact, and there is nobody to tell*.
 *
 * The addresses are de-duplicated: one pass may kill two mails to the same
 * person (two invitations, or an invitation and a lapse warning), and the
 * card lists what it is given.
 */
export function mailGaveUp(s: OwedState, t: number, addresses: readonly string[]): void {
  if (addresses.length === 0) return;
  // each dead address to the person holding it (decision 1253); one whose
  // row nobody holds — erased since the mail was queued, or never a person
  // of this document — is nobody's news and is dropped here
  const list: PersonId[] = [];
  for (const a of addresses) {
    const person = s.people.byEmail(a);
    if (person !== null && !list.includes(person)) list.push(person);
  }
  if (list.length === 0) return;
  const batch = `mgu-${s.nextMailGiveUpN}`;
  let told = false;
  for (const m of s.closed ? [] : [...s.members.values()]) {
    if (m.arrivedAtT === null || m.removed) continue;
    told = true;
    s.emit({ type: 'mail-gave-up', t, batch, member: m.id, people: list });
  }
  if (!told) s.emit({ type: 'mail-gave-up', t, batch, member: null, people: list });
}

/** The OK on one pass's dead mail — `ackRelease`'s posture exactly: a batch
 *  this member is not owed returns silently rather than throwing at a page
 *  that was a poll behind. */
export function ackMailGaveUp(s: OwedState, t: number, member: MemberId, batch: string): void {
  s.requireOpen('acknowledging');
  const m = s.members.get(member);
  if (!m) throw new Error(`unknown member '${member}'`);
  if (!m.mailGaveUpOwed.has(batch)) return;
  s.emit({ type: 'mail-gave-up-ok', t, batch, member });
}

/**
 * **Every departure is news owed an OK** (Ed, 2026-09-14, Q901; SURFACE E31,
 * E32, E40). Exiled by ❌'s ✒️, removed by a carried 🥾 motion, or resigned:
 * one rule over all three, because what a member is told is *that somebody
 * left*, and by whose act — never which of the three routes the mechanism
 * took. `oweAmendment`'s shape exactly: one event per member told, nothing
 * batched and nothing minted.
 *
 * **The audience is `oweOks`'s minus one exclusion and plus one.** The
 * un-arrived are skipped for `oweOks`'s stated reason — somebody who never met
 * the membership is not being told it changed — and the removed with them,
 * which is what keeps the departing member out of their own news; the
 * departing person keeps what E31 and E32 already give them, the mail and the
 * door's own sentence. The lapsed are inside it, as they are for every owing
 * in this file.
 *
 * **The actor is skipped, as `oweReleases` and `oweAmendment` skip the
 * convenor** (Ed, 2026-09-14, Q1358, reversing the first build's reading of
 * his Q901 ruling): the card is the room being told of an act, and the one
 * who did the act is not told of it. Only ❌ has a single actor — the
 * convenor, passed as `actor`; a carried 🥾 motion is the room's act and a
 * resignation the departing member's, so those callers pass none and the
 * departed's own skip below is the whole exclusion.
 *
 * A departure is one act about one member and a member id departs once — a
 * returning person is invited afresh under a new id — so `departed` is a key
 * that cannot collide, and the already-owed skip is the same guard `oweOks`
 * carries rather than the deliberate omission the batch ids make of it.
 */
export function oweDeparture(s: DepartureAudience, t: number, departed: MemberId,
  actor: MemberId | null = null): void {
  for (const m of s.members.values()) {
    if (m.id === actor) continue; // the one who did it is not told of it (Q1358)
    // the departed member's own record is `removed` by the time this is
    // called — the fold runs under `emit` — so this skip is theirs too
    if (m.arrivedAtT === null || m.removed) continue;
    if (m.departuresOwed.has(departed)) continue;
    s.emit({ type: 'departure-owed', t, member: m.id, departed });
  }
}

/**
 * The OK on one departure (SURFACE E31, E32, E40) — `ackRelease`'s posture
 * exactly: a departure this member is not owed returns silently rather than
 * throwing at a page that was a poll behind.
 */
export function ackDeparture(s: OwedState, t: number, member: MemberId,
  departed: MemberId): void {
  s.requireOpen('acknowledging');
  const m = s.members.get(member);
  if (!m) throw new Error(`unknown member '${member}'`);
  if (!m.departuresOwed.has(departed)) return;
  s.emit({ type: 'departure-ok', t, member, departed });
}

/**
 * 📨 — put the invitation back in the queue (SURFACE E34). Only an invitee
 * can be re-sent to: somebody who has arrived has the document, and somebody
 * who is gone is not being invited to anything. The re-send is an ordinary
 * queued mail from there on, and if it gives up too a fresh batch is raised.
 */
export function resendInvite(s: OwedState, t: number, member: MemberId, by: MemberId): void {
  s.requireOpen('re-sending an invitation');
  const m = s.members.get(member);
  if (!m || m.removed) throw new Error(`unknown member '${member}'`);
  if (m.arrivedAtT !== null) throw new Error('they are already here — there is nothing to re-send');
  s.emit({ type: 'mail-resent', t, member, by });
}
