/**
 * **The demo key's cookie** (design/DEMO.md §2.5 and Stage 2; Q1535): what
 * makes a browser Ed's on the demo document. `DRAFT_DEMO_KEY` is typed once,
 * in `/d/demo?demokey=<key>`; the host answers with `draft_demo`, which holds
 * an expiry and an HMAC keyed on the key — never the key — so rotating the
 * key kills every cookie ever minted, and a cookie read off a screen shows
 * nothing that would mint another.
 *
 * **One small shared check.** Every Ed-only demo route — the panel, Reset,
 * the seat switch (Stage 2) and the bots' start, pause and heartbeat
 * (Stage 4, `routes-demo-bots.ts`) — asks `demoGate` and nothing else, so
 * there is one place the door can be wrong.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

export const DEMO_COOKIE = 'draft_demo';
/** A year: Ed sets his browser once (DEMO.md §2.5). */
export const DEMO_COOKIE_MS = 365 * 86_400_000;

const sign = (key: string, exp: number): string =>
  createHmac('sha256', key).update(`draft-demo.${exp}`).digest('base64url');

/** `<exp>.<base64url hmac-sha256(key, 'draft-demo.' + exp)>` */
export function mintDemoCookie(key: string, nowMs: number): string {
  const exp = nowMs + DEMO_COOKIE_MS;
  return `${exp}.${sign(key, exp)}`;
}

/** Whether a cookie value is one this key minted and has not expired. */
export function demoValueOk(value: string, key: string, nowMs: number): boolean {
  const dot = value.indexOf('.');
  if (dot <= 0) return false;
  const exp = Number(value.slice(0, dot));
  if (!Number.isSafeInteger(exp) || exp <= nowMs) return false;
  const given = Buffer.from(value.slice(dot + 1), 'utf8');
  const want = Buffer.from(sign(key, exp), 'utf8');
  return given.length === want.length && timingSafeEqual(given, want);
}

/** Whether the request carries a valid `draft_demo` cookie for this key. */
export function demoCookieOk(req: IncomingMessage, key: string, nowMs: number): boolean {
  const pairs = (req.headers.cookie ?? '').split(';').map((s) => s.trim());
  const pair = pairs.find((s) => s.startsWith(`${DEMO_COOKIE}=`));
  return pair !== undefined && demoValueOk(pair.slice(DEMO_COOKIE.length + 1), key, nowMs);
}

/**
 * **The gate every Ed-only demo route asks**: `'off'` where the host has no
 * demo key (the route answers 404, byte-identical to an unknown path),
 * `'refused'` without a valid cookie (401, after the per-IP limiter), `'ok'`
 * otherwise.
 */
export function demoGate(req: IncomingMessage, key: string | null | undefined,
  nowMs: number): 'off' | 'refused' | 'ok' {
  if (!key) return 'off';
  return demoCookieOk(req, key, nowMs) ? 'ok' : 'refused';
}
