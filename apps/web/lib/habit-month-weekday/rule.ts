import * as z from 'zod';
import {addLocalDays, localWeekday} from '../local-date';

/**
 * Session AK F0 (brief 5.1): "the first Monday of the month" — a habit due on one weekday's first, second, third, fourth
 * or last occurrence in each month.
 *
 * Stored format (TIER 3 (stored format), additive): the synced habit record is strict, and a schedule kind an older build
 * does not know would make that build refuse the WHOLE habits record. So the habit keeps a schedule every build reads —
 * `{kind: "weekdays", days: [the weekday]}` — and the "which one of the month" lives in the loose habit extras record
 * (`zigoals:habit-extras:v1`, optional field `monthWeekday`: {habitId: {weekday 0–6, nth 1–4 or -1 for the last,
 * from "YYYY-MM-DD"}}, at most 400), which syncs with the habit extras section. An older build keeps the field through its
 * read-modify-write (the record is loose) and shows the habit as due on every such weekday: readable, never refused.
 *
 * The overlay applies only while the habit's rule still is that one weekday, and only from the day it was chosen, so a
 * schedule changed on an older build (or earlier history) is read exactly as stored. Dates are calendar days
 * ("YYYY-MM-DD") in the habit journal's zone, so daylight saving never moves an occurrence.
 */
export const MONTH_WEEKDAY_NTH = [1, 2, 3, 4, -1] as const;
export type MonthWeekdayNth = (typeof MONTH_WEEKDAY_NTH)[number];
const day = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
export const monthWeekdaySchema = z.looseObject({
  weekday: z.number().int().min(0).max(6),
  nth: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(-1)]),
  from: day,
});
export type MonthWeekday = {weekday: number; nth: MonthWeekdayNth; from: string};
export const MONTH_WEEKDAY_MAX = 400;
const habitId = z.string().min(1).max(100);

/** The entries of an extras record's `monthWeekday` map; an unreadable entry is left out (never guessed), the rest kept. */
export function readMonthWeekdays(extras: unknown): Record<string, MonthWeekday> {
  const raw = extras && typeof extras === 'object' ? (extras as {monthWeekday?: unknown}).monthWeekday : undefined;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, MonthWeekday> = {};
  for (const [id, value] of Object.entries(raw).slice(0, MONTH_WEEKDAY_MAX)) {
    const key = habitId.safeParse(id), entry = monthWeekdaySchema.safeParse(value);
    if (key.success && entry.success) out[id] = {weekday: entry.data.weekday, nth: entry.data.nth, from: entry.data.from};
  }
  return out;
}

const daysInMonth = (date: string) => { const [y, m] = date.split('-').map(Number) as [number, number]; return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
/** Which occurrence of its weekday a day is in its month (1–5), and whether it is the month's last one. */
export function occurrenceOf(date: string): {weekday: number; nth: number; last: boolean} {
  const dayOfMonth = Number(date.slice(8, 10));
  return {weekday: localWeekday(date), nth: Math.ceil(dayOfMonth / 7), last: dayOfMonth + 7 > daysInMonth(date)};
}
/** Whether the day is that occurrence of that weekday ("the first Monday", "the last Friday"). */
export function isMonthWeekday(rule: Pick<MonthWeekday, 'weekday' | 'nth'>, date: string): boolean {
  const o = occurrenceOf(date);
  return o.weekday === rule.weekday && (rule.nth === -1 ? o.last : o.nth === rule.nth);
}
type Schedule = {kind: string; days?: readonly number[]};
/** Whether the overlay speaks for this rule on this day: the rule is still exactly its weekday, and the day is on or after `from`. */
export function overlayApplies(rule: MonthWeekday, schedule: Schedule, date: string): boolean {
  return scheduleIsItsWeekday(rule, schedule) && date >= rule.from;
}
/** Whether a rule's schedule still is exactly the overlay's one weekday (what the label reads). */
export const scheduleIsItsWeekday = (rule: Pick<MonthWeekday, 'weekday'>, schedule: Schedule) => schedule.kind === 'weekdays' && schedule.days?.length === 1 && schedule.days[0] === rule.weekday;
/** The schedule the strict habit record keeps (every build reads it). */
export const fallbackSchedule = (rule: Pick<MonthWeekday, 'weekday'>) => ({kind: 'weekdays' as const, days: [rule.weekday]});

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const ORDINALS: Record<MonthWeekdayNth, string> = {1: 'First', 2: 'Second', 3: 'Third', 4: 'Fourth', [-1]: 'Last'};
/** "First Monday of the month" (a schedule, not a date). */
export const monthWeekdayLabel = (rule: Pick<MonthWeekday, 'weekday' | 'nth'>) => `${ORDINALS[rule.nth]} ${WEEKDAYS[rule.weekday]} of the month`;
/** The next `count` days on or after `from` that are this occurrence (at most two years ahead). */
export function nextMonthWeekdays(rule: Pick<MonthWeekday, 'weekday' | 'nth'>, from: string, count = 3): string[] {
  const out: string[] = [];
  for (let d = from, i = 0; out.length < count && i < 800; d = addLocalDays(d, 1), i++) if (isMonthWeekday(rule, d)) out.push(d);
  return out;
}
/**
 * The extras record with this habit's overlay set (or removed with null); every other field is kept as it is (a later
 * build's fields included). `keep` prunes ids the journal no longer has. Refuses more than 400 entries.
 */
export function setMonthWeekday<T extends object>(extras: T, id: string, rule: MonthWeekday | null, keep: ReadonlySet<string> | null = null): T {
  const map = readMonthWeekdays(extras);
  if (rule) map[habitId.parse(id)] = {weekday: rule.weekday, nth: rule.nth, from: monthWeekdaySchema.parse(rule).from};
  else delete map[id];
  const kept = Object.fromEntries(Object.entries(map).filter(([k]) => !keep || keep.has(k) || k === id));
  if (Object.keys(kept).length > MONTH_WEEKDAY_MAX) throw Error('Too many habits with a monthly weekday.');
  const {monthWeekday: _old, ...rest} = extras as T & {monthWeekday?: unknown}; void _old;
  return (Object.keys(kept).length ? {...rest, monthWeekday: kept} : rest) as T;
}
