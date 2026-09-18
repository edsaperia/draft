/**
 * **What a rung says it would do** (entry 165).
 *
 * The sentences, **verbatim**. They are surface copy living in the module (T5:
 * one label per rung everywhere), so nothing else reads them — the banned-word
 * check's corpus is the page files — and a test that only matched a shape
 * would let a re-wording through unseen.
 *
 * **It had a second half, and it went with 🌡️** (Q1362, 2026-09-15). The
 * load-bearing check here used to be that `winsNeededPct` read `VOTES_NEEDED` —
 * a table copied out of engine-core's Davidson fit, because the page bundle
 * carries no engine-core — and this file re-ran the real `winsNeeded` over every
 * room and every bar the surface could express, so the copy could not drift
 * under the sentence. No card asks for a bar now, so nothing reads the table
 * from this side; `threshold.test.ts` still applies the same discipline to the
 * table itself, which is pinned and a release from deletion.
 */
import { describe, expect, it } from 'vitest';
import type { Room } from '../src/meaning.js';
import { MEANING_MAX, meaningOf, spellWords } from '../src/meaning.js';
import { CATALOGUE, validateFor } from '../src/catalogue.js';
import { quorumCount } from '../src/populations.js';
import type { LapseValue, QuorumValue, RateValue, SettingValue } from '../src/values.js';

/** A fixed clock: this package reads none, and a test that did would drift. */
const NOW = Date.UTC(2026, 7, 27, 9, 0, 0);
const ROOM: Room = { e: 5, endsAtMs: null, nowMs: NOW };

