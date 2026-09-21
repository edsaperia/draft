/**
 * The participant API (SPEC §3, §10 "bring your own AI", D3/D17).
 *
 * The one surface a participant — human client, sim persona, or personal
 * AI — speaks. It enforces the disclosure discipline (SPEC §3.5):
 * judgment is blind. Cards carry texts and rationales, never standings,
 * splits, camps, or routing values. Resolved outcomes (the gazette) are
 * public. Authorship appears where `authorVisible` says so and nowhere else.
 */

import { INC_PREFIX } from './session.js';
import type { JudgmentView, Session } from './session.js';
import type { Candidate, Card, Constitution, EdgeSubtype } from './types.js';
import type { PatchSet, Span } from './text/types.js';
import { checkAttestation } from './text/attest.js';

/**
 * **The one reveal rule** (SPEC §3.5a, Q770 and entry 31). Every reader of
 * an author — the live option view, the host's clause and record views, the
 * closing record — asks this and nothing else, so the rung is read in one
 * place. An author is visible when:
 *
 *   - the author **signed** the candidate (the elective rungs' opt-in), or
 *   - the disclosure base the candidate was **made under** is `public`, or
 *   - the document is **closed** and that base is `sealed`.
 *
 * Never otherwise: `anonymous` reveals nothing, ever, and `sealed` nothing
 * while the document is open. The base is the candidate's own `disclosure`
 * stamp, **not** the constitution's current value — *a proposal keeps the
 * privacy it was made under* — and falls back to the current value only for
 * a candidate from a log older than the stamp.
 */
export function authorVisible(
  c: Pick<Candidate, 'signed' | 'disclosure'>,
  constitution: Pick<Constitution, 'authorshipVisibility'>,
  opts: { closed: boolean },
): boolean {
  if (c.signed) return true;
  const base = c.disclosure ?? constitution.authorshipVisibility;
  if (base === 'public') return true;
  return opts.closed && base === 'sealed';
}

export interface OptionView {
  id: string;
  /**
   * Present (true) exactly when this option is the incumbent — the
   * current text or standing value — so clients need not string-match
   * the incumbent id prefix.
   */
  incumbent?: boolean;
  /**
   * Per-hunk before/after against the current document. The incumbent
   * option renders as before === after ("keep as is"). Empty on a
   * setting option, whose content is `setting` instead.
   */
  changes: Array<{ before: string; after: string }>;
  /**
   * A setting race's option (SPEC §9.6, Q390): the setting and the value
   * this option stands for — for the incumbent, the value as it stands.
   * The client renders the value in the room's own vocabulary; the
   * engine never interprets it.
   */
  setting?: { settingId: string; value: unknown };
  rationale: string;
  /**
   * Present when the author signed the candidate, or when the disclosure
   * the candidate was made under names them now (`authorVisible`).
   */
  author?: string;
}

export interface CardView {
  kind: 'edge' | 'diagonal';
  /** The race of the pair (side A's race on a diagonal) — an id, not a standing. */
  raceId: string;
  /**
   * How much this judgment is worth to the room against the hand it was
   * priced beside (stage 8, SPEC §8.1): the pair's routing value v over
   * the largest v in that hand, so the hand's most pivotal card is 1.0.
   * A pair from **outside** the hand (`askOn`) carries its own v over the
   * same top (Q98, Ed 2026-09-14), so it sorts honestly below the hand
   * and in order among its fellows. A ratio of magnitudes; it says
   * nothing about which way.
   */
  urgency: number;
  /**
   * Edge subtype (SPEC §8.3, Q48). Rival cards ask the conditional
   * question and never offer "keep the current text"; the card carries no
   * prompt saying so (Ed, Q95: members need not learn the rules on every
   * card — the `prompt` field left with SPEC v0.108, tidy item 60). Absent
   * on diagonals.
   */
  subtype?: EdgeSubtype;
  a: OptionView;
  b: OptionView;
}

export interface GazetteEntry {
  t: number;
  candidateId: string;
  rationale: string;
}

/**
 * A resolved question (SPEC §3.5: outcomes are public the moment they
 * happen): a candidate adopted — with the confidence it carried at and
 * the threshold it cleared, the record's own numbers — or retired, the
 * incumbent having held. Withdrawals are the author's act, not an outcome.
 */
