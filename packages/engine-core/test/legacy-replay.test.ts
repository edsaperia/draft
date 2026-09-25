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

/**
 * **A log written before v0.142 folds exactly as it did** (Q1538, Q1539 →
 * why: R-142, R-143). `golden/pre-q1538.json` was written by the engine on
 * main at b3f3ec4e (`make-pre-q1538.ts` beside it): a leader adopted on its
 * floor with its rival pair never asked — the adoption v0.142 would hold
 * back. The wait, the Smith set and the meter are derived, never folded, so
 * the old adoption replays as it was recorded.
 */
const pre1538 = JSON.parse(readFileSync(
  fileURLToPath(new URL('./golden/pre-q1538.json', import.meta.url)), 'utf8')) as typeof fixture;

describe('a pre-v0.142 engine log replays unedited (R-142, R-143)', () => {
  it('folds to the hash, states, judgments and text it was written with', () => {
    const s = Session.replay(pre1538.log);
    expect(s.rollingHash()).toBe(pre1538.summary.hash);
    expect(Object.fromEntries(s.allCandidates().map((c) => [c.id, c.state])))
      .toEqual(pre1538.summary.states);
    expect(s.judgments()).toEqual(pre1538.summary.judgments);
    expect(s.document()).toBe(pre1538.summary.document);
    expect(s.getCandidate(pre1538.summary.ids.X!).state).toBe('adopted');
  });

  it('the adoption it holds was made with the rival pair unasked', () => {
    const { X, Y } = pre1538.summary.ids;
    const rivalPair = pre1538.log.filter((e) => e.event.type === 'comparison' &&
      [e.event.aId, e.event.bId].includes(X!) && [e.event.aId, e.event.bId].includes(Y!));
    expect(rivalPair).toEqual([]);
    expect(pre1538.summary.types).toContain('adopted');
  });
});
