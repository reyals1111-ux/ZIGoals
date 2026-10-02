// Calendar dates as `YYYY-MM-DD` strings, with day arithmetic on whole epoch days.
// No time of day and no time zone is involved, so daylight-saving changes cannot
// shift a result. Pure: no clock, no host time zone, no I/O. Not wired into the app
// yet; see docs/product/TIMEZONE_DESIGN.md.

/** Same year range as the goal engine's `currentDate`/`targetDate`. */
export const MIN_YEAR = 1900;
export const MAX_YEAR = 9999;
const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

const leapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** Days in a Gregorian month (1-12). */
export function daysInMonth(year: number, month: number): number {
  return [31, leapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
}

/** True for a real Gregorian date written exactly as `YYYY-MM-DD`, years 1900-9999. */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return year >= MIN_YEAR && year <= MAX_YEAR && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

function parts(date: string): [number, number, number] {
  if (!isCalendarDate(date)) throw new RangeError(`Invalid calendar date: ${String(date)}`);
  return [Number(date.slice(0, 4)), Number(date.slice(5, 7)), Number(date.slice(8, 10))];
}

/** Whole days since 1970-01-01 (negative before it). */
export function epochDay(date: string): number {
  const [year, month, day] = parts(date);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

/** The calendar date of an epoch day. */
export function fromEpochDay(day: number): string {
  if (!Number.isSafeInteger(day)) throw new RangeError(`Invalid epoch day: ${day}`);
  const value = new Date(day * DAY_MS);
  const year = value.getUTCFullYear();
  if (!(year >= MIN_YEAR && year <= MAX_YEAR)) throw new RangeError(`Date out of range: epoch day ${day}`);
  return `${String(year).padStart(4, "0")}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}

/** `date` moved by `days` calendar days (negative moves back). */
export function addDays(date: string, days: number): string {
  if (!Number.isSafeInteger(days)) throw new RangeError(`Invalid day count: ${days}`);
  return fromEpochDay(epochDay(date) + days);
}

/** Calendar days from `from` to `to`: positive when `to` is later. */
export function daysBetween(from: string, to: string): number {
  return epochDay(to) - epochDay(from);
}

/** ISO weekday: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(date: string): number {
  // 1970-01-01 was a Thursday (ISO 4).
  return ((((epochDay(date) + 3) % 7) + 7) % 7) + 1;
}

/** The Monday that starts the ISO week containing `date`. */
export function startOfIsoWeek(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}
