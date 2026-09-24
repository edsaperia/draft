/**
 * **Rivals stay in the race, as a member reads it** (Ed 2026-09-24, Q1534;
 * SPEC §2.4, §4.4 → why: R-141; SURFACE E16, E38).
 *
 * The engine half is `engine-core/test/reaim.test.ts` and the *Notice* fixture
 * in `dominated.test.ts`. This is the projection: a judgment the adoption
 * carried is the member's answer on the rival's race — its tab kept, its
 * verdict pre-selected, the race not asked again and not wearing ↻ — and a
 * clause holds **two records** (ruling 5): the winner's ✔ files at once, and
 * the race that went on files its own when it ends, a rival the batch closed
 * straight after the adoption joining that second record and not the first.
 *
 * Driven in process, as `close-stranded.test.ts` is: `raceView` is the subject.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../../constitution/src/session.js';
import { EngineBridge } from '../../constitution/src/engine-bridge.js';
import { StorePeople } from '../src/store.js';
import type { LoadedDoc } from '../src/store.js';
import { asEngineDoc } from '../src/engine-host.js';
import { raceView } from '../src/views.js';

const ENDS = 100_000_000;
const MIN = 60_000;

const TEXT = [
  '# Meetings',
  'Notice of a meeting is written in the Members’ Book.',
  'Minutes are kept by the secretary.',
].join('\n');

/** A constituted five-member document: ada (founder), bo, cy, dee, eve. */
function constituted() {
  const people = new StorePeople();
  const cs = ConstitutionSession.open({ title: 'Notice', slug: 'notice',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true } }, 0, people);
  const ids: string[] = [];
  for (const name of ['bo', 'cy', 'dee', 'eve']) {
    const id = cs.invite(1, `${name}@example.org`);
    cs.arrive(1, id);
    ids.push(id);
  }
  cs.confirmStartingText(2, TEXT);
  const values: [string, unknown][] = [
    ['ending', { endsAtMs: ENDS }],
    ['quorum', { form: 'count', n: 1 }], ['authorship', { rung: 'sealed' }],
    ['judgments', { rung: 'after' }], ['chamber', { rung: 'link' }],
    ['lapse', { afterMs: null }], ['applications', { apply: false }],
    ['removal', { price: 'consent' }], ['admission', { price: 'assembly' }],
    ['machines', { enabled: false, budget: 0 }],
    ['rate', { grant: 4, cap: 8, dripMinutes: 240 }],
  ];
  for (const [id, v] of values) cs.setSetting(2, id as never, v as never);
  cs.begin(3);
  const doc = { id: 'd-1', cs, people, persisted: 0, relayed: 0, provisional: null } as LoadedDoc;
  const bridge = new EngineBridge(cs, { t: 4, rngSeed: 'q1534' });
  asEngineDoc(doc).bridge = bridge;
  const [bo, cy, dee, eve] = ids as [string, string, string, string];
  return { doc, bridge, ada: 'ada', bo, cy, dee, eve };
}

type View = {
  clauses: Array<{ id: string; incumbentId: string; judged: boolean; shifted: boolean;
    candidates: Array<{ id: string }>; askable: boolean;
    myJudgments: Array<{ a: string; b: string; outcome: string; locked: boolean }> }>;
  mine: Array<{ id: string; state: string }>;
  records: Array<{ raceId: string; candidateId: string; outcome: string; early?: true;
    field: Array<{ candidateId: string; outcome: string }> }>;
};

