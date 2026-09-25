import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import { pairKey } from '../src/routing.js';
import type { Event, RaceView } from '../src/types.js';
import { roster } from './helpers.js';

/**
 * **The leader measured against its rivals, and ranked inside the Smith set**
 * (SPEC v0.142 §4.2, §4.4, §8.2, §8.3; Ed 2026-09-24/25, Q1538, Q1539 → why:
 * R-142, R-143). The plan's acceptance criteria, by name:
 *
 *   A1–A9 — the wait for rivals (`rival-measure`) and the router's asking of
 *   those pairs (`measure-serving`);
 *   M1–M4 — the bar (`meter-need`);
 *   B1–B5 — the Smith set (`smith-set`, `smith-rank`).
 *
 * A race of one candidate is untouched by all of it (A6, B3): the corpus of
 * single-candidate tests elsewhere runs unedited, and B3 below is the
 * property that says why.
 */

const HOUR = 3600_000;
const MIN = 60_000;

const DOC = [
  '# Charter',
  'Membership is open to anyone.',
  'Decisions are made by consensus.',
  'Meetings happen when someone calls one.',
].join('\n');

function open(size: number, overrides: Record<string, unknown> = {}): Session {
  return Session.open({
    text: DOC,
    roster: roster(size),
    constitution: makeConstitution({
      windowStartMs: 0, windowEndMs: 1000 * HOUR, rngSeed: 'rival-measure',
      cooldownMs: 0, ...overrides,
    }),
  }, 0);
}

const onLine = (s: Session, line: number, text: string) =>
  ({ baseVersion: s.currentVersion(), hunks: [{ start: line, end: line + 1, lines: [text] }] });
const raceOf = (s: Session, id: string, t?: number): RaceView =>
  s.races(t).find((r) => r.members.includes(id))!;
const adoptedIn = (events: Event[]) =>
  events.filter((e): e is Extract<Event, { type: 'adopted' }> => e.type === 'adopted');

/** X (p1) and Y (p2) on line 1 of a room of five, the floor 2 (the seconder). */
function twoRivals(overrides: Record<string, unknown> = {}, size = 5) {
  const s = open(size, overrides);
  const X = s.submitCandidate(1000, { author: 'p1', rationale: 'x',
    patch: onLine(s, 1, 'Membership is by invitation.') }).id;
  const Y = s.submitCandidate(1100, { author: 'p2', rationale: 'y',
    patch: onLine(s, 1, 'Membership is open to members.') }).id;
  return { s, X, Y, inc: raceOf(s, X).incumbentId };
}

