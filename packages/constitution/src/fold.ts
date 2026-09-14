/**
 * The fold (SPEC §9): every event this module knows, turned into state, out
 * of session.ts since Q1352 (s), 2026-09-14. `apply` and its two arms are the
 * whole of what a `ConstitutionSession` *is* — the commands above them only
 * validate and `emit`, and `replay` rebuilds a session by handing this file
 * the log entry by entry.
 *
 * **Nothing here emits.** The rule the session has kept since Q1034 is the
 * reason the file can stand alone: `replay` calls `apply` directly while
 * `emit` pushes to the log and then calls it, so an owing performed in a fold
 * would append events to every session that replays that log. Follow-on
 * emission (the maybeAdopt pattern) belongs to the commands, always.
 *
 * **`FoldState` is the writer's own object, not a view.** owed.ts takes a
 * snapshot and motions.ts a live host because both are readers that write by
 * `emit`; the fold is the one thing that assigns, so it owns the fields and
 * the session reaches them through private getters of the same names. Fold
 * order, every field's initial value, every counter increment and every Map
 * insertion order are part of what `replay` has to rebuild bit-identically:
 * nothing in this file may be reordered for tidiness.
 */

import type {
  ApplicantRecord, ApplicantState, ConstitutionEvent, CrownQuestionRecord, DoorId,
  MailGiveUpBatchRecord, MemberId, MemberRecord, MemberState, MotionId, MotionRecord,
  Powers, PowerKey, PowerSource, ReleaseBatchRecord, SettingState, Arrival, DepartureBy,
} from './types.js';
import { DOORS, holderOf } from './types.js';
import type { People, PersonId, ResolvedPerson } from './people.js';
import { resolvePerson } from './people.js';
import type { SettingId } from './catalogue.js';
import { CATALOGUE, entryOf, validateFor } from './catalogue.js';
import type { EndingValue, PaceValue, PercentValue, QuorumValue,
  SettingValue, SlugValue } from './values.js';
import { CONSTITUTIONAL } from './motions.js';
import type { ThresholdAnchors } from './threshold.js';
import { reAnchor, seedAnchors } from './threshold.js';
import type { ShapeName } from './shapes.js';

/** The settings the map manages: everything except the text and the personal pair.
 *  🪪 is among them since entry 94 — a price, not the register. */
export const MANAGED: readonly SettingId[] = CATALOGUE
  .filter((e) => e.kind !== 'personal' && e.id !== 'startingText')
  .map((e) => e.id);

/** Everything that carries a crown pair: the managed map, the Text (Q440, 2026-08-21)
 *  and the two doors (entry 94, 2026-08-26). */
export const HELD: readonly PowerKey[] = [...MANAGED, 'startingText', ...DOORS];

/**
 * Everything the fold writes, in the order it was declared on the session.
 * `people` is the one field it only reads — `withPerson` resolves through it —
 * and it is the session's own store, handed in rather than made here.
 */
export class FoldState {
  constructor(readonly people: People) {}

  /** The clock rule's memory (§9.7a): timestamps are non-decreasing, and
   *  `emit` refuses a backwards one before the log sees it (Q679). */
  lastT = -Infinity;

  convenor!: { id: MemberId; person: PersonId; isMember: boolean;
    // the clerk's half of Q645's *was it ever answered* — a clerk is never a
    // MemberRecord, and their name and picture are optional (§9.6a), so the
    // question is asked of them exactly as it is of anybody
    nameSet: boolean; pictureSet: boolean;
    /**
     * **Whether 🎩 has been answered** (Q682), and the same lesson as
     * `nameSet` one line above. `isMember` is a value with a default, so it
     * cannot say whether the question was ever put — and pre-🍾 the surface
     * had nowhere else to look: it kept 🎩's settledness in page state alone,
     * which no reload can rebuild. Since 🎩 blocks the founding order, a
     * founder who answered it and then reloaded was asked again *and* had
     * everything below it withheld again. Folded from the
     * `convenor-membership-set` events the log already carries: no new event,
     * no envelope change, hash chain untouched.
     */
    membershipSet: boolean;
    lastActivityT: number; lapseWarned: boolean; lapseWarnedLead: number | null };
  crownLapsedFlag = false;
  members = new Map<MemberId, MemberRecord>();
  /** The departures, folded (Q901): see `departures()`. */
  departed: Array<{ member: MemberId; t: number; by: DepartureBy }> = [];
  settings = new Map<PowerKey, SettingState>();
  quorumFormValue: 'count' | 'share' = 'share';
  startingText: string | null = null;
  textConfirmedFlag = false;
  slugHistory: string[] = [];
  /** The birth's own `t` and its 🧭 shape (entry 166), read off `created` so `replay` rebuilds both. */
  createdT: number | null = null;
  shapeName: ShapeName | null = null;
  constitutedT: number | null = null;
  closedFlag = false;
  closedT: number | null = null;
  anchors: ThresholdAnchors | null = null;
  motions = new Map<MotionId, MotionRecord>();
  crownQuestions = new Map<string, CrownQuestionRecord>();
  applicants = new Map<string, ApplicantRecord>();
  /**
   * The release batches, by id (entry 162, Q1013), and the two fields that
   * decide whether a further release **joins** one or opens a new one. All
   * three are recomputed **in the fold** and never only in the command: a
   * batch id minted in the command would replay differently from the session
   * that wrote it.
   */
  releaseBatches = new Map<string, ReleaseBatchRecord>();
  lastReleaseT: number | null = null;
  lastReleaseBatch: string | null = null;
  nextReleaseN = 1;
  /** The mail-give-up batches, by id (SURFACE E34). One pass, one batch, so
   *  there is no open-batch pair here — the counter alone, moved in the fold
   *  for `nextReleaseN`'s reason. */
  mailGiveUpBatches = new Map<string, MailGiveUpBatchRecord>();
  nextMailGiveUpN = 1;
  nextMemberN = 1;
  nextMotionN = 1;
  nextCrownN = 1;
  nextApplicantN = 1;
  /** Person ids are minted like member ids and rebuilt from the log (`notePerson`). */
  nextPersonN = 1;

