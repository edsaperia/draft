import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import { roster } from './helpers.js';

/**
 * **Only a proposal that passes gets its ✏️ back** (Q1454, Ed 2026-09-18;
 * SPEC §7 → why: R-133).
 *
 * *I thought that ✏️s were refunded only on successful proposals, not on
 * failed ones — the idea is to stop people from spamming bad proposals.*
 *
 * It was not so. Every exit paid `stake × min(peakW / 0.5, 1.5)`, peakW the
 * highest modelled chance the wording ever had of beating the current text —
 * and a peak never comes down. Measured on main before this file existed, in
 * the two rooms below: a proposal **everybody** voted against came back with
 * **0.40 ✏️**, because the first vote against still left the model at 20%;
 * and a proposal with one early vote for and five against came back with
 * **1.50 ✏️** — a profit on a wording the room rejected, the cap paid because
 * the peak after that one friendly vote was 80%.
 *
 * The rule now: a proposal that carries returns exactly the 1 ✏️ it staked;
 * every other ending — rejected, closed early as dominated (§4.4), refused by
 * the Founder's 🛡️ (§9.7 rule 8), still undecided at the close (§4.6) —
 * returns nothing. A withdrawal, a co-sign and a failed rebase hand the stake
 * back whole, as they always have.
 */

const HOUR = 3600_000;

const DOC = [
  '# Charter',
  'Membership is open to anyone.',
  'Decisions are made by consensus.',
  'Meetings happen when someone calls one.',
].join('\n');

function open(size: number, overrides: Record<string, unknown> = {}): Session {
  return Session.open(
    {
      text: DOC,
      roster: roster(size),
      constitution: makeConstitution({
        windowStartMs: 0,
        windowEndMs: 1000 * HOUR,
        rngSeed: 'refund',
        cooldownMs: 0,
        quorum: { form: 'share', n: 50 },
        ...overrides,
      }),
    },
    0,
  );
}

const rewrite = (base: number, line: number, text: string) =>
  ({ baseVersion: base, hunks: [{ start: line, end: line + 1, lines: [text] }] });

/** p1 proposes on line 1; the balance returned is the one before the stake. */
function proposed(size: number, overrides: Record<string, unknown> = {}): {
  s: Session; id: string; incumbentId: string; before: number;
} {
  const s = open(size, overrides);
  const before = s.balance('p1', 1000);
  const { id } = s.submitCandidate(1000, {
    author: 'p1',
    rationale: 'because',
    patch: rewrite(s.currentVersion(), 1, 'Membership is open to members.'),
  });
  expect(s.balance('p1', 1000)).toBe(before - s.constitution.stake);
  return { s, id, incumbentId: s.raceOf(id).incumbentId, before };
}

describe('a proposal that fails (Q1454)', () => {
  it('returns nothing where the whole room voted against it — 0.40 ✏️ before', () => {
    const { s, id, incumbentId, before } = proposed(5);
    for (const [i, m] of ['p2', 'p3', 'p4'].entries()) {
      if (s.getCandidate(id).state !== 'live') break;
      s.judge(2000 + i, m, id, incumbentId, 'b');
    }
    expect(s.getCandidate(id).state).toBe('retired');
    expect(s.getCandidate(id).exit!.refund).toBe(0);
    // the author is down the stake and stays down: the point of the rule
    expect(s.balance('p1', 3000)).toBe(before - s.constitution.stake);
  });

  it('and nothing where one early supporter once earned it a profit — 1.50 ✏️ before', () => {
    // A room of ten, one vote for and then five against: `a + w <= o` closes
    // it at the next batch (§4.4). The peak the single friendly vote left is
    // what used to pay 1.5× the stake.
    const { s, id, incumbentId, before } = proposed(10);
    s.judge(2000, 'p2', id, incumbentId, 'a');
    for (const [i, m] of ['p3', 'p4', 'p5', 'p6', 'p7'].entries()) {
      if (s.getCandidate(id).state !== 'live') break;
      s.judge(2100 + i, m, id, incumbentId, 'b');
    }
    expect(s.getCandidate(id).state).toBe('retired');
    expect(s.getCandidate(id).exit!.cause).toBe('dominated');
    expect(s.getCandidate(id).exit!.refund).toBe(0);
    expect(s.balance('p1', 3000)).toBe(before - s.constitution.stake);
    // **the peak itself stays**: it is what ranks the graveyard and the
    // backlog (§8), and only the refund stopped reading it
    expect(s.getCandidate(id).peakW).toBeGreaterThan(0.5);
  });

  it('nor at the close, where a race was still running', () => {
    const end = 2 * HOUR; // inside one drip interval, so the wallet only moves here
    const { s, id, incumbentId, before } = proposed(5, { windowEndMs: end });
    s.judge(2000, 'p2', id, incumbentId, 'a');
    s.tick(end);
    expect(s.getCandidate(id).state).toBe('undecided');
    expect(s.getCandidate(id).exit!.refund).toBe(0);
    expect(s.balance('p1', end)).toBe(before - s.constitution.stake);
  });
});

describe('a proposal that passes (Q1454)', () => {
  it('returns exactly the one ✏️ it staked, and no more', () => {
    const { s, id, incumbentId, before } = proposed(3);
    for (const [i, m] of ['p2', 'p3'].entries()) {
      if (s.getCandidate(id).state !== 'live') break;
      s.judge(2000 + i, m, id, incumbentId, 'a');
    }
    expect(s.getCandidate(id).state).toBe('adopted');
    expect(s.getCandidate(id).exit!.refund).toBe(s.constitution.stake);
    expect(s.getCandidate(id).exit!.refund).toBe(1);
    // the author's wallet is exactly where it started: proposing well is free
    expect(s.balance('p1', 3000)).toBe(before);
    // and the room ran on whole numbers throughout
    for (const p of ['p1', 'p2', 'p3']) {
      expect(Number.isInteger(s.balance(p, 3000))).toBe(true);
    }
  });

  it('and the replayed ledger pays the same', () => {
    const { s, id, incumbentId } = proposed(3);
    for (const [i, m] of ['p2', 'p3'].entries()) {
      if (s.getCandidate(id).state !== 'live') break;
      s.judge(2000 + i, m, id, incumbentId, 'a');
    }
    const replayed = Session.replay(s.log);
    for (const p of ['p1', 'p2', 'p3']) {
      expect(replayed.balance(p, 3000)).toBe(s.balance(p, 3000));
    }
    expect(replayed.getCandidate(id).exit!.refund).toBe(1);
  });
});

describe('withdrawal keeps its full refund (Q1454 answer 2)', () => {
  it('at any time, judgments already cast or not', () => {
    // Offered *refund only before anybody has voted* and declined, knowing
    // the cost: the rule stops careless spam and not deliberate spam, an
    // author who guesses right withdrawing first.
    const { s, id, incumbentId, before } = proposed(5);
    s.judge(2000, 'p2', id, incumbentId, 'b');
    s.judge(2100, 'p3', id, incumbentId, 'b');
    s.withdraw(2200, id);
    expect(s.getCandidate(id).state).toBe('withdrawn');
    expect(s.getCandidate(id).exit!.refund).toBe(s.constitution.stake);
    expect(s.balance('p1', 3000)).toBe(before);
  });
});
