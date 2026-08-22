/**
 * The setting catalogue (SPEC §9.0–§9.7½, v0.48): every setting the surface
 * shows, its kind under §9.6's test, its default holder (§9.7 — with Ed's
 * pace override, 2026-08-18), the typed value it collects, and — where it is
 * delegable — the consent order under which the room's answers resolve
 * (§9.0a: the document takes the maximum of stated minimums, "maximum"
 * read along each setting's own protective direction).
 *
 * 📧 email is deliberately not here: it is identity on the member record
 * with a uniqueness invariant (§9.7½), not a setting anybody decides.
 */

import type { ApplicationsValue, EndingValue, LapseValue, MachinesValue,
  PaceValue, PercentValue, QuorumValue, RateValue, SettingValue,
  ValueTypeName } from './values.js';
import { validateValue } from './values.js';

export type SettingKind = 'ordinary' | 'constitutional' | 'personal';
export type Holder = 'convenor' | 'members' | 'member';
/**
 * How an amendment was decided. **A unilateral rule change by the founder is
 * still just a kind of amendment** (Ed, 2026-08-22), and this is the ladder
 * of who had to agree for it: 'pen' nobody, because the founder holds the
 * power; 'ordinary' enough of the room, at the approval threshold;
 * 'constitutional' everybody. It is the four verbs' own ordering, minus 🪶,
 * which is not an amendment because nothing exists yet to amend.
 *
 * A 'pen' motion is never *raised* — it opens and settles in the one act, so
 * it is only ever seen as `carried`, and every place that acts on a live
 * motion tests `status === 'running'` and steps over it.
 */
export type MotionRoute = 'ordinary' | 'constitutional' | 'pen';

/**
 * The routes a motion can be **raised** on. The pen is never raised — it
 * opens and settles in the one act and is folded from the set itself — so
 * anything that takes a proposal and asks how it would be decided narrows to
 * these two, and says so in its type rather than in a comment.
 */
export type RaisedRoute = Exclude<MotionRoute, 'pen'>;

export type SettingId =
  | 'title' | 'link' | 'startingText'
  | 'ending' | 'bar' | 'pace' | 'quorum'
  | 'authorship' | 'signing' | 'judgments' | 'chamber'
  | 'rate' | 'lapse' | 'machines' | 'removal'
  | 'membership' | 'applications'
  | 'displayName' | 'picture';

export interface ConsentSpec {
  /** Host-facing phrasing of the binding scalar; member copy is page-side. */
  ask: string;
  /** > 0 ⇒ a is the more protective/demanding answer — the one the document keeps. */
  order: (a: SettingValue, b: SettingValue) => number;
}

export interface CatalogueEntry {
  id: SettingId;
  glyph: string;
  kind: SettingKind;
  holderDefault: Holder;
  delegable: boolean;
  valueType: ValueTypeName;
  /** Ladder rungs, most-protective-first (the order the surface lists them). */
  rungs?: readonly string[];
  consent?: ConsentSpec;
  /**
   * Which route a motion on this setting takes, given the typed values —
   * defaults to the kind; ending refines per §9.6 (the line falls inside
   * the setting: moving the date is ordinary, touching *whether* it ends
   * is constitutional — either direction across never, author call in
   * NOTES.md).
   */
  routeOf?: (proposed: SettingValue, current: SettingValue) => RaisedRoute;
  /** Ceremony serving order: a question is not served until these settle (§9.0a). */
  deps: readonly SettingId[];
  /** Judging waits on this setting being settled (§9.0b; the mock's 8). */
  judgeGate: boolean;
}

const ladderOrder = (rungs: readonly string[]) =>
  (a: SettingValue, b: SettingValue): number =>
    rungs.indexOf((b as { rung: string }).rung) - rungs.indexOf((a as { rung: string }).rung);

/** null reads as +∞ — never is the most protective duration/date. */
const neverIsHighest = (of: (v: SettingValue) => number | null) =>
  (a: SettingValue, b: SettingValue): number => {
    const av = of(a);
    const bv = of(b);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return av - bv;
  };

