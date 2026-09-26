import { describe, expect, it } from 'vitest';
import { Session, makeConstitution, INC_PREFIX } from '../src/session.js';
import { ParticipantApi } from '../src/participant-api.js';
import { TEXT, roster } from './helpers.js';

const HOUR = 3600_000;

/**
 * **What a session derives from its state is derived once per state**
 * (Q1324, Ed 2026-09-11: *we should be able to handle far more than 31
 * users acting every 30 seconds*). The host's view route read `races()`
 * once per race per seat per poll, and every read rebuilt the whole race
 * picture — union-find, incumbent hashes, fits — from scratch. `derived`
 * keeps the picture until the next event; these tests hold the three
 * things that make the memo exact rather than approximate: the hand does
 * not depend on the clock, a fold invalidates, and what is handed out is
 * never the cache itself.
 */
function open(over: Record<string, unknown> = {}): Session {
  return Session.open(
    {
      text: TEXT,
      // **Eight, since Q1439** (R-126): no quorum asks for more than half, so
      // a count of 4 in a room of four is read as 2 and the second approval
      // on any race carries it — these tests need a race that survives the
      // judgment whose invalidation they are about. At eight the same count
      // of 4 is under the cap and still out of reach of two voices.
      roster: roster(8),
      constitution: makeConstitution({
        windowStartMs: 0,
        windowEndMs: 10 * HOUR,
        // A ramping bar, so the threshold differs at every `t` the feed is
        // asked at — the test's own, the default being pinned flat since
        // v0.128 (R-117). The divisor is all the feed reads it for, and
        // `closeness` stopped reading it at all (R-118), so this is now the
        // strongest form of the clock-independence proof rather than the only
        // one available. It goes with the ramp in the deletion pass.
        adoptionThresholdStart: 0.55,
        adoptionThresholdEnd: 0.95,
        tokenDripMinutes: 60,
        cooldownMs: 0,
        rngSeed: 'derived',
        quorum: { form: 'count', n: 4 },
        ...over,
      }),
      settings: { s1: { n: 1 }, s2: { n: 2 }, s3: { n: 3 } },
    },
    0,
  );
}

const seed = (s: Session): void => {
  s.submitCandidate(1010, { author: 'p1', setting: { settingId: 's1', value: { n: 11 } }, rationale: 'a' });
  s.submitCandidate(1011, { author: 'p2', setting: { settingId: 's2', value: { n: 22 } }, rationale: 'b' });
  s.submitCandidate(1012, { author: 'p3', setting: { settingId: 's3', value: { n: 33 } }, rationale: 'c' });
  s.submitCandidate(1013, { author: 'p1', setting: { settingId: 's2', value: { n: 23 } }, rationale: 'd' });
};

