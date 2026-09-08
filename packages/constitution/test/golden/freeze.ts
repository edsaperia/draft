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
import type { InMemoryPeople } from '../../src/people.js';
import { goldenWalk, snapshotOf } from './walk.js';

const dir = import.meta.dirname;
const s = goldenWalk();
writeFileSync(join(dir, 'founding.jsonl'),
  s.logEntries().map((e) => JSON.stringify(e)).join('\n') + '\n');
writeFileSync(join(dir, 'founding.state.json'),
  JSON.stringify(snapshotOf(s), null, 2) + '\n');
// **The rows beside the log** (decision 1253, 2026-09-08): the walk's people,
// frozen so the replay test can be handed exactly what the host would hand
// it — and so the same replay *without* them proves the erasure claim, every
// hash identical over a roster that reads as erased. `founding-v0.jsonl`, the
// same walk with `schemaVersion` stripped (Q767), went with the old shape:
// an unversioned log is the pre-people shape now, and is refused rather than
// read, which `golden-log.test.ts` asserts from a log it builds on the spot.
writeFileSync(join(dir, 'founding.people.json'),
  JSON.stringify(Object.fromEntries((s.people as InMemoryPeople).entries()), null, 2) + '\n');
console.log(`froze ${s.logEntries().length} entries; rolling hash ${s.rollingHash()}`);
