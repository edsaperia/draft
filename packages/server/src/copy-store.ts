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
 * **A document the source cannot replay is skipped, not thrown** (issue
 * #13): it is named in the report, nothing of it is written, and the run
 * carries on to every other document and to the sidecars — then exits
 * non-zero, so a backup missing a document can never read as clean. The
 * oracle is untouched: it still holds for every document that was copied.
 *
 * Re-runnable: a document already present at the destination has its
 * existing prefix compared entry for entry, and only the remainder is
 * appended — so a second run after a partial first one finishes the job,
 * and a run against a destination that has *diverged* refuses rather
 * than forks. Tokens and stashes upsert; provisional text and bridge
 * state are overwritten with the source's (the source is the truth while
 * the importer runs).
 */
import { ConstitutionSession, InMemoryPeople } from '../../constitution/src/index.js';
import type { LogEntry } from '../../constitution/src/index.js';
import type { MaintainablePersistence, Persistence, PersonRow } from './persistence.js';

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
  /** Queued mail (finding 15). A backup that dropped it would silently
   *  un-send whatever had not gone out yet. */
  outbox: number;
  /**
   * **Documents the source itself cannot read back** (issue #13): a torn
   * log, a broken chain, a shape this build refuses — the same documents
   * the server quarantines at boot and serves the rest around
   * (store.ts:92). Nothing of them reaches the destination, and they are
   * named here rather than thrown, because one of them used to abort the
   * whole export: every later document, and every sidecar, went uncopied.
   * A run that skipped anything exits non-zero, so it cannot read as a
   * clean backup.
   */
  skipped: Array<{ id: string; error: string }>;
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
  // **The rows beside the log go with it** (decision 1253): a backup that
  // dropped them would be a room of erased people. No chain covers them —
  // that is the point of the split — so the oracle here is the set itself,
  // row for row.
  const [srcPeople, dstPeople] = await Promise.all([from.readPeople(id), to.readPeople(id)]);
  if (peopleKey(srcPeople) !== peopleKey(dstPeople)) {
    throw new Error(`${id}: the people rows differ (${srcPeople.length} at the source, ` +
      `${dstPeople.length} at the destination)`);
  }
  // the chain itself, from genesis: replay re-verifies every link
  const replayed = ConstitutionSession.replay(dstDoc, asPeople(dstPeople));
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

/** The rows as one comparable string, order-free. */
const peopleKey = (rows: readonly PersonRow[]): string =>
  JSON.stringify([...rows].sort((a, b) => (a.personId < b.personId ? -1 : 1))
    .map((r) => [r.personId, r.email, r.name, r.picture]));

const asPeople = (rows: readonly PersonRow[]): InMemoryPeople =>
  new InMemoryPeople(rows.map((r) => [r.personId,
    { email: r.email, name: r.name, picture: r.picture }] as const));

/**
 * **Can the source read this document back at all?** (issue #13.) The
 * question is asked of the *source*, before anything is written, so a
 * document that cannot be replayed never reaches the destination in any
 * state — not even a prefix. It is the boot check exactly (store.ts:92):
 * read the log, read the rows beside it, replay. Returns the reason it
 * could not, or null.
 */
