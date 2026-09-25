/**
 * **The record's two lines of v0.142, as a member reads them** (Q1538, Q1539;
 * Ed 2026-09-25, rulings 6 and 7; SPEC §4.2, §4.6 → why: R-142, R-143).
 *
 *   `measured-note` — a ✔ record passed at the close before its winner was put
 *   against every rival carries `rivals: { measured, of }` below `of`; a ✔
 *   from a live batch carries them equal (R1).
 *   `ranked-note` — a ✖ record where a wording the fit rated above the text
 *   that stood was kept out by a head-to-head majority carries that wording's
 *   percentage and `ranked: { n, m }`; a ✖ where the text stood on the floor
 *   carries neither (R2). Older records carry no field and read as before (R3,
 *   by construction: every field is optional and spread only where present).
 *
 * Driven in process, as `rivals-stay.test.ts` is: `raceView` is the subject.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../../constitution/src/session.js';
import { EngineBridge } from '../../constitution/src/engine-bridge.js';
import { DEFAULT_TUNING } from '../../constitution/src/adapter.js';
import { StorePeople } from '../src/store.js';
import type { LoadedDoc } from '../src/store.js';
import { asEngineDoc } from '../src/engine-host.js';
import { raceView } from '../src/views.js';

const ENDS = 100_000_000;
const HOUR = 3600_000;

const TEXT = [
  '# Meetings',
  'Notice of a meeting is written in the Members’ Book.',
  'Minutes are kept by the secretary.',
].join('\n');

/** A constituted document: ada (founder), bo, cy, dee, eve, and any `more`. */
function constituted(cooldownMs = 0, more: string[] = []) {
  const people = new StorePeople();
  const cs = ConstitutionSession.open({ title: 'Notes', slug: 'notes',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true } }, 0, people);
  const ids: string[] = [];
  for (const name of ['bo', 'cy', 'dee', 'eve', ...more]) {
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
  const bridge = new EngineBridge(cs, { t: 4, rngSeed: 'record-notes',
    tuning: { ...DEFAULT_TUNING, cooldownMs } });
  asEngineDoc(doc).bridge = bridge;
  const [bo, cy, dee, eve, fay, gus] = ids as [string, string, string, string, string, string];
  return { doc, bridge, ada: 'ada', bo, cy, dee, eve, fay, gus };
}

type Rec = { raceId: string; outcome: string;
  rivals?: { measured: number; of: number };
  field: Array<{ candidateId: string; outcome: string; p: number | null;
    ranked?: { n: number; m: number } }> };

const line = (bridge: EngineBridge, words: string, at = 1) =>
  ({ baseVersion: bridge.engine.currentVersion(), hunks: [{ start: at, end: at + 1, lines: [words] }] });

describe('the measured-note (Q1538 ruling 7)', () => {
  it('a wording passed at the close records how many rivals it was put against; a live one all of them', () => {
    const w = constituted();
    const { doc, bridge, ada, bo, cy, dee, eve } = w;
    // a live pass first, on the minutes line: measured against its one rival
    const M = bridge.proposeText(10, bo, line(bridge, 'Minutes are kept by whoever volunteers.', 2), 'm').id;
    const M2 = bridge.proposeText(11, cy, line(bridge, 'Minutes are kept by the chair.', 2), 'm2').id;
    const incM = bridge.engine.races().find((r) => r.members.includes(M))!.incumbentId;
    bridge.judge(20, dee, M, incM, 'a');
    bridge.judge(21, dee, M, M2, 'a');
    bridge.judge(22, eve, M, M2, 'a');
    expect(bridge.engine.getCandidate(M).state).toBe('adopted');
    // then the notice line: X at its floor, its pair with Y never asked — but
    // the current text measured ahead of Y, so X reaches Y through measured
    // results and the close may carry it (an unmeasured pair is a gap at the
    // close too, Ed 2026-09-25)
    const X = bridge.proposeText(30, cy, line(bridge, 'Notice of a meeting is emailed.'), 'x').id;
    const Y = bridge.proposeText(31, dee, line(bridge, 'Notice of a meeting is pinned up.'), 'y').id;
    const inc = bridge.engine.races().find((r) => r.members.includes(X))!.incumbentId;
    bridge.judge(40, ada, X, inc, 'a');
    bridge.judge(41, ada, Y, inc, 'b');
    bridge.judge(42, bo, Y, inc, 'b');
    expect(bridge.engine.getCandidate(X).state).toBe('live');
    bridge.close(ENDS);
    expect(bridge.engine.getCandidate(X).state).toBe('adopted');
    const v = raceView(doc, eve, ENDS) as unknown as { records: Rec[] };
    const atClose = v.records.find((r) => r.field.some((f) => f.candidateId === X))!;
    expect(atClose.outcome).toBe('adopted');
    expect(atClose.rivals).toEqual({ measured: 0, of: 1 });
    const live = v.records.find((r) => r.field.some((f) => f.candidateId === M))!;
    expect(live.rivals).toEqual({ measured: 1, of: 1 });
  });
});

