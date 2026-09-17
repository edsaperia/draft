/**
 * **One floor formula, implemented twice, with nothing asserting they agree**
 * (entry 77, the alpha-readiness pass; SPEC §4.2, §8.2).
 *
 * `F = max(1, Q′)` — `max(Q, min(⌈E/3⌉, F_max))` until v0.133 (Q1439 ruling s,
 * R-131) — lives in two places on purpose:
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
 * - `adoptionFloorMax` was **never varied in any engine-core test**, so the
 *   `min(⌈E/3⌉, F_max)` clamp had no engine-side exercise at all. Here it
 *   runs at 0, 1, 3 and the shipped 12 — and **since v0.133 what the grid
 *   asserts is that the number changes nothing**, the term it clamped having
 *   gone (Q1439 ruling s, R-131). The field stays for the logs that carry it.
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
  // E past 12 as well: where ⌈E/3⌉ used to climb above the shipped F_max and
  // the clamp was the thing being read, the claim now is that neither number
  // is read at all and the two copies still land on the same answer.
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
          const mine = adoptionFloor(q === null ? 0 : quorumCount(q, E), E);
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
    // one, not zero, since v0.133: `max(1, Q′)` is arithmetic, and a floor of
    // zero would let a race with nothing behind it carry
    expect(adoptionFloor(0, 0)).toBe(1);
    expect(() => engineFloor(0, null, 12)).toThrow(/roster must not be empty/);
  });

  it('the clamp is dead on both sides: F_max caps nothing (Q1439 ruling s)', () => {
    // E = 40 put ⌈E/3⌉ at 14, above the shipped 12, and the two answers used
    // to differ by the clamp alone. The term has gone (R-131, reversing
    // R-073), so a room of forty that asked for nothing reads 1 whatever
    // `adoptionFloorMax` says, on both sides — and `adoptionFloorTerm` itself
    // survives only because `floor-recomputed` records it.
    expect(adoptionFloorTerm(40)).toBe(14);
    for (const fMax of [0, 1, 12, 99]) {
      expect(engineFloor(40, null, fMax), `fMax ${fMax}`).toBe(1);
    }
    expect(adoptionFloor(0, 40)).toBe(1);
  });

  it('the room’s number is the whole floor, and the cap is the only thing over it', () => {
    // **Up to half** (Q1439, R-126): a count of 8 in a room of 9 is read as
    // ⌈9/2⌉ = 5. F_max of 1 no longer enters anywhere, which is the point.
    expect(engineFloor(9, { form: 'count', n: 8 }, 1)).toBe(5);
    expect(adoptionFloor(8, 9)).toBe(5);
    // and under the cap nothing moved: a count of 4 in a room of 9 is 4
    expect(engineFloor(9, { form: 'count', n: 4 }, 1)).toBe(4);
    expect(adoptionFloor(4, 9)).toBe(4);
    // a count of 1 is 1, where ⌈9/3⌉ = 3 used to hold it up
    expect(engineFloor(9, { form: 'count', n: 1 }, 12)).toBe(1);
    expect(adoptionFloor(1, 9)).toBe(1);
  });

  it('no quorum may ask for more than half, on either side (Q1439, R-126)', () => {
    // the count form is the only one that can reach the cap from the surface:
    // a share above 50 is refused at validation (`values.ts`)
    for (const E of [1, 2, 5, 8, 25]) {
      const half = Math.ceil(E / 2);
      expect(adoptionFloor(999, E)).toBe(half);
      expect(engineFloor(E, { form: 'count', n: 999 }, 12)).toBe(adoptionFloor(999, E));
    }
  });

  it('a share quorum tracks E identically on both sides', () => {
    for (const E of [1, 3, 4, 7, 9, 10]) {
      const q: QuorumValue = { form: 'share', n: 40 };
      expect(quorumCount(q, E)).toBe(Math.ceil((40 * E) / 100));
      expect(engineFloor(E, q, 12)).toBe(adoptionFloor(quorumCount(q, E), E));
    }
  });

  it('no quorum at all reads as 1 on both sides, and no longer as ⌈E/3⌉', () => {
    // the engine takes `quorum: null` as Q′ = 0; the constitution has no null
    // to take, so the caller passes 0 — and with the statistical term gone
    // (Q1439 ruling s, R-131) an absent quorum leaves the arithmetic minimum
    // and nothing else. §9.0a will not let a document begin without one.
    for (const E of [3, 6, 9]) {
      expect(engineFloor(E, null, 12)).toBe(1);
      expect(adoptionFloor(0, E)).toBe(1);
    }
  });
});
