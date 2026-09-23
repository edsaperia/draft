/**
 * **A stranger sees a closed document's ✔s wherever 🌍 lets them read it**
 * (Q1508; Ed, 2026-09-23, checking Q1504 on docs.vote/d/nh2026 signed out:
 * strangers see the ✔s *if visibility allows*).
 *
 * The door's payload (`strangerView`) carried the text and the members and no
 * `records` at all, so a closed document read signed-out was the finished text
 * without its history. Where `canRead` holds (🌍 link or public) the closed
 * document's records ride the door's payload, sealed exactly as a member's are
 * — the same `authorVisible` names rule, nobody's judgments, no standings; at
 * 🌍 closed none; and a live document's door is unchanged.
 *
 * Driven in process, as `records-uncapped.test.ts` is: the projection is the
 * subject, and the member's own `raceView` is the yardstick.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../../constitution/src/session.js';
import { EngineBridge } from '../../constitution/src/engine-bridge.js';
import { StorePeople } from '../src/store.js';
import type { LoadedDoc } from '../src/store.js';
import { asEngineDoc } from '../src/engine-host.js';
import { raceView, strangerView } from '../src/views.js';

const ADOPTIONS = 3;
// the cooldown metronome is five minutes (§4.2), so each judgment waits it out
const STEP = 400_000;
const ENDS = (ADOPTIONS + 10) * STEP;

const TEXT = [
  '# Charter',
  'The clubhouse is kept open all week.',
  'Meetings happen when someone calls one.',
].join('\n');

function room(chamber: 'closed' | 'link' | 'public'):
{ doc: LoadedDoc; bridge: EngineBridge; bo: string; cy: string } {
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
    ['judgments', { rung: 'after' }], ['chamber', { rung: chamber }],
    ['lapse', { afterMs: null }], ['applications', { apply: false }],
    ['removal', { price: 'consent' }], ['admission', { price: 'assembly' }],
    ['machines', { enabled: false, budget: 0 }],
    ['rate', { grant: 4, cap: 8, dripMinutes: 1 }],
  ];
  for (const [id, v] of values) cs.setSetting(2, id as never, v as never);
  cs.begin(3);
  const doc = { id: 'd-1', cs, people, persisted: 0, relayed: 0, provisional: null } as LoadedDoc;
  const bridge = new EngineBridge(cs, { t: 4, rngSeed: 'q1508' });
  asEngineDoc(doc).bridge = bridge;
  // three rounds on the clubhouse line: bo and cy take turns, ada prefers
  // each new wording to what stands, and it adopts
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
  return { doc, bridge, bo, cy };
}

type Field = { candidateId: string; judgedByMe: boolean; author?: { name: string | null } };
type Rec = { raceId: string; outcome: string; judgedByMe: boolean; field: Field[] };
type Door = { canRead: boolean; records?: Rec[] };

// a member's records with what is theirs alone — whether *they* voted —
// taken off, which is exactly what a stranger's must equal
const unmine = (recs: Rec[]): Rec[] => recs.map((r) => ({ ...r, judgedByMe: false,
  field: r.field.map((f) => ({ ...f, judgedByMe: false })) }));

describe('a stranger reads a closed document with its ✔s (Q1508)', () => {
  for (const rung of ['link', 'public'] as const) {
    it(`closed at 🌍 ${rung}: the door carries the records, sealed as a member's`, () => {
      const { doc, bridge } = room(rung);
      bridge.close(ENDS);
      expect(doc.cs.closed).toBe(true);
      const door = strangerView(doc, ENDS, null) as unknown as Door;
      expect(door.canRead).toBe(true);
      expect(door.records, 'the door carries the records').toBeDefined();
      const adopted = door.records!.filter((r) => r.outcome === 'adopted');
      expect(adopted).toHaveLength(ADOPTIONS);
      // sealed exactly as a member's: the same rows, the same names rule
      // (`authorVisible` — sealed lifts at the close), and nobody's vote
      const member = raceView(doc, 'ada', ENDS) as unknown as { records: Rec[] };
      expect(door.records).toEqual(unmine(member.records));
      expect(JSON.stringify(door.records)).not.toContain('"judgedByMe":true');
      expect(adopted.every((r) => r.field.every((f) => typeof f.author?.name !== 'undefined')),
        'a sealed proposal is named at the close').toBe(true);
    });
  }

  it('closed at 🌍 closed: the door carries none', () => {
    const { doc, bridge } = room('closed');
    bridge.close(ENDS);
    const door = strangerView(doc, ENDS, null) as unknown as Door;
    expect(door.canRead).toBe(false);
    expect(door.records).toBeUndefined();
  });

  it('live at 🌍 link: nothing changes — no records at the door', () => {
    const { doc } = room('link');
    const door = strangerView(doc, ENDS - STEP, null) as unknown as Door;
    expect(door.canRead).toBe(true);
    expect(door.records).toBeUndefined();
  });
});
