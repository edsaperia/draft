/**
 * The two projections a document is read through (refactor Q1352 (k),
 * 2026-09-14): `raceView`, the member's blind side of the engine, and
 * `strangerView`, the door. Both lived inside `createDraftServer`'s closure
 * and read nothing from it that is not a parameter here — `raceView` took
 * the fold clock through `tOf`, which is `foldTime` with real now;
 * `strangerView` took the pause payload, which the route passes in. The
 * two price helpers the door reads (`admissionPrice`, `applyOpenFor`) come
 * with it; `server.ts` reads them for the apply door too.
 *
 * What either may say and must not is CLAUDE.md's `view` and `stranger's
 * door` entries and SPEC §3.5: never standings, never anybody else's
 * judgments, never an author the rung withholds. Moved, not edited.
 */
import { CATALOGUE, mayApply } from '../../constitution/src/index.js';
import type { ApplicationsValue, ConstitutionSession, Price, PriceValue } from '../../constitution/src/index.js';
import { authorshipBase } from '../../constitution/src/adapter.js';
import type { LoadedDoc } from './store.js';
import { asEngineDoc, foldTime } from './engine-host.js';
import { ParticipantApi, authorVisible } from '../../engine-core/src/participant-api.js';
import type { CardView } from '../../engine-core/src/participant-api.js';
import type { Candidate } from '../../engine-core/src/types.js';
import { adoptedSpan, spanNow, versionSteps } from './record-spans.js';
import type { Span } from './record-spans.js';
/**
 * The member's side of the engine (Q391, stage 8): the document as it
 * stands — the engine's once races run, the starting text before — the
 * text races over it, what is theirs, the record so far, their cards
 * and their wallet. Blind throughout (§3.5): wordings, rationales, the
 * member's own judgments and resolved outcomes; never standings, never
 * anybody else's judgments, never an author.
 */
/**
 * `opts.records === false` skips the sealed records — the heaviest part of
 * a busy room's view, and one that changes only when a race resolves — for
 * a poll that already holds them (`recordsKey`, the slim view below).
 */
