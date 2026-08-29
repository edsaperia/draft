/**
 * **Promise-coverage — the holder itself** (backlog entry 93, series 77, batch
 * L, the cross-cutting one). Not a setting but the promise **every delegable
 * setting makes** about who holds it: enumerate the holder states, state each
 * one's promise to the room, find the enforcement in the fold and on the
 * surface across all three epochs, lock what holds and name what does not.
 * **This file fixes nothing.** Where it locks behaviour the audit calls a gap,
 * the `it` says so in its own name and its comment names the finding, so the
 * lock fails the day either side of the disagreement moves without the other.
 *
 * The states are `Powers` (`types.ts`) read through `holderOf`: the convenor's
 * iff either power is held. So there are four, not three — the two one-power
 * rows of SPEC §9.7's table sit between *convenor decides* and *delegated* —
 * and a fifth state that is not about powers at all: **held and unset**, the
 * one design rule 4 (CLAUDE.md, closing Q511) is about.
 *
 * Representative settings: 🌍 `chamber` — delegable, constitutional, a
 * **judge-gate**, no deps — and ⏱️ `rate` / 🤖 `machines` — delegable,
 * ordinary, **not** gates. The pair is the point: the gate cannot survive 🍾
 * unset and the non-gate can, which is finding 2.
 *
 * ## The enumeration — the state, its promise, and the epochs
 *
 * Fold = the method that keeps or breaks it. **holds** · **gap**.
 *
 * | state | powers | the promise, in the room's words | before 🍾 | live | closed |
 * | --- | --- | --- | --- | --- | --- |
 * | **delegated** | — / — | *the room's answer binds, and the founder cannot speak for them* | **holds** — `delegate` emits `setting-delegated` (`collecting: true`, value cleared); `setSetting` throws *reclaim it first*; `answer` → `maybeResolve` → `resolveConsent` takes the maximum; `begin` refuses while it collects | **holds** — post-start `delegate` is a hand-over (`setting-handed-over`), value stands, holder moves; `setSetting` throws *not the convenor's to set*; the room motions it at its own route | **holds** — `requireOpen` refuses `delegate`, `setSetting` and `openMotion` alike |
 * | **held, both** | ✒️ 🛡️ | *the founder's word, and a change the room passes waits on them* | **holds** — the pen sets it freely; nothing is amended pre-start (§9.6a) | **holds** — pen direct (`by: 'crown'`); a carried motion parks at a 👑 question (`reservedTarget` reads `powers.assent`) | **holds** |
 * | **held, pen only** | ✒️ — | *the founder may amend at will; what the room passes lands by itself* | **holds** | **holds** — `reservedTarget` false, `applyPayloadSet` lands it with nobody asked (`powers.test.ts:134`) | **holds** |
 * | **held, shield only** | — 🛡️ | *the room proposes, the founder answers* | **holds** | **holds** — `setSetting` throws *the unilateral power is given up; propose like a member*; carried → 👑 | **holds** |
 * | **held and unset** | ✒️ 🛡️ | ***nothing yet** — it is not a decision and must not count as one* | **holds** — `settledBy: null`, `value: null`, `collecting: false`, in no `readiness().questions` row; a **judge-gate** blocks 🍾 with `why: 'judge-gate'` | **gap (fold)** — a **non-gate** survives 🍾 unset, and the founder's hand can then come off it: finding 2 | **holds** — nothing moves |
 *
 * ## The five findings
 *
 * 1. **A holder change is not news** — ***half built, entry 162***. SPEC §9.7
 *    rule 3: *Laying a power down is news: every member is owed an
 *    acknowledgement of it, as of a changed rule.* `relinquish` emitted
 *    `power-relinquished` and called `oweOks` never — filed as Q918 by the
 *    seat matrix (E9, `seat-matrix.mjs`'s header: *`relinquish` owes no OK and
 *    the page files no news*). **Built 2026-08-29** (Ed's entry 162 ruling,
 *    Q1013): a release is owed as a *batch* — everything one act laid down is
 *    one news entry and one OK — through `oweReleases` / `ackRelease` and the
 *    member's own `releasesOwed`, not through `okOwed`, which is about a
 *    value. The `it` below states the built rule rather than the gap.
 *    Q918 itself stands: it asks how E9's *audience* cell should be written,
 *    and the build takes the reading that costs one predicate to reverse.
 *    The unfiled half is still the **hand-over**: post-start `delegate` moves
 *    a constitutional setting from the founder's hand to the room's and emits
 *    `setting-handed-over` alone, so nobody is told the rule changed hands.
 *    Locked below.
 *
 * 2. **Held-and-unset survives the start, and the founder's hand can then come
 *    off it for ever.** Two halves that only bite together. `waitingWith`
 *    holds the start on `st.collecting || (e.judgeGate && st.settledBy ===
 *    null)`, so a **non-gate** — ⏱️ 🤖 🥾 🪪 🤝 — begins unset, and
 *    `toEngineConstitution` then substitutes a default the room never chose
 *    (`adapter.ts:121`, `grant: 4, cap: 8, dripMinutes: 240` for an unset ⏱️).
 *    Then: `relinquish`'s *a setting nobody has set has nothing to hand over*
 *    guard (SPEC §9.7 rule 3) is inside `if (this.constitutedT === null)`
 *    (`session.ts:1176`), so post-start **both** powers may be laid down on an
 *    unset setting — and post-start `delegate` does it with no guard at all.
 *    The result is unsettable by anybody: `setSetting` refuses (*the members'*),
 *    `openMotion` refuses (*has no settled value to move against*), `reclaim`
 *    is pre-start only. The only road out is a constitutional `reserve`
 *    motion — unanimity, to undo a single free act. Locked below.
 *
 * 3. **A delegation strands the acknowledgement it made owing.** A
 *    constitutional setting the founder sets pre-start owes every arrived
 *    member an OK; delegating it afterwards clears `value`, `settledBy` and
 *    `distribution` in the `setting-delegated` fold and leaves `okOwed`
 *    untouched — so the member's rail carries a receipt for a decision that no
 *    longer stands, on a setting now collecting a blind question about it.
 *    Locked below.
 *
 * 4. **SPEC §9.6a and `setSetting` disagree about the pre-start epoch.** §9.6a:
 *    *A constitutional setting set or changed **after the start** is owed an
 *    acknowledgement … the convenor's re-setting before the start is owed
 *    nothing.* `setSetting` owes on `CONSTITUTIONAL.has(setting) || changed`
 *    with no epoch test (`session.ts:1070`), and `founding.test.ts:264` locks
 *    the pre-start owing as intended behaviour — so the code and CLAUDE.md's
 *    *were you here when it was set?* agree with each other and the spec
 *    sentence stands alone. Recorded, not fixed.
 *
 * 5. **The remedy for an invitation-blocked question does not work.** A blind
 *    question does not resolve while any invitation is outstanding, and
 *    `maybeResolve`'s own comment (`session.ts:1387`) names the founder's
 *    remedy: *an invitation that will never be opened can simply be
 *    withdrawn.* `uninvite` runs `afterRosterChange` — and so
 *    `maybeResolveAll` — only `if (wasInE)`, and an invitee is in E only once
 *    they have **arrived** (`populations.ts`), so withdrawing the very thing
 *    that was blocking the resolution runs no resolution check. The question
 *    stays collecting, 🍾 stays refused, and `readiness` stops even saying
 *    *invitation-open* — until some later answer or roster event happens to
 *    nudge it through. Locked below.
 *
 * ## The surface, read by inspection
 *
 * `design/session-view.html` cannot be imported from here — it is a page, and
 * `spec-check` reads it as source text — so the surface half of design rule 4
 * is read rather than executed, and what the **fold** owes it is locked below
 * instead (the three states are distinguishable in `view()`'s projection).
 * What was read, at HEAD:
 *
 * · `hydrateS`'s `byOf` (`:7104`) — `del(mid) ? 'roster' : (st && st.settledBy
 *   !== null) ? 'founder' : ''`, with `del` (`:7090`) `holder === 'members'`.
 *   Held-and-unset reads `''`, the undecided the page starts every radio at.
 *   This is design rule 4's regression guard and it is intact. Its four
 *   consumers are `S.barBy`/`S.quorumBy`/`S.rateBy`/`S.policyBy`.
 * · `delegateRung` (`:4690`) — returns `''` unless `cs.constitutedAtT === null`
 *   (one-way after the start) and writes the value group's own state key, so
 *   there is no second radiogroup (Q771).
 * · `holderLine` (`:4121`) — silent on a members-held setting; otherwise joins
 *   the powers actually held, with a second sentence for pending releases.
 * · `membersHold` (`:2238`) reads `csState(c.k).holder`, falling back to the
 *   provisional `isRoom` only where the module holds no state for the key;
 *   `wasAsked` keys the watch-half on `collecting || distribution !== null`,
 *   which is what keeps a post-start hand-over from drawing a question that
 *   never ran.
 *
 * Cites rather than duplicates: `powers.test.ts` (pre-start revisability, the
 * pending release spent at 🍾, unilateral-only landing unasked, the reserve
 * naming one power, delegation-by-relinquish and its symmetry),
 * `founding.test.ts:251` (never on one voice), `:264` (owed OKs), `:302` (📯),
 * `begin.test.ts:63`/`:110`/`:138` (the pending release, a non-gate question
 * blocking, the reclaim releasing), `motions.test.ts:318`/`:366` (the 👑 at the
 * end of the ordinary route; the road back). Entries 86–92 own each setting's
 * own value promise; this file owns only the machinery under all of them.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { CATALOGUE, type SettingId } from '../src/catalogue.js';
import { DOORS, holderOf, type PowerKey } from '../src/types.js';
import { DEFAULT_TUNING, toEngineConstitution } from '../src/adapter.js';
import { view } from '../src/view.js';
import { buildConstituted } from './helpers.js';

const MANAGED: SettingId[] = CATALOGUE
  .filter((e) => e.kind !== 'personal' && e.id !== 'startingText')
  .map((e) => e.id);
const HELD: PowerKey[] = [...MANAGED, 'startingText', ...DOORS];

const thrown = (fn: () => unknown): string => {
  try { fn(); return '(nothing was thrown)'; } catch (e) { return (e as Error).message; }
};

/** Convenor ada (a member), bo and cy arrived, nothing set. */
function preStart() {
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter', slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);
  const bo = s.invite(1, 'bo@example.org');
  const cy = s.invite(1, 'cy@example.org');
  s.arrive(1, bo);
  s.arrive(1, cy);
  return { s, bo, cy };
}

