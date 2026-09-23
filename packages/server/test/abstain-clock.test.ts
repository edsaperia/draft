/**
 * **💤's countdown on the wire** (Q1460, Ed 2026-09-18, in the residency
 * room: *a small indicator … giving a countdown for when not voting will
 * count as a lapse*). The page draws `💤 abstain in hh:mm` beside the
 * Indifferent row; this is the one number it draws it from, and this file is
 * that number's contract.
 *
 * **What it is.** Since Q1439 (SPEC §8.2, §9.5a → R-127) 💤's period has two
 * jobs, and this is the second: silence on **one proposal** for the period
 * abstains this member on it and takes them out of the group its quorum is a
 * share of. The engine's unit is the race's **approval pair** — the leader
 * against the current text — so the deadline is one per race per seat, and
 * `Races.abstainDeadline` reads it off the very row `awaitedAt` will strike
 * the member from. There is no second rule anywhere.
 *
 * **What it is not.** It says nothing about anybody else: not who else is
 * awaited, not how many, not when theirs runs. §3.5 is untouched — this is
 * the seat's own clock, like its own wallet and its own judgments.
 *
 * The four silences, all asserted below: no 💤 at all, a pair this seat has
 * answered, a race this seat is not awaited on (its author), and a moment
 * already behind us.
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';
import { FilePersistence } from '../src/persistence.js';
import { attestBody } from './attest-wire.js';

const DESIGN_DIR = join(import.meta.dirname, '..', '..', '..', 'design');
const HOUR = 3_600_000;

/** Only the parts of a member's view this file reads. */
type View = {
  me: string; serverNowMs: number;
  clauses: Array<{ id: string; judged: boolean; incumbentId: string; abstainAt?: number;
    candidates: Array<{ id: string; mine: boolean }> }>;
  raceCards: Array<{ kind: string; raceId?: string; a: { id: string }; b: { id: string } }>;
  /** the blind row behind a motion on the ordinary route (Q1371, Q1460 (c)) */
  settingRaces: Array<{ id: string; settingId: string; abstainAt?: number }>;
};

interface Booted { base: string; draft: DraftServer; dataDir: string }
const booted: Booted[] = [];

async function boot(): Promise<Booted> {
  const dataDir = mkdtempSync(join(tmpdir(), 'draft-abstain-'));
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1', designDir: DESIGN_DIR,
    resendApiKey: null as string | null, mailFrom: 'test <t@example.org>', mailOff: false,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy: false, buildSha: null, notifyEmail: null,
    engineTuning: { cooldownMs: 0 },
  };
  const draft = await createDraftServer(cfg, new FilePersistence(dataDir));
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  cfg.baseUrl = `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`;
  const b = { base: cfg.baseUrl, draft, dataDir };
  booted.push(b);
  return b;
}
afterAll(async () => { for (const b of booted) await b.draft.close(); });

const cookieOf = (res: Response): string => {
  const header = res.headers.get('set-cookie');
  expect(header).toBeTruthy();
  return header!.split(';')[0]!;
};
// a text proposal states the wording it replaces (Q1463 (1)) — `attestBody`
// fills it from the view the post is about, for hunks written out by hand
const post = async (base: string, path: string, body: unknown, cookie?: string) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(await attestBody(base, path, body, cookie)),
  });
/** Follow a magic link the way a browser does: the POST is what consumes. */
const consume = async (link: string): Promise<Response> => {
  const u = new URL(link);
  expect((await fetch(link)).status).toBe(200);
  return fetch(u.origin + u.pathname, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: u.origin },
    body: new URLSearchParams({ token: u.searchParams.get('token') ?? '' }).toString(),
    redirect: 'manual',
  });
};
const lastLinkTo = async (b: Booted, to: string): Promise<string> => {
  await b.draft.outbox.drain();
  const mine = readFileSync(join(b.dataDir, 'outbox.jsonl'), 'utf8')
    .split('\n').filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as { to: string; link?: string })
    .filter((m) => m.to === to && m.link !== undefined);
  expect(mine.length, `no mail to ${to}`).toBeGreaterThan(0);
  return mine[mine.length - 1]!.link!;
};

/**
 * A begun document, perpetual so nothing closes under the test, with 💤 set
 * to whatever the case needs.
 *
 * **Three members, not two.** The floor in this room is two (a quorum of one
 * against `min(2, E)`, §8.2), so in a room of two the author's own
 * preference plus one answer either way ends the race at once — approving
 * adopts it, and opposing closes it as dominated (Q1440). A third seat,
 * silent throughout, is what keeps a race open long enough to be asked
 * anything about it.
 */
