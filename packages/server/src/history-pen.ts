/**
 * **The history pen** — writing a document's past at backdated timestamps.
 *
 * Both state machines assert only that event timestamps are non-decreasing;
 * nothing requires one to be `Date.now()`. So a document with a real past is
 * built by writing that past at earlier instants, stepping in cooldown-sized
 * increments so adoption batches genuinely fire. Two builders do this: the
 * phase ladder (dev only) and the demo document (design/DEMO.md Stage 1),
 * and this module is the part they share — machinery, never cast — which is
 * why it ships while the ladder does not.
 *
 * The rule the pen holds: **nothing is stamped later than real now**, or the
 * write path's clamp drags every later command into the future with it. Every
 * write goes through `Pen`, whose ceiling is that rule; out of room it stands
 * still, since equal timestamps are legal and standing still is always safe.
 */
import type { ConstitutionSession } from '../../constitution/src/index.js';

/**
 * A monotonic pen. Every write goes through it, and `guard` is what keeps the
 * whole scheme honest: a timestamp past real now would make `tOf` clamp every
 * later command up to it, quietly moving the document into the future.
 */
export class Pen {
  private readonly ceiling: number;
  constructor(private t: number, ceiling: number) {
    // **The ceiling can never be behind the log.** Something else may have
    // moved the document's clock since the last rung — a real command, or
    // simply somebody reading it, since presence is a write (§9.5a). Clamping
    // down to a ceiling already passed would emit backwards, which is refused.
    // Room then runs out instead, and out of room means *the same instant*:
    // equal timestamps are legal, and standing still is the one thing that
    // is always safe.
    this.ceiling = Math.max(ceiling, t);
  }
  /** The next instant: at most `gap` on, never past the ceiling, never back. */
  next(gap = 1): number {
    this.t += Math.min(Math.max(gap, 0), Math.max(0, this.ceiling - this.t));
    return this.t;
  }
  at(when: number): number {
    this.t = Math.max(this.t, Math.min(when, this.ceiling));
    return this.t;
  }
  /** How much synthetic history is left to spend. */
  get room(): number { return Math.max(0, this.ceiling - this.t); }
  get now(): number { return this.t; }
}

/** The instant of the document log's last event, or 0 for an empty log. */
export const lastTOf = (cs: ConstitutionSession): number => {
  const log = cs.logEntries();
  return log.length > 0 ? log[log.length - 1]!.event.t : 0;
};
