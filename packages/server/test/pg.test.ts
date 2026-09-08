/**
 * The Postgres backend and the copier (PRODUCTION.md stage 6). Needs a
 * database: DRAFT_TEST_DATABASE_URL (locally the pinned container,
 * postgres://draft:draft@127.0.0.1:5433/draft; in CI a service
 * container). Without it the file is skipped, loudly, so a green run
 * without a database cannot be mistaken for a tested migration.
 *
 * The contract tests mirror unit.test.ts's FilePersistence ones; the
 * copier tests are the importer's oracle exercised in every direction
 * the mandate cares about: file → pg identical, re-run a no-op, a partial
 * run finished, a diverged destination refused, and the restore drill's
 * round trip pg → file identical to the original disk.
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { PgPersistence, SCHEMA_VERSION } from '../src/pg-persistence.js';
import { FilePersistence, OUTBOX_MAX_ATTEMPTS } from '../src/persistence.js';
import type { OutboxRow } from '../src/persistence.js';
import { DocStore } from '../src/store.js';
import { copyStore, verifyStores } from '../src/copy-store.js';
import { main as tools } from '../src/tools.js';
import { ConstitutionSession, InMemoryPeople } from '../../constitution/src/index.js';
import type { LogEntry } from '../../constitution/src/index.js';

const URL = process.env.DRAFT_TEST_DATABASE_URL ?? null;
if (URL === null) {
  console.warn('pg.test.ts: DRAFT_TEST_DATABASE_URL unset — the Postgres backend is NOT being tested');
}
const d = URL === null ? describe.skip : describe;

const opened: PgPersistence[] = [];
const open = async (): Promise<PgPersistence> => {
  const p = await PgPersistence.open(URL!, { schema: 't_' + Math.random().toString(36).slice(2, 10) });
  opened.push(p);
  return p;
};
const reopen = (p: PgPersistence) => PgPersistence.open(URL!, { schema: p.schema! });
const tmp = () => mkdtempSync(join(tmpdir(), 'draft-pg-'));

afterAll(async () => {
  for (const p of opened) {
    await (await reopen(p)).dropSchemaAndClose().catch(() => undefined);
    await p.close().catch(() => undefined);
  }
});

/** A small real document with an engine beside it, on disk. */
async function seedDisk(dataDir: string, n = 3): Promise<string[]> {
  const ids: string[] = [];
  const store = new DocStore(new FilePersistence(dataDir));
  for (let i = 0; i < n; i++) {
    const id = `d-${i}`;
    const doc = await store.create(id, {
      title: `Doc ${i}`, slug: `doc-${i}`,
      convenor: { id: 'founder', email: `f${i}@example.org`, isMember: true },
    }, 1000 + i);
    doc.cs.invite(2000 + i, 'ada@example.org');
    doc.cs.invite(2001 + i, 'bo@example.org');
    await store.persist(doc);
    ids.push(id);
  }
  // sidecars the copier must carry too
  const fp = new FilePersistence(dataDir);
  if (n < 2) return ids;
  await fp.writeProvisional('d-0', 'Some starting text\n\nwith "quotes" and ünïcödé');
  await fp.writeBridgeState('d-1', JSON.stringify({ cursor: 4, pairs: [] }));
  await fp.appendEngineLog('d-1', [
    { seq: 0, hash: 'h0', prevHash: '', event: { t: 1, type: 'genesis' }, schemaVersion: 1 },
    { seq: 1, hash: 'h1', prevHash: 'h0', event: { t: 2, type: 'x', s: 'a\u0000b\ud800' } },
  ]);
  await fp.putTokens([['tok1', { kind: 'login', email: 'a@example.org', expMs: 9e12, docId: 'd-0', memberId: 'm1' }]]);
  await fp.putStash('stash1', { text: 'pending', expMs: 9e12 });
  return ids;
}

const lastHash = (log: readonly LogEntry[]) => log[log.length - 1]!.hash;

