/**
 * Unit tests for the storage seam and the logic over it (PRODUCTION.md
 * stage 2). These pin the behaviour a Postgres backend must reproduce at
 * stage 6: byte-compatible reload, token single-use and expiry, stash
 * take-consumes, and the WriteChain's guarantee that two commits to one
 * key cannot interleave. The integration walk lives in server.test.ts;
 * this file tests the parts alone.
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ERROR_LOG_FILE, FilePersistence, OUTBOX_MAX_ATTEMPTS, WriteChain } from '../src/persistence.js';
import { errorLogContract } from './error-store.js';
import { MailOutbox } from '../src/outbox.js';
import { Auth } from '../src/auth.js';
import { Stash } from '../src/stash.js';
import { DocStore, uniqueSlug } from '../src/store.js';
import { MAILS, deliverable, makeMailer } from '../src/mailer.js';
import { DELETE_FLAG, main as tools } from '../src/tools.js';

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

  /** The same body `pg.test.ts` runs, because the property is that the two
   *  stores answer alike (plan stage 5a). */
  it('the error log is a row of the store: newest first, capped, byte for byte', async () => {
    const dir = tmp();
    await errorLogContract(new FilePersistence(dir));
    // and the layout §11 describes is still the layout: one JSON line each,
    // at the data dir's root, which is what `draft-tools errors` reads
    const raw = readFileSync(join(dir, ERROR_LOG_FILE), 'utf8');
    expect(raw.split('\n').filter(Boolean)).toHaveLength(6);
    expect(JSON.parse(raw.split('\n')[0]!)).toMatchObject({ at: 1000, kind: 'refused' });
  });

  it('the wipe takes the error log with it — both stores leave nothing of the room', async () => {
    const dir = tmp();
    const p = new FilePersistence(dir);
    await p.appendError({ at: 1, kind: 'refused', status: 400, method: 'POST',
      path: '/api/d/moon/cmd', cmd: 'invite', args: '{"email":"ada@example.org"}',
      reason: 'that address is taken' });
    expect(await p.readErrors()).toHaveLength(1);
    await p.wipe();
    expect(await p.readErrors()).toEqual([]);
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
    expect(await stash.take('k', 500, 'd-1')).toBe('draft');
    expect(await stash.take('k', 500, 'd-1')).toBe(''); // the text is spent
    // …but the claim stays, so every other link to this creation can find
    // the document it became (Q519), and nothing may paste into it again
    expect(await stash.claimedBy('k', 500)).toBe('d-1');
    expect(await stash.update('k', 'after the save', 500)).toBe(false);
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

  // **A command applied during a slow append is still persisted** (Q1322,
  // docs.vote 2026-09-11): under a room of thirty an append took seconds,
  // commands kept landing on the live log meanwhile, and the cursor was set
  // to the log's length rather than advanced by what was written — so the
  // entries that arrived mid-append were never persisted, the chain on disk
  // broke at the gap, and the document was quarantined at the next boot.
  it('a command applied during a slow append is still persisted', async () => {
    const dir = tmp();
    const slow = new FilePersistence(dir);
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => { release = r; });
    const realAppend = slow.appendDocLog.bind(slow);
    let appends = 0;
    slow.appendDocLog = async (id, entries, rows) => {
      appends += 1;
      if (appends === 2) await gate;          // the second append is the slow one
      return realAppend(id, entries, rows);
    };
    const store = new DocStore(slow);
    const doc = await store.create('d-1', {
      title: 'Charter', slug: 'charter',
      convenor: { id: 'founder', email: 'a@x.org', isMember: true },
    }, 1000);
    doc.cs.invite(1001, 'b@x.org');
    const inFlight = store.persist(doc);       // slow: holds at the gate
    await new Promise((r) => setTimeout(r, 10));
    doc.cs.invite(1002, 'c@x.org');            // lands on the live log meanwhile
    release();
    await inFlight;
    await store.persist(doc);                  // the entry from mid-append goes now
    const back = new DocStore(new FilePersistence(dir));
    await back.loadAll();
    expect(back.quarantined()).toEqual([]);
    expect(back.bySlug('charter')!.cs.logEntries().length).toBe(doc.cs.logEntries().length);
    expect(back.bySlug('charter')!.cs.rollingHash()).toBe(doc.cs.rollingHash());
  });

  // **A failed append keeps the people rows it carried** (issue #7): the
  // dirty set was emptied before the append was awaited and there was no way
  // back, so one transient store error dropped those rows for ever — and the
  // log holds no identity (decision 1253), so the member it named came back
  // from the next boot erased, with no address to log in by, while the log
  // itself was complete. On Postgres the rows and the entries share one
  // transaction, which rolls back together; the next persist re-sent the
  // entries and not the rows.
  it('a failed append keeps the people rows it carried', async () => {
    const dir = tmp();
    const p = new FilePersistence(dir);
    const realAppend = p.appendDocLog.bind(p);
    let appends = 0;
    p.appendDocLog = async (id, entries, rows) => {
      appends += 1;
      // the invitation's own append, refused the way a transaction that
      // rolls back is: nothing of it reached the store, rows included
      if (appends === 2) throw new Error('the store refused this append');
      return realAppend(id, entries, rows);
    };
    const store = new DocStore(p);
    const doc = await store.create('d-1', {
      title: 'Charter', slug: 'charter',
      convenor: { id: 'founder', email: 'a@x.org', isMember: true },
    }, 1000);
    const m = doc.cs.invite(1001, 'b@x.org');
    await expect(store.persist(doc)).rejects.toThrow();
    doc.cs.invite(1002, 'c@x.org');   // any second command
    await store.persist(doc);         // …and the row rides out with it
    const back = new DocStore(new FilePersistence(dir));
    await back.loadAll();
    expect(back.quarantined()).toEqual([]);
    expect(back.byId('d-1')!.cs.memberRecords().get(m)!.email).toBe('b@x.org');
  });

  // **One document, on the operator's word, typed twice** (Q1322): the tool
  // refuses without the flag, refuses a flag naming another document,
  // refuses an id the store does not hold, and deletes exactly one.
  it('draft-tools delete removes one document and refuses everything short of its id twice', async () => {
    const dir = tmp();
    const p = new FilePersistence(dir);
    const store = new DocStore(p);
    for (const [id, slug] of [['d-1', 'one'], ['d-2', 'two']] as const) {
      const doc = await store.create(id, {
        title: slug, slug, convenor: { id: 'founder', email: 'a@x.org', isMember: true },
      }, 1000);
      await store.persist(doc);
    }
    expect(await tools(['delete', dir, 'd-1'])).toBe(1);
    expect(await tools(['delete', dir, 'd-1', `${DELETE_FLAG}=d-2`])).toBe(1);
    expect(await tools(['delete', dir, 'd-9', `${DELETE_FLAG}=d-9`])).toBe(1);
    expect((await p.listDocIds()).sort()).toEqual(['d-1', 'd-2']);
    expect(await tools(['delete', dir, 'd-1', `${DELETE_FLAG}=d-1`])).toBe(0);
    expect(await p.listDocIds()).toEqual(['d-2']);
    const back = new DocStore(new FilePersistence(dir));
    await back.loadAll();
    expect(back.bySlug('one')).toBeNull();
    expect(back.bySlug('two')).not.toBeNull();
  });

  it('a document whose replay throws is quarantined and counted', async () => {
    const dir = tmp();
    const p = new FilePersistence(dir);
    const store = new DocStore(p);
    const doc = await store.create('d-1', {
      title: 'Charter', slug: 'charter',
      convenor: { id: 'founder', email: 'a@x.org', isMember: true },
    }, 1000);
    doc.cs.invite(1001, 'b@x.org');
    doc.cs.invite(1002, 'c@x.org');
    await store.persist(doc);
    // break the chain the way the lost append did: drop a middle entry
    const path = join(dir, 'docs', 'd-1', 'log.jsonl');
    const lines = readFileSync(path, 'utf8').split('\n').filter((l) => l.length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(3);
    writeFileSync(path, [lines[0], ...lines.slice(2)].join('\n') + '\n', 'utf8');
    const back = new DocStore(new FilePersistence(dir));
    await back.loadAll();
    expect(back.quarantined()).toEqual(['d-1']);
    expect(back.bySlug('charter')).toBeNull();
  });
});

