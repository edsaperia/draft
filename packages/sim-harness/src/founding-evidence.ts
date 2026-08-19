/**
 * Founding evidence (plan 367a, commit 7) — deterministic acceptance walks
 * over @draft/constitution, with a narrative log meant to be read.
 * No network, no wall clock, no randomness: the same walk prints the same
 * log and the same rolling hash every run. Exits non-zero on any failure.
 *
 *   npm run founding -w @draft/sim-harness
 */

import {
  ConstitutionSession, view, constitutionBlock,
} from '../../constitution/src/index.js';

let failures = 0;
const say = (msg: string) => console.log(msg);
const check = (cond: boolean, msg: string) => {
  if (cond) { console.log(`     ✓ ${msg}`); }
  else { failures += 1; console.error(`     ✗ FAILED: ${msg}`); }
};
const eq = (a: unknown, b: unknown, msg: string) =>
  check(JSON.stringify(a) === JSON.stringify(b), `${msg} (${JSON.stringify(a)})`);

/* ========================================================================= */
say('\n== founding-8: a staggered ceremony with a never holdout ==============');
{
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter', slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);
  say('  t=0   ada creates the document and is its first member');
  check(s.settingState('bar').holder === 'members',
    'constitutional settings default to the members (§9.7)');
  check(s.settingState('pace').holder === 'members',
    "pace is the members' too (Ed's override)");
  check(s.settingState('rate').holder === 'convenor',
    'ordinary settings default to the convenor');
  s.delegate(0, 'rate');
  s.delegate(0, 'machines'); // ordinary since Q352, so it needs the hand-over
  say('        …and ada hands the proposal rate and the AI question to the room');

  const ids: string[] = [];
  for (const [t, email] of [[1, 'bo'], [1, 'cy'], [1, 'dee'], [1, 'eve'],
    [1, 'fay'], [1, 'gus'], [1, 'hex']] as const) {
    ids.push(s.invite(t, `${email}@example.org`));
  }
  say('  t=1   seven invitations go out; nobody has arrived');
  eq(s.E(), 1, 'E counts the arrived, so seven unopened emails block nothing');

  const [bo, cy, dee, eve, fay, gus, hex] = ids as [string, string, string,
    string, string, string, string];
  for (const [t, m] of [[2, bo], [2, cy], [3, dee], [3, eve], [4, fay],
    [5, gus], [6, hex]] as const) {
    s.arrive(t, m);
  }
  say('  t=2–6 the seven arrive in ones and twos; E grows to 8');
  eq(s.E(), 8, 'E = 8 arrived members');

  say('  t=7   everyone answers ⏰ blind; gus answers never');
  s.answer(7, 'ada', 'ending', { endsAtMs: 800_000 });
  for (const m of [bo, cy, dee, eve, fay, hex]) {
    s.answer(7, m, 'ending', { endsAtMs: 600_000 });
  }
  const cnt = view(s, bo).questions.find((q) => q.setting === 'ending')!;
  eq(cnt.answeredCount, 7, 'while it runs, only the count shows');
  check(JSON.stringify(cnt).indexOf('800000') < 0,
    "no value of anybody else's is visible in a member view");
  s.answer(7, gus, 'ending', { endsAtMs: null });
  eq(s.settingState('ending').value, { endsAtMs: null },
    'one never keeps the document perpetual — the consent maximum (§9.0a)');

  say('  t=8   the disclosure family: one privater answer wins each ladder');
  const everybody = ['ada', bo, cy, dee, eve, fay, gus, hex];
  const answers: Record<string, Record<string, unknown>> = {
    authorship: { [bo]: { rung: 'anonymous' } },
    signing: { [cy]: { rung: 'nobody' } },
    judgments: { [dee]: { rung: 'never' } },
    chamber: { [eve]: { rung: 'closed' } },
  };
  const defaults: Record<string, unknown> = {
    authorship: { rung: 'public' }, signing: { rung: 'everybody' },
    judgments: { rung: 'after' }, chamber: { rung: 'public' },
  };
  for (const setting of Object.keys(answers)) {
    for (const m of everybody) {
      s.answer(8, m, setting as never,
        (answers[setting]![m] ?? defaults[setting]) as never);
    }
  }
  eq(s.settingState('authorship').value, { rung: 'anonymous' },
    'authorship: one anonym keeps the whole document unnamed');
  eq(s.settingState('signing').value, { rung: 'nobody' },
    'signing: nobody-signs beats seven everybody-signs');
  eq(s.settingState('judgments').value, { rung: 'never' },
    'judgments: never-revealed beats seven afters');
  eq(s.settingState('chamber').value, { rung: 'closed' },
    'chamber: one closed keeps it closed');

  say('  t=9   quorum (share), the bar, lapse, machines, applications, pace, rate');
  for (const m of everybody) {
    s.answer(9, m, 'quorum', { form: 'share', n: m === fay ? 75 : 50 });
    s.answer(9, m, 'bar', { pct: m === hex ? 82 : 66 });
    s.answer(9, m, 'lapse', { afterMs: m === gus ? null : 90 * 86_400_000 });
    s.answer(9, m, 'machines', { enabled: false, budget: 0 });
    s.answer(9, m, 'applications', { holder: 'members', joinPolicy: 'invite' });
    s.answer(9, m, 'removal', { rung: m === dee ? 'everyone' : 'others' });
    s.answer(9, m, 'pace', { shape: 'fixed' });
    s.answer(9, m, 'rate', { grant: m === bo ? 6 : 4, cap: 8, dripMinutes: 240 });
  }
  eq(s.settingState('quorum').value, { form: 'share', n: 75 },
    'quorum: the highest stated minimum binds (fay wanted 75%)');
  eq(s.settingState('bar').value, { pct: 82 },
    'the bar: hex needed 82, so 82 it is');
  eq(s.settingState('lapse').value, { afterMs: null },
    'lapse: never is the longest quiet spell of all');
  eq(s.settingState('removal').value, { rung: 'everyone' },
    "removal (🚪 Q401a): one member who wants their own say keeps everyone's answer counted");
  eq(s.settingState('rate').value, { grant: 6, cap: 8, dripMinutes: 240 },
    'rate: the most generous grant wins (§9.0)');
  check(s.constitutedAtT === 9, 'the document constituted when the last gate resolved');
  check(s.canJudge(), 'judging opened at that moment (§9.0b)');

  const dist = view(s, bo).resolutions.find((r) => r.setting === 'bar')!;
  eq(dist.distribution.length, 8, 'the distribution is published — 8 answers, no names');

  check(s.verifyChain(), 'the hash chain verifies end to end');
  const replayed = ConstitutionSession.replay([...s.logEntries()]);
  check(replayed.rollingHash() === s.rollingHash(),
    'replay re-folds the whole founding bit-identically');
  say(`     rolling hash ${s.rollingHash().slice(0, 16)}…`);
}

