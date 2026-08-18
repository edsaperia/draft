/**
 * The engine seam (Q334/Q335): translate the room's settled constitution
 * into engine-core's Constitution plus the §4.2 floor inputs, without
 * modifying engine-core in this task. Type-only import — erased at runtime,
 * so the browser bundle carries nothing of engine-core.
 *
 * Quarantined here (NOTES.md): the lossy dripMinutes → tokenDripPerTenth
 * conversion, until engine-core adopts the real-minutes drip (v0.48/Q353).
 */

import type { Constitution } from '../../engine-core/src/types.js';
import type { ConstitutionSession } from './session.js';
import type { EndingValue, LapseValue, PaceValue, PercentValue, QuorumValue,
  RateValue } from './values.js';
import { adoptionFloor, quorumCount } from './populations.js';

export interface EngineTuning {
  adoptionFloorMax: number;
  deadlockMinComparisons: number;
  deadlockEpsilon: number;
  cooldownMs: number;
  redraftLimit: number;
  rationaleMaxChars: number;
  boutGapMs: number;
  hotSetSize: number;
  explorationEvery: number;
  rivalGateProb: number;
  rivalGateMinComparisons: number;
}

/** Engine tuning is the engine's, un-motionable (Q335) — Appendix A values. */
export const DEFAULT_TUNING: EngineTuning = {
  adoptionFloorMax: 12,
  deadlockMinComparisons: 20,
  deadlockEpsilon: 0.005,
  cooldownMs: 5 * 60_000,
  redraftLimit: 2,
  rationaleMaxChars: 300,
  boutGapMs: 90_000,
  hotSetSize: 3,
  explorationEvery: 7,
  rivalGateProb: 0.35,
  rivalGateMinComparisons: 6,
};

export interface EngineConstitutionOut {
  constitution: Constitution;
  quorumN: number;
  floor: (E: number) => number;
}

export function toEngineConstitution(
  s: ConstitutionSession,
  tuning: EngineTuning,
  rngSeed: string,
): EngineConstitutionOut {
  if (s.constitutedAtT === null) {
    throw new Error('the engine starts where the constitution is settled (§9.0b)');
  }
  const bar = s.settingState('bar').value as PercentValue;
  const pace = s.settingState('pace').value as PaceValue | null;
  const ending = s.settingState('ending').value as EndingValue | null;
  const rate = s.settingState('rate').value as RateValue | null;
  const quorum = s.settingState('quorum').value as QuorumValue;
  const authorship = s.settingState('authorship').value as { rung: string };
  void (s.settingState('lapse').value as LapseValue | null); // engine has no lapse yet

  const windowStartMs = s.constitutedAtT;
  const endsAtMs = ending ? ending.endsAtMs : null;
  // Perpetual: a zero-span window pins the engine's ramp at its end value,
  // which is the fixed bar §9.0 requires.
  const windowEndMs = endsAtMs ?? windowStartMs;
  const ramping = endsAtMs !== null && pace?.shape === 'ramp';
  const startPct = ramping ? (pace as { shape: 'ramp'; startPct: number }).startPct : bar.pct;

  const grant = rate ? rate.grant : 4;
  const cap = rate ? rate.cap : 8;
  const dripMinutes = rate ? rate.dripMinutes : 240;
  // LOSSY (quarantined): engine v0.12 drips per tenth of window. Real
  // minutes → tokens per tenth only converts where a window exists.
  const tokenDripPerTenth = endsAtMs === null
    ? 1
    : Math.max(0, ((windowEndMs - windowStartMs) / 10) / (dripMinutes * 60_000));

  const constitution = {
    adoptionThresholdStart: startPct / 100,
    adoptionThresholdEnd: bar.pct / 100,
    adoptionFloorMax: tuning.adoptionFloorMax,
    deadlockMinComparisons: tuning.deadlockMinComparisons,
    deadlockEpsilon: tuning.deadlockEpsilon,
    cooldownMs: tuning.cooldownMs,
    redraftLimit: tuning.redraftLimit,
    tokenGrant: grant,
    tokenDripPerTenth,
    tokenCap: cap,
    stake: 1, // flat, non-configurable (§13/Q335)
    rationaleMaxChars: tuning.rationaleMaxChars,
    boutGapMs: tuning.boutGapMs,
    hotSetSize: tuning.hotSetSize,
    explorationEvery: tuning.explorationEvery,
    salienceEvery: Number.MAX_SAFE_INTEGER, // §8.3a gate replaced the rate (Q335 deletes this)
    windowStartMs,
    windowEndMs,
    authorshipVisibility: authorship.rung as Constitution['authorshipVisibility'],
    rngSeed,
    rivalGateProb: tuning.rivalGateProb,
    rivalGateMinComparisons: tuning.rivalGateMinComparisons,
  } as Constitution;

  const quorumN = quorumCount(quorum, s.E());
  return {
    constitution,
    quorumN,
    // §4.2: F = max(Q, min(⌈E/3⌉, F_max)) — quorum re-derived per E so a
    // share-quorum tracks the roster.
    floor: (E: number) => adoptionFloor(quorumCount(quorum, E), E, tuning.adoptionFloorMax),
  };
}
