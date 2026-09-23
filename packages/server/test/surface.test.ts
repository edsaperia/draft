/**
 * **The surface reload** (Q1347; Ed, 2026-09-12): a surface-only push need
 * not restart the host. Three things: the tar reader takes what CI's
 * `tar --format=ustar` writes and refuses what is not a page file; the
 * keyed route unpacks an upload, serves the new bytes at once at every
 * asset route and states the new commit in `x-build` and `/healthz`; and a
 * stranger's POST is 404 without the key, 401 with a wrong one.
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { gzipSync } from 'node:zlib';
import { afterAll, describe, expect, it } from 'vitest';
import { FilePersistence } from '../src/persistence.js';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';
import { SURFACE_NAME, packTar, readTarGz } from '../src/surface.js';

/** The three commits `/healthz` reports (issue #8, F1). */
interface Health { build: string | null; surface: string | null; booted: string | null }

const tmp = () => mkdtempSync(join(tmpdir(), 'draft-surface-'));
const booted: DraftServer[] = [];
afterAll(async () => { for (const d of booted) await d.close(); });

/** The admin key guards the surface (issue #10); the bot key defaults to it
 *  so a case about the surface alone need name one key. */
async function boot(adminKey: string | null, botKey: string | null = adminKey): Promise<{ base: string; dataDir: string }> {
  const dataDir = tmp();
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1',
    designDir: join(import.meta.dirname, '..', '..', '..', 'design'),
    resendApiKey: null, mailFrom: 'test <t@example.org>', mailOff: false,
    botKey, adminKey,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy: false, buildSha: 'aaaaaaa', notifyEmail: null,
  };
  const draft = await createDraftServer(cfg, new FilePersistence(dataDir));
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  cfg.baseUrl = `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`;
  booted.push(draft);
  return { base: cfg.baseUrl, dataDir };
}

const page = '<meta charset="utf-8"><title>surface test</title><p>a new surface</p>';
const upload = (base: string, sha: string, body: Buffer, key = 'test-key') =>
  fetch(`${base}/api/admin/surface?sha=${sha}`, { method: 'POST',
    headers: { 'content-type': 'application/gzip', authorization: `Bearer ${key}` }, body });

/**
 * **The page is replaced on the admin key alone** (issue #10; Ed, 2026-09-22,
 * option 1): the surface route installs and serves whatever page it is sent,
 * so the key to it is the key to every member's page — and it was the bot
 * key, typed on command lines and declared on the public dev host. The bot
 * key is refused here now, and the admin key refused at the bot outbox.
 */
describe('the surface takes the admin key and no other (issue #10)', () => {
  it('refuses the bot key and accepts the admin key', async () => {
    const { base } = await boot('admin-key', 'bot-key');
    const body = gzipSync(packTar([{ name: 'design/session-view.html', data: Buffer.from(page) }]));
    const withBot = await upload(base, 'bbbbbbb', body, 'bot-key');
    expect(withBot.status).toBe(401);
    const withAdmin = await upload(base, 'bbbbbbb', body, 'admin-key');
    expect(withAdmin.status, await withAdmin.clone().text()).toBe(200);
  });
});

describe('the tar reader', () => {
  it('reads what the writer packs, and refuses what is not a page file', () => {
    const files = readTarGz(gzipSync(packTar([
      { name: 'design/session-view.html', data: Buffer.from(page) },
      { name: 'design/system.css', data: Buffer.from('body{}') },
      { name: 'design/x.svg', data: Buffer.alloc(700, 65) },       // crosses a block boundary
    ])));
    expect(files.map((f) => f.name)).toEqual(['session-view.html', 'system.css', 'x.svg']);
    expect(files[2]!.data.length).toBe(700);
    expect(files[0]!.data.toString()).toBe(page);
    // the one subfolder (Q1402): a font and its licence under design/fonts/,
    // and nothing a level deeper or in any other folder
    const fonted = readTarGz(gzipSync(packTar([
      { name: 'design/session-view.html', data: Buffer.from(page) },
      { name: 'design/fonts/CharisSIL-Regular.woff2', data: Buffer.from('wOF2') },
      { name: 'design/fonts/OFL.txt', data: Buffer.from('licence') },
    ])));
    expect(fonted.map((f) => f.name)).toEqual(['session-view.html', 'fonts/CharisSIL-Regular.woff2', 'fonts/OFL.txt']);
    for (const bad of ['design/reference/system.css', 'design/tools/probe.js', 'packages/x.js', '../design/a.js', 'design/notes.md',
                       'design/fonts/deeper/x.woff2', 'design/reference/fonts/x.woff2', 'design/fonts/../x.js']) {
      expect(SURFACE_NAME.test(bad), bad).toBe(false);
      expect(() => readTarGz(gzipSync(packTar([{ name: 'design/session-view.html', data: Buffer.from(page) }, { name: bad, data: Buffer.from('x') }])))).toThrow(/not a page file/);
    }
    expect(() => readTarGz(gzipSync(packTar([{ name: 'design/system.css', data: Buffer.from('body{}') }])))).toThrow(/no session-view.html/);
  });
});

/**
 * **The lane's copy of the served set, against the host's own** (issue #8,
 * F2). CI decides whether a push takes the surface lane by grepping the
 * changed paths, and it grepped `^design/` — so design/DECISIONS.md and
 * design/tools/ took the lane, uploading nothing the host serves and
 * reloading every open page for it. The filter is `SURFACE_NAME` restated
 * as an ERE in the workflow, and a restatement drifts unless something
 * reads both: this asserts the two are the same pattern, character for
 * character, and the comment above the workflow's line names this test.
 */
