import {expect, test, type Page} from '@playwright/test';
import {emptyPlatform, PLATFORM_KEY, privateGoalSchema, type Platform} from '../lib/positions';

// Session X Part 14: what the human-style test (docs/verification/x-cloud/HUMAN_TEST.md) found in the app, kept fixed.
// Each test names its journey. Fictional records, every /api answered by a fixture unless the test says otherwise.
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('J047: an unknown goal in the Local Demo says it is not here, not "connect the wallet", with a way back', async ({page}) => {
  await page.goto('/app/goals/999999');
  await expect(page.getByRole('heading', {name: 'Goal unavailable.', exact: true})).toBeVisible();
  await expect(page.locator('main')).toContainText('This goal isn’t here: it may have been removed, or it was made in another browser.');
  await expect(page.locator('main')).not.toContainText('Connect the wallet');
  await expect(page.getByRole('link', {name: 'Back to goals', exact: true})).toHaveAttribute('href', '/app/goals');
});

const stored = (page: Page) => page.evaluate(k => (JSON.parse(localStorage.getItem(k)!) as Platform).goals[0]!, PLATFORM_KEY);
test('J054: a goal edited in two tabs keeps both changes: the second tab never writes back the name the first changed', async ({page, isMobile}) => {
  test.skip(isMobile, 'Two tabs on a computer; the form is the same on a phone.');
  const goal = privateGoalSchema.parse({id: '7', name: 'Fictional reserve', type: 'VALUE', status: 'active', asset: 'EUR', denom: 'EUR', decimals: 2, target: '600000', targetDate: '2026-12-30', notes: '', createdAt: '2026-06-01T09:00:00.000Z', milestones: []});
  await page.goto('/app/settings');
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [PLATFORM_KEY, JSON.stringify({...emptyPlatform(), goals: [goal]})]);
  const other = await page.context().newPage();
  for (const tab of [page, other]) { await tab.goto('/app/goals/tracked/7'); await tab.locator('#edit-goal > summary').click(); }
  await page.getByLabel('Edit Goal name').fill('Fictional reserve, renamed');
  await page.getByRole('button', {name: 'Save Goal details', exact: true}).click();
  await expect(other.getByRole('heading', {level: 1})).toHaveText('Fictional reserve, renamed');
  // The second tab's untouched name follows; its own change (the target) is saved beside the first tab's.
  await expect(other.getByLabel('Edit Goal name')).toHaveValue('Fictional reserve, renamed');
  await other.getByLabel('Edit target').fill('5000');
  await other.getByRole('button', {name: 'Save Goal details', exact: true}).click();
  await expect.poll(async () => (await stored(other)).target).toBe('500000');
  expect((await stored(other)).name).toBe('Fictional reserve, renamed');
});

test('J108: the barcode lookup offline says so in plain words, never the browser\'s "Failed to fetch"', async ({page}) => {
  await page.route('**/api/food-lookup?*', route => route.abort('internetdisconnected'));
  await page.goto('/app/health');
  await page.getByText('Scan or look up a food barcode', {exact: true}).click();
  const area = page.getByRole('region', {name: 'Barcode food lookup'});
  await area.getByLabel('Product barcode', {exact: true}).fill('00001234');
  await area.getByRole('button', {name: 'Look up barcode', exact: true}).click();
  await expect(area).toContainText('Food lookup is unavailable: this device looks offline. Your private food library still works.');
  await expect(area).not.toContainText('Failed to fetch');
});

test('J247–J249: Chess in the Showcase hydrates without React\'s mismatch error', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await page.goto('/app/chess');
  await expect(page.locator('main h1').first()).toBeVisible();
  await page.waitForTimeout(1000);
  expect(errors).toEqual([]);
  // Still the Showcase's Chess: nothing can be added there.
  await expect(page.getByRole('form', {name: 'Add a rating goal'})).toHaveCount(0);
});
