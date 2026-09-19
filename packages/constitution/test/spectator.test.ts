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
    expect(passed[1]).toMatchObject({ t: 12, motionId: m, setting: 'chamber',
      from: { rung: 'link' }, to: { rung: 'closed' }, tookMs: 2 });
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
    expect(feed[0]).toMatchObject({ t: 10, kind: 'decreed', motionId: null, setting: 'rate',
      glyph: '⏱️', route: 'pen', to: { grant: 3, cap: 6, dripMinutes: 120 },
      rationale: 'four was too many' });
    expect(feed[0]!.from).not.toBeNull();
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
