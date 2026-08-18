/**
 * The IIFE entry (plan 367a, commit 8): everything index.ts exports, hung on
 * window.CONSTITUTION by esbuild's globalName. The adapter is deliberately
 * absent — it exists for hosts that also load engine-core, and the page has
 * no use for it. platform:'browser' in bundle.config.mjs makes any node:
 * import a hard build error, which is the dependency-freedom guard.
 */

export * from './index.js';
