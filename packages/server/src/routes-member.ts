/**
 * The member surface (refactor Q1352 (m), (n)): `view` — the only read a
 * member is ever served (§3.5) — `cmd`, the one write, and the founder's
 * pre-confirm text stash. Two rows of the route table.
 *
 * **The stranger's door is inside the first row, not beside it.** It is not
 * a branch of its own: it is what the view row answers when the request
 * carries no living seat, so it has no boundary in the chain to fall on and
 * splitting it out would mean inventing one. `strangerView` itself already
 * lives in `views.ts` (Q1352 (k)), which is where the door's own projection
 * belongs.
 *
 * **The view/cmd row is the table's one decliner**, which is why the row
 * shape has to allow one. It matched on segments with no method test at
 * all, and a living seat asking for anything but `GET view` or `POST cmd`
 * fell out of the block and on down the chain having written nothing. So
 * its method is `'*'` and it returns false in exactly that case; the walk
 * goes on, and the answer is the same 404 the chain gave.
 */
import { ConstitutionSession, view } from '../../constitution/src/index.js';
import type { ApplicantRecord } from '../../constitution/src/index.js';
import { ParticipantApi } from '../../engine-core/src/participant-api.js';
import { LIMITS, cap } from './commands.js';
import { PAGE_ERRORS_PER_MINUTE, logError, pageErrorOf } from './error-log.js';
import { asEngineDoc } from './engine-host.js';
import type { LoadedDoc } from './store.js';
import { raceView, strangerView } from './views.js';
import { applyCommand } from './apply-command.js';
import { cookieSession, expectString, ipOf, json, pathOf, rateLimited, readJson } from './routes.js';
import type { Route } from './routes.js';
import { hasDemoKey, isDemoDoc } from './demo-access.js';
import { VISITOR_PRE_ACKED } from './demo.js';

