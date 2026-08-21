/**
 * Typed setting values (plan 367a: values are typed, never display strings —
 * the mock's regex-parsed prose motion values die here). Each shape is the
 * binding scalar a question actually collects (§9.0a: delegate the decision,
 * not the field), so a motion, a ceremony answer and a convenor's set all
 * speak the same object. Formatting lives page-side (LABELS); nothing in
 * this module renders.
 */

import { stableStringify } from './hash.js';

export type TextValue = { text: string };
export type SlugValue = { slug: string };
/** ⏰ — null means never (perpetual). */
export type EndingValue = { endsAtMs: number | null };
/** ✒️ — the bar at the close (§4.3), a confidence, 50–100. */
export type PercentValue = { pct: number };
/** 📈 — how the bar gets there (§9.0): fixed, or rising from startPct. */
export type PaceValue = { shape: 'fixed' } | { shape: 'ramp'; startPct: number };
/** 👥 — the form is the convenor's, the number the room's (§9.0a). share n is a percent of E. */
export type QuorumValue = { form: 'count' | 'share'; n: number };
/** Disclosure ladders — the rung must be one of the entry's rungs. */
export type LadderValue = { rung: string };
/** ⏱️ — real minutes everywhere (Q353, v0.48). */
export type RateValue = { grant: number; cap: number; dripMinutes: number };
/** 💤 — null means memberships never lapse. */
export type LapseValue = { afterMs: number | null };
/** 🤖 — the coherence auditor: proposes only, never judges (§10). */
export type MachinesValue = { enabled: boolean; budget: number };
/** 🤝 — the join policy (§9.7½). Since Q506 (2026-08-21) the register's
 * crown no longer rides inside the value: 🤝 is in the governance-tabs
 * pattern like every held-able setting, its pair on `SettingState.powers`.
 * `holder` survives only as a **legacy** field that older logs (and the
 * golden walk) carry; the fold maps it onto the powers and strips it. */
export type ApplicationsValue = {
  /** @deprecated legacy (pre-Q506) — read by the fold, never written anew. */
  holder?: 'members' | 'reserved' | 'reserved-unilateral' | 'reserved-assent';
  joinPolicy: 'invite' | 'proposed' | 'apply' | 'open';
};

export type SettingValue =
  | TextValue
  | SlugValue
  | EndingValue
  | PercentValue
  | PaceValue
  | QuorumValue
  | LadderValue
  | RateValue
  | LapseValue
  | MachinesValue
  | ApplicationsValue;

export type ValueTypeName =
  | 'text'
  | 'slug'
  | 'ending'
  | 'percent'
  | 'pace'
  | 'quorum'
  | 'ladder'
  | 'rate'
  | 'lapse'
  | 'machines'
  | 'applications'
  | 'register';

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isInt = (v: unknown): v is number => Number.isInteger(v);

/**
 * Structural validation for one value of one type. Ladder rung membership
 * needs the catalogue entry's rung list, so it is checked in catalogue.ts
 * (validateFor); this layer checks shape. Returns an error string or null.
 */
export function validateValue(type: ValueTypeName, v: unknown): string | null {
  if (!isObj(v)) return `${type}: value must be an object`;
  switch (type) {
    case 'text':
      return typeof v.text === 'string' ? null : 'text: { text: string } required';
    case 'slug':
      if (typeof v.slug !== 'string') return 'slug: { slug: string } required';
      return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.slug)
        ? null
        : `slug: '${String(v.slug)}' is not a valid slug`;
    case 'ending':
      if (v.endsAtMs === null) return null;
      return isFiniteNum(v.endsAtMs) && v.endsAtMs >= 0
        ? null
        : 'ending: endsAtMs must be null (never) or a non-negative time';
    case 'percent':
      return isFiniteNum(v.pct) && v.pct >= 50 && v.pct <= 100
        ? null
        : 'percent: pct must be 50–100 (the incumbent sits at 50 by construction)';
    case 'pace':
      if (v.shape === 'fixed') return 'startPct' in v ? 'pace: fixed carries no startPct' : null;
      if (v.shape === 'ramp')
        return isFiniteNum(v.startPct) && v.startPct >= 50 && v.startPct <= 100
          ? null
          : 'pace: ramp needs startPct 50–100';
      return "pace: shape must be 'fixed' or 'ramp'";
    case 'quorum':
      if (v.form !== 'count' && v.form !== 'share') return "quorum: form must be 'count' or 'share'";
      if (v.form === 'count')
        return isInt(v.n) && (v.n as number) >= 0 ? null : 'quorum: count n must be an integer ≥ 0';
      return isFiniteNum(v.n) && v.n >= 0 && v.n <= 100 ? null : 'quorum: share n must be 0–100';
    case 'ladder':
      return typeof v.rung === 'string' ? null : 'ladder: { rung: string } required';
    case 'rate':
      if (!isInt(v.grant) || (v.grant as number) < 0) return 'rate: grant must be an integer ≥ 0';
      if (!isInt(v.cap) || (v.cap as number) < 1) return 'rate: cap must be an integer ≥ 1';
      if ((v.cap as number) < (v.grant as number)) return 'rate: cap must be ≥ grant';
      return isFiniteNum(v.dripMinutes) && v.dripMinutes > 0
        ? null
        : 'rate: dripMinutes must be a positive number of real minutes (Q353)';
    case 'lapse':
      if (v.afterMs === null) return null;
      return isFiniteNum(v.afterMs) && v.afterMs > 0
        ? null
        : 'lapse: afterMs must be null (never) or a positive duration';
    case 'machines':
      if (typeof v.enabled !== 'boolean') return 'machines: enabled must be a boolean';
      return isInt(v.budget) && (v.budget as number) >= 0
        ? null
        : 'machines: budget must be an integer ≥ 0';
    case 'applications':
      if (v.holder !== undefined && v.holder !== 'members' && v.holder !== 'reserved' &&
          v.holder !== 'reserved-unilateral' && v.holder !== 'reserved-assent')
        return "applications: holder (legacy) must be 'members' | 'reserved' | 'reserved-unilateral' | 'reserved-assent'";
      return v.joinPolicy === 'invite' || v.joinPolicy === 'proposed' ||
        v.joinPolicy === 'apply' || v.joinPolicy === 'open'
        ? null
        : 'applications: joinPolicy must be invite | proposed | apply | open';
    case 'register':
      return 'membership has no scalar value — the register changes by command (invite, remove)';
  }
}

/** A slug from a title, docs.vote style; caller uniquifies (SPEC §9.7a). */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 48)
    .replace(/^-+|-+$/g, '');
  return base.length > 0 ? base : 'untitled';
}

/** Value equality via canonical serialization — the same canon the log hashes use. */
export function eqValue(a: SettingValue, b: SettingValue): boolean {
  return stableStringify(a) === stableStringify(b);
}
