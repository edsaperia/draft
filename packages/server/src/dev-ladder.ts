/**
 * **The phase ladder** (Q674–Q678): one dev control that walks a *real*
 * document through its whole life, a phase per press — birth, constitution,
 * ready, session, closing, closed.
 *
 * It exists because every surface state this project has built is otherwise
 * reachable only by living through it. `⏩ settle the founding` is the one
 * exception and it drives the fixture, which never reaches `hydrateS`, never
 * polls and never sends a command — so a session with twenty members and
 * thirty live proposals, a document five minutes from its close, and a closed
 * one with signatures on it have never been looked at on the live path at all.
 *
 * **History is written, not waited for.** Both state machines assert only that
 * event timestamps are non-decreasing; nothing requires one to be `Date.now()`.
 * So a document with a real past is built by writing that past at backdated
 * timestamps, stepping in cooldown-sized increments so adoption batches
 * genuinely fire. The document is then really three hours old: the threshold
 * ramp really is part-way up, the drip really has paid out, the metronome
 * really has run, and the server's own minute tick carries on from now with no
 * seam. Three rules hold it together, each of which would otherwise produce a
 * document that looks right and is quietly wrong:
 *
 *  - **The window is centred, not trailing.** The ramp runs from
 *    `constitutedAtT` to the ending, so a document born three hours ago and
 *    ending in five minutes sits at the very top of its ramp: nothing new
 *    adopts and every race card reads as maximally close. The session rung
 *    claims `now − 3h → now + 3h`, which puts it genuinely mid-ramp.
 *  - **Nothing is stamped later than real now**, or `tOf`'s clamp drags every
 *    later command into the future with it. Every write goes through `Pen`,
 *    whose ceiling is that rule; out of room it stands still, since equal
 *    timestamps are legal and standing still is always safe.
 *  - **And nothing may be written into a past that has been spent.** Reading a
 *    document is a write — presence stamps `now` (§9.5a) — so merely looking
 *    at one pins its log to the present, and since the bar reloads after every
 *    press that happened between every pair of them. A ladder document's clock
 *    is therefore the ladder's: the view path skips presence for it (Q681).
 *  - **The ending never moves behind the log.** Both closes stamp themselves at
 *    the *ending* rather than at t, so an ending behind the last event is
 *    refused (Q679) — the closed rung sets the ending to the instant it is
 *    writing at, which is legal, since non-decreasing allows equal.
 *
 * Dev only, and absent from the production artifact: this module is reached
 * solely through a dynamic `import()` inside a `DEV:`-labelled block, which
 * esbuild's `dropLabels` removes bodily, so nothing here — the cast, the
 * charter, the shuffler — is ever resolved into the bundle.
 */
import { randomBytes } from 'node:crypto';
import { EngineBridge } from '../../constitution/src/engine-bridge.js';
import { CATALOGUE } from '../../constitution/src/index.js';
import type { SettingId, SettingValue } from '../../constitution/src/index.js';
import type { ConstitutionSession } from '../../constitution/src/index.js';
import type { LoadedDoc } from './store.js';
import type { DocStore } from './store.js';
import { asEngineDoc } from './engine-host.js';
import { FACE_EMOJI } from './faces.js';
import { CHARTER_LINES, CHARTER_TEXT, REWRITES } from './dev-ladder-charter.js';

// ---------------------------------------------------------------------------
// The rungs

export const RUNGS = ['birth', 'constitution', 'ready', 'session', 'closing', 'closed'] as const;
export type Rung = (typeof RUNGS)[number];

const HOUR = 3600_000;
const MINUTE = 60_000;
/** How far back the ladder reaches for a session's past, and forward for its future. */
const WINDOW = 3 * HOUR;
/** What "closes in five minutes" means. */
const CLOSING_IN = 5 * MINUTE;
/** Inside this, a document reads as closing rather than merely windowed. */
const CLOSING_WITHIN = 15 * MINUTE;

/**
 * Where a document stands, derived from the document itself rather than
 * remembered anywhere. That is what lets the bar label its own button on any
 * document, ladder-built or not, and it means the ladder keeps no state of its
 * own beyond the seed — which rides the slug.
 */
export function phaseOf(doc: LoadedDoc | null, nowMs: number): Rung {
  if (doc === null) return 'birth';
  const cs = doc.cs;
  if (cs.closed) return 'closed';
  if (cs.constitutedAtT === null) return cs.readiness().ready ? 'ready' : 'constitution';
  const ending = cs.settingState('ending')?.value as { endsAtMs: number | null } | null;
  const ends = ending?.endsAtMs ?? null;
  return ends !== null && ends - nowMs <= CLOSING_WITHIN ? 'closing' : 'session';
}

