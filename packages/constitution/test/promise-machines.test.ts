/**
 * 🤖 **AI Proposals** — promise coverage (series 77, backlog entry 90).
 *
 * The audit question, as for every setting in the series: for each value the
 * card offers, what does the document promise the room, and is that promise
 * kept by machinery — in the fold and on the surface, before 🍾, live, and
 * after the close? **This file fixes nothing.** It locks what holds and names
 * what does not, so a later change breaks a sentence rather than drifting.
 *
 * ## The headline
 *
 * **🤖 is a setting and a flag; there is no actor.** `machineAuthored` exists
 * on the engine `Candidate` and `submitCandidate` accepts it, `Participant`
 * carries a `machine?` flag — and **nothing anywhere ever sets either**. There
 * is no coherence auditor process in `packages/server/src`, none in the sim's
 * product path, none behind any command. So 🤖's promises hold *vacuously*:
 * the machine never judges because it never acts, and the budget bounds
 * nothing because nothing spends it.
 *
 * The grep of record (`packages/` and `design/`, at this commit) —
 * `machineAuthored` is **five** sites, all plumbing:
 *   - `engine-core/src/types.ts:145` — `Candidate.machineAuthored?`
 *   - `engine-core/src/types.ts:247` — the `candidate-submitted` event field
 *   - `engine-core/src/session.ts:344` — the fold copies it onto the candidate
 *   - `engine-core/src/session.ts:835` — `submitCandidate`'s input type
 *   - `engine-core/src/session.ts:894` — the emit copies it onto the event
 * and `coherence`/`auditor` outside prose is `design/`'s `S.auditor` /
 * `S.auditorBudget` (the founder's radio and number field) and one
 * `data-mnum` label. No submitter, no reader, no branch.
 *
 * ## The values × the promises
 *
 * | value | what the room is told | promise 1 *proposes only, never judges* | promise 2 *disabled means none appears* | promise 3 *the budget bounds it* |
 * |---|---|---|---|---|
 * | `{ enabled: false, budget: 0 }` | *No AI proposals — people write everything in this document.* | **holds, vacuously** | **holds, vacuously** — no code path consults `enabled`, so nothing is refused; nothing is submitted either | n/a |
 * | `{ enabled: true, budget: N }` | *AI proposals are permitted, with a budget of N ✏️s* | **holds, vacuously** | n/a | **gap (fold)** — the value reaches no engine field (`engineFieldsFor` → `{}`, locked below); a candidate's stake is spent from its **author's** ⏱️ ledger, which drips, so §10's *4 tokens, no drip* is nowhere expressed |
 * | `{ enabled: true, budget: 0 }` | *AI proposals are permitted, with a budget of 0 ✏️s* | **holds, vacuously** | n/a | **gap (surface)** — `validateValue` accepts it and the founder's card offers it (`num(…, 0, 40)`), but `PROPOSE.machines`'s motion input is `min=1`: the edge is settable by pen and by the founding, and not proposable by motion |
 *
 * Two more shapes the validator accepts and the surface cannot express:
 * `{ enabled: false, budget: 7 }` (a budget for a machine that is off — the
 * page always writes 0 when off, so only a hand-written log carries it) and
 * any extra field, which is not rejected.
 *
 * ## The promises the copy makes beyond the three
 *
 * | # | promise (the room's words) | verdict |
 * |---|---|---|
 * | 4 | *it never judges, and **counts toward no quorum*** (both the founder's card and the member ladder say this) | **gap (fold)** — `engine-core`'s `eCount()` counts every non-removed, non-suspended roster entry and never reads `Participant.machine`; `adoptionFloor()` rides on it. Vacuous today because nothing seats a machine. Locked as `it.fails` in `packages/engine-core/test/promise-machines.test.ts` |
 * | 5 | *its proposals compete on the same terms as anybody's and can be out-judged like anybody's* | **holds** — locked behaviourally in the engine file: the same walk with and without the flag produces identical races, feeds, rankings, balances and final render |
 * | 6 | §10: patches are *labeled machine-authored* | **gap (surface)** — the label reaches no reader. `participant-api.ts` never projects it, `view.ts` and `server.ts` never carry it, `design/` has no site for it. A machine patch would be indistinguishable from a person's |
 *
 * ## The holder states × the epochs
 *
 * | holder | before 🍾 | live | closed |
 * |---|---|---|---|
 * | founder held-**set** | `setSetting` freely, any number of times (§9.6a) | `setSetting` under the pen (`by: 'crown'`), and — being a *change* — it owes an OK to every member who was here (`oweOks`) | refused: *the document has closed* |
 * | founder held-**unset** | the card stands blank; 🤖 is **not** a judge gate, so 🍾 never waits on it | n/a (the start settles nothing for it; an unset ordinary setting simply has no standing value, and a motion on it is refused — *no settled value to move against*) | refused |
 * | **delegated**, collecting | members answer *the most machine proposing you will accept*; the consent rule takes the most restrictive | — | — |
 * | members-held (by ceremony or hand-over) | — | `setSetting` refused (*not the convenor's to set*); the road is an **ordinary** motion, raced at the bar | refused |
 *
 * ## What the surface says, and the one place it overstates
 *
 * The founder's card (`session-view.html:5055`) and the member ladder
 * (`setup.js:1284`) both state the rule correctly — *proposes and nothing
 * else · never judges · counts toward no quorum · competes on the same terms*.
 * Nothing on the page claims an auditor **is** running. What the *permitted*
 * option says is future-tense in intent and present-tense in grammar — *An AI
 * patrols the document for drift … and proposes fixes* — and on a live
 * document with `enabled: true` nothing patrols anything. Filed, not fixed.
 *
 * One collection gap: the catalogue's consent order ranks *enabled* first and
 * then **higher budget** first, but the member ladder asks only the boolean —
 * `ANSTYPED.machines` (`session-view.html:717`) takes the budget from the
 * founder's own `S.auditorBudget` field with a fallback of 4, which on a
 * member's page is always the fallback. So the budget half of *the most
 * machine proposing you will accept* is never collected, and the order's
 * tie-break is unreachable through the surface. Locked here as arithmetic.
 *
 * Cites rather than duplicates: `catalogue.test.ts:35` (ordinary and
 * delegable), `:76` (validate round-trip), `:179` (one refusal keeps them
 * out); ⏱️ (entry 89) owns the wallet the budget would have to become.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { DEFAULT_TUNING, engineFieldsFor, toEngineConstitution } from '../src/adapter.js';
import { entryOf, motionRouteOf } from '../src/catalogue.js';
import { resolveConsent } from '../src/consent.js';
import { validateValue } from '../src/values.js';
import type { MachinesValue } from '../src/values.js';

const OFF: MachinesValue = { enabled: false, budget: 0 };
const ON: MachinesValue = { enabled: true, budget: 4 };

/**
 * A constituted solo document, founder-held throughout, with 🤖 at the
 * caller's value. `t = 0` is both the founding and 🍾.
 */
