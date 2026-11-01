import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (T2; `TIER 3 (stored format)`): calendars the person imported from an .ics file, shown read-only on the
 * Agenda. A new device-only key `zigoals:calendar-import:v1`, loose and versioned; never synced, never sent anywhere.
 * What is kept is the least the Agenda needs: each event's title, its start (a day, or a day and a wall-clock time with
 * its zone), its length and a simple repeat rule. Nothing else from the file is kept (no description, location,
 * attendees, organiser, links or attachments), and the event's own UID is kept only as a short hash.
 *
 * Bounds: at most 8 calendars and 1,500 events in all, titles 120 characters, 100 skipped dates per event.
 */
export const CALENDAR_IMPORT_KEY = 'zigoals:calendar-import:v1';
export const MAX_CALENDARS = 8, MAX_STORED_EVENTS = 1500, MAX_TITLE = 120, MAX_EXDATES = 100, MAX_CALENDAR_NAME = 60;
export const ICS_FREQS = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/, WALL_RE = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/;
const wallOrDay = z.string().refine(v => DAY_RE.test(v) || WALL_RE.test(v), 'A day, or a day and a time.');
export const icsRuleSchema = z.looseObject({
  freq: z.enum(ICS_FREQS),
  interval: z.number().int().min(1).max(366).default(1),
  count: z.number().int().min(1).max(1000).optional(),
  /** The last start allowed, in the event's own wall time (a day, or a day and a time). */
  until: wallOrDay.optional(),
  /** Weekdays (0 = Sunday … 6 = Saturday): the days of a weekly rule, or a filter on a daily one. */
  byDay: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  /** A monthly rule's "nth weekday" (1 = first … 5, −1 = last … −5), with `byDay`'s weekdays. */
  nth: z.number().int().min(-5).max(5).refine(n => n !== 0).optional(),
  /** A monthly rule's days of the month (−1 is the last day). */
  byMonthDay: z.array(z.number().int().min(-31).max(31).refine(n => n !== 0)).max(31).optional(),
});
export const importedEventSchema = z.looseObject({
  /** A short hash of the event's UID (and its recurrence id), never the UID itself. */
  id: z.string().regex(/^[0-9a-f]{16}$/),
  title: z.string().min(1).max(MAX_TITLE),
  allDay: z.boolean(),
  /** All-day: the first day. Timed: the day and time in `tz` (or floating, wherever the person is, without `tz`). */
  start: wallOrDay,
  /** 'UTC' or an IANA zone the device knows; absent is a floating time. */
  tz: z.string().max(64).optional(),
  /** A timed event's length in minutes (0 is a moment). */
  minutes: z.number().int().min(0).max(1440).optional(),
  /** An all-day event's number of days (1–14). */
  days: z.number().int().min(1).max(14).optional(),
  rule: icsRuleSchema.optional(),
  /** Starts the rule skips (EXDATE, and starts another event in the file replaces), in the event's own wall time. */
  exdates: z.array(wallOrDay).max(MAX_EXDATES).optional(),
  /** The file's repeat rule was one ZIGoals cannot read: only the first start is shown. */
  firstOnly: z.boolean().optional(),
});
export const importedCalendarSchema = z.looseObject({
  id: z.string().regex(/^cal_[A-Za-z0-9-]{8,60}$/),
  name: z.string().min(1).max(MAX_CALENDAR_NAME),
  importedAt: z.iso.datetime({offset: true}),
  events: z.array(importedEventSchema).max(MAX_STORED_EVENTS),
});
export const calendarImportSchema = z.looseObject({
  version: z.literal(1),
  calendars: z.array(importedCalendarSchema).max(MAX_CALENDARS).default([]),
});
export type IcsRule = z.infer<typeof icsRuleSchema>;
export type ImportedEvent = z.infer<typeof importedEventSchema>;
export type ImportedCalendar = z.infer<typeof importedCalendarSchema>;
export type CalendarImport = z.infer<typeof calendarImportSchema>;
export const emptyCalendarImport = (): CalendarImport => ({version: 1, calendars: []});
export const CALENDAR_IMPORT: DeviceRecordSpec<CalendarImport> = {key: CALENDAR_IMPORT_KEY, schema: calendarImportSchema, empty: emptyCalendarImport};

export const storedEventCount = (record: CalendarImport) => record.calendars.reduce((n, c) => n + c.events.length, 0);
/** Adds a calendar (refused past 8 calendars or 1,500 events in all; the message says what to do). */
export function addCalendar(record: CalendarImport, calendar: ImportedCalendar): CalendarImport {
  if (record.calendars.length >= MAX_CALENDARS) throw new Error(`You have ${MAX_CALENDARS} imported calendars, the most kept. Remove one first.`);
  const room = MAX_STORED_EVENTS - storedEventCount(record);
  if (calendar.events.length > room) throw new Error(`This calendar has ${calendar.events.length} events and there is room for ${Math.max(0, room)} more (${MAX_STORED_EVENTS} in all). Remove an imported calendar first.`);
  return calendarImportSchema.parse({...record, calendars: [...record.calendars.filter(c => c.id !== calendar.id), importedCalendarSchema.parse(calendar)]});
}
export const removeCalendar = (record: CalendarImport, id: string): CalendarImport => ({...record, calendars: record.calendars.filter(c => c.id !== id)});
/** Puts a removed calendar back where it was (Undo). */
export function restoreCalendar(record: CalendarImport, calendar: ImportedCalendar, index: number): CalendarImport {
  if (record.calendars.some(c => c.id === calendar.id)) return record;
  const list = [...record.calendars];
  list.splice(Math.max(0, Math.min(index, list.length)), 0, calendar);
  return calendarImportSchema.parse({...record, calendars: list});
}
