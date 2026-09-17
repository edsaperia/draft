import { describe, expect, it } from 'vitest';
import { adoptionThreshold } from '../src/adoption-threshold.js';
import { Session, makeConstitution } from '../src/session.js';

const HOUR = 3600_000;
// **The ramp is pinned flat by default since v0.128** (Q1362 (b), R-117), so
// the shape tests below state a start and an end of their own: the curve still
// has to be the curve until the deletion pass takes it, and the pinning is
// asserted on its own below.
const constitution = makeConstitution({
  windowStartMs: 0,
  windowEndMs: 10 * HOUR,
  rngSeed: 's',
  adoptionThresholdStart: 0.6,
  adoptionThresholdEnd: 0.95,
});

describe('adoption threshold on the session clock (SPEC §4.3)', () => {
  it('is pinned at ½ by default, and the pin does not move over the window (R-117)', () => {
    const pinned = makeConstitution({ windowStartMs: 0, windowEndMs: 10 * HOUR, rngSeed: 's' });
    expect(pinned.adoptionThresholdStart).toBe(0.5);
    expect(pinned.adoptionThresholdEnd).toBe(0.5);
    for (let h = 0; h <= 12; h++) {
      expect(adoptionThreshold(pinned, h * HOUR)).toBeCloseTo(0.5, 12);
    }
  });

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
    const degenerate = makeConstitution({
      windowStartMs: 5,
      windowEndMs: 5,
      rngSeed: 's',
      adoptionThresholdStart: 0.6,
      adoptionThresholdEnd: 0.95,
    });
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
    expect(s.adoptionFloor()).toBe(1); // no quorum settled: max(1, 0)
    // **and no quorum asks for more than half** (Q1439, R-126): a count of 2
    // in a room of 2 is everybody, which is 🏛️'s rung and not ✏️'s, so it
    // reads as ⌈2/2⌉ = 1 and the floor does not move
    s.amend(1 * HOUR, { quorum: { form: 'count', n: 2 } });
    expect(s.adoptionFloor()).toBe(1);
  });

  /**
   * The engine keeps its **own** copy of §4.2's share arithmetic
   * (`adoptionFloor()`, over its own `eCount()`), so the rounding defect
   * `packages/constitution/test/promise-quorum.test.ts` files lives here
   * too and had to be fixed in both places at once (issue #24). The promise
   * is *the share, rounded up* — ⌈n × E / 100⌉ — and `Math.ceil((n / 100) * E)`
   * gave one more, because most integer shares are not representable in
   * binary and the product lands a hair above the whole number.
   *
   * **The worked case moved with Q1439** (R-126): it used to be 56 % of 25,
   * and no quorum may ask for more than half now, so a share above 50 is
   * refused at validation and the engine would cap it anyway. 28 % of **50**
   * is the case that still bites — 14 by the promise, 15 by the old
   * expression, with the half of 25 above both, so nothing else in the formula
   * masks it. Since v0.133 nothing could: the statistical term that did the
   * masking has gone (Q1439 ruling s, R-131).
   */
  const bigRoom = (size = 50) =>
    Session.open(
      {
        text: 'One line.\n',
        roster: Array.from({ length: size }, (_, i) => ({ id: `p${i + 1}`, handle: `P${i + 1}` })),
        constitution: makeConstitution({ windowStartMs: 0, windowEndMs: 10 * HOUR, rngSeed: 's' }),
      },
      0,
    );

  it('a quorum of 28 % of 50 is 14, and the engine floor holds the room to 14', () => {
    const s = bigRoom();
    s.amend(1 * HOUR, { quorum: { form: 'share', n: 28 } });
    expect(Math.ceil((28 * 50) / 100)).toBe(14); // the promise, in exact arithmetic
    expect(Math.ceil((28 / 100) * 50)).toBe(15); // the old expression, one too many
    expect(s.adoptionFloor()).toBe(14);          // and what it holds them to
  });

  it('at 28 % of 25 the same defect used to be masked by ⌈E/3⌉ — and is not now', () => {
    // Q was wrong by one there too — 8 where the promise is 7 — and the
    // statistical term ⌈25/3⌉ = 9 sat above both readings, so F was 9 either
    // way and the defect only ever reached a race where Q cleared the term.
    // **With the term gone** (v0.133, Q1439 ruling s, R-131) the room's own
    // number is the floor at every size, so the promise is read straight.
    const s = bigRoom(25);
    s.amend(1 * HOUR, { quorum: { form: 'share', n: 28 } });
    expect(Math.ceil((28 / 100) * 25)).toBe(8); // the old expression
    expect(Math.ceil((28 * 25) / 100)).toBe(7); // the promise
    expect(s.adoptionFloor()).toBe(7);
  });

  it('the two copies of the formula agree with each other, and now with the promise', () => {
    // `packages/constitution/src/populations.ts` `quorumCount` computes the
    // same expression over its own E, and `promise-quorum.test.ts` files it
    // there; the engine derives F from the engine's roster and never asks
    // the constitution, so the two had to be corrected in one commit.
    const s = bigRoom();
    s.amend(1 * HOUR, { quorum: { form: 'share', n: 28 } });
    expect(s.adoptionFloor()).toBe(
      Math.max(1, Math.min(Math.ceil((28 * 50) / 100), Math.ceil(50 / 2))));
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
