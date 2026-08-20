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
  /** Set when the cookie names an applicant seat (`app:<id>`), not a member. */
  applicantId: string | null;
}

type Args = Record<string, unknown>;
type Handler = (cs: ConstitutionSession, actor: Actor, t: number, args: Args,
  bridge: EngineBridge | null) => unknown;

/** The one string validator (server.ts wraps it with allowEmpty=false). */
export const str = (args: Args, key: string, allowEmpty = true): string => {
  const v = args[key];
  if (typeof v !== 'string' || (!allowEmpty && v.length === 0)) {
    throw new Error(`'${key}' must be a ${allowEmpty ? '' : 'non-empty '}string`);
  }
  return v;
};

/**
 * Length caps (PRODUCTION.md stage 3, defect 5): every string accepted
 * here is written permanently into an append-only log, so nothing
 * unbounded may pass. The caps are generous — they exist to stop abuse,
 * never prose.
 */
export const LIMITS = {
  email: 254, name: 80, title: 200, why: 5_000, words: 2_000,
  text: 500_000, picture: 150_000,
} as const;

export const cap = (value: string, max: number, what: string): string => {
  if (value.length > max) throw new Error(`${what} is too long (${max} characters at most)`);
  return value;
};

export const emailOk = (email: string): string => {
  if (email.length > LIMITS.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('that does not look like an email address');
  }
  // one address, one member (§9.7½) only holds if case cannot mint two
  // seats (review #1, finding 18); comparisons lowercase too
  return email.toLowerCase();
};

/**
 * A setting value or motion payload is a small structured thing (review
 * #1, finding 3): every string inside is bounded, and the whole is
 * bounded, because it is written permanently into the log and shipped in
 * every member's view on every poll.
 */
export const capValue = <T>(value: T, what: string): T => {
  if (JSON.stringify(value ?? null).length > 2_000) {
    throw new Error(`${what} is too large`);
  }
  const walk = (v: unknown): void => {
    if (typeof v === 'string') { cap(v, LIMITS.email, what); return; }
    if (v !== null && typeof v === 'object') {
      for (const inner of Object.values(v)) walk(inner);
    }
  };
  walk(value);
  return value;
};

/**
 * A picture is one of the page's own stored formats and nothing else
 * (defect 4: avHtml interpolates it into a style attribute, so the store
 * must never hold a string that could read as markup or CSS): a ground
 * index, a mark index, one emoji grapheme, or an uploaded data-URI image.
 */
export const validPicture = (pic: string): string => {
  cap(pic, LIMITS.picture, 'the picture');
  // the ranges are the page's own arrays (setup.js GROUNDS ×6, MARKS ×3):
  // an index past the end threw inside every member's render (finding 2)
  const ok = /^c[0-5]$/.test(pic) || /^m[0-2]$/.test(pic) ||
    (pic.startsWith('e') && pic.length >= 2 && pic.length <= 33 && !/[<>"'&\\]/.test(pic)) ||
    /^udata:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(pic);
  if (!ok) throw new Error('unrecognised picture format');
  return pic;
};

function founderOnly(actor: Actor): void {
  if (!actor.isFounder) throw new Error('only the founder may do that');
}

function applicantOnly(actor: Actor): string {
  if (actor.applicantId === null) throw new Error('only an applicant may do that');
  return actor.applicantId;
}

const HANDLERS: Record<string, Handler> = {
  /* -- the founder's hand (the module enforces powers and timing) -------- */
  'set-setting': (cs, a, t, args) => {
    founderOnly(a);
    cs.setSetting(t, str(args, 'setting') as SettingId,
      capValue(args.value as SettingValue, 'that value'));
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
    cs.confirmStartingText(t, cap(str(args, 'text'), LIMITS.text, 'the text'));
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
    return cs.invite(t, emailOk(str(args, 'email')));
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
    if ('name' in args) {
      identity.name = args.name === null ? null
        : cap(str(args, 'name'), LIMITS.name, 'the name');
    }
    if ('picture' in args) {
      identity.picture = args.picture === null ? null
        : validPicture(str(args, 'picture'));
    }
    cs.setIdentity(t, a.memberId, identity);
  },
  'answer': (cs, a, t, args) => {
    cs.answer(t, a.memberId, str(args, 'setting') as SettingId,
      capValue(args.value as SettingValue, 'that answer'));
  },
  'give-ok': (cs, a, t, args) => {
    cs.giveOk(t, a.memberId, str(args, 'setting') as SettingId);
  },
  'open-motion': (cs, a, t, args, bridge) => {
    const why = typeof args.why === 'string'
      ? cap(args.why, LIMITS.why, 'the rationale') : undefined;
    const payload = capValue(args.payload as MotionPayload, 'that proposal');
    if (payload !== null && typeof payload === 'object' &&
        payload.kind === 'invite') emailOk(str(payload as never, 'email'));
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
      ? cap(args.why, LIMITS.why, 'the rationale') : undefined;
    if (bridge !== null) {
      bridge.proposeApplicant(t, a.memberId, str(args, 'applicant'), why);
    } else {
      cs.proposeApplicant(t, a.memberId, str(args, 'applicant'), why);
    }
  },
  'sign-out': (cs, a, t, args) => {
    cs.signOut(t, a.memberId, str(args, 'mode') as 'holding' | 'abstaining');
  },
  /* -- an applicant's one act (§9.7½): submit — nothing else speaks for them */
  'submit-application': (cs, a, t, args) => {
    const applicant = applicantOnly(a);
    const fields: { name?: string; picture?: string; words?: string } = {};
    if (typeof args.name === 'string') fields.name = cap(args.name, LIMITS.name, 'the name');
    if (typeof args.picture === 'string') fields.picture = validPicture(args.picture);
    if (typeof args.words === 'string') fields.words = cap(args.words, LIMITS.words, 'the words');
    cs.submitApplication(t, applicant, fields);
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
