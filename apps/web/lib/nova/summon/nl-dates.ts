import {dayWords, nlDay} from '../../ai/local-answers/exact/period';
import {daysBetween} from '../widgets/words';

/**
 * Session AV lane 2 (loose ends; lane2/minors R5): the days in NOVA's Dutch widget captions, written the Dutch way, as
 * NOVA's Dutch answers write them (lib/ai/local-answers/exact/period.ts `nlDay`): "di 17 nov", "17 nov", "november 2026",
 * with the year when it is not this year's. Only the Dutch caption text uses these; English captions keep their own
 * writers byte for byte, and no widget's own labels change. Pure.
 */
const MONTH_NL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

/** A day with its weekday, "di 17 nov" ("di 17 nov 2027" in another year; always with the year when `today` is null). */
export const nlWeekDay = (date: string, today: string | null): string => nlDay(date.slice(0, 10), today ?? '');
/** A day without its weekday, "17 nov" ("17 nov 2027" in another year; always with the year when `today` is null). */
export const nlShortDate = (date: string, today: string | null): string => nlWeekDay(date, today).replace(/^\S+ /, '');
/** A record's day beside "logged": "vandaag", "gisteren", "9 nov" (with its year in another year), as `logDayWords` in English. */
export function nlLogDay(date: string, day: string): string {
  const apart = daysBetween(date, day);
  return apart === 0 ? 'vandaag' : apart === 1 ? 'gisteren' : nlShortDate(date, day);
}
/** A month key ("2026-07") in words: "juli 2026". */
export const nlMonth = (month: string): string => `${MONTH_NL[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
/** The writer of a period's days for a caption in `lang` (`periodWords`' last argument): "di 17 nov" in Dutch; English as it was. */
export const lineDays = (lang: 'en' | 'nl'): ((date: string, today: string) => string) => lang === 'nl' ? nlDay : dayWords;
