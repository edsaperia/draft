import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Session } from '../src/session.js';
import type { LogEntry } from '../src/types.js';

/**
 * **A log written before v0.141 folds exactly as it did** (Q1534 → why:
 * R-141). `golden/pre-q1534.json` was written by the engine as it stood on
 * main at 5bc65518, before rivals stayed in the race: a rival covering the
 * winner, stranded (`rebase-failed`), and a setting race's rival pair locked
 * by a new standing. Replay folds recorded events and never re-runs the
 * command path that now decides between the three roads, so the old log must
 * come back to the same hash, the same states and the same judgments — the
 * stranded rival still stranded, its votes still void. What the fixture's
 * engine computed is stored beside the log, and this compares against it.
 */
const fixture = JSON.parse(readFileSync(
  fileURLToPath(new URL('./golden/pre-q1534.json', import.meta.url)), 'utf8')) as {
  log: LogEntry[];
  summary: { hash: string; states: Record<string, string>; judgments: unknown[];
    document: string; types: string[]; ids: Record<string, string> };
};

describe('a pre-v0.141 engine log replays unedited (R-141)', () => {
  it('folds to the hash, states, judgments and text it was written with', () => {
    const s = Session.replay(fixture.log);
    expect(s.rollingHash()).toBe(fixture.summary.hash);
    expect(Object.fromEntries(s.allCandidates().map((c) => [c.id, c.state])))
      .toEqual(fixture.summary.states);
    expect(s.judgments()).toEqual(fixture.summary.judgments);
    expect(s.document()).toBe(fixture.summary.document);
    // and it holds the old road, not the new one
    expect(fixture.summary.types).toContain('rebase-failed');
    expect(fixture.summary.types).not.toContain('candidate-reaimed');
    expect(s.getCandidate(fixture.summary.ids.B!).state).toBe('rebase-pending');
  });

  it('the rival it stranded covered the winner exactly — the case today’s engine re-aims', () => {
    // so the fixture really is the case the ruling changed, and its replay
    // holding is the old road surviving a log written down before the new one
    const events = fixture.log.map((e) => e.event);
    const adopted = events.find((e) => e.type === 'adopted')!;
    const failed = events.find((e) => e.type === 'rebase-failed')!;
    const s = Session.replay(fixture.log);
    const winner = s.getCandidate(adopted.type === 'adopted' ? adopted.candidateId : '');
    const rival = s.getCandidate(failed.type === 'rebase-failed' ? failed.id : '');
    expect(rival.footprint).toEqual(winner.footprint);
  });
});
