import {expect, test, type Page} from '@playwright/test';
import {hydrated, offline} from '../l3-helpers';
import {openModule, project, seedGoals} from '../goals/goal-fixtures';

/**
 * Session AL Part 15, lane P15-B: the Life items that were already built by earlier passes, proven in the browser
 * ("Fixed (already built)" in docs/review/session-al/PART15_BUILD.md). Showcase data (fictional) or a fresh profile; every
 * /api request answered 503. Items whose proof already has a spec are cited there instead (see PART15_BUILD.md).
 */
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB', viewport: {width: 1280, height: 800}});
async function showcase(page: Page) {
  await offline(page);
  await page.goto('/app/settings'); /* Session AP: a seed only writes storage here; no group needs opening */
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); });
  await page.reload(); await hydrated(page);
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await hydrated(page);
}

test('GAP-057, GAP-075: Sleep shows tonight\'s bedtime from your own nights, and sleep debt with short nights counted on their own', async ({page}) => {
  await showcase(page);
  await page.goto('/app/health?view=sleep'); await hydrated(page);
  await expect(page.locator('.energy-curve-fold summary').first()).toContainText(/bedtime tonight \d{2}:\d{2}–\d{2}:\d{2}/);
  const debt = page.locator('.sleep-stat-wide').filter({hasText: 'Sleep debt'});
  await expect(debt).toContainText('Your goal (');
  await expect(debt).toContainText(/Short nights only: .+ under your goal \(long nights not netted against them\)\./);
  await expect(page.getByText('Bedtime · wake time', {exact: true})).toBeVisible();
});

test('GAP-066, GAP-081: the fasting card keeps a rhythm of fasts that reached their own target, presets, and its end reminder', async ({page}) => {
  await showcase(page);
  await page.goto('/app/health'); await hydrated(page);
  const fasting = page.locator('#fasting');
  await expect(fasting.locator('.fasting-rhythm')).toContainText(/^Fasts that reached your own target: .+ of the last 7 days\./);
  await expect(fasting.getByRole('checkbox', {name: 'Remind me on Today when a fast reaches its target'})).toBeVisible();
  await page.goto('/app/settings/reminders'); await hydrated(page);
  // GAP-120 (goal reminders): the weekly goal check-in sits beside the fast's end, quiet hours kept.
  await expect(page.locator('.reminders-item').filter({hasText: 'Fasting end'})).toBeVisible();
  await expect(page.locator('.reminders-item').filter({hasText: 'Goal check-in'})).toContainText('A weekly look at your goals.');
});

test('GAP-076: a meal photo or a label needs your own AI and says so; nothing is estimated on this device without one', async ({page}) => {
  await showcase(page);
  await page.goto('/app/health?view=diary'); await hydrated(page);
  await page.getByText('Estimate a meal from a photo', {exact: true}).click();
  await expect(page.getByText('No AI is connected, so ZIGoals can’t estimate from a photo.', {exact: false}).first()).toBeVisible();
});

test('GAP-115: the Tree adds a sub-goal under any of your goals; GAP-121: a goal keeps a message for the day you reach it', async ({page}) => {
  await seedGoals(page, [project('96', ['Plan', 'Ship'], 0)], '/app/goals');
  await page.getByRole('button', {name: 'Tree', exact: true}).click();
  const tree = page.getByRole('region', {name: 'Goals as a tree'});
  await tree.getByLabel('Change where Fictional read project sits').click();
  await expect(tree.getByRole('link', {name: 'Add a sub-goal'}).first()).toHaveAttribute('href', '/app/goals/new?parent=private%3A96');
  await page.goto('/app/goals/tracked/96'); await hydrated(page);
  const status = await openModule(page, 'goal-status');
  await expect(status.getByLabel('A message for the day you reach it (optional)')).toBeVisible();
});
