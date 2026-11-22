import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';
import {formatDate} from '../../visual-format';
import {dayRangeWords, importedHabitLine} from './preview-words';

/** Review b2b #7 (LEDGER #194): the HabitBull/Tickmate and Daylio previews write their days with the app's formatter. */
describe('import preview days through formatDate (review b2b #7)', () => {
  const habit = (entries: string[], kind = 'boolean') => ({title: 'Fictional reading', entries: entries.map(date => ({date})), rules: [{measurement: {kind}}]});
  test('a habit line: its days and its first day as the app writes dates, never an ISO day', () => {
    const line = importedHabitLine(habit(['2026-10-01', '2026-10-02']));
    expect(line).toBe(`Fictional reading · 2 days from ${formatDate('2026-10-01')}`);
    expect(line).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(importedHabitLine(habit(['2026-10-02'], 'count'))).toBe(`Fictional reading · 1 day from ${formatDate('2026-10-02')} · with amounts`);
    expect(importedHabitLine(habit([]))).toBe('Fictional reading · 0 days');
  });
  test('the Daylio range, and a dash where a day is missing', () => {
    expect(dayRangeWords([{date: '2026-10-01'}, {date: '2026-10-03'}])).toBe(`from ${formatDate('2026-10-01')} to ${formatDate('2026-10-03')}`);
    expect(dayRangeWords([])).toBe('from — to —');
  });
  test('the preview uses these words, with no raw day left in it', () => {
    const source = readFileSync(new URL('../../../components/import/switch-import-more.tsx', import.meta.url), 'utf8');
    expect(source).toContain('{importedHabitLine(h)}');
    expect(source).toContain('{dayRangeWords(daylio.entries)}');
    expect(source).not.toMatch(/entries\[0\]\??\.date\}|entries\.at\(-1\)\?\.date/);
  });
});