/* ========================================================================= */
say('\n== clerk variant: an anonymous convenor who administers and never writes ==');
{
  const s = ConstitutionSession.open({
    title: 'T', slug: 't',
    convenor: { id: 'kit', email: 'kit@example.org', isMember: false },
  }, 0);
  eq(s.E(), 0, 'a clerk counts toward nothing');
  const bo = s.invite(1, 'bo@example.org');
  s.arrive(1, bo);
  s.confirmStartingText(2, '');
  check(s.textConfirmed, 'an empty starting text somebody chose is a real state (§9.0b)');
  s.answer(2, bo, 'ending', { endsAtMs: null });
  for (const [id, v] of Object.entries({
    bar: { pct: 66 }, pace: { shape: 'fixed' }, quorum: { form: 'count', n: 1 },
    authorship: { rung: 'sealed' }, signing: { rung: 'each' },
    judgments: { rung: 'after' }, chamber: { rung: 'link' },
    applications: { holder: 'members', joinPolicy: 'invite' },
    machines: { enabled: false, budget: 0 }, removal: { rung: 'everyone' },
    lapse: { afterMs: null },
  })) {
    s.reclaim(2, id as never);
    s.setSetting(2, id as never, v as never);
  }
  s.setSetting(2, 'rate', { grant: 4, cap: 8, dripMinutes: 240 });
  check(s.constitutedAtT !== null, 'a convenor may settle the constitution alone (§9.0a)');
  check(!s.canPropose('kit'), 'a clerk cannot propose — no wallet, no judgments, no quorum');
  check(s.canPropose(bo), 'the one member can');
  const block = constitutionBlock(s);
  check(block.convenor.name === null, 'an anonymous convenor simply shows no name');
  check(s.memberRecords().get(bo)!.okOwed.size >= 8,
    'the member is owed an OK on every rule the clerk set alone');
}

