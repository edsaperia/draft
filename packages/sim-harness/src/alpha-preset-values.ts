/**
 * **The recommended preset's own numbers**, in a module with no side effects.
 *
 * They belong to `alpha-preset.ts`, which is the sweep that chose them — but
 * that file ends in `void main()`, so importing it runs the whole sweep and
 * calls `finish()`. The cap calibration test in `test/sim.test.ts` has to run
 * the room at the operating point Ed will actually found at, and a constitution
 * copied into a test is a calibration test that stops calibrating the thing it
 * is named after the first time the preset changes. So the values live here,
 * the sweep spreads them into its `ALPHA PRESET` row, and the test imports
 * them; there is still exactly one place they are written down.
 */
import type { Constitution } from '../../engine-core/src/index.js';

const MIN = 60_000;

/**
 * The alpha operating point (entry 77): Ed's one-minute cooldown inside
 * §4.2's ≤5 min, and a rate that fires inside the session.
 *
 * **The bar is no longer part of the operating point** (2026-09-15, Q1362
 * (b), R-117). It was 0.85 here — *the bar the room can actually reach on the
 * evidence eight people produce in a quarter of an hour* — and the reason it
 * had to be tuned at all is the reason the rule changed: a confidence bar
 * priced adoption in evidence the room could not produce, so the number that
 * mattered was the one nobody could name. The adoption test is now *top of
 * the ranking, floor met*; the threshold is pinned at 0.5 and the machinery
 * is deleted a release later. The two fields stay here, at the pinned value,
 * so the preset states its whole constitution rather than half of it — and so
 * the cap calibration test still founds the room from one place.
 */
export const ALPHA_PRESET_OVERRIDES: Partial<Constitution> = {
  adoptionThresholdStart: 0.5,
  adoptionThresholdEnd: 0.5,
  cooldownMs: 1 * MIN,
  tokenGrant: 6,
  tokenCap: 8,
  tokenDripMinutes: 5,
};

/** The window and roster the alpha day will have, and the sweep's target cell. */
export const ALPHA_PRESET_CELL = { minutes: 15, roster: 8 };