async function room(b: Booted, lapseMs: number | null, admissionPrice = 'assembly') {
  const created = await (await post(b.base, '/api/docs', {
    title: 'Abstention Charter', email: 'ada@example.org',
  })).json() as { slug: string; devLink: string };
  const slug = created.slug;
  const ada = cookieOf(await consume(created.devLink));
  const cmd = async (cookie: string, name: string, args: unknown) => {
    const body = await (await post(b.base, `/api/d/${slug}/cmd`, { cmd: name, args }, cookie))
      .json() as { error?: string; result?: unknown };
    expect(body.error, `${name}: ${body.error}`).toBeUndefined();
    return body.result;
  };
  await cmd(ada, 'confirm-starting-text', { text: 'The orchard is shared at harvest.' });
  await cmd(ada, 'invite', { email: 'bo@example.org' });
  const bo = cookieOf(await consume(await lastLinkTo(b, 'bo@example.org')));
  await cmd(ada, 'invite', { email: 'cy@example.org' });
  const cy = cookieOf(await consume(await lastLinkTo(b, 'cy@example.org')));
  const values: Record<string, unknown> = {
    ending: { endsAtMs: null },
    rate: { grant: 4, cap: 8, dripMinutes: 240 },
    quorum: { form: 'count', n: 1 },
    chamber: { rung: 'link' }, authorship: { rung: 'sealed' }, judgments: { rung: 'after' },
    applications: { apply: false }, admission: { price: admissionPrice },
    machines: { enabled: false, budget: 0 },
    lapse: { afterMs: lapseMs },
  };
  for (const [setting, value] of Object.entries(values)) {
    await cmd(ada, 'reclaim', { setting });
    await cmd(ada, 'set-setting', { setting, value });
  }
  await cmd(ada, 'begin', {});
  const view = async (cookie: string) => (await (await fetch(
    `${b.base}/api/d/${slug}/view`, { headers: { cookie } })).json()) as View;
  return { slug, ada, bo, cy, cmd, view };
}

