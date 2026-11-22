import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';

// Session AV lane 2 (review b1 #11): Erase everything names the stores it erases (photos and recordings first), before
// and after, also when a browser holds only photos.
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });

test('the confirm step and the status name the journal’s photo store', async ({page}) => {
  await page.evaluate(() => new Promise<void>((resolve, reject) => { const r = indexedDB.open('zigoals-journal-media-v1', 1); r.onupgradeneeded = () => r.result.createObjectStore('media'); r.onsuccess = () => { r.result.close(); resolve(); }; r.onerror = () => reject(r.error); }));
  await page.goto('/app/settings#erase-everything'); await hydrated(page);
  const erase = page.locator('#erase-everything');
  await erase.getByRole('button', {name: 'Erase everything…', exact: true}).click();
  await expect(erase.getByText(/^The stores \(photos, recordings and more\): /)).toContainText('Journal photos and voice notes');
  await erase.getByLabel('Type ERASE to confirm').fill('ERASE');
  await erase.getByRole('button', {name: 'Erase everything', exact: true}).click();
  await expect(erase.getByRole('status')).toContainText('Stores: Journal photos and voice notes', {timeout: 20_000});
});
