import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';

// 🍾 Begin (Q443, 2026-08-21): the founder's explicit act of starting the
// document. Readiness informs and never blocks; the gates block, because
// judging needs the whole constitution (§9.0b).

const FOUNDER_SET = {
  pace: { shape: 'fixed' }, quorum: { form: 'share', n: 60 },
  authorship: { rung: 'sealed' }, signing: { rung: 'each' }, judgments: { rung: 'after' },
  applications: { joinPolicy: 'invite' }, removal: { rung: 'everyone' },
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
