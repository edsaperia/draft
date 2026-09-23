import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import { floorFor } from '../src/races.js';
import type { Constitution, RaceView } from '../src/types.js';
import { roster } from './helpers.js';

/**
 * **A proposal that can never win is closed** (Q1440, Ed 2026-09-18; SPEC
 * §4.4 → why: R-132).
 *
 * *As soon as it's dominated by another option (e.g. it can never win unless
 * people change votes they already cast) then it should be counted as closed.*
 *
 * Nothing used to close. A proposal the room had plainly refused stayed in the
 * field until T=0: its rail entry and its pair tabs stayed, an ordinary motion
 * never failed during the document's life, a losing invitation held its
 * address under the twin rule, and a wording beaten 8–7 came back on one
 * changed vote. This file is the arithmetic of the rule that ends that, and
 * the properties the arithmetic was chosen for.
 *
 * The rule, over the members of E and a live candidate X:
 *
 *   a = members whose latest judgment of X against the current text prefers X
 *   o = members whose latest such judgment prefers the current text
 *   w = members of E who have not answered that pair at all
 *
 * *Indifferent* is in none of them — it is an answer, and answering again is
 * revising a cast vote, which is exactly what the rule declines to wait for.
 * **w counts the abstained**: 💤's period takes a silent member out of the
 * group the quorum is read against, and does not take away their right to
 * answer, so a member who has abstained is still somebody who could yet
 * approve. That is what makes the whole test time-free.
 *
 * X is **dominated by the current text** when its best possible future fails
 * either half of §4.2's adoption test: `a + w <= o` (a tie leaves the current
 * text standing), or `a + w < F(a + o + w)`.
 */

const HOUR = 3600_000;

const DOC = [
  '# Charter',
  'Membership is open to anyone.',
  'Decisions are made by consensus.',
  'Meetings happen when someone calls one.',
].join('\n');

function open(overrides: Record<string, unknown> = {}, size = 5): Session {
  return Session.open(
    {
      text: DOC,
      roster: roster(size),
      constitution: makeConstitution({
        windowStartMs: 0,
        windowEndMs: 1000 * HOUR,
        rngSeed: 'dominated',
        cooldownMs: 0,
        ...overrides,
      }),
    },
    0,
  );
}

const rewrite = (base: number, line: number, text: string) =>
  ({ baseVersion: base, hunks: [{ start: line, end: line + 1, lines: [text] }] });

/** The one live race, or `null` once every member of it has gone. */
const raceOrNone = (s: Session, t: number): RaceView | null => s.races(t)[0] ?? null;

/** p1 proposes on line 1 at t=1000. */
function proposed(overrides: Record<string, unknown> = {}, size = 5): {
  s: Session; id: string;
} {
  const s = open(overrides, size);
  const { id } = s.submitCandidate(1000, {
    author: 'p1',
    rationale: 'because',
    patch: rewrite(s.currentVersion(), 1, 'Membership is open to members.'),
  });
  return { s, id };
}

