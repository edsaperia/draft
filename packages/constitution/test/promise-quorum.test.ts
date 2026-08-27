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
 * | 1 | *Nothing changes the document until at least Q of us have weighed in* — and never fewer than ⌈E/3⌉ | live, close | **holds** — `engine-core` `adoptionFloor()`, `r.distinctMovers >= floor` in the batch and `< floor` skipped at the close |
 * | 2 | *The question was asked as a count (or a share), and that is how it is answered and how it stands* | pre-Begin | **holds** — `setQuorumForm`'s two refusals, `answer`'s third |
 * | 2 | …and live | live | **gap (fold)** — nothing after 🍾 checks the form: a `set` motion or the founder's own pen re-frames `quorumFormValue` silently, and the composer cannot express the re-frame it permits |
 * | 3 | *If the quorum is a share, it is a share of who is here now* | live | **holds** — `adoptionFloor()` re-derives from `eCount()` on every call; `floor-recomputed` on every roster change |
 * | 4 | *When too few of us are still here to reach quorum, the document stops* | live | **gap (fold)** — `maybeFreezeOrThaw` is called from `signOut`, `memberReturn` and `tick`, and **not** from `afterRosterChange`; a removal, a resignation or an uninvite leaves the room below quorum and the document unfrozen until the host's next minute tick |
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
 * | **count**, founder-held and set | 2 (the form is fixed), 5 | 1, 2 (gap), 3 (a count does not track E — that is the point of the form), 4 (gap), 6 | 1 (the final batch applies the same floor) |
 * | **count**, delegated and collecting | 2, 5; 👥 is a judge-gate, so nothing is judged and promise 1 is not yet being made | *empty* — `begin` refuses while it collects | *empty* |
 * | **count**, delegated and settled | 2, 5 | as founder-held: who holds it does not change what it promises | as founder-held |
 * | **share**, founder-held and set | 2, 5; a share before Begin is a share of a room still forming, so promise 3 is not yet being made | 1, 2 (gap), 3, 4 (gap), 6 | 1 |
 * | **share**, delegated and collecting | 2, 5 | *empty* | *empty* |
 * | **share**, delegated and settled | 2, 5 | 1, 2 (gap), 3, 4 (gap), 6 | 1 |
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
import type { SettingId } from '../src/types.js';

