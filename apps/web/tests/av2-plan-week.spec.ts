import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addTask, editTask} from '../lib/tasks/engine';
import {flexRule} from '../lib/tasks/recurrence';
import {emptyTasks, type Tasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (r4-plan, LEDGER #300–#305; Motion's planned week): working hours set in Tasks → This week; Plan my week
 * proposes the open tasks with minutes over the next 7 days (the earliest deadline first, a task in pieces as "part 1 of 3",
 * what finds no room said), the person unticks one and keeps the rest; a floating repeat sits in "Once this week, any day";
 * Upcoming says a deadline at risk in one quiet line (a note, never an alert); Today leaves out a task that waits for
 * another and says so. At 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const MON = '2026-11-23', at = new Date('2026-11-20T07:00:00Z');
function seed(): Tasks {
  const add = (r: Tasks, id: string, input: Parameters<typeof addTask>[1]) => addTask(r, input, {id, at, today: MON});
  let r = add(emptyTasks(), 'task_fictional-report', {title: 'Fictional report', minutes: 120, deadline: '2026-11-24'});
  r = add(r, 'task_fictional-slides', {title: 'Fictional slides', minutes: 300, deadline: '2026-11-24'});
  r = add(r, 'task_fictional-thesis', {title: 'Fictional thesis', minutes: 180});
  r = editTask(r, 'task_fictional-thesis', {chunk: 60}, MON, {at});
  r = add(r, 'task_fictional-plants', {title: 'Fictional plants', minutes: 30, due: '2026-11-29', recur: flexRule('week', 'once a week')});
  r = add(r, 'task_fictional-venue', {title: 'Fictional venue', due: MON});
  r = add(r, 'task_fictional-invites', {title: 'Fictional invitations', due: MON});
  return editTask(r, 'task_fictional-invites', {after: ['task_fictional-venue']}, MON, {at});
}
const storedTask = (page: Page, id: string) => page.evaluate(k => (JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}').tasks as {id: string; due?: string; time?: string}[]).find(t => t.id === k) ?? null, id);
const storedHours = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:task-plan:v1') ?? '{}').workHours ?? null);
const clean = async (page: Page) => { const f = await axe(page, page.locator('main')); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };
const noSideways = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

for (const theme of THEMES) test(`${theme}: working hours, Plan my week as a proposal, a floating repeat, a deadline at risk, a waiting task`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date(`${MON}T08:00:00+01:00`)});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seed()));

  // Working hours (LEDGER #301): Monday to Friday, 09:00–12:00.
  await page.goto('/app/tasks?view=week'); await settle(page);
  const hours = page.locator('details.tasks-hours');
  await hours.locator('summary').click();
  await hours.getByLabel('From', {exact: true}).fill('09:00');
  await hours.getByLabel('Until', {exact: true}).fill('12:00');
  await hours.getByRole('button', {name: 'Save Monday to Friday'}).click();
  await expect.poll(() => storedHours(page)).toMatchObject({days: {'1': [{from: '09:00', to: '12:00'}], '5': [{from: '09:00', to: '12:00'}]}});
  await expect(hours.getByRole('list', {name: 'Your hours this week'})).toContainText('Monday9:00 AM–12:00 PM');

  // Plan my week (LEDGER #300, #303): a proposal; nothing moved until kept.
  const week = page.locator('details.tasks-plan-week');
  await week.locator('summary').click();
  await expect(week).toContainText('part 1 of 3');
  await expect(week.getByRole('listitem').filter({hasText: 'Fictional slides'})).toContainText('the free time before its deadline');
  expect((await storedTask(page, 'task_fictional-report'))?.time).toBeUndefined();
  await week.getByRole('checkbox', {name: /Fictional plants/}).uncheck();
  await week.getByRole('button', {name: 'Keep 2 tasks'}).click();
  await expect.poll(async () => (await storedTask(page, 'task_fictional-report'))?.time).toBe('09:00');
  expect(await storedTask(page, 'task_fictional-report')).toMatchObject({due: MON});
  expect((await storedTask(page, 'task_fictional-plants'))?.time).toBeUndefined();

  // A floating repeat (LEDGER #305) waits in its week.
  await expect(page.getByRole('list', {name: 'Once this week or month, any day'})).toContainText('Fictional plants');
  await clean(page); await noSideways(page);

  // A deadline at risk (LEDGER #302): one quiet line in Upcoming, a fact.
  await page.goto('/app/tasks?view=upcoming'); await settle(page);
  const risk = page.locator('.tasks-at-risk');
  await expect(risk).toContainText('of tasks are due by');
  await expect(risk).toContainText('“Fictional slides”');
  await expect(risk).toHaveAttribute('role', 'note');
  // Session AV lane 2 (fixb4; deliberate): the one alert on the page was Next's own route announcer (an empty
  // role="alert" in <next-route-announcer>'s shadow root, on every page). As strict for everything the app renders: no
  // alert anywhere else in the body.
  await expect(page.locator('body > :not(next-route-announcer)').getByRole('alert')).toHaveCount(0);
  await clean(page); await noSideways(page);

  // A waiting task (LEDGER #304): not in Today until the venue is done; the planner says so.
  await page.goto('/app/tasks?view=today'); await settle(page);
  await expect(page.locator('li.task').filter({hasText: 'Fictional venue'})).toBeVisible();
  await expect(page.locator('li.task').filter({hasText: 'Fictional invitations'})).toHaveCount(0);
  await expect(page.locator('.tasks-waiting-line')).toContainText('“Fictional invitations” after “Fictional venue”');
  const venue = page.locator('li.task').filter({hasText: 'Fictional venue'});
  await venue.getByRole('button', {name: 'Edit “Fictional venue”'}).click();
  await expect(venue.getByRole('group', {name: 'Planning — optional'})).toBeVisible();
  await expect(venue.getByLabel('In pieces of')).toBeVisible();
  await venue.getByRole('button', {name: 'Cancel'}).click();
  // Session AV lane 2 (fixb4; deliberate): a task marked done leaves Today, so check() — which reads the box again after
  // the click — waited for a box that was gone. As strict: the box is clicked, the venue is stored done and leaves Today,
  // and the waiting task shows.
  await venue.getByRole('checkbox', {name: 'Mark “Fictional venue” done'}).click();
  await expect.poll(() => page.evaluate(() => !!(JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}').tasks as {id: string; doneAt?: string}[]).find(t => t.id === 'task_fictional-venue')?.doneAt)).toBe(true);
  await expect(venue).toHaveCount(0);
  await expect(page.locator('li.task').filter({hasText: 'Fictional invitations'})).toBeVisible();
  await clean(page); await noSideways(page);
});
