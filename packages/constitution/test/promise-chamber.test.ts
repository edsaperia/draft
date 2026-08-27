/**
 * **Promise-coverage — 🌍 chamber, the fold half** (backlog entry 82, series
 * 77). One setting, three rungs — `closed` · `link` · `public` — and one
 * question asked of each: does the machinery keep what the document says?
 *
 * **This file is a lock on a seam's contract, not a claim that the fold
 * enforces 🌍.** It does not. `view(s, member)` in `view.ts` consults no
 * rung at all: blindness there is about *answers* — your own and nobody
 * else's — and who may call `view` is the server's business (SPEC §3.5,
 * the file's own docblock: *discipline in the mock, security on the
 * server*). So the fold-side promise is the negative one, and it is worth
 * pinning precisely because a later refactor that "moved the 🌍 check down
 * into the module" would look like tidying and would in fact move the wall
 * to a layer that has never been the wall.
 *
 * The four `it`s below say, in order:
 *
 * 1. a member's `view()` is byte-identical at `closed`, `link` and `public`
 *    but for 🌍's own row in `settings` — the rung is data, not a filter;
 * 2. `view()` answers for an id the session has never seen, with the full
 *    register, emails and all — which is exactly why the server may never
 *    hand a stranger a `view()` and must build `strangerView` instead
 *    (`packages/server/src/server.ts`, and `promise-chamber.test.ts` beside
 *    this one in `packages/server/test` is the lock on that);
 * 3. lapsing does not shut a reader out — §9.5a, a stall and not a
 *    departure, and `seatAlive` asks only `!m.removed`;
 * 4. a removed member leaves `members[]` and `view()` still answers for
 *    their id — the fold has no notion of a dead seat, so the server's
 *    `seatAlive` (review #1, finding 1) is the only thing standing between
 *    a removed member's ninety-day cookie and a full member read.
 *
 * What is **not** here: any assertion that a rung withholds anything. There
 * is nothing in this package to assert it of. The route table — rung ×
 * reader × epoch, with raw-body assertions — is the server-side file.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { view } from '../src/view.js';
import type { ChamberValue } from '../src/values.js';

/**
 * A constituted document differing from its siblings in exactly one thing:
 * 🌍's rung. Deliberately **not** `helpers.ts`'s `buildConstituted`, which
 * delegates 🌍 and resolves it by ceremony to `link` — a founder-set rung
 * is the only way to stand the same document three times over and have the
 * deep-equal below mean what it says.
 */
function built(rung: 'closed' | 'link' | 'public',
  opts: { lapseMs?: number; endsAtMs?: number } = {}) {
  const ends = opts.endsAtMs ?? 500_000;
  const s = ConstitutionSession.open({
    title: 'Hollow Oak Club Charter',
    slug: 'hollow-oak',
    convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  }, 0);
  const bo = s.invite(1, 'bo@example.org');
  const cy = s.invite(1, 'cy@example.org');
  s.arrive(1, bo);
  s.arrive(1, cy);
  s.setIdentity(1, bo, { name: 'Bo Vane' });
  // ending resolves first: bar waits on it (§9.0a deps)
  s.delegate(1, 'ending');
  s.delegate(1, 'bar');
  for (const [id, mul] of [['ada', 1], [bo, 2], [cy, 1.6]] as const) {
    s.answer(1, id, 'ending', { endsAtMs: ends * mul });
  }
  for (const [id, v] of [['ada', 60], [bo, 66], [cy, 55]] as const) {
    s.answer(1, id, 'bar', { pct: v });
  }
  s.confirmStartingText(2, 'The clubhouse shall be kept open.');
  const values = {
    rate: { grant: 4, cap: 8, dripMinutes: 240 },
    chamber: { rung },
    pace: { shape: 'fixed' },
    quorum: { form: 'count', n: 1 },
    authorship: { rung: 'sealed' },
    judgments: { rung: 'after' },
    applications: { apply: false },
    admission: { price: 'assembly' },
    removal: { price: 'consent' },
    machines: { enabled: false, budget: 0 },
    lapse: opts.lapseMs === undefined ? { afterMs: null } : { afterMs: opts.lapseMs },
  } as const;
  for (const [id, v] of Object.entries(values)) {
    s.setSetting(2, id as never, v as never);
  }
  for (const door of ['door:invite', 'door:remove'] as const) {
    s.relinquish(2, door, 'unilateral');
    s.relinquish(2, door, 'assent');
  }
  s.begin(2);
  expect(s.constitutedAtT).toBe(2);
  return { s, bo, cy };
}