d('PgPersistence contract', () => {
  it('migrates once, idempotently, and records the version', async () => {
    const p = await open();
    const again = await reopen(p); // a second open on the same schema
    await again.close();
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
  });

  it('round-trips a document log exactly and lists what it holds', async () => {
    const p = await open();
    const cs = ConstitutionSession.open({ title: 'T', slug: 't',
      convenor: { id: 'founder', email: 'f@example.org', isMember: true } }, 5);
    cs.invite(6, 'x@example.org');
    const log = cs.logEntries();
    expect(await p.listDocIds()).toEqual([]);
    await p.createDoc('d1');
    expect(await p.listDocIds()).toEqual([]); // a document is its log
    await p.appendDocLog('d1', log.slice(0, 1));
    await p.appendDocLog('d1', log.slice(1));
    expect(await p.listDocIds()).toEqual(['d1']);
    const back = await p.readDocLog('d1');
    expect(back.map((e) => [e.seq, e.hash, e.prevHash])).toEqual(log.map((e) => [e.seq, e.hash, e.prevHash]));
    // the whole envelope, key order included: a sixth field on LogEntry
    // must fail here rather than be dropped silently on the round trip
    expect(JSON.stringify(back)).toBe(JSON.stringify(log));
    // replay re-verifies every link from genesis
    expect(lastHash(ConstitutionSession.replay(back).logEntries())).toBe(lastHash(log));
  });

  it('the primary key refuses a second writer appending the same seq', async () => {
    const p = await open();
    await p.createDoc('d1');
    const e = { seq: 0, hash: 'a', prevHash: '', event: { t: 1 } };
    await p.appendEngineLog('d1', [e]);
    await expect(p.appendEngineLog('d1', [{ ...e, hash: 'b' }])).rejects.toThrow();
    expect(await p.readEngineLog('d1')).toHaveLength(1);
  });

  it('events keep bytes jsonb would reject: NUL and a lone surrogate', async () => {
    const p = await open();
    await p.createDoc('d1');
    const ev = { t: 1, s: 'a\u0000b\ud800c' };
    await p.appendEngineLog('d1', [{ seq: 0, hash: 'h', prevHash: '', event: ev }]);
    const [back] = await p.readEngineLog('d1') as Array<{ event: unknown }>;
    expect(JSON.stringify(back!.event)).toBe(JSON.stringify(ev));
  });

  it('provisional and bridge state are rows: set, overwrite, clear', async () => {
    const p = await open();
    await p.createDoc('d1');
    expect(await p.readProvisional('d1')).toBeNull();
    await p.writeProvisional('d1', 'one');
    await p.writeProvisional('d1', 'two');
    expect(await p.readProvisional('d1')).toBe('two');
    await p.writeProvisional('d1', null);
    expect(await p.readProvisional('d1')).toBeNull();
    expect(await p.readBridgeState('d1')).toBeNull();
    await p.writeBridgeState('d1', '{"a":1}');
    await p.writeBridgeState('d1', '{"a":2}');
    expect(await p.readBridgeState('d1')).toBe('{"a":2}');
  });

  it('takeToken is delete-and-return, once, under concurrency', async () => {
    const p = await open();
    const rec = { kind: 'login' as const, email: 'a@example.org', expMs: 9e12 };
    await p.putTokens([['h1', rec], ['h2', { ...rec, expMs: 1 }]]);
    const races = await Promise.all([p.takeToken('h1'), p.takeToken('h1'), p.takeToken('h1')]);
    expect(races.filter((r) => r !== null)).toHaveLength(1);
    expect(races.find((r) => r !== null)).toEqual(rec);
    await p.sweepTokens(1000);
    expect(await p.takeToken('h2')).toBeNull();
  });

  it('person rows ride the log append in one transaction, read back, and delete (decision 1253)', async () => {
    const p = await open();
    const cs = ConstitutionSession.open({ title: 'T', slug: 't',
      convenor: { id: 'founder', email: 'f@example.org', isMember: true } }, 5);
    const bo = cs.invite(6, 'bo@example.org');
    cs.arrive(6, bo);
    cs.setIdentity(7, bo, { name: 'Bo', picture: 'e🦊' });
    await p.createDoc('d1');
    const rows = (cs.people as InMemoryPeople).entries()
      .map(([personId, r]) => ({ personId, ...r }));
    await p.appendDocLog('d1', cs.logEntries(), rows);
    expect(await p.readPeople('d1')).toEqual([
      { personId: 'p-1', email: 'f@example.org', name: null, picture: null },
      { personId: 'p-2', email: 'bo@example.org', name: 'Bo', picture: 'e🦊' },
    ]);
    // rows alone, no entries: an upsert
    await p.appendDocLog('d1', [], [{ personId: 'p-2', email: 'bo@example.org', name: 'Bo Vane', picture: null }]);
    expect((await p.readPeople('d1')).find((r) => r.personId === 'p-2'))
      .toEqual({ personId: 'p-2', email: 'bo@example.org', name: 'Bo Vane', picture: null });
    expect(await p.readDocLog('d1')).toHaveLength(cs.logEntries().length);
    // a failed append rolls the rows back with it: the primary key on the
    // log refuses the duplicate seq, and the row written beside it never lands
    await expect(p.appendDocLog('d1', cs.logEntries().slice(0, 1),
      [{ personId: 'p-9', email: 'ghost@example.org', name: null, picture: null }])).rejects.toThrow();
    expect((await p.readPeople('d1')).some((r) => r.personId === 'p-9')).toBe(false);
    // erasure
    expect(await p.deletePerson('d1', 'p-2')).toBe(true);
    expect(await p.deletePerson('d1', 'p-2')).toBe(false);
    expect((await p.readPeople('d1')).map((r) => r.personId)).toEqual(['p-1']);
    // the log stands, and replays with the row gone
    const back = ConstitutionSession.replay(await p.readDocLog('d1'),
      new InMemoryPeople((await p.readPeople('d1')).map((r) => [r.personId, r] as const)));
    expect(back.rollingHash()).toBe(cs.rollingHash());
    expect(back.memberRecords().get(bo)).toMatchObject({ erased: true, email: null, name: null });
  });

  it('the wipe empties a throwaway schema and leaves it migrated', async () => {
    const p = await open();
    const store = new DocStore(p);
    await store.create('d-w', { title: 'W', slug: 'w',
      convenor: { id: 'founder', email: 'w@example.org', isMember: true } }, 1);
    await p.putTokens([['tw', { kind: 'login', email: 'w@example.org', expMs: 9e12 }]]);
    expect(await p.listDocIds()).toEqual(['d-w']);
    expect(await p.wipe()).toBe(1);
    expect(await p.listDocIds()).toEqual([]);
    expect(await p.readPeople('d-w')).toEqual([]);
    expect(await p.takeToken('tw')).toBeNull();
    // still this build's schema: a reopen migrates nothing and refuses nothing
    await (await reopen(p)).close();
  });

  it('stashes upsert, read, delete and sweep', async () => {
    const p = await open();
    await p.putStash('k', { text: '', expMs: 500 });
    await p.putStash('k', { text: 'later', expMs: 500 });
    expect(await p.getStash('k')).toEqual({ text: 'later', expMs: 500 });
    await p.sweepStashes(400);
    expect(await p.getStash('k')).not.toBeNull();
    await p.sweepStashes(600);
    expect(await p.getStash('k')).toBeNull();
    await p.putStash('k2', { text: 'x', expMs: 9e12 });
    await p.deleteStash('k2');
    expect(await p.getStash('k2')).toBeNull();
  });

  /**
   * **The backoff is stated twice, and this is the once it is asserted
   * equal.** `outboxDue` is the file store's predicate; the SQL in
   * `listPendingOutbox` is Postgres's copy of it, down to the `attempts <= 0`
   * clause that exists because `POWER(2, -1)` is 0.5 rather than 0. Without
   * this the two could drift silently and a mail would be re-offered at the
   * wrong minute on one store only.
   */
  it('the sender loop sees the same rows on both stores, at every attempt count', async () => {
    const p = await open();
    const file = new FilePersistence(tmp());
    const base = {
      documentId: null, to: 'a@example.org', subject: 's', body: 'b',
      createdMs: 1000, lastError: null, sentMs: null,
    };
    const rows: OutboxRow[] = [];
    for (let attempts = 0; attempts <= OUTBOX_MAX_ATTEMPTS + 1; attempts++) {
      rows.push({ ...base, id: `never-${attempts}`, attempts, lastAttemptMs: null });
      rows.push({ ...base, id: `tried-${attempts}`, attempts, lastAttemptMs: 1_000_000 });
    }
    rows.push({ ...base, id: 'done', attempts: 1, lastAttemptMs: 1_000_000, sentMs: 2_000_000 });
    await p.putOutbox(rows);
    await file.putOutbox(rows);
    // one instant per backoff rung, plus the moment each one elapses exactly
    const whens = [0, 1_000_000, 1_030_000, 1_060_000, 1_120_000, 1_240_000,
      1_480_000, 4_600_000, 9e12];
    for (const t of whens) {
      const pg = (await p.listPendingOutbox(t, 100)).map((r) => r.id);
      const fs = (await file.listPendingOutbox(t, 100)).map((r) => r.id);
      expect(pg, `at ${t}`).toEqual(fs);
      expect(fs.every((id) => !id.startsWith('done')), `at ${t}`).toBe(true);
    }
    // …and a delivered row keeps no credential, and is swept
    await p.markOutboxSent('never-0', 3_000_000);
    await file.markOutboxSent('never-0', 3_000_000);
    const one = (rs: Array<{ id: string }>) => rs.find((r) => r.id === 'never-0');
    expect(one(await p.dumpOutbox())).toEqual(one(await file.dumpOutbox()));
    expect(await p.pruneOutbox(4_000_000)).toBe(await file.pruneOutbox(4_000_000));
    expect((await p.dumpOutbox()).map((r) => r.id))
      .toEqual((await file.dumpOutbox()).map((r) => r.id));
  });
});

