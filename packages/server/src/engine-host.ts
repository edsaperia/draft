/**
 * The engine at the server (Q391): a constituted document gets an
 * engine-core Session through the EngineBridge, so ordinary set-motions
 * race for real — stake, rivals in one race, adoption at the bar, the
 * verdict through the adjudication seam, the new standing back as ground.
 *
 * Persistence follows the document's own pattern: the engine's
 * hash-chained log appends beside the document log, and the one thing
 * neither log holds — the motion ↔ candidate pairing and the bridge's
 * cs-log cursor — is the bridge state, rewritten whole. Loading is
 * replay on both logs. Since PRODUCTION.md stage 2 the bytes live behind
 * the Persistence seam; driving the bridge (mutation) and persisting it
 * are two acts, because the first is synchronous and the second is the
 * commit chain's business.
 */
import { EngineBridge } from '../../constitution/src/engine-bridge.js';
import type { BridgeState } from '../../constitution/src/engine-bridge.js';
import { DEFAULT_TUNING } from '../../constitution/src/adapter.js';
import type { EngineTuning } from '../../constitution/src/adapter.js';
import type { LoadedDoc } from './store.js';
import type { Persistence } from './persistence.js';

interface EngineLogEntry { seq: number; hash: string; prevHash: string; event: { t: number } }

export interface EngineDoc extends LoadedDoc {
  bridge: EngineBridge | null;
  /** Set when the persisted engine state is unusable (an orphaned log with
   *  no bridge state): the document serves, the engine stays off, and the
   *  condition is logged loudly — never silently re-birthed over. */
  engineQuarantined?: boolean;
  enginePersisted: number;
  /** The bridge state as last persisted — unchanged means no rewrite. */
  bridgeSerialized: string | null;
}

export function asEngineDoc(doc: LoadedDoc): EngineDoc {
  const d = doc as EngineDoc;
  if (d.bridge === undefined) {
    d.bridge = null; d.enginePersisted = 0; d.bridgeSerialized = null;
  }
  return d;
}

/**
 * **The dev clock's one foothold in code that ships** (Q1455, Ed 2026-09-18).
 * A document's own clock is `foldTime` and nothing else, so one document can
 * be moved forward by adding a skew there — and the whole of the mechanism in
 * the production artifact is the two functions below, which answer 0 for
 * every document for ever. `installDevClock`'s **body is inside the `DEV:`
 * label**, so the build drops it and what is left is a function that takes an
 * argument and does nothing: the artifact holds the read and no way at all to
 * write it, and the only caller of the setter — `dev-clock.ts` — is reached
 * solely by a dynamic import inside the same label and so is never resolved
 * into the bundle. `scripts/build-server.mjs` greps its own output for both.
 *
 * Nothing about the skew is ever written down, and nothing needs to be: what
 * reaches the log is the *time*, and the time is in the log. A host that
 * restarts forgets the skew and the document's clock falls back to real now
 * — which cannot move it backwards, because `foldTime` is a maximum over the
 * logs it already has.
 */
let devSkew: ((docId: string) => number) | null = null;

export function installDevClock(skew: (docId: string) => number): void {
  DEV: { devSkew = skew; }
}

/** How far ahead of the wall clock this document is being run. Always 0 in
 *  anything that ships, and 0 on every document but the one a dev walk moved. */
export function devSkewMs(docId: string): number {
  return devSkew === null ? 0 : devSkew(docId);
}

/**
 * **A command is stamped at the fold** (Q1332, Ed 2026-09-11: *stamp at the
 * fold* — the log records when the document changed). The time is taken
 * when the command is about to fold, never at the request's receipt, and is
 * never earlier than the last event of *either* log: the constitution's, and
 * the engine's where one exists. Past the moon room's knee a request waited
 * seconds between receipt and fold, and a judgment stamped at receipt was
 * refused by the engine log — *timestamps must be non-decreasing* — because a
 * fresher one had folded first; the constitution log alone was already
 * guarded, which is why only judgments were lost.
 */
export function foldTime(doc: LoadedDoc, nowMs?: number): number {
  const log = doc.cs.logEntries();
  const csLast = log.length > 0 ? log[log.length - 1]!.event.t : 0;
  const bridge = asEngineDoc(doc).bridge;
  const eLog: ReadonlyArray<{ event: { t: number } }> = bridge ? bridge.engine.log : [];
  const eLast = eLog.length > 0 ? eLog[eLog.length - 1]!.event.t : 0;
  return Math.max(nowMs ?? devNow(doc.id), csLast, eLast);
}

