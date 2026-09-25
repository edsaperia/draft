import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import type { Event } from '../src/types.js';
import { roster } from './helpers.js';
import { pairKey } from '../src/routing.js';

/**
 * **Rivals stay in the race** (SPEC v0.141 §2.4, §4.4, §9.6; Ed 2026-09-24,
 * Q1534 → why: R-141). A change to the text carries every live patch by one of
 * three roads: rebased where it touches none of the changed lines, **re-aimed**
 * where it covers them, stranded where it touches them without covering them.
 * A re-aimed rival stays live, now replacing the words the change put there,
 * and keeps the judgments that compared two documents the change left whole:
 * against the adopted wording (read from then on as the current text) and
 * against a rival the same change re-aimed. Against the displaced text they
 * lock. The same holds for a setting race whose standing moves.
 *
 * `dominated.test.ts` holds the worked example (*Notice*); `pen-adoption` the
 * decree and the park; `text/carry.test.ts` the roads themselves. This file is
 * the rest of the proposal's list (§8).
 */

const HOUR = 3600_000;
const MIN = 60_000;

const DOC = [
  '# Charter',
  'Membership is open to anyone.',
  'Decisions are made by consensus.',
  'Meetings happen when someone calls one.',
].join('\n');

function open(overrides: Record<string, unknown> = {}, size = 5): Session {
  return Session.open({
    text: DOC,
    roster: roster(size),
    constitution: makeConstitution({
      windowStartMs: 0, windowEndMs: 100 * HOUR, rngSeed: 'reaim',
      cooldownMs: 0, ...overrides,
    }),
    settings: { s1: { n: 1 } },
  }, 0);
}

const at = (base: number, start: number, end: number, ...lines: string[]) =>
  ({ baseVersion: base, hunks: [{ start, end, lines }] });
const raceOf = (s: Session, id: string, t?: number) =>
  s.races(t).find((r) => r.members.includes(id))!;
const events = (s: Session): Event[] => s.log.map((e) => e.event);
const reaimedOf = (s: Session, id: string) => events(s)
  .filter((e): e is Extract<Event, { type: 'candidate-reaimed' }> =>
    e.type === 'candidate-reaimed' && e.id === id);

/**
 * X (p1) and W (p2) both rewrite line 1 in a room of seven; `judge` casts what
 * is to be carried, then p4–p7 approve W until it carries, from `wAt`. W has
 * to be the top of the field for that, so a test that prefers X to W somewhere
 * balances it with p6 and p7 preferring W.
 */
function xAgainstW(judge: (s: Session, x: string, w: string, inc: string) => void,
  overrides: Record<string, unknown> = {}, wAt = 2500) {
  const s = open(overrides, 7);
  const x = s.submitCandidate(1000, { author: 'p1', rationale: 'x',
    patch: at(0, 1, 2, 'Membership is by invitation.') }).id;
  const w = s.submitCandidate(1100, { author: 'p2', rationale: 'w',
    patch: at(0, 1, 2, 'Membership is open to members.') }).id;
  const inc = raceOf(s, x).incumbentId;
  judge(s, x, w, inc);
  let t = wAt;
  for (const who of ['p4', 'p5', 'p6', 'p7']) {
    if (s.getCandidate(w).state === 'adopted') break;
    s.judge((t += 10), who, w, inc, 'a');
    // **W waits until it is measured against X** (Q1538 → why: R-142): where
    // the rival pair is still short, the same member answers it, for W
    const short = s.races(t).find((r) => r.members.includes(w))?.measureShort ?? [];
    if (s.getCandidate(w).state !== 'adopted' && short.includes(pairKey(x, w))) {
      s.judge((t += 10), who, x, w, 'b');
    }
  }
  expect(s.getCandidate(w).state).toBe('adopted');
  return { s, x, w, oldInc: inc };
}

/** p3 prefers X to W, p6 and p7 W to X: the balance that keeps W on top. */
const balanced = (s: Session, x: string, w: string): void => {
  s.judge(2000, 'p3', x, w, 'a');
  s.judge(2010, 'p6', x, w, 'b');
  s.judge(2020, 'p7', x, w, 'b');
};

