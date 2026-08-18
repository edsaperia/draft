import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import type { ConstitutionEvent } from '../src/types.js';

/**
 * The founding (SPEC §9.0a–§9.6a, v0.48): the pre-start free hand, blind
 * collection, the consent rule live, ground shifts, owed OKs, and the
 * moment the document is constituted.
 */

const openDoc = (isMember = true) =>
  ConstitutionSession.open({
    title: 'Hollow Oak Club Charter',
    slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember },
  }, 0);

/** Settle everything reserved-style except the delegated set the test keeps. */
const settleAllReserved = (s: ConstitutionSession, t: number,
  except: string[] = []) => {
  // lapse last: it is the seventh gate (machines is ordinary since Q352),
  // so the document constitutes on its set and everything before it still
  // enjoys the pre-start free hand.
  const values = {
    ending: { endsAtMs: 1_000_000 },
    bar: { pct: 78 },
    pace: { shape: 'ramp', startPct: 55 },
    quorum: { form: 'share', n: 60 },
    authorship: { rung: 'sealed' },
    signing: { rung: 'each' },
    judgments: { rung: 'after' },
    chamber: { rung: 'link' },
    applications: { holder: 'members', joinPolicy: 'invite' },
    rate: { grant: 4, cap: 8, dripMinutes: 240 },
    machines: { enabled: false, budget: 0 },
    lapse: { afterMs: null },
  } as const;
  for (const [id, v] of Object.entries(values)) {
    if (except.includes(id)) continue;
    s.reclaim(t, id as never);
    s.setSetting(t, id as never, v as never);
  }
};

describe('creation and the pre-start free hand (§9.6a, §9.7a)', () => {
  it('opens with title and link settled, constitutional settings delegated', () => {
    const s = openDoc();
    expect(s.titleOf).toBe('Hollow Oak Club Charter');
    expect(s.slug).toBe('hollow-oak');
    expect(s.settingState('bar').holder).toBe('members');
    expect(s.settingState('bar').collecting).toBe(true);
    expect(s.settingState('rate').holder).toBe('convenor');
    // pace is ordinary but the members hold it — Ed's override
    expect(s.settingState('pace').holder).toBe('members');
    expect(s.constitutedAtT).toBeNull();
  });

  it('the convenor is a member when the row is ticked, a clerk when not', () => {
    expect(openDoc(true).E()).toBe(1);
    const clerk = openDoc(false);
    expect(clerk.E()).toBe(0);
    clerk.setConvenorMembership(1, true);
    expect(clerk.E()).toBe(1);
    clerk.setConvenorMembership(2, false);
    expect(clerk.E()).toBe(0);
  });

  it('the convenor re-sets settings freely before the start', () => {
    const s = openDoc();
    s.reclaim(1, 'bar');
    s.setSetting(1, 'bar', { pct: 66 });
    s.setSetting(2, 'bar', { pct: 72 });
    expect(s.settingState('bar').value).toEqual({ pct: 72 });
    s.delegate(3, 'bar');
    expect(s.settingState('bar').collecting).toBe(true);
    expect(s.settingState('bar').value).toBeNull();
  });

  it('refuses to set a delegated setting — reclaim first', () => {
    const s = openDoc();
    expect(() => s.setSetting(1, 'bar', { pct: 66 })).toThrow(/delegated/);
  });

  it('perpetual forces a fixed bar (§9.0)', () => {
    const s = openDoc();
    s.reclaim(1, 'ending');
    s.setSetting(1, 'ending', { endsAtMs: null });
    s.reclaim(2, 'pace');
    expect(() => s.setSetting(2, 'pace', { shape: 'ramp', startPct: 55 }))
      .toThrow(/perpetual/);
    s.setSetting(2, 'pace', { shape: 'fixed' });
  });

  it('keeps every link it has ever had (§9.7a)', () => {
    const s = openDoc();
    s.setSetting(1, 'link', { slug: 'hollow-oak-charter' });
    expect(s.slug).toBe('hollow-oak-charter');
    expect(s.slugs).toEqual(['hollow-oak', 'hollow-oak-charter']);
  });
});

