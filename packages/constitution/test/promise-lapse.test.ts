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
 *   `setting-handed-over`, `member-returned`,
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
import { WARN_LEADS, lapseDue, warningDue } from '../src/clocks.js';
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

const HOUR = 3_600_000, DAY = 24 * HOUR;

/**
 * **Three warnings, a week, a day and an hour before the lapse, and a member
 * gets all three** (R-097, Ed 2026-09-08, Q1285: *only three — a week, a
 * day, and an hour — and you get all three*). Until this date one warning
 * went at three quarters of the spell. Only the leads that fit inside the
 * spell fire, so a seven-day spell warns twice and a spell under an hour —
 * the sim rooms, most of these tests — warns nobody.
 */
describe('💤 the three warnings (R-097)', () => {
  it('the leads are a week, a day and an hour, longest first', () => {
    expect([...WARN_LEADS]).toEqual([7 * DAY, DAY, HOUR]);
  });
  it('lapseDue keeps the leads that fit inside the spell', () => {
    const month = lapseDue(1_000, 30 * DAY)!;
    expect(month.lapseAtT).toBe(1_000 + 30 * DAY);
    expect(month.warnAt).toEqual([
      { lead: 7 * DAY, t: 1_000 + 23 * DAY },
      { lead: DAY, t: 1_000 + 29 * DAY },
      { lead: HOUR, t: 1_000 + 30 * DAY - HOUR },
    ]);
    expect(lapseDue(0, 7 * DAY)!.warnAt.map((w) => w.lead)).toEqual([DAY, HOUR]); // the card's shortest spell
    expect(lapseDue(0, 8 * DAY)!.warnAt.map((w) => w.lead)).toEqual([7 * DAY, DAY, HOUR]);
    expect(lapseDue(0, 3 * HOUR)!.warnAt.map((w) => w.lead)).toEqual([HOUR]);
    expect(lapseDue(0, HOUR)!.warnAt).toEqual([]);   // a lead equal to the spell is no warning
    expect(lapseDue(0, 10_000)!.warnAt).toEqual([]);
    expect(lapseDue(0, null)).toBeNull();
  });
  it('warningDue owes the shortest lead that has passed, and never one longer than a lead already sent', () => {
    const due = lapseDue(0, 30 * DAY)!;
    expect(warningDue(due, null, 23 * DAY - 1)).toBeNull();
    expect(warningDue(due, null, 23 * DAY)).toBe(7 * DAY);
    expect(warningDue(due, 7 * DAY, 23 * DAY)).toBeNull();       // sent; nothing shorter is due yet
    expect(warningDue(due, 7 * DAY, 29 * DAY)).toBe(DAY);
    expect(warningDue(due, DAY, 30 * DAY - HOUR)).toBe(HOUR);
    expect(warningDue(due, HOUR, 30 * DAY - 1)).toBeNull();      // all three sent
    // a host down across two points sends the one that is still true
    expect(warningDue(due, null, 29 * DAY + 1)).toBe(DAY);
    expect(warningDue(due, DAY, 29 * DAY + 2)).toBeNull();       // and the stale week never follows
  });
});

