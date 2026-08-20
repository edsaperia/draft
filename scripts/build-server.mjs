/**
 * The production build (PRODUCTION.md stage 1, decision 435): one bundle,
 * booted by bare node — the bytes CI tested are the bytes that serve.
 * Through esbuild's JS API rather than its CLI because the define below
 * is a quoted string, and Windows shells eat the quotes (found the hard
 * way: the define arrived as a bare identifier and the artifact crashed
 * on boot).
 *
 * DRAFT_BUILD='prod' is what makes this artifact the production one:
 * config refuses to boot half-configured, and the DEV-labelled dev-outbox
 * route is dropped bodily (--drop-labels, decision 437).
 */
import { build } from 'esbuild';

await build({
  entryPoints: ['packages/server/src/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  outfile: 'dist/server.mjs',
  dropLabels: ['DEV'],
  define: { 'process.env.DRAFT_BUILD': '"prod"' },
});
console.log('dist/server.mjs built (production artifact)');
