/**
 * **Snapshots** (plan-scaling.md Stage 3): a document's engine fold, written
 * down every `SNAPSHOT_EVERY` engine entries and at the engine's close, so a
 * load folds only the tail of the engine log.
 *
 * **The log is the only truth** (the plan's invariant 1). A snapshot is a
 * cache of it, versioned by the code that made it (`codeVersion`), and taken
 * only when it fits: same code, standing on this log (the entry it was taken
 * at carries the hash it recorded), not past the log's end. Anything else, an
 * unreadable row included, is a full replay, and the replay writes a fresh
 * snapshot. Restoring still verifies the whole hash chain (SPEC §11).
 *
 * **Only the engine is snapshotted.** Its fold is the whole of a large
 * document's load: the convention in boot-guard's set folds 5,364 engine
 * entries in ~4 s and 145 constitution entries in 22 ms. The constitution's
 * member records also read `people` through live getters (decision 1253),
 * which plain data cannot carry. `seq` is recorded beside `eseq` for the
 * record.
 *
 * **The audit** (`SnapshotAudit`) replays from scratch beside a restore and
 * compares the two folds' encodings byte for byte.
 */
import { gunzipSync, gzipSync } from 'node:zlib';
import { Session as EngineSession } from '../../engine-core/src/session.js';
import type { EngineSnapshot } from '../../engine-core/src/session.js';
import type { LogEntry as EngineLogEntry } from '../../engine-core/src/types.js';
import { codeVersion } from './code-version.js';
import type { Persistence, SnapshotRow } from './persistence.js';
import type { LoadedDoc } from './store.js';

/**
 * **K**: a snapshot every this many engine entries. The tail costs ~0.8 ms per
 * entry at convention size on the desktop (×7 on Render), on top of a restore
 * of ~90 ms, most of it verifying the chain. So at 100 the worst tail adds
 * ~150 ms locally and ~1 s on Render. A write is ~16 ms of synchronous work
 * and ~50 KB, about 54 of them over a convention's life (PR #214's REPORT).
 */
export const SNAPSHOT_EVERY = 100;

export type SnapshotAudit = 'off' | 'strict' | number;

/** `DRAFT_SNAPSHOT_AUDIT`; absent is `strict` off the production build and
 *  `off` on it. A value it cannot read is refused, never guessed. */
export function parseSnapshotAudit(raw: string | undefined): SnapshotAudit {
  const v = (raw ?? '').trim();
  if (v === '') return process.env.DRAFT_BUILD === 'prod' ? 'off' : 'strict';
  if (v === 'off' || v === 'strict') return v;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    throw new Error(`DRAFT_SNAPSHOT_AUDIT must be 'off', 'strict' or a rate 0..1 (got '${raw}')`);
  }
  return n;
}

/** Thrown by a `strict` audit: a snapshot folded to a state the log does not. */
export class SnapshotAuditError extends Error {
  constructor(docId: string, eseq: number) {
    super(`document '${docId}': the snapshot at engine entry ${eseq} plus its tail does not ` +
      'fold to what the whole log folds to (plan-scaling.md invariant 1)');
    this.name = 'SnapshotAuditError';
  }
}

/** What the host's loads and writes did, for `/healthz`. */
export interface SnapshotCounts {
  /** loads that restored a snapshot and folded its tail */
  restored: number;
  /** loads that replayed the whole engine log, and why */
  replayed: { none: number; code: number; stale: number; unreadable: number };
  written: number;
  writeFailed: number;
  audited: number;
  auditMismatch: number;
  /** the slowest engine load this process has made, in ms, and its document */
  slowestLoad: { ms: number; doc: string; from: 'snapshot' | 'replay' } | null;
}

export const newSnapshotCounts = (): SnapshotCounts => ({
  restored: 0, replayed: { none: 0, code: 0, stale: 0, unreadable: 0 },
  written: 0, writeFailed: 0, audited: 0, auditMismatch: 0, slowestLoad: null,
});

export interface SnapshotOpts {
  audit: SnapshotAudit;
  counts: SnapshotCounts;
  /** the audit's dice; a test hands in its own */
  random?: () => number;
}

/** The encoding the audit compares and the snapshot stores. */
const encode = (snap: EngineSnapshot): string => JSON.stringify(snap);

/**
 * **The engine's fold for a document at load**: the snapshot and the tail
 * where the snapshot fits, the whole log otherwise. `snapshotEseq` is where
 * the stored snapshot stands after this, so the write path knows when the
 * next one is due: 0 where none fits.
 */
