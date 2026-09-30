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

/**
 * A closed document where bo is owed news of all six kinds, and cy of some:
 * a setting changed over their heads (`okOwed`), a power laid down
 * (`releasesOwed`), a ✒️ amendment to the text (`amendmentsOwed`), a mail
 * given up on (`mailGaveUpOwed`), a member removed (`departuresOwed`), and —
 * for bo alone, its mover — a motion the membership held (`heldOwed`).
 */
function closedWithNews() {
  const { s, bo, cy } = buildConstituted({ keepText: { unilateral: true }, doors: {
    invite: { unilateral: true, assent: false }, remove: { unilateral: true, assent: false } } });
  // a setting changed over their heads: the founder's pen on the proposal rate
  s.setSetting(9, 'rate', { grant: 1, cap: 2, dripMinutes: 600 });
  // a release: the founder lays ✒️ on the proposal rate down after the start
  s.relinquish(10, 'rate', 'unilateral');
  // a departure: a fourth member arrives and the founder removes them
  const dee = s.invite(11, 'dee@example.org');
  s.arrive(11, dee);
  s.remove(12, dee);
  // an amendment: the founder's pen on the text
  s.recordTextAmendment(13, { candidateId: 'c-amend', summary: 'a word changed' });
  // a mail the outbox gave up on, told to the founder's room
  s.mailGaveUp(14, ['dee@example.org']);
  // a failed motion, owed to bo, its mover: moving the close is ordinary
  const m = s.openMotion(15, bo, { kind: 'set', setting: 'ending', value: { endsAtMs: 2_000_000 } });
  s.adjudicateOrdinaryMotion(16, m, 'held');
  s.tick(1_000_000);
  expect(s.closed).toBe(true);
  return { s, bo, cy };
}

describe('🥂 answers every OK owed (1541.7 (a))', () => {
  it('signing moves every owed set to its given set, for the signer alone', () => {
    const { s, bo, cy } = closedWithNews();
    const before = (id: string) => s.memberRecords().get(id)!;
    const boOwed = Object.fromEntries(OWED.map((k) => [k, [...before(bo)[k]] as string[]])) as
      Record<(typeof OWED)[number], string[]>;
    // every one of the six is owed before the signature
    for (const k of OWED) expect([k, before(bo)[k].size > 0]).toEqual([k, true]);
    expect(before(bo).okOwed.has('rate')).toBe(true);
    expect(before(cy).heldOwed.size).toBe(0);
    const cyOwedBefore = owedCount(before(cy));
    expect(cyOwedBefore).toBeGreaterThan(0);

    s.acknowledgeClose(1_000_100, bo, 'Good work.');
    const after = s.memberRecords().get(bo)!;
    expect(after.closingAck).toEqual({ t: 1_000_100, comment: 'Good work.' });
    // …and none after it, each item landing where its own OK would have put it
    for (const k of OWED) expect([k, after[k].size]).toEqual([k, 0]);
    expect([...after.okGiven]).toEqual(expect.arrayContaining(boOwed.okOwed));
    expect([...after.releasesGiven]).toEqual(expect.arrayContaining(boOwed.releasesOwed));
    expect([...after.amendmentsGiven]).toEqual(expect.arrayContaining(boOwed.amendmentsOwed));
    expect([...after.mailGaveUpGiven]).toEqual(expect.arrayContaining(boOwed.mailGaveUpOwed));
    expect([...after.departuresGiven]).toEqual(expect.arrayContaining(boOwed.departuresOwed));
    expect([...after.heldGiven]).toEqual(expect.arrayContaining(boOwed.heldOwed));
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
