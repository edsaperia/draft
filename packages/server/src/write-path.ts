/**
 * The write path (refactor Q1352 (l), 2026-09-14): everything that reaches
 * the store or the mailer. `commit` is the one door a document's fresh
 * entries go through — the engine ride, the WriteChain, the two logs in
 * their fixed order, the stalled flag — `relay` is the mail the fold
 * implies, `tellGaveUp` is the outbox's dead rows written back into the
 * document they were about, and `tick` is §4.6's metronome over every
 * document plus the sender's own.
 *
 * All four lived inside `createDraftServer`'s closure. They are moved, not
 * edited: what the closure gave them is now the constructor's `WritePathDeps`,
 * and every dependency points one way — `server.ts` imports this module and
 * this module imports nothing of `server.ts`. The two pieces of host state
 * the write path shares with `/healthz` are the seam that could have made a
 * cycle, and neither does: `PauseState` is an object defined here, made by
 * `server.ts` and read by both, and the error counters stay `server.ts`'s own
 * (the request path counts into them and healthz serialises them), reached
 * from here through the handed-in `noteError` alone.
 *
 * The rate-limit bucket sweep that rode the old `tick` is not here: it is
 * the limiter's housekeeping, not the write path's, and stays beside
 * `rateLimited` in `server.ts`, which sweeps and then calls this.
 */
import { sha256Hex } from '../../constitution/src/index.js';
import type { LogEntry } from '../../constitution/src/index.js';
import { magicLink } from './auth.js';
import type { Auth } from './auth.js';
import type { ServerConfig } from './config.js';
import type { DocStore, LoadedDoc } from './store.js';
import type { WriteChain } from './persistence.js';
import type { OutboxRow, Persistence } from './persistence.js';
import type { MailOutbox, QueuedMail } from './outbox.js';
import { MAILS } from './mailer.js';
import type { Mail, Mailer } from './mailer.js';
import { driveBridge, foldTime, persistEngine } from './engine-host.js';

/**
 * **A pause is announced, never guessed** (Q1345, Ed 2026-09-12: *explicitly
 * pause documents while a deploy is happening*). A deploy runs the new
 * instance beside the old one for some minutes, and a browser pinned to the
 * old one by keep-alive would go on writing to a log the new instance has
 * already loaded — the split that killed the notanotherpizza demo. So CI
 * calls `POST /api/admin/pause` before it fires the deploy hook: from then
 * on that instance persists nothing, refuses every command with 503 and a
 * sentence, ticks nothing, and says `paused` on every view answer, the
 * short one included, so every page draws the modal. The new instance
 * boots unpaused; the pinned browser reaches it when the old one's listener
 * closes. `expectedMs` is the bar's guess — the time from the hook to the
 * old instance's death, measured at about six minutes on 2026-09-12 — and
 * a pause nobody resumes lifts itself after `MAX_MS`, so a deploy that
 * never lands cannot hold a document for ever. Nothing applied in memory
 * during a pause is lost on the surviving instance: `persist` slices from
 * its cursor, so the next commit after a resume writes it all.
 *
 * **Three refusals, not one** (issue #9). *Refuses every command* is the cmd
 * route's own check, made before anything is applied; a command already
 * behind the chain when the pause lands meets `commit`, which answers `null`
 * and is refused with the same 503 and the same payload; and a magic link
 * followed meanwhile meets `pausedDoor` in `routes-auth.ts`, before its
 * single-use token is spent, so the link is still good a minute later.
 */
export class PauseState {
  static readonly EXPECTED_MS = 6 * 60_000;
  static readonly MAX_MS = 15 * 60_000;
  static readonly MESSAGE = 'this document is paused for a moment of maintenance';
  private paused: { at: number; expectedMs: number } | null = null;

  /** The pause as it stands, lifting one that has run past `MAX_MS`. */
  now(nowMs: number): { at: number; expectedMs: number } | null {
    if (this.paused !== null && nowMs - this.paused.at > PauseState.MAX_MS) this.paused = null;
    return this.paused;
  }

  /** What every view answer carries, or null. */
  payload(nowMs: number): { at: number; expectedMs: number; elapsedMs: number } | null {
    const p = this.now(nowMs);
    return p === null ? null : { at: p.at, expectedMs: p.expectedMs, elapsedMs: nowMs - p.at };
  }

  begin(nowMs: number, expectedMs: number): void {
    this.paused = { at: nowMs, expectedMs };
  }

