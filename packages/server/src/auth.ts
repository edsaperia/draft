/**
 * Magic-link auth (Q368, SPEC §9.7a/§9.7½): the email is the identity, the
 * link is the login. Tokens are single-use, expiring, and stored hashed —
 * a copy of the token store alone mints nothing. Sessions are stateless
 * HMAC cookies over (docId, memberId, expiry); the server keeps no session
 * table, so a restart logs nobody out.
 *
 * Since PRODUCTION.md stage 2, where tokens live is the Persistence
 * seam's business; this class keeps the semantics — hashing, single use,
 * expiry, the deferred batch — and the cookie signing, which is pure.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { sha256Hex } from '../../constitution/src/index.js';
import type { Persistence, TokenRecord } from './persistence.js';

export type { PendingCreate, TokenRecord } from './persistence.js';

const TOKEN_TTL_MS = 7 * 24 * 3600_000;
const COOKIE_TTL_MS = 90 * 24 * 3600_000;

/**
 * **The shape of a magic link, in one place** — the token, and beside it the
 * document's own address as `d`.
 *
 * A token is single-use and deleted in the act of reading it (`useToken`), so
 * a link followed twice tells the server nothing at all: not whose it was,
 * not what document it was for. That left the second follow — a double click,
 * a mail forwarded to a colleague, a corporate scanner that runs the
 * interstitial's auto-submit before the human ever clicks — with no remedy it
 * could name. The slug is a public name by design (the create mail prints it
 * in prose already) and it is not a credential, so carrying it in the clear
 * costs nothing and buys the refusal page a way forward: the document's own
 * address, and the login door there that mints a fresh link.
 */
export const magicLink = (baseUrl: string, kind: 'create' | 'login' | 'apply',
  token: string, slug: string): string =>
  `${baseUrl}/auth/${kind}?token=${token}&d=${encodeURIComponent(slug)}`;

export class Auth {
  /** Deferred mints: a relay pass writes the store once, not per mail. */
  private pending: Array<readonly [string, TokenRecord]> = [];

  constructor(
    private readonly secret: string,
    private readonly persistence: Persistence,
  ) {}

  async mintToken(rec: Omit<TokenRecord, 'expMs'>, nowMs: number): Promise<string> {
    const token = this.mintDeferred(rec, nowMs);
    await this.flush(nowMs);
    return token;
  }

  /** Mint without persisting — a caller minting a batch calls flush() once. */
  mintDeferred(rec: Omit<TokenRecord, 'expMs'>, nowMs: number): string {
    const token = randomBytes(24).toString('base64url');
    this.pending.push([sha256Hex(token), { ...rec, expMs: nowMs + TOKEN_TTL_MS }]);
    return token;
  }

  /** Persist deferred mints (one write for a whole batch), sweeping expired. */
  async flush(nowMs: number): Promise<void> {
    const batch = this.pending;
    this.pending = [];
    await this.persistence.sweepTokens(nowMs);
    if (batch.length > 0) await this.persistence.putTokens(batch);
  }

  /**
   * Drop a token by its hash, unused (finding 15's outbox). A mail that
   * exhausts its attempts carried a link nobody received, and leaving that
   * link live for the week its expiry promised is a credential in a queue
   * an operator is about to go looking through.
   */
  async revoke(hash: string): Promise<void> {
    await this.persistence.takeToken(hash);
  }

  /** Single use: a token that verifies is deleted in the act. */
  async useToken(token: string, nowMs: number): Promise<TokenRecord | null> {
    const rec = await this.persistence.takeToken(sha256Hex(token));
    if (rec === null) return null;
    return rec.expMs >= nowMs ? rec : null;
  }

  cookieFor(docId: string, memberId: string, nowMs: number): string {
    const exp = nowMs + COOKIE_TTL_MS;
    const body = [b64(docId), b64(memberId), String(exp)].join('.');
    return `${body}.${this.sign(body)}`;
  }

  verifyCookie(value: string, nowMs: number): { docId: string; memberId: string } | null {
    const parts = value.split('.');
    if (parts.length !== 4) return null;
    const body = parts.slice(0, 3).join('.');
    // constant-time: a signature check must not leak how far it matched
    const expected = Buffer.from(this.sign(body), 'utf8');
    const given = Buffer.from(parts[3]!, 'utf8');
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    if (Number(parts[2]) < nowMs) return null;
    try {
      return { docId: unb64(parts[0]!), memberId: unb64(parts[1]!) };
    } catch {
      return null;
    }
  }

  private sign(body: string): string {
    return createHmac('sha256', this.secret).update(body).digest('base64url');
  }
}

const b64 = (s: string): string => Buffer.from(s, 'utf8').toString('base64url');
const unb64 = (s: string): string => Buffer.from(s, 'base64url').toString('utf8');
