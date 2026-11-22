import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addTask, finishTask} from '../lib/tasks/engine';
import {tasksSchema, type Tasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (r6-plan, LEDGER #391–#398; OmniFocus, Capacities): the Select bar gives several tasks any day and a label
 * (one Undo); a project put on hold leaves Today and comes back with Resume now; a project in order shows only its first task
 * in Today ("After …" on the next); a review interval brings it to Tasks → Review, and Reviewed sets the next turn; Focus
 * narrows Today to one project and Show all ends it; a label group keeps one label of it; a repeat's record in its editor;
 * "every second-to-last Friday" typed in quick add. At 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll.
 * Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const MON = '2026-11-23', at = new Date('2026-11-16T07:00:00Z');
function seed(): Tasks {
  const add = (r: Tasks, id: string, input: Parameters<typeof addTask>[1]) => addTask(r, input, {id, at, today: '2026-11-16', allowPast: true});
  let r = tasksSchema.parse({version: 1, tasks: [], projects: [
    {id: 'project_house', name: 'Fictional house', colour: 'teal', order: 0},
    {id: 'project_party', name: 'Fictional party', colour: 'blue', order: 1},
  ]});
  r = add(r, 'task_gutters', {title: 'Fictional gutters', due: MON, projectId: 'project_house'});
  r = add(r, 'task_venue', {title: 'Fictional venue', due: MON, projectId: 'project_party', order: 10});
  r = add(r, 'task_invites', {title: 'Fictional invitations', due: MON, projectId: 'project_party', order: 20});
  r = add(r, 'task_stamps', {title: 'Fictional stamps', due: MON});
  r = add(r, 'task_printer', {title: 'Fictional printer', due: MON, labels: ['home']});
  r = add(r, 'task_bins', {title: 'Fictional bins', due: '2026-11-16', recur: {every: 'week', interval: 1, weekdays: [1]}});
  return finishTask(r, 'task_bins', new Date('2026-11-17T18:00:00Z'), {today: '2026-11-17', doneDay: '2026-11-17'});
}
type Stored = {id: string; due?: string; labels?: string[]; recur?: Record<string, unknown>};
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}')) as Promise<{tasks: Stored[]; projects?: {id: string; hold?: unknown; inOrder?: boolean; review?: {every: number; last?: string}}[]; labelGroups?: unknown[]}>;
const storedPlan = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:task-plan:v1') ?? '{}'));
const clean = async (page: Page) => { const f = await axe(page, page.locator('main')); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };
const noSideways = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
const row = (page: Page, title: string) => page.locator('li.task').filter({has: page.locator('.task-title', {hasText: title})}).first();
const list = (page: Page) => page.locator('.tasks-main');

async function start(page: Page, theme: (typeof THEMES)[number], isMobile: boolean) {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date(`${MON}T08:00:00+01:00`)});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seed()));
}

