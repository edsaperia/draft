/**
 * The server suite against real Postgres.
 *
 * `packages/server/test/pg.test.ts` runs only when DRAFT_TEST_DATABASE_URL is
 * set, and skips itself loudly when it is not — so a green `npm test` says
 * nothing whatever about the Postgres backend. Setting the variable on the
 * command line is the obvious way and the wrong one here: `VAR=x npm test` is
 * shell syntax cmd.exe does not have, and an agent's permission layer reads
 * the prefix as a second operation and refuses the whole line. So the URL
 * lives in the script instead, and the command is one plain word:
 *
 *   npm run test:pg
 *   npm run test:pg -- --reporter=verbose      (extra args reach vitest)
 *
 * The default is the pinned local container from PRODUCTION.md — `draft-pg`,
 * postgres:17-alpine, 127.0.0.1:5433, user/password/database all `draft`.
 * Port 5433, not 55432: Windows reserves that range. An existing
 * DRAFT_TEST_DATABASE_URL in the environment wins, so CI and a plan-queue
 * run can point the same command at their own database.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DEFAULT_URL = 'postgres://draft:draft@127.0.0.1:5433/draft';
const url = process.env.DRAFT_TEST_DATABASE_URL || DEFAULT_URL;

console.log(`pg suite against ${url.replace(/\/\/[^@]*@/, '//***@')}`);

const run = spawnSync('npm', ['test', '-w', '@draft/server', ...process.argv.slice(2)], {
  cwd: ROOT,
  stdio: 'inherit',
  // npm is npm.cmd on Windows, which spawn will not resolve on its own
  shell: process.platform === 'win32',
  env: { ...process.env, DRAFT_TEST_DATABASE_URL: url, DRAFT_TEST_STORE: 'pg' }
});

if (run.error) { console.error(run.error.message); process.exit(1); }
process.exit(run.status ?? 1);
