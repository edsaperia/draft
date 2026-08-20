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
console.log('dist/server.mjs built (production artifact)');

await build({
  ...common,
  entryPoints: ['packages/server/src/tools.ts'],
  outfile: 'dist/draft-tools.mjs',
});
console.log('dist/draft-tools.mjs built (store tools)');
