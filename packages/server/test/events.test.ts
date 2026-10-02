/**
 * **The push stream on the wire** (Scaling Stage 4, issue #162;
 * design/spec-pass/plan-scaling.md *Stage 4*): `GET /api/d/:slug/events`.
 *
 *  - **what it carries** — `hello` with the two lengths and the build, `doc`
 *    with the two lengths when either moves, `nudge` with nothing; never a
 *    view, never content (Invariant 3);
 *  - **whom presence nudges** — a member's stream, never a stranger's (E43's
 *    audience is the membership);
 *  - **who may open one** — the view's own guards: a seat as itself, anybody
 *    else at the door; per-seat cap answered 429;
 *  - **the spike's finding 1** — `close()` ends every stream at once;
 *  - **the switch** — `DRAFT_PUSH=off` is a 404, and the page polls.
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';
import { FilePersistence } from '../src/persistence.js';
import { configFromEnv } from '../src/config.js';
import { PER_SEAT } from '../src/events.js';
import { attestBody } from './attest-wire.js';

const DESIGN_DIR = join(import.meta.dirname, '..', '..', '..', 'design');

interface Booted { base: string; draft: DraftServer; dataDir: string; closed: boolean }
const booted: Booted[] = [];

async function boot(push = true): Promise<Booted> {
  const dataDir = mkdtempSync(join(tmpdir(), 'draft-events-'));
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1', designDir: DESIGN_DIR,
    resendApiKey: null as string | null, mailFrom: 'test <t@example.org>', mailOff: false,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy: false, buildSha: 'build-one', notifyEmail: null,
    engineTuning: { cooldownMs: 0 }, push,
  };
  const draft = await createDraftServer(cfg, new FilePersistence(dataDir));
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  cfg.baseUrl = `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`;
  const b = { base: cfg.baseUrl, draft, dataDir, closed: false };
  booted.push(b);
  return b;
}
afterAll(async () => { for (const b of booted) if (!b.closed) await b.draft.close(); });

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

/** A begun, perpetual document of two members, readable at the door. */
async function room(b: Booted) {
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
    ending: { endsAtMs: null },
    rate: { grant: 4, cap: 8, dripMinutes: 240 },
    quorum: { form: 'count', n: 1 },
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
  return { slug, ada, bo, cmd };
}

type Ev = { event: string; data: Record<string, unknown>; at: number };

/** A stream read in the background: every event as it lands, with its time. */
async function listen(url: string, cookie?: string) {
  const ac = new AbortController();
  const res = await fetch(url, { signal: ac.signal, headers: cookie ? { cookie } : {} });
  const events: Ev[] = [];
  let ended = false;
  const done = (async () => {
    if (res.status !== 200 || res.body === null) { ended = true; return; }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    try {
      for (;;) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, i); buf = buf.slice(i + 2);
          if (block.startsWith(':')) continue;
          let event = 'message'; let data = '{}';
          for (const line of block.split('\n')) {
            if (line.startsWith('event: ')) event = line.slice(7);
            if (line.startsWith('data: ')) data = line.slice(6);
          }
          events.push({ event, data: JSON.parse(data) as Record<string, unknown>, at: Date.now() });
        }
      }
    } catch { /* aborted */ }
    ended = true;
  })();
  const waitFor = async (pred: (e: Ev) => boolean, ms = 2_000): Promise<Ev | null> => {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      const hit = events.find(pred);
      if (hit) return hit;
      await new Promise((r) => setTimeout(r, 20));
    }
    return null;
  };
  return { res, events, waitFor, ended: () => ended, done,
    stop: async () => { ac.abort(); await done; } };
}

