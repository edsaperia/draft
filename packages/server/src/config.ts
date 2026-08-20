/**
 * Server configuration (Q368). Everything from the environment, with dev
 * defaults that need no setup: a data directory beside the repo, the dev
 * mailer (links land in the console and data/outbox.jsonl), a persisted
 * random secret. RESEND_API_KEY switches real mail on; nothing else does.
 *
 * PROD_BUILD is a build-time constant, not configuration: esbuild bakes
 * it true into dist/server.mjs (`npm run build`), and the production
 * artifact then refuses to boot half-configured (PRODUCTION.md stage 3,
 * defect 9) — a missing RESEND_API_KEY must be a crash at startup, never
 * a server quietly serving everyone's magic links from a dev outbox
 * (defect 1). The dev path (tsx) sees it false and keeps its defaults.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** True only in the built artifact — see the header. Deliberately read
 *  from the literal `process.env` (the define target), never from the
 *  injectable `env` parameter: it is a fact about the bytes, not the
 *  environment. */
export const PROD_BUILD = process.env.DRAFT_BUILD === 'prod';

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
   * Operator notification: every document birth (the §9.7a save — the
   * founder's verified link, never the unverified request) is mailed
   * here. DRAFT_NOTIFY_EMAIL overrides; set it empty to switch off.
   */
  notifyEmail: string | null;
  /**
   * The commit this process was built from, served as `x-build` when
   * known. It exists because CI could not otherwise tell *which* bytes
   * it had just verified: a deploy takes minutes to build while the old
   * instance keeps answering 200, so a check that waits for "the service
   * is up" verifies the build it was meant to replace. Render states it
   * as RENDER_GIT_COMMIT; DRAFT_BUILD_SHA covers anywhere else. Public
   * by design — the repository is public, and knowing which commit is
   * deployed is exactly what an operator (and a bug report) needs.
   */
  buildSha: string | null;
  /**
   * Behind a TLS-terminating proxy (Render): trust x-forwarded-* for the
   * client IP and the original protocol. Defaults on in the prod build,
   * off in dev; DRAFT_TRUST_PROXY=1/0 overrides either way.
   */
  trustProxy: boolean;
  /**
   * How many proxies append to x-forwarded-for on the way in, which is
   * how far from the right the client's own entry sits. Only consulted
   * when the proxy states the client no other way — on Render,
   * Cloudflare's own header answers first (see `ipOf`). Default 1;
   * DRAFT_PROXY_HOPS overrides. Never guess this upward "to be safe": a
   * hop count larger than the real chain reads an entry the client
   * supplied, which is the spoof the count exists to prevent.
   */
  proxyHops?: number;
  /**
   * Engine tuning overrides (tests and dev only — production runs the
   * defaults; deliberately not read from the environment). The one known
   * use is pacing: a test that adopts twice in one second needs
   * cooldownMs 0, where a room needs the §4.2 cooldown as shipped.
   */
  engineTuning?: Partial<import('../../constitution/src/adapter.js').EngineTuning>;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  if (PROD_BUILD) {
    // fail fast, name everything missing at once
    const missing: string[] = [];
    if (!env.DRAFT_SECRET) missing.push('DRAFT_SECRET');
    if (!env.DRAFT_BASE_URL) missing.push('DRAFT_BASE_URL');
    if (!env.RESEND_API_KEY) missing.push('RESEND_API_KEY');
    if (missing.length > 0) {
      throw new Error(`production build refuses to boot without: ${missing.join(', ')}`);
    }
    if (!env.DRAFT_BASE_URL!.startsWith('https://')) {
      throw new Error('production build requires an https DRAFT_BASE_URL');
    }
  }
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
    // the sending domain is mail.docs.vote (decision 433): a subdomain
    // keeps deliverability reputation off the domain the product lives on
    mailFrom: env.DRAFT_MAIL_FROM ?? 'docs.vote <invitations@mail.docs.vote>',
    notifyEmail: (env.DRAFT_NOTIFY_EMAIL ?? 'edsaperia@gmail.com') || null,
    secret: env.DRAFT_SECRET ?? persistedSecret(dataDir),
    trustProxy: env.DRAFT_TRUST_PROXY !== undefined
      ? env.DRAFT_TRUST_PROXY === '1' : PROD_BUILD,
    proxyHops: env.DRAFT_PROXY_HOPS ? Math.max(1, Number(env.DRAFT_PROXY_HOPS)) : 1,
    buildSha: env.RENDER_GIT_COMMIT ?? env.DRAFT_BUILD_SHA ?? null,
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
