/**
 * qa-freeze — the three references a batch moves, re-frozen in one command
 * (backlog entry 189, 2026-08-28).
 *
 *   npm run qa:freeze
 *
 * Runs, in order and stopping at the first failure:
 *
 *   1. scripts/probe.mjs --update        the probes' design/reference/
 *   2. scripts/copy-check.mjs --update   design/tools/card-copy.golden.json
 *   3. scripts/founding-golden.mjs --update  founding-walk.golden.json
 *
 * The order is the cheapest-first one: the probe is about 8 seconds and
 * fails fastest, copy-check is the ~3-minute step. It stops at the first
 * non-zero exit and exits with that code, because plan-queue's `pq freeze`
 * quotes the tail of this output and commits nothing on a failure — so
 * *nothing was committed* is only an honest report if nothing after the
 * failure ran either.
 *
 * --update is deliberately NOT paired with --strict on the probe. A dead
 * step is a scenario matter — a probe step whose target is missing on the
 * live side — that a freeze neither causes nor fixes, and ci.yml's `probe`
 * job is strict and says so at every push; failing the freeze on one would
 * block the two goldens behind it for an unrelated reason.
 *
 * It commits nothing, tags nothing, checks nothing out and takes no
 * arguments. The commit is `pq freeze`'s — *plan-queue: re-freeze the
 * reference after QA of <batch>* — or a hand commit. A per-freeze `refs-*`
 * tag is no longer part of the ritual: the commit is the record.
 */
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

const STEPS = [
  { name: 'the frozen reference', script: 'scripts/probe.mjs' },
  { name: 'the copy golden', script: 'scripts/copy-check.mjs' },
  { name: 'the founding golden', script: 'scripts/founding-golden.mjs' },
];

for (const step of STEPS) {
  console.log(`\n=== ${step.name} — node ${step.script} --update`);
  const r = spawnSync(process.execPath, [join(ROOT, step.script), '--update'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  const code = r.status === null ? 1 : r.status;
  if (code !== 0) {
    console.log(`\nqa:freeze FAILED at ${step.name} (node ${step.script} --update, exit ${code}).`);
    console.log('Nothing after it ran; whatever it had already written is left in the tree.');
    process.exit(code);
  }
}

const status = spawnSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8' });
console.log('\n=== what moved');
const moved = (status.stdout || '').replace(/\s+$/, '');
if (status.status !== 0) console.log(status.stderr || 'git status --short failed');
else if (!moved) console.log('nothing to freeze — every reference already matched');
else console.log(moved);
