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
  MotionAnswer, MotionPayload, Power, PowerKey, SettingId, SettingValue,
} from '../../constitution/src/index.js';
import type { PatchSet } from '../../engine-core/src/text/types.js';
import { emojiFaceOf } from './faces.js';

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
  // the picture cap is set for what the page now encodes (Q735): a 256px
  // JPEG at quality 0.8, base64'd, lands around 10–25KB. It was 150,000 —
  // ~112KB of image — chosen for a browser handing over a raw camera file,
  // which nothing does any more. Nothing historical needs tolerating (Ed,
  // 2026-08-23: alpha, no real documents), and the log's growth is bounded
  // by the rule as well as by the client.
  text: 500_000, picture: 40_000, slug: 80,
} as const;

export const cap = (value: string, max: number, what: string): string => {
  if (value.length > max) throw new Error(`${what} is too long (${max} characters at most)`);
  // a NUL byte is accepted by a file and refused by Postgres (review #2,
  // finding 6); the two stores must see the same bytes, and no text a
  // member means to write contains one
  if (value.includes('\u0000')) throw new Error(`${what} contains a NUL character`);
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
 * must never hold a string that could read as markup or CSS): one emoji
 * grapheme, or an uploaded data-URI image. **Two shapes, since Q734** —
 * the grounds `c0`–`c5` and the drawn marks `m0`–`m2` left the picker, and
 * they are refused here rather than merely un-offered, because nothing
 * historical needs tolerating (Ed, 2026-08-23: alpha, no real documents)
 * and a format the surface cannot make is one nothing should accept.
 */
