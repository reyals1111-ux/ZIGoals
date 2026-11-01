/**
 * Session AK G2 (RELEASE_REVIEW R31): one capitalisation rule for the app's words. "goal" and "habit" are lowercase in
 * running text ("No active goal yet", "3 of 5 habits complete"); they are capitalised only at the start of a sentence or
 * as the name of a page or a card (Goals, Habits, Daily Habits). Shared copy builds its counts and empty lines here, so
 * the rule lives in one place.
 */
export type Term = 'goal' | 'habit';
/** The word for `n` of a thing, lowercase: 1 → "goal", any other count → "goals". */
export const termFor = (term: Term, n = 1) => n === 1 ? term : `${term}s`;
/** "3 active goals", "1 active goal". */
export const activeCount = (term: Term, n: number) => `${n} active ${termFor(term, n)}`;
/** "2 of 5 habits complete". */
export const doneOf = (term: Term, done: number, due: number) => `${done} of ${due} ${termFor(term, due)} complete`;
/** The word at the start of a sentence: "Goals", "Habit". */
export const sentenceStart = (word: string) => word ? word[0]!.toUpperCase() + word.slice(1) : word;
