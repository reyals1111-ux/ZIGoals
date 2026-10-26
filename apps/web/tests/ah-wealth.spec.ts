import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi} from './ah-helpers';

// Session AH Part 9 (WE8, WE19, WE18): Wealth honesty and privacy. Fictional data only.
test('WE8: in the Showcase, Add money says it opens a real provider and asks Ramp for nothing', async ({page}) => {
  const asked: string[] = [];
  page.on('request', r => { if (r.url().includes('/api/onramps/')) asked.push(r.url()); });
  await loadShowcase(page);
  await page.goto('/app/wealth/add-money'); await hydrated(page);
  await expect(page.locator('[data-showcase-note]')).toContainText('This opens a real provider.');
  await page.locator('[data-asset]').first().click();
  await expect(page.getByText('The Showcase keeps its simulated wallet.', {exact: false}).first()).toBeVisible();
  expect(asked).toEqual([]);
});

test('WE19: "Hide amounts" blurs your figures on every page until you switch it back', async ({page}) => {
  await offlineApi(page); await freshDevice(page);
  await page.goto('/app/wealth'); await hydrated(page);
  const toggle = page.getByRole('button', {name: 'Hide amounts', exact: true});
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-hide-amounts', 'on');
  await page.goto('/app/portfolio'); await hydrated(page);
  await expect(page.locator('html')).toHaveAttribute('data-hide-amounts', 'on');
  await page.getByRole('button', {name: 'Show amounts', exact: true}).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-hide-amounts', 'on');
  // WE18: the realised-gains file waits for a sale and says why.
  await expect(page.getByRole('button', {name: 'Realised gains by year (CSV)'})).toBeDisabled();
  await expect(page.getByText('It opens once a real portfolio has a sale.')).toBeVisible();
});
