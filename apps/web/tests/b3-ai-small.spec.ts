import {expect, test} from '@playwright/test';
import {DAY, seed, stored} from './zigi-af';
import {PORTFOLIO_KEY} from '../lib/portfolio/schema';
import {showcasePortfolios} from '../lib/portfolio/showcase';
import {PLATFORM_KEY} from '../lib/positions';

/**
 * Session AI (B3, small items on the Showcase's fictional records, offline, no AI): the same sales by lots (WE21), a habit
 * shared as an image made on the device, and a focus session that notes itself on its goal only on a tap.
 */
test.use({timezoneId: 'UTC'});
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); await seed(page, {ai: null, extra: {[PORTFOLIO_KEY]: JSON.stringify(showcasePortfolios(DAY))}}); });

test('WE21: a coin with a sale shows FIFO and LIFO beside average cost, as a view only', async ({page}) => {
  await page.goto('/app/portfolio/coin/ethereum?portfolio=showcase-portfolio');
  const lots = page.getByRole('region', {name: 'The same sales by lots'});
  await expect(lots.getByRole('radio', {name: /First in, first out/})).toBeChecked();
  await expect(lots.getByRole('definition').first()).toContainText(/[$\d]/);
  await lots.getByRole('radio', {name: /Last in, first out/}).check();
  await expect(lots).toContainText('average cost stays the Portfolio’s method');
});
test('a habit shared as an image, made on the device', async ({page}) => {
  // As the other share-image specs do: no file share sheet in the test browser, so the image is saved as a download.
  await page.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'canShare', {configurable: true, value: () => false}); });
  await page.goto('/app/habits');
  const more = page.locator('summary[aria-label="Details for Read"]').first();
  await more.scrollIntoViewIfNeeded(); await more.click();
  await page.locator('summary[aria-label="Consistency & trends for Read"]').first().click();
  const share = page.getByRole('button', {name: /^Share .+ as an image$/}).first();
  const download = page.waitForEvent('download');
  await share.click();
  expect((await download).suggestedFilename()).toMatch(/^zigoals-habit-\d{4}-\d{2}-\d{2}\.png$/);
});
test('a focus session on a goal: nothing written until the tap, then one line in its notes', async ({page}) => {
  await page.goto('/app/goals/tracked/9201');
  const focus = page.locator('details#focus-session');
  await focus.locator('summary').click();
  await focus.getByRole('radio', {name: '15 min'}).check();
  await focus.getByRole('button', {name: 'Start a focus session'}).click();
  await expect(module.getByRole('timer')).toBeVisible();
  const before = JSON.stringify(await stored(page, PLATFORM_KEY));
  await page.clock.runFor(15 * 60_000 + 2000);
  await expect(focus).toContainText('Focused 15 min.');
  expect(JSON.stringify(await stored(page, PLATFORM_KEY))).toBe(before);
  await focus.getByRole('button', {name: 'Add it to the goal’s notes'}).click();
  await expect(module.getByRole('status')).toContainText('Focus session: 15 min');
  const goal = ((await stored(page, PLATFORM_KEY)) as {goals: {id: string; notes?: string}[]}).goals.find(g => g.id === '9201');
  expect(goal?.notes).toMatch(/Focus session: 15 min \(\d{4}-\d{2}-\d{2}\)$/);
});
test('J15: a transfer in received as a staking reward is named so in the list, the transaction itself unchanged', async ({page}) => {
  await page.goto('/app/portfolio/coin/ethereum?portfolio=showcase-portfolio');
  const form = page.locator('details.portfolio-add').last();
  if (!(await form.getAttribute('open') !== null)) await form.locator('summary').click();
  await form.getByLabel('Type').selectOption('transfer-in');
  await form.getByLabel('Received as').selectOption('reward');
  await form.getByLabel('Quantity').fill('0.01');
  await form.getByRole('button', {name: 'Save transaction'}).click();
  await expect(page.locator('ol.portfolio-transactions li').filter({hasText: 'Staking reward'})).toHaveCount(1);
});
