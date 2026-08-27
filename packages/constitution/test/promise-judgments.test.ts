/**
 * **Promise-coverage — 👁️ judgments** (backlog entry 84, series 77, batch L).
 * One setting, two rungs, and the question the series asks: is every promise
 * on the card kept by machinery somewhere? **This file fixes nothing.** What
 * holds is locked with an `it` phrased as the promise; what does not is named
 * in the table below and filed in the session's report.
 *
 * `judgments` (👁️, `catalogue.ts`) is constitutional, delegable, judge-gated,
 * `rungs: ['never', 'after']` most-protective-first, consent ask *the most
 * judgment disclosure you will accept* — so a delegated room resolves to the
 * most private answer anybody gave. SPEC §3.5a gives the promise in the room's
 * words: judgments are **never revealed**, or **revealed after the decision
 * they contributed to**; live disclosure is on neither rung, because §8.3's
 * no-standings rule keeps judgment blind while it is collected whatever 👁️
 * says. **The rung `after` is read here as *the end*** — Ed's ruling of
 * 2026-08-25 (backlog entry 55): the rung that exists means the close, its copy
 * should say *Revealed at the end*, and a per-decision reveal is a new rung
 * that wants a SPEC line first. The per-decision wording still standing in
 * SPEC §3.5a and in the page's `lanesFor` body is that entry's copy work, not
 * a behaviour to lock here.
 *
 * **What *judgment* covers**: a text judgment (A / B / indifferent, engine-core
 * `comparisons`), a constitutional-motion answer (`MotionRecord.answers`), and
 * a founding answer (`SettingState.answers`). A 👑 answer is the founder's own
 * and public by construction — not in scope.
 *
 * ## The enumeration — every promise, in every epoch
 *
 * Fold = the method that keeps or breaks it. **holds** · **gap**. The two
 * rungs share every cell but the last, which is the whole finding.
 *
 * | # | the promise, in the room's words | before 🍾 | live | after the close |
 * | --- | --- | --- | --- | --- |
 * | 1 | *while a question is live nobody sees how anybody answered — the count only* | **holds** — `view.ts` builds `QuestionView` from `st.answers` by **counting** and copies only `myAnswer`; §9.0a, not 👁️ | **holds** — `MotionView` carries `answeredCount`, `electorateSize`, `myAnswer`; the map itself never leaves `session.ts` | no question is live |
 * | 2 | *a resolved founding question publishes the shape, never the names* | **holds** — `ResolutionView.distribution` is `SettingValue[]`, ids dropped at the copy | as before | as before |
 * | 3 | *`never`: how you judged is never shown, to anybody, ever — not in the record either* | **holds** | **holds** — `raceView` serves `judges` (a count), `closeness` (a magnitude, Q836) and `judgedByMe`/`judged`/`shifted` from `myJudgments()` alone | **holds** — `closeRecord()` returns `{ closedAt, text, undecided, carriedButUnassented, signatures }`; the record's `field` carries `p`, `threshold`, `judgedByMe` and (as 👤 says, never 👁️) an author |
 * | 4 | *`after`: how you judged is published with the record, and never before* | as row 1 | as row 3 | **gap (fold)** — **nothing reads 👁️ anywhere.** `closeRecord()` and `raceView`'s `record` are byte-identical under both rungs, so *published with the record* is a claim the document does not honour. The headline finding |
 * | 5 | *a stranger is told nothing of anybody's judgments* | **holds** — `strangerView` serves the holding sentence, `textShape` and the rules; no `answers`, no `myAnswer`, no `participantId` | **holds** | **holds** |
 * | 6 | *what you preferred stays yours, permanently* | **holds** | **gap (arithmetic, not code)** — in an electorate of two a 🏛️ motion that has not carried once both have answered names the other member's keep on the count alone. SPEC is silent; no setting can make a unanimity rule non-identifying at n = 2. A question for Ed, not a defect | as live |
 * | 7 | *`after` on a perpetual document* | — | — | **gap (copy)** — `ending.endsAtMs === null` has no close, so `after` is `never`, and no card says so. Filed with entry 55's copy work |
 *
 * And the cell the plan asked to be said out loud so nobody files it twice:
 * **the founding distribution is §9.0a's promise, kept, and is not 👁️'s**.
 * `ResolutionView.distribution` is served for every ceremony-settled setting
 * unconditionally, names off, whatever 👁️ stands at — that is the founding
 * rule's own discipline and not a leak of this one.
 */
