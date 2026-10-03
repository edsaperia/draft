import { mkdirSync, mkdtempSync, readFileSync, readdirSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import type { LogEntry } from '../../engine-core/src/types.js';
import { differential } from '../../engine-core/test/snapshot-differential.js';

/**
 * **Snapshot + tail equals full replay over boot-guard's fixed set**
 * (plan-scaling.md Stage 3's acceptance): the ten documents of Q1554's set,
 * one a convention of 5,364 engine entries, at K = 100, 250 and 1,000. A file
 * of its own so the runner takes it beside `snapshots.test.ts`, not after it.
 */

afterEach(() => new Promise<void>((done) => { setTimeout(done, 0); }));

const FIXTURE = join(import.meta.dirname, '..', '..', 'sim-harness', 'fixtures', 'boot-guard-set.json.gz');
const roots: string[] = [];
afterAll(() => { for (const r of roots) rmSync(r, { recursive: true, force: true }); });

function unpack(): string {
  const root = mkdtempSync(join(tmpdir(), 'draft-snapdiff-'));
  roots.push(root);
  const packed = JSON.parse(gunzipSync(readFileSync(FIXTURE)).toString('utf8')) as
    { files: Record<string, string> };
  for (const [rel, text] of Object.entries(packed.files)) {
    const to = join(root, ...rel.split('/'));
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, text);
  }
  return root;
}

const engineLog = (dir: string, id: string): LogEntry[] =>
  readFileSync(join(dir, 'docs', id, 'engine.jsonl'), 'utf8').split('\n').filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as LogEntry);
const engineDocs = (dir: string): string[] =>
  readdirSync(join(dir, 'docs')).filter((id) => existsSync(join(dir, 'docs', id, 'engine.jsonl'))).sort();

describe('snapshot + tail equals full replay over boot-guard\'s set (Stage 3)', () => {
  // one case per document and K, each synchronous for seconds at most, so the
  // worker answers vitest's heartbeat between them (memo-differential's note)
  const dir = unpack();
  for (const id of engineDocs(dir)) {
    for (const k of [100, 250, 1000]) {
      it(`${id}, K = ${k}: every K-th entry to the next${k === 1000 ? ', and to the end' : ''}`, () => {
        const log = engineLog(dir, id);
        const checked = differential(log, [k], k === 1000 || log.length < 1000);
        // a log shorter than K has no K-th entry to restore from
        expect(checked).toBeGreaterThanOrEqual(log.length > k ? Math.floor((log.length - 1) / k) : 0);
      }, 300_000);
    }
  }
});