describe('the arithmetic (Q1440)', () => {
  it('a fresh proposal is dominated at no room size', () => {
    for (const size of [1, 2, 3, 10]) {
      const { s, id } = proposed({ quorum: { form: 'share', n: 50 } }, size);
      const r = raceOrNone(s, 2000);
      // at E = 1 the sole member is the room and the proposal carries on
      // submission (R-063), so there is nothing left racing to be dominated
      if (r === null) {
        expect(size).toBe(1);
        continue;
      }
      expect(r.members).toContain(id);
      expect(r.dominated).toEqual([]);
    }
  });

  it('the best case is every awaited member approving — no mix of answers and '
    + 'abstentions beats it', () => {
    // **Property 2 and 3 of the approval floor, put together** (R-125): an
    // approval raises approvals by one and cannot raise the floor, because the
    // approver was already inside the group; an abstention lowers the floor by
    // at most one and raises approvals by nothing. So `a + w` against
    // `F(a + o + w)` really is the best X can ever do, and the test below is a
    // brute force over every room a hand could hold rather than an argument.
    const quorums: Constitution['quorum'][] = [
      null,
      { form: 'share', n: 10 },
      { form: 'share', n: 25 },
      { form: 'share', n: 33 },
      { form: 'share', n: 50 },
      { form: 'count', n: 1 },
      { form: 'count', n: 3 },
      { form: 'count', n: 6 },
    ];
    for (const q of quorums) {
      const c = makeConstitution({
        windowStartMs: 0, windowEndMs: HOUR, rngSeed: 'floor-arithmetic', quorum: q,
      });
      for (let e = 1; e <= 6; e++) {
        for (let a = 0; a <= e; a++) {
          for (let o = 0; o + a <= e; o++) {
            const w = e - a - o;
            const best = a + w - floorFor(c, e, a + o + w);
            // every way the w could answer: k of them approve, j abstain,
            // the rest answer *Indifferent* (out of the group, approving
            // nothing) — and every one of those futures is compared with the
            // all-approve one
            // of the w, `d` leave the group (they answer *Indifferent*, or
            // their 💤 period runs out) and `k` of the rest approve; everybody
            // else opposes or is still awaited, and either way stays in it
            for (let d = 0; d <= w; d++) {
              for (let k = 0; k <= w - d; k++) {
                const reach = a + k - floorFor(c, e, a + o + w - d);
                expect(reach).toBeLessThanOrEqual(best);
              }
            }
          }
        }
      }
    }
  });
});

describe('domination by the current text (Q1440)', () => {
  it('a room that has answered and refused closes the proposal', () => {
    const { s, id } = proposed({ quorum: { form: 'share', n: 50 } });
    const r0 = raceOrNone(s, 2000)!;
    // three of five say the current text is better: a = 1, o = 3, w = 1, and
    // the fifth member alone could only make it 2 against 3 — still a loss
    for (const [i, m] of ['p2', 'p3', 'p4'].entries()) {
      s.judge(2000 + i, m, id, r0.incumbentId, 'b');
    }
    const r = raceOrNone(s, 3000);
    expect(r).toBeNull(); // its last live member went, so the race went with it
    expect(s.getCandidate(id).state).toBe('retired');
    expect(s.getCandidate(id).exit?.cause).toBe('dominated');
  });

  it('and does not close it one answer earlier', () => {
    const { s, id } = proposed({ quorum: { form: 'share', n: 50 } });
    const r0 = raceOrNone(s, 2000)!;
    // a = 1, o = 2, w = 2: the best case is 3 against 2, so it can still win
    for (const [i, m] of ['p2', 'p3'].entries()) {
      s.judge(2000 + i, m, id, r0.incumbentId, 'b');
    }
    expect(s.getCandidate(id).state).toBe('live');
    expect(raceOrNone(s, 3000)!.dominated).toEqual([]);
  });

  it('an indifferent room closes it on the floor, though nobody opposed it', () => {
    // **The floor clause is exact and takes no guard.** Everybody but the
    // author answers *Indifferent* and leaves the group for good: a = 1,
    // o = 0, w = 0, the group is 1 and the floor is `max(min(5, 1), 2)` = 2,
    // which one approval can never reach. The ranking still has it above the
    // current text — the author's own preference is the only evidence — and
    // that is exactly the case the majority clause's guard must not swallow.
    const { s, id } = proposed({ quorum: { form: 'count', n: 5 } }, 5);
    const r0 = raceOrNone(s, 2000)!;
    for (const [i, m] of ['p2', 'p3', 'p4', 'p5'].entries()) {
      if (s.getCandidate(id).state !== 'live') break;
      s.judge(2000 + i, m, id, r0.incumbentId, 'tie');
    }
    expect(s.getCandidate(id).state).toBe('retired');
    expect(s.getCandidate(id).exit?.cause).toBe('dominated');
  });

  it('and the stake stays spent: a proposal closed early did not pass', () => {
    const { s, id } = proposed({ quorum: { form: 'share', n: 50 } });
    const before = s.balance('p1', 2000);
    const r0 = raceOrNone(s, 2000)!;
    for (const [i, m] of ['p2', 'p3', 'p4'].entries()) {
      s.judge(2000 + i, m, id, r0.incumbentId, 'b');
    }
    expect(s.getCandidate(id).state).toBe('retired');
    // §7 refunds a proposal that passes and nothing else (Q1454), and closing
    // one early is not a way of handing it back: this used to pay on the peak
    // the wording reached, which a domination closes above rather than below.
    expect(s.getCandidate(id).exit!.refund).toBe(0);
    expect(s.balance('p1', 3000)).toBe(before);
  });
});

