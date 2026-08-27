/**
 * **Promise-coverage — the register, and the two doors ✉️ ❌** (backlog entry
 * 79, series 77, batch L). The register is a *fact* and not a setting (entry
 * 94), so its promises are the doors': nobody enters or leaves except by the
 * routes the document names, each priced by a setting and each passing ✉️ or
 * ❌, which hold the founder's ✒️/🛡️ pair over the *act* (SPEC §9.7 rule 9,
 * X4). This file locks what holds; what does not is filed as a backlog entry.
 *
 * ## The enumeration — every route, in every epoch
 *
 * Fold = the method that admits or refuses, and the sentence it refuses with.
 * Surface = the control on `design/session-view.html` that reaches it.
 *
 * | route | before 🍾 | live | after the close |
 * | --- | --- | --- | --- |
 * | **invitation, founder's word** | `invite(t, email)` admits — §9.6a's free hand. Surface: ✉️'s `[data-add]` box, `directInvite() = amFounder()` | admits while ✉️'s ✒️ is held **or** 🪪 stands at `pen`; else *after the start an invitation is a motion at 🪪's price*. Surface: the same box, `amFounder() && regPair().u` | `requireOpen` — *the document has closed — inviting is over*. Surface: the closed page draws no card |
 * | **invitation, a member's word** | refused — *before the start the founder invites* | admits iff 🪪 is at `pen`; else *admission is not at ✒️ — propose the invitation at 🪪's price*. Surface: `viewerIsMember() && admissionPrice() === 'pen'` | `requireOpen` |
 * | **invitation, as a motion** | `openMotion` — *before the start nothing is amended — only set* | routed by `priceOf('admission')`; at `pen` refused (*invite directly, nothing to propose*). Surface: ✉️'s composer branch and `draftPayload`'s *… joins the membership* | `requireOpen` — *a motion is over* |
 * | **application** (entry 78's subject) | `mayApply()` is 🤝's, and `openMotion` refuses pre-start anyway | `submitApplication` admits at `pen`, else opens an `admit` motion at 🪪's price | `requireOpen` — *applying is over* |
 * | **arrival** (following the link) | `arrive` — E grows, nothing is owed | same | *there is nothing left to join, only to read (§4.6)*; `runClose` has already emitted `invitation-expired` |
 * | **the founder's own row** | `setConvenorMembership` (🎩) | `requirePreStart` — 🎩 is locked at the start | `requireOpen` |
 * | **exile at will** | `remove` needs ❌'s ✒️, which is born held, so the founder's word removes. Surface: `directRemove() = amFounder()`, the picker + *❌ Remove* | needs `doorPen('door:remove')`; else *removal at will needs ❌'s ✒️ — propose it at 🥾's price instead*. Surface: `amFounder() && pwPair('remove').u` | `requireOpen` — *removing is over* |
 * | **removal by motion** | `openMotion` refuses pre-start | routed by `priceOf('removal')`; the target must be in E. Surface: ❌'s composer and `draftPayload`'s *… leaves the membership* | `requireOpen`; a 👑 question pending fails closed (X17) |
 * | **resignation** | `resign` works (the convenor unticks 🎩 instead) | free, immediate, nobody's to refuse. Surface: *Leave* on your own row | `requireOpen` — *resigning is over*. §4.6: nothing changes but the signing, so this is a **kept** promise of the third epoch |
 * | **withdrawing an invitation** | `uninvite`. Surface: the ❌ picker lists invitees, `data-exile` routes `row.in ? remove : uninvite` | **refused**: *uninviting is pre-start only — after the start it is a motion (§9.6a)* — and there is no `uninvite` motion payload, so nobody can withdraw it. The picker still offers the invitee. **Filed** | `requireOpen`; the close expires it |
 * | **lapse** (§9.5a — *not* a departure) | the clock runs from 🍾 | `tick` lapses; out of E and every electorate, still a member, still owed OKs | the close returns before the lapse clock |
 *
 * Nine promises, one `describe` each. Where an existing file already locks a
 * case it is cited rather than duplicated.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { view } from '../src/view.js';
import { buildConstituted } from './helpers.js';
import { Session as EngineSession, makeConstitution } from '../../engine-core/src/session.js';

const crownQuestionFor = (s: ConstitutionSession, motion: string) =>
  [...s.crownQuestionRecords().values()]
    .find((q) => q.motion === motion && q.status === 'pending');

/** A pre-start document with the founder a member and two arrived members. */
function openFounding(opts: { isMember?: boolean } = {}) {
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter',
    slug: 'hollow-oak-register',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: opts.isMember ?? true },
  }, 0);
  const bo = s.invite(1, 'bo@example.org');
  const cy = s.invite(1, 'cy@example.org');
  s.arrive(1, bo);
  s.arrive(1, cy);
  return { s, bo, cy };
}

