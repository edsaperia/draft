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
import { view } from '../../constitution/src/view.js';
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

function room(chamber: 'closed' | 'link' | 'public', authorship = 'sealed'):
{ doc: LoadedDoc; bridge: EngineBridge; bo: string; cy: string } {
  const people = new StorePeople();
  const cs = ConstitutionSession.open({ title: 'Night Watch', slug: 'night-watch',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true } }, 0, people);
  const bo = cs.invite(1, 'bo@example.org');
  cs.arrive(1, bo);
  const cy = cs.invite(1, 'cy@example.org');
  cs.arrive(1, cy);
  // Bo chose a name, Cy never did: the signatures carry one of each (Q1512)
  cs.setIdentity(1, bo, { name: 'Bo Tanner' });
  cs.confirmStartingText(2, TEXT);
  const values: [string, unknown][] = [
    ['ending', { endsAtMs: ENDS }],
    ['quorum', { form: 'count', n: 1 }], ['authorship', { rung: authorship }],
    ['judgments', { rung: 'after' }], ['chamber', { rung: chamber }],
    ['lapse', { afterMs: null }], ['applications', { apply: false }],
    ['removal', { price: 'consent' }], ['admission', { price: 'assembly' }],
    ['machines', { enabled: false, budget: 0 }],
    ['rate', { grant: 4, cap: 8, dripMinutes: 1 }],
  ];
  for (const [id, v] of values) cs.setSetting(2, id as never, v as never);
  cs.begin(3);
  // one amendment (Q1512): the Founder's ✒️ on ⏱️ after the start, a carried
  // `pen` record with what it changed from and why
  cs.setSetting(3, 'rate', { grant: 4, cap: 8, dripMinutes: 2 }, 'A slower drip.');
  const doc ={ id: 'd-1', cs, people, persisted: 0, relayed: 0, provisional: null } as LoadedDoc;
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
type Sig = { name: string | null; erased: boolean; comment: string; t: number };
type Door = { canRead: boolean; records?: Rec[];
  closed: { at: number; signatures?: Sig[] } | null; amendmentRecords?: Record<string, unknown>[] };

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
    const { doc, bridge, bo } = room('closed');
    bridge.close(ENDS);
    doc.cs.acknowledgeClose(ENDS + 1, bo, 'Fairly decided.');
    const door = strangerView(doc, ENDS, null) as unknown as Door;
    expect(door.canRead).toBe(false);
    expect(door.records).toBeUndefined();
    // …and neither the signatures nor the amendments (Q1512)
    expect(door.closed).toEqual({ at: ENDS });
    expect(door.amendmentRecords).toBeUndefined();
  });

  it('live at 🌍 link: nothing changes — no records at the door', () => {
    const { doc } = room('link');
    const door = strangerView(doc, ENDS - STEP, null) as unknown as Door;
    expect(door.canRead).toBe(true);
    expect(door.records).toBeUndefined();
    expect(door.closed).toBeNull();
    expect(door.amendmentRecords).toBeUndefined();
  });
});

/** What a member's own view carries for the two sections, less who they are. */
const memberSide = (doc: LoadedDoc) => {
  const mv = view(doc.cs, 'ada');
  return {
    // a signature as the record reads it (Q769: always named where a name
    // was chosen), the member id left behind
    signatures: mv.closed!.signatures.map(({ name, erased, comment, t }) => ({ name, erased, comment, t })),
    // the carried rule changes `amendmentBlocks` files, as the member's
    // motions carry them — the office on `route`, never the mover
    amendments: mv.motions.filter((m) => m.status === 'carried' &&
      (m.payload.kind === 'set' || m.payload.kind === 'text'))
      .map((m) => ({ route: m.route,
        payload: m.payload.kind === 'text' ? { kind: 'text' } : m.payload,
        why: m.why, status: m.status, at: m.at, from: m.from })),
  };
};

describe('a stranger reads a closed document with its Signatures and Amendments (Q1512)', () => {
  for (const [rung, authorship] of [['link', 'sealed'], ['public', 'sealed'], ['link', 'anonymous']] as const) {
    it(`closed at 🌍 ${rung}, ✍️ ${authorship}: the door carries both, as the member's record reads them`, () => {
      const { doc, bridge, bo, cy } = room(rung, authorship);
      bridge.close(ENDS);
      doc.cs.acknowledgeClose(ENDS + 1, bo, 'Fairly decided.');
      doc.cs.acknowledgeClose(ENDS + 2, cy, '');
      const door = strangerView(doc, ENDS + 3, null) as unknown as Door;
      const member = memberSide(doc);
      // the signatures: the member's own, named where a name was chosen at
      // every ✍️ rung — the record's reading (Q769) — and never a member id
      expect(door.closed?.signatures).toEqual(member.signatures);
      expect(door.closed!.signatures!.map((s) => s.name)).toEqual(['Bo Tanner', null]);
      expect(JSON.stringify(door.closed)).not.toContain(bo);
      expect(JSON.stringify(door.closed)).not.toContain(cy);
      // the amendments: the Founder's ✒️ on ⏱️, by office, with its from
      expect(door.amendmentRecords).toEqual(member.amendments);
      expect(door.amendmentRecords).toHaveLength(1);
      expect(door.amendmentRecords![0]).toMatchObject({ route: 'pen', why: 'A slower drip.',
        payload: { kind: 'set', setting: 'rate' }, from: { grant: 4, cap: 8, dripMinutes: 1 } });
      expect(JSON.stringify(door.amendmentRecords)).not.toMatch(/"(by|mine|id)"/);
    });
  }
});
