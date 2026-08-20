/**
 * Unit tests for the storage seam and the logic over it (PRODUCTION.md
 * stage 2). These pin the behaviour a Postgres backend must reproduce at
 * stage 6: byte-compatible reload, token single-use and expiry, stash
 * take-consumes, and the WriteChain's guarantee that two commits to one
 * key cannot interleave. The integration walk lives in server.test.ts;
 * this file tests the parts alone.
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FilePersistence, WriteChain } from '../src/persistence.js';
import { Auth } from '../src/auth.js';
import { Stash } from '../src/stash.js';
import { DocStore, uniqueSlug } from '../src/store.js';

const tmp = () => mkdtempSync(join(tmpdir(), 'draft-unit-'));

describe('FilePersistence', () => {
  it('round-trips a document log byte for byte and lists what it holds', async () => {
    const dir = tmp();
    const p = new FilePersistence(dir);
    await p.createDoc('d-1');
    expect(await p.listDocIds()).toEqual([]); // no log yet — not a document
    const entries = [
      { seq: 0, hash: 'h0', prevHash: '', event: { type: 'x', t: 1 } },
      { seq: 1, hash: 'h1', prevHash: 'h0', event: { type: 'y', t: 2 } },
    ] as never[];
    await p.appendDocLog('d-1', entries);
    expect(await p.listDocIds()).toEqual(['d-1']);
    // a reopened store reads exactly what was appended
    const back = new FilePersistence(dir);
    expect(await back.readDocLog('d-1')).toEqual(entries);
    // and the on-disk format is the one the server has always written:
    // one JSON object per line
    const raw = readFileSync(join(dir, 'docs', 'd-1', 'log.jsonl'), 'utf8');
    expect(raw.split('\n').filter(Boolean)).toHaveLength(2);
  });

  it('provisional text is a sidecar: set, survive reopen, clear', async () => {
    const dir = tmp();
    const p = new FilePersistence(dir);
    await p.createDoc('d-1');
    expect(await p.readProvisional('d-1')).toBeNull();
    await p.writeProvisional('d-1', 'draft charter');
    expect(await new FilePersistence(dir).readProvisional('d-1')).toBe('draft charter');
    await p.writeProvisional('d-1', null);
    expect(await p.readProvisional('d-1')).toBeNull();
  });

  it('takeToken is delete-and-return: the second take gets nothing', async () => {
    const p = new FilePersistence(tmp());
    await p.putTokens([['hash-a', { kind: 'login', email: 'a@x.org', expMs: 99 }]]);
    expect(await p.takeToken('hash-a')).toMatchObject({ email: 'a@x.org' });
    expect(await p.takeToken('hash-a')).toBeNull();
  });

  it('sweepTokens drops only what has expired', async () => {
    const p = new FilePersistence(tmp());
    await p.putTokens([
      ['old', { kind: 'login', email: 'a@x.org', expMs: 10 }],
      ['live', { kind: 'login', email: 'b@x.org', expMs: 100 }],
    ]);
    await p.sweepTokens(50);
    expect(await p.takeToken('old')).toBeNull();
    expect(await p.takeToken('live')).not.toBeNull();
  });
});

describe('WriteChain', () => {
  it('serializes writes per key and keeps keys independent', async () => {
    const chain = new WriteChain();
    const order: string[] = [];
    const slow = chain.run('a', async () => {
      await new Promise((r) => setTimeout(r, 30));
      order.push('a1');
    });
    const fast = chain.run('a', async () => { order.push('a2'); });
    const other = chain.run('b', async () => { order.push('b1'); });
    await Promise.all([slow, fast, other]);
    // a2 waited for a1; b1 did not
    expect(order.indexOf('a1')).toBeLessThan(order.indexOf('a2'));
    expect(order[0]).toBe('b1');
  });

  it('a failed link reports to its caller and never breaks the chain', async () => {
    const chain = new WriteChain();
    const boom = chain.run('k', async () => { throw new Error('boom'); });
    await expect(boom).rejects.toThrow('boom');
    expect(await chain.run('k', async () => 'still running')).toBe('still running');
  });
});

describe('Auth over the seam', () => {
  it('mints hashed, uses once, refuses expiry', async () => {
    const dir = tmp();
    const auth = new Auth('secret', new FilePersistence(dir));
    const token = await auth.mintToken({ kind: 'login', email: 'a@x.org' }, 1000);
    // the store holds the hash, never the token
    const stored = readFileSync(join(dir, 'tokens.json'), 'utf8');
    expect(stored).not.toContain(token);
    expect(await auth.useToken(token, 2000)).toMatchObject({ email: 'a@x.org' });
    expect(await auth.useToken(token, 2000)).toBeNull(); // single use
    const brief = await auth.mintToken({ kind: 'login', email: 'b@x.org' }, 1000);
    expect(await auth.useToken(brief, 1000 + 8 * 24 * 3600_000)).toBeNull(); // expired
  });

  it('deferred mints persist in one flush and survive a reopen', async () => {
    const dir = tmp();
    const p = new FilePersistence(dir);
    const auth = new Auth('secret', p);
    const t1 = auth.mintDeferred({ kind: 'login', email: 'a@x.org' }, 1000);
    const t2 = auth.mintDeferred({ kind: 'login', email: 'b@x.org' }, 1000);
    await auth.flush(1000);
    const back = new Auth('secret', new FilePersistence(dir));
    expect(await back.useToken(t1, 2000)).not.toBeNull();
    expect(await back.useToken(t2, 2000)).not.toBeNull();
  });

  it('cookies verify, and a tampered signature or foreign secret does not', () => {
    const auth = new Auth('secret', new FilePersistence(tmp()));
    const cookie = auth.cookieFor('d-1', 'founder', 1000);
    expect(auth.verifyCookie(cookie, 2000)).toEqual({ docId: 'd-1', memberId: 'founder' });
    expect(auth.verifyCookie(cookie + 'x', 2000)).toBeNull();
    const forged = new Auth('other-secret', new FilePersistence(tmp()));
    expect(forged.verifyCookie(cookie, 2000)).toBeNull();
    // expiry is honoured
    expect(auth.verifyCookie(cookie, 1000 + 91 * 24 * 3600_000)).toBeNull();
  });
});

describe('Stash over the seam', () => {
  it('opens empty, updates while live, refuses after expiry, take consumes', async () => {
    const stash = new Stash(new FilePersistence(tmp()));
    await stash.open('k', 1000);
    expect(await stash.update('k', 'draft', 500)).toBe(true);
    expect(await stash.update('missing', 'x', 500)).toBe(false);
    expect(await stash.update('k', 'late', 2000)).toBe(false); // expired
    expect(await stash.take('k', 500)).toBe('draft');
    expect(await stash.take('k', 500)).toBe(''); // consumed
  });
});

describe('DocStore', () => {
  it('a slug collision takes a short suffix', () => {
    const taken = new Set(['charter', 'charter-2']);
    expect(uniqueSlug('Charter', (s) => taken.has(s))).toBe('charter-3');
    expect(uniqueSlug('Fresh Title', (s) => taken.has(s))).toBe('fresh-title');
  });

  it('creates, persists and reloads to an identical rolling hash', async () => {
    const dir = tmp();
    const p = new FilePersistence(dir);
    const store = new DocStore(p);
    const doc = await store.create('d-1', {
      title: 'Charter', slug: 'charter',
      convenor: { id: 'founder', email: 'a@x.org', isMember: true },
    }, 1000);
    doc.cs.invite(1001, 'b@x.org');
    await store.persist(doc);
    const back = new DocStore(new FilePersistence(dir));
    await back.loadAll();
    expect(back.bySlug('charter')!.cs.rollingHash()).toBe(doc.cs.rollingHash());
  });
});