  lift(): void {
    this.paused = null;
  }
}

/** What the write path reads. Everything it touches is here, and nothing
 *  here is `server.ts` itself. */
export interface WritePathDeps {
  readonly cfg: ServerConfig;
  readonly persistence: Persistence;
  readonly store: DocStore;
  readonly auth: Auth;
  readonly mailer: Mailer;
  readonly outbox: MailOutbox;
  /** the per-document chain: two commits to one document cannot interleave */
  readonly commits: WriteChain;
  /** the announced pause (Q1345), made and lifted by `server.ts`'s admin route */
  readonly pause: PauseState;
  /** the throws nobody handled (entry 77): the counters live in `server.ts`,
   *  which serves them on `/healthz`; the write path only adds to them */
  readonly noteError: (where: 'tick' | 'outbox', e: unknown) => void;
  /** true once `close()` has begun: no new commits join the drain */
  readonly closing: () => boolean;
  /** the clock, so a host can state the time it is */
  readonly now: () => number;
}

export class WritePath {
  constructor(private readonly d: WritePathDeps) {}

  /**
   * The one door every mail goes through (finding 15). The relayed ones —
   * invitations, the close, the lapse pair — are queued by `relay` and
   * sent by the loop; these are the three the *requester* is waiting on
   * (creation, login, the applicant's verification), where a failure is
   * feedback the person in front of the screen can act on, so they stay
   * synchronous. What they share with the queue is the kill-switch: with
   * mail off they are enqueued instead, so nothing is lost.
   *
   * A held mail carries the hash of the token in its link, exactly as a
   * relayed one does: a queued magic link that later gives up must be
   * revoked, or the switch being on turns a link nobody received into a
   * live credential for the rest of its week.
   */
  async sendNow(mail: Mail, documentId: string | null,
    token?: string): Promise<void> {
    const { cfg, mailer, outbox } = this.d;
    if (cfg.mailOff) {
      await outbox.enqueue([{ ...mail, documentId,
        ...(token === undefined ? {} : { tokenHash: sha256Hex(token) }) }], this.d.now());
      return;
    }
    await mailer.send(mail);
  }

  /**
   * Non-decreasing time per document, taken at the fold (Q1332): the
   * clock now, or the last event of either of the document's logs if that
   * is later. `nowMs` from the request's receipt is not used here on
   * purpose — under load the two are seconds apart.
   *
   * **And the ending is met here, before anything is folded** (issue #3).
   * The close stamps itself at the *ending* (SPEC §4.6) and `emit` refuses
   * an event earlier than the last one — so a single member act landing
   * between the ending and the next close run (a judgment, a name, a
   * presence stamp, an arrival) pushed the log past the ending, and every
   * close from then on threw *timestamps must be non-decreasing*: 400 on
   * every command, the tick failing once a minute, and no signing card, no
   * signatures, no record and no close mail, for ever and across restarts.
   * A windowed room is busiest in the minutes before it ends, so the gap is
   * where the traffic is. Every writing path takes its time from here, and
   * here is the only place that holds both halves of the close and can run
   * them in their fixed order before the act applies. The act then meets a
   * closed document and is refused with the ordinary closed-document
   * sentence, which is §4.6's *refused politely*.
   *
   * **Paused, it does nothing** (Q1345): the cmd route and `commit` both
   * reach this before their own pause checks, and a paused instance
   * persists nothing — closing in memory here would be the very split the
   * announced pause exists to prevent, and `pause.test.ts` cannot catch it,
   * its document ending far in the future.
   *
   * **The throw is swallowed** so that a close failing for some other
   * reason cannot take every member's poll down with it. The tick calls
   * both functions again outside this guard, so the error is still
   * reported, once a minute, where the operator reads it.
   */
  tOf(doc: LoadedDoc, nowMs: number = this.d.now()): number {
    const { cfg, pause } = this.d;
    const t = foldTime(doc, nowMs);
    const ending = doc.cs.constitutedAtT !== null && !doc.cs.closed
      ? doc.cs.settingState('ending').value as { endsAtMs: number | null } | null
      : null;
    if (ending !== null && ending.endsAtMs !== null && t >= ending.endsAtMs
        && pause.now(nowMs) === null) {
      try {
        // engine first, then the constitution (SPEC §4.6): the final
        // adoption batch runs while the constitution is still open, and
        // `driveBridge` finishes the constitution's own close behind it
        driveBridge(doc, t, cfg.engineTuning);
        doc.cs.tick(t);
      } catch { /* the tick reports it; a poll must not die of it */ }
    }
    return t;
  }