describe('domination by a rival (Q1440)', () => {
  /** Two wordings on one line, so they race each other. */
  function twoRivals(overrides: Record<string, unknown> = {}, size = 6) {
    const s = open(overrides, size);
    const x = s.submitCandidate(1000, {
      author: 'p1', rationale: 'mine',
      patch: rewrite(s.currentVersion(), 1, 'Membership is open to members.'),
    }).id;
    const y = s.submitCandidate(1100, {
      author: 'p2', rationale: 'theirs',
      patch: rewrite(s.currentVersion(), 1, 'Membership is open to the invited.'),
    }).id;
    return { s, x, y };
  }

  it('is not declared while anybody in E has still to answer that pair', () => {
    const { s, x, y } = twoRivals({ quorum: { form: 'share', n: 50 } }, 6);
    // three of six prefer Y to X; three have not answered the pair, so the
    // best case is 3 for X against 3 for Y — not a strict loss
    s.judge(2000, 'p3', x, y, 'b');
    s.judge(2001, 'p4', x, y, 'b');
    s.judge(2002, 'p5', x, y, 'b');
    const r = raceOrNone(s, 3000)!;
    expect(r.members).toContain(x);
    expect(r.dominated.find((d) => d.id === x)).toBeUndefined();
  });

  it('is declared once no answer still to come could put it above the rival', () => {
    const { s, x, y } = twoRivals({ quorum: { form: 'share', n: 50 } }, 6);
    // everybody has answered the pair and X lost 1–5: nobody is left who
    // could prefer it, and revising a cast vote is not an answer still to come
    s.judge(2000, 'p1', x, y, 'a');
    for (const [i, m] of ['p2', 'p3', 'p4', 'p5', 'p6'].entries()) {
      if (s.getCandidate(x).state !== 'live') break;
      s.judge(2100 + i, m, x, y, 'b');
    }
    expect(s.getCandidate(x).state).toBe('retired');
    expect(s.getCandidate(x).exit?.cause).toBe('dominated');
    // and the rival is untouched: it lost nothing
    expect(s.getCandidate(y).state).toBe('live');
  });

  it('never closes a race\'s own leader', () => {
    // the guard, asserted where it can be seen: with the batch held off by a
    // cooldown the dominations stand on the view instead of being acted on,
    // so the leader can be read beside them.
    const { s, x, y } = twoRivals(
      // three of six — what a count of 12 came to while the cap was at half
      // the group (Q1490, R-139 moved it to the whole group, where 12 would
      // be unanimity and the adoption below would never land)
      { quorum: { form: 'count', n: 3 }, cooldownMs: 10 * HOUR }, 6);
    const third = s.submitCandidate(1200, {
      author: 'p3', rationale: 'third',
      patch: rewrite(s.currentVersion(), 1, 'Membership is open to the curious.'),
    }).id;
    // an adoption on another line starts the cooldown clock, so every sweep
    // after it returns early and nothing is retired
    const other = s.submitCandidate(1300, {
      author: 'p4', rationale: 'elsewhere',
      patch: rewrite(s.currentVersion(), 2, 'Decisions are made by vote.'),
    }).id;
    const raceOf = (id: string) => s.races(4000).find((r) => r.members.includes(id))!;
    s.judge(2000, 'p5', other, raceOf(other).incumbentId, 'a');
    s.judge(2100, 'p6', other, raceOf(other).incumbentId, 'a');
    expect(s.getCandidate(other).state).toBe('adopted');
    // now the contested line: everybody prefers Y to both of the others
    let at = 3000;
    for (const m of ['p1', 'p3', 'p4', 'p5', 'p6']) {
      s.judge(++at, m, x, y, 'b');
      s.judge(++at, m, third, y, 'b');
    }
    const r = raceOf(x);
    expect(r.dominated.length).toBeGreaterThan(0);
    expect(r.dominated.map((d) => d.id)).not.toContain(r.leaderId);
    expect(r.dominated.map((d) => d.id).sort()).toEqual([x, third].sort());
    // and they are all still live: the retirement rides the batch
    expect(s.getCandidate(x).state).toBe('live');
    s.tick(10 * HOUR + 100_000);
    expect(s.getCandidate(x).state).toBe('retired');
    expect(s.getCandidate(third).state).toBe('retired');
    expect(s.getCandidate(y).state).toBe('live');
  });
});

