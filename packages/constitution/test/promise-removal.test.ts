/**
 * **Promise-coverage — 🥾 removal** (backlog entry 80, series 77). One setting:
 * what each price of leaving promises the room, and what stands behind it. One
 * `it` per promise the fold actually keeps, so a later change has to break a
 * named sentence. Promises the fold does *not* keep are **not** inverted into
 * green tests: they stand here as `it.fails`, named for the finding they wait
 * on, so the gap has something to turn green when somebody fixes it.
 *
 * **The rungs.** `consent` · `assembly` · `proposal` (catalogue `removal`,
 * entry 94's one price scale). No `pen` rung: exile at will is ❌'s ✒️, a door
 * power and not a price (§9.7 rule 9) — entry 79's, not this file's.
 *
 * ── the table: rung × holder state × epoch ────────────────────────────────
 *
 * **The fourth column, unset.** `priceOf('removal')` reads an unset value as
 * `consent` — a legacy log and a still-collecting delegated question both read
 * that way, so *unset* is not a fourth behaviour, it is the `consent` row.
 *
 * *Before 🍾 every cell is the same promise: **the price is not yet charged**.*
 * §9.6a — there are no past decisions for a removal to re-rate, so the founder
 * re-shapes the roster freely. `uninvite` asks nobody (`requirePreStart`);
 * `remove` asks nobody either, ❌'s pen being born held; `openMotion` refuses
 * outright (*before the start nothing is amended — only set*). The ❌ card says
 * so in its own words (*Until the document begins, taking somebody off the
 * list is yours alone*).
 *
 * *Live, the three rungs differ:*
 *
 * | rung | promised | enforced by | shown by |
 * | --- | --- | --- | --- |
 * | `consent` | everyone must agree, **including them** — one `keep` blocks | `motionExcludes` → null, so the subject is inside `maybeSettleMotions`'s electorate | ❌ card *every member has to agree — including them*; the ✓ lane on their own card |
 * | `assembly` | everyone **else** must agree; the subject sees it and is not asked | `motionExcludes(rec) === subject` → `answerMotion` refuses them, `maybeSettleMotions` drops them from the electorate | ❌ card *decided by everyone but you — you see it running*; `removalPending` under *Proposed for removal* |
 * | `proposal` | the membership decides at the bar, with quorum | `openMotion` routes `ordinary`, stake 1; `EngineBridge.sync` enters `remove:<id>` as a one-candidate race; `adjudicateOrdinaryMotion` reports the verdict | the ❌ card's judgment lane — **and this is where the surface half breaks**, see the `proposal` describe below |
 *
 * *Holder states.* Founder-held and set: the value stands, and the founder
 * re-prices by the pen (`setSetting`, `by: 'crown'`). Delegated and collecting:
 * no value, `priceOf` reads `consent`, and the only thing collecting changes is
 * that 🍾 is refused (§9.0b) — removal being a pre-start impossibility anyway.
 * Delegated and settled: the room's most-protective answer stands, re-priced
 * only by a 🏛️ motion. Both re-price roads are tested below.
 *
 * *After the close every cell is the same promise again* (§4.6): `remove`,
 * `resign`, `uninvite` and `openMotion` all pass `requireOpen`; a running
 * constitutional removal ends `kept-at-close`; a running `proposal` removal is
 * held or carried by the bridge's `finishClose` before the constitution closes.
 * A **perpetual** document has no third epoch at all, so a removal motion on
 * one can only ever end by settling, by withdrawal or by the freeze.
 *
 * *The two promises that hold whatever the rung*: the subject always sees a
 * removal proposed against them (X5 — `MemberRowView.removalPending`), and
 * anybody may leave at any time (`resign`, always at ✒️ — `doors.test.ts`
 * owns it, entry 79).
 *
 * *The route's own epoch.* `packages/server/src/commands.ts` puts `remove`
 * behind `founderOnly` and hands it to `cs.remove`, and `open-motion` hands
 * every non-`set` payload straight to `cs.openMotion` — so both epochs are
 * enforced in the fold, which is the right place, and the refusal reaches the
 * page as a 4xx. Nothing bypasses it; nothing filed.
 *
 * *Not duplicated here, because an existing test already locks it*:
 * `doors.test.ts` *without the pen, exile is refused — removal goes by 🥾*, *a
 * removed member's standing accept no longer counts*, *a carried removal waits
 * on the door's 🛡️*, and the resignation cases; `motions.test.ts` *a departure
 * can complete a motion — the removal cascade settles both* (which is also the
 * subject opening their own removal, the mover's own accept riding it) and *a
 * removal the member refuses stays blocked*.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { EngineBridge } from '../src/engine-bridge.js';
import { ParticipantApi } from '../../engine-core/src/participant-api.js';
import { view } from '../src/view.js';
import { buildConstituted } from './helpers.js';

/** A pre-start document: convenor ada, members bo and cy, both arrived. */
function preStart() {
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter',
    slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);
  const bo = s.invite(1, 'bo@example.org');
  const cy = s.invite(1, 'cy@example.org');
  s.arrive(1, bo);
  s.arrive(1, cy);
  return { s, bo, cy };
}