export const CATALOGUE: readonly CatalogueEntry[] = [
  { id: 'title', glyph: '🪶', kind: 'ordinary', holderDefault: 'convenor',
    delegable: false, valueType: 'text', deps: [], judgeGate: false },

  { id: 'link', glyph: '📍', kind: 'ordinary', holderDefault: 'convenor',
    delegable: false, valueType: 'slug', deps: [], judgeGate: false },

  // Confirmed, may be empty (§9.0b); changed post-start by proposing in the
  // document itself, so it has no motion route (motion-controls: a motion
  // button there would be a second door to the same room).
  { id: 'startingText', glyph: '📄', kind: 'ordinary', holderDefault: 'convenor',
    delegable: false, valueType: 'text', deps: [], judgeGate: false },

  { id: 'ending', glyph: '⏰', kind: 'constitutional', holderDefault: 'members',
    delegable: true, valueType: 'ending',
    consent: {
      ask: 'the earliest close you will accept — never being the latest of all',
      order: neverIsHighest((v) => (v as EndingValue).endsAtMs),
    },
    routeOf: (p, c) =>
      (p as EndingValue).endsAtMs === null || (c as EndingValue).endsAtMs === null
        ? 'constitutional'
        : 'ordinary',
    deps: [], judgeGate: false },

  { id: 'bar', glyph: '✒️', kind: 'constitutional', holderDefault: 'members',
    delegable: true, valueType: 'percent',
    consent: {
      ask: 'the lowest bar at the close you will accept',
      order: (a, b) => (a as PercentValue).pct - (b as PercentValue).pct,
    },
    deps: ['ending'], judgeGate: true },

  // Ordinary by §9.6's test (pacing re-rates nothing) and **the founder's,
  // not delegable** (Ed, 2026-08-19, closing Q415 — reverting his own
  // 2026-08-18 override, which was made with "we can change this later"
  // attached). Q341's ruling is the reason: the bar at the close is consent
  // and the ramp that reaches it is *pacing*, which stays with the founder.
  // Nothing was collecting an answer for it either — no surface ever grew a
  // founding question for a {shape, startPct}. The members can still take it
  // over after the start, by the reserve route, where no blind question is
  // needed. The consent order survives for exactly that case.
  { id: 'pace', glyph: '📈', kind: 'ordinary', holderDefault: 'convenor',
    delegable: false, valueType: 'pace',
    consent: {
      ask: 'the most gradual arrival at the close bar you will accept',
      order: (a, b) => {
        const pa = a as PaceValue;
        const pb = b as PaceValue;
        if (pa.shape !== pb.shape) return pa.shape === 'fixed' ? 1 : -1;
        if (pa.shape === 'ramp' && pb.shape === 'ramp') return pa.startPct - pb.startPct;
        return 0;
      },
    },
    deps: ['ending'], judgeGate: false },

  // The form is the convenor's, the number the room's (§9.0a) — resolution
  // refuses mixed forms rather than converting.
  { id: 'quorum', glyph: '👥', kind: 'constitutional', holderDefault: 'members',
    delegable: true, valueType: 'quorum',
    consent: {
      ask: "the lowest quorum you will accept, in the convenor's chosen form",
      order: (a, b) => (a as QuorumValue).n - (b as QuorumValue).n,
    },
    deps: [], judgeGate: true },

  { id: 'authorship', glyph: '👤', kind: 'constitutional', holderDefault: 'members',
    delegable: true, valueType: 'ladder',
    rungs: ['anonymous', 'sealed', 'public'],
    consent: {
      ask: 'the most exposure of proposers you will accept',
      order: ladderOrder(['anonymous', 'sealed', 'public']),
    },
    deps: [], judgeGate: true },

  { id: 'signing', glyph: '✍️', kind: 'constitutional', holderDefault: 'members',
    delegable: true, valueType: 'ladder',
    rungs: ['nobody', 'each', 'everybody'],
    consent: {
      ask: 'the most signing you will accept',
      order: ladderOrder(['nobody', 'each', 'everybody']),
    },
    deps: [], judgeGate: true },

  { id: 'judgments', glyph: '👁️', kind: 'constitutional', holderDefault: 'members',
    delegable: true, valueType: 'ladder',
    rungs: ['never', 'after'],
    consent: {
      ask: 'the most judgment disclosure you will accept',
      order: ladderOrder(['never', 'after']),
    },
    deps: [], judgeGate: true },

  { id: 'chamber', glyph: '🌍', kind: 'constitutional', holderDefault: 'members',
    delegable: true, valueType: 'ladder',
    rungs: ['closed', 'link', 'public'],
    consent: {
      ask: 'the most visibility you will accept',
      order: ladderOrder(['closed', 'link', 'public']),
    },
    deps: [], judgeGate: true },

  { id: 'rate', glyph: '⏱️', kind: 'ordinary', holderDefault: 'convenor',
    delegable: true, valueType: 'rate',
    consent: {
      // Most generous wins (§9.0): higher grant, then higher cap, then a
      // faster drip. Generosity is the protective direction here — nobody
      // is bound by a rate more restrictive than they accepted.
      ask: 'the least generous proposal rate you will accept',
      order: (a, b) => {
        const ra = a as RateValue;
        const rb = b as RateValue;
        if (ra.grant !== rb.grant) return ra.grant - rb.grant;
        if (ra.cap !== rb.cap) return ra.cap - rb.cap;
        return rb.dripMinutes - ra.dripMinutes;
      },
    },
    deps: [], judgeGate: false },

  { id: 'lapse', glyph: '💤', kind: 'constitutional', holderDefault: 'members',
    delegable: true, valueType: 'lapse',
    consent: {
      ask: 'the shortest quiet spell you will accept being lapsed after',
      order: neverIsHighest((v) => (v as LapseValue).afterMs),
    },
    deps: [], judgeGate: true },

  // **How a member is removed** (Q401, Ed 2026-08-19). Three rungs, and the
  // middle one is a decision class of its own — unanimity excluding the
  // subject (the live-electorate settle check minus one member), which is
  // what real constitutions mostly do (partnerships expel by unanimity of
  // the others). 'everyone' includes the subject's own answer, which makes
  // it effectively a no-expulsion rule — the most protective, and today's
  // default. The subject always *sees* a motion running against them (Ed's
  // ruling); whether they may judge their own *ordinary* removal race is
  // open (Q401b). Not judge-gated: like the join policy, it touches no
  // recorded judgment.
  { id: 'removal', glyph: '🚪', kind: 'constitutional', holderDefault: 'members',
    delegable: true, valueType: 'ladder',
    rungs: ['everyone', 'others', 'ordinary'],
    consent: {
      ask: 'the easiest removal of a member you will accept',
      order: ladderOrder(['everyone', 'others', 'ordinary']),
    },
    deps: [], judgeGate: false },

  // Ordinary (Q352, Ed 2026-08-18): the auditor is not a member — it judges
  // nothing and counts toward no quorum, so switching it re-rates nothing
  // already decided. A member could put the document through an AI
  // themselves; the tool is a convenience for the membership.
  { id: 'machines', glyph: '🤖', kind: 'ordinary', holderDefault: 'convenor',
    delegable: true, valueType: 'machines',
    consent: {
      ask: 'the most machine proposing you will accept',
      order: (a, b) => {
        const ma = a as MachinesValue;
        const mb = b as MachinesValue;
        if (ma.enabled !== mb.enabled) return ma.enabled ? -1 : 1;
        return mb.budget - ma.budget;
      },
    },
    deps: [], judgeGate: false },

  // The register itself — changed by command (invite, arrive, remove),
  // never by a scalar motion. Who holds it lives on 'applications' (§9.7½).
  { id: 'membership', glyph: '🪪', kind: 'constitutional', holderDefault: 'members',
    delegable: false, valueType: 'register', deps: [], judgeGate: false },

  // Not judge-gated: the mock's ceremony gate is exactly the eight settings
  // a judgment is recorded under or counted towards (§9.0b); the join
  // policy touches neither. A delegated applications question still blocks
  // judging while it collects, like any delegated question.
  { id: 'applications', glyph: '🤝', kind: 'constitutional', holderDefault: 'members',
    delegable: true, valueType: 'applications',
    consent: {
      ask: 'the most open join policy you will accept',
      order: (a, b) => {
        const rungs = ['invite', 'proposed', 'apply', 'open'];
        const byPolicy = rungs.indexOf((b as ApplicationsValue).joinPolicy) -
          rungs.indexOf((a as ApplicationsValue).joinPolicy);
        if (byPolicy !== 0) return byPolicy;
        // Q506 (2026-08-21): the pair left the value, so the policy is the
        // whole order -- delegate the decision, not the field (Q341). The
        // old Q395 holder tiebreak went with it.
        return byPolicy;
      },
    },
    deps: [], judgeGate: false },

  { id: 'displayName', glyph: '✋', kind: 'personal', holderDefault: 'member',
    delegable: false, valueType: 'text', deps: [], judgeGate: false },

  { id: 'picture', glyph: '🖼️', kind: 'personal', holderDefault: 'member',
    delegable: false, valueType: 'text', deps: [], judgeGate: false },
];

