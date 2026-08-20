/**
 * Server configuration (Q368). Everything from the environment, with dev
 * defaults that need no setup: a data directory beside the repo, the dev
 * mailer (links land in the console and data/outbox.jsonl), a persisted
 * random secret. RESEND_API_KEY switches real mail on; nothing else does.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ServerConfig {
  port: number;
  /** Document logs, tokens, outbox, secret. */
  dataDir: string;
  /** Absolute origin used in mailed links, e.g. https://docs.vote */
  baseUrl: string;
  /** The static surface (design/) served at /design and /d/:slug. */
  designDir: string;
  /** Real mail when set; the dev outbox otherwise. */
  resendApiKey: string | null;
  mailFrom: string;
  /** HMAC secret for cookies and tokens at rest. */
  secret: string;
  /**
   * Engine tuning overrides (tests and dev only — production runs the
   * defaults; deliberately not read from the environment). The one known
   * use is pacing: a test that adopts twice in one second needs
   * cooldownMs 0, where a room needs the §4.2 cooldown as shipped.
   */
  engineTuning?: Partial<import('../../constitution/src/adapter.js').EngineTuning>;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const dataDir = env.DRAFT_DATA_DIR ?? join(process.cwd(), 'data');
  mkdirSync(dataDir, { recursive: true });
  const port = env.PORT ? Number(env.PORT) : 8140;
  return {
    port,
    dataDir,
    baseUrl: env.DRAFT_BASE_URL ?? `http://localhost:${port}`,
    // dev runs from packages/server (../../design); the built bundle runs
    // from the repo root (./design). Whichever exists wins; DRAFT_DESIGN_DIR
    // overrides both.
    designDir: env.DRAFT_DESIGN_DIR ?? [
      join(process.cwd(), 'design'),
      join(process.cwd(), '..', '..', 'design'),
    ].find(existsSync) ?? join(process.cwd(), 'design'),
    resendApiKey: env.RESEND_API_KEY ?? null,
    mailFrom: env.DRAFT_MAIL_FROM ?? 'docs.vote <invitations@docs.vote>',
    secret: env.DRAFT_SECRET ?? persistedSecret(dataDir),
  };
}

/** A secret that survives restarts, so cookies and tokens do too. */
function persistedSecret(dataDir: string): string {
  const path = join(dataDir, 'secret.txt');
  if (existsSync(path)) return readFileSync(path, 'utf8').trim();
  const secret = randomBytes(32).toString('base64url');
  writeFileSync(path, secret, 'utf8');
  return secret;
}
