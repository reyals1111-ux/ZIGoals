import {expect, test, type Page} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY, saveHabitTimezone, type HabitInput} from '../../../lib/habits';
import {CHECKLIST_KEY} from '../../../lib/af-checklist-keys';
import {addFavourite} from '../../../lib/checklist/store';
import {emptyChecklist} from '../../../lib/checklist/schema';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../../../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../../../lib/whats-new';
import {settled} from '../../checklist-fixtures';

/**
 * Session AL fifth pass (lane L3, GROK53_REPLAY_L3_2 "STILL OPEN" 3 and "CHANGED" 8): LS-070 / C-LS-34 / LS-033 as Lisbon
 * ran it, 375×812 Dark, Brussels: two starred habits ("QA Read", "Water glass"), only QA Read ticked on the Checklist each
 * day 29 Oct – 2 Nov. The path, its planets and the top bar are unchanged (O6); the List rows carry each habit's streak.
 */
test.use({viewport: {width: 375, height: 812}, locale: 'en-GB', timezoneId: 'Europe/Brussels'});
const READ = '11111111-1111-4111-8111-111111111111', WATER = '22222222-2222-4222-8222-222222222222';
const habit = (title: string): HabitInput => ({title, category: 'Fictional', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}});
async function seed(page: Page, {water = true}: {water?: boolean} = {}) {
  const made = new Date('2026-10-28T08:00:00Z');
  let habits = saveHabitTimezone(emptyHabitData(), 'Europe/Brussels');
  habits = createHabit(habits, habit('QA Read'), made, READ); habits = createHabit(habits, habit('Water glass'), made, WATER);
  let path = emptyChecklist();
  path = addFavourite(path, {kind: 'habit', habitId: READ}, {id: 'ck_read', at: made, section: 'morning'});
  if (water) path = addFavourite(path, {kind: 'habit', habitId: WATER}, {id: 'ck_water', at: new Date(made.getTime() + 1), section: 'morning'});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/robots.txt');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
    'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), 'zigoals:ui-prefs:v1': JSON.stringify({version: 1, theme: 'dark'}),
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}),
    [HABITS_KEY]: JSON.stringify(habits), [CHECKLIST_KEY]: JSON.stringify(path),
  });
}
async function listView(page: Page) {
  if (await page.locator('.checklist-list-view').isVisible()) return;
  if (await page.locator('.checklist-view-switch').isVisible()) await page.getByRole('group', {name: 'View'}).getByRole('button', {name: 'List'}).click();
  else { await page.getByRole('button', {name: 'Checklist menu'}).click(); await page.locator('.checklist-menu-view').getByRole('button', {name: 'List'}).click(); }
  await expect(page.locator('.checklist-list-view')).toBeVisible();
}

test('LS-070/C-LS-34/LS-033: QA Read ticked five days has its own "5 day streak"; the flame says its rule', async ({page}) => {
  await page.clock.setFixedTime(new Date('2026-10-29T07:00:00Z'));
  await seed(page);
  for (const day of ['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']) {
    await page.clock.setFixedTime(new Date(`${day}T07:00:00Z`));
    await page.goto('/app/checklist'); await settled(page);
    await listView(page);
    await page.getByRole('button', {name: 'QA Read: not done yet', exact: true}).click();
    await expect(page.getByRole('button', {name: 'QA Read: done', exact: true})).toBeVisible();
  }
  const row = page.locator('.checklist-row', {hasText: 'QA Read'});
  await expect(row.locator('.checklist-row-sub')).toContainText('5 day streak');
  await expect(page.locator('.checklist-row', {hasText: 'Water glass'}).locator('.checklist-row-sub')).not.toContainText('streak');
  await expect(page.locator('.checklist-streak-rule')).toHaveText('The flame counts the days every planet was lit; a day with nothing on the path rests. Each habit row shows that habit’s own streak.');
  const flame = page.locator('.checklist-streak');
  await expect(flame).toHaveAttribute('aria-label', '0-day streak: the days every planet was lit');
  await expect(flame).toHaveAttribute('title', 'The days every planet was lit');
});

test('replay incidental: once its words show, a tap on the celebration over the View switch closes it; then List opens', async ({page}) => {
  await page.clock.setFixedTime(new Date('2026-11-02T07:00:00Z'));
  await seed(page, {water: false});
  await page.goto('/app/checklist'); await settled(page);
  await page.getByRole('button', {name: /^QA Read/}).first().click();
  const party = page.locator('dialog.checklist-celebration');
  await expect(party).toBeVisible();
  await expect(party.getByRole('heading', {name: 'All 1 planet lit!'})).toBeVisible();
  await expect(party).toHaveAttribute('data-words', '', {timeout: 15_000});
  const view = page.locator('.checklist-view-switch');
  if (await view.count()) {
    const box = (await view.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  } else await page.mouse.click(187, 40);
  await expect(party).toHaveCount(0);
  await listView(page);
});
