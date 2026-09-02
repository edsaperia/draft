/**
 * The setting catalogue (SPEC §9.0–§9.7½, v0.48): every setting the surface
 * shows, its kind under §9.6's test, the typed value it collects, and — where it is
 * delegable — the consent order under which the room's answers resolve
 * (§9.0a: the document takes the maximum of stated minimums, "maximum"
 * read along each setting's own protective direction).
 *
 * 📧 email is deliberately not here: it is identity on the member record
 * with a uniqueness invariant (§9.7½), not a setting anybody decides.
 */

import type { ApplicationsValue, EndingValue, LapseValue, MachinesValue,
  PercentValue, PriceValue, QuorumValue, RateValue, SettingValue,
  ValueTypeName } from './values.js';
import { validateValue } from './values.js';

export type SettingKind = 'ordinary' | 'constitutional' | 'personal';
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
  | 'authorship' | 'judgments' | 'chamber'
  | 'rate' | 'lapse' | 'machines' | 'removal'
  | 'admission' | 'applications'
  | 'displayName' | 'picture';

export interface ConsentCtx {
  /** The electorate at the moment the question settles (R-082, Q1172). */
  e: number;
}

export interface ConsentSpec {
  /** Host-facing phrasing of the binding scalar; member copy is page-side. */
  ask: string;
  /**
   * > 0 ⇒ a is the more protective/demanding answer — the one the document
   * keeps. `ctx` carries the electorate at the settle, for the one order that
   * needs it: quorum's, which resolves a share and a fixed count against E
   * (R-082, Q1172 — the answer demanding the most voters wins).
   */
  order: (a: SettingValue, b: SettingValue, ctx?: ConsentCtx) => number;
}

export interface CatalogueEntry {
  id: SettingId;
  glyph: string;
  kind: SettingKind;
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
  /**
   * **The answer a question nobody can be asked reads as** (entry 259, R-080).
   * Set only on a setting that has left the surface (SPEC §9.7.1 *surface:
   * none*) while staying in the catalogue for replay: a question delegated on
   * it before its card went can be answered by nobody, so 🍾 resolves it at
   * this value, once, and the readiness readout never lists it — collecting or
   * settled. A setting without the field behaves exactly as it always has.
   */
  retiredAnswer?: SettingValue;
}

const ladderOrder = (rungs: readonly string[]) =>
  (a: SettingValue, b: SettingValue): number =>
    rungs.indexOf((b as { rung: string }).rung) - rungs.indexOf((a as { rung: string }).rung);

/** A price's order is its entry's rung list, most protective first — the same shape as a ladder's. */
const priceOrder = (rungs: readonly string[]) =>
  (a: SettingValue, b: SettingValue): number =>
    rungs.indexOf((b as PriceValue).price) - rungs.indexOf((a as PriceValue).price);

/**
 * 🤝 read through its legacy: a value written before entry 94 carried a
 * four-rung `joinPolicy`, of which `invite` is the door shut and the rest
 * are the door open. Exported for the fold and the server, so the mapping
 * lives in one place.
 */