/* ========================================================================= */
say('\n== motions, ordinary route: raced at the bar through the seam ==========');
{
  const { s, bo } = threeRoom();
  const m = s.openMotion(3, bo, { kind: 'set', setting: 'ending',
    value: { endsAtMs: 2_000_000 } });
  say('  bo motions to move the close later — ordinary by Q329, stake 1');
  eq(s.motionRecords().get(m)!.stake, 1, 'an ordinary motion costs an edit');
  s.adjudicateOrdinaryMotion(4, m, 'carried');
  eq(s.settingState('ending').value, { endsAtMs: 2_000_000 },
    'carried at the bar: the close moves');
  check(s.bar(5) === 66, 'and the fixed bar does not blink (§4.3)');

  const w = s.openMotion(5, bo, { kind: 'set', setting: 'ending',
    value: { endsAtMs: 3_000_000 } });
  s.withdrawMotion(6, bo, w);
  check(s.motionRecords().get(w)!.status === 'withdrawn',
    'withdrawal hands the stake back whole (§3.3a)');
}

/* ========================================================================= */
say('\n== motions, constitutional route: unanimity over the live electorate ===');
{
  const { s, bo, cy } = threeRoom();
  const m = s.openMotion(3, bo, { kind: 'set', setting: 'bar', value: { pct: 80 } });
  say('  bo proposes raising the bar to 80 — a unanimous vote on a typed amendment');
  eq(s.motionRecords().get(m)!.stake, 0, 'consent stays free (§9.6)');
  check(view(s, cy).myHeldMotion === null && view(s, bo).myHeldMotion === m,
    'the 🏛️ is out, and it is bo’s');
  check(s.motionRecords().get(m)!.answers.get(bo) === 'accept',
    'and bo stands at accept from the open — proposers prefer their own proposals (v0.49)');
  s.answerMotion(4, 'ada', m, 'accept');
  s.answerMotion(5, cy, m, 'keep');
  check(s.motionRecords().get(m)!.status === 'running',
    'a standing keep blocks but does not kill');
  eq(s.settingState('bar').value, { pct: 66 }, 'until it settles, what stands stands');
  const blind = view(s, 'ada').motions.find((x) => x.id === m)!;
  check(blind.answeredCount === 3 && JSON.stringify(blind).indexOf('keep') < 0,
    'while it runs, only the count shows — no split, no names');
  s.answerMotion(6, cy, m, 'abstain');
  check(s.motionRecords().get(m)!.status === 'carried',
    'cy stands down to abstain and it carries — everyone at accept-or-abstain, zero keep');
  eq(s.settingState('bar').value, { pct: 80 }, 'the amendment applied in the fold');

  say('  an arrival mid-motion joins the electorate — no snapshot (v0.48)');
  const inv = s.openMotion(8, bo, { kind: 'invite', email: 'dee@example.org' }, 'dee kept our minutes for a year');
  s.answerMotion(9, 'ada', inv, 'accept');
  s.answerMotion(9, bo, inv, 'accept');
  s.answerMotion(9, cy, inv, 'accept');
  check(s.motionRecords().get(inv)!.status === 'carried',
    'an invitation is a constitutional motion — one refusal would have kept dee out');
  const dee = [...s.memberRecords().values()].find((x) => x.email === 'dee@example.org')!;
  eq(s.E(), 3, 'invited, dee still counts toward nothing');
  const m2 = s.openMotion(10, bo, { kind: 'set', setting: 'chamber',
    value: { rung: 'closed' } });
  s.answerMotion(11, cy, m2, 'accept');
  s.arrive(12, dee.id);
  s.answerMotion(13, 'ada', m2, 'accept');
  check(s.motionRecords().get(m2)!.status === 'running',
    'dee arrived under the motion, so dee’s answer is now needed too');
  s.answerMotion(14, dee.id, m2, 'accept');
  check(s.motionRecords().get(m2)!.status === 'carried',
    'and with it, the motion carries');
}

