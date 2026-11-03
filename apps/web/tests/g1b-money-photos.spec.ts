import {expect, test} from '@playwright/test';
import {loadShowcase} from './ah-helpers';
import {MONEY_PHOTO_DB} from '../lib/money-photos/store';
import {MONEY_LOG_KEY, entry, freshDevice, moneyLog, moneyTools, openWealth} from './g1b-fixtures';

/** Session AK, BUILD list 2 #10: a photo on a money entry, opt-in, kept in this browser only (IndexedDB). */
test.use({timezoneId: 'UTC'});
// An 8 × 8 violet PNG, made here: nothing is fetched.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNYUPEfK2IYWhIAKxSFwScT0+MAAAAASUVORK5CYII=', 'base64');
const count = (page: import('@playwright/test').Page) => page.evaluate(db => new Promise<number>(resolve => { const r = indexedDB.open(db, 1); r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('photos')) r.result.createObjectStore('photos'); }; r.onsuccess = () => { const t = r.result.transaction('photos', 'readonly').objectStore('photos').count(); t.onsuccess = () => { resolve(t.result); r.result.close(); }; }; }), MONEY_PHOTO_DB);

test('a fresh start teaches; with no AI the receipt draft says so plainly', async ({page}) => {
  await freshDevice(page);
  await openWealth(page);
  await moneyTools(page).getByRole('button', {name: 'Receipt photos'}).click();
  const panel = page.locator('.money-photos');
  await expect(panel).toContainText('No entries yet.');
  await expect(panel).toContainText('never uploaded or synced');
  await panel.getByRole('button', {name: 'Draft an entry from a receipt'}).click();
  await expect(panel).toContainText('No AI is connected, so ZIGoals can’t read a receipt.');
});
test('add, see, replace and delete a photo on an entry; it stays on this device', async ({page}) => {
  await freshDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('coffee', 0, '4.20', 'Food & drink', 'expense', 'Coffee')])});
  await openWealth(page);
  await moneyTools(page).getByRole('button', {name: 'Receipt photos'}).click();
  const row = page.locator('.money-photos-row', {hasText: 'Coffee'});
  await expect(row.getByRole('button', {name: /^Add a photo to Coffee/})).toBeVisible();
  await row.locator('input[type=file]').setInputFiles({name: 'receipt.png', mimeType: 'image/png', buffer: PNG});
  await expect(page.locator('.money-photos')).toContainText('Photo kept on this device for Coffee');
  await expect(row.getByRole('link', {name: /^Open the photo of Coffee/})).toBeVisible();
  await expect.poll(() => count(page)).toBe(1);
  await row.locator('input[type=file]').setInputFiles({name: 'receipt.png', mimeType: 'image/png', buffer: PNG});
  await expect.poll(() => count(page)).toBe(1);
  await row.getByRole('button', {name: /^Delete the photo of Coffee/}).click();
  await expect(page.locator('.money-photos')).toContainText('Photo deleted from this device.');
  await expect.poll(() => count(page)).toBe(0);
});
test('the Showcase: its fictional entries can take a photo', async ({page}) => {
  await loadShowcase(page);
  await openWealth(page);
  await moneyTools(page).getByRole('button', {name: 'Receipt photos'}).click();
  await expect(page.locator('.money-photos-row').first()).toContainText('SHOWCASE DATA');
});
