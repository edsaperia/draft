/**
 * **The membership's numbers carry through the 🛡️ park** (Q1458, Ed
 * 2026-09-18; SPEC §9.7 rule 8, §8.2 → why: R-056, R-137).
 *
 * The defect this file exists to close. A text change passed under the
 * Founder's veto on the Text does not adopt: it parks as
 * `candidate-awaiting-assent`, and comes back through `assent`, which adopted
 * on the `p`, the threshold and the cap mark recorded at the park and nothing
 * else. So the one adoption a human being deliberated over — and therefore the
 * one likeliest to be read afterwards — was the only one whose record stated
 * no approvals, no floor and no silences, and the passed card a member opened
 * on it said nothing about how many of them had weighed in.
 *
 * Ed's ruling: carry the three through the park. The park records them as they
 * stood when the vote carried, and the adoption after Accept copies them.
 *
 * Two properties, and each has a test below.
 *
 *  1. **They are the park's numbers, not today's.** All three move with the
 *     clock (§8.2), and an accept can come days later, over a room that has
 *     gone on and rules that have changed. What the record must say is what
 *     the membership decided on — so a quorum moved between the park and the
 *     accept must not move the floor on the receipt.
 *  2. **Absent stays absent.** The field is optional on `cappedFit`'s own
 *     terms, so a log whose park predates it folds, replays and accepts
 *     exactly as it did before, and the golden logs need no re-freeze.
 */
import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import { chainHash } from '../src/hash.js';
import type { LogEntry, RaceView } from '../src/types.js';
import { roster } from './helpers.js';

const HOUR = 3600_000;
const MINUTE = 60_000;
const PERIOD = 10 * MINUTE;

const DOC = [
  '# Charter',
  'Membership is open to anyone.',
  'Decisions are made by consensus.',
].join('\n');

function open(overrides: Record<string, unknown> = {}, size = 5): Session {
  return Session.open({
    text: DOC,
    roster: roster(size),
    constitution: makeConstitution({
      windowStartMs: 0,
      windowEndMs: 1000 * HOUR,
      rngSeed: 'park-numbers',
      cooldownMs: 0,
      ...overrides,
    }),
  }, 0);
}

const only = (s: Session, t: number): RaceView => {
  const rs = s.races(t);
  expect(rs.length).toBe(1);
  return rs[0]!;
};

const eventsOf = (s: Session) => s.log.map((e) => e.event);
const parkOf = (s: Session) =>
  eventsOf(s).find((e) => e.type === 'candidate-awaiting-assent');
const adoptionOf = (s: Session) => eventsOf(s).find((e) => e.type === 'adopted');

/**
 * Park one text change under 🛡️, on numbers worth carrying: p1 proposes and
 * p2 approves, which is two approvals; a quorum of everybody holds the race
 * open at a floor of three — the cap at half of a group of five — until the
 * three silent members' 💤 period runs, when the group is two, the floor is
 * the seconder's two and the change carries. So the park is taken on
 * **2 approvals, a floor of 2, and 3 who never answered**: three numbers that
 * are each distinct, and none of them the whole room.
 */
function parked(overrides: Record<string, unknown> = {}): { s: Session; id: string } {
  const s = open({
    textAssent: true,
    abstainAfterMs: PERIOD,
    quorum: { form: 'share', n: 100 },
    ...overrides,
  });
  const { id } = s.submitCandidate(1000, {
    author: 'p1',
    rationale: 'because',
    patch: { baseVersion: s.currentVersion(), hunks: [{ start: 1, end: 2,
      lines: ['Membership is open to members.'] }] },
  });
  const r = only(s, 2000);
  s.judge(2000, 'p2', r.leaderId!, r.incumbentId, 'a');
  // nothing carries while the three silences are still owed
  expect(s.tick(2001)).toEqual([]);
  const when = 1000 + PERIOD + 1;
  expect(s.tick(when).map((e) => e.type)).toContain('candidate-awaiting-assent');
  expect(s.getCandidate(id).state).toBe('awaiting-assent');
  return { s, id };
}

