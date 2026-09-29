/**
 * 🥂's one press answers every OK owed (1541.7 (a); Ed 2026-09-29: a fold
 * change, no new event). `close-acknowledged` is emitted as it always was; its
 * fold moves the signer's six owed sets (`okOwed`, `releasesOwed`,
 * `amendmentsOwed`, `mailGaveUpOwed`, `departuresOwed`, `heldOwed`) into their
 * given sets beside setting `closingAck`. The owing half is `owed.ts`; this is
 * the answer to all of it at once.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { buildConstituted } from './helpers.js';
import type { MemberRecord } from '../src/types.js';

const OWED = ['okOwed', 'releasesOwed', 'amendmentsOwed', 'mailGaveUpOwed',
  'departuresOwed', 'heldOwed'] as const;
const owedCount = (m: MemberRecord) => OWED.reduce((n, k) => n + m[k].size, 0);

/** A closed document where bo and cy are each owed news of three kinds. */
function closedWithNews() {
  const { s, bo, cy } = buildConstituted({ doors: {
    invite: { unilateral: true, assent: false }, remove: { unilateral: true, assent: false } } });
  // a release: the founder lays ✒️ on the proposal rate down after the start
  s.relinquish(10, 'rate', 'unilateral');
  // a departure: a fourth member arrives and the founder removes them
  const dee = s.invite(11, 'dee@example.org');
  s.arrive(11, dee);
  s.remove(12, dee);
  // a mail the outbox gave up on, told to the founder's room
  s.mailGaveUp(14, ['dee@example.org']);
  s.tick(1_000_000);
  expect(s.closed).toBe(true);
  return { s, bo, cy };
}

describe('🥂 answers every OK owed (1541.7 (a))', () => {
  it('signing moves every owed set to its given set, for the signer alone', () => {
    const { s, bo, cy } = closedWithNews();
    const before = (id: string) => s.memberRecords().get(id)!;
    const boOwed = Object.fromEntries(OWED.map((k) => [k, [...before(bo)[k]]]));
    expect(owedCount(before(bo))).toBeGreaterThan(1);
    expect(before(bo).releasesOwed.size).toBe(1);
    expect(before(bo).departuresOwed.size).toBe(1);
    expect(before(bo).mailGaveUpOwed.size).toBe(1);
    const cyOwedBefore = owedCount(before(cy));
    expect(cyOwedBefore).toBeGreaterThan(0);

    s.acknowledgeClose(1_000_100, bo, 'Good work.');
    const after = s.memberRecords().get(bo)!;
    expect(after.closingAck).toEqual({ t: 1_000_100, comment: 'Good work.' });
    expect(owedCount(after)).toBe(0);
    // each item answered lands where its own OK would have put it
    expect([...after.releasesGiven]).toEqual(expect.arrayContaining(boOwed.releasesOwed));
    expect([...after.departuresGiven]).toEqual(expect.arrayContaining(boOwed.departuresOwed));
    expect([...after.mailGaveUpGiven]).toEqual(expect.arrayContaining(boOwed.mailGaveUpOwed));
    expect([...after.okGiven]).toEqual(expect.arrayContaining(boOwed.okOwed));
    // cy has not signed: what cy is owed stands
    expect(owedCount(s.memberRecords().get(cy)!)).toBe(cyOwedBefore);
  });

  it('no new event: the log carries the one close-acknowledged, and replays to the same state', () => {
    const { s, bo } = closedWithNews();
    const n = s.logEntries().length;
    s.acknowledgeClose(1_000_100, bo, '');
    const added = s.logEntries().slice(n).map((e) => e.event.type);
    expect(added).toEqual(['close-acknowledged']);
    const r = ConstitutionSession.replay([...s.logEntries()]);
    const a = r.memberRecords().get(bo)!;
    expect(owedCount(a)).toBe(0);
    expect(a.closingAck).not.toBeNull();
  });

  it('an OK after signing is still refused as it always was: the document is closed', () => {
    const { s, bo } = closedWithNews();
    s.acknowledgeClose(1_000_100, bo, '');
    expect(() => s.acknowledgeClose(1_000_200, bo, '')).toThrow(/already signed/);
  });
});