describe('💤 the abstention countdown in the view (Q1460, SPEC §8.2)', () => {
  it('a race this seat is awaited on carries its own deadline, and only its own', async () => {
    const b = await boot();
    const { ada, bo, cmd, view } = await room(b, 6 * HOUR);
    await cmd(bo, 'propose-text', {
      baseVersion: 0,
      hunks: [{ start: 0, end: 1, lines: ['The orchard is shared at midsummer.'] }],
      why: 'midsummer, not harvest',
    });

    // ada is awaited on the pair, so her view carries the moment her silence
    // stops counting: the proposal's own moment plus 💤's period
    const adaView = await view(ada);
    expect(adaView.clauses).toHaveLength(1);
    const at = adaView.clauses[0]!.abstainAt;
    expect(at, 'ada is awaited and 💤 is set').toBeTypeOf('number');
    expect(at!).toBeGreaterThan(adaView.serverNowMs);
    expect(Math.abs(at! - (adaView.serverNowMs + 6 * HOUR))).toBeLessThan(5 * 60_000);

    // **the author is not awaited** (SPEC §3.3): their preference for their
    // own wording is already in, so there is no silence of theirs to run out
    const boView = await view(bo);
    expect(boView.clauses).toHaveLength(1);
    expect(boView.clauses[0]!.abstainAt).toBeUndefined();

    // …and the moment ada answers the pair, the clock is nobody's business.
    // **She keeps the current text, deliberately**: in a room of two the
    // floor is two, so approving would adopt on the spot and take the race —
    // and the row this assertion is about — away with it.
    const card = adaView.raceCards.find((c) => c.kind === 'edge');
    expect(card, 'ada is dealt the pair').toBeTruthy();
    const inc = adaView.clauses[0]!.incumbentId;
    await cmd(ada, 'judge-race',
      { a: card!.a.id, b: card!.b.id, outcome: card!.a.id === inc ? 'a' : 'b' });
    const judged = await view(ada);
    expect(judged.clauses).toHaveLength(1);
    expect(judged.clauses[0]!.judged).toBe(true);
    expect(judged.clauses[0]!.abstainAt).toBeUndefined();
  }, 60_000);

  it('where 💤 is never, nothing counts down', async () => {
    const b = await boot();
    const { ada, bo, cmd, view } = await room(b, null);
    await cmd(bo, 'propose-text', {
      baseVersion: 0,
      hunks: [{ start: 0, end: 1, lines: ['The orchard is shared at midsummer.'] }],
      why: 'midsummer, not harvest',
    });
    const adaView = await view(ada);
    expect(adaView.clauses).toHaveLength(1);
    expect(adaView.clauses[0]!.judged).toBe(false);
    // nothing is imputed from silence at all under *never* (R-127, R-089), so
    // there is no moment to name and the row says nothing rather than *never*
    expect(adaView.clauses[0]!.abstainAt).toBeUndefined();
  }, 60_000);

  /**
   * **A moment already behind us is served all the same** (Q1460 (a), Ed
   * 2026-09-18: once the period has run the spot reads *💤 abstained* and
   * stays). The condition is the awaited row, never the clock: this seat is
   * in it while it is in E and silent on the approval pair, and out of it the
   * instant it answers — on either side of the moment, a late vote being
   * still a vote. So the number does not move when the period runs out; only
   * what the page says about it does.
   */
  it('a passed deadline is still served, and goes when the seat answers late', async () => {
    const b = await boot();
    const { slug, ada, bo, cmd, view } = await room(b, 6 * HOUR);
    await cmd(bo, 'propose-text', {
      baseVersion: 0,
      hunks: [{ start: 0, end: 1, lines: ['The orchard is shared at midsummer.'] }],
      why: 'midsummer, not harvest',
    });
    const now = await view(ada);
    expect(now.clauses[0]!.abstainAt).toBeTypeOf('number');

    // **The projection is asked directly, at a clock of our own.** 💤's
    // shortest legal period is five minutes (`LAPSE_MIN_MS`, Q1453) and the
    // route reads the wall clock, so no HTTP test can reach the far side of
    // a period without sleeping through it; `raceView` takes its `now` as an
    // argument, and that is the whole of what this case is about.
    const doc = b.draft.store.bySlug(slug)!;
    const { raceView } = await import('../src/views.js');
    const before = raceView(doc, now.me, Date.now()) as unknown as View;
    const at = before.clauses[0]!.abstainAt;
    expect(at).toBeTypeOf('number');
    const after = raceView(doc, now.me, Date.now() + 7 * HOUR) as unknown as View;
    expect(after.clauses, 'the race is still open').toHaveLength(1);
    expect(after.clauses[0]!.abstainAt, 'the same moment, an hour past it').toBe(at);

    // …and a late vote clears it exactly as an early one does: ada keeps the
    // current text (the room is three, so nothing is decided by it) and the
    // row carries no deadline at any clock afterwards.
    const card = now.raceCards.find((c) => c.kind === 'edge');
    expect(card, 'ada is dealt the pair').toBeTruthy();
    const inc = now.clauses[0]!.incumbentId;
    await cmd(ada, 'judge-race',
      { a: card!.a.id, b: card!.b.id, outcome: card!.a.id === inc ? 'a' : 'b' });
    const late = raceView(doc, now.me, Date.now() + 7 * HOUR) as unknown as View;
    expect(late.clauses).toHaveLength(1);
    expect(late.clauses[0]!.judged).toBe(true);
    expect(late.clauses[0]!.abstainAt, 'answered, so nothing is awaited').toBeUndefined();
  }, 60_000);

  /**
   * **Every ordinary motion carries the same clock, and no constitutional one
   * does** (Q1460 (c), Ed 2026-09-18: *every ordinary motion* — membership
   * motions and setting-value motions alike, never a 🏛️ one).
   *
   * The reason it holds by construction rather than by a second rule: only
   * the ordinary route races in the engine, so `settingRaces` is the set of
   * motions a silence can be counted on, and `abstainAt` is read off the same
   * awaited row as a clause's. A constitutional motion is put to the assembly
   * and never enters the projection at all, so there is nothing for it to
   * wear.
   */
  it('an ordinary motion carries the clock, on either kind, and a 🏛️ one carries none', async () => {
    const b = await boot();
    // **at ✏️ price, so an invitation is a race**: at *assembly* the same
    // motion is the unanimity vote and abstains nowhere
    const { ada, bo, cmd, view } = await room(b, 6 * HOUR, 'proposal');

    // a **set** motion — ⏱️ is ordinary (§9.7.1) — put by bo, so ada is the
    // seat awaited on it and bo is the mover, whose own preference is in
    await cmd(bo, 'open-motion', {
      payload: { kind: 'set', setting: 'rate', value: { grant: 5, cap: 8, dripMinutes: 240 } },
      why: 'one more to start with',
    });
    // and a **membership** motion, which is its own one-candidate race
    await cmd(bo, 'open-motion', {
      payload: { kind: 'invite', email: 'di@example.org' }, why: 'di should be here',
    });

    const adaView = await view(ada);
    const rowFor = (v: View, pre: string) =>
      v.settingRaces.find((r) => r.settingId === pre || r.settingId.startsWith(pre + ':'));
    const set = rowFor(adaView, 'rate');
    expect(set, 'the set motion races').toBeTruthy();
    expect(set!.abstainAt, 'and carries this seat’s own deadline').toBeTypeOf('number');
    expect(Math.abs(set!.abstainAt! - (adaView.serverNowMs + 6 * HOUR))).toBeLessThan(5 * 60_000);
    const inv = rowFor(adaView, 'invite');
    expect(inv, 'the invitation races too').toBeTruthy();
    expect(inv!.abstainAt).toBeTypeOf('number');

    // **the mover is not awaited on either** (§3.3): their preference for
    // what they put is already in, so there is no silence of theirs to run out
    const boView = await view(bo);
    expect(rowFor(boView, 'rate')!.abstainAt).toBeUndefined();
    expect(rowFor(boView, 'invite')!.abstainAt).toBeUndefined();

    // …and a constitutional motion — 🌍 is one — is not a race at all, so it
    // has no row here and no card of it can wear a clock
    await cmd(bo, 'open-motion', {
      payload: { kind: 'set', setting: 'chamber', value: { rung: 'public' } },
      why: 'let the world read it',
    });
    const withCon = await view(ada);
    expect(rowFor(withCon, 'chamber'), 'the assembly route never enters the projection')
      .toBeUndefined();
    expect(withCon.settingRaces.every((r) => r.settingId !== 'chamber')).toBe(true);
  }, 60_000);
});
