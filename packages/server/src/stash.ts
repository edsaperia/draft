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

  async open(key: string, expMs: number): Promise<void> {
    await this.persistence.putStash(key, { text: '', expMs });
  }

  /** Update an open stash; false if it never existed or has expired. */
  async update(key: string, text: string, nowMs: number): Promise<boolean> {
    const rec = await this.persistence.getStash(key);
    if (rec === null || rec.expMs < nowMs) return false;
    await this.persistence.putStash(key, { text, expMs: rec.expMs });
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
