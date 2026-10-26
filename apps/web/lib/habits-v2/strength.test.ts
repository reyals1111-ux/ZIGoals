import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue, saveHabitTimezone, type HabitData} from '../habits';
import {addLocalDays} from '../local-date';
import {habitStrength} from './strength';

const id = '55555555-5555-4555-8555-555555555555';
const at = (day: string) => new Date(`${day}T08:00:00.000Z`);
function start(day: string): HabitData { return createHabit(saveHabitTimezone(emptyHabitData(), 'UTC'), {title: 'Walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1, measurement: {kind: 'boolean'}} as never, at(day), id); }
const done = (data: HabitData, day: string) => logHabitValue(data, id, day, 1, {mode: 'set'}, at(day));

describe('habitStrength (Session AH, L2)', () => {
  test('needs a week of scheduled days before it says anything', () => {
    let data = start('2026-10-01');
    for (let i = 0; i < 4; i++) data = done(data, addLocalDays('2026-10-01', i));
    expect(habitStrength(data.habits[0]!, '2026-10-05')).toBeNull();
  });
  test('builds slowly with every day done, and one miss dents it without resetting it', () => {
    let data = start('2026-08-01');
    for (let i = 0; i < 39; i++) data = done(data, addLocalDays('2026-08-01', i));
    const strong = habitStrength(data.habits[0]!, '2026-09-08')!;
    expect(strong.score).toBeGreaterThan(95);
    // 09-09 is missed (left open, it is a miss once 09-10 is today); 09-10 is done again.
    data = done(data, '2026-09-10');
    const after = habitStrength(data.habits[0]!, '2026-09-10')!;
    expect(after.score).toBeLessThan(strong.score);
    expect(after.score).toBeGreaterThan(80);
  });
  test('an open today does not count against it', () => {
    let data = start('2026-08-01');
    for (let i = 0; i < 20; i++) data = done(data, addLocalDays('2026-08-01', i));
    const yesterday = habitStrength(data.habits[0]!, '2026-08-20')!, todayOpen = habitStrength(data.habits[0]!, '2026-08-21')!;
    expect(todayOpen.score).toBe(yesterday.score);
  });
});
