import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (r4-mind; LEDGER #317, Journey's more photos in an entry): Write → "Photos and a voice note" takes up
 * to 12 photos ("6 of 12 photos"); the saved entry keeps the first four in `photos` (as older builds read them) and the
 * rest in `morePhotos`, shows all six under the entry, and taking the first off moves the fifth up (Undo puts it back).
 * At 390 and 1440, Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
// A 1×1 PNG, the person's "photo".
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
type Stored = {entries: {id: string; text: string; photos?: string[]; morePhotos?: string[]}[]};
const read = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as Stored, JOURNAL_KEY);
for (const theme of THEMES) test(`${theme}: six photos in one entry`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await offlineApi(page);
  await freshDevice(page);
  await page.goto('/app/journal'); await hydrated(page);
  const write = page.getByRole('form', {name: 'Write in your journal'});
  await write.locator('details.journal-media-fold > summary').click();
  const media = write.locator('.journal-compose-media');
  await media.locator('input[type="file"]').setInputFiles(Array.from({length: 6}, (_, i) => ({name: `fictional-${i + 1}.png`, mimeType: 'image/png', buffer: PNG})));
  await expect(media.getByRole('img', {name: 'Photo 6 for this entry'})).toBeVisible();
  await expect(media.getByText('6 of 12 photos')).toBeVisible();
  let findings = await axe(page, write);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await write.getByLabel('Today’s entry').fill('A fictional day at the market, in six photos.');
  await write.getByRole('button', {name: 'Save entry'}).click();
  await expect.poll(async () => { const e = (await read(page))?.entries.at(-1); return [e?.photos?.length, e?.morePhotos?.length]; }).toEqual([4, 2]);
  const row = page.locator('ol.journal-entries > li').first();
  await expect(row.getByRole('img', {name: /^Your photo with the entry of .* \(6 of 6\)$/})).toBeVisible();
  const fifth = (await read(page)).entries.at(-1)!.morePhotos![0]!;
  await row.getByRole('button', {name: /^Take photo 1 off the entry of /}).click();
  await expect.poll(async () => { const e = (await read(page)).entries.at(-1)!; return [e.photos?.length, e.morePhotos?.length, e.photos?.[3]]; }).toEqual([4, 1, fifth]);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => { const e = (await read(page)).entries.at(-1)!; return [e.photos?.length, e.morePhotos?.length]; }).toEqual([4, 2]);
  findings = await axe(page, row);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
