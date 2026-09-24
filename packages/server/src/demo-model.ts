/**
 * **The demo bots' brain** (`demo-model`, design/DEMO.md Stages 4–5; Q1535):
 * the interface a bot asks what to propose and how to judge, the price book
 * the spend cap reads, and `ClaudeDemoModel`, the one implementation that
 * ships — Claude through `@anthropic-ai/sdk`, key `DRAFT_DEMO_ANTHROPIC_KEY`.
 * The deterministic stand-in for tests and CI is `demo-model-stub.ts`, which
 * the production artifact never contains (build-server.mjs's needles).
 *
 * **What a model is shown is a member's view and nothing more** (§3.5): every
 * input below is built by `demo-bots.ts` from `view()` and `raceView()` as the
 * bot's own member — the served card, the text, the live candidates' wording —
 * so no standing, no count and no author the room could not read crosses. The
 * inputs are plain data, which is what lets `demo-bots.test.ts` assert it.
 *
 * **What a model answers is checked, never trusted.** A proposal is a
 * `DemoProposal` of line spans against the lines the model was shown;
 * `proposalHunks` validates it (in range, non-overlapping, at most four
 * sites of at most twelve lines) and builds the patch itself — **a swap
 * especially**: the model names two session blocks and the host exchanges
 * their runs verbatim and writes each slot's time back into the heading that
 * now stands in it (times stay in the `###` headings, Q1535), so a model never
 * copies a session back letter-perfect and can never move a time. Anything
 * that fails is dropped, never sent. And every call fails safe: a judgment
 * falls back to *indifferent*, a proposal to *nothing this turn* — an API
 * failure must never fabricate a preference (`llm-persona.ts`).
 */
import Anthropic from '@anthropic-ai/sdk';
import { attest } from '../../engine-core/src/index.js';
import type { Hunk } from '../../engine-core/src/index.js';

/* -- the price book and the dropdown ------------------------------------ */

export interface DemoModelInfo {
  /** The API's model id — the alias, never a dated id (Q1535). */
  id: string;
  label: string;
  /** Dollars per million tokens, as the Claude documentation states them (2026-09-24). */
  inUsd: number;
  outUsd: number;
  /** Adaptive-thinking models take an effort; Haiku 4.5 takes none (a 400). */
  effort: 'low' | null;
  /** Sonnet 5 accepts thinking off; Opus 5.5 cannot turn it off at all (a 400). */
  thinkingOff: boolean;
}

/**
 * **The dropdown's source and the price book** (DEMO.md Stage 5). Haiku 4.5 is
 * the default (Q1535). Opus 5.5 cannot switch thinking off, so its effort is
 * set to `low` explicitly (its default is `medium`) and its thinking tokens
 * are billed as output — counted, since `usage.output_tokens` includes them.
 */
export const DEMO_MODELS: readonly DemoModelInfo[] = [
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5', inUsd: 1, outUsd: 5, effort: null, thinkingOff: false },
  { id: 'claude-sonnet-5', label: 'Sonnet 5', inUsd: 2, outUsd: 10, effort: 'low', thinkingOff: true },
  { id: 'claude-opus-5-5', label: 'Opus 5.5', inUsd: 4, outUsd: 20, effort: 'low', thinkingOff: false },
];
export const DEFAULT_DEMO_MODEL = 'claude-haiku-4-5';
export const modelInfo = (id: string): DemoModelInfo | null =>
  DEMO_MODELS.find((m) => m.id === id) ?? null;

/** One call's tokens, as `response.usage` reports them. */
export interface DemoUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}
export const NO_USAGE: DemoUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

/**
 * A call's price in dollars: uncached input at the model's rate, a cache
 * write at 1.25× it and a cache read at 0.1× it (the documented multipliers),
 * output — thinking included — at the output rate.
 */
export function priceOf(model: DemoModelInfo, u: DemoUsage): number {
  return (u.input * model.inUsd + u.cacheWrite * model.inUsd * 1.25 +
    u.cacheRead * model.inUsd * 0.1 + u.output * model.outUsd) / 1_000_000;
}

/* -- what a bot is and what it is shown --------------------------------- */

export interface DemoPersona {
  /** The member's display name. */
  name: string;
  /** The cast line: how they behave on the committee. */
  persona: string;
  /** The heading lines of their own sessions, read off the text (Q1535: partial to them). */
  own: string[];
  /** The document's title, which is what the room is drafting. */
  title: string;
}

