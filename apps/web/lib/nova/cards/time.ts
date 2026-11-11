/**
 * Session AM (ADR-038): the figures of NOVA's "Time" widget — how much of today, of this week and of this year has
 * passed on this device's clock. No records are read. Everything is measured between real local midnights, so a day
 * that is 23 or 25 hours long (a clock change) and a leap year are their true lengths. The week starts on Monday, as the
 * Habits week does.
 */
export type TimeRing = {
  /** The share of the period that has passed, 0–1. */
  share: number;
  /** Whole days still to come after today (0 on the period's last day). */
  daysLeft: number;
};
export type TimeRings = {
  day: {share: number; /** Whole minutes until midnight. */ minutesLeft: number};
  week: TimeRing;
  year: TimeRing & {/** Today's place in the year (1 on 1 January) and the year's length (365 or 366). */ dayOfYear: number; days: number};
  /** Whole days still to come this month after today. */
  monthDaysLeft: number;
};

const DAY = 86_400_000;
const midnight = (now: Date, days = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
const share = (from: Date, to: Date, now: Date) => Math.max(0, Math.min(1, (now.getTime() - from.getTime()) / (to.getTime() - from.getTime())));
/** Whole calendar days from one local midnight to another (rounded, so a clock change inside the span does not shift it). */
const wholeDays = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / DAY);

export function timeRings(now: Date): TimeRings {
  const today = midnight(now), tomorrow = midnight(now, 1);
  const sinceMonday = (now.getDay() + 6) % 7, monday = midnight(now, -sinceMonday), nextMonday = midnight(now, 7 - sinceMonday);
  const newYear = new Date(now.getFullYear(), 0, 1), nextYear = new Date(now.getFullYear() + 1, 0, 1), nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    day: {share: share(today, tomorrow, now), minutesLeft: Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 60_000))},
    week: {share: share(monday, nextMonday, now), daysLeft: 6 - sinceMonday},
    year: {share: share(newYear, nextYear, now), daysLeft: wholeDays(tomorrow, nextYear), dayOfYear: wholeDays(newYear, today) + 1, days: wholeDays(newYear, nextYear)},
    monthDaysLeft: wholeDays(tomorrow, nextMonth),
  };
}

/** What is left of today, in words: "9 h left", "40 min left", "Under a minute left". */
export function dayLeftWords(minutesLeft: number): string {
  const m = Math.max(0, Math.floor(minutesLeft));
  return m >= 60 ? `${Math.floor(m / 60)} h left` : m >= 1 ? `${m} min left` : 'Under a minute left';
}
/** Days still to come in a period, in words: "4 days left", "1 day left", "Last day". */
export const daysLeftWords = (days: number): string => days <= 0 ? 'Last day' : `${days} ${days === 1 ? 'day' : 'days'} left`;

/** Milliseconds from `ms` (an instant) to the next whole minute: 60 000 exactly on a minute, never 0. */
export const msToNextMinute = (ms: number): number => 60_000 - (((ms % 60_000) + 60_000) % 60_000);