describe('the people split (decision 1253): rows beside the log', () => {
  const found = async (dir: string) => {
    const store = new DocStore(new FilePersistence(dir));
    const doc = await store.create('d-1', {
      title: 'Charter', slug: 'charter',
      convenor: { id: 'founder', email: 'ada@x.org', isMember: true },
    }, 1000);
    const bo = doc.cs.invite(1001, 'bo@x.org');
    doc.cs.arrive(1002, bo);
    doc.cs.setIdentity(1003, bo, { name: 'Bo Vane', picture: 'e🦊' });
    await store.persist(doc);
    return { store, doc, bo };
  };

  it('a birth writes a row and an id-only event, and the rows ride each persist', async () => {
    const dir = tmp();
    const { doc, bo } = await found(dir);
    const log = readFileSync(join(dir, 'docs', 'd-1', 'log.jsonl'), 'utf8');
    expect(log).not.toContain('@x.org');
    expect(log).not.toContain('Bo Vane');
    expect(log).toContain('"person":"p-1"');
    expect(log).toContain('"person":"p-2"');
    expect(log).toContain('"nameSet":true');
    const rows = JSON.parse(readFileSync(join(dir, 'docs', 'd-1', 'people.json'), 'utf8'));
    expect(rows).toEqual({
      'p-1': { email: 'ada@x.org', name: null, picture: null },
      'p-2': { email: 'bo@x.org', name: 'Bo Vane', picture: 'e🦊' },
    });
    // a reload resolves through the rows
    const back = new DocStore(new FilePersistence(dir));
    await back.loadAll();
    const again = back.byId('d-1')!;
    expect(again.cs.rollingHash()).toBe(doc.cs.rollingHash());
    expect(again.cs.memberRecords().get(bo)).toMatchObject(
      { email: 'bo@x.org', name: 'Bo Vane', picture: 'e🦊', erased: false });
    expect(again.cs.convenorRecord().email).toBe('ada@x.org');
  });

  it('erasing a row leaves the log and every hash standing; the person reads as erased', async () => {
    const dir = tmp();
    const { doc, bo } = await found(dir);
    const p = new FilePersistence(dir);
    const person = doc.cs.memberRecords().get(bo)!.person;
    expect(await p.deletePerson('d-1', person)).toBe(true);
    expect(await p.deletePerson('d-1', person)).toBe(false);
    expect((await p.readPeople('d-1')).map((r) => r.personId)).toEqual(['p-1']);
    const back = new DocStore(new FilePersistence(dir));
    await back.loadAll();
    const again = back.byId('d-1')!;
    expect(again.cs.rollingHash()).toBe(doc.cs.rollingHash());
    expect(again.cs.memberRecords().get(bo)).toMatchObject(
      { erased: true, email: null, name: null, picture: null, arrivedAtT: 1002 });
    expect(again.cs.E()).toBe(2);
  });

  it('a pre-people log is skipped at boot, named once, and never read', async () => {
    const dir = tmp();
    await found(dir);
    // the same document as the code of 2026-09-07 would have written it:
    // entries without a version, which is the pre-people shape by definition
    const path = join(dir, 'docs', 'd-1', 'log.jsonl');
    const { writeFileSync } = await import('node:fs');
    const stripped = readFileSync(path, 'utf8').split('\n').filter(Boolean).map((l) => {
      const { schemaVersion: _v, ...rest } = JSON.parse(l) as Record<string, unknown>;
      return JSON.stringify(rest);
    }).join('\n') + '\n';
    writeFileSync(path, stripped, 'utf8');
    const said: string[] = [];
    const orig = console.error;
    console.error = (...args: unknown[]) => { said.push(args.map(String).join(' ')); };
    try {
      const store = new DocStore(new FilePersistence(dir));
      await store.loadAll();
      expect(store.byId('d-1')).toBeNull();
      expect(store.bySlug('charter')).toBeNull();
      expect(store.skippedPreShape()).toEqual(['d-1']);
    } finally { console.error = orig; }
    expect(said).toEqual(['[store] d-1 is the pre-people shape (decision 1253): not loaded']);
    // and the bytes were not touched
    expect(readFileSync(path, 'utf8')).toBe(stripped);
  });

  it('the three tool verbs: people lists, erase deletes one row, wipe refuses without its flag', async () => {
    const { main, WIPE_FLAG } = await import('../src/tools.js');
    const dir = tmp();
    const { bo, doc } = await found(dir);
    const person = doc.cs.memberRecords().get(bo)!.person;
    const out: string[] = [];
    const err: string[] = [];
    const origLog = console.log;
    const origErr = console.error;
    console.log = (...a: unknown[]) => { out.push(a.map(String).join(' ')); };
    console.error = (...a: unknown[]) => { err.push(a.map(String).join(' ')); };
    try {
      expect(await main(['people', dir, 'd-1'])).toBe(0);
      expect(out.join('\n')).toContain('d-1: 2 person rows');
      expect(out.join('\n')).toContain(`${person}  bo@x.org  name: set  picture: set`);
      // erase: a wrong id is a refusal; the right one prints what it held
      expect(await main(['erase', dir, 'd-1', 'p-9'])).toBe(1);
      expect(err.at(-1)).toContain("no person row 'p-9'");
      out.length = 0;
      expect(await main(['erase', dir, 'd-1', person])).toBe(0);
      expect(out[0]).toBe(`d-1: erased ${person} — the row held bo@x.org, a name, a picture; the log stands and every hash holds`);
      expect((await new FilePersistence(dir).readPeople('d-1')).map((r) => r.personId)).toEqual(['p-1']);
      // the wipe: refused bare, refused with the wrong name, and only then run —
      // against this scratch directory and nothing else
      err.length = 0;
      expect(await main(['wipe', dir])).toBe(1);
      expect(err[0]).toBe(`wipe: refusing — this would delete 1 document in ${dir}. To proceed, pass ` +
        `${WIPE_FLAG}=<name>, where <name> is the data directory's basename or the database's name, ` +
        'typed in full. Nothing was deleted.');
      expect(await main(['wipe', dir, `${WIPE_FLAG}=not-this-one`])).toBe(1);
      expect(err[1]).toBe(`wipe: refusing — 'not-this-one' does not name this store, which holds 1 document in ${dir}. ` +
        'Nothing was deleted.');
      expect((await new FilePersistence(dir).listDocIds())).toEqual(['d-1']);
      const { basename } = await import('node:path');
      out.length = 0;
      expect(await main(['wipe', dir, `${WIPE_FLAG}=${basename(dir)}`])).toBe(0);
      expect(out[0]).toBe(`wipe: deleted 1 document and every sidecar from ${dir}`);
      expect((await new FilePersistence(dir).listDocIds())).toEqual([]);
    } finally { console.log = origLog; console.error = origErr; }
  });
});

