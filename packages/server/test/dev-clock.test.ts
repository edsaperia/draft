/**
 * **The dev clock** (Q1455, Ed 2026-09-18): one dev-only route that moves a
 * single document's clock forward, so a walk that needs a member to lapse can
 * have five minutes pass without waiting five minutes. The seat matrix is its
 * only caller.
 *
 * What is asserted here is the whole of the contract, because the walk itself
 * can only see the end of it:
 *
 *  · the advance is **per document** — one document's clock moves and its
 *    neighbour's does not, which is the difference between a dev clock and a
 *    host with its wall clock wound on;
 *  · the advance does **not** lapse anybody by itself: the host's own
 *    `tick()` does, afterwards, exactly as it would have if the time had
 *    really passed (Ed's one kept assertion at the ruling — the dev route
 *    never writes a lapse);
 *  · a seat named `present` is stamped as having been there at the new time,
 *    through the ordinary presence door, so only the quiet seats are stale;
 *  · the refusals: a rewind, a NaN, a slug nobody knows, a closed document;
 *  · the route is **not there at all** on a host that is not a dev host, which
 *    is the same posture `/api/dev/ladder` is verified in;
 *  · and the log a jumped document leaves behind is an ordinary log — the
 *    chain still verifies and a fresh replay reproduces it entry for entry.
 *    That last one is the load-bearing one: the offset lives in memory and is
 *    never written anywhere, so if replay depended on it the design would be
 *    wrong. It does not, because what reaches the log is the *time*, and the
 *    time is in the log.
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { ConstitutionSession, LAPSE_MIN_MS } from '../../constitution/src/index.js';
import type { LogEntry } from '../../constitution/src/index.js';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';
import { foldTime } from '../src/engine-host.js';
import { FilePersistence } from '../src/persistence.js';
import { DocStore, StorePeople } from '../src/store.js';

const DESIGN_DIR = join(import.meta.dirname, '..', '..', '..', 'design');
const DAY = 24 * 3600_000;

interface Booted { base: string; draft: DraftServer; dataDir: string }
const booted: Booted[] = [];
afterAll(async () => { for (const b of booted) await b.draft.close(); });

async function boot(over: { resendApiKey?: string | null } = {}): Promise<Booted> {
  const dataDir = mkdtempSync(join(tmpdir(), 'draft-devclock-'));
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1', designDir: DESIGN_DIR,
    resendApiKey: null as string | null, mailFrom: 'test <t@example.org>', mailOff: false,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy: false, buildSha: null, notifyEmail: null,
    engineTuning: { cooldownMs: 0 },
    ...over,
  };
  const draft = await createDraftServer(cfg, new FilePersistence(dataDir));
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  cfg.baseUrl = `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`;
  const b = { base: cfg.baseUrl, draft, dataDir };
  booted.push(b);
  return b;
}

const cookieOf = (res: Response): string => {
  const header = res.headers.get('set-cookie');
  expect(header, 'no cookie on the magic link').toBeTruthy();
  return header!.split(';')[0]!;
};

const post = (base: string, path: string, body: unknown, cookie?: string) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
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

const lastMailTo = async (b: Booted, to: string): Promise<{ link?: string }> => {
  await b.draft.outbox.drain();
  const mine = readFileSync(join(b.dataDir, 'outbox.jsonl'), 'utf8')
    .split('\n').filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as { to: string; link?: string })
    .filter((m) => m.to === to);
  expect(mine.length, `no mail to ${to}`).toBeGreaterThan(0);
  return mine[mine.length - 1]!;
};

type ClockAnswer = {
  ok?: true; error?: string;
  slug?: string; advanceMs?: number; offsetMs?: number;
  documentNowMs?: number; realNowMs?: number; present?: string[];
};
const clock = async (b: Booted, body: unknown): Promise<{ status: number; body: ClockAnswer }> => {
  const r = await post(b.base, '/api/dev/clock', body);
  return { status: r.status, body: await r.json().catch(() => ({})) as ClockAnswer };
};

/** A member's row as the founder's view prints it. */
type Member = { email: string; lapsed?: boolean };
const membersOf = async (b: Booted, slug: string, cookie: string): Promise<Member[]> => {
  const r = await fetch(`${b.base}/api/d/${slug}/view`, { headers: { cookie } });
  const body = await r.json() as { view?: { members?: Member[] } };
  return body.view?.members ?? [];
};
const lapsedIn = (rows: Member[], email: string): boolean =>
  rows.find((m) => m.email === email)?.lapsed === true;

/**
 * One begun document with a founder and two members, 💤 at the floor the
 * validator allows (Q1453) so that a jump past it lapses whoever is quiet.
 * Perpetual by default — a jumped clock must not be able to close a document
 * this test never meant to close.
 */
