/**
 * The spectator feed (Q1466, Ed 2026-09-19: *a feed of new proposals and
 * proposals that pass, with enough context that you can understand what's
 * happening. It doesn't show the full document*). Two rows: the feed's JSON
 * at `/api/d/:slug/feed` and its page at `/d/:slug/feed`.
 *
 * **Everything it prints comes through engine-core's `SpectatorApi`** (backlog
 * 42): the strictly-public projection, so what a spectator may not see is
 * kept from the feed by construction and not by this file's discipline. What
 * this file adds is the two things the engine cannot know: **who may read
 * it**, and **whose name an author's id is**.
 *
 * **Who may read it is 🌍's answer and nothing new.** A living member's seat
 * always may; anybody else exactly where the stranger's door would show them
 * the text — 🌍 at *link* or *public*. Where it would not, the answer carries
 * the door's own holding sentence and no entries: the feed is made of the
 * document's words, and a rule that kept the words from a stranger keeps
 * these. An applicant is not a member (§9.7½) and reads as a stranger does.
 *
 * **A read here is not presence** (§9.5a): the feed is not the room, so
 * watching it never refreshes a member's activity clock and never writes.
 */
import { join } from 'node:path';
import { SpectatorApi } from '../../engine-core/src/spectator-api.js';
import type { FeedEntry } from '../../engine-core/src/spectator-api.js';
import { settingFeed } from '../../constitution/src/spectator.js';
import type { SettingFeedEntry } from '../../constitution/src/spectator.js';
import { asEngineDoc } from './engine-host.js';
import { cookieSession, json, serveFile } from './routes.js';
import type { Route } from './routes.js';
import type { LoadedDoc } from './store.js';
import { strangerView } from './views.js';

/** The newest entries the feed serves: a page of reading, not an archive. */
export const FEED_LIMIT = 200;

interface NamedAuthor { name: string | null; picture: string | null; erased: boolean }

type TextEntry = Omit<FeedEntry, 'author'> & { author: NamedAuthor | null };
/** A settings motion as served: the projection's entry, under the same three kinds as the text's. */
type RuleEntry = SettingFeedEntry & { author: null; changes: [] };

// the settings half is a replay of the document's own log, so it is kept per
// document and rebuilt only when that log has grown
const ruleCache = new WeakMap<LoadedDoc, { seq: number; entries: SettingFeedEntry[] }>();
/**
 * **Suspected, switched off for thirteen minutes, and cleared** (2026-09-19).
 * docs.vote went to 502 within a minute of the build that first served these
 * entries taking traffic, and this replay was that build's one new server
 * path, so it was switched off on suspicion at 03:17. It was not the cause:
 * the replay measures 5 ms over a synthetic log of twelve thousand entries,
 * and the live host went on to serve this very path in 0.2 s and stay up. The
 * outage was the first process on the new build dying as it took traffic, and
 * a nine-minute boot behind it (the residency room's logs are replayed at
 * every start) — see QUESTIONS Q1469.
 */
function ruleEntries(doc: LoadedDoc): SettingFeedEntry[] {
  const log = doc.cs.logEntries();
  const hit = ruleCache.get(doc);
  if (hit && hit.seq === log.length) return hit.entries;
  const entries = settingFeed(log);
  ruleCache.set(doc, { seq: log.length, entries });
  return entries;
}

/**
 * The feed as served, newest first: the engine's text entries, an author's id
 * resolved to their row, and the constitution's settings entries among them by
 * time. A settings motion's mover is sealed, so its author is nobody's.
 */
export function feedEntries(doc: LoadedDoc): Array<TextEntry | RuleEntry> {
  const rules: RuleEntry[] = ruleEntries(doc).map((e) => ({ ...e, author: null, changes: [] }));
  const bridge = asEngineDoc(doc).bridge;
  if (bridge === null) return rules.slice(-FEED_LIMIT).reverse();
  // the members map first, the convenor record only for a clerk — the view's
  // own `recordOf`, since a founder who is a member keeps their identity there
  const recordOf = (id: string) => doc.cs.memberRecords().get(id) ??
    (id === doc.cs.convenorRecord().id ? doc.cs.convenorRecord() : null);
  // once per engine state, whichever screen asks first (the engine's own memo,
  // as the member view's per-state work rides it): a venue's screens all poll,
  // and the projection is a function of the engine alone
  const engine = bridge.engine;
  const all = engine.derived('host:spectatorFeed', () => new SpectatorApi(engine).feed());
  const texts: TextEntry[] = all.map((e) => {
    const rec = e.author === null ? null : recordOf(e.author);
    return { ...e,
      author: e.author === null ? null
        : { name: rec?.name ?? null, picture: rec?.picture ?? null, erased: rec?.erased ?? false } };
  });
  // one feed by time; a stable sort keeps each half's own order where two tie
  const both: Array<TextEntry | RuleEntry> = [...texts, ...rules];
  both.sort((a, b) => a.t - b.t);
  return both.slice(-FEED_LIMIT).reverse();
}