  /**
   * Mail follows the fold: relay what freshly-persisted events imply.
   *
   * **Nothing is sent from here** since the outbox landed (finding 15).
   * The pass mints its tokens, writes the mails as durable rows, and kicks
   * the sender — so a provider refusal is a row still standing next minute
   * rather than an invitation the log records as sent. The order is the
   * commit's own: the document log is written first (it is the source of
   * truth), then the mails it implies.
   */
  private async relay(doc: LoadedDoc, fresh: readonly LogEntry[], nowMs: number): Promise<void> {
    const { auth, cfg, outbox } = this.d;
    const cs = doc.cs;
    const title = cs.titleOf;
    /** A login link and the hash of the token in it, so a mail that gives
     *  up can revoke a link nobody ever received. */
    const loginLink = (memberId: string, email: string): { link: string; tokenHash: string } => {
      // deferred: one relay pass persists the token batch once, not per mail
      const token = auth.mintDeferred(
        { kind: 'login', email, docId: doc.id, memberId }, nowMs);
      return { link: magicLink(cfg.baseUrl, 'login', token, cs.slug),
        tokenHash: sha256Hex(token) };
    };
    const queue: QueuedMail[] = [];
    const push = (to: string, mail: Omit<Mail, 'to'>, tokenHash?: string): void => {
      queue.push({ to, ...mail, documentId: doc.id,
        ...(tokenHash === undefined ? {} : { tokenHash }) });
    };
    /** An address a mail can go to: the row's, where the row still stands
     *  (decision 1253) — an erased person is not written to. */
    const mailable = (email: string | null | undefined): email is string =>
      typeof email === 'string' && email.length > 0;
    for (const { event } of fresh) {
      if (event.type === 'member-invited') {
        // the event names the person; the address is the row's
        const m = cs.memberRecords().get(event.member);
        if (m !== undefined && mailable(m.email)) {
          const l = loginLink(event.member, m.email);
          push(m.email, MAILS.invite(title, l.link), l.tokenHash);
        }
      } else if (event.type === 'mail-resent') {
        // 📨 (SURFACE E34): the arm above, again. A fresh link, because the
        // one the dead mail carried was revoked when the outbox gave up on
        // it; an ordinary queued mail from here on, so a re-send that dies
        // too raises its own give-up batch.
        const m = cs.memberRecords().get(event.member);
        if (m !== undefined && mailable(m.email)) {
          const l = loginLink(event.member, m.email);
          push(m.email, MAILS.invite(title, l.link), l.tokenHash);
        }
      } else if (event.type === 'member-admitted') {
        // without this, an admitted applicant is stranded: their applicant
        // cookie can only submit, and nothing tells them they are in
        // (review #1, finding 7)
        const m = cs.memberRecords().get(event.member);
        if (m !== undefined && mailable(m.email)) {
          const l = loginLink(event.member, m.email);
          push(m.email, MAILS.admitted(title, l.link), l.tokenHash);
        }
      } else if (event.type === 'closed') {
        // the close (SPEC §4.6): every member and invitee is told, once — the
        // close is one event in the log, and only fresh entries relay
        const link = `${cfg.baseUrl}/d/${cs.slug}`;
        const seen = new Set<string>();
        const tell = (email: string | null | undefined): void => {
          if (!email || seen.has(email)) return;
          seen.add(email);
          push(email, MAILS.closed(title, link));
        };
        tell(cs.convenorRecord().email);
        for (const m of cs.memberRecords().values()) if (!m.removed) tell(m.email);
      } else if (event.type === 'member-removed' && event.by === 'convenor') {
        // exile at will (SURFACE E31, Q901): the removed member is outside
        // the document by now, so mail is the channel — with the document's
        // address and **no token**, the `closed` arm's shape, since a login
        // link would be minted for a seat that no longer exists. A carried
        // removal (`viaMotion`, E10/E11's outcome) and a resignation (the
        // member's own act) relay nothing.
        const m = cs.memberRecords().get(event.member);
        if (m !== undefined && mailable(m.email)) {
          push(m.email, MAILS.removed(title, `${cfg.baseUrl}/d/${cs.slug}`));
        }
      } else if (event.type === 'member-uninvited') {
        // **a withdrawn invitation is told to the person it was sent to**
        // (Q1493, Ed 2026-09-21: *An email when withdrawn*). The `removed`
        // arm's own shape — no token, the document's address — for the same
        // reason: the seat is gone, so a login link would be minted for
        // nobody. Whichever hand withdrew it and whichever side of 🍾 it
        // happened on: the event is the fact, and there is one event.
        const m = cs.memberRecords().get(event.member);
        if (m !== undefined && mailable(m.email)) {
          push(m.email, MAILS.uninvited(title, `${cfg.baseUrl}/d/${cs.slug}`));
        }
      } else if (event.type === 'lapse-warned' || event.type === 'member-lapsed') {
        const m = cs.memberRecords().get(event.member);
        const email = m?.email ?? (event.member === cs.convenorRecord().id
          ? cs.convenorRecord().email : null);
        if (mailable(email)) {
          const l = loginLink(event.member, email);
          if (event.type === 'lapse-warned') {
            // each of the three warnings names its own lead (R-097): a
            // week, a day, an hour — the event carries it
            push(email, MAILS.lapseWarning(title, l.link, event.lead), l.tokenHash);
          } else {
            push(email, MAILS.lapsed(title, l.link), l.tokenHash);
          }
        }
      }
    }
    if (queue.length === 0) return;
    await auth.flush(nowMs); // every queued mail minted a token
    await outbox.enqueue(queue, nowMs);
    outbox.kick(nowMs);
  }

