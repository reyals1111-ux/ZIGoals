import {sleepSchema, type Sleep, type SleepNight} from './schema';
import {addDays, instantAt} from '../zone-time';

/**
 * Showcase sleep (Session W Part 4): 30 fictional days ending on the Showcase day, with three nights left unlogged (so
 * the charts show gaps, never zeros), a nap, tags on some nights so the patterns have something to describe, and a goal
 * with a bedtime window. Deterministic: the same day always gives the same nights.
 */
const ZONE = 'Europe/Brussels';
export function showcaseSleep(day: string): Sleep {
  let seed = 7;
  const next = (n: number) => { seed = (seed * 48271) % 2147483647; return seed % n; };
  const nights: SleepNight[] = [];
  for (let i = 29; i >= 0; i--) {
    const wake = addDays(day, -i);
    const r = [next(80), next(75), next(20), next(30), next(4), next(10)] as const;
    if (i === 4 || i === 11 || i === 19) continue;
    const caffeine = i % 4 === 1, screens = i % 5 === 2;
    const bedMinutes = 22 * 60 + 35 + r[0] + (caffeine ? 30 : 0), bed = bedMinutes >= 1440 ? {date: wake, clock: clock(bedMinutes - 1440)} : {date: addDays(wake, -1), clock: clock(bedMinutes)};
    const wakeMinutes = 6 * 60 + 30 + r[1];
    const id = `health_sleep-showcase-${String(29 - i).padStart(4, '0')}`;
    nights.push({id, kind: 'night', start: new Date(instantAt(bed.date, bed.clock, ZONE)).toISOString(), end: new Date(instantAt(wake, clock(wakeMinutes), ZONE)).toISOString(), timeZone: ZONE,
      latencyMin: 8 + r[2] + (caffeine ? 15 : 0), awakeMin: r[3], awakenings: r[3] > 15 ? 2 : r[3] > 5 ? 1 : 0, quality: Math.max(1, Math.min(5, 4 - (caffeine ? 1 : 0) - (r[4] === 0 ? 1 : 0) + (r[5] > 7 ? 1 : 0))),
      ...(caffeine || screens ? {tags: [...(caffeine ? ['caffeine'] : []), ...(screens ? ['screens'] : [])]} : {}),
      ...(i === 1 ? {note: 'SHOWCASE DATA · fictional night'} : {}), source: 'manual', createdAt: `${wake}T08:00:00.000Z`, updatedAt: `${wake}T08:00:00.000Z`});
  }
  const napDay = addDays(day, -2);
  nights.push({id: 'health_sleep-showcase-nap-0001', kind: 'nap', start: new Date(instantAt(napDay, '14:10', ZONE)).toISOString(), end: new Date(instantAt(napDay, '14:35', ZONE)).toISOString(), timeZone: ZONE, source: 'manual', createdAt: `${napDay}T15:00:00.000Z`, updatedAt: `${napDay}T15:00:00.000Z`});
  return sleepSchema.parse({version: 1, nights, goal: {minutes: 480, bedFrom: '22:30', bedTo: '23:30', updatedAt: `${addDays(day, -29)}T08:00:00.000Z`}});
}
function clock(minutes: number) { return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
