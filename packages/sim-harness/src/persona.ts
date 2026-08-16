/**
 * Personas: synthetic participants. Every persona speaks only the
 * ParticipantApi — no sim backdoor (D3) — so a persona and a human
 * client are interchangeable.
 *
 * The scripted persona is fully deterministic given the run seed: it
 * evaluates options by the scenario's latent utility model with a
 * persona-specific noise term, ties below a threshold becoming honest
 * indifference (SPEC §3.2).
 */

import type { CardView, OptionView, ParticipantApi, PatchSet, Rng } from '../../engine-core/src/index.js';
import {
  conditionalUtility,
  currentPositions,
  utility,
  type Alternative,
  type Issue,
  type PersonaProfile,
  type Scenario,
} from './scenario.js';

export interface DraftProposal {
  patch: PatchSet;
  rationale: string;
}

/**
 * Optional intent hooks (QUESTIONS #8/#9 evidence): scripted personas
 * expose moments where they *wanted* to act but the economy said no.
 * Purely observational — a recorder must never change behavior.
 */
export interface PersonaTelemetry {
  /** Wanted to draft this bout (draftiness roll passed) but held no token. */
  starved?(participantId: string, now: number): void;
  /** Wanted to answer a card by drafting (propose C) but could not afford the stake. */
  proposeCBlocked?(participantId: string, now: number): void;
}

export interface Persona {
  profile: PersonaProfile;
  /**
   * The api is the persona's own participant surface (document, gazette) —
   * needed because coupled scenarios make an option's value depend on
   * where the rest of the document currently sits. Still no backdoor.
   */
  judge(card: CardView, api: ParticipantApi): Promise<'a' | 'b' | 'indifferent'>;
  /** Called once per bout; return null to not draft. */
  draft(api: ParticipantApi, now: number): Promise<DraftProposal | null>;
  /**
   * Optional propose-C policy (SPEC §3.3, QUESTIONS #9): offered each
   * served card before judging. Returning a proposal answers the card by
   * drafting — the runner opens the composer, which costs no comparison
   * since SPEC v0.16, and submits the draft as a brand-new candidate at
   * normal stake. Personas
   * without the method judge every card (the original path, unchanged).
   */
  considerProposeC?(
    card: CardView,
    api: ParticipantApi,
    now: number,
  ): Promise<DraftProposal | null>;
}

export const TIE_THRESHOLD = 0.08;

/** Fallback for text the scenario doesn't know (e.g. LLM-drafted lines). */
const UNKNOWN_ALT: Alternative = { text: '', position: 0, quality: 0.3, rationale: '' };

export class ScriptedPersona implements Persona {
  constructor(
    readonly profile: PersonaProfile,
    protected readonly scenario: Scenario,
    protected readonly rng: Rng,
    protected readonly telemetry?: PersonaTelemetry,
  ) {}

  protected findIssueByText(text: string): { issue: Issue; alt: Alternative } | null {
    for (const issue of this.scenario.issues) {
      for (const alt of issue.alternatives) {
        if (alt.text === text) return { issue, alt };
      }
    }
    return null;
  }

  protected optionValue(option: OptionView, positions: Map<string, number>): number {
    let value = 0;
    for (const change of option.changes) {
      const match = this.findIssueByText(change.after);
      if (match) {
        value += conditionalUtility(
          this.profile, this.scenario, match.issue.key, match.alt, positions,
        );
      } else value += utility(this.profile, 'unknown', UNKNOWN_ALT);
    }
    return value;
  }

  private optionSalience(option: OptionView): number {
    for (const change of option.changes) {
      const match =
        this.findIssueByText(change.after) ?? this.findIssueByText(change.before);
      if (match) return this.profile.salience[match.issue.key] ?? 0.3;
    }
    return 0.3;
  }

  private noise(): number {
    // Sum of two uniforms, centered: cheap symmetric noise.
    return (this.rng.next() + this.rng.next() - 1) * this.profile.noise;
  }

  async judge(card: CardView, api: ParticipantApi): Promise<'a' | 'b' | 'indifferent'> {
    const positions = currentPositions(this.scenario, api.document().split('\n'));
    const [va, vb] =
      card.kind === 'diagonal'
        ? [this.optionSalience(card.a), this.optionSalience(card.b)]
        : [this.optionValue(card.a, positions), this.optionValue(card.b, positions)];
    const diff = va - vb + this.noise();
    if (Math.abs(diff) < TIE_THRESHOLD) return 'indifferent';
    return diff > 0 ? 'a' : 'b';
  }

  async draft(api: ParticipantApi, now: number): Promise<DraftProposal | null> {
    if (this.rng.next() >= this.profile.draftiness) return null;
    if (api.balance(now) < 1) {
      // Starvation (QUESTIONS #8): the persona wanted to draft and could not.
      this.telemetry?.starved?.(this.profile.id, now);
      return null;
    }
    const lines = api.document().split('\n');
    const liveTexts = new Set(
      api.liveCandidates().flatMap((c) => c.changes.map((ch) => ch.after)),
    );
    // Most-salient unsatisfied issue first.
    const issues = [...this.scenario.issues].sort(
      (a, b) => (this.profile.salience[b.key] ?? 0) - (this.profile.salience[a.key] ?? 0),
    );
    const positions = currentPositions(this.scenario, lines);
    for (const issue of issues) {
      const current = lines[issue.line];
      if (current === undefined) continue;
      const currentMatch = issue.alternatives.find((alt) => alt.text === current);
      let best = currentMatch ?? UNKNOWN_ALT;
      let bestU = conditionalUtility(this.profile, this.scenario, issue.key, best, positions);
      for (const alt of issue.alternatives) {
        const u = conditionalUtility(this.profile, this.scenario, issue.key, alt, positions);
        if (u > bestU) {
          best = alt;
          bestU = u;
        }
      }
      if (best.text === current) continue; // happy with the status quo here
      if (liveTexts.has(best.text)) continue; // already proposed by someone
      return {
        patch: {
          baseVersion: api.currentVersion(),
          hunks: [{ start: issue.line, end: issue.line + 1, lines: [best.text] }],
        },
        rationale: best.rationale,
      };
    }
    return null;
  }
}
