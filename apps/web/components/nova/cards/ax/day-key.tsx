'use client';
import './day.css';

/**
 * Session AS (ADR-042 Part 2): the key under an instrument of the day's kinds — what each mark means, in words (never
 * colour alone). The marks are drawn in day.css (`.axd-key i[data-mark]`).
 */
export type AxdMark = 'lit' | 'bright' | 'missed' | 'skipped' | 'open' | 'dim' | 'ghost' | 'none' | 'late' | 'ring' | 'tick';
export function AxdKey({items}: {items: readonly (readonly [mark: AxdMark, words: string])[]}) {
  return <p className="axd-key" aria-hidden="true">{items.map(([mark, words]) => <span key={`${mark}-${words}`}><i data-mark={mark}/>{words}</span>)}</p>;
}
