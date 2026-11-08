import {expect, test} from 'vitest';
import {buildShowcase} from '../../showcase-data';
import {emptyTasks} from '../../tasks/schema';
import {addTask} from '../../tasks/engine';
import {Handles} from '../handles';
import {toolEnv, type ToolSources} from '../tools/env';
import {gatesFor, showcaseSources} from '../tools/fixtures';
import {readAkToolSources} from '../tools/ak-sources';
import {readNovaToolSources} from '../tools/nova-sources';
import {NOT_READ_HERE} from '../tools/nova-tools';
import {localAnswer} from './engine';

/**
 * Owner follow-up 2 (N2, N4): tasks, focus, workouts and budgets answered on this device with no AI request (NOVA works
 * from minute one; ZIGi answers the same), from the same tools NOVA's model reads. Advice, Dutch and anything that also
 * asks for a change stay the model's; the workout log stays behind the Health gate; unknown is never "none".
 */
const DAY = '2026-10-31', at = new Date(`${DAY}T08:00:00Z`);
const SHOWCASE = buildShowcase(DAY, 'UTC').records, BASE = showcaseSources(DAY), get = {getItem: (k: string) => SHOWCASE[k] ?? null};
const sources = (over: Partial<ToolSources> = {}): ToolSources => ({...BASE, ak: readAkToolSources(get), nova: readNovaToolSources(get), ...over});
const env = (s = sources(), health = true) => toolEnv(s, gatesFor(health, 'today'), 'local', new Handles());
const text = (q: string, e = env()) => { const r = localAnswer(q, e); return r.kind === 'none' ? null : r.text; };

test('tasks: the open ones with their day, time and priority; unknown when the list was not read', () => {
  let tasks = addTask(emptyTasks(), {title: 'Book the dentist', due: DAY, time: '10:30', priority: 'high'}, {id: 'task_1', at, today: DAY});
  tasks = addTask(tasks, {title: 'Water the plants'}, {id: 'task_2', at, today: DAY});
  const t = text('Which tasks are due today?', env(sources({nova: {tasks}})))!;
  // Release review AL (RR-8, deliberate): this env's clock is past the dentist's 10:30, and overdue is now the Tasks page's
  // one rule (day and time), so the counts move from "1 due today, 0 overdue" to the page's own; the line says it is late.
  expect(t.split('\n')[0]).toBe('2 open tasks: 0 due today, 1 overdue.'); expect(t).toMatch(/^• Book the dentist — due .+ at .+, late \(high\)$/m); expect(t).toMatch(/^• Book the dentist — due .+ at .+ \(high\)$/m); expect(t).toContain('• Water the plants');
  expect(text('What\'s on my to-do list?', env(sources({nova: undefined})))).toBe(NOT_READ_HERE);
});
test('focus, workouts and budgets from the Showcase\'s own records; workouts only with the Health gate', () => {
  expect(text('How much did I focus this week?')).toMatch(/^In the last 7 days: \d+ focus sessions?, \d+ focused minutes?\. Your garden holds \d+ grown and \d+ withered; every session counts\.$/);
  expect(text('How many workouts did I do this week?')).toMatch(/^This week: \d+ workouts?, [\d,]+ minutes?\. The last one: .+, \d+ minutes?\.$/);
  expect(localAnswer('How many workouts did I do this week?', env(sources(), false))).toMatchObject({kind: 'refusal'});
  const b = text('Am I over any budget?')!;
  expect(b).toContain('• Groceries: 268.00 EUR of 250.00 EUR — over'); expect(b.split('\n').at(-1)).toBe('1 budget over.');
  expect(text('How much is left in my fun budget?')).toContain('• Fun: 24.00 EUR of 60.00 EUR, 36.00 EUR left');
});
test('advice, a change, or a Dutch question stays the model\'s', () => {
  for (const q of ['Which tasks should I do first?', 'How much did I focus this week and log a session', 'Am I over budget? What should I cut?', 'Welke taken heb ik vandaag?']) expect(localAnswer(q, env()).kind, q).toBe('none');
});
// Session AL second pass (Lisbon LA-021, P-LA-13): done today, a priority, next and overdue are their own answers.
test('LA-021: tasks done today, a priority, the next one and the overdue ones each get their own answer', () => {
  let tasks = addTask(emptyTasks(), {title: 'Call the dentist', due: DAY}, {id: 'task_1', at, today: DAY});
  tasks = addTask(tasks, {title: 'Pick up parcel', due: DAY, time: '18:00'}, {id: 'task_2', at, today: DAY});
  tasks = addTask(tasks, {title: 'Team dinner', due: '2026-11-06', time: '19:30', priority: 'low'}, {id: 'task_3', at, today: DAY});
  tasks = {...tasks, tasks: tasks.tasks.map(t => t.id === 'task_1' ? {...t, doneAt: `${DAY}T09:00:00.000Z`} : t)};
  const e = env(sources({nova: {tasks}}));
  expect(text('How many tasks did I finish today?', e)).toBe('1 task done today:\n• Call the dentist');
  expect(text('Which task has high priority?', e)).toMatch(/^No open task has high priority\. Your open tasks: .*Team dinner \(low\)/);
  expect(text('Which tasks are low priority?', e)).toMatch(/^1 open low-priority task:\n• Team dinner — due /);
  expect(text('What\'s my next task?', e)).toMatch(/^Next: Pick up parcel — due .+ at /);
  expect(text('Do I have overdue tasks?', e)).toBe('No task is overdue.');
});