  /** What each pen amendment changed *from* — a motion proposes a value and
   *  never needs the old one, so this rides alongside rather than bending the
   *  payload every other amendment shares. */
  readonly penFrom = new Map<MotionId, SettingValue>();
}

export function apply(s: FoldState, event: ConstitutionEvent, _seq: number): void {
  if (event.t < s.lastT) throw new Error('timestamps must be non-decreasing');
  s.lastT = event.t;
  switch (event.type) {
    case 'created': {
      const c = event.convenor;
      s.createdT = event.t;
      s.shapeName = event.shape ?? null;
      notePerson(s, c.person);
      s.convenor = { id: c.id, person: c.person, isMember: c.isMember,
        // a founder who arrives already carrying one has answered it (Q645)
        nameSet: c.nameSet === true, pictureSet: c.pictureSet === true,
        // 🎩 is asked, never assumed: `isMember` arrives with the creation
        // and answers nothing about whether the founder was put the question
        membershipSet: false,
        lastActivityT: event.t, lapseWarned: false, lapseWarnedLead: null };
      // **Nothing arrives delegated** (Ed, 2026-08-21, amending SPEC §9.0a,
      // closing Q511). Every held setting is born with the founder holding
      // it, both powers intact and its question shut, because a default
      // holder states an answer the founder has not given — the clause
      // reads *The Founder is deciding X* until they decide it, and
      // delegating is the ✒️/🛡️ act like any other, which is what emits
      // `setting-delegated` and opens the blind question.
      //
      // §9.0a used to say the roster was the default holder of the
      // constitutional ones, on the argument that a default you must argue
      // out of is stronger than a ticked radio. The cost was that ten
      // questions opened for answering at the instant of creation, before
      // the founder had seen one of them — so the room could be answering
      // while the founder was still naming the document, and the surface
      // could not tell a default apart from a decision.
      // Birth is uniform; the catalogue carried a `holderDefault` column as
      // doctrine until 2026-08-22 (spec pass 1, finding 554), read by nothing.
      for (const id of HELD) {
        s.settings.set(id, {
          id,
          holder: 'convenor',
          powers: { unilateral: true, assent: true },
          // both powers are the convenor's by construction at the birth
          powerFrom: { unilateral: 'founding', assent: 'founding' },
          pendingRelease: { unilateral: false, assent: false },
          value: null,
          previousValue: null,
          setWhy: null,
          settledBy: null,
          settledAtT: null,
          returned: [],
          collecting: false,
          answers: new Map(),
          distribution: null,
        });
      }
      foldSet(s, 'title', { text: event.title }, 'convenor', event.t);
      foldSet(s, 'link', { slug: event.slug }, 'convenor', event.t);
      s.slugHistory.push(event.slug);
      if (c.isMember) {
        const rec = freshMember(s, c.id, c.person, event.t, event.t,
          { via: 'founding', by: null });
        // readers prefer the MemberRecord over the convenor struct, so a
        // founder created already carrying a name has to arrive with the
        // answered flags here too, or the two disagree from the first event
        // (Q645); the values themselves are the row's, shared by construction
        rec.nameSet = s.convenor.nameSet;
        rec.pictureSet = s.convenor.pictureSet;
        s.members.set(c.id, rec);
      }
      break;
    }
    case 'convenor-membership-set': {
      // **🎩 decides where the founder sits, not who they are** (Q646). This
      // rebuilt the record from `freshMember` on every tick, so a founder who
      // named themselves and then revisited 🎩 — the radios stay live until
      // the start (SURFACE C9) — lost their name, their picture, the OKs they
      // were owed and the ones they had given. Identity binds nobody (§9.0c,
      // exception X15: *the convenor with no powers and no membership keeps
      // their name and picture*), so nothing about it belongs to the seat.
      // It carries **both** ways: while they are a member their identity
      // lives on the MemberRecord and the convenor struct goes stale, so
      // unticking without carrying it back served a name from before they
      // joined.
      // the seat only moves when the answer differs from where they sit;
      // an answer that repeats itself records the act and nothing else
      if (event.isMember === s.members.has(s.convenor.id)) {
        s.convenor.membershipSet = true;
        break;
      }
      if (event.isMember) {
        const rec = freshMember(s, s.convenor.id, s.convenor.person,
          event.t, event.t, { via: 'founding', by: null });
        const prev = s.members.get(s.convenor.id);
        // the name and picture need no carrying since decision 1253: seat
        // and struct name the same person row, so both read the same values
        rec.nameSet = prev ? prev.nameSet : s.convenor.nameSet;
        rec.pictureSet = prev ? prev.pictureSet : s.convenor.pictureSet;
        if (prev) {
          rec.okOwed = prev.okOwed;
          rec.okGiven = prev.okGiven;
          // the release batches travel with the OKs, for the same reason:
          // what is owed belongs to the person, not to the seat (entry 162)
          rec.releasesOwed = prev.releasesOwed;
          rec.releasesGiven = prev.releasesGiven;
          // and the amendment news with them, for the same reason
          // (SURFACE E35)
          rec.amendmentsOwed = prev.amendmentsOwed;
          rec.amendmentsGiven = prev.amendmentsGiven;
          // and the mail news with them, for the same reason (SURFACE E34)
          rec.mailGaveUpOwed = prev.mailGaveUpOwed;
          rec.mailGaveUpGiven = prev.mailGaveUpGiven;
          rec.mailGaveUp = prev.mailGaveUp;
          rec.lastActivityT = prev.lastActivityT;
        } else {
          rec.lastActivityT = Math.max(rec.lastActivityT, s.convenor.lastActivityT);
        }
        s.members.set(s.convenor.id, rec);
      } else {
        const prev = s.members.get(s.convenor.id);
        if (prev) {
          s.convenor.nameSet = prev.nameSet;
          s.convenor.pictureSet = prev.pictureSet;
          s.convenor.lastActivityT = prev.lastActivityT;
        }
        s.members.delete(s.convenor.id);
      }
      // the act, not the value (Q682): whichever way it went, 🎩 was asked
      s.convenor.membershipSet = true;
      // and the struct's own field follows the seat (Q920): the roster is
      // the fact, and `convenorRecord()` reads it, but nothing that reads
      // the struct directly should meet a value from before the act
      s.convenor.isMember = event.isMember;
      break;
    }
    case 'setting-set': {
      touch(s, s.convenor.id, event.t); // a convenor act moves their clock
      // read before foldSet overwrites it: this is the whole of what tells
      // a first decision from a change (Q530)
      const prevOf = s.settings.get(event.setting);
      const wasValue = prevOf ? prevOf.value : null;
      foldSet(s, event.setting, event.value, event.by, event.t);
      const nowSt = s.settings.get(event.setting);
      if (nowSt) {
        nowSt.previousValue = wasValue;
        nowSt.setWhy = event.why ?? null;
      }
      // **A pen change is an amendment, and is recorded as one** (Ed,
      // 2026-08-22: *a unilateral rule change by the founder is still just
      // a kind of amendment and so should be treated in the same way in
      // terms of how it's communicated and reported*). So it does not get
      // a list of its own — it joins the motions, where every other
      // amendment already lives, and the record renders it beside them
      // without knowing it is different. It is **folded, not emitted**:
      // synthesised here from the `setting-set` event the log already
      // carried, so no event shape changed and the hash chain is untouched,
      // the same technique as `arrival` in Q524.
      //
      // A **first decision is not in it**, by the same test the
      // acknowledgement uses: nothing was amended, so there is no
      // amendment. §9.6a in the spec's own words.
      if (wasValue !== null) {
        const id = ('pen:' + event.setting + ':' + event.t) as MotionId;
        s.motions.set(id, {
          id,
          by: s.convenor.id,
          payload: { kind: 'set', setting: event.setting, value: event.value },
          route: 'pen',
          stake: 0,
          openedAtT: event.t,
          why: event.why ?? null,
          // it opens and settles in one act — nobody had to agree
          status: 'carried',
          answers: new Map(),
          settledAtT: event.t,
          moot: null,
        });
        s.penFrom.set(id, wasValue);
      }
      if (event.setting === 'quorum') {
        s.quorumFormValue = (event.value as QuorumValue).form;
      }
      if (event.setting === 'link') {
        const slug = (event.value as SlugValue).slug;
        if (!s.slugHistory.includes(slug)) s.slugHistory.push(slug);
      }
      if (CONSTITUTIONAL.has(event.setting)) {
        for (const m of s.members.values()) m.okGiven.delete(event.setting);
      }
      reseedAnchorsIfLive(s, event.t, event.setting);
      break;
    }
    case 'setting-delegated': {
      const st = s.settings.get(event.setting)!;
      setPowers(st, { unilateral: false, assent: false });
      st.collecting = true;
      st.value = null;
      st.settledBy = null;
      st.settledAtT = null;
      st.distribution = null;
      break;
    }
    case 'setting-reclaimed': {
      const st = s.settings.get(event.setting)!;
      // reclaiming a delegation withdraws the question; reclaiming a
      // relinquished power on a still-held setting (§9.6a: pre-start the
      // founder's powers are as revisable as their values) must not touch
      // the value the founder has already set
      const wasDelegated = st.holder === 'members';
      setPowers(st, { unilateral: true, assent: true });
      if (wasDelegated) {
        st.collecting = false;
        st.answers.clear();
        st.value = null;
        st.settledBy = null;
        st.settledAtT = null;
        st.distribution = null;
      }
      break;
    }
    case 'starting-text-confirmed': {
      s.startingText = event.text.replace(/\r\n?/g, '\n');
      s.textConfirmedFlag = true;
      break;
    }
    case 'text-amended': {
      touch(s, s.convenor.id, event.t); // a convenor act moves their clock
      // **The same record shape the pen fold above builds** (R-004, R-058):
      // a unilateral change by the Founder is still just a kind of
      // amendment, so it joins the motions rather than getting a list of
      // its own, and every existing reader already says *The Founder* for
      // `route === 'pen'` without knowing this kind exists. It opens and
      // settles in one act — nobody had to agree.
      const id = ('pen:text:' + event.candidateId) as MotionId;
      s.motions.set(id, {
        id,
        by: s.convenor.id,
        payload: { kind: 'text', candidateId: event.candidateId, summary: event.summary },
        route: 'pen',
        stake: 0,
        openedAtT: event.t,
        why: event.why ?? null,
        status: 'carried',
        answers: new Map(),
        settledAtT: event.t,
        moot: null,
      });
      // **The owing is not done here** (Q1034, and see `oweAmendment`).
      // `replay` calls `apply` directly while `emit` pushes to the log, so
      // an owing performed in a fold appends events to every session that
      // replays that log. It rides `recordTextAmendment`, on the command
      // path, where every other owing in this file rides.
      break;
    }
    case 'quorum-form-set': {
      s.quorumFormValue = event.form;
      break;
    }
    case 'identity-set': {
      // **The act is what is recorded, not the value** (Q645). A key present
      // on the event means the member answered that question; the answer may
      // perfectly well be null — a blank name is Anonymous (§9.0c) and a
      // picture is removed by choosing initials — so `!== undefined` is the
      // test, never truthiness.
      // The values went to the person row when the command ran (decision
      // 1253); the fold records only that the question was answered.
      if (event.member === s.convenor.id && !s.members.has(event.member)) {
        if (event.nameSet) s.convenor.nameSet = true;
        if (event.pictureSet) s.convenor.pictureSet = true;
        break;
      }
      const m = s.members.get(event.member)!;
      if (event.nameSet) m.nameSet = true;
      if (event.pictureSet) m.pictureSet = true;
      touch(s, event.member, event.t);
      break;
    }
    case 'member-invited': {
      // a motion carried it, one member's word did (🪪 at ✒️), or the
      // convenor's own drafting power did
      const arrival: Arrival = event.viaMotion !== undefined
        ? { via: 'invitation', by: 'members' }
        : event.by !== undefined
          ? { via: 'invitation', by: 'member', inviter: event.by }
          : { via: 'invitation', by: 'convenor' };
      notePerson(s, event.person);
      s.members.set(event.member,
        freshMember(s, event.member, event.person, event.t, null, arrival));
      s.nextMemberN += 1;
      break;
    }
    case 'member-uninvited': {
      const m = s.members.get(event.member)!;
      m.removed = true;
      break;
    }
    case 'member-arrived': {
      const m = s.members.get(event.member)!;
      m.arrivedAtT = event.t;
      m.lastActivityT = event.t;
      break;
    }
    case 'member-removed': {
      const m = s.members.get(event.member)!;
      m.removed = true;
      m.removedBy = event.by ?? 'members';
      // Q901 / E31–E32: a departure is a fact about the membership and the
      // record keeps no time for it, so it is folded here — once per event,
      // at replay or at the act — rather than read off the log by every
      // `view()`. **Whether or not the person ever arrived** (Q1012, Ed
      // 2026-08-28: *keep the mail and also record the departure*): a
      // removed invitee is mailed that they are no longer a member of the
      // document, so the register says the same thing about the same act.
      // Withdrawing an invitation is still not a departure — that is
      // `member-uninvited`, its own event, and nobody left (entry 96).
      s.departed.push({ member: event.member, t: event.t, by: m.removedBy });
      break;
    }
    case 'answer-given': {
      const st = readValue(s, event.setting, event.value);
      st.answers.set(event.member, event.value);
      touch(s, event.member, event.t);
      break;
    }
    case 'question-resolved': {
      const st = readValue(s, event.setting, event.value);
      st.collecting = false;
      st.value = event.value;
      st.settledBy = 'ceremony';
      st.settledAtT = event.t;
      st.distribution = event.distribution;
      if (event.setting === 'quorum') {
        s.quorumFormValue = (event.value as QuorumValue).form;
      }
      reseedAnchorsIfLive(s, event.t, event.setting);
      break;
    }
    case 'ceremony-ground-shifted':
      break; // answers stand — the event is the notification (§9.6a)
    case 'constituted': {
      s.constitutedT = event.t;
      s.anchors = computeAnchors(s, event.t);
      // **A recorded act beats the card's reading of it, so it is spent
      // first** (entry 158). 🍾 spends every **pending** release (R-048): a
      // power laid down while the founding ran was recorded then and takes
      // effect now. Where that and `laidDown` disagree, the recorded
      // `power-relinquished` wins — and since `setPowers` clears
      // `pendingRelease`, winning is a matter of running first. Derived at
      // the fold, so no event shape changed and the frozen log replays byte
      // for byte.
      for (const st of s.settings.values()) {
        if (!st.pendingRelease.unilateral && !st.pendingRelease.assent) continue;
        setPowers(st, {
          unilateral: st.powers.unilateral && !st.pendingRelease.unilateral,
          assent: st.powers.assent && !st.pendingRelease.assent,
        });
      }
      if (event.laidDown === undefined) {
        // **The start lays the founder's hand off the Text** — the fold as
        // it stood before entry 158, and what every log written before it
        // replays into. A shield kept on the Text would have made every
        // adoption wait on founder assent, which is no drafting engine's
        // default; the road to a held Text was a post-start reserve motion.
        setPowers(s.settings.get('startingText')!, { unilateral: false, assent: false });
      } else {
        // **…and where 🍾 was asked, the start lays down whatever it was
        // not told to keep** (Ed, 2026-08-27; SPEC §9.7 rule 8 as amended,
        // R-057). The list is authoritative and complete over `HELD` — the
        // Text included, which is why keeping ✒️ or 🛡️ on it is expressible
        // at all for the first time. **Lowering only**: a power the list
        // names goes, a power it does not is left exactly as it stands, so
        // nothing here can ever re-grant. One `setPowers` per key rather
        // than per pair, since the pair is one hand.
        const down = new Map<PowerKey, { unilateral: boolean; assent: boolean }>();
        for (const r of event.laidDown) {
          const cur = down.get(r.setting) ?? { unilateral: false, assent: false };
          cur[r.power] = true;
          down.set(r.setting, cur);
        }
        for (const [k, d] of down) {
          const st = s.settings.get(k);
          if (!st) continue;  // a key the catalogue no longer has
          setPowers(st, {
            unilateral: st.powers.unilateral && !d.unilateral,
            assent: st.powers.assent && !d.assent,
          });
        }
      }
      break;
    }
    case 'ok-owed': {
      const m = s.members.get(event.member)!;
      for (const id of event.settings) m.okOwed.add(id);
      break;
    }
    case 'ok-given': {
      const m = s.members.get(event.member)!;
      m.okOwed.delete(event.setting);
      m.okGiven.add(event.setting);
      touch(s, event.member, event.t);
      break;
    }
    case 'release-owed': {
      const m = s.members.get(event.member)!;
      m.releasesOwed.add(event.batch);
      // **The batch grows by union, and the id counter moves here** (entry
      // 162). A second `relinquish` at the same `t` re-emits under the id
      // that is already open, so the batch gains releases without a byte of
      // the log being rewritten; a first sighting of an id is what mints it,
      // which is why `nextReleaseN` is advanced in the fold and nowhere else.
      const rec = s.releaseBatches.get(event.batch);
      if (rec) {
        for (const r of event.releases) {
          if (!rec.releases.some((x) => x.setting === r.setting && x.power === r.power)) {
            rec.releases.push({ ...r });
          }
        }
      } else {
        s.releaseBatches.set(event.batch,
          { id: event.batch, t: event.t, releases: event.releases.map((r) => ({ ...r })) });
        s.nextReleaseN += 1;
      }
      s.lastReleaseT = event.t;
      s.lastReleaseBatch = event.batch;
      break;
    }
    case 'release-ok': {
      const m = s.members.get(event.member)!;
      m.releasesOwed.delete(event.batch);
      m.releasesGiven.add(event.batch);
      touch(s, event.member, event.t);
      break;
    }
    case 'amendment-owed': {
      // **Nothing is minted here** — the release fold above mints a batch id
      // and grows the batch by union, because one act can lay down
      // thirty-four powers. An amendment carries the candidate id it is
      // about, so there is nothing to mint and nothing to join: the whole of
      // what is remembered is which candidate, and where it changed the text
      // is a question for the engine (SURFACE E35, Q1034).
      s.members.get(event.member)!.amendmentsOwed.add(event.candidate);
      break;
    }
    case 'amendment-ok': {
      const m = s.members.get(event.member)!;
      m.amendmentsOwed.delete(event.candidate);
      m.amendmentsGiven.add(event.candidate);
      touch(s, event.member, event.t);
      break;
    }
    case 'mail-gave-up': {
      // the batch is minted by its first sighting, exactly as a release
      // batch is, so a replay rebuilds the counter without it being written
      if (!s.mailGiveUpBatches.has(event.batch)) {
        s.mailGiveUpBatches.set(event.batch,
          { id: event.batch, t: event.t, people: [...event.people] });
        s.nextMailGiveUpN += 1;
      }
      // **The subject is marked whoever is told** (SURFACE E34): the row's
      // fact belongs to the person, not to the audience, so it is set from
      // every copy of the event and from the told-nobody one too. By person
      // id (decision 1253): the command resolved the dead address to its row.
      for (const rec of s.members.values()) {
        if (event.people.includes(rec.person)) rec.mailGaveUp = true;
      }
      if (event.member !== null) {
        s.members.get(event.member)!.mailGaveUpOwed.add(event.batch);
      }
      break;
    }
    case 'mail-gave-up-ok': {
      const m = s.members.get(event.member)!;
      m.mailGaveUpOwed.delete(event.batch);
      m.mailGaveUpGiven.add(event.batch);
      touch(s, event.member, event.t);
      break;
    }
    case 'mail-resent': {
      // the row's line clears; nobody's owed batch does. The card is the
      // record of something that happened, and a re-send does not un-happen
      // it (SURFACE E34's Persistence column; Q1030).
      s.members.get(event.member)!.mailGaveUp = false;
      touch(s, event.by, event.t);
      break;
    }
    case 'floor-recomputed':
      break; // an announcement (§9.3/Q10); the numbers ride in the event
    case 'tick':
      break;
    default:
      applyLifecycle(s, event);
  }
}

