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
 * What it never carries **on a question still open**: a judgment, a count, a
 * standing, a probability, a floor, who has or has not answered, or anything
 * else that says which way it is going (SPEC §3.5: *no feed … shows direction
 * on a race the participant hasn't judged* — and a spectator has judged none).
 *
 * **A proposal that passed carries its decision's own numbers** (Ed,
 * 2026-09-19: *the same stats as one on a passed card … how many voted, how
 * many preferred, how many lapsed, also how long between when it was proposed
 * and when it passed*): the counts the sealed record prints, which are a
 * resolved outcome's and so public the moment it happened — never who, never
 * which way anybody went, and never a probability.
 *
 * **A feed entry is the change and the place, never the document**: each
 * hunk carries the lines it replaces as they stood at the time, the lines
 * it puts there, the nearest heading above, and **one paragraph either
 * side** (Ed, 2026-09-19: *if the paragraph that changed is short, the
 * previous and next paragraphs should be shown in the feed as context*) —
 * enough to read the change where it bites, and nothing of the rest. Whether
 * a change is short enough to want its neighbours is the page's to say.
 */

import { authorVisible } from './participant-api.js';
import type { Session } from './session.js';
import type { Hunk, PatchSet } from './text/types.js';
import { splitLines } from './text/diff.js';

/** One changed place: what stood, what is put there, and where that is. */
export interface FeedChange {
  /** The nearest heading above the change, its marker stripped; null above the first. */
  heading: string | null;
  /** The paragraph before the change, in its own section: null at the top and under a heading. */
  above: string | null;
  /** The paragraph after the change, in its own section: null at the end and before a heading. */
  below: string | null;
  /** The lines replaced, as they stood when the entry happened. Empty on an insertion. */
  before: string[];
  /** The lines put there. Empty on a deletion. */
  after: string[];
}

/** A passed proposal's own numbers — the sealed record's, and counts only. */
export interface FeedOutcome {
  /**
   * The distinct members who voted on it, its author among them by their
   * derived preference (§3.3) — the number the record calls *weighed in*
   * (Q1337): nobody who only judged a rival.
   */
  voted: number;
  /** What the batch decided on (Q1439, Q1452); absent on a log older than the fields. */
  approvals?: number;
  floor?: number;
  abstained?: number;
  /** From the moment it was proposed to the moment it passed. */
  tookMs: number;
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
  /** Present on `adopted` and nowhere else: an open question has no numbers here. */
  outcome?: FeedOutcome;
}

const HEADING = /^#{1,3}\s+/;

function placeOf(lines: string[], start: number, end: number):
{ heading: string | null; above: string | null; below: string | null } {
  let heading: string | null = null;
  let above: string | null = null;
  for (let i = start - 1; i >= 0; i--) {
    const l = lines[i]!;
    if (l.trim() === '') continue;
    if (HEADING.test(l)) { heading = l.replace(HEADING, ''); break; }
    if (above === null) above = l;
  }
  // the next paragraph, and only inside the section: a heading ends the search,
  // since the next section's name says nothing about this change
  let below: string | null = null;
  for (let i = end; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.trim() === '') continue;
    if (!HEADING.test(l)) below = l;
    break;
  }
  return { heading, above, below };
}

function changesOf(base: string[], hunks: Hunk[]): FeedChange[] {
  return hunks.map((h) => ({
    ...placeOf(base, h.start, h.end),
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
    const proposedAt = new Map<string, number>();
    // who voted on each candidate, up to a moment: a count, never who or which way
    const judgments = s.judgments();
    const votersOf = (id: string, author: string, upTo: number): number => {
      const who = new Set<string>([author]);
      for (const j of judgments) {
        if (j.t <= upTo && (j.aId === id || j.bId === id)) who.add(j.participantId);
      }
      return who.size;
    };
    for (const e of s.log) {
      const ev = e.event;
      if (ev.type === 'candidate-submitted') {
        if (!ev.patch) continue;
        proposedAt.set(ev.id, ev.t);
        patched(ev.t, 'proposed', ev.id, ev.rationale, visible(ev.id), ev.patch);
      } else if (ev.type === 'adopted') {
        const c = s.getCandidate(ev.candidateId);
        if (!c.patch) continue;
        // the winner's patch stands on the version its adoption replaced;
        // were it ever not so, the entry is read against that version anyway,
        // since that is the text the membership changed
        patched(ev.t, 'adopted', c.id, c.rationale, visible(c.id),
          { baseVersion: ev.newVersion - 1, hunks: c.patch.hunks });
        const outcome: FeedOutcome = { voted: votersOf(c.id, c.author, ev.t),
          tookMs: ev.t - (proposedAt.get(c.id) ?? c.submittedT) };
        // absent means an older log, and is never written as `undefined`
        if (typeof ev.approvals === 'number') outcome.approvals = ev.approvals;
        if (typeof ev.floor === 'number') outcome.floor = ev.floor;
        if (typeof ev.abstained === 'number') outcome.abstained = ev.abstained;
        out[out.length - 1]!.outcome = outcome;
      } else if (ev.type === 'text-decreed') {
        patched(ev.t, 'decreed', ev.id, ev.rationale, null, ev.patch);
      }
    }
    return out;
  }
}
