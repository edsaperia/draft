import { describe, it, expect } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { view } from '../src/view.js';

function open(opts: { clerk?: boolean; name?: string } = {}) {
  return ConstitutionSession.open({
    title: 'Hollow Oak Club Charter',
    slug: 'hollow-oak',
    convenor: {
      id: 'ada', email: 'ada@example.org', isMember: !opts.clerk,
      ...(opts.name !== undefined ? { name: opts.name } : {}),
    },
  }, 0);
}

/**
 * ✋ and 🖼️ are answered, not inferred (Q645). The surface needs to know
 * whether a member was ever *asked*, and the value cannot say: §9.0c shows a
 * blank name as **Anonymous**, "a name, not a gap", and a picture is removed
 * by choosing initials. So null covers both *never asked* and *asked, left
 * empty*, and only the act tells them apart.
 */
describe('identity: the act is recorded, not the value (§9.0c, Q645)', () => {
  it('nobody has answered either question at the birth', () => {
    const s = open();
    const rec = s.memberRecords().get('ada')!;
    expect(rec.nameSet).toBe(false);
    expect(rec.pictureSet).toBe(false);
    expect(view(s, 'ada').identity)
      .toEqual({ name: null, picture: null, nameSet: false, pictureSet: false });
  });

  it('a blank answer is a real answer', () => {
    const s = open();
    s.setIdentity(1, 'ada', { name: null });
    const rec = s.memberRecords().get('ada')!;
    // the value is exactly what it was before, and the question is answered
    expect(rec.name).toBeNull();
    expect(rec.nameSet).toBe(true);
    // and the other half is untouched — they are two cards
    expect(rec.pictureSet).toBe(false);
  });

  it('answers one question at a time, and the view carries both flags', () => {
    const s = open();
    s.setIdentity(1, 'ada', { name: 'Ash Bellamy' });
    expect(view(s, 'ada').identity)
      .toEqual({ name: 'Ash Bellamy', picture: null, nameSet: true, pictureSet: false });
    s.setIdentity(2, 'ada', { picture: null }); // "my initials" is an answer
    expect(view(s, 'ada').identity)
      .toEqual({ name: 'Ash Bellamy', picture: null, nameSet: true, pictureSet: true });
  });

  it('a clerk is asked the same questions, and keeps the answers', () => {
    const s = open({ clerk: true });
    expect(s.memberRecords().has('ada')).toBe(false); // never on the roster
    s.setIdentity(1, 'ada', { name: 'Ash Bellamy', picture: 'e🦊' });
    expect(s.convenorRecord().nameSet).toBe(true);
    expect(s.convenorRecord().pictureSet).toBe(true);
    expect(view(s, 'ada').identity)
      .toEqual({ name: 'Ash Bellamy', picture: 'e🦊', nameSet: true, pictureSet: true });
  });

  it('a founder created carrying a name has answered it, on both records', () => {
    const s = open({ name: 'Ash Bellamy' });
    expect(s.convenorRecord().nameSet).toBe(true);
    // readers prefer the MemberRecord, so the two must not disagree
    expect(s.memberRecords().get('ada')!.name).toBe('Ash Bellamy');
    expect(s.memberRecords().get('ada')!.nameSet).toBe(true);
    expect(s.memberRecords().get('ada')!.pictureSet).toBe(false);
  });

  it('an arriving member starts having answered nothing', () => {
    const s = open();
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    expect(s.memberRecords().get(bo)!.nameSet).toBe(false);
    expect(view(s, bo).identity.nameSet).toBe(false);
  });
});

/**
 * 🎩 decides where the founder sits, not who they are (Q646). Identity binds
 * nobody (§9.0c; exception X15 keeps it for a convenor with no powers and no
 * membership), so nothing about it belongs to the seat.
 */
describe('🎩 re-tick keeps the founder’s identity (Q646)', () => {
  it('ticking back in does not wipe the name, the picture or the flags', () => {
    const s = open();
    s.setIdentity(1, 'ada', { name: 'Ash Bellamy', picture: 'e🦊' });
    s.setConvenorMembership(2, false); // become a clerk
    expect(s.memberRecords().has('ada')).toBe(false);
    // carried back onto the convenor struct, so the clerk keeps their face
    expect(s.convenorRecord().name).toBe('Ash Bellamy');
    expect(s.convenorRecord().nameSet).toBe(true);
    s.setConvenorMembership(3, true); // and back in
    const rec = s.memberRecords().get('ada')!;
    expect(rec.name).toBe('Ash Bellamy');
    expect(rec.picture).toBe('e🦊');
    expect(rec.nameSet).toBe(true);
    expect(rec.pictureSet).toBe(true);
  });

  it('a name given as a clerk survives being ticked in', () => {
    const s = open({ clerk: true });
    s.setIdentity(1, 'ada', { name: 'Ash Bellamy' });
    s.setConvenorMembership(2, true);
    const rec = s.memberRecords().get('ada')!;
    expect(rec.name).toBe('Ash Bellamy');
    expect(rec.nameSet).toBe(true);
  });

  it('keeps the acknowledgments the founder was owed and had given', () => {
    const s = open();
    s.delegate(1, 'chamber');
    const before = s.memberRecords().get('ada')!;
    const owed = new Set(before.okOwed);
    s.setConvenorMembership(2, false);
    s.setConvenorMembership(3, true);
    const after = s.memberRecords().get('ada')!;
    expect(new Set(after.okOwed)).toEqual(owed);
  });

  it('replays bit-identically with the identity carried across', () => {
    const s = open();
    s.setIdentity(1, 'ada', { name: 'Ash Bellamy', picture: 'e🦊' });
    s.setConvenorMembership(2, false);
    s.setConvenorMembership(3, true);
    const replayed = ConstitutionSession.replay([...s.logEntries()]);
    expect(replayed.logEntries()).toEqual(s.logEntries());
    expect(replayed.memberRecords().get('ada')!.nameSet).toBe(true);
    expect(replayed.memberRecords().get('ada')!.picture).toBe('e🦊');
  });
});
