import {addLocalDays} from '../local-date';
import {firstWeekSchema, type FirstWeek} from './store';

/**
 * Session AK (BUILD list 2 #5): the first week is the person's own start, so the Showcase never writes one. When the card
 * is turned on in the Showcase it shows this fixed, labelled example instead (read only, never stored): day 4, three
 * steps done.
 */
export function showcaseFirstWeek(day: string): FirstWeek {
  const start = addLocalDays(day, -3);
  return firstWeekSchema.parse({version: 1, startedOn: start, done: {habit: start, log: addLocalDays(start, 1), goal: addLocalDays(start, 2)}});
}
