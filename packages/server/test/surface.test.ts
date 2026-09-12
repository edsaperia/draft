/**
 * **The surface reload** (Q1347; Ed, 2026-09-12): a surface-only push need
 * not restart the host. Three things: the tar reader takes what CI's
 * `tar --format=ustar` writes and refuses what is not a page file; the
 * keyed route unpacks an upload, serves the new bytes at once at every
 * asset route and states the new commit in `x-build` and `/healthz`; and a
 * stranger's POST is 404 without the key, 401 with a wrong one.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { gzipSync } from 'node:zlib';
import { afterAll, describe, expect, it } from 'vitest';
import { FilePersistence } from '../src/persistence.js';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';
import { SURFACE_NAME, packTar, readTarGz } from '../src/surface.js';

const tmp = () => mkdtempSync(join(tmpdir(), 'draft-surface-'));
const booted: DraftServer[] = [];
afterAll(async () => { for (const d of booted) await d.close(); });

async function boot(botKey: string | null): Promise<{ base: string; dataDir: string }> {
  const dataDir = tmp();
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1',
    designDir: join(import.meta.dirname, '..', '..', '..', 'design'),
    resendApiKey: null, mailFrom: 'test <t@example.org>', mailOff: false,
    botKey,
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
    for (const bad of ['design/reference/system.css', 'design/tools/probe.js', 'packages/x.js', '../design/a.js', 'design/notes.md']) {
      expect(SURFACE_NAME.test(bad), bad).toBe(false);
      expect(() => readTarGz(gzipSync(packTar([{ name: 'design/session-view.html', data: Buffer.from(page) }, { name: bad, data: Buffer.from('x') }])))).toThrow(/not a page file/);
    }
    expect(() => readTarGz(gzipSync(packTar([{ name: 'design/system.css', data: Buffer.from('body{}') }])))).toThrow(/no session-view.html/);
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

    const bad = await upload(base, 'not a sha', gzipSync(packTar([])));
    expect(bad.status).toBe(400);
    const r = await upload(base, 'bbbbbbb', gzipSync(packTar([
      { name: 'design/session-view.html', data: Buffer.from(page) },
      { name: 'design/system.css', data: Buffer.from('body{color:red}') },
      { name: 'design/pairwise.html', data: Buffer.from('<p>pairs</p>') },
    ])));
    const body = await r.text();
    expect(r.status, body).toBe(200);
    const j = JSON.parse(body) as { ok: boolean; sha: string; files: string[] };
    expect(j.files).toEqual(['session-view.html', 'system.css', 'pairwise.html']);

    for (const p of ['/', '/system.css', '/pairwise', '/design/system.css']) {
      const got = await fetch(base + p);
      expect(got.status, p).toBe(200);
      expect(got.headers.get('x-build'), p).toBe('bbbbbbb');
    }
    expect(await (await fetch(`${base}/`)).text()).toContain('a new surface');
    expect(await (await fetch(`${base}/system.css`)).text()).toBe('body{color:red}');
    const h = (await (await fetch(`${base}/healthz`)).json()) as { build: string; surface: string | null };
    expect(h.build).toBe('bbbbbbb');
    expect(h.surface).toBe('bbbbbbb');
    // a file the upload did not carry is gone with the old directory
    expect((await fetch(`${base}/setup.js`)).status).toBe(404);
  });
});
