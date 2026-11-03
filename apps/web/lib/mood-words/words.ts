import type {Energy} from '../energy/schema';
import {MAX_MOOD_WORD_DAYS, moodWordDaySchema, wordsOf, type MoodWordDay} from './schema';

/**
 * Session AK (lane S, item 6; COMPETITORS.md (b) 6, How We Feel's grid [16]): an optional feeling word after the 1–5
 * energy or mood. Two axes (energy × pleasantness) make four quadrants of twelve authored English words each (the
 * check-in and the journal have no Dutch path, so neither does this). Plain, everyday words: no clinical labels and none
 * of the app's tone-forbidden words (lib/ai/local-answers/words.ts, lib/checkin/checkin.ts), checked by the tests.
 * A word in an unpleasant quadrant may offer ONE small next step that opens an existing feature; never a task, never advice.
 */
export type EnergyAxis = MoodWordDay['energy'];
export type Pleasantness = MoodWordDay['pleasantness'];
export type QuadrantId = `${EnergyAxis}-${Pleasantness}`;
export type NextStep = 'breathe' | 'walk' | 'write';
export type Quadrant = {id: QuadrantId; energy: EnergyAxis; pleasantness: Pleasantness; title: string; words: readonly string[]};

export const QUADRANTS: readonly Quadrant[] = [
  {id: 'high-unpleasant', energy: 'high', pleasantness: 'unpleasant', title: 'High energy, unpleasant', words: ['stressed', 'tense', 'worried', 'restless', 'frustrated', 'irritated', 'overwhelmed', 'nervous', 'on edge', 'annoyed', 'pressured', 'jittery']},
  {id: 'high-pleasant', energy: 'high', pleasantness: 'pleasant', title: 'High energy, pleasant', words: ['excited', 'joyful', 'proud', 'energised', 'hopeful', 'playful', 'inspired', 'focused', 'confident', 'cheerful', 'curious', 'motivated']},
  {id: 'low-unpleasant', energy: 'low', pleasantness: 'unpleasant', title: 'Low energy, unpleasant', words: ['tired', 'sad', 'flat', 'lonely', 'drained', 'let down', 'bored', 'down', 'heavy', 'discouraged', 'weary', 'homesick']},
  {id: 'low-pleasant', energy: 'low', pleasantness: 'pleasant', title: 'Low energy, pleasant', words: ['calm', 'content', 'relaxed', 'grateful', 'peaceful', 'cosy', 'at ease', 'rested', 'balanced', 'gentle', 'thoughtful', 'safe']},
];
export const quadrantOf = (energy: EnergyAxis, pleasantness: Pleasantness): Quadrant => QUADRANTS.find(q => q.energy === energy && q.pleasantness === pleasantness)!;
export const quadrantOfWord = (word: string): Quadrant | undefined => QUADRANTS.find(q => q.words.includes(word));

/** The one next step a word may offer: unpleasant words only; restless and heavy, flat or bored days a short walk. */
export function nextStepFor(word: string): NextStep | null {
  const q = quadrantOfWord(word);
  if (!q || q.pleasantness === 'pleasant') return null;
  if (['restless', 'flat', 'bored', 'heavy'].includes(word)) return 'walk';
  return q.energy === 'high' ? 'breathe' : 'write';
}
/** The step's words and where it opens (each route exists today: Health → Meditation, Habits, the Journal's Write). */
export function nextStepLink(step: NextStep, walkHabitId?: string | null): {label: string; href: string; fullLoad: boolean} {
  if (step === 'breathe') return {label: 'Breathe for a minute', href: '/app/health?view=meditation', fullLoad: true};
  if (step === 'walk') return walkHabitId ? {label: 'A short walk: open your walk habit', href: `/app/habits#habit-${walkHabitId}`, fullLoad: false} : {label: 'A short walk: add it as a habit', href: '/app/habits?add=habit', fullLoad: false};
  return {label: 'Write three lines', href: '/app/journal#journal-write', fullLoad: false};
}
/** The person's own walk habit, if any (a title with "walk" or "wandel"; archived ones left out by the caller). */
export function walkHabit<T extends {id: string; title: string}>(habits: readonly T[]): T | undefined {
  return habits.find(h => /\b(walk|wandel)/i.test(h.title));
}

/** The day's word, if one was picked. */
export const feelingOn = (energy: Pick<Energy, 'words'>, day: string): MoodWordDay | undefined => wordsOf(energy)[day];
/** Sets the day's word (a newer pick replaces it); the oldest days drop past the cap. A word must be in its quadrant. */
export function setFeeling(record: Energy, day: string, word: string, at: string): Energy {
  const q = quadrantOfWord(word);
  if (!q) throw Error('Choose one of the words shown.');
  const words = {...record.words, [day]: moodWordDaySchema.parse({energy: q.energy, pleasantness: q.pleasantness, word, at})};
  const keys = Object.keys(words).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_MOOD_WORD_DAYS))) delete words[k];
  return {...record, words};
}
/** Removes the day's word (the rest of the record stays as it is). */
export function clearFeeling(record: Energy, day: string): Energy {
  if (!record.words?.[day]) return record;
  const words = {...record.words}; delete words[day];
  return {...record, words};
}
