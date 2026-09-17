/**
 * The populations (SPEC §8.2, §9.5: one E, two uses). Each is one named
 * function so Ed's ruling stays one-line-changeable: E is the arrived,
 * non-removed, non-lapsed membership; quorum's share form is ⌈share × E⌉;
 * the adoption-floor term is ⌈E/3⌉. **E is the only base** (v0.99, R-088):
 * the electorate of a running constitutional motion, and of a founding
 * question, is E evaluated live. Invited-but-not-arrived count nowhere.
 */

import type { MemberState } from './types.js';
import type { QuorumValue } from './values.js';

/** A member of E: arrived, not removed, not lapsed (§8.2). Fold state is
 *  enough — nothing here reads who the person is. */
export function inE(m: MemberState): boolean {
  return m.arrivedAtT !== null && !m.removed && !m.lapsed;
}

export function eOf<M extends MemberState>(members: Iterable<M>): M[] {
  return [...members].filter(inE);
}

/**
 * The electorate of a running constitutional motion, and of a founding
 * question (§9.0a, §9.5, R-088): E, evaluated live — no snapshot, re-checked
 * on every answer and every roster event.
 */
export function motionElectorateOf<M extends MemberState>(members: Iterable<M>): M[] {
  return eOf(members);
}

/**
 * The room's quorum as a count (§4.2): a fixed count, or ⌈share × E⌉ — **the
 * number the room asked for, before the half-the-room cap** (Q1439, R-126),
 * which `adoptionFloor` below applies. The two are separate because the raw
 * number is what the log records (`floor-recomputed`'s `quorumN`) and what a
 * card's own control holds, while the capped one is what a race is held to.
 *
 * **The product before the quotient** (issue #24): `Math.ceil((n / 100) * E)`
 * is not ⌈n·E/100⌉, because `n / 100` is not representable in binary for most
 * integer shares — 28 % of 25 landed a hair above 7 and the room told
 * *7 of 25* was held to 8. Twenty-seven (share, E) pairs read one too many
 * that way, all of them at E ≥ 25. `n * E` is exact for every share the
 * surface can state, so the ceiling is the only rounding left.
 */
export function quorumCount(quorum: QuorumValue, E: number): number {
  return quorum.form === 'count' ? quorum.n : Math.ceil((quorum.n * E) / 100);
}

/** The statistical half of the adoption floor (§4.2, §8.2). */
export function adoptionFloorTerm(E: number): number {
  return Math.ceil(E / 3);
}

/**
 * F = max(Q′, min(⌈E/3⌉, F_max)) — §4.2, the room's number riding the minimum,
 * and **since Q1439 no quorum may ask for more than half** (R-126): ✏️ is
 * *enough of the room* and 🏛️ is *everybody*, so an approval quorum of 100%
 * would make them one rung, and the consent rule taking the strictest answer
 * would let one founding answer hand every member a standing veto over the
 * text. The cap binds only the **count** form from the surface, a share being
 * refused above 50 at validation (`values.ts`).
 *
 * `E` here is the population the quorum is read against. The engine reads it
 * against **the group a candidate is waiting on** (`races.ts`'s `floorFor`,
 * the copy that decides adoptions); this one is the room's own number over
 * the whole of E, which is what the group is before anybody has abstained.
 * The two move together or not at all — `floor-agreement.test.ts`.
 */
export function adoptionFloor(quorumN: number, E: number, fMax: number): number {
  return Math.max(Math.min(quorumN, Math.ceil(E / 2)), Math.min(adoptionFloorTerm(E), fMax));
}