/** Everything a start needs, by the pen, leaving `skip` untouched. */
function penEverything(s: ConstitutionSession, t: number, skip: SettingId[] = []): void {
  const values: Record<string, unknown> = {
    ending: { endsAtMs: 1_000_000 },
    bar: { pct: 60 },
    pace: { shape: 'fixed' },
    quorum: { form: 'share', n: 60 },
    authorship: { rung: 'sealed' },
    judgments: { rung: 'after' },
    chamber: { rung: 'public' },
    lapse: { afterMs: null },
    rate: { grant: 4, cap: 8, dripMinutes: 240 },
    machines: { enabled: false, budget: 0 },
    admission: { price: 'assembly' },
    applications: { apply: false },
    removal: { price: 'consent' },
  };
  for (const [id, v] of Object.entries(values)) {
    if (skip.includes(id as SettingId)) continue;
    s.setSetting(t, id as SettingId, v as never);
  }
}

/**
 * A begun document holding every audience case the release news has to sort:
 * ada the convenor and a member, bo and cy arrived, dee invited and never
 * here, ez arrived for 🍾 and removed afterwards. The founder keeps both
 * doors, so ❌'s pen is there to remove with.
 */
function liveRoom() {
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter', slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);
  const bo = s.invite(1, 'bo@example.org');
  const cy = s.invite(1, 'cy@example.org');
  const dee = s.invite(1, 'dee@example.org');
  const ez = s.invite(1, 'ez@example.org');
  s.arrive(1, bo);
  s.arrive(1, cy);
  s.arrive(1, ez);
  s.confirmStartingText(2, 'The clubhouse shall be kept open.');
  penEverything(s, 2);
  s.begin(3);            // 🍾 lays the Text's pair down: one batch to all three
  s.remove(3, ez);
  return { s, bo, cy, dee, ez };
}

/* ========================================================================= *
 * 0. The states themselves
 * ========================================================================= */

