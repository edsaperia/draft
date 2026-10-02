/**
 * **The demo bots' brain, over a fake transport** (design/DEMO.md Stage 5;
 * Q1535): the host's checks on a proposal (a swap built by the host, each
 * slot's time written back), the price book, the per-model request settings,
 * the fail-safe fallbacks — and that `ClaudeDemoModel` is never constructed
 * on a host with no `DRAFT_DEMO_ANTHROPIC_KEY` (criterion 4). No test calls
 * the Claude API.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Anthropic from '@anthropic-ai/sdk';
import { afterAll, describe, expect, it } from 'vitest';
import { applyPatch } from '../../engine-core/src/index.js';
import {
  ClaudeDemoModel, DEMO_MODELS, REWRITE_OVERLAP, blocksOf, claudeModelsMade, modelInfo, priceOf, proposalHunks, wordOverlap,
} from '../src/demo-model.js';
import type { DemoPersona, MessagesTransport } from '../src/demo-model.js';
import { FilePersistence } from '../src/persistence.js';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';

const PROGRAMME = [
  '# PizzaCon 2027',
  'A conference about pizza.',
  '## Day 1 · Origins',
  '### 09:45 · Keynote: The Margherita Question',
  '**Dr Tomasz Wierzbicki** — archivist.',
  'The story of the pizza made for a queen.',
  '### 10:45 · Coffee break',
  '### 11:15 · The Great Blind Tasting Debate',
  '**Declan Fairweather-Obi** (chair) — broadcaster.',
  'Six unlabelled margheritas.',
  '## Day 2 · Industry',
  '### 09:00 · Keynote: The 2027 Oven Standard',
  '**Priya Raman-Costa** — engineer.',
  'The standard, and the evidence.',
];

describe('the host builds a proposal (proposalHunks)', () => {
  it('a swap exchanges two sessions and each slot keeps its time', () => {
    const out = proposalHunks({ kind: 'swap', a: { start: 3, end: 6 }, b: { start: 11, end: 14 }, why: 'Oven first.' }, PROGRAMME);
    if ('dropped' in out) throw new Error(out.dropped);
    expect(out.swap).toBe(true);
    expect(out.hunks).toHaveLength(2);
    const after = applyPatch(PROGRAMME, out.hunks.map((h) => ({ start: h.start, end: h.end, lines: h.lines })));
    expect(after[3]).toBe('### 09:45 · Keynote: The 2027 Oven Standard');
    expect(after[4]).toBe('**Priya Raman-Costa** — engineer.');
    expect(after[11]).toBe('### 09:00 · Keynote: The Margherita Question');
    expect(after[12]).toBe('**Dr Tomasz Wierzbicki** — archivist.');
    // attested against the lines it was built over
    expect(out.hunks[0]!.was).toEqual(PROGRAMME.slice(3, 6));
  });

  it('a model need only name the heading lines; the host finds the ends', () => {
    const out = proposalHunks({ kind: 'swap', a: { start: 7, end: 0 }, b: { start: 3, end: 99 }, why: '' }, PROGRAMME);
    if ('dropped' in out) throw new Error(out.dropped);
    expect(out.hunks.map((h) => [h.start, h.end])).toEqual([[3, 6], [7, 10]]);
  });

  it('drops what the engine would refuse or what changes nothing', () => {
    const drop = (p: Parameters<typeof proposalHunks>[0]): string => {
      const out = proposalHunks(p, PROGRAMME);
      return 'dropped' in out ? out.dropped : 'kept';
    };
    expect(drop({ kind: 'swap', a: { start: 2, end: 10 }, b: { start: 3, end: 6 }, why: '' })).toMatch(/one level/);
    expect(drop({ kind: 'swap', a: { start: 4, end: 5 }, b: { start: 3, end: 6 }, why: '' })).toMatch(/two blocks/);
    expect(drop({ kind: 'rewrite', why: '', sites: [{ start: 1, end: 2, lines: ['A conference about pizza.'] }] })).toMatch(/nothing/);
    expect(drop({ kind: 'rewrite', why: '', sites: [{ start: 1, end: 3, lines: ['x'] }, { start: 2, end: 3, lines: ['y'] }] })).toMatch(/overlap/);
    expect(drop({ kind: 'rewrite', why: '', sites: [{ start: 1, end: 99, lines: ['x'] }] })).toMatch(/range/);
    expect(drop({ kind: 'rewrite', why: '', sites: Array.from({ length: 5 }, (_, i) => ({ start: i, end: i + 1, lines: ['x'] })) })).toMatch(/places/);
    expect(drop({ kind: 'rewrite', why: '', sites: [] })).toMatch(/place/);
    expect(drop({ kind: 'rewrite', why: '', sites: [{ start: 6, end: 6, lines: ['### 10:30 · A short break'] }] })).toBe('kept');
  });

  // #150: two rewrites on /demo (2026-10-02) arrived as insertions above the
  // paragraph they reworded, and both wordings stood. Ed's screenshots cut the
  // new wordings off; these are completed in their voice, from the words shown.
  describe('a rewrite sent as an insertion (#150)', () => {
    const DEMO = [
      '## Day 2 · Craft',
      '### 10:30 · Plant-Based Pizza: Beyond the Substitute',
      '**Leila Farahani** — chef and product developer who has written plant-based menus for restaurant groups in Tehran, Toronto and Berlin.',
      'The first plant-based pizzas imitated cheese and sausage. The second generation starts from vegetables and asks what a pizza is for.',
      '### 13:30 · Stretching Clinic (optional, in the courtyard)',
      '**Marco Villani** — who prosecutes pineapple on Wednesday and teaches dough by hand on Thursday.',
      'Half an hour for delegates who want to stretch a dough by hand under instruction before the afternoon begins; aprons are provided.',
    ];
    const insert = (at: number, line: string): string => {
      const out = proposalHunks({ kind: 'rewrite', why: '', sites: [{ start: at, end: at, lines: [line] }] }, DEMO);
      return 'dropped' in out ? out.dropped : 'kept';
    };
    const STRETCH = 'An optional thirty-minute hands-on session: delegates stretch a dough under instruction in the courtyard.';
    const PLANT = 'How do we build a pizza around plants instead of imitating cheese and sausage?';

    it('refuses both, as they reached the host: inserted above the paragraph they reword', () => {
      expect(insert(6, STRETCH)).toBe('a rewrite sent as an insertion');
      expect(insert(3, PLANT)).toBe('a rewrite sent as an insertion');
    });

    it('refuses one inserted below the paragraph it rewords', () => {
      expect(insert(7, STRETCH)).toBe('a rewrite sent as an insertion');
      expect(insert(4, PLANT)).toBe('a rewrite sent as an insertion');
    });

    it('keeps the same words sent as the replacement they are', () => {
      const out = proposalHunks({ kind: 'rewrite', why: '', sites: [{ start: 6, end: 7, lines: [STRETCH] }] }, DEMO);
      expect('dropped' in out).toBe(false);
    });

    it('accepts a new sentence under a session', () => {
      expect(insert(7, 'Sign up at the registration desk by noon; places are limited to twenty.')).toBe('kept');
      expect(insert(4, 'Tasting plates from three plant-based kitchens follow the talk.')).toBe('kept');
    });

    it('accepts a new session between two others, a heading weighed only against a heading', () => {
      const out = proposalHunks({ kind: 'rewrite', why: '', sites: [{ start: 4, end: 4, lines: [
        '### 12:30 · Lunch in the courtyard',
        'Plant-based and classic pizzas from the conference ovens.',
      ] }] }, DEMO);
      expect('dropped' in out).toBe(false);
    });

    it('weighs a heading against a heading only in the same slot', () => {
      expect(insert(4, '### 13:30 · Stretching Clinic: hands-on, in the courtyard')).toBe('a rewrite sent as an insertion');
      expect(insert(4, '### 12:45 · Stretching Clinic warm-up')).toBe('kept');
    });

    it('the threshold sits between the two kinds', () => {
      expect(wordOverlap(STRETCH, DEMO[6]!)).toBeGreaterThanOrEqual(REWRITE_OVERLAP);
      expect(wordOverlap(PLANT, DEMO[3]!)).toBeGreaterThanOrEqual(REWRITE_OVERLAP);
      expect(wordOverlap('Tasting plates from three plant-based kitchens follow the talk.', DEMO[3]!)).toBeLessThan(REWRITE_OVERLAP);
    });
  });

  it("a speaker's own sessions are read off the text", () => {
    const own = blocksOf(PROGRAMME, 'Priya Raman-Costa').filter((b) => b.own && b.level === 3);
    expect(own.map((b) => b.heading)).toEqual(['### 09:00 · Keynote: The 2027 Oven Standard']);
  });
});

describe('the price book', () => {
  it('prices uncached input, cache writes and reads, and output', () => {
    const haiku = modelInfo('claude-haiku-4-5')!;
    expect(priceOf(haiku, { input: 1_000_000, output: 0, cacheRead: 0, cacheWrite: 0 })).toBeCloseTo(1);
    expect(priceOf(haiku, { input: 0, output: 1_000_000, cacheRead: 0, cacheWrite: 0 })).toBeCloseTo(5);
    expect(priceOf(haiku, { input: 0, output: 0, cacheRead: 1_000_000, cacheWrite: 0 })).toBeCloseTo(0.1);
    expect(priceOf(haiku, { input: 0, output: 0, cacheRead: 0, cacheWrite: 1_000_000 })).toBeCloseTo(1.25);
    expect(DEMO_MODELS.map((m) => [m.id, m.inUsd, m.outUsd])).toEqual([
      ['claude-haiku-4-5', 1, 5], ['claude-sonnet-5', 2, 10], ['claude-opus-5-5', 4, 20]]);
  });
});

/** A transport that answers with whatever it is handed, and remembers each request. */
function fake(reply: (body: Anthropic.MessageCreateParamsNonStreaming) => Partial<Anthropic.Message>):
  MessagesTransport & { bodies: Anthropic.MessageCreateParamsNonStreaming[] } {
  const bodies: Anthropic.MessageCreateParamsNonStreaming[] = [];
  return {
    bodies,
    messages: {
      create: async (body) => {
        bodies.push(body);
        return { stop_reason: 'end_turn', content: [],
          usage: { input_tokens: 1000, output_tokens: 100, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
          ...reply(body) } as unknown as Anthropic.Message;
      },
    },
  };
}
const text = (t: string): Partial<Anthropic.Message> => ({ content: [{ type: 'text', text: t } as Anthropic.TextBlock] });
const persona: DemoPersona = { name: 'Nadia Haddad', persona: 'tightens claims', own: [], title: 'PizzaCon 2027' };
const card = { subtype: 'keep' as const,
  a: { changes: [{ before: 'x', after: 'x' }], rationale: '', current: true },
  b: { changes: [{ before: 'x', after: 'y' }], rationale: 'Clearer.', current: false, proposer: 'Marisol Duarte' } };

describe('ClaudeDemoModel, over a fake transport', () => {
  it('asks each model the way it must be asked', async () => {
    const t = fake(() => text('{"choice":"b","reason":"shorter"}'));
    for (const info of DEMO_MODELS) await new ClaudeDemoModel(info, 'k', t).judge(persona, card);
    const [haiku, sonnet, opus] = t.bodies;
    expect(haiku!.model).toBe('claude-haiku-4-5');
    expect(haiku!.thinking).toBeUndefined();
    expect(haiku!.output_config?.effort).toBeUndefined();
    expect(sonnet!.model).toBe('claude-sonnet-5');
    expect(sonnet!.thinking).toEqual({ type: 'disabled' });
    expect(sonnet!.output_config?.effort).toBe('low');
    // Opus 5.5 cannot turn thinking off: effort low, and room to think
    expect(opus!.model).toBe('claude-opus-5-5');
    expect(opus!.thinking).toBeUndefined();
    expect(opus!.output_config?.effort).toBe('low');
    expect(opus!.max_tokens).toBeGreaterThan(haiku!.max_tokens);
    for (const b of t.bodies) expect(b.output_config?.format?.type).toBe('json_schema');
  });

  it('maps a verdict, and falls back to indifferent — never a preference — on any failure', async () => {
    const haiku = modelInfo('claude-haiku-4-5')!;
    expect((await new ClaudeDemoModel(haiku, 'k', fake(() => text('{"choice":"b","reason":""}'))).judge(persona, card)).value).toBe('b');
    expect((await new ClaudeDemoModel(haiku, 'k', fake(() => text('{"choice":"indifferent","reason":""}'))).judge(persona, card)).value).toBe('tie');
    const junk = await new ClaudeDemoModel(haiku, 'k', fake(() => text('not json'))).judge(persona, card);
    expect(junk.value).toBe('tie');
    expect(junk.usage.input).toBe(1000); // a failed call still cost what it cost
    const refusal = await new ClaudeDemoModel(haiku, 'k', fake(() => ({ ...text('{"choice":"a"}'), stop_reason: 'refusal' }))).judge(persona, card);
    expect(refusal.value).toBe('tie');
    const thrown = await new ClaudeDemoModel(haiku, 'k', { messages: { create: async () => { throw new Error('529 overloaded'); } } }).judge(persona, card);
    expect(thrown.value).toBe('tie');
  });

  it('reads a proposal off the schema, and passes on anything malformed', async () => {
    const haiku = modelInfo('claude-haiku-4-5')!;
    const ask = async (json: string) => (await new ClaudeDemoModel(haiku, 'k', fake(() => text(json)))
      .propose(persona, { lines: PROGRAMME, blocks: blocksOf(PROGRAMME), live: [], wallet: 3 })).value;
    expect(await ask('{"action":"swap","sites":[],"a":[3,6],"b":[11,14],"why":"Oven first."}'))
      .toEqual({ kind: 'swap', a: { start: 3, end: 6 }, b: { start: 11, end: 14 }, why: 'Oven first.' });
    expect(await ask('{"action":"rewrite","sites":[{"start":1,"end":2,"lines":["A conference."]}],"a":[],"b":[],"why":"Shorter."}'))
      .toEqual({ kind: 'rewrite', sites: [{ start: 1, end: 2, lines: ['A conference.'] }], why: 'Shorter.' });
    expect(await ask('{"action":"pass","sites":[],"a":[],"b":[],"why":""}')).toBeNull();
    expect(await ask('{"action":"swap","sites":[],"a":[3],"b":[],"why":""}')).toBeNull();
    expect(await ask('garbage')).toBeNull();
  });
});

describe('no Claude key, no Claude (criterion 4)', () => {
  const booted: DraftServer[] = [];
  afterAll(async () => { for (const d of booted) await d.close(); });

  it('a host without DRAFT_DEMO_ANTHROPIC_KEY never constructs the model and refuses ▶️', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'draft-demomodel-'));
    const draft = await createDraftServer({
      port: 0, dataDir, baseUrl: 'http://127.0.0.1',
      designDir: join(import.meta.dirname, '..', '..', '..', 'design'),
      resendApiKey: null, mailFrom: 'test <t@example.org>', mailOff: false,
      botKey: null, secret: 'test-secret', store: 'file', databaseUrl: null,
      trustProxy: false, buildSha: null, notifyEmail: null, demoAnthropicKey: null,
    }, new FilePersistence(dataDir));
    booted.push(draft);
    const made = claudeModelsMade.n;
    // a document to act in, so the refusal is the key's and nothing else's
    draft.demoBots.setTarget({ doc: () => ({}) as never, generation: () => 1,
      botSeats: () => [{ id: 'm-1', name: 'A', persona: 'p' }] });
    const out = draft.demoBots.start({ count: 1, model: 'claude-haiku-4-5' });
    expect(out).toEqual({ ok: false, error: 'no Claude key on this host — the bots cannot start' });
    expect(draft.demoBots.stats().claudeKey).toBe(false);
    expect(claudeModelsMade.n).toBe(made);
    expect(() => new ClaudeDemoModel(modelInfo('claude-haiku-4-5')!, '')).toThrow(/DRAFT_DEMO_ANTHROPIC_KEY/);
  });
});
