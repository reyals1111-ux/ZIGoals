import {addLocalDays, localWeekday} from '../local-date';
import {stableHash} from './ics';
import {calendarImportSchema, type CalendarImport} from './calendar';

/**
 * Session AK (T2): the Showcase's fictional imported calendar, for lib/showcase-data.ts to write under
 * `zigoals:calendar-import:v1` (CALENDAR_IMPORT_KEY). One calendar, "Example · Family calendar", deterministic for a
 * day: a weekly lesson (floating time), a monthly call kept in New York time (so it shows in the viewer's own zone), a
 * three-day all-day trip and a one-off dinner. Every title starts "Example · ".
 */
export function showcaseCalendarImport(day: string): CalendarImport {
  const id = (s: string) => stableHash(`showcase-calendar:${s}`);
  const nextWeekday = (wd: number) => addLocalDays(day, ((wd - localWeekday(day)) + 7) % 7);
  return calendarImportSchema.parse({version: 1, calendars: [{id: 'cal_showcase-family', name: 'Example · Family calendar', importedAt: `${addLocalDays(day, -2)}T09:00:00.000Z`, events: [
    {id: id('swim'), title: 'Example · Swimming lesson', allDay: false, start: `${nextWeekday(3)}T17:30`, minutes: 45, rule: {freq: 'WEEKLY', interval: 1, byDay: [3], count: 10}},
    {id: id('call'), title: 'Example · Call with the planner', allDay: false, start: `${addLocalDays(day, 1)}T09:00`, tz: 'America/New_York', minutes: 30, rule: {freq: 'MONTHLY', interval: 1, count: 6}},
    {id: id('trip'), title: 'Example · Weekend by the lake', allDay: true, start: addLocalDays(day, 4), days: 3},
    {id: id('dinner'), title: 'Example · Dinner with friends', allDay: false, start: `${addLocalDays(day, 2)}T19:30`, minutes: 120},
  ]}]});
}
