/**
 * **The hands shared by the scaling instruments** (plan-scaling.md Stage 0):
 * the wire, the seeded charter, the document shapes and one member's act.
 * `scale-seed.ts` uses all of it to write documents; `scale-measure.ts` uses
 * the wire and the act to load a host. Nothing here asserts anything.
 *
 * **Every write goes through the member route** — `POST /api/d/:slug/cmd`
 * with the seat's own cookie, exactly as the page and `soak.ts` send it —
 * so the logs these write are the logs the host writes, and replay accepts
 * them by construction. Nothing here ever writes a log line.
 */
import type { Rng } from '../../engine-core/src/rng.js';

/* -- the wire ------------------------------------------------------------ */

export interface Wire {
  base: string;
  /** every status the run saw, counted by the caller */
  onStatus?: (what: string, status: number, ms: number) => void;
}

export const cookieOf = (res: Response): string =>
  (res.headers.get('set-cookie') ?? '').split(';')[0] ?? '';

export async function post(w: Wire, path: string, body: unknown,
  cookie?: string): Promise<Response> {
  return fetch(w.base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: w.base,
      ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

/** Follow a magic link the way the interstitial does (soak.ts's `consume`). */
export async function consume(link: string): Promise<string> {
  const u = new URL(link);
  await fetch(u.toString());
  const res = await fetch(u.origin + u.pathname, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: u.origin },
    body: new URLSearchParams({ token: u.searchParams.get('token') ?? '' }).toString(),
    redirect: 'manual',
  });
  if (res.status !== 302) throw new Error(`magic link refused: ${res.status}`);
  return cookieOf(res);
}

export class Refused extends Error {}

/** One command as a seat, through the one write the member route has. */
export async function cmd(w: Wire, slug: string, cookie: string, name: string,
  args: unknown): Promise<unknown> {
  const t0 = performance.now();
  const res = await post(w, `/api/d/${slug}/cmd`, { cmd: name, args }, cookie);
  const body = await res.json() as { error?: string; result?: unknown };
  w.onStatus?.(name, res.status, performance.now() - t0);
  if (res.status >= 500) throw new Error(`${name}: ${res.status} ${body.error ?? ''}`);
  if (body.error !== undefined) throw new Refused(`${name}: ${body.error}`);
  return body.result;
}

/**
 * The seat's cookie through the dev seat switch (`POST /api/dev/seat`),
 * which mirrors `/auth/login`'s own arrival. **Why not the magic link for
 * every seat:** the login door is rate-limited per IP (the `auth:<ip>`
 * bucket, Q1341), and a measurement seating thousands of members from one
 * address would meet it; the founder still arrives by the link (`consume`),
 * so the login road is walked once per document.
 */
export async function seat(w: Wire, slug: string, member: string): Promise<string> {
  const res = await post(w, '/api/dev/seat', { slug, member });
  if (!res.ok) throw new Error(`seat ${member} on ${slug} refused: ${res.status} ${await res.text()}`);
  return cookieOf(res);
}

/* -- the member view, as much of it as an act reads --------------------- */

export interface Card { raceId?: string; a: { id: string }; b: { id: string } }
export interface Payload {
  seq: number; eseq: number; short?: boolean;
  text?: string; textVersion?: number; recordsKey?: number;
  wallet?: number | null;
  raceCards?: Card[];
  clauses?: Array<{ ask?: Card | null; askable?: boolean }>;
  mine?: Array<{ id: string; state: string }>;
  readiness?: { ready: boolean; waiting: string[] } | null;
  constitutedAtT?: number | null;
}

/**
 * **A page's poll, as `live.js` `refresh()` sends it**: the seqs it has seen,
 * and once it holds them the text version and the records' key, so a quiet
 * document answers with the seqs alone and a busy one with the slim view.
 */
export class Poller {
  private seen: { seq: number; eseq: number; tv: number | undefined; rk: number | undefined } | null = null;
  text = '';
  constructor(readonly w: Wire, readonly slug: string, readonly cookie: string) {}

