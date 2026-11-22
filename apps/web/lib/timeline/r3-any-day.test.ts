import {describe, expect, it} from 'vitest';
import {createHabit, emptyHabitData, type HabitData, type HabitInput} from '../habits';
import {createEmptyHealth} from '../health';
import {emptyReminders} from '../reminders/schema';
import {emptyWReminders} from '../reminders/w-schema';
import {emptyRemindersPlan} from '../reminders-plan/schema';
import {emptySleep} from '../sleep/schema';
import {addLocalDays} from '../local-date';
import {buildDayTimeline, type TimelineInput} from './build';
import {datedTimeKey, dropPastDated, habitTimeKey, mealTimeKey, setTime} from './store';
import {plannedWorkoutItems} from './workout-source';
import {taskTimelineItems} from '../tasks/timeline-source';
import {addTask} from '../tasks/engine';
import {emptyTasks} from '../tasks/schema';

/**
 * Session AV lane 2 (r3-plan, LEDGER #258; Structured's timeline for any day): the Day Timeline of tomorrow or a chosen day —
 * the habits due that day, its tasks, planned workouts — to plan ahead; a block moved there keeps its time for that date
 * only; nothing is ticked or logged from another day, and nothing under way is drawn on it.
 */
const TODAY = '2026-11-23', TOMORROW = addLocalDays(TODAY, 1), ZONE = 'UTC';
const ID = {stretch: 'cccccccc-0000-4000-8000-0000000000c1', gym: 'cccccccc-0000-4000-8000-0000000000c2'};
const habit = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Fictional', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}, ...extra});
function habits(): HabitData {
  let d = emptyHabitData(); const made = new Date('2026-11-01T06:00:00Z');
  d = createHabit(d, habit('Fictional stretch'), made, ID.stretch);
  // Tuesdays only: due tomorrow (24 Nov 2026 is a Tuesday), not today.
  d = createHabit(d, habit('Fictional gym', {schedule: {kind: 'weekdays', days: [2]}, timeOfDay: 'evening'}), made, ID.gym);
  return d;
}
const base = (over: Partial<TimelineInput> = {}): TimelineInput => ({date: TODAY, today: TODAY, now: new Date(`${TODAY}T10:30:00Z`), zone: ZONE, habits: habits(), health: createEmptyHealth(), reminders: emptyReminders(), wReminders: emptyWReminders(), plan: emptyRemindersPlan(), times: {}, fasting: null, meditationRun: null, sleep: emptySleep(), ...over});
const find = (day: ReturnType<typeof buildDayTimeline>, id: string) => [...day.blocks, ...day.anytime].find(b => b.id === id);

describe('the Day Timeline for another day (LEDGER #258)', () => {
  it('shows the habits due that day, each opening its page rather than ticking it', () => {
    const today = buildDayTimeline(base()), tomorrow = buildDayTimeline(base({date: TOMORROW}));
    expect(find(today, `habit:${ID.gym}`)).toBeUndefined();
    expect(find(tomorrow, `habit:${ID.gym}`)).toMatchObject({start: 19 * 60, action: 'open'});
    expect(find(today, `habit:${ID.stretch}`)?.action).toBe('habit-done');
    expect(find(tomorrow, `habit:${ID.stretch}`)).toMatchObject({action: 'open', timeKey: datedTimeKey(TOMORROW, habitTimeKey(ID.stretch))});
    expect(tomorrow.leftovers).toEqual([]);
  });
  it('a move on another day is kept for that date only; the everyday move still shows on other days, and today is as before', () => {
    const key = habitTimeKey(ID.stretch);
    let record = setTime({version: 1, times: {}}, key, '07:00');
    record = setTime(record, datedTimeKey(TOMORROW, key), '09:30', 45);
    const today = find(buildDayTimeline(base({times: record.times})), `habit:${ID.stretch}`)!;
    expect(today).toMatchObject({start: 7 * 60, timeFrom: 'moved here', timeKey: key});
    expect(today.everydayMove).toBeUndefined();
    expect(find(buildDayTimeline(base({date: TOMORROW, times: record.times})), `habit:${ID.stretch}`)).toMatchObject({start: 9 * 60 + 30, minutes: 45, timeFrom: 'moved here', timeKey: datedTimeKey(TOMORROW, key)});
    const later = find(buildDayTimeline(base({date: addLocalDays(TODAY, 2), times: record.times})), `habit:${ID.stretch}`)!;
    expect(later).toMatchObject({start: 7 * 60, timeFrom: 'moved here', everydayMove: true, timeKey: datedTimeKey(addLocalDays(TODAY, 2), key)});
    // On the day itself, the move made ahead of time wins, and a move then writes that date's key.
    expect(find(buildDayTimeline(base({date: TOMORROW, today: TOMORROW, times: record.times})), `habit:${ID.stretch}`)).toMatchObject({start: 9 * 60 + 30, timeKey: datedTimeKey(TOMORROW, key)});
    // Once its day has passed, the dated move leaves at the next move.
    expect(Object.keys(dropPastDated(record, addLocalDays(TODAY, 2)).times)).toEqual([key]);
    expect(datedTimeKey(TOMORROW, mealTimeKey('Lunch'))).toBe(`${TOMORROW}/meal:Lunch`);
  });
  it('nothing under way is drawn on another day; its tasks and planned workouts are', () => {
    const fasting = {version: 1, sessions: [{id: 'fast_fictional1', startedAt: `${TODAY}T06:00:00.000Z`, endedAt: null, targetHours: 16}]} as unknown as TimelineInput['fasting'];
    expect(buildDayTimeline(base({fasting})).blocks.some(b => b.kind === 'fast')).toBe(true);
    expect(buildDayTimeline(base({date: TOMORROW, fasting})).blocks.some(b => b.kind === 'fast')).toBe(false);
    const tasks = addTask(emptyTasks(), {title: 'Fictional dentist', due: TOMORROW, time: '10:00'}, {id: 't1', at: new Date(`${TODAY}T08:00:00Z`), today: TODAY});
    const extra = [...taskTimelineItems(tasks, TOMORROW, TODAY, iso => iso.slice(0, 10)), ...plannedWorkoutItems(true, TOMORROW, TODAY)].map(i => ({...i, id: `x:${i.id}`}));
    const day = buildDayTimeline(base({date: TOMORROW, extra}));
    expect(day.blocks.filter(b => b.kind === 'checklist').map(b => [b.title, b.start])).toEqual([['Example · Upper body session', 7 * 60 + 30], ['Fictional dentist', 10 * 60]]);
    expect(plannedWorkoutItems(false, TOMORROW, TODAY)).toEqual([]);
  });
});
