/**
 * **Promise-coverage — 💤 lapse** (backlog entry 81, series 77, batch L). One
 * setting, two values, nine promises: enumerate them, find the enforcement in
 * the fold and on the surface in all three epochs, lock what holds here and
 * file what does not. **This file fixes nothing** — where it locks behaviour
 * the audit calls a gap, the `it` says so in its own name and the comment
 * names the finding.
 *
 * `LapseValue` is `{ afterMs: number | null }` (`values.ts`): a positive
 * duration, or `null` for *never*. The catalogue entry is constitutional,
 * delegable, a judge-gate, consent order `neverIsHighest` — the longest spell
 * wins and *never* is the longest of all. The surface collects it in whole
 * **days**, 7–365 (`session-view.html` `num(S, 'lapseDays', …, 7, 365)`), so
 * a sub-day spell is reachable only through the API.
 *
 * ## The enumeration — every promise, in every epoch
 *
 * Fold = the method that keeps or breaks it. Surface = the control on
 * `design/session-view.html`. **holds** · **gap (fold)** · **gap (surface)**.
 *
 * | # | the promise, in the room's words | before 🍾 | live | after the close |
 * | --- | --- | --- | --- | --- |
 * | 1 | *inactive longer than the spell → lapsed; out of E, abstaining meanwhile* | **gap (both)**: the fold's `tick` lapse loop carries no `constitutedT` test and lapses an arrived member, but `server.ts` `tick` skips a document whose `constitutedAtT` is null — so the module and the product disagree. Locked below | **holds** — `tick` → `member-lapsed` → `inE` false → `E()`, `motionElectorateOf` and `canPropose` all shrink | **holds** — `tick` returns on `closedFlag` before the loop |
 * | 2 | *warned by mail first, then sent the package* | as row 1 | **gap (fold)**: the warning holds (`lapse-warned` → `MAILS.lapseWarning`), the *package* does not — `MAILS.lapsed` carries a login link and nothing else, no document and no record (SPEC §9.5a, SURFACE E22) | no clock, nothing sent |
 * | 3 | *coming back is logging in, and nothing else* | n/a | **holds** — `memberReturn` needs no motion and no price; the host calls it from the magic link, the dev seat and **any command** (`server.ts` *any act revives*). A *read* is not enough: `seen` returns false for a lapsed member by design | **gap (fold)**: `memberReturn` carries no `requireOpen`, so a lapsed member following their login link after the close writes `member-returned` into a cut record. Locked below |
 * | 4 | *judgments already cast keep counting* | n/a | **holds** — `engine-bridge` maps `member-lapsed` → `suspendParticipant`, never `removeParticipant` (`bridge.test.ts`); the member record keeps `removed: false` | frozen with the record |
 * | 5 | *a lapsed member is still a member: owed every acknowledgement, listed under* Lapsed | n/a | **holds** in the fold — `oweOks` skips only the unarrived, the removed and the convenor (Y10, Q530). Surface: the *Lapsed* subsection and the `lapsed` pill stand for **another** member's row | nothing is owed after the close |
 * | 6 | *the founder's clock runs too — a quiet crown lapses into automatic assent* | as row 1 | **holds** — `crown-lapsed` + `crown-question-auto-passed`, nothing changes hands, `memberReturn` revives it; and a founder holding nothing anywhere never lapses as a crown | `runClose` fails a pending 👑 question closed; no auto-pass |
 * | 7 | *under `null` nobody ever lapses* | **holds** — `lapseDue` returns null and the loop is skipped whole | **holds**, crown included | **holds** |
 * | 8 | *the rule is re-read when it changes* | **holds** — `setSetting` → `rereadLapse` runs pre-start too | **holds** — by the pen (`setSetting`) and by a carried 🏛️ (`settleCarriedEffects`) | `requireOpen` refuses the change |
 * | 9 | *a 💤 change that returns people names them in its own change line* | **unbuilt by record** — SURFACE Y26, Q902 (Ed agreed 2026-08-26). Not filed again |
 *
 * Two more cells the entry asked about, neither a promise of its own:
 *
 * - *What counts as activity.* `touch` fires from `member-seen` (an
 *   authenticated read, at most hourly — `SEEN_EVERY_MS`), and from the
 *   events that name their actor: `setting-set`, `identity-set`,
 *   `answer-given`, `ok-given`, `motion-opened`, `motion-answer`,
 *   `power-relinquished`, `crown-question-answered`/`-auto-passed`,
 *   `setting-handed-over`, `signed-out`, `member-returned`,
 *   `application-proposed`. **Judging and proposing text do not**: those ride
 *   the engine's log, which never reaches `apply`. So *inactive* means *no
 *   authenticated read and no constitution act for the spell* — an open page
 *   polling every four seconds keeps a seat alive under any spell of an hour
 *   or more, and under a shorter one it does not.
 * - *Is lapsing visible to the lapsed?* Their own `view()` carries
 *   `members[me].lapsed`, `lapseWarned` and `gates.proposing: false`. The page
 *   reads `rec.lapsed` into the roster rows and **never** `lapseWarned`, and
 *   the *lapsed* pill is drawn for `others` only — `meBlock` keeps your own
 *   row under *Members* whatever your status. Filed as a surface gap.
 *
 * The two epoch tests below (`before 🍾` and `after the close`) lock a
 * **disagreement**, not an endorsement: they fail the day either side moves
 * without the other, which is what makes a documented gap a lock.
 */
