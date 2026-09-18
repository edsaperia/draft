/**
 * Motions (SPEC §9.6–§9.7): the one act by which a settled document changes
 * its own rules, out of session.ts since Q1352 (r), 2026-09-14. The two
 * routes and the pen, the twin refusal and the one-🏛️-out rule, the crown
 * question at either end, the settle check, and the follow-ons a carried or
 * held motion has on the roster and on its rivals. The route is a fact about
 * the setting, never a choice of the mover's.
 *
 * Everything here reads the session through `MotionHost` and writes only by
 * `emit` and by the host's own arms. **The host is a live view, not a
 * snapshot** — the one difference from `owed.ts`, and the reason is the
 * settle loop: `maybeSettleMotions` mints `cq-${nextCrownN}` inside a loop
 * whose previous turn emitted, `settleCarriedEffects` mints `m-${nextMemberN}`
 * after arms that may have emitted a membership event, and `crownSeatVacated`
 * walks the questions calling back in. A counter read from a snapshot would
 * mint the same id twice and the log would not replay.
 */

import type { ConstitutionEvent, CrownQuestionRecord, MemberId, MemberRecord,
  MotionAnswer, MotionId, MotionPayload, MotionRecord, PowerKey, SettingState } from './types.js';
import type { People, PersonId } from './people.js';
import type { MotionRoute, SettingId } from './catalogue.js';
import { CATALOGUE, entryOf, motionRouteOf, validateFor } from './catalogue.js';
import type { Price } from './values.js';
import { eqValue } from './values.js';
import { inE, motionElectorateOf } from './populations.js';
// the departure owing (Q901): one rule over all three routes out, so the
// carried 🥾 motion's arm calls the same function `remove` and `resign` do.
// `MotionHost` satisfies `DepartureAudience` by its `members` and `emit`.
import { oweDeparture, oweHeld } from './owed.js';

/** The settings whose change is the ask-everyone route (SPEC §9.6's test).
 *  Read by the fold's owing as well as by the carry's, so it lives beside
 *  the routes rather than inside either reader. */
export const CONSTITUTIONAL: ReadonlySet<SettingId> = new Set(
  CATALOGUE.filter((e) => e.kind === 'constitutional').map((e) => e.id),
);

/**
 * What `openMotion` is handed. Two differences from `MotionPayload`. The
 * invitation: the caller names an **address**, and the session turns it into
 * the person row the event carries (decision 1253) — the email must never
 * reach the log, and the caller has no business minting person ids. And
 * `text` is not here at all (Q1433): it is the fold's own record of a pen
 * amendment (§9.7 rule 8, R-058), written into the record by `text-amended`
 * rather than opened, so nothing puts one.
 */
export type MotionInput =
  | Exclude<MotionPayload, { kind: 'invite' } | { kind: 'text' }>
  | { kind: 'invite'; email: string };

/**
 * **The five payloads anybody puts** (Q1433), and the refusal for everything
 * else. `MotionPayload`'s sixth kind, `text`, is the fold's record of the
 * Founder's pen amendment and reaches `openMotion` by no road inside this
 * package — so a `text` payload arriving here came off the wire, where it
 * used to fall through the last `else` below and be opened as an
 * **admission**: priced at 🪪, routed, and carried toward a `member-admitted`
 * for an applicant that does not exist. The same `else` took any unknown kind
 * and any payload that is not a shape at all.
 *
 * Asked here rather than in the server's command whitelist because this is
 * the only door every caller comes through — the sim harness, the fixture and
 * a replay-free test as well as the wire.
 */
const PUT: ReadonlySet<string> = new Set(['set', 'reserve', 'invite', 'remove', 'admit']);
const notPut = (kind: unknown): Error =>
  new Error(`'${String(kind)}' is not a motion anybody puts (§9.6)`);

/**
 * The session as the motions see it. Every field is read at the moment it is
 * used — the host the session hands in is getters over its own fold state —
 * and every write goes through `emit` or through one of the arms below, which
 * are the session's own machinery a motion reaches into: the roster's
 * follow-ons, the lapse re-read, the person rows.
 */
