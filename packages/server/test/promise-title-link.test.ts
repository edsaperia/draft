/**
 * **Promise-coverage — 📍 link, the half only a server can answer** (backlog
 * entry 92, series 77, batch L). The constitution-layer audit is
 * `packages/constitution/test/promise-title-link.test.ts`; it can prove that
 * `cs.slugs` accumulates, and nothing more, because the module has no store
 * to resolve an address against. What §9.7a actually promises — *every link
 * the document has ever had keeps working* — is a claim about **routing**,
 * and it is kept in three places at once:
 *
 * - `DocStore.register` / `DocStore.persist` index **every** entry of
 *   `doc.cs.slugs` to the document id, and nothing ever removes one, so a
 *   reload off the log re-indexes the whole history;
 * - `GET /d/:slug` and `GET|POST /api/d/:slug/*` resolve through
 *   `store.bySlug`, so an old address serves the page and the view alike;
 * - the invitation link never contained a slug to break: `MAILS.invite`'s
 *   link is `${baseUrl}/auth/login?token=`, the token carries `docId`, and
 *   `POST /auth/login` resolves `store.byId(rec.docId)` and then redirects to
 *   whatever `cs.slug` says **now**. A link mailed before a rename lands on
 *   the new address, which is stronger than the promise asks.
 *
 * ## The one gap — promise 2a, *and a change never takes an address that is
 * somebody else's*
 *
 * At the birth an address is uniquified (`uniqueSlug` over
 * `store.slugTaken`) and `POST /api/docs` answers 409 *that address is taken*
 * with a suggestion. **A live change is checked by nobody**: `setSetting`
 * validates `SlugValue`'s regex, `commands.ts` adds `founderOnly` and a cap,
 * and `DocStore.persist` then does `slugIndex.set(slug, doc.id)` —
 * last writer wins, silently. The page does not catch it either: `slugKnown()`
 * is `!BIRTH || …` and `BIRTH` is `location.pathname === '/'`, so on a live
 * document the ✒️ is never held dark, and `checkSlug`'s `!BIRTH` arm answers
 * from the mockup's hard-coded `TAKEN` set instead of asking
 * `/api/slug/:slug`.
 *
 * So one document can take another's address and inherit every link to it —
 * the one way *the link is never broken* can fail, and it fails for the
 * document that did nothing. The last `describe` locks the behaviour **as it
 * stands**, so the day a guard lands the lock says so; the finding is in the
 * run report.
 *
 * **This file fixes nothing.**
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';
import { DocStore } from '../src/store.js';
import { FilePersistence } from '../src/persistence.js';

const DESIGN_DIR = join(import.meta.dirname, '..', '..', '..', 'design');

interface Booted { base: string; draft: DraftServer; dataDir: string }
const booted: Booted[] = [];

async function boot(): Promise<Booted> {
  const dataDir = mkdtempSync(join(tmpdir(), 'draft-title-link-'));
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

/** Every mail the outbox holds for one address, oldest first. */
const mailsTo = async (b: Booted, to: string): Promise<Array<{ link?: string }>> => {
  await b.draft.outbox.drain();
  const { readFileSync } = await import('node:fs');
  return readFileSync(join(b.dataDir, 'outbox.jsonl'), 'utf8')
    .split('\n').filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as { to: string; link?: string })
    .filter((m) => m.to === to);
};

/** One founded (not begun) document at a known address, and its founder's seat. */
async function found(b: Booted, title: string, slug: string, email = 'ada@example.org') {
  const made = await (await post(b.base, '/api/docs', { title, slug, email, isMember: true }))
    .json() as { slug: string; devLink: string; error?: string };
  expect(made.error, `creating ${slug}: ${made.error}`).toBeUndefined();
  expect(made.slug).toBe(slug);
  const ada = cookieOf(await consume(made.devLink));
  const cmd = async (name: string, args: unknown, cookie = ada) => {
    const body = await post(b.base, `/api/d/${made.slug}/cmd`, { cmd: name, args }, cookie)
      .then((r) => r.json() as Promise<{ error?: string }>);
    expect(body.error, `${name}: ${body.error}`).toBeUndefined();
  };
  return { slug: made.slug, ada, cmd };
}

/** The door's payload, loose — what this file reads off it is the title. */
const doorAt = (base: string, slug: string) =>
  fetch(`${base}/api/d/${slug}/view`).then(async (r) => ({
    status: r.status, body: await r.json() as { title?: string; slug?: string; error?: string },
  }));

