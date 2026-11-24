import {afterEach, describe, expect, test} from 'vitest';
import {emptyDayEnds, setCurrentDayEnds} from '../day-boundary-core';
import {localDate} from '../local-date';
import {journalDay} from './journal-day';

// FR-MAX-7: the Journal's day follows "My day ends at" (the device's own zone, as the Journal always used).
afterEach(() => setCurrentDayEnds(emptyDayEnds()));
describe('the Journal\'s day', () => {
  const at = (h: number, m: number) => new Date(2026, 10, 25, h, m); // Wed 25 Nov, local time
  test('at midnight, the default: the calendar day, exactly as before', () => {
    expect(journalDay(at(0, 45))).toBe(localDate(at(0, 45)));
    expect(journalDay(at(0, 45))).toBe('2026-11-25');
  });
  test('with the day ending at 3:00, 00:45 still belongs to Tuesday; 3:00 starts Wednesday', () => {
    setCurrentDayEnds({version: 1, endsAt: 180});
    expect(journalDay(at(0, 45))).toBe('2026-11-24');
    expect(journalDay(at(2, 59))).toBe('2026-11-24');
    expect(journalDay(at(3, 0))).toBe('2026-11-25');
  });
});
