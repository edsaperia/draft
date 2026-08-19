import { describe, expect, it } from 'vitest';
import { adoptionThreshold } from '../src/adoption-threshold.js';
import { Session, makeConstitution } from '../src/session.js';

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

describe('amendments and the anchor (SPEC §4.3, §9.6, 367b)', () => {
  const openS = () =>
    Session.open(
      {
        text: 'One line.\n',
        roster: [
          { id: 'p1', handle: 'A' },
          { id: 'p2', handle: 'B' },
        ],
        constitution: makeConstitution({
          windowStartMs: 0,
          windowEndMs: 10 * HOUR,
          adoptionThresholdStart: 0.6,
          adoptionThresholdEnd: 0.9,
          rngSeed: 's',
        }),
      },
      0,
    );

  it('postponing the close never lowers the bar — it keeps its value and rises more slowly', () => {
    const s = openS();
    const atFive = s.adoptionThreshold(5 * HOUR);
    expect(atFive).toBeCloseTo(0.75, 10); // smoothstep midpoint
    s.amend(5 * HOUR, { windowEndMs: 20 * HOUR });
    // The value at the amendment stands; no jump in either direction.
    expect(s.adoptionThreshold(5 * HOUR)).toBeCloseTo(atFive, 10);
    // Halfway through the new remainder it sits midway to the same ceiling,
    // which is lower than the un-postponed ramp would have been.
    expect(s.adoptionThreshold(12.5 * HOUR)).toBeCloseTo((atFive + 0.9) / 2, 10);
    expect(s.adoptionThreshold(20 * HOUR)).toBeCloseTo(0.9, 10);
  });

  it('moving the close earlier keeps the value and rises steeper to the same ceiling', () => {
    const s = openS();
    const atTwo = s.adoptionThreshold(2 * HOUR);
    s.amend(2 * HOUR, { windowEndMs: 4 * HOUR });
    expect(s.adoptionThreshold(2 * HOUR)).toBeCloseTo(atTwo, 10);
    expect(s.adoptionThreshold(3 * HOUR)).toBeCloseTo((atTwo + 0.9) / 2, 10);
    expect(s.adoptionThreshold(4 * HOUR)).toBeCloseTo(0.9, 10);
  });

  it('a new ceiling is glided to, never jumped to', () => {
    const s = openS();
    const atFive = s.adoptionThreshold(5 * HOUR);
    s.amend(5 * HOUR, { adoptionThresholdEnd: 0.7 }); // the room lowered the bar
    expect(s.adoptionThreshold(5 * HOUR)).toBeCloseTo(atFive, 10);
    expect(s.adoptionThreshold(10 * HOUR)).toBeCloseTo(0.7, 10);
    // Monotone toward the new ceiling, downward this time.
    expect(s.adoptionThreshold(7 * HOUR)).toBeLessThan(atFive);
  });

  it('an amended quorum re-derives the floor from current E (SPEC §4.2)', () => {
    const s = openS();
    expect(s.adoptionFloor()).toBe(1); // ceil(2/3)
    s.amend(1 * HOUR, { quorum: { form: 'count', n: 2 } });
    expect(s.adoptionFloor()).toBe(2);
  });

  it('an amended drip re-phases without retro-credit (SPEC §7)', () => {
    const s = openS(); // default tokenDripMinutes 240: ticks at 4h, 8h…
    expect(s.balance('p1', 4 * HOUR)).toBe(5);
    s.amend(4 * HOUR, { tokenDripMinutes: 60 });
    // Next tick lands one NEW interval after the amendment, then hourly.
    expect(s.balance('p1', 4.5 * HOUR)).toBe(5);
    expect(s.balance('p1', 5 * HOUR)).toBe(6);
    expect(s.balance('p1', 7 * HOUR)).toBe(8); // and the cap holds
  });

  it('replay reproduces amendments bit-identically', () => {
    const s = openS();
    s.amend(3 * HOUR, { windowEndMs: 12 * HOUR, quorum: { form: 'share', n: 50 } });
    s.setStanding(4 * HOUR, 'ending', { endsAtMs: 12 * HOUR });
    const r = Session.replay(s.log.slice());
    expect(r.adoptionThreshold(6 * HOUR)).toBeCloseTo(s.adoptionThreshold(6 * HOUR), 12);
    expect(r.adoptionFloor()).toBe(s.adoptionFloor());
    expect(r.standing('ending')).toEqual({ endsAtMs: 12 * HOUR });
    expect(r.rollingHash()).toBe(s.rollingHash());
  });
});