function machined(machines: MachinesValue) {
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter',
    slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);
  s.confirmStartingText(0, 'The clubhouse shall be kept open.');
  const values = {
    ending: { endsAtMs: 100_000 },
    bar: { pct: 66 },
    pace: { shape: 'fixed' },
    quorum: { form: 'count', n: 1 },
    authorship: { rung: 'sealed' },
    judgments: { rung: 'after' },
    chamber: { rung: 'link' },
    applications: { apply: false },
    admission: { price: 'assembly' },
    removal: { price: 'consent' },
    rate: { grant: 4, cap: 8, dripMinutes: 240 },
    machines,
    lapse: { afterMs: null },
  } as const;
  for (const [id, v] of Object.entries(values)) s.setSetting(0, id as never, v as never);
  s.begin(0);
  expect(s.constitutedAtT).toBe(0);
  return s;
}

/** Two members, 🤖 delegated and collecting, nothing else answered yet. */
function delegatedMachines() {
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter',
    slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);
  const bo = s.invite(1, 'bo@example.org');
  s.arrive(1, bo);
  s.confirmStartingText(1, 'The clubhouse shall be kept open.');
  s.delegate(1, 'machines');
  return { s, bo };
}

describe('🤖 the value, and what the catalogue says it is', () => {
  it('enabled is a boolean and budget an integer ≥ 0 — including 0, the edge', () => {
    expect(validateValue('machines', OFF)).toBeNull();
    expect(validateValue('machines', ON)).toBeNull();
    // The entry's third check — *what `enabled` with no budget does*. The
    // answer today: the value is legal, and nothing anywhere reads it, so it
    // does exactly what every other 🤖 value does, which is nothing.
    expect(validateValue('machines', { enabled: true, budget: 0 })).toBeNull();
    // …and the mirror shape, a budget for a machine that is off, is legal too.
    // The page never writes it (both `TYPED` and `ANSTYPED` zero the budget
    // when off), so only a hand-written log could carry one.
    expect(validateValue('machines', { enabled: false, budget: 7 })).toBeNull();
    expect(validateValue('machines', { enabled: 'yes', budget: 4 }))
      .toMatch(/enabled must be a boolean/);
    expect(validateValue('machines', { enabled: true, budget: -1 }))
      .toMatch(/budget must be an integer ≥ 0/);
    expect(validateValue('machines', { enabled: true, budget: 1.5 }))
      .toMatch(/budget must be an integer ≥ 0/);
    expect(validateValue('machines', { enabled: true }))
      .toMatch(/budget must be an integer ≥ 0/);
  });

  it('🤖 is ordinary, delegable, no judge gate, no deps (Q352, R-026)', () => {
    const e = entryOf('machines');
    expect(e.kind).toBe('ordinary');       // it judges nothing, so it re-rates nothing
    expect(e.delegable).toBe(true);        // the consent question survives
    expect(e.judgeGate).toBe(false);       // 🍾 never waits on 🤖
    expect(e.deps).toEqual([]);
    expect(e.valueType).toBe('machines');
    expect(e.rungs).toBeUndefined();       // not a ladder — a switch and a number
    expect(e.routeOf).toBeUndefined();     // no line inside the setting: always ordinary
  });

  it('every 🤖 motion routes ordinary, in both directions and at the edges', () => {
    const e = entryOf('machines');
    expect(motionRouteOf(e, ON, OFF)).toBe('ordinary');
    expect(motionRouteOf(e, OFF, ON)).toBe('ordinary');
    expect(motionRouteOf(e, { enabled: true, budget: 40 }, ON)).toBe('ordinary');
    expect(motionRouteOf(e, { enabled: true, budget: 0 }, ON)).toBe('ordinary');
    // …and with nothing standing there is nothing to move against, which the
    // session refuses outright (locked in the epochs block below).
    expect(motionRouteOf(e, ON, null)).toBe('constitutional');
  });
});

