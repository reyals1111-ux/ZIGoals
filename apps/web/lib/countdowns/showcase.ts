import {addLocalDays} from '../local-date';
import {countdownsSchema, type Countdowns} from './schema';

/**
 * Session AM-2 (step 3, "NOVA connected"): the Showcase's fictional countdowns, for lib/showcase-data.ts to write under
 * `zigoals:countdowns:v1` in the Showcase tab's own storage (never a person's). Deterministic for a day; every title
 * starts "Example · " (as the Showcase's tasks do). Three coming up and one that has passed, so "Days until" shows a
 * next day, the ones after it and a passed count.
 */
export function showcaseCountdowns(day: string): Countdowns {
  const at = `${addLocalDays(day, -20)}T08:00:00.000Z`;
  return countdownsSchema.parse({version: 1, items: [
    {id: 'countdown_showcase-1', title: 'Example · Mum’s birthday', date: addLocalDays(day, 3), createdAt: at},
    {id: 'countdown_showcase-2', title: 'Example · Trip to Lisbon', date: addLocalDays(day, 16), note: 'Fictional: pack light', createdAt: at},
    {id: 'countdown_showcase-3', title: 'Example · Half marathon', date: addLocalDays(day, 41), createdAt: at},
    {id: 'countdown_showcase-4', title: 'Example · Concert', date: addLocalDays(day, -5), createdAt: at},
  ]});
}