export async function loadEngine(persistence: Persistence, docId: string,
  log: EngineLogEntry[], opts: SnapshotOpts):
  Promise<{ engine: EngineSession; from: 'snapshot' | 'replay'; snapshotEseq: number }> {
  const t0 = performance.now();
  let row: SnapshotRow | null = null;
  let why: keyof SnapshotCounts['replayed'] = 'none';
  try { row = await persistence.readSnapshot(docId); } catch (e) {
    console.error(`document '${docId}': snapshot unreadable, replaying in full:`, e);
    why = 'unreadable';
  }
  let engine: EngineSession | null = null;
  let snapshotEseq = 0;
  if (row !== null) {
    if (row.codeVersion !== codeVersion()) {
      why = 'code';
    } else {
      try {
        const snap = JSON.parse(gunzipSync(row.state).toString('utf8')) as EngineSnapshot;
        if (snap.eseq !== row.eseq) throw new Error(`the row says ${row.eseq}, its state ${snap.eseq}`);
        engine = EngineSession.restore(snap, log);
        snapshotEseq = snap.eseq;
      } catch (e) {
        // a snapshot that does not stand on this log (a rewound or torn
        // tail, a crash between its two files) is ordinary; one that does
        // and still throws is a bug, and both are only a full replay
        why = /does not stand on this log/.test(String(e)) ? 'stale' : 'unreadable';
        if (why === 'unreadable') console.error(`document '${docId}': snapshot did not restore:`, e);
        engine = null;
      }
    }
  }
  const from = engine !== null ? 'snapshot' : 'replay';
  if (engine === null) {
    engine = EngineSession.replay([...log]);
    opts.counts.replayed[why] += 1;
  } else {
    opts.counts.restored += 1;
    if (auditThis(opts)) engine = audit(docId, engine, log, snapshotEseq, opts);
  }
  const ms = performance.now() - t0;
  const slow = opts.counts.slowestLoad;
  if (slow === null || ms > slow.ms) opts.counts.slowestLoad = { ms: Math.round(ms), doc: docId, from };
  return { engine, from, snapshotEseq };
}

function auditThis(opts: SnapshotOpts): boolean {
  if (opts.audit === 'off') return false;
  if (opts.audit === 'strict') return true;
  return (opts.random ?? Math.random)() < opts.audit;
}

/** Replay from scratch beside the restore; the log wins any disagreement. */
function audit(docId: string, restored: EngineSession, log: EngineLogEntry[], eseq: number,
  opts: SnapshotOpts): EngineSession {
  opts.counts.audited += 1;
  const full = EngineSession.replay([...log]);
  if (encode(full.snapshot()) === encode(restored.snapshot())) return restored;
  opts.counts.auditMismatch += 1;
  const err = new SnapshotAuditError(docId, eseq);
  if (opts.audit === 'strict') throw err;
  console.error(`${err.message} — serving the full replay`);
  return full;
}

/** Whether the document's engine has moved `SNAPSHOT_EVERY` past its stored
 *  snapshot, or has closed past it. */
export function snapshotDue(engine: EngineSession, storedEseq: number): boolean {
  const n = engine.log.length;
  if (n === 0 || n === storedEseq) return false;
  return n - storedEseq >= SNAPSHOT_EVERY || engine.closed;
}

/**
 * **Write the engine's snapshot** at the length it stands at now. The caller
 * has just persisted the engine log to exactly this length, so the snapshot
 * stands on entries the store already holds. **Never a commit's failure**:
 * a snapshot that could not be taken or written is counted and logged, and
 * the next load replays a little more.
 */
export async function writeEngineSnapshot(persistence: Persistence, doc: LoadedDoc,
  engine: EngineSession, counts: SnapshotCounts, nowMs: number): Promise<number | null> {
  try {
    const snap = engine.snapshot();
    const row: SnapshotRow = { seq: doc.cs.logEntries().length, eseq: snap.eseq,
      codeVersion: codeVersion(), state: gzipSync(encode(snap)), writtenMs: nowMs };
    await persistence.writeSnapshot(doc.id, row);
    counts.written += 1;
    return snap.eseq;
  } catch (e) {
    counts.writeFailed += 1;
    console.error(`document '${doc.id}': snapshot not written:`, e);
    return null;
  }
}