describe('💤 promise 1 · live · a quiet member leaves E and every electorate', () => {
  it('warns a week, a day and an hour before the lapse — once each — and lapses at the spell', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 30 * DAY }, endsAtMs: 100 * DAY });
    const quietSince = s.memberRecords().get(cy)!.lastActivityT;
    const due = lapseDue(quietSince, 30 * DAY)!;
    const [week, day, hour] = due.warnAt.map((w) => w.t) as [number, number, number];
    busy(s, bo, 20 * DAY); // ada and bo act; their own clocks restart here
    s.tick(week - 1); // a millisecond short of the first warning point
    expect(s.memberRecords().get(cy)!.lapseWarned).toBe(false);
    s.tick(week);
    expect(s.memberRecords().get(cy)!.lapseWarned).toBe(true);
    expect(s.memberRecords().get(cy)!.lapseWarnedLead).toBe(7 * DAY);
    s.tick(week + HOUR); // the sweep does not re-send the week
    expect(types(s).filter((x) => x === 'lapse-warned')).toHaveLength(1);
    s.tick(day);
    expect(s.memberRecords().get(cy)!.lapseWarnedLead).toBe(DAY);
    s.tick(hour);
    expect(s.memberRecords().get(cy)!.lapseWarnedLead).toBe(HOUR);
    const warned = s.logEntries().map((e) => e.event)
      .filter((e): e is Extract<typeof e, { type: 'lapse-warned' }> => e.type === 'lapse-warned');
    expect(warned.map((e) => e.lead)).toEqual([7 * DAY, DAY, HOUR]);
    expect(warned.every((e) => e.member === cy)).toBe(true);
    s.tick(due.lapseAtT - 1);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(false);
    s.tick(due.lapseAtT);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(true);
    // warned three times, lapsed once — the sweep does not re-emit either
    expect(types(s).filter((x) => x === 'lapse-warned')).toHaveLength(3);
    s.tick(due.lapseAtT + 100);
    expect(types(s).filter((x) => x === 'member-lapsed')).toHaveLength(1);
    // and the log replays to the same clock
    const r = ConstitutionSession.replay([...s.logEntries()]);
    expect(r.memberRecords().get(cy)!.lapseWarnedLead).toBe(HOUR);
    expect(r.rollingHash()).toBe(s.rollingHash());
  });

  it('a host down across two warning points sends the one still true, and a return clears them all', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 30 * DAY }, endsAtMs: 100 * DAY });
    const due = lapseDue(s.memberRecords().get(cy)!.lastActivityT, 30 * DAY)!;
    busy(s, bo, 20 * DAY);
    s.tick(due.warnAt[1]!.t + 1); // straight past the week's point and the day's
    const leads = () => s.logEntries().map((e) => e.event)
      .filter((e): e is Extract<typeof e, { type: 'lapse-warned' }> => e.type === 'lapse-warned')
      .map((e) => e.lead);
    expect(leads()).toEqual([DAY]);          // *a day*, never the stale *a week*
    s.tick(due.warnAt[1]!.t + 2);
    expect(leads()).toEqual([DAY]);
    // cy comes back: the warnings are cleared and the clock restarts
    s.setIdentity(due.warnAt[1]!.t + 3, cy, { name: 'Cy' });
    expect(s.memberRecords().get(cy)!.lapseWarned).toBe(false);
    expect(s.memberRecords().get(cy)!.lapseWarnedLead).toBeNull();
    s.tick(due.warnAt[2]!.t);
    expect(leads()).toEqual([DAY]);          // no hour: the spell restarted
  });

  it('a spell under an hour warns nobody, and lapses on the clock as ever', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 } });
    busy(s, bo, 7_000);
    s.tick(9_999);
    expect(s.memberRecords().get(cy)!.lapseWarned).toBe(false);
    s.tick(10_000 + s.memberRecords().get(cy)!.lastActivityT);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(true);
    expect(types(s)).not.toContain('lapse-warned');
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

describe('💤 promise 3 · live · coming back is being here again, and nothing else', () => {
  it('a read revives, as an act does, and costs nothing', () => {
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 10_000 } });
    busy(s, bo, 9_000);
    s.tick(10_500);
    // `seen` is the host's presence stamp on every authenticated read.
    // **Seeing is presence** (Ed, 2026-09-08, R-096): for a lapsed member the
    // read is the revival — it used to refuse them on purpose, and a member
    // with a live cookie could read the room lapsed.
    expect(s.seen(11_000, cy)).toBe(true);
    expect(s.memberRecords().get(cy)!.lapsed).toBe(false);
    expect(s.E()).toBe(3);
    // no motion, no price, no acknowledgement — one event
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
    const { s, bo, cy } = buildConstituted({ lapse: { afterMs: 3 * HOUR }, endsAtMs: 10 * HOUR });
    // ada is a member here, so the convenor branch's `!members.has(convenor)`
    // guard withholds the second warning: one mail, not two
    s.setIdentity(2 * HOUR + 1, bo, { name: 'Bo' });
    s.setIdentity(2 * HOUR + 1, cy, { name: 'Cy' });
    s.tick(2 * HOUR + 30_000); // past the hour's point on a three-hour spell
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
  // shortened. What it does not have is the other road onto `rereadLapse`:
  // a carried 🏛️ motion.
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
    // a ten-second spell fits none of the three warnings (R-097); the
    // pre-start clock is the point here, and the warnings have their own block
    expect(s.memberRecords().get(bo)!.lapseWarned).toBe(false);
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
   * presence path is shut after the close — `seen` returns false — but
   * `memberReturn` has no `requireOpen`, and the host calls it
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
