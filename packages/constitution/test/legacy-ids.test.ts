/**
 * A log written under a retired setting id still replays (Q903, 2026-08-27).
 *
 * 🪪's id was `membership` until entry 94 made it the price of admission
 * rather than the register; the rename came with Q903 and every log written
 * before it names the old id. `foldLegacyIds` reads it as `admission` on the
 * copy handed to the fold, leaving the entry's own bytes — and so the hash
 * chain — exactly as they were written.
 *
 * **Why this file and not `founding-v0.jsonl`.** That fixture looks like the
 * place for this and is not: since Q767 (2026-08-25) `freeze.ts` derives it
 * from *today's* walk with `schemaVersion` stripped, and `golden-log.test.ts`
 * asserts it chains to today's rolling hash — so it can only ever prove the
 * versioning fold. A fixture proving an id fold has to name the old id in
 * bytes that still chain, which means re-chaining, which is what this does.
 *
 * The legacy log is built rather than committed for the same reason a
 * hash-chained file is never hand-patched: rewriting an id changes every hash
 * after it, so the chain is rebuilt from the rewritten events. What is frozen
 * here is the *claim* — old id in, new id out, same state — not the bytes.
 */
import { describe, expect, it } from 'vitest';
import { chainHash } from '../src/hash.js';
import { ConstitutionSession } from '../src/session.js';
import type { LogEntry } from '../src/types.js';
import { goldenWalk } from './golden/walk.js';

/** Today's golden walk, rewritten to name 🪪 as `membership`, and re-chained. */
function legacyLog(): LogEntry[] {
  const back = (id: unknown) => (id === 'admission' ? 'membership' : id);
  const out: LogEntry[] = [];
  let prev = '';
  for (const entry of goldenWalk().logEntries()) {
    const e = JSON.parse(JSON.stringify(entry.event)) as
      { setting?: unknown; settings?: unknown[]; payload?: { setting?: unknown } };
    if (e.setting !== undefined) e.setting = back(e.setting);
    if (e.settings !== undefined) e.settings = e.settings.map(back);
    if (e.payload?.setting !== undefined) e.payload.setting = back(e.payload.setting);
    const hash = chainHash(prev, e);
    out.push({ seq: out.length, hash, prevHash: prev, event: e as never });
    prev = hash;
  }
  return out;
}

describe('a log written under the retired id `membership`', () => {
  it('names it — the fixture would prove nothing otherwise', () => {
    const named = legacyLog().filter((entry) => {
      const e = entry.event as unknown as { setting?: unknown; settings?: unknown[] };
      return e.setting === 'membership' || (e.settings ?? []).includes('membership');
    });
    expect(named.length).toBeGreaterThan(0);
  });

  it('replays into a session that holds 🪪 as `admission`', () => {
    const s = ConstitutionSession.replay(legacyLog());
    expect(s.verifyChain()).toBe(true);
    expect(s.settingState('admission').value).toEqual({ price: 'proposal' });
  });

  it('folds the id everywhere it can appear, not only on `setting-set`', () => {
    const s = ConstitutionSession.replay(legacyLog());
    // the golden walk owes two members an OK on 🪪 — an `ok-owed` carries the
    // id in a *list*, which is the second of the three shapes the fold reads
    const owed = [...s.memberRecords().values()].filter((m) => m.okOwed.has('admission'));
    expect(owed.length).toBeGreaterThan(0);
    for (const m of s.memberRecords().values()) {
      expect([...m.okOwed]).not.toContain('membership');
    }
  });

  it('leaves the log’s own bytes alone', () => {
    const log = legacyLog();
    const s = ConstitutionSession.replay(log);
    expect(s.rollingHash()).toBe(log[log.length - 1]!.hash);
    const written = JSON.stringify(s.logEntries());
    expect(written).toContain('"membership"');
    expect(written).not.toContain('"setting":"admission"');
  });
});
