import {addLocalDays} from '../local-date';
import {scalesSchema, type Scales} from './store';

/**
 * Session AK (BUILD list 2 #12): the Showcase's fictional scales — "Stress" and "Focus (Showcase)" rated on most of the
 * last 60 days, with a few days skipped (skipping is fine). The values follow a fixed weekly pattern, never a random
 * one, so the example is the same each time. The lead writes it to `zigoals:scales:v1` in the Showcase tab only.
 */
export function showcaseScales(day: string): Scales {
  const days: Scales['days'] = {};
  const stress = [3, 4, 3, 2, 4, 2, 1], focus = [3, 2, 4, 4, 2, 4, 5];
  for (let i = 0; i < 60; i++) {
    if (i % 9 === 4) continue; // a skipped day stays unknown
    const date = addLocalDays(day, -i), k = i % 7;
    days[date] = {'showcase-stress': stress[k]!, ...(i % 5 === 2 ? {} : {'showcase-focus': focus[k]!})};
  }
  return scalesSchema.parse({version: 1, days, scales: [
    {id: 'showcase-stress', name: 'Stress (Showcase)', low: 'calm', high: 'very tense'},
    {id: 'showcase-focus', name: 'Focus (Showcase)', low: 'scattered', high: 'sharp'},
  ]});
}
