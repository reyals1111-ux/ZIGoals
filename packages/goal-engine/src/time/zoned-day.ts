// Calendar days in a named time zone, using Intl only. Every function takes the
// instant and the zone explicitly: nothing reads the clock or the host time zone, so
// the same inputs give the same day on every device. Not wired into the app yet; see
// docs/product/TIMEZONE_DESIGN.md (the QA-04 path starts with planDays below).
import { addDays, isCalendarDate } from "./calendar-date";

/** What to do with a local time a DST change skipped (gap) or repeated (overlap).
 * The same meanings as Temporal: `compatible` is `later` in a gap and `earlier` in
 * an overlap. */
export type Disambiguation = "compatible" | "earlier" | "later" | "reject";
export type ZonedDateTime = { date: string; time: string; offsetMinutes: number };

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const MAX_INSTANT = 8.64e15;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(zone: string): Intl.DateTimeFormat {
  let f = formatters.get(zone);
  if (!f) {
    // Throws RangeError for a zone Intl does not know.
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: zone, calendar: "gregory", numberingSystem: "latn", hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    formatters.set(zone, f);
  }
  return f;
}

function checkInstant(instant: number) {
  if (typeof instant !== "number" || !Number.isFinite(instant) || Math.abs(instant) > MAX_INSTANT) {
    throw new RangeError(`Invalid instant: ${String(instant)}`);
  }
}

// The zone's wall clock at `instant`, as if that wall clock were UTC (milliseconds).
function wallClock(instant: number, zone: string): number {
  checkInstant(instant);
  const ms = ((instant % 1000) + 1000) % 1000;
  const f: Record<string, number> = {};
  for (const part of formatter(zone).formatToParts(instant)) if (part.type !== "literal") f[part.type] = Number(part.value);
  const wall = Date.UTC(f.year!, f.month! - 1, f.day!, f.hour!, f.minute!, f.second!);
  // Date.UTC maps years 0-99 to 1900-1999; set the year explicitly.
  return new Date(wall).setUTCFullYear(f.year!) + ms;
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");
function formatWall(wall: number): { date: string; time: string } {
  const d = new Date(wall);
  return {
    date: `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`,
  };
}

/** True when Intl accepts `zone` as a time zone: the same rule the stored Habits and
 * Health zones use today. Intl also accepts fixed offsets such as "+05:30", which have
 * no daylight saving; the design stores IANA names. */
export function isTimeZone(zone: unknown): zone is string {
  if (typeof zone !== "string" || zone.length < 1 || zone.length > 100) return false;
  try {
    formatter(zone);
    return true;
  } catch {
    return false;
  }
}

/** The zone's UTC offset at `instant`, in minutes (east positive: Kolkata 330). */
export function offsetMinutes(instant: number, zone: string): number {
  return (wallClock(instant, zone) - instant) / MINUTE_MS;
}

/** The zone's local date (`YYYY-MM-DD`), time (`HH:MM:SS`) and offset at `instant`. */
export function zonedDateTime(instant: number, zone: string): ZonedDateTime {
  const wall = wallClock(instant, zone);
  return { ...formatWall(wall), offsetMinutes: (wall - instant) / MINUTE_MS };
}

/** The calendar day `instant` falls on in `zone`. */
export function zonedDate(instant: number, zone: string): string {
  return formatWall(wallClock(instant, zone)).date;
}

/** The instant at which the zone's clock shows `date` `time` ("HH:MM" or "HH:MM:SS").
 * A skipped local time (DST gap) or a repeated one (overlap) follows `disambiguation`;
 * `reject` throws a RangeError for both. */
export function zonedTimeToInstant(date: string, time: string, zone: string, disambiguation: Disambiguation = "compatible"): number {
  if (!isCalendarDate(date)) throw new RangeError(`Invalid calendar date: ${String(date)}`);
  const t = TIME.exec(time);
  if (!t) throw new RangeError(`Invalid local time: ${String(time)}`);
  if (!["compatible", "earlier", "later", "reject"].includes(disambiguation)) throw new RangeError(`Invalid disambiguation: ${String(disambiguation)}`);
  formatter(zone);
  const wall = Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), Number(t[1]), Number(t[2]), Number(t[3] ?? 0));
  // Any offset that can apply to this wall time is in force within a day of it.
  const before = offsetMinutes(wall - DAY_MS, zone), after = offsetMinutes(wall + DAY_MS, zone);
  const candidates = [...new Set([before, offsetMinutes(wall, zone), after])]
    .map((offset) => wall - offset * MINUTE_MS)
    .filter((instant) => wallClock(instant, zone) === wall)
    .sort((a, b) => a - b)
    .filter((instant, i, all) => i === 0 || instant !== all[i - 1]);
  if (candidates.length === 1) return candidates[0]!;
  if (candidates.length > 1) {
    if (disambiguation === "reject") throw new RangeError(`${date} ${time} occurs twice in ${zone}`);
    return disambiguation === "later" ? candidates.at(-1)! : candidates[0]!;
  }
  if (disambiguation === "reject") throw new RangeError(`${date} ${time} does not exist in ${zone}`);
  // In a gap, read the wall time with the offset before the change (lands after the
  // gap, `later`) or after it (lands before the gap, `earlier`).
  return wall - (disambiguation === "earlier" ? after : before) * MINUTE_MS;
}

/** The first instant of `date` in `zone`. Usually local midnight; 01:00 where a DST
 * change skips midnight. */
export function startOfZonedDay(date: string, zone: string): number {
  return zonedTimeToInstant(date, "00:00", zone, "compatible");
}

/** The zone's `date` as a half-open interval [start, end), with its length in hours:
 * 24 normally, 23 or 25 on a DST change, 23.5 or 24.5 at Lord Howe, and 0 for a day
 * the zone skipped entirely (Pacific/Apia, 2011-12-30). */
export function zonedDayBounds(date: string, zone: string): { start: number; end: number; hours: number } {
  const start = startOfZonedDay(date, zone), end = startOfZonedDay(addDays(date, 1), zone);
  return { start, end, hours: (end - start) / 3_600_000 };
}

/** "Today" and "tomorrow" for a plan whose days are counted in `zone`. With the
 * default "UTC" this equals what goal funding and plan revisions compute today
 * (`goal-intelligence.ts` `fundingHealth`, `plan-revisions.ts` `day`/`shift`). The
 * QA-04 fix would pass the plan's own zone instead. */
export function planDays(now: number, zone = "UTC"): { today: string; tomorrow: string } {
  const today = zonedDate(now, zone);
  return { today, tomorrow: addDays(today, 1) };
}
