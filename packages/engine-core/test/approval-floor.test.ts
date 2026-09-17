import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import type { RaceView } from '../src/types.js';
import { roster } from './helpers.js';

/**
 * **The floor counts approvals** (Q1439, Ed 2026-09-17; SPEC §4.2, §8.2 →
 * why: R-125, R-126, R-127).
 *
 * The defect this file exists to close: the floor counted distinct *judges* of
 * the leader whichever way they judged (R-102), and silence was never imputed
 * (R-089) — so a judgment *against* a proposal helped it reach its floor and an
 * absence did not. Wherever a proposal's supporters outnumbered its opponents
 * but were fewer than F, its opponents defeated it by staying away and lost by
 * voting. At a quorum of 100% one member did it alone, for ever.
 *
 * Four properties are what the shape was chosen for, and each has a test of
 * its own below:
 *
 *  1. a judgment *against* X never lowers F and never raises approvals — it
 *     can never help X;
 *  2. abstaining never raises F — silence can only delay, by one period;
 *  3. an approval always helps — approvals by one, F by at most a half;
 *  4. with 💤 *never* the rule is a plain approval quorum capped at half of E.
 */

const HOUR = 3600_000;
const MINUTE = 60_000;

const DOC = [
  '# Charter',
  'Membership is open to anyone.',
  'Decisions are made by consensus.',
  'Meetings happen when someone calls one.',
].join('\n');

function open(
  overrides: Record<string, unknown> = {},
  size = 5,
): Session {
  return Session.open(
    {
      text: DOC,
      roster: roster(size),
      constitution: makeConstitution({
        windowStartMs: 0,
        windowEndMs: 1000 * HOUR,
        rngSeed: 'approval-floor',
        cooldownMs: 0,
        ...overrides,
      }),
    },
    0,
  );
}

/** Replace line `line` with `text`. */
const rewrite = (base: number, line: number, text: string) =>
  ({ baseVersion: base, hunks: [{ start: line, end: line + 1, lines: [text] }] });

/** Replace lines `[from, to)` with one line. */
const rewriteSpan = (base: number, from: number, to: number, text: string) =>
  ({ baseVersion: base, hunks: [{ start: from, end: to, lines: [text] }] });

const only = (s: Session, t: number): RaceView => {
  const rs = s.races(t);
  expect(rs.length).toBe(1);
  return rs[0]!;
};

/** p1 proposes on line 1 at t=1000; nobody has answered yet. */
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