describe('meaningOf', () => {
  // 🌡️ and 🪜 had the whole of this block until 2026-09-15 (Q1362): the bar's
  // *In a membership of 5, 4 of 5 must vote for it by the end*, the ramp's two
  // ends, the unreachable-bar silence (Q1159) and the *never says the bar*
  // guard. Both settings left the surface with the bar they named, and what is
  // left of `meaningOf` — 👥 ⏱️ 💤 — is exercised by *the meaning family*
  // below, over every value the surface can state.

  it('and nothing at all for a setting the family does not cover', () => {
    // the ladders whose rungs already say what they mean in words (👤 👁️ 🌍
    // 🪪 🥾 🤝 🤖) and ⏰, which is a date
    for (const id of ['authorship', 'judgments', 'chamber', 'ending', 'admission',
      'removal', 'applications', 'machines', 'title', 'text']) {
      expect(meaningOf(id, { rung: 'anonymous' }, ROOM), id).toBe(null);
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
  const rows = (e: number, endsAtMs: number | null) => {
    const room: Room = { e, endsAtMs, nowMs: NOW };
    return [
      ...QUORUMS(e).map((v) => ['quorum', v, room] as const),
      ...RATES.map((v) => ['rate', v, room] as const),
      ...LAPSES.map((v) => ['lapse', v, room] as const),
    ];
  };

  it('every value in the table has a sentence, and it fits', () => {
    for (let e = 1; e <= 12; e++) {
      for (const [, endsAtMs] of WINDOWS) {
        for (const [id, v, room] of rows(e, endsAtMs)) {
          const s = meaningOf(id, v, room);
          // **No silences left** (Q1362): 🌡️'s unreachable bar was the one
          // value in this table that could print nothing, and it has gone
          expect(s, `${id} ${JSON.stringify(v)} e=${e}`).not.toBeNull();
          expect(s!.length, `${id} ${JSON.stringify(v)} e=${e}: ${s}`).toBeLessThanOrEqual(MEANING_MAX);
        }
      }
    }
  });

  it('names its own dependence — and only its own', () => {
    for (let e = 1; e <= 12; e++) {
      const room: Room = { e, endsAtMs: NOW + DAYS3, nowMs: NOW };
      for (const v of QUORUMS(e)) {
        // **(x of y), which is the dependence named in four characters**
        // (Q1439 ruling m, Ed 2026-09-17: *wherever we show a % of
        // membership, we should have (x of y) after showing the actual
        // numbers*). It read *in a membership of n* until then; a room of one
        // still says so in words, there being no *x of y* worth printing.
        //
        // **The count form names no room**, and that is Ed's own sentence
        // (ruling t, 2026-09-18): *…preferred by at least 5 members* is not a
        // share of anything, so there is no share for the numbers to follow.
        const said = meaningOf('quorum', v, room)!;
        if (e === 1) expect(said, `quorum ${JSON.stringify(v)} e=1`).toMatch(/membership of one/);
        else if (v.form === 'share') {
          expect(said, `quorum ${JSON.stringify(v)} e=${e}`).toMatch(new RegExp(` of ${e}\\)`));
        } else {
          expect(said, `quorum ${JSON.stringify(v)} e=${e}`).toMatch(/ members\./);
        }
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

  /**
   * **Ed's own sentence** (Q1439, ruling t, 2026-09-18): *A proposal cannot
   * pass until it is preferred by at least 50% of the membership (5 of 10).*
   * It read *At least 50% (5 of 10) of the membership must prefer a proposal
   * before it can be adopted* for a day (ruling p), and before that *must have
   * voted on a change before it can pass*. Two rulings are in the shape: the
   * quorum counts approvals (R-125), so it says *preferred by* and not *voted
   * on by*; and the verb is **pass**, which is STYLE T8's, with the emphasis
   * on the bar rather than on the membership.
   *
   * **Nothing on the surface prints these** since Ed's 01:40 ruling the same
   * day — the meaning lines went, all three — so this is the module's own
   * sentence, and `design/copy.js`'s `quorumRule` is the page's.
   */
  it('👥 says what Ed’s sentence says, with the true share and (x of y) (Q1439)', () => {
    const room: Room = { e: 9, endsAtMs: null, nowMs: NOW };
    const share: QuorumValue = { form: 'share', n: 34 };
    expect(quorumCount(share, 9)).toBe(4);
    expect(meaningOf('quorum', share, room))
      .toBe('A proposal cannot pass until it is preferred by at least 34% of the membership (4 of 9).');
    const count: QuorumValue = { form: 'count', n: 4 };
    expect(meaningOf('quorum', count, room))
      .toBe('A proposal cannot pass until it is preferred by at least 4 members.');
    // the shape holds at the shipped preset, which is the sentence Ed wrote
    expect(meaningOf('quorum', { form: 'share', n: 50 }, { e: 10, nowMs: NOW }))
      .toBe('A proposal cannot pass until it is preferred by at least 50% of the membership (5 of 10).');
    // **the share shown is the true one, never above half** (ruling a, R-126):
    // a count of 9 in a room of 9 is read as 5, and the sentence says why
    expect(meaningOf('quorum', { form: 'count', n: 9 }, room))
      .toBe('A proposal cannot pass until it is preferred by at least 5 members.' +
        ' No quorum can ask for more than half.');
    // …and a count larger than the room is the same reading, not a promise
    // that nothing can pass until more members arrive (R-088 as amended)
    expect(meaningOf('quorum', { form: 'count', n: 12 }, room))
      .toMatch(/at least 5 members\./);
    expect(meaningOf('quorum', { form: 'count', n: 12 }, room))
      .not.toMatch(/more members arrive/);
    // a membership of one is its own reading: there is no *x of y* to print
    expect(meaningOf('quorum', { form: 'count', n: 1 }, { e: 1, nowMs: NOW }))
      .toBe('In a membership of one, your own vote is the whole quorum.');
    // there is no freeze (R-088), and no branch of the sentence names one
    for (const n of [1, 2, 4, 9, 12]) {
      expect(meaningOf('quorum', { form: 'count', n }, room)).not.toMatch(/freez|still here/);
    }
    // and the seconder under the number (ruling u) is the mechanism's, not
    // this setting's: no branch of the sentence mentions it
    for (const n of [1, 2, 4]) {
      expect(meaningOf('quorum', { form: 'count', n }, room)).not.toMatch(/second|two approvals/);
    }
  });

  it('💤’s spells are words, and ⏱️’s spans are too', () => {
    expect(meaningOf('lapse', { afterMs: 7 * 86400000 })).toMatch(/for a week /);
    expect(meaningOf('lapse', { afterMs: 14 * 86400000 })).toMatch(/for two weeks /);
    expect(meaningOf('lapse', { afterMs: 30 * 86400000 })).toMatch(/for a month /);
    expect(meaningOf('lapse', { afterMs: 90 * 86400000 })).toMatch(/for 90 days /);
    // **and the second job, in every branch** (Q1439 ruling c): one period,
    // two consequences — silent on everything and a membership lapses, silent
    // on one proposal and the member abstains on it
    expect(meaningOf('lapse', { afterMs: 7 * 86400000 }))
      .toMatch(/a proposal stops waiting for anyone who has not voted on it in that time/);
    expect(meaningOf('lapse', { afterMs: null }))
      .toBe('Nobody ever drops out of the count, and a proposal waits for everyone ' +
        'however long they are away.');
    const room: Room = { e: 5, endsAtMs: NOW + 3 * 3600000, nowMs: NOW };
    expect(meaningOf('rate', { grant: 4, cap: 6, dripMinutes: 30 }, room))
      .toBe('Over a session of 3 hours, about 10 proposals each — 4 to start with and one more every 30 minutes, never more than 6 in hand.');
    // a drip faster than five minutes is a rhythm, not a figure
    expect(meaningOf('rate', { grant: 4, cap: 6, dripMinutes: 2 }, room)).toMatch(/every few minutes/);
  });

  it('💤’s spell is worded in the unit that divides it, never as 0 days (Q1321)', () => {
    const MIN = 60000, HOUR = 3600000, DAY = 86400000;
    // days where whole days, else hours, else minutes; singular at one
    expect(spellWords(7 * DAY)).toBe('7 days');
    expect(spellWords(DAY)).toBe('1 day');
    expect(spellWords(36 * HOUR)).toBe('36 hours');
    expect(spellWords(HOUR)).toBe('1 hour');
    expect(spellWords(90 * MIN)).toBe('90 minutes');
    expect(spellWords(MIN)).toBe('1 minute');
    // a spell that is not whole minutes is said to the nearest minute, and
    // never as nothing; a value the page rounded through days survives
    expect(spellWords(90 * MIN + 20000)).toBe('90 minutes');
    expect(spellWords((5_000_000 / DAY) * DAY)).toBe('83 minutes');
    // nothing to say is silence, not a number
    expect(spellWords(0)).toBe('');
    expect(spellWords(NaN)).toBe('');
    // the meaning sentence reads the same words under a day (the screenshot
    // read *0 days*), and its named lengths are exact days only
    expect(meaningOf('lapse', { afterMs: 90 * MIN })).toMatch(/for 90 minutes /);
    expect(meaningOf('lapse', { afterMs: 36 * HOUR })).toMatch(/for 36 hours /);
    expect(meaningOf('lapse', { afterMs: 6 * DAY + 20 * HOUR })).toMatch(/for 164 hours /);
    expect(meaningOf('lapse', { afterMs: DAY })).toMatch(/for 1 day /);
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
});

