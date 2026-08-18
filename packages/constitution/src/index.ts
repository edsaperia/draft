/**
 * @draft/constitution — the §9 layer as a real module (SPEC v0.48, Q334/Q367a).
 * Settings, kinds and holders, delegation, the consent rule, motions on both
 * routes, the crown, membership lifecycle. Pure and deterministic: no wall
 * clock, no unseeded randomness, no I/O, no platform imports — the same
 * discipline as engine-core, plus browser-loadability (pure-TS sha256).
 * The module keeps truth; the page keeps rendering.
 */

export { sha256Hex, stableStringify, chainHash } from './hash.js';
