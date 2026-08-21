import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import type { ConstitutionEvent } from '../src/types.js';
import { buildConstituted } from './helpers.js';

/**
 * Motions (SPEC §9.6–§9.7, v0.49): the ordinary route through the
 * adjudicator seam, the constitutional route's live-electorate unanimity
 * with the mover standing at accept from the open, the one-🏛️-each limit,
 * and the crown's assent at the end of either route.
 */

/** A constituted three-member document: ada (convenor), bo, cy. */
const constituted = (opts: { reserveRate?: boolean } = {}) => {
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter',
    slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);
  const bo = s.invite(1, 'bo@example.org');
  const cy = s.invite(1, 'cy@example.org');
  s.arrive(1, bo);
  s.arrive(1, cy);
  // ending, bar and chamber resolve by ceremony, so they are members-held —
  // motions on them apply directly, with no crown in the way (§9.7 v0.49)
  s.answer(1, 'ada', 'ending', { endsAtMs: 500_000 });
  s.answer(1, bo, 'ending', { endsAtMs: 1_000_000 });
  s.answer(1, cy, 'ending', { endsAtMs: 800_000 }); // resolved — bar may follow
  s.answer(1, 'ada', 'bar', { pct: 66 });
  s.answer(1, bo, 'bar', { pct: 60 });
  s.answer(1, cy, 'bar', { pct: 55 });
  s.answer(1, 'ada', 'chamber', { rung: 'link' });
  s.answer(1, bo, 'chamber', { rung: 'public' });
  s.answer(1, cy, 'chamber', { rung: 'public' });
  const values = {
    pace: { shape: 'fixed' },
    quorum: { form: 'share', n: 60 },
    authorship: { rung: 'sealed' },
    signing: { rung: 'each' },
    judgments: { rung: 'after' },
    applications: { holder: 'members', joinPolicy: 'invite' },
    machines: { enabled: false, budget: 0 },
    lapse: { afterMs: null },
  } as const;
  // text and rate first: the last gate set below constitutes the document
  s.confirmStartingText(2, 'The clubhouse shall be kept open.');
  s.setSetting(2, 'rate', { grant: 4, cap: 8, dripMinutes: 240 });
  for (const [id, v] of Object.entries(values)) {
    s.reclaim(2, id as never);
    s.setSetting(2, id as never, v as never);
  }
  void opts;
  expect(s.constitutedAtT).toBe(2);
  return { s, bo, cy };
};

