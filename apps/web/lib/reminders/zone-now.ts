import {localDate, localWeekday} from '../local-date';
import {journalTimeZone} from '../journal-zone';
import {localClock, zoneClock} from './due';

/**
 * Session AK F0 (M4, QA2-04's sibling): "now" as a reminder reads it — the calendar day, its weekday (0 = Sunday) and the
 * clock as "HH:MM" — all three in ONE zone: the person's journal zone (Settings) when one is set, else this device's. A
 * weekly reminder ("Sunday at 18:00") then follows the same zone as the day it is dismissed for and as the habit and water
 * reminders (lib/reminders/due.ts), so a person travelling with the journal at home never sees Monday's reminder on the
 * device's Sunday evening. An unknown zone falls back to the device, never to UTC. Pure; reads the journal zone only when
 * the caller passes none.
 */
export type ZoneNow = {day: string; weekday: number; clock: string};
export function zoneNow(now: Date, zone: string | null | undefined = journalTimeZone()): ZoneNow {
  const device = (): ZoneNow => ({day: localDate(now), weekday: now.getDay(), clock: localClock(now)});
  if (!zone) return device();
  try {
    const parts = new Intl.DateTimeFormat('en', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(now);
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
    const day = `${get('year')}-${get('month')}-${get('day')}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return device();
    return {day, weekday: localWeekday(day), clock: zoneClock(zone, now)};
  } catch { return device(); }
}
