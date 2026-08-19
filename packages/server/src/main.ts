/**
 * Boot (Q368): configuration from the environment, documents replayed
 * from disk, the clocks driven once a minute. `npm run server` at the
 * repo root; without RESEND_API_KEY every mail (and its magic link)
 * lands on the console and in data/outbox.jsonl.
 */
import { configFromEnv } from './config.js';
import { createDraftServer } from './server.js';

const cfg = configFromEnv();
const draft = createDraftServer(cfg);

draft.server.listen(cfg.port, () => {
  console.log(`draft server on ${cfg.baseUrl} (data: ${cfg.dataDir}, ` +
    `mail: ${draft.mailer.dev ? 'dev outbox' : 'resend'})`);
});

setInterval(() => draft.tick(), 60_000);
