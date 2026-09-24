/**
 * **A stranded proposal in the closed document's record** (Ed, 2026-09-14,
 * Q1353; SPEC §2.6, §4.6 → why: R-113; SURFACE E38).
 *
 * The engine half is `session.test.ts` — the close emits `candidate-undecided`
 * for a patch still `rebase-pending` at T=0, its stake waived. This is the
 * half a member reads: the record's backlog carries it with its last wording
 * and its reason, the text it was written against, and — by the same rule
 * every sealed record uses (Q1333) — the span carried forward to the lines
 * that displaced it, so the closed page can stand it beside the clause it is
 * about. Before the ruling the record held no entry for it at all: the
 * proposal appeared nowhere and its author's edit was spent on nothing.
 *
 * Driven in process rather than over the wire: the projection is the subject,
 * and `raceView` is the member's own read (`routes-member.ts`).
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../../constitution/src/session.js';
import { EngineBridge } from '../../constitution/src/engine-bridge.js';
import { StorePeople } from '../src/store.js';
import type { LoadedDoc } from '../src/store.js';
import { asEngineDoc } from '../src/engine-host.js';
import { raceView } from '../src/views.js';

const ENDS = 1_000_000;

const TEXT = [
  '# Charter',
  'The clubhouse is kept open all week.',
  'Meetings happen when someone calls one.',
].join('\n');

/** A constituted three-member document whose ending the clock can reach. */
function constituted(): { doc: LoadedDoc; bridge: EngineBridge; bo: string; cy: string } {
  const people = new StorePeople();
  const cs = ConstitutionSession.open({ title: 'Night Watch', slug: 'night-watch',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true } }, 0, people);
  const bo = cs.invite(1, 'bo@example.org');
  cs.arrive(1, bo);
  const cy = cs.invite(1, 'cy@example.org');
  cs.arrive(1, cy);
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
  const bridge = new EngineBridge(cs, { t: 4, rngSeed: 'q1353' });
  asEngineDoc(doc).bridge = bridge;
  return { doc, bridge, bo, cy };
}

describe('the close files a stranded proposal into the record (Q1353)', () => {
  it('carries its wording, what it displaced, and the span it now descends to', () => {
    const { doc, bridge, bo, cy } = constituted();
    const v0 = bridge.engine.currentVersion();
    // bo rewrites the clubhouse line and the meetings line as one run of two…
    const winner = bridge.proposeText(10, bo, { baseVersion: v0, hunks: [{ start: 1, end: 3,
      lines: ['The clubhouse is kept open every day.', 'It is never closed without notice.'] }] },
    'every day, with notice');
    // …and cy rewrites the clubhouse line alone, so the two race — and cy's
    // sits inside bo's, touching the change without covering it (R-141)
    const rival = bridge.proposeText(11, cy, { baseVersion: v0,
      hunks: [{ start: 1, end: 2, lines: ['The clubhouse is kept open at weekends.'] }] },
    'weekends are enough');
    expect(rival.raceId).toBe(winner.raceId);
    // ada prefers bo's, which puts it on top with the floor met: it adopts, and
    // cy's patch cannot be carried across the line it rewrote (SPEC §2.4)
    const inc = bridge.engine.races().find((r) => r.id === winner.raceId)!.incumbentId;
    bridge.judge(20, 'ada', winner.id, inc, 'a');
    expect(bridge.engine.getCandidate(winner.id).state).toBe('adopted');
    expect(bridge.engine.getCandidate(rival.id).state).toBe('rebase-pending');

    bridge.close(ENDS);
    expect(bridge.engine.closed).toBe(true);

    const v = raceView(doc, cy, ENDS) as unknown as {
      record: { undecided: Array<{ raceId: string; at: { start: number; end: number };
        displaced: string[]; field: Array<{ candidateId: string; rationale: string;
          hunks: Array<{ start: number; end: number; lines: string[] }> }> }> } | null;
    };
    expect(v.record).not.toBeNull();
    const filed = v.record!.undecided.find((u) => u.field
      .some((f) => f.candidateId === rival.id));
    expect(filed, 'the stranded proposal is nowhere in the record').toBeTruthy();
    // its own name, its race being long gone
    expect(filed!.raceId).toBe(`r:${rival.id}`);
    // the wording and the reason it had when the clock caught it
    expect(filed!.field[0]!.hunks[0]!.lines)
      .toEqual(['The clubhouse is kept open at weekends.']);
    expect(filed!.field[0]!.rationale).toBe('weekends are enough');
    // the text it was written against, read at its own version
    expect(filed!.displaced).toEqual(['The clubhouse is kept open all week.']);
    // and the span carried forward: bo's two lines, not the line number cy
    // wrote against — the same rule a sealed record's `at` follows (Q1333)
    expect(filed!.at).toEqual({ start: 1, end: 3 });
    expect(v.record!.undecided.filter((u) => u.raceId === `r:${rival.id}`)).toHaveLength(1);
  });
});
