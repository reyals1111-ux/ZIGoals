import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi} from './ah-helpers';
import {openSettings} from './settings-open';

/**
 * Session AV lane 2 (review b2a #4, privacy): an account document kept while the Showcase is on (IndexedDB
 * `zigoals-wealth-docs-v1`, scope `showcase`) is deleted when the Showcase starts and when it ends ("Return to my data");
 * the person's own documents (scope `local`) stay. The documents are written straight into the store, as the Sheet's
 * Documents fold writes them (`<scope>:<accountId>:<docId>`).
 */
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });
const BANK = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const put = (page: Page, scope: string) => page.evaluate(({scope, bank}) => new Promise<void>((resolve, reject) => {
  const r = indexedDB.open('zigoals-wealth-docs-v1', 1);
  r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('docs')) r.result.createObjectStore('docs'); };
  r.onsuccess = () => {
    const db = r.result, t = db.transaction('docs', 'readwrite');
    t.objectStore('docs').put({accountId: bank, docId: 'd-1', name: 'statement.pdf', blob: new Blob(['%PDF-1.4 fictional']), type: 'application/pdf', bytes: 18, addedAt: '2026-11-14T09:00:00.000Z'}, `${scope}:${bank}:d-1`);
    t.oncomplete = () => { db.close(); resolve(); }; t.onerror = () => { db.close(); reject(t.error); };
  };
  r.onerror = () => reject(r.error);
}), {scope, bank: BANK});
const keys = (page: Page) => page.evaluate(() => new Promise<string[]>((resolve, reject) => {
  const r = indexedDB.open('zigoals-wealth-docs-v1', 1);
  r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('docs')) r.result.createObjectStore('docs'); };
  r.onsuccess = () => { const db = r.result, q = db.transaction('docs', 'readonly').objectStore('docs').getAllKeys(); q.onsuccess = () => { db.close(); resolve(q.result.map(String).sort()); }; q.onerror = () => { db.close(); reject(q.error); }; };
  r.onerror = () => reject(r.error);
}));

test('the Showcase’s account documents are deleted when it starts and when it ends; the person’s own stay', async ({page}) => {
  await put(page, 'local'); await put(page, 'showcase');
  await loadShowcase(page);
  await expect.poll(() => keys(page)).toEqual([`local:${BANK}:d-1`]);
  await put(page, 'showcase'); // a statement added while trying the Showcase
  await openSettings(page);
  await page.getByRole('button', {name: 'Return to my data', exact: true}).click();
  await expect(page.getByRole('complementary', {name: 'Showcase data'})).toHaveCount(0);
  await hydrated(page);
  await expect.poll(() => keys(page)).toEqual([`local:${BANK}:d-1`]);
});
