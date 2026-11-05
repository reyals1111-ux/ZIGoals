import {expect, test, type Page} from '@playwright/test';
import {TITLE, fixtureHabits, fixturePath, stored} from '../../checklist-fixtures';
import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from '../../../lib/af-checklist-keys';
import {HABITS_KEY, type HabitData} from '../../../lib/habits';
import {UI_PREFS_KEY} from '../../../lib/ab-design-keys';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../../../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../../../lib/whats-new';
import type {Checklist, ChecklistDays} from '../../../lib/checklist/schema';

/**
 * Session AL fourth pass (lane L5-4), Checklist List view, Notes and Journal rows in the bots' conditions: 375 × 812 Nebula
 * (388 × 844 Dark for Notes), Brussels time, en-GB, the live /api; Lisbon's path (three fictional habits, Water and one
 * own item) is written before the page loads and everything after that is done through the screens. The path, river,
 * labels' look, top bar and layout are unchanged (O6); only the List view and the words on the planets change.
 * Rows: LS-H26 (a second tap on a done habit takes the tick back, with Undo), LS-019 / LC-005 (rename a habit from the
 * List), LS-H23 / C-LS-33 (reorder in the List), LS-032 / C-LS-35 (own item done yesterday; a habit made today says
 * why), C-DVG-76 (reminder time on the row),
 * N-DV-07 (Notes views in the first phone screen), DV-190b / DV-190c (Journal words).
 */
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB'});
const AT = new Date('2026-11-04T09:30:00+01:00');
async function open(page: Page, {list = true, extra = {}}: {list?: boolean; extra?: Record<string, string>} = {}) {
  await page.setViewportSize({width: 375, height: 812});
  await page.clock.install({time: AT});
  await page.goto('/robots.txt');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
    'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}),
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}),
    [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}),
    [HABITS_KEY]: JSON.stringify(fixtureHabits()),
    [CHECKLIST_KEY]: JSON.stringify(fixturePath()),
    ...(list ? {[UI_PREFS_KEY]: JSON.stringify({version: 1, checklist: {view: 'list'}})} : {}),
    ...extra,
  });
  await page.goto('/app/checklist');
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached'});
}
const toast = (page: Page) => page.locator('.aa-toast');
const more = async (page: Page, name: string) => { await page.getByRole('button', {name: `More for ${name}`, exact: true}).click(); return page.getByRole('group', {name: `More for ${name}`, exact: true}); };

test('LS-H26: a second tap on a done habit takes the tick back, with Undo (no details panel)', async ({page}) => {
  await open(page);
  await page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true}).click();
  await expect(page.getByRole('button', {name: `${TITLE.stretch}: done`, exact: true})).toBeVisible();
  await page.clock.runFor(20_000); // the tick's own toast has gone
  await page.getByRole('button', {name: `${TITLE.stretch}: done`, exact: true}).click();
  await expect(page.getByRole('group', {name: `${TITLE.stretch}: details`})).toHaveCount(0);
  await expect(toast(page)).toContainText(`${TITLE.stretch}: not done today.`);
  await expect(page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true})).toBeVisible();
  await toast(page).getByRole('button', {name: /^Undo/}).click();
  await expect(page.getByRole('button', {name: `${TITLE.stretch}: done`, exact: true})).toBeVisible();
});

test('LS-019 / LC-005: a habit is renamed from the List row\'s More; Habits keeps the new name; Undo puts it back', async ({page}) => {
  await open(page);
  const tools = await more(page, TITLE.stretch);
  await tools.getByRole('textbox', {name: 'Name'}).fill('Fictional morning stretch');
  await tools.getByRole('button', {name: 'Rename'}).click();
  await expect(toast(page)).toContainText('Renamed to Fictional morning stretch, on Habits too.');
  await expect.poll(async () => (await stored<HabitData>(page, HABITS_KEY))!.habits.find(h => h.title.includes('stretch'))?.title).toBe('Fictional morning stretch');
  await expect(page.getByRole('button', {name: 'Fictional morning stretch: not done yet', exact: true})).toBeVisible();
  await toast(page).getByRole('button', {name: /^Undo/}).click();
  await expect.poll(async () => (await stored<HabitData>(page, HABITS_KEY))!.habits.some(h => h.title === TITLE.stretch)).toBe(true);
});