const openedEvent = (s: ConstitutionSession, motion: string) =>
  s.logEntries().map((e) => e.event)
    .find((e) => e.type === 'motion-opened' && e.motion === motion) as
    { type: 'motion-opened'; route: string; stake: number };

describe('🥾 before 🍾: the price is not yet charged, whatever it says (§9.6a)', () => {
  it('no rung lets a removal be proposed before the start', () => {
    for (const price of ['consent', 'assembly', 'proposal'] as const) {
      const { s, bo, cy } = preStart();
      s.setSetting(2, 'removal', { price });
      expect(() => s.openMotion(3, bo, { kind: 'remove', member: cy }))
        .toThrow(/before the start nothing is amended/);
    }
  });

  it('the founder’s two pre-start hands ask nobody — and one of them closes at 🍾', () => {
    const { s, bo, cy } = preStart();
    s.setSetting(2, 'removal', { price: 'consent' }); // the most protective rung
    // ❌'s pen is born held (§9.7 rule 9), so exile at will is already the
    // founder's before the start; `uninvite` is the other hand, and it is the
    // one that is pre-start only.
    s.remove(3, cy);
    expect(s.memberRecords().get(cy)!.removed).toBe(true);
    expect(s.memberRecords().get(cy)!.removedBy).toBe('convenor');
    s.uninvite(3, bo);
    expect(s.memberRecords().get(bo)!.removed).toBe(true);

    const live = buildConstituted();
    expect(() => live.s.uninvite(3, live.cy))
      .toThrow(/uninviting is pre-start only/);
  });
});

describe('🥾 consent — nobody is removed against their will (X5, the default and the unset read)', () => {
  it('delegated and collecting is not a fourth behaviour: no value, and 🍾 refused (§9.0b)', () => {
    const { s, bo, cy } = preStart();
    expect(s.settingState('removal').value).toBeNull();
    s.delegate(2, 'removal');
    expect(s.settingState('removal').collecting).toBe(true);
    expect(s.settingState('removal').value).toBeNull();
    // so the only thing a collecting 🥾 changes is that the document cannot
    // start — and before the start no removal is priced anyway
    expect(() => s.begin(3)).toThrow(/'removal'[\s\S]*still being decided/);
    expect(() => s.openMotion(3, bo, { kind: 'remove', member: cy }))
      .toThrow(/before the start nothing is amended/);
  });

  it('the subject’s **abstention** lets a consent removal carry — abstention is never a block (§9.6)', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'consent' } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    expect(s.motionRecords().get(m)!.route).toBe('constitutional');
    s.answerMotion(4, 'ada', m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('running'); // cy still owes
    s.answerMotion(5, cy, m, 'abstain');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.memberRecords().get(cy)!.removed).toBe(true);
    expect(s.memberRecords().get(cy)!.removedBy).toBe('members');
    expect(s.E()).toBe(2);
  });

  it('the subject is asked, and their `accept` is taken like anybody’s', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'consent' } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    // no `motionExcludes` at this rung: the subject answers on their own card
    s.answerMotion(4, cy, m, 'accept');
    expect(s.motionRecords().get(m)!.answers.get(cy)).toBe('accept');
    expect(s.motionRecords().get(m)!.status).toBe('running'); // ada still owes
    s.answerMotion(5, 'ada', m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
  });
});