  /**
   * Persist a document's fresh entries, durably, in order. A 200 means this
   * resolved; the WriteChain is what makes "in order" true.
   *
   * **`null` is the pause, and it is not a length** (issue #9). A command
   * that passes the cmd route's own pause check can still meet a pause
   * here — the route checks before it applies, this runs behind the chain,
   * and a deploy's pause lands somewhere between — and what came back then
   * was `logEntries().length`, a perfectly ordinary number the route sent
   * as a 200 with a `seq` beside it, although nothing had reached the
   * store. So the paused case is a value of its own: every caller that
   * reads the return can tell durable from waiting, and the one that does
   * — the cmd route — answers the same 503 and the same `paused` payload
   * as a command refused at the door. **Not a throw**: the central handler
   * would answer it 400, the view path's presence commit would break the
   * paused view an idle member is meant to get, and `tellGaveUp`'s loop
   * would abort at the first paused document.
   */
  commit(doc: LoadedDoc, nowMs: number): Promise<number | null> {
    const { cfg, commits, pause, persistence, store } = this.d;
    return commits.run(doc.id, async () => {
      // the engine rides every commit (Q391): born at constitute, synced
      // with roster truth and ground shifts, closed when the ending passes
      driveBridge(doc, this.tOf(doc, nowMs), cfg.engineTuning);
      // paused (Q1345): nothing reaches the store from this instance until
      // the pause lifts — what was applied in memory waits behind the
      // cursor and lands on the next commit after a resume
      if (pause.now(nowMs) !== null) return null;
      // the document log first — it is the source of truth, and the
      // bridge's persisted cursor points into it (review #2, finding 2):
      // a crash after this and before the engine persist leaves a cursor
      // *behind* the log, which resume's sync walks forward again — the
      // roster changes and the admit and remove races re-enter, but **an
      // ordinary set motion does not**: its candidate is submitted only
      // inside `openSetMotion`, never by the walk, so a motion opened in a
      // lost engine write comes back running with no race behind it and
      // nothing but its mover's withdrawal ends it (issue #28). The other
      // order leaves the cursor ahead, and the entries in between are never fed
      try {
        await store.persist(doc);
        await persistEngine(persistence, doc);
      } catch (e) {
        // **a save the store rejected for good marks the document** (Q1346):
        // a 23505 is another writer holding this document's log — the
        // split of Q1345 — and no retry from this instance will ever land,
        // so the document says so on every view until a save succeeds
        if ((e as { code?: unknown }).code === '23505') doc.stalled = nowMs;
        throw e;
      }
      doc.stalled = null;
      // **Mail is relayed off its own cursor** (issue #7). Relaying `fresh`
      // meant relaying what *this* commit persisted, and `store.persist` had
      // already advanced the cursor before handing it over — so a throw in
      // the engine persist, in `auth.flush` or in the outbox write left those
      // entries persisted and their mail sent by nobody: the next commit saw
      // an empty `fresh` and no record that anything was owed. `relayed`
      // trails `persisted` until the relay resolves, so a failed one is
      // retried by the next commit or by the minute tick, whichever comes
      // first. `end` is read before the await for Q1322's reason: a command
      // landing meanwhile lengthens the log and may advance `persisted`
      // through another path, and this pass must only claim what it relayed.
      const end = doc.persisted;
      if (doc.relayed < end) {
        await this.relay(doc, doc.cs.logEntries().slice(doc.relayed, end), nowMs);
        doc.relayed = end;
      }
      return doc.cs.logEntries().length;
    });
  }