  async poll(): Promise<Payload> {
    const s = this.seen;
    const q = s === null ? '' : `?since=${encodeURIComponent(`${s.seq}.${s.eseq}`)}`
      + (s.tv !== undefined ? `&tv=${s.tv}` : '') + (s.rk !== undefined ? `&rk=${s.rk}` : '');
    const t0 = performance.now();
    const res = await fetch(`${this.w.base}/api/d/${this.slug}/view${q}`,
      { headers: { cookie: this.cookie } });
    const body = await res.json() as Payload;
    this.w.onStatus?.(body.short ? 'view-short' : 'view', res.status, performance.now() - t0);
    if (!res.ok) throw new Error(`view ${this.slug}: ${res.status}`);
    if (!body.short) {
      if (typeof body.text === 'string') this.text = body.text;
      this.seen = { seq: body.seq, eseq: body.eseq,
        tv: typeof body.textVersion === 'number' ? body.textVersion : this.seen?.tv,
        rk: typeof body.recordsKey === 'number' ? body.recordsKey : this.seen?.rk };
    }
    return body;
  }

  /** A full view, as an act needs one (the pair on offer, the wallet, the text). */
  async full(): Promise<Payload> {
    this.seen = null;
    return this.poll();
  }
}

/* -- the charter -------------------------------------------------------- */

const NOUNS = ['the membership', 'the treasurer', 'the kitchen', 'the garden', 'the minutes',
  'the rota', 'a guest', 'the keys', 'the budget', 'the common room', 'a dispute',
  'the library', 'the workshop', 'the newsletter', 'the annual meeting', 'the bicycle store',
  'a working group', 'the notice board', 'the shared tools', 'the quiet hours'];
const VERBS = ['shall be reviewed', 'is decided', 'shall be published', 'is kept open',
  'shall be shared', 'is agreed', 'shall be recorded', 'is set', 'shall be offered',
  'is looked after', 'shall be rotated', 'is announced'];
const WHENS = ['every month', 'at each meeting', 'once a season', 'within a week',
  'before the vote', 'on request', 'every Thursday', 'at the start of each term',
  'whenever two members ask', 'after the accounts are read'];
const BYS = ['by a show of hands', 'by the whole membership', 'by whoever holds the keys',
  'by two members together', 'by a rota posted in the hall', 'by the working group',
  'by consent of those present', 'by the treasurer and one other member'];

const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[rng.int(xs.length)]!;
const cap1 = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export function clause(rng: Rng): string {
  return `${cap1(pick(rng, NOUNS))} ${pick(rng, VERBS)} ${pick(rng, WHENS)}, ${pick(rng, BYS)}.`;
}

/** A charter of `lines` lines: a heading every six to ten, clauses between. */
export function charterOf(rng: Rng, lines: number, title: string): string {
  const out = [`# ${title}`];
  let k = 1;
  while (out.length < lines) {
    out.push(`## Part ${k++}`);
    const run = 5 + rng.int(5);
    for (let i = 0; i < run && out.length < lines; i++) out.push(clause(rng));
  }
  return out.join('\n');
}

/** A rewrite of one clause: a new sentence, so the dedup gate sees a real rival. */
export function rewrite(rng: Rng, n: number): string {
  return `${clause(rng).slice(0, -1)}, as agreed on reading ${n}.`;
}

/** `scripts/lib/walk.mjs`'s `withWas` (Q1463 (1)): the wording each hunk replaces. */
export const withWas = (text: string, hunks: Array<{ start: number; end: number; lines: string[] }>):
  unknown[] => {
  const lines = text === '' ? [] : text.split('\n');
  return hunks.map((h) => (h.start === h.end
    ? { ...h, after: h.start === 0 ? null : (lines[h.start - 1] ?? null) }
    : { ...h, was: lines.slice(h.start, h.end) }));
};

/* -- the document shapes ------------------------------------------------ */

/**
 * What one document is to become. **nh2026 is the reference**: twelve
 * members, ~100 lines, 181 proposals, 1,051 comparisons, 47 withdrawals, 98
 * adoptions, 317 document-log entries and 3,057 engine events over one day.
 */
export interface Shape {
  kind: 'unbegun' | 'small' | 'medium' | 'convention';
  members: number;
  lines: number;
  proposals: number;
  judgments: number;
  withdrawShare: number;
  delegate: boolean;
  closed: boolean;
}