describe('🥾 assembly — everyone else must agree; the subject sees it and is not asked (X5, Q401a)', () => {
  it('the subject’s answer is refused with the Q401a sentence', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'assembly' } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    expect(() => s.answerMotion(4, cy, m, 'keep'))
      .toThrow(/the subject of a removal is not asked on this route/);
    expect(() => s.answerMotion(4, cy, m, 'accept'))
      .toThrow(/they see it, and it settles without them/);
  });

  it('it carries on everyone else’s accept with the subject silent', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'assembly' } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy }); // bo's own accept
    expect(s.motionRecords().get(m)!.status).toBe('running');
    s.answerMotion(4, 'ada', m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.motionRecords().get(m)!.answers.has(cy)).toBe(false);
    expect(s.memberRecords().get(cy)!.removed).toBe(true);
    expect(s.memberRecords().get(cy)!.removedBy).toBe('members');
    expect(s.E()).toBe(2);
  });

  it('the subject always sees it: the motion is in their view, and their own row names it', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'assembly' } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    const v = view(s, cy);
    const mv = v.motions.find((x) => x.id === m)!;
    expect(mv.payload).toEqual({ kind: 'remove', member: cy });
    expect(mv.mine).toBe(false);
    expect(mv.status).toBe('running');
    expect(mv.myAnswer).toBeNull(); // seen, never asked
    expect(v.members.find((r) => r.id === cy)!.removalPending).toBe(m);
    expect(v.members.find((r) => r.id === bo)!.removalPending).toBeNull();
  });

  // ── the count, and the finding it waits on ──────────────────────────────
  // `view.ts` sets `MotionView.electorateSize` to `s.motionElectorate().length`
  // for *every* motion, and `answeredCount` to `rec.answers.size`; neither
  // knows about `motionExcludes`. The ❌ card happens to compute `E() - 1`
  // itself, so the surface reads right today — but the view's own contract is
  // one out for an `assembly` removal, and `answeredCount` counts an answer
  // that is outside the electorate. Filed; not fixed here.
  it.fails('🥾 assembly: `electorateSize` counts the subject the settle check drops', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'assembly' } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    const mv = view(s, bo).motions.find((x) => x.id === m)!;
    // the promise: n of m, where m is who actually decides it
    expect(mv.electorateSize).toBe(2);
  });

  it.fails('🥾 assembly: `answeredCount` counts the subject’s own opening accept, which decides nothing', () => {
    const { s, cy } = buildConstituted({ removal: { price: 'assembly' } });
    // a member asking to go: the mover's accept is emitted whatever the rung,
    // and at `assembly` the mover is outside their own motion's electorate
    const m = s.openMotion(3, cy, { kind: 'remove', member: cy });
    const mv = view(s, 'ada').motions.find((x) => x.id === m)!;
    expect(mv.answeredCount).toBe(0);
  });
});

