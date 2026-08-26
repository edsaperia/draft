/**
 * The close (SPEC §4.6, Q467): the clock closes the document; nobody presses
 * anything. The final adoption batch is the engine's (bridge.test covers the
 * batch); here, the constitution's own close — motions kept, 👑 questions
 * failed closed, invitations expired, the signing that OK on the 🥂 card is —
 * and the bridge's T=0 ordering, engine first then constitution.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { EngineBridge } from '../src/engine-bridge.js';
import { view } from '../src/view.js';
import { buildConstituted, reserveTextShield } from './helpers.js';

/** A constituted document whose ending is a real date, so the clock can reach it. */
function windowed(): { s: ConstitutionSession; bo: string; cy: string } {
  return buildConstituted(); // ending resolves to 1_000_000 (the maximum consent)
}

describe('the constitution closes on its ending (SPEC §4.6)', () => {
  it('the clock closes the document; nothing is pressed', () => {
    const { s } = windowed();
    expect(s.closed).toBe(false);
    s.tick(999_999);
    expect(s.closed).toBe(false); // not yet
    s.tick(1_000_000);
    expect(s.closed).toBe(true);
    expect(s.closedAt).toBe(1_000_000);
    // the lapse/freeze clocks stop: a tick past the close does nothing
    s.tick(2_000_000);
    expect(s.closedAt).toBe(1_000_000);
  });

  it('a constitutional motion unresolved at the close is kept, the mover’s 🏛️ returns', () => {
    const { s, bo } = windowed();
    // bo moves to remove the ending entirely — a constitutional change nobody
    // else answers, so it is still running at the close.
    const m = s.openMotion(10, bo, { kind: 'set', setting: 'ending',
      value: { endsAtMs: null } });
    expect(s.motionRecords().get(m)!.status).toBe('running');
    expect(view(s, bo).myHeldMotion).toBe(m);
    s.tick(1_000_000);
    expect(s.motionRecords().get(m)!.status).toBe('kept-at-close');
    expect(view(s, bo).myHeldMotion).toBeNull(); // the 🏛️ is back
    expect(s.settingState('ending').value).toEqual({ endsAtMs: 1_000_000 }); // what stood stands
  });

  it('an invitation outstanding at the close expires', () => {
    // a pre-start invitee who never arrives (a fresh session so we can add one)
    const s2 = ConstitutionSession.open({ title: 'T', slug: 't',
      convenor: { id: 'ada', email: 'ada@x.org', isMember: true } }, 0);
    const bo = s2.invite(1, 'bo@x.org');
    s2.arrive(1, bo);
    const dd = s2.invite(1, 'dee@x.org'); // never arrives — a blind founding would
    // wait on this invitation, so the founder sets every value directly instead.
    s2.confirmStartingText(2, 'Text.');
    for (const [id, v] of Object.entries({
      ending: { endsAtMs: 500_000 }, bar: { pct: 60 }, chamber: { rung: 'public' },
      rate: { grant: 4, cap: 8, dripMinutes: 240 },
      pace: { shape: 'fixed' }, quorum: { form: 'count', n: 1 },
      authorship: { rung: 'sealed' }, judgments: { rung: 'after' },
      applications: { holder: 'members', apply: false }, removal: { price: 'consent' },
      admission: { price: 'assembly' },
      machines: { enabled: false, budget: 0 }, lapse: { afterMs: null },
    })) { s2.reclaim(2, id as never); s2.setSetting(2, id as never, v as never); }
    s2.begin(2);
    expect(s2.constitutedAtT).not.toBeNull();
    s2.tick(500_000);
    expect(s2.closed).toBe(true);
    expect(s2.memberRecords().get(dd)!.invitationExpired).toBe(true);
    // arriving on an expired invitation is refused
    expect(() => s2.arrive(600_000, dd)).toThrow(/nothing left to join/);
  });

  it('OK on the 🥂 card signs the document; the comment is the rationale', () => {
    const { s, bo, cy } = windowed();
    // **A signature is always named** (Q769): the block no longer reads ✍️ at
    // all, so what stands is the signer's own name — whatever the disclosure
    // setting says, since 👤 is about proposals and signing is the opposite
    // act. cy gives one and bo does not, so the assertion below distinguishes
    // *unnamed* from *anonymised*: under the old rule both were null.
    s.setIdentity(999_000, cy, { name: 'Cy Cadwallader' });
    s.tick(1_000_000);
    // blank is a real signature
    s.acknowledgeClose(1_000_100, bo, '');
    s.acknowledgeClose(1_000_200, cy, 'dissent noted, but I sign');
    expect(() => s.acknowledgeClose(1_000_300, bo, 'again')).toThrow(/already signed/);
    const sigs = s.closingSignatures();
    expect(sigs.map((x) => x.member)).toEqual([bo, cy]);
    expect(sigs[1]!.comment).toBe('dissent noted, but I sign');
    expect(sigs[1]!.name).toBe('Cy Cadwallader');
    // null only because this member never gave a name
    expect(sigs[0]!.name).toBe(null);
    const v = view(s, bo);
    expect(v.closed!.at).toBe(1_000_000);
    expect(v.closed!.mySignature!.comment).toBe('');
    expect(v.closed!.signatures).toHaveLength(2);
  });

  it('after the close, nothing changes but the signing', () => {
    const { s, bo } = windowed();
    s.tick(1_000_000);
    expect(() => s.openMotion(1_000_100, bo, { kind: 'set', setting: 'ending',
      value: { endsAtMs: null } })).toThrow(/closed/);
    expect(() => s.answer(1_000_100, bo, 'ending', { endsAtMs: 5 })).toThrow(/closed|collecting/);
  });

  it('replays bit-identically across the close', () => {
    const { s, bo } = windowed();
    s.tick(1_000_000);
    s.acknowledgeClose(1_000_100, bo, 'signed');
    const replayed = ConstitutionSession.replay([...s.logEntries()]);
    expect(replayed.rollingHash()).toBe(s.rollingHash());
    expect(replayed.closedAt).toBe(s.closedAt);
    expect(replayed.closingSignatures()).toEqual(s.closingSignatures());
  });
});

