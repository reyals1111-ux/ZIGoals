import {describe, expect, test} from 'vitest';
import {habitDay} from '../habits';
import {CREATED, ID, NOW, TODAY, fullPath, habits} from './test-fixtures';
import {FILL_BACK_DAYS, canFillDay, countHabitFill, fillCustomDay, fillHabitDay, fillableDays, pastDayRows} from './past-day';
import {restoreDay} from './habit-undo';
import {emptyChecklistDays} from './schema';
import {dropBeside, orderedItems, sectionOfItem} from './store';

/** Session AL fifth pass (L5): LS-032 / C-LS-35 fill in a past day from the history; LS-H23 the shared drop of a drag. */
const YESTERDAY = '2026-10-17', MONDAY = '2026-10-12', never = () => null;
describe('Session AL fifth pass: a past day filled in (LS-032 / C-LS-35)', () => {
  test('the last 7 days can be filled in, not today, not the future, not older', () => {
    expect(FILL_BACK_DAYS).toBe(7);
    expect(fillableDays(TODAY)).toEqual(['2026-10-17', '2026-10-16', '2026-10-15', '2026-10-14', '2026-10-13', '2026-10-12', '2026-10-11']);
    expect(canFillDay(TODAY, YESTERDAY)).toBe(true);
    expect(canFillDay(TODAY, '2026-10-11')).toBe(true);
    expect(canFillDay(TODAY, '2026-10-10')).toBe(false);
    expect(canFillDay(TODAY, TODAY)).toBe(false);
    expect(canFillDay(TODAY, '2026-10-19')).toBe(false);
  });
  test('a day lists the path\'s habits and own items, each saying how it stands', () => {
    const rows = pastDayRows(fullPath(), emptyChecklistDays(), habits(), YESTERDAY, TODAY, never);
    const by = Object.fromEntries(rows.map(r => [r.label, r]));
    // Health, goals and goal steps change on their own pages.
    expect(rows.map(r => r.kind)).not.toContain('health');
    expect(by['Morning walk']).toMatchObject({kind: 'habit', state: 'open', note: 'Not done'});
    expect(by['Monday plan']).toMatchObject({state: 'rest', note: 'Not scheduled that day'});
    expect(by['No sugar']).toMatchObject({state: 'rest'});
    expect(by['Play piano 15 minutes']).toMatchObject({kind: 'custom', state: 'open'});
    // An item added to the path after that day is not part of it.
    expect(pastDayRows(fullPath(), emptyChecklistDays(), habits(), YESTERDAY, TODAY, at => at ? at.slice(0, 10) : null).map(r => r.label)).not.toContain('Play piano 15 minutes');
  });
  test('a habit filled in is done on Habits that day (its target), and the sealed square counts it once', () => {
    const next = fillHabitDay(habits(), ID.push, MONDAY, NOW), push = next.habits.find(h => h.id === ID.push)!;
    expect(push.entries.find(e => e.date === MONDAY)).toMatchObject({count: 100, disposition: 'logged'});
    expect(habitDay(push, MONDAY, TODAY).status).toBe('complete');
    expect(pastDayRows(fullPath(), emptyChecklistDays(), next, MONDAY, TODAY, never).find(r => r.label === 'Push-ups')).toMatchObject({state: 'done'});
    const days = {...emptyChecklistDays(), days: {[MONDAY]: {total: 4, done: 1}}};
    const once = countHabitFill(days, MONDAY, 'ck_3');
    expect(once.days[MONDAY]).toMatchObject({total: 4, done: 2, filled: ['ck_3']});
    expect(countHabitFill(once, MONDAY, 'ck_3')).toBe(once);
    // A day the history never sealed keeps no square.
    expect(countHabitFill(emptyChecklistDays(), MONDAY, 'ck_3').days[MONDAY]).toBeUndefined();
    // Habits' own rules hold: a day before the habit started, a quit habit.
    expect(() => fillHabitDay(habits(), ID.walk, '2026-08-20', NOW)).toThrow(/had not started/);
    expect(() => fillHabitDay(habits(), ID.sugar, YESTERDAY, NOW)).toThrow(/change that day on Habits/);
    expect(() => fillHabitDay(habits(), ID.monday, YESTERDAY, NOW)).toThrow('Choose a scheduled, active day up to today.');
    expect(CREATED < NOW).toBe(true);
  });
  test('an own item filled in adds one to that day\'s count, once, with an exact Undo', () => {
    const days = {...emptyChecklistDays(), days: {[YESTERDAY]: {total: 3, done: 1}}};
    const once = fillCustomDay(days, YESTERDAY, 'ck_12', 1);
    expect(once.days[YESTERDAY]).toMatchObject({total: 3, done: 2, filled: ['ck_12']});
    expect(() => fillCustomDay(once, YESTERDAY, 'ck_12', 1)).toThrow('Already filled in for that day.');
    expect(pastDayRows(fullPath(), once, habits(), YESTERDAY, TODAY, never).find(r => r.id === 'ck_12')).toMatchObject({state: 'done', note: 'Filled in'});
    expect(restoreDay(once, YESTERDAY, days.days[YESTERDAY]).days[YESTERDAY]).toEqual({total: 3, done: 1});
    expect(() => fillCustomDay({...emptyChecklistDays(), days: {[YESTERDAY]: {total: 2, done: 2}}}, YESTERDAY, 'ck_12', 1)).toThrow(/every item as done/);
  });
});

describe('Session AL fifth pass: one drop of a drag (LS-H23)', () => {
  test('the item lands before the row it is dropped on, in that row\'s orbit; after the last row with `after`', () => {
    const r = fullPath(), ids = () => orderedItems(r).map(i => i.id);
    expect(ids().slice(0, 3)).toEqual(['ck_1', 'ck_2', 'ck_3']);
    const down = dropBeside(r, 'ck_1', 'ck_3', false);
    expect(down.moved).toBe(true);
    expect(orderedItems(down.record).map(i => i.id).slice(0, 3)).toEqual(['ck_2', 'ck_1', 'ck_3']);
    // Dropped on a row of another orbit: it joins that orbit.
    const across = dropBeside(r, 'ck_1', 'ck_7', false), moved = orderedItems(across.record).find(i => i.id === 'ck_1')!;
    expect(across.section).toBe('afternoon');
    expect(sectionOfItem(across.record, moved)).toBe('afternoon');
    const last = dropBeside(r, 'ck_1', 'ck_12', true);
    expect(orderedItems(last.record).map(i => i.id).at(-1)).toBe('ck_1');
    // Dropped where it already is: nothing changes, and nothing is said to move.
    const still = dropBeside(r, 'ck_1', 'ck_2', false);
    expect(still).toMatchObject({moved: false});
    expect(still.record).toBe(r);
  });
});
