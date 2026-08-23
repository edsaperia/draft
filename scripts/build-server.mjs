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
 *
 * Since stage 6 there are two artifacts: the server, and the operator's
 * store tools (import / export / verify / drill) built from the same
 * sources so the hash oracle is one implementation. `pg` bundles; its two
 * optional natives are externals it probes for at runtime and finds
 * absent, which is the path it takes in any plain install.
 */
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

/**
 * The DEV drop, asserted rather than trusted (Q674). `dropLabels` removes the
 * labelled statement, and the dev modules are reached only through a **dynamic**
 * import inside one — which is what stops esbuild resolving them at all. A
 * static import would survive the drop and ship the whole phase ladder, its
 * twenty-strong cast and its charter, because esbuild cannot prove a module's
 * top-level initialisers pure and keeps them even with no live reference. The
 * failure would be silent, so the build checks its own work.
 */
const NEVER_IN_PROD = ['dev-ladder', 'ladder.invalid', 'Bellamy', '/api/dev/'];
function assertNoDevCode(file) {
  const bytes = readFileSync(file, 'utf8');
  const found = NEVER_IN_PROD.filter((needle) => bytes.includes(needle));
  if (found.length > 0) {
    throw new Error(`${file} carries dev-only code: ${found.join(', ')} — ` +
      'a DEV-labelled block is reachable, or an import escaped its label');
  }
}

const common = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  external: ['pg-native', 'cloudflare:sockets'],
  // pg is CommonJS and require()s node builtins; in an ESM bundle esbuild
  // shims require with one that throws on exactly that. A real require,
  // built from this module's own URL, is the documented cure. Found by
  // running the artifact, not the tests: the dev path (tsx) never sees it.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module';\n" +
      'const require = __createRequire(import.meta.url);',
  },
};

await build({
  ...common,
  entryPoints: ['packages/server/src/main.ts'],
  outfile: 'dist/server.mjs',
  dropLabels: ['DEV'],
  define: { 'process.env.DRAFT_BUILD': '"prod"' },
});
assertNoDevCode('dist/server.mjs');
console.log('dist/server.mjs built (production artifact), no dev code in it');

await build({
  ...common,
  entryPoints: ['packages/server/src/tools.ts'],
  outfile: 'dist/draft-tools.mjs',
  // the same guarantee as the server's (437): no DEV code in anything
  // that ships, even though today's import graph reaches none
  dropLabels: ['DEV'],
});
assertNoDevCode('dist/draft-tools.mjs');
console.log('dist/draft-tools.mjs built (store tools), no dev code in it');