async function found(b: Booted, opts: { title: string; members: string[] }) {
  const created = await (await post(b.base, '/api/docs', {
    title: opts.title, email: `ada.${opts.title.toLowerCase()}@example.org`, isMember: true,
  })).json() as { slug: string; devLink: string };
  const slug = created.slug;
  const ada = cookieOf(await consume(created.devLink));
  const cmd = async (cookie: string, name: string, args: unknown): Promise<void> => {
    const body = await (await post(b.base, `/api/d/${slug}/cmd`, { cmd: name, args }, cookie))
      .json() as { error?: string };
    expect(body.error, `${name}: ${body.error}`).toBeUndefined();
  };
  await cmd(ada, 'set-identity', { name: 'Ada Lovell' });
  await cmd(ada, 'confirm-starting-text', { text: '# The orchard\nThe apples are shared.' });
  const cookies: Record<string, string> = {};
  for (const email of opts.members) {
    await cmd(ada, 'invite', { email });
    cookies[email] = cookieOf(await consume((await lastMailTo(b, email)).link!));
    await cmd(cookies[email]!, 'set-identity', { name: email.split('@')[0]! });
  }
  const values: Record<string, unknown> = {
    ending: { endsAtMs: null },
    rate: { grant: 4, cap: 8, dripMinutes: 240 },
    quorum: { form: 'count', n: 1 },
    authorship: { rung: 'sealed' }, judgments: { rung: 'after' },
    applications: { apply: false },
    admission: { price: 'assembly' }, removal: { price: 'consent' },
    machines: { enabled: false, budget: 0 },
    chamber: { rung: 'closed' },
    lapse: { afterMs: LAPSE_MIN_MS },
  };
  for (const [setting, value] of Object.entries(values)) {
    await cmd(ada, 'reclaim', { setting });
    await cmd(ada, 'set-setting', { setting, value });
  }
  await cmd(ada, 'begin', {});
  return { slug, ada, cookies, cmd,
    founder: `ada.${opts.title.toLowerCase()}@example.org` };
}

