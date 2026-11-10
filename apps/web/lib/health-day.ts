/**
 * Session AH Part 17 (owner addition): the Health journal's chosen day. A `?date=` deep link or a picked date is read
 * as a calendar day (YYYY-MM-DD) between 1900-01-01 and today; anything else, a future day included, is today: the
 * future cannot be logged. The words are the owner's: "Thu 22 Oct", with "Today", "Yesterday" or "3 days ago".
 */
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const noon = (day: string) => Date.parse(`${day}T12:00:00Z`);
/**
 * Session AL (P-MO-54, MO-110): the earliest day the journal and its entry forms open. 1900-01-01 (the old minimum)
 * crashed the page: the 28- and 42-day windows behind the cards reached into 1899, which the stored dates refuse. From
 * 1990 every window stays inside the stored range.
 */
export const JOURNAL_MIN_DAY = '1990-01-01';

export function journalDay(value: string | null | undefined, today: string): string {
  if (!value || !DAY.test(value) || value < JOURNAL_MIN_DAY || value > today) return today;
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

/**
 * Session AL (P-MO-53, MO-010): a diary entry (a copy, a plan logged as eaten, an edited entry) is for a day that has
 * started. The diary opens only up to today, so an entry on a later day could not be seen or removed there, yet counted
 * in the week. Returns the sentence for the field, or null when the day is fine.
 */
export function diaryDayIssue(day: string, today: string): string | null {
  if (!DAY.test(day) || !Number.isFinite(noon(day))) return 'Choose a real date.';
  if (day > today) return 'Choose today or an earlier day: food is logged once it is eaten. Plan a later day in the Planner.';
  if (day < JOURNAL_MIN_DAY) return `Choose a day from ${dayName(JOURNAL_MIN_DAY, today)} on.`;
  return null;
}
