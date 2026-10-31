import {addLocalDays} from '../local-date';
import {energySchema, type Energy} from './schema';

/** Session AI: the Showcase's fictional energy ratings for the last two weeks (lower on short-sleep days). */
export function showcaseEnergy(day: string): Energy {
  const values = [4, 2, 4, 3, 3, 5, 2, 3, 4, 2, 3, 5, 3, 4];
  // Session AK (lane S, item 6): a feeling word on four of those days, each matching the day's rating (lib/mood-words).
  const words: [number, 'high' | 'low', 'pleasant' | 'unpleasant', string][] = [[0, 'high', 'pleasant', 'focused'], [1, 'low', 'unpleasant', 'tired'], [3, 'low', 'pleasant', 'calm'], [5, 'high', 'pleasant', 'proud']];
  return energySchema.parse({version: 1, days: Object.fromEntries(values.map((v, i) => [addLocalDays(day, -i), {energy: v, at: `${addLocalDays(day, -i)}T20:30:00.000Z`}])),
    words: Object.fromEntries(words.map(([i, energy, pleasantness, word]) => [addLocalDays(day, -i), {energy, pleasantness, word, at: `${addLocalDays(day, -i)}T20:31:00.000Z`}]))});
}
