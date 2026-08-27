/**
 * **What a rung says it would do** (entry 165).
 *
 * Two things are checked here, and the first is the load-bearing one:
 *
 * 1. `winsNeededPct` reads `VOTES_NEEDED` — a table copied out of engine-core's
 *    Davidson fit, because the page bundle carries no engine-core — and this
 *    file re-runs the real `winsNeeded` over every room and every bar the
 *    surface can express, so the copy cannot drift under the sentence. It is
 *    the same discipline `threshold.test.ts` applies to the table itself; what
 *    is new here is the *reading* of it, which differs from /pairwise's: a cell
 *    indexed by votes cast is being read as a room where everybody votes.
 * 2. The sentences, **verbatim**. They are surface copy living in the module
 *    (T5: one label per rung everywhere), so nothing else reads them — the
 *    banned-word check's corpus is the four page files — and a test that only
 *    matched a shape would let a re-wording through unseen.
 */
import { describe, expect, it } from 'vitest';
import { winsNeeded } from '../../engine-core/src/ranking/ceiling.js';
import { BAR_RUNGS, OWN_RUNG_LABEL, meaningOf, winsNeededPct } from '../src/meaning.js';
import { VOTES_NEEDED_MAX_N, barCeilingPct } from '../src/threshold.js';
import { CATALOGUE_BY_ID, validateFor } from '../src/catalogue.js';

describe('winsNeededPct is engine-core’s own fit', () => {
  it('agrees with winsNeeded for every room and every bar the surface offers', () => {
    for (let e = 1; e <= 24; e++) {
      for (let pct = 50; pct <= 99; pct++) {
        expect(winsNeededPct(e, pct), `e=${e} pct=${pct}`).toBe(winsNeeded(e, pct));
      }
    }
  });

  it('and at the three rungs out to the table’s last room', () => {
    for (const e of [1, 2, 3, 5, 8, 14, 30, 60, 99, 100]) {
      for (const r of BAR_RUNGS) {
        expect(winsNeededPct(e, r.pct), `e=${e} at ${r.pct}%`).toBe(winsNeeded(e, r.pct));
      }
    }
  });

  it('null is exactly the bars above the room’s ceiling', () => {
    for (let e = 1; e <= 24; e++) {
      for (let pct = 50; pct <= 99; pct++) {
        expect(winsNeededPct(e, pct) === null, `e=${e} pct=${pct}`).toBe(pct > barCeilingPct(e));
      }
    }
  });

  it('says nothing rather than guessing, off the table’s edges', () => {
    // **undefined, not a clamped number** (T13). `votesNeeded` clamps, because
    // its one caller's axis is the table's own range; a sentence a member reads
    // may not, so the card prints no line instead.
    expect(winsNeededPct(VOTES_NEEDED_MAX_N + 1, 60)).toBe(undefined);
    expect(winsNeededPct(5, 49)).toBe(undefined);
    expect(winsNeededPct(5, 100)).toBe(undefined);
    expect(winsNeededPct(Number.NaN, 60)).toBe(undefined);
    // a room smaller than one reads as one — the founder is always in it
    expect(winsNeededPct(0, 60)).toBe(winsNeededPct(1, 60));
    expect(winsNeededPct(5.9, 60)).toBe(winsNeededPct(5, 60));
  });
});

