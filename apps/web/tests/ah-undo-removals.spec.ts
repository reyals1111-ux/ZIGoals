import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi} from './ah-helpers';

// Session AH Part 3 (DS5/A5: every destructive action confirms or gives a labelled Undo; N-043, D-047, B-117, T-115,
// T-138, M-104, B-083, M-131, M-136, M-115, D-104, BUG-032). Each removal here shows its words in the one toast with an
// Undo that puts exactly that record back.
test.beforeEach(async ({page}) => { await offlineApi(page); });

test('Health water: removing an entry offers Undo, which puts it back', async ({page}) => {
  await freshDevice(page);
  await page.goto('/app/health'); await hydrated(page);
  const water = page.getByRole('region', {name: 'Water journal', exact: true});
  await water.getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  await page.locator('.aa-toast-close').click();
  const remove = water.getByRole('button', {name: 'Remove water 250', exact: true});
  await expect(remove).toHaveCount(1);
  await remove.click();
  await expect(remove).toHaveCount(0);
  const toast = page.locator('.aa-toast');
  await expect(toast).toContainText('Water entry removed.');
  await toast.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(remove).toHaveCount(1);
  await expect(toast).toContainText('Put back.');
});

test('Portfolio: removing a transaction offers Undo, which puts it back', async ({page}) => {
  await loadShowcase(page);
  await page.goto('/app/portfolio'); await hydrated(page);
  await page.locator('[id$="-tab-insights"]').first().click();
  const first = page.locator('.portfolio-all-transactions li').first();
  await expect(first).toBeVisible();
  const text = (await first.innerText()).trim();
  await first.getByRole('button', {name: 'Remove', exact: true}).click();
  const toast = page.locator('.aa-toast');
  await expect(toast).toContainText('Transaction removed.');
  await expect(page.locator('.portfolio-all-transactions li').filter({hasText: text.split('\n')[0]!})).toHaveCount(0);
  await toast.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(toast).toContainText('The transaction is back.');
  await expect.poll(async () => (await first.innerText()).trim()).toBe(text);
});