describe('the holder is derived, never stored (§9.7, types.ts)', () => {
  it('is the convenor\'s iff either power is held — all four rows of the table', () => {
    expect(holderOf({ unilateral: true, assent: true })).toBe('convenor');
    expect(holderOf({ unilateral: true, assent: false })).toBe('convenor');
    expect(holderOf({ unilateral: false, assent: true })).toBe('convenor');
    expect(holderOf({ unilateral: false, assent: false })).toBe('members');
  });

  it('nothing arrives delegated, and nothing arrives set (§9.0a, Q511)', () => {
    const { s } = preStart();
    for (const id of HELD) {
      const st = s.settingState(id);
      expect(st.holder, id).toBe('convenor');
      expect(st.powers, id).toEqual({ unilateral: true, assent: true });
      expect(st.powerFrom, id).toEqual({ unilateral: 'founding', assent: 'founding' });
      expect(st.pendingRelease, id).toEqual({ unilateral: false, assent: false });
      expect(st.collecting, id).toBe(false);
      // 🪶 and 📍 are the two the creation itself answers — the title the
      // founder typed and the address they reserved — and they arrive
      // convenor-**set**, not convenor-unset. Every other setting is unset.
      if (id === 'title' || id === 'link') {
        expect(st.settledBy, id).toBe('convenor');
        expect(st.value, id).not.toBeNull();
      } else {
        expect(st.settledBy, id).toBeNull();
        expect(st.value, id).toBeNull();
      }
    }
  });
});

/* ========================================================================= *
 * 1. Delegated — the blind question, and the room's answer binding
 * ========================================================================= */

