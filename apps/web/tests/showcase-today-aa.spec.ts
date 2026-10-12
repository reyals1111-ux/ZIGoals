import {expect, test, type Page} from '@playwright/test';

/** Session AA-Cloud Part 8: the Showcase shows every feature of this session, and Today's cards kept on this device. */
test.beforeEach(async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
});
async function showcase(page: Page) {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
}
const cards = (page: Page) => page.getByRole('region', {name: 'Cards kept on this device'});

test('Showcase Today: life balance, pace forecasts and the calculator as cards kept on this device', async ({page, isMobile}) => {
  await showcase(page);
  const region = cards(page);
  await expect(region.locator('[data-card]')).toHaveCount(3);
  expect(await region.locator('[data-card]').evaluateAll(list => list.map(e => e.getAttribute('data-card')))).toEqual(['balance', 'forecasts', 'calculator']);
  if (isMobile) await region.getByRole('button', {name: /^Pace forecasts/}).click();
  const forecasts = region.getByRole('region', {name: 'Pace forecasts'});
  await expect(forecasts.getByRole('listitem').first()).toBeVisible();
  await expect(forecasts.getByRole('listitem').first()).toContainText(/At this pace: about|Not enough history yet|No forecast at this pace|Target reached/);
  await expect(forecasts).toContainText('Estimates from your pace so far, not promises.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('arranging Today: the chooser turns a card off and on, kept on this device, never in the synced layout', async ({page}) => {
  await showcase(page);
  const settingsBefore = await page.evaluate(() => Object.entries(sessionStorage).find(([k]) => k.endsWith('zigoals:dashboard:v1'))?.[1] ?? null);
  await page.getByRole('button', {name: /Customize Today/}).first().click();
  const chooser = page.getByRole('group', {name: 'Cards kept on this device'});
  const forecasts = chooser.getByRole('button', {name: /^Pace forecasts/});
  await expect(forecasts).toHaveAttribute('aria-pressed', 'true');
  await forecasts.click();
  await expect(forecasts).toHaveAttribute('aria-pressed', 'false');
  await expect(cards(page).locator('[data-card="forecasts"]')).toHaveCount(0);
  await chooser.getByRole('button', {name: /^Life review/}).click();
  await expect(cards(page).locator('[data-card="review"]')).toHaveCount(1);
  const stored = await page.evaluate(() => JSON.parse(Object.entries(sessionStorage).find(([k]) => k.endsWith('zigoals:today-cards:v1'))![1]));
  expect(stored).toEqual({version: 1, cards: ['balance', 'calculator', 'review']});
  expect(await page.evaluate(() => Object.entries(sessionStorage).find(([k]) => k.endsWith('zigoals:dashboard:v1'))?.[1] ?? null)).toBe(settingsBefore);
  // The Life review now sits among the cards, not twice: Updates and summaries no longer carries it.
  await page.getByRole('button', {name: /Customize Today|Done/}).first().click().catch(() => {});
  await expect(page.locator('#for-you-life-review')).toHaveCount(0);
});

test('a new device: no cards until chosen; the chooser offers all four', async ({page}) => {
  await page.goto('/app');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(cards(page)).toHaveCount(0);
  await page.getByRole('button', {name: /Customize Today/}).first().click();
  const chooser = page.getByRole('group', {name: 'Cards kept on this device'});
  await expect(chooser.getByRole('button')).toHaveCount(4);
  for (const b of await chooser.getByRole('button').all()) await expect(b).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => localStorage.getItem('zigoals:today-cards:v1'))).toBeNull();
});

test('Showcase insights, scenarios and last period\'s focus: the pairings have their 14 days, the calculator compares two plans', async ({page}) => {
  await showcase(page);
  await page.goto('/app/review');
  const insights = page.getByRole('region', {name: 'On the same days'});
  await expect(insights.getByRole('listitem')).toHaveCount(2);
  await expect(insights).toContainText(/On days you walked at least 8,000 steps, you slept/);
  await expect(insights).toContainText(/days compared\./);
  await expect(page.getByRole('region', {name: 'One focus'})).toContainText('Last week you chose: A short walk after lunch (Showcase)');
  await page.getByRole('group', {name: 'Review period'}).getByRole('button', {name: 'This month'}).click();
  await expect(page.getByRole('region', {name: 'One focus'})).toContainText('Last month you chose: Bed by 23:00 on weeknights (Showcase)');
  await page.goto('/app/wealth/calculator');
  const saved = page.getByRole('region', {name: 'Saved scenarios'});
  await expect(saved.getByRole('listitem')).toHaveCount(2);
  await expect(saved).toContainText('Home deposit, 8 years (Showcase)');
  await expect(saved).toContainText('Retirement pot, 30 years (Showcase)');
  await expect(page.getByLabel('Starting amount')).toHaveValue('15000');
});
