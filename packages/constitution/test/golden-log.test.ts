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
import { SCHEMA_VERSION, versionOf } from '../src/types.js';
import { goldenWalk, snapshotOf } from './golden/walk.js';

const dir = join(import.meta.dirname, 'golden');
/** founding-v0.jsonl's own rolling hash, as the code of 2026-08-20 wrote and read it. */
const V0_ROLLING_HASH = '7c7dc4b22774191694ea4f4f86fd4a24f1768747a4c65f887955a63e71a8e112';
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

  it('reads a log written before versioning existed (Q480)', () => {
    // founding-v0.jsonl is this same walk as the code wrote it on the
    // morning of 2026-08-20, before entries carried schemaVersion — the
    // shape every document on staging is written in. It is frozen forever:
    // the claim that "absent means 1" is worth nothing without a log that
    // actually lacks the field.
    const old = readFileSync(join(dir, 'founding-v0.jsonl'), 'utf8')
      .split('\n').filter((l) => l.length > 0)
      .map((l) => JSON.parse(l) as LogEntry);
    expect(old.every((e) => e.schemaVersion === undefined)).toBe(true);
    expect(old.every((e) => versionOf(e) === 1)).toBe(true);

    const s = ConstitutionSession.replay(old);
    expect(s.verifyChain()).toBe(true);
    // The version rides outside the hash, so this log chains to exactly
    // where it did the morning it was written — and to today's golden: the
    // start's lay-down of the Text's powers is derived at the fold, never
    // emitted, so a log written before 2026-08-21 replays the same state.
    expect(s.rollingHash()).toBe(V0_ROLLING_HASH);
    const today = JSON.parse(readFileSync(join(dir, 'founding.state.json'), 'utf8')) as
      { entries: number; rollingHash: string; settings: Record<string, unknown> };
    expect(today.rollingHash).toBe(V0_ROLLING_HASH);
    expect(s.settingState('startingText').powers).toEqual({ unilateral: false, assent: false });
    // (the snapshot lists a setting only once an event names it, so the old
    // log's snapshot has no Text row at all — compare everything else)
    const strip = (x: typeof today) => {
      const { startingText: _t, ...settings } = x.settings;
      return { ...x, entries: 0, rollingHash: '', settings };
    };
    expect(strip(snapshotOf(s) as typeof today)).toEqual(strip(today));
  });

  it('stamps what this build writes', () => {
    const written = goldenWalk().logEntries();
    expect(written.every((e) => e.schemaVersion === SCHEMA_VERSION)).toBe(true);
  });

  it('is long enough to be worth freezing', () => {
    // a golden that covers three acts proves nothing; this one runs from an
    // empty document to a live one with motions, an application and a
    // sign-out behind it
    expect(frozenState.entries).toBeGreaterThan(60);
  });
});