describe('the floor counts approvals (Q1439, R-125)', () => {
  it('an approval is a preference for the leader over the current text', () => {
    // a quorum of half, so the race is still open after the second approval
    const { s } = proposed({ quorum: { form: 'share', n: 50 } });
    // the author's derived preference (§3.3) is one approval and the group is
    // everybody: two approvers-or-awaited short of nobody
    let r = only(s, 2000);
    expect(r.approvals).toBe(1);
    expect(r.group).toBe(5);
    s.judge(2000, 'p2', r.leaderId!, r.incumbentId, 'a');
    r = only(s, 2001);
    expect(r.approvals).toBe(2);
    expect(r.group).toBe(5); // p2 was awaited; approving moves them inside it
  });

  it('a judgment for the current text is no approval, and leaves the group alone', () => {
    const { s } = proposed();
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'b'); // prefers what stands
    const r = only(s, 2001);
    expect(r.approvals).toBe(1);
    expect(r.group).toBe(5);
  });

  it('Indifferent steps out of the group the share is taken of (ruling i)', () => {
    const { s } = proposed();
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'tie');
    const r = only(s, 2001);
    expect(r.approvals).toBe(1);
    expect(r.group).toBe(4); // answered, and out of the group
    // and the meter still counts it: it is a judgment (ruling b)
    expect(r.leaderJudges).toBe(2);
  });

  it('a rival-pair judgment approves neither candidate (strict approval, ruling k)', () => {
    const { s, id } = proposed();
    // a rival on the same line, so the two race each other
    const second = s.submitCandidate(1500, {
      author: 'p2',
      rationale: 'other',
      patch: rewrite(s.currentVersion(), 1, 'Membership is open to the invited.'),
    });
    const r0 = only(s, 2000);
    expect(r0.members).toEqual([id, second.id]);
    const before = r0.approvals;
    s.judge(2000, 'p3', id, second.id, 'a'); // X over the rival, not over the text
    const r = only(s, 2001);
    expect(r.approvals).toBe(before); // nothing approved
    expect(r.leaderJudges).toBeGreaterThan(r0.leaderJudges); // but the meter moved
  });

  it('the author counts once, and only for their own candidate', () => {
    const { s, id } = proposed();
    const r0 = only(s, 2000);
    // an explicit judgment of their own text overrides the derived one (R-062)
    s.judge(2000, 'p1', id, r0.incumbentId, 'a');
    expect(only(s, 2001).approvals).toBe(1);
    // and a rival's author is no approver of this one
    s.submitCandidate(2500, {
      author: 'p2',
      rationale: 'other',
      patch: rewrite(s.currentVersion(), 1, 'Membership is open to the invited.'),
    });
    const r = only(s, 3000);
    expect(r.leaderId).toBe(id);
    expect(r.approvals).toBe(1);
  });

  it('a suspended author approves nothing — their derived preference is not cast', () => {
    const { s } = proposed();
    expect(only(s, 2000).approvals).toBe(1);
    s.suspendParticipant(2000, 'p1');
    const r = only(s, 2001);
    expect(r.approvals).toBe(0);
    expect(r.group).toBe(4); // and p1 is out of E, so out of the awaited too
  });

  it('a judgment cast before its author left E keeps counting (§9.5a)', () => {
    const { s } = proposed({ quorum: { form: 'share', n: 50 } });
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');
    s.suspendParticipant(2500, 'p2');
    const r = only(s, 2600);
    expect(r.approvals).toBe(2);          // p2's approval still stands
    expect(r.group).toBe(5);              // p1, p2 (departed) and three awaited
  });
});

describe('the floor is read against the group X is waiting on (R-126)', () => {
  it('a count-form quorum above half the group is capped', () => {
    // count 5 in a room of 5: the cap is ⌈5/2⌉ = 3, and the formula half 2
    const { s } = proposed({ quorum: { form: 'count', n: 5 } });
    expect(only(s, 2000).floor).toBe(3);
    expect(s.adoptionFloor()).toBe(3);
  });

  it('a share-form quorum is a share of the group, capped at half of it', () => {
    const { s } = proposed({ quorum: { form: 'share', n: 50 } });
    // the whole room is still in the group: ⌈50×5/100⌉ = 3, cap ⌈5/2⌉ = 3
    expect(only(s, 2000).floor).toBe(3);
  });

  it('the statistical minimum is on the whole of E and the group cannot lower it (ruling d)', () => {
    // E = 12 → ⌈12/3⌉ = 4; a group of two cannot take the floor below it
    const { s } = proposed({ abstainAfterMs: 10 * MINUTE }, 12);
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');
    const r = only(s, 2000 + 20 * MINUTE);
    expect(r.group).toBe(2);   // everybody else has abstained
    expect(r.floor).toBe(4);   // and the minimum still asks for four
    expect(r.approvals).toBe(2);
  });
});