/**
 * **The backup must not be all-or-nothing** (issue #13). docs.vote holds
 * three quarantined documents Ed chose to keep (Q1322), and until this
 * the first of them aborted `export` and `drill` outright: every later
 * document went uncopied, and the sidecars — tokens, stashes, the mail
 * queue — were never reached at all, because they are copied after the
 * loop. Two file stores here, so the case runs without a database; the
 * Postgres half, including the exit code, is in pg.test.ts.
 */
describe('the copier skips what it cannot read and copies the rest (issue #13)', () => {
  it('names the unreadable document, copies every other one, and still carries the sidecars', async () => {
    const dir = tmp();
    const store = new DocStore(new FilePersistence(dir));
    for (const [id, slug] of [['d-0', 'one'], ['d-1', 'two'], ['d-2', 'three']] as const) {
      const doc = await store.create(id, {
        title: slug, slug, convenor: { id: 'founder', email: `${slug}@x.org`, isMember: true },
      }, 1000);
      doc.cs.invite(1001, `ada-${id}@x.org`);
      await store.persist(doc);
    }
    const from = new FilePersistence(dir);
    await from.putTokens([['tok1',
      { kind: 'login', email: 'a@x.org', expMs: 9e12, docId: 'd-1', memberId: 'm1' }]]);
    await from.putStash('stash1', { text: 'pending', expMs: 9e12 });
    // d-0's second event is tampered with, its hash left alone: exactly the
    // shape the boot loader quarantines, and the shape docs.vote holds
    const path = join(dir, 'docs', 'd-0', 'log.jsonl');
    const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean);
    const e = JSON.parse(lines[1]!) as { event: Record<string, unknown> };
    e.event.person = 'p-99';
    lines[1] = JSON.stringify(e);
    writeFileSync(path, lines.join('\n') + '\n', 'utf8');

    const out = tmp();
    const to = new FilePersistence(out);
    const { copyStore, verifyStores } = await import('../src/copy-store.js');
    const said: string[] = [];
    const r = await copyStore(from, to, { log: (l) => said.push(l) });
    // the one that cannot be read is named, and nothing of it was written
    expect(r.skipped.map((s) => s.id)).toEqual(['d-0']);
    expect(r.skipped[0]!.error.length).toBeGreaterThan(0);
    expect(said.some((l) => l.startsWith('d-0: SKIPPED'))).toBe(true);
    expect(await to.listDocIds()).toEqual(['d-1', 'd-2']);
    expect(await to.readDocLog('d-0')).toEqual([]);
    // …and everything after it in the loop was copied, sidecars included —
    // the two the abort used to take with it
    expect(r.documents).toBe(2);
    expect(r.copied.sort()).toEqual(['d-1', 'd-2']);
    expect(r.tokens).toBe(1);
    expect(r.stashes).toBe(1);
    expect(await to.takeToken('tok1')).toMatchObject({ kind: 'login' });
    expect(await to.getStash('stash1')).toMatchObject({ text: 'pending' });
    // the copy is still identical where it copied at all
    const v = await verifyStores(from, to);
    expect(v.documents).toBe(2);
    expect(v.skipped.map((s) => s.id)).toEqual(['d-0']);
    // and the restored directory boots: nothing in it is quarantined, and
    // the log came back byte for byte
    const back = new DocStore(new FilePersistence(out));
    await back.loadAll();
    expect(back.quarantined()).toEqual([]);
    expect(back.bySlug('two')).not.toBeNull();
    expect(readFileSync(join(out, 'docs', 'd-1', 'log.jsonl'), 'utf8'))
      .toBe(readFileSync(join(dir, 'docs', 'd-1', 'log.jsonl'), 'utf8'));
  });
});

