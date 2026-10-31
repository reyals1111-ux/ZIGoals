import {afterEach, describe, expect, test} from 'vitest';
import {setDisplayLocale} from '../visual-format';
import {findDay, levelWord, moveDay, pixelLabel, pixelYear, pixelYears} from './grid';

const TODAY = '2026-10-31';
afterEach(() => setDisplayLocale('en-US'));
const src = {
  moods: {'2026-01-01': {mood: 4}, '2026-03-03': {mood: 1}, '2026-11-02': {mood: 5}, '2025-12-31': {mood: 3}},
  energy: {'2026-03-03': {energy: 2}, '2026-03-04': {energy: 9}},
  journalDates: ['2026-03-03', '2026-03-03'],
  words: {'2026-03-03': {word: 'tired'}},
};

describe('Year in Pixels (Session AK lane S, item 13)', () => {
  test('the habit year layout: 53 columns of 7 days, Monday first, 1 January in the first column', () => {
    const y = pixelYear(2026, TODAY, 'mood', src);
    expect(y.weeks.length).toBeGreaterThanOrEqual(52);
    expect(y.weeks.length).toBeLessThanOrEqual(54);
    for (const w of y.weeks) expect(w).toHaveLength(7);
    expect(y.weeks[0]!.some(p => p.date === '2026-01-01')).toBe(true);
    expect(y.months[0]).toEqual({label: 'Jan', week: 0});
  });
  test('mood: counts only rated days in the year up to today; an unrated day stays empty, never low', () => {
    const y = pixelYear(2026, TODAY, 'mood', src);
    expect(y.rated).toBe(2);
    expect(y.counts).toEqual([1, 0, 0, 1, 0]);
    const at = (d: string) => y.weeks.flat().find(p => p.date === d && p.inYear)!;
    expect(at('2026-11-02')).toMatchObject({value: null, future: true});
    expect(at('2026-03-04').value).toBeNull();
    expect(y.weeks.flat().find(p => p.date === '2025-12-31')).toMatchObject({inYear: false, value: null});
    expect(y.summary).toBe('2026: 2 days with a mood rating. Hard 1, Low 0, Okay 0, Good 1, Great 0.');
  });
  test('energy: out-of-range values are ignored, not drawn', () => {
    const y = pixelYear(2026, TODAY, 'energy', src);
    expect(y.rated).toBe(1);
    expect(y.counts[1]).toBe(1);
    expect(pixelYear(2026, TODAY, 'energy', {}).summary).toBe('2026: no energy rating yet.');
  });
  test('each square has a label in words (colour is never the only cue)', () => {
    const y = pixelYear(2026, TODAY, 'mood', src), p = y.weeks.flat().find(x => x.date === '2026-03-03')!;
    expect(pixelLabel(p, 'mood')).toBe('Tue, Mar 3, 2026: mood Hard, 1 of 5 · tired · 2 journal entries');
    expect(pixelLabel(y.weeks.flat().find(x => x.date === '2026-03-04')!, 'mood')).toBe('Wed, Mar 4, 2026: no mood rating');
    expect(pixelLabel(y.weeks.flat().find(x => x.date === '2026-12-01')!, 'mood')).toBe('Tue, Dec 1, 2026: ahead');
    expect(levelWord('energy', 5)).toBe('Full of energy');
  });
  test('years to step through, and keyboard movement inside the year', () => {
    expect(pixelYears(TODAY, src)).toEqual([2025, 2026]);
    expect(pixelYears(TODAY, {})).toEqual([2026]);
    const y = pixelYear(2026, TODAY, 'mood', src), first = findDay(y.weeks, '2026-01-01')!;
    expect(moveDay(y.weeks, first, 'ArrowUp')).toBeNull();
    expect(y.weeks[moveDay(y.weeks, first, 'ArrowDown')!.w]![moveDay(y.weeks, first, 'ArrowDown')!.d]!.date).toBe('2026-01-02');
    const right = moveDay(y.weeks, first, 'ArrowRight')!;
    expect(y.weeks[right.w]![right.d]!.date).toBe('2026-01-08');
    const end = moveDay(y.weeks, first, 'End')!;
    expect(y.weeks[end.w]![end.d]!.date).toBe('2026-12-31');
    expect(findDay(y.weeks, '2025-12-31')).toBeNull();
  });
});
