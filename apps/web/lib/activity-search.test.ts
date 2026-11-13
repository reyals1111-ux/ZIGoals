import {describe, expect, test} from 'vitest';
import {ACTIVITY_CSV_HEADER, activityCsv, activityCsvName, csvTime, kindWord, matchesQuery, queryTerms, rowWords, searchRows, splitAmount, type ActivityCsvRow} from './activity-search';

/** C-DVG-17 / PR-100: Activity's search and CSV export (pure parts). */
const rows = [
 {id: 'a', category: 'HEALTH', words: rowWords(['Water', 'Water logged', '250 mL', 'Private · this browser', '09:15'])},
 {id: 'b', category: 'WEALTH', words: rowWords(['Cash', 'Payment on Café Card', '€40.00', 'Payment you entered', null])},
 {id: 'c', category: 'HABIT', words: rowWords(['Habit', 'Read', '', 'Your habit', false])},
];
describe('the search', () => {
 test('matches the words a row shows, case-insensitively, every typed word somewhere in the row', () => {
  expect(searchRows(rows, 'WATER').map(r => r.id)).toEqual(['a']);
  expect(searchRows(rows, 'payment card').map(r => r.id)).toEqual(['b']);
  expect(searchRows(rows, 'payment water')).toEqual([]);
  expect(searchRows(rows, 'cafe').map(r => r.id)).toEqual(['b']); // an accent is not needed
  expect(searchRows(rows, '250').map(r => r.id)).toEqual(['a']);
  expect(searchRows(rows, 'nothing like this')).toEqual([]);
 });
 test('an empty or blank search keeps every row, in order', () => {
  expect(searchRows(rows, '').map(r => r.id)).toEqual(['a', 'b', 'c']);
  expect(searchRows(rows, '   ').map(r => r.id)).toEqual(['a', 'b', 'c']);
  expect(queryTerms('  Read  more ')).toEqual(['read', 'more']);
 });
 test('combines with the kind filter: the search runs on the rows the filter keeps', () => {
  const kept = rows.filter(r => r.category === 'HABIT');
  expect(searchRows(kept, 'read').map(r => r.id)).toEqual(['c']);
  expect(searchRows(kept, 'water')).toEqual([]);
 });
 test('words of two parts do not join into one', () => expect(matchesQuery(rowWords(['Wat', 'er']), 'water')).toBe(false));
});

describe('the CSV rows', () => {
 const row = (over: Partial<ActivityCsvRow> = {}): ActivityCsvRow => ({date: '2026-11-13', time: '09:15', kind: 'Health', title: 'Water logged', detail: '250 mL', value: '250', unit: 'mL', source: 'Private · this browser', ...over});
 test('a header and one line per row, every cell quoted, CRLF line ends', () => {
  const csv = activityCsv([row(), row({title: 'Say "hi", then go', time: ''})]);
  expect(csv.split('\r\n')).toEqual([
   ACTIVITY_CSV_HEADER.map(h => `"${h}"`).join(','),
   '"2026-11-13","09:15","Health","Water logged","250 mL","250","mL","Private · this browser"',
   '"2026-11-13","","Health","Say ""hi"", then go","250 mL","250","mL","Private · this browser"',
   '',
  ]);
 });
 test('a cell starting with = + - @ is neutralised (it cannot run as a formula)', () => {
  const csv = activityCsv([row({title: '=HYPERLINK("http://x","y")', detail: '+1+1', source: '@SUM(A1)', value: '-4.20', unit: ' =cmd'})]);
  const line = csv.split('\r\n')[1]!;
  expect(line).toContain(`"'=HYPERLINK(""http://x"",""y"")"`);
  expect(line).toContain(`"'+1+1"`);
  expect(line).toContain(`"'@SUM(A1)"`);
  expect(line).toContain(`"'-4.20"`);
  expect(line).toContain(`"' =cmd"`);
  for (const cell of line.split('","')) expect(cell.replace(/^"/, '')).not.toMatch(/^\s*[=+\-@]/);
 });
 test('the amount a detail ends with, as a value and its unit', () => {
  expect(splitAmount('250 mL')).toEqual({value: '250', unit: 'mL'});
  expect(splitAmount('Holiday fund · US$125.00')).toEqual({value: '125.00', unit: 'US$'});
  expect(splitAmount('Holiday fund · −€4.20')).toEqual({value: '-4.20', unit: '€'});
  expect(splitAmount('Reading · 3 books')).toEqual({value: '3', unit: 'books'});
  expect(splitAmount('80.5 kg')).toEqual({value: '80.5', unit: 'kg'});
  expect(splitAmount('Crypto')).toEqual({value: '', unit: ''});
  expect(splitAmount('Run · at least 5 km, over 7 days')).toEqual({value: '', unit: ''});
  expect(splitAmount('')).toEqual({value: '', unit: ''});
 });
 test('the time in the zone Activity shows; none for a day-only record', () => {
  expect(csvTime('2026-11-13T09:15:30.000Z', 'UTC', true)).toBe('09:15');
  expect(csvTime('2026-11-13T09:15:30.000Z', 'Europe/Berlin', true)).toBe('10:15');
  expect(csvTime('2026-11-13T00:00:00.000Z', 'UTC', false)).toBe('');
  expect(csvTime('not a date', 'UTC', true)).toBe('');
 });
 test('kind words and the file name', () => {
  expect([kindWord('HEALTH'), kindWord('ZIGI'), kindWord('TASK')]).toEqual(['Health', 'ZIGi', 'Task']);
  expect(activityCsvName('2026-11-13')).toBe('zigoals-activity-2026-11-13.csv');
 });
});
