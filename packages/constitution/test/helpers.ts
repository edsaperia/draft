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
  removal?: { rung: 'everyone' | 'others' | 'ordinary' };
  /** The resolved bar (every member answers it); default resolves to 66. */
  bar?: number;
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
    signing: { rung: 'each' },
    judgments: { rung: 'after' },
    applications: opts.applications ?? { holder: 'members', joinPolicy: 'invite' },
    removal: opts.removal ?? { rung: 'everyone' },
    machines: { enabled: false, budget: 0 },
    lapse: opts.lapse ?? { afterMs: null },
  } as const;
  for (const [id, v] of Object.entries(values)) {
    s.reclaim(2, id as never);
    s.setSetting(2, id as never, v as never);
  }
  expect(s.constitutedAtT).toBe(2);
  return { s, bo, cy };
}
