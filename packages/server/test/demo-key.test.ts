/**
 * **The demo door** (design/DEMO.md Stage 2; Q1535): Ed's key, the cookie it
 * mints, the panel, Reset and the seat switch — the one dev-shaped surface
 * that ships, so every claim of DEMO.md §0.2 is held here: an unknown path
 * without the key, a 401 without the cookie, a passphrase compared in
 * constant time and **wrong guesses locked out** (five a minute from one
 * address lock it for five minutes, Ed 2026-09-24), rotation killing every
 * cookie, Reset retiring the old generation, the seat switch acting on the
 * demo alone, and the view's `demoPanel` flag nowhere but there.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';
import { FilePersistence } from '../src/persistence.js';
import { cookieName } from '../src/routes.js';
import { forgetGuesses, GUESS_LIMIT } from '../src/demo-access.js';

const DESIGN_DIR = join(import.meta.dirname, '..', '..', '..', 'design');
const KEY = 'oven-marble-quiet-harbour-seven';

interface Booted { base: string; draft: DraftServer; dataDir: string }
const booted: Booted[] = [];

async function boot(demoKey: string | null, dataDir?: string): Promise<Booted> {
  const dir = dataDir ?? mkdtempSync(join(tmpdir(), 'draft-demokey-'));
  const cfg = {
    port: 0, dataDir: dir, baseUrl: 'http://127.0.0.1', designDir: DESIGN_DIR,
    resendApiKey: null as string | null, mailFrom: 'test <t@example.org>', mailOff: false,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    // the proxy's own header states the client, so each test can be its own address
    trustProxy: true, buildSha: null, notifyEmail: null,
    engineTuning: { cooldownMs: 0 },
    demo: true, demoKey,
  };
  const draft = await createDraftServer(cfg, new FilePersistence(dir));
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  cfg.baseUrl = `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`;
  const b = { base: cfg.baseUrl, draft, dataDir: dir };
  booted.push(b);
  return b;
}
afterAll(async () => { for (const b of booted) await b.draft.close(); });
beforeEach(() => forgetGuesses());

let n = 0;
/** A fresh client address for each caller that wants one. */
const addr = (): string => `10.0.0.${++n}`;
const get = (b: Booted, path: string, ip: string, cookie?: string) =>
  fetch(b.base + path, { redirect: 'manual',
    headers: { 'cf-connecting-ip': ip, ...(cookie ? { cookie } : {}) } });
const post = (b: Booted, path: string, ip: string, body: unknown, cookie?: string) =>
  fetch(b.base + path, { method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body) });
const demoCookieOf = (res: Response): string | null => {
  const h = res.headers.get('set-cookie') ?? '';
  const m = /draft_demo=[^;]+/.exec(h);
  return m ? m[0] : null;
};
/** Ed, having visited /d/demo?demokey=… once. */
async function edCookie(b: Booted, ip = addr()): Promise<string> {
  const r = await get(b, `/d/demo?demokey=${encodeURIComponent(KEY)}`, ip);
  expect(r.status).toBe(302);
  return demoCookieOf(r)!;
}