describe('the push stream (Scaling Stage 4)', () => {
  it('says hello with the two lengths and the build, and nothing else', async () => {
    const b = await boot();
    const { slug, bo } = await room(b);
    const s = await listen(`${b.base}/api/d/${slug}/events`, bo);
    expect(s.res.status).toBe(200);
    expect(s.res.headers.get('content-type')).toContain('text/event-stream');
    const hello = await s.waitFor((e) => e.event === 'hello');
    expect(hello).not.toBeNull();
    expect(Object.keys(hello!.data).sort()).toEqual(['build', 'eseq', 'seq']);
    expect(hello!.data.build).toBe('build-one');
    const view = await (await fetch(`${b.base}/api/d/${slug}/view`, { headers: { cookie: bo } })).json() as { seq: number; eseq: number };
    expect(hello!.data.seq).toBe(view.seq);
    expect(hello!.data.eseq).toBe(view.eseq);
    await s.stop();
  });

  it('carries a change to another seat in well under a second, and only the lengths', async () => {
    const b = await boot();
    const { slug, ada, bo, cmd } = await room(b);
    const s = await listen(`${b.base}/api/d/${slug}/events`, ada);
    const hello = (await s.waitFor((e) => e.event === 'hello'))!;
    const sent = Date.now();
    await cmd(bo, 'propose-text', {
      baseVersion: 0,
      hunks: [{ start: 4, end: 5, lines: ['Tools are returned clean and oiled.'] }],
      why: 'rust',
    });
    const doc = await s.waitFor((e) => e.event === 'doc');
    expect(doc, 'no doc event').not.toBeNull();
    expect(doc!.at - sent).toBeLessThan(1_000);
    expect(Object.keys(doc!.data).sort()).toEqual(['eseq', 'seq']);
    expect((doc!.data.seq as number) + (doc!.data.eseq as number))
      .toBeGreaterThan((hello.data.seq as number) + (hello.data.eseq as number));
    // the proposal's words are nowhere on the wire
    expect(JSON.stringify(s.events)).not.toContain('oiled');
    await s.stop();
  });

  it('nudges a member when somebody moves, and never a stranger', async () => {
    const b = await boot();
    const { slug, ada, bo } = await room(b);
    const member = await listen(`${b.base}/api/d/${slug}/events`, bo);
    const stranger = await listen(`${b.base}/api/d/${slug}/events`);
    await member.waitFor((e) => e.event === 'hello');
    await stranger.waitFor((e) => e.event === 'hello');
    // ada's page reports where she is reading (PRESENCE.md §1.1)
    const seen = await (await fetch(`${b.base}/api/d/${slug}/view`, { headers: { cookie: ada } })).json() as { seq: number; eseq: number };
    await fetch(`${b.base}/api/d/${slug}/view?since=${seen.seq}.${seen.eseq}&at=L4`, { headers: { cookie: ada } });
    const nudge = await member.waitFor((e) => e.event === 'nudge');
    expect(nudge, 'the member was not nudged').not.toBeNull();
    expect(nudge!.data).toEqual({});
    // the stranger's view carries no reading, so its stream says nothing either
    await new Promise((r) => setTimeout(r, 500));
    expect(stranger.events.filter((e) => e.event !== 'hello')).toEqual([]);
    await member.stop(); await stranger.stop();
  });

  it('caps one seat at PER_SEAT open streams', async () => {
    const b = await boot();
    const { slug, bo } = await room(b);
    const open = [];
    for (let i = 0; i < PER_SEAT; i++) open.push(await listen(`${b.base}/api/d/${slug}/events`, bo));
    for (const s of open) expect(s.res.status).toBe(200);
    const over = await fetch(`${b.base}/api/d/${slug}/events`, { headers: { cookie: bo } });
    expect(over.status).toBe(429);
    await open[0]!.stop();
    // a slot given back is a slot to take again
    let again: Awaited<ReturnType<typeof listen>> | null = null;
    for (let i = 0; i < 50; i++) {
      again = await listen(`${b.base}/api/d/${slug}/events`, bo);
      if (again.res.status === 200) break;
      await new Promise((r) => setTimeout(r, 20));
    }
    expect(again!.res.status).toBe(200);
    const health = await (await fetch(`${b.base}/healthz`)).json() as { streams: { open: number; refused: number } };
    expect(health.streams.open).toBe(PER_SEAT);
    expect(health.streams.refused).toBeGreaterThanOrEqual(1);
    for (const s of [...open.slice(1), again!]) await s.stop();
  });

  it('ends every stream at the start of close(), so the drain does not wait on them', async () => {
    const b = await boot();
    const { slug, ada, bo } = await room(b);
    const one = await listen(`${b.base}/api/d/${slug}/events`, ada);
    const two = await listen(`${b.base}/api/d/${slug}/events`, bo);
    await one.waitFor((e) => e.event === 'hello');
    await two.waitFor((e) => e.event === 'hello');
    const t0 = Date.now();
    await b.draft.close();
    b.closed = true;
    // the spike measured 3.0–4.4 s with streams open; a drain that ends them
    // first is the drain with nothing open
    expect(Date.now() - t0).toBeLessThan(2_500);
    await Promise.all([one.done, two.done]);
    expect(one.ended() && two.ended()).toBe(true);
  });

  it('is a 404 with DRAFT_PUSH=off, the page then polling as before', async () => {
    expect(configFromEnv({ DRAFT_SECRET: 's' }).push).toBe(true);
    expect(configFromEnv({ DRAFT_SECRET: 's', DRAFT_PUSH: 'off' }).push).toBe(false);
    const b = await boot(false);
    const { slug, bo } = await room(b);
    expect((await fetch(`${b.base}/api/d/${slug}/events`, { headers: { cookie: bo } })).status).toBe(404);
  });

  it('answers a missing document as the view does', async () => {
    const b = await boot();
    expect((await fetch(`${b.base}/api/d/no-such-doc/events`)).status).toBe(404);
  });
});