describe('stage 7: the two cutover switches, read inertly', () => {
  it('absent DRAFT_STORE means file; pg needs a URL; anything else refuses', async () => {
    const { configFromEnv } = await import('../src/config.js');
    const env = { DRAFT_DATA_DIR: tmp() };
    expect(configFromEnv(env).store).toBe('file');
    expect(configFromEnv({ ...env, DATABASE_URL: 'postgres://x' }).store).toBe('file');
    expect(configFromEnv({ ...env, DRAFT_STORE: 'pg', DATABASE_URL: 'postgres://x' }))
      .toMatchObject({ store: 'pg', databaseUrl: 'postgres://x' });
    expect(() => configFromEnv({ ...env, DRAFT_STORE: 'pg' })).toThrow(/DATABASE_URL/);
    expect(() => configFromEnv({ ...env, DRAFT_STORE: 'sqlite' })).toThrow(/DRAFT_STORE/);
    // the data directory is named, never created, by config: on Postgres
    // with a platform secret nothing needs it (and on 2026-08-20 it was an
    // unwritable path left over from a deleted disk)
    const { existsSync } = await import('node:fs');
    const ghost = join(tmp(), 'never-made');
    configFromEnv({ DRAFT_DATA_DIR: ghost, DRAFT_SECRET: 's', DRAFT_STORE: 'pg', DATABASE_URL: 'postgres://x' });
    expect(existsSync(ghost)).toBe(false);
  });

  /**
   * **The cooldown knob** (entry 77, Q946). The adoption cooldown is engine
   * tuning and never constitutional (§4.2), so it is correctly not a setting
   * — and was therefore not adjustable at all, which at the shipped five
   * minutes gives a 15-minute room three moments when the document can
   * change. Ed's answer is one minute; this is the only way to say so.
   */
  it('DRAFT_COOLDOWN_MS: absent means no cooldown, present means the room is paced', async () => {
    const { configFromEnv, COOLDOWN_MAX_MS, HOST_COOLDOWN_MS } = await import('../src/config.js');
    const env = { DRAFT_DATA_DIR: tmp(), DRAFT_SECRET: 's' };
    // absent: the host default, which is no cooldown at all (Ed,
    // 2026-09-05, R-086) — never the engine's shipped five minutes, which
    // is what docs.vote silently ran at while the variable went unset
    expect(HOST_COOLDOWN_MS).toBe(0);
    expect(configFromEnv(env).engineTuning).toEqual({ cooldownMs: 0 });
    expect(configFromEnv({ ...env, DRAFT_COOLDOWN_MS: '  ' }).engineTuning).toEqual({ cooldownMs: 0 });
    expect(configFromEnv({ ...env, DRAFT_COOLDOWN_MS: '60000' }).engineTuning)
      .toEqual({ cooldownMs: 60_000 });
    // 0 is legal and is not "absent": a test host wants adoptions in one
    // second, and `??` on the value would have read it as unset
    expect(configFromEnv({ ...env, DRAFT_COOLDOWN_MS: '0' }).engineTuning)
      .toEqual({ cooldownMs: 0 });
    expect(COOLDOWN_MAX_MS).toBe(5 * 60_000);
    // §4.2's ceiling is a refusal, not a clamp: an operator asking for ten
    // minutes has misread the rule, and a silent clamp leaves them thinking
    // it took
    expect(() => configFromEnv({ ...env, DRAFT_COOLDOWN_MS: '600000' }))
      .toThrow(/DRAFT_COOLDOWN_MS/);
    expect(() => configFromEnv({ ...env, DRAFT_COOLDOWN_MS: '-1' }))
      .toThrow(/DRAFT_COOLDOWN_MS/);
    expect(() => configFromEnv({ ...env, DRAFT_COOLDOWN_MS: 'soon' }))
      .toThrow(/DRAFT_COOLDOWN_MS/);
  });

  it('drain resolves once every chain has settled', async () => {
    const chain = new WriteChain();
    const landed: string[] = [];
    void chain.run('a', async () => { await new Promise((r) => setTimeout(r, 30)); landed.push('a'); });
    void chain.run('b', async () => { await new Promise((r) => setTimeout(r, 10)); landed.push('b'); });
    void chain.run('a', async () => { landed.push('a2'); });
    await chain.drain();
    expect(landed).toEqual(['b', 'a', 'a2']);
  });
});

