import {describe, expect, it} from 'vitest';
import {dayHint, dayName, journalDay} from './health-day';

describe('the Health journal day (Session AH Part 17)', () => {
  it('reads a deep-linked day, and never a future, impossible or malformed one', () => {
    expect(journalDay('2026-10-22', '2026-10-25')).toBe('2026-10-22');
    expect(journalDay('2026-10-25', '2026-10-25')).toBe('2026-10-25');
    expect(journalDay('2026-10-26', '2026-10-25')).toBe('2026-10-25');
    for (const bad of ['2026-02-30', '22-10-2026', '2026-10-2', '1899-12-31', '', null, undefined]) expect(journalDay(bad, '2026-10-25')).toBe('2026-10-25');
  });
  it('names the day as "Thu 22 Oct", with the year only when it is another year', () => {
    expect(dayName('2026-10-22', '2026-10-25')).toBe('Thu 22 Oct');
    expect(dayName('2025-12-31', '2026-01-02')).toBe('Wed 31 Dec 2025');
  });
  it('says Today, Yesterday or how many days ago', () => {
    expect(dayHint('2026-10-25', '2026-10-25')).toBe('Today');
    expect(dayHint('2026-10-24', '2026-10-25')).toBe('Yesterday');
    expect(dayHint('2026-10-22', '2026-10-25')).toBe('3 days ago');
    expect(dayHint('2026-03-28', '2026-03-30')).toBe('2 days ago');
  });
});
