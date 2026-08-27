/**
 * **One floor formula, implemented twice, with nothing asserting they agree**
 * (entry 77, the alpha-readiness pass; SPEC §4.2, §8.2).
 *
 * `F = max(Q, min(⌈E/3⌉, F_max))` lives in two places on purpose:
 * `packages/engine-core/src/session.ts`'s `adoptionFloor()`, because the
 * engine must stay dependency-free, and `packages/constitution/src/
 * populations.ts`'s `adoptionFloor` / `quorumCount`, because the room needs
 * the number without a Session — `view.ts` prints it, and `adapter.ts` hands
 * the closure to a host. The duplication is deliberate and stays; what was
 * missing is the thing that makes deliberate duplication safe.
 *
 * The failure this is aimed at is silent by construction. A drift in either
 * copy — a `>` for a `>=`, a `round` for a `ceil`, a share read as a
 * fraction rather than a percentage — leaves both packages' suites green,
 * because each tests its own arithmetic against its own expectation. What
 * the room would see is an adoption that cleared the floor the page printed
 * and not the floor the engine applied, or the reverse: a proposal with
 * enough distinct movers on screen that never adopts.
 *
 * Two further gaps the grid closes, both named by the pass:
 *
 * - `adoptionFloorMax` is **never varied in any engine-core test**, so the
 *   `min(⌈E/3⌉, F_max)` clamp had no engine-side exercise at all. Here it
 *   runs at 0, 1, 3 and the shipped 12, either side of ⌈E/3⌉.
 * - The engine's own E and the constitution's are different functions over
 *   different records (`!removed && !suspended` there, `arrived && !removed
 *   && !lapsed` here). This file feeds both the same E deliberately: the
 *   claim under test is that *given the same E* the two produce the same
 *   number. Whether they compute the same E is the bridge's business, and
 *   `bridge.test.ts` is where that lives.
 */
import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../../engine-core/src/index.js';
import type { QuorumValue } from '../src/values.js';
import { adoptionFloor, adoptionFloorTerm, quorumCount } from '../src/populations.js';

const HOUR = 3_600_000;

/** An engine session with exactly E in its roster, and nothing else going on. */
function engineFloor(E: number, quorum: QuorumValue | null, fMax: number): number {
  const s = Session.open({
    text: 'One line.\n',
    roster: Array.from({ length: E }, (_, i) => ({ id: `p${i + 1}`, handle: `P${i + 1}` })),
    constitution: makeConstitution({
      windowStartMs: 0,
      windowEndMs: 10 * HOUR,
      rngSeed: 'floor-agreement',
      adoptionFloorMax: fMax,
      quorum,
    }),
  }, 0);
  return s.adoptionFloor();
}

describe('the adoption floor: the engine and the constitution agree (§4.2)', () => {
  // E past 12 as well, so ⌈E/3⌉ climbs above the shipped F_max of 12 and the
  // clamp is the thing being read rather than a no-op.
  // E = 0 is absent because the engine has no such session — `Session.open`
  // refuses an empty roster — where the constitution's is a pure function
  // and answers 0. That is not a disagreement, it is a difference of domain,
  // and it is asserted separately below.
  const Es = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 20, 36, 40];
  const fMaxes = [0, 1, 3, 12];
  const quorums: Array<QuorumValue | null> = [
    null,
    ...[0, 1, 2, 3, 5, 8, 10].map((n) => ({ form: 'count' as const, n })),
    ...[0, 10, 25, 33, 50, 60, 100].map((n) => ({ form: 'share' as const, n })),
  ];

  it('every (E, Q, F_max) in the grid gives the same number on both sides', () => {
    let checked = 0;
    for (const E of Es) {
      for (const fMax of fMaxes) {
        for (const q of quorums) {
          const mine = adoptionFloor(q === null ? 0 : quorumCount(q, E), E, fMax);
          expect(engineFloor(E, q, fMax), `E=${E} fMax=${fMax} q=${JSON.stringify(q)}`)
            .toBe(mine);
          checked += 1;
        }
      }
    }
    // the grid is the assertion; this only says it ran
    expect(checked).toBe(Es.length * fMaxes.length * quorums.length);
  });

  it('E = 0 is the constitution\'s alone: the engine has no such session', () => {
    expect(adoptionFloor(0, 0, 12)).toBe(0);
    expect(() => engineFloor(0, null, 12)).toThrow(/roster must not be empty/);
  });

  it('the clamp is live on both sides: F_max caps the statistical term', () => {
    // E = 40 puts ⌈E/3⌉ at 14, above the shipped 12, so the two answers
    // differ by the clamp alone and a missing `min` would show here.
    expect(adoptionFloorTerm(40)).toBe(14);
    expect(engineFloor(40, null, 12)).toBe(12);
    expect(engineFloor(40, null, 99)).toBe(14);
    expect(adoptionFloor(0, 40, 12)).toBe(12);
    expect(adoptionFloor(0, 40, 99)).toBe(14);
  });

  it('quorum raises the floor and the clamp never lowers it below quorum', () => {
    // §4.2: the max is outside the min, so a quorum above F_max still binds
    expect(engineFloor(9, { form: 'count', n: 8 }, 1)).toBe(8);
    expect(adoptionFloor(8, 9, 1)).toBe(8);
  });

  it('a share quorum tracks E identically on both sides', () => {
    for (const E of [1, 3, 4, 7, 9, 10]) {
      const q: QuorumValue = { form: 'share', n: 60 };
      expect(quorumCount(q, E)).toBe(Math.ceil(0.6 * E));
      expect(engineFloor(E, q, 12)).toBe(adoptionFloor(quorumCount(q, E), E, 12));
    }
  });

  it('no quorum at all reads as 0 on both sides, not as "no floor"', () => {
    // the engine takes `quorum: null` as Q = 0; the constitution has no null
    // to take, so the caller passes 0 — the two must not disagree about
    // whether an absent quorum removes the statistical floor as well
    for (const E of [3, 6, 9]) {
      expect(engineFloor(E, null, 12)).toBe(adoptionFloorTerm(E));
      expect(adoptionFloor(0, E, 12)).toBe(adoptionFloorTerm(E));
    }
  });
});
