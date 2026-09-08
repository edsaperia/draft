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

/** The room's quorum as a count (§4.2): a fixed count, or ⌈share × E⌉. */
export function quorumCount(quorum: QuorumValue, E: number): number {
  return quorum.form === 'count' ? quorum.n : Math.ceil((quorum.n / 100) * E);
}

/** The statistical half of the adoption floor (§4.2, §8.2). */
export function adoptionFloorTerm(E: number): number {
  return Math.ceil(E / 3);
}

/** F = max(Q, min(⌈E/3⌉, F_max)) — §4.2, the room's number riding the minimum. */
export function adoptionFloor(quorumN: number, E: number, fMax: number): number {
  return Math.max(quorumN, Math.min(adoptionFloorTerm(E), fMax));
}
