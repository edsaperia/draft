/**
 * Q1332 (Ed, 2026-09-11: *stamp at the fold*): a command's time is taken
 * when it folds and is never earlier than the last event of either of the
 * document's logs. Past the moon room's knee a judgment stamped at the
 * request's receipt was refused by the engine log after a fresher one had
 * folded first; the constitution log alone was guarded, the engine's was not.
 */
import { describe, expect, it } from 'vitest';
import { foldTime } from '../src/engine-host.js';
import type { LoadedDoc } from '../src/store.js';

const docWith = (csLast: number | null, engineLast: number | null): LoadedDoc => {
  const cs = { logEntries: () => (csLast === null ? [] : [{ event: { t: csLast } }]) };
  const bridge = engineLast === null ? null
    : { engine: { log: [{ event: { t: engineLast } }] } };
  return { cs, bridge } as unknown as LoadedDoc;
};

describe('foldTime (Q1332): the fold\'s clock, never behind either log', () => {
  it('is the clock when both logs are behind it', () => {
    expect(foldTime(docWith(10, 20), 30)).toBe(30);
  });
  it('is the constitution log\'s last event when the clock fell behind it', () => {
    expect(foldTime(docWith(50, null), 30)).toBe(50);
  });
  it('is the engine log\'s last event when that is the latest — the moon room\'s refusal', () => {
    // a judgment received at 30 waited behind a fresher one folded at 45
    expect(foldTime(docWith(10, 45), 30)).toBe(45);
  });
  it('reads the clock itself when no time is handed in', () => {
    const before = Date.now();
    const t = foldTime(docWith(0, 0));
    expect(t).toBeGreaterThanOrEqual(before);
  });
  it('tolerates a document with no engine and empty logs', () => {
    expect(foldTime(docWith(null, null), 7)).toBe(7);
  });
});
