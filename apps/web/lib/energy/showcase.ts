import {addLocalDays} from '../local-date';
import {energySchema, type Energy} from './schema';

/** Session AI: the Showcase's fictional energy ratings for the last two weeks (lower on short-sleep days). */
export function showcaseEnergy(day: string): Energy {
  const values = [4, 2, 4, 3, 3, 5, 2, 3, 4, 2, 3, 5, 3, 4];
  return energySchema.parse({version: 1, days: Object.fromEntries(values.map((v, i) => [addLocalDays(day, -i), {energy: v, at: `${addLocalDays(day, -i)}T20:30:00.000Z`}]))});
}
