import {expect, test} from '@playwright/test';

// Session AK: a barcode kept while offline (the "back online" toast) or offered by ZIGi's scan card arrives as
// /app/health?barcode=…; the barcode fold opens with it filled in, and nothing is looked up until the person asks.
test('?barcode= opens the barcode fold with the code filled in, and looks nothing up by itself', async ({page}) => {
  let lookups = 0;
  await page.route('**/api/food-lookup**', route => { lookups++; return route.fulfill({status: 404, json: {error: 'NOT_FOUND'}}); });
  await page.goto('/app/health?barcode=4006381333931');
  await expect(page.getByLabel('Product barcode', {exact: true})).toHaveValue('4006381333931');
  await expect(page.locator('details', {has: page.locator('summary', {hasText: 'Scan or look up a food barcode'})})).toHaveAttribute('open', '');
  expect(lookups).toBe(0);
});