// ---------------------------------------------------------------------------
// Seeded randomness — the seed rides the slug, so it is reproducible and
// visible, and the ladder needs no store of its own to remember it.

/** mulberry32: small, seeded, and good enough to pick radio buttons with. */
function rngOf(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(rnd: () => number, xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]!;
const between = (rnd: () => number, lo: number, hi: number): number =>
  lo + Math.floor(rnd() * (hi - lo + 1));

export const slugForSeed = (seed: number): string => `ladder-${(seed >>> 0).toString(36)}`;

/** The seed a ladder document was built with, read back off its own address. */
export function seedOfSlug(slug: string): number | null {
  const m = /^ladder-([0-9a-z]+)(?:-\d+)?$/.exec(slug);
  if (m === null) return null;
  const n = parseInt(m[1]!, 36);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// The cast — twenty members of the Hollow Oak Club, at addresses that can
// never receive mail (Q680), which is what silences twenty invitations, an
// admission and a close without a single send.

const CAST_NAMES = [
  'Ash Bellamy', 'Ivy Fen', 'Moss Whitlow', 'Bram Aldercott', 'Nell Sowerby',
  'Corin Hale', 'Wren Pettifer', 'Osric Vane', 'Tamsin Rook', 'Emlyn Crake',
  'Dilys Marchmont', 'Fenn Ottaway', 'Sorrel Bligh', 'Hesper Nye', 'Rufus Quill',
  'Perrin Dace', 'Alys Thorne', 'Gideon Marsh', 'Verity Combe', 'Linnet Frayne',
] as const;

const addressOf = (i: number): string =>
  `${CAST_NAMES[i]!.split(' ')[0]!.toLowerCase()}@ladder.invalid`;

// ---------------------------------------------------------------------------
// The shuffler — a legal constitution, drawn from the catalogue, clamped to
// what a document can actually live under.

/**
 * A value per setting, and which of them the founder hands over.
 *
 * Generated from the catalogue (Q676), so a setting added next month is
 * randomised the day it is added — but each draw is clamped to a *liveable*
 * range rather than the full legal one. The difference matters: a bar of 100
 * means nothing ever adopts, a count quorum above E freezes the document at
 * 🍾, a grant of 0 means nobody can propose, and a drip of a fraction of a
 * minute turns wallet accrual into an unbounded loop. All legal; all dead.
 *
 * Two settings the ladder keeps rather than randomises, because its own rungs
 * are defined in terms of them: **⏰**, which is the ladder's clock, and **🤝**,
 * which decides whether an application exists to look at at all — drawn from
 * the two rungs that produce one.
 */
function shuffle(rnd: () => number, endsAtMs: number): {
  values: Map<SettingId, SettingValue>;
  delegated: Set<SettingId>;
} {
  const values = new Map<SettingId, SettingValue>();
  const delegated = new Set<SettingId>();
  const ladderOwns = new Set<SettingId>(['ending', 'applications']);
  const skip = new Set<SettingId>(['title', 'link', 'startingText',
    'displayName', 'picture']);

  values.set('ending', { endsAtMs });
  values.set('applications', { apply: true });

  for (const entry of CATALOGUE) {
    if (skip.has(entry.id) || ladderOwns.has(entry.id)) continue;
    values.set(entry.id, drawFor(entry.id, entry.valueType, entry.rungs, rnd));
    // delegation is the state of holding neither power; roughly two in five,
    // so the blind founding, the 👑 route and the crown question are all live
    if (entry.delegable && rnd() < 0.4) delegated.add(entry.id);
  }
  return { values, delegated };
}

function drawFor(id: SettingId, valueType: string, rungs: readonly string[] | undefined,
  rnd: () => number): SettingValue {
  switch (valueType) {
    case 'percent': // 🌡️ — high enough to mean something, low enough to be cleared
      return { pct: between(rnd, 60, 75) };
    case 'pace': // 🪜 — mostly a ramp, so early adoption is reachable
      return rnd() < 0.7
        ? { shape: 'ramp', startPct: between(rnd, 50, 58) }
        : { shape: 'fixed' };
    case 'quorum': // 👥 — never above the roster, or the document freezes at 🍾
      return rnd() < 0.5
        ? { form: 'share', n: between(rnd, 30, 55) }
        : { form: 'count', n: between(rnd, 4, 8) };
    case 'rate': // ⏱️ — enough ✏️ for thirty proposals, a drip in real minutes
      return { grant: between(rnd, 5, 9), cap: between(rnd, 12, 18),
        dripMinutes: between(rnd, 10, 30) };
    case 'lapse': // 💤 — never, or far longer than the synthetic past
      return rnd() < 0.7 ? { afterMs: null } : { afterMs: between(rnd, 30, 90) * 24 * HOUR };
    case 'machines':
      return { enabled: rnd() < 0.5, budget: between(rnd, 4, 10) };
    case 'ladder':
      return { rung: pick(rnd, rungs ?? ['closed']) };
    case 'price': // 🪪 🥾 — any rung but the cheapest, so the doors have something to show
      return { price: pick(rnd, (rungs ?? ['assembly']).slice(0, -1)) as 'assembly' };
    default:
      throw new Error(`the shuffler has no draw for '${id}' (${valueType})`);
  }
}

/**
 * What one member answers a delegated question. Blind, so it must be a spread
 * rather than a chorus — the distribution strip is one of the things the
 * ladder exists to show — and the room's own resolution decides what stands.
 */
function answerFor(setting: SettingId, target: SettingValue, rnd: () => number): SettingValue {
  const v = target as Record<string, unknown>;
  switch (setting) {
    case 'bar':
      return { pct: Math.max(50, (v.pct as number) - between(rnd, 0, 12)) };
    case 'quorum':
      return { form: v.form as 'count' | 'share',
        n: Math.max(1, (v.n as number) - between(rnd, 0, 8)) };
    case 'rate':
      return { grant: (v.grant as number) + between(rnd, 0, 3),
        cap: v.cap as number, dripMinutes: v.dripMinutes as number };
    case 'lapse':
      return v.afterMs === null
        ? { afterMs: null }
        : { afterMs: (v.afterMs as number) + between(rnd, 0, 30) * 24 * HOUR };
    case 'machines':
      return { enabled: v.enabled as boolean, budget: v.budget as number };
    default:
      return target; // ladders: the room's own most-protective answer stands
  }
}

// ---------------------------------------------------------------------------
// The clock the ladder writes on

/**
 * A monotonic pen. Every write goes through it, and `guard` is what keeps the
 * whole scheme honest: a timestamp past real now would make `tOf` clamp every
 * later command up to it, quietly moving the document into the future.
 */
class Pen {
  private readonly ceiling: number;
  constructor(private t: number, ceiling: number) {
    // **The ceiling can never be behind the log.** Something else may have
    // moved the document's clock since the last rung — a real command, or
    // simply somebody reading it, since presence is a write (§9.5a). Clamping
    // down to a ceiling already passed would emit backwards, which is refused.
    // Room then runs out instead, and out of room means *the same instant*:
    // equal timestamps are legal, and standing still is the one thing that
    // is always safe.
    this.ceiling = Math.max(ceiling, t);
  }
  /** The next instant: at most `gap` on, never past the ceiling, never back. */
  next(gap = 1): number {
    this.t += Math.min(Math.max(gap, 0), Math.max(0, this.ceiling - this.t));
    return this.t;
  }
  at(when: number): number {
    this.t = Math.max(this.t, Math.min(when, this.ceiling));
    return this.t;
  }
  /** How much synthetic history is left to spend. */
  get room(): number { return Math.max(0, this.ceiling - this.t); }
  get now(): number { return this.t; }
}

const lastTOf = (cs: ConstitutionSession): number => {
  const log = cs.logEntries();
  return log.length > 0 ? log[log.length - 1]!.event.t : 0;
};

// ---------------------------------------------------------------------------
// The build

export interface LadderHost {
  store: DocStore;
  commit: (doc: LoadedDoc, nowMs: number) => Promise<number>;
}

export interface LadderResult {
  slug: string;
  docId: string;
  phase: Rung;
  seed: number;
  /** Every seat the bar can sit in: the founder first, then the cast. */
  seats: { id: string; name: string; founder: boolean }[];
  /** What this press actually built, and what it could not. */
  built: string[];
  skipped: string[];
}

/** Members who have arrived and not left — everyone the ladder can act as. */
const castOf = (cs: ConstitutionSession): string[] =>
  [...cs.memberRecords().values()]
    .filter((m) => !m.removed && m.arrivedAtT !== null)
    .map((m) => m.id);

/**
 * Run the document up the ladder to `to`, one rung at a time. Each rung leaves
 * the document in a state `phaseOf` recognises, so a press is resumable and the
 * bar can always label its own button.
 */
export async function runLadder(host: LadderHost, doc: LoadedDoc | null, opts: {
  to?: Rung; seed?: number; nowMs?: number;
}): Promise<LadderResult> {
  const nowMs = opts.nowMs ?? Date.now();
  const built: string[] = [];
  const skipped: string[] = [];
  let current = doc;

  const target = opts.to ?? nextRung(phaseOf(current, nowMs));
  const wanted = RUNGS.indexOf(target);
  if (wanted < 0) throw new Error(`no such rung: '${target}'`);

  // **The birth rung is "no document", so the press that leaves it both
  // creates the document and fills the room.** Splitting the two would
  // leave a rung nobody asked for — a saved document with one member and
  // no questions — and would put the founder's own arrival, which the
  // §9.7a birth has already collected by the time anything is saved, on
  // the wrong side of a press.
  if (current === null) {
    const seed = opts.seed ?? (randomBytes(3).readUIntBE(0, 3) >>> 0);
    current = await birth(host, seed, nowMs);
    built.push(`born at ${new Date(current.cs.logEntries()[0]!.event.t).toISOString()}`);
    await toConstitution(host, current, { seed, nowMs, built, skipped });
  }

  const seed = seedOfSlug(current.cs.slug) ?? opts.seed ?? 1;
  while (RUNGS.indexOf(phaseOf(current, nowMs)) < wanted) {
    const from = phaseOf(current, nowMs);
    const step = STEPS[from];
    if (!step) break;
    await step(host, current, { seed, nowMs, built, skipped });
    if (phaseOf(current, nowMs) === from) {
      skipped.push(`the '${from}' rung did not advance — stopping here`);
      break;
    }
  }

  return {
    slug: current.cs.slug,
    docId: current.id,
    phase: phaseOf(current, nowMs),
    seed,
    seats: seatsOf(current.cs),
    built,
    skipped,
  };
}

const nextRung = (r: Rung): Rung => RUNGS[Math.min(RUNGS.indexOf(r) + 1, RUNGS.length - 1)]!;

export function seatsOf(cs: ConstitutionSession): { id: string; name: string; founder: boolean }[] {
  const founder = cs.convenorRecord();
  const seats = [{ id: founder.id, name: founder.name ?? 'The Founder', founder: true }];
  for (const m of cs.memberRecords().values()) {
    if (m.removed || m.id === founder.id) continue;
    seats.push({ id: m.id, name: m.name ?? m.email, founder: false });
  }
  return seats;
}

interface Ctx {
  seed: number;
  nowMs: number;
  built: string[];
  skipped: string[];
}

/**
 * The birth: a document created three hours ago, at an address that carries
 * its own seed. Everything the §9.7a birth collects — title, link, the
 * founder's verified address — is already answered, because the ladder's
 * first rung is a saved document, not the creation screen.
 */
async function birth(host: LadderHost, seed: number, nowMs: number): Promise<LoadedDoc> {
  const base = slugForSeed(seed);
  let slug = base;
  for (let n = 2; host.store.slugTaken(slug); n++) slug = `${base}-${n}`;
  const id = 'd-' + randomBytes(5).toString('hex');
  const t0 = nowMs - WINDOW;
  const doc = await host.store.create(id, {
    title: 'The Hollow Oak Club — House Charter',
    slug,
    convenor: { id: 'founder', email: 'ash@ladder.invalid', isMember: true },
  }, t0);
  await host.commit(doc, t0);
  return doc;
}

/** birth → constitution: the cast is invited, arrives, and says who it is. */
async function toConstitution(host: LadderHost, doc: LoadedDoc, ctx: Ctx): Promise<void> {
  const cs = doc.cs;
  const rnd = rngOf(ctx.seed);
  const pen = new Pen(lastTOf(cs), ctx.nowMs);
  const faces = [...FACE_EMOJI];

  cs.setIdentity(pen.next(), 'founder', { name: CAST_NAMES[0]!, picture: null });
  for (let i = 1; i < CAST_NAMES.length; i++) {
    const member = cs.invite(pen.next(), addressOf(i));
    cs.arrive(pen.next(), member);
    // one emoji, one member: drawn without replacement, so no two faces collide
    const face = faces.splice(Math.floor(rnd() * faces.length), 1)[0];
    cs.setIdentity(pen.next(), member, { name: CAST_NAMES[i]!, picture: face ? `e${face}` : null });
  }
  await host.commit(doc, pen.now);
  ctx.built.push(`${CAST_NAMES.length} members invited, arrived and named`);
}

/**
 * constitution → ready: the constitution is answered and the text confirmed,
 * and the document stops one press short of 🍾 — the start is the most
 * interesting transition on the surface, and a stagehand that spends that
 * press hides it (Q678).
 */
async function toReady(host: LadderHost, doc: LoadedDoc, ctx: Ctx): Promise<void> {
  const cs = doc.cs;
  const rnd = rngOf(ctx.seed ^ 0x5eed);
  const pen = new Pen(lastTOf(cs), ctx.nowMs);
  const endsAtMs = ctx.nowMs + WINDOW; // centred: the session sits mid-ramp
  const { values, delegated } = shuffle(rnd, endsAtMs);

  // **🎩 is a question, and the ladder has to answer it** — it is not a
  // catalogue setting, so `readiness()` says nothing about it and a document
  // can be ready in the module's sense while the surface is still asking the
  // founder whether they are a member. The founder is one here, which is the
  // ordinary case and the one that gives them a wallet to look at.
  cs.setConvenorMembership(pen.next(), true);
  cs.confirmStartingText(pen.next(), CHARTER_TEXT);

  // ⏰ first: 🌡️ and 🪜 declare it as a dependency, and a delegated question
  // on a setting whose dependency has not settled will not open (§9.0a)
  const order: SettingId[] = ['ending', ...[...values.keys()].filter((k) => k !== 'ending')];
  const quorum = values.get('quorum') as { form: 'count' | 'share' } | undefined;
  if (quorum) cs.setQuorumForm(pen.next(), quorum.form); // the form is the founder's (§9.0a)

  for (const id of order) {
    const value = values.get(id)!;
    if (delegated.has(id)) {
      cs.delegate(pen.next(), id);
      for (const member of castOf(cs)) {
        cs.answer(pen.next(), member, id, answerFor(id, value, rnd));
      }
    } else {
      cs.setSetting(pen.next(), id, value);
    }
  }

  // **Nothing may be left owed that the module can settle.** A constitutional
  // setting somebody had no say in sits in their rail until they press OK, and
  // twenty members each owed a dozen acknowledgements would bury the rung
  // under news. The grants are a different matter: their OK lives in the
  // browser, so the ladder cannot press them and the founder meets ✒️ and 🛡️
  // on arrival — which is the founding order working, not a gap.
  let owed = 0;
  for (const member of [cs.convenorRecord().id, ...castOf(cs)]) {
    const rec = cs.memberRecords().get(member);
    for (const setting of [...(rec?.okOwed ?? [])]) {
      try { cs.giveOk(pen.next(), member, setting); owed++; } catch { /* not owed after all */ }
    }
  }

  await host.commit(doc, pen.now);
  const held = order.length - delegated.size;
  if (owed > 0) ctx.built.push(`${owed} owed acknowledgements given`);
  ctx.built.push(`constitution drawn from seed ${ctx.seed}: ${held} settings kept, ` +
    `${delegated.size} delegated and answered blind by ${castOf(cs).length}`);
  if (!cs.readiness().ready) {
    ctx.skipped.push(`still waiting on: ${cs.readiness().waiting.join(', ')}`);
  }
}

/**
 * ready → session: 🍾 is pressed at the backdated instant, then the room
 * spends three hours drafting. Thirty hand-authored rewrites over ten clauses,
 * judged unevenly on purpose — some clauses carried, some still live, some
 * with no evidence at all — plus a motion of every other kind the surface can
 * draw beside them.
 */
async function toSession(host: LadderHost, doc: LoadedDoc, ctx: Ctx): Promise<void> {
  const cs = doc.cs;
  const rnd = rngOf(ctx.seed ^ 0xd00d);
  const pen = new Pen(lastTOf(cs), ctx.nowMs - MINUTE);

  cs.begin(pen.next());
  await host.commit(doc, pen.now); // births the bridge, anchored here
  const bridge = asEngineDoc(doc).bridge;
  if (bridge === null) { ctx.skipped.push('the engine did not start'); return; }
  ctx.built.push('🍾 pressed');

  const cast = castOf(cs);
  // the hours between the start and now, for the drafting to be spread over
  const span = pen.room;
  // **Say when the past has already been spent.** If something moved the
  // document's clock to the present since the last rung, there is no room
  // left to draft in: every proposal and judgment lands at one instant, the
  // ramp sits at its start, and no adoption batch can be separated from the
  // next by a cooldown. Everything is still built — it simply happened all
  // at once, which is a different document from the one that was asked for,
  // and the bar should say so rather than let it be discovered.
  if (span < 20 * MINUTE) {
    ctx.skipped.push(`the session is compressed into ${Math.round(span / 1000)}s of ` +
      `document time — its past was already spent, so nothing had room to happen slowly`);
  }

  await reserveTextShield(host, doc, bridge, cast, pen, ctx);
  await proposeAndJudge(host, doc, bridge, cast, pen, span, rnd, ctx);
  await motions(host, doc, bridge, cast, pen, rnd, ctx);
  await application(host, doc, pen, ctx);
  await signOuts(cs, cast, pen, ctx);

  await host.commit(doc, pen.now);
}

/**
 * The 🛡️ on the Text, carried by consent — the only road to a pending 👑
 * question, since 🍾 lays both Text powers down at the fold. It has to land
 * *before* any text race adopts, or the adoption stands by itself and there is
 * no crown question to look at.
 */
async function reserveTextShield(host: LadderHost, doc: LoadedDoc, _bridge: EngineBridge,
  cast: string[], pen: Pen, ctx: Ctx): Promise<void> {
  const cs = doc.cs;
  try {
    const mover = cast[1] ?? 'founder';
    const motion = cs.openMotion(pen.next(), mover,
      { kind: 'reserve', setting: 'startingText', power: 'assent' },
      'The Founder should have the last word on the text itself.');
    for (const m of cast) if (m !== mover) cs.answerMotion(pen.next(), m, motion, 'accept');
    await host.commit(doc, pen.now);
    ctx.built.push('🛡️ reserved on the Text by consent — adoptions now wait on the founder');
  } catch (e) {
    ctx.skipped.push(`the Text's shield: ${(e as Error).message}`);
  }
}

/**
 * Thirty rewrites, ten clauses, judged on a gradient: the first clauses are
 * pushed hard enough to carry, the middle ones are given some evidence and
 * left live, and the last are proposed and never judged — which is what the
 * backlog is made of at the close.
 */
async function proposeAndJudge(host: LadderHost, doc: LoadedDoc, bridge: EngineBridge,
  cast: string[], pen: Pen, span: number, rnd: () => number, ctx: Ctx): Promise<void> {
  const engine = bridge.engine;
  const byLine = new Map<number, string[]>();
  let proposed = 0;
  // **The metronome has to be given room to beat.** Adoptions batch on the
  // cooldown (§4.2, five minutes as shipped), so judging every clause inside
  // one stride would leave the whole session with a single adoption however
  // hard the room judged. A third of the window goes to proposing and half
  // to judging, which puts roughly nine minutes between clauses on a
  // three-hour session — comfortably more than one cooldown, and equally
  // correct where the host has tuned the cooldown to nothing.
  const stride = Math.max(1, Math.floor((span * 0.35) / Math.max(1, REWRITES.length)));
  const perClause = Math.max(1, Math.floor((span * 0.5) / 10));

  for (let i = 0; i < REWRITES.length; i++) {
    const r = REWRITES[i]!;
    const author = cast[i % cast.length]!;
    try {
      const { id } = bridge.proposeText(pen.next(stride), author, {
        // read fresh: an adoption between two proposals bumps the version
        baseVersion: engine.currentVersion(),
        hunks: [{ start: r.line, end: r.line + 1, lines: [r.text] }],
      }, r.why);
      const at = byLine.get(r.line) ?? [];
      at.push(id);
      byLine.set(r.line, at);
      proposed++;
    } catch (e) {
      ctx.skipped.push(`rewrite of line ${r.line}: ${(e as Error).message}`);
    }
  }
  ctx.built.push(`${proposed} text proposals over ${byLine.size} clauses`);
  await host.commit(doc, pen.now);

  // the gradient: clause 0–3 carried, 4–6 live with evidence, 7–9 untouched
  const lines = [...byLine.keys()].sort((a, b) => a - b);
  let carried = 0;
  let contested = 0;
  for (let k = 0; k < lines.length; k++) {
    const ids = byLine.get(lines[k]!)!;
    const race = engine.races().find((r) => ids.some((id) => r.members.includes(id)));
    if (!race) continue;
    const winner = ids.find((id) => race.members.includes(id));
    if (winner === undefined) continue;
    const voters = k <= 3 ? cast : k <= 6 ? cast.slice(0, Math.max(2, Math.floor(cast.length / 3))) : [];
    if (voters.length === 0) continue;
    const rivals = [race.incumbentId, ...race.members.filter((m) => m !== winner)];
    pen.next(perClause); // one cooldown's room, so this clause's batch can land
    for (const voter of voters) {
      for (const other of rivals) {
        try {
          // the middle band judges unevenly, so its races stay genuinely open
          const favourWinner = k <= 3 || rnd() < 0.6;
          bridge.judge(pen.next(), voter, winner, other, favourWinner ? 'a' : 'b');
        } catch { /* a sealed pair, a rebased rival — the race moved on */ }
      }
    }
    await host.commit(doc, pen.now);
    if (k <= 3) carried++; else contested++;
  }
  ctx.built.push(`${carried} clauses pushed to carry, ${contested} left live, ` +
    `${Math.max(0, lines.length - carried - contested)} with no evidence at all`);
}

/** A motion of every other kind: ordinary racing, constitutional collecting, carried, withdrawn, and membership. */
async function motions(host: LadderHost, doc: LoadedDoc, bridge: EngineBridge,
  cast: string[], pen: Pen, rnd: () => number, ctx: Ctx): Promise<void> {
  const cs = doc.cs;
  const say = (what: string, f: () => void): void => {
    try { f(); ctx.built.push(what); } catch (e) { ctx.skipped.push(`${what}: ${(e as Error).message}`); }
  };

  // **A motion has to propose something else.** The module refuses one that
  // proposes what already stands, and the shuffler has just drawn every
  // value at random — so nothing here may name a rung outright.
  const otherRung = (id: SettingId): SettingValue => {
    const entry = CATALOGUE.find((e) => e.id === id);
    const rungs = entry?.rungs ?? [];
    const isPrice = entry?.valueType === 'price';
    const v = cs.settingState(id)?.value as { rung?: string; price?: string } | null;
    const standing = isPrice ? v?.price : v?.rung;
    const other = rungs.filter((r) => r !== standing);
    if (other.length === 0) throw new Error(`${id} has no other rung to propose`);
    const drawn = pick(rnd, other);
    return isPrice ? { price: drawn as 'assembly' } : { rung: drawn };
  };

  // ordinary, and therefore a race in the engine
  say('an ordinary motion on ⏱️, racing', () => {
    const rate = cs.settingState('rate')?.value as
      { grant: number; cap: number; dripMinutes: number } | null;
    if (rate === null) throw new Error('⏱️ has no value to race against');
    // the cap rises with the grant, or the value is refused as its own kind
    // of nonsense: a wallet that cannot hold what it is handed
    bridge.openSetMotion(pen.next(), cast[2]!, 'rate',
      { grant: rate.grant + 2, cap: rate.cap + 2, dripMinutes: rate.dripMinutes },
      'Two more ✏️ to start with — the first hour is the busy one.');
  });

  // constitutional, still collecting: three quarters have answered
  say('a constitutional motion on 👁️, still collecting', () => {
    const mover = cast[3]!;
    const m = cs.openMotion(pen.next(), mover, { kind: 'set', setting: 'judgments',
      value: otherRung('judgments') },
      'Let the room see the judging once it can no longer be swayed.');
    for (const who of cast.slice(0, Math.floor(cast.length * 0.75))) {
      if (who !== mover) cs.answerMotion(pen.next(), who, m, rnd() < 0.8 ? 'accept' : 'keep');
    }
  });

  say('a constitutional motion carried', () => {
    const mover = cast[4]!;
    const m = cs.openMotion(pen.next(), mover, { kind: 'set', setting: 'removal',
      value: otherRung('removal') }, 'Nobody should be able to vote themselves out in a huff.');
    for (const who of cast) if (who !== mover) cs.answerMotion(pen.next(), who, m, 'accept');
  });

  say('a motion withdrawn by its mover', () => {
    const mover = cast[5]!;
    const m = cs.openMotion(pen.next(), mover, { kind: 'set', setting: 'chamber',
      value: otherRung('chamber') }, 'On reflection this is the wrong question to ask.');
    cs.withdrawMotion(pen.next(), mover, m);
  });

  say('a motion to invite somebody', () => {
    cs.openMotion(pen.next(), cast[6]!, { kind: 'invite', email: 'quillon@ladder.invalid' },
      'Quillon has cooked three Thursdays running and is not even a member.');
  });

  say('a motion to remove somebody', () => {
    cs.openMotion(pen.next(), cast[7]!, { kind: 'remove', member: cast[cast.length - 1]! },
      'Raised reluctantly, and with the shed in mind.');
  });

  await host.commit(doc, pen.now);
}

/** Somebody at the door: verified, submitted, and waiting on whatever 🤝 says. */
async function application(host: LadderHost, doc: LoadedDoc,
  pen: Pen, ctx: Ctx): Promise<void> {
  const cs = doc.cs;
  try {
    const applicant = cs.startApplication(pen.next(), 'thea@ladder.invalid');
    cs.verifyApplication(pen.next(), applicant);
    cs.submitApplication(pen.next(), applicant, { name: 'Thea Ollerenshaw',
      words: 'I live four doors down, I can fix a sash window, and I would like to join.' });
    // A submitted application is a stranger proposing their own invitation
    // (entry 94): it races at 🪪's price — a one-candidate race against the
    // membership as it stands under `proposal`, everyone's consent under
    // `assembly`; the shuffler never draws `pen`, where it would simply be in.
    const price = (cs.settingState('admission')?.value as
      { price?: string } | null)?.price ?? 'assembly';
    ctx.built.push(price === 'assembly'
      ? 'an application submitted, collecting everyone\'s consent'
      : 'an application submitted, racing on its own');
    await host.commit(doc, pen.now);
  } catch (e) {
    ctx.skipped.push(`the applicant: ${(e as Error).message}`);
  }
}

/** Two people done: one holding the room to a quorum, one trusting it to finish. */
async function signOuts(cs: ConstitutionSession, cast: string[], pen: Pen, ctx: Ctx): Promise<void> {
  try {
    cs.signOut(pen.next(), cast[cast.length - 2]!, 'holding');
    cs.signOut(pen.next(), cast[cast.length - 3]!, 'abstaining');
    ctx.built.push('two members signed out — one holding, one abstaining');
  } catch (e) {
    ctx.skipped.push(`sign-out: ${(e as Error).message}`);
  }
}

/** session → closing: the close is moved to five minutes from now, for real. */
async function toClosing(host: LadderHost, doc: LoadedDoc, ctx: Ctx): Promise<void> {
  const cs = doc.cs;
  const pen = new Pen(lastTOf(cs), ctx.nowMs);
  const endsAtMs = ctx.nowMs + CLOSING_IN;
  try {
    // the founder's own pen where they hold ⏰; the room's motion where they do not
    if (cs.settingState('ending')?.holder === 'convenor') {
      cs.setSetting(pen.at(ctx.nowMs), 'ending', { endsAtMs },
        'Bringing the close forward — we have what we came for.');
    } else {
      const cast = castOf(cs);
      const mover = cast[0]!;
      const m = cs.openMotion(pen.at(ctx.nowMs), mover,
        { kind: 'set', setting: 'ending', value: { endsAtMs } }, 'Let us finish today.');
      for (const who of cast) if (who !== mover) cs.answerMotion(pen.next(), who, m, 'accept');
    }
    await host.commit(doc, pen.now);
    ctx.built.push(`the close moved to ${new Date(endsAtMs).toISOString()} — five minutes, on the real clock`);
  } catch (e) {
    ctx.skipped.push(`moving the close: ${(e as Error).message}`);
  }
}

/**
 * closing → closed: the ending is set to the very instant being written at —
 * legal, since non-decreasing allows equal, and the one arrangement that
 * closes the document without stamping anything in the future or moving the
 * ending behind the log. Then the signing, which is what OK on the 🥂 card is.
 */
async function toClosed(host: LadderHost, doc: LoadedDoc, ctx: Ctx): Promise<void> {
  const cs = doc.cs;
  const pen = new Pen(lastTOf(cs), ctx.nowMs);
  if (!cs.closed) {
    const at = pen.at(ctx.nowMs);
    try {
      if (cs.settingState('ending')?.holder === 'convenor') {
        cs.setSetting(at, 'ending', { endsAtMs: at });
      } else {
        cs.close(at); // the host standing in for a clock that has already run
      }
      await host.commit(doc, at);
    } catch (e) {
      ctx.skipped.push(`closing: ${(e as Error).message}`);
    }
  }
  if (!cs.closed) { ctx.skipped.push('the document did not close'); return; }
  ctx.built.push(`closed at ${new Date(cs.closedAt!).toISOString()}`);

  // the signatures: a comment, a blank one, and somebody who never signed
  const cast = castOf(cs);
  const comments: [string, string][] = [
    [cast[1] ?? 'founder', 'I still think the garden clause goes too far — but it was fairly decided.'],
    [cast[2] ?? 'founder', ''],
    [cast[3] ?? 'founder', 'Well argued throughout, and the keys question was worth the trouble.'],
    [cast[4] ?? 'founder', 'Signing under protest about the Thursday dinner.'],
  ];
  let signed = 0;
  for (const [member, comment] of comments) {
    try { cs.acknowledgeClose(pen.next(), member, comment); signed++; } catch { /* left unsigned */ }
  }
  await host.commit(doc, pen.now);
  ctx.built.push(`${signed} members signed; the rest left it unsigned`);
}

const STEPS: Partial<Record<Rung, (h: LadderHost, d: LoadedDoc, c: Ctx) => Promise<void>>> = {
  // 'birth' has no step: leaving it is the creation itself, handled in
  // runLadder because it is the one transition with no document to take
  constitution: toReady,
  ready: toSession,
  session: toClosing,
  closing: toClosed,
};

export { CHARTER_LINES };
