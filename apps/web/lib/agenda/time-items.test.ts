import {describe, expect, it} from 'vitest';
import {buildAgenda, type AgendaInput} from './build';
import {compareDayItems, countExtras, eventAgendaItems, taskAgendaItems, withExtras, type DayItem} from './time-items';
import {AGENDA, agendaSchema, emptyAgenda, setExtraShown, setSourceShown} from './store';
import {createHabit, emptyHabitData} from '../habits';
import {tasksSchema} from '../tasks/schema';
import {showcaseTasks} from '../tasks/showcase';
import {showcaseCalendarImport} from '../ics/showcase';
import {readDeviceRecord} from '../device-record';

/** Session AK (T1, T2): tasks and imported events beside the Agenda's own items, in one order. */
const TODAY = '2026-11-04'; // a Wednesday
const day = (iso: string) => iso.slice(0, 10);
const habits = () => createHabit(emptyHabitData(), {title: 'Fictional stretch', category: 'Fictional', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}}, new Date('2026-10-01T06:00:00Z'), 'aaaaaaaa-0000-4000-8000-0000000000a1');
const input: AgendaInput = {today: TODAY, now: Date.parse(`${TODAY}T12:00:00Z`), zone: 'UTC', habits: habits()};
const at = '2026-11-01T09:00:00.000Z';
const tasks = tasksSchema.parse({version: 1, tasks: [
  {id: 't-time', title: 'Call the dentist', priority: 'high', due: TODAY, time: '08:00', createdAt: at},
  {id: 't-any', title: 'Buy stamps', priority: 'normal', due: TODAY, createdAt: at, goal: 'private:g1'},
  {id: 't-late', title: 'Overdue form', priority: 'normal', due: '2026-11-02', createdAt: at},
  {id: 't-next', title: 'Next week', priority: 'low', due: '2026-11-09', createdAt: at},
  {id: 't-some', title: 'Someday', priority: 'low', createdAt: at},
  {id: 't-done', title: 'Done Monday', priority: 'normal', due: '2026-11-02', createdAt: at, doneAt: '2026-11-02T10:00:00.000Z'},
]});

describe('tasks on the Agenda', () => {
  it('on their day; overdue carried to today; done on their day; someday nowhere', () => {
    const items = taskAgendaItems(tasks, '2026-11-02', '2026-11-08', TODAY, day);
    const where = Object.fromEntries(items.map(i => [i.taskId, i.date]));
    expect(where).toEqual({'t-time': TODAY, 't-any': TODAY, 't-late': TODAY, 't-done': '2026-11-02'});
    expect(items.find(i => i.taskId === 't-late')).toMatchObject({overdueSince: '2026-11-02', state: 'open', time: null});
    expect(items.find(i => i.taskId === 't-time')).toMatchObject({time: '08:00', minutes: 30, href: '/app/tasks#task-t-time', pillar: 'life'});
    expect(items.find(i => i.taskId === 't-any')!.pillar).toBe('goals');
    expect(items.find(i => i.taskId === 't-done')!.state).toBe('done');
    // Looking back at last week from today: an overdue task is never shown on its past day.
    expect(taskAgendaItems(tasks, '2026-10-26', '2026-11-03', TODAY, day).map(i => i.taskId)).toEqual(['t-done']);
  });
  it('merge order: untimed first (review, habit, task …, imported event last), then by time, then kind', () => {
    const days = withExtras(buildAgenda(input, TODAY, TODAY), [...taskAgendaItems(tasks, TODAY, TODAY, TODAY, day), {id: 'event:c:e:x', source: 'event', pillar: 'life', date: TODAY, time: '08:00', minutes: 30, title: 'A call', href: null, state: 'open', calendarId: 'c', calendar: 'Work'}, {id: 'event:c:f:x', source: 'event', pillar: 'life', date: TODAY, time: null, minutes: 0, title: 'Holiday', href: null, state: 'open', calendarId: 'c', calendar: 'Work'}]);
    expect(days[0]!.items.map(i => `${i.time ?? '—'} ${i.source} ${i.title}`)).toEqual([
      '— task Buy stamps', '— task Overdue form', '— event Holiday',
      '08:00 habit Fictional stretch', '08:00 task Call the dentist', '08:00 event A call',
    ]);
    const sorted = [...days[0]!.items].sort(compareDayItems);
    expect(sorted).toEqual(days[0]!.items);
  });
  it('hidden kinds are left out; counts per kind', () => {
    const extra: DayItem[] = taskAgendaItems(tasks, TODAY, TODAY, TODAY, day);
    expect(withExtras(buildAgenda(input, TODAY, TODAY), extra, ['task'])[0]!.items.every(i => i.source === 'habit')).toBe(true);
    expect(countExtras(extra)).toEqual({task: 3, event: 0});
    expect(withExtras(buildAgenda(input, TODAY, TODAY), [{...extra[0]!, date: '2030-01-01'}])[0]!.items.some(i => i.source === 'task')).toBe(false);
  });
});

