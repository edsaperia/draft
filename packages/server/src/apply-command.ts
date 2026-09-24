/**
 * **The member command path, as one function** (design/DEMO.md Stage 4;
 * Q1535): what `POST /api/d/:slug/cmd` does once it has read its body — the
 * pause refusal, the applicant gate, the lapse revival, `runCommand` inside
 * `commands.ts`'s whitelist, the refusal handling and `writes.commit` — lifted
 * out of the route (`routes-member.ts`) unchanged, so that the demo's bots
 * (`demo-bots.ts`) act through **exactly this and nothing else**. A bot has no
 * other way into a document: it holds a member id, never a session, a bridge
 * or a store, and every write it makes is a command a member's page could
 * have sent.
 *
 * The route is now `readJson` + `applyCommand` + `json`, and the existing
 * server suite, run unedited, is the proof the behaviour did not move.
 *
 * **A refusal still throws** — after the commit and the log line, exactly as
 * the route always did — because the server's catch is what turns a module
 * refusal into the member's 400. The two answers the route wrote itself (the
 * 503 of a pause, the 403 of an applicant asking for anything but their two
 * acts) come back as values.
 */
import { runCommand } from './commands.js';
import { logError, noteRace, raceRefusal } from './error-log.js';
import type { RaceCounts } from './error-log.js';
import { asEngineDoc } from './engine-host.js';
import type { Persistence } from './persistence.js';
import type { DocStore, LoadedDoc } from './store.js';
import { PauseState } from './write-path.js';
import type { WritePath } from './write-path.js';

/** Who is acting: the cookie's seat as the route parsed it. */
export interface CommandSeat {
  memberId: string;
  applicantId: string | null;
  isFounder: boolean;
}

/** What `applyCommand` reads of the server — a slice of `RouteContext`. */
export interface CommandHost {
  readonly store: DocStore;
  readonly persistence: Persistence;
  readonly pause: PauseState;
  readonly writes: WritePath;
  readonly races: RaceCounts;
  /**
   * The demo's visitor clock (DEMO.md D8): a command on the demo document
   * restarts its seat's 30 minutes, if the seat is a visitor's. The route
   * passes the whole `RouteContext`, which carries it; the bots pass a host
   * without it, so **a bot's act never counts as a visitor's** (a bot is never
   * a visitor, and nothing it does should keep a phone's seat alive).
   */
  readonly demo?: { doc(): LoadedDoc | null; touch(member: string, nowMs: number): void };
}

export interface ApplyOptions {
  /** The request path the error log names (`pathOf(req)` on the route). */
  path: string;
  /**
   * Whether a refusal is written to the error log (Q1330). The route always
   * writes; the demo's bots pass false and count their refusals in their own
   * stats instead (DEMO.md D6, 1535 (b)), since an operator reads the log line
   * by line and a busy bot room meets refusals by the dozen.
   */
  logRefusals?: boolean;
}

export type Applied =
  | { status: 200; body: { ok: true; seq: number; result?: unknown } }
  | { status: 403 | 503; body: Record<string, unknown> };

export async function applyCommand(host: CommandHost, doc: LoadedDoc, seat: CommandSeat,
  cmd: string, args: Record<string, unknown>, nowMs: number, opts: ApplyOptions): Promise<Applied> {
  const { store, pause, writes } = host;
  const { memberId, applicantId, isFounder } = seat;
  const logRefusals = opts.logRefusals !== false;
  const t = writes.tOf(doc);
  // paused (Q1345): refused before anything is applied, with the
  // pause itself in the answer so the page draws the modal and not a
  // refusal; a 503, since the document is whole and merely waiting
  if (pause.now(nowMs) !== null) {
    return { status: 503, body: { error: PauseState.MESSAGE, paused: pause.payload(nowMs) } };
  }
  // **every refusal lands in the error log** (Q1330): the document,
  // the seat as its id — never the address — the command, its
  // arguments and the reason, so a refusal a member met on the page
  // can be looked up on the host afterwards
  // **…except the ones nobody did anything wrong to meet** (Q1493 (a),
  // Ed 2026-09-21: *The page handles both*). A judgment on a pair that
  // closed since the card was drawn, and a proposal pressed in the
  // second after somebody else's adoption, are races with the 4 s poll
  // rather than anything a member got wrong — the page answers both
  // itself now, so they are tallied on `/healthz` and kept out of a
  // log whose whole use is that an operator reads every line of it.
  const refused = (status: number, reason: string): void => {
    const race = raceRefusal(cmd, reason);
    if (race !== null) { noteRace(host.races, race, nowMs); return; }
    if (!logRefusals) return;
    logError(host.persistence, {
      kind: 'refused', status, method: 'POST', path: opts.path,
      doc: doc.id, slug: doc.cs.slug, seat: applicantId ?? memberId, cmd, args, reason });
  };
  // an applicant's two acts: submit, and the OK on a door that shut
  // under them (SURFACE E33, Q901) — nothing else speaks for them
  if (applicantId !== null && cmd !== 'submit-application' && cmd !== 'ack-apply-shut') {
    refused(403, 'applicants may only submit their application');
    return { status: 403, body: { error: 'applicants may only submit their application' } };
  }
  // a demo visitor's act restarts their seat's 30 minutes (DEMO.md D8) — on
  // the demo's current generation alone, since member ids repeat across documents
  if (host.demo !== undefined && host.demo.doc() === doc) host.demo.touch(memberId, nowMs);
  const me = doc.cs.memberRecords().get(memberId);
  if (me?.lapsed) doc.cs.memberReturn(t, memberId); // any act revives
  let result: unknown;
  try {
    result = runCommand(doc.cs, { memberId, isFounder, applicantId },
      t, cmd, args, asEngineDoc(doc).bridge);
  } catch (e) {
    // whatever the module emitted before the refusal — a revival, a
    // motion whose engine race then refused — is real, and must not
    // sit in memory waiting to ride an unrelated commit (review #1,
    // finding 6): memory and disk never diverge, even on a 400
    await writes.commit(doc, nowMs);
    // logged here, where the command and the seat are known; the
    // catch in server.ts sees it once more and skips it (`logged`). A
    // throw carrying a system code is the route failing, not a refusal,
    // and stays that catch's to log as `failed`.
    if (typeof (e as { code?: unknown }).code !== 'string') {
      refused(400, e instanceof Error ? e.message : String(e));
      (e as { logged?: boolean }).logged = true;
    }
    throw e;
  }
  // confirming the starting text supersedes the provisional draft
  if (doc.cs.textConfirmed && doc.provisional !== null) {
    await store.setProvisional(doc, null);
  }
  const seq = await writes.commit(doc, nowMs);
  // the pause landed while this waited behind the chain (issue #9):
  // nothing was persisted, so this is the same refusal the check
  // above makes, answered in the same words — a 200 with a `seq`
  // would be a promise of durability the store never made
  if (seq === null) {
    return { status: 503, body: { error: PauseState.MESSAGE, paused: pause.payload(nowMs) } };
  }
  return { status: 200, body: { ok: true, seq, ...(result !== undefined ? { result } : {}) } };
}
