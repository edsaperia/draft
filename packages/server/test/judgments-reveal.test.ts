/**
 * **👁️'s three rungs on one log** (Q996, SPEC §3.5a → why: R-146): votes
 * never revealed · revealed on each decision's sealed record as it seals ·
 * revealed at the end of the document.
 *
 * One room, three members, a quorum of all three: race 1 (Bo's wording)
 * collects Ada's and Cy's votes and adopts; race 2 (Cy's wording) has Ada's
 * vote and is still running. The rung is the variable. What is asserted is the
 * projection alone — `raceView`'s `revealed` on each sealed record, and its
 * absence everywhere else — since the reveal is never a log event.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../../constitution/src/session.js';
import { EngineBridge } from '../../constitution/src/engine-bridge.js';
import { StorePeople } from '../src/store.js';
import type { LoadedDoc } from '../src/store.js';
import { asEngineDoc } from '../src/engine-host.js';
import { raceView, strangerView } from '../src/views.js';

const STEP = 400_000;
const ENDS = 20 * STEP;

const TEXT = [
  '# Charter',
  'The clubhouse is kept open all week.',
  'Meetings happen when someone calls one.',
].join('\n');

type Rung = 'never' | 'decision' | 'after';
type Revealed = { judge: { id: string; name: string | null }; a: string | null;
  b: string | null; outcome: string; t: number };
type Rec = { raceId: string; outcome: string; field: Array<{ candidateId: string; outcome: string }>;
  revealed?: Revealed[] };
type RV = { records: Rec[]; clauses: Array<{ id: string; candidates: Array<{ id: string }> }> };

/**
 * `moveTo`, where given, is the rung the Founder's ✒️ sets at `moveAt` — to
 * show a record is read under the rung standing when its race sealed, and a
 * vote under the rung it was cast under.
 */
function room(rung: Rung, moveTo?: { rung: Rung; at: number }) {
  const people = new StorePeople();
  const cs = ConstitutionSession.open({ title: 'Night Watch', slug: 'night-watch',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true } }, 0, people);
  cs.setIdentity(0, 'ada', { name: 'Ada Lowe' });
  const bo = cs.invite(1, 'bo@example.org');
  cs.arrive(1, bo);
  const cy = cs.invite(1, 'cy@example.org');
  cs.arrive(1, cy);
  cs.setIdentity(1, cy, { name: 'Cy Marsh' });
  cs.confirmStartingText(2, TEXT);
  const values: [string, unknown][] = [
    ['ending', { endsAtMs: ENDS }],
    ['quorum', { form: 'count', n: 3 }], ['authorship', { rung: 'sealed' }],
    ['judgments', { rung }], ['chamber', { rung: 'link' }],
    ['lapse', { afterMs: null }], ['applications', { apply: false }],
    ['removal', { price: 'consent' }], ['admission', { price: 'assembly' }],
    ['machines', { enabled: false, budget: 0 }],
    ['rate', { grant: 4, cap: 8, dripMinutes: 1 }],
  ];
  for (const [id, v] of values) cs.setSetting(2, id as never, v as never);
  cs.begin(3);
  const doc = { id: 'd-1', cs, people, persisted: 0, relayed: 0, provisional: null } as LoadedDoc;
  const bridge = new EngineBridge(cs, { t: 4, rngSeed: 'q996' });
  asEngineDoc(doc).bridge = bridge;
  const move = (t: number) => {
    if (moveTo && moveTo.at <= t && cs.settingState('judgments').value
      && (cs.settingState('judgments').value as { rung: string }).rung !== moveTo.rung) {
      cs.setSetting(moveTo.at, 'judgments', { rung: moveTo.rung });
    }
  };
  // race 1, on the clubhouse line: Bo proposes; Ada and Cy prefer it
  const t1 = STEP;
  const c1 = bridge.proposeText(t1, bo, { baseVersion: bridge.engine.currentVersion(),
    hunks: [{ start: 1, end: 2, lines: ['The clubhouse is kept open on weekdays.'] }] }, 'weekdays');
  const inc1 = bridge.engine.raceOf(c1.id).incumbentId;
  move(t1 + STEP / 4);
  bridge.judge(t1 + STEP / 2, 'ada', c1.id, inc1, 'a');
  move(t1 + (3 * STEP) / 4);
  bridge.judge(t1 + STEP, cy, c1.id, inc1, 'a');
  // race 2, on the meetings line: Cy proposes; only Ada has voted
  const t2 = 3 * STEP;
  const c2 = bridge.proposeText(t2, cy, { baseVersion: bridge.engine.currentVersion(),
    hunks: [{ start: 2, end: 3, lines: ['Meetings happen on the first Monday.'] }] }, 'monthly');
  const inc2 = bridge.engine.raceOf(c2.id).incumbentId;
  bridge.judge(t2 + STEP / 2, 'ada', c2.id, inc2, 'a');
  move(t2 + STEP);
  return { doc, bridge, bo, cy, c1: c1.id, c2: c2.id };
}

