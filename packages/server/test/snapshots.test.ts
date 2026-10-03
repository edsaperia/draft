import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync }
  from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { configFromEnv } from '../src/config.js';
import { createDraftServer } from '../src/server.js';
import { codeVersion, ENGINE_SRC, engineFingerprint } from '../src/code-version.js';
import { asEngineDoc, snapshotIfDue } from '../src/engine-host.js';
import { FilePersistence } from '../src/persistence.js';
import { loadEngine, newSnapshotCounts, parseSnapshotAudit, SNAPSHOT_EVERY, snapshotDue }
  from '../src/snapshots.js';
import { decodeState, encodeState } from '../../engine-core/src/snapshot.js';
import { Session as EngineSession } from '../../engine-core/src/session.js';
import type { EngineSnapshot } from '../../engine-core/src/session.js';
import type { LogEntry } from '../../engine-core/src/types.js';
// the build's own copy of the fingerprint, a plain script
// @ts-expect-error — a .mjs without types, read only here
import { engineFingerprint as buildFingerprint } from '../../../scripts/engine-fingerprint.mjs';

/**
 * **Snapshots at the host** (plan-scaling.md Stage 3), over boot-guard's fixed
 * set — ten documents in the Stage 0 pool's mix, one a convention of 5,364
 * engine entries (Q1554) — the same bytes every run.
 */

afterEach(() => new Promise<void>((done) => { setTimeout(done, 0); }));

const FIXTURE = join(import.meta.dirname, '..', '..', 'sim-harness', 'fixtures', 'boot-guard-set.json.gz');
const DESIGN_DIR = join(import.meta.dirname, '..', '..', '..', 'design');
const roots: string[] = [];
afterAll(() => { for (const r of roots) rmSync(r, { recursive: true, force: true }); });

function unpack(): string {
  const root = mkdtempSync(join(tmpdir(), 'draft-snap-'));
  roots.push(root);
  const packed = JSON.parse(gunzipSync(readFileSync(FIXTURE)).toString('utf8')) as
    { files: Record<string, string> };
  for (const [rel, text] of Object.entries(packed.files)) {
    const to = join(root, ...rel.split('/'));
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, text);
  }
  return root;
}

const engineLog = (dir: string, id: string): LogEntry[] =>
  readFileSync(join(dir, 'docs', id, 'engine.jsonl'), 'utf8').split('\n').filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as LogEntry);
const engineDocs = (dir: string): string[] =>
  readdirSync(join(dir, 'docs')).filter((id) => existsSync(join(dir, 'docs', id, 'engine.jsonl'))).sort();

async function boot(dir: string, audit = 'strict') {
  const env: NodeJS.ProcessEnv = { DRAFT_DATA_DIR: dir, DRAFT_STORE: 'file', DRAFT_NOTIFY_EMAIL: '',
    PORT: '0', DRAFT_DEMO: 'off', DRAFT_SNAPSHOT_AUDIT: audit, DRAFT_DESIGN_DIR: DESIGN_DIR };
  return createDraftServer(configFromEnv(env));
}

/** Each document's engine fold, encoded, from a booted host. */
const folds = (draft: Awaited<ReturnType<typeof boot>>): Record<string, string> =>
  Object.fromEntries([...draft.store.all()].map((d) => [d.id,
    JSON.stringify(asEngineDoc(d).bridge?.engine.snapshot() ?? null)]));

