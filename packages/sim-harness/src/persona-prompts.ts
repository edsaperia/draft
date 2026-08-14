/**
 * Prompts and schemas shared by every LLM-backed persona, whatever the
 * transport (API key or subscription). One place to tune how personas
 * see cards and documents.
 */

import type { CardView, ParticipantApi } from '../../engine-core/src/index.js';
import type { DraftProposal } from './persona.js';
import type { PersonaProfile } from './scenario.js';

export const JUDGE_SCHEMA = {
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

export const DRAFT_SCHEMA = {
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

export interface DraftResult {
  action: 'draft' | 'pass';
  line: number;
  newText: string;
  rationale: string;
}

export function personaSystemPrompt(profile: PersonaProfile): string {
  const stances = Object.entries(profile.stances)
    .map(([k, v]) => `${k}: ${describeStance(v)}`)
    .join('; ');
  const salience = Object.entries(profile.salience)
    .map(
      ([k, v]) =>
        `${k}: ${v >= 0.7 ? 'cares a lot' : v >= 0.4 ? 'cares somewhat' : 'cares little'}`,
    )
    .join('; ');
  return [
    `You are ${profile.handle}, a member of a small association collaboratively`,
    `redrafting its charter through anonymous pairwise judgments.`,
    `Temperament: ${profile.temperament}`,
    `Your leanings per topic (-1 = keep things loose/informal, +1 = formalise/regulate): ${stances}.`,
    `How much each topic matters to you: ${salience}.`,
    `Judge and draft in character. Be honest: choose 'indifferent' when options genuinely`,
    `seem equivalent to you — never fabricate a preference.`,
    `Respond with JSON only, matching the requested schema exactly.`,
  ].join('\n');
}

export function judgePrompt(card: CardView): string {
  const render = (label: string, option: CardView['a']): string => {
    const changes = option.changes
      .map((c) =>
        c.before === c.after
          ? `KEEP AS IS: "${c.before}"`
          : `BEFORE: "${c.before}"\nAFTER: "${c.after}"`,
      )
      .join('\n');
    const rationale = option.rationale
      ? `Rationale: "${option.rationale}"`
      : '(the status quo)';
    return `Option ${label}:\n${changes}\n${rationale}`;
  };
  const question =
    card.kind === 'diagonal'
      ? 'These two proposals touch different parts of the document and could both happen. Which one MATTERS MORE to you — if only one could land, which should it be?'
      : card.subtype === 'rival'
        ? 'Whether the current text should change at all is a separate question you are not being asked here. IF this text changes, which of these two changes is better?'
        : 'Which of these two versions should the group adopt?';
  return `${question}\n\n${render('A', card.a)}\n\n${render('B', card.b)}`;
}

export function draftPrompt(api: ParticipantApi, now: number): string {
  const lines = api.document().split('\n');
  const numbered = lines.map((l, i) => `${i}: ${l}`).join('\n');
  const live = api
    .liveCandidates()
    .map((c) => c.changes.map((ch) => `- "${ch.after}"`).join('\n'))
    .join('\n');
  return [
    `The current document, with line numbers:`,
    numbered,
    ``,
    `Replacement lines already proposed by others (do NOT duplicate these):`,
    live || '(none)',
    ``,
    `You have ${api.balance(now).toFixed(0)} proposal tokens. You joined this convention`,
    `because parts of this charter genuinely bother you — proposing fixes is what the`,
    `tokens are for. If any line clearly conflicts with your stated leanings and no live`,
    `proposal already fixes it, draft your fix now. Pass only when the document and the`,
    `live proposals already reflect your views on everything you care about.`,
    `Rewrite at most one line. Keep the line's role in the document (headings stay headings).`,
  ].join('\n');
}

export function validateDraftResult(
  api: ParticipantApi,
  result: DraftResult,
): DraftProposal | null {
  if (result.action !== 'draft') return null;
  const lines = api.document().split('\n');
  if (!Number.isInteger(result.line) || result.line < 0 || result.line >= lines.length) {
    return null;
  }
  if (result.newText.trim() === '' || result.newText === lines[result.line]) return null;
  return {
    patch: {
      baseVersion: api.currentVersion(),
      hunks: [{ start: result.line, end: result.line + 1, lines: [result.newText] }],
    },
    rationale: result.rationale.slice(0, 300),
  };
}

function describeStance(v: number): string {
  if (v > 0.5) return 'strongly formalise';
  if (v > 0.15) return 'mildly formalise';
  if (v >= -0.15) return 'neutral';
  if (v >= -0.5) return 'mildly informal';
  return 'strongly informal';
}
