/**
 * Boot (Q368): configuration from the environment, documents replayed
 * from the store, the clocks driven once a minute. `npm run server` at the
 * repo root; without RESEND_API_KEY every mail (and its magic link)
 * lands on the console and in data/outbox.jsonl.
 *
 * Shutdown (PRODUCTION.md stage 7): the platform ends a process with
 * SIGTERM on every deploy, and an append torn in half by it is the one
 * way this server can corrupt a log. So the signal stops the clock and
 * the listener, lets every in-flight commit land, releases the store,
 * and only then exits — under a hard limit, because a wedged connection
 * must not hold a deploy hostage either. An unhandled rejection exits
 * loudly: a crashed process is restarted by the platform; a half-alive
 * one is not.
 */
import { configFromEnv } from './config.js';
import { createDraftServer } from './server.js';

const SHUTDOWN_LIMIT_MS = 10_000;

const cfg = configFromEnv();
const draft = await createDraftServer(cfg);

draft.server.listen(cfg.port, () => {
  console.log(`draft server on ${cfg.baseUrl} (store: ${cfg.store}, data: ${cfg.dataDir}, ` +
    `mail: ${draft.mailer.dev ? 'dev outbox' : 'resend'}` +
    `${cfg.buildSha ? `, build: ${cfg.buildSha.slice(0, 12)}` : ''})`);
});

const clock = setInterval(() => {
  void draft.tick().catch((e: unknown) => console.error('tick failed:', e));
}, 60_000);

let stopping = false;
function shutdown(signal: string): void {
  if (stopping) return;
  stopping = true;
  console.log(`${signal} received — draining commits, then closing`);
  clearInterval(clock);
  const limit = setTimeout(() => {
    console.error(`shutdown exceeded ${SHUTDOWN_LIMIT_MS}ms — exiting anyway`);
    process.exit(1);
  }, SHUTDOWN_LIMIT_MS);
  limit.unref();
  draft.close().then(() => {
    console.log('closed cleanly');
    process.exit(0);
  }, (e: unknown) => {
    console.error('shutdown failed:', e);
    process.exit(1);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (e: unknown) => {
  console.error('unhandled rejection — exiting:', e);
  process.exit(1);
});
process.on('uncaughtException', (e: unknown) => {
  console.error('uncaught exception — exiting:', e);
  process.exit(1);
});
