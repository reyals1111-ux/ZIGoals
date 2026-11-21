import {describe, expect, it} from 'vitest';
import {createHabit, emptyHabitData, habitStats, logHabitValue, setHabitEntryStatus, type HabitData} from './habits';
import {dontMissToday, neverTwice, twoDayLine} from './habit-two-day';
import {addLocalDays} from './local-date';

/** Session AV (owner follow-up 1, F-TWO-DAY): never miss twice — one missed day keeps the run, two in a row end it. */
const START = new Date('2026-11-01T09:00:00Z'), NOW = new Date('2026-11-23T09:00:00Z'), TODAY = '2026-11-23';
const ID = 'aaaaaaaa-0000-4000-8000-000000000001';
function walk(done: (day: string) => boolean): HabitData {
  let d = createHabit(emptyHabitData(), {title: 'Fictional walk', category: 'Health', description: '', notes: '', timeOfDay: 'anytime', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, START, ID);
  for (let day = '2026-11-01'; day < TODAY; day = addLocalDays(day, 1)) if (done(day)) d = logHabitValue(d, ID, day, 1, {}, NOW);
  return d;
}
describe('Session AV (F-TWO-DAY)', () => {
  it('one missed day keeps the run; the streak still ends there', () => {
    const d = walk(day => day !== '2026-11-18');
    const h = d.habits[0]!;
    expect(habitStats(h, TODAY).currentStreak).toBe(4); // 19–22
    expect(neverTwice(h, TODAY)).toBe(21); // 1–22 without the 18th
  });
  it('two missed days in a row end it; a skipped day is neutral', () => {
    const two = walk(day => day !== '2026-11-17' && day !== '2026-11-18').habits[0]!;
    expect(neverTwice(two, TODAY)).toBe(4);
    let skipped = walk(day => day !== '2026-11-17' && day !== '2026-11-18');
    skipped = setHabitEntryStatus(skipped, ID, '2026-11-17', 'skipped', '', NOW);
    expect(neverTwice(skipped.habits[0]!, TODAY)).toBe(20);
  });
  it('q4 #23: the day after a miss says "Don’t miss today"; a skipped day between is neutral; a done today ends it', () => {
    const missedYesterday = walk(day => day !== '2026-11-22').habits[0]!;
    expect(dontMissToday(missedYesterday, TODAY)).toBe(true);
    expect(twoDayLine(missedYesterday, TODAY, habitStats(missedYesterday, TODAY).currentStreak)).toBe('Don’t miss today · never missed twice: 21 days');
    let skippedBetween = walk(day => day !== '2026-11-21' && day !== '2026-11-22');
    skippedBetween = setHabitEntryStatus(skippedBetween, ID, '2026-11-22', 'skipped', '', NOW);
    expect(dontMissToday(skippedBetween.habits[0]!, TODAY)).toBe(true);
    const doneToday = logHabitValue(walk(day => day !== '2026-11-22'), ID, TODAY, 1, {}, NOW).habits[0]!;
    expect(dontMissToday(doneToday, TODAY)).toBe(false);
    const every = walk(() => true).habits[0]!;
    expect(dontMissToday(every, TODAY)).toBe(false);
    expect(twoDayLine(every, TODAY, habitStats(every, TODAY).currentStreak)).toBeNull(); // no longer than the streak: nothing to add
    const oneMiss = walk(day => day !== '2026-11-18').habits[0]!;
    expect(twoDayLine(oneMiss, TODAY, 4)).toBe('Never missed twice: 21 days');
  });
});