describe('derived state is computed once per state version (Q1324)', () => {
  it('deals the same hand at every clock for one state: the threshold is a common divisor', () => {
    const s = open();
    seed(s);
    // the threshold really does move between these
    expect(s.adoptionThreshold(HOUR)).toBeLessThan(s.adoptionThreshold(9 * HOUR));
    const fresh = open();
    seed(fresh);
    for (const p of ['p1', 'p2', 'p3', 'p4']) {
      // the memoised session, asked at many clocks, against an unmemoised
      // one asked once per clock (its memo is cold at each `t` because a
      // new session is opened for it)
      const atOne = fresh.feed(p, 10, HOUR);
      for (const t of [HOUR, 2 * HOUR, 5 * HOUR, 9 * HOUR, 9.99 * HOUR]) {
        const cold = open();
        seed(cold);
        expect(s.feed(p, 10, t)).toEqual(cold.feed(p, 10, t));
        expect(cold.feed(p, 10, t)).toEqual(atOne);
      }
    }
  });

  it('a judgment invalidates: races, judgments, the hand and askOn all move with the state', () => {
    const s = open();
    seed(s);
    const api = new ParticipantApi(s, 'p4');
    const before = s.races();
    const hand = api.nextCards(10, 2000);
    expect(hand.length).toBeGreaterThan(0);
    const card = hand[0]!;
    expect(s.askOn('p4', card.raceId)).not.toBeNull();
    s.judge(2000, 'p4', card.a.id, card.b.id, 'a');
    const after = s.races().find((r) => r.id === card.raceId)!;
    const was = before.find((r) => r.id === card.raceId)!;
    expect(after.comparisons).toBe(was.comparisons + 1);
    expect(s.judgments().some((j) => j.participantId === 'p4')).toBe(true);
    // the pair just judged is out of the hand and out of the per-race ask
    const pair = [card.a.id, card.b.id].sort().join('|');
    for (const c of api.nextCards(10, 2001)) {
      expect([c.a.id, c.b.id].sort().join('|')).not.toBe(pair);
    }
    const ask = s.askOn('p4', card.raceId);
    if (ask !== null) expect([ask.aId, ask.bId].sort().join('|')).not.toBe(pair);
  });

  it('hands out copies: a caller that reorders or empties the array cannot poison the next read', () => {
    const s = open();
    seed(s);
    const races = s.races();
    const n = races.length;
    races.length = 0;
    expect(s.races()).toHaveLength(n);
    const hand = s.feed('p4', 10, 2000);
    const dealt = hand.length;
    hand.reverse();
    hand.pop();
    expect(s.feed('p4', 10, 2000)).toHaveLength(dealt);
    const api = new ParticipantApi(s, 'p4');
    api.outcomes().push({} as never);
    expect(api.outcomes()).toHaveLength(0);
    s.judgments().push({} as never);
    expect(s.judgments()).toHaveLength(0);
  });

  it('a fold reads twice across its own mutation, and the second read sees it (Q1326)', () => {
    const s = open();
    seed(s);
    const api = new ParticipantApi(s, 'p4');
    const card = api.nextCards(10, 2000)[0]!;
    const cand = [card.a.id, card.b.id].find((id) => !id.startsWith(INC_PREFIX))!;
    // The judgment fold is the fold that reads `races()` on both sides of its
    // own push: the ground before it (the incumbent the judgment was cast
    // against), the fit after it (`updatePeaks`). Before the push nobody but
    // the author has spoken for this candidate, and an author is not the
    // room — so the peak the graveyard is ranked on is still nothing.
    expect(s.getCandidate(cand).peakW).toBe(0);
    s.judge(2000, 'p4', card.a.id, card.b.id, card.a.id === cand ? 'a' : 'b');
    // and it moved, which only a read taken after the push could have done
    expect(s.getCandidate(cand).peakW).toBeGreaterThan(0.5);
    // the ground, meanwhile, is the one that stood before the push
    const cast = s.judgments().find((j) => j.participantId === 'p4')!;
    expect(cast.locked).toBe(false);
  });

  it('and one judgment rebuilds the picture once, not three times (Q1326, Q1553)', () => {
    const s = open();
    seed(s);
    const api = new ParticipantApi(s, 'p4');
    const card = api.nextCards(10, 2000)[0]!;
    // count what actually gets computed rather than what gets asked for: the
    // host's own `derived` closures resolve this property at call time, so an
    // own property over the prototype's method sees every read in the engine
    const inner = s.derived.bind(s);
    let builds = 0;
    (s as unknown as { derived: Session['derived'] }).derived = (key, compute) =>
      inner(key, () => {
        if (key === 'races') builds++;
        return compute();
      });
    s.races(); // warm, as a command path always is: the last act left this here
    builds = 0;
    s.judge(2000, 'p4', card.a.id, card.b.id, 'a');
    // One inside the fold — `raceOfPair` and `updatePeaks` share it across the
    // push — and one for the adoption sweep, which runs on the state the fold
    // finished in. Three before Q1326 on an incumbent pair like this one, five
    // on a rival pair (the ground took a read per endpoint), and every one of
    // them uncached all the way down, which is the other half of the cost:
    // `usableComparisons` was computed twice per race per build. This is the
    // assertion that stops the memo being suspended again — every other test
    // in this file would stay green if it were.
    //
    // **And none inside the fold since Q1553**: `raceOfPair` and `updatePeaks`
    // want the race's members and ground, which the grouping answers without
    // a picture (`groupOf`), so the one build left is the sweep's. A fold that
    // went back to `races()` for them would read two again here — and every
    // replay would pay a whole picture per judgment, which is what Q1553 cut.
    expect(builds).toBe(1);
  });

  it('replays to the same state and the same derived picture', () => {
    const s = open();
    seed(s);
    const api = new ParticipantApi(s, 'p4');
    const card = api.nextCards(10, 2000)[0]!;
    s.judge(2000, 'p4', card.a.id, card.b.id, 'a');
    const twin = Session.replay([...s.log]);
    expect(twin.rollingHash()).toBe(s.rollingHash());
    expect(twin.races()).toEqual(s.races());
    expect(twin.judgments()).toEqual(s.judgments());
    expect(twin.feed('p3', 10, 3000)).toEqual(s.feed('p3', 10, 3000));
  });
});
