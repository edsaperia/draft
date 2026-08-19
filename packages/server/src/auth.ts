/**
 * Magic-link auth (Q368, SPEC §9.7a/§9.7½): the email is the identity, the
 * link is the login. Tokens are single-use, expiring, and stored hashed —
 * a copy of tokens.json alone mints nothing. Sessions are stateless HMAC
 * cookies over (docId, memberId, expiry); the server keeps no session
 * table, so a restart logs nobody out.
 */
import { createHmac, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sha256Hex } from '../../constitution/src/index.js';

export interface PendingCreate {
  title: string;
  slug: string;
  email: string;
  isMember: boolean;
  /** Hash of the pre-save text stash's capability id (§9.7a v0.55). */
  stashKey?: string;
}

export interface TokenRecord {
  kind: 'create' | 'login' | 'apply';
  email: string;
  expMs: number;
  docId?: string;
  memberId?: string;
  applicantId?: string;
  pending?: PendingCreate;
}

const TOKEN_TTL_MS = 7 * 24 * 3600_000;
const COOKIE_TTL_MS = 90 * 24 * 3600_000;

export class Auth {
  private readonly tokensPath: string;
  private readonly tokens: Map<string, TokenRecord>;

  constructor(private readonly secret: string, dataDir: string) {
    this.tokensPath = join(dataDir, 'tokens.json');
    this.tokens = new Map(
      existsSync(this.tokensPath)
        ? Object.entries(JSON.parse(readFileSync(this.tokensPath, 'utf8')) as
            Record<string, TokenRecord>)
        : [],
    );
  }

  mintToken(rec: Omit<TokenRecord, 'expMs'>, nowMs: number): string {
    const token = randomBytes(24).toString('base64url');
    this.tokens.set(sha256Hex(token), { ...rec, expMs: nowMs + TOKEN_TTL_MS });
    this.save();
    return token;
  }

  /** Single use: a token that verifies is deleted in the act. */
  useToken(token: string, nowMs: number): TokenRecord | null {
    const key = sha256Hex(token);
    const rec = this.tokens.get(key);
    if (!rec) return null;
    this.tokens.delete(key);
    this.save();
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
    if (this.sign(body) !== parts[3]) return null;
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

  private save(): void {
    writeFileSync(this.tokensPath,
      JSON.stringify(Object.fromEntries(this.tokens), null, 2), 'utf8');
  }
}

const b64 = (s: string): string => Buffer.from(s, 'utf8').toString('base64url');
const unb64 = (s: string): string => Buffer.from(s, 'base64url').toString('utf8');