describe('codeVersion: a change to the engine invalidates every snapshot', () => {
  it('the host and the build compute one fingerprint', () => {
    expect(engineFingerprint(ENGINE_SRC)).toBe(buildFingerprint(ENGINE_SRC));
    expect(codeVersion()).toContain(engineFingerprint(ENGINE_SRC).slice(0, 24));
    expect(codeVersion()).toContain(process.versions.v8);
  });

  it('a deliberate fold change moves it, and a line ending does not', () => {
    const copy = mkdtempSync(join(tmpdir(), 'draft-fp-'));
    roots.push(copy);
    cpSync(ENGINE_SRC, copy, { recursive: true });
    const before = engineFingerprint(copy);
    const session = join(copy, 'session.ts');
    const src = readFileSync(session, 'utf8');
    writeFileSync(session, src.replace(/\n/g, '\r\n'));
    expect(engineFingerprint(copy)).toBe(before);
    // the fold change: one arm of `apply` counts a comparison twice
    const changed = src.replace('this.edgeCount++;', 'this.edgeCount += 2;');
    expect(changed).not.toBe(src);
    writeFileSync(session, changed);
    expect(engineFingerprint(copy)).not.toBe(before);
  });

  it('a snapshot written under other code is passed over for a full replay', async () => {
    const dir = unpack();
    const id = engineDocs(dir).find((d) => engineLog(dir, d).length > SNAPSHOT_EVERY)!;
    const log = engineLog(dir, id);
    const p = new FilePersistence(dir);
    const counts = newSnapshotCounts();
    const first = await loadEngine(p, id, log, { audit: 'strict', counts });
    expect(first.from).toBe('replay');
    // a snapshot the running code wrote is taken…
    const snap = first.engine.snapshot();
    await p.writeSnapshot(id, { seq: 0, eseq: snap.eseq, codeVersion: codeVersion(),
      state: gzipSync(JSON.stringify(snap)), writtenMs: 1 });
    expect((await loadEngine(p, id, log, { audit: 'strict', counts })).from).toBe('snapshot');
    // …and the same bytes under another fingerprint are not
    await p.writeSnapshot(id, { seq: 0, eseq: snap.eseq, codeVersion: 'f1.v8-x.other',
      state: gzipSync(JSON.stringify(snap)), writtenMs: 1 });
    expect((await loadEngine(p, id, log, { audit: 'strict', counts })).from).toBe('replay');
    expect(counts.replayed).toEqual({ none: 1, code: 1, stale: 0, unreadable: 0 });
  });
});