describe('the dev clock (Q1455): one document moved forward, the host still doing the lapsing', () => {
  it('advances the document it names and leaves its neighbour where it was', async () => {
    const b = await boot();
    const one = await found(b, { title: 'Orchard', members: ['bo@example.org'] });
    const two = await found(b, { title: 'Meadow', members: ['cy@example.org'] });
    const realBefore = Date.now();

    const r = await clock(b, { slug: one.slug, advanceMs: 2 * 3600_000 });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.offsetMs).toBe(2 * 3600_000);
    expect(r.body.documentNowMs!).toBeGreaterThanOrEqual(realBefore + 2 * 3600_000);

    // the neighbour's clock is real now, and a command it takes proves it
    await two.cmd(two.ada, 'set-identity', { name: 'Ada Again' });
    const lastTOf = (slug: string): number => {
      const doc = b.draft.store.bySlug(slug)!;
      const log = doc.cs.logEntries();
      return log[log.length - 1]!.event.t;
    };
    expect(lastTOf(two.slug)).toBeLessThan(realBefore + 3600_000);
    // …and the advanced one stamps its next act at the new time
    await one.cmd(one.ada, 'set-identity', { name: 'Ada Again' });
    expect(lastTOf(one.slug)).toBeGreaterThanOrEqual(realBefore + 2 * 3600_000);

    // **The skew is applied once, however many times a time goes round.** Not
    // every caller hands `foldTime` a wall clock — the phase ladder commits at
    // its own pen's time, which is already a document time — and adding the
    // skew again would move the document twice as far on every hop. A ladder
    // document did exactly that within minutes of the first cut: two hours
    // ahead after a one-hour jump, its engine log with it, and the next rung
    // writing behind its own past.
    const doc = b.draft.store.bySlug(one.slug)!;
    expect(foldTime(doc, foldTime(doc))).toBe(foldTime(doc));
    expect(foldTime(doc, Date.now())).toBeLessThan(realBefore + 3 * 3600_000);
  });

  it('lapses a quiet member by the ordinary tick after the advance, and not before', async () => {
    const b = await boot();
    const d = await found(b, { title: 'Quarry', members: ['bo@example.org'] });

    // the advance alone writes no lapse: the route moves the clock and stops
    const r = await clock(b, { slug: d.slug, advanceMs: 2 * 3600_000, present: [d.founder] });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(lapsedIn(await membersOf(b, d.slug, d.ada), 'bo@example.org')).toBe(false);

    // the host's own clock is what lapses them (Ed's kept assertion)
    await b.draft.tick();
    expect(lapsedIn(await membersOf(b, d.slug, d.ada), 'bo@example.org')).toBe(true);
    // and the founder, named present at the new time, is not touched by it
    expect(lapsedIn(await membersOf(b, d.slug, d.ada), d.founder)).toBe(false);
  });

  it('leaves a seat alone when it was present at the new time, or acts after it', async () => {
    const b = await boot();
    const d = await found(b, { title: 'Landing', members: ['bo@example.org', 'cy@example.org'] });

    const r = await clock(b, { slug: d.slug, advanceMs: 2 * 3600_000,
      present: [d.founder, 'cy@example.org'] });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.present).toEqual([d.founder, 'cy@example.org']);
    // bo was not named, but acts after the advance, which is presence too
    await d.cmd(d.cookies['bo@example.org']!, 'set-identity', { name: 'Bo Vane' });

    await b.draft.tick();
    const rows = await membersOf(b, d.slug, d.ada);
    expect(lapsedIn(rows, 'cy@example.org')).toBe(false);
    expect(lapsedIn(rows, 'bo@example.org')).toBe(false);
  });

  it('refuses a rewind, a nonsense advance, an unknown slug and a closed document', async () => {
    const b = await boot();
    const d = await found(b, { title: 'Refusal', members: ['bo@example.org'] });

    expect((await clock(b, { slug: d.slug, advanceMs: -1 })).status).toBe(400);
    expect((await clock(b, { slug: d.slug, advanceMs: 0 })).status).toBe(400);
    expect((await clock(b, { slug: d.slug, advanceMs: Number.NaN })).status).toBe(400);
    expect((await clock(b, { slug: d.slug, advanceMs: 'soon' })).status).toBe(400);
    expect((await clock(b, { slug: d.slug })).status).toBe(400);
    // a year and a day: a dev clock is not a time machine
    expect((await clock(b, { slug: d.slug, advanceMs: 400 * DAY })).status).toBe(400);
    expect((await clock(b, { slug: 'no-such-document', advanceMs: 1000 })).status).toBe(404);
    expect((await clock(b, { advanceMs: 1000 })).status).toBe(404);
    // a name nobody at this document answers to
    expect((await clock(b, { slug: d.slug, advanceMs: 1000, present: ['zz@example.org'] })).status)
      .toBe(400);

    // …and a closed document: the clock does not move past the end of a life
    const closing = await found(b, { title: 'Closing', members: [] });
    await closing.cmd(closing.ada, 'set-setting',
      { setting: 'ending', value: { endsAtMs: Date.now() + 1000 } });
    await clock(b, { slug: closing.slug, advanceMs: 3600_000, present: [closing.founder] });
    await b.draft.tick();
    expect(b.draft.store.bySlug(closing.slug)!.cs.closed).toBe(true);
    const after = await clock(b, { slug: closing.slug, advanceMs: 3600_000 });
    expect(after.status).toBe(400);
    expect(after.body.error).toMatch(/closed/);
  });

  it('is not there at all on a host that is not a dev host', async () => {
    const b = await boot({ resendApiKey: 'not-a-real-key' });
    const r = await post(b.base, '/api/dev/clock', { slug: 'anything', advanceMs: 1000 });
    expect(r.status).toBe(404);
  });

  it('leaves an ordinary log: the chain verifies and a fresh replay reproduces it', async () => {
    const b = await boot();
    const d = await found(b, { title: 'Replay', members: ['bo@example.org'] });
    await clock(b, { slug: d.slug, advanceMs: 2 * 3600_000, present: [d.founder] });
    await b.draft.tick();   // the lapse lands at the advanced time
    await d.cmd(d.ada, 'set-identity', { name: 'Ada Thrice' });

    const live = b.draft.store.bySlug(d.slug)!;
    const id = live.id;
    const before = JSON.stringify(live.cs.logEntries());
    expect(live.cs.verifyChain()).toBe(true);
    // the lapse really is stamped at the advanced time, not at real now
    const lapse = live.cs.logEntries().find((e) => e.event.type === 'member-lapsed');
    expect(lapse, 'nothing lapsed').toBeTruthy();
    expect(lapse!.event.t).toBeGreaterThan(Date.now() + 3600_000);

    await b.draft.close();
    booted.splice(booted.indexOf(b), 1);

    // a fresh process's view of the same bytes: no offset anywhere in it
    const p = new FilePersistence(b.dataDir);
    const store = new DocStore(p);
    await store.loadAll();
    expect(store.quarantined()).toEqual([]);
    const back = store.byId(id)!;
    expect(back.cs.verifyChain()).toBe(true);
    expect(JSON.stringify(back.cs.logEntries())).toBe(before);
    // and the same bytes read straight off the disk, entry for entry
    const raw = readFileSync(join(b.dataDir, 'docs', id, 'log.jsonl'), 'utf8')
      .split('\n').filter((l) => l.length > 0).map((l) => JSON.parse(l) as LogEntry);
    expect(JSON.stringify(ConstitutionSession
      .replay(raw, new StorePeople(await p.readPeople(id))).logEntries())).toBe(before);
  });
});