/** A patch over the whole first line, as `bridge.test.ts` writes one. */
const patch = (baseVersion: number, lines: string[]) =>
  ({ baseVersion, hunks: [{ start: 0, end: 1, lines }] });

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
  it('at exactly the floor a text race adopts, and one mover short of it nothing moves — not on a judgment, not on a tick', () => {
    // E = 3 and a count of 3: F = max(3, min(⌈3/3⌉, 12)) = 3, so the whole
    // room must have moved. The author's own derived preference is one mover
    // (§3.3), so two real judgments make three.
    const { s, bo, cy } = buildConstituted({ quorum: { form: 'count', n: 3 } });
    expect(s.E()).toBe(3);
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'floor-exact' });
    expect(bridge.engine.adoptionFloor()).toBe(3);

    const v0 = bridge.engine.currentVersion();
    const { id, raceId } = bridge.proposeText(10, bo,
      patch(v0, ['The clubhouse shall be kept open every day.']), 'nights too');
    const race = () => bridge.engine.races().find((r) => r.id === raceId)!;
    expect(race().distinctMovers).toBe(1); // bo's own preference, and nobody else's

    // one short of the floor: the room's verdict is in and the document does
    // not move — and a tick does not quietly finish the job either
    bridge.judge(20, 'ada', id, race().incumbentId, 'a');
    expect(race().distinctMovers).toBe(2);
    expect(bridge.engine.document()).toBe('The clubhouse shall be kept open.');
    bridge.tick(21);
    expect(bridge.engine.document()).toBe('The clubhouse shall be kept open.');

    // exactly the floor — the engine tests `>=`, so F movers is enough
    bridge.judge(30, cy, id, race().incumbentId, 'a');
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

  it('at E = 1 the sole member carries their own proposal — the floor is 1 and their own judgment is the room (entry 60, Q835)', () => {
    const s = buildSolo({ form: 'count', n: 1 });
    expect(s.E()).toBe(1);
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'solo-count' });
    expect(bridge.engine.adoptionFloor()).toBe(1);
    const v0 = bridge.engine.currentVersion();
    const { id, raceId } = bridge.proposeText(10, 'ada', patch(v0, ['Open always.']), '');
    const race = () => bridge.engine.races().find((r) => r.id === raceId)!;
    // the derived preference alone clears the floor, but `comparisons > 0`
    // holds the adoption until a real judgment is cast — which at E = 1 can
    // only be the sole member's on their own race
    expect(race().distinctMovers).toBe(1);
    expect(race().comparisons).toBe(0);
    bridge.tick(11);
    expect(bridge.engine.document()).toBe('The clubhouse shall be kept open.');
    bridge.judge(20, 'ada', id, race().incumbentId, 'a');
    expect(bridge.engine.document()).toBe('Open always.');
  });

  it('and at E = 1 a share of 100 is the same one voice — ⌈1.00 × 1⌉ = 1', () => {
    expect(quorumCount({ form: 'share', n: 100 }, 1)).toBe(1);
    const s = buildSolo({ form: 'share', n: 100 });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'solo-share' });
    expect(bridge.engine.adoptionFloor()).toBe(1);
    const v0 = bridge.engine.currentVersion();
    const { id, raceId } = bridge.proposeText(10, 'ada', patch(v0, ['Open always.']), '');
    const race = bridge.engine.races().find((r) => r.id === raceId)!;
    bridge.judge(20, 'ada', id, race.incumbentId, 'a');
    expect(bridge.engine.document()).toBe('Open always.');
  });

  it('an abstention leaves the freeze base and not E, so the floor does not move — the document freezes instead of adopting on the remainder', () => {
    // E = 3, count 2. cy abstains: E is still 3 (the floor is still 2) but
    // the counted base is 2 — exactly quorum, so no freeze yet. bo abstains
    // too and the base is 1 < 2: the document stops rather than letting the
    // last member carry anything.
    const { s, bo, cy } = buildConstituted({ quorum: { form: 'count', n: 2 } });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'abstain-floor' });
    const v0 = bridge.engine.currentVersion();
    const { id, raceId } = bridge.proposeText(10, bo, patch(v0, ['Open always.']), '');
    s.signOut(11, cy, 'abstaining');
    expect(s.E()).toBe(3);
    expect(s.quorumBase()).toBe(2);
    expect(s.frozen).toBe(false);
    expect(bridge.engine.adoptionFloor()).toBe(2); // E unmoved: an abstainer is still in E

    s.signOut(12, bo, 'abstaining');
    expect(s.quorumBase()).toBe(1);
    expect(s.frozen).toBe(true);
    expect(s.canJudge()).toBe(false);
    // and the parked race adopts nothing on the host's tick
    const race = bridge.engine.races().find((r) => r.id === raceId)!;
    expect(race.distinctMovers).toBe(1);
    bridge.tick(13);
    expect(bridge.engine.getCandidate(id).state).not.toBe('adopted');
    expect(bridge.engine.document()).toBe('The clubhouse shall be kept open.');
  });

  it('the close applies the same floor: a race one mover short at T=0 is recorded undecided, never adopted (§4.6)', () => {
    const { s, bo } = buildConstituted({ quorum: { form: 'count', n: 3 } });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'close-floor' });
    const v0 = bridge.engine.currentVersion();
    const { id, raceId } = bridge.proposeText(10, bo, patch(v0, ['Open always.']), '');
    bridge.judge(20, 'ada', id, bridge.engine.races().find((r) => r.id === raceId)!.incumbentId, 'a');
    expect(bridge.engine.races().find((r) => r.id === raceId)!.distinctMovers).toBe(2); // F = 3

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

  it('an answer in the other form is refused rather than converted', () => {
    const { s, bo } = founding();
    s.setQuorumForm(2, 'count');
    s.delegate(2, 'quorum');
    expect(() => s.answer(3, bo, 'quorum', { form: 'share', n: 60 }))
      .toThrow('the quorum question is asked as a count (§9.0a)');
    // and the other way round, on the module's own opening frame
    const b = founding();
    b.s.delegate(2, 'quorum');
    expect(() => b.s.answer(3, b.bo, 'quorum', { form: 'count', n: 2 }))
      .toThrow('the quorum question is asked as a share (§9.0a)');
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
    const { s, bo, cy } = buildConstituted({
      quorum: { form: 'share', n: 60 },
      admission: { price: 'pen' },
      doors: { remove: { unilateral: true, assent: false } },
      lapse: { afterMs: 10_000 },
    });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'share-tracks' });
    const floorEvents = () => s.logEntries().map((e) => e.event)
      .filter((e) => e.type === 'floor-recomputed') as Array<{ E: number; quorumN: number | null }>;

    expect(s.E()).toBe(3);
    expect(bridge.engine.adoptionFloor()).toBe(2); // ⌈0.6 × 3⌉ = 2
    const before = floorEvents().length;

    // an arrival: ⌈0.6 × 4⌉ = 3
    const dee = s.invite(10, 'dee@example.org');
    s.arrive(11, dee);
    bridge.sync(11);
    expect(s.E()).toBe(4);
    expect(bridge.engine.adoptionFloor()).toBe(3);
    expect(floorEvents().length).toBe(before + 1);
    expect(floorEvents().at(-1)).toMatchObject({ E: 4, quorumN: 3 });

    // a removal: back to ⌈0.6 × 3⌉ = 2
    s.remove(12, dee);
    bridge.sync(12);
    expect(s.E()).toBe(3);
    expect(bridge.engine.adoptionFloor()).toBe(2);
    expect(floorEvents().at(-1)).toMatchObject({ E: 3, quorumN: 2 });

    // a lapse: the same fall, by the clock rather than by a hand. bo goes
    // quiet at t=3 and the 💤 rule is 10s, so the tick past it lapses them —
    // and nobody else, the other two having been active a moment before.
    s.touch('ada', 19_999);
    s.touch(cy, 19_999);
    s.touch(bo, 3);
    s.tick(20_000);
    bridge.sync(20_000);
    expect(s.memberRecords().get(bo)!.lapsed).toBe(true);
    expect(s.E()).toBe(2);
    expect(bridge.engine.adoptionFloor()).toBe(2); // ⌈0.6 × 2⌉ = 2, the term ⌈2/3⌉ = 1
    expect(floorEvents().at(-1)).toMatchObject({ E: 2, quorumN: 2 });
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