describe('the host loads from snapshots, and writes them', () => {
  it('first boot replays and writes; second restores; both fold alike; the audit passes', async () => {
    const dir = unpack();
    const a = await boot(dir);
    // K entries or more, or closed: the set's small documents closed long ago
    const big = [...a.store.all()].filter((d) => {
      const engine = asEngineDoc(d).bridge?.engine;
      return engine !== undefined && snapshotDue(engine, 0);
    }).map((d) => d.id);
    expect(big.length).toBeGreaterThan(2);
    expect(big.length).toBeLessThan(engineDocs(dir).length + 1);
    expect(a.snapshots.restored).toBe(0);
    expect(a.snapshots.written).toBe(big.length);
    expect(a.snapshots.audited).toBe(0);
    const foldsA = folds(a);
    await a.close();
    for (const id of big) expect(existsSync(join(dir, 'docs', id, 'snapshot.state.gz'))).toBe(true);
    const b = await boot(dir);
    expect(b.snapshots.restored).toBe(big.length);
    expect(b.snapshots.written).toBe(0);
    // strict on a dev host: every restore was audited against a full replay
    expect(b.snapshots.audited).toBe(big.length);
    expect(b.snapshots.auditMismatch).toBe(0);
    expect(folds(b)).toEqual(foldsA);
    await b.close();
  }, 300_000);

  /** A snapshot that restores cleanly and folds wrong: the fold's count of
   *  edge comparisons moved by one inside the stored state. */
  function tamper(dir: string, id: string): void {
    const path = join(dir, 'docs', id, 'snapshot.state.gz');
    const snap = JSON.parse(gunzipSync(readFileSync(path)).toString('utf8')) as EngineSnapshot;
    const fields = decodeState(snap.state) as { edgeCount: number };
    fields.edgeCount += 1;
    writeFileSync(path, gzipSync(JSON.stringify({ ...snap, state: encodeState(fields) })));
  }

  it('the audit catches a snapshot the log does not fold to — strict quarantines, a rate serves the log', async () => {
    const dir = unpack();
    await (await boot(dir, 'off')).close();
    const id = engineDocs(dir).find((d) => engineLog(dir, d).length >= SNAPSHOT_EVERY)!;
    tamper(dir, id);
    // off: nothing compares, and the wrong state is served — which is why CI is strict
    const off = await boot(dir, 'off');
    expect(off.snapshots.auditMismatch).toBe(0);
    await off.close();
    const strict = await boot(dir, 'strict');
    expect(strict.snapshots.auditMismatch).toBe(1);
    expect(asEngineDoc(strict.store.byId(id)!).engineQuarantined).toBe(true);
    await strict.close();
    const sampled = await boot(dir, '1');
    expect(sampled.snapshots.auditMismatch).toBe(1);
    const served = asEngineDoc(sampled.store.byId(id)!).bridge!.engine;
    expect(JSON.stringify(served.snapshot()))
      .toBe(JSON.stringify(EngineSession.replay(engineLog(dir, id)).snapshot()));
    await sampled.close();
  }, 300_000);

  it('a snapshot past the log\'s end (a torn tail) is stale: replayed, then rewritten', async () => {
    const dir = unpack();
    await (await boot(dir, 'off')).close();
    const id = engineDocs(dir).find((d) => engineLog(dir, d).length >= SNAPSHOT_EVERY)!;
    // a snapshot taken after five more entries than the store holds
    const path = join(dir, 'docs', id, 'snapshot.state.gz');
    const meta = join(dir, 'docs', id, 'snapshot.json');
    const snap = JSON.parse(gunzipSync(readFileSync(path)).toString('utf8')) as EngineSnapshot;
    writeFileSync(path, gzipSync(JSON.stringify({ ...snap, eseq: snap.eseq + 5 })));
    const m = JSON.parse(readFileSync(meta, 'utf8')) as { eseq: number };
    writeFileSync(meta, JSON.stringify({ ...m, eseq: m.eseq + 5 }));
    const b = await boot(dir, 'strict');
    expect(b.snapshots.replayed.stale).toBe(1);
    expect(b.snapshots.written).toBe(1);
    await b.close();
  }, 300_000);

  it('the commit writes one every K engine entries, and only while the engine stands where the store does', async () => {
    const dir = unpack();
    const draft = await boot(dir, 'off');
    const doc = [...draft.store.all()].find((d) => (asEngineDoc(d).bridge?.engine.log.length ?? 0) >= SNAPSHOT_EVERY)!;
    const d = asEngineDoc(doc);
    const engine = d.bridge!.engine;
    expect(snapshotDue(engine, d.snapshotEseq ?? 0)).toBe(false);
    // as if the stored snapshot stood K entries back
    d.snapshotEseq = engine.log.length - SNAPSHOT_EVERY;
    const counts = newSnapshotCounts();
    d.enginePersisted -= 1; // an entry the store does not hold yet
    await snapshotIfDue(new FilePersistence(dir), doc, counts, 1);
    expect(counts.written).toBe(0);
    d.enginePersisted += 1;
    await snapshotIfDue(new FilePersistence(dir), doc, counts, 1);
    expect(counts.written).toBe(1);
    expect(d.snapshotEseq).toBe(engine.log.length);
    await draft.close();
  }, 300_000);
});

describe('DRAFT_SNAPSHOT_AUDIT', () => {
  it('reads off, strict and a rate, refuses anything else, and is strict off the production build', () => {
    expect(parseSnapshotAudit('off')).toBe('off');
    expect(parseSnapshotAudit('strict')).toBe('strict');
    expect(parseSnapshotAudit('0.05')).toBe(0.05);
    expect(() => parseSnapshotAudit('2')).toThrow(/DRAFT_SNAPSHOT_AUDIT/);
    expect(() => parseSnapshotAudit('sometimes')).toThrow(/DRAFT_SNAPSHOT_AUDIT/);
    expect(parseSnapshotAudit(undefined)).toBe('strict');
  });
});
