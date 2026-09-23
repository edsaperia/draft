/**
 * The spectator's half of the constitution (Q1466): what was proposed about
 * the rules and what passed, and nothing about who, which way, or anybody.
 */
import { describe, expect, it } from 'vitest';
import { settingFeed } from '../src/spectator.js';
import { buildConstituted } from './helpers.js';

describe('the settings feed (Q1466)', () => {
  it('a motion on a rule is an entry when it is put and another when it passes, each with what stood', () => {
    const { s, bo, cy } = buildConstituted();
    const before = settingFeed(s.logEntries());
    // the founding is nobody's proposal: not one entry from before the start
    expect(before).toEqual([]);

    const m = s.openMotion(10, bo, { kind: 'set', setting: 'chamber', value: { rung: 'closed' } },
      'we said things here we would not say in public');
    const put = settingFeed(s.logEntries());
    expect(put).toHaveLength(1);
    expect(put[0]).toEqual({
      t: 10, kind: 'proposed', motionId: m, setting: 'chamber', glyph: '🌍', route: 'constitutional',
      from: { rung: 'link' }, to: { rung: 'closed' },
      rationale: 'we said things here we would not say in public',
    });

    // two answers in, one to come: still one entry, and not a word about the answers
    s.answerMotion(11, 'ada', m, 'accept');
    expect(JSON.stringify(settingFeed(s.logEntries()))).toBe(JSON.stringify(put));

    s.answerMotion(12, cy, m, 'accept');
    const passed = settingFeed(s.logEntries());
    expect(passed.map((e) => e.kind)).toEqual(['proposed', 'adopted']);
    // the exact key set (issue #87 F5): a count, a tally or who is still to
    // answer added to this entry would otherwise reach the projector green
    expect(passed[1]).toEqual({ t: 12, kind: 'adopted', motionId: m, setting: 'chamber',
      glyph: '🌍', route: 'constitutional', from: { rung: 'link' }, to: { rung: 'closed' },
      rationale: 'we said things here we would not say in public', tookMs: 2 });
    // sealed: the mover is on no entry, under any key
    for (const e of passed) expect(JSON.stringify(e)).not.toContain(bo);
  });

  // **the Founder's own ✒️ on a rule is an entry, and exactly one** (issue #68
  // finding 2): the fold also synthesises a `pen:` motion record from the same
  // event, so the count is the assertion and not only the kind
  it('the Founder’s ✒️ change to a rule is one decreed entry', () => {
    const { s } = buildConstituted();
    s.setSetting(10, 'rate', { grant: 3, cap: 6, dripMinutes: 120 }, 'four was too many');
    const feed = settingFeed(s.logEntries());
    expect(feed).toHaveLength(1);
    expect(feed[0]!.from).not.toBeNull();
    // the exact key set (issue #87 F5)
    expect(feed[0]).toEqual({ t: 10, kind: 'decreed', motionId: null, setting: 'rate',
      glyph: '⏱️', route: 'pen', from: feed[0]!.from, to: { grant: 3, cap: 6, dripMinutes: 120 },
      rationale: 'four was too many' });
  });

  // **a ✒️ restating what stands changes no rule** (issue #87 F3): both sides
  // of *as it stood / as it stands* would print the same sentence
  it('a ✒️ that re-commits the standing value makes no entry', () => {
    const { s } = buildConstituted();
    s.setSetting(10, 'rate', { grant: 3, cap: 6, dripMinutes: 120 }, 'four was too many');
    s.setSetting(11, 'rate', { grant: 3, cap: 6, dripMinutes: 120 }, 'saying it again');
    expect(settingFeed(s.logEntries()).map((e) => e.t)).toEqual([10]);
  });

  // **a rules motion that ends without carrying leaves the feed** (issue #87
  // F1): Q1473 made one member's *keep* the ordinary end of a 🏛️ motion, and
  // the projector went on showing it as live for the rest of the session
  it('a motion one member votes against leaves the feed', () => {
    const { s, bo, cy } = buildConstituted();
    const m = s.openMotion(10, bo, { kind: 'set', setting: 'chamber', value: { rung: 'closed' } }, 'why');
    expect(settingFeed(s.logEntries())).toHaveLength(1);
    s.answerMotion(11, cy, m, 'keep');                 // Q1473: this ends it
    expect(s.motionRecords().get(m)!.status).toBe('held');
    expect(settingFeed(s.logEntries())).toEqual([]);
  });

  it('a motion its mover withdraws leaves the feed, and one still running is untouched', () => {
    const { s, bo, cy } = buildConstituted();
    const kept = s.openMotion(10, cy, { kind: 'set', setting: 'lapse', value: { afterMs: 7 * 86_400_000 } }, 'stay');
    const m = s.openMotion(11, bo, { kind: 'set', setting: 'chamber', value: { rung: 'closed' } }, 'why');
    s.withdrawMotion(12, bo, m);
    expect(settingFeed(s.logEntries()).map((e) => e.motionId)).toEqual([kept]);
  });

  it('a motion the close keeps leaves the feed', () => {
    // the longest answer wins the ending (800 000 here), so the tick is past it
    const { s, bo } = buildConstituted();
    s.openMotion(10, bo, { kind: 'set', setting: 'chamber', value: { rung: 'closed' } }, 'why');
    expect(settingFeed(s.logEntries())).toHaveLength(1);
    s.tick(2_000_000);
    expect(s.logEntries().some((e) => e.event.type === 'motion-kept-at-close')).toBe(true);
    expect(settingFeed(s.logEntries())).toEqual([]);
  });

  it('a motion about a person makes no entry, and her address reaches nothing', () => {
    const { s, bo } = buildConstituted();
    s.openMotion(10, bo, { kind: 'invite', email: 'dee@example.org' });
    const feed = settingFeed(s.logEntries());
    expect(feed).toEqual([]);
    expect(JSON.stringify(feed)).not.toContain('dee@');
  });

  it('💤 carries its spell in the module’s own words', () => {
    const { s, bo, cy } = buildConstituted();
    const m = s.openMotion(10, bo, { kind: 'set', setting: 'lapse', value: { afterMs: 7 * 86_400_000 } });
    s.answerMotion(11, 'ada', m, 'accept');
    s.answerMotion(12, cy, m, 'accept');
    const feed = settingFeed(s.logEntries());
    expect(feed[0]).toMatchObject({ kind: 'proposed', setting: 'lapse', glyph: '💤', from: { afterMs: null }, toSpell: '7 days' });
    expect(feed[0]!.fromSpell).toBeUndefined();
  });
});
