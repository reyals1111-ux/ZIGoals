import {describe, expect, test} from 'vitest';
import {entriesFor, isoWeek, kindOf, periodChoices, periodRange, periodWords, periodsInMonth, periodsWritten, previousPeriod, weekMonday} from './periods';
import {filterEntries} from './search';
import {journalSchema} from './schema';

/** Session AV lane 2 (r3-notes; LEDGER #269, Grid Diary): entries about a week, a month or a year. */
describe('periods', () => {
  test('ISO weeks: Monday first, the week belongs to the year of its Thursday', () => {
    expect(isoWeek('2026-11-22')).toBe('2026-W47'); // a Sunday
    expect(isoWeek('2026-11-16')).toBe('2026-W47'); // its Monday
    expect(isoWeek('2026-01-01')).toBe('2026-W01'); // a Thursday
    expect(isoWeek('2027-01-01')).toBe('2026-W53'); // a Friday: still 2026's last week
    expect(isoWeek('2024-12-30')).toBe('2025-W01');
    expect(weekMonday('2026-W47')).toBe('2026-11-16');
    expect(weekMonday('2025-W01')).toBe('2024-12-30');
  });
  test('kinds, ranges, the one before and words', () => {
    expect([kindOf('2026-W47'), kindOf('2026-11'), kindOf('2026'), kindOf('2026-W60')]).toEqual(['week', 'month', 'year', null]);
    expect(periodRange('2026-W47')).toEqual({from: '2026-11-16', to: '2026-11-22'});
    expect(periodRange('2026-02')).toEqual({from: '2026-02-01', to: '2026-02-28'});
    expect(periodRange('2026')).toEqual({from: '2026-01-01', to: '2026-12-31'});
    expect([previousPeriod('2026-W01'), previousPeriod('2026-01'), previousPeriod('2026')]).toEqual(['2025-W52', '2025-12', '2025']);
    expect(periodWords('2026-W47')).toBe('Week 47 (Nov 16 – Nov 22, 2026)');
    expect(periodWords('2026-11')).toBe('Nov 2026');
    expect(periodWords('2026')).toBe('2026');
  });
  test('what Write offers: the day, then this and last week, month and year', () => {
    expect(periodChoices('2026-11-22').map(c => c.value)).toEqual(['', '2026-W47', '2026-W46', '2026-11', '2026-10', '2026', '2025']);
  });
  test('the calendar month shows its year, the month and the weeks that touch it', () => {
    expect(periodsInMonth('2026-11')).toEqual(['2026', '2026-11', '2026-W44', '2026-W45', '2026-W46', '2026-W47', '2026-W48', '2026-W49']);
  });
  test('entries about a period, listed and filtered', () => {
    const j = journalSchema.parse({version: 1, shareWithAi: false, followUps: true, entries: [
      {id: 'a', date: '2026-11-22', text: 'Fictional week.', createdAt: '2026-11-22T20:00:00.000Z', period: '2026-W47'},
      {id: 'b', date: '2026-11-30', text: 'Fictional month.', createdAt: '2026-11-30T20:00:00.000Z', period: '2026-11'},
      {id: 'c', date: '2026-11-21', text: 'A fictional day.', createdAt: '2026-11-21T20:00:00.000Z'}]});
    expect(entriesFor(j.entries, '2026-W47').map(e => e.id)).toEqual(['a']);
    expect(periodsWritten(j.entries)).toEqual([{period: '2026-11', kind: 'month', count: 1}, {period: '2026-W47', kind: 'week', count: 1}]);
    expect(filterEntries(j, {period: '2026-11'}, '2026-11-30').map(e => e.id)).toEqual(['b']);
    expect(filterEntries(j, {}, '2026-11-30').map(e => e.id)).toEqual(['c', 'b', 'a']); // no period chosen: every entry, as before
  });
});