export interface MotionHost {
  readonly constitutedT: number | null;
  readonly members: ReadonlyMap<MemberId, MemberRecord>;
  readonly motions: ReadonlyMap<MotionId, MotionRecord>;
  readonly crownQuestions: ReadonlyMap<string, CrownQuestionRecord>;
  readonly settings: ReadonlyMap<PowerKey, SettingState>;
  readonly people: People;
  readonly crownLapsed: boolean;
  readonly nextMotionN: number;
  readonly nextCrownN: number;
  readonly nextMemberN: number;
  emit(event: ConstitutionEvent): void;
  requireOpen(what: string): void;
  /** What an act on the membership costs, as the document stands. */
  priceOf(id: 'admission' | 'removal'): Price;
  /** Does this motion's target sit behind the crown's assent (§9.7)? */
  reservedTarget(rec: MotionRecord): boolean;
  requireEmailFree(email: string): void;
  /** **Is this person on the membership now?** — `requireEmailFree`'s own
   *  question, which a carry has to ask again (issue #6, F2): a motion is a
   *  permission that lands later, and the address it names can be seated by
   *  another road while it runs. An invitee counts: the seat is theirs. */
  personSeated(person: PersonId): boolean;
  /** The person an application is by, for the question above (issue #6, F2). */
  personOfApplicant(applicant: string): PersonId | null;
  personFor(email: string): PersonId;
  convenorSeatVacant(): boolean;
  afterRosterChange(t: number, cause: 'arrival' | 'departure', member: MemberId): void;
  rereadLapse(t: number): void;
  /** What the applicant answered at the door, for the `member-admitted` a
   *  carried admission emits (Q1405): the session's own reader, so the
   *  motion route and the pen route write the same flags. */
  answeredAtDoor(applicant: string): { nameSet?: true; pictureSet?: true };
}

/**
 * **The route a membership motion takes is the price it is put at** (entry
 * 94): 🪪's for the two ways in, 🥾's for the way out. The three arms of
 * `openMotion` below read it, and so does `EngineBridge.openMotion`, which
 * has to know whether the mover owes a stake **before** the module accepts
 * the act (issue #26) — an ordinary route is a race, and a race costs one ✏️
 * (§7, §3.3a). One function rather than the same conditional in two files,
 * because the two disagreeing is exactly the bug: a press the door lets
 * through on one reading and the bridge cannot stake on the other.
 *
 * `pen` is not decided here. At 🪪 ✒️ nobody proposes at all — the invite
 * command admits outright — so the arm below refuses the motion before it
 * asks for a route, and an application at that price is never a motion.
 */
export function membershipRouteOf(price: Price,
  kind: 'invite' | 'admit' | 'remove'): MotionRoute {
  // `assembly` and `consent` are both consent on the way out; the difference
  // lives in the settle check, not the route (Q401, Ed 2026-08-19)
  if (kind === 'remove') return price === 'proposal' ? 'ordinary' : 'constitutional';
  return price === 'assembly' ? 'constitutional' : 'ordinary';
}

