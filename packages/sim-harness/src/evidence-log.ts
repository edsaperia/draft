/**
 * The narrative-assertion trio the evidence walks share (founding-evidence,
 * motions-evidence): say/check/eq over one failures counter, plus the exit
 * protocol — call finish() at the end of the walk to exit non-zero on any
 * failure.
 */

let failures = 0;
export const say = (msg: string) => console.log(msg);
export const check = (cond: boolean, msg: string) => {
  if (cond) { console.log(`     ✓ ${msg}`); }
  else { failures += 1; console.error(`     ✗ FAILED: ${msg}`); }
};
export const eq = (a: unknown, b: unknown, msg: string) =>
  check(JSON.stringify(a) === JSON.stringify(b), `${msg} (${JSON.stringify(a)})`);

export function finish(): void {
  if (failures > 0) {
    console.error(`\n${failures} check(s) FAILED`);
    process.exit(1);
  }
  say('\nAll checks passed.');
}