describe('stage 11: the torn-tail repair tool', () => {
  it('names a torn last line, refuses a torn middle, and writes only on --write', async () => {
    const { inspectTail, main } = await import('../src/tools.js');
    const { appendFileSync, readFileSync: read, writeFileSync: write, readdirSync } = await import('node:fs');
    const dataDir = tmp();
    const store = new DocStore(new FilePersistence(dataDir));
    const doc = await store.create('d-1', { title: 'T', slug: 't',
      convenor: { id: 'founder', email: 'f@example.org', isMember: true } }, 1);
    doc.cs.invite(2, 'a@example.org');
    await store.persist(doc);
    const path = join(dataDir, 'docs', 'd-1', 'log.jsonl');
    const intact = read(path, 'utf8');
    expect(inspectTail(path).torn).toBeNull();
    appendFileSync(path, '{"seq":2,"hash":"abc","prevHa'); // the crash
    const r = inspectTail(path);
    expect(r.torn).toContain('"seq":2');
    expect(r.prefixOk).toBe(true);
    expect(r.prefix).toBe(intact);
    // dry run changes nothing
    expect(await main(['repair-tail', dataDir, 'd-1'])).toBe(0);
    expect(read(path, 'utf8')).not.toBe(intact);
    // --write keeps the original aside and restores the intact prefix
    expect(await main(['repair-tail', dataDir, 'd-1', '--write'])).toBe(0);
    expect(read(path, 'utf8')).toBe(intact);
    const aside = readdirSync(join(dataDir, 'docs', 'd-1')).find((f) => f.startsWith('log.jsonl.torn-'));
    expect(aside).toBeTruthy();
    expect(read(join(dataDir, 'docs', 'd-1', aside!), 'utf8')).toBe(intact + '{"seq":2,"hash":"abc","prevHa');
    // a torn middle is not a tail
    write(path, 'not json\n' + intact);
    expect(() => inspectTail(path)).toThrow(/not the last/);
  });
});