const RUNGS = ['closed', 'link', 'public'] as const;

/** A member view with 🌍's own row lifted out, so what is left is everything the rung is *not* about. */
function withoutChamber(v: ReturnType<typeof view>) {
  return { ...v, settings: v.settings.filter((x) => x.setting !== 'chamber') };
}

describe('🌍 the fold is rung-blind: `view()` is the same read at every rung', () => {
  it('a member reads the identical view at closed, link and public but for 🌍\'s own row', () => {
    const seen = RUNGS.map((rung) => {
      const { s, bo } = built(rung);
      const v = view(s, bo);
      // the rung is data on its own row, and nothing else moves
      expect(v.settings.find((x) => x.setting === 'chamber')!.value)
        .toEqual({ rung } as ChamberValue);
      return withoutChamber(v);
    });
    expect(seen[1]).toEqual(seen[0]);
    expect(seen[2]).toEqual(seen[0]);
    // and the text-bearing fields the rung is *supposed* to gate are served
    // at every rung alike: the register with its addresses, the whole
    // catalogue of standing values, and `gates.reading` unconditionally true
    for (const rung of RUNGS) {
      const { s, bo } = built(rung);
      const v = view(s, bo);
      expect(v.gates.reading).toBe(true);
      expect(v.members.map((m) => m.email).sort())
        .toEqual(['ada@example.org', 'bo@example.org', 'cy@example.org']);
    }
  });

  it('`view()` answers for an id the session has never seen — the wall is the server\'s', () => {
    // the point of this `it` is to *record* that `view()` is not the wall,
    // so the server-side test can never be refactored into relying on it
    const { s } = built('closed');
    const stranger = view(s, 'nobody-the-session-has-heard-of');
    expect(stranger.identity)
      .toEqual({ name: null, picture: null, nameSet: false, pictureSet: false });
    expect(stranger.owedOks).toEqual([]);
    expect(stranger.crownTasks).toEqual([]);
    expect(stranger.myHeldMotion).toBeNull();
    expect(stranger.gates.proposing).toBe(false);
    // …and yet the register is served in full, emails included (Q391), at
    // the most private rung there is. Nothing here refuses; the refusal is
    // `session === null || !seatAlive(…)` in server.ts.
    expect(stranger.members.map((m) => m.email).sort())
      .toEqual(['ada@example.org', 'bo@example.org', 'cy@example.org']);
    expect(stranger.members.find((m) => m.email === 'bo@example.org')!.name).toBe('Bo Vane');
    expect(stranger.settings.find((x) => x.setting === 'chamber')!.value)
      .toEqual({ rung: 'closed' });
  });

  it('a blind question\'s answers stay the answerer\'s, whoever asks — and 🌍 does not enter it', () => {
    // pre-start, with 🌍 delegated and collecting: the one epoch in which a
    // `myAnswer` exists to withhold. Blindness here is about answers and
    // never about the rung — which is the distinction this whole file draws.
    const s = ConstitutionSession.open({
      title: 'Hollow Oak Club Charter', slug: 'hollow-oak',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    const bo = s.invite(1, 'bo@example.org');
    const cy = s.invite(1, 'cy@example.org');
    s.arrive(1, bo);
    s.arrive(1, cy);
    s.delegate(1, 'chamber');
    s.answer(1, bo, 'chamber', { rung: 'closed' });
    const q = (member: string) => view(s, member).questions.find((x) => x.setting === 'chamber')!;
    expect(q(bo).myAnswer).toEqual({ rung: 'closed' });
    expect(q(cy).myAnswer).toBeNull();
    expect(q('nobody-the-session-has-heard-of').myAnswer).toBeNull();
    // the count is all the question may say while it runs (§9.0a)
    expect(q(cy).answeredCount).toBe(1);
    expect(view(s, cy).settings.find((x) => x.setting === 'chamber')!.value).toBeNull();
  });
});

describe('🌍 the readers the fold knows about', () => {
  it('lapsing does not shut a reader out — a stall, not a departure (§9.5a)', () => {
    const DAY = 24 * 3600_000;
    const { s, bo, cy } = built('closed', { lapseMs: 7 * DAY, endsAtMs: 400 * DAY });
    const before = view(s, cy);
    expect(before.members.find((m) => m.id === cy)!.lapsed).toBe(false);
    // only `cy` goes quiet: the other two are seen a day before the tick, so
    // the room keeps its quorum and the freeze (§9.5) stays out of the way.
    // A day, not a minute: `seen` records at most hourly.
    s.seen(7 * DAY, 'ada');
    s.seen(7 * DAY, bo);
    s.tick(8 * DAY);
    const after = view(s, cy);
    expect(after.members.find((m) => m.id === cy)!.lapsed).toBe(true);
    expect(after.frozen).toBe(false);
    // still a member, still a full read: the register with its addresses,
    // the standing values, `gates.reading`. `seatAlive` asks only
    // `!m.removed`, so the server agrees with the fold here.
    expect(after.gates.reading).toBe(true);
    expect(after.members.map((m) => m.email).sort())
      .toEqual(['ada@example.org', 'bo@example.org', 'cy@example.org']);
    expect(after.settings.find((x) => x.setting === 'chamber')!.value).toEqual({ rung: 'closed' });
    // …and what a lapse *does* move is one flag on one row, the electorate
    // the flag is about, and the one gate that is about **acting**: a lapsed
    // member may not propose. Reading and judging are untouched, which is
    // §9.5a's *stall, not departure* stated as three booleans.
    expect(before.gates).toEqual({ reading: true, proposing: true, judging: true });
    expect(after.gates).toEqual({ reading: true, proposing: false, judging: true });
    const bare = (v: ReturnType<typeof view>) =>
      ({ ...v, members: [], questions: [], motions: [], gates: null });
    expect(bare(after)).toEqual(bare(before));
  });

  it('a removed member leaves the register, and `view()` still answers for their id', () => {
    // ❌'s ✒️ retained through 🍾 so the founder may exile at will (§9.7 rule 9)
    const s = ConstitutionSession.open({
      title: 'Hollow Oak Club Charter', slug: 'hollow-oak',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
    }, 0);
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.confirmStartingText(2, 'The clubhouse shall be kept open.');
    for (const [id, v] of Object.entries({
      rate: { grant: 4, cap: 8, dripMinutes: 240 },
      ending: { endsAtMs: 1_000_000 }, bar: { pct: 60 }, chamber: { rung: 'closed' },
      pace: { shape: 'fixed' }, quorum: { form: 'count', n: 1 },
      authorship: { rung: 'sealed' }, judgments: { rung: 'after' },
      applications: { apply: false }, admission: { price: 'assembly' },
      removal: { price: 'consent' }, machines: { enabled: false, budget: 0 },
      lapse: { afterMs: null },
    })) s.setSetting(2, id as never, v as never);
    s.relinquish(2, 'door:invite', 'unilateral');
    s.relinquish(2, 'door:invite', 'assent');
    s.relinquish(2, 'door:remove', 'assent');
    s.begin(2);
    s.remove(3, bo);
    expect(view(s, 'ada').members.map((m) => m.id)).toEqual(['ada']);
    // the fold has no dead seat: a removed id still gets a full projection,
    // register and all. `seatAlive` in server.ts is the whole of the
    // defence, and it is one `if` (review #1, finding 1).
    const theirs = view(s, bo);
    expect(theirs.gates.reading).toBe(true);
    expect(theirs.members.map((m) => m.email)).toEqual(['ada@example.org']);
    expect(theirs.settings.find((x) => x.setting === 'chamber')!.value).toEqual({ rung: 'closed' });
  });
});
