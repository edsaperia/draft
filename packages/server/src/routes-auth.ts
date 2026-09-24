/**
 * The doors a person arrives through (refactor Q1352 (m), (n)): the address
 * check, the save that mails the founder their own link, the pre-save text
 * stash, the magic-link interstitial and the four POSTs that consume a
 * token — create, apply, login — plus the two per-document doors that mint
 * those mails, `/api/d/:slug/login` and `/api/d/:slug/apply`.
 *
 * One table, in the chain's order, because every row here ends in a token,
 * a cookie or a refusal: nothing in it reads a document as a member. The
 * two slug helpers were defined per request inside the old chain; they take
 * the context and the clock now, which is the same two values the closure
 * gave them.
 */
import { randomBytes } from 'node:crypto';
import { ConstitutionSession, mayApply, sha256Hex } from '../../constitution/src/index.js';
import type { ApplicationsValue } from '../../constitution/src/index.js';
import { magicLink } from './auth.js';
import { LIMITS, cap, emailOk } from './commands.js';
import { logError } from './error-log.js';
import { MAILS } from './mailer.js';
import { slugify, uniqueSlug } from './store.js';
import { admissionPrice } from './views.js';
import { expectString, html, json, rateLimited, readJson, readTokenBody, redirect, setCookie } from './routes.js';
import type { Req, RouteContext, Route } from './routes.js';

/** The address grammar the page shares (Q460): lower case, digits,
 *  hyphens, starting with a letter or digit. One character is enough
 *  (Q1288, Ed 2026-09-08: *we should allow one character addresses*) —
 *  the floor of three that stood from Q460 was never ruled. */
const SLUG_OK = /^[a-z0-9][a-z0-9-]*$/;

/** What `auth.mintToken` makes: `randomBytes(24)` as base64url (issue #67 F2). */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{32}$/;

/** Free if no document holds it and no live pending creation has
 *  reserved it (Q462b). */
const slugFree = async (ctx: RouteContext, nowMs: number, slug: string): Promise<boolean> =>
  !ctx.store.slugTaken(slug) && (await ctx.stash.reservedBy(slug, nowMs)) === null;

