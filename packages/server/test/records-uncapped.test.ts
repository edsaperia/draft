/**
 * **Every resolved race keeps its record, however many there are** (Q1504;
 * Ed, 2026-09-22, looking at docs.vote/d/nh2026 closed: *I should see grey ✔s
 * for every proposal that passed stacked up, but I only see one or two per
 * paragraph*).
 *
 * `raceView` sorted every race's record by time and kept the last fifty. The
 * convention ran past that — 93 adoptions over more than fifty races — so
 * every race decided before the fiftieth-from-last had no ✔ anywhere on the
 * closed page. Ed ruled the cap out outright: the closed page is read once
 * and is the record, and while live the slim view's `recordsKey` already
 * withholds the records from a poll whose count has not moved
 * (`slim-text.test.ts`, the server's slim-view test), so the cap protected
 * nothing the poll does not.
 *
 * Driven in process, as `close-stranded.test.ts` is: the projection is the
 * subject and `raceView` is the member's own read.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../../constitution/src/session.js';
import { EngineBridge } from '../../constitution/src/engine-bridge.js';
import { StorePeople } from '../src/store.js';
import type { LoadedDoc } from '../src/store.js';
import { asEngineDoc } from '../src/engine-host.js';
import { raceView } from '../src/views.js';

const ADOPTIONS = 60;
// the cooldown metronome is five minutes (§4.2), so each judgment waits it out
const STEP = 400_000;
const ENDS = (ADOPTIONS + 10) * STEP;

const TEXT = [
  '# Charter',
  'The clubhouse is kept open all week.',
  'Meetings happen when someone calls one.',
].join('\n');

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
    // a drip a minute, so two proposers never run dry across sixty rounds
    ['rate', { grant: 4, cap: 8, dripMinutes: 1 }],
  ];
  for (const [id, v] of values) cs.setSetting(2, id as never, v as never);
  cs.begin(3);
  const doc = { id: 'd-1', cs, people, persisted: 0, relayed: 0, provisional: null } as LoadedDoc;
  const bridge = new EngineBridge(cs, { t: 4, rngSeed: 'q1504' });
  asEngineDoc(doc).bridge = bridge;
  return { doc, bridge, bo, cy };
}

type Rec = { raceId: string; outcome: string };
type View = { records: Rec[]; recordsKey: number;
  record: { adopted: unknown[] } | null };

describe('the closed page files every record (Q1504)', () => {
  it('serves sixty adoptions as sixty records, live and closed', () => {
    const { doc, bridge, bo, cy } = constituted();
    // sixty rounds on the clubhouse line: bo and cy take turns proposing a
    // new wording, ada prefers it to what stands, and it adopts
    for (let i = 0; i < ADOPTIONS; i++) {
      const t = (i + 1) * STEP;
      const author = i % 2 === 0 ? bo : cy;
      const c = bridge.proposeText(t, author, { baseVersion: bridge.engine.currentVersion(),
        hunks: [{ start: 1, end: 2, lines: [`The clubhouse is kept open, revision ${i + 1}.`] }] },
      `revision ${i + 1}`);
      const race = bridge.engine.raceOf(c.id);
      bridge.judge(t + STEP / 2, 'ada', c.id, race.incumbentId, 'a');
      expect(bridge.engine.getCandidate(c.id).state, `round ${i + 1}`).toBe('adopted');
    }
    expect(bridge.engine.currentVersion()).toBe(ADOPTIONS);

    // live: every adoption's record, the key counting them all
    const live = raceView(doc, bo, ENDS - STEP) as unknown as View;
    expect(live.recordsKey).toBe(ADOPTIONS);
    expect(live.records.filter((r) => r.outcome === 'adopted')).toHaveLength(ADOPTIONS);

    // closed: the same sixty, the first one included
    bridge.close(ENDS);
    expect(bridge.engine.closed).toBe(true);
    const closed = raceView(doc, cy, ENDS) as unknown as View;
    const adopted = closed.records.filter((r) => r.outcome === 'adopted');
    expect(adopted).toHaveLength(ADOPTIONS);
    expect(new Set(adopted.map((r) => r.raceId)).size).toBe(ADOPTIONS);
    expect(closed.record!.adopted).toHaveLength(ADOPTIONS);
  });
});