describe('the slug reservation rides the stash (Q462b)', () => {
  it('holds the address while the stash lives, releases it on take and at expiry', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'draft-stash-'));
    const stash = new Stash(new FilePersistence(dir));
    const t0 = 1_000_000;
    await stash.open('k1', t0 + 1000, 'oak');
    await stash.open('k2', t0 + 1000);           // a stash with no address reserves nothing
    expect(await stash.reservedBy('oak', t0)).toBe('k1');
    expect(await stash.reservedBy('elm', t0)).toBeNull();
    // an update keeps the reservation
    await stash.update('k1', 'pasted text', t0);
    expect(await stash.reservedBy('oak', t0)).toBe('k1');
    // expired: the reservation is gone even before a sweep
    expect(await stash.reservedBy('oak', t0 + 2000)).toBeNull();
    // and a restart reads the same reservation back from disk
    const again = new Stash(new FilePersistence(dir));
    expect(await again.reservedBy('oak', t0)).toBe('k1');
    // the save takes the text and with it the hold: from here the document
    // holds the address, and the stash keeps only its claim (Q519)
    expect(await again.take('k1', t0, 'd-oak')).toBe('pasted text');
    expect(await again.reservedBy('oak', t0)).toBeNull();
    expect(await again.claimedBy('k1', t0)).toBe('d-oak');
  });
});