/**
 * The 👑 question a motion parks, withdrawn (Q1348 (a) and (b), R-105,
 * R-106). Called from the two folds that take a motion off the crown's desk
 * without an answer — the ground shift and the moot carry — and a no-op
 * where there is no pending question, so neither fold asks first. The record
 * stays in the map: it is what the log wrote, and `withdrawn` is neither
 * `pending` (every reader filters on that, so nothing is owed and nothing is
 * served) nor an answer the crown gave.
 */
function withdrawCrownQuestionOf(s: FoldState, motion: MotionId): void {
  for (const q of s.crownQuestions.values()) {
    if (q.motion === motion && q.status === 'pending') q.status = 'withdrawn';
  }
}

/** Motions and the crown (§9.6–§9.7, v0.48). */
function applyLifecycle(s: FoldState, event: ConstitutionEvent): void {
  switch (event.type) {
    case 'motion-opened': {
      s.motions.set(event.motion, {
        id: event.motion,
        by: event.by,
        payload: event.payload,
        route: event.route,
        stake: event.stake,
        openedAtT: event.t,
        why: event.why ?? null,
        status: 'running',
        answers: new Map(),
        settledAtT: null,
        moot: null,
      });
      s.nextMotionN += 1;
      if (event.payload.kind === 'admit') {
        s.applicants.get(event.payload.applicant)!.motion = event.motion;
      }
      if (event.by) touch(s, event.by, event.t);
      break;
    }
    case 'motion-answer': {
      const rec = s.motions.get(event.motion)!;
      rec.answers.set(event.member, event.answer);
      touch(s, event.member, event.t);
      break;
    }
    case 'power-relinquished': {
      const st = s.settings.get(event.setting)!;
      // **A pre-start release takes effect at Begin** (Ed, 2026-08-25;
      // R-048). The act is recorded here and now — this event is the
      // record of it — but the power stays the convenor's until 🍾, so
      // everything that reads `powers` before the start reads the hand
      // that is actually on the setting. `constituted` spends it.
      if (s.constitutedT === null) {
        st.pendingRelease = { ...st.pendingRelease, [event.power]: true };
      } else {
        const powers: Powers = { ...st.powers, [event.power]: false };
        setPowers(st, powers);
      }
      touch(s, s.convenor.id, event.t);
      break;
    }
    case 'motion-withdrawn': {
      const rec = s.motions.get(event.motion)!;
      rec.status = 'withdrawn';
      rec.settledAtT = event.t;
      break;
    }
    case 'motion-ground-shifted': {
      // The count restarts (Q1348, R-105): every answer was given against
      // a value that no longer stands, so none of them is consent to move
      // from the one that does. The mover's is restored to accept rather
      // than kept as it was — the motion is theirs and it is being re-put,
      // exactly as at the open (§9.6) — and a mover who had stood down to
      // abstain may stand down again. Nothing else moves: status, id,
      // stake and rationale are the motion's own. No `touch`: nobody acted.
      const rec = s.motions.get(event.motion)!;
      rec.answers.clear();
      if (rec.by !== null) rec.answers.set(rec.by, 'accept');
      // **A motion at the crown's door is shifted too** (Ed, 2026-09-14,
      // Q1348 (a), reversing R-105's last sentence): the unanimity that
      // parked it was consent to move from a value that no longer stands,
      // so it goes back to the room rather than standing on the crown's
      // assent alone. Its 👑 question is withdrawn — the record stays in
      // the map, neither pending nor answered — and if the room consents
      // afresh the settle check opens a new one, which is why nothing here
      // remembers that there ever was one.
      if (rec.status === 'awaiting-crown') {
        rec.status = 'running';
        rec.settledAtT = null;
        withdrawCrownQuestionOf(s, rec.id);
      }
      break;
    }
    case 'motion-carried-moot': {
      // **What it proposed is what stands** (Ed, 2026-09-14, Q1348 (b),
      // R-106): the motion settles as carried and applies nothing — the
      // value is already there, and a second `applyPayloadSet` would write
      // a second change record over the provenance of the act that
      // actually moved it. `moot` names that act, which is the whole of
      // what the record card has to say.
      const rec = s.motions.get(event.motion)!;
      rec.status = 'carried';
      rec.settledAtT = event.t;
      rec.moot = event.cause;
      withdrawCrownQuestionOf(s, rec.id);
      break;
    }
    case 'motion-carried': {
      const rec = s.motions.get(event.motion)!;
      rec.status = 'carried';
      rec.settledAtT = event.t;
      if (rec.payload.kind === 'set') {
        applyPayloadSet(s, rec.payload.setting, rec.payload.value, 'motion', event.t);
      }
      if (rec.payload.kind === 'reserve') {
        // The room crowned the convenor — willing or lapsed (§9.7 v0.52,
        // Ed: a lapsed one is a constitutional monarchy, powers held and
        // auto-abstained). An unwilling crown's release is delegation,
        // which stays the convenor's own free act. v0.54: the motion may
        // restore one power or both (Q394); omitted means both.
        const st = s.settings.get(rec.payload.setting)!;
        const p = rec.payload.power ?? 'both';
        // 'motion' (Q524): this is the only door a power comes back
        // through from outside, so it is the only source that is not the
        // birth — and the one thing the crown's own card can truthfully
        // say about where it got its pen.
        setPowers(st, {
          unilateral: st.powers.unilateral || p !== 'assent',
          assent: st.powers.assent || p !== 'unilateral',
        }, 'motion');
      }
      // membership payloads apply through their follow-on events
      break;
    }
    case 'motion-adjudicated': {
      const rec = s.motions.get(event.motion)!;
      rec.settledAtT = event.t;
      if (event.outcome === 'held') {
        rec.status = 'held';
      } else if (reservedTarget(s, rec)) {
        // Reserved is assent, not silence (§9.7): the carried change goes
        // to the convenor as a 👑 question rather than applying.
        rec.status = 'awaiting-crown';
        rec.settledAtT = null;
      } else {
        rec.status = 'carried';
        if (rec.payload.kind === 'set') {
          applyPayloadSet(s, rec.payload.setting, rec.payload.value, 'motion', event.t);
        }
      }
      break;
    }
    case 'crown-question-opened': {
      s.crownQuestions.set(event.question, {
        id: event.question,
        motion: event.motion,
        ...(event.text ? { text: event.text } : {}),
        openedAtT: event.t,
        status: 'pending',
        autoPassedBy: null,
      });
      // Either route parks here (§9.7 v0.49): the change is the members'
      // and the assent is still owed. A text question (Q440) parks no
      // motion -- the engine already adopted; the host holds the text.
      if (event.motion !== null) {
        const parked = s.motions.get(event.motion)!;
        parked.status = 'awaiting-crown';
        parked.settledAtT = null;
      }
      s.nextCrownN += 1;
      break;
    }
    case 'crown-question-answered':
    case 'crown-question-auto-passed': {
      const q = s.crownQuestions.get(event.question)!;
      const accepted = event.type === 'crown-question-auto-passed' ||
        event.outcome === 'accept';
      q.status = event.type === 'crown-question-auto-passed'
        ? 'auto-passed'
        : accepted ? 'accepted' : 'rejected';
      // a log written before Q1033 carries no cause: it was the lapse
      q.autoPassedBy = event.type === 'crown-question-auto-passed'
        ? (event.cause ?? 'lapse') : null;
      if (q.motion !== null) {
        const rec = s.motions.get(q.motion)!;
        rec.status = accepted ? 'carried' : 'held';
        rec.settledAtT = event.t;
        if (accepted && rec.payload.kind === 'set') {
          applyPayloadSet(s, rec.payload.setting, rec.payload.value, 'crown', event.t);
        }
      }
      if (event.type === 'crown-question-answered') {
        touch(s, s.convenor.id, event.t);
      }
      break;
    }
    case 'setting-handed-over': {
      const st = s.settings.get(event.setting)!;
      setPowers(st, { unilateral: false, assent: false });
      touch(s, s.convenor.id, event.t);
      break;
    }
    case 'crown-lapsed': {
      // Lapse is automatic abstention (§9.7 v0.49): nothing changes hands —
      // every reserved setting stays reserved, and while the flag stands
      // assent is granted by itself (reservedTarget reads it).
      s.crownLapsedFlag = true;
      break;
    }
    case 'crown-returned': {
      // Revival is logging in (§9.5a): the assent requirement resumes.
      s.crownLapsedFlag = false;
      touch(s, s.convenor.id, event.t); // clears the warnings too
      break;
    }
    default:
      applyPresence(s, event);
  }
}