/** May this request read the document's words? A living member, or 🌍 at link or public. */
function memberSeat(doc: LoadedDoc, session: { memberId: string; applicantId: string | null } | null): boolean {
  if (session === null || session.applicantId !== null) return false;
  if (session.memberId === doc.cs.convenorRecord().id) return true;
  const m = doc.cs.memberRecords().get(session.memberId);
  return m !== undefined && !m.removed && m.arrivedAtT !== null;
}

export const feedTable: Route[] = [
  {
    name: 'GET /api/d/:slug/feed — the spectator feed',
    method: 'GET',
    match: ({ seg }) => seg[0] === 'api' && seg[1] === 'd' && seg.length === 4 && seg[3] === 'feed',
    handler: (ctx, r) => {
      const { req, res, url, seg, nowMs } = r;
      const doc = r.docOr404(ctx.store.bySlug(seg[2]!));
      if (!doc) return true;
      const member = memberSeat(doc, cookieSession(ctx.auth, req, doc.id));
      // the door's brake, on the feed's own bucket: a page polls every ten
      // seconds, sixty in the window, so this is a venue's worth of screens
      if (!member && r.tooMany('feed', 1500)) return true;
      const bridge = asEngineDoc(doc).bridge;
      // **the change token counts both logs** (issue #68 finding 1): the feed
      // is made of two projections — the engine's text entries and the
      // constitution's settings entries — and a motion on a rule writes the
      // constitution's log alone. A token that counted the engine's moved for
      // a proposal on the text and never for one on the rules, so a page left
      // open through a 🌍, 👥 or 🪪 vote was answered `short` for the motion's
      // whole open life and never redrew. Both logs are append-only, so the
      // sum moves when either does, and the page holds it opaquely.
      const eseq = (bridge === null ? 0 : bridge.engine.log.length) + doc.cs.logEntries().length;
      const paused = ctx.pause.payload(nowMs);
      // the door's own answer decides a stranger's reading, so the feed and
      // the door can never disagree about who may see the words
      const door = strangerView(doc, nowMs, paused, null, { records: false }) as
        { canRead: boolean; admission: string; holding: { kind: string; sentence: string | null } };
      const canRead = member || door.canRead;
      if (canRead && url.searchParams.get('since') === String(eseq)) {
        json(res, 200, { eseq, short: true, paused, stalled: !!doc.stalled });
        return true;
      }
      json(res, 200, {
        eseq,
        title: doc.cs.titleOf,
        slug: doc.cs.slug,
        serverNowMs: nowMs,
        begun: doc.cs.constitutedAtT !== null,
        closed: doc.cs.closed ? { at: doc.cs.closedAt } : null,
        paused,
        stalled: !!doc.stalled,
        canRead,
        // the membership's size, which a passed entry's *n of E* is read against
        // — the door serves the same number to anybody (`members.arrived`)
        members: doc.cs.E(),
        // two facts a rule's sentence turns on (🌍's *members and the Founder*,
        // 🤝's *joins on arrival*), both already the door's to anybody
        founderIsMember: doc.cs.convenorRecord().isMember,
        admissionPrice: door.admission,
        holding: canRead ? null : door.holding,
        entries: canRead ? feedEntries(doc) : [],
      });
      return true;
    },
  },
  {
    name: 'GET /d/:slug/feed — the feed’s page',
    method: 'GET',
    match: ({ seg }) => seg[0] === 'd' && seg.length === 3 && seg[2] === 'feed',
    handler: (ctx, r) => {
      if (r.docOr404(ctx.store.bySlug(r.seg[1]!)) === null) return true;
      serveFile(r.res, join(ctx.designDir, 'feed.html'));
      return true;
    },
  },
];