describe('the park records what the room decided on (Q1458)', () => {
  it('states the approvals, the floor and the silences at the moment it parked', () => {
    const { s } = parked();
    expect(parkOf(s)).toMatchObject({ decided: { approvals: 2, floor: 2, abstained: 3 } });
    // and the document has not moved: a park applies nothing (R-056)
    expect(s.document()).toContain('open to anyone');
  });

  it('the accept adopts on them, so the record is shaped like any other', () => {
    const { s, id } = parked();
    s.assent(9 * HOUR, id, 'accept');
    const adopted = adoptionOf(s);
    expect(adopted).toMatchObject({ type: 'adopted', approvals: 2, floor: 2, abstained: 3 });
    expect(s.document()).toContain('open to members');
  });

  it("they are the park's numbers, not the ones standing at the accept", () => {
    const { s, id } = parked();
    // the room goes on while the Founder thinks: the quorum is lowered, which
    // is the one lever that would move a floor re-derived at accept time — a
    // group of two at 30% floors at 1, not at 2 — and hours pass besides.
    s.setStanding(3 * HOUR, 'quorum', { form: 'share', n: 30 });
    s.assent(9 * HOUR, id, 'accept');
    // the receipt still states the decision's own floor, not today's
    expect(adoptionOf(s)).toMatchObject({ approvals: 2, floor: 2, abstained: 3 });
  });

  it('a refusal carries no numbers anywhere, and adopts nothing', () => {
    const { s, id } = parked();
    s.assent(9 * HOUR, id, 'refuse', 'not this wording');
    expect(adoptionOf(s)).toBeUndefined();
    const retired = eventsOf(s).find((e) => e.type === 'candidate-retired');
    expect(retired).toMatchObject({ id, refund: 0, reason: 'not this wording' });
    expect(s.document()).toContain('open to anyone');
  });

  it('replays bit for bit through the park and the accept', () => {
    const { s, id } = parked();
    s.assent(9 * HOUR, id, 'accept');
    const r = Session.replay(s.log);
    expect(r.rollingHash()).toBe(s.rollingHash());
    expect(r.document()).toBe(s.document());
    expect(r.verifyChain()).toBe(true);
  });
});

describe('a park written before the field folds and accepts unchanged', () => {
  /**
   * The compatibility claim, made honestly: the park event is stripped of
   * `decided` and the chain re-hashed from it, which is exactly the log a
   * session running before this rule wrote. Nothing may write the key as
   * `undefined` — that is a different log, with different bytes.
   */
  const stripped = (log: LogEntry[]): LogEntry[] => {
    const out: LogEntry[] = [];
    let prev = '';
    for (const entry of log) {
      let event = entry.event;
      if (event.type === 'candidate-awaiting-assent') {
        const { decided: _decided, ...rest } = event;
        event = rest;
      }
      const hash = chainHash(prev, event);
      out.push({ ...entry, event, prevHash: prev, hash });
      prev = hash;
    }
    return out;
  };

  it('replays, and its accept adopts with no numbers rather than with undefined', () => {
    const { s, id } = parked();
    const old = Session.replay(stripped(s.log));
    expect(Object.keys(parkOf(old)!)).not.toContain('decided');
    expect(old.getCandidate(id).state).toBe('awaiting-assent');
    old.assent(9 * HOUR, id, 'accept');
    const adopted = adoptionOf(old)!;
    // absent, not `undefined`: an `undefined` value would move the bytes of
    // every log already on disk, which is the whole of the optional shape
    expect(Object.keys(adopted)).not.toContain('approvals');
    expect(Object.keys(adopted)).not.toContain('floor');
    expect(Object.keys(adopted)).not.toContain('abstained');
    // and the accept does everything else it always did
    expect(old.document()).toContain('open to members');
    expect(old.verifyChain()).toBe(true);
  });
});