/** uniqueSlug over both kinds of taken-ness. */
async function uniqueSlugAsync(ctx: RouteContext, nowMs: number, base: string): Promise<string> {
  if (await slugFree(ctx, nowMs, base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (await slugFree(ctx, nowMs, candidate)) return candidate;
  }
}

export const authTable: Route[] = [
  {
    /* the address, asked before the email (Q460): is it free? A document
       holds it, or a pending creation has reserved it (Q462b) — the one
       small oracle on pending documents, the price of promising an
       address. No personal data: a slug is a public name by design. */
    name: 'GET /api/slug/:slug',
    method: 'GET',
    match: ({ seg }) => seg[0] === 'api' && seg[1] === 'slug' && seg.length === 3,
    handler: async (ctx, r) => {
      const { res, seg, nowMs } = r;
      // twenty founders on one venue address, each trying addresses until
      // one is free: 120 was 6 tries each (issue #69). **Twenty phones'
      // worth** (Ed, 2026-09-19) — and a refusal here dead-ends 📍, so the
      // budget has to outlast the typing.
      if (r.tooMany('slug', 600)) return true;
      const slug = decodeURIComponent(seg[2]!);
      if (!SLUG_OK.test(slug) || slug.length > LIMITS.slug) {
        json(res, 200, { available: false, legal: false });
        return true;
      }
      res.setHeader('cache-control', 'no-store');
      /* A refusal offers the nearest free address, exactly as the send's own
         409 has since Q462b. 📍 blocks its commit on this answer now, and a
         block that names no way forward leaves the founder to invent an
         address at the one step that mints the document. Computed only when
         it is needed: a free address costs no extra lookups. */
      const free = await slugFree(ctx, nowMs, slug);
      json(res, 200, { available: free, legal: true,
        ...(free ? {} : { suggestion: await uniqueSlugAsync(ctx, nowMs, slug) }) });
      return true;
    },
  },
  {
    name: 'POST /api/docs — the save (§9.7a)',
    method: 'POST',
    match: '/api/docs',
    handler: async (ctx, r) => {
      const { req, res, nowMs } = r;
      const { cfg, stash, auth, mailer, writes } = ctx;
      // the limiter's default 20 put twenty founders on one venue address
      // exactly at the cap, with every 📨 resend counting against it (issue
      // #69). **Twenty phones' worth** (Ed, 2026-09-19): three sends each.
      if (r.tooMany('docs', 60)) return true;
      const body = await readJson(req);
      const title = cap(expectString(body, 'title'), LIMITS.title, 'the title');
      const email = emailOk(expectString(body, 'email'));
      const isMember = body.isMember !== false;
      // a `shape` on the send is ignored (Q1363): 🧭 left the birth, and a
      // page cached from before it may still say `custom` — never a refusal
      /* 📨 is a resend, not a rival (Ed's QA, 2026-08-21: *when I click 📨
         I'm taken back to link*). The first send reserves the address for
         the pending creation (Q462b) — so a second send of the same
         creation asked for an address its own reservation held, was told
         truthfully that it was taken, and the page did the right thing with
         the wrong news and walked the founder back to 📍. The pendingId the
         first send returned is the capability that says *this reservation is
         mine*: with it, the address is free to this caller and no second
         creation is opened. Without it (a first send, an older client)
         nothing changes. */
      const givenId = typeof body.pendingId === 'string' && body.pendingId !== ''
        ? body.pendingId : null;
      const mine = givenId === null ? null : sha256Hex(givenId);
      /* **A creation already made is told so** (issue #38 F3, #40): 📨 from
         the birth tab left open beside the document carried a claimed
         stash's pendingId, which the reservation no longer honours — so it
         was told its own address was taken and offered `<slug>-2`, a twin
         with the same Founder. The pendingId is the capability, so only its
         holder learns this: no token, no mail, no cookie. */
      if (mine !== null) {
        const pend = await stash.pendingOf(mine, nowMs);
        const made = pend?.docId === undefined ? null : ctx.store.byId(pend.docId);
        if (made) {
          json(res, 200, { ok: true, created: true, slug: made.cs.slug });
          return true;
        }
      }
      // the founder chooses the address before the email (Q460); absent
      // (older clients, the tests' shorthand) it is suggested from the title
      let slug: string;
      if (typeof body.slug === 'string') {
        slug = body.slug.trim().toLowerCase();
        if (!SLUG_OK.test(slug) || slug.length > LIMITS.slug) {
          json(res, 400, { error: 'the address must be lower case, digits and hyphens, three characters or more' });
          return true;
        }
        const heldByMe = mine !== null && (await stash.reservedBy(slug, nowMs)) === mine;
        if (!heldByMe && !(await slugFree(ctx, nowMs, slug))) {
          // 462b: told "taken", and offered the nearest free one
          json(res, 409, { error: 'that address is taken',
            suggestion: await uniqueSlugAsync(ctx, nowMs, slug) });
          return true;
        }
      } else {
        slug = await uniqueSlugAsync(ctx, nowMs, slugify(title));
      }
      // the pre-save text stash (§9.7a v0.55): pasted text syncs against
      // this id while the founder is off following the mail — and since
      // Q462b it is also the reservation on the address: the slug is held
      // exactly as long as the stash lives, and take() releases it
      const expMs = nowMs + 7 * 24 * 3600_000;
      // a resend keeps its own stash — with whatever has been pasted into it
      // — and moves its reservation onto the address now asked for; only a
      // first send opens one. renew() is the truth of it, so a stash swept
      // between the check and here still falls back to a fresh creation.
      const renewed = givenId !== null && mine !== null &&
        await stash.renew(mine, expMs, slug, nowMs, email);
      const pendingId = renewed && givenId !== null
        ? givenId : randomBytes(18).toString('base64url');
      const stashKey = sha256Hex(pendingId);
      if (!renewed) await stash.open(stashKey, expMs, slug, email);
      const token = await auth.mintToken(
        { kind: 'create', email, pending: { title, slug, email, isMember, stashKey } }, nowMs);
      const link = magicLink(cfg.baseUrl, 'create', token, slug);
      await writes.sendNow({ to: email, ...MAILS.create(title, slug, link) }, null, token);
      json(res, 200, { ok: true, slug, pendingId,
        ...(mailer.dev ? { devLink: link } : {}) });
      return true;
    },
  },
  {
    /* text pasted before the save survives it (§9.7a v0.55) */
    name: 'POST /api/docs/pending — the pre-save stash',
    method: 'POST',
    match: '/api/docs/pending',
    handler: async (ctx, r) => {
      const { req, res, nowMs } = r;
      // the founder's typing is stashed as they type, so 120 was ~6 stashes
      // each for twenty founders on one venue address and then silence
      // (issue #69). **Twenty phones' worth** (Ed, 2026-09-19).
      if (r.tooMany('pending', 600)) return true;
      const body = await readJson(req);
      const pendingId = expectString(body, 'pendingId');
      const text = cap(expectString(body, 'text'), LIMITS.text, 'the text');
      const key = sha256Hex(pendingId);
      if (!(await ctx.stash.update(key, text, nowMs))) {
        // **a claimed stash is not an expired one** (issue #38 F4, #40): the
        // birth tab typing after the save met the same 404 as a dead draft,
        // which nothing read — so the page is told where the document is,
        // and stops sending what no longer reaches it
        const pend = await ctx.stash.pendingOf(key, nowMs);
        const made = pend?.docId === undefined ? null : ctx.store.byId(pend.docId);
        if (made) {
          json(res, 409, { error: 'that document has already been created',
            created: true, slug: made.cs.slug });
          return true;
        }
        json(res, 404, { error: 'that draft has expired' });
        return true;
      }
      json(res, 200, { ok: true });
      return true;
    },
  },
  {
    /* magic links are GETs, and a GET must not consume a single-use
       token — mail scanners prefetch links and would burn them (stage 3,
       defect 6). The GET serves a page that POSTs the token on arrival
       (or on a click, without JavaScript); the POST is what consumes. */
    name: 'GET the magic-link interstitial',
    method: 'GET',
    match: ({ path }) =>
      path === '/auth/create' || path === '/auth/login' || path === '/auth/apply',
    handler: (ctx, r) => {
      const { res, url, path } = r;
      const token = url.searchParams.get('token') ?? '';
      // a link a mail client wrapped across two lines arrives without its
      // token, and that is the same dead end by another road (2026-09-17)
      // **…and so is one cut anywhere else** (issue #67 F2): a mint is
      // exactly 32 base64url characters (auth.ts), so a token of any other
      // shape was truncated in transit — read as cut, and spent nowhere,
      // rather than as a link somebody used
      if (!TOKEN_SHAPE.test(token)) {
        spentPage(ctx, r, PAGE.cut, path.slice(6) as 'create' | 'login' | 'apply');
        return true;
      }
      // same-origin, overriding the global no-referrer (found on staging,
      // 2026-08-20): the fetch spec serializes a POST's Origin as *null*
      // when the submitting page's referrer policy is no-referrer, so the
      // interstitial's own form tripped the cross-site check — the two
      // stage-3 hardenings fighting each other. Same-origin keeps the
      // token-bearing Referer inside this origin and gives the POST a
      // real Origin to verify.
      res.setHeader('referrer-policy', 'same-origin');
      // the address travels with the form, so the POST can still name the
      // document on a token that turns out to be spent
      const d = url.searchParams.get('d') ?? '';
      html(res, interstitial(
        d === '' ? path : `${path}?d=${encodeURIComponent(d)}`, token));
      return true;
    },
  },
  {
    name: 'POST /auth/create — the token that founds',
    method: 'POST',
    match: '/auth/create',
    handler: async (ctx, r) => {
      const { req, res, nowMs } = r;
      const { cfg, store, stash, auth, writes, commits } = ctx;
      // One bucket, `auth:<ip>`, shared by /auth/create, /auth/login and
      // /auth/apply: 60 was twenty arrivals on one venue address with a
      // rehearsal in the same window taking it to forty (issue #69).
      // **Twenty phones' worth** (Ed, 2026-09-19), the login door's own 200
      // (Q1341). The brake reads the token first so a refusal can hand it
      // back on a page (`busyDoor`) rather than as raw JSON — the body is
      // capped at 10 KB, so nothing is spent by reading it.
      const token = await tokenOrEmpty(req);
      if (r.tooMany('auth', 200, () => { busyDoor(ctx, r, token); })) return true;
      if (pausedDoor(ctx, r, token)) return true;
      const rec = await auth.useToken(token, nowMs);
      if (!rec || rec.kind !== 'create' || !rec.pending) {
        spentPage(ctx, r, PAGE.used, 'create');
        return true;
      }
      const p = rec.pending;
      /* **One creation, however many links** (Q519, Ed 2026-08-21: *they all
         stay live, first one creates and the rest forward to what was
         created*). A re-send mints a second link against the same pending
         creation, so the first one followed creates the document and records
         itself in the stash — and every later one reads that and forwards to
         the document, logging the founder in. This holds however the address
         moved in between, because the claim is on the creation rather than
         on a name. */
      const pend = p.stashKey === undefined ? null : await stash.pendingOf(p.stashKey, nowMs);
      const made = pend?.docId === undefined ? null : store.byId(pend.docId);
      if (made) {
        // **…to the founder it names** (issue #38 F1): a link minted to a
        // mistyped 📧 and followed after the corrected one founded the
        // document was a stranger's 90-day Founder cookie. It is refused as
        // a used link — never falling through, which would found a twin —
        // and the page says why (Q1506 (b))
        const founder = made.cs.convenorRecord().email?.toLowerCase();
        if (founder !== p.email.toLowerCase()) {
          spentPage(ctx, r, PAGE.changed, 'create');
          return true;
        }
        setCookie(res, made.id, auth.cookieFor(made.id, made.cs.convenorRecord().id, nowMs), ctx.httpsOn);
        redirect(res, `/d/${made.cs.slug}`);
        return true;
      }
      /* **…and an unclaimed creation to the address it was last sent to**
         (issue #38 F5): the resend renewed the pending creation whatever the
         address, so a link to the mistyped one, followed first, founded the
         document with a stranger as its Founder and the pasted charter in
         it. A stash opened before migration 7 holds no address, and cannot
         be asked. The page says the claimed branch's sentence: one cause,
         one sentence (Q1511 (a)). */
      if (pend?.email !== undefined && pend.email.toLowerCase() !== p.email.toLowerCase()) {
        spentPage(ctx, r, PAGE.changed, 'create');
        return true;
      }
      /* **The address is the creation's, not the link's** (issue #38 F2):
         each send mints its own token with the address asked for then, while
         the resend moves the one reservation onto the address asked for now
         — so an earlier link followed first founded at the address the
         founder had moved off, and the one they chose never existed. The
         stashless token keeps its own. */
      const want = pend?.slug ?? p.slug;
      /* …and the same for a link minted before the stash carried its claim:
         the address it promised already holds a document this very founder
         made, so it forwards there rather than founding a twin beside it. */
      const twin = store.bySlug(want);
      if (twin && twin.cs.convenorRecord().email?.toLowerCase() === p.email.toLowerCase()) {
        setCookie(res, twin.id, auth.cookieFor(twin.id, twin.cs.convenorRecord().id, nowMs), ctx.httpsOn);
        redirect(res, `/d/${want}`);
        return true;
      }
      const slug = store.slugTaken(want)
        ? uniqueSlug(p.title, (s) => store.slugTaken(s)) : want;
      const id = `d-${randomBytes(5).toString('hex')}`;
      // on the chain (review #1, finding 9): the birth's persist must not
      // interleave with a first command's commit
      const doc = await commits.run(id, () => store.create(id, {
        title: p.title,
        slug,
        convenor: { id: 'founder', email: p.email, isMember: p.isMember },
      }, nowMs));
      // the pasted text is waiting in the saved document (§9.7a v0.55) —
      // waiting, not decided: confirming the starting text stays its own act
      if (p.stashKey !== undefined) {
        const text = await stash.take(p.stashKey, nowMs, id);
        if (text.length > 0) await store.setProvisional(doc, text);
      }
      await writes.commit(doc, nowMs);
      // the operator hears about every birth (Ed, 2026-08-20) — fired and
      // forgotten: the save must never fail, or wait, on this mail. Through
      // `sendNow` rather than the mailer, because the kill-switch means
      // *nothing goes out*, and a mail that leaves while mail is off is a
      // switch that does not switch.
      if (cfg.notifyEmail !== null) {
        void writes.sendNow({ to: cfg.notifyEmail,
          ...MAILS.newDocument(p.title, `${cfg.baseUrl}/d/${slug}`, p.email) }, null)
          .catch((e: unknown) => console.error('new-document notification failed:', e));
      }
      setCookie(res, id, auth.cookieFor(id, 'founder', nowMs), ctx.httpsOn);
      redirect(res, `/d/${slug}`);
      return true;
    },
  },
  {
    /* -- login ----------------------------------------------------------- */
    name: 'POST /api/d/:slug/login — mint a login link',
    method: 'POST',
    match: ({ seg }) => seg[0] === 'api' && seg[1] === 'd' &&
      seg[3] === 'login' && seg.length === 4,
    handler: async (ctx, r) => {
      const { req, res, seg, nowMs } = r;
      const { cfg, store, auth, mailer, writes } = ctx;
      const doc = r.docOr404(store.bySlug(seg[2]!));
      if (!doc) return true;
      // Two buckets on this door (Q1341, Ed 2026-09-12). Per IP, 200 in ten
      // minutes: a convention room shares one venue wifi and so one address,
      // and twenty logins were what a room of twenty spends arriving. Per
      // email, **10** in ten minutes: a scripted attack on one address is
      // the thing this cap actually stops, and it is keyed on the address,
      // not the socket. Q1341 set it at 5 and called the number a guess —
      // and 5 is one impatient member pressing 📧 while the mail is slow,
      // which is the ordinary case in a room that is all arriving at once
      // (issue #69). **Ed, 2026-09-19: 10.** The per-email check runs
      // before the roster lookup so a known and an unknown address are
      // refused identically.
      if (r.tooMany('login', 200)) return true;
      const body = await readJson(req);
      const email = emailOk(expectString(body, 'email'));
      if (rateLimited(`login-email:${email}`, nowMs, 10)) {
        json(res, 429, { error: 'too many requests — try again shortly' });
        return true;
      }
      const memberId = memberIdByEmail(doc.cs, email);
      // **an ephemeral document mails nobody** (design/DEMO.md D3): the demo's
      // addresses are made up — except one a visitor typed into ✉️, which is
      // real and never proved, so a login mail here would be the demo mailing
      // a stranger's inbox on anybody's say. The same plain answer, no token
      if (memberId === null || doc.ephemeral === true) {
        // an unknown address is told nothing (the roster is not readable
        // from outside); the response is the same either way
        json(res, 200, { ok: true });
        return true;
      }
      const token = await auth.mintToken(
        { kind: 'login', email, docId: doc.id, memberId }, nowMs);
      const link = magicLink(cfg.baseUrl, 'login', token, doc.cs.slug);
      await writes.sendNow({ to: email, ...MAILS.login(doc.cs.titleOf, link) }, doc.id, token);
      json(res, 200, { ok: true, ...(mailer.dev ? { devLink: link } : {}) });
      return true;
    },
  },
  {
    /* -- applicants (§9.7½): the email is the identity ------------------ */
    name: 'POST /api/d/:slug/apply — knock at the door',
    method: 'POST',
    match: ({ seg }) => seg[0] === 'api' && seg[1] === 'd' &&
      seg[3] === 'apply' && seg.length === 4,
    handler: async (ctx, r) => {
      const { req, res, seg, nowMs } = r;
      const { cfg, store, auth, mailer, writes } = ctx;
      const doc = r.docOr404(store.bySlug(seg[2]!));
      if (!doc) return true;
      // the knock beside the login door kept the limiter's default 20 when
      // Q1341 raised the door to 200: keyed `apply:<ip>`, global across
      // documents, every retype burning one, so a room of twenty was at the
      // cap on arrival (issue #69). **Twenty phones' worth** (Ed,
      // 2026-09-19), the login door's own number.
      if (r.tooMany('apply', 200)) return true;
      const body = await readJson(req);
      const email = emailOk(expectString(body, 'email'));
      // the same refusals the module makes at startApplication, made
      // read-only (stage 3, defect 8): an unauthenticated POST writes
      // nothing to the log — the write moved to POST /auth/apply, where
      // the address has proved it works
      if (!mayApply(doc.cs.settingState('applications').value as ApplicationsValue | null)) {
        json(res, 400, { error: 'this document is invitation-only (§9.7½)' });
        return true;
      }
      // an ephemeral document mails nobody (DEMO.md D3), whatever 🤝 says
      if (doc.ephemeral === true) {
        json(res, 400, { error: 'this document is invitation-only (§9.7½)' });
        return true;
      }
      // the door must not be a membership oracle (review #1, finding 8):
      // the login route deliberately tells an unknown address nothing, so
      // this route must not tell a stranger who is a member. A member's
      // address gets a login mail and the same 200 as anybody; an
      // application already underway gets the same 200 and no new mail.
      const already = memberIdByEmail(doc.cs, email);
      if (already !== null) {
        const token = await auth.mintToken(
          { kind: 'login', email, docId: doc.id, memberId: already }, nowMs);
        const link = magicLink(cfg.baseUrl, 'login', token, doc.cs.slug);
        await writes.sendNow({ to: email, ...MAILS.login(doc.cs.titleOf, link) }, doc.id, token);
        json(res, 200, { ok: true, ...(mailer.dev ? { devLink: link } : {}) });
        return true;
      }
      // An application already underway re-sends the verification mail
      // (Q439(a), Ed 2026-08-20) carrying the seat that already exists.
      // Without it an applicant who lost their cookie was simply locked
      // out: the door says nothing (deliberately — it must not be an
      // oracle) and login says nothing either, since they are not a
      // member, so there was no door left to knock on. The mail is the
      // re-entry, and the response is the same plain 200 as every other
      // branch here, so nothing is disclosed by trying.
      const underway = [...doc.cs.applicantRecords().values()]
        .find((a) => a.email === email && a.status !== 'refused');
      if (underway !== undefined) {
        const token = await auth.mintToken(
          { kind: 'apply', email, docId: doc.id, applicantId: underway.id }, nowMs);
        const link = magicLink(cfg.baseUrl, 'apply', token, doc.cs.slug);
        await writes.sendNow({ to: email, ...MAILS.applyVerify(doc.cs.titleOf, link) }, doc.id, token);
        json(res, 200, { ok: true, ...(mailer.dev ? { devLink: link } : {}) });
        return true;
      }
      const token = await auth.mintToken({ kind: 'apply', email, docId: doc.id }, nowMs);
      const link = magicLink(cfg.baseUrl, 'apply', token, doc.cs.slug);
      await writes.sendNow({ to: email,
        ...MAILS.applyVerify(doc.cs.titleOf, link) }, doc.id, token);
      json(res, 200, { ok: true, ...(mailer.dev ? { devLink: link } : {}) });
      return true;
    },
  },
  {
    name: 'POST /auth/apply — the verified applicant',
    method: 'POST',
    match: '/auth/apply',
    handler: async (ctx, r) => {
      const { req, res, nowMs } = r;
      const { store, auth, writes } = ctx;
      // the shared `auth:<ip>` bucket, answered as a page (issue #69, F3)
      const token = await tokenOrEmpty(req);
      if (r.tooMany('auth', 200, () => { busyDoor(ctx, r, token); })) return true;
      if (pausedDoor(ctx, r, token)) return true;
      const rec = await auth.useToken(token, nowMs);
      if (!rec || rec.kind !== 'apply' || rec.docId === undefined) {
        spentPage(ctx, r, PAGE.used, 'apply');
        return true;
      }
      const doc = r.docOr404(store.byId(rec.docId));
      if (!doc) return true;
      const t = writes.tOf(doc);
      // **A refusal here is a page, and it is logged** (issue #35 F2, F3;
      // absorbing #53). The token is already spent, and the module refuses
      // ordinary states — invitation-only, an address already on the
      // membership, an application already underway (two knocks, two
      // links) — whose throw fell to the central catch: raw JSON rendered
      // as the interstitial's navigation, the link dead. The three module
      // calls are caught together; `commit` stays outside, so a store
      // failure is still a 500 and never a 410 page.
      let applicantId: string;
      try {
        // the log's first applicant entry lands here, after the address has
        // proved it works (stage 3, defect 8); the module re-checks policy
        // and membership, so a world that changed since the mail refuses
        applicantId = rec.applicantId ?? doc.cs.startApplication(t, rec.email);
        // a re-entry link (Q439(a)) lands on a seat that is already verified,
        // or has an application sitting with the room: there is nothing to
        // verify and nothing to write — the link's whole job is the cookie
        if (doc.cs.applicantRecords().get(applicantId)?.status === 'started') {
          doc.cs.verifyApplication(t, applicantId);
        }
        // **Under `open` the link is the joining** (backlog 73, Q894). The rung
        // says so in as many words — *anyone with the link becomes a member the
        // moment they open it* — and the module agrees, `submitApplication`
        // auto-admitting with no motion in the way. But this handler only ever
        // verified, so the visitor was left at `verified` for ever: no UI
        // submits for them (the page renders an `open` applicant no rail at all,
        // believing landing already admitted them), so `open` membership was
        // unreachable by any road. An empty application is a real application
        // (§9.7½), which is what makes the admit here honest. Open is 🤝 yes
        // with 🪪 at ✒️ (entry 94); the other prices land verify-only and
        // keep their later submit and their motion.
        if (admissionPrice(doc.cs) === 'pen' && !doc.cs.closed &&
            doc.cs.applicantRecords().get(applicantId)?.status === 'verified') {
          doc.cs.submitApplication(t, applicantId);
        }
      } catch (err) {
        // whatever the module emitted before refusing is real (review #1,
        // finding 6), so it is committed like any other write
        await writes.commit(doc, nowMs);
        const reason = err instanceof Error ? err.message : String(err);
        // the row the central catch used to write by accident, now on
        // purpose and with the document named (Y25: every refusal is logged)
        logError(ctx.persistence, { kind: 'refused', status: 410, method: 'POST',
          path: r.path, doc: doc.id, slug: doc.cs.slug, reason });
        spentPage(ctx, r, refusedSentence(reason), 'apply');
        return true;
      }
      await writes.commit(doc, nowMs);
      // an admitted visitor holds a member's seat, not an applicant's — the
      // applicant cookie stays the fallback for every road that lands short
      // of membership, and for an admit this handler could not make
      const mid = memberIdByEmail(doc.cs, rec.email);
      setCookie(res, doc.id,
        auth.cookieFor(doc.id, mid ?? `app:${applicantId}`, nowMs), ctx.httpsOn);
      redirect(res, `/d/${doc.cs.slug}`);
      return true;
    },
  },
  {
    name: 'POST /auth/login — the token that seats',
    method: 'POST',
    match: '/auth/login',
    handler: async (ctx, r) => {
      const { req, res, nowMs } = r;
      const { store, auth, writes } = ctx;
      // the shared `auth:<ip>` bucket, answered as a page (issue #69, F3)
      const token = await tokenOrEmpty(req);
      if (r.tooMany('auth', 200, () => { busyDoor(ctx, r, token); })) return true;
      if (pausedDoor(ctx, r, token)) return true;
      const rec = await auth.useToken(token, nowMs);
      if (!rec || rec.kind !== 'login' || rec.docId === undefined ||
          rec.memberId === undefined) {
        spentPage(ctx, r, PAGE.used, 'login');
        return true;
      }
      const doc = r.docOr404(store.byId(rec.docId));
      if (!doc) return true;
      const t = writes.tOf(doc);
      const m = doc.cs.memberRecords().get(rec.memberId);
      // **A seat that is gone lands on the ordinary door** (Q1493, Ed
      // 2026-09-21). The convention's error log has a withdrawn invitee's
      // old link answered *unknown member 'm-7'* at 12:43: `arrive` throws
      // those words for a row marked removed, and a stranger following the
      // one address they had been given met the machine's own vocabulary.
      // They are told by mail that the invitation was withdrawn
      // (`MAILS.uninvited`); the link itself simply opens the document, with
      // no cookie and so no seat — which is the stranger's door, and says
      // nothing about the withdrawal because the mail has said it already.
      //
      // **…and so does an invitation the close expired** (issue #35 F1, SPEC
      // X14): `arrive` refuses a closed document, and the throw came after
      // the token was spent — raw JSON and a dead link. No cookie without a
      // seat: `acknowledgeClose` admits any unremoved member, so a cookie
      // would let somebody the close excluded sign the record.
      //
      // **A clerk is a seat** (found building #35): a founder who is not a
      // member has no row in `memberRecords`, and reading that absence as a
      // withdrawn seat opened a clerk's own login link seatless.
      const clerk = !m && rec.memberId === doc.cs.convenorRecord().id;
      const noSeat = !clerk && (!m || m.removed || (doc.cs.closed && m.arrivedAtT === null));
      // membership begins at first arrival (§9.6a); revival is logging in —
      // though never into a closed log, which `memberReturn` does not check
      if (!noSeat && m && m.arrivedAtT === null) doc.cs.arrive(t, rec.memberId);
      else if (!noSeat && m && m.lapsed && !doc.cs.closed) doc.cs.memberReturn(t, rec.memberId);
      // committed before the early return: `tOf` can close the document on
      // this very request, and what it folded must not wait in memory
      await writes.commit(doc, nowMs);
      if (noSeat) { redirect(res, `/d/${doc.cs.slug}`); return true; }
      setCookie(res, doc.id, auth.cookieFor(doc.id, rec.memberId, nowMs), ctx.httpsOn);
      redirect(res, `/d/${doc.cs.slug}`);
      return true;
    },
  },
];

const e = (v: string): string => v.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** In a string a script reads, not markup: the quote and the closer too. */
const js = (v: string): string => JSON.stringify(v).replace(/</g, '\\u003c');

/** The one page shell these two doors share — deliberately off the design
 *  system, like the mail they came from. */
const shell = (body: string): string =>
  '<!doctype html><meta charset="utf-8"><title>docs.vote</title>' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<body style="font-family: system-ui, sans-serif; padding: 2rem; max-width: 34rem; line-height: 1.5">' +
  body;

/**
 * Everything on these two doors that a person can read, in one object —
 * the server's own copy convention, as `MAILS` is in `mailer.ts`.
 * `design/copy.js` is the **page's** copy and the server never loads it, so
 * a string the server itself renders lives beside the route that renders
 * it; STYLE.md binds it all the same.
 */
const PAGE = {
  continue: 'Continue',
  /** What the press does, on the page a link opens (issue #67 F1). */
  proceed: {
    create: 'Press Continue to create your document.',
    login: 'Press Continue to log in.',
    apply: 'Press Continue to confirm your address.',
  },
  /** The two ways a link can fail before it seats anybody. */
  used: 'This link has already been used, or it has expired.',
  /** A creation link to an address the founder moved the creation off,
   *  followed after the document was founded (issue #38 F1) or before
   *  anything was (F5, Q1511 (a)): it says why rather than passing for any
   *  dead link (Q1506 (b), Ed 2026-09-23 — *changed*, not *corrected*; the
   *  disclosure accepted). */
  changed: 'This link was sent to an address the document’s Founder has since changed.',
  cut: 'That link is not complete — it may have been cut short on its way to you.',
  ask: 'Send yourself a new one:',
  send: 'Send the link',
  placeholder: 'you@example.com',
  /** The announced pause, met on a link rather than on a card (issue #9).
   *  The page's own modal says *quick database maintenance* and *about a
   *  minute*; this is the same news to somebody who has no document open
   *  yet, and the same promise — nothing here has been used up. */
  paused: 'docs.vote is having a moment of quick maintenance.',
  pausedKept: 'Your link is still good — nothing has been used. Wait about a minute, then try it again.',
  pausedRetry: 'Try the link again',
  /** The arrival door's own brake, met on a link (issue #69). The same
   *  promise the pause makes, for the same reason: the limiter stands
   *  before the token is spent, so the link in hand is still good. */
  busy: 'docs.vote is busy — a lot of people are arriving at once.',
  busyKept: 'Your link is still good — nothing has been used. Wait a few minutes, then try it again.',
  /** The door's own answer, and not an oracle either way (`design/door.js`). */
  sentLogin: 'If that address is on the membership, a link is on its way.',
  sentApply: 'A link is on its way — follow it to continue your application.',
  failed: 'That could not be sent. Open the document and try again there.',
  elsewhere: 'Open the document’s own address — it is in the mail that ' +
    'brought you here — and use Log In to send yourself a new link.',
  unmade: 'Nothing stands at that address yet. Name the document again to create it:',
} as const;

/** The magic-link interstitial (stage 3, defect 6). The action carries `d`
 *  so the POST it makes still knows the document when the token it spends
 *  turns out to be spent already.
 *
 *  **It waits for a press** (issue #67 F1): it made the GET prefetch-safe and
 *  then spent the token itself with `forms[0].submit()`, so anything that
 *  *renders* a link — a mail scanner detonating it in a headless browser —
 *  took the seat, and the member read *already used*. One sentence and a real
 *  button, `busyDoor`'s shape: only a person's press spends the link. */
function interstitial(action: string, token: string): string {
  const door = action.slice(6).split('?')[0] as 'create' | 'login' | 'apply';
  return shell(
    '<p>' + e(PAGE.proceed[door] ?? PAGE.proceed.login) + '</p>' +
    '<form method="post" action="' + e(action) + '">' +
    '<input type="hidden" name="token" value="' + e(token) + '">' +
    '<button type="submit" style="padding: .4rem .8rem">' + e(PAGE.continue) + '</button></form>');
}

/**
 * **A link followed during a deploy pause spends nothing** (issue #9; the
 * pause itself is Q1345). The three doors below consume a single-use token,
 * and a paused instance persists nothing — so a link followed in the few
 * minutes a deploy takes seated nobody, founded nothing, and burned the one
 * token the person had: on the new instance an invitee read `arrived: false`
 * and a founder's promised address stood empty. The check sits **before**
 * `useToken`, which is the whole of the remedy — the same link, a minute
 * later, still works.
 *
 * Answered as a **page** rather than as the cmd route's JSON: these are form
 * POSTs from the interstitial, and a person is looking at the result. The
 * status is the cmd route's all the same — 503, since the host is whole and
 * merely waiting — with `retry-after` saying the minute the sentence says.
 * The form re-posts the token that arrived, so the remedy is one press and
 * needs no second mail; without script it is an ordinary form and still is.
 */
function pausedDoor(ctx: RouteContext, r: Req, token: string): boolean {
  if (ctx.pause.now(r.nowMs) === null) return false;
  // the address travels with the form, exactly as the interstitial sends it
  const d = r.url.searchParams.get('d') ?? '';
  const action = d === '' ? r.path : `${r.path}?d=${encodeURIComponent(d)}`;
  // same-origin, for the reason the interstitial gives: under the global
  // no-referrer policy a form POST's Origin serializes as *null*, and the
  // cross-site check on `/auth/*` would refuse the retry as an attack
  r.res.setHeader('referrer-policy', 'same-origin');
  r.res.setHeader('retry-after', '60');
  html(r.res, shell(
    '<p>' + e(PAGE.paused) + '</p>' +
    '<p>' + e(PAGE.pausedKept) + '</p>' +
    '<form method="post" action="' + e(action) + '">' +
    '<input type="hidden" name="token" value="' + e(token) + '">' +
    '<button type="submit" style="padding: .4rem .8rem">' +
    e(PAGE.pausedRetry) + '</button></form>'), 503);
  return true;
}

/**
 * **A refused arrival is a page too, and the link it carried is still good**
 * (issue #69, F3). The three doors below share one bucket, `auth:<ip>`, and
 * a venue NATs a whole room onto one address — so the room spending it was
 * always going to happen, and what the person met was the limiter's JSON
 * rendered raw by the browser the interstitial had just auto-submitted
 * into: no shell, no retry, no way back, and a live magic link behind it.
 * Live, because the limiter stands **before** `useToken`, exactly as the
 * pause does: the token is unspent and the same link works a few minutes
 * later. So this says so, in `pausedDoor`'s own shape and for its own
 * reasons — the token re-posted by a form, `referrer-policy: same-origin`
 * so the retry is not read as a cross-site attack, `retry-after` saying in
 * a header what the sentence says in words. The status stays the limiter's
 * 429; only the medium changes.
 */
/**
 * **The brake counts a body it cannot read** (issue #89). The three
 * `/auth/*` doors read the token above `tooMany` so a refusal can hand it
 * back (`busyDoor`), and `readTokenBody` throws on a body past 10 KB or on
 * malformed JSON — which, uncaught, skipped the bucket entirely and wrote a
 * row to the error log for every one. An unreadable body is an empty token:
 * counted like any arrival, and past the brake it meets the spent-link page.
 */
async function tokenOrEmpty(req: Req['req']): Promise<string> {
  try { return await readTokenBody(req); } catch { return ''; }
}

function busyDoor(ctx: RouteContext, r: Req, token: string): void {
  const d = r.url.searchParams.get('d') ?? '';
  const action = d === '' ? r.path : `${r.path}?d=${encodeURIComponent(d)}`;
  r.res.setHeader('referrer-policy', 'same-origin');
  r.res.setHeader('retry-after', '300');
  html(r.res, shell(
    '<p>' + e(PAGE.busy) + '</p>' +
    '<p>' + e(PAGE.busyKept) + '</p>' +
    '<form method="post" action="' + e(action) + '">' +
    '<input type="hidden" name="token" value="' + e(token) + '">' +
    '<button type="submit" style="padding: .4rem .8rem">' +
    e(PAGE.pausedRetry) + '</button></form>'), 429);
}

/**
 * **A dead link is answered with a page, not with JSON** (the readiness
 * pass, 2026-09-17). Every road here is ordinary — a double click, a mail
 * forwarded to a colleague, a scanner that runs the interstitial's
 * auto-submit before the human clicks, a link past its week — and a person
 * who meets one has done nothing wrong and needs one thing: another link.
 *
 * So the page says what happened, and then offers the remedy where it can
 * name it: the address the token carried as `d` (`magicLink`), the login
 * door there that mints a fresh link, and the document itself, where the
 * stranger's door stands with the same Log In card. The form posts JSON to
 * the real door — `/api/d/:slug/login`, or `/apply` for an applicant's
 * link — so it inherits that door's rate limits and its discipline of
 * telling an unknown address nothing. Without script the anchor is the
 * whole remedy, which is why it is there beside the form and not instead
 * of it.
 *
 * **410, not 400.** The request is perfectly well formed; what it names is
 * gone, and single-use means gone for good.
 */
/** A module refusal said as Y25 says it on a card (issue #35 F2): *That was
 *  refused: …*, the module's own `(§…)` pointer dropped, and one full stop. */
function refusedSentence(reason: string): string {
  const said = reason.replace(/\s*\(§[^)]*\)/g, '').trim().replace(/[.\s]+$/, '');
  return `That was refused: ${said}.`;
}

