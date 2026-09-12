/**
 * **The announced pause and the red flag** (Q1345, Q1346; Ed, 2026-09-12,
 * after the notanotherpizza demo met a document split across two instances
 * by a deploy). Three things: the pause route is closed to a stranger and
 * open to the bearer of DRAFT_BOT_KEY; while paused the host refuses every
 * command with 503 and the pause in the answer, says `paused` on every view
 * — the short poll answer included — persists nothing, and lets it all land
 * on the next commit after a resume; and a save the store rejects with a
 * 23505 marks the document `stalled` on every view and in /healthz until a
 * save succeeds.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import type { LogEntry } from '../../constitution/src/index.js';
import { FilePersistence } from '../src/persistence.js';
import type { PersonRow } from '../src/persistence.js';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';

const tmp = () => mkdtempSync(join(tmpdir(), 'draft-pause-'));

const booted: DraftServer[] = [];
afterAll(async () => { for (const d of booted) await d.close(); });

/** A file store whose document-log append can be told to fail the way
 *  Postgres does when another writer holds the log (Q1345): a 23505. */
class SplitPersistence extends FilePersistence {
  failNext = false;
  override async appendDocLog(id: string, entries: readonly LogEntry[], people: readonly PersonRow[] = []): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw Object.assign(new Error('duplicate key value violates unique constraint "document_log_pkey"'), { code: '23505' });
    }
    return super.appendDocLog(id, entries, people);
  }
}

async function boot(botKey: string | null): Promise<{ base: string; draft: DraftServer; store: SplitPersistence }> {
  const dataDir = tmp();
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1',
    designDir: join(import.meta.dirname, '..', '..', '..', 'design'),
    resendApiKey: null, mailFrom: 'test <t@example.org>', mailOff: false,
    botKey,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy: false, buildSha: null, notifyEmail: null,
  };
  const store = new SplitPersistence(dataDir);
  const draft = await createDraftServer(cfg, store);
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  cfg.baseUrl = `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`;
  booted.push(draft);
  return { base: cfg.baseUrl, draft, store };
}

const post = (base: string, path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: base, ...headers },
    body: JSON.stringify(body),
  });

async function follow(link: string): Promise<string> {
  const u = new URL(link);
  await fetch(u.origin + u.pathname + u.search);
  const r = await fetch(u.origin + u.pathname, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: u.origin },
    body: new URLSearchParams({ token: u.searchParams.get('token') ?? '' }).toString(),
    redirect: 'manual',
  });
  expect(r.status).toBe(302);
  return (r.headers.get('set-cookie') ?? '').split(';')[0]!;
}

async function found(base: string, title: string): Promise<{ slug: string; cookie: string }> {
  const created = await (await post(base, '/api/docs', { title, email: `founder.${title.toLowerCase()}@example.org` }))
    .json() as { ok: boolean; slug: string; devLink: string };
  expect(created.ok).toBe(true);
  return { slug: created.slug, cookie: await follow(created.devLink) };
}

type View = { seq: number; eseq: number; short?: true; paused: { at: number; expectedMs: number; elapsedMs: number } | null; stalled: boolean };
const view = async (base: string, slug: string, cookie: string, since?: string): Promise<View> =>
  (await (await fetch(`${base}/api/d/${slug}/view${since ? '?since=' + since : ''}`, { headers: { cookie } })).json()) as View;
const setChamber = (base: string, slug: string, cookie: string, rung: string) =>
  post(base, `/api/d/${slug}/cmd`, { cmd: 'set-setting', args: { setting: 'chamber', value: { rung } } }, { cookie });

describe('the announced pause (Q1345)', () => {
  it('is an unknown path without the key and refuses a wrong one', async () => {
    const bare = await boot(null);
    expect((await post(bare.base, '/api/admin/pause', {})).status).toBe(404);
    const keyed = await boot('test-key');
    expect((await post(keyed.base, '/api/admin/pause', {}, { authorization: 'Bearer wrong' })).status).toBe(401);
    expect((await post(keyed.base, '/api/admin/resume', {}, { authorization: 'Bearer wrong' })).status).toBe(401);
  });

  it('refuses every command with 503 and the pause, says paused on every view answer, and lets the pause lift', async () => {
    const { base } = await boot('test-key');
    const { slug, cookie } = await found(base, 'Paused');
    const auth = { authorization: 'Bearer test-key' };
    const before = await view(base, slug, cookie);
    expect(before.paused).toBeNull();

    const p = await post(base, '/api/admin/pause', { expectedMs: 90_000 }, auth);
    expect(p.status).toBe(200);
    const pj = (await p.json()) as { ok: boolean; paused: { expectedMs: number } };
    expect(pj.paused.expectedMs).toBe(90_000);

    // every view answer — the full one and the short one a caught-up poll gets
    const full = await view(base, slug, cookie);
    expect(full.paused).toMatchObject({ expectedMs: 90_000 });
    const short = await view(base, slug, cookie, `${full.seq}.${full.eseq}`);
    expect(short.short).toBe(true);
    expect(short.paused).toMatchObject({ expectedMs: 90_000 });
    // the stranger's door says so too
    const door = (await (await fetch(`${base}/api/d/${slug}/view`)).json()) as View & { stranger: true };
    expect(door.stranger).toBe(true);
    expect(door.paused).toMatchObject({ expectedMs: 90_000 });

    // a command is refused with the pause in the answer, and nothing moved
    const refused = await setChamber(base, slug, cookie, 'public');
    expect(refused.status).toBe(503);
    const rj = (await refused.json()) as { error: string; paused: { expectedMs: number } };
    expect(rj.paused.expectedMs).toBe(90_000);
    expect((await view(base, slug, cookie)).seq).toBe(full.seq);

    // resume: the pause is gone from the view and the command lands
    const r = await post(base, '/api/admin/resume', {}, auth);
    expect(((await r.json()) as { paused: unknown }).paused).toBeNull();
    expect((await view(base, slug, cookie)).paused).toBeNull();
    expect((await setChamber(base, slug, cookie, 'public')).status).toBe(200);
    expect((await view(base, slug, cookie)).seq).toBeGreaterThan(full.seq);
  });
});

describe('the red flag (Q1346)', () => {
  it('a save the store rejects for good marks the document stalled until a save succeeds, and healthz counts it', async () => {
    const { base, store } = await boot('test-key');
    const { slug, cookie } = await found(base, 'Stalled');
    expect((await view(base, slug, cookie)).stalled).toBe(false);

    // the next append meets another writer's rows: the command fails, and
    // the document says so on the full view, the short view and healthz
    store.failNext = true;
    const failed = await setChamber(base, slug, cookie, 'public');
    expect(failed.status).toBe(500);
    const v = await view(base, slug, cookie);
    expect(v.stalled).toBe(true);
    expect((await view(base, slug, cookie, `${v.seq}.${v.eseq}`)).stalled).toBe(true);
    const h = (await (await fetch(`${base}/healthz`)).json()) as { documentsStalled: number; errors: { total: number } };
    expect(h.documentsStalled).toBe(1);
    expect(h.errors.total).toBe(1);

    // a save that lands clears it — and carries what memory took meanwhile,
    // since the cursor advanced by nothing on the failed append
    const landed = await setChamber(base, slug, cookie, 'link');
    expect(landed.status, await landed.text()).toBe(200);
    expect((await view(base, slug, cookie)).stalled).toBe(false);
    expect(((await (await fetch(`${base}/healthz`)).json()) as { documentsStalled: number }).documentsStalled).toBe(0);
  });
});
