/**
 * Mail out of docs.vote via Resend (Ed, 2026-08-18: the sending domain was
 * the hosting decision), or — without an API key — the dev outbox: every
 * mail lands in data/outbox.jsonl and on the console, links intact, so a
 * developer's inbox is a tail of one file. These templates are the real
 * copy; design/setup.js's MAILS is fixture-only preview text and the two
 * are free to differ.
 *
 * And since Q1310 a third destination in both branches: **a bot's mail is
 * caught by the host** (Ed, 2026-09-10) — filed in the bot outbox, never
 * handed to Resend — so `room-bots` can seat a room on docs.vote itself.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Mail {
  to: string;
  subject: string;
  text: string;
  /** The magic link, called out so the dev outbox is easy to drive. */
  link?: string;
}

export interface Mailer {
  readonly dev: boolean;
  send(mail: Mail): Promise<void>;
}

/**
 * The TLDs that can never receive mail (RFC 2606 §2, RFC 6761): reserved
 * for documentation and testing, guaranteed never to resolve. Note the
 * reserved second-level *domains* — example.com/net/org — are deliberately
 * absent: they are equally undeliverable, but this project's own tests
 * follow real magic links at @example.org, so refusing them would refuse
 * the tests' own inbox.
 */
const UNDELIVERABLE_TLDS = new Set(['invalid', 'test', 'example', 'localhost']);

/**
 * **Mail to a reserved address is refused at the mailer** (Q680). Sending
 * to an address that provably cannot receive is bounce traffic, and bounce
 * traffic is what costs a young sending domain its reputation — so this is
 * worth having on its own. It is also the seam the phase ladder is silenced
 * through: its cast lives at `@ladder.invalid`, and refusing here survives
 * a restart, a later tick and the close, where a flag held beside the
 * document during the build survives none of the three (`relay` runs
 * unconditionally on every fresh entry, and the close mails everybody
 * long after any build has finished).
 */
export const deliverable = (to: string): boolean => {
  const at = to.lastIndexOf('@');
  if (at < 0) return false;
  const tld = to.slice(at + 1).toLowerCase().split('.').pop() ?? '';
  return !UNDELIVERABLE_TLDS.has(tld);
};

/**
 * **A bot's address is any address at `bots.docs.vote`** (Q1310; Ed,
 * 2026-09-10: *why don't we catch all emails to \*@bots.docs.vote instead,
 * since they could never be confused for a real email address*). The domain
 * must match exactly, case aside: `x@bots.docs.vote.evil.com` and
 * `x@notbots.docs.vote` are strangers' addresses like any other. A bot's
 * mail is never handed to Resend and never a bounce — it is filed in the
 * bot outbox instead, in the production branch and the dev branch alike,
 * so `room-bots` seats the same room against docs.vote as against a dev
 * server. Different from `deliverable`, which refuses; this one redirects.
 */
export const BOT_DOMAIN = 'bots.docs.vote';
export const isBotAddress = (to: string): boolean => {
  const at = to.lastIndexOf('@');
  return at >= 0 && to.slice(at + 1).toLowerCase() === BOT_DOMAIN;
};

/**
 * The bot outbox: the dev outbox's shape (`at`, `to`, `subject`, `text`,
 * `link`), one JSONL row per mail, in the data dir beside it. Ephemeral by
 * nature and by design — on the production host the data dir is the
 * instance's own filesystem and goes with every deploy — which is fine: a
 * magic link is one-use, and `room-bots` asks for a fresh login when the
 * one it finds is spent.
 */
export const BOT_OUTBOX_FILE = 'bots-outbox.jsonl';
export const botOutboxPath = (dataDir: string): string => join(dataDir, BOT_OUTBOX_FILE);

/**
 * The tail of an outbox file, newest first — the one reader behind both
 * `GET /api/dev/outbox` and `GET /api/bots/outbox`, so the two routes
 * answer in one shape and `room-bots` reads them with one function.
 */
export function outboxTail(file: string, n = 30): unknown[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).slice(-n)
    .map((l) => { try { return JSON.parse(l) as unknown; } catch { return null; } })
    .filter((m) => m !== null).reverse();
}

export function makeMailer(opts: {
  resendApiKey: string | null;
  mailFrom: string;
  dataDir: string;
}): Mailer {
  const botOutbox = botOutboxPath(opts.dataDir);
  /** One row in an outbox file; the directory is made on the first write,
   *  never at boot (config.ts: an eager mkdir once crash-looped a host). */
  const file = (path: string, mail: Mail): void => {
    mkdirSync(opts.dataDir, { recursive: true });
    appendFileSync(path, JSON.stringify({ at: Date.now(), ...mail }) + '\n', 'utf8');
  };
  if (opts.resendApiKey === null) {
    const outbox = join(opts.dataDir, 'outbox.jsonl');
    mkdirSync(opts.dataDir, { recursive: true });
    return {
      dev: true,
      send: async (mail) => {
        // refused in the dev branch too, and not only for symmetry: the
        // outbox is a developer's inbox and the 📬 modal reads its tail,
        // so a stagehand roster would bury the one mail they were waiting for
        if (!deliverable(mail.to)) {
          console.log(`[mail dropped→${mail.to}] reserved address, never delivered`);
          return;
        }
        file(outbox, mail);
        // a bot's mail lands in both: the dev outbox as ever (📬 shows it,
        // the walks read it), and the bot outbox so that `room-bots --key`
        // works against a dev server exactly as against docs.vote
        if (isBotAddress(mail.to)) file(botOutbox, mail);
        console.log(`[mail→${mail.to}] ${mail.subject}${mail.link ? ` :: ${mail.link}` : ''}`);
      },
    };
  }
  const key = opts.resendApiKey;
  return {
    dev: false,
    send: async (mail) => {
      // a bot's: filed on the host, never sent (Q1310) — the provider never
      // hears of it, so it is not a bounce either
      if (isBotAddress(mail.to)) {
        file(botOutbox, mail);
        console.log(`[mail→bot outbox→${mail.to}] ${mail.subject}`);
        return;
      }
      // never handed to the provider: a guaranteed bounce, and on a young
      // sending domain bounces are the expensive kind of mistake
      if (!deliverable(mail.to)) {
        console.log(`[mail dropped→${mail.to}] reserved address, never delivered`);
        return;
      }
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: opts.mailFrom,
          to: [mail.to],
          subject: mail.subject,
          text: mail.text,
        }),
      });
      if (!res.ok) {
        // the provider's body is for the log, never the requester
        // (review #1, finding 16)
        console.error(`resend refused (${res.status}):`, await res.text());
        throw new Error('the mail could not be sent — try again shortly');
      }
    },
  };
}

