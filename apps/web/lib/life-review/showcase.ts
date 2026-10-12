import {reviewPeriod} from './engine';
import {lifeReviewSchema, type LifeReviewRecord} from './store';
import {addLocalDays} from '../local-date';

/**
 * Showcase (Session AA-Cloud Part 8): the focus a fictional person chose last week and last month, so the Life review
 * shows what it brings back ("Last week you chose…") in both periods. The figures are never stored; they come from the
 * Showcase's own records each time.
 */
export function showcaseLifeReview(day: string): LifeReviewRecord {
  const lastWeek = reviewPeriod('week', addLocalDays(day, -7)), lastMonth = reviewPeriod('month', addLocalDays(`${day.slice(0, 7)}-01`, -1));
  return lifeReviewSchema.parse({version: 1, period: 'week', focus: {
    [lastWeek.key]: {text: 'A short walk after lunch (Showcase)', setAt: `${lastWeek.end}T19:30:00.000Z`},
    [lastMonth.key]: {text: 'Bed by 23:00 on weeknights (Showcase)', setAt: `${lastMonth.end}T19:30:00.000Z`},
  }});
}
