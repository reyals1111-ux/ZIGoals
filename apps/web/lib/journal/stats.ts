import {addLocalDays} from '../local-date';
import type {JournalEntry} from './schema';

/**
 * Session AP (owner-approved feature list): the Journal's own numbers — words per entry, the writing streak and the words
 * written this year. Derived from the entries each time; nothing is stored. Pure.
 * - A word is a run of letters or digits (the device's word breaker where it has one, so "don't" is one word and a
 *   language without spaces is still counted); punctuation and emoji alone are not words.
 * - The streak counts consecutive calendar days with at least one entry, up to today; a day not written yet today does
 *   not break it (it still counts up to yesterday), as a habit's streak waits for the day to end.
 * - Only the entry's own text counts (not ZIGi's question or the answer to it).
 */
type Segmenter = {segment: (text: string) => Iterable<{isWordLike?: boolean}>};
let segmenter: Segmenter | null | undefined;
const wordSegmenter = (): Segmenter | null => {
  if (segmenter === undefined) {
    try { const S = (Intl as unknown as {Segmenter?: new (l?: string, o?: {granularity: 'word'}) => Segmenter}).Segmenter; segmenter = S ? new S(undefined, {granularity: 'word'}) : null; }
    catch { segmenter = null; }
  }
  return segmenter;
};
export function wordCount(text: string): number {
  const s = wordSegmenter();
  if (s) { let n = 0; for (const part of s.segment(text)) if (part.isWordLike) n++; return n; }
  return text.split(/\s+/u).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
}
/** The current run of days with an entry (ending today, or yesterday while today has none yet) and the longest run. */
export function writingStreak(entries: readonly Pick<JournalEntry, 'date'>[], today: string): {current: number; longest: number; writtenToday: boolean} {
  const days = new Set(entries.map(e => e.date).filter(d => d <= today));
  const writtenToday = days.has(today);
  let current = 0;
  for (let d = writtenToday ? today : addLocalDays(today, -1); days.has(d); d = addLocalDays(d, -1)) current++;
  let longest = 0, run = 0, previous = '';
  for (const d of [...days].sort()) { run = previous && addLocalDays(previous, 1) === d ? run + 1 : 1; previous = d; if (run > longest) longest = run; }
  return {current, longest, writtenToday};
}
/** Words in the entries dated in today's calendar year, and how many entries that is. */
export function wordsThisYear(entries: readonly Pick<JournalEntry, 'date' | 'text'>[], today: string): {words: number; entries: number} {
  const year = today.slice(0, 4);
  let words = 0, count = 0;
  for (const e of entries) if (e.date.slice(0, 4) === year && e.date <= today) { words += wordCount(e.text); count++; }
  return {words, entries: count};
}
