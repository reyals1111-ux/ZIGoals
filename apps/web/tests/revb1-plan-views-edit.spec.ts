import {expect, test, type Page} from '@playwright/test';
import {moreViews} from './fr-layout-helpers';
import {axe, offline, settle} from './p6-helpers';
import {addProject, addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (review b1 #7, Major): Tasks → Table, Calendar and Timeline are where a task is changed, as in
 * Todoist and TickTick: a title opens the task's editor (focus back on the title after Cancel); in the Calendar a task
 * moves to another day with the keyboard ("Move", then "Move here") or by dragging; a month day's "+N more" is a button
 * that shows the rest. Fictional data; 1440 and 320 px.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-23T07:00:00Z'), today = '2026-11-23';
let seeded = addProject(emptyTasks(), {name: 'Fictional move'}, 'project_fictional-move');
seeded = addTask(seeded, {title: 'Fictional standup', due: today, time: '10:00', minutes: 30}, {id: 'task_standup', at, today});
seeded = addTask(seeded, {title: 'Pack the fictional boxes', due: '2026-11-25', deadline: '2026-11-28', projectId: 'project_fictional-move'}, {id: 'task_boxes', at, today});
for (const i of [1, 2, 3, 4]) seeded = addTask(seeded, {title: `Fictional errand ${i}`, due: '2026-11-27'}, {id: `task_errand-${i}`, at, today});
const due = (page: Page, id: string) => page.evaluate(i => (JSON.parse(localStorage.getItem('zigoals:tasks:v1')!).tasks as {id: string; due?: string; time?: string}[]).find(t => t.id === i), id);
// (fr-layout; deliberate) on a phone the view sits behind "More views" (FR-L-5): opened first, the same check after.
const open = async (page: Page, name: string) => { await moreViews(page); await page.getByRole('navigation', {name: 'Task views'}).getByRole('button', {name: new RegExp(`^${name}`)}).click(); await settle(page); };
const clean = async (page: Page) => { const f = await axe(page, page.locator('main')); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };

test('open, edit and move tasks from the Table, the Calendar and the Timeline', async ({page}) => {
  await offline(page);
  await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T08:50:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto('/app/tasks?view=table'); await settle(page);

  // Table: the title opens the editor; Cancel gives focus back to the title; Save changes the task.
  const title = page.getByRole('table').getByRole('button', {name: 'Pack the fictional boxes'});
  await title.click();
  const editor = page.getByRole('form', {name: 'Edit “Pack the fictional boxes”'});
  await expect(editor).toBeVisible();
  await clean(page);
  await editor.getByRole('button', {name: 'Cancel'}).click();
  await expect(title).toBeFocused();
  await title.press('Enter');
  await editor.getByRole('textbox', {name: 'Title'}).fill('Pack the fictional boxes and tape');
  await editor.getByRole('button', {name: 'Save'}).click();
  await expect(page.getByRole('table').getByRole('rowheader', {name: 'Pack the fictional boxes and tape'})).toBeVisible();

  // Calendar, 3 days: move the standup to Wednesday with the keyboard; its time stays.
  await open(page, 'Calendar');
  const move = page.getByRole('button', {name: 'Move “Fictional standup” to another day'});
  await move.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('status').filter({hasText: 'Moving “Fictional standup”'})).toBeVisible();
  await page.getByRole('button', {name: 'Move “Fictional standup” to Wed, Nov 25'}).press('Enter');
  await expect.poll(async () => (await due(page, 'task_standup'))?.due).toBe('2026-11-25');
  expect((await due(page, 'task_standup'))?.time).toBe('10:00');
  // Session AV lane 2 (fixb1b: the title named exactly; "Fictional standup" alone also matched the day's Move button,
  // "Move “Fictional standup” to another day"; deliberate, as strict)
  await expect(page.getByRole('region', {name: /Wed, Nov 25/}).getByRole('button', {name: 'Fictional standup', exact: true})).toBeFocused();
  // …and drag it back to Tuesday.
  // Session AV lane 2 (fixb1b, deliberate, as strict): a real drag, held by the task's time and moved in steps as a hand
  // does. dragTo's single jump from the row's centre (its Move button) started no drag in about half the runs on :3101.
  const from = (await page.getByRole('region', {name: /Wed, Nov 25/}).getByRole('listitem').filter({hasText: 'Fictional standup'}).locator('strong').boundingBox())!;
  const to = (await page.getByRole('region', {name: /Tue, Nov 24/}).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2, {steps: 4});
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {steps: 10});
  await page.mouse.up();
  await expect.poll(async () => (await due(page, 'task_standup'))?.due).toBe('2026-11-24');
  // The title opens the editor here too.
  await page.getByRole('region', {name: /Tue, Nov 24/}).getByRole('button', {name: 'Fictional standup', exact: true}).click(); // exact, as above (deliberate)
  await expect(page.getByRole('form', {name: 'Edit “Fictional standup”'})).toBeVisible();
  await page.keyboard.press('Escape');

  // Month: "+1 more" is a button that shows the fourth errand.
  await page.getByRole('button', {name: 'Month'}).click();
  const more = page.getByRole('button', {name: /^Show 1 more on Fri, Nov 27/});
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await more.click();
  await expect(page.getByRole('button', {name: /^Show fewer on Fri, Nov 27/})).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('table').getByRole('button', {name: 'Fictional errand 4', exact: true})).toBeVisible(); // exact: "Move “Fictional errand 4” …" also matched (fixb1b, deliberate)
  await clean(page);

  // Timeline: the bar's title opens the editor.
  await open(page, 'Timeline');
  await page.getByRole('list', {name: 'Tasks on the timeline'}).getByRole('button', {name: 'Pack the fictional boxes and tape'}).click();
  await expect(page.getByRole('form', {name: 'Edit “Pack the fictional boxes and tape”'})).toBeVisible();
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