const NOW = 5 * STEP;
const rv = (doc: LoadedDoc, who: string, t = NOW) => raceView(doc, who, t) as unknown as RV;
const recOf = (v: RV, cand: string) => v.records.find((r) => r.field.some((f) => f.candidateId === cand));

describe('👁️ reveals judgments by its rung (Q996)', () => {
  it('the fixture: race 1 adopted, race 2 still running', () => {
    const { doc, bridge, c1, c2 } = room('never');
    expect(bridge.engine.getCandidate(c1).state).toBe('adopted');
    expect(bridge.engine.getCandidate(c2).state).toBe('live');
    const v = rv(doc, 'ada');
    expect(recOf(v, c1)?.outcome).toBe('adopted');
    expect(recOf(v, c2)).toBeUndefined();
  });

  it('never: no record names a judge, open or closed', () => {
    const { doc, bridge } = room('never');
    expect(JSON.stringify(rv(doc, 'ada'))).not.toContain('"revealed"');
    bridge.close(ENDS);
    expect(JSON.stringify(rv(doc, 'ada', ENDS))).not.toContain('"revealed"');
  });

  it('per decision: a decided race names its judges as it seals; a running race says nothing', () => {
    const { doc, c1, c2, cy, bo } = room('decision');
    for (const seat of ['ada', bo, cy]) {
      const v = rv(doc, seat);
      const r1 = recOf(v, c1)!;
      expect(r1.revealed, `seat ${seat}`).toBeDefined();
      // Ada and Cy voted, and Bo, who wrote it, counts as having voted for it
      expect(r1.revealed!.map((j) => j.judge.id).sort()).toEqual(['ada', bo, cy].sort());
      expect(r1.revealed!.find((j) => j.judge.id === cy)!.judge.name).toBe('Cy Marsh');
      expect(r1.revealed!.every((j) => j.a === c1 && j.b === null && j.outcome === 'a')).toBe(true);
      // nothing anywhere says how race 2 is going
      expect(JSON.stringify(v.records)).not.toContain(c2);
      expect(JSON.stringify(v.clauses)).not.toContain('"revealed"');
    }
  });

  it('per decision: a rejected proposal is a decision too, and its votes show', () => {
    // a vote against Cy's wording on a quorum of three leaves it dominated:
    // retired, *Rejected*, and so revealed under the middle rung
    const { doc, bridge, c2 } = room('decision');
    bridge.judge(4 * STEP, 'm-1', c2, bridge.engine.raceOf(c2).incumbentId, 'b');
    expect(bridge.engine.getCandidate(c2).state).toBe('retired');
    const r2 = recOf(rv(doc, 'ada'), c2)!;
    expect(r2.outcome).toBe('retired');
    // Cy wrote it and counts as having voted for it; Bo (m-1) voted against
    expect(r2.revealed!.map((j) => [j.judge.id, j.outcome]).sort()).toEqual([['ada', 'a'], ['m-1', 'b'], ['m-2', 'a']]);
  });

  it('per decision at the close: a race the clock cut off undecided stays unrevealed', () => {
    const { doc, bridge, c1, c2 } = room('decision');
    bridge.close(ENDS);
    const v = rv(doc, 'ada', ENDS);
    expect(recOf(v, c1)!.revealed).toHaveLength(3);
    const r2 = recOf(v, c2)!;
    expect(r2.field.some((f) => f.outcome === 'undecided')).toBe(true);
    expect(r2.revealed).toBeUndefined();
  });

  it('at the end: nothing while the document runs, every record once it closes', () => {
    const { doc, bridge, c1, c2 } = room('after');
    expect(JSON.stringify(rv(doc, 'ada'))).not.toContain('"revealed"');
    bridge.close(ENDS);
    const v = rv(doc, 'ada', ENDS);
    expect(recOf(v, c1)!.revealed).toHaveLength(3);
    // the undecided race too: *at the end* is the end of everything (R-055),
    // Cy counted for the wording Cy wrote, oldest first
    expect(recOf(v, c2)!.revealed!.map((j) => [j.judge.id, j.outcome])).toEqual([['m-2', 'a'], ['ada', 'a']]);
    // …and the close's own record carries the same rows
    const closed = (raceView(doc, 'ada', ENDS) as unknown as { record: { adopted: Rec[] } }).record;
    expect(closed.adopted[0]!.revealed).toHaveLength(3);
  });

  it('the stranger and the applicant carry no judge under any rung', () => {
    for (const rung of ['never', 'decision', 'after'] as const) {
      const { doc, bridge } = room(rung);
      bridge.close(ENDS);
      const door = strangerView(doc, ENDS, null) as unknown as { records?: Rec[] };
      expect(door.records, `${rung}: the door reads a closed 🌍 link document`).toBeDefined();
      expect(JSON.stringify(door), rung).not.toContain('"revealed"');
      const app = strangerView(doc, ENDS, null, { memberId: 'x', applicantId: 'a-1' });
      expect(JSON.stringify(app), rung).not.toContain('"revealed"');
    }
  });

  it('a record is read under the rung standing when it sealed, never re-read', () => {
    // sealed under *per decision*, then moved to *never*: still revealed
    const { doc, c1 } = room('decision', { rung: 'never', at: 3 * STEP + STEP });
    expect(doc.cs.judgmentsRungAt(NOW)).toBe('never');
    expect(recOf(rv(doc, 'ada'), c1)!.revealed).toHaveLength(3);
  });

  it('the protective side wins: a vote cast under never is never shown', () => {
    // Ada voted, and Bo proposed, under *never*; the rung moved to *per
    // decision* before Cy's vote sealed the race — only Cy's vote, cast under
    // the new rung, shows: an author's counted vote is cast when they propose
    const { doc, c1, cy } = room('never', { rung: 'decision', at: STEP + (3 * STEP) / 4 });
    const r1 = recOf(rv(doc, 'ada'), c1)!;
    expect(r1.revealed!.map((j) => j.judge.id)).toEqual([cy]);
  });

  it('if you wrote a proposal, you count as having voted for it (Ed, 2026-10-01)', () => {
    // a three-member room: Bo's proposal, Ada and Cy judging — the record
    // names Bo with a vote for it, shaped as any vote, so the judges' names
    // never single out the author by elimination
    const { doc, c1, bo, cy } = room('decision');
    const r1 = recOf(rv(doc, cy), c1)!;
    const boVote = r1.revealed!.find((j) => j.judge.id === bo)!;
    expect(boVote).toMatchObject({ a: c1, b: null, outcome: 'a' });
    expect(Object.keys(boVote).sort()).toEqual(Object.keys(r1.revealed!.find((j) => j.judge.id === 'ada')!).sort());
    expect(JSON.stringify(boVote)).not.toMatch(/author/);
    // listed in time order, Bo's at the proposal, before either judgment
    expect(r1.revealed!.map((j) => j.judge.id)).toEqual([bo, 'ada', cy]);
    // only the record: the race's own count of judges is the engine's, unchanged
    const unrevealed = recOf(rv(room('never').doc, cy), c1);
    expect(unrevealed!.revealed).toBeUndefined();
  });

  it('the rung history replays bit-identically, and the log carries no reveal', () => {
    const { doc } = room('decision', { rung: 'after', at: 3 * STEP + STEP });
    const before = JSON.stringify(doc.cs.logEntries());
    rv(doc, 'ada');
    expect(JSON.stringify(doc.cs.logEntries())).toBe(before);
    const again = ConstitutionSession.replay([...doc.cs.logEntries()], doc.people);
    for (const t of [0, 2, 3, STEP, 4 * STEP, NOW]) {
      expect(again.judgmentsRungAt(t), `t=${t}`).toBe(doc.cs.judgmentsRungAt(t));
    }
    expect(again.judgmentsRungAt(NOW)).toBe('after');
    expect(again.judgmentsRungAt(STEP)).toBe('decision');
  });
});