export const memberTable: Route[] = [
  {
    /* -- the member surface (view is the only read, §3.5/NOTES) ---------- */
    name: 'GET /api/d/:slug/view and POST /cmd (may decline)',
    method: '*',
    match: ({ seg }) => seg[0] === 'api' && seg[1] === 'd' && seg.length === 4 &&
      (seg[3] === 'view' || seg[3] === 'cmd'),
    handler: async (ctx, r) => {
      const { req, res, url, seg, nowMs } = r;
      const { store, auth, mailer, pause, writes } = ctx;
      const doc = r.docOr404(store.bySlug(seg[2]!));
      if (!doc) return true;
      const session = cookieSession(auth, req, doc.id);
      // no seat, or a seat that has since died (review #1, finding 1 — a
      // removed member's cookie is ninety days of nothing): a GET is the
      // stranger's door, open to anybody with the slug (Q456); a command
      // still needs a seat
      if (session === null || !seatAlive(doc.cs, session.memberId, session.applicantId)) {
        if (req.method === 'GET' && seg[3] === 'view') {
          // the door's budget is per IP, and a room's phones share one
          // (venue Wi-Fi): a stranger's page polls every 4s, 150 in the
          // ten-minute window, so 240 fell to two phones in eight minutes
          // and the page died of the 429 it took for a view (Ed's phone,
          // 2026-09-12). 1500 was ten phones' worth, and twenty spent it in
          // five minutes on one venue address (issue #69, reproduced
          // 2026-09-19) — so the room sawtoothed, five minutes alive and
          // five dead. **Twenty phones' worth** (Ed, 2026-09-19): forty
          // polling pages for a full window, still a brake on a scraper.
          if (r.tooMany('stranger', 6000)) return true;
          const seq = doc.cs.logEntries().length;
          const engineDoc0 = asEngineDoc(doc);
          const eseq = engineDoc0.bridge === null ? 0 : engineDoc0.bridge.engine.log.length;
          if (url.searchParams.get('since') === seq + '.' + eseq) {
            // **The door's short answer is a short answer, and says so**
            // (issue #11, F5). The page reads the two host flags off every
            // answer before it reads anything else, and `short` is what tells
            // it there is no view underneath — so a door answer carrying
            // neither read as a full view with no pause and no stall in it,
            // and every quiet poll at the door cleared the maintenance modal
            // and the stall flag a moment after the previous answer raised
            // them. A stranger watching a document through a deploy saw the
            // modal blink at four-second intervals. The member's short
            // answer at the foot of this handler has carried all three since
            // Q1345/Q1346; this is the same three words.
            json(res, 200, { seq, eseq, short: true,
              paused: pause.payload(nowMs), stalled: !!doc.stalled });
            return true;
          }
          json(res, 200, { seq, eseq, devMail: mailer.dev,
            // Ed's demo panel reaches a seatless page too (DEMO.md Stage 2):
            // he may open the demo before sitting anywhere
            ...(isDemoDoc(ctx, doc) && hasDemoKey(ctx, req, nowMs) ? { demoPanel: true } : {}),
            // the demo's 👋 Try it (DEMO.md Stage 3): a public fact about a
            // public document, on the demo alone
            ...(isDemoDoc(ctx, doc) ? { demoJoin: true } : {}),
            ...strangerView(doc, nowMs, pause.payload(nowMs), session) });
          return true;
        }
        json(res, 401, { error: 'log in first' });
        return true;
      }
      const { memberId, applicantId } = session;
      // a cookie is not a seat (review #1, finding 1): sessions are
      // stateless, so removal has to be checked here — otherwise a
      // removed or uninvited member's cookie is ninety days of full
      // member read under a constitution that says members only
      const isFounder = memberId === doc.cs.convenorRecord().id;
      if (req.method === 'GET' && seg[3] === 'view') {
        // presence is presence (Q459a): a read refreshes the member's
        // activity clock, at most hourly — the module says whether it
        // recorded anything, and only then is there something to commit
        //
        // **A ladder document's clock belongs to the ladder** (Q681). This
        // one write is what made the stagehand's whole premise unworkable:
        // presence stamps `now`, so merely *looking* at a document pinned
        // its log to the present, and the next rung — which builds its
        // three hours of session by writing them into the past — had no
        // past left to write into. Since the bar reloads the page after
        // every press, that happened between every pair of presses. The
        // skip is dev-only and lives inside the label, so production keeps
        // presence exactly as it was.
        let ladderClock = false;
        DEV: { ladderClock = mailer.dev && doc.cs.slug.startsWith('ladder-'); }
        // **and a document whose saves are failing is read, not stamped**
        // (issue #79): a failed save rewinds the document, so every poll
        // would stamp presence again, fail, re-fold the whole log and answer
        // 500 — and the view is the one place the red flag can be read. The
        // stamp waits for a save that lands, which clears `stalled`.
        if (applicantId === null && !ladderClock && !doc.stalled &&
            doc.cs.seen(writes.tOf(doc), memberId)) {
          await writes.commit(doc, nowMs);
        }
        const seq = doc.cs.logEntries().length;
        // race cards ride the engine's own log, which judge-race moves
        // without touching the document log — freshness is both lengths
        const engineDoc = asEngineDoc(doc);
        const eseq = engineDoc.bridge === null ? 0 : engineDoc.bridge.engine.log.length;
        // the page polls (4s): when it says what it has seen and nothing
        // moved in either log, answer with the seqs alone and build no view
        const since = url.searchParams.get('since');
        if (since === seq + '.' + eseq) {
          // the two host flags ride the short answer too (Q1345, Q1346): a
          // page that has seen everything is exactly the page that must
          // still hear a pause or a stall
          json(res, 200, { seq, eseq, short: true, paused: pause.payload(nowMs), stalled: !!doc.stalled });
          return true;
        }
        // **The slim view** (the moon room, 2026-09-11): in a busy room
        // something has always moved inside a poll, so the short answer never
        // fires and every poll is a full view — 260 KB by a hundred races, of
        // which the sealed records were two fifths, the constitution's own
        // projection a quarter and the text a tenth, and none of the three
        // moves with a judgment. A poll that says what it holds — the document
        // seq it has seen (`since`'s first half: the projection is a function
        // of the document log), the text version (`tv`) and the records' key
        // (`rk`) — is answered without whichever of the three it already has,
        // and `slim` names them so the page keeps its own. A client that says
        // nothing gets everything, as before.
        const pageSeq = since === null ? null : Number(since.split('.')[0]);
        // the second half of `since` is the engine seq the page holds, which
        // is 0 for as long as it has never been served a view with an engine
        // behind it (Q1477, below)
        const pageEseq = since === null ? null : Number(since.split('.')[1]);
        const pageTv = url.searchParams.get('tv');
        const pageRk = url.searchParams.get('rk');
        // **An applicant is a stranger who has knocked** (Q1281, 2026-09-07):
        // they are served the door's own payload — the rules, the text where
        // 🌍 lets a link-holder read it, the register on the same rung — plus
        // their own application, and never the members' emails, the
        // questions, or anybody's answers (stage 3, defect 7). The old thin
        // payload carried no `view` at all, and the live page, which has a
        // door branch and a member branch, fell through to the member one
        // and threw on its first `view.*` read; every applicant at docs.vote
        // got a blank surface. The text gate is `strangerView`'s `canRead`
        // (link | public), which agrees with the old applicant gate
        // (`rung !== 'closed'`) on every rung the catalogue has.
        if (applicantId !== null) {
          const app = doc.cs.applicantRecords().get(applicantId) ?? null;
          json(res, 200, {
            seq,
            eseq,
            devMail: mailer.dev,
            ...strangerView(doc, nowMs, pause.payload(nowMs), session),
            // the door's payload says `stranger: true`; this seat is not the
            // door, and the page's door branch must not fire for it
            stranger: false,
            me: memberId,
            isFounder: false,
            applicant: app === null ? null : { id: app.id, email: app.email,
              status: app.status, name: app.name, picture: app.picture, erased: app.erased,
              words: app.words, motion: app.motion,
              // whether they have acknowledged the door shutting under them
              // (SURFACE E33, Q901): the refusal rides `applyOpen` above, and
              // this is the half of it that is recorded
              shutAcked: app.shutAcked,
              // how many have judged the admit motion: a count, never who —
              // the applicant's own card promises *n of E have voted on it*
              judged: admitJudged(doc, app) },
            // the page's poll fingerprints these two on every seat
            raceCards: [],
            wallet: null,
          });
          return true;
        }
        json(res, 200, {
          me: memberId,
          isFounder,
          devMail: mailer.dev,
          // Ed's demo panel (design/DEMO.md Stage 2): the demo document, and
          // a browser holding the demo key's cookie — nowhere else, ever
          ...(isDemoDoc(ctx, doc) && hasDemoKey(ctx, req, nowMs) ? { demoPanel: true } : {}),
          // a demo visitor's grants arrive accepted (DEMO.md D7; Q1535): the
          // page adds these to what it remembers — a visitor's seat on the
          // demo document, and nowhere else
          ...(isDemoDoc(ctx, doc) && ctx.demo.isVisitor(memberId)
            ? { preAcked: [...VISITOR_PRE_ACKED] } : {}),
          title: doc.cs.titleOf,
          slug: doc.cs.slug,
          constitutedAtT: doc.cs.constitutedAtT,
          seq,
          eseq,
          // the session-clock counts against the server's clock, not the
          // browser's (Q466); the page offsets by the time it received this
          serverNowMs: nowMs,
          paused: pause.payload(nowMs),
          stalled: !!doc.stalled,
          textConfirmed: doc.cs.textConfirmed,
          quorumForm: doc.cs.quorumForm,
          electorateSize: doc.cs.motionElectorate().length,
          membershipReserved: doc.cs.membershipReserved(),
          crowned: doc.cs.crowned(),
          // the 🍾 card's readiness readout (Q443): founder-only, part of
          // the task rather than of the document — participation by name,
          // never preference
          readiness: isFounder ? doc.cs.readiness() : null,
          convenor: { id: doc.cs.convenorRecord().id,
            isMember: doc.cs.convenorRecord().isMember,
            email: doc.cs.convenorRecord().email,
            name: doc.cs.convenorRecord().name,
            picture: doc.cs.convenorRecord().picture,
            erased: doc.cs.convenorRecord().erased,
            // whether 🎩 was ever put, which its value cannot say (Q682)
            membershipSet: doc.cs.convenorRecord().membershipSet },
          // the unconfirmed starting text (§9.7a v0.55): readable by any
          // member — the charter is what the founding questions are about
          provisionalText: doc.cs.textConfirmed ? null : doc.provisional,
          ...((): Record<string, unknown> => {
            const ed = asEngineDoc(doc);
            const rkNow = ed.bridge === null ? 0
              : new ParticipantApi(ed.bridge.engine, memberId).outcomes().length;
            const slim: string[] = [];
            // before 🍾 there is no engine: the text version reads 0 while
            // the founder's text still changes (confirm-starting-text), so
            // neither the text nor the records are ever left out then —
            // journey's *paste ✒️* step held a stale column otherwise
            //
            // **…and not for the page's last poll before it either** (Q1477,
            // the nh2026 convention 2026-09-20). It is not enough that *this*
            // document is versioned: what `tv` claims has to have been served
            // under a version too. `textVersion` reads 0 on both sides of the
            // cork — over the founder's unversioned text before it, over the
            // engine's document at version 0 after — and 🍾 confirms whatever
            // the column holds (R-081), which draws no paragraph for a blank
            // line. So the first answer after the cork left the text out of
            // every page that had been polling through it, each completed it
            // from the text it already had, and the room read the document in
            // a line space two lines out of step with the engine's until the
            // first adoption moved the version. The page's own engine seq is
            // the one thing that tells the two zeroes apart: it is 0 until
            // there is an engine to count.
            const sawEngine = pageEseq !== null && pageEseq > 0;
            const versioned = ed.bridge !== null && sawEngine;
            const keepRecords = versioned && pageRk !== null && Number(pageRk) === rkNow;
            const rv = raceView(doc, memberId, nowMs, { records: !keepRecords });
            const out: Record<string, unknown> = { ...rv };
            if (keepRecords) { delete out.records; slim.push('records'); }
            if (versioned && pageTv !== null && Number(pageTv) === rv.textVersion) {
              delete out.text; slim.push('text');
            }
            if (pageSeq !== null && pageSeq === seq) slim.push('view');
            else out.view = view(doc.cs, memberId);
            out.slim = slim;
            return out;
          })(),
        });
        return true;
      }
      if (req.method === 'POST' && seg[3] === 'cmd') {
        const body = await readJson(req);
        const cmd = expectString(body, 'cmd');
        const args = (body.args ?? {}) as Record<string, unknown>;
        // **the one member command path** (design/DEMO.md Stage 4): the
        // pause, the applicant gate, the revival, the whitelist, the refusal
        // log and the commit are `applyCommand`, which the demo's bots call
        // too — so a bot has no way in that this route does not also take
        const out = await applyCommand(ctx, doc, { memberId, applicantId, isFounder },
          cmd, args, nowMs, { path: pathOf(req) });
        json(res, out.status, out.body);
        return true;
      }
      // a living seat asking for neither: the old chain fell out of this
      // block here, having written nothing, and so does this row
      return false;
    },
  },
  {
    /* the founder's draft text after the save, before the confirm (§9.7a) */
    name: 'POST /api/d/:slug/stash — the founder’s draft text',
    method: 'POST',
    match: ({ seg }) => seg[0] === 'api' && seg[1] === 'd' &&
      seg[3] === 'stash' && seg.length === 4,
    handler: async (ctx, r) => {
      const { req, res, seg } = r;
      const doc = r.docOr404(ctx.store.bySlug(seg[2]!));
      if (!doc) return true;
      const session = cookieSession(ctx.auth, req, doc.id);
      if (session === null) { json(res, 401, { error: 'log in first' }); return true; }
      if (session.memberId !== doc.cs.convenorRecord().id) {
        json(res, 403, { error: 'only the founder holds the starting text' });
        return true;
      }
      if (doc.cs.textConfirmed) {
        json(res, 400, { error: 'the starting text is decided — changes are proposed in the document' });
        return true;
      }
      const body = await readJson(req);
      await ctx.store.setProvisional(doc,
        cap(expectString(body, 'text'), LIMITS.text, 'the text'));
      json(res, 200, { ok: true });
      return true;
    },
  },
  {
    /**
     * **The page reports its own uncaught errors** (plan stage 5b, after
     * the nh2026 convention): the surface's `error` and `unhandledrejection`
     * handlers post here, and the line joins the host's error log as
     * `kind: 'page'` (docs/OPERATING.md §11). A refusal has been written
     * down since Q1330 and a page error nowhere at all — the swallowed boot
     * error of Q1281 was found by hand months after it started.
     *
     * **A production route**, outside the `DEV:` label, because the errors
     * worth reading are the ones a room met. What it accepts is `error-log.ts`'s
     * `pageErrorOf` and nothing else; what it adds — the seat, the document,
     * the build — is the host's own knowledge, never the client's word.
     *
     * **No document is needed.** The birth is at `/` and throws there too,
     * so the slug is optional: with one, the line carries the document and
     * the seat that cookie stands for; without, the path alone.
     *
     * Two brakes. The per-IP one is the cheap outer guard, taken before the
     * body is read; the per-seat one is the plan's *a few a minute*, and a
     * seatless page is keyed by its address, which is the only name it has.
     */
    name: 'POST /api/page-error — what the surface caught',
    method: 'POST',
    match: ({ seg }) => seg[0] === 'api' && seg[1] === 'page-error' && seg.length === 2,
    handler: async (ctx, r) => {
      const { req, res, nowMs } = r;
      if (r.tooMany('page-error', 60)) return true;
      const body = await readJson(req);
      const doc = typeof body.slug === 'string' ? ctx.store.bySlug(body.slug) : null;
      const session = doc === null ? null : cookieSession(ctx.auth, req, doc.id);
      const seat = session === null ? null : session.memberId;
      if (rateLimited(`page-error:${seat ?? ipOf(req, ctx.cfg)}`, nowMs,
        PAGE_ERRORS_PER_MINUTE, 60_000)) {
        json(res, 429, { error: 'too many requests — try again shortly' });
        return true;
      }
      const row = pageErrorOf(body, { seat, doc: doc?.id ?? null, slug: doc?.cs.slug ?? null,
        // the commit this process is serving the page from: a surface
        // upload moves it without restarting, so the upload's is the truer
        // answer where there is one (Q1347)
        build: ctx.surfaceSha ?? ctx.buildSha });
      if (row === null) { json(res, 400, { error: 'a page error needs a message' }); return true; }
      logError(ctx.persistence, row, nowMs);
      // nothing to say back: the page is not waiting and must not be given
      // anything to get wrong about its own failure
      res.statusCode = 204;
      res.end();
      return true;
    },
  },
];