// ---------------------------------------------------------------------------

describe('promise 1 — nobody enters or leaves except by the routes the document names (rule 9, X4)', () => {
  it('before the start the founder invites, and nobody else does (§9.6a)', () => {
    const { s, bo } = openFounding();
    expect(() => s.invite(2, 'dee@example.org', bo))
      .toThrow(/before the start the founder invites/);
    expect(() => s.invite(2, 'dee@example.org')).not.toThrow();
    // and nothing is a motion yet
    expect(() => s.openMotion(2, bo, { kind: 'invite', email: 'eve@example.org' }))
      .toThrow(/before the start nothing is amended/);
  });

  it('after the start an invitation the founder cannot make alone is a motion at 🪪’s price', () => {
    // the two refusals themselves are `doors.test.ts`’s (*a member’s word is
    // refused above ✒️, and the founder’s needs the door’s pen*); what is
    // locked here is that the motion route is the one that is left
    const { s, bo } = buildConstituted({ admission: { price: 'proposal' } });
    expect(() => s.invite(3, 'dee@example.org')).toThrow(/motion at 🪪/);
    const m = s.openMotion(3, bo, { kind: 'invite', email: 'dee@example.org' });
    expect(s.motionRecords().get(m)!.route).toBe('ordinary');
  });

  it('an invitation cannot be withdrawn after the start, by anybody', () => {
    const { s, bo } = buildConstituted({
      doors: { invite: { unilateral: true, assent: false } } });
    const dee = s.invite(3, 'dee@example.org');
    expect(() => s.uninvite(4, dee))
      .toThrow(/uninviting is pre-start only — after the start it is a motion/);
    // and the motion the sentence points at cannot be put, because a removal
    // motion’s target must be in E and an invitee never is (§9.6a)
    expect(() => s.openMotion(4, bo, { kind: 'remove', member: dee }))
      .toThrow(/is not a member/);
    // filed: the ❌ picker offers the invitee all the same (entry 96), and
    // there is no `uninvite` payload kind for `openMotion` to route
  });

  it('after the close every route is over, and the invitee is expired rather than withdrawn (§4.6)', () => {
    const { s, cy } = buildConstituted({
      doors: { invite: { unilateral: true, assent: false } } });
    const dee = s.invite(3, 'dee@example.org');
    s.close(4);
    expect(s.memberRecords().get(dee)!.invitationExpired).toBe(true);
    expect(() => s.invite(5, 'eve@example.org')).toThrow(/closed — inviting is over/);
    expect(() => s.remove(5, cy)).toThrow(/closed — removing is over/);
    expect(() => s.resign(5, cy)).toThrow(/closed — resigning is over/);
    expect(() => s.uninvite(5, dee)).toThrow(/closed — uninviting is over/);
    expect(() => s.arrive(5, dee)).toThrow(/nothing left to join, only to read/);
    expect(() => s.startApplication(5, 'eve@example.org')).toThrow(/closed — applying is over/);
  });

  it('a clerk founder’s word admits at 🪪 ✒️, though §9.7½ names only members', () => {
    // FILED. `invite`’s else-branch is *the founder’s word*, and at `pen` it
    // lets it through without asking whether the founder is on the roster —
    // so a founder who is not a member, and whose word §9.7½ does not name,
    // admits on a rung that reads *any member may invite*.
    const { s } = buildConstituted({ clerk: true, admission: { price: 'pen' } });
    expect(s.convenorRecord().isMember).toBe(false);
    const dee = s.invite(3, 'dee@example.org');
    expect(s.memberRecords().get(dee)!.arrival).toEqual({ via: 'invitation', by: 'convenor' });
  });
});

