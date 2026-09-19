/**
 * **The spectator feed on the wire** (Q1466, Ed 2026-09-19: *a feed of new
 * proposals and proposals that pass, with enough context that you can
 * understand what's happening. It doesn't show the full document*).
 *
 * What this file holds, over HTTP like every server contract:
 *
 *  - **who may read it is 🌍's answer** — a member always, a stranger only at
 *    *link* or *public*, and where not, the door's own holding sentence and
 *    not one word of the document;
 *  - **what it carries** — a proposal and its passing, each with the clause as
 *    it stood and the place it bites, newest first;
 *  - **what it never carries** — a count, a standing, a name the rung
 *    withholds, or the text it does not touch;
 *  - the short answer, and the page's own row.
 *
 * The projection itself is engine-core's (`spectator-api.test.ts`); this is
 * the host's half — the gate, and an id becoming a name.
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

type Feed = {
  eseq: number; short?: boolean; title: string; begun: boolean; canRead: boolean; members: number;
  holding: { kind: string; sentence: string | null } | null;
  entries: Array<{ t: number; kind: string; candidateId: string; rationale: string;
    author: { name: string | null; picture: string | null; erased: boolean } | null;
    changes: Array<{ heading: string | null; above: string | null; below: string | null; before: string[]; after: string[] }>;
    outcome?: { voted: number; approvals?: number; floor?: number; abstained?: number; tookMs: number } }>;
};

interface Booted { base: string; draft: DraftServer; dataDir: string }
const booted: Booted[] = [];

async function boot(): Promise<Booted> {
  const dataDir = mkdtempSync(join(tmpdir(), 'draft-feed-'));
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

const TEXT = ['# Orchard Charter', 'The orchard is shared at harvest.', '', '## Tools',
  'Tools are returned clean.', 'The press is booked a week ahead.'].join('\n');

/** A begun, perpetual document of three members, 🌍 and 👤 as the case needs. */
async function room(b: Booted, chamber: 'closed' | 'link', authorship: 'anonymous' | 'public') {
  const created = await (await post(b.base, '/api/docs', {
    title: 'Orchard Charter', email: 'ada@example.org',
  })).json() as { slug: string; devLink: string };
  const slug = created.slug;
  const ada = cookieOf(await consume(created.devLink));
  const cmd = async (cookie: string, name: string, args: unknown) => {
    const body = await (await post(b.base, `/api/d/${slug}/cmd`, { cmd: name, args }, cookie))
      .json() as { error?: string; result?: unknown };
    expect(body.error, `${name}: ${body.error}`).toBeUndefined();
    return body.result;
  };
  await cmd(ada, 'confirm-starting-text', { text: TEXT });
  await cmd(ada, 'invite', { email: 'bo@example.org' });
  const bo = cookieOf(await consume(await lastLinkTo(b, 'bo@example.org')));
  await cmd(bo, 'set-identity', { name: 'Bo Tanner' });
  await cmd(ada, 'invite', { email: 'cy@example.org' });
  const cy = cookieOf(await consume(await lastLinkTo(b, 'cy@example.org')));
  const values: Record<string, unknown> = {
    ending: { endsAtMs: null },
    rate: { grant: 4, cap: 8, dripMinutes: 240 },
    quorum: { form: 'count', n: 1 },
    chamber: { rung: chamber }, authorship: { rung: authorship }, judgments: { rung: 'after' },
    applications: { apply: false }, admission: { price: 'assembly' },
    machines: { enabled: false, budget: 0 },
    lapse: { afterMs: null },
  };
  for (const [setting, value] of Object.entries(values)) {
    await cmd(ada, 'reclaim', { setting });
    await cmd(ada, 'set-setting', { setting, value });
  }
  await cmd(ada, 'begin', {});
  const feed = async (cookie?: string, since?: number) => (await (await fetch(
    `${b.base}/api/d/${slug}/feed${since === undefined ? '' : '?since=' + since}`,
    { headers: cookie ? { cookie } : {} })).json()) as Feed;
  const view = async (cookie: string) => (await (await fetch(
    `${b.base}/api/d/${slug}/view`, { headers: { cookie } })).json()) as {
    clauses: Array<{ incumbentId: string }>;
    raceCards: Array<{ kind: string; a: { id: string }; b: { id: string } }> };
  return { slug, ada, bo, cy, cmd, feed, view };
}

