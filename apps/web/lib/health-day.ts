/**
 * Session AH Part 17 (owner addition): the Health journal's chosen day. A `?date=` deep link or a picked date is read
 * as a calendar day (YYYY-MM-DD) between 1900-01-01 and today; anything else, a future day included, is today: the
 * future cannot be logged. The words are the owner's: "Thu 22 Oct", with "Today", "Yesterday" or "3 days ago".
 */
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const noon = (day: string) => Date.parse(`${day}T12:00:00Z`);

export function journalDay(value: string | null | undefined, today: string): string {
  if (!value || !DAY.test(value) || value < '1900-01-01' || value > today) return today;
  const at = noon(value);
  return Number.isFinite(at) && new Date(at).toISOString().slice(0, 10) === value ? value : today;
}

/** "Thu 22 Oct" (the year is added when it is not today's). */
export function dayName(day: string, today: string): string {
  const parts: Intl.DateTimeFormatOptions = {weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC'};
  if (day.slice(0, 4) !== today.slice(0, 4)) parts.year = 'numeric';
  return new Intl.DateTimeFormat('en-GB', parts).format(noon(day)).replace(',', '');
}

/** "Today", "Yesterday", "3 days ago" (days in the future, which the bar never shows, read as "Today"). */
export function dayHint(day: string, today: string): string {
  const days = Math.round((noon(today) - noon(day)) / 86_400_000);
  return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days.toLocaleString('en-US')} days ago`;
}