/** One side of a served card, as a member's page reads it (`CardView`). */
export interface DemoOption {
  /** The wording: before → after per hunk; `before === after` is the current text. */
  changes: Array<{ before: string; after: string }>;
  rationale: string;
  current: boolean;
  /** The proposer's display name, present only where the room may read it (§3.5a). */
  proposer?: string;
}

export interface DemoJudgeInput {
  /** `rival`: whether to change at all is not the question, only which change. */
  subtype: 'rival' | 'keep' | 'diagonal';
  a: DemoOption;
  b: DemoOption;
}
export type DemoVerdict = 'a' | 'b' | 'tie';

/** A session block: a heading and the lines under it (host-computed). */
export interface DemoBlock { start: number; end: number; level: number; heading: string; own: boolean }

export interface DemoProposeInput {
  lines: string[];
  blocks: DemoBlock[];
  /** The live proposals' wording, so a bot does not duplicate one. */
  live: Array<{ start: number; end: number; lines: string[] }>;
  wallet: number;
}

/**
 * **A proposal, one of two shapes** (DEMO.md Stage 4): a rewrite of one or more
 * places (an insertion where `start === end`), or a swap of two session blocks
 * named by their line ranges — which the host builds itself.
 */
export type DemoProposal =
  | { kind: 'rewrite'; sites: Array<{ start: number; end: number; lines: string[] }>; why: string }
  | { kind: 'swap'; a: { start: number; end: number }; b: { start: number; end: number }; why: string };

export interface DemoMotionInput { summary: string; why: string | null }
export type DemoMotionAnswer = 'accept' | 'keep' | 'abstain';

/** Every answer comes back with what it cost. */
export interface Priced<T> { value: T; usage: DemoUsage }

export interface DemoModel {
  readonly info: DemoModelInfo;
  judge(p: DemoPersona, card: DemoJudgeInput): Promise<Priced<DemoVerdict>>;
  propose(p: DemoPersona, doc: DemoProposeInput): Promise<Priced<DemoProposal | null>>;
  answerMotion(p: DemoPersona, m: DemoMotionInput): Promise<Priced<DemoMotionAnswer>>;
}

/* -- the host's half: blocks, and a proposal checked and built ----------- */

