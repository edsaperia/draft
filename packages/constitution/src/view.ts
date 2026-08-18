/**
 * The blind member-facing projections (SPEC §3.5/§9.0a discipline). Answers
 * ride the log in plaintext; THIS layer is what withholds: a member sees
 * only their own answers, counts for running questions and motions —
 * no names, no split, no running maximum — and distributions (names-off)
 * once resolved. The facade is the only sanctioned member read path:
 * discipline in the mock, security on the server.
 */

import type { ConstitutionSession } from './session.js';
import type { MemberId, MotionPayload } from './types.js';
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
  value: SettingValue | null;
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
  answeredCount: number;
  electorateSize: number;
  myAnswer: 'accept' | 'keep' | 'abstain' | null;
}

export interface MemberView {
  gates: { reading: true; proposing: boolean; judging: boolean };
  questions: QuestionView[];
  resolutions: ResolutionView[];
  settings: SettingView[];
  owedOks: SettingId[];
  motions: MotionView[];
  myHeldMotion: string | null;
  crownTasks: Array<{ id: string; motion: string }>;
  identity: { name: string | null; picture: string | null };
  lapseWarned: boolean;
  frozen: boolean;
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
  for (const entry of MANAGED) {
    const st = s.settingState(entry.id);
    settings.push({
      setting: entry.id,
      glyph: entry.glyph,
      kind: entry.kind as 'ordinary' | 'constitutional',
      holder: st.holder,
      value: st.value,
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
    if (rec.status === 'running' && rec.route === 'constitutional' &&
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
      answeredCount: rec.route === 'constitutional' ? rec.answers.size : 0,
      electorateSize,
      myAnswer: rec.answers.get(member) ?? null,
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
    owedOks: me ? [...me.okOwed] : [],
    motions,
    myHeldMotion,
    crownTasks: isConvenor
      ? [...s.crownQuestionRecords().values()]
          .filter((q) => q.status === 'pending')
          .map((q) => ({ id: q.id, motion: q.motion }))
      : [],
    identity: me
      ? { name: me.name, picture: me.picture }
      : isConvenor
        ? { name: s.convenorRecord().name, picture: s.convenorRecord().picture }
        : { name: null, picture: null },
    lapseWarned: me ? me.lapseWarned : isConvenor ? s.convenorRecord().lapseWarned : false,
    frozen: s.frozen,
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
      crowned: s.membershipReserved(),
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
