/**
 * The ceiling a room can reach (Q840, Ed 2026-08-26 option (a)).
 *
 * `ranking/ceiling.ts` is a claim about the *engine*, made so the surface can
 * repeat it: that a room of E judging an ordinary race unanimously produces a
 * posterior of exactly this much and no more, and that `sweepAdoptions`'
 * strict `leaderP > threshold` therefore refuses every bar above the floored
 * percent. The last case in this file is the one that matters: it drives a
 * real `Session` at E = 1 to the bar the function names and then one point
 * above it, so the number is pinned to adoption behaviour rather than to
 * itself.
 */
import { describe, expect, it } from 'vitest';
import { ceilingPct, unanimousCeiling } from '../../src/ranking/ceiling.js';
import { Session, makeConstitution } from '../../src/session.js';
import { roster } from '../helpers.js';

const HOUR = 3600_000;

const DOC = [
  '# Charter',
  'Membership is open to anyone.',
  'Decisions are made by consensus.',
].join('\n');

/** A room of one at a fixed bar, quorum 1 — the *document of one* shape. */
function soloAt(barPct: number): Session {
  const constitution = makeConstitution({
    windowStartMs: 0,
    windowEndMs: 10 * HOUR,
    rngSeed: 'ceiling-seed',
    tokenDripMinutes: 60,
    cooldownMs: 0,
    adoptionThresholdStart: barPct / 100,
    adoptionThresholdEnd: barPct / 100,
    quorum: { form: 'count', n: 1 },
  });
  return Session.open({ text: DOC, roster: roster(1), constitution }, 0);
}

const propose = (s: Session) =>
  s.submitCandidate(1000, {
    author: 'p1',
    patch: { baseVersion: 0, hunks: [{ start: 1, end: 2, lines: ['Membership requires a voucher.'] }] },
    rationale: 'Vouching keeps the roster accountable.',
  });

describe('the ceiling a room can reach (Q840)', () => {
  it('one unanimous win under the default prior is 0.798', () => {
    expect(unanimousCeiling(1)).toBeCloseTo(0.798, 3);
  });

  it('no data is the prior, and a fractional or absent room is no data', () => {
    expect(unanimousCeiling(0)).toBe(0.5);
    expect(unanimousCeiling(-3)).toBe(0.5);
    expect(unanimousCeiling(NaN)).toBe(0.5);
    // e is a count of members, so a fraction is floored into one
    expect(unanimousCeiling(1.9)).toBeCloseTo(unanimousCeiling(1), 12);
  });

  it('rises with the room and never reaches 1', () => {
    let prev = unanimousCeiling(1);
    for (let e = 2; e <= 40; e++) {
      const p = unanimousCeiling(e);
      expect(p).toBeGreaterThan(prev);
      expect(p).toBeLessThan(1);
      prev = p;
    }
  });

  it('floors to the whole percent, and the table in the plan is the fit', () => {
    // STYLE §2: floored, never rounded — 0.7978 reads 79 because a bar of 80
    // is not clearable. Rounding would print 80 and be wrong by a whole rung.
    expect(ceilingPct(1)).toBe(79);
    expect([2, 3, 4, 5, 6, 7, 8, 9, 10].map(ceilingPct)).toEqual([89, 93, 95, 96, 97, 98, 98, 98, 99]);
  });

  it('99 past E = 10 is the floor’s own answer, not the cap', () => {
    // The cap at 99 is a backstop against the normal-CDF approximation
    // saturating at 1 (it does, between e = 20,000 and e = 30,000).
    // Everywhere a real room lives, the floor gets there by itself — worth
    // asserting, because "99 because we capped it" and "99 because that is
    // the number" are different claims and the surface repeats the second.
    for (const e of [10, 20, 50, 200, 1000, 20_000]) {
      expect(Math.floor(100 * unanimousCeiling(e))).toBe(99);
      expect(ceilingPct(e)).toBe(99);
    }
    expect(Math.floor(100 * unanimousCeiling(30_000))).toBe(100);
    expect(ceilingPct(30_000)).toBe(99);
  });

  it('a room of one adopts at its ceiling and cannot adopt one point above it', () => {
    const at = soloAt(ceilingPct(1)); // 79
    const { id } = propose(at);
    const race = at.raceOf(id);
    const kinds = at.judge(HOUR, 'p1', id, race.incumbentId, 'a').map((e) => e.type);
    expect(kinds).toContain('adopted');
    expect(at.getCandidate(id).state).toBe('adopted');

    const above = soloAt(ceilingPct(1) + 1); // 80
    const { id: id2 } = propose(above);
    const race2 = above.raceOf(id2);
    const kinds2 = above.judge(HOUR, 'p1', id2, race2.incumbentId, 'a').map((e) => e.type);
    expect(kinds2).toContain('comparison');
    expect(kinds2).not.toContain('adopted');
    expect(above.getCandidate(id2).state).toBe('live');
    // and no amount of clock changes it: the evidence a room of one can hold
    // is spent, and 0.7978 > 0.80 is false however long the document runs
    for (let t = HOUR + 60_000; t <= 9 * HOUR; t += 60_000) expect(above.tick(t)).toHaveLength(0);
    expect(above.getCandidate(id2).state).toBe('live');
  });
});