describe('the bridge relays the close, engine first then constitution (SPEC §4.6)', () => {
  it('holds every ordinary motion the batch did not carry, and closes both ends at one T=0', () => {
    const { s, bo } = buildConstituted();
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'close-order' });
    const { motion } = bridge.openSetMotion(10, bo, 'ending', { endsAtMs: 3_000_000 });
    // nobody judged → short of floor → the value stands, the motion is held
    bridge.close(1_000_000);
    expect(bridge.engine.closed).toBe(true);
    expect(s.closed).toBe(true);
    expect(s.closedAt).toBe(1_000_000);
    expect(s.motionRecords().get(motion)!.status).toBe('held');
    expect(s.settingState('ending').value).toEqual({ endsAtMs: 1_000_000 });
  });

  it('a text adoption at T=0 under the Text’s shield fails closed — carried-but-unassented', () => {
    const { s, bo, cy } = buildConstituted();
    // the start laid the shield down; the room hands it back by reserve motion
    reserveTextShield(s, bo, ['ada', cy], 2);
    expect(s.textAdoptionNeedsAssent()).toBe(true);
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'close-shield' });
    const v0 = bridge.engine.currentVersion();
    const { id } = bridge.proposeText(10, bo,
      { baseVersion: v0, hunks: [{ start: 0, end: 1, lines: ['Open every day.'] }] }, 'nights');
    // cy prefers it; with bo's own that clears the floor, but the ramp holds
    // it back until the close (start bar high in this fixture? force via close)
    bridge.judge(20, cy, id, bridge.engine.races().find((r) => r.members.includes(id))!.incumbentId, 'a');
    // if it adopted already, a crown question is pending; otherwise the close
    // adopts it and then fails the crown closed. Either way, at the close:
    bridge.close(1_000_000);
    const rec = bridge.closeRecord();
    // the engine applied the text to its own document, but the constitution
    // holds it unassented — it never became the room's decision
    const failed = [...s.crownQuestionRecords().values()].filter((q) => q.status === 'failed-closed');
    expect(failed.some((q) => q.text?.candidateId === id)).toBe(true);
    expect(rec.carriedButUnassented.some((c) => c.candidateId === id)).toBe(true);
  });
});

describe('a refused event never reaches the log (Q679)', () => {
  /** A constituted document the founder holds outright, so the pen can
   *  move its close after the start without a motion. */
  function penHeld(): ConstitutionSession {
    const s = ConstitutionSession.open({ title: 'Night Watch', slug: 'night-watch',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true } }, 10);
    s.confirmStartingText(10, 'The watch is kept from dusk.');
    s.setSetting(10, 'ending', { endsAtMs: 1_000_000 }); // the bar waits on it
    const values: [string, unknown][] = [
      ['bar', { pct: 66 }], ['pace', { shape: 'fixed' }],
      ['quorum', { form: 'count', n: 1 }], ['authorship', { rung: 'sealed' }],
      ['judgments', { rung: 'after' }],
      ['chamber', { rung: 'link' }], ['lapse', { afterMs: null }],
      ['applications', { apply: false }], ['removal', { price: 'consent' }],
      ['admission', { price: 'assembly' }],
      ['machines', { enabled: false, budget: 0 }],
      ['rate', { grant: 4, cap: 8, dripMinutes: 240 }],
    ];
    for (const [id, v] of values) s.setSetting(10, id as never, v as never);
    s.begin(10);
    return s;
  }

  /**
   * An ending may legally be moved to a time already past (`values.ts` asks
   * only for a non-negative time), and the close stamps itself at the
   * *ending* rather than at t — so moving a close behind the log's own last
   * event makes `runClose` emit backwards. That refusal is right. What was
   * wrong is where it happened: `emit` pushed the entry and `apply` threw
   * afterwards, leaving a validly hashed entry in the chain that
   * `verifyChain` still accepted and the host's next persist wrote out —
   * after which `replay` threw on it for ever and the document was
   * quarantined at every boot, with a log nothing could repair.
   */
  it('a backwards close throws, and leaves the chain replayable', () => {
    const s = penHeld();
    s.setSetting(20, 'ending', { endsAtMs: 5 }); // the close, moved into the past
    const before = s.logEntries().length;

    expect(() => s.tick(30)).toThrow(/non-decreasing/);

    // nothing was written, the chain still verifies, and — the assertion
    // that matters — the log still replays into the very same document
    expect(s.logEntries()).toHaveLength(before);
    expect(s.verifyChain()).toBe(true);
    expect(s.closed).toBe(false);
    const again = ConstitutionSession.replay([...s.logEntries()]);
    expect(again.rollingHash()).toBe(s.rollingHash());
    expect(again.closed).toBe(false);

    // and it stays refused rather than corrupting on the second attempt
    expect(() => s.tick(40)).toThrow(/non-decreasing/);
    expect(s.logEntries()).toHaveLength(before);
  });
});
