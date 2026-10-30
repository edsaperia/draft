import { describe, expect, it, vi } from 'vitest';
import { persistEngine } from '../src/engine-host.js';
import type { EngineDoc } from '../src/engine-host.js';
import type { Persistence } from '../src/persistence.js';

/** The host's cursors must describe exactly what the store has committed. */
function fixture(atomic: boolean) {
  const state = { csCursor: 2, motionCandidates: [] };
  const log = [0, 1].map((seq) => ({ seq, hash: `h${seq}`, prevHash: seq ? 'h0' : '', event: { t: seq } }));
  const doc = { id: 'd1', bridge: { engine: { log }, state: () => state },
    enginePersisted: 1, bridgeSerialized: '{"csCursor":1}' } as unknown as EngineDoc;
  const appendEngineLog = vi.fn(async (_id: string, _entries: readonly unknown[], _state?: string) => {});
  const writeBridgeState = vi.fn(async (_id: string, _state: string) => {});
  const persistence = { engineLogAndStateAtomic: atomic, appendEngineLog, writeBridgeState } as unknown as Persistence;
  return { doc, state, log, persistence, appendEngineLog, writeBridgeState };
}

describe('engine saves and their bridge state (issue #28)', () => {
  it('commits an atomic store append with its bridge state, and moves both cursors together', async () => {
    const f = fixture(true);
    await persistEngine(f.persistence, f.doc);
    expect(f.appendEngineLog).toHaveBeenCalledWith('d1', [f.log[1]], JSON.stringify(f.state));
    expect(f.writeBridgeState).not.toHaveBeenCalled();
    expect(f.doc.enginePersisted).toBe(2);
    expect(f.doc.bridgeSerialized).toBe(JSON.stringify(f.state));
  });

  it('a rejected atomic save moves neither cursor; retry commits the same entries and state', async () => {
    const f = fixture(true);
    f.appendEngineLog.mockRejectedValueOnce(new Error('transaction rolled back'));
    await expect(persistEngine(f.persistence, f.doc)).rejects.toThrow('transaction rolled back');
    expect(f.doc.enginePersisted).toBe(1);
    expect(f.doc.bridgeSerialized).toBe('{"csCursor":1}');
    await persistEngine(f.persistence, f.doc);
    expect(f.appendEngineLog).toHaveBeenLastCalledWith('d1', [f.log[1]], JSON.stringify(f.state));
    expect(f.doc.enginePersisted).toBe(2);
  });

  it('the first atomic save has no separate pre-write that could survive a rollback', async () => {
    const f = fixture(true);
    f.doc.enginePersisted = 0;
    f.doc.bridgeSerialized = null;
    f.appendEngineLog.mockRejectedValueOnce(new Error('transaction rolled back'));
    await expect(persistEngine(f.persistence, f.doc)).rejects.toThrow();
    expect(f.writeBridgeState).not.toHaveBeenCalled();
    expect(f.doc.enginePersisted).toBe(0);
    expect(f.doc.bridgeSerialized).toBeNull();
  });

  it('a non-atomic store keeps its appended cursor when its trailing state write fails', async () => {
    const f = fixture(false);
    f.writeBridgeState.mockRejectedValueOnce(new Error('rename failed'));
    await expect(persistEngine(f.persistence, f.doc)).rejects.toThrow('rename failed');
    expect(f.doc.enginePersisted).toBe(2);
    expect(f.doc.bridgeSerialized).toBe('{"csCursor":1}');
    await persistEngine(f.persistence, f.doc);
    expect(f.appendEngineLog).toHaveBeenCalledTimes(1);
    expect(f.doc.bridgeSerialized).toBe(JSON.stringify(f.state));
  });

  it('a non-atomic first save still writes state before any log entry', async () => {
    const f = fixture(false);
    f.doc.enginePersisted = 0;
    f.doc.bridgeSerialized = null;
    f.writeBridgeState.mockRejectedValueOnce(new Error('pre-write failed'));
    await expect(persistEngine(f.persistence, f.doc)).rejects.toThrow('pre-write failed');
    expect(f.appendEngineLog).not.toHaveBeenCalled();
    expect(f.doc.enginePersisted).toBe(0);
  });

  it('a state-only change is saved even without new engine entries', async () => {
    const f = fixture(true);
    f.doc.enginePersisted = f.log.length;
    await persistEngine(f.persistence, f.doc);
    expect(f.appendEngineLog).not.toHaveBeenCalled();
    expect(f.writeBridgeState).toHaveBeenCalledWith('d1', JSON.stringify(f.state));
  });
});
