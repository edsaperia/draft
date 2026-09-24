/**
 * **The stand-in brain** (`StubDemoModel`, design/DEMO.md Stage 4): what the
 * demo's bots think with in tests, in CI and in `npm run demo-bots-walk`, so no
 * test ever calls the Claude API. **Dev-only**: reached through a dynamic
 * `import()` inside a `DEV:` label (`server.ts`, `DRAFT_DEMO_STUB=1`) or
 * imported by a test directly, and `build-server.mjs` greps the artifact for
 * its name — the production host has no way to run bots that are not Claude.
 *
 * Deterministic where it matters: an opinion of a candidate is a hash of the
 * seat and the candidate's wording (room-bots' `opinion`), so a bot answers the
 * same pair the same way every time. A proposal is a swap of two session
 * blocks **one time in four** — so every walk exercises the multi-hunk path —
 * and otherwise a small rewrite of one body line. It reports usage as a model
 * would, so the spend meter and its cap are exercised too.
 */
import { blocksOf } from './demo-model.js';
import type { DemoJudgeInput, DemoModel, DemoModelInfo, DemoMotionAnswer, DemoMotionInput,
  DemoPersona, DemoProposal, DemoProposeInput, DemoUsage, DemoVerdict, Priced } from './demo-model.js';

const hash01 = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100_000) / 100_000;
};

/** What a stub call "cost": a judge and a propose call's shape (DEMO.md §6). */
export const STUB_USAGE = {
  judge: { input: 1500, output: 60, cacheRead: 0, cacheWrite: 0 } as DemoUsage,
  propose: { input: 5000, output: 300, cacheRead: 0, cacheWrite: 0 } as DemoUsage,
  motion: { input: 400, output: 10, cacheRead: 0, cacheWrite: 0 } as DemoUsage,
};

const TAILS = ['— with time for questions.', '— places are limited.', '— bring an appetite.',
  '— in plain words.', '— with a live demonstration.', '— and a tasting.'];

export class StubDemoModel implements DemoModel {
  /** How many proposals this instance has made, so the one-in-four is exact. */
  private proposals = 0;
  constructor(readonly info: DemoModelInfo) {}

  async judge(p: DemoPersona, card: DemoJudgeInput): Promise<Priced<DemoVerdict>> {
    const key = (o: DemoJudgeInput['a']): string => o.changes.map((c) => c.after).join('\n');
    const score = (o: DemoJudgeInput['a']): number => o.current ? 0.5 : hash01(`${p.name}/${key(o)}`);
    const a = score(card.a), b = score(card.b);
    const value: DemoVerdict = Math.abs(a - b) < 0.08 ? 'tie' : a > b ? 'a' : 'b';
    return { value, usage: STUB_USAGE.judge };
  }

  async propose(p: DemoPersona, doc: DemoProposeInput): Promise<Priced<DemoProposal | null>> {
    this.proposals += 1;
    const seed = hash01(`${p.name}/${this.proposals}/${doc.lines.length}`);
    if (this.proposals % 4 === 1) {
      const swap = this.swap(doc.lines, seed);
      if (swap !== null) return { value: swap, usage: STUB_USAGE.propose };
    }
    const body = doc.lines.map((_, i) => i).filter((i) => {
      const l = doc.lines[i]!;
      return l.trim() !== '' && !/^#/.test(l) && !doc.live.some((c) => i >= c.start && i < Math.max(c.end, c.start + 1));
    });
    if (body.length === 0) return { value: null, usage: STUB_USAGE.propose };
    const i = body[Math.floor(seed * body.length)]!;
    const line = doc.lines[i]!.replace(/\s*—[^—]*$/, '').trim();
    const tail = TAILS[Math.floor(hash01(`${seed}/tail`) * TAILS.length)]!;
    const value: DemoProposal = { kind: 'rewrite', why: `${p.name.split(' ').slice(-1)[0]} thinks it reads better.`,
      sites: [{ start: i, end: i + 1, lines: [`${line} ${tail}`] }] };
    return { value, usage: STUB_USAGE.propose };
  }

  /** Two blocks of one level, the deepest level that has two with bodies. */
  private swap(lines: string[], seed: number): DemoProposal | null {
    const blocks = blocksOf(lines).filter((b) => b.end - b.start >= 2 && b.end - b.start <= 12);
    for (const level of [3, 2, 1]) {
      const same = blocks.filter((b) => b.level === level);
      if (same.length < 2) continue;
      const i = Math.floor(seed * same.length);
      const j = (i + 1 + Math.floor(hash01(`${seed}/j`) * (same.length - 1))) % same.length;
      const a = same[i]!, b = same[j]!;
      if (a.start === b.start) continue;
      return { kind: 'swap', a: { start: a.start, end: a.end }, b: { start: b.start, end: b.end },
        why: 'These two would sit better the other way round.' };
    }
    return null;
  }

  async answerMotion(p: DemoPersona, m: DemoMotionInput): Promise<Priced<DemoMotionAnswer>> {
    return { value: hash01(`${p.name}/${m.summary}`) < 0.6 ? 'accept' : 'keep', usage: STUB_USAGE.motion };
  }
}
