import {addLocalDays} from '../local-date';
import {experimentsSchema, type Experiments} from './store';

/**
 * Session AK (BUILD list 2 #8): the Showcase's one finished experiment, on the Showcase's own fictional records. It
 * follows the Showcase habit done most often over the last four weeks (the lead passes the Showcase habits), with mood
 * as the outcome; the result is worked out like any other, so it says honestly what those records show, even "not
 * enough to say". Labelled in its title.
 */
export function showcaseExperiments(day: string, habits?: {habits: readonly {id: string; title: string; entries: readonly {date: string; count: number}[]}[]} | null): Experiments {
  const from = addLocalDays(day, -27);
  const best = [...(habits?.habits ?? [])].map(h => ({h, n: h.entries.filter(e => e.count > 0 && e.date >= from && e.date <= day).length})).sort((a, b) => b.n - a.n || a.h.id.localeCompare(b.h.id))[0];
  const start = addLocalDays(day, -20);
  return experimentsSchema.parse({version: 1, items: [{
    id: 'showcase-experiment-1', title: best ? `${best.h.title.slice(0, 50)} for 14 days (Showcase)` : 'Workout days for 14 days (Showcase)',
    factor: best ? `habit:${best.h.id}` : 'workout', outcome: 'mood', start, days: 14,
    note: 'A fictional Showcase experiment.',
  }]});
}
