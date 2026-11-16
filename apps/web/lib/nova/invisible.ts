/**
 * Session AM-2 (security review, finding 2): characters a person cannot see. Text that leaves NOVA — a mail draft, a
 * calendar note, a share, the clipboard, a tool's arguments — and text that comes back from a tool is shown on a card;
 * a character that draws nothing can carry a payload past the card and past the secret checks (a soft hyphen inside
 * each recovery word, a run of tag characters after "See you Friday"). `stripInvisible` removes every such character;
 * the checks and the card both read the stripped text, so what is shown is what leaves.
 *
 * Removed: the Unicode format characters (Cf: zero-width space and joiners, bidi marks, embeddings, overrides and
 * isolates, the soft hyphen, the Arabic letter mark, the word joiner, the byte-order mark, the tag block U+E0000–E007F),
 * the variation selectors (U+FE00–FE0F, U+E0100–E01EF), the Mongolian vowel separator, the Hangul fillers, the
 * combining grapheme joiner and the Braille blank. Line breaks, tabs and ordinary spaces stay (callers bound those).
 */
const INVISIBLE = /[\p{Cf}\u034F\u115F\u1160\u17B4\u17B5\u180B-\u180F\u2800\u3164\uFE00-\uFE0F\uFFA0\u{E0100}-\u{E01EF}]/gu;
export function stripInvisible(text: string): string { return text.replace(INVISIBLE, ''); }
export function hasInvisible(text: string): boolean { INVISIBLE.lastIndex = 0; const found = INVISIBLE.test(text); INVISIBLE.lastIndex = 0; return found; }