/** Presence, lapsing and applications (§9.5, §9.5a, §9.7½). */
function applyPresence(s: FoldState, event: ConstitutionEvent): void {
  switch (event.type) {
    case 'member-returned': {
      const m = s.members.get(event.member)!;
      // **A 💤 change names the members it returned** (Y26, Q902): a return
      // the rule made, of somebody who was lapsed rather than merely
      // warned, is part of what the set changed — the set's fold has just
      // emptied the list, so it holds exactly this set's returns.
      if (event.cause === 'rule' && m.lapsed) {
        s.settings.get('lapse')!.returned.push(event.member);
      }
      m.lapsed = false;
      touch(s, event.member, event.t); // clears the warnings too
      break;
    }
    case 'member-seen':
      touch(s, event.member, event.t);
      break;
    case 'lapse-warned': {
      // three warnings per quiet spell (R-097), each shorter than the
      // last; the shortest sent is what the next is judged against. A
      // log written before the leads carried no `lead`: read as the old
      // single warning, which blocks the rest as a week would.
      const lead = typeof event.lead === 'number' ? event.lead : Number.POSITIVE_INFINITY;
      const who = event.member === s.convenor.id && !s.members.has(event.member)
        ? s.convenor : s.members.get(event.member)!;
      who.lapseWarned = true;
      who.lapseWarnedLead = who.lapseWarnedLead === null ? lead : Math.min(who.lapseWarnedLead, lead);
      break;
    }
    case 'member-lapsed': {
      s.members.get(event.member)!.lapsed = true;
      break;
    }
    case 'closed': {
      s.closedFlag = true;
      s.closedT = event.t;
      break;
    }
    case 'motion-kept-at-close': {
      const rec = s.motions.get(event.motion)!;
      rec.status = 'kept-at-close';
      rec.settledAtT = event.t;
      break;
    }
    case 'crown-failed-closed': {
      const q = s.crownQuestions.get(event.question)!;
      q.status = 'failed-closed';
      if (q.motion !== null) {
        const rec = s.motions.get(q.motion)!;
        rec.status = 'held';
        rec.settledAtT = event.t;
      }
      break;
    }
    case 'invitation-expired': {
      s.members.get(event.member)!.invitationExpired = true;
      break;
    }
    case 'close-acknowledged': {
      const m = s.members.get(event.member);
      if (m) m.closingAck = { t: event.t, comment: event.comment };
      break;
    }
    case 'application-started': {
      notePerson(s, event.person);
      const state: ApplicantState = {
        id: event.applicant,
        person: event.person,
        status: 'started',
        words: null,
        motion: null,
      };
      s.applicants.set(event.applicant, withPerson(s, state));
      s.nextApplicantN += 1;
      break;
    }
    case 'application-verified': {
      s.applicants.get(event.applicant)!.status = 'verified';
      break;
    }
    case 'application-submitted': {
      const a = s.applicants.get(event.applicant)!;
      a.status = 'submitted';
      // the name and picture went to the row when the command ran
      a.words = event.words ?? null;
      break;
    }
    case 'application-proposed': {
      s.applicants.get(event.applicant)!.status = 'proposed';
      touch(s, event.by, event.t);
      break;
    }
    case 'member-admitted': {
      const a = s.applicants.get(event.applicant)!;
      a.status = 'admitted';
      // an application is admitted by an ordinary motion, always the room's
      // act; the member is the same person the application was, so the row
      // — and with it the name and picture they gave — comes with them
      const rec = freshMember(s, event.member, a.person, event.t, event.t,
        { via: 'application', by: 'members' });
      s.members.set(event.member, rec);
      s.nextMemberN += 1;
      break;
    }
    case 'application-refused': {
      s.applicants.get(event.applicant)!.status = 'refused';
      break;
    }
    default:
      throw new Error(`unhandled event '${event.type}'`);
  }
}