describe('delegated: the blind question opens and the room\'s answer binds', () => {
  it('delegating pre-start opens the question and discards the founder\'s own value', () => {
    const { s } = preStart();
    s.setSetting(1, 'chamber', { rung: 'closed' });
    expect(s.settingState('chamber').value).toEqual({ rung: 'closed' });
    s.delegate(1, 'chamber');
    const st = s.settingState('chamber');
    expect(st.holder).toBe('members');
    expect(st.powers).toEqual({ unilateral: false, assent: false });
    expect(st.collecting).toBe(true);
    // the founder's word is not a standing answer to the room's question
    expect(st.value).toBeNull();
    expect(st.settledBy).toBeNull();
    expect(st.distribution).toBeNull();
  });

  it('the answer that binds is the maximum under the setting\'s protective order', () => {
    const { s, bo, cy } = preStart();
    s.delegate(1, 'chamber');
    s.answer(1, bo, 'chamber', { rung: 'link' });
    s.answer(1, cy, 'chamber', { rung: 'public' });
    expect(s.settingState('chamber').settledBy).toBeNull(); // not everyone yet
    s.answer(1, 'ada', 'chamber', { rung: 'public' });
    const st = s.settingState('chamber');
    expect(st.settledBy).toBe('ceremony');
    expect(st.value).toEqual({ rung: 'link' }); // the most protective stated
    expect(st.collecting).toBe(false);
    expect(st.holder).toBe('members'); // resolving does not hand it back
    expect(st.distribution).toEqual([{ rung: 'link' }, { rung: 'public' }, { rung: 'public' }]);
  });

  it('never on one voice: a delegation to a room of one collects for ever (§9.0a)', () => {
    const s = ConstitutionSession.open({
      title: 'Alone', slug: 'alone',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    s.delegate(1, 'chamber');
    s.answer(1, 'ada', 'chamber', { rung: 'public' });
    expect(s.settingState('chamber').collecting).toBe(true);
    expect(s.settingState('chamber').settledBy).toBeNull();
    expect(s.readiness().holds).toContainEqual({ setting: 'chamber', why: 'one-voice' });
  });

  it('never while an invitation is out — an unopened email holds the resolution', () => {
    const s = ConstitutionSession.open({
      title: 'Waiting', slug: 'waiting',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    const cy = s.invite(1, 'cy@example.org'); // invited, never arrives
    s.delegate(1, 'chamber');
    s.answer(1, 'ada', 'chamber', { rung: 'public' });
    s.answer(1, bo, 'chamber', { rung: 'public' });
    expect(s.settingState('chamber').collecting).toBe(true);
    expect(s.readiness().holds).toContainEqual({ setting: 'chamber', why: 'invitation-open' });
    // ---- finding 5 ----
    // §9.6a's own remedy, quoted in `maybeResolve` (session.ts:1387): *an
    // invitation that will never be opened can simply be withdrawn*. It does
    // not release the question. `uninvite` calls `afterRosterChange` — and so
    // `maybeResolveAll` — only `if (wasInE)`, and an invitee is in E only once
    // they have arrived (`populations.ts`), so withdrawing the one thing that
    // was blocking the resolution runs no resolution check at all.
    s.uninvite(1, cy);
    expect(s.settingState('chamber').collecting).toBe(true);
    expect(s.settingState('chamber').settledBy).toBeNull();
    expect(s.readiness().holds).toContainEqual({ setting: 'chamber', why: 'collecting' });
    // any later event nudges it through — here a member re-stating their answer
    s.answer(1, bo, 'chamber', { rung: 'public' });
    expect(s.settingState('chamber').settledBy).toBe('ceremony');
  });

  it('the founder cannot answer for the room — they must reclaim, and that clears the answers', () => {
    const { s, bo } = preStart();
    s.delegate(1, 'chamber');
    s.answer(1, bo, 'chamber', { rung: 'link' });
    expect(thrown(() => s.setSetting(1, 'chamber', { rung: 'public' })))
      .toBe("'chamber' is delegated — reclaim it first (§9.0a)");
    s.reclaim(1, 'chamber');
    const st = s.settingState('chamber');
    expect(st.holder).toBe('convenor');
    expect(st.collecting).toBe(false);
    expect([...st.answers]).toEqual([]); // the question is withdrawn, not paused
    expect(thrown(() => s.answer(1, bo, 'chamber', { rung: 'link' })))
      .toBe("'chamber' is not collecting answers");
    s.setSetting(1, 'chamber', { rung: 'public' });
    expect(s.settingState('chamber').settledBy).toBe('convenor');
  });

  // **…except on a setting that has left the surface, which 🍾 answers on the
  // way through** (Ed, 2026-08-29, entry 259; §9.0b as amended, → why: R-080).
  // 🤖's card went with backlog 251 and the setting stayed in the catalogue for
  // replay, so a founder who had delegated it held a question no member could
  // be served and no card could reclaim: the start refused for ever. The
  // catalogue's `retiredAnswer` is what 🍾 resolves it at, once, its empty
  // electorate the record that nobody answered. What this file used to lock
  // here — that a collecting non-gate blocks the start — is still true of every
  // setting that has a card, and `begin.test.ts`'s Q626 trio locks it.
  it('a question on a retired setting is answered by 🍾, not waited on (§9.0b, entry 259)', () => {
    const { s } = preStart();
    s.confirmStartingText(2, 'The clubhouse shall be kept open.');
    penEverything(s, 2, ['machines']);
    expect(s.readiness().ready).toBe(true);
    s.delegate(2, 'machines'); // ordinary, not a gate — and no card since 251
    expect(s.settingState('machines').collecting).toBe(true);
    const r = s.readiness();
    expect(r.holds).toEqual([]);
    expect(r.ready).toBe(true);
    expect(r.questions.map((q) => q.setting)).not.toContain('machines');
    s.begin(2);
    const st = s.settingState('machines');
    expect(st.collecting).toBe(false);
    expect(st.value).toEqual({ enabled: false, budget: 0 });
    expect(st.settledBy).toBe('ceremony');
    // the line, immediately before the start that wrote it — what follows
    // `constituted` is the release news 🍾's own batch owes (entry 162)
    const log = s.logEntries().map((e) => e.event);
    const at = log.findIndex((e) => e.type === 'constituted');
    expect(log[at - 1]).toEqual({ type: 'question-resolved', t: 2, setting: 'machines',
      value: { enabled: false, budget: 0 }, distribution: [], electorate: [] });
    // and settled it is still no row on the 🍾 card: it has no card to name
    expect(s.readiness().questions.map((q) => q.setting)).not.toContain('machines');
  });

  it('post-start the same verb is a hand-over: the value stands, only the holder moves', () => {
    const { s } = buildConstituted();
    expect(s.settingState('lapse').settledBy).toBe('convenor');
    s.delegate(3, 'lapse');
    const st = s.settingState('lapse');
    expect(st.holder).toBe('members');
    expect(st.value).toEqual({ afterMs: null });   // the value stands (§9.7 rule 2)
    expect(st.settledBy).toBe('convenor');          // and remembers whose word it was
    expect(st.collecting).toBe(false);              // no question is opened after the start
    expect(st.powerFrom).toEqual({ unilateral: null, assent: null });
    // one-way (X10): the road back is the room's, never the founder's
    expect(thrown(() => s.reclaim(3, 'lapse')))
      .toBe('reclaiming is pre-start only — after the start it is a motion (§9.6a)');
    expect(thrown(() => s.setSetting(3, 'lapse', { afterMs: 60_000 })))
      .toBe("'lapse' is the members' — not the convenor's to set (§9.7)");
    s.delegate(3, 'lapse'); // idempotent: already theirs
    expect(s.settingState('lapse').holder).toBe('members');
  });
});

/* ========================================================================= *
 * 2. The four power rows of SPEC §9.7's table, live
 * ========================================================================= */

describe('the pen and the shield mean what §9.7\'s table says (entry 34, built)', () => {
  /** A live document whose 🤖 (ordinary, founder-held, set) wears `powers`. */
  function live(lay: Array<'unilateral' | 'assent'>) {
    const built = buildConstituted();
    for (const p of lay) built.s.relinquish(3, 'machines', p);
    return built;
  }

  it('convenor decides (✒️ 🛡️): the pen sets it, and what the room passes waits', () => {
    const { s, bo } = live([]);
    s.setSetting(3, 'machines', { enabled: true, budget: 5 });
    expect(s.settingState('machines').settledBy).toBe('crown'); // post-start pen
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'machines', value: { enabled: false, budget: 0 } });
    expect(s.motionRecords().get(m)!.route).toBe('ordinary');
    s.adjudicateOrdinaryMotion(3, m, 'carried');
    expect(s.motionRecords().get(m)!.status).toBe('awaiting-crown');
    expect(s.settingState('machines').value).toEqual({ enabled: true, budget: 5 });
    const q = [...s.crownQuestionRecords().keys()][0]!;
    s.answerCrownQuestion(3, q, 'reject');
    expect(s.motionRecords().get(m)!.status).toBe('held');
    expect(s.settingState('machines').value).toEqual({ enabled: true, budget: 5 });
  });

  it('convenor decides, room decides too (✒️ —): a carried change lands with nobody asked', () => {
    const { s, bo } = live(['assent']);
    expect(s.settingState('machines').powers).toEqual({ unilateral: true, assent: false });
    expect(s.settingState('machines').holder).toBe('convenor');
    s.setSetting(3, 'machines', { enabled: true, budget: 5 }); // the pen still works
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'machines', value: { enabled: false, budget: 0 } });
    s.adjudicateOrdinaryMotion(3, m, 'carried');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.settingState('machines').value).toEqual({ enabled: false, budget: 0 });
    expect(s.crownQuestionRecords().size).toBe(0);
  });

  it('room proposes, convenor answers (— 🛡️): the pen is refused by name, the shield still parks it', () => {
    const { s, bo } = live(['unilateral']);
    expect(s.settingState('machines').holder).toBe('convenor'); // a shield alone is still a hand
    expect(thrown(() => s.setSetting(3, 'machines', { enabled: true, budget: 5 })))
      .toBe("'machines' — the unilateral power is given up; propose like a member (§9.7 v0.54)");
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'machines', value: { enabled: true, budget: 5 } });
    s.adjudicateOrdinaryMotion(3, m, 'carried');
    expect(s.motionRecords().get(m)!.status).toBe('awaiting-crown');
    const q = [...s.crownQuestionRecords().keys()][0]!;
    s.answerCrownQuestion(3, q, 'accept');
    expect(s.settingState('machines').value).toEqual({ enabled: true, budget: 5 });
    expect(s.settingState('machines').settledBy).toBe('crown');
  });

  it('delegated (— —): the pen is refused as the members\', and the change lands by itself', () => {
    const { s, bo } = live(['unilateral', 'assent']);
    expect(s.settingState('machines').holder).toBe('members');
    expect(thrown(() => s.setSetting(3, 'machines', { enabled: true, budget: 5 })))
      .toBe("'machines' is the members' — not the convenor's to set (§9.7)");
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'machines', value: { enabled: true, budget: 5 } });
    s.adjudicateOrdinaryMotion(3, m, 'carried');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.settingState('machines').settledBy).toBe('motion');
  });

  it('a crown that has lapsed grants its own assent — nothing changes hands (§9.7 rule 6)', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 60_000 } });
    const t = 60_100;
    s.tick(t); // everybody goes quiet past the rule, the founder included
    expect(s.crowned()).toBe(true); // the powers are still theirs…
    s.memberReturn(t, bo);          // …the members log back in, the founder does not
    s.memberReturn(t, cy);
    const m = s.openMotion(t, bo,
      { kind: 'set', setting: 'machines', value: { enabled: true, budget: 5 } });
    s.adjudicateOrdinaryMotion(t, m, 'carried');
    expect(s.motionRecords().get(m)!.status).toBe('carried'); // no 👑 question opened
    expect(s.crownQuestionRecords().size).toBe(0);
    expect(s.settingState('machines').value).toEqual({ enabled: true, budget: 5 });
    expect(s.settingState('machines').powers).toEqual({ unilateral: true, assent: true });
  });
});

