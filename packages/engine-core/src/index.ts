/**
 * @draft/engine-core — the group drafting engine (SPEC v0.6, phase P1).
 * Pure and deterministic: no wall clock, no unseeded randomness, no I/O.
 */

export * from './types.js';
export * from './text/types.js';
export * from './ranking/types.js';
export { Session, makeConstitution, DEFAULT_CONSTITUTION, pairValue } from './session.js';
export { ParticipantApi } from './participant-api.js';
export type { CardView, OptionView, GazetteEntry } from './participant-api.js';
export { adoptionThreshold } from './adoption-threshold.js';
export type {
  EquivalenceVerdict,
  OracleCandidate,
  OracleContext,
  SemanticOracle,
} from './oracle.js';
export {
  DedupGate,
  levenshtein,
  normalizeForDedup,
  relativeEditDistance,
} from './dedup-gate.js';
export type { DedupGateOptions, DedupVerdict } from './dedup-gate.js';
export { performanceRefund } from './tokens.js';
export { diffLines, splitLines, joinLines } from './text/diff.js';
export {
  applyPatch,
  footprint,
  footprintsConflict,
  spansConflict,
  splitHunks,
  validateHunks,
} from './text/patch.js';
export { rebaseHunks } from './text/rebase.js';
export { composeTextual } from './text/compose.js';
export { fitDavidson } from './ranking/davidson.js';
export { makeRng, type Rng } from './rng.js';
export { chainHash, sha256Hex, stableStringify } from './hash.js';