describe('rival-measure: the leader waits on its rivals (Q1538, R-142)', () => {
  it('A1 — F approvals and an unasked rival pair: no adoption until the last pair is measured', () => {
    const { s, X, Y, inc } = twoRivals();
    s.judge(2000, 'p3', X, inc, 'a');
    const r = raceOf(s, X);
    expect(r.approvals).toBeGreaterThanOrEqual(r.floor);
    expect(s.getCandidate(X).state).toBe('live');
    expect(r.rivals).toEqual({ measured: 0, of: 1 });
    expect(r.measureShort).toEqual([pairKey(X, Y)]);
    // one answer on X against Y is short of that pair's floor of two
    expect(adoptedIn(s.judge(2100, 'p4', X, Y, 'a'))).toEqual([]);
    expect(raceOf(s, X).measureShort).toEqual([pairKey(X, Y)]);
    // the command that measures the pair carries X
    const events = s.judge(2200, 'p5', X, Y, 'a');
    expect(adoptedIn(events).map((e) => e.candidateId)).toEqual([X]);
    // and the batch recorded what it decided on: measured against its one rival
    expect(adoptedIn(events)[0]).toMatchObject({ rivals: { measured: 1, of: 1 } });
  });

  it('A2 — the hidden better rival: a room answering whatever it is served passes Y, not X', () => {
    // plan §2: 3 X>Y>cur, 1 X>cur>Y, 5 Y>X>cur, 1 cur>X>Y, 5 cur>Y>X — X beats
    // the current text 9–6, Y beats it 8–7, and Y beats X 10–5
    const RANK: Record<string, string[]> = {};
    const order = ['XYc', 'YXc', 'cYX', 'YXc', 'cYX', 'XYc', 'YXc', 'cYX', 'XcY', 'YXc',
      'cYX', 'XYc', 'YXc', 'cYX', 'cXY'];
    order.forEach((o, i) => { RANK[`p${i + 1}`] = o.split(''); });
    const s = open(15, { quorum: { form: 'share', n: 50 } });
    // X's author prefers X to Y to the current text, Y's author Y to X to it
    const X = s.submitCandidate(1000, { author: 'p1', rationale: 'x',
      patch: onLine(s, 1, 'Membership is by invitation.') }).id;
    const Y = s.submitCandidate(1100, { author: 'p2', rationale: 'y',
      patch: onLine(s, 1, 'Membership is open to members.') }).id;
    const label = (id: string): string => (id === X ? 'X' : id === Y ? 'Y' : 'c');
    let t = 2000;
    for (let round = 0; round < 10; round++) {
      for (let m = 1; m <= 15; m++) {
        const race = s.races(t).find((r) => r.members.includes(X) || r.members.includes(Y));
        if (race === undefined) break;
        const card = s.askOn(`p${m}`, race.id, t);
        if (card === null) continue;
        const rank = RANK[`p${m}`]!;
        const out = rank.indexOf(label(card.aId)) < rank.indexOf(label(card.bId)) ? 'a' : 'b';
        s.judge((t += 10), `p${m}`, card.aId, card.bId, out);
      }
    }
    expect(s.getCandidate(Y).state).toBe('adopted');
    expect(s.getCandidate(X).state).not.toBe('adopted');
  });

  it('A3 — a settled rival pair counts as measured below its floor', () => {
    // a quorum of all five, so the pair's floor is five; a prior adoption
    // starts an hour's cooldown, so nothing retires while we look
    const s = open(5, { quorum: { form: 'count', n: 5 }, cooldownMs: HOUR });
    const Z = s.submitCandidate(500, { author: 'p1', rationale: 'z',
      patch: onLine(s, 3, 'Meetings happen monthly.') }).id;
    for (const [i, p] of ['p2', 'p3', 'p4', 'p5'].entries()) {
      s.judge(600 + i, p, Z, raceOf(s, Z).incumbentId, 'a');
    }
    expect(s.getCandidate(Z).state).toBe('adopted');
    const X = s.submitCandidate(1000, { author: 'p1', rationale: 'x',
      patch: onLine(s, 1, 'Membership is by invitation.') }).id;
    const Y = s.submitCandidate(1100, { author: 'p2', rationale: 'y',
      patch: onLine(s, 1, 'Membership is open to members.') }).id;
    s.judge(2000, 'p3', X, Y, 'a');
    s.judge(2010, 'p4', X, Y, 'a');
    // 2–0 with three still to answer: short
    expect(raceOf(s, X).measureShort).toContain(pairKey(X, Y));
    s.judge(2020, 'p5', X, Y, 'a');
    // 3–0 with two still to answer: no answer to come can overturn it, so it
    // is measured three answers below its floor of five
    const r = raceOf(s, X);
    expect(r.leaderId).toBe(X);
    expect(r.measureShort).not.toContain(pairKey(X, Y));
    // and a settled loss to the leader is R-132's rival domination read the
    // same way round: Y is closing, so X no longer counts it among its rivals
    expect(r.dominated).toEqual([{ id: Y, by: 'rival' }]);
    expect(r.rivals).toEqual({ measured: 0, of: 0 });
  });

  it('A4 — an abstention on a rival pair shrinks its floor with no event, and the batch at that t releases the leader', () => {
    const period = 10 * MIN;
    const { s, X, Y, inc } = twoRivals({ quorum: { form: 'count', n: 4 }, abstainAfterMs: period });
    for (const [i, p] of ['p3', 'p4', 'p5'].entries()) s.judge(2000 + i, p, X, inc, 'a');
    // X against Y: 2–1 among three answers, p1 and p2 silent; a floor of four
    s.judge(2100, 'p3', X, Y, 'a');
    s.judge(2110, 'p4', X, Y, 'a');
    s.judge(2120, 'p5', X, Y, 'b');
    const before = raceOf(s, X, 2200);
    expect(before.measureShort).toEqual([pairKey(X, Y)]);
    expect(s.getCandidate(X).state).toBe('live');
    // the pair became answerable when Y was submitted; a period on, p1 and p2
    // leave its group, the floor falls to three, and three have answered
    const after = raceOf(s, X, 1100 + period + 1);
    expect(after.measureShort).toEqual([]);
    expect(after.rivals).toEqual({ measured: 1, of: 1 });
    // the view before is unchanged by having read the later one (Q1439)
    expect(raceOf(s, X, 2200).measureShort).toEqual([pairKey(X, Y)]);
    const events = s.tick(1100 + period + 1);
    expect(adoptedIn(events).map((e) => e.candidateId)).toEqual([X]);
  });

  it('A5 — at the close the wait is waived, and the record says how many rivals were measured', () => {
    const { s, X, inc } = twoRivals();
    s.judge(2000, 'p3', X, inc, 'a');
    expect(s.getCandidate(X).state).toBe('live');
    s.close(3000);
    const adopted = adoptedIn(s.log.map((e) => e.event));
    expect(adopted.map((e) => e.candidateId)).toEqual([X]);
    expect(adopted[0]!.rivals).toEqual({ measured: 0, of: 1 });
  });

  it('A6 — a race of one candidate records no rivals, and waits on nothing', () => {
    const s = open(5);
    const X = s.submitCandidate(1000, { author: 'p1', rationale: 'x',
      patch: onLine(s, 1, 'Membership is by invitation.') }).id;
    expect(raceOf(s, X).rivals).toEqual({ measured: 0, of: 0 });
    expect(raceOf(s, X).measureShort).toEqual([]);
    const events = s.judge(2000, 'p3', X, raceOf(s, X).incumbentId, 'a');
    expect(adoptedIn(events)).toHaveLength(1);
    expect(adoptedIn(events)[0]).not.toHaveProperty('rivals');
  });

  it('A7 — a rival the batch will close is not waited on', () => {
    // a prior adoption elsewhere starts the cooldown, so the next batch is a tick
    const s = open(5, { cooldownMs: HOUR });
    const Z = s.submitCandidate(500, { author: 'p1', rationale: 'z',
      patch: onLine(s, 3, 'Meetings happen monthly.') }).id;
    s.judge(600, 'p2', Z, raceOf(s, Z).incumbentId, 'a');
    expect(s.getCandidate(Z).state).toBe('adopted');
    const X = s.submitCandidate(1000, { author: 'p1', rationale: 'x',
      patch: onLine(s, 1, 'Membership is by invitation.') }).id;
    const Y = s.submitCandidate(1100, { author: 'p2', rationale: 'y',
      patch: onLine(s, 1, 'Membership is open to members.') }).id;
    const inc = raceOf(s, X).incumbentId;
    // the room refuses Y outright: a + w = 1 + 1 ≤ o = 3
    for (const [i, p] of ['p3', 'p4', 'p5'].entries()) s.judge(2000 + i, p, Y, inc, 'b');
    s.judge(2100, 'p3', X, inc, 'a');
    const r = raceOf(s, X);
    expect(r.dominated.map((d) => d.id)).toEqual([Y]);
    expect(r.rivals).toEqual({ measured: 0, of: 0 });
    expect(r.measureShort).toEqual([]);
    // X against Y was never asked, and X carries at the batch that closes Y
    const events = s.tick(600 + HOUR + 1);
    expect(adoptedIn(events).map((e) => e.candidateId)).toEqual([X]);
  });

  it('A8 — a deadlocked race with a short measure pair keeps asking it', () => {
    // a deadlock threshold nothing clears: every race with evidence reads as
    // having nothing worth asking, which is what isolates the new clause
    const { s, X, Y, inc } = twoRivals({ deadlockMinComparisons: 1, deadlockEpsilon: 10 });
    s.judge(2000, 'p3', X, inc, 'a');
    const r = raceOf(s, X);
    expect(r.measureShort).toEqual([pairKey(X, Y)]);
    expect(r.deadlocked).toBe(false);
    const card = s.askOn('p4', r.id);
    expect(card && [card.aId, card.bId].sort()).toEqual([X, Y].sort());
    // and once nothing it waits on is left, the old rule reads again
    s.judge(2100, 'p4', X, Y, 'b');
    s.judge(2110, 'p5', X, Y, 'b');
    const after = s.races().find((x) => x.members.includes(Y));
    expect(after?.measureShort ?? []).toEqual([]);
  });

  it('A9 — serving order: the decisive pair first, then the leader against its oldest short rival', () => {
    const s = open(6);
    const X = s.submitCandidate(1000, { author: 'p1', rationale: 'x',
      patch: onLine(s, 1, 'Membership is by invitation.') }).id;
    const Y = s.submitCandidate(1100, { author: 'p2', rationale: 'y',
      patch: onLine(s, 1, 'Membership is open to members.') }).id;
    const W = s.submitCandidate(1200, { author: 'p3', rationale: 'w',
      patch: onLine(s, 1, 'Membership is open to friends.') }).id;
    const inc = raceOf(s, X).incumbentId;
    // short of its floor, the leader against the current text comes first
    const first = s.askOn('p4', raceOf(s, X).id)!;
    expect([first.aId, first.bId].sort()).toEqual([X, inc].sort());
    s.judge(2000, 'p4', X, inc, 'a');
    // at its floor, the leader waits on Y and W, oldest first: p5 is asked X–Y
    const r = raceOf(s, X);
    expect(r.leaderId).toBe(X);
    expect(r.measureShort).toEqual([pairKey(X, Y), pairKey(X, W)]);
    const next = s.askOn('p5', r.id)!;
    expect([next.aId, next.bId].sort()).toEqual([X, Y].sort());
    // and p4, having answered the decisive pair, is asked the same
    const again = s.askOn('p4', r.id)!;
    expect([again.aId, again.bId].sort()).toEqual([X, Y].sort());
  });
});

