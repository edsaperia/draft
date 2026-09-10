/**
 * **Bots on docs.vote** (Q1310; Ed, 2026-09-10: *we can have bot users in
 * prod — we're still in alpha*, and *why don't we catch all emails to
 * \*@bots.docs.vote instead, since they could never be confused for a real
 * email address*). Four things, each its own test: the mailer catches a
 * bot's mail with a Resend key configured and never calls the provider; the
 * domain rule is exact; the keyed route is an unknown path without a key,
 * refuses a wrong one, and serves the filed mail with its link to the right
 * one; and a dev server files a bot's mail in both outboxes.
 */
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BOT_OUTBOX_FILE, isBotAddress, makeMailer } from '../src/mailer.js';
import { FilePersistence } from '../src/persistence.js';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';

const tmp = () => mkdtempSync(join(tmpdir(), 'draft-bots-'));

/* The provider must never hear of a bot. The tests talk to their own server
   over the same global fetch, so the wrapper passes everything else through
   and counts — rather than answers — anything aimed at Resend. */
const realFetch = globalThis.fetch;
let resendCalls = 0;
beforeAll(() => {
  globalThis.fetch = ((input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    if (String(input instanceof Request ? input.url : input).includes('api.resend.com')) {
      resendCalls += 1;
      return Promise.reject(new Error('the test reached Resend'));
    }
    return realFetch(input, init);
  }) as typeof fetch;
});
afterAll(() => { globalThis.fetch = realFetch; });

const rows = (dir: string, file: string): Array<{ to: string; subject: string; link?: string }> =>
  existsSync(join(dir, file))
    ? readFileSync(join(dir, file), 'utf8').split('\n').filter(Boolean)
        .map((l) => JSON.parse(l) as { to: string; subject: string; link?: string })
    : [];

describe('the mailer catches a bot\'s mail (Q1310)', () => {
  it('with a Resend key configured, x@bots.docs.vote never reaches the provider and lands in the bot outbox', async () => {
    const dir = tmp();
    const mailer = makeMailer({ resendApiKey: 'not-a-real-key', mailFrom: 't <t@example.org>', dataDir: dir });
    const before = resendCalls;
    await mailer.send({ to: 'ada@bots.docs.vote', subject: 'You are invited', text: 'x',
      link: 'https://docs.vote/auth/invite?token=t' });
    expect(resendCalls).toBe(before);
    expect(rows(dir, BOT_OUTBOX_FILE)).toEqual([
      expect.objectContaining({ to: 'ada@bots.docs.vote', subject: 'You are invited',
        link: 'https://docs.vote/auth/invite?token=t' }),
    ]);
    // the dev outbox is the dev branch's; a production mailer writes none
    expect(existsSync(join(dir, 'outbox.jsonl'))).toBe(false);
    // and a real address still goes to the provider — the wrapper refuses it
    await expect(mailer.send({ to: 'ada@example.org', subject: 'real', text: 'y' })).rejects.toThrow();
    expect(resendCalls).toBe(before + 1);
  });

  it('the domain must match exactly, case aside', () => {
    expect(isBotAddress('ada@bots.docs.vote')).toBe(true);
    expect(isBotAddress('Ada.Lovelace@BOTS.DOCS.VOTE')).toBe(true);
    expect(isBotAddress('a+b@bots.docs.vote')).toBe(true);
    // a stranger's domain that merely contains the bots' is a stranger's
    expect(isBotAddress('x@bots.docs.vote.evil.com')).toBe(false);
    expect(isBotAddress('x@notbots.docs.vote')).toBe(false);
    expect(isBotAddress('x@docs.vote')).toBe(false);
    expect(isBotAddress('bots.docs.vote')).toBe(false);
    expect(isBotAddress('x@bots.docs.vote@example.org')).toBe(false);
  });
});

/* ---- the route, over a real socket -------------------------------------- */

const booted: DraftServer[] = [];
afterAll(async () => { for (const d of booted) await d.close(); });

async function boot(over: { resendApiKey?: string | null; botKey?: string | null } = {}):
  Promise<{ base: string; dataDir: string; draft: DraftServer }> {
  const dataDir = tmp();
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1',
    designDir: join(import.meta.dirname, '..', '..', '..', 'design'),
    resendApiKey: over.resendApiKey ?? null, mailFrom: 'test <t@example.org>', mailOff: false,
    botKey: over.botKey ?? null,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy: false, buildSha: null, notifyEmail: null,
  };
  const draft = await createDraftServer(cfg, new FilePersistence(dataDir));
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  cfg.baseUrl = `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`;
  booted.push(draft);
  return { base: cfg.baseUrl, dataDir, draft };
}

const post = (base: string, path: string, body: unknown, cookie?: string) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: base,
      ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });

type Outbox = { mails: Array<{ to: string; subject: string; link?: string }> };
const readBots = (base: string, key?: string) =>
  fetch(`${base}/api/bots/outbox`, key === undefined ? {} : { headers: { authorization: `Bearer ${key}` } });

