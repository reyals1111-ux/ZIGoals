import {deviceTimeZone, journalTimeZone} from '../journal-zone';

/**
 * The Checklist's day (Session AF, ADR-028 H66; P7.15): local midnight in the person's journal time zone, else this
 * device's. The app has no day-start hour, so midnight is the rule (said once in Options). Each page still writes with its
 * own day (Habits' zone override, Health's zone); when that differs the dot says which date it was logged for.
 */
export function zonedDay(now: Date, zone: string): string {
  const parts = new Intl.DateTimeFormat('en', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(now), get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export const checklistZone = (): string => journalTimeZone() ?? deviceTimeZone();
