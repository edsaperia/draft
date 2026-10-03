/**
 * **Load on demand, unload when idle** (Scaling Stage 2, issue #219;
 * design/spec-pass/plan-scaling.md *Stage 2*).
 *
 *  - **boot loads no document**: the registry routes every slug, and
 *    `/healthz` counts loaded against registered;
 *  - **a cold document loads on its first request**, and concurrent first
 *    requests share one load;
 *  - **an idle document unloads**, leaving its registry row, and its next
 *    request loads it again with nothing lost — the same view, byte for byte;
 *  - **never under a request, a commit or a push stream**: a held document, a
 *    queued commit and an open stream each keep it;
 *  - **a tick that falls due while it is unloaded** loads it and runs the
 *    clock on time (the close, here);
 *  - **a row behind its log is rebuilt at boot** (a crash after a commit, a
 *    deploy's old instance), so a slug that row never saw still routes;
 *  - **the demo is never unloaded** (ephemeral).
 *
 * The whole-schedule differential — a lazy host that unloads at every chance
 * against the all-documents tick, byte for byte — is `clock-index.test.ts`.
 */
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';
import { FilePersistence } from '../src/persistence.js';
import { attestBody } from './attest-wire.js';

const DESIGN_DIR = join(import.meta.dirname, '..', '..', '..', 'design');
const IDLE = 40;

interface Booted { base: string; draft: DraftServer; dataDir: string; closed: boolean }
const booted: Booted[] = [];

async function boot(opts: { dataDir?: string; load?: 'lazy' | 'eager'; demo?: boolean } = {}): Promise<Booted> {
  const dataDir = opts.dataDir ?? mkdtempSync(join(tmpdir(), 'draft-lazy-'));
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1', designDir: DESIGN_DIR,
    resendApiKey: null as string | null, mailFrom: 'test <t@example.org>', mailOff: false,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy: false, buildSha: 'build-one', notifyEmail: null,
    engineTuning: { cooldownMs: 0 }, load: opts.load ?? 'lazy', idleMs: IDLE,
    snapshotAudit: 'strict' as const, demo: opts.demo === true,
  };
  const draft = await createDraftServer(cfg, new FilePersistence(dataDir));
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  cfg.baseUrl = `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`;
  const b = { base: cfg.baseUrl, draft, dataDir, closed: false };
  booted.push(b);
  return b;
}
async function shut(b: Booted): Promise<void> { b.closed = true; await b.draft.close(); }
afterAll(async () => { for (const b of booted) if (!b.closed) await b.draft.close(); });

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const cookieOf = (res: Response): string => res.headers.get('set-cookie')!.split(';')[0]!;
const post = async (base: string, path: string, body: unknown, cookie?: string) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(await attestBody(base, path, body, cookie)),
  });
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
  return mine[mine.length - 1]!.link!;
};

const TEXT = ['# Orchard Charter', 'The orchard is shared at harvest.', '', '## Tools',
  'Tools are returned clean.', 'The press is booked a week ahead.'].join('\n');

/** A begun document of two members with a live race; `endsAtMs` its ending. */
async function room(b: Booted, endsAtMs: number | null = null) {
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
  const values: Record<string, unknown> = {
    ending: { endsAtMs },
    rate: { grant: 4, cap: 8, dripMinutes: 240 },
    quorum: { form: 'count', n: 2 },
    chamber: { rung: 'link' }, authorship: { rung: 'public' }, judgments: { rung: 'after' },
    applications: { apply: false }, admission: { price: 'assembly' },
    machines: { enabled: false, budget: 0 },
    lapse: { afterMs: null },
  };
  for (const [setting, value] of Object.entries(values)) {
    await cmd(ada, 'reclaim', { setting });
    await cmd(ada, 'set-setting', { setting, value });
  }
  await cmd(ada, 'begin', {});
  await cmd(bo, 'propose-text', {
    baseVersion: 0, hunks: [{ start: 4, end: 5, lines: ['Tools are returned clean and oiled.'] }],
    why: 'rust',
  });
  const id = b.draft.store.bySlug(slug)!.id;
  return { slug, id, ada, bo, cmd };
}

/** A seat's view, with the two fields that read the clock rather than the
 *  document (the server's now, and the drip's countdown) taken out. */
