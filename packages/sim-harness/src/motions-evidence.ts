/**
 * Motion-race evidence (367b, Q390) — deterministic acceptance walks over
 * the engine-bridge: ordinary motions racing in engine-core, the crown's
 * assent between verdict and application, and a carried amendment binding
 * a race in flight. Narrative log meant to be read; no network, no wall
 * clock, no randomness. Exits non-zero on any failure.
 *
 *   npm run motions -w @draft/sim-harness
 */

import { ConstitutionSession } from '../../constitution/src/index.js';
import { EngineBridge } from '../../constitution/src/engine-bridge.js';

let failures = 0;
const say = (msg: string) => console.log(msg);
const check = (cond: boolean, msg: string) => {
  if (cond) { console.log(`     ✓ ${msg}`); }
  else { failures += 1; console.error(`     ✗ FAILED: ${msg}`); }
};
const eq = (a: unknown, b: unknown, msg: string) =>
  check(JSON.stringify(a) === JSON.stringify(b), `${msg} (${JSON.stringify(a)})`);

/** A constituted five-member charter: ada (convenor-member), bo…eve. */
function fixture(): { s: ConstitutionSession; bo: string; cy: string; dee: string; eve: string } {
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter', slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);
  const bo = s.invite(1, 'bo@example.org');
  const cy = s.invite(1, 'cy@example.org');
  const dee = s.invite(1, 'dee@example.org');
  const eve = s.invite(1, 'eve@example.org');
  for (const m of [bo, cy, dee, eve]) s.arrive(1, m);
  for (const q of ['ending', 'bar', 'chamber'] as const) {
    for (const m of ['ada', bo, cy, dee, eve]) {
      s.answer(1, m, q,
        q === 'ending' ? { endsAtMs: 1_000_000 }
          : q === 'bar' ? { pct: 66 } : { rung: 'link' });
    }
  }
  const values = {
    pace: { shape: 'fixed' },
    quorum: { form: 'share', n: 60 },
    authorship: { rung: 'sealed' },
    signing: { rung: 'each' },
    judgments: { rung: 'after' },
    applications: { holder: 'members', joinPolicy: 'invite' },
    machines: { enabled: false, budget: 0 },
    lapse: { afterMs: null },
  } as const;
  s.confirmStartingText(2, 'The clubhouse shall be kept open.');
  s.setSetting(2, 'rate', { grant: 4, cap: 8, dripMinutes: 240 }); // reserved
  for (const [id, v] of Object.entries(values)) {
    s.reclaim(2, id as never);
    s.setSetting(2, id as never, v as never);
  }
  if (s.constitutedAtT !== 2) throw new Error('fixture failed to constitute');
  return { s, bo, cy, dee, eve };
}

/* ========================================================================= */
say('\n== motion-race: an ordinary motion is the race machinery whole (Q390) ==');
{
  const { s, bo, cy, dee, eve } = fixture();
  const bridge = new EngineBridge(s, { t: 3, rngSeed: 'motions-evidence' });
  say('  t=3   the engine opens where the constitution settled (§9.0b)');
  eq(bridge.engine.document(), 'The clubhouse shall be kept open.',
    'the engine holds the starting text');
  eq(bridge.engine.adoptionFloor(), 3,
    'F = max(⌈60%×5⌉, min(⌈5/3⌉, 12)) — the quorum rides the floor (§4.2)');

  say('  t=10  bo moves the close to t=2,000,000 — an ordinary motion, raced');
  const a = bridge.openSetMotion(10, bo, 'ending', { endsAtMs: 2_000_000 },
    'a week is not enough');
  eq(a.route, 'ordinary', 'a date move is ordinary (Q329)');
  eq(bridge.engine.balance(bo, 10), 3, 'the stake left the wallet (§7)');

  say('  t=11  cy answers with a different date — propose-C over values');
  const b = bridge.openSetMotion(11, cy, 'ending', { endsAtMs: 1_500_000 },
    'meet in the middle');
  const race = bridge.engine.races().find((r) => r.settingId === 'ending')!;
  eq(race.members.length, 2, 'rival values join ONE race (Q390)');
  check(race.contested.length === 0, 'a setting race contests no text');

  say('  t=20  dee judges bo’s date over what stands — and that is enough:');
  say('        the two rival authors’ own voices already count toward the');
  say('        floor (§8.2’s small-roster caveat, live), so F=3 is met');
  bridge.judge(20, dee, a.candidate!, race.incumbentId, 'a');
  void eve;
  eq(s.motionRecords().get(a.motion)!.status, 'carried',
    'the race cleared bar and floor: adjudicated through the seam');
  eq(s.settingState('ending').value, { endsAtMs: 2_000_000 },
    'the constitution applied the value');
  eq(bridge.engine.standing('ending'), { endsAtMs: 2_000_000 },
    'the new standing flowed back as ground');
  eq(bridge.engine.constitution.windowEndMs, 2_000_000,
    'the engine constitution was amended in flight (§9.6/Q328)');
  check(bridge.engine.balance(bo, 22) > 3, 'the stake refunded on performance');
  eq(bridge.engine.balance(dee, 22), 4,
    'the close moved and nobody’s wallet did — the drip is real minutes (Q353)');
  eq(s.motionRecords().get(b.motion)!.status, 'running',
    'cy’s rival motion races on — against the new standing (§4.4)');
  const shifted = bridge.engine.races().find((r) => r.settingId === 'ending')!;
  check(shifted.incumbentId !== race.incumbentId,
    'the carried value is the race’s new ground');
}

