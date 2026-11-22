import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addTask, editTask, finishTask} from '../lib/tasks/engine';
import {emptyTasks, type Tasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (r5-plan, LEDGER #348–#354, #356, #357; Akiflow, Logseq, Tiimo): a time block made in Tasks → This week,
 * a task dropped into it on Tasks → Today ("0 of 1 done") and placed inside it by Fit my day; Doing (first in Today) and
 * Cancelled (in Completed as cancelled); Copy link; a place and travel minutes typed in the editor (the row says both); a task
 * planned for this week in Upcoming; the Agenda's hour grid with the block, "Leave by" and a second zone; an earlier finish
 * taken back in Completed; the steps of a task played with Next. At 390 and 1440 in Nebula, Light and Dark, axe-clean, no
 * sideways scroll. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const MON = '2026-11-23', at = new Date('2026-11-20T07:00:00Z');
function seed(): Tasks {
  const add = (r: Tasks, id: string, input: Parameters<typeof addTask>[1]) => addTask(r, input, {id, at, today: '2026-11-20', allowPast: true});
  let r = add(emptyTasks(), 'task_fictional-chapter', {title: 'Fictional chapter', due: MON, minutes: 60});
  r = add(r, 'task_fictional-tickets', {title: 'Fictional tickets', due: MON});
  r = add(r, 'task_fictional-dentist', {title: 'Fictional dentist', due: MON, time: '14:00'});
  r = add(r, 'task_fictional-gutters', {title: 'Fictional gutters'});
  r = editTask(r, 'task_fictional-gutters', {plan: {kind: 'week', of: MON}}, '2026-11-20', {at});
  r = add(r, 'task_fictional-move', {title: 'Fictional move', due: MON});
  r = add(r, 'task_fictional-boxes', {title: 'Fictional boxes', parentId: 'task_fictional-move', minutes: 10});
  r = add(r, 'task_fictional-labels', {title: 'Fictional labels', parentId: 'task_fictional-move'});
  r = add(r, 'task_fictional-run', {title: 'Fictional run', due: '2026-11-20', recur: {every: 'day', interval: 1}});
  r = finishTask(r, 'task_fictional-run', new Date('2026-11-20T17:00:00Z'), {today: '2026-11-20', doneDay: '2026-11-20'});
  return finishTask(r, 'task_fictional-run', new Date('2026-11-21T17:00:00Z'), {today: '2026-11-21', doneDay: '2026-11-21'});
}
type Stored = {id: string; due?: string; time?: string; block?: string; state?: {kind: string}; doneAt?: string; place?: string; travel?: number; completions?: unknown[]};
const storedTask = (page: Page, id: string) => page.evaluate(k => (JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}').tasks as Stored[]).find(t => t.id === k) ?? null, id) as Promise<Stored | null>;
const storedPlan = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:task-plan:v1') ?? '{}'));
const clean = async (page: Page) => { const f = await axe(page, page.locator('main')); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };
const noSideways = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
const row = (page: Page, title: string) => page.locator('li.task').filter({has: page.locator('.task-title', {hasText: title})}).first();
const openEditor = async (page: Page, title: string) => { await row(page, title).getByRole('button', {name: `Edit “${title}”`}).click(); const form = page.getByRole('form', {name: `Edit “${title}”`}); await expect(form).toBeVisible(); return form; };

async function start(page: Page, theme: (typeof THEMES)[number], isMobile: boolean) {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date(`${MON}T08:00:00+01:00`)});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seed()));
}

