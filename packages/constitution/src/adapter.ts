/**
 * The engine seam (Q334/Q335): translate the room's settled constitution
 * into engine-core's Constitution plus the §4.2 floor inputs, without
 * modifying engine-core in this task. Type-only import — erased at runtime,
 * so the browser bundle carries nothing of engine-core.
 *
 */

import type { Constitution, ConstitutionAmendment } from '../../engine-core/src/types.js';
import type { ConstitutionSession } from './session.js';
import type { SettingId } from './catalogue.js';
import type { EndingValue, LadderValue, LapseValue, PaceValue, PercentValue,
  QuorumValue, RateValue, SettingValue } from './values.js';
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

/**
 * The engine constitution fields one settled value implies (§9.6/Q328):
 * folded over the settings at open (below), and amended through by the
 * bridge when a standing changes — one mapper, so the two conventions
 * cannot drift. `perpetualPinMs`: a perpetual ending pins the engine's
 * ramp with a zero-span window ending here — the fixed bar §9.0 requires
 * (at open the window start; on an amendment the moment of the change).
 */
export function engineFieldsFor(
  id: SettingId,
  value: SettingValue,
  perpetualPinMs: number,
): ConstitutionAmendment {
  switch (id) {
    case 'bar':
      return { adoptionThresholdEnd: (value as PercentValue).pct / 100 };
    case 'ending':
      return { windowEndMs: (value as EndingValue).endsAtMs ?? perpetualPinMs };
    case 'quorum': {
      const q = value as QuorumValue;
      return { quorum: { form: q.form, n: q.n } };
    }
    case 'rate': {
      const r = value as RateValue;
      return { tokenGrant: r.grant, tokenCap: r.cap, tokenDripMinutes: r.dripMinutes };
    }
    case 'authorship':
      return {
        authorshipVisibility: (value as LadderValue).rung as
          Constitution['authorshipVisibility'],
      };
    default:
      return {};
  }
}

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
  const ramping = endsAtMs !== null && pace?.shape === 'ramp';
  const startPct = ramping ? (pace as { shape: 'ramp'; startPct: number }).startPct : bar.pct;

  const grant = rate ? rate.grant : 4;
  const cap = rate ? rate.cap : 8;
  // Real minutes straight through (Q353, engine-side since 367b): the
  // sentence's unit is the mechanism's own.
  const dripMinutes = rate ? rate.dripMinutes : 240;

  // Fold the per-setting mapper over the settled values (nulls take the
  // defaults above). The perpetual zero-span-window convention lives in
  // the mapper, shared with the bridge's amendments.
  const fields = {
    ...engineFieldsFor('bar', bar, windowStartMs),
    ...engineFieldsFor('ending', ending ?? { endsAtMs: null }, windowStartMs),
    ...engineFieldsFor('quorum', quorum, windowStartMs),
    ...engineFieldsFor('rate', { grant, cap, dripMinutes }, windowStartMs),
    ...engineFieldsFor('authorship', authorship, windowStartMs),
  } as Required<ConstitutionAmendment>;

  const constitution = {
    adoptionThresholdStart: startPct / 100,
    adoptionThresholdEnd: fields.adoptionThresholdEnd,
    adoptionFloorMax: tuning.adoptionFloorMax,
    deadlockMinComparisons: tuning.deadlockMinComparisons,
    deadlockEpsilon: tuning.deadlockEpsilon,
    cooldownMs: tuning.cooldownMs,
    redraftLimit: tuning.redraftLimit,
    tokenGrant: fields.tokenGrant,
    tokenDripMinutes: fields.tokenDripMinutes,
    tokenCap: fields.tokenCap,
    stake: 1, // flat, non-configurable (§13/Q335)
    rationaleMaxChars: tuning.rationaleMaxChars,
    boutGapMs: tuning.boutGapMs,
    hotSetSize: tuning.hotSetSize,
    explorationEvery: tuning.explorationEvery,
    salienceEvery: Number.MAX_SAFE_INTEGER, // §8.3a gate replaced the rate (Q335 deletes this)
    windowStartMs,
    windowEndMs: fields.windowEndMs,
    authorshipVisibility: fields.authorshipVisibility,
    // §4.2 (367b): the engine computes F = max(Q, min(⌈E/3⌉, F_max)) itself
    // now — the floor closure below survives for hosts that want the number
    // without a Session.
    quorum: fields.quorum,
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
