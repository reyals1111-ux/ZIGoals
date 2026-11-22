import type {JournalEntry} from './schema';
import {wordsOf} from '../mood-words/schema';

/**
 * Session AV lane 2 (r4-mind; LEDGER #310, Journey's search by mood): the moods the Journal's list can show — the day's
 * mood 1–5 (Health's mood, while Health is shown) and the day's feeling words (lib/mood-words, every word of the day),
 * each with the days it was chosen on that hold an entry. Derived; nothing is stored. Pure.
 */
export type MoodChoice = {value: string; label: string; days: string[]};
type FeelingRecord = {words?: Readonly<Record<string, unknown>>} | null | undefined;
/**
 * The moods to choose from, each with its days that hold an entry: "Mood 5 · great" … "Mood 1 · awful" (the person's
 * own mood words), "Pleasant feelings", "Unpleasant feelings", then each feeling word used on an entry's day, the most
 * used first. A choice with no such day is left out, so every choice shows at least one entry.
 */
export function moodChoices(entries: readonly Pick<JournalEntry, 'date'>[], moods: Readonly<Record<string, number>>, feelings: FeelingRecord, moodWords: readonly string[]): MoodChoice[] {
  const written = new Set(entries.map(e => e.date)), out: MoodChoice[] = [];
  for (let m = 5; m >= 1; m--) { const days = [...written].filter(d => moods[d] === m).sort(); if (days.length) out.push({value: `mood:${m}`, label: `Mood ${m} · ${moodWords[m - 1] ?? m}`, days}); }
  const words = wordsOf(feelings), byWord = new Map<string, Set<string>>(), pleasant: string[] = [], unpleasant: string[] = [];
  for (const [d, w] of Object.entries(words)) {
    if (!written.has(d)) continue;
    (w.pleasantness === 'pleasant' ? pleasant : unpleasant).push(d);
    for (const word of [w.word, ...(w.more ?? []).map(x => x.word)]) { const set = byWord.get(word) ?? new Set<string>(); set.add(d); byWord.set(word, set); }
  }
  if (pleasant.length) out.push({value: 'feel:pleasant', label: 'Pleasant feelings', days: pleasant.sort()});
  if (unpleasant.length) out.push({value: 'feel:unpleasant', label: 'Unpleasant feelings', days: unpleasant.sort()});
  for (const [word, days] of [...byWord].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))) out.push({value: `word:${word}`, label: `Feeling: ${word}`, days: [...days].sort()});
  return out;
}
