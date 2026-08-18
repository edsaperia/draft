/**
 * The populations (SPEC v0.48: one E, three uses). Each is one named
 * function so Ed's ruling stays one-line-changeable: E is the arrived,
 * non-removed, non-lapsed membership; quorum's share form is ⌈share × E⌉;
 * the adoption-floor term is ⌈E/3⌉; the freeze base — and the electorate
 * of a running constitutional motion, evaluated live — is E minus
 * document-level abstainers. Invited-but-not-arrived count nowhere.
 */

import type { MemberRecord } from './types.js';
import type { QuorumValue } from './values.js';

/** A member of E: arrived, not removed, not lapsed (§8.2). */
export function inE(m: MemberRecord): boolean {
  return m.arrivedAtT !== null && !m.removed && !m.lapsed;
}

export function eOf(members: Iterable<MemberRecord>): MemberRecord[] {
  return [...members].filter(inE);
}

/** The quorum base (§9.5): E minus abstainers. Holding members stay counted. */
export function quorumBaseOf(members: Iterable<MemberRecord>): MemberRecord[] {
  return eOf(members).filter((m) => m.signedOut !== 'abstaining');
}

/**
 * The electorate of a running constitutional motion (v0.48): the quorum
 * base, evaluated live — no snapshot, re-checked on every answer and every
 * roster event.
 */
export function motionElectorateOf(members: Iterable<MemberRecord>): MemberRecord[] {
  return quorumBaseOf(members);
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
