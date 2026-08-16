/**
 * A scripted persona with a propose-C policy (SPEC §3.3, QUESTIONS #9).
 *
 * When served a card whose issue it could answer better than either
 * option shown, it sometimes (profile.proposeC) answers by drafting: the
 * runner opens the composer — which costs no comparison since SPEC
 * v0.16 — and submits the persona's preferred alternative as a
 * brand-new candidate at normal stake. Everything else is inherited
 * ScriptedPersona behavior, so a propensity of 0 differs from the plain
 * persona only by one extra (deterministic) rng draw per edge card —
 * arms with different propensities share the same stream until their
 * first divergence, which keeps cross-arm comparisons tight.
 */

import type { CardView, ParticipantApi } from '../../engine-core/src/index.js';
import { ScriptedPersona, TIE_THRESHOLD, type DraftProposal } from './persona.js';
import { conditionalUtility, currentPositions, type Issue } from './scenario.js';

export class ProposeCPersona extends ScriptedPersona {
  async considerProposeC(
    card: CardView,
    api: ParticipantApi,
    now: number,
  ): Promise<DraftProposal | null> {
    if (card.kind !== 'edge') return null;
    // Roll unconditionally (before any early return below) so every
    // propensity arm consumes the identical stream per served edge card.
    const roll = this.rng.next();
    const propensity = this.profile.proposeC ?? 0;
    if (roll >= propensity) return null;

    const issue = this.issueOfCard(card);
    if (issue === null) return null;
    const lines = api.document().split('\n');
    const positions = currentPositions(this.scenario, lines);

    // Own best alternative for the contested issue, coupling-aware.
    let best: Issue['alternatives'][number] | null = null;
    let bestU = -Infinity;
    for (const alt of issue.alternatives) {
      const u = conditionalUtility(this.profile, this.scenario, issue.key, alt, positions);
      if (u > bestU) {
        best = alt;
        bestU = u;
      }
    }
    if (best === null) return null;

    // Propose C is weak dissatisfaction with both (SPEC §3.3): only
    // draft when the own-best clearly beats both options shown.
    const va = this.optionValue(card.a, positions);
    const vb = this.optionValue(card.b, positions);
    if (bestU <= Math.max(va, vb) + TIE_THRESHOLD) return null;

    // Nothing to add if the best text is already on the card, is the
    // current document line, or is already live in the race.
    const offered = new Set(
      [...card.a.changes, ...card.b.changes].map((c) => c.after),
    );
    if (offered.has(best.text)) return null;
    if (lines[issue.line] === best.text) return null;
    const liveTexts = new Set(
      api.liveCandidates().flatMap((c) => c.changes.map((ch) => ch.after)),
    );
    if (liveTexts.has(best.text)) return null;

    if (api.balance(now) < 1) {
      // The stake blocked a draft the persona wanted (QUESTIONS #9).
      this.telemetry?.proposeCBlocked?.(this.profile.id, now);
      return null;
    }
    return {
      patch: {
        baseVersion: api.currentVersion(),
        hunks: [{ start: issue.line, end: issue.line + 1, lines: [best.text] }],
      },
      rationale: best.rationale,
    };
  }

  private issueOfCard(card: CardView): Issue | null {
    for (const option of [card.a, card.b]) {
      for (const ch of option.changes) {
        const match =
          this.findIssueByText(ch.after) ?? this.findIssueByText(ch.before);
        if (match) return match.issue;
      }
    }
    return null;
  }
}
