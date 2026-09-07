import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import { TEXT, roster } from './helpers.js';

const HOUR = 3600_000;

/**
 * **A deadlocked race still asks the members it has never heard from**
 * (SPEC §8.3b, R-072; Ed, 2026-09-07, Q1283). Until Q1283 `feed()` dropped a
 * deadlocked race from everybody's hand, while the empty-queue test already
 * counted it as work for a member with no usable comparison on it — half of
 * the spec's sentence. One test now serves both: the race is served to a
 * member who has never judged it as an ordinary race, leaves their feed once
 * they have, and is disclosed as deadlocked only then.
 */
function open(): Session {
  return Session.open(
    {
      text: TEXT,
      roster: roster(3),
      constitution: makeConstitution({
        windowStartMs: 0,
        windowEndMs: 10 * HOUR,
        tokenDripMinutes: 60,
        cooldownMs: 0,
        rngSeed: 'deadlock-serving',
        // one measured comparison and a huge ε: the first judgment deadlocks
        deadlockMinComparisons: 1,
        deadlockEpsilon: 10,
        quorum: { form: 'count', n: 3 },
      }),
      settings: { s1: { n: 1 } },
    },
    0,
  );
}

describe('a deadlocked race still asks the members it has never heard from (§8.3b, Q1283)', () => {
  it('leaves the judged member’s feed and stays in the unjudged member’s until they judge', () => {
    const s = open();
    const { id, raceId } = s.submitCandidate(1010, {
      author: 'p1',
      setting: { settingId: 's1', value: { n: 101 } },
      rationale: 'move s1',
    });
    const inc = s.races().find((r) => r.id === raceId)!.incumbentId;
    s.judge(1015, 'p2', id, inc, 'b');
    expect(s.races().find((r) => r.id === raceId)!.deadlocked).toBe(true);
    // p2 has judged it: nothing is left to ask them, so it leaves their feed
    expect(s.feed('p2', 10, 2 * HOUR).some((c) => c.raceId === raceId)).toBe(false);
    // p3 has never judged it: served as an ordinary race
    expect(s.feed('p3', 10, 2 * HOUR).some((c) => c.raceId === raceId)).toBe(true);
    // and once p3 has judged, it leaves their feed too
    s.judge(1020, 'p3', id, inc, 'b');
    expect(s.feed('p3', 10, 3 * HOUR).some((c) => c.raceId === raceId)).toBe(false);
  });
});
