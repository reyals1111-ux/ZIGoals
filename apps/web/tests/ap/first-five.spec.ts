import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../ah-helpers';
import {continueToGoalReview, typeGoalName} from '../goal-name';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../../lib/dashboard-settings';

/**
 * Session AP (friends Alpha, ADR-040): a friend with zero data, after the setup, finds "Your first five" on Today: a goal,
 * a habit, a meal and a money record, each through the app's own form, each ticking itself from the real record; the
 * whole path takes under two minutes; the card leaves when all five are done (or when hidden).
 */
const card = (page: Page) => page.getByRole('region', {name: 'Five small steps, about two minutes.'});
async function today(page: Page) { await page.goto('/app'); await hydrated(page); }

test('the first five: a goal, a habit, a meal and a money record from Today, in under two minutes', async ({page}, info) => {
  test.setTimeout(180_000);
  await offlineApi(page); await freshDevice(page);
  // After the setup (the person chose Balanced and continued): onboarded, no records yet.
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [DASHBOARD_SETTINGS_KEY, JSON.stringify({...presetSettings('balanced'), onboarded: true})] as const);
  const started = Date.now();
  await today(page);
  await expect(card(page)).toBeVisible();
  await expect(card(page)).toContainText('1 of 5 done');
  // A goal.
  await card(page).getByRole('link', {name: 'Set a goal'}).click();
  await typeGoalName(page, 'Friends trip');
  await page.getByLabel('Target amount', {exact: true}).fill('600');
  await continueToGoalReview(page);
  await page.getByRole('button', {name: 'Create goal', exact: true}).click();
  await expect(page).not.toHaveURL(/\/app\/goals\/new$/);
  await today(page);
  await expect(card(page)).toContainText('2 of 5 done');
  // A habit.
  await card(page).getByRole('link', {name: 'Add a habit'}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('Evening walk');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Evening walk', exact: true})).toBeVisible();
  await today(page);
  await expect(card(page)).toContainText('3 of 5 done');
  // A meal.
  await card(page).getByRole('link', {name: 'Log a meal'}).click();
  await expect(page).toHaveURL(/\/app\/health/);
  const meal = page.locator('#health-entry-action');
  await expect(meal).toBeVisible();
  await meal.getByLabel('Food name').fill('Porridge');
  for (const [label, value] of [['Serving weight (g)', '200'], ['Calories (kcal)', '300']] as const) { const f = meal.getByLabel(label); if (await f.count()) await f.first().fill(value); }
  await meal.getByRole('button', {name: /^(Log it|Add to today|Save|Log food|Add)$/}).first().click();
  await today(page);
  await expect(card(page)).toContainText('4 of 5 done');
  // A money record.
  await card(page).getByRole('link', {name: 'Record some money'}).click();
  const spending = page.locator('#spending');
  await spending.getByRole('button', {name: 'Log spending', exact: true}).click();
  await spending.getByLabel('Amount').fill('12,50');
  await spending.getByRole('radio', {name: 'Food & drink'}).check();
  await spending.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(spending).toContainText('12.50');
  await today(page);
  // All five: the card has done its job and leaves.
  await expect(card(page)).toHaveCount(0);
  const seconds = (Date.now() - started) / 1000;
  info.annotations.push({type: 'first five, seconds (test pace)', description: seconds.toFixed(1)});
  expect(seconds, 'the whole path under two minutes').toBeLessThan(120);
});

test('the card can be hidden for good on this device, and never shows on the Showcase', async ({page}) => {
  await offlineApi(page); await freshDevice(page);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [DASHBOARD_SETTINGS_KEY, JSON.stringify({...presetSettings('balanced'), onboarded: true})] as const);
  await today(page);
  await card(page).getByRole('button', {name: 'Not now, hide this'}).click();
  await expect(card(page)).toHaveCount(0);
  await page.reload(); await hydrated(page);
  await expect(card(page)).toHaveCount(0);
});
