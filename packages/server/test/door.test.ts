/**
 * **The login door is rate-limited per IP and per email** (Q1341; Ed,
 * 2026-09-12). One bucket per address at 200 in ten minutes, so a
 * convention room on one venue wifi is not refused as one attacker; one
 * bucket per email at 5, so a script working one address is. The per-email
 * check runs before the roster lookup, so the door refuses a known and an
 * unknown address identically and stays no membership oracle.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { FilePersistence } from '../src/persistence.js';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';

const tmp = () => mkdtempSync(join(tmpdir(), 'draft-door-'));

const booted: DraftServer[] = [];
afterAll(async () => { for (const d of booted) await d.close(); });

async function boot(trustProxy: boolean): Promise<{ base: string }> {
  const dataDir = tmp();
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1',
    designDir: join(import.meta.dirname, '..', '..', '..', 'design'),
    resendApiKey: null, mailFrom: 'test <t@example.org>', mailOff: false,
    botKey: null,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy, buildSha: null, notifyEmail: null,
  };
  const draft = await createDraftServer(cfg, new FilePersistence(dataDir));
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  cfg.baseUrl = `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`;
  booted.push(draft);
  return { base: cfg.baseUrl };
}

const post = (base: string, path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: base, ...headers },
    body: JSON.stringify(body),
  });

/** A verified founding, so the document has one member whose address is known. */
async function found(base: string, title: string, email: string): Promise<string> {
  const created = await (await post(base, '/api/docs', { title, email }))
    .json() as { ok: boolean; slug: string; devLink: string };
  expect(created.ok).toBe(true);
  const u = new URL(created.devLink);
  await fetch(u.origin + u.pathname + u.search);
  const r = await fetch(u.origin + u.pathname, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: u.origin },
    body: new URLSearchParams({ token: u.searchParams.get('token') ?? '' }).toString(),
    redirect: 'manual',
  });
  expect(r.status).toBe(302);
  return created.slug;
}

const login = (base: string, slug: string, email: string, headers: Record<string, string> = {}) =>
  post(base, `/api/d/${slug}/login`, { email }, headers);

describe('the login door (Q1341)', () => {
  it('allows five logins per email in the window and refuses the sixth, known or unknown alike', async () => {
    const { base } = await boot(false);
    const founder = 'founder.door@example.org';
    const slug = await found(base, 'Door', founder);

    // a member's address: five pass, the sixth is refused
    for (let i = 0; i < 5; i++) {
      expect((await login(base, slug, founder)).status, `founder login ${i + 1}`).toBe(200);
    }
    const sixth = await login(base, slug, founder);
    expect(sixth.status).toBe(429);
    expect(await sixth.json()).toEqual({ error: 'too many requests — try again shortly' });

    // the same socket, another address: the per-email bucket is the address's
    expect((await login(base, slug, 'someone.else@example.org')).status).toBe(200);

    // an address nobody on the roster has behaves exactly the same way, so
    // the refusal says nothing about who is a member
    const stranger = 'nobody.here@example.org';
    for (let i = 0; i < 5; i++) {
      expect((await login(base, slug, stranger)).status, `stranger login ${i + 1}`).toBe(200);
    }
    const refused = await login(base, slug, stranger);
    expect(refused.status).toBe(429);
    expect(await refused.json()).toEqual({ error: 'too many requests — try again shortly' });

    // the address is normalised before it is keyed, so case cannot dodge the bucket
    expect((await login(base, slug, founder.toUpperCase())).status).toBe(429);
  });

  it('allows two hundred logins per IP in the window and refuses the two-hundred-and-first', async () => {
    const { base } = await boot(true);
    const slug = await found(base, 'Wifi', 'founder.wifi@example.org');
    // one stated client, two hundred addresses: nothing here is refused by the
    // per-email bucket, so what refuses the last one is the per-IP cap alone
    const ip = { 'cf-connecting-ip': '198.51.100.42' };
    for (let i = 0; i < 200; i++) {
      expect((await login(base, slug, `seat${i}@example.org`, ip)).status, `login ${i + 1}`).toBe(200);
    }
    const r = await login(base, slug, 'seat200@example.org', ip);
    expect(r.status).toBe(429);
    // another client at the same door is not refused
    expect((await login(base, slug, 'seat201@example.org', { 'cf-connecting-ip': '198.51.100.43' })).status).toBe(200);
  });
});
