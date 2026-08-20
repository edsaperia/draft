/**
 * Mail out of docs.vote via Resend (Ed, 2026-08-18: the sending domain was
 * the hosting decision), or — without an API key — the dev outbox: every
 * mail lands in data/outbox.jsonl and on the console, links intact, so a
 * developer's inbox is a tail of one file. These templates are the real
 * copy; design/setup.js's MAILS is fixture-only preview text and the two
 * are free to differ.
 */
import { appendFileSync } from 'node:fs';
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

export function makeMailer(opts: {
  resendApiKey: string | null;
  mailFrom: string;
  dataDir: string;
}): Mailer {
  if (opts.resendApiKey === null) {
    const outbox = join(opts.dataDir, 'outbox.jsonl');
    return {
      dev: true,
      send: async (mail) => {
        appendFileSync(outbox, JSON.stringify({ at: Date.now(), ...mail }) + '\n', 'utf8');
        console.log(`[mail→${mail.to}] ${mail.subject}${mail.link ? ` :: ${mail.link}` : ''}`);
      },
    };
  }
  const key = opts.resendApiKey;
  return {
    dev: false,
    send: async (mail) => {
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

export const MAILS = {
  create: (title: string, link: string): Omit<Mail, 'to'> => ({
    subject: `Create “${title}”`,
    text: `You have created a document called “${title}”.\n\n` +
      `Log in to create it:\n${link}\n\n` +
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
  lapseWarning: (title: string, link: string): Omit<Mail, 'to'> => ({
    subject: `Your membership of “${title}” is about to lapse`,
    text: `You have been inactive long enough that your membership of ` +
      `“${title}” is about to lapse. Logging in is all it takes to stay:\n${link}`,
    link,
  }),
  /** To the operator (cfg.notifyEmail), never to a member. */
  newDocument: (title: string, url: string, founder: string): Omit<Mail, 'to'> => ({
    subject: `New document: “${title}”`,
    text: `“${title}” has just been created by ${founder}.

${url}`,
    link: url,
  }),
  lapsed: (title: string, link: string): Omit<Mail, 'to'> => ({
    subject: `Your membership of “${title}” has lapsed`,
    text: `Your membership of “${title}” has lapsed. Your judgments still ` +
      `count; you have simply left the quorum base. Reviving is logging in:\n${link}`,
    link,
  }),
} as const;
