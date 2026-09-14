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
function open(
  over: Record<string, unknown> = {},
  settings: Record<string, unknown> = { s1: { n: 1 }, s2: { n: 2 } },
): Session {
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
      settings,
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

  it('is blind on the participant API: the pair carries no routing value', () => {
    const s = open();
    const { raceId } = s.submitCandidate(1010, {
      author: 'p1', setting: { settingId: 's1', value: { n: 101 } }, rationale: 'move s1' });
    const api = new ParticipantApi(s, 'p2');
    const view = api.askOn(raceId!, 10, 2 * HOUR);
    expect(view).not.toBeNull();
    // the one race a hand of ten certainly holds, so the pair is priced
    // against its own value and reads 1 (Q98)
    expect(view!.urgency).toBe(1);
    expect(view!.raceId).toBe(raceId);
    expect(view!.a.incumbent || view!.b.incumbent).toBe(true);
    expect(Object.keys(view!)).not.toContain('value');
    // the setting option's `value` is the option's content (Q390); the card's
    // own keys are exactly the feed's
    expect(Object.keys(view!).sort()).toEqual(['a', 'b', 'kind', 'raceId', 'subtype', 'urgency']);
    // judged out through the API too
    api.judge(1020, view!, 'a');
    expect(api.askOn(raceId!, 10, 2 * HOUR)).toBeNull();
    // and a race of nobody's: null, not a throw
    expect(api.askOn('r:nobody', 10, 2 * HOUR)).toBeNull();
  });
});

/**
 * **An outside pair is priced against the hand's own top** (Q98, Ed
 * 2026-09-14; SPEC §8.3, R-111). From Q1202 to here every race outside the
 * hand reported `urgency` 0: last in the margin, which is right, and
 * unordered among themselves, which is a tie the router never declared. The
 * ruling is the real value — the same pivotality `feed` prices pairs by,
 * over the same top the hand was priced against.
 */
describe('askOn: the urgency of a race outside the hand (Q98)', () => {
  // no exploration or diagonal rolls, so a hand is hot-set edges and nothing
  // else; three settings, so a hand of one leaves two races outside it
  const THREE = { s1: { n: 1 }, s2: { n: 2 }, s3: { n: 3 } };
  const QUIET = { explorationEvery: 1e9, salienceEvery: 1e9 };
  const T = 2 * HOUR;

  /**
   * One untouched race, dealt first because its leader is nearest the bar,
   * and two knocked back by p1 to different degrees — so the races outside
   * p2's hand hold pairs of visibly different value, and neither is worth
   * more than the dealt one. Every pair here is still p2's to judge.
   */
  function threeRaces(): Session {
    const s = open(QUIET, THREE);
    s.submitCandidate(1010, {
      author: 'p1', setting: { settingId: 's1', value: { n: 101 } }, rationale: 'move s1' });
    const b = s.submitCandidate(1011, {
      author: 'p3', setting: { settingId: 's2', value: { n: 202 } }, rationale: 'move s2' });
    const c = s.submitCandidate(1012, {
      author: 'p3', setting: { settingId: 's3', value: { n: 303 } }, rationale: 'move s3' });
    const incB = s.races().find((r) => r.id === b.raceId)!.incumbentId;
    const incC = s.races().find((r) => r.id === c.raceId)!.incumbentId;
    s.judge(1015, 'p1', b.id, incB, 'b');
    s.judge(1016, 'p1', c.id, incC, 'tie');
    return s;
  }

  it('reports its own value over the hand’s top: below the hand, and in order', () => {
    const s = threeRaces();
    const api = new ParticipantApi(s, 'p2');
    // a hand of one; the other two races are outside it and still ask p2
    const hand = api.nextCards(1, T);
    const raw = s.feed('p2', 1, T);
    expect(raw).toHaveLength(1);
    const top = raw[0]!.value;
    expect(top).toBeGreaterThan(0);
    const dealt = new Set(raw.map((c) => c.raceId));
    const outside = s.races().filter((r) => !dealt.has(r.id));
    expect(outside).toHaveLength(2);

    const asks = outside.map((r) => ({
      id: r.id,
      urgency: api.askOn(r.id, 1, T)!.urgency,
      // the engine's own card carries the routing value the API strips
      value: s.askOn('p2', r.id)!.value,
    }));
    const floorOfHand = Math.min(...hand.map((c) => c.urgency));
    for (const a of asks) {
      expect(a.urgency).toBeCloseTo(a.value / top, 12);
      // strictly between nothing and the least urgent card in the hand
      expect(a.urgency).toBeGreaterThan(0);
      expect(a.urgency).toBeLessThan(floorOfHand);
    }
    // and in order among themselves: the more pivotal pair is the more urgent
    const [lo, hi] = [...asks].sort((x, y) => x.value - y.value);
    expect(hi!.value).toBeGreaterThan(lo!.value);
    expect(hi!.urgency).toBeGreaterThan(lo!.urgency);
    // the hand is priced as it always was, and the deal is unchanged
    expect(hand.map((c) => c.raceId)).toEqual(raw.map((c) => c.raceId));
    expect(floorOfHand).toBe(1);
  });

  it('clamps at 1 where the outside pair outvalues everything dealt', () => {
    // the hot set orders races by closeness × salience, not by pair value,
    // so a measured race can be dealt while an unmeasured one — whose pair
    // would move the model more — waits outside. The scale tops out at the
    // flame either way, so the reading is 1 and never above it.
    const s = open(QUIET, THREE);
    const a = s.submitCandidate(1010, {
      author: 'p1', setting: { settingId: 's1', value: { n: 101 } }, rationale: 'move s1' });
    s.submitCandidate(1011, {
      author: 'p1', setting: { settingId: 's2', value: { n: 202 } }, rationale: 'move s2' });
    const inc = s.races().find((r) => r.id === a.raceId)!.incumbentId;
    s.judge(1015, 'p3', a.id, inc, 'a');
    const raw = s.feed('p2', 1, T);
    const outside = s.races().find((r) => r.id !== raw[0]!.raceId)!;
    expect(s.askOn('p2', outside.id)!.value).toBeGreaterThan(raw[0]!.value);
    expect(new ParticipantApi(s, 'p2').askOn(outside.id, 1, T)!.urgency).toBe(1);
  });

  it('reads 1 where the hand prices nothing, as a hand of nothing does', () => {
    const s = threeRaces();
    const api = new ParticipantApi(s, 'p2');
    const race = s.races()[0]!;
    // no magnitude to be relative to, so the pair the race can still ask
    // reads 1 — the rule `nextCards` has had for a valueless hand since
    // stage 8, rather than a real question filed below cards worth nothing
    expect(api.nextCards(0, T)).toHaveLength(0);
    expect(api.askOn(race.id, 0, T)!.urgency).toBe(1);
  });
});