import { describe, it, expect } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { EngineBridge } from '../src/engine-bridge.js';
import { CATALOGUE } from '../src/catalogue.js';
import { view } from '../src/view.js';
import type { MemberView } from '../src/view.js';
// `test/helpers.ts`'s `buildConstituted` is deliberately not used: it bakes
// `judgments: { rung: 'after' }`, and every case here needs the rung as a
// parameter. `built` below is that helper's recipe with the one value moved.

type Rung = 'never' | 'after';
const RUNGS: Rung[] = ['never', 'after'];
/** The other rung — what a motion on 👁️ can propose without proposing what stands. */
const other = (r: Rung): Rung => (r === 'never' ? 'after' : 'never');

/**
 * A constituted document at a chosen rung of 👁️. `buildConstituted` bakes
 * `judgments: { rung: 'after' }`, and 👁️ is set **pre-start by the founder's
 * pen** — so a `never` document is the same recipe with the one value moved,
 * rather than an amendment after the fact, which would put a `setting-set`
 * event and an owed OK into the log and make the two documents incomparable.
 */
function built(rung: Rung, endsAtMs: number | null = 1_000_000):
  { s: ConstitutionSession; bo: string; cy: string } {
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter',
    slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);
  const bo = s.invite(1, 'bo@example.org');
  const cy = s.invite(1, 'cy@example.org');
  s.arrive(1, bo);
  s.arrive(1, cy);
  s.confirmStartingText(2, 'The clubhouse shall be kept open.');
  for (const [id, v] of Object.entries({
    ending: { endsAtMs }, pace: { shape: 'fixed' }, bar: { pct: 60 },
    quorum: { form: 'share', n: 60 }, authorship: { rung: 'sealed' },
    judgments: { rung }, chamber: { rung: 'public' },
    applications: { apply: false }, admission: { price: 'assembly' },
    removal: { price: 'consent' }, rate: { grant: 4, cap: 8, dripMinutes: 240 },
    machines: { enabled: false, budget: 0 }, lapse: { afterMs: null },
  })) { s.setSetting(2, id as never, v as never); }
  for (const door of ['door:invite', 'door:remove'] as const) {
    s.relinquish(2, door, 'unilateral');
    s.relinquish(2, door, 'assent');
  }
  s.begin(2);
  expect(s.constitutedAtT).toBe(2);
  return { s, bo, cy };
}

/** Every event type in the log, in order — the fold's own account of itself. */
const types = (s: ConstitutionSession): string[] =>
  s.logEntries().map((e) => e.event.type);

/** A view with 👁️'s own row dropped: everything the setting is not about. */
const exceptJudgments = (v: MemberView): string => JSON.stringify({
  ...v, settings: v.settings.filter((x) => x.setting !== 'judgments'),
});

describe('👁️ the setting nothing reads · the catalogue and the fold', () => {
  it('is a two-rung constitutional judge-gate, most protective first', () => {
    const e = CATALOGUE.find((x) => x.id === 'judgments')!;
    expect(e.glyph).toBe('👁️');
    expect(e.kind).toBe('constitutional');
    expect(e.delegable).toBe(true);
    expect(e.judgeGate).toBe(true);
    expect(e.rungs).toEqual(['never', 'after']);
    expect(e.consent!.ask).toBe('the most judgment disclosure you will accept');
    // most protective first: what the order does to a room's answers is
    // asserted where it happens — *the resolution publishes the shape*, below,
    // where three answers of never/after/after resolve to `never`
    expect(typeof e.consent!.order).toBe('function');
  });

  it('changes nothing anybody is served: two documents alike but for the rung read the same', () => {
    // The audit's headline, stated as a lock rather than as a grep. If a
    // reveal is ever built for `after`, this `it` is the first thing to go
    // red, and it should: the two documents must stop being the same.
    const a = built('never');
    const b = built('after');
    for (const who of ['ada', a.bo, a.cy]) {
      expect(exceptJudgments(view(a.s, who))).toBe(exceptJudgments(view(b.s, who)));
    }
    expect(types(a.s)).toEqual(types(b.s));
    a.s.tick(1_000_000); b.s.tick(1_000_000);
    expect(a.s.closed && b.s.closed).toBe(true);
    for (const who of ['ada', a.bo, a.cy]) {
      expect(exceptJudgments(view(a.s, who))).toBe(exceptJudgments(view(b.s, who)));
    }
    expect(types(a.s)).toEqual(types(b.s));
  });
});