export interface OutcomeEntry {
  t: number;
  candidateId: string;
  /** `undecided` is the close's third outcome (SPEC §4.6): the incumbent stood, unbeaten. */
  outcome: 'adopted' | 'retired' | 'undecided';
  p?: number;
  threshold?: number;
  /** The race it resolved in (older logs: derived as r:<candidateId>). */
  raceId: string;
  /** The document version the candidate's patch was measured against at resolution. */
  version: number;
  /**
   * Why, where the resolution had a reason somebody gave (R-056): the
   * convenor's refusal under 🛡️ on the Text. This is what its author
   * reads on their sealed record.
   */
  reason?: string;
  /**
   * **The cap mark** (SPEC §4.2, R-051): the ranking fit this adoption was
   * decided on reached its iteration cap with the gradient still moving.
   * Present only on an `adopted` entry, and only where the fit did not
   * converge — absent means converged, here as in the event. The two
   * numbers are for an auditor; the surface prints one sentence and none
   * of the arithmetic (STYLE §1, §2).
   */
  cappedFit?: { iterations: number; gradMax: number };
  /**
   * **What the floor tested, at the moment it was met** (Q1439): how many
   * members had preferred the winner to the current text, and the floor that
   * decision was taken against. Both move with the clock while a race runs
   * (§8.2), so the record carries the adoption's own pair off the `adopted`
   * event rather than re-deriving today's. Absent on an adoption older than
   * the rule — an optional pair, so a log from before it folds unchanged.
   */
  approvals?: number;
  floor?: number;
  /**
   * **And how many never answered** (Q1452): the members of E whose 💤 period
   * on the winner's pair had run at the moment the batch decided — the third
   * of the decision's own numbers, off the same event and absent on the same
   * older logs. The card prints it as *n did not answer in time*, and says
   * nothing where it is zero.
   */
  abstained?: number;
}

/** The largest routing value in a hand — what every `urgency` is a fraction of. */
function handTop(hand: readonly Card[]): number {
  return hand.reduce((m, c) => Math.max(m, c.value), 0);
}

/**
 * One pair's value as a fraction of the hand's best (SPEC §8.1), clamped
 * to [0, 1] — a pair from outside the hand can in principle out-value
 * everything dealt, and the scale tops out at the flame either way.
 * **Where the hand prices nothing, everything reads 1**: with no magnitude
 * to be relative to there is no order to report, and a hand of zero-valued
 * cards has read 1 since stage 8 — an outside pair reads 1 for the same
 * reason, and never below cards worth nothing (Q98, Ed 2026-09-14).
 */
function relativeUrgency(value: number, top: number): number {
  return top > 0 ? Math.max(0, Math.min(1, value / top)) : 1;
}

export class ParticipantApi {
  constructor(
    private readonly session: Session,
    readonly participantId: string,
  ) {}

  /** The participant's feed, rendered blind (SPEC §3.1, §8.3). */
  nextCards(n: number, now: number): CardView[] {
    const feed = this.session.feed(this.participantId, n, now);
    const top = handTop(feed);
    return feed.map((card) => this.renderCard(card, relativeUrgency(card.value, top)));
  }

  /**
   * **What one race can still ask this participant, whether or not the hand
   * holds it** (Q1202, Ed 2026-09-07). The feed is a hand of `n`, so a race
   * with an unjudged pair for this participant can be out of it; a client
   * that marks a race *waiting on other people* only when nothing is left
   * to ask needs the per-race answer, and a mark that says *you can act*
   * needs the pair to act on. This is both: the card `feed` would deal on
   * the race, rendered blind exactly as `nextCards` renders it, or null
   * when the race has nothing left to ask. `judge` takes it like any dealt
   * card.
   *
   * **And it carries its own value against the hand's own top** (Q98, Ed
   * 2026-09-14): the same pivotality `feed` prices pairs by, over the
   * largest value in the hand of `n` this participant would be dealt at
   * `now` — so an outside race sorts below the hand it is beside and in
   * order among the other outside races, rather than tying with them at 0
   * as it did from Q1202 to here. The reading of `urgency` is unchanged:
   * the value of the next comparison you would actually be handed. The
   * hand is the memoised one (`feed`, Q1324), so pricing every race in a
   * view costs one deal, not one per race; `n` and `now` must be the
   * caller's own `nextCards` arguments or the two are priced against
   * different tops.
   *
   * **Whether** a pair is left to ask still does not depend on the clock —
   * and neither does the top, the threshold being a common divisor that moves
   * no race past another (see `feed`'s memo). **Which** pair comes first does,
   * since Q1439: a race short of its floor leads with the leader against the
   * current text, and whether it is short depends on who has abstained by now.
   * So `now` goes to the per-race read as well as to the hand.
   */
  askOn(raceId: string, n: number, now: number): CardView | null {
    const card = this.session.askOn(this.participantId, raceId, now);
    if (card === null) return null;
    const top = handTop(this.session.feed(this.participantId, n, now));
    return this.renderCard(card, relativeUrgency(card.value, top));
  }

