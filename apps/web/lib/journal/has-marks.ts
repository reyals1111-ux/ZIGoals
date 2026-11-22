/**
 * Session AV lane 2 (r4-mind; LEDGER #308): whether a journal entry holds Markdown worth drawing — a heading, a list or
 * tick box, a quote, **bold**, *italics*, ==a highlight== or `code`. No imports, so the Journal's first chunk stays small;
 * an entry without marks keeps its plain paragraph, exactly as before. Pure.
 */
const BLOCK = /^\s{0,3}(?:#{1,3}\s+\S|[-*+•]\s+\S|\d{1,3}[.)]\s+\S|>\s?\S)/m;
const INLINE = /\*\*\S[^*\n]*\*\*|==\S[^=\n]*==|`[^`\n]+`|(?:^|[\s(])\*\S[^*\n]*\*(?=$|[\s).,;:!?])|(?:^|[\s(])_\S[^_\n]*_(?=$|[\s).,;:!?])/m;
export const hasMarks = (text: string) => BLOCK.test(text) || INLINE.test(text);

