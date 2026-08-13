/**
 * Subscription persona: same prompts and behavior as the API-key LLM
 * persona, but transported through the Claude Agent SDK — headless
 * Claude Code — so usage bills against the local Claude subscription
 * (Max plan) rather than a pay-per-token Console account. Personal /
 * local use only: hosted deployments (P4) need a real API key.
 *
 * Each call runs single-turn and tool-less, with project settings
 * excluded (settingSources: []) so the repo's CLAUDE.md never leaks
 * into persona context. Slower per call than the raw API (a harness
 * process per query); fine for realism runs.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import type { CardView, ParticipantApi } from '../../engine-core/src/index.js';
import type { DraftProposal, Persona } from './persona.js';
import type { PersonaProfile } from './scenario.js';
import {
  DRAFT_SCHEMA,
  JUDGE_SCHEMA,
  draftPrompt,
  judgePrompt,
  personaSystemPrompt,
  validateDraftResult,
  type DraftResult,
} from './persona-prompts.js';

const DEFAULT_MODEL = 'claude-haiku-4-5';

export interface SubscriptionPersonaOptions {
  model?: string;
}

export class SubscriptionPersona implements Persona {
  private readonly model: string;

  constructor(
    readonly profile: PersonaProfile,
    options: SubscriptionPersonaOptions = {},
  ) {
    this.model = options.model ?? DEFAULT_MODEL;
  }

  private async ask<T>(userText: string, schema: Record<string, unknown>): Promise<T> {
    for await (const message of query({
      prompt: userText,
      options: {
        model: this.model,
        systemPrompt: personaSystemPrompt(this.profile),
        allowedTools: [],
        // Structured output consumes a turn of its own (the answer arrives
        // via a tool call); maxTurns 1 cuts it off as error_max_turns.
        maxTurns: 3,
        settingSources: [],
        outputFormat: { type: 'json_schema', schema },
      },
    })) {
      if (message.type === 'result') {
        if (message.subtype === 'success') {
          const m = message as typeof message & { structured_output?: unknown };
          if (m.structured_output !== undefined) return m.structured_output as T;
          return JSON.parse(message.result) as T;
        }
        throw new Error(`query failed: ${message.subtype}`);
      }
    }
    throw new Error('no result message received');
  }

  async judge(card: CardView): Promise<'a' | 'b' | 'indifferent'> {
    try {
      const result = await this.ask<{ choice: 'a' | 'b' | 'indifferent' }>(
        judgePrompt(card),
        JUDGE_SCHEMA,
      );
      return result.choice;
    } catch {
      return 'indifferent'; // a transport failure must not fabricate a preference
    }
  }

  async draft(api: ParticipantApi, now: number): Promise<DraftProposal | null> {
    if (api.balance(now) < 1) return null;
    try {
      const result = await this.ask<DraftResult>(draftPrompt(api, now), DRAFT_SCHEMA);
      return validateDraftResult(api, result);
    } catch {
      return null;
    }
  }
}

/**
 * One cheap end-to-end probe: returns null on success, else the failure
 * message. Used by the CLI to fail fast with a useful explanation.
 */
export async function probeSubscription(model: string = DEFAULT_MODEL): Promise<string | null> {
  try {
    for await (const message of query({
      prompt: 'Reply with exactly: OK',
      options: {
        model,
        allowedTools: [],
        maxTurns: 2,
        settingSources: [],
      },
    })) {
      if (message.type === 'result') {
        return message.subtype === 'success' ? null : `query failed: ${message.subtype}`;
      }
    }
    return 'no result message received';
  } catch (err) {
    return String(err);
  }
}
