import {WORD_GOAL_MAX, WORD_GOAL_MIN, journalSchema, type Journal, type JournalEntry} from './schema';
import {wordCount} from './stats';

/**
 * Session AV lane 2 (r6-notes; LEDGER #400, Diarium's daily word goal): "My goal: 200 words a day". Today's words (the
 * entries of the day, and the words being written) shown against it while writing — "140 of 200 words today" — and the
 * days it was met marked on the journal calendar. Never a warning when it is not met, and nothing is counted against
 * the person. Only an entry's own words count (not ZIGi's question or the answer). Pure.
 */
export const goalOf = (journal: Pick<Journal, 'wordGoal'>): number | null => journal.wordGoal ?? null;
/** Words written in the entries of one day. */
export const wordsOn = (entries: readonly Pick<JournalEntry, 'date' | 'text'>[], day: string): number => entries.reduce((n, e) => e.date === day ? n + wordCount(e.text) : n, 0);
/** The days whose entries hold at least the goal's words. */
export function daysMet(entries: readonly Pick<JournalEntry, 'date' | 'text'>[], goal: number | null): Set<string> {
  if (!goal) return new Set();
  const by = new Map<string, number>();
  for (const e of entries) by.set(e.date, (by.get(e.date) ?? 0) + wordCount(e.text));
  return new Set([...by].filter(([, n]) => n >= goal).map(([d]) => d));
}
/** A goal as typed, or the sentence that says why it cannot be one. */
export function readGoal(text: string): number | string {
  const n = Number(text.trim());
  if (!text.trim() || !Number.isInteger(n)) return 'Type a whole number of words, for example 200.';
  if (n < WORD_GOAL_MIN || n > WORD_GOAL_MAX) return `Choose between ${WORD_GOAL_MIN} and ${WORD_GOAL_MAX.toLocaleString('en-US')} words a day.`;
  return n;
}
/** The journal with this goal, or with none (null). */
export function setWordGoal(journal: Journal, goal: number | null): Journal {
  const next: Journal = {...journal};
  if (goal) next.wordGoal = goal; else delete next.wordGoal;
  return journalSchema.parse(next);
}
/** The line while writing: calm in both cases; "met" once the day holds the goal. */
export function goalLine(today: number, goal: number): {text: string; met: boolean} {
  return today >= goal ? {text: `${today.toLocaleString('en-US')} words today: your ${goal.toLocaleString('en-US')} are written.`, met: true} : {text: `${today.toLocaleString('en-US')} of ${goal.toLocaleString('en-US')} words today.`, met: false};
}
/** Review b6n B6N-7: what the status says — once the goal is reached, the same words until it is not; else nothing. */
export const goalReachedWords = (met: boolean, goal: number): string => met ? `Your ${goal.toLocaleString('en-US')} words for today are written.` : '';