const HEADING = /^(#{1,6})\s+\S/;
/** A heading whose slot has a time: `### 09:30 · Title` (the preset's shape). */
const TIMED = /^(#{1,6}\s+)(\d{1,2}[:.]\d{2})(\s*·\s*)(.*)$/;

/**
 * The document's blocks: each heading and the lines under it until the next
 * heading of its level or above. `own` where a line of it names `name` in
 * bold — the preset's speaker line (DEMO.md §3.1: a speaker's sessions are
 * read off the text).
 */
export function blocksOf(lines: readonly string[], name: string | null = null): DemoBlock[] {
  const out: DemoBlock[] = [];
  lines.forEach((line, i) => {
    const m = HEADING.exec(line);
    if (!m) return;
    const level = m[1]!.length;
    let end = i + 1;
    while (end < lines.length) {
      const n = HEADING.exec(lines[end]!);
      if (n && n[1]!.length <= level) break;
      end += 1;
    }
    const own = name !== null && lines.slice(i + 1, end).some((l) => l.includes(`**${name}**`));
    out.push({ start: i, end, level, heading: line, own });
  });
  return out;
}

export const MAX_SITES = 4;
export const MAX_SITE_LINES = 12;

/**
 * **A `DemoProposal` checked and turned into an attested hunk set**, against
 * exactly the lines the model was shown — or the reason it is dropped. The
 * same shape as Stage 1's `hunksOf` (demo-build.ts): sorted, then `attest`.
 */
export function proposalHunks(p: DemoProposal, lines: readonly string[]):
  { hunks: Hunk[]; swap: boolean } | { dropped: string } {
  const n = lines.length;
  if (p.kind === 'swap') {
    const blocks = blocksOf(lines);
    const find = (s: { start: number }): DemoBlock | undefined => blocks.find((b) => b.start === s.start);
    const a0 = find(p.a), b0 = find(p.b);
    if (!a0 || !b0) return { dropped: 'a swap must name two blocks by their heading lines' };
    if (a0.level !== b0.level) return { dropped: 'a swap must name two blocks of one level' };
    const [a, b] = a0.start < b0.start ? [a0, b0] : [b0, a0];
    if (a.start === b.start || a.end > b.start) return { dropped: 'a swap must name two separate blocks' };
    if (a.end - a.start > MAX_SITE_LINES || b.end - b.start > MAX_SITE_LINES) {
      return { dropped: 'a swapped block is too long' };
    }
    const runA = lines.slice(a.start, a.end), runB = lines.slice(b.start, b.end);
    if (runA.join('\n') === runB.join('\n')) return { dropped: 'the two blocks are the same' };
    // **the slot keeps its time** (Q1535): each run moves, and the heading it
    // lands under is rewritten to the time of the slot it now stands in
    const retime = (run: string[], slotHeading: string): string[] => {
      const slot = TIMED.exec(slotHeading), head = TIMED.exec(run[0]!);
      if (!slot || !head) return run;
      return [`${head[1]}${slot[2]}${head[3]}${head[4]}`, ...run.slice(1)];
    };
    const spans = [
      { start: a.start, end: a.end, lines: retime(runB, lines[a.start]!) },
      { start: b.start, end: b.end, lines: retime(runA, lines[b.start]!) },
    ];
    return { hunks: attest(lines, spans), swap: true };
  }
  const sites = p.sites;
  if (sites.length === 0) return { dropped: 'a rewrite needs a place' };
  if (sites.length > MAX_SITES) return { dropped: `more than ${MAX_SITES} places` };
  const spans = sites.map((s) => ({ start: s.start, end: s.end,
    // a line is one engine line: a newline inside one is two
    lines: s.lines.flatMap((l) => String(l).split(/\r?\n/)).map((l) => l.replace(/\s+$/, '')) }))
    .sort((x, y) => x.start - y.start || x.end - y.end);
  for (const s of spans) {
    if (!Number.isInteger(s.start) || !Number.isInteger(s.end) || s.start < 0 || s.end < s.start || s.end > n) {
      return { dropped: 'a place is out of range' };
    }
    if (s.end - s.start > MAX_SITE_LINES || s.lines.length > MAX_SITE_LINES) return { dropped: 'a place is too long' };
    if (s.start === s.end && s.lines.length === 0) return { dropped: 'an empty insertion' };
    if (s.lines.join('\n') === lines.slice(s.start, s.end).join('\n')) return { dropped: 'a place changes nothing' };
  }
  for (let i = 1; i < spans.length; i++) {
    const h1 = spans[i - 1]!, h2 = spans[i]!;
    if (h1.end > h2.start) return { dropped: 'two places overlap' };
    if (h1.start === h1.end && h2.start === h2.end && h1.start === h2.start) {
      return { dropped: 'two insertions at one place' };
    }
  }
  return { hunks: attest(lines, spans), swap: false };
}

/* -- the prompts -------------------------------------------------------- */

export function personaSystem(p: DemoPersona): string {
  return [
    `You are ${p.name}, one of the speakers at ${p.title}, and a member of its programme committee.`,
    `How you behave on the committee: ${p.persona}`,
    p.own.length
      ? `Your own session${p.own.length > 1 ? 's are' : ' is'}: ${p.own.map((h) => `"${h.replace(/^#+\s*/, '')}"`).join('; ')}. ` +
        'Like any speaker you are partial to it: you favour changes that give it a better slot, title or abstract, and resist changes that diminish it.'
      : 'You have no session of your own on the programme.',
    'The committee redrafts the programme together on docs.vote: members propose changes, and the room judges pairs of wordings anonymously until one wins.',
    'Stay in character, stay on the programme, and be kind. Respond with JSON only, matching the requested schema exactly.',
  ].join('\n');
}

const renderOption = (label: string, o: DemoOption): string => {
  const body = o.changes.map((c) => (c.before === c.after
    ? `KEEP AS IT IS:\n${c.before}` : `NOW:\n${c.before}\nWOULD BECOME:\n${c.after}`)).join('\n\n');
  const who = o.current ? '(the current text)' : `Reason given: "${o.rationale}"${o.proposer ? ` — proposed by ${o.proposer}` : ''}`;
  return `Option ${label}:\n${body}\n${who}`;
};

export function judgePrompt(card: DemoJudgeInput): string {
  const q = card.subtype === 'diagonal'
    ? 'These two proposals touch different parts of the programme. Which one matters more to you?'
    : card.subtype === 'rival'
      ? 'Whether to change this part of the programme is not the question here. IF it changes, which of these two changes is better?'
      : 'Which of these two versions should the programme adopt?';
  return `${q}\n\n${renderOption('A', card.a)}\n\n${renderOption('B', card.b)}\n\n` +
    "Answer 'a' or 'b' for a preference, or 'indifferent' if you genuinely do not mind.";
}

export function proposePrompt(input: DemoProposeInput): string {
  const numbered = input.lines.map((l, i) => `${i}: ${l}`).join('\n');
  const sessions = input.blocks.filter((b) => b.level >= 3)
    .map((b) => `- lines ${b.start}–${b.end - 1}: ${b.heading.replace(/^#+\s*/, '')}${b.own ? '  (YOUR OWN)' : ''}`).join('\n');
  const live = input.live.map((c) => `- lines ${c.start}–${Math.max(c.start, c.end - 1)} → ${c.lines.join(' / ') || '(delete)'}`).join('\n');
  return [
    'The programme as it stands, one line per numbered line:',
    numbered,
    '',
    'Its sessions (a heading and the lines under it):',
    sessions || '(none)',
    '',
    'Proposals already live (do NOT duplicate these):',
    live || '(none)',
    '',
    `You may make one proposal now (you have ${input.wallet}). A programme committee retitles sessions, tightens abstracts,`,
    'swaps two sessions, moves a session to another day, adds a break, cuts a speaker line to its essentials, or adds the odd',
    'light-hearted session. Keep headings headings and keep every slot\'s time where it is.',
    '',
    'Answer with one of:',
    '- action "rewrite": "sites" lists 1–4 places; each replaces lines start..end-1 (end is exclusive) with "lines",',
    '  or inserts "lines" before line start when start == end. Write every line in full, exactly as it should read.',
    '- action "swap": "a" and "b" are the [start, end] line ranges of two sessions from the list above (end exclusive);',
    '  the two sessions exchange places and each slot keeps its time — you do not rewrite anything.',
    '- action "pass" if nothing on the programme bothers you.',
    '"why" is your reason, one or two sentences, in your own voice, under 280 characters.',
  ].join('\n');
}

export function motionPrompt(m: DemoMotionInput): string {
  return `A member proposes a change to the committee's rules: ${m.summary}` +
    `${m.why ? `\nTheir reason: "${m.why}"` : ''}\n` +
    "Answer 'accept' to agree, 'keep' to keep the rule as it is, or 'abstain'.";
}

export const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    choice: { type: 'string', enum: ['a', 'b', 'indifferent'] },
    reason: { type: 'string' },
  },
  required: ['choice', 'reason'],
  additionalProperties: false,
} as const;

