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

/**
 * A document whose constitutional settings the founder has handed to the room.
 * **Nothing arrives delegated** (Ed, 2026-08-21, amending §9.0a), so a test
 * about blind collection has to perform the act that opens the questions —
 * which is the founder's, and explicit. `openDoc` stays the raw birth, so the
 * tests about what creation produces still test creation.
 */
const DELEGABLE_CONSTITUTIONAL = ['ending', 'bar', 'quorum', 'authorship',
  'judgments', 'chamber', 'lapse', 'removal', 'membership', 'applications'] as const;
const openDelegated = (isMember = true) => {
  const s = openDoc(isMember);
  for (const id of DELEGABLE_CONSTITUTIONAL) s.delegate(0, id);
  return s;
};

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

    judgments: { rung: 'after' },
    chamber: { rung: 'link' },
    applications: { holder: 'members', apply: false },
    membership: { price: 'assembly' },
    rate: { grant: 4, cap: 8, dripMinutes: 240 },
    machines: { enabled: false, budget: 0 },
    removal: { price: 'consent' },
    lapse: { afterMs: null },
  } as const;
  for (const [id, v] of Object.entries(values)) {
    if (except.includes(id)) continue;
    s.reclaim(t, id as never);
    s.setSetting(t, id as never, v as never);
  }
};

describe('creation and the pre-start free hand (§9.6a, §9.7a)', () => {
  // **Nothing arrives delegated** (Ed, 2026-08-21, amending §9.0a, closing
  // Q511). §9.0a used to make the roster the default holder of every
  // constitutional setting, which meant ten blind questions opened at the
  // instant of creation — the room could answer before the founder had seen
  // one of them, and no surface could tell a default from a decision.
  it('opens with title and link settled and nothing yet delegated', () => {
    const s = openDoc();
    expect(s.titleOf).toBe('Hollow Oak Club Charter');
    expect(s.slug).toBe('hollow-oak');
    for (const id of DELEGABLE_CONSTITUTIONAL) {
      const st = s.settingState(id);
      expect(st.holder, id).toBe('convenor');
      expect(st.collecting, id).toBe(false);
      expect(st.value, id).toBeNull();
      expect(st.powers.unilateral, id).toBe(true);
      expect(st.powers.assent, id).toBe(true);
    }
    expect(s.settingState('rate').holder).toBe('convenor');
    // pacing is the founder's and not delegable pre-start (Q415)
    expect(s.settingState('pace').holder).toBe('convenor');
    expect(s.settingState('pace').collecting).toBe(false);
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
    const s = openDelegated();
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
    const s = openDelegated();
    expect(() => s.answer(1, 'ada', 'bar', { pct: 66 })).toThrow(/waits on 'ending'/);
  });

  it('answers are revisable until the question settles, and the last member resolves it', () => {
    const s = openDelegated();
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
    const s = openDelegated();
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
    const s = openDelegated();
    s.setQuorumForm(1, 'count');
    expect(() => s.answer(2, 'ada', 'quorum', { form: 'share', n: 60 }))
      .toThrow(/asked as a count/);
    s.answer(2, 'ada', 'quorum', { form: 'count', n: 2 });
  });

  // Q415 (Ed, 2026-08-19): pacing is never a founding question — no surface
  // ever grew one for a {shape, startPct}, and Q341 put the ramp with the
  // founder. Delegating it pre-start is therefore a hand-over like the
  // title's, not a blind collection, so 📯 stays reachable.
  it('pacing is never a founding question, and hands over rather than collects', () => {
    const s = openDelegated();
    expect(s.settingState('pace').collecting).toBe(false);
    expect(() => s.answer(2, 'ada', 'pace', { shape: 'fixed' }))
      .toThrow(/not collecting/);
    s.confirmStartingText(2, 'x');
    s.delegate(3, 'pace');
    expect(s.settingState('pace').holder).toBe('members');
    expect(s.settingState('pace').collecting).toBe(false);
  });
});