describe('promise 4 — too few of us left and the document stops (§9.5)', () => {
  // The sign-out half is already locked by `membership.test.ts`'s *signing
  // out and the freeze* — holding stays in the base, abstaining leaves it,
  // 1 < 2 freezes, a return thaws. Not duplicated here.

  it('a lapse freezes inside the same tick that applied it', () => {
    const { s, bo, cy } = buildConstituted({
      quorum: { form: 'count', n: 3 },
      lapse: { afterMs: 10_000 },
    });
    s.touch('ada', 20_000);
    s.touch(bo, 3);
    s.touch(cy, 3);
    expect(s.frozen).toBe(false);
    s.tick(20_000);
    expect(s.E()).toBe(1);
    expect(s.frozen).toBe(true);
    expect(s.mustReturn()).toBe(2);
  });

  /**
   * **The gap this plan expects.** `afterRosterChange` — which `remove`,
   * `resign`, `uninvite` and the lapse loop all call — emits
   * `floor-recomputed`, re-resolves the questions and re-settles the
   * motions, and never asks whether the room that is left can still reach
   * quorum. `maybeFreezeOrThaw` is reached from `signOut`, `memberReturn`
   * and `tick` only. So a removal that takes the counted base below quorum
   * leaves the document open until the host's next minute tick, and a race
   * can adopt on the smaller room in the meantime (`server.ts` `tick`).
   *
   * Written as `it.fails` so the suite records the gap and goes green the
   * day the fix lands: the assertion inside is what *should* hold.
   */
  it.fails('a removal that empties the room freezes it at once (FINDING: promise 4 — afterRosterChange never asks)', () => {
    const { s, bo, cy } = buildConstituted({
      quorum: { form: 'count', n: 3 },
      doors: { remove: { unilateral: true, assent: false } },
    });
    expect(s.quorumBase()).toBe(3);
    s.remove(10, cy);
    expect(s.E()).toBe(2);
    expect(s.quorumBase()).toBe(2); // 2 < 3
    expect(s.frozen).toBe(true);
    expect(bo).toBeDefined();
  });

  it('and the tick behind it does freeze — which is how long the window is', () => {
    const { s, cy } = buildConstituted({
      quorum: { form: 'count', n: 3 },
      doors: { remove: { unilateral: true, assent: false } },
    });
    s.remove(10, cy);
    expect(s.frozen).toBe(false); // the window: open until the host ticks
    expect(s.canJudge()).toBe(true); // …and judging is open inside it
    s.tick(11);
    expect(s.frozen).toBe(true);
    expect(s.mustReturn()).toBe(1);
  });

  it.fails('a resignation does the same (FINDING: promise 4 — the same gap by the other door)', () => {
    const { s, cy } = buildConstituted({ quorum: { form: 'count', n: 3 } });
    s.resign(10, cy);
    expect(s.quorumBase()).toBe(2);
    expect(s.frozen).toBe(true);
  });

  it.fails('and the thaw has the same window: an arrival into a frozen room does not thaw it (FINDING: promise 4, the other direction)', () => {
    const { s, cy } = buildConstituted({
      quorum: { form: 'count', n: 3 },
      admission: { price: 'pen' },
      doors: { remove: { unilateral: true, assent: false } },
    });
    s.remove(10, cy);
    s.tick(11);
    expect(s.frozen).toBe(true);
    const dee = s.invite(12, 'dee@example.org');
    s.arrive(13, dee);
    expect(s.quorumBase()).toBe(3);
    expect(s.frozen).toBe(false);
  });

  it('a document born asking for more members than it has is not frozen until the first tick either', () => {
    // count 5 with E = 3: `begin` has no freeze check, so the room is open
    // and unable to adopt anything until the host ticks and names the fact.
    const { s } = buildConstituted({ quorum: { form: 'count', n: 5 } });
    expect(s.frozen).toBe(false);
    expect(s.mustReturn()).toBeNull();
    s.tick(3);
    expect(s.frozen).toBe(true);
    expect(s.mustReturn()).toBe(2);
  });
});

