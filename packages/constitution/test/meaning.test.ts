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
import type { Room } from '../src/meaning.js';
import { BAR_RUNGS, MEANING_MAX, OWN_RUNG_LABEL, meaningOf, roomPhrase, winsNeededPct } from '../src/meaning.js';
import { VOTES_NEEDED_MAX_N, barCeilingPct } from '../src/threshold.js';
import { CATALOGUE, CATALOGUE_BY_ID, validateFor } from '../src/catalogue.js';
import { quorumCount } from '../src/populations.js';
import type { LapseValue, PaceValue, QuorumValue, RateValue, SettingValue } from '../src/values.js';

/** A fixed clock: this package reads none, and a test that did would drift. */
const NOW = Date.UTC(2026, 7, 27, 9, 0, 0);
const ROOM: Room = { e: 5, endsAtMs: null, nowMs: NOW, barPct: 80 };

describe('winsNeededPct is engine-core’s own fit', () => {
  it('agrees with winsNeeded for every room and every bar the surface offers', () => {
    for (let e = 1; e <= 24; e++) {
      for (let pct = 50; pct <= 99; pct++) {
        expect(winsNeededPct(e, pct), `e=${e} pct=${pct}`).toBe(winsNeeded(e, pct));
      }
    }
    // 1,200 cells, each a Bradley–Terry fit: ~1.7 s alone and past vitest's
    // 5 s default once the whole suite's workers are competing for the core.
    // Its own timeout, because the cost is the table's and not the lane's.
  }, 30000);

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
  const ramp = (startPct: number, closeAt: number) =>
    meaningOf('pace', { shape: 'ramp', startPct }, { e: 5, barPct: closeAt });
  const fixed = (closeAt: number) => meaningOf('pace', { shape: 'fixed' }, { e: 5, barPct: closeAt });

  it('names its own dependence, so an arriving member is visibly what moved', () => {
    expect(bar(80, 5)).toBe('In a membership of 5, 4 of 5 must vote for it by the end.');
    expect(bar(80, 6)).toBe('In a membership of 6, 5 of 6 must vote for it by the end.');
    expect(bar(60, 5)).toBe('In a membership of 5, 3 of 5 must vote for it by the end.');
    expect(bar(90, 6)).toBe('In a membership of 6, 5 of 6 must vote for it by the end.');
  });

  it('all of them, and the membership of one, each read as themselves', () => {
    expect(bar(90, 3)).toBe('In a membership of 3, all 3 must vote for it by the end.');
    expect(bar(60, 1)).toBe('In a membership of one, the one vote must be for it.');
  });

  it('an unreachable bar says so, and names which bar', () => {
    expect(bar(90, 1)).toBe('In a membership of one, nothing can pass at 90% until more members arrive.');
    expect(bar(90, 2)).toBe('In a membership of 2, nothing can pass at 90% until more members arrive.');
    // …and the two out-of-reach rungs of one room do not read as one sentence
    // said twice (card-audit T36)
    expect(bar(80, 1)).toBe('In a membership of one, nothing can pass at 80% until more members arrive.');
    expect(bar(80, 1)).not.toBe(bar(90, 1));
  });

  it('🪜 names where the climb starts and where it ends', () => {
    // **Entry 167 replaced 165's sentence rather than folding it.** 165's
    // counted votes at the start — *in a room of 5, 3 of 5 is enough when
    // voting opens* — which is 🌡️'s own sentence in the opening tense and
    // left the number it climbs *to* on another card. 🪜's dependence is
    // 🌡️'s number (rule 1), so the sentence names both ends.
    expect(ramp(60, 80)).toBe('Starts at a bare majority (60%) when voting opens and climbs to broad agreement (80%) by the end — early changes pass more easily.');
    expect(ramp(55, 78)).toBe('Starts at 55% when voting opens and climbs to 78% by the end — early changes pass more easily.');
    expect(ramp(80, 90)).toBe('Starts at broad agreement (80%) when voting opens and climbs to nearly everyone (90%) by the end — early changes pass more easily.');
  });

  it('and a fixed pace says the number never moves', () => {
    expect(fixed(80)).toBe('Stays at broad agreement (80%) from the moment voting opens to the end.');
    expect(fixed(78)).toBe('Stays at 78% from the moment voting opens to the end.');
  });

  it('🪜 says nothing at all until 🌡️ has a number to climb towards', () => {
    expect(meaningOf('pace', { shape: 'ramp', startPct: 60 }, { e: 5 })).toBe(null);
    expect(meaningOf('pace', { shape: 'fixed' }, { e: 5, barPct: null })).toBe(null);
  });

  it('and never says “the bar”, which is card-audit’s T15', () => {
    // CLAUDE.md: **approval threshold**, never "the bar" — and these sentences
    // live outside `spec-check`'s four-file corpus, so this is the guard
    for (let e = 1; e <= 12; e++) {
      for (const pct of [55, 60, 72, 80, 90, 99]) {
        for (const s of [bar(pct, e), ramp(pct, 90), fixed(pct)]) {
          expect(s === null || !/(^|[^a-z])the bars?([^a-z]|$)/i.test(s), `${s}`).toBe(true);
        }
      }
    }
  });

  it('says nothing where it cannot say anything true', () => {
    expect(bar(60, VOTES_NEEDED_MAX_N + 1)).toBe(null);
    expect(meaningOf('bar', null, { e: 5 })).toBe(null);
  });

  it('and nothing at all for a setting the family does not cover', () => {
    // the ladders whose rungs already say what they mean in words (👤 👁️ 🌍
    // 🪪 🥾 🤝 🤖) and ⏰, which is a date
    for (const id of ['authorship', 'judgments', 'chamber', 'ending', 'admission',
      'removal', 'applications', 'machines', 'title', 'text']) {
      expect(meaningOf(id, { rung: 'anonymous' }, ROOM), id).toBe(null);
    }
  });

  it('every sentence fits the card’s own budget', () => {
    // card-audit's H4 caps a helper line at 200 characters, and these are read
    // under a rung on four surfaces
    for (let e = 1; e <= VOTES_NEEDED_MAX_N; e++) {
      for (let pct = 50; pct <= 99; pct++) {
        for (const s of [bar(pct, e), ramp(pct, 90), fixed(pct)]) {
          if (s === null) continue;
          expect(s.length, `${s}`).toBeLessThanOrEqual(MEANING_MAX);
        }
      }
    }
  });
});

