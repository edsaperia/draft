/**
 * LLM persona: a synthetic participant whose judgments and drafts come
 * from a Claude model (default claude-haiku-4-5 — cheap, realistic; D5).
 * Speaks only the ParticipantApi, exactly like the scripted persona and
 * exactly like a human client (D3). Not deterministic — use scripted
 * personas for regression tests, LLM personas for realism runs.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { CardView, ParticipantApi } from '../../engine-core/src/index.js';
import type { DraftProposal, Persona } from './persona.js';
import type { PersonaProfile } from './scenario.js';

const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    choice: {
      type: 'string',
      enum: ['a', 'b', 'indifferent'],
      description:
        "'a' or 'b' for a clear preference; 'indifferent' when you genuinely cannot tell them apart or do not care",
    },
    reason: { type: 'string', description: 'One sentence.' },
  },
  required: ['choice', 'reason'],
  additionalProperties: false,
} as const;

const DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['draft', 'pass'] },
    line: {
      type: 'integer',
      description: 'The 0-based line number to rewrite (from the numbered document).',
    },
    newText: { type: 'string', description: 'The complete replacement line.' },
    rationale: {
      type: 'string',
      description: 'Your pinned rationale, max 280 characters, persuasive and concrete.',
    },
  },
  required: ['action', 'line', 'newText', 'rationale'],
  additionalProperties: false,
} as const;

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

  private systemPrompt(): string {
    const stances = Object.entries(this.profile.stances)
      .map(([k, v]) => `${k}: ${describeStance(v)}`)
      .join('; ');
    const salience = Object.entries(this.profile.salience)
      .map(([k, v]) => `${k}: ${v >= 0.7 ? 'cares a lot' : v >= 0.4 ? 'cares somewhat' : 'cares little'}`)
      .join('; ');
    return [
      `You are ${this.profile.handle}, a member of a small association collaboratively`,
      `redrafting its charter through anonymous pairwise judgments.`,
      `Temperament: ${this.profile.temperament}`,
      `Your leanings per topic (-1 = keep things loose/informal, +1 = formalise/regulate): ${stances}.`,
      `How much each topic matters to you: ${salience}.`,
      `Judge and draft in character. Be honest: choose 'indifferent' when options genuinely`,
      `seem equivalent to you — never fabricate a preference.`,
      `Respond with JSON only, matching the requested schema exactly.`,
    ].join('\n');
  }

  private async ask<T>(userText: string, schema: Record<string, unknown>): Promise<T> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 500,
      system: this.systemPrompt(),
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
    const render = (label: string, option: CardView['a']): string => {
      const changes = option.changes
        .map((c) =>
          c.before === c.after
            ? `KEEP AS IS: "${c.before}"`
            : `BEFORE: "${c.before}"\nAFTER: "${c.after}"`,
        )
        .join('\n');
      const rationale = option.rationale ? `Rationale: "${option.rationale}"` : '(the status quo)';
      return `Option ${label}:\n${changes}\n${rationale}`;
    };
    const question =
      card.kind === 'diagonal'
        ? 'These two proposals touch different parts of the document and could both happen. Which one MATTERS MORE to you — if only one could land, which should it be?'
        : 'Which of these two versions should the group adopt?';
    try {
      const result = await this.ask<{ choice: 'a' | 'b' | 'indifferent' }>(
        `${question}\n\n${render('A', card.a)}\n\n${render('B', card.b)}`,
        JUDGE_SCHEMA,
      );
      return result.choice;
    } catch {
      return 'indifferent'; // an API failure must not fabricate a preference
    }
  }

  async draft(api: ParticipantApi, now: number): Promise<DraftProposal | null> {
    if (api.balance(now) < 1) return null;
    const lines = api.document().split('\n');
    const numbered = lines.map((l, i) => `${i}: ${l}`).join('\n');
    const live = api
      .liveCandidates()
      .map((c) => c.changes.map((ch) => `- "${ch.after}"`).join('\n'))
      .join('\n');
    const prompt = [
      `The current document, with line numbers:`,
      numbered,
      ``,
      `Replacement lines already proposed by others (do NOT duplicate these):`,
      live || '(none)',
      ``,
      `You have ${api.balance(now).toFixed(0)} proposal tokens. If some line conflicts with`,
      `your views strongly enough to spend one, propose a single-line rewrite. Otherwise pass.`,
      `Rewrite at most one line. Keep the line's role in the document (headings stay headings).`,
    ].join('\n');
    try {
      const result = await this.ask<{
        action: 'draft' | 'pass';
        line: number;
        newText: string;
        rationale: string;
      }>(prompt, DRAFT_SCHEMA);
      if (result.action !== 'draft') return null;
      if (!Number.isInteger(result.line) || result.line < 0 || result.line >= lines.length) {
        return null;
      }
      if (result.newText.trim() === '' || result.newText === lines[result.line]) return null;
      return {
        patch: {
          baseVersion: api.currentVersion(),
          hunks: [
            { start: result.line, end: result.line + 1, lines: [result.newText] },
          ],
        },
        rationale: result.rationale.slice(0, 300),
      };
    } catch {
      return null;
    }
  }
}

function describeStance(v: number): string {
  if (v > 0.5) return 'strongly formalise';
  if (v > 0.15) return 'mildly formalise';
  if (v >= -0.15) return 'neutral';
  if (v >= -0.5) return 'mildly informal';
  return 'strongly informal';
}