export function openMotion(s: MotionHost, t: number, by: MemberId,
  input: MotionInput, why?: string): MotionId {
  // the shape before the state (Q1433): a payload nothing puts is refused
  // whatever the document is doing, and this is also what keeps the reads
  // below off a payload that is not an object
  const asked: unknown = (input as { kind?: unknown } | null)?.kind;
  if (typeof asked !== 'string' || !PUT.has(asked)) throw notPut(asked);
  s.requireOpen('a motion');
  if (s.constitutedT === null) {
    throw new Error('before the start nothing is amended — only set (§9.6a)');
  }
  const mover = s.members.get(by);
  if (!mover || !inE(mover)) throw new Error(`'${by}' is not an arrived member`);
  let route: MotionRoute;
  // the invitation's address becomes a person row, and only the row's id
  // rides the motion (decision 1253); every other payload is what it was.
  // **The row itself is written once nothing can refuse the motion** (Q1436):
  // it used to be written here, above the refusals that follow — 🪪 at ✒️,
  // the twin rule, the one-🏛️-out rule — so a refused press stored an
  // address nobody had invited and no event named. `personFor` writes
  // nothing: it answers the row already holding the address, or the id the
  // next row would take, which is why the id can be settled here and the row
  // left until the emit.
  let payload: MotionPayload;
  let row: { person: PersonId; email: string } | null = null;
  if (input.kind === 'invite') {
    s.requireEmailFree(input.email);
    const person = s.personFor(input.email);
    row = { person, email: input.email };
    payload = { kind: 'invite', person };
  } else payload = input;
  if (payload.kind === 'set') {
    const entry = entryOf(payload.setting);
    if (entry.kind === 'personal') throw new Error(`${payload.setting} is yours alone (§9.0c)`);
    if (payload.setting === 'startingText' || !s.settings.has(payload.setting)) {
      throw new Error(`'${payload.setting}' is not moved this way`);
    }
    const st = s.settings.get(payload.setting)!;
    if (st.value === null) throw new Error(`'${payload.setting}' has no settled value to move against`);
    const err = validateFor(entry, payload.value);
    if (err) throw new Error(err);
    if (eqValue(payload.value, st.value)) {
      throw new Error('the motion proposes what already stands');
    }
    route = motionRouteOf(entry, payload.value, st.value);
  } else if (payload.kind === 'reserve') {
    const re = entryOf(payload.setting);
    if (re.kind === 'personal') {
      throw new Error(`'${payload.setting}' is never held, so it cannot be reserved (§9.7)`);
    }
    if (payload.setting === 'admission') {
      throw new Error("the register's crown is the applications setting's -- reserve that (§9.7½)");
    }
    const rst = s.settings.get(payload.setting)!;
    const want = payload.power ?? 'both';
    const already = want === 'both'
      ? rst.powers.unilateral && rst.powers.assent
      : rst.powers[want];
    if (already) {
      throw new Error(`'${payload.setting}' — ${want === 'both' ? 'both powers are' : `the ${want} power is`} already the convenor's`);
    }
    route = 'constitutional'; // returning a decision to one hand needs everyone (§9.7 v0.52)
  } else if (payload.kind === 'invite') {
    // The route is 🪪's price (entry 94): at `pen` nobody proposes — the
    // invite command admits outright — so a motion here is a mistake.
    const price = s.priceOf('admission');
    if (price === 'pen') throw new Error('admission is at ✒️ — invite directly, nothing to propose (§9.7½)');
    route = membershipRouteOf(price, 'invite');
  } else if (payload.kind === 'remove') {
    const target = s.members.get(payload.member);
    if (!target || !inE(target)) throw new Error(`'${payload.member}' is not a member`);
    route = membershipRouteOf(s.priceOf('removal'), 'remove');
  } else if (payload.kind === 'admit') {
    route = membershipRouteOf(s.priceOf('admission'), 'admit');
  } else {
    // unreachable through `PUT` above — `payload` is `never` here, which is
    // the compiler agreeing — and stated rather than assumed: a seventh kind
    // added to `MotionPayload` and to `PUT` must not become an admission by
    // falling off the end of this chain (Q1433)
    throw notPut((payload as MotionPayload).kind);
  }
  // **An identical motion is refused on either route** (Ed, 2026-09-12,
  // Q1348; SPEC §9.6, R-103): the same payload already running is one
  // motion, and the mover is pointed at it to answer. moon2 held
  // twenty-six 🏛️ motions on 💤, each the same fortnight, because the
  // only refusal here was *what already stands*.
  const twin = runningTwin(s, payload);
  if (twin !== null) {
    // the sentence a member reads carries no id (STYLE T1, Q1370): the page
    // already stands on the twin's own card, which is where they answer it
    throw new Error('already put — the same has already been proposed; answer it instead (§9.6)');
  }
  if (route === 'constitutional' && heldOutBy(s, by)) {
    throw new Error('one 🏛️ out per member at a time (§9.6)');
  }
  const id = `mo-${s.nextMotionN}`;
  // the row before the event that names it, and after every refusal (Q1436):
  // the fold's `notePerson` counts the id off this same event, so the write
  // and the count still happen in one act
  if (row !== null) s.people.set(row.person, { email: row.email });
  const e: ConstitutionEvent = { type: 'motion-opened', t, motion: id, by,
    payload, route, stake: route === 'ordinary' ? 1 : 0 };
  if (why !== undefined && why !== '') (e as { why?: string }).why = why;
  s.emit(e);
  if (route === 'constitutional') {
    // The mover's answer is accept from the moment the motion is put
    // (§9.6 v0.49): proposers prefer their own proposals, as §3.3 counts
    // an author's preference for their own candidate without asking.
    s.emit({ type: 'motion-answer', t, motion: id, member: by, answer: 'accept' });
    maybeSettleMotions(s, t);
  }
  return id;
}

