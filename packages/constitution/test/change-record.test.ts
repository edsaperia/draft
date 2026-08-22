/**
 * A change carries a reason, and announces itself (Q530, Ed 2026-08-22).
 *
 * Two halves of one idea. The pen is the only route that changes a rule
 * without asking anybody, and it was also the only one that left no reason
 * behind — which is backwards, since a change nobody got to argue about is
 * the one most worth explaining. And a change should be news: the founder
 * has undone something the room was living under.
 *
 * The exception is the founder deciding something for the *first* time,
 * which is not a change at all — there is no *from*, and a room told that
 * the founder has decided fifteen things nobody asked them about is noise.
 * That distinction is `previousValue`, folded from events the log already
 * carried, so nothing about the hash chain moves to get it.
 */
import { describe, it, expect } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { view } from '../src/view.js';
import { chainHash } from '../src/hash.js';

const open = () => ConstitutionSession.open({
  title: 'T', slug: 't',
  convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
}, 0);

describe('the reason for a change (Q530)', () => {
  it('a set with no reason emits exactly the event it always did', () => {
    const s = open();
    s.setSetting(1, 'chamber', { rung: 'closed' });
    const e = s.logEntries().find((x) => x.event.type === 'setting-set')!;
    expect(Object.keys(e.event).sort()).toEqual(['by', 'setting', 't', 'type', 'value']);
    // and the hash is the hash of that event, with no undefined key in it
    expect(e.hash).toBe(chainHash(e.prevHash, e.event));
  });

  it('a blank reason is dropped, so it is the same event again', () => {
    const s = open();
    s.setSetting(1, 'chamber', { rung: 'closed' }, '   ');
    const e = s.logEntries().find((x) => x.event.type === 'setting-set')!;
    expect('why' in e.event).toBe(false);
  });

  it('a real reason rides the event and reaches the projection', () => {
    const s = open();
    s.setSetting(1, 'chamber', { rung: 'closed' });
    s.setSetting(2, 'chamber', { rung: 'link' }, 'The archive needs to cite us.');
    const st = s.settingState('chamber');
    expect(st.setWhy).toBe('The archive needs to cite us.');
    const v = view(s, 'ada').settings.find((x) => x.setting === 'chamber')!;
    expect(v.setWhy).toBe('The archive needs to cite us.');
  });

  it('replays bit-identically with a reason in the log', () => {
    const s = open();
    s.setSetting(1, 'chamber', { rung: 'closed' }, 'because');
    const again = ConstitutionSession.replay([...s.logEntries()]);
    expect(again.rollingHash()).toBe(s.rollingHash());
    expect(again.settingState('chamber').setWhy).toBe('because');
  });
});

describe('a first decision is not a change (Q530)', () => {
  it('deciding it for the first time records no previous value', () => {
    const s = open();
    s.setSetting(1, 'chamber', { rung: 'closed' });
    expect(s.settingState('chamber').previousValue).toBeNull();
  });

  it('changing it records what it changed from', () => {
    const s = open();
    s.setSetting(1, 'chamber', { rung: 'closed' });
    s.setSetting(2, 'chamber', { rung: 'link' });
    expect(s.settingState('chamber').previousValue).toEqual({ rung: 'closed' });
    expect(s.settingState('chamber').value).toEqual({ rung: 'link' });
  });

  it('the previous value survives replay, since it folds from the log', () => {
    const s = open();
    s.setSetting(1, 'chamber', { rung: 'closed' });
    s.setSetting(2, 'chamber', { rung: 'link' });
    const again = ConstitutionSession.replay([...s.logEntries()]);
    expect(again.settingState('chamber').previousValue).toEqual({ rung: 'closed' });
  });

  it('the title and link are set at the birth, so re-titling is a change', () => {
    const s = open();
    expect(s.settingState('title').previousValue).toBeNull();
    s.setSetting(1, 'title', { text: 'A Better Name' });
    expect(s.settingState('title').previousValue).toEqual({ text: 'T' });
  });
});

describe('who is owed an acknowledgement (Q530)', () => {
  const withMember = () => {
    const s = open();
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(2, bo);
    return { s, bo };
  };

  it('a constitutional setting owes an OK the first time, as it always has', () => {
    const { s, bo } = withMember();
    s.setSetting(3, 'chamber', { rung: 'closed' });
    expect(s.memberRecords().get(bo)!.okOwed.has('chamber')).toBe(true);
  });

  it('an ordinary setting owes nothing when the founder first decides it', () => {
    const { s, bo } = withMember();
    s.setSetting(3, 'rate', { grant: 4, cap: 8, dripMinutes: 180 });
    expect(s.memberRecords().get(bo)!.okOwed.has('rate')).toBe(false);
  });

  it('…but owes one when the founder changes it', () => {
    const { s, bo } = withMember();
    s.setSetting(3, 'rate', { grant: 4, cap: 8, dripMinutes: 180 });
    s.setSetting(4, 'rate', { grant: 1, cap: 2, dripMinutes: 600 });
    expect(s.memberRecords().get(bo)!.okOwed.has('rate')).toBe(true);
  });

  it('an OK already given is dropped by a change, so it is asked again', () => {
    const { s, bo } = withMember();
    s.setSetting(3, 'chamber', { rung: 'closed' });
    s.giveOk(4, bo, 'chamber');
    expect(s.memberRecords().get(bo)!.okOwed.has('chamber')).toBe(false);
    s.setSetting(5, 'chamber', { rung: 'link' });
    expect(s.memberRecords().get(bo)!.okOwed.has('chamber')).toBe(true);
  });

  it('the convenor is never owed their own acknowledgement', () => {
    const { s } = withMember();
    s.setSetting(3, 'chamber', { rung: 'closed' });
    expect(s.memberRecords().get('ada')!.okOwed.has('chamber')).toBe(false);
  });
});