describe('meter-need: the bar never fills on a live race (Q1538 ruling 1, R-118, R-142)', () => {
  it('M3 — one candidate: n/F below the floor, n/(n+1) at and above it', () => {
    const s = open(5, { quorum: { form: 'count', n: 3 } });
    const X = s.submitCandidate(1000, { author: 'p1', rationale: 'x',
      patch: onLine(s, 1, 'Membership is by invitation.') }).id;
    const inc = raceOf(s, X).incumbentId;
    expect(raceOf(s, X).closeness).toBeCloseTo(1 / 3, 10); // its author's own answer
    s.judge(2000, 'p2', X, inc, 'a');
    expect(raceOf(s, X).closeness).toBeCloseTo(2 / 3, 10);
    // a vote against moves it exactly as a vote for would have: three
    // answers, the floor met, and it wants one more than it has
    s.judge(2100, 'p3', X, inc, 'b');
    expect(s.getCandidate(X).state).toBe('live');
    expect(raceOf(s, X).closeness).toBeCloseTo(3 / 4, 10);
    s.judge(2200, 'p4', X, inc, 'tie');
    expect(raceOf(s, X).closeness).toBeCloseTo(4 / 5, 10);
  });

  it('M4 — a rival arriving adds its pair to the denominator; measured, it drops out', () => {
    const s = open(5, { quorum: { form: 'count', n: 3 } });
    const X = s.submitCandidate(1000, { author: 'p1', rationale: 'x',
      patch: onLine(s, 1, 'Membership is by invitation.') }).id;
    const inc = raceOf(s, X).incumbentId;
    s.judge(2000, 'p3', X, inc, 'a');
    expect(raceOf(s, X).closeness).toBeCloseTo(2 / 3, 10);
    const Y = s.submitCandidate(2100, { author: 'p2', rationale: 'y',
      patch: onLine(s, 1, 'Membership is open to members.') }).id;
    const r = raceOf(s, X);
    expect(r.leaderId).toBe(X);
    // two of three on X against the current text, none of three on X–Y
    expect(r.closeness).toBeCloseTo(2 / 6, 10);
    for (const [i, p] of ['p3', 'p4', 'p5'].entries()) s.judge(2200 + i, p, X, Y, 'a');
    expect(raceOf(s, X).measureShort).toEqual([]);
    expect(raceOf(s, X).closeness).toBeCloseTo(2 / 3, 10);
  });

  it('M1 — never 1 on a live race, whatever the answers', () => {
    let seed = 7;
    const rnd = (n: number): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
    for (let trial = 0; trial < 40; trial++) {
      const size = 2 + rnd(8);
      const s = open(size, { quorum: rnd(2) ? null : { form: 'share', n: 25 + 25 * rnd(4) } });
      const ids = [s.submitCandidate(1000, { author: 'p1', rationale: 'x',
        patch: onLine(s, 1, 'Membership is by invitation.') }).id];
      if (size > 2 && rnd(2)) {
        ids.push(s.submitCandidate(1001, { author: 'p2', rationale: 'y',
          patch: onLine(s, 1, 'Membership is open to members.') }).id);
      }
      let t = 2000;
      for (let k = 0; k < 20; k++) {
        const race = s.races(t).find((r) => ids.some((id) => r.members.includes(id)));
        if (race === undefined) break;
        expect(race.closeness).toBeLessThan(1);
        expect(race.closeness).toBeGreaterThanOrEqual(0);
        const who = `p${1 + rnd(size)}`;
        const card = s.askOn(who, race.id, t);
        if (card === null) continue;
        s.judge((t += 10), who, card.aId, card.bId, (['a', 'b', 'tie'] as const)[rnd(3)]!);
      }
    }
  });
});

