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
console.log(`froze ${s.logEntries().length} entries; rolling hash ${s.rollingHash()}`);