describe('meaningOf', () => {
  const bar = (pct: number, e: number) => meaningOf('bar', { pct }, { e });
  const ramp = (startPct: number, e: number) => meaningOf('pace', { shape: 'ramp', startPct }, { e });

  it('names its own dependence, so an arriving member is visibly what moved', () => {
    expect(bar(80, 5)).toBe('In a room of 5, 4 of 5 must vote for it by the end.');
    expect(bar(80, 6)).toBe('In a room of 6, 5 of 6 must vote for it by the end.');
    expect(bar(60, 5)).toBe('In a room of 5, 3 of 5 must vote for it by the end.');
    expect(bar(90, 6)).toBe('In a room of 6, 5 of 6 must vote for it by the end.');
  });

  it('all of them, and the room of one, each read as themselves', () => {
    expect(bar(90, 3)).toBe('In a room of 3, all 3 must vote for it by the end.');
    expect(bar(60, 1)).toBe('In a room of one, the one vote must be for it.');
  });

  it('an unreachable bar says so, and names which bar', () => {
    expect(bar(90, 1)).toBe('In a room of one, nothing can pass at 90% until more members arrive.');
    expect(bar(90, 2)).toBe('In a room of 2, nothing can pass at 90% until more members arrive.');
    // …and the two out-of-reach rungs of one room do not read as one sentence
    // said twice (card-audit T36)
    expect(bar(80, 1)).toBe('In a room of one, nothing can pass at 80% until more members arrive.');
    expect(bar(80, 1)).not.toBe(bar(90, 1));
  });

  it('🪜 says the same arithmetic in the opening tense', () => {
    expect(ramp(60, 5)).toBe('In a room of 5, 3 of 5 is enough when voting opens, and the approval threshold climbs from there.');
    expect(ramp(90, 3)).toBe('In a room of 3, all 3 must vote for it when voting opens, and the approval threshold climbs from there.');
    expect(ramp(60, 1)).toBe('In a room of one, the one vote is enough when voting opens, and the approval threshold climbs from there.');
    expect(ramp(90, 1)).toBe('In a room of one, nothing can pass at a 90% start until more members arrive.');
  });

  it('and never says “the bar”, which is card-audit’s T15', () => {
    // CLAUDE.md: **approval threshold**, never "the bar" — and these sentences
    // live outside `spec-check`'s four-file corpus, so this is the guard
    for (let e = 1; e <= 12; e++) {
      for (const pct of [55, 60, 72, 80, 90, 99]) {
        for (const s of [bar(pct, e), ramp(pct, e)]) {
          expect(s === null || !/(^|[^a-z])the bars?([^a-z]|$)/i.test(s), `${s}`).toBe(true);
        }
      }
    }
  });

  it('a fixed pace has no start to explain', () => {
    expect(meaningOf('pace', { shape: 'fixed' }, { e: 5 })).toBe(null);
  });

  it('says nothing where it cannot say anything true', () => {
    expect(bar(60, VOTES_NEEDED_MAX_N + 1)).toBe(null);
    expect(meaningOf('bar', null, { e: 5 })).toBe(null);
    expect(meaningOf('quorum', { form: 'count', n: 3 }, { e: 5 })).toBe(null);
    expect(meaningOf('lapse', { afterMs: null }, { e: 5 })).toBe(null);
  });

  it('every sentence fits the card’s own budget', () => {
    // card-audit's H4 caps a helper line at 200 characters, and these are read
    // under a rung on three surfaces
    for (let e = 1; e <= VOTES_NEEDED_MAX_N; e++) {
      for (let pct = 50; pct <= 99; pct++) {
        for (const s of [bar(pct, e), ramp(pct, e)]) {
          if (s === null) continue;
          expect(s.length, `${s}`).toBeLessThanOrEqual(200);
        }
      }
    }
  });
});

describe('BAR_RUNGS', () => {
  it('is most protective first, and every rung is a bar the setting accepts', () => {
    expect(BAR_RUNGS.map((r) => r.pct)).toEqual([90, 80, 60]);
    const entry = CATALOGUE_BY_ID.get('bar')!;
    for (const r of BAR_RUNGS) {
      expect(validateFor(entry, { pct: r.pct }), `${r.pct}%`).toBe(null);
    }
  });

  it('and the fourth rung is the number itself', () => {
    expect(OWN_RUNG_LABEL).toBe('A number of my own');
    expect(BAR_RUNGS.some((r) => r.label === OWN_RUNG_LABEL)).toBe(false);
  });
});
