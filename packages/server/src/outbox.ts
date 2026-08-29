/**
 * The mail outbox and its sender loop (review #1, finding 15; stage 6
 * promised it and the running log corrected it to *not done*).
 *
 * Before this, a mail was `void mailer.send(mail).catch(console.error)`
 * inside the commit path: a transient Resend refusal lost a lapse warning
 * or a close notice **the log records as sent**, and the magic link it
 * carried was already minted and would sit live for a week in nobody's
 * inbox. Now the mail is a durable row written after the commit that
 * implies it, and sending is a separate act that may fail as often as it
 * likes without losing anything.
 *
 * Three properties worth stating, because they are what the design is for:
 *
 * - **Nothing is sent from inside a commit.** The relay enqueues; the
 *   sender runs on the minute tick and on an immediate kick after each
 *   commit, so the common case is still "the mail goes out now".
 * - **A row is offered once at a time.** Every pass runs on one
 *   `WriteChain`, the same primitive that keeps two commits to a document
 *   from interleaving — because two passes reading one row is not a
 *   theoretical hazard: the tick both commits (which kicks) and then runs
 *   a pass itself, and unserialised those two sent every close notice
 *   twice.
 * - **A mail that gives up takes its token with it.** A link nobody
 *   received must not stay live for the week its expiry promised, so an
 *   exhausted row revokes the token it carried.
 */
import { randomBytes } from 'node:crypto';
import { deliverable } from './mailer.js';
import type { Mail, Mailer } from './mailer.js';
import { OUTBOX_MAX_ATTEMPTS, WriteChain } from './persistence.js';
import type { OutboxRow, Persistence } from './persistence.js';

/** How many rows one pass offers. Small: the pass runs every minute and
 *  after every commit, and a long pass holds the shutdown drain open. */
const BATCH = 25;

/** A mail on its way into the queue: the mailer's own shape plus what the
 *  row needs to know about where it came from. */
export interface QueuedMail extends Mail {
  documentId: string | null;
  /** sha256 of the token in the link, where there is one. */
  tokenHash?: string;
}

/** How long a delivered row is kept before it is swept. Long enough to
 *  answer "did that go out?" the next morning, short enough that the queue
 *  never becomes an archive of member-written mail. */
const KEEP_SENT_MS = 24 * 60 * 60 * 1000;

export interface OutboxPassReport {
  sent: number;
  /**
   * Rows that reached the attempt cap in this pass. A provably undeliverable
   * address is **retired, not failed** (see `pass`), so it is not counted
   * here — `failed` is the number an operator is meant to act on.
   */
  failed: number;
  /** True when the kill-switch held everything (Step 6, `DRAFT_MAIL_OFF`). */
  held: boolean;
}

export interface OutboxDeps {
  persistence: Persistence;
  mailer: Mailer;
  /**
   * The mail kill-switch. When it says off, a pass touches no row at all —
   * every mail stays **pending**, never failed, so switching mail back on
   * delivers the backlog rather than a list of things to re-send by hand.
   */
  mailOff: () => boolean;
  /** Drop a token whose mail was never delivered. */
  revoke: (tokenHash: string) => Promise<void>;
  /**
   * **The give-up door** (SURFACE E34): `revoke`'s sibling, and the way a
   * document learns that its mail died. Called **once per pass**, with every
   * row that pass gave up on — one pass is one act, so a pass that killed
   * three mails is one piece of news rather than three. Optional, so a test
   * that only cares about sending constructs an outbox without it.
   */
  gaveUp?: (rows: readonly OutboxRow[]) => Promise<void>;
  /** Injectable for tests; the sender stamps its own attempt times. */
  now?: () => number;
}

export class MailOutbox {
  /** One key, so every pass queues behind the last one. */
  private readonly passes = new WriteChain();

  constructor(private readonly deps: OutboxDeps) {}

  private get now(): number {
    return (this.deps.now ?? Date.now)();
  }

  /** Durably enqueue. Resolving means the mail cannot now be lost. */
  async enqueue(mails: readonly QueuedMail[], nowMs: number): Promise<void> {
    if (mails.length === 0) return;
    const rows: OutboxRow[] = mails.map((m) => ({
      id: `m-${randomBytes(9).toString('base64url')}`,
      documentId: m.documentId,
      to: m.to,
      subject: m.subject,
      body: m.text,
      ...(m.link === undefined ? {} : { link: m.link }),
      ...(m.tokenHash === undefined ? {} : { tokenHash: m.tokenHash }),
      createdMs: nowMs,
      attempts: 0,
      lastAttemptMs: null,
      lastError: null,
      sentMs: null,
    }));
    await this.deps.persistence.putOutbox(rows);
  }

  /** One sender pass, awaited, behind whatever is already running. The
   *  tick calls this; `kick` is the fire-and-forget door onto it. */
  run(nowMs: number = this.now): Promise<OutboxPassReport> {
    return this.passes.run('outbox', () => this.pass(nowMs));
  }

