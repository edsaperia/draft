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
  RaceContext,
  RaceDescription,
  SemanticOracle,
} from '../../engine-core/src/index.js';
import {
  RACE_TYPES,
  excerptOf,
  nearestHeading,
  normalizeForDedup,
  relativeEditDistance,
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

// --- Race naming/typing (Q49 interim; SemanticOracle.describeRace) --------

export const RACE_DESCRIPTION_SCHEMA = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description:
        'A short noun phrase (2-4 words) naming the question in dispute, e.g. "treasurer oversight". Never any side\'s answer.',
    },
    type: {
      type: 'string',
      enum: [...RACE_TYPES],
      description: 'The nature of the dispute: copy-edit, substantive, or structural.',
    },
  },
  required: ['name', 'type'],
  additionalProperties: false,
} as const;

export const DESCRIBE_SYSTEM_PROMPT = [
  'You label disputes in a group drafting engine. A dispute ("race") is a set',
  'of rival patches contesting the same ground text of a shared document.',
  'Produce two things:',
  'NAME — a short noun phrase (2-4 words) naming the QUESTION in dispute,',
  'e.g. "treasurer oversight" or "meeting cadence". Name the question, never',
  'any one side\'s answer: "quiet hours policy", not "quiet hours until 9am".',
  'TYPE — exactly one of:',
  '- copy-edit: wording, style, typo, or formatting fixes; no change to what',
  '  the document requires or permits.',
  '- substantive: changes what the document requires, permits, or means.',
  '- structural: adds, removes, splits, or reorganizes sections; reshapes the',
  '  document\'s skeleton.',
  'If the candidates differ in kind, classify by the weightiest change present',
  '(structural > substantive > copy-edit).',
  'Respond with JSON only, matching the requested schema exactly.',
].join('\n');

export function describeRacePrompt(
  groundText: string,
  candidates: OracleCandidate[],
  context: RaceContext,
): string {
  const listed = candidates
    .map((c) => `- id ${c.id}: "${c.text}"${c.rationale ? ` (rationale: "${c.rationale}")` : ''}`)
    .join('\n');
  return [
    'The document being drafted:',
    context.documentText,
    '',
    groundText === ''
      ? 'The contested ground is an insertion point (no incumbent text).'
      : `The contested ground text (current incumbent):\n"${groundText}"`,
    '',
    'The rival candidate texts proposed for that ground:',
    listed,
    '',
    'Name and type this dispute.',
  ].join('\n');
}

