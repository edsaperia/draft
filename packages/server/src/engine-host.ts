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

/** Resume a persisted bridge; called once per document at load. */
export async function resumeBridge(persistence: Persistence, doc: LoadedDoc): Promise<void> {
  const d = asEngineDoc(doc);
  if (d.bridge !== null) return;
  const log = await persistence.readEngineLog(doc.id) as EngineLogEntry[];
  if (log.length === 0) return;
  const raw = await persistence.readBridgeState(doc.id);
  if (raw === null) return;
  const state = JSON.parse(raw) as BridgeState;
  d.bridge = new EngineBridge(doc.cs, {
    t: doc.cs.constitutedAtT!, rngSeed: doc.id,
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
  if (doc.cs.constitutedAtT === null) return;
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
  if (fresh.length > 0) {
    await persistence.appendEngineLog(d.id, fresh);
    d.enginePersisted = log.length;
  }
  const state = JSON.stringify(d.bridge.state());
  if (state !== d.bridgeSerialized) {
    await persistence.writeBridgeState(d.id, state);
    d.bridgeSerialized = state;
  }
}