  private async pass(nowMs: number): Promise<OutboxPassReport> {
    if (this.deps.mailOff()) return { sent: 0, failed: 0, held: true };
    // the queue is a queue: sweep what has been delivered before offering
    // anything, or the file store rewrites an ever-longer map on every mark
    await this.deps.persistence.pruneOutbox(this.now - KEEP_SENT_MS)
      .catch((e: unknown) => { console.error('pruning the outbox failed:', e); return 0; });
    const rows = await this.deps.persistence.listPendingOutbox(nowMs, BATCH);
    let sent = 0;
    const gone: OutboxRow[] = [];
    for (const row of rows) {
      // **The RFC 2606 refusal stays at the mailer** (Q680) — this is the
      // queue's half of it: an address that provably cannot receive is not
      // worth six attempts and a backoff, so the row is retired here and
      // never offered again.
      //
      // **Retired, not failed.** `failed` is the number an operator is meant
      // to notice, and the phase ladder's whole cast lives at
      // `@ladder.invalid` — counting these would put dozens of permanent
      // failures in `/healthz` after one `npm run ladder` and bury the one
      // real give-up among them. The mailer's own contract already treats a
      // reserved address as dropped rather than refused, so the row takes
      // the same shape: terminal, with the reason in `lastError`, and the
      // link it carried revoked because nobody received it.
      if (!deliverable(row.to)) {
        await this.retire(row,
          'reserved address (RFC 2606) — provably undeliverable, never sent');
        continue;
      }
      try {
        await this.deps.mailer.send({
          to: row.to, subject: row.subject, text: row.body,
          ...(row.link === undefined ? {} : { link: row.link }),
        });
        await this.deps.persistence.markOutboxSent(row.id, this.now);
        sent += 1;
      } catch (e) {
        const why = e instanceof Error ? e.message : String(e);
        const attempts = row.attempts + 1;
        if (attempts >= OUTBOX_MAX_ATTEMPTS) {
          await this.give(row, attempts, why);
          gone.push(row);
        } else {
          await this.deps.persistence.markOutboxFailed(row.id, attempts, this.now, why);
          console.error(`mail to ${row.to} failed (attempt ${attempts}/${OUTBOX_MAX_ATTEMPTS}), ` +
            `will retry: ${why}`);
        }
      }
    }
    await this.tell(gone);
    return { sent, failed: gone.length, held: false };
  }

  /** The give-up door, once per pass. Wrapped the way `dropToken` wraps
   *  `revoke`: whatever a document does with the news, a failure there is a
   *  line in the log and never a failed pass — the mail is already dead and
   *  re-running the pass would not un-kill it. */
  private async tell(rows: readonly OutboxRow[]): Promise<void> {
    if (rows.length === 0 || this.deps.gaveUp === undefined) return;
    await this.deps.gaveUp(rows).catch((e: unknown) => {
      console.error('telling the document about a mail that gave up failed:', e);
    });
  }

  /**
   * DEV only, and reached only from the label-dropped `/api/dev/outbox/give-up`
   * (SURFACE E34): drive a document's mail to one address to the attempt cap
   * now, through the real `give` and the real door, rather than waiting the
   * six attempts and ~3 hours a genuine give-up takes. The reserved-address
   * seam cannot stand in for it — `pass` retires those deliberately — so
   * without this nothing can reach E34 in a walk at all.
   *
   * A **delivered** row is fair game and is the ordinary case in dev, where
   * the mailer never refuses: the send takes its link and token hash with it
   * (`markOutboxSent`), so forcing a give-up on one revokes nothing, which is
   * what lets a walk kill a seat's invitation without killing the seat.
   */
  giveUpNow(documentId: string, to: string): Promise<number> {
    return this.passes.run('outbox', async () => {
      const all = await this.deps.persistence.listOutboxFor(documentId, to);
      // a row that has already given up is not given up on twice
      const live = all.filter((r) => r.sentMs !== null || r.attempts < OUTBOX_MAX_ATTEMPTS);
      if (live.length === 0) return 0;
      const pending = live.filter((r) => r.sentMs === null);
      const rows = pending.length > 0 ? pending
        : [live.reduce((a, b) => (a.createdMs >= b.createdMs ? a : b))];
      for (const row of rows) {
        await this.give(row, OUTBOX_MAX_ATTEMPTS, 'forced give-up (DEV)');
      }
      await this.tell(rows);
      return rows.length;
    });
  }

  /** Give up on a row: loud, because nobody is watching the queue, and
   *  the token goes with it. */
  private async give(row: OutboxRow, attempts: number, why: string): Promise<void> {
    await this.deps.persistence.markOutboxFailed(row.id, attempts, this.now, why);
    console.error(`MAIL GIVEN UP: "${row.subject}" to ${row.to} after ${attempts} ` +
      `attempts — ${why}`);
    await this.dropToken(row);
  }

  /** Retire a row that was never worth offering: terminal like a send, so
   *  it leaves the pending count without joining the failed one, and its
   *  link goes with it because nobody received it either. */
  private async retire(row: OutboxRow, why: string): Promise<void> {
    // sent first, then the reason: `markOutboxSent` clears `lastError`, so
    // writing the note before stamping it would erase the note
    await this.deps.persistence.markOutboxSent(row.id, this.now);
    await this.deps.persistence.markOutboxFailed(row.id, row.attempts, this.now, why);
    console.log(`[mail dropped→${row.to}] ${why}`);
    await this.dropToken(row);
  }

  /** A link nobody received must not stay live for the week its expiry
   *  promised — this is the credential half of giving up. */
  private async dropToken(row: OutboxRow): Promise<void> {
    if (row.tokenHash === undefined) return;
    await this.deps.revoke(row.tokenHash).catch((e: unknown) => {
      console.error('revoking the undelivered link failed:', e);
    });
  }

  /** Run a pass without waiting for it — the immediate kick after a commit,
   *  which is what makes the common case still "the mail goes out now". */
  kick(nowMs: number = this.now): void {
    void this.run(nowMs).catch((e: unknown) => { console.error('outbox pass failed:', e); });
  }

  /** Wait for whatever is in flight (shutdown: a deploy's SIGTERM must not
   *  cut a send in half — the row would be re-offered and the member would
   *  get it twice). */
  drain(): Promise<void> {
    return this.passes.drain();
  }

  counts(): Promise<{ pending: number; failed: number }> {
    return this.deps.persistence.outboxCounts();
  }
}