describe('ground shifts (§9.6a): the roster is the ground of every answer', () => {
  it('an arrival mid-collection shifts the ground and re-opens completion', () => {
    const s = openDelegated();
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
    const s = openDelegated();
    const bo = s.invite(1, 'bo@example.org');
    const cy = s.invite(1, 'cy@example.org');
    s.arrive(1, bo);
    s.arrive(1, cy);
    s.answer(2, 'ada', 'ending', { endsAtMs: 500_000 });
    s.answer(2, bo, 'ending', { endsAtMs: 400_000 });
    expect(s.settingState('ending').collecting).toBe(true);   // cy still owes
    s.uninvite(3, cy);
    expect(s.settingState('ending').collecting).toBe(false);
    expect(s.settingState('ending').value).toEqual({ endsAtMs: 500_000 });
  });

  // Q413 (Ed, 2026-08-19): a consent rule computed over one answer is that
  // answer, so a delegated question does not resolve on a membership of one
  it('never resolves on one voice', () => {
    const s = openDelegated();
    s.answer(2, 'ada', 'ending', { endsAtMs: 500_000 });
    expect(s.settingState('ending').collecting).toBe(true);
    expect(s.settingState('ending').value).toBeNull();
    const bo = s.invite(3, 'bo@example.org');
    s.arrive(3, bo);
    s.answer(3, bo, 'ending', { endsAtMs: 400_000 });
    expect(s.settingState('ending').value).toEqual({ endsAtMs: 500_000 });
  });
});

