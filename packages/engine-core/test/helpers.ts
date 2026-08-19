import type { Participant } from '../src/types.js';

export const TEXT = 'The club meets on Tuesdays.\n';

export function roster(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, handle: `P${i + 1}` }));
}
