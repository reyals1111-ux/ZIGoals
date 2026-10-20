import type {ReactNode} from 'react';

/**
 * Words that must not break at their hyphen (Session AF Gate C design review: "7- / day streak" on Journey, "check- / ins"
 * on a badge): each hyphenated word, and each given phrase, is kept on one line by a nowrap span. The text itself is
 * unchanged — the same characters, a plain hyphen — so it reads, copies and searches as it always did.
 */
const NOWRAP = {whiteSpace: 'nowrap'} as const;
export function keepWords(text: string, phrases: readonly string[] = []): ReactNode {
  const parts = phrases.filter(Boolean).map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${[...parts, '[^\\s-]+(?:-[^\\s-]+)+'].join('|')})`, 'g');
  const pieces = text.split(pattern);
  if (pieces.length === 1) return text;
  return pieces.map((piece, i) => i % 2 ? <span key={i} style={NOWRAP}>{piece}</span> : piece);
}