/* ========================================================================= *
 * 3. Held and unset — *nothing yet* (design rule 4, Q511)
 * ========================================================================= */

describe('held and unset is nothing yet, and no fold path counts it as settled', () => {
  it('the three states are told apart in the fold and survive view()\'s projection', () => {
    const { s, bo } = preStart();
    s.setSetting(1, 'lapse', { afterMs: null });  // held and set
    s.delegate(1, 'chamber');                     // delegated
    // …and `rate` is left alone: held and unset
    const rows = new Map(view(s, bo).settings.map((r) => [r.setting, r]));
    expect(rows.get('lapse')).toMatchObject({ holder: 'convenor', settledBy: 'convenor', collecting: false });
    expect(rows.get('lapse')!.value).not.toBeNull();
    expect(rows.get('chamber')).toMatchObject({ holder: 'members', settledBy: null, collecting: true, value: null });
    expect(rows.get('rate')).toMatchObject({ holder: 'convenor', settledBy: null, collecting: false, value: null });
    // this is exactly what `hydrateS`'s `byOf` reads: delegated → 'roster',
    // held-and-`settledBy` → 'founder', held-and-unset → '' (design rule 4)
    const byOf = (id: SettingId) => {
      const r = rows.get(id)!;
      return r.holder === 'members' ? 'roster' : r.settledBy !== null ? 'founder' : '';
    };
    expect([byOf('chamber'), byOf('lapse'), byOf('rate')]).toEqual(['roster', 'founder', '']);
  });

  it('a held-unset setting is in no readiness question, settled or collecting', () => {
    const { s } = preStart();
    // `readiness().questions` is the founder's own readout, and it lists a
    // setting only where a question ran or is running — never a held one.
    expect(s.readiness().questions).toEqual([]);
    s.delegate(1, 'chamber');
    expect(s.readiness().questions.map((q) => q.setting)).toEqual(['chamber']);
  });

  it('a held-unset judge-gate blocks 🍾 by name, and the pen releases it', () => {
    const { s } = preStart();
    s.confirmStartingText(2, 'The clubhouse shall be kept open.');
    penEverything(s, 2, ['chamber']);
    expect(s.readiness().holds).toEqual([{ setting: 'chamber', why: 'judge-gate' }]);
    expect(s.readiness().ready).toBe(false);
    expect(thrown(() => s.begin(2))).toMatch(/cannot begin while 'chamber' is still being decided/);
    s.setSetting(2, 'chamber', { rung: 'public' });
    expect(s.readiness().ready).toBe(true);
  });

  // ---- finding 2 -------------------------------------------------------
  it('FINDING: a held-unset NON-gate walks through 🍾, and the engine takes a default nobody chose', () => {
    const { s } = preStart();
    s.confirmStartingText(2, 'The clubhouse shall be kept open.');
    penEverything(s, 2, ['rate']);
    // `waitingWith` holds only on `collecting || (judgeGate && unsettled)`,
    // and ⏱️ is neither — so a document begins with no rule about its own
    // proposal wallets at all.
    expect(s.readiness().holds).toEqual([]);
    s.begin(2);
    expect(s.settingState('rate').value).toBeNull();
    expect(s.settingState('rate').settledBy).toBeNull();
    // …and the adapter substitutes the tuning's own numbers (adapter.ts:121)
    const out = toEngineConstitution(s, DEFAULT_TUNING, 'seed');
    expect(out.constitution).toMatchObject({ tokenGrant: 4, tokenCap: 8, tokenDripMinutes: 240 });
  });

  it('FINDING: post-start the founder may lay both powers down on an unset setting, and nobody can ever set it', () => {
    const { s, bo, cy } = preStart();
    s.confirmStartingText(2, 'The clubhouse shall be kept open.');
    penEverything(s, 2, ['machines']);
    // pre-start the guard SPEC §9.7 rule 3 states is enforced…
    expect(thrown(() => s.relinquish(2, 'machines', 'unilateral')))
      .toBe("'machines' has no value yet — a power can only be laid down once the setting is set (§9.7)");
    s.begin(2);
    // …and after the start it is not: the check sits inside the pre-start
    // branch of `relinquish` (session.ts:1176), so both powers go.
    s.relinquish(3, 'machines', 'unilateral');
    s.relinquish(3, 'machines', 'assent');
    expect(s.settingState('machines').holder).toBe('members');
    expect(s.settingState('machines').value).toBeNull();
    // the setting is now beyond every route: the pen, the motion and the reclaim
    expect(thrown(() => s.setSetting(3, 'machines', { enabled: true, budget: 5 })))
      .toBe("'machines' is the members' — not the convenor's to set (§9.7)");
    expect(thrown(() => s.openMotion(3, bo,
      { kind: 'set', setting: 'machines', value: { enabled: true, budget: 5 } })))
      .toBe("'machines' has no settled value to move against");
    expect(thrown(() => s.reclaim(3, 'machines')))
      .toBe('reclaiming is pre-start only — after the start it is a motion (§9.6a)');
    // the one road out is unanimity, to undo one free act of the founder's
    const m = s.openMotion(3, bo, { kind: 'reserve', setting: 'machines', power: 'unilateral' });
    s.answerMotion(3, cy, m, 'accept');
    s.answerMotion(3, 'ada', m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.settingState('machines').powerFrom.unilateral).toBe('motion');
    s.setSetting(3, 'machines', { enabled: true, budget: 5 });
    expect(s.settingState('machines').value).toEqual({ enabled: true, budget: 5 });
  });

  it('FINDING: post-start `delegate` reaches the same dead end with no guard at all', () => {
    const { s, bo } = preStart();
    s.confirmStartingText(2, 'The clubhouse shall be kept open.');
    penEverything(s, 2, ['machines']);
    s.begin(2);
    s.delegate(3, 'machines'); // §9.7 rule 2 promises *the value stands*…
    expect(s.settingState('machines').holder).toBe('members');
    expect(s.settingState('machines').value).toBeNull(); // …and there was none
    expect(thrown(() => s.openMotion(3, bo,
      { kind: 'set', setting: 'machines', value: { enabled: true, budget: 5 } })))
      .toBe("'machines' has no settled value to move against");
  });
});

