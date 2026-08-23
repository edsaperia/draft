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

export interface OutboxPassReport {
  sent: number;
  /** Rows that reached the attempt cap in this pass, or were refused. */
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
    const rows = await this.deps.persistence.listPendingOutbox(nowMs, BATCH);
    let sent = 0;
    let failed = 0;
    for (const row of rows) {
      // **The RFC 2606 refusal stays at the mailer** (Q680) — this is the
      // queue's half of it: an address that provably cannot receive is not
      // worth six attempts and a backoff, so it is marked failed with the
      // reason and never offered again.
      if (!deliverable(row.to)) {
        await this.give(row, OUTBOX_MAX_ATTEMPTS,
          'reserved address (RFC 2606) — provably undeliverable, never retried');
        failed += 1;
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
          failed += 1;
        } else {
          await this.deps.persistence.markOutboxFailed(row.id, attempts, this.now, why);
          console.error(`mail to ${row.to} failed (attempt ${attempts}/${OUTBOX_MAX_ATTEMPTS}), ` +
            `will retry: ${why}`);
        }
      }
    }
    return { sent, failed, held: false };
  }

  /** Give up on a row: loud, because nobody is watching the queue, and
   *  the token goes with it. */
  private async give(row: OutboxRow, attempts: number, why: string): Promise<void> {
    await this.deps.persistence.markOutboxFailed(row.id, attempts, this.now, why);
    console.error(`MAIL GIVEN UP: "${row.subject}" to ${row.to} after ${attempts} ` +
      `attempts — ${why}`);
    if (row.tokenHash !== undefined) {
      await this.deps.revoke(row.tokenHash).catch((e: unknown) => {
        console.error('revoking the undelivered link failed:', e);
      });
    }
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
