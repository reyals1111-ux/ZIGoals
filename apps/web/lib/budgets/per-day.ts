import {monthOf} from '../money-log/engine';

/**
 * Session AV lane 2, round 2 (money; Spendee's daily amount left): what is left divided by the days left in a budget's
 * own period, rounded down to the cent — a fact from the person's own figures, never advice. Pure; nothing stored.
 */
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
/** Cents a day for what is left over `daysLeft` days; null when nothing is left or no day is. */
export const perDay = (leftCents: number, daysLeft: number | null | undefined): number | null => leftCents > 0 && daysLeft && daysLeft > 0 ? Math.floor(leftCents / daysLeft) : null;
/** The days left in the month of `today`, today included. */
export const daysLeftInMonth = (today: string) => daysBetween(today, monthOf(today).end) + 1;
/** "About €6.40 a day for 9 days" (one day: "€6.40 for the last day"). */
export function perDayWords(leftCents: number, daysLeft: number, money: (cents: number, currency: string) => string, currency: string): string | null {
  const a = perDay(leftCents, daysLeft);
  if (a === null) return null;
  return daysLeft === 1 ? `${money(a, currency)} left for the last day` : `About ${money(a, currency)} a day left for ${daysLeft} days`;
}

