/**
 * The pre-save text stash (SPEC §9.7a, v0.55): a founder may paste text
 * into the document before following the magic link — "copy the text,
 * open docs.vote, paste it, then do the tasks" — and it must still be
 * there after the save, whichever device the link is opened on. So the
 * page syncs the pasted text here against a capability id minted with
 * the creation mail, and the save folds it into the new document's
 * provisional sidecar. Stashes are keyed by the hash of the id (the
 * file alone reveals which id nothing), expire with the creation token,
 * and are as sensitive as the room: they are somebody's draft charter.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface StashRecord {
  text: string;
  expMs: number;
}

export class Stash {
  private readonly path: string;
  private readonly stashes: Map<string, StashRecord>;

  constructor(dataDir: string) {
    this.path = join(dataDir, 'pending.json');
    this.stashes = new Map(
      existsSync(this.path)
        ? Object.entries(JSON.parse(readFileSync(this.path, 'utf8')) as
            Record<string, StashRecord>)
        : [],
    );
  }

  open(key: string, expMs: number): void {
    this.stashes.set(key, { text: '', expMs });
    this.save();
  }

  /** Update an open stash; false if it never existed or has expired. */
  update(key: string, text: string, nowMs: number): boolean {
    const rec = this.stashes.get(key);
    if (!rec || rec.expMs < nowMs) return false;
    rec.text = text;
    this.save();
    return true;
  }

  /** Take the text and delete the stash (the save consumes it). */
  take(key: string, nowMs: number): string {
    const rec = this.stashes.get(key);
    this.stashes.delete(key);
    this.sweep(nowMs);
    this.save();
    return rec && rec.expMs >= nowMs ? rec.text : '';
  }

  private sweep(nowMs: number): void {
    for (const [k, rec] of this.stashes) {
      if (rec.expMs < nowMs) this.stashes.delete(k);
    }
  }

  private save(): void {
    writeFileSync(this.path,
      JSON.stringify(Object.fromEntries(this.stashes), null, 2), 'utf8');
  }
}