export const raceView = (doc: LoadedDoc, memberId: string, nowMs: number,
  opts: { records?: boolean } = {}): {
  text: string; textVersion: number; clauses: unknown[]; mine: unknown[];
  records: unknown[]; recordsKey: number; raceCards: unknown[]; settingRaces: unknown[];
  wallet: number | null;
  walletInfo: unknown; floor: number; awaitingAssent?: unknown[];
  amendments?: unknown[]; parked?: unknown[];
} => {
  const ed = asEngineDoc(doc);
  const idle = { clauses: [], mine: [], records: [], recordsKey: 0, raceCards: [], settingRaces: [],
    wallet: null, record: null, walletInfo: null, floor: 0, awaitingAssent: [], amendments: [], parked: [] };
  if (ed.bridge === null) return { text: doc.cs.text ?? '', textVersion: 0, ...idle };
  const engine = ed.bridge.engine;
  const api = new ParticipantApi(engine, memberId);
  const myJ = api.myJudgments();
  // **A judgment is on a live race when both its sides are the race's**
  // (Q1202's walk, 2026-09-08). The incumbent is positional — the hash of
  // the text it displaces (§4.4) — so every gap race, and any two clauses
  // with the same wording, share one incumbent id; matching on *either*
  // side against a set that holds the incumbent filed a judgment on one gap
  // under every other, marking a race the member had never judged as
  // judged and listing a foreign pair in its ledger. Both sides also keeps
  // a salience diagonal (one side in each of two races) out of a clause's
  // ledger, where the page could never draw it.
  const onRace = (ids: Set<string>) => (j: { aId: string; bId: string }) =>
    ids.has(j.aId) && ids.has(j.bId);
  // per-race judge counts are the record's own numbers (§8.2): a count,
  // never who or which way
  const allJ = engine.judgments();
  // **The room's own number, for the record's *quorum was n* line** (Q1439):
  // the floor over the whole of E, which is what it is before anybody has
  // abstained. A live race carries **its own** floor instead — `r.floor`,
  // read against the group it is waiting on — and the two differ exactly
  // when a silence has run out its 💤 period.
  const floor = engine.adoptionFloor();
  // **Once per state, not once per seat** (Q1324). Two things below were
  // proportional to the document's whole history on every poll: the lines
  // of every version a record displaced text from (a join and a split of
  // the whole text per record), and the judge count of every race ever
  // resolved (a filter over every judgment per record). Both are the
  // engine's facts alone, so they ride its own per-state memo and are
  // rebuilt only when an event lands, whichever seat asks first.
  const linesAt = (version: number): string[] =>
    engine.derived(`host:lines@${version}`, () => engine.documentAt(version).split('\n'));
  // who has judged a pair touching each candidate: the record's mover count
  // (§8.2) is the union over its field — a count, never who or which way
  const judgedBy = engine.derived('host:judgedBy', () => {
    const m = new Map<string, Set<string>>();
    for (const j of allJ) {
      for (const id of [j.aId, j.bId]) {
        let s = m.get(id);
        if (!s) { s = new Set(); m.set(id, s); }
        s.add(j.participantId);
      }
    }
    return m;
  });
  // **Who is named, live and at the record, is one rule** (§3.5a, Q770,
  // entry 31): `authorVisible` — signed, or made under `public`, or closed
  // and made under `sealed`. Read here for every author the view carries,
  // so a signed proposal is named on its race card and in the records
  // while the document is open, and an unsigned one exactly when its own
  // rung says.
  // the members map first: a founder who is a member keeps their identity
  // there (`identity-set`'s fold), and the convenor record only for a clerk
  const recordOf = (id: string) => {
    const m = doc.cs.memberRecords().get(id);
    if (m) return m;
    if (id === doc.cs.convenorRecord().id) return doc.cs.convenorRecord();
    return null;
  };
  // **And the picture goes wherever the name goes** (SURFACE K30, backlog
  // 255): the speaker's disc is the face the room will see, so a card that
  // may print a name may print the face beside it. Read off the same record
  // and behind the same `authorVisible` gate — one gate, two fields — so
  // §3.5 is untouched: where the name is withheld the whole object is.
  const namedAuthor = (c: Candidate):
  { id: string; name: string | null; picture: string | null; erased: boolean } | undefined => {
    if (!authorVisible(c, engine.constitution, { closed: engine.closed })) return undefined;
    const rec = recordOf(c.author);
    // `erased` rides with the name (decision 1253): the page prints
    // *[redacted]* rather than Anonymous where the row is gone
    return { id: c.author, name: rec?.name ?? null, picture: rec?.picture ?? null,
      erased: rec?.erased ?? false };
  };
  // **The hand is dealt before the clause rows are built** (Q1202), because
  // each row says whether the hand holds a card on its race and, where it
  // does not, carries the pair the race can still ask — so every lit entry
  // on the page opens a card without a second read. Null where the seat
  // has no hand at all: a closed document, a clerk, a seat out of E.
  // **One hand, one top** (Q98, Ed 2026-09-14): the size is a const because
  // `askOn` below prices its pair against the hand of exactly this `n` at
  // exactly this `t` — a second literal here would be a second denominator,
  // and the margin would order the two reads against different scales.
  const HAND = 10;
  const served = ((): { t: number; wallet: ReturnType<typeof api.wallet>; cards: CardView[] } | null => {
    if (engine.closed) return null;
    try {
      const t = foldTime(doc);
      return { t, wallet: api.wallet(t), cards: api.nextCards(HAND, t) };
    } catch { return null; }
  })();
  // **At this poll's own clock** (Q1439): who has abstained, and so what each
  // race's floor is, moves with `t` and with no event to mark it.
  const clauses = engine.races(nowMs).filter((r) => r.settingId === undefined).map((r) => {
    const ids = new Set([...r.members, r.incumbentId]);
    const here = myJ.filter(onRace(ids));
    const standing = here.some((j) => !j.superseded && !j.locked);
    // **What can still be asked of you here, dealt or not** (Q1202, Ed
    // 2026-09-07: *⏳ should mean "waiting for other people to vote"*). A
    // race the hand holds a card on is askable by construction; a race it
    // does not is asked of the engine, which answers with the pair `feed`
    // would deal — the same blind `CardView` the hand carries, no value,
    // no standing, an author only where `namedAuthor`'s rule already
    // allows — or null once nothing on the race is left to ask this seat.
    // Its `urgency` is its own value over the hand's top (Q98), so the
    // margin orders it below the dealt cards and among its fellows; the
    // hand is memoised per state version, so this costs no second deal.
    const dealt = served !== null && served.cards.some((c) => c.kind === 'edge' && c.raceId === r.id);
    const ask = served === null || dealt ? null : api.askOn(r.id, HAND, served.t);
    return {
      id: r.id,
      contested: r.contested,
      incumbentId: r.incumbentId,
      deadlocked: r.deadlocked,
      // closeness to resolution as a magnitude (SPEC §8.3) — see RaceView.
      // Since Q1362 (c) it is the leader's judges over the floor, the same
      // two numbers as the pair below: the rail's fill is how far the room
      // has got toward the quorum, and this is the wire it rides on.
      closeness: r.closeness,
      // the meter's own number (Q1337): who has judged the leader, its
      // author's voice among them — never the race's traffic. It stays
      // judgments and not approvals (Q1439, Ed's ruling (b): *it's just a
      // progress bar*), over **this race's** floor rather than the room's.
      judges: r.leaderJudges,
      floor: r.floor,
      askable: dealt || ask !== null,
      ask,
      // **waiting behind a park on the same span** (R-100, SURFACE E36): the
      // batch passes this race over until the Founder answers a park it
      // overlaps, and the room is told so (Ed, 2026-09-09, Q1015) — the one
      // thing here that says a leader would carry, by Ed's ruling
      blockedByPark: r.blockedByPark,
      candidates: r.members.map((id) => {
        const c = engine.getCandidate(id);
        const author = namedAuthor(c);
        return { id, hunks: c.patch?.hunks ?? [], rationale: c.rationale,
          mine: c.author === memberId, ...(author ? { author } : {}) };
      }),
      judged: standing,
      // a judgment of mine locked by a ground shift, with nothing of mine
      // standing since: the race will ask me again (↻)
      shifted: !standing && here.some((j) => j.locked && !j.superseded),
      // **The member's own ledger** (Q1201): every standing judgment of
      // theirs touching this race, oldest first, as the ids judged and the
      // verdict given — the ⏳ card lists them and a press revises one
      // (SPEC §4.4). Their own moves are their own data (§11); nothing
      // about anybody else's enters here, and `superseded` ones are gone
      // because the revision replaced them. An author's derived preference
      // for their own text (§3.3) is not a judgment and is not in
      // `judgments()`, so their ledger holds only what they cast. **A pair
      // keeps its place when revised** (Q1203, Ed 2026-09-07): the order
      // is the first time the member judged each pair, not the time of
      // the verdict that stands, so the ledger reads as the list of what
      // they were asked and a revision never moves a block.
      myJudgments: (() => {
        const key = (j: { aId: string; bId: string }) => [j.aId, j.bId].sort().join(' ');
        const firstAt = new Map<string, number>();
        here.forEach((j, i) => { if (!firstAt.has(key(j))) firstAt.set(key(j), i); });
        return here.filter((j) => !j.superseded)
          .sort((x, y) => firstAt.get(key(x))! - firstAt.get(key(y))!)
          .map((j) => ({ a: j.aId, b: j.bId, outcome: j.outcome, locked: j.locked }));
      })(),
    };
  });
  // **A setting race is blind too** (Q1371). An admission at *proposal* — and
  // any ordinary motion — runs as a one-candidate race in the engine, and the
  // page's entry for it needs exactly what a text race's entry has: how far
  // the room has got (`closeness`, the leader's judges over the floor, Q1362
  // (c)) and whether this seat has judged it and can still be asked. Nothing
  // else crosses — no standings, no author, no candidate — so §3.5 holds as
  // it does for the clause rows above. Before this the page kept a marker of
  // its own for an ordinary motion's judgment and never set it for an
  // admission, so the admit entry could not tell voted from unvoted and its
  // fill was the founder's 100%.
  const settingRaces = engine.races(nowMs).filter((r) => r.settingId !== undefined).map((r) => {
    const ids = new Set([...r.members, r.incumbentId]);
    const here = myJ.filter(onRace(ids));
    const dealt = served !== null && served.cards.some((c) => c.kind === 'edge' && c.raceId === r.id);
    const ask = served === null || dealt ? null : api.askOn(r.id, HAND, served.t);
    // **The pair crosses, as a clause row's does** (Q1393, the lantern-house
    // room, 2026-09-16). `askable` alone told the page a vote could be had
    // and gave it nothing to vote with: the hot set is three races, a busy
    // room's text races outvalue an admission, and twenty members each
    // holding four text cards never met the applicant. Same blind CardView
    // as the clause rows carry (Q1202) — no standing, no author.
    return { id: r.id, settingId: r.settingId, closeness: r.closeness, judges: r.leaderJudges,
      floor: r.floor,
      judged: here.some((j) => !j.superseded && !j.locked), askable: dealt || ask !== null, ask };
  });
  const mine = api.myCandidates().flatMap((m) => {
    const c = engine.getCandidate(m.id);
    if (c.patch === undefined) return []; // motions have their own records
    // **A stranded proposal stands where its clause stands now** (Q170, Ed
    // 2026-09-14; SURFACE E38). A `rebase-pending` patch is still expressed
    // against the version it was written for — the rebase failed, so nothing
    // moved it — while the page keys every entry, tab and card by the line
    // index of the *current* text. `spanNow` walks each hunk's span through
    // the version steps since, exactly as a sealed record's `at` does (Q1333),
    // so the ↻ lands on the wording that displaced it rather than on whatever
    // now happens to sit at the old line number. One span per hunk, in the
    // patch's own order, so a multi-site proposal keeps its places.
    const at = m.state === 'rebase-pending'
      ? c.patch.hunks.map((h) => spanNow({ start: h.start, end: h.end }, c.patch!.baseVersion,
          engine.derived('host:versionSteps', () => versionSteps(engine))))
      : undefined;
    return [{ id: m.id, state: m.state, rationale: m.rationale,
      patch: c.patch, footprint: c.footprint, signed: !!c.signed,
      ...(at ? { at } : {}) }];
  });
  // 🛡️ on the Text (R-056): what the room passed and nobody has applied.
  // **The founder's alone** — it is the only seat with a question to
  // answer, and the wording is a change no document has taken. The 👑
  // task in `view()` carries only an id and a summary, so the card's own
  // wording comes from here, matched by candidate id.
  const awaitingAssent = memberId === doc.cs.convenorRecord().id
    ? engine.allCandidates().filter((c) => c.state === 'awaiting-assent').map((c) => {
        const author = namedAuthor(c);
        return { candidateId: c.id, hunks: c.patch?.hunks ?? [], rationale: c.rationale,
          footprint: c.footprint, ...(author ? { author } : {}) };
      })
    : [];
  // **The room's side of a park** (SURFACE E36, E37; Ed, 2026-09-09, Q1015):
  // every seat is told *where* a change the membership passed waits on the
  // Founder — the race it cleared in and the span it rewrites — and whether
  // it is their own. No wording, no rationale, no author: the card says who
  // is being waited on and asks only to have been seen; the words are the
  // Founder's alone, one screen up. Keyed by race so a later park on the
  // same clause is a new entry.
  const parked = engine.allCandidates().filter((c) => c.state === 'awaiting-assent').map((c) => ({
    raceId: c.awaiting?.raceId ?? `r:${c.id}`, candidateId: c.id,
    contested: c.footprint, mine: c.author === memberId,
  }));
  // ✒️ on the Text (R-058, SURFACE E35): the wording of an amendment this
  // viewer is still owed the news of. **The owed set is the module's**, read
  // here rather than walked over every candidate the document has ever
  // decreed, so the projection is bounded by what is unread and not by the
  // document's age. The module's `owedAmendments` carries the summary, the
  // reason and the moment; this carries the words, joined by candidate id —
  // the `awaitingAssent` / 👑 join one screen up. Nothing here is a
  // disclosure question: the amendment is already the document.
  const owedAmendmentIds = new Set(
    (doc.cs.memberRecords().get(memberId)?.amendmentsOwed) ?? []);
  const amendments = owedAmendmentIds.size
    ? engine.allCandidates()
        .filter((c) => c.exit?.cause === 'decreed' && owedAmendmentIds.has(c.id))
        .map((c) => {
          const hunks = c.patch?.hunks ?? [];
          // the lines this patch replaced, off the version it was made
          // against — a decree always targets the version that stood, so
          // `baseVersion` is exactly *before*. A version the engine can no
          // longer produce says nothing rather than something untrue.
          let displaced: string[] = [];
          if (c.patch && hunks.length) {
            try {
              const prev = linesAt(c.patch.baseVersion);
              displaced = prev.slice(Math.min(...hunks.map((h) => h.start)),
                Math.max(...hunks.map((h) => h.end)));
            } catch { displaced = []; }
          }
          return { candidateId: c.id, hunks, displaced };
        })
    : [];
  // the record, one entry per race (Q503c): the whole field, the text it
  // displaced as it stood at resolution, and the race's judge count
  type Rec = { raceId: string; candidateId: string; outcome: string; when: number;
    p: number | null; threshold: number | null; version: number;
    /**
     * The cap mark (SPEC §4.2, R-051): the ranking fit this race's
     * adoption was decided on reached its iteration cap. **A fact about
     * one adoption**, so it is stamped in the `adopted` branch beside
     * `rec.p` — a race that never adopted carries none, and on `field`
     * only the adopted candidate's own entry can carry one, `outcomes()`
     * putting it on no other outcome. The two numbers are the auditor's;
     * the page reduces them to a boolean.
     */
    cappedFit?: { iterations: number; gradMax: number };
    footprint: unknown; displaced: string[]; judges: number; judgedByMe: boolean;
    /**
     * **Where the record stands now** (Q1333): the field's span, decided in
     * `version`'s coordinates, carried through every adoption and decree
     * since to the current text — the lines that descend from what it
     * decided. A clause changed again maps to its replacement; a clause
     * deleted maps to the gap where it stood (`start === end`). The page
     * keys the entry, the tab and the card by this; `footprint` and
     * `version` stay as they were, and `displaced` still reads `version`.
     */
    at: Span;
    field: Array<{ candidateId: string; outcome: string; p: number | null;
      threshold: number | null; hunks: Array<{ start: number; end: number; lines: string[] }>;
      rationale: string; judgedByMe: boolean;
      /** *Proposal refused by ‹name› 🛡️* — the reason the author reads (R-056). */
      reason?: string;
      cappedFit?: { iterations: number; gradMax: number };
      author?: { id: string; name: string | null; picture: string | null } }> };
  const byRace = new Map<string, Rec>();
  // an author's derived preference is a mover (§3.3, §8.2): counted, never named
  const authorsOf = new Map<string, Set<string>>();
  // the records' key is the count of outcomes: a record exists per resolved
  // race and never leaves, so the count moves exactly when a record would
  const recordsKey = api.outcomes().length;
  for (const o of opts.records === false ? [] : api.outcomes()) {
    const c = engine.getCandidate(o.candidateId);
    if (c.patch === undefined) continue;
    const mineJ = myJ.some((j) => j.aId === o.candidateId || j.bId === o.candidateId);
    const author = namedAuthor(c);
    const entry = { candidateId: o.candidateId, outcome: o.outcome, p: o.p ?? null,
      threshold: o.threshold ?? null, hunks: c.patch.hunks, rationale: c.rationale,
      judgedByMe: mineJ, ...(o.reason ? { reason: o.reason } : {}),
      ...(o.cappedFit ? { cappedFit: o.cappedFit } : {}),
      ...(author ? { author } : {}) };
    let rec = byRace.get(o.raceId);
    if (!rec) {
      rec = { raceId: o.raceId, candidateId: o.candidateId, outcome: o.outcome, when: o.t,
        p: o.p ?? null, threshold: o.threshold ?? null, version: o.version,
        footprint: c.footprint, displaced: [], judges: 0, judgedByMe: false,
        at: { start: 0, end: 0 }, field: [] };
      byRace.set(o.raceId, rec);
    }
    rec.field.push(entry);
    if (!authorsOf.has(o.raceId)) authorsOf.set(o.raceId, new Set());
    authorsOf.get(o.raceId)!.add(c.author);
    rec.judgedByMe = rec.judgedByMe || mineJ;
    if (o.outcome === 'adopted') {
      rec.candidateId = o.candidateId; rec.outcome = 'adopted'; rec.when = o.t;
      rec.p = o.p ?? null; rec.threshold = o.threshold ?? null; rec.version = o.version;
      rec.footprint = c.footprint;
      // absent means converged, so the key is deleted rather than set to
      // `undefined` (R-051) — this is the record's one honest silence
      if (o.cappedFit) rec.cappedFit = o.cappedFit; else delete rec.cappedFit;
    }
  }
  // **A record's span, carried to the current text** (Q1333): once per
  // state, not once per seat — the walk over the log's version steps and
  // the per-race result are the engine's facts alone, so both ride its
  // per-state memo beside `host:judgedBy`. The map fills lazily: a race is
  // mapped the first time any seat's view reaches it after an event.
  const steps = engine.derived('host:versionSteps', () => versionSteps(engine));
  const recordSpans = engine.derived('host:recordSpans', () => new Map<string, Span>());
  for (const rec of byRace.values()) {
    const hs = rec.field.flatMap((f) => f.hunks);
    const span = { start: Math.min(...hs.map((h) => h.start)), end: Math.max(...hs.map((h) => h.end)) };
    let prev: string[] = [];
    try { prev = linesAt(rec.version); } catch { prev = []; }
    rec.displaced = prev.slice(span.start, span.end);
    let at = recordSpans.get(rec.raceId);
    if (!at) {
      // an adopted record starts from the lines its winner put there, in
      // `version + 1`; a retired or undecided one from the field's span,
      // the incumbent standing, in `version` itself
      const winner = rec.outcome === 'adopted'
        ? rec.field.find((f) => f.candidateId === rec.candidateId)?.hunks : undefined;
      at = winner ? spanNow(adoptedSpan(span, winner), rec.version + 1, steps)
        : spanNow(span, rec.version, steps);
      recordSpans.set(rec.raceId, at);
    }
    rec.at = at;
    if (rec.outcome === 'adopted') {
      // **The number the floor tested** (Q1337, R-102): the distinct
      // members who judged the candidate that carried — its own author
      // among them, whose derived preference (§3.3) is one voice for it —
      // and nobody who only judged a rival, nor a rival's author who
      // judged nothing. Read on the outcome's candidate rather than the
      // field, so a withdrawn rival's judges neither swell nor drain it.
      const judges = new Set(judgedBy.get(rec.candidateId) ?? []);
      judges.add(engine.getCandidate(rec.candidateId).author);
      rec.judges = judges.size;
    } else {
      // no winner to count: a retired or undecided race reads its whole
      // field, the authors' voices and every judgment on any of them
      const movers = new Set(authorsOf.get(rec.raceId) ?? []);
      for (const f of rec.field) for (const p of judgedBy.get(f.candidateId) ?? []) movers.add(p);
      rec.judges = movers.size;
    }
  }
  const records = [...byRace.values()].sort((a, b) => a.when - b.when).slice(-50);
  // **The record** (SPEC §4.6, the shape record-builder renders), once closed:
  // the final text, what adopted, the backlog of undecided races each with
  // its field and the text that stood, the changes carried-but-unassented,
  // the signatures. Authorship reveals here as `authorVisible` says (§3.5a):
  // `sealed` unseals at the record, `public` already was, `anonymous` never,
  // a signed proposal always — each read against the rung the proposal was
  // **made under** (entry 31), which every field entry states beside the
  // rung that stands now (`rungNow`), so a reader can see the rule moved.
  const record = !engine.closed ? null : (() => {
    const r = ed.bridge!.closeRecord();
    // `authorshipBase` is the door's mapper — *what does this rung do by
    // default* — and the right reading for the rung that stands (Q767).
    const rungNow = authorshipBase(
      (doc.cs.settingState('authorship').value as { rung?: string } | null)?.rung ?? 'sealed');
    const withAuthors = (field: Rec['field']) => field.map((f) => {
      const c = engine.getCandidate(f.candidateId);
      const author = namedAuthor(c);
      return { ...f, madeUnder: c.disclosure ?? rungNow, signed: !!c.signed,
        ...(author ? { author } : {}) };
    });
    const all = [...byRace.values()].sort((a, b) => a.when - b.when)
      .map((x) => ({ ...x, field: withAuthors(x.field) }));
    return {
      closedAt: r.closedAt, text: r.text, rungNow,
      adopted: all.filter((x) => x.outcome === 'adopted'),
      undecided: all.filter((x) => x.outcome === 'undecided'),
      carriedButUnassented: r.carriedButUnassented,
      signatures: r.signatures,
    };
  })();
  const base = { text: engine.document(), textVersion: engine.currentVersion(),
    clauses, mine, records, recordsKey, floor, record, awaitingAssent, amendments, parked,
    settingRaces };
  // closed, a clerk, or a seat out of E: no hand and no wallet
  if (served === null) return { ...base, raceCards: [], wallet: null, walletInfo: null };
  const w = served.wallet;
  // JSON has no Infinity: a document that does not drip says null
  const fin = (x: number) => (Number.isFinite(x) ? x : null);
  return { ...base, raceCards: served.cards, wallet: w.balance,
    walletInfo: { balance: w.balance, nextDripInMs: fin(w.nextDripInMs),
      dripIntervalMs: fin(w.dripIntervalMs), cap: w.cap } };
};
/**
 * The stranger's door (Q455/456/452, 2026-08-21): there is no login
 * screen. Whoever holds a real slug and no seat gets the three columns
 * like everybody else — the title, the rules read plainly, the text
 * redacted to its shape, and one holding sentence saying who decided
 * what and what they may do about it. Per field, the rule is: **the
 * constitution is public while the text is private** — standing values,
 * holders and powers (the by-deviation governance) are served; members'
 * names and addresses, the blind questions' answers and counts, motions
 * in flight and anything about any individual member are not. The
 * founder's name and picture are served (Q455's sentence names them if
 * they chose a name; an unnamed founder is "the founder", never
 * "Anonymous"). The text's shape — per block, heading level and
 * character count — is served so the redaction can stand at real
 * metrics; the words only where 🌍 says link or public.
 */
