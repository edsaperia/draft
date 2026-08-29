/**
 * **A mail that gave up is told** (SURFACE E34, Q947 (c), backlog 173).
 *
 * The outbox has given up on a mail at its attempt cap since stage 6 and
 * nothing on the surface read any of it: an invitation that never arrived
 * looked exactly like one nobody had opened. These are the module's half —
 * the batch, its audience, its OK, and the re-send that clears the row.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { view } from '../src/view.js';
import { buildConstituted } from './helpers.js';

describe('the give-up batch (SURFACE E34)', () => {
  it('one pass\'s addresses are one batch, told to every arrived member', () => {
    const { s, bo, cy } = buildConstituted({ admission: { price: 'pen' } });
    const dead = s.invite(3, 'dead@example.org');
    const alsoDead = s.invite(3, 'gone@example.org');
    s.mailGaveUp(4, ['dead@example.org', 'gone@example.org']);

    const batches = [...s.mailGiveUpBatchRecords().values()];
    expect(batches).toHaveLength(1);
    expect(batches[0]!.addresses).toEqual(['dead@example.org', 'gone@example.org']);

    // the convenor is **not** skipped: in `oweReleases` the founder is the
    // actor, and here nobody in the room is
    for (const who of ['ada', bo, cy]) {
      expect([...s.memberRecords().get(who)!.mailGaveUpOwed]).toEqual([batches[0]!.id]);
    }
    // **never the invitee** — the person the mail could not reach
    expect([...s.memberRecords().get(dead)!.mailGaveUpOwed]).toEqual([]);
    expect([...s.memberRecords().get(alsoDead)!.mailGaveUpOwed]).toEqual([]);

    // the subject's own flag, which the founder's ✉️ row reads
    expect(s.memberRecords().get(dead)!.mailGaveUp).toBe(true);
    expect(s.memberRecords().get(alsoDead)!.mailGaveUp).toBe(true);
    expect(s.memberRecords().get(bo)!.mailGaveUp).toBe(false);
  });

  it('matches the address case-blind, since an older log holds it as typed', () => {
    const { s } = buildConstituted({ admission: { price: 'pen' } });
    const dead = s.invite(3, 'Dead@Example.org');
    s.mailGaveUp(4, ['dead@example.ORG']);
    expect(s.memberRecords().get(dead)!.mailGaveUp).toBe(true);
  });

  it('a second pass is a second batch', () => {
    const { s } = buildConstituted({ admission: { price: 'pen' } });
    s.invite(3, 'dead@example.org');
    s.mailGaveUp(4, ['dead@example.org']);
    s.mailGaveUp(5, ['dead@example.org']);
    expect([...s.mailGiveUpBatchRecords().keys()]).toEqual(['mgu-1', 'mgu-2']);
    expect(s.memberRecords().get('ada')!.mailGaveUpOwed.size).toBe(2);
  });

  it('records the batch even where there was nobody to tell', () => {
    // a clerk founder and nobody arrived: the addresses are still a fact
    // about the register, so the event is emitted once with `member: null`
    const s = ConstitutionSession.open({
      title: 'Hollow Oak Club Charter', slug: 'hollow-oak-2',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: false },
    }, 0);
    const dead = s.invite(1, 'dead@example.org');
    s.mailGaveUp(2, ['dead@example.org']);
    expect([...s.mailGiveUpBatchRecords().values()]).toHaveLength(1);
    expect(s.memberRecords().get(dead)!.mailGaveUp).toBe(true);
    expect(s.logEntries().filter((e) => e.event.type === 'mail-gave-up')).toHaveLength(1);
  });

  it('an empty pass raises nothing', () => {
    const { s } = buildConstituted({ admission: { price: 'pen' } });
    const before = s.logEntries().length;
    s.mailGaveUp(4, []);
    expect(s.logEntries().length).toBe(before);
  });
});

describe('the OK on a give-up batch', () => {
  it('clears the owed set and is silent about a batch you are not owed', () => {
    const { s, bo } = buildConstituted({ admission: { price: 'pen' } });
    s.invite(3, 'dead@example.org');
    s.mailGaveUp(4, ['dead@example.org']);
    const batch = [...s.mailGiveUpBatchRecords().keys()][0]!;

    s.ackMailGaveUp(5, bo, batch);
    expect([...s.memberRecords().get(bo)!.mailGaveUpOwed]).toEqual([]);
    expect([...s.memberRecords().get(bo)!.mailGaveUpGiven]).toEqual([batch]);

    // `ackRelease`'s posture: a page that was a poll behind is ignored, not
    // thrown at — twice over, and on a batch that never existed
    const before = s.logEntries().length;
    s.ackMailGaveUp(6, bo, batch);
    s.ackMailGaveUp(6, bo, 'mgu-99');
    expect(s.logEntries().length).toBe(before);
  });
});

describe('the re-send', () => {
  it('clears the subject\'s line and leaves every owed batch standing', () => {
    const { s } = buildConstituted({ admission: { price: 'pen' } });
    const dead = s.invite(3, 'dead@example.org');
    s.mailGaveUp(4, ['dead@example.org']);
    const owed = new Set(s.memberRecords().get('ada')!.mailGaveUpOwed);

    s.resendInvite(5, dead, 'ada');
    expect(s.memberRecords().get(dead)!.mailGaveUp).toBe(false);
    // the card is the record of something that happened, and a re-send does
    // not un-happen it (E34's Persistence column; Q1030)
    expect(new Set(s.memberRecords().get('ada')!.mailGaveUpOwed)).toEqual(owed);
  });

  it('refuses somebody who is already here, or is not there at all', () => {
    const { s, bo } = buildConstituted({ admission: { price: 'pen' } });
    expect(() => s.resendInvite(5, bo, 'ada')).toThrow(/already here/);
    expect(() => s.resendInvite(5, 'nobody', 'ada')).toThrow(/unknown member/);
  });

  it('a re-send that dies too raises a fresh batch', () => {
    const { s } = buildConstituted({ admission: { price: 'pen' } });
    const dead = s.invite(3, 'dead@example.org');
    s.mailGaveUp(4, ['dead@example.org']);
    s.resendInvite(5, dead, 'ada');
    s.mailGaveUp(6, ['dead@example.org']);
    expect(s.memberRecords().get(dead)!.mailGaveUp).toBe(true);
    expect(s.mailGiveUpBatchRecords().size).toBe(2);
  });
});

describe('the view and the replay', () => {
  it('projects the owed batches oldest first, and [] for a seat with no record', () => {
    const { s, bo } = buildConstituted({ admission: { price: 'pen' } });
    s.invite(3, 'dead@example.org');
    s.mailGaveUp(4, ['dead@example.org']);
    s.invite(4, 'gone@example.org');
    s.mailGaveUp(5, ['gone@example.org']);

    const v = view(s, bo);
    expect(v.owedMailGiveUps.map((b) => b.addresses)).toEqual(
      [['dead@example.org'], ['gone@example.org']]);
    expect(v.owedMailGiveUps[0]!.at).toBeLessThan(v.owedMailGiveUps[1]!.at);
    expect(v.members.find((m) => m.email === 'dead@example.org')!.mailGaveUp).toBe(true);
    expect(v.members.find((m) => m.id === bo)!.mailGaveUp).toBe(false);

    expect(view(s, 'nobody').owedMailGiveUps).toEqual([]);
  });

  it('replay over the log is bit-identical', () => {
    const { s, bo } = buildConstituted({ admission: { price: 'pen' } });
    const dead = s.invite(3, 'dead@example.org');
    s.mailGaveUp(4, ['dead@example.org']);
    s.ackMailGaveUp(5, bo, [...s.mailGiveUpBatchRecords().keys()][0]!);
    s.resendInvite(6, dead, 'ada');
    s.mailGaveUp(7, ['dead@example.org']);

    const again = ConstitutionSession.replay([...s.logEntries()]);
    expect(again.logEntries()).toEqual(s.logEntries());
    expect(again.mailGiveUpBatchRecords()).toEqual(s.mailGiveUpBatchRecords());
    expect(view(again, bo)).toEqual(view(s, bo));
    expect(again.memberRecords().get(dead)!.mailGaveUp).toBe(true);
  });
});