/** A carried change lands on the setting, keeping who holds it. */
function applyPayloadSet(s: FoldState, id: SettingId, value: SettingValue,
  by: 'motion' | 'crown', t: number): void {
  const st = readValue(s, id, value);
  st.value = value;
  st.settledBy = by;
  st.settledAtT = t;
  st.returned = []; // this set's own returns follow it (Y26)
  st.collecting = false;
  if (id === 'quorum') s.quorumFormValue = (value as QuorumValue).form;
  if (id === 'link') {
    const slug = (value as SlugValue).slug;
    if (!s.slugHistory.includes(slug)) s.slugHistory.push(slug);
  }
  reseedAnchorsIfLive(s, t, id);
}

/** Does this motion's target sit behind the crown's assent (§9.7)?
 *  v0.54: the assent power specifically — a setting held unilateral-only
 *  applies a carried change with nobody's accept asked. */
export function reservedTarget(s: FoldState, rec: MotionRecord): boolean {
  if (s.crownLapsedFlag) return false;
  if (rec.payload.kind === 'set') {
    return s.settings.get(rec.payload.setting)!.powers.assent;
  }
  // a reserve motion's target is the members' by construction — it lands
  // without assent, the crown's release being delegation (§9.7 v0.52)
  // a text amendment (R-058) waits on nothing either: it is the pen's own
  // act and it has already landed — nobody assents to their own decree
  if (rec.payload.kind === 'reserve' || rec.payload.kind === 'text') return false;
  // an act at a door waits on that door's 🛡️ (entry 94): admissions of
  // every kind on ✉️'s, removals on ❌'s
  return doorPowers(s, rec.payload.kind === 'remove' ? 'door:remove' : 'door:invite').assent;
}