describe('the roster before the start (§9.6a)', () => {
  it('an invitee counts toward nothing until they arrive', () => {
    const s = openDoc();
    const bo = s.invite(1, 'bo@example.org');
    expect(s.E()).toBe(1);
    s.arrive(2, bo);
    expect(s.E()).toBe(2);
  });

  it('member emails are unique — an invited address is told to log in (§9.7½)', () => {
    const s = openDoc();
    s.invite(1, 'bo@example.org');
    expect(() => s.invite(2, 'bo@example.org')).toThrow(/log in/);
    expect(() => s.invite(2, 'ada@example.org')).toThrow(/log in/);
  });

  it('uninviting is free pre-start and recomputes the floor', () => {
    const s = openDoc();
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(2, bo);
    s.uninvite(3, bo);
    expect(s.E()).toBe(1);
    const floors = s.logEntries().map((e) => e.event)
      .filter((e): e is Extract<ConstitutionEvent, { type: 'floor-recomputed' }> =>
        e.type === 'floor-recomputed');
    expect(floors.at(-1)!.E).toBe(1);
    expect(floors.at(-1)!.floorTerm).toBe(1);
  });
});

describe('blind collection and the consent rule live (§9.0a)', () => {
  it('a question with unsettled dependencies is not answerable', () => {
    const s = openDoc();
    expect(() => s.answer(1, 'ada', 'bar', { pct: 66 })).toThrow(/waits on 'ending'/);
  });

  it('answers are revisable until the question settles, and the last member resolves it', () => {
    const s = openDoc();
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.answer(2, 'ada', 'ending', { endsAtMs: 500_000 });
    s.answer(3, 'ada', 'ending', { endsAtMs: 800_000 }); // revision supersedes
    expect(s.settingState('ending').collecting).toBe(true);
    s.answer(4, bo, 'ending', { endsAtMs: 600_000 });
    const st = s.settingState('ending');
    expect(st.collecting).toBe(false);
    expect(st.settledBy).toBe('ceremony');
    expect(st.value).toEqual({ endsAtMs: 800_000 }); // the latest close stated
    expect(st.distribution).toEqual([{ endsAtMs: 800_000 }, { endsAtMs: 600_000 }]);
  });

  it('a never holdout keeps the document perpetual (⏰) and unlapsed (💤)', () => {
    const s = openDoc();
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.answer(2, 'ada', 'ending', { endsAtMs: 500_000 });
    s.answer(3, bo, 'ending', { endsAtMs: null });
    expect(s.settingState('ending').value).toEqual({ endsAtMs: null });
    s.answer(4, 'ada', 'lapse', { afterMs: 1_000 });
    s.answer(5, bo, 'lapse', { afterMs: null });
    expect(s.settingState('lapse').value).toEqual({ afterMs: null });
  });

  it('the quorum question is asked in the convenor’s form (§9.0a)', () => {
    const s = openDoc();
    s.setQuorumForm(1, 'count');
    expect(() => s.answer(2, 'ada', 'quorum', { form: 'share', n: 60 }))
      .toThrow(/asked as a count/);
    s.answer(2, 'ada', 'quorum', { form: 'count', n: 2 });
  });

  it('a ramp answer is refused once the room has settled on perpetual', () => {
    const s = openDoc();
    s.reclaim(1, 'ending');
    s.setSetting(1, 'ending', { endsAtMs: null });
    expect(() => s.answer(2, 'ada', 'pace', { shape: 'ramp', startPct: 55 }))
      .toThrow(/perpetual/);
  });
});

describe('ground shifts (§9.6a): the roster is the ground of every answer', () => {
  it('an arrival mid-collection shifts the ground and re-opens completion', () => {
    const s = openDoc();
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.answer(2, 'ada', 'ending', { endsAtMs: 500_000 }); // bo still owes his
    const cy = s.invite(3, 'cy@example.org');
    s.arrive(3, cy);
    const shifts = s.logEntries().map((e) => e.event)
      .filter((e): e is Extract<ConstitutionEvent, { type: 'ceremony-ground-shifted' }> =>
        e.type === 'ceremony-ground-shifted');
    expect(shifts.length).toBe(1);
    expect(shifts[0]!.cause).toBe('arrival');
    expect(shifts[0]!.settings).toContain('ending');
    expect(s.settingState('ending').collecting).toBe(true); // bo's answer now needed
  });

  it('a departure can complete a question (live electorate)', () => {
    const s = openDoc();
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.answer(2, 'ada', 'ending', { endsAtMs: 500_000 });
    expect(s.settingState('ending').collecting).toBe(true);
    s.uninvite(3, bo);
    expect(s.settingState('ending').collecting).toBe(false);
    expect(s.settingState('ending').value).toEqual({ endsAtMs: 500_000 });
  });
});