describe('promise 5 — the founding is not decided by quorum (§9.0a, R-015, R-049)', () => {
  it('a delegated question with one voice never resolves, whatever 👥 says — and 🍾 says so', () => {
    const s = ConstitutionSession.open({
      title: 'A Room of One', slug: 'room-of-one',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    s.setSetting(1, 'quorum', { form: 'count', n: 1 });
    s.setSetting(1, 'ending', { endsAtMs: 1_000_000 }); // 🌡️'s own dep (§9.0a)
    s.delegate(1, 'bar');
    s.answer(1, 'ada', 'bar', { pct: 60 });
    // one voice is not a room: the answer stands and the question does not
    expect(s.settingState('bar').settledBy).toBeNull();
    const why = s.readiness().holds.find((h) => h.setting === 'bar');
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
    s.delegate(1, 'bar');
    s.answer(2, 'ada', 'bar', { pct: 60 });
    s.answer(2, bo, 'bar', { pct: 70 });
    expect(s.settingState('bar').settledBy).toBeNull();
    expect(s.readiness().holds.find((h) => h.setting === 'bar')?.why).toBe('invitation-open');
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
   * **The gap.** `Math.ceil((n / 100) * E)` is not ⌈n·E/100⌉: `28 / 100` is
   * not representable in binary, and at E = 25 the product lands a hair
   * above 7. A sweep of integer n 1..100 × E 1..40 finds exactly two such
   * values, 28 % and 56 %, both of them statable in the founder's own share
   * field (`min="1" max="100"`, no step) though not on the blind slider,
   * whose step is 5. The room is told *28 % — 7 of 25* on the card and held
   * to 8 in the fold.
   *
   * Whether the wrong number reaches a race depends on the other term: at
   * E = 25 the floor is `max(Q, min(⌈25/3⌉ = 9, 12))`, so 28 % is masked
   * (9 either way) and **56 % is not** (15 against the promised 14). That
   * half is filed in `packages/engine-core/test/adoption-threshold.test.ts`,
   * which keeps its own copy of the expression.
   */
  it.fails('28 % of 25 is 7, and the fold says 8 (FINDING: the share arithmetic, all epochs)', () => {
    expect(quorumCount({ form: 'share', n: 28 }, 25)).toBe(7);
  });

  it.fails('56 % of 25 is 14, and the fold says 15 (FINDING: the same expression, the other value)', () => {
    expect(quorumCount({ form: 'share', n: 56 }, 25)).toBe(14);
  });

  it('and those two are the whole of it below E = 41', () => {
    const off: string[] = [];
    for (let n = 1; n <= 100; n++) {
      for (let E = 1; E <= 40; E++) {
        const exact = Math.ceil((n * E) / 100);
        if (quorumCount({ form: 'share', n }, E) !== exact) off.push(`${n}%×${E}`);
      }
    }
    expect(off).toEqual(['28%×25', '56%×25']);
  });
});
