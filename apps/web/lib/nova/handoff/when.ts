import {addLocalDays} from '../../local-date';
import {MONTHS, WEEKDAYS} from '../../ai/tools/range';

/**
 * Session AM-2 (owner's step 4b): the day and the clock time a person names for a calendar file, read on the device from
 * their own words, in English and Dutch. Pure: `today` is the device's local day (YYYY-MM-DD).
 * - a day: "today", "tomorrow", "the day after tomorrow" / "vandaag", "morgen", "overmorgen"; a weekday ("on Friday",
 *   "next friday", "vrijdag", "aanstaande vrijdag": the next such day, never today); a date ("3 December", "December 3rd",
 *   "3 dec 2027", "op 3 december", "2026-12-03"; a date without a year is the next one that is not past);
 * - a time: "at 14:30", "om 14.30", "at 2pm", "at 2:15 pm", "om 14 uur", "om half drie" is not read (no guess).
 * What is read is cut from the words, so the rest can be the event's title. Nothing is guessed: no day, no file.
 */
export type When = {date: string | null; time: string | null; rest: string};
const pad = (n: number) => String(n).padStart(2, '0');
const realDate = (y: number, m: number, d: number): string | null => { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null; };
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// English and Dutch names only (the lists also hold French and German, which the hand-off phrases do not read).
const EN_NL_MONTHS: readonly (readonly string[])[] = MONTHS.map(names => names.filter(n => /^(?:january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec|januari|februari|maart|mrt|mei|juni|juli|augustus|oktober|okt)$/.test(n)));
const MONTH_WORDS = [...new Set([...EN_NL_MONTHS.flat(), 'mrt'])].sort((a, b) => b.length - a.length).map(esc).join('|');
const monthOf = (word: string): number => { const w = word.toLowerCase().replace(/\.$/, ''); return w === 'mrt' ? 3 : EN_NL_MONTHS.findIndex(names => names.includes(w)) + 1; };
const EN_NL_DAYS: readonly (readonly string[])[] = WEEKDAYS.map(names => names.filter(n => /^(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday|zondag|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag)$/.test(n)));
const DAY_WORDS = EN_NL_DAYS.flat().map(esc).join('|');
const B = '(?<![\\p{L}\\p{N}])', E = '(?![\\p{L}\\p{N}])';
const LEAD = '(?:on |op |for |voor |at |om |this |next |coming |deze |volgende |komende |aanstaande |a\\.s\\. )?';