/**
 * The three leads in words (R-097): the warning says how long it has, in
 * the unit the lead was chosen in. Anything else — a lead a future ladder
 * might add — falls to the nearest whole unit.
 */
const leadPhrase = (ms: number): string => {
  const HOUR = 3_600_000, DAY = 24 * HOUR;
  if (ms === 7 * DAY) return 'a week';
  if (ms === DAY) return 'a day';
  if (ms === HOUR) return 'an hour';
  if (ms >= DAY) return `${Math.round(ms / DAY)} days`;
  if (ms >= HOUR) return `${Math.round(ms / HOUR)} hours`;
  return `${Math.max(1, Math.round(ms / 60_000))} minutes`;
};

export const MAILS = {
  // Q460: clicking the link IS the creation — the document comes into
  // being at the address promised, and not before
  create: (title: string, slug: string, link: string): Omit<Mail, 'to'> => ({
    subject: `Create “${title}”`,
    // the prose states the same address the `link` beside it resolves to:
    // one document route, `/d/<slug>`, and no bare `/<slug>` (backlog 70)
    text: `You have named a document “${title}” and chosen its address, docs.vote/d/${slug}.\n\n` +
      `Open this link to create it there:\n${link}\n\n` +
      `Until you do, nothing exists anywhere — this address is the only way back in.`,
    link,
  }),
  invite: (title: string, link: string): Omit<Mail, 'to'> => ({
    subject: `You are invited to “${title}”`,
    text: `You have been invited to become a member of “${title}”.\n\n` +
      `Open your invitation:\n${link}\n\n` +
      `Membership begins when you arrive; until then you count toward nothing.`,
    link,
  }),
  applyVerify: (title: string, link: string): Omit<Mail, 'to'> => ({
    subject: `Your application to “${title}”`,
    text: `This address is how “${title}” will know you.\n\n` +
      `Verify it to continue your application:\n${link}\n\n` +
      `Nothing has been sent to the members yet — nothing is, until you submit.`,
    link,
  }),
  admitted: (title: string, link: string): Omit<Mail, 'to'> => ({
    subject: `You are a member of “${title}”`,
    text: `The members of “${title}” have admitted you.\n\n` +
      `Log in to take your seat:\n${link}`,
    link,
  }),
  login: (title: string, link: string): Omit<Mail, 'to'> => ({
    subject: `Log in to “${title}”`,
    text: `Here is your login link for “${title}”:\n${link}`,
    link,
  }),
  /**
   * Each of the three warnings names its own lead (R-097): a week, a day,
   * an hour before the lapse. A member gets all three that fit their spell.
   */
  lapseWarning: (title: string, link: string, leadMs: number): Omit<Mail, 'to'> => ({
    subject: `Your membership of “${title}” is about to lapse`,
    text: `You have been inactive for a while, and your membership of ` +
      `“${title}” will lapse in about ${leadPhrase(leadMs)}. ` +
      `Logging in is all it takes to stay:\n${link}`,
    link,
  }),
  /** To the operator (cfg.notifyEmail), never to a member. */
  newDocument: (title: string, url: string, founder: string): Omit<Mail, 'to'> => ({
    subject: `New document: “${title}”`,
    text: `“${title}” has just been created by ${founder}.

${url}`,
    link: url,
  }),
  /** The close (SPEC §4.6): every member and invitee, once, with a link to the record. */
  closed: (title: string, link: string): Omit<Mail, 'to'> => ({
    subject: `“${title}” has closed`,
    text: `“${title}” has closed. The document is final, and the record of how it ` +
      `got there is published with it:
${link}

` +
      `Members may add a closing comment — dissent as welcome as praise — which ` +
      `signs the document.`,
    link,
  }),
  /**
   * Exile at will (SURFACE E31, Q901): the one event whose audience is
   * outside the document. No login link — a token would be minted for a
   * seat that no longer exists — but the document's own address, since where
   * 🌍 lets strangers read they may still read. The office, never the name
   * (C10); no reason, since `remove` takes none.
   */
  removed: (title: string, link: string): Omit<Mail, 'to'> => ({
    subject: `You are no longer a member of “${title}”`,
    text: `The Founder has removed you from the membership of “${title}”. ` +
      `Your answers and votes no longer count in it.\n\n` +
      `The document is here, if its visibility lets you read it:\n${link}`,
    link,
  }),
  lapsed: (title: string, link: string): Omit<Mail, 'to'> => ({
    subject: `Your membership of “${title}” has lapsed`,
    text: `Your membership of “${title}” has lapsed. Your votes still ` +
      `count; you have simply left the quorum base. Reviving is logging in:\n${link}`,
    link,
  }),
} as const;
