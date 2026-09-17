/**
 * **Promise-coverage — 👥 quorum** (backlog entry 85, series 77, batch L).
 *
 * One setting, read the series' way: every value it can take × every state
 * its holder can be in × the three epochs, each cell asked *what does this
 * promise the room, in the room's own words, and what stands behind it?*
 * The session fixes nothing — a `it.fails` here is a filed gap waiting for
 * its own plan, and it goes green the day that plan lands.
 *
 * ## The promises, and where each is kept
 *
 * | # | The promise, in the room's words | Epoch | Verdict |
 * |---|---|---|---|
 * | 1 | *Nothing changes the document until at least Q of us have voted for it* — on the change itself, never fewer than ⌈E/3⌉ and **never more than half of us** | live, close | **holds** — `engine-core` `floorFor`, `r.approvals >= r.floor` in `clearsFloor`, read by the batch and by the close alike (Q1337: the winner, never the race at large; Q1439: approvals, never judgments) |
 * | 2 | *The question was asked as a count (or a share), and that is how it is answered and how it stands* | pre-Begin | **holds** — `setQuorumForm`'s two refusals, `answer`'s third |
 * | 2 | …and live | live | **gap (fold)** — nothing after 🍾 checks the form: a `set` motion or the founder's own pen re-frames `quorumFormValue` silently, and the composer cannot express the re-frame it permits |
 * | 3 | *If the quorum is a share, it is a share of who is here now* | live | **holds** — `adoptionFloor()` re-derives from `eCount()` on every call; `floor-recomputed` on every roster change |
 * | 4 | *However few of us are left, the quorum is never more than half of us — and nothing stops* (§9.5a, R-088 as amended by Q1439's R-126) | live | **holds** — `canJudge()` is `constitutedT !== null`; a lapse, a removal or a birth that leaves E under a count-form quorum reads it as half the room and holds nothing else. It read *too few of us left and nothing passes* until 2026-09-17: that was the defect, not the promise — one absence held every race for ever |
 * | 5 | *The founding questions themselves are not decided by quorum* | pre-Begin | **holds, by design** — `maybeResolve` has no quorum in it at all; it holds on an open invitation and on one voice |
 * | 6 | *A constitutional motion has no quorum either* | live | **holds, by design** — `maybeSettleMotions` reads `motionElectorateOf`, never `quorumCount` |
 * | — | the arithmetic: *a share of E, rounded up* | all | **gap (fold, both packages)** — `Math.ceil((n / 100) * E)` is not ⌈n·E/100⌉ in binary floating point |
 *
 * ## The grid, cell by cell
 *
 * `form` × `holder` × `epoch`. A cell that serves no promise is said to be
 * empty rather than skipped.
 *
 * | | pre-Begin | live | closed |
 * |---|---|---|---|
 * | **count**, founder-held and set | 2 (the form is fixed), 5 | 1, 2 (gap), 3 (a count does not track E — that is the point of the form), 4, 6 | 1 (the final batch applies the same floor) |
 * | **count**, delegated and collecting | 2, 5; 👥 is a judge-gate, so nothing is judged and promise 1 is not yet being made | *empty* — `begin` refuses while it collects | *empty* |
 * | **count**, delegated and settled | 2, 5 | as founder-held: who holds it does not change what it promises | as founder-held |
 * | **share**, founder-held and set | 2, 5; a share before Begin is a share of a room still forming, so promise 3 is not yet being made | 1, 2 (gap), 3, 4, 6 | 1 |
 * | **share**, delegated and collecting | 2, 5 | *empty* | *empty* |
 * | **share**, delegated and settled | 2, 5 | 1, 2 (gap), 3, 4, 6 | 1 |
 *
 * Two cells the plan asked to be named explicitly: **a share before Begin**
 * is empty of promise 3 (there is no settled room for it to be a share of),
 * and **a count after the close** still serves promise 1, because §4.6's
 * final batch reads the same floor as every batch before it.
 *
 * Nothing here is a surface lock: 👥's surface half is read in the report
 * (the blind slider's bounds, the composer's fields, the topbar's `floor`)
 * and asserted on the DOM by `scripts/slider-walk.mjs`.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { EngineBridge } from '../src/engine-bridge.js';
import { quorumCount, adoptionFloor, adoptionFloorTerm } from '../src/populations.js';
import { buildConstituted } from './helpers.js';
import type { SettingId } from '../src/catalogue.js';

/** A patch over the whole first line, as `bridge.test.ts` writes one. */
const patch = (baseVersion: number, lines: string[]) =>
  ({ baseVersion, hunks: [{ start: 0, end: 1, lines }] });