describe('a rival covering the winner stays in the race, as the view reads it (Q1534)', () => {
  /**
   * A (bo), B (cy), C (dee) all rewrite the Notice line. B carries. C — which
   * eve and ada preferred B to, bo indifferent — can no longer win the moment
   * B stands, and closes in the same batch; A — which eve preferred B to —
   * stays, trailing, with eve's answer carried.
   */
  function walk() {
    const w = constituted();
    const { bridge, ada, bo, cy, dee, eve } = w;
    const v0 = bridge.engine.currentVersion();
    const line = (words: string) => ({ baseVersion: v0, hunks: [{ start: 1, end: 2, lines: [words] }] });
    const A = bridge.proposeText(10, bo, line('Notice of a meeting is emailed a week before.'), 'email').id;
    const B = bridge.proposeText(11, cy, line('Notice of a meeting is given in person or by message.'), 'in person').id;
    const C = bridge.proposeText(12, dee, line('Notice of a meeting is pinned to the board.'), 'the board').id;
    const inc = bridge.engine.races().find((r) => r.members.includes(A))!.incumbentId;
    bridge.judge(20, eve, B, C, 'a');
    bridge.judge(21, ada, B, C, 'a');
    bridge.judge(22, bo, B, C, 'tie');
    bridge.judge(23, eve, A, B, 'b');
    expect([A, B, C].map((id) => bridge.engine.getCandidate(id).state))
      .toEqual(['live', 'live', 'live']);
    bridge.judge(30, ada, B, inc, 'a'); // B carries: cy's own and ada's
    return { ...w, A, B, C };
  }

  it('B carries, C closes in the same batch, A stays live and blue for its author', () => {
    const { doc, bridge, bo, A, B, C } = walk();
    expect(bridge.engine.getCandidate(B).state).toBe('adopted');
    expect(bridge.engine.getCandidate(C).state).toBe('retired');
    expect(bridge.engine.getCandidate(C).exit).toMatchObject({ t: 30, cause: 'dominated', refund: 0 });
    expect(bridge.engine.getCandidate(A).state).toBe('live');
    const v = raceView(doc, bo, 40) as unknown as View;
    // bo's own entry is a live proposal — the ✏️ line, not the red ↻
    expect(v.mine.find((m) => m.id === A)!.state).toBe('live');
    // its race stands on the clause, against the words B put there
    const clause = v.clauses.find((c) => c.candidates.some((x) => x.id === A))!;
    expect(clause.candidates.map((x) => x.id)).toEqual([A]);
  });

  it('eve’s answer on A against B is her answer on A against the text that stands', () => {
    const { doc, bridge, eve, A } = walk();
    const v = raceView(doc, eve, 40) as unknown as View;
    const clause = v.clauses.find((c) => c.candidates.some((x) => x.id === A))!;
    expect(clause.judged).toBe(true);
    expect(clause.shifted).toBe(false); // E16's ↻ is not for a carried answer
    expect(clause.myJudgments).toEqual([{ a: A, b: clause.incumbentId, outcome: 'b', locked: false }]);
    // and the race does not ask her again
    expect(bridge.engine.askOn(eve, clause.id)).toBeNull();
  });

  it('two records on one clause: B’s ✔ now, the race that went on files its own when it ends', () => {
    const { doc, bridge, ada, cy, dee, A, B, C } = walk();
    const recs = (who: string) => (raceView(doc, who, 40) as unknown as View).records;
    // while A still races, the clause holds B's record alone — C is held back
    const now = recs(ada);
    expect(now.map((r) => [r.candidateId, r.outcome])).toEqual([[B, 'adopted']]);
    expect(now[0]!.field.map((f) => f.candidateId)).toEqual([B]);
    // …except for C's author, who is told at once (Q1451): an early row of
    // their own, not silenced by B's record sharing the race's name
    const early = recs(dee).filter((r) => r.early);
    expect(early.map((r) => r.candidateId)).toEqual([C]);
    expect(early[0]!.raceId).not.toBe(now[0]!.raceId);

    // two more members prefer what now stands to A: it can never win, and the
    // next batch closes it — the race that went on has ended
    const inc = bridge.engine.races().find((r) => r.members.includes(A))!.incumbentId;
    bridge.judge(40, ada, A, inc, 'b');
    bridge.judge(41, cy, A, inc, 'b');
    bridge.tick(30 + 5 * MIN + 1);
    expect(bridge.engine.getCandidate(A).state).toBe('retired');
    const after = recs(ada);
    expect(after).toHaveLength(2);
    const [first, second] = after;
    expect(first).toMatchObject({ candidateId: B, outcome: 'adopted' });
    expect(first!.field.map((f) => f.candidateId)).toEqual([B]);
    // the second record is the continuing race's, under a name of its own
    expect(second!.raceId).toBe(`${first!.raceId}/1`);
    expect(second!.field.map((f) => [f.candidateId, f.outcome]).sort())
      .toEqual([[A, 'retired'], [C, 'retired']].sort());
  });
});
