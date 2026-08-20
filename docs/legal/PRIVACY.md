> # ⚠️ DRAFT — NOT IN FORCE
>
> **This is a draft for the operator's review. It is not legal advice, it has
> not been reviewed by a lawyer, and it does not yet apply to anybody.**
>
> Every unresolved point is marked `[[PLACEHOLDER: …]]`. Nothing here should be
> published, linked from the product, or relied on by a user until those are
> filled in and a qualified adviser has read the result. See `README.md` in
> this folder for the decisions that have to be made first.

# Privacy Policy

**Effective date:** `[[PLACEHOLDER: effective date — leave unset while this is a draft]]`
**Version:** `[[PLACEHOLDER: version number]]`

## Who we are

docs.vote is run by `[[PLACEHOLDER: legal entity name — a named individual, a
sole trader, or a company; this determines almost everything below]]` of
`[[PLACEHOLDER: registered or business address]]`.

For questions about this policy, or to make any of the requests described
below, write to `[[PLACEHOLDER: contact email for privacy requests]]`.

`[[PLACEHOLDER: data protection officer — most likely not required at this
scale, but say so explicitly rather than leaving it out]]`

`[[PLACEHOLDER: ICO (or other supervisory authority) registration number, if
registration is required]]`

## What docs.vote is

docs.vote lets a small group write a document together. One person creates a
document and invites others by email. Members propose changes, judge the
proposals against each other, and the document changes when the group's
agreement is strong enough. When the document closes, a record of how it was
written is published to the people who took part.

The design has an unusual privacy property built into it, and it shapes
everything in this policy: **your individual judgments are never attributed to
you**, and who wrote which proposal is sealed unless the group itself decides
otherwise.

## Who the data belongs to

`[[PLACEHOLDER: controller / processor split — the single most important legal
decision in this document. Two readings are available:

  (a) The operator is the controller for everything. Simplest to write,
      hardest to defend, and it makes the operator answerable for content
      written by groups it has no relationship with.

  (b) The operator is the controller for account and service data (your email
      address, your login, security logs) and a processor for the contents of
      each document on behalf of the person who created it. This is the usual
      shape for a hosted collaboration tool, but it needs a data processing
      agreement with each founder, which at alpha scale may be a single
      paragraph in the Terms.

Reading (b) is assumed in the wording below. If (a) is chosen, this section and
the lawful-basis section both need rewriting.]]`

## What we collect

### Things you give us

- **Your email address.** Required. It is how docs.vote knows who you are —
  there are no usernames and no passwords. One address is one member of a
  document.
- **Your name.** Optional, up to 80 characters. If you leave it blank you
  appear to the other members as "Anonymous".
- **Your picture.** Optional. You may pick a coloured background for your
  initials, a simple drawn mark, or an emoji. `[[PLACEHOLDER: uploaded image
  files — the code accepts a small uploaded image as well as the built-in
  choices. Confirm whether uploads are actually offered in the interface at
  launch; if they are, this section should say so plainly, because an
  uploaded photograph is a different kind of personal data from an emoji.]]`
- **What you write.** The document text, your proposed changes to it, and the
  reasons you give for them. Also the few optional words somebody may write
  when applying to join a document.
- **Your judgments.** Which of two proposals you preferred, or that you had no
  preference. These are recorded so the group's decision can be worked out,
  and they are **never attributed to you** anywhere in the product or in the
  published record.
- **Your answers to the founding questions.** Before a document starts, members
  are asked privately what they will accept — how much of the room has to
  agree, how private things should be. These are collected blind: nobody sees
  who said what, and only the totals and the shape of the answers are shown.
  They are held in plain text in our records.
- **Your other actions in a document.** Inviting somebody, proposing a change
  to a rule, accepting or refusing one, declaring that you are finished. These
  are recorded with your name against them, because they are acts the group
  has to be able to see.

### Things we collect automatically

- **A login cookie** — see *Cookies* below.
- **Your IP address**, briefly, and only to stop the login and invitation
  doors being flooded. We count requests per address for ten minutes at a
  time, in memory. We do not write it to disk and it is gone when the count
  expires or the service restarts. `[[PLACEHOLDER: our hosting and network
  providers keep their own request logs, which include IP addresses. Confirm
  their retention periods and state them here — see *Who else handles your
  data*.]]`

### Things we do not collect