describe('🤖 the consent question — *the most machine proposing you will accept*', () => {
  const e = entryOf('machines');

  it('one refusal keeps them out, whatever budget the rest asked for', () => {
    // catalogue.test.ts:179 asserts the pair; this is the shape that matters
    // for the promise — a large budget does not outweigh a single *no*.
    const r = resolveConsent(e, [
      { enabled: true, budget: 40 }, { enabled: true, budget: 12 }, OFF,
    ]);
    expect(r.value).toEqual(OFF);
    // most protective first: the refusal, then the smaller budget
    expect(r.distribution).toEqual([OFF, { enabled: true, budget: 12 }, { enabled: true, budget: 40 }]);
  });

  it('with everybody willing, the room takes the smallest budget stated', () => {
    expect(resolveConsent(e, [
      { enabled: true, budget: 40 }, { enabled: true, budget: 4 }, { enabled: true, budget: 12 },
    ]).value).toEqual({ enabled: true, budget: 4 });
    // …down to and including the edge, which is *permitted with nothing to
    // spend* — indistinguishable in effect from off, and stated as permitted.
    expect(resolveConsent(e, [
      { enabled: true, budget: 4 }, { enabled: true, budget: 0 },
    ]).value).toEqual({ enabled: true, budget: 0 });
  });

  // The surface half of the same order, filed rather than fixed: the member
  // ladder (`setup.js:1284`) offers two rungs and no number, and
  // `ANSTYPED.machines` fills the budget from the founder's own field with a
  // fallback of 4 — so through the surface every *permitted* answer carries
  // the same budget and this tie-break can never decide anything.
  it.todo('the surface collects the budget half of the consent question — no control asks for it');
});

