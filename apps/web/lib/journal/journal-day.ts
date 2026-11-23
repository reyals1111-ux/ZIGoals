import {boundaryDay, currentDayEnds} from '../day-boundary-core';
import {localDate} from '../local-date';

/**
 * Friend-readiness (FR-MAX-7): the Journal's "today" follows "My day ends at", as Habits, Today, the Checklist and Tasks do,
 * so an entry or an energy rating at 00:45 with the day ending at 3:00 is filed under the day still going on. At midnight,
 * the default, exactly the calendar day of this device as before (the Journal has always used this device's own day).
 */
export function journalDay(now: Date = new Date()): string {
  const ends = currentDayEnds();
  return ends.endsAt || ends.change ? boundaryDay(now, null) : localDate(now);
}
