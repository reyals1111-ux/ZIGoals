import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks, type Tasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (minors; QUALITY.md's open q1 Minors): a paused weekly repeat says "paused until …" on its row and
 * resumes from its editor (a daily task due tomorrow is never called paused); Completed draws the daily goal as a line
 * with its words; the Agenda shows a task's deadline on its own day — at 390 and 1440, in Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. Fictional data; every /api call answers 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-20T07:00:00Z'), T = '2026-11-23'; // a Monday
let seeded: Tasks = addTask(emptyTasks(), {title: 'Fictional bins out', due: '2026-12-14', recur: {every: 'week', interval: 1, weekdays: [1]}}, {id: 'task_fictional-bins', at, today: T});
seeded = addTask(seeded, {title: 'Fictional plants', due: '2026-11-24', recur: {every: 'day', interval: 1}}, {id: 'task_fictional-plants', at, today: T});
seeded = addTask(seeded, {title: 'Fictional report', due: '2026-11-25', deadline: '2026-11-27'}, {id: 'task_fictional-report', at, today: T});
for (const [id, title, doneAt] of [['task_fictional-a', 'Fictional errand one', '2026-11-23T06:20:00.000Z'], ['task_fictional-b', 'Fictional errand two', '2026-11-23T06:40:00.000Z'], ['task_fictional-c', 'Fictional errand three', '2026-11-20T15:00:00.000Z']] as const) {
  seeded = addTask(seeded, {title, due: '2026-11-20'}, {id, at, today: '2026-11-20'});
  seeded = {...seeded, tasks: seeded.tasks.map(t => t.id === id ? {...t, doneAt} : t)};
}
const seed = (page: Page) => page.evaluate(v => {
  localStorage.setItem('zigoals:tasks:v1', v);
  localStorage.setItem('zigoals:task-plan:v1', JSON.stringify({version: 1, dailyGoal: 2}));
  localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
}, JSON.stringify(seeded));
const dueOf = (page: Page, id: string) => page.evaluate(i => (JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}').tasks as {id: string; due?: string}[]).find(t => t.id === i)?.due ?? null, id);

for (const theme of THEMES) test(`${theme}: a paused repeat on its row, the daily goal line, a deadline on the Agenda`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T08:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await seed(page);

  // q1 #43: the paused weekly task says so on its row; the daily one due tomorrow does not.
  await page.goto('/app/tasks?view=all'); await settle(page);
  const bins = page.locator('li.task').filter({hasText: 'Fictional bins out'}).first();
  await expect(bins.locator('.task-recur')).toContainText('paused until Mon, Dec 14');
  await expect(page.locator('li.task').filter({hasText: 'Fictional plants'}).first().locator('.task-recur')).not.toContainText('paused');
  await bins.getByRole('button', {name: 'Edit “Fictional bins out”'}).click();
  const editor = page.getByRole('form', {name: 'Edit “Fictional bins out”'});
  await expect(editor.getByRole('note')).toContainText('Paused until Mon, Dec 14.');
  const findings = await axe(page, page.locator('li.task').first());
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await editor.getByRole('button', {name: 'Resume from Mon, Nov 23'}).click();
  await expect.poll(() => dueOf(page, 'task_fictional-bins')).toBe(T);
  await expect(page.locator('li.task').filter({hasText: 'Fictional bins out'}).first().locator('.task-recur')).not.toContainText('paused');

  // q1 #6: the daily goal (2 a day) as a dashed line across the bars, and in words.
  await page.goto('/app/tasks?view=completed'); await settle(page);
  const chart = page.getByRole('region', {name: /^Finished per day/});
  await expect(chart.locator('svg line.tasks-done-goal')).toHaveCount(1);
  await expect(chart.getByTestId('tasks-done-goal')).toHaveText('Daily goal: 2 tasks · reached on 1 of the last 14 days');
  const chartFindings = await axe(page, chart);
  expect(chartFindings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(chartFindings)).toEqual([]);

  // q1 #15: the report, planned for Wednesday, shows its deadline on Friday in the Agenda's week.
  await page.goto('/app/agenda'); await settle(page);
  const deadlines = page.getByRole('list', {name: 'Deadlines on this day'});
  await expect(deadlines).toHaveCount(1);
  await expect(deadlines.getByRole('listitem')).toHaveCount(1);
  await expect(deadlines.getByRole('listitem')).toContainText('Deadline · planned Wed, Nov 25');
  const agendaFindings = await axe(page, deadlines);
  expect(agendaFindings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(agendaFindings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await deadlines.getByRole('link', {name: 'Fictional report'}).click();
  await expect(page).toHaveURL(/\/app\/tasks#task-task_fictional-report$/);
});
