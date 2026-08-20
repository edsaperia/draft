# docs/legal — drafts for review

Written 2026-08-20 for PRODUCTION.md **stage 12** ("Privacy, ToS, retention,
erasure"), under decision **495**: placeholders are fine, every one of them is
visibly marked, and these are drafts for Ed's review rather than legal advice.

**Neither document is in force.** Neither is linked from the product. Both
carry a blockquoted warning at the top saying so, and that warning is the last
thing to delete.

## What is here

| File | What it is |
|---|---|
| `PRIVACY.md` | Privacy policy draft. What docs.vote collects, where it is stored, who else touches it, cookies, magic links, retention, and the erasure answer. |
| `TERMS.md` | Terms of service draft. Who may use it, how a document works, what you may not do, what happens when you leave or a document closes, and the alpha disclaimers. |

Both are written to be **factually true of the code as it stands on
2026-08-20**, not aspirationally. Where the code is about to change — the
Postgres cutover, the deletable `people` table, the restore drill — the draft
says the true thing now and carries a marked placeholder saying what to update
and when.

Both are in plain English, in short sections, with no spec section numbers
anywhere in the body: members never see SPEC.md, so a policy that cites it is
citing a document that does not exist for its reader.

## What the drafts assert, and where it comes from

Checked against the source rather than remembered:

- **Collected**: email address (max 254 chars, lowercased, one address one
  member), name (80), picture (a ground index, a drawn mark, one emoji, or an
  uploaded data-URI image up to 150KB), document title (200), document text
  (500,000), rationales (5,000), application words (2,000), judgments, blind
  founding answers, and the acts a group has to see. `commands.ts` `LIMITS`.
- **Stored** in one append-only hash-chained JSONL log per document, plus an
  engine log and bridge state beside it (`persistence.ts`). Postgres arriving
  as the store, hybrid, same records (PRODUCTION.md stage 6).
- **Hosted** on Render in Frankfurt; mail via Resend from eu-west-1;
  Cloudflare in front of Render (PRODUCTION.md stages 4 and 9).
- **Cookie**: exactly one, `draft_session`, 90 days, `HttpOnly`,
  `SameSite=Lax`, `Secure` over HTTPS, stateless HMAC over
  (docId, memberId, expiry) — `auth.ts`, `server.ts:785`.
- **Magic links**: 24 random bytes, 7-day TTL, single-use (deleted on verify),
  stored as a SHA-256 hash — `auth.ts`.
- **IP addresses**: rate-limiting only, in-memory `Map`, 20 requests per route
  per 10 minutes, read from `cf-connecting-ip` or a hop count. Never written
  to disk by the app — `server.ts:38`, `ipOf`.
- **Operator notification mail** on every document creation, carrying the
  title, the founder's address and the URL — `mailer.ts` `MAILS.newDocument`,
  `config.ts` `notifyEmail`.
- **Lapse mails**: a warning before, a notice after — `MAILS.lapseWarning`,
  `MAILS.lapsed`.
- **Erasure** is worded in stage 12's own sentence, near-verbatim: erasure
  removes identity, contact details and anything you wrote from every view and
  every published record; unattributed judgments remain, because the group's
  decision was made with them.
- **Sealed authorship**: who wrote a proposal is sealed by default and names
  appear at the record only as far as the document's own anonymity settings
  allow; individual judgments are never attributed in any setting.

## The placeholders

Every one is written `[[PLACEHOLDER: …]]` and greppable with:

```
grep -rn "\[\[PLACEHOLDER" docs/legal/
```

They fall into four groups.

**Identity and contact** — the same handful, repeated in both files: legal
entity name, registered address, contact email for privacy requests, contact
email for general enquiries, contact email for security reports, whether a DPO
is required, ICO registration number, effective date, version number.

**Numbers and periods** — retention for closed documents, retention for
backups, provider log retention, notice period before shutdown, age floor,
liability cap.

**Legal positions that cannot be guessed** — controller/processor split,
lawful basis per purpose, international transfer mechanism for the three US
providers, governing law and jurisdiction, the liability clause, consumer-law
carve-outs.

**Facts about the product that are about to change, or that I could not
confirm** — whether image uploads are offered at launch, whether member email
addresses stay visible to other members, the Google Fonts request from the
served page, whether the automatic erasure mechanism has landed, whether the
restore drill has passed, and whether there is any moderation process at all.

## Decisions Ed has to make

Numbered so they can be answered by number. These are the ones that block
publication; the rest of the placeholders are fill-in-the-blank once these are
settled.

1. **Who is the legal entity?** A named individual, a sole trader, or a
   company. Everything else hangs off this: the controller analysis, the
   liability position, which supervisory authority applies, and whether an
   address has to be published at all. It is the first decision and it is not
   really a legal question — it is whether docs.vote is a person's project or
   a thing with a company around it.

2. **Controller or processor for document content?** Reading (a): the operator
   is controller for everything — simplest to write, and it makes the operator
   answerable for what groups it has no relationship with write. Reading (b):
   controller for account and service data, processor for each document on
   behalf of its founder — the usual shape for a hosted collaboration tool,
   but it needs a processing agreement with each founder, which at alpha scale
   can be a paragraph in the Terms. The drafts assume **(b)**. If the answer
   is (a), the "Who the data belongs to" and lawful-basis sections both need
   rewriting.

3. **Publish now with a manual erasure process, or wait for the mechanism?**
   The erasure promise as written is the one stage 12 argued for and it is the
   right promise. But the machinery behind it — `person_id`, the deletable
   `people` table, redaction at the projection — arrives with the Postgres
   schema and has not landed. Until it does, an erasure request is carried out
   by hand. Publishing with an honest note saying so is defensible at five
   users; publishing as though the automatic path exists is not.

4. **Keep the operator notification mail as it stands?** It currently carries
   the founder's email address to the operator on every document creation. It
   is disclosed plainly in the draft, which is the honest option, and it is
   also the whole of the alpha's analytics. The alternatives are to drop the
   founder's address (title and URL only), or to reduce it to a count. One
   configuration value either way, and the draft is written for whichever
   answer.

5. **Retention for a closed document.** The point of the record is that it
   lasts — that is the mechanism's whole claim. But "forever" is not a
   retention period a policy can state without a justification behind it, and
   it sits awkwardly beside the erasure promise. Options: a fixed period after
   close; keep indefinitely with a stated justification; or keep indefinitely
   but let each group set its own period as one of its rules. The third is the
   most in keeping with the product and the most work.

6. **Is there a moderation process, and should the Terms promise one?**
   Today: none, and no report button. PRODUCTION.md already records that
   abuse and moderation are not launch blockers at five users. The Terms
   forbid a list of things with nothing behind the prohibition, which is worse
   than saying plainly that there is no process yet. Decide whether to add a
   report address, or to be explicit about the absence.

Two smaller ones, not blocking but cheap to close while the files are open:

7. **Self-host the web font?** The served page loads Google Fonts, which means
   every reader's browser contacts Google. Self-hosting deletes a third-party
   disclosure from the privacy policy and a CSP exception from the headers.
   Small piece of work, and it makes the "no third-party anything" claim true
   without qualification.

8. **Are member email addresses visible to other members?** They are how
   invitees are listed before a name exists. Most people will assume otherwise,
   so it needs stating either way — and if the answer is meant to be no, that
   is a product change rather than a copy change.

## Before either goes live

The go-live checklist (PRODUCTION.md stage 16) already carries "privacy policy
and ToS linked". Add to that:

- a lawyer has read both;
- every `[[PLACEHOLDER` is gone (`grep` is the test);
- the draft warning at the top of each file is deleted;
- the effective date is set and the version numbered;
- processing agreements with Render, Resend and Cloudflare are on file, and
  the transfer mechanism is written down;
- both are reachable from the product — the alpha flag is the obvious
  neighbour for the link.