describe('the gate (§9.6a): before the start nothing is amended', () => {
  it('refuses motions before the document is constituted', () => {
    const s = ConstitutionSession.open({
      title: 'T', slug: 't',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    expect(() => s.openMotion(1, 'ada', {
      kind: 'set', setting: 'title', value: { text: 'X' },
    })).toThrow(/only set/);
  });
});

describe('the ordinary route: a race, through the adjudicator seam', () => {
  it('stakes 1, applies on carried, files on held (member-held setting)', () => {
    const { s, bo } = constituted();
    // moving the close is ordinary (Q329), and ending is the members' here
    const m1 = s.openMotion(3, bo, { kind: 'set', setting: 'ending',
      value: { endsAtMs: 2_000_000 } });
    const rec = s.motionRecords().get(m1)!;
    expect(rec.route).toBe('ordinary');
    expect(rec.stake).toBe(1);
    s.adjudicateOrdinaryMotion(4, m1, 'carried');
    expect(s.settingState('ending').value).toEqual({ endsAtMs: 2_000_000 });
    expect(s.settingState('ending').settledBy).toBe('motion');
    expect(s.bar(5)).toBe(66); // fixed shape: postponement moves nothing

    const m2 = s.openMotion(5, bo, { kind: 'set', setting: 'ending',
      value: { endsAtMs: 3_000_000 } });
    s.adjudicateOrdinaryMotion(6, m2, 'held');
    expect(s.settingState('ending').value).toEqual({ endsAtMs: 2_000_000 });
    expect(s.motionRecords().get(m2)!.status).toBe('held');
  });

  it('a constitutional motion refuses the seam, an ordinary one refuses answers', () => {
    const { s, bo, cy } = constituted();
    const c = s.openMotion(3, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    expect(() => s.adjudicateOrdinaryMotion(4, c, 'carried')).toThrow(/unanimity/);
    const o = s.openMotion(4, cy, { kind: 'set', setting: 'link',
      value: { slug: 'oak' } });
    expect(() => s.answerMotion(5, cy, o, 'accept')).toThrow(/judged as a race/);
  });

  it('a carried motion on a reserved setting waits for the crown instead of applying', () => {
    const { s, bo } = constituted(); // the title is reserved (convenor-held)
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'title',
      value: { text: 'The Hollow Oak Charter' } });
    s.adjudicateOrdinaryMotion(4, m, 'carried');
    expect(s.motionRecords().get(m)!.status).toBe('awaiting-crown');
    expect(s.titleOf).toBe('Hollow Oak Club Charter'); // assent still owed (§9.7)
  });
});

describe('the constitutional route (v0.48): unanimity over the live electorate', () => {
  it('carries the moment everyone stands at accept-or-abstain with zero keep', () => {
    const { s, bo, cy } = constituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    expect(s.motionRecords().get(m)!.stake).toBe(0); // consent stays free
    // the mover stands at accept from the open (§9.6 v0.49)
    expect(s.motionRecords().get(m)!.answers.get(bo)).toBe('accept');
    s.answerMotion(4, 'ada', m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('running'); // cy still owes
    s.answerMotion(6, cy, m, 'abstain'); // abstention is an answer, not a block
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.settingState('bar').value).toEqual({ pct: 80 });
    expect(s.settingState('bar').settledBy).toBe('motion');
  });

  it('a standing keep blocks but does not kill; revision can complete it', () => {
    const { s, bo, cy } = constituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'chamber',
      value: { rung: 'closed' } });
    s.answerMotion(4, 'ada', m, 'accept');
    s.answerMotion(5, bo, m, 'accept');
    s.answerMotion(6, cy, m, 'keep');
    expect(s.motionRecords().get(m)!.status).toBe('running'); // blocked, alive
    expect(s.settingState('chamber').value).toEqual({ rung: 'link' }); // what stands stands
    s.answerMotion(7, cy, m, 'accept'); // answers are revisable until it settles
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.settingState('chamber').value).toEqual({ rung: 'closed' });
  });

  it('pure abstention carries nothing — even the mover may stand down to it', () => {
    const { s, bo, cy } = constituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    s.answerMotion(4, 'ada', m, 'abstain');
    s.answerMotion(5, bo, m, 'abstain'); // revises the open's own accept
    s.answerMotion(6, cy, m, 'abstain');
    expect(s.motionRecords().get(m)!.status).toBe('running');
  });

  it('one 🏛️ out per member at a time, returned whole on withdrawal', () => {
    const { s, bo } = constituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    expect(() => s.openMotion(4, bo, { kind: 'set', setting: 'quorum',
      value: { form: 'share', n: 80 } })).toThrow(/one 🏛️/);
    s.withdrawMotion(5, bo, m);
    s.openMotion(6, bo, { kind: 'set', setting: 'quorum',
      value: { form: 'share', n: 80 } }); // the 🏛️ came back whole
  });

  it('an arrival mid-motion means their answer is now needed too', () => {
    const s = ConstitutionSession.open({
      title: 'T', slug: 't',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.answer(1, 'ada', 'ending', { endsAtMs: 1_000_000 });
    s.answer(1, bo, 'ending', { endsAtMs: 800_000 }); // resolved — bar may follow
    s.answer(1, 'ada', 'bar', { pct: 66 });
    s.answer(1, bo, 'bar', { pct: 60 }); // resolves members-held: no crown in the way
    const values = {
      pace: { shape: 'fixed' },
      quorum: { form: 'share', n: 60 }, authorship: { rung: 'sealed' },
      signing: { rung: 'each' }, judgments: { rung: 'after' },
      chamber: { rung: 'link' },
      applications: { holder: 'reserved-unilateral', joinPolicy: 'invite' },
      machines: { enabled: false, budget: 0 }, lapse: { afterMs: null },
    } as const;
    for (const [id, v] of Object.entries(values)) {
      s.reclaim(2, id as never);
      s.setSetting(2, id as never, v as never);
    }
    // Q413(b): a blind question does not resolve while an invitation is
    // outstanding, so the third member is invited *after* the start
    const dee = s.invite(3, 'dee@example.org');
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    s.arrive(4, dee); // the electorate grew under the motion — no snapshot
    s.answerMotion(5, 'ada', m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('running'); // dee's answer needed
    s.answerMotion(6, dee, m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
  });

  it('a departure can complete a motion — the removal cascade settles both', () => {
    const { s, bo, cy } = constituted();
    const m1 = s.openMotion(3, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    s.answerMotion(4, 'ada', m1, 'accept');
    s.answerMotion(5, bo, m1, 'accept'); // cy never answers m1
    const m2 = s.openMotion(6, cy, { kind: 'remove', member: cy }); // cy asks to go —
    // and the open is cy's own accept (v0.49), which removal requires anyway
    expect(s.motionRecords().get(m2)!.route).toBe('constitutional');
    s.answerMotion(7, 'ada', m2, 'accept');
    expect(s.motionRecords().get(m2)!.status).toBe('running'); // bo still owes
    s.answerMotion(8, bo, m2, 'accept');
    expect(s.motionRecords().get(m2)!.status).toBe('carried');
    expect(s.E()).toBe(2);
    // and m1, no longer waiting on cy, settled in the same beat
    expect(s.motionRecords().get(m1)!.status).toBe('carried');
    expect(s.settingState('bar').value).toEqual({ pct: 80 });
  });

  it('a removal the member refuses stays blocked — expulsion is effectively impossible', () => {
    const { s, bo, cy } = constituted();
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    s.answerMotion(4, 'ada', m, 'accept');
    s.answerMotion(5, bo, m, 'accept');
    s.answerMotion(6, cy, m, 'keep');
    expect(s.motionRecords().get(m)!.status).toBe('running');
    expect(s.E()).toBe(3);
  });

  it('a blank rationale is a real proposal (v0.57) — the lane is offered, never demanded', () => {
    const { s, bo } = constituted();
    const m = s.openMotion(3, bo, { kind: 'invite', email: 'dee@example.org' });
    expect(s.motionRecords().get(m)!.status).toBe('running');
    expect(s.motionRecords().get(m)!.why).toBeNull();
  });

  it('an invitation is a constitutional motion; the invitee still counts toward nothing', () => {
    const { s, bo, cy } = constituted();
    const m = s.openMotion(3, bo, { kind: 'invite', email: 'dee@example.org' }, 'dee kept our minutes for a year');
    s.answerMotion(4, 'ada', m, 'accept');
    s.answerMotion(5, bo, m, 'accept');
    s.answerMotion(6, cy, m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    const invited = s.logEntries().map((e) => e.event)
      .filter((e): e is Extract<ConstitutionEvent, { type: 'member-invited' }> =>
        e.type === 'member-invited');
    expect(invited.at(-1)!.viaMotion).toBe(m);
    expect(s.E()).toBe(3); // not arrived yet
    s.arrive(7, invited.at(-1)!.member);
    expect(s.E()).toBe(4);
  });

  it('the ending route splits inside the setting (Q329): never is constitutional', () => {
    const { s, bo } = constituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'ending',
      value: { endsAtMs: null } });
    expect(s.motionRecords().get(m)!.route).toBe('constitutional');
  });

  it('those outside the electorate are owed the decision they had no say in', () => {
    const { s, bo, cy } = constituted();
    // dee invited by motion, arrives after a later amendment carries
    const inv = s.openMotion(3, bo, { kind: 'invite', email: 'dee@example.org' }, 'dee kept our minutes for a year');
    for (const [t, who] of [[4, 'ada'], [5, bo], [6, cy]] as const) {
      s.answerMotion(t, who, inv, 'accept');
    }
    const dee = [...s.memberRecords().keys()].find((id) => id.startsWith('m-') &&
      s.memberRecords().get(id)!.email === 'dee@example.org')!;
    const m = s.openMotion(7, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    for (const [t, who] of [[8, 'ada'], [9, bo], [10, cy]] as const) {
      s.answerMotion(t, who, m, 'accept');
    }
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    s.arrive(11, dee);
    expect(s.memberRecords().get(dee)!.okOwed.has('bar')).toBe(true);
  });
});

describe('the crown (§9.7 v0.49): reserved is assent, at the end of either route', () => {
  it('unanimity on a reserved setting carries the change to the crown, not into the document', () => {
    const { s, bo, cy } = constituted(); // quorum is reserved (convenor-held)
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'quorum',
      value: { form: 'share', n: 80 } });
    expect(s.motionRecords().get(m)!.route).toBe('constitutional');
    s.answerMotion(4, 'ada', m, 'accept');
    s.answerMotion(5, cy, m, 'accept'); // bo stood at accept from the open
    expect(s.motionRecords().get(m)!.status).toBe('awaiting-crown');
    expect(s.settingState('quorum').value).toEqual({ form: 'share', n: 60 });
    // the 🏛️ stays out while the crown considers
    expect(() => s.openMotion(6, bo, { kind: 'set', setting: 'signing',
      value: { rung: 'nobody' } })).toThrow(/one 🏛️/);
    const q = [...s.crownQuestionRecords().values()].find((x) => x.motion === m)!;
    s.answerCrownQuestion(7, q.id, 'accept');
    expect(s.settingState('quorum').value).toEqual({ form: 'share', n: 80 });
    expect(s.settingState('quorum').settledBy).toBe('crown');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    // and the carry itself owed nobody an OK — everyone had their say
    // (the fixture's pre-start reserved set owed its own, hence t >= 3)
    const owes = s.logEntries().filter((e) => e.event.type === 'ok-owed' &&
      e.event.t >= 3 &&
      (e.event as unknown as { settings: string[] }).settings.includes('quorum'));
    expect(owes.length).toBe(0);
  });

  it('an ordinary motion on a reserved setting ends at a 👑 question', () => {
    const { s, bo } = constituted(); // rate is reserved (convenor-held)
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'rate',
      value: { grant: 6, cap: 10, dripMinutes: 120 } });
    expect(s.motionRecords().get(m)!.route).toBe('ordinary');
    s.adjudicateOrdinaryMotion(4, m, 'carried');
    expect(s.motionRecords().get(m)!.status).toBe('awaiting-crown');
    expect(s.settingState('rate').value).toEqual({ grant: 4, cap: 8, dripMinutes: 240 });
    const q = [...s.crownQuestionRecords().values()].find((x) => x.motion === m)!;
    s.answerCrownQuestion(5, q.id, 'accept');
    expect(s.settingState('rate').value).toEqual({ grant: 6, cap: 10, dripMinutes: 120 });
    expect(s.settingState('rate').settledBy).toBe('crown');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
  });

  it('rejection files the passed change on the record', () => {
    const { s, bo } = constituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'rate',
      value: { grant: 6, cap: 10, dripMinutes: 120 } });
    s.adjudicateOrdinaryMotion(4, m, 'carried');
    const q = [...s.crownQuestionRecords().values()].find((x) => x.motion === m)!;
    s.answerCrownQuestion(5, q.id, 'reject');
    expect(s.crownQuestionRecords().get(q.id)!.status).toBe('rejected');
    expect(s.motionRecords().get(m)!.status).toBe('held');
    expect(s.settingState('rate').value).toEqual({ grant: 4, cap: 8, dripMinutes: 240 });
  });
});