/** §9.7 v0.54: holder derives from powers — the convenor's iff any is held. */
/**
 * `from` (Q524) says where a power *newly held* came from; a power that was
 * already held keeps the source it arrived with, and one being given up
 * loses its source with it. Defaulting to 'founding' is right for every
 * caller but the carried reserve motion, which is the only way a power
 * reaches the convenor from outside.
 */
function setPowers(st: SettingState, powers: Powers,
  from: PowerSource = 'founding'): void {
  const was = st.powers;
  st.powerFrom = {
    unilateral: !powers.unilateral ? null
      : was.unilateral ? st.powerFrom.unilateral : from,
    assent: !powers.assent ? null
      : was.assent ? st.powerFrom.assent : from,
  };
  st.powers = powers;
  st.holder = holderOf(powers);
  // whatever moves a power decides it: a pre-start release that has been
  // spent at 🍾, reclaimed, or overtaken by a delegation is no longer
  // pending anything (R-048)
  st.pendingRelease = { unilateral: false, assent: false };
}

function freshMember(s: FoldState, id: MemberId, person: PersonId, invitedAtT: number,
  arrivedAtT: number | null, arrival: Arrival): MemberRecord {
  const state: MemberState = {
    id, person, invitedAtT, arrivedAtT, arrival,
    removed: false, removedBy: null, lapsed: false, lapseWarned: false, lapseWarnedLead: null,
    nameSet: false, pictureSet: false,
    lastActivityT: arrivedAtT ?? invitedAtT,
    okOwed: new Set(), okGiven: new Set(),
    releasesOwed: new Set(), releasesGiven: new Set(),
    amendmentsOwed: new Set(), amendmentsGiven: new Set(),
    mailGaveUpOwed: new Set(), mailGaveUpGiven: new Set(), mailGaveUp: false,
    invitationExpired: false, closingAck: null,
  };
  return withPerson(s, state);
}

