import {addLocalDays} from '../local-date';
import {cycleSchema, type Cycle} from './store';

/**
 * Session AK (BUILD list 2 #16): the Showcase's fictional cycle log, turned on so the example can be seen: five periods
 * with cycles of 27 to 31 days, a few symptom chips, and one note that says it is Showcase data. The lead writes it to
 * `zigoals:cycle:v1` in the Showcase tab only (with the Health examples).
 */
export function showcaseCycle(day: string): Cycle {
  const lengths = [29, 27, 31, 28], days: Cycle['days'] = {};
  let start = addLocalDays(day, -(lengths.reduce((a, b) => a + b, 0) + 9));
  for (let p = 0; p <= lengths.length; p++) {
    for (let i = 0; i < 5; i++) days[addLocalDays(start, i)] = {flow: i === 0 ? 'medium' : i < 3 ? 'heavy' : 'light', ...(i === 0 ? {symptoms: ['cramps', 'tired']} : {})};
    if (p === 0) days[addLocalDays(start, 0)] = {...days[addLocalDays(start, 0)], note: 'Showcase example: fictional entries.'};
    if (p < lengths.length) { days[addLocalDays(start, lengths[p]! - 2)] = {symptoms: ['bloating', 'headache']}; start = addLocalDays(start, lengths[p]!); }
  }
  return cycleSchema.parse({version: 1, on: true, days});
}
