/**
 * **A carriage return never enters the text** (Q1491, reading (a); the nh2026
 * convention, 2026-09-20).
 *
 * A member pasted Windows-ended text into a lane. Nothing stripped the `\r`
 * from the hunk's `lines`, so it was adopted into the document and served
 * back with it; the page attested what it was served, `\r` and all; and the
 * participant boundary checked that attestation against
 * `splitLines(document())`, which normalises every `\r` away. Fifteen
 * proposals over four minutes were told *the text at lines N is not what this
 * proposal replaces* of wording that was exactly what it replaced, and the
 * fifteen lines they aimed at could never be proposed on again.
 *
 * Two rules, and this file is both:
 *
 *   1. **the door normalises** — a hunk's lines are split the way `splitLines`
 *      splits a whole text, at every road into the version array, and
 *      **never in the fold**: an existing log replays exactly as it was
 *      written, which the last describe here is the assertion of;
 *   2. **one line array** — the participant boundary reads the lines the
 *      session itself holds, so the two checks cannot disagree again whatever
 *      a text turns out to contain. That is what cures a text that already
 *      holds them.
 */
import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import { ParticipantApi } from '../src/participant-api.js';
import { attest } from '../src/text/attest.js';
import { chainHash } from '../src/hash.js';
import type { LogEntry } from '../src/types.js';
import { roster } from './helpers.js';

const HOUR = 3600_000;

const LINES = [
  '# Charter',
  'Members shall meet quarterly.',
  '',
  'Decisions are made by consensus.',
];

function openSession(size = 5): Session {
  return Session.open({
    text: LINES.join('\n'),
    roster: roster(size),
    constitution: makeConstitution({
      windowStartMs: 0, windowEndMs: 10 * HOUR, rngSeed: 'cr-seed',
      tokenDripMinutes: 60, cooldownMs: 0,
    }),
  }, 0);
}

/** The lines as a page reads them off the text it was served. */
const served = (s: Session): string[] => s.document().split('\n');

describe('the door normalises a hunk\'s lines (Q1491)', () => {
  it('a submission carrying Windows endings puts no carriage return in the text', () => {
    const s = openSession();
    const api = new ParticipantApi(s, 'p1');
    const { id } = api.submit(1000, {
      patch: { baseVersion: 0, hunks: attest(LINES, [
        { start: 1, end: 2, lines: ['Members shall meet monthly.\r'] },
      ]) },
      rationale: 'more often',
    });
    const inc = s.raceOf(id).incumbentId;
    s.judge(2000, 'p2', id, inc, 'a');
    expect(s.getCandidate(id).state).toBe('adopted');
    expect(s.document()).not.toContain('\r');
    expect(served(s)[1]).toBe('Members shall meet monthly.');
  });

  it('and the pen\'s does not either', () => {
    const s = openSession();
    s.decreeText(1000, {
      author: 'p1', rationale: 'by decree',
      patch: { baseVersion: 0, hunks: attest(LINES, [
        { start: 1, end: 2, lines: ['Members shall meet monthly.\r'] },
      ]) },
    });
    expect(s.document()).not.toContain('\r');
  });

  it('an embedded \\r\\n inside one line is two lines, as it would be in a whole text', () => {
    const s = openSession();
    s.decreeText(1000, {
      author: 'p1', rationale: 'by decree',
      patch: { baseVersion: 0, hunks: attest(LINES, [
        { start: 1, end: 2, lines: ['Members shall meet monthly.\r\nA quorum is five.'] },
      ]) },
    });
    expect(served(s)).toEqual([
      '# Charter',
      'Members shall meet monthly.',
      'A quorum is five.',
      '',
      'Decisions are made by consensus.',
    ]);
  });

  it('a blank line stays a blank line', () => {
    const s = openSession();
    s.decreeText(1000, {
      author: 'p1', rationale: 'by decree',
      patch: { baseVersion: 0, hunks: attest(LINES, [
        { start: 1, end: 2, lines: ['', 'Members shall meet monthly.'] },
      ]) },
    });
    expect(served(s)).toEqual([
      '# Charter', '', 'Members shall meet monthly.', '', 'Decisions are made by consensus.',
    ]);
  });
});

describe('a pasted line can be proposed on again — the convention\'s own shape', () => {
  it('the next member\'s proposal on it is taken', () => {
    const s = openSession();
    const { id } = new ParticipantApi(s, 'p1').submit(1000, {
      patch: { baseVersion: 0, hunks: attest(LINES, [
        { start: 1, end: 2, lines: ['Members shall meet monthly.\r'] },
      ]) },
      rationale: 'more often',
    });
    s.judge(2000, 'p2', id, s.raceOf(id).incumbentId, 'a');
    // p2 reads the document the way the page does and attests what it holds
    const api2 = new ParticipantApi(s, 'p2');
    expect(() => api2.submit(3000, {
      patch: { baseVersion: s.currentVersion(), hunks: attest(served(s), [
        { start: 1, end: 2, lines: ['Members shall meet every month.'] },
      ]) },
      rationale: 'plainer',
    })).not.toThrow();
  });
});

describe('a text that already holds them (the nh2026 log)', () => {
  /**
   * The log as it was written before this rule: a decree whose hunk carries
   * the `\r` into the version array. Built by re-chaining a real log, because
   * no door will write one any more.
   */
  const withCrLine = (): Session => {
    const s = openSession();
    s.decreeText(1000, {
      author: 'p1', rationale: 'by decree',
      patch: { baseVersion: 0, hunks: attest(LINES, [
        { start: 1, end: 2, lines: ['Members shall meet monthly.'] },
      ]) },
    });
    const log: LogEntry[] = JSON.parse(JSON.stringify(s.log));
    const decreed = log.find((e) => e.event.type === 'text-decreed');
    expect(decreed).toBeTruthy();
    (decreed!.event as { patch: { hunks: { lines: string[] }[] } })
      .patch.hunks[0]!.lines = ['Members shall meet monthly.\r'];
    let prev = '';
    const rechained = log.map((e, i) => {
      const hash = chainHash(prev, e.event);
      const out: LogEntry = { ...e, seq: i, prevHash: prev, hash };
      prev = hash;
      return out;
    });
    return Session.replay(rechained);
  };

  it('replays exactly as it was written — the fold normalises nothing', () => {
    const s = withCrLine();
    expect(s.document()).toContain('\r');
    expect(served(s)[1]).toBe('Members shall meet monthly.\r');
  });

  it('and its line can be proposed on: the two checks read one array', () => {
    const s = withCrLine();
    const api = new ParticipantApi(s, 'p2');
    expect(() => api.submit(2000, {
      patch: { baseVersion: s.currentVersion(), hunks: attest(served(s), [
        { start: 1, end: 2, lines: ['Members shall meet every month.'] },
      ]) },
      rationale: 'plainer',
    })).not.toThrow();
  });
});
