/**
 * C-DVG-17 / DV-046e / DV-054d / C-DV-13 / PR-100: Activity's search and its CSV export. Pure parts: a row is found by
 * the words it shows (its kind, title, detail, source and time), case-insensitively, every typed word somewhere in the
 * row; the export writes exactly the rows the filters show, every cell through the app's one CSV guard (csv-safe.ts).
 * Nothing is stored and nothing is sent anywhere: the file is made on this device.
 */
import {csvSafeCell} from './export/csv-safe';
import {wallClock} from './zone-time';

/** The words a row shows, as one text to search. */
export type SearchableRow = {words: string};
const fold = (text: string) => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase();
/** The words of a row (empty parts left out), joined for searching. */
export const rowWords = (parts: readonly (string | null | undefined | false)[]): string => fold(parts.filter(Boolean).join(' \u0000 '));
/** The typed words (none for an empty or blank search). */
export const queryTerms = (query: string): string[] => fold(query).split(/\s+/).filter(Boolean);
/** Whether a row shows every typed word (an empty search matches every row). */
export function matchesQuery(words: string, query: string): boolean {
 return queryTerms(query).every(term => words.includes(term));
}
/** The rows that match the search, in their order. */
export function searchRows<T extends SearchableRow>(rows: readonly T[], query: string): T[] {
 return queryTerms(query).length ? rows.filter(r => matchesQuery(r.words, query)) : [...rows];
}

export type ActivityCsvRow = {date: string; time: string; kind: string; title: string; detail: string; value: string; unit: string; source: string};
export const ACTIVITY_CSV_HEADER = ['Date', 'Time', 'Kind', 'Title', 'Detail', 'Value', 'Unit', 'Source'] as const;
const KIND: Record<string, string> = {GOAL: 'Goal', WEALTH: 'Wealth', HABIT: 'Habit', HEALTH: 'Health', TASK: 'Task', ZIGI: 'ZIGi'};
/** A filter's or a row's kind in words ("Health"). */
export const kindWord = (category: string): string => KIND[category] ?? (category ? category[0]!.toUpperCase() + category.slice(1).toLowerCase() : '');

/**
 * The amount a row's detail ends with, as a value and its unit: "Coffee · −€4.20" → {value: "-4.20", unit: "€"},
 * "250 mL" → {value: "250", unit: "mL"}. Only a last part that is a plain amount; anything else ("Crypto", "at least 5
 * kg, over 7 days") gives none, and the whole detail stays in its own column.
 */
const AMOUNT = /^(?<sign>[−-])?\s?(?<pre>(?:[A-Z]{0,3}[^\p{L}\p{N}\s−-]{1,2})?)\s?(?<sign2>[−-])?(?<num>\d(?:[\d,.'  ]*\d)?)\s?(?<unit>\p{L}[\p{L}/%.]*(?: \p{L}[\p{L}/%.]*)?|%)?$/u;
export function splitAmount(detail: string): {value: string; unit: string} {
 const last = detail.split(' · ').at(-1)?.trim() ?? '';
 const m = AMOUNT.exec(last);
 if (!m?.groups) return {value: '', unit: ''};
 const {sign, sign2, pre = '', num = '', unit = ''} = m.groups;
 if (pre && unit) return {value: '', unit: ''};
 return {value: `${sign || sign2 ? '-' : ''}${num.replace(/[  ]/g, ' ')}`, unit: (pre || unit).trim()};
}
/** The row's time as HH:mm (24 h) in the zone Activity shows times in, or '' for a record that has a day only. */
export function csvTime(at: string, timeZone: string | undefined, hasTime: boolean): string {
 if (!hasTime) return '';
 const when = new Date(at);
 if (Number.isNaN(when.getTime())) return '';
 try { return wallClock(when.getTime(), timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone).clock; } catch { return ''; }
}
/** The CSV text: a header, then one line per row, every cell guarded and quoted; CRLF line ends, as spreadsheets expect. */
export function activityCsv(rows: readonly ActivityCsvRow[]): string {
 const line = (cells: readonly string[]) => cells.map(csvSafeCell).join(',');
 return [line(ACTIVITY_CSV_HEADER), ...rows.map(r => line([r.date, r.time, r.kind, r.title, r.detail, r.value, r.unit, r.source]))].join('\r\n') + '\r\n';
}
/** "zigoals-activity-2026-11-13.csv" for the day it is made. */
export const activityCsvName = (today: string): string => `zigoals-activity-${today}.csv`;