/**
 * **The family, over every value the surface can state** (entry 167). The
 * table is the point: a wording change that overflows H4's budget at one
 * roster, or drops a sentence for one value, is red here rather than on a
 * card. Nothing else reads these strings — `spec-check`'s banned-word corpus
 * is four page files and this module is not one of them.
 */
describe('the meaning family', () => {
  const HOURS2 = 2 * 3600000, DAYS3 = 3 * 86400000;
  const WINDOWS: [string, number | null][] = [
    ['two hours', NOW + HOURS2], ['three days', NOW + DAYS3], ['never', null],
  ];
  const QUORUMS = (e: number): QuorumValue[] => [
    ...Array.from({ length: e }, (_, i) => ({ form: 'count' as const, n: i + 1 })),
    ...[25, 34, 50, 67, 100].map((n) => ({ form: 'share' as const, n })),
  ];
  // the page's own `RATE_START` is 4 · 6 · 10 — copied, never imported: this
  // module must not learn what a page holds
  const RATES: RateValue[] = [
    { grant: 4, cap: 6, dripMinutes: 10 },
    { grant: 1, cap: 1, dripMinutes: 1440 },
    { grant: 0, cap: 40, dripMinutes: 5 },
  ];
  const LAPSES: LapseValue[] = [
    ...[7, 14, 30, 90].map((d): LapseValue => ({ afterMs: d * 86400000 })),
    { afterMs: null },
  ];
  const PACES: PaceValue[] = [{ shape: 'fixed' },
    ...BAR_RUNGS.map((r) => ({ shape: 'ramp' as const, startPct: r.pct })),
    { shape: 'ramp', startPct: 55 }];

  const rows = (e: number, endsAtMs: number | null) => {
    const room: Room = { e, endsAtMs, nowMs: NOW, barPct: 78 };
    return [
      ...QUORUMS(e).map((v) => ['quorum', v, room] as const),
      ...RATES.map((v) => ['rate', v, room] as const),
      ...LAPSES.map((v) => ['lapse', v, room] as const),
      ...PACES.map((v) => ['pace', v, room] as const),
      ...[...BAR_RUNGS.map((r) => ({ pct: r.pct })), { pct: 65 }, { pct: 95 }]
        .map((v) => ['bar', v, room] as const),
    ];
  };

  it('every value in the table has a sentence, and it fits', () => {
    for (let e = 1; e <= 12; e++) {
      for (const [, endsAtMs] of WINDOWS) {
        for (const [id, v, room] of rows(e, endsAtMs)) {
          const s = meaningOf(id, v, room);
          // 🌡️ and 🪜 are allowed their one silence — a bar this room cannot
          // reach — and it is the only one in the table
          if (s === null) { expect(id === 'bar' || id === 'pace', `${id} ${JSON.stringify(v)} e=${e}`).toBe(true); continue; }
          expect(s.length, `${id} ${JSON.stringify(v)} e=${e}: ${s}`).toBeLessThanOrEqual(MEANING_MAX);
        }
      }
    }
  });

  it('names its own dependence — and only its own', () => {
    for (let e = 1; e <= 12; e++) {
      const room: Room = { e, endsAtMs: NOW + DAYS3, nowMs: NOW, barPct: 80 };
      for (const v of QUORUMS(e)) {
        expect(meaningOf('quorum', v, room), `quorum ${JSON.stringify(v)} e=${e}`).toMatch(/membership of/);
      }
      for (const r of BAR_RUNGS) {
        const s = meaningOf('bar', { pct: r.pct }, room);
        if (s !== null) expect(s, `bar ${r.pct} e=${e}`).toMatch(/membership of/);
      }
      // ⏱️ names the window it is measured over…
      for (const v of RATES) {
        expect(meaningOf('rate', v, room), `rate e=${e}`).toMatch(/^Over a session of 3 days, /);
        expect(meaningOf('rate', v, { ...room, endsAtMs: null }), `rate ∞ e=${e}`)
          .toMatch(/^With no end date, /);
      }
      // …and 💤 names no membership, because a lapse does not depend on one
      for (const v of LAPSES) {
        expect(meaningOf('lapse', v, room), `lapse ${JSON.stringify(v)}`).not.toMatch(/membership of/);
      }
    }
  });

  it('👥’s arithmetic is `quorumCount`’s, and the freeze clause follows it', () => {
    const room: Room = { e: 9, endsAtMs: null, nowMs: NOW, barPct: 80 };
    const share: QuorumValue = { form: 'share', n: 34 };
    expect(quorumCount(share, 9)).toBe(4);
    expect(meaningOf('quorum', share, room))
      .toBe('34% of a membership of 9 is 4: at least 4 of you must have voted on a change before it can pass; with fewer than 4 still here the document freezes.');
    const count: QuorumValue = { form: 'count', n: 9 };
    expect(quorumCount(count, 9)).toBe(9);
    expect(meaningOf('quorum', count, room))
      .toBe('In a membership of 9, all 9 of you must have voted on a change before it can pass — one member away and the document freezes.');
    // a quorum of one never freezes a room with anybody in it, so the
    // consequence that cannot happen is not stated (T37)
    expect(meaningOf('quorum', { form: 'count', n: 1 }, room)).not.toMatch(/freezes/);
    // …and a count larger than the room says so rather than pretending
    expect(meaningOf('quorum', { form: 'count', n: 12 }, room))
      .toMatch(/nothing can pass until more members arrive\.$/);
  });

  it('💤’s spells are words, and ⏱️’s spans are too', () => {
    expect(meaningOf('lapse', { afterMs: 7 * 86400000 })).toMatch(/for a week /);
    expect(meaningOf('lapse', { afterMs: 14 * 86400000 })).toMatch(/for two weeks /);
    expect(meaningOf('lapse', { afterMs: 30 * 86400000 })).toMatch(/for a month /);
    expect(meaningOf('lapse', { afterMs: 90 * 86400000 })).toMatch(/for 90 days /);
    expect(meaningOf('lapse', { afterMs: null })).toBe('Nobody ever drops out of the count, however long they are away.');
    const room: Room = { e: 5, endsAtMs: NOW + 3 * 3600000, nowMs: NOW, barPct: 80 };
    expect(meaningOf('rate', { grant: 4, cap: 6, dripMinutes: 30 }, room))
      .toBe('Over a session of 3 hours, about 10 proposals each — 4 to start with and one more every 30 minutes, never more than 6 in hand.');
    // a drip faster than five minutes is a rhythm, not a figure
    expect(meaningOf('rate', { grant: 4, cap: 6, dripMinutes: 2 }, room)).toMatch(/every few minutes/);
  });

  it('…and ⏱️ says nothing at all until ⏰ has been answered', () => {
    const v: RateValue = { grant: 4, cap: 6, dripMinutes: 30 };
    // **absent is not `null`**: the founder meets ⏱️ before ⏰ in the founding
    // order, and *for as long as it runs* would answer a question they have
    // not been asked
    expect(meaningOf('rate', v, { e: 5, nowMs: NOW })).toBe(null);
    expect(meaningOf('rate', v, { e: 5, endsAtMs: null, nowMs: NOW })).toMatch(/^With no end date, /);
    // and a window already behind us measures a session that is over
    expect(meaningOf('rate', v, { e: 5, endsAtMs: NOW - 3600000, nowMs: NOW })).toBe(null);
  });

  it('and never says “judgment”, which is 164’s vocabulary', () => {
    for (let e = 1; e <= 12; e++) {
      for (const [, endsAtMs] of WINDOWS) {
        for (const [id, v, room] of rows(e, endsAtMs)) {
          const s = meaningOf(id, v, room);
          if (s !== null) expect(s, `${id}: ${s}`).not.toMatch(/judg/i);
        }
      }
    }
  });
});