d('the copier: the importer, the export and the oracle', () => {
  it('file → pg carries every hash, the sidecars, and replays identically', async () => {
    const dataDir = tmp();
    const ids = await seedDisk(dataDir);
    const disk = new FilePersistence(dataDir);
    const pg = await open();
    const lines: string[] = [];
    const r = await copyStore(disk, pg, { log: (l) => lines.push(l) });
    expect(r.documents).toBe(3);
    expect(r.copied.sort()).toEqual(ids.sort());
    expect(r.unchanged).toEqual([]);
    expect(r.tokens).toBe(1);
    expect(r.stashes).toBe(1);
    expect(lines.at(-2)).toMatch(/hashes identical/);
    expect(await pg.readProvisional('d-0')).toContain('ünïcödé');
    expect(await pg.readBridgeState('d-1')).toBe(JSON.stringify({ cursor: 4, pairs: [] }));
    expect(await pg.takeToken('tok1')).toMatchObject({ kind: 'login' });
    expect(await pg.getStash('stash1')).toMatchObject({ text: 'pending' });
    // the server loads it exactly as it loaded the disk
    const fromDisk = new DocStore(disk); await fromDisk.loadAll();
    const fromPg = new DocStore(pg); await fromPg.loadAll();
    for (const id of ids) {
      expect(lastHash(fromPg.byId(id)!.cs.logEntries())).toBe(lastHash(fromDisk.byId(id)!.cs.logEntries()));
      // …rows included (decision 1253): the people resolve at the destination
      expect(await pg.readPeople(id)).toEqual(await disk.readPeople(id));
      expect([...fromPg.byId(id)!.cs.memberRecords().values()].map((m) => m.email))
        .toEqual([`f${id.slice(2)}@example.org`, 'ada@example.org', 'bo@example.org']);
    }
  });

  it('an erasure at the source is an erasure at the destination on the next run (decision 1253)', async () => {
    const dataDir = tmp();
    await seedDisk(dataDir, 1);
    const disk = new FilePersistence(dataDir);
    const pg = await open();
    await copyStore(disk, pg);
    expect((await pg.readPeople('d-0')).map((r) => r.personId)).toEqual(['p-1', 'p-2', 'p-3']);
    // the operator erases a person on the file side; the export/import
    // carries the deletion, since the rows are copied as a whole set
    expect(await disk.deletePerson('d-0', 'p-2')).toBe(true);
    const again = await copyStore(disk, pg);
    expect(again.unchanged).toEqual(['d-0']);
    expect((await pg.readPeople('d-0')).map((r) => r.personId)).toEqual(['p-1', 'p-3']);
    expect(await verifyStores(disk, pg)).toBe(1);
    // and a destination whose rows differ is a divergence the oracle names
    await pg.appendDocLog('d-0', [], [{ personId: 'p-2', email: 'x@example.org', name: null, picture: null }]);
    await expect(verifyStores(disk, pg)).rejects.toThrow(/d-0: the people rows differ/);
  });

  it('re-running is a no-op, and a partial run is finished rather than forked', async () => {
    const dataDir = tmp();
    await seedDisk(dataDir);
    const disk = new FilePersistence(dataDir);
    const pg = await open();
    // simulate a run that died after the first entry of d-2
    await pg.createDoc('d-2');
    await pg.appendDocLog('d-2', (await disk.readDocLog('d-2')).slice(0, 1));
    const first = await copyStore(disk, pg);
    expect(first.copied).toContain('d-2');
    const second = await copyStore(disk, pg);
    expect(second.copied).toEqual([]);
    expect(second.unchanged.sort()).toEqual(['d-0', 'd-1', 'd-2']);
    expect(await verifyStores(disk, pg)).toBe(3);
  });

  it('a diverged destination is refused, and nothing is written past it', async () => {
    const dataDir = tmp();
    await seedDisk(dataDir);
    const disk = new FilePersistence(dataDir);
    const pg = await open();
    const [genesis] = await disk.readDocLog('d-0');
    await pg.createDoc('d-0');
    await pg.appendDocLog('d-0', [{ ...genesis!, hash: 'not-the-hash' }]);
    await expect(copyStore(disk, pg)).rejects.toThrow(/d-0: document log diverges at seq 0/);
    expect(await pg.readDocLog('d-0')).toHaveLength(1);
    expect(await pg.listDocIds()).toEqual(['d-0']); // d-1, d-2 never started
  });

  it('a corrupted source entry fails the replay oracle, not just the row compare', async () => {
    const dataDir = tmp();
    await seedDisk(dataDir, 1);
    // tamper with the disk log's second event without touching its hash
    const path = join(dataDir, 'docs', 'd-0', 'log.jsonl');
    const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean);
    const e = JSON.parse(lines[1]!) as { event: { email?: string } };
    e.event.email = 'evil@example.org';
    lines[1] = JSON.stringify(e);
    writeFileSync(path, lines.join('\n') + '\n');
    const pg = await open();
    await expect(copyStore(new FilePersistence(dataDir), pg)).rejects.toThrow();
  });

  it('the restore drill: pg → a fresh directory is identical to the original disk', async () => {
    const dataDir = tmp();
    await seedDisk(dataDir);
    const pg = await open();
    await copyStore(new FilePersistence(dataDir), pg);
    const restored = tmp();
    const r = await copyStore(pg, new FilePersistence(restored));
    expect(r.documents).toBe(3);
    expect(await verifyStores(new FilePersistence(dataDir), new FilePersistence(restored))).toBe(3);
    // byte-for-byte on the log file too: the export writes what the disk held
    for (const id of ['d-0', 'd-1', 'd-2']) {
      expect(readFileSync(join(restored, 'docs', id, 'log.jsonl'), 'utf8'))
        .toBe(readFileSync(join(dataDir, 'docs', id, 'log.jsonl'), 'utf8'));
    }
    expect(readFileSync(join(restored, 'docs', 'd-1', 'engine.jsonl'), 'utf8'))
      .toBe(readFileSync(join(dataDir, 'docs', 'd-1', 'engine.jsonl'), 'utf8'));
  });

  it('the CLI drill exits 0 on a good disk and leaves no schema behind', async () => {
    const dataDir = tmp();
    await seedDisk(dataDir);
    const said: string[] = [];
    const orig = console.log;
    console.log = (l: string) => { said.push(l); };
    try {
      expect(await tools(['drill', dataDir, URL!])).toBe(0);
    } finally { console.log = orig; }
    expect(said.find((l) => l.includes('survived disk → Postgres → disk'))).toBeTruthy();
    const schema = /schema (drill_\w+)/.exec(said.join('\n'))![1]!;
    const probe = await open();
    // the throwaway schema is gone
    const { rows } = await (probe as unknown as { pool: { query: (q: string, a: unknown[]) =>
      Promise<{ rows: unknown[] }> } }).pool.query(
      'SELECT 1 FROM information_schema.schemata WHERE schema_name = $1', [schema]);
    expect(rows).toHaveLength(0);
  });
});
