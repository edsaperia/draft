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

/** SPEC §4.2: the adoption cooldown "must stay short (≤5 min)". The knob's
 *  ceiling, and the reason it is a refusal rather than a clamp. */
export const COOLDOWN_MAX_MS = 5 * 60_000;

export interface ServerConfig {
  port: number;
  /** Document logs, tokens, outbox, secret. */
  dataDir: string;
  /**
   * Where the bytes live (PRODUCTION.md stage 6 — "the cutover is two
   * variables"). `file` is the JSONL layout under dataDir and the meaning
   * of an absent DRAFT_STORE; `pg` is Postgres at databaseUrl. Two
   * switches because a fresh managed database is *empty*: a single
   * "DATABASE_URL present means Postgres" rule would have the first
   * deploy carrying the URL serve an empty service while every real
   * document sat on the disk beside it. So DATABASE_URL says where the
   * database is and may be set at any time; DRAFT_STORE=pg is the
   * cutover, set only after the importer has run and its hash assertions
   * have passed — and unsetting it is the rollback, onto the disk the
   * service never stopped writing to.
   */
  store: 'file' | 'pg';
  /** The Postgres connection string; required when store is `pg`. */
  databaseUrl: string | null;
  /** Absolute origin used in mailed links, e.g. https://docs.vote */
  baseUrl: string;
  /** The static surface (design/) served at /design and /d/:slug. */
  designDir: string;
  /** Real mail when set; the dev outbox otherwise. */
  resendApiKey: string | null;
  mailFrom: string;
  /**
   * The mail kill-switch (`DRAFT_MAIL_OFF=1`, PRODUCTION.md stage 16).
   * The sender loop holds every queued mail **pending**, never failed, so
   * nothing is lost and nothing goes out — and switching it back off
   * delivers the backlog rather than leaving an operator a list to re-send
   * by hand. An env-var change and a restart; no deploy.
   */
  mailOff: boolean;
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
   * Engine tuning overrides. Mostly the tests' — a test that adopts twice
   * in one second needs `cooldownMs` 0, where a room needs the §4.2
   * cooldown as shipped — but since entry 77 **the cooldown alone is also
   * an operator knob**, `DRAFT_COOLDOWN_MS`.
   *
   * The cooldown is engine tuning and never constitutional (§4.2): it
   * paces the adoption metronome and re-rates no past decision, so it is
   * correctly not a setting, not in the catalogue, and not in the record as
   * something the room agreed. What it *was* is unadjustable, and at the
   * shipped five minutes a 15-minute alpha session has three moments when
   * the document can change. Ed's answer (2026-08-21) is **one minute**,
   * comfortably inside §4.2's "must stay short (≤5 min)", which turns those
   * three into roughly fifteen. Whether its long-term home is an env knob
   * or a creation-time engine parameter beside grant and drip is Q946; the
   * env knob is what stands.
   *
   * Read at boot like everything else here, so changing it is a restart and
   * a document's *running* engine keeps whatever it was born with until
   * then. Refused above §4.2's ceiling rather than clamped: an operator who
   * asks for ten minutes has misunderstood the rule, and a silent clamp
   * would leave them believing it took.
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
  // Named here, created only by whatever writes to it (the file store, the
  // dev outbox, a persisted dev secret). On Postgres with real mail and a
  // platform secret nothing does — and on 2026-08-20 the disk was gone
  // while DRAFT_DATA_DIR still said /var/data, so an eager mkdir here
  // crash-looped every boot for a directory nothing would have used.
  const dataDir = env.DRAFT_DATA_DIR ?? join(process.cwd(), 'data');
  const port = env.PORT ? Number(env.PORT) : 8140;
  // the cutover switch must never fail open: an unrecognised value is a
  // refusal, not a fallback to the disk
  const storeRaw = env.DRAFT_STORE ?? 'file';
  if (storeRaw !== 'file' && storeRaw !== 'pg') {
    throw new Error(`DRAFT_STORE must be 'file' or 'pg' (got '${storeRaw}')`);
  }
  const databaseUrl = env.DATABASE_URL ?? null;
  if (storeRaw === 'pg' && databaseUrl === null) {
    throw new Error('DRAFT_STORE=pg requires DATABASE_URL');
  }
  // §4.2's own ceiling, refused rather than clamped (see engineTuning)
  // An empty value is *unset*, not zero. `Number('')` is 0, and a platform
  // dashboard with a blank box beside the name would otherwise hand the room
  // a cooldown of nothing — the metronome off — while reading, to whoever
  // set it, exactly like not having set it.
  const cooldownRaw = (env.DRAFT_COOLDOWN_MS ?? '').trim();
  const cooldownMs = cooldownRaw === '' ? null : Number(cooldownRaw);
  if (cooldownMs !== null
    && (!Number.isFinite(cooldownMs) || cooldownMs < 0 || cooldownMs > COOLDOWN_MAX_MS)) {
    throw new Error(
      `DRAFT_COOLDOWN_MS must be 0..${COOLDOWN_MAX_MS} (§4.2: the cooldown must stay short, `
      + `≤5 min) — got '${env.DRAFT_COOLDOWN_MS}'`);
  }
  return {
    port,
    dataDir,
    store: storeRaw,
    databaseUrl,
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
    mailOff: env.DRAFT_MAIL_OFF === '1',
    notifyEmail: (env.DRAFT_NOTIFY_EMAIL ?? 'edsaperia@gmail.com') || null,
    secret: env.DRAFT_SECRET ?? persistedSecret(dataDir),
    trustProxy: env.DRAFT_TRUST_PROXY !== undefined
      ? env.DRAFT_TRUST_PROXY === '1' : PROD_BUILD,
    proxyHops: env.DRAFT_PROXY_HOPS ? Math.max(1, Number(env.DRAFT_PROXY_HOPS)) : 1,
    buildSha: env.RENDER_GIT_COMMIT ?? env.DRAFT_BUILD_SHA ?? null,
    ...(cooldownMs === null ? {} : { engineTuning: { cooldownMs } }),
  };
}

/** A secret that survives restarts, so cookies and tokens do too. */
function persistedSecret(dataDir: string): string {
  const path = join(dataDir, 'secret.txt');
  if (existsSync(path)) return readFileSync(path, 'utf8').trim();
  mkdirSync(dataDir, { recursive: true });
  const secret = randomBytes(32).toString('base64url');
  writeFileSync(path, secret, 'utf8');
  return secret;
}