describe('a re-aimed rival (R-141)', () => {
  it('stays live, re-aimed at the words the winner put there, and is not reset', () => {
    const { s, x, w } = xAgainstW((s, x, w) => balanced(s, x, w));
    const c = s.getCandidate(x);
    expect(c.state).toBe('live');
    expect(c.patch).toEqual(at(1, 1, 2, 'Membership is by invitation.'));
    expect(reaimedOf(s, x)).toHaveLength(1);
    expect(reaimedOf(s, x)[0]).toMatchObject({ by: w });
    expect(reaimedOf(s, x)[0]!.carried).toHaveLength(3);
    const race = raceOf(s, x);
    // p1's own and p3's carried for it, p6 and p7 against: three carried
    // judgments counted, none reset
    expect(race.approvals).toBe(2);
    expect(race.comparisons).toBe(3);
  });

  it('adopts at a later batch once its carried votes and one more put it on top', () => {
    const { s, x } = xAgainstW((s, x, w) => balanced(s, x, w));
    // 2 for, 2 against: a tie leaves the current text standing
    s.tick(3000);
    expect(s.getCandidate(x).state).toBe('live');
    // one more member prefers X to what now stands: a change of mind, seconded
    s.judge(3100, 'p5', x, raceOf(s, x).incumbentId, 'a');
    expect(s.getCandidate(x).state).toBe('adopted');
    expect(s.document()).toContain('Membership is by invitation.');
  });

  it('a carried preference for the winner is an opposition', () => {
    const { s, x } = xAgainstW((s, x, w) => { s.judge(2000, 'p3', x, w, 'b'); });
    const race = raceOf(s, x);
    expect(race.approvals).toBe(1); // p1's own
    expect(race.group).toBe(7);     // p1 and p3 answered, the other five awaited
    expect(s.judgments().find((j) => j.participantId === 'p3')!.carried).toBeDefined();
  });

  it('a carried Indifferent is an answer: out of the group, and not asked again', () => {
    const { s, x } = xAgainstW((s, x, w) => { s.judge(2000, 'p3', x, w, 'tie'); });
    const race = raceOf(s, x);
    expect(race.approvals).toBe(1);
    expect(race.group).toBe(6); // p3 has answered, and Indifferent leaves the group
    expect(s.askOn('p3', race.id)).toBeNull(); // nothing left to ask p3 there
    // p4 and p5 answered X against W so W could carry (R-142): p6 has not
    expect(s.askOn('p6', race.id)).not.toBeNull();
  });

  it('a judgment against the displaced text locks', () => {
    // p6, since p4 and p5 answer X against W on the way to W carrying (R-142)
    const { s, x, oldInc } = xAgainstW((s, x, _w, inc) => { s.judge(2000, 'p6', x, inc, 'b'); });
    const old = s.judgments().find((j) => j.participantId === 'p6' && j.bId === oldInc)!;
    expect(old.locked).toBe(true);
    expect(old.carried).toBeUndefined();
    expect(raceOf(s, x).approvals).toBe(1);
    // and p6 is asked again, on the pair as it now stands
    expect(s.askOn('p6', raceOf(s, x).id)).not.toBeNull();
  });

  it('the author’s explicit judgment of the winner carries and overrides the derived one', () => {
    const { s, x } = xAgainstW((s, x, w) => { s.judge(2000, 'p1', x, w, 'b'); });
    expect(raceOf(s, x).approvals).toBe(0);
  });

  it('keeps the pair with a rival the same change re-aimed; locks the pair with one it stranded', () => {
    const s = open({}, 7);
    // W rewrites lines 1–2 as one run; X the same run; Y lines 0–2; Z line 1 alone
    const x = s.submitCandidate(1000, { author: 'p1', rationale: 'x',
      patch: at(0, 1, 3, 'X: membership and decisions.') }).id;
    const y = s.submitCandidate(1010, { author: 'p3', rationale: 'y',
      patch: at(0, 0, 3, '# Rules', 'Y: membership and decisions.') }).id;
    const z = s.submitCandidate(1020, { author: 'p5', rationale: 'z',
      patch: at(0, 1, 2, 'Z: membership only.') }).id;
    const w = s.submitCandidate(1030, { author: 'p2', rationale: 'w',
      patch: at(0, 1, 3, 'W: membership and decisions.') }).id;
    s.judge(2000, 'p4', x, y, 'a');
    s.judge(2010, 'p4', x, z, 'a');
    s.judge(2020, 'p6', x, w, 'b');
    s.judge(2030, 'p7', x, w, 'b');
    const inc = raceOf(s, w).incumbentId;
    let t = 2100;
    for (const who of ['p3', 'p4', 'p5', 'p6', 'p7']) {
      if (s.getCandidate(w).state === 'adopted') break;
      s.judge((t += 10), who, w, inc, 'a');
      // W waits on its pairs with Y and Z (R-142): the same member answers
      // each still short, for W
      for (const k of s.races(t).find((r) => r.members.includes(w))?.measureShort ?? []) {
        if (s.getCandidate(w).state === 'adopted') break;
        const other = k.split('|').find((id) => id !== w)!;
        if (k.split('|').includes(w)) s.judge((t += 10), who, other, w, 'b');
      }
    }
    expect(s.getCandidate(w).state).toBe('adopted');
    expect(s.getCandidate(x).state).toBe('live');
    expect(s.getCandidate(y).state).toBe('live');
    expect(s.getCandidate(z).state).toBe('rebase-pending');
    const xy = s.judgments().find((j) => j.aId === x && j.bId === y)!;
    const xz = s.judgments().find((j) => j.aId === x && j.bId === z)!;
    expect(xy.locked).toBe(false);
    expect(xy.carried).toEqual({ aId: x, bId: y });
    expect(xz.locked).toBe(true);
    // X's pairs with W on X's own event; the X-vs-Y pair on the later of the two
    const xw = s.judgments().filter((j) => j.aId === x && j.bId === w).map((j) => j.seq);
    expect(xw).toHaveLength(2);
    expect(reaimedOf(s, x)[0]!.carried).toEqual(xw);
    // and Y's with W, which the wait for rivals had the room answer (R-142)
    const yw = s.judgments().filter((j) => j.aId === y && j.bId === w).map((j) => j.seq);
    expect(yw.length).toBeGreaterThan(0);
    expect(reaimedOf(s, y)[0]!.carried).toEqual([...yw, xy.seq].sort((a, b) => a - b));
  });

  it('a winner with a hunk the rival does not cover strands it', () => {
    const s = open({}, 7);
    const x = s.submitCandidate(1000, { author: 'p1', rationale: 'x',
      patch: at(0, 1, 2, 'Membership is by invitation.') }).id;
    const w = s.submitCandidate(1100, { author: 'p2', rationale: 'w', patch: { baseVersion: 0,
      hunks: [{ start: 1, end: 2, lines: ['Membership is open to members.'] },
        { start: 3, end: 4, lines: ['Meetings happen monthly.'] }] } }).id;
    s.judge(2000, 'p3', x, w, 'b');
    s.judge(2100, 'p4', w, raceOf(s, w).incumbentId, 'a');
    // W is measured against X before it carries (R-142)
    s.judge(2110, 'p4', x, w, 'b');
    expect(s.getCandidate(w).state).toBe('adopted');
    expect(s.getCandidate(x).state).toBe('rebase-pending');
    expect(s.judgments().find((j) => j.participantId === 'p3')!.locked).toBe(true);
    expect(events(s).some((e) => e.type === 'candidate-reaimed')).toBe(false);
  });

  it('starts a fresh 💤 period for everyone who has not answered, from the moment it was re-aimed', () => {
    const period = 10 * MIN;
    // W carries half an hour after X was made
    const { s, x } = xAgainstW((s, x, w) => { s.judge(2000, 'p3', x, w, 'b'); },
      { abstainAfterMs: period }, 30 * MIN);
    const reaimedAt = reaimedOf(s, x)[0]!.t;
    expect(reaimedAt).toBeGreaterThan(30 * MIN);
    const race = raceOf(s, x, reaimedAt);
    // p5 is awaited from the re-aim, not from X's submission
    expect(s.abstainDeadline(race.id, 'p5')).toBe(reaimedAt + period);
    // p3 answered by the carried judgment, so is awaited on nothing
    expect(s.abstainDeadline(race.id, 'p3')).toBeNull();
    // just before the fresh period runs out nobody has abstained
    expect(raceOf(s, x, reaimedAt + period - 1).abstained).toBe(0);
  });

  it('is filed undecided at the close like any live race member', () => {
    const { s, x } = xAgainstW((s, x, w) => { s.judge(2000, 'p3', x, w, 'b'); });
    s.close(4000);
    expect(s.getCandidate(x).state).toBe('undecided');
    const filed = events(s).find((e) => e.type === 'candidate-undecided' && e.id === x);
    expect(filed).toMatchObject({ refund: 0, raceId: `r:${x}` });
  });

  it('withdrawn, it hands its stake back whole', () => {
    const { s, x } = xAgainstW((s, x, w) => { s.judge(2000, 'p3', x, w, 'b'); });
    const before = s.balance('p1', 3000);
    s.withdraw(3000, x);
    expect(s.getCandidate(x).exit).toMatchObject({ cause: 'withdrawn', refund: 1 });
    expect(s.balance('p1', 3000)).toBe(before + 1);
  });

  it('replays bit for bit, and a replayed session carries the same judgments', () => {
    const { s } = xAgainstW((s, x, w) => {
      balanced(s, x, w);
      s.judge(2050, 'p5', x, w, 'tie');
    });
    const again = Session.replay(s.log);
    expect(again.rollingHash()).toBe(s.rollingHash());
    expect(again.judgments()).toEqual(s.judgments());
    expect(again.races()).toEqual(s.races());
    expect(again.allCandidates()).toEqual(s.allCandidates());
  });
});

