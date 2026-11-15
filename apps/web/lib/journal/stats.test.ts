import {describe, expect, it} from 'vitest';
import {wordCount, wordsThisYear, writingStreak} from './stats';

/** Session AP: the Journal's words per entry, writing streak and words this year, derived from the entries only. */
const TODAY = '2026-11-14';
const entry = (date: string, text = 'One two three') => ({date, text});

describe('words', () => {
  it('counts words, not punctuation or emoji; a contraction is one word', () => {
    expect(wordCount('Ran 5 km today — felt good!')).toBe(6);
    expect(wordCount("Don't stop.")).toBe(2);
    expect(wordCount('  ')).toBe(0);
    expect(wordCount('🙂 … !!')).toBe(0);
    expect(wordCount('line one\nline two')).toBe(4);
  });
});

describe('the writing streak', () => {
  it('consecutive days up to today; a day not written yet today does not break it', () => {
    const days = [entry('2026-11-11'), entry('2026-11-12'), entry('2026-11-13'), entry('2026-11-13')];
    expect(writingStreak(days, TODAY)).toEqual({current: 3, longest: 3, writtenToday: false});
    expect(writingStreak([...days, entry(TODAY)], TODAY)).toEqual({current: 4, longest: 4, writtenToday: true});
  });
  it('a missed day ends the run; the longest run is kept; a future-dated entry does not count', () => {
    const days = [entry('2026-10-01'), entry('2026-10-02'), entry('2026-10-03'), entry('2026-10-04'), entry('2026-11-12'), entry('2026-11-20')];
    expect(writingStreak(days, TODAY)).toEqual({current: 0, longest: 4, writtenToday: false});
    expect(writingStreak([], TODAY)).toEqual({current: 0, longest: 0, writtenToday: false});
  });
  it('runs across a month and a year end', () => {
    expect(writingStreak([entry('2026-12-31'), entry('2027-01-01')], '2027-01-01').current).toBe(2);
    expect(writingStreak([entry('2026-10-31'), entry('2026-11-01')], '2026-11-02').current).toBe(2);
  });
});

describe('words this year', () => {
  it('sums the entries dated in today\'s year, up to today', () => {
    const list = [entry('2025-12-31', 'last year words'), entry('2026-01-01', 'Happy new year'), entry('2026-11-14', 'Two words'), entry('2026-12-01', 'not yet')];
    expect(wordsThisYear(list, TODAY)).toEqual({words: 5, entries: 2});
    expect(wordsThisYear([], TODAY)).toEqual({words: 0, entries: 0});
  });
});