describe('the deploy lane\'s surface filter', () => {
  it('is SURFACE_NAME, restated (issue #8)', () => {
    const yml = readFileSync(join(import.meta.dirname, '..', '..', '..',
      '.github', 'workflows', 'ci.yml'), 'utf8');
    const lines = [...yml.matchAll(/^\s*SURFACE_ERE='(.*)'\s*$/gm)].map((m) => m[1]!);
    expect(lines.length, 'the workflow states SURFACE_ERE exactly once').toBe(1);
    // the one licensed difference: a literal in a regex escapes its slashes
    // because a slash ends the literal, and an ERE in single quotes does not
    expect(lines[0]).toBe(SURFACE_NAME.source.replace(/\\\//g, '/'));
    // and the pattern is the one an upload is refused by, so what the lane
    // selects is exactly what the host would take
    for (const served of ['design/session-view.html', 'design/cards.js', 'design/system.css',
                          'design/fluent-glyphs.svg', 'design/fonts/CharisSIL-Regular.woff2',
                          'design/fonts/OFL.txt']) {
      expect(new RegExp(lines[0]!).test(served), served).toBe(true);
    }
    for (const notServed of ['design/DECISIONS.md', 'design/STYLE.md', 'design/MOBILE.md',
                             'design/tools/toc-travel.mjs', 'design/reference/session.js',
                             'design/spec-pass/pass-6.md', 'docs/OPERATING.md', 'SPEC.md']) {
      expect(new RegExp(lines[0]!).test(notServed), notServed).toBe(false);
    }
  });
});

describe('the surface route', () => {
  it('is an unknown path without the key and refuses a wrong one', async () => {
    const bare = await boot(null);
    expect((await upload(bare.base, 'bbbbbbb', gzipSync(packTar([])))).status).toBe(404);
    const keyed = await boot('test-key');
    expect((await upload(keyed.base, 'bbbbbbb', gzipSync(packTar([])), 'wrong')).status).toBe(401);
  });

  it('serves the uploaded files at once, at every asset route, and states the new commit', async () => {
    const { base } = await boot('test-key');
    const before = await fetch(`${base}/`);
    expect(before.headers.get('x-build')).toBe('aaaaaaa');
    expect(await before.text()).not.toContain('a new surface');
    const health = async (): Promise<Health> =>
      (await (await fetch(`${base}/healthz`)).json()) as Health;
    expect(await health()).toMatchObject({ build: 'aaaaaaa', surface: null, booted: 'aaaaaaa' });

    const bad = await upload(base, 'not a sha', gzipSync(packTar([])));
    expect(bad.status).toBe(400);
    const r = await upload(base, 'bbbbbbb', gzipSync(packTar([
      { name: 'design/session-view.html', data: Buffer.from(page) },
      { name: 'design/system.css', data: Buffer.from('body{color:red}') },
      // a third file, because the pack is what a surface push carries whole;
      // it was design/pairwise.html until that page retired with the
      // threshold (Q1362), and a script proves the same route
      { name: 'design/cards.js', data: Buffer.from('/* cards */') },
      // and the document's face (Q1402): a file in the one subfolder, which
      // the installer has to make before it can write
      { name: 'design/fonts/CharisSIL-Regular.woff2', data: Buffer.from('wOF2-bytes') },
    ])));
    const body = await r.text();
    expect(r.status, body).toBe(200);
    const j = JSON.parse(body) as { ok: boolean; sha: string; files: string[] };
    expect(j.files).toEqual(['session-view.html', 'system.css', 'cards.js', 'fonts/CharisSIL-Regular.woff2']);

    for (const p of ['/', '/system.css', '/cards.js', '/design/system.css']) {
      const got = await fetch(base + p);
      expect(got.status, p).toBe(200);
      expect(got.headers.get('x-build'), p).toBe('bbbbbbb');
    }
    // the font answers where system.css's relative url resolves — at the
    // root, under a document — and through the /design/ whitelist, as a font
    for (const p of ['/fonts/CharisSIL-Regular.woff2', '/d/fonts/CharisSIL-Regular.woff2', '/design/fonts/CharisSIL-Regular.woff2']) {
      const got = await fetch(base + p);
      expect(got.status, p).toBe(200);
      expect(got.headers.get('content-type'), p).toBe('font/woff2');
      expect(await got.text(), p).toBe('wOF2-bytes');
    }
    for (const p of ['/design/fonts/deeper/x.woff2', '/design/fonts/x.js', '/d/fonts/x.css', '/fonts/x.css']) {
      expect((await fetch(base + p)).status, p).toBe(404);
    }
    expect(await (await fetch(`${base}/`)).text()).toContain('a new surface');
    expect(await (await fetch(`${base}/system.css`)).text()).toBe('body{color:red}');
    // **and the booted commit stands still** (issue #8, F1): `build` is what
    // `x-build` says and a page upload moves it, `surface` is the upload's
    // own commit — `booted` is the process, which no upload touches. CI
    // reads this field to tell a host running the pushed engine from a host
    // merely serving the pushed page (design/DECISIONS.md:6907).
    const h = await health();
    expect(h.build).toBe('bbbbbbb');
    expect(h.surface).toBe('bbbbbbb');
    expect(h.booted).toBe('aaaaaaa');
    // a file the upload did not carry is gone with the old directory
    expect((await fetch(`${base}/setup.js`)).status).toBe(404);
  });
});
