// The Rules' closing line (Q464, issue #230): *Proposals closed at 18:00 on
// 14 November. 9 members made 31 proposals: 14 passed, 12 didn’t, 3 were
// withdrawn and 2 were still open.* The copy function alone, loaded in a vm
// as reason-links.test.ts loads copy.js.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const design = join(import.meta.dirname, '..', '..', '..', 'design');
const win: Record<string, any> = {};
const ctx: Record<string, any> = { window: win, console, Math, Date, Set, Map, JSON, URL };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(readFileSync(join(design, 'copy.js'), 'utf8'), ctx, { filename: 'copy.js' });
const closed = win.COPY.page.clause.closed as (time: string, day: string, t: unknown) => string;
const at = (t: unknown) => closed('18:00', 'Saturday 14 November', t);
const head = 'Proposals closed at 18:00 on Saturday 14 November.';
const tally = (o: Partial<Record<'members' | 'passed' | 'failed' | 'withdrawn' | 'open', number>>) => {
  const t = { members: 9, passed: 0, failed: 0, withdrawn: 0, open: 0, ...o };
  return { ...t, proposals: t.passed + t.failed + t.withdrawn + t.open };
};

describe('the closing line (Q464)', () => {
  it('states every group, in order, joined by commas and *and*', () => {
    expect(at(tally({ passed: 14, failed: 12, withdrawn: 3, open: 2 })))
      .toBe(head + ' 9 members made 31 proposals: 14 passed, 12 didn’t, 3 were withdrawn and 2 were still open.');
  });
  it('takes the singular at one', () => {
    expect(at(tally({ members: 1, passed: 1 })))
      .toBe(head + ' 1 member made 1 proposal: 1 passed.');
    expect(at(tally({ failed: 1, withdrawn: 1, open: 1 })))
      .toBe(head + ' 9 members made 3 proposals: 1 didn’t, 1 was withdrawn and 1 was still open.');
  });
  it('leaves a group of none out', () => {
    expect(at(tally({ passed: 14, open: 2 })))
      .toBe(head + ' 9 members made 16 proposals: 14 passed and 2 were still open.');
    expect(at(tally({ withdrawn: 4 })))
      .toBe(head + ' 9 members made 4 proposals: 4 were withdrawn.');
  });
  it('says so when nobody proposed anything', () => {
    expect(at(tally({}))).toBe(head + ' No proposals were made.');
  });
  it('says only when, where no counts were served', () => {
    expect(at(null)).toBe(head);
  });
});