/**
 * How many of the membership have judged an applicant's admit motion — a
 * **count only**, never who or which way (SPEC §3.5; the applicant's own card
 * says *n of E have voted on it*, Q1281). Nothing submitted, nothing counted.
 * A carried motion reads as the whole electorate, as the page's own readout
 * does. On the constitutional route the answers are the module's; on the
 * ordinary route the application is a one-candidate race in the engine
 * (`admit:<id>`, §9.7½) and the judges are the distinct members with a
 * standing judgment on it — never the applicant, whose own voice the bridge
 * lends the race as its author (`RaceView.distinctMovers` would count it).
 */
function admitJudged(doc: LoadedDoc, app: ApplicantRecord): number {
  if (app.motion === null) return 0;
  const rec = doc.cs.motionRecords().get(app.motion);
  if (rec === undefined) return 0;
  if (rec.status === 'carried') return doc.cs.E();
  if (rec.route === 'constitutional') return rec.answers.size;
  const ed = asEngineDoc(doc);
  if (ed.bridge === null) return 0;
  // keyed on the candidate, not the race: a race that has adopted leaves
  // `races()` while the motion still awaits the crown's assent, and the
  // judgments that carried it are still the answer to *how many have voted*
  const ids = new Set(ed.bridge.engine.allCandidates()
    .filter((c) => c.setting?.settingId === `admit:${app.id}`).map((c) => c.id));
  if (ids.size === 0) return 0;
  const judges = new Set<string>();
  for (const j of ed.bridge.engine.judgments()) {
    if (j.superseded || j.participantId === app.id) continue;
    if (ids.has(j.aId) || ids.has(j.bId)) judges.add(j.participantId);
  }
  return judges.size;
}

/** A cookie names a seat; this says whether the seat still exists
 *  (review #1, finding 1). The convenor always does; a member must be
 *  unremoved; an applicant must still be on the applicant list. */
function seatAlive(cs: ConstitutionSession, memberId: string,
  applicantId: string | null): boolean {
  if (applicantId !== null) return cs.applicantRecords().has(applicantId);
  if (memberId === cs.convenorRecord().id) return true;
  const m = cs.memberRecords().get(memberId);
  return m !== undefined && !m.removed;
}