describe('imported events on the Agenda', () => {
  it('each occurrence in the device\'s zone, read-only, named by its calendar', () => {
    const cal = showcaseCalendarImport(TODAY);
    const items = eventAgendaItems(cal, TODAY, '2026-11-17', 'Europe/Brussels');
    expect(items.every(i => i.href === null && i.calendar === 'Example · Family calendar' && i.state === 'open')).toBe(true);
    expect(items.filter(i => i.title === 'Example · Weekend by the lake').map(i => [i.date, i.part, i.parts])).toEqual([['2026-11-08', 1, 3], ['2026-11-09', 2, 3], ['2026-11-10', 3, 3]]);
    expect(items.find(i => i.title === 'Example · Call with the planner')).toMatchObject({date: '2026-11-05', time: '15:00', minutes: 30});
    expect(items.filter(i => i.title === 'Example · Swimming lesson').map(i => i.date)).toEqual(['2026-11-04', '2026-11-11']);
    expect(new Set(items.map(i => i.id)).size).toBe(items.length);
  });
  it('the Showcase tasks and calendar together make a full day', () => {
    const extra = [...taskAgendaItems(showcaseTasks(TODAY), TODAY, TODAY, TODAY, day), ...eventAgendaItems(showcaseCalendarImport(TODAY), TODAY, TODAY, 'UTC')];
    expect(withExtras(buildAgenda(input, TODAY, TODAY), extra)[0]!.items.map(i => i.source)).toEqual(['task', 'habit', 'task', 'event']);
  });
});

describe('the agenda record keeps the newer kinds in a field of their own (TIER 3, additive)', () => {
  it('hiddenExtra: tasks or events; `hidden` keeps only the values older builds read', () => {
    let r = setExtraShown(emptyAgenda(), 'event', false);
    r = setSourceShown(r, 'bill', false);
    expect(r).toEqual({version: 1, hiddenExtra: ['event'], hidden: ['bill']});
    r = setExtraShown(setExtraShown(r, 'task', false), 'event', true);
    expect(r.hiddenExtra).toEqual(['task']);
    // A later build's kind is dropped on read rather than failing the record; a broken field reads as absent.
    expect(agendaSchema.parse({version: 1, view: 'day', hiddenExtra: ['task', 'notes']})).toEqual({version: 1, view: 'day', hiddenExtra: ['task']});
    expect(readDeviceRecord({getItem: () => JSON.stringify({version: 1, view: 'week', hiddenExtra: 7})}, AGENDA)).toEqual({data: {version: 1, view: 'week'}, unreadable: false});
    // An older build's strict `hidden` enum never sees 'task' or 'event'.
    expect(agendaSchema.safeParse({version: 1, hidden: ['task']}).success).toBe(false);
  });
});
