/**
 * The golden log (PRODUCTION.md stage 5): today's code must both write and
 * read yesterday's bytes.
 *
 * Two assertions, and they fail for different reasons, which is why both
 * are here. **Re-emit** catches a change in what we *write* — an event
 * gaining a field, an id minted differently, an act emitting two events
 * where it emitted one — at the moment it happens, in a diff a human still
 * remembers writing. **Replay** catches a change in how we *read*: a fold
 * that reaches a different state from an identical log leaves every hash
 * intact and every existing document quietly wrong.
 *
 * This is also the oracle for the Postgres migration (stage 6) and for the
 * restore drill (stage 11): rows that move must verify to this same
 * rolling hash. Re-freeze deliberately with `npm run golden:freeze`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import type { LogEntry } from '../src/types.js';
import { goldenWalk, snapshotOf } from './golden/walk.js';

const dir = join(import.meta.dirname, 'golden');
const frozenLines = readFileSync(join(dir, 'founding.jsonl'), 'utf8')
  .split('\n').filter((l) => l.length > 0);
const frozenState = JSON.parse(readFileSync(join(dir, 'founding.state.json'), 'utf8')) as
  { rollingHash: string; entries: number };

describe('the golden log', () => {
  it('is written byte for byte by today’s code', () => {
    const written = goldenWalk().logEntries().map((e) => JSON.stringify(e));
    // compared line by line: the first differing act is the one to read
    expect(written.length).toBe(frozenLines.length);
    for (let i = 0; i < written.length; i++) {
      expect(written[i], `entry ${i}`).toBe(frozenLines[i]);
    }
  });

  it('replays from the frozen bytes to the frozen state', () => {
    const log = frozenLines.map((l) => JSON.parse(l) as LogEntry);
    const s = ConstitutionSession.replay(log);
    expect(s.verifyChain()).toBe(true);
    expect(s.rollingHash()).toBe(frozenState.rollingHash);
    expect(snapshotOf(s)).toEqual(JSON.parse(
      readFileSync(join(dir, 'founding.state.json'), 'utf8')));
  });

  it('is long enough to be worth freezing', () => {
    // a golden that covers three acts proves nothing; this one runs from an
    // empty document to a live one with motions, an application and a
    // sign-out behind it
    expect(frozenState.entries).toBeGreaterThan(60);
  });
});