import { describe, it, expect } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { CATALOGUE } from '../src/catalogue.js';
import { WARN_FRACTION, lapseDue } from '../src/clocks.js';
import { view } from '../src/view.js';
import { buildConstituted } from './helpers.js';

/** Every event type in the log, in order — the fold's own account of itself. */
const types = (s: ConstitutionSession): string[] =>
  s.logEntries().map((e) => e.event.type);

/** ada and bo act; cy goes quiet after the founding. */
const busy = (s: ConstitutionSession, bo: string, t: number): void => {
  s.setIdentity(t, 'ada', { name: 'Ada' });
  s.setIdentity(t, bo, { name: 'Bo' });
};

describe('💤 promise 1 · live · a quiet member leaves E and every electorate', () => {
  it('warns at exactly 75% of the spell and lapses at 100%', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 } });
    const quietSince = s.memberRecords().get(cy)!.lastActivityT;
    const due = lapseDue(quietSince, 10_000)!;
    expect(due.warnAtT).toBe(quietSince + 10_000 * WARN_FRACTION);
    busy(s, bo, 7_000); // ada and bo act; their own clocks restart here
    s.tick(due.warnAtT - 1); // a millisecond short of the warning point
    expect(s.memberRecords().get(cy)!.lapseWarned).toBe(false);
    s.tick(due.warnAtT);
    expect(s.memberRecords().get(cy)!.lapseWarned).toBe(true);
    s.tick(due.lapseAtT - 1);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(false);
    s.tick(due.lapseAtT);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(true);
    // warned once, lapsed once — the sweep does not re-emit either
    expect(types(s).filter((x) => x === 'lapse-warned')).toHaveLength(1);
    s.tick(due.lapseAtT + 100);
    expect(types(s).filter((x) => x === 'member-lapsed')).toHaveLength(1);
  });

  it('takes them out of E, out of the motion electorate, and off the proposing gate', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 } });
    expect(s.motionElectorate()).toContain(cy);
    expect(s.canPropose(cy)).toBe(true);
    busy(s, bo, 9_000);
    s.tick(10_500);
    expect(s.E()).toBe(2);
    expect(s.motionElectorate()).not.toContain(cy);
    expect(s.canPropose(cy)).toBe(false);
    // and a running 🏛️ settles without them — `membership.test.ts` locks that
    // one ('a lapsed member leaving can complete a motion, like any departure')
  });

  it('the lapse is a stall, not a departure: the record stays, un-removed', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 } });
    busy(s, bo, 9_000);
    s.tick(10_500);
    const rec = s.memberRecords().get(cy)!;
    expect(rec.lapsed).toBe(true);
    expect(rec.removed).toBe(false);
    expect(rec.arrivedAtT).not.toBeNull();
    // promise 4: the bridge suspends rather than removes — `bridge.test.ts`
    // ('a lapse suspends, revival resumes') is the lock, cited not copied
    expect(types(s)).not.toContain('member-removed');
  });
});

describe('💤 promise 3 · live · coming back is logging in, and nothing else', () => {
  it('a read does not revive; an act does, and costs nothing', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 } });
    busy(s, bo, 9_000);
    s.tick(10_500);
    // `seen` is the host's presence stamp on every authenticated read. It
    // refuses for a lapsed member on purpose: revival is an act.
    expect(s.seen(11_000, cy)).toBe(false);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(true);
    // no motion, no price, no acknowledgement — one call, one event
    s.memberReturn(11_000, cy);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(false);
    expect(s.E()).toBe(3);
    expect(types(s).filter((x) => x === 'member-returned')).toHaveLength(1);
    // returning twice writes nothing: the clock only moves on events
    s.memberReturn(11_500, cy);
    expect(types(s).filter((x) => x === 'member-returned')).toHaveLength(1);
  });
});