  /**
   * **A mail that gave up is told** (SURFACE E34): one sender pass's dead
   * rows, grouped by the document they were about, written into that
   * document's own log. The same direct-call shape as the `memberReturn`
   * beside `runCommand` — the module is the truth about what a member is told,
   * and a fact hung beside `view:` instead would never reach a page that is
   * merely polling, since a give-up that is not an event moves neither seq.
   *
   * **The null `documentId` is dropped**: the operator notification and the
   * creation mail belong to no document, and there is nowhere for their news
   * to go.
   *
   * **This commits from inside a sender pass**, which is safe and not by
   * accident: `commits` and the outbox's `passes` are different chains, and
   * the only thing `relay` does back to the outbox is `enqueue` (which takes
   * no chain) and `kick` (fire-and-forget). Await the kick and this would
   * deadlock.
   */
  async tellGaveUp(rows: readonly OutboxRow[]): Promise<void> {
    const byDoc = new Map<string, string[]>();
    for (const row of rows) {
      if (row.documentId === null) continue;
      const at = byDoc.get(row.documentId);
      if (at) at.push(row.to); else byDoc.set(row.documentId, [row.to]);
    }
    const nowMs = this.d.now();
    for (const [docId, addresses] of byDoc) {
      const doc = this.d.store.byId(docId);
      if (!doc) continue;
      doc.cs.mailGaveUp(this.tOf(doc, nowMs), addresses);
      await this.commit(doc, nowMs);
    }
  }

  /** Drive the clocks (§9.5/§9.5a) over every document, then the sender.
   *  `server.ts`'s own `tick` sweeps the rate-limit buckets and calls this. */
  async tick(nowMs: number = this.d.now()): Promise<void> {
    const { cfg, closing, noteError, outbox, pause, store } = this.d;
    if (pause.now(nowMs) !== null) return; // paused (Q1345): the clock waits with the store
    for (const doc of store.all()) {
      if (closing()) return; // shutting down: no new commits join the drain
      if (doc.cs.constitutedAtT === null) continue;
      // **One document must never stop the clock for the others** (Q679).
      // Without this the loop is a single point of failure for every
      // document at once: the tick is the adoption metronome, the lapse
      // clock and the close, and `main.ts`'s interval only logs the throw
      // — so one document that cannot tick silently freezes every document
      // after it in insertion order, once a minute, for ever. The throw is
      // real and reachable: both closes stamp themselves at the *ending*
      // rather than at t, so a document whose log runs past its own close
      // raises "timestamps must be non-decreasing" on every tick from then
      // on — and that one is **permanent**, not transient (issue #3): the
      // stamp never moves back under the log, so nothing but `tOf`'s guard,
      // which keeps the log from passing the ending in the first place,
      // stops it. Logged rather than quarantined all the same, because the
      // other reasons a tick may throw are transient and the once-a-minute
      // repeat is itself the alarm — `errors.tick` in `/healthz` climbs by
      // one a minute for exactly this shape of wedge.
      try {
        // engine first (SPEC §4.6): the final adoption batch must run before
        // the constitution closes, or a carried motion has nowhere to land —
        // driveBridge closes the engine at the ending and finishes the
        // constitution's close itself; cs.tick then finds it closed
        // the tick's own clock: a test-driven tick states the time it is
        driveBridge(doc, this.tOf(doc, nowMs), cfg.engineTuning);
        doc.cs.tick(this.tOf(doc, nowMs));
        await this.commit(doc, nowMs);
      } catch (e) {
        noteError('tick', e);
        console.error(`tick failed for document '${doc.id}':`, e);
      }
    }
    // the sender's own metronome (finding 15): the kick after each commit
    // is the fast path, and this is what re-offers a row whose backoff has
    // elapsed. Awaited, so a tick that overlaps a shutdown drains with it.
    if (!closing()) {
      await outbox.run(nowMs).catch((e: unknown) => {
        noteError('outbox', e);
        console.error('outbox pass failed:', e);
        return { sent: 0, failed: 0, held: false };
      });
    }
  }
}
