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
import { ceilingPct, unanimousCeiling, winsNeeded } from '../../src/ranking/ceiling.js';
import { fitDavidson } from '../../src/ranking/davidson.js';
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
    expect([2, 3, 4, 5, 6, 7, 8, 9, 10].map((e) => ceilingPct(e))).toEqual([89, 93, 95, 96, 97, 98, 98, 98, 99]);
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

  // **How many of the room, at each of the three rungs 🌡️ offers** (entry
  // 165). The surface prints these numbers in a sentence — *in a room of 5,
  // 4 of 5 must vote for it by the end* — so they are pinned here rather than
  // recomputed by whoever reads the card.
  it('winsNeeded is the smallest k that clears the bar, at the three rungs', () => {
    const at = (pct: number) => [1, 2, 3, 5, 10, 50].map((e) => winsNeeded(e, pct));
    expect(at(60)).toEqual([1, 2, 2, 3, 6, 26]);
    expect(at(80)).toEqual([null, 2, 3, 4, 7, 28]);
    expect(at(90)).toEqual([null, null, 3, 5, 8, 30]);
  });

  it('and the k it names is the first one over the bar, never one before it', () => {
    // the definition, checked against the fit directly: k − 1 must not clear
    // it, and k must — which is what makes "4 of 5" a claim and not a rounding
    for (const e of [1, 2, 3, 5, 8, 13]) {
      for (const pct of [55, 60, 70, 80, 90, 95]) {
        const k = winsNeeded(e, pct);
        const p = (wins: number) => {
          const comps = Array.from({ length: e }, (_, i) =>
            ({ a: 'c', b: 'inc', outcome: i < wins ? 'a' : 'b' } as const));
          return fitDavidson(['c', 'inc'], comps).probBeats('c', 'inc');
        };
        if (k === null) { expect(p(e), `${e} at ${pct}%`).toBeLessThanOrEqual(pct / 100); continue; }
        expect(p(k), `${k} of ${e} at ${pct}%`).toBeGreaterThan(pct / 100);
        if (k > 0) expect(p(k - 1), `${k - 1} of ${e} at ${pct}%`).toBeLessThanOrEqual(pct / 100);
      }
    }
  });

  it('rises with the bar, and is null exactly above the ceiling', () => {
    for (let e = 1; e <= 40; e++) {
      let prev = 0;
      for (let pct = 50; pct <= 99; pct++) {
        const k = winsNeeded(e, pct);
        // the identity the two functions have to keep: nothing clears a bar
        // the room's own unanimous fit does not reach
        expect(k === null, `e=${e} pct=${pct}`).toBe(pct > ceilingPct(e));
        if (k === null) continue;
        expect(k, `e=${e} pct=${pct}`).toBeGreaterThanOrEqual(prev);
        expect(k).toBeLessThanOrEqual(e);
        prev = k;
      }
    }
  });

  it('a room smaller than one is not a room', () => {
    expect(winsNeeded(0, 60)).toBe(null);
    expect(winsNeeded(-3, 60)).toBe(null);
    expect(winsNeeded(NaN, 60)).toBe(null);
    expect(winsNeeded(5, NaN)).toBe(null);
    expect(winsNeeded(5.9, 60)).toBe(winsNeeded(5, 60)); // floored, never rounded
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