/**
 * **Keeping a seat alive against the lapse clock.** Not `seen`, which is
 * stamped at most once an hour (`SEEN_EVERY_MS`, Q459 (a)) and so cannot
 * hold a seat up inside a fixture whose window is sixteen minutes wide —
 * and not `touch`, which is private. `arrive` on somebody who is already
 * here *is* the touch, with no event behind it, which is what the seat
 * matrix learned the hard way: a page that merely polls does not count as
 * activity, an act does.
 */
const keepAlive = (s: ConstitutionSession, t: number, ...who: string[]) => {
  for (const m of who) s.arrive(t, m);
};

/** 💤 at five minutes, inside `buildConstituted`'s own 1,000,000 ms window:
 *  quiet since the founding lapses at LAPSE_TICK, touched at LAPSE_ALIVE
 *  does not. A tick past the window would close the document instead. */
const LAPSE_MS = 300_000;
const LAPSE_ALIVE = 400_000;
const LAPSE_TICK = 500_000;

/**
 * **A room of one.** `buildConstituted` cannot make one: a delegated question
 * at E = 1 never resolves (promise 5's own rule), so the founding cannot end.
 * The sole member's document is therefore founder-held throughout — which is
 * also the only shape entry 60's ruling can take.
 */
function buildSolo(quorum: { form: 'count' | 'share'; n: number }) {
  const s = ConstitutionSession.open({
    title: 'A Room of One', slug: 'room-of-one',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);
  s.confirmStartingText(1, 'The clubhouse shall be kept open.');
  const values: Array<[SettingId, unknown]> = [
    ['ending', { endsAtMs: 1_000_000 }],
    ['pace', { shape: 'fixed' }],
    ['bar', { pct: 55 }],
    ['chamber', { rung: 'public' }],
    ['rate', { grant: 4, cap: 8, dripMinutes: 240 }],
    ['quorum', quorum],
    ['authorship', { rung: 'sealed' }],
    ['judgments', { rung: 'after' }],
    ['applications', { apply: false }],
    ['admission', { price: 'assembly' }],
    ['removal', { price: 'consent' }],
    ['machines', { enabled: false, budget: 0 }],
    ['lapse', { afterMs: null }],
  ];
  for (const [id, v] of values) s.setSetting(1, id, v as never);
  s.begin(2);
  return s;
}

describe('promise 1 — nothing carries until Q of us have weighed in (§4.2, §8.2)', () => {
  it('at exactly the floor a text race adopts, and one approval short of it nothing moves — not on a judgment, not on a tick', () => {
    // E = 3 and a count of 2: F = max(min(2, ⌈3/2⌉), min(⌈3/3⌉, 12)) = 2, so
    // two of the three must have voted **for** it. The author's own derived
    // preference is one approval (§3.3), so one real judgment makes two.
    //
    // **The count was 3 until Q1439** (R-126) — *the whole room must have
    // moved* — and no quorum may ask for more than half now, so a count of 3
    // in a room of three is read as 2 and the shape below is one voice
    // shorter. What promise 1 says is unchanged: nothing carries until Q of
    // us have voted for it.
    const { s, bo } = buildConstituted({ quorum: { form: 'count', n: 2 } });
    expect(s.E()).toBe(3);
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'floor-exact' });
    expect(bridge.engine.adoptionFloor()).toBe(2);

    const v0 = bridge.engine.currentVersion();
    const { id, raceId } = bridge.proposeText(10, bo,
      patch(v0, ['The clubhouse shall be kept open every day.']), 'nights too');
    const race = () => bridge.engine.races().find((r) => r.id === raceId)!;
    expect(race().distinctMovers).toBe(1); // bo's own preference, and nobody else's
    expect(race().approvals).toBe(1);

    // one short of the floor: the document does not move — and a tick does
    // not quietly finish the job either
    expect(bridge.engine.document()).toBe('The clubhouse shall be kept open.');
    bridge.tick(21);
    expect(bridge.engine.document()).toBe('The clubhouse shall be kept open.');

    // exactly the floor — the engine tests `>=`, so F approvals is enough
    bridge.judge(30, 'ada', id, race().incumbentId, 'a');
    expect(bridge.engine.getCandidate(id).state).toBe('adopted');
    expect(bridge.engine.document()).toBe('The clubhouse shall be kept open every day.');
  });

  it('the statistical floor ⌈E/3⌉ carries a room that asked for less: at share 34 of 3, Q = 2 wins over the term 1', () => {
    // ⌈0.34 × 3⌉ = 2 against ⌈3/3⌉ = 1: the room's own number is the higher
    // of the two, so it is the one that binds.
    expect(quorumCount({ form: 'share', n: 34 }, 3)).toBe(2);
    expect(adoptionFloorTerm(3)).toBe(1);
    expect(adoptionFloor(2, 3, 12)).toBe(2);
    const { s } = buildConstituted({ quorum: { form: 'share', n: 34 } });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'floor-share-34' });
    expect(bridge.engine.adoptionFloor()).toBe(2);
  });

  it('and the term carries a room that asked for nothing: quorum unset reads Q = 0 and ⌈E/3⌉ still binds', () => {
    const { s } = buildConstituted();
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'floor-term' });
    // the engine's own reading of a null quorum (its constitution's field is
    // nullable even though §9.0a will not let a document begin without one)
    expect(adoptionFloor(0, 3, 12)).toBe(1);
    expect(adoptionFloor(0, 40, 12)).toBe(12); // F_max caps the term, never Q
    expect(bridge.engine.adoptionFloor()).toBe(2); // share 60 of 3
  });

  it('at E = 1 the sole member’s proposal carries at the submit — nobody is asked about their own text (backlog 253)', () => {
    // **Q835's exception overturned** (Ed, 2026-08-29). It used to be that
    // `comparisons > 0` held the adoption until a real judgment was cast,
    // which at E = 1 could only be the sole member's on their own race. An
    // author is now never served their own text against the incumbent, so
    // that judgment can never arrive — and there is nobody else to measure
    // anything. The derived preference is the floor *and* the room, and the
    // proposal adopts on submission.
    const s = buildSolo({ form: 'count', n: 1 });
    expect(s.E()).toBe(1);
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'solo-count' });
    expect(bridge.engine.adoptionFloor()).toBe(1);
    const v0 = bridge.engine.currentVersion();
    const { id, raceId } = bridge.proposeText(10, 'ada', patch(v0, ['Open always.']), '');
    expect(bridge.engine.document()).toBe('Open always.');
    expect(bridge.engine.getCandidate(id).state).toBe('adopted');
    // the race is decided, so there is nothing left of it to serve or judge
    expect(bridge.engine.races().find((r) => r.id === raceId)).toBeUndefined();
    expect(bridge.engine.feed('ada', 3, 11)).toHaveLength(0);
    bridge.tick(11); // and the clock has nothing to add
    expect(bridge.engine.document()).toBe('Open always.');
  });

  it('and at E = 1 a share of 100 is the same one voice — ⌈1.00 × 1⌉ = 1', () => {
    expect(quorumCount({ form: 'share', n: 100 }, 1)).toBe(1);
    const s = buildSolo({ form: 'share', n: 100 });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'solo-share' });
    expect(bridge.engine.adoptionFloor()).toBe(1);
    const v0 = bridge.engine.currentVersion();
    bridge.proposeText(10, 'ada', patch(v0, ['Open always.']), '');
    expect(bridge.engine.document()).toBe('Open always.');
  });

  it('the close applies the same floor: a race one approval short at T=0 is recorded undecided, never adopted (§4.6)', () => {
    // a count of 2 in a room of three is the capped floor (Q1439, R-126), and
    // the one approval the author's own preference makes is one short of it
    const { s, bo } = buildConstituted({ quorum: { form: 'count', n: 2 } });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'close-floor' });
    const v0 = bridge.engine.currentVersion();
    const { id, raceId } = bridge.proposeText(10, bo, patch(v0, ['Open always.']), '');
    const race = bridge.engine.races().find((r) => r.id === raceId)!;
    expect(race.approvals).toBe(1);
    expect(race.floor).toBe(2);

    const render = bridge.close(1_000_000);
    expect(render.applied).toEqual([]);
    expect(bridge.engine.document()).toBe('The clubhouse shall be kept open.');
    expect(bridge.engine.getCandidate(id).state).not.toBe('adopted');
    const undecided = bridge.engine.log.map((e) => e.event)
      .filter((e) => e.type === 'candidate-undecided')
      .map((e) => (e as { id: string }).id);
    expect(undecided).toContain(id);
  });
});