describe('what closing does (Q1440)', () => {
  it('a later arrival does not revive it', () => {
    const { s, id } = proposed({ quorum: { form: 'share', n: 50 } });
    const r0 = raceOrNone(s, 2000)!;
    for (const [i, m] of ['p2', 'p3', 'p4'].entries()) {
      s.judge(2000 + i, m, id, r0.incumbentId, 'b');
    }
    expect(s.getCandidate(id).state).toBe('retired');
    s.addParticipant(4000, { id: 'p6', handle: 'P6' });
    s.tick(5000);
    expect(s.getCandidate(id).state).toBe('retired');
    expect(s.races(5000)).toEqual([]);
  });

  it('a domination is decided after the batch it rides, not before it', () => {
    // two races on two lines: one adopts, and a candidate on the other whose
    // ground the adoption did not move is looked at afterwards, on the state
    // the adoption left. A candidate whose text *did* move has every judgment
    // locked, so it cannot be dominated — which is the reason the pass runs
    // after the batch rather than off one snapshot taken before it.
    const s = open({ quorum: { form: 'count', n: 2 } }, 5);
    const win = s.submitCandidate(1000, {
      author: 'p1', rationale: 'a',
      patch: rewrite(s.currentVersion(), 1, 'Membership is open to members.'),
    }).id;
    const lose = s.submitCandidate(1100, {
      author: 'p2', rationale: 'b',
      patch: rewrite(s.currentVersion(), 2, 'Decisions are made by vote.'),
    }).id;
    const incOf = (id: string) => s.races(2000).find((r) => r.members.includes(id))!.incumbentId;
    for (const [i, m] of ['p3', 'p4', 'p5'].entries()) {
      s.judge(2000 + i, m, lose, incOf(lose), 'b');
    }
    expect(s.getCandidate(lose).state).toBe('retired');
    s.judge(2500, 'p3', win, incOf(win), 'a');
    expect(s.getCandidate(win).state).toBe('adopted');
  });

  it('replays bit-identically', () => {
    const { s, id } = proposed({ quorum: { form: 'share', n: 50 } });
    const r0 = raceOrNone(s, 2000)!;
    for (const [i, m] of ['p2', 'p3', 'p4'].entries()) {
      s.judge(2000 + i, m, id, r0.incumbentId, 'b');
    }
    const again = Session.replay(s.log);
    expect(again.rollingHash()).toBe(s.rollingHash());
    expect(again.getCandidate(id).state).toBe('retired');
    expect(again.getCandidate(id).exit?.cause).toBe('dominated');
  });

  it('the event names its reason', () => {
    const { s, id } = proposed({ quorum: { form: 'share', n: 50 } });
    const r0 = raceOrNone(s, 2000)!;
    for (const [i, m] of ['p2', 'p3', 'p4'].entries()) {
      s.judge(2000 + i, m, id, r0.incumbentId, 'b');
    }
    const ev = s.log.map((e) => e.event).find((e) => e.type === 'candidate-retired');
    expect(ev).toBeDefined();
    expect((ev as { reason?: string }).reason).toBe('dominated');
  });
});
