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
export { ERASED, InMemoryPeople, resolvePerson } from './people.js';
export type { People, PersonFields, PersonId, ResolvedPerson } from './people.js';
export { ConstitutionSession, SEEN_EVERY_MS } from './session.js';
export type { MotionInput, OpenInput, WaitingHold, WaitingWhy } from './session.js';
export { eOf, inE, motionElectorateOf, quorumCount,
  adoptionFloorTerm, adoptionFloor } from './populations.js';
// **Retired, and exported anyway for one release** (Q1362 (b), R-117): the bar
// left the adoption test and 🌡️ and 🪜 left the surface, so the whole of
// `threshold.js` describes a number nobody is shown and nothing decides. It is
// pinned rather than deleted, and goes with the module a release later.
// `BAR_RUNGS`, `OWN_RUNG_LABEL` and `winsNeededPct` stood beside it here and
// are gone: the surface stage stopped reading them in the same pass.
export { BAR_CEILING_PCT, VOTES_NEEDED, VOTES_NEEDED_HI_PCT, VOTES_NEEDED_LO_PCT, VOTES_NEEDED_MAX_N,
  barAt, barCeilingPct, reAnchor, seedAnchors, smoothstep, votesNeeded } from './threshold.js';
export type { ThresholdAnchors } from './threshold.js';
export { MEANING_MAX, meaningOf, roomPhrase, spellWords } from './meaning.js';
export type { Room } from './meaning.js';
export { WARN_LEADS, lapseDue, warningDue } from './clocks.js';
export { SHAPES, SHAPED, UNSHAPED, shapeOf, isShapeName } from './shapes.js';
export type { Shape, ShapeName } from './shapes.js';
export { view, constitutionBlock, roomSettings } from './view.js';
export type { MemberView, MotionPayloadView, MotionView, QuestionView, ResolutionView,
  SettingView } from './view.js';
