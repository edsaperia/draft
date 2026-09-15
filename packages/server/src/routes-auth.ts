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
import { LIMITS, cap, emailOk } from './commands.js';
import { MAILS } from './mailer.js';
import { slugify, uniqueSlug } from './store.js';
import { admissionPrice } from './views.js';
import { expectString, html, json, rateLimited, readJson, readTokenBody, redirect, setCookie } from './routes.js';
import type { RouteContext, Route } from './routes.js';

/** The address grammar the page shares (Q460): lower case, digits,
 *  hyphens, starting with a letter or digit. One character is enough
 *  (Q1288, Ed 2026-09-08: *we should allow one character addresses*) —
 *  the floor of three that stood from Q460 was never ruled. */
const SLUG_OK = /^[a-z0-9][a-z0-9-]*$/;

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
      if (r.tooMany('slug', 120)) return true;
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
      if (r.tooMany('docs')) return true;
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
        await stash.renew(mine, expMs, slug, nowMs);
      const pendingId = renewed && givenId !== null
        ? givenId : randomBytes(18).toString('base64url');
      const stashKey = sha256Hex(pendingId);
      if (!renewed) await stash.open(stashKey, expMs, slug);
      const token = await auth.mintToken(
        { kind: 'create', email, pending: { title, slug, email, isMember, stashKey } }, nowMs);
      const link = `${cfg.baseUrl}/auth/create?token=${token}`;
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
      if (r.tooMany('pending', 120)) return true;
      const body = await readJson(req);
      const pendingId = expectString(body, 'pendingId');
      const text = cap(expectString(body, 'text'), LIMITS.text, 'the text');
      if (!(await ctx.stash.update(sha256Hex(pendingId), text, nowMs))) {
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
    handler: (_ctx, { res, url, path }) => {
      const token = url.searchParams.get('token') ?? '';
      if (token === '') { json(res, 400, { error: 'missing token' }); return true; }
      // same-origin, overriding the global no-referrer (found on staging,
      // 2026-08-20): the fetch spec serializes a POST's Origin as *null*
      // when the submitting page's referrer policy is no-referrer, so the
      // interstitial's own form tripped the cross-site check — the two
      // stage-3 hardenings fighting each other. Same-origin keeps the
      // token-bearing Referer inside this origin and gives the POST a
      // real Origin to verify.
      res.setHeader('referrer-policy', 'same-origin');
      html(res, interstitial(path, token));
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
      if (r.tooMany('auth', 60)) return true;
      const rec = await auth.useToken(await readTokenBody(req), nowMs);
      if (!rec || rec.kind !== 'create' || !rec.pending) {
        json(res, 400, { error: 'that link has been used or has expired' });
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
      const madeId = p.stashKey === undefined ? null : await stash.claimedBy(p.stashKey, nowMs);
      const made = madeId === null ? null : store.byId(madeId);
      if (made) {
        setCookie(res, made.id, auth.cookieFor(made.id, made.cs.convenorRecord().id, nowMs), ctx.httpsOn);
        redirect(res, `/d/${made.cs.slug}`);
        return true;
      }
      /* …and the same for a link minted before the stash carried its claim:
         the address it promised already holds a document this very founder
         made, so it forwards there rather than founding a twin beside it. */
      const twin = store.bySlug(p.slug);
      if (twin && twin.cs.convenorRecord().email?.toLowerCase() === p.email.toLowerCase()) {
        setCookie(res, twin.id, auth.cookieFor(twin.id, twin.cs.convenorRecord().id, nowMs), ctx.httpsOn);
        redirect(res, `/d/${p.slug}`);
        return true;
      }
      const slug = store.slugTaken(p.slug)
        ? uniqueSlug(p.title, (s) => store.slugTaken(s)) : p.slug;
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
      // email, 5 in ten minutes: a scripted attack on one address is the
      // thing the old cap actually stopped, and it is keyed on the address,
      // not the socket. Both numbers are guesses; revisit them after a real
      // convention. The per-email check runs before the roster lookup so a
      // known and an unknown address are refused identically.
      if (r.tooMany('login', 200)) return true;
      const body = await readJson(req);
      const email = emailOk(expectString(body, 'email'));
      if (rateLimited(`login-email:${email}`, nowMs, 5)) {
        json(res, 429, { error: 'too many requests — try again shortly' });
        return true;
      }
      const memberId = memberIdByEmail(doc.cs, email);
      if (memberId === null) {
        // an unknown address is told nothing (the roster is not readable
        // from outside); the response is the same either way
        json(res, 200, { ok: true });
        return true;
      }
      const token = await auth.mintToken(
        { kind: 'login', email, docId: doc.id, memberId }, nowMs);
      const link = `${cfg.baseUrl}/auth/login?token=${token}`;
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
      if (r.tooMany('apply')) return true;
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
      // the door must not be a membership oracle (review #1, finding 8):
      // the login route deliberately tells an unknown address nothing, so
      // this route must not tell a stranger who is a member. A member's
      // address gets a login mail and the same 200 as anybody; an
      // application already underway gets the same 200 and no new mail.
      const already = memberIdByEmail(doc.cs, email);
      if (already !== null) {
        const token = await auth.mintToken(
          { kind: 'login', email, docId: doc.id, memberId: already }, nowMs);
        const link = `${cfg.baseUrl}/auth/login?token=${token}`;
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
        const link = `${cfg.baseUrl}/auth/apply?token=${token}`;
        await writes.sendNow({ to: email, ...MAILS.applyVerify(doc.cs.titleOf, link) }, doc.id, token);
        json(res, 200, { ok: true, ...(mailer.dev ? { devLink: link } : {}) });
        return true;
      }
      const token = await auth.mintToken({ kind: 'apply', email, docId: doc.id }, nowMs);
      const link = `${cfg.baseUrl}/auth/apply?token=${token}`;
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
      if (r.tooMany('auth', 60)) return true;
      const rec = await auth.useToken(await readTokenBody(req), nowMs);
      if (!rec || rec.kind !== 'apply' || rec.docId === undefined) {
        json(res, 400, { error: 'that link has been used or has expired' });
        return true;
      }
      const doc = r.docOr404(store.byId(rec.docId));
      if (!doc) return true;
      const t = writes.tOf(doc);
      // the log's first applicant entry lands here, after the address has
      // proved it works (stage 3, defect 8); the module re-checks policy
      // and membership, so a world that changed since the mail refuses
      const applicantId = rec.applicantId ?? doc.cs.startApplication(t, rec.email);
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
      if (r.tooMany('auth', 60)) return true;
      const rec = await auth.useToken(await readTokenBody(req), nowMs);
      if (!rec || rec.kind !== 'login' || rec.docId === undefined ||
          rec.memberId === undefined) {
        json(res, 400, { error: 'that link has been used or has expired' });
        return true;
      }
      const doc = r.docOr404(store.byId(rec.docId));
      if (!doc) return true;
      const t = writes.tOf(doc);
      const m = doc.cs.memberRecords().get(rec.memberId);
      // membership begins at first arrival (§9.6a); revival is logging in
      if (m && m.arrivedAtT === null) doc.cs.arrive(t, rec.memberId);
      else if (m && m.lapsed) doc.cs.memberReturn(t, rec.memberId);
      await writes.commit(doc, nowMs);
      setCookie(res, doc.id, auth.cookieFor(doc.id, rec.memberId, nowMs), ctx.httpsOn);
      redirect(res, `/d/${doc.cs.slug}`);
      return true;
    },
  },
];

/** The magic-link interstitial (stage 3, defect 6) — deliberately off the
 *  design system, like the mail it came from: it exists for milliseconds. */
function interstitial(action: string, token: string): string {
  const e = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return '<!doctype html><meta charset="utf-8"><title>docs.vote</title>' +
    '<body style="font-family: system-ui, sans-serif; padding: 2rem">' +
    '<form method="post" action="' + e(action) + '">' +
    '<input type="hidden" name="token" value="' + e(token) + '">' +
    '<noscript><button type="submit">Continue</button></noscript></form>' +
    '<script>document.forms[0].submit()</script>';
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