/**
 * **The row, read live** (decision 1253): `email`, `name`, `picture` and
 * `erased` are enumerable getters on the fold's own record, resolving
 * through `people` on every read — so a reader holding a record sees an
 * erasure the moment the row goes, the record stays the one object the
 * fold mutates (a reference taken before a tick is still good after it),
 * and a spread, `JSON.stringify` or a deep-equal sees four plain fields.
 */
function withPerson<T extends { person: PersonId }>(s: FoldState, state: T): T & ResolvedPerson {
  const people = s.people;
  const field = (key: keyof ResolvedPerson): PropertyDescriptor => ({
    enumerable: true,
    get(this: T) { return resolvePerson(people, this.person)[key]; },
  });
  return Object.defineProperties(state, {
    email: field('email'), name: field('name'), picture: field('picture'), erased: field('erased'),
  }) as T & ResolvedPerson;
}

function foldSet(s: FoldState, id: SettingId, value: SettingValue, by: 'convenor' | 'crown',
  t: number): void {
  const st = readValue(s, id, value);
  // holder untouched: setting a value never changes who holds the setting
  // (§9.7 v0.54 — a {unilateral, no-assent} crown must stay exactly that)
  st.collecting = false;
  st.value = value;
  st.settledBy = by === 'crown' ? 'crown' : 'convenor';
  st.settledAtT = t;
  st.returned = []; // this set's own returns follow it (Y26)
}

