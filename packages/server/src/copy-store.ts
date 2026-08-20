/**
 * Copying one store into another, with the hash chain as the oracle
 * (PRODUCTION.md stage 6, and stage 11's restore drill). One function,
 * two directions: file → Postgres is the importer; Postgres → file is the
 * backup export; and `verifyStores` is the same walk without writing.
 *
 * The contract the mandate sets, never relaxed: after a copy, **every
 * rolling hash is identical** between source and destination. That is
 * checked three ways per document — entry by entry (seq, prevHash, hash,
 * and the event's own serialisation) on both logs, and then by replaying
 * the destination's document log through ConstitutionSession.replay,
 * which re-verifies the chain from genesis and must end on the source's
 * last hash. A failed assertion throws before anything else is copied.
 *
 * Re-runnable: a document already present at the destination has its
 * existing prefix compared entry for entry, and only the remainder is
 * appended — so a second run after a partial first one finishes the job,
 * and a run against a destination that has *diverged* refuses rather
 * than forks. Tokens and stashes upsert; provisional text and bridge
 * state are overwritten with the source's (the source is the truth while
 * the importer runs).
 */
import { ConstitutionSession } from '../../constitution/src/index.js';
import type { LogEntry } from '../../constitution/src/index.js';
import type { Persistence } from './persistence.js';

interface Chained { seq: number; hash: string; prevHash: string; event: unknown; schemaVersion?: number }

export interface CopyReport {
  documents: number;
  /** Document ids whose logs were already complete at the destination. */
  unchanged: string[];
  /** Document ids that gained entries. */
  copied: string[];
  docEntries: number;
  engineEntries: number;
  tokens: number;
  stashes: number;
}

export interface CopyOptions {
  /** Copy tokens and stashes too (default true). A backup wants them; a
   *  verify-only walk ignores them. */
  sidecars?: boolean;
  log?: (line: string) => void;
}

// the whole envelope, not only what the hash covers: schemaVersion sits
// outside the hash by design (stage 5), so the oracle must compare it
// itself (review #2, finding 4)
const same = (a: Chained, b: Chained): boolean =>
  a.seq === b.seq && a.hash === b.hash && a.prevHash === b.prevHash &&
  a.schemaVersion === b.schemaVersion &&
  JSON.stringify(a.event) === JSON.stringify(b.event);

/** Compare a destination prefix against the source; throw on the first
 *  disagreement. Returns how many entries the destination already holds. */
function prefixMatches(id: string, what: string, src: readonly Chained[],
  dst: readonly Chained[]): number {
  if (dst.length > src.length) {
    throw new Error(`${id}: destination ${what} is longer than the source ` +
      `(${dst.length} > ${src.length}) — refusing to touch it`);
  }
  for (let i = 0; i < dst.length; i++) {
    if (!same(src[i]!, dst[i]!)) {
      throw new Error(`${id}: ${what} diverges at seq ${dst[i]!.seq} ` +
        `(source ${src[i]!.hash.slice(0, 12)}, destination ${dst[i]!.hash.slice(0, 12)})`);
    }
  }
  return dst.length;
}

/** Every hash identical, both logs, and the destination replays to the
 *  source's last hash. Throws with the document named on any failure. */
export async function assertIdentical(id: string, from: Persistence, to: Persistence):
  Promise<{ docEntries: number; engineEntries: number }> {
  const [srcDoc, dstDoc, srcEng, dstEng] = await Promise.all([
    from.readDocLog(id), to.readDocLog(id),
    from.readEngineLog(id) as Promise<Chained[]>, to.readEngineLog(id) as Promise<Chained[]>,
  ]);
  if (dstDoc.length !== srcDoc.length) {
    throw new Error(`${id}: document log has ${dstDoc.length} entries at the ` +
      `destination, ${srcDoc.length} at the source`);
  }
  if (dstEng.length !== srcEng.length) {
    throw new Error(`${id}: engine log has ${dstEng.length} entries at the ` +
      `destination, ${srcEng.length} at the source`);
  }
  prefixMatches(id, 'document log', srcDoc, dstDoc);
  prefixMatches(id, 'engine log', srcEng, dstEng);
  // the chain itself, from genesis: replay re-verifies every link
  const replayed = ConstitutionSession.replay(dstDoc);
  const last = replayed.logEntries().at(-1)?.hash ?? '';
  const want = srcDoc.at(-1)?.hash ?? '';
  if (last !== want) {
    throw new Error(`${id}: replay of the destination ends on ${last.slice(0, 12)}, ` +
      `the source on ${want.slice(0, 12)}`);
  }
  const [srcProv, dstProv, srcBridge, dstBridge] = await Promise.all([
    from.readProvisional(id), to.readProvisional(id),
    from.readBridgeState(id), to.readBridgeState(id),
  ]);
  if (srcProv !== dstProv) throw new Error(`${id}: provisional text differs`);
  if (srcBridge !== dstBridge) throw new Error(`${id}: bridge state differs`);
  return { docEntries: srcDoc.length, engineEntries: srcEng.length };
}

