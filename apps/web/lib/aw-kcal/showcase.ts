import {ACTIVITY_EXTRAS_KEY_LITERAL} from '../aw-kcal-keys';

/**
 * Session AW (kcal; owner decision 1a): the Showcase's one labelled example of what a person can type beside an activity —
 * today's fictional "Showcase walk" (lib/showcase-data.ts, `health_activity-029`, logged every day of the month) with its
 * distance, an easy effort and the calories typed in ("180 kcal · you entered"). Additive: the walk's steps and minutes,
 * and every count other tests pin, stay as they were. In this tab's Showcase storage only.
 */
export const SHOWCASE_EXTRAS_ACTIVITY = 'health_activity-029';
export const showcaseActivityExtras = () => ({version: 1 as const, items: {[SHOWCASE_EXTRAS_ACTIVITY]: {distanceKm: 4.2, effort: 'easy' as const, kcal: 180}}});
export function withAwKcalShowcase(records: Record<string, string>): void {
  records[ACTIVITY_EXTRAS_KEY_LITERAL] = JSON.stringify(showcaseActivityExtras());
}
