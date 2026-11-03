import {describe, expect, test} from 'vitest';
import {balanceNote, listWords, noteWordsOk, periodNote, type AreaInput, type WeekInput} from './notes';

const empty: WeekInput = {period: 'week', days: 7, counts: {habitCheckIns: 0, healthDays: 0, contributions: 0}, trends: [{label: 'Sleep a night', now: null, before: null}]};
const full: WeekInput = {period: 'week', days: 7,
  counts: {habitCheckIns: 12, healthDays: 5, contributions: 1},
  trends: [{label: 'Sleep a night', now: '7 h 10 min', before: null}, {label: 'Steps a day', now: '8,100', before: '7,400'}],
  streak: {title: 'Read', streak: 12, unit: 'days'}, pairing: null};

describe('8.3 ZIGi\'s note on the week: counts and one comparison, never a cause, never advice', () => {
  test('a full week: counts, the first measure with both sides, the longest streak', () => {
    const n = periodNote(full);
    expect(n.empty).toBe(false);
    expect(n.title).toBe('ZIGi’s note on your week');
    expect(n.lines).toEqual([
      'This week: 12 habit check-ins, Health records on 5 of 7 days and 1 goal contribution.',
      'Steps averaged 8,100 a day, beside 7,400 the week before.',
      'Your longest running streak: Read, 12 days.',
    ]);
  });
  test('a pairing from lib/insights takes the third line, labelled as not a cause', () => {
    const n = periodNote({...full, pairing: 'On 9 of 12 days you walked at least 8,000 steps, you also logged water; on other days 3 of 10.'});
    expect(n.lines[2]).toMatch(/^Seen together, not a cause: On 9 of 12 days/);
  });
  test('unknown is not zero: nothing recorded gives an honest empty note, no "0" counts and no measure', () => {
    const n = periodNote(empty);
    expect(n.empty).toBe(true);
    expect(n.lines.join(' ')).not.toMatch(/\b0\b/);
    expect(periodNote({...full, counts: {habitCheckIns: 0, healthDays: 3, contributions: 0}}).lines[0]).toBe('This week: Health records on 3 of 7 days.');
  });
  test('the month speaks of the month', () => {
    expect(periodNote({...full, period: 'month', days: 31}).lines[1]).toBe('Steps averaged 8,100 a day, beside 7,400 the month before.');
    expect(periodNote({...empty, period: 'month', days: 31}).title).toBe('ZIGi’s note on your month');
  });
  test('the wording rules hold for every template', () => {
    for (const n of [periodNote(full), periodNote(empty), periodNote({...full, period: 'month'}), periodNote({...full, trends: ['Days with water', 'Days with meals'].map(label => ({label, now: '4 of 7', before: '2 of 7'}))})]) {
      for (const line of [...n.lines, n.fine, n.title]) expect(noteWordsOk(line), line).toBe(true);
    }
  });
});

const area = (label: string, items: number, activity: number, progress: number | null = null): AreaInput => ({label, items, activity, progress});
describe('8.4 the monthly balance note: where the records gathered, what stayed quiet, the area furthest along', () => {
  test('a mixed month', () => {
    const n = balanceNote([area('Health', 3, 14, 0.6), area('Habits & Mind', 4, 9, 0.75), area('Wealth', 2, 1, null), area('Career', 1, 0, 0.2), area('Fun', 0, 0)], 'Oct 2026');
    expect(n.title).toBe('A note on your balance · Oct 2026');
    expect(n.lines).toEqual([
      'This month your records gathered most in Health (14 records) and Habits & Mind (9 records).',
      'Quiet so far this month: Career, with goals or habits and no record yet.',
      'Furthest along on average: Habits & Mind, 75% of the way across what is known.',
    ]);
    // An area with no goal or habit is never called quiet.
    expect(n.lines.join(' ')).not.toContain('Fun');
  });
  test('one active area; many quiet ones are summed up', () => {
    const n = balanceNote([area('Health', 1, 2), ...['A', 'B', 'C', 'D', 'E'].map(l => area(l, 1, 0))], 'Oct 2026');
    expect(n.lines[0]).toBe('This month your records gathered in Health (2 records).');
    expect(n.lines[1]).toBe('Quiet so far this month: A, B and C and 2 others, with goals or habits and no record yet.');
  });
  test('an empty wheel says so; unknown progress is never shown as 0%', () => {
    const n = balanceNote([area('Health', 0, 0), area('Fun', 0, 0)], 'Oct 2026');
    expect(n.empty).toBe(true);
    expect(n.lines.join(' ')).not.toMatch(/0%/);
    expect(balanceNote([area('Wealth', 1, 3, null)], 'Oct 2026').lines.join(' ')).not.toMatch(/%/);
  });
  test('the wording rules hold', () => {
    const notes = [balanceNote([area('Health', 3, 14, 0.6), area('Career', 1, 0, 0.2)], 'Oct'), balanceNote([], 'Oct')];
    for (const n of notes) for (const line of [...n.lines, n.fine, n.title]) expect(noteWordsOk(line), line).toBe(true);
    expect(noteWordsOk('You should rest')).toBe(false);
    expect(noteWordsOk('Walking improves sleep')).toBe(false);
  });
  test('listWords', () => {
    expect(listWords([])).toBe(''); expect(listWords(['a'])).toBe('a'); expect(listWords(['a', 'b'])).toBe('a and b'); expect(listWords(['a', 'b', 'c'])).toBe('a, b and c');
  });
});