export async function copyStore(from: Persistence, to: Persistence,
  opts: CopyOptions = {}): Promise<CopyReport> {
  const log = opts.log ?? (() => undefined);
  const report: CopyReport = {
    documents: 0, unchanged: [], copied: [], docEntries: 0, engineEntries: 0,
    tokens: 0, stashes: 0,
  };
  const ids = await from.listDocIds();
  for (const id of ids) {
    report.documents += 1;
    const srcDoc = await from.readDocLog(id);
    const srcEng = await from.readEngineLog(id) as Chained[];
    await to.createDoc(id);
    const haveDoc = prefixMatches(id, 'document log', srcDoc, await to.readDocLog(id));
    const haveEng = prefixMatches(id, 'engine log', srcEng, await to.readEngineLog(id) as Chained[]);
    // bridge state before the engine log, as the server does (review #1,
    // finding 5): state-without-log resumes as nothing; log-without-state
    // is a torn genesis
    const bridge = await from.readBridgeState(id);
    if (bridge !== null) await to.writeBridgeState(id, bridge);
    if (haveDoc < srcDoc.length) await to.appendDocLog(id, srcDoc.slice(haveDoc) as LogEntry[]);
    if (haveEng < srcEng.length) await to.appendEngineLog(id, srcEng.slice(haveEng));
    await to.writeProvisional(id, await from.readProvisional(id));
    const { docEntries, engineEntries } = await assertIdentical(id, from, to);
    report.docEntries += docEntries;
    report.engineEntries += engineEntries;
    const moved = haveDoc < srcDoc.length || haveEng < srcEng.length;
    (moved ? report.copied : report.unchanged).push(id);
    log(`${id}: ${docEntries} + ${engineEntries} entries, ` +
      `${moved ? `copied from seq ${haveDoc}` : 'already complete'}, hashes identical`);
  }
  if (opts.sidecars !== false) {
    const { tokens, stashes } = await copySidecars(from, to);
    report.tokens = tokens;
    report.stashes = stashes;
    log(`${tokens} tokens, ${stashes} stashes`);
  }
  return report;
}

/** The same walk, writing nothing: every document at the source must be
 *  at the destination with identical chains. Returns the document count. */
export async function verifyStores(from: Persistence, to: Persistence,
  opts: Pick<CopyOptions, 'log'> = {}): Promise<number> {
  const log = opts.log ?? (() => undefined);
  const ids = await from.listDocIds();
  const dstIds = new Set(await to.listDocIds());
  for (const id of ids) {
    if (!dstIds.has(id)) throw new Error(`${id}: missing at the destination`);
    const { docEntries, engineEntries } = await assertIdentical(id, from, to);
    log(`${id}: ${docEntries} + ${engineEntries} entries, hashes identical`);
  }
  return ids.length;
}

/**
 * Tokens and stashes have no enumeration on the Persistence contract —
 * the server never needs one — so copying them goes through a narrower
 * optional seam both backends implement. A backend without it copies
 * none, loudly.
 */
export interface SidecarDump {
  dumpTokens(): Promise<Array<readonly [string, import('./persistence.js').TokenRecord]>>;
  dumpStashes(): Promise<Array<readonly [string, import('./persistence.js').StashRecord]>>;
}

const dumps = (p: Persistence): SidecarDump | null =>
  typeof (p as Partial<SidecarDump>).dumpTokens === 'function' ? p as unknown as SidecarDump : null;

async function copySidecars(from: Persistence, to: Persistence):
  Promise<{ tokens: number; stashes: number }> {
  const d = dumps(from);
  if (d === null) throw new Error('the source backend cannot enumerate tokens and stashes');
  const tokens = await d.dumpTokens();
  if (tokens.length > 0) await to.putTokens(tokens);
  const stashes = await d.dumpStashes();
  for (const [key, rec] of stashes) await to.putStash(key, rec);
  return { tokens: tokens.length, stashes: stashes.length };
}