  /**
   * The blind rendering of a routed card: texts and rationales, never the
   * routing value — `urgency` is the caller's ratio of magnitudes, and
   * `Card.value` never reaches the wire.
   */
  private renderCard(card: Card, urgency: number): CardView {
    return {
      raceId: card.raceId,
      urgency,
      kind: card.kind === 'diagonal' ? ('diagonal' as const) : ('edge' as const),
      ...(card.subtype ? { subtype: card.subtype } : {}),
      a: this.renderOption(card.aId),
      b: this.renderOption(card.bId),
    };
  }

  /**
   * The move (SPEC §3.1): A, B, or indifferent. Judging a card whose
   * pair this participant already judged is the revision (SPEC §4.4,
   * Q50) — allowed while the race is open and its ground unchanged; a
   * card from before a ground shift is stale and rejected, and the pair
   * returns to the feed as a fresh question.
   */
  judge(now: number, card: CardView, choice: 'a' | 'b' | 'indifferent'): void {
    const outcome = choice === 'indifferent' ? 'tie' : choice;
    this.session.judge(now, this.participantId, card.a.id, card.b.id, outcome);
  }

  /**
   * The participant's own judgments, with supersession and locking
   * flags — one's own moves are one's own data (SPEC §11: receipts
   * already reference them); no one else's are visible.
   */
  myJudgments(): JudgmentView[] {
    return this.session
      .judgments()
      .filter((j) => j.participantId === this.participantId);
  }

  /**
   * Propose (SPEC §3.3). **A text proposal must say what it is replacing**
   * (SPEC §2.1, §2.4 → why: R-136): every replacement hunk carries `was` and
   * every pure insertion `after`, and a patch carrying neither is refused
   * here — this being the participant boundary, which a sim persona and a
   * personal AI speak exactly as a human client does. `attest()` fills them
   * from the text the draft was written against.
   *
   * **The version guard speaks first** where it applies: a patch against a
   * version that is no longer current is stale in the older, plainer way,
   * and *targets version N* is the truer sentence for it.
   */
  submit(
    now: number,
    input: {
      patch?: PatchSet;
      setting?: { settingId: string; value: unknown };
      rationale: string;
    },
  ): { id: string } {
    if (input.patch && input.patch.baseVersion === this.session.currentVersion()) {
      // the lines the session holds, never the text split back (Q1491)
      checkAttestation(this.session.linesAt(this.session.currentVersion()),
        input.patch.hunks, { required: true });
    }
    const { id } = this.session.submitCandidate(now, {
      author: this.participantId,
      ...(input.patch ? { patch: input.patch } : {}),
      ...(input.setting ? { setting: input.setting } : {}),
      rationale: input.rationale,
    });
    return { id };
  }

  withdraw(now: number, candidateId: string): void {
    const c = this.session.getCandidate(candidateId);
    if (c.author !== this.participantId) {
      throw new Error('can only withdraw your own candidate');
    }
    this.session.withdraw(now, candidateId);
  }

  document(): string {
    return this.session.document();
  }

  currentVersion(): number {
    return this.session.currentVersion();
  }

  balance(now: number): number {
    return this.session.balance(this.participantId, now);
  }

  /** The wallet with its clock (Q503a): balance, time to the next drip, interval, cap. */
  wallet(now: number): { balance: number; nextDripInMs: number; dripIntervalMs: number; cap: number } {
    const l = this.session.ledgerInfo(this.participantId, now);
    return { balance: l.balance, nextDripInMs: Number.isFinite(l.nextDripT) ? Math.max(0, l.nextDripT - now) : Infinity,
      dripIntervalMs: l.dripIntervalMs, cap: l.cap };
  }

  /** Own candidates only; states, not standings. */
  myCandidates(): Array<{ id: string; state: string; rationale: string }> {
    return this.session
      .allCandidates()
      .filter((c) => c.author === this.participantId)
      .map((c) => ({ id: c.id, state: c.state, rationale: c.rationale }));
  }

