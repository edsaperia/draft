/**
 * **The error log's contract, over both stores** (plan stage 5a, after the
 * nh2026 convention). It was a file beside either backend until this
 * (Q1330), and on docs.vote the data dir is the ephemeral disk — so every
 * deploy and every restart deleted the whole record of what had gone wrong.
 * It is a row of the store now: `errors.jsonl` under the file backend, the
 * `errors` table under Postgres.
 *
 * One body, run by `unit.test.ts` against `FilePersistence` and by
 * `pg.test.ts` against `PgPersistence`, because the whole property being
 * asserted is that **the two stores answer alike**: a line read back is
 * `toEqual` the line that was written, absent fields still absent, the
 * newest first, and the bytes a member's free text can carry — a NUL, a
 * lone surrogate — surviving the round trip. Not a `.test.ts`, so the
 * runner does not collect it as a file with no tests of its own (the
 * `attest-wire.ts` precedent beside it).
 */
import { expect } from 'vitest';
import type { ErrorLine, Persistence } from '../src/persistence.js';

/** A refusal, as `logError` writes one. */
const refusal = (at: number, reason: string): ErrorLine => ({
  at, kind: 'refused', status: 400, method: 'POST', path: '/api/d/moon/cmd',
  doc: 'd-cea25a9578', slug: 'moon', seat: 'm-4', cmd: 'answer',
  args: '{"setting":"chamber"}', reason,
});

export async function errorLogContract(p: Persistence): Promise<void> {
  // an empty store has an empty tail, and does not have to have been written to
  expect(await p.readErrors()).toEqual([]);

  const one = refusal(1_000, "'chamber' is not collecting answers");
  const two = refusal(2_000, 'unknown command');
  // **a page error is the same line with different fields** (stage 5b): no
  // status, no command, a source file and line, and the build that served it
  const three: ErrorLine = {
    at: 3_000, kind: 'page', path: '/d/moon', doc: 'd-cea25a9578', slug: 'moon',
    seat: 'm-4', source: '/session.js', line: 4_212, col: 17, build: 'abc1234',
    reason: "TypeError: undefined is not an object (evaluating 'x.y')",
  };
  for (const line of [one, two, three]) await p.appendError(line);

  // **newest first**, and every field exactly as it was written — absent
  // stays absent, so the two stores cannot drift into printing differently
  expect(await p.readErrors()).toEqual([three, two, one]);
  expect(await p.readErrors(2)).toEqual([three, two]);
  expect(await p.readErrors(1)).toEqual([three]);
  // `status` and `cmd` were never written to the page line and are not there
  const [page] = await p.readErrors(1);
  expect(page).not.toHaveProperty('status');
  expect(page).not.toHaveProperty('cmd');
  expect(page).not.toHaveProperty('argsTruncated');

  // **the bytes jsonb would reject** (pg-persistence.ts's first decision): a
  // member's free text reaches this file through `args` and `reason`, and an
  // insert error inside a request's catch would turn one refusal into a 500
  const nasty: ErrorLine = {
    at: 4_000, kind: 'refused', status: 400, method: 'POST', path: '/api/d/moon/cmd',
    seat: 'm-4', cmd: 'propose-text', args: '{"lines":["a\u0000b\ud800"]}',
    argsTruncated: true, reason: 'the text at lines 3–4 is not what this proposal replaces',
  };
  await p.appendError(nasty);
  expect((await p.readErrors(1))[0]).toEqual(nasty);

  // two lines in the same millisecond keep the order they were written
  await p.appendError({ ...refusal(5_000, 'first'), cmd: 'a' });
  await p.appendError({ ...refusal(5_000, 'second'), cmd: 'b' });
  expect((await p.readErrors(2)).map((r) => r.cmd)).toEqual(['b', 'a']);
}
