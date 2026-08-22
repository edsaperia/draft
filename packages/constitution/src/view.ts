/**
 * The blind member-facing projections (SPEC §3.5/§9.0a discipline). Answers
 * ride the log in plaintext; THIS layer is what withholds: a member sees
 * only their own answers, counts for running questions and motions —
 * no names, no split, no running maximum — and distributions (names-off)
 * once resolved. The facade is the only sanctioned member read path:
 * discipline in the mock, security on the server.
 */

import type { ConstitutionSession } from './session.js';
import type { Arrival, MemberId, MotionPayload, PowerSource } from './types.js';
import { holderOf } from './types.js';
import type { MotionRoute, SettingId } from './catalogue.js';
import { CATALOGUE, entryOf } from './catalogue.js';
import type { SettingValue } from './values.js';

export interface QuestionView {
  setting: SettingId;
  glyph: string;
  /** Only once its dependencies have settled is the question answerable. */
  answerable: boolean;
  answeredCount: number;
  electorateSize: number;
  /** Your own committed answer — never anybody else's. */
  myAnswer: SettingValue | null;
}

export interface ResolutionView {
  setting: SettingId;
  value: SettingValue;
  /** The shape of what people asked for, without names (§9.0a). */
  distribution: SettingValue[];
  settledAtT: number;
}

export interface SettingView {
  setting: SettingId;
  glyph: string;
  kind: 'ordinary' | 'constitutional';
  holder: 'convenor' | 'members';
  /** The crown powers held on this setting (§9.7 v0.54). */
  powers: { unilateral: boolean; assent: boolean };
  /** Where each held power came from (Q524): the birth, or a reserve motion. */
  powerFrom: { unilateral: PowerSource | null; assent: PowerSource | null };
  value: SettingValue | null;
  /**
   * What it held before the convenor last set it directly, and their reason
   * (Q530). `previousValue === null` on a settled setting means the founder
   * decided it rather than changed it — which is what the acknowledgement
   * keys on, since nobody is owed a receipt for a first decision.
   */
  previousValue: SettingValue | null;
  setWhy: string | null;
  settledBy: 'convenor' | 'ceremony' | 'motion' | 'crown' | null;
  settledAtT: number | null;
  collecting: boolean;
}

export interface MotionView {
  id: string;
  route: MotionRoute;
  /** The amendment itself is public — what is blind is who stands where. */
  payload: MotionPayload;
  why: string | null;
  status: string;
  mine: boolean;
  /** When it settled — what the record and the clause's history line date. */
  at: number | null;
  /**
   * What a **pen** amendment changed from (Q530): a motion proposes a value
   * and never needs the old one, so this is null on every raised route.
   */
  from: SettingValue | null;
  answeredCount: number;
  electorateSize: number;
  myAnswer: 'accept' | 'keep' | 'abstain' | null;
}

/**
 * A membership row (Q391): the roster is on the screen while you answer
 * (§9.0a) and the pile headings are the people, so the register — names,
 * pictures, who has arrived and who is only invited — is readable by
 * every member. Emails are included: they are how invitees are listed
 * before a name exists, and a small room knows its own addresses.
 */
export interface MemberRowView {
  id: MemberId;
  email: string;
  name: string | null;
  picture: string | null;
  arrived: boolean;
  lapsed: boolean;
  isConvenor: boolean;
  /**
   * How this member got in, and whose act it was (Q524). Public like the rest
   * of the register — a constitution that lists its members can say how each
   * of them came to be one, and it is what lets a member's own 🏛️ grant name
   * who conferred it instead of guessing from who holds the roster.
   */
  arrival: Arrival;
}

export interface ApplicantRowView {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  words: string | null;
  status: string;
  /** The admit motion, once one is open — the page joins it to its race. */
  motion: string | null;
}

export interface RegisterView {
  holder: 'convenor' | 'members';
  powers: { unilateral: boolean; assent: boolean };
}

