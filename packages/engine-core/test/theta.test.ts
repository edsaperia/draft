import { describe, expect, it } from 'vitest';
import { theta } from '../src/theta.js';
import { makeConstitution } from '../src/session.js';

const constitution = makeConstitution(
  { windowStartMs: 0, windowEndMs: 1000_000, rngSeed: 's', evidenceHorizon: 100 },
  5,
);

describe('theta ramp (SPEC §4.3)', () => {
  it('starts at thetaStart with zero evidence', () => {
    expect(theta(constitution, 0)).toBeCloseTo(0.6, 12);
  });

  it('reaches thetaEnd at the evidence horizon and stays there', () => {
    expect(theta(constitution, 100)).toBeCloseTo(0.95, 12);
    expect(theta(constitution, 100_000)).toBeCloseTo(0.95, 12);
  });

  it('is smooth and monotonic in between', () => {
    let prev = theta(constitution, 0);
    for (let n = 1; n <= 100; n++) {
      const t = theta(constitution, n);
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
    expect(theta(constitution, 50)).toBeCloseTo((0.6 + 0.95) / 2, 12);
  });

  it('never moves on wall clock: same evidence, same theta', () => {
    expect(theta(constitution, 42)).toBe(theta(constitution, 42));
  });
});
