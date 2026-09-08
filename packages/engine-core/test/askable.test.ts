import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import { ParticipantApi } from '../src/participant-api.js';
import { TEXT, roster } from './helpers.js';

const HOUR = 3600_000;

/**
 * **What a race can still ask you, dealt or not** (Q1202; Ed, 2026-09-07:
 * *⏳ should mean "waiting for other people to vote". If there are things
 * you can do, it should show the symbol of that action, even if it's not
 * urgent*). The feed is a hand of `n` from the hot set, so a race can hold
 * an unjudged pair for a member and be absent from their hand; `askOn` is
 * the per-race read — the pair `feed` would deal on that race, or null once
 * nothing is left to ask — built by the one test the feed itself deals by.
 */
function open(over: Record<string, unknown> = {}): Session {
  return Session.open(
    {
      text: TEXT,
      roster: roster(3),
      constitution: makeConstitution({
        windowStartMs: 0,
        windowEndMs: 10 * HOUR,
        tokenDripMinutes: 60,
        cooldownMs: 0,
        rngSeed: 'askable',
        quorum: { form: 'count', n: 3 },
        ...over,
      }),
      settings: { s1: { n: 1 }, s2: { n: 2 } },
    },
    0,
  );
}

const pairOf = (c: { aId: string; bId: string }) => [c.aId, c.bId].sort().join('|');

describe('askOn: the pair a race can still ask a participant, dealt or not (Q1202)', () => {
  it('reports a pair on a race the hand does not hold, and the dealt pair on one it does', () => {
    const s = open();
    const m1 = s.submitCandidate(1010, {
      author: 'p1', setting: { settingId: 's1', value: { n: 101 } }, rationale: 'move s1' });
    const m2 = s.submitCandidate(1011, {
      author: 'p1', setting: { settingId: 's2', value: { n: 202 } }, rationale: 'move s2' });
    // a hand of one: exactly one of the two races is dealt to p2
    const hand = s.feed('p2', 1, 2 * HOUR);
    expect(hand).toHaveLength(1);
    const dealt = hand[0]!;
    const other = (dealt.raceId === m1.raceId ? m2.raceId : m1.raceId)!;
    // the undealt race still asks p2, and hands over a pair the hand lacks
    const ask = s.askOn('p2', other);
    expect(ask).not.toBeNull();
    expect(ask!.kind).toBe('edge');
    expect(ask!.raceId).toBe(other);
    expect(hand.map(pairOf)).not.toContain(pairOf(ask!));
    // on the dealt race the read and the hand agree: one test, one pair
    const same = s.askOn('p2', dealt.raceId);
    expect(same).not.toBeNull();
    expect(pairOf(same!)).toBe(pairOf(dealt));
    expect(same!.subtype).toBe(dealt.subtype);
    // and the pair is judgeable as it stands — no served-card check
    s.judge(1020, 'p2', ask!.aId, ask!.bId, 'a');
    expect(s.judgments().some((j) => j.participantId === 'p2' && pairOf(j) === pairOf(ask!))).toBe(true);
  });

  it('reports null on a race the participant has judged out, and on an unknown race', () => {
    const s = open();
    const { id, raceId } = s.submitCandidate(1010, {
      author: 'p1', setting: { settingId: 's1', value: { n: 101 } }, rationale: 'move s1' });
    const inc = s.races().find((r) => r.id === raceId)!.incumbentId;
    expect(s.askOn('p2', raceId!)).not.toBeNull();
    s.judge(1015, 'p2', id, inc, 'b');
    expect(s.askOn('p2', raceId!)).toBeNull();
    expect(s.askOn('p2', 'r:nobody')).toBeNull();
  });

  it('never returns the author’s own incumbent pair (R-062)', () => {
    const s = open();
    const { raceId } = s.submitCandidate(1010, {
      author: 'p1', setting: { settingId: 's1', value: { n: 101 } }, rationale: 'move s1' });
    // p1's own text against the incumbent is the one pair on the race
    expect(s.askOn('p1', raceId!)).toBeNull();
    expect(s.askOn('p2', raceId!)).not.toBeNull();
  });

  it('on a deadlocked race, reports a pair for the unheard and null for the heard (§8.3b)', () => {
    // one measured comparison and a huge ε: the first judgment deadlocks
    const s = open({ deadlockMinComparisons: 1, deadlockEpsilon: 10 });
    const { id, raceId } = s.submitCandidate(1010, {
      author: 'p1', setting: { settingId: 's1', value: { n: 101 } }, rationale: 'move s1' });
    const inc = s.races().find((r) => r.id === raceId)!.incumbentId;
    s.judge(1015, 'p2', id, inc, 'b');
    expect(s.races().find((r) => r.id === raceId)!.deadlocked).toBe(true);
    expect(s.askOn('p2', raceId!)).toBeNull();
    const ask = s.askOn('p3', raceId!);
    expect(ask).not.toBeNull();
    expect(pairOf(ask!)).toBe(pairOf({ aId: id, bId: inc }));
  });

  it('is blind on the participant API: the pair carries no routing value, and urgency is 0', () => {
    const s = open();
    const { raceId } = s.submitCandidate(1010, {
      author: 'p1', setting: { settingId: 's1', value: { n: 101 } }, rationale: 'move s1' });
    const api = new ParticipantApi(s, 'p2');
    const view = api.askOn(raceId!);
    expect(view).not.toBeNull();
    expect(view!.urgency).toBe(0);
    expect(view!.raceId).toBe(raceId);
    expect(view!.a.incumbent || view!.b.incumbent).toBe(true);
    expect(Object.keys(view!)).not.toContain('value');
    // the setting option's `value` is the option's content (Q390); the card's
    // own keys are exactly the feed's
    expect(Object.keys(view!).sort()).toEqual(['a', 'b', 'kind', 'raceId', 'subtype', 'urgency']);
    // judged out through the API too
    api.judge(1020, view!, 'a');
    expect(api.askOn(raceId!)).toBeNull();
    // and a race of nobody's: null, not a throw
    expect(api.askOn('r:nobody')).toBeNull();
  });
});
