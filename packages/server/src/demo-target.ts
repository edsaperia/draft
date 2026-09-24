/**
 * **The seam between the demo's bots and the demo document** (design/DEMO.md
 * Stages 1 and 4; Q1535). The bots (`demo-bots.ts`) never find a document for
 * themselves: they are handed a `DemoTarget`, which says which document is the
 * demo right now, which generation it is, and who the bots are — the preset's
 * cast, founder excluded, in file order, each with the cast line that is its
 * persona.
 *
 * On a server built with Stage 1's `Demo` the target is the demo document
 * (`server.ts` wires `demoTargetOf(demo)`); until then, and in tests and the
 * walk, it is any ordinary document named by `documentTarget`, whose bots are
 * its arrived members with a plain persona. Either way a bot reaches the
 * document through `applyCommand` and reads it through `view()` and
 * `raceView()` — the target only says *which* document, never how to touch it.
 */
import type { LoadedDoc } from './store.js';

export interface DemoBotSeat {
  /** The member id the bot acts as. */
  id: string;
  /** The display name (the preset's cast name). */
  name: string;
  /** The cast line: how they behave on the committee. */
  persona: string;
}

export interface DemoTarget {
  /** The document the bots act in, or null where there is none. */
  doc(): LoadedDoc | null;
  /** Moves on every Reset: a bot holding an older generation stops (DEMO.md §5). */
  generation(): number;
  /** Who the bots are, in file order; a run seats the first *n*. */
  botSeats(): DemoBotSeat[];
}

export const NO_TARGET: DemoTarget = { doc: () => null, generation: () => 0, botSeats: () => [] };

/**
 * **The demo document as the target** — what `server.ts` wires: the current
 * generation's document, the generation number that moves at every Reset, and
 * the preset's cast minus the Founder as the seats (`Demo.botSeats`), each
 * with its cast line. Never a visitor's seat, never the Founder's.
 */
export function demoTargetOf(demo: {
  doc(): LoadedDoc | null;
  status(): { generation: number };
  botSeats(): DemoBotSeat[];
}): DemoTarget {
  return {
    doc: () => demo.doc(),
    generation: () => demo.status().generation,
    botSeats: () => demo.botSeats(),
  };
}

/** The persona a member of an ordinary document is given — tests, the walk, the smoke run. */
export const PLAIN_PERSONA = 'a thoughtful member of the committee: votes for the clearer wording, ' +
  'proposes small improvements, and is polite about other people\'s drafts.';

/**
 * **An ordinary document as a target** — the dev and test path. The bots are
 * its arrived, unremoved members other than the founder, in roster order, each
 * named by the name they chose (or their address's local part).
 */
export function documentTarget(doc: LoadedDoc, generation = 1): DemoTarget {
  return {
    doc: () => doc,
    generation: () => generation,
    botSeats: () => {
      const founder = doc.cs.convenorRecord().id;
      return [...doc.cs.memberRecords().values()]
        .filter((m) => m.id !== founder && !m.removed && m.arrivedAtT !== null)
        .map((m) => ({ id: m.id, name: m.name ?? (m.email ?? m.id).split('@')[0]!, persona: PLAIN_PERSONA }));
    },
  };
}
