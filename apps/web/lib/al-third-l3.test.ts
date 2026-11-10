import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, habitEntryText, habitStats, logHabitValue, setHabitEntryStatus, setHabitState, type HabitInput} from './habits';
import {deleteHabitForGoodNow} from './habit-delete-write';
import {habitLifecycleRows} from './habit-lifecycle';
import {durationCountText} from './habit-number';
import {trendPath, wealthTrend} from './today/wealth-trend';
import {createRoutineFromTemplate, ROUTINE_TEMPLATES} from './routines/templates';
import {matchReflections, reflectionsOf} from '../components/habits/habit-reflections';

/** Session AL third pass (lane L3): Habits, Today and setup rows. Fictional data only. */
const ID = '22222222-2222-4222-8222-222222222222';
const input = (extra: Partial<HabitInput> = {}): HabitInput => ({title: 'Fictional stretch', category: 'Personal', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}, ...extra});

describe('DV-206 (P-DV-73): a habit\'s lifecycle as Activity rows', () => {
  test('pause, resume and archive each give a row on the day they began; a plain habit gives none', () => {
    let d = createHabit(emptyHabitData(), input(), new Date('2026-11-01T08:00:00Z'), ID);
    expect(habitLifecycleRows(d.habits)).toEqual([]);
    d = setHabitState(d, ID, 'paused', new Date('2026-11-02T09:00:00Z'));
    d = setHabitState(d, ID, 'active', new Date('2026-11-03T09:00:00Z'));
    d = setHabitState(d, ID, 'archived', new Date('2026-11-04T09:00:00Z'));
    const rows = habitLifecycleRows(d.habits);
    expect(rows.map(r => [r.title, r.day])).toEqual([['Habit archived', '2026-11-04'], ['Habit resumed', '2026-11-03'], ['Habit paused', '2026-11-02']]);
    expect(rows[0]!.detail).toBe('Fictional stretch · from Nov 4, 2026');
    expect(rows[0]!.href).toBe(`/app/habits?habit=${ID}`);
  });
  test('"deleted for good" names no habit and sits at the moment of the deletion', () => {
    const d = createHabit(emptyHabitData(), input(), new Date('2026-11-01T08:00:00Z'), ID);
    const {data} = deleteHabitForGoodNow(d, ID, new Date('2026-11-04T10:30:00Z'));
    const rows = habitLifecycleRows([], data.habits);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({title: 'Habit deleted for good', at: '2026-11-04T10:30:00.000Z'});
    expect(JSON.stringify(rows)).not.toContain('Fictional stretch');
    // The shell is never read as a living habit's archive.
    expect(habitLifecycleRows(data.habits)).toEqual([]);
  });
});

describe('NB-063/NB-114/H-013 (P-NB-29): part-minutes in seconds', () => {
  test('minutes and hours read as a person says them; whole amounts and other units are left alone', () => {
    expect(durationCountText(0.03, 'minutes')).toBe('2 s');
    expect(durationCountText(0.81, 'minutes')).toBe('49 s');
    expect(durationCountText(5.5, 'minutes')).toBe('5 min 30 s');
    expect(durationCountText(1.25, 'hours')).toBe('1 h 15 min');
    expect(durationCountText(5, 'minutes')).toBeNull();
    expect(durationCountText(0.5, 'L')).toBeNull();
  });
  test('the Activity row says "49 s of 5 minutes", never "0.81"', () => {
    const d = createHabit(emptyHabitData(), input({measurement: {kind: 'duration', unit: 'minutes'}, target: 5}), new Date('2026-11-01T08:00:00Z'), ID);
    expect(habitEntryText(d.habits[0]!.rules[0]!, 0.81)).toBe('49 s of 5 minutes');
  });
});

describe('B-189/B-190 (P-DVR-75, Q7 replay): a skipped day is left out of the week\'s share', () => {
  test('one done day and one skipped day this week read as 1 of 1, not 1 of 2', () => {
    let d = createHabit(emptyHabitData(), input(), new Date('2026-11-02T08:00:00Z'), ID); // Monday
    d = logHabitValue(d, ID, '2026-11-02', 1, {}, new Date('2026-11-02T09:00:00Z'));
    d = setHabitEntryStatus(d, ID, '2026-11-03', 'skipped', '', new Date('2026-11-03T09:00:00Z'));
    const s = habitStats(d.habits[0]!, '2026-11-03');
    expect([s.weeklyCompleted, s.weeklyScheduled]).toEqual([1, 1]);
  });
});