export const validPicture = (pic: string): string => {
  cap(pic, LIMITS.picture, 'the picture');
  if (pic.startsWith('e')) {
    // the page's own rule (setup.js emojiFaceOf, finding 19): one grapheme,
    // pictographic, and never the surface's furniture — ✏️ is not a face
    if (pic.length > 33 || /[<>"'&\\]/.test(pic)) throw new Error('unrecognised picture format');
    const face = emojiFaceOf(pic.slice(1));
    if (face === null) throw new Error('a face is one emoji');
    if (face === 'reserved') throw new Error('that emoji is part of the furniture');
    return pic;
  }
  const ok = /^udata:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(pic);
  if (!ok) throw new Error('unrecognised picture format');
  return pic;
};

/**
 * One emoji, one member, first come first served (finding 19): the page
 * greys a taken face; the server refuses it, with the same words, so the
 * API cannot claim what the picker will not offer. Exact match on the
 * stored string — 👩🏻 and 👩🏽 are both claimable.
 */
export function faceTakenBy(cs: ConstitutionSession, pic: string, self: string): string | null {
  if (!pic.startsWith('e')) return null;
  const conv = cs.convenorRecord();
  if (conv.id !== self && conv.picture === pic) return conv.name ?? 'Somebody';
  for (const m of cs.memberRecords().values()) {
    if (m.id === self || m.removed) continue;
    if (m.picture === pic) return m.name ?? 'Somebody';
  }
  for (const a of cs.applicantRecords().values()) {
    if (a.id === self || a.status === 'refused' || a.status === 'admitted') continue;
    if (a.picture === pic) return a.name ?? 'Somebody';
  }
  return null;
}

const refuseTaken = (cs: ConstitutionSession, pic: string, self: string): string => {
  const holder = faceTakenBy(cs, pic, self);
  if (holder !== null) throw new Error(`Taken — ${holder} got there first.`);
  return pic;
};

/** A patch as the page sends it: line hunks against a stated version. */
function patchOf(args: Args): PatchSet {
  const baseVersion = args.baseVersion;
  if (typeof baseVersion !== 'number' || !Number.isInteger(baseVersion) || baseVersion < 0) {
    throw new Error("'baseVersion' must be a non-negative integer");
  }
  if (!Array.isArray(args.hunks) || args.hunks.length === 0 || args.hunks.length > 200) {
    throw new Error("'hunks' must be a non-empty list");
  }
  let total = 0;
  const hunks = args.hunks.map((h: unknown) => {
    if (h === null || typeof h !== 'object') throw new Error('a hunk is an object');
    const { start, end, lines } = h as Record<string, unknown>;
    if (typeof start !== 'number' || typeof end !== 'number' ||
        !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start) {
      throw new Error('a hunk needs integer start ≤ end, both ≥ 0');
    }
    if (!Array.isArray(lines) || !lines.every((l) => typeof l === 'string')) {
      throw new Error("a hunk's lines are strings");
    }
    for (const l of lines as string[]) {
      cap(l, LIMITS.text, 'the text');
      if (l.includes('\n')) throw new Error('a line holds no newline');
      total += l.length + 1;
    }
    if (total > LIMITS.text) throw new Error(`the text is too long (${LIMITS.text} characters at most)`);
    return { start, end, lines: lines as string[] };
  });
  return { baseVersion, hunks };
}

/**
 * 🍾's power switches as the card collected them (entry 158): a list of
 * `{ setting, power }`, or nothing at all where the press carried none —
 * and the two are different answers, an empty list keeping every power where
 * an absent one lays the Text's pair down. Shape only; the module validates
 * the keys against `HELD` and is the backstop, not this door.
 */
function laidDownOf(args: Args): Array<{ setting: PowerKey; power: Power }> | undefined {
  const raw = args.laidDown;
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) throw new Error("'laidDown' must be a list");
  if (raw.length > 64) throw new Error("'laidDown' names too many powers");
  return raw.map((r: unknown) => {
    if (r === null || typeof r !== 'object') throw new Error('a laid-down power is an object');
    const { setting, power } = r as Record<string, unknown>;
    if (typeof setting !== 'string' || setting === '') throw new Error('a laid-down power names a setting');
    if (power !== 'unilateral' && power !== 'assent') {
      throw new Error("a power is 'unilateral' or 'assent'");
    }
    return { setting: setting as PowerKey, power };
  });
}

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
    // the reason for a change (Q530) rides the same optional-and-capped
    // shape every other rationale on this surface uses; blank is real, and
    // the module drops an empty one so the event is unchanged without it
    cs.setSetting(t, str(args, 'setting') as SettingId,
      capValue(args.value as SettingValue, 'that value'),
      typeof args.why === 'string' ? cap(args.why, LIMITS.why, 'the reason') : undefined);
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
  // 🍾 — the founder's explicit act of starting the document (Q443): the
  // module refuses while a judge-gate setting is still being decided, and
  // names it; the readiness readout in the founder's view says who is
  // holding it up. Informs, never blocks: nobody else's answer is waited on.
  // …and it carries what the card's power switches collected (entry 158):
  // one act, one list, one `t`, so the whole batch is one news card.
  'begin': (cs, a, t, args) => {
    founderOnly(a);
    cs.begin(t, laidDownOf(args));
  },
  'set-convenor-membership': (cs, a, t, args) => {
    founderOnly(a);
    cs.setConvenorMembership(t, args.isMember === true);
  },
  'set-quorum-form': (cs, a, t, args) => {
    founderOnly(a);
    cs.setQuorumForm(t, str(args, 'form') as 'count' | 'share');
  },
  // a direct invitation is the founder's, or any member's while 🪪 stands at
  // ✒️ (entry 94) — the module holds the one gate, the seat says whose word
  'invite': (cs, a, t, args) => {
    return cs.invite(t, emailOk(str(args, 'email')), a.memberId);
  },
  'uninvite': (cs, a, t, args) => {
    founderOnly(a);
    cs.uninvite(t, str(args, 'member'));
  },
  // ❌'s ✒️: exile at will, immediate (entry 94)
  'remove': (cs, a, t, args) => {
    founderOnly(a);
    cs.remove(t, str(args, 'member'));
  },
  // resignation: free, immediate, nobody's to refuse (entry 94)
  'resign': (cs, a, t) => {
    cs.resign(t, a.memberId);
  },
  'answer-crown-question': (cs, a, t, args, bridge) => {
    founderOnly(a);
    const question = str(args, 'question');
    const outcome = str(args, 'outcome') as 'accept' | 'reject';
    // A text question's answer has an engine half (R-056): accept adopts the
    // parked candidate, refuse retires it. The bridge does both; without one
    // — a document with no engine yet — the constitution alone, which is all
    // there is to record.
    if (bridge) bridge.answerCrownQuestion(t, question, outcome);
    else cs.answerCrownQuestion(t, question, outcome);
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
        : refuseTaken(cs, validPicture(str(args, 'picture')), a.memberId);
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
  // the OK on one act's worth of laid-down powers (entry 162): the whitelist
  // injects the actor, so the body names the batch and nothing else
  'ack-release': (cs, a, t, args) => {
    cs.ackRelease(t, a.memberId, str(args, 'batch'));
  },
  // the OK on one sender pass's dead mail (SURFACE E34), the same shape: the
  // whitelist injects the actor, so the body names the batch and nothing else
  'ack-mail-gave-up': (cs, a, t, args) => {
    cs.ackMailGaveUp(t, a.memberId, str(args, 'batch'));
  },
  // 📨 — E34 says the gave-up row is *the founder's ✉️ row*, so the re-send is
  // theirs. Entry 94 lets any member invite while 🪪 stands at ✒️, and
  // widening this to match is a surface ruling nobody has made (Q1031).
  'resend-invite': (cs, a, t, args) => {
    founderOnly(a);
    cs.resendInvite(t, str(args, 'member'), a.memberId);
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
  /* -- a text proposal (stage 8, Q418): a patch over the document's lines,
     raced in the engine like any candidate; the stake is the engine's ---- */
  'propose-text': (cs, a, t, args, bridge) => {
    if (bridge === null) throw new Error('the document has not begun');
    const why = typeof args.why === 'string' ? cap(args.why, LIMITS.why, 'the rationale') : '';
    // **The server is the narrow gate** (Q770, the Q812 rule): signing is
    // offered under the two elective rungs and refused under every other, so
    // a stale page cannot sign a proposal the document names anyway (public)
    // or promised never to name (anonymous, sealed).
    const signed = args.signed === true;
    if (signed) {
      const rung = (cs.settingState('authorship').value as { rung?: string } | null)?.rung;
      if (rung !== 'anonymousElective' && rung !== 'sealedElective') {
        throw new Error("signing is not offered under this document's anonymity rule (§3.5a)");
      }
    }
    return bridge.proposeText(t, a.memberId, patchOf(args), why, signed);
  },
  /* -- ✒️ on the Text (R-058, entry 160): the Founder's amendment passes the
     instant it is submitted. **No `signed` argument** — the office signs, not
     a person, and 👤's elective ladder is about members' proposals; the record
     names *The Founder* off the pen route. The module re-validates everything;
     this table only shapes the call. ------------------------------------- */
  'pen-text': (cs, a, t, args, bridge) => {
    if (bridge === null) throw new Error('the document has not begun');
    const why = typeof args.why === 'string' ? cap(args.why, LIMITS.why, 'the reason') : '';
    return bridge.penText(t, a.memberId, patchOf(args), why);
  },
  'withdraw-text': (cs, a, t, args, bridge) => {
    if (bridge === null) throw new Error('the document has not begun');
    bridge.withdrawText(t, a.memberId, str(args, 'candidate'));
  },
  /* -- the close (SPEC §4.6): OK on the 🥂 card is the signature, the
     comment its rationale — freely blank, once, on the member's own clock */
  'acknowledge-close': (cs, a, t, args) => {
    const comment = typeof args.comment === 'string'
      ? cap(args.comment, LIMITS.why, 'the closing comment') : '';
    cs.acknowledgeClose(t, a.memberId, comment);
  },
  'sign-out': (cs, a, t, args) => {
    cs.signOut(t, a.memberId, str(args, 'mode') as 'holding' | 'abstaining');
  },
  /* -- an applicant's one act (§9.7½): submit — nothing else speaks for them */
  'submit-application': (cs, a, t, args) => {
    const applicant = applicantOnly(a);
    const fields: { name?: string; picture?: string; words?: string } = {};
    if (typeof args.name === 'string') fields.name = cap(args.name, LIMITS.name, 'the name');
    if (typeof args.picture === 'string') {
      fields.picture = refuseTaken(cs, validPicture(args.picture), applicant);
    }
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
