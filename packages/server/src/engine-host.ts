/**
 * The engine at the server (Q391): a constituted document gets an
 * engine-core Session through the EngineBridge, so ordinary set-motions
 * race for real — stake, rivals in one race, adoption at the bar, the
 * verdict through the adjudication seam, the new standing back as ground.
 *
 * Persistence follows the document's own pattern: the engine's
 * hash-chained log appends to engine.jsonl beside log.jsonl, and the one
 * thing neither log holds — the motion ↔ candidate pairing and the
 * bridge's cs-log cursor — is bridge.json, rewritten whole. Loading is
 * replay on both logs.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EngineBridge } from '../../constitution/src/engine-bridge.js';
import type { BridgeState } from '../../constitution/src/engine-bridge.js';
import { DEFAULT_TUNING } from '../../constitution/src/adapter.js';
import type { EngineTuning } from '../../constitution/src/adapter.js';
import type { LoadedDoc } from './store.js';

interface EngineLogEntry { seq: number; hash: string; prevHash: string; event: { t: number } }

export interface EngineDoc extends LoadedDoc {
  bridge: EngineBridge | null;
  enginePersisted: number;
}

const enginePath = (docsDir: string, id: string) => join(docsDir, id, 'engine.jsonl');
const bridgePath = (docsDir: string, id: string) => join(docsDir, id, 'bridge.json');

export function asEngineDoc(doc: LoadedDoc): EngineDoc {
  const d = doc as EngineDoc;
  if (d.bridge === undefined) { d.bridge = null; d.enginePersisted = 0; }
  return d;
}

/** Resume a persisted bridge; called once per document at load. */
export function resumeBridge(docsDir: string, doc: LoadedDoc): void {
  const d = asEngineDoc(doc);
  const ep = enginePath(docsDir, doc.id);
  if (d.bridge !== null || !existsSync(ep)) return;
  const log = readFileSync(ep, 'utf8').split('\n').filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as EngineLogEntry);
  const state = JSON.parse(readFileSync(bridgePath(docsDir, doc.id), 'utf8')) as BridgeState;
  d.bridge = new EngineBridge(doc.cs, {
    t: doc.cs.constitutedAtT!, rngSeed: doc.id,
    resume: { log: log as never, ...state },
  });
  d.enginePersisted = log.length;
}

/**
 * Keep the bridge abreast of the document: born the moment the
 * constitution settles, synced after every command (roster truth and
 * ground shifts, §9.6/Q328), closed when a windowed document's ending
 * passes (the races' close, §4).
 */
export function driveBridge(docsDir: string, doc: LoadedDoc, t: number,
  tuning?: Partial<EngineTuning>): void {
  const d = asEngineDoc(doc);
  if (doc.cs.constitutedAtT === null) return;
  if (d.bridge === null) {
    d.bridge = new EngineBridge(doc.cs, { t, rngSeed: doc.id,
      ...(tuning ? { tuning: { ...DEFAULT_TUNING, ...tuning } } : {}) });
    d.enginePersisted = 0;
  } else if (!d.bridge.engine.closed) {
    d.bridge.sync(t);
  }
  const ending = doc.cs.settingState('ending').value as { endsAtMs: number | null } | null;
  if (ending !== null && ending.endsAtMs !== null && t >= ending.endsAtMs &&
      !d.bridge.engine.closed) {
    d.bridge.close(t);
  }
  persistEngine(docsDir, d);
}

function persistEngine(docsDir: string, d: EngineDoc): void {
  if (d.bridge === null) return;
  const log = d.bridge.engine.log as unknown as EngineLogEntry[];
  const fresh = log.slice(d.enginePersisted);
  if (fresh.length > 0) {
    appendFileSync(enginePath(docsDir, d.id),
      fresh.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');
    d.enginePersisted = log.length;
  }
  writeFileSync(bridgePath(docsDir, d.id),
    JSON.stringify(d.bridge.state()), 'utf8');
}