describe('delegation past the start, and the road back (§9.7 v0.52)', () => {
  it('the founder hands the title over; their direct hand dies with it; motions land at the bar', () => {
    const raw = ConstitutionSession.open({ title: 'T', slug: 't',
      convenor: { id: 'ada', email: 'a@x.org', isMember: true } }, 0);
    expect(() => raw.delegate(1, 'title')).toThrow(/starting text/);
    const { s, bo } = constituted();
    s.delegate(3, 'rate'); // v0.52: anything the founder holds, not just title/link
    expect(s.settingState('rate').holder).toBe('members');
    s.delegate(3, 'title');
    expect(s.settingState('title').holder).toBe('members');
    expect(s.crowned()).toBe(true); // the link is still ada's
    expect(() => s.setSetting(4, 'title', { text: 'X' })).toThrow(/the members'/);
    const m = s.openMotion(5, bo, { kind: 'set', setting: 'title',
      value: { text: 'The Hollow Oak Charter' } });
    expect(s.motionRecords().get(m)!.route).toBe('ordinary');
    s.adjudicateOrdinaryMotion(6, m, 'carried');
    expect(s.motionRecords().get(m)!.status).toBe('carried'); // no 👑 in the way
    expect(s.titleOf).toBe('The Hollow Oak Charter');
  });

  it('re-reserving takes a constitutional motion, and lands without the founder’s assent', () => {
    const { s, bo, cy } = constituted();
    s.delegate(3, 'link');
    expect(() => s.openMotion(4, bo, { kind: 'reserve', setting: 'title' }))
      .toThrow(/already the convenor/);
    // Q440 + 🍾: the start laid both powers on the Text down, so the Text is
    // exactly what a reserve motion can give back — and it lands like any other
    const mt = s.openMotion(4, cy, { kind: 'reserve', setting: 'startingText', power: 'assent' });
    expect(s.motionRecords().get(mt)!.route).toBe('constitutional');
    s.answerMotion(4, 'ada', mt, 'accept');
    s.answerMotion(4, bo, mt, 'accept');
    expect(s.settingState('startingText').powers).toEqual({ unilateral: false, assent: true });
    expect(() => s.openMotion(4, bo, { kind: 'reserve', setting: 'displayName' }))
      .toThrow(/never held/);
    const m = s.openMotion(4, bo, { kind: 'reserve', setting: 'link' });
    expect(s.motionRecords().get(m)!.route).toBe('constitutional');
    s.answerMotion(5, 'ada', m, 'accept');
    s.answerMotion(6, cy, m, 'accept'); // bo stood at accept from the open
    // no assent step: the release from an unwanted crown is delegation,
    // which stays the founder's own free act — so a lapsed founder can be
    // crowned too (Ed: a constitutional monarchy)
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.settingState('link').holder).toBe('convenor');
  });
});

