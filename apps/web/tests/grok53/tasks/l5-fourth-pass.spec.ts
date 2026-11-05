import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../../../lib/dashboard-settings';
import {TASKS_KEY, type Tasks} from '../../../lib/tasks/schema';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../../../lib/whats-new';

/**
 * Session AL fourth pass (lane L5-4), the replay's STILL OPEN / CHANGED Tasks rows, in the bots' conditions: Brussels time,
 * en-GB, a fresh empty profile (only the Welcome marked seen), the live /api, 1280 × 900 Nebula (375 for Quick add), and
 * every task typed through the screens. Rows: LS-H22 / C-LS-16 (drag a row), C-LS-08 (this one / all future), LS-037
 * (Completed's window), C-LS-09 + PR-103 (reminders and tasks due today on Today), AL_SCOPE C8 (#Home from the global
 * Quick add), N-PR-08 (Tasks in the Life review), LS-H36 / C-LS-22 (the Ctrl/⌘+K command menu), LS-014 (one Escape
 * closes Search; the fix is lane L6's search palette).
 */
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB'});
const BRUSSELS = (local: string) => new Date(`${local}+01:00`); // November: UTC+1
async function fresh(page: Page, at = '2026-11-04T09:00:00', width = 1280) {
  await page.setViewportSize({width, height: width < 600 ? 812 : 900});
  await page.clock.install({time: BRUSSELS(at)});
  await page.goto('/robots.txt');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
    'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}),
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}),
    [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}),
  });
}
const hydrated = (page: Page) => page.locator('html[data-app-hydrated]').waitFor({state: 'attached'});
const stored = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), TASKS_KEY) as Promise<Tasks | null>;
async function openTasks(page: Page, view = 'today') { await page.goto(`/app/tasks?view=${view}`); await hydrated(page); await page.locator('.tasks-page[data-tasks="ready"]').waitFor(); }
async function type(page: Page, line: string) {
  const field = page.getByRole('form', {name: 'Add a task'}).getByRole('textbox', {name: 'New task'});
  await field.click(); await field.pressSequentially(line, {delay: 10}); await field.press('Enter');
  await expect(field).toHaveValue('');
}
const titles = (page: Page) => page.locator('.tasks-main .task:not(.task-occurrence) > .task-title').allTextContents();

test('LS-H22 / C-LS-16: a task row dragged with the mouse onto the third row lands below it; Alt+↑ moves it back', async ({page, isMobile}) => {
  test.skip(isMobile, 'a mouse drag');
  await fresh(page);
  await openTasks(page, 'inbox');
  for (const t of ['Alpha', 'Beta', 'Gamma']) await type(page, t);
  await expect.poll(() => titles(page)).toEqual(['Alpha', 'Beta', 'Gamma']);
  const alpha = page.locator('.tasks-main .task', {hasText: 'Alpha'}), gamma = page.locator('.tasks-main .task', {hasText: 'Gamma'});
  const box = (await gamma.boundingBox())!;
  await alpha.locator('.task-title').dragTo(gamma, {targetPosition: {x: 40, y: box.height - 6}});
  await expect.poll(() => titles(page)).toEqual(['Beta', 'Gamma', 'Alpha']);
  await expect(page.locator('.aa-toast')).toContainText('Moved “Alpha” below “Gamma”.');
  await page.locator('.tasks-main .task', {hasText: 'Alpha'}).focus();
  await page.keyboard.press('Alt+ArrowUp');
  await expect.poll(() => titles(page)).toEqual(['Beta', 'Alpha', 'Gamma']);
});