// ---------------------------------------------------------------------------

describe('promise 2 — while the founder keeps 🛡️ on a door, a carried admission or removal waits on them (rule 9, rule 6)', () => {
  it('a carried application waits on ✉️’s 🛡️ — `reservedTarget` maps `admit` to `door:invite`', () => {
    // entry 78 owns whether an application at 🪪 `pen` ought to pass the
    // shield at all; this is the *carried* case alone.
    const { s, bo, cy } = buildConstituted({
      applications: { apply: true }, admission: { price: 'assembly' },
      doors: { invite: { unilateral: false, assent: true } } });
    const ap = s.startApplication(3, 'rowan@example.org');
    s.verifyApplication(3, ap);
    s.submitApplication(3, ap, { name: 'Rowan Vale' });
    const m = [...s.motionRecords().values()]
      .find((r) => r.payload.kind === 'admit')!;
    expect(m.route).toBe('constitutional');
    s.answerMotion(4, 'ada', m.id, 'accept');
    s.answerMotion(4, bo, m.id, 'accept');
    s.answerMotion(4, cy, m.id, 'accept');
    expect(s.motionRecords().get(m.id)!.status).toBe('awaiting-crown');
    s.answerCrownQuestion(5, crownQuestionFor(s, m.id)!.id, 'accept');
    expect(s.motionRecords().get(m.id)!.status).toBe('carried');
    expect(s.applicantRecords().get(ap)!.status).toBe('admitted');
  });

  it('a 👑 question pending on a door at the close fails closed — the subject is never removed (X17)', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'assembly' },
      doors: { remove: { unilateral: false, assent: true } } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    s.answerMotion(4, 'ada', m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('awaiting-crown');
    const q = crownQuestionFor(s, m)!;
    s.close(5);
    expect(s.crownQuestionRecords().get(q.id)!.status).toBe('failed-closed');
    expect(s.memberRecords().get(cy)!.removed).toBe(false);
  });

  it('a sleeping crown grants assent and does not act: a carried removal passes, an exile at will is refused', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 },
      removal: { price: 'assembly' },
      doors: { remove: { unilateral: true, assent: true } } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    s.answerMotion(4, 'ada', m, 'accept'); // everyone but the subject
    expect(s.motionRecords().get(m)!.status).toBe('awaiting-crown');
    s.setIdentity(9_000, bo, { name: 'Bo' });
    s.tick(10_500); // the crown goes quiet — abstaining grants (§9.7 v0.49)
    expect(s.crownLapsed).toBe(true);
    expect(s.memberRecords().get(cy)!.removed).toBe(true);
    // and the pen it still holds does nothing while it sleeps (`doorPen`)
    expect(() => s.remove(10_600, bo)).toThrow(/removal at will needs ❌'s ✒️/);
  });
});

// ---------------------------------------------------------------------------

describe('promise 3 — the electorate is who is here now (v0.48, §8.2)', () => {
  it('an invitee counts toward nothing, and their arrival is what raises E', () => {
    const { s } = openFounding();
    expect(s.E()).toBe(3);
    const dee = s.invite(2, 'dee@example.org');
    expect(s.E()).toBe(3);
    expect(s.quorumBase()).toBe(3);
    expect(s.motionElectorate()).not.toContain(dee);
    s.arrive(3, dee);
    expect(s.E()).toBe(4);
    expect(s.motionElectorate()).toContain(dee);
    const floors = s.logEntries()
      .filter((e) => e.event.type === 'floor-recomputed')
      .map((e) => (e.event as { E: number }).E);
    expect(floors[floors.length - 1]).toBe(4);
  });

  it('a resignation lowers E and completes a 🏛️ that was waiting on the resigner', () => {
    const { s, bo, cy } = buildConstituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    s.answerMotion(4, 'ada', m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('running'); // cy owes
    s.resign(5, cy);
    expect(s.E()).toBe(2);
    expect(s.motionRecords().get(m)!.status).toBe('carried');
  });

  it('a removal by motion lowers E the same way an exile does', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'assembly' } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    s.answerMotion(4, 'ada', m, 'accept'); // cy is excluded at `assembly`
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.memberRecords().get(cy)!.removedBy).toBe('members');
    expect(s.E()).toBe(2);
  });

  // the lapse half is `doors.test.ts` (*a running 🏛️ does not wait on a
  // lapsed member*) and the abstaining sign-out is `membership.test.ts`
});