  /**
   * Browse the live field (SPEC §8.3: feeds are suggestions; anything
   * live can be browsed). Blind: options only, no standings, no order
   * signal (sorted by id).
   */
  liveCandidates(): OptionView[] {
    return this.session
      .allCandidates()
      .filter((c) => c.state === 'live')
      .map((c) => this.renderOption(c.id))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  /** Resolved outcomes are public immediately (SPEC §3.5). */
  gazette(): GazetteEntry[] {
    return this.session.log
      .filter((e) => e.event.type === 'adopted')
      .map((e) => {
        const event = e.event as Extract<
          typeof e.event,
          { type: 'adopted' }
        >;
        return {
          t: event.t,
          candidateId: event.candidateId,
          rationale: this.session.getCandidate(event.candidateId).rationale,
        };
      });
  }

  /**
   * Every resolution so far, oldest first — adopted and retired alike. The
   * same for every participant, and a walk over the whole log, so it is
   * derived once per state version on the session (Q1324) and copied out.
   */
  outcomes(): OutcomeEntry[] {
    return this.session.derived('outcomes', () => this.buildOutcomes()).slice();
  }

  private buildOutcomes(): OutcomeEntry[] {
    const out: OutcomeEntry[] = [];
    for (const e of this.session.log) {
      const ev = e.event;
      if (ev.type === 'adopted') {
        const c = this.session.getCandidate(ev.candidateId);
        out.push({ t: ev.t, candidateId: ev.candidateId, outcome: 'adopted',
          p: ev.p, threshold: ev.threshold, raceId: ev.raceId ?? `r:${ev.candidateId}`,
          version: c.patch ? Math.max(0, ev.newVersion - 1) : ev.newVersion,
          // spread conditionally, as `reason` is: the key is absent, never
          // `undefined`, because absent is what means converged (R-051)
          ...(ev.cappedFit ? { cappedFit: ev.cappedFit } : {}),
          // the decision's own numbers (Q1439, Q1452), absent on an older log
          ...(typeof ev.approvals === 'number' ? { approvals: ev.approvals } : {}),
          ...(typeof ev.floor === 'number' ? { floor: ev.floor } : {}),
          ...(typeof ev.abstained === 'number' ? { abstained: ev.abstained } : {}) });
      } else if (ev.type === 'candidate-retired') {
        const c = this.session.getCandidate(ev.id);
        out.push({ t: ev.t, candidateId: ev.id, outcome: 'retired',
          raceId: ev.raceId ?? `r:${ev.id}`, version: c.patch?.baseVersion ?? this.session.currentVersion(),
          ...(ev.reason ? { reason: ev.reason } : {}) });
      } else if (ev.type === 'candidate-undecided') {
        const c = this.session.getCandidate(ev.id);
        out.push({ t: ev.t, candidateId: ev.id, outcome: 'undecided',
          raceId: ev.raceId, version: c.patch?.baseVersion ?? this.session.currentVersion() });
      }
    }
    return out;
  }

  // -------------------------------------------------------------------------

  private renderOption(id: string): OptionView {
    // the document's lines, split once per state rather than once per option
    // rendered (Q1324): a view renders two options per card and one card per
    // askable race, each of which joined and re-split a hundred lines
    const lines = this.session.derived('api:lines', () => this.session.document().split('\n'));
    if (id.startsWith(INC_PREFIX)) {
      const race = this.session
        .races()
        .find((r) => r.incumbentId === id);
      if (race?.settingId !== undefined) {
        // The standing value is the incumbent (Q390).
        return {
          id,
          incumbent: true,
          changes: [],
          setting: { settingId: race.settingId, value: this.session.standing(race.settingId) },
          rationale: '',
        };
      }
      const spans: Span[] = race ? race.contested : [];
      return {
        id,
        incumbent: true,
        changes: spans.map((s) => {
          const text = lines.slice(s.start, s.end).join('\n');
          return { before: text, after: text };
        }),
        rationale: '',
      };
    }
    const candidate = this.session.getCandidate(id);
    const view: OptionView = {
      id,
      changes: (candidate.patch?.hunks ?? []).map((h) => ({
        before: lines.slice(h.start, h.end).join('\n'),
        after: h.lines.join('\n'),
      })),
      ...(candidate.setting ? { setting: candidate.setting } : {}),
      rationale: candidate.rationale,
    };
    if (authorVisible(candidate, this.session.constitution, { closed: this.session.closed })) {
      view.author = candidate.author;
    }
    return view;
  }
}