function spentPage(ctx: RouteContext, r: Req, lead: string,
  kind: 'create' | 'login' | 'apply'): void {
  const asked = r.url.searchParams.get('d') ?? '';
  const slug = SLUG_OK.test(asked) && asked.length <= LIMITS.slug ? asked : null;
  const doc = slug === null ? null : ctx.store.bySlug(slug);
  let body = '<p>' + e(lead) + '</p>';
  if (doc !== null) {
    const at = '/d/' + e(doc.cs.slug);
    const endpoint = '/api/d/' + encodeURIComponent(doc.cs.slug) +
      (kind === 'apply' ? '/apply' : '/login');
    body += '<p>' + e(PAGE.ask) + '</p>' +
      '<form><input type="email" name="email" required placeholder="' +
      e(PAGE.placeholder) + '" style="padding: .4rem; min-width: 14rem">' +
      ' <button type="submit" style="padding: .4rem .8rem">' + e(PAGE.send) + '</button></form>' +
      '<p id="s"></p>' +
      '<p>Or open <a href="' + at + '">' + e(doc.cs.titleOf) + '</a> and use Log In there.</p>' +
      '<script>var f=document.forms[0],s=document.getElementById("s");' +
      'f.onsubmit=function(ev){ev.preventDefault();s.textContent="";' +
      'fetch(' + js(endpoint) + ',{method:"POST",headers:{"content-type":"application/json"},' +
      'body:JSON.stringify({email:f.email.value})}).then(function(x){' +
      's.textContent=x.ok?' + js(kind === 'apply' ? PAGE.sentApply : PAGE.sentLogin) +
      ':' + js(PAGE.failed) + ';},function(){s.textContent=' + js(PAGE.failed) + ';});};</script>';
  } else if (kind === 'create' && slug !== null) {
    body += '<p>' + e(PAGE.unmade) + ' <a href="/">docs.vote</a></p>';
  } else {
    body += '<p>' + e(PAGE.elsewhere) + '</p>';
  }
  html(r.res, shell(body), 410);
}

export function memberIdByEmail(cs: ConstitutionSession, email: string): string | null {
  // case-blind (review #1, finding 18): older logs hold addresses as they
  // were typed, and an invitee who capitalizes differently at login must
  // not get the silent-nothing response forever
  // an erased person has no address to match (decision 1253), so their seat
  // cannot be reached by login — which is the point of erasure
  const want = email.toLowerCase();
  for (const m of cs.memberRecords().values()) {
    if (!m.removed && m.email !== null && m.email.toLowerCase() === want) return m.id;
  }
  return cs.convenorRecord().email?.toLowerCase() === want
    ? cs.convenorRecord().id : null;
}