/**
 * **The wall clock this document is running on** (Q1455) — real now, and on a
 * document a dev walk has moved, real now plus its skew. Used where `foldTime`
 * is asked *what time is it*, and never where a caller has said *this time*:
 * an explicit argument is honoured as given, skew or no skew.
 *
 * **That distinction is the whole of it, and it is load-bearing.** A first cut
 * added the skew inside the maximum, so every caller that handed in a time —
 * the phase ladder commits at `pen.now`, a time it has just written an event
 * at — got a moment *after* the one they named. Two failures came of it, both
 * seen within the hour: the skew compounding on every hop (one jump of an
 * hour, committed two hours on), and, once that was idempotent, the ladder's
 * `toClosed` writing its ending at one instant and the commit behind it
 * driving the engine at a millisecond later — so the engine ran its close at a
 * window behind its own log and threw *timestamps must be non-decreasing*,
 * once a minute, for ever. It bit about one run in two, which is the worst
 * kind of bug to own. Honouring the argument is what makes a caller's *this
 * instant* mean it.
 */
export function devNow(docId: string, nowMs: number = Date.now()): number {
  return nowMs + devSkewMs(docId);
}

/** Resume a persisted bridge; called once per document at load. The host's
 *  tuning rides along so the bridge can re-state the host's cooldown on a
 *  document born under another (R-086) — at the first sweep, never here. */
export async function resumeBridge(persistence: Persistence, doc: LoadedDoc,
  tuning?: Partial<EngineTuning>): Promise<void> {
  const d = asEngineDoc(doc);
  if (d.bridge !== null) return;
  const log = await persistence.readEngineLog(doc.id) as EngineLogEntry[];
  if (log.length === 0) return;
  const raw = await persistence.readBridgeState(doc.id);
  if (raw === null) {
    // an engine log with no bridge state is a torn first persist (review
    // #1, finding 5): birthing a new bridge would append a second genesis
    // after the orphaned entries — a mixed, unreplayable file
    console.error(`document '${doc.id}': engine log exists with no bridge ` +
      'state — engine quarantined; the document serves without races');
    d.engineQuarantined = true;
    return;
  }
  const state = JSON.parse(raw) as BridgeState;
  d.bridge = new EngineBridge(doc.cs, {
    t: doc.cs.constitutedAtT!, rngSeed: doc.id,
    ...(tuning ? { tuning: { ...DEFAULT_TUNING, ...tuning } } : {}),
    resume: { log: log as never, ...state },
  });
  d.enginePersisted = log.length;
  d.bridgeSerialized = raw;
}

/**
 * Keep the bridge abreast of the document: born the moment the
 * constitution settles, synced after every command (roster truth and
 * ground shifts, §9.6/Q328), closed when a windowed document's ending
 * passes (the races' close, §4). Mutation only — persistEngine writes.
 */
export function driveBridge(doc: LoadedDoc, t: number,
  tuning?: Partial<EngineTuning>): void {
  const d = asEngineDoc(doc);
  if (doc.cs.constitutedAtT === null || d.engineQuarantined) return;
  if (d.bridge === null) {
    d.bridge = new EngineBridge(doc.cs, { t, rngSeed: doc.id,
      ...(tuning ? { tuning: { ...DEFAULT_TUNING, ...tuning } } : {}) });
    d.enginePersisted = 0;
  } else if (!d.bridge.engine.closed) {
    // tick, not bare sync (Ed, 2026-08-19): the minute timer is the
    // adoption metronome — a due batch lands even in a quiet room.
    d.bridge.tick(t);
  }
  const ending = doc.cs.settingState('ending').value as { endsAtMs: number | null } | null;
  if (ending !== null && ending.endsAtMs !== null && t >= ending.endsAtMs &&
      !d.bridge.engine.closed) {
    d.bridge.close(t);
  }
}

/** Append what the engine emitted since the last persist; save the bridge. */
export async function persistEngine(persistence: Persistence, doc: LoadedDoc): Promise<void> {
  const d = asEngineDoc(doc);
  if (d.bridge === null) return;
  const log = d.bridge.engine.log as unknown as EngineLogEntry[];
  const fresh = log.slice(d.enginePersisted);
  const state = JSON.stringify(d.bridge.state());
  // first persist writes the state BEFORE the log (review #1, finding 5):
  // a crash between the two then leaves state-without-log, which resume
  // treats as nothing (fresh birth overwrites it) — where log-without-
  // state is a torn genesis nothing can replay
  if (d.enginePersisted === 0 && fresh.length > 0 && state !== d.bridgeSerialized) {
    await persistence.writeBridgeState(d.id, state);
    d.bridgeSerialized = state;
  }
  if (fresh.length > 0) {
    await persistence.appendEngineLog(d.id, fresh);
    // measured from what was actually written, never from the live array
    // (finding 4): a judgment landing during the await must not be skipped
    d.enginePersisted += fresh.length;
  }
  if (state !== d.bridgeSerialized) {
    await persistence.writeBridgeState(d.id, state);
    d.bridgeSerialized = state;
  }
}