export const CATALOGUE_BY_ID: ReadonlyMap<SettingId, CatalogueEntry> =
  new Map(CATALOGUE.map((e) => [e.id, e]));

export function entryOf(id: SettingId): CatalogueEntry {
  const e = CATALOGUE_BY_ID.get(id);
  if (!e) throw new Error(`unknown setting '${id}'`);
  return e;
}

/** The seven settings judging waits on (§9.0b; machines left with Q352). */
export const JUDGE_GATES: readonly SettingId[] =
  CATALOGUE.filter((e) => e.judgeGate).map((e) => e.id);

/** Structural + rung validation for one setting's value. */
export function validateFor(entry: CatalogueEntry, v: unknown): string | null {
  const err = validateValue(entry.valueType, v);
  if (err) return err;
  if (entry.valueType === 'ladder') {
    const rung = (v as { rung: string }).rung;
    if (!entry.rungs?.includes(rung))
      return `${entry.id}: '${rung}' is not one of [${entry.rungs?.join(', ')}]`;
  }
  return null;
}

/**
 * The route a motion on this setting takes, given the typed values (§9.6).
 * A null current (no settled value to move against) routes constitutionally:
 * the session refuses such a motion outright, so the null case exists only
 * for callers deriving the route before opening (the bridge's stake gate).
 */
export function motionRouteOf(
  entry: CatalogueEntry,
  proposed: SettingValue,
  current: SettingValue | null,
): RaisedRoute {
  if (current === null) return 'constitutional';
  if (entry.routeOf) return entry.routeOf(proposed, current);
  if (entry.kind === 'personal') throw new Error(`${entry.id} is personal — no motion route`);
  return entry.kind === 'constitutional' ? 'constitutional' : 'ordinary';
}