export interface MemberView {
  gates: { reading: true; proposing: boolean; judging: boolean };
  questions: QuestionView[];
  resolutions: ResolutionView[];
  settings: SettingView[];
  members: MemberRowView[];
  register: RegisterView;
  applicants: ApplicantRowView[];
  owedOks: SettingId[];
  motions: MotionView[];
  myHeldMotion: string | null;
  /** The founder's 👑 questions: a parked motion, or (Q440) a text adoption with `text`. */
  crownTasks: Array<{ id: string; motion: string | null; text?: { candidateId: string; summary: string } }>;
  identity: { name: string | null; picture: string | null };
  lapseWarned: boolean;
  frozen: boolean;
  /** The freeze's shortfall (§9.5): how many must return to thaw; null while not frozen. */
  mustReturn: number | null;
  /** The close (SPEC §4.6): null while open; once closed, when, my own signature, the block. */
  closed: {
    at: number;
    mySignature: { t: number; comment: string } | null;
    signatures: Array<{ member: MemberId; name: string | null; comment: string; t: number }>;
  } | null;
}

const MANAGED = CATALOGUE.filter((e) =>
  e.kind !== 'personal' && e.id !== 'membership' && e.id !== 'startingText');

export function view(s: ConstitutionSession, member: MemberId): MemberView {
  const me = s.memberRecords().get(member) ?? null;
  const isConvenor = member === s.convenorRecord().id;
  const electorateSize = s.motionElectorate().length;

  const questions: QuestionView[] = [];
  const resolutions: ResolutionView[] = [];
  const settings: SettingView[] = [];
  // the Text carries a crown pair like any held-able setting (Q440) but no
  // managed value: its row serves the powers, and nothing else
  {
    const st = s.settingState('startingText');
    settings.push({ setting: 'startingText', glyph: '📄', kind: 'ordinary',
      holder: st.holder, powers: { ...st.powers }, powerFrom: { ...st.powerFrom },
      value: null, previousValue: null, setWhy: null, settledBy: null,
      settledAtT: null, collecting: false });
  }
  for (const entry of MANAGED) {
    const st = s.settingState(entry.id);
    settings.push({
      setting: entry.id,
      glyph: entry.glyph,
      kind: entry.kind as 'ordinary' | 'constitutional',
      holder: st.holder,
      powers: { ...st.powers },
      powerFrom: { ...st.powerFrom },
      value: st.value,
      previousValue: st.previousValue,
      setWhy: st.setWhy,
      settledBy: st.settledBy,
      settledAtT: st.settledAtT,
      collecting: st.collecting,
    });
    if (st.collecting) {
      const answerable = entry.deps.every((d) => s.settingState(d).settledBy !== null);
      // While it runs it can say only how many have answered (§9.0a):
      // any value or running maximum would let the room read itself.
      const eIds = new Set(s.motionElectorate());
      let answered = 0;
      for (const id of st.answers.keys()) if (eIds.has(id)) answered += 1;
      questions.push({
        setting: entry.id,
        glyph: entry.glyph,
        answerable,
        answeredCount: answered,
        electorateSize,
        myAnswer: me ? (st.answers.get(member) ?? null) : null,
      });
    }
    if (st.settledBy === 'ceremony' && st.distribution && st.settledAtT !== null) {
      resolutions.push({
        setting: entry.id,
        value: st.value!,
        distribution: st.distribution,
        settledAtT: st.settledAtT,
      });
    }
  }

  const motions: MotionView[] = [];
  let myHeldMotion: string | null = null;
  for (const rec of s.motionRecords().values()) {
    if ((rec.status === 'running' || rec.status === 'awaiting-crown') &&
      rec.route === 'constitutional' &&
      rec.by === member) {
      myHeldMotion = rec.id;
    }
    motions.push({
      id: rec.id,
      route: rec.route,
      payload: rec.payload,
      why: rec.why,
      status: rec.status,
      mine: rec.by === member,
      at: rec.settledAtT,
      from: s.amendedFrom(rec.id),
      answeredCount: rec.route === 'constitutional' ? rec.answers.size : 0,
      electorateSize,
      myAnswer: rec.answers.get(member) ?? null,
    });
  }

  const rp = s.registerPowers();
  const register: RegisterView = {
    holder: holderOf(rp),
    powers: rp,
  };

  const applicants: ApplicantRowView[] = [];
  for (const a of s.applicantRecords().values()) {
    if (a.status === 'started') continue; // an unverified address is nobody's business yet
    applicants.push({ id: a.id, email: a.email, name: a.name,
      picture: a.picture, words: a.words, status: a.status, motion: a.motion });
  }

  const convenorId = s.convenorRecord().id;
  const members: MemberRowView[] = [];
  for (const rec of s.memberRecords().values()) {
    if (rec.removed) continue;
    members.push({
      id: rec.id,
      email: rec.email,
      name: rec.name,
      picture: rec.picture,
      arrived: rec.arrivedAtT !== null,
      lapsed: rec.lapsed,
      isConvenor: rec.id === convenorId,
      arrival: { ...rec.arrival },
    });
  }

  return {
    gates: {
      reading: true,
      proposing: me ? s.canPropose(member) : false,
      judging: s.canJudge(),
    },
    questions,
    resolutions,
    settings,
    members,
    register,
    applicants,
    owedOks: me ? [...me.okOwed] : [],
    motions,
    myHeldMotion,
    crownTasks: isConvenor
      ? [...s.crownQuestionRecords().values()]
          .filter((q) => q.status === 'pending')
          .map((q) => ({ id: q.id, motion: q.motion, ...(q.text ? { text: q.text } : {}) }))
      : [],
    identity: me
      ? { name: me.name, picture: me.picture }
      : isConvenor
        ? { name: s.convenorRecord().name, picture: s.convenorRecord().picture }
        : { name: null, picture: null },
    lapseWarned: me ? me.lapseWarned : isConvenor ? s.convenorRecord().lapseWarned : false,
    frozen: s.frozen,
    mustReturn: s.mustReturn(),
    closed: s.closed
      ? {
          at: s.closedAt!,
          mySignature: me && me.closingAck ? me.closingAck : null,
          signatures: s.closingSignatures(),
        }
      : null,
  };
}

