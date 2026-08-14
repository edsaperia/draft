/**
 * Token audit (QUESTIONS #8/#10 evidence): replay the token economy from
 * the event log using engine-core's own ledger arithmetic, observing what
 * the live ledgers cannot say after the fact — drip tokens lost to the
 * cap (tick by tick), each participant's balance low-water mark, and
 * balances at requested snapshot times. Purely observational; the audit
 * cross-checks its final balances against the session's.
 */

import type { Session } from '../../engine-core/src/index.js';
import { materialize, type Ledger } from '../../engine-core/src/tokens.js';

export interface ParticipantTokenAudit {
  joinedAtMs: number;
  /** Balance the moment the ledger opened (grant + accrued drip, capped). */
  balanceAtJoin: number;
  /** Drip (and join-accrual) tokens lost to the cap over the whole window. */
  wastedDrip: number;
  /** Lowest balance observed immediately after any spend. */
  minBalance: number;
  finalBalance: number;
  /** Balance at each requested snapshot time (just before later events). */
  snapshots: Map<number, number>;
}

export interface TokenAudit {
  perParticipant: Map<string, ParticipantTokenAudit>;
  /** True when every replayed final balance matches the session ledger. */
  consistent: boolean;
}

interface St {
  ledger: Ledger;
  audit: ParticipantTokenAudit;
}

export function auditTokens(session: Session, snapshotTimes: number[] = []): TokenAudit {
  const c = session.constitution;
  const windowMs = c.windowEndMs - c.windowStartMs;
  const tickTime = (k: number): number => c.windowStartMs + (k * windowMs) / 10;
  const parts = new Map<string, St>();
  const authorOf = new Map<string, string>();
  const snaps = [...snapshotTimes].sort((a, b) => a - b);
  let snapIdx = 0;

  // Materialize one tick at a time through engine-core's materialize, so
  // cap behavior is the engine's own; the delta measures wasted drip.
  const advance = (st: St, t: number): void => {
    const due = Math.max(
      0,
      Math.min(10, Math.floor(((t - c.windowStartMs) * 10) / windowMs)),
    );
    while (st.ledger.ticksMaterialized < due) {
      const k = st.ledger.ticksMaterialized + 1;
      const before = st.ledger.balance;
      materialize(st.ledger, c, tickTime(k));
      st.audit.wastedDrip += c.tokenDripPerTenth - (st.ledger.balance - before);
    }
  };

  const join = (id: string, t: number): void => {
    // openLedger's arithmetic, tracked: base grant, then accrued drip to
    // date with the cap applied per tick (SPEC §9.3).
    const st: St = {
      ledger: { balance: Math.min(c.tokenGrant, c.tokenCap), ticksMaterialized: 0 },
      audit: {
        joinedAtMs: t,
        balanceAtJoin: 0,
        wastedDrip: 0,
        minBalance: Math.min(c.tokenGrant, c.tokenCap),
        finalBalance: 0,
        snapshots: new Map(),
      },
    };
    parts.set(id, st);
    advance(st, t);
    st.audit.balanceAtJoin = st.ledger.balance;
  };

  const credit = (id: string, t: number, amount: number): void => {
    const st = parts.get(id);
    if (!st) return;
    advance(st, t);
    st.ledger.balance += amount;
  };

  const takeSnapshotsDueBy = (t: number): void => {
    while (snapIdx < snaps.length && snaps[snapIdx]! <= t) {
      const snapT = snaps[snapIdx++]!;
      for (const st of parts.values()) {
        if (st.audit.joinedAtMs > snapT) continue;
        advance(st, snapT);
        st.audit.snapshots.set(snapT, st.ledger.balance);
      }
    }
  };

  for (const entry of session.log) {
    const e = entry.event;
    takeSnapshotsDueBy(e.t);
    switch (e.type) {
      case 'opened':
        for (const p of e.roster) join(p.id, e.t);
        break;
      case 'participant-added':
        join(e.participant.id, e.t);
        break;
      case 'candidate-submitted': {
        authorOf.set(e.id, e.author);
        const st = parts.get(e.author);
        if (st) {
          advance(st, e.t);
          st.ledger.balance -= session.constitution.stake;
          if (st.ledger.balance < st.audit.minBalance) {
            st.audit.minBalance = st.ledger.balance;
          }
        }
        break;
      }
      case 'candidate-withdrawn':
      case 'candidate-retired':
        credit(authorOf.get(e.id) ?? '', e.t, e.refund);
        break;
      case 'co-signed':
        if (e.withdrewCandidateId && e.refund > 0) {
          credit(authorOf.get(e.withdrewCandidateId) ?? '', e.t, e.refund);
        }
        break;
      case 'adopted': {
        const cand = session.getCandidate(e.candidateId);
        credit(cand.author, e.t, cand.exit?.refund ?? 0);
        break;
      }
      default:
        break;
    }
  }
  takeSnapshotsDueBy(c.windowEndMs);

  let consistent = true;
  for (const [id, st] of parts) {
    advance(st, c.windowEndMs);
    st.audit.finalBalance = st.ledger.balance;
    if (Math.abs(st.audit.finalBalance - session.balance(id, c.windowEndMs)) > 1e-9) {
      consistent = false;
    }
  }

  return {
    perParticipant: new Map([...parts].map(([id, st]) => [id, st.audit])),
    consistent,
  };
}
