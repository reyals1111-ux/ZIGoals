import {STORY_MIN_DAYS, loggedDays, type StoryRecords} from '../stories/days';
import {wrappedOpened, type WrappedRecord} from './store';

/**
 * When ZIGoals Wrapped shows (Session AK, F5d): from 1 December, or once the year holds 30 logged days. The year is this
 * year, except in January, when last year's Wrapped is still the one to look back on. A Wrapped needs at least three
 * logged days (Stories' own minimum) to show at all; the Showcase always shows its labelled Example. Today's card shows
 * while it is available and not yet opened this year; the Journey link while it is available. Deciding writes nothing.
 */
export const WRAPPED_MIN_DAYS = 30;
export const wrappedYear = (today: string) => today.slice(5, 7) === '01' ? Number(today.slice(0, 4)) - 1 : Number(today.slice(0, 4));
/** The year's days so far (to today, or to 31 December once the year is over). */
export function wrappedWindow(year: number, today: string): {start: string; end: string; complete: boolean} {
  const last = `${year}-12-31`;
  return {start: `${year}-01-01`, end: today < last ? today : last, complete: today >= last};
}
export type WrappedDoor = {state: 'loading' | 'shown' | 'hidden'; year: number; loggedDays: number; todayCard: boolean; season: boolean};
export function wrappedDoor({today, records, record, showcase = false}: {today: string; records: StoryRecords | null; record: WrappedRecord | null; showcase?: boolean}): WrappedDoor {
  const year = wrappedYear(today), month = today.slice(5, 7), season = month === '12' || month === '01';
  if (!records || !record) return {state: 'loading', year, loggedDays: 0, todayCard: false, season};
  const {start, end} = wrappedWindow(year, today), days = loggedDays(records, start, end);
  const available = showcase || (days >= STORY_MIN_DAYS && (season || days >= WRAPPED_MIN_DAYS));
  return {state: available ? 'shown' : 'hidden', year, loggedDays: days, todayCard: available && !wrappedOpened(record, year), season};
}