No analytics, no advertising, no tracking pixels, no third-party scripts, no
profiling, and no automated decision-making about you. `[[PLACEHOLDER: the
served page loads a web font from Google Fonts, which means the reader's
browser contacts Google. Either say so here, or self-host the font and delete
this note. Self-hosting is the cleaner answer and is a small piece of work.]]`

## Why we collect it, and on what legal basis

`[[PLACEHOLDER: lawful basis under UK GDPR / GDPR Article 6. The likely answer
is a mix, and it needs to be decided per purpose rather than picked once:

  - Running the service you asked for (your email, your login, the document
    you joined): most naturally *performance of a contract*, or *legitimate
    interests* where there is no contract with that person.
  - Security and abuse prevention (rate limiting, security logs): *legitimate
    interests*, with a legitimate interests assessment written down.
  - The operator notification email on document creation: *legitimate
    interests*, and it needs a documented balancing test — see that section.

Consent is probably the wrong basis for most of this, because a group document
cannot function if one member withdraws consent to being in it.]]`

We use what we collect only to run docs.vote: to log you in, to show the other
members who is in the room, to work out what the group decided, to email you
about documents you are part of, and to keep the service standing up.

We do not sell anything, and we do not share your data with anyone except the
service providers listed below.

## Cookies

docs.vote sets **one cookie**, and only when you log in.

| | |
|---|---|
| Name | `draft_session` |
| What it holds | Which document you are logged into and which member you are, signed so it cannot be altered |
| How long | 90 days |
| Flags | `HttpOnly` (scripts cannot read it), `SameSite=Lax`, and `Secure` over HTTPS |

It is strictly necessary to log you in, so we do not ask for consent to set it.
There are no other cookies, no third-party cookies, and nothing that follows
you anywhere else. Deleting it logs you out; you can log back in by asking for
a new link.

## Logging in

There are no passwords. You give an email address and we send you a link.

- The link works **once**, and expires after **7 days**.
- We store the link's secret as a one-way hash, so a copy of our records
  cannot be used to log in as you.
- Following the link logs you in and gives you the cookie above.

## Emails we send

We send email only about documents you are part of:

- the link that creates your document, or that opens your invitation;
- a login link, when you ask for one;
- notice that a group has admitted you;
- a warning that your membership is about to lapse through inactivity, and
  notice when it has;
- notice that a document has closed, with a link to the record.

There is no marketing and no newsletter, so there is nothing to unsubscribe
from. To stop receiving mail about a document, leave it — see *Erasure*.

### One email that is not to a member

When somebody creates a new document, we send **the operator** an email with
the document's title, the address of the person who created it, and its
address on the site. During the alpha this is how we know the service is being
used at all; it is the whole of our analytics.

`[[PLACEHOLDER: this needs a decision and probably a documented balancing test.
Options: keep it and disclose it exactly as above (honest, and it is disclosed
here); reduce it to the title and the URL without the founder's address; or
replace it with a bare count. It is a single configuration value either way.]]`

## Where your data lives

- **The documents themselves** are held as an append-only record — a list of
  everything that happened, in order, each entry sealed against the one before
  it so that nothing can be quietly changed after the fact. This is what lets
  anybody check that the record of a decision is the record that was made.
  It is also the reason erasure works the way it does, below.
- **Hosting** is with Render, in **Frankfurt, Germany**, on a persistent disk.
  A managed PostgreSQL database in the same region is being brought in as the
  store; the same records, the same append-only rule.
  `[[PLACEHOLDER: update this sentence once the database cutover has happened,
  and delete the "being brought in" wording.]]`
- **Email** goes out through Resend, sending from the **eu-west-1 (Ireland)**
  region.
- **Network traffic** reaches us through Cloudflare, which sits in front of
  our hosting.

## Who else handles your data

| Who | What they do | What they see |
|---|---|---|
| Render | Hosting and the database | Everything stored, and their own request logs |
| Resend | Sending our email | Your address, and the contents of the mail, including your login link |
| Cloudflare | Sits in front of the site | Your IP address and the requests you make |

`[[PLACEHOLDER: each of these needs (a) a data processing agreement in place —
all three publish standard terms, so this is a matter of accepting them and
keeping the record; and (b) an international transfer check. All three are
US-headquartered companies serving us from EU regions, which means the UK
IDTA / EU Standard Contractual Clauses question has to be answered rather than
assumed. State the mechanism here once it is settled.]]`

`[[PLACEHOLDER: retention period for each provider's logs — ask, then state.]]`

## How long we keep things

