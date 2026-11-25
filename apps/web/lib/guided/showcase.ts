import {GUIDED_JOURNEYS_KEY, type GuidedJourneys} from './schema';

/**
 * Session AW (programmes; owner decision 1d): the Showcase's one programme in progress, labelled "(Showcase)" on the page
 * (`showcase: true`): "0 to 5 km in 8 weeks", started a week before the Showcase day, so today is run 4 (week 2): week 1's
 * three runs done, today's warm-up ticked. Ids only (lib/guided/showcase.test.ts proves each is in the programme), so the
 * Showcase does not load the programmes' text.
 */
const before = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
export function showcaseGuidedJourneys(day: string): GuidedJourneys {
  return {version: 1, journeys: [{programId: 'run-5k', startedOn: before(day, 7), done: ['w1-r1', 'w1-r2', 'w1-r3'], stepsDone: ['w2-r1/warm-up'], showcase: true}]};
}
export const SHOWCASE_GUIDED_KEY = GUIDED_JOURNEYS_KEY;