describe('guards', () => {
  it('refuses no-ops, unsettled targets and personal settings', () => {
    const { s, bo } = constituted();
    expect(() => s.openMotion(3, bo, { kind: 'set', setting: 'bar',
      value: { pct: 66 } })).toThrow(/already stands/);
    expect(() => s.openMotion(3, bo, { kind: 'set', setting: 'displayName',
      value: { text: 'Bo' } })).toThrow(/yours alone/);
    expect(() => s.openMotion(3, bo, { kind: 'set', setting: 'startingText',
      value: { text: 'x' } })).toThrow(/not moved this way/);
  });

  it('replay reproduces a full motion walk bit-identically', () => {
    const { s, bo, cy } = constituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    s.answerMotion(4, 'ada', m, 'accept');
    s.answerMotion(5, bo, m, 'accept');
    s.answerMotion(6, cy, m, 'keep');
    s.answerMotion(7, cy, m, 'accept');
    const r = ConstitutionSession.replay([...s.logEntries()]);
    expect(r.rollingHash()).toBe(s.rollingHash());
    expect(r.settingState('bar').value).toEqual({ pct: 80 });
    expect(r.motionRecords().get(m)!.status).toBe('carried');
  });
});

describe('the 🚪 removal setting (Q401a, v0.60): three rungs, one new decision class', () => {
  it("'everyone' is today's rule — the default when nothing was set", () => {
    const { s, bo, cy } = buildConstituted(); // helpers set removal: everyone
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    expect(s.motionRecords().get(m)!.route).toBe('constitutional');
    s.answerMotion(4, 'ada', m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('running'); // cy's own answer is owed
    s.answerMotion(5, cy, m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
  });

  it("'others': unanimity minus the subject — they see it, cannot answer, and it settles without them", () => {
    const { s, bo, cy } = buildConstituted({ removal: { rung: 'others' } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    expect(s.motionRecords().get(m)!.route).toBe('constitutional');
    expect(() => s.answerMotion(4, cy, m, 'keep')).toThrow(/not asked on this route/);
    expect(s.motionRecords().get(m)!.status).toBe('running'); // ada still owes
    s.answerMotion(5, 'ada', m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.E()).toBe(2);
  });

  it("'ordinary': a removal races at the bar through the adjudicator seam, staking the ✏️", () => {
    const { s, bo, cy } = buildConstituted({ removal: { rung: 'ordinary' } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    const rec = s.motionRecords().get(m)!;
    expect(rec.route).toBe('ordinary');
    expect(rec.stake).toBe(1);
    s.adjudicateOrdinaryMotion(4, m, 'carried');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.E()).toBe(2);
  });

  it('a rung change mid-motion is a ground shift — the electorate is read live', () => {
    const { s, bo, cy } = buildConstituted({ removal: { rung: 'others' } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    expect(() => s.answerMotion(4, cy, m, 'keep')).toThrow(); // outside, for now
    // the room hands removal back to unanimity-including: cy's answer is owed
    const m2 = s.openMotion(5, 'ada', { kind: 'set', setting: 'removal', value: { rung: 'everyone' } });
    s.answerMotion(6, bo, m2, 'accept');
    s.answerMotion(7, cy, m2, 'accept');
    // removal is convenor-held in this fixture, so the carried change waits
    // on ada's assent (§9.7) — the 👑 question, accepted here
    const q = [...s.crownQuestionRecords().values()]
      .find((x) => x.motion === m2 && x.status === 'pending')!;
    s.answerCrownQuestion(8, q.id, 'accept');
    expect(s.motionRecords().get(m2)!.status).toBe('carried');
    expect(s.motionRecords().get(m)!.status).toBe('running');
    s.answerMotion(8, cy, m, 'accept');   // now asked — and ada still owes
    expect(s.motionRecords().get(m)!.status).toBe('running');
    s.answerMotion(9, 'ada', m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
  });
});