export function answerMotion(s: MotionHost, t: number, member: MemberId,
  motion: MotionId, answer: MotionAnswer): void {
  s.requireOpen('answering a motion');
  const rec = s.motions.get(motion);
  if (!rec || rec.status !== 'running') throw new Error('the motion is not running');
  if (rec.route !== 'constitutional') {
    throw new Error('an ordinary motion is judged as a race, not answered (§9.6)');
  }
  const m = s.members.get(member);
  if (!m || !motionElectorateOf([m]).length) {
    throw new Error(`'${member}' is not in the motion's electorate`);
  }
  if (motionExcludes(s, rec) === member) {
    throw new Error('the subject of a removal is not asked on this route (🥾 Q401a) — they see it, and it settles without them');
  }
  s.emit({ type: 'motion-answer', t, motion, member, answer });
  maybeSettleMotions(s, t);
}

export function withdrawMotion(s: MotionHost, t: number, member: MemberId,
  motion: MotionId): void {
  s.requireOpen('withdrawing');
  const rec = s.motions.get(motion);
  if (!rec || rec.status !== 'running') throw new Error('the motion is not running');
  if (rec.by !== member) throw new Error('only the mover withdraws a motion');
  s.emit({ type: 'motion-withdrawn', t, motion });
}

/**
 * **The host's own withdrawal** (issue #26): an ordinary motion the host
 * could not put into a race — the mover's wallet is empty, the candidate is a
 * duplicate, the race has closed — is withdrawn rather than left standing
 * with nothing racing behind it. `openSetMotion` has compensated this way
 * since review #1's finding 6a; what is new is that the two **membership**
 * races enter inside `EngineBridge.sync`, where a throw is not a refusal
 * anybody reads but a document that stops answering, so the compensation
 * cannot be the caller's to make.
 *
 * It is not `withdrawMotion` with the mover filled in, for two reasons. An
 * **admission has no mover** — `by` is null, the application being the
 * applicant's own proposal (§9.7½) — and there is therefore nobody whose
 * withdrawal it could be. And it must **never throw**: it runs on the path
 * that was already failing, so a second refusal here would be the wedge over
 * again. A motion that is not running is silently nothing, `ackRelease`'s
 * posture. The event is the same `motion-withdrawn` the log already carries,
 * so a replay reaches this state with no bridge at all (§3.3a: the stake, if
 * one was ever taken, comes back whole).
 *
 * **And the mover is told** (Q1447): this is the one withdrawal that is a
 * failure — they pressed, the wallet was empty or the race would not take the
 * candidate, and without the card the press simply vanishes. `withdrawMotion`
 * above owes nothing, because letting go of your own proposal is not news to
 * you. The owing is emitted after the withdrawal for `settleHeldEffects`'
 * reason, and `oweHeld` never throws, which is this function's own rule kept.
 */
export function abandonMotion(s: MotionHost, t: number, motion: MotionId): void {
  const rec = s.motions.get(motion);
  if (!rec || rec.status !== 'running') return;
  s.emit({ type: 'motion-withdrawn', t, motion });
  oweHeld(s, t, motion, rec.by, rec.payload.kind);
}

/**
 * The ordinary-route seam: this package never runs races. The host — the
 * engine, the sim, a mock — runs the race and reports the outcome here, a
 * motion carrying when the room prefers it to what stands and the quorum is
 * met; post-368 the caller is an engine-core race over the value.
 *
 * **`held-at-close` is the third word, and only the close may say it**
 * (Q1450, Ed 2026-09-18): the same hold, at T=0, by a clock rather than by
 * the room. It settles and files exactly as `held` does and differs in one
 * thing — the mover is told nothing, because an OK is refused on a shut
 * document and the 🥂 card is what speaks for every motion the close found
 * running (SURFACE E41).
 */
export function adjudicateOrdinaryMotion(s: MotionHost, t: number,
  motion: MotionId, outcome: 'carried' | 'held' | 'held-at-close'): void {
  s.requireOpen('a motion');
  const rec = s.motions.get(motion);
  if (!rec || rec.status !== 'running') throw new Error('the motion is not running');
  if (rec.route !== 'ordinary') {
    throw new Error('a constitutional motion settles by unanimity, not adjudication');
  }
  s.emit({ type: 'motion-adjudicated', t, motion, outcome });
  const after = s.motions.get(motion)!.status as string; // the fold moved it
  if (after === 'awaiting-crown') {
    s.emit({ type: 'crown-question-opened', t,
      question: `cq-${s.nextCrownN}`, motion: rec.id });
  } else if (after === 'carried') {
    settleCarriedEffects(s, t, rec, /* everyoneHadSay */ false);
  } else if (after === 'held') {
    settleHeldEffects(s, t, rec, /* tellTheMover */ outcome !== 'held-at-close');
  }
}