describe('owed OKs (§9.6a): inheritance as unacknowledged decisions', () => {
  it('a reserved constitutional set is owed to every arrived member but the convenor', () => {
    const s = openDoc();
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.reclaim(2, 'chamber');
    s.setSetting(2, 'chamber', { rung: 'link' });
    expect(s.memberRecords().get(bo)!.okOwed.has('chamber')).toBe(true);
    expect(s.memberRecords().get('ada')!.okOwed.has('chamber')).toBe(false);
    s.giveOk(3, bo, 'chamber');
    expect(s.memberRecords().get(bo)!.okOwed.has('chamber')).toBe(false);
    // re-setting the value is news again
    s.setSetting(4, 'chamber', { rung: 'closed' });
    expect(s.memberRecords().get(bo)!.okOwed.has('chamber')).toBe(true);
  });

  it('a late arrival is owed the whole settled constitution; answerers are owed nothing', () => {
    const s = openDoc();
    const bo = s.invite(1, 'bo@example.org'); // invited before the start…
    settleAllReserved(s, 2);                  // …which the settle constitutes
    s.arrive(3, bo);                          // arrival inherits (§9.6a)
    const owed = s.memberRecords().get(bo)!.okOwed;
    for (const id of ['ending', 'bar', 'quorum', 'authorship', 'signing',
      'judgments', 'chamber', 'lapse', 'applications']) {
      expect(owed.has(id as never), id).toBe(true);
    }
    expect(owed.has('rate' as never)).toBe(false); // ordinary settings are not owed
    expect(owed.has('machines' as never)).toBe(false); // ordinary since Q352
  });
});

describe('📯 is reachable (§9.7 v0.51)', () => {
  it('delegate the ordinary defaults, resolve by ceremony, unreserve title and link', () => {
    const s = openDoc();
    s.delegate(0, 'rate');
    s.delegate(0, 'machines');
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.confirmStartingText(1, 'x');
    const answers = {
      ending: { endsAtMs: 1_000_000 }, bar: { pct: 66 },
      pace: { shape: 'fixed' }, quorum: { form: 'share', n: 60 },
      authorship: { rung: 'sealed' }, signing: { rung: 'each' },
      judgments: { rung: 'after' }, chamber: { rung: 'link' },
      applications: { holder: 'members', joinPolicy: 'invite' },
      lapse: { afterMs: null }, rate: { grant: 4, cap: 8, dripMinutes: 240 },
      machines: { enabled: false, budget: 0 },
    } as const;
    for (const [id, v] of Object.entries(answers)) {
      s.answer(2, 'ada', id as never, v as never);
      s.answer(2, bo, id as never, v as never);
    }
    expect(s.constitutedAtT).toBe(2); // every gate resolved by the room
    expect(s.crowned()).toBe(true);   // title and link are still ada's
    s.unreserve(3, 'title');
    s.unreserve(3, 'link');
    expect(s.crowned()).toBe(false);  // 📯 — a name in the record
  });
});