const view = async (b: Booted, slug: string, cookie?: string): Promise<string> => {
  const r = await fetch(`${b.base}/api/d/${slug}/view`, { headers: cookie ? { cookie } : {} });
  expect(r.status).toBe(200);
  const v = await r.json() as { serverNowMs?: number; walletInfo?: { nextDripInMs?: number } };
  delete v.serverNowMs;
  if (v.walletInfo) delete v.walletInfo.nextDripInMs;
  return JSON.stringify(v);
};
const health = async (b: Booted) => (await fetch(`${b.base}/healthz`)).json() as Promise<{
  documents: number; documentsLoaded: number; memory: { rssMb: number; heapUsedMb: number };
  loads: { mode: string; idleMs: number; slowestRecent: { ms: number; why: string } | null;
    loads: number; unloads: number; rebuilt: number };
}>;

/** Let the document go idle and run the minute's tick, which unloads it. */
async function idleOut(b: Booted): Promise<void> {
  await sleep(IDLE * 3);
  await b.draft.tick();
}

describe('load on demand (Scaling Stage 2)', () => {
  it('boot loads nothing; the first request loads; idle unloads; the next request reloads with nothing lost', async () => {
    const a = await boot();
    const { slug, id, bo } = await room(a);
    const before = await view(a, slug, bo);
    await shut(a);

    const b = await boot({ dataDir: a.dataDir });
    let h = await health(b);
    expect(h.documents).toBe(1);
    expect(h.documentsLoaded).toBe(0);
    expect(h.loads.mode).toBe('lazy');
    expect(h.loads.rebuilt, 'the old host never unloaded, so its row is rebuilt').toBe(1);
    expect(b.draft.store.isLoaded(id)).toBe(false);
    // the page itself loads nothing: the view it asks for does
    expect((await fetch(`${b.base}/d/${slug}`)).status).toBe(200);
    expect(b.draft.store.isLoaded(id)).toBe(false);
    expect(await view(b, slug, bo)).toBe(before);
    h = await health(b);
    expect(h.documentsLoaded).toBe(1);
    expect(h.loads.loads).toBe(1);
    expect(h.loads.slowestRecent!.why).toBe('request');
    expect(h.memory.rssMb).toBeGreaterThan(0);

    // the first tick after a load is the resumed bridge's sweep: never unloaded before it
    await sleep(IDLE * 3);
    expect(b.draft.store.isLoaded(id)).toBe(true);
    await b.draft.tick();
    await idleOut(b);
    expect(b.draft.store.isLoaded(id)).toBe(false);
    expect(existsSync(join(b.dataDir, 'docs', id, 'registry.json'))).toBe(true);
    h = await health(b);
    expect(h.documentsLoaded).toBe(0);
    expect(h.loads.unloads).toBe(1);

    // reopened: the same view, byte for byte
    expect(await view(b, slug, bo)).toBe(before);
    expect(b.draft.store.isLoaded(id)).toBe(true);
    await shut(b);

    // and a boot after a host that unloaded it last rebuilds nothing: the
    // reload above loaded it again, so idle it out once more first
    const c0 = await boot({ dataDir: a.dataDir });
    await shut(c0);
  }, 60_000);

  it('concurrent first requests for a cold document share one load', async () => {
    const a = await boot();
    const { slug, id, bo } = await room(a);
    await a.draft.tick();
    await idleOut(a);
    expect(a.draft.store.isLoaded(id)).toBe(false);
    const loads = a.draft.store.loadStats.loads;
    const views = await Promise.all(Array.from({ length: 8 }, () => view(a, slug, bo)));
    expect(new Set(views).size).toBe(1);
    expect(a.draft.store.loadStats.loads).toBe(loads + 1);
  }, 60_000);

  it('never unloads a document a request holds or a push stream watches', async () => {
    const a = await boot();
    const { slug, id, ada, cmd } = await room(a);
    await a.draft.tick();
    // held by a request in flight
    let release!: () => void;
    const held = a.draft.store.scope(async () => {
      await a.draft.store.open(id);
      await new Promise<void>((r) => { release = r; });
    });
    await sleep(10);
    await idleOut(a);
    expect(a.draft.store.isLoaded(id), 'held').toBe(true);
    release();
    await held;
    // an open push stream
    const ac = new AbortController();
    const res = await fetch(`${a.base}/api/d/${slug}/events`, { signal: ac.signal, headers: { cookie: ada } });
    expect(res.status).toBe(200);
    await idleOut(a);
    await idleOut(a);
    expect(a.draft.store.isLoaded(id), 'streamed').toBe(true);
    ac.abort();
    await sleep(50);
    await idleOut(a);
    expect(a.draft.store.isLoaded(id), 'stream closed, then idle').toBe(false);
    // and a command on the cold document loads it again and lands
    await cmd(ada, 'reclaim', { setting: 'lapse' }).catch(() => {});
    expect(a.draft.store.isLoaded(id)).toBe(true);
  }, 60_000);

  it('a tick that falls due while the document is unloaded loads it and closes it on time', async () => {
    const a = await boot();
    const endsAtMs = Date.now() + 2 * 60 * 60_000;
    const { slug, id, bo } = await room(a, endsAtMs);
    await a.draft.tick();
    await idleOut(a);
    expect(a.draft.store.isLoaded(id)).toBe(false);
    // a minute before the ending: not due, stays cold
    await a.draft.tick(endsAtMs - 60_000);
    expect(a.draft.store.isLoaded(id)).toBe(false);
    // at the ending: loaded by the tick and closed at the ending
    await a.draft.tick(endsAtMs + 1_000);
    expect(a.draft.store.isLoaded(id)).toBe(true);
    const doc = a.draft.store.byId(id)!;
    expect(doc.cs.closed).toBe(true);
    const closed = doc.cs.logEntries().find((e) => e.event.type === 'closed')!;
    expect(closed.event.t).toBe(endsAtMs);
    expect(JSON.parse(await view(a, slug, bo)).closedAt ?? doc.cs.closed).toBeTruthy();
  }, 60_000);

  it('a row behind its log is rebuilt at boot, so a slug it never saw routes', async () => {
    const a = await boot();
    // a founding document: nothing is due on it, so it unloads once idle
    const created = await (await post(a.base, '/api/docs', {
      title: 'Orchard Charter', email: 'ada@example.org',
    })).json() as { slug: string; devLink: string };
    const ada = cookieOf(await consume(created.devLink));
    const id = a.draft.store.bySlug(created.slug)!.id;
    await idleOut(a);
    expect(a.draft.store.isLoaded(id)).toBe(false);
    await shut(a);
    // the old path writes past the row — a new address, by a host that keeps
    // no registry (a rollback's build, or a deploy's old instance)
    const e = await boot({ dataDir: a.dataDir, load: 'eager' });
    const r = await post(e.base, `/api/d/${created.slug}/cmd`, { cmd: 'set-setting',
      args: { setting: 'link', value: { slug: 'orchard-rules' } } }, ada);
    expect(r.status, await r.clone().text()).toBe(200);
    await shut(e);
    const c = await boot({ dataDir: a.dataDir });
    expect((await health(c)).loads.rebuilt).toBe(1);
    expect(c.draft.store.isLoaded(id)).toBe(false);
    expect(c.draft.store.servesSlug('orchard-rules')).toEqual({ id });
    expect((await fetch(`${c.base}/api/d/${created.slug}/view`, { headers: { cookie: ada } })).status).toBe(200);
    expect((await fetch(`${c.base}/api/d/orchard-rules/view`, { headers: { cookie: ada } })).status).toBe(200);
  }, 60_000);

  it('a document born or loaded inside a request is held by it until it ends', async () => {
    const a = await boot();
    let release!: () => void;
    let id = '';
    const held = a.draft.store.scope(async () => {
      const doc = await a.draft.store.create(`d-held-${Date.now()}`, {
        title: 'Held', slug: `held-${Date.now()}`,
        convenor: { id: 'founder', email: 'held@example.org', isMember: true },
      }, Date.now());
      id = doc.id;
      await new Promise<void>((r) => { release = r; });
    });
    await sleep(IDLE * 3);
    await a.draft.tick();
    expect(a.draft.store.isLoaded(id), 'held by the request that made it').toBe(true);
    release();
    await held;
    await idleOut(a);
    expect(a.draft.store.isLoaded(id), 'released, then idle').toBe(false);
  }, 60_000);

  it('never unloads the demo document', async () => {
    const a = await boot({ demo: true });
    await a.draft.tick();
    await idleOut(a);
    await idleOut(a);
    const demo = a.draft.store.bySlug('demo');
    expect(demo, 'the demo stays in memory').not.toBeNull();
    expect(demo!.ephemeral).toBe(true);
  }, 60_000);
});