export function answerCrownQuestion(s: MotionHost, t: number, question: string,
  outcome: 'accept' | 'reject'): void {
  s.requireOpen('the 👑 question');
  const q = s.crownQuestions.get(question);
  if (!q || q.status !== 'pending') throw new Error('no such pending 👑 question');
  if (s.crownLapsed) throw new Error('the crown has lapsed — the question passes by itself');
  s.emit({ type: 'crown-question-answered', t, question, outcome });
  if (q.motion === null) return; // a text question: the host reads the record (Q440)
  const rec = s.motions.get(q.motion)!;
  if (outcome === 'accept') {
    // Under unanimity everyone already had their say; under the ordinary
    // route the judges are the engine's business, so everybody is owed.
    settleCarriedEffects(s, t, rec, rec.route === 'constitutional');
  } else {
    settleHeldEffects(s, t, rec);
  }
}

/** Under `assembly`, the subject of a removal stands outside its electorate
 *  (Q401a) — they see the motion, and it settles without them; under
 *  `consent` their own answer counts, which is what makes it leave-only.
 *  Read live, like the electorate itself: a price change mid-motion is a
 *  ground shift. */
function motionExcludes(s: MotionHost, rec: MotionRecord): MemberId | null {
  return rec.payload.kind === 'remove' && s.priceOf('removal') === 'assembly'
    ? rec.payload.member : null;
}

function heldOutBy(s: MotionHost, member: MemberId): boolean {
  for (const rec of s.motions.values()) {
    if (rec.by === member && rec.route === 'constitutional' &&
      (rec.status === 'running' || rec.status === 'awaiting-crown')) {
      return true;
    }
  }
  return false;
}

/**
 * **A carry on a setting is a ground shift on every rival still live on
 * it** (Ed, 2026-09-12, Q1348; SPEC §9.6, R-105): once the value moved
 * from no longer stands, every answer on a rival was given against the
 * wrong baseline, so the module wipes them but the mover's and the motion
 * is served to everyone as a fresh ask. "The ground moved" is the same
 * fact whoever moved it, so the Founder's ✒️ and an ordinary carry shift
 * the rivals exactly as a unanimity carry does — `cause` says which.
 * Called after the value has landed, never from a fold; `except` is the
 * motion that moved it, which is settled and is not its own rival.
 *
 * **A rival at the crown's door is shifted too** (Ed, 2026-09-14, Q1348
 * (a)), reversing the one skip R-105 recorded: a value must never stand on
 * consent given against a different baseline, and the crown's assent is not
 * a second consent that could stand in for the room's.
 *
 * **And a rival proposing exactly what now stands is not shifted but
 * settled** (Q1348 (b), R-106): the value it wanted is the value it has, so
 * asking the room to consent to it again is asking them to consent to
 * nothing. It carries, moot, applying nothing — the check runs first, so a
 * moot rival is never wiped.
 *
 * Constitutional rivals only, as the shift has always been: an ordinary
 * motion is a race the engine runs, and settling one from here would leave
 * its candidate racing with nothing to report back to.
 */
export function shiftRivals(s: MotionHost, t: number, setting: SettingId,
  cause: MotionId | 'pen', except?: MotionId): void {
  const stands = s.settings.get(setting)?.value ?? null;
  for (const rec of s.motions.values()) {
    if (rec.id === except) continue;
    if (rec.status !== 'running' && rec.status !== 'awaiting-crown') continue;
    if (rec.route !== 'constitutional') continue;
    if (rec.payload.kind !== 'set' || rec.payload.setting !== setting) continue;
    if (stands !== null && eqValue(rec.payload.value, stands)) {
      s.emit({ type: 'motion-carried-moot', t, motion: rec.id, cause });
      settleMootEffects(s, t, rec);
      continue;
    }
    s.emit({ type: 'motion-ground-shifted', t, motion: rec.id, cause });
  }
}

