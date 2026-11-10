import {addLocalDays, localWeekday} from '../local-date';
import type {WeeklyReview} from './schema';

/* The weekly review's window and state (lib/weekly-review/engine.ts re-exports these), in their own module (CI13, weights)
   so a page that only asks "is the review due?" (Journey's quests, the Agenda, the review card) does not load the week
   summary's Wealth and goal code with it. */

/** The week a review looks back on: the most recent chosen weekday on or before today, and the six days before it. */
export function reviewWindow(weekday: number, today: string): {reviewDay: string; weekStart: string; weekEnd: string} {
  const back = (localWeekday(today) - weekday + 7) % 7, reviewDay = addLocalDays(today, -back);
  return {reviewDay, weekStart: addLocalDays(reviewDay, -6), weekEnd: reviewDay};
}
export type ReviewState = 'due' | 'draft' | 'done' | 'skipped';
/** Whether the current review is still open: due (untouched), a draft (words saved), done or skipped. */
export function reviewState(data: WeeklyReview, weekStart: string): ReviewState {
  const review = data.reviews.find(r => r.weekStart === weekStart);
  if (!review) return 'due';
  if (review.completedAt) return 'done';
  if (review.skipped) return 'skipped';
  return 'draft';
}