/**
 * **The fold's one gate on a value** (Q1329): the setting it names must be
 * in the catalogue and the value must be the shape its entry validates —
 * on replay as on a command, since a command validated it once and replay
 * is the only road a value written by an older build can take. Where
 * `foldLegacy` once read the pre-entry-94 shapes onto today's, an unknown
 * id or a stray key now throws with its name, and the host quarantines
 * the document (`DocStore.loadAll`). Returns the setting's state.
 */
function readValue(s: FoldState, id: SettingId, value: SettingValue): SettingState {
  const st = s.settings.get(id);
  if (st === undefined) throw new Error(`unknown setting '${id}' (Q1329: no legacy id is read)`);
  const err = validateFor(entryOf(id), value);
  if (err !== null) throw new Error(`${err} (Q1329: no legacy value is read)`);
  return st;
}

export function touch(s: FoldState, member: MemberId, t: number): void {
  const m = s.members.get(member);
  if (m) { m.lastActivityT = t; m.lapseWarned = false; m.lapseWarnedLead = null; }
  if (member === s.convenor.id) {
    s.convenor.lastActivityT = t;
    s.convenor.lapseWarned = false;
    s.convenor.lapseWarnedLead = null;
  }
}

// -------------------------------------------------------------------------
// Threshold anchors (§4.3): seeded at constituted, reseeded when the room's
// pacing settings settle late (prospective application, NOTES.md).

function computeAnchors(s: FoldState, t: number): ThresholdAnchors {
  const bar = s.settings.get('bar')!.value as PercentValue | null;
  const pace = s.settings.get('pace')!.value as PaceValue | null;
  const ending = s.settings.get('ending')!.value as EndingValue | null;
  const endPct = bar ? bar.pct : 95;
  const endT = ending ? ending.endsAtMs : null;
  const shape: 'fixed' | 'ramp' =
    endT !== null && pace?.shape === 'ramp' ? 'ramp' : 'fixed';
  return seedAnchors(shape, shape === 'ramp' ? (pace as { shape: 'ramp'; startPct: number }).startPct : null,
    endPct, t, endT);
}

function reseedAnchorsIfLive(s: FoldState, t: number, setting: SettingId): void {
  if (s.constitutedT === null || s.anchors === null) return;
  if (setting === 'ending') {
    const ending = s.settings.get('ending')!.value as EndingValue | null;
    s.anchors = reAnchor(s.anchors, t, ending ? ending.endsAtMs : null);
  } else if (setting === 'bar' || setting === 'pace') {
    s.anchors = computeAnchors(s, t);
  }
}

// -------------------------------------------------------------------------
// Two reads the fold makes of its own state, and their other callers: the
// session keeps both names (`doorPowers` is public) as one-line doors.

/** A door's crown pair (entry 94), lapse ignored — a sleeping crown still
 *  holds; callers check the lapse where it bites. */
export function doorPowers(s: FoldState, door: DoorId): Powers {
  return { ...s.settings.get(door)!.powers };
}

/** The fold's half of minting: the counter is rebuilt from every id the log names. */
export function notePerson(s: FoldState, id: PersonId): void {
  const m = /^p-(\d+)$/.exec(id);
  if (m !== null) s.nextPersonN = Math.max(s.nextPersonN, Number(m[1]) + 1);
}
