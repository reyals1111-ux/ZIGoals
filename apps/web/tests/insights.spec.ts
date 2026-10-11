import {expect, test, type Page} from '@playwright/test';
import {INSIGHTS_KEY} from '../lib/insights/schema';
import {FORBIDDEN_INSIGHT_WORDS} from '../lib/insights/engine';

// M3 (Session P): "Something you might notice": pairings in counts from the person's own records, dismissable per card.
const PUSHUPS = 'On 5 of 9 days you counted Push-ups, you also logged water; on other days 7 of 21.';
const STEPS = 'On 6 of 12 days you walked at least 8,000 steps, you also logged water; on other days 6 of 18.';
test.use({timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date('2026-09-15T10:00:00.000Z')});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});
/** The card may sit behind "For you"'s Show more; reveal it. */
async function reveal(page: Page) {
  const forYou = page.getByRole('region', {name: 'For you', exact: true});
  await expect(forYou).toBeVisible();
  const region = page.getByRole('region', {name: 'Something you might notice', exact: true});
  if (!(await region.isVisible().catch(() => false))) { const fold = forYou.getByRole('button', {name: /^Show more/}); if (await fold.count()) await fold.click(); }
  return region;
}
const sessionInsights = (page: Page) => page.evaluate(key => Object.entries(sessionStorage).filter(([k]) => k.includes(key)).map(([, v]) => v), INSIGHTS_KEY);

test('Showcase: two exact sentences, how they were counted, dismiss one and it stays away', async ({page}) => {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  const region = await reveal(page);
  await expect(region).toBeVisible();
  const cards = region.getByRole('article');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText(PUSHUPS);
  await expect(cards.nth(1)).toContainText(STEPS);
  const text = (await region.textContent())!.toLowerCase();
  for (const word of FORBIDDEN_INSIGHT_WORDS) expect(text, word).not.toContain(word.toLowerCase());
  expect(await sessionInsights(page)).toEqual([]);
  const summary = cards.nth(0).getByText('How this is calculated', {exact: true});
  expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await summary.click();
  await expect(cards.nth(0)).toContainText('With the first: 5 of 9 days. Without: 7 of 21 days.');
  await expect(cards.nth(0)).toContainText(/Window: 2026-07-18 – 2026-09-15 · 30 days/);
  await expect(cards.nth(0)).toContainText('Counts of your own records. Not a cause, not advice.');
  const dismiss = cards.nth(0).getByRole('button', {name: `Dismiss: ${PUSHUPS}`});
  expect((await dismiss.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await dismiss.click();
  // The dismissed pairing is gone; the next qualifying pairing (weight and steps) may take the free slot, so the count stays at most two.
  await expect(cards.nth(0)).toContainText(STEPS);
  await expect(region).not.toContainText(PUSHUPS);
  expect(await cards.count()).toBeLessThanOrEqual(2);
  const written = await sessionInsights(page);
  expect(written).toHaveLength(1);
  expect(JSON.parse(written[0]!)).toEqual({version: 1, dismissed: {'exercise-water:health_counter-pushups': '2026-09-15'}});
  await page.reload();
  const again = await reveal(page);
  await expect(again.getByRole('article').nth(0)).toContainText(STEPS);
  await expect(again).not.toContainText(PUSHUPS);
  expect(await again.getByRole('article').count()).toBeLessThanOrEqual(2);
});

test('a brand-new device has no card and no key', async ({page}) => {
  await page.goto('/app');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.getByRole('region', {name: 'Something you might notice', exact: true})).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), INSIGHTS_KEY)).toBeNull();
});