describe('🤖 promise 3: the budget bounds it — the value reaches no engine field', () => {
  /**
   * **A deliberate tripwire, not a description.** `engineFieldsFor` has no
   * `machines` case, so it falls to `default: return {}` — 🤖 is stored in the
   * bridge's settings map and read by nobody. That is the whole of promise 3's
   * enforcement today: none. This test exists so that the day somebody builds
   * the auditor and wires the budget through, it goes **red** and they have to
   * come back here and say what the new field means — rather than inheriting a
   * green test that was only ever asserting an absence.
   */
  it('TRIPWIRE: engineFieldsFor(machines) is {} — wiring it must break this test', () => {
    expect(engineFieldsFor('machines', OFF, 0)).toEqual({});
    expect(engineFieldsFor('machines', ON, 0)).toEqual({});
    expect(engineFieldsFor('machines', { enabled: true, budget: 40 }, 0)).toEqual({});
  });

  it('two documents alike but for 🤖 open the engine with identical constitutions', () => {
    const off = toEngineConstitution(machined(OFF), DEFAULT_TUNING, 'seed');
    const on = toEngineConstitution(machined({ enabled: true, budget: 40 }), DEFAULT_TUNING, 'seed');
    expect(on.constitution).toEqual(off.constitution);
    expect(on.quorumN).toBe(off.quorumN);
    // The wallet the budget would have to become is ⏱️'s, and it is untouched
    // by 🤖 in either direction (entry 89 owns that half).
    expect(on.constitution.tokenGrant).toBe(off.constitution.tokenGrant);
    expect(on.constitution.tokenDripMinutes).toBe(off.constitution.tokenDripMinutes);
  });

  it.todo('a machine spends its 🤖 budget and stops at 0 — nothing spends it, so nothing stops');
  it.todo('the auditor’s budget is fixed with no drip (§10) — no ledger anywhere is opened without a drip');
});

describe('🤖 promise 2: disabled means no machine proposal appears', () => {
  it('holds vacuously — the value stands, and no command anywhere consults it', () => {
    // The standing value is what the room decided, in both directions…
    const off = machined(OFF);
    expect(off.settingState('machines').value).toEqual(OFF);
    const on = machined(ON);
    expect(on.settingState('machines').value).toEqual(ON);
    // …and it is the *only* difference between the two documents: the engine
    // constitution above is identical, and nothing on the command layer reads
    // `enabled`. There is no gate to test because there is nothing to gate.
  });

  it.todo('a machine-authored submission is refused while 🤖 is off — no submitter exists to refuse');
});

