import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';

/**
 * Session AI (B3's expense and income log, feature 5's numbers): Wealth → Spending logs money spent or received with a
 * weekly room to spend, on this device; a quick line ("spent 12 euro on lunch") becomes an expense card that writes the
 * same log. Empty start (no Showcase), a fixed clock, offline.
 */
const TODAY = '2026-10-28';
test.use({timezoneId: 'UTC'});
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date(`${TODAY}T10:00:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/manifest.webmanifest');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {[DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true})});
});
const log = async (page: Page) => JSON.parse((await page.evaluate(k => localStorage.getItem(k), MONEY_LOG_KEY)) ?? 'null') as {entries: {amount: string; category: string; kind: string; source?: string}[]; budget?: {weekly: string}} | null;

test('Spending: a budget, an expense and its room to spend; remove with Undo', async ({page}) => {
  await page.goto('/app/wealth');
  const section = page.locator('#spending');
  await expect(section.getByRole('heading', {name: 'Room to spend'})).toBeVisible();
  await expect(section).toContainText('No weekly budget');
  // Session AK RB (RELEASE_REVIEW_2 R2-8, deliberate): the weekly budget and the entry form open from their buttons.
  await section.getByRole('button', {name: 'Set a weekly budget', exact: true}).click();
  await section.getByRole('textbox', {name: /^Weekly budget \(/}).fill('150');
  await section.getByRole('button', {name: 'Save budget'}).click();
  await expect(section).toContainText('left of €150.00 this week');
  await section.getByRole('button', {name: 'Log spending', exact: true}).click();
  await section.getByLabel('Amount').fill('12,50');
  await section.getByRole('radio', {name: 'Food & drink'}).check();
  await section.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(section).toContainText('€137.50');
  expect((await log(page))?.entries).toMatchObject([{amount: '12.50', category: 'Food & drink', kind: 'expense', source: 'form'}]);
  await section.getByRole('button', {name: /^Remove Food & drink 12\.50 EUR/}).click();
  await expect(section).toContainText('€150.00');
  // Session AL (L1 second pass, deliberate; 9ffb2510): a removal's Undo is the app's one Undo message (removeWithUndo), not a
  // button inside the section.
  await page.locator('.aa-toast').filter({hasText: 'Removed: Food & drink €12.50.'}).getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(section).toContainText('€137.50');
});
test('a wrong amount is refused in plain words and nothing is saved', async ({page}) => {
  await page.goto('/app/wealth');
  const section = page.locator('#spending');
  await section.getByRole('button', {name: 'Log spending', exact: true}).click(); // Session AK RB (R2-8): the form opens from its button
  await section.getByLabel('Amount').fill('-4');
  await section.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(section.getByRole('alert')).toContainText('above zero');
  expect(await log(page)).toBeNull();
});
test('a quick line: "spent 12 euro on lunch" is an expense card that writes the same log', async ({page}, info) => {
  await page.goto('/app');
  // Session AO (run 1683, a 45 s timeout): a press on Quick add before the shell hydrated opened nothing, and the test then
  // waited for the dialog's field until its limit. A person's press is made once the app has hydrated.
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached'});
  await page.locator(info.project.name === 'mobile' ? '.phone-topbar .quick-add-trigger' : '.today-hero .quick-add-trigger').click();
  const dialog = page.getByRole('dialog', {name: 'What would you like to add?'});
  await expect(dialog).toBeVisible();
  const field = dialog.getByRole('textbox', {name: 'Type a line'});
  await field.fill('2 glasses of water, spent 12 euro on lunch');
  await field.press('Enter');
  const cards = dialog.locator('.ai-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(1)).toContainText('Spent 12.00 EUR');
  await cards.nth(1).getByRole('button', {name: 'Add', exact: true}).click();
  await expect.poll(async () => (await log(page))?.entries.length ?? 0).toBe(1);
  expect((await log(page))?.entries[0]).toMatchObject({amount: '12.00', category: 'Food & drink', source: 'zigi'});
});
