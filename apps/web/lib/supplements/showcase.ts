import {addLocalDays} from '../local-date';
import {supplementsSchema, type Supplements} from './schema';
import {scheduledOn} from './log';

/**
 * Session AK (F5b): the Showcase person's supplements log, fictional and labelled: two supplements with a morning and an
 * evening time and one as-needed item, two weeks of marks with a skip and two days left unlogged (unknown, said as such),
 * the vitamin D reminder on. Deterministic: the same day gives the same bytes. No real medicine names, no doses that read
 * as advice.
 */
export function showcaseSupplements(day: string): Supplements {
  const date = (offset: number) => addLocalDays(day, offset), at = (offset: number, time: string) => `${date(offset)}T${time}:00.000Z`;
  const created = at(-20, '08:00');
  const items = [
    {id: 'supp_showcase-vitd', name: 'Vitamin D (Showcase)', dose: '1 capsule', kind: 'supplement' as const, times: ['08:00'], weekdays: 127, note: 'SHOWCASE DATA · fictional example', remind: true, createdAt: created},
    {id: 'supp_showcase-mag', name: 'Magnesium (Showcase)', dose: '1 tablet', kind: 'supplement' as const, times: ['21:30'], weekdays: 127, note: 'SHOWCASE DATA · fictional example', createdAt: created},
    {id: 'supp_showcase-drops', name: 'Eye drops (Showcase)', dose: '1 drop each eye', kind: 'medication' as const, times: [], weekdays: 127, note: 'SHOWCASE DATA · fictional, as needed', createdAt: created},
  ];
  const log: NonNullable<Supplements['log']> = [];
  for (let n = -13; n <= -1; n++) {
    if (n === -6 || n === -10) continue; // two days not logged: unknown, never counted as missed
    if (scheduledOn(items[0]!, date(n))) log.push({itemId: 'supp_showcase-vitd', date: date(n), slot: '08:00', status: 'taken', at: at(n, '08:05')});
    if (scheduledOn(items[1]!, date(n))) log.push({itemId: 'supp_showcase-mag', date: date(n), slot: '21:30', status: n === -3 ? 'skipped' : 'taken', at: at(n, '21:40')});
    if (n === -8 || n === -2) log.push({itemId: 'supp_showcase-drops', date: date(n), slot: 'any', status: 'taken', at: at(n, '15:00')});
  }
  log.push({itemId: 'supp_showcase-vitd', date: day, slot: '08:00', status: 'taken', at: at(0, '00:00')}); // today's mark keeps the day's start (lib/showcase-moment.ts)
  log.sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot) || a.itemId.localeCompare(b.itemId));
  return supplementsSchema.parse({version: 1, items, log});
}