describe('the demo door (DEMO.md Stage 2)', () => {
  it('without DRAFT_DEMO_KEY: every control is an unknown path, and ?demokey= sets nothing', async () => {
    const b = await boot(null);
    const ip = addr();
    const unknown = await get(b, '/api/no-such-thing', ip);
    const unknownBody = await unknown.text();
    for (const r of [await get(b, '/api/demo/panel', ip), await post(b, '/api/demo/reset', ip, {}),
      await post(b, '/api/demo/seat', ip, { member: 'founder' })]) {
      expect(r.status).toBe(404);
      expect(await r.text()).toBe(unknownBody);
    }
    const page = await get(b, '/d/demo?demokey=anything', ip);
    expect(page.status).toBe(200);
    expect(demoCookieOf(page)).toBeNull();
  });

  it('the right passphrase sets an HttpOnly SameSite=Strict cookie and takes the key out of the address', async () => {
    const b = await boot(KEY);
    const r = await get(b, `/d/demo?demokey=${encodeURIComponent(KEY)}`, addr());
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toBe('/d/demo');
    const h = r.headers.get('set-cookie')!;
    expect(h).toMatch(/^draft_demo=\d+\.[A-Za-z0-9_-]+; Path=\/; HttpOnly; SameSite=Strict/);
    // the cookie holds an HMAC, never the key
    expect(h).not.toContain(KEY);
    const panel = await get(b, '/api/demo/panel', addr(), demoCookieOf(r)!);
    expect(panel.status).toBe(200);
    const d = await panel.json() as { state: string; seats: { name: string; founder: boolean }[] };
    expect(d.state).toBe('built');
    expect(d.seats[0]).toMatchObject({ name: 'Professor Lucia Ferrante', founder: true });
    expect(d.seats).toHaveLength(14);
  });

  it('a wrong key sets nothing; five wrong in a minute lock the address, the right key included', async () => {
    const b = await boot(KEY);
    const ip = addr();
    for (let k = 1; k < GUESS_LIMIT; k++) {
      const r = await get(b, '/d/demo?demokey=oven-marble-quiet-harbour-six', ip);
      expect(r.status).toBe(302);
      expect(demoCookieOf(r)).toBeNull();
    }
    const fifth = await get(b, '/d/demo?demokey=wrong', ip);
    expect(fifth.status).toBe(429);
    const right = await get(b, `/d/demo?demokey=${encodeURIComponent(KEY)}`, ip);
    expect(right.status).toBe(429);
    expect(demoCookieOf(right)).toBeNull();
    // another address is untouched by it
    expect(demoCookieOf(await get(b, `/d/demo?demokey=${encodeURIComponent(KEY)}`, addr()))).not.toBeNull();
  });

  it('the API rows count a missing or forged cookie as a wrong try, and lock too', async () => {
    const b = await boot(KEY);
    const ip = addr();
    for (let k = 1; k < GUESS_LIMIT; k++) {
      expect((await get(b, '/api/demo/panel', ip, 'draft_demo=1.forged')).status).toBe(401);
    }
    expect((await get(b, '/api/demo/panel', ip)).status).toBe(401);
    // locked: even Ed's real cookie is refused from this address for now
    const cookie = await edCookie(b);
    expect((await get(b, '/api/demo/panel', ip, cookie)).status).toBe(429);
  });

  it('changing the key and restarting kills every cookie minted under the old one', async () => {
    const a = await boot(KEY);
    const cookie = await edCookie(a);
    expect((await get(a, '/api/demo/panel', addr(), cookie)).status).toBe(200);
    await a.draft.close();
    const b = await boot('a-new-passphrase-entirely', a.dataDir);
    expect((await get(b, '/api/demo/panel', addr(), cookie)).status).toBe(401);
  });

  it('Reset makes a new generation: the old id gone, the old seat a stranger, /healthz moved', async () => {
    const b = await boot(KEY);
    const cookie = await edCookie(b);
    const old = b.draft.store.bySlug('demo')!;
    const seat = await post(b, '/api/demo/seat', addr(), { member: 'founder' }, cookie);
    expect(seat.status).toBe(200);
    const member = /draft_session_[^;]+/.exec(seat.headers.get('set-cookie')!)![0];
    expect(member.startsWith(cookieName(old.id))).toBe(true);
    const before = await (await fetch(b.base + '/healthz')).json() as { demo: { generation: number } };
    const r = await post(b, '/api/demo/reset', addr(), {}, cookie);
    expect(r.status).toBe(200);
    const after = await (await fetch(b.base + '/healthz')).json() as { demo: { generation: number } };
    expect(after.demo.generation).toBe(before.demo.generation + 1);
    expect(b.draft.store.byId(old.id)).toBeNull();
    const v = await (await get(b, '/api/d/demo/view', addr(), `${member}; ${cookie}`)).json() as { stranger?: boolean };
    expect(v.stranger).toBe(true);
  });

  it('the seat switch sits in this generation\'s seats alone, and takes no document from the request', async () => {
    const b = await boot(KEY);
    const cookie = await edCookie(b);
    await b.draft.store.create('d-another', { title: 'Another document', slug: 'another',
      convenor: { id: 'founder', email: 'x@example.org', isMember: true } }, Date.now());
    expect((await post(b, '/api/demo/seat', addr(), { member: 'm-999' }, cookie)).status).toBe(404);
    // a slug in the body is ignored: the cookie is for the demo, never the other document
    const r = await post(b, '/api/demo/seat', addr(), { member: 'founder', slug: 'another', doc: 'd-another' }, cookie);
    expect(r.status).toBe(200);
    const demo = b.draft.store.bySlug('demo')!;
    expect(r.headers.get('set-cookie')!.startsWith(cookieName(demo.id) + '=')).toBe(true);
    const seated = /draft_session_[^;]+/.exec(r.headers.get('set-cookie')!)![0];
    const v = await (await get(b, '/api/d/demo/view', addr(), `${seated}; ${cookie}`)).json() as {
      me: string; isFounder: boolean; demoPanel?: boolean };
    expect(v.isFounder).toBe(true);
    expect(v.demoPanel).toBe(true);
    // …and a member's seat, to show the other side
    const member = demo.cs.memberRecords().keys().next().value as string;
    const m = await post(b, '/api/demo/seat', addr(), { member }, cookie);
    expect(m.status).toBe(200);
  });

  it('demoPanel rides the view on the demo alone, and only for the cookie', async () => {
    const b = await boot(KEY);
    const cookie = await edCookie(b);
    const stranger = await (await get(b, '/api/d/demo/view', addr())).json() as { demoPanel?: boolean };
    expect(stranger.demoPanel).toBeUndefined();
    const ed = await (await get(b, '/api/d/demo/view', addr(), cookie)).json() as { demoPanel?: boolean };
    expect(ed.demoPanel).toBe(true);
    await b.draft.store.create('d-other', { title: 'Other', slug: 'other',
      convenor: { id: 'founder', email: 'y@example.org', isMember: true } }, Date.now());
    const elsewhere = await (await get(b, '/api/d/other/view', addr(), cookie)).json() as { demoPanel?: boolean };
    expect(elsewhere.demoPanel).toBeUndefined();
  });

  it('a cross-site POST is refused', async () => {
    const b = await boot(KEY);
    const cookie = await edCookie(b);
    const r = await fetch(b.base + '/api/demo/reset', { method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://evil.example', cookie,
        'cf-connecting-ip': addr() }, body: '{}' });
    expect(r.status).toBe(403);
  });
});
