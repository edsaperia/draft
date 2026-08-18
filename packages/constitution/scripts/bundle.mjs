/**
 * Build design/constitution.js from src/browser.ts. LF-normalized and
 * written via node:fs, sidestepping the PowerShell encoding traps.
 */

import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTIFACT, BUNDLE_OPTIONS } from '../bundle.config.mjs';

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(pkgDir);

const result = await build(BUNDLE_OPTIONS);
const js = result.outputFiles[0].text.replace(/\r\n?/g, '\n');
const out = resolve(pkgDir, ARTIFACT);
writeFileSync(out, js);
console.log(`wrote ${out} (${js.length} bytes)`);
