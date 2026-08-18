import { expect } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import type { LapseValue, ApplicationsValue } from '../src/values.js';

/**
 * A constituted document: convenor ada (member unless clerk), members bo and
 * cy, everything reserved-set except ending (resolved by ceremony, so it is
 * members-held), text confirmed, judging open at t=2.
 */
export function buildConstituted(opts: {
  clerk?: boolean;
  lapse?: LapseValue;
  applications?: ApplicationsValue;
  quorum?: { form: 'count' | 'share'; n: number };
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
  s.answer(1, bo, 'ending', { endsAtMs: 1_000_000 });
  s.answer(1, cy, 'ending', { endsAtMs: 800_000 });
  if (!opts.clerk) s.answer(1, 'ada', 'ending', { endsAtMs: 500_000 });
  s.confirmStartingText(2, 'The clubhouse shall be kept open.');
  s.setSetting(2, 'rate', { grant: 4, cap: 8, dripMinutes: 240 });
  const values = {
    bar: { pct: 66 },
    pace: { shape: 'fixed' },
    quorum: opts.quorum ?? { form: 'share', n: 60 },
    authorship: { rung: 'sealed' },
    signing: { rung: 'each' },
    judgments: { rung: 'after' },
    chamber: { rung: 'link' },
    applications: opts.applications ?? { holder: 'members', joinPolicy: 'invite' },
    lapse: opts.lapse ?? { afterMs: null },
    machines: { enabled: false, budget: 0 },
  } as const;
  for (const [id, v] of Object.entries(values)) {
    s.reclaim(2, id as never);
    s.setSetting(2, id as never, v as never);
  }
  expect(s.constitutedAtT).toBe(2);
  return { s, bo, cy };
}
