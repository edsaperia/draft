/**
 * Freeze the golden log (PRODUCTION.md stage 5).
 *
 *   npm run golden:freeze -w @draft/constitution
 *
 * Run this ONLY when the walk or the event format changed on purpose, and
 * read the diff before committing it: a re-freeze is the moment a format
 * change becomes permitted, so an unread one is the safety net being cut
 * rather than moved. The same idiom as design/reference/ — the frozen copy
 * is never edited by hand, only regenerated.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { goldenWalk, snapshotOf } from './walk.js';

const dir = import.meta.dirname;
const s = goldenWalk();
writeFileSync(join(dir, 'founding.jsonl'),
  s.logEntries().map((e) => JSON.stringify(e)).join('\n') + '\n');
writeFileSync(join(dir, 'founding.state.json'),
  JSON.stringify(snapshotOf(s), null, 2) + '\n');
// **founding-v0.jsonl is the same walk with the field stripped** (Q767,
// 2026-08-25). It had been the literal bytes the code of 2026-08-20 wrote,
// and stayed correct until a setting was deleted from the catalogue: a log
// naming a setting this build does not have cannot be replayed, and a
// hash-chained file cannot be hand-patched. What the fixture is *for* is a
// log that genuinely lacks `schemaVersion`, so it is rebuilt from today's
// entries with the field removed — and because the version rides outside
// the hash, the stripped copy must chain to exactly the hash above, which
// is now the assertion rather than an accident of history.
writeFileSync(join(dir, 'founding-v0.jsonl'),
  s.logEntries().map((e) => {
    const { schemaVersion: _v, ...rest } = e as unknown as Record<string, unknown>;
    return JSON.stringify(rest);
  }).join('\n') + '\n');
console.log(`froze ${s.logEntries().length} entries; rolling hash ${s.rollingHash()}`);