/** The clock time named, cut from the words. */
function readTime(text: string): {time: string | null; rest: string} {
  const tries: [RegExp, (m: RegExpExecArray) => string | null][] = [
    // 2pm, 2:15 pm, 2.15pm
    [new RegExp(`${B}(?:at |om |around |rond )?(\\d{1,2})(?:[:.]([0-5]\\d))? ?(am|pm|a\\.m\\.|p\\.m\\.)${E}`, 'iu'), m => { const h = Number(m[1]), pm = m[3]!.toLowerCase().startsWith('p'); if (h < 1 || h > 12) return null; return `${pad((h % 12) + (pm ? 12 : 0))}:${m[2] ?? '00'}`; }],
    // 14:30, 14u30, 14h30 (with or without "at"/"om"); 14.30 only after "at"/"om" (a bare "2.10" is more often a number than a time)
    [new RegExp(`${B}(?:at |om |around |rond )?([01]?\\d|2[0-3])[:uh]([0-5]\\d)(?: ?(?:uur|u|h|hrs?))?${E}`, 'iu'), m => `${pad(Number(m[1]))}:${m[2]}`],
    [new RegExp(`${B}(?:at |om |around |rond )([01]?\\d|2[0-3])\\.([0-5]\\d)(?: ?(?:uur|u|h|hrs?))?${E}`, 'iu'), m => `${pad(Number(m[1]))}:${m[2]}`],
    // at 14, om 14 uur, 14 uur, at 9 o'clock
    [new RegExp(`${B}(?:(?:at |om )([01]?\\d|2[0-3])(?: ?(?:uur|u|o'?clock))?|([01]?\\d|2[0-3]) ?(?:uur|o'?clock))${E}`, 'iu'), m => `${pad(Number(m[1] ?? m[2]))}:00`],
  ];
  for (const [re, read] of tries) {
    const m = re.exec(text); if (!m) continue;
    const time = read(m); if (!time) continue;
    return {time, rest: `${text.slice(0, m.index)} ${text.slice(m.index + m[0].length)}`};
  }
  return {time: null, rest: text};
}
/** The day named, cut from the words. */
function readDay(text: string, today: string): {date: string | null; rest: string} {
  const year = Number(today.slice(0, 4));
  const cut = (m: RegExpExecArray) => `${text.slice(0, m.index)} ${text.slice(m.index + m[0].length)}`;
  let m: RegExpExecArray | null;
  if ((m = new RegExp(`${B}(?:on |op )?(\\d{4})-(\\d{2})-(\\d{2})${E}`, 'u').exec(text))) { const date = realDate(Number(m[1]), Number(m[2]), Number(m[3])); if (date) return {date, rest: cut(m)}; }
  // 3 December [2027], 3rd of December, 3 dec.
  if ((m = new RegExp(`${B}(?:on |op )?(?:the )?(\\d{1,2})(?:st|nd|rd|th|e|ste|de)?(?: of)? (${MONTH_WORDS})\\.?(?:,? (\\d{4}))?${E}`, 'iu').exec(text))) {
    const date = dated(Number(m[1]), monthOf(m[2]!), m[3] ? Number(m[3]) : null, today, year); if (date) return {date, rest: cut(m)};
  }
  // December 3[rd][, 2027]
  if ((m = new RegExp(`${B}(?:on |op )?(${MONTH_WORDS})\\.? (?:the )?(\\d{1,2})(?:st|nd|rd|th)?(?:,? (\\d{4}))?${E}`, 'iu').exec(text))) {
    const date = dated(Number(m[2]), monthOf(m[1]!), m[3] ? Number(m[3]) : null, today, year); if (date) return {date, rest: cut(m)};
  }
  if ((m = new RegExp(`${B}(?:the day after tomorrow|overmorgen)${E}`, 'iu').exec(text))) return {date: addLocalDays(today, 2), rest: cut(m)};
  if ((m = new RegExp(`${B}(?:for |voor )?(?:tomorrow|morgen)${E}`, 'iu').exec(text))) return {date: addLocalDays(today, 1), rest: cut(m)};
  if ((m = new RegExp(`${B}(?:for |voor )?(?:today|vandaag|tonight|vanavond)${E}`, 'iu').exec(text))) return {date: today, rest: cut(m)};
  if ((m = new RegExp(`${B}${LEAD}(${DAY_WORDS})${E}`, 'iu').exec(text))) {
    const weekday = EN_NL_DAYS.findIndex(names => names.includes(m![1]!.toLowerCase())), now = new Date(`${today}T12:00:00Z`).getUTCDay();
    let ahead = (weekday - now + 7) % 7; if (ahead === 0) ahead = 7;
    return {date: addLocalDays(today, ahead), rest: cut(m)};
  }
  return {date: null, rest: text};
}
function dated(day: number, month: number, givenYear: number | null, today: string, year: number): string | null {
  if (month < 1) return null;
  if (givenYear !== null) return givenYear >= 1970 && givenYear <= 2200 ? realDate(givenYear, month, day) : null;
  const thisYear = realDate(year, month, day);
  // Without a year: this year's, unless that day is already past (then next year's).
  if (thisYear && thisYear >= today) return thisYear;
  return realDate(year + 1, month, day) ?? thisYear;
}
/** The day and the time the words name, and the words without them (one line, single spaces, no dangling "on"/"at"). */
export function readWhen(text: string, today: string): When {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return {date: null, time: null, rest: text.trim()};
  const day = readDay(text, today), clock = readTime(day.rest);
  const rest = clock.rest.replace(/\s+/g, ' ').replace(/\s+(?:on|op|at|om|for|voor)\s*$/i, '').replace(/^\s*(?:on|op|at|om)\s+/i, '').replace(/\s+([,.;:!?])/g, '$1').replace(/^[\s,.;:!?-]+|[\s,.;:!?-]+$/g, '');
  return {date: day.date, time: clock.time, rest};
}
