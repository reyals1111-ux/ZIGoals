import {habitDataSchema, type HabitData} from '../habits';
import {instantAt} from '../zone-time';

/**
 * Session AK (F5b), OPTIONAL for the lead: the Showcase check-ins of "Read" are spread over the morning (07:00–10:59,
 * lib/showcase-moment.ts), so no usual time shows. This moves Read's past same-day check-ins to 07:35–07:45 so the card
 * offers "You usually check this in around 07:40". Only `updatedAt` of Read's logged past entries changes; today's entry
 * keeps the day's start (a later time could lie ahead of the viewer's clock). Wire it only if no pinned Showcase figure
 * reads Read's check-in times (lib/insights, the weekly review, the vault fixtures); deterministic for a day and zone.
 */
export function showcaseUsualTime(habits: HabitData, day: string, zone: string, title = 'Read'): HabitData {
  return habitDataSchema.parse({...habits, habits: habits.habits.map(h => h.title !== title ? h : {...h, entries: h.entries.map(e => {
    if (e.disposition !== 'logged' || !(e.count > 0) || e.date >= day) return e;
    const minute = 35 + Number(e.date.slice(-2)) % 11;
    return {...e, updatedAt: new Date(instantAt(e.date, `07:${minute}`, zone)).toISOString()};
  })})});
}