/** The head of the document (§9.6a): who convened it, when it was constituted, the rules. */
export function constitutionBlock(s: ConstitutionSession): {
  convenor: { name: string | null; picture: string | null; crowned: boolean };
  constitutedAtT: number | null;
  rules: Array<{ setting: SettingId; glyph: string; value: SettingValue | null;
    holder: 'convenor' | 'members' }>;
} {
  const c = s.convenorRecord();
  const member = s.memberRecords().get(c.id);
  return {
    convenor: {
      name: member ? member.name : c.name,
      picture: member ? member.picture : c.picture,
      crowned: s.crowned(), // any reservation (Q379 wide), sleeping or not
    },
    constitutedAtT: s.constitutedAtT,
    rules: MANAGED
      .filter((e) => e.kind === 'constitutional')
      .map((e) => {
        const st = s.settingState(e.id);
        return { setting: e.id, glyph: e.glyph, value: st.value, holder: st.holder };
      }),
  };
}

/** Every current typed value plus provenance — the host-facing room summary. */
export function roomSettings(s: ConstitutionSession): Record<string, {
  value: SettingValue | null;
  settledBy: string | null;
  holder: string;
}> {
  const out: Record<string, { value: SettingValue | null; settledBy: string | null;
    holder: string }> = {};
  for (const entry of MANAGED) {
    const st = s.settingState(entry.id);
    out[entry.id] = { value: st.value, settledBy: st.settledBy, holder: st.holder };
  }
  return out;
}

export { entryOf };