describe('mail to a reserved address is refused at the mailer (Q680)', () => {
  it('knows which addresses can never receive', () => {
    // the ones that can
    expect(deliverable('ada@example.org')).toBe(true); // the tests' own inbox
    expect(deliverable('ada@docs.vote')).toBe(true);
    expect(deliverable('ada@sub.domain.co.uk')).toBe(true);
    // the ones that cannot (RFC 2606 §2, RFC 6761)
    expect(deliverable('ladder-1@ladder.invalid')).toBe(false);
    expect(deliverable('ada@somewhere.test')).toBe(false);
    expect(deliverable('ada@anything.example')).toBe(false);
    expect(deliverable('ada@localhost')).toBe(false);
    expect(deliverable('ADA@LADDER.INVALID')).toBe(false); // case is not a way round
    expect(deliverable('not-an-address')).toBe(false);
  });

  it('writes nothing to the dev outbox for one, and everything for the others', async () => {
    const dir = tmp();
    const mailer = makeMailer({ resendApiKey: null, mailFrom: 't <t@example.org>', dataDir: dir });
    await mailer.send({ to: 'ladder-1@ladder.invalid', subject: 'hush', text: 'x' });
    await mailer.send({ to: 'ada@example.org', subject: 'real', text: 'y' });
    const lines = readFileSync(join(dir, 'outbox.jsonl'), 'utf8')
      .split('\n').filter((l) => l.length > 0).map((l) => JSON.parse(l) as { to: string });
    expect(lines.map((m) => m.to)).toEqual(['ada@example.org']);
  });

  /**
   * **The provider gets a deadline** (issue #20). A send is awaited inside a
   * sender pass, one row at a time, and the pass holds the shutdown drain
   * open — so a Resend that accepts the connection and never answers held
   * every mail behind it. The abort must read to the queue as any other
   * refusal does: one failed attempt, then the backoff, six before a
   * give-up — a stall must never spend the ladder in one go.
   */
  it('hands the provider a signal, and a stall is a retryable refusal (issue #20)', async () => {
    const dir = tmp();
    const mailer = makeMailer({ resendApiKey: 'rs-test', mailFrom: 't <t@example.org>', dataDir: dir });
    const real = globalThis.fetch;
    const calls: RequestInit[] = [];
    try {
      globalThis.fetch = ((_url: unknown, init: RequestInit) => {
        calls.push(init);
        return Promise.resolve(new Response('{"id":"ok"}', { status: 200 }));
      }) as unknown as typeof fetch;
      await mailer.send({ to: 'ada@example.org', subject: 'real', text: 'y' });
      expect(calls).toHaveLength(1);
      const signal = calls[0]!.signal;
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal!.aborted).toBe(false); // live at the call, not spent

      // what a fifteen-second silence actually throws, and what the queue
      // must see: the same retryable message a refusal gives, never a
      // DOMException with a provider's shape in it
      globalThis.fetch = (() => Promise.reject(
        new DOMException('The operation was aborted due to timeout', 'TimeoutError'),
      )) as unknown as typeof fetch;
      await expect(mailer.send({ to: 'ada@example.org', subject: 'real', text: 'y' }))
        .rejects.toThrow('the mail could not be sent — try again shortly');
    } finally {
      globalThis.fetch = real;
    }
  });
});

