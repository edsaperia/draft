/**
 * **Where each member is reading** (design/PRESENCE.md §1.2; Q1570, Ed
 * 2026-09-30): a table in the host's memory, never the log.
 *
 * A member's page reports the block its reading line has rested on as one
 * query field on its 4 s view poll (`?at=L7`), and the host keeps, per open
 * document, the latest place each member reported and when. Nothing is
 * written to any log — *reading a document is a write* (Q681) is the gotcha
 * this must not re-earn — so a restart forgets everything, which is right:
 * nobody is reading a host that has just come up until they poll it again.
 *
 * The member view carries `reading` for every **other** member whose entry is
 * inside `PRESENCE_TTL_MS` (seven polls). **Under the two anonymous 👤 rungs
 * the payload carries no member id** (1570.3): each row is `{ k, at }`, `k` an
 * opaque token minted per member per host boot, so a mark still glides from
 * poll to poll (decision 10) while *anonymous* is true of the bytes and not
 * only of the picture (SPEC §3.5 — the view is the blind projection).
 *
 * The tables are keyed by the loaded document object itself: a document that
 * is dropped from the store takes its table with it.
 */
import { randomBytes } from 'node:crypto';

/** How long a reported place stands without being reported again: seven polls. */
export const PRESENCE_TTL_MS = 30_000;

/** A block key as the page keys its blocks (`blocksOf`): `L<i>`. */
export const AT_OK = /^L\d{1,6}$/;

export interface Place { at: string; t: number }

/** One row of a member view's `reading`: a named member, or a token. */
export type ReadingRow = { id: string; at: string } | { k: string; at: string };

const tables = new WeakMap<object, Map<string, Place>>();
const tokens = new WeakMap<object, Map<string, string>>();
/** A per-document counter that moves when a place does (Stage 4's push: a member's stream is nudged by it). */
const gens = new WeakMap<object, number>();
const bump = (doc: object): void => { gens.set(doc, (gens.get(doc) ?? 0) + 1); };

/** How many times a place on this document has moved, since boot. Nothing else: never who, never where. */
export function presenceGen(doc: object): number { return gens.get(doc) ?? 0; }

function tableOf(doc: object): Map<string, Place> {
  let m = tables.get(doc);
  if (!m) { m = new Map(); tables.set(doc, m); }
  return m;
}

/** Record where `memberId` is reading. False, and nothing kept, on a key the page would never send. */
export function notePlace(doc: object, memberId: string, at: string, nowMs: number): boolean {
  if (!AT_OK.test(at)) return false;
  const was = tableOf(doc).get(memberId);
  tableOf(doc).set(memberId, { at, t: nowMs });
  if (was === undefined || was.at !== at || nowMs - was.t > PRESENCE_TTL_MS) bump(doc);
  return true;
}

/**
 * Keep a member's place standing without moving it (Stage 4): an open member
 * stream's heartbeat is a page still open where it last reported, now that
 * the poll that used to refresh the place is a 30 s backstop. Nothing if the
 * place has gone already — a place is only ever *made* by the page's report.
 */
export function touchPlace(doc: object, memberId: string, nowMs: number): void {
  const p = tables.get(doc)?.get(memberId);
  if (p !== undefined && nowMs - p.t <= PRESENCE_TTL_MS) p.t = nowMs;
}

/** Forget a member's place — on their removal, or when they leave the page. */
export function dropPlace(doc: object, memberId: string): void {
  if (tables.get(doc)?.delete(memberId)) bump(doc);
}

/** The place a member last reported, if still inside the TTL. */
export function placeOf(doc: object, memberId: string, nowMs: number): Place | null {
  const p = tables.get(doc)?.get(memberId);
  return p !== undefined && nowMs - p.t <= PRESENCE_TTL_MS ? p : null;
}

/**
 * The anonymous rung's token for a member: random, per member per document,
 * minted on first use and kept until the host restarts. Never derived from the
 * id, so no reader can walk back from the token to the person.
 */
export function tokenOf(doc: object, memberId: string): string {
  let m = tokens.get(doc);
  if (!m) { m = new Map(); tokens.set(doc, m); }
  let t = m.get(memberId);
  if (t === undefined) { t = randomBytes(9).toString('base64url'); m.set(memberId, t); }
  return t;
}

/**
 * What `viewer` is told: every other member's place inside the TTL, as ids
 * where faces are named (`named`) and as tokens where they are not; entries
 * past the TTL are dropped as they are met; a seat `alive` says is gone is
 * dropped too. Sorted by the key the page will key its marks on, so the
 * order carries nothing about who arrived first — the page keeps that itself.
 */
export function readingOf(doc: object, viewer: string, nowMs: number,
  opts: { named: boolean; alive: (memberId: string) => boolean }): ReadingRow[] {
  const m = tables.get(doc);
  if (!m) return [];
  const out: ReadingRow[] = [];
  for (const [id, p] of [...m]) {
    if (nowMs - p.t > PRESENCE_TTL_MS || !opts.alive(id)) { m.delete(id); continue; }
    if (id === viewer) continue;
    out.push(opts.named ? { id, at: p.at } : { k: tokenOf(doc, id), at: p.at });
  }
  const keyOf = (r: ReadingRow): string => 'id' in r ? r.id : r.k;
  return out.sort((a, b) => (keyOf(a) < keyOf(b) ? -1 : keyOf(a) > keyOf(b) ? 1 : 0));
}

/** Whether the 👤 rung names faces (PRESENCE.md §1.4): wherever a proposal may be signed. */
export function facesNamed(rung: string | null | undefined): boolean {
  return rung === 'public' || rung === 'anonymousElective' || rung === 'sealedElective';
}
