/**
 * The participant API (SPEC §3, §10 "bring your own AI", D3/D17).
 *
 * The one surface a participant — human client, sim persona, or personal
 * AI — speaks. It enforces the disclosure discipline (SPEC §3.5):
 * judgment is blind. Cards carry texts and rationales, never standings,
 * splits, camps, or routing values. Resolved outcomes (the gazette) are
 * public. Authorship appears only under the `public` visibility setting.
 */

import type { Session } from './session.js';
import type { PatchSet, Span } from './text/types.js';

export interface OptionView {
  id: string;
  /**
   * Per-hunk before/after against the current document. The incumbent
   * option renders as before === after ("keep as is").
   */
  changes: Array<{ before: string; after: string }>;
  rationale: string;
  /** Present only when the constitution sets authorship to `public`. */
  author?: string;
}

export interface CardView {
  kind: 'edge' | 'diagonal';
  /** Card copy per SPEC §4.1. */
  prompt: string;
  a: OptionView;
  b: OptionView;
}

export interface GazetteEntry {
  t: number;
  candidateId: string;
  rationale: string;
}

const INC_PREFIX = 'inc:';

export class ParticipantApi {
  constructor(
    private readonly session: Session,
    readonly participantId: string,
  ) {}

  /** The participant's feed, rendered blind (SPEC §3.1, §8.3). */
  nextCards(n: number, now: number): CardView[] {
    return this.session
      .feed(this.participantId, n, now)
      .map((card) => ({
        kind: card.kind === 'diagonal' ? ('diagonal' as const) : ('edge' as const),
        prompt:
          card.kind === 'diagonal'
            ? 'Which matters more?'
            : 'Which should the group adopt?',
        a: this.renderOption(card.aId),
        b: this.renderOption(card.bId),
      }));
  }

  /** The move (SPEC §3.1): A, B, or indifferent. */
  judge(now: number, card: CardView, choice: 'a' | 'b' | 'indifferent'): void {
    const outcome = choice === 'indifferent' ? 'tie' : choice;
    this.session.judge(now, this.participantId, card.a.id, card.b.id, outcome);
  }

  submit(
    now: number,
    input: { patch: PatchSet; rationale: string },
  ): { id: string } {
    const { id } = this.session.submitCandidate(now, {
      author: this.participantId,
      patch: input.patch,
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

  // -------------------------------------------------------------------------

  private renderOption(id: string): OptionView {
    const lines = this.session.document().split('\n');
    if (id.startsWith(INC_PREFIX)) {
      const race = this.session
        .races()
        .find((r) => r.incumbentId === id);
      const spans: Span[] = race ? race.contested : [];
      return {
        id,
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
      changes: candidate.patch.hunks.map((h) => ({
        before: lines.slice(h.start, h.end).join('\n'),
        after: h.lines.join('\n'),
      })),
      rationale: candidate.rationale,
    };
    if (this.session.constitution.authorshipVisibility === 'public') {
      view.author = candidate.author;
    }
    return view;
  }
}