/**
 * **An address never reaches the process log** (issue #20). The console is
 * the host provider's retained log stream: outside the data dir, outside
 * Postgres, and beyond `draft-tools erase` — so a member who asked to be
 * forgotten would still be in it because one of their invitations was slow.
 * `error-log.ts` settled the principle for its own file (decision 1253);
 * these two lines are the outbox's half of it. The domain stays, because one
 * company's mail server refusing and a provider-wide incident are the same
 * line once every failure says only `m-…`.
 */
describe('the outbox log names the row and the domain, never the member (issue #20)', () => {
  it('redacts the local part on a retry and on a give-up alike', async () => {
    const dir = tmp();
    const persistence = new FilePersistence(dir);
    let t = 1_700_000_000_000;
    const outbox = new MailOutbox({
      persistence,
      mailer: { dev: false, send: () => Promise.reject(new Error('resend refused')) },
      mailOff: () => false,
      revoke: () => Promise.resolve(),
      now: () => t,
    });
    await outbox.enqueue([{
      documentId: 'd-1', to: 'ada@example.org',
      subject: 'You are invited', text: 'come in', tokenHash: 'h',
    }], t);
    const said: string[] = [];
    const real = console.error;
    console.error = (...a: unknown[]) => { said.push(a.map(String).join(' ')); };
    try {
      // the whole ladder: five retries and then the give-up
      for (let i = 0; i < OUTBOX_MAX_ATTEMPTS; i += 1) {
        await outbox.run(t);
        t += 3_600_001; // past the longest backoff, so the row is due again
      }
    } finally {
      console.error = real;
    }
    const log = said.join('\n');
    expect(said.filter((l) => l.includes('will retry'))).toHaveLength(OUTBOX_MAX_ATTEMPTS - 1);
    expect(log).toContain('MAIL GIVEN UP');
    // the member is not in it, the domain and the row are
    expect(log).not.toContain('ada@example.org');
    expect(log).not.toContain('ada');
    expect(log).toContain('…@example.org');
    const rows = await persistence.listOutboxFor('d-1', 'ada@example.org');
    expect(log).toContain(rows[0]!.id); // the join back to the queue
  });
});

describe('the exile mail names the office and carries no login (Q901, E31)', () => {
  it('says who did it by office, offers the document’s address, and mints no token', () => {
    const m = MAILS.removed('Gate Charter', 'https://docs.vote/d/gate');
    expect(m.subject).toBe('You are no longer a member of “Gate Charter”');
    expect(m.text).toContain('The Founder has removed you from the membership of “Gate Charter” and so you are no longer eligible to vote in it.');
    expect(m.text).toContain('https://docs.vote/d/gate');
    expect(m.text).not.toContain('?token=');
    expect(m.link).not.toContain('?token=');
    // no reason travels: `remove` takes none
    expect(m.text).not.toMatch(/because|reason/i);
  });
});