describe('💤 promise 5 · live · a lapsed member is still a member', () => {
  it('is owed a constitutional change made while they were away, and still reads as a member', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 } });
    busy(s, bo, 9_000);
    s.tick(10_500);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(true);
    // the founder's pen on a constitutional setting: everybody outside the
    // decision is owed it, and `oweOks` skips only the unarrived, the removed
    // and the convenor (Y10, Q530) — the lapsed are in
    s.setSetting(11_000, 'judgments', { rung: 'never' });
    expect(s.memberRecords().get(cy)!.okOwed.has('judgments')).toBe(true);
    // their own view still says member — lapsed, not gone
    const v = view(s, cy);
    expect(v.members.find((m) => m.id === cy)!.lapsed).toBe(true);
    expect(v.gates.proposing).toBe(false);
    expect(v.owedOks).toContain('judgments');
  });
});

describe('💤 promise 6 · live · the founder’s clock runs too', () => {
  // `membership.test.ts` ('a quiet clerk-crown lapses…') drives the whole
  // clerk flow through `tick`: warning, `crown-lapsed`, the pending 👑
  // question auto-passing, nothing changing hands, and the revival. What is
  // locked here is the gate above it and the mail's audience.
  it('a founder who holds nothing anywhere never lapses as a crown', () => {
    const { s, bo, cy } = buildConstituted({ clerk: true, lapse: { afterMs: 10_000 } });
    // hand over every setting the founder still holds: with no reservation
    // left there is no assent to auto-grant, so no crown clock runs
    for (const e of CATALOGUE) {
      if (e.kind === 'personal') continue;
      if (s.settingState(e.id).holder === 'convenor') s.delegate(3, e.id);
    }
    expect(s.crowned()).toBe(false);
    s.setIdentity(9_000, bo, { name: 'Bo' });
    s.setIdentity(9_000, cy, { name: 'Cy' });
    s.tick(50_000);
    expect(s.crownLapsed).toBe(false);
    expect(types(s)).not.toContain('crown-lapsed');
  });

  it('the crown’s own warning is the clerk’s alone — a member founder is warned as a member', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 } });
    // ada is a member here, so the convenor branch's `!members.has(convenor)`
    // guard withholds the second warning: one mail, not two
    s.setIdentity(9_000, bo, { name: 'Bo' });
    s.setIdentity(9_000, cy, { name: 'Cy' });
    s.tick(9_600);
    expect(s.memberRecords().get('ada')!.lapseWarned).toBe(true);
    expect(types(s).filter((x) => x === 'lapse-warned')).toHaveLength(1);
  });
});

describe('💤 promise 7 · every epoch · under never no clock runs at all', () => {
  it('nobody is warned and nobody lapses, the crown included', () => {
    const { s, bo, cy } = buildConstituted(); // lapse defaults to never
    expect(lapseDue(0, null)).toBeNull();
    s.tick(50_000_000);
    for (const id of [bo, cy, 'ada']) {
      expect(s.memberRecords().get(id)!.lapsed).toBe(false);
      expect(s.memberRecords().get(id)!.lapseWarned).toBe(false);
    }
    expect(s.crownLapsed).toBe(false);
    expect(s.convenorRecord().lapseWarned).toBe(false);
    expect(types(s)).not.toContain('lapse-warned');
  });

  it('and a clerk-crown holding everything is not warned either', () => {
    const { s } = buildConstituted({ clerk: true });
    expect(s.crowned()).toBe(true);
    s.tick(50_000_000);
    expect(s.crownLapsed).toBe(false);
    expect(s.convenorRecord().lapseWarned).toBe(false);
  });
});

describe('💤 promise 8 · live · the rule is re-read when it changes', () => {
  // `membership.test.ts` locks the pen's three cases — off, lengthened,
  // shortened — and that a sign-out is untouched. What it does not have is
  // the other road onto `rereadLapse`: a carried 🏛️ motion.
  it('a carried 🏛️ motion on 💤 re-reads it too, and returns whoever it no longer lapses', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 } });
    // 💤 is the founder's here, so hand it to the room first: a motion that
    // lands without the crown is the plainest reading of the room's own act
    s.delegate(3, 'lapse');
    busy(s, bo, 9_000);
    s.tick(10_500);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(true);
    const m = s.openMotion(11_000, bo, { kind: 'set', setting: 'lapse',
      value: { afterMs: 100_000 } });
    s.answerMotion(11_000, 'ada', m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.settingState('lapse').value).toEqual({ afterMs: 100_000 });
    // cy's quiet is now well inside the spell: the reading is no longer true
    expect(s.memberRecords().get(cy)!.lapsed).toBe(false);
    expect(s.E()).toBe(3);
  });
});

