/**
 * The commentator: a spectator-feed LLM that narrates a live run for
 * whoever is tailing the log. Presentation layer, NOT a participant — it
 * speaks no participant API, holds no tokens, and unlike the players it is
 * shown everything: the roster's temperaments (including hidden agendas),
 * who drafted what, and the adoption bar. Dramatic irony is the product.
 * Blind discipline (SPEC §3.5) binds participants; the commentary box has
 * always been allowed to see the whole pitch.
 *
 * Subscription transport (Agent SDK), same constraints as the personas:
 * tool-less, settingSources: [], local use only.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import type { Scenario } from './scenario.js';

const COMMENT_EVERY = 15; // events between scheduled commentary breaks
const MAX_COMMENTS = 45; // hard cap per run
const MEMORY = 6; // own previous comments carried for arc continuity

function systemPrompt(scenario: Scenario, windowHours: number): string {
  const roster = scenario.personas
    .map((p) => `- ${p.handle}: ${p.temperament}`)
    .join('\n');
  return `You are the live commentator for a session of "draft", a group-drafting engine: fourteen members of the Hollow Oak Club are rewriting their house charter over a ${windowHours}-hour window. Patches race pairwise; blind judgments accumulate; a race adopts when the leader's win-probability clears a confidence bar that rises from 0.60 to 0.95 over the window. Participants judge blind — no authorship, no standings. You are NOT a participant: you see everything, including who wrote what and each member's private temperament, and your audience loves dramatic irony.

The cast (private notes in your commentary booth — the room cannot see these):
${roster}

Your job: brief, vivid colour commentary for someone tailing the log. Style: BBC cricket commentary meets a select-committee sketch writer — dry, affectionate, occasionally gasping. 2–4 sentences per update, no headers, no lists. Track storylines across updates (feuds, streaks, patterns — especially any member quietly pursuing an agenda the room cannot see). Name names. Refer to clauses plainly (the money line, the guest bedroom). Never invent events that are not in the log excerpt; interpretation is yours, facts are not. If an adoption just happened, lead with it.`;
}

export class SubscriptionCommentator {
  private previous: string[] = [];
  private buffer: string[] = [];
  private sinceLast = 0;
  private comments = 0;
  private chain: Promise<void> = Promise.resolve();
  private readonly system: string;

  constructor(
    scenario: Scenario,
    windowHours: number,
    private readonly model: string,
    private readonly emit: (line: string) => void,
  ) {
    this.system = systemPrompt(scenario, windowHours);
  }

  /** Feed every progress line; commentary fires on a cadence + adoptions. */
  observe(line: string): void {
    this.buffer.push(line);
    this.sinceLast++;
    const adoption = line.includes('*** ADOPTED');
    if ((this.sinceLast >= COMMENT_EVERY || adoption) && this.comments < MAX_COMMENTS) {
      this.comments++;
      this.sinceLast = 0;
      const events = this.buffer.splice(0);
      // Serialize on a promise chain: commentary lags play, never blocks it.
      this.chain = this.chain.then(() => this.commentate(events)).catch(() => {});
    }
  }

  /** Await outstanding commentary (call before finishing the run). */
  flush(): Promise<void> {
    return this.chain;
  }

  private async commentate(events: string[]): Promise<void> {
    const context =
      (this.previous.length
        ? `Your recent commentary (for continuity):\n${this.previous.join('\n')}\n\n`
        : '') +
      `New events from the log:\n${events.join('\n')}\n\nYour next commentary update:`;
    try {
      for await (const message of query({
        prompt: context,
        options: {
          model: this.model,
          systemPrompt: this.system,
          allowedTools: [],
          maxTurns: 2,
          settingSources: [],
        },
      })) {
        if (message.type === 'result') {
          if (message.subtype === 'success') {
            const text = message.result.trim();
            if (text) {
              this.previous.push(text);
              if (this.previous.length > MEMORY) this.previous.shift();
              this.emit(`\n🎙  ${text}\n`);
            }
          }
          return;
        }
      }
    } catch {
      // Commentary is garnish: a failed call never disturbs the run.
    }
  }
}
