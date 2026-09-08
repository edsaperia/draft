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
import { PEOPLE_SCHEMA_VERSION, SCHEMA_VERSION, versionOf } from '../src/types.js';
import { InMemoryPeople } from '../src/people.js';
import type { PersonFields } from '../src/people.js';
import { goldenWalk, snapshotOf } from './golden/walk.js';

const dir = join(import.meta.dirname, 'golden');

/** The rows frozen beside the log (decision 1253): what the host hands a replay. */
const frozenPeople = (): InMemoryPeople => new InMemoryPeople(Object.entries(
  JSON.parse(readFileSync(join(dir, 'founding.people.json'), 'utf8')) as
    Record<string, PersonFields>));

// **The separator is not part of the entry.** `freeze.ts` writes LF and git
// stores LF, but this repo's Windows checkouts run `core.autocrlf=true`, so
// the working copy is CRLF — and splitting on '\n' alone left a trailing CR on
// every line, failing the byte-for-byte comparison locally while CI stayed
// green. What is frozen is the JSON, so the line ending is stripped with it.
const frozenLines = readFileSync(join(dir, 'founding.jsonl'), 'utf8')
  .split(/\r?\n/).filter((l) => l.length > 0);
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

  it('replays from the frozen bytes and the frozen rows to the frozen state', () => {
    const log = frozenLines.map((l) => JSON.parse(l) as LogEntry);
    const s = ConstitutionSession.replay(log, frozenPeople());
    expect(s.verifyChain()).toBe(true);
    expect(s.rollingHash()).toBe(frozenState.rollingHash);
    expect(snapshotOf(s)).toEqual(JSON.parse(
      readFileSync(join(dir, 'founding.state.json'), 'utf8')));
  });

  // **The erasure claim, at golden strength** (decision 1253, PRODUCTION.md
  // stage 12): the rows are beside the log and never in it, so the same
  // bytes with no rows at all chain to the same hash — every person simply
  // reads as erased. This is the whole reason for the split.
  it('replays to the same hash with every row erased', () => {
    const log = frozenLines.map((l) => JSON.parse(l) as LogEntry);
    const s = ConstitutionSession.replay(log, new InMemoryPeople());
    expect(s.verifyChain()).toBe(true);
    expect(s.rollingHash()).toBe(frozenState.rollingHash);
    expect(s.constitutedAtT).not.toBeNull();
    expect(s.E()).toBeGreaterThan(0);
    for (const m of s.memberRecords().values()) {
      expect(m).toMatchObject({ erased: true, email: null, name: null, picture: null });
    }
    for (const a of s.applicantRecords().values()) {
      expect(a).toMatchObject({ erased: true, email: null, name: null, picture: null });
    }
    expect(s.convenorRecord().erased).toBe(true);
  });

  // **The pre-people shape is refused, never read** (decision 1253). Until
  // 2026-09-08 `founding-v0.jsonl` stood here — this walk with the version
  // stripped — proving that *absent means 1* replays; the alpha's documents
  // were wiped rather than migrated, so an unversioned log is now by
  // definition one that carries addresses in its events, and the module
  // refuses it by name. `versionOf` still reads absent as 1; 1 is refused.
  it('refuses a log written below the people version (Q480 → decision 1253)', () => {
    const old = frozenLines.map((l) => {
      const { schemaVersion: _v, ...rest } = JSON.parse(l) as LogEntry;
      return rest as LogEntry;
    });
    expect(old.every((e) => e.schemaVersion === undefined)).toBe(true);
    expect(old.every((e) => versionOf(e) === 1)).toBe(true);
    expect(PEOPLE_SCHEMA_VERSION).toBeGreaterThan(1);
    expect(() => ConstitutionSession.replay(old, frozenPeople()))
      .toThrow(/pre-people shape \(decision 1253\)/);
    // one old entry among new ones is enough: the whole document is refused
    const mixed = frozenLines.map((l) => JSON.parse(l) as LogEntry);
    delete mixed[mixed.length - 1]!.schemaVersion;
    expect(() => ConstitutionSession.replay(mixed, frozenPeople()))
      .toThrow(/pre-people shape \(decision 1253\)/);
  });

  it('stamps what this build writes', () => {
    const written = goldenWalk().logEntries();
    expect(written.every((e) => e.schemaVersion === SCHEMA_VERSION)).toBe(true);
  });

  it('is long enough to be worth freezing', () => {
    // a golden that covers three acts proves nothing; this one runs from an
    // empty document to a live one with motions, an application and the
    // clock behind it
    expect(frozenState.entries).toBeGreaterThan(60);
  });
});