for (const theme of THEMES) test(`${theme}: a time block, Doing and Cancelled, a place and travel, this week, the hour grid and a second zone`, async ({page, isMobile}) => {
  await start(page, theme, isMobile);

  // A time block (LEDGER #348), made in Tasks → This week.
  await page.goto('/app/tasks?view=week'); await settle(page);
  const blocks = page.locator('details.tasks-blocks');
  await blocks.locator('summary').click();
  await expect(blocks).toContainText('No time blocks yet.');
  await blocks.getByLabel('Name').fill('Fictional deep work');
  await blocks.getByLabel('From', {exact: true}).fill('09:00');
  await blocks.getByLabel('Until', {exact: true}).fill('11:00');
  await blocks.getByRole('button', {name: 'Add the block'}).click();
  await expect.poll(async () => (await storedPlan(page)).blocks?.[0]).toMatchObject({name: 'Fictional deep work', from: '09:00', to: '11:00', days: [1, 2, 3, 4, 5]});
  await expect(blocks.getByRole('list', {name: 'Your time blocks'})).toContainText('Fictional deep work');
  await clean(page); await noSideways(page);

  // Tasks → Today: drop a task into it; Fit my day places it inside the block.
  await page.goto('/app/tasks?view=today'); await settle(page);
  const today = page.locator('.tasks-blocks-today');
  await expect(today).toContainText('Fictional deep work');
  await today.getByRole('combobox', {name: 'Drop a task into “Fictional deep work”'}).selectOption({label: 'Fictional chapter'});
  await expect.poll(async () => (await storedTask(page, 'task_fictional-chapter'))?.block).toBeTruthy();
  await expect(today).toContainText('0 of 1 done');
  await page.locator('details.tasks-fit-day > summary').click();
  await expect(page.getByRole('list', {name: 'A plan for today'})).toContainText('in “Fictional deep work”');

  // Doing (LEDGER #350): one tap in the editor; first in Today; the row says so.
  let form = await openEditor(page, 'Fictional tickets');
  await form.getByRole('button', {name: 'Doing now'}).click();
  await expect.poll(async () => (await storedTask(page, 'task_fictional-tickets'))?.state?.kind).toBe('doing');
  // Session AV lane 2 (review B5L-12: the button's words carry its state, aria-pressed dropped, deliberate): the label itself says it.
  await expect(form.getByRole('button', {name: 'Not doing it now'})).toBeVisible();
  await expect(form.getByRole('button', {name: 'Not doing it now'})).not.toHaveAttribute('aria-pressed', /.*/);
  // Copy link (LEDGER #356): copied, or shown to select when the clipboard is not allowed.
  await form.getByRole('button', {name: 'Copy link'}).click();
  await expect(page.getByText('Link copied.', {exact: false}).or(form.getByLabel('The task’s link (select it and copy)'))).toBeVisible();
  await form.getByRole('button', {name: 'Cancel', exact: true}).click();
  await expect(page.locator('li.task').first()).toContainText('Fictional tickets');
  await expect(row(page, 'Fictional tickets').locator('.task-doing')).toHaveText('Doing');

  // A place and travel minutes (LEDGER #354, #353): typed, never looked up.
  form = await openEditor(page, 'Fictional dentist');
  await form.getByLabel('Place').fill('Fictional Street 1, Utrecht');
  await form.getByLabel('Travel before (minutes)').fill('20');
  await expect(form).toContainText('Leave by 1:40 PM');
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(async () => storedTask(page, 'task_fictional-dentist')).toMatchObject({place: 'Fictional Street 1, Utrecht', travel: 20});
  await expect(row(page, 'Fictional dentist')).toContainText('Fictional Street 1, Utrecht');
  await expect(row(page, 'Fictional dentist')).toContainText('20 min travel before');
  await clean(page); await noSideways(page);

  // Cancelled (LEDGER #350): closed, in Completed as cancelled, never "Done".
  form = await openEditor(page, 'Fictional tickets');
  await form.getByRole('button', {name: 'Cancel the task'}).click();
  await expect.poll(async () => storedTask(page, 'task_fictional-tickets')).toMatchObject({state: {kind: 'cancelled'}});
  expect((await storedTask(page, 'task_fictional-tickets'))?.doneAt).toBeTruthy();
  await expect(page.locator('body')).not.toBeFocused();
  await page.goto('/app/tasks?view=completed'); await settle(page);
  await expect(row(page, 'Fictional tickets').locator('.task-due')).toContainText('Cancelled');

  // A week without a day (LEDGER #349): in Upcoming under This week.
  await page.goto('/app/tasks?view=upcoming'); await settle(page);
  const buckets = page.getByRole('region', {name: 'Planned for a week or a month'});
  await expect(buckets.getByRole('heading', {name: /^This week/})).toBeVisible();
  await expect(buckets).toContainText('Fictional gutters');
  await expect(row(page, 'Fictional gutters').locator('.task-due')).toHaveText('This week, any day');
  await clean(page); await noSideways(page);

  // The Agenda's hour grid: the block at 9, "Leave by 1:40 PM", and a second zone beside each hour (LEDGER #357).
  await page.goto('/app/agenda?view=day'); await settle(page);
  await expect(page.locator('.agenda-page[data-agenda="ready"]')).toBeVisible();
  await page.getByRole('button', {name: 'By the hour', exact: true}).click();
  const grid = page.locator('.agenda-hours');
  await expect(grid.locator('.agenda-hour[data-hour="9"] .agenda-hour-block')).toContainText('Fictional deep work');
  await expect(grid.locator('.agenda-hour[data-hour="13"] .agenda-hour-travel')).toContainText('Leave by 1:40 PM');
  await grid.getByRole('button', {name: 'Show a second time zone'}).click();
  await grid.getByRole('combobox', {name: 'Second time zone'}).selectOption('UTC');
  await expect(grid.locator('.agenda-hour[data-hour="9"] .agenda-hour-zone')).toHaveText('8:00 AM');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:ui-prefs:v1') ?? '{}').secondZone)).toBe('UTC');
  await clean(page); await noSideways(page);

  // The Day Timeline says the second zone and draws the block and the travel (LEDGER #348, #353, #357).
  await page.goto('/app/timeline'); await settle(page);
  await expect(page.locator('.timeline-zone')).toContainText('In UTC (1 hour behind)');
  await expect(page.locator('.timeline-page')).toContainText('Fictional deep work');
  await expect(page.locator('.timeline-page')).toContainText('Travel to “Fictional dentist”');
  await clean(page); await noSideways(page);
});