/** Follow a magic link the way the interstitial does: GET, then POST the token back. */
async function follow(link: string): Promise<{ cookie: string; location: string }> {
  const u = new URL(link);
  await fetch(u.origin + u.pathname + u.search);
  const r = await fetch(u.origin + u.pathname, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: u.origin },
    body: new URLSearchParams({ token: u.searchParams.get('token') ?? '' }).toString(),
    redirect: 'manual',
  });
  expect(r.status).toBe(302);
  return { cookie: (r.headers.get('set-cookie') ?? '').split(';')[0]!,
    location: r.headers.get('location') ?? '' };
}

describe('GET /api/bots/outbox', () => {
  it('is an unknown path without a key configured, whatever is sent', async () => {
    const { base } = await boot({ resendApiKey: 'not-a-real-key', botKey: null });
    expect((await readBots(base)).status).toBe(404);
    const r = await readBots(base, 'anything');
    expect(r.status).toBe(404);
    // the same body as any other unknown path — nothing says the route exists
    expect(await r.json()).toEqual({ error: 'not found' });
    expect((await fetch(`${base}/api/no-such-route`)).status).toBe(404);
  });

  it('refuses a missing or wrong key with 401 and no detail, and serves the filed mail with its link to the right one', async () => {
    const { base, draft } = await boot({ resendApiKey: 'not-a-real-key', botKey: 'test-key' });
    const before = resendCalls;
    for (const r of [await readBots(base), await readBots(base, 'wrong-key'),
      await readBots(base, 'test-key-longer'), await readBots(base, 'test-ke')]) {
      expect(r.status).toBe(401);
      expect(await r.json()).toEqual({ error: 'unauthorized' });
    }
    // a bare token without the scheme is not a bearer
    expect((await fetch(`${base}/api/bots/outbox`, { headers: { authorization: 'test-key' } })).status).toBe(401);

    const ok = await readBots(base, 'test-key');
    expect(ok.status).toBe(200);
    expect(ok.headers.get('cache-control')).toBe('no-store');
    expect(await ok.json()).toEqual({ mails: [] });

    // a document founded by a bot: the creation mail is filed, never sent,
    // and the link in it creates the document like any founder's would
    const created = await (await post(base, '/api/docs',
      { title: 'Bot Room', email: 'founder@bots.docs.vote' })).json() as { ok: boolean; slug: string; devLink?: string };
    expect(created.ok).toBe(true);
    expect(created.devLink).toBeUndefined(); // a production mailer hands back no link
    const filed = (await (await readBots(base, 'test-key')).json() as Outbox).mails;
    expect(filed).toHaveLength(1);
    expect(filed[0]).toMatchObject({ to: 'founder@bots.docs.vote', subject: 'Create “Bot Room”' });
    expect(filed[0]!.link).toMatch(/\/auth\/create\?token=/);
    const founder = await follow(filed[0]!.link!);
    expect(founder.location).toContain(`/d/${created.slug}`);

    // an invitation to a bot rides the durable outbox and lands the same way
    const inv = await post(base, `/api/d/${created.slug}/cmd`,
      { cmd: 'invite', args: { email: 'ada.lovelace@bots.docs.vote' } }, founder.cookie);
    expect(inv.status).toBe(200);
    await draft.outbox.run();
    const mails = (await (await readBots(base, 'test-key')).json() as Outbox).mails;
    // newest first, the dev outbox's own order
    expect(mails.map((m) => m.to)).toEqual(['ada.lovelace@bots.docs.vote', 'founder@bots.docs.vote']);
    expect(mails[0]).toMatchObject({ subject: 'You are invited to “Bot Room”' });
    const ada = await follow(mails[0]!.link!);
    expect(ada.location).toContain(`/d/${created.slug}`);
    const seat = await fetch(`${base}/api/d/${created.slug}/view`, { headers: { cookie: ada.cookie } });
    expect(seat.status).toBe(200);
    // and the invitation row is delivered, not failed: a bot is never a bounce
    expect(await draft.outbox.counts()).toEqual({ pending: 0, failed: 0 });
    expect(resendCalls).toBe(before);
  });

  it('in dev mode a bot\'s mail appears in both outboxes, and a member\'s in the dev one alone', async () => {
    const { base, dataDir } = await boot({ resendApiKey: null, botKey: 'test-key' });
    const created = await (await post(base, '/api/docs',
      { title: 'Dev Bot Room', email: 'founder@bots.docs.vote' })).json() as { ok: boolean; devLink?: string };
    expect(created.ok).toBe(true);
    expect(created.devLink).toMatch(/\/auth\/create\?token=/); // the dev branch still hands the link back
    await post(base, '/api/docs', { title: 'Human Room', email: 'ada@example.org' });

    const dev = (await (await fetch(`${base}/api/dev/outbox`)).json() as Outbox).mails;
    expect(dev.map((m) => m.to)).toEqual(['ada@example.org', 'founder@bots.docs.vote']);
    const bots = (await (await readBots(base, 'test-key')).json() as Outbox).mails;
    expect(bots.map((m) => m.to)).toEqual(['founder@bots.docs.vote']);
    expect(bots[0]!.link).toBe(created.devLink);
    // the two files, not one file read twice
    expect(rows(dataDir, 'outbox.jsonl')).toHaveLength(2);
    expect(rows(dataDir, BOT_OUTBOX_FILE)).toHaveLength(1);
  });
});
