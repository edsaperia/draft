/**
 * **The login door is rate-limited per IP and per email** (Q1341; Ed,
 * 2026-09-12). One bucket per address at 200 in ten minutes, so a
 * convention room on one venue wifi is not refused as one attacker; one
 * bucket per email at 10, so a script working one address is. The per-email
 * check runs before the roster lookup, so the door refuses a known and an
 * unknown address identically and stays no membership oracle.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { FilePersistence } from '../src/persistence.js';
import { rateLimited } from '../src/routes.js';
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

/** Ten mails to one address in the window (Q1341 set 5 and called it a
 *  guess; Ed raised it to 10 on 2026-09-19, issue #69 — five is one
 *  impatient member pressing 📧 while the mail is slow). */
const LOGIN_MAILS = 10;

describe('the login door (Q1341)', () => {
  it('allows ten logins per email in the window and refuses the eleventh, known or unknown alike', async () => {
    const { base } = await boot(false);
    const founder = 'founder.door@example.org';
    const slug = await found(base, 'Door', founder);

    // a member's address: ten pass, the eleventh is refused
    for (let i = 0; i < LOGIN_MAILS; i++) {
      expect((await login(base, slug, founder)).status, `founder login ${i + 1}`).toBe(200);
    }
    const eleventh = await login(base, slug, founder);
    expect(eleventh.status).toBe(429);
    expect(await eleventh.json()).toEqual({ error: 'too many requests — try again shortly' });

    // the same socket, another address: the per-email bucket is the address's
    expect((await login(base, slug, 'someone.else@example.org')).status).toBe(200);

    // an address nobody on the roster has behaves exactly the same way, so
    // the refusal says nothing about who is a member
    const stranger = 'nobody.here@example.org';
    for (let i = 0; i < LOGIN_MAILS; i++) {
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

/**
 * **The arrival doors are sized for twenty phones on one address** (issue
 * #69; Ed, 2026-09-19). A venue NATs every phone to one address, so each of
 * these buckets is the whole room's, and the caps were sized for ten — a
 * room of twenty spent the door's 1500 in five minutes and then sawtoothed,
 * five minutes alive and five dead. Each case drives one bucket to its
 * boundary: the cap is served, the next request is the 429. The numbers are
 * the point, so they are written out here rather than imported.
 */
const CAPS = { stranger: 6000, auth: 200, apply: 200, docs: 60, slug: 600, pending: 600 };

/** One `BUCKET` map serves this whole file, so a case sharing an address
 *  with another would share its budget: every case takes a fresh one. */
let nextIp = 100;
const client = (): Record<string, string> => ({ 'cf-connecting-ip': `198.51.100.${nextIp++}` });

/** Drive a door `n` times and say how many were not refused, reading every
 *  body so no socket is left holding one. The host writes a line per
 *  response and the runner captures every one of them, which at six
 *  thousand costs more than the requests do: the line is silenced for the
 *  length of the loop and handed back, whatever happens. */
async function spend(n: number, once: (i: number) => Promise<Response>): Promise<number> {
  const said = console.log;
  console.log = () => {};
  try {
    let served = 0;
    for (let i = 0; i < n; i++) {
      const r = await once(i);
      await r.arrayBuffer();
      if (r.status !== 429) served += 1;
    }
    return served;
  } finally { console.log = said; }
}

describe('the arrival doors (issue #69)', () => {
  it('serves a cookieless page six thousand views on one address, then refuses', async () => {
    const { base } = await boot(true);
    const slug = await found(base, 'Venue', 'founder.venue@example.org');
    const ip = client();
    // Six thousand round trips are seventy seconds of CI for a number, so
    // all but the last two are counted straight into the bucket the door
    // keys — `${route}:${ip}`, the limiter's own module, the one the host
    // is holding. The boundary is still the real door's: with the bucket at
    // 5998, two requests must be served and the next refused, which is red
    // if the literal moves in either direction, and red too if the door
    // ever keys its bucket some other way — nothing here can pass vacuously.
    for (let i = 0; i < CAPS.stranger - 2; i++) {
      rateLimited(`stranger:${ip['cf-connecting-ip']}`, Date.now(), CAPS.stranger);
    }
    // the quiet poll — `since` at the document's own sequence — is what a
    // page actually sends every four seconds, and costs the bucket exactly
    // what a full view does, the limiter standing above that branch
    const opening = await fetch(`${base}/api/d/${slug}/view`, { headers: ip });
    expect(opening.status, 'the five-thousand-nine-hundred-and-ninety-ninth view').toBe(200);
    const { seq, eseq } = await opening.json() as { seq: number; eseq: number };
    const quiet = `${base}/api/d/${slug}/view?since=${seq}.${eseq}`;
    expect((await fetch(quiet, { headers: ip })).status, 'the six-thousandth').toBe(200);
    expect((await fetch(quiet, { headers: ip })).status, 'the six-thousand-and-first').toBe(429);
    // the phone beside it, on its own address, is untouched
    expect((await fetch(quiet, { headers: client() })).status).toBe(200);
  }, 60_000);

  it('shares two hundred arrivals between /auth/create, /auth/login and /auth/apply', async () => {
    const { base } = await boot(true);
    const ip = client();
    const doors = ['/auth/create', '/auth/login', '/auth/apply'];
    const arrive = (path: string) => fetch(base + path, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', origin: base, ...ip },
      body: new URLSearchParams({ token: 'no-such-token' }).toString(),
      redirect: 'manual',
    });
    // spent across all three doors, because `auth:<ip>` is one bucket
    const served = await spend(CAPS.auth, (i) => arrive(doors[i % 3]!));
    expect(served, 'arrivals served').toBe(CAPS.auth);
    for (const door of doors) expect((await arrive(door)).status, door).toBe(429);
  }, 60_000);

  it('answers a refused arrival with a page, and leaves the link it carried good', async () => {
    const { base } = await boot(true);
    // a real, unspent creation link: the interstitial auto-submits it, so
    // whatever this door writes is what the browser renders
    const created = await (await post(base, '/api/docs', { title: 'Busy', email: 'founder.busy@example.org' }))
      .json() as { devLink: string };
    const link = new URL(created.devLink);
    const token = link.searchParams.get('token') ?? '';
    const ip = client();
    const arrive = (headers: Record<string, string>) => fetch(base + '/auth/create?d=busy', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', origin: base, ...headers },
      body: new URLSearchParams({ token }).toString(),
      redirect: 'manual',
    });
    await spend(CAPS.auth, () => fetch(base + '/auth/create', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', origin: base, ...ip },
      body: new URLSearchParams({ token: 'no-such-token' }).toString(),
      redirect: 'manual',
    }));
    const refused = await arrive(ip);
    expect(refused.status).toBe(429);
    // a person is looking at this, so it is the docs.vote shell and not JSON
    expect(refused.headers.get('content-type')).toMatch(/text\/html/);
    expect(refused.headers.get('retry-after')).toBe('300');
    const page = await refused.text();
    expect(page).toContain('<!doctype html>');
    expect(page, 'the page says the link is still good').toContain('still good');
    expect(page, 'and re-posts it, so the retry is one press').toContain(token);
    // the whole of the promise: the limiter stands above `useToken`, so the
    // token was never spent — another address walks straight in with it
    expect((await arrive(client())).status, 'the same link, another address').toBe(302);
  }, 60_000);

  /* **A body the door cannot read is still counted** (issue #89): 264da28
   * read the token above the brake so a refusal could hand it back, and a
   * malformed or oversized body threw before `tooMany` ever saw it — never
   * counted, each one a row in the error log. The bucket is filled to one
   * short of its cap straight through the limiter's own module, as the
   * stranger case does; the unreadable request must be the one that fills
   * it, so the good arrival after it is the 429. */
  it('counts a malformed or oversized body at all three doors before it reads it', async () => {
    const { base } = await boot(true);
    const bodies: Array<[string, Record<string, string>, string]> = [
      ['malformed json', { 'content-type': 'application/json' }, '{'],
      ['oversized form', { 'content-type': 'application/x-www-form-urlencoded' },
        'token=' + 'x'.repeat(10_001)],
    ];
    for (const door of ['/auth/create', '/auth/login', '/auth/apply']) {
      for (const [what, headers, body] of bodies) {
        const ip = client();
        for (let i = 0; i < CAPS.auth - 1; i++) {
          rateLimited(`auth:${ip['cf-connecting-ip']}`, Date.now(), CAPS.auth);
        }
        const bad = await fetch(base + door, {
          method: 'POST', headers: { origin: base, ...headers, ...ip }, body, redirect: 'manual',
        });
        await bad.arrayBuffer();
        expect(bad.status, `${door} · ${what} · the two-hundredth`).not.toBe(429);
        const good = await fetch(base + door, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded', origin: base, ...ip },
          body: new URLSearchParams({ token: 'no-such-token' }).toString(),
          redirect: 'manual',
        });
        await good.arrayBuffer();
        expect(good.status, `${door} · after ${what} · the two-hundred-and-first`).toBe(429);
        // and past the cap the unreadable body is refused like any other
        const again = await fetch(base + door, {
          method: 'POST', headers: { origin: base, ...headers, ...ip }, body, redirect: 'manual',
        });
        await again.arrayBuffer();
        expect(again.status, `${door} · ${what} · past the cap`).toBe(429);
      }
    }
  }, 60_000);

  it('serves two hundred knocks at /apply on one address, then refuses', async () => {
    const { base } = await boot(true);
    const slug = await found(base, 'Knock', 'founder.knock@example.org');
    const ip = client();
    // an empty body is refused as a bad request *after* the limiter has
    // counted it, which is what makes this the bucket's own boundary
    const knock = () => post(base, `/api/d/${slug}/apply`, {}, ip);
    expect(await spend(CAPS.apply, knock), 'knocks served').toBe(CAPS.apply);
    expect((await knock()).status).toBe(429);
  }, 60_000);

  it('serves sixty creations on one address, then refuses', async () => {
    const { base } = await boot(true);
    const ip = client();
    const create = () => post(base, '/api/docs', {}, ip);
    expect(await spend(CAPS.docs, create), 'creations served').toBe(CAPS.docs);
    expect((await create()).status).toBe(429);
  }, 60_000);

  it('serves six hundred address checks on one address, then refuses', async () => {
    const { base } = await boot(true);
    const ip = client();
    const ask = () => fetch(`${base}/api/slug/free-address`, { headers: ip });
    expect(await spend(CAPS.slug, ask), 'address checks served').toBe(CAPS.slug);
    expect((await ask()).status).toBe(429);
  }, 60_000);

  it('serves six hundred stashes on one address, then refuses', async () => {
    const { base } = await boot(true);
    const ip = client();
    const stash = () => post(base, '/api/docs/pending', { pendingId: 'no-such-draft', text: 'x' }, ip);
    expect(await spend(CAPS.pending, stash), 'stashes served').toBe(CAPS.pending);
    expect((await stash()).status).toBe(429);
  }, 60_000);
});
