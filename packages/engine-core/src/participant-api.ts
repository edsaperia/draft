/**
 * The participant API (SPEC §3, §10 "bring your own AI", D3/D17).
 *
 * The one surface a participant — human client, sim persona, or personal
 * AI — speaks. It enforces the disclosure discipline (SPEC §3.5):
 * judgment is blind. Cards carry texts and rationales, never standings,
 * splits, camps, or routing values. Resolved outcomes (the gazette) are
 * public. Authorship appears only under the `public` visibility setting.
 */

import { INC_PREFIX } from './session.js';
import type { JudgmentView, Session } from './session.js';
import type { EdgeSubtype } from './types.js';
import type { PatchSet, Span } from './text/types.js';

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
  /** Present only when the constitution sets authorship to `public`. */
  author?: string;
}

export interface CardView {
  kind: 'edge' | 'diagonal';
  /** The race of the pair (side A's race on a diagonal) — an id, not a standing. */
  raceId: string;
  /**
   * How much this judgment is worth to the room relative to the others
   * served in the same call (stage 8, SPEC §8.1): the pair's routing
   * value v over the largest v in this feed, so the most pivotal card is
   * 1.0. A ratio of magnitudes; it says nothing about which way.
   */
  urgency: number;
  /**
   * Edge subtype (SPEC §8.3, Q48). Rival cards ask the conditional
   * question and never offer "keep the current text"; a client must
   * render that framing plainly. Absent on diagonals.
   */
  subtype?: EdgeSubtype;
  /** Card copy per SPEC §4.1, §8.3. */
  prompt: string;
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
  outcome: 'adopted' | 'retired';
  p?: number;
  threshold?: number;
  /** The race it resolved in (older logs: derived as r:<candidateId>). */
  raceId: string;
  /** The document version the candidate's patch was measured against at resolution. */
  version: number;
}

export class ParticipantApi {
  constructor(
    private readonly session: Session,
    readonly participantId: string,
  ) {}

  /** The participant's feed, rendered blind (SPEC §3.1, §8.3). */
  nextCards(n: number, now: number): CardView[] {
    const feed = this.session.feed(this.participantId, n, now);
    const top = feed.reduce((m, c) => Math.max(m, c.value), 0);
    return feed
      .map((card) => ({
        raceId: card.raceId,
        urgency: top > 0 ? Math.max(0, Math.min(1, card.value / top)) : 1,
        kind: card.kind === 'diagonal' ? ('diagonal' as const) : ('edge' as const),
        ...(card.subtype ? { subtype: card.subtype } : {}),
        prompt:
          card.kind === 'diagonal'
            ? 'Which matters more?'
            : card.subtype === 'rival'
              ? 'If this text changes, which change is better?'
              : 'Which should the group adopt?',
        a: this.renderOption(card.aId),
        b: this.renderOption(card.bId),
      }));
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

  submit(
    now: number,
    input: {
      patch?: PatchSet;
      setting?: { settingId: string; value: unknown };
      rationale: string;
    },
  ): { id: string } {
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

  /** Every resolution so far, oldest first — adopted and retired alike. */
  outcomes(): OutcomeEntry[] {
    const out: OutcomeEntry[] = [];
    for (const e of this.session.log) {
      const ev = e.event;
      if (ev.type === 'adopted') {
        const c = this.session.getCandidate(ev.candidateId);
        out.push({ t: ev.t, candidateId: ev.candidateId, outcome: 'adopted',
          p: ev.p, threshold: ev.threshold, raceId: ev.raceId ?? `r:${ev.candidateId}`,
          version: c.patch ? Math.max(0, ev.newVersion - 1) : ev.newVersion });
      } else if (ev.type === 'candidate-retired') {
        const c = this.session.getCandidate(ev.id);
        out.push({ t: ev.t, candidateId: ev.id, outcome: 'retired',
          raceId: ev.raceId ?? `r:${ev.id}`, version: c.patch?.baseVersion ?? this.session.currentVersion() });
      }
    }
    return out;
  }

  // -------------------------------------------------------------------------

  private renderOption(id: string): OptionView {
    const lines = this.session.document().split('\n');
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
    if (this.session.constitution.authorshipVisibility === 'public') {
      view.author = candidate.author;
    }
    return view;
  }
}
