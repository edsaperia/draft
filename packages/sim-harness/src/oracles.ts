/**
 * SemanticOracle transports (P3 phase 1). engine-core defines only the
 * interface (oracle.ts); the implementations live here, mirroring the
 * persona transports: MockOracle (deterministic, for tests), LlmOracle
 * (Claude API key, cf. llm-persona.ts), SubscriptionOracle (Agent SDK /
 * headless Claude Code, cf. subscription-persona.ts — local use only).
 *
 * Every transport degrades to "no opinion" on failure: an oracle error
 * must never block a submission, so a throw or a malformed answer comes
 * back as { duplicateOf: null }. The DedupGate applies the same
 * discipline once more on its side.
 */

import Anthropic from '@anthropic-ai/sdk';
import { query } from '@anthropic-ai/claude-agent-sdk';
import type {
  EquivalenceVerdict,
  OracleCandidate,
  OracleContext,
  SemanticOracle,
} from '../../engine-core/src/index.js';

const DEFAULT_MODEL = 'claude-haiku-4-5';

// ---------------------------------------------------------------------------
// Shared prompt and schema (one place to tune, like persona-prompts.ts)

export const EQUIVALENCE_SCHEMA = {
  type: 'object',
  properties: {
    duplicateOf: {
      type: ['string', 'null'],
      description:
        'The id of the existing candidate this draft is semantically equivalent to, or null if it is a genuinely new position.',
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'How confident you are in the equivalence call.',
    },
    reason: { type: 'string', description: 'One sentence.' },
  },
  required: ['duplicateOf', 'confidence', 'reason'],
  additionalProperties: false,
} as const;

export const ORACLE_SYSTEM_PROMPT = [
  'You are the deduplication gate of a group drafting engine. Members propose',
  'rewrites of document lines; near-duplicate proposals waste judging effort,',
  'so semantically equivalent drafts should be pooled.',
  'Equivalence means the SAME OPERATIVE EFFECT: a reasonable member reading',
  'both would see no meaningful difference in what the document then requires',
  'or permits. Different answers to the same question are NOT duplicates —',
  'rivals must race, never merge. When in doubt, answer null: a missed',
  'duplicate costs a little judging; a false merge silences a position.',
  'Respond with JSON only, matching the requested schema exactly.',
].join('\n');

export function equivalencePrompt(
  candidateText: string,
  existing: OracleCandidate[],
  context: OracleContext,
): string {
  const listed = existing
    .map((c) => `- id ${c.id}: "${c.text}"${c.rationale ? ` (rationale: "${c.rationale}")` : ''}`)
    .join('\n');
  return [
    'The document being drafted:',
    context.documentText,
    '',
    'Existing live proposals:',
    listed,
    '',
    `New draft: "${candidateText}"`,
    '',
    'Is the new draft semantically equivalent to any existing proposal?',
  ].join('\n');
}

/** Validate a model answer; anything malformed degrades to no-opinion. */
function sanitize(raw: unknown, existing: OracleCandidate[]): EquivalenceVerdict {
  const v = raw as Partial<EquivalenceVerdict> | null | undefined;
  const duplicateOf =
    v && typeof v.duplicateOf === 'string' && existing.some((c) => c.id === v.duplicateOf)
      ? v.duplicateOf
      : null;
  return {
    duplicateOf,
    confidence:
      v && typeof v.confidence === 'number' && v.confidence >= 0 && v.confidence <= 1
        ? v.confidence
        : 0,
    reason: v && typeof v.reason === 'string' ? v.reason : '',
  };
}

const NO_OPINION: EquivalenceVerdict = {
  duplicateOf: null,
  confidence: 0,
  reason: 'oracle unavailable',
};

// ---------------------------------------------------------------------------
// MockOracle — deterministic, for tests

export type MockRule = (
  candidateText: string,
  existing: OracleCandidate[],
  context: OracleContext,
) => EquivalenceVerdict;

/**
 * A deterministic oracle for tests: answers via a caller-supplied rule
 * (default: never a duplicate). The rule may throw to exercise the
 * error-degrades-to-fresh path.
 */
export class MockOracle implements SemanticOracle {
  constructor(
    private readonly rule: MockRule = () => ({
      duplicateOf: null,
      confidence: 0,
      reason: 'mock: no opinion',
    }),
  ) {}

  async checkEquivalence(
    candidateText: string,
    existing: OracleCandidate[],
    context: OracleContext,
  ): Promise<EquivalenceVerdict> {
    return this.rule(candidateText, existing, context);
  }
}

// ---------------------------------------------------------------------------
// LlmOracle — Claude API key transport (pattern: llm-persona.ts)

export interface LlmOracleOptions {
  model?: string;
  client?: Anthropic;
}

export class LlmOracle implements SemanticOracle {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(options: LlmOracleOptions = {}) {
    this.client = options.client ?? new Anthropic();
    this.model = options.model ?? DEFAULT_MODEL;
  }

  async checkEquivalence(
    candidateText: string,
    existing: OracleCandidate[],
    context: OracleContext,
  ): Promise<EquivalenceVerdict> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 300,
        system: ORACLE_SYSTEM_PROMPT,
        output_config: { format: { type: 'json_schema', schema: EQUIVALENCE_SCHEMA } },
        messages: [
          { role: 'user', content: equivalencePrompt(candidateText, existing, context) },
        ],
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      return sanitize(JSON.parse(text), existing);
    } catch {
      return NO_OPINION; // an oracle failure must never block a submission
    }
  }
}

// ---------------------------------------------------------------------------
// SubscriptionOracle — Agent SDK transport (pattern: subscription-persona.ts)

export interface SubscriptionOracleOptions {
  model?: string;
}

export class SubscriptionOracle implements SemanticOracle {
  private readonly model: string;

  constructor(options: SubscriptionOracleOptions = {}) {
    this.model = options.model ?? DEFAULT_MODEL;
  }

  async checkEquivalence(
    candidateText: string,
    existing: OracleCandidate[],
    context: OracleContext,
  ): Promise<EquivalenceVerdict> {
    try {
      for await (const message of query({
        prompt: equivalencePrompt(candidateText, existing, context),
        options: {
          model: this.model,
          systemPrompt: ORACLE_SYSTEM_PROMPT,
          allowedTools: [],
          // Structured output consumes a turn of its own (the answer arrives
          // via a tool call); maxTurns 1 cuts it off as error_max_turns.
          maxTurns: 3,
          settingSources: [],
          outputFormat: { type: 'json_schema', schema: EQUIVALENCE_SCHEMA },
        },
      })) {
        if (message.type === 'result') {
          if (message.subtype === 'success') {
            const m = message as typeof message & { structured_output?: unknown };
            const raw =
              m.structured_output !== undefined
                ? m.structured_output
                : JSON.parse(message.result);
            return sanitize(raw, existing);
          }
          return NO_OPINION;
        }
      }
      return NO_OPINION;
    } catch {
      return NO_OPINION; // an oracle failure must never block a submission
    }
  }
}