/* ========================================================================= *
 * 4. The pen and the shield through the epochs (entry 34, built)
 * ========================================================================= */

describe('relinquishing: revisable before 🍾, one-way after it (R-048, X10)', () => {
  it('a pre-start release is pending, changes nothing, and does not hold the start', () => {
    const { s } = preStart();
    s.confirmStartingText(2, 'The clubhouse shall be kept open.');
    penEverything(s, 2);
    s.relinquish(2, 'rate', 'unilateral');
    const st = s.settingState('rate');
    expect(st.pendingRelease).toEqual({ unilateral: true, assent: false });
    expect(st.powers).toEqual({ unilateral: true, assent: true }); // still theirs
    expect(st.holder).toBe('convenor');
    s.setSetting(2, 'rate', { grant: 5, cap: 8, dripMinutes: 240 }); // and still usable
    expect(s.readiness().holds).toEqual([]);
    s.begin(2); // 🍾 spends it
    expect(s.settingState('rate').powers).toEqual({ unilateral: false, assent: true });
    expect(s.settingState('rate').pendingRelease).toEqual({ unilateral: false, assent: false });
  });

  it('pre-start, laying down the second power on a delegable setting IS delegation', () => {
    const { s } = preStart();
    s.setSetting(1, 'rate', { grant: 4, cap: 8, dripMinutes: 240 });
    s.relinquish(1, 'rate', 'unilateral');
    s.relinquish(1, 'rate', 'assent');
    const st = s.settingState('rate');
    expect(st.holder).toBe('members');
    expect(st.collecting).toBe(true);       // the question opens at once, not at 🍾
    expect(st.value).toBeNull();            // and the founder's own value goes with it
    expect(st.pendingRelease).toEqual({ unilateral: false, assent: false });
    expect(s.readiness().holds).toContainEqual({ setting: 'rate', why: 'collecting' });
  });

  it('the road back is a constitutional reserve, and it lands without the founder\'s assent', () => {
    const { s, bo, cy } = buildConstituted();
    // 🌍 was resolved by the room's own consent…
    expect(s.settingState('chamber').settledBy).toBe('ceremony');
    expect(thrown(() => s.openMotion(3, bo, { kind: 'reserve', setting: 'machines', power: 'assent' })))
      .toBe("'machines' — the assent power is already the convenor's");
    const m = s.openMotion(3, bo, { kind: 'reserve', setting: 'chamber', power: 'both' });
    expect(s.motionRecords().get(m)!.route).toBe('constitutional');
    s.answerMotion(3, cy, m, 'accept');
    s.answerMotion(3, 'ada', m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried'); // never awaiting-crown
    expect(s.settingState('chamber').powers).toEqual({ unilateral: true, assent: true });
    expect(s.settingState('chamber').powerFrom).toEqual({ unilateral: 'motion', assent: 'motion' });
    // …and the crown the room granted may now overwrite the room's own answer
    s.setSetting(3, 'chamber', { rung: 'closed' });
    expect(s.settingState('chamber').value).toEqual({ rung: 'closed' });
    expect(s.settingState('chamber').settledBy).toBe('crown');
  });
});

/* ========================================================================= *
 * 5. What a holder change tells the room
 * ========================================================================= */

describe('what the room is told when the holder moves', () => {
  it('a constitutional set by the pen is owed to every arrived member but the founder', () => {
    const { s, bo } = buildConstituted();
    s.setSetting(3, 'lapse', { afterMs: 60_000 });
    expect(s.memberRecords().get(bo)!.okOwed.has('lapse')).toBe(true);
    expect(s.memberRecords().get('ada')!.okOwed.has('lapse')).toBe(false);
  });

  // ---- finding 1, built (entry 162, Q1013) ------------------------------
  // This `it` read *FINDING: laying a power down owes nobody an
  // acknowledgement (§9.7 rule 3; Q918)* until entry 162 built the rule it
  // was locking, and the reversal is what the comment history is for: R-044
  // (Ed, 2026-08-22, Q571) said laying a power down is news and nothing
  // implemented it, so the lock asserted `okOwed` unchanged across two
  // `relinquish` calls. What is owed is **not** an `okOwed`, though, and that
  // half of the old assertion still holds: a release is news about a power,
  // not about a value, so it has its own owed object and the setting's own
  // value-news card is left alone.
  it('laying a power down is news, owed as a batch (§9.7 rule 3; entry 162)', () => {
    const { s, bo, cy } = buildConstituted();
    const before = new Set(s.memberRecords().get(bo)!.okOwed);
    const had = new Set(s.memberRecords().get(bo)!.releasesOwed); // 🍾's own batch
    s.relinquish(3, 'lapse', 'unilateral'); // 💤 is constitutional
    const fresh = [...s.memberRecords().get(bo)!.releasesOwed].filter((b) => !had.has(b));
    expect(fresh).toHaveLength(1);
    expect(s.releaseBatchRecords().get(fresh[0]!)!.releases)
      .toEqual([{ setting: 'lapse', power: 'unilateral' }]);
    // owed to every arrived member but the convenor, who is the actor
    expect(s.memberRecords().get(cy)!.releasesOwed.has(fresh[0]!)).toBe(true);
    expect(s.memberRecords().get('ada')!.releasesOwed.size).toBe(0);
    // and the value-news the setting itself carries is untouched
    expect([...s.memberRecords().get(bo)!.okOwed]).toEqual([...before]);
    // the other half of the pair — the hand-over — at the same `t`, so it
    // joins the batch already open rather than opening a second one
    s.relinquish(3, 'lapse', 'assent');
    expect(s.settingState('lapse').holder).toBe('members');
    expect([...s.memberRecords().get(bo)!.releasesOwed].filter((b) => !had.has(b)))
      .toEqual(fresh);
    expect(s.releaseBatchRecords().get(fresh[0]!)!.releases).toEqual([
      { setting: 'lapse', power: 'unilateral' },
      { setting: 'lapse', power: 'assent' },
    ]);
    expect([...s.memberRecords().get(bo)!.okOwed]).toEqual([...before]);
  });

  it('one `t` is one batch; a later `t` is a new one (entry 162 — the act is the boundary)', () => {
    const { s, bo } = buildConstituted();
    const had = new Set(s.memberRecords().get(bo)!.releasesOwed);
    s.relinquish(3, 'lapse', 'unilateral');
    s.relinquish(4, 'machines', 'unilateral');
    const fresh = [...s.memberRecords().get(bo)!.releasesOwed].filter((b) => !had.has(b));
    expect(fresh).toHaveLength(2);
    expect(s.releaseBatchRecords().get(fresh[0]!)!.releases)
      .toEqual([{ setting: 'lapse', power: 'unilateral' }]);
    expect(s.releaseBatchRecords().get(fresh[1]!)!.releases)
      .toEqual([{ setting: 'machines', power: 'unilateral' }]);
    expect(s.releaseBatchRecords().get(fresh[1]!)!.t).toBe(4);
  });

  it('the un-arrived, the removed and the convenor are owed nothing', () => {
    const { s, bo, dee, ez } = liveRoom();
    s.relinquish(4, 'lapse', 'unilateral');
    expect(s.memberRecords().get(bo)!.releasesOwed.size).toBe(2); // 🍾 and this
    expect(s.memberRecords().get(dee)!.releasesOwed.size).toBe(0); // never here
    expect(s.memberRecords().get(ez)!.releasesOwed.size).toBe(1);  // gone at 🍾's
    expect(s.memberRecords().get('ada')!.releasesOwed.size).toBe(0);
  });

  it('a pre-start release is news at 🍾, in the same batch as the Text\'s own pair', () => {
    const { s, bo, cy } = preStart();
    s.confirmStartingText(2, 'The clubhouse shall be kept open.');
    penEverything(s, 2);
    s.relinquish(2, 'rate', 'unilateral'); // pending until 🍾 (R-048)
    // nothing is news yet: the power has not moved
    expect(s.memberRecords().get(bo)!.releasesOwed.size).toBe(0);
    s.begin(3);
    const batches = [...s.memberRecords().get(bo)!.releasesOwed];
    expect(batches).toHaveLength(1);
    expect(s.memberRecords().get(cy)!.releasesOwed.has(batches[0]!)).toBe(true);
    // the diff 🍾 actually spent: ⏱️'s pen, and the Text's own pair
    expect(s.releaseBatchRecords().get(batches[0]!)!.releases).toEqual([
      { setting: 'rate', power: 'unilateral' },
      { setting: 'startingText', power: 'unilateral' },
      { setting: 'startingText', power: 'assent' },
    ]);
  });

  it('a solo document tells nobody, and the batch that told nobody groups nothing', () => {
    // E = 1, so `oweReleases` emits nothing at all — and then nothing is
    // recomputed either, because all three batch fields move in the fold. The
    // next release therefore opens a fresh `rel-1` rather than joining a
    // group that exists nowhere (the shape of Q835).
    const s = ConstitutionSession.open({
      title: 'Alone', slug: 'alone',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    s.confirmStartingText(2, 'One voice.');
    penEverything(s, 2);
    s.begin(2);
    expect(s.releaseBatchRecords().size).toBe(0);
    s.relinquish(2, 'lapse', 'unilateral');
    expect(s.releaseBatchRecords().size).toBe(0);
    const bo = s.invite(2, 'bo@example.org');
    s.arrive(2, bo);
    s.relinquish(2, 'machines', 'unilateral');
    expect([...s.releaseBatchRecords().keys()]).toEqual(['rel-1']);
    expect(s.releaseBatchRecords().get('rel-1')!.releases)
      .toEqual([{ setting: 'machines', power: 'unilateral' }]);
  });

  it('the OK clears the batch for one member, is silent on one not owed, and leaves `okOwed` alone', () => {
    const { s, bo, cy } = buildConstituted();
    s.setSetting(3, 'lapse', { afterMs: 60_000 });   // a value-news OK to guard
    s.relinquish(3, 'removal', 'assent');
    const batch = [...s.memberRecords().get(bo)!.releasesOwed].at(-1)!;
    const owedBefore = new Set(s.memberRecords().get(bo)!.okOwed);
    s.ackRelease(3, bo, batch);
    expect(s.memberRecords().get(bo)!.releasesOwed.has(batch)).toBe(false);
    expect(s.memberRecords().get(bo)!.releasesGiven.has(batch)).toBe(true);
    expect(s.memberRecords().get(cy)!.releasesOwed.has(batch)).toBe(true);
    expect([...s.memberRecords().get(bo)!.okOwed]).toEqual([...owedBefore]);
    // silent, never a throw: a page one poll behind must not be an error
    const seq = s.logEntries().length;
    s.ackRelease(3, bo, batch);
    s.ackRelease(3, bo, 'rel-nothing');
    expect(s.logEntries().length).toBe(seq);
    expect(thrown(() => s.ackRelease(3, 'nobody', batch))).toBe("unknown member 'nobody'");
    // and the batch is still the view's, for whoever has not pressed
    expect(view(s, cy).owedReleases.map((b) => b.id)).toContain(batch);
    expect(view(s, bo).owedReleases.map((b) => b.id)).not.toContain(batch);
  });

  it('replay rebuilds the batches and appends nothing (folds do not emit)', () => {
    const { s, bo } = buildConstituted();
    s.relinquish(3, 'lapse', 'unilateral');
    s.relinquish(3, 'lapse', 'assent');
    s.relinquish(4, 'machines', 'assent');
    s.ackRelease(4, bo, [...s.memberRecords().get(bo)!.releasesOwed][0]!);
    const again = ConstitutionSession.replay([...s.logEntries()]);
    expect(again.logEntries().length).toBe(s.logEntries().length);
    expect([...again.memberRecords().get(bo)!.releasesOwed])
      .toEqual([...s.memberRecords().get(bo)!.releasesOwed]);
    expect([...again.memberRecords().get(bo)!.releasesGiven])
      .toEqual([...s.memberRecords().get(bo)!.releasesGiven]);
    expect([...again.releaseBatchRecords().entries()])
      .toEqual([...s.releaseBatchRecords().entries()]);
    // the ids are minted in the fold, so the replay mints the same ones
    again.relinquish(5, 'removal', 'assent');
    s.relinquish(5, 'removal', 'assent');
    expect([...again.releaseBatchRecords().keys()])
      .toEqual([...s.releaseBatchRecords().keys()]);
  });

  it('FINDING: a post-start hand-over moves a constitutional rule and tells nobody', () => {
    const { s, bo } = buildConstituted();
    const before = new Set(s.memberRecords().get(bo)!.okOwed);
    s.delegate(3, 'admission'); // 🪪 — the price of admission, constitutional
    expect(s.settingState('admission').holder).toBe('members');
    expect([...s.memberRecords().get(bo)!.okOwed]).toEqual([...before]);
    // the only trace is the event itself
    expect(s.logEntries().at(-1)!.event.type).toBe('setting-handed-over');
  });

  // ---- finding 3 -------------------------------------------------------
  it('FINDING: delegating a set setting strands the acknowledgement it made owing', () => {
    const { s, bo } = preStart();
    s.setSetting(1, 'lapse', { afterMs: null });
    expect(s.memberRecords().get(bo)!.okOwed.has('lapse')).toBe(true);
    s.delegate(1, 'lapse');
    // the decision the receipt is about no longer stands…
    expect(s.settingState('lapse').value).toBeNull();
    expect(s.settingState('lapse').collecting).toBe(true);
    // …and the receipt is still owed, on a setting now asking the room instead
    expect(s.memberRecords().get(bo)!.okOwed.has('lapse')).toBe(true);
  });

  // ---- finding 4 -------------------------------------------------------
  it('FINDING: the pre-start pen owes an acknowledgement, where §9.6a says it owes nothing', () => {
    const { s, bo } = preStart();
    // §9.6a: "the convenor's re-setting before the start is owed nothing".
    // `setSetting` has no epoch test (session.ts:1070) and `founding.test.ts:264`
    // locks the pre-start owing, so the spec sentence stands alone.
    s.setSetting(1, 'lapse', { afterMs: null });        // a first constitutional set
    expect(s.memberRecords().get(bo)!.okOwed.has('lapse')).toBe(true);
    s.setSetting(1, 'machines', { enabled: false, budget: 0 }); // a first ordinary set
    expect(s.memberRecords().get(bo)!.okOwed.has('machines')).toBe(false);
    s.setSetting(1, 'machines', { enabled: true, budget: 5 });  // an ordinary change
    expect(s.memberRecords().get(bo)!.okOwed.has('machines')).toBe(true);
  });
});

/* ========================================================================= *
 * 6. The closed epoch — holders are frozen
 * ========================================================================= */

describe('after the close nothing but the signing (SPEC §4.6)', () => {
  it('every verb that could move a holder refuses, by name', () => {
    const { s, bo } = buildConstituted();
    s.close(4);
    expect(thrown(() => s.delegate(5, 'rate')))
      .toBe('the document has closed — delegating is over (§4.6)');
    expect(thrown(() => s.relinquish(5, 'rate', 'assent')))
      .toBe('the document has closed — giving up a power is over (§4.6)');
    expect(thrown(() => s.reclaim(5, 'rate')))
      .toBe('the document has closed — reclaiming is over (§4.6)');
    expect(thrown(() => s.setSetting(5, 'rate', { grant: 5, cap: 8, dripMinutes: 240 })))
      .toBe('the document has closed — setting is over (§4.6)');
    expect(thrown(() => s.openMotion(5, bo, { kind: 'reserve', setting: 'rate' })))
      .toBe('the document has closed — a motion is over (§4.6)');
    // and the holders stand exactly as the close found them
    expect(s.settingState('rate').powers).toEqual({ unilateral: true, assent: true });
    expect(s.settingState('chamber').holder).toBe('members');
  });
});

/* ========================================================================= *
 * 7. Replay — the whole holder walk, bit for bit
 * ========================================================================= */

describe('replay (SPEC §11)', () => {
  it('re-folds a walk through every holder state bit-identically', () => {
    const { s, bo, cy } = preStart();
    s.setSetting(1, 'chamber', { rung: 'closed' });
    s.delegate(1, 'chamber');                       // held-and-set → delegated
    s.answer(1, 'ada', 'chamber', { rung: 'public' });
    s.answer(1, bo, 'chamber', { rung: 'link' });
    s.answer(1, cy, 'chamber', { rung: 'public' });
    s.confirmStartingText(2, 'The clubhouse shall be kept open.');
    penEverything(s, 2, ['chamber']);
    s.relinquish(2, 'rate', 'unilateral');          // a pending release
    s.begin(2);
    s.relinquish(3, 'lapse', 'assent');             // pen-only, live
    s.delegate(3, 'admission');                     // a hand-over
    const m = s.openMotion(3, bo, { kind: 'reserve', setting: 'chamber', power: 'assent' });
    s.answerMotion(3, cy, m, 'accept');
    s.answerMotion(3, 'ada', m, 'accept');

    const again = ConstitutionSession.replay([...s.logEntries()]);
    expect(again.rollingHash()).toBe(s.rollingHash());
    expect(again.verifyChain()).toBe(true);
    for (const id of HELD) {
      expect(again.settingState(id).powers, id).toEqual(s.settingState(id).powers);
      expect(again.settingState(id).holder, id).toEqual(s.settingState(id).holder);
      expect(again.settingState(id).settledBy, id).toEqual(s.settingState(id).settledBy);
      expect(again.settingState(id).value, id).toEqual(s.settingState(id).value);
    }
  });
});
