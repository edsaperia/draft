/**
 * **No legacy fold** (Q1329, Ed 2026-09-11: *we are still in alpha — please
 * get rid of old formats, there are no old documents*).
 *
 * Until then the module read three older shapes onto today's at replay —
 * 🤝's pre-Q506 `holder` and pre-entry-94 `joinPolicy`, 🪪 under its
 * pre-Q903 id `membership` — and replayed the pre-R-088 `signed-out` ·
 * `frozen` · `thawed` as no-ops; `legacy-events.test.ts` and
 * `legacy-ids.test.ts` pinned those readings and went with them. What is
 * pinned now is the opposite claim: a value carrying a removed key is
 * **refused at the command, naming the key**, and a log carrying any removed
 * shape **throws at replay** rather than being half-read — which is what
 * lets the host quarantine the document (`DocStore.loadAll`, Q1322) instead
 * of serving a state no page path can reach (the moon room's dead 🏛️
 * question, Q1329).
 *
 * The logs are built rather than committed, for the reason the two deleted
 * files gave: what is frozen is the claim, not the bytes.
 */
import { describe, expect, it } from 'vitest';
import { chainHash } from '../src/hash.js';
import { ConstitutionSession } from '../src/session.js';
import { entryOf, validateFor } from '../src/catalogue.js';
import { validateValue } from '../src/values.js';
import type { ConstitutionEvent, LogEntry } from '../src/types.js';
import { SCHEMA_VERSION } from '../src/types.js';
import { buildConstituted } from './helpers.js';
import { goldenWalk } from './golden/walk.js';

/** Today's golden walk with one event appended after the last entry, chained. */
function withTail(event: ConstitutionEvent): { log: LogEntry[]; s: ConstitutionSession } {
  const s = goldenWalk();
  const log = [...s.logEntries()];
  const prev = log[log.length - 1]!.hash;
  log.push({ seq: log.length, hash: chainHash(prev, event), prevHash: prev, event,
    schemaVersion: SCHEMA_VERSION });
  return { log, s };
}

describe('🤝 is exactly { apply: boolean } (Q1329)', () => {
  it('refuses the pre-Q506 `holder`, naming the key', () => {
    expect(validateValue('applications', { holder: 'members', apply: true }))
      .toMatch(/unknown key 'holder'/);
  });

  it('refuses the pre-entry-94 `joinPolicy`, naming the key', () => {
    expect(validateValue('applications', { joinPolicy: 'invite' }))
      .toMatch(/unknown key 'joinPolicy'/);
  });

  it('refuses any other key the same way, and the switch must be a boolean', () => {
    expect(validateValue('applications', { apply: true, open: 1 })).toMatch(/unknown key 'open'/);
    expect(validateValue('applications', {})).toMatch(/\{ apply: boolean \} required/);
    expect(validateValue('applications', { apply: 'yes' })).toMatch(/\{ apply: boolean \} required/);
    expect(validateValue('applications', { apply: false })).toBeNull();
    expect(validateFor(entryOf('applications'), { apply: true })).toBeNull();
  });

  it('the command refuses it with the same sentence, and the log is untouched', () => {
    const { s } = buildConstituted();
    const before = s.logEntries().length;
    expect(() => s.setSetting(3, 'applications', { holder: 'members', apply: true } as never))
      .toThrow(/unknown key 'holder'/);
    expect(s.logEntries().length).toBe(before);
  });
});

describe('a log carrying a removed shape throws at replay, never half-reads (Q1329)', () => {
  it('a `setting-set` carrying the legacy holder', () => {
    const { log, s } = withTail({ type: 'setting-set', t: 19, setting: 'applications',
      value: { holder: 'members', apply: true }, by: 'convenor' } as unknown as ConstitutionEvent);
    expect(() => ConstitutionSession.replay(log, s.people)).toThrow(/unknown key 'holder'/);
  });

  it('an `answer-given` carrying the legacy joinPolicy', () => {
    const { log, s } = withTail({ type: 'answer-given', t: 19, member: 'ada',
      setting: 'applications', value: { joinPolicy: 'open' } } as unknown as ConstitutionEvent);
    expect(() => ConstitutionSession.replay(log, s.people)).toThrow(/unknown key 'joinPolicy'/);
  });

  it('a `setting-set` naming 🪪 by its pre-Q903 id', () => {
    const { log, s } = withTail({ type: 'setting-set', t: 19, setting: 'membership',
      value: { price: 'proposal' }, by: 'convenor' } as unknown as ConstitutionEvent);
    expect(() => ConstitutionSession.replay(log, s.people)).toThrow(/unknown setting 'membership'/);
  });

  it('the pre-R-088 freeze', () => {
    const { log, s } = withTail({ type: 'frozen', t: 19 } as unknown as ConstitutionEvent);
    expect(() => ConstitutionSession.replay(log, s.people)).toThrow(/unhandled event 'frozen'/);
  });

  it('and the same walk without the tail replays as it always did', () => {
    const s = goldenWalk();
    const r = ConstitutionSession.replay([...s.logEntries()], s.people);
    expect(r.rollingHash()).toBe(s.rollingHash());
  });
});
