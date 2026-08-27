/**
 * @draft/constitution — the §9 layer as a real module (SPEC v0.48, Q334/Q367a).
 * Settings, kinds and holders, delegation, the consent rule, motions on both
 * routes, the crown, membership lifecycle. Pure and deterministic: no wall
 * clock, no unseeded randomness, no I/O, no platform imports — the same
 * discipline as engine-core, plus browser-loadability (pure-TS sha256).
 * The module keeps truth; the page keeps rendering.
 */

export { sha256Hex, stableStringify, chainHash } from './hash.js';
export * from './values.js';
export {
  CATALOGUE, CATALOGUE_BY_ID, JUDGE_GATES, entryOf, mayApply, motionRouteOf, validateFor,
} from './catalogue.js';
export type {
  CatalogueEntry, ConsentSpec, MotionRoute, SettingId, SettingKind,
} from './catalogue.js';
export { resolveConsent } from './consent.js';
export type { ConsentResolution } from './consent.js';
export * from './types.js';
export { ConstitutionSession } from './session.js';
export type { OpenInput, WaitingHold, WaitingWhy } from './session.js';
export { eOf, inE, quorumBaseOf, motionElectorateOf, quorumCount,
  adoptionFloorTerm, adoptionFloor } from './populations.js';
export { BAR_CEILING_PCT, barAt, barCeilingPct, reAnchor, seedAnchors, smoothstep } from './threshold.js';
export type { ThresholdAnchors } from './threshold.js';
export { lapseDue, WARN_FRACTION } from './clocks.js';
export { view, constitutionBlock, roomSettings } from './view.js';
export type { MemberView, MotionView, QuestionView, ResolutionView,
  SettingView } from './view.js';