/**
 * What a moot carry owes (Q1348 (b), R-106): **the mover, and nobody else.**
 * A carry owes an OK to every member who had no say, because the rule they
 * live under changed; here it did not — the act that moved the ground is
 * telling the room in its own right, and a second card about a change that
 * did not happen is the flood entry 162 exists to prevent. The mover is the
 * one person with something to be told: what they proposed is now the rule.
 * The shape is `settleCarriedEffects`' own, the setting's OK, so the mover's
 * card is the rule's, and the guards are its guards — an already-owed OK is
 * not owed twice, and somebody gone or not yet arrived is owed nothing.
 */
function settleMootEffects(s: MotionHost, t: number, rec: MotionRecord): void {
  if (rec.by === null || rec.payload.kind !== 'set') return;
  const mover = s.members.get(rec.by);
  if (!mover || mover.removed || mover.arrivedAtT === null) return;
  if (mover.okOwed.has(rec.payload.setting)) return;
  s.emit({ type: 'ok-owed', t, member: mover.id, settings: [rec.payload.setting] });
}

/** The live motion already putting exactly this payload, if any (Q1348). */
function runningTwin(s: MotionHost, payload: MotionPayload): MotionId | null {
  for (const [id, rec] of s.motions) {
    if (rec.status !== 'running' && rec.status !== 'awaiting-crown') continue;
    if (samePayload(rec.payload, payload)) return id;
  }
  return null;
}

/**
 * The settle check (v0.48): a constitutional motion carries at the moment
 * every currently active member — E, evaluated live (R-088) — stands
 * at accept or abstain with no keep standing. Re-run on every answer and
 * every roster event; a standing keep blocks but does not kill.
 */
export function maybeSettleMotions(s: MotionHost, t: number): void {
  let settled = true;
  while (settled) {
    settled = false;
    for (const rec of s.motions.values()) {
      if (rec.status !== 'running' || rec.route !== 'constitutional') continue;
      // 🏛️ without [avatar] (Q401a): a removal under `assembly` settles by
      // the live electorate minus its subject — everyone but them.
      const excl = motionExcludes(s, rec);
      const electorate = motionElectorateOf(s.members.values())
        .filter((m2) => m2.id !== excl);
      if (electorate.length === 0) continue;
      const answers = electorate.map((m) => rec.answers.get(m.id));
      if (answers.some((a) => a === undefined || a === 'keep')) continue;
      if (!answers.some((a) => a === 'accept')) continue; // nobody consented to anything
      if (s.reservedTarget(rec)) {
        // Reserved is assent at the end of either route (§9.7 v0.49):
        // unanimity carries the change to the crown, not into the document.
        s.emit({ type: 'crown-question-opened', t,
          question: `cq-${s.nextCrownN}`, motion: rec.id });
        settled = true;
        break;
      }
      s.emit({ type: 'motion-carried', t, motion: rec.id });
      settleCarriedEffects(s, t, rec, true);
      settled = true; // a departure-by-removal can complete another motion
      break;
    }
  }
}