/* ========================================================================= */
say('\n== the crown: reserved is assent, not silence ==========================');
{
  const { s, bo } = threeRoom();
  const m = s.openMotion(3, bo, { kind: 'set', setting: 'rate',
    value: { grant: 6, cap: 10, dripMinutes: 120 } });
  s.adjudicateOrdinaryMotion(4, m, 'carried');
  check(s.motionRecords().get(m)!.status === 'awaiting-crown',
    'the rate is reserved, so the carried change goes to ada as a 👑 question');
  const q = view(s, 'ada').crownTasks[0]!;
  s.answerCrownQuestion(5, q.id, 'accept');
  eq(s.settingState('rate').value, { grant: 6, cap: 10, dripMinutes: 120 },
    'acceptance applies it');

  const m2 = s.openMotion(6, bo, { kind: 'set', setting: 'rate',
    value: { grant: 2, cap: 4, dripMinutes: 480 } });
  s.adjudicateOrdinaryMotion(7, m2, 'carried');
  const q2 = view(s, 'ada').crownTasks[0]!;
  s.answerCrownQuestion(8, q2.id, 'reject');
  check(s.motionRecords().get(m2)!.status === 'held',
    'rejection files it, on the record');
  s.setSetting(9, 'rate', { grant: 5, cap: 9, dripMinutes: 180 });
  check(s.settingState('rate').settledBy === 'crown',
    'while the crown’s own hand stays unilateral on reserved matters');
}

/* ========================================================================= */
say('\n== the crown, v0.49: assent ends either route; a lapsed crown assents by itself ==');
{
  const { s, bo, cy } = threeRoom({ lapse: { afterMs: 10_000 } });
  const m = s.openMotion(3, bo, { kind: 'set', setting: 'quorum',
    value: { form: 'share', n: 80 } });
  say('  bo moves the reserved quorum — constitutional by kind, reservation adds assent');
  s.answerMotion(4, 'ada', m, 'accept');
  s.answerMotion(5, cy, m, 'accept');
  check(s.motionRecords().get(m)!.status === 'awaiting-crown',
    'unanimity carries the change to the crown, not into the document');
  const q = view(s, 'ada').crownTasks[0]!;
  s.answerCrownQuestion(6, q.id, 'accept');
  eq(s.settingState('quorum').value, { form: 'share', n: 80 }, 'assent applies it');

  say('  ada goes quiet; the members stay active; the §9.5a clock runs');
  const m2 = s.openMotion(7_000, bo, { kind: 'set', setting: 'rate',
    value: { grant: 6, cap: 10, dripMinutes: 120 } });
  s.setIdentity(9_000, bo, { name: 'Bo' });
  s.setIdentity(9_000, cy, { name: 'Cy' });
  s.tick(16_500);
  check(s.crownLapsed, 'the crown lapsed with its member');
  s.adjudicateOrdinaryMotion(16_800, m2, 'carried');
  check(s.motionRecords().get(m2)!.status === 'carried',
    'lapse is automatic abstention: assent grants itself, the change applies');
  check(s.settingState('title').holder === 'convenor',
    'and nothing changes hands — every reserved setting stays reserved');
  s.memberReturn(17_000, 'ada');
  check(!s.crownLapsed, 'revival is logging in: the assent requirement resumes');
}