for (const theme of THEMES) test(`${theme}: several tasks at once, a project on hold, in order and reviewed, focus, a label group, a repeat's record`, async ({page, isMobile}) => {
  await start(page, theme, isMobile);

  // The Select bar (LEDGER #391): any day and a label, each one change with one Undo.
  await page.goto('/app/tasks?view=today'); await settle(page);
  await page.locator('.tasks-page[data-tasks="ready"]').waitFor();
  await list(page).getByRole('button', {name: 'Select', exact: true}).click();
  await row(page, 'Fictional stamps').getByRole('checkbox', {name: 'Select “Fictional stamps”'}).check();
  await row(page, 'Fictional printer').getByRole('checkbox', {name: 'Select “Fictional printer”'}).check();
  const bar = page.getByRole('toolbar', {name: '2 selected'});
  await expect(bar).toBeVisible();
  await bar.getByLabel('Add a label').fill('@errand');
  await bar.getByRole('button', {name: 'Add', exact: true}).click();
  await expect.poll(async () => (await stored(page)).tasks.filter(t => t.labels?.includes('errand')).map(t => t.id).sort()).toEqual(['task_printer', 'task_stamps']);
  await bar.getByLabel('Any day').fill('2026-12-01');
  await bar.getByRole('button', {name: 'Set the day'}).click();
  await expect.poll(async () => (await stored(page)).tasks.filter(t => t.due === '2026-12-01').length).toBe(2);
  await page.getByRole('status').filter({hasText: 'due'}).getByRole('button', {name: 'Undo'}).click();
  await expect.poll(async () => (await stored(page)).tasks.filter(t => t.due === MON && (t.id === 'task_stamps' || t.id === 'task_printer')).length).toBe(2);
  await page.keyboard.press('Escape');

  // A project in order (LEDGER #393) and on hold (LEDGER #392).
  await page.goto('/app/tasks?view=project:project_party'); await settle(page);
  await page.getByRole('button', {name: 'Hold, order and review'}).click();
  await page.getByRole('checkbox', {name: 'Do the tasks one at a time, from the top'}).check();
  await expect.poll(async () => (await stored(page)).projects?.find(p => p.id === 'project_party')?.inOrder).toBe(true);
  await expect(page.locator('.tasks-r6-line').filter({hasText: 'In order'})).toContainText('next is “Fictional venue”');
  await expect(row(page, 'Fictional invitations')).toContainText('After “Fictional venue”');
  // Its review (LEDGER #395): every week.
  await page.getByLabel('Review it every').selectOption('1');
  await expect.poll(async () => (await stored(page)).projects?.find(p => p.id === 'project_party')?.review?.every).toBe(1);
  if (!isMobile) await clean(page);
  await noSideways(page);

  await page.goto('/app/tasks?view=project:project_house'); await settle(page);
  await page.getByRole('button', {name: 'Hold, order and review'}).click();
  await page.getByLabel('Resume on (optional)').fill('2026-12-07');
  await page.getByRole('button', {name: 'Put on hold'}).click();
  await expect.poll(async () => (await stored(page)).projects?.find(p => p.id === 'project_house')?.hold).toEqual({since: MON, until: '2026-12-07'});
  await expect(page.locator('.tasks-r6-line').filter({hasText: 'On hold'})).toContainText('until');
  await expect(row(page, 'Fictional gutters')).toBeVisible();

  await page.goto('/app/tasks?view=today'); await settle(page);
  await expect(row(page, 'Fictional venue')).toBeVisible();
  await expect(list(page).locator('li.task', {hasText: 'Fictional invitations'})).toHaveCount(0);
  await expect(list(page).locator('li.task', {hasText: 'Fictional gutters'})).toHaveCount(0);
  await expect(page.getByRole('navigation', {name: 'Task views'}).getByRole('button', {name: /Fictional house/})).toContainText('on hold');

  // Focus (LEDGER #394): only the party's tasks (and the Inbox's) until Show all.
  await list(page).getByRole('button', {name: 'Focus…'}).click();
  const pick = page.getByRole('group', {name: 'Focus on'});
  await pick.getByRole('checkbox', {name: 'Fictional party'}).check();
  await pick.getByRole('button', {name: 'Focus', exact: true}).click();
  await expect.poll(async () => (await storedPlan(page)).focus).toEqual({projects: ['project_party']});
  await expect(page.locator('.tasks-r6-focus .tasks-r6-line')).toContainText('Focused on Fictional party');
  await expect(row(page, 'Fictional venue')).toBeVisible();
  await expect(row(page, 'Fictional stamps')).toBeVisible();
  if (!isMobile) await clean(page);
  await noSideways(page);
  await page.locator('.tasks-r6-focus').getByRole('button', {name: 'Show all'}).click();
  await expect.poll(async () => (await storedPlan(page)).focus).toBeUndefined();
  await expect(page.evaluate(() => document.activeElement?.tagName)).resolves.not.toBe('BODY');

  // Resume now brings the house back (LEDGER #392).
  await page.goto('/app/tasks?view=project:project_house'); await settle(page);
  await page.locator('.tasks-r6-line').getByRole('button', {name: 'Resume now'}).click();
  await expect.poll(async () => (await stored(page)).projects?.find(p => p.id === 'project_house')?.hold).toBeUndefined();

  // Tasks → Review (LEDGER #395): the party's turn comes a week on; Reviewed sets the next one.
  await page.clock.setFixedTime(new Date('2026-12-01T09:00:00+01:00'));
  await page.goto('/app/tasks?view=review'); await settle(page);
  const review = page.getByRole('list', {name: 'Projects whose turn has come'});
  await expect(review).toContainText('Fictional party');
  await expect(review).toContainText('after “Fictional venue”');
  if (!isMobile) await clean(page);
  await review.getByRole('button', {name: 'Reviewed'}).click();
  await expect.poll(async () => (await stored(page)).projects?.find(p => p.id === 'project_party')?.review?.last).toBe('2026-12-01');
  await expect(page.getByRole('heading', {name: /Projects to review/})).toBeFocused();
});

test('a label group, a repeat’s record and the second-to-last Friday in quick add', async ({page, isMobile}) => {
  await start(page, 'nebula', isMobile);
  // A label group (LEDGER #397), in Areas and templates.
  await page.goto('/app/tasks?view=organise'); await settle(page);
  await page.getByRole('button', {name: 'New label group'}).click();
  await page.getByLabel('Group name').fill('Where');
  await page.getByLabel('Its labels').fill('@home @office');
  await page.getByRole('button', {name: 'Add the group'}).click();
  await expect.poll(async () => (await stored(page)).labelGroups).toEqual([expect.objectContaining({name: 'Where', labels: ['home', 'office']})]);
  await expect(page.getByRole('list', {name: 'Label groups'})).toContainText('Where: @home, @office');
  if (!isMobile) await clean(page);

  // Quick add keeps one of the group, and reads "every second-to-last Friday" (LEDGER #398).
  await page.goto('/app/tasks?view=inbox'); await settle(page);
  await page.getByLabel('New task').fill('Fictional report every second-to-last Friday @home @office');
  await page.getByLabel('New task').press('Enter');
  await expect.poll(async () => (await stored(page)).tasks.find(t => t.due === '2026-12-18')).toMatchObject({labels: ['office'], recur: {every: 'month', fromEnd: {n: 2, weekday: 5}, monthDay: 18}});
  await expect(row(page, 'Fictional report')).toContainText('Every month on the second-to-last Friday');

  // A repeat's record (LEDGER #396), in its editor: facts only.
  await page.goto('/app/tasks?view=all'); await settle(page);
  await row(page, 'Fictional bins').getByRole('button', {name: 'Edit “Fictional bins”'}).click();
  const note = page.getByRole('note').filter({hasText: 'This repeat’s record'});
  await expect(note).toContainText('done once in the last 3 months (0 by its day, 1 after it)');
  await expect(note).not.toContainText(/behind/i);
  await noSideways(page);
});