test('C-LS-08: editing a repeating task asks "only this time" or "this and all future"; only this time leaves the series', async ({page}) => {
  await fresh(page);
  await openTasks(page);
  await type(page, 'Bin day every week today');
  const row = page.locator('.tasks-main .task', {hasText: 'Bin day'});
  await row.getByRole('button', {name: 'Edit “Bin day”'}).click();
  const title = page.getByRole('form', {name: 'Edit “Bin day”'}).getByRole('textbox', {name: 'Title'});
  await title.fill('Bin day: garden waste');
  await title.press('Enter');
  const ask = page.getByRole('group', {name: /repeats/});
  await expect(ask).toContainText('Change only this time');
  await ask.getByRole('button', {name: 'Only this time'}).click();
  await expect(page.locator('.aa-toast')).toContainText('Saved this time only: “Bin day: garden waste”. The repeat goes on as before.');
  await expect.poll(async () => (await stored(page))!.tasks.map(t => ({title: t.title, due: t.due, repeats: !!t.recur})).sort((a, b) => a.title.localeCompare(b.title))).toEqual([
    {title: 'Bin day', due: '2026-11-11', repeats: true},
    {title: 'Bin day: garden waste', due: '2026-11-04', repeats: false},
  ]);
  // "This and all future" changes the series itself.
  await openTasks(page, 'upcoming');
  await page.getByRole('button', {name: 'Edit “Bin day”', exact: true}).first().click();
  const title2 = page.getByRole('form', {name: 'Edit “Bin day”'}).getByRole('textbox', {name: 'Title'});
  await title2.fill('Bins out'); await title2.press('Enter');
  await page.getByRole('group', {name: /repeats/}).getByRole('button', {name: 'This and all future times'}).click();
  await expect.poll(async () => (await stored(page))!.tasks.find(t => t.recur)?.title).toBe('Bins out');
});

test('LS-037: Completed lists the last 30 days only; a task finished 32 days ago is not listed', async ({page}) => {
  await fresh(page, '2026-10-03T10:00:00');
  await openTasks(page);
  await type(page, 'Old finished task today');
  await page.getByRole('checkbox', {name: 'Mark “Old finished task” done'}).check();
  await page.clock.setSystemTime(BRUSSELS('2026-10-10T10:00:00'));
  await openTasks(page);
  await type(page, 'Recent finished task today');
  await page.getByRole('checkbox', {name: 'Mark “Recent finished task” done'}).check();
  await page.clock.setSystemTime(BRUSSELS('2026-11-04T09:00:00'));
  await openTasks(page, 'completed');
  const done = page.getByRole('region', {name: /^Completed/}).or(page.locator('section.tasks-completed'));
  await expect(done).toContainText('Recent finished task');
  await expect(done).not.toContainText('Old finished task');
  await expect(done).toContainText('1 finish older than 30 days is not listed');
});

test('C-LS-09 / PR-103: a task reminder that went off and the tasks due today show on Today, and open Tasks', async ({page}) => {
  await fresh(page, '2026-11-04T17:30:00');
  await openTasks(page);
  await type(page, 'Call mum today 18:00');
  const row = page.locator('.tasks-main .task', {hasText: 'Call mum'});
  await row.getByRole('button', {name: 'Edit “Call mum”'}).click();
  await page.getByRole('form', {name: 'Edit “Call mum”'}).getByLabel('Reminder').selectOption({label: '15 minutes before'});
  await page.getByRole('form', {name: 'Edit “Call mum”'}).getByRole('button', {name: 'Save'}).click();
  await expect(row).toContainText('15 minutes before');
  await page.clock.setSystemTime(BRUSSELS('2026-11-04T17:46:00'));
  await page.goto('/app'); await hydrated(page);
  const today = page.getByRole('region', {name: 'Tasks due today'});
  await expect(today.getByRole('list', {name: 'Task reminders'})).toContainText('Reminder · Call mum at 18:00');
  await expect(today.getByRole('link', {name: /Tasks due today: 1/})).toBeVisible();
  await today.getByRole('link', {name: /Tasks due today: 1/}).click();
  await expect(page).toHaveURL(/\/app\/tasks\?view=today/);
  await expect(page.locator('.tasks-main .task', {hasText: 'Call mum'})).toBeVisible();
});