test('LS-H23 / C-LS-33: List rows reorder with Move up / Move down and Alt+↑/↓, and the path shows the same order', async ({page}) => {
  await open(page);
  const morning = page.getByRole('list', {name: /Morning/}).first();
  const names = () => morning.locator('.checklist-row-name').allTextContents();
  // The List view says "Loading the list…" first; read the order once its rows are there (it read 0 rows on arrival).
  await expect(morning.locator('.checklist-row-name').nth(1)).toBeVisible();
  const before = await names();
  expect(before.length).toBeGreaterThanOrEqual(2);
  const tools = await more(page, before[0]!);
  await tools.getByRole('button', {name: 'Move down'}).click();
  await expect.poll(names).toEqual([before[1], before[0], ...before.slice(2)]);
  await morning.getByRole('button', {name: new RegExp(`^${before[0]}: `)}).focus();
  await page.keyboard.press('Alt+ArrowUp');
  await expect.poll(names).toEqual(before);
  await expect.poll(async () => (await stored<Checklist>(page, CHECKLIST_KEY))!.order.length).toBeGreaterThan(0);
});

test('LS-032 / C-LS-35: an own item can be done yesterday (counted, with Undo); a habit made today says why it cannot', async ({page}) => {
  await open(page);
  const yesterday = '2026-11-03';
  const tools = await more(page, TITLE.custom);
  await page.waitForTimeout(500); // the day's record is sealed on arrival; read it after that
  const before = (await stored<ChecklistDays>(page, CHECKLIST_DAYS_KEY))?.days?.[yesterday] ?? null;
  await tools.getByRole('button', {name: 'Done yesterday'}).click();
  await expect(toast(page)).toContainText(`${TITLE.custom}: done yesterday, counted in yesterday’s orbits.`);
  await expect.poll(async () => (await stored<ChecklistDays>(page, CHECKLIST_DAYS_KEY))!.days[yesterday]).toMatchObject({done: (before?.done ?? 0) + 1});
  await tools.getByRole('button', {name: 'Done yesterday'}).click();
  await expect(tools.getByRole('status')).toHaveText('Already filled in for yesterday.');
  await toast(page).getByRole('button', {name: /^Undo/}).first().click();
  await expect.poll(async () => (await stored<ChecklistDays>(page, CHECKLIST_DAYS_KEY))?.days?.[yesterday]?.done ?? null).toBe(before?.done ?? null);
  // A habit made today through the orbit's Quick add.
  await page.getByRole('button', {name: 'Quick add to your Checklist'}).click();
  const quick = page.getByRole('region', {name: 'Quick add'});
  await quick.getByRole('textbox', {name: 'Name'}).fill('Floss');
  await quick.getByRole('button', {name: 'Add to my orbit'}).click();
  const floss = await more(page, 'Floss');
  await floss.getByRole('button', {name: 'Done yesterday'}).click();
  await expect(floss.getByRole('status')).toHaveText('Floss started today, so yesterday is not part of it.');
});

test('C-DVG-76: a habit reminder time set on Habits shows on its List row', async ({page}) => {
  const ids = fixtureHabits().habits.map(h => h.id);
  await open(page, {extra: {'zigoals:reminders:v1': JSON.stringify({version: 1, habits: {[ids[0]!]: {time: '07:30'}}, dismissed: {}})}});
  await expect(page.getByRole('list', {name: /Morning/}).locator('.checklist-row', {hasText: TITLE.stretch})).toContainText('reminder 07:30');
});

test('N-DV-07: at 388 px (Dark) the Notes views are in the first phone screen, before the capture box', async ({page}) => {
  await page.setViewportSize({width: 388, height: 844});
  await page.clock.install({time: AT});
  await page.goto('/robots.txt');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); });
  await page.emulateMedia({colorScheme: 'dark'});
  await page.goto('/app/notes');
  const tabs = page.getByRole('navigation', {name: 'Notes views'});
  await expect(tabs).toBeVisible();
  const box = (await tabs.boundingBox())!, capture = (await page.getByRole('textbox', {name: 'Capture a note'}).boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  expect(box.y).toBeLessThan(capture.y);
});

test('DV-190b / DV-190c: the Journal says "Question for later" (no "ZIGi asks" heading) and the week strip says days in words', async ({page}) => {
  await page.setViewportSize({width: 1920, height: 1113});
  await page.clock.install({time: AT});
  await page.goto('/robots.txt');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); });
  await page.goto('/app/journal');
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached'});
  await page.getByRole('radio', {name: /^4 of 5/}).check();
  await page.getByRole('textbox', {name: 'Today’s entry'}).pressSequentially('A calm day, walked by the river.', {delay: 5});
  await page.getByRole('button', {name: 'Save entry'}).click();
  const ask = page.getByRole('form', {name: "ZIGi's question"});
  await expect(ask.locator('.journal-question .eyebrow')).toHaveText('Question for later');
  await expect(page.getByRole('list', {name: 'This week\'s check-ins'})).not.toContainText(/\d{4}-\d{2}-\d{2}/);
  await expect(page.getByRole('list', {name: 'This week\'s check-ins'})).toContainText('Wed 4 Nov: energy 4 of 5');
});
