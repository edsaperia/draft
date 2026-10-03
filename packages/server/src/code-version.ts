/**
 * **Which code wrote a snapshot** (plan-scaling.md Stage 3): `codeVersion()`
 * is the fingerprint of the engine's fold, the snapshot format, and the V8
 * that ran it. A snapshot carries it, and a load takes one only when it
 * matches the running code exactly — so **a code change invalidates every
 * snapshot automatically**, and the next load of each document replays in
 * full and writes a fresh one.
 *
 * - The fold's half is the sha256 of `packages/engine-core/src/**`
 *   (`scripts/engine-fingerprint.mjs`, whose lines are mirrored here and held
 *   equal by `snapshots.test.ts`). The production bundle carries no sources,
 *   so `build-server.mjs` bakes the value in as `DRAFT_ENGINE_FINGERPRINT`; a
 *   dev host computes it from the tree once, at first use.
 * - V8, because a float the fold computes through `Math` is V8's to round,
 *   and a Node upgrade that moved one would make a snapshot disagree with a
 *   replay. An upgrade costs one full replay per document, once.
 * - `SNAPSHOT_FORMAT`, moved by hand when `snapshot.ts`'s encoding or the
 *   store's row changes shape.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SNAPSHOT_FORMAT = 1;

export function engineFingerprint(srcDir: string): string {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walk(p); else files.push(p);
    }
  };
  walk(srcDir);
  const rel = files.map((f) => [relative(srcDir, f).split(sep).join('/'), f] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const h = createHash('sha256');
  for (const [name, f] of rel) {
    h.update(name); h.update('\0');
    h.update(readFileSync(f, 'utf8').replace(/\r\n/g, '\n')); h.update('\0');
  }
  return h.digest('hex');
}

/** The engine-core sources beside this file, on a dev host. */
export const ENGINE_SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'engine-core', 'src');

let cached: string | null = null;

export function codeVersion(): string {
  if (cached !== null) return cached;
  const baked = process.env.DRAFT_ENGINE_FINGERPRINT;
  const fold = baked !== undefined && baked.length > 0 ? baked : engineFingerprint(ENGINE_SRC);
  cached = `f${SNAPSHOT_FORMAT}.v8-${process.versions.v8}.${fold.slice(0, 24)}`;
  return cached;
}

/** The constitution's sources beside this file, on a dev host. */
export const CONSTITUTION_SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'constitution', 'src');

/** Moved by hand when the registry row's meaning changes shape (Stage 2). */
export const REGISTRY_FORMAT = 1;

let clockCached: string | null = null;

/**
 * **Which clock code computed a registry row's `dueT`** (plan-scaling.md
 * Stage 2, issue #219): the engine's fold (`codeVersion`) and the
 * constitution's — whose `nextClockT`, lapse ladder and bridge sweep are the
 * other half of every due time. A row written by any other build is not
 * trusted for when the document is due; the host loads it and asks again.
 * Baked into the bundle as `DRAFT_CLOCK_FINGERPRINT`, computed from the tree
 * on a dev host, as the engine's half is.
 */
export function clockVersion(): string {
  if (clockCached !== null) return clockCached;
  const baked = process.env.DRAFT_CLOCK_FINGERPRINT;
  const cons = baked !== undefined && baked.length > 0 ? baked : engineFingerprint(CONSTITUTION_SRC);
  clockCached = `r${REGISTRY_FORMAT}.${codeVersion()}.c${cons.slice(0, 24)}`;
  return clockCached;
}