export const PROPOSE_SCHEMA = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['rewrite', 'swap', 'pass'] },
    sites: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          start: { type: 'integer' },
          end: { type: 'integer' },
          lines: { type: 'array', items: { type: 'string' } },
        },
        required: ['start', 'end', 'lines'],
        additionalProperties: false,
      },
    },
    a: { type: 'array', items: { type: 'integer' } },
    b: { type: 'array', items: { type: 'integer' } },
    why: { type: 'string' },
  },
  required: ['action', 'sites', 'a', 'b', 'why'],
  additionalProperties: false,
} as const;

export const MOTION_SCHEMA = {
  type: 'object',
  properties: { answer: { type: 'string', enum: ['accept', 'keep', 'abstain'] } },
  required: ['answer'],
  additionalProperties: false,
} as const;

export interface ProposeResult {
  action: 'rewrite' | 'swap' | 'pass';
  sites: Array<{ start: number; end: number; lines: string[] }>;
  a: number[];
  b: number[];
  why: string;
}

/** The model's JSON to a `DemoProposal`, or null where it passes or is malformed. */
export function proposalOf(r: ProposeResult): DemoProposal | null {
  const why = String(r.why ?? '').trim().slice(0, 280);
  if (r.action === 'swap') {
    if (!Array.isArray(r.a) || !Array.isArray(r.b) || r.a.length < 2 || r.b.length < 2) return null;
    return { kind: 'swap', a: { start: r.a[0]!, end: r.a[1]! }, b: { start: r.b[0]!, end: r.b[1]! }, why };
  }
  if (r.action === 'rewrite') {
    if (!Array.isArray(r.sites) || r.sites.length === 0) return null;
    return { kind: 'rewrite', why,
      sites: r.sites.map((s) => ({ start: s.start, end: s.end, lines: Array.isArray(s.lines) ? s.lines.map(String) : [] })) };
  }
  return null;
}