describe('🥾 proposal — the membership decides at the bar (Q401a)', () => {
  it('the motion routes ordinary and stakes one ✏️', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'proposal' } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    expect(s.motionRecords().get(m)!.route).toBe('ordinary');
    expect(openedEvent(s, m).stake).toBe(1);
    // no answer is emitted on the ordinary route: it is judged, not answered
    expect(s.motionRecords().get(m)!.answers.size).toBe(0);
  });

  it('it is judged as a race, never answered', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'proposal' } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    expect(() => s.answerMotion(4, 'ada', m, 'accept'))
      .toThrow(/an ordinary motion is judged as a race, not answered/);
    expect(() => s.answerMotion(4, cy, m, 'keep'))
      .toThrow(/an ordinary motion is judged as a race, not answered/);
  });

  it('the fold’s half of the verdict is sound whoever reports it', () => {
    const carried = buildConstituted({ removal: { price: 'proposal' } });
    const mc = carried.s.openMotion(3, carried.bo, { kind: 'remove', member: carried.cy });
    carried.s.adjudicateOrdinaryMotion(4, mc, 'carried');
    expect(carried.s.motionRecords().get(mc)!.status).toBe('carried');
    expect(carried.s.memberRecords().get(carried.cy)!.removed).toBe(true);
    expect(carried.s.E()).toBe(2);

    const held = buildConstituted({ removal: { price: 'proposal' } });
    const mh = held.s.openMotion(3, held.bo, { kind: 'remove', member: held.cy });
    held.s.adjudicateOrdinaryMotion(4, mh, 'held');
    expect(held.s.motionRecords().get(mh)!.status).toBe('held');
    expect(held.s.memberRecords().get(held.cy)!.removed).toBe(false);
    expect(held.s.E()).toBe(3);
  });

  /**
   * **The race is entered** — the reading the plan carried (that nothing puts
   * a removal into the engine) is wrong, and it is wrong because the bridge is
   * *log-driven*, not call-driven: `commands.ts` `open-motion` does send only
   * set-motions through `bridge.openSetMotion`, but `cs.openMotion` emits
   * `motion-opened`, and `EngineBridge.sync` — which every commit runs via
   * `driveBridge` → `bridge.tick` — reads that event and calls the private
   * `enterRemovalRace` itself. So the race exists, the ✏️ is really staked,
   * and `finishClose` sees the motion in `motionOfCandidate` at the close.
   */
  it('the bridge enters `remove:<id>` as its own one-candidate race, the admit race’s mirror', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'proposal' } });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'promise-removal' });
    const m = s.openMotion(4, bo, { kind: 'remove', member: cy }, 'the clubhouse keys were never returned');
    bridge.sync(5);
    const races = bridge.engine.races()
      .filter((r) => String(r.settingId).startsWith('remove:'));
    expect(races.map((r) => r.settingId)).toEqual([`remove:${cy}`]);
    expect(races[0]!.members).toHaveLength(1); // never raced against anything else
    expect(s.motionRecords().get(m)!.status).toBe('running');
  });

  /**
   * **Q401(b) stays open, and today nothing stops them.** The subject is an
   * ordinary engine participant while their own removal races, so the router
   * serves them the pair like anybody. This test records what the code does;
   * it does not settle the question — see the report's *Questions for Ed*.
   */
  it('the subject is served their own removal’s judgment like anybody (Q401b, unsettled)', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'proposal' } });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'promise-removal' });
    s.openMotion(4, bo, { kind: 'remove', member: cy });
    bridge.sync(5);
    const servesIt = (who: string) =>
      new ParticipantApi(bridge.engine, who).nextCards(10, 5)
        .some((c) => [c.a, c.b].some((o) =>
          (o as { setting?: { settingId: string } }).setting?.settingId === `remove:${cy}`));
    expect(servesIt('ada')).toBe(true);
    expect(servesIt(cy)).toBe(true);
  });

  /**
   * **The judgment cannot be sent.** The served card is real; the page cannot
   * find it. `liveJudge` looks the race up by `midOf(card.k)` — and `MID` maps
   * the ❌ card's key `remove` to the *door* id `door:remove`, where the
   * engine's race is `remove:<member>`. So `raceCardOf` returns undefined, the
   * press logs `[live] no race card served for door:remove` and the judgment
   * is dropped, while the page marks the card answered. Filed; the fold half
   * above is what this file locks, and the surface half is the finding.
   */
  it('the fold and the engine agree on the race id — `remove:<member>`, not `door:remove`', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'proposal' } });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'promise-removal' });
    s.openMotion(4, bo, { kind: 'remove', member: cy });
    bridge.sync(5);
    const ids = bridge.engine.races().map((r) => r.settingId).filter(Boolean);
    expect(ids).toContain(`remove:${cy}`);
    expect(ids).not.toContain('door:remove');
  });
});

describe('🥾 re-priced mid-motion: the route is fixed, the electorate is not (X5, entry 97)', () => {
  it('a re-price to `consent` puts the subject back into a running motion’s electorate', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'assembly' } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy }); // bo's own accept
    // the founder re-prices by the pen: an amendment, `by: 'crown'`
    s.setSetting(4, 'removal', { price: 'consent' });
    s.answerMotion(5, 'ada', m, 'accept');
    // under `assembly` that was unanimity; under `consent` cy is owed
    expect(s.motionRecords().get(m)!.status).toBe('running');
    expect(s.motionRecords().get(m)!.route).toBe('constitutional'); // never moved

    // and the mirror: back to `assembly` and the same answers are enough —
    // but **the settle check does not re-run on a re-price**, so it waits for
    // the next act to nudge it. That latency is filed as a finding.
    s.setSetting(6, 'removal', { price: 'assembly' });
    expect(s.motionRecords().get(m)!.status).toBe('running');
    s.answerMotion(7, bo, m, 'accept'); // bo re-affirms: any settle trigger will do
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.memberRecords().get(cy)!.removed).toBe(true);
  });

  it.fails('🥾: a re-pricing that makes a running removal unanimous does not settle it there and then', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'consent' } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    s.answerMotion(4, 'ada', m, 'accept'); // cy silent, so `consent` still waits
    expect(s.motionRecords().get(m)!.status).toBe('running');
    s.setSetting(5, 'removal', { price: 'assembly' }); // cy leaves the electorate
    // the promise: what stands is read live, so the motion is now unanimous
    expect(s.motionRecords().get(m)!.status).toBe('carried');
  });

  it('a re-price to or from `proposal` never moves a motion already put', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'proposal' } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    expect(s.motionRecords().get(m)!.route).toBe('ordinary');
    s.setSetting(4, 'removal', { price: 'consent' });
    expect(s.motionRecords().get(m)!.route).toBe('ordinary');
    expect(s.motionRecords().get(m)!.status).toBe('running');
    // still judged, never answered: the act stands under the rule it was put under
    expect(() => s.answerMotion(5, 'ada', m, 'accept'))
      .toThrow(/an ordinary motion is judged as a race/);
    s.adjudicateOrdinaryMotion(6, m, 'carried');
    expect(s.memberRecords().get(cy)!.removed).toBe(true);
  });

  it('the room’s own road back: 🥾 is re-priced by a 🏛️ motion when it is the members’', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'consent' } });
    s.relinquish(3, 'removal', 'unilateral');
    s.relinquish(3, 'removal', 'assent');
    expect(() => s.setSetting(4, 'removal', { price: 'proposal' }))
      .toThrow(/not the convenor's to set/);
    const m = s.openMotion(5, bo, { kind: 'set', setting: 'removal', value: { price: 'proposal' } });
    expect(s.motionRecords().get(m)!.route).toBe('constitutional');
    s.answerMotion(6, 'ada', m, 'accept');
    s.answerMotion(6, cy, m, 'accept');
    expect(s.settingState('removal').value).toEqual({ price: 'proposal' });
  });
});