describe('the ranked-note (Q1539 ruling 6)', () => {
  it('the clone field: both wordings close, the one the fit rated above the text carrying the count', () => {
    // a prior adoption starts an hour's cooldown, so every answer below is in
    // before the batch that decides them
    const w = constituted(HOUR, ['fay', 'gus']);
    const { doc, bridge, ada, bo, cy, dee, eve, fay, gus } = w;
    const Z = bridge.proposeText(10, ada, line(bridge, 'Minutes are kept by whoever volunteers.', 2), 'z').id;
    bridge.judge(20, bo, Z, bridge.engine.races().find((r) => r.members.includes(Z))!.incumbentId, 'a');
    expect(bridge.engine.getCandidate(Z).state).toBe('adopted');
    // 3 X>Y>text (bo, cy, fay), 3 text>X>Y (dee, eve, gus), 1 text>Y>X (ada):
    // the text beats X 4–3 and Y 4–3, X beats Y 6–1 — and the fit, all three
    // pairs asked, rates X at 0.41 over the text's 0.21 (P 0.625)
    const X = bridge.proposeText(100, bo, line(bridge, 'Notice of a meeting is emailed.'), 'x').id;
    const Y = bridge.proposeText(101, cy, line(bridge, 'Notice of a meeting is emailed, twice.'), 'y').id;
    const c = bridge.engine.races().find((r) => r.members.includes(X))!.incumbentId;
    const prefs: Record<string, string> = { [bo]: 'XYc', [cy]: 'XYc', [fay!]: 'XYc',
      [dee]: 'cXY', [eve]: 'cXY', [gus!]: 'cXY', ada: 'cYX' };
    const idOf: Record<string, string> = { X, Y, c };
    let t = 200;
    for (const [who, p] of Object.entries(prefs)) {
      for (const [a, b] of [['X', 'Y'], ['X', 'c'], ['Y', 'c']] as const) {
        bridge.judge((t += 1), who, idOf[a]!, idOf[b]!, p.indexOf(a) < p.indexOf(b) ? 'a' : 'b');
      }
    }
    const fit = bridge.engine.raceFit(bridge.engine.races(t).find((r) => r.members.includes(X))!.id);
    expect(fit.strengths.get(X)!).toBeGreaterThan(fit.strengths.get(c)!);
    bridge.tick(10 + HOUR + 20 + 1000);
    expect(bridge.engine.getCandidate(X).state).toBe('retired');
    expect(bridge.engine.getCandidate(Y).state).toBe('retired');
    const v = raceView(doc, eve, 10 + HOUR + 2000) as unknown as { records: Rec[] };
    const rec = v.records.find((r) => r.field.some((f) => f.candidateId === X))!;
    expect(rec.outcome).toBe('retired');
    const fx = rec.field.find((f) => f.candidateId === X)!;
    // its percentage, above the text's, and why it did not pass: 4 of the 7
    // who answered it against the text preferred the text
    expect(fx.p!).toBeGreaterThan(0.5);
    expect(fx.ranked).toEqual({ n: 4, m: 7 });
    // Y, which the fit put below the text, carries neither
    const fy = v.records.flatMap((r) => r.field).find((f) => f.candidateId === Y)!;
    expect(fy.ranked).toBeUndefined();
  });

  it('a wording the text beat on the floor, not by the ranking, carries neither', () => {
    const w = constituted();
    const { doc, bridge, bo, dee, eve, cy } = w;
    const X = bridge.proposeText(10, bo, line(bridge, 'Notice of a meeting is emailed.'), 'x').id;
    const inc = bridge.engine.races().find((r) => r.members.includes(X))!.incumbentId;
    bridge.judge(20, dee, X, inc, 'b');
    bridge.judge(21, eve, X, inc, 'b');
    bridge.judge(22, cy, X, inc, 'b');
    expect(bridge.engine.getCandidate(X).state).toBe('retired');
    const v = raceView(doc, eve, 100) as unknown as { records: Rec[] };
    const fx = v.records.find((r) => r.field.some((f) => f.candidateId === X))!
      .field.find((f) => f.candidateId === X)!;
    expect(fx.ranked).toBeUndefined();
    expect(fx.p).toBeNull();
  });
});