export function mayApply(v: ApplicationsValue | null): boolean {
  if (v === null) return false;
  if (v.apply !== undefined) return v.apply;
  return v.joinPolicy !== undefined && v.joinPolicy !== 'invite';
}

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
  { id: 'title', glyph: '🪶', kind: 'ordinary',
    delegable: false, valueType: 'text', deps: [], judgeGate: false },

  { id: 'link', glyph: '📍', kind: 'ordinary',
    delegable: false, valueType: 'slug', deps: [], judgeGate: false },

  // Confirmed, may be empty (§9.0b); changed post-start by proposing in the
  // document itself, so it has no motion route (motion-controls: a motion
  // button there would be a second door to the same room).
  { id: 'startingText', glyph: '📝', kind: 'ordinary',
    delegable: false, valueType: 'text', deps: [], judgeGate: false },

  { id: 'ending', glyph: '⏰', kind: 'constitutional',
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

  { id: 'bar', glyph: '🌡️', kind: 'constitutional',
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
  // needed, so no consent order: nothing ever resolves one (Q560, 2026-08-22).
  { id: 'pace', glyph: '🪜', kind: 'ordinary',
    delegable: false, valueType: 'pace',
    deps: ['ending'], judgeGate: false },

  // **The question collects the form and the number together** (Ed,
  // 2026-09-02, Q1162 — Q341 reversed for 👥 alone, R-082): a member answers
  // as a share of the membership or as a fixed count, and mixed answers
  // resolve at the settle — every answer read against E as it stands then,
  // the answer demanding the most voters winning, its form and number both
  // standing (Q1172). Same-form ties keep the higher number, which is the
  // old scalar order exactly, so every existing log resolves as it did.
  { id: 'quorum', glyph: '👥', kind: 'constitutional',
    delegable: true, valueType: 'quorum',
    consent: {
      ask: 'the lowest quorum you will accept — a share of the membership or a fixed count',
      order: (a, b, ctx) => {
        const e = Math.max(1, (ctx && ctx.e) || 1);
        const demand = (v: QuorumValue) =>
          (v.form === 'count' ? v.n : Math.ceil((v.n / 100) * e));
        const d = demand(a as QuorumValue) - demand(b as QuorumValue);
        return d !== 0 ? d : (a as QuorumValue).n - (b as QuorumValue).n;
      },
    },
    deps: [], judgeGate: true },

  // **One setting, five rungs** (Ed, 2026-08-25, closing Q634 and Q767: *I
  // think five rungs is fine; there is definitely a ladder going from
  // anonymous forever to open forever*). ✍️ signing was a second setting on a
  // second card asking a question this one already ordered. Its top rung
  // `everybody` was the same fact as `public` here, which made
  // `anonymous` + `everybody` a reachable self-contradiction (Q634 iii); its
  // middle rung `each` is an **opt-in**, and an opt-in is not an axis — it is
  // a step on this ladder, between never-named and named-at-the-close.
  //
  // The order is total and runs most-private-first, which is what makes one
  // consent resolution correct where two were needed before: a document that
  // never names you unless you ask is strictly more private than one that
  // names everybody at the close, and one that names everybody at the close
  // but lets you volunteer earlier is strictly more private than one that
  // names you as you propose. So the room's answers resolve down the single
  // ladder, and nobody is handed an exposure they did not accept.
  //
  // The two elective rungs are the ones the per-proposal sign control belongs
  // to (Q770, built): by default they behave as their base rung, which is what
  // `adapter.ts` maps them to, and a signed proposal is named from the moment
  // it is made (`authorVisible` in engine-core; the gate is `propose-text`).
  { id: 'authorship', glyph: '👤', kind: 'constitutional',
    delegable: true, valueType: 'ladder',
    rungs: ['anonymous', 'anonymousElective', 'sealed', 'sealedElective', 'public'],
    consent: {
      ask: 'the most exposure of proposers you will accept',
      order: ladderOrder(['anonymous', 'anonymousElective', 'sealed', 'sealedElective', 'public']),
    },
    deps: [], judgeGate: true },

  { id: 'judgments', glyph: '👁️', kind: 'constitutional',
    delegable: true, valueType: 'ladder',
    rungs: ['never', 'after'],
    consent: {
      ask: 'the most judgment disclosure you will accept',
      order: ladderOrder(['never', 'after']),
    },
    deps: [], judgeGate: true },

  { id: 'chamber', glyph: '🌍', kind: 'constitutional',
    delegable: true, valueType: 'ladder',
    rungs: ['closed', 'link', 'public'],
    consent: {
      ask: 'the most visibility you will accept',
      order: ladderOrder(['closed', 'link', 'public']),
    },
    deps: [], judgeGate: true },

  { id: 'rate', glyph: '⏱️', kind: 'ordinary',
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

  { id: 'lapse', glyph: '💤', kind: 'constitutional',
    delegable: true, valueType: 'lapse',
    consent: {
      ask: 'the shortest quiet spell you will accept being lapsed after',
      order: neverIsHighest((v) => (v as LapseValue).afterMs),
    },
    deps: [], judgeGate: true },

  // **The price of removal** (Q401, Ed 2026-08-19; on the one price scale
  // since entry 94, 2026-08-26). `assembly` is a decision class of its own —
  // unanimity excluding the subject (the live-electorate settle check minus
  // one member), which is what real constitutions mostly do (partnerships
  // expel by unanimity of the others). `consent` includes the subject's own
  // answer, which makes it a no-expulsion rule — a member can only ever
  // leave — the most protective, and today's default. No `pen` rung: exile
  // at will is the founder's ✒️ on the ❌ door, not a price the room sets.
  // The subject always *sees* a motion running against them (Ed's ruling);
  // whether they may judge their own `proposal` removal is open (Q401b).
  // Not judge-gated: like the join policy, it touches no recorded judgment.
  { id: 'removal', glyph: '🥾', kind: 'constitutional',
    delegable: true, valueType: 'price',
    rungs: ['consent', 'assembly', 'proposal'],
    consent: {
      ask: 'the easiest removal of a member you will accept',
      order: priceOrder(['consent', 'assembly', 'proposal']),
    },
    deps: [], judgeGate: false },

  // Ordinary (Q352, Ed 2026-08-18): the auditor is not a member — it judges
  // nothing and counts toward no quorum, so switching it re-rates nothing
  // already decided. A member could put the document through an AI
  // themselves; the tool is a convenience for the membership.
  //
  // The card left the surface on 2026-08-29 (R-078) and the setting stayed,
  // so a founder who delegated 🤖 before then holds a question no member can
  // be served and no card can take back — a permanent pre-start wedge (entry
  // 259). `retiredAnswer` is what 🍾 resolves it at: the value every shape in
  // `shapes.ts` folds it to anyway. → why: R-080.
  { id: 'machines', glyph: '🤖', kind: 'ordinary',
    delegable: true, valueType: 'machines',
    retiredAnswer: { enabled: false, budget: 0 },
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

  // **The price of admission** (entry 94, Ed 2026-08-26). Until then 🪪 was
  // the register itself, an unvalued setting whose crown lived on 🤝; the
  // register is now a fact of the document — who is a member — and 🪪 is
  // what it costs to bring somebody in, on the same scale as 🥾. Every
  // route in pays it: a member's invitation, a stranger's application (🤝
  // is only whether that door is open), and at `pen` any member's word.
  // The founder's own powers over the *act* are the ✉️ door's, not this
  // setting's. Not judge-gated, for 🤝's reason.
  //
  // The id was `membership` until Q903 (Ed, 2026-08-26): it named the
  // register this setting stopped being at entry 94, and a log written
  // under the old id folds to this one at load (`foldLegacyId`).
  { id: 'admission', glyph: '🪪', kind: 'constitutional',
    delegable: true, valueType: 'price',
    rungs: ['assembly', 'proposal', 'pen'],
    consent: {
      ask: 'the cheapest admission you will accept',
      order: priceOrder(['assembly', 'proposal', 'pen']),
    },
    deps: [], judgeGate: false },

  // Not judge-gated: the mock's ceremony gate is exactly the eight settings
  // a judgment is recorded under or counted towards (§9.0b); the join
  // policy touches neither. A delegated applications question still blocks
  // judging while it collects, like any delegated question. Since entry 94
  // the value is one switch — may strangers apply? — and *no* is the
  // protective answer; the price they pay is 🪪's.
  { id: 'applications', glyph: '🤝', kind: 'constitutional',
    delegable: true, valueType: 'applications',
    consent: {
      ask: 'whether you will accept strangers applying to join',
      order: (a, b) => {
        const aa = mayApply(a as ApplicationsValue);
        const ab = mayApply(b as ApplicationsValue);
        if (aa === ab) return 0;
        return aa ? -1 : 1;
      },
    },
    deps: [], judgeGate: false },

  { id: 'displayName', glyph: '✋', kind: 'personal',
    delegable: false, valueType: 'text', deps: [], judgeGate: false },

  { id: 'picture', glyph: '🖼️', kind: 'personal',
    delegable: false, valueType: 'text', deps: [], judgeGate: false },
];

export const CATALOGUE_BY_ID: ReadonlyMap<SettingId, CatalogueEntry> =
  new Map(CATALOGUE.map((e) => [e.id, e]));

export function entryOf(id: SettingId): CatalogueEntry {
  const e = CATALOGUE_BY_ID.get(id);
  if (!e) throw new Error(`unknown setting '${id}'`);
  return e;
}

/** The six settings judging waits on (§9.0b; machines left with Q352, signing folded by Q767). */
export const JUDGE_GATES: readonly SettingId[] =
  CATALOGUE.filter((e) => e.judgeGate).map((e) => e.id);

/** Structural + rung validation for one setting's value. */
export function validateFor(entry: CatalogueEntry, v: unknown): string | null {
  const err = validateValue(entry.valueType, v);
  if (err) return err;
  if (entry.valueType === 'ladder' || entry.valueType === 'price') {
    const rung = entry.valueType === 'ladder'
      ? (v as { rung: string }).rung
      : (v as PriceValue).price;
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