describe('👁️ before 🍾 · a founding answer is the only judgment there is (§9.0a)', () => {
  /** A document still collecting 👁️ itself: the founder hands it over, bo answers. */
  const collecting = (): { s: ConstitutionSession; bo: string; cy: string } => {
    const s = ConstitutionSession.open({ title: 'T', slug: 't',
      convenor: { id: 'ada', email: 'ada@x.org', isMember: true } }, 0);
    const bo = s.invite(1, 'bo@x.org');
    const cy = s.invite(1, 'cy@x.org');
    s.arrive(1, bo);
    s.arrive(1, cy);
    s.delegate(1, 'judgments');
    s.answer(1, bo, 'judgments', { rung: 'never' });
    return { s, bo, cy };
  };

  it('while the question runs a member is served the count and their own answer, and nothing else', () => {
    const { s, bo, cy } = collecting();
    const q = view(s, cy).questions.find((x) => x.setting === 'judgments')!;
    expect(Object.keys(q).sort()).toEqual(
      ['answerable', 'answeredCount', 'electorateSize', 'glyph', 'myAnswer', 'setting']);
    expect(q.answeredCount).toBe(1);
    expect(q.electorateSize).toBe(3);
    expect(q.myAnswer).toBeNull(); // cy has not answered
    expect(view(s, bo).questions.find((x) => x.setting === 'judgments')!.myAnswer)
      .toEqual({ rung: 'never' }); // bo reads their own, and only their own
    // bo's answer is the one distinctive value in this document, and it is not
    // on cy's wire under any key — the projection counts the map, never copies it
    expect(JSON.stringify(view(s, cy))).not.toContain('never');
    expect(JSON.stringify(view(s, cy))).not.toContain('"answers"');
  });

  it('the founder collecting the question is told the count too, not the room', () => {
    const { s } = collecting();
    const q = view(s, 'ada').questions.find((x) => x.setting === 'judgments')!;
    expect(q.answeredCount).toBe(1);
    expect(q.myAnswer).toBeNull();
    expect(JSON.stringify(view(s, 'ada'))).not.toContain('never');
  });

  it('the resolution publishes the shape without names — §9.0a unconditionally, not 👁️', () => {
    // Said here so nobody files it as a 👁️ gap: `ResolutionView.distribution`
    // is served for every ceremony-settled setting whatever 👁️ stands at, and
    // `view.ts` reads no rung to decide it.
    const { s, bo, cy } = collecting();
    s.answer(1, cy, 'judgments', { rung: 'after' });
    s.answer(1, 'ada', 'judgments', { rung: 'after' });
    const r = view(s, bo).resolutions.find((x) => x.setting === 'judgments')!;
    expect(r.value).toEqual({ rung: 'never' }); // the most protective answer given
    expect(r.distribution).toEqual([{ rung: 'never' }, { rung: 'after' }, { rung: 'after' }]);
    expect(Object.keys(r).sort()).toEqual(['distribution', 'setting', 'settledAtT', 'value']);
    // three values, no member id among them
    for (const id of ['ada', bo, cy]) expect(JSON.stringify(r)).not.toContain(id);
  });
});