describe('GAP-040 (P-TK-98): Today\'s recorded wealth trend', () => {
  const history = [{currency: 'USD', points: [{at: '2026-11-01T10:00:00.000Z', value: '100000'}, {at: '2026-11-04T10:00:00.000Z', value: '120000'}, {at: '2026-11-05T09:00:00.000Z', value: '125050'}]}];
  test('the change since yesterday from the person\'s own readings, exact', () => {
    const t = wealthTrend(history, 'USD', '2026-11-05', 30)!;
    expect(t.sinceYesterday).toBe(5050n);
    expect(t.points).toHaveLength(30);
    expect(t.points.slice(0, 25).every(p => p === null)).toBe(true); // before the first reading (Nov 1): unknown, never zero
    expect(t.points[25]).toBe(100000n);
  });
  test('unknown stays unknown: another currency, one reading, or nothing before today', () => {
    expect(wealthTrend(history, 'EUR', '2026-11-05')).toBeNull();
    expect(wealthTrend([{currency: 'USD', points: [{at: '2026-11-05T09:00:00.000Z', value: '1'}]}], 'USD', '2026-11-05')).toBeNull();
    expect(wealthTrend(history, 'USD', '2026-11-01', 2)).toBeNull(); // nothing known the day before the first reading
    expect(wealthTrend(history, 'USD', '2026-11-02', 2)?.sinceYesterday).toBe(0n); // the latest reading carries over: unchanged
  });
  test('the line spans its box; a flat line sits in the middle', () => {
    expect(trendPath([1n, null, 3n], 120, 28)).toBe('M0.0 28.0 L120.0 0.0');
    expect(trendPath([5n, 5n], 120, 28)).toBe('M0.0 14.0 L120.0 14.0');
  });
});

describe('GAP-095 (P-DVG-31, P-NB-C17): more starter packs', () => {
  test('a study routine and a weekly reset; the reset\'s steps are once a week, any day', () => {
    expect(ROUTINE_TEMPLATES.map(t => t.id)).toEqual(['morning', 'evening', 'workout', 'focus', 'study', 'reset']);
    const reset = ROUTINE_TEMPLATES.find(t => t.id === 'reset')!;
    let n = 0;
    const made = createRoutineFromTemplate(emptyHabitData(), reset, new Date('2026-11-05T08:00:00Z'), () => `33333333-3333-4333-8333-33333333333${n++}`);
    expect(made.created).toHaveLength(3);
    for (const h of made.data.habits) expect(h.rules[0]!.schedule).toEqual({kind: 'frequency', times: 1, period: 'week'});
    expect(made.data.habits[1]!.stackAfterId).toBe(made.data.habits[0]!.id);
  });
});

describe('GAP-086 (P-DVG-16, P-NB-C18): notes and moods from check-ins, searchable', () => {
  test('newest first; search by words, habit name or mood; skips and empty check-ins are not reflections', () => {
    let d = createHabit(emptyHabitData(), input(), new Date('2026-11-01T08:00:00Z'), ID);
    d = logHabitValue(d, ID, '2026-11-02', 1, {note: 'Felt tired but did it'}, new Date('2026-11-02T09:00:00Z'));
    d = logHabitValue(d, ID, '2026-11-03', 1, {mood: 'calm'}, new Date('2026-11-03T09:00:00Z'));
    d = logHabitValue(d, ID, '2026-11-04', 1, {}, new Date('2026-11-04T09:00:00Z'));
    d = setHabitEntryStatus(d, ID, '2026-11-05', 'skipped', 'Rest day', new Date('2026-11-05T09:00:00Z'));
    const all = reflectionsOf(d);
    expect(all.map(r => r.date)).toEqual(['2026-11-03', '2026-11-02']);
    expect(matchReflections(all, 'tired').map(r => r.date)).toEqual(['2026-11-02']);
    expect(matchReflections(all, 'calm').map(r => r.mood)).toEqual(['Calm']);
    expect(matchReflections(all, 'fictional')).toHaveLength(2);
    expect(matchReflections(all, 'nothing here')).toHaveLength(0);
  });
});