describe('promise 2 — the form never converts (§9.0a, Q341)', () => {
  /** A founding, founder alone with one invitee, 👥 still the founder's. */
  const founding = () => {
    const s = ConstitutionSession.open({
      title: 'Hollow Oak Club Charter', slug: 'hollow-oak',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    return { s, bo };
  };

  it('before the start the form is re-framed only while nothing has been said: a set closes it', () => {
    const { s } = founding();
    expect(s.quorumForm).toBe('share'); // the module's own opening frame
    s.setQuorumForm(2, 'count');
    expect(s.quorumForm).toBe('count');
    s.setSetting(2, 'quorum', { form: 'count', n: 2 });
    expect(() => s.setQuorumForm(3, 'share'))
      .toThrow('quorum is set — change it by setting a value in the new form');
  });

  it('and never while the question is collecting — an answer already given would change meaning', () => {
    const { s, bo } = founding();
    s.setQuorumForm(2, 'count');
    s.delegate(2, 'quorum');
    s.answer(3, bo, 'quorum', { form: 'count', n: 2 });
    expect(() => s.setQuorumForm(4, 'share'))
      .toThrow('the question is collecting in the current form — answers would change meaning');
  });

  it('an answer in the other form is accepted, and the settle keeps the one demanding the most voters (R-082, Q1162/Q1172)', () => {
    // two members, one answering as a count and one as a share: against the
    // electorate at the settle (E = 2), 1 member < ceil(60% × 2) = 2, so the
    // share answer wins — its form and its number both stand
    const { s, bo } = founding();
    s.delegate(2, 'quorum');
    s.answer(3, bo, 'quorum', { form: 'count', n: 1 });
    s.answer(4, 'ada', 'quorum', { form: 'share', n: 60 });
    const st = s.settingState('quorum');
    expect(st.value).toEqual({ form: 'share', n: 60 });
    // …and the promise is *no looser than what I accepted, judged when it
    // settles*: a member who asked for a count can end up bound by a share
  });

  it('after the start the frame cannot be re-set as a frame at all — `setQuorumForm` is pre-start only', () => {
    const { s } = buildConstituted({ quorum: { form: 'count', n: 2 } });
    expect(() => s.setQuorumForm(3, 'share'))
      .toThrow(/re-framing the quorum question/);
  });

  /**
   * **The gap.** `openMotion` validates a `set` of 👥 against `validateFor`
   * and nothing else, and `applyPayloadSet` writes `quorumFormValue` from
   * whatever carried. So a room asked *how many of you* can find itself
   * standing under *what share of you* with no act that names the change —
   * while the composer, which reads `S.quorumForm` to choose its field, has
   * no way to put the motion the fold accepts. Locked as it stands, not as
   * it should be: this is a finding, and the fix is its own plan.
   */
  it('but a live motion carries the other form with nothing checking it — the frame moves on a value (FINDING: promise 2, live)', () => {
    const { s, bo, cy } = buildConstituted({ quorum: { form: 'count', n: 2 } });
    expect(s.quorumForm).toBe('count');
    const m = s.openMotion(10, bo, { kind: 'set', setting: 'quorum', value: { form: 'share', n: 60 } });
    expect(s.motionRecords().get(m)!.route).toBe('constitutional');
    s.answerMotion(11, 'ada', m, 'accept');
    s.answerMotion(12, cy, m, 'accept');
    // 👥 is reserved to the founder in this fixture, so the room's unanimity
    // parks behind the 🛡️ — the point survives it: nothing on either leg
    // asks about the form.
    expect(s.motionRecords().get(m)!.status).toBe('awaiting-crown');
    const q = s.logEntries().map((e) => e.event)
      .find((e) => e.type === 'crown-question-opened' && e.motion === m) as { question: string };
    s.answerCrownQuestion(13, q.question, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.settingState('quorum').value).toEqual({ form: 'share', n: 60 });
    expect(s.quorumForm).toBe('share'); // re-framed, and no `quorum-form-set` in the log
    expect(s.logEntries().map((e) => e.event)
      .filter((e) => e.type === 'quorum-form-set').length).toBe(0);
  });

  it('and the founder’s own pen re-frames it the same way, alone (FINDING: promise 2, live)', () => {
    const { s } = buildConstituted({ quorum: { form: 'count', n: 2 } });
    // 👥 is constitutional, so the founder needs it back first — the point
    // is that once they hold it, nothing between the pen and the value
    // asks whether the room was asked this question in this form.
    s.setSetting(10, 'quorum', { form: 'share', n: 60 });
    expect(s.quorumForm).toBe('share');
  });
});

describe('promise 3 — a share is a share of who is here now (§9.3, §8.2)', () => {
  it('the floor rises with an arrival, falls with a removal, and falls with a lapse — re-derived, never stored', () => {
    // **Half, not 60** (Q1439, R-126): a share above 50 is refused at
    // validation now, and the engine would read it as half the room anyway,
    // which would mask the very tracking this promise is about. At 50 the
    // share and the cap coincide, so the floor moves on every *second*
    // arrival — which is why two arrive below.
    const { s, bo, cy } = buildConstituted({
      quorum: { form: 'share', n: 50 },
      admission: { price: 'pen' },
      doors: { remove: { unilateral: true, assent: false } },
      lapse: { afterMs: LAPSE_MS },
    });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'share-tracks' });
    const floorEvents = () => s.logEntries().map((e) => e.event)
      .filter((e) => e.type === 'floor-recomputed') as Array<{ E: number; quorumN: number | null }>;

    expect(s.E()).toBe(3);
    expect(bridge.engine.adoptionFloor()).toBe(2); // ⌈50 × 3 / 100⌉ = 2
    const before = floorEvents().length;

    // an arrival into an even room: ⌈50 × 4 / 100⌉ = 2, and the event is
    // written whether or not the number moved — the floor is re-derived, not
    // stored, which is what this promise is
    const dee = s.invite(10, 'dee@example.org');
    s.arrive(11, dee);
    bridge.sync(11);
    expect(s.E()).toBe(4);
    expect(bridge.engine.adoptionFloor()).toBe(2);
    expect(floorEvents().length).toBe(before + 1);
    expect(floorEvents().at(-1)).toMatchObject({ E: 4, quorumN: 2 });

    // and the next one raises it: ⌈50 × 5 / 100⌉ = 3
    const eve = s.invite(11, 'eve@example.org');
    s.arrive(12, eve);
    bridge.sync(12);
    expect(s.E()).toBe(5);
    expect(bridge.engine.adoptionFloor()).toBe(3);
    expect(floorEvents().at(-1)).toMatchObject({ E: 5, quorumN: 3 });

    // a removal: back to ⌈50 × 4 / 100⌉ = 2
    s.remove(13, eve);
    bridge.sync(13);
    expect(s.E()).toBe(4);
    expect(bridge.engine.adoptionFloor()).toBe(2);
    expect(floorEvents().at(-1)).toMatchObject({ E: 4, quorumN: 2 });
    // and dee out again, so the lapse below happens in the room of three the
    // fixture built
    s.remove(14, dee);
    bridge.sync(14);
    expect(s.E()).toBe(3);

    // a lapse: the same fall, by the clock rather than by a hand. bo has said
    // nothing since the founding, so the tick past the 💤 rule lapses them —
    // and nobody else, the other two having just acted.
    keepAlive(s, LAPSE_ALIVE, 'ada', cy);
    s.tick(LAPSE_TICK);
    bridge.sync(LAPSE_TICK);
    expect(s.memberRecords().get(bo)!.lapsed).toBe(true);
    expect(s.E()).toBe(2);
    // ⌈50 × 2 / 100⌉ = 1, and ⌈2/3⌉ = 1: the room of two asks for one either
    // way, which is also the cap (Q1439, R-126). The event records the raw
    // count the room's own number gives; what is capped is what the floor
    // *asks* for.
    expect(bridge.engine.adoptionFloor()).toBe(1);
    expect(floorEvents().at(-1)).toMatchObject({ E: 2, quorumN: 1 });
  });

  it('a count does not track the room, which is the whole difference between the two forms', () => {
    const { s } = buildConstituted({
      quorum: { form: 'count', n: 2 },
      admission: { price: 'pen' },
    });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'count-fixed' });
    expect(bridge.engine.adoptionFloor()).toBe(2);
    const dee = s.invite(10, 'dee@example.org');
    s.arrive(11, dee);
    bridge.sync(11);
    expect(s.E()).toBe(4);
    expect(bridge.engine.adoptionFloor()).toBe(2); // max(2, min(⌈4/3⌉=2, 12))
  });

  it('an invitation nobody has opened moves nothing: E counts arrivals, never invitees', () => {
    const { s } = buildConstituted({
      quorum: { form: 'share', n: 60 },
      admission: { price: 'pen' },
    });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'invited-only' });
    s.invite(10, 'dee@example.org');
    bridge.sync(10);
    expect(s.E()).toBe(3);
    expect(bridge.engine.adoptionFloor()).toBe(2);
  });
});