/* ========================================================================= */
say('\n== the crown: verdict, then assent, then ground (§9.7) =================');
{
  const { s, bo, cy, dee } = fixture();
  const bridge = new EngineBridge(s, { t: 3, rngSeed: 'crown-walk' });
  say('  t=10  bo moves the reserved rate to grant 6 — raced like any motion');
  const m = bridge.openSetMotion(10, bo, 'rate',
    { grant: 6, cap: 8, dripMinutes: 240 }, 'more to start');
  const race = bridge.engine.races().find((r) => r.settingId === 'rate')!;
  bridge.judge(20, cy, m.candidate!, race.incumbentId, 'a');
  bridge.judge(21, dee, m.candidate!, race.incumbentId, 'a');
  eq(s.motionRecords().get(m.motion)!.status, 'awaiting-crown',
    'the room’s verdict is in; reserved is assent (§9.7)');
  eq(bridge.engine.standing('rate'), { grant: 4, cap: 8, dripMinutes: 240 },
    'the ground has NOT moved — rivals would still race the old standing');

  say('  t=30  ada accepts the 👑 question');
  const q = s.logEntries().map((e) => e.event)
    .find((e) => e.type === 'crown-question-opened' && e.motion === m.motion) as
    { question: string };
  s.answerCrownQuestion(30, q.question, 'accept');
  bridge.sync(31);
  eq(s.settingState('rate').value, { grant: 6, cap: 8, dripMinutes: 240 },
    'acceptance applied the value');
  eq(bridge.engine.standing('rate'), { grant: 6, cap: 8, dripMinutes: 240 },
    'and the ground moved only then');
  eq(bridge.engine.constitution.tokenGrant, 6, 'the engine economy follows');
}

/* ========================================================================= */
say('\n== an amendment binds a race in flight (§9.6/Q328) =====================');
{
  const { s, bo, cy, dee, eve } = fixture();
  const bridge = new EngineBridge(s, { t: 3, rngSeed: 'amendment-walk' });
  say('  t=10  bo races a date move; ada prefers what stands');
  const m = bridge.openSetMotion(10, bo, 'ending', { endsAtMs: 3_000_000 },
    'more time');
  const before = bridge.engine.races().find((r) => r.settingId === 'ending')!;
  bridge.judge(20, 'ada', m.candidate!, before.incumbentId, 'b');

  say('  t=30  cy moves constitutionally to remove the ending; all accept');
  const cm = s.openMotion(30, cy,
    { kind: 'set', setting: 'ending', value: { endsAtMs: null } });
  eq(s.motionRecords().get(cm)!.route, 'constitutional',
    'never is the constitutional answer inside the one question (§9.6)');
  s.answerMotion(31, 'ada', cm, 'accept');
  s.answerMotion(32, bo, cm, 'accept');
  s.answerMotion(33, dee, cm, 'accept');
  s.answerMotion(34, eve, cm, 'accept'); // cy stood at accept from the open
  eq(s.motionRecords().get(cm)!.status, 'carried', 'unanimity settled live');

  bridge.sync(40);
  const after = bridge.engine.races().find((r) => r.settingId === 'ending')!;
  check(after.incumbentId !== before.incumbentId,
    'the amendment ground-shifted the race in flight (§4.4)');
  eq(after.comparisons, 0, 'ada’s judgment locked with the old ground');
  eq(bridge.engine.adoptionThreshold(500_000), 0.66,
    'perpetual forces the fixed bar (§9.0), with no jump (§4.3)');
  eq(s.motionRecords().get(m.motion)!.status, 'running',
    'bo’s motion races on under the constitution as it stands');

  say('  t=900,000 the close: nothing cleared, the values stand');
  const render = bridge.close(900_000);
  eq(render.appliedSettings, [], 'no setting race cleared at the close');
  eq(s.motionRecords().get(m.motion)!.status, 'held', 'bo’s motion is held');
  say(`     · cs rolling hash     ${s.rollingHash().slice(0, 16)}…`);
  say(`     · engine rolling hash ${bridge.engine.rollingHash().slice(0, 16)}…`);
}

/* ========================================================================= */
if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
say('\nAll checks passed.');