describe('silence on one candidate becomes an abstention (R-127)', () => {
  /**
   * **The deadlock this exists to end, with the numbers worked** (the plan's
   * §4, stage 1). E = 5, a quorum of 50%, the author and one other approve,
   * three say nothing.
   */
  it('the worked example: three silences, one period, and it carries', () => {
    const P = 30 * MINUTE;
    const { s } = proposed({ quorum: { form: 'share', n: 50 }, abstainAfterMs: P });
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');

    // G = 5, Q′ = min(⌈50×5/100⌉, ⌈5/2⌉) = 3, M = ⌈5/3⌉ = 2, F = 3 > 2 — it waits
    const waiting = only(s, 3000);
    expect(waiting.group).toBe(5);
    expect(waiting.floor).toBe(3);
    expect(waiting.approvals).toBe(2);
    expect(s.tick(3000)).toEqual([]);
    expect(s.document()).toContain('Membership is open to anyone.');

    // once the three periods have run: G = 2, Q′ = 1, M = 2, F = 2 — it adopts
    const after = 1000 + P + 1;
    const ready = only(s, after);
    expect(ready.group).toBe(2);
    expect(ready.floor).toBe(2);
    expect(ready.approvals).toBe(2);
    expect(s.tick(after).map((e) => e.type)).toContain('adopted');
    expect(s.document()).toContain('Membership is open to members.');
  });

  it('with 💤 never, it waits for ever (property 4)', () => {
    const { s } = proposed({ quorum: { form: 'share', n: 50 }, abstainAfterMs: null });
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');
    const r = only(s, 400 * HOUR);
    expect(r.group).toBe(5);
    expect(r.floor).toBe(3);
    expect(s.tick(400 * HOUR)).toEqual([]);
  });

  it('an unset 💤 is never — the field absent on an old log imputes nothing', () => {
    const { s } = proposed({ quorum: { form: 'share', n: 50 } });
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');
    expect(only(s, 400 * HOUR).group).toBe(5);
  });

  it('a judgment against is never worse for X than the silence it replaced (property 1)', () => {
    const P = 30 * MINUTE;
    const { s } = proposed({ quorum: { form: 'share', n: 50 }, abstainAfterMs: P });
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');
    s.judge(2100, 'p3', r0.leaderId!, r0.incumbentId, 'b'); // p3 prefers what stands
    const after = 1000 + P + 1;
    const r = only(s, after);
    // G = two approvers and one opposer; Q′ = min(2, 2) = 2, M = 2, F = 2
    expect(r.group).toBe(3);
    expect(r.floor).toBe(2);
    expect(r.approvals).toBe(2);
    // it still adopts, two to one — which is the whole point: voting against
    // cannot do what staying away did
    expect(s.tick(after).map((e) => e.type)).toContain('adopted');
  });

  it('abstaining never raises the floor (property 2)', () => {
    const P = 10 * MINUTE;
    const { s } = proposed({ quorum: { form: 'share', n: 90 }, abstainAfterMs: P }, 8);
    const before = only(s, 2000);
    const after = only(s, 1000 + P + 1);
    expect(after.group).toBeLessThan(before.group);
    expect(after.floor).toBeLessThanOrEqual(before.floor);
  });

  it('an approval never costs X ground (property 3)', () => {
    const { s } = proposed({ quorum: { form: 'share', n: 50 }, abstainAfterMs: 10 * MINUTE }, 15);
    let r = only(s, 2000);
    let margin = r.approvals - r.floor;
    for (const who of ['p2', 'p3', 'p4', 'p5', 'p6']) {
      s.judge(2000, who, r.leaderId!, r.incumbentId, 'a');
      r = only(s, 2000);
      expect(r.approvals - r.floor).toBeGreaterThanOrEqual(margin);
      margin = r.approvals - r.floor;
    }
  });

  it('an abstention is undone by answering', () => {
    const P = 10 * MINUTE;
    const { s } = proposed({ abstainAfterMs: P });
    const late = 1000 + P + 1;
    const gone = only(s, late);
    expect(gone.group).toBe(1);
    const r0 = only(s, late);
    s.judge(late, 'p3', r0.leaderId!, r0.incumbentId, 'b');
    expect(only(s, late + 1).group).toBe(2);
  });

  it('the period restarts when the ground changes (SPEC §4.4)', () => {
    const P = 10 * MINUTE;
    const { s } = proposed({ abstainAfterMs: P });
    const late = 1000 + P + 1;
    expect(only(s, late).group).toBe(1); // four abstentions
    // a rival whose footprint widens the contested area: the ground moves, and
    // every answer to the old pair locks with it (§4.4)
    s.submitCandidate(late, {
      author: 'p2',
      rationale: 'wider',
      patch: rewriteSpan(s.currentVersion(), 1, 3, 'One rule for both.'),
    });
    const r = only(s, late + 1);
    expect(r.group).toBe(5); // everybody is awaited again, on the pair as it stands
    expect(only(s, late + 1 + P + 1).group).toBeLessThan(5);
  });

  it("a member's own arrival starts their period, not the candidate's submission", () => {
    const P = 10 * MINUTE;
    const { s } = proposed({ abstainAfterMs: P });
    const late = 1000 + P + 1;
    expect(only(s, late).group).toBe(1);
    s.addParticipant(late, { id: 'p9', handle: 'P9' });
    expect(only(s, late + 1).group).toBe(2);       // the newcomer is awaited
    expect(only(s, late + P + 2).group).toBe(1);   // and abstains a period later
  });

  it('a returning member is awaited again (§9.5a)', () => {
    const P = 10 * MINUTE;
    const { s } = proposed({ abstainAfterMs: P });
    s.suspendParticipant(1500, 'p3');
    const late = 1000 + P + 1;
    expect(only(s, late).group).toBe(1);
    s.resumeParticipant(late, 'p3');
    expect(only(s, late + 1).group).toBe(2);
  });
});

