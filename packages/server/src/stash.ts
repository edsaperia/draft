/**
 * The pre-save text stash (SPEC §9.7a, v0.55): a founder may paste text
 * into the document before following the magic link — "copy the text,
 * open docs.vote, paste it, then do the tasks" — and it must still be
 * there after the save, whichever device the link is opened on. So the
 * page syncs the pasted text here against a capability id minted with
 * the creation mail, and the save folds it into the new document's
 * provisional sidecar. Stashes are keyed by the hash of the id (the
 * store alone reveals which id nothing), expire with the creation token,
 * and are as sensitive as the room: they are somebody's draft charter.
 *
 * Since PRODUCTION.md stage 2 the bytes live behind the Persistence seam;
 * this class keeps the semantics — open, expiry, take-consumes.
 */
import type { Persistence } from './persistence.js';

export class Stash {
  constructor(private readonly persistence: Persistence) {}

  /** Open a stash; with a slug it also reserves that address (Q460/462b)
   *  for as long as the stash lives — claimed by take(), swept at expiry. */
  async open(key: string, expMs: number, slug?: string): Promise<void> {
    await this.persistence.putStash(key, { text: '', expMs, ...(slug === undefined ? {} : { slug }) });
  }

  /** Is this stash still open? The save consumes it, so a second link
   *  against the same pending creation is spent by this answer. */
  async alive(key: string, nowMs: number): Promise<boolean> {
    const rec = await this.persistence.getStash(key);
    return rec !== null && rec.expMs >= nowMs;
  }

  /** Re-send: the same pending creation speaking again (Ed's QA, 2026-08-21
   *  — *when I click 📨 I'm taken back to link*). A resend must not be a
   *  second creation, so the stash it already opened is kept — with whatever
   *  text has been pasted into it — while its reservation moves to the
   *  address now asked for and its life is renewed against the new link's.
   *  False if the stash never existed or has expired, in which case the
   *  caller opens a fresh one. */
  async renew(key: string, expMs: number, slug: string, nowMs: number): Promise<boolean> {
    const rec = await this.persistence.getStash(key);
    if (rec === null || rec.expMs < nowMs) return false;
    await this.persistence.putStash(key, { ...rec, expMs, slug });
    return true;
  }

  /** The stash key holding a live reservation on this slug, or null. */
  async reservedBy(slug: string, nowMs: number): Promise<string | null> {
    const key = await this.persistence.findStashBySlug(slug);
    if (key === null) return null;
    const rec = await this.persistence.getStash(key);
    return rec !== null && rec.expMs >= nowMs ? key : null;
  }

  /** Update an open stash; false if it never existed or has expired. */
  async update(key: string, text: string, nowMs: number): Promise<boolean> {
    const rec = await this.persistence.getStash(key);
    if (rec === null || rec.expMs < nowMs) return false;
    await this.persistence.putStash(key, { ...rec, text });
    return true;
  }

  /** Take the text and delete the stash (the save consumes it). */
  async take(key: string, nowMs: number): Promise<string> {
    const rec = await this.persistence.getStash(key);
    await this.persistence.deleteStash(key);
    await this.persistence.sweepStashes(nowMs);
    return rec !== null && rec.expMs >= nowMs ? rec.text : '';
  }
}
