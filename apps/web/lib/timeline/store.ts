import * as z from 'zod';
import {DAY_TIMELINE_KEY} from '../af-extras-keys';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AF (L5b; TIER 3 storage, ADR-028 H76, D2 (a)): the Day Timeline's one record, `zigoals:day-timeline:v1` — the
 * times the person moved on this device: `habit:<habit id>` and `meal:<Breakfast|Lunch|Dinner|Snacks>` → a clock time
 * ("HH:MM") and an optional length in minutes. Like reminder times, device only and never synced; the synced habit record
 * keeps no clock time and stays exactly as it is. Versioned and loose: a key or a field a newer build adds survives a
 * write here and is simply not shown. Bytes that do not parse read as empty and unreadable and are never rewritten by a
 * read (lib/device-record.ts). Written only when the person moves a block, never on view.
 */
export const MAX_TIMES = 300, MIN_MINUTES = 5, MAX_MINUTES = 600, SNAP = 15;
export const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];
/** The keys this build moves; any other key is a newer build's and is kept as it is. */
export const TIME_KEY = /^(habit:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|meal:(Breakfast|Lunch|Snacks|Dinner))$/i;
const timeSchema = z.looseObject({time: z.string().regex(CLOCK), minutes: z.number().int().min(MIN_MINUTES).max(MAX_MINUTES).optional()});
export const dayTimelineSchema = z.looseObject({
  version: z.literal(1),
  times: z.record(z.string().min(1).max(120), timeSchema).refine(t => Object.keys(t).length <= MAX_TIMES, `Up to ${MAX_TIMES} times.`).default({}),
});
export type DayTimelineRecord = z.infer<typeof dayTimelineSchema>;
export type TimeOverride = DayTimelineRecord['times'][string];
export const emptyDayTimeline = (): DayTimelineRecord => ({version: 1, times: {}});
export const DAY_TIMELINE: DeviceRecordSpec<DayTimelineRecord> = {key: DAY_TIMELINE_KEY, schema: dayTimelineSchema, empty: emptyDayTimeline};

export const habitTimeKey = (habitId: string) => `habit:${habitId}`;
export const mealTimeKey = (slot: MealSlot) => `meal:${slot}`;
/** "HH:MM" → minutes since midnight. */
export function clockMinutes(clock: string): number { if (!CLOCK.test(clock)) throw new Error('Choose a time on a 24-hour clock.'); return Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5)); }
/** Minutes since midnight → "HH:MM" (kept inside the day: 00:00–23:45). */
export function minutesClock(minutes: number): string { const m = Math.min(1439, Math.max(0, Math.round(minutes))); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
/** The 15-minute step a move lands on, inside today (00:00–23:45). */
export const snapMinutes = (minutes: number) => Math.min(24 * 60 - SNAP, Math.max(0, Math.round(minutes / SNAP) * SNAP));

export class TimelineMoveError extends Error {}
/** Sets one block's time (and optionally its length); only keys this build knows, a real clock time, a sane length. */
export function setTime(record: DayTimelineRecord, key: string, time: string, minutes?: number): DayTimelineRecord {
  if (!TIME_KEY.test(key)) throw new TimelineMoveError('Only habits and meals move on the timeline.');
  if (!CLOCK.test(time)) throw new TimelineMoveError('Choose a time on a 24-hour clock.');
  if (minutes !== undefined && (!Number.isInteger(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES)) throw new TimelineMoveError(`Choose a length from ${MIN_MINUTES} to ${MAX_MINUTES} minutes.`);
  const old = record.times[key];
  if (!old && Object.keys(record.times).length >= MAX_TIMES) throw new TimelineMoveError(`The timeline keeps up to ${MAX_TIMES} moved times. Put one back first.`);
  const next: TimeOverride = {...(old ?? {}), time, ...(minutes !== undefined ? {minutes} : {})};
  if (minutes === undefined && old?.minutes !== undefined) next.minutes = old.minutes;
  return dayTimelineSchema.parse({...record, times: {...record.times, [key]: next}});
}
/** Puts one block back at the time its own page gives it. */
export function clearTime(record: DayTimelineRecord, key: string): DayTimelineRecord {
  if (!(key in record.times)) return record;
  const times = {...record.times}; delete times[key];
  return dayTimelineSchema.parse({...record, times});
}
/** The record as it was before a move, for Undo: the earlier override, or none. */
export function restoreTime(record: DayTimelineRecord, key: string, previous: TimeOverride | undefined): DayTimelineRecord {
  return previous ? dayTimelineSchema.parse({...record, times: {...record.times, [key]: previous}}) : clearTime(record, key);
}
