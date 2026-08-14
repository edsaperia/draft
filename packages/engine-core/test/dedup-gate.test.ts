import { describe, expect, it } from 'vitest';
import {
  DedupGate,
  levenshtein,
  normalizeForDedup,
  relativeEditDistance,
} from '../src/dedup-gate.js';
import type { EquivalenceVerdict, OracleCandidate, SemanticOracle } from '../src/oracle.js';

const DOC = 'Meetings happen when someone calls one.';

const live: OracleCandidate[] = [
  {
    id: 'c1',
    text: 'Meetings happen on the first Tuesday of each month.',
    rationale: 'A fixed rhythm beats ad-hoc scheduling.',
  },
  {
    id: 'c2',
    text: 'Meetings require a week of notice.',
    rationale: 'Notice protects occasional members.',
  },
];

/** Inline deterministic oracle stub (the interface is pure engine-core). */
function stubOracle(
  answer: EquivalenceVerdict | (() => EquivalenceVerdict),
): SemanticOracle & { calls: number } {
  return {
    calls: 0,
    async checkEquivalence() {
      this.calls++;
      return typeof answer === 'function' ? answer() : answer;
    },
  };
}

describe('levenshtein / normalization primitives', () => {
  it('computes classic distances', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
    expect(levenshtein('same', 'same')).toBe(0);
  });

  it('normalizes case and whitespace', () => {
    expect(normalizeForDedup('  Meetings\t happen \n MONTHLY. ')).toBe(
      'meetings happen monthly.',
    );
  });

  it('relative distance is 0 for two empty strings', () => {
    expect(relativeEditDistance('', '')).toBe(0);
  });
});

describe('dedup-gate pipeline', () => {
  it('flags an exact text match first, via "exact"', async () => {
    const gate = new DedupGate();
    const verdict = await gate.check(live[0]!.text, live, DOC);
    expect(verdict).toEqual({
      kind: 'duplicate',
      of: 'c1',
      via: 'exact',
      reason: 'identical text',
    });
  });

  it('flags a case/whitespace variant via "edit-distance" (distance 0 after normalization)', async () => {
    const gate = new DedupGate();
    const verdict = await gate.check(
      '  meetings happen on the first  Tuesday of each month.',
      live,
      DOC,
    );
    expect(verdict.kind).toBe('duplicate');
    if (verdict.kind === 'duplicate') {
      expect(verdict.of).toBe('c1');
      expect(verdict.via).toBe('edit-distance');
    }
  });

  it('flags a near-identical rewrite within the 0.15 relative threshold', async () => {
    const gate = new DedupGate();
    // "each" → "every": 4 edits over a ~52-char line ≈ 0.08.
    const verdict = await gate.check(
      'Meetings happen on the first Tuesday of every month.',
      live,
      DOC,
    );
    expect(verdict.kind).toBe('duplicate');
    if (verdict.kind === 'duplicate') {
      expect(verdict.of).toBe('c1');
      expect(verdict.via).toBe('edit-distance');
    }
  });

  it('passes a genuinely different clause as fresh (no oracle)', async () => {
    const gate = new DedupGate();
    const verdict = await gate.check(
      'Meetings are abolished; decisions happen in the group chat.',
      live,
      DOC,
    );
    expect(verdict).toEqual({ kind: 'fresh' });
  });

  it('is fresh against an empty live set, without consulting the oracle', async () => {
    const oracle = stubOracle({ duplicateOf: 'c1', confidence: 1, reason: 'x' });
    const gate = new DedupGate(oracle);
    expect(await gate.check('anything', [], DOC)).toEqual({ kind: 'fresh' });
    expect(oracle.calls).toBe(0);
  });

  it('consults the oracle only after the free stages pass', async () => {
    const oracle = stubOracle({ duplicateOf: null, confidence: 0, reason: 'no' });
    const gate = new DedupGate(oracle);
    await gate.check(live[0]!.text, live, DOC); // exact hit: no oracle call
    expect(oracle.calls).toBe(0);
    await gate.check('An entirely unrelated sentence about squirrels.', live, DOC);
    expect(oracle.calls).toBe(1);
  });

  it('accepts a confident oracle duplicate verdict, via "oracle"', async () => {
    const oracle = stubOracle({
      duplicateOf: 'c2',
      confidence: 0.9,
      reason: 'both require advance notice for meetings',
    });
    const gate = new DedupGate(oracle);
    const verdict = await gate.check(
      'No meeting may be held without seven days of warning.',
      live,
      DOC,
    );
    expect(verdict).toEqual({
      kind: 'duplicate',
      of: 'c2',
      via: 'oracle',
      reason: 'both require advance notice for meetings',
    });
  });

  it('ignores an oracle verdict below the confidence floor', async () => {
    const oracle = stubOracle({ duplicateOf: 'c2', confidence: 0.3, reason: 'maybe' });
    const gate = new DedupGate(oracle);
    const verdict = await gate.check('Meetings need warning, seven days.', live, DOC);
    expect(verdict).toEqual({ kind: 'fresh' });
  });

  it('ignores an oracle verdict naming a candidate that does not exist', async () => {
    const oracle = stubOracle({ duplicateOf: 'c99', confidence: 1, reason: 'hallucinated' });
    const gate = new DedupGate(oracle);
    const verdict = await gate.check('Meetings need warning, seven days.', live, DOC);
    expect(verdict).toEqual({ kind: 'fresh' });
  });

  it('oracle errors degrade to fresh: a failure never blocks a submission', async () => {
    const oracle = stubOracle(() => {
      throw new Error('transport down');
    });
    const gate = new DedupGate(oracle);
    const verdict = await gate.check('Meetings need warning, seven days.', live, DOC);
    expect(verdict).toEqual({ kind: 'fresh' });
    expect(oracle.calls).toBe(1);
  });

  it('honours a custom edit-distance threshold', async () => {
    const strict = new DedupGate(undefined, { editDistanceThreshold: 0.01 });
    const verdict = await strict.check(
      'Meetings happen on the first Tuesday of every month.',
      live,
      DOC,
    );
    expect(verdict).toEqual({ kind: 'fresh' }); // 0.08 > 0.01: fresh under the strict gate
  });
});