/* ========================================================================= */
say('\n== membership lifecycle: sign-out, the freeze, the lapse ===============');
{
  const { s, bo, cy } = threeRoom({ lapse: { afterMs: 10_000 } });
  s.signOut(3, cy, 'holding');
  check(!s.frozen && s.quorumBase() === 3,
    'holding: cy stays in the base — no walkout can hide as attrition (§9.5)');
  s.signOut(4, bo, 'abstaining');
  check(!s.frozen && s.quorumBase() === 2,
    'one abstainer leaves the base; two counted still meet the quorum of two');
  s.signOut(5, 'ada', 'abstaining');
  check(s.frozen, 'the base fell below quorum: frozen — a stall with an alarm');
  s.memberReturn(6, bo);
  check(!s.frozen, 'and it thaws when enough return');

  say('  the clock: cy is quiet from t=3; lapse is 10 000 with warning at 75%');
  s.setIdentity(7_000, 'ada', { name: 'Ada' });
  s.setIdentity(7_000, bo, { name: 'Bo' });
  s.tick(8_000);
  check(s.memberRecords().get(cy)!.lapseWarned, 'cy was warned by email first');
  s.tick(13_500);
  check(s.memberRecords().get(cy)!.lapsed, 'then lapsed, with the package sent');
  eq(s.E(), 2, 'a lapsed membership leaves E (v0.48)');
  s.memberReturn(14_000, cy);
  check(!s.memberRecords().get(cy)!.lapsed && s.E() === 3,
    'revival is just logging in again — the rule was consented at the founding');

  check(s.verifyChain(), 'the lifecycle log verifies');
  const r = ConstitutionSession.replay([...s.logEntries()]);
  check(r.rollingHash() === s.rollingHash(), 'and replays bit-identically');
  say(`     rolling hash ${s.rollingHash().slice(0, 16)}…`);
}

/* ========================================================================= */

function threeRoom(opts: { lapse?: { afterMs: number | null } } = {}) {
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter', slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);
  const bo = s.invite(1, 'bo@example.org');
  const cy = s.invite(1, 'cy@example.org');
  s.arrive(1, bo);
  s.arrive(1, cy);
  s.answer(1, 'ada', 'ending', { endsAtMs: 500_000 });
  s.answer(1, bo, 'ending', { endsAtMs: 1_000_000 });
  s.answer(1, cy, 'ending', { endsAtMs: 800_000 }); // resolved — bar may follow
  // bar and chamber resolve by ceremony, so they are members-held and a
  // motion on them applies without the crown (§9.7 v0.49)
  s.answer(1, 'ada', 'bar', { pct: 66 });
  s.answer(1, bo, 'bar', { pct: 60 });
  s.answer(1, cy, 'bar', { pct: 55 });
  s.answer(1, 'ada', 'chamber', { rung: 'link' });
  s.answer(1, bo, 'chamber', { rung: 'public' });
  s.answer(1, cy, 'chamber', { rung: 'public' });
  s.confirmStartingText(2, 'The clubhouse shall be kept open.');
  s.setSetting(2, 'rate', { grant: 4, cap: 8, dripMinutes: 240 });
  for (const [id, v] of Object.entries({
    pace: { shape: 'fixed' },
    quorum: { form: 'share', n: 60 },
    authorship: { rung: 'sealed' }, signing: { rung: 'each' },
    judgments: { rung: 'after' },
    applications: { holder: 'members', joinPolicy: 'invite' },
    machines: { enabled: false, budget: 0 },
    lapse: opts.lapse ?? { afterMs: null },
  })) {
    s.reclaim(2, id as never);
    s.setSetting(2, id as never, v as never);
  }
  return { s, bo, cy };
}

/* ========================================================================= */
if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
say('\nAll checks passed.');
