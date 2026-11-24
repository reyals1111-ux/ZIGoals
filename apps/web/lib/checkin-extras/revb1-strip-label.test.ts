import {describe, expect, test} from 'vitest';
import {stripLabel} from './strip-label';
import {loggedStrip, readCheckin} from './rule';
import {emptyEnergy} from '../energy/schema';
import {addLocalDays} from '../local-date';

/** Session AV lane 2 (review b1 #15): every box of the 14-day strip says which day it is. */
describe('the evening check-in strip’s day labels', () => {
  test('weekday initial and day of the month; "Today" on the last box; all fourteen tell apart', () => {
    expect(stripLabel('2026-11-16', '2026-11-29')).toBe('M 16');
    expect(stripLabel('2026-11-22', '2026-11-29')).toBe('S 22');
    expect(stripLabel('2026-11-29', '2026-11-29')).toBe('Today');
    const labels = loggedStrip(readCheckin(emptyEnergy()), '2026-11-29', 14, addLocalDays).map(s => stripLabel(s.day, '2026-11-29'));
    expect(labels[0]).toBe('M 16');
    expect(labels.at(-1)).toBe('Today');
    expect(new Set(labels).size).toBe(14);
  });
});