describe('smith-set: the ranking is read inside the Smith set (Q1539, R-143)', () => {
  /**
   * A room answering whole ballots over the three pairs, with no batch until
   * every answer is in: a prior adoption starts an hour's cooldown, and the
   * tick after it is the batch under test.
   */
  function ballots(size: number, prefs: string[], opts: { authors: Record<string, string>;
    extra?: string[] }) {
    const s = open(size, { cooldownMs: HOUR, quorum: null });
    const Z = s.submitCandidate(100, { author: 'p1', rationale: 'z',
      patch: onLine(s, 3, 'Meetings happen monthly.') }).id;
    s.judge(200, 'p2', Z, raceOf(s, Z).incumbentId, 'a');
    expect(s.getCandidate(Z).state).toBe('adopted');
    const ids: Record<string, string> = {};
    let t = 1000;
    for (const [name, author] of Object.entries(opts.authors)) {
      ids[name] = s.submitCandidate((t += 10), { author, rationale: name,
        patch: onLine(s, 1, `Membership: ${name}.`) }).id;
    }
    ids.c = raceOf(s, ids.X!).incumbentId;
    const names = Object.keys(ids);
    for (let m = 0; m < size; m++) {
      const rank = prefs[m]!.split('');
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const a = names[i]!;
          const b = names[j]!;
          s.judge((t += 1), `p${m + 1}`, ids[a]!, ids[b]!,
            rank.indexOf(a) < rank.indexOf(b) ? 'a' : 'b');
        }
      }
    }
    return { s, ids, t, batchAt: 200 + HOUR + 1 };
  }

  it('B1 — the clone field: the fit alone would pass X, the Smith set is the current text', () => {
    // 7 X>Y>cur, 7 cur>X>Y, 1 cur>Y>X: the current text beats both 8–7, X
    // beats Y 14–1 — and the fit with every pair asked puts X at P 0.863
    const prefs = [...Array(7).fill('XYc'), ...Array(7).fill('cXY'), 'cYX'];
    const { s, ids, batchAt } = ballots(15, prefs, { authors: { X: 'p1', Y: 'p2' } });
    const r = raceOf(s, ids.X!);
    expect(r.leaderP!).toBeCloseTo(0.863, 2);  // the record's number is still the fit's
    expect(r.smith).toEqual([ids.c]);
    expect(r.leaderOnTop).toBe(false);
    expect(r.dominated.map((d) => d.id).sort()).toEqual([ids.X, ids.Y].sort());
    const events = s.tick(batchAt);
    expect(adoptedIn(events)).toEqual([]);
    expect(s.getCandidate(ids.X!).state).toBe('retired');
    expect(s.getCandidate(ids.Y!).state).toBe('retired');
    expect(s.document()).toContain('Membership is open to anyone.');
  });

  it('B2 — a level cycle is a tie; a clone inside a genuine cycle still tips the fit (R-143, accepted)', () => {
    // 5 cur>X>Y, 5 X>Y>cur, 5 Y>cur>X: every pair 10–5 round the circle
    const cycle = [...Array(5).fill('cXY'), ...Array(5).fill('XYc'), ...Array(5).fill('YcX')];
    const level = ballots(15, cycle, { authors: { X: 'p6', Y: 'p11' } });
    const lr = raceOf(level.s, level.ids.X!);
    expect(lr.smith.sort()).toEqual([level.ids.c, level.ids.X, level.ids.Y].sort());
    expect(lr.leaderOnTop).toBe(false); // level in the fit: the tie leaves the text
    // Y2, a copy of Y everybody ranks just below Y
    const cloned = [...Array(5).fill('cXYZ'), ...Array(5).fill('XYZc'), ...Array(5).fill('YZcX')];
    const { s, ids, batchAt } = ballots(15, cloned, { authors: { X: 'p6', Y: 'p11', Z: 'p12' } });
    const r = raceOf(s, ids.X!);
    expect(r.smith).toHaveLength(4);
    expect(r.leaderId).toBe(ids.Y);
    expect(r.leaderOnTop).toBe(true);
    expect(adoptedIn(s.tick(batchAt)).map((e) => e.candidateId)).toEqual([ids.Y]);
  });

  it('B3 — a race of one candidate decides exactly as the fit did (property, E 1–20, both quorum forms)', () => {
    // the v0.141 test, vendored: the leader on top when its fitted strength
    // is above the current text's by more than the fit's noise
    const mainOnTop = (s: Session, r: RaceView): boolean => {
      const fit = s.raceFit(r.id);
      return (fit.strengths.get(r.leaderId!) ?? 0) > (fit.strengths.get(r.incumbentId) ?? 0) + 1e-9;
    };
    let seed = 1538;
    const rnd = (n: number): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
    let states = 0;
    for (let trial = 0; trial < 120; trial++) {
      const size = 1 + rnd(20);
      const q = rnd(3);
      const quorum = q === 0 ? null : q === 1 ? { form: 'share', n: 10 * (1 + rnd(10)) }
        : { form: 'count', n: 1 + rnd(size) };
      const s = open(size, { quorum, cooldownMs: 1000 * HOUR });
      const X = s.submitCandidate(1000, { author: 'p1', rationale: 'x',
        patch: onLine(s, 1, 'Membership is by invitation.') }).id;
      let t = 2000;
      for (let m = 2; m <= size + 1; m++) {
        const r = s.races(t).find((x) => x.members.includes(X));
        if (r === undefined) break;
        states++;
        expect(r.leaderOnTop).toBe(mainOnTop(s, r));
        expect(r.measureShort).toEqual([]);
        // where v0.141 would carry, v0.142 reads a Smith set to carry it from
        if (r.approvals >= r.floor && mainOnTop(s, r)) expect(r.smith.length).toBeGreaterThan(0);
        if (m > size) break;
        const pick = rnd(4);
        if (pick === 3) continue; // silent
        s.judge((t += 10), `p${m}`, X, r.incumbentId, (['a', 'b', 'tie'] as const)[pick]!);
      }
    }
    expect(states).toBeGreaterThan(300);
  });

  it('B4 — the gap rule: the clone field with {cur, Y} unasked does not pass X', () => {
    const prefs = [...Array(7).fill('XYc'), ...Array(7).fill('cXY'), 'cYX'];
    const s = open(15, { cooldownMs: HOUR, quorum: null });
    const Z = s.submitCandidate(100, { author: 'p1', rationale: 'z',
      patch: onLine(s, 3, 'Meetings happen monthly.') }).id;
    s.judge(200, 'p2', Z, raceOf(s, Z).incumbentId, 'a');
    const X = s.submitCandidate(1000, { author: 'p1', rationale: 'X',
      patch: onLine(s, 1, 'Membership: X.') }).id;
    const Y = s.submitCandidate(1010, { author: 'p2', rationale: 'Y',
      patch: onLine(s, 1, 'Membership: Y.') }).id;
    const c = raceOf(s, X).incumbentId;
    let t = 1100;
    prefs.forEach((p, m) => {
      const r = p.split('');
      s.judge((t += 1), `p${m + 1}`, X, c, r.indexOf('X') < r.indexOf('c') ? 'a' : 'b');
      s.judge((t += 1), `p${m + 1}`, X, Y, r.indexOf('X') < r.indexOf('Y') ? 'a' : 'b');
    });
    const r = raceOf(s, X);
    // the two authors' own preferences put two answers on {cur, Y}: measured,
    // level. Read as the gap would be read the same way: nothing reaches cur
    // from X, so only the current text reaches everything
    expect(r.smith).toContain(c);
    expect(r.smith).not.toContain(X);
    expect(r.leaderOnTop).toBe(false);
    expect(adoptedIn(s.tick(200 + HOUR + 1))).toEqual([]);
  });

  it('B5 — a wording outside the Smith set is not protected by its fitted strength', () => {
    const prefs = [...Array(7).fill('XYc'), ...Array(7).fill('cXY'), 'cYX'];
    const { s, ids } = ballots(15, prefs, { authors: { X: 'p1', Y: 'p2' } });
    const r = raceOf(s, ids.X!);
    const fit = s.raceFit(r.id);
    // the fit rates X above the current text, and the domination guard no longer asks it
    expect(fit.strengths.get(ids.X!)!).toBeGreaterThan(fit.strengths.get(ids.c!)!);
    expect(r.dominated).toContainEqual({ id: ids.X, by: 'incumbent' });
  });
});