/** Follow-ons of a carried motion: membership events and owed OKs. */
export function settleCarriedEffects(s: MotionHost, t: number, rec: MotionRecord,
  everyoneHadSay: boolean): void {
  if (rec.payload.kind === 'invite') {
    // **One address is one member** (issue #6, F2; §9.7½, decision 1253). The
    // address was free when the motion was put, and a motion is a permission
    // that lands later: the Founder's ✒️ or an application can have seated
    // that person in between, and a second row is a second wallet and a
    // second place in E. The motion still **carried** — the room said yes,
    // and the record says so — there is simply nothing left for it to do.
    if (s.personSeated(rec.payload.person)) return;
    const id = `m-${s.nextMemberN}`;
    s.emit({ type: 'member-invited', t, member: id,
      person: rec.payload.person, viaMotion: rec.id });
    // an invitee counts toward nothing until they arrive — no roster follow-ons
  } else if (rec.payload.kind === 'remove') {
    const target = rec.payload.member;
    // **Nobody leaves twice** (issue #6, F3). Three roads lead out — the
    // Founder's ❌, this motion and 🌂 — and the subject of a removal
    // resigning while the room decides is the ordinary case, not a
    // contrivance. Carrying on top of a departure that already happened
    // recorded a second one at a later time, overwrote `removedBy` so the
    // record said the room exiled somebody who had walked out, and owed
    // every remaining member the 🥾 card about that person again. The
    // motion **carried** all the same — the room said yes — and there is
    // nothing left for it to do, which is the invite arm's rule above at
    // the other door.
    if (s.members.get(target)!.removed) return;
    const wasInE = inE(s.members.get(target)!);
    s.emit({ type: 'member-removed', t, member: target, viaMotion: rec.id });
    // the room is told, and owes an OK for it (SURFACE E38, Q901) — before
    // the roster's follow-ons, as at the other two doors out
    oweDeparture(s, t, target);
    if (wasInE) s.afterRosterChange(t, 'departure', target);
    // after the roster's own follow-ons, never inside them: they can carry
    // further motions, and the auto-pass is the last word on a settled
    // roster rather than a step in one
    crownSeatVacated(s, t);
  } else if (rec.payload.kind === 'set' &&
    CONSTITUTIONAL.has(rec.payload.setting)) {
    // A constitutional value changed: anybody who had no say is owed the
    // decision. Under unanimity that is only whoever stood outside the
    // electorate (the lapsed); under an ordinary
    // route (an ending date-move) the judges are the engine's business,
    // so everybody is owed the news (NOTES.md).
    for (const m of s.members.values()) {
      if (m.removed) continue;
      if (m.arrivedAtT === null) continue;
      if (everyoneHadSay && rec.answers.has(m.id)) continue;
      if (m.okOwed.has(rec.payload.setting)) continue;
      s.emit({ type: 'ok-owed', t, member: m.id, settings: [rec.payload.setting] });
    }
    if (rec.payload.setting === 'lapse') s.rereadLapse(t); // entry 97
  }
  if (rec.payload.kind === 'set') {
    // the value has landed (the fold applied it): every rival on the
    // setting is asked again against it (Q1348, R-105)
    shiftRivals(s, t, rec.payload.setting, rec.id, rec.id);
  }
  if (rec.payload.kind === 'admit') {
    // the invite arm's rule, at the other door in (issue #6, F2): the
    // applicant may have been invited by the pen while the room decided
    const already = s.personOfApplicant(rec.payload.applicant);
    if (already !== null && s.personSeated(already)) return;
    const id = `m-${s.nextMemberN}`;
    // what they told the door arrives with them (Q1405): ✋ and 🖼️ are asked
    // of a member as *were you ever asked*, and the answers were given
    s.emit({ type: 'member-admitted', t, applicant: rec.payload.applicant,
      member: id, ...s.answeredAtDoor(rec.payload.applicant) });
    // an admitted applicant inherits the constitution and is owed nothing
    // for it, like any other joiner (§9.7½, §9.0a)
    s.afterRosterChange(t, 'arrival', id); // and is present
  }
}

/**
 * A joiner used to be owed an OK on every settled constitutional setting
 * they had no say in — R-016's inheritance clause. **Reversed** (Ed,
 * 2026-08-25): *a setting that predates you is simply what the document
 * says; a power handed to you is news addressed to you.* Nothing is owed
 * on arrival; `oweOks` covers everything set or changed after it, and it
 * already skips whoever has not arrived.
 */

