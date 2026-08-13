import { describe, expect, it } from 'vitest';
import { adoptionThreshold } from '../src/adoption-threshold.js';
import { makeConstitution } from '../src/session.js';

const HOUR = 3600_000;
const constitution = makeConstitution({
  windowStartMs: 0,
  windowEndMs: 10 * HOUR,
  rngSeed: 's',
});

describe('adoption threshold on the session clock (SPEC §4.3)', () => {
  it('starts at the start value when the window opens', () => {
    expect(adoptionThreshold(constitution, 0)).toBeCloseTo(0.6, 12);
    expect(adoptionThreshold(constitution, -HOUR)).toBeCloseTo(0.6, 12);
  });

  it('reaches the end value at the window close and stays there', () => {
    expect(adoptionThreshold(constitution, 10 * HOUR)).toBeCloseTo(0.95, 12);
    expect(adoptionThreshold(constitution, 24 * HOUR)).toBeCloseTo(0.95, 12);
  });

  it('is smooth and monotonic in between, hitting the midpoint halfway', () => {
    let prev = adoptionThreshold(constitution, 0);
    for (let h = 1; h <= 10; h++) {
      const v = adoptionThreshold(constitution, h * HOUR);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    expect(adoptionThreshold(constitution, 5 * HOUR)).toBeCloseTo((0.6 + 0.95) / 2, 12);
  });

  it('never moves on evidence: comparisons are irrelevant to the bar', () => {
    // Same time, same threshold — there is no evidence input at all.
    expect(adoptionThreshold(constitution, 3 * HOUR)).toBe(
      adoptionThreshold(constitution, 3 * HOUR),
    );
  });

  it('degenerate window pins the threshold at the end value', () => {
    const degenerate = makeConstitution({ windowStartMs: 5, windowEndMs: 5, rngSeed: 's' });
    expect(adoptionThreshold(degenerate, 0)).toBeCloseTo(0.95, 12);
  });
});