describe('promise 4 — the quorum never outgrows the room, and nothing stops (§9.5a, R-088 as amended by R-126)', () => {
  // Until v0.99 this promise read *the document stops*: a freeze, fed by
  // sign-out and by the lapse clock. Ed retired both (2026-09-06, Q1196) —
  // quorum is the adoption floor and only that, so a room that cannot reach
  // it held every race at the floor and held nothing else.
  //
  // **And since Q1439 it cannot fail to reach it either** (R-126, and §9.5a's
  // closing paragraph rewritten): a count-form quorum is read against the
  // group like a share, never more than half of it, so a room that shrinks
  // takes its quorum down with it. The old promise — *too few of us left and
  // nothing passes* — was the other face of the defect Q1439 closes: at a
  // quorum of 100 %, or at any count above the room, one absence held every
  // race for ever and not voting beat voting no. What survives is the half
  // that was never in doubt: **nothing stops.** Judging stays open, the
  // document neither freezes nor parks, and what carries is decided by the
  // people who are still here.

  it('a lapse that leaves one member takes the quorum down to that room, and the document goes on judging', () => {
    const { s, bo, cy } = buildConstituted({
      quorum: { form: 'count', n: 3 },
      lapse: { afterMs: LAPSE_MS },
    });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'lapse-floor' });
    const v0 = bridge.engine.currentVersion();
    const { id } = bridge.proposeText(10, bo, patch(v0, ['Open always.']), '');
    keepAlive(s, LAPSE_ALIVE, 'ada');
    expect(cy).toBeDefined();
    s.tick(LAPSE_TICK); // bo and cy have been quiet since the founding
    expect(s.E()).toBe(1);
    expect(s.canJudge()).toBe(true);                // nothing stops
    bridge.tick(LAPSE_TICK + 1);
    // a count of 3 in a room of one is read as ⌈1/2⌉ = 1 (Q1439, R-126); it
    // used to stand at 3 and hold every race for ever
    expect(bridge.engine.adoptionFloor()).toBe(1);
    // and it still does not carry — because **bo has lapsed**, so the one
    // approval it had, their own derived preference, is no longer cast (§8.2,
    // R-062): the room that is left has said nothing about it
    expect(bridge.engine.races().find((r) => r.members.includes(id))!.approvals).toBe(0);
    expect(bridge.engine.getCandidate(id).state).not.toBe('adopted');
    expect(bridge.engine.document()).toBe('The clubhouse shall be kept open.');
  });

  it('a removal does the same, at once — there is no window, because there is nothing to fire', () => {
    const { s, bo, cy } = buildConstituted({
      quorum: { form: 'count', n: 3 },
      doors: { remove: { unilateral: true, assent: false } },
    });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'remove-floor' });
    const v0 = bridge.engine.currentVersion();
    const { id } = bridge.proposeText(10, bo, patch(v0, ['Open always.']), '');
    s.remove(11, cy);
    expect(s.E()).toBe(2);
    expect(s.canJudge()).toBe(true);
    s.tick(12);                                     // the host's tick changes nothing either
    expect(s.canJudge()).toBe(true);
    bridge.tick(12);
    // a count of 3 in a room of two is read as ⌈2/2⌉ = 1 (Q1439, R-126)
    expect(bridge.engine.adoptionFloor()).toBe(1);
    // bo is still here and their own preference is one approval, which meets
    // that floor — and the race still waits, because **the room has not
    // measured it** (R-063): nobody but the author has judged it, and at E = 2
    // the author is not the room
    const race = bridge.engine.races().find((r) => r.members.includes(id))!;
    expect(race.approvals).toBe(1);
    expect(race.floor).toBe(1);
    expect(race.leaderMeasured).toBe(0);
    expect(bridge.engine.getCandidate(id).state).not.toBe('adopted');
    expect(bridge.engine.document()).toBe('The clubhouse shall be kept open.');
  });

  it('a document born asking for more members than it has asks half the room it has', () => {
    // count 5 with E = 3: it used to stand at 5 and the meaning line said
    // *nothing can pass until more members arrive*. Since Q1439 (R-126) it is
    // read as ⌈3/2⌉ = 2 — the room can decide its own text, at the highest
    // price ✏️ has — and the sentence that promised otherwise went with it.
    const { s, bo } = buildConstituted({ quorum: { form: 'count', n: 5 } });
    expect(s.canJudge()).toBe(true);
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'birth-floor' });
    expect(bridge.engine.adoptionFloor()).toBe(2);
    const v0 = bridge.engine.currentVersion();
    const { id } = bridge.proposeText(10, bo, patch(v0, ['Open always.']), '');
    s.tick(11);
    expect(s.canJudge()).toBe(true);
    bridge.tick(11);
    // one approval of two: still short, and the tick adds nothing
    expect(bridge.engine.getCandidate(id).state).not.toBe('adopted');
    expect(bridge.engine.document()).toBe('The clubhouse shall be kept open.');
    // and the second approval carries it — what the old promise said could
    // never happen until more members arrived
    bridge.judge(12, 'ada', id,
      bridge.engine.races().find((r) => r.members.includes(id))!.incumbentId, 'a');
    expect(bridge.engine.getCandidate(id).state).toBe('adopted');
    expect(bridge.engine.document()).toBe('Open always.');
  });
});