/**
 * **A park with no convenor auto-passes, the way a lapse does** (Ed,
 * 2026-08-29, R-060). A text adoption parked under 🛡️ on the Text blocks
 * every text adoption in the document until it is answered, and the 👑
 * question is served only to the convenor — so a seat vacated while a park
 * stands would serve the question to somebody who has gone, with no clock
 * left to auto-pass it, and the room's drafting would stop for the life of
 * the document.
 *
 * Three things it does deliberately, each of which a later reader might
 * try to "fix":
 *
 * - **It reuses `crown-question-auto-passed` rather than inventing a
 *   kind.** The ruling is *the way a lapse does*, and that is the event a
 *   lapse emits: the fold already sets `auto-passed` and treats it as
 *   accepted, and the bridge's cursor walk already turns it into
 *   `engine.assent(t, parked, 'accept')`. A new kind would move the log's
 *   rolling hash and need a bridge arm to do what an arm already does.
 *   What it adds is the event's `cause: 'vacancy'` (Q1033), so the record
 *   says the seat was vacant rather than that the convenor agreed — a
 *   lapse carries no cause and reads as it always did.
 * - **It does not emit `crown-lapsed`.** A vacancy is not a lapse:
 *   `crownLapsed` is about a crown that may wake up again
 *   (`member-returned` revives it) and a removed member does not return to
 *   the seat. The shield goes down through `convenorSeatVacant()` instead.
 * - **Every pending question, motion-backed ones included** (Q1033, Ed
 *   2026-08-29: *auto-pass them too, exactly as the lapse case does*).
 *   Until that ruling this was a *narrowing* of `tick`'s lapse loop to
 *   text questions, on the ground that a carried invitation or removal
 *   applying without assent because the convenor left was a governance
 *   consequence nobody had ruled on. Ed's ground for the reversal is the
 *   one to keep: a seat nobody occupies cannot refuse anything, and a
 *   motion the room carried should land. So it is the lapse loop now —
 *   `settleCarriedEffects` runs for each, a carried removal's own arm
 *   calling back in here for the questions it did not reach.
 *
 * Two call sites, both the last word of an act that may have emptied the
 * seat: the carried `remove` arm of `settleCarriedEffects` and `resign`
 * (entry 248). It guards itself on `convenorSeatVacant()`, so a caller
 * never asks whether the member who just left was the convenor.
 */
export function crownSeatVacated(s: MotionHost, t: number): void {
  if (!s.convenorSeatVacant()) return;
  for (const q of [...s.crownQuestions.values()]) {
    if (q.status !== 'pending') continue;
    s.emit({ type: 'crown-question-auto-passed', t, question: q.id, cause: 'vacancy' });
    if (q.motion !== null) {
      const mrec = s.motions.get(q.motion)!;
      settleCarriedEffects(s, t, mrec, mrec.route === 'constitutional');
    }
  }
}

/**
 * Follow-ons of a held motion: a refused application is told so (§9.7½), and
 * **the mover is told their motion failed** (Ed, 2026-09-17, Q1447; SURFACE
 * E41, R-130). Two callers, which are two of the three roads to a failure:
 * `adjudicateOrdinaryMotion` with *held* — the engine ran the race and the
 * value stood — and `answerCrownQuestion` with *reject*, the Founder's 🛡️
 * refusing a motion the room had already carried. The third is
 * `abandonMotion`, which calls `oweHeld` for itself, having no status event
 * of this shape to hang it on.
 *
 * The owing goes **after** the status event and before nothing else, which is
 * where the departure owing sits relative to `member-removed`: the news of an
 * act beside the act in the log, rather than behind whatever a re-settle
 * carried.
 *
 * Not a road: `crown-failed-closed`, which also lands a motion at `held`.
 * It is emitted by `runClose` and folded there, reaching this file by no
 * path at all, so the close owes nothing — which is the answer anyway, an
 * OK being refused on a shut document.
 *
 * **And `tellTheMover` is the close's own arm of that same answer** (Q1450,
 * Ed 2026-09-18): the ordinary motions `finishClose` holds at T=0 do come
 * through here, and they are the one case where the follow-on splits — the
 * applicant is still told their application was refused, because that is a
 * fact about them and not a task, while the mover is told nothing, the 🥂
 * card counting every motion the close found running instead.
 */
function settleHeldEffects(s: MotionHost, t: number, rec: MotionRecord,
  tellTheMover = true): void {
  if (rec.payload.kind === 'admit') {
    s.emit({ type: 'application-refused', t, applicant: rec.payload.applicant });
  }
  if (tellTheMover) oweHeld(s, t, rec.id, rec.by, rec.payload.kind);
}

/**
 * Whether two motion payloads put the same thing (Q1348, SPEC §9.6, R-103):
 * the same value on the same setting, the same person, member or applicant,
 * the same power back on the same setting. A pen amendment is folded, never
 * opened, so it has no twin to meet.
 */
function samePayload(a: MotionPayload, b: MotionPayload): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'set':
      return b.kind === 'set' && a.setting === b.setting && eqValue(a.value, b.value);
    case 'invite':
      return b.kind === 'invite' && a.person === b.person;
    case 'remove':
      return b.kind === 'remove' && a.member === b.member;
    case 'admit':
      return b.kind === 'admit' && a.applicant === b.applicant;
    case 'reserve':
      return b.kind === 'reserve' && a.setting === b.setting &&
        (a.power ?? 'both') === (b.power ?? 'both');
    default:
      return false;
  }
}
