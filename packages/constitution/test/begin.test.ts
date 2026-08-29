import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';

// 🍾 Begin (Q443, 2026-08-21): the founder's explicit act of starting the
// document. Readiness informs and never blocks; the gates block, because
// judging needs the whole constitution (§9.0b).

const FOUNDER_SET = {
  pace: { shape: 'fixed' }, quorum: { form: 'share', n: 60 },
  authorship: { rung: 'sealed' }, judgments: { rung: 'after' },
  applications: { apply: false }, removal: { price: 'consent' },
  admission: { price: 'assembly' },
  machines: { enabled: false, budget: 0 }, lapse: { afterMs: null },
} as const;

describe('🍾 begin — the founder starts the document (Q443)', () => {
  it('refuses while a judge-gate setting is still being decided, and names it', () => {
    const s = ConstitutionSession.open({ title: 'T', slug: 't',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true } }, 0);
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.confirmStartingText(1, 'x');
    s.setSetting(1, 'rate', { grant: 4, cap: 8, dripMinutes: 240 });
    for (const [id, v] of Object.entries(FOUNDER_SET)) {
      s.reclaim(1, id as never); s.setSetting(1, id as never, v as never);
    }
    // nothing arrives delegated (Ed, 2026-08-21): the two the room decides
    // are handed over first, which is what opens their blind questions
    s.delegate(1, 'ending');
    s.delegate(1, 'bar');
    s.delegate(1, 'chamber');
    s.answer(2, 'ada', 'ending', { endsAtMs: 1_000_000 });
    s.answer(2, bo, 'ending', { endsAtMs: 1_000_000 });
    s.answer(2, 'ada', 'bar', { pct: 66 });
    // bar and chamber are still collecting: bo has not said
    const r = s.readiness();
    expect(r.ready).toBe(false);
    expect(r.waiting).toEqual(['bar', 'chamber']);
    expect(() => s.begin(3)).toThrow(/'bar', 'chamber' are still being decided/);
    expect(s.constitutedAtT).toBeNull();
    // the readout: counts and names, never a value
    expect(r.members).toEqual([
      { id: 'ada', name: null, arrived: true, owed: 2, answered: 1 }, // the founder, a member too
      { id: bo, name: null, arrived: true, owed: 2, answered: 0 },
    ]);
    expect(r.questions.find((q) => q.setting === 'bar')).toEqual(
      { setting: 'bar', settled: false, collecting: true, answered: 1, electorate: 2 });
    expect(JSON.stringify(r)).not.toMatch(/pct|rung|endsAtMs/);
    s.answer(3, bo, 'bar', { pct: 70 });
    s.answer(3, 'ada', 'chamber', { rung: 'link' });
    s.answer(3, bo, 'chamber', { rung: 'link' });
    expect(s.readiness().ready).toBe(true);
    expect(s.constitutedAtT).toBeNull(); // resolved is not begun
    s.begin(4);
    expect(s.constitutedAtT).toBe(4);
    expect(s.canJudge()).toBe(true);
    // the batch: the Text's powers laid down
    expect(s.settingState('startingText').powers).toEqual({ unilateral: false, assent: false });
    expect(() => s.begin(5)).toThrow(/already begun/);
    expect(s.readiness().ready).toBe(false); // nothing left to begin
  });

  // Q648 (Ed, 2026-08-25, riding R-049): the readout's `answered` stops being
  // the raw `answers.size` and counts only the electorate's answers, the way
  // `view()` already did. An abstainer's answer stays in the fold — it is
  // recorded and simply not counted — so the two numbers part company the
  // moment somebody who answered signs out abstaining, and the founder's
  // readout must be the one that matches the card.
  it('counts the electorate\'s answers, not the fold\'s (Q648)', () => {
    const s = ConstitutionSession.open({ title: 'T', slug: 't7',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true } }, 0);
    const bo = s.invite(1, 'bo@example.org');
    const cy = s.invite(1, 'cy@example.org');
    s.arrive(1, bo);
    s.arrive(1, cy);
    s.confirmStartingText(1, 'x');
    setAllBut(s, ['chamber']);
    s.delegate(1, 'chamber');
    s.answer(2, 'ada', 'chamber', { rung: 'link' });
    s.answer(2, cy, 'chamber', { rung: 'closed' });
    expect(s.readiness().questions.find((q) => q.setting === 'chamber')).toEqual(
      { setting: 'chamber', settled: false, collecting: true, answered: 2, electorate: 3 });
    s.signOut(3, cy, 'abstaining');
    expect(s.settingState('chamber').answers.size).toBe(2); // still in the fold
    expect(s.readiness().questions.find((q) => q.setting === 'chamber')).toEqual(
      { setting: 'chamber', settled: false, collecting: true, answered: 1, electorate: 2 });
    expect(s.readiness().waiting).toEqual(['chamber']);     // bo alone holds it
  });

  /* ---- 🍾's power switches (entry 158, Q1018, R-057) --------------------
   * The card carries a switch per zone × power and hands `begin` one list of
   * what to lay down. Absent, the fold is the one it always was — which is
   * what keeps `golden-log.test.ts` green without a re-freeze. */
  const readyDoc = (slug: string) => {
    const s = ConstitutionSession.open({ title: 'T', slug,
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true } }, 0);
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.confirmStartingText(1, 'x');
    for (const [k, v] of Object.entries({
      ending: { endsAtMs: 1_000_000 }, bar: { pct: 66 }, chamber: { rung: 'link' },
      rate: { grant: 4, cap: 8, dripMinutes: 240 }, ...FOUNDER_SET,
    })) { s.reclaim(1, k as never); s.setSetting(1, k as never, v as never); }
    return { s, bo };
  };

  it('no list means no field, and the fold it always had', () => {
    const { s } = readyDoc('z1');
    s.begin(2);
    const ev = s.logEntries().map((e) => e.event).find((e) => e.type === 'constituted')!;
    // **absent, not empty**: a log written today replays byte for byte in a
    // module that knows nothing about the field
    expect(Object.keys(ev)).toEqual(['type', 't']);
    expect(s.settingState('startingText').powers).toEqual({ unilateral: false, assent: false });
    expect(s.settingState('rate').powers).toEqual({ unilateral: true, assent: true });
  });

  it('the list is the whole answer: it lays down what it names and nothing else', () => {
    const { s } = readyDoc('z2');
    s.begin(2, [
      { setting: 'rate', power: 'unilateral' },
      { setting: 'door:invite', power: 'assent' },
      { setting: 'startingText', power: 'unilateral' },
    ]);
    expect(s.settingState('rate').powers).toEqual({ unilateral: false, assent: true });
    expect(s.settingState('door:invite').powers).toEqual({ unilateral: true, assent: false });
    // the Text keeps the shield it was not told to lay down — the whole of
    // what the overturn of Q387 buys
    expect(s.settingState('startingText').powers).toEqual({ unilateral: false, assent: true });
    expect(s.settingState('quorum').powers).toEqual({ unilateral: true, assent: true });
    const r = ConstitutionSession.replay(s.logEntries().slice());
    expect(r.rollingHash()).toBe(s.rollingHash());
    expect(r.settingState('startingText').powers).toEqual({ unilateral: false, assent: true });
  });

  it('an empty list keeps everything, the Text included', () => {
    const { s } = readyDoc('z3');
    s.begin(2, []);
    expect(s.settingState('startingText').powers).toEqual({ unilateral: true, assent: true });
  });

  it('a pending release is spent whatever the list says', () => {
    const { s } = readyDoc('z4');
    // recorded acts, made on the settings' own tabs while the founding ran
    s.relinquish(1, 'rate', 'assent');
    s.relinquish(1, 'quorum', 'unilateral');
    // …and a list that says nothing about either of them
    s.begin(2, [{ setting: 'startingText', power: 'assent' }]);
    expect(s.settingState('rate').powers).toEqual({ unilateral: true, assent: false });
    expect(s.settingState('quorum').powers).toEqual({ unilateral: false, assent: true });
    expect(s.settingState('startingText').powers).toEqual({ unilateral: true, assent: false });
  });

  it('the list only ever lowers: a power already given is a no-op, not an error', () => {
    const { s } = readyDoc('z5');
    s.relinquish(1, 'rate', 'assent');
    s.begin(2, [
      { setting: 'rate', power: 'assent' },      // already promised away
      { setting: 'rate', power: 'unilateral' },
    ]);
    expect(s.settingState('rate').powers).toEqual({ unilateral: false, assent: false });
    expect(s.settingState('rate').holder).toBe('members');
  });

  it('a key that carries no power is refused before anything is emitted', () => {
    const { s } = readyDoc('z6');
    expect(() => s.begin(2, [{ setting: 'displayName' as never, power: 'assent' }]))
      .toThrow(/'displayName' carries no power to lay down/);
    expect(s.constitutedAtT).toBeNull();
    expect(s.logEntries().some((e) => e.event.type === 'constituted')).toBe(false);
    // …and the document still begins afterwards
    s.begin(3, []);
    expect(s.constitutedAtT).toBe(3);
  });

  it('a whole zone laid down is one release batch per member, never one per pair (entry 162)', () => {
    const { s, bo } = readyDoc('z7');
    // the Membership zone, as `BEGIN_ZONES` has it: both doors and the four
    // rules — twelve pairs in one press
    const zone = ['door:invite', 'door:remove', 'admission', 'applications',
      'removal', 'lapse'] as const;
    s.begin(2, [...zone, 'startingText' as const].flatMap((k) => [
      { setting: k, power: 'unilateral' as const },
      { setting: k, power: 'assent' as const },
    ]));
    const owed = [...s.memberRecords().get(bo)!.releasesOwed];
    expect(owed).toHaveLength(1);
    const batch = s.releaseBatchRecords().get(owed[0])!;
    // the Text's own pair rides the same batch — one act, one card, one OK
    expect(batch.releases).toHaveLength(14);
    expect(batch.t).toBe(2);
    for (const k of zone) expect(s.settingState(k).holder).toBe('members');
  });

  it('spends every pending release in the same act (R-048)', () => {
    const s = ConstitutionSession.open({ title: 'T', slug: 't2',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true } }, 0);
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.confirmStartingText(1, 'x');
    s.setSetting(1, 'rate', { grant: 4, cap: 8, dripMinutes: 240 });
    for (const [id, v] of Object.entries({ ...FOUNDER_SET,
      ending: { endsAtMs: 1_000_000 }, bar: { pct: 66 }, chamber: { rung: 'link' },
    })) { s.reclaim(1, id as never); s.setSetting(1, id as never, v as never); }
    // three releases, made while the founding ran: one power, the other, and
    // both on a setting that takes no founding question
    s.relinquish(2, 'rate', 'assent');
    s.relinquish(2, 'quorum', 'unilateral');
    s.relinquish(2, 'link', 'unilateral');
    s.relinquish(2, 'link', 'assent');
    expect(s.settingState('rate').powers).toEqual({ unilateral: true, assent: true });
    s.begin(3);
    expect(s.settingState('rate').powers).toEqual({ unilateral: true, assent: false });
    expect(s.settingState('quorum').powers).toEqual({ unilateral: false, assent: true });
    expect(s.settingState('link').holder).toBe('members');
    // …and the values the founder set all stand: a lay-down is not a reset
    expect(s.settingState('link').value).toEqual({ slug: 't2' });
    expect(s.settingState('quorum').value).toEqual({ form: 'share', n: 60 });
    // the log carries the four events and replays to the same state
    const r = ConstitutionSession.replay(s.logEntries().slice());
    expect(r.rollingHash()).toBe(s.rollingHash());
    expect(r.settingState('quorum').powers).toEqual({ unilateral: false, assent: true });
    expect(r.settingState('link').holder).toBe('members');
  });

  // Q626: the start waits on **any** delegated question, gate or not. A
  // question delegated to a room that cannot answer it survives the start in a
  // state nothing reaches — it cannot resolve (under two voices), cannot be
  // reclaimed (pre-start only) and cannot be set (the members' now) — while the
  // adapter runs on a fallback nobody chose. SPEC §9.7.1 always said so.
  const setAllBut = (s: ConstitutionSession, except: string[], t = 1) => {
    const all = {
      ending: { endsAtMs: 1_000_000 }, bar: { pct: 66 }, chamber: { rung: 'link' },
      rate: { grant: 4, cap: 8, dripMinutes: 240 }, ...FOUNDER_SET,
    } as const;
    for (const [k, v] of Object.entries(all)) {
      if (except.includes(k)) continue;
      s.reclaim(t, k as never); s.setSetting(t, k as never, v as never);
    }
  };

  it('a delegated non-gate question blocks the start too (Q626)', () => {
    const s = ConstitutionSession.open({ title: 'T', slug: 't4',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true } }, 0);
    s.confirmStartingText(1, 'x');
    setAllBut(s, ['rate']);
    s.delegate(1, 'rate'); // the proposal rate: ordinary, and no judge-gate
    const r = s.readiness();
    expect(r.ready).toBe(false);
    expect(r.waiting).toEqual(['rate']);
    expect(() => s.begin(2)).toThrow(/'rate' is still being decided/);
    expect(s.constitutedAtT).toBeNull();
  });

  it('a clerk cannot seal the document by delegating applications (Q626)', () => {
    const s = ConstitutionSession.open({ title: 'T', slug: 't5',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: false } }, 0);
    s.confirmStartingText(1, 'x');
    setAllBut(s, ['applications']);
    s.delegate(1, 'applications');
    // The regression this test prevents: past the start there is nobody to
    // answer the question, nobody to reclaim it, and the hand-over has taken
    // the register's drafting power with it — so the clerk could neither
    // invite nor let anybody apply. The document would be sealed for ever.
    expect(s.E()).toBe(0);
    expect(() => s.begin(2)).toThrow(/'applications' is still being decided/);
    expect(s.constitutedAtT).toBeNull();
  });

  it('reclaiming the question releases the start (Q626)', () => {
    const s = ConstitutionSession.open({ title: 'T', slug: 't6',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true } }, 0);
    s.confirmStartingText(1, 'x');
    setAllBut(s, ['rate']);
    s.delegate(1, 'rate');
    expect(() => s.begin(2)).toThrow(/'rate' is still being decided/);
    s.reclaim(2, 'rate');
    s.setSetting(2, 'rate', { grant: 4, cap: 8, dripMinutes: 240 });
    expect(s.readiness().ready).toBe(true);
    s.begin(3);
    expect(s.constitutedAtT).toBe(3);
  });

  it('an invitation outstanding at 🍾 is an offer awaiting the person (Q441/457)', () => {
    const s = ConstitutionSession.open({ title: 'T', slug: 't2',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true } }, 0);
    const dee = s.invite(1, 'dee@example.org'); // never arrives before the start
    s.confirmStartingText(1, 'x');
    for (const [k, v] of Object.entries({
      ending: { endsAtMs: 1_000_000 }, bar: { pct: 66 }, chamber: { rung: 'link' },
      rate: { grant: 4, cap: 8, dripMinutes: 240 }, ...FOUNDER_SET,
    })) { s.reclaim(1, k as never); s.setSetting(1, k as never, v as never); }
    s.begin(2);
    expect(s.memberRecords().get(dee)!.arrivedAtT).toBeNull();
    expect(s.motionRecords().size).toBe(0);
    // the room's half of the consent was given before 🍾 and stands; what
    // is outstanding is the joiner's, and walking in is it — no motion
    s.arrive(3, dee);
    expect(s.memberRecords().get(dee)!.arrivedAtT).toBe(3);
    expect(s.motionRecords().size).toBe(0);
    expect(s.E()).toBe(2);
  });

  it('presence is presence (Q459a): a read refreshes the clock, at most hourly', () => {
    const hour = 3600_000;
    const s = ConstitutionSession.open({ title: 'T', slug: 't3',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true } }, 0);
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.confirmStartingText(1, 'x');
    for (const [k, v] of Object.entries({
      ending: { endsAtMs: 1000 * hour }, bar: { pct: 66 }, chamber: { rung: 'link' },
      rate: { grant: 4, cap: 8, dripMinutes: 240 }, ...FOUNDER_SET, lapse: { afterMs: 3 * hour },
    })) { s.reclaim(1, k as never); s.setSetting(1, k as never, v as never); }
    s.begin(2);
    const last = () => s.memberRecords().get(bo)!.lastActivityT;
    const t0 = last();
    expect(s.seen(t0 + 10_000, bo)).toBe(false); // within the hour: nothing written
    expect(last()).toBe(t0);
    expect(s.seen(t0 + hour, bo)).toBe(true);
    expect(last()).toBe(t0 + hour);
    expect(s.seen(t0 + hour + 59 * 60_000, bo)).toBe(false);
    // a reader never lapses: the host ticks every minute and the reader's
    // page polls — past the three-hour spell, bo is still in
    for (let t = t0 + hour + 1; t <= t0 + 4 * hour; t += 30 * 60_000) {
      s.tick(t);
      s.seen(t, bo);
    }
    expect(s.memberRecords().get(bo)!.lapsed).toBe(false);
    // a lapsed member's read records nothing — revival is an act (memberReturn)
    for (let t = t0 + 4 * hour; t <= t0 + 8 * hour; t += 30 * 60_000) s.tick(t);
    expect(s.memberRecords().get(bo)!.lapsed).toBe(true);
    expect(s.seen(t0 + 9 * hour, bo)).toBe(false);
    const r = ConstitutionSession.replay([...s.logEntries()]);
    expect(r.rollingHash()).toBe(s.rollingHash());
    expect(r.memberRecords().get(bo)!.lastActivityT).toBe(s.memberRecords().get(bo)!.lastActivityT);
  });
});
