/**
 * The golden walk (PRODUCTION.md stage 5): one long, deliberately wide
 * document life, scripted so that it never changes by accident.
 *
 * It exists to be *frozen*. The frozen log and the frozen projection of it
 * are the safety net under every later change to the engine and under the
 * Postgres migration at stage 6: a migration that moves rows must produce
 * a chain that verifies to the same rolling hash, and this is the log it
 * is checked against. Nothing here is random and nothing reads a clock —
 * the constitution package takes every id and every t from its caller —
 * so the same walk writes the same bytes on any machine, forever.
 *
 * Deliberately self-contained rather than built on test/helpers.ts: a
 * golden must be pinned to its own script, or a change to a shared helper
 * breaks the freeze for a reason that has nothing to do with the format.
 *
 * Widen it only by *appending* (see freeze.ts): an inserted act renumbers
 * every hash after it, which is a legitimate re-freeze but a large diff
 * that hides whatever else moved.
 */
import { ConstitutionSession } from '../../src/session.js';
import type { SettingId } from '../../src/catalogue.js';

export function goldenWalk(): ConstitutionSession {
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter',
    slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);

  /* -- the founding: invitations, arrivals, identity ---------------------- */
  const bo = s.invite(1, 'bo@example.org');
  const cy = s.invite(1, 'cy@example.org');
  const dee = s.invite(1, 'dee@example.org');
  s.arrive(2, bo);
  s.arrive(2, cy);
  s.setIdentity(2, bo, { name: 'Bo', picture: 'e🦊' });
  s.setIdentity(2, cy, { name: 'Cy', picture: null });
  s.setIdentity(3, 'ada', { name: 'Ada', picture: 'e🦉' });
  // dee never arrives: an invitation outstanding through the whole life
  s.uninvite(3, dee);

  /* -- the founder hands three to the room (§9.0a as amended 2026-08-21) --- *
   * Nothing arrives delegated: the hand-over is the act that opens a blind
   * question, so it stands in the log before any answer to one.            */
  s.delegate(3, 'ending');
  s.delegate(3, 'bar');
  s.delegate(3, 'chamber');

  /* -- the blind founding questions (§9.0a): maxima, live electorate ------ */
  s.answer(4, bo, 'ending', { endsAtMs: 1_000_000 });
  s.answer(4, cy, 'ending', { endsAtMs: 800_000 });
  s.answer(4, 'ada', 'ending', { endsAtMs: 500_000 });
  s.answer(5, bo, 'bar', { pct: 66 });
  s.answer(5, cy, 'bar', { pct: 55 });
  s.answer(5, 'ada', 'bar', { pct: 60 });
  s.answer(6, bo, 'chamber', { rung: 'link' });
  s.answer(6, cy, 'chamber', { rung: 'public' });
  s.answer(6, 'ada', 'chamber', { rung: 'public' });

  /* -- what the founder holds, and what they give up --------------------- */
  s.confirmStartingText(7, 'The clubhouse shall be kept open to members.');
  s.setSetting(7, 'rate', { grant: 4, cap: 8, dripMinutes: 240 });
  const settled: Array<[SettingId, unknown]> = [
    ['pace', { shape: 'fixed' }],
    ['quorum', { form: 'share', n: 60 }],
    ['authorship', { rung: 'sealed' }],
    ['signing', { rung: 'each' }],
    ['judgments', { rung: 'after' }],
    ['applications', { holder: 'members', joinPolicy: 'apply' }],
    ['removal', { rung: 'everyone' }],
    ['machines', { enabled: false, budget: 0 }],
    ['lapse', { afterMs: null }],
  ];
  for (const [id, value] of settled) {
    s.reclaim(8, id);
    s.setSetting(8, id, value as never);
  }
  s.begin(8); // 🍾 (Q443): the same constituted event, at the same t, by the founder's hand
  /* -- live: an ordinary motion raced, a constitutional one by consent --- */
  const rate = s.openMotion(9, bo, {
    kind: 'set', setting: 'rate', value: { grant: 6, cap: 10, dripMinutes: 120 },
  }, 'four is thin for a long charter');
  s.adjudicateOrdinaryMotion(10, rate, 'carried');

  const barUp = s.openMotion(11, cy, { kind: 'set', setting: 'bar', value: { pct: 75 } },
    'the last two adoptions were close');
  s.answerMotion(11, bo, barUp, 'accept');
  s.answerMotion(12, 'ada', barUp, 'accept');   // the mover stands at accept already

  const withdrawn = s.openMotion(13, bo, { kind: 'set', setting: 'lapse',
    value: { afterMs: 5_000_000 } }, 'a quiet spell should mean something');
  s.withdrawMotion(13, bo, withdrawn);          // the 🏛️ returns whole

  /* -- somebody asks to join, and the room decides ----------------------- */
  const eve = s.startApplication(14, 'eve@example.org');
  s.verifyApplication(14, eve);
  s.submitApplication(15, eve, { name: 'Eve', picture: 'e🦡', words: 'I keep bees.' });

  /* -- an owed acknowledgment, a sign-out, and the clock running --------- */
  s.giveOk(16, bo, 'bar');
  s.signOut(17, cy, 'abstaining');
  s.tick(18);
  s.memberReturn(19, cy);
  return s;
}

/**
 * A stable projection of the walk: everything a migration could silently
 * change, and nothing that is merely an object identity. Frozen beside
 * the log, because a chain that verifies still says nothing about whether
 * the fold read it the same way.
 */
export function snapshotOf(s: ConstitutionSession): unknown {
  const settings: Record<string, unknown> = {};
  for (const entry of s.logEntries()) {
    const id = (entry.event as { setting?: string }).setting;
    if (id === undefined || settings[id] !== undefined) continue;
    const st = s.settingState(id as SettingId);
    settings[id] = { value: st.value, holder: st.holder, powers: st.powers };
  }
  return {
    entries: s.logEntries().length,
    rollingHash: s.rollingHash(),
    chainVerifies: s.verifyChain(),
    constitutedAtT: s.constitutedAtT,
    E: s.E(),
    quorumBase: s.quorumBase(),
    members: [...s.memberRecords().values()].map((m) => ({
      id: m.id, email: m.email, arrivedAtT: m.arrivedAtT, removed: m.removed,
      lapsed: m.lapsed, signedOut: m.signedOut, name: m.name, picture: m.picture,
    })),
    settings,
  };
}