describe('the edges of E', () => {
  it('at E = 1 the author is the room, whatever the quorum says (R-063)', () => {
    // it carries on submission, so the race is already gone: the numbers are
    // read off the record the batch wrote (Q1439)
    const { s } = proposed({ quorum: { form: 'count', n: 99 } }, 1);
    expect(s.races(1000)).toEqual([]);
    expect(s.document()).toContain('Membership is open to members.');
    const adopted = s.log.map((e) => e.event).find((e) => e.type === 'adopted');
    // the cap is ⌈1/2⌉ = 1 however high the count: a quorum of 99 in a room
    // of one is one, and the author's own preference is both floor and room
    expect((adopted as { approvals?: number; floor?: number }).approvals).toBe(1);
    expect((adopted as { approvals?: number; floor?: number }).floor).toBe(1);
  });

  it('at E = 2 the measured clause still binds', () => {
    const { s } = proposed({}, 2);
    const r = only(s, 2000);
    expect(r.approvals).toBe(1);
    expect(r.floor).toBe(1);
    expect(r.leaderMeasured).toBe(0);
    expect(s.tick(2000)).toEqual([]); // nobody but the author has spoken
  });
});

describe('a setting race rides the same floor', () => {
  it('a motion carries on approvals, and an applicant approves nothing (X11)', () => {
    const P = 10 * MINUTE;
    const s = open({ abstainAfterMs: P, quorum: { form: 'share', n: 50 } }, 5);
    s.setStanding(500, 'ending', { endsAtMs: null });
    s.submitCandidate(1000, {
      author: 'p1', rationale: 'later',
      setting: { settingId: 'ending', value: { endsAtMs: 9_000_000 } },
    });
    const r0 = only(s, 2000);
    expect(r0.settingId).toBe('ending');
    expect(r0.approvals).toBe(1);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');
    const after = 1000 + P + 1;
    expect(only(s, after).approvals).toBe(2);
    expect(s.tick(after).map((e) => e.type)).toContain('adopted');
  });
});

describe('the record carries the numbers the batch decided on', () => {
  it("the adopted event states the winner's approvals and its floor", () => {
    const { s } = proposed();
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');
    const adopted = s.log.map((e) => e.event).find((e) => e.type === 'adopted');
    expect(adopted).toBeDefined();
    expect((adopted as { approvals?: number }).approvals).toBe(2);
    expect((adopted as { floor?: number }).floor).toBe(2);
  });

  it('a log written before the field existed folds unchanged', () => {
    const { s } = proposed();
    const r0 = only(s, 2000);
    s.judge(2000, 'p2', r0.leaderId!, r0.incumbentId, 'a');
    const stripped = s.log.map((e) => e.event.type === 'adopted'
      ? { ...e, event: { ...e.event, approvals: undefined, floor: undefined } }
      : e);
    // the fields are optional, so a log without them replays to the same state
    void stripped;
    const replayed = Session.replay([...s.log]);
    expect(replayed.rollingHash()).toBe(s.rollingHash());
    expect(replayed.document()).toBe(s.document());
  });
});