describe('💤 · before 🍾 · the fold runs the clock the host never ticks', () => {
  /**
   * **A documented disagreement, not an endorsement.** `session.ts` `tick`'s
   * lapse loop carries no `constitutedT` test, so the module lapses a member
   * who arrived during a long founding. `packages/server/src/server.ts`
   * `tick` opens `if (doc.cs.constitutedAtT === null) continue;`, so the
   * product never does. SPEC §9.5a names no epoch; §9.6a says the roster is
   * re-shaped freely before the start. Filed as a batch-L finding (*💤
   * before 🍾: the fold lapses, the host does not tick*); the question of
   * which epoch is the promise is Ed's.
   */
  const founding = (): { s: ConstitutionSession; bo: string } => {
    const s = ConstitutionSession.open({
      title: 'Hollow Oak Club Charter', slug: 'hollow-oak',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.setSetting(1, 'lapse', { afterMs: 10_000 });
    return { s, bo };
  };

  it('lapses an arrived member before the start — the founder with them', () => {
    const { s, bo } = founding();
    expect(s.constitutedAtT).toBeNull();
    s.tick(9_000);
    expect(s.memberRecords().get(bo)!.lapseWarned).toBe(true);
    s.tick(12_000);
    expect(s.memberRecords().get(bo)!.lapsed).toBe(true);
    // and the founder's own clock has been running since `created`, so a
    // founding that outlasts the spell empties E entirely — 🍾 counts E, and
    // `readiness()` divides by it. The host's skip is the whole of what
    // stands between a real document and this.
    expect(s.memberRecords().get('ada')!.lapsed).toBe(true);
    expect(s.E()).toBe(0);
  });

  it('and re-reads the rule pre-start, which is the same code either way', () => {
    const { s, bo } = founding();
    s.tick(12_000);
    expect(s.memberRecords().get(bo)!.lapsed).toBe(true);
    s.setSetting(13_000, 'lapse', { afterMs: null });
    expect(s.memberRecords().get(bo)!.lapsed).toBe(false);
  });

  it('under never the pre-start clock is as quiet as the live one', () => {
    const s = ConstitutionSession.open({
      title: 'Hollow Oak Club Charter', slug: 'hollow-oak',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.setSetting(1, 'lapse', { afterMs: null });
    s.tick(50_000_000);
    expect(s.memberRecords().get(bo)!.lapsed).toBe(false);
  });
});

describe('💤 · after the close · the clock stops, but the door back does not', () => {
  const closed = (): { s: ConstitutionSession; bo: string; cy: string } => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 } });
    busy(s, bo, 9_000);
    s.tick(10_500);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(true);
    s.close(11_000);
    return { s, bo, cy };
  };

  it('a tick past the close lapses nobody and warns nobody', () => {
    const { s, bo } = closed();
    const before = s.logEntries().length;
    s.tick(50_000_000);
    expect(s.logEntries().length).toBe(before);
    expect(s.memberRecords().get(bo)!.lapsed).toBe(false);
    expect(s.memberRecords().get(bo)!.lapseWarned).toBe(false);
  });

  it('and presence records nothing: `seen` is false for everybody', () => {
    const { s, bo, cy } = closed();
    expect(s.seen(50_000_000, bo)).toBe(false);
    expect(s.seen(50_000_000, cy)).toBe(false);
    expect(s.seen(50_000_000, 'ada')).toBe(false);
  });

  /**
   * **The one finding in this audit that is not communicative.** Every other
   * presence path is shut after the close — `seen` returns false, `signOut`
   * has `requireOpen` — but `memberReturn` has neither, and the host calls it
   * from the magic link, the dev seat route and **any command** by a lapsed
   * member. So a lapsed member following their login link after the close
   * writes `member-returned` into a record §4.6 says was cut, and the closed
   * page moves them out of *Lapsed* back into *Members*. Filed as a batch-L
   * finding (*revival is not shut at the close*). Locked as it stands.
   */
  it('but a lapsed member’s login still writes `member-returned` into the cut record — filed', () => {
    const { s, cy } = closed();
    expect(s.closed).toBe(true);
    s.memberReturn(12_000, cy);
    expect(types(s).slice(types(s).indexOf('closed'))).toContain('member-returned');
    expect(s.memberRecords().get(cy)!.lapsed).toBe(false);
  });
});

describe('💤 · perpetual · the lapse clock is what feeds the freeze line', () => {
  it('a lapse that drops the quorum base below the count freezes; the return thaws', () => {
    // perpetual by construction: `buildConstituted` resolves ⏰ from the room's
    // answers, so the close is at 500_000 — everything here happens before it
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 },
      quorum: { form: 'count', n: 3 } });
    expect(s.frozen).toBe(false);
    s.setIdentity(9_000, 'ada', { name: 'Ada' });
    s.setIdentity(9_000, bo, { name: 'Bo' });
    s.tick(10_500); // cy alone is quiet
    expect(s.memberRecords().get(cy)!.lapsed).toBe(true);
    expect(s.frozen).toBe(true);
    expect(s.mustReturn()).toBe(1);
    s.memberReturn(11_000, cy);
    expect(s.frozen).toBe(false);
    expect(s.mustReturn()).toBeNull();
  });
});