describe('constituted (§9.6a): the moment judging opens', () => {
  it('fires when the seven gates settle, and the pre-start rights die with it', () => {
    const s = openDoc();
    settleAllReserved(s, 1, ['applications']); // applications is not a gate
    expect(s.constitutedAtT).toBe(1);
    expect(s.canJudge()).toBe(true);
    expect(() => s.delegate(2, 'bar')).toThrow(/pre-start/);
    expect(() => s.uninvite(2, 'ada')).toThrow(/pre-start/);
    expect(() => s.invite(2, 'new@example.org')).toThrow(/constitutional motion/);
    expect(() => s.confirmStartingText(2, 'x')).toThrow(/proposing in the document/);
  });

  it('a ceremony resolves it when the last gate question completes', () => {
    const s = openDoc();
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    settleAllReserved(s, 2, ['bar']);
    expect(s.constitutedAtT).toBeNull();
    s.answer(3, 'ada', 'bar', { pct: 66 });
    s.answer(4, bo, 'bar', { pct: 78 });
    expect(s.settingState('bar').value).toEqual({ pct: 78 });
    expect(s.constitutedAtT).toBe(4);
  });

  it('post-start the convenor direct-changes reserved settings (§9.7, Ed 366)', () => {
    const s = openDoc();
    settleAllReserved(s, 1);
    s.setSetting(2, 'chamber', { rung: 'closed' }); // reserved: the crown rule
    expect(s.settingState('chamber').settledBy).toBe('crown');
  });

  it('the ramp anchors at constituted and rises to the close bar (§4.3)', () => {
    const s = openDoc();
    settleAllReserved(s, 10); // ramp 55 → 78 over [10, 1_000_000]
    expect(s.bar(10)).toBeCloseTo(55, 5);
    expect(s.bar(1_000_000)).toBeCloseTo(78, 5);
    const mid = s.bar(500_005)!;
    expect(mid).toBeGreaterThan(55);
    expect(mid).toBeLessThan(78);
  });
});

describe('proposing is yours (§9.0b)', () => {
  it('needs the confirmed text and your own answers, not the room’s', () => {
    const s = openDoc();
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    expect(s.canPropose('ada')).toBe(false); // no text yet
    s.confirmStartingText(2, '# One\n\nA clause.');
    expect(s.canPropose('ada')).toBe(false); // ada owes her ceremony answers
    settleAllReserved(s, 3, ['ending']);     // constitutes; ending still collecting
    s.answer(4, 'ada', 'ending', { endsAtMs: 1_000_000 });
    expect(s.canPropose('ada')).toBe(true);  // bo still owes his — not ada's problem
    expect(s.canPropose(bo)).toBe(false);
  });

  it('a starting text may be empty — confirmed decision, not content (§9.0b)', () => {
    const s = openDoc();
    s.confirmStartingText(1, '');
    expect(s.textConfirmed).toBe(true);
    expect(s.text).toBe('');
  });
});

describe('replay (SPEC §11)', () => {
  it('re-folds bit-identically and re-verifies the chain', () => {
    const s = openDoc();
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.setIdentity(2, bo, { name: 'Bo' });
    settleAllReserved(s, 3, ['bar', 'ending']);
    s.confirmStartingText(4, 'The clubhouse shall be kept open.');
    s.answer(5, 'ada', 'ending', { endsAtMs: 900_000 });
    s.answer(6, bo, 'ending', { endsAtMs: null });
    s.answer(7, 'ada', 'bar', { pct: 60 });
    s.answer(8, bo, 'bar', { pct: 82 }); // the last gate answer constitutes
    expect(s.verifyChain()).toBe(true);

    const r = ConstitutionSession.replay([...s.logEntries()]);
    expect(r.rollingHash()).toBe(s.rollingHash());
    expect(r.constitutedAtT).toBe(s.constitutedAtT);
    expect(r.settingState('bar').value).toEqual({ pct: 82 });
    expect(r.settingState('ending').value).toEqual({ endsAtMs: null });
    expect(r.E()).toBe(s.E());
    expect(r.memberRecords().get(bo)!.name).toBe('Bo');
  });

  it('detects tampering at the right seq', () => {
    const s = openDoc();
    s.invite(1, 'bo@example.org');
    const log = s.logEntries().map((e) => ({ ...e, event: { ...e.event } }));
    (log[1]!.event as { t: number }).t = 99;
    expect(() => ConstitutionSession.replay(log as never)).toThrow(/seq 1/);
  });

  it('members verify their own moves were counted (receipts)', () => {
    const s = openDoc();
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(2, bo);
    s.answer(3, bo, 'ending', { endsAtMs: 500 });
    const receipt = s.receipt(bo);
    expect(receipt.length).toBeGreaterThanOrEqual(3);
    for (const r of receipt) {
      expect(s.logEntries()[r.seq]!.hash).toBe(r.hash);
    }
  });
});