describe('the spectator feed (Q1466)', () => {
  it('a proposal and its passing are two entries, newest first, each with its place and never the rest', async () => {
    const b = await boot();
    const { ada, bo, cmd, feed, view } = await room(b, 'link', 'public');
    expect((await feed()).entries).toEqual([]);
    await cmd(bo, 'propose-text', {
      baseVersion: 0,
      hunks: [{ start: 4, end: 5, lines: ['Tools are returned clean and oiled.'] }],
      why: 'rust',
    });
    const one = await feed();
    expect(one.canRead).toBe(true);
    expect(one.entries).toHaveLength(1);
    expect(one.entries[0]).toMatchObject({
      kind: 'proposed', rationale: 'rust',
      author: { name: 'Bo Tanner', erased: false },
      changes: [{ heading: 'Tools', above: null, below: 'The press is booked a week ahead.',
        before: ['Tools are returned clean.'], after: ['Tools are returned clean and oiled.'] }],
    });
    // **it does not show the full document**: a paragraph either side inside
    // the section, and not a word from anywhere else
    expect(JSON.stringify(one)).not.toContain('shared at harvest');

    // ada seconds it: the author and one other is the floor, and it passes
    const v = await view(ada);
    const card = v.raceCards.find((c) => c.kind === 'edge')!;
    const inc = v.clauses[0]!.incumbentId;
    await cmd(ada, 'judge-race', { a: card.a.id, b: card.b.id, outcome: card.a.id === inc ? 'b' : 'a' });
    const two = await feed();
    expect(two.entries.map((e) => e.kind)).toEqual(['adopted', 'proposed']);
    expect(two.entries[0]!.changes[0]).toMatchObject({
      heading: 'Tools', before: ['Tools are returned clean.'], after: ['Tools are returned clean and oiled.'] });
    // **a passed entry carries the passed card's own numbers** (Ed, 2026-09-19):
    // bo and ada voted, both preferred it, nobody ran out of time, of three
    expect(two.members).toBe(3);
    expect(two.entries[0]!.outcome).toMatchObject({ voted: 2, approvals: 2, floor: 2, abstained: 0 });
    expect(two.entries[0]!.outcome!.tookMs).toBeGreaterThanOrEqual(0);
    // **and an open question carries none**: no direction, no count
    expect(Object.keys(two.entries[1]!).sort()).toEqual(['author', 'candidateId', 'changes', 'kind', 'rationale', 't']);
    expect(Object.keys(one.entries[0]!).sort()).toEqual(['author', 'candidateId', 'changes', 'kind', 'rationale', 't']);
    // the short answer: nothing moved, nothing is built
    expect(await feed(undefined, two.eseq)).toMatchObject({ short: true, eseq: two.eseq });
  }, 60_000);

  it('under 🌍 closed a stranger gets the door’s sentence and no words; a member reads it', async () => {
    const b = await boot();
    const { bo, cy, cmd, feed } = await room(b, 'closed', 'anonymous');
    await cmd(bo, 'propose-text', {
      baseVersion: 0,
      hunks: [{ start: 1, end: 2, lines: ['The orchard is shared at midsummer.'] }],
      why: 'midsummer, not harvest',
    });
    const stranger = await feed();
    expect(stranger.canRead).toBe(false);
    expect(stranger.entries).toEqual([]);
    expect(stranger.holding?.kind).toBe('members-only');
    expect(JSON.stringify(stranger)).not.toContain('midsummer');
    // a stranger's ?since never earns the short answer — a full answer is
    // what carries the sentence, and there is nothing in it to save building
    const again = await feed(undefined, stranger.eseq);
    expect(again.short).toBeUndefined();

    const member = await feed(cy);
    expect(member.canRead).toBe(true);
    expect(member.entries).toHaveLength(1);
    // 👤 anonymous: the author is nobody, to a member as to anyone
    expect(member.entries[0]!.author).toBeNull();
  }, 60_000);

  it('a motion on a rule is in the feed with its icon and what stood, and the mover is nobody', async () => {
    const b = await boot();
    const { bo, cmd, feed } = await room(b, 'link', 'public');
    await cmd(bo, 'open-motion', { payload: { kind: 'set', setting: 'chamber', value: { rung: 'public' } },
      why: 'let the neighbours read it' });
    const f = await feed() as unknown as { founderIsMember: boolean; admissionPrice: string;
      entries: Array<Record<string, unknown>> };
    expect(f.founderIsMember).toBe(true);
    expect(f.admissionPrice).toBe('assembly');
    expect(f.entries).toHaveLength(1);
    expect(f.entries[0]).toMatchObject({ kind: 'proposed', setting: 'chamber', glyph: '🌍', route: 'constitutional',
      from: { rung: 'link' }, to: { rung: 'public' }, rationale: 'let the neighbours read it', author: null, changes: [] });
    // sealed: 👤 is public in this room and the mover is still on no key
    expect(JSON.stringify(f.entries[0])).not.toContain('Bo Tanner');
    expect(Object.keys(f.entries[0]!)).not.toContain('by');
  }, 60_000);

  // **the change token counts both logs** (issue #68 finding 1): a motion on a
  // rule writes the constitution's log and never the engine's, so a token that
  // counted the engine alone left a projector reading *nothing has been
  // proposed yet* for the whole open life of a 🌍, 👥 or 🪪 vote
  it('a constitutional motion reaches a page that is already polling', async () => {
    const b = await boot();
    const { bo, cmd, feed } = await room(b, 'link', 'public');
    const open = await feed();
    expect(open.entries).toEqual([]);
    await cmd(bo, 'open-motion', { payload: { kind: 'set', setting: 'chamber', value: { rung: 'public' } },
      why: 'let the neighbours read it' });
    const next = await feed(undefined, open.eseq);
    expect(next.short).toBeUndefined();
    expect(next.entries).toHaveLength(1);
    expect(next.entries[0]).toMatchObject({ kind: 'proposed' });
    // and the new token is short again while nothing moves
    expect(await feed(undefined, next.eseq)).toMatchObject({ short: true });
  }, 60_000);

  it('the page is served at /d/:slug/feed, and a slug nobody made is a 404 on both rows', async () => {
    const b = await boot();
    const { slug } = await room(b, 'link', 'public');
    const page = await fetch(`${b.base}/d/${slug}/feed`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('/feed.js');
    expect((await fetch(`${b.base}/feed.js`)).status).toBe(200);
    expect((await fetch(`${b.base}/d/no-such-document/feed`)).status).toBe(404);
    expect((await fetch(`${b.base}/api/d/no-such-document/feed`)).status).toBe(404);
  }, 60_000);
});
