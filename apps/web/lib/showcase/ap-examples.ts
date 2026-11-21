import {addLocalDays} from '../local-date';
import {symptomsSchema, type Symptoms} from '../symptoms/schema';
import {splitsRecordSchema, type SplitsRecord} from '../workouts/splits-schema';

/**
 * Session AT (AP D22 minor 7): labelled Showcase examples for two records Session AP added, so their places have
 * something to show in the Showcase tab (and only there; lib/showcase-data.ts writes them). Each is the record's own
 * stored format, deterministic for a day, and additive: nothing an earlier seed wrote changes.
 * - Symptoms: three example items ("Example · headache", "Example · pollen", "Example · stiff back"), as the Showcase's
 *   countdowns say "Example · ", with two weeks of levels; days without an answer stay unanswered (unknown, never "none").
 *   Private like Health: no ZIGi or NOVA context reads them (lib/showcase/ap-examples.test.ts).
 * - Run splits for the training log's two example runs (lib/workouts/showcase.ts: 5 km in 28:00, 6 km in 34:00), whole
 *   kilometres that add up to each run's time.
 * Mood tags and a bill's price change were left out here (they move Session AS's pinned answers); Session AU (D8, deliberate)
 * seeds them, labelled, in lib/showcase/au-examples.ts, with the pinned answers they move recomputed.
 */
const at = (day: string, offset: number, time: string) => `${addLocalDays(day, offset)}T${time}:00.000Z`;
export function showcaseSymptoms(day: string): Symptoms {
  const createdAt = at(day, -14, '08:00');
  const items = [
    {id: 'showcase-headache', name: 'Example · headache', kind: 'symptom' as const, createdAt},
    {id: 'showcase-pollen', name: 'Example · pollen', kind: 'factor' as const, createdAt},
    {id: 'showcase-back', name: 'Example · stiff back', kind: 'symptom' as const, createdAt},
  ];
  const days: Symptoms['days'] = {};
  for (let n = -13; n <= -1; n++) {
    if (n === -8 || n === -3) continue; // two days not answered: unknown, never "none"
    days[addLocalDays(day, n)] = {'showcase-headache': [0, 1, 0, 0, 2, 0, 1][(n + 13) % 7]!, 'showcase-pollen': n >= -6 ? 2 : 1, ...(n % 2 ? {'showcase-back': n >= -5 ? 0 : 1} : {})};
  }
  return symptomsSchema.parse({version: 1, items, days});
}
/** The two example runs' splits, by the training log's own workout ids. */
export function showcaseRunSplits(): SplitsRecord {
  return splitsRecordSchema.parse({version: 1, workouts: {
    'showcase-workout-9': {source: 'gpx', paceSecondsPerKm: 336, splits: [342, 338, 335, 334, 331].map((seconds, i) => ({km: i + 1, meters: 1000, seconds}))},
    'showcase-workout-2': {source: 'gpx', paceSecondsPerKm: 340, splits: [346, 343, 341, 339, 337, 334].map((seconds, i) => ({km: i + 1, meters: 1000, seconds}))},
  }});
}
