/**
 * The single source of esbuild options — imported by BOTH scripts/bundle.mjs
 * and test/bundle-fresh.test.ts, so the bundler and the freshness gate can
 * never drift apart. esbuild is pinned exactly (0.28.2, root package.json)
 * because bytes are compared.
 */

export const BUNDLE_OPTIONS = {
  entryPoints: ['src/browser.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'CONSTITUTION',
  platform: 'browser', // any node: import becomes a hard build error
  target: 'es2020',
  charset: 'utf8',
  minify: false,
  sourcemap: false,
  write: false,
  banner: {
    js: '/* GENERATED — do not edit. Source: packages/constitution. ' +
      'Rebuild: npm run bundle */',
  },
};

export const ARTIFACT = '../../design/constitution.js';