/** Validate a model's race description; anything malformed is no-opinion. */
function sanitizeDescription(raw: unknown): RaceDescription | null {
  const v = raw as Partial<RaceDescription> | null | undefined;
  if (!v || typeof v.name !== 'string' || v.name.trim() === '') return null;
  if (!(RACE_TYPES as readonly string[]).includes(v.type as string)) return null;
  return { name: v.name.trim(), type: v.type as RaceDescription['type'] };
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

export type MockDescribeRule = (
  groundText: string,
  candidates: OracleCandidate[],
  context: RaceContext,
) => RaceDescription | null;

/**
 * A deterministic oracle for tests: answers via caller-supplied rules
 * (defaults: never a duplicate; no opinion on race descriptions). A rule
 * may throw to exercise the error-degrades-to-no-opinion path.
 */
export class MockOracle implements SemanticOracle {
  constructor(
    private readonly rule: MockRule = () => ({
      duplicateOf: null,
      confidence: 0,
      reason: 'mock: no opinion',
    }),
    private readonly describeRule: MockDescribeRule = () => null,
  ) {}

  async checkEquivalence(
    candidateText: string,
    existing: OracleCandidate[],
    context: OracleContext,
  ): Promise<EquivalenceVerdict> {
    return this.rule(candidateText, existing, context);
  }

  async describeRace(
    groundText: string,
    candidates: OracleCandidate[],
    context: RaceContext,
  ): Promise<RaceDescription | null> {
    return this.describeRule(groundText, candidates, context);
  }
}

// ---------------------------------------------------------------------------
// ScriptedOracle — deterministic heuristic transport (pattern: persona.ts's
// ScriptedPersona). Names from the nearest heading / ground excerpt; types
// from diff size and structure. No network, so regression runs can exercise
// the full oracle-labeled path (Q49 interim).

export class ScriptedOracle implements SemanticOracle {
  /** No equivalence opinion: dedup regression stays with the free stages. */
  async checkEquivalence(): Promise<EquivalenceVerdict> {
    return { duplicateOf: null, confidence: 0, reason: 'scripted: no opinion' };
  }

  async describeRace(
    groundText: string,
    candidates: OracleCandidate[],
    context: RaceContext,
  ): Promise<RaceDescription | null> {
    if (candidates.length === 0) return null;
    const name =
      nearestHeading(context.documentText, context.contested) ??
      (excerptOf(groundText) || 'untitled ground');
    return { name, type: scriptedRaceType(groundText, candidates) };
  }
}

/**
 * Deterministic type guess: structure changes (insertions, deletions,
 * line-count changes, heading edits) are structural; candidates all
 * within typo distance of the ground are a copy-edit; the rest is
 * substantive. Weightiest change present wins, like the LLM is told.
 */
export function scriptedRaceType(
  groundText: string,
  candidates: OracleCandidate[],
): RaceDescription['type'] {
  const groundLines = groundText === '' ? [] : groundText.split('\n');
  const isHeading = (l: string): boolean => /^#{1,6}\s/.test(l);
  const structural = candidates.some((c) => {
    const lines = c.text === '' ? [] : c.text.split('\n');
    return (
      groundLines.length === 0 || // pure insertion
      lines.length === 0 || // pure deletion
      lines.length !== groundLines.length || // grows or shrinks the skeleton
      lines.some(isHeading) ||
      groundLines.some(isHeading)
    );
  });
  if (structural) return 'structural';
  // Same threshold family as the dedup-gate's edit-distance stage: within
  // it, the change is typo-level noise — a copy-edit, not a rival meaning.
  const copyEdit = candidates.every(
    (c) =>
      relativeEditDistance(normalizeForDedup(groundText), normalizeForDedup(c.text)) <= 0.2,
  );
  return copyEdit ? 'copy-edit' : 'substantive';
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

  async describeRace(
    groundText: string,
    candidates: OracleCandidate[],
    context: RaceContext,
  ): Promise<RaceDescription | null> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 200,
        system: DESCRIBE_SYSTEM_PROMPT,
        output_config: { format: { type: 'json_schema', schema: RACE_DESCRIPTION_SCHEMA } },
        messages: [
          { role: 'user', content: describeRacePrompt(groundText, candidates, context) },
        ],
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      return sanitizeDescription(JSON.parse(text));
    } catch {
      return null; // advisory: no label beats a wrong crash
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

  async describeRace(
    groundText: string,
    candidates: OracleCandidate[],
    context: RaceContext,
  ): Promise<RaceDescription | null> {
    try {
      for await (const message of query({
        prompt: describeRacePrompt(groundText, candidates, context),
        options: {
          model: this.model,
          systemPrompt: DESCRIBE_SYSTEM_PROMPT,
          allowedTools: [],
          // Structured output consumes a turn of its own (the answer arrives
          // via a tool call); maxTurns 1 cuts it off as error_max_turns.
          maxTurns: 3,
          settingSources: [],
          outputFormat: { type: 'json_schema', schema: RACE_DESCRIPTION_SCHEMA },
        },
      })) {
        if (message.type === 'result') {
          if (message.subtype === 'success') {
            const m = message as typeof message & { structured_output?: unknown };
            const raw =
              m.structured_output !== undefined
                ? m.structured_output
                : JSON.parse(message.result);
            return sanitizeDescription(raw);
          }
          return null;
        }
      }
      return null;
    } catch {
      return null; // advisory: no label beats a wrong crash
    }
  }
}
