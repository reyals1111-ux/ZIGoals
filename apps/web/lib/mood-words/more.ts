import {readCheckin, type QuadrantKey} from '../checkin-extras/rule';
import {MAX_MORE_WORDS, moodWordDaySchema, wordsOf, type MoreWord, type Strength} from './schema';
import {quadrantOfWord} from './words';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #232, Moodnotes' feelings with a strength): up to three feeling words on a day —
 * the day's word and two more — each with a strength (a little, quite, very), pure. The day's word stays where every
 * reader looks (`word`); the strength and the others are additive fields on the loose day, so older builds keep reading
 * the one word. A word must be a built-in word or one of the person's own words, and appears once a day.
 */
export const STRENGTH_WORDS: Record<Strength, {en: string; nl: string}> = {little: {en: 'a little', nl: 'een beetje'}, quite: {en: 'quite', nl: 'best wel'}, very: {en: 'very', nl: 'heel erg'}};
type Words = {words?: Record<string, unknown>};
const rawDay = (r: Words, day: string): Record<string, unknown> | null => { const v = r.words?.[day]; return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null; };
/** Writes the day back as it is (its other fields, such as an own word's mark, kept), after checking it still reads. */
const withDay = <T extends Words>(r: T, day: string, value: Record<string, unknown>): T => { moodWordDaySchema.parse(value); return {...r, words: {...(r.words ?? {}), [day]: value}}; };
/** The quadrant of a word: a built-in word's, or the person's own word's. */
function quadrantFor(r: unknown, word: string): {energy: MoreWord['energy']; pleasantness: MoreWord['pleasantness']} | null {
  const q = quadrantOfWord(word);
  if (q) return {energy: q.energy, pleasantness: q.pleasantness};
  const own = readCheckin(r).ownWords, key = (Object.keys(own) as QuadrantKey[]).find(k => own[k].includes(word));
  if (!key) return null;
  const [energy, pleasantness] = key.split('-') as [MoreWord['energy'], MoreWord['pleasantness']];
  return {energy, pleasantness};
}

/** The day's words with their strengths, the day's word first; empty without one. */
export function feelingsOn(r: Words, day: string): {word: string; strength?: Strength; main: boolean}[] {
  const d = wordsOf(r)[day];
  if (!d) return [];
  return [{word: d.word, ...(d.strength ? {strength: d.strength} : {}), main: true}, ...(d.more ?? []).map(m => ({word: m.word, ...(m.strength ? {strength: m.strength} : {}), main: false}))];
}
/** "calm (quite) · tired (a little)", in English or Dutch. */
export const feelingsLine = (list: ReturnType<typeof feelingsOn>, lang: 'en' | 'nl' = 'en') => list.map(f => f.strength ? `${f.word} (${STRENGTH_WORDS[f.strength][lang]})` : f.word).join(' · ');

/** Sets (or clears, with null) the strength of a word of the day: the day's word or one of the more. */
export function setStrength<T extends Words>(r: T, day: string, word: string, strength: Strength | null): T {
  const d = rawDay(r, day), parsed = wordsOf(r)[day];
  if (!d || !parsed) throw Error('Choose a feeling word first.');
  if (parsed.word === word) { const next = {...d}; if (strength) next.strength = strength; else delete next.strength; return withDay(r, day, next); }
  const more = (parsed.more ?? []).map(m => m.word === word ? (strength ? {...m, strength} : (({strength: _s, ...rest}) => { void _s; return rest; })(m)) : m);
  if (!more.some(m => m.word === word)) throw Error('This word is no longer on the day.');
  return withDay(r, day, {...d, more});
}
/** Adds another word to the day (up to two besides the day's word), with an optional strength. */
export function addMoreWord<T extends Words>(r: T, day: string, word: string, strength: Strength | null = null): T {
  const d = rawDay(r, day), parsed = wordsOf(r)[day];
  if (!d || !parsed) throw Error('Choose the day’s word first.');
  const q = quadrantFor(r, word);
  if (!q) throw Error('Choose one of the words shown.');
  const more = parsed.more ?? [];
  if (parsed.word === word || more.some(m => m.word === word)) throw Error(`“${word}” is already one of today’s words.`);
  if (more.length >= MAX_MORE_WORDS) throw Error(`Up to ${MAX_MORE_WORDS + 1} words a day. Remove one first.`);
  return withDay(r, day, {...d, more: [...more, {...q, word, ...(strength ? {strength} : {})}]});
}
/** Removes one of the more words (the day's own word is removed with "Remove the word", as before). */
export function removeMoreWord<T extends Words>(r: T, day: string, word: string): T {
  const d = rawDay(r, day), parsed = wordsOf(r)[day];
  if (!d || !parsed) return r;
  const more = (parsed.more ?? []).filter(m => m.word !== word), next = {...d};
  if (more.length) next.more = more; else delete next.more;
  return withDay(r, day, next);
}
/**
 * After the day's word is replaced (setFeeling or an own word writes a fresh day), keeps the more words that were there
 * (minus the new word, if it was one of them). The new word's strength starts empty.
 */
export function keepMore<T extends Words>(before: T, after: T, day: string): T {
  const old = wordsOf(before)[day], d = rawDay(after, day), now = wordsOf(after)[day];
  if (!old?.more?.length || !d || !now) return after;
  const kept = old.more.filter(m => m.word !== now.word).slice(0, MAX_MORE_WORDS);
  return kept.length ? withDay(after, day, {...d, more: kept}) : after;
}
