import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { view } from '../src/view.js';
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
  'judgments', 'chamber', 'lapse', 'removal', 'admission', 'applications'] as const;
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
    admission: { price: 'assembly' },
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
      admission: { price: 'assembly' },
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
   * **The readout says *why*, not just *which*** (Q826). The five reasons want
   * five different acts of the founder, and `one-voice` is the only one no
   * amount of answering will clear — so the surface cannot word the remedy
   * from a bare id. Checked as the same question moving through four of them.
   *
   * **`deps-unsettled` comes first, and names what it waits on** (entry 69):
   * 🌡️ is served only once ⏰ stands (§9.0a), so a 🌡️ handed over under an
   * undecided ⏰ is not held up by the room of one — a second member could not
   * answer it either — and the readout must not send the founder to the door
   * for it. It is the deps loop's own place in `maybeResolve`: first.
   */
  it('readiness names why each question is waiting (Q826, entry 69)', () => {
    const s = openDoc();                          // the founder alone, a member
    s.delegate(0, 'ending');
    s.delegate(0, 'bar');
    const holdOf = (id: string) => s.readiness().holds.find((h) => h.setting === id);
    const whyOf = (id: string) => (holdOf(id) || { why: null }).why;
    // 🌡️ waits on ⏰ before it waits on anybody, and the dependency is named
    expect(whyOf('bar')).toBe('deps-unsettled');
    expect(holdOf('bar')!.on).toEqual(['ending']);
    // …while ⏰ itself, depending on nothing, is the one handed to a membership
    // of one: the remedy is a second member or taking it back, and neither is
    // anywhere in the bare id
    expect(whyOf('ending')).toBe('one-voice');
    expect(holdOf('ending')!.on).toBeUndefined();
    // and once the dependency stands, 🌡️ falls through to the next rung
    s.reclaim(1, 'ending');
    s.setSetting(1, 'ending', { endsAtMs: 1_000_000 });
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
    // ⏰ set first is what keeps 🌡️ off the `deps-unsettled` rung (entry 69) —
    // this case is about the one-voice rung below it (§9.0a)
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

/**
 * **A founding question's electorate is E minus abstainers** (§9.0a,
 * → why: R-015, R-049; Ed 2026-08-25, closing Q647 as (b) against the
 * recommendation, as a change to the consent rule and not a bug fix).
 *
 * The defect it settles: two counts of one electorate disagreed. The founding
 * card has always shown *n of E have answered* over `motionElectorate()` — E
 * minus abstainers — while the resolver waited on the whole of E, so a member
 * who signed out **abstaining** left the line everybody watches and stayed in
 * the set the resolver waited on. The room saw a question that read complete
 * and could never settle, with no surface naming who was holding it up.
 *
 * What is fixed and asserted below: abstainers leave, **holders stay** (§9.5),
 * an abstention completes the question at the act rather than at the next
 * unrelated answer, *never on one voice* is read against the smaller set, and
 * an abstainer's own answer is still recorded and simply not counted (Q648).
 */
describe('a founding question\'s electorate drops abstainers (R-049)', () => {
  /** ada (the founder, a member) plus two arrived invitees. */
  const room = () => {
    const s = openDelegated();
    const bo = s.invite(1, 'bo@example.org');
    const cy = s.invite(1, 'cy@example.org');
    s.arrive(1, bo);
    s.arrive(1, cy);
    return { s, bo, cy };
  };

  const eventsOf = <K extends ConstitutionEvent['type']>(s: ConstitutionSession, type: K) =>
    s.logEntries().map((e) => e.event)
      .filter((e): e is Extract<ConstitutionEvent, { type: K }> => e.type === type);

  it('an abstention completes the question at the act, on the smaller set', () => {
    const { s, bo, cy } = room();
    s.answer(2, 'ada', 'ending', { endsAtMs: 500_000 });
    s.answer(2, bo, 'ending', { endsAtMs: 400_000 });
    expect(s.settingState('ending').collecting).toBe(true);   // cy still owes
    s.signOut(3, cy, 'abstaining');
    expect(s.settingState('ending').collecting).toBe(false);
    expect(s.settingState('ending').settledBy).toBe('ceremony');
    expect(s.settingState('ending').value).toEqual({ endsAtMs: 500_000 });
    const resolved = eventsOf(s, 'question-resolved').filter((e) => e.setting === 'ending');
    expect(resolved.length).toBe(1);
    expect(resolved[0]!.t).toBe(3);                           // on the sign-out
    expect(resolved[0]!.electorate).toEqual(['ada', bo].sort());
    // and nobody is told their ground moved: the roster has not changed and
    // the abstainer is still a member (decision 2 of the plan, R-049)
    expect(eventsOf(s, 'ceremony-ground-shifted').length).toBe(0);
    // the log still replays to itself
    expect(ConstitutionSession.replay([...s.logEntries()]).rollingHash()).toBe(s.rollingHash());
  });

  it('signing out **holding** leaves the question collecting (§9.5)', () => {
    const { s, bo, cy } = room();
    s.answer(2, 'ada', 'ending', { endsAtMs: 500_000 });
    s.answer(2, bo, 'ending', { endsAtMs: 400_000 });
    s.signOut(3, cy, 'holding');
    expect(s.settingState('ending').collecting).toBe(true);
    expect(s.settingState('ending').value).toBeNull();
    expect(s.motionElectorate()).toContain(cy);
    // and the holder's own answer still completes it
    s.answer(4, cy, 'ending', { endsAtMs: 900_000 });
    expect(s.settingState('ending').value).toEqual({ endsAtMs: 900_000 });
  });

  it('a room of two where one abstains never resolves on the survivor', () => {
    const s = openDelegated();
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.answer(2, 'ada', 'ending', { endsAtMs: 500_000 });
    s.signOut(3, bo, 'abstaining');
    expect(s.motionElectorate()).toEqual(['ada']);
    expect(s.settingState('ending').collecting).toBe(true);
    expect(s.settingState('ending').value).toBeNull();
    // …and the readout says *why*, on the same set the resolver refused on
    // (Q826: a readout saying which and not why leaves the founder guessing)
    expect(s.readiness().holds.find((h) => h.setting === 'ending')!.why).toBe('one-voice');
  });

  it('an abstainer\'s answer is recorded and not counted, and both readouts agree', () => {
    const { s, bo, cy } = room();
    s.answer(2, cy, 'ending', { endsAtMs: 100_000 });
    s.signOut(3, cy, 'abstaining');
    s.answer(4, 'ada', 'ending', { endsAtMs: 500_000 });      // bo has not said
    expect(s.settingState('ending').collecting).toBe(true);
    expect(s.motionElectorate()).toEqual(['ada', bo]);         // cy is out of it
    expect(s.settingState('ending').answers.size).toBe(2);    // recorded (decision 5)
    const q = s.readiness().questions.find((x) => x.setting === 'ending')!;
    expect(q).toEqual({ setting: 'ending', settled: false, collecting: true,
      answered: 1, electorate: 2 });
    // the entry exists for this pair of lines: one electorate, two readers
    const seen = view(s, 'ada').questions.find((x) => x.setting === 'ending')!;
    expect(seen.answeredCount).toBe(q.answered);
    expect(seen.electorateSize).toBe(q.electorate);
    // the abstainer is still served their own answer, which is what makes the
    // asymmetry visible to exactly one person (decision 5)
    expect(view(s, cy).questions.find((x) => x.setting === 'ending')!.myAnswer)
      .toEqual({ endsAtMs: 100_000 });
  });

  it('lists the abstainer among the members, owing nothing', () => {
    const { s, bo, cy } = room();
    s.answer(2, cy, 'ending', { endsAtMs: 100_000 });
    s.signOut(3, cy, 'abstaining');
    s.answer(4, 'ada', 'ending', { endsAtMs: 500_000 });
    const rows = s.readiness().members;
    expect(rows.map((r) => r.id)).toEqual(['ada', bo, cy]);
    expect(rows.find((r) => r.id === cy)).toEqual(
      { id: cy, name: null, arrived: true, owed: 0, answered: 0 });
    const ada = rows.find((r) => r.id === 'ada')!;
    expect(ada.owed).toBeGreaterThan(0);
    expect(ada.answered).toBe(1);
    expect(rows.find((r) => r.id === bo)!.owed).toBe(ada.owed);
  });
});
