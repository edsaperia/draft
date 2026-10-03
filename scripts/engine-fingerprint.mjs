/**
 * **The engine fold's fingerprint** (plan-scaling.md Stage 3): the sha256 of
 * every file under `packages/engine-core/src`, path and bytes, in sorted
 * order. A snapshot of the engine's fold is valid only under the code that
 * wrote it, and the fold is engine-core and nothing else (the package has no
 * dependencies), so any edit there — a comment included — moves this.
 *
 * Two callers compute it: `build-server.mjs` bakes it into the bundle, which
 * carries no sources, and `packages/server/src/code-version.ts` computes it
 * from the tree on a dev host. That file keeps its own copy of these lines
 * (the server is TypeScript and this is a script), and
 * `snapshots.test.ts` asserts the two agree on the tree they run in.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export function engineFingerprint(srcDir) {
  const files = [];
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walk(p); else files.push(p);
    }
  };
  walk(srcDir);
  const rel = files.map((f) => [relative(srcDir, f).split(sep).join('/'), f]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const h = createHash('sha256');
  for (const [name, f] of rel) {
    h.update(name); h.update('\0');
    // line endings are not the fold's: a Windows checkout must agree with CI's
    h.update(readFileSync(f, 'utf8').replace(/\r\n/g, '\n')); h.update('\0');
  }
  return h.digest('hex');
}
