/**
 * `walkBase` — which server a walk attaches to (entry 105, 2026-08-27).
 *
 * The five attaching walks used to pick their server by a literal port, so a
 * run under plan-queue — where the slot carries `PORT=816n` and
 * `DRAFT_BASE_URL=http://127.0.0.1:816n` — walked 8199 and drove whatever
 * happened to answer there. The ladder is the fix, and its whole content is
 * an order of precedence, so that order is what is pinned here.
 *
 * It lives in `@draft/server` because `scripts/` is outside every workspace's
 * vitest and this is the package whose `config.ts` owns both variables it
 * reads (`DRAFT_BASE_URL` for the server's own origin, `PORT` for its port,
 * defaulting to the same 8140 the walks now fall back to). The helper is a
 * `.mjs` under `scripts/`, imported through a computed URL so tsc resolves
 * nothing outside this package's `include`.
 *
 * The sha rung of `assertServerBuild` is deliberately not tested here: its
 * refusal calls `process.exit(2)`, and what the check is worth is the message
 * a person reads, which the journey walk exercises against a server booted
 * with a wrong `DRAFT_BUILD_SHA`.
 */
import { describe, it, expect, beforeAll } from 'vitest';

type WalkBase = (
  argv: string[],
  env: Record<string, string | undefined>,
  fallback: string,
) => string;

const FALLBACK = 'http://127.0.0.1:8140';
let walkBase: WalkBase;

beforeAll(async () => {
  const href = new URL('../../../scripts/lib/assert-server.mjs', import.meta.url).href;
  const mod = await import(/* @vite-ignore */ href);
  walkBase = mod.walkBase as WalkBase;
});

describe('walkBase — which server the walk attaches to', () => {
  it('a person naming a URL outranks the environment', () => {
    expect(walkBase(
      ['node', 'scripts/journey-walk.mjs', 'http://127.0.0.1:8170'],
      { DRAFT_BASE_URL: 'http://127.0.0.1:8161', PORT: '8161' },
      FALLBACK,
    )).toBe('http://127.0.0.1:8170');
  });

  it('DRAFT_BASE_URL outranks PORT — it is the origin the server itself uses', () => {
    expect(walkBase(
      ['node', 'scripts/journey-walk.mjs'],
      { DRAFT_BASE_URL: 'https://docs.vote', PORT: '8161' },
      FALLBACK,
    )).toBe('https://docs.vote');
  });

  it('PORT alone gives the loopback at that port', () => {
    expect(walkBase(['node', 'w.mjs'], { PORT: '8163' }, FALLBACK))
      .toBe('http://127.0.0.1:8163');
  });

  it('nothing named gives the fallback, which is the server’s own default', () => {
    expect(walkBase(['node', 'w.mjs'], {}, FALLBACK)).toBe(FALLBACK);
    // flags are not URLs, and neither is the script path
    expect(walkBase(['node', 'w.mjs', '--hat=clerk', '--to=live'], {}, FALLBACK)).toBe(FALLBACK);
  });

  it('one trailing slash is stripped, whichever rung answered', () => {
    expect(walkBase(['node', 'w.mjs', 'http://127.0.0.1:8170/'], {}, FALLBACK))
      .toBe('http://127.0.0.1:8170');
    expect(walkBase(['node', 'w.mjs'], { DRAFT_BASE_URL: 'https://docs.vote/' }, FALLBACK))
      .toBe('https://docs.vote');
  });
});
