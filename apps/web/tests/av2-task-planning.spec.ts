import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addProject, addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (tasks, LEDGER #7–#10, #12–#14, #17, #20–#30; Sunsama, Todoist, TickTick, Things, Notion): Tasks →
 * Today's day planner (fit my day around the Agenda, a timer, the day's limit), This week (objectives, planning choices),
 * Table (sortable), Calendar (3 days and a month), Timeline, Insights (the year, a chart) and Areas and templates — at 390
 * and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-23T07:00:00Z'), today = '2026-11-23';
let seeded = addProject(emptyTasks(), {name: 'Fictional move'}, 'project_fictional-move');
seeded = addTask(seeded, {title: 'Fictional standup', due: today, time: '10:00', minutes: 30}, {id: 'task_standup', at, today});
seeded = addTask(seeded, {title: 'Write the fictional report', due: today, minutes: 60}, {id: 'task_report', at, today});
seeded = addTask(seeded, {title: 'Pack the fictional boxes', due: '2026-11-25', deadline: '2026-11-28', projectId: 'project_fictional-move', level: 1}, {id: 'task_boxes', at, today});
const tasks = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}') as {tasks: {id: string; time?: string; objective?: string; projectId?: string}[]; objectives?: {title: string}[]; areas?: {name: string}[]; projects?: {name: string; areaId?: string}[]});
const open = async (page: import('@playwright/test').Page, name: string) => { await page.getByRole('navigation', {name: 'Task views'}).getByRole('button', {name: new RegExp(`^${name}`)}).click(); await settle(page); };
const clean = async (page: import('@playwright/test').Page) => { const f = await axe(page, page.locator('main')); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };

for (const theme of THEMES) test(`${theme}: the day planner, This week, the layouts, areas and templates`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T08:50:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:task-plan:v1', JSON.stringify({version: 1, dayLimit: 60})); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto('/app/tasks?view=today'); await settle(page);
  // Over the day's limit (90 min planned, 60 held), and the report fitted before the standup (09:00–10:00).
  await expect(page.locator('.tasks-over-limit')).toContainText('more than the 1 h your day holds');
  await page.locator('details.tasks-fit-day > summary').click();
  const plan = page.getByRole('list', {name: 'A plan for today'});
  await expect(plan.getByRole('listitem')).toHaveCount(1);
  await expect(plan).toContainText('Write the fictional report');
  await plan.getByRole('button', {name: /^Place “Write the fictional report” at/}).click();
  await expect.poll(async () => (await tasks(page)).tasks.find(t => t.id === 'task_report')?.time).toBe('09:00');
  await clean(page);

  await open(page, 'This week');
  await page.getByRole('textbox', {name: 'New objective'}).fill('Finish the fictional move');
  await page.getByRole('button', {name: 'Add objective'}).click();
  await expect.poll(async () => (await tasks(page)).objectives?.map(o => o.title)).toEqual(['Finish the fictional move']);
  await page.getByRole('combobox', {name: 'Link a task'}).selectOption({label: 'Pack the fictional boxes'});
  await expect.poll(async () => !!(await tasks(page)).tasks.find(t => t.id === 'task_boxes')?.objective).toBe(true);
  await expect(page.getByRole('list', {name: 'Objectives this week'})).toContainText('0 of 1 tasks done');
  await page.getByRole('combobox', {name: 'Daily goal'}).selectOption('3');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:task-plan:v1')!).dailyGoal)).toBe(3);
  await clean(page);

  await open(page, 'Table');
  const table = page.getByRole('table');
  await table.getByRole('button', {name: 'Priority'}).click();
  await expect(table.getByRole('columnheader', {name: /Priority/})).toHaveAttribute('aria-sort', 'ascending');
  await expect(table.getByRole('rowheader').first()).toHaveText('Pack the fictional boxes');
  await clean(page);

  await open(page, 'Calendar');
  await expect(page.getByRole('region', {name: /Wed, Nov 25/})).toContainText('Pack the fictional boxes');
  await page.getByRole('button', {name: 'Month'}).click();
  await expect(page.getByRole('table')).toBeVisible();
  await clean(page);

  await open(page, 'Timeline');
  await expect(page.getByRole('list', {name: 'Tasks on the timeline'})).toContainText('Pack the fictional boxes');
  await clean(page);

  await open(page, 'Insights');
  await expect(page.getByRole('img', {name: /A year of finished tasks/})).toBeVisible();
  await page.getByRole('combobox', {name: 'Show'}).selectOption('open');
  await page.getByRole('combobox', {name: 'By'}).selectOption('project');
  await expect(page.getByRole('list', {name: 'Open tasks by project'})).toContainText('Fictional move');
  await clean(page);

  await open(page, 'Areas and templates');
  await page.getByRole('textbox', {name: 'New area'}).fill('Home');
  await page.getByRole('button', {name: 'Add area'}).click();
  await page.getByRole('combobox', {name: 'Fictional move'}).selectOption({label: 'Home'});
  await expect.poll(async () => !!(await tasks(page)).projects?.find(p => p.name === 'Fictional move')?.areaId).toBe(true);
  await expect(page.getByRole('navigation', {name: 'Task views'}).getByRole('heading', {name: 'Home'})).toBeVisible();
  await page.getByRole('combobox', {name: 'Template'}).selectOption({label: 'A trip'});
  await page.getByRole('button', {name: 'Make the project'}).click();
  await expect.poll(async () => (await tasks(page)).projects?.map(p => p.name)).toContain('A trip');
  await clean(page);
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