/* -- Claude ------------------------------------------------------------- */

/** The slice of the SDK a `ClaudeDemoModel` uses — so a test can hand it a fake transport. */
export interface MessagesTransport {
  messages: { create(body: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message> };
}

/** How many `ClaudeDemoModel`s this process has made — the CI guard's witness (Stage 5 criterion 4). */
export const claudeModelsMade = { n: 0 };

export class ClaudeDemoModel implements DemoModel {
  private readonly client: MessagesTransport;

  constructor(readonly info: DemoModelInfo, apiKey: string, transport?: MessagesTransport) {
    if (!apiKey) throw new Error('ClaudeDemoModel needs DRAFT_DEMO_ANTHROPIC_KEY');
    claudeModelsMade.n += 1;
    this.client = transport ?? new Anthropic({ apiKey, maxRetries: 1, timeout: 60_000 });
  }

  private async ask<T>(p: DemoPersona, user: string, schema: Record<string, unknown>,
    maxTokens: number): Promise<{ value: T; usage: DemoUsage }> {
    const body: Anthropic.MessageCreateParamsNonStreaming = {
      model: this.info.id,
      // Opus 5.5 thinks whatever it is told, so it is given room to
      max_tokens: this.info.thinkingOff || this.info.effort === null ? maxTokens : maxTokens + 3000,
      system: [{ type: 'text', text: personaSystem(p), cache_control: { type: 'ephemeral' } }],
      output_config: {
        format: { type: 'json_schema', schema },
        ...(this.info.effort !== null ? { effort: this.info.effort } : {}),
      },
      ...(this.info.thinkingOff ? { thinking: { type: 'disabled' } } : {}),
      messages: [{ role: 'user', content: user }],
    };
    const response = await this.client.messages.create(body);
    const u = response.usage;
    const usage: DemoUsage = { input: u.input_tokens ?? 0, output: u.output_tokens ?? 0,
      cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0 };
    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') {
      const e = new Error(`the model stopped: ${response.stop_reason}`) as Error & { usage?: DemoUsage };
      e.usage = usage;
      throw e;
    }
    const text = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text).join('');
    try {
      return { value: JSON.parse(text) as T, usage };
    } catch {
      const e = new Error('the model did not answer in JSON') as Error & { usage?: DemoUsage };
      e.usage = usage;
      throw e;
    }
  }

  /** A failed call still cost what it cost: its usage rides the fallback. */
  private static spent(e: unknown): DemoUsage {
    return (e as { usage?: DemoUsage }).usage ?? NO_USAGE;
  }

  async judge(p: DemoPersona, card: DemoJudgeInput): Promise<Priced<DemoVerdict>> {
    try {
      const r = await this.ask<{ choice: string }>(p, judgePrompt(card), JUDGE_SCHEMA, 300);
      const value: DemoVerdict = r.value.choice === 'a' ? 'a' : r.value.choice === 'b' ? 'b' : 'tie';
      return { value, usage: r.usage };
    } catch (e) {
      return { value: 'tie', usage: ClaudeDemoModel.spent(e) }; // never a fabricated preference
    }
  }

  async propose(p: DemoPersona, doc: DemoProposeInput): Promise<Priced<DemoProposal | null>> {
    try {
      const r = await this.ask<ProposeResult>(p, proposePrompt(doc), PROPOSE_SCHEMA, 1500);
      return { value: proposalOf(r.value), usage: r.usage };
    } catch (e) {
      return { value: null, usage: ClaudeDemoModel.spent(e) };
    }
  }

  async answerMotion(p: DemoPersona, m: DemoMotionInput): Promise<Priced<DemoMotionAnswer>> {
    try {
      const r = await this.ask<{ answer: string }>(p, motionPrompt(m), MOTION_SCHEMA, 100);
      const a = r.value.answer;
      return { value: a === 'accept' || a === 'keep' ? a : 'abstain', usage: r.usage };
    } catch (e) {
      return { value: 'abstain', usage: ClaudeDemoModel.spent(e) };
    }
  }
}
