import {resolvePeriod} from '../../../ai/local-answers/exact/period';
import {runBest, runNow} from '../../../ai/local-answers/exact/series';
import type {Track} from '../../../ai/local-answers/exact/track';

/**
 * Session AS (ADR-042 Part 2, family: flames): the run of days of a track that is only done or not (the journal, a focus
 * session) — the days in a row ending today (today still open does not break it) and the longest run of the last year,
 * counted exactly as the exact layer's sentence counts them (track.ts: `runNow` and `runBest` over the last 366 days).
 */
export type StreakView = {
  current: number; best: number;
  /** The day the longest run ended, and whether today already counts. */
  bestEnded: string | null; todayDone: boolean;
  /** The last `back` days, oldest first: which of them count. */
  days: {date: string; done: boolean; today: boolean}[];
  /** How many of those days count. */
  recent: number;
};
export function trackStreak(track: Pick<Track, 'points'>, today: string, back = 14): StreakView {
  const year = track.points(resolvePeriod('last-366-days', today)!.days), current = runNow(year), best = runBest(year);
  const days = year.slice(-back).map(p => ({date: p.date, done: p.state === 'done', today: p.date === today}));
  return {current, best: Math.max(best.days, current), bestEnded: best.ended, todayDone: year.at(-1)?.state === 'done', days, recent: days.filter(d => d.done).length};
}