/**
 * **Rule 4, asserted where it is actually stated.** Every ladder on the
 * surface lists its rungs most-protective-first, so *the most I will accept*
 * reads as a ladder and *the highest taken* is topmost. The catalogue says so
 * in a doc comment on `CatalogueEntry.rungs` and its `consent.order` is the
 * machine-readable half of the same claim — and nothing compared the two.
 */
describe('every ladder is most-protective-first', () => {
  it('the rung list agrees with the entry’s own consent order', () => {
    let checked = 0;
    for (const entry of CATALOGUE) {
      const rungs = entry.rungs;
      if (!rungs || !entry.consent) continue;
      // a rung is either a ladder's `{rung}` or a price's `{price}` — which,
      // is the entry's own business, so it is asked rather than assumed
      const asValue = (r: string): SettingValue =>
        (validateFor(entry, { rung: r }) === null ? { rung: r } : { price: r as never });
      for (let i = 0; i + 1 < rungs.length; i++) {
        const a = asValue(rungs[i]!), b = asValue(rungs[i + 1]!);
        expect(validateFor(entry, a), `${entry.id}: ${rungs[i]}`).toBe(null);
        expect(entry.consent.order(a, b), `${entry.id}: ${rungs[i]} before ${rungs[i + 1]}`)
          .toBeGreaterThan(0);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(8);
  });

  it('…and 🌡️’s rungs, which are a list of their own', () => {
    expect(BAR_RUNGS.map((r) => r.pct)).toEqual([...BAR_RUNGS.map((r) => r.pct)].sort((a, b) => b - a));
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

  it('and *one* is a word, wherever the membership is named', () => {
    // `ceilingNote` on the page builds the same phrase, and takes it from
    // here rather than keeping a second copy (T5)
    expect(roomPhrase(0)).toBe('one');
    expect(roomPhrase(1)).toBe('one');
    expect(roomPhrase(2)).toBe('2');
    expect(roomPhrase(14.7)).toBe('14');
  });
});