describe('promise 5 — the founding is not decided by quorum (§9.0a, R-015, R-049)', () => {
  it('a delegated question with one voice never resolves, whatever 👥 says — and 🍾 says so', () => {
    const s = ConstitutionSession.open({
      title: 'A Room of One', slug: 'room-of-one',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    s.setSetting(1, 'quorum', { form: 'count', n: 1 });
    s.setSetting(1, 'ending', { endsAtMs: 1_000_000 });
    // 🌍 is the delegated question; 🌡️ stood here until it left the surface
    // with a `retiredAnswer` (Q1362 (b), R-117) and stopped holding anything up
    s.delegate(1, 'chamber');
    s.answer(1, 'ada', 'chamber', { rung: 'link' });
    // one voice is not a room: the answer stands and the question does not
    expect(s.settingState('chamber').settledBy).toBeNull();
    const why = s.readiness().holds.find((h) => h.setting === 'chamber');
    expect(why?.why).toBe('one-voice');
    // and it is not a quorum shortfall wearing another name — a quorum of 1
    // is satisfied by the one answer, and the question still holds
    expect(quorumCount({ form: 'count', n: 1 }, 1)).toBe(1);
  });

  it('an invitation nobody has opened holds every question open, whatever the quorum is', () => {
    const s = ConstitutionSession.open({
      title: 'Hollow Oak Club Charter', slug: 'hollow-oak',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.invite(1, 'cy@example.org'); // invited, never arrived
    s.setSetting(1, 'quorum', { form: 'count', n: 1 });
    s.setSetting(1, 'ending', { endsAtMs: 1_000_000 });
    s.delegate(1, 'chamber');
    s.answer(2, 'ada', 'chamber', { rung: 'link' });
    s.answer(2, bo, 'chamber', { rung: 'public' });
    expect(s.settingState('chamber').settledBy).toBeNull();
    expect(s.readiness().holds.find((h) => h.setting === 'chamber')?.why).toBe('invitation-open');
  });
});

describe('promise 6 — a constitutional motion has no quorum either (§9.6)', () => {
  it('three members carry a 🏛️ motion with 👥 set at five — the electorate is the base, not the quorum', () => {
    const { s, bo, cy } = buildConstituted({ quorum: { form: 'count', n: 5 } });
    expect(s.E()).toBe(3);
    expect(quorumCount({ form: 'count', n: 5 }, 3)).toBe(5); // unreachable
    const m = s.openMotion(10, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    expect(s.motionRecords().get(m)!.route).toBe('constitutional');
    s.answerMotion(11, 'ada', m, 'accept');
    s.answerMotion(12, cy, m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.settingState('bar').value).toEqual({ pct: 80 });
  });

  it('and pure abstention carries nothing — the unanimity needs one standing accept', () => {
    const { s, bo, cy } = buildConstituted({ quorum: { form: 'count', n: 1 } });
    const m = s.openMotion(10, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    s.withdrawMotion(11, bo, m); // clear the mover's standing accept
    // …and put it again from a seat that then leaves the electorate
    const m2 = s.openMotion(12, bo, { kind: 'set', setting: 'bar', value: { pct: 81 } });
    s.answerMotion(13, 'ada', m2, 'abstain');
    s.answerMotion(14, cy, m2, 'abstain');
    // bo still stands at accept from the open, so this one carries
    expect(s.motionRecords().get(m2)!.status).toBe('carried');
  });
});

describe('the arithmetic behind every one of them', () => {
  it('a share of the room is the share rounded up, at every value the surface can state', () => {
    expect(quorumCount({ form: 'share', n: 60 }, 3)).toBe(2);
    expect(quorumCount({ form: 'share', n: 60 }, 4)).toBe(3);
    expect(quorumCount({ form: 'share', n: 100 }, 7)).toBe(7);
    expect(quorumCount({ form: 'share', n: 5 }, 40)).toBe(2);
    expect(quorumCount({ form: 'count', n: 3 }, 40)).toBe(3);
  });

  /**
   * **The gap, closed** (issue #24). `Math.ceil((n / 100) * E)` is not
   * ⌈n·E/100⌉: `28 / 100` is not representable in binary, and at E = 25 the
   * product lands a hair above 7, so the room told *28 % — 7 of 25* on the
   * card was held to 8 in the fold. `Math.ceil((n * E) / 100)` is the same
   * promise in the order that keeps it — for every share the surface can
   * state the product is a whole number, so the only rounding left is the one
   * §8.2 asks for.
   *
   * Whether the wrong number ever reached a race depended on the other term:
   * at E = 25 the floor is `max(Q, min(⌈25/3⌉ = 9, 12))`, so 28 % was masked
   * (9 either way) and **56 % was not** (15 against the promised 14) — which
   * is why it could sit undetected. That half is filed in
   * `packages/engine-core/test/adoption-threshold.test.ts`, which keeps its
   * own copy of the expression.
   */
  it('28 % of 25 is 7, and the fold says 7 (issue #24: the share arithmetic, all epochs)', () => {
    expect(quorumCount({ form: 'share', n: 28 }, 25)).toBe(7);
  });

  it('56 % of 25 is 14, and the fold says 14 (the same expression, the other value)', () => {
    expect(quorumCount({ form: 'share', n: 56 }, 25)).toBe(14);
  });

  /**
   * The twenty-seven pairs the old expression got wrong, none of them below
   * E = 25 and so none of them reachable by a Newspeak House cohort — but a
   * convention of a hundred states 7 % and is held to 8, and the design is
   * not to preclude those rooms (CLAUDE.md, *V1 product decisions*). One of
   * each distinct share is named here so a regression says which value moved
   * rather than only that the sweep grew.
   */
  it('and every pair the old rounding lost now reads the share exactly', () => {
    const table: [number, number, number][] = [
      // share, E, ⌈n·E/100⌉ — the smallest room at which each share went wrong
      [7, 100, 7],
      [14, 50, 7],
      [28, 25, 7],
      [34, 150, 51],
      [55, 100, 55],
      [56, 25, 14],
      [68, 75, 51],
      // and a handful the old expression already got right, unmoved
      [50, 25, 13],
      [33, 15, 5],
      [25, 8, 2],
      [100, 200, 200],
    ];
    for (const [n, E, want] of table) {
      expect([n, E, quorumCount({ form: 'share', n }, E)]).toEqual([n, E, want]);
    }
  });

  it('and the whole sweep is exact, to a room of two hundred', () => {
    const off: string[] = [];
    for (let n = 1; n <= 100; n++) {
      for (let E = 1; E <= 200; E++) {
        const exact = Math.ceil((n * E) / 100);
        if (quorumCount({ form: 'share', n }, E) !== exact) off.push(`${n}%×${E}`);
      }
    }
    expect(off).toEqual([]);
  });
});
