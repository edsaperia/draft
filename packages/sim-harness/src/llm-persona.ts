/**
 * LLM persona over the Claude API: a synthetic participant whose
 * judgments and drafts come from a Claude model (default
 * claude-haiku-4-5 — cheap, realistic; D5). Speaks only the
 * ParticipantApi, exactly like the scripted persona and exactly like a
 * human client (D3). Not deterministic — use scripted personas for
 * regression tests, LLM personas for realism runs.
 *
 * Prompts and schemas live in persona-prompts.ts, shared with the
 * subscription-backed transport.
 */

import Anthropic from '@anthropic-ai/sdk';
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

export interface LlmPersonaOptions {
  model?: string;
  client?: Anthropic;
}

export class LlmPersona implements Persona {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(
    readonly profile: PersonaProfile,
    options: LlmPersonaOptions = {},
  ) {
    this.client = options.client ?? new Anthropic();
    this.model = options.model ?? 'claude-haiku-4-5';
  }

  private async ask<T>(userText: string, schema: Record<string, unknown>): Promise<T> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 500,
      system: personaSystemPrompt(this.profile),
      output_config: { format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content: userText }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    return JSON.parse(text) as T;
  }

  async judge(card: CardView): Promise<'a' | 'b' | 'indifferent'> {
    try {
      const result = await this.ask<{ choice: 'a' | 'b' | 'indifferent' }>(
        judgePrompt(card),
        JUDGE_SCHEMA,
      );
      return result.choice;
    } catch {
      return 'indifferent'; // an API failure must not fabricate a preference
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
