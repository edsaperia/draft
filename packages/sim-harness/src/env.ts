/**
 * Minimal .env loader (no dependency): reads the repo root's .env and
 * fills process.env for keys not already set. The .env file is
 * git-ignored; see .env.example at the repo root.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function loadDotenv(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  let text: string;
  try {
    text = readFileSync(resolve(root, '.env'), 'utf8');
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    const key = m[1]!;
    if (process.env[key] !== undefined) continue;
    process.env[key] = m[2]!.replace(/^['"]|['"]$/g, '');
  }
}
