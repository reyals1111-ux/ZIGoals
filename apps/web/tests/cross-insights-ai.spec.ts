import {expect, test} from '@playwright/test';
import {seed, stored} from './zigi-af';
import {INSIGHTS_KEY} from '../lib/insights/schema';

/**
 * Session AI (feature 4): the pairings across modules in the Life review — each with its counts, a Why? that gives the
 * evidence (dates, days on each side, the 14-day rule) and says it is not advice, and Hide for 28 days. Showcase records
 * (fictional), offline, no AI.
 */
test.use({timezoneId: 'UTC'});
test('Life review: a pairing has its Why? and can be hidden for 28 days', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await seed(page, {ai: null});
  await page.goto('/app/review');
  const card = page.locator('section.cross-insights').first();
  await expect(card.getByRole('heading', {name: 'On the same days'})).toBeVisible();
  const first = card.locator('.cross-list > li').first();
  const title = (await first.locator('strong').textContent())!;
  await first.getByText('Why?').click();
  await expect(first.locator('.cross-why')).toContainText('it is not advice');
  await expect(first.locator('.cross-why')).toContainText('days with and');
  await first.getByRole('button', {name: `Hide “${title}” for 28 days`}).click();
  await expect(card.getByRole('status')).toContainText(`“${title}” is hidden for 28 days.`);
  await expect(card.locator('.cross-list > li strong').filter({hasText: new RegExp(`^${title}$`)})).toHaveCount(0);
  const dismissed = (await stored(page, INSIGHTS_KEY)) as {dismissed: Record<string, string>} | null;
  expect(Object.keys(dismissed?.dismissed ?? {})).toHaveLength(1);
  await expect(card).toContainText('not a cause and not advice');
});