async function sourceFault(id: string, from: Persistence): Promise<string | null> {
  try {
    const log = await from.readDocLog(id);
    ConstitutionSession.replay(log, asPeople(await from.readPeople(id)));
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export async function copyStore(from: MaintainablePersistence, to: MaintainablePersistence,
  opts: CopyOptions = {}): Promise<CopyReport> {
  const log = opts.log ?? (() => undefined);
  const report: CopyReport = {
    documents: 0, unchanged: [], copied: [], docEntries: 0, engineEntries: 0,
    tokens: 0, stashes: 0, outbox: 0, skipped: [],
  };
  const ids = await from.listDocIds();
  for (const id of ids) {
    // **One unreadable document does not cost the backup everything else**
    // (issue #13). Until this check the loop threw here, and the throw was
    // the whole call: every document after it went uncopied, and the
    // sidecars below — tokens, stashes, the mail queue — never ran at all.
    const fault = await sourceFault(id, from);
    if (fault !== null) {
      report.skipped.push({ id, error: fault });
      log(`${id}: SKIPPED — does not replay at the source: ${fault}`);
      continue;
    }
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
    // the people rows ride with the entries, as the server writes them; a
    // document already complete still has its rows brought up to date, since
    // an erasure at the source is a row gone rather than an entry added —
    // and that is copied by the whole set, never by a diff
    const people = await from.readPeople(id);
    await to.appendDocLog(id, srcDoc.slice(haveDoc) as LogEntry[], people);
    for (const dst of await to.readPeople(id)) {
      if (!people.some((p) => p.personId === dst.personId)) await to.deletePerson(id, dst.personId);
    }
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
    const { tokens, stashes, outbox } = await copySidecars(from, to);
    report.tokens = tokens;
    report.stashes = stashes;
    report.outbox = outbox;
    log(`${tokens} tokens, ${stashes} stashes, ${outbox} queued mails`);
  }
  return report;
}

/**
 * The same walk, writing nothing: every document at the source must be at
 * the destination with identical chains. A source document the source
 * cannot replay is skipped and named, as the copy skips it (issue #13) —
 * otherwise a drill over a directory holding one would abort at
 * *missing at the destination*, which is the copy's own deliberate work.
 * Returns the documents verified and the ones passed over.
 */
export async function verifyStores(from: MaintainablePersistence, to: MaintainablePersistence,
  opts: Pick<CopyOptions, 'log'> = {}):
  Promise<{ documents: number; skipped: Array<{ id: string; error: string }> }> {
  const log = opts.log ?? (() => undefined);
  const ids = await from.listDocIds();
  const dstIds = new Set(await to.listDocIds());
  const skipped: Array<{ id: string; error: string }> = [];
  for (const id of ids) {
    const fault = await sourceFault(id, from);
    if (fault !== null) {
      skipped.push({ id, error: fault });
      log(`${id}: SKIPPED — does not replay at the source: ${fault}`);
      continue;
    }
    if (!dstIds.has(id)) throw new Error(`${id}: missing at the destination`);
    const { docEntries, engineEntries } = await assertIdentical(id, from, to);
    log(`${id}: ${docEntries} + ${engineEntries} entries, hashes identical`);
  }
  const mails = await assertOutboxCarried(from, to);
  if (mails > 0) log(`${mails} queued mails, every one carried`);
  return { documents: ids.length - skipped.length, skipped };
}

/**
 * Tokens and stashes have no enumeration on the Persistence contract —
 * the server never needs one — so copying them goes through the
 * maintainer's contract (`MaintainablePersistence`), which both backends
 * implement and the server is never handed.
 */
async function copySidecars(from: MaintainablePersistence, to: MaintainablePersistence):
  Promise<{ tokens: number; stashes: number; outbox: number }> {
  const tokens = await from.dumpTokens();
  if (tokens.length > 0) await to.putTokens(tokens);
  const stashes = await from.dumpStashes();
  for (const [key, rec] of stashes) await to.putStash(key, rec);
  const outbox = await from.dumpOutbox();
  await to.putOutbox(outbox);
  await assertOutboxCarried(from, to);
  return { tokens: tokens.length, stashes: stashes.length, outbox: outbox.length };
}

/**
 * **The oracle extended, never relaxed** (finding 15). The hash chains are
 * asserted per document; queued mail has no chain, so its assertion is
 * this: every row at the source stands at the destination, field for
 * field. A *subset*, deliberately — the copier upserts, and a destination
 * that already holds mail of its own is not a divergence — but a source
 * row that failed to land is, and a backup that quietly dropped the queue
 * would un-send whatever had not gone out.
 */
export async function assertOutboxCarried(from: MaintainablePersistence,
  to: MaintainablePersistence): Promise<number> {
  const want = await from.dumpOutbox();
  if (want.length === 0) return 0;
  const have = new Map((await to.dumpOutbox()).map((r) => [r.id, r]));
  for (const row of want) {
    const there = have.get(row.id);
    if (there === undefined) throw new Error(`outbox row ${row.id} is missing at the destination`);
    if (JSON.stringify(there) !== JSON.stringify(row)) {
      throw new Error(`outbox row ${row.id} differs at the destination`);
    }
  }
  return want.length;
}