describe('📍 — every link the document has ever had keeps working (§9.7a)', () => {
  it('the old address still serves the page and the view after a pen change', async () => {
    const b = await boot();
    const d = await found(b, 'Hollow Oak Club Charter', 'hollow-oak');
    await d.cmd('set-setting', { setting: 'link', value: { slug: 'the-orchard' } });

    // the page: both addresses are the document, and the document says the new one
    for (const s of ['hollow-oak', 'the-orchard']) {
      expect((await fetch(`${b.base}/d/${s}`)).status, s).toBe(200);
    }
    // the API: the same, through the same `store.bySlug`
    const old = await doorAt(b.base, 'hollow-oak');
    expect(old.status).toBe(200);
    expect(old.body.slug).toBe('the-orchard'); // it answers as its current self
    expect((await doorAt(b.base, 'the-orchard')).status).toBe(200);
    // an address it never wore is still a 404 — the index is a history, not a wildcard
    expect((await fetch(`${b.base}/d/never-worn`)).status).toBe(404);
  });

  it('a third address keeps the first two: nothing is ever un-indexed', async () => {
    const b = await boot();
    const d = await found(b, 'Hollow Oak Club Charter', 'hollow-oak');
    await d.cmd('set-setting', { setting: 'link', value: { slug: 'the-orchard' } });
    await d.cmd('set-setting', { setting: 'link', value: { slug: 'orchard-charter' } });
    for (const s of ['hollow-oak', 'the-orchard', 'orchard-charter']) {
      expect((await fetch(`${b.base}/d/${s}`)).status, s).toBe(200);
    }
  });

  it('and a restart re-indexes the whole history off the log alone', async () => {
    const b = await boot();
    const d = await found(b, 'Hollow Oak Club Charter', 'hollow-oak');
    await d.cmd('set-setting', { setting: 'link', value: { slug: 'the-orchard' } });
    // the log is the only persistence (`store.ts`), so a cold store proves the
    // index is derived and not kept: no slug table is written anywhere
    const cold = new DocStore(new FilePersistence(b.dataDir));
    await cold.loadAll();
    const byOld = cold.bySlug('hollow-oak');
    expect(byOld).not.toBeNull();
    expect(cold.bySlug('the-orchard')!.id).toBe(byOld!.id);
    expect(byOld!.cs.slug).toBe('the-orchard');
    expect([...byOld!.cs.slugs]).toEqual(['hollow-oak', 'the-orchard']);
    // and a taken address stays taken by its history, so no new document can
    // be founded onto one somebody has already handed out
    expect(cold.slugTaken('hollow-oak')).toBe(true);
  });
});

describe('📍 — the invitation link never held a slug to break', () => {
  it('an invitation mailed before a rename seats the member at the new address', async () => {
    const b = await boot();
    const d = await found(b, 'Hollow Oak Club Charter', 'hollow-oak');
    await d.cmd('invite', { email: 'bo@example.org' });
    const link = (await mailsTo(b, 'bo@example.org')).pop()!.link!;
    // the link carries a token, not an address (`MAILS.invite` ← `loginLink`)
    expect(link).toContain('/auth/login?token=');
    expect(link).not.toContain('hollow-oak');

    // the document moves *after* the mail is in Bo's inbox
    await d.cmd('set-setting', { setting: 'link', value: { slug: 'the-orchard' } });

    const landed = await consume(link);
    expect(landed.status).toBe(302);
    // `POST /auth/login` resolves by `docId` and redirects to `cs.slug` as it
    // stands now — so the link is not merely unbroken, it is up to date
    expect(landed.headers.get('location')).toBe('/d/the-orchard');
    const bo = cookieOf(landed);
    const seat = await fetch(`${b.base}/api/d/the-orchard/view`, { headers: { cookie: bo } })
      .then((r) => r.json() as Promise<{ me?: string; stranger?: true }>);
    expect(seat.stranger).toBeUndefined();
    expect(typeof seat.me).toBe('string');
    // and the seat works through the *old* address too, the cookie being the
    // document's rather than the address's
    const viaOld = await fetch(`${b.base}/api/d/hollow-oak/view`, { headers: { cookie: bo } })
      .then((r) => r.json() as Promise<{ me?: string }>);
    expect(viaOld.me).toBe(seat.me);
  });
});

describe('📍 — the gap: a live change may take an address that is somebody else’s', () => {
  it('creation refuses a taken address, and a taken *history* counts', async () => {
    const b = await boot();
    const d = await found(b, 'Hollow Oak Club Charter', 'hollow-oak');
    await d.cmd('set-setting', { setting: 'link', value: { slug: 'the-orchard' } });
    // both the current address and the abandoned one are refused at the birth
    for (const slug of ['hollow-oak', 'the-orchard']) {
      const res = await post(b.base, '/api/docs',
        { title: 'A Twin', slug, email: 'zed@example.org', isMember: true });
      expect(res.status, slug).toBe(409);
      const body = await res.json() as { error: string; suggestion?: string };
      expect(body.error).toMatch(/taken/);
      expect(body.suggestion).toBeTruthy();
    }
  });

  it('**but a pen change is not** — and the taker inherits every link to the taken', async () => {
    const b = await boot();
    const a = await found(b, 'The Orchard Charter', 'the-orchard', 'ada@example.org');
    const c = await found(b, 'The Pond Charter', 'the-pond', 'cy@example.org');
    expect((await doorAt(b.base, 'the-orchard')).body.title).toBe('The Orchard Charter');

    // Cy renames their document onto Ada's live address. Nothing refuses it:
    // not `setSetting` (shape only), not `commands.ts` (`founderOnly` and a
    // cap), not `DocStore.persist` (`slugIndex.set`, last writer wins)
    await c.cmd('set-setting', { setting: 'link', value: { slug: 'the-orchard' } });

    // the address now belongs to the document that took it, and Ada's — whose
    // only address this was — is reachable at no address at all
    const stolen = await doorAt(b.base, 'the-orchard');
    expect(stolen.status).toBe(200);
    expect(stolen.body.title).toBe('The Pond Charter');
    expect((await doorAt(b.base, 'the-pond')).body.title).toBe('The Pond Charter');
    expect(a.slug).toBe('the-orchard'); // …and Ada never moved

    // the shape of the finding, pinned: the module took it without a word
    const cold = new DocStore(new FilePersistence(b.dataDir));
    await cold.loadAll();
    const docs = [...cold.all()];
    expect(docs).toHaveLength(2);
    expect(docs.filter((x) => [...x.cs.slugs].includes('the-orchard'))).toHaveLength(2);
  });
});