describe('owed OKs (§9.6a): what was decided after you arrived', () => {
  it('a reserved constitutional set is owed to every arrived member but the convenor', () => {
    const s = openDelegated();
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

  // **A setting that predates you is simply what the document says** (Ed,
  // 2026-08-25), reversing R-016's inheritance clause: a late arrival
  // inherits the constitution and is owed nothing for any of it. What is
  // still owed is everything set or changed *after* they arrived, which is
  // `oweOks`'s business and is asserted directly above.
  it('a late arrival inherits the constitution and is owed nothing for it', () => {
    const s = openDelegated();
    const bo = s.invite(1, 'bo@example.org'); // invited before the start…
    settleAllReserved(s, 2);                  // …which the settle constitutes
    s.arrive(3, bo);                          // arrival inherits (§9.6a)
    const owed = s.memberRecords().get(bo)!.okOwed;
    for (const id of ['ending', 'bar', 'quorum', 'authorship',
      'judgments', 'chamber', 'lapse', 'applications', 'rate', 'machines']) {
      expect(owed.has(id as never), id).toBe(false);
    }
    expect(owed.size).toBe(0);
    // …and a constitutional setting changed after they arrived still is
    s.setSetting(4, 'chamber', { rung: 'public' });
    expect(s.memberRecords().get(bo)!.okOwed.has('chamber')).toBe(true);
  });
});

describe('📯 is reachable (§9.7 v0.51)', () => {
  it('delegate the ordinary defaults, resolve by ceremony, then delegate title and link', () => {
    const s = openDelegated();
    s.delegate(0, 'rate');
    s.delegate(0, 'machines');
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.confirmStartingText(1, 'x');
    const answers = {
      ending: { endsAtMs: 1_000_000 }, bar: { pct: 66 },
      quorum: { form: 'share', n: 60 },
      authorship: { rung: 'sealed' },
      judgments: { rung: 'after' }, chamber: { rung: 'link' },
      applications: { holder: 'members', apply: false },
      membership: { price: 'assembly' },
      removal: { price: 'consent' }, // delegated too, so the room must answer it (Q626)
      lapse: { afterMs: null }, rate: { grant: 4, cap: 8, dripMinutes: 240 },
      machines: { enabled: false, budget: 0 },
    } as const;
    for (const [id, v] of Object.entries(answers)) {
      s.answer(2, 'ada', id as never, v as never);
      s.answer(2, bo, id as never, v as never);
    }
    s.begin(2); // 🍾
    expect(s.constitutedAtT).toBe(2); // every gate resolved by the room
    expect(s.crowned()).toBe(true);   // title and link are still ada's
    s.delegate(3, 'title');
    s.delegate(3, 'link');
    s.delegate(3, 'pace');  // the founder's by default since Q415
    s.delegate(3, 'startingText'); // the Text is held like anything else (Q440)
    expect(s.crowned()).toBe(true);   // the doors are still ada's (entry 94)
    s.delegate(3, 'door:invite');
    s.delegate(3, 'door:remove');
    expect(s.crowned()).toBe(false);  // 📯 — a name in the record
  });
});

describe('constituted (§9.6a): the moment judging opens', () => {
  it('fires when the seven gates settle, and the pre-start rights die with it', () => {
    const s = openDelegated();
    s.confirmStartingText(1, 'x');
    settleAllReserved(s, 1, ['applications']);
    // a delegated question on any setting blocks the start, gate or not (Q626)
    expect(() => s.begin(1)).toThrow(/'applications' is still being decided/);
    s.reclaim(1, 'applications');
    s.setSetting(1, 'applications', { holder: 'members', apply: false });
    s.begin(1); // 🍾 (Q443): nothing starts until the founder says so
    expect(s.constitutedAtT).toBe(1);
    expect(s.canJudge()).toBe(true);
    // v0.52: delegation survives the start as the hand-over — what dies
    // with the founding is the free reclaim, not the giving
    s.delegate(2, 'bar');
    expect(s.settingState('bar').holder).toBe('members');
    expect(() => s.reclaim(2, 'bar')).toThrow(/pre-start/);
    expect(() => s.uninvite(2, 'ada')).toThrow(/pre-start/);
    expect(() => s.invite(2, 'new@example.org')).toThrow(/motion at 🪪/);
    expect(() => s.confirmStartingText(2, 'x')).toThrow(/proposing in the document/);
  });

  // **The invite door, post-start** (Q817, backlog 51 — Ed, on genesis: *I
  // managed to invite one additional member … and further ones don't work*).
  // `invite`'s post-start refusal had exactly one test, and it was the
  // delegated case above (`:344`); the state that actually bit was the one
  // in between — a founder who laid the pen down at 🍾 (R-048) and kept the
  // 🛡️. The door was drawn on `membershipReserved()`, which counted either
  // power, and refused by the narrow test, which counts only the pen. So the
  // three states are asserted together: the two gates must agree in all of
  // them, since that agreement is the whole of the fix. Since entry 94 the
  // pair is ✉️'s own — `door:invite` — not 🤝's.
  const registerAt = (lay: 'nothing' | 'pen' | 'both') => {
    const s = openDelegated();
    s.confirmStartingText(1, 'x');
    settleAllReserved(s, 1, ['applications']);
    s.reclaim(1, 'applications');
    s.setSetting(1, 'applications', { apply: false });
    if (lay !== 'nothing') s.relinquish(1, 'door:invite', 'unilateral');
    s.begin(1); // 🍾 spends the pending release
    if (lay === 'both') s.relinquish(2, 'door:invite', 'assent');
    return s;
  };

  it('the pen invites directly; the shield alone does not, and says so', () => {
    const kept = registerAt('nothing');
    expect(kept.doorPowers('door:invite')).toEqual({ unilateral: true, assent: true });
    expect(kept.doorPen('door:invite')).toBe(true);
    expect(() => kept.invite(2, 'bo@example.org')).not.toThrow();
    expect(() => kept.invite(2, 'cy@example.org')).not.toThrow(); // and again

    // the pen laid down at Begin, the veto kept: the door is shut, and
    // `doorPen` — what the surface draws it on — says so
    const shield = registerAt('pen');
    expect(shield.doorPowers('door:invite')).toEqual({ unilateral: false, assent: true });
    expect(shield.doorPen('door:invite')).toBe(false);
    expect(() => shield.invite(2, 'bo@example.org')).toThrow(/motion at 🪪/);

    const none = registerAt('both');
    expect(none.doorPen('door:invite')).toBe(false);
    expect(() => none.invite(2, 'bo@example.org')).toThrow(/motion at 🪪/);
  });

  it('a ceremony resolves it when the last gate question completes', () => {
    const s = openDelegated();
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.confirmStartingText(1, 'x');
    settleAllReserved(s, 2, ['bar']);
    expect(s.constitutedAtT).toBeNull();
    expect(() => s.begin(2)).toThrow(/'bar' is still being decided/); // 🍾 waits on the gates
    s.answer(3, 'ada', 'bar', { pct: 66 });
    s.answer(4, bo, 'bar', { pct: 78 });
    expect(s.settingState('bar').value).toEqual({ pct: 78 });
    expect(s.constitutedAtT).toBeNull(); // resolved, not begun
    s.begin(4);
    expect(s.constitutedAtT).toBe(4);
  });

  it('post-start the convenor direct-changes reserved settings (§9.7, Ed 366)', () => {
    const s = openDelegated();
    s.confirmStartingText(1, 'x');
    settleAllReserved(s, 1);
    s.begin(1);
    s.setSetting(2, 'chamber', { rung: 'closed' }); // reserved: the crown rule
    expect(s.settingState('chamber').settledBy).toBe('crown');
  });

  it('the ramp anchors at constituted and rises to the close bar (§4.3)', () => {
    const s = openDelegated();
    s.confirmStartingText(10, 'x');
    settleAllReserved(s, 10); // ramp 55 → 78 over [10, 1_000_000]
    s.begin(10);
    expect(s.bar(10)).toBeCloseTo(55, 5);
    expect(s.bar(1_000_000)).toBeCloseTo(78, 5);
    const mid = s.bar(500_005)!;
    expect(mid).toBeGreaterThan(55);
    expect(mid).toBeLessThan(78);
  });
});

describe('proposing is yours (§9.0b)', () => {
  it('needs the confirmed text and your own answers, not the room’s', () => {
    const s = openDelegated();
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
    const s = openDelegated();
    s.confirmStartingText(1, '');
    expect(s.textConfirmed).toBe(true);
    expect(s.text).toBe('');
  });

  it('🍾 waits on the confirmed text, and an empty one is enough (§9.0b)', () => {
    const s = openDelegated();
    settleAllReserved(s, 2, []);            // every question answered, text unconfirmed
    expect(s.readiness().waiting).toEqual(['startingText']);
    expect(s.readiness().holds).toEqual([{ setting: 'startingText', why: 'text-unconfirmed' }]);
    expect(() => s.begin(3)).toThrow(/startingText/);
    expect(s.constitutedAtT).toBeNull();
    s.confirmStartingText(4, '');
    expect(s.readiness().waiting).toEqual([]);
    s.begin(5);
    expect(s.constitutedAtT).toBe(5);
  });

  /**
   * **The readout says *why*, not just *which*** (Q826). The four reasons want
   * four different acts of the founder, and `one-voice` is the only one no
   * amount of answering will clear — so the surface cannot word the remedy
   * from a bare id. Checked as the same question moving through three of them.
   */
  it('readiness names why each question is waiting (Q826)', () => {
    const s = openDoc();                          // the founder alone, a member
    s.delegate(0, 'bar');
    const whyOf = (id: string) =>
      (s.readiness().holds.find((h) => h.setting === id) || { why: null }).why;
    // handed to a membership of one: the remedy is a second member or taking
    // it back, and neither is anywhere in the bare id
    expect(whyOf('bar')).toBe('one-voice');
    // an invitation in flight stops the resolution before the electorate is
    // counted, and it is already the remedy — so it is the reason given
    const bo = s.invite(1, 'bo@example.org');
    expect(whyOf('bar')).toBe('invitation-open');
    s.arrive(2, bo);
    expect(whyOf('bar')).toBe('collecting');
    // a judge-gate nobody was asked about is waiting for the founder's own hand
    expect(whyOf('quorum')).toBe('judge-gate');
    // and the ids stay exactly what they were: `begin`'s refusal reads them
    expect(s.readiness().waiting).toEqual(s.readiness().holds.map((h) => h.setting));
  });

  it('a delegated question with a membership of one never resolves (Q826)', () => {
    const s = openDoc();
    s.setSetting(0, 'ending', { endsAtMs: 1_000_000 });   // 🌡️ waits on ⏰ (§9.0a)
    s.delegate(0, 'bar');
    s.answer(1, 'ada', 'bar', { pct: 60 });
    expect(s.settingState('bar').settledBy).toBeNull();
    expect(s.readiness().holds.some((h) => h.why === 'one-voice')).toBe(true);
    // …and taking it back is the other half of the remedy the reason names
    s.reclaim(2, 'bar');
    s.setSetting(2, 'bar', { pct: 60 });
    expect(s.readiness().holds.some((h) => h.setting === 'bar')).toBe(false);
  });
});

describe('replay (SPEC §11)', () => {
  it('re-folds bit-identically and re-verifies the chain', () => {
    const s = openDelegated();
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
    const s = openDelegated();
    s.invite(1, 'bo@example.org');
    const log = s.logEntries().map((e) => ({ ...e, event: { ...e.event } }));
    (log[1]!.event as { t: number }).t = 99;
    expect(() => ConstitutionSession.replay(log as never)).toThrow(/seq 1/);
  });

  it('members verify their own moves were counted (receipts)', () => {
    const s = openDelegated();
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
