/**
 * **The surface reload** (Q1347; Ed, 2026-09-12: *I would have thought that
 * only deploys to the engine would break a document, not just changes to
 * the surface*). The page has no build step — `design/` is served off the
 * disk file by file — so a change to the surface alone need not restart the
 * host: CI packs the served files of the pushed commit into one tar.gz and
 * POSTs it to `/api/admin/surface`; the host unpacks it into a fresh
 * directory beside its data and serves from there from then on, stating the
 * new commit in `x-build` so every open page reloads itself and CI's
 * verification sees the commit it pushed. No process restarts, no document
 * leaves memory, no pause.
 *
 * A tar is 512-byte blocks: a header (name at 0, size in octal at 124,
 * type at 156, a ustar prefix at 345) and then the file, padded to the
 * block. That is all this reader knows, which is all `tar --format=ustar`
 * writes for a flat set of short names. Nothing here needs a dependency.
 */
import { gunzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** What the host serves from `design/`: the page files at the top of the
 *  tree and nothing below it (server.ts's asset routes are the mirror). */
export const SURFACE_NAME = /^design\/[A-Za-z0-9][A-Za-z0-9._-]*\.(js|css|html|svg|png|woff2?|txt)$/;

/** The largest upload accepted: the whole of design/'s served files are
 *  under two megabytes gzipped, and a tar of something else is not a
 *  surface. */
export const SURFACE_MAX_BYTES = 8 * 1024 * 1024;

export interface SurfaceFile { name: string; data: Buffer }

/** Unpack a gzipped ustar tar into its regular files. Throws on anything
 *  that is not one: a bad size field, a truncated body, a name outside
 *  `SURFACE_NAME`, or a link. Directories are skipped. */
export function readTarGz(gz: Buffer): SurfaceFile[] {
  const tar = gunzipSync(gz);
  const files: SurfaceFile[] = [];
  let at = 0;
  while (at + 512 <= tar.length) {
    const head = tar.subarray(at, at + 512);
    if (head.every((b) => b === 0)) break;                 // the end-of-archive blocks
    const field = (off: number, len: number): string =>
      head.subarray(off, off + len).toString('utf8').replace(/\0.*$/s, '');
    const prefix = field(345, 155);
    const name = (prefix ? prefix + '/' : '') + field(0, 100);
    const size = parseInt(field(124, 12).trim() || '0', 8);
    const type = field(156, 1) || '0';
    if (!Number.isFinite(size) || size < 0) throw new Error(`surface: bad size for '${name}'`);
    const bodyAt = at + 512;
    if (bodyAt + size > tar.length) throw new Error(`surface: '${name}' is truncated`);
    if (type === '0' || type === '') {
      const clean = name.replace(/^\.\//, '');
      if (!SURFACE_NAME.test(clean)) throw new Error(`surface: '${clean}' is not a page file`);
      files.push({ name: clean.slice('design/'.length), data: Buffer.from(tar.subarray(bodyAt, bodyAt + size)) });
    } else if (type !== '5') {
      throw new Error(`surface: '${name}' is a type ${type} entry, not a file`);
    }
    at = bodyAt + Math.ceil(size / 512) * 512;
  }
  if (!files.some((f) => f.name === 'session-view.html')) throw new Error('surface: no session-view.html in the archive');
  return files;
}

/** Write the files into `dir` (created), the page's whole served set. */
export function installSurface(files: readonly SurfaceFile[], dir: string): string[] {
  mkdirSync(dir, { recursive: true });
  for (const f of files) writeFileSync(join(dir, f.name), f.data);
  return files.map((f) => f.name);
}

/** Pack files the way `readTarGz` reads them — the test's writer, and the
 *  shape CI's `tar --format=ustar` produces; kept beside the reader so the
 *  two cannot drift. */
export function packTar(files: readonly { name: string; data: Buffer }[]): Buffer {
  const blocks: Buffer[] = [];
  for (const f of files) {
    const head = Buffer.alloc(512, 0);
    head.write(f.name, 0, 100, 'utf8');
    head.write('0000644\0', 100, 'utf8');
    head.write('0000000\0', 108, 'utf8');
    head.write('0000000\0', 116, 'utf8');
    head.write(f.data.length.toString(8).padStart(11, '0') + '\0', 124, 'utf8');
    head.write('00000000000\0', 136, 'utf8');
    head.write('        ', 148, 'utf8');               // checksum field is spaces while summing
    head.write('0', 156, 'utf8');
    head.write('ustar\0', 257, 'utf8');
    head.write('00', 263, 'utf8');
    let sum = 0;
    for (const b of head) sum += b;
    head.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 'utf8');
    blocks.push(head, f.data, Buffer.alloc((512 - (f.data.length % 512)) % 512, 0));
  }
  blocks.push(Buffer.alloc(1024, 0));
  return Buffer.concat(blocks);
}