describe('🤖 across the three epochs', () => {
  it('before 🍾 the founder sets it freely and 🍾 never waits on it', () => {
    const s = ConstitutionSession.open({
      title: 'T', slug: 't', convenor: { id: 'ada', email: 'a@example.org', isMember: true },
    }, 0);
    s.setSetting(0, 'machines', ON);
    s.setSetting(0, 'machines', { enabled: true, budget: 12 });
    s.setSetting(0, 'machines', OFF);   // §9.6a — before the start nothing is amended, only set
    expect(s.settingState('machines').value).toEqual(OFF);
    expect(entryOf('machines').judgeGate).toBe(false);
    // …and no motion is possible yet, whatever the value
    expect(() => s.openMotion(0, 'ada', { kind: 'set', setting: 'machines', value: ON }))
      .toThrow(/before the start nothing is amended/);
  });

  it('delegated, it collects the room’s answers and resolves without the founder’s pen', () => {
    const { s, bo } = delegatedMachines();
    expect(s.settingState('machines').holder).toBe('members');
    expect(s.settingState('machines').collecting).toBe(true);
    expect(() => s.setSetting(2, 'machines', ON)).toThrow(/reclaim it first/);
    s.answer(2, 'ada', 'machines', { enabled: true, budget: 12 });
    s.answer(2, bo, 'machines', ON);
    // every member has answered, so the question resolves to the most
    // restrictive of the two — the smaller budget
    expect(s.settingState('machines').value).toEqual(ON);
    expect(s.settingState('machines').collecting).toBe(false);
  });

  it('live and founder-held, the pen changes it — and the change is owed an OK', () => {
    const s = machined(OFF);
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);                       // here when it changes, so it is news
    s.setSetting(2, 'machines', ON);
    expect(s.settingState('machines').value).toEqual(ON);
    // ordinary, so the founder's *first* decision owed nothing; a change to
    // something the room was living under does (Q530).
    expect(s.memberRecords().get(bo)!.okOwed.has('machines')).toBe(true);
  });

  it('live and members-held, the road is an ordinary motion raced at the bar', () => {
    const s = machined(OFF);
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.delegate(2, 'machines');             // hand-over, post-start
    expect(() => s.setSetting(2, 'machines', ON)).toThrow(/not the convenor's to set/);
    const m = s.openMotion(2, bo, { kind: 'set', setting: 'machines', value: ON });
    const rec = s.motionRecords().get(m)!;
    expect(rec.route).toBe('ordinary');
    expect(rec.stake).toBe(1);             // an ordinary motion stakes an ✏️ like a patch
    // …and an ordinary motion is judged as a race, never answered
    expect(() => s.answerMotion(2, 'ada', m, 'accept'))
      .toThrow(/judged as a race, not answered/);
  });

  it('an unset 🤖 has nothing to move against, so a motion on it is refused', () => {
    const s = ConstitutionSession.open({
      title: 'T', slug: 't', convenor: { id: 'ada', email: 'a@example.org', isMember: true },
    }, 0);
    s.confirmStartingText(0, 'x');
    for (const [id, v] of Object.entries({
      ending: { endsAtMs: 100_000 }, bar: { pct: 66 }, pace: { shape: 'fixed' },
      quorum: { form: 'count', n: 1 }, authorship: { rung: 'sealed' },
      judgments: { rung: 'after' }, chamber: { rung: 'link' },
      applications: { apply: false }, admission: { price: 'assembly' },
      removal: { price: 'consent' }, rate: { grant: 4, cap: 8, dripMinutes: 240 },
      lapse: { afterMs: null },
    })) s.setSetting(0, id as never, v as never);
    s.begin(0);                            // 🤖 never set — 🍾 does not wait on it
    expect(s.settingState('machines').value).toBeNull();
    expect(() => s.openMotion(1, 'ada', { kind: 'set', setting: 'machines', value: ON }))
      .toThrow(/no settled value to move against/);
  });

  it('after the close the value is frozen with the rest — pen and motion both refused', () => {
    const s = machined(ON);
    s.tick(9_000_000);                     // past the ending: the record is cut
    expect(s.closed).toBe(true);
    expect(s.settingState('machines').value).toEqual(ON);
    expect(() => s.setSetting(9_000_001, 'machines', OFF))
      .toThrow(/the document has closed/);
    expect(() => s.openMotion(9_000_001, 'ada', { kind: 'set', setting: 'machines', value: OFF }))
      .toThrow(/the document has closed/);
  });
});