test('AL_SCOPE C8: the global Quick add keeps "#Home" — the task is filed in the project Home (made for it), with Undo', async ({page}) => {
  await fresh(page, '2026-11-04T09:00:00', 375);
  await page.goto('/app'); await hydrated(page);
  await page.locator('.quick-add-trigger:visible').first().click();
  const dialog = page.getByRole('dialog', {name: 'What would you like to add?'});
  const line = dialog.getByRole('textbox', {name: 'Type a line'});
  await line.pressSequentially('Pay rent every month on the 1st p1 #Home @bills', {delay: 5});
  await dialog.getByRole('button', {name: 'Preview'}).click();
  await expect(dialog).toContainText('Will add a task: “Pay rent”');
  await expect(dialog).toContainText('#Home');
  await expect(dialog).toContainText('It goes to the project “Home” in Tasks');
  await dialog.getByRole('button', {name: 'Add task'}).click();
  await expect(page.locator('.aa-toast')).toContainText('in the new project “Home”');
  const saved = await stored(page);
  const home = saved!.projects?.find(p => p.name === 'Home');
  expect(home).toBeTruthy();
  expect(saved!.tasks.find(t => t.title === 'Pay rent')).toMatchObject({projectId: home!.id, labels: ['bills'], level: 1});
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo'}).click();
  await expect.poll(async () => { const r = await stored(page); return {tasks: r!.tasks.length, home: !!r!.projects?.some(p => p.name === 'Home')}; }).toEqual({tasks: 0, home: false});
});

test('N-PR-08: the Life review has a Tasks chapter for its week and month', async ({page}) => {
  await fresh(page);
  await openTasks(page);
  await type(page, 'Post the letter today');
  await type(page, 'Book the dentist friday');
  await page.getByRole('checkbox', {name: 'Mark “Post the letter” done'}).check();
  await page.goto('/app/review'); await hydrated(page);
  const chapter = page.getByRole('region', {name: 'Things you got done'});
  await expect(chapter).toContainText('1 task finished');
  await expect(chapter).toContainText('2 tasks added');
  await expect(chapter).toContainText('1 task open now');
  await expect(chapter).toContainText('Post the letter');
  await page.getByRole('group', {name: 'Review period'}).getByRole('button').nth(1).click();
  await expect(chapter).toContainText('Tasks · this month');
  await expect(chapter.getByRole('link', {name: 'Open Tasks, Completed →'})).toHaveAttribute('href', '/app/tasks?view=completed');
});

test('LS-H36 / C-LS-22: Ctrl/⌘+K opens the command menu (pages, Quick add, recent tasks); one Escape closes it; ZIGi has Ctrl/⌘+Shift+Z', async ({page, isMobile}) => {
  test.skip(isMobile, 'keyboard shortcuts');
  await fresh(page);
  await openTasks(page);
  await type(page, 'Call the plumber today');
  await page.locator('body').click({position: {x: 5, y: 5}});
  await page.keyboard.press('ControlOrMeta+k');
  const menu = page.getByRole('dialog', {name: 'Command menu'});
  await expect(menu).toBeVisible();
  const field = menu.getByRole('combobox', {name: 'Go to a page, run an action or find a task'});
  await expect(field).toBeFocused();
  await expect(menu.getByRole('group', {name: 'Recent tasks'})).toContainText('Call the plumber');
  await expect(menu.getByRole('group', {name: 'Actions'})).toContainText('Quick add');
  await page.keyboard.type('agenda');
  await expect(menu.getByRole('option').first()).toContainText('Agenda');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/app\/agenda$/);
  await page.keyboard.press('ControlOrMeta+k');
  await expect(menu).toBeVisible();
  await page.keyboard.type('plumb');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+k');
  await page.keyboard.type('plumb');
  await page.keyboard.press('ArrowDown');
  await menu.getByRole('option', {name: /Call the plumber/}).click();
  await expect(page).toHaveURL(/\/app\/tasks\?task=/);
  await page.locator('body').click({position: {x: 5, y: 5}});
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(page.locator('dialog.ai-chat[open]')).toHaveCount(1);
});

test('LS-014: "/" opens Search and a single Escape closes it, even with words typed (lane L6 search palette)', async ({page, isMobile}) => {
  test.skip(isMobile, 'keyboard shortcuts');
  await fresh(page);
  await openTasks(page);
  await page.locator('body').click({position: {x: 5, y: 5}});
  await page.keyboard.press('/');
  const search = page.locator('dialog.search-palette[open]');
  await expect(search).toHaveCount(1);
  await page.keyboard.type('milk');
  await page.keyboard.press('Escape');
  await expect(search).toHaveCount(0);
});
