import {describe, expect, test} from 'vitest';
import {localDate} from '../local-date';
import {tasksSchema, type Tasks} from '../tasks/schema';
import {letTaskGo, moveTaskDue, putTaskBack, tomorrowOf, wrapUpTasks} from './move';

const TODAY = '2026-11-04';
const rec = (): Tasks => tasksSchema.parse({version: 1, tasks: [
  {id: 'today', title: 'Call the plumber', priority: 'normal', due: TODAY, time: '17:30', createdAt: '2026-11-01T08:00:00.000Z'},
  {id: 'overdue', title: 'Return the book', priority: 'high', due: '2026-11-02', createdAt: '2026-11-01T08:00:00.000Z'},
  {id: 'goal', title: 'Sketch the garden', priority: 'low', due: TODAY, goal: 'private:garden', createdAt: '2026-11-01T09:00:00.000Z'},
  {id: 'later', title: 'Book a trip', priority: 'normal', due: '2026-11-20', createdAt: '2026-11-01T08:00:00.000Z'},
  {id: 'someday', title: 'Learn a song', priority: 'normal', createdAt: '2026-11-01T08:00:00.000Z'},
  {id: 'done', title: 'Water plants', priority: 'normal', due: TODAY, createdAt: '2026-11-01T08:00:00.000Z', doneAt: `${TODAY}T08:00:00.000Z`},
]});

describe('Wrap-up: what is moving to tomorrow (BUILD list 2 #14)', () => {
  test('due today and overdue, still open, in the task list\'s order; later, someday and done are not listed', () => {
    expect(wrapUpTasks(rec(), TODAY).map(t => t.id)).toEqual(['overdue', 'today', 'goal']);
  });
  test('move to tomorrow keeps the time, the priority and the goal link', () => {
    const next = moveTaskDue(rec(), 'goal', tomorrowOf(TODAY));
    expect(next.tasks.find(t => t.id === 'goal')).toMatchObject({due: '2026-11-05', goal: 'private:garden', priority: 'low'});
    expect(moveTaskDue(rec(), 'today', '2026-11-05').tasks.find(t => t.id === 'today')).toMatchObject({due: '2026-11-05', time: '17:30'});
    expect(moveTaskDue(rec(), 'overdue', '2026-11-05').tasks.find(t => t.id === 'overdue')!.due).toBe('2026-11-05');
    expect(wrapUpTasks(next, TODAY).map(t => t.id)).toEqual(['overdue', 'today']);
  });
  test('let it go: it stays in Tasks, with no day and no time; Undo puts it back as it was', () => {
    const before = rec().tasks.find(t => t.id === 'today')!;
    const gone = letTaskGo(rec(), 'today');
    const kept = gone.tasks.find(t => t.id === 'today')!;
    expect(kept.due).toBeUndefined();
    expect(kept.time).toBeUndefined();
    expect(kept.title).toBe('Call the plumber');
    expect(putTaskBack(gone, before).tasks.find(t => t.id === 'today')).toEqual(before);
    expect(putTaskBack({...gone, tasks: gone.tasks.filter(t => t.id !== 'today')}, before).tasks.some(t => t.id === 'today')).toBe(false);
    expect(() => letTaskGo(rec(), 'nope')).toThrow(/no longer/);
  });
  test('the zone change at midnight: the wrap-up day is the device\'s calendar day; just after midnight yesterday\'s task is overdue and still listed', () => {
    expect(tomorrowOf('2026-12-31')).toBe('2027-01-01');
    expect(tomorrowOf('2026-03-28')).toBe('2026-03-29'); // a spring-forward weekend in Europe: still one calendar day
    expect(wrapUpTasks(rec(), '2026-11-05').map(t => t.id)).toEqual(['overdue', 'today', 'goal']);
    expect(localDate(new Date(2026, 10, 4, 23, 59))).toBe(TODAY);
    expect(localDate(new Date(2026, 10, 5, 0, 1))).toBe('2026-11-05');
  });
});
