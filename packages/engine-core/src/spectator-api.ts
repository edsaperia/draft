/**
 * The spectator API (backlog 42, Q1466): **a strictly-public projection**,
 * the participant API's sibling. Everything a spectator surface may print
 * comes through here and nothing else does, so privacy holds by
 * construction rather than by a surface's discipline.
 *
 * What it carries, and the rule each part rides on:
 *
 *  - **a proposal's text and rationale from the moment it is made** — the
 *    field a member may browse (`ParticipantApi.liveCandidates`), and no
 *    more than a race card prints;
 *  - **that a proposal passed** — *resolved outcomes are public in the
 *    gazette immediately* (SPEC §3.5);
 *  - **an author only where `authorVisible` says so** (SPEC §3.5a), the one
 *    reveal rule, asked here exactly as every other reader asks it.
 *
 * What it never carries: a judgment, a count, a standing, a probability, a
 * floor, who has or has not answered, or anything else that says which way
 * a question still open is going (SPEC §3.5: *no feed … shows direction on a
 * race the participant hasn't judged* — and a spectator has judged none).
 * An adoption's own numbers are on the log and are the sealed record's to
 * print; the feed says that it passed, and when.
 *
 * **A feed entry is the change and the place, never the document**: each
 * hunk carries the lines it replaces as they stood at the time, the lines
 * it puts there, the nearest heading above and the one line before it —
 * enough to read the change where it bites, and nothing of the rest.
 */

import { authorVisible } from './participant-api.js';
import type { Session } from './session.js';
import type { Hunk, PatchSet } from './text/types.js';
import { splitLines } from './text/diff.js';

/** One changed place: what stood, what is put there, and where that is. */
export interface FeedChange {
  /** The nearest heading above the change, its marker stripped; null above the first. */
  heading: string | null;
  /** The nearest non-blank line before the change that is not that heading; null at the top. */
  above: string | null;
  /** The lines replaced, as they stood when the entry happened. Empty on an insertion. */
  before: string[];
  /** The lines put there. Empty on a deletion. */
  after: string[];
}

export interface FeedEntry {
  t: number;
  /**
   * `proposed` — a member put a wording to the membership; `adopted` — the
   * membership passed one; `decreed` — the Founder's ✒️ amended the text
   * (SPEC §9.7 rule 8), which is both at once and names an office.
   */
  kind: 'proposed' | 'adopted' | 'decreed';
  candidateId: string;
  rationale: string;
  /**
   * The author's participant id where `authorVisible` gives one, else null.
   * A host resolves the id to a name; this layer holds no identity. Always
   * null on `decreed`: the record names the office, never the person.
   */
  author: string | null;
  changes: FeedChange[];
}

const HEADING = /^#{1,3}\s+/;

function placeOf(lines: string[], start: number): { heading: string | null; above: string | null } {
  let heading: string | null = null;
  let above: string | null = null;
  for (let i = start - 1; i >= 0; i--) {
    const l = lines[i]!;
    if (l.trim() === '') continue;
    if (HEADING.test(l)) { heading = l.replace(HEADING, ''); break; }
    if (above === null) above = l;
  }
  return { heading, above };
}

function changesOf(base: string[], hunks: Hunk[]): FeedChange[] {
  return hunks.map((h) => ({
    ...placeOf(base, h.start),
    before: base.slice(h.start, h.end),
    after: [...h.lines],
  }));
}

export class SpectatorApi {
  constructor(private readonly session: Session) {}

  /**
   * Every text proposal made and every one that passed, oldest first.
   *
   * A **proposal** is read off its own `candidate-submitted` event against
   * the version it was written on, so the entry says what its author saw —
   * a later rebase moves the candidate and never the entry. An **adoption**
   * is read off the winner's patch, which the engine rebased onto the
   * version the adoption replaced before applying it. A setting candidate
   * (an ordinary motion, Q390) carries no patch and makes no entry here.
   */
  feed(): FeedEntry[] {
    const out: FeedEntry[] = [];
    const s = this.session;
    const linesAt = (v: number): string[] => splitLines(s.documentAt(v));
    const visible = (id: string): string | null => {
      const c = s.getCandidate(id);
      return authorVisible(c, s.constitution, { closed: s.closed }) ? c.author : null;
    };
    const patched = (t: number, kind: FeedEntry['kind'], id: string, rationale: string,
      author: string | null, patch: PatchSet): void => {
      out.push({ t, kind, candidateId: id, rationale, author,
        changes: changesOf(linesAt(patch.baseVersion), patch.hunks) });
    };
    for (const e of s.log) {
      const ev = e.event;
      if (ev.type === 'candidate-submitted') {
        if (!ev.patch) continue;
        patched(ev.t, 'proposed', ev.id, ev.rationale, visible(ev.id), ev.patch);
      } else if (ev.type === 'adopted') {
        const c = s.getCandidate(ev.candidateId);
        if (!c.patch) continue;
        // the winner's patch stands on the version its adoption replaced;
        // were it ever not so, the entry is read against that version anyway,
        // since that is the text the membership changed
        patched(ev.t, 'adopted', c.id, c.rationale, visible(c.id),
          { baseVersion: ev.newVersion - 1, hunks: c.patch.hunks });
      } else if (ev.type === 'text-decreed') {
        patched(ev.t, 'decreed', ev.id, ev.rationale, null, ev.patch);
      }
    }
    return out;
  }
}
