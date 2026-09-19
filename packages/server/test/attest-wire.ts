/**
 * **The attestation, filled for a test that posts over the wire** (Q1463 (1);
 * SPEC §2.1, §2.4 → why: R-136).
 *
 * Since the ruling of 2026-09-19 every text proposal states the wording it
 * believes it is replacing, and the host refuses one that does not. A test
 * that posts `propose-text`, `pen-text` or `rebase-text` is a client like any
 * other, and there are some forty such posts across these files, each with
 * its hunks written out by hand against a document the test set up pages
 * earlier. So the seam is here, in the one `post` every one of them already
 * goes through: the document is read back off the member view the post is
 * about, and `attest` — engine-core's own helper, the same one the personas
 * use — fills `was` and `after` from it.
 *
 * **What it deliberately does not do.** It fills nothing where the patch
 * names a version that is not the one standing (the version guard is the
 * truer refusal there, and one test leans on exactly that), nothing where
 * the caller has written an attestation itself, and nothing where the view
 * cannot be read at all. So a test that means to post a stale or a wrong
 * attestation simply writes one, and gets it through untouched — which is
 * what `refuses a bot-style stale patch` in `server.test.ts` does.
 */
import { attest, splitLines } from '../../engine-core/src/index.js';
import type { Hunk } from '../../engine-core/src/text/types.js';

const TEXT_COMMANDS = new Set(['propose-text', 'pen-text', 'rebase-text']);

interface WireBody { cmd?: unknown; args?: unknown }

/** The document a `/api/d/<slug>/cmd` post is about, or null if it cannot be read. */
async function viewOf(base: string, path: string, cookie?: string):
Promise<{ text: string; textVersion: number } | null> {
  const slug = /\/api\/d\/([^/]+)\/cmd$/.exec(path)?.[1];
  if (slug === undefined) return null;
  try {
    const res = await fetch(`${base}/api/d/${slug}/view`,
      cookie === undefined ? {} : { headers: { cookie } });
    if (!res.ok) return null;
    const v = await res.json() as { text?: unknown; textVersion?: unknown };
    if (typeof v.text !== 'string' || typeof v.textVersion !== 'number') return null;
    return { text: v.text, textVersion: v.textVersion };
  } catch { return null; }
}

/** The body as it should go over the wire: unchanged, or with its hunks attested. */
export async function attestBody(base: string, path: string, body: unknown, cookie?: string):
Promise<unknown> {
  if (body === null || typeof body !== 'object') return body;
  const { cmd, args } = body as WireBody;
  if (typeof cmd !== 'string' || !TEXT_COMMANDS.has(cmd)) return body;
  if (args === null || typeof args !== 'object') return body;
  const a = args as { baseVersion?: unknown; hunks?: unknown };
  if (!Array.isArray(a.hunks) || typeof a.baseVersion !== 'number') return body;
  const hunks = a.hunks as Hunk[];
  if (hunks.some((h) => h.was !== undefined || h.after !== undefined)) return body;
  const v = await viewOf(base, path, cookie);
  if (v === null || v.textVersion !== a.baseVersion) return body;
  return { ...body, args: { ...args, hunks: attest(splitLines(v.text), hunks) } };
}