describe('a setting race whose standing moves (Q1534 ruling 7, R-141)', () => {
  /** X, Y and W race on s1; W carries; the host applies it. */
  function settingRivals() {
    const s = open({ quorum: { form: 'count', n: 3 } });
    const x = s.submitCandidate(1000, { author: 'p1', rationale: 'x', setting: { settingId: 's1', value: { n: 2 } } }).id;
    const y = s.submitCandidate(1010, { author: 'p3', rationale: 'y', setting: { settingId: 's1', value: { n: 3 } } }).id;
    const w = s.submitCandidate(1020, { author: 'p2', rationale: 'w', setting: { settingId: 's1', value: { n: 4 } } }).id;
    const inc = raceOf(s, w).incumbentId;
    s.judge(2000, 'p4', x, w, 'b');   // W over X: carried as an opposition to X
    s.judge(2010, 'p5', y, w, 'a');   // Y over W: carried as an approval of Y
    // W measured against both rivals before it carries (R-142), winning each
    // 2–1 — and short of closing either, so both are there to be carried
    s.judge(2013, 'p3', x, w, 'a');   // X over W: carried as an approval of X
    s.judge(2014, 'p5', x, w, 'b');   // W over X: an opposition
    s.judge(2015, 'p1', y, w, 'b');   // W over Y: an opposition
    s.judge(2016, 'p4', y, w, 'b');   // W over Y: an opposition
    s.judge(2020, 'p5', x, y, 'a');   // X over Y: stands
    s.judge(2030, 'p4', x, inc, 'a'); // X over the old value: locks
    s.judge(2100, 'p4', w, inc, 'a');
    s.judge(2110, 'p5', w, inc, 'a');
    expect(s.getCandidate(w).state).toBe('adopted');
    // the engine never applies a value: until the host does, nothing moves
    expect(events(s).some((e) => e.type === 'candidate-reaimed')).toBe(false);
    return { s, x, y, w, inc };
  }

  it('the standing moving carries the votes against the value that carried, and the rival pair', () => {
    const { s, x, y, w, inc } = settingRivals();
    s.setStanding(3000, 's1', { n: 4 });
    const re = events(s).filter((e): e is Extract<Event, { type: 'candidate-reaimed' }> =>
      e.type === 'candidate-reaimed');
    expect(re.map((e) => [e.id, e.by, e.patch])).toEqual([[x, w, undefined], [y, w, undefined]]);
    const race = raceOf(s, x);
    expect(race.incumbentId).not.toBe(inc);
    expect(race.members).toEqual([x, y]);
    const js = s.judgments();
    const xw = js.find((j) => j.aId === x && j.bId === w)!;
    const yw = js.find((j) => j.aId === y && j.bId === w)!;
    const xy = js.find((j) => j.aId === x && j.bId === y)!;
    const xOld = js.find((j) => j.aId === x && j.bId === inc)!;
    expect([xw.locked, yw.locked, xy.locked, xOld.locked]).toEqual([false, false, false, true]);
    expect(xw.carried).toEqual({ aId: x, bId: race.incumbentId });
    expect(xy.carried).toEqual({ aId: x, bId: y });
    // seven usable judgments: X-vs-current three (one for), Y-vs-current three
    // (one for), X-vs-Y — the six carried from the pairs with W
    expect(race.comparisons).toBe(7);
  });

  it('a standing moved by no candidate carries the rival pairs alone', () => {
    const { s, x, y, w } = settingRivals();
    s.setStanding(3000, 's1', { n: 9 }); // not W's value: the Founder's pen, say
    const re = events(s).filter((e): e is Extract<Event, { type: 'candidate-reaimed' }> =>
      e.type === 'candidate-reaimed');
    // only Y's event carries anything — the X-vs-Y pair, on the later event
    expect(re.map((e) => [e.id, e.by, e.carried.length])).toEqual([[y, undefined, 1]]);
    const js = s.judgments();
    expect(js.find((j) => j.aId === x && j.bId === w)!.locked).toBe(true);
    expect(js.find((j) => j.aId === x && j.bId === y)!.locked).toBe(false);
  });

  it('a standing that does not move carries nothing and emits nothing', () => {
    const { s } = settingRivals();
    const before = s.log.length;
    s.setStanding(3000, 's1', { n: 1 });
    expect(s.log.slice(before).map((e) => e.event.type)).toEqual(['standing-set']);
  });

  it('replays bit for bit', () => {
    const { s } = settingRivals();
    s.setStanding(3000, 's1', { n: 4 });
    const again = Session.replay(s.log);
    expect(again.rollingHash()).toBe(s.rollingHash());
    expect(again.judgments()).toEqual(s.judgments());
    expect(again.races()).toEqual(s.races());
  });
});
