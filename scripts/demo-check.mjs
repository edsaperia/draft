/**
 * **`npm run demo-check`** (design/DEMO.md §3.2; Q1535): the demo preset
 * against its contract, the way Ed's edits are caught before they reach a
 * host. Two halves, every failure of each printed, never just the first:
 *
 *  - **P1–P10** — `parsePreset` over `design/demo/pizzacon-2027.md`;
 *  - **P11** — the preset built in memory, exactly as the host builds it at
 *    boot and at every Reset, and read back: every decided change adopted and
 *    the text after them equal to `@text`, every open proposal live with as
 *    many hunks as it has sites, every contested one judged against, the cast
 *    arrived. It is built twice, at the host's own pacing (no cooldown, the
 *    default since R-086) and at the engine's five-minute cooldown, so a host
 *    that switches pacing on still builds the same document.
 *
 * The scratch store's persistence throws on any call: the demo document is
 * ephemeral (D1), so a build that reached the store at all is a failure here
 * before it is one on docs.vote.
 *
 * Run under tsx, since it imports the server's TypeScript directly. Exit 1
 * on any failure. `--file=<path>` checks another file (the tests use it).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parsePreset, presetPath } from '../packages/server/src/demo-preset.ts';
import { buildDemo, verifyBuild, DEMO_DEFAULTS } from '../packages/server/src/demo-build.ts';
import { DocStore } from '../packages/server/src/store.ts';
import { driveBridge } from '../packages/server/src/engine-host.ts';

const ROOT = join(import.meta.dirname, '..');
const fileArg = process.argv.find((a) => a.startsWith('--file='));
const file = fileArg ? fileArg.slice('--file='.length) : presetPath(join(ROOT, 'design'));

const say = (s) => console.log(s);
const failures = [];
const src = readFileSync(file, 'utf8');
const { preset, errors } = parsePreset(src);
say(`demo-check — ${file}`);
for (const e of errors) failures.push(e);

if (preset !== null) {
  say(`  parsed: "${preset.title}", ${preset.text.length} lines, ${preset.decided.length} decided, ` +
    `${preset.open.length} open, ${preset.cast.length} in the cast`);
  const defaults = [...DEMO_DEFAULTS.keys()].filter((k) => !preset.rules.has(k));
  if (defaults.length > 0) say(`  builder defaults for: ${defaults.join(', ')}`);

  /** A store no demo build may touch (D1): every call is a failure. */
  const untouchable = new Proxy({}, {
    get: (_t, name) => () => { throw new Error(`the demo build reached the store (${String(name)})`); },
  });
  for (const cooldownMs of [0, 5 * 60_000]) {
    const store = new DocStore(untouchable);
    const tuning = { cooldownMs };
    const commit = async (doc, nowMs) => {
      driveBridge(doc, Math.max(nowMs, lastT(doc)), tuning);
      await store.persist(doc);
      return doc.cs.logEntries().length;
    };
    try {
      const b = await buildDemo({ store, commit }, preset, { nowMs: Date.now() });
      const bad = verifyBuild(preset, b);
      for (const f of bad) failures.push({ ...f, message: `${f.message} (cooldown ${cooldownMs / 60_000} min)` });
      if (bad.length === 0) {
        say(`  built at cooldown ${cooldownMs / 60_000} min: ${b.built.join('; ')}`);
      }
    } catch (e) {
      failures.push({ line: 1, rule: 'P11', message: `the build threw at cooldown ${cooldownMs / 60_000} min: ${e.message}` });
    }
  }
}

function lastT(doc) {
  const log = doc.cs.logEntries();
  return log.length > 0 ? log[log.length - 1].event.t : 0;
}

if (failures.length > 0) {
  for (const f of failures) say(`  ✗ ${f.rule} line ${f.line}: ${f.message}`);
  say(`demo-check: ${failures.length} failure${failures.length === 1 ? '' : 's'}`);
  process.exit(1);
}
say('demo-check: the preset parses and builds as it says');
