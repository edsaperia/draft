/**
 * The command whitelist (Q368): the only writes the API accepts, each
 * dispatched with the *authenticated* actor — a request body never names
 * who is acting, which is what makes the blindness discipline hold on a
 * server (view() is the only read, the cookie is the only identity). The
 * module underneath re-validates everything; this table only shapes the
 * call and says who may make it.
 */
import type { ConstitutionSession } from '../../constitution/src/index.js';
import type { EngineBridge } from '../../constitution/src/engine-bridge.js';
import type {
  MotionAnswer, MotionPayload, Power, SettingId, SettingValue,
} from '../../constitution/src/index.js';

export interface Actor {
  memberId: string;
  isFounder: boolean;
}

type Args = Record<string, unknown>;
type Handler = (cs: ConstitutionSession, actor: Actor, t: number, args: Args,
  bridge: EngineBridge | null) => unknown;

const str = (args: Args, key: string): string => {
  const v = args[key];
  if (typeof v !== 'string') throw new Error(`'${key}' must be a string`);
  return v;
};

function founderOnly(actor: Actor): void {
  if (!actor.isFounder) throw new Error('only the founder may do that');
}

const HANDLERS: Record<string, Handler> = {
  /* -- the founder's hand (the module enforces powers and timing) -------- */
  'set-setting': (cs, a, t, args) => {
    founderOnly(a);
    cs.setSetting(t, str(args, 'setting') as SettingId, args.value as SettingValue);
  },
  'delegate': (cs, a, t, args) => {
    founderOnly(a);
    cs.delegate(t, str(args, 'setting') as SettingId);
  },
  'relinquish': (cs, a, t, args) => {
    founderOnly(a);
    cs.relinquish(t, str(args, 'setting') as SettingId, str(args, 'power') as Power);
  },
  'reclaim': (cs, a, t, args) => {
    founderOnly(a);
    cs.reclaim(t, str(args, 'setting') as SettingId);
  },
  'confirm-starting-text': (cs, a, t, args) => {
    founderOnly(a);
    cs.confirmStartingText(t, str(args, 'text'));
  },
  'set-convenor-membership': (cs, a, t, args) => {
    founderOnly(a);
    cs.setConvenorMembership(t, args.isMember === true);
  },
  'set-quorum-form': (cs, a, t, args) => {
    founderOnly(a);
    cs.setQuorumForm(t, str(args, 'form') as 'count' | 'share');
  },
  'invite': (cs, a, t, args) => {
    founderOnly(a);
    return cs.invite(t, str(args, 'email'));
  },
  'uninvite': (cs, a, t, args) => {
    founderOnly(a);
    cs.uninvite(t, str(args, 'member'));
  },
  'answer-crown-question': (cs, a, t, args) => {
    founderOnly(a);
    cs.answerCrownQuestion(t, str(args, 'question'),
      str(args, 'outcome') as 'accept' | 'reject');
  },
  /* -- any authenticated seat (self-scoped by construction) ------------- */
  'set-identity': (cs, a, t, args) => {
    const identity: { name?: string | null; picture?: string | null } = {};
    if ('name' in args) identity.name = args.name as string | null;
    if ('picture' in args) identity.picture = args.picture as string | null;
    cs.setIdentity(t, a.memberId, identity);
  },
  'answer': (cs, a, t, args) => {
    cs.answer(t, a.memberId, str(args, 'setting') as SettingId,
      args.value as SettingValue);
  },
  'give-ok': (cs, a, t, args) => {
    cs.giveOk(t, a.memberId, str(args, 'setting') as SettingId);
  },
  'open-motion': (cs, a, t, args, bridge) => {
    const why = typeof args.why === 'string' ? args.why : undefined;
    const payload = args.payload as MotionPayload;
    // a live document's set-motions go through the bridge (Q391): an
    // ordinary route stakes and races in the engine; a constitutional one
    // opens the unanimity vote exactly as before
    if (bridge !== null && payload.kind === 'set') {
      return bridge.openSetMotion(t, a.memberId, payload.setting, payload.value, why).motion;
    }
    return cs.openMotion(t, a.memberId, payload, why);
  },
  'answer-motion': (cs, a, t, args) => {
    cs.answerMotion(t, a.memberId, str(args, 'motion'),
      str(args, 'answer') as MotionAnswer);
  },
  'withdraw-motion': (cs, a, t, args, bridge) => {
    if (bridge !== null) bridge.withdrawMotion(t, a.memberId, str(args, 'motion'));
    else cs.withdrawMotion(t, a.memberId, str(args, 'motion'));
  },
  /* -- judging a served race card (Q391): ids come from the view's cards - */
  'judge-race': (cs, a, t, args, bridge) => {
    if (bridge === null) throw new Error('nothing is racing yet');
    const outcome = str(args, 'outcome');
    if (outcome !== 'a' && outcome !== 'b' && outcome !== 'tie') {
      throw new Error("outcome must be 'a', 'b' or 'tie'");
    }
    bridge.judge(t, a.memberId, str(args, 'a'), str(args, 'b'), outcome);
  },
  'propose-applicant': (cs, a, t, args, bridge) => {
    const why = typeof args.why === 'string' && args.why.trim() !== ''
      ? args.why : undefined;
    if (bridge !== null) {
      bridge.proposeApplicant(t, a.memberId, str(args, 'applicant'), why);
    } else {
      cs.proposeApplicant(t, a.memberId, str(args, 'applicant'), why);
    }
  },
  'sign-out': (cs, a, t, args) => {
    cs.signOut(t, a.memberId, str(args, 'mode') as 'holding' | 'abstaining');
  },
};

export function runCommand(
  cs: ConstitutionSession,
  actor: Actor,
  t: number,
  cmd: string,
  args: Args,
  bridge: EngineBridge | null = null,
): unknown {
  const handler = HANDLERS[cmd];
  if (!handler) throw new Error(`unknown command '${cmd}'`);
  return handler(cs, actor, t, args, bridge);
}