// ---------------------------------------------------------------------------

describe('promise 4 — a decision you were here for and had no say in sits in your rail until you press OK (§9.0a, §9.6a)', () => {
  // the lapsed-are-owed case and the never-arrived case are
  // `change-record.test.ts`’s; what was missing is the *later joiner*
  it('a member who joins after the change is owed nothing for it — it is simply what the document says', () => {
    // 🪪 is constitutional and stays founder-held through `buildConstituted`,
    // so the pen can amend it and the room is owed the decision
    const { s, bo, cy } = buildConstituted({
      doors: { invite: { unilateral: true, assent: false } } });
    s.setSetting(3, 'admission', { price: 'proposal' }, 'so the room can decide');
    expect(view(s, bo).owedOks).toContain('admission');
    expect(view(s, cy).owedOks).toContain('admission');
    const dee = s.invite(4, 'dee@example.org');
    s.arrive(5, dee);
    expect(view(s, dee).owedOks).not.toContain('admission');
    s.giveOk(6, bo, 'admission');
    expect(view(s, bo).owedOks).not.toContain('admission');
  });

  it('a removed member is owed nothing by a change made after they went', () => {
    const { s, bo, cy } = buildConstituted({
      doors: { remove: { unilateral: true, assent: false } } });
    s.giveOk(3, cy, 'admission'); // what the founding already owed them
    s.remove(4, cy);
    s.setSetting(5, 'admission', { price: 'proposal' });
    expect(s.memberRecords().get(bo)!.okOwed.has('admission')).toBe(true);
    expect(s.memberRecords().get(cy)!.okOwed.has('admission')).toBe(false);
    // and the row is out of the projection altogether, so nothing they were
    // owed *before* they went is read by anybody either
    expect(view(s, bo).members.find((r) => r.id === cy)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------

describe('promise 5 — each door’s ✒️ and 🛡️ mean what the clause says, in every epoch (R-048)', () => {
  it('a door’s pen laid down before 🍾 is still the founder’s, and still removes', () => {
    const { s, cy } = openFounding();
    s.relinquish(2, 'door:remove', 'unilateral');
    const st = s.settingState('door:remove');
    expect(st.pendingRelease.unilateral).toBe(true);
    expect(st.powers.unilateral).toBe(true); // recorded now, effective at 🍾
    expect(s.doorPen('door:remove')).toBe(true);
    expect(() => s.remove(2, cy)).not.toThrow();
  });

  it('and 🍾 spends the release: the same lay-down, seen from the other side of the start', () => {
    // `buildConstituted` lays both doors down pre-start and then begins, so
    // this is R-048's second half read off the helper's own path
    const { s } = buildConstituted();
    for (const door of ['door:remove', 'door:invite'] as const) {
      expect(s.settingState(door).powers).toEqual({ unilateral: false, assent: false });
      expect(s.settingState(door).pendingRelease)
        .toEqual({ unilateral: false, assent: false });
    }
  });

  it('laid down after 🍾 it is gone at once, and reclaiming is refused', () => {
    const { s, bo } = buildConstituted({
      doors: { remove: { unilateral: true, assent: false } } });
    s.relinquish(3, 'door:remove', 'unilateral');
    expect(s.doorPen('door:remove')).toBe(false);
    expect(() => s.remove(4, bo)).toThrow(/removal at will needs/);
    expect(() => s.reclaim(4, 'door:remove')).toThrow(/reclaiming is pre-start only/);
    // the road back is the room’s (§9.7 v0.52)
    expect(() => s.relinquish(4, 'door:remove', 'unilateral'))
      .toThrow(/the unilateral power on 'door:remove' is not held/);
  });

  it('nothing changes hands at the close: the doors’ pairs stand as they stood', () => {
    const { s, bo } = buildConstituted({
      doors: { invite: { unilateral: true, assent: false },
        remove: { unilateral: false, assent: true } } });
    const before = view(s, bo).doors;
    s.close(4);
    const after = view(s, bo).doors;
    expect(after.invite.powers).toEqual(before.invite.powers);
    expect(after.remove.powers).toEqual(before.remove.powers);
    expect(after.invite.holder).toBe('convenor');
    expect(after.remove.holder).toBe('convenor');
  });
});

// ---------------------------------------------------------------------------

describe('promise 6 — when the founding cannot go on, 🍾 says why (Q826, F19)', () => {
  it('an unopened invitation reads `invitation-open`, and a room of one reads `one-voice`', () => {
    const s = ConstitutionSession.open({
      title: 'Hollow Oak Club Charter', slug: 'hollow-oak-alone',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    s.delegate(1, 'ending');
    expect(s.readiness().holds.find((h) => h.setting === 'ending')!.why).toBe('one-voice');
    s.invite(2, 'bo@example.org');
    // the invitation is already the remedy, so it is named before the voice
    expect(s.readiness().holds.find((h) => h.setting === 'ending')!.why).toBe('invitation-open');
  });

  /**
   * **Entry 69 landed, and the two are told apart** (`WaitingWhy` gained
   * `deps-unsettled`). A delegated 🌡️ waits on ⏰ by `deps`, so it is not
   * answerable at all — and `waitingWith` used to report it as `collecting`,
   * the same word it gives the question that *is* being answered. It now
   * reports the dependency by name, which is the whole point: the block is
   * upstream, and no answer to 🌡️ — nor any invitation — will move it.
   */
  it('a delegated 🌡️ whose ⏰ is still collecting reads `deps-unsettled`, and names ⏰ (entry 69)', () => {
    const { s, bo } = openFounding();
    s.delegate(2, 'ending');
    s.delegate(2, 'bar');
    expect(s.settingState('ending').settledBy).toBeNull();
    expect(() => s.answer(2, bo, 'bar', { pct: 70 })).toThrow(/waits on 'ending'/);
    const hold = (id: string) => s.readiness().holds.find((h) => h.setting === id)!;
    expect(hold('ending').why).toBe('collecting');
    expect(hold('bar').why).toBe('deps-unsettled');
    expect(hold('bar').on).toEqual(['ending']);
    // the reason the room is being asked for is still the plain one
    expect(hold('ending').on).toBeUndefined();
    expect((['judge-gate', 'invitation-open', 'one-voice', 'collecting',
      'text-unconfirmed', 'deps-unsettled']).includes(hold('bar').why)).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe('promise 7 — exile and resignation are immediate, and standing answers leave with them (rule 9)', () => {
  it('a resigner’s standing keep stops blocking the moment they go', () => {
    const { s, bo, cy } = buildConstituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    s.answerMotion(4, 'ada', m, 'accept');
    s.answerMotion(5, cy, m, 'keep'); // the sole refuser
    expect(s.motionRecords().get(m)!.status).toBe('running');
    s.resign(6, cy);
    expect(s.motionRecords().get(m)!.status).toBe('carried');
  });

  it('and a carried removal does the same as an exile does', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'assembly' } });
    const stuck = s.openMotion(3, bo, { kind: 'set', setting: 'chamber', value: { rung: 'public' } });
    s.answerMotion(4, 'ada', stuck, 'accept');
    s.answerMotion(4, cy, stuck, 'keep');
    expect(s.motionRecords().get(stuck)!.status).toBe('running');
    // a second 🏛️ is not bo's to open (§9.6), so the removal is ada's
    const boot = s.openMotion(5, 'ada', { kind: 'remove', member: cy });
    s.answerMotion(5, bo, boot, 'accept');
    expect(s.motionRecords().get(boot)!.status).toBe('carried');
    expect(s.motionRecords().get(stuck)!.status).toBe('carried');
  });

  it('a founding answer stops counting when its author is exiled before the start', () => {
    const { s, bo, cy } = openFounding();
    s.delegate(2, 'ending');
    s.answer(2, 'ada', 'ending', { endsAtMs: 500_000 });
    s.answer(2, bo, 'ending', { endsAtMs: 900_000 });
    expect(view(s, bo).questions.find((q) => q.setting === 'ending')!.answeredCount).toBe(2);
    expect(s.settingState('ending').settledBy).toBeNull(); // cy still owes
    s.remove(3, cy); // ❌'s ✒️ is born held, so the founder's word removes
    expect(s.settingState('ending').settledBy).toBe('ceremony');
    // the answer is not deleted, it stops being counted: the room took the
    // maximum of the two that were left
    expect(s.settingState('ending').value).toEqual({ endsAtMs: 900_000 });
  });

  it('but a cast judgment stays counted (§9.3): the engine’s removal fold flips `removed` and nothing else', () => {
    const constitution = makeConstitution({
      windowStartMs: 0, windowEndMs: 10 * 3600_000, rngSeed: 'promise-register',
      tokenDripMinutes: 60, cooldownMs: 0,
      adoptionThresholdStart: 0.999, adoptionThresholdEnd: 0.999,
    });
    const roster = ['p1', 'p2', 'p3', 'p4', 'p5']
      .map((id) => ({ id, handle: id.toUpperCase() }));
    const e = EngineSession.open({
      text: '# Charter\nMembership is open to anyone.\nDecisions are made by consensus.',
      roster, constitution,
    }, 0);
    const { id: c1 } = e.submitCandidate(1000, {
      author: 'p1',
      patch: { baseVersion: 0, hunks: [{ start: 1, end: 2, lines: ['A.'] }] },
      rationale: 'r',
    });
    const inc = e.raceOf(c1).incumbentId;
    e.judge(2000, 'p2', c1, inc, 'a');
    const measured = e.raceOf(c1).comparisons;
    const movers = e.raceOf(c1).distinctMovers;
    expect(measured).toBe(1);
    e.removeParticipant(3000, 'p2');
    // the judgment is evidence about the text, not a standing position — it
    // was cast while they were here and it is still in the posterior
    expect(e.raceOf(c1).comparisons).toBe(measured);
    expect(e.raceOf(c1).distinctMovers).toBe(movers);
  });
});

// ---------------------------------------------------------------------------

describe('promise 8 — a lapsed member stops blocking and stops counting, but is still a member (§9.5a, Y10)', () => {
  it('they are still in the members list, marked lapsed, and can still sign the close', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 } });
    s.setIdentity(9_000, 'ada', { name: 'Ada' });
    s.setIdentity(9_000, bo, { name: 'Bo' });
    s.tick(10_500);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(true);
    expect(s.E()).toBe(2);
    const row = view(s, bo).members.find((r) => r.id === cy);
    expect(row).toBeDefined();
    expect(row!.lapsed).toBe(true);
    s.close(11_000);
    expect(() => s.acknowledgeClose(11_100, cy, 'I was away, and I sign')).not.toThrow();
    expect(s.closingSignatures().map((x) => x.member)).toContain(cy);
  });

  it('but a removed member is not a member, and cannot sign', () => {
    const { s, cy } = buildConstituted({ doors: { remove: { unilateral: true, assent: false } } });
    s.remove(3, cy);
    s.close(4);
    expect(() => s.acknowledgeClose(5, cy, '')).toThrow(/is not a member/);
  });
});

// ---------------------------------------------------------------------------

describe('promise 9 — the record names who let you in (Q2b, Q524)', () => {
  // `arrival.test.ts` covers every route’s `Arrival`; what is locked here is
  // that the member-facing projection carries it, so a surface can say it
  it('the view’s member row carries the arrival, inviter and all', () => {
    const { s, bo } = buildConstituted({ admission: { price: 'pen' } });
    const dee = s.invite(3, 'dee@example.org', bo);
    s.arrive(4, dee);
    const row = view(s, bo).members.find((r) => r.id === dee)!;
    expect(row.arrival).toEqual({ via: 'invitation', by: 'member', inviter: bo });
  });
});
