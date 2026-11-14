import {describe, expect, it} from 'vitest';
import {buildAgenda, type AgendaInput} from './build';
import {taskAgendaItems, withExtras} from './time-items';
import {GRID_FIRST_HOUR, GRID_LAST_HOUR, MOVE_TIMES, hourClock, hourRows, movable, timedLoad, untimedOthers, untimedTasks} from './hour-grid';
import {createHabit, emptyHabitData} from '../habits';
import {editTask} from '../tasks/engine';
import {tasksSchema} from '../tasks/schema';

/** Session AP: the Agenda's day as an hour grid; a task moved to an hour gets that time through its own edit. */
const TODAY = '2026-11-14';
const day = (iso: string) => iso.slice(0, 10);
const habitData = createHabit(emptyHabitData(), {title: 'Fictional stretch', category: 'Fictional', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}}, new Date('2026-10-01T06:00:00Z'), 'aaaaaaaa-0000-4000-8000-0000000000a1');
const habitId = habitData.habits[0]!.id;
const at = '2026-11-01T09:00:00.000Z';
const tasks = tasksSchema.parse({version: 1, tasks: [
  {id: 't-early', title: 'Early run', priority: 'normal', due: TODAY, time: '05:30', createdAt: at},
  {id: 't-nine', title: 'Call the bank', priority: 'high', due: TODAY, time: '09:00', createdAt: at},
  {id: 't-any', title: 'Buy stamps', priority: 'normal', due: TODAY, createdAt: at},
  {id: 't-late', title: 'Overdue form', priority: 'normal', due: '2026-11-12', time: '10:00', createdAt: at},
  {id: 't-done', title: 'Done task', priority: 'normal', due: TODAY, time: '07:00', createdAt: at, doneAt: '2026-11-14T07:30:00.000Z'},
]});
const agendaDay = (record = tasks) => {
  const input: AgendaInput = {today: TODAY, now: Date.parse(`${TODAY}T12:00:00Z`), zone: 'UTC', habits: habitData, habitTimes: {[habitId]: '07:15'}};
  return withExtras(buildAgenda(input, TODAY, TODAY), taskAgendaItems(record, TODAY, TODAY, TODAY, day))[0]!;
};

describe('the hour grid', () => {
  it('runs 06:00–23:00, earlier when an item is earlier; each item in its hour, the habit at its own time', () => {
    const rows = hourRows(agendaDay());
    expect(rows[0]!.clock).toBe('05:00');
    expect(rows.at(-1)!.hour).toBe(GRID_LAST_HOUR);
    const at7 = rows.find(r => r.hour === 7)!.items.map(i => i.source);
    expect(at7.sort()).toEqual(['habit', 'task']);
    expect(rows.find(r => r.hour === 9)!.items.map(i => i.title)).toEqual(['Call the bank']);
    expect(hourRows({items: []})[0]!.hour).toBe(GRID_FIRST_HOUR);
  });
  it('the load is the number of timed items (done ones too); untimed tasks wait above the grid; only open tasks move', () => {
    const d = agendaDay();
    // 05:30 run, 09:00 call, 07:00 done task, 07:15 habit; the overdue form shows on today without its time.
    expect(timedLoad(d)).toBe(4);
    expect(untimedTasks(d).map(t => t.taskId).sort()).toEqual(['t-any', 't-late']);
    expect(untimedOthers(d)).toEqual([]);
    expect(d.items.filter(movable).map(i => i.title).sort()).toEqual(['Buy stamps', 'Call the bank', 'Early run', 'Overdue form']);
    expect(d.items.some(i => i.source === 'habit' && movable(i))).toBe(false);
  });
  it('moving a task to an hour writes its existing due day and time and nothing else; it then sits in that hour', () => {
    const moved = editTask(tasks, 't-any', {due: TODAY, time: hourClock(14)}, TODAY, {allowPast: true});
    const t = moved.tasks.find(x => x.id === 't-any')!;
    expect([t.due, t.time]).toEqual([TODAY, '14:00']);
    expect(hourRows(agendaDay(moved)).find(r => r.hour === 14)!.items.map(i => i.title)).toEqual(['Buy stamps']);
    expect(timedLoad(agendaDay(moved))).toBe(5);
    // An overdue task moved to an hour today is due today at that hour (no longer overdue).
    const late = editTask(tasks, 't-late', {due: TODAY, time: '16:00'}, TODAY, {allowPast: true}).tasks.find(x => x.id === 't-late')!;
    expect([late.due, late.time]).toEqual([TODAY, '16:00']);
  });
  it('the keyboard picker offers every half hour of the day', () => {
    expect(MOVE_TIMES).toHaveLength(48);
    expect([MOVE_TIMES[0], MOVE_TIMES[1], MOVE_TIMES.at(-1)]).toEqual(['00:00', '00:30', '23:30']);
  });
});