describe('🥾 whatever the rung: what a departure takes with it (§9.3)', () => {
  it('a standing `keep` leaves with the member, and the motion it blocked carries in the same beat', () => {
    const { s, bo, cy } = buildConstituted({
      doors: { remove: { unilateral: true, assent: false } } });
    const m1 = s.openMotion(3, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    s.answerMotion(4, 'ada', m1, 'accept');
    s.answerMotion(5, cy, m1, 'keep');
    expect(s.motionRecords().get(m1)!.status).toBe('running');
    s.remove(6, cy); // ❌'s pen
    expect(s.motionRecords().get(m1)!.status).toBe('carried');
    // **the record keeps what was said**: the electorate filter is the promise,
    // not the erasure of the answer
    expect(s.motionRecords().get(m1)!.answers.get(cy)).toBe('keep');
  });

  it('and the same by a carried `assembly` removal, not only by the pen', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'assembly' } });
    const m1 = s.openMotion(3, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
    s.answerMotion(4, 'ada', m1, 'accept');
    s.answerMotion(5, cy, m1, 'keep');
    // one 🏛️ out per member at a time, so the removal is ada's to put
    const m2 = s.openMotion(6, 'ada', { kind: 'remove', member: cy });
    s.answerMotion(7, bo, m2, 'accept');
    expect(s.motionRecords().get(m2)!.status).toBe('carried');
    expect(s.motionRecords().get(m1)!.status).toBe('carried');
    expect(s.motionRecords().get(m1)!.answers.get(cy)).toBe('keep');
  });

  it('a founding answer goes too: uninvited pre-start, the question resolves on the rest', () => {
    const { s, bo, cy } = preStart();
    s.delegate(1, 'chamber');
    s.answer(2, bo, 'chamber', { rung: 'link' });
    s.answer(2, 'ada', 'chamber', { rung: 'public' });
    expect(s.settingState('chamber').value).toBeNull(); // cy still owes
    s.uninvite(3, cy);
    expect(s.settingState('chamber').value).toEqual({ rung: 'link' });
  });
});

describe('🥾 after the close nothing changes but the signing (§4.6)', () => {
  it('every road out refuses, and a running removal is kept at the close', () => {
    const { s, bo, cy } = buildConstituted({ removal: { price: 'consent' },
      doors: { remove: { unilateral: true, assent: false } } });
    const m = s.openMotion(3, bo, { kind: 'remove', member: cy });
    s.tick(1_000_000); // past the ending buildConstituted's ceremony took
    expect(s.closed).toBe(true);
    expect(s.motionRecords().get(m)!.status).toBe('kept-at-close');
    expect(s.memberRecords().get(cy)!.removed).toBe(false);

    expect(() => s.remove(1_000_001, cy)).toThrow(/the document has closed/);
    expect(() => s.resign(1_000_001, cy)).toThrow(/the document has closed/);
    expect(() => s.uninvite(1_000_001, cy)).toThrow(/the document has closed/);
    expect(() => s.openMotion(1_000_001, bo, { kind: 'remove', member: cy }))
      .toThrow(/the document has closed/);
  });
});
