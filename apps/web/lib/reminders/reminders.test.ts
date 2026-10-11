import {describe, expect, it} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue, type HabitInput} from '../habits';
import {createEmptyHealth} from '../health';
import {addWater, saveHealthPreferences, dailyData} from '../health-daily';
import {REMINDERS_KEY, WATER_REMINDER, emptyReminders, remindersSchema, reminderTime} from './schema';
import {dismissForToday, readReminders, setHabitReminder, setWaterReminder, updateReminders} from './store';
import {dueReminders, localClock} from './due';

// Session I, Part 8: in-app reminders, device-only (zigoals:reminders:v1).
const memory = (initial?: string) => { const map = new Map<string, string>(initial === undefined ? [] : [[REMINDERS_KEY, initial]]); return {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, map}; };
const input = (title: string, schedule: HabitInput['schedule'] = {kind: 'daily'}): HabitInput => ({title, category: 'Personal', description: '', notes: '', schedule, measurement: {kind: 'count', unit: 'times'}, target: 1});
const ID = '59a35604-3696-4a78-b455-000000000001', OTHER = '59a35604-3696-4a78-b455-000000000002';
const created = new Date(2026, 8, 1, 8, 0);
const habitsWith = () => createHabit(createHabit(emptyHabitData(), input('Fictional walk'), created, ID), input('Weekend stretch', {kind: 'weekdays', days: [0, 6]}), created, OTHER);
const at = (h: number, m = 0) => new Date(2026, 9, 1, h, m); // Thursday 2026-10-01, local device time

describe('schema and store', () => {
  it('validates times and bounds, and starts empty', () => {
    expect(['07:30', '23:59', '00:00'].map(reminderTime)).toEqual(['07:30', '23:59', '00:00']);
    for (const bad of ['24:00', '7:30', '07:60', '', 'noon']) expect(reminderTime(bad)).toBeNull();
    expect(remindersSchema.safeParse({version: 1, habits: Object.fromEntries(Array.from({length: 201}, (_, i) => [`h${i}`, {time: '08:00'}])), dismissed: {}}).success).toBe(false);
    expect(remindersSchema.safeParse({version: 2, habits: {}, dismissed: {}}).success).toBe(false);
    expect(readReminders(memory())).toEqual({data: emptyReminders(), unreadable: false});
  });
  it('reads damaged data as no reminders without touching it; only the next save replaces it', () => {
    const storage = memory('{"version":1,"habits":{"x":{"time":"25:00"}}');
    expect(readReminders(storage)).toEqual({data: emptyReminders(), unreadable: true});
    expect(storage.map.get(REMINDERS_KEY)).toBe('{"version":1,"habits":{"x":{"time":"25:00"}}');
    updateReminders(storage, '2026-10-01', current => setHabitReminder(current, ID, '08:00'));
    expect(JSON.parse(storage.map.get(REMINDERS_KEY)!)).toEqual({version: 1, habits: {[ID]: {time: '08:00'}}, dismissed: {}});
  });
  it('sets and clears reminders, and drops dismissals from before yesterday on save', () => {
    const storage = memory(JSON.stringify({version: 1, habits: {}, dismissed: {[OTHER]: '2026-09-29', [WATER_REMINDER]: '2026-09-30'}}));
    let saved = updateReminders(storage, '2026-10-01', current => setWaterReminder(dismissForToday(setHabitReminder(current, ID, '18:30'), ID, '2026-10-01'), '20:00'));
    expect(saved).toEqual({version: 1, habits: {[ID]: {time: '18:30'}}, water: {time: '20:00'}, dismissed: {[ID]: '2026-10-01', [WATER_REMINDER]: '2026-09-30'}});
    saved = updateReminders(storage, '2026-10-03', current => setWaterReminder(setHabitReminder(current, ID, null), null));
    expect(saved).toEqual({version: 1, habits: {}, dismissed: {}});
  });
  it("drops the reminders of habits no longer in the journal when one is set", () => {
    const current = setHabitReminder(emptyReminders(), 'gone', '07:00');
    expect(setHabitReminder(current, ID, '08:00', new Set([ID, OTHER])).habits).toEqual({[ID]: {time: '08:00'}});
    expect(setHabitReminder(current, ID, '08:00').habits).toEqual({gone: {time: '07:00'}, [ID]: {time: '08:00'}});
  });
  it('writes nothing when the change is invalid', () => {
    const storage = memory();
    expect(() => updateReminders(storage, '2026-10-01', current => setHabitReminder(current, ID, '99:99'))).toThrow();
    expect(storage.map.has(REMINDERS_KEY)).toBe(false);
  });
});

describe('due reminders', () => {
  const reminders = setHabitReminder(setHabitReminder(emptyReminders(), ID, '18:30'), OTHER, '09:00');
  it('appear once the device clock passes the time, for scheduled habits not done yet', () => {
    expect(localClock(at(18, 29))).toBe('18:29');
    expect(dueReminders({reminders, habits: habitsWith(), now: at(18, 29)}).map(r => r.id)).toEqual([]);
    expect(dueReminders({reminders, habits: habitsWith(), now: at(18, 30)})).toEqual([{id: ID, kind: 'habit', title: 'Fictional walk', time: '18:30', day: '2026-10-01', href: `/app/habits#habit-${ID}`}]);
  });
  it('a done habit, a day off its schedule or a dismissal today hides the card; tomorrow it can return', () => {
    const done = logHabitValue(habitsWith(), ID, '2026-10-01', 1, {}, at(10));
    expect(dueReminders({reminders, habits: done, now: at(19)})).toEqual([]);
    expect(dueReminders({reminders: dismissForToday(reminders, ID, '2026-10-01'), habits: habitsWith(), now: at(19)})).toEqual([]);
    expect(dueReminders({reminders: dismissForToday(reminders, ID, '2026-10-01'), habits: habitsWith(), now: new Date(2026, 9, 2, 19)}).map(r => r.id)).toEqual([ID]);
  });
  it('water: after its time, while nothing is logged or the total is below the personal target', () => {
    const water = setWaterReminder(emptyReminders(), '20:00');
    let health = createEmptyHealth();
    health = saveHealthPreferences(health, {...dailyData(health).preferences, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone});
    expect(dueReminders({reminders: water, health, now: at(19, 59)})).toEqual([]);
    expect(dueReminders({reminders: water, health, now: at(20)}).map(r => [r.id, r.href])).toEqual([[WATER_REMINDER, '/app/health#water']]);
    const logged = addWater(health, {id: 'health_water-0001', date: '2026-10-01', amountMilli: 500_000, unit: 'ml'}, at(12).toISOString());
    expect(dueReminders({reminders: water, health: logged, now: at(21)})).toEqual([]);
    const targeted = saveHealthPreferences(logged, {...dailyData(logged).preferences, waterTargetMl: 2000});
    expect(dueReminders({reminders: water, health: targeted, now: at(21)}).map(r => r.id)).toEqual([WATER_REMINDER]);
    expect(dueReminders({reminders: dismissForToday(water, WATER_REMINDER, '2026-10-01'), health: targeted, now: at(21)})).toEqual([]);
  });
});
