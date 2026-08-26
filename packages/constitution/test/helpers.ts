import { expect } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import type { LapseValue, ApplicationsValue } from '../src/values.js';

/**
 * A constituted document: convenor ada (member unless clerk), members bo and
 * cy, everything reserved-set except ending, bar and chamber (resolved by
 * ceremony, so members-held — motions on them apply without the crown),
 * text confirmed, judging open at t=2.
 */
export function buildConstituted(opts: {
  clerk?: boolean;
  lapse?: LapseValue;
  applications?: ApplicationsValue;
  quorum?: { form: 'count' | 'share'; n: number };
  removal?: { price: 'consent' | 'assembly' | 'proposal' };
  /** 🪪 the price of admission (entry 94); default everyone must agree. */
  membership?: { price: 'assembly' | 'proposal' | 'pen' };
  /** The resolved bar (every member answers it); default resolves to 66. */
  bar?: number;
  /**
   * The founder's powers over the acts at the doors (entry 94), spent at 🍾:
   * default neither door holds anything, so a carried invitation or removal
   * lands without the crown, as the old members-held register did. A legacy
   * `applications.holder` defines ✉️'s pair itself and wins over this.
   */
  doors?: { invite?: { unilateral: boolean; assent: boolean };
    remove?: { unilateral: boolean; assent: boolean } };
} = {}) {
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter',
    slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: !opts.clerk },
  }, 0);
  const bo = s.invite(1, 'bo@example.org');
  const cy = s.invite(1, 'cy@example.org');
  s.arrive(1, bo);
  s.arrive(1, cy);
  // **Nothing arrives delegated** (Ed, 2026-08-21, amending §9.0a): the three
  // the room decides are handed over by the founder first, and that act is
  // what opens their blind questions. Before, they collected from the moment
  // the document existed.
  s.delegate(1, 'ending');
  s.delegate(1, 'bar');
  s.delegate(1, 'chamber');
  // ending resolves first: bar waits on it (§9.0a deps)
  s.answer(1, bo, 'ending', { endsAtMs: 1_000_000 });
  s.answer(1, cy, 'ending', { endsAtMs: 800_000 });
  if (!opts.clerk) s.answer(1, 'ada', 'ending', { endsAtMs: 500_000 });
  s.answer(1, bo, 'bar', { pct: opts.bar ?? 66 });
  s.answer(1, cy, 'bar', { pct: opts.bar ?? 55 });
  if (!opts.clerk) s.answer(1, 'ada', 'bar', { pct: opts.bar ?? 60 });
  s.answer(1, bo, 'chamber', { rung: 'link' });
  s.answer(1, cy, 'chamber', { rung: 'public' });
  if (!opts.clerk) s.answer(1, 'ada', 'chamber', { rung: 'public' });
  s.confirmStartingText(2, 'The clubhouse shall be kept open.');
  s.setSetting(2, 'rate', { grant: 4, cap: 8, dripMinutes: 240 });
  // machines (ordinary since Q352) before lapse, so the last gate set is
  // lapse and the document constitutes on it
  const values = {
    pace: { shape: 'fixed' },
    quorum: opts.quorum ?? { form: 'share', n: 60 },
    authorship: { rung: 'sealed' },
    judgments: { rung: 'after' },
    applications: opts.applications ?? { apply: false },
    membership: opts.membership ?? { price: 'assembly' },
    removal: opts.removal ?? { price: 'consent' },
    machines: { enabled: false, budget: 0 },
    lapse: opts.lapse ?? { afterMs: null },
  } as const;
  for (const [id, v] of Object.entries(values)) {
    s.reclaim(2, id as never);
    s.setSetting(2, id as never, v as never);
  }
  // the doors: laid down before the start, spent at 🍾 (R-048)
  const legacyHolder = opts.applications?.holder !== undefined;
  for (const door of ['door:invite', 'door:remove'] as const) {
    if (door === 'door:invite' && legacyHolder) continue;
    const keep = (door === 'door:invite' ? opts.doors?.invite : opts.doors?.remove)
      ?? { unilateral: false, assent: false };
    if (!keep.unilateral) s.relinquish(2, door, 'unilateral');
    if (!keep.assent) s.relinquish(2, door, 'assent');
  }
  s.begin(2); // 🍾 — the founder's explicit start (Q443)
  expect(s.constitutedAtT).toBe(2);
  return { s, bo, cy };
}

/**
 * After the start the founder holds nothing on the Text (CLAUDE.md `🍾 Begin`:
 * the start lays down ✒️ and 🛡️ on it). The road to a held shield is the
 * design's own: a constitutional `reserve` motion, landing without assent.
 */
export function reserveTextShield(s: ConstitutionSession, mover: string,
  others: string[], t: number): void {
  const m = s.openMotion(t, mover, { kind: 'reserve', setting: 'startingText', power: 'assent' });
  for (const o of others) s.answerMotion(t, o, m, 'accept');
  expect(s.motionRecords().get(m)!.status).toBe('carried');
  expect(s.settingState('startingText').powers.assent).toBe(true);
}