/**
 * **The mix** — stated, not measured: nobody knows yet what a launched
 * docs.vote holds. One in ten never begins (a founder who stopped), half are
 * small rooms that tried it, three in ten are working documents, one in ten
 * is a convention on nh2026's scale; four in ten of the begun ones have
 * closed. The per-entry numbers in PRODUCTION.md let any other mix be
 * recomputed without re-running.
 */
export function shapeOf(rng: Rng, only?: string): Shape {
  const r = rng.next();
  const kind: Shape['kind'] = only !== undefined ? only as Shape['kind'] : r < 0.1 ? 'unbegun' : r < 0.6 ? 'small' : r < 0.9 ? 'medium' : 'convention';
  // a convention is nh2026-sized: its twelve members, give or take two
  const members = kind === 'convention' ? 10 + rng.int(5) : 5 + rng.int(16);
  const lines = kind === 'convention' ? 90 + rng.int(61) : 40 + rng.int(111);
  const proposals = kind === 'unbegun' ? 0 : kind === 'small' ? 3 + rng.int(13)
    : kind === 'medium' ? 20 + rng.int(41) : 150 + rng.int(51);
  const perProposal = kind === 'convention' ? 5.8 : kind === 'medium' ? 5 : 4;
  return {
    kind, members, lines, proposals,
    judgments: Math.round(proposals * perProposal * (0.8 + 0.4 * rng.next())),
    withdrawShare: kind === 'convention' ? 0.25 : 0.1,
    delegate: rng.next() < 0.3,
    closed: kind !== 'unbegun' && rng.next() < 0.4,
  };
}

/* -- one member's act ---------------------------------------------------- */

/** A member's taste: stable per member and candidate, so a room converges. */
function taste(member: string, candidate: string): number {
  let h = 2166136261;
  for (const ch of member + '/' + candidate) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

export interface ActSeat { member: string; cookie: string; poller: Poller }
export type Act = 'judged' | 'proposed' | 'withdrew' | 'idle' | 'refused';

/**
 * One act by one seat, off one full view: judge the pair on offer, or
 * propose, or now and then withdraw a live proposal of one's own. `want`
 * says which the caller would rather: the seeder spends budgets, the load
 * just acts.
 */
export async function act(w: Wire, slug: string, s: ActSeat, rng: Rng,
  want: { judge: boolean; propose: boolean; withdrawShare: number; n: number }): Promise<Act> {
  const v = await s.poller.full();
  try {
    const card = v.raceCards?.[0] ?? v.clauses?.find((c) => c.ask)?.ask ?? null;
    if (want.judge && card !== null) {
      const ta = taste(s.member, card.a.id), tb = taste(s.member, card.b.id);
      const outcome = Math.abs(ta - tb) < 0.05 ? 'tie' : ta > tb ? 'a' : 'b';
      await cmd(w, slug, s.cookie, 'judge-race', { a: card.a.id, b: card.b.id, outcome });
      return 'judged';
    }
    const live = (v.mine ?? []).filter((c) => c.state === 'live');
    if (live.length > 0 && rng.next() < want.withdrawShare) {
      await cmd(w, slug, s.cookie, 'withdraw-text', { candidate: live[rng.int(live.length)]!.id });
      return 'withdrew';
    }
    if (want.propose && (v.wallet ?? 0) > 0 && typeof v.text === 'string') {
      const lines = v.text.split('\n');
      const body = lines.map((l, i) => [l, i] as const).filter(([l]) => l.length > 0 && !l.startsWith('#'));
      if (body.length === 0) return 'idle';
      const li = body[rng.int(body.length)]![1];
      const insert = rng.next() < 0.1;
      await cmd(w, slug, s.cookie, 'propose-text', {
        baseVersion: v.textVersion,
        hunks: withWas(v.text, [{ start: li, end: insert ? li : li + 1, lines: [rewrite(rng, want.n)] }]),
        why: 'A clearer wording, from the scale seeder.',
      });
      return 'proposed';
    }
    return 'idle';
  } catch (e) {
    // a race lost to the room (a pair that closed, text that moved) is the
    // ordinary shape of a busy document, not a failure of the instrument
    if (e instanceof Refused) return 'refused';
    throw e;
  }
}
