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
/** 🌡️ — the bar at the close (§4.3), a confidence, 50–100. */
export type PercentValue = { pct: number };
/** 🪜 — how the bar gets there (§9.0): fixed, or rising from startPct. */
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
/**
 * **The price of an act** — the one scale for what it costs to bring
 * somebody in (🪪) or put somebody out (🥾), in the document's own verbs
 * (entry 94, Ed 2026-08-26): `assembly` everyone must agree (🏛️),
 * `proposal` the membership decides at the threshold (✏️), `pen` no
 * proposal — the act is its own consent (✒️, which means *any* unilateral
 * act in the document; the founder only starts with it). 🥾 adds `consent`
 * — unanimity *including* the subject, so a member can only ever leave —
 * and has no `pen` rung, because one member exiling another alone is not a
 * price a room could choose. Which rungs an entry allows is its `rungs`
 * list, checked in catalogue.ts exactly as a ladder's are.
 */
export type Price = 'consent' | 'assembly' | 'proposal' | 'pen';
export type PriceValue = { price: Price };
/** 🤝 — may strangers apply? (§9.7½, entry 94). An application is a
 * stranger proposing their own invitation, admitted at 🪪's price; this
 * setting is only the switch on that door. The register's crown is the
 * setting's own pair on `SettingState.powers` (Q506), like every held-able
 * setting's. **The value is the switch and nothing else** (Q1329, Ed
 * 2026-09-11: *we are still in alpha — there are no old documents*): the
 * pre-Q506 `holder` and the pre-entry-94 `joinPolicy` that older logs
 * carried are not read — a value carrying either is refused, and a log
 * carrying one is quarantined at boot. */
export type ApplicationsValue = { apply: boolean };

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
  | PriceValue
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
  | 'price'
  | 'applications';

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isInt = (v: unknown): v is number => Number.isInteger(v);

/**
 * **💤's floor is five minutes** (Q1453, Ed 2026-09-18). The card has offered
 * five minutes as its shortest spell since 💤 took ⏱️'s unit picker, and this
 * validator took *null or any positive duration* — so the floor was the
 * page's alone, and a delegated answer, a carried motion's payload, the
 * founder's own pen and a replayed log each went round it. A spell of
 * milliseconds is nothing a room could want and everything a room could be
 * wrecked by: every member is inactive on the next tick, so the first tick
 * after the set lapses the whole membership at once. The refusal lives here
 * because this is the one door all four roads pass through.
 */
export const LAPSE_MIN_MS = 5 * 60_000;

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
      // **A quorum may ask for everybody** (Q1490, Ed 2026-09-21, R-139,
      // reversing R-126's cap at half): *I think we should allow for quorums
      // up to 100%, and let the lapse mechanic compensate* — a silence that
      // has run its 💤 period leaves the group the quorum is read against, so
      // a unanimous room is four of four where four are still deciding. The
      // share is bounded here, at the value; the **count** form cannot be (E
      // moves under it) and the engine caps it at the group each race is
      // waiting on, which is all that is left of the old cap. This widens what
      // is accepted, so nothing already stored is quarantined by it (Q1329).
      return isFiniteNum(v.n) && v.n >= 0 && v.n <= 100
        ? null
        : 'quorum: share n must be 0–100 (Q1490)';
    case 'ladder':
      return typeof v.rung === 'string' ? null : 'ladder: { rung: string } required';
    case 'rate':
      if (!isInt(v.grant) || (v.grant as number) < 0) return 'rate: grant must be an integer ≥ 0';
      if (!isInt(v.cap) || (v.cap as number) < 1) return 'rate: cap must be an integer ≥ 1';
      if ((v.cap as number) < (v.grant as number)) return 'rate: cap must be ≥ grant';
      // **The floor is one whole minute** (issue #4): any positive number
      // passed, and a sub-minute interval spun the engine's drip for ever —
      // below float precision at epoch milliseconds the tick never advances,
      // and one crafted answer on a delegated ⏱️ took the host down, at boot
      // too, since replay re-validates every value (Q1329). Nothing legitimate
      // sits below it: the card offers `min="1"` × minutes, hours or days, so
      // what a member can reach is a whole number of minutes either way.
      return isInt(v.dripMinutes) && (v.dripMinutes as number) >= 1
        ? null
        : 'rate: dripMinutes must be a whole number of real minutes, at least 1 (Q353)';
    case 'lapse':
      if (v.afterMs === null) return null;
      return isFiniteNum(v.afterMs) && v.afterMs >= LAPSE_MIN_MS
        ? null
        : 'lapse: afterMs must be null (never) or at least five minutes (Q1453)';
    case 'machines':
      if (typeof v.enabled !== 'boolean') return 'machines: enabled must be a boolean';
      return isInt(v.budget) && (v.budget as number) >= 0
        ? null
        : 'machines: budget must be an integer ≥ 0';
    case 'applications': {
      // exactly the switch (Q1329): a key this build does not write is a
      // refusal naming it, so a script still sending the pre-entry-94
      // shape is told which key, not merely that the value is wrong
      const stray = Object.keys(v).find((k) => k !== 'apply');
      if (stray !== undefined)
        return `applications: unknown key '${stray}' — the value is { apply: boolean } and nothing else`;
      return typeof v.apply === 'boolean' ? null : 'applications: { apply: boolean } required';
    }
    case 'price':
      return v.price === 'consent' || v.price === 'assembly' ||
        v.price === 'proposal' || v.price === 'pen'
        ? null
        : 'price: price must be consent | assembly | proposal | pen';
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
