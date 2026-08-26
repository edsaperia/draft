/**
 * SURFACE.md's tables, read the way `scripts/spec-check.mjs` reads them.
 *
 * `read`, `tableAfter` and `keysOf` are lifted verbatim from `spec-check.mjs`
 * (2026-08-27, plan-queue 38) so that a harness can consume a `<!-- spec-check:
 * <marker> -->` table without importing a module that runs its checks at
 * import. `spec-check.mjs` keeps its own private copies for now; a later plan
 * can point it here.
 *
 *   import { tableAfter } from './lib/surface-tables.mjs';
 *   tableAfter('SURFACE.md', 'events').length   // 33
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/** A repo file, by path relative to the root. */
export const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/**
 * The table after `<!-- spec-check: <marker> -->` in `rel`: one object per
 * body row, keyed by the header cells. The table is the run of pipe lines
 * after the marker, so a prose line ends it.
 */
export function tableAfter(rel, marker) {
  const s = read(rel);
  const i = s.indexOf(`<!-- spec-check: ${marker} -->`);
  if (i < 0) throw new Error(`no "${marker}" table in ${rel}`);
  // the table is the run of pipe lines after the marker — stop at its end
  const lines = [];
  for (const l of s.slice(i).split(/\r?\n/).slice(1)) {
    if (l.startsWith('|')) lines.push(l);
    else if (lines.length) break;
  }
  const cells = (l) => l.slice(1, -1).split('|').map((c) => c.trim());
  const head = cells(lines[0]);
  return lines.slice(2).map((l) => Object.fromEntries(cells(l).map((c, k) => [head[k], c])));
}

/** The page keys in a Keys cell: bare `[a-z-]+` words, parentheticals dropped. */
export const keysOf = (c) => (c || '').replace(/\(.*?\)/g, '').split(/\s+/).filter((k) => /^[a-z-]+$/.test(k));
