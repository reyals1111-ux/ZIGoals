import {addLocalDays} from '../local-date';
import {networthMilestonesSchema, type NetworthMilestones} from './milestones';

/**
 * Session AK (F5a, item 3): the Showcase person's net-worth milestones, on, in US dollars (the Showcase accounts' own
 * currency): 10,000 passed some months ago (already seen), 25,000 and 100,000 ahead. If the Showcase net worth in USD is
 * past 25,000 on the day, Wealth shows the one calm celebration once in that tab, labelled by the record's note. The
 * lead wires it as `records[NETWORTH_MILESTONES_KEY]` in lib/showcase-data.ts. Deterministic for a day.
 */
export function showcaseNetworthMilestones(day: string): NetworthMilestones {
  const on = addLocalDays(day, -120);
  return networthMilestonesSchema.parse({version: 1, enabled: true, currency: 'USD', amounts: ['10000', '25000', '100000'],
    reached: [{currency: 'USD', amount: '10000', on, shownAt: `${on}T18:00:00.000Z`}], note: 'SHOWCASE DATA · fictional milestones'});
}
