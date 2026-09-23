/**
 * **A sealed record's *Previous text* is the wording that was actually
 * replaced** (Q1488; the wrong-line hunt of 2026-09-20, `wrong-line-room.mjs`
 * at its *record* case).
 *
 * A record's span was the union of every field member's hunks, sliced out of
 * the text at the record's own version. That holds while every member of a
 * race is expressed in one line space, and stops holding the moment one is
 * not: a rival closed early (Q1440) keeps its patch frozen at its own base
 * version, because `rebaseOthers` carries only what is live or parked. So
 * after a line is carried in above the race, the union mixes two line spaces
 * — the winner's in the version it was decided against, the retired rival's
 * one version behind it — and the record begins a line too high, says three
 * lines changed where two did, and tells every seat *This clause has changed
 * again since* of a clause that has not.
 *
 * The cure: the span stays **the whole field's**, because the card is the
 * whole field's — one *Previous text* stands above every wording that was put
 * on the clause — but each member is carried to the record's own version by
 * `spanNow` first, the walk the stranded-proposal road a few lines above
 * already takes, so the union is taken in one line space instead of two.
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

const ENDS = 1_000_000;
// the decree spends the cooldown metronome (§4.2, five minutes), so the
// judgment that carries bo's proposal waits it out
const JUDGED = 400_000;
const READ = 500_000;

const TEXT = [
  '# Charter',                                // 0
  'The clubhouse is kept open all week.',     // 1
  'Meetings happen when someone calls one.',  // 2
  'Guests sign the book at the door.',        // 3
  'Dues are paid in March.',                  // 4
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
    ['rate', { grant: 4, cap: 8, dripMinutes: 240 }],
  ];
  for (const [id, v] of values) cs.setSetting(2, id as never, v as never);
  cs.begin(3);
  const doc = { id: 'd-1', cs, people, persisted: 0, relayed: 0, provisional: null } as LoadedDoc;
  const bridge = new EngineBridge(cs, { t: 4, rngSeed: 'q1488' });
  asEngineDoc(doc).bridge = bridge;
  return { doc, bridge, bo, cy };
}

type Rec = { raceId: string; outcome: string; version: number;
  displaced: string[]; at: { start: number; end: number } };

const recordsIn = (doc: LoadedDoc, seat: string, t: number): Rec[] =>
  (raceView(doc, seat, t) as unknown as { records: Rec[] }).records;

describe('a record whose rival closed early (Q1488)', () => {
  /**
   * bo's winner and cy's rival both start at version 0 and overlap, so they
   * race; cy's is retired there, freezing its patch in version 0's lines; a
   * decree puts a line in above, which carries bo's to version 1's; and bo's
   * carries. The record is read at version 1, where cy's hunks no longer mean
   * what they say.
   *
   * **bo proposes first on purpose.** A race is named for its lowest-numbered
   * member and is renamed the moment that member is the one that goes, so a
   * rival submitted first takes its own record away with it when it retires
   * and the two never meet. The shape that bites is the rival submitted
   * second, which files under the race the winner keeps.
   */
  const raced = () => {
    const { doc, bridge, bo, cy } = constituted();
    const v0 = bridge.engine.currentVersion();
    const winner = bridge.proposeText(10, bo, { baseVersion: v0,
      hunks: [{ start: 2, end: 4, lines: ['Meetings are called by anyone, and guests sign in.'] }] },
    'one line for two');
    // cy's runs one line higher than bo's and overlaps it, so the field's span
    // is genuinely wider than the winner's and the two readings differ
    const rival = bridge.proposeText(11, cy, { baseVersion: v0,
      hunks: [{ start: 1, end: 3, lines: ['The clubhouse opens when the Secretary says.'] }] },
    'the Secretary decides');
    expect(rival.raceId).toBe(winner.raceId);
    // cy's is closed where it stands: nothing rebases it from here
    bridge.engine.retire(12, rival.id);
    expect(bridge.engine.getCandidate(rival.id).state).toBe('retired');
    expect(bridge.engine.getCandidate(rival.id).patch!.baseVersion).toBe(0);
    // a line carried in above the race, which moves bo's and not cy's
    bridge.engine.decreeText(13, { author: 'ada', rationale: 'a preamble',
      patch: { baseVersion: 0, hunks: [{ start: 1, end: 1, lines: ['Adopted in the first year.'] }] } });
    expect(bridge.engine.currentVersion()).toBe(1);
    expect(bridge.engine.getCandidate(winner.id).patch!.baseVersion).toBe(1);
    // and bo's carries. The race is asked for by its candidate: the incumbent
    // is positional — the hash of the text it displaces — so the decree above
    // gave the race a new id.
    const race = bridge.engine.raceOf(winner.id);
    bridge.judge(JUDGED, 'ada', winner.id, race.incumbentId, 'a');
    expect(bridge.engine.getCandidate(winner.id).state).toBe('adopted');
    return { doc, bridge, bo, cy, raceId: race.id, rivalId: rival.id };
  };

  it('names the lines the field ran over, and not the preamble above them', () => {
    const { doc, cy, raceId } = raced();
    const rec = recordsIn(doc, cy, READ).find((r) => r.raceId === raceId);
    expect(rec, 'the adopted record is nowhere in the view').toBeTruthy();
    expect(rec!.outcome).toBe('adopted');
    // read at version 1 — the preamble is line 1 there, so the winner sits at
    // 3–5 and cy's retired rival still says 1–3, the lines of version 0
    expect(rec!.version).toBe(1);
    expect((rec as unknown as { field: Array<{ hunks: Array<{ start: number; end: number }> }> })
      .field.map((f) => [f.hunks[0]!.start, f.hunks[0]!.end]))
      .toEqual(expect.arrayContaining([[3, 5], [1, 3]]));
    // the union in one line space: cy's two lines carried to version 1 (2–4)
    // beside bo's (3–5). Before the fix the raw union began at 1 — the
    // preamble, which nobody proposed anything about.
    expect(rec!.displaced).toEqual([
      'The clubhouse is kept open all week.',
      'Meetings happen when someone calls one.',
      'Guests sign the book at the door.',
    ]);
  });

  /**
   * `at` is not the other end of `displaced`. The page reads the clause
   * standing at `at` and compares it with the **winner's** wording; anything
   * wider makes it say *This clause has changed again since* of the very
   * change the record is. So the place is the winner's own, where the field's
   * is the *Previous text*'s — and a field wider than its winner, which is
   * what a contested clause looks like, no longer wears the sentence.
   */
  it('stands on the line its winner put there, and no wider', () => {
    const { doc, bridge, cy, raceId } = raced();
    const rec = recordsIn(doc, cy, READ).find((r) => r.raceId === raceId)!;
    const now = bridge.engine.document().split('\n');
    expect(now.slice(rec.at.start, rec.at.end))
      .toEqual(['Meetings are called by anyone, and guests sign in.']);
    // never the preamble, which is what the mixed union used to reach back to
    expect(now.slice(rec.at.start, rec.at.end)).not.toContain('Adopted in the first year.');
  });

  it('every seat reads the same record — the span is the engine\'s fact, not a seat\'s', () => {
    const { doc, bo, cy, raceId } = raced();
    const forBo = recordsIn(doc, bo, READ).find((r) => r.raceId === raceId)!;
    const forCy = recordsIn(doc, cy, READ).find((r) => r.raceId === raceId)!;
    expect(forBo.displaced).toEqual(forCy.displaced);
    expect(forBo.at).toEqual(forCy.at);
  });
});