export const strangerView = (doc: LoadedDoc, nowMs: number,
  paused: { at: number; expectedMs: number; elapsedMs: number } | null,
  session: { memberId: string; applicantId: string | null } | null = null): Record<string, unknown> => {
  const cs = doc.cs;
  // **A seat that dies mid-session becomes the door, and the door says
  // why** (SURFACE E31–E32, Q901). The cookie still names whose seat it
  // was; if that member left the membership, one sentence on the door
  // says so, by whose act and when. **Not gated by 🌍**: a removed member
  // reading their own door under `closed` must still be told they were
  // removed — that is the whole point of the sentence — and it carries
  // nothing about the document. Never for an applicant cookie: a refused
  // applicant is E21's story, not this one.
  let departed: { by: string; t: number } | null = null;
  if (session !== null && session.applicantId === null) {
    const rec = cs.memberRecords().get(session.memberId);
    if (rec !== undefined && rec.removed && rec.removedBy !== null) {
      const d = cs.departures().find((x) => x.member === session.memberId);
      if (d !== undefined) departed = { by: d.by, t: d.t };
    }
  }
  const ed = asEngineDoc(doc);
  const text = ed.bridge !== null ? ed.bridge.engine.document() : (cs.text ?? '');
  const chamber = cs.settingState('chamber');
  const rung = (chamber.value as { rung?: string } | null)?.rung ?? null;
  const canRead = rung === 'link' || rung === 'public';
  const convenor = cs.convenorRecord();
  const founderName = cs.memberRecords().get(convenor.id)?.name ?? convenor.name ?? null;
  const founderPicture = cs.memberRecords().get(convenor.id)?.picture ?? convenor.picture ?? null;
  const founder = founderName === null ? 'The founder' : `The founder ${founderName}`;
  // one changing sentence: who decided, what they decided, what you may
  // do about it — the last is the rail's business (📧 or Apply)
  let holding: { kind: string; sentence: string | null };
  if (!cs.textConfirmed) {
    holding = { kind: 'drafting', sentence: 'The constitution is being drafted.' };
  } else if (chamber.settledBy === null) {
    holding = chamber.holder === 'convenor'
      ? { kind: 'founder-deciding', sentence: `${founder} is deciding if you can see this document.` }
      : { kind: 'members-deciding', sentence: 'The members are deciding if you can see this document.' };
  } else if (!canRead) {
    holding = chamber.settledBy === 'convenor'
      ? { kind: 'members-only', sentence: `${founder} decided this document is visible to members only.` }
      : { kind: 'members-only', sentence: 'The members decided this document is visible to members only.' };
  } else {
    holding = { kind: 'open', sentence: null };
  }
  const applyAllowed = mayApply(cs.settingState('applications').value as ApplicationsValue | null);
  const admission = admissionPrice(cs);
  const begun = cs.constitutedAtT !== null;
  const lines = text.length === 0 ? [] : text.split('\n');
  return {
    stranger: true,
    title: cs.titleOf,
    slug: cs.slug,
    constitutedAtT: cs.constitutedAtT,
    closed: cs.closed ? { at: cs.closedAt } : null,
    serverNowMs: nowMs,
    paused,
    stalled: !!doc.stalled,
    textConfirmed: cs.textConfirmed,
    holding,
    founder: { name: founderName, picture: founderPicture },
    canRead,
    text: canRead ? text : null,
    textShape: lines.map((l) => {
      const m = l.match(/^(#{1,3})\s+/);
      return { heading: m ? m[1]!.length : 0, chars: m ? l.length - m[0].length : l.length };
    }),
    // entry 94: may strangers apply, and at what price — `joinOpen` is the
    // door open *and* free (🪪 at ✒️), `applyOpen` open at a price
    mayApply: applyAllowed,
    admission,
    applyOpen: applyOpenFor(cs),
    joinOpen: begun && !cs.closed && applyAllowed && admission === 'pen',
    departed,
    // **Q508(c)** (Ed, 2026-08-21): the membership rides 🌍. Where a
    // stranger may read the document they may read who is in the room —
    // the Members list is a section of the constitution, and at that
    // setting the constitution is public. Where they may not, the door
    // says how many have arrived and nothing else: a name is how somebody
    // appears *in the room*, and a stranger is not in it.
    members: {
      arrived: cs.E(),
      // arrived members only: an invitation is not a membership (§9.6a),
      // and a removed one is not one either
      list: canRead
        ? [...cs.memberRecords().values()]
          .filter((m) => m.arrivedAtT !== null && !m.removed)
          .map((m) => ({ name: m.name, picture: m.picture, erased: m.erased }))
        : null,
      // the departure lines are register text (E31–E32), so a stranger
      // reads them exactly where 🌍 lets them read the register
      departures: canRead
        ? cs.departures().map((d) => {
          const m = cs.memberRecords().get(d.member);
          return { name: m?.name ?? null, picture: m?.picture ?? null,
            erased: m?.erased ?? false, t: d.t, by: d.by };
        })
        : null,
    },
    view: {
      // every rule, 🪪 included (Q1280, 2026-09-07): the door left
      // `admission` out from its first build, when the setting was the
      // membership list itself and had no sentence to print; since Q903 it
      // is a priced rule like 🥾, and without its row the stranger's
      // settled 🪪 card opened over an empty head. The top-level
      // `admission` price stays for the door's own Apply arithmetic.
      settings: CATALOGUE.filter((e) => e.kind !== 'personal').map((e) => {
        const st = cs.settingState(e.id);
        return { setting: e.id, glyph: e.glyph, kind: e.kind, value: st.value,
          settledBy: st.settledBy, holder: st.holder, collecting: st.collecting,
          powers: { ...st.powers } };
      }),
      gates: { proposing: begun, judging: begun && !cs.closed },
      crowned: cs.crowned(),
    },
  };
};
/** 🪪 as it stands — unset reads as the most protective price, as the fold does. */
export function admissionPrice(cs: ConstitutionSession): Price {
  const v = cs.settingState('admission').value as PriceValue | null;
  return v?.price ?? 'assembly';
}

/**
 * May a stranger apply right now, at a price (entry 94)? Begun, not closed,
 * 🤝 open and 🪪 above ✒️ — at ✒️ the link itself admits (`joinOpen`). One
 * expression for the stranger's door and the applicant's own view (E33), so
 * the two cannot disagree.
 */
export function applyOpenFor(cs: ConstitutionSession): boolean {
  const applyAllowed = mayApply(cs.settingState('applications').value as ApplicationsValue | null);
  return cs.constitutedAtT !== null && !cs.closed && applyAllowed && admissionPrice(cs) !== 'pen';
}