test('an earlier finish taken back; the steps of a task played with Next', async ({page, isMobile}) => {
  await start(page, 'nebula', isMobile);
  // Earlier finishes (LEDGER #352): Completed → Change → It was not done; the next day stays.
  await page.goto('/app/tasks?view=completed'); await settle(page);
  const before = await storedTask(page, 'task_fictional-run');
  const change = page.getByRole('button', {name: /^Change this finish of “Fictional run”/}).first();
  await change.click();
  await page.getByRole('button', {name: 'It was not done'}).click();
  await expect.poll(async () => (await storedTask(page, 'task_fictional-run'))?.completions?.length).toBe(1);
  expect((await storedTask(page, 'task_fictional-run'))?.due).toBe(before?.due);
  await expect(page.locator('body')).not.toBeFocused();
  await page.getByRole('status').filter({hasText: 'Taken back'}).getByRole('button', {name: 'Undo'}).click();
  await expect.poll(async () => (await storedTask(page, 'task_fictional-run'))?.completions?.length).toBe(2);
  await clean(page);

  // Play the steps (LEDGER #351): the current step with its countdown, Next ticks it.
  await page.goto('/app/tasks?view=today'); await settle(page);
  const form = await openEditor(page, 'Fictional move');
  await form.getByRole('button', {name: 'Play the steps (2)'}).click();
  const play = form.locator('.task-play');
  await expect(play).toContainText('Now: Fictional boxes');
  await expect(play.getByRole('timer')).toContainText('10:00');
  await expect(play.getByRole('button', {name: 'Next'})).toBeFocused();
  await page.clock.runFor(60_000);
  await play.getByRole('button', {name: 'Next'}).click();
  await expect.poll(async () => (await storedTask(page, 'task_fictional-boxes'))?.doneAt).toBeTruthy();
  await expect(play).toContainText('Now: Fictional labels');
  await expect(play).toContainText('1 of 2 done');
  await clean(page); await noSideways(page);
});