| What | How long |
|---|---|
| A live document and its record | For as long as it exists — see below |
| A closed document's record | `[[PLACEHOLDER: retention period for closed documents. This is a real decision: the point of the record is that it lasts, but "forever" is not a retention period a policy can state without justifying it.]]` |
| Login links | 7 days, or until used |
| Your login cookie | 90 days |
| Rate-limiting counts | 10 minutes, in memory only |
| Backups | `[[PLACEHOLDER: backup retention period — must match what the backup system actually does, and must be reconciled with erasure, since a deletion has to reach the backups too or be honestly described as reaching them on a stated schedule.]]` |
| Text pasted before a document is saved | 7 days, then deleted |

## Erasure

You can ask us to erase you, at
`[[PLACEHOLDER: contact email for privacy requests]]`. Here is exactly what
that does, stated in advance so that nobody joins a document without knowing.

**Erasure removes your identity, your contact details and anything you wrote,
from every view and every published record.** Your name, your picture, your
email address, your proposals, your reasons, and anything you wrote in an
application: all of it goes.

**Your judgments, which were never attributed to you, remain, because the
group's decision was made with them.** They are not linked to you and never
were — nobody, including us, can point at a judgment and say it was yours.
Removing them would not protect you, and it would change the record of a
decision that other people relied on when they agreed to it.

We think that is the honest trade, and we would rather say it before you join
than after you ask.

`[[PLACEHOLDER: the mechanism behind this promise is being built. Personal
details are moving into a separate table that can simply be deleted, and free
text is being redacted at the point it is displayed so the record's seals still
hold. Until that work has landed, an erasure request has to be carried out by
hand, and this policy should not be published as though the automatic path
exists. Decide whether to publish with a plainly stated manual process, or to
wait for the mechanism.]]`

## Your other rights

Under UK GDPR and the GDPR you can ask us to:

- **show you** what we hold about you;
- **correct** it, if it is wrong;
- **give you a copy** in a portable form;
- **restrict** or **object to** what we do with it;
- **erase** it, as described above;
- **withdraw consent**, where we relied on consent.

Write to `[[PLACEHOLDER: contact email for privacy requests]]`. We will answer
within one month.

If you think we have got it wrong, you can complain to
`[[PLACEHOLDER: supervisory authority — the ICO for a UK-established operator,
or the lead authority in the relevant EU member state; this follows from where
the operator is established]]`. We would rather you told us first.

## What other members can see

- Your **name and picture**, if you set them, and the fact that you are a
  member.
- **Your email address** is visible to the other members of a document.
  `[[PLACEHOLDER: confirm this is still true at launch. It is how invitees are
  listed before they have chosen a name, and it is worth being explicit about
  because most people will assume otherwise.]]`
- The **acts** you take that the group has to be able to see: proposing a rule
  change, inviting somebody, accepting or refusing.

They cannot see your judgments, and they cannot see who wrote which proposal
unless the document's own privacy settings say otherwise.

## Names, proposals, and the record

Each document decides its own privacy rules — whether proposals are anonymous,
whether authors may sign their work, whether judgments are ever revealed. The
members agree those rules together before the document starts, and a rule can
only be changed afterwards if **every** member agrees.

By default, **who wrote a proposal is sealed**. When the document closes, the
record is published to the people who took part, and names appear in it only
as far as that document's own privacy rules allow. **Individual judgments are
never attributed to anybody, in any setting.**

## Security

The service runs over HTTPS only. Login links are single-use, expiring, and
stored hashed. The login cookie cannot be read by scripts. Requests to the
login and invitation doors are rate-limited.

`[[PLACEHOLDER: state plainly that the records are stored unencrypted at the
application level and are readable by the operator. This is true, it is normal,
and saying it is better than implying otherwise.]]`

## Children

docs.vote is not for children.
`[[PLACEHOLDER: age floor — 16 is the usual UK GDPR line for information
society services relying on consent; 18 is simpler to enforce and matches the
intended users. Pick one and state it in both this policy and the Terms.]]`

## Changes to this policy

If we change this policy in a way that matters, we will email the members of
every live document before it takes effect.

## Alpha

docs.vote is in alpha. It is small, it is new, and it is run by
`[[PLACEHOLDER: legal entity name]]` rather than by a company with a legal
department. `[[PLACEHOLDER: decide how frankly to say this. Being upfront about
the scale of the operation is honest and sets expectations, but a policy is
also a set of commitments and hedging them undermines the point.]]`
