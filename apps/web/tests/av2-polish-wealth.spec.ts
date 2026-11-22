import {expect, test} from '@playwright/test';
import {go, noSideways, start} from './av2-polish-helpers';
import {THEMES} from './p6-helpers';

/**
 * Session AV lane 2 (polish), Wealth:
 * - P-5: on a phone Spending's heading keeps the width; "Import from your bank" goes under it.
 * - P-32: an entry's day reads "Sun, Nov 22", never the stored "2026-11-22".
 * - P-35: each Plan line keeps its button in one right-hand column.
 * - P-37: the budget table's headers are 14 px.
 * - P-40: a fresh device with "All" chosen reads "Build your wealth picture", not "No assets in this category yet".
 */
test.use({timezoneId: 'Europe/Amsterdam'});

for (const theme of THEMES) test(`${theme}: Spending's heading has the width at 390; days read as days`, async ({page}) => {
  await start(page, {theme, width: 390});
  await go(page, '/app/wealth#spending');
  const heading = page.locator('#spending > .wealth-section-heading');
  await expect(heading).toBeVisible({timeout: 15_000});
  const title = (await heading.locator('h2').boundingBox())!, text = (await heading.locator(':scope > div').boundingBox())!, button = (await heading.getByRole('button', {name: 'Import from your bank'}).boundingBox())!;
  expect(text.width, 'the words keep the heading width').toBeGreaterThanOrEqual(260);
  expect(button.y, 'the button stands under the words').toBeGreaterThanOrEqual(text.y + text.height - 1);
  expect(title.height, 'Room to spend on one line').toBeLessThanOrEqual(40);
  const days = await page.locator('.spending-entries .spending-entry-what').allInnerTexts();
  expect(days.length).toBeGreaterThan(0);
  for (const d of days) expect(d).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  await expect(page.locator('.spending-entries time').first()).toHaveText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), [A-Z][a-z]{2} \d{1,2}$/);
  await noSideways(page);
});

test('Budgets: the Plan buttons share one column; headers 14 px', async ({page}) => {
  await start(page, {width: 390});
  await go(page, '/app/wealth?view=budgets');
  const plans = page.locator('.budgets-assign-head > button');
  await expect(plans.first()).toBeAttached({timeout: 15_000});
  await plans.first().scrollIntoViewIfNeeded();
  const rights = await plans.evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().right)));
  expect(rights.length).toBeGreaterThan(1);
  expect(Math.max(...rights) - Math.min(...rights)).toBeLessThanOrEqual(2);
  const tops = await page.locator('.budgets-assign-head').evaluateAll(els => els.map(e => { const b = e.querySelector(':scope > button')!.getBoundingClientRect(), t = e.querySelector(':scope > span')!.getBoundingClientRect(); return b.top - t.top; }));
  for (const gap of tops) expect(Math.abs(gap), 'Plan beside its line, not under it').toBeLessThanOrEqual(12);
  for (const size of await page.locator('.budgets-table thead th').evaluateAll(els => els.map(e => parseFloat(getComputedStyle(e).fontSize)))) expect(size).toBeGreaterThanOrEqual(14);
  await expect(page.locator('.budgets-assign')).not.toContainText(/\d{4}-\d{2}\)/);
});

test('a fresh device: "All" chosen is the whole picture', async ({page}) => {
  await start(page, {width: 390, showcase: false});
  await go(page, '/app/wealth');
  const empty = page.locator('.holdings-empty');
  await expect(empty).toBeVisible({timeout: 15_000});
  await expect(empty).toContainText('Build your wealth picture');
  await expect(empty).not.toContainText('No assets in this category yet');
});
