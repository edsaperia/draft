/**
 * The page's face vocabulary, server-side (review #1, finding 19): which
 * emoji are offered as faces, which glyphs are the surface's own furniture
 * and so reserved (a member whose face is ✏️ would turn every wallet into
 * a possible mention of them), and the normalisation both tests share.
 * Mirrors design/setup.js — the unit test asserts the two lists are equal,
 * so a change to either without the other fails CI.
 */

export const FACE_EMOJI = ['👩', '👨', '🧑', '👧', '👦', '🧒', '👶', '👵', '👴', '🧓',
  '👩‍🦰', '👨‍🦰', '🧑‍🦰', '👩‍🦱', '👨‍🦱', '🧑‍🦱',
  '👩‍🦲', '👨‍🦲', '🧑‍🦲', '👩‍🦳', '👨‍🦳', '🧑‍🦳',
  '👱‍♀️', '👱‍♂️', '👱', '👳‍♀️', '👳‍♂️', '👳',
  '🧔', '🧔‍♂️', '🧔‍♀️'];

export const SURFACE_EMOJI = ('↔ ⏩ ⏰ ⏱ ⏳ ☑ ⚔ ⚖ ✅ ✉ ✋ ✍ ✏ ✒ ✔ ✖ ❄ ❌ ❎ ❓ ' +
  '🌍 🌡 🌶 🍾 🎩 🏛 🏷 👁 👍 👑 👤 👥 💡 💤 📄 📌 📍 📝 📧 📨 📬 📯 🔄 🔗 ' +
  '🔥 🖼 🗑 🗝 🛡 🤖 🤝 🥂 🥾 🪜 🪪 🪶 ' +
  '👦 👧 👨 👩 👱 👳 👴 👵 👶 🧑 🧒 🧓 🧔').split(' ');

/** Variation selectors and skin tones stripped: ✋🏽 is as reserved as ✋. */
export const normEmoji = (s: string): string =>
  s.replace(/[\u{FE0F}\u{FE0E}\u{1F3FB}-\u{1F3FF}]/gu, '');

export const RESERVED_EMOJI: ReadonlySet<string> = new Set(SURFACE_EMOJI.filter((g) =>
  !FACE_EMOJI.some((f) => normEmoji(f) === g)));

/**
 * One grapheme, pictographic, not furniture — the page's `emojiFaceOf`
 * rule. Returns the face, 'reserved', or null for not-a-face.
 */
export function emojiFaceOf(raw: string): string | 'reserved' | null {
  const s = raw.trim();
  if (!s) return null;
  const segs = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)]
    .map((x) => x.segment);
  if (segs.length !== 1) return null;
  const g = segs[0]!;
  if (!/\p{Extended_Pictographic}/u.test(g)) return null;
  if (RESERVED_EMOJI.has(normEmoji(g))) return 'reserved';
  return g;
}