describe('👁️ live · a constitutional motion is the count and my own answer', () => {
  for (const rung of RUNGS) {
    it(`under \`${rung}\` a motion serves answeredCount, electorateSize and myAnswer — never another member's`, () => {
      const { s, bo, cy } = built(rung);
      const m = s.openMotion(10, bo, { kind: 'set', setting: 'judgments', value: { rung: other(rung) } });
      s.answerMotion(11, cy, m, 'keep');
      const mine = view(s, bo).motions.find((x) => x.id === m)!;
      expect(Object.keys(mine).sort()).toEqual(
        ['answeredCount', 'at', 'electorateSize', 'from', 'id', 'mine', 'myAnswer', 'payload', 'route', 'status', 'why']);
      expect(mine.route).toBe('constitutional');
      expect(mine.answeredCount).toBe(2);
      expect(mine.electorateSize).toBe(3);
      expect(mine.myAnswer).toBe('accept'); // the mover stands at accept from the open (§9.6, R-021)
      expect(view(s, cy).motions.find((x) => x.id === m)!.myAnswer).toBe('keep');
      expect(view(s, 'ada').motions.find((x) => x.id === m)!.myAnswer).toBeNull();
      // the map itself never leaves the session: no `answers` on anybody's wire
      for (const who of ['ada', bo, cy]) {
        expect(JSON.stringify(view(s, who))).not.toContain('"answers"');
      }
      // and a keep leaves it running rather than settling it: what stands stands
      expect(s.motionRecords().get(m)!.status).toBe('running');
      expect(s.settingState('judgments').value).toEqual({ rung });
    });
  }

  it('a member outside the electorate is refused, and refusal reveals nothing', () => {
    const { s, bo } = built('after');
    const m = s.openMotion(10, bo, { kind: 'set', setting: 'judgments', value: { rung: 'never' } });
    expect(() => s.answerMotion(11, 'nobody', m, 'keep'))
      .toThrow(/is not in the motion's electorate/);
    expect(view(s, bo).motions.find((x) => x.id === m)!.answeredCount).toBe(1);
  });

  it('at the close a motion nobody finished is kept, and its answers go nowhere', () => {
    const { s, bo, cy } = built('after');
    const m = s.openMotion(10, bo, { kind: 'set', setting: 'judgments', value: { rung: 'never' } });
    s.answerMotion(11, cy, m, 'keep');
    s.tick(1_000_000);
    expect(s.motionRecords().get(m)!.status).toBe('kept-at-close');
    expect(s.settingState('judgments').value).toEqual({ rung: 'after' }); // what stood stands
    for (const who of ['ada', bo, cy]) {
      const v = view(s, who);
      expect(JSON.stringify(v)).not.toContain('"answers"');
      expect(v.motions.find((x) => x.id === m)!.answeredCount).toBe(2);
    }
  });
});

describe('👁️ the room of two · the count is its own signature', () => {
  it('at n = 2 an unfinished motion with everybody answered names the keep, whatever 👁️ says', () => {
    // **Not a defect: arithmetic.** §9.6 makes a constitutional motion blind
    // while it runs — the count only — and one standing keep blocks it. The
    // mover stands at accept from the open (R-021), so in an electorate of two
    // *2 of 2 have answered* on a motion that has not carried says exactly one
    // thing: the other member kept it. No setting can make a unanimity rule
    // non-identifying at n = 2, and 👁️'s copy (*What you preferred stays
    // yours, permanently*) promises what the arithmetic cannot deliver. SPEC
    // is silent on it — the session files the question rather than a fix.
    const s = ConstitutionSession.open({ title: 'T', slug: 't',
      convenor: { id: 'ada', email: 'ada@x.org', isMember: true } }, 0);
    const bo = s.invite(1, 'bo@x.org');
    s.arrive(1, bo);
    s.confirmStartingText(2, 'Text.');
    for (const [id, v] of Object.entries({
      ending: { endsAtMs: 1_000_000 }, pace: { shape: 'fixed' }, bar: { pct: 60 },
      quorum: { form: 'count', n: 1 }, authorship: { rung: 'sealed' },
      judgments: { rung: 'after' }, chamber: { rung: 'public' },
      applications: { apply: false }, admission: { price: 'assembly' },
      removal: { price: 'consent' }, rate: { grant: 4, cap: 8, dripMinutes: 240 },
      machines: { enabled: false, budget: 0 }, lapse: { afterMs: null },
    })) { s.setSetting(2, id as never, v as never); }
    s.begin(2);
    const m = s.openMotion(10, bo, { kind: 'set', setting: 'judgments', value: { rung: 'never' } });
    s.answerMotion(11, 'ada', m, 'keep');
    const mv = view(s, bo).motions.find((x) => x.id === m)!;
    expect(mv.electorateSize).toBe(2);
    expect(mv.answeredCount).toBe(2);      // everybody has answered
    expect(mv.myAnswer).toBe('accept');    // and one of the two answers is mine
    expect(s.motionRecords().get(m)!.status).toBe('running'); // yet it has not carried
    // therefore ada kept it — read off the view alone, by a member who was
    // never told. The finding is the inference, not the fields.
  });
});

describe('👁️ at the close · the record reveals nothing under either rung', () => {
  for (const rung of RUNGS) {
    it(`under \`${rung}\` closeRecord() carries no judgment, no judge and no participant id`, () => {
      // **This is the assertion that splits the day `after` is built.** As it
      // stands one `it` covers both rungs, because nothing reads 👁️ — which
      // is the finding. When a reveal is built it becomes two:
      //   · under `never`: `closeRecord()` still carries no judgment — this
      //     body unchanged, `RUNGS` narrowed to `['never']`;
      //   · under `after`: the record carries, per resolved race, who judged
      //     and which way — a new `it` asserting the judges of `id` appear in
      //     the record and that the same call under `never` does not.
      // Until then the loop is honest and this comment is the spec of the split.
      const { s, bo, cy } = built(rung);
      const bridge = new EngineBridge(s, { t: 3, rngSeed: 'judgments-' + rung });
      const v0 = bridge.engine.currentVersion();
      const { id } = bridge.proposeText(10, bo,
        { baseVersion: v0, hunks: [{ start: 0, end: 1, lines: ['Open every day.'] }] }, 'nights');
      const race = bridge.engine.races().find((r) => r.members.includes(id))!;
      bridge.judge(20, cy, id, race.incumbentId, 'a');
      // an opposed second, where the first has not already sealed the race
      if (bridge.engine.races().some((r) => r.members.includes(id))) {
        bridge.judge(21, 'ada', id, race.incumbentId, 'b');
      }
      expect(bridge.engine.judgments().length).toBeGreaterThanOrEqual(1); // real judgments, cast
      bridge.close(1_000_000);
      const rec = bridge.closeRecord();
      expect(Object.keys(rec).sort()).toEqual(
        ['carriedButUnassented', 'closedAt', 'signatures', 'text', 'undecided']);
      const wire = JSON.stringify(rec);
      // the promise is about the wire, not about a field list: a new field
      // that leaks is exactly what a field-by-field check misses
      expect(wire).not.toContain('participantId');
      expect(wire).not.toContain('judg');
      for (const judge of [cy, 'ada']) expect(wire).not.toContain(judge);
      // and the members' own views say no more
      for (const who of ['ada', bo, cy]) {
        const v = view(s, who);
        expect(v.closed).not.toBeNull();
        expect(Object.keys(v.closed!).sort()).toEqual(['at', 'mySignature', 'signatures']);
        expect(JSON.stringify(v.closed)).not.toContain('participantId');
      }
    });
  }

  it('a signature is named, and that is not a judgment (§3.5a)', () => {
    const { s, bo, cy } = built('never');
    s.setIdentity(999_000, cy, { name: 'Cy Cadwallader' });
    s.tick(1_000_000);
    s.acknowledgeClose(1_000_100, cy, 'dissent noted, but I sign');
    const sigs = s.closingSignatures();
    expect(sigs.map((x) => x.member)).toEqual([cy]);
    expect(sigs[0]!.name).toBe('Cy Cadwallader');
    // a signature names its signer whatever 👁️ says: signing is the opposite
    // act to judging, and §3.5a seals the second and not the first
    expect(view(s, bo).closed!.signatures).toHaveLength(1);
    expect(view(s, bo).closed!.mySignature).toBeNull();
  });

  it('`after` on a perpetual document is `never`: there is no close to publish with', () => {
    // The card says *published with the record, never before it*, and offers
    // no word about a document that never ends. Filed as copy, with entry 55.
    const { s, bo } = built('after', null);
    expect(s.settingState('ending').value).toEqual({ endsAtMs: null });
    s.tick(9_000_000);
    expect(s.closed).toBe(false);
    expect(view(s, bo).closed).toBeNull(); // no record, ever — so nothing is ever revealed
  });
});
