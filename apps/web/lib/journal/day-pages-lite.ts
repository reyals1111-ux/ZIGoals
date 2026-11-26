import type {Journal, JournalEntry} from './schema';

/**
 * Session AW Part 2 (speed, attempt 2): the few day-page reads the Journal page draws on its first screen (the
 * "Morning and evening" fold's line: on or off, which pages are written), out of lib/journal/day-pages.ts, which loads with
 * the fold. lib/journal/day-pages.ts re-exports them. Pure.
 */
export type DayPart = 'morning' | 'evening';
export type DayAnswer = {q: string; a: string};
/** The template id a day page's entry carries (`template`); an older build reads it as no template it knows. */
export const DAY_PAGE_TEMPLATE = 'morning-evening';
export const dayPagesOn = (journal: Pick<Journal, 'dayPages'>) => journal.dayPages?.on === true;
/** The day's page: the entry of that day written as morning and evening (never a letter still to open). */
export const dayPageOf = (journal: Pick<Journal, 'entries'>, day: string): JournalEntry | null => journal.entries.find(e => e.date === day && e.template === DAY_PAGE_TEMPLATE && !e.opensOn) ?? null;
export const answered = (list: readonly DayAnswer[] | undefined) => (list ?? []).filter(x => x.a.trim());
/** Whether a part of that day is written (at least one answer). */
export const partWritten = (journal: Pick<Journal, 'entries'>, day: string, part: DayPart) => answered(dayPageOf(journal, day)?.parts?.[part]).length > 0;
