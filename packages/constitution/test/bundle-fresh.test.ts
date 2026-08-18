import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
// @ts-expect-error — plain mjs config shared with scripts/bundle.mjs
import { ARTIFACT, BUNDLE_OPTIONS } from '../bundle.config.mjs';

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('the committed browser bundle is fresh', () => {
  it('design/constitution.js matches an in-memory rebuild byte for byte', async () => {
    const prev = process.cwd();
    process.chdir(pkgDir);
    try {
      const result = await build(BUNDLE_OPTIONS as never);
      const rebuilt = (result.outputFiles![0]!.text as string).replace(/\r\n?/g, '\n');
      const committed = readFileSync(resolve(pkgDir, ARTIFACT as string), 'utf8')
        .replace(/\r\n?/g, '\n');
      expect(committed === rebuilt,
        'design/constitution.js is stale — rebuild with: npm run bundle -w @draft/constitution',
      ).toBe(true);
    } finally {
      process.chdir(prev);
    }
  });
});
