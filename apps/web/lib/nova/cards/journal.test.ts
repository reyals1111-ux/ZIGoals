import {describe, expect, it} from 'vitest';
import {journalMonth} from './journal';

const e = (...dates: string[]) => dates.map(date => ({date, text: 'Fictional private words'}));

describe('Journal: a month of the days written, from each entry\'s day alone', () => {
  it('an empty journal: nothing written, no streak, and still the month\'s shape', () => {
    const m = journalMonth([], '2026-11-11');
    expect(m).toMatchObject({total: 0, month: '2026-11', entries: 0, daysWritten: 0, streak: 0, lastDate: null, firstMonday: '2026-10-26'});
    // November 2026 starts on a Sunday and ends on a Monday: six rows from Monday.
    expect(m.weeks.map(w => w.first)).toEqual(['2026-11-01', '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30']);
    expect(m.weeks[0]!.cells).toEqual(['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'missed']);
    expect(m.weeks[2]!.cells).toEqual(['missed', 'missed', 'ahead', 'ahead', 'ahead', 'ahead', 'ahead']);
    expect(m.weeks[5]!.cells).toEqual(['ahead', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest']);
  });

  it('days written, entries (two on one day count twice, the day once) and the last entry', () => {
    const m = journalMonth(e('2026-10-30', '2026-11-03', '2026-11-03', '2026-11-09', '2026-11-10', '2026-11-11'), '2026-11-11');
    expect(m).toMatchObject({total: 6, entries: 5, daysWritten: 4, streak: 3, lastDate: '2026-11-11'});
    expect(m.weeks[1]!.cells).toEqual(['missed', 'done', 'missed', 'missed', 'missed', 'missed', 'missed']);
    expect(m.weeks[2]!.cells).toEqual(['done', 'done', 'done', 'ahead', 'ahead', 'ahead', 'ahead']);
  });

  it('the streak holds while today is still open, and ends after a whole day without an entry', () => {
    expect(journalMonth(e('2026-11-08', '2026-11-09', '2026-11-10'), '2026-11-11').streak).toBe(3);
    expect(journalMonth(e('2026-11-08', '2026-11-09'), '2026-11-11').streak).toBe(0);
    expect(journalMonth(e('2026-11-11'), '2026-11-11').streak).toBe(1);
    // Today without an entry is "still to come", not a quiet day.
    expect(journalMonth(e('2026-11-10'), '2026-11-11').weeks[2]!.cells[2]).toBe('ahead');
  });

  it('the streak runs across a month and a year; the month shown is today\'s', () => {
    const m = journalMonth(e('2026-12-30', '2026-12-31', '2027-01-01'), '2027-01-01');
    expect(m).toMatchObject({month: '2027-01', streak: 3, entries: 1, daysWritten: 1, total: 3, lastDate: '2027-01-01', firstMonday: '2026-12-28'});
    // January 2027 starts on a Friday: Monday to Thursday of the first row are outside the month.
    expect(m.weeks[0]!.cells).toEqual(['rest', 'rest', 'rest', 'rest', 'done', 'ahead', 'ahead']);
    expect(m.weeks).toHaveLength(5);
  });

  it('month lengths: a leap February, a common February that fills four rows exactly, the last day of a month', () => {
    const leap = journalMonth(e('2028-02-29'), '2028-02-29');
    expect(leap.weeks.flatMap(w => w.cells).filter(c => c !== 'rest')).toHaveLength(29);
    expect(leap.weeks.at(-1)!.cells).toEqual(['missed', 'done', 'rest', 'rest', 'rest', 'rest', 'rest']);
    // February 2027 starts on a Monday and has 28 days: four full rows, no blank cell.
    const feb = journalMonth([], '2027-02-14');
    expect(feb.weeks).toHaveLength(4);
    expect(feb.weeks.flatMap(w => w.cells).filter(c => c === 'rest')).toHaveLength(0);
    const end = journalMonth(e('2026-10-31'), '2026-10-31');
    expect(end.weeks.at(-1)!.cells).toEqual(['missed', 'missed', 'missed', 'missed', 'missed', 'done', 'rest']);
    expect(end.weeks.flatMap(w => w.cells).filter(c => c !== 'rest')).toHaveLength(31);
  });

  it('an entry from another month counts toward the journal and the last entry, not this month', () => {
    const m = journalMonth(e('2026-09-14'), '2026-11-11');
    expect(m).toMatchObject({total: 1, entries: 0, daysWritten: 0, streak: 0, lastDate: '2026-09-14'});
    expect(m.weeks.flatMap(w => w.cells)).not.toContain('done');
  });

  it('never carries what was written: only days, counts and cells come out', () => {
    const out = JSON.stringify(journalMonth(e('2026-11-10', '2026-11-11'), '2026-11-11'));
    expect(out).not.toContain('Fictional private words');
    expect(out).not.toContain('text');
  });

  it('a malformed day is left out, never guessed', () => {
    expect(journalMonth([{date: 'yesterday'}, {date: '2026-11-11'}], '2026-11-11')).toMatchObject({total: 1, entries: 1, streak: 1});
  });
});
