import {formatTime} from './visual-format';

/**
 * Session AC (item 12): the time an Activity entry shows, or null for a date-only record. A record that carries only a day
 * (the Showcase's records, an import that had no time) is stamped at that day's midnight to the millisecond; a time is
 * never invented for it ("00:00"), so the entry shows under its day heading without one. Records saved by a person carry
 * their real moment, seconds included, and keep their time.
 */
export function activityTimeLabel(at: string, timeZone?: string): string | null {
  const when = new Date(at);
  if (Number.isNaN(when.getTime())) return null;
  if (when.getUTCSeconds() === 0 && when.getUTCMilliseconds() === 0 && new Intl.DateTimeFormat('en-GB', {hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone}).format(when) === '00:00') return null;
  return formatTime(at, {timeZone});
}
