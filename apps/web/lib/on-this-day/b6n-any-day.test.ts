import {describe, expect, test} from 'vitest';
import {onDate, onThisDayView, throwbacks} from './throwback';

/**
 * Review b6n B6N-4 (Major; LEDGER #403): On this day for any day is reachable on a day with no memory. The panel shows
 * when there are memories, when another day is shown, or once the person chose to browse; otherwise only its way in, so
 * a day with nothing keeps no empty panel (as before) and still leads to every other date.
 */
const entries = [{id: 'y1', date: '2025-11-23', text: 'A fictional walk, a year before the 23rd.'}];
describe('B6N-4 the way in on a day with no memory', () => {
  test('today has nothing: the way in, not an empty panel; browsing or another day: the panel', () => {
    expect(throwbacks(entries, '2026-11-22')).toEqual([]);
    expect(onThisDayView(0, false, false)).toBe('entry');
    expect(onThisDayView(0, false, true)).toBe('panel');
    expect(onThisDayView(0, true, false)).toBe('panel');
    expect(onThisDayView(2, false, false)).toBe('panel');
  });
  test('from there the next day’s memory is one arrow away', () => {
    expect(onDate(entries, '2026-11-23', '2026-11-22').map(i => i.entry.id)).toEqual(['y1']);
  });
});
