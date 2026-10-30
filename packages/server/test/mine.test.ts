/**
 * **The 🪶 documents menu** (issue #227, Q1603): `GET /api/mine` lists what
 * the request's cookies sign into and nothing a cookie cannot open, and
 * `POST /api/mine/links` answers alike for any address and mails one login
 * link per membership, found through the stored people rows.
 */
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { FilePersistence, OUTBOX_MAX_ATTEMPTS } from '../src/persistence.js';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';

const tmp = () => mkdtempSync(join(tmpdir(), 'draft-mine-'));
const booted: DraftServer[] = [];
afterAll(async () => { for (const d of booted) await d.close(); });

async function boot() {
  const dataDir = tmp();
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1',
    designDir: join(import.meta.dirname, '..', '..', '..', 'design'),
    resendApiKey: null, mailFrom: 'test <t@example.org>', mailOff: false,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy: false, buildSha: null, notifyEmail: null,
  };
  const p = new FilePersistence(dataDir);
  const draft = await createDraftServer(cfg, p);
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  cfg.baseUrl = `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`;
  booted.push(draft);
  return { base: cfg.baseUrl, dataDir, p, cfg, draft };
}

const post = (base: string, path: string, body: unknown, cookie?: string) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: base, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });

type Mail = { to: string; subject: string; text: string; link?: string };
const inbox = (dataDir: string): Mail[] => {
  const p = join(dataDir, 'outbox.jsonl');
  return existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Mail) : [];
};

/** found a document by `email` and follow the creation link: its slug and the founder's cookie */
async function found(base: string, dataDir: string, title: string, email: string) {
  const made = await post(base, '/api/docs', { title, email, isMember: true });
  const { slug } = await made.json() as { slug: string };
  const link = inbox(dataDir).at(-1)!.link!;
  const u = new URL(link);
  const landed = await fetch(u.origin + u.pathname, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: base },
    body: new URLSearchParams({ token: u.searchParams.get('token')! }).toString(), redirect: 'manual',
  });
  return { slug, cookie: landed.headers.get('set-cookie')!.split(';')[0]! };
}

const settle = () => new Promise((r) => setTimeout(r, 150));

describe('the 🪶 documents menu', () => {
  it('keeps every queued link revocable when delivery permanently fails', async () => {
    const { base, dataDir, p, cfg, draft } = await boot();
    await found(base, dataDir, 'First Charter', 'queued@example.org');
    await found(base, dataDir, 'Second Charter', 'queued@example.org');
    cfg.mailOff = true;
    await post(base, '/api/mine/links', { email: 'queued@example.org' });
    await vi.waitFor(async () => {
      expect((await p.dumpOutbox()).find((row) => row.tokenHashes?.length === 2)).toBeDefined();
    });
    const row = (await p.dumpOutbox()).find((entry) => entry.tokenHashes?.length === 2)!;
    const hashes = row.tokenHashes!;
    expect((await p.dumpTokens()).filter(([hash]) => hashes.includes(hash))).toHaveLength(2);
    vi.spyOn(draft.mailer, 'send').mockRejectedValue(new Error('delivery refused'));
    cfg.mailOff = false;
    for (let i = 0; i < OUTBOX_MAX_ATTEMPTS; i++) {
      await draft.outbox.run(row.createdMs + i * 3_600_001);
    }
    expect((await p.dumpTokens()).filter(([hash]) => hashes.includes(hash))).toEqual([]);
  });

  it('revokes newly minted links if their email cannot be queued', async () => {
    const { base, dataDir, p } = await boot();
    await found(base, dataDir, 'First Charter', 'queue-failure@example.org');
    await found(base, dataDir, 'Second Charter', 'queue-failure@example.org');
    const before = await p.dumpTokens();
    const enqueue = vi.spyOn(p, 'putOutbox').mockRejectedValue(new Error('store unavailable'));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect((await post(base, '/api/mine/links', { email: 'queue-failure@example.org' })).status).toBe(200);
      await vi.waitFor(() => expect(enqueue).toHaveBeenCalled());
      await vi.waitFor(async () => expect(await p.dumpTokens()).toEqual(before));
    } finally { enqueue.mockRestore(); errors.mockRestore(); }
  });

  it('lists what the cookies sign into, and nothing a cookie cannot open', async () => {
    const { base, dataDir } = await boot();
    const a = await found(base, dataDir, 'First Charter', 'ada@example.org');
    const b = await found(base, dataDir, 'Second Charter', 'Ada@Example.org');
    const mine = async (cookie: string) =>
      ((await (await fetch(`${base}/api/mine`, { headers: { cookie } })).json()) as { docs: Array<Record<string, unknown>> }).docs;
    const both = await mine(`${a.cookie}; ${b.cookie}`);
    expect(both.map((d) => d.slug).sort()).toEqual([a.slug, b.slug].sort());
    expect(Object.keys(both[0]!).sort()).toEqual(['closed', 'name', 'picture', 'signedMs', 'slug', 'title']);
    expect(both.find((d) => d.slug === a.slug)).toMatchObject({ title: 'First Charter', closed: false });
    // a cookie worn under another document's name speaks for nothing
    const [, value] = a.cookie.split('=');
    const misnamed = `${b.cookie.split('=')[0]}=${value}`;
    expect(await mine(misnamed)).toEqual([]);
    // nor does a forged one, nor none at all
    expect(await mine(`${a.cookie.slice(0, -3)}xyz`)).toEqual([]);
    expect(await mine('')).toEqual([]);
  });

  it('answers alike for any address, and mails one link per document holding it', async () => {
    const { base, dataDir, p } = await boot();
    const a = await found(base, dataDir, 'First Charter', 'bea@example.org');
    await found(base, dataDir, 'Second Charter', 'bea@example.org');
    await found(base, dataDir, 'Somebody Else', 'cal@example.org');
    expect(a.slug).toBeTruthy();
    // the stored rows find the address, case-blind, without a document loaded
    expect((await p.documentsWithEmail('BEA@example.org')).length).toBe(2);

    const known = await post(base, '/api/mine/links', { email: 'Bea@example.org' });
    const unknown = await post(base, '/api/mine/links', { email: 'nobody@example.org' });
    expect(known.status).toBe(200);
    expect(await known.text()).toBe(await unknown.text());
    await settle();
    const mails = inbox(dataDir).filter((m) => /Log in to/.test(m.subject));
    expect(mails).toHaveLength(1);
    expect(mails[0]!.subject).toBe('Log in to your 2 documents on docs.vote');
    expect((mails[0]!.text.match(/\/auth\/login\?token=/g) ?? []).length).toBe(2);
    expect(mails[0]!.text).toContain('“First Charter”');
    expect(mails[0]!.text).toContain('“Second Charter”');
    expect(inbox(dataDir).some((m) => m.to === 'nobody@example.org')).toBe(false);
  });

  it('spends from the login door’s per-address allowance', async () => {
    const { base } = await boot();
    const codes: number[] = [];
    for (let i = 0; i < 11; i += 1) codes.push((await post(base, '/api/mine/links', { email: 'dee@example.org' })).status);
    expect(codes.slice(0, 10).every((c) => c === 200)).toBe(true);
    expect(codes[10]).toBe(429);
  });
});
